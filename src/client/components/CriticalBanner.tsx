import { Phone } from "lucide-react";
import { emergencyNumber } from "../../shared/emergency";
import { useProfile } from "../lib/queries";

/** Shown after a reading in the emergency range or a red-flag symptom. Rule-based, never AI. */
export function CriticalBanner({ kind, reason }: { kind: "reading" | "symptom"; reason?: string }) {
  const { data: profile } = useProfile();
  const number = emergencyNumber(profile?.country);
  return (
    <div role="alert" className="rounded-2xl border border-red-500 bg-red-600/90 p-5 text-white">
      <p className="text-lg font-semibold">
        {kind === "reading" ? "This reading is in the emergency range." : "These symptoms can be an emergency."}
      </p>
      {reason && <p className="mt-1">{reason}</p>}
      <p className="mt-1">
        If you have chest pain, shortness of breath, fainting, or weakness on one side, call {number} now.
        {kind === "reading" && " Otherwise, rest, measure again in 5 minutes, and contact your doctor."}
      </p>
      <a href={`tel:${number}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-50">
        <Phone className="h-4 w-4" aria-hidden="true" /> Call {number}
      </a>
    </div>
  );
}
