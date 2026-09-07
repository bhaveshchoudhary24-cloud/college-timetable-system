import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function checkAndSeed() {
  try {
    console.log('[Startup] Checking database status...');

    // Push Prisma schema if tables do not exist
    try {
      await prisma.$queryRaw`SELECT 1 FROM FacultyAssignment LIMIT 1`;
    } catch {
      console.log('[Startup] Tables not found. Pushing schema...');
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    }

    const assignmentCount = await prisma.facultyAssignment.count();
    const teacherCount = await prisma.teacher.count();

    if (assignmentCount === 0 || teacherCount === 0) {
      console.log(`[Startup] Empty database detected (Teachers: ${teacherCount}, Assignments: ${assignmentCount}).`);
      console.log('[Startup] Seeding base structural data (departments, rooms, divisions)...');
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });

      console.log('[Startup] Seeding full faculty workload assignments (168+ allocations)...');
      execSync('npx tsx src/seed-faculty-workload.ts', { stdio: 'inherit' });

      console.log('[Startup] Database initialization and auto-seed complete!');
    } else {
      console.log(`[Startup] Database ready: ${teacherCount} teachers, ${assignmentCount} faculty assignments found.`);
    }

    // Ensure strictly the 4 canonical classrooms and 9 laboratories
    const requiredRooms = [
      { number: 'E101', isLab: false, name: 'SE-A Classroom' },
      { number: 'E102', isLab: false, name: 'TE-A Classroom' },
      { number: 'E103', isLab: false, name: 'TE-B Classroom' },
      { number: 'E104', isLab: false, name: 'SE-B Classroom' },
      { number: 'C101', isLab: true,  name: 'DBMS Lab' },
      { number: 'C102', isLab: true,  name: 'Software Testing Lab' },
      { number: 'C103', isLab: true,  name: 'Hardware Lab' },
      { number: 'C104', isLab: true,  name: 'OOPCG Lab' },
      { number: 'C105', isLab: true,  name: 'Digital / Microprocessor Lab' },
      { number: 'C106', isLab: true,  name: 'Programming Lab' },
      { number: 'C108', isLab: true,  name: 'Server Room' },
      { number: 'C110', isLab: true,  name: 'Data Structure Lab' },
      { number: 'C111', isLab: true,  name: 'Signal Processing Lab' }
    ];

    const dept = await prisma.department.findFirst();
    if (dept) {
      for (const r of requiredRooms) {
        await prisma.room.upsert({
          where: { roomNumber: r.number },
          create: {
            roomNumber: r.number,
            capacity: r.isLab ? 30 : 60,
            departmentId: dept.id,
            isLab: r.isLab,
            isActive: true,
            building: 'Main Building'
          },
          update: {
            isLab: r.isLab,
            isActive: true,
          }
        });
      }

      // Reassign any assignments referencing non-classroom/phantom rooms
      await prisma.assignmentAllowedLocation.updateMany({
        where: { roomNumber: 'C107' },
        data: { roomNumber: 'C111', roomName: 'Signal Processing Lab' }
      });
      await prisma.assignmentAllowedLocation.updateMany({
        where: { roomNumber: 'E105' },
        data: { roomNumber: 'C105', roomName: 'Digital / Microprocessor Lab' }
      });
      await prisma.assignmentAllowedLocation.updateMany({
        where: { roomNumber: 'E106' },
        data: { roomNumber: 'C106', roomName: 'Programming Lab' }
      });

      // Remove phantom rooms (C107 is HOD Cabin, E105 & E106 do not exist)
      await prisma.roomAvailability.deleteMany({
        where: { room: { roomNumber: { in: ['C107', 'E105', 'E106'] } } }
      });
      await prisma.roomMapping.deleteMany({
        where: { room: { roomNumber: { in: ['C107', 'E105', 'E106'] } } }
      });
      await prisma.room.deleteMany({
        where: { roomNumber: { in: ['C107', 'E105', 'E106'] } }
      });
    }

    // Ensure TE-B RoA allowed locations use E103 (never locked to E102)
    const teBDiv = await prisma.division.findFirst({
      where: { name: 'B', year: { year: 3 } }
    });
    if (teBDiv) {
      await prisma.assignmentAllowedLocation.updateMany({
        where: {
          roomNumber: 'E102',
          assignment: {
            divisionId: teBDiv.id,
            subject: { name: { contains: 'Robotics' } }
          }
        },
        data: {
          roomNumber: 'E103',
          roomName: 'Classroom E103 (TE-B Primary)'
        }
      });
    }
  } catch (error) {
    console.error('[Startup] Warning: Check-and-seed encountered an issue:', error);
    // Don't crash the server start process
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();
