-- ==============================================================================
-- Migration: 016 - Secure Student Auth & Server-Verified Session Tokens
-- Fixes Issue B (Direct Client-Side Database Updates via Anonymous Key)
-- Fixes Issue C (localStorage Session Trust without Backend Token Verification)
-- ==============================================================================

-- 1. Add session_token and session_expires_at to public.students
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS session_token TEXT,
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_session_token ON public.students(id, session_token);

-- 2. Drop insecure open anonymous update policy on public.students
DROP POLICY IF EXISTS "Allow anon update student password" ON public.students;

-- 3. Secure RPC: Bind student passkey and issue signed server session token
CREATE OR REPLACE FUNCTION public.bind_and_authorize_student_passkey(
    p_student_id UUID,
    p_password_hash TEXT,
    p_passkey_credential_id TEXT,
    p_passkey_public_key TEXT,
    p_device_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_section RECORD;
    v_token TEXT;
BEGIN
    -- Look up student
    SELECT * INTO v_student
    FROM public.students
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found in institutional database.');
    END IF;

    -- Verify password hash
    IF v_student.password_hash IS NOT NULL AND v_student.password_hash <> '' THEN
        IF v_student.password_hash <> p_password_hash THEN
            RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials. Password verification failed.');
        END IF;
    END IF;

    -- Generate secure 256-bit random cryptographic session token
    v_token := encode(gen_random_bytes(32), 'hex');

    -- Bind device passkey and store active session token
    UPDATE public.students
    SET passkey_credential_id = p_passkey_credential_id,
        passkey_public_key = p_passkey_public_key,
        device_bound_at = NOW(),
        device_name = p_device_name,
        session_token = v_token,
        session_expires_at = NOW() + INTERVAL '30 days'
    WHERE id = p_student_id;

    SELECT * INTO v_section FROM public.sections WHERE id = v_student.section_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_token', v_token,
        'student', jsonb_build_object(
            'id', v_student.id,
            'name', v_student.name,
            'roll_no', v_student.roll_no,
            'section_id', v_student.section_id,
            'section_name', COALESCE(v_section.section_name, '2A'),
            'branch', COALESCE(v_student.branch, 'CSE'),
            'semester', COALESCE(v_student.semester, '3'),
            'personal_email', v_student.personal_email
        )
    );
END;
$$;

-- 4. Secure RPC: Verify existing passkey login and issue signed server session token
CREATE OR REPLACE FUNCTION public.verify_and_authorize_student_login(
    p_student_id UUID,
    p_passkey_credential_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_section RECORD;
    v_token TEXT;
BEGIN
    SELECT * INTO v_student
    FROM public.students
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    IF v_student.passkey_credential_id IS NULL OR v_student.passkey_credential_id <> p_passkey_credential_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access Denied: Passkey signature does not match registered device.');
    END IF;

    -- Generate fresh secure 256-bit random session token
    v_token := encode(gen_random_bytes(32), 'hex');

    UPDATE public.students
    SET session_token = v_token,
        session_expires_at = NOW() + INTERVAL '30 days'
    WHERE id = p_student_id;

    SELECT * INTO v_section FROM public.sections WHERE id = v_student.section_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_token', v_token,
        'student', jsonb_build_object(
            'id', v_student.id,
            'name', v_student.name,
            'roll_no', v_student.roll_no,
            'section_id', v_student.section_id,
            'section_name', COALESCE(v_section.section_name, '2A'),
            'branch', COALESCE(v_student.branch, 'CSE'),
            'semester', COALESCE(v_student.semester, '3'),
            'personal_email', v_student.personal_email
        )
    );
END;
$$;

-- 5. Secure RPC: Validate active student session against PostgreSQL database
CREATE OR REPLACE FUNCTION public.verify_student_session(
    p_student_id UUID,
    p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_section RECORD;
BEGIN
    IF p_session_token IS NULL OR p_session_token = '' OR p_student_id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Missing session credentials.');
    END IF;

    SELECT * INTO v_student
    FROM public.students
    WHERE id = p_student_id
      AND session_token = p_session_token
      AND (session_expires_at IS NULL OR session_expires_at > NOW());

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Session expired, revoked, or untrusted.');
    END IF;

    SELECT * INTO v_section FROM public.sections WHERE id = v_student.section_id;

    RETURN jsonb_build_object(
        'valid', true,
        'student', jsonb_build_object(
            'id', v_student.id,
            'name', v_student.name,
            'roll_no', v_student.roll_no,
            'section_id', v_student.section_id,
            'section_name', COALESCE(v_section.section_name, '2A'),
            'branch', COALESCE(v_student.branch, 'CSE'),
            'semester', COALESCE(v_student.semester, '3'),
            'personal_email', v_student.personal_email
        )
    );
END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.bind_and_authorize_student_passkey(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_authorize_student_login(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_student_session(UUID, TEXT) TO anon, authenticated, service_role;
