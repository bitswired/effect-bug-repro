import { expect } from "bun:test";
import { BunContext } from "@effect/platform-bun";

import { ApiLive } from "@api/domains";
import { Api } from "@api/domains/api";
import {
	Cookies,
	FileSystem,
	HttpApiBuilder,
	HttpApiClient,
	HttpClient,
	Path,
} from "@effect/platform";
import { BunHttpServer } from "@effect/platform-bun";
import { ConfigProvider, Effect, Layer, Ref } from "effect";

const ServerTestLive = HttpApiBuilder.serve().pipe(
	Layer.provide(HttpApiBuilder.middlewareCors()),
	Layer.provide(ApiLive),
	Layer.provideMerge(BunHttpServer.layerTest),
);

const basePath =
	"/Users/jimzer/Projects/bitswired-clean/effect-bug-repro/.volumes";

const cleaner = Effect.gen(function* () {
	const { dbUrl } = yield* DbTestPathService;
	yield* Effect.log("Cleaning test database", dbUrl);
	const fs = yield* FileSystem.FileSystem;
	const deleteOnlyIfFile = (p: string) =>
		fs.stat(p).pipe(
			Effect.map((y) => y.type === "File"),
			Effect.if({
				onTrue: () => fs.remove(p),
				onFalse: () => Effect.fail("Not a file"),
			}),
		);
	//yield* deleteOnlyIfFile(dbUrl);
	//yield* deleteOnlyIfFile(`${dbUrl}-shm`);
	//yield* deleteOnlyIfFile(`${dbUrl}-wal`);
}).pipe(Effect.catchAll((x) => Effect.log(x)));

class DbTestPathService extends Effect.Service<DbTestPathService>()(
	"db-test-path-service",
	{
		effect: Effect.gen(function* () {
			const uid = Bun.randomUUIDv7();
			const path = yield* Path.Path;
			const dbUrl = path.join(basePath, uid);
			return { dbUrl };
		}),
	},
) {}

class TestService extends Effect.Service<TestService>()("test", {
	effect: Effect.gen(function* () {
		const ref = yield* Ref.make(Cookies.empty);
		const client = yield* HttpApiClient.make(Api, {
			transformClient: (client) => client.pipe(HttpClient.withCookiesRef(ref)),
		});

		return { client };
	}),
}) {}

const mockConfigProvider = DbTestPathService.pipe(
	Effect.map(({ dbUrl }) =>
		ConfigProvider.fromMap(new Map([["DB_URL", dbUrl]])),
	),
);
const TestServiceLive = Layer.provide(TestService.Default, ServerTestLive);

const runTest = <A, B>(program: Effect.Effect<A, B, TestService>) => {
	return Effect.runPromise(
		mockConfigProvider
			.pipe(
				Effect.flatMap((configProvider) =>
					Effect.withConfigProvider(
						Effect.scoped(
							Effect.addFinalizer(() => cleaner).pipe(Effect.andThen(program)),
						).pipe(
							Effect.provide(BunContext.layer),
							Effect.provide(TestServiceLive),
						),
						configProvider,
					),
				),
			)
			.pipe(
				Effect.provide(DbTestPathService.Default),
				Effect.provide(Path.layer),
			),
	);
};

await runTest(
	Effect.gen(function* () {
		const { client } = yield* TestService;
		const payload = { email: "test@test.com", password: "password" };
		yield* client.auth.usernameSignup({ payload });
		yield* client.auth
			.usernameSignup({ payload, withResponse: true })
			.pipe(Effect.catchTag("NotFound", () => Effect.succeed("ok")));
	}),
);

console.log("*");
console.log("*");
console.log("*");
console.log("*");
console.log("*");
console.log("*");
console.log("*");
console.log("*");
console.log("*");
console.log("*");
console.log("*");

await runTest(
	Effect.gen(function* () {
		const { client } = yield* TestService;
		const payload = { email: "test@test.com", password: "password" };
		yield* client.auth.usernameSignup({ payload });
		yield* client.auth.usernameLogin({ payload });
		const me = yield* client.auth.getMe();
		expect(me.email).toBe("test@test.com");
	}),
);
