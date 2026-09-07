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

    // Ensure all 16 canonical rooms are created and active
    const requiredRooms = [
      { number: 'E101', isLab: false },
      { number: 'E102', isLab: false },
      { number: 'E103', isLab: false },
      { number: 'E104', isLab: false },
      { number: 'E105', isLab: false },
      { number: 'E106', isLab: false },
      { number: 'C101', isLab: true },
      { number: 'C102', isLab: true },
      { number: 'C103', isLab: true },
      { number: 'C104', isLab: true },
      { number: 'C105', isLab: true },
      { number: 'C106', isLab: true },
      { number: 'C107', isLab: true },
      { number: 'C108', isLab: true },
      { number: 'C110', isLab: true },
      { number: 'C111', isLab: true }
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
