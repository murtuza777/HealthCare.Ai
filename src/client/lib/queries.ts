// Data hooks for the signed-in patient's own data ("me"). Caretaker views reuse these with a patientId later.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { api, ok } from "./api";
import type { VitalType } from "../../shared/vitals";

const p = api.patients[":patientId"];
const me = { patientId: "me" } as const;

export const keys = {
  profile: ["profile", "me"] as const,
  vitals: (type?: VitalType) => ["vitals", "me", type ?? "all"] as const,
  latest: ["vitals", "me", "latest"] as const,
  medications: ["medications", "me"] as const,
  symptoms: ["symptoms", "me"] as const,
};

// --- Profile ---------------------------------------------------------------
export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: async () => (await ok(await p.profile.$get({ param: me }))).profile });
}

export type ProfileUpdate = InferRequestType<typeof p.profile.$put>["json"];
export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: ProfileUpdate) => (await ok(await p.profile.$put({ param: me, json }))).profile,
    onSuccess: (profile) => qc.setQueryData(keys.profile, profile),
  });
}

// --- Vitals ----------------------------------------------------------------
export function useVitals(type?: VitalType, limit = 100) {
  return useQuery({
    queryKey: [...keys.vitals(type), limit],
    queryFn: async () => (await ok(await p.vitals.$get({ param: me, query: { type, limit } }))).items,
  });
}

export function useLatestVitals() {
  return useQuery({ queryKey: keys.latest, queryFn: async () => (await ok(await p.vitals.latest.$get({ param: me }))).latest });
}

export type VitalNew = InferRequestType<typeof p.vitals.$post>["json"];
export function useAddVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: VitalNew) => (await ok(await p.vitals.$post({ param: me, json }))).vital,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vitals", "me"] }),
  });
}

// --- Medications -----------------------------------------------------------
export function useMedications(includeInactive = false) {
  return useQuery({
    queryKey: [...keys.medications, includeInactive],
    queryFn: async () => (await ok(await p.medications.$get({ param: me, query: includeInactive ? { all: "1" } : {} }))).items,
  });
}

export type MedicationNew = InferRequestType<typeof p.medications.$post>["json"];
export function useAddMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: MedicationNew) => (await ok(await p.medications.$post({ param: me, json }))).medication,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.medications }),
  });
}

export function useSetMedicationActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await ok(await p.medications[":id"].$patch({ param: { ...me, id }, json: { active } }))).medication,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.medications }),
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => ok(await p.medications[":id"].$delete({ param: { ...me, id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.medications }),
  });
}

// --- Symptoms --------------------------------------------------------------
export function useSymptoms() {
  return useQuery({ queryKey: keys.symptoms, queryFn: async () => (await ok(await p.symptoms.$get({ param: me }))).items });
}

export type SymptomNew = InferRequestType<typeof p.symptoms.$post>["json"];
export function useAddSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: SymptomNew) => ok(await p.symptoms.$post({ param: me, json })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.symptoms }),
  });
}

export function useDeleteSymptom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => ok(await p.symptoms[":id"].$delete({ param: { ...me, id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.symptoms }),
  });
}

// --- Reports ---------------------------------------------------------------
export const reportKeys = { list: ["reports", "me"] as const, shares: ["shares", "me"] as const };

export function useReports() {
  return useQuery({ queryKey: reportKeys.list, queryFn: async () => (await ok(await p.reports.$get({ param: me }))).items });
}

export type Report = NonNullable<ReturnType<typeof useReports>["data"]>[number];

export const reportFileUrl = (id: string, download = false) =>
  `/api/v1/patients/me/reports/${encodeURIComponent(id)}/file${download ? "?download=1" : ""}`;

/** UTF-8 safe base64url for the X-Report-Meta header. */
function toBase64Url(json: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(json));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type ReportUpload = {
  file: File;
  meta: { title: string; type: string; reportDate?: string; doctor?: string; facility?: string; note?: string };
};

export function useUploadReport() {
  const qc = useQueryClient();
  return useMutation({
    // Raw file body (not multipart): the Worker streams it to R2 with minimal CPU.
    mutationFn: async ({ file, meta }: ReportUpload) =>
      ok<{ report: Report }>(
        await fetch("/api/v1/patients/me/reports", {
          method: "POST",
          headers: { "content-type": file.type || "application/octet-stream", "x-report-meta": toBase64Url(meta) },
          body: file,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.list }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => ok(await p.reports[":id"].$delete({ param: { ...me, id } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: reportKeys.list });
      void qc.invalidateQueries({ queryKey: reportKeys.shares });
    },
  });
}

// --- Share links -------------------------------------------------------------
export function useShares() {
  return useQuery({ queryKey: reportKeys.shares, queryFn: async () => (await ok(await p.shares.$get({ param: me }))).items });
}

export type ShareNew = InferRequestType<typeof p.shares.$post>["json"];
export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: ShareNew) => ok(await p.shares.$post({ param: me, json })),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.shares }),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => ok(await p.shares[":id"].$delete({ param: { ...me, id } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.shares }),
  });
}

// --- Doses, adherence and reminders ----------------------------------------
export const doseKeys = {
  day: (date?: string) => ["doses", "me", date ?? "today"] as const,
  adherence: (days: number) => ["adherence", "me", days] as const,
  push: ["push", "status"] as const,
};

export function useDoses(date?: string) {
  return useQuery({
    queryKey: doseKeys.day(date),
    queryFn: async () => ok(await p.doses.$get({ param: me, query: { date } })),
    refetchInterval: 5 * 60_000, // statuses move to "missed" as time passes
  });
}

export type DoseMark = InferRequestType<typeof p.doses.$post>["json"];
export function useMarkDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: DoseMark) => ok(await p.doses.$post({ param: me, json })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["doses", "me"] });
      void qc.invalidateQueries({ queryKey: ["adherence", "me"] });
    },
  });
}

export function useAdherence(days = 7) {
  return useQuery({ queryKey: doseKeys.adherence(days), queryFn: async () => ok(await p.adherence.$get({ param: me, query: { days } })) });
}

export function usePushStatus() {
  return useQuery({ queryKey: doseKeys.push, queryFn: async () => ok(await api.push.status.$get()) });
}
