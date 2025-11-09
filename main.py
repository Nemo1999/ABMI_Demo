import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

import database as db
from ai import generate_ai_response

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
                    # 1. Save user message
                    await db.add_message(username, message_text)
                    
                    # 2. Broadcast user message
                    user_message_broadcast = {
                        "type": "new_message",
                        "username": username,
                        "message": message_text
                    }
                    await manager.broadcast(json.dumps(user_message_broadcast))
                    
                    # 3. Get history and generate AI response
                    history = await db.get_all_messages()
                    ai_response_text = generate_ai_response(history)
                    
                    # 4. Save AI response
                    await db.add_message("藍鵲", ai_response_text)
                    
                    # 5. Broadcast AI response
                    ai_message_broadcast = {
                        "type": "new_message",
                        "username": "藍鵲",
                        "message": ai_response_text
                    }
                    await asyncio.sleep(0.5) # Dramatic pause
                    await manager.broadcast(json.dumps(ai_message_broadcast))

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
        logging.info("A WebSocket session was closed.")