// Supabase Edge Function: export-report
// Aggregates class & session attendance reports for export

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

    const { sectionId, startDate, endDate } = await req.json();

    let query = supabaseClient
      .from("attendance_records")
      .select(`
        id,
        marked_at,
        status,
        verification_method,
        student:profiles(full_name, roll_number, email),
        session:sessions(title, start_time, room_number)
      `);

    if (sectionId) {
      query = query.eq("session.section_id", sectionId);
    }
    if (startDate) {
      query = query.gte("marked_at", startDate);
    }
    if (endDate) {
      query = query.lte("marked_at", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ data, total: data?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
