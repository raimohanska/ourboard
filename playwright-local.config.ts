import { PlaywrightTestConfig, devices } from "@playwright/test"

const ci = process.env.CI === "true"

const config: PlaywrightTestConfig = {
    testDir: "playwright",
    outputDir: "playwright/results",
    fullyParallel: true,
    workers: ci ? 2 : 1, // Use less workers
    forbidOnly: ci,
    timeout: 60000,
    retries: ci ? 2 : 0,
    use: {
        baseURL: "http://localhost:1337",
        actionTimeout: 15000,
        trace: "retain-on-failure",
    },
    reporter: ci ? "github" : "line",
    projects: [
        {
            name: "chromium",
            use: { 
                ...devices["Desktop Chrome"],
                // Try to use system Chrome if available
                channel: "chrome",
            },
        },
    ],
}
export default config