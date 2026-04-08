/**
 * Outlook / Microsoft Graph Mail Connector
 *
 * Production flow:
 * 1. OAuth2 with Microsoft via expo-auth-session
 * 2. Request minimal scopes: Mail.Read (metadata focus only)
 * 3. Use Graph API to list messages with subscription-related keywords
 * 4. Fetch sender, subject, bodyPreview only
 * 5. Store EmailArtifact locally, persist tokens in SecureStore
 *
 * Privacy rules:
 * - Never fetch full email body
 * - Never send email data to any backend
 */

import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";
import type {
	ConnectorResult,
	OAuthConnectResult,
	EmailSyncResult,
	EmailArtifact,
} from "../../types";
import { normalizeSenderDomain } from "../../engine/normalize";

const OUTLOOK_ACCESS_TOKEN_KEY = "outlook_access_token";
const OUTLOOK_REFRESH_TOKEN_KEY = "outlook_refresh_token";
const OUTLOOK_EMAIL_KEY = "outlook_email";

const MICROSOFT_CLIENT_ID =
	process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ??
	process.env.EXPO_PUBLIC_MS_CLIENT_ID ??
	"";
const TENANT = "common";

const MS_SCOPES = ["openid", "profile", "email", "offline_access", "Mail.Read"];

const GRAPH_FILTER =
	"contains(subject,'receipt') or contains(subject,'invoice') or contains(subject,'subscription') or contains(subject,'payment') or contains(subject,'billing') or contains(subject,'charged') or contains(subject,'renewal')";

export function isOutlookConfigured(): boolean {
	return MICROSOFT_CLIENT_ID.length > 0;
}

export async function connectOutlook(): Promise<
	ConnectorResult<OAuthConnectResult>
> {
	if (!isOutlookConfigured()) {
		return {
			success: false,
			error: "Microsoft OAuth not configured",
			isDemo: true,
		};
	}

	try {
		const discovery = {
			authorizationEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`,
			tokenEndpoint: `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
		};

		const redirectUri = AuthSession.makeRedirectUri({ scheme: "subscrub" });
		const request = new AuthSession.AuthRequest({
			clientId: MICROSOFT_CLIENT_ID,
			scopes: MS_SCOPES,
			redirectUri,
			responseType: AuthSession.ResponseType.Code,
			usePKCE: true,
		});

		const result = await request.promptAsync(discovery);
		if (result.type !== "success" || !result.params.code) {
			return {
				success: false,
				error: result.type === "cancel" ? "Cancelled" : "Auth failed",
			};
		}

		const tokenResp = await fetch(
			`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
			{
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					code: result.params.code,
					client_id: MICROSOFT_CLIENT_ID,
					redirect_uri: redirectUri,
					grant_type: "authorization_code",
					code_verifier: request.codeVerifier ?? "",
				}).toString(),
			},
		);
		const tokens = await tokenResp.json();
		if (!tokens.access_token) throw new Error("No access token");

		const meResp = await fetch("https://graph.microsoft.com/v1.0/me", {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		});
		const me = await meResp.json();
		const email = (me.mail ?? me.userPrincipalName ?? "") as string;
		const masked = email.replace(/(.{2}).+(@.+)/, "$1***$2");

		await SecureStore.setItemAsync(
			OUTLOOK_ACCESS_TOKEN_KEY,
			tokens.access_token,
		);
		if (tokens.refresh_token) {
			await SecureStore.setItemAsync(
				OUTLOOK_REFRESH_TOKEN_KEY,
				tokens.refresh_token,
			);
		}
		await SecureStore.setItemAsync(OUTLOOK_EMAIL_KEY, email);

		return {
			success: true,
			data: { maskedEmail: masked, accessToken: tokens.access_token },
		};
	} catch (e) {
		return { success: false, error: String(e) };
	}
}

export async function syncOutlookEmails(
	sourceConnectionId: string,
): Promise<ConnectorResult<EmailSyncResult>> {
	const accessToken = await SecureStore.getItemAsync(OUTLOOK_ACCESS_TOKEN_KEY);
	if (!accessToken)
		return { success: false, error: "Not connected to Outlook" };

	try {
		const url =
			`https://graph.microsoft.com/v1.0/me/messages` +
			`?$filter=${encodeURIComponent(GRAPH_FILTER)}` +
			`&$select=subject,from,receivedDateTime,bodyPreview` +
			`&$top=100&$orderby=receivedDateTime desc`;

		const resp = await fetch(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		const json = await resp.json();
		const messages = json.value ?? [];

		const emails: EmailArtifact[] = messages.map(
			(m: {
				id: string;
				subject: string;
				from: { emailAddress: { address: string } };
				receivedDateTime: string;
				bodyPreview?: string;
			}) => {
				const sender = m.from?.emailAddress?.address ?? "";
				const domain = normalizeSenderDomain(sender);
				return {
					id: uuidv4(),
					sourceConnectionId,
					providerHint: null,
					sender,
					subject: m.subject ?? "",
					snippet: (m.bodyPreview ?? "").substring(0, 200),
					receivedAt: m.receivedDateTime,
					fingerprint: `${domain}|${(m.subject ?? "").substring(0, 50)}|${m.receivedDateTime}`,
					rawHash: m.id,
					createdAt: new Date().toISOString(),
				};
			},
		);

		return { success: true, data: { emails, sourceConnectionId } };
	} catch (e) {
		return { success: false, error: String(e) };
	}
}

export async function disconnectOutlook(): Promise<void> {
	await SecureStore.deleteItemAsync(OUTLOOK_ACCESS_TOKEN_KEY);
	await SecureStore.deleteItemAsync(OUTLOOK_REFRESH_TOKEN_KEY);
	await SecureStore.deleteItemAsync(OUTLOOK_EMAIL_KEY);
}

export async function isOutlookConnected(): Promise<boolean> {
	const token = await SecureStore.getItemAsync(OUTLOOK_ACCESS_TOKEN_KEY);
	return !!token;
}
