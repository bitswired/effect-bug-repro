import { HttpApiBuilder, HttpApiSwagger } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { ApiLive } from "./domains";

// Set up the server using NodeHttpServer on port 3000
const ServerLive = HttpApiBuilder.serve().pipe(
	Layer.provide(HttpApiBuilder.middlewareCors()),
	Layer.provide(HttpApiSwagger.layer()),
	Layer.provide(ApiLive),
	Layer.provide(BunHttpServer.layer({ port: 3000 })),
);

// Launch the server
Layer.launch(ServerLive).pipe(BunRuntime.runMain);
