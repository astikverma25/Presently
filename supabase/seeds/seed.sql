-- ==============================================================================
-- Seed Data for Presently QR Attendance System
-- Matches Docs/Database_Schema_QR_Attendance_System.md
-- ==============================================================================

-- 0. Insert Admin
INSERT INTO public.admins (id, name, email, role) VALUES
('00000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@presently.edu', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- 1. Insert Faculty
INSERT INTO public.faculty (id, name, email, department) VALUES
('11111111-1111-1111-1111-111111111111', 'Vishal Gupta', 'vishal.gupta@university.edu', 'Computer Science & Engineering')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Sections
INSERT INTO public.sections (id, section_name, branch, semester, total_students) VALUES
('22222222-2222-2222-2222-222222222221', '2A', 'CSE', '4th', 48),
('22222222-2222-2222-2222-222222222222', '2B', 'CSE', '4th', 46),
('22222222-2222-2222-2222-222222222223', '3B', 'CSE', '6th', 52)
ON CONFLICT DO NOTHING;

-- 3. Insert Subjects
INSERT INTO public.subjects (id, subject_name, subject_code, semester) VALUES
('33333333-3333-3333-3333-333333333331', 'Data Structures', 'CS401', '4th'),
('33333333-3333-3333-3333-333333333332', 'Operating Systems', 'CS402', '4th'),
('33333333-3333-3333-3333-333333333333', 'DBMS Lab', 'CS403L', '4th')
ON CONFLICT (subject_code) DO NOTHING;

-- 4. Insert Faculty Assignments (Direct subject_id, section_id, faculty_id, lec_date, lec_id)
INSERT INTO public.faculty_assignment (id, faculty_id, subject_id, section_id, lec_id, lec_date, status, start_time, end_time, room_no) VALUES
('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 'LEC-20260921-DS2A01', '2026-09-21', 'completed', '10:00:00', '11:00:00', 'Room 214'),
('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222223', 'LEC-20260921-OS3B01', '2026-09-21', 'completed', '12:00:00', '13:00:00', 'Room 108'),
('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222221', 'LEC-20260921-DB2A01', '2026-09-21', 'completed', '14:00:00', '16:00:00', 'Lab 3'),
('55555555-5555-5555-5555-555555555554', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'LEC-20260921-DS2B01', '2026-09-21', 'completed', '16:30:00', '17:30:00', 'Room 214')
ON CONFLICT (lec_id) DO NOTHING;

-- 6. Insert Students (Section 2A Roster)
INSERT INTO public.students (id, name, roll_no, section_id, semester, branch, photo_url, login_username, account_status) VALUES
('66666666-6666-6666-6666-666666666661', 'Rohan Kapoor', '2A-041', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student1.png', '2a041@university.edu', 'active'),
('66666666-6666-6666-6666-666666666662', 'Priya Sharma', '2A-042', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student2.png', '2a042@university.edu', 'active'),
('66666666-6666-6666-6666-666666666663', 'Divya Rao', '2A-043', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student3.png', '2a043@university.edu', 'active'),
('66666666-6666-6666-6666-666666666664', 'Karan Mehta', '2A-044', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student4.png', '2a044@university.edu', 'active'),
('66666666-6666-6666-6666-666666666665', 'Sneha Nair', '2A-045', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student5.png', '2a045@university.edu', 'active'),
('66666666-6666-6666-6666-666666666666', 'Arjun Mehta', '2A-046', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student6.png', '2a046@university.edu', 'active'),
('66666666-6666-6666-6666-666666666667', 'Kavya Reddy', '2A-047', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student7.png', '2a047@university.edu', 'active'),
('66666666-6666-6666-6666-666666666668', 'Astik Verma', '2A-048', '22222222-2222-2222-2222-222222222221', '4th', 'CSE', '/assets/avatars/student8.png', '2a048@university.edu', 'active')
ON CONFLICT (roll_no) DO NOTHING;

-- 7. Insert Today's Session
INSERT INTO public.attendance_sessions (id, faculty_assignment_id, qr_expiry_sec, status) VALUES
('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555551', 15, 'completed')
ON CONFLICT DO NOTHING;

-- 8. Insert Today's Attendance Records
INSERT INTO public.attendance_records (session_id, student_id, status, marked_at, verification_method) VALUES
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666661', 'present', '2026-09-21 10:04:00+05:30', 'qr_scan'),
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666662', 'present', '2026-09-21 10:05:00+05:30', 'qr_scan'),
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666663', 'absent', NULL, NULL),
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666664', 'present', '2026-09-21 10:03:00+05:30', 'qr_scan'),
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666665', 'present', '2026-09-21 10:06:00+05:30', 'qr_scan'),
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666666', 'absent', NULL, NULL),
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666667', 'absent', NULL, NULL),
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666668', 'present', '2026-09-21 10:04:00+05:30', 'qr_scan')
ON CONFLICT (session_id, student_id) DO NOTHING;
