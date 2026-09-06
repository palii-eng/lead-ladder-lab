import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { requireAdmin } from "../auth";

export default defineTool({
  name: "update_user_status",
  title: "Update user status",
  description:
    "Approve, reject, or set to pending a user's account status. Admin only.",
  inputSchema: {
    user_id: z.string().uuid().describe("UUID of the user whose status to update."),
    status: z.enum(["pending", "approved", "rejected"]).describe("New approval status."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ user_id, status }, ctx) => {
    await requireAdmin(ctx);
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase.from("profiles").update({ status }).eq("id", user_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `User ${user_id} status updated to ${status}.` }],
      structuredContent: { user_id, status },
    };
  },
});
