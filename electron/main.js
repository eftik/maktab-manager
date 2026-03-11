import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import updater from "electron-updater";

const { autoUpdater } = updater;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    show: false
  });

  const indexPath = path.join(__dirname, "..", "dist", "index.html");

  win.loadFile(indexPath);

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.on("did-finish-load", () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
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