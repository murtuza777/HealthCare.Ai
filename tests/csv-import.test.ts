import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { parseCsv, parseWhen, readingsFromCsv } from "../src/shared/csv-import";
import { alerts } from "../src/worker/db/schema";
import { call, db, signIn, userId } from "./helpers";

// The parser reads times as the device's local time, so compare local times.
const pad = (n: number) => String(n).padStart(2, "0");
const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const brief = (text: string, dayFirst = true) => {
  const r = readingsFromCsv(text, { dayFirst });
  return { ...r, readings: r.readings.map((x) => `${x.type} ${x.value}${x.value2 === undefined ? "" : `/${x.value2}`} @${local(x.measuredAt)}`) };
};

describe("CSV import: parsing", () => {
  it("splits cells with quotes, semicolons and tabs", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
    expect(parseCsv("a;b\r\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("﻿a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("reads dates in the common formats", () => {
    const iso = (s: string, t?: string, dayFirst = true) => {
      const at = parseWhen(s, t, dayFirst)?.at;
      return at && local(at);
    };
    expect(iso("2026-11-05", "08:30")).toBe("2026-11-05T08:30");
    expect(iso("2026-11-05T08:30:00")).toBe("2026-11-05T08:30");
    expect(iso("2026-11-05 8:30 PM")).toBe("2026-11-05T20:30");
    expect(iso("25/10/2026", "7:05 am")).toBe("2026-10-25T07:05");
    expect(iso("10/25/2026")).toBe("2026-10-25T12:00");
    expect(iso("03/04/2026")).toBe("2026-04-03T12:00");
    expect(iso("03/04/2026", undefined, false)).toBe("2026-03-04T12:00");
    expect(parseWhen("03/04/2026", undefined, true)?.ambiguous).toBe(true);
    expect(parseWhen("25/10/2026", undefined, true)?.ambiguous).toBe(false);
    expect(iso("5 Nov 2026")).toBe("2026-11-05T12:00");
    expect(iso("November 5, 2026", "09:15")).toBe("2026-11-05T09:15");
    expect(parseWhen("31/02/2026", undefined, true)).toBeNull();
    expect(parseWhen("01/01/2999", undefined, true)).toBeNull();
    expect(parseWhen("soon", undefined, true)).toBeNull();
  });

  it("reads a blood pressure monitor export", () => {
    const r = brief(`Date,Time,Systolic (mmHg),Diastolic (mmHg),Pulse (bpm),Notes
2026-11-01,07:30,142,91,68,after waking
2026-11-01,21:10,136,88,72,
bad row,,,,,
2026-11-02,07:45,300,91,70,typo in systolic`);
    expect(r.readings).toEqual([
      "blood_pressure 142/91 @2026-11-01T07:30",
      "heart_rate 68 @2026-11-01T07:30",
      "blood_pressure 136/88 @2026-11-01T21:10",
      "heart_rate 72 @2026-11-01T21:10",
      "heart_rate 70 @2026-11-02T07:45",
    ]);
    expect(r.skipped).toBe(1);
    expect(r.problem).toBeUndefined();
  });

  it("finds the header below a title, converts units, and reports what it can't read", () => {
    const r = brief(`My health export;;;
;;;
Measured;Weight (lbs);Glucose mmol/L;Temp (F)
05.11.2026 08:00;180;5,5;98.6`);
    expect(r.readings).toEqual(["weight 81.6 @2026-11-05T08:00", "glucose 99 @2026-11-05T08:00", "temperature 37 @2026-11-05T08:00"]);
    expect(readingsFromCsv("name,colour\nx,red").problem).toMatch(/No columns were recognised/);
    expect(readingsFromCsv("").problem).toMatch(/no rows/);
    expect(readingsFromCsv("Date,Pulse\nnonsense,72").problem).toMatch(/No readings could be read/);
  });
});

describe("CSV import: API", () => {
  it("adds readings once, classifies them, and doesn't alert caretakers about old data", async () => {
    const cookie = await signIn("import-a@example.com", "198.51.100.160");
    const id = await userId(cookie);
    const items = [
      { type: "blood_pressure", value: 185, value2: 121, measuredAt: "2026-10-01T07:30:00.000Z" },
      { type: "heart_rate", value: 68, measuredAt: "2026-10-01T07:30:00.000Z" },
      { type: "blood_pressure", value: 136, value2: 88, measuredAt: "2026-10-02T07:30:00.000Z", note: "evening" },
    ];
    const first = await call("/api/v1/patients/me/vitals/import", { cookie, body: { items } });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ added: 3, duplicates: 0 });

    // Importing the same file again (plus one new reading) adds only the new one.
    const again = await call("/api/v1/patients/me/vitals/import", { cookie, body: { items: [...items, { type: "heart_rate", value: 70, measuredAt: "2026-10-02T07:30:00.000Z" }] } });
    expect(await again.json()).toEqual({ added: 1, duplicates: 3 });

    const list = (await (await call("/api/v1/patients/me/vitals?type=blood_pressure", { cookie })).json()) as { items: { value: number; classification: string; source: string }[] };
    expect(list.items.map((v) => [v.value, v.classification, v.source])).toEqual([
      [136, "high", "import"],
      [185, "critical", "import"],
    ]);
    expect(await db.select().from(alerts).where(eq(alerts.userId, id))).toHaveLength(0);

    expect((await call("/api/v1/patients/me/vitals/import", { cookie, body: { items: [{ type: "heart_rate", value: 900 }] } })).status).toBe(400);
    expect((await call("/api/v1/patients/me/vitals/import", { cookie, body: { items: [] } })).status).toBe(400);
    const other = await signIn("import-b@example.com", "198.51.100.161");
    expect((await call(`/api/v1/patients/${id}/vitals/import`, { cookie: other, body: { items } })).status).toBe(403);
  });
});
