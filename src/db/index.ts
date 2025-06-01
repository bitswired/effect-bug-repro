import { Database, SQLiteError } from "bun:sqlite";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Config, Data, Effect } from "effect";
import * as schema from "./schema";

type DatabaseClient = BunSQLiteDatabase<typeof schema>;

class DatabaseError extends Data.TaggedError("DatabaseError")<{
	readonly type:
		| "primary_key_violation"
		| "unique_violation"
		| "foreign_key_violation"
		| "connection_error";
	readonly cause: SQLiteError;
}> {
	public override toString() {
		return `DatabaseError: ${this.cause.message}`;
	}

	public get message() {
		return this.cause.message;
	}
}

const matchSqliteError = (error: unknown) => {
	if (error instanceof SQLiteError) {
		switch (error.errno) {
			case 1555:
				return new DatabaseError({
					type: "primary_key_violation",
					cause: error,
				});
			case 2067:
				return new DatabaseError({
					type: "unique_violation",
					cause: error,
				});
		}
	}
	return null;
};

export class DatabaseService extends Effect.Service<DatabaseService>()(
	"database",
	{
		// Define how to create the service
		effect: Effect.gen(function* () {
			yield* Effect.log("Getting Database URL");
			const dbUrl = yield* Config.string("DB_URL"); // Read as a string
			console.log(dbUrl);
			console.log(dbUrl);
			console.log(dbUrl);
			console.log(dbUrl);

			const sqlite = new Database(dbUrl);
			const db = drizzle({ client: sqlite, schema });

			yield* Effect.log("Migrating");
			migrate(db, { migrationsFolder: "./drizzle" });

			yield* Effect.log("Setting Pragmas");
			yield* Effect.sync(() => {
				db.run("PRAGMA journal_mode = WAL;");
				db.run("PRAGMA foreign_keys = ON;");
				db.run("PRAGMA busy_timeout = 5000;"); // Set a timeout of 5 seconds for busy database
				db.run("PRAGMA synchronous = NORMAL;"); // Set synchronous mode to NORMAL for better performance
				db.run("PRAGMA cache_size = 10000;"); // Set cache size to 10MB
				db.run("PRAGMA temp_store = MEMORY;"); // Use memory for temporary tables
			});

			const makeQuery = Effect.fn(
				<T>(fn: (client: DatabaseClient) => Promise<T>) =>
					Effect.tryPromise({
						try: async () => fn(db),
						catch: (cause) => {
							const error = matchSqliteError(cause);
							if (error !== null) {
								return error;
							}
							console.log(cause);
							throw cause;
						},
					}),
			);

			return {
				db,
				schema,
				makeQuery,
			};
		}),
	},
) {}
