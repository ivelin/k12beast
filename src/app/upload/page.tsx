"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

export default function UploadPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);
  const [problem, setProblem] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [commentary, setCommentary] = useState("");
  const [shareableLink, setShareableLink] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("problem"); // Track the current step: "problem", "validate", "end"
  const [lesson, setLesson] = useState(null);
  const [examples, setExamples] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Check for an existing session to resume
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("sessionId");
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      setStep("validate"); // Resume at the validation step
    }
  }, []);

  // Handle image uploads using react-dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      const newImages = acceptedFiles.filter((file) => file.size <= 5 * 1024 * 1024); // Client-side check for 5MB per file
      if (newImages.length !== acceptedFiles.length) {
        setError("Some files were rejected because they exceed the 5MB limit.");
        return;
      }

      // Client-side check for total number of files
      if (images.length + newImages.length > 5) {
        setError("You can only upload a maximum of 5 images.");
        return;
      }

      // Prepare form data for the API request
      const formData = new FormData();
      newImages.forEach((file) => {
        formData.append("files", file);
      });

      // Send images to the server-side API route for upload
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload images");
      }

      setImages((prev) => [...prev, ...newImages]);
      setImageUrls((prev) => [...prev, ...data.files.map(file => file.url)]);
    } catch (err) {
      console.error("Error uploading images:", err);
      setError(err.message || "Failed to upload images. Please try again.");
    }
  }, [images]);

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

      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "", // Pass the session ID if available
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tutor lesson");
      }

      // Update the session ID from the response headers
      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      setLesson(data.lesson);
    } catch (err) {
      console.error("Error fetching tutor lesson:", err);
      setError(err.message || "Failed to fetch tutor lesson. Please try again.");
    }
  };

  const handleExamplesRequest = async () => {
    try {
      if (!problem && images.length === 0) {
        throw new Error("Please enter a problem or upload an image.");
      }

      const response = await fetch("/api/examples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "", // Pass the session ID
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
    }
  };

  const handleQuizSubmit = async () => {
    try {
      if (!problem && images.length === 0) {
        throw new Error("Please enter a problem or upload an image before requesting a quiz.");
      }

      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "", // Pass the session ID
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch quiz");
      }

      // Update the session ID from the response headers
      const newSessionId = response.headers.get("x-session-id");
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      setQuiz(data);
      setStep("validate");
    } catch (err) {
      console.error("Error fetching quiz:", err);
      setError(err.message || "Failed to fetch quiz. Please try again.");
    }
  };

  const handleValidate = async () => {
    try {
      // Simulate validation (replace with actual xAI API call)
      const isCorrect = answer === "10z + 20"; // Example correct answer
      const commentary = isCorrect
        ? "<p>Great job! You got it right!</p>"
        : "<p>Not quite. The correct answer is 10z + 20.</p>";

      const response = await fetch("/api/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "", // Pass the session ID
        },
        body: JSON.stringify({
          sessionId,
          problem: quiz.problem,
          answer,
          isCorrect,
          commentary,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to validate quiz");
      }

      setIsCorrect(isCorrect);
      setCommentary(commentary);
      setFeedback({ isCorrect, commentary });
      setStep("end");
    } catch (err) {
      console.error("Error validating quiz:", err);
      setError("Failed to validate quiz. Please try again.");
    }
  };

  const handleEndSession = async () => {
    try {
      const response = await fetch("/api/end-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "", // Pass the session ID
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to end session");
      }

      setShareableLink(data.shareableLink);
    } catch (err) {
      console.error("Error ending session:", err);
      setError("Failed to end session. Please try again.");
    }
  };

  return (
    <div>
      <h1>Tutoring Session</h1>
      {error && <div>{error}</div>}
      {step === "problem" && (
        <div>
          <h2>Upload Your Problem</h2>
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
          />
          <button onClick={handleTutorRequest}>Submit Problem</button>
          {lesson && (
            <div>
              <h2>Your Tutor Lesson</h2>
              <div dangerouslySetInnerHTML={{ __html: lesson }} />
              <button onClick={handleExamplesRequest}>Show Me an Example</button>
              <button onClick={handleQuizSubmit}>Give Me a Quiz</button>
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
              <button onClick={handleExamplesRequest}>Another Example</button>
              <button onClick={handleQuizSubmit}>Ready for a Quiz</button>
            </div>
          )}
        </div>
      )}
      {step === "validate" && quiz && (
        <div>
          <h2>Step 2: Validate Your Answer</h2>
          <p>Session ID: {sessionId}</p>
          <p>Problem: {quiz.problem}</p>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer (e.g., 10z + 20)"
          />
          <button onClick={handleValidate}>Validate Answer</button>
        </div>
      )}
      {step === "end" && !shareableLink && feedback && (
        <div>
          <h2>Step 3: End Session</h2>
          <p>Session ID: {sessionId}</p>
          <p>Problem: {quiz.problem}</p>
          <p>Answer: {answer}</p>
          <p>Result: {feedback.isCorrect ? "Correct" : "Incorrect"}</p>
          <div dangerouslySetInnerHTML={{ __html: feedback.commentary }} />
          <button onClick={handleEndSession}>End Session</button>
        </div>
      )}
      {shareableLink && (
        <div>
          <h2>Session Ended</h2>
          <p>Share this link with a parent:</p>
          <a href={shareableLink}>{shareableLink}</a>
        </div>
      )}
    </div>
  );
}