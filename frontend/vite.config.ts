import { defineConfig } from "vite"

// `yarn dev` runs the backend on port 1338 so that the dev server can use 1337, the backend's default ROOT_URL.
const backend = "http://localhost:1338"

export default defineConfig({
    clearScreen: false,
    server: {
        port: 1337,
        strictPort: true,
        proxy: {
            "/api": backend,
            "/assets": backend,
            "/login": backend,
            "/logout": backend,
            "/google-callback": backend,
            "/test-callback": backend,
            "/socket": { target: backend, ws: true },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ["import"],
            },
        },
    },
    build: {
        // The backend serves uploaded files under /assets, so keep the build output elsewhere.
        assetsDir: "static",
        sourcemap: true,
    },
})
