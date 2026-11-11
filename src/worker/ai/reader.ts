// Report reader: turns an uploaded PDF or photo into text, then asks the model to copy out
// the test values. The model transcribes only; flags come from src/shared/findings.ts.
import { parseExtraction, type FindingInput } from "../../shared/findings";
import { completeChat } from "./model";

const VISION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const MAX_TEXT = 12_000;

const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function toBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < view.length; i += 0x8000) out += String.fromCharCode(...view.subarray(i, i + 0x8000));
  return btoa(out);
}

const TRANSCRIBE =
  "Transcribe all the text in this medical report image exactly as printed, line by line, keeping test names, values, units and reference ranges together. Output only the transcription.";

/** The text printed on the report, or "" when nothing readable was found. */
export async function reportText(env: Env, bytes: ArrayBuffer, mime: string): Promise<string> {
  // Tests: the "file" is plain text between the PDF markers.
  if (env.AI_MODE === "fake") return new TextDecoder().decode(bytes).replace(/^%PDF-[\d.]+\n/, "").replace(/\n%%EOF$/, "");

  if (mime.startsWith("image/")) {
    try {
      const out = (await env.AI.run(
        VISION_MODEL as Parameters<Ai["run"]>[0],
        {
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: TRANSCRIBE },
                { type: "image_url", image_url: { url: `data:${mime};base64,${toBase64(bytes)}` } },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0,
        } as never,
      )) as { response?: unknown };
      if (typeof out.response === "string" && out.response.trim().length > 20) return out.response.trim();
    } catch (err) {
      console.error("report vision error", err instanceof Error ? err.name : "unknown");
    }
  }

  const doc = (await env.AI.toMarkdown({ name: `report.${EXT[mime] ?? "bin"}`, blob: new Blob([bytes], { type: mime }) })) as { data?: unknown };
  return typeof doc.data === "string" ? doc.data.trim() : "";
}

const prompt = (text: string) => `Below is the text of a patient's medical report. Copy out every test result that has a value.

Rules:
- Use only what is printed. Never guess, calculate or fill in a value, unit or range that isn't there.
- "test" is the test name as printed. "value" is the result exactly as printed (a number, or words like "Negative").
- "unit" is the printed unit, or null.
- "refLow" and "refHigh" are the printed reference range as numbers, or null. For "< 100" use refHigh 100; for "> 40" use refLow 40.
- "summary" is one or two plain sentences saying what kind of report this is and which results are outside their printed range. Do not diagnose, and do not suggest any treatment or medicine.
- If there are no test results (a letter, a prescription, a scan description), return an empty "findings" list and a one-sentence summary.

Return only JSON, with no other text:
{"summary": "...", "findings": [{"test": "...", "value": "...", "unit": "...", "refLow": null, "refHigh": null}]}

Report text:
${text.slice(0, MAX_TEXT)}`;

export type ReadResult = { ok: true; summary: string | null; findings: FindingInput[]; tokens: number } | { ok: false; reason: "unreadable" | "model" };

export async function readReport(env: Env, bytes: ArrayBuffer, mime: string): Promise<ReadResult> {
  const text = await reportText(env, bytes, mime);
  if (text.replace(/\s+/g, "").length < 20) return { ok: false, reason: "unreadable" };
  const reply = await completeChat(env, [{ role: "user", content: prompt(text) }], 2500);
  const parsed = parseExtraction(reply.text);
  if (!parsed) return { ok: false, reason: "model" };
  return { ok: true, ...parsed, tokens: (reply.tokensIn ?? 0) + (reply.tokensOut ?? 0) };
}
