import { randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";

export const CONVERTY_OAUTH_STATE_COOKIE = "converty_oauth_state";
export const CONVERTY_OAUTH_STATE_MAX_AGE = 60 * 10;

export interface ConvertyTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface ConvertyStoreResponse {
  data: {
    slug: string;
    name?: string;
    title?: string;
    domain?: string;
    currency?: string;
    country?: string;
    logo?: string;
  };
}

export function generateState(): string {
  return randomBytes(32).toString("hex");
}

export function setStateCookie(response: NextResponse, state: string) {
  response.cookies.set(CONVERTY_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONVERTY_OAUTH_STATE_MAX_AGE,
  });
}

export function clearStateCookie(response: NextResponse) {
  response.cookies.set(CONVERTY_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
