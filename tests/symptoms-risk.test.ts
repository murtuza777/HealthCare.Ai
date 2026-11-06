import { describe, expect, it } from "vitest";
import { detectRedFlags } from "../src/shared/symptoms";
import { ageFrom, bmi, riskFactors } from "../src/shared/risk";
import { emergencyNumber } from "../src/shared/emergency";
import { medicationInputSchema } from "../src/shared/medications";

describe("detectRedFlags", () => {
  it.each([
    [{ type: "chest pain", accompaniedBy: ["shortness of breath"] }],
    [{ type: "chest pain", accompaniedBy: ["sweating"] }],
    [{ type: "chest tightness", accompaniedBy: ["arm, jaw or back pain"] }],
    [{ type: "Chest Pain", accompaniedBy: [], severity: 8 }],
    [{ type: "weakness on one side" }],
    [{ type: "headache", accompaniedBy: ["slurred speech"] }],
    [{ type: "fainting" }],
    [{ type: "shortness of breath", severity: 9 }],
  ])("flags %o as an emergency", (input) => {
    expect(detectRedFlags(input).emergency).toBe(true);
  });

  it.each([
    [{ type: "chest pain", severity: 3 }],
    [{ type: "headache", severity: 6 }],
    [{ type: "fatigue", accompaniedBy: ["dizziness"] }],
    [{ type: "shortness of breath", severity: 4 }],
  ])("does not flag %o", (input) => {
    expect(detectRedFlags(input).emergency).toBe(false);
  });
});

describe("risk factors", () => {
  const now = new Date("2026-11-06");

  it("computes age and BMI", () => {
    expect(ageFrom("1960-11-07", now)).toBe(65);
    expect(ageFrom("1960-11-06", now)).toBe(66);
    expect(bmi(175, 80)).toBe(26.1);
    expect(bmi(null, 80)).toBeNull();
  });

  it("marks everything unknown without a profile or readings", () => {
    const f = riskFactors(null, {}, now);
    expect(f.every((x) => x.status === "unknown")).toBe(true);
  });

  it("finds recorded factors", () => {
    const f = riskFactors(
      {
        dateOfBirth: "1960-01-01",
        sex: "male",
        heightCm: 170,
        conditions: ["Hypertension", "Diabetes"],
        familyHistory: ["Heart disease"],
        hadHeartAttack: true,
        lifestyle: { smoker: true, exerciseDaysPerWeek: 1 },
      },
      { weight: { value: 90 }, cholesterol: { value: 250 } },
      now,
    );
    const present = f.filter((x) => x.status === "present").map((x) => x.id);
    expect(present).toEqual(
      expect.arrayContaining(["heart_attack", "blood_pressure", "cholesterol", "diabetes", "smoking", "inactivity", "weight", "age", "family"]),
    );
    // A previous heart attack implies coronary heart disease.
    expect(f.find((x) => x.id === "heart_disease")?.status).toBe("present");
  });

  it("notes borderline cholesterol without counting it as high", () => {
    const f = riskFactors(null, { cholesterol: { value: 215 } }, now).find((x) => x.id === "cholesterol");
    expect(f?.status).toBe("absent");
    expect(f?.detail).toContain("borderline");
  });

  it("uses a higher age threshold for women", () => {
    const base = { dateOfBirth: "1976-01-01", conditions: [], familyHistory: [], hadHeartAttack: false, lifestyle: null };
    expect(riskFactors({ ...base, sex: "male" }, {}, now).find((x) => x.id === "age")?.status).toBe("present");
    expect(riskFactors({ ...base, sex: "female" }, {}, now).find((x) => x.id === "age")?.status).toBe("absent");
  });
});

describe("emergency numbers", () => {
  it("maps countries and falls back to 112", () => {
    expect(emergencyNumber("IN")).toBe("112");
    expect(emergencyNumber("us")).toBe("911");
    expect(emergencyNumber("GB")).toBe("999");
    expect(emergencyNumber(null)).toBe("112");
    expect(emergencyNumber("ZZ")).toBe("112");
  });
});

describe("medicationInputSchema", () => {
  const ok = { name: "Aspirin", dose: "75 mg", schedule: { times: ["08:00"] }, startDate: "2026-01-01" };
  it("accepts a valid medication", () => expect(medicationInputSchema.safeParse(ok).success).toBe(true));
  it("rejects bad times", () => expect(medicationInputSchema.safeParse({ ...ok, schedule: { times: ["25:00"] } }).success).toBe(false));
  it("requires at least one time", () => expect(medicationInputSchema.safeParse({ ...ok, schedule: { times: [] } }).success).toBe(false));
  it("rejects an end date before the start", () => expect(medicationInputSchema.safeParse({ ...ok, endDate: "2025-12-31" }).success).toBe(false));
});
