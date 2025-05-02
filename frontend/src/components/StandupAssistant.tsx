import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface Message {
  role: 'assistant' | 'user'
  content: string
}

interface StandupAssistantProps {
  userName: string
}

const StandupAssistant = ({ userName }: StandupAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [conversation, setConversation] = useState<Message[]>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const conversationContainerRef = useRef<HTMLDivElement>(null)

  // Initial greeting
  useEffect(() => {
    const initialGreeting = `Hi ${userName}, good morning! I'm your assistant. How can I help you today?`
    addAssistantMessage(initialGreeting)
  }, [userName])

  useEffect(() => {
    // Scroll to the bottom of the conversation when messages change
    if (conversationContainerRef.current) {
      conversationContainerRef.current.scrollTop = 
        conversationContainerRef.current.scrollHeight
    }
  }, [messages])

  const addAssistantMessage = (content: string) => {
    const newMessage: Message = { role: 'assistant', content }
    setMessages(prev => [...prev, newMessage])
    setConversation(prev => [...prev, newMessage])
    // Convert text to speech
    speakMessage(content)
  }

  const addUserMessage = (content: string) => {
    const newMessage: Message = { role: 'user', content }
    setMessages(prev => [...prev, newMessage])
    setConversation(prev => [...prev, newMessage])
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        processAudio(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
      
      // Stop all tracks on the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      
      const response = await axios.post('/api/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const transcription = response.data.text
      
      if (transcription) {
        addUserMessage(transcription)
        
        // Process the response with the language model
        // We'll pass the entire conversation history for context
        const aiResponse = await axios.post('/api/chat', {
          messages: conversation,
          newMessage: transcription,
          userName
        })
        
        if (aiResponse.data.response) {
          addAssistantMessage(aiResponse.data.response)
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      addAssistantMessage("I'm sorry, I encountered an error processing your message. Could you try again?")
    } finally {
      setIsProcessing(false)
    }
  }

  const speakMessage = async (text: string) => {
    try {
      // Use browser's built-in speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        window.speechSynthesis.speak(utterance)
      }
    } catch (error) {
      console.error('Error speaking message:', error)
    }
  }

  const getStatusText = () => {
    if (isRecording) return 'Listening...'
    if (isProcessing) return 'Thinking...'
    return 'Press the microphone button and speak'
  }

  return (
    <div className="standup-container">
      <div className="standup-header">
        <h2 className="standup-title">AI Assistant</h2>
      </div>
      
      <div className="conversation-container" ref={conversationContainerRef}>
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role === 'assistant' ? 'assistant-message' : 'user-message'}`}
          >
            {message.content}
          </div>
        ))}
      </div>
      
      <div className="controls">
        <button 
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isRecording ? '■' : '🎤'}
        </button>
        
        <p className="standup-status">{getStatusText()}</p>
      </div>
    </div>
  )
}

export default StandupAssistant 