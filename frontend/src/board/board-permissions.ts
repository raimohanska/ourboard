import * as L from "lonna"
import { AccessLevel, Connection, Id, Item } from "../../../common/src/domain"
import { componentScope } from "harmaja"

export interface ItemPermissions {
    canChangeFont: boolean
    canChangeShapeAndColor: boolean
    canChangeTextAlign: boolean
    canMove: boolean
}
export interface ConnectionPermissions {
    canMove: boolean
    canChangeShapeAndColor: boolean
}
export type BoardPermissionsProvider = ReturnType<typeof BoardPermissionsProvider>
export function BoardPermissionsProvider(accessLevel: L.Property<AccessLevel>) {
    const api = {
        accessLevel,
        getItemPermissions(itemId: Id): L.Property<ItemPermissions> {
            return L.constant({
                canChangeFont: false,
                canChangeShapeAndColor: false,
                canChangeTextAlign: false,
                canMove: false,
            })
        },
        getConnectionPermissions(connectionId: Id): L.Property<ConnectionPermissions> {
            return L.constant({
                canMove: false,
                canChangeShapeAndColor: false,
            })
        },
        everyItemHasPermission<I extends Item>(
            p: L.Property<I[]>,
            fn: (p: ItemPermissions) => boolean,
            scope: L.Scope,
        ): L.Property<boolean> {
            return p
                .pipe(
                    L.flatMapLatest((items) =>
                        L.view(L.combineAsArray(items.map((i) => api.getItemPermissions(i.id))), (xs) => xs.every(fn)),
                    ),
                )
                .applyScope(scope)
        },
        everyConnectionHasPermission(
            p: L.Property<Connection[]>,
            fn: (p: ConnectionPermissions) => boolean,
            scope: L.Scope,
        ): L.Property<boolean> {
            return p
                .pipe(
                    L.flatMapLatest((items) =>
                        L.view(L.combineAsArray(items.map((i) => api.getConnectionPermissions(i.id))), (xs) =>
                            xs.every(fn),
                        ),
                    ),
                )
                .applyScope(scope)
        },
    }
    return api
}
