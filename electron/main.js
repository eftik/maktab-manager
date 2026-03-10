import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true
  });

  const indexPath = path.join(__dirname, "..", "dist", "index.html");

  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


const { BrowserWindow } = require("electron")

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false
  })

  win.loadFile("dist/index.html")

  win.once("ready-to-show", () => {
    win.show()
  })
}
const { autoUpdater } = require("electron-updater")

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify()
})