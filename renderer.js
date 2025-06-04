// This is the renderer process script

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    
    console.log('Renderer script loaded');
    console.log('electronAPI available:', !!window.electronAPI);
    
    if (!window.electronAPI) {
        console.error('electronAPI not available! Preload script may have failed.');
        return;
    }
    
    const inputBox = document.getElementById('input-box');
    const sendButton = document.getElementById('send-button');
    const statusMessage = document.getElementById('status-message');
    const responseContent = document.getElementById('response-area-content');
    const settingsButton = document.getElementById('settings-button');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Settings button handler
    if (settingsButton) {
        settingsButton.addEventListener('click', async () => {
            window.electronAPI.openSettings();
        });
    }

    // Dark mode toggle handler
    if (darkModeToggle) {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        updateToggleIcon(savedTheme);

        darkModeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateToggleIcon(newTheme);
        });
    }

    // Function to update toggle icon based on theme
    function updateToggleIcon(theme) {
        if (darkModeToggle) {
            darkModeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
            darkModeToggle.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    }

    sendButton.addEventListener('click', async () => {
        const inputText = inputBox.value;
        if (inputText.trim() === '') {
            statusMessage.textContent = 'Please enter a message.';
            return;
        }
        statusMessage.textContent = 'Sending...';
        responseContent.textContent = ''; // Clear previous response

        try {
            const result = await window.electronAPI.sendToLLM(inputText);
            if (result.error) {
                statusMessage.textContent = 'Error:';
                responseContent.textContent = result.error;
                responseContent.style.color = '#ff6b6b';
            } else {
                statusMessage.textContent = 'Response received:';
                // Render markdown/LaTeX instead of plain text (now async)
                const renderedContent = await window.electronAPI.renderMarkdown(result.response);
                responseContent.innerHTML = renderedContent;
                responseContent.style.color = '';
            }
            inputBox.value = ''; // Clear input after successful send
        } catch (error) {
            statusMessage.textContent = 'Error:';
            responseContent.textContent = `Failed to send message: ${error.message}`;
            responseContent.style.color = '#ff6b6b';
        }
    });

    // Add keyboard shortcuts
    inputBox.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault(); // Prevent default behavior
            sendButton.click();
        } else if (event.key === 'Escape') {
            window.electronAPI.closeApp();
        }
    });

    // Load current settings and display provider info
    window.electronAPI.getSettings().then(settings => {
        console.log('Current settings loaded:', settings);
        // You could display current provider info in the UI if desired
    }).catch(err => {
        console.error('Settings loading failed:', err);
        // Settings loading failed, will use defaults
    });
});