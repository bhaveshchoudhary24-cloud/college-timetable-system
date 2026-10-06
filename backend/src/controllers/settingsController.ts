import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: Record<string, unknown> = {
  collegeName: "Marathwada Mitramandal's Institute of Technology",
  collegeShortName: 'MMIT',
  academicYear: '2026-27',
  currentSemester: 3,
  workingDays: [1, 2, 3, 4, 5],
  allowSaturday: false,
  timeSlots: [
    { index: 1, startTime: '08:30', endTime: '09:30', isBreak: false, label: 'First Period' },
    { index: 2, startTime: '09:30', endTime: '10:30', isBreak: false, label: 'Second Period' },
    { index: 3, startTime: '10:30', endTime: '10:45', isBreak: true, breakName: 'Short Recess' },
    { index: 4, startTime: '10:45', endTime: '11:45', isBreak: false, label: 'Third Period' },
    { index: 5, startTime: '11:45', endTime: '12:45', isBreak: false, label: 'Fourth Period' },
    { index: 6, startTime: '12:45', endTime: '13:30', isBreak: true, breakName: 'Lunch Break' },
    { index: 7, startTime: '13:30', endTime: '14:30', isBreak: false, label: 'Fifth Period' },
    { index: 8, startTime: '14:30', endTime: '15:30', isBreak: false, label: 'Sixth Period' },
  ],
  generation: {
    allowParallelBatches: true,
    balanceFacultyWorkload: true,
    minimizeStudentGaps: true,
    minimizeFacultyGaps: true,
    preferFixedRooms: true,
    preferConsecutivePracticals: true,
    maxFacultyHoursPerDay: 6,
    maxTheoryPeriodsPerDay: 4,
    maxPracticalBlocksPerDay: 2,
    solverTimeoutSeconds: 120,
  },
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };

    for (const config of configs) {
      try {
        settings[config.key] = JSON.parse(config.value);
      } catch {
        settings[config.key] = config.value;
      }
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings', error });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body as Record<string, unknown>;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      });
    }

    // Return updated settings
    const configs = await prisma.systemConfig.findMany();
    const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const config of configs) {
      try {
        settings[config.key] = JSON.parse(config.value);
      } catch {
        settings[config.key] = config.value;
      }
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings', error });
  }
};

export const resetSettings = async (req: Request, res: Response) => {
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      });
    }
    res.json({ success: true, message: 'Settings reset to defaults' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting settings', error });
  }
};

export const getSystemStats = async (req: Request, res: Response) => {
  try {
    const [subjects, assignments, teachers, rooms, divisions, batches, timeSlots, timetables] = await Promise.all([
      prisma.subject.count({ where: { isActive: true } }),
      prisma.facultyAssignment.count(),
      prisma.teacher.count({ where: { isActive: true } }),
      prisma.room.count({ where: { isActive: true } }),
      prisma.division.count({ where: { isActive: true } }),
      prisma.batch.count({ where: { isActive: true } }),
      prisma.timeSlot.findMany({ orderBy: { index: 'asc' } }),
      prisma.timetable.count(),
    ]);

    const canonicalSubjects = await prisma.subject.count({ where: { isCanonical: true, isActive: true } });
    const legacySubjects = await prisma.subject.count({ where: { isCanonical: false, isActive: true } });
    const labs = await prisma.room.count({ where: { isLab: true, isActive: true } });
    const classrooms = await prisma.room.count({ where: { isLab: false, isActive: true } });
    const teachingSlots = timeSlots.filter(s => !s.isBreak);

    const allAssignments = await prisma.facultyAssignment.findMany();
    const totalTh = allAssignments.reduce((s, a) => s + a.theoryHours, 0);
    const totalPr = allAssignments.reduce((s, a) => s + a.practicalHours, 0);
    const totalTu = allAssignments.reduce((s, a) => s + a.tutorialHours, 0);
    const totalProj = allAssignments.reduce((s, a) => s + a.projectHours, 0);

    res.json({
      subjects: { total: subjects, canonical: canonicalSubjects, legacy: legacySubjects },
      assignments: assignments,
      teachers,
      rooms: { total: rooms, labs, classrooms },
      divisions,
      batches,
      timeSlots: {
        total: timeSlots.length,
        teaching: teachingSlots.length,
        breaks: timeSlots.length - teachingSlots.length,
      },
      timetables,
      workload: {
        theory: totalTh,
        practical: totalPr,
        tutorial: totalTu,
        project: totalProj,
        mandatory: totalTh + totalPr + totalTu,
        facultyTotal: totalTh + totalPr + totalTu + totalProj,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system stats', error });
  }
};

export const reseedCanonical168Controller = async (req: Request, res: Response) => {
  try {
    const { seedCanonical168 } = await import('../seed-canonical-168');
    await seedCanonical168();
    const count = await prisma.facultyAssignment.count();
    res.json({ success: true, message: `Successfully seeded ${count} canonical allocations!`, count });
  } catch (error: any) {
    console.error('Error reseeding canonical 168 allocations:', error);
    res.status(500).json({ success: false, message: 'Reseed failed', error: error?.message || String(error) });
  }
};

