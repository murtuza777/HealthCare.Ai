import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { proposeActions, type ProposedAction } from "../../shared/actions";
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
import { useLatestVitals, useMedications, useMyAlerts, useOutOfRange, useProfile, useReminders, useReports, useSymptoms } from "../lib/queries";
import { formatDateTime, formatReading, timeAgo } from "../lib/format";
import { Button, Loading, PageHeader, SheetHeader } from "../components/ui";
import { AiConsent } from "../components/Account";
import { ActionOffers } from "../components/ActionOffers";

// The assistant answers from the patient's own record. Emergencies are caught by fixed rules
// (in the browser as you type, and again on the server) and never wait for the model.
//
// The page reads like the rest of the record, not like a chat app: each question is set as a
// heading with its answer beneath, separated by a rule. No bubbles, avatars or typing dots.

type Pending = { user: string; reply: string; streaming: boolean; emergency?: { reason: string; number: string; content: string }; error?: string };

const link = "font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink";

export function Assistant() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get("c");
  const qc = useQueryClient();
  const status = useAssistantStatus();
  const convo = useConversation(activeId);
  const [pending, setPending] = useState<Pending | null>(null);
  const [showList, setShowList] = useState(false);
  const [draft, setDraft] = useState("");
  // What the last message offers to save (a stated reading or symptom), shown under its reply.
  const [offers, setOffers] = useState<{ key: number; actions: ProposedAction[] }>({ key: 0, actions: [] });
  const latest = useLatestVitals();
  const { data: profile } = useProfile();
  const number = emergencyNumber(profile?.country);
  // The composer is sticky and sits last in the page, so the very bottom of the page shows the
  // newest message right above it, however tall the composer has grown.
  const toBottom = (behavior: ScrollBehavior = "auto") => window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  // Follow new text while the reader is at the bottom. Only the reader scrolling up stops it
  // (scroll events alone can't tell, because the page also moves when a reply grows).
  const follow = useRef(true);
  const [away, setAway] = useState(false);

  const messages = activeId ? (convo.data?.messages ?? []) : [];
  const busy = pending?.streaming ?? false;
  // Once the saved conversation includes this turn, the in-flight copy is no longer drawn.
  const lastAsked = [...messages].reverse().find((m) => m.role === "user")?.content;
  const showPending = pending !== null && !(!pending.streaming && !pending.error && lastAsked === pending.user && messages[messages.length - 1]?.role === "assistant");
  const hasThread = messages.length > 0 || pending !== null;

  useEffect(() => {
    const gap = () => document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    const onScroll = () => {
      if (gap() < 120) follow.current = true;
      setAway(gap() > 480);
    };
    const stop = () => {
      if (gap() > 4) follow.current = false;
    };
    const onWheel = (e: WheelEvent) => e.deltaY < 0 && (follow.current = false);
    const onKey = (e: globalThis.KeyboardEvent) => ["ArrowUp", "PageUp", "Home"].includes(e.key) && !(e.target instanceof HTMLTextAreaElement) && (follow.current = false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Opening a conversation lands on its newest message; a new one starts at the top.
  useEffect(() => {
    follow.current = true;
    if (!activeId) window.scrollTo({ top: 0 });
  }, [activeId]);

  // Whenever the thread grows (streamed text, a saved reply, its rating row), keep the newest in view.
  useEffect(() => {
    const el = thread.current;
    if (!el || !hasThread) return;
    if (follow.current) toBottom();
    const ro = new ResizeObserver(() => follow.current && toBottom());
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasThread]);
  useEffect(() => {
    if (follow.current && hasThread) toBottom();
  }, [hasThread, messages.length, pending?.reply, pending?.error, pending?.emergency, offers.actions.length]);

  useEffect(() => () => abort.current?.abort(), []);

  function toLatest() {
    follow.current = true;
    toBottom("smooth");
  }

  function open(id: string | null) {
    abort.current?.abort();
    setPending(null);
    setOffers((o) => ({ key: o.key + 1, actions: [] }));
    setShowList(false);
    setParams(id ? { c: id } : {}, { replace: false });
  }

  function restore(message: string) {
    setDraft(message);
    requestAnimationFrame(() => input.current?.focus());
  }

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    abort.current = new AbortController();
    follow.current = true;
    setPending({ user: message, reply: "", streaming: true });
    // Don't offer to save a reading that is already the latest one in the record.
    const stated = proposeActions(message).filter((a) => {
      if (a.kind !== "reading") return true;
      const have = latest.data?.[a.type];
      return !(have && have.value === a.value && (have.value2 ?? undefined) === a.value2);
    });
    setOffers((o) => ({ key: o.key + 1, actions: [] }));
    // Saving what was stated doesn't depend on the model, so it's offered even when the
    // assistant can't answer (but not for an emergency, where calling for help comes first).
    const offer = () => setOffers((o) => ({ key: o.key, actions: stated }));
    try {
      const result = await sendMessage(message, activeId, (soFar) => setPending((p) => p && { ...p, reply: soFar }), abort.current.signal);
      if (result.kind === "emergency") {
        setPending({ user: message, reply: "", streaming: false, emergency: { reason: result.reason, number: result.number, content: result.content } });
      } else if (result.kind === "quota") {
        restore(message);
        setPending({ user: message, reply: "", streaming: false, error: "You've used today's questions. The assistant will be back tomorrow; your question is still in the box below. Your record and charts work as usual." });
        offer();
      } else if (result.kind === "unavailable") {
        restore(message);
        setPending({ user: message, reply: "", streaming: false, error: `The assistant isn't available right now. Your question is still in the box below, so you can send it again in a little while. If you have symptoms that worry you now, call ${number}.` });
        offer();
      } else if (result.kind === "consent") {
        restore(message);
        setPending(null);
        void qc.invalidateQueries({ queryKey: assistantKeys.status });
      } else if (result.kind === "error") {
        restore(message);
        setPending({ user: message, reply: "", streaming: false, error: result.message });
      } else {
        setPending((p) => p && { ...p, streaming: false });
        offer();
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
      restore(message);
      setPending({ user: message, reply: "", streaming: false, error: "Couldn't reach the assistant. Check your connection and try again." });
      offer();
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      <PageHeader
        title="Assistant"
        subtitle="Ask about your readings, medicines, symptoms and reports. Answers come from your own record."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setShowList((s) => !s)} aria-expanded={showList} aria-controls="assistant-history">
              {showList ? "Hide earlier conversations" : "Earlier conversations"}
            </Button>
            {hasThread && (
              <Button variant="secondary" onClick={() => open(null)}>
                New conversation
              </Button>
            )}
          </div>
        }
      />

      {showList && (
        <nav id="assistant-history" aria-label="Earlier conversations" className="mb-12">
          <ConversationList activeId={activeId} onOpen={open} />
        </nav>
      )}

      {status.data && !status.data.consented ? (
        <AiConsent />
      ) : (
        <>
          <div ref={thread} className="flex-1" aria-busy={busy}>
            {activeId && convo.isPending && <Loading label="Loading conversation" />}
            {activeId && convo.isError && (
              <p className="max-w-prose rounded-control bg-well px-4 py-3 text-ink">
                This conversation couldn't be opened. It may have been deleted.{" "}
                <button onClick={() => open(null)} className={link}>
                  Start a new one
                </button>
              </p>
            )}
            {!hasThread && !(activeId && (convo.isPending || convo.isError)) && <Suggestions onPick={ask} disabled={busy || status.data?.available === false} />}

            {messages.map((m, i) => {
              if (m.role === "user") return <Question key={m.id} first={i === 0} at={m.createdAt}>{m.content}</Question>;
              const kind = emergencyKindOf(m.content);
              if (kind) return <EmergencyReply key={m.id} reason={EMERGENCY_REASONS[kind]} number={number} content={m.content} />;
              const asked = messages[i - 1]?.role === "user" ? emergencyInText(messages[i - 1]!.content) : null;
              return (
                <Answer key={m.id}>
                  <Prose text={m.content} />
                  {asked && !asked.emergency && asked.mention && <MentionNote number={number} />}
                  <Rating id={m.id} initial={m.rating ?? null} />
                </Answer>
              );
            })}

            {showPending && pending && (
              <>
                <Question first={messages.length === 0}>{pending.user}</Question>
                {pending.emergency ? (
                  <EmergencyReply {...pending.emergency} />
                ) : pending.error ? (
                  <Answer>
                    <p role="alert" className="rounded-control bg-well px-4 py-3 text-ink">
                      {pending.error}
                    </p>
                  </Answer>
                ) : (
                  <Answer>{pending.reply ? <Prose text={pending.reply} /> : <Loading label="Reading your record" lines={3} />}</Answer>
                )}
              </>
            )}

            {!busy && offers.actions.length > 0 && (
              <div className="mt-6">
                <ActionOffers key={offers.key} actions={offers.actions} />
              </div>
            )}
          </div>

          <Composer
            inputRef={input}
            draft={draft}
            setDraft={setDraft}
            number={number}
            onSend={ask}
            busy={busy}
            status={status.data}
            onLatest={hasThread && away ? toLatest : undefined}
          />
        </>
      )}
    </div>
  );
}

// --- Earlier conversations ---------------------------------------------------

function ConversationList({ activeId, onOpen }: { activeId: string | null; onOpen: (id: string | null) => void }) {
  const { data, isPending } = useConversations();
  const del = useDeleteConversation();
  if (isPending) return <Loading lines={3} />;
  if (!data?.length) return <p className="text-ink-muted">You haven't asked anything yet. Conversations are kept here so you can come back to them.</p>;
  return (
    <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto overscroll-contain border-y border-line">
      {data.map((c) => (
        <li key={c.id} className="flex items-center gap-2">
          <button onClick={() => onOpen(c.id)} aria-current={c.id === activeId ? "true" : undefined} className="group flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 py-3.5 text-left">
            <span className={`min-w-0 flex-1 truncate ${c.id === activeId ? "font-[560] text-ink" : "text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4"}`}>
              {c.title || "Conversation"}
            </span>
            <span className="figures shrink-0 text-sm text-ink-faint">{formatDateTime(c.updatedAt)}</span>
          </button>
          <button
            aria-label={`Delete conversation: ${c.title ?? "untitled"}`}
            disabled={del.isPending}
            onClick={() => {
              if (!confirm("Delete this conversation?")) return;
              del.mutate(c.id, { onSuccess: () => c.id === activeId && onOpen(null) });
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

// --- Starting points, drawn from this patient's record ------------------------

/** Questions that fit what is actually in the record right now, most pressing first. */
function useSuggestions(): string[] {
  const alerts = useMyAlerts();
  const reminders = useReminders();
  const latest = useLatestVitals();
  const meds = useMedications();
  const outOfRange = useOutOfRange();

  const open = new Set((alerts.data ?? []).filter((a) => !(a.data as { patientSeenAt?: string } | null)?.patientSeenAt).map((a) => a.kind));
  // The list only holds what is still coming up, soonest first.
  const visit = (reminders.data ?? []).find((r) => r.kind === "appointment");
  const out: string[] = [];
  if (open.has("insight:bp-rising") || open.has("insight:bp-high")) out.push("Why has my blood pressure been higher this week?");
  if (open.has("insight:weight-gain")) out.push("My weight has gone up this week. What should I do?");
  if (open.has("insight:doses-missed")) out.push("What can help me remember my medicines?");
  if (visit) out.push(`What should I ask at my appointment on ${new Date(visit.dueAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}?`);
  if (outOfRange.data?.length) out.push("What do the out-of-range results in my reports mean?");
  if (latest.data && Object.keys(latest.data).length) out.push("What do my latest readings mean?");
  if (meds.data?.length) out.push("What is each of my medicines for?");
  for (const q of SUGGESTED_PROMPTS) if (!out.includes(q)) out.push(q);
  return out.slice(0, 4);
}

function Suggestions({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  const questions = useSuggestions();
  return (
    <div className="grid gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,44rem)_minmax(0,1fr)]">
      <section>
        <SheetHeader title="Where to start" description="Based on what's in your record today. Or ask anything in your own words below." />
        <ul className="divide-y divide-line border-y border-line">
          {questions.map((q) => (
            <li key={q}>
              <button
                disabled={disabled}
                onClick={() => onPick(q)}
                className="w-full py-4 text-left text-[1.0625rem] text-ink underline decoration-transparent underline-offset-4 transition-colors hover:decoration-line-strong disabled:opacity-50"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <RecordSeen />
    </div>
  );
}

/** What the assistant reads before it answers, so it's clear its answers aren't generic. */
function RecordSeen() {
  const latest = useLatestVitals();
  const meds = useMedications();
  const symptoms = useSymptoms();
  const reports = useReports();
  const reminders = useReminders();

  const bp = latest.data?.blood_pressure;
  const read = (reports.data ?? []).filter((r) => r.extractionStatus === "done").length;
  const visit = (reminders.data ?? []).find((r) => r.kind === "appointment");
  const rows: [string, string][] = [
    ["Blood pressure", bp ? `${formatReading(bp)}, ${timeAgo(bp.measuredAt)}` : "No reading yet"],
    ["Medicines", meds.data?.length ? meds.data.map((m) => m.name).join(", ") : "None added"],
    ["Symptoms", symptoms.data?.length ? `${symptoms.data.length} logged` : "None logged"],
    ["Reports", reports.data?.length ? `${reports.data.length} uploaded${read ? `, ${read} read` : ""}` : "None uploaded"],
    ["Next visit", visit ? new Date(visit.dueAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "None added"],
  ];
  return (
    <aside aria-label="What the assistant can see">
      <SheetHeader title="What it can see" description="Read fresh from your record each time you ask." />
      <dl className="divide-y divide-line border-y border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="shrink-0 text-ink-muted">{label}</dt>
            <dd className="min-w-0 text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-faint">Your conversations are private to you. Caretakers can't see them.</p>
    </aside>
  );
}

// --- The thread: a question as a heading, its answer beneath ------------------

function Question({ children, first, at }: { children: string; first: boolean; at?: string | Date }) {
  // A short question reads as a heading; a long message is set as ordinary text.
  const long = children.length > 140;
  return (
    <div className={first ? "" : "mt-12 border-t border-line pt-10"}>
      <h2 className={`max-w-[44rem] whitespace-pre-wrap break-words ${long ? "font-sans text-base font-[540] leading-relaxed" : "text-[1.375rem] leading-snug sm:text-2xl"}`}>{children}</h2>
      {at && <p className="figures mt-1.5 text-sm text-ink-faint">{formatDateTime(at)}</p>}
    </div>
  );
}

function Answer({ children }: { children: ReactNode }) {
  return <div className="mt-5 max-w-[44rem]">{children}</div>;
}

function Rating({ id, initial }: { id: string; initial: number | null }) {
  const [value, setValue] = useState(initial);
  const rate = useRateMessage();
  const set = (v: -1 | 1) => {
    const next = value === v ? 0 : v;
    setValue(next || null);
    rate.mutate({ id, rating: next as -1 | 0 | 1 });
  };
  const cls = (on: boolean) =>
    `inline-flex min-h-9 items-center rounded-full px-3 text-sm transition-colors ${on ? "bg-ink/[0.07] font-[560] text-ink" : "text-ink-faint hover:text-ink"}`;
  return (
    <div className="-ml-3 mt-3 flex items-center gap-1" role="group" aria-label="Was this answer helpful?">
      <button aria-pressed={value === 1} onClick={() => set(1)} className={cls(value === 1)}>
        Helpful
      </button>
      <button aria-pressed={value === -1} onClick={() => set(-1)} className={cls(value === -1)}>
        Not helpful
      </button>
    </div>
  );
}

function EmergencyReply({ reason, number, content }: { reason: string; number: string; content: string }) {
  const rest = content.split("\n\n").slice(1).join("\n\n");
  return (
    <div role="alert" className="mt-5 max-w-[44rem] rounded-sheet bg-danger p-6 text-white">
      <p className="font-serif text-2xl">{reason}</p>
      <p className="mt-2 text-white/95">{rest}</p>
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
    <p className="mt-4 rounded-control bg-danger-soft px-4 py-2.5 text-sm text-danger">
      If this happens to you, call{" "}
      <a href={`tel:${number}`} className="figures font-[600] underline underline-offset-2">
        {number}
      </a>{" "}
      straight away.
    </p>
  );
}

// --- Asking -------------------------------------------------------------------

function Composer({
  inputRef: ref,
  draft,
  setDraft,
  number,
  onSend,
  busy,
  status,
  onLatest,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  draft: string;
  setDraft: (s: string) => void;
  number: string;
  onSend: (text: string) => void;
  busy: boolean;
  status?: { available: boolean; remaining: number };
  onLatest?: () => void;
}) {
  const live = emergencyInText(draft);
  const unavailable = status?.available === false;

  // Size the box to its text however it changes: typing, sending, or a question put back.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft, ref]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!draft.trim() || busy) return;
    onSend(draft);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
  }

  return (
    // On phones the negative margin cancels the page's bottom padding, so the composer rests where
    // it sticks while scrolling (just above the tab bar) instead of jumping up at the end.
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mb-16 mt-12 bg-ground pb-2 pt-4 sm:-mb-20 md:bottom-0 md:mb-0">
      <div className="relative max-w-[44rem]">
        {onLatest && (
          <button
            onClick={onLatest}
            className="absolute -top-14 left-1/2 inline-flex h-9 -translate-x-1/2 items-center rounded-full border border-line-strong bg-sheet px-4 text-sm font-[540] text-ink shadow-sm transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Go to latest
          </button>
        )}
        {live.emergency && (
          <p role="alert" className="mb-3 rounded-control bg-danger-soft px-4 py-3 text-sm font-[540] text-danger">
            {live.reason} If this is happening now, call {number}.
          </p>
        )}
        <form
          onSubmit={submit}
          className="flex items-end gap-2 rounded-sheet border border-line-strong bg-sheet p-2 pl-4 transition-[border-color,box-shadow] duration-150 focus-within:border-ink focus-within:ring-4 focus-within:ring-ink/[0.06]"
        >
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
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={unavailable ? "The assistant isn't available right now" : "Ask about your record"}
            className="max-h-[200px] min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base text-ink outline-none placeholder:text-ink-faint focus-visible:outline-none"
          />
          <Button type="submit" disabled={!draft.trim() || busy || unavailable} className="shrink-0">
            {busy ? "Answering" : "Ask"}
          </Button>
        </form>
        <p className="mt-2 flex flex-wrap justify-between gap-x-4 px-1 text-sm text-ink-faint">
          <span>It can explain and summarise, not diagnose or change medicines.</span>
          {status && !unavailable && <span className="figures">{status.remaining === 1 ? "1 question left today" : `${status.remaining} questions left today`}</span>}
        </p>
      </div>
    </div>
  );
}

/** Minimal, safe formatting for replies: paragraphs, bullet lists and **bold**. No HTML is injected. */
function Prose({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[1.0625rem] leading-[1.7] text-ink">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]!);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`space-y-2 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-ink-faint`}>
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
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-[560]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}
