import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Fresh local D1 with every migration applied.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
