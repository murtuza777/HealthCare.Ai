import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { api, ok } from "./api";

const c = api.care;

export const careKeys = {
  caretakers: ["care", "caretakers"] as const,
  patients: ["care", "patients"] as const,
  summary: (id: string) => ["care", "summary", id] as const,
  invite: (token: string) => ["care", "invite", token] as const,
};

export function useCaretakers() {
  return useQuery({ queryKey: careKeys.caretakers, queryFn: async () => (await ok(await c.caretakers.$get())).items });
}

export type CareInviteBody = InferRequestType<typeof c.caretakers.$post>["json"];
export function useInviteCaretaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (json: CareInviteBody) => ok(await c.caretakers.$post({ json })),
    onSuccess: () => qc.invalidateQueries({ queryKey: careKeys.caretakers }),
  });
}

export function useUpdateCaretaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: CareInviteBody["permissions"] }) =>
      ok(await c.caretakers[":id"].$patch({ param: { id }, json: { permissions } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: careKeys.caretakers }),
  });
}

export function useRemoveCareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => ok(await c.caretakers[":id"].$delete({ param: { id } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: careKeys.caretakers });
      void qc.invalidateQueries({ queryKey: careKeys.patients });
    },
  });
}

export function useInvitePreview(token: string) {
  return useQuery({ queryKey: careKeys.invite(token), retry: false, queryFn: async () => ok(await c.invites[":token"].$get({ param: { token } })) });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => ok(await c.accept.$post({ json: { token } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: careKeys.patients }),
  });
}

export function usePatientsCaredFor() {
  return useQuery({ queryKey: careKeys.patients, queryFn: async () => (await ok(await c.patients.$get())).items });
}

export function useCareSummary(patientId: string) {
  return useQuery({
    queryKey: careKeys.summary(patientId),
    queryFn: async () => ok(await c.patients[":patientId"].summary.$get({ param: { patientId } })),
    refetchInterval: 60_000,
  });
}

export function useAcknowledgeAlert(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => ok(await c.patients[":patientId"].alerts[":alertId"].ack.$post({ param: { patientId, alertId } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: careKeys.summary(patientId) }),
  });
}
