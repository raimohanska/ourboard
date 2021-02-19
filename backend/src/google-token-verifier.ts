import { OAuth2Client } from "google-auth-library"
import { AuthLogin } from "../../common/src/domain"

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ""
const client = new OAuth2Client(CLIENT_ID)
if (!CLIENT_ID) {
    console.warn("GOOGLE_CLIENT_ID missing, cannot verify Google login token")
}

export async function verifyGoogleTokenAndUserInfo(event: AuthLogin): Promise<boolean> {
    try {
        if (!CLIENT_ID) {
            return false
        }
        const token = event.token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        })
        const payload = ticket.getPayload()

        if (!payload) {
            throw Error("Google OAuth payload missing")
        }
        if (!payload.name) {
            throw Error("Google OAuth payload name missing")
        }
        if (!payload.email) {
            throw Error("Google OAuth payload email missing")
        }
        if (payload.email !== event.email) {
            throw Error("Email mismatch in Google token validation: " + event.email + " vs " + payload.email)
        } else if (payload.name !== event.name) {
            throw Error("Name mismatch in Google token validation: " + event.name + " vs " + payload.name)
        }
        return true
    } catch (e) {
        console.warn("Google token validation failed", e)
        return false
    }
}
