import { PlaywrightTestConfig } from "@playwright/test"

const ci = process.env.CI === "true"
const headless = ci || process.env.HEADLESS === "true"

const config: PlaywrightTestConfig = {
    testDir: "playwright",
    timeout: 60000, // Timeout per test file (default 30000)
    use: {
        headless,
        baseURL: "http://localhost:8080",
        actionTimeout: 15000,
    },
    reporter: ci ? "github" : "line",
}
export default config
