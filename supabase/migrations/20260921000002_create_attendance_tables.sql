-- ==============================================================================
-- Migration: 002 - Attendance Sessions & Records
-- QR Based - Smart Attendance Management System
-- Matches Docs/Database_Schema_QR_Attendance_System.md
-- ==============================================================================

-- 7. attendance_sessions
-- One QR session instance for a lecture
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_assignment_id UUID NOT NULL REFERENCES public.faculty_assignment(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    qr_expiry_sec INTEGER NOT NULL DEFAULT 15,    -- Default 15, editable by faculty at session start
    current_qr_token TEXT,                         -- Dynamic rolling cryptographic token
    token_expires_at TIMESTAMPTZ,                  -- Rolling token timestamp
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. attendance_records
-- One student's attendance mark for a session
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late')),
    marked_at TIMESTAMPTZ,                         -- Null if absent
    verification_method TEXT DEFAULT 'qr_scan',    -- 'qr_scan', 'manual_override', 'face_verified'
    device_id TEXT,                                -- Device anti-proxy tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- Indices for high-concurrency QR scan checks and report generation
CREATE INDEX IF NOT EXISTS idx_att_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_assignment ON public.attendance_sessions(faculty_assignment_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_date ON public.attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_faculty_assignment_faculty ON public.faculty_assignment(faculty_id);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_roll ON public.students(roll_no);
