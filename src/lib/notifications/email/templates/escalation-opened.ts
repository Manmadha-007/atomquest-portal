export interface EscalationOpenedEmailData {
  recipientName: string;
  title: string;
  message: string;
  ruleName: string;
  escalationType: string;
  escalationLevel: string;
  goalTitle?: string | null;
  actionUrl: string;
  actionLabel: string;
}

export function generateEscalationOpenedEmail(data: EscalationOpenedEmailData) {
  const subject = `Governance Escalation: ${data.title}`;
  const goalSection = data.goalTitle
    ? `
      <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111;">Related Goal</h3>
        <p style="margin-bottom: 0;">${data.goalTitle}</p>
      </div>
    `
    : "";

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: #111;">${data.title}</h2>
      <p>Hello <strong>${data.recipientName}</strong>,</p>
      <p>${data.message}</p>

      ${goalSection}

      <div style="background-color: #fafafa; border: 1px solid #e4e4e7; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Policy:</strong> ${data.ruleName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Escalation Type:</strong> ${data.escalationType}</p>
        <p style="margin: 0;"><strong>Escalation Level:</strong> ${data.escalationLevel}</p>
      </div>

      <a href="${data.actionUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 16px; font-weight: 500;">
        ${data.actionLabel}
      </a>
    </div>
  `;

  return { subject, html };
}
