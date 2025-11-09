import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

import database as db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

# Serve static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        logging.info("Global ConnectionManager initialized.")

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logging.info(f"New WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logging.info(f"WebSocket disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        logging.info(f"Broadcasting message to all {len(self.active_connections)} clients: {message}")
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logging.error(f"Error sending message to a WebSocket: {e}")

manager = ConnectionManager()

# --- FastAPI Events ---
@app.on_event("startup")
async def startup_event():
    """Initialize the database on application startup."""
    logging.info("Application starting up...")
    await db.init_db()

# --- HTML Routes ---
@app.get("/")
async def get_display():
    logging.info("GET / - Serving display.html")
    with open("templates/display.html") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.get("/mobile")
async def get_mobile():
    logging.info("GET /mobile - Serving mobile.html")
    with open("templates/mobile.html") as f:
        return HTMLResponse(content=f.read(), status_code=200)

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Send chat history to the newly connected client
    try:
        history = await db.get_all_messages()
        history_message = {
            "type": "history",
            "data": history
        }
        await websocket.send_text(json.dumps(history_message))
        logging.info("Sent chat history to new client.")
    except Exception as e:
        logging.error(f"Error sending chat history: {e}")

    # Listen for new messages
    try:
        while True:
            data = await websocket.receive_text()
            logging.info(f"Received raw data: {data}")
            
            try:
                message_data = json.loads(data)
                username = message_data.get("username")
                message_text = message_data.get("message")

                if username and message_text:
                    # Save the new message to the database
                    await db.add_message(username, message_text)
                    
                    # Broadcast the new message to all clients
                    new_message = {
                        "type": "new_message",
                        "username": username,
                        "message": message_text
                    }
                    await manager.broadcast(json.dumps(new_message))
                else:
                    logging.warning(f"Received incomplete message: {data}")

            except json.JSONDecodeError:
                logging.error(f"Received invalid JSON: {data}")

    except WebSocketDisconnect:
        logging.info("WebSocket disconnected.")
    except Exception as e:
        logging.error(f"An unexpected error occurred in WebSocket: {e}")
    finally:
        manager.disconnect(websocket)
        logging.info("Session '{session_id}' is now empty and removed.")

    async def broadcast(self, message: str, session_id: str):
        if session_id in self.active_connections:
            logging.info(f"Broadcasting message to session '{session_id}': {message}")
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(message)
                except RuntimeError as e:
                    logging.error(f"Error sending message to WebSocket in session '{session_id}': {e}")
        else:
            logging.warning(f"Attempted to broadcast to non-existent session '{session_id}'.")

manager = ConnectionManager()

# Pre-defined animal responses
animal_responses = {
    "elephant": {
        "hello": "The elephant raises its trunk and lets out a friendly trumpet!",
        "food": "The elephant enjoys munching on leaves and branches.",
        "fun_fact": "Elephants can communicate over long distances using low-frequency sounds!"
    },
    "lizard": {
        "hello": "The lizard flicks its tongue and curiously tilts its head.",
        "food": "This lizard loves to eat insects and small bugs.",
        "fun_fact": "Some lizards can detach their tails to escape from predators!"
    }
}

@app.get("/")
async def get_display():
    logging.info("GET / - Serving display.html")
    with open("templates/display.html") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.get("/mobile")
async def get_mobile():
    logging.info("GET /mobile - Serving mobile.html")
    with open("templates/mobile.html") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    logging.info(f"Attempting to connect WebSocket for session '{session_id}'.")
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            logging.info(f"Received raw data from session '{session_id}': {data}")
            message = json.loads(data)
            logging.info(f"Parsed message from session '{session_id}': {message}")
            
            # Broadcast the user's message
            await manager.broadcast(json.dumps(message), session_id)

            # Generate and broadcast the animal's response
            if message["type"] == "user_message":
                animal = message.get("animal")
                content_key = message.get("content_key") # e.g., "hello", "food"
                logging.info(f"Processing user_message for animal '{animal}' with key '{content_key}'.")
                if animal in animal_responses and content_key in animal_responses[animal]:
                    response_text = animal_responses[animal][content_key]
                    response_message = {
                        "type": "animal_response",
                        "animal": animal,
                        "content": response_text
                    }
                    logging.info(f"Generated animal response for '{animal}': {response_text}")
                    await asyncio.sleep(0.5) # Dramatic pause
                    await manager.broadcast(json.dumps(response_message), session_id)
                else:
                    logging.warning(f"No response found for animal '{animal}' or content_key '{content_key}'.")

    except WebSocketDisconnect:
        logging.info(f"WebSocket disconnected from session '{session_id}'.")
        manager.disconnect(websocket, session_id)
    except json.JSONDecodeError:
        logging.error(f"Received invalid JSON from session '{session_id}': {data}")
    except Exception as e:
        logging.error(f"An unexpected error occurred in WebSocket for session '{session_id}': {e}")
