import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "legacy", "node_modules", ".wrangler", "worker-configuration.d.ts", "drizzle"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow `const { secret: _secret, ...safe } = row` to strip fields before returning them.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true, varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["src/worker/**/*.ts", "tests/**/*.ts"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    // Only the data access layer may touch the database directly (authorization lives there).
    files: ["src/worker/**/*.ts"],
    // index.ts is the composition root (creates the db handle and passes it in).
    ignores: ["src/worker/dal/**", "src/worker/db/**", "src/worker/auth.ts", "src/worker/jobs/**", "src/worker/index.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/db/client", "drizzle-orm/d1"],
          allowTypeImports: true,
          message: "Use the data access layer (src/worker/dal) instead.",
        }],
      }],
    },
  },
);
