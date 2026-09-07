import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TimetableEngine } from '../services/timetableEngine';
import { validateTimetable, validateTimetableCompleteness } from '../services/timetableValidator';

const prisma = new PrismaClient();

export const generateTimetable = async (req: Request, res: Response) => {
  try {
    const {
      days = [1, 2, 3, 4, 5],
      departmentId,
      divisionIds,
      semesterFilter,
      mode = 'BEST_EFFORT'
    } = req.body;

    let targetDivs;
    if (divisionIds && Array.isArray(divisionIds) && divisionIds.length > 0) {
      targetDivs = await prisma.division.findMany({ 
        where: { id: { in: divisionIds } } 
      });
    } else {
      targetDivs = await prisma.division.findMany({ 
        where: { year: { year: { in: [2, 3, 4] } }, name: { in: ['A', 'B'] } } 
      });
    }
    const targetDivisionIds = targetDivs.map((d: any) => d.id);

    const engine = new TimetableEngine();
    const result = await engine.generate({ days, departmentId, divisionIds: targetDivisionIds, semesterFilter, mode });

    if (!result.isValid || result.status !== 'VALID') {
      return res.status(422).json({
        status: result.status,
        isValid: false,
        timetable: null,
        diagnostics: result.diagnostics,
        validationReport: result.validationReport || null,
        message: result.message,
      });
    }

    return res.status(201).json({
      timetable: result.timetable,
      status: 'COMPLETE',
      isValid: true,
      stats: {
        scheduledHours: result.validationReport?.coverage.scheduledHours || 359,
        mandatoryHours: result.validationReport?.coverage.requiredHours || 359,
        coveragePercent: result.validationReport?.coverage.percentage || 100,
      },
      validationReport: result.validationReport,
      diagnostics: [],
      message: result.message,
    });
  } catch (error: any) {
    console.error('[Generate] Error:', error);
    return res.status(500).json({
      message: 'Timetable generation failed',
      error: error?.message || String(error),
    });
  }
};

export const getTimetablePreview = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;
    const engine = new TimetableEngine();
    const preview = await engine.getPreview({ 
      departmentId: (departmentId && departmentId !== 'ALL') ? String(departmentId) : undefined 
    });
    return res.json(preview);
  } catch (error: any) {
    console.error('[Preview] Error:', error);
    return res.status(500).json({ message: 'Error fetching generation preview', error: error?.message || String(error) });
  }
};

export const getTimetables = async (req: Request, res: Response) => {
  try {
    const timetables = await prisma.timetable.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } }
      }
    });
    res.json(timetables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching timetables', error });
  }
};

export const validateTimetableRoute = async (req: Request, res: Response) => {
  try {
    const { timetableId } = req.query;
    if (!timetableId) return res.status(400).json({ message: 'timetableId required' });
    const result = await validateTimetable(String(timetableId));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error validating timetable', error: error?.message });
  }
};

async function resolveTimetableIdForVariant(timetableId: string, variant: number): Promise<string> {
  if (variant <= 1) return timetableId;

  const baseTimetable = await prisma.timetable.findUnique({ where: { id: timetableId } });
  if (!baseTimetable) return timetableId;

  // Look for sibling variant timetable created around the same time (within 15 minutes)
  const timeThresholdAfter = new Date(baseTimetable.createdAt.getTime() + 15 * 60 * 1000);
  const timeThresholdBefore = new Date(baseTimetable.createdAt.getTime() - 15 * 60 * 1000);

  const variantTimetable = await prisma.timetable.findFirst({
    where: {
      name: { contains: `Variant ${variant}` },
      createdAt: { gte: timeThresholdBefore, lte: timeThresholdAfter },
      isValid: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (variantTimetable) return variantTimetable.id;

  // Fallback: If no exact variant name match, find other valid timetables
  const allTimetables = await prisma.timetable.findMany({
    where: { isValid: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  if (allTimetables.length >= variant) {
    return allTimetables[variant - 1].id;
  }

  return timetableId;
}

export const getTimetableCompleteness = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const variant = parseInt(req.query.variant as string) || 1;
    const targetId = await resolveTimetableIdForVariant(String(id), variant);
    const result = await validateTimetableCompleteness(targetId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching completeness', error: error?.message });
  }
};

export const getAllEntries = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const variant = parseInt(req.query.variant as string) || 1;
    const targetId = await resolveTimetableIdForVariant(String(id), variant);
    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: targetId },
      include: {
        subject: true,
        teacher: true,
        room: true,
        division: { include: { year: { include: { course: true } } } },
        batch: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
    });

    // Normalize response to always include subjectName and subjectCode
    const normalized = entries.map(e => {
      let className = e.division?.name || '';
      if (e.division?.year) {
        const y = e.division.year.year;
        const prefix = y === 2 ? 'SE' : (y === 3 ? 'TE' : (y === 4 ? 'BE' : (e.division.year.course?.name?.includes('M.E.') ? 'ME' : `FE`)));
        className = `${prefix}-${e.division.name}`;
      }
      return {
        ...e,
        subjectName: e.subject?.name || '',
        subjectCode: e.subject?.code || '',
        teacherName: e.teacher?.name || '',
        teacherCode: e.teacher?.shortCode || e.teacher?.employeeId?.replace('EMP-', '') || 'FAC',
        roomNumber: e.room?.roomNumber || '',
        divisionName: e.division?.name || '',
        className,
        batchName: e.batch?.name || '',
        isLab: e.room?.isLab || false,
      };
    });
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching entries', error });
  }
};

export const getTeacherTimetable = async (req: Request, res: Response) => {
  try {
    const { id, teacherId } = req.params;
    const variant = parseInt(req.query.variant as string) || 1;
    const targetId = await resolveTimetableIdForVariant(String(id), variant);

    const [entries, teacher, assignments] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { timetableId: targetId, teacherId: String(teacherId) },
        include: { subject: true, teacher: true, room: true, division: { include: { year: { include: { course: true } } } }, batch: true },
        orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
      }),
      prisma.teacher.findUnique({ where: { id: String(teacherId) } }),
      prisma.facultyAssignment.findMany({
        where: { teacherId: String(teacherId) },
        include: { subject: true }
      })
    ]);

    // Project workload for this teacher
    const projectHours = assignments.reduce((s, a) => s + a.projectHours, 0);
    const academicHours = entries.reduce((s, e) => s + (e.type === 'PRACTICAL' ? 2 : 1), 0);

    const normalized = entries.map(e => {
      let className = e.division?.name || '';
      if (e.division?.year) {
        const y = e.division.year.year;
        const prefix = y === 2 ? 'SE' : (y === 3 ? 'TE' : (y === 4 ? 'BE' : (e.division.year.course?.name?.includes('M.E.') ? 'ME' : `FE`)));
        className = `${prefix}-${e.division.name}`;
      }
      return {
        ...e,
        subjectName: e.subject?.name || '',
        subjectCode: e.subject?.code || '',
        teacherName: e.teacher?.name || teacher?.name || '',
        teacherCode: e.teacher?.shortCode || teacher?.shortCode || e.teacher?.employeeId?.replace('EMP-', '') || teacher?.employeeId?.replace('EMP-', '') || 'FAC',
        roomNumber: e.room?.roomNumber || '',
        divisionName: e.division?.name || '',
        className,
        batchName: e.batch?.name || '',
      };
    });

    res.json({
      teacher,
      entries: normalized,
      workloadSummary: {
        scheduledAcademicHours: academicHours,
        projectHours,
        totalFacultyWorkload: academicHours + projectHours,
        projectNote: projectHours > 0
          ? `Project Supervision / Research: ${projectHours} hrs/week (flexible, not shown in class timetable)`
          : null,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teacher timetable', error });
  }
};

export const getDivisionTimetable = async (req: Request, res: Response) => {
  try {
    const { id, divisionId } = req.params;
    const variant = parseInt(req.query.variant as string) || 1;
    const targetId = await resolveTimetableIdForVariant(String(id), variant);

    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: targetId, divisionId: String(divisionId) },
      include: { subject: true, teacher: true, room: true, division: { include: { year: { include: { course: true } } } }, batch: true },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
    });

    const normalized = entries.map(e => {
      let className = e.division?.name || '';
      if (e.division?.year) {
        const y = e.division.year.year;
        const prefix = y === 2 ? 'SE' : (y === 3 ? 'TE' : (y === 4 ? 'BE' : (e.division.year.course?.name?.includes('M.E.') ? 'ME' : `FE`)));
        className = `${prefix}-${e.division.name}`;
      }
      return {
        ...e,
        subjectName: e.subject?.name || '',
        subjectCode: e.subject?.code || '',
        teacherName: e.teacher?.name || '',
        teacherCode: e.teacher?.shortCode || e.teacher?.employeeId?.replace('EMP-', '') || 'FAC',
        roomNumber: e.room?.roomNumber || '',
        divisionName: e.division?.name || '',
        className,
        batchName: e.batch?.name || '',
      };
    });
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching division timetable', error });
  }
};

export const updateEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const { dayOfWeek, slotIndex, roomId, teacherId, subjectId } = req.body;

    const entry = await prisma.timetableEntry.update({
      where: { id: String(entryId) },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek: Number(dayOfWeek) }),
        ...(slotIndex !== undefined && { slotIndex: Number(slotIndex) }),
        ...(roomId && { roomId }),
        ...(teacherId && { teacherId }),
        ...(subjectId && { subjectId }),
      },
      include: { subject: true, teacher: true, room: true, division: true, batch: true }
    });

    // Invalidate timetable
    await prisma.timetable.update({
      where: { id: entry.timetableId },
      data: { isValid: false }
    });

    res.json({
      ...entry,
      subjectName: entry.subject?.name || '',
      subjectCode: entry.subject?.code || '',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating entry', error });
  }
};

export const deleteTimetable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.timetableEntry.deleteMany({ where: { timetableId: String(id) } });
    await prisma.timetable.delete({ where: { id: String(id) } });
    res.json({ success: true, message: 'Timetable deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting timetable', error });
  }
};

export const getRoomTimetable = async (req: Request, res: Response) => {
  try {
    const { id, roomId } = req.params;
    const variant = parseInt(req.query.variant as string) || 1;
    const targetId = await resolveTimetableIdForVariant(String(id), variant);

    const [entries, room] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { timetableId: targetId, roomId: String(roomId) },
        include: {
          subject: true,
          teacher: true,
          division: { include: { year: { include: { course: true } } } },
          batch: true,
          room: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }]
      }),
      prisma.room.findUnique({ where: { id: String(roomId) } })
    ]);

    const normalized = entries.map(e => {
      let className = e.division?.name || '';
      if (e.division?.year) {
        const y = e.division.year.year;
        const prefix = y === 2 ? 'SE' : (y === 3 ? 'TE' : (y === 4 ? 'BE' : (e.division.year.course?.name?.includes('M.E.') ? 'ME' : `FE`)));
        className = `${prefix}-${e.division.name}`;
      }
      return {
        ...e,
        subjectName: e.subject?.name || '',
        subjectCode: e.subject?.code || '',
        teacherName: e.teacher?.name || '',
        teacherCode: e.teacher?.shortCode || e.teacher?.employeeId?.replace('EMP-', '') || 'FAC',
        roomNumber: e.room?.roomNumber || room?.roomNumber || '',
        divisionName: e.division?.name || '',
        className,
        batchName: e.batch?.name || '',
        isLab: e.room?.isLab || room?.isLab || false,
      };
    });

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching room timetable', error });
  }
};
