import Electrobun, { BrowserWindow } from "electrobun/bun";

const mainWindow = new BrowserWindow({
    title: "app",
    url: "views://mainview/index.html",
    frame: {
        width: 800,
        height: 600,
    },
});

mainWindow.on("close", () => {
    process.exit(0);
});
