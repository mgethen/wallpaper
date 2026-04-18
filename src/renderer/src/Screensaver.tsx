import React, { useEffect, useState } from 'react'

const Screensaver: React.FC = () => {
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    loadData()
    
    // Add global keydown and mouse move listeners to close the screensaver
    const handleActivity = () => {
      window.api.closeScreensaver()
    }
    
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('mousedown', handleActivity)
    
    return () => {
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
    }
  }, [])

  const loadData = async () => {
    const fetchedImages = await window.api.getImages()
    if (fetchedImages.length > 0) {
      setImages(fetchedImages)
      setCurrentIndex(Math.floor(Math.random() * fetchedImages.length))
    }
    const fetchedSettings = await window.api.getSettings()
    setSettings(fetchedSettings)
  }

  useEffect(() => {
    if (images.length <= 1 || !settings || settings.screensaverCycleFrequency === 'never') return

    let ms = 10000 // default 10s fallback
    if (settings.screensaverCycleFrequency === '10m') ms = 10 * 60 * 1000
    if (settings.screensaverCycleFrequency === '1h') ms = 60 * 60 * 1000
    if (settings.screensaverCycleFrequency === '1d') ms = 24 * 60 * 60 * 1000

    const cycleInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, ms)

    return () => clearInterval(cycleInterval)
  }, [images, settings])

  if (images.length === 0) {
    return <div className="screensaver-empty">No images found for screensaver.</div>
  }

  return (
    <div className="screensaver-container">
      <div 
        className="screensaver-image" 
        style={{ backgroundImage: `url(${window.api.getImageUrl(images[currentIndex])})` }}
      />
    </div>
  )
}

export default Screensaver
