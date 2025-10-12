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

const REGION = "us-east-2";
const USER_POOL_ID = "us-east-2_cwcNYd3n6";
const USER_POOL_CLIENT_ID = "1cvii9v62da8s0gngrn1f1vtac";

const cip = new CognitoIdentityProviderClient({ region: REGION });

// SecureStore keys
const KEY_USER_EMAIL = "muse.user.email";
const KEY_ID_TOKEN = "muse.id_token";
const KEY_ACCESS_TOKEN = "muse.access_token";
const KEY_REFRESH_TOKEN = "muse.refresh_token";

// helper: read/validate saved ID token
import { Buffer } from "buffer";

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
  ]);
}

// Sign up/confirm
export async function signUpEmailPassword(email: string, password: string, name?: string) {
  const cmd = new SignUpCommand({
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      ...(name ? [{ Name: "name", Value: name }] : []),
    ],
  });
  const out = await cip.send(cmd);
  return out;
}

export async function confirmSignUp(email: string, code: string) {
  const cmd = new ConfirmSignUpCommand({
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  });
  return cip.send(cmd);
}

export async function resendConfirmationCode(email: string) {
  const cmd = new ResendConfirmationCodeCommand({
    ClientId: USER_POOL_CLIENT_ID,
    Username: email,
  });
  return cip.send(cmd);
}

// Sign in/Sign out
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

export async function signOutGlobal(accessToken: string) {
  const cmd = new GlobalSignOutCommand({ AccessToken: accessToken });
  try {
    await cip.send(cmd);
  } finally {
    await clearTokens();
  }
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