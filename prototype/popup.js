document.addEventListener('DOMContentLoaded', async () => {
    const questionInput = document.getElementById('question-input');
    const submitButton = document.getElementById('submit');
    const answerDiv = document.getElementById('answer');
    const loadingDiv = document.getElementById('loading');
    const videoInfoDiv = document.getElementById('video-info');
    const currentUrlSpan = document.getElementById('current-url');
    const mainContent = document.getElementById('main-content');
    const notYouTube = document.getElementById('not-youtube');

    let currentTab;
    try {
        [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (error) {
        console.error('Error getting current tab:', error);
        showError('Error accessing current tab');
        return;
    }

    // yt check
    if (!currentTab.url || !currentTab.url.includes('youtube.com/watch')) {
        mainContent.style.display = 'none';
        notYouTube.style.display = 'block';
        return;
    }

    // url showing on the extension
    currentUrlSpan.textContent = currentTab.url;
    videoInfoDiv.style.display = 'block';

    // added listner dor question
    submitButton.addEventListener('click', async () => {
        const question = questionInput.value.trim();
        
        if (!question) {
            showError('Please enter a question');
            return;
        }

        await askQuestion(currentTab.url, question);
    });

    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitButton.click();
        }
    });

    async function askQuestion(url, question) {
        try {
            // loader
            setLoading(true);
            answerDiv.textContent = '';

            console.log('Sending question:', question, 'for URL:', url);

            // backend request
            const response = await fetch('http://localhost:5454/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    url: url, 
                    question: question 
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.error) {
                showError(result.error);
            } else {
                showSuccess(result.answer);
            }

        } catch (error) {
            console.error('Error asking question:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                showError('Backend server is not running. Please start the Flask server on port 5001.');
            } else {
                showError(`Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        loadingDiv.style.display = isLoading ? 'block' : 'none';
        
        if (isLoading) {
            submitButton.textContent = 'Processing...';
        } else {
            submitButton.textContent = 'Ask Question';
        }
    }

    function showError(message) {
        answerDiv.textContent = message;
        answerDiv.className = 'error';
    }

    function showSuccess(message) {
        answerDiv.textContent = message;
        answerDiv.className = 'success';
    }
});
