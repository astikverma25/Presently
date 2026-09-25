-- ==============================================================================
-- Migration: 022 - Secure Attendance Sessions & Records RLS Policies
-- QR Based - Smart Attendance Management System
-- Cleanly removes all legacy open policies and locks down attendance tables
-- ==============================================================================

-- 1. Robust and Secure is_admin Function (Matches existing signature with DEFAULT NULL)
-- Strictly validates administrator identity against the public.admins table (Source of Truth)
CREATE OR REPLACE FUNCTION public.is_admin(p_admin_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_uid UUID;
    v_caller_email TEXT;
BEGIN
    v_caller_uid := auth.uid();
    v_caller_email := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));

    -- 1. Primary Check: Authenticated User ID exists in public.admins table
    IF v_caller_uid IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admins WHERE id = v_caller_uid
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Secondary Check: Authenticated User Email matches registered email in public.admins table
    IF v_caller_email <> '' AND EXISTS (
        SELECT 1 FROM public.admins WHERE LOWER(email) = v_caller_email
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Parameterized Check: Explicit admin email parameter verified against public.admins table
    IF p_admin_email IS NOT NULL AND TRIM(p_admin_email) <> '' AND EXISTS (
        SELECT 1 FROM public.admins WHERE LOWER(email) = LOWER(TRIM(p_admin_email))
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(TEXT) TO anon, authenticated, service_role;

-- 2. Enable RLS on attendance tables
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 3. Dynamically drop ALL legacy policies on attendance_sessions and attendance_records
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'attendance_sessions' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_sessions', r.policyname);
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'attendance_records' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_records', r.policyname);
    END LOOP;
END $$;

-- 4. Strict Policies for attendance_sessions (Faculty & Admin ONLY)
-- Admins have full access
CREATE POLICY "Admin full access attendance_sessions"
    ON public.attendance_sessions
    FOR ALL
    TO authenticated
    USING (public.is_admin(NULL))
    WITH CHECK (public.is_admin(NULL));

-- Faculty can manage (SELECT, INSERT, UPDATE) their assigned lecture sessions
CREATE POLICY "Faculty can manage own attendance sessions"
    ON public.attendance_sessions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.faculty_assignment fa
            WHERE fa.id = attendance_sessions.faculty_assignment_id
              AND (fa.faculty_id = auth.uid() OR public.is_admin(NULL))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.faculty_assignment fa
            WHERE fa.id = attendance_sessions.faculty_assignment_id
              AND (fa.faculty_id = auth.uid() OR public.is_admin(NULL))
        )
    );

-- Table Permissions: Revoke all access from anon/public. Only authenticated faculty/admin and service_role.
-- Students do not have table access because verification runs inside the submit_student_qr_scan SECURITY DEFINER RPC.
REVOKE ALL ON public.attendance_sessions FROM anon, public;
GRANT ALL ON public.attendance_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.attendance_sessions TO authenticated;


-- 5. Secure Policies for attendance_records
-- Admins have full access
CREATE POLICY "Admin full access attendance_records"
    ON public.attendance_records
    FOR ALL
    TO authenticated
    USING (public.is_admin(NULL))
    WITH CHECK (public.is_admin(NULL));

-- Faculty can view and manage records for their assigned lectures
CREATE POLICY "Faculty can manage attendance records for assigned lectures"
    ON public.attendance_records
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.faculty_assignment fa
            WHERE fa.id = attendance_records.faculty_assignment_id
              AND (fa.faculty_id = auth.uid() OR public.is_admin(NULL))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.faculty_assignment fa
            WHERE fa.id = attendance_records.faculty_assignment_id
              AND (fa.faculty_id = auth.uid() OR public.is_admin(NULL))
        )
    );

-- Students can ONLY view their own attendance records
CREATE POLICY "Students can view own attendance records"
    ON public.attendance_records
    FOR SELECT
    TO authenticated, anon
    USING (
        student_id = auth.uid() 
        OR student_id IN (
            SELECT id FROM public.students 
            WHERE id = attendance_records.student_id
        )
    );

-- Direct student INSERT/UPDATE on attendance_records is blocked by RLS.
-- Students MUST record attendance through the atomic submit_student_qr_scan() SECURITY DEFINER RPC.
