document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Display App: DOM Content Loaded.");

    const chatLog = document.getElementById('chat-log');
    const bird = document.getElementById('bird');

    // 1. Bird Animation
    let isBird1 = true;
    setInterval(() => {
        isBird1 = !isBird1;
        bird.src = isBird1 ? '/static/assets/Bird1.PNG' : '/static/assets/Bird2.PNG';
    }, 500); // Flip image every 500ms

    // 2. Establish WebSocket connection
    function connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
        console.log(`Display App: Attempting to connect WebSocket to: ${wsUrl}`);
        const socket = new WebSocket(wsUrl);

        socket.onopen = function(e) {
            console.log("Display App: [WebSocket Open] Connection established.");
            appendMessage({ type: 'system', content: 'Listening for messages...' });
        };

        // 3. Listen for incoming messages
        socket.onmessage = function(event) {
            console.log(`Display App: [WebSocket Message] Data received: ${event.data}`);
            const serverMessage = JSON.parse(event.data);

            if (serverMessage.type === 'history') {
                chatLog.innerHTML = ''; // Clear the log
                appendMessage({ type: 'system', content: 'Chat history loaded.' });
                serverMessage.data.forEach(msg => appendMessage(msg));
            } else if (serverMessage.type === 'new_message') {
                appendMessage(serverMessage);
            }
        };

        socket.onclose = function(event) {
            console.error('Display App: [WebSocket Close] Connection died. Reconnecting...');
            appendMessage({ type: 'system', content: 'Connection closed. Reconnecting in 3s...' });
            setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = function(error) {
            console.error(`Display App: [WebSocket Error] ${error.message}`);
            appendMessage({ type: 'system', content: 'An error occurred with the connection.' });
        };
    }
    // 4. Create the mobile URL and show QR code
    const mobileUrl = `${window.location.protocol}//${window.location.host}/mobile`;
    console.log(`Display App: Constructed mobile URL: ${mobileUrl}`);
    console.log("Display App: Generating QR code...");
    qrCodeContainer = document.getElementById("qrcode")
    new QRCode(qrCodeContainer, {
        text: mobileUrl,
        width: 256,
        height: 256,
        colorDark : "#000000",
        colorLight : "#ffffff00",
        correctLevel : QRCode.CorrectLevel.H
    });
    qrCodeContainer.title = '手機掃描 QR Code 進入藍鵲的夢境交流'; // Remove the default title from the library
    console.log("Display App: QR code generated.");


    // 5. Render messages as speech bubbles
    function appendMessage(msg) {
        const messageElement = document.createElement('div');
        
        if (msg.type === 'system') {
            messageElement.classList.add('chat-message', 'system_notification');
            messageElement.innerHTML = `<em>${msg.content}</em>`;
        } else {
            // It's a user message
            messageElement.classList.add('chat-bubble');
            
            const username = msg.username || 'Unknown';
            const content = msg.message || msg.content || '';

            if(username === "藍鵲"){
                messageElement.classList.add('bird-message');
            }
            else{
                messageElement.classList.add('user-message')
            }

            messageElement.innerHTML = `
                <div class="username">${username}</div>
                <div class="content">${content}</div>
            `;
        }

        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll
        console.log(`Display App: Appended message to chat log.`);
    }

    // Initial connection
    connectWebSocket();
});
