import { describe, expect, it } from "vitest";
import { proposeActions } from "../src/shared/actions";
import { systemPrompt } from "../src/worker/ai/prompt";

const brief = (text: string) =>
  proposeActions(text).map((a) => (a.kind === "reading" ? `${a.type}=${a.value}${a.value2 === undefined ? "" : `/${a.value2}`}${a.classification ? `(${a.classification})` : ""}` : `symptom:${a.type}`));

describe("assistant actions (plain rules, nothing saved without confirmation)", () => {
  it.each([
    ["My BP is 142/90 this morning", ["blood_pressure=142/90(high)"]],
    ["blood pressure was 128 over 82", ["blood_pressure=128/82(high)"]],
    ["Just measured 185/121", ["blood_pressure=185/121(critical)"]],
    ["BP 118/76 and pulse 72", ["blood_pressure=118/76(normal)", "heart_rate=72(normal)"]],
    ["my heart rate is 96 bpm", ["heart_rate=96(normal)"]],
    ["Oxygen is 97", ["spo2=97(normal)"]],
    ["fasting sugar came back at 132", ["glucose=132(normal)"]],
    ["I weigh 81.5 kg today", ["weight=81.5"]],
    ["temperature 37.2", ["temperature=37.2(normal)"]],
    ["I have a headache and my BP is 150/95", ["blood_pressure=150/95(high)", "symptom:headache"]],
    ["I'm feeling dizzy and tired", ["symptom:dizziness", "symptom:fatigue"]],
    ["My ankles are swollen, I have swollen ankles since yesterday", ["symptom:swelling in legs or ankles"]],
  ])("%j offers %j", (text, expected) => {
    expect(brief(text)).toEqual(expected);
  });

  it.each([
    "What should my blood pressure be?",
    "Is a target of 130/80 right for me?",
    "What if my BP goes to 180/120?",
    "Should I worry if it is above 140/90?",
    "How has my blood pressure changed this month?",
    "I take amlodipine 5 mg at 8",
    "I'm 62 years old",
    "My weight is 180 lbs",
    "temperature 99 F",
    "pulse 400",
    "BP 90/120",
    "I don't have a headache",
    "What causes headaches?",
    "No dizziness today, feeling fine",
  ])("%j offers nothing", (text) => {
    expect(brief(text)).toEqual([]);
  });

  it("tells the model about a stated reading without claiming it was saved", () => {
    const actions = proposeActions("my BP is 185/121");
    const prompt = systemPrompt("record", "112", undefined, actions);
    expect(prompt).toContain("blood pressure 185/121 mmHg (EMERGENCY RANGE)");
    expect(prompt).toMatch(/never say that you saved/i);
    expect(systemPrompt("record", "112")).not.toMatch(/offers to save/);
  });
});
