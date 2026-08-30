import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Emails that can never be deleted through this endpoint, regardless of
// caller — a safety net against locking everyone out of the admin panel.
const PROTECTED_EMAILS = ["lisifik@gmail.com", "dubchackwork@gmail.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase service credentials are not configured");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer /i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Не авторизовано" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client scoped to the caller's own JWT — used only to verify who's
    // calling and that they hold the superadmin ('admin') role.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerUser, error: callerErr } = await callerClient.auth.getUser(jwt);
    if (callerErr || !callerUser?.user) {
      return new Response(JSON.stringify({ error: "Не авторизовано" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.user.id);
    const isSuperadmin = (callerRoles || []).some((r: { role: string }) => r.role === "admin");
    if (!isSuperadmin) {
      return new Response(JSON.stringify({ error: "Тільки супер-адмін може видаляти учасників" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Не вказано userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userId === callerUser.user.id) {
      return new Response(JSON.stringify({ error: "Не можна видалити самого себе" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (targetProfile?.email && PROTECTED_EMAILS.includes(targetProfile.email.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Цього супер-адміна не можна видалити" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deleting the auth.users row cascades to profiles, user_roles, and
    // scenario_workspaces (all declared ON DELETE CASCADE).
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-delete-user error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Невідома помилка" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
