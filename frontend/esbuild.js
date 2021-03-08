require("dotenv").config()

const sass = require("esbuild-plugin-sass")
const path = require("path")
const fs = require("fs")
const esbuild = require("esbuild")
const rimraf = require("rimraf")
const chokidar = require("chokidar")

const mode = process.argv[2]

if (!mode) {
    throw Error("Specify 'build' or 'watch' as argument")
}
const stubImportsPlugin = (paths) => {
    return {
        name: "stub-imports",
        setup(build) {
            const regex = new RegExp(`^(${paths.join("|")})\$`)
            build.onResolve({ filter: regex }, (args) => ({
                path: args.path,
                namespace: "stub-imports-namespace",
            }))
            build.onLoad({ filter: /.*/, namespace: "stub-imports-namespace" }, () => ({
                contents: "{}",
                loader: "json",
            }))
        },
    }
}

const DIST_FOLDER = path.resolve(__dirname, "dist")

const envFallback = (envVar, fb = null) => (envVar ? `"${envVar}"` : `${fb}`)

async function build() {
    if (fs.existsSync(DIST_FOLDER)) rimraf.sync(DIST_FOLDER)
    const randomString = Math.random().toString(36).slice(2)
    const outfile = path.resolve(__dirname, `dist/bundle.${randomString}.js`)
    const now = Date.now()
    await esbuild.build({
        entryPoints: [path.resolve(__dirname, "src", "index.tsx")],
        bundle: true,
        minify: true,
        outfile,
        platform: "browser",
        plugins: [sass(), stubImportsPlugin(["path"])],
        loader: { ".png": "file", ".svg": "file" },
        define: {
            "process.env.NODE_ENV": envFallback(process.env.NODE_ENV, `"development"`),
            "process.env.AWS_ASSETS_BUCKET_URL": envFallback(process.env.AWS_ASSETS_BUCKET_URL, null),
            "process.env.GOOGLE_API_KEY": envFallback(process.env.GOOGLE_API_KEY, null),
            "process.env.GOOGLE_CLIENT_ID": envFallback(process.env.GOOGLE_CLIENT_ID, null),
        },
    })

    fs.writeFileSync(
        path.resolve(__dirname, "dist/index.html"),
        fs
            .readFileSync(path.resolve(__dirname, "index.tmpl.html"), "utf8")
            .replace("JAVASCRIPT_BUNDLE", `/bundle.${randomString}.js`)
            .replace("CSS_BUNDLE", `/bundle.${randomString}.css`),
    )
    console.log(`Frontend build done, took ${Date.now() - now} ms`)
}

if (mode === "build") {
    build().catch((e) => !console.error(e) && process.exit(1))
} else {
    build()
        .catch((e) => console.error(e))
        .then(() => {
            chokidar.watch(path.resolve(__dirname, "src"), { ignoreInitial: true }).on("all", (...arg) => {
                build().catch((e) => console.error(e))
            })
        })
}
