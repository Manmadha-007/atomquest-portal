import { buildGoalUrl } from "../../routing";
import { NotificationEvent } from "../../types";

export interface GoalApprovedTemplateData {
  employeeName: string;
  goalTitle: string;
  goalId: string;
  approverName: string;
}

export function generateGoalApprovedEmail(data: GoalApprovedTemplateData) {
  const goalUrl = buildGoalUrl(data.goalId, NotificationEvent.GOAL_APPROVED);

  const subject = `Your Goal Has Been Approved: "${data.goalTitle}"`;

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: #111;">Goal Approved ✅</h2>
      <p>Hello <strong>${data.employeeName}</strong>,</p>
      <p>Your goal has been reviewed and approved by <strong>${data.approverName}</strong>.</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111;">Approved Goal</h3>
        <p style="margin-bottom: 0;">${data.goalTitle}</p>
      </div>
      
      <p>You can now begin tracking progress with quarterly updates.</p>
      
      <a href="${goalUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 16px; font-weight: 500;">
        View Goal
      </a>
    </div>
  `;

  return { subject, html };
}
