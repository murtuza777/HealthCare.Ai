import { z } from "zod";

// Bump a version when the document changes in a way people must agree to again.
export const CONSENT_VERSIONS = { terms: "2026-11-07", privacy: "2026-11-07", ai_processing: "2026-11-07" } as const;
export type ConsentKind = keyof typeof CONSENT_VERSIONS;

export const consentBodySchema = z.object({ kinds: z.array(z.enum(["terms", "privacy", "ai_processing"])).min(1).max(3) });

export const DELETE_PHRASE = "delete my account";
export const deleteAccountSchema = z.object({ confirm: z.literal(DELETE_PHRASE, { error: `Type "${DELETE_PHRASE}" to confirm.` }) });
