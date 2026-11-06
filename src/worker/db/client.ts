import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

const createDb = (d1: D1Database) => drizzle(d1, { schema });
const cache = new WeakMap<D1Database, Db>();

/** One Drizzle instance per D1 binding per isolate (keeps per-request CPU low). */
export function getDb(env: Pick<Env, "DB">): Db {
  let db = cache.get(env.DB);
  if (!db) {
    db = createDb(env.DB);
    cache.set(env.DB, db);
  }
  return db;
}
