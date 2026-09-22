-- ==============================================================================
-- Migration: 008 - Fix RLS Policies for Faculty Assignments & Section Subjects
-- QR Based - Smart Attendance Management System
-- Solves: section_subject returning null, generic "Class - Sec 2A" and 0 students
-- ==============================================================================

-- 1. Ensure authenticated and anon can view core academic structures
-- (subjects, sections, section_subjects, faculty, and faculty assignments)

DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
CREATE POLICY "Anyone can view subjects" ON public.subjects
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Anyone can view sections" ON public.sections;
CREATE POLICY "Anyone can view sections" ON public.sections
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Anyone can view section_subjects" ON public.section_subjects;
CREATE POLICY "Anyone can view section_subjects" ON public.section_subjects
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Anyone can view faculty" ON public.faculty;
CREATE POLICY "Anyone can view faculty" ON public.faculty
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Anyone can view faculty assignments" ON public.faculty_assignment;
CREATE POLICY "Anyone can view faculty assignments" ON public.faculty_assignment
    FOR SELECT TO authenticated, anon
    USING (true);

-- 2. Ensure students in sections can be viewed by faculty and admins
DROP POLICY IF EXISTS "Authenticated can view students" ON public.students;
CREATE POLICY "Authenticated can view students" ON public.students
    FOR SELECT TO authenticated, anon
    USING (true);

-- 3. Ensure attendance sessions and records can be created and viewed
DROP POLICY IF EXISTS "Authenticated can view attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Authenticated can view attendance sessions" ON public.attendance_sessions
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Authenticated can insert attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Authenticated can insert attendance sessions" ON public.attendance_sessions
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Authenticated can update attendance sessions" ON public.attendance_sessions
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view attendance records" ON public.attendance_records;
CREATE POLICY "Authenticated can view attendance records" ON public.attendance_records
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Authenticated can insert attendance records" ON public.attendance_records;
CREATE POLICY "Authenticated can insert attendance records" ON public.attendance_records
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update attendance records" ON public.attendance_records;
CREATE POLICY "Authenticated can update attendance records" ON public.attendance_records
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);
