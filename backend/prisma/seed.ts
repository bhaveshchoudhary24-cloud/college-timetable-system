import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateFacultyCodeFromName(rawName: string): string {
  let cleaned = rawName
    .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '')
    .trim();
  
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  let code = words.map(w => w[0].toUpperCase()).join('');
  return code || 'FAC';
}

function normalizeName(name: string): string {
  return name
    .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('Clearing database...');
  await prisma.timetableEntry.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.facultyAssignment.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.roomAvailability.deleteMany();
  await prisma.roomMapping.deleteMany();
  await prisma.teacherSubjectMaster.deleteMany();
  await prisma.teacherDepartment.deleteMany();
  await prisma.timeSlot.deleteMany();
  
  await prisma.batch.deleteMany();
  await prisma.division.deleteMany();
  await prisma.courseYear.deleteMany();
  await prisma.course.deleteMany();
  
  await prisma.subject.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log('Seeding Administrator Accounts...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Mmit@1234', salt);

  await prisma.user.create({
    data: {
      email: 'admin',
      name: 'Administrator',
      passwordHash: passwordHash,
      role: 'SUPER_ADMIN'
    }
  });

  await prisma.user.create({
    data: {
      email: 'admin@mmit.edu.in',
      name: 'Administrator',
      passwordHash: passwordHash,
      role: 'SUPER_ADMIN'
    }
  });

  console.log('Seeding 7 College Departments...');

  const deptDefs = [
    { name: 'Computer Engineering', code: 'CE' },
    { name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
    { name: 'Mechatronics Engineering', code: 'MTE' },
    { name: 'Mechanical Engineering', code: 'ME' },
    { name: 'Civil Engineering', code: 'CIVIL' },
    { name: 'Robotics and AI Engineering', code: 'RAI' },
    { name: 'Engineering Sciences (FE)', code: 'FE' }
  ];

  const depts: Record<string, any> = {};
  for (const def of deptDefs) {
    depts[def.name] = await prisma.department.create({ data: def });
  }

  // Primary CE Department reference for existing structural items
  const ceDept = depts['Computer Engineering'];

  const course = await prisma.course.create({
    data: { name: 'B.E. Computer Engineering', departmentId: ceDept.id }
  });
  
  const meCourse = await prisma.course.create({
    data: { name: 'M.E. Computer Engineering', departmentId: ceDept.id }
  });

  const yearSE = await prisma.courseYear.create({ data: { year: 2, courseId: course.id } });
  const yearTE = await prisma.courseYear.create({ data: { year: 3, courseId: course.id } });
  const yearBE = await prisma.courseYear.create({ data: { year: 4, courseId: course.id } });
  const yearME = await prisma.courseYear.create({ data: { year: 1, courseId: meCourse.id } });

  const divSEA = await prisma.division.create({ data: { name: 'A', yearId: yearSE.id, studentCount: 60 } });
  const divSEB = await prisma.division.create({ data: { name: 'B', yearId: yearSE.id, studentCount: 60 } });
  
  const divTEA = await prisma.division.create({ data: { name: 'A', yearId: yearTE.id, studentCount: 60 } });
  const divTEB = await prisma.division.create({ data: { name: 'B', yearId: yearTE.id, studentCount: 60 } });
  
  const divBEA = await prisma.division.create({ data: { name: 'A', yearId: yearBE.id, studentCount: 60 } });
  const divBEB = await prisma.division.create({ data: { name: 'B', yearId: yearBE.id, studentCount: 60 } });

  await prisma.division.create({ data: { name: 'ME-I', yearId: yearME.id, studentCount: 20 } });

  const createBatches = async (divId: string, prefix: string) => {
    return Promise.all(
      [1, 2, 3, 4].map(i => prisma.batch.create({ data: { name: `${prefix}${i}`, divisionId: divId, studentCount: 15 } }))
    );
  };

  await createBatches(divSEA.id, 'A');
  await createBatches(divSEB.id, 'B');
  await createBatches(divTEA.id, 'A');
  await createBatches(divTEB.id, 'B');
  await createBatches(divBEA.id, 'A');
  await createBatches(divBEB.id, 'B');

  console.log('Seeding Faculty Data across all 7 departments...');

  // Department-wise Faculty Raw Lists
  const departmentFacultyMap: Record<string, { name: string; code?: string }[]> = {
    'Computer Engineering': [
      { code: 'NBL', name: 'Prof. Nirmal B. L.' },
      { code: 'BS', name: 'Prof. Barangle Shraddha' },
      { code: 'PVD', name: 'Prof. P. V. Deshmukh' },
      { code: 'YVP', name: 'Dr. Y. V. Patil' },
      { code: 'SSC', name: 'Dr. S. S. Chaudhari' },
      { code: 'PBD', name: 'Dr. P. B. Dhamdhere' },
      { code: 'MYD', name: 'Dr. M. Y. Dangore' },
      { code: 'DBS', name: 'Prof. Dinesh Satre' },
      { code: 'DJB', name: 'Prof. Devyani Bonde' },
      { code: 'MSJ', name: 'Prof. M. S. Jagtap' },
      { code: 'YBD', name: 'Prof. Y. B. Dongare' },
      { code: 'SKP', name: 'Dr. S. K. Patil' },
      { code: 'MVK', name: 'Dr. M. V. Kadam' },
      { code: 'SGR', name: 'Dr. S. G. Rathod' },
      { code: 'MDS', name: 'Dr. M. D. Salunke' },
      { code: 'SAA', name: 'Prof. S. A. Agrawal' },
      { code: 'JPS', name: 'Dr. J. P. Shinde' },
      { code: 'UBK', name: 'Prof. U. B. Karanje' },
      { code: 'NS', name: 'Prof. Nutan Sarode' },
      { code: 'TSB', name: 'Prof. T. S. Bhoye' },
      { code: 'YPW', name: 'Prof. Y. P. Warke' },
      { code: 'SB', name: 'Prof. S. Bhakare' }
    ],
    'Mechanical Engineering': [
      { name: 'Dr. Anjali J. Joshi' },
      { name: 'Dr. Amol S. Bhange' },
      { name: 'Dr. Girish L. Allampallewar' },
      { name: 'Dr. Bhuvaneshwar D. Patil' },
      { name: 'Dr. Sachin V. Mutalikdesai' },
      { name: 'Dr. Dayanand P. Yesane' },
      { name: 'Mr. Eknath D. Kurhe' },
      { name: 'Mr. Sudhir S. More' },
      { name: 'Mr. Naresh B. Dhamane' },
      { name: 'Mr. Dhananjay M. Bhoge' },
      { name: 'Mr. Rohit P. Polas' },
      { name: 'Mr. Rajesh P. Dharmale' },
      { name: 'Mr. Martand P. Pandagale' },
      { name: 'Mr. Hrishikesh Gadekar' },
      { name: 'Mr. Pankaj S. Thombare' },
      { name: 'Mr. Sandeep L. Adsure' },
      { name: 'Mr. Naikrao J. Dandare' },
      { name: 'Mrs. Laxmi Pravin Shinde' }
    ],
    'Civil Engineering': [
      { name: 'Dr. Atul P. Khatri' },
      { name: 'Ms. Manisha D. Bhise' },
      { name: 'Mrs. Leena A. Deshmukh' },
      { name: 'Ms. Punam Bhimrao Kokate' },
      { name: 'Ms. Prajkta Dhananjay Shinde' },
      { name: 'Dr. Akshay Anil Thakare' },
      { name: 'Ms. Gayatri Chandrakant Sherkar' },
      { name: 'Kishor Balasaheb Narwade' },
      { name: 'Dr. Shubhangi Arun Kakade' },
      { name: 'Madan Prabhakar Pawar' },
      { name: 'Mr. Nikhil Gurav' },
      { name: 'Mr. Chaitanya Anantkumar Shetgar' },
      { name: 'Mr. Rohan Mohan Shinde' },
      { name: 'Mr. Ayan Asimkumar Sengupta' },
      { name: 'Mr. Pandurang Nemane' },
      { name: 'Mr. Hemant Bhalerao' },
      { name: 'Mr. Rahul D. Tapkir' },
      { name: 'Ms. Gayatri Kulkarni' }
    ],
    'Mechatronics Engineering': [
      { name: 'Dr. Sonali S. Patil' },
      { name: 'Dr. Meghana R. Yashwante' },
      { name: 'Dr. Yogini Dilip Borole' },
      { name: 'Dr. Jayashree Deka' },
      { name: 'Dr. Yogita Subhash Pimpale' },
      { name: 'Mayuri Sanjay Mhaske' },
      { name: 'Madhuri Pradip Shejal' },
      { name: 'Mr. Nilesh Chandrakant Dhobale' },
      { name: 'Mr. Akshay Ujjwal Padekar' },
      { name: 'Ms. Shital R. Khande' },
      { name: 'Mr. Vishal V. Kulkarni' },
      { name: 'Harshal Dattatray Vaidya' },
      { name: 'Mr. Sanket Ichharam Barde' },
      { name: 'Mrs. Pallavi Vivek Munde' },
      { name: 'Dr. Dattatraya Arun Jadhav' }
    ],
    'Robotics and AI Engineering': [
      { name: 'Dr. Amol S. Bhanage' },
      { name: 'Dr. Nilesh N. Satonkar' },
      { name: 'Mr. Nilesh C. Dhobale' },
      { name: 'Ms. Shilpa Namdeo Tambe' },
      { name: 'Mr. Atul S. Pradhan' },
      { name: 'Mr. Mohnesh D. Mandhre' }
    ],
    'Engineering Sciences (FE)': [
      { name: 'Dr. Umesh P. Moharil' },
      { name: 'Dr. Meghana R. Yashwante' },
      { name: 'Dr. Amita Pal' },
      { name: 'Dr. Anil G. Darekar' },
      { name: 'Dr. Pratibha S. Desai' },
      { name: 'Dr. Poonam Milind Nakhate' },
      { name: 'Dr. Chhaya Joshi' },
      { name: 'Ms. Manisha D. Bhise' },
      { name: 'Mr. Mukesh Sharma' },
      { name: 'Mrs. Vidya Nadkarni' },
      { name: 'Harshal Dattatray Vaidya' },
      { name: 'Mr. Rahul Balaso Mali' },
      { name: 'Mr. Pankaj Shyamnarayan Gaur' },
      { name: 'Mr. Sanket Ichharam Barde' },
      { name: 'Mr. Tukaram Vinayakrao Patil' },
      { name: 'Mrs. Laxmi Pravin Shinde' },
      { name: 'Kulkarni Gayatri Shridhar' },
      { name: 'Aishwarya Dattatray Pawar' },
      { name: 'Mrs. Pallavi Vivek Munde' }
    ],
    'Artificial Intelligence & Data Science': [
      { name: 'Dr. Jyoti Yogesh Deshmukh' },
      { name: 'Dr. Gaikwad Kiran Pandhari' },
      { name: 'Dr. Shrikant Dnyaneshwar Dhamdhere' },
      { name: 'Dr. Vandana Vinayak Navale' },
      { name: 'Mr. Nisar S. Shaikh' },
      { name: 'Mrs. Rucha A. Agrawal' },
      { name: 'Mr. Swapnil M. Gagare' },
      { name: 'Mrs. Aparna Lahane' },
      { name: 'Mrs. Savitri Prashant Mane' },
      { name: 'Mrs. Pallavi R. Gulve' },
      { name: 'Mrs. Vanshika Bravish Bawaney' },
      { name: 'Mrs. Neha Verma' },
      { name: 'Deepika Dave' },
      { name: 'Khushbu Trivedi' },
      { name: 'Ms. Swati Bagade' },
      { name: 'Manisha Dinkar Wasnik' },
      { name: 'Nayan Vitthal Asane' },
      { name: 'Hemangi Dhiraj Patil' },
      { name: 'Mrs. Snehal Sandeep Thorave' }
    ]
  };

  // Registry for person deduplication and unique code conflict handling
  const personMap: Record<string, any> = {}; // normalizedName -> Teacher Record
  const usedCodes = new Set<string>();

  for (const [deptName, facultyList] of Object.entries(departmentFacultyMap)) {
    const deptObj = depts[deptName];
    if (!deptObj) continue;

    for (const item of facultyList) {
      const normKey = normalizeName(item.name);
      
      // Check if person already created (cross-department faculty)
      let teacher = personMap[normKey];

      if (!teacher) {
        // Generate unique initials code
        let baseCode = item.code || generateFacultyCodeFromName(item.name);
        let finalCode = baseCode;
        let suffix = 2;
        while (usedCodes.has(finalCode)) {
          finalCode = `${baseCode}${suffix}`;
          suffix++;
        }
        usedCodes.add(finalCode);

        // Generate email
        const cleanEmailStr = finalCode.toLowerCase();
        const email = `${cleanEmailStr}.${normKey.substring(0, 6)}@mmit.edu.in`;

        teacher = await prisma.teacher.create({
          data: {
            employeeId: finalCode,
            name: item.name,
            email: email,
            departmentId: deptObj.id,
            designation: 'Faculty',
            maxWeeklyHours: 40
          }
        });

        personMap[normKey] = teacher;
      }

      // Add to TeacherDepartment join table for multi-department association
      await prisma.teacherDepartment.upsert({
        where: {
          teacherId_departmentId: {
            teacherId: teacher.id,
            departmentId: deptObj.id
          }
        },
        create: {
          teacherId: teacher.id,
          departmentId: deptObj.id
        },
        update: {}
      });
    }
  }

  // Add Rooms (Exactly 4 Classrooms and 9 Laboratories)
  const roomsList = ['E101', 'E102', 'E103', 'E104'];
  const labsList = ['C101', 'C102', 'C103', 'C104', 'C105', 'C106', 'C108', 'C110', 'C111'];

  for (const r of roomsList) {
    await prisma.room.create({ data: { roomNumber: r, capacity: 60, isLab: false, departmentId: ceDept.id } });
  }
  for (const l of labsList) {
    await prisma.room.create({ data: { roomNumber: l, capacity: 20, isLab: true, departmentId: ceDept.id } });
  }

  // Add Subjects for CE
  const subjectsList = [
    { code: 'DS', name: 'Data Structures', sem: 3, cred: 3 },
    { code: 'OOPCG', name: 'OOP and Computer Graphics', sem: 3, cred: 3 },
    { code: 'OS', name: 'Operating System', sem: 3, cred: 3 },
    { code: 'DSL', name: 'Data Structures Laboratory', sem: 3, cred: 0, isLab: true },
    { code: 'OOPCGL', name: 'OOPCG Laboratory', sem: 3, cred: 0, isLab: true },
    { code: 'AI', name: 'Artificial Intelligence', sem: 5, cred: 3 },
    { code: 'CN', name: 'Computer Networks', sem: 5, cred: 3 },
    { code: 'TOC', name: 'Theory of Computation', sem: 5, cred: 3 },
    { code: 'DAA', name: 'Design and Analysis of Algorithms', sem: 7, cred: 3 },
    { code: 'ML', name: 'Machine Learning', sem: 7, cred: 3 }
  ];

  for (const s of subjectsList) {
    await prisma.subject.create({
      data: { code: s.code, name: s.name, semester: s.sem, credits: s.cred, departmentId: ceDept.id, labRequired: s.isLab || false }
    });
  }

  // Standard Time Slots
  const slotsData = [
    { index: 1, startTime: '08:30', endTime: '09:30' },
    { index: 2, startTime: '09:30', endTime: '10:30' },
    { index: 4, startTime: '10:45', endTime: '11:45' },
    { index: 5, startTime: '11:45', endTime: '12:45' },
    { index: 7, startTime: '13:30', endTime: '14:30' },
    { index: 8, startTime: '14:30', endTime: '15:30' },
  ];
  for (const s of slotsData) await prisma.timeSlot.create({ data: s });

  console.log('Database successfully seeded with 7 College Departments and Faculty Master Data!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
