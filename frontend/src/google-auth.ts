import LocalStore from "./store/board-local-store"

export function signIn() {
    document.location.assign("/login?returnTo=" + encodeURIComponent(getReturnPath()))
}

export async function signOut() {
    await LocalStore.clearAllPrivateBoards()
    document.location.assign("/logout?returnTo=" + encodeURIComponent(getReturnPath()))
}

function getReturnPath() {
    return document.location.pathname + document.location.search
}
