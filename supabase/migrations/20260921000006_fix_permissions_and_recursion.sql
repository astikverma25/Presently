-- ==============================================================================
-- Migration: 006 - Resolve Circular RLS Dependency & Enforce Strict Admin Access
-- QR Based - Smart Attendance Management System
-- ==============================================================================

-- 1. Explicit schema and table grants for PostgREST roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Break circular RLS dependency on public.admins
-- Drop existing recursive policies on public.admins
DROP POLICY IF EXISTS "Admins full access on admins table" ON public.admins;
DROP POLICY IF EXISTS "Authenticated users can view admin profiles" ON public.admins;
DROP POLICY IF EXISTS "Allow read admins" ON public.admins;
DROP POLICY IF EXISTS "Allow write admins" ON public.admins;

-- Non-recursive SELECT policy: authenticated users can read the admin list
-- This allows is_admin() to query public.admins without triggering infinite recursion
CREATE POLICY "Allow read admins" ON public.admins
    FOR SELECT TO authenticated
    USING (true);

-- Restrict write/modifications on admins table to superadmins or service_role only
CREATE POLICY "Allow superadmin modify admins" ON public.admins
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.admins WHERE role = 'superadmin'))
    WITH CHECK (auth.jwt() ->> 'email' IN (SELECT email FROM public.admins WHERE role = 'superadmin'));

-- 3. Define robust, non-recursive is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_email TEXT;
BEGIN
    -- Unauthenticated callers are immediately rejected
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Extract lowercased email from JWT claims or auth.users
    current_email := LOWER(COALESCE(
        auth.jwt() ->> 'email',
        (SELECT email FROM auth.users WHERE id = auth.uid())
    ));

    -- Check 1: User or app metadata role is 'admin'
    IF (auth.jwt() ->> 'role') = 'admin' 
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
       OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Check 2: Email exists in public.admins whitelist table
    IF current_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.admins WHERE LOWER(email) = current_email
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 4. Re-apply strict admin-only policies on all management tables
DROP POLICY IF EXISTS "Admin full access faculty" ON public.faculty;
CREATE POLICY "Admin full access faculty" ON public.faculty
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access sections" ON public.sections;
CREATE POLICY "Admin full access sections" ON public.sections
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access students" ON public.students;
CREATE POLICY "Admin full access students" ON public.students
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access subjects" ON public.subjects;
CREATE POLICY "Admin full access subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access section_subjects" ON public.section_subjects;
CREATE POLICY "Admin full access section_subjects" ON public.section_subjects
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access faculty_assignment" ON public.faculty_assignment;
CREATE POLICY "Admin full access faculty_assignment" ON public.faculty_assignment
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
