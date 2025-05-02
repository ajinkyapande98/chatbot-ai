import os
import tempfile
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import whisper
import io
from starlette.background import BackgroundTask

# Initialize FastAPI app
app = FastAPI(title="Standup Assistant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the Whisper model for transcription
# "tiny" is the smallest and fastest model but least accurate
# Options: "tiny", "base", "small", "medium", "large"
whisper_model = whisper.load_model("tiny")

# Initialize the Ollama client
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "mistral")  # Default to mistral


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    newMessage: str
    userName: str


class ProcessRequest(BaseModel):
    message: str
    userName: str
    currentQuestion: int


class TextToSpeechRequest(BaseModel):
    text: str


@app.get("/")
async def root():
    return {"message": "Conversational AI Assistant API is running"}


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    # Save the uploaded audio to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        # Write the audio data to the temporary file
        temp_audio.write(await audio.read())
        temp_audio_path = temp_audio.name

    try:
        # Transcribe the audio using Whisper
        result = whisper_model.transcribe(temp_audio_path)
        transcribed_text = result["text"].strip()
        
        # Remove the temporary file
        os.unlink(temp_audio_path)
        
        return {"text": transcribed_text}
    except Exception as e:
        # Make sure to clean up the temporary file even if there's an error
        if os.path.exists(temp_audio_path):
            os.unlink(temp_audio_path)
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")


@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Create the prompt for the language model
        system_prompt = f"""
        You are a helpful, intelligent assistant engaging in a conversation with {request.userName}.
        You should respond in a friendly, natural tone as if you're having a conversation.
        Keep your responses concise but informative. Be empathetic and adapt to the user's tone.
        You can express opinions and be creative, but avoid any harmful or offensive content.
        """
        
        # Format conversation history
        conversation_history = ""
        for msg in request.messages:
            role = "User" if msg.role == "user" else "Assistant"
            conversation_history += f"{role}: {msg.content}\n"
        
        # Add the new message
        conversation_history += f"User: {request.newMessage}\n"
        conversation_history += "Assistant: "
        
        # Send the request to Ollama
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": f"{system_prompt}\n\nConversation:\n{conversation_history}",
                    "stream": False,
                    "temperature": 0.7,
                    "max_tokens": 500
                },
                timeout=30.0
            )
            
            data = response.json()
            return {"response": data.get("response", "").strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")


@app.post("/api/process")
async def process_message(request: ProcessRequest):
    try:
        # Create the prompt for the language model
        system_prompt = """
        You are a standup assistant that helps developers with their daily standup. 
        Your job is to provide short, concise responses that summarize what the developer said.
        Keep your responses friendly, supportive, and to the point (2-3 sentences max).
        
        Standup questions:
        1. What did you work on yesterday?
        2. What are you planning to work on today?
        3. Do you have any blockers or need help with anything?
        
        For each answer, briefly summarize what the developer said and offer a short, motivational response.
        """

        # Prepare the message context
        message_context = f"User: {request.userName}, Question: {request.currentQuestion}, Response: {request.message}"
        
        # Send the request to Ollama
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": f"{system_prompt}\n\nUser input: {message_context}\n\nYour response:",
                    "stream": False,
                    "temperature": 0.7,
                    "max_tokens": 150
                },
                timeout=30.0
            )
            
            data = response.json()
            return {"response": data.get("response", "").strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")


@app.post("/api/speak")
async def text_to_speech(request: TextToSpeechRequest):
    try:
        # If you have a local TTS engine available, use it here
        # For now, we'll use a simple fallback approach (browser's built-in TTS)
        # In a production app, you might want to integrate with a proper TTS service
        # like ElevenLabs, Amazon Polly, or Mozilla TTS
        
        # Return an empty audio response with a header indicating to use browser TTS
        return {"message": "Text received, use browser TTS"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting text to speech: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 