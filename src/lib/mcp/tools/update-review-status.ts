import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { requireStaff } from "../auth";

export default defineTool({
  name: "update_review_status",
  title: "Update review status",
  description:
    "Change the status of a scenario review request (pending, in_review, approved, rejected). Admins and moderators can use this.",
  inputSchema: {
    review_id: z.string().uuid().describe("UUID of the review request."),
    status: z.enum(["pending", "in_review", "approved", "rejected"]).describe("New review status."),
    admin_note: z.string().optional().describe("Optional note from the reviewer."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ review_id, status, admin_note }, ctx) => {
    await requireStaff(ctx);
    const supabase = supabaseForUser(ctx);
    const update: Record<string, unknown> = { status };
    if (admin_note !== undefined) update.admin_note = admin_note;
    const { data, error } = await supabase.from("scenario_reviews").update(update).eq("id", review_id).select();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Review ${review_id} updated to ${status}.` }],
      structuredContent: { review: data?.[0] },
    };
  },
});
