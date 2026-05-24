"use client";

import { useRef, useCallback, useState, useEffect } from "react";

type VADOptions = {
  silenceThreshold?: number;
  silenceTimeout?: number;
  onSpeechEnd: (audioBlob: Blob) => void;
  onVolumeChange?: (volume: number) => void;
};

/**
 * Encode PCM Float32 samples to a WAV Blob.
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Voice Activity Detection hook using Web Audio API.
 * Records raw PCM and outputs WAV for maximum compatibility.
 */
export function useVAD({
  silenceThreshold = 0.02,
  silenceTimeout = 1200,
  onSpeechEnd,
  onVolumeChange,
}: VADOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rafRef = useRef<number>(0);
  const silenceStartRef = useRef<number>(0);
  const hasSpeechRef = useRef(false);
  const recordedSamplesRef = useRef<Float32Array[]>([]);

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
    setIsSpeaking(false);
    hasSpeechRef.current = false;
    recordedSamplesRef.current = [];
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;

      // ScriptProcessor to capture raw PCM
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      recordedSamplesRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        recordedSamplesRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);
      silenceStartRef.current = 0;
      hasSpeechRef.current = false;

      // VAD loop
      const dataArray = new Float32Array(analyser.fftSize);

      const checkAudio = () => {
        if (!analyserRef.current) return;

        analyser.getFloatTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        onVolumeChange?.(rms);

        if (rms > silenceThreshold) {
          setIsSpeaking(true);
          hasSpeechRef.current = true;
          silenceStartRef.current = 0;
        } else {
          if (hasSpeechRef.current) {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > silenceTimeout) {
              // Silence timeout — encode and send
              setIsSpeaking(false);

              // Merge all recorded samples
              const totalLength = recordedSamplesRef.current.reduce((acc, s) => acc + s.length, 0);
              const merged = new Float32Array(totalLength);
              let offset = 0;
              for (const chunk of recordedSamplesRef.current) {
                merged.set(chunk, offset);
                offset += chunk.length;
              }

              const wavBlob = encodeWAV(merged, audioContext.sampleRate);
              onSpeechEnd(wavBlob);

              // Cleanup
              if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
              }
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
              }
              if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
              }
              setIsListening(false);
              hasSpeechRef.current = false;
              recordedSamplesRef.current = [];
              return;
            }
          }
        }

        rafRef.current = requestAnimationFrame(checkAudio);
      };

      rafRef.current = requestAnimationFrame(checkAudio);
    } catch (err) {
      console.error("Microphone access failed:", err);
      setIsListening(false);
    }
  }, [silenceThreshold, silenceTimeout, onSpeechEnd, onVolumeChange]);

  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
  };
}
