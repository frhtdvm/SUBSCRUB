/**
 * Demo Outlook Connector
 * Returns empty email result when Microsoft OAuth is not configured.
 * Demo emails come from the Gmail demo connector for consistency.
 */

import type { ConnectorResult, EmailSyncResult } from '../../types';

export async function getDemoOutlookEmails(
  _sourceConnectionId: string
): Promise<ConnectorResult<EmailSyncResult>> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    success: true,
    isDemo: true,
    data: { emails: [], sourceConnectionId: _sourceConnectionId },
  };
}
