import { buildGoalUrl } from "../../routing";
import { NotificationEvent } from "../../types";

export interface GoalRejectedTemplateData {
  employeeName: string;
  goalTitle: string;
  goalId: string;
  reviewerName: string;
  comments: string;
}

export function generateGoalRejectedEmail(data: GoalRejectedTemplateData) {
  const goalUrl = buildGoalUrl(data.goalId, NotificationEvent.GOAL_REJECTED);

  const subject = `Action Required: Your Goal Was Returned — "${data.goalTitle}"`;

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.5;">
      <h2 style="color: #111;">Goal Returned for Revision</h2>
      <p>Hello <strong>${data.employeeName}</strong>,</p>
      <p>Your goal has been reviewed by <strong>${data.reviewerName}</strong> and requires changes before it can be approved.</p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111;">Goal</h3>
        <p style="margin-bottom: 0;">${data.goalTitle}</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #111;">Manager Feedback</h3>
        <p style="margin-bottom: 0; white-space: pre-wrap;">${data.comments}</p>
      </div>
      
      <p>Please review the feedback and update your goal accordingly.</p>
      
      <a href="${goalUrl}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 16px; font-weight: 500;">
        Revise Goal
      </a>
    </div>
  `;

  return { subject, html };
}
