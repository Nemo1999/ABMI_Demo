
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json

app = FastAPI()

# Serve static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# In-memory storage for active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)

    async def broadcast(self, message: str, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_text(message)

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
    with open("templates/display.html") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.get("/mobile")
async def get_mobile():
    with open("templates/mobile.html") as f:
        return HTMLResponse(content=f.read(), status_code=200)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Broadcast the user's message
            await manager.broadcast(json.dumps(message), session_id)

            # Generate and broadcast the animal's response
            if message["type"] == "user_message":
                animal = message.get("animal")
                content_key = message.get("content_key") # e.g., "hello", "food"
                if animal in animal_responses and content_key in animal_responses[animal]:
                    response_text = animal_responses[animal][content_key]
                    response_message = {
                        "type": "animal_response",
                        "animal": animal,
                        "content": response_text
                    }
                    await asyncio.sleep(1) # Dramatic pause
                    await manager.broadcast(json.dumps(response_message), session_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        # Optional: broadcast a disconnect message
        # await manager.broadcast(f"Client left the chat", session_id)

