import { app, shell, BrowserWindow, ipcMain, protocol, powerMonitor, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null
let screensaverWindow: BrowserWindow | null = null

// Settings state
let settings = {
  inactivityPeriod: 5, // minutes
  screensaverCycleFrequency: '10m', // 'never', '10m', '1h', '1d'
  wallpaperCycleFrequency: 'never' // 'never', '10m', '1h', '1d'
}

const settingsPath = join(app.getPath('userData'), 'wallpaper-settings.json')

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      settings = { ...settings, ...JSON.parse(data) }
    }
  } catch (e) {
    console.error('Failed to load settings', e)
  }
}

function saveSettingsToDisk() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings', e)
  }
}

// Wallpaper Timer
let wallpaperTimer: NodeJS.Timeout | null = null

function getImagesDir() {
  return is.dev ? join(app.getAppPath(), 'images') : join(process.resourcesPath, 'images')
}

function getImagesList() {
  const imagesDir = getImagesDir()
  if (!fs.existsSync(imagesDir)) return []
  const files = fs.readdirSync(imagesDir)
  return files.filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'))
}

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

async function setWallpaperCrossPlatform(imagePath: string, monitorId?: string) {
  if (process.platform === 'win32') {
    // Windows: Use IDesktopWallpaper COM interface via PowerShell
    const monitorArg = monitorId === 'all' || !monitorId ? '$null' : `"${monitorId}"`
    
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
[WallpaperSetter]::SetWallpaper(${monitorArg}, "${imagePath}")
`
    const ps1Path = join(app.getPath('temp'), 'set_wallpaper.ps1')
    await fs.promises.writeFile(ps1Path, script, 'utf8')
    try {
      await execFileAsync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', ps1Path])
    } finally {
      await fs.promises.unlink(ps1Path).catch(() => {})
    }
  } else {
    // macOS / Linux: Use the wallpaper package
    const { setWallpaper } = await import('wallpaper')
    const options = monitorId && monitorId !== 'all' ? { screen: parseInt(monitorId) } : undefined
    await setWallpaper(imagePath, options)
  }
}

async function getMonitors() {
  if (process.platform === 'win32') {
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
`
    const ps1Path = join(app.getPath('temp'), 'get_monitors.ps1')
    await fs.promises.writeFile(ps1Path, script, 'utf8')
    try {
      const { stdout } = await execFileAsync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', ps1Path])
      let ids: string[] = []
      try {
        ids = JSON.parse(stdout.trim() || '[]')
        if (!Array.isArray(ids)) ids = [ids]
      } catch (e) {
        if (stdout.trim() !== '') ids = [stdout.trim()]
      }
      return ids.map((id, index) => ({ id, name: `Monitor ${index + 1}` }))
    } catch (e) {
      console.error(e)
      return []
    } finally {
      await fs.promises.unlink(ps1Path).catch(() => {})
    }
  } else {
    // macOS / Linux
    const displays = screen.getAllDisplays()
    return displays.map((_, index) => ({ id: index.toString(), name: `Monitor ${index + 1}` }))
  }
}

async function changeWallpaper() {
  const images = getImagesList()
  if (images.length === 0) return
  const randomImage = images[Math.floor(Math.random() * images.length)]
  const imagePath = join(getImagesDir(), randomImage)
  try {
    await setWallpaperCrossPlatform(imagePath, 'all')
    console.log('Auto-cycled Wallpaper set to', imagePath)
  } catch (e) {
    console.error('Failed to auto-cycle wallpaper', e)
  }
}

function startWallpaperCycle() {
  if (wallpaperTimer) clearInterval(wallpaperTimer)
  
  let ms = 0
  if (settings.wallpaperCycleFrequency === '10m') ms = 10 * 60 * 1000
  if (settings.wallpaperCycleFrequency === '1h') ms = 60 * 60 * 1000
  if (settings.wallpaperCycleFrequency === '1d') ms = 24 * 60 * 60 * 1000
  
  if (ms > 0) {
    wallpaperTimer = setInterval(changeWallpaper, ms)
  }
}

function showScreensaver() {
  if (screensaverWindow || settings.inactivityPeriod === 0) return
  
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  
  screensaverWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })
  
  const url = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}/#/screensaver`
    : `file://${join(__dirname, '../renderer/index.html')}#/screensaver`
    
  screensaverWindow.loadURL(url)
  
  const closeScreensaver = () => {
    if (screensaverWindow) {
      screensaverWindow.close()
      screensaverWindow = null
    }
  }
  
  powerMonitor.on('resume', closeScreensaver)
}

function checkInactivity() {
  if (settings.inactivityPeriod === 0) return
  
  const idleTime = powerMonitor.getSystemIdleTime()
  if (idleTime >= settings.inactivityPeriod * 60 && !screensaverWindow) {
    showScreensaver()
  } else if (idleTime < settings.inactivityPeriod * 60 && screensaverWindow) {
    if (screensaverWindow) {
      screensaverWindow.close()
      screensaverWindow = null
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  
  loadSettings()
  startWallpaperCycle()
  
  setInterval(checkInactivity, 10000)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  
  protocol.registerFileProtocol('local-image', (request, callback) => {
    const url = request.url.replace('local-image://', '')
    try {
      return callback(join(getImagesDir(), decodeURIComponent(url)))
    } catch (error) {
      console.error('Failed to load local image', error)
    }
  })

  ipcMain.handle('get-images', () => getImagesList())
  
  ipcMain.handle('get-monitors', async () => await getMonitors())
  
  ipcMain.handle('set-wallpaper', async (_, { imageName, monitorId }) => {
    const imagePath = join(getImagesDir(), imageName)
    try {
      await setWallpaperCrossPlatform(imagePath, monitorId)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  })
  
  ipcMain.handle('get-settings', () => settings)
  
  ipcMain.handle('save-settings', (_, newSettings) => {
    settings = { ...settings, ...newSettings }
    saveSettingsToDisk()
    startWallpaperCycle()
    return true
  })
  
  ipcMain.on('close-screensaver', () => {
    if (screensaverWindow) {
      screensaverWindow.close()
      screensaverWindow = null
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
