-- ==============================================================================
-- Migration: 003 - Role-Based Access Control (RBAC) & Row Level Security (RLS)
-- QR Based - Smart Attendance Management System
-- Matches Docs/Database_Schema_QR_Attendance_System.md (Section 9)
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT (raw_user_meta_data->>'role') = 'admin'
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper function to get current user's faculty_id
CREATE OR REPLACE FUNCTION public.get_auth_faculty_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM public.faculty WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Helper function to get current user's student_id
CREATE OR REPLACE FUNCTION public.get_auth_student_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM public.students WHERE personal_email = (SELECT email FROM auth.users WHERE id = auth.uid())
           OR login_username = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- Policies: Admin Full Read/Write Access
-- ==============================================================================
CREATE POLICY "Admin full access faculty" ON public.faculty FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access sections" ON public.sections FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access students" ON public.students FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access subjects" ON public.subjects FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access section_subjects" ON public.section_subjects FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access faculty_assignment" ON public.faculty_assignment FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access attendance_sessions" ON public.attendance_sessions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin full access attendance_records" ON public.attendance_records FOR ALL USING (public.is_admin());

-- ==============================================================================
-- Policies: Faculty Access Scope
-- Limited to sections in their own faculty_assignment rows
-- ==============================================================================
CREATE POLICY "Faculty can view own profile" ON public.faculty
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Faculty can view assigned sections" ON public.sections
    FOR SELECT USING (
        id IN (
            SELECT ss.section_id FROM public.section_subjects ss
            JOIN public.faculty_assignment fa ON fa.section_subject_id = ss.id
            WHERE fa.faculty_id = public.get_auth_faculty_id()
        )
    );

CREATE POLICY "Faculty can view assigned section students" ON public.students
    FOR SELECT USING (
        section_id IN (
            SELECT ss.section_id FROM public.section_subjects ss
            JOIN public.faculty_assignment fa ON fa.section_subject_id = ss.id
            WHERE fa.faculty_id = public.get_auth_faculty_id()
        )
    );

CREATE POLICY "Faculty can view subjects" ON public.subjects
    FOR SELECT USING (true);

CREATE POLICY "Faculty can view own assignments" ON public.faculty_assignment
    FOR SELECT USING (faculty_id = public.get_auth_faculty_id());

CREATE POLICY "Faculty can manage attendance sessions for assigned classes" ON public.attendance_sessions
    FOR ALL USING (
        faculty_assignment_id IN (
            SELECT id FROM public.faculty_assignment WHERE faculty_id = public.get_auth_faculty_id()
        )
    );

CREATE POLICY "Faculty can manage attendance records for assigned sessions" ON public.attendance_records
    FOR ALL USING (
        session_id IN (
            SELECT atts.id FROM public.attendance_sessions atts
            JOIN public.faculty_assignment fa ON fa.id = atts.faculty_assignment_id
            WHERE fa.faculty_id = public.get_auth_faculty_id()
        )
    );

-- ==============================================================================
-- Policies: Student Access Scope
-- Read own student record and own attendance records only
-- ==============================================================================
CREATE POLICY "Student can view own record" ON public.students
    FOR SELECT USING (id = public.get_auth_student_id());

CREATE POLICY "Student can view own attendance records" ON public.attendance_records
    FOR SELECT USING (student_id = public.get_auth_student_id());

CREATE POLICY "Student can insert own attendance record" ON public.attendance_records
    FOR INSERT WITH CHECK (student_id = public.get_auth_student_id());
