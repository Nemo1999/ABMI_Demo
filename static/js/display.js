document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Display App: DOM Content Loaded.");

    const chatLog = document.getElementById('chat-log');
    const qrCodeContainer = document.getElementById('qrcode');

    // 1. Generate a unique session ID
    const sessionId = 'session-' + Date.now() + Math.random().toString(36).substring(2, 8);
    console.log(`Display App: Generated session ID: ${sessionId}`);

    // 2. Create the mobile URL with the session ID
    const mobileUrl = `${window.location.protocol}//${window.location.host}/mobile?session_id=${sessionId}`;
    console.log(`Display App: Constructed mobile URL: ${mobileUrl}`);

    // 3. Generate the QR code
    console.log("Display App: Generating QR code...");
    new QRCode(qrCodeContainer, {
        text: mobileUrl,
        width: 256,
        height: 256,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    qrCodeContainer.title = ''; // Remove the default title from the library
    console.log("Display App: QR code generated.");

    // 4. Establish the WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/${sessionId}`;
    console.log(`Display App: Attempting to connect WebSocket to: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = function(e) {
        console.log("Display App: [WebSocket Open] Connection established.");
        appendMessage({ type: 'system_notification', content: 'Waiting for user to scan QR code...' });
    };

    // 5. Listen for incoming messages
    socket.onmessage = function(event) {
        console.log(`Display App: [WebSocket Message] Data received from server: ${event.data}`);
        const message = JSON.parse(event.data);
        appendMessage(message);
    };

    socket.onclose = function(event) {
        if (event.wasClean) {
            console.log(`Display App: [WebSocket Close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
            console.error('Display App: [WebSocket Close] Connection died.');
        }
        appendMessage({ type: 'system_notification', content: 'Connection closed.' });
    };

    socket.onerror = function(error) {
        console.error(`Display App: [WebSocket Error] ${error.message}`);
        appendMessage({ type: 'system_notification', content: 'An error occurred.' });
    };

    function appendMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${message.type}`);
        
        let content = '';
        if (message.type === 'user_message') {
            content = `<strong>You:</strong> ${message.content}`;
        } else if (message.type === 'animal_response') {
            content = `<strong>${message.animal.charAt(0).toUpperCase() + message.animal.slice(1)}:</strong> ${message.content}`;
        } else {
            content = `<em>${message.content}</em>`;
        }

        messageElement.innerHTML = content;
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll to the latest message
        console.log(`Display App: Appended message to chat log: ${message.type} - ${message.content}`);
    }
});