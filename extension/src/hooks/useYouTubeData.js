import { useState, useEffect, useCallback } from 'react'

// Import the message passing utility from your api.js file
// We need to create this function in api.js first.
const sendMessageToBackground = (type, payload) => {
	return new Promise((resolve, reject) => {
		if (!chrome.runtime?.id) {
			// We are not in an extension environment.
			// This is useful for local dev without the extension loaded.
			console.warn(
				'Not in extension context. API calls will be mocked or fail.'
			)
			// Reject or return mock data
			return reject(new Error('Not an extension context.'))
		}
		chrome.runtime.sendMessage({ type, payload }, (response) => {
			if (chrome.runtime.lastError) {
				return reject(chrome.runtime.lastError)
			}
			if (response?.error) {
				return reject(new Error(response.error))
			}
			resolve(response)
		})
	})
}

export const useYouTubeData = () => {
	const [videoData, setVideoData] = useState(null)
	const [isOnYouTube, setIsOnYouTube] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [currentVideoId, setCurrentVideoId] = useState(null)

	// Check if we're on YouTube
	const checkYouTubePage = useCallback(() => {
		const isYT =
			window.location.hostname.includes('youtube.com') &&
			window.location.pathname === '/watch'
		setIsOnYouTube(isYT)
		return isYT
	}, [])

	const extractVideoIdFromUrl = useCallback((url) => {
		try {
			const urlParams = new URLSearchParams(new URL(url).search)
			return urlParams.get('v')
		} catch (e) {
			console.error('Invalid URL for ID extraction:', url, e)
			return null
		}
	}, [])

	const fetchVideoDataFromContentScript = useCallback(async () => {
		console.log('Requesting video info from content script...')
		return new Promise((resolve, reject) => {
			if (!chrome.runtime?.id) {
				return reject(new Error('Not an extension context.'))
			}
			chrome.runtime.sendMessage(
				{ action: 'getContentVideoInfo' },
				(response) => {
					if (chrome.runtime.lastError) {
						console.error(
							'Error fetching from content script:',
							chrome.runtime.lastError.message
						)
						return reject(chrome.runtime.lastError)
					}
					if (response && response.videoId) {
						console.log('Received from content script:', response)
						resolve(response)
					} else {
						console.warn(
							'No valid response from content script for getContentVideoInfo'
						)
						// Fallback to backend if content script fails or doesn't provide ID
						// This part can be enhanced based on how much you trust the content script vs backend
						const videoUrl = window.location.href
						const videoId = extractVideoIdFromUrl(videoUrl)
						if (videoId) {
							sendMessageToBackground('GET_VIDEO_INFO', { videoUrl })
								.then(resolve)
								.catch(reject)
						} else {
							reject(
								new Error(
									'Could not get videoId from URL for backend fallback'
								)
							)
						}
					}
				}
			)
		})
	}, [extractVideoIdFromUrl])

	const fetchVideoDataFromBackend = useCallback(
		async (videoUrl) => {
			if (!videoUrl) return null
			console.log('Fetching video data from backend for URL:', videoUrl)
			setIsLoading(true)
			try {
				const data = await sendMessageToBackground('GET_VIDEO_INFO', {
					videoUrl,
				})
				return data
			} catch (error) {
				console.error('Error fetching video data via background script:', error)
				return {
					title: 'Error fetching data',
					uploader: 'Please check backend',
					view_count: 0,
					duration: 0,
					url: videoUrl,
					videoId: extractVideoIdFromUrl(videoUrl),
				}
			} finally {
				setIsLoading(false)
			}
		},
		[extractVideoIdFromUrl]
	)

	const updateVideoData = useCallback(async () => {
		if (!checkYouTubePage()) {
			setVideoData(null)
			setCurrentVideoId(null)
			return
		}

		try {
			setIsLoading(true)
			const contentScriptData = await fetchVideoDataFromContentScript()
			if (contentScriptData && contentScriptData.videoId) {
				console.log('Using data from content script:', contentScriptData)
				// Optionally, enrich with backend data if needed, or use content script data directly
				// For now, let's assume content script data is sufficient for the initial display
				// and backend can be called for more details if required by other components.
				const backendData = await fetchVideoDataFromBackend(contentScriptData.url)
				setVideoData({ ...contentScriptData, ...backendData }) // Merge data, backend might have more details
				setCurrentVideoId(contentScriptData.videoId)
			} else {
				// Fallback to direct URL check and backend fetch if content script fails
				console.warn(
					'Content script did not return videoId, falling back to URL check and backend.'
				)
				const videoUrl = window.location.href
				const videoId = extractVideoIdFromUrl(videoUrl)
				if (videoId) {
					const backendData = await fetchVideoDataFromBackend(videoUrl)
					setVideoData(backendData)
					setCurrentVideoId(videoId)
				} else {
					setVideoData(null) // No valid video ID found
					setCurrentVideoId(null)
				}
			}
		} catch (error) {
			console.error('Error in updateVideoData:', error)
			setVideoData({
				title: 'Error loading video data',
				uploader: 'N/A',
				videoId: currentVideoId || 'Error',
			})
		} finally {
			setIsLoading(false)
		}
	}, [
		checkYouTubePage,
		fetchVideoDataFromContentScript,
		fetchVideoDataFromBackend,
		extractVideoIdFromUrl,
		currentVideoId,
	])

	useEffect(() => {
		updateVideoData() // Initial load

		const messageListener = (request, sender, sendResponse) => {
			if (request.type === 'VIDEO_ID_CHANGED') {
				console.log('Hook received VIDEO_ID_CHANGED message:', request.payload)
				// Ensure data is an object and has videoId
				if (
					typeof request.payload === 'object' &&
					request.payload !== null &&
					request.payload.videoId
				) {
					// Update videoData with the payload from content script, then fetch more from backend
					setIsLoading(true)
					fetchVideoDataFromBackend(request.payload.videoUrl)
						.then((backendData) => {
							setVideoData({
								title: request.payload.title,
								channel: request.payload.channel,
								videoId: request.payload.videoId,
								url: request.payload.videoUrl,
								...backendData, // merge with more detailed backend data
							})
							setCurrentVideoId(request.payload.videoId)
							setIsLoading(false)
						})
						.catch((error) => {
							console.error(
								'Error fetching backend data after VIDEO_ID_CHANGED:',
								error
							)
							// Set basic info from content script even if backend fails
							setVideoData({
								title: request.payload.title || 'Error after navigation',
								channel: request.payload.channel || 'N/A',
								videoId: request.payload.videoId,
								url: request.payload.videoUrl,
							})
							setCurrentVideoId(request.payload.videoId)
							setIsLoading(false)
						})
				} else {
					console.warn(
						'Received VIDEO_ID_CHANGED but payload is invalid:',
						request.payload
					)
					// Fallback to a full refresh if payload is not as expected
					updateVideoData()
				}
			}
		}

		chrome.runtime?.onMessage.addListener(messageListener)

		return () => {
			chrome.runtime?.onMessage.removeListener(messageListener)
		}
	}, [updateVideoData, fetchVideoDataFromBackend]) // updateVideoData is stable due to useCallback

	return {
		videoData,
		isOnYouTube,
		isLoading,
		extractVideoData: updateVideoData, // Expose the main function
	}
}
