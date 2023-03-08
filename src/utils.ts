export enum IncomingEventType {
  Event,
  Action,
  Command,
  Options,
  ViewAction,
  Shortcut,
}

export function getEventTypeName(index: IncomingEventType | undefined): string {
  index = index || 0;
  const incomingEvent = IncomingEventType;
  return incomingEvent[index];
}

// borrowed the logic from Slack's SDK on deciding which type of request this is (event, shortcut, view, etc.)
// https://github.com/slackapi/bolt-js/blob/main/src/helpers.ts#L31
// Small edits made because I want the Path concept in there
export function getTypeAndConversationAndPathKey(
  body: any,
): { type?: IncomingEventType; conversationId?: string; pathKey?: string } {
  if (body.event !== undefined) {
    const { event } = body;
    // Simplest handlers can just use even type
    const pathKey = body.event.type;

    // Find conversationId
    const conversationId: string | undefined = (() => {
      let foundConversationId: string;
      if ("channel" in event) {
        if (typeof event.channel === "string") {
          foundConversationId = event.channel;
        } else if ("id" in event.channel) {
          foundConversationId = event.channel.id;
        }
      }
      if ("channel_id" in event) {
        foundConversationId = event.channel_id;
      }
      if ("item" in event && "channel" in event.item) {
        // no channel for reaction_added, reaction_removed, star_added, or star_removed with file or file_comment items
        foundConversationId = event.item.channel as string;
      }
      // Using non-null assertion (!) because the alternative is to use `foundConversation: (string | undefined)`, which
      // impedes the very useful type checker help above that ensures the value is only defined to strings, not
      // undefined. This is safe when used in combination with the || operator with a default value.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return foundConversationId! || undefined;
    })();
    return {
      conversationId,
      type: IncomingEventType.Event,
      pathKey,
    };
  }

  if (body.command !== undefined) {
    return {
      type: IncomingEventType.Command,
      conversationId: body?.channel_id,
    };
  }
  if (body.name !== undefined || body.type === "block_suggestion") {
    const optionsBody = body;
    return {
      type: IncomingEventType.Options,
      conversationId: optionsBody.channel !== undefined
        ? optionsBody.channel.id
        : undefined,
    };
  }
  if (
    body.actions !== undefined || body.type === "dialog_submission" ||
    body.type === "workflow_step_edit"
  ) {
    const actionBody = body;
    return {
      type: IncomingEventType.Action,
      conversationId: actionBody.channel !== undefined
        ? actionBody.channel.id
        : undefined,
      pathKey: body?.callback_id,
    };
  }
  if (body.type === "shortcut") {
    return {
      type: IncomingEventType.Shortcut,
      pathKey: body?.callback_id,
    };
  }
  if (body.type === "message_action") {
    const shortcutBody = body;
    return {
      type: IncomingEventType.Shortcut,
      conversationId: shortcutBody.channel !== undefined
        ? shortcutBody.channel.id
        : undefined,
      pathKey: body?.callback_id,
    };
  }
  if (body.type === "view_submission" || body.type === "view_closed") {
    return {
      type: IncomingEventType.ViewAction,
      pathKey: body?.view?.callback_id,
    };
  }
  return {};
}

export function buildSampleAppHome(user_id: string): string {
  // Build your own designs at https://app.slack.com/block-kit-builder/
  let blocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `Example app home with emojis! 😀 and more! <@${user_id}>`,
      },
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `Random Number per render: ${
          Math.round(Math.random() * 10000)
        }`,
      },
    },
    {
      "type": "actions",
      "elements": [
        // {
        // 	"type": "button",
        // 	"text": {
        // 		"type": "plain_text",
        // 		"text": "Open Modal",
        // 		"emoji": true
        // 	},
        // 	"value": "click_me_123",
        // 	"action_id": "open-modal"
        // },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Go To Google",
            "emoji": true,
          },
          "value": "click_me_123",
          "url": "https://google.com",
          "action_id": "button-action",
        },
      ],
    },
  ];
  const appHomeView = {
    type: "home",
    blocks: blocks,
  };
  return JSON.stringify(appHomeView);
}
