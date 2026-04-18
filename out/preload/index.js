let electron = require("electron");
//#region src/preload/index.ts
var api = {
	getImages: () => electron.ipcRenderer.invoke("get-images"),
	getMonitors: () => electron.ipcRenderer.invoke("get-monitors"),
	setWallpaper: (imageName, monitorId) => electron.ipcRenderer.invoke("set-wallpaper", {
		imageName,
		monitorId
	}),
	getSettings: () => electron.ipcRenderer.invoke("get-settings"),
	saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
	getImageUrl: (imageName) => `local-image://${imageName}`,
	closeScreensaver: () => electron.ipcRenderer.send("close-screensaver")
};
if (process.contextIsolated) try {
	electron.contextBridge.exposeInMainWorld("electron", { ipcRenderer: {
		on: (channel, func) => electron.ipcRenderer.on(channel, (_event, ...args) => func(...args)),
		removeListener: (channel, func) => electron.ipcRenderer.removeListener(channel, func)
	} });
	electron.contextBridge.exposeInMainWorld("api", api);
} catch (error) {
	console.error(error);
}
else {
	window.electron = { ipcRenderer: electron.ipcRenderer };
	window.api = api;
}
//#endregion
