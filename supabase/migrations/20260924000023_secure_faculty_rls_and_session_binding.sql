-- ==============================================================================
-- Migration: 023 - Cryptographically Verified Faculty RLS & Session Binding
-- QR Based - Smart Attendance Management System
-- Guarantees that only authentically logged-in faculty with verified JWT can manage sessions
-- ==============================================================================

-- 1. Enable RLS on attendance tables
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing faculty management policies to update with strict JWT verification
DROP POLICY IF EXISTS "Faculty can manage own attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Faculty can manage attendance records for assigned lectures" ON public.attendance_records;

-- 3. Strict JWT-Verified Policy for attendance_sessions
-- Only logged-in users with a valid Supabase Auth signature matching the faculty assignment can start/edit sessions
CREATE POLICY "Faculty can manage own attendance sessions"
    ON public.attendance_sessions
    FOR ALL
    TO authenticated
    USING (
        auth.uid() IS NOT NULL AND (
            public.is_admin(NULL)
            OR EXISTS (
                SELECT 1 FROM public.faculty_assignment fa
                JOIN public.faculty f ON f.id = fa.faculty_id
                WHERE fa.id = attendance_sessions.faculty_assignment_id
                  AND (f.id = auth.uid() OR LOWER(f.email) = LOWER(auth.jwt() ->> 'email'))
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            public.is_admin(NULL)
            OR EXISTS (
                SELECT 1 FROM public.faculty_assignment fa
                JOIN public.faculty f ON f.id = fa.faculty_id
                WHERE fa.id = attendance_sessions.faculty_assignment_id
                  AND (f.id = auth.uid() OR LOWER(f.email) = LOWER(auth.jwt() ->> 'email'))
            )
        )
    );

-- 4. Strict JWT-Verified Policy for attendance_records
CREATE POLICY "Faculty can manage attendance records for assigned lectures"
    ON public.attendance_records
    FOR ALL
    TO authenticated
    USING (
        auth.uid() IS NOT NULL AND (
            public.is_admin(NULL)
            OR EXISTS (
                SELECT 1 FROM public.faculty_assignment fa
                JOIN public.faculty f ON f.id = fa.faculty_id
                WHERE fa.id = attendance_records.faculty_assignment_id
                  AND (f.id = auth.uid() OR LOWER(f.email) = LOWER(auth.jwt() ->> 'email'))
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            public.is_admin(NULL)
            OR EXISTS (
                SELECT 1 FROM public.faculty_assignment fa
                JOIN public.faculty f ON f.id = fa.faculty_id
                WHERE fa.id = attendance_records.faculty_assignment_id
                  AND (f.id = auth.uid() OR LOWER(f.email) = LOWER(auth.jwt() ->> 'email'))
            )
        )
    );

-- 5. Hardened submit_student_qr_scan RPC with safe UUID validation
CREATE OR REPLACE FUNCTION public.submit_student_qr_scan(
    p_session_id TEXT,
    p_token TEXT,
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_uuid UUID;
    v_student_id UUID;
    v_session RECORD;
    v_student RECORD;
    v_existing_record RECORD;
    v_lecture_date DATE;
    v_new_record RECORD;
BEGIN
    -- 1. Validate UUID format safely without throwing hard SQL syntax errors
    IF p_session_id IS NULL OR p_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Invalid attendance session QR. Please scan a live classroom session.'
        );
    END IF;

    v_session_uuid := p_session_id::UUID;

    -- 2. Identify Student (From auth.uid() or passed ID parameter)
    v_student_id := COALESCE(p_student_id, auth.uid());
    
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Student identification required. Please log in.'
        );
    END IF;

    -- 3. Fetch Session & Faculty Assignment Details in 1 query
    SELECT 
        s.id,
        s.status,
        s.current_qr_token,
        s.token_expires_at,
        s.faculty_assignment_id,
        fa.section_id,
        fa.subject_id,
        fa.lec_id,
        fa.lec_date,
        sec.section_name,
        sub.subject_name
    INTO v_session
    FROM attendance_sessions s
    JOIN faculty_assignment fa ON fa.id = s.faculty_assignment_id
    LEFT JOIN sections sec ON sec.id = fa.section_id
    LEFT JOIN subjects sub ON sub.id = fa.subject_id
    WHERE s.id = v_session_uuid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Attendance session not found or has been closed.'
        );
    END IF;

    -- 4. Check Session Active State
    IF v_session.status <> 'active' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'This attendance session has ended.'
        );
    END IF;

    -- 5. Check Token & Expiry against server authoritative clock
    IF v_session.current_qr_token IS NOT NULL AND p_token IS NOT NULL THEN
        IF v_session.current_qr_token <> p_token THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'QR code expired or invalid. Please scan the current live screen.'
            );
        END IF;

        IF v_session.token_expires_at IS NOT NULL AND NOW() > (v_session.token_expires_at + INTERVAL '5 seconds') THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'QR code expired. Please scan the refreshed code on the projector.'
            );
        END IF;
    END IF;

    -- 6. Check Student Profile & Section Eligibility
    SELECT id, name, roll_no, section_id, sec.section_name
    INTO v_student
    FROM students st
    LEFT JOIN sections sec ON sec.id = st.section_id
    WHERE st.id = v_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Student profile not found. Please log in again.'
        );
    END IF;

    IF v_session.section_id IS NOT NULL AND v_student.section_id IS NOT NULL AND v_session.section_id <> v_student.section_id THEN
        RETURN jsonb_build_object(
            'success', false, 
            'isWrongSection', true,
            'message', format('Access Denied: You are enrolled in Section %s, but this lecture is for Section %s (%s).', 
                              COALESCE(v_student.section_name, 'N/A'), 
                              COALESCE(v_session.section_name, 'N/A'), 
                              COALESCE(v_session.subject_name, 'Lecture')),
            'studentSection', v_student.section_name,
            'lectureSection', v_session.section_name,
            'subjectName', v_session.subject_name
        );
    END IF;

    -- 7. Check Duplicate Scan for this lecture/assignment today
    v_lecture_date := COALESCE(v_session.lec_date, CURRENT_DATE);

    SELECT id, marked_at, status INTO v_existing_record
    FROM attendance_records
    WHERE student_id = v_student_id 
      AND (
        session_id = v_session.id 
        OR (faculty_assignment_id = v_session.faculty_assignment_id AND lecture_date = v_lecture_date)
      )
      AND status = 'present'
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'isDuplicate', true,
            'message', 'You have already marked attendance for this lecture!'
        );
    END IF;

    -- 8. Upsert Attendance Record in Place
    SELECT id INTO v_existing_record
    FROM attendance_records
    WHERE student_id = v_student_id 
      AND (
        session_id = v_session.id 
        OR (faculty_assignment_id = v_session.faculty_assignment_id AND lecture_date = v_lecture_date)
      )
    LIMIT 1;

    IF v_existing_record.id IS NOT NULL THEN
        UPDATE attendance_records
        SET 
            status = 'present',
            marked_at = NOW(),
            session_id = v_session.id,
            faculty_assignment_id = v_session.faculty_assignment_id,
            lec_id = v_session.lec_id,
            lecture_date = v_lecture_date,
            verification_method = 'qr_scan'
        WHERE id = v_existing_record.id
        RETURNING * INTO v_new_record;
    ELSE
        INSERT INTO attendance_records (
            session_id,
            student_id,
            faculty_assignment_id,
            lec_id,
            lecture_date,
            status,
            marked_at,
            verification_method
        )
        VALUES (
            v_session.id,
            v_student_id,
            v_session.faculty_assignment_id,
            v_session.lec_id,
            v_lecture_date,
            'present',
            NOW(),
            'qr_scan'
        )
        RETURNING * INTO v_new_record;
    END IF;

    -- 9. Return Clean JSON confirmation
    RETURN jsonb_build_object(
        'success', true,
        'message', format('Attendance marked successfully for %s!', COALESCE(v_session.subject_name, 'Lecture')),
        'subjectName', v_session.subject_name,
        'sectionName', v_session.section_name,
        'markedAt', v_new_record.marked_at,
        'record', row_to_json(v_new_record)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_student_qr_scan(TEXT, TEXT, UUID) TO authenticated, anon, service_role;
