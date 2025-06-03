// llm-quick-input/renderer.js
const inputBox = document.getElementById('input-box');
const sendButton = document.getElementById('send-button');
const responseArea = document.getElementById('llm-response');
const statusMessage = document.getElementById('status-message');

inputBox.focus(); // Ensure input box is focused on launch

async function handleSend() {
    const text = inputBox.value.trim();
    if (!text) {
        statusMessage.textContent = "Please enter some text.";
        statusMessage.className = 'error';
        return;
    }

    statusMessage.textContent = "Sending to LLM...";
    statusMessage.className = 'info';
    responseArea.textContent = ''; // Clear previous response
    inputBox.disabled = true;
    sendButton.disabled = true;

    try {
        const result = await window.electronAPI.sendToLLM(text);
        if (result.error) {
            responseArea.textContent = `Error: ${result.error}`;
            responseArea.className = 'error-response';
            statusMessage.textContent = "Error occurred.";
            statusMessage.className = 'error';
        } else {
            responseArea.textContent = result.response;
            responseArea.className = 'success-response';
            statusMessage.textContent = "Response received.";
            statusMessage.className = 'info';
            // inputBox.value = ""; // Clear input after sending
        }
    } catch (error) {
        console.error("Renderer error:", error);
        responseArea.textContent = `An unexpected error occurred: ${error.message}`;
        responseArea.className = 'error-response';
        statusMessage.textContent = "Critical error.";
        statusMessage.className = 'error';
    } finally {
        inputBox.disabled = false;
        sendButton.disabled = false;
        // inputBox.focus(); // Re-focus after response, or not, depending on preference
    }
}

sendButton.addEventListener('click', handleSend);

inputBox.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) { // Ctrl+Enter to send
        event.preventDefault(); // Prevent newline in textarea
        handleSend();
    }
    if (event.key === 'Escape') { // Escape to close
        window.electronAPI.closeApp();
    }
});

