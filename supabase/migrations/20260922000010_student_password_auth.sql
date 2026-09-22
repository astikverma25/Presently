-- ==============================================================================
-- Migration: 010 - Student Password Authentication & RLS
-- Allows students to set/verify their password_hash and login securely
-- ==============================================================================

-- 1. Create a secure RPC function to authenticate or initialize student password
CREATE OR REPLACE FUNCTION public.verify_or_init_student_login(
    p_identifier TEXT,
    p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_section RECORD;
    v_result JSONB;
BEGIN
    -- 1. Lookup student by roll_no, login_username, or personal_email
    SELECT * INTO v_student
    FROM public.students
    WHERE roll_no = p_identifier
       OR login_username = p_identifier
       OR LOWER(personal_email) = LOWER(p_identifier)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Student with Roll No / Username "' || p_identifier || '" not found in institutional records.'
        );
    END IF;

    -- 2. Lookup section details
    SELECT * INTO v_section
    FROM public.sections
    WHERE id = v_student.section_id
    LIMIT 1;

    -- 3. If student has no password_hash set yet (First-time login)
    IF v_student.password_hash IS NULL OR v_student.password_hash = '' THEN
        UPDATE public.students
        SET password_hash = p_password_hash,
            login_username = COALESCE(login_username, v_student.roll_no)
        WHERE id = v_student.id;

        RETURN jsonb_build_object(
            'success', true,
            'is_new', true,
            'student', jsonb_build_object(
                'id', v_student.id,
                'name', v_student.name,
                'roll_no', v_student.roll_no,
                'section_id', v_student.section_id,
                'section_name', COALESCE(v_section.section_name, '2A'),
                'branch', COALESCE(v_student.branch, 'CSE'),
                'semester', COALESCE(v_student.semester, '3rd'),
                'personal_email', v_student.personal_email
            )
        );
    END IF;

    -- 4. Verify password hash
    IF v_student.password_hash = p_password_hash THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_new', false,
            'student', jsonb_build_object(
                'id', v_student.id,
                'name', v_student.name,
                'roll_no', v_student.roll_no,
                'section_id', v_student.section_id,
                'section_name', COALESCE(v_section.section_name, '2A'),
                'branch', COALESCE(v_student.branch, 'CSE'),
                'semester', COALESCE(v_student.semester, '3rd'),
                'personal_email', v_student.personal_email
            )
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Incorrect password. Please verify and try again.'
        );
    END IF;
END;
$$;

-- 2. Add an RLS policy for students to update their password directly as fallback
DROP POLICY IF EXISTS "Allow anon update student password" ON public.students;
CREATE POLICY "Allow anon update student password" ON public.students
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Grant execute permissions on RPC to anon and authenticated
GRANT EXECUTE ON FUNCTION public.verify_or_init_student_login(TEXT, TEXT) TO anon, authenticated;
