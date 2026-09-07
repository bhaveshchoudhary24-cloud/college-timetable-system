import { PrismaClient } from '@prisma/client';
import { generateFacultyCode } from './utils/facultyCode';

const prisma = new PrismaClient();

interface MasterRecord {
  srNo: number;
  facultyName: string;
  className: string;
  divisionName: string;
  batchName: string;
  location: string;
  courseCode: string;
  courseName: string;
  theory: number;
  practical: number;
  tutorial: number;
  project: number;
  total: number;
  allowedLocationsList: { batch: string; roomNumber: string; isPreferred?: boolean }[];
}

const MASTER_DATA: MasterRecord[] = [
  // 1. Dr. S. G. Rathod (HoD)
  {
    srNo: 1,
    facultyName: 'Dr. S. G. Rathod (HoD)',
    className: 'SE',
    divisionName: 'A',
    batchName: 'A1,A4',
    location: 'C105',
    courseCode: 'CEF-260-COM',
    courseName: 'Community Engagement Project',
    theory: 0, practical: 6, tutorial: 0, project: 0, total: 6,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C105', isPreferred: true },
      { batch: 'A4', roomNumber: 'C105', isPreferred: true }
    ]
  },
  {
    srNo: 1,
    facultyName: 'Dr. S. G. Rathod (HoD)',
    className: 'TE',
    divisionName: 'A',
    batchName: '-',
    location: 'E102',
    courseCode: 'PEC321COM',
    courseName: 'Elective I',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E102', isPreferred: true }]
  },
  {
    srNo: 1,
    facultyName: 'Dr. S. G. Rathod (HoD)',
    className: 'ME-I',
    divisionName: '-',
    batchName: '-',
    location: 'E101',
    courseCode: 'PCC-501-COM',
    courseName: 'Probability and Statistics',
    theory: 4, practical: 0, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },

  // 2. Dr. S. S. Chaudhari (TPC)
  {
    srNo: 2,
    facultyName: 'Dr. S. S. Chaudhari (TPC)',
    className: 'TE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E102/E103',
    courseCode: 'OLE341COM',
    courseName: 'Open Elective',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [
      { batch: 'TE-A', roomNumber: 'E102', isPreferred: true },
      { batch: 'TE-B', roomNumber: 'E103', isPreferred: false }
    ]
  },
  {
    srNo: 2,
    facultyName: 'Dr. S. S. Chaudhari (TPC)',
    className: 'TE',
    divisionName: 'B',
    batchName: 'B3',
    location: 'C103',
    courseCode: 'ELC342COM',
    courseName: 'Technical Seminar',
    theory: 0, practical: 0, tutorial: 2, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'B3', roomNumber: 'C103', isPreferred: true }]
  },
  {
    srNo: 2,
    facultyName: 'Dr. S. S. Chaudhari (TPC)',
    className: 'BE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E101/E102',
    courseCode: '410245(D)',
    courseName: 'Elective IV',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [
      { batch: 'BE-A', roomNumber: 'E101', isPreferred: true },
      { batch: 'BE-B', roomNumber: 'E102', isPreferred: false }
    ]
  },
  {
    srNo: 2,
    facultyName: 'Dr. S. S. Chaudhari (TPC)',
    className: 'BE',
    divisionName: 'A&B',
    batchName: 'A1,B2',
    location: 'C105/C102',
    courseCode: '410247',
    courseName: 'Laboratory Practice IV',
    theory: 0, practical: 4, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C105', isPreferred: true },
      { batch: 'B2', roomNumber: 'C102', isPreferred: true }
    ]
  },
  {
    srNo: 2,
    facultyName: 'Dr. S. S. Chaudhari (TPC)',
    className: 'ME-I',
    divisionName: '-',
    batchName: '-',
    location: 'E101',
    courseCode: 'PCC-503-COM',
    courseName: 'Machine Learning',
    theory: 4, practical: 0, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },

  // 3. Dr. S. K. Patil
  {
    srNo: 3,
    facultyName: 'Dr. S. K. Patil',
    className: 'SE',
    divisionName: 'A&B',
    batchName: 'A1,A2,A3,A4',
    location: 'C108/C101/C102',
    courseCode: 'PCC-204-COM',
    courseName: 'Data Structures Laboratory',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C108', isPreferred: false },
      { batch: 'A1', roomNumber: 'C101', isPreferred: true },
      { batch: 'A2', roomNumber: 'C108', isPreferred: false },
      { batch: 'A2', roomNumber: 'C101', isPreferred: true },
      { batch: 'A3', roomNumber: 'C101', isPreferred: true },
      { batch: 'A3', roomNumber: 'C108', isPreferred: false },
      { batch: 'A4', roomNumber: 'C101', isPreferred: true } // A4 C101 ONLY
    ]
  },
  {
    srNo: 3,
    facultyName: 'Dr. S. K. Patil',
    className: 'TE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E102/E103',
    courseCode: 'PCC303COM',
    courseName: 'Theory of Computation',
    theory: 6, practical: 0, tutorial: 0, project: 0, total: 6,
    allowedLocationsList: [
      { batch: 'TE-A', roomNumber: 'E102', isPreferred: true },
      { batch: 'TE-B', roomNumber: 'E103', isPreferred: true }
    ]
  },
  {
    srNo: 3,
    facultyName: 'Dr. S. K. Patil',
    className: 'ME-I',
    divisionName: '-',
    batchName: '-',
    location: 'E101',
    courseCode: 'PCC-504-COM',
    courseName: 'Distributed Computing',
    theory: 4, practical: 0, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },

  // 4. Dr. M. V. Kadam
  {
    srNo: 4,
    facultyName: 'Dr. M. V. Kadam',
    className: 'SE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: 'OEL-220-COM',
    courseName: 'Open Elective 1',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 4,
    facultyName: 'Dr. M. V. Kadam',
    className: 'SE',
    divisionName: 'A&B',
    batchName: 'A1,A2,B1,B2',
    location: 'C102/C111/E101',
    courseCode: 'EEM-240-COM',
    courseName: 'Entrepreneurship Development',
    theory: 0, practical: 8, tutorial: 4, project: 0, total: 12,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C102', isPreferred: true },
      { batch: 'A1', roomNumber: 'E101', isPreferred: false },
      { batch: 'A2', roomNumber: 'C102', isPreferred: true },
      { batch: 'A2', roomNumber: 'E101', isPreferred: false },
      { batch: 'B1', roomNumber: 'C111', isPreferred: true },
      { batch: 'B1', roomNumber: 'E101', isPreferred: false },
      { batch: 'B2', roomNumber: 'C102', isPreferred: true },
      { batch: 'B2', roomNumber: 'E101', isPreferred: false }
    ]
  },
  {
    srNo: 4,
    facultyName: 'Dr. M. V. Kadam',
    className: 'BE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: '410241',
    courseName: 'Design and Analysis of Algorithms',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },

  // 5. Dr. Y. V. Patil
  {
    srNo: 5,
    facultyName: 'Dr. Y. V. Patil',
    className: 'SE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: 'VEC-250-COM',
    courseName: 'Universal Human Values and Professional Ethics',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 5,
    facultyName: 'Dr. Y. V. Patil',
    className: 'BE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E101/E102',
    courseCode: '410244(D)',
    courseName: 'Elective III',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [
      { batch: 'BE-A', roomNumber: 'E101', isPreferred: true },
      { batch: 'BE-B', roomNumber: 'E102', isPreferred: false }
    ]
  },
  {
    srNo: 5,
    facultyName: 'Dr. Y. V. Patil',
    className: 'BE',
    divisionName: 'A&B',
    batchName: 'A2,A3,B1,B4',
    location: 'C104/C110',
    courseCode: '410247',
    courseName: 'Laboratory Practice IV',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A2', roomNumber: 'C105', isPreferred: true },
      { batch: 'A3', roomNumber: 'C108', isPreferred: true },
      { batch: 'B1', roomNumber: 'C104', isPreferred: true },
      { batch: 'B4', roomNumber: 'C104', isPreferred: true }
    ]
  },
  {
    srNo: 5,
    facultyName: 'Dr. Y. V. Patil',
    className: 'SE',
    divisionName: 'A',
    batchName: 'A2,A3',
    location: 'C105',
    courseCode: 'CEF-260-COM',
    courseName: 'Community Engagement Project',
    theory: 0, practical: 4, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [
      { batch: 'A2', roomNumber: 'C105', isPreferred: true },
      { batch: 'A3', roomNumber: 'C105', isPreferred: true }
    ]
  },

  // 6. Dr. M. Y. Dangore
  {
    srNo: 6,
    facultyName: 'Dr. M. Y. Dangore',
    className: 'SE',
    divisionName: 'B',
    batchName: '-',
    location: 'E104',
    courseCode: 'PCC-203-COM',
    courseName: 'Operating Systems',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E104', isPreferred: true }]
  },
  {
    srNo: 6,
    facultyName: 'Dr. M. Y. Dangore',
    className: 'BE',
    divisionName: 'A&B',
    batchName: 'A1,A2,A3,B1',
    location: 'C102/C104/C110/C103',
    courseCode: '410246',
    courseName: 'Laboratory Practice III',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C102', isPreferred: true },
      { batch: 'A1', roomNumber: 'C104', isPreferred: false },
      { batch: 'A2', roomNumber: 'C104', isPreferred: true },
      { batch: 'A3', roomNumber: 'C110', isPreferred: true },
      { batch: 'A3', roomNumber: 'C102', isPreferred: false },
      { batch: 'A3', roomNumber: 'C111', isPreferred: false },
      { batch: 'B1', roomNumber: 'C104', isPreferred: true },
      { batch: 'B1', roomNumber: 'C103', isPreferred: false },
      { batch: 'B1', roomNumber: 'C108', isPreferred: false }
    ]
  },
  {
    srNo: 6,
    facultyName: 'Dr. M. Y. Dangore',
    className: 'BE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: '410242',
    courseName: 'Machine Learning',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 6,
    facultyName: 'Dr. M. Y. Dangore',
    className: 'ME-I',
    divisionName: '-',
    batchName: '-',
    location: 'E101',
    courseCode: 'PCC-502-COM',
    courseName: 'Advanced Algorithms',
    theory: 4, practical: 0, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },

  // 7. Dr. P. B. Dhamdhere
  {
    srNo: 7,
    facultyName: 'Dr. P. B. Dhamdhere',
    className: 'TE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E102/E103',
    courseCode: 'PEC321COM',
    courseName: 'Elective I',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [
      { batch: 'TE-A', roomNumber: 'E102', isPreferred: true },
      { batch: 'TE-B', roomNumber: 'E103', isPreferred: false }
    ]
  },
  {
    srNo: 7,
    facultyName: 'Dr. P. B. Dhamdhere',
    className: 'TE',
    divisionName: 'B',
    batchName: 'B1,B2,B3,B4',
    location: 'C106',
    courseCode: 'PEC322COM',
    courseName: 'Elective I Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C106', isPreferred: true },
      { batch: 'B2', roomNumber: 'C106', isPreferred: true },
      { batch: 'B3', roomNumber: 'C106', isPreferred: true },
      { batch: 'B4', roomNumber: 'C106', isPreferred: true }
    ]
  },
  {
    srNo: 7,
    facultyName: 'Dr. P. B. Dhamdhere',
    className: 'BE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E101/E102',
    courseCode: '410245(C)',
    courseName: 'Elective IV',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [
      { batch: 'BE-A', roomNumber: 'E101', isPreferred: true },
      { batch: 'BE-B', roomNumber: 'E102', isPreferred: false }
    ]
  },
  {
    srNo: 7,
    facultyName: 'Dr. P. B. Dhamdhere',
    className: 'BE',
    divisionName: 'A&B',
    batchName: 'A4,B3',
    location: 'C104/C111',
    courseCode: '410247',
    courseName: 'Laboratory Practice IV',
    theory: 0, practical: 4, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [
      { batch: 'A4', roomNumber: 'C104', isPreferred: true },
      { batch: 'B3', roomNumber: 'C111', isPreferred: true }
    ]
  },

  // 8. Prof. D. B. Satre
  {
    srNo: 8,
    facultyName: 'Prof. D. B. Satre',
    className: 'SE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: 'PCC-201-COMP',
    courseName: 'Data Structures',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 8,
    facultyName: 'Prof. D. B. Satre',
    className: 'SE',
    divisionName: 'A',
    batchName: 'A1,A2,A3,A4',
    location: 'C108/C101',
    courseCode: 'PCC-204-COM',
    courseName: 'Data Structures Laboratory',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C101', isPreferred: true },
      { batch: 'A1', roomNumber: 'C108', isPreferred: false },
      { batch: 'A2', roomNumber: 'C101', isPreferred: true },
      { batch: 'A2', roomNumber: 'C108', isPreferred: false },
      { batch: 'A3', roomNumber: 'C101', isPreferred: true },
      { batch: 'A3', roomNumber: 'C108', isPreferred: false },
      { batch: 'A4', roomNumber: 'C101', isPreferred: true } // C101 ONLY for A4
    ]
  },
  {
    srNo: 8,
    facultyName: 'Prof. D. B. Satre',
    className: 'BE',
    divisionName: 'A&B',
    batchName: 'A2,A4,B3',
    location: 'C104/C110/C111',
    courseCode: '410246',
    courseName: 'Laboratory Practice III',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A2', roomNumber: 'C104', isPreferred: true },
      { batch: 'A4', roomNumber: 'C110', isPreferred: true },
      { batch: 'B3', roomNumber: 'C111', isPreferred: true },
      { batch: 'B3', roomNumber: 'C110', isPreferred: false }
    ]
  },

  // 9. Prof. D. J. Bonde
  {
    srNo: 9,
    facultyName: 'Prof. D. J. Bonde',
    className: 'SE',
    divisionName: 'B',
    batchName: '-',
    location: 'E104',
    courseCode: 'PCC-201-COMP',
    courseName: 'Data Structures',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E104', isPreferred: true }]
  },
  {
    srNo: 9,
    facultyName: 'Prof. D. J. Bonde',
    className: 'SE',
    divisionName: 'B',
    batchName: 'B1,B2,B3,B4',
    location: 'C108/C102',
    courseCode: 'PCC-204-COM',
    courseName: 'Data Structures Laboratory',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C108', isPreferred: true },
      { batch: 'B1', roomNumber: 'C102', isPreferred: false },
      { batch: 'B2', roomNumber: 'C102', isPreferred: true },
      { batch: 'B2', roomNumber: 'C108', isPreferred: false },
      { batch: 'B3', roomNumber: 'C108', isPreferred: true },
      { batch: 'B3', roomNumber: 'C102', isPreferred: false },
      { batch: 'B4', roomNumber: 'C102', isPreferred: true },
      { batch: 'B4', roomNumber: 'C108', isPreferred: false }
    ]
  },
  {
    srNo: 9,
    facultyName: 'Prof. D. J. Bonde',
    className: 'BE',
    divisionName: 'A&B',
    batchName: 'A1,A3,A4,B2',
    location: 'C102/C110',
    courseCode: '410246',
    courseName: 'Laboratory Practice III',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C102', isPreferred: true },
      { batch: 'A1', roomNumber: 'C104', isPreferred: false },
      { batch: 'A3', roomNumber: 'C110', isPreferred: true },
      { batch: 'A3', roomNumber: 'C102', isPreferred: false },
      { batch: 'A3', roomNumber: 'C111', isPreferred: false },
      { batch: 'A4', roomNumber: 'C110', isPreferred: true },
      { batch: 'B2', roomNumber: 'C110', isPreferred: true }
    ]
  },

  // 10. Prof. S. A. Agrawal
  {
    srNo: 10,
    facultyName: 'Prof. S. A. Agrawal',
    className: 'SE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: 'MDM-230-COM',
    courseName: 'Digital Electronics and Logic Design',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 10,
    facultyName: 'Prof. S. A. Agrawal',
    className: 'SE',
    divisionName: 'B',
    batchName: 'B1,B2,B3,B4',
    location: 'C106',
    courseCode: 'CEF-260-COM',
    courseName: 'Community Engagement Project',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C106', isPreferred: true },
      { batch: 'B2', roomNumber: 'C106', isPreferred: true },
      { batch: 'B3', roomNumber: 'C106', isPreferred: true },
      { batch: 'B4', roomNumber: 'C106', isPreferred: true }
    ]
  },
  {
    srNo: 10,
    facultyName: 'Prof. S. A. Agrawal',
    className: 'TE',
    divisionName: 'A&B',
    batchName: 'A1,A3,A4,B4',
    location: 'C101/C102/C103',
    courseCode: 'PCC305COM',
    courseName: 'Computer Networks Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C101', isPreferred: true },
      { batch: 'A3', roomNumber: 'C102', isPreferred: true },
      { batch: 'A3', roomNumber: 'C101', isPreferred: false },
      { batch: 'A4', roomNumber: 'C101', isPreferred: true },
      { batch: 'B4', roomNumber: 'C103', isPreferred: true },
      { batch: 'B4', roomNumber: 'C101', isPreferred: false }
    ]
  },

  // 11. Prof. T. S. Bhoye
  {
    srNo: 11,
    facultyName: 'Prof. T. S. Bhoye',
    className: 'TE',
    divisionName: 'B',
    batchName: '-',
    location: 'E103',
    courseCode: 'PCC302COM',
    courseName: 'Computer Networks',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E103', isPreferred: true }]
  },
  {
    srNo: 11,
    facultyName: 'Prof. T. S. Bhoye',
    className: 'TE',
    divisionName: 'B',
    batchName: 'B1,B2,B3,B4',
    location: 'C103/C102/C101',
    courseCode: 'PCC305COM',
    courseName: 'Computer Networks Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C103', isPreferred: true },
      { batch: 'B1', roomNumber: 'C102', isPreferred: false },
      { batch: 'B2', roomNumber: 'C103', isPreferred: true },
      { batch: 'B2', roomNumber: 'C102', isPreferred: false },
      { batch: 'B3', roomNumber: 'C101', isPreferred: true },
      { batch: 'B3', roomNumber: 'C103', isPreferred: false },
      { batch: 'B4', roomNumber: 'C103', isPreferred: true },
      { batch: 'B4', roomNumber: 'C101', isPreferred: false }
    ]
  },
  {
    srNo: 11,
    facultyName: 'Prof. T. S. Bhoye',
    className: 'TE',
    divisionName: 'A&B',
    batchName: 'A1,B1',
    location: 'C103/E101',
    courseCode: 'ELC342COM',
    courseName: 'Technical Seminar',
    theory: 0, practical: 0, tutorial: 4, project: 0, total: 4,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C103', isPreferred: true },
      { batch: 'B1', roomNumber: 'C103', isPreferred: true }
    ]
  },

  // 12. Prof. P. V. Deshmukh
  {
    srNo: 12,
    facultyName: 'Prof. P. V. Deshmukh',
    className: 'SE',
    divisionName: 'A&B',
    batchName: 'A3,A4,B3,B4',
    location: 'C111/C102',
    courseCode: 'EEM-240-COM',
    courseName: 'Entrepreneurship Development',
    theory: 0, practical: 8, tutorial: 4, project: 0, total: 12,
    allowedLocationsList: [
      { batch: 'A3', roomNumber: 'C111', isPreferred: true },
      { batch: 'A3', roomNumber: 'E101', isPreferred: false },
      { batch: 'A4', roomNumber: 'C111', isPreferred: true },
      { batch: 'A4', roomNumber: 'E101', isPreferred: false },
      { batch: 'B3', roomNumber: 'C111', isPreferred: true },
      { batch: 'B3', roomNumber: 'E101', isPreferred: false },
      { batch: 'B4', roomNumber: 'C111', isPreferred: true },
      { batch: 'B4', roomNumber: 'E101', isPreferred: false }
    ]
  },
  {
    srNo: 12,
    facultyName: 'Prof. P. V. Deshmukh',
    className: 'SE',
    divisionName: 'B',
    batchName: '-',
    location: 'E104',
    courseCode: 'VEC-250-COM',
    courseName: 'Universal Human Values and Professional Ethics',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E104', isPreferred: true }]
  },
  {
    srNo: 12,
    facultyName: 'Prof. P. V. Deshmukh',
    className: 'BE',
    divisionName: 'B',
    batchName: '-',
    location: 'E102',
    courseCode: '410243',
    courseName: 'Blockchain Technology',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E102', isPreferred: true }]
  },

  // 13. Prof. Y. P. Warke
  {
    srNo: 13,
    facultyName: 'Prof. Y. P. Warke',
    className: 'SE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E101/E104',
    courseCode: 'OEL-220-COM',
    courseName: 'Open Elective 1',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [
      { batch: 'SE-A', roomNumber: 'E101', isPreferred: true },
      { batch: 'SE-B', roomNumber: 'E104', isPreferred: false }
    ]
  },
  {
    srNo: 13,
    facultyName: 'Prof. Y. P. Warke',
    className: 'TE',
    divisionName: 'B',
    batchName: '-',
    location: 'E103',
    courseCode: 'PCC301COM',
    courseName: 'Artificial Intelligence',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E103', isPreferred: true }]
  },
  {
    srNo: 13,
    facultyName: 'Prof. Y. P. Warke',
    className: 'TE',
    divisionName: 'B',
    batchName: 'B1,B2,B3,B4',
    location: 'C110',
    courseCode: 'PCC304COM',
    courseName: 'Artificial Intelligence Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C110', isPreferred: true },
      { batch: 'B2', roomNumber: 'C110', isPreferred: true },
      { batch: 'B3', roomNumber: 'C110', isPreferred: true },
      { batch: 'B4', roomNumber: 'C110', isPreferred: true }
    ]
  },
  {
    srNo: 13,
    facultyName: 'Prof. Y. P. Warke',
    className: 'TE',
    divisionName: 'A&B',
    batchName: 'A2,B2',
    location: 'C105/C102',
    courseCode: 'ELC342COM',
    courseName: 'Technical Seminar',
    theory: 0, practical: 0, tutorial: 4, project: 0, total: 4,
    allowedLocationsList: [
      { batch: 'A2', roomNumber: 'C105', isPreferred: true },
      { batch: 'B2', roomNumber: 'C102', isPreferred: true }
    ]
  },

  // 14. Prof. U. B. Karanje
  {
    srNo: 14,
    facultyName: 'Prof. U. B. Karanje',
    className: 'SE',
    divisionName: 'B',
    batchName: '-',
    location: 'E104',
    courseCode: 'MDM-230-COM',
    courseName: 'Digital Electronics and Logic Design',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E104', isPreferred: true }]
  },
  {
    srNo: 14,
    facultyName: 'Prof. U. B. Karanje',
    className: 'SE',
    divisionName: 'B',
    batchName: 'B1,B2,B3,B4',
    location: 'C102/C108',
    courseCode: 'PCC-204-COM',
    courseName: 'Data Structures Laboratory',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C108', isPreferred: true },
      { batch: 'B1', roomNumber: 'C102', isPreferred: false },
      { batch: 'B2', roomNumber: 'C102', isPreferred: true },
      { batch: 'B2', roomNumber: 'C108', isPreferred: false },
      { batch: 'B3', roomNumber: 'C108', isPreferred: true },
      { batch: 'B3', roomNumber: 'C102', isPreferred: false },
      { batch: 'B4', roomNumber: 'C102', isPreferred: true },
      { batch: 'B4', roomNumber: 'C108', isPreferred: false }
    ]
  },
  {
    srNo: 14,
    facultyName: 'Prof. U. B. Karanje',
    className: 'TE',
    divisionName: 'A',
    batchName: 'A1,A2,A3,A4',
    location: 'C108',
    courseCode: 'PEC322COM',
    courseName: 'Elective I Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C108', isPreferred: true },
      { batch: 'A2', roomNumber: 'C108', isPreferred: true },
      { batch: 'A3', roomNumber: 'C108', isPreferred: true },
      { batch: 'A4', roomNumber: 'C108', isPreferred: true }
    ]
  },

  // 15. Prof. Y. B. Dongare
  {
    srNo: 15,
    facultyName: 'Prof. Y. B. Dongare',
    className: 'SE',
    divisionName: 'B',
    batchName: '-',
    location: 'E104',
    courseCode: 'PCC-202-COM',
    courseName: 'Object Oriented Programming and Computer Graphics',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E104', isPreferred: true }]
  },
  {
    srNo: 15,
    facultyName: 'Prof. Y. B. Dongare',
    className: 'SE',
    divisionName: 'B',
    batchName: 'B1,B2,B3,B4',
    location: 'C104',
    courseCode: 'PCC-205-COM',
    courseName: 'Object Oriented Programming and Computer Graphics Laboratory',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C104', isPreferred: true },
      { batch: 'B2', roomNumber: 'C104', isPreferred: true },
      { batch: 'B3', roomNumber: 'C104', isPreferred: true },
      { batch: 'B4', roomNumber: 'C104', isPreferred: true }
    ]
  },
  {
    srNo: 15,
    facultyName: 'Prof. Y. B. Dongare',
    className: 'BE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: '410243',
    courseName: 'Blockchain Technology',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 15,
    facultyName: 'Prof. Y. B. Dongare',
    className: 'BE',
    divisionName: 'B',
    batchName: 'B4',
    location: 'C110',
    courseCode: '410246',
    courseName: 'Laboratory Practice III',
    theory: 0, practical: 4, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [{ batch: 'B4', roomNumber: 'C110', isPreferred: true }]
  },

  // 16. Prof. M. S. Jagtap
  {
    srNo: 16,
    facultyName: 'Prof. M. S. Jagtap',
    className: 'TE',
    divisionName: 'A',
    batchName: '-',
    location: 'E102',
    courseCode: 'PCC301COM',
    courseName: 'Artificial Intelligence',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E102', isPreferred: true }]
  },
  {
    srNo: 16,
    facultyName: 'Prof. M. S. Jagtap',
    className: 'TE',
    divisionName: 'A',
    batchName: 'A1,A2,A3,A4',
    location: 'C105',
    courseCode: 'PCC304COM',
    courseName: 'Artificial Intelligence Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C105', isPreferred: true },
      { batch: 'A2', roomNumber: 'C105', isPreferred: true },
      { batch: 'A3', roomNumber: 'C105', isPreferred: true },
      { batch: 'A4', roomNumber: 'C105', isPreferred: true }
    ]
  },
  {
    srNo: 16,
    facultyName: 'Prof. M. S. Jagtap',
    className: 'BE',
    divisionName: 'A&B',
    batchName: 'B1,B2',
    location: 'C104/C103',
    courseCode: '410246',
    courseName: 'Laboratory Practice III',
    theory: 0, practical: 4, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [
      { batch: 'B1', roomNumber: 'C104', isPreferred: true },
      { batch: 'B1', roomNumber: 'C103', isPreferred: false },
      { batch: 'B2', roomNumber: 'C110', isPreferred: true }
    ]
  },
  {
    srNo: 16,
    facultyName: 'Prof. M. S. Jagtap',
    className: 'SE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: 'PCC-203-COM',
    courseName: 'Operating Systems',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },

  // 17. Prof. Niraml B. L.
  {
    srNo: 17,
    facultyName: 'Prof. Niraml B. L.',
    className: 'SE',
    divisionName: 'A',
    batchName: '-',
    location: 'E101',
    courseCode: 'PCC-202-COM',
    courseName: 'Object Oriented Programming and Computer Graphics',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 17,
    facultyName: 'Prof. Niraml B. L.',
    className: 'SE',
    divisionName: 'A',
    batchName: 'A1,A2,A3,A4',
    location: 'C104',
    courseCode: 'PCC-205-COM',
    courseName: 'Object Oriented Programming and Computer Graphics Laboratory',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C104', isPreferred: true },
      { batch: 'A2', roomNumber: 'C104', isPreferred: true },
      { batch: 'A3', roomNumber: 'C104', isPreferred: true },
      { batch: 'A4', roomNumber: 'C104', isPreferred: true }
    ]
  },
  {
    srNo: 17,
    facultyName: 'Prof. Niraml B. L.',
    className: 'BE',
    divisionName: 'B',
    batchName: '-',
    location: 'E102',
    courseCode: '410241',
    courseName: 'Design and Analysis of Algorithms',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E102', isPreferred: true }]
  },
  {
    srNo: 17,
    facultyName: 'Prof. Niraml B. L.',
    className: 'TE',
    divisionName: 'B',
    batchName: 'B4',
    location: 'C101',
    courseCode: 'ELC342COM',
    courseName: 'Technical Seminar',
    theory: 0, practical: 0, tutorial: 2, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'B4', roomNumber: 'C101', isPreferred: true }]
  },

  // 18. Prof. Nutan Sarode
  {
    srNo: 18,
    facultyName: 'Prof. Nutan Sarode',
    className: 'TE',
    divisionName: 'A',
    batchName: 'A4',
    location: 'C103',
    courseCode: 'ELC342COM',
    courseName: 'Technical Seminar',
    theory: 0, practical: 0, tutorial: 2, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'A4', roomNumber: 'C103', isPreferred: true }]
  },
  {
    srNo: 18,
    facultyName: 'Prof. Nutan Sarode',
    className: 'TE',
    divisionName: 'A&B',
    batchName: 'A3,A4,B3,B4',
    location: 'C103/C104/C108/E102',
    courseCode: 'MDM331COM',
    courseName: 'Robotics and Automation',
    theory: 0, practical: 8, tutorial: 4, project: 0, total: 12,
    allowedLocationsList: [
      { batch: 'A3', roomNumber: 'C104', isPreferred: true },
      { batch: 'A3', roomNumber: 'C108', isPreferred: false },
      { batch: 'A4', roomNumber: 'C104', isPreferred: true },
      { batch: 'B3', roomNumber: 'E102', isPreferred: true },
      { batch: 'B4', roomNumber: 'C106', isPreferred: true }
    ]
  },
  {
    srNo: 18,
    facultyName: 'Prof. Nutan Sarode',
    className: 'BE',
    divisionName: 'B',
    batchName: '-',
    location: 'E102',
    courseCode: '410244(D)',
    courseName: 'Elective III',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E102', isPreferred: true }]
  },

  // 19. Prof. Barangale Shraddha
  {
    srNo: 19,
    facultyName: 'Prof. Barangale Shraddha',
    className: 'TE',
    divisionName: 'A',
    batchName: 'A3',
    location: 'C106',
    courseCode: 'ELC342COM',
    courseName: 'Technical Seminar',
    theory: 0, practical: 0, tutorial: 2, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'A3', roomNumber: 'C106', isPreferred: true }]
  },
  {
    srNo: 19,
    facultyName: 'Prof. Barangale Shraddha',
    className: 'TE',
    divisionName: 'A&B',
    batchName: 'A1,A2,B1,B2',
    location: 'C103/C104/C106/E102',
    courseCode: 'MDM331COM',
    courseName: 'Robotics and Automation',
    theory: 0, practical: 8, tutorial: 4, project: 0, total: 12,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C103', isPreferred: true },
      { batch: 'A2', roomNumber: 'C103', isPreferred: true },
      { batch: 'B1', roomNumber: 'C103', isPreferred: true },
      { batch: 'B2', roomNumber: 'C103', isPreferred: true }
    ]
  },
  {
    srNo: 19,
    facultyName: 'Prof. Barangale Shraddha',
    className: 'BE',
    divisionName: 'B',
    batchName: '-',
    location: 'E102',
    courseCode: '410242',
    courseName: 'Machine Learning',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E102', isPreferred: true }]
  },

  // 20. Dr. M. D. Salunke (PG)
  {
    srNo: 20,
    facultyName: 'Dr. M. D. Salunke (PG)',
    className: 'ME-I',
    divisionName: '-',
    batchName: '-',
    location: 'E101',
    courseCode: 'PEC-521-COM',
    courseName: 'Elective I',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 20,
    facultyName: 'Dr. M. D. Salunke (PG)',
    className: 'ME-I',
    divisionName: '-',
    batchName: '-',
    location: 'C106',
    courseCode: 'PCC-505-COM',
    courseName: 'Computational Laboratory-I',
    theory: 0, practical: 4, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'C106', isPreferred: true }]
  },
  {
    srNo: 20,
    facultyName: 'Dr. M. D. Salunke (PG)',
    className: 'TE',
    divisionName: 'A',
    batchName: '-',
    location: 'E102',
    courseCode: 'PCC302COM',
    courseName: 'Computer Networks',
    theory: 3, practical: 0, tutorial: 0, project: 0, total: 3,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E102', isPreferred: true }]
  },
  {
    srNo: 20,
    facultyName: 'Dr. M. D. Salunke (PG)',
    className: 'TE',
    divisionName: 'A',
    batchName: 'A1,A2,A3,A4',
    location: 'C101/C102',
    courseCode: 'PCC305COM',
    courseName: 'Computer Networks Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A1', roomNumber: 'C101', isPreferred: true },
      { batch: 'A2', roomNumber: 'C102', isPreferred: true },
      { batch: 'A2', roomNumber: 'C101', isPreferred: false },
      { batch: 'A3', roomNumber: 'C101', isPreferred: true },
      { batch: 'A4', roomNumber: 'C101', isPreferred: true }
    ]
  },

  // 21. Dr. J. P. Shinde
  {
    srNo: 21,
    facultyName: 'Dr. J. P. Shinde',
    className: 'ME-I',
    divisionName: '-',
    batchName: '-',
    location: 'C103',
    courseCode: 'PEC-522-COM',
    courseName: 'Skill Based Laboratory-I',
    theory: 0, practical: 2, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'C103', isPreferred: true }]
  },
  {
    srNo: 21,
    facultyName: 'Dr. J. P. Shinde',
    className: 'ME-II',
    divisionName: '-',
    batchName: '-',
    location: 'E101',
    courseCode: 'RM-601-COM',
    courseName: 'Research Methodology',
    theory: 4, practical: 0, tutorial: 0, project: 0, total: 4,
    allowedLocationsList: [{ batch: 'ALL', roomNumber: 'E101', isPreferred: true }]
  },
  {
    srNo: 21,
    facultyName: 'Dr. J. P. Shinde',
    className: 'TE',
    divisionName: 'A&B',
    batchName: '-',
    location: 'E102/E103',
    courseCode: 'OLE341COM',
    courseName: 'Open Elective',
    theory: 2, practical: 0, tutorial: 0, project: 0, total: 2,
    allowedLocationsList: [
      { batch: 'TE-A', roomNumber: 'E102', isPreferred: true },
      { batch: 'TE-B', roomNumber: 'E103', isPreferred: false }
    ]
  },
  {
    srNo: 21,
    facultyName: 'Dr. J. P. Shinde',
    className: 'TE',
    divisionName: 'A&B',
    batchName: 'A2,B1,B2,B3',
    location: 'C102/C103/C101',
    courseCode: 'PCC305COM',
    courseName: 'Computer Networks Lab',
    theory: 0, practical: 8, tutorial: 0, project: 0, total: 8,
    allowedLocationsList: [
      { batch: 'A2', roomNumber: 'C102', isPreferred: true },
      { batch: 'B1', roomNumber: 'C103', isPreferred: true },
      { batch: 'B2', roomNumber: 'C103', isPreferred: true },
      { batch: 'B3', roomNumber: 'C101', isPreferred: true }
    ]
  },
  // Flexible Project Supervision Assignments (8 hrs/week total, 2 hrs/week each, 0 timetable slots)
  {
    srNo: 1,
    facultyName: 'Dr. S. G. Rathod (HoD)',
    className: 'BE',
    divisionName: 'A&B',
    batchName: '-',
    location: '-',
    courseCode: 'PRJ-BE-401',
    courseName: 'BE Major Project Supervision',
    theory: 0, practical: 0, tutorial: 0, project: 2, total: 2,
    allowedLocationsList: []
  },
  {
    srNo: 2,
    facultyName: 'Dr. S. S. Chaudhari (TPC)',
    className: 'BE',
    divisionName: 'A&B',
    batchName: '-',
    location: '-',
    courseCode: 'PRJ-BE-402',
    courseName: 'BE Major Project Supervision',
    theory: 0, practical: 0, tutorial: 0, project: 2, total: 2,
    allowedLocationsList: []
  },
  {
    srNo: 3,
    facultyName: 'Dr. S. K. Patil',
    className: 'BE',
    divisionName: 'A&B',
    batchName: '-',
    location: '-',
    courseCode: 'PRJ-BE-403',
    courseName: 'BE Major Project Supervision',
    theory: 0, practical: 0, tutorial: 0, project: 2, total: 2,
    allowedLocationsList: []
  },
  {
    srNo: 4,
    facultyName: 'Dr. M. V. Kadam',
    className: 'BE',
    divisionName: 'A&B',
    batchName: '-',
    location: '-',
    courseCode: 'PRJ-BE-404',
    courseName: 'BE Major Project Supervision',
    theory: 0, practical: 0, tutorial: 0, project: 2, total: 2,
    allowedLocationsList: []
  }
];

export async function seedFacultyWorkload() {
  console.log('[Seed] Starting MMIT Computer Engineering Faculty Workload Import...');

  let compDept = await prisma.department.findFirst({
    where: { OR: [{ code: 'COMP' }, { name: 'Computer Engineering' }] }
  });

  if (!compDept) {
    compDept = await prisma.department.create({
      data: {
        name: 'Computer Engineering',
        code: 'COMP',
        isActive: true
      }
    });
    console.log('[Seed] Created Computer Engineering department (COMP)');
  }

  // Create standard rooms if missing (Exactly 4 Classrooms and 9 Laboratories)
  const roomsToEnsure = [
    { number: 'E101', isLab: false, name: 'SE-A Classroom' },
    { number: 'E102', isLab: false, name: 'TE-A Classroom' },
    { number: 'E103', isLab: false, name: 'TE-B Classroom' },
    { number: 'E104', isLab: false, name: 'SE-B Classroom' },
    { number: 'C101', isLab: true, name: 'DBMS Lab' },
    { number: 'C102', isLab: true, name: 'Software Testing Lab' },
    { number: 'C103', isLab: true, name: 'Hardware Lab' },
    { number: 'C104', isLab: true, name: 'OOPCG Lab' },
    { number: 'C105', isLab: true, name: 'Digital / Microprocessor Lab' },
    { number: 'C106', isLab: true, name: 'Programming Lab' },
    { number: 'C108', isLab: true, name: 'Server Room' },
    { number: 'C110', isLab: true, name: 'Data Structure Lab' },
    { number: 'C111', isLab: true, name: 'Signal Processing Lab' }
  ];

  for (const r of roomsToEnsure) {
    await prisma.room.upsert({
      where: { roomNumber: r.number },
      create: {
        roomNumber: r.number,
        capacity: r.isLab ? 30 : 70,
        departmentId: compDept.id,
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

  let teacherCount = 0;
  let assignmentCount = 0;

  // Process unique faculty list
  const uniqueTeachersMap = new Map<string, string>();
  for (const row of MASTER_DATA) {
    if (!uniqueTeachersMap.has(row.facultyName)) {
      const codeData = generateFacultyCode(row.facultyName);
      uniqueTeachersMap.set(row.facultyName, codeData.code);

      const teacher = await prisma.teacher.upsert({
        where: { employeeId: codeData.code },
        create: {
          employeeId: codeData.code,
          shortCode: codeData.code,
          name: row.facultyName,
          email: `${codeData.code.toLowerCase()}@mmit.edu.in`,
          departmentId: compDept.id,
          designation: 'Faculty',
          isCodeFlagged: codeData.isFlagged,
          codeFlagReason: codeData.flagReason
        },
        update: {
          name: row.facultyName,
          departmentId: compDept.id
        }
      });

      await prisma.teacherDepartment.upsert({
        where: {
          teacherId_departmentId: {
            teacherId: teacher.id,
            departmentId: compDept.id
          }
        },
        create: {
          teacherId: teacher.id,
          departmentId: compDept.id
        },
        update: {}
      });

      teacherCount++;
    }
  }

  console.log(`[Seed] Synced ${teacherCount} unique faculty members.`);

  // Clear stale allocations to ensure exactly 74 authoritative master records
  await prisma.assignmentAllowedLocation.deleteMany();
  await prisma.facultyAssignment.deleteMany();

  // Process all 74 master records with idempotent upsert logic
  for (const row of MASTER_DATA) {
    const shortCode = uniqueTeachersMap.get(row.facultyName)!;
    const teacher = await prisma.teacher.findUnique({
      where: { employeeId: shortCode }
    });

    if (!teacher) continue;

    // Subject upsert
    const subject = await prisma.subject.upsert({
      where: { code: row.courseCode },
      create: {
        code: row.courseCode,
        name: row.courseName,
        departmentId: compDept.id,
        semester: row.className === 'SE' ? 3 : row.className === 'TE' ? 5 : 7,
        credits: row.theory > 0 ? 3 : 2,
        lectureHours: row.theory,
        practicalHours: row.practical,
        tutorialHours: row.tutorial,
        labRequired: row.practical > 0
      },
      update: {
        name: row.courseName,
        lectureHours: row.theory,
        practicalHours: row.practical,
        tutorialHours: row.tutorial,
        labRequired: row.practical > 0
      }
    });

    // Division upsert
    let courseYear = await prisma.courseYear.findFirst({
      where: { year: row.className === 'SE' ? 2 : row.className === 'TE' ? 3 : 4 }
    });
    if (!courseYear) {
      let course = await prisma.course.findFirst({ where: { departmentId: compDept.id } });
      if (!course) {
        course = await prisma.course.create({
          data: { name: 'B.E. Computer Engineering', departmentId: compDept.id }
        });
      }
      courseYear = await prisma.courseYear.create({
        data: {
          year: row.className === 'SE' ? 2 : row.className === 'TE' ? 3 : 4,
          courseId: course.id
        }
      });
    }

    let division = await prisma.division.findFirst({
      where: { name: row.divisionName === 'A&B' ? 'A' : row.divisionName || 'A', yearId: courseYear.id }
    });

    if (!division) {
      division = await prisma.division.create({
        data: {
          name: row.divisionName === 'A&B' ? 'A' : row.divisionName || 'A',
          yearId: courseYear.id
        }
      });
    }

    // Determine type
    let assignmentType = 'LECTURE';
    if (row.practical > 0) assignmentType = 'PRACTICAL';
    else if (row.tutorial > 0) assignmentType = 'TUTORIAL';
    else if (row.project > 0) assignmentType = 'PROJECT';

    // Find existing assignment or create new
    let existingAssignment = await prisma.facultyAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        departmentId: compDept.id,
        courseCode: row.courseCode,
        className: row.className,
        divisionName: row.divisionName,
        batchName: row.batchName
      }
    });

    if (!existingAssignment) {
      existingAssignment = await prisma.facultyAssignment.create({
        data: {
          teacherId: teacher.id,
          departmentId: compDept.id,
          subjectId: subject.id,
          divisionId: division.id,
          className: row.className,
          divisionName: row.divisionName,
          batchName: row.batchName,
          courseCode: row.courseCode,
          courseName: row.courseName,
          theoryHours: row.theory,
          practicalHours: row.practical,
          tutorialHours: row.tutorial,
          projectHours: row.project,
          totalHours: row.total,
          weeklyHours: row.total,
          type: assignmentType,
          academicYear: '2026-27',
          semester: 1,
          rawLocation: row.location
        }
      });
    } else {
      existingAssignment = await prisma.facultyAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          theoryHours: row.theory,
          practicalHours: row.practical,
          tutorialHours: row.tutorial,
          projectHours: row.project,
          totalHours: row.total,
          weeklyHours: row.total,
          type: assignmentType,
          rawLocation: row.location
        }
      });
    }

    // Delete existing allowed locations to keep seed clean & updated
    await prisma.assignmentAllowedLocation.deleteMany({
      where: { assignmentId: existingAssignment.id }
    });

    // Insert allowed location constraints
    for (const locItem of row.allowedLocationsList) {
      await prisma.assignmentAllowedLocation.create({
        data: {
          assignmentId: existingAssignment.id,
          batchName: locItem.batch,
          roomNumber: locItem.roomNumber,
          isPreferred: locItem.isPreferred || false
        }
      });
    }

    assignmentCount++;
  }

  console.log(`[Seed] Successfully seeded ${assignmentCount} authoritative Faculty Workload Master records into dev.db.`);
}

if (require.main === module) {
  seedFacultyWorkload()
    .then(() => {
      console.log('[Seed] Seeding completed cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
