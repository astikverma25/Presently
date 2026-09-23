-- ==============================================================================
-- Migration 014: Standardize Semester to Clean Numbers (1, 2, 3, 4, 5, 6, 7, 8)
-- Removes '1st', '2nd', '3rd', '4th' strings in favor of clean INTEGER values
-- ==============================================================================

-- 1. Standardize sections.semester
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sections' 
          AND column_name = 'semester'
    ) THEN
        -- Clean text values to digits first
        UPDATE public.sections 
        SET semester = regexp_replace(semester, '[^0-9]', '', 'g') 
        WHERE semester IS NOT NULL AND semester ~ '[0-9]';

        -- Convert column type to INTEGER
        ALTER TABLE public.sections 
        ALTER COLUMN semester TYPE INTEGER 
        USING (
            CASE 
                WHEN semester IS NULL OR TRIM(semester::text) = '' THEN 1
                ELSE NULLIF(regexp_replace(semester::text, '[^0-9]', '', 'g'), '')::INTEGER 
            END
        );
    END IF;
END $$;

-- 2. Standardize subjects.semester
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'subjects' 
          AND column_name = 'semester'
    ) THEN
        -- Clean text values to digits first
        UPDATE public.subjects 
        SET semester = regexp_replace(semester, '[^0-9]', '', 'g') 
        WHERE semester IS NOT NULL AND semester ~ '[0-9]';

        -- Convert column type to INTEGER
        ALTER TABLE public.subjects 
        ALTER COLUMN semester TYPE INTEGER 
        USING (
            CASE 
                WHEN semester IS NULL OR TRIM(semester::text) = '' THEN 1
                ELSE NULLIF(regexp_replace(semester::text, '[^0-9]', '', 'g'), '')::INTEGER 
            END
        );
    END IF;
END $$;

-- 3. Standardize students.semester
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'students' 
          AND column_name = 'semester'
    ) THEN
        -- Clean text values to digits first
        UPDATE public.students 
        SET semester = regexp_replace(semester, '[^0-9]', '', 'g') 
        WHERE semester IS NOT NULL AND semester ~ '[0-9]';

        -- Convert column type to INTEGER
        ALTER TABLE public.students 
        ALTER COLUMN semester TYPE INTEGER 
        USING (
            CASE 
                WHEN semester IS NULL OR TRIM(semester::text) = '' THEN 1
                ELSE NULLIF(regexp_replace(semester::text, '[^0-9]', '', 'g'), '')::INTEGER 
            END
        );
    END IF;
END $$;
