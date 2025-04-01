// src/app/upload/QuizSection.tsx
"use client";

import { useEffect } from "react";
import useAppStore from "../../store";

export default function QuizSection() {
  const {
    step,
    sessionId,
    quiz,
    setStep,
    setError,
    handleQuizSubmit,
    handleValidate,
    handleEndSession,
  } = useAppStore();

  const answer = useAppStore((state) => state.quizAnswer);
  const setAnswer = (value: string) => useAppStore.setState({ quizAnswer: value });
  const isCorrect = useAppStore((state) => state.quizIsCorrect);
  const setIsCorrect = (value: boolean | null) => useAppStore.setState({ quizIsCorrect: value });
  const commentary = useAppStore((state) => state.quizCommentary);
  const setCommentary = (value: string) => useAppStore.setState({ quizCommentary: value });
  const solution = useAppStore((state) => state.quizSolution);
  const setSolution = (value: any) => useAppStore.setState({ quizSolution: value });
  const feedback = useAppStore((state) => state.quizFeedback);
  const setFeedback = (value: any) => useAppStore.setState({ quizFeedback: value });

  useEffect(() => {
    if (step === "quizzes" && !quiz) {
      handleQuizSubmit();
    }
  }, [step, quiz, handleQuizSubmit]);

  const handleNewQuiz = async () => {
    setStep("quizzes"); // Ensure step is set to "quizzes" to trigger useEffect
    await handleQuizSubmit();
  };

  return (
    <div>
      {step === "quizzes" && !quiz && (
        <div>
          <p className="text-blue-500">Loading quiz... Please wait.</p>
        </div>
      )}
      {step === "quizzes" && quiz && (
        <div>
          <h2 className="text-xl mb-2">Step 2: Answer the Quiz</h2>
          {useAppStore.getState().loading && <p className="text-blue-500">Loading... Please wait.</p>}
          {useAppStore.getState().error && <div className="text-red-500">{useAppStore.getState().error}</div>}
          <p>Session ID: {sessionId}</p>
          <p>Problem: {quiz.problem}</p>
          {quiz.encouragement && (
            <p className="text-green-500 italic">{quiz.encouragement}</p>
          )}
          {quiz.answerFormat === "multiple-choice" && quiz.options && (
            <div>
              {quiz.options.map((option: string, index: number) => (
                <div key={index} className="my-2">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name="quiz-answer"
                    value={option}
                    checked={answer === option}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="mr-2"
                    disabled={useAppStore.getState().loading}
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
            onClick={() => handleValidate(answer, quiz)}
            disabled={!answer || useAppStore.getState().loading}
            className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Submit Answer
          </button>
        </div>
      )}
      {step === "end" && !useAppStore.getState().shareableLink && feedback && (
        <div>
          <h2 className="text-xl mb-2">Step 3: Review Your Result</h2>
          {useAppStore.getState().loading && <p className="text-blue-500">Loading... Please wait.</p>}
          {useAppStore.getState().error && <div className="text-red-500">{useAppStore.getState().error}</div>}
          <p>Session ID: {sessionId}</p>
          <p>Problem: {quiz.problem}</p>
          <p>Answer: {answer}</p>
          <p>Result: {feedback.isCorrect ? "Correct" : "Incorrect"}</p>
          <div dangerouslySetInnerHTML={{ __html: feedback.commentary }} />
          {solution && (
            <div className="border border-gray-300 p-2 mt-2 bg-gray-50 rounded">
              <h3 className="text-lg">Solution</h3>
              {solution.map((step: any, index: number) => (
                <div key={index}>
                  <h4>{step.title}</h4>
                  <div dangerouslySetInnerHTML={{ __html: step.content }} />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handleNewQuiz}
            disabled={useAppStore.getState().loading}
            className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Take Another Quiz
          </button>
          <button
            onClick={handleEndSession}
            disabled={useAppStore.getState().loading}
            className="mt-2 p-2 bg-red-500 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            End Session
          </button>
        </div>
      )}
    </div>
  );
}