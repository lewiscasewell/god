import { chat as ollamaChat, type Message } from '../service/ollama';
import { listMemories } from './memory';
import { buildSystemPrompt } from './prompt';
import { TOOL_DEFINITIONS, executeToolCall } from './tools';

let conversationHistory: Message[] = [];
let lastMessageAt = Date.now();
const CONTEXT_TIMEOUT_MS = 10 * 60 * 1000;

export async function handleChat(userMessage: string): Promise<string> {
    const now = Date.now();
    if (now - lastMessageAt > CONTEXT_TIMEOUT_MS) {
        conversationHistory = [];
    }
    lastMessageAt = now;

    const memories = await listMemories();
    conversationHistory.push({ role: 'user', content: userMessage });

    for (let i = 0; i < 5; i++) {
        const messages: Message[] = [
            { role: 'system', content: buildSystemPrompt(memories) },
            ...conversationHistory,
        ];

        const result = await ollamaChat(messages, TOOL_DEFINITIONS);

        if (result.tool_calls && result.tool_calls.length > 0) {
            for (const toolCall of result.tool_calls) {
                const toolResult = await executeToolCall(toolCall);
                conversationHistory.push({ role: 'assistant', content: result.content || '', tool_calls: [toolCall] });
                conversationHistory.push({ role: 'tool', content: toolResult });
            }
            continue;
        }

        conversationHistory.push({ role: 'assistant', content: result.content });
        return result.content;
    }

    return "I got stuck in a loop — try again.";
}

export function clearHistory() {
    conversationHistory = [];
}
