import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { EMERGENCY_REASONS, emergencyInText, emergencyKindOf, SUGGESTED_PROMPTS } from "../../shared/assistant";
import { emergencyNumber } from "../../shared/emergency";
import {
  assistantKeys,
  sendMessage,
  useAssistantStatus,
  useConversation,
  useConversations,
  useDeleteConversation,
  useRateMessage,
} from "../lib/assistant";
import { useProfile } from "../lib/queries";
import { timeAgo } from "../lib/format";
import { Button, Loading } from "../components/ui";
import { AiConsent } from "../components/Account";

// The assistant answers from the patient's own record. Emergencies are caught by fixed rules
// (in the browser as you type, and again on the server) and never wait for the model.

type Pending = { user: string; reply: string; streaming: boolean; emergency?: { reason: string; number: string; content: string }; error?: string };

export function Assistant() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get("c");
  const qc = useQueryClient();
  const status = useAssistantStatus();
  const convo = useConversation(activeId);
  const [pending, setPending] = useState<Pending | null>(null);
  const [showList, setShowList] = useState(false);
  const [draft, setDraft] = useState("");
  const { data: profile } = useProfile();
  const number = emergencyNumber(profile?.country);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  const messages = activeId ? (convo.data?.messages ?? []) : [];
  const busy = pending?.streaming ?? false;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending?.reply, pending?.user]);

  useEffect(() => () => abort.current?.abort(), []);

  function open(id: string | null) {
    abort.current?.abort();
    setPending(null);
    setShowList(false);
    setParams(id ? { c: id } : {}, { replace: false });
  }

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    abort.current = new AbortController();
    setPending({ user: message, reply: "", streaming: true });
    try {
      const result = await sendMessage(message, activeId, (soFar) => setPending((p) => p && { ...p, reply: soFar }), abort.current.signal);
      if (result.kind === "emergency") {
        setPending({ user: message, reply: "", streaming: false, emergency: { reason: result.reason, number: result.number, content: result.content } });
      } else if (result.kind === "quota") {
        setDraft(message);
        setPending({ user: message, reply: "", streaming: false, error: "You've used today's questions. The assistant will be back tomorrow; your question is still in the box below. Your record and charts work as usual." });
      } else if (result.kind === "unavailable") {
        setDraft(message);
        setPending({ user: message, reply: "", streaming: false, error: `The assistant isn't available right now. Your question is still in the box below, so you can send it again in a little while. If you have symptoms that worry you now, call ${number}.` });
      } else if (result.kind === "consent") {
        setDraft(message);
        setPending(null);
        void qc.invalidateQueries({ queryKey: assistantKeys.status });
      } else if (result.kind === "error") {
        setDraft(message);
        setPending({ user: message, reply: "", streaming: false, error: result.message });
      } else {
        setPending((p) => p && { ...p, streaming: false });
      }
      const id = result.conversationId;
      await Promise.all([
        qc.invalidateQueries({ queryKey: assistantKeys.list }),
        qc.invalidateQueries({ queryKey: assistantKeys.status }),
        id ? qc.invalidateQueries({ queryKey: assistantKeys.convo(id) }) : null,
      ]);
      if (id && id !== activeId) setParams({ c: id });
      // Saved messages now include this turn; keep failures visible until the next question.
      if (result.kind === "reply" || result.kind === "emergency") setPending(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setDraft(message);
      setPending({ user: message, reply: "", streaming: false, error: "Couldn't reach the assistant. Check your connection and try again." });
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
      <aside className={`${showList ? "block" : "hidden"} lg:block`} aria-label="Conversations">
        <ConversationList activeId={activeId} onOpen={open} />
      </aside>

      <section className="flex min-h-[calc(100dvh-16rem)] min-w-0 flex-col">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light sm:text-4xl">Assistant</h1>
            <p className="mt-2 max-w-prose text-ink-muted">Ask about your readings, medicines and symptoms. Answers come from your own record.</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setShowList((s) => !s)} aria-expanded={showList}>
              {showList ? "Hide history" : "History"}
            </Button>
            {activeId && (
              <Button variant="secondary" size="sm" onClick={() => open(null)}>
                New conversation
              </Button>
            )}
          </div>
        </div>

        {status.data && !status.data.consented ? (
          <AiConsent />
        ) : (
          <>
        <div className="flex-1 space-y-8" aria-live="polite">
          {activeId && convo.isPending && <Loading label="Loading conversation" />}
          {!activeId && !pending && <Suggestions onPick={ask} disabled={busy || status.data?.available === false} />}
          {messages.map((m, i) => {
            if (m.role === "user") return <UserBubble key={m.id}>{m.content}</UserBubble>;
            const kind = emergencyKindOf(m.content);
            if (kind) return <EmergencyReply key={m.id} reason={EMERGENCY_REASONS[kind]} number={number} content={m.content} />;
            const asked = messages[i - 1]?.role === "user" ? emergencyInText(messages[i - 1]!.content) : null;
            return (
              <div key={m.id}>
                <AssistantReply id={m.id} text={m.content} rating={m.rating} />
                {asked && !asked.emergency && asked.mention && <MentionNote number={number} />}
              </div>
            );
          })}
          {pending && (
            <>
              <UserBubble>{pending.user}</UserBubble>
              {pending.emergency ? (
                <EmergencyReply {...pending.emergency} />
              ) : pending.error ? (
                <p role="alert" className="rounded-control bg-well px-4 py-3 text-ink">
                  {pending.error}
                </p>
              ) : (
                <AssistantReply text={pending.reply} streaming={pending.streaming} />
              )}
            </>
          )}
          <div ref={bottom} />
        </div>

        <Composer draft={draft} setDraft={setDraft} number={number} onSend={ask} busy={busy} status={status.data} />
          </>
        )}
      </section>
    </div>
  );
}

function ConversationList({ activeId, onOpen }: { activeId: string | null; onOpen: (id: string | null) => void }) {
  const { data, isPending } = useConversations();
  const del = useDeleteConversation();
  return (
    <div className="lg:sticky lg:top-24">
      <button
        onClick={() => onOpen(null)}
        className={`mb-3 w-full rounded-full px-3.5 py-2 text-left text-[0.9375rem] transition-colors ${!activeId ? "bg-ink/[0.06] font-[560] text-ink" : "text-ink-muted hover:text-ink"}`}
      >
        New conversation
      </button>
      {isPending ? (
        <Loading lines={3} />
      ) : !data?.length ? (
        <p className="px-3.5 text-sm text-ink-faint">Past conversations appear here.</p>
      ) : (
        <ul className="space-y-0.5">
          {data.map((c) => (
            <li key={c.id} className="group relative">
              <button
                onClick={() => onOpen(c.id)}
                className={`w-full rounded-control px-3.5 py-2 pr-10 text-left transition-colors ${c.id === activeId ? "bg-ink/[0.06]" : "hover:bg-well"}`}
              >
                <span className={`line-clamp-2 text-sm ${c.id === activeId ? "font-[540] text-ink" : "text-ink-muted"}`}>{c.title || "Conversation"}</span>
                <span className="mt-0.5 block text-xs text-ink-faint">{timeAgo(c.updatedAt)}</span>
              </button>
              <button
                aria-label={`Delete conversation: ${c.title ?? "untitled"}`}
                onClick={() => {
                  if (!confirm("Delete this conversation?")) return;
                  del.mutate(c.id, { onSuccess: () => c.id === activeId && onOpen(null) });
                }}
                className="absolute right-1.5 top-2 grid h-7 w-7 place-items-center rounded-full text-ink-faint opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Suggestions({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  return (
    <div>
      <p className="mb-3 text-sm text-ink-faint">Try asking</p>
      <ul className="divide-y divide-line border-y border-line">
        {SUGGESTED_PROMPTS.map((q) => (
          <li key={q}>
            <button
              disabled={disabled}
              onClick={() => onPick(q)}
              className="group flex w-full items-center justify-between gap-4 py-3.5 text-left text-ink transition-colors hover:text-ink-muted disabled:opacity-50"
            >
              {q}
              <span aria-hidden="true" className="text-ink-faint transition-transform duration-150 ease-out group-hover:translate-x-0.5">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-[1.25rem] rounded-br-md bg-well px-4 py-2.5 text-ink">{children}</p>
    </div>
  );
}

function AssistantReply({ id, text, rating, streaming = false }: { id?: string; text: string; rating?: number | null; streaming?: boolean }) {
  return (
    <div className="max-w-prose">
      {text ? <Prose text={text} /> : <TypingDots />}
      {streaming && text && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-ink" />}
      {id && !streaming && <Rating id={id} initial={rating ?? null} />}
    </div>
  );
}

function TypingDots() {
  return (
    <span role="status" aria-label="Thinking" className="inline-flex gap-1 py-2">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

function Rating({ id, initial }: { id: string; initial: number | null }) {
  const [value, setValue] = useState(initial);
  const rate = useRateMessage();
  const set = (v: -1 | 1) => {
    const next = value === v ? 0 : v;
    setValue(next || null);
    rate.mutate({ id, rating: next as -1 | 0 | 1 });
  };
  const cls = (on: boolean) => `grid h-8 w-8 place-items-center rounded-full transition-colors ${on ? "bg-ink/[0.07] text-ink" : "text-ink-faint hover:bg-well hover:text-ink"}`;
  return (
    <div className="mt-2 flex items-center gap-0.5">
      <button aria-label="Helpful" aria-pressed={value === 1} onClick={() => set(1)} className={cls(value === 1)}>
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button aria-label="Not helpful" aria-pressed={value === -1} onClick={() => set(-1)} className={cls(value === -1)}>
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function EmergencyReply({ reason, number, content }: { reason: string; number: string; content: string }) {
  const rest = content.split("\n\n").slice(1).join("\n\n");
  return (
    <div role="alert" className="rounded-sheet bg-danger p-6 text-white">
      <p className="font-serif text-2xl">{reason}</p>
      <p className="mt-2 max-w-prose text-white/95">{rest}</p>
      <a
        href={`tel:${number}`}
        className="mt-4 inline-flex min-h-12 items-center rounded-full bg-white px-5 font-[560] text-danger transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Call {number}
      </a>
    </div>
  );
}

function MentionNote({ number }: { number: string }) {
  return (
    <p className="mt-3 max-w-prose rounded-control bg-danger-soft px-4 py-2.5 text-sm text-danger">
      If this happens to you, call{" "}
      <a href={`tel:${number}`} className="figures font-[600] underline underline-offset-2">
        {number}
      </a>{" "}
      straight away.
    </p>
  );
}

function Composer({
  draft,
  setDraft,
  number,
  onSend,
  busy,
  status,
}: {
  draft: string;
  setDraft: (s: string) => void;
  number: string;
  onSend: (text: string) => void;
  busy: boolean;
  status?: { available: boolean; remaining: number };
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const live = emergencyInText(draft);
  const unavailable = status?.available === false;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft("");
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "";
    });
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  }

  return (
    <div className="sticky bottom-20 mt-10 bg-ground pb-2 pt-3 md:bottom-0">
      {live.emergency && (
        <p role="alert" className="mb-3 rounded-control bg-danger-soft px-4 py-3 text-sm font-[540] text-danger">
          {live.reason} If this is happening now, call {number}.
        </p>
      )}
      <form onSubmit={submit} className="flex items-end gap-2 rounded-[1.5rem] border border-line-strong bg-sheet p-2 pl-4 transition-[border-color,box-shadow] focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/[0.06]">
        <label htmlFor="assistant-input" className="sr-only">
          Your question
        </label>
        <textarea
          id="assistant-input"
          ref={ref}
          rows={1}
          value={draft}
          maxLength={2000}
          disabled={unavailable}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
          }}
          onKeyDown={onKey}
          placeholder={unavailable ? "The assistant isn't available right now" : "Ask about your record"}
          className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent py-2 text-base text-ink outline-none placeholder:text-ink-faint focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || busy || unavailable}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition-[opacity,transform] duration-150 ease-out active:scale-[0.94] disabled:opacity-25"
        >
          <ArrowUp className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        </button>
      </form>
      <p className="mt-2 flex flex-wrap justify-between gap-x-4 px-2 text-xs text-ink-faint">
        <span>Not medical advice. Check anything important with your doctor.</span>
        {status && !unavailable && <span>{status.remaining === 1 ? "1 question left today" : `${status.remaining} questions left today`}</span>}
      </p>
    </div>
  );
}

/** Minimal, safe formatting for replies: paragraphs, bullet lists and **bold**. No HTML is injected. */
function Prose({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-3 leading-relaxed text-ink">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]!);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`space-y-1.5 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-ink-faint`}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {inline(block)}
          </p>
        );
      })}
    </div>
  );
}

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}
