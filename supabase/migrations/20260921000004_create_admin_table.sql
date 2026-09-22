-- ==============================================================================
-- Migration: 004 - Create Admin Table & RLS
-- QR Based - Smart Attendance Management System
-- ==============================================================================

-- 1. Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,       -- Login identifier & link to auth.users
    role TEXT DEFAULT 'superadmin',   -- e.g. 'superadmin', 'admin', 'manager'
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3. Update is_admin function to verify via auth metadata OR presence in public.admins table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        -- Check user metadata role
        (SELECT (raw_user_meta_data->>'role') = 'admin' FROM auth.users WHERE id = auth.uid())
        OR
        -- Check if user's email is in admins table
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies for admins table
CREATE POLICY "Admins full access on admins table" ON public.admins
    FOR ALL USING (public.is_admin());

CREATE POLICY "Authenticated users can view admin profiles" ON public.admins
    FOR SELECT USING (auth.role() = 'authenticated');
