# Wallpaper & Screensaver Manager

A cross-platform desktop application built with Electron, React, and TypeScript that manages your wallpaper and provides a high-quality screensaver.

## Features
- **Gallery View:** Browse your local high-resolution images.
- **Set as Wallpaper:** Easily set any image as your desktop background.
- **Screensaver Mode:** A full-screen mode that cycles through your images after a configurable period of inactivity.
- **Auto-Cycle Wallpaper:** Automatically change your desktop background on a set interval.

## Prerequisites
- Node.js (v18+)
- npm or yarn

## Installation and Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Building the App

To build the executable for your operating system:

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

## Security and Permissions (Important)

Because this app modifies your desktop background and monitors system idle time, your operating system may prompt you for permissions.

### macOS
1. **Unknown Developer Warning:** Since the application is not signed with an Apple Developer certificate, macOS Gatekeeper may block it from running. 
   - To open it, go to your `Applications` folder, right-click (or Control-click) the app, and select **Open**. 
   - You can then confirm you want to open it.
2. **Wallpaper Permissions:** The app uses AppleScript to change the desktop wallpaper. The first time you attempt to set a wallpaper or when the auto-cycle triggers, macOS will prompt: `Wallpaper Manager wants access to control "System Events"`. You **must** click **OK** for the wallpaper features to work.

### Windows
1. **SmartScreen Warning:** Windows Defender SmartScreen might prevent an unrecognized app from starting. 
   - If you see a "Windows protected your PC" blue prompt, click **More info** and then click **Run anyway**.
2. **Antivirus:** Depending on your antivirus software, scripts that change the wallpaper might be flagged as suspicious. You may need to add an exclusion for the application if it gets blocked.

## Adding Images
Place your high-resolution `.jpg` or `.png` images inside the `images/` folder located in the root of this project. The application will automatically detect and load them.
