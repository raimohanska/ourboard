import * as L from "lonna"
export const API_KEY = process.env.GOOGLE_API_KEY || null
export const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null
const SUPPORTED = !!(CLIENT_ID && API_KEY)

declare global {
    const gapi: any
}

let GoogleAuth: any
var SCOPE = "email"
const userInfoAtom: L.Atom<GoogleAuthUserInfo> = L.atom({ status: SUPPORTED ? "in-progress" : "not-supported" })

export const googleUser = L.view(userInfoAtom, (x) => x) // read-only view
L.view(googleUser, "status").log("Google login status")
export type GoogleAuthUserInfo =
    | {
          status: "signed-in"          
      } & GoogleAuthenticatedUser
    | {
          status: "signed-out"
      }
    | {
          status: "in-progress"
      }
    | {
          status: "not-supported"
      }

export type GoogleAuthenticatedUser = {
    name: string
    email: string
    token: string    
}

export async function start() {
    try {
        var discoveryUrl = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: [discoveryUrl],
            scope: SCOPE,
        })

        GoogleAuth = gapi.auth2.getAuthInstance()

        GoogleAuth.isSignedIn.listen(updateSigninStatus)
        updateSigninStatus()
    } catch (e) {
        console.warn("Google auth init failed", e)
        userInfoAtom.set({ status: "not-supported" })
    }
}

async function fetchUserInfo(): Promise<{ name: string; email: string }> {
    const { name, email } = (
        await gapi.client.request({
            path: "https://www.googleapis.com/oauth2/v2/userinfo",
        })
    ).result

    return { name, email } as const
}

async function updateSigninStatus() {
    var user = GoogleAuth.currentUser.get()
    var isAuthorized = user.hasGrantedScopes(SCOPE)
    if (isAuthorized) {
        var token = user.getAuthResponse().id_token
        const userInfo = { ...(await fetchUserInfo()), status: "signed-in" as const, token }
        console.log("Google sign-in successful")
        userInfoAtom.set(userInfo)
    } else {
        userInfoAtom.set({ status: "signed-out" })
    }
}

export function signInWithDifferentAccount() {
    signOut();
    signIn();
}

export function signIn() {
    GoogleAuth?.signIn()
}

export function signOut() {
    GoogleAuth?.signOut()
}

if (SUPPORTED) {
    gapi.load("client", start)
}
