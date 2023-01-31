export function signIn() {
    document.location.assign("/login?returnTo=" + encodeURIComponent(getReturnPath()))
}

export function signOut() {
    document.location.assign("/logout?returnTo=" + encodeURIComponent(getReturnPath()))
}

function getReturnPath() {
    return document.location.pathname + document.location.search
}
