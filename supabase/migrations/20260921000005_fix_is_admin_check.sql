-- ==============================================================================
-- Migration: 005 - Case-Insensitive & JWT-Aware is_admin() Function
-- QR Based - Smart Attendance Management System
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_email TEXT;
BEGIN
    -- 1. Check if user ID is present
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Extract email from JWT or auth.users
    current_email := LOWER(COALESCE(auth.jwt() ->> 'email', (SELECT email FROM auth.users WHERE id = auth.uid())));

    -- 3. Check if role is admin in raw_user_meta_data or app_metadata
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND (raw_user_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'admin')
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Check if email exists in public.admins table (case-insensitive)
    IF current_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admins 
        WHERE LOWER(email) = current_email
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
