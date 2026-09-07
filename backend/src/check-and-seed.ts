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
  } catch (error) {
    console.error('[Startup] Warning: Check-and-seed encountered an issue:', error);
    // Don't crash the server start process
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();
