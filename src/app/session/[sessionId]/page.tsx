// src/app/session/[sessionId]/page.tsx
// This page displays the details of a specific session (route: /session/[sessionId])

import Link from "next/link";
import supabase from "../../../supabase/serverClient"; // Use the existing server-side client

// Server Component: Fetch session data directly on the server
export default async function SessionPage({ params }) {
  // Await params to access sessionId
  const { sessionId } = await params;

  let session = null;
  let error = null;

  try {
    const { data, error: fetchError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch session: ${fetchError.message}`);
    }

    if (!data) {
      throw new Error("Session not found");
    }

    session = data;

    // Debug logging to inspect the session data
    console.log("Fetched session data:", session);
  } catch (err) {
    error = err.message || "An unexpected error occurred";
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
        <Link href="/chat" className="mt-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-700"> {/* Updated to /chat */}
          Start a New Session
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">K12Beast</h1>
          <div className="space-x-4">
            <Link href="/chat" className="hover:underline">Chat</Link> {/* Updated to /chat */}
            <Link href="/history" className="hover:underline">History</Link>
          </div>
        </div>
      </nav>
      <div className="flex-1 max-w-4xl mx-auto p-4">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Session Details</h1>
        <div className="bg-gray-100 p-4 rounded-lg">
          {/* Display the original problem statement and images */}
          {(session.problem || session.images) ? (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Original Problem</h2>
              {session.problem ? (
                <p>{session.problem}</p>
              ) : (
                <p className="text-gray-500 italic">No problem statement available.</p>
              )}
              {session.images && session.images.length > 0 ? (
                <div className="mt-2">
                  <p><strong>Images:</strong></p>
                  <div className="flex flex-wrap gap-2">
                    {session.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Problem image ${index + 1}`}
                        className="max-w-[150px] rounded"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic mt-2">No images available.</p>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Original Problem</h2>
              <p className="text-gray-500 italic">No problem statement or images available for this session.</p>
            </div>
          )}
          {session.lesson && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Lesson</h2>
              <div dangerouslySetInnerHTML={{ __html: session.lesson }} />
            </div>
          )}
          {session.examples && session.examples.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Examples</h2>
              {session.examples.map((example, index) => (
                <div key={index} className="mb-2">
                  <p><strong>Example Problem:</strong> {example.problem}</p>
                  {example.solution && example.solution.length > 0 && (
                    <div className="mt-2">
                      {example.solution.map((step, stepIndex) => (
                        <div key={stepIndex} className="mt-1">
                          <h5 className="font-medium">{step.title}</h5>
                          <div dangerouslySetInnerHTML={{ __html: step.content }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {session.quizzes && session.quizzes.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Quizzes</h2>
              {session.quizzes.map((quiz, index) => (
                <div key={index} className="mb-2">
                  <p><strong>Problem:</strong> {quiz.problem}</p>
                  {quiz.answer && (
                    <>
                      <p><strong>Your Answer:</strong> {quiz.answer}</p>
                      <p><strong>Result:</strong> {quiz.isCorrect ? "Correct" : "Incorrect"}</p>
                      <div dangerouslySetInnerHTML={{ __html: quiz.commentary }} />
                      {quiz.solution && !quiz.isCorrect && (
                        <div className="mt-2 p-2 bg-gray-50 rounded">
                          <h4 className="font-semibold">Solution</h4>
                          {quiz.solution.map((step, stepIndex) => (
                            <div key={stepIndex} className="mt-1">
                              <h5 className="font-medium">{step.title}</h5>
                              <div dangerouslySetInnerHTML={{ __html: step.content }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {session.notes && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <p>{session.notes}</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-center">
          <Link href="/chat" className="p-2 bg-blue-500 text-white rounded hover:bg-blue-700"> {/* Updated to /chat */}
            Start a New Session
          </Link>
        </div>
      </div>
    </div>
  );
}