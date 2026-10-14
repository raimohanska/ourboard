import type { Fragment, HarmajaChildOrChildren } from "harmaja"

declare global {
    namespace JSX {
        interface ElementChildrenAttribute {
            children: {}
        }

        // TypeScript does not use an array for one child. Harmaja always gives an array to Fragment.
        type LibraryManagedAttributes<Component, Props> = Component extends typeof Fragment
            ? Omit<Props, "children"> & { children?: HarmajaChildOrChildren }
            : Props
    }
}
