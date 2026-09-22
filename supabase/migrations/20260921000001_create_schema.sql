-- ==============================================================================
-- Migration: 001 - Core Schema Definition
-- QR Based - Smart Attendance Management System
-- Matches Docs/Database_Schema_QR_Attendance_System.md
-- ==============================================================================

-- 1. faculty
CREATE TABLE IF NOT EXISTS public.faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,       -- Login identifier
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. sections
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_name TEXT NOT NULL,       -- e.g. "2A", "2B", "3B"
    branch TEXT NOT NULL,             -- e.g. "CSE", "IT"
    semester TEXT NOT NULL,           -- e.g. "4th", "3rd"
    total_students INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    roll_no TEXT UNIQUE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    semester TEXT,
    branch TEXT,
    date_of_birth DATE,
    admission_id TEXT,
    personal_email TEXT,
    phone TEXT,
    parent_contact TEXT,
    photo_url TEXT,                   -- Required — used in live attendance roster
    login_username TEXT,              -- Auto-generated (roll_no or email)
    password_hash TEXT,               -- Auto-generated temp password
    device_id TEXT,                   -- Auto-populated after first student login (anti-proxy)
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_name TEXT NOT NULL,       -- e.g. "Data Structures", "Operating Systems"
    subject_code TEXT UNIQUE NOT NULL,
    semester TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. section_subjects
-- Represents a unique subject-section offering (solves duplicate class-name ambiguity)
CREATE TABLE IF NOT EXISTS public.section_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, section_id)
);

-- 6. faculty_assignment
-- Links a faculty member to a specific section_subject, with editable lecture timing
CREATE TABLE IF NOT EXISTS public.faculty_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_subject_id UUID NOT NULL REFERENCES public.section_subjects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,        -- e.g. "Monday", "Tuesday", etc.
    start_time TIME NOT NULL,         -- Editable
    end_time TIME NOT NULL,           -- Editable
    room_no TEXT,                     -- Editable
    created_at TIMESTAMPTZ DEFAULT NOW()
);
