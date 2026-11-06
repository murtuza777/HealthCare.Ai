import { useMemo, useState, type DragEvent, type FormEvent } from "react";
import { Link } from "react-router";
import { Download, Eye, FileText, FolderOpen, QrCode, Search, Trash2, Upload, X } from "lucide-react";
import { ALLOWED_MIME, MAX_REPORT_BYTES, REPORT_TYPES } from "../../shared/reports";
import { reportFileUrl, useDeleteReport, useReports, useUploadReport, type Report } from "../lib/queries";
import { localDate } from "../lib/format";
import { Button, Card, EmptyState, ErrorText, Field, inputClass, Loading, PageHeader } from "../components/ui";

// Ported from legacy/app/reports/{add,gallery}. Files go to a private R2 bucket and are only
// served through access-checked routes.

export function Reports() {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Keep lab results, scans and prescriptions together, and share them with your doctor."
        action={
          <div className="flex gap-2">
            <Link to="/app/reports/share">
              <Button variant="secondary">
                <QrCode className="h-4 w-4" aria-hidden="true" /> Share with QR
              </Button>
            </Link>
            {!uploading && (
              <Button onClick={() => setUploading(true)}>
                <Upload className="h-4 w-4" aria-hidden="true" /> Upload report
              </Button>
            )}
          </div>
        }
      />
      {uploading && <UploadReport onDone={() => setUploading(false)} />}
      <Gallery onUpload={() => setUploading(true)} />
    </div>
  );
}

const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function UploadReport({ onDone }: { onDone: () => void }) {
  const upload = useUploadReport();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("General");
  const [reportDate, setReportDate] = useState(localDate());
  const [doctor, setDoctor] = useState("");
  const [facility, setFacility] = useState("");
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    // Friendly early checks; the server verifies the real file type and size again.
    if (!ALLOWED_MIME.includes(f.type as (typeof ALLOWED_MIME)[number])) return setFileError("Upload a PDF, JPEG, PNG or WebP file.");
    if (f.size > MAX_REPORT_BYTES) return setFileError("Files can be up to 10 MB.");
    setFileError(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 120));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setFileError("Choose a file first.");
    upload.mutate(
      {
        file,
        meta: {
          title: title.trim(),
          type,
          ...(reportDate ? { reportDate } : {}),
          ...(doctor.trim() ? { doctor: doctor.trim() } : {}),
          ...(facility.trim() ? { facility: facility.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upload a report</h2>
        <button onClick={onDone} aria-label="Cancel upload" className="text-gray-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-red-500 bg-red-500/10" : "border-white/20 hover:border-white/40"
          }`}
        >
          <Upload className="h-8 w-8 text-red-400" aria-hidden="true" />
          {file ? (
            <span className="font-medium">
              {file.name} <span className="text-gray-400">({fmtSize(file.size)})</span>
            </span>
          ) : (
            <span>
              <span className="font-medium text-white">Choose a file</span> or drag it here
            </span>
          )}
          <span className="text-xs text-gray-400">PDF, JPEG, PNG or WebP, up to 10 MB</span>
          <input type="file" accept={ALLOWED_MIME.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {fileError && (
          <p role="alert" className="text-sm text-red-400">
            {fileError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" className="sm:col-span-2">
            <input required maxLength={120} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lipid profile" />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t} className="bg-gray-900">
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Report date">
            <input type="date" className={inputClass} value={reportDate} max={localDate()} onChange={(e) => setReportDate(e.target.value)} />
          </Field>
          <Field label="Doctor (optional)">
            <input className={inputClass} value={doctor} onChange={(e) => setDoctor(e.target.value)} />
          </Field>
          <Field label="Hospital or lab (optional)">
            <input className={inputClass} value={facility} onChange={(e) => setFacility(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea rows={2} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorText error={upload.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={upload.isPending || !file}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Gallery({ onUpload }: { onUpload: () => void }) {
  const { data, isPending, error } = useReports();
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        (type === "All" || r.type === type) &&
        (!needle || [r.title, r.doctor, r.facility, r.note].some((s) => s?.toLowerCase().includes(needle))),
    );
  }, [data, q, type]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Search reports</span>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input className={`${inputClass} pl-9`} placeholder="Search reports…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {["All", ...REPORT_TYPES].map((t) => (
              <option key={t} value={t} className="bg-gray-900">
                {t === "All" ? "All categories" : t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {isPending && <Loading />}
      <ErrorText error={error} />
      {data?.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No reports yet"
          body="Upload lab results, scans and prescriptions so they're ready when your doctor asks."
          action={<Button onClick={onUpload}>Upload your first report</Button>}
        />
      )}
      {data && data.length > 0 && filtered.length === 0 && <p className="py-6 text-center text-gray-400">No reports match your search.</p>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <ReportCard key={r.id} r={r} />
        ))}
      </ul>
    </Card>
  );
}

function ReportCard({ r }: { r: Report }) {
  const del = useDeleteReport();
  const isImage = r.mime.startsWith("image/");
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
      <a href={reportFileUrl(r.id)} target="_blank" rel="noopener" className="flex h-36 items-center justify-center bg-white/5">
        {isImage ? (
          <img src={reportFileUrl(r.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-12 w-12 text-red-400" aria-hidden="true" />
        )}
      </a>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-medium">{r.title}</p>
        <p className="text-sm text-gray-400">
          {r.type}
          {r.reportDate && ` · ${r.reportDate}`} · {fmtSize(r.size)}
        </p>
        {(r.doctor || r.facility) && <p className="text-sm text-gray-400">{[r.doctor, r.facility].filter(Boolean).join(", ")}</p>}
        <div className="mt-auto flex gap-2 pt-3">
          <a href={reportFileUrl(r.id)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
            <Eye className="h-4 w-4" aria-hidden="true" /> View
          </a>
          <a href={reportFileUrl(r.id, true)} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
            <Download className="h-4 w-4" aria-hidden="true" /> Download
          </a>
          <Button
            variant="danger"
            className="ml-auto px-3 py-1.5"
            aria-label={`Delete ${r.title}`}
            disabled={del.isPending}
            onClick={() => {
              if (confirm(`Delete "${r.title}"? Any share links will no longer include it.`)) del.mutate(r.id);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}
