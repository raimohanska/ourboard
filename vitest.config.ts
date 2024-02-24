import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["common/**/*.test.ts", "frontend/**/*.test.ts", "backend/**/*.test.ts"],
    },
})
