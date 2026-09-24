-- ==============================================================================
-- Migration: 020 - Secure Admin Operations & is_admin Authorization Guards
-- ==============================================================================

-- 1. Enhanced and Robust is_admin Function (Supports both JWT claims & explicit admin email check)
CREATE OR REPLACE FUNCTION public.is_admin(p_admin_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- 1. Extract email from parameter or JWT token claims
    v_email := LOWER(TRIM(COALESCE(p_admin_email, auth.jwt() ->> 'email', '')));

    -- 2. Check JWT metadata role
    IF (auth.jwt() ->> 'role') = 'admin'
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
       OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 3. Check if email exists in public.admins registry table
    IF v_email <> '' AND EXISTS (
        SELECT 1 FROM public.admins WHERE LOWER(email) = v_email
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Check designated institutional super admin whitelist
    IF v_email IN (
        'vishalgupta@liet.in',
        'vishalgupta',
        'admin@liet.in',
        'admin@presently.edu',
        'admin@university.edu',
        'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. Secure Reset Student Device RPC (Protected by is_admin check)
CREATE OR REPLACE FUNCTION public.reset_student_device(
    p_student_id UUID,
    p_admin_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Verify administrator authorization
    IF NOT public.is_admin(p_admin_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Access Denied: Only authorized administrators can reset student device bindings.'
        );
    END IF;

    UPDATE public.students
    SET passkey_credential_id = NULL,
        passkey_public_key = NULL,
        device_bound_at = NULL,
        device_name = NULL,
        session_token = NULL,
        session_expires_at = NULL
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student hardware passkey & device binding reset successfully. The student can register their new device on their next login.'
    );
END;
$$;

-- 3. Secure Admin Delete Student RPC (Protected by is_admin check)
CREATE OR REPLACE FUNCTION public.admin_delete_student(
    p_student_id UUID,
    p_admin_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin(p_admin_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Access Denied: Only authorized administrators can delete student records.'
        );
    END IF;

    DELETE FROM public.students WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student record deleted successfully.'
    );
END;
$$;

-- 4. Secure Admin Delete Faculty Assignment RPC (Protected by is_admin check)
CREATE OR REPLACE FUNCTION public.admin_delete_assignment(
    p_assignment_id UUID,
    p_admin_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin(p_admin_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Access Denied: Only authorized administrators can delete timetable assignments.'
        );
    END IF;

    DELETE FROM public.faculty_assignment WHERE id = p_assignment_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lecture assignment not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lecture assignment deleted successfully.'
    );
END;
$$;

-- Grant permissions to execute functions
GRANT EXECUTE ON FUNCTION public.is_admin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_student_device(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_student(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_assignment(UUID, TEXT) TO anon, authenticated, service_role;
