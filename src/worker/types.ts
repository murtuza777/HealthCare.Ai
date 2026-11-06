import type { Db } from "./db/client";

import type { Actor } from "./dal/authz";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Db;
    actor: Actor;
    user: { id: string; email: string; name: string };
  };
};
