import { NextResponse } from "next/server";
import { getConvertyConfig } from "@/lib/converty/config";
import { generateState, setStateCookie } from "@/lib/converty/oauth";

export async function GET() {
  const config = getConvertyConfig();

  if (!config.clientId || !config.redirectUri) {
    return NextResponse.json(
      {
        success: false,
        error: "La configuration OAuth de Converty est incomplete.",
      },
      { status: 500 }
    );
  }

  const state = generateState();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state,
  });

  const response = NextResponse.redirect(
    `${config.authorizationUrl}?${params.toString()}`
  );
  setStateCookie(response, state);
  return response;
}
