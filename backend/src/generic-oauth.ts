import { isLeft, Left, left } from "fp-ts/lib/Either"
import * as t from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"
import JWT from "jsonwebtoken"
import { OAuthAuthenticatedUser } from "../../common/src/authenticated-user"
import { getEnv } from "./env"
import { AuthProvider } from "./oauth"

type GenericOAuthConfig = {
    OAUTH_CONFIG_URL: string
    OAUTH_CLIENT_ID: string
    OAUTH_CLIENT_SECRET: string
}

export const genericOauthConfig: GenericOAuthConfig | null = process.env.OAUTH_CONFIG_URL
    ? {
          OAUTH_CONFIG_URL: getEnv("OAUTH_CONFIG_URL"),
          OAUTH_CLIENT_ID: getEnv("OAUTH_CLIENT_ID"),
          OAUTH_CLIENT_SECRET: getEnv("OAUTH_CLIENT_SECRET"),
      }
    : null

export function GenericOAuthProvider(config: GenericOAuthConfig): AuthProvider {
    console.log(`Setting up generic OAuth authentication using client id ${config.OAUTH_CLIENT_ID}`)

    const callbackUrl = `${getEnv("ROOT_URL")}/google-callback`

    const openIdConfiguration = (async () => {
        const response = await fetch(config.OAUTH_CONFIG_URL)
        return decodeOrThrow(OpenIdConfiguration, await response.json())
    })()

    async function getAccountFromCode(code: string): Promise<OAuthAuthenticatedUser> {
        const response = await fetch((await openIdConfiguration).token_endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(
                config.OAUTH_CLIENT_ID,
            )}&client_secret=${config.OAUTH_CLIENT_SECRET}&redirect_uri=${callbackUrl}`,
        })

        const body = await response.json()
        const idToken = JWT.decode(body.id_token)
        return decodeOrThrow(IdToken, idToken)
    }

    async function getAuthPageURL() {
        const scopes = "email openid profile"
        const state = "TODO"
        const redirectUri = callbackUrl
        return `${(await openIdConfiguration).authorization_endpoint}?scope=${encodeURIComponent(
            scopes,
        )}&response_type=code&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(
            redirectUri,
        )}&client_id=${config.OAUTH_CLIENT_ID}`
    }

    return {
        getAccountFromCode,
        getAuthPageURL,
    }
}

const OpenIdConfiguration = t.type({
    authorization_endpoint: t.string,
    token_endpoint: t.string,
})

const IdToken = t.type({
    email: t.string,
    name: t.string,
    picture: t.string,
})

export function decodeOrThrow<T>(codec: t.Type<T, any>, input: any): T {
    const validationResult = codec.decode(input)
    if (isLeft(validationResult)) {
        throw new ValidationError(validationResult)
    }
    return validationResult.right
}

class ValidationError extends Error {
    constructor(errors: Left<t.Errors>) {
        super(report_(errors.left))
    }
}

function report_(errors: t.Errors) {
    return PathReporter.report(left(errors)).join("\n")
}
