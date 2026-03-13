import { handleChat, clearHistory } from '../brain';
import { markdownToAnsi } from '../lib/format';

const prompt = '\x1b[36myou>\x1b[0m ';

console.log('\x1b[1mgod\x1b[0m — a 3B parameter deity');
console.log('Type "clear" to reset conversation, ctrl+c to exit.\n');

process.stdout.write(prompt);

for await (const line of console) {
    const input = line.trim();
    if (!input) {
        process.stdout.write(prompt);
        continue;
    }

    if (input === 'clear') {
        clearHistory();
        console.log('\x1b[2mConversation cleared.\x1b[0m');
        process.stdout.write(prompt);
        continue;
    }

    process.stdout.write('\x1b[2mthinking...\x1b[0m');
    const response = await handleChat(input);
    process.stdout.write(`\r\x1b[K\x1b[33mgod>\x1b[0m ${markdownToAnsi(response)}\n`);
    process.stdout.write(prompt);
}
