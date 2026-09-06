import { supabase } from "@/integrations/supabase/client";

// Beta namespace not yet visible in the generated types, so we expose the
// three methods we need through a small typed wrapper.
interface OAuthApi {
  getAuthorizationDetails: (authorizationId: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (authorizationId: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (authorizationId: string) => Promise<{ data: any; error: any }>;
}

function oauthApi(): OAuthApi {
  const auth = supabase.auth as any;
  return auth.oauth as OAuthApi;
}

export async function getAuthorizationDetails(authorizationId: string) {
  return oauthApi().getAuthorizationDetails(authorizationId);
}

export async function approveAuthorization(authorizationId: string) {
  return oauthApi().approveAuthorization(authorizationId);
}

export async function denyAuthorization(authorizationId: string) {
  return oauthApi().denyAuthorization(authorizationId);
}
