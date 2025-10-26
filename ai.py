from google import genai
import os

def generate_ai_response(content, animal):
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"You are a {animal}. The user asked: {content}. Please respond in a friendly and engaging manner."
    )
    print("content: ", content)
    print("animal: ", animal)
    print("response: ", response.text)
    return response.text