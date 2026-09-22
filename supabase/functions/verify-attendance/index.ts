// Supabase Edge Function: verify-attendance
// Validates token timestamp, prevents proxies, and registers attendance record

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { qrPayload, deviceInfo } = await req.json();

    let parsedPayload;
    try {
      parsedPayload = typeof qrPayload === "string" ? JSON.parse(qrPayload) : qrPayload;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid QR code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { s: sessionId, t: token, exp: expiresAt } = parsedPayload;

    // Check if token expired by client time
    if (new Date(expiresAt).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "QR code has expired. Please scan the current code on screen." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch session details and verify active token
    const { data: session, error: sessionErr } = await supabaseClient
      .from("sessions")
      .select("id, status, current_qr_token, token_expires_at")
      .eq("id", sessionId)
      .single();

    if (sessionErr || !session || session.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Session is inactive or not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify rolling token match
    if (session.current_qr_token !== token) {
      return new Response(
        JSON.stringify({ error: "Expired QR token. Code was recently refreshed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get student user ID from auth token
    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert or update attendance record
    const { data: record, error: recordErr } = await supabaseClient
      .from("attendance_records")
      .upsert(
        {
          session_id: sessionId,
          student_id: user.id,
          status: "present",
          verification_method: "qr_scan",
          device_info: deviceInfo || "Browser/Web Scanner",
          marked_at: new Date().toISOString(),
        },
        { onConflict: "session_id, student_id" }
      )
      .select()
      .single();

    if (recordErr) throw recordErr;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Attendance marked successfully!",
        record,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
