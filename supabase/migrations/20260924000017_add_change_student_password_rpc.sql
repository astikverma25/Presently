-- ==============================================================================
-- Migration: 017 - Secure Student Password Change RPC
-- Allows authenticated students to update their password securely
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.change_student_password(
    p_student_id UUID,
    p_current_password_hash TEXT,
    p_new_password_hash TEXT,
    p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
BEGIN
    -- 1. Validate active session token (Prevents unauthorized password updates)
    SELECT * INTO v_student
    FROM public.students
    WHERE id = p_student_id
      AND session_token = p_session_token
      AND (session_expires_at IS NULL OR session_expires_at > NOW());

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session invalid or expired. Please re-login.');
    END IF;

    -- 2. Verify current password hash if student already has a password set
    IF v_student.password_hash IS NOT NULL AND v_student.password_hash <> '' THEN
        IF v_student.password_hash <> p_current_password_hash THEN
            RETURN jsonb_build_object('success', false, 'message', 'Current password is incorrect. Please verify and try again.');
        END IF;
    END IF;

    -- 3. Validate new password hash is not empty
    IF p_new_password_hash IS NULL OR p_new_password_hash = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'New password cannot be empty.');
    END IF;

    -- 4. Update to new password hash
    UPDATE public.students
    SET password_hash = p_new_password_hash
    WHERE id = p_student_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password updated successfully! Your account is now secured with your new password.'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.change_student_password(UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
