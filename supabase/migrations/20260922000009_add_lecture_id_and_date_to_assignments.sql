-- ==============================================================================
-- Migration: 009 - Add Lecture ID, Date, and Lifecycle Status to Assignments
-- QR Based - Smart Attendance Management System
-- Matches user dynamic schedule model & source of truth architecture
-- ==============================================================================

-- 1. Add lec_id, lec_date, and status columns to faculty_assignment
ALTER TABLE public.faculty_assignment
ADD COLUMN IF NOT EXISTS lec_id TEXT,
ADD COLUMN IF NOT EXISTS lec_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled'));

-- 2. Backfill existing faculty_assignment rows with unique readable lec_id if null
UPDATE public.faculty_assignment
SET lec_id = 'LEC-' || TO_CHAR(COALESCE(lec_date, CURRENT_DATE), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(id::TEXT, 1, 6))
WHERE lec_id IS NULL;

-- 3. Make lec_id UNIQUE and NOT NULL
ALTER TABLE public.faculty_assignment
ALTER COLUMN lec_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'faculty_assignment_lec_id_unique'
    ) THEN
        ALTER TABLE public.faculty_assignment ADD CONSTRAINT faculty_assignment_lec_id_unique UNIQUE (lec_id);
    END IF;
END $$;

-- 4. Create indices on lec_id, lec_date, and status for instant lookups
CREATE INDEX IF NOT EXISTS idx_faculty_assignment_lec_id ON public.faculty_assignment(lec_id);
CREATE INDEX IF NOT EXISTS idx_faculty_assignment_lec_date ON public.faculty_assignment(lec_date);
CREATE INDEX IF NOT EXISTS idx_faculty_assignment_status ON public.faculty_assignment(status);

-- 5. Update attendance_records to support direct lecture reference and safe session cleanup
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS faculty_assignment_id UUID REFERENCES public.faculty_assignment(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS lec_id TEXT,
ADD COLUMN IF NOT EXISTS lecture_date DATE DEFAULT CURRENT_DATE;

-- Drop old strict foreign key and replace with ON DELETE SET NULL
ALTER TABLE public.attendance_records
DROP CONSTRAINT IF EXISTS attendance_records_session_id_fkey;

ALTER TABLE public.attendance_records
ALTER COLUMN session_id DROP NOT NULL,
ADD CONSTRAINT attendance_records_session_id_fkey 
    FOREIGN KEY (session_id) 
    REFERENCES public.attendance_sessions(id) 
    ON DELETE SET NULL;

-- 6. Indices on attendance_records for lecture_id and date
CREATE INDEX IF NOT EXISTS idx_att_records_assignment ON public.attendance_records(faculty_assignment_id);
CREATE INDEX IF NOT EXISTS idx_att_records_lec_id ON public.attendance_records(lec_id);
CREATE INDEX IF NOT EXISTS idx_att_records_lec_date ON public.attendance_records(lecture_date);

-- 7. Grant necessary permissions on updated tables
GRANT ALL ON TABLE public.faculty_assignment TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attendance_records TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attendance_sessions TO anon, authenticated, service_role;
