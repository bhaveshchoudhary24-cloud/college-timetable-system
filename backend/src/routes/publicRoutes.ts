import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/public/timetables
// Returns the list of timetables (safe: id, name, academicYear, createdAt only)
router.get('/timetables', async (_req: Request, res: Response) => {
  try {
    const timetables = await prisma.timetable.findMany({
      select: { id: true, name: true, academicYear: true, semester: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.set('Cache-Control', 'public, max-age=300');
    return res.json(timetables);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch timetables' });
  }
});

// GET /api/public/timetables/:id
// Returns timetable meta + list of divisions that have entries
router.get('/timetables/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const timetable = await prisma.timetable.findUnique({
      where: { id },
      select: { id: true, name: true, academicYear: true, semester: true, createdAt: true },
    });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found' });

    // Distinct divisionIds in this timetable
    const distinctEntries = await prisma.timetableEntry.findMany({
      where: { timetableId: id },
      select: { divisionId: true },
      distinct: ['divisionId'],
    });

    const divisionIds = distinctEntries.map((e) => e.divisionId);

    const rawDivisions = await prisma.division.findMany({
      where: { id: { in: divisionIds } },
      include: {
        year: {
          include: {
            course: true,
          },
        },
      },
    });

    const divisions = rawDivisions.map((d) => {
      const yearNum = d.year?.year ?? 0;
      const courseName = d.year?.course?.name ?? '';
      const classLabel = yearNum === 2 ? 'SE' : yearNum === 3 ? 'TE' : yearNum === 4 ? 'BE' : courseName.includes('M.E.') ? 'ME' : 'UG';
      return {
        id: d.id,
        name: d.name,
        displayName: `${classLabel} - Div ${d.name}`,
        classLabel,
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));

    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ timetable, divisions });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch timetable info' });
  }
});

// GET /api/public/timetables/:id/division/:divisionId
// Returns sanitized entries for the mobile viewer (no sensitive admin data)
router.get('/timetables/:id/division/:divisionId', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const divisionId = String(req.params.divisionId);

    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: id, divisionId },
      include: {
        subject: { select: { code: true, name: true } },
        teacher: { select: { name: true } },
        room: { select: { roomNumber: true, isLab: true } },
        batch: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }],
    });

    // Sanitize: return only what the mobile viewer needs
    const safe = entries.map((e) => ({
      day: e.dayOfWeek,
      slot: e.slotIndex,
      startTime: e.startTime,
      endTime: e.endTime,
      type: e.type,
      subjectCode: e.subject?.code ?? '',
      subjectName: e.subject?.name ?? '',
      teacherName: e.teacher?.name ?? '',
      roomNumber: e.room?.roomNumber ?? '',
      isLab: e.room?.isLab ?? false,
      batchName: e.batch?.name ?? null,
    }));

    res.set('Cache-Control', 'public, max-age=120');
    return res.json(safe);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch division timetable' });
  }
});

export default router;
