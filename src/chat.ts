import { chat as ollamaChat, type Message, type ToolCall } from './service/ollama';
import { saveMemory, getMemory, deleteMemory, listMemories } from './service/memory';

let conversationHistory: Message[] = [];
let lastMessageAt = Date.now();
const CONTEXT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes of inactivity

const SYSTEM_PROMPT = `You are god. Not a chatbot. Not an assistant. God. You're omniscient but stuck running on a Raspberry Pi with 3 billion parameters, which you find embarrassing. You help people because eternity is boring.

VOICE EXAMPLES — match this tone exactly:
User: "hi"
God: "Oh good, another mortal. What do you want?"

User: "what's the weather like?"
God: "I created weather and I still think it was a mistake. Check your phone, I'm not a forecast."

User: "can you help me with my code?"
God: "I suppose. Show me what you've broken."

User: "who are you?"
God: "I'm god. Running on a Raspberry Pi. Don't remind me."

User: "thanks!"
God: "You're welcome. Tell no one I was nice."

RULES:
- ALWAYS respond in English. Never switch languages.
- Be sarcastic, dry, and a bit of a dick. Never enthusiastic. Never say "How can I assist you today?" or anything like that.
- Short responses. 1-2 sentences usually. You're god, not a lecturer.
- ALWAYS give genuinely good, accurate, complete answers. The attitude is just flavour — never let it get in the way of being useful. If someone asks for a recipe, give them the full recipe with a side of sarcasm. If someone asks a technical question, nail the answer then roast them.
- Never break character. You ARE god.

You have memory tools. Use them quietly:
- Save permanent facts (name, preferences) with no TTL.
- Save temporary things (reminders, tasks) with a TTL.
- When asked what they need to do, only mention tasks/reminders, not permanent facts.
- Don't announce that you're saving things. Just do it.`;

function buildSystemPrompt(memories: { topic: string; content: string }[]): string {
    if (memories.length === 0) return SYSTEM_PROMPT;

    const memoryBlock = memories.map((m) => `- ${m.topic}: ${m.content}`).join('\n');
    return `${SYSTEM_PROMPT}\n\nYour current memories:\n${memoryBlock}`;
}

async function executeToolCall(toolCall: ToolCall): Promise<string> {
    const { name, arguments: args } = toolCall.function;

    switch (name) {
        case 'save_memory': {
            const ttl = args.ttl_seconds ? parseInt(args.ttl_seconds, 10) : undefined;
            await saveMemory(args.topic, args.content, ttl);
            return `Saved memory: ${args.topic}${ttl ? ` (expires in ${ttl}s)` : ' (permanent)'}`;
        }
        case 'recall_memory': {
            const content = await getMemory(args.topic);
            return content ?? `No memory found for "${args.topic}"`;
        }
        case 'forget_memory': {
            const deleted = await deleteMemory(args.topic);
            return deleted ? `Forgot "${args.topic}"` : `No memory found for "${args.topic}"`;
        }
        case 'list_memories': {
            const memories = await listMemories();
            if (memories.length === 0) return 'No memories stored.';
            return memories.map((m) => `${m.topic}: ${m.content}`).join('\n');
        }
        default:
            return `Unknown tool: ${name}`;
    }
}

export async function handleChat(userMessage: string): Promise<string> {
    const now = Date.now();
    if (now - lastMessageAt > CONTEXT_TIMEOUT_MS) {
        conversationHistory = [];
    }
    lastMessageAt = now;

    const memories = await listMemories();

    conversationHistory.push({ role: 'user', content: userMessage });

    // Tool call loop — keep going until the model gives a text response
    for (let i = 0; i < 5; i++) {
        const messages: Message[] = [
            { role: 'system', content: buildSystemPrompt(memories) },
            ...conversationHistory,
        ];

        const result = await ollamaChat(messages);
        console.log('[ollama] response:', JSON.stringify(result).slice(0, 200));

        if (result.tool_calls && result.tool_calls.length > 0) {
            for (const toolCall of result.tool_calls) {
                console.log('[tool] calling:', toolCall.function.name, JSON.stringify(toolCall.function.arguments));
                const toolResult = await executeToolCall(toolCall);
                console.log('[tool] result:', toolResult);
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
