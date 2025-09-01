import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
    root: ".",
    base: "/",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: path.resolve(__dirname, "src/index.tsx"),
        },
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            common: path.resolve(__dirname, "../common/src"),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {},
        },
    },
    server: {
        port: 5173,
        open: true,
    },
})
