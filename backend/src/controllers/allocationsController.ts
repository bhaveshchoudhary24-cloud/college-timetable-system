import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Workload thresholds (configurable)
const NORMAL_WORKLOAD_LIMIT = 18;
const HIGH_WORKLOAD_LIMIT = 22;

export function formatAllocation(a: any) {
  let derivedClass = a.className;
  const code = a.courseCode || a.subject?.code || '';

  if (code.startsWith('PCC-50') || code.startsWith('PEC-52') || code.startsWith('RM-60')) {
    derivedClass = 'ME-I';
  } else if (code.startsWith('PCC-20') || code.startsWith('HSMC-20') || code.startsWith('EEM-24') || code.startsWith('CEF-26') || code.startsWith('VEC-25') || code.startsWith('OEL-22')) {
    derivedClass = 'SE';
  } else if (code.startsWith('PCC30') || code.startsWith('PEC32') || code.startsWith('MDM33') || code.startsWith('OLE34') || code.startsWith('ELC34')) {
    derivedClass = 'TE';
  } else if (code.startsWith('4102')) {
    derivedClass = 'BE';
  } else {
    const yr = a.division?.year?.year;
    if (yr === 2) derivedClass = 'SE';
    else if (yr === 3) derivedClass = 'TE';
    else if (yr === 4) derivedClass = 'BE';
  }

  const derivedDiv = a.divisionName || a.division?.name || 'A';
  const derivedBatch = a.batchName || a.batch?.name || (a.batchId ? (a.batch?.name || 'A1') : 'All');
  const courseCode = a.courseCode || a.subject?.code || '';
  const courseName = a.courseName || a.subject?.name || '';

  return {
    ...a,
    className: derivedClass || 'SE',
    divisionName: derivedDiv,
    batchName: derivedBatch,
    courseCode,
    courseName,
  };
}

export const getAllocations = async (req: Request, res: Response) => {
  try {
    const { departmentId, academicYear, semester, className, divisionName, teacherId, search } = req.query;

    const where: any = {};

    if (departmentId && departmentId !== 'ALL') {
      where.OR = [
        { departmentId: String(departmentId) },
        { teacher: { departmentId: String(departmentId) } }
      ];
    }

    if (academicYear) {
      where.academicYear = String(academicYear);
    }

    if (semester) {
      where.semester = Number(semester);
    }

    if (className) {
      where.className = String(className);
    }

    if (divisionName) {
      where.divisionName = String(divisionName);
    }

    if (teacherId) {
      where.teacherId = String(teacherId);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      where.OR = [
        { teacher: { name: { contains: q } } },
        { teacher: { employeeId: { contains: q } } },
        { teacher: { shortCode: { contains: q } } },
        { courseName: { contains: q } },
        { courseCode: { contains: q } },
        { className: { contains: q } },
        { divisionName: { contains: q } }
      ];
    }

    const allocations = await prisma.facultyAssignment.findMany({
      where,
      include: {
        teacher: true,
        subject: true,
        division: {
          include: {
            year: true
          }
        },
        batch: true,
        department: true,
        allowedLocations: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(allocations.map(formatAllocation));
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ message: 'Error fetching allocations', error });
  }
};

export const createAllocation = async (req: Request, res: Response) => {
  try {
    const {
      teacherId,
      departmentId,
      subjectId,
      divisionId,
      batchId,
      className,
      divisionName,
      batchName,
      courseCode,
      courseName,
      theoryHours = 0,
      practicalHours = 0,
      tutorialHours = 0,
      projectHours = 0,
      academicYear = '2024-25',
      semester
    } = req.body;

    if (!teacherId) return res.status(400).json({ message: 'Faculty is required' });
    if (!divisionId) return res.status(400).json({ message: 'Class / Division is required' });

    const th = Math.max(0, Number(theoryHours) || 0);
    const pr = Math.max(0, Number(practicalHours) || 0);
    const tu = Math.max(0, Number(tutorialHours) || 0);
    const proj = Math.max(0, Number(projectHours) || 0);
    const total = th + pr + tu + proj;

    // Fetch related records if missing names/codes
    let subCode = courseCode;
    let subName = courseName;
    if (subjectId && (!subCode || !subName)) {
      const s = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (s) {
        subCode = subCode || s.code;
        subName = subName || s.name;
      }
    }

    const teacherObj = await prisma.teacher.findUnique({ where: { id: teacherId } });

    const type = th > 0 ? 'LECTURE' : (pr > 0 ? 'PRACTICAL' : (proj > 0 ? 'PROJECT' : 'TUTORIAL'));

    const allocation = await prisma.facultyAssignment.create({
      data: {
        teacherId,
        departmentId: departmentId || teacherObj?.departmentId,
        subjectId: subjectId || '',
        divisionId,
        batchId: batchId || null,
        className: className || 'SE',
        divisionName: divisionName || 'A',
        batchName: batchName || 'All',
        courseCode: subCode || '',
        courseName: subName || '',
        theoryHours: th,
        practicalHours: pr,
        tutorialHours: tu,
        projectHours: proj,
        totalHours: total,
        weeklyHours: total,
        type,
        academicYear,
        semester: semester ? Number(semester) : null,
        status: 'ACTIVE'
      },
      include: {
        teacher: true,
        subject: true,
        division: true,
        batch: true,
        department: true,
        allowedLocations: true
      }
    });

    res.status(201).json(allocation);
  } catch (error) {
    console.error('Error creating allocation:', error);
    res.status(500).json({ message: 'Error creating allocation', error });
  }
};

export const updateAllocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      teacherId,
      departmentId,
      subjectId,
      divisionId,
      batchId,
      className,
      divisionName,
      batchName,
      courseCode,
      courseName,
      theoryHours = 0,
      practicalHours = 0,
      tutorialHours = 0,
      projectHours = 0,
      academicYear,
      semester,
      status
    } = req.body;

    const th = Math.max(0, Number(theoryHours) || 0);
    const pr = Math.max(0, Number(practicalHours) || 0);
    const tu = Math.max(0, Number(tutorialHours) || 0);
    const proj = Math.max(0, Number(projectHours) || 0);
    const total = th + pr + tu + proj;

    const type = th > 0 ? 'LECTURE' : (pr > 0 ? 'PRACTICAL' : (proj > 0 ? 'PROJECT' : 'TUTORIAL'));

    const allocation = await prisma.facultyAssignment.update({
      where: { id: String(id) },
      data: {
        teacherId,
        departmentId,
        subjectId,
        divisionId,
        batchId: batchId || null,
        className,
        divisionName,
        batchName,
        courseCode,
        courseName,
        theoryHours: th,
        practicalHours: pr,
        tutorialHours: tu,
        projectHours: proj,
        totalHours: total,
        weeklyHours: total,
        type,
        academicYear,
        semester: semester ? Number(semester) : undefined,
        status
      },
      include: {
        teacher: true,
        subject: true,
        division: true,
        batch: true,
        department: true,
        allowedLocations: true
      }
    });

    // Invalidate old generated timetables
    await prisma.timetable.updateMany({
      data: { isValid: false }
    });

    res.json(allocation);
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ message: 'Error updating allocation', error });
  }
};

export const deleteAllocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.facultyAssignment.delete({
      where: { id: String(id) }
    });

    // Invalidate old generated timetables
    await prisma.timetable.updateMany({
      data: { isValid: false }
    });

    res.json({ success: true, message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    res.status(500).json({ message: 'Error deleting allocation', error });
  }
};

export const getWorkloadSummary = async (req: Request, res: Response) => {
  try {
    const { departmentId, search } = req.query;

    const teacherWhere: any = { isActive: true };
    if (departmentId && departmentId !== 'ALL') {
      teacherWhere.OR = [
        { departmentId: String(departmentId) },
        { departments: { some: { departmentId: String(departmentId) } } }
      ];
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      teacherWhere.AND = [
        {
          OR: [
            { name: { contains: q } },
            { employeeId: { contains: q } },
            { shortCode: { contains: q } },
            { designation: { contains: q } }
          ]
        }
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where: teacherWhere,
      include: {
        department: true,
        assignments: {
          include: {
            subject: true,
            division: {
              include: {
                year: true
              }
            },
            batch: true,
            allowedLocations: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const activeTeachers = teachers.filter(t => t.assignments.length > 0 || !departmentId || departmentId === 'ALL');

    const summary = activeTeachers
      .map((t, idx) => {
        let theory = 0;
        let practical = 0;
        let tutorial = 0;
        let project = 0;

        const formattedAllocations = t.assignments.map(formatAllocation);

        formattedAllocations.forEach(a => {
          theory += a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
          practical += a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
          tutorial += a.tutorialHours || (a.type === 'TUTORIAL' ? a.weeklyHours : 0);
          project += a.projectHours || (a.type === 'PROJECT' || a.type === 'SEMINAR' ? a.weeklyHours : 0);
        });

        const total = theory + practical + tutorial + project;

        let status = 'Normal';
        if (total > HIGH_WORKLOAD_LIMIT) {
          status = 'Overloaded';
        } else if (total > NORMAL_WORKLOAD_LIMIT) {
          status = 'High';
        }

        return {
          srNo: idx + 1,
          id: t.id,
          facultyCode: t.shortCode || t.employeeId,
          facultyName: t.name,
          designation: t.designation || 'Faculty',
          departmentId: t.departmentId,
          departmentName: t.department?.name || 'Computer Engineering',
          totalTheory: theory,
          totalPractical: practical,
          totalTutorial: tutorial,
          totalProject: project,
          totalWorkload: total,
          status,
          isCodeFlagged: t.isCodeFlagged,
          codeFlagReason: t.codeFlagReason,
          allocationsCount: formattedAllocations.length,
          allocations: formattedAllocations
        };
      })
      .filter(f => f.allocationsCount > 0 || (departmentId && departmentId !== 'ALL'))
      .sort((a, b) => b.totalWorkload - a.totalWorkload);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching workload summary:', error);
    res.status(500).json({ message: 'Error fetching workload summary', error });
  }
};

export const getWorkloadGraphs = async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;

    const isAll = !departmentId || departmentId === 'ALL';

    const teacherWhere: any = { isActive: true };
    if (!isAll && typeof departmentId === 'string') {
      teacherWhere.OR = [
        { departmentId: String(departmentId) },
        { departments: { some: { departmentId: String(departmentId) } } }
      ];
    }

    const [teachers, departments] = await Promise.all([
      prisma.teacher.findMany({
        where: teacherWhere,
        include: {
          department: true,
          assignments: true
        }
      }),
      prisma.department.findMany({
        where: { isActive: true },
        include: {
          teachers: {
            include: { assignments: true }
          }
        }
      })
    ]);

    // Graph 1 & 2: Faculty-wise Workload & Breakdown
    const facultyWorkload: any[] = [];
    const workloadBreakdown: any[] = [];

    teachers.forEach(t => {
      let th = 0, pr = 0, tu = 0, proj = 0;
      t.assignments.forEach(a => {
        th += a.theoryHours || (a.type === 'LECTURE' ? a.weeklyHours : 0);
        pr += a.practicalHours || (a.type === 'PRACTICAL' ? a.weeklyHours : 0);
        tu += a.tutorialHours || (a.type === 'TUTORIAL' ? a.weeklyHours : 0);
        proj += a.projectHours || (a.type === 'PROJECT' || a.type === 'SEMINAR' ? a.weeklyHours : 0);
      });
      const total = th + pr + tu + proj;

      if (total > 0 || !isAll) {
        const code = t.shortCode || t.employeeId;
        facultyWorkload.push({
          code,
          name: t.name,
          totalWorkload: total,
          status: total > HIGH_WORKLOAD_LIMIT ? 'Overloaded' : (total > NORMAL_WORKLOAD_LIMIT ? 'High' : 'Normal')
        });

        workloadBreakdown.push({
          code,
          name: t.name,
          theory: th,
          practical: pr,
          tutorial: tu,
          project: proj
        });
      }
    });

    // Graph 3: Department-wise Total Workload
    const departmentWorkload = departments.map(d => {
      let deptTotal = 0;
      d.teachers.forEach(t => {
        t.assignments.forEach(a => {
          deptTotal += a.totalHours || a.weeklyHours || 0;
        });
      });

      return {
        department: d.name,
        code: d.code,
        totalWorkload: deptTotal,
        totalFaculty: d.teachers.length
      };
    });

    res.json({
      facultyWorkload,
      workloadBreakdown,
      departmentWorkload
    });
  } catch (error) {
    console.error('Error fetching workload graphs:', error);
    res.status(500).json({ message: 'Error fetching workload graphs', error });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.facultyAssignment.deleteMany({
      where: { teacherId: String(id) }
    });

    await prisma.teacher.delete({
      where: { id: String(id) }
    });

    // Invalidate old generated timetables
    await prisma.timetable.updateMany({
      data: { isValid: false }
    });

    res.json({ message: 'Faculty member and associated assignments deleted.' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ message: 'Error deleting teacher', error });
  }
};

