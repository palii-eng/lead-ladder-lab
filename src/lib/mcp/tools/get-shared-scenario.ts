import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_shared_scenario",
  title: "Get shared scenario",
  description:
    "Fetch a publicly shared SmartFunnel scenario by its share ID. Returns the full scenario JSON, active lead type, AI conclusion, and creation date.",
  inputSchema: {
    share_id: z
      .string()
      .min(1)
      .describe("The share ID (uuid) of the shared scenario, as found in the /share/:shareId URL."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ share_id }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Supabase env not configured" }], isError: true };
    }
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("shared_scenarios")
      .select("id, active_lead_type, ai_conclusion, created_at, scenario")
      .eq("id", share_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Shared scenario not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: data as Record<string, unknown>,
    };
  },
});
