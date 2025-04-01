"use client";

import { useState, useEffect } from "react";

interface QuizSectionProps {
  sessionId: string | null;
  problem: string;
  images: File[];
  imageUrls: string[];
  setQuiz: (value: any) => void;
  setStep: (value: string) => void;
  setError: (value: string | null) => void;
  quiz: any;
  step: string;
  shareableLink: string | null;
  handleEndSession: () => void;
  error: string | null;
}

export default function QuizSection({
  sessionId,
  problem,
  images,
  imageUrls,
  setQuiz,
  setStep,
  setError,
  quiz,
  step,
  shareableLink,
  handleEndSession,
  error,
}: QuizSectionProps) {
  const [answer, setAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(null);
  const [commentary, setCommentary] = useState("");
  const [solution, setSolution] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  // Automatically fetch quiz when step is "quizzes" and quiz is null
  useEffect(() => {
    if (step === "quizzes" && !quiz && !loading) {
      console.log("useEffect triggering handleQuizSubmit on mount");
      handleQuizSubmit();
    }
  }, [step, quiz, loading]);

  const handleQuizSubmit = async () => {
    console.log("handleQuizSubmit called with:", { sessionId, problem, imageUrls });
    try {
      if (!problem && images.length === 0) {
        throw new Error("Please enter a problem or upload an image before requesting a quiz.");
      }

      setLoading(true);
      console.log("Fetching quiz from /api/quiz...");
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({ problem, images: imageUrls }),
      });

      console.log("Quiz API response status:", response.status);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch quiz");
      }

      console.log("Quiz data received:", data);
      setQuiz(data);
      setAnswer("");
      setIsCorrect(null);
      setCommentary("");
      setSolution(null);
      setFeedback(null);
      // Step is already "quizzes", no need to set it again
    } catch (err) {
      console.error("Error in handleQuizSubmit:", err);
      setError(err.message || "Failed to fetch quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    console.log("handleValidate called with answer:", answer);
    try {
      if (!answer) {
        throw new Error("Please select an option before validating.");
      }

      setLoading(true);
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId || "",
        },
        body: JSON.stringify({
          sessionId,
          problem: quiz.problem,
          answer,
          isCorrect: answer === quiz.correctAnswer,
          commentary: answer === quiz.correctAnswer
            ? "<p>Great job! You got it right!</p>"
            : `<p>Not quite. The correct answer is ${quiz.correctAnswer}.</p>`,
        }),
      });

      console.log("Validate API response status:", response.status);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to validate quiz");
      }

      console.log("Validation data received:", data);
      setIsCorrect(data.isCorrect);
      setCommentary(data.commentary);
      setSolution(data.solution);
      setFeedback({ isCorrect: data.isCorrect, commentary: data.commentary });
      setStep("end");
    } catch (err) {
      console.error("Error in handleValidate:", err);
      setError(err.message || "Failed to validate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step === "quizzes" && !quiz && (
        <div>
          <p style={{ color: "blue" }}>Loading quiz... Please wait.</p>
        </div>
      )}
      {step === "quizzes" && quiz && (
        <div>
          <h2>Step 2: Answer the Quiz</h2>
          {loading && <p style={{ color: "blue" }}>Loading... Please wait.</p>}
          {error && <div style={{ color: "red" }}>{error}</div>}
          <p>Session ID: {sessionId}</p>
          <p>Problem: {quiz.problem}</p>
          {quiz.encouragement && (
            <p style={{ color: "green", fontStyle: "italic" }}>{quiz.encouragement}</p>
          )}
          {quiz.answerFormat === "multiple-choice" && quiz.options && (
            <div>
              {quiz.options.map((option, index) => (
                <div key={index} style={{ margin: "10px 0" }}>
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name="quiz-answer"
                    value={option}
                    checked={answer === option}
                    onChange={(e) => setAnswer(e.target.value)}
                    style={{ marginRight: "5px" }}
                    disabled={loading}
                  />
                  <label
                    htmlFor={`option-${index}`}
                    style={{
                      color: answer === option ? "blue" : "inherit",
                      fontWeight: answer === option ? "bold" : "normal",
                    }}
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleValidate} disabled={!answer || loading}>
            Submit Answer
          </button>
        </div>
      )}
      {step === "end" && !shareableLink && feedback && (
        <div>
          <h2>Step 3: Review Your Result</h2>
          {loading && <p style={{ color: "blue" }}>Loading... Please wait.</p>}
          {error && <div style={{ color: "red" }}>{error}</div>}
          <p>Session ID: {sessionId}</p>
          <p>Problem: {quiz.problem}</p>
          <p>Answer: {answer}</p>
          <p>Result: {feedback.isCorrect ? "Correct" : "Incorrect"}</p>
          <div dangerouslySetInnerHTML={{ __html: feedback.commentary }} />
          {solution && (
            <div style={{ border: "1px solid #ccc", padding: "10px", marginTop: "10px", backgroundColor: "#f9f9f9" }}>
              <h3>Solution</h3>
              {solution.map((step, index) => (
                <div key={index}>
                  <h4>{step.title}</h4>
                  <div dangerouslySetInnerHTML={{ __html: step.content }} />
                </div>
              ))}
            </div>
          )}
          <button onClick={handleQuizSubmit} disabled={loading}>
            Take Another Quiz
          </button>
          <button onClick={handleEndSession} disabled={loading}>
            End Session
          </button>
        </div>
      )}
    </div>
  );
}