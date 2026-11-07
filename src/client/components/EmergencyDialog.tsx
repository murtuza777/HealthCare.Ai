import { useEffect, useRef } from "react";
import { Phone, X } from "lucide-react";
import { emergencyNumber } from "../../shared/emergency";
import { useProfile } from "../lib/queries";

// One-tap calls only. It never claims anyone was notified (caretaker alerts arrive in Phase 3).
// A native <dialog>: focus is trapped and Escape closes it.
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
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-sheet border border-line bg-sheet p-0 text-ink shadow-lift"
    >
      <div className="border-t-[6px] border-danger p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 id="emergency-title" className="text-2xl">
            Need help now?
          </h2>
          <button onClick={onClose} aria-label="Close" className="-m-1.5 grid h-10 w-10 place-items-center rounded-control text-ink-muted hover:bg-well hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-ink-muted">
          Call emergency services for chest pain or pressure, trouble breathing, fainting, sudden weakness on one side, or
          slurred speech. Don't drive yourself.
        </p>
        <a
          href={`tel:${number}`}
          className="figures mt-6 flex min-h-14 items-center justify-center gap-3 rounded-control bg-danger px-4 text-xl font-bold text-white hover:bg-danger-hover"
        >
          <Phone className="h-6 w-6" aria-hidden="true" /> Call {number}
        </a>
        {contact ? (
          <a
            href={`tel:${contact.phone}`}
            className="mt-3 flex min-h-12 items-center justify-center gap-3 rounded-control border border-line-strong px-4 font-semibold hover:bg-well"
          >
            <Phone className="h-5 w-5" aria-hidden="true" /> Call {contact.name}
            {contact.relation ? ` (${contact.relation})` : ""}
          </a>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Add an emergency contact in your profile to call them from here.</p>
        )}
        {!profile?.country && (
          <p className="mt-3 text-sm text-ink-muted">
            112 works on most mobile networks. Set your country in your profile to see your local number.
          </p>
        )}
      </div>
    </dialog>
  );
}
