# ABMI Bird Chat Room

## Project Description

This project is a real-time, interactive web application that displays a chat room. Messages sent from a mobile client are displayed on a main screen as speech bubbles next to an animated bird. The application uses WebSockets for instant communication and stores chat history in a local SQLite database.

## Features

- **Real-time Chat**: A global chat room where messages are broadcast to all connected clients instantly.
- **Persistent History**: Chat history is saved in an SQLite database and loaded for every new client.
- **Animated Display**: The main display screen features a flying bird animation.
- **Comic-Style UI**: Chat messages are rendered as speech bubbles for a fun, visual experience.
- **Simple Mobile Client**: A straightforward mobile web page allows users to join the chat and send messages.

## Technology Stack & Key Functions

This project uses a modern, lightweight technology stack. Below is an overview of the key components and the functions they provide.

### Backend

- **Python**: The core programming language for the server-side logic.
- **FastAPI**: A high-performance Python web framework used for building the API and WebSocket endpoint.
  - `uvicorn`: The ASGI server that runs the FastAPI application.
  - **Key Function**: `@app.websocket("/ws")` is the decorator that establishes the main WebSocket endpoint. This single endpoint manages all real-time communication for the global chat room.
- **aiosqlite**: An asynchronous library for interacting with the SQLite database, which integrates perfectly with FastAPI's async nature.
  - **Key Functions**:
    - `init_db()`: Creates the `chat_history.db` file and the `messages` table on application startup.
    - `add_message()`: Inserts a new message into the database.
    - `get_all_messages()`: Retrieves the entire chat history to send to new clients.
- **WebSockets**: The protocol enabling two-way, real-time communication between the server and all connected clients.

### Frontend

- **Vanilla HTML/CSS/JavaScript**: The frontend is built without any heavy frameworks to keep it simple and fast.
- **Key JavaScript Functions**:
  - `new WebSocket()`: The standard browser API used by clients to connect to the server's `/ws` endpoint.
  - `socket.onmessage`: The event handler that processes messages received from the server. It listens for `history` messages to render the past chat, and `new_message` events to display live messages.
  - `socket.send()`: The function used to send a user's message (as a JSON string) to the server.
  - `setInterval()`: A simple but effective function used on the display page to create the bird's flapping animation by toggling the image source every 500ms.

## Project Structure

```
/
├── pyproject.toml       # Defines dependencies and scripts for the uv workflow
├── main.py              # Main FastAPI application, handles WebSockets
├── database.py          # Manages all SQLite database operations
├── templates/
│   ├── display.html     # The main screen with the bird and chat bubbles
│   └── mobile.html      # The mobile client for sending messages
└── static/
    ├── css/style.css    # Styles for both display and mobile pages
    ├── js/
    │   ├── display.js   # Logic for the display page (animation, receiving messages)
    │   └── mobile.js    # Logic for the mobile client (username prompt, sending messages)
    └── assets/
        ├── Background.JPG # The background image
        ├── Bird1.PNG      # Bird animation frame 1
        └── Bird2.PNG      # Bird animation frame 2
```

## Setup and Running the Application

Follow these steps to get the project running locally.

### 1. Prerequisites

- **uv** (Python package installer, can be installed via `pip install uv`)

### 2. Install Dependencies

With the environment activated, `uv` will use the `pyproject.toml` file to install all necessary packages. The `-e .` flag installs the project in "editable" mode.

```bash
uv sync
```

### 3. Run the Application

This command executes the `start` script defined in `pyproject.toml`, which runs the Uvicorn server.

```bash
uv run uvicorn main:app --host <host_name> --port <port>
```

### 4. Access the Application

Once the server is running, you can access the two parts of the application:

- **Display View**: Open your web browser and navigate to **http://localhost:8000**
- **Mobile Client**: Open another browser tab or use a mobile device on the same network and navigate to **http://localhost:8000/mobile**

Enter a username on the mobile client and start sending messages to see them appear on the display screen!
