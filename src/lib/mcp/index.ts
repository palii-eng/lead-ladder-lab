import { defineMcp } from "@lovable.dev/mcp-js";
import getSharedScenario from "./tools/get-shared-scenario";
import listRecentSharedScenarios from "./tools/list-recent-shared-scenarios";

export default defineMcp({
  name: "smartfunnel-mcp",
  title: "SmartFunnel AI MCP",
  version: "0.1.0",
  instructions:
    "Tools for SmartFunnel AI (Ads School). Use `list_recent_shared_scenarios` to browse publicly shared funnels and `get_shared_scenario` to fetch the full JSON of a specific shared scenario by its share ID.",
  tools: [listRecentSharedScenarios, getSharedScenario],
});
