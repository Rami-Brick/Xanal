import { getConvertyConfig } from "@/lib/converty/config";
import {
  getValidToken,
  refreshToken,
  type ConvertyConnection,
} from "@/lib/converty/auth";

export async function makeAuthenticatedConvertyRequest(
  path: string,
  init?: RequestInit,
  storeId?: string
): Promise<Response> {
  const config = getConvertyConfig();
  let connection = await getValidToken(storeId);
  let response = await fetchWithToken(
    `${config.apiBaseUrl}${path}`,
    connection,
    init
  );

  if (response.status === 401) {
    connection = await refreshToken(connection, storeId);
    response = await fetchWithToken(
      `${config.apiBaseUrl}${path}`,
      connection,
      init
    );
  }

  return response;
}

async function fetchWithToken(
  url: string,
  connection: ConvertyConnection,
  init?: RequestInit
) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${connection.access_token}`);

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}
