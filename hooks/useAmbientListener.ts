/**
 * Inclu Hands-Free Ambient Classroom Listener Hook & Accessibility Engine
 * Enables zero-touch, hands-free voice commands for teachers and disabled users.
 * 
 * Supports:
 *  - Accurate Wake Phrases: "Hey INCLU", "Hey Include", "A Inclu", "OK Inclu", or "Please record these commands"
 *  - Live Continuous Command Dictation with real-time captions
 *  - Finish / Execution Keyword: "Done", "Finished", "Submit", "Selesai" (or "Cancel" to abort)
 *  - Single-shot Spoken Commands: e.g. "Hey Inclu, open a 5 minute timer, done"
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { toast } from '../utils/toast';
import { sounds } from '../utils/sounds';
import { createLogger } from '../utils/logger';
import { normalizeSpokenNumbers, stripConversationalPrefix } from './useGeminiBrain';
import { isNewPageRequest } from '../utils/boardIntent';

const logger = createLogger('ambient-listener');

export interface HandsFreeCommandResult {
  matched: boolean;
  action: string;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCURATE WAKE PHRASES & PHONETIC VARIANTS
// Covers "Hey INCLU", "Hey Include", "A Inclu", "OK Inclu", "Please record these commands"
// ─────────────────────────────────────────────────────────────────────────────
export const WAKE_WORD_REGEX = /(?:^|\b)(?:(?:hey|hai|halo|ok|oke|hello|hi|ay|ey|a|yo)\s+)?(?:inclu|in\s*clu|in\s*clue|include|inklu|enclu|anclu)\b/i;
export const RECORD_COMMANDS_REGEX = /(?:^|\b)(?:please\s+)?(?:start\s+)?record(?:ing)?\s+(?:these|this)?\s*commands?[:,\s]*/i;

export const DONE_TERMINATION_REGEX = /\b(?:done|i(?:'m| am)? done|finished|that(?:'s| is) all|that(?:'s| is) it|submit|send|selesai|sudah)\b[.!?\s]*$/i;
export const CANCEL_COMMAND_REGEX = /\b(?:cancel|abort|nevermind|batal)\b/i;

export function detectWakePhrase(text: string): { matched: boolean; remainingText: string } {
  const trimmed = text.trim();

  // 1. Check "Please record these commands" pattern
  const recordMatch = trimmed.match(RECORD_COMMANDS_REGEX);
  if (recordMatch && recordMatch.index !== undefined) {
    const after = trimmed.slice(recordMatch.index + recordMatch[0].length).replace(/^[,.:\s]+/, '').trim();
    return { matched: true, remainingText: after };
  }

  // 2. Check "Hey Inclu" pattern
  const wakeMatch = trimmed.match(WAKE_WORD_REGEX);
  if (wakeMatch && wakeMatch.index !== undefined) {
    const after = trimmed.slice(wakeMatch.index + wakeMatch[0].length).replace(/^[,.:\s]+/, '').trim();
    return { matched: true, remainingText: after };
  }

  return { matched: false, remainingText: trimmed };
}

export function detectDoneTermination(text: string): { hasDone: boolean; commandWithoutDone: string } {
  const trimmed = text.trim();
  const match = trimmed.match(DONE_TERMINATION_REGEX);
  if (match && match.index !== undefined) {
    const clean = trimmed.slice(0, match.index).replace(/[,.:\s]+$/, '').trim();
    return { hasDone: true, commandWithoutDone: clean };
  }
  return { hasDone: false, commandWithoutDone: trimmed };
}

export function executeSpokenCommand(commandText: string): HandsFreeCommandResult {
  const clean = stripConversationalPrefix(commandText.trim());
  if (!clean || clean.length < 2) {
    return { matched: false, action: 'EMPTY' };
  }

  // 1. Try local whiteboard shortcut rules first (timer, attendance, wheel, calculator, etc.)
  const localResult = matchAndExecuteHandsFreeCommand(clean);
  if (localResult.matched) {
    return localResult;
  }

  // 2. Fallback: Any other voice command routes directly to the AI Assistant for spatial canvas execution!
  const store = useStore.getState();
  store.setChatInputText(clean);
  if (!store.isAiDrawerOpen && !store.isAiModalOpen) {
    store.toggleAiDrawer();
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('execute-voice-prompt', { detail: { prompt: clean } }));
  }
  sounds.play('pop');
  toast.info(`💡 Inclu Assistant executing: "${clean.slice(0, 36)}..."`);
  return { matched: true, action: 'AI_ASSISTANT', detail: clean };
}

export function matchAndExecuteHandsFreeCommand(rawText: string): HandsFreeCommandResult {
  const normalizedText = normalizeSpokenNumbers(rawText.toLowerCase().trim());
  const store = useStore.getState();

  // Strip wake words & polite prefixes if present
  const clean = stripConversationalPrefix(normalizedText);

  // 1. Timer: "pasang timer 5 menit", "buka timer sepuluh menit", "timer 10 menit"
  const timerMatch = clean.match(/(?:buka\s+|pasang\s+|nyalakan\s+|mulai\s+|set\s+)?timer(?:\s+(\d+))?\s*(?:menit|mnt|min|minutes?)?/i) || normalizedText.match(/timer(?:\s+(\d+))?/i);
  if (timerMatch || clean.includes('hitung mundur')) {
    const minutes = timerMatch && timerMatch[1] ? parseInt(timerMatch[1], 10) : 5;
    const id = `timer_${Date.now()}`;
    store.updateDomElement(id, {
      id,
      html: '<div>Timer</div>',
      componentType: 'TIMER',
      config: { seconds: minutes * 60, mode: 'TIMER' },
      x: 960,
      y: 540,
      width: 320,
      height: 380,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 15
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('addCanvasPlaceholder', {
        detail: { id, x: 960, y: 540, width: 320, height: 380 }
      }));
    }
    sounds.play('success');
    toast.success(`⏱️ Hands-free: ${minutes}-minute timer is on the board.`);
    const unitLabel = clean.includes('menit') || clean.includes('mnt') ? 'menit' : 'minutes';
    return { matched: true, action: 'TIMER', detail: `${minutes} ${unitLabel}` };
  }

  // 2. Attendance / Presensi: "buka absen", "presensi siswa", "absensi"
  if (clean.includes('absen') || clean.includes('presensi') || clean.includes('kehadiran') || clean.includes('attendance')) {
    store.toggleAttendance();
    sounds.play('success');
    toast.success('👥 Hands-free: attendance opened.');
    return { matched: true, action: 'ATTENDANCE' };
  }

  // 3. Random Wheel: "putar roda", "acak giliran", "roda acak", "siapa giliran", "spin wheel"
  if (clean.includes('putar roda') || clean.includes('acak giliran') || clean.includes('roda acak') || clean.includes('giliran') || clean.includes('spin wheel')) {
    const id = `wheel_${Date.now()}`;
    store.updateDomElement(id, {
      id,
      html: '<div>Wheel</div>',
      componentType: 'SPIN_WHEEL',
      config: { title: 'Random student wheel' },
      x: 960,
      y: 540,
      width: 440,
      height: 480,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: 15
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('addCanvasPlaceholder', {
        detail: { id, x: 960, y: 540, width: 440, height: 480 }
      }));
    }
    sounds.play('success');
    toast.success('🎲 Hands-free: random student wheel is on.');
    return { matched: true, action: 'SPIN_WHEEL' };
  }

  // 4. Calculator: "buka kalkulator", "hitung", "calculator"
  if (clean.includes('kalkulator') || clean.includes('calculator') || clean.includes('hitung angka')) {
    store.toggleCalculator();
    sounds.play('success');
    toast.success('🧮 Hands-free: calculator opened.');
    return { matched: true, action: 'CALCULATOR' };
  }

  // 5. Quiz modal: "buka kuis", "mulai kuis" (when not asking AI to generate a topic-specific quiz)
  if ((clean.includes('kuis') || clean.includes('quiz') || clean.includes('ulangan')) && !/\b(tentang|mengenai|soal|materi|topik|about|on)\b/i.test(clean)) {
    store.toggleQuiz();
    sounds.play('success');
    toast.success('❓ Hands-free: quiz opened.');
    return { matched: true, action: 'QUIZ' };
  }

  // 6. Reset camera / Pusatkan layar: "pusatkan layar", "reset kamera", "tengah", "center canvas"
  if (clean.includes('pusatkan') || clean.includes('reset kamera') || clean.includes('tengah') || clean.includes('center canvas')) {
    store.setViewport(1, [1, 0, 0, 1, 0, 0]);
    sounds.play('success');
    toast.success('🧭 Hands-free: canvas centered.');
    return { matched: true, action: 'RESET_VIEWPORT' };
  }

  // 7. Clear canvas: "bersihkan papan", "hapus papan", "hapus coretan", "clear board", "clear canvas"
  if (clean.includes('bersihkan papan') || clean.includes('hapus papan') || clean.includes('hapus semua coretan') || clean.includes('clear board') || clean.includes('clear canvas')) {
    window.dispatchEvent(new CustomEvent('clearCanvas'));
    sounds.play('pop');
    toast.info('🧹 Hands-free: whiteboard cleared.');
    return { matched: true, action: 'CLEAR_CANVAS' };
  }

  // 8. Undo / Redo / New Page hands-free
  if (/^(undo|batalkan)(?:\s+aksi)?$/i.test(clean)) {
    store.undoCanvas();
    sounds.play('pop');
    return { matched: true, action: 'UNDO' };
  }
  if (/^(redo|ulangi)(?:\s+aksi)?$/i.test(clean)) {
    store.redoCanvas();
    sounds.play('pop');
    return { matched: true, action: 'REDO' };
  }
  if (isNewPageRequest(clean)) {
    store.addPage();
    sounds.play('success');
    toast.success('New page opened.');
    return { matched: true, action: 'ADD_PAGE' };
  }

  // 9. General AI Smartboard Command / Mindmap / Question / In-Place Modification
  if (
    clean.includes('peta konsep') ||
    clean.includes('mindmap') ||
    clean.includes('diagram') ||
    clean.includes('kuis') ||
    clean.includes('quiz') ||
    /^(buat|buatkan|gambar|gambarkan|jelaskan|terangkan|ubah|edit|perbarui|tambahkan|rangkum|ringkas|apa|mengapa|kenapa|bagaimana|siapa|create|draw|explain|modify|update|what|how|why|solve|plot)\b/i.test(clean)
  ) {
    store.setChatInputText(rawText);
    if (!store.isAiDrawerOpen && !store.isAiModalOpen) store.toggleAiDrawer();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('execute-voice-prompt', { detail: { prompt: clean } }));
    }
    sounds.play('pop');
    toast.info(`💡 Hands-free: sending to the assistant: "${clean.slice(0, 36)}..."`);
    return { matched: true, action: 'AI_ASSISTANT', detail: clean };
  }

  return { matched: false, action: 'UNKNOWN' };
}

export interface UseAmbientListenerOptions {
  onTranscriptDetected?: (transcript: string) => void;
  sliceIntervalMs?: number;
}

export function useAmbientListener(options: UseAmbientListenerOptions = {}) {
  const { sliceIntervalMs = 5000 } = options;
  const isHandsFreeListening = useStore((s) => s.isHandsFreeListening);
  const setHandsFreeListening = useStore((s) => s.setHandsFreeListening);
  const setLastVoiceCommand = useStore((s) => s.setLastVoiceCommand);
  const isVoiceCommandActive = useStore((s) => s.isVoiceCommandActive);
  const setVoiceCommandActive = useStore((s) => s.setVoiceCommandActive);
  const voiceInterimCaption = useStore((s) => s.voiceInterimCaption);
  const setVoiceInterimCaption = useStore((s) => s.setVoiceInterimCaption);

  const [isProcessingSnippet, setIsProcessingSnippet] = useState(false);
  const [interimCaption, setInterimCaption] = useState('');

  const speechRecognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const isAmbientActiveRef = useRef(isHandsFreeListening);
  const isCommandRecordingRef = useRef(isVoiceCommandActive);
  const commandBufferRef = useRef<string>('');

  useEffect(() => {
    isAmbientActiveRef.current = isHandsFreeListening;
  }, [isHandsFreeListening]);

  useEffect(() => {
    isCommandRecordingRef.current = isVoiceCommandActive;
  }, [isVoiceCommandActive]);

  // Pause ambient speech recognition when user opens manual voice chat in ChatInterface
  const isVoiceListening = useStore((s) => s.isVoiceListening);
  useEffect(() => {
    if (isVoiceListening) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
    } else {
      if (isAmbientActiveRef.current && speechRecognitionRef.current) {
        try { speechRecognitionRef.current.start(); } catch {}
      }
    }
  }, [isVoiceListening]);

  // Clears active silence timer
  const clearSilenceTimeout = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Finalizes and executes the accumulated command buffer
  const finalizeAndExecuteCommand = useCallback(() => {
    clearSilenceTimeout();
    const complete = commandBufferRef.current.trim();
    setVoiceCommandActive(false);
    isCommandRecordingRef.current = false;
    commandBufferRef.current = '';
    setInterimCaption('');
    setVoiceInterimCaption('');

    if (complete.length > 1) {
      sounds.play('success');
      toast.success('🎙️ Command received! Executing...');
      setLastVoiceCommand(complete);
      executeSpokenCommand(complete);
    }
  }, [setVoiceCommandActive, setVoiceInterimCaption, setLastVoiceCommand]);

  // Cancels the current voice command without executing
  const cancelCommand = useCallback(() => {
    clearSilenceTimeout();
    setVoiceCommandActive(false);
    isCommandRecordingRef.current = false;
    commandBufferRef.current = '';
    setInterimCaption('');
    setVoiceInterimCaption('');
    sounds.play('mic_off');
    toast.info('Voice command cancelled');
  }, [setVoiceCommandActive, setVoiceInterimCaption]);

  // Faster-Whisper slice audio buffer fallback for environments without Web Speech API
  const transcribeAudioSnippet = async (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          if (!base64Audio || base64Audio.length < 500) {
            resolve('');
            return;
          }

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Audio,
              language: useStore.getState().language || 'en',
              model: 'tiny',
              mode: 'faster_whisper'
            })
          });

          if (!res.ok) {
            resolve('');
            return;
          }

          const data = await res.json();
          resolve(data.text?.trim() || '');
        } catch (err) {
          logger.warn('[Ambient Listener] Snippet transcription error', err);
          resolve('');
        }
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(audioBlob);
    });
  };

  const processAudioBuffer = useCallback(async () => {
    if (audioChunksRef.current.length === 0 || isProcessingSnippet) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    if (audioBlob.size < 2000) return;

    setIsProcessingSnippet(true);
    try {
      const transcript = await transcribeAudioSnippet(audioBlob);
      if (transcript && transcript.length > 2) {
        logger.info('[Ambient Listener] Detected speech:', { transcript });

        // Check for cancellation
        if (CANCEL_COMMAND_REGEX.test(transcript) && isCommandRecordingRef.current) {
          cancelCommand();
          return;
        }

        if (!isCommandRecordingRef.current) {
          const wake = detectWakePhrase(transcript);
          if (wake.matched) {
            const doneCheck = detectDoneTermination(wake.remainingText);
            if (doneCheck.hasDone && doneCheck.commandWithoutDone.length > 1) {
              // Single shot
              sounds.play('success');
              toast.success(`🎙️ Spoken command: "${doneCheck.commandWithoutDone.slice(0, 36)}..."`);
              executeSpokenCommand(doneCheck.commandWithoutDone);
            } else {
              setVoiceCommandActive(true);
              isCommandRecordingRef.current = true;
              commandBufferRef.current = wake.remainingText;
              sounds.play('mic_on');
              toast.info('🎙️ Hey Inclu is listening! Say your command, then say "Done".');
            }
          }
        } else {
          const doneCheck = detectDoneTermination(transcript);
          if (doneCheck.hasDone) {
            const finalPiece = doneCheck.commandWithoutDone;
            commandBufferRef.current = (commandBufferRef.current + ' ' + finalPiece).trim();
            finalizeAndExecuteCommand();
          } else {
            commandBufferRef.current = (commandBufferRef.current + ' ' + transcript).trim();
          }
        }
      }
    } finally {
      setIsProcessingSnippet(false);
    }
  }, [isProcessingSnippet, cancelCommand, finalizeAndExecuteCommand, setVoiceCommandActive]);

  const startAmbient = async () => {
    try {
      // 0. Ensure microphone access permission is granted via getUserMedia
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          streamRef.current = stream;
        } catch (err: any) {
          logger.warn('[Ambient Listener] Microphone access not granted', err);
          toast.warning('Microphone permission required for Hands-Free mode. Click to allow.');
          setHandsFreeListening(false);
          return;
        }
      }

      // 1. Try real-time Continuous Web Speech API first
      const SpeechRecognition = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (SpeechRecognition) {
        if (speechRecognitionRef.current) {
          try { speechRecognitionRef.current.stop(); } catch {}
          speechRecognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        const langLocaleMap: Record<string, string> = {
          id: 'id-ID', en: 'en-US', ar: 'ar-SA', zh: 'zh-CN', fr: 'fr-FR',
          ru: 'ru-RU', es: 'es-ES', ja: 'ja-JP', ko: 'ko-KR', de: 'de-DE', pt: 'pt-BR'
        };
        const voiceLang = useStore.getState().voiceConfig?.language;
        const activeLang = useStore.getState().language || 'en';
        recognition.lang = voiceLang || langLocaleMap[activeLang] || 'en-US';

        recognition.onresult = (event: any) => {
          let interim = '';
          let finalChunk = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              finalChunk += ' ' + transcript;
            } else {
              interim += transcript;
            }
          }

          finalChunk = finalChunk.trim();

          // Check cancellation anytime during command recording
          if (isCommandRecordingRef.current && CANCEL_COMMAND_REGEX.test(finalChunk)) {
            cancelCommand();
            return;
          }

          if (finalChunk.length > 0) {
            if (!isCommandRecordingRef.current) {
              // WAITING FOR WAKE PHRASE ("Hey INCLU" or "Please record these commands")
              const wake = detectWakePhrase(finalChunk);
              if (wake.matched) {
                // Check if user said the whole command AND "Done" in one breath
                const doneCheck = detectDoneTermination(wake.remainingText);
                if (doneCheck.hasDone && doneCheck.commandWithoutDone.length > 1) {
                  // Single shot execution
                  sounds.play('success');
                  toast.success(`🎙️ Spoken command: "${doneCheck.commandWithoutDone.slice(0, 36)}..."`);
                  setInterimCaption('');
                  setVoiceInterimCaption('');
                  executeSpokenCommand(doneCheck.commandWithoutDone);
                } else if (wake.remainingText.length > 2) {
                  // User said "Hey Inclu" followed by start of command
                  setVoiceCommandActive(true);
                  isCommandRecordingRef.current = true;
                  commandBufferRef.current = wake.remainingText;
                  setInterimCaption(wake.remainingText);
                  setVoiceInterimCaption(wake.remainingText);
                  sounds.play('mic_on');
                  toast.info('🎙️ Hey Inclu is listening! Say your command, then say "Done".');
                } else {
                  // User said "Hey INCLU" or "Please record these commands"
                  setVoiceCommandActive(true);
                  isCommandRecordingRef.current = true;
                  commandBufferRef.current = '';
                  setInterimCaption('');
                  setVoiceInterimCaption('');
                  sounds.play('mic_on');
                  toast.info('🎙️ Hey Inclu is listening! Speak your command and say "Done".');
                }
              }
            } else {
              // CURRENTLY RECORDING COMMAND (Wake word active, waiting for "Done")
              const doneCheck = detectDoneTermination(finalChunk);
              if (doneCheck.hasDone) {
                // Spoken "Done" detected! Finalize and execute!
                const finalPiece = doneCheck.commandWithoutDone;
                commandBufferRef.current = (commandBufferRef.current + ' ' + finalPiece).trim();
                finalizeAndExecuteCommand();
              } else {
                // Append chunk to buffer
                commandBufferRef.current = (commandBufferRef.current + ' ' + finalChunk).trim();
                setInterimCaption(commandBufferRef.current);
                setVoiceInterimCaption(commandBufferRef.current);

                // Auto-fallback silence safety (if user stops speaking for 7s without saying "Done")
                clearSilenceTimeout();
                silenceTimerRef.current = setTimeout(() => {
                  if (isCommandRecordingRef.current && commandBufferRef.current.trim().length > 2) {
                    finalizeAndExecuteCommand();
                  }
                }, 7000);
              }
            }
          }

          // Live interim captions
          if (interim) {
            if (isCommandRecordingRef.current) {
              const display = `${commandBufferRef.current ? commandBufferRef.current + ' ' : ''}${interim}`;
              setInterimCaption(display);
              setVoiceInterimCaption(display);
            } else {
              setInterimCaption(interim);
              setVoiceInterimCaption(interim);
            }
          }
        };

        recognition.onerror = (e: any) => {
          logger.warn('[Ambient Listener] WebSpeech error:', e.error);
          if (e.error === 'not-allowed') {
            isAmbientActiveRef.current = false;
            setHandsFreeListening(false);
            toast.error('Microphone access was denied. Allow microphone in your browser settings.');
          }
        };

        recognition.onend = () => {
          if (isAmbientActiveRef.current && !useStore.getState().isVoiceListening) {
            try {
              setTimeout(() => {
                if (isAmbientActiveRef.current && !useStore.getState().isVoiceListening && speechRecognitionRef.current) {
                  speechRecognitionRef.current.start();
                }
              }, 250);
            } catch {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      }

      // 2. Start background media stream & MediaRecorder only when SpeechRecognition is unavailable
      if (!SpeechRecognition) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(1000);

        intervalTimerRef.current = setInterval(() => {
          processAudioBuffer();
        }, sliceIntervalMs);
      }

      setHandsFreeListening(true);
      sounds.play('mic_on');
      toast.info('🎙️ Hands-free mode is on — say "Hey INCLU" to command!');
    } catch (err) {
      logger.error('[Ambient Listener] Failed to start microphone', err);
      toast.error('Could not access the microphone for hands-free mode.');
      setHandsFreeListening(false);
      setVoiceCommandActive(false);
    }
  };

  const stopAmbient = () => {
    clearSilenceTimeout();

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    audioChunksRef.current = [];
    setHandsFreeListening(false);
    setVoiceCommandActive(false);
    isCommandRecordingRef.current = false;
    commandBufferRef.current = '';
    setInterimCaption('');
    setVoiceInterimCaption('');
    sounds.play('mic_off');
    toast.info('Hands-free mode turned off');
  };

  const toggleAmbient = () => {
    if (isHandsFreeListening) {
      stopAmbient();
    } else {
      startAmbient();
    }
  };

  useEffect(() => {
    return () => {
      clearSilenceTimeout();
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch {}
      }
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isAmbientActive: isHandsFreeListening,
    isCommandRecording: isVoiceCommandActive,
    isProcessingSnippet,
    interimCaption: voiceInterimCaption || interimCaption,
    startAmbient,
    stopAmbient,
    toggleAmbient,
    finalizeAndExecuteCommand,
    cancelCommand
  };
}

export default useAmbientListener;
