import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { requireStaff } from "../auth";

export default defineTool({
  name: "delete_review",
  title: "Delete review",
  description:
    "Permanently delete a scenario review request. Admins and moderators can use this.",
  inputSchema: {
    review_id: z.string().uuid().describe("UUID of the review request to delete."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ review_id }, ctx) => {
    await requireStaff(ctx);
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase.from("scenario_reviews").delete().eq("id", review_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Review ${review_id} deleted.` }],
      structuredContent: { review_id },
    };
  },
});
