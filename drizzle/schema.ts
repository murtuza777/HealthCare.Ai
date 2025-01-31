import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  height: real('height').notNull(),
  weight: real('weight').notNull(),
  hasHeartCondition: integer('has_heart_condition', { mode: 'boolean' }).notNull(),
  hadHeartAttack: integer('had_heart_attack', { mode: 'boolean' }).notNull(),
  lastHeartAttack: text('last_heart_attack'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  name: text('name').notNull(),
  dosage: text('dosage').notNull(),
  frequency: text('frequency').notNull(),
  timeOfDay: text('time_of_day').notNull(), // Stored as JSON string
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const healthMetrics = sqliteTable('health_metrics', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  heartRate: integer('heart_rate').notNull(),
  bloodPressureSystolic: integer('blood_pressure_systolic').notNull(),
  bloodPressureDiastolic: integer('blood_pressure_diastolic').notNull(),
  cholesterol: integer('cholesterol').notNull(),
  weight: real('weight').notNull(),
  recordedAt: text('recorded_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const symptoms = sqliteTable('symptoms', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  type: text('type').notNull(),
  severity: integer('severity').notNull(),
  description: text('description'),
  duration: integer('duration'),
  accompaniedBy: text('accompanied_by'), // Stored as JSON string
  recordedAt: text('recorded_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const patientDetails = sqliteTable('patient_details', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull().references(() => patients.id),
  allergies: text('allergies'), // Stored as JSON string
  conditions: text('conditions'), // Stored as JSON string
  familyHistory: text('family_history'), // Stored as JSON string
  smoker: integer('smoker', { mode: 'boolean' }).notNull(),
  alcoholConsumption: text('alcohol_consumption').notNull(),
  exerciseFrequency: integer('exercise_frequency').notNull(),
  diet: text('diet'),
  stressLevel: integer('stress_level').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}); 