import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../drizzle/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

if (!process.env.DATABASE_AUTH_TOKEN) {
  throw new Error('DATABASE_AUTH_TOKEN is not set');
}

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Helper function to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper function to format dates for SQLite
export function formatDate(date: Date): string {
  return date.toISOString();
}

// Helper function to parse dates from SQLite
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// Helper function to stringify arrays/objects for storage
export function stringifyForStorage(data: any): string {
  return JSON.stringify(data);
}

// Helper function to parse arrays/objects from storage
export function parseFromStorage<T>(data: string | null): T | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
} 