// Workers AI wrapper. Turns the model's server-sent events into a plain text stream for the
// browser and reports the full reply (and token counts) when the stream ends.
//
// AI_MODE=fake (tests only) answers with a fixed, clearly-labelled text instead of calling a model.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatResult = { text: string; tokensIn: number | null; tokensOut: number | null };

export const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function aiAvailable(env: Env): boolean {
  return env.AI_MODE === "fake" || Boolean((env as { AI?: unknown }).AI);
}

export async function streamChat(env: Env, messages: ChatMessage[], onDone: (r: ChatResult) => Promise<void>): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  if (env.AI_MODE === "fake") {
    const last = messages[messages.length - 1]?.content ?? "";
    const text = `[test model] You asked: ${last.slice(0, 80)}`;
    return new ReadableStream({
      async start(controller) {
        for (const part of text.match(/.{1,12}/gs) ?? []) controller.enqueue(encoder.encode(part));
        await onDone({ text, tokensIn: 10, tokensOut: 10 });
        controller.close();
      },
    });
  }

  const model = (env.AI_MODEL || DEFAULT_MODEL) as Parameters<Ai["run"]>[0];
  const upstream = (await env.AI.run(model, { messages, stream: true, max_tokens: 700, temperature: 0.3 } as never)) as unknown as ReadableStream<Uint8Array>;

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let tokensIn: number | null = null;
  let tokensOut: number | null = null;

  const handle = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    try {
      const evt = JSON.parse(data) as { response?: unknown; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      if (typeof evt.response === "string" && evt.response) {
        full += evt.response;
        controller.enqueue(encoder.encode(evt.response));
      }
      if (evt.usage) {
        tokensIn = evt.usage.prompt_tokens ?? tokensIn;
        tokensOut = evt.usage.completion_tokens ?? tokensOut;
      }
    } catch {
      // A partial or non-JSON event: skip it rather than break the reply.
    }
  };

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) handle(line, controller);
      },
      async flush(controller) {
        if (buffer) handle(buffer, controller);
        await onDone({ text: full, tokensIn, tokensOut });
      },
    }),
  );
}
