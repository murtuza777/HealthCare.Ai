import { Phone, TriangleAlert } from "lucide-react";
import { emergencyNumber } from "../../shared/emergency";
import { useProfile } from "../lib/queries";

/** Shown after a reading in the emergency range or a red-flag symptom. Rule-based, never AI. */
export function CriticalBanner({ kind, reason }: { kind: "reading" | "symptom"; reason?: string }) {
  const { data: profile } = useProfile();
  const number = emergencyNumber(profile?.country);
  return (
    <div role="alert" className="rounded-sheet bg-danger p-6 text-white sm:p-7">
      <p className="flex items-center gap-2.5 font-serif text-2xl">
        <TriangleAlert className="h-6 w-6 shrink-0" aria-hidden="true" />
        {kind === "reading" ? "This reading is in the emergency range." : "These symptoms can be an emergency."}
      </p>
      {reason && <p className="mt-2 font-[540]">{reason}</p>}
      <p className="mt-2 max-w-prose text-white/95">
        If you have chest pain, shortness of breath, fainting, or weakness on one side, call {number} now.
        {kind === "reading" && " Otherwise, rest for 5 minutes, measure again, and contact your doctor."}
      </p>
      <a
        href={`tel:${number}`}
        className="figures mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 font-[560] text-danger transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        <Phone className="h-5 w-5" aria-hidden="true" /> Call {number}
      </a>
    </div>
  );
}
