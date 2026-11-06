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
