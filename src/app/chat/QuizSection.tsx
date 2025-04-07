// src/app/chat/QuizSection.tsx
"use client";

import { useEffect, useState } from "react";
import useAppStore from "../../store";

export default function QuizSection({ onQuizUpdate }) {
  const {
    step,
    sessionId,
    quiz,
    setStep,
    setError,
    handleQuizSubmit,
    handleValidate,
  } = useAppStore();

  const [hasFetchedQuiz, setHasFetchedQuiz] = useState(false);

  const answer = useAppStore((state) => state.quizAnswer);
  const setAnswer = (value) => useAppStore.setState({ quizAnswer: value });
  const loading = useAppStore((state) => state.loading);

  useEffect(() => {
    if (step === "quizzes" && !quiz && !hasFetchedQuiz) {
      setHasFetchedQuiz(true);
      handleQuizSubmit();
    }
  }, [step, quiz, hasFetchedQuiz, handleQuizSubmit]);

  useEffect(() => {
    if (quiz) {
      onQuizUpdate({ type: "quiz", content: quiz.problem });
    }
  }, [quiz, onQuizUpdate]);

  const handleSubmitAnswer = async () => {
    try {
      await handleValidate(answer, quiz);
      const updatedFeedback = useAppStore.getState().quizFeedback;
      if (updatedFeedback) {
        // Remove the onQuizUpdate call since the store already adds the message
        setStep("lesson"); // Return to lesson step after quiz submission
      } else {
        console.error("No feedback received after validation");
        setError("Failed to validate quiz answer. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting quiz answer:", err);
      setError(err.message || "Failed to submit quiz answer. Please try again.");
    }
  };

  if (step !== "quizzes" || !quiz) return null;

  return (
    <div className="mb-4 flex flex-col items-center">
      {loading && (
        <div className="text-blue-500">Loading... Please wait.</div>
      )}
      {useAppStore.getState().error && (
        <div className="text-red-500">{useAppStore.getState().error}</div>
      )}
      {quiz.answerFormat === "multiple-choice" && quiz.options && (
        <div className="w-full max-w-md">
          {quiz.options.map((option, index) => (
            <div key={index} className="my-2 flex items-center">
              <input
                type="radio"
                id={`option-${index}`}
                name="quiz-answer"
                value={option}
                checked={answer === option}
                onChange={(e) => setAnswer(e.target.value)}
                className="mr-2"
                disabled={loading}
              />
              <label
                htmlFor={`option-${index}`}
                className={answer === option ? "text-blue-500 font-bold" : ""}
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={handleSubmitAnswer}
        disabled={!answer || loading}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        Submit Quiz
      </button>
    </div>
  );
}