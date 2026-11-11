import type { Classification } from "./vitals";

export const TIMELINE_KINDS = ["vital", "symptom", "dose", "report", "alert"] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  at: Date;
  /** Vital type, symptom name, medicine, report title or alert title. */
  title: string;
  detail: string;
  note: string | null;
  status: Classification | null;
  tone: "normal" | "attention" | "critical";
};
