import { useState, useEffect, useCallback } from "react";
// Import the new API function that uses the bridge
import { getVideoInfo } from "../utils/api"; // Corrected path

export const useYouTubeData = () => {
	const [videoData, setVideoData] = useState(null);
	const [isOnYouTube, setIsOnYouTube] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [currentVideoUrl, setCurrentVideoUrl] = useState(window.location.href);

	const checkYouTubePage = useCallback(() => {
		const isYT =
			window.location.hostname.includes("youtube.com") &&
			window.location.pathname === "/watch";
		setIsOnYouTube(isYT);
		return isYT;
	}, []);

	const fetchVideoData = useCallback(async (videoUrlToFetch) => {
		if (!videoUrlToFetch || !videoUrlToFetch.includes("watch?v=")) {
			console.log("useYouTubeData: Invalid or non-watch URL, skipping fetch:", videoUrlToFetch);
			setVideoData(null); // Clear data if not a valid video page
			return;
		}
		console.log("useYouTubeData: Fetching video data for:", videoUrlToFetch);
		setIsLoading(true);
		try {
			// This now correctly uses the postMessage bridge via api.js
			const data = await getVideoInfo(videoUrlToFetch);
			console.log("useYouTubeData: Received video data:", data);
			setVideoData(data);
		} catch (error) {
			console.error("useYouTubeData: Error fetching video data:", error);
			setVideoData({ title: "Error fetching data", uploader: "Check console", error: error.message });
		} finally {
			setIsLoading(false);
		}
	}, []); // No dependencies needed if getVideoInfo is stable

	// This function is called on initial load and when URL changes significantly
	const extractAndFetch = useCallback(() => {
		if (checkYouTubePage()) {
			console.log("useYouTubeData: YouTube watch page detected. Current URL:", window.location.href);
			fetchVideoData(window.location.href);
		} else {
			console.log("useYouTubeData: Not a YouTube watch page.");
			setVideoData(null);
		}
	}, [checkYouTubePage, fetchVideoData]);

	useEffect(() => {
		// Initial check and fetch
		extractAndFetch();

		// Listen for URL changes (SPA navigation)
		// The MutationObserver in main.jsx handles React app mounting.
		// This observer is for URL changes within the already mounted React app.
		const handleUrlChange = () => {
			if (window.location.href !== currentVideoUrl) {
				console.log("useYouTubeData: URL changed from", currentVideoUrl, "to", window.location.href);
				setCurrentVideoUrl(window.location.href);
				// Delay slightly to ensure YouTube has updated its state/DOM for the new video
				setTimeout(() => {
					extractAndFetch();
				}, 500); // Adjust delay as needed
			}
		};
		
		// More robust way to detect SPA navigation on YouTube
		// Listening to 'yt-navigate-finish' event which YouTube fires after navigation
		const ytNavigateFinishListener = () => {
			console.log("useYouTubeData: yt-navigate-finish event detected.");
			handleUrlChange();
		};
		document.body.addEventListener('yt-navigate-finish', ytNavigateFinishListener);


		// Fallback MutationObserver for URL changes, less ideal than specific events
		const observer = new MutationObserver(handleUrlChange);
		observer.observe(document.body, { childList: true, subtree: true });


		// Listen for messages from content script (e.g., if content script detects video change first)
		const messageListener = (event) => {
			if (event.source === window && event.data.type === "VIDEO_ID_CHANGED_FROM_CONTENT") {
				console.log("useYouTubeData: Received VIDEO_ID_CHANGED_FROM_CONTENT", event.data.payload);
				if (event.data.payload?.videoUrl && event.data.payload.videoUrl !== currentVideoUrl) {
					setCurrentVideoUrl(event.data.payload.videoUrl);
					// Use data from payload for immediate update, then fetch full data
					setVideoData({ 
						title: event.data.payload.title, 
						uploader: event.data.payload.channel, // Assuming channel is uploader
						videoId: event.data.payload.videoId,
						// ... other basic fields from payload
					});
					fetchVideoData(event.data.payload.videoUrl);
				}
			}
		};
		window.addEventListener("message", messageListener);


		return () => {
			document.body.removeEventListener('yt-navigate-finish', ytNavigateFinishListener);
			observer.disconnect();
			window.removeEventListener("message", messageListener);
		};
	}, [extractAndFetch, currentVideoUrl]); // Add currentVideoUrl to re-run effect if it changes programmatically

	return { videoData, isOnYouTube, isLoading, extractVideoData: extractAndFetch };
};
