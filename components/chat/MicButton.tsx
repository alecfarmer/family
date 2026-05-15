"use client";

import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { useCopyToast } from "@/components/notifications/CopyToastProvider";

export type MicButtonProps = {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

type RecordingState = "idle" | "recording" | "processing";

export function MicButton({ onTranscribed, disabled = false, className }: MicButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const showToast = useCopyToast();

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";

  async function startRecording() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showToast("Microphone access denied");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // Stop all tracks so the browser releases the mic indicator
      stream.getTracks().forEach((t) => t.stop());

      setRecordingState("processing");
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      try {
        const fd = new FormData();
        fd.append("audio", blob);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });

        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (json.error === "voice_not_configured") {
            showToast("Voice not configured");
          } else {
            showToast("Transcription failed");
          }
          setRecordingState("idle");
          return;
        }

        const { text } = (await res.json()) as { text: string };
        if (text) onTranscribed(text);
      } catch {
        showToast("Transcription failed");
      } finally {
        setRecordingState("idle");
      }
    };

    mediaRef.current = recorder;
    recorder.start();
    setRecordingState("recording");
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
  }

  function handleClick() {
    if (disabled || isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      aria-label={isRecording ? "Stop recording" : "Start voice input"}
      aria-pressed={isRecording}
      className={cn(
        "relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full transition-colors duration-200",
        "border border-border bg-surface-elevated",
        isRecording && "border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {/* Pulsing amber ring while recording */}
      {isRecording && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: "rgba(200,121,65,0.25)" }}
        />
      )}

      {isProcessing ? (
        // Spinner dots while awaiting transcription
        <span className="inline-flex gap-0.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1 w-1 rounded-full bg-accent animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          {/* Microphone body */}
          <rect
            x="7"
            y="2"
            width="6"
            height="9"
            rx="3"
            stroke={isRecording ? "var(--color-accent)" : "#6B6059"}
            strokeWidth="1.8"
          />
          {/* Stand arc */}
          <path
            d="M4 10a6 6 0 0 0 12 0"
            stroke={isRecording ? "var(--color-accent)" : "#6B6059"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Pole */}
          <line
            x1="10"
            y1="16"
            x2="10"
            y2="19"
            stroke={isRecording ? "var(--color-accent)" : "#6B6059"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Base */}
          <line
            x1="7"
            y1="19"
            x2="13"
            y2="19"
            stroke={isRecording ? "var(--color-accent)" : "#6B6059"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
