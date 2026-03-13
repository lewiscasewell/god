import { saveMemory, getMemory, deleteMemory, listMemories } from './memory';

export interface ToolCall {
    function: {
        name: string;
        arguments: Record<string, string | undefined>;
    };
}

export const TOOL_DEFINITIONS = [
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

export async function executeToolCall(toolCall: ToolCall): Promise<string> {
    const { name, arguments: args } = toolCall.function;

    switch (name) {
        case 'save_memory': {
            const ttl = args.ttl_seconds ? parseInt(args.ttl_seconds, 10) : undefined;
            await saveMemory(args.topic ?? '', args.content ?? '', ttl);
            return `Saved memory: ${args.topic}${ttl ? ` (expires in ${ttl}s)` : ' (permanent)'}`;
        }
        case 'recall_memory': {
            const content = await getMemory(args.topic ?? '');
            return content ?? `No memory found for "${args.topic}"`;
        }
        case 'forget_memory': {
            const deleted = await deleteMemory(args.topic ?? '');
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
