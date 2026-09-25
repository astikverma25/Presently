-- ==============================================================================
-- Migration: 024 - Fix Overloaded submit_student_qr_scan Function Ambiguity
-- QR Based - Smart Attendance Management System
-- ==============================================================================

-- 1. Explicitly drop all overloaded versions of submit_student_qr_scan to resolve PGRST203
DROP FUNCTION IF EXISTS public.submit_student_qr_scan(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.submit_student_qr_scan(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.submit_student_qr_scan(UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_student_qr_scan(TEXT, TEXT);

-- 2. Create the Single Canonical Atomic Fast-Path RPC
CREATE OR REPLACE FUNCTION public.submit_student_qr_scan(
    p_session_id TEXT,
    p_token TEXT,
    p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
    -- 1. Validate UUID format safely
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

    -- 6. Fetch Student Information & Enrolled Section
    SELECT 
        std.id,
        std.name,
        std.roll_no,
        std.section_id,
        sec.section_name AS enrolled_section_name
    INTO v_student
    FROM students std
    LEFT JOIN sections sec ON sec.id = std.section_id
    WHERE std.id = v_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Student record not found in institution database.'
        );
    END IF;

    -- 7. Anti-Proxy Section Validation Guard
    IF v_session.section_id IS NOT NULL AND v_student.section_id IS NOT NULL THEN
        IF v_session.section_id <> v_student.section_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'isWrongSection', true,
                'message', FORMAT('Access Denied: You are enrolled in Section %s, but this QR session is for Section %s (%s).',
                    COALESCE(v_student.enrolled_section_name, 'Unknown'),
                    COALESCE(v_session.section_name, 'Unknown'),
                    COALESCE(v_session.subject_name, 'Lecture')
                ),
                'studentSection', v_student.enrolled_section_name,
                'lectureSection', v_session.section_name,
                'subjectName', v_session.subject_name
            );
        END IF;
    END IF;

    -- 8. Compute lecture date
    v_lecture_date := COALESCE(v_session.lec_date, (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE);

    -- 9. Check if already marked
    SELECT id, status, marked_at
    INTO v_existing_record
    FROM attendance_records
    WHERE student_id = v_student_id
      AND (
          session_id = v_session_uuid
          OR (faculty_assignment_id = v_session.faculty_assignment_id AND lecture_date = v_lecture_date)
      )
    LIMIT 1;

    IF FOUND AND v_existing_record.status = 'present' THEN
        RETURN jsonb_build_object(
            'success', true,
            'isAlreadyMarked', true,
            'message', 'Attendance already verified and recorded for this lecture!',
            'studentName', v_student.name,
            'rollNo', v_student.roll_no,
            'section', v_session.section_name,
            'subject', v_session.subject_name,
            'markedAt', v_existing_record.marked_at,
            'recordId', v_existing_record.id
        );
    END IF;

    -- 10. Atomic Upsert Attendance Record
    INSERT INTO attendance_records (
        student_id,
        session_id,
        faculty_assignment_id,
        lec_id,
        lecture_date,
        status,
        marked_at,
        verification_method,
        created_at
    )
    VALUES (
        v_student_id,
        v_session_uuid,
        v_session.faculty_assignment_id,
        v_session.lec_id,
        v_lecture_date,
        'present',
        NOW(),
        'qr_scan',
        NOW()
    )
    ON CONFLICT (student_id, session_id) DO UPDATE SET
        status = 'present',
        marked_at = NOW(),
        verification_method = 'qr_scan'
    RETURNING id, student_id, session_id, status, marked_at
    INTO v_new_record;

    RETURN jsonb_build_object(
        'success', true,
        'isNewScan', true,
        'message', 'Attendance marked successfully!',
        'studentName', v_student.name,
        'rollNo', v_student.roll_no,
        'section', v_session.section_name,
        'subject', v_session.subject_name,
        'markedAt', v_new_record.marked_at,
        'recordId', v_new_record.id
    );
END;
$$;

-- 3. Grant execute permissions explicitly to all roles
GRANT EXECUTE ON FUNCTION public.submit_student_qr_scan(TEXT, TEXT, UUID) TO anon, authenticated, service_role;

-- 4. Enable read access on active attendance_sessions for fallback queries
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Public view active attendance sessions"
    ON public.attendance_sessions
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.attendance_sessions TO anon, authenticated;
