import { DatabaseService } from "@api/db";
import type { UsernameLogin, UsernameSignup } from "@api/db/dtos";
import type { sessionTable, userTable } from "@api/db/schema";
import {
	HttpApiError,
	HttpApiMiddleware,
	HttpApiSecurity,
} from "@effect/platform";
import { type InferSelectModel, eq } from "drizzle-orm";
import { Context, Effect, Layer, Redacted } from "effect";

const hasher = new Bun.CryptoHasher("sha256");

export class CurrentUser extends Context.Tag("CurrentUser")<
	CurrentUser,
	{
		user: InferSelectModel<typeof userTable>;
		session: InferSelectModel<typeof sessionTable>;
	}
>() {}

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
	"Authorization",
	{
		// Define the error schema for unauthorized access
		failure: HttpApiError.Unauthorized,
		// Specify the resource this middleware will provide
		provides: CurrentUser,
		// Add security definitions
		security: {
			cookie: HttpApiSecurity.apiKey({
				in: "cookie",
				key: "token",
			}),
			bearer: HttpApiSecurity.bearer,

			// Additional security definitions can be added here.
			// They will attempt to be resolved in the order they are defined.
		},
	},
) {}

export const AuthorizationLive = Layer.effect(
	Authorization,
	Effect.gen(function* () {
		const {
			makeQuery,
			db,
			schema: { userTable, sessionTable },
		} = yield* DatabaseService;
		const uu = db.$client.filename;
		const random = Math.random();
		yield* Effect.log("creating Authorization middleware", db.$client.filename);
		console.log(random, uu);

		const getUserFromSession = (sessionId: string) =>
			makeQuery((db) =>
				db
					.select({ user: userTable, session: sessionTable })
					.from(sessionTable)
					.innerJoin(userTable, eq(sessionTable.userId, userTable.id))
					.where(eq(sessionTable.id, sessionId)),
			);

		const invalidateSession = (sessionId: string) =>
			makeQuery((db) =>
				db.delete(sessionTable).where(eq(sessionTable.id, sessionId)),
			);
		const increaseSession = (sessionId: string, expiresAt: Date) =>
			makeQuery((db) =>
				db
					.update(sessionTable)
					.set({
						expiresAt: expiresAt,
					})
					.where(eq(sessionTable.id, sessionId)),
			);

		// Return the security handlers for the middleware
		return {
			// Define the handler for the Bearer token
			// The Bearer token is redacted for security
			bearer: (bearerToken) => {
				return Effect.fail(new HttpApiError.Unauthorized());
			},
			cookie: (token) => {
				return Effect.gen(function* () {
					const sessionId = hasher.update(Redacted.value(token)).digest("hex");

					console.log("---------------------");
					console.log("UU", random, uu);
					console.log(sessionId);
					console.log("\n\n", "DATABASE USING", db.$client.filename, "\n\n");
					const res = yield* makeQuery((db) => db.select().from(sessionTable));
					console.log(res);
					console.log("---------------------");

					const usersFromSession = yield* getUserFromSession(sessionId);
					if (usersFromSession.length === 0 || !usersFromSession[0]) {
						return yield* Effect.fail("User not found");
					}

					const { user, session } = usersFromSession[0];

					if (Date.now() >= session.expiresAt.getTime()) {
						yield* invalidateSession(session.id);
						return yield* Effect.fail("Session expired");
					}

					if (
						Date.now() >=
						session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15
					) {
						const newExpiresAt = new Date(
							Date.now() + 1000 * 60 * 60 * 24 * 30,
						);
						yield* increaseSession(session.id, newExpiresAt);
					}

					return {
						user,
						session,
					};
				}).pipe(
					Effect.catchAll((err) => {
						console.log(err);
						return new HttpApiError.Unauthorized();
					}),
				);
			},
		};
	}),
);

export class AuthService extends Effect.Service<AuthService>()("auth", {
	effect: Effect.gen(function* () {
		const {
			makeQuery,
			db,
			schema: { userTable, sessionTable },
		} = yield* DatabaseService;

		yield* Effect.log("creating AuthService", db.$client.filename);

		const usernameLoginVeriy = (data: UsernameLogin) => {
			return Effect.gen(function* () {
				const user = (yield* makeQuery((db) =>
					db
						.select()
						.from(userTable)
						.where(eq(userTable.email, data.email))
						.limit(1),
				)).at(0);

				if (!user) {
					return yield* Effect.fail("User not found");
				}
				if (!user.passwordHash) {
					return yield* Effect.fail("User not found");
				}
				const p = user.passwordHash;

				const isValid = yield* Effect.tryPromise(() =>
					Bun.password.verify(data.password, p),
				);

				if (!isValid) {
					return yield* Effect.fail("Invalid password");
				}

				return user;
			});
		};

		return {
			invalidateSession(sessionId: string) {
				return makeQuery((db) =>
					db.delete(sessionTable).where(eq(sessionTable.id, sessionId)),
				);
			},
			invalidateAllSessions(userId: number) {
				return makeQuery((db) =>
					db.delete(sessionTable).where(eq(sessionTable.userId, userId)),
				);
			},
			usernameSignup(data: UsernameSignup) {
				return Effect.gen(function* () {
					const hashedPassword = yield* Effect.tryPromise(() =>
						Bun.password.hash(data.password, {
							algorithm: "argon2id", // "argon2id" | "argon2i" | "argon2d"
							memoryCost: 4, // memory usage in kibibytes
							timeCost: 3, // the number of iterations
						}),
					);

					yield* makeQuery((db) =>
						db.insert(userTable).values({
							email: data.email,
							passwordHash: hashedPassword,
						}),
					);
				});
			},

			usernameLogin(data: UsernameLogin) {
				return Effect.gen(function* () {
					const user = yield* usernameLoginVeriy(data);
					const token = Bun.randomUUIDv7();
					const sessionId = hasher.update(token).digest("hex");
					const session = (yield* makeQuery((db) =>
						db
							.insert(sessionTable)
							.values({
								id: sessionId,
								userId: user.id,
								expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
							})
							.returning(),
					)).at(0);

					if (!session) {
						return yield* Effect.fail("Insert not returning");
					}

					return { user, token, session };
				});
			},
		};
	}),
}) {}
