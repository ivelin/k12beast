// File path: src/app/chat/QuizSection.tsx
// Displays the quiz UI for K12Beast, allowing users to answer multiple-choice questions
// Updated to remove onQuizUpdate and associated useEffect to prevent infinite loop

"use client";

import { useEffect, useState } from "react";
import useAppStore from "@/store";
import { Quiz } from "@/store/types";

export default function QuizSection() {
  const {
    step,
    sessionId,
    quiz,
    setStep,
    handleQuizSubmit,
    handleValidate,
    quizAnswer,
    quizFeedback,
    loading,
    validationError,
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

  // Removed useEffect for onQuizUpdate, as quiz message is handled in handleQuizSubmit

  const handleSubmitAnswer = async () => {
    if (!quiz) return;
    await handleValidate(answer, quiz);
    const updatedFeedback = useAppStore.getState().quizFeedback;
    if (updatedFeedback) {
      setStep("lesson");
    } else {
      console.error("No feedback received after validation");
    }
  };

  if (step !== "quizzes" || !quiz) return null;

  return (
    <div className="mb-4 flex flex-col items-center">
      {quiz.answerFormat === "multiple-choice" && quiz.options && quiz.options.length > 0 ? (
        <div className="w-full max-w-md">
          {["A", "B", "C", "D"].map((option: string, index: number) => {
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