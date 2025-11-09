from google import genai
import os
import logging

def generate_ai_response(history):
    """
    Generates a response from the AI model based on the conversation history.
    """
    try:
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

        with open("bird_prompt.txt", "r", encoding="utf-8") as f:
            prompt = f.read()

        # Format the history for the prompt
        formatted_history = "\n".join([f"{msg['username']}: {msg['message']}" for msg in history])
        full_prompt = f"{prompt}\n\n{formatted_history}"

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
        )
        logging.info(f"Generated AI response: {response.text}")
        return response.text
    except Exception as e:
        logging.error(f"Error generating AI response: {e}")
        return "我今天有些累了，無法清楚地感知你的夢境。我們下次再聊吧。"
