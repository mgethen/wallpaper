import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getImages: () => Promise<string[]>
      getMonitors: () => Promise<{ id: string, name: string }[]>
      setWallpaper: (imageName: string, monitorId: string) => Promise<boolean>
      getSettings: () => Promise<any>
      saveSettings: (settings: any) => Promise<boolean>
      getImageUrl: (imageName: string) => string
      closeScreensaver: () => void
    }
  }
}
