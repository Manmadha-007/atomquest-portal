export interface GoalApprovedCardData {
  employeeName: string;
  goalTitle: string;
  goalId: string;
  approverName: string;
}

/**
 * Generates a Microsoft Adaptive Card (v1.2) payload for a GOAL_APPROVED event.
 */
export function generateGoalApprovedCard(data: GoalApprovedCardData): Record<string, unknown> {
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
        text: '✅ Goal Approved',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: `**${data.approverName}** has approved a goal submitted by **${data.employeeName}**.`,
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
            title: 'Approved by:',
            value: data.approverName,
          },
          {
            title: 'Owner:',
            value: data.employeeName,
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Goal',
        url: goalUrl,
      },
    ],
  };
}
