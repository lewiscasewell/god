/** Convert basic markdown to Telegram HTML */
export function markdownToHtml(md: string): string {
    let html = md;

    // Code blocks first (```lang\n...\n```)
    html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre>$1</pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__(.+?)__/g, '<b>$1</b>');

    // Italic *text* or _text_
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
    html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<i>$1</i>');

    return html;
}

/** Convert basic markdown to ANSI terminal codes */
export function markdownToAnsi(md: string): string {
    let text = md;

    // Code blocks
    text = text.replace(/```[\w]*\n([\s\S]*?)```/g, '\x1b[2m$1\x1b[0m');

    // Inline code
    text = text.replace(/`([^`]+)`/g, '\x1b[36m$1\x1b[0m');

    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '\x1b[1m$1\x1b[0m');
    text = text.replace(/__(.+?)__/g, '\x1b[1m$1\x1b[0m');

    // Italic
    text = text.replace(/\*(.+?)\*/g, '\x1b[3m$1\x1b[0m');
    text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '\x1b[3m$1\x1b[0m');

    return text;
}
