/**
 * Gmail Connector
 *
 * Production flow:
 * 1. OAuth2 with Google via expo-auth-session
 * 2. Request minimal scopes: gmail.readonly (metadata + headers only, no full body)
 * 3. Use Gmail API to list messages matching subscription-related label/query
 * 4. Fetch sender, subject, snippet only – no full body, no attachments
 * 5. Store EmailArtifact locally, persist access/refresh token in SecureStore
 *
 * Privacy rules:
 * - Never fetch full email body
 * - Never send email data to any backend
 * - Store only sender, subject, snippet, receivedAt locally
 */

import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConnectorResult,
  OAuthConnectResult,
  EmailSyncResult,
  EmailArtifact,
} from '../../types';
import { normalizeSenderDomain } from '../../engine/normalize';

const GMAIL_ACCESS_TOKEN_KEY = 'gmail_access_token';
const GMAIL_REFRESH_TOKEN_KEY = 'gmail_refresh_token';
const GMAIL_EMAIL_KEY = 'gmail_email';

const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? '';
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? '';

import { Platform } from 'react-native';

const GOOGLE_CLIENT_ID =
  Platform.OS === 'ios' ? GOOGLE_CLIENT_ID_IOS : GOOGLE_CLIENT_ID_ANDROID;

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

const SUBSCRIPTION_QUERY =
  'subject:(receipt OR invoice OR subscription OR payment OR billing OR "your plan" OR "charged" OR "renewal") newer_than:12m';

export function isGmailConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

export async function connectGmail(): Promise<ConnectorResult<OAuthConnectResult>> {
  if (!isGmailConfigured()) {
    return { success: false, error: 'Google OAuth not configured', isDemo: true };
  }

  try {
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'subscrub' });

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: GMAIL_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    });

    const result = await request.promptAsync(discovery);

    if (result.type !== 'success' || !result.params.code) {
      return { success: false, error: result.type === 'cancel' ? 'Cancelled' : 'Auth failed' };
    }

    // Exchange code for tokens
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: result.params.code,
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: request.codeVerifier ?? '',
      }).toString(),
    });
    const tokens = await tokenResp.json();

    if (!tokens.access_token) throw new Error('No access token received');

    // Get user email
    const meResp = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = await meResp.json();
    const email = me.email as string;
    const masked = email.replace(/(.{2}).+(@.+)/, '$1***$2');

    await SecureStore.setItemAsync(GMAIL_ACCESS_TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      await SecureStore.setItemAsync(GMAIL_REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
    await SecureStore.setItemAsync(GMAIL_EMAIL_KEY, email);

    return { success: true, data: { maskedEmail: masked, accessToken: tokens.access_token } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function syncGmailEmails(
  sourceConnectionId: string
): Promise<ConnectorResult<EmailSyncResult>> {
  const accessToken = await SecureStore.getItemAsync(GMAIL_ACCESS_TOKEN_KEY);
  if (!accessToken) return { success: false, error: 'Not connected to Gmail' };

  try {
    // List messages
    const listResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(SUBSCRIPTION_QUERY)}&maxResults=200`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listJson = await listResp.json();
    const messages: Array<{ id: string }> = listJson.messages ?? [];

    const emails: EmailArtifact[] = [];
    for (const msg of messages.slice(0, 100)) {
      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgJson = await msgResp.json();
      const headers: Array<{ name: string; value: string }> = msgJson.payload?.headers ?? [];

      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

      const sender = getHeader('From');
      const subject = getHeader('Subject');
      const dateStr = getHeader('Date');
      const snippet: string = msgJson.snippet ?? '';

      if (!sender || !subject) continue;

      const domain = normalizeSenderDomain(sender);
      emails.push({
        id: uuidv4(),
        sourceConnectionId,
        providerHint: null,
        sender,
        subject,
        snippet: snippet.substring(0, 200),
        receivedAt: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        fingerprint: `${domain}|${subject.substring(0, 50)}|${dateStr}`,
        rawHash: msg.id,
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true, data: { emails, sourceConnectionId } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function disconnectGmail(): Promise<void> {
  await SecureStore.deleteItemAsync(GMAIL_ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(GMAIL_REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(GMAIL_EMAIL_KEY);
}

export async function isGmailConnected(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(GMAIL_ACCESS_TOKEN_KEY);
  return !!token;
}
