import { DatabaseService } from "@api/db";
import { HttpApiBuilder } from "@effect/platform";
import { Layer } from "effect";
import { Api } from "./api";
import { AuthGroupLive } from "./auth/group";

export const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(AuthGroupLive),
	Layer.provide(DatabaseService.Default),
);
