-- ==============================================================================
-- Migration: 007 - Remove Direct auth.users Queries (Use auth.jwt() Instead)
-- QR Based - Smart Attendance Management System
-- Fixes: "permission denied for table users" (SQLSTATE 42501)
-- ==============================================================================

-- 1. Update is_admin() to use pure JWT claims (no auth.users table query)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Extract email directly from JWT token claims
    current_email := LOWER(auth.jwt() ->> 'email');

    -- Check 1: User or app metadata in JWT
    IF (auth.jwt() ->> 'role') = 'admin'
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
       OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Check 2: Email in public.admins whitelist table
    IF current_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admins WHERE LOWER(email) = current_email
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. Update get_auth_faculty_id() without querying auth.users
CREATE OR REPLACE FUNCTION public.get_auth_faculty_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.faculty 
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1;
$$;

-- 3. Update get_auth_student_id() without querying auth.users
CREATE OR REPLACE FUNCTION public.get_auth_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.students 
    WHERE LOWER(personal_email) = LOWER(auth.jwt() ->> 'email')
       OR LOWER(login_username) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1;
$$;

-- 4. Replace faculty policies that were querying auth.users
DROP POLICY IF EXISTS "Faculty can view own profile" ON public.faculty;
CREATE POLICY "Faculty can view own profile" ON public.faculty
    FOR SELECT TO authenticated
    USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Faculty can view assigned sections" ON public.sections;
CREATE POLICY "Faculty can view assigned sections" ON public.sections
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT ss.section_id FROM public.section_subjects ss
            JOIN public.faculty_assignment fa ON fa.section_subject_id = ss.id
            WHERE fa.faculty_id = public.get_auth_faculty_id()
        )
    );

DROP POLICY IF EXISTS "Faculty can view assigned section students" ON public.students;
CREATE POLICY "Faculty can view assigned section students" ON public.students
    FOR SELECT TO authenticated
    USING (
        section_id IN (
            SELECT ss.section_id FROM public.section_subjects ss
            JOIN public.faculty_assignment fa ON fa.section_subject_id = ss.id
            WHERE fa.faculty_id = public.get_auth_faculty_id()
        )
    );

-- 5. Ensure all admin policies on management tables are clean
DROP POLICY IF EXISTS "Admin full access faculty" ON public.faculty;
CREATE POLICY "Admin full access faculty" ON public.faculty
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access sections" ON public.sections;
CREATE POLICY "Admin full access sections" ON public.sections
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access students" ON public.students;
CREATE POLICY "Admin full access students" ON public.students
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access subjects" ON public.subjects;
CREATE POLICY "Admin full access subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access section_subjects" ON public.section_subjects;
CREATE POLICY "Admin full access section_subjects" ON public.section_subjects
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access faculty_assignment" ON public.faculty_assignment;
CREATE POLICY "Admin full access faculty_assignment" ON public.faculty_assignment
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access attendance_sessions" ON public.attendance_sessions;
CREATE POLICY "Admin full access attendance_sessions" ON public.attendance_sessions
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access attendance_records" ON public.attendance_records;
CREATE POLICY "Admin full access attendance_records" ON public.attendance_records
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
