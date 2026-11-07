import { z } from "zod";

// Assistant rules shared by the API and the browser. The emergency check is plain code and
// runs before any model call (and in the browser as you type), so it never depends on AI.

export const chatInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});
export type ChatInput = z.infer<typeof chatInputSchema>;

export const SUGGESTED_PROMPTS = [
  "How has my blood pressure changed this month?",
  "What do my latest readings mean?",
  "What should I ask my cardiologist at my next visit?",
  "Which of my risk factors can I work on?",
] as const;

export type EmergencyKind = "cardiac" | "stroke" | "breathing" | "fainting" | "self_harm";
export type TextEmergency = { emergency: true; kind: EmergencyKind; reason: string } | { emergency: false };

const any = (text: string, patterns: RegExp[]) => patterns.some((p) => p.test(text));

const CHEST = [/chest (pain|pressure|tightness|heaviness|hurts?|is tight)/, /pain in (my )?chest/, /(tight|heavy|crushing|squeezing) (feeling in (my )?)?chest/];
const CHEST_COMPANIONS = [/breath/, /sweat/, /\barm\b/, /\bjaw\b/, /\bback\b/, /nause/, /vomit/, /dizz/, /faint/, /light-?headed/, /crushing/, /squeez/];
const HEART_ATTACK_NOW = [/(having|have|think i'?m having|could be|is this) a heart attack/];
const BREATHING = [/(can'?t|cannot|can not|struggling to|unable to|hard to) (catch my )?breathe?/, /gasping/, /severe(ly)? short(ness)? of breath/, /choking/];
const STROKE = [
  /face (is )?droop/, /drooping (face|mouth|side)/, /slurr(ed|ing) (speech|words)/, /can'?t (speak|talk) properly/,
  /(weak|numb)(ness)? (on|in) one side/, /one side of (my|the) (body|face) (is )?(weak|numb)/, /sudden(ly)? (confus|can'?t see|blind|worst headache)/,
];
const FAINTING = [/\bfaint(ed|ing)\b/, /passed out/, /blacked out/, /lost consciousness/, /\bunconscious\b/, /\bcollapsed\b/];
const SELF_HARM = [/kill (myself|me)/, /suicid/, /end (my|it all|my life)/, /want to die/, /don'?t want to (live|be alive)/, /hurt(ing)? myself/];

/** Does a free-text message describe something that needs emergency help right now? */
export function emergencyInText(input: string): TextEmergency {
  const text = input.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ");
  if (any(text, SELF_HARM)) {
    return { emergency: true, kind: "self_harm", reason: "You don't have to go through this alone. Please reach out for help right now." };
  }
  if (any(text, HEART_ATTACK_NOW) || (any(text, CHEST) && any(text, CHEST_COMPANIONS))) {
    return { emergency: true, kind: "cardiac", reason: "Chest pain with these symptoms can be a heart attack." };
  }
  if (any(text, STROKE)) {
    return { emergency: true, kind: "stroke", reason: "These can be signs of a stroke. Note the time the symptoms started." };
  }
  if (any(text, BREATHING)) {
    return { emergency: true, kind: "breathing", reason: "Serious trouble breathing needs urgent help." };
  }
  if (any(text, FAINTING)) {
    return { emergency: true, kind: "fainting", reason: "Fainting with a heart condition needs urgent assessment." };
  }
  return { emergency: false };
}

/** The fixed reply for an emergency message. Written by people, never generated. */
export function emergencyReply(e: Extract<TextEmergency, { emergency: true }>, number: string): string {
  if (e.kind === "self_harm") {
    return `${e.reason}\n\nIf you might act on these thoughts, call ${number} now or go to the nearest emergency department. You can also call or text a local crisis line, or tell someone you trust who can stay with you.`;
  }
  return `${e.reason}\n\nCall ${number} now. Don't drive yourself. If you have been prescribed nitroglycerin for chest pain, use it as your doctor told you. Unlock your door and sit down while you wait for help.`;
}
