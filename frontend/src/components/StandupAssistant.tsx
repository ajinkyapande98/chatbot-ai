import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface Message {
  role: 'assistant' | 'user'
  content: string
}

interface StandupAssistantProps {
  userName: string
}

// SVG Icons as components
const MicrophoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
  </svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
  </svg>
);

const WaveformIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="waveform">
    <rect className="wave1" x="1" y="8" width="2" height="8" />
    <rect className="wave2" x="5" y="5" width="2" height="14" />
    <rect className="wave3" x="9" y="2" width="2" height="20" />
    <rect className="wave4" x="13" y="5" width="2" height="14" />
    <rect className="wave5" x="17" y="8" width="2" height="8" />
    <rect className="wave6" x="21" y="10" width="2" height="4" />
  </svg>
);

const RobotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.7 7.7c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41zm8.2 8.2c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41zm-8.2 0c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41zm8.2-8.2c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41z"/>
  </svg>
);

const StandupAssistant = ({ userName }: StandupAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [conversation, setConversation] = useState<Message[]>([])
  const [conversationStarted, setConversationStarted] = useState<boolean>(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [audioElement] = useState<HTMLAudioElement>(new Audio())
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [visualizerActive, setVisualizerActive] = useState<boolean>(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const conversationContainerRef = useRef<HTMLDivElement>(null)

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      if (availableVoices.length > 0) {
        setVoices(availableVoices)
        
        // Find a good default voice
        const bestVoice = findBestVoice(availableVoices)
        if (bestVoice) {
          setSelectedVoice(bestVoice.name)
        }
      }
    }

    // Load voices immediately if available
    loadVoices()

    // Set up event for when voices change/load
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      // Clean up
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [])

  // Initial greeting - only when conversation is started
  useEffect(() => {
    if (conversationStarted) {
      const initialGreeting = `Hi ${userName}, I'm your AI voice assistant. How can I help you today?`
      addAssistantMessage(initialGreeting)
    }
  }, [conversationStarted, userName])

  useEffect(() => {
    // Scroll to the bottom of the conversation when messages change
    if (conversationContainerRef.current) {
      conversationContainerRef.current.scrollTop = 
        conversationContainerRef.current.scrollHeight
    }
  }, [messages])

  // Visualizer effect
  useEffect(() => {
    if (isRecording) {
      setVisualizerActive(true)
    } else {
      setVisualizerActive(false)
    }
  }, [isRecording])

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

  const startConversation = () => {
    setConversationStarted(true)
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

  const findBestVoice = (availableVoices: SpeechSynthesisVoice[]) => {
    if (!availableVoices.length) return null

    // First check for high-quality voices (newer browsers often have these)
    const premiumVoice = availableVoices.find(voice => 
      voice.name.includes('Premium') || 
      voice.name.includes('Enhanced') ||
      voice.name.includes('Neural') ||
      voice.name.includes('Wavenet')
    )
    
    if (premiumVoice) return premiumVoice
    
    // Good voices by name (these are often good on different OSes)
    const goodVoices = [
      'Google US English',
      'Microsoft Zira',
      'Samantha',
      'Alex',
      'Karen',
      'Daniel',
      'Moira',
      'Tessa',
      'Monica',
      'en-US-Neural2-F',
      'en-US-Neural2-C'
    ]
    
    for (const voiceName of goodVoices) {
      const voice = availableVoices.find(v => v.name.includes(voiceName))
      if (voice) return voice
    }
    
    // Fallback to any English female voice
    const englishFemaleVoice = availableVoices.find(voice => 
      (voice.lang.includes('en-') || voice.lang.includes('en_')) && 
      !voice.name.includes('Male')
    )
    
    if (englishFemaleVoice) return englishFemaleVoice
    
    // Fallback to any English voice
    const englishVoice = availableVoices.find(voice => 
      voice.lang.includes('en-') || voice.lang.includes('en_')
    )
    
    // Last resort, return the first voice in the list
    return englishVoice || availableVoices[0]
  }

  const speakMessage = (text: string) => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Find the selected voice
      if (selectedVoice) {
        const voice = voices.find(v => v.name === selectedVoice)
        if (voice) {
          utterance.voice = voice
        }
      }
      
      // Optimize speech parameters
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0
      
      // Add event listeners
      utterance.onstart = () => console.log('Speech started')
      utterance.onend = () => console.log('Speech ended')
      utterance.onerror = (e) => console.error('Speech error:', e)
      
      // Speak the text
      window.speechSynthesis.speak(utterance)
      
      // Chrome sometimes cuts off speech - this is a workaround
      if (navigator.userAgent.includes('Chrome')) {
        const hackSpeechSynthesis = () => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause()
            window.speechSynthesis.resume()
            setTimeout(hackSpeechSynthesis, 5000)
          }
        }
        setTimeout(hackSpeechSynthesis, 5000)
      }
    } catch (error) {
      console.error('Error speaking message:', error)
      // Try to use audio API as fallback if speech synthesis fails
      speakWithAudioAPI(text)
    }
  }
  
  const speakWithAudioAPI = (text: string) => {
    // This is a fallback option using pre-recorded audio or API-based TTS services
    try {
      // We'll use the free VoiceRSS TTS API as fallback
      const apiKey = 'e6fefac9bd1f4985a1f9f0df09423ce3' // Free API key with limited usage
      const url = `https://api.voicerss.org/?key=${apiKey}&src=${encodeURIComponent(text)}&hl=en-us`
      
      audioElement.src = url
      audioElement.onloadedmetadata = () => {
        audioElement.play().catch(e => console.error('Error playing audio:', e))
      }
      audioElement.onerror = () => console.error('Error loading audio')
    } catch (error) {
      console.error('Fallback audio failed:', error)
    }
  }

  const getStatusText = () => {
    if (!conversationStarted) return 'Press Start to begin conversation'
    if (isRecording) return 'Listening...'
    if (isProcessing) return 'Thinking...'
    return 'Press the microphone button and speak'
  }
  
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value)
  }

  return (
    <div className="standup-container">
      <div className="standup-header">
        <h2 className="standup-title">AI Voice Assistant <RobotIcon /></h2>
        
        {/* Voice selection dropdown */}
        {conversationStarted && voices.length > 0 && (
          <div className="voice-selection">
            <label htmlFor="voice-select">Voice: </label>
            <select 
              id="voice-select" 
              value={selectedVoice} 
              onChange={handleVoiceChange}
            >
              {voices
                .filter(voice => voice.lang.includes('en'))
                .map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))
              }
            </select>
          </div>
        )}
      </div>
      
      <div className="conversation-container" ref={conversationContainerRef}>
        {messages.length === 0 && !conversationStarted && (
          <div className="empty-state">
            <div className="empty-icon">🎙️</div>
            <p>Your conversation will appear here</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role === 'assistant' ? 'assistant-message' : 'user-message'}`}
          >
            <div className="message-content">
              {message.role === 'assistant' && <div className="message-icon"><RobotIcon /></div>}
              <div className="message-text">{message.content}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="controls">
        {!conversationStarted ? (
          <button 
            className="start-button"
            onClick={startConversation}
          >
            <MicrophoneIcon /> Start Conversation
          </button>
        ) : (
          <div className="control-buttons">
            <button 
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <StopIcon /> : <MicrophoneIcon />}
              {visualizerActive && <div className="visualizer"><WaveformIcon /></div>}
            </button>
          </div>
        )}
        
        <p className="standup-status">
          {isProcessing && <span className="processing-indicator"></span>}
          {getStatusText()}
        </p>
      </div>
    </div>
  )
}

export default StandupAssistant 