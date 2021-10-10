import { Fragment, h, ListView } from "harmaja"
import * as L from "lonna"
import { AccessListEntry, BoardAccessPolicy, BoardAccessPolicyDefined } from "../../../common/src/domain"
import { Checkbox, TextInput } from "../components/components"
import { defaultAccessPolicy, LoggedIn } from "../store/user-session-store"

type BoardAccessPolicyEditorProps = {
    accessPolicy: L.Atom<BoardAccessPolicy>
    user: LoggedIn
}
export const BoardAccessPolicyEditor = ({ accessPolicy, user }: BoardAccessPolicyEditorProps) => {
    const originalPolicy = accessPolicy.get()
    const restrictAccessToggle = L.atom(!!originalPolicy && !originalPolicy.publicWrite)
    restrictAccessToggle.onChange((restrict) => {
        accessPolicy.set(defaultAccessPolicy(user, restrict))
    })

    return (
        <div className="board-access-editor">
            <div className="restrict-toggle">
                <Checkbox checked={restrictAccessToggle} />
                <span>
                    <label htmlFor="domain-restrict">Restrict access to specific domains / email addresses</label>
                </span>
            </div>
            <div className="domain-restrict-details">
                {L.view(
                    accessPolicy,
                    (a) => !!a && !a.publicWrite,
                    (a) =>
                        a && (
                            <BoardAccessPolicyDetailsEditor
                                accessPolicy={accessPolicy as L.Atom<BoardAccessPolicyDefined>}
                                user={user}
                            />
                        ),
                )}
            </div>
        </div>
    )
}

const BoardAccessPolicyDetailsEditor = ({
    accessPolicy,
    user,
}: {
    accessPolicy: L.Atom<BoardAccessPolicyDefined>
    user: LoggedIn
}) => {
    const allowList = L.view(accessPolicy, "allowList")
    const inputRef = L.atom<HTMLInputElement | null>(null)
    const allowPublicReadRaw = L.view(accessPolicy, "publicRead")
    const allowPublicRead = L.atom<boolean>(
        L.view(allowPublicReadRaw, (r) => !!r),
        allowPublicReadRaw.set,
    )
    const currentInputText = L.atom("")
    const currentInputValid = L.view(currentInputText, (text) => parseAccessListEntry(text) !== null)

    function parseAccessListEntry(input: string): AccessListEntry | null {
        // LMAO at this validation
        return input.includes("@")
            ? { email: input, access: "read-write" }
            : input.includes(".")
            ? { domain: input, access: "read-write" }
            : null
    }

    inputRef.forEach((t) => {
        if (t) {
            // Autofocus email/domain input field for better UX
            t.focus()
        }
    })

    function addToAllowListIfValid(input: string) {
        const entry: AccessListEntry | null = parseAccessListEntry(input)
        if (entry) {
            allowList.modify((w) => [entry, ...w])
            currentInputText.set("")
        }
    }

    return (
        <>
            <div className="input-and-button">
                <TextInput ref={inputRef} value={currentInputText} type="text" placeholder="Enter email or domain" />
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        addToAllowListIfValid(currentInputText.get())
                    }}
                    disabled={L.not(currentInputValid)}
                >
                    Add
                </button>
            </div>

            <ListView
                observable={allowList}
                renderItem={(entry) => {
                    return (
                        <div className="input-and-button">
                            <div className="filled-entry">
                                {"domain" in entry
                                    ? `Allowing everyone with an email address ending in ${entry.domain}`
                                    : `Allowing user ${entry.email} (${entry.access})`}
                            </div>
                            <button
                                disabled={"email" in entry ? entry.email === user.email : false}
                                onClick={() => allowList.modify((w) => w.filter((e) => e !== entry))}
                            >
                                Remove
                            </button>
                        </div>
                    )
                }}
            />

            <p className="allow-public-read">
                <Checkbox checked={allowPublicRead} />
                Anyone with the link can view
            </p>
        </>
    )
}
