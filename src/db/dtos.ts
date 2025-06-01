import { Schema } from "effect";

class DatabaseCommon extends Schema.Class<DatabaseCommon>("Common")({
	createdAt: Schema.Date,
	updatedAt: Schema.Date,
}) {}

export class UserDto extends Schema.Class<UserDto>("UserDto")({
	...DatabaseCommon.fields,
	id: Schema.Number,
	email: Schema.String,
	//hashedPassword: Schema.Redacted(Schema.String),
}) {}

export class UsernameSignup extends Schema.Class<UsernameSignup>(
	"UsernameSignup",
)({
	email: Schema.String,
	password: Schema.String,
}) {}

export class UsernameLogin extends Schema.Class<UsernameLogin>("UsernameLogin")(
	{
		email: Schema.String,
		password: Schema.String,
	},
) {}
