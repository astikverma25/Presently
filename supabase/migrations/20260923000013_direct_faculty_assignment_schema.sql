-- ==============================================================================
-- Migration: 013 - Direct Foreign Keys for faculty_assignment
-- QR Based - Smart Attendance Management System
-- Simplifies 3-level junction joins into flat 1-level direct foreign keys:
--   faculty_assignment (faculty_id, subject_id, section_id, lec_id, lec_date, ...)
-- ==============================================================================

-- 1. Add direct subject_id and section_id columns to faculty_assignment
ALTER TABLE public.faculty_assignment 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE;

-- 2. Backfill existing records from section_subjects if section_subject_id column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'faculty_assignment' 
          AND column_name = 'section_subject_id'
    ) THEN
        UPDATE public.faculty_assignment fa
        SET subject_id = ss.subject_id,
            section_id = ss.section_id
        FROM public.section_subjects ss
        WHERE fa.section_subject_id = ss.id
          AND (fa.subject_id IS NULL OR fa.section_id IS NULL);
    END IF;
END $$;

-- 3. Drop legacy policies that reference section_subject_id before dropping the column
DROP POLICY IF EXISTS "Faculty can view assigned sections" ON public.sections;
DROP POLICY IF EXISTS "Faculty can view assigned section students" ON public.students;
DROP POLICY IF EXISTS "Anyone can view section_subjects" ON public.section_subjects;
DROP POLICY IF EXISTS "Admin full access section_subjects" ON public.section_subjects;
DROP POLICY IF EXISTS "Allow all for section_subjects" ON public.section_subjects;
DROP POLICY IF EXISTS "Anyone can view faculty assignments" ON public.faculty_assignment;
DROP POLICY IF EXISTS "Admin full access faculty_assignment" ON public.faculty_assignment;
DROP POLICY IF EXISTS "Allow all for faculty_assignment" ON public.faculty_assignment;

-- 4. Drop obsolete section_subject_id column from faculty_assignment (with CASCADE to be safe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'faculty_assignment' 
          AND column_name = 'section_subject_id'
    ) THEN
        ALTER TABLE public.faculty_assignment DROP COLUMN section_subject_id CASCADE;
    END IF;
END $$;

-- 5. Drop obsolete section_subjects table
DROP TABLE IF EXISTS public.section_subjects CASCADE;

-- 6. Refresh clean RLS policies for all tables
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for sections" ON public.sections;
CREATE POLICY "Allow all for sections" ON public.sections
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for students" ON public.students;
CREATE POLICY "Allow all for students" ON public.students
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

ALTER TABLE public.faculty_assignment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for faculty_assignment" ON public.faculty_assignment
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);
