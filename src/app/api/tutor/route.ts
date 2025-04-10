// src/app/api/tutor/route.ts
import { v4 as uuidv4 } from 'uuid';
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
    const sessionId = request.headers.get('x-session-id') || uuidv4();

    // Get the Authorization token from the request headers
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    console.log('Creating new session with problem:', { problem, images, userId: user.id });

    // Insert a new session with problem, images, and user_id
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        problem, // Save the problem text
        images,  // Save the image URLs
        lesson: null,
        examples: null,
        quizzes: null,
        performanceHistory: null,
        user_id: user.id, // Associate the session with the authenticated user
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
      chatHistory: [],
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

    // Return the lesson content directly as a string
    return new NextResponse(lessonResponse.lesson, {
      headers: {
        'Content-Type': 'text/plain',
        'x-session-id': sessionId,
      },
    });
  } catch (error) {
    return handleApiError(error, '/api/tutor');
  }
}