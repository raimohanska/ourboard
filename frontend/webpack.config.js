const webpack = require("webpack")
const path = require("path")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const DotEnvPlugin = require("dotenv-webpack")
const dotenv = require("dotenv")
dotenv.config()
const isProd = (argv) => argv.mode === "production"
const isDev = (argv) => argv.mode === "development"
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || ""
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ""

function* getPlugins(argv) {
    yield new webpack.EnvironmentPlugin({
        AWS_ASSETS_BUCKET_URL: null,
    })
    yield new HtmlWebpackPlugin({
        template: "src/index.html",
    })
    yield new webpack.EnvironmentPlugin(["GOOGLE_API_KEY", "GOOGLE_CLIENT_ID"])

    if (isProd(argv)) {
        yield new MiniCssExtractPlugin({
            filename: "[name].[contenthash].css",
        })
    }
}

module.exports = (env, argv) => ({
    entry: "./src/index.tsx",
    output: {
        filename: "bundle.[contenthash].js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "/",
    },
    devtool: isDev(argv) ? "eval-source-map" : false,
    plugins: [...getPlugins(argv)],
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [isProd(argv) ? MiniCssExtractPlugin.loader : "style-loader", "css-loader", "sass-loader"],
                exclude: /node_modules/,
            },
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: [
                                [
                                    "@babel/preset-env",
                                    {
                                        modules: false,
                                        useBuiltIns: "usage",
                                        corejs: "3.8",
                                    },
                                ],
                            ],
                        },
                    },
                    "ts-loader",
                ],
                exclude: /node_modules/,
            },
            {
                test: /\.(woff2?|ttf|eot|svg|png|jpg|jpeg|gif)$/,
                type: "asset/resource",
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".css", ".scss"],
        fallback: {
            path: false,
        },
    },
})
