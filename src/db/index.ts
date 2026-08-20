import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Config } from "../config/index.js";
import * as schema from "./schema.js";

const sql = neon(Config.databaseURL);

export const db = drizzle(sql, { schema });
