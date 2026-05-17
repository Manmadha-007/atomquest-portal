export interface CheckinReminderTemplateData {
  actorName: string;
  goalTitle: string;
  goalId: string;
  message?: string;
}

export function generateCheckinReminderEmail(data: CheckinReminderTemplateData) {
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const goalUrl = `${appBaseUrl}/dashboard/goals/${data.goalId}`;

  const subject = `Reminder: Quarterly Check-in due for "${data.goalTitle}"`;

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: #111;">Check-in Reminder</h2>
      <p>Hello <strong>${data.actorName}</strong>,</p>
      <p>${data.message || 'It is time for your regular goal check-in. Please take a moment to update your progress.'}</p>
      
      <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111;">Goal Title</h3>
        <p style="margin-bottom: 0;">${data.goalTitle}</p>
      </div>
      
      <p>Click the button below to view your goal and add a new progress update.</p>
      
      <a href="${goalUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 16px; font-weight: 500;">
        Update Progress
      </a>
    </div>
  `;

  return { subject, html };
}
