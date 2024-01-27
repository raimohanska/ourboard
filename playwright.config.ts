import { PlaywrightTestConfig } from "@playwright/test"

const ci = process.env.CI === "true"

const config: PlaywrightTestConfig = {
    testDir: "playwright",
    outputDir: "playwright/results",
    fullyParallel: true,
    workers: ci ? 2 : 4,
    forbidOnly: ci,
    timeout: 60000, // Timeout per test file (default 30000)
    use: {
        baseURL: "http://localhost:8080",
        actionTimeout: 15000,
        trace: "on",
    },
    reporter: ci ? "github" : "line",
}
export default config
