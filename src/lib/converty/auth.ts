import { createAdminClient } from "@/lib/supabase/admin";
import { getConvertyConfig } from "@/lib/converty/config";
import type { ConvertyTokenResponse } from "@/lib/converty/oauth";

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export interface ConvertyConnection {
  store_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  scopes: string[] | null;
}

async function getStoredConnection(storeId?: string): Promise<ConvertyConnection> {
  const supabase = createAdminClient();

  const query = supabase
    .from("converty_tokens")
    .select("store_id, access_token, refresh_token, expires_at, scopes, updated_at");

  const { data, error } = storeId
    ? await query.eq("store_id", storeId).limit(1)
    : await query.order("updated_at", { ascending: false }).limit(1);

  if (error) {
    throw new Error(`Failed to read Converty tokens: ${error.message}`);
  }

  const connection = data?.[0];

  if (!connection) {
    throw new Error(
      storeId
        ? `No Converty token found for store: ${storeId}`
        : "No Converty store is connected yet."
    );
  }

  return {
    store_id: connection.store_id,
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expires_at: connection.expires_at,
    scopes: connection.scopes,
  };
}

function shouldRefreshToken(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

export async function refreshToken(
  currentConnection?: ConvertyConnection,
  storeId?: string
): Promise<ConvertyConnection> {
  const connection = currentConnection ?? (await getStoredConnection(storeId));
  const config = getConvertyConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error("Converty OAuth credentials are not configured.");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: connection.refresh_token,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to refresh Converty access token (${response.status}): ${details}`
    );
  }

  const tokenData = (await response.json()) as ConvertyTokenResponse;

  if (!tokenData.access_token) {
    throw new Error("Converty refresh response did not include an access token.");
  }

  const refreshedConnection: ConvertyConnection = {
    store_id: connection.store_id,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || connection.refresh_token,
    expires_at: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
    scopes: connection.scopes,
  };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("converty_tokens")
    .update({
      access_token: refreshedConnection.access_token,
      refresh_token: refreshedConnection.refresh_token,
      expires_at: refreshedConnection.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", connection.store_id);

  if (error) {
    throw new Error(`Failed to persist refreshed token: ${error.message}`);
  }

  return refreshedConnection;
}

export async function getValidToken(storeId?: string): Promise<ConvertyConnection> {
  const connection = await getStoredConnection(storeId);

  if (shouldRefreshToken(connection.expires_at)) {
    return refreshToken(connection, storeId);
  }

  return connection;
}
