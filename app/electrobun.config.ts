export default {
    app: {
        name: "app",
        identifier: "com.example.app",
        version: "0.0.1",
    },
    build: {
        useAsar: false,
        bun: {
            entrypoint: "src/bun/index.ts",
            external: [],
        },
        views: {
            mainview: {
                entrypoint: "src/mainview/index.tsx",
                external: [],
            },
        },
        copy: {
            "src/mainview/index.html": "views/mainview/index.html",
            "src/mainview/index.browser.html": "browser/index.html",
        },
        linux: {
            bundleCEF: true,
        },
    },
};
