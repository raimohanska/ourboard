import { Fragment, h, ListView } from "harmaja"
import * as L from "lonna"
import { AccessListEntry, BoardAccessPolicy, BoardAccessPolicyDefined } from "../../../common/src/domain"
import { Checkbox } from "../components/components"
import { LoggedIn } from "../store/user-session-store"

type BoardAccessPolicyEditorProps = {
    accessPolicy: L.Atom<BoardAccessPolicy>
    user: LoggedIn
}
export const BoardAccessPolicyEditor = ({ accessPolicy, user }: BoardAccessPolicyEditorProps) => {
    const restrictAccessToggle = L.atom(false)
    restrictAccessToggle.onChange((restrict) => {
        accessPolicy.set(restrict ? { allowList: [], publicRead: false } : undefined)
    })

    return [
        <div className="restrict-toggle">
            <input
                id="domain-restrict"
                type="checkbox"
                onChange={(e) => restrictAccessToggle.set(!!e.target.checked)}
            />
            <label htmlFor="domain-restrict">Restrict access to specific domains / email addresses</label>
        </div>,
        L.view(
            accessPolicy,
            (a) => !!a,
            (a) =>
                a && (
                    <BoardAccessPolicyDetailsEditor
                        accessPolicy={accessPolicy as L.Atom<BoardAccessPolicyDefined>}
                        user={user}
                    />
                ),
        ),
    ]
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

    inputRef.forEach((t) => {
        if (t) {
            // Autofocus email/domain input field for better UX
            t.focus()
        }
    })

    function addToAllowListIfValid(input: string) {
        // LMAO at this validation
        const entry: AccessListEntry | null = input.includes("@")
            ? { email: input, access: "read-write" }
            : input.includes(".")
            ? { domain: input, access: "read-write" }
            : null

        if (entry) {
            allowList.modify((w) => [entry, ...w])
            currentInputText.set("")
        }
    }

    return (
        <>
            <div className="input-and-button">
                <input
                    ref={inputRef}
                    onChange={(e) => currentInputText.set(e.target.value)}
                    type="text"
                    placeholder="e.g. 'mycompany.com' or 'john.doe@mycompany.com'"
                />
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        addToAllowListIfValid(currentInputText.get())
                    }}
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
                                    : `Allowing user ${entry.email}`}
                            </div>
                            <button onClick={() => allowList.modify((w) => w.filter((e) => e !== entry))}>
                                Remove
                            </button>
                        </div>
                    )
                }}
            />

            <div className="input-and-button">
                <div className="filled-entry">{`Allowing user ${user.email}`}</div>
                <button disabled>Remove</button>
            </div>

            <p>
                Anyone with the link can view <Checkbox checked={allowPublicRead} />
            </p>
        </>
    )
}
