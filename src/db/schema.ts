import { type SQL, sql } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	int,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export function lower(email: AnySQLiteColumn): SQL {
	return sql`lower(${email})`;
}

const common = {
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => sql`(unixepoch() * 1000)`),
};

export const userTable = sqliteTable(
	"users",
	{
		id: integer().primaryKey({ autoIncrement: true }),
		email: text().notNull(),
		passwordHash: text(),
		...common,
	},
	(t) => [uniqueIndex("email_idx").on(lower(t.email))],
);

export const sessionTable = sqliteTable("sessions", {
	id: text().primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	userId: int("user_id").notNull(),
	...common,
});

export const table = {
	userTable,
	sessionTable,
} as const;

export type Table = typeof table;
