/** Thinking is disabled; discard any reasoning markers emitted by the template. */
export function assistantText(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/gi, '').replace(/<\/think>/gi, '').trim();
}
