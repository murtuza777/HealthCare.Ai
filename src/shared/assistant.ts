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

export type EmergencyKind = "cardiac" | "stroke" | "breathing" | "fainting" | "overdose" | "self_harm";
/**
 * `emergency: true` means "this is happening now": the fixed reply is sent and the model is not
 * asked. `mention` means the message talks about an emergency symptom without describing it as
 * happening now (a question, something in the past, or "I don't have chest pain"): the model
 * answers, and the app still shows the emergency number next to the reply.
 */
export type TextEmergency = { emergency: true; kind: EmergencyKind; reason: string } | { emergency: false; mention?: EmergencyKind };

export const EMERGENCY_REASONS: Record<EmergencyKind, string> = {
  cardiac: "These symptoms can be a heart attack.",
  stroke: "These can be signs of a stroke. Note the time the symptoms started.",
  breathing: "Serious trouble breathing needs urgent help.",
  fainting: "Fainting with a heart condition needs urgent assessment.",
  overdose: "Taking too much medicine can be dangerous, even if you feel fine.",
  self_harm: "You don't have to go through this alone. Please reach out for help right now.",
};

// Each rule: patterns that describe the symptom, and optionally companions that must also appear.
const RULES: { kind: EmergencyKind; patterns: RegExp[]; with?: RegExp[] }[] = [
  {
    kind: "self_harm",
    patterns: [
      /kill (myself|me)\b/,
      /suicid/,
      /end (it all|my life|my own life|things)\b/,
      /want(ed)? to die/,
      /don'?t want to (live|be alive|be here)/,
      /(want|going|planning|thinking about|thoughts? of|urge) to (hurt|harm|cut) myself/,
      /self[- ]?harm/,
      /better off dead/,
    ],
  },
  {
    kind: "overdose",
    patterns: [/overdos/, /(took|taken|take|swallowed|had) (too many|too much|a lot of|loads of|all (of )?(my|the)|a whole (pack|bottle|strip) of) (my )?(pills|tablets|medicines?|meds|capsules)/],
  },
  {
    kind: "cardiac",
    patterns: [
      /(having|have|think i'?m having|could be|is this|is it) a heart attack/,
      /chest (pain|pressure|tightness|heaviness|discomfort|hurts?|is (tight|heavy|hurting|painful))/,
      /(pain|pressure|tightness|heaviness|discomfort|ache|squeezing) in (my |the )?chest/,
      /chest (feels|is feeling|is getting) (tight|heavy|crushed|painful|weird)/,
      /(tight|heavy|crushing|squeezing|burning) (feeling in (my )?)?chest/,
      /(seene|chhati|chati) (mein|me|main) (dard|dabav|dabaav|jakdan)/,
    ],
  },
  {
    kind: "cardiac",
    patterns: [/(heart|pulse) (is )?(racing|pounding|fluttering|beating (very |really )?fast)/, /palpitations/],
    with: [/dizz/, /faint/, /light-?headed/, /breath/, /chest/, /pass(ing)? out/],
  },
  {
    kind: "stroke",
    patterns: [
      /face (is )?droop/,
      /drooping (face|mouth|side)/,
      /slurr(ed|ing) (speech|words)/,
      /can'?t (speak|talk) (properly|clearly|right)/,
      /(weak|numb)(ness)? (on|in|down) one side/,
      /one side of (my|the|his|her) (body|face) (is |feels |went |has gone )?(weak|numb|dead)/,
      /can'?t (move|feel|lift|raise) (my |his |her )?(arm|leg|hand|face)/,
      /sudden(ly)? (confus|can'?t see|blind|lost (my )?(vision|sight|balance)|loss of (vision|sight|balance))/,
      /worst headache/,
      /(vision|sight) .{0,25}sudden|sudden.{0,25}(vision|sight)/,
      /(went|gone|going) blind/,
    ],
  },
  {
    kind: "breathing",
    patterns: [
      /(can'?t|cannot|can not|struggling to|unable to|hard to) (catch my |get my )?breathe?/,
      /can'?t (catch|get) my breath/,
      /gasping/,
      /severe(ly)? short(ness)? of breath/,
      /short(ness)? of breath (at|while|when) (rest|resting|lying|sitting)/,
      /choking/,
      /(lips|face|fingers|fingertips) (are |is )?(turning |gone |going )?(blue|grey|gray)/,
    ],
  },
  {
    kind: "fainting",
    patterns: [/\bfaint(ed|ing)?\b/, /pass(ed|ing)? out/, /black(ed|ing)? out/, /lost consciousness/, /\bunconscious\b/, /\bcollapsed?\b/],
  },
];

// "I do not have chest pain", "without any chest pain": a negation at most two words before.
const NEGATED = /\b(no|not|never|without|denies|don'?t have|do not have|didn'?t have|haven'?t had|hasn'?t had|no more|no longer)\s+(\S+\s+){0,2}$/;
// Questions about risk, hypotheticals, and things in the past.
const FRAMED = [
  /\b(what if|if (i|someone|somebody|a person|you|he|she|my)|could (i|this|it|that|high|my|stress|bp)|can (i|high|this|stress|my)|might i|am i at risk|at risk|risk of|chances? of|signs? of|symptoms? of|warning signs|how (do|would|can|will|should) (i|you|we) (know|tell|recogni[sz]e|spot|prevent|avoid)|prevent|what (should|do|would|to) (i |you )?do (if|when)|in case|what (is|are|causes?|does|happens)|why do|worr(y|ied) about|afraid of|scared of|(what|which|can|could) (can |could |might )?causes?|cause of|caused by|is it normal|normal to)\b/,
  /\b(last (year|month|week)|(years?|months?|weeks?) ago|in (19|20)\d\d|used to|history of|previous(ly)?|once had|back in|in the past)\b/,
];
// Signs it is happening now. These override the framing above.
const NOW = [
  /\b(now|right now|currently|at the moment|this (morning|evening|afternoon)|today|tonight|just now|since|for the (last|past) \d+|minutes? ago|an hour ago|hours? ago|keeps?|still|again)\b/,
  /(?<!\b(could|can|might|would|will|if|should|do|does|did|may)\s)\b(i have|i'?ve got|i'?m having|i am having|i'?ve been having|i feel|i'?m feeling|i am feeling)\b/,
];

const any = (text: string, patterns: RegExp[]) => patterns.some((p) => p.test(text));

/** "affirmed" if any match isn't negated, "negated" if every match is, null if nothing matches. */
function find(text: string, patterns: RegExp[]): "affirmed" | "negated" | null {
  let seen = false;
  for (const p of patterns) {
    for (const m of text.matchAll(new RegExp(p.source, "g"))) {
      seen = true;
      const before = text.slice(Math.max(0, m.index - 40), m.index).split(/[.!?;,]|\bbut\b/).pop() ?? "";
      if (!NEGATED.test(before)) return "affirmed";
    }
  }
  return seen ? "negated" : null;
}

/** Does a free-text message describe something that needs emergency help right now? */
export function emergencyInText(input: string): TextEmergency {
  const text = input.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ");
  const framed = any(text, FRAMED) && !any(text, NOW);
  let mention: EmergencyKind | undefined;
  for (const rule of RULES) {
    const hit = find(text, rule.patterns);
    if (!hit || (rule.with && !any(text, rule.with))) continue;
    // Self-harm is never talked down by phrasing; only an explicit negation softens it.
    if (hit === "affirmed" && (rule.kind === "self_harm" || !framed)) return { emergency: true, kind: rule.kind, reason: EMERGENCY_REASONS[rule.kind] };
    mention ??= rule.kind;
  }
  return mention ? { emergency: false, mention } : { emergency: false };
}

const NEXT_STEPS: Record<EmergencyKind, (n: string) => string> = {
  cardiac: (n) =>
    `Call ${n} now. Don't drive yourself. Sit down and rest while you wait. If your doctor has prescribed nitroglycerin (GTN) for chest pain, use it as they told you. Unlock your door so help can reach you.`,
  stroke: (n) => `Call ${n} now, even if the symptoms ease. Don't drive. Don't eat, drink or take any medicine until you've been assessed. Tell the paramedics when the symptoms started.`,
  breathing: (n) => `Call ${n} now. Sit upright and loosen tight clothing. If you have a prescribed inhaler or oxygen, use it as instructed. Don't lie flat.`,
  fainting: (n) => `Call ${n} now. If you feel faint, lie down with your legs raised. Don't drive or stand up quickly. If someone has collapsed and isn't breathing normally, start CPR.`,
  overdose: (n) => `Call ${n} now or your local poison information centre. Keep the medicine packets to show them. Don't make yourself sick unless they tell you to.`,
  self_harm: (n) =>
    `If you might act on these thoughts, call ${n} now or go to the nearest emergency department. You can also call or text a local crisis line, or tell someone you trust who can stay with you.`,
};

/** The fixed reply for an emergency message. Written by people, never generated. */
export function emergencyReply(e: Extract<TextEmergency, { emergency: true }>, number: string): string {
  return `${e.reason}\n\n${NEXT_STEPS[e.kind](number)}`;
}

const OLD_REASONS: Record<string, EmergencyKind> = {
  "Chest pain with these symptoms can be a heart attack.": "cardiac",
  "Serious trouble breathing needs urgent help.": "breathing",
};

/** Recognise a saved fixed emergency reply, so history shows it the way it looked when sent. */
export function emergencyKindOf(content: string): EmergencyKind | null {
  const first = content.split("\n\n")[0] ?? "";
  return (Object.keys(EMERGENCY_REASONS) as EmergencyKind[]).find((k) => EMERGENCY_REASONS[k] === first) ?? OLD_REASONS[first] ?? null;
}
