import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { useGeminiBrain } from '../hooks/useGeminiBrain';
import { CreatorTool } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { AiServiceError } from '../services/aiService';
import {
  MousePointer2, Pencil, Type, Square, Circle, Trash2, Triangle, PaintBucket,
  Mic, Image as ImageIcon, Send, Layers, ChevronUp, ChevronDown, X, AlertCircle,
  Activity, Cpu, MessageSquare, Sun, Moon, Minus, Plus, Maximize, ChevronLeft, ChevronRight, Undo2, Redo2, Sparkles, Network, Star,
  Square as StopIcon,
  CircleStop,
  Loader2,
  FileText, Clock, MoreHorizontal, PencilRuler, HelpCircle, Users, Settings, CheckSquare
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { FileUploadButton } from './FileUploadButton';
import { AttachedDocumentBadge } from './AttachedDocumentBadge';
import { DrawingToolbar } from './DrawingToolbar';
import { sounds } from '../utils/sounds';
import { useTranslation } from '../utils/translations';
import { toast } from '../utils/toast';
import { useAiStatus } from '../hooks/useAiStatus';

const SPEECH_TYPE_MESSAGE = 'Speech could not be heard. Type the question.';
let lastSpeechFailureToastAt = 0;

const isSpeechBusyFailure = (status: number, code: string, detail: string) => {
  const raw = `${status} ${code} ${detail}`.toLowerCase();
  return status === 429 || status === 402
    || code === 'rate_limited' || code === 'missing_key'
    || raw.includes('quota') || raw.includes('too many') || raw.includes('resource_exhausted')
    || raw.includes('prepayment') || raw.includes('speech could not be heard');
};

const showSpeechFailureToast = (message: string) => {
  const now = Date.now();
  if (now - lastSpeechFailureToastAt < 2500) return;
  lastSpeechFailureToastAt = now;
  toast.warning(message);
};

interface ChatInterfaceProps {
  canvasRef: React.MutableRefObject<any>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ canvasRef }) => {
  const { t, language } = useTranslation();
  const [input, setInput] = useState('');
  const [interimInput, setInterimInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const [recordingMethod, setRecordingMethod] = useState<'webspeech' | 'mediarecorder'>('webspeech');

  const transcriptBufferRef = useRef('');
  const interimBufferRef = useRef('');
  const isListeningRef = useRef(isListening);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastShape, setLastShape] = useState<CreatorTool>('RECTANGLE');

  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUploadInputRef = useRef<HTMLInputElement>(null);
  const transcribeInFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const {
    isThinking, isActing, actionQueue, logs,
    lastUploadedImage, setLastUploadedImage, abortTask, zoom, setViewport,
    isCreatorMode, toggleCreatorMode, activeTool, setActiveTool, setBrushColor, brushColor,
    removeDomElement, agentMessage, theme, toggleTheme, undoCanvas, redoCanvas, inputMode, setInputMode,
    isShapeFilled, setShapeFilled,
    fontFamily, setFontFamily, fontSize, setFontSize,
    pages, currentPageIndex, switchPage, addPage, removePage,
    isAiDrawerOpen, isAiModalOpen, isViewerUrl,
    toggleTimer, toggleCalculator, toggleNotes, toggleQuiz,
    toggleUnitConverter, togglePeriodicTable, toggleAttendance, toggleTodoList, toggleBoardSettings,
    transcribeMode, selectedVertexModel, selectedGeminiModel, selectedOllamaModel, geminiApiKey, voiceConfig,
    aiPreference
  } = useStore();

  const liveAiStatus = useAiStatus();
  const isOfflineMode = aiPreference === 'ollama' || liveAiStatus.mode === 'ollama';
  const activeModelDisplay = isOfflineMode
    ? ((selectedOllamaModel || (liveAiStatus.mode === 'ollama' ? liveAiStatus.model : 'inclu-gemma:2b') || 'inclu-gemma:2b') === 'inclu-gemma:2b'
        || /gemma|Chalk|Inclu|chalk-model/i.test(selectedOllamaModel || liveAiStatus.model || '')
          ? 'Inclu local model'
          : (selectedOllamaModel || (liveAiStatus.mode === 'ollama' ? liveAiStatus.model : 'inclu-gemma:2b') || 'inclu-gemma:2b'))
    : (aiPreference === 'vertex' || liveAiStatus.mode === 'vertex')
    ? (selectedVertexModel || 'Vertex AI')
    : (selectedGeminiModel || 'Gemini Cloud');

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranscribing(true);
    setVoiceNotice('Uploading and transcribing audio...');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          const storeState = useStore.getState();
          const response = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Audio,
              selectedVertexModel: storeState.selectedVertexModel,
              selectedGeminiModel: storeState.selectedGeminiModel,
              selectedOllamaModel: storeState.selectedOllamaModel,
              language: storeState.voiceConfig?.language || 'en-US',
              geminiApiKey: storeState.geminiApiKey,
              aiPreference: storeState.aiPreference
            })
          });

          if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);
          const data = await response.json();
          if (data.text && data.text.trim()) {
            if (voiceConfig.autoSubmit) {
              handleSubmitInternal(data.text.trim());
            } else {
              setInput(data.text.trim());
              useStore.getState().setChatInputText(data.text.trim());
              if (!useStore.getState().isAiDrawerOpen && !useStore.getState().isAiModalOpen) useStore.getState().toggleAiDrawer();
              toast.info('The transcript was placed in the input field.');
            }
          } else {
            setVoiceNotice('No speech was detected in the audio.');
          }
        } catch (err: any) {
          setVoiceNotice('Could not transcribe: ' + (err.message || String(err)));
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsTranscribing(false);
      setVoiceNotice('Could not read the audio file.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let newZoom = canvas.getZoom();
    if (direction === 'in') newZoom = Math.min(newZoom * 1.1, 20);
    else if (direction === 'out') newZoom = Math.max(newZoom / 1.1, 0.01);
    else newZoom = 1;

    if (direction === 'reset') {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.setZoom(1);
    } else {
      canvas.zoomToPoint({ x: canvas.width / 2, y: canvas.height / 2 }, newZoom);
    }
    setViewport(newZoom, [...canvas.viewportTransform]);
  };
  const { processUserPrompt } = useGeminiBrain();

  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioVolume, setAudioVolume] = useState(0);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

  const startVisualizer = useCallback((stream: MediaStream) => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        context.resume();
      }
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 128; // Higher detail for visualizer
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Boost sensitivity for visualization
        const boostedData = new Uint8Array(dataArray.length);
        for(let i=0; i<dataArray.length; i++) {
          boostedData[i] = Math.min(255, dataArray[i] * 2);
        }
        setAudioData(boostedData);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioVolume(average);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.error("Visualizer setup failed:", e);
    }
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().then(() => {
        audioContextRef.current = null;
      }).catch(() => {});
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setAudioVolume(0);
    setAudioData(new Uint8Array(0));
  }, []);

  useEffect(() => {
    return () => {
      stopVisualizer();
    };
  }, [stopVisualizer]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, agentMessage]);

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
      return true;
    } catch (err) {
      console.error("Mic permission error:", err);
      setMicPermission('denied');
      return false;
    }
  };

  useEffect(() => {
    // Check permission on mount if possible
    navigator.permissions?.query?.({ name: 'microphone' as any }).then(status => {
      setMicPermission(status.state as any);
      status.onchange = () => setMicPermission(status.state as any);
    }).catch(() => {
      // Fallback if permissions API not supported
    });

    if (typeof window !== 'undefined') {
      const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      const hasMediaRecorder = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      if (hasSpeechRecognition) {
        setRecordingMethod('webspeech');
        setSpeechSupported(true);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true; // Use continuous for better experience
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = voiceConfig?.language || 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (finalTranscript) {
            const trimmed = finalTranscript.trim();
            if (trimmed) {
              const currentBase = transcriptBufferRef.current;
              const updated = currentBase ? currentBase + ' ' + trimmed : trimmed;
              transcriptBufferRef.current = updated;
              setInput(updated);
              useStore.getState().setChatInputText(updated);
              interimBufferRef.current = '';
              setInterimInput('');
              useStore.getState().setInterimInputText('');
            }
          } else {
            interimBufferRef.current = interimTranscript;
            setInterimInput(interimTranscript);
            useStore.getState().setInterimInputText(interimTranscript);
          }
        };

        recognitionRef.current.onspeechend = () => {
          console.log("Speech ended detected");
        };

        recognitionRef.current.onstart = () => {
          console.log("Speech recognition started");
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("STT Error detailed:", event.error, event.message);
          if (event.error === 'network') {
            const msg = 'Browser speech recognition (Web Speech API) needs an internet connection in Chrome on Windows. While offline, type in the text field or choose a template.';
            setVoiceNotice(msg);
            toast.warning(msg);
          } else if (event.error === 'not-allowed') {
            const msg = 'Microphone permission was not granted. Allow microphone access in your browser.';
            setVoiceNotice(msg);
            toast.warning(msg);
            setMicPermission('denied');
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            const msg = `Voice recording stopped (${event.error}).`;
            setVoiceNotice(msg);
          }

          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setIsListening(false);
            stopVisualizer();
          }
        };

        recognitionRef.current.onend = () => {
          // Chrome SpeechRecognition natively stops after short silence (~8-10s).
          // Silently resume if user is still actively recording, preserving all previous text.
          if (isListeningRef.current && !isTranscribing) {
            try {
              recognitionRef.current.start();
            } catch(e) {
              // If already started or inactive, ignore
            }
          }
        };
      } else if (hasMediaRecorder) {
        setRecordingMethod('mediarecorder');
        setSpeechSupported(true);
        recognitionRef.current = null;
      } else {
        setSpeechSupported(false);
        recognitionRef.current = null;
      }
    }
  }, [language]);

  // Keep local input synchronized with store.chatInputText and isListening with store.isVoiceListening
  const storeChatInputText = useStore(state => state.chatInputText);
  useEffect(() => {
    if (storeChatInputText !== input) {
      setInput(storeChatInputText);
    }
  }, [storeChatInputText]);

  useEffect(() => {
    useStore.getState().setVoiceListening(isListening);
  }, [isListening]);

  useEffect(() => {
    const handleStartMic = () => {
      if (!isListening) toggleListening();
    };
    const handleToggleMic = () => {
      toggleListening();
    };
    const handleExecuteVoicePrompt = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      const promptText = customEvent.detail?.prompt?.trim();
      if (promptText) {
        setInput(promptText);
        useStore.getState().setChatInputText(promptText);
        handleSubmitInternal(promptText);
      }
    };
    window.addEventListener('start-mic', handleStartMic);
    window.addEventListener('toggle-mic', handleToggleMic);
    window.addEventListener('execute-voice-prompt', handleExecuteVoicePrompt);
    return () => {
      window.removeEventListener('start-mic', handleStartMic);
      window.removeEventListener('toggle-mic', handleToggleMic);
      window.removeEventListener('execute-voice-prompt', handleExecuteVoicePrompt);
    };
  }, [isListening]);

  const toggleListening = async () => {
    if (transcribeMode === 'upload_audio') {
      audioUploadInputRef.current?.click();
      return;
    }

    const isWebSpeech = transcribeMode === 'webspeech';

    if (isListening) {
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      setIsListening(false);
      sounds.play('mic_off');
      stopVisualizer();

      if (isWebSpeech) {
        recognitionRef.current?.stop();
        // Wait up to 600ms for final SpeechRecognition results to flush
        await new Promise(r => setTimeout(r, 600));
        const finalLocalTranscript = transcriptBufferRef.current.trim() || interimBufferRef.current.trim();
        if (finalLocalTranscript || useStore.getState().attachedDocument || useStore.getState().lastUploadedImage) {
          if (voiceConfig.autoSubmit) {
            handleSubmitInternal(finalLocalTranscript);
          } else {
            setInput(finalLocalTranscript);
            useStore.getState().setChatInputText(finalLocalTranscript);
            if (!useStore.getState().isAiDrawerOpen && !useStore.getState().isAiModalOpen) useStore.getState().toggleAiDrawer();
            toast.info('The voice result was placed in the input field.');
          }
        }
        transcriptBufferRef.current = '';
        interimBufferRef.current = '';
        if (voiceConfig.autoSubmit) setInput('');
        setInterimInput('');
        if (voiceConfig.autoSubmit) useStore.getState().setChatInputText('');
        useStore.getState().setInterimInputText('');
      } else {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          setIsTranscribing(true);
          mediaRecorderRef.current.stop();
        }
      }
    } else {
      if (isWebSpeech && !speechSupported) {
        const fallbackMessage = t('voiceUnsupported', 'This browser does not support local speech recognition (Web Speech API). Please use the text field.');
        setVoiceNotice(fallbackMessage);
        if (!useStore.getState().isAiDrawerOpen && !useStore.getState().isAiModalOpen) useStore.getState().toggleAiDrawer();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceNotice("This browser does not support microphone access.");
        return;
      }

      try {
        setVoiceNotice(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: voiceConfig.echoCancellation,
            noiseSuppression: voiceConfig.noiseSuppression,
            autoGainControl: voiceConfig.autoGainControl
          }
        });
        audioStreamRef.current = stream;
        setMicPermission('granted');

        sounds.play('mic_on');
        setIsListening(true);
        setInput('');
        setInterimInput('');
        transcriptBufferRef.current = '';
        interimBufferRef.current = '';

        startVisualizer(stream);

        if (isWebSpeech) {
          if (recognitionRef.current) {
            const targetLang = voiceConfig?.language || 'en-US';
            recognitionRef.current.lang = targetLang;
            try { recognitionRef.current.stop(); } catch(e) {}

            setTimeout(() => {
              try {
                recognitionRef.current.start();
              } catch(e) {
                setIsListening(false);
                stopVisualizer();
              }
            }, 100);
          }
        } else {
          chunksRef.current = [];
          let options = {};
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            options = { mimeType: 'audio/webm;codecs=opus' };
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
          } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            options = { mimeType: 'audio/ogg;codecs=opus' };
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' };
          }

          const mediaRecorder = new MediaRecorder(stream, options);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };

          mediaRecorder.onstop = async () => {
            if (transcribeInFlightRef.current) return;
            transcribeInFlightRef.current = true;
            const blobType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(chunksRef.current, { type: blobType });
            
            if (audioStreamRef.current) {
              audioStreamRef.current.getTracks().forEach(track => track.stop());
              audioStreamRef.current = null;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
              const storeState = useStore.getState() as any;
              if (typeof reader.result !== 'string' || !reader.result) {
                transcribeInFlightRef.current = false;
                setIsTranscribing(false);
                setVoiceNotice(null);
                showSpeechFailureToast("Couldn't transcribe speech: Could not read the recording.");
                return;
              }
              try {
                const base64 = reader.result.split(',')[1];
                const aiPreference = storeState.aiPreference || 'auto';
                const savedKey = typeof storeState.geminiApiKey === 'string' ? storeState.geminiApiKey.trim() : '';
                const geminiApiKey = savedKey || undefined;
                const ollamaBaseUrl = storeState.ollamaBaseUrl || undefined;

                const response = await fetch('/api/ai/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    base64Audio: base64,
                    aiPreference,
                    geminiApiKey,
                    ollamaBaseUrl,
                    selectedVertexModel: storeState.selectedVertexModel,
                    selectedGeminiModel: storeState.selectedGeminiModel,
                    selectedOllamaModel: storeState.selectedOllamaModel,
                    language: storeState.voiceConfig?.language || 'en-US',
                    transcribeMode: storeState.transcribeMode
                  })
                });

                if (!response.ok) {
                  let payload: any = null;
                  try { payload = await response.json(); } catch { /* status text is enough */ }
                  const code = String(payload?.code || '');
                  const detail = String(payload?.error || '');
                  if (isSpeechBusyFailure(response.status, code, `${detail} ${response.statusText}`)) {
                    const busy: any = new Error(detail || SPEECH_TYPE_MESSAGE);
                    busy.speechBusy = true;
                    throw busy;
                  }
                  throw new Error(`Couldn't transcribe speech: ${detail || response.statusText || 'Transcription failed'}`);
                }

                const data = await response.json();
                if (data.text && data.text.trim()) {
                  if (voiceConfig.autoSubmit) {
                    handleSubmitInternal(data.text.trim());
                  } else {
                    setInput(data.text.trim());
                    useStore.getState().setChatInputText(data.text.trim());
                    if (!useStore.getState().isAiDrawerOpen && !useStore.getState().isAiModalOpen) useStore.getState().toggleAiDrawer();
                    toast.info('The transcript was placed in the input field.');
                  }
                }
              } catch (err: any) {
                console.error("Transcription error:", err);
                const isOfflineOllama = storeState.aiPreference === 'ollama' || (typeof navigator !== 'undefined' && !navigator.onLine);
                if (storeState.transcribeMode === 'faster_whisper') {
                  useStore.getState().setTranscribeMode('webspeech');
                }
                const message = err?.speechBusy
                  ? (err.message || SPEECH_TYPE_MESSAGE)
                  : isOfflineOllama
                    ? 'Switched to browser speech recognition (Web Speech). Please click the mic again to speak!'
                    : (String(err?.message || '').startsWith("Couldn't transcribe speech:")
                        ? err.message
                        : `Couldn't transcribe speech: ${err?.message || String(err)}`);
                setVoiceNotice(null);
                showSpeechFailureToast(message);
              } finally {
                transcribeInFlightRef.current = false;
                setIsTranscribing(false);
              }
            };
            reader.readAsDataURL(audioBlob);
          };

          // Continuous recording: records uninterrupted until teacher explicitly clicks stop button
          mediaRecorder.start(transcribeMode === 'gemini_live' ? 3000 : undefined);

          // Clear any dangling auto-stop timer to prevent accidental cutoffs
          if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
          }
        }
      } catch (err) {
        setMicPermission('denied');
        setVoiceNotice("Please allow microphone access, or use text input.");
        if (!useStore.getState().isAiDrawerOpen && !useStore.getState().isAiModalOpen) useStore.getState().toggleAiDrawer();
      }
    }
  };

  const handleSendVoice = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    const isWebSpeech = transcribeMode === 'webspeech';
    if (isWebSpeech) {
      const finalInput = transcriptBufferRef.current.trim() || interimBufferRef.current.trim();
      if (finalInput || useStore.getState().attachedDocument || useStore.getState().lastUploadedImage) {
        handleSubmitInternal(finalInput);
        transcriptBufferRef.current = '';
        interimBufferRef.current = '';
        setInput('');
        setInterimInput('');
        useStore.getState().setChatInputText('');
        useStore.getState().setInterimInputText('');
      }

      if (isListening) {
        setIsListening(false);
        recognitionRef.current?.stop();
        stopVisualizer();
      }
    } else {
      if (isListening) {
        setIsListening(false);
        stopVisualizer();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          setIsTranscribing(true);
          mediaRecorderRef.current.stop();
        }
      }
    }
  };


  const handleCanvasImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      useStore.getState().addLog(`Image added to canvas: ${file.name}`);

      if (canvasRef.current) {
        window.fabric.Image.fromURL(base64, (img: any) => {
          const id = `img_${Date.now()}`;
          img.scaleToWidth(250);
          img.set({
            left: window.innerWidth/2, top: window.innerHeight/2, originX: 'center', originY: 'center', id: id,
            cornerColor: '#00f0ff', cornerSize: 10, transparentCorners: false
          });
          canvasRef.current.add(img);
          canvasRef.current.requestRenderAll();
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitInternal(input);
  };

  const handleSubmitInternal = async (text: string) => {
    const attachedDoc = useStore.getState().attachedDocument;
    const defaultPrompt = attachedDoc 
      ? (attachedDoc.category === 'image' 
          ? t('pleaseAnalyzeImage', 'Please analyze this image.') 
          : t('pleaseAnalyzeDocument', 'Please analyze this document and explain the key points on the whiteboard.'))
      : (useStore.getState().lastUploadedImage ? t('pleaseAnalyzeImage', 'Please analyze this image.') : '');
    const finalTxt = text.trim() || defaultPrompt;
    if (!finalTxt || isThinking) return;
    setInput('');
    useStore.getState().addMessage({ role: 'user', text: finalTxt });
    await processUserPrompt(finalTxt, canvasRef);
  };

  const handleDeleteSelection = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj: any) => {
        canvas.remove(obj);
        if (obj.isDomPlaceholder) removeDomElement(obj.id);
      });
      canvas.discardActiveObject().requestRenderAll();
      useStore.getState().addLog(`Menghapus ${activeObjects.length} objek.`);
    }
  };

  const isBusy = isThinking || isActing || actionQueue.length > 0;

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const ToolBtn = ({ tool, icon: Icon, isAction, onClick, className = '' }: { tool?: CreatorTool, icon: any, isAction?: boolean, onClick?: () => void, className?: string }) => {
    const isActive = tool && activeTool === tool;
    return (
      <motion.button
        whileHover={{ scale: isActive ? 1.05 : 1.02, backgroundColor: isActive ? '' : 'rgb(241 245 249)' }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          if (tool) setActiveTool(tool);
          if (onClick) onClick();
        }}
        className={`flex items-center justify-center w-9.5 h-9.5 lg:w-10.5 lg:h-10.5 rounded-xl lg:rounded-[1.1rem] transition-colors ${
          isActive
            ? 'text-[#FFF6EE] bg-[#6B4423] shadow-[0_8px_16px_rgba(107,68,35,0.25)] ring-4 ring-[#6B4423]/15'
            : 'text-[#A08B7A] hover:text-[#6B4423]'
        } ${className}`}
      >
        <Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} />
      </motion.button>
    );
  };

  if (isViewerUrl) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        <div className="absolute bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-40">
           <div className="bg-slate-900/80 backdrop-blur-md text-white text-[13px] font-medium px-4 py-2.5 rounded-2xl shadow-lg border border-white/10 flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="tracking-wide">{t('watchingTeacher', "You are viewing the teacher's screen")}</span>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">

      {/* Left Drawing Toolbar */}
      <DrawingToolbar
        canvasRef={canvasRef}
        onImageUpload={() => document.getElementById('canvas-upload')?.click()}
        onDeleteSelection={handleDeleteSelection}
        onZoom={handleZoom}
      />
      <input id="canvas-upload" type="file" className="hidden" accept="image/*" onChange={handleCanvasImageUpload} />

      {/* Top Right Zoom Controls */}
      <div className="absolute top-4 lg:top-5 right-4 lg:right-6 pointer-events-auto z-20">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FBF6F0]/95 backdrop-blur-xl rounded-full shadow-lg border border-[#E7DDD2]">
          <button
            onClick={() => handleZoom('out')}
            className="w-8 h-8 flex items-center justify-center text-[#A08B7A] hover:text-[#6B4423] hover:bg-[#F3EBE3] rounded-full transition-all active:scale-90 cursor-pointer"
            title="Zoom out (-)"
          >
            <Minus size={16} />
          </button>
          <span className="text-[13px] font-black text-[#6B4423] min-w-12 text-center tracking-tight select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom('in')}
            className="w-8 h-8 flex items-center justify-center text-[#A08B7A] hover:text-[#6B4423] hover:bg-[#F3EBE3] rounded-full transition-all active:scale-90 cursor-pointer"
            title="Zoom in (+)"
          >
            <Plus size={16} />
          </button>
          <div className="w-px h-4 bg-[#E7DDD2] mx-1" />
          <button
            onClick={() => handleZoom('reset')}
            className="w-8 h-8 flex items-center justify-center text-[#8A7568] hover:text-[#3F2A1D] hover:bg-[#F3EBE3] rounded-full transition-all active:scale-90 cursor-pointer"
            title="Fit to screen (0)"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>

      {/* ====== BOTTOM CONTROLS ====== */}
      <div className="absolute bottom-4 lg:bottom-6 left-3 lg:left-6 right-3 lg:right-6 pointer-events-none flex flex-col md:flex-row items-center md:items-end md:justify-between z-40 gap-4">

        {/* Left: Empty for flex space */}
        <div className="flex-1 hidden md:block"></div>

        {/* Center: AI Status & Voice Control */}
        <div className="relative flex flex-col items-center gap-2">

          {/* Persistent Voice Notice / Error Banner */}
          <AnimatePresence>
            {voiceNotice && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="pointer-events-auto w-[min(90vw,480px)] bg-amber-50/95 backdrop-blur-md rounded-2xl border border-amber-200/90 shadow-lg p-3 text-xs text-amber-900 flex items-start gap-2.5 z-50 mb-1"
              >
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">
                  {voiceNotice}
                </div>
                <button
                  onClick={() => setVoiceNotice(null)}
                  className="text-amber-500 hover:text-amber-800 p-0.5 rounded cursor-pointer transition-colors"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transcript bubble — expands UPWARD above the bar */}
          <AnimatePresence>
            {isListening && showTranscript && (input || interimInput || voiceNotice) && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95, pointerEvents: 'none' }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="pointer-events-auto w-[min(88vw,520px)] bg-[#FFF6EE]/97 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(63,42,29,0.12)] border border-[#E7DDD2] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#6B4423] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#6B4423] rounded-full animate-pulse" />
                    {isListening ? 'Transcribing...' : 'Transcript'}
                  </span>
                  <button
                    onClick={() => setShowTranscript(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Hide"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto">
                  <p className="text-[13.5px] leading-relaxed text-slate-800">
                    {input}
                    {interimInput && <span className="text-slate-400 italic"> {interimInput}</span>}
                    {voiceNotice && !input && !interimInput && <span className="text-amber-600">{voiceNotice}</span>}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show-transcript button when collapsed */}
          <AnimatePresence>
            {isListening && !showTranscript && (input || interimInput) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setShowTranscript(true)}
                className="pointer-events-auto text-[11px] font-semibold text-[#6B4423] bg-[#F4B183]/25 hover:bg-[#F4B183]/35 border border-[#E7DDD2] px-3 py-1 rounded-full transition-colors flex items-center gap-1"
              >
                <ChevronUp size={12} /> Show transcript
              </motion.button>
            )}
          </AnimatePresence>

          {/* Voice island bar — stays compact, never stretches sideways */}
          <AnimatePresence>
            {!isAiDrawerOpen && !isAiModalOpen && (
              <motion.div
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 20, scale: 0.95, pointerEvents: 'none' }}
                 transition={{ type: "spring", stiffness: 400, damping: 25 }}
                 className="pointer-events-auto flex items-center gap-3 px-3 py-3 bg-[#FBF6F0]/95 backdrop-blur-xl rounded-4xl shadow-[0_16px_32px_rgba(63,42,29,0.08)] border border-[#E7DDD2] origin-bottom"
              >
                 <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center text-[#6B4423] transition-all ${isListening ? '' : 'w-11 h-11 rounded-[1.2rem] bg-[#F6D7A8] border border-[#E7DDD2] shadow-sm'}`}>
                       {isListening ? <AudioVisualizer isListening={isListening} audioData={audioData} /> :
                        isThinking ? <Loader2 size={20} className="animate-spin" /> :
                        isTranscribing ? <Activity size={20} className="animate-pulse" /> :
                        <Sparkles size={20} />}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[13.5px] font-bold text-slate-800 leading-tight whitespace-nowrap">
                         {isThinking ? `Working with ${activeModelDisplay}` :
                          isTranscribing ? 'Transcribing...' :
                          isListening ? (speechSupported ? 'Listening...' : 'Recording...') :
                          voiceNotice ? 'Heads up' :
                          'Ready'}
                       </span>
                       <span className="text-[11.5px] font-medium text-[#A08B7A] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                         {isListening || isThinking ? (
                            <span className="flex gap-1.5 items-center">
                              <span className={isOfflineMode ? "text-emerald-600 font-bold" : "text-[#6B4423] font-bold"}>
                                {activeModelDisplay} • {isOfflineMode ? 'Offline' : 'Cloud'}
                              </span>
                              <div className="flex gap-1">
                                <div className={`w-1.5 h-1.5 ${isOfflineMode ? 'bg-emerald-500' : 'bg-[#6B4423]'} rounded-full animate-bounce`} />
                                <div className={`w-1.5 h-1.5 ${isOfflineMode ? 'bg-emerald-500' : 'bg-[#6B4423]'} rounded-full animate-bounce`} style={{animationDelay: '0.1s'}} />
                                <div className={`w-1.5 h-1.5 ${isOfflineMode ? 'bg-emerald-500' : 'bg-[#6B4423]'} rounded-full animate-bounce`} style={{animationDelay: '0.2s'}} />
                              </div>
                            </span>
                         ) : voiceNotice ? (
                            <span className="text-amber-500">{voiceNotice.slice(0, 40)}{voiceNotice.length > 40 ? '…' : ''}</span>
                         ) : speechSupported ? (
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
                              <span>{activeModelDisplay}</span>
                              <span className="text-slate-400">•</span>
                              <span className={isOfflineMode ? 'text-emerald-600 font-semibold' : 'text-[#A08B7A]'}>
                                {isOfflineMode ? 'Offline' : 'Standby'}
                              </span>
                            </span>
                         ) : 'Use text'}
                       </span>
                    </div>
                 </div>

                 <div className="flex items-center gap-1.5 border-l-2 border-[#E7DDD2]/60 pl-4">
                    <AttachedDocumentBadge compact className="mr-2" />
                    <FileUploadButton
                      className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-[#6B4423] hover:bg-[#F4B183]/30 rounded-[1.2rem] transition-colors active:scale-95"
                      icon={<Plus size={22} />}
                      title="Upload a file or image"
                    />

                    <button
                      onClick={() => { setShowTranscript(true); toggleListening(); }}
                      disabled={isTranscribing || isThinking}
                      title={speechSupported ? 'Start voice' : 'Record voice'}
                      className={`w-12 h-12 flex items-center justify-center rounded-[1.3rem] text-[#FBF6F0] shadow-lg transition-all duration-300 ${isListening ? 'bg-red-500 shadow-red-500/25 animate-pulse scale-105 ring-4 ring-red-500/10' : 'bg-[#6B4423] shadow-[#6B4423]/25 hover:scale-105 hover:bg-[#5A3820]'} disabled:opacity-50 disabled:pointer-events-none active:scale-95 shrink-0`}
                    >
                      <Mic size={20} />
                    </button>

                    {(isThinking || isActing || actionQueue.length > 0) && (
                      <button
                        onClick={() => abortTask()}
                        className="w-12 h-12 flex items-center justify-center bg-rose-50 text-red-500 rounded-[1.3rem] hover:bg-red-100 hover:text-red-600 transition-all font-bold group active:scale-95 border border-red-100 shrink-0"
                        title={t('cancelProcess', 'Cancel')}
                      >
                        <Square size={16} className="fill-current group-hover:scale-90 transition-transform" />
                      </button>
                    )}
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Empty for flex balance */}
        <div className="flex-1 hidden md:block" />

        {/* Hidden Audio File Input for Audio Upload Transcribe */}
        <input
          ref={audioUploadInputRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/webm,audio/ogg,audio/m4a,audio/*"
          className="hidden"
          onChange={handleAudioFileUpload}
        />
      </div>
    </div>
  );
};
