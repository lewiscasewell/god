import { redis } from "bun";

const MEMORY_PREFIX = "memory:";

export async function saveMemory(topic: string, content: string, ttlSeconds?: number) {
    const key = `${MEMORY_PREFIX}${topic}`;
    await redis.set(key, content);
    if (ttlSeconds) {
        await redis.expire(key, ttlSeconds);
    }
}

export async function getMemory(topic: string): Promise<string | null> {
    return redis.get(`${MEMORY_PREFIX}${topic}`);
}

export async function deleteMemory(topic: string): Promise<boolean> {
    const key = `${MEMORY_PREFIX}${topic}`;
    const exists = await redis.get(key);
    if (!exists) return false;
    await redis.del(key);
    return true;
}

export async function listMemories(): Promise<{ topic: string; content: string }[]> {
    const keys = await redis.keys(`${MEMORY_PREFIX}*`);
    const memories: { topic: string; content: string }[] = [];
    for (const key of keys) {
        const content = await redis.get(key);
        if (content) {
            memories.push({ topic: key.slice(MEMORY_PREFIX.length), content });
        }
    }
    return memories;
}
