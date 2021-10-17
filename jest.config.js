const roots = (process.env.TEST_TARGET || "common,frontend,backend")
    .split(",")
    .map((target) => `<rootDir>/${target}/src`)
module.exports = {
    roots,
    globals: {
        "ts-jest": {
            tsconfig: `<rootDir>/tsconfig.json`,
        },
    },
    testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
}
