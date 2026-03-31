/**
 * Demo Gmail Connector
 * Returns seeded demo emails when Google OAuth is not configured.
 */

import { v4 as uuidv4 } from 'uuid';
import demoEmails from '../../data/demo-emails.json';
import type { ConnectorResult, EmailSyncResult, EmailArtifact } from '../../types';

export async function getDemoEmails(
  sourceConnectionId: string
): Promise<ConnectorResult<EmailSyncResult>> {
  await new Promise((r) => setTimeout(r, 600));

  const emails: EmailArtifact[] = (demoEmails as EmailArtifact[]).map((e) => ({
    ...e,
    id: uuidv4(),
    sourceConnectionId,
  }));

  return {
    success: true,
    isDemo: true,
    data: { emails, sourceConnectionId },
  };
}
