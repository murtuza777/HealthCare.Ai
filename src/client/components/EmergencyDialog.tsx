import { useEffect, useRef } from "react";
import { Phone, X } from "lucide-react";
import { emergencyNumber } from "../../shared/emergency";
import { useProfile } from "../lib/queries";

// Replaces the legacy "Emergency" form, which claimed "Emergency contact has been notified!"
// without notifying anyone. This gives one-tap calls; caretaker alerts arrive in Phase 3.
export function EmergencyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { data: profile } = useProfile();
  const number = emergencyNumber(profile?.country);
  const contact = profile?.emergencyContact;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="emergency-title"
      className="w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-red-500/40 bg-gray-950 p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="emergency-title" className="text-xl font-semibold">
            Need help now?
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-gray-300">
          Call emergency services if you have chest pain or pressure, trouble breathing, fainting, sudden weakness on one
          side, or slurred speech. Don't drive yourself.
        </p>
        <a
          href={`tel:${number}`}
          className="mt-5 flex items-center justify-center gap-3 rounded-xl bg-red-600 px-4 py-4 text-lg font-semibold hover:bg-red-500"
        >
          <Phone className="h-6 w-6" aria-hidden="true" /> Call {number}
        </a>
        {contact ? (
          <a
            href={`tel:${contact.phone}`}
            className="mt-3 flex items-center justify-center gap-3 rounded-xl border border-white/20 px-4 py-3 font-medium hover:bg-white/10"
          >
            <Phone className="h-5 w-5" aria-hidden="true" /> Call {contact.name}
            {contact.relation ? ` (${contact.relation})` : ""}
          </a>
        ) : (
          <p className="mt-3 text-sm text-gray-400">Add an emergency contact in your profile to call them from here.</p>
        )}
        {!profile?.country && (
          <p className="mt-3 text-xs text-gray-500">
            Showing 112, which works on most mobile networks. Set your country in your profile for your local number.
          </p>
        )}
      </div>
    </dialog>
  );
}
