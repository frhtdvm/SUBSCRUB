import type { Subscription, LegalTemplate, Jurisdiction } from '../types';

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function generateGDPR(subscription: Subscription): LegalTemplate {
  const subject = `Cancellation Request & Right to Erasure – ${subscription.providerName}`;
  const body = `Subject: Cancellation Request & Right to Erasure Under GDPR

Date: ${formatDate()}

To the Data Controller / Customer Support Team,
${subscription.providerName}${subscription.supportEmail ? `\n<${subscription.supportEmail}>` : ''}

RE: Cancellation of Subscription and Erasure of Personal Data

I am writing to formally request the immediate cancellation of my subscription to ${subscription.providerName} and to exercise my rights under the General Data Protection Regulation (GDPR), specifically:

1. **Right to Cancellation**: I request the immediate cancellation of my active subscription. I do not wish to be charged further.

2. **Right to Erasure (Article 17 GDPR)**: I request the deletion of all personal data you hold about me, including but not limited to name, email address, payment information, usage logs, and any derived data.

3. **Right of Confirmation (Article 15 GDPR)**: Please confirm in writing that my subscription has been cancelled and that my personal data has been erased within 30 days.

Please send written confirmation to the email address associated with this account.

Should you fail to comply within the statutory 30-day period, I reserve the right to file a complaint with the relevant supervisory authority.

Yours faithfully,
[Your Name]
[Your Email Address]
[Account Identifier, if known]`;

  return { jurisdiction: 'GDPR', subject, body };
}

function generateKVKK(subscription: Subscription): LegalTemplate {
  const subject = `Abonelik İptali ve Kişisel Verilerin Silinmesi Talebi – ${subscription.providerName}`;
  const body = `Konu: KVKK Kapsamında Abonelik İptali ve Kişisel Veri Silme Talebi

Tarih: ${formatDate()}

${subscription.providerName} Veri Sorumlusu / Müşteri Hizmetleri Ekibine,
${subscription.supportEmail ? `<${subscription.supportEmail}>` : ''}

Sayın İlgili,

6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamındaki haklarımı kullanarak tarafınıza aşağıdaki taleplerde bulunmaktayım:

1. **Abonelik İptali**: ${subscription.providerName} platformundaki aktif aboneliğimin derhal iptal edilmesini talep ediyorum. Bundan sonra herhangi bir ücret tahsil edilmesini kabul etmiyorum.

2. **Kişisel Verilerin Silinmesi (KVKK Madde 7)**: Ad, e-posta adresi, ödeme bilgileri, kullanım kayıtları ve türev veriler dahil olmak üzere hakkımda tuttuğunuz tüm kişisel verilerin silinmesini talep ediyorum.

3. **Bildirim Talebi (KVKK Madde 11)**: Aboneliğimin iptal edildiğini ve kişisel verilerimin silindiğini 30 gün içinde yazılı olarak teyit etmenizi talep ediyorum.

Belirtilen süre içinde yanıt vermemeniz durumunda Kişisel Verileri Koruma Kurumu'na (KVKK) şikayette bulunma hakkımı saklı tutuyorum.

Saygılarımla,
[Ad Soyad]
[E-posta Adresiniz]
[Varsa Hesap Numaranız]`;

  return { jurisdiction: 'KVKK', subject, body };
}

function generateGeneric(subscription: Subscription): LegalTemplate {
  const subject = `Subscription Cancellation Request – ${subscription.providerName}`;
  const body = `Subject: Subscription Cancellation Request

Date: ${formatDate()}

To Customer Support,
${subscription.providerName}${subscription.supportEmail ? `\n<${subscription.supportEmail}>` : ''}

Dear Support Team,

I am writing to request the immediate cancellation of my subscription to ${subscription.providerName}.

**Subscription Details:**
- Service: ${subscription.providerName}
- Billing Amount: ${subscription.currency} ${subscription.amount.toFixed(2)} per ${subscription.frequency === 'monthly' ? 'month' : 'year'}
${subscription.lastChargeDate ? `- Last Charge Date: ${new Date(subscription.lastChargeDate).toLocaleDateString('en-US')}` : ''}

**Request:**
Please cancel my subscription effective immediately and confirm that no further charges will be made to my payment method.

I would appreciate written confirmation of the cancellation sent to the email address associated with my account.

If there are any outstanding steps required on my part, please advise.

Thank you for your assistance.

Sincerely,
[Your Name]
[Your Email Address]
[Account Identifier, if known]`;

  return { jurisdiction: 'GENERIC', subject, body };
}

/**
 * Generate a cancellation template based on jurisdiction.
 * Never requires LLM – fully deterministic and local.
 */
export function generateLegalTemplate(
  subscription: Subscription,
  jurisdiction: Jurisdiction
): LegalTemplate {
  switch (jurisdiction) {
    case 'GDPR':
      return generateGDPR(subscription);
    case 'KVKK':
      return generateKVKK(subscription);
    default:
      return generateGeneric(subscription);
  }
}
