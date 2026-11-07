// D1 (SQLite) schema. See docs/TECH_PLAN.md §5.
// Conventions: text UUID ids, UTC timestamps in ms, JSON stored as text.
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { VITAL_TYPES, type Classification } from "../../shared/vitals";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const now = () => new Date();
const createdAt = () => ts("created_at").notNull().$defaultFn(now);
const updatedAt = () => ts("updated_at").notNull().$defaultFn(now).$onUpdateFn(now);
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

// ---------------------------------------------------------------------------
// Auth (Better Auth core tables + rate limit)
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// Signing keys for the JWT plugin (private keys are encrypted with BETTER_AUTH_SECRET).
export const jwks = sqliteTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: ts("created_at").notNull(),
  expiresAt: ts("expires_at"),
  alg: text("alg"),
  crv: text("crv"),
});

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

// ---------------------------------------------------------------------------
// Health profile and records
// ---------------------------------------------------------------------------

export type Lifestyle = {
  smoker: boolean;
  alcohol: "none" | "light" | "moderate" | "heavy";
  exerciseDaysPerWeek: number;
  diet?: string;
  stressLevel?: number;
};
export type EmergencyContact = { name: string; phone: string; relation?: string };

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  dateOfBirth: text("date_of_birth"), // YYYY-MM-DD
  sex: text("sex", { enum: ["female", "male", "other", "unspecified"] }),
  heightCm: real("height_cm"),
  country: text("country"), // ISO 3166-1 alpha-2, decides emergency number and units
  timezone: text("timezone").notNull().default("UTC"),
  units: text("units", { enum: ["metric", "us"] }).notNull().default("metric"),
  conditions: json<string[]>("conditions").notNull().default(sql`'[]'`),
  allergies: json<string[]>("allergies").notNull().default(sql`'[]'`),
  familyHistory: json<string[]>("family_history").notNull().default(sql`'[]'`),
  lifestyle: json<Lifestyle>("lifestyle"),
  hadHeartAttack: integer("had_heart_attack", { mode: "boolean" }).notNull().default(false),
  lastHeartAttackAt: text("last_heart_attack_at"),
  emergencyContact: json<EmergencyContact>("emergency_contact"),
  onboardedAt: ts("onboarded_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

const CLASSIFICATIONS = ["normal", "borderline", "high", "critical", "low"] as const satisfies readonly Classification[];

export const vitals = sqliteTable(
  "vitals",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: VITAL_TYPES }).notNull(),
    value: real("value").notNull(),
    value2: real("value2"), // diastolic for blood pressure
    unit: text("unit").notNull(),
    measuredAt: ts("measured_at").notNull(),
    source: text("source", { enum: ["manual", "import", "agent", "caretaker"] }).notNull().default("manual"),
    classification: text("classification", { enum: CLASSIFICATIONS }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("vitals_user_type_time_idx").on(t.userId, t.type, t.measuredAt)],
);

export const symptoms = sqliteTable(
  "symptoms",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    severity: integer("severity").notNull(), // 1..10
    durationMin: integer("duration_min"),
    accompaniedBy: json<string[]>("accompanied_by").notNull().default(sql`'[]'`),
    note: text("note"),
    occurredAt: ts("occurred_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("symptoms_user_time_idx").on(t.userId, t.occurredAt)],
);

export type MedSchedule = { times: string[]; days?: number[] }; // "HH:MM" local; days 0-6, omitted = daily

export const medications = sqliteTable(
  "medications",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dose: text("dose").notNull(),
    form: text("form"),
    instructions: text("instructions"),
    schedule: json<MedSchedule>("schedule").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("medications_user_idx").on(t.userId, t.active)],
);

export const doseEvents = sqliteTable(
  "dose_events",
  {
    id: id(),
    medicationId: text("medication_id").notNull().references(() => medications.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    scheduledAt: ts("scheduled_at").notNull(),
    status: text("status", { enum: ["pending", "taken", "skipped", "missed"] }).notNull().default("pending"),
    actedAt: ts("acted_at"),
    notifiedAt: ts("notified_at"),
  },
  (t) => [
    uniqueIndex("dose_events_med_time_uq").on(t.medicationId, t.scheduledAt),
    index("dose_events_due_idx").on(t.status, t.scheduledAt),
    index("dose_events_user_time_idx").on(t.userId, t.scheduledAt),
  ],
);

export const reminders = sqliteTable(
  "reminders",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["appointment", "custom"] }).notNull(),
    title: text("title").notNull(),
    dueAt: ts("due_at").notNull(),
    repeat: json<{ every: "day" | "week" | "month"; interval?: number }>("repeat"),
    nextRunAt: ts("next_run_at"),
    notifiedAt: ts("notified_at"),
    createdAt: createdAt(),
  },
  (t) => [index("reminders_next_run_idx").on(t.nextRunAt), index("reminders_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Reports and sharing
// ---------------------------------------------------------------------------

export const reports = sqliteTable(
  "reports",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").notNull(),
    reportDate: text("report_date"),
    doctor: text("doctor"),
    facility: text("facility"),
    r2Key: text("r2_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    note: text("note"),
    extractionStatus: text("extraction_status", { enum: ["none", "pending", "done", "failed"] }).notNull().default("none"),
    summary: text("summary"),
    createdAt: createdAt(),
  },
  (t) => [index("reports_user_date_idx").on(t.userId, t.reportDate)],
);

export const reportFindings = sqliteTable(
  "report_findings",
  {
    id: id(),
    reportId: text("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
    test: text("test").notNull(),
    value: text("value").notNull(),
    unit: text("unit"),
    refLow: real("ref_low"),
    refHigh: real("ref_high"),
    flag: text("flag", { enum: ["low", "normal", "high", "critical"] }),
    confirmedByUser: integer("confirmed_by_user", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("report_findings_report_idx").on(t.reportId)],
);

export const shares = sqliteTable(
  "shares",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
    includeVitals: integer("include_vitals", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("shares_user_idx").on(t.userId)],
);

export const shareItems = sqliteTable(
  "share_items",
  {
    shareId: text("share_id").notNull().references(() => shares.id, { onDelete: "cascade" }),
    reportId: text("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.shareId, t.reportId] })],
);

export const shareAccessLog = sqliteTable(
  "share_access_log",
  {
    id: id(),
    shareId: text("share_id").notNull().references(() => shares.id, { onDelete: "cascade" }),
    at: ts("at").notNull().$defaultFn(now),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
  },
  (t) => [index("share_access_share_idx").on(t.shareId)],
);

// ---------------------------------------------------------------------------
// Caretakers, alerts, notifications
// ---------------------------------------------------------------------------

export const CARE_PERMISSIONS = ["vitals", "meds", "reports", "alerts"] as const;
export type CarePermission = (typeof CARE_PERMISSIONS)[number];

export const careLinks = sqliteTable(
  "care_links",
  {
    id: id(),
    patientId: text("patient_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    caretakerId: text("caretaker_id").references(() => user.id, { onDelete: "cascade" }),
    invitedEmail: text("invited_email").notNull(),
    inviteTokenHash: text("invite_token_hash"),
    status: text("status", { enum: ["invited", "active", "revoked"] }).notNull().default("invited"),
    permissions: json<CarePermission[]>("permissions").notNull().default(sql`'[]'`),
    alertPrefs: json<{ channels: ("email" | "push")[]; quietHours?: { from: string; to: string } }>("alert_prefs"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("care_links_patient_idx").on(t.patientId),
    index("care_links_caretaker_idx").on(t.caretakerId, t.status),
  ],
);

export const alerts = sqliteTable(
  "alerts",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
    source: text("source", { enum: ["rule", "agent"] }).notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: json<Record<string, unknown>>("data"),
    acknowledgedAt: ts("acknowledged_at"),
    createdAt: createdAt(),
  },
  (t) => [index("alerts_user_time_idx").on(t.userId, t.createdAt)],
);

export const outbox = sqliteTable(
  "outbox",
  {
    id: id(),
    channel: text("channel", { enum: ["email", "push"] }).notNull(),
    recipient: text("recipient").notNull(),
    kind: text("kind").notNull(),
    payload: json<Record<string, unknown>>("payload").notNull(),
    status: text("status", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [index("outbox_status_idx").on(t.status, t.createdAt)],
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    keys: json<{ p256dh: string; auth: string }>("keys").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export const conversations = sqliteTable(
  "conversations",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("conversations_user_idx").on(t.userId, t.updatedAt)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "tool"] }).notNull(),
    content: text("content").notNull(),
    toolCalls: json<unknown[]>("tool_calls"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    rating: integer("rating"), // -1, 1
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

export const aiUsage = sqliteTable(
  "ai_usage",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(), // YYYY-MM-DD (UTC)
    requests: integer("requests").notNull().default(0),
    tokens: integer("tokens").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export const consents = sqliteTable(
  "consents",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["terms", "privacy", "ai_processing"] }).notNull(),
    version: text("version").notNull(),
    grantedAt: ts("granted_at").notNull().$defaultFn(now),
  },
  (t) => [index("consents_user_idx").on(t.userId)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: id(),
    actorId: text("actor_id"),
    subjectUserId: text("subject_user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    at: ts("at").notNull().$defaultFn(now),
  },
  (t) => [index("audit_subject_idx").on(t.subjectUserId, t.at)],
);
