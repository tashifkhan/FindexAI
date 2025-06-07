console.log('YouTube Q&A Extension loaded on:', window.location.href);

// extracts video id from url
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

// tittle video
function getVideoTitle() {
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer');
    return titleElement ? titleElement.textContent.trim() : null;
}

// channel name extraction
function getChannelName() {
    const channelElement = document.querySelector('#channel-name a');
    return channelElement ? channelElement.textContent.trim() : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getVideoInfo') {
        sendResponse({
            videoId: getVideoId(),
            title: getVideoTitle(),
            channel: getChannelName(),
            url: window.location.href
        });
    }
});

let currentVideoId = getVideoId();
const observer = new MutationObserver(() => {
    const newVideoId = getVideoId();
    if (newVideoId && newVideoId !== currentVideoId) {
        currentVideoId = newVideoId;
        console.log('Video changed to:', newVideoId);
    }
});

observer.observe(document.body, { 
    childList: true, 
    subtree: true 
});
