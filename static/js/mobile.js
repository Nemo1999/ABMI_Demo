document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Mobile AR App: DOM Content Loaded.");

    const mobileChatLog = document.getElementById('mobile-chat-log');
    const messagingUi = document.getElementById('messaging-ui');
    const animalNameDisplay = document.getElementById('animal-name');
    const messageButtons = document.querySelectorAll('.msg-btn');
    const arContainer = document.getElementById('ar-container');
    const cameraFeed = document.getElementById('camera-feed');
    const arCanvas = document.getElementById('ar-canvas');

    let currentAnimal = null;
    let socket = null;

    // 1. Parse the session_id from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
        console.error("Mobile AR App: No session ID found. Please scan the QR code again.");
        mobileChatLog.innerHTML = '<em>Error: No session ID found. Please scan the QR code again.</em>';
        return;
    }
    console.log(`Mobile AR App: Session ID: ${sessionId}`);

    // 2. Establish the WebSocket connection
    function connectWebSocket() {
        console.log("Mobile AR App: Attempting to connect WebSocket...");
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/${sessionId}`;
        socket = new WebSocket(wsUrl);

        socket.onopen = function(e) {
            console.log("Mobile AR App: [WebSocket Open] Connection established.");
            appendMessage({ type: 'system_notification', content: 'Connected! Point your camera at an animal.' });
        };

        socket.onmessage = function(event) {
            console.log(`Mobile AR App: [WebSocket Message] Data received: ${event.data}`);
            const message = JSON.parse(event.data);
            // Only show animal responses on mobile to prevent echo of user's own message
            if (message.type === 'animal_response') {
                appendMessage(message);
            }
        };

        socket.onclose = function(event) {
            console.warn(`Mobile AR App: [WebSocket Close] Connection closed: ${event.reason} (Code: ${event.code}).`);
            appendMessage({ type: 'system_notification', content: 'Disconnected from server. Attempting to reconnect...' });
            setTimeout(connectWebSocket, 3000); // Attempt to reconnect after 3 seconds
        };

        socket.onerror = function(error) {
            console.error(`Mobile AR App: [WebSocket Error] ${error.message}`);
            appendMessage({ type: 'system_notification', content: 'A connection error occurred.' });
        };
    }
    connectWebSocket();

    // 3. Initialize ARToolKit.js
    let arController = null;
    let cameraParam = new ARCameraParam();

    cameraParam.onload = function () {
        console.log("Mobile AR App: ARCameraParam loaded.");
        initAR();
    };
    cameraParam.load('/static/assets/camera_para.dat'); // You might need to provide this file or use a default one

    function initAR() {
        console.log("Mobile AR App: Initializing ARToolKit...");
        arController = new ARController(cameraFeed, cameraParam);
        arController.debugSetup();
        arController.canvas.id = 'ar-canvas'; // Ensure canvas has ID
        arContainer.appendChild(arController.canvas);

        // Load markers
        arController.loadMarker('/static/assets/patt.elephant', function(markerId) {
            console.log(`Mobile AR App: Elephant marker loaded with ID: ${markerId}`);
            arController.trackPattern(markerId, 1, function(event) {
                handleMarkerDetection(event, 'elephant');
            });
        });
        arController.loadMarker('/static/assets/patt.lizard', function(markerId) {
            console.log(`Mobile AR App: Lizard marker loaded with ID: ${markerId}`);
            arController.trackPattern(markerId, 1, function(event) {
                handleMarkerDetection(event, 'lizard');
            });
        });

        arController.addEventListener('getMarker', function(ev) {
            // This event fires for every detected marker in every frame
            // We handle specific marker logic in the trackPattern callbacks
        });

        arController.addEventListener('lostMarker', function(ev) {
            console.log(`Mobile AR App: Marker lost: ${ev.marker.id}`);
            if (currentAnimal && ev.marker.id === arController.markerNameToId[currentAnimal]) {
                console.log(`Mobile AR App: Lost tracking of ${currentAnimal}. Hiding UI.`);
                messagingUi.style.display = 'none';
                currentAnimal = null;
            }
        });

        // Start the AR loop
        arController.video.addEventListener('canplay', function() {
            console.log("Mobile AR App: Camera feed can play. Starting AR loop.");
            arController.video.play();
            setInterval(function() {
                arController.process();
            }, 25);
        });

        // Request camera access
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
            .then(function(stream) {
                console.log("Mobile AR App: Camera stream obtained.");
                cameraFeed.srcObject = stream;
            })
            .catch(function(err) {
                console.error("Mobile AR App: Error accessing camera: ", err);
                appendMessage({ type: 'system_notification', content: 'Error accessing camera. Please allow camera access.' });
            });
    }

    function handleMarkerDetection(event, animalType) {
        if (event.data.type === ARController.MARKER_DETECTION) {
            if (currentAnimal !== animalType) {
                console.log(`Mobile AR App: Detected ${animalType} marker. Showing UI.`);
                currentAnimal = animalType;
                animalNameDisplay.textContent = animalType.charAt(0).toUpperCase() + animalType.slice(1);
                messagingUi.style.display = 'flex'; // Use flex for vertical layout
                mobileChatLog.innerHTML = ''; // Clear chat log for new animal
                appendMessage({ type: 'system_notification', content: `You are now talking to the ${animalType}!` });
            }
        }
    }

    // 4. Messaging UI Interaction
    messageButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!currentAnimal) {
                console.warn("Mobile AR App: No animal detected, cannot send message.");
                appendMessage({ type: 'system_notification', content: 'Please point your camera at an animal first.' });
                return;
            }
            if (socket.readyState !== WebSocket.OPEN) {
                console.warn("Mobile AR App: WebSocket not open, cannot send message.");
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
            console.log(`Mobile AR App: Sending message: ${JSON.stringify(message)}`);
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
        console.log(`Mobile AR App: Appended message to chat log: ${message.type} - ${message.content}`);
    }
});