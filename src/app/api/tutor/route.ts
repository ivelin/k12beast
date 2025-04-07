import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating session IDs
import { NextResponse } from 'next/server';
import supabase from '@/supabase/serverClient';
import { sendXAIRequest } from '@/utils/xaiClient';
import { handleApiError } from '@/utils/errorHandler';

const responseFormat = `Return a JSON object with the tutoring lesson based on the provided chat history
and original input problem or image. The response must include an evaluation of the student's problem and
proposed solution (if provided), followed by a personalized lesson. Structure: {"isK12": true, "lesson":"..."}. 
If no proposed solution is provided, the evaluation section should explain the problem's context and what the student needs to learn.
Encourage the student to request more examples and quizzes when ready. Do not quiz them yet.
If not K12-related, return {"isK12": false, "error": "Prompt must be related to K12 education"}.`;

export async function POST(request: Request) {
  try {
    const { problem, images } = await request.json();
    const sessionId = request.headers.get('x-session-id') || uuidv4(); // Use provided sessionId or generate a new one

    console.log('Creating new session with problem:', { problem, images });

    // Insert a new session with a generated ID
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        id: sessionId, // Provide the ID
        lesson: null,
        examples: null,
        quizzes: null,
        performanceHistory: null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating session:', error?.message || 'No data returned');
      throw new Error(`Failed to create session: ${error?.message || 'Unknown error'}`);
    }

    const session = data;

    // Send request to xAI API for a lesson
    const lessonResponse = await sendXAIRequest({
      problem,
      images,
      responseFormat,
      defaultResponse: { isK12: true, lesson: 'No lesson generated.' },
      validateK12: true,
      chatHistory: [], // Add chat history if needed
    });

    // Check if the response is K12-related
    if (!lessonResponse.isK12) {
      throw new Error(lessonResponse.error || 'Prompt must be related to K12 education');
    }

    if (!lessonResponse.lesson) {
      throw new Error('No lesson returned from xAI API');
    }

    // Update the session with the lesson
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ lesson: lessonResponse.lesson })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update session with lesson: ${updateError.message}`);
    }

    // Return the lesson content directly as a string (not wrapped in JSON)
    return new NextResponse(lessonResponse.lesson, {
      headers: {
        'Content-Type': 'text/plain', // Indicate that the response is plain text (HTML string)
        'x-session-id': sessionId,
      },
    });
  } catch (error) {
    return handleApiError(error, '/api/tutor');
  }
}