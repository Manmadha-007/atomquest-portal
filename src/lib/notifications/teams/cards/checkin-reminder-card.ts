import { buildGoalUrl } from "../../routing";
import { NotificationEvent } from "../../types";

export interface CheckinReminderCardData {
  employeeName: string;
  goalTitle: string;
  goalId: string;
}

export function generateCheckinReminderCard(data: CheckinReminderCardData) {
  const goalUrl = buildGoalUrl(data.goalId, NotificationEvent.CHECKIN_REMINDER);

  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      {
        type: "TextBlock",
        text: "Quarterly Check-in Reminder",
        weight: "Bolder",
        size: "Large",
        color: "Attention",
      },
      {
        type: "TextBlock",
        text: `Hello ${data.employeeName}, it is time for your regular goal check-in. Please take a moment to update your progress.`,
        wrap: true,
      },
      {
        type: "FactSet",
        facts: [
          {
            title: "Goal",
            value: data.goalTitle,
          },
        ],
      },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "Update Progress",
        url: goalUrl,
      },
    ],
  };
}
