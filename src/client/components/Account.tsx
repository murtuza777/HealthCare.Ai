import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { DELETE_PHRASE } from "../../shared/account";
import { useAccessLog, useDeleteAccount, useGiveConsent } from "../lib/account";
import { timeAgo } from "../lib/format";
import { Button, ButtonLink, ErrorText, inputClass, Loading, SheetHeader } from "./ui";
import { Wordmark } from "./Shell";

const link = "font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink";

/** Shown once, before the app, until the current terms and privacy notice are accepted. */
export function ConsentGate() {
  const give = useGiveConsent();
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <header className="mx-auto flex h-20 w-full max-w-5xl items-center px-5 sm:px-8">
        <Wordmark />
      </header>
      <main className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col justify-center px-5 pb-20">
        <h1 className="text-[2.25rem] font-light leading-[1.1] tracking-[-0.025em]">Before you start</h1>
        <ul className="mt-6 space-y-3 text-ink-muted">
          <li>Your record is private. Only you, and people you invite, can see it.</li>
          <li>Healthcare.AI supports your care but doesn't diagnose or replace your doctor.</li>
          <li>In an emergency, always call your local emergency number.</li>
        </ul>
        <label className="mt-8 flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>
            I agree to the{" "}
            <Link to="/terms" target="_blank" className={link}>
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className={link}>
              Privacy notice
            </Link>
            .
          </span>
        </label>
        <ErrorText error={give.error} />
        <Button className="mt-8 self-start" disabled={!checked || give.isPending} onClick={() => give.mutate(["terms", "privacy"])}>
          Continue
        </Button>
      </main>
    </div>
  );
}

/** Profile: download, access log and account deletion. */
export function AccountSection() {
  const log = useAccessLog();
  return (
    <section className="space-y-12">
      <div>
        <SheetHeader title="Your data" description="Download a copy of everything stored about you, as a JSON file. Report files are listed with links to download them." />
        <a href="/api/v1/account/export" className="inline-flex min-h-9 items-center rounded-full border border-line-strong bg-sheet px-3.5 text-sm font-[540] transition-[background-color,transform] duration-150 ease-out hover:bg-well/60 active:scale-[0.97]">
          Download my data
        </a>
      </div>

      <div>
        <SheetHeader title="Who has looked at your record" description="Each time a caretaker opens part of your record." />
        {log.isPending ? (
          <Loading lines={2} />
        ) : !log.data?.length ? (
          <p className="text-ink-muted">No one yet.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line text-sm">
            {log.data.slice(0, 15).map((e) => (
              <li key={e.id} className="flex justify-between gap-4 py-2.5">
                <span>
                  <span className="font-[540]">{e.actorName ?? "Someone"}</span> <span className="text-ink-muted">viewed {e.entity === "summary" ? "your summary" : `your ${e.entity.replace(/\//g, " ")}`}</span>
                </span>
                <span className="shrink-0 text-ink-faint">{timeAgo(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DeleteAccount />
    </section>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const del = useDeleteAccount();
  const qc = useQueryClient();
  const navigate = useNavigate();

  return (
    <div className="rounded-sheet border border-danger/25 p-5 sm:p-6">
      <h2 className="text-xl">Delete account</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">
        Permanently deletes your record, uploaded files, medicines, conversations, share links and care team. This can't be undone. Download your data first if you
        want a copy.
      </p>
      {!open ? (
        <Button variant="danger-quiet" size="sm" className="mt-4 !text-danger" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            del.mutate(phrase, {
              onSuccess: () => {
                qc.clear();
                navigate("/", { replace: true });
              },
            });
          }}
        >
          <label className="block text-sm">
            Type <span className="font-mono font-[540] text-ink">{DELETE_PHRASE}</span> to confirm
            <input className={`${inputClass} mt-1.5`} value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
          </label>
          <ErrorText error={del.error} />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" size="sm" disabled={phrase.trim().toLowerCase() !== DELETE_PHRASE || del.isPending}>
              {del.isPending ? "Deleting…" : "Delete everything"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** The assistant's one-time explanation of what is sent to the AI model. */
export function AiConsent() {
  const give = useGiveConsent();
  return (
    <div className="max-w-prose space-y-4">
      <h2 className="text-2xl">How the assistant uses your record</h2>
      <p className="text-ink-muted">
        To answer, the assistant sends a short summary of your record (profile, latest readings and trends, medicines and recent symptoms) with your question to
        an AI model run by Cloudflare Workers AI. Nothing is sent until you agree.
      </p>
      <p className="text-ink-muted">
        Answers can be wrong. Never change a medicine because of one. Emergency warnings don't depend on AI and always work.{" "}
        <Link to="/privacy" target="_blank" className={link}>
          Privacy notice
        </Link>
      </p>
      <ErrorText error={give.error} />
      <div className="flex gap-2 pt-2">
        <Button disabled={give.isPending} onClick={() => give.mutate(["ai_processing"])}>
          I agree, continue
        </Button>
        <ButtonLink to="/app" variant="ghost">
          Not now
        </ButtonLink>
      </div>
    </div>
  );
}
