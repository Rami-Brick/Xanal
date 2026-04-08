const DEFAULT_AUTHORIZATION_URL =
  "https://partner.converty.shop/oauth2/authorize";
const DEFAULT_TOKEN_URL = "https://partner.converty.shop/oauth2/token";
const DEFAULT_API_BASE_URL = "https://api.converty.shop/api/v1";
const DEFAULT_PARTNER_API_BASE_URL = "https://partner.converty.shop/api/v1";
const DEFAULT_SCOPES = "read-products create-products update-products read-orders";

export interface ConvertyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  partnerApiBaseUrl: string;
  scopes: string;
}

export function getConvertyConfig(): ConvertyConfig {
  return {
    clientId: process.env.CONVERTY_CLIENT_ID ?? "",
    clientSecret: process.env.CONVERTY_CLIENT_SECRET ?? "",
    redirectUri: process.env.CONVERTY_REDIRECT_URI ?? "",
    authorizationUrl:
      process.env.CONVERTY_AUTHORIZATION_URL ?? DEFAULT_AUTHORIZATION_URL,
    tokenUrl: process.env.CONVERTY_TOKEN_URL ?? DEFAULT_TOKEN_URL,
    apiBaseUrl: process.env.CONVERTY_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    partnerApiBaseUrl:
      process.env.CONVERTY_PARTNER_API_BASE_URL ?? DEFAULT_PARTNER_API_BASE_URL,
    scopes: process.env.CONVERTY_SCOPES ?? DEFAULT_SCOPES,
  };
}
