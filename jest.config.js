const which = process.env.TEST_TARGET || "common"

module.exports = {
    roots: [`<rootDir>/${which}/src`],
    globals: {
        "ts-jest": {
            tsconfig: `<rootDir>/${which}/tsconfig.json`,
        },
    },
    testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/?(*.)+(spec|test).+(ts|tsx|js)"],
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
}
