/**
 * Initial/Fallback Data for Faculty Dashboard
 * Structured exactly according to Supabase PostgreSQL schema models
 * (Easily swapped with live Supabase REST/Realtime subscriptions)
 */

export const mockFacultyProfile = {
  id: 'fac-101',
  name: 'Vishal Gupta',
  role: 'Faculty',
  email: 'vishal.gupta@university.edu',
  avatarInitials: 'VG',
  department: 'Computer Science & Engineering'
};

export const mockFacultyKPIs = {
  lecturesToday: 4,
  startingSoonText: '1 starting in 15m',
  studentsEnrolled: 186,
  sectionsCount: 4
};

export const mockTodayLectures = [
  {
    id: 'lec-1',
    className: 'Data Structures',
    section: '2A',
    time: '10:00 - 11:00 AM',
    room: 'Room 214',
    studentsCount: 48,
    status: 'starting_soon',
    badgeText: 'Starts in 15m'
  },
  {
    id: 'lec-2',
    className: 'Operating Systems',
    section: '3B',
    time: '12:00 - 1:00 PM',
    room: 'Room 108',
    studentsCount: 52,
    status: 'scheduled',
    badgeText: 'In 2h 10m'
  },
  {
    id: 'lec-3',
    className: 'DBMS Lab',
    section: '2A',
    time: '2:00 - 4:00 PM',
    room: 'Lab 3',
    studentsCount: 40,
    status: 'scheduled',
    badgeText: 'In 4h 10m'
  },
  {
    id: 'lec-4',
    className: 'Data Structures',
    section: '2B',
    time: '4:30 - 5:30 PM',
    room: 'Room 214',
    studentsCount: 46,
    status: 'scheduled',
    badgeText: 'In 6h 40m'
  }
];

export const mockSectionAttendance = [
  { sectionName: 'Data Structures - 2A', percentage: 91 },
  { sectionName: 'Data Structures - 2B', percentage: 84 },
  { sectionName: 'Operating Systems - 3B', percentage: 88 },
  { sectionName: 'DBMS Lab - 2A', percentage: 89 }
];

export const mockRecentActivities = [
  {
    id: 'act-1',
    title: 'QR session closed',
    target: 'Operating Systems - Sec 3B',
    timestamp: '1h ago',
    type: 'qr_closed'
  },
  {
    id: 'act-2',
    title: 'Attendance export generated',
    target: 'CS-2A Monthly Report',
    timestamp: '3h ago',
    type: 'report_exported'
  }
];

export const mockLiveStudentsStream = [
  {
    id: 'std-1',
    name: 'Rohan Kapoor',
    rollNumber: '2A-041',
    initials: 'RK',
    colorClass: 'av-purple',
    status: 'marked'
  },
  {
    id: 'std-2',
    name: 'Priya Sharma',
    rollNumber: '2A-042',
    initials: 'PS',
    colorClass: 'av-orange',
    status: 'marked'
  },
  {
    id: 'std-3',
    name: 'Astik Verma',
    rollNumber: '2A-034',
    initials: 'AV',
    colorClass: 'av-pink',
    status: 'marked'
  },
  {
    id: 'std-4',
    name: 'Sneha Nair',
    rollNumber: '2A-045',
    initials: 'SN',
    colorClass: 'av-blue',
    status: 'marked'
  },
  {
    id: 'std-5',
    name: 'Arjun Mehta',
    rollNumber: '2A-046',
    initials: 'AM',
    colorClass: 'av-unmarked',
    status: 'unmarked'
  },
  {
    id: 'std-6',
    name: 'Kavya Reddy',
    rollNumber: '2A-047',
    initials: 'KR',
    colorClass: 'av-unmarked',
    status: 'unmarked'
  }
];
