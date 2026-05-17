export interface GoalRejectedCardData {
  employeeName: string;
  goalTitle: string;
  goalId: string;
  reviewerName: string;
  comments: string;
}

/**
 * Generates a Microsoft Adaptive Card (v1.2) payload for a GOAL_REJECTED event.
 */
export function generateGoalRejectedCard(data: GoalRejectedCardData): Record<string, unknown> {
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
        text: '⚠️ Goal Returned for Revision',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: `**${data.reviewerName}** has returned a goal submitted by **${data.employeeName}** for revision.`,
        wrap: true,
        spacing: 'Small',
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
            title: 'Returned by:',
            value: data.reviewerName,
          },
          {
            title: 'Owner:',
            value: data.employeeName,
          },
        ],
      },
      {
        type: 'TextBlock',
        text: '**Manager Feedback:**',
        wrap: true,
        separator: true,
        spacing: 'Medium',
      },
      {
        type: 'TextBlock',
        text: data.comments,
        wrap: true,
        spacing: 'Small',
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Revise Goal',
        url: goalUrl,
      },
    ],
  };
}
