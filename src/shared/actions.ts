// Actions the assistant can offer: when a message states a reading ("my BP is 142/90") or a
// symptom ("I have a headache"), the app offers to save it. Found by plain rules, never by the
// model, and nothing is saved until the patient confirms.
import { SYMPTOM_TYPES } from "./symptoms";
import { CANONICAL_UNITS, classifyVital, vitalInputSchema, type Classification, type VitalType } from "./vitals";

export type ProposedReading = { kind: "reading"; type: VitalType; value: number; value2?: number; unit: string; classification: Classification | null };
export type ProposedSymptom = { kind: "symptom"; type: string };
export type ProposedAction = ProposedReading | ProposedSymptom;

const NUM = String.raw`(\d{2,3}(?:\.\d)?)`;
// Words allowed between a name and its number: "is", "was", "of", "reading", "today", "at", ":" ...
const GAP = String.raw`(?:\s*(?:is|was|reads?|reading|of|at|now|today|this morning|tonight|just|around|about|came (?:out|back)(?: at)?|showed?|=|:|-)\s*){0,4}\s*`;

const READING_RULES: { type: VitalType; patterns: RegExp[] }[] = [
  { type: "heart_rate", patterns: [new RegExp(String.raw`\b(?:pulse|heart ?rate|hr)\b${GAP}${NUM}\b(?!\s*\/)`), new RegExp(String.raw`\b${NUM}\s*(?:bpm|beats (?:a|per) min)`)] },
  { type: "spo2", patterns: [new RegExp(String.raw`\b(?:oxygen(?: level| saturation)?|spo2|sp02|o2(?: sat)?|saturation)\b${GAP}${NUM}\b`)] },
  { type: "glucose", patterns: [new RegExp(String.raw`\b(?:(?:blood |fasting )?(?:sugar|glucose))\b${GAP}${NUM}\b`)] },
  { type: "weight", patterns: [new RegExp(String.raw`\b(?:weight|weigh(?:ed)?)\b${GAP}${NUM}\s*(?:kg|kgs|kilos?|kilograms?)?\b(?!\s*(?:lb|lbs|pounds|st|stone))`)] },
  { type: "temperature", patterns: [new RegExp(String.raw`\b(?:temp|temperature|fever)\b${GAP}${NUM}\b(?!\s*(?:f\b|°f|fahrenheit))`)] },
];

const BP = new RegExp(String.raw`\b(\d{2,3})\s*(?:\/|over|by)\s*(\d{2,3})\b`);

// Talking about a number isn't reporting one: targets, hypotheticals, ranges and questions about limits.
const HYPOTHETICAL =
  /\b(if|should (be|i)|target|goal|ideal|aim|normal (range|bp|blood pressure|level)|what is|what's a|less than|more than|lower than|higher than|under|above|below|goes? (up )?to|went (up )?to|reach(es|ed)?|up to|at least|limit|maximum|minimum|dose|mg\b|tablet|years? old|aged?)\b/;

// A symptom is offered only when the patient says they have it now.
const HAVE = /\b(i have|i'?ve got|i'?ve had|i'?m having|i am having|i feel|i'?m feeling|i am feeling|i'?m|i am|i get|i got|i keep getting|feeling|having)\b/;
const NEGATED = /\b(no|not|never|without|don'?t have|do not have|didn'?t have|haven'?t had|no more|no longer)\s+(\S+\s+){0,2}$/;

const SYMPTOM_WORDS: [RegExp, (typeof SYMPTOM_TYPES)[number]][] = [
  [/\bhead ?aches?\b/, "headache"],
  [/\b(dizzy|dizziness|light-?headed)\b/, "dizziness"],
  [/\b(tired|fatigued?|exhausted|no energy)\b/, "fatigue"],
  [/\b(nausea|nauseous|feel sick|queasy)\b/, "nausea"],
  [/\b(palpitations?|heart (is )?(fluttering|skipping))\b/, "palpitations"],
  [/\bswoll?en (ankles?|legs?|feet|foot)|swelling in (my )?(ankles?|legs?|feet)\b/, "swelling in legs or ankles"],
  [/\b(sweating|sweaty)\b/, "sweating"],
];

/** What this message offers to save. At most one of each reading type and three items overall. */
export function proposeActions(input: string): ProposedAction[] {
  const text = input.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ");
  const out: ProposedAction[] = [];

  if (!HYPOTHETICAL.test(text)) {
    const add = (type: VitalType, value: number, value2?: number) => {
      if (out.some((a) => a.kind === "reading" && a.type === type)) return;
      if (!vitalInputSchema.safeParse({ type, value, ...(value2 === undefined ? {} : { value2 }) }).success) return;
      out.push({ kind: "reading", type, value, ...(value2 === undefined ? {} : { value2 }), unit: CANONICAL_UNITS[type], classification: classifyVital(type, value, value2) });
    };
    const bp = text.match(BP);
    if (bp) add("blood_pressure", Number(bp[1]), Number(bp[2]));
    for (const rule of READING_RULES) {
      for (const p of rule.patterns) {
        const m = text.match(p);
        if (m) {
          add(rule.type, Number(m[1]));
          break;
        }
      }
    }
  }

  if (HAVE.test(text)) {
    for (const [pattern, type] of SYMPTOM_WORDS) {
      const m = text.match(pattern);
      if (!m || m.index === undefined) continue;
      const before = text.slice(Math.max(0, m.index - 40), m.index).split(/[.!?;,]|\bbut\b/).pop() ?? "";
      if (!NEGATED.test(before)) out.push({ kind: "symptom", type });
    }
  }

  return out.slice(0, 3);
}

export const READING_NAMES: Record<VitalType, string> = {
  blood_pressure: "blood pressure",
  heart_rate: "heart rate",
  spo2: "oxygen level",
  weight: "weight",
  glucose: "blood glucose",
  temperature: "temperature",
  cholesterol: "cholesterol",
};

export const readingText = (r: ProposedReading) => (r.type === "blood_pressure" ? `${r.value}/${r.value2} ${r.unit}` : `${r.value} ${r.unit}`);
