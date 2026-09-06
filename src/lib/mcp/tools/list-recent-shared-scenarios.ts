import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "list_recent_shared_scenarios",
  title: "List recent shared scenarios",
  description:
    "List the most recently created public shared SmartFunnel scenarios (id, active lead type, created_at). Useful for browsing available shared funnels.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of scenarios to return (default 10, max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = supabaseAnon();
    const { data, error } = await supabase
      .from("shared_scenarios")
      .select("id, active_lead_type, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
