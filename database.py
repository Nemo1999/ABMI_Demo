
import aiosqlite
import logging

DATABASE = 'chat_history.db'

async def init_db():
    """Initializes the database and creates the messages table if it doesn't exist."""
    try:
        async with aiosqlite.connect(DATABASE) as db:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await db.commit()
        logging.info("Database initialized successfully.")
    except Exception as e:
        logging.error(f"Error initializing database: {e}")

async def add_message(username: str, message: str):
    """Adds a new chat message to the database."""
    try:
        async with aiosqlite.connect(DATABASE) as db:
            await db.execute(
                "INSERT INTO messages (username, message) VALUES (?, ?)",
                (username, message)
            )
            await db.commit()
        logging.info(f"Message from '{username}' added to database.")
    except Exception as e:
        logging.error(f"Error adding message to database: {e}")

async def get_all_messages():
    """Retrieves all messages from the database, ordered by timestamp."""
    try:
        async with aiosqlite.connect(DATABASE) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT username, message, timestamp FROM messages ORDER BY timestamp ASC") as cursor:
                messages = await cursor.fetchall()
                logging.info(f"Retrieved {len(messages)} messages from database.")
                return [dict(row) for row in messages]
    except Exception as e:
        logging.error(f"Error retrieving messages from database: {e}")
        return []
