-- ==============================================================================
-- Migration: 019 - Atomically Update Faculty Email in auth.users and public.faculty
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.change_faculty_email(
    p_faculty_id UUID,
    p_current_email TEXT,
    p_new_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_old TEXT;
    v_clean_new TEXT;
    v_existing_auth_id UUID;
    v_existing_fac_id UUID;
    v_auth_updated BOOLEAN := FALSE;
    v_fac_updated BOOLEAN := FALSE;
BEGIN
    v_clean_old := LOWER(TRIM(p_current_email));
    v_clean_new := LOWER(TRIM(p_new_email));

    IF v_clean_new IS NULL OR v_clean_new = '' OR POSITION('@' IN v_clean_new) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please enter a valid new email address.');
    END IF;

    IF v_clean_old = v_clean_new THEN
        RETURN jsonb_build_object('success', false, 'message', 'The new email is identical to your current email.');
    END IF;

    -- 1. Check if the new email is already in use by another user in auth.users
    SELECT id INTO v_existing_auth_id
    FROM auth.users
    WHERE LOWER(email) = v_clean_new
      AND LOWER(email) <> v_clean_old
    LIMIT 1;

    IF v_existing_auth_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'The new email is already registered to another user account.');
    END IF;

    -- 2. Check if the new email is already in use by another faculty in public.faculty
    SELECT id INTO v_existing_fac_id
    FROM public.faculty
    WHERE LOWER(email) = v_clean_new
      AND (p_faculty_id IS NULL OR id <> p_faculty_id)
    LIMIT 1;

    IF v_existing_fac_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'The new email is already in use by another faculty record.');
    END IF;

    -- 3. Atomically update auth.users (both email and confirmed state)
    UPDATE auth.users
    SET email = v_clean_new,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        new_email = NULL,
        updated_at = NOW()
    WHERE LOWER(email) = v_clean_old;

    IF FOUND THEN
        v_auth_updated := TRUE;
    END IF;

    -- 4. Atomically update public.faculty table
    IF p_faculty_id IS NOT NULL THEN
        UPDATE public.faculty
        SET email = v_clean_new
        WHERE id = p_faculty_id;

        IF FOUND THEN
            v_fac_updated := TRUE;
        END IF;
    END IF;

    IF NOT v_fac_updated AND v_clean_old IS NOT NULL AND v_clean_old <> '' THEN
        UPDATE public.faculty
        SET email = v_clean_new
        WHERE LOWER(email) = v_clean_old;

        IF FOUND THEN
            v_fac_updated := TRUE;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'auth_updated', v_auth_updated,
        'faculty_updated', v_fac_updated,
        'new_email', v_clean_new,
        'message', 'Email address successfully updated in both Supabase Auth (auth.users) and Faculty Database!'
    );
END;
$$;

-- Grant execute permissions to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.change_faculty_email(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
