-- ==============================================================================
-- Migration: 015 - Add Student Device Passkey & WebAuthn Binding
-- QR Based - Smart Attendance Management System
-- Provides bank-grade 1-device-per-student binding
-- ==============================================================================

-- 1. Add WebAuthn Passkey and Device Tracking columns to students
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS passkey_credential_id TEXT,
ADD COLUMN IF NOT EXISTS passkey_public_key TEXT,
ADD COLUMN IF NOT EXISTS device_bound_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS device_name TEXT;

-- 2. Indices for high-speed passkey lookups
CREATE INDEX IF NOT EXISTS idx_students_passkey_cred ON public.students(passkey_credential_id);

-- 3. Stored function for Admin / Coordinator to reset a student's bound device
CREATE OR REPLACE FUNCTION public.reset_student_device(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.students
    SET passkey_credential_id = NULL,
        passkey_public_key = NULL,
        device_bound_at = NULL,
        device_name = NULL
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Device binding reset successfully. Student can now register a new device on next login.'
    );
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.reset_student_device(UUID) TO anon, authenticated, service_role;
