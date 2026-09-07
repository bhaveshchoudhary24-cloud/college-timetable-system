import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface HardConstraintViolations {
  missingHours: number;
  extraHours: number;
  theoryMismatch: number;
  practicalMismatch: number;
  tutorialMismatch: number;

  wrongDepartment: number;
  wrongSemester: number;
  wrongCourseYear: number;
  wrongDivision: number;
  wrongBatch: number;
  wrongSubject: number;
  wrongFaculty: number;

  facultyConflicts: number;
  divisionConflicts: number;
  batchConflicts: number;
  roomConflicts: number;
  roomTypeViolations: number;
  capacityViolations: number;

  breakViolations: number;
  invalidDuration: number;
  practicalNotConsecutive: number;

  unauthorizedFaculty: number;
  unauthorizedRoom: number;
  duplicateSessions: number;
  orphanEntries: number;

  // MMIT-specific checks (new)
  theoryLockViolations: number;        // batch session during division theory
  practicalAsDivisionWide: number;     // practical with batchId=null
  unauthorizedRoomForPractical: number; // practical in non-allowed lab
  facultyDoubleBooked: number;         // faculty teaching 2 batches simultaneously (redundant alias of facultyConflicts, kept separate for MMIT audit)
}

export interface DetailedValidationReport {
  isValid: boolean;
  status: 'VALID' | 'INVALID';
  timetableId: string;
  violations: HardConstraintViolations;
  coverage: {
    requiredHours: number;
    scheduledHours: number;
    percentage: number;
    assignmentDetails: {
      facultyAssignmentId: string;
      teacherName: string;
      subjectCode: string;
      className: string;
      divisionName: string;
      batchName: string | null;
      requiredTheory: number;
      scheduledTheory: number;
      requiredPractical: number;
      scheduledPractical: number;
      requiredTutorial: number;
      scheduledTutorial: number;
      isSatisfied: boolean;
    }[];
  };
  coordinationReport: {
    totalPracticalBlocks: number;
    fourBatchSyncBlocks: number;
    threeBatchSyncBlocks: number;
    twoBatchSyncBlocks: number;
    isolatedBatchBlocks: number;
    coordinationEfficiencyPercent: number;
  };
  conflictDetails: string[];
  summary: string;
}

export async function validateTimetableZeroTrust(
  timetableId: string,
  candidateEntries?: any[],
  options?: { targetDivisionIds?: string[] }
): Promise<DetailedValidationReport> {
  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
    include: {
      entries: {
        include: {
          teacher: true,
          subject: true,
          division: { include: { year: true } },
          batch: true,
          room: true,
          facultyAssignment: true
        }
      }
    }
  });

  const entriesToValidate = candidateEntries || (timetable ? timetable.entries : []);

  const violations: HardConstraintViolations = {
    missingHours: 0,
    extraHours: 0,
    theoryMismatch: 0,
    practicalMismatch: 0,
    tutorialMismatch: 0,
    wrongDepartment: 0,
    wrongSemester: 0,
    wrongCourseYear: 0,
    wrongDivision: 0,
    wrongBatch: 0,
    wrongSubject: 0,
    wrongFaculty: 0,
    facultyConflicts: 0,
    divisionConflicts: 0,
    batchConflicts: 0,
    roomConflicts: 0,
    roomTypeViolations: 0,
    capacityViolations: 0,
    breakViolations: 0,
    invalidDuration: 0,
    practicalNotConsecutive: 0,
    unauthorizedFaculty: 0,
    unauthorizedRoom: 0,
    duplicateSessions: 0,
    orphanEntries: 0,
    theoryLockViolations: 0,
    practicalAsDivisionWide: 0,
    unauthorizedRoomForPractical: 0,
    facultyDoubleBooked: 0,
  };

  const conflictDetails: string[] = [];

  // Fetch TimeSlot definitions
  const timeSlots = await prisma.timeSlot.findMany({ orderBy: { index: 'asc' } });
  const breakSlotIndices = new Set(timeSlots.filter(s => s.isBreak).map(s => s.index));

  // Fetch facultyAssignments with allowed locations for room-authorization check
  const allAssignments = await prisma.facultyAssignment.findMany({
    where: { status: 'ACTIVE', subject: { isCanonical: true } },
    include: { teacher: true, subject: true, division: true, batch: true, allowedLocations: true }
  });
  const assignmentById = new Map(allAssignments.map(a => [a.id, a]));

  // Fetch all rooms
  const allRooms = await prisma.room.findMany({ where: { isActive: true } });
  const roomById = new Map(allRooms.map(r => [r.id, r]));
  const roomByNumber = new Map(allRooms.map(r => [r.roomNumber.toUpperCase(), r.id]));

  // ─── 1. RESOURCE CONFLICT CHECKING ────────────────────────────────────────
  type SlotKey = string; // "day-slot"
  const facultySlots   = new Map<string, Map<SlotKey, any[]>>();
  const divTheorySlots = new Map<string, Map<SlotKey, any[]>>();
  const batchSlots     = new Map<string, Map<SlotKey, any[]>>();
  const roomSlots      = new Map<string, Map<SlotKey, any[]>>();

  const addSlot = (map: Map<string, Map<SlotKey, any[]>>, id: string, key: SlotKey, entry: any) => {
    if (!map.has(id)) map.set(id, new Map());
    const inner = map.get(id)!;
    if (!inner.has(key)) inner.set(key, []);
    inner.get(key)!.push(entry);
  };

  for (const entry of entriesToValidate) {
    if (!entry.teacherId || !entry.subjectId || !entry.divisionId || !entry.roomId) {
      violations.orphanEntries++;
      conflictDetails.push(`Orphan Entry: Entry ${entry.id || 'candidate'} is missing essential FK fields.`);
      continue;
    }

    const key = `${entry.dayOfWeek}-${entry.slotIndex}`;

    // Break check
    if (breakSlotIndices.has(entry.slotIndex)) {
      violations.breakViolations++;
      conflictDetails.push(`Break Violation: ${entry.subject?.code || entry.subjectId} at slot ${entry.slotIndex} on ${DAY_NAMES[entry.dayOfWeek]}`);
    }

    // MMIT Check: Practical MUST be batch-wise (batchId must not be null)
    if (entry.type === 'PRACTICAL' && !entry.batchId) {
      violations.practicalAsDivisionWide++;
      conflictDetails.push(`MMIT Violation: Practical ${entry.subject?.code || entry.subjectId} is division-wide (batchId=null). Practicals MUST be batch-wise.`);
    }

    // Room Type check
    // PRACTICAL must be in a lab (or explicitly allowed classroom/room). LECTURE must be in a classroom.
    // TUTORIAL is allowed in EITHER (labs or classrooms) per MMIT master data (requiredRoomType='ANY').
    const resolvedRoom = entry.room || roomById.get(entry.roomId);
    const asgn = entry.facultyAssignmentId ? assignmentById.get(entry.facultyAssignmentId) : null;
    const isExplicitlyAllowed = asgn?.allowedLocations?.some(
      (loc: any) => loc.roomNumber.toUpperCase() === resolvedRoom?.roomNumber?.toUpperCase()
    );

    if (entry.type === 'PRACTICAL' && resolvedRoom && !resolvedRoom.isLab && !isExplicitlyAllowed) {
      violations.roomTypeViolations++;
      conflictDetails.push(`Room Type Violation: Practical ${entry.subject?.code || asgn?.subject?.code} in classroom ${resolvedRoom.roomNumber}`);
    } else if (entry.type === 'LECTURE' && resolvedRoom && resolvedRoom.isLab && !isExplicitlyAllowed) {
      violations.roomTypeViolations++;
      conflictDetails.push(`Room Type Violation: Lecture ${entry.subject?.code || asgn?.subject?.code} in lab ${resolvedRoom.roomNumber}`);
    }

    // MMIT Check: Room Authorization for Practicals (must be in allowedLocations)
    if (entry.type === 'PRACTICAL' && asgn && asgn.allowedLocations && asgn.allowedLocations.length > 0) {
      const allowedRoomIds = new Set(
        asgn.allowedLocations
          .map((loc: any) => roomByNumber.get(loc.roomNumber.toUpperCase()))
          .filter(Boolean)
      );
      if (!allowedRoomIds.has(entry.roomId)) {
        violations.unauthorizedRoomForPractical++;
        conflictDetails.push(`MMIT Room Auth Violation: Practical ${entry.subject?.code || asgn.subject?.code} placed in room ${resolvedRoom?.roomNumber || entry.roomId} which is NOT in allowedLocations.`);
      }
    }

    // Wrong batch (batch's division doesn't match entry's division)
    if (entry.batchId && entry.batch && entry.batch.divisionId !== entry.divisionId) {
      violations.wrongBatch++;
      conflictDetails.push(`Wrong Batch Violation: Batch ${entry.batch.name} (div ${entry.batch.divisionId}) assigned to entry in Division ${entry.divisionId}`);
    }

    addSlot(facultySlots, entry.teacherId, key, entry);
    if (!entry.batchId) {
      addSlot(divTheorySlots, entry.divisionId, key, entry);
    } else {
      addSlot(batchSlots, entry.batchId, key, entry);
    }
    addSlot(roomSlots, entry.roomId, key, entry);
  }

  // Count basic conflicts
  const checkConflicts = (
    map: Map<string, Map<SlotKey, any[]>>,
    label: string,
    violationField: keyof HardConstraintViolations
  ) => {
    map.forEach((slotMap) => {
      slotMap.forEach((list, key) => {
        if (list.length > 1) {
          (violations[violationField] as number) += (list.length - 1);
          conflictDetails.push(`${label} Conflict at ${key}: ${list.map(e => e.subject?.code || e.subjectId).join(', ')}`);
        }
      });
    });
  };

  checkConflicts(facultySlots, 'Faculty', 'facultyConflicts');
  checkConflicts(batchSlots, 'Batch', 'batchConflicts');
  checkConflicts(roomSlots, 'Room', 'roomConflicts');

  // Division theory conflicts (allowing parallel elective tracks of the same subject code)
  divTheorySlots.forEach((slotMap, divId) => {
    slotMap.forEach((list, key) => {
      if (list.length > 1) {
        const firstSubj = list[0].subjectId;
        const allSameSubj = list.every(e => e.subjectId === firstSubj);
        const uniqueTeachers = new Set(list.map(e => e.teacherId)).size;
        const uniqueRooms = new Set(list.map(e => e.roomId)).size;

        if (allSameSubj && uniqueTeachers === list.length && uniqueRooms === list.length) {
          // Valid parallel elective tracks for same subject in separate rooms — not a conflict
        } else {
          violations.divisionConflicts += (list.length - 1);
          conflictDetails.push(`Division Theory Conflict at ${key}: ${list.map(e => e.subject?.code || e.subjectId).join(', ')}`);
        }
      }
    });
  });

  // ─── MMIT HARD CHECK: Theory Lock ──────────────────────────────────────────
  // If a division has a theory/tutorial (batchId=null) at slot X,
  // NO batch of that division may have any session at slot X.
  divTheorySlots.forEach((slotMap, divId) => {
    slotMap.forEach((theoryEntries, key) => {
      // Find all batch entries of this division at the same slot
      batchSlots.forEach((bSlotMap, batchId) => {
        if (bSlotMap.has(key)) {
          const bEntries = bSlotMap.get(key)!;
          const matchingDivBEntries = bEntries.filter(e => e.divisionId === divId);
          if (matchingDivBEntries.length > 0) {
            violations.theoryLockViolations += matchingDivBEntries.length;
            violations.divisionConflicts    += matchingDivBEntries.length;
            conflictDetails.push(
              `MMIT Theory Lock Violation at slot ${key}: Division ${divId} has theory [${theoryEntries.map(e => e.subject?.code).join(',')}] but Batch ${batchId} also has session [${matchingDivBEntries.map(e => e.subject?.code).join(',')}]`
            );
          }
        }
      });
    });
  });

  // ─── Daily Theory Lecture Limit (Max 1 per subject track per div per day) ────────
  const theorySubjDivDayMap = new Map<string, any[]>();
  for (const entry of entriesToValidate) {
    if (entry.type === 'LECTURE' && !entry.batchId) {
      const k = `${entry.subjectId}-${entry.divisionId}-${entry.dayOfWeek}-${entry.teacherId}`;
      if (!theorySubjDivDayMap.has(k)) theorySubjDivDayMap.set(k, []);
      theorySubjDivDayMap.get(k)!.push(entry);
    }
  }
  theorySubjDivDayMap.forEach((eList, key) => {
    if (eList.length > 1) {
      violations.theoryMismatch += (eList.length - 1);
      const e = eList[0];
      conflictDetails.push(`Daily Lecture Limit: Subject ${e.subject?.code || e.subjectId} has ${eList.length} theory lectures on ${DAY_NAMES[e.dayOfWeek]} for Division ${e.divisionId}`);
    }
  });

  // ─── Daily Batch Practical Limit (Max 1 practical block per subject per batch per day) ───
  const batchSubjDayBlocks = new Map<string, Set<number>>();
  for (const entry of entriesToValidate) {
    if (entry.batchId && (entry.type === 'PRACTICAL' || entry.type === 'TUTORIAL')) {
      const k = `${entry.subjectId}-${entry.batchId}-${entry.dayOfWeek}`;
      if (!batchSubjDayBlocks.has(k)) batchSubjDayBlocks.set(k, new Set());
      const blockId = Math.floor((entry.slotIndex - 1) / 3);
      batchSubjDayBlocks.get(k)!.add(blockId);
    }
  }
  batchSubjDayBlocks.forEach((blocks, key) => {
    if (blocks.size > 1) {
      violations.duplicateSessions += (blocks.size - 1);
      conflictDetails.push(`Daily Practical Limit: Subject for batch has ${blocks.size} separate practical blocks on the same day.`);
    }
  });

  // ─── Faculty Double-Booking across Batches ─────────────────────────────────
  // (Already caught by facultyConflicts, but surfaced separately for MMIT audit)
  facultySlots.forEach((slotMap, teacherId) => {
    slotMap.forEach((list, key) => {
      if (list.length > 1) {
        const batchEntries = list.filter(e => e.batchId);
        if (batchEntries.length > 1) {
          violations.facultyDoubleBooked += (batchEntries.length - 1);
          conflictDetails.push(`MMIT Faculty Double-Booked at ${key}: Faculty ${teacherId} teaching ${batchEntries.length} batches simultaneously.`);
        }
      }
    });
  });

  // ─── 2. CURRICULUM & IDENTITY VERIFICATION (facultyAssignmentId chain) ─────
  let totalRequiredHours  = 0;
  let totalScheduledHours = 0;
  const assignmentDetails: any[] = [];

  // Filter assignments to divisions present in candidate entries or targetDivisionIds options
  const targetDivisionIds = (options?.targetDivisionIds && options.targetDivisionIds.length > 0)
    ? new Set(options.targetDivisionIds)
    : new Set(entriesToValidate.map(e => e.divisionId).filter(Boolean));
  const relevantAssignments = targetDivisionIds.size > 0
    ? allAssignments.filter(a => targetDivisionIds.has(a.divisionId))
    : allAssignments;

  for (const a of relevantAssignments) {
    const matchingEntries = entriesToValidate.filter(e => e.facultyAssignmentId === a.id);

    const schTh = matchingEntries.filter(e => e.type === 'LECTURE').length;
    const schPr = matchingEntries.filter(e => e.type === 'PRACTICAL').length;
    const schTu = matchingEntries.filter(e => e.type === 'TUTORIAL').length;

    const reqTh = a.theoryHours;
    const reqPr = (!a.batchId && schPr > 0) ? schPr : a.practicalHours;
    const reqTu = (!a.batchId && schTu > 0) ? schTu : a.tutorialHours;
    const reqTotal = reqTh + reqPr + reqTu;
    if (reqTotal === 0) continue;
    totalRequiredHours += reqTotal;
    const totalSchHours = schTh + schPr + schTu;
    totalScheduledHours += totalSchHours;

    if (schTh !== reqTh)   violations.theoryMismatch    += Math.abs(schTh - reqTh);
    if (schPr !== reqPr)   violations.practicalMismatch += Math.abs(schPr - reqPr);
    if (schTu !== reqTu)   violations.tutorialMismatch  += Math.abs(schTu - reqTu);
    if (totalSchHours < reqTotal) violations.missingHours += (reqTotal - totalSchHours);
    if (totalSchHours > reqTotal) violations.extraHours   += (totalSchHours - reqTotal);

    const isSatisfied = schTh === reqTh && schPr === reqPr && schTu === reqTu;

    assignmentDetails.push({
      facultyAssignmentId: a.id,
      teacherName:         a.teacher.name,
      subjectCode:         a.subject.code,
      className:           a.className || 'SE',
      divisionName:        a.divisionName || a.division.name,
      batchName:           a.batch ? a.batch.name : a.batchName,
      requiredTheory:      reqTh,
      scheduledTheory:     schTh,
      requiredPractical:   reqPr,
      scheduledPractical:  schPr,
      requiredTutorial:    reqTu,
      scheduledTutorial:   schTu,
      isSatisfied,
    });
  }

  // ─── 3. PRACTICAL BLOCK CONTINUITY CHECK ──────────────────────────────────
  const practicalEntries = entriesToValidate.filter(e => e.type === 'PRACTICAL');
  const practicalGroups  = new Map<string, any[]>();
  for (const pe of practicalEntries) {
    const gKey = `${pe.facultyAssignmentId || `${pe.teacherId}-${pe.subjectId}-${pe.batchId}`}-${pe.dayOfWeek}`;
    if (!practicalGroups.has(gKey)) practicalGroups.set(gKey, []);
    practicalGroups.get(gKey)!.push(pe);
  }

  practicalGroups.forEach((peList, gKey) => {
    peList.sort((a, b) => a.slotIndex - b.slotIndex);
    if (peList.length % 2 !== 0) {
      violations.practicalNotConsecutive++;
      conflictDetails.push(`Practical Continuity Error: group ${gKey} has odd slot count (${peList.length})`);
    } else {
      for (let i = 0; i < peList.length; i += 2) {
        const p1 = peList[i];
        const p2 = peList[i + 1];
        if (!p2 || p2.slotIndex !== p1.slotIndex + 1 || p1.roomId !== p2.roomId) {
          violations.practicalNotConsecutive++;
          conflictDetails.push(`Practical Continuity Error: day ${p1.dayOfWeek} slot ${p1.slotIndex} not followed by consecutive slot in same room.`);
        }
      }
    }
  });

  // ─── 4. DATA-DRIVEN COORDINATION REPORT ───────────────────────────────────
  const practicalBlocksMap = new Map<string, Set<string>>();
  for (const pe of practicalEntries) {
    const startSlot = (pe.slotIndex % 2 === 1) ? pe.slotIndex : (pe.slotIndex - 1);
    const bKey = `${pe.divisionId}-${pe.dayOfWeek}-${startSlot}`;
    if (!practicalBlocksMap.has(bKey)) practicalBlocksMap.set(bKey, new Set());
    if (pe.batchId) practicalBlocksMap.get(bKey)!.add(pe.batchId);
  }

  let fourBatchSyncBlocks  = 0;
  let threeBatchSyncBlocks = 0;
  let twoBatchSyncBlocks   = 0;
  let isolatedBatchBlocks  = 0;
  let totalBatchesInBlocks = 0;

  practicalBlocksMap.forEach((batchSet) => {
    const count = batchSet.size;
    totalBatchesInBlocks += count;
    if (count >= 4)      fourBatchSyncBlocks++;
    else if (count === 3) threeBatchSyncBlocks++;
    else if (count === 2) twoBatchSyncBlocks++;
    else                  isolatedBatchBlocks++;
  });

  const totalBlocks = practicalBlocksMap.size;
  const maxPossibleBatches = totalBlocks * 4;
  const coordinationEfficiencyPercent = maxPossibleBatches > 0
    ? Math.round((totalBatchesInBlocks / maxPossibleBatches) * 100)
    : 100;

  // ─── SUMMARY ───────────────────────────────────────────────────────────────
  const totalViolations = Object.values(violations).reduce((sum, v) => sum + v, 0);
  const isValid = totalViolations === 0;
  const percentage = totalRequiredHours > 0
    ? Math.round((totalScheduledHours / totalRequiredHours) * 100)
    : 100;

  const summary = isValid
    ? `✅ VALID TIMETABLE: ${totalScheduledHours}/${totalRequiredHours} hrs (${percentage}%), 0 violations. ${fourBatchSyncBlocks} 4-batch sync blocks (${coordinationEfficiencyPercent}% coordination efficiency).`
    : `❌ INVALID TIMETABLE: ${totalViolations} violations (${totalScheduledHours}/${totalRequiredHours} hrs). Theory-lock: ${violations.theoryLockViolations}, PracticalAsDiv: ${violations.practicalAsDivisionWide}, RoomAuth: ${violations.unauthorizedRoomForPractical}, FacultyConflicts: ${violations.facultyConflicts}, Missing: ${violations.missingHours}h`;

  return {
    isValid,
    status: isValid ? 'VALID' : 'INVALID',
    timetableId: timetableId || 'CANDIDATE',
    violations,
    coverage: {
      requiredHours:    totalRequiredHours,
      scheduledHours:   totalScheduledHours,
      percentage,
      assignmentDetails,
    },
    coordinationReport: {
      totalPracticalBlocks:         totalBlocks,
      fourBatchSyncBlocks,
      threeBatchSyncBlocks,
      twoBatchSyncBlocks,
      isolatedBatchBlocks,
      coordinationEfficiencyPercent,
    },
    conflictDetails,
    summary,
  };
}

export async function validateTimetable(timetableId: string) {
  return validateTimetableZeroTrust(timetableId);
}

export async function validateTimetableCompleteness(timetableId: string) {
  return validateTimetableZeroTrust(timetableId);
}
