import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  getImages: () => ipcRenderer.invoke('get-images'),
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  setWallpaper: (imageName: string, monitorId: string) => ipcRenderer.invoke('set-wallpaper', { imageName, monitorId }),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  getImageUrl: (imageName: string) => `local-image://${imageName}`,
  closeScreensaver: () => ipcRenderer.send('close-screensaver')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => ipcRenderer.on(channel, (_event, ...args) => func(...args)),
        removeListener: (channel: string, func: (...args: any[]) => void) => ipcRenderer.removeListener(channel, func)
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = { ipcRenderer }
  // @ts-ignore (define in dts)
  window.api = api
}
