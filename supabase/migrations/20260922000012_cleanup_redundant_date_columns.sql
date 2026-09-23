-- ==============================================================================
-- Migration: 012 - Cleanup Redundant Date and Day Columns
-- QR Based - Smart Attendance Management System
-- Eliminates duplicate columns to guarantee a Single Source of Truth
-- ==============================================================================

-- 1. Drop redundant day_of_week column from faculty_assignment
-- (lec_date is the single source of truth; day of week is derived from lec_date)
ALTER TABLE public.faculty_assignment
DROP COLUMN IF EXISTS day_of_week;

-- 2. Drop redundant date column and index from attendance_sessions
-- (started_at TIMESTAMPTZ and linked faculty_assignment.lec_date / attendance_records.lecture_date are canonical)
DROP INDEX IF EXISTS public.idx_att_sessions_date;

ALTER TABLE public.attendance_sessions
DROP COLUMN IF EXISTS date;
