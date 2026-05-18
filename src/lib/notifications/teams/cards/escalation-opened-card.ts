export interface EscalationOpenedCardData {
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

export function generateEscalationOpenedCard(data: EscalationOpenedCardData) {
  const facts = [
    {
      title: "Policy",
      value: data.ruleName,
    },
    {
      title: "Type",
      value: data.escalationType,
    },
    {
      title: "Level",
      value: data.escalationLevel,
    },
  ];

  if (data.goalTitle) {
    facts.unshift({
      title: "Goal",
      value: data.goalTitle,
    });
  }

  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      {
        type: "TextBlock",
        text: data.title,
        weight: "Bolder",
        size: "Large",
        color: "Attention",
      },
      {
        type: "TextBlock",
        text: `Hello ${data.recipientName}, ${data.message}`,
        wrap: true,
      },
      {
        type: "FactSet",
        facts,
      },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: data.actionLabel,
        url: data.actionUrl,
      },
    ],
  };
}
