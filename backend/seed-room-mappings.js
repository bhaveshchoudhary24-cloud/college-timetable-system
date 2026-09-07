const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const theoryMapping = [
  { div: 'SE-A', room: 'E101' },
  { div: 'SE-B', room: 'E104' },
  { div: 'TE-A', room: 'E102' },
  { div: 'TE-B', room: 'E103' },
  { div: 'BE-A', rooms: ['E101', 'E102', 'E103', 'E104'] },
  { div: 'BE-B', rooms: ['E101', 'E102', 'E103', 'E104'] },
];

const practicalMapping = [
  // SE-A
  { subject: 'Data Structures Laboratory', batch: 'A1', rooms: ['C108', 'C101'] },
  { subject: 'Data Structures Laboratory', batch: 'A2', rooms: ['C108', 'C101'] },
  { subject: 'Data Structures Laboratory', batch: 'A3', rooms: ['C101', 'C108'] },
  { subject: 'Data Structures Laboratory', batch: 'A4', rooms: ['C101'] },
  
  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'A1', rooms: ['C104'] },
  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'A2', rooms: ['C104'] },
  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'A3', rooms: ['C104'] },
  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'A4', rooms: ['C104'] },
  
  { subject: 'Entrepreneurship Development', batch: 'A1', rooms: ['C102', 'E101'] },
  { subject: 'Entrepreneurship Development', batch: 'A2', rooms: ['C102', 'E101'] },
  { subject: 'Entrepreneurship Development', batch: 'A3', rooms: ['C111', 'E101'] },
  { subject: 'Entrepreneurship Development', batch: 'A4', rooms: ['C111', 'E101'] },
  
  { subject: 'Community Engagement Project', batch: 'A1', rooms: ['C105'] },
  { subject: 'Community Engagement Project', batch: 'A2', rooms: ['C105'] },
  { subject: 'Community Engagement Project', batch: 'A3', rooms: ['C105'] },
  { subject: 'Community Engagement Project', batch: 'A4', rooms: ['C105'] },

  // SE-B
  { subject: 'Data Structures Laboratory', batch: 'B1', rooms: ['C108', 'C102'] },
  { subject: 'Data Structures Laboratory', batch: 'B2', rooms: ['C102', 'C108'] },
  { subject: 'Data Structures Laboratory', batch: 'B3', rooms: ['C108', 'C102'] },
  { subject: 'Data Structures Laboratory', batch: 'B4', rooms: ['C102', 'C108'] },

  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'B1', rooms: ['C104'] },
  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'B2', rooms: ['C104'] },
  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'B3', rooms: ['C104'] },
  { subject: 'Object Oriented Programming and Computer Graphics Laboratory', batch: 'B4', rooms: ['C104'] },

  { subject: 'Entrepreneurship Development', batch: 'B1', rooms: ['E101', 'C102'] },
  { subject: 'Entrepreneurship Development', batch: 'B2', rooms: ['C102', 'E101'] },
  { subject: 'Entrepreneurship Development', batch: 'B3', rooms: ['E101', 'C111'] },
  { subject: 'Entrepreneurship Development', batch: 'B4', rooms: ['C111', 'E101'] },

  { subject: 'Community Engagement Project', batch: 'B1', rooms: ['C106'] },
  { subject: 'Community Engagement Project', batch: 'B2', rooms: ['C106'] },
  { subject: 'Community Engagement Project', batch: 'B3', rooms: ['C106'] },
  { subject: 'Community Engagement Project', batch: 'B4', rooms: ['C106'] },

  // TE-A
  { subject: 'Artificial Intelligence Lab', batch: 'A1', rooms: ['C105'] },
  { subject: 'Artificial Intelligence Lab', batch: 'A2', rooms: ['C105'] },
  { subject: 'Artificial Intelligence Lab', batch: 'A3', rooms: ['C105'] },
  { subject: 'Artificial Intelligence Lab', batch: 'A4', rooms: ['C105'] },

  { subject: 'Computer Networks Lab', batch: 'A1', rooms: ['C101'] },
  { subject: 'Computer Networks Lab', batch: 'A2', rooms: ['C102', 'C101'] },
  { subject: 'Computer Networks Lab', batch: 'A3', rooms: ['C101', 'C102'] },
  { subject: 'Computer Networks Lab', batch: 'A4', rooms: ['C101'] },

  { subject: 'Elective-I Lab', batch: 'A1', rooms: ['C108'] },
  { subject: 'Elective-I Lab', batch: 'A2', rooms: ['C108'] },
  { subject: 'Elective-I Lab', batch: 'A3', rooms: ['C108'] },
  { subject: 'Elective-I Lab', batch: 'A4', rooms: ['C108'] },

  { subject: 'Robotics and Automation', batch: 'A1', rooms: ['C103', 'E102'] },
  { subject: 'Robotics and Automation', batch: 'A2', rooms: ['C103', 'E102'] },
  { subject: 'Robotics and Automation', batch: 'A3', rooms: ['C104', 'C108', 'E102'] },
  { subject: 'Robotics and Automation', batch: 'A4', rooms: ['C104', 'E102'] },

  { subject: 'Technical Seminar', batch: 'A1', rooms: ['C103'] },
  { subject: 'Technical Seminar', batch: 'A2', rooms: ['C105'] },
  { subject: 'Technical Seminar', batch: 'A3', rooms: ['C106'] },
  { subject: 'Technical Seminar', batch: 'A4', rooms: ['C101'] },

  // TE-B
  { subject: 'Artificial Intelligence Lab', batch: 'B1', rooms: ['C110'] },
  { subject: 'Artificial Intelligence Lab', batch: 'B2', rooms: ['C110'] },
  { subject: 'Artificial Intelligence Lab', batch: 'B3', rooms: ['C110'] },
  { subject: 'Artificial Intelligence Lab', batch: 'B4', rooms: ['C110'] },

  { subject: 'Computer Networks Lab', batch: 'B1', rooms: ['C103', 'C102'] },
  { subject: 'Computer Networks Lab', batch: 'B2', rooms: ['C103', 'C102'] },
  { subject: 'Computer Networks Lab', batch: 'B3', rooms: ['C101', 'C103'] },
  { subject: 'Computer Networks Lab', batch: 'B4', rooms: ['C103', 'C101'] },

  { subject: 'Elective-I Lab', batch: 'B1', rooms: ['C106'] },
  { subject: 'Elective-I Lab', batch: 'B2', rooms: ['C106'] },
  { subject: 'Elective-I Lab', batch: 'B3', rooms: ['C106'] },
  { subject: 'Elective-I Lab', batch: 'B4', rooms: ['C106'] },

  { subject: 'Robotics and Automation', batch: 'B1', rooms: ['E103', 'C103'] },
  { subject: 'Robotics and Automation', batch: 'B2', rooms: ['C103', 'E103'] },
  { subject: 'Robotics and Automation', batch: 'B3', rooms: ['E103', 'C104'] },
  { subject: 'Robotics and Automation', batch: 'B4', rooms: ['C106', 'E103'] },

  { subject: 'Technical Seminar', batch: 'B1', rooms: ['C103'] },
  { subject: 'Technical Seminar', batch: 'B2', rooms: ['C102', 'C105'] },
  { subject: 'Technical Seminar', batch: 'B3', rooms: ['C103', 'C106'] },
  { subject: 'Technical Seminar', batch: 'B4', rooms: ['C101'] },

  // BE-A
  { subject: 'Laboratory Practice III', batch: 'A1', rooms: ['C102', 'C104'] },
  { subject: 'Laboratory Practice III', batch: 'A2', rooms: ['C104'] },
  { subject: 'Laboratory Practice III', batch: 'A3', rooms: ['C110', 'C102', 'C111'] },
  { subject: 'Laboratory Practice III', batch: 'A4', rooms: ['C110'] },

  { subject: 'Laboratory Practice IV', batch: 'A1', rooms: ['C105'] },
  { subject: 'Laboratory Practice IV', batch: 'A2', rooms: ['C105'] },
  { subject: 'Laboratory Practice IV', batch: 'A3', rooms: ['C108'] },
  { subject: 'Laboratory Practice IV', batch: 'A4', rooms: ['C104'] },

  // BE-B
  { subject: 'Laboratory Practice III', batch: 'B1', rooms: ['C104', 'C103', 'C108'] },
  { subject: 'Laboratory Practice III', batch: 'B2', rooms: ['C110'] },
  { subject: 'Laboratory Practice III', batch: 'B3', rooms: ['C111', 'C110'] },
  { subject: 'Laboratory Practice III', batch: 'B4', rooms: ['C110'] },

  { subject: 'Laboratory Practice IV', batch: 'B1', rooms: ['C105'] },
  { subject: 'Laboratory Practice IV', batch: 'B2', rooms: ['C108'] },
  { subject: 'Laboratory Practice IV', batch: 'B3', rooms: ['C111'] },
  { subject: 'Laboratory Practice IV', batch: 'B4', rooms: ['C104'] },
];

async function main() {
  console.log('Clearing old mappings...');
  await prisma.roomMapping.deleteMany({});
  
  const allRooms = await prisma.room.findMany();
  const roomMap = {};
  allRooms.forEach(r => roomMap[r.roomNumber] = r);
  
  const ensureRoom = async (roomNumber, isLab) => {
    if (!roomMap[roomNumber]) {
        console.log(`Creating missing room: ${roomNumber}`);
        const dept = await prisma.department.findFirst();
        roomMap[roomNumber] = await prisma.room.create({
            data: {
                roomNumber,
                isLab,
                capacity: isLab ? 20 : 60,
                departmentId: dept.id
            }
        });
    }
    return roomMap[roomNumber];
  };

  const divisions = await prisma.division.findMany({ include: { year: true, batches: true } });
  const divMap = {};
  divisions.forEach(d => {
     const yearStr = d.year.year === 2 ? 'SE' : (d.year.year === 3 ? 'TE' : 'BE');
     divMap[`${yearStr}-${d.name}`] = d;
  });

  const subjects = await prisma.subject.findMany();
  const subMap = {};
  subjects.forEach(s => subMap[s.name] = s);

  console.log('Seeding theory mappings...');
  for (const t of theoryMapping) {
      const div = divMap[t.div];
      if (!div) { console.error(`Division ${t.div} not found`); continue; }
      
      const rNames = t.room ? [t.room] : t.rooms;
      for (const rName of rNames) {
          const room = await ensureRoom(rName, false);
          await prisma.roomMapping.create({
              data: {
                  type: 'THEORY',
                  divisionId: div.id,
                  roomId: room.id
              }
          });
      }
  }

  console.log('Seeding practical mappings...');
  for (const p of practicalMapping) {
      const subject = subMap[p.subject];
      if (!subject) { console.error(`Subject ${p.subject} not found`); continue; }

      // Find the batch object
      let targetBatch = null;
      for (const d of divisions) {
          const b = d.batches.find(bx => bx.name === p.batch);
          if (b) {
              targetBatch = b;
              break;
          }
      }
      
      if (!targetBatch) { console.error(`Batch ${p.batch} not found`); continue; }

      for (const rName of p.rooms) {
          const room = await ensureRoom(rName, rName.startsWith('C'));
          await prisma.roomMapping.create({
              data: {
                  type: 'PRACTICAL',
                  subjectId: subject.id,
                  batchId: targetBatch.id,
                  roomId: room.id
              }
          });
      }
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
