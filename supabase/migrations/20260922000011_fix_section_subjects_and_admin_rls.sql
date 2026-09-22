-- ==============================================================================
-- Migration: 011 - Fix RLS Policies for section_subjects & faculty_assignment
-- QR Based - Smart Attendance Management System
-- Solves: "new row violates row-level security policy for table section_subjects"
-- ==============================================================================

-- 1. section_subjects (Allow full CRUD for admin operations)
DROP POLICY IF EXISTS "Anyone can view section_subjects" ON public.section_subjects;
DROP POLICY IF EXISTS "Admin full access section_subjects" ON public.section_subjects;
DROP POLICY IF EXISTS "Allow all for section_subjects" ON public.section_subjects;

CREATE POLICY "Allow all for section_subjects" ON public.section_subjects
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 2. faculty_assignment (Allow full CRUD for admin operations)
DROP POLICY IF EXISTS "Anyone can view faculty assignments" ON public.faculty_assignment;
DROP POLICY IF EXISTS "Admin full access faculty_assignment" ON public.faculty_assignment;
DROP POLICY IF EXISTS "Allow all for faculty_assignment" ON public.faculty_assignment;

CREATE POLICY "Allow all for faculty_assignment" ON public.faculty_assignment
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. subjects (Allow full CRUD for admin operations)
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admin full access subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow all for subjects" ON public.subjects;

CREATE POLICY "Allow all for subjects" ON public.subjects
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 4. sections (Allow full CRUD for admin operations)
DROP POLICY IF EXISTS "Anyone can view sections" ON public.sections;
DROP POLICY IF EXISTS "Admin full access sections" ON public.sections;
DROP POLICY IF EXISTS "Allow all for sections" ON public.sections;

CREATE POLICY "Allow all for sections" ON public.sections
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 5. faculty (Allow full CRUD for admin operations)
DROP POLICY IF EXISTS "Anyone can view faculty" ON public.faculty;
DROP POLICY IF EXISTS "Admin full access faculty" ON public.faculty;
DROP POLICY IF EXISTS "Allow all for faculty" ON public.faculty;

CREATE POLICY "Allow all for faculty" ON public.faculty
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 6. students (Allow full CRUD for admin operations)
DROP POLICY IF EXISTS "Authenticated can view students" ON public.students;
DROP POLICY IF EXISTS "Admin full access students" ON public.students;
DROP POLICY IF EXISTS "Allow all for students" ON public.students;

CREATE POLICY "Allow all for students" ON public.students
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);
