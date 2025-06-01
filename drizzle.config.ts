import { defineConfig } from "drizzle-kit";
import { Config, Effect } from "effect";

//const dbUrl = Effect.runSync(Config.string("DB_URL"));
//

const dbUrl =
	"Users/jimzer/Projects/bitswired-clean/s-god-rated-template/services/bun-mono/apps/api/.volumes/db.local";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "sqlite",
	dbCredentials: {
		url: dbUrl,
	},
});
