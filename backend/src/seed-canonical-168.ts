import { PrismaClient } from '@prisma/client';
import snapshot from './canonical-168-snapshot.json';

const prisma = new PrismaClient();

export async function seedCanonical168() {
  console.log('[Seed-168] Starting canonical 168 allocations seeding...');

  const compDept = await prisma.department.findFirst({
    where: { name: { contains: 'Computer' } }
  });

  if (!compDept) {
    throw new Error('[Seed-168] Computer Department not found. Run prisma/seed.ts first.');
  }

  // Pre-load lookup maps for instant lookups
  const teachers = await prisma.teacher.findMany();
  const teacherMap = new Map<string, string>(); // employeeId -> teacher.id
  teachers.forEach((t) => teacherMap.set(t.employeeId, t.id));

  const subjects = await prisma.subject.findMany();
  const subjectMap = new Map<string, string>(); // code -> subject.id
  subjects.forEach((s) => subjectMap.set(s.code, s.id));

  const divisions = await prisma.division.findMany({
    include: { year: true, batches: true }
  });

  // Division lookup key: `${yearNumber}-${divisionName}`
  const divisionMap = new Map<string, any>();
  divisions.forEach((d) => {
    const key = `${d.year.year}-${d.name}`;
    divisionMap.set(key, d);
  });

  console.log(`[Seed-168] Loaded ${teachers.length} teachers, ${subjects.length} subjects, ${divisions.length} divisions.`);

  // Clear stale allocations and allowed locations cleanly
  await prisma.assignmentAllowedLocation.deleteMany();
  await prisma.facultyAssignment.deleteMany();
  console.log('[Seed-168] Purged existing assignments to ensure clean canonical seed.');

  const idMap = new Map<string, string>(); // oldId -> newId
  let createdCount = 0;

  for (const alloc of snapshot.allocations) {
    const teacherId = teacherMap.get(alloc.teacherEmpId);
    if (!teacherId) {
      console.warn(`[Seed-168] Warning: Teacher ${alloc.teacherEmpId} (${alloc.teacherName}) not found, skipping.`);
      continue;
    }

    const subjectId = subjectMap.get(alloc.subjectCode);
    if (!subjectId) {
      console.warn(`[Seed-168] Warning: Subject ${alloc.subjectCode} not found, skipping.`);
      continue;
    }

    const divKey = `${alloc.yearNumber}-${alloc.divisionName}`;
    const div = divisionMap.get(divKey);
    if (!div) {
      console.warn(`[Seed-168] Warning: Division ${divKey} not found, skipping.`);
      continue;
    }

    // Find batch if applicable
    let batchId: string | null = null;
    if (alloc.batchName && alloc.batchName !== 'All' && alloc.batchName !== '-') {
      const matchBatch = div.batches.find((b: any) => b.name === alloc.batchName);
      if (matchBatch) {
        batchId = matchBatch.id;
      }
    }

    const created = await prisma.facultyAssignment.create({
      data: {
        teacherId,
        departmentId: compDept.id,
        subjectId,
        divisionId: div.id,
        batchId,
        className: alloc.className,
        divisionName: alloc.divisionName,
        batchName: alloc.batchName,
        courseCode: alloc.subjectCode,
        courseName: alloc.subjectName,
        theoryHours: alloc.theoryHours,
        practicalHours: alloc.practicalHours,
        tutorialHours: alloc.tutorialHours,
        projectHours: alloc.projectHours,
        totalHours: alloc.totalHours,
        weeklyHours: alloc.weeklyHours,
        type: alloc.type,
        academicYear: alloc.academicYear || '2026-27',
        semester: alloc.semester || 1,
        rawLocation: alloc.rawLocation,
      }
    });

    idMap.set(alloc.id, created.id);
    createdCount++;
  }

  console.log(`[Seed-168] Created ${createdCount} FacultyAssignment records.`);

  // Insert allowed locations
  let locCount = 0;
  for (const loc of snapshot.allowedLocations) {
    const newAssignmentId = idMap.get(loc.assignmentId);
    if (!newAssignmentId) continue;

    await prisma.assignmentAllowedLocation.create({
      data: {
        assignmentId: newAssignmentId,
        batchName: loc.batchName,
        roomNumber: loc.roomNumber,
        roomName: loc.roomName,
        isPreferred: Boolean(loc.isPreferred),
      }
    });
    locCount++;
  }

  console.log(`[Seed-168] Created ${locCount} AssignmentAllowedLocation records.`);
  console.log('[Seed-168] Canonical 168 allocations seeding complete! ✅');
}

if (require.main === module) {
  seedCanonical168()
    .then(() => {
      console.log('[Seed-168] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed-168] Error:', err);
      process.exit(1);
    });
}
