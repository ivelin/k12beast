// src/app/upload/ProblemSubmission.tsx
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import useAppStore from "../../store";

export default function ProblemSubmission() {
  const {
    problem,
    images,
    imageUrls,
    sessionId,
    setProblem,
    setImages,
    setImageUrls,
    setLesson,
    setSessionId,
    setError,
    setStep,
    setLoading,
  } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        const newImages = acceptedFiles.filter((file) => file.size <= 5 * 1024 * 1024);
        if (newImages.length !== acceptedFiles.length) {
          setError("Some files were rejected because they exceed the 5MB limit.");
          return;
        }

        if (images.length + newImages.length > 5) {
          setError("You can only upload a maximum of 5 images.");
          return;
        }

        setLoading(true);
        const formData = new FormData();
        newImages.forEach((file) => {
          formData.append("files", file);
        });

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to upload images");
        }

        setImages([...images, ...newImages]);
        setImageUrls([...imageUrls, ...data.files.map((file: any) => file.url)]);
      } catch (err) {
        setError(err.message || "Failed to upload images. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [images, imageUrls, setImages, setImageUrls, setError, setLoading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 5,
  });

  const handleTutorRequest = async () => {
    try {
      if (!problem && images.length === 0) {
        throw new Error("Please enter a problem or upload an image.");
      }

      setLoading(true);
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tutor lesson");
      }

      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      setLesson(data.lesson);
      setStep("examples");
    } catch (err) {
      setError(err.message || "Failed to fetch tutor lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl mb-2">Upload Your Problem</h2>
      {useAppStore.getState().loading && <p className="text-blue-500">Loading... Please wait.</p>}
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 p-5 mb-5">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the images here ...</p>
        ) : (
          <p>Drag up to 5 images here (max 5MB each), or click to select</p>
        )}
      </div>
      {images.length > 0 && (
        <div>
          <h3 className="text-lg mb-2">Uploaded Images:</h3>
          <ul>
            {images.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
      <textarea
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Enter a problem (e.g., Simplify 12(3y + x))"
        rows={5}
        className="w-full p-2 mb-2 border border-gray-300 rounded"
        disabled={useAppStore.getState().loading}
      />
      <button
        onClick={handleTutorRequest}
        disabled={useAppStore.getState().loading}
        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        Submit Problem
      </button>
    </div>
  );
}