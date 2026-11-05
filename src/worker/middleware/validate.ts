import { HTTPException } from "hono/http-exception";
import type { z } from "zod";

/** Parse with a Zod schema; 400 with field errors on failure. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw new HTTPException(400, { res: Response.json({ error: "invalid_input", fields }, { status: 400 }) });
  }
  return result.data;
}
