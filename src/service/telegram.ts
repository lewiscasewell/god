const TELEGRAM_BOT_TOKEN = process.env.GOD_TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.GOD_TELEGRAM_CHAT_ID!;

async function tg(method: string, body: object, maxTime = 10): Promise<any> {
  const proc = Bun.spawn(
    [
      "curl",
      "-s",
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify(body),
      "--max-time",
      String(maxTime),
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    ],
    { stdout: "pipe" },
  );
  const text = await new Response(proc.stdout).text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function sendMessage(
  text: string,
  parseMode?: string,
): Promise<number> {
  const data = await tg("sendMessage", {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    ...(parseMode ? { parse_mode: parseMode } : {}),
  });
  return data?.result?.message_id ?? 0;
}

export async function editMessage(
  messageId: number,
  text: string,
  parseMode?: string,
) {
  await tg("editMessageText", {
    chat_id: TELEGRAM_CHAT_ID,
    message_id: messageId,
    text,
    ...(parseMode ? { parse_mode: parseMode } : {}),
  });
}

export async function sendThinking(): Promise<number> {
  return sendMessage("<i>thinking...</i>", "HTML");
}

export async function editWithResponse(messageId: number, markdown: string) {
  const { markdownToHtml } = await import("./format");
  const html = markdownToHtml(markdown);

  const data = await tg("editMessageText", {
    chat_id: TELEGRAM_CHAT_ID,
    message_id: messageId,
    text: html,
    parse_mode: "HTML",
  });

  if (!data?.ok) {
    await editMessage(messageId, markdown);
  }
}

export async function registerBotCommands() {
  await tg("setMyCommands", {
    commands: [
      { command: "clear", description: "Clear conversation history" },
    ],
  });
}

let offset = 0;

export async function startPolling(handler: (update: any) => Promise<string>) {
  await tg("deleteWebhook", {});
  await registerBotCommands();
  console.log("Telegram polling started");

  while (true) {
    try {
      const data = await tg("getUpdates", { offset, timeout: 1 }, 5);

      if (!data?.ok || !data.result?.length) continue;

      for (const update of data.result) {
        offset = update.update_id + 1;
        const message = update?.message;
        if (!message?.text || String(message.chat.id) !== TELEGRAM_CHAT_ID)
          continue;

        const thinkingId = await sendThinking();

        try {
          const response = await handler(update);
          if (response && thinkingId) {
            await editWithResponse(thinkingId, response);
          } else if (response) {
            await sendMessage(response);
          }
        } catch (err: any) {
          console.log("Handler error:", err?.message ?? err);
          if (thinkingId) {
            await editMessage(thinkingId, "Brain fart. Try again.");
          }
        }
      }
    } catch (err: any) {
      console.log("Poll error:", err?.message ?? err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
