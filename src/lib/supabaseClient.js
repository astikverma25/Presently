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
  // 1. Check active local session from localStorage with backend verification
  try {
    const raw = localStorage.getItem('presently_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) {
        if (parsed.role === 'student') {
          const isNativeApp = typeof window !== 'undefined' && (
            Boolean(window.AndroidKeystore) || 
            Boolean(window.Capacitor?.isNativePlatform && window.Capacitor.isNativePlatform())
          );

          const isLocalDev = !isNativeApp && typeof import.meta !== 'undefined' && (
            import.meta.env?.DEV || 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('trycloudflare.com') ||
            window.location.hostname.includes('ngrok') ||
            window.location.hostname.includes('loca.lt')
          );

          // On production/HTTPS: Verify session token against backend (prevents localStorage tampering)
          if (!isLocalDev && !parsed.isLocalDev) {
            if (!parsed.token) {
              localStorage.removeItem('presently_auth_session');
              return null;
            }

            try {
              const { data: verifyRes, error: vErr } = await supabase.rpc('verify_student_session', {
                p_student_id: parsed.user.id,
                p_session_token: parsed.token
              });

              // Purge ONLY if backend explicitly invalidated or rejected the session
              if (verifyRes && verifyRes.valid === false) {
                console.warn('Backend student session token invalid/revoked:', verifyRes.message);
                localStorage.removeItem('presently_auth_session');
                return null;
              }
            } catch (netErr) {
              console.warn('Network issue checking session token with backend:', netErr);
            }
          }

          try {
            const { data: std } = await supabase
              .from('students')
              .select('*, sections:section_id(id, section_name, branch, semester)')
              .eq('id', parsed.user.id)
              .maybeSingle();

            if (std) {
              return {
                ...std,
                section_name: std.sections?.section_name || parsed.user.section_name || '2A',
                role: 'student'
              };
            }
          } catch (fetchErr) {
            console.warn('Error fetching fresh student profile, using cached session:', fetchErr);
          }

          return { ...parsed.user, role: 'student' };
        } else if (parsed.role === 'staff' || parsed.role === 'faculty') {
          try {
            const { data: fac } = await supabase
              .from('faculty')
              .select('*')
              .or(`id.eq.${parsed.user.id},email.ilike.${parsed.user.email}`)
              .maybeSingle();
            if (fac) return { ...fac, role: 'faculty' };
          } catch (facErr) {
            console.warn('Error fetching fresh faculty profile, using cached session:', facErr);
          }
          return { ...parsed.user, role: 'faculty' };
        } else if (parsed.role === 'admin') {
          return { ...parsed.user, role: 'admin' };
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
