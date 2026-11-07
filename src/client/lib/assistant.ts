// Assistant data hooks. Replies stream as plain text from POST /api/v1/assistant/chat.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ok } from "./api";

const a = api.assistant;

export const assistantKeys = {
  status: ["assistant", "status"] as const,
  list: ["assistant", "conversations"] as const,
  convo: (id: string) => ["assistant", "conversation", id] as const,
};

export function useAssistantStatus() {
  return useQuery({ queryKey: assistantKeys.status, queryFn: async () => ok(await a.status.$get()) });
}

export function useConversations() {
  return useQuery({ queryKey: assistantKeys.list, queryFn: async () => (await ok(await a.conversations.$get())).items });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: assistantKeys.convo(id ?? "none"),
    enabled: Boolean(id),
    queryFn: async () => ok(await a.conversations[":id"].$get({ param: { id: id! } })),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => ok(await a.conversations[":id"].$delete({ param: { id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: assistantKeys.list }),
  });
}

export function useRateMessage() {
  return useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: -1 | 0 | 1 }) => ok(await a.messages[":id"].rating.$post({ param: { id }, json: { rating } })),
  });
}

export type SendResult =
  | { kind: "reply"; conversationId: string }
  | { kind: "emergency"; conversationId: string; reason: string; number: string; content: string }
  | { kind: "quota" | "unavailable"; conversationId: string | null }
  | { kind: "error"; message: string; conversationId: string | null };

/** Send a message; `onText` receives the reply as it streams in. */
export async function sendMessage(message: string, conversationId: string | null, onText: (soFar: string) => void, signal?: AbortSignal): Promise<SendResult> {
  const res = await fetch("/api/v1/assistant/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(conversationId ? { message, conversationId } : { message }),
    signal,
  });
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await res.json().catch(() => ({}))) as {
      kind?: string;
      conversationId?: string;
      reason?: string;
      number?: string;
      message?: { content: string };
      error?: string;
    };
    if (body.kind === "emergency") {
      return { kind: "emergency", conversationId: body.conversationId!, reason: body.reason!, number: body.number!, content: body.message!.content };
    }
    if (body.kind === "quota" || body.kind === "unavailable") return { kind: body.kind, conversationId: body.conversationId ?? null };
    return { kind: "error", message: body.error === "not_found" ? "That conversation no longer exists." : "Something went wrong. Try again.", conversationId: null };
  }
  const id = res.headers.get("x-conversation-id")!;
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += value;
    onText(text);
  }
  return { kind: "reply", conversationId: id };
}
