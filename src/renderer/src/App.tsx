import React, { useEffect, useState } from 'react'

const App: React.FC = () => {
  const [images, setImages] = useState<string[]>([])
  const [monitors, setMonitors] = useState<{ id: string, name: string }[]>([])
  const [selectedMonitor, setSelectedMonitor] = useState<string>('all')
  const [settings, setSettings] = useState({
    inactivityPeriod: 5,
    screensaverCycleFrequency: '10m',
    wallpaperCycleFrequency: 'never'
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    const fetchedImages = await window.api.getImages()
    setImages(fetchedImages)
    
    const fetchedMonitors = await window.api.getMonitors()
    setMonitors(fetchedMonitors)
    
    const fetchedSettings = await window.api.getSettings()
    setSettings(fetchedSettings)
  }

  const setWallpaper = async (imageName: string) => {
    const success = await window.api.setWallpaper(imageName, selectedMonitor)
    if (success) {
      alert('Wallpaper updated successfully!')
    } else {
      alert('Failed to set wallpaper')
    }
  }

  const saveSettings = async (newSettings: any) => {
    setSettings(newSettings)
    await window.api.saveSettings(newSettings)
  }

  return (
    <div className="container">
      <header className="header">
        <img src="./logo.png" alt="Technologia.Art Logo" className="header-logo" />
        <div className="header-text">
          <h1>Technologia.Art Wallpaper Manager</h1>
          <p>Manage your desktop aesthetics with ease.</p>
        </div>
      </header>

      <div className="main-content">
        <aside className="settings-panel">
          
          <div className="settings-section">
            <h2 className="section-title">Screensaver</h2>
            
            <div className="setting-group">
              <label>Inactivity Period</label>
              <select 
                value={settings.inactivityPeriod} 
                onChange={(e) => saveSettings({ ...settings, inactivityPeriod: Number(e.target.value) })}
              >
                <option value={0}>Never</option>
                <option value={1}>1 Minute</option>
                <option value={3}>3 Minutes</option>
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Auto-Cycle Frequency</label>
              <select 
                value={settings.screensaverCycleFrequency} 
                onChange={(e) => saveSettings({ ...settings, screensaverCycleFrequency: e.target.value })}
              >
                <option value="never">Never change</option>
                <option value="10m">Every 10 minutes</option>
                <option value="1h">Each hour</option>
                <option value="1d">Each day</option>
              </select>
            </div>
          </div>

          <div className="settings-separator"></div>

          <div className="settings-section">
            <h2 className="section-title">Wallpaper</h2>
            
            <div className="setting-group">
              <label>Auto-Cycle Frequency</label>
              <select 
                value={settings.wallpaperCycleFrequency} 
                onChange={(e) => saveSettings({ ...settings, wallpaperCycleFrequency: e.target.value })}
              >
                <option value="never">Never change</option>
                <option value="10m">Every 10 minutes</option>
                <option value="1h">Each hour</option>
                <option value="1d">Each day</option>
              </select>
            </div>
            
            <div className="setting-group">
              <label>Target Screen</label>
              <select 
                value={selectedMonitor} 
                onChange={(e) => setSelectedMonitor(e.target.value)}
              >
                <option value="all">All Monitors</option>
                {monitors.map(monitor => (
                  <option key={monitor.id} value={monitor.id}>{monitor.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ flexGrow: 1 }}></div>

          <div className="settings-footer">
            <p>All Images belong to NASA and are provided for informational and educational purposes only.</p>
            <p>App design and code &copy; Technologia.Art</p>
          </div>

        </aside>

        <section className="gallery-section">
          <h2>Gallery ({images.length} images)</h2>
          <div className="gallery-grid">
            {images.map((img) => (
              <div key={img} className="gallery-item">
                <div 
                  className="image-preview" 
                  style={{ backgroundImage: `url(${window.api.getImageUrl(img)})` }}
                />
                <button className="btn-set" onClick={() => setWallpaper(img)}>Set Wallpaper</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
