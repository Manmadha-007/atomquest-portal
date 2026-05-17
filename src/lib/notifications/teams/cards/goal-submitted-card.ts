export interface GoalSubmittedCardData {
  actorName: string;
  goalTitle: string;
  goalId: string;
}

/**
 * Generates a Microsoft Adaptive Card (v1.2) payload for a GOAL_SUBMITTED event.
 *
 * Uses v1.2 for maximum compatibility across Teams desktop, web, and mobile clients.
 * The $schema field is intentionally omitted — it is only needed by the
 * Adaptive Card Designer tool and some webhook endpoints reject it.
 */
export function generateGoalSubmittedCard(data: GoalSubmittedCardData): Record<string, unknown> {
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const goalUrl = `${appBaseUrl}/dashboard/goals/${data.goalId}`;

  return {
    type: 'AdaptiveCard',
    version: '1.2',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: '📋 New Goal Requires Review',
        wrap: true,
      },
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: `**${data.actorName}** has submitted a new goal for your review.`,
                wrap: true,
                spacing: 'Small',
              },
            ],
          },
        ],
      },
      {
        type: 'FactSet',
        separator: true,
        facts: [
          {
            title: 'Goal:',
            value: data.goalTitle,
          },
          {
            title: 'Submitted by:',
            value: data.actorName,
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Review Goal',
        url: goalUrl,
      },
    ],
  };
}
