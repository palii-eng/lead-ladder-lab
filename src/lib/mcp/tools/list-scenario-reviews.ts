import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { requireStaff } from "../auth";

export default defineTool({
  name: "list_scenario_reviews",
  title: "List scenario reviews",
  description:
    "List all scenario review requests submitted by students. Admins and moderators can use this.",
  inputSchema: {
    status: z
      .enum(["pending", "in_review", "approved", "rejected"])
      .optional()
      .describe("Filter reviews by status."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum number of reviews to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    await requireStaff(ctx);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("scenario_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { reviews: data ?? [] },
    };
  },
});
