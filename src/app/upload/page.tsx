"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProblemSubmission from "./ProblemSubmission";
import QuizSection from "./QuizSection";
import SessionEnd from "./SessionEnd";

export default function UploadPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);
  const [problem, setProblem] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("problem");
  const [lesson, setLesson] = useState(null);
  const [examples, setExamples] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [shareableLink, setShareableLink] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("sessionId");
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      setStep("quizzes");
    }
  }, []);

  useEffect(() => {
    console.log("Current step:", step);
  }, [step]);

  const handleEndSession = async () => {
    try {
      const response = await fetch("/api/end-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
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
      {error && <div style={{ color: "red" }}>{error}</div>}
      {(step === "problem" || step === "end") && (problem || imageUrls.length > 0) && (
        <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "20px", backgroundColor: "#f0f0f0" }}>
          <h3>Original Problem</h3>
          {problem && (
            <div>
              <p><strong>Text:</strong></p>
              <p style={{ backgroundColor: "#e0e0e0", padding: "5px", borderRadius: "3px" }}>{problem}</p>
            </div>
          )}
          {imageUrls.length > 0 && (
            <div>
              <p><strong>Images:</strong></p>
              <ul>
                {imageUrls.map((url, index) => (
                  <li key={index}>
                    <img src={url} alt={`Uploaded image ${index + 1}`} style={{ maxWidth: "200px", margin: "5px" }} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {step === "problem" && (
        <ProblemSubmission
          problem={problem}
          setProblem={setProblem}
          images={images}
          setImages={setImages}
          imageUrls={imageUrls}
          setImageUrls={setImageUrls}
          lesson={lesson}
          setLesson={setLesson}
          examples={examples}
          setExamples={setExamples}
          sessionId={sessionId}
          setSessionId={setSessionId}
          setError={setError}
          setStep={setStep}
        />
      )}
      {step === "examples" && (
        <div>
          {lesson && (
            <div>
              <h2>Your Tutor Lesson</h2>
              <div dangerouslySetInnerHTML={{ __html: lesson }} />
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
            </div>
          )}
        </div>
      )}
      {(step === "quizzes" || step === "end") && (
        <QuizSection
          sessionId={sessionId}
          problem={problem}
          images={images}
          imageUrls={imageUrls}
          setQuiz={setQuiz}
          setStep={setStep}
          setError={setError}
          quiz={quiz}
          step={step}
          shareableLink={shareableLink}
          handleEndSession={handleEndSession}
          error={error}
        />
      )}
      <SessionEnd
        sessionId={sessionId}
        setShareableLink={setShareableLink}
        setError={setError}
        shareableLink={shareableLink}
      />
    </div>
  );
}