import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ok } from "./api";
import type { ConsentKind } from "../../shared/account";

const a = api.account;

export const accountKeys = { consents: ["account", "consents"] as const, accessLog: ["account", "access-log"] as const };

export function useConsents(enabled = true) {
  return useQuery({ queryKey: accountKeys.consents, enabled, staleTime: Infinity, queryFn: async () => ok(await a.consents.$get()) });
}

export function useGiveConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kinds: ConsentKind[]) => ok(await a.consents.$post({ json: { kinds } })),
    onSuccess: (data) => {
      qc.setQueryData(accountKeys.consents, data);
      void qc.invalidateQueries({ queryKey: ["assistant", "status"] });
    },
  });
}

export function useAccessLog() {
  return useQuery({ queryKey: accountKeys.accessLog, queryFn: async () => (await ok(await a["access-log"].$get())).items });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: async (confirm: string) => ok(await a.delete.$post({ json: { confirm: confirm as "delete my account" } })) });
}
