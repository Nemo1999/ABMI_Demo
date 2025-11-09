document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Mobile App: DOM Content Loaded.");

    // UI Elements
    const usernamePrompt = document.getElementById('username-prompt');
    const messagingUi = document.getElementById('messaging-ui');
    const joinChatBtn = document.getElementById('join-chat-btn');
    const usernameInput = document.getElementById('username-input');
    const mobileChatLog = document.getElementById('mobile-chat-log');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    let username = '';
    let socket = null;

    // 1. Handle Username Input
    joinChatBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (name) {
            username = name;
            console.log(`Mobile App: User set name to: ${username}`);
            usernamePrompt.style.display = 'none';
            messagingUi.style.display = 'flex';
            messageInput.focus();
            connectWebSocket();
        } else {
            alert('Please enter a name.');
        }
    });

    usernameInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            joinChatBtn.click();
        }
    });

    // 2. Handle Sending Messages
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText) return;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.warn("Mobile App: WebSocket not open, cannot send message.");
            appendMessage({ type: 'system', content: 'Connection lost. Please wait...' });
            return;
        }

        const message = {
            username: username,
            message: messageText
        };

        console.log(`Mobile App: Sending message: ${JSON.stringify(message)}`);
        socket.send(JSON.stringify(message));
        messageInput.value = ''; // Clear input field
    }

    // 3. Establish WebSocket Connection
    function connectWebSocket() {
        console.log("Mobile App: Attempting to connect WebSocket...");
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
        socket = new WebSocket(wsUrl);

        socket.onopen = function(e) {
            console.log("Mobile App: [WebSocket Open] Connection established.");
            appendMessage({ type: 'system', content: 'Connected to the chat!' });
        };

        socket.onmessage = function(event) {
            console.log(`Mobile App: [WebSocket Message] Data received: ${event.data}`);
            const serverMessage = JSON.parse(event.data);

            if (serverMessage.type === 'history') {
                mobileChatLog.innerHTML = ''; // Clear the log
                appendMessage({ type: 'system', content: 'Chat history loaded.' });
                serverMessage.data.forEach(msg => appendMessage(msg, true));
            } else if (serverMessage.type === 'new_message') {
                appendMessage(serverMessage, false);
            }
        };

        socket.onclose = function(event) {
            console.warn(`Mobile App: [WebSocket Close] Connection closed. Code: ${event.code}`);
            appendMessage({ type: 'system', content: 'Disconnected. Attempting to reconnect...' });
            setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
        };

        socket.onerror = function(error) {
            console.error(`Mobile App: [WebSocket Error] ${error.message}`);
            appendMessage({ type: 'system', content: 'A connection error occurred.' });
        };
    }

    // 4. Append messages to the chat log
    function appendMessage(msg, isHistory = false) {
        const messageElement = document.createElement('div');
        
        // Determine message type for styling
        if (msg.type === 'system') {
            messageElement.classList.add('chat-message-mobile', 'system_notification');
            messageElement.innerHTML = `<em>${msg.content}</em>`;
        } else {
            // It's a user message (either from history or new)
            const msgUsername = msg.username || 'Unknown';
            const msgContent = msg.message || msg.content || '';
            
            messageElement.classList.add('chat-message-mobile');
            if (msgUsername === username ) {
                messageElement.classList.add('user_message'); // Current user's new message
            }else if(msgUsername === "藍鵲"){
                messageElement.classList.add('bird_message')
            }
            else {
                messageElement.classList.add('other_message'); // Other users' messages
            }
            messageElement.innerHTML = `<strong>${msgUsername}:</strong> ${msgContent}`;
        }

        mobileChatLog.appendChild(messageElement);
        mobileChatLog.scrollTop = mobileChatLog.scrollHeight; // Auto-scroll
    }
});
