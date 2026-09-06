import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

export async function requireAdmin(ctx: ToolContext): Promise<void> {
  if (!ctx.isAuthenticated()) {
    throw new Error("Not authenticated");
  }
  const supabase = supabaseForUser(ctx);
  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: ctx.getUserId(),
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Admin access required");
}

export async function requireStaff(ctx: ToolContext): Promise<void> {
  if (!ctx.isAuthenticated()) {
    throw new Error("Not authenticated");
  }
  const supabase = supabaseForUser(ctx);
  const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" }),
    supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "moderator" }),
  ]);
  if (!isAdmin && !isModerator) throw new Error("Admin or moderator access required");
}
