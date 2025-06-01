import { UserDto, UsernameSignup } from "@api/db/dtos";
import { HttpApiEndpoint, HttpApiError, HttpApiGroup } from "@effect/platform";
import { Authorization } from "./service";

const getMe = HttpApiEndpoint.get("getMe", "/me")
	.addSuccess(UserDto)
	.addError(HttpApiError.Unauthorized)
	.middleware(Authorization);

const logout = HttpApiEndpoint.post("logout", "/logout")
	.addError(HttpApiError.Unauthorized)
	.middleware(Authorization);

const usernameLogin = HttpApiEndpoint.post("usernameLogin", "/username/login")
	.setPayload(UsernameSignup)
	.addError(HttpApiError.NotFound);

const usernameSignup = HttpApiEndpoint.post(
	"usernameSignup",
	"/username/signup",
)
	.setPayload(UsernameSignup)
	.addError(HttpApiError.NotFound);

// Group all user-related endpoints
export const AuthGroup = HttpApiGroup.make("auth")
	.add(getMe)
	.add(logout)
	.add(usernameLogin)
	.add(usernameSignup)
	.prefix("/auth");
