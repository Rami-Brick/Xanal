import { NextRequest, NextResponse } from "next/server";
import { getConvertyConfig } from "@/lib/converty/config";
import {
  clearStateCookie,
  CONVERTY_OAUTH_STATE_COOKIE,
  type ConvertyStoreResponse,
  type ConvertyTokenResponse,
} from "@/lib/converty/oauth";
import { createAdminClient } from "@/lib/supabase/admin";

function redirectWithStatus(
  baseUrl: string,
  status: "success" | "error",
  message: string
) {
  const url = new URL(baseUrl);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);

  const response = NextResponse.redirect(url);
  clearStateCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  const config = getConvertyConfig();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateFromConverty = searchParams.get("state");
  const providerError = searchParams.get("error");
  const stateFromCookie =
    request.cookies.get(CONVERTY_OAUTH_STATE_COOKIE)?.value;

  if (providerError) {
    return redirectWithStatus(
      appUrl,
      "error",
      `Converty a retourne une erreur : ${providerError}`
    );
  }

  if (!code) {
    return redirectWithStatus(
      appUrl,
      "error",
      "Le code d'autorisation est manquant."
    );
  }

  if (!stateFromConverty) {
    return redirectWithStatus(appUrl, "error", "Le parametre state est manquant.");
  }

  if (!stateFromCookie || stateFromCookie !== stateFromConverty) {
    return redirectWithStatus(
      appUrl,
      "error",
      "La validation de securite a echoue. Veuillez reconnecter Converty."
    );
  }

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    return redirectWithStatus(
      appUrl,
      "error",
      "Les identifiants Converty ne sont pas configures."
    );
  }

  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        state: stateFromConverty,
      }),
    });

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      console.error("[converty/callback] Token exchange failed:", details);
      return redirectWithStatus(
        appUrl,
        "error",
        `L'echange du code OAuth a echoue (${tokenResponse.status}).`
      );
    }

    const tokenData =
      (await tokenResponse.json()) as ConvertyTokenResponse;

    if (!tokenData.access_token || !tokenData.refresh_token) {
      return redirectWithStatus(
        appUrl,
        "error",
        "Converty a retourne un payload OAuth incomplet."
      );
    }

    const storeResponse = await fetch(`${config.apiBaseUrl}/stores/me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!storeResponse.ok) {
      const details = await storeResponse.text();
      console.error("[converty/callback] Store fetch failed:", details);
      return redirectWithStatus(
        appUrl,
        "error",
        "L'autorisation a reussi, mais la recuperation de la boutique a echoue."
      );
    }

    const storePayload =
      (await storeResponse.json()) as ConvertyStoreResponse;
    const storeData = storePayload.data;

    if (!storeData?.slug) {
      return redirectWithStatus(
        appUrl,
        "error",
        "Les informations boutique Converty ne contiennent pas de slug."
      );
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    const supabase = createAdminClient();
    const { error } = await supabase.from("converty_tokens").upsert(
      {
        store_id: storeData.slug,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scopes: config.scopes.split(/\s+/).filter(Boolean),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "store_id",
      }
    );

    if (error) {
      console.error("[converty/callback] Failed to store tokens:", error);
      return redirectWithStatus(
        appUrl,
        "error",
        "L'enregistrement des tokens Converty a echoue."
      );
    }

    const storeName = storeData.name || storeData.title || storeData.slug;
    return redirectWithStatus(
      `${appUrl}/store`,
      "success",
      `Connexion a ${storeName} reussie.`
    );
  } catch (error) {
    console.error("[converty/callback] Unexpected error:", error);
    return redirectWithStatus(
      appUrl,
      "error",
      "Une erreur inattendue est survenue pendant l'autorisation OAuth."
    );
  }
}
