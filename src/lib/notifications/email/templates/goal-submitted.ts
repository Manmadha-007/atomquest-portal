export interface GoalSubmittedTemplateData {
  actorName: string;
  goalTitle: string;
  goalId: string;
}

export function generateGoalSubmittedEmail(data: GoalSubmittedTemplateData) {
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const goalUrl = `${appBaseUrl}/dashboard/goals/${data.goalId}`;

  const subject = `Action Required: New Goal Submitted by ${data.actorName}`;

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: #111;">New Goal Requires Review</h2>
      <p>Hello,</p>
      <p><strong>${data.actorName}</strong> has just submitted a new goal for your review.</p>
      
      <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111;">Goal Title</h3>
        <p style="margin-bottom: 0;">${data.goalTitle}</p>
      </div>
      
      <p>Please review the goal and provide your feedback or approval.</p>
      
      <a href="${goalUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 16px; font-weight: 500;">
        Review Goal
      </a>
    </div>
  `;

  return { subject, html };
}
