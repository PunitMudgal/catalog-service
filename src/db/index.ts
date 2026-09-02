import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Config } from "../config/index.js";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const sql = neon(Config.databaseURL);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

/** @deprecated Use getDb() instead */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop);
  },
});
