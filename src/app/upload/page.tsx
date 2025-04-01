// src/app/upload/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProblemSubmission from "./ProblemSubmission";
import QuizSection from "./QuizSection";
import SessionEnd from "./SessionEnd";
import useAppStore from "../../store";

export default function UploadPage() {
  const router = useRouter();
  const {
    step,
    sessionId,
    problem,
    imageUrls,
    lesson,
    examples,
    setSessionId,
    setStep,
    setLoading,
    setError,
    handleExamplesRequest,
  } = useAppStore();

  const [fadeKey, setFadeKey] = useState(step); // Track step for fade animation

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("sessionId");
    if (sessionIdFromUrl) {
      setSessionId(sessionIdFromUrl);
      setStep("quizzes");
    }
  }, [setSessionId, setStep]);

  useEffect(() => {
    // Trigger fade animation when step changes
    setFadeKey(step);
  }, [step]);

  const steps = ["problem", "examples", "quizzes", "end"];
  const progress = ((steps.indexOf(step) + 1) / steps.length) * 100;

  const renderStep = () => {
    switch (step) {
      case "problem":
        return <ProblemSubmission />;
      case "examples":
        return (
          <div>
            {lesson && (
              <div>
                <h2 className="text-xl mb-2">Your Tutor Lesson</h2>
                <div dangerouslySetInnerHTML={{ __html: lesson }} />
              </div>
            )}
            {examples && (
              <div className="mt-4">
                <h2 className="text-xl mb-2">Example Problem</h2>
                <p>{examples.problem}</p>
                {examples.solution.map((step: any, index: number) => (
                  <div key={index} className="step">
                    <h3>{step.title}</h3>
                    <div dangerouslySetInnerHTML={{ __html: step.content }} />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleExamplesRequest}
              disabled={useAppStore.getState().loading}
              className="mt-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {examples ? "Another Example" : "Show Me an Example"}
            </button>
            <button
              onClick={() => setStep("quizzes")}
              disabled={useAppStore.getState().loading}
              className="mt-2 p-2 bg-green-500 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Ready for a Quiz
            </button>
          </div>
        );
      case "quizzes":
      case "end":
        return <QuizSection />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-full p-5 mx-auto text-center md:max-w-4xl">
      <h1 className="text-2xl mb-4 md:text-4xl">Tutoring Session</h1>
      <div className="w-full h-2 bg-gray-200 rounded mb-4">
        <div className="h-full bg-blue-500 rounded" style={{ width: `${progress}%` }} />
      </div>
      {useAppStore.getState().error && (
        <div className="text-red-500 mb-4">{useAppStore.getState().error}</div>
      )}
      {(step === "problem" || step === "end") && (problem || imageUrls.length > 0) && (
        <div className="border border-gray-300 p-4 mb-5 bg-gray-100 rounded">
          <h3 className="text-lg mb-2">Original Problem</h3>
          {problem && (
            <div>
              <p><strong>Text:</strong></p>
              <p className="bg-gray-200 p-2 rounded">{problem}</p>
            </div>
          )}
          {imageUrls.length > 0 && (
            <div>
              <p className="mt-2"><strong>Images:</strong></p>
              <ul className="flex flex-wrap gap-2">
                {imageUrls.map((url, index) => (
                  <li key={index}>
                    <img src={url} alt={`Uploaded image ${index + 1}`} className="max-w-[200px] m-1" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div key={fadeKey} className="fade">
        {renderStep()}
        <SessionEnd />
      </div>
    </div>
  );
}