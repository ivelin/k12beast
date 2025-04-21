/* src/app/chat/QuizSection.tsx */
"use client";

import { useEffect, useState } from "react";
import useAppStore from "@/store";
import { Quiz } from "@/store/types";

// Define the type for the onQuizUpdate prop
interface QuizUpdate {
  type: string;
  content: string;
}

export default function QuizSection({ onQuizUpdate }: { onQuizUpdate: (update: QuizUpdate) => void }) {
  const {
    step,
    sessionId,
    quiz,
    setStep,
    setError,
    handleQuizSubmit,
    handleValidate,
    quizAnswer,
    quizFeedback,
    loading,
  } = useAppStore();

  const [hasFetchedQuiz, setHasFetchedQuiz] = useState(false);

  const answer = quizAnswer;
  const setAnswer = (value: string) => useAppStore.setState({ quizAnswer: value });

  useEffect(() => {
    if (step === "quizzes" && !quiz && !hasFetchedQuiz) {
      setHasFetchedQuiz(true);
      handleQuizSubmit();
    }
  }, [step, quiz, hasFetchedQuiz, handleQuizSubmit]);

  useEffect(() => {
    if (quiz) {
      console.log("QuizSection: Quiz object loaded:", quiz);
      onQuizUpdate({ type: "quiz", content: quiz.problem });
    } else {
      console.warn("QuizSection: No quiz object available");
    }
  }, [quiz, onQuizUpdate]);

  const handleSubmitAnswer = async () => {
    if (!quiz) return; // Additional runtime check for safety
    try {
      await handleValidate(answer, quiz);
      const updatedFeedback = useAppStore.getState().quizFeedback;
      if (updatedFeedback) {
        setStep("lesson"); // Transition to lesson step to show feedback in chat
      } else {
        console.error("No feedback received after validation");
        setError("Failed to validate quiz answer. Please try again.");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit quiz answer";
      console.error("Error submitting quiz answer:", err);
      setError(errorMsg);
    }
  };

  // Hide the QuizSection if step is not "quizzes" or if quizFeedback is present
  if (step !== "quizzes" || !quiz) return null;

  return (
    <div className="mb-4 flex flex-col items-center">
      {useAppStore.getState().error && (
        <div className="text-red-500">{useAppStore.getState().error}</div>
      )}
      {quiz.answerFormat === "multiple-choice" && quiz.options && quiz.options.length > 0 ? (
        <div className="w-full max-w-md">
          {['A', 'B', 'C', 'D'].map((option: string, index: number) => {
            const isUserAnswer = option === answer;
            return (
              <div key={index} className="my-2 flex items-center">
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="quiz-answer"
                  value={option}
                  checked={isUserAnswer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mr-2"
                  disabled={loading}
                  aria-label={`Option ${index + 1}: ${option}`}
                />
                <label
                  htmlFor={`option-${index}`}
                  className={`flex-1 p-2 rounded-md transition-colors ${
                    isUserAnswer ? "bg-primary text-primary-foreground font-bold" : "bg-background"
                  }`}
                >
                  {option}
                </label>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-red-500">
          Error: Quiz options are missing. Please try requesting another quiz.
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