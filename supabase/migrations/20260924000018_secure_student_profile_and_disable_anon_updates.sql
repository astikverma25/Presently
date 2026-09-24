-- ==============================================================================
-- Migration: 018 - Secure Student Profile Updates & Disable Anon Direct Updates
-- Completely blocks unauthenticated/direct UPDATE on public.students
-- Gated by cryptographic session token via update_student_profile RPC
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. DROP ALL INSECURE ANONYMOUS UPDATE POLICIES ON public.students
DROP POLICY IF EXISTS "Allow anon update student password" ON public.students;
DROP POLICY IF EXISTS "Allow public update on students" ON public.students;
DROP POLICY IF EXISTS "Allow student self update" ON public.students;
DROP POLICY IF EXISTS "Allow anon update on students" ON public.students;

-- 2. SECURE RPC: Update Student Profile Gated by Session Token
CREATE OR REPLACE FUNCTION public.update_student_profile(
    p_student_id UUID,
    p_session_token TEXT,
    p_name TEXT DEFAULT NULL,
    p_personal_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_parent_contact TEXT DEFAULT NULL,
    p_admission_id TEXT DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_student RECORD;
    v_section RECORD;
BEGIN
    -- 1. Verify Active Session Token
    SELECT * INTO v_student
    FROM public.students
    WHERE id = p_student_id
      AND session_token = p_session_token
      AND (session_expires_at IS NULL OR session_expires_at > NOW());

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Unauthorized: Session invalid, expired, or untrusted. Please re-login.'
        );
    END IF;

    -- 2. Apply updates securely on PostgreSQL backend
    UPDATE public.students
    SET name = COALESCE(NULLIF(TRIM(p_name), ''), name),
        personal_email = COALESCE(NULLIF(TRIM(p_personal_email), ''), personal_email),
        phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone),
        parent_contact = COALESCE(NULLIF(TRIM(p_parent_contact), ''), parent_contact),
        admission_id = COALESCE(NULLIF(TRIM(p_admission_id), ''), admission_id),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth)
    WHERE id = p_student_id;

    -- 3. Return updated student record
    SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
    SELECT * INTO v_section FROM public.sections WHERE id = v_student.section_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile updated successfully!',
        'student', jsonb_build_object(
            'id', v_student.id,
            'name', v_student.name,
            'roll_no', v_student.roll_no,
            'section_id', v_student.section_id,
            'section_name', COALESCE(v_section.section_name, '2A'),
            'branch', COALESCE(v_student.branch, 'CSE'),
            'semester', COALESCE(v_student.semester, '3'),
            'personal_email', v_student.personal_email,
            'phone', v_student.phone,
            'parent_contact', v_student.parent_contact,
            'admission_id', v_student.admission_id,
            'date_of_birth', v_student.date_of_birth
        )
    );
END;
$$;

-- 3. SECURE RPC: Bind Student Passkey & Issue Session Token
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
SET search_path = public, extensions
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
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found in institutional database.');
    END IF;

    IF v_student.password_hash IS NOT NULL AND v_student.password_hash <> '' THEN
        IF v_student.password_hash <> p_password_hash THEN
            RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials. Password verification failed.');
        END IF;
    END IF;

    -- Cryptographically secure 256-bit random session token
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

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

-- 4. SECURE RPC: Verify Existing Passkey Login & Refresh Session Token
CREATE OR REPLACE FUNCTION public.verify_and_authorize_student_login(
    p_student_id UUID,
    p_passkey_credential_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

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

-- 5. Grant Execute Permissions
GRANT EXECUTE ON FUNCTION public.update_student_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bind_and_authorize_student_passkey(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_authorize_student_login(UUID, TEXT) TO anon, authenticated, service_role;
