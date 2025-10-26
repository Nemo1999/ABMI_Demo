import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json
import logging
from ai import generate_ai_response

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

# Serve static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory storage for active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        logging.info("ConnectionManager initialized.")

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
            logging.info(f"New session_id '{session_id}' created.")
        self.active_connections[session_id].append(websocket)
        logging.info(f"WebSocket connected for session '{session_id}'. Total connections for session: {len(self.active_connections[session_id])}")

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            logging.info(f"WebSocket disconnected for session '{session_id}'. Remaining connections for session: {len(self.active_connections[session_id])}")
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
                logging.info(f"Session '{session_id}' is now empty and removed.")

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
                content = message.get("content", "")
                logging.info(f"Processing user_message for animal '{animal}' with key '{content_key}'.")
                
                # Handle text input from the user - use AI to generate response
                if content_key == "text_input":
                    # Generate AI response using Gemini API
                    ai_response = generate_ai_response(content, animal)
                    response_message = {
                        "type": "animal_response",
                        "animal": animal,
                        "content": ai_response
                    }
                    await asyncio.sleep(0.5) # Dramatic pause
                    await manager.broadcast(json.dumps(response_message), session_id)
                elif animal in animal_responses and content_key in animal_responses[animal]:
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