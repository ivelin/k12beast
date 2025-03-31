"use client";

import { useState, useEffect } from "react";
import supabase from "../../supabase/client";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

export default function UploadPage() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [age, setAge] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [lesson, setLesson] = useState<string | null>(null);
  const [example, setExample] = useState<{ problem: string; solution: { title: string; content: string }[] } | null>(null);
  const [quiz, setQuiz] = useState<{ problem: string; answerFormat: string; options?: string[]; correctAnswer: string } | null>(null);
  const [answer, setAnswer] = useState<string | File | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; commentary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<{ isCorrect: boolean }[]>([]);
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/");
    };
    checkUser();
  }, [router]);

  // Configure react-dropzone with clear styling
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif"] },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      setImages(acceptedFiles);
      setError(null);
    },
  });

  // Convert file to base64
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Handle form submission for initial tutoring lesson
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && images.length === 0) {
      setError("Please provide either text or at least one image.");
      return;
    }
    setError(null);
    setLesson(null);
    setExample(null);
    setQuiz(null);
    setFeedback(null);
    setPerformanceHistory([]);
    setLoading(true);

    try {
      const imageData = await Promise.all(images.map(toBase64));
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, images: imageData }),
        signal: AbortSignal.timeout(60000), // 60-second timeout
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process");
      setAge(data.age);
      setGrade(data.grade);
      setSkillLevel(data.skillLevel);
      setLesson(data.lesson);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch example problem
  const fetchExample = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalProblem: text, age, grade, skillLevel, performanceHistory }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch example");
      setExample(data);
    } catch (err) {
      setError(err.message || "Failed to fetch example problem. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch quiz problem
  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalProblem: text, age, grade, skillLevel, performanceHistory }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch quiz");
      setQuiz(data);
      setAnswer(null);
      setFeedback(null);
    } catch (err) {
      setError(err.message || "Failed to fetch quiz problem. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit quiz answer
  const submitAnswer = async () => {
    if (!quiz || !answer) return;
    setLoading(true);
    try {
      const answerData = typeof answer === "string" ? answer : await toBase64(answer);
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswer: answerData,
          quizProblem: quiz.problem,
          correctAnswer: quiz.correctAnswer,
          age,
          grade,
          skillLevel,
          performanceHistory,
        }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate answer");
      setFeedback(data);
      setPerformanceHistory([...performanceHistory, { isCorrect: data.isCorrect }]);
    } catch (err) {
      setError(err.message || "Failed to validate answer. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload Your Problem</h1>
      <form onSubmit={handleSubmit}>
        {/* Dropzone with clear styling */}
        <div
          {...getRootProps()}
          className="border-dashed border-4 border-blue-500 p-4 mb-4 bg-gray-100 rounded-lg text-center cursor-pointer hover:bg-gray-200"
        >
          <input {...getInputProps()} />
          <p className="text-gray-700">
            Drag up to 5 images here (max 5MB each), or click to select
          </p>
          {images.length > 0 && (
            <ul className="mt-2">
              {images.map((file, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your problem (optional)"
          className="w-full p-2 border rounded mb-4"
          rows={4}
        />

        {/* Submit button with validation */}
        <button
          type="submit"
          disabled={(text.trim() === "" && images.length === 0) || loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Submit"}
        </button>
      </form>

      {/* Error display */}
      {error && <p className="text-red-500 mt-4">{error}</p>}

      {/* Lesson display */}
      {lesson && (
        <div className="mt-4 p-4 bg-gray-50 rounded border">
          <h2 className="text-lg font-semibold">Your Tutoring Lesson</h2>
          <div dangerouslySetInnerHTML={{ __html: lesson }} />
          <div className="mt-4">
            <button
              onClick={fetchExample}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 mr-2"
            >
              {loading ? "Loading..." : "Show Me an Example"}
            </button>
            <button
              onClick={fetchQuiz}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? "Loading..." : "Give Me a Quiz"}
            </button>
          </div>
        </div>
      )}

      {/* Example display */}
      {example && (
        <div className="mt-4 p-4 bg-gray-50 rounded border">
          <h2 className="text-lg font-semibold">Example Problem</h2>
          <p>{example.problem}</p>
          {example.solution.map((step, index) => (
            <div key={index} className="mt-2">
              <h3 className="text-md font-medium">{step.title}</h3>
              <div dangerouslySetInnerHTML={{ __html: step.content }} />
            </div>
          ))}
          <div className="mt-4">
            <button
              onClick={fetchExample}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 mr-2"
            >
              {loading ? "Loading..." : "Another Example"}
            </button>
            <button
              onClick={fetchQuiz}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? "Loading..." : "Ready for a Quiz"}
            </button>
          </div>
        </div>
      )}

      {/* Quiz display */}
      {quiz && (
        <div className="mt-4 p-4 bg-gray-50 rounded border">
          <h2 className="text-lg font-semibold">Quiz Problem</h2>
          <p>{quiz.problem}</p>
          {quiz.answerFormat === "multipleChoice" && quiz.options && (
            <div>
              {quiz.options.map((option, index) => (
                <label key={index} className="block mb-2">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}
          {quiz.answerFormat === "text" && (
            <textarea
              value={answer as string}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full p-2 border rounded mb-4"
              rows={4}
            />
          )}
          {quiz.answerFormat === "image" && (
            <div
              {...getRootProps()}
              className="border-dashed border-4 border-blue-500 p-4 mb-4 bg-gray-100 rounded-lg text-center cursor-pointer hover:bg-gray-200"
            >
              <input {...getInputProps()} />
              <p className="text-gray-700">Upload your solution image</p>
            </div>
          )}
          <button
            onClick={submitAnswer}
            disabled={loading || !answer}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Submit Answer"}
          </button>
        </div>
      )}

      {/* Feedback display */}
      {feedback && (
        <div className="mt-4 p-4 bg-gray-50 rounded border">
          <h2 className="text-lg font-semibold">Feedback</h2>
          <p className={feedback.isCorrect ? "text-green-500" : "text-red-500"}>
            {feedback.isCorrect ? "Correct!" : "Incorrect"}
          </p>
          <div dangerouslySetInnerHTML={{ __html: feedback.commentary }} />
        </div>
      )}
    </div>
  );
}