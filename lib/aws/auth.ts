import * as ExpoCrypto from "expo-crypto";
if (typeof global.crypto === "undefined") (global as any).crypto = {};
if (typeof (global as any).crypto.getRandomValues !== "function") {
  (global as any).crypto.getRandomValues = (buffer: Uint8Array) => {
    const bytes = ExpoCrypto.getRandomBytes(buffer.length);
    buffer.set(bytes);
    return buffer;
  };
}

import * as SecureStore from "expo-secure-store";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";

const REGION = "us-east-2";
const USER_POOL_ID = "us-east-2_cwcNYd3n6";
const USER_POOL_CLIENT_ID = "1cvii9v62da8s0gngrn1f1vtac";

const cip = new CognitoIdentityProviderClient({ region: REGION });

// SecureStore keys
const KEY_USER_EMAIL = "muse.user.email";
const KEY_ID_TOKEN = "muse.id_token";
const KEY_ACCESS_TOKEN = "muse.access_token";
const KEY_REFRESH_TOKEN = "muse.refresh_token";

// SSO CONSTANTS
const COGNITO_DOMAIN = "us-east-2cwcnyd3n6.auth.us-east-2.amazoncognito.com";
const APP_SCHEME = "expomultiscreenapp"; // From app.config.ts
const REDIRECT_URI = `${APP_SCHEME}://oauth2/redirect`; // Must match Cognito App Client
const LOGOUT_REDIRECT_URI = `${APP_SCHEME}://logout/redirect`; // Must match Cognito App Client

// helper: read/validate saved ID token
export async function getValidIdToken(): Promise<string | null> {
  const token = await getIdTokenFromStorage?.();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    const { exp } = JSON.parse(json);
    const now = Math.floor(Date.now() / 1000);
    if (typeof exp === "number" && exp > now) return token;
  } catch {}
  // stale/invalid token — clear so we don't loop
  await clearTokens?.();
  return null;
}

//Validators
export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isStrongPassword(v: string) {
  // at least 8 chars, one number, one lower, one upper, one special
  return /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(v);
}

//Remember me helpers
export async function rememberEmail(email: string | null) {
  if (email) {
    await SecureStore.setItemAsync(KEY_USER_EMAIL, email);
  } else {
    await SecureStore.deleteItemAsync(KEY_USER_EMAIL);
  }
}

export async function getRememberedEmail(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(KEY_USER_EMAIL);
  return v ?? null;
}

// Token getters/clearers
export async function getIdTokenFromStorage(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ID_TOKEN);
}
export async function getAccessTokenFromStorage(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
}
export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ID_TOKEN),
    SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN),
    // Clear PKCE values too, just in case
    SecureStore.deleteItemAsync("pkce_code_verifier"),
    SecureStore.deleteItemAsync("pkce_state"),
  ]);
  console.log("[AUTH LOG] Tokens cleared.");
}

// NEW SSO FUNCTIONS with LOGGING

// Helper to create secure random strings for PKCE
function base64URLEncode(str: Buffer): string {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
async function sha256(buffer: string): Promise<Buffer> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, buffer, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  // Convert base64 digest back to Buffer for URL encoding
  return Buffer.from(digest, "base64");
}

// Function to initiate SSO Sign In / Sign Up
export async function signInWithSso(provider: "Google" | "LoginWithAmazon" | "Facebook" | "SignInWithApple") {
  console.log(`[AUTH LOG] Starting signInWithSso for provider: ${provider}`);
  try {
    const state = base64URLEncode(Buffer.from(Crypto.getRandomBytes(16)));
    const code_verifier = base64URLEncode(Buffer.from(Crypto.getRandomBytes(32)));
    const code_challenge = base64URLEncode(await sha256(code_verifier));
    console.log("[AUTH LOG] Generated PKCE values.");

    await SecureStore.setItemAsync("pkce_code_verifier", code_verifier);
    await SecureStore.setItemAsync("pkce_state", state);
    console.log("[AUTH LOG] Stored PKCE values.");

    const authUrl =
      `https://${COGNITO_DOMAIN}/oauth2/authorize?` +
      `identity_provider=${provider}&` +
      `response_type=code&` +
      `client_id=${USER_POOL_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=email%20openid%20profile&` + // Request necessary scopes
      `state=${state}&` +
      `code_challenge=${code_challenge}&` +
      `code_challenge_method=S256`;
    console.log(`[AUTH LOG] Constructed auth URL: ${authUrl}`);
    console.log(`[AUTH LOG] Using redirect URI for browser: ${REDIRECT_URI}`);

    // Open the browser session
    console.log("[AUTH LOG] Calling WebBrowser.openAuthSessionAsync...");
    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI, { preferEphemeralSession: true });
    console.log(`[AUTH LOG] WebBrowser result type: ${result.type}`);

    if (result.type !== "success") {
      console.log("[AUTH LOG] WebBrowser session was not successful (cancelled or failed).");
      throw new Error("Sign in cancelled or failed.");
    }

    console.log(`[AUTH LOG] WebBrowser successful. Redirect URL: ${result.url}`);
    const url = new URL(result.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const storedState = await SecureStore.getItemAsync("pkce_state");

    console.log(`[AUTH LOG] Extracted code: ${code ? 'Yes' : 'No'}`);
    console.log(`[AUTH LOG] Returned state: ${returnedState}`);
    console.log(`[AUTH LOG] Stored state: ${storedState}`);

    if (returnedState !== storedState) {
      console.error("[AUTH LOG] State mismatch!");
      throw new Error("State mismatch during authentication.");
    }
    if (!code) {
      console.error("[AUTH LOG] Code not found in URL!");
      throw new Error("Authorization code not found in redirect URL.");
    }

    console.log("[AUTH LOG] Calling exchangeCodeForTokens...");
    await exchangeCodeForTokens(code);
    console.log("[AUTH LOG] exchangeCodeForTokens completed successfully.");

  } catch (error) {
    console.error("[AUTH LOG] Error during signInWithSso:", error);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
}

// Function to exchange the authorization code for tokens
async function exchangeCodeForTokens(code: string) {
  console.log("[AUTH LOG] Inside exchangeCodeForTokens.");
  const code_verifier = await SecureStore.getItemAsync("pkce_code_verifier");
  if (!code_verifier) {
    console.error("[AUTH LOG] Code verifier not found!");
    throw new Error("Code verifier not found. Cannot exchange code for tokens.");
  }
  console.log("[AUTH LOG] Retrieved code verifier.");

  const tokenUrl = `https://${COGNITO_DOMAIN}/oauth2/token`;
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", USER_POOL_CLIENT_ID);
  params.append("code", code);
  params.append("redirect_uri", REDIRECT_URI);
  params.append("code_verifier", code_verifier);
  console.log(`[AUTH LOG] Token endpoint: ${tokenUrl}`);
  console.log(`[AUTH LOG] Token request params: ${params.toString()}`);

  console.log("[AUTH LOG] Making fetch request to token endpoint...");
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  console.log(`[AUTH LOG] Token endpoint response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[AUTH LOG] Token exchange failed! Response body:", errorBody);
    throw new Error(`Failed to exchange code for tokens: ${response.status}`);
  }

  const tokens = await response.json();
  console.log("[AUTH LOG] Token exchange successful. Received tokens:", Object.keys(tokens));

  // Store tokens securely
  if (tokens.id_token) await SecureStore.setItemAsync(KEY_ID_TOKEN, tokens.id_token);
  if (tokens.access_token) await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, tokens.access_token);
  if (tokens.refresh_token) await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, tokens.refresh_token);
  console.log("[AUTH LOG] Tokens stored securely.");

  // Clean up PKCE values
  await SecureStore.deleteItemAsync("pkce_code_verifier");
  await SecureStore.deleteItemAsync("pkce_state");
  console.log("[AUTH LOG] Cleaned up PKCE values.");

  return tokens;
}

// Sign Up
export async function signUpEmailPassword(email: string, password: string, name?: string) {
  const params: any = {
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  };
  if (name) params.UserAttributes.push({ Name: "name", Value: name });

  const cmd = new SignUpCommand(params);
  return cip.send(cmd); // returns UserSub
}

// Confirm Sign Up
export async function confirmSignUp(email: string, code: string) {
  const cmd = new ConfirmSignUpCommand({
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  });
  return cip.send(cmd); // returns {}
}

// Resend Code
export async function resendConfirmationCode(email: string) {
  const cmd = new ResendConfirmationCodeCommand({
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
  });
  return cip.send(cmd);
}

// Sign In
export async function signInEmailPassword(email: string, password: string) {
  // Requires app client to allow USER_PASSWORD_AUTH
  const cmd = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: USER_POOL_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });
  const out = await cip.send(cmd); // returns tokens in AuthenticationResult

  const result = out.AuthenticationResult;
  // Store tokens so the app can read the ID token later
  if (result?.IdToken) await SecureStore.setItemAsync(KEY_ID_TOKEN, result.IdToken);
  if (result?.AccessToken) await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, result.AccessToken);
  if (result?.RefreshToken) await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, result.RefreshToken);

  return result;
}

export async function signOutGlobal() {
  console.log("[AUTH LOG] Starting signOutGlobal.");
  // Clear local tokens first
  await clearTokens();

  // Redirect to Cognito signout page to clear Cognito's session
  const signoutUrl =
    `https://${COGNITO_DOMAIN}/logout?` +
    `client_id=${USER_POOL_CLIENT_ID}&` +
    `logout_uri=${encodeURIComponent(LOGOUT_REDIRECT_URI)}`;
  
  console.log(`[AUTH LOG] Signout URL: ${signoutUrl}`);
  console.log(`[AUTH LOG] Using logout redirect URI: ${LOGOUT_REDIRECT_URI}`);

  try {
    console.log("[AUTH LOG] Calling WebBrowser.openAuthSessionAsync for logout...");
    // Opens the browser pop-up
    const result = await WebBrowser.openAuthSessionAsync(signoutUrl, LOGOUT_REDIRECT_URI);
    console.log(`[AUTH LOG] Logout WebBrowser result type: ${result.type}`);
    if (result.type !== "success") {
      console.warn("[AUTH LOG] Sign out flow did not complete successfully in browser.");
    }
  } catch (error) {
    console.error("[AUTH LOG] Sign out error:", error);
    // Even if browser fails, local tokens are cleared. Handle error as needed.
  }
  console.log("[AUTH LOG] signOutGlobal finished.");
}

// Forgot password
export async function forgotPasswordRequest(email: string) {
  const cmd = new ForgotPasswordCommand({
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
  });
  return cip.send(cmd);
}

export async function forgotPasswordConfirm(email: string, code: string, newPassword: string) {
  const cmd = new ConfirmForgotPasswordCommand({
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
  return cip.send(cmd);
}