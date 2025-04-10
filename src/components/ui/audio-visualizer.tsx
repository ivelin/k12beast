// src/components/ui/audio-visualizer.tsx
import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  onClick: () => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isRecording,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = "rgb(200, 200, 200)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
        ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }
    };

    draw();
    return () => {
      audioContext.close();
    };
  }, [stream, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      onClick={onClick}
      className="w-full h-full"
    />
  );
};

AudioVisualizer.displayName = "AudioVisualizer";