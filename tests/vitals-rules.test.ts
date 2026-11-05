import { describe, expect, it } from "vitest";
import { classifyVital, vitalInputSchema } from "../src/shared/vitals";

describe("classifyVital", () => {
  it.each([
    [118, 76, "normal"],
    [125, 78, "borderline"],
    [132, 78, "high"],
    [120, 85, "high"],
    [145, 95, "high"],
    [180, 100, "critical"],
    [170, 120, "critical"],
    [85, 55, "low"],
    [65, 40, "critical"],
  ] as const)("blood pressure %i/%i is %s", (sys, dia, expected) => {
    expect(classifyVital("blood_pressure", sys, dia)).toBe(expected);
  });

  it.each([
    [35, "critical"],
    [45, "low"],
    [72, "normal"],
    [110, "high"],
    [140, "critical"],
  ] as const)("heart rate %i is %s", (v, expected) => {
    expect(classifyVital("heart_rate", v)).toBe(expected);
  });

  it.each([
    [98, "normal"],
    [92, "borderline"],
    [88, "critical"],
  ] as const)("SpO2 %i is %s", (v, expected) => {
    expect(classifyVital("spo2", v)).toBe(expected);
  });

  it.each([
    [50, "critical"],
    [65, "low"],
    [100, "normal"],
    [160, "borderline"],
    [250, "high"],
    [320, "critical"],
  ] as const)("glucose %i is %s", (v, expected) => {
    expect(classifyVital("glucose", v)).toBe(expected);
  });

  it("weight has no classification", () => {
    expect(classifyVital("weight", 80)).toBeNull();
  });
});

describe("vitalInputSchema", () => {
  it("requires diastolic for blood pressure", () => {
    expect(vitalInputSchema.safeParse({ type: "blood_pressure", value: 120 }).success).toBe(false);
  });
  it("rejects diastolic higher than systolic", () => {
    expect(vitalInputSchema.safeParse({ type: "blood_pressure", value: 80, value2: 120 }).success).toBe(false);
  });
  it("rejects implausible values", () => {
    expect(vitalInputSchema.safeParse({ type: "heart_rate", value: 900 }).success).toBe(false);
  });
  it("rejects a second value on other types", () => {
    expect(vitalInputSchema.safeParse({ type: "heart_rate", value: 70, value2: 1 }).success).toBe(false);
  });
  it("accepts a normal reading", () => {
    expect(vitalInputSchema.safeParse({ type: "blood_pressure", value: 120, value2: 80 }).success).toBe(true);
  });
});
