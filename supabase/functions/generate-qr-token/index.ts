// Supabase Edge Function: generate-qr-token
// Generates time-expiring rolling cryptographic tokens for dynamic QR codes

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

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate random 16-byte hex token + 40s expiry window
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const token = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 40 * 1000).toISOString();

    // Update active session with new dynamic token
    const { data, error } = await supabaseClient
      .from("sessions")
      .update({
        current_qr_token: token,
        token_expires_at: expiresAt,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;

    // Payload embedded in QR (encrypted/structured)
    const qrPayload = JSON.stringify({
      s: sessionId,
      t: token,
      exp: expiresAt,
    });

    return new Response(
      JSON.stringify({
        token,
        qrPayload,
        expiresAt,
        ttlSeconds: 40,
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
