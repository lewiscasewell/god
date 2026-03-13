const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
}

export interface ToolCall {
    function: {
        name: string;
        arguments: Record<string, string>;
    };
}

interface ChatResponse {
    message: {
        role: string;
        content: string;
        tool_calls?: ToolCall[];
    };
}

const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'save_memory',
            description: 'Save something to memory. Use when the user tells you something worth remembering. Set a TTL for temporary things (reminders, tasks, shopping) and no TTL for permanent facts (name, preferences, job).',
            parameters: {
                type: 'object',
                properties: {
                    topic: { type: 'string', description: 'Short key for the memory, e.g. "name", "job", "buy_chicken"' },
                    content: { type: 'string', description: 'The content to remember' },
                    ttl_seconds: { type: 'number', description: 'Optional expiry in seconds. Use for temporary things: 3600 = 1 hour, 28800 = 8 hours, 86400 = 1 day. Omit for permanent memories.' },
                },
                required: ['topic', 'content'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'recall_memory',
            description: 'Look up a specific memory by topic.',
            parameters: {
                type: 'object',
                properties: {
                    topic: { type: 'string', description: 'The topic to recall' },
                },
                required: ['topic'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'forget_memory',
            description: 'Delete a memory. Use when the user asks you to forget something.',
            parameters: {
                type: 'object',
                properties: {
                    topic: { type: 'string', description: 'The topic to forget' },
                },
                required: ['topic'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_memories',
            description: 'List all stored memories. Use when the user asks what you remember.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
];

export async function chat(messages: Message[]): Promise<ChatResponse['message']> {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
            model: MODEL,
            messages,
            tools: TOOLS,
            stream: false,
            keep_alive: '10m',
            options: {
                num_ctx: 2048,
            },
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as ChatResponse;
    return data.message;
}
