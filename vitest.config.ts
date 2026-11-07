import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

// Tests run inside workerd with a fresh local D1 that has all migrations applied.
export default defineConfig(async () => {
  const migrations = await readD1Migrations(fileURLToPath(new URL("./drizzle", import.meta.url)));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        remoteBindings: false, // never call Workers AI from tests (and CI has no Cloudflare login)
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            BETTER_AUTH_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
            EMAIL_MODE: "outbox", // read verification codes from the outbox in tests
            AI_MODE: "fake", // the assistant answers with fixed text; no model is called
            PASSWORD_PEPPER: "test-pepper-0123456789abcdef0123456789abcdef",
            // Pin optional features off so a developer's .dev.vars can't change test behaviour.
            RESEND_API_KEY: "",
            GOOGLE_CLIENT_ID: "",
            GOOGLE_CLIENT_SECRET: "",
            TURNSTILE_SITE_KEY: "",
            TURNSTILE_SECRET_KEY: "",
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
        "@worker": fileURLToPath(new URL("./src/worker", import.meta.url)),
      },
    },
    test: {
      include: ["tests/**/*.test.ts"],
      setupFiles: ["./tests/setup.ts"],
    },
  };
});
