import { HttpApi } from "@effect/platform";
import { AuthGroup } from "./auth/contract";

export const Api = HttpApi.make("MyApi").add(AuthGroup);
