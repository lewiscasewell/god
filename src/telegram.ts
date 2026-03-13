import { startPolling, sendMessage } from './interface/telegram';
import { handleChat, clearHistory } from './brain';

async function handleUpdate(update: any): Promise<string> {
    const text = update.message.text.trim();

    if (text === '/clear') {
        clearHistory();
        await sendMessage('Conversation cleared.');
        return '';
    }

    return handleChat(text);
}

console.log('god is booting up...');
startPolling(handleUpdate);
