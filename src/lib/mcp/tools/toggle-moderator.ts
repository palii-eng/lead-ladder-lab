import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { requireAdmin } from "../auth";

export default defineTool({
  name: "toggle_moderator",
  title: "Toggle moderator role",
  description:
    "Grant or revoke moderator role for a user. Admin only.",
  inputSchema: {
    user_id: z.string().uuid().describe("UUID of the user."),
    grant: z.boolean().describe("True to grant moderator role, false to revoke it."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ user_id, grant }, ctx) => {
    await requireAdmin(ctx);
    const supabase = supabaseForUser(ctx);
    if (grant) {
      const { error } = await supabase.from("user_roles").insert({ user_id, role: "moderator" });
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return { content: [{ type: "text", text: `Moderator role granted to ${user_id}.` }], structuredContent: { user_id, grant: true } };
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "moderator");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Moderator role revoked from ${user_id}.` }], structuredContent: { user_id, grant: false } };
  },
});
