# Voice-Based Daily Standup Assistant

A voice-based standup assistant that helps developers start their day with a productive standup meeting. The system acts like a smart, conversational Scrum Master, guiding you through your daily standup.

## Features

- Voice interaction through speech-to-text and text-to-speech
- Structured standup format with three key questions
- Responsive, modern UI
- Summarization of responses using AI
- Local running components for privacy

## Tech Stack

- **Frontend**: React (Vite) with TypeScript
- **Backend**: FastAPI (Python)
- **Speech-to-Text**: Whisper
- **Language Processing**: Mistral (via Ollama)
- **Text-to-Speech**: Browser-based TTS with option to extend

## Setup & Installation

### Prerequisites

- Node.js and npm
- Python 3.8+ and pip
- [Ollama](https://ollama.ai/) with Mistral model (`ollama pull mistral`)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
python run.py
```

### Environment Variables

The backend uses the following environment variables:

- `OLLAMA_BASE_URL`: URL for Ollama API (default: http://localhost:11434)
- `MODEL_NAME`: LLM model to use (default: mistral)

## Usage

1. Start both the frontend and backend servers
2. Open your browser to the frontend URL (typically http://localhost:5173)
3. Enter your name and start the standup
4. Use the microphone button to record your responses to each question
5. Follow the guided standup process

## Project Structure

```
├── frontend/               # React frontend
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Entry point
│   └── public/             # Static assets
│
├── backend/                # FastAPI backend
│   ├── app/                # Application code
│   │   └── main.py         # API endpoints
│   └── requirements.txt    # Python dependencies
```

## License

MIT 