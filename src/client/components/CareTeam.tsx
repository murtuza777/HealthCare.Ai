import { useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { CARE_PERMISSION_LABELS, CARE_PERMISSION_LIST, type CarePermissionName } from "../../shared/care";
import { useCaretakers, useInviteCaretaker, useRemoveCareLink, useUpdateCaretaker } from "../lib/care";
import { Button, Card, ErrorText, Field, inputClass, Loading, Notice, SheetHeader } from "./ui";

// The patient decides who can see their record, and what. Removing someone ends access at once.

export function CareTeam() {
  const { data, isPending, error } = useCaretakers();
  const [inviting, setInviting] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ url: string; email: string; emailed: boolean } | null>(null);

  return (
    <section>
      <SheetHeader
        title="Care team"
        description="Family members or carers who can follow your health. They see only what you choose, and can't change anything."
        action={
          !inviting && (
            <Button size="sm" variant="secondary" onClick={() => setInviting(true)}>
              Invite someone
            </Button>
          )
        }
      />
      {inviting && (
        <InviteForm
          onDone={(r) => {
            setInviting(false);
            if (r) setLastInvite(r);
          }}
        />
      )}
      {lastInvite && <InviteLink {...lastInvite} />}
      {isPending && <Loading lines={2} />}
      <ErrorText error={error} />
      {data && !data.length && !inviting && <p className="text-ink-muted">No one yet. Invite a family member so they're told if something needs attention.</p>}
      {data && data.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((p) => (
            <Member key={p.id} member={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

type MemberRow = NonNullable<ReturnType<typeof useCaretakers>["data"]>[number];

function Member({ member }: { member: MemberRow }) {
  const update = useUpdateCaretaker();
  const remove = useRemoveCareLink();
  const [editing, setEditing] = useState(false);
  const [perms, setPerms] = useState<CarePermissionName[]>(member.permissions as CarePermissionName[]);
  const pending = member.status === "invited";

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[540]">
            {member.name || member.email}
            {member.relation && <span className="font-[420] text-ink-muted">, {member.relation}</span>}
          </p>
          <p className="text-sm text-ink-muted">
            {member.name ? `${member.email}. ` : ""}
            {pending ? (member.expired ? "Invite expired." : "Invite sent, not accepted yet.") : `Can see: ${member.permissions.map((x) => CARE_PERMISSION_LABELS[x as CarePermissionName].label.toLowerCase()).join(", ")}.`}
          </p>
        </div>
        <div className="flex gap-1">
          {!pending && (
            <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              {editing ? "Close" : "Change access"}
            </Button>
          )}
          <Button
            variant="danger-quiet"
            size="sm"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm(pending ? "Cancel this invite?" : `Remove ${member.name || member.email}? They'll lose access straight away.`)) remove.mutate(member.id);
            }}
          >
            {pending ? "Cancel invite" : "Remove"}
          </Button>
        </div>
      </div>
      {editing && (
        <div className="mt-4">
          <PermissionPicker value={perms} onChange={setPerms} />
          <ErrorText error={update.error} />
          <Button size="sm" className="mt-4" disabled={update.isPending || !perms.length} onClick={() => update.mutate({ id: member.id, permissions: perms }, { onSuccess: () => setEditing(false) })}>
            Save access
          </Button>
        </div>
      )}
    </li>
  );
}

function PermissionPicker({ value, onChange }: { value: CarePermissionName[]; onChange: (v: CarePermissionName[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-[540] text-ink">What they can see</legend>
      <div className="space-y-2">
        {CARE_PERMISSION_LIST.map((p) => (
          <label key={p} className="flex cursor-pointer items-start gap-3 rounded-control px-1 py-1">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-ink"
              checked={value.includes(p)}
              onChange={(e) => onChange(e.target.checked ? [...value, p] : value.filter((x) => x !== p))}
            />
            <span>
              <span className="block font-[500]">{CARE_PERMISSION_LABELS[p].label}</span>
              <span className="block text-sm text-ink-muted">{CARE_PERMISSION_LABELS[p].detail}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function InviteForm({ onDone }: { onDone: (r: { url: string; email: string; emailed: boolean } | null) => void }) {
  const invite = useInviteCaretaker();
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("");
  const [perms, setPerms] = useState<CarePermissionName[]>(["vitals", "meds", "alerts"]);

  function submit(e: FormEvent) {
    e.preventDefault();
    invite.mutate(
      { email, permissions: perms, ...(relation.trim() ? { relation: relation.trim() } : {}) },
      { onSuccess: (r) => onDone({ url: r.inviteUrl, email, emailed: r.emailed }) },
    );
  }

  return (
    <Card boxed className="mb-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Their email">
            <input type="email" required autoComplete="off" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Relation (optional)">
            <input className={inputClass} value={relation} maxLength={50} placeholder="Daughter, husband, carer" onChange={(e) => setRelation(e.target.value)} />
          </Field>
        </div>
        <PermissionPicker value={perms} onChange={setPerms} />
        <ErrorText error={invite.error} />
        <div className="flex gap-2">
          <Button type="submit" disabled={invite.isPending || !perms.length}>
            {invite.isPending ? "Creating invite…" : "Create invite"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onDone(null)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function InviteLink({ url, email, emailed }: { url: string; email: string; emailed: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-6 space-y-3">
      <Notice tone="success">
        {emailed ? `Invite emailed to ${email}. ` : ""}Send this link to {email}. They sign in (or create an account) with that email to accept. It works once and expires in 7 days.
      </Notice>
      <div className="flex gap-2">
        <input readOnly value={url} className={`${inputClass} font-mono text-sm`} onFocus={(e) => e.target.select()} aria-label="Invite link" />
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
