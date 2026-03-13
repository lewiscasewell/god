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
    {
        type: 'function',
        function: {
            name: 'pi_stats',
            description: 'Get system stats for the Raspberry Pi: CPU temp, load, memory, disk, Docker containers, Ollama models, and uptime. Use when the user asks about system health, performance, or resource usage.',
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
        case 'pi_stats': {
            try {
                const proc = Bun.spawn(['bash', '-c', `
echo '=== Pi Stats ==='
echo
echo '--- CPU ---'
vcgencmd measure_temp 2>/dev/null || echo 'temp: N/A'
echo "load: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
echo "cores: $(nproc)"
echo
echo '--- Memory ---'
free -h | awk '/Mem:/{printf "total: %s  used: %s  free: %s  available: %s\\n", $2, $3, $4, $7}'
free -h | awk '/Swap:/{printf "swap:  total: %s  used: %s  free: %s\\n", $2, $3, $4}'
echo
echo '--- Disk ---'
df -h / | awk 'NR==2{printf "total: %s  used: %s  free: %s  (%s used)\\n", $2, $3, $4, $5}'
echo
echo '--- Docker ---'
docker stats --no-stream --format 'table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}' 2>/dev/null || echo 'docker not available'
echo
echo '--- Ollama ---'
curl -s http://localhost:11434/api/ps 2>/dev/null | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    for m in d.get('models',[]):
        print(f\\"model: {m['name']}  size: {m['size']/1e9:.1f}GB  ctx: {m.get('context_length','?')}\\")
    if not d.get('models'):
        print('no models loaded')
except:
    print('not running or no models')
"
echo
echo '--- Uptime ---'
uptime -p 2>/dev/null || uptime
`], { stdout: 'pipe', stderr: 'pipe' });
                const output = await new Response(proc.stdout).text();
                return output || 'No output from stats script';
            } catch (e) {
                return `Failed to get stats: ${e}`;
            }
        }
        default:
            return `Unknown tool: ${name}`;
    }
}
