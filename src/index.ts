import { startPolling, sendMessage } from "./service/telegram";
import { handleChat, clearHistory } from "./chat";

async function handleUpdate(update: any): Promise<string> {
  const text = update.message.text.trim();

  if (text === "/clear") {
    clearHistory();
    await sendMessage("Conversation cleared.");
    return "";
  }

  return handleChat(text);
}

console.log("god is booting up...");
startPolling(handleUpdate);
