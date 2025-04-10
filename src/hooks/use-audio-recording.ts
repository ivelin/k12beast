// src/hooks/use-audio-recording.ts
import { useEffect, useRef, useState } from "react";
import { recordAudio } from "@/components/lib/audio-utils";

interface UseAudioRecordingOptions {
  transcribeAudio?: (blob: Blob) => Promise<string>;
  onTranscriptionComplete?: (text: string) => void;
}

type Recording = Promise<Blob>;

export function useAudioRecording({
  transcribeAudio,
  onTranscriptionComplete,
}: UseAudioRecordingOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(!!transcribeAudio);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const activeRecordingRef = useRef<Recording | null>(null);

  useEffect(() => {
    const checkSpeechSupport = async () => {
      const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;
      setIsSpeechSupported(hasMediaDevices && !!transcribeAudio);
    };
    checkSpeechSupport();
  }, [transcribeAudio]);

  const stopRecording = async () => {
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      recordAudio.stop();
      const recording = await activeRecordingRef.current;
      if (recording && transcribeAudio) {
        const text = await transcribeAudio(recording);
        onTranscriptionComplete?.(text);
      }
    } catch (error: unknown) {
      console.error("Error transcribing audio:", error instanceof Error ? error.message : error);
    } finally {
      setIsTranscribing(false);
      setIsListening(false);
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      activeRecordingRef.current = null;
    }
  };

  const toggleListening = async () => {
    if (!isListening) {
      try {
        setIsListening(true);
        setIsRecording(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        activeRecordingRef.current = recordAudio(stream);
      } catch (error: unknown) {
        console.error("Error recording audio:", error instanceof Error ? error.message : error);
        setIsListening(false);
        setIsRecording(false);
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
        }
      }
    } else {
      await stopRecording();
    }
  };

  return {
    isListening,
    isSpeechSupported,
    isRecording,
    isTranscribing,
    audioStream,
    toggleListening,
    stopRecording,
  };
}