import { defineConfig } from "vitest/config"

const roots = (process.env.TEST_TARGET || "common,frontend,backend").split(",")

export default defineConfig({
    test: {
        include: roots.map((target) => `${target}/**/*.test.ts`),
    },
})
