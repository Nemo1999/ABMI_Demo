document.addEventListener('DOMContentLoaded', (event) => {
    const mobileChatLog = document.getElementById('mobile-chat-log');

    // 1. Parse the session_id from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
        mobileChatLog.innerHTML = '<em>Error: No session ID found. Please scan the QR code again.</em>';
        return;
    }

    // 2. Establish the WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/${sessionId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = function(e) {
        console.log("[open] Connection established");
        appendMessage({ type: 'system_notification', content: 'Connected! Point your camera at an animal.' });
    };

    // 5. Listen for incoming messages
    socket.onmessage = function(event) {
        console.log(`[message] Data received from server: ${event.data}`);
        const message = JSON.parse(event.data);
        // Only show animal responses on mobile to prevent echo
        if (message.type === 'animal_response') {
            appendMessage(message);
        }
    };

    socket.onclose = function(event) {
        console.log(`[close] Connection closed: ${event.reason}`);
        appendMessage({ type: 'system_notification', content: 'Disconnected from server.' });
    };

    socket.onerror = function(error) {
        console.error(`[error] ${error.message}`);
        appendMessage({ type: 'system_notification', content: 'A connection error occurred.' });
    };

    // 3. Add click event listeners to the AR buttons
    // We use a timeout to ensure the scene and buttons are loaded
    setTimeout(() => {
        const buttons = document.querySelectorAll('.interactive-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const animal = button.getAttribute('data-animal');
                const key = button.getAttribute('data-key');
                const text = button.getAttribute('text').value;

                // 4. Send the message to the server
                const message = {
                    type: 'user_message',
                    animal: animal,
                    content: text,
                    content_key: key // Send the key for the backend to look up the response
                };
                socket.send(JSON.stringify(message));
                
                // Show user's own message immediately
                appendMessage(message);
            });
        });
    }, 3000); // Wait for 3 seconds to be safe

    function appendMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message-mobile', `${message.type}`);
        
        let content = '';
        if (message.type === 'user_message') {
            content = `<strong>You:</strong> ${message.content}`;
        } else if (message.type === 'animal_response') {
            content = `<strong>${message.animal.charAt(0).toUpperCase() + message.animal.slice(1)}:</strong> ${message.content}`;
        } else {
            content = `<em>${message.content}</em>`;
        }

        messageElement.innerHTML = content;
        mobileChatLog.appendChild(messageElement);
        mobileChatLog.scrollTop = mobileChatLog.scrollHeight;
    }
});
