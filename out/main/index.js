//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let electron = require("electron");
let path = require("path");
let _electron_toolkit_utils = require("@electron-toolkit/utils");
let fs = require("fs");
fs = __toESM(fs);
let child_process = require("child_process");
let util = require("util");
//#region src/main/index.ts
var mainWindow = null;
var screensaverWindows = [];
var tray = null;
var isQuitting = false;
var settings = {
	inactivityPeriod: 5,
	screensaverCycleFrequency: "10m",
	wallpaperCycleFrequency: "never"
};
var settingsPath = (0, path.join)(electron.app.getPath("userData"), "wallpaper-settings.json");
function loadSettings() {
	try {
		if (fs.default.existsSync(settingsPath)) {
			const data = fs.default.readFileSync(settingsPath, "utf-8");
			settings = {
				...settings,
				...JSON.parse(data)
			};
		}
	} catch (e) {
		console.error("Failed to load settings", e);
	}
}
function saveSettingsToDisk() {
	try {
		fs.default.writeFileSync(settingsPath, JSON.stringify(settings));
	} catch (e) {
		console.error("Failed to save settings", e);
	}
}
var wallpaperTimer = null;
function getImagesDir() {
	return _electron_toolkit_utils.is.dev ? (0, path.join)(electron.app.getAppPath(), "images") : (0, path.join)(process.resourcesPath, "images");
}
function getImagesList() {
	const imagesDir = getImagesDir();
	if (!fs.default.existsSync(imagesDir)) return [];
	return fs.default.readdirSync(imagesDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".png") || f.endsWith(".jpeg"));
}
var execFileAsync = (0, util.promisify)(child_process.execFile);
async function setWallpaperCrossPlatform(imagePath, monitorId) {
	if (process.platform === "win32") {
		const script = `
$ErrorActionPreference = "Stop";
$code = @"
using System;
using System.Runtime.InteropServices;

[ComImport]
[Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDesktopWallpaper
{
    void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.LPWStr)] string wallpaper);
}

[ComImport]
[Guid("C2CF3110-460E-4fc1-B9D0-8A1C0C9CC4BD")]
public class DesktopWallpaper { }

public class WallpaperSetter {
    public static void SetWallpaper(string monitorId, string path) {
        var wp = (IDesktopWallpaper)new DesktopWallpaper();
        wp.SetWallpaper(monitorId, path);
    }
}
"@
Add-Type -TypeDefinition $code
[WallpaperSetter]::SetWallpaper(${monitorId === "all" || !monitorId ? "$null" : `"${monitorId}"`}, "${imagePath}")
`;
		const ps1Path = (0, path.join)(electron.app.getPath("temp"), "set_wallpaper.ps1");
		await fs.default.promises.writeFile(ps1Path, script, "utf8");
		try {
			await execFileAsync("powershell.exe", [
				"-ExecutionPolicy",
				"Bypass",
				"-WindowStyle",
				"Hidden",
				"-File",
				ps1Path
			]);
		} finally {
			await fs.default.promises.unlink(ps1Path).catch(() => {});
		}
	} else {
		const { setWallpaper } = await import("wallpaper");
		await setWallpaper(imagePath, monitorId && monitorId !== "all" ? { screen: parseInt(monitorId) } : void 0);
	}
}
async function getMonitors() {
	if (process.platform === "win32") {
		const script = `
$ErrorActionPreference = "Stop";
$code = @"
using System;
using System.Runtime.InteropServices;

[ComImport]
[Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDesktopWallpaper
{
    void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.LPWStr)] string wallpaper);
    void GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.LPWStr)] out string wallpaper);
    void GetMonitorDevicePathAt(uint monitorIndex, [MarshalAs(UnmanagedType.LPWStr)] out string monitorID);
    void GetMonitorDevicePathCount(out uint count);
}

[ComImport]
[Guid("C2CF3110-460E-4fc1-B9D0-8A1C0C9CC4BD")]
public class DesktopWallpaper { }

public class MonitorHelper {
    public static string[] GetMonitors() {
        var wp = (IDesktopWallpaper)new DesktopWallpaper();
        uint count;
        wp.GetMonitorDevicePathCount(out count);
        string[] monitors = new string[count];
        for (uint i = 0; i < count; i++) {
            string id;
            wp.GetMonitorDevicePathAt(i, out id);
            monitors[i] = id;
        }
        return monitors;
    }
}
"@
Add-Type -TypeDefinition $code
$monitors = [MonitorHelper]::GetMonitors()
$monitors | ConvertTo-Json -Compress
`;
		const ps1Path = (0, path.join)(electron.app.getPath("temp"), "get_monitors.ps1");
		await fs.default.promises.writeFile(ps1Path, script, "utf8");
		try {
			const { stdout } = await execFileAsync("powershell.exe", [
				"-ExecutionPolicy",
				"Bypass",
				"-WindowStyle",
				"Hidden",
				"-File",
				ps1Path
			]);
			let ids = [];
			try {
				ids = JSON.parse(stdout.trim() || "[]");
				if (!Array.isArray(ids)) ids = [ids];
			} catch (e) {
				if (stdout.trim() !== "") ids = [stdout.trim()];
			}
			return ids.map((id, index) => ({
				id,
				name: `Monitor ${index + 1}`
			}));
		} catch (e) {
			console.error(e);
			return [];
		} finally {
			await fs.default.promises.unlink(ps1Path).catch(() => {});
		}
	} else return electron.screen.getAllDisplays().map((_, index) => ({
		id: index.toString(),
		name: `Monitor ${index + 1}`
	}));
}
async function changeWallpaper() {
	const images = getImagesList();
	if (images.length === 0) return;
	const randomImage = images[Math.floor(Math.random() * images.length)];
	const imagePath = (0, path.join)(getImagesDir(), randomImage);
	try {
		await setWallpaperCrossPlatform(imagePath, "all");
		console.log("Auto-cycled Wallpaper set to", imagePath);
	} catch (e) {
		console.error("Failed to auto-cycle wallpaper", e);
	}
}
function startWallpaperCycle() {
	if (wallpaperTimer) clearInterval(wallpaperTimer);
	let ms = 0;
	if (settings.wallpaperCycleFrequency === "10m") ms = 600 * 1e3;
	if (settings.wallpaperCycleFrequency === "1h") ms = 3600 * 1e3;
	if (settings.wallpaperCycleFrequency === "1d") ms = 1440 * 60 * 1e3;
	if (ms > 0) wallpaperTimer = setInterval(changeWallpaper, ms);
}
function showScreensaver() {
	if (screensaverWindows.length > 0 || settings.inactivityPeriod === 0) return;
	electron.screen.getAllDisplays().forEach((display) => {
		const { bounds } = display;
		const win = new electron.BrowserWindow({
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height,
			frame: false,
			fullscreen: true,
			alwaysOnTop: true,
			skipTaskbar: true,
			webPreferences: {
				preload: (0, path.join)(__dirname, "../preload/index.js"),
				sandbox: false,
				contextIsolation: true
			}
		});
		const url = _electron_toolkit_utils.is.dev && process.env["ELECTRON_RENDERER_URL"] ? `${process.env["ELECTRON_RENDERER_URL"]}/#/screensaver` : `file://${(0, path.join)(__dirname, "../renderer/index.html")}#/screensaver`;
		win.loadURL(url);
		screensaverWindows.push(win);
	});
	const closeScreensaver = () => {
		screensaverWindows.forEach((win) => {
			if (!win.isDestroyed()) win.close();
		});
		screensaverWindows = [];
	};
	electron.powerMonitor.on("resume", closeScreensaver);
}
function checkInactivity() {
	if (settings.inactivityPeriod === 0) return;
	const idleTime = electron.powerMonitor.getSystemIdleTime();
	if (idleTime >= settings.inactivityPeriod * 60 && screensaverWindows.length === 0) showScreensaver();
	else if (idleTime < settings.inactivityPeriod * 60 && screensaverWindows.length > 0) {
		screensaverWindows.forEach((win) => {
			if (!win.isDestroyed()) win.close();
		});
		screensaverWindows = [];
	}
}
function createWindow() {
	mainWindow = new electron.BrowserWindow({
		width: 1e3,
		height: 800,
		show: false,
		autoHideMenuBar: true,
		webPreferences: {
			preload: (0, path.join)(__dirname, "../preload/index.js"),
			sandbox: false,
			contextIsolation: true
		}
	});
	mainWindow.on("ready-to-show", () => {
		mainWindow?.show();
	});
	mainWindow.on("close", (event) => {
		if (!isQuitting) {
			event.preventDefault();
			mainWindow?.hide();
		}
	});
	mainWindow.webContents.setWindowOpenHandler((details) => {
		electron.shell.openExternal(details.url);
		return { action: "deny" };
	});
	if (_electron_toolkit_utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
	else mainWindow.loadFile((0, path.join)(__dirname, "../renderer/index.html"));
}
electron.app.whenReady().then(() => {
	_electron_toolkit_utils.electronApp.setAppUserModelId("com.electron");
	loadSettings();
	startWallpaperCycle();
	setInterval(checkInactivity, 1e4);
	const iconPath = _electron_toolkit_utils.is.dev ? (0, path.join)(__dirname, "../../src/renderer/public/logo.png") : (0, path.join)(__dirname, "../renderer/logo.png");
	tray = new electron.Tray(electron.nativeImage.createFromPath(iconPath).resize({
		width: 16,
		height: 16
	}));
	const contextMenu = electron.Menu.buildFromTemplate([
		{
			label: "Show Control Panel",
			click: () => mainWindow?.show()
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				isQuitting = true;
				electron.app.quit();
			}
		}
	]);
	tray.setToolTip("Technologia.Art Wallpaper Manager");
	tray.setContextMenu(contextMenu);
	tray.on("click", () => {
		mainWindow?.show();
	});
	electron.app.on("browser-window-created", (_, window) => {
		_electron_toolkit_utils.optimizer.watchWindowShortcuts(window);
	});
	electron.protocol.registerFileProtocol("local-image", (request, callback) => {
		const url = request.url.replace("local-image://", "");
		try {
			return callback((0, path.join)(getImagesDir(), decodeURIComponent(url)));
		} catch (error) {
			console.error("Failed to load local image", error);
		}
	});
	electron.ipcMain.handle("get-images", () => getImagesList());
	electron.ipcMain.handle("get-monitors", async () => await getMonitors());
	electron.ipcMain.handle("set-wallpaper", async (_, { imageName, monitorId }) => {
		const imagePath = (0, path.join)(getImagesDir(), imageName);
		try {
			await setWallpaperCrossPlatform(imagePath, monitorId);
			return true;
		} catch (e) {
			console.error(e);
			return false;
		}
	});
	electron.ipcMain.handle("get-settings", () => settings);
	electron.ipcMain.handle("save-settings", (_, newSettings) => {
		settings = {
			...settings,
			...newSettings
		};
		saveSettingsToDisk();
		startWallpaperCycle();
		return true;
	});
	electron.ipcMain.on("close-screensaver", () => {
		screensaverWindows.forEach((win) => {
			if (!win.isDestroyed()) win.close();
		});
		screensaverWindows = [];
	});
	createWindow();
	electron.app.on("activate", function() {
		if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
electron.app.on("window-all-closed", () => {});
//#endregion
