import { Api } from "@api/domains/api";
import {
	HttpApiBuilder,
	HttpApiError,
	HttpApiSecurity,
} from "@effect/platform";
import { Effect, Layer, Redacted, Ref, Schema } from "effect";
import { AuthService, AuthorizationLive, CurrentUser } from "./service";

export const AuthGroupLive = HttpApiBuilder.group(Api, "auth", (handlers) =>
	handlers
		.handle("getMe", () => CurrentUser.pipe(Effect.map((x) => x.user)))
		.handle("logout", () =>
			Effect.zip(AuthService, CurrentUser).pipe(
				Effect.flatMap(([authService, { user }]) =>
					authService.invalidateAllSessions(user.id),
				),
				Effect.orElseFail(() => new HttpApiError.Unauthorized()),
			),
		)
		.handle("usernameLogin", ({ payload }) =>
			AuthService.pipe(
				Effect.flatMap((x) => x.usernameLogin(payload)),
				Effect.flatMap(({ token, session }) =>
					HttpApiBuilder.securitySetCookie(
						HttpApiSecurity.apiKey({
							in: "cookie",
							key: "token",
						}),
						Redacted.make(token),
						{
							httpOnly: true,
							expires: session.expiresAt,
							sameSite: "lax",
							secure: true,
						},
					),
				),

				Effect.catchAll((x) => {
					return new HttpApiError.NotFound();
				}),
			),
		)
		.handle("usernameSignup", ({ payload }) =>
			AuthService.pipe(
				Effect.flatMap((x) => x.usernameSignup(payload)),
				Effect.catchAll((x) => {
					return new HttpApiError.NotFound();
				}),
			),
		),
).pipe(Layer.provide(AuthService.Default), Layer.provide(AuthorizationLive));
