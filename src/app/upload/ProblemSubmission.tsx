"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface ProblemSubmissionProps {
  problem: string;
  setProblem: (value: string) => void;
  images: File[];
  setImages: (value: File[]) => void;
  imageUrls: string[];
  setImageUrls: (value: string[]) => void;
  lesson: string | null;
  setLesson: (value: string | null) => void;
  examples: any;
  setExamples: (value: any) => void;
  sessionId: string | null;
  setSessionId: (value: string | null) => void;
  setError: (value: string | null) => void;
  setStep: (value: string) => void;
}

export default function ProblemSubmission({
  problem,
  setProblem,
  images,
  setImages,
  imageUrls,
  setImageUrls,
  lesson,
  setLesson,
  examples,
  setExamples,
  sessionId,
  setSessionId,
  setError,
  setStep,
}: ProblemSubmissionProps) {
  const [loading, setLoading] = useState(false);

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

        setImages((prev) => [...prev, ...newImages]);
        setImageUrls((prev) => [...prev, ...data.files.map((file) => file.url)]);
      } catch (err) {
        console.error("Error uploading images:", err);
        setError(err.message || "Failed to upload images. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [images, setImages, setImageUrls, setError]
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
        console.log("Set session ID from tutor response:", newSessionId);
      }

      setLesson(data.lesson);
      console.log("Setting step to 'examples' after successful tutor request");
      setStep("examples");
    } catch (err) {
      console.error("Error fetching tutor lesson:", err);
      setError(err.message || "Failed to fetch tutor lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExamplesRequest = async () => {
    try {
      if (!problem && images.length === 0) {
        throw new Error("Please enter a problem or upload an image.");
      }

      setLoading(true);
      const response = await fetch("/api/examples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch examples");
      }

      setExamples(data);
    } catch (err) {
      console.error("Error fetching examples:", err);
      setError(err.message || "Failed to fetch examples. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload Your Problem</h2>
      {loading && <p style={{ color: "blue" }}>Loading... Please wait.</p>}
      {!lesson && (
        <>
          <div {...getRootProps()} style={{ border: "2px dashed #ccc", padding: "20px", marginBottom: "20px" }}>
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the images here ...</p>
            ) : (
              <p>Drag up to 5 images here (max 5MB each), or click to select</p>
            )}
          </div>
          {images.length > 0 && (
            <div>
              <h3>Uploaded Images:</h3>
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
            style={{ width: "100%", marginBottom: "10px" }}
            disabled={loading}
          />
          <button onClick={handleTutorRequest} disabled={loading}>
            Submit Problem
          </button>
        </>
      )}
      {lesson && !examples && (
        <div>
          <h2>Your Tutor Lesson</h2>
          <div dangerouslySetInnerHTML={{ __html: lesson }} />
          <button onClick={handleExamplesRequest} disabled={loading}>
            Show Me an Example
          </button>
          <button onClick={() => setStep("quizzes")} disabled={loading}>
            Give Me a Quiz
          </button>
        </div>
      )}
      {examples && (
        <div>
          <h2>Example Problem</h2>
          <p>{examples.problem}</p>
          {examples.solution.map((step, index) => (
            <div key={index}>
              <h3>{step.title}</h3>
              <div dangerouslySetInnerHTML={{ __html: step.content }} />
            </div>
          ))}
          <button onClick={handleExamplesRequest} disabled={loading}>
            Another Example
          </button>
          <button onClick={() => setStep("quizzes")} disabled={loading}>
            Ready for a Quiz
          </button>
        </div>
      )}
    </div>
  );
}