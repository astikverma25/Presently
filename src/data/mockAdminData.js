/**
 * Admin Data Model & Initial State
 * Structured strictly according to Docs/Database_Schema_QR_Attendance_System.md
 */

export const mockAdminProfile = {
  id: 'adm-001',
  name: 'Abir Mukherjee',
  role: 'Administrator',
  email: 'admin@university.edu',
  avatarInitials: 'AM',
  institution: 'Apex Institute of Technology'
};

export const initialAdminFaculty = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Vishal Gupta',
    email: 'vishal.gupta@university.edu',
    department: 'Computer Science & Engineering',
    createdAt: '2026-08-10'
  },
  {
    id: '11111111-1111-1111-1111-111111111112',
    name: 'Dr. Meera Nambiar',
    email: 'meera.nambiar@university.edu',
    department: 'Information Technology',
    createdAt: '2026-08-12'
  }
];

export const initialAdminSubjects = [
  {
    id: '33333333-3333-3333-3333-333333333331',
    subjectName: 'Data Structures',
    subjectCode: 'CS401',
    semester: '4th'
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    subjectName: 'Operating Systems',
    subjectCode: 'CS402',
    semester: '4th'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    subjectName: 'DBMS Lab',
    subjectCode: 'CS403L',
    semester: '4th'
  }
];

export const initialAdminSections = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    sectionName: '2A',
    branch: 'CSE',
    semester: '4th',
    totalStudents: 48
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    sectionName: '2B',
    branch: 'CSE',
    semester: '4th',
    totalStudents: 46
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    sectionName: '3B',
    branch: 'CSE',
    semester: '6th',
    totalStudents: 52
  }
];

export const initialAdminStudents = [
  {
    id: '66666666-6666-6666-6666-666666666661',
    name: 'Rohan Kapoor',
    rollNo: '2A-041',
    sectionName: '2A',
    branch: 'CSE',
    semester: '4th',
    personalEmail: 'rohan.kapoor@gmail.com',
    phone: '+91 98765 43210',
    accountStatus: 'active'
  },
  {
    id: '66666666-6666-6666-6666-666666666662',
    name: 'Priya Sharma',
    rollNo: '2A-042',
    sectionName: '2A',
    branch: 'CSE',
    semester: '4th',
    personalEmail: 'priya.sharma@gmail.com',
    phone: '+91 98765 43211',
    accountStatus: 'active'
  },
  {
    id: '66666666-6666-6666-6666-666666666663',
    name: 'Divya Rao',
    rollNo: '2A-043',
    sectionName: '2A',
    branch: 'CSE',
    semester: '4th',
    personalEmail: 'divya.rao@gmail.com',
    phone: '+91 98765 43212',
    accountStatus: 'active'
  }
];

export const initialAdminAssignments = [
  {
    id: '55555555-5555-5555-5555-555555555551',
    subjectName: 'Data Structures',
    sectionName: '2A',
    facultyName: 'Vishal Gupta',
    dayOfWeek: 'Monday',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    roomNo: 'Room 214'
  },
  {
    id: '55555555-5555-5555-5555-555555555552',
    subjectName: 'Operating Systems',
    sectionName: '3B',
    facultyName: 'Vishal Gupta',
    dayOfWeek: 'Monday',
    startTime: '12:00 PM',
    endTime: '01:00 PM',
    roomNo: 'Room 108'
  },
  {
    id: '55555555-5555-5555-5555-555555555553',
    subjectName: 'DBMS Lab',
    sectionName: '2A',
    facultyName: 'Vishal Gupta',
    dayOfWeek: 'Monday',
    startTime: '02:00 PM',
    endTime: '04:00 PM',
    roomNo: 'Lab 3'
  }
];
