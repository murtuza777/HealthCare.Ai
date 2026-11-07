import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CARE_PERMISSION_LABELS, type CarePermissionName } from "../../shared/care";
import type { VitalType } from "../../shared/vitals";
import { useAcceptInvite, useAcknowledgeAlert, useCareSummary, useInvitePreview, usePatientsCaredFor, useRemoveCareLink } from "../lib/care";
import { useSession } from "../lib/auth-client";
import { formatReading, timeAgo, VITAL_LABELS } from "../lib/format";
import { Button, ButtonLink, EmptyState, ErrorText, Loading, PageHeader, SheetHeader, StatusBadge } from "../components/ui";
import { TrendChart } from "../components/TrendChart";

// What a caretaker sees: read-only, limited to what the patient granted.

const link = "font-[540] text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink";

export function CaringList() {
  const { data, isPending, error } = usePatientsCaredFor();
  return (
    <div>
      <PageHeader title="People you care for" subtitle="Their readings, medicines and alerts, as they chose to share them." />
      {isPending && <Loading />}
      <ErrorText error={error} />
      {data && !data.length && (
        <EmptyState title="No one yet" body="When someone invites you to their care team, open the link they send you and they'll appear here." />
      )}
      {data && data.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {data.map((p) => (
            <li key={p.patientId}>
              <Link to={`/app/care/${p.patientId}`} className="group flex items-center justify-between gap-4 py-5">
                <span>
                  <span className="font-serif text-2xl">{p.name}</span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    Shared: {p.permissions.map((x) => CARE_PERMISSION_LABELS[x as CarePermissionName].label.toLowerCase()).join(", ")}
                  </span>
                </span>
                <span aria-hidden="true" className="text-ink-faint transition-transform duration-150 ease-out group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ROWS: VitalType[] = ["blood_pressure", "heart_rate", "spo2", "glucose", "weight"];

export function CareDashboard() {
  const { patientId = "" } = useParams();
  const { data, isPending, error } = useCareSummary(patientId);
  const ack = useAcknowledgeAlert(patientId);
  const leave = useRemoveCareLink();
  const patients = usePatientsCaredFor();
  const navigate = useNavigate();

  if (isPending) return <Loading label="Loading" lines={5} />;
  if (error || !data) {
    return <EmptyState title="Not available" body="You no longer have access to this person's record, or the link is wrong." action={<ButtonLink to="/app/care">Back</ButtonLink>} />;
  }
  const first = data.patient.name.split(" ")[0];
  const openAlerts = data.alerts?.filter((a) => !a.acknowledgedAt) ?? [];
  const linkId = patients.data?.find((p) => p.patientId === patientId)?.linkId;

  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">
            <Link to="/app/care" className="hover:text-ink">
              People you care for
            </Link>
          </p>
          <h1 className="mt-2 text-3xl font-light sm:text-[2.75rem] sm:leading-[1.1]">{data.patient.name}</h1>
          {data.patient.conditions.length > 0 && <p className="mt-2 text-ink-muted">{data.patient.conditions.join(", ")}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {data.patient.emergencyContact && (
            <a href={`tel:${data.patient.emergencyContact.phone}`} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 font-[560] transition-colors hover:bg-well/60">
              Call {data.patient.emergencyContact.name}
            </a>
          )}
          <a href={`tel:${data.patient.emergencyNumber}`} className="inline-flex min-h-11 items-center rounded-full border border-danger/30 px-5 font-[560] text-danger transition-colors hover:bg-danger-soft">
            Emergency {data.patient.emergencyNumber}
          </a>
        </div>
      </div>

      {data.alerts && (
        <section>
          <SheetHeader title="Alerts" description={openAlerts.length ? `${openAlerts.length} not yet seen` : "Nothing new"} />
          {!data.alerts.length ? (
            <p className="text-ink-muted">No alerts. You'll be notified if a reading is in the emergency range, urgent symptoms are logged, or a dose is missed.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {data.alerts.map((a) => (
                <li key={a.id} className={`flex flex-wrap items-start justify-between gap-3 py-4 ${a.acknowledgedAt ? "text-ink-muted" : ""}`}>
                  <div className="flex min-w-0 gap-3">
                    <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${a.acknowledgedAt ? "bg-line-strong" : a.severity === "critical" ? "bg-danger" : "bg-status-high"}`} />
                    <div>
                      <p className={`font-[540] ${!a.acknowledgedAt && a.severity === "critical" ? "text-danger" : ""}`}>{a.title}</p>
                      <p className="text-sm text-ink-muted">
                        {a.body} {timeAgo(a.createdAt)}.
                      </p>
                    </div>
                  </div>
                  {!a.acknowledgedAt && (
                    <Button variant="ghost" size="sm" disabled={ack.isPending} onClick={() => ack.mutate(a.id)}>
                      Mark as seen
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {data.latest && (
        <section>
          <SheetHeader title="Latest readings" />
          <ul className="divide-y divide-line border-y border-line">
            {ROWS.map((type) => {
              const v = data.latest?.[type];
              return (
                <li key={type} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
                  <span className="w-40 text-ink-muted">{VITAL_LABELS[type]}</span>
                  {v ? (
                    <>
                      <span className="reading flex-1 text-2xl">{formatReading(v)}</span>
                      <StatusBadge value={v.classification} />
                      <span className="w-28 text-right text-sm text-ink-faint">{timeAgo(v.measuredAt)}</span>
                    </>
                  ) : (
                    <span className="flex-1 text-ink-faint">Not recorded</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data.trends && (
        <div className="grid gap-x-12 gap-y-14 lg:grid-cols-2">
          <section>
            <SheetHeader title="Blood pressure" description="Last 30 readings" />
            <TrendChart points={data.trends.bloodPressure} unit="mmHg" dual />
          </section>
          <section>
            <SheetHeader title="Heart rate" description="Last 30 readings" />
            <TrendChart points={data.trends.heartRate} unit="bpm" />
          </section>
        </div>
      )}

      {data.doses && (
        <section>
          <SheetHeader
            title={`${first}'s medicines today`}
            description={data.adherence?.percent != null ? `${data.adherence.percent}% of due doses taken in the last 7 days` : undefined}
          />
          {!data.doses.items.length ? (
            <p className="text-ink-muted">Nothing scheduled today.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {data.doses.items.map((d) => (
                <li key={`${d.medicationId}-${d.scheduledAt}`} className="flex items-center gap-4 py-3.5">
                  <span className="figures w-14 text-ink-muted">{d.time}</span>
                  <span className="flex-1">
                    <span className="font-[540]">{d.name}</span> <span className="text-ink-muted">{d.dose}</span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${d.status === "taken" ? "bg-status-normal" : d.status === "missed" ? "bg-status-high" : d.status === "skipped" ? "bg-ink-faint" : "border border-ink-faint"}`}
                    />
                    {d.status === "pending" ? "Not yet" : d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {data.symptoms && data.symptoms.length > 0 && (
        <section>
          <SheetHeader title="Recent symptoms" />
          <ul className="divide-y divide-line border-y border-line">
            {data.symptoms.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3.5">
                <span className="font-[540] first-letter:uppercase">{s.type}</span>
                <span className="text-sm text-ink-muted">
                  <span className="figures">{s.severity}/10</span>, {timeAgo(s.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.reports && (
        <section>
          <SheetHeader title="Reports" />
          {!data.reports.length ? (
            <p className="text-ink-muted">No reports uploaded.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {data.reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3.5">
                  <span className="min-w-0">
                    <span className="block truncate font-[540]">{r.title}</span>
                    <span className="text-sm text-ink-muted">{r.reportDate ?? timeAgo(r.createdAt)}</span>
                  </span>
                  <a href={`/api/v1/patients/${patientId}/reports/${r.id}/file`} target="_blank" rel="noopener" className={link}>
                    View
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="border-t border-line pt-6 text-sm text-ink-muted">
        {data.patient.name} controls what you can see.{" "}
        {linkId && (
          <button
            className="text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-danger"
            onClick={() => {
              if (confirm(`Stop following ${data.patient.name}? You'll need a new invite to see their record again.`)) {
                leave.mutate(linkId, { onSuccess: () => navigate("/app/care") });
              }
            }}
          >
            Leave this care team
          </button>
        )}
      </section>
    </div>
  );
}

export function AcceptInvite() {
  const { token = "" } = useParams();
  const { data: session } = useSession();
  const preview = useInvitePreview(token);
  const accept = useAcceptInvite();
  const navigate = useNavigate();

  useEffect(() => {
    if (accept.data) navigate(`/app/care/${accept.data.patientId}`, { replace: true });
  }, [accept.data, navigate]);

  if (preview.isPending) return <Loading />;
  if (preview.error || !preview.data) {
    return <EmptyState title="This invite isn't valid" body="It may have expired or already been used. Ask the person who invited you to send a new one." action={<ButtonLink to="/app">Go to your overview</ButtonLink>} />;
  }
  const { patientName, invitedEmail, permissions } = preview.data;
  const mismatch = session && session.user.email.toLowerCase() !== invitedEmail;

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-light sm:text-4xl">Join {patientName}'s care team</h1>
      <p className="mt-3 text-ink-muted">{patientName} would like you to help look after their heart health. You'll be able to see:</p>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {permissions.map((p) => (
          <li key={p} className="py-3">
            <span className="block font-[540]">{CARE_PERMISSION_LABELS[p as CarePermissionName].label}</span>
            <span className="block text-sm text-ink-muted">{CARE_PERMISSION_LABELS[p as CarePermissionName].detail}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-muted">You can't change anything in their record, and they can remove you at any time.</p>
      {mismatch ? (
        <p role="alert" className="mt-6 rounded-control bg-well px-4 py-3 text-ink">
          This invite was sent to {invitedEmail}, but you're signed in as {session.user.email}. Sign out and sign in with {invitedEmail} to accept it.
        </p>
      ) : (
        <>
          <ErrorText error={accept.error} />
          <div className="mt-6 flex gap-2">
            <Button disabled={accept.isPending} onClick={() => accept.mutate(token)}>
              {accept.isPending ? "Joining…" : "Accept and join"}
            </Button>
            <ButtonLink to="/app" variant="ghost">
              Not now
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
