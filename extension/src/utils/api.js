const API_BASE_URL = 'http://localhost:5000/api'

export const askQuestion = async (videoUrl, question) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        question: question
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.answer || 'No answer received'
  } catch (error) {
    console.error('Error asking question:', error)
    throw new Error('Failed to get answer. Please check if the backend server is running.')
  }
}

export const getVideoInfo = async (videoUrl) => {
  try {
    const response = await fetch(`${API_BASE_URL}/video-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting video info:', error)
    throw new Error('Failed to get video information.')
  }
}

export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.ok
  } catch (error) {
    console.error('Backend health check failed:', error)
    return false
  }
}
