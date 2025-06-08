import { useState, useEffect, useCallback } from 'react'

export const useYouTubeData = () => {
  const [videoData, setVideoData] = useState(null)
  const [isOnYouTube, setIsOnYouTube] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if we're on YouTube
  const checkYouTubePage = useCallback(() => {
    const isYT = window.location.hostname.includes('youtube.com') && 
                 window.location.pathname === '/watch'
    setIsOnYouTube(isYT)
    return isYT
  }, [])

  // Extract video ID from URL
  const extractVideoId = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('v')
  }, [])

  // Extract video metadata from the page
  const extractVideoMetadata = useCallback(() => {
    try {
      // Try to get video title
      const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, h1.title, #title h1')
      const title = titleElement?.textContent?.trim() || 'Unknown Title'

      // Try to get channel name
      const channelElement = document.querySelector(
        '#channel-name a, .ytd-channel-name a, .ytd-video-owner-renderer a'
      )
      const uploader = channelElement?.textContent?.trim() || 'Unknown Channel'

      // Try to get view count
      const viewElement = document.querySelector(
        '.view-count, #info-strings yt-formatted-string, .ytd-video-view-count-renderer'
      )
      const viewText = viewElement?.textContent?.trim() || '0'
      const view_count = parseInt(viewText.replace(/[^\d]/g, '')) || 0

      // Try to get duration from the player
      const durationElement = document.querySelector(
        '.ytp-time-duration, .ytd-thumbnail-overlay-time-status-renderer'
      )
      let duration = 0
      if (durationElement) {
        const timeText = durationElement.textContent?.trim()
        if (timeText) {
          const parts = timeText.split(':').map(Number)
          if (parts.length === 2) {
            duration = parts[0] * 60 + parts[1]
          } else if (parts.length === 3) {
            duration = parts[0] * 3600 + parts[1] * 60 + parts[2]
          }
        }
      }

      return {
        title,
        uploader,
        view_count,
        duration,
        url: window.location.href,
        videoId: extractVideoId()
      }
    } catch (error) {
      console.error('Error extracting video metadata:', error)
      return {
        title: 'Unknown Title',
        uploader: 'Unknown Channel',
        view_count: 0,
        duration: 0,
        url: window.location.href,
        videoId: extractVideoId()
      }
    }
  }, [extractVideoId])

  // Fetch full video data from backend
  const fetchVideoData = useCallback(async (videoUrl) => {
    if (!videoUrl) return null

    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/video-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_url: videoUrl })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching video data:', error)
      // Return basic metadata if backend fails
      return extractVideoMetadata()
    } finally {
      setIsLoading(false)
    }
  }, [extractVideoMetadata])

  // Main function to extract video data
  const extractVideoData = useCallback(async () => {
    if (!checkYouTubePage()) {
      setVideoData(null)
      return
    }

    // First, set basic metadata immediately
    const basicData = extractVideoMetadata()
    setVideoData(basicData)

    // Then try to get full data from backend
    if (basicData.url) {
      const fullData = await fetchVideoData(basicData.url)
      if (fullData) {
        setVideoData(fullData)
      }
    }
  }, [checkYouTubePage, extractVideoMetadata, fetchVideoData])

  // Listen for URL changes (YouTube is a SPA)
  useEffect(() => {
    let currentUrl = window.location.href
    
    const checkForUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href
        setTimeout(extractVideoData, 1000) // Delay to let YouTube load
      }
    }

    // Use MutationObserver to detect navigation changes
    const observer = new MutationObserver(checkForUrlChange)
    observer.observe(document.body, { childList: true, subtree: true })

    // Initial check
    extractVideoData()

    // Also listen for popstate events
    window.addEventListener('popstate', extractVideoData)

    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', extractVideoData)
    }
  }, [extractVideoData])

  // Listen for page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && checkYouTubePage()) {
        // Re-extract data when page becomes visible
        setTimeout(extractVideoData, 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [extractVideoData, checkYouTubePage])

  return {
    videoData,
    isOnYouTube,
    isLoading,
    extractVideoData
  }
}
