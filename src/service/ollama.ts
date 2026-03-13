const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: { function: { name: string; arguments: Record<string, string | undefined> } }[];
}

interface ChatResponse {
    message: Message;
}

export async function chat(messages: Message[], tools?: object[]): Promise<Message> {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
            model: MODEL,
            messages,
            ...(tools ? { tools } : {}),
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
