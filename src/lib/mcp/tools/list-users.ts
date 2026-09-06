import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { requireAdmin } from "../auth";

export default defineTool({
  name: "list_users",
  title: "List users",
  description:
    "List all SmartFunnel users with their approval status, role, email, name, and scenario counts. Admin only.",
  inputSchema: {
    status: z
      .enum(["pending", "approved", "rejected"])
      .optional()
      .describe("Filter users by approval status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    await requireAdmin(ctx);
    const supabase = supabaseForUser(ctx);

    const [{ data: profiles, error: pErr }, { data: roleRows, error: rErr }, { data: workspaces, error: wErr }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("scenario_workspaces").select("user_id, scenarios"),
    ]);

    if (pErr) return { content: [{ type: "text", text: pErr.message }], isError: true };
    if (rErr) return { content: [{ type: "text", text: rErr.message }], isError: true };
    if (wErr) return { content: [{ type: "text", text: wErr.message }], isError: true };

    const counts = new Map<string, number>();
    (workspaces || []).forEach((w: { user_id: string | null; scenarios: unknown }) => {
      if (!w.user_id) return;
      const arr = Array.isArray(w.scenarios) ? w.scenarios : [];
      counts.set(w.user_id, arr.length);
    });

    const rolePriority: Record<string, number> = { admin: 2, moderator: 1, user: 0, tester: -1 };
    const roleByUser = new Map<string, string>();
    (roleRows || []).forEach((r: { user_id: string; role: string }) => {
      const current = roleByUser.get(r.user_id);
      if (!current || rolePriority[r.role] > rolePriority[current]) {
        roleByUser.set(r.user_id, r.role);
      }
    });

    let rows = (profiles || []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      status: p.status,
      role: roleByUser.get(p.id) ?? "user",
      scenarios_count: counts.get(p.id) ?? 0,
      created_at: p.created_at,
    }));

    if (status) {
      rows = rows.filter((r) => r.status === status);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { users: rows },
    };
  },
});
