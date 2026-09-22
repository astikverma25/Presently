import { createClient } from '@supabase/supabase-js';

// Read from Vite environment variables, window object, or default credentials
const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && window.ENV_SUPABASE_URL) ||
  'https://aybnilfrgfjzyjcdrdyk.supabase.co';

const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && window.ENV_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5Ym5pbGZyZ2ZqenlqY2RyZHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTAwODAsImV4cCI6MjEwNTU2NjA4MH0.SeJU7VeIrNZv4Ai5oPlGNdfqypss_hJKH-3b0bDbSyI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const getSessionUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
};

export const getCurrentUserProfile = async () => {
  // 1. Check active local session from localStorage
  try {
    const raw = localStorage.getItem('presently_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) {
        if (parsed.role === 'student') {
          const { data: std } = await supabase
            .from('students')
            .select('*, sections:section_id(id, section_name, branch, semester)')
            .eq('id', parsed.user.id)
            .maybeSingle();
          if (std) {
            return {
              ...std,
              section_name: std.sections?.section_name || '2A',
              role: 'student'
            };
          }
        } else if (parsed.role === 'staff' || parsed.role === 'faculty') {
          const { data: fac } = await supabase
            .from('faculty')
            .select('*')
            .eq('id', parsed.user.id)
            .maybeSingle();
          if (fac) return { ...fac, role: 'faculty' };
        }
        return { ...parsed.user, role: parsed.role };
      }
    }
  } catch (e) {
    console.warn('Storage session error:', e);
  }

  // 2. Check Supabase Auth Session
  const user = await getSessionUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('students')
    .select('*, sections:section_id(id, section_name, branch, semester)')
    .eq('id', user.id)
    .single();

  if (error) {
    // Try faculty table
    const { data: facData, error: facErr } = await supabase
      .from('faculty')
      .select('*')
      .eq('email', user.email)
      .single();

    if (facErr) {
      console.warn('Could not fetch user profile:', error.message);
      return null;
    }
    return { ...facData, role: 'faculty' };
  }
  return { ...data, section_name: data.sections?.section_name || '2A', role: 'student' };
};
