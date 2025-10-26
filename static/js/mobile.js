document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Mobile Messaging Test App: DOM Content Loaded.");

    const mobileChatLog = document.getElementById('mobile-chat-log');
    const messagingUi = document.getElementById('messaging-ui');
    const animalNameDisplay = document.getElementById('animal-name');
    const messageButtons = document.querySelectorAll('.msg-btn');
    const selectAnimalDropdown = document.getElementById('select-animal');

    let currentAnimal = selectAnimalDropdown.value; // Initialize with default selected animal
    let socket = null;

    // Set initial animal name display
    animalNameDisplay.textContent = currentAnimal.charAt(0).toUpperCase() + currentAnimal.slice(1);

    // Event listener for animal selection dropdown
    selectAnimalDropdown.addEventListener('change', (e) => {
        currentAnimal = e.target.value;
        animalNameDisplay.textContent = currentAnimal.charAt(0).toUpperCase() + currentAnimal.slice(1);
        mobileChatLog.innerHTML = ''; // Clear chat log for new animal
        appendMessage({ type: 'system_notification', content: `You are now talking to the ${currentAnimal}!` });
        console.log(`Mobile Messaging Test App: Switched to talk to: ${currentAnimal}`);
    });

    // 1. Parse the session_id from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
        console.error("Mobile Messaging Test App: No session ID found. Please scan the QR code again.");
        mobileChatLog.innerHTML = '<em>Error: No session ID found. Please scan the QR code again.</em>';
        return;
    }
    console.log(`Mobile Messaging Test App: Session ID: ${sessionId}`);

    // 2. Establish the WebSocket connection
    function connectWebSocket() {
        console.log("Mobile Messaging Test App: Attempting to connect WebSocket...");
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/${sessionId}`;
        socket = new WebSocket(wsUrl);

        socket.onopen = function(e) {
            console.log("Mobile Messaging Test App: [WebSocket Open] Connection established.");
            appendMessage({ type: 'system_notification', content: 'Connected! Select an animal to chat.' });
            messagingUi.style.display = 'flex'; // Ensure UI is visible
        };

        socket.onmessage = function(event) {
            console.log(`Mobile Messaging Test App: [WebSocket Message] Data received: ${event.data}`);
            const message = JSON.parse(event.data);
            // Only show animal responses on mobile to prevent echo of user's own message
            if (message.type === 'animal_response') {
                appendMessage(message);
            }
        };

        socket.onclose = function(event) {
            console.warn(`Mobile Messaging Test App: [WebSocket Close] Connection closed: ${event.reason} (Code: ${event.code}).`);
            appendMessage({ type: 'system_notification', content: 'Disconnected from server. Attempting to reconnect...' });
            setTimeout(connectWebSocket, 3000); // Attempt to reconnect after 3 seconds
        };

        socket.onerror = function(error) {
            console.error(`Mobile Messaging Test App: [WebSocket Error] ${error.message}`);
            appendMessage({ type: 'system_notification', content: 'A connection error occurred.' });
        };
    }
    connectWebSocket();

    // Handle text input
    const textInput = document.getElementById('mobile-text-input');
    if (textInput) {
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && textInput.value.trim()) {
                if (!currentAnimal) {
                    console.warn("Mobile Messaging Test App: No animal selected, cannot send message.");
                    appendMessage({ type: 'system_notification', content: 'Please select an animal first.' });
                    return;
                }
                if (socket.readyState !== WebSocket.OPEN) {
                    console.warn("Mobile Messaging Test App: WebSocket not open, cannot send message.");
                    appendMessage({ type: 'system_notification', content: 'Connection lost. Please wait...' });
                    return;
                }

                const message = {
                    type: 'user_message',
                    animal: currentAnimal,
                    content: textInput.value.trim(),
                    content_key: 'text_input' // Custom key for text input
                };
                console.log(`Mobile Messaging Test App: Sending message: ${JSON.stringify(message)}`);
                socket.send(JSON.stringify(message));
                appendMessage(message); // Display user's own message immediately
                textInput.value = ''; // Clear the input
            }
        });
    }

    // Messaging UI Interaction
    messageButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!currentAnimal) {
                console.warn("Mobile Messaging Test App: No animal selected, cannot send message.");
                appendMessage({ type: 'system_notification', content: 'Please select an animal first.' });
                return;
            }
            if (socket.readyState !== WebSocket.OPEN) {
                console.warn("Mobile Messaging Test App: WebSocket not open, cannot send message.");
                appendMessage({ type: 'system_notification', content: 'Connection lost. Please wait...' });
                return;
            }

            const key = button.getAttribute('data-key');
            const text = button.textContent; // Get text from button

            const message = {
                type: 'user_message',
                animal: currentAnimal,
                content: text,
                content_key: key
            };
            console.log(`Mobile Messaging Test App: Sending message: ${JSON.stringify(message)}`);
            socket.send(JSON.stringify(message));
            appendMessage(message); // Display user's own message immediately
        });
    });

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
        mobileChatLog.scrollTop = mobileChatLog.scrollHeight; // Auto-scroll to the latest message
        console.log(`Mobile Messaging Test App: Appended message to chat log: ${message.type} - ${message.content}`);
    }
});
