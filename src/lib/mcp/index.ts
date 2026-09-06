import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getSharedScenario from "./tools/get-shared-scenario";
import listRecentSharedScenarios from "./tools/list-recent-shared-scenarios";
import listUsers from "./tools/list-users";
import updateUserStatus from "./tools/update-user-status";
import listScenarioReviews from "./tools/list-scenario-reviews";
import updateReviewStatus from "./tools/update-review-status";
import deleteReview from "./tools/delete-review";
import toggleModerator from "./tools/toggle-moderator";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smartfunnel-mcp",
  title: "SmartFunnel AI MCP",
  version: "0.2.0",
  instructions:
    "Tools for SmartFunnel AI (Ads School). Public tools: browse and fetch publicly shared scenarios. Admin tools: list and manage users, approve/reject accounts, assign moderator roles. Staff tools: list and update scenario review requests.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listRecentSharedScenarios,
    getSharedScenario,
    listUsers,
    updateUserStatus,
    listScenarioReviews,
    updateReviewStatus,
    deleteReview,
    toggleModerator,
  ],
});
