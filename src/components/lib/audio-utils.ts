export async function recordAudio(): Promise<{ start: () => void; stop: () => Promise<Blob> }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
  
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
  
      return {
        start: () => {
          audioChunks.length = 0; // Clear previous chunks
          mediaRecorder.start();
        },
        stop: () => {
          return new Promise((resolve) => {
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
              stream.getTracks().forEach((track) => track.stop()); // Stop the stream
              resolve(audioBlob);
            };
            mediaRecorder.stop();
          });
        },
      };
    } catch (error) {
      throw new Error("Failed to access microphone: " + error.message);
    }
  }