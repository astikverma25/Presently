/**
 * Student Data Model & Initial State
 * Matches Docs/Database_Schema_QR_Attendance_System.md (students and attendance_records tables)
 */

export const mockStudentProfile = {
  id: '66666666-6666-6666-6666-666666666666',
  name: 'Arjun Mehta',
  rollNo: '2A-046',
  sectionName: '2A',
  branch: 'CSE',
  semester: '4th',
  photoUrl: '/assets/avatars/student6.png',
  attendancePercentage: 88,
  totalClasses: 48,
  attendedClasses: 42
};

export const mockCurrentLecture = {
  subjectName: 'Data Structures',
  subjectCode: 'CS401',
  facultyName: 'Vishal Gupta',
  roomNo: 'Room 214',
  timeWindow: '10:00 - 11:00 AM',
  status: 'active', // 'active' | 'upcoming'
  sessionOpen: true
};

export const mockStudentHistory = [
  {
    id: 'rec-1',
    date: '21 Sep 2026',
    time: '10:04 AM',
    subjectName: 'Data Structures',
    subjectCode: 'CS401',
    roomNo: 'Room 214',
    status: 'present',
    verificationMethod: 'QR Scan'
  },
  {
    id: 'rec-2',
    date: '20 Sep 2026',
    time: '12:05 PM',
    subjectName: 'Operating Systems',
    subjectCode: 'CS402',
    roomNo: 'Room 108',
    status: 'present',
    verificationMethod: 'QR Scan'
  },
  {
    id: 'rec-3',
    date: '19 Sep 2026',
    time: '02:02 PM',
    subjectName: 'DBMS Lab',
    subjectCode: 'CS403L',
    roomNo: 'Lab 3',
    status: 'present',
    verificationMethod: 'QR Scan'
  },
  {
    id: 'rec-4',
    date: '18 Sep 2026',
    time: '—',
    subjectName: 'Computer Networks',
    subjectCode: 'CS404',
    roomNo: 'Room 214',
    status: 'absent',
    verificationMethod: '—'
  },
  {
    id: 'rec-5',
    date: '17 Sep 2026',
    time: '10:03 AM',
    subjectName: 'Data Structures',
    subjectCode: 'CS401',
    roomNo: 'Room 214',
    status: 'present',
    verificationMethod: 'QR Scan'
  }
];
