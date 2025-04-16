# K12Beast

K12Beast is a personalized tutoring app for K12 students, designed to help them master concepts through tailored lessons, examples, and quizzes based on their test results. Built with Super Grok 3 and Next.js, it leverages Supabase (or any PostgreSQL database) for data storage and the Grok/X xAI API for generating educational content. 

This guide will walk you through setting up a local instance of the app from scratch.

## Student Experience Flow 📚

The student experience follows this flow:
- **Student Registration/Login**: Students register or log in to access the app.
- **New Chat Session**: Students start a new chat session to begin their learning journey.
- **Problem Submission with Optional Student Solution**: Students input a problem and optionally a proposed solution via text or images.
- **AI Problem Evaluation and Solution Comments**: The AI evaluates the problem and the student’s proposed solution (if provided), offering comments on correctness and areas for improvement.
- **Personalized Tutoring Lesson**: The AI delivers a tailored lesson based on the problem and the student’s performance.
- **More Similar Problem Examples**: Upon request, the AI provides additional problem examples with solutions for self-study.
- **Quizzes**: Upon request, the AI offers quizzes for self-testing to reinforce learning.
- **End Session**: Students end the session when they feel ready.
- **Share Session with Parents**: Students can share the session with their parents or teachers for review.

## Parent Experience Flow 👨‍👩‍👧

Parents can engage with their child’s learning progress in a fun and interactive way:
- **Register/Login** 🔐: Parents create an account or log in to access the app.
- **Start a Problem Prompt** ✍️: Parents submit a problem (via text or image) to initiate a learning session for their child.
- **Share with Kid** 📩: Parents share the session link with their child for completion.
- **Kid Clones and Completes** 🚀: The child clones the session into their own workspace, works through lessons, examples, and quizzes until achieving >90% readiness.
- **Kid Shares Proof of Homework** 📄: The child shares the completed session with the parent, showcasing their progress and quiz results.
- **Parent Happy, Kid Rewarded** 🎉: Parents review the work, celebrate success, and kids earn extra credit to ask for something special (like ice cream or game time)!

## Prerequisites

Before setting up K12Beast, ensure you have the following tools and accounts:

- **Node.js and npm**: Version 18.x or later. Download from [nodejs.org](https://nodejs.org).
- **Git**: To clone the repository. Install from [git-scm.com](https://git-scm.com).
- **Supabase Account**: For database and storage (optional if using another PostgreSQL instance). Sign up at [supabase.com](https://supabase.com).
- **PostgreSQL**: Version 14.x or later, if not using Supabase. Install from [postgresql.org](https://www.postgresql.org).
- **xAI API Key**: For generating tutoring content. Request access at [x.ai](https://x.ai).
- **Text Editor**: Such as VS Code, for editing code.
- **Browser**: A modern browser like Chrome or Firefox to test the app.

## Cloning the Repository

To get started, clone the K12Beast repository to your local machine:

1. Open a terminal and run the following command to clone the repo:
    ```
    git clone https://github.com/ivelin/k12beast.git
    ```
2. Navigate to the project directory:
    ```
    cd k12beast
    ```

## Setting Up Environment Variables

K12Beast requires environment variables to connect to Supabase (or PostgreSQL), the xAI API, and for testing. Follow these steps:

1. Create a `.env.local` file in the root of the project:
    ```
    touch .env.local
    ```
2. Open `.env.local` in a text editor and add the following variables:
    ```
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
    XAI_API_KEY=your-xai-api-key
    XAI_MODEL_NAME=<your-model-name>
    TEST_USER_EMAIL=testuser@example.com
    TEST_USER_PASSWORD=password123
    ```
    - Replace `your-supabase-url` and `your-supabase-anon-key` with values from your Supabase project’s API settings.
    - Replace `your-supabase-service-role-key` with the service role key (keep this secret, do not expose in client-side code).
    - Replace `your-xai-api-key` with your xAI API key.
    - Replace `<your-model-name>` with the latest xAI model name (check [x.ai](https://x.ai) for details).
    - Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` for local E2E testing. These must match a test user created in Supabase (see Testing section).
3. Save the file. These variables will be loaded automatically by the app.
4. For CI (GitHub Actions), ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_EMAIL`, and `TEST_USER_PASSWORD` are set in your repository’s secrets (see `.github/workflows/e2e-tests.yaml`).

## Installing Dependencies

K12Beast uses Node.js dependencies managed by npm. Install them with the following steps:

1. Ensure you are in the project directory (`k12beast`).
2. Run the following command to install all dependencies:
    ```
    npm install
    ```
3. After installation, you’ll see a message reminding you to set up your environment variables if you haven’t already. Ensure `.env.local` is configured as described in the previous section.
4. The `node_modules` directory and `package-lock.json` will be created, containing all required packages.

## Setting Up Supabase/PostgreSQL

K12Beast uses a PostgreSQL database, which can be hosted via Supabase or any PostgreSQL instance. Follow these steps:

1. **Using Supabase (Cloud)**:
   - Log in to your Supabase account and create a new project.
   - Note your project’s URL and anon key from the API settings.
   - In the Supabase dashboard, go to "Project Settings" > "API" to find your service role key.
   - Deploy the `execute-sql` Edge Function **before running migrations**:
     - Copy the code from `src/supabase/functions/execute-sql/index.ts`.
     - In the Supabase dashboard, go to "Edge Functions," create a new function named `execute-sql`, and paste the code.
     - Deploy the function.
   - Apply the local SQL functions:
     - Copy the code from `src/supabase/functions/local-sql.sql`.
     - In the Supabase dashboard, go to the "SQL Editor," paste the code, and run it. This sets up necessary functions and permissions, such as `validate_user_id`, required for migrations.

2. **Using a Local Supabase Instance**:
   - Ensure you have the Supabase CLI installed. Install it via npm if needed:
     ```
     npm install -g supabase
     ```
   - Start your local Supabase instance:
     ```
     supabase start
     ```
   - Deploy the `execute-sql` Edge Function locally **before running migrations**:
     - The `execute-sql` function is located at `src/supabase/functions/execute-sql/index.ts`.
     - Use the Supabase CLI to deploy it:
       ```
       supabase functions deploy execute-sql --project-ref local
       ```
     - Note: `project-ref local` assumes your local Supabase instance is running. If you encounter issues, ensure your Supabase CLI is logged in and linked to your project (use `supabase login` and `supabase link` if needed).
   - Apply the local SQL functions:
     - Run the following command to apply `local-sql.sql` to your local database:
       ```
       psql -h localhost -p 54322 -U postgres -d k12beast -f src/supabase/functions/local-sql.sql
       ```
     - Adjust the host, port, and user as needed based on your `src/supabase/config.toml` settings (default port for local Supabase is 54322).

3. **Using a Local PostgreSQL Instance (Without Supabase)**:
   - Install PostgreSQL if not already installed.
   - Create a new database:
     ```
     createdb k12beast
     ```
   - Apply the local SQL functions:
     - Run the following command to apply `local-sql.sql` to your database:
       ```
       psql -h localhost -p 5432 -U postgres -d k12beast -f src/supabase/functions/local-sql.sql
       ```
     - Adjust the host, port, and user as needed based on your PostgreSQL setup.
   - Update `.env.local` with your PostgreSQL connection details instead of Supabase keys (you may need to adjust the app’s Supabase client setup in `src/supabase/serverClient.ts` and `src/supabase/browserClient.ts` to use a direct PostgreSQL connection).
   - Note: If using a local PostgreSQL instance without Supabase, the `execute-sql` Edge Function is not applicable, and you’ll need to modify the migration scripts (`scripts/migrationUtils.js`) to execute SQL directly against your PostgreSQL database.

4. Ensure your database is running and accessible with the credentials provided in `.env.local`.

## Running Database Migrations

K12Beast automatically runs database migrations on startup to set up the required schema. Here’s what happens:

1. When you start the app (via `npm run dev` or `npm start`), the `scripts/migrate.js` script is executed automatically.
2. The migration script will:
   - Connect to your Supabase or PostgreSQL database using the credentials in `.env.local`.
   - Create necessary tables like `sessions`, `migrations`, and `db_app_version_compatibility`.
   - Apply any pending migrations (e.g., adding columns like `completed`, `notes`).
3. If migrations fail (e.g., due to network issues or missing environment variables), the app will not start, and you’ll see an error message. Check the troubleshooting section for solutions.
4. You don’t need to run migrations manually unless debugging; they are handled on startup.

## Starting the Development Server

Once your environment is set up, you can start the K12Beast development server:

1. Ensure your Supabase or PostgreSQL database is running and accessible.
2. Start the development server with the following command:
    ```
    npm run dev
    ```
3. The app will:
   - Run database migrations automatically (as described in the previous section).
   - Start a Next.js development server on `http://localhost:3000`.
4. Open your browser and navigate to `http://localhost:3000` to access the app.
5. You should see the login page. Sign up or log in to start using K12Beast.

## Navigating the App

- **Chat Page (`/chat`)**: The main page where you can submit a problem (text or images) to start a tutoring session. After submitting a problem, you can request more examples, take a quiz, or end the session.
- **Session Detail Page (`/session/[sessionId]`)**: Displays the details of a specific session, including the original problem, lesson, examples, quizzes, and notes.
- **Session History Page (`/history`)**: Lists all your past sessions, allowing you to view their details by clicking on a session.

## Troubleshooting

Here are solutions to common issues when setting up K12Beast:

- **Error: "Missing Supabase environment variables"**
  - Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`. Double-check your Supabase project settings for the correct values.
- **Error: "Failed to run database migrations on startup"**
  - Check your internet connection if using Supabase.
  - Verify that the `execute-sql` Edge Function is deployed in Supabase (if applicable).
  - Ensure your database credentials in `.env.local` are correct.
  - Check Supabase’s `auth` schema permissions to ensure `validate_user_id` (from `local-sql.sql`) is accessible.
- **Error: "Unexpected error in xAI request"**
  - Confirm that `XAI_API_KEY` is set in `.env.local` and is valid.
  - Check your network connection, as the xAI API requires internet access.
- **App doesn’t load at `http://localhost:3000`**
  - Ensure the development server is running (`npm run dev`).
  - Check for port conflicts; if port 3000 is in use, Next.js will prompt you to use a different port.

## Additional Resources

For more information on the tools and technologies used in K12Beast, check out these resources:

- **Next.js Documentation**: Learn about Next.js features and APIs at [nextjs.org/docs](https://nextjs.org/docs).
- **Supabase Documentation**: Explore Supabase features, including database and Edge Functions, at [supabase.com/docs](https://supabase.com/docs).
- **PostgreSQL Documentation**: For using a local PostgreSQL instance, refer to [postgresql.org/docs](https://www.postgresql.org/docs).
- **xAI API**: Details on the xAI API for generating educational content are available at [x.ai](https://x.ai).
- **React Documentation**: Understand React concepts at [react.dev](https://react.dev).

## Testing

### Local Setup
- **Install Dependencies**: `npm install`
- **E2E Tests (Playwright)**:
  - Start Supabase: `supabase start`
  - Create a test user in Supabase Auth (e.g., `testuser@example.com`, `password123`) via the Supabase dashboard or CLI.
  - Ensure `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env.local` match the test user.
  - Run: `npm run test:e2e`
  - Debug UI: `npm run test:e2e:ui`
- **Server-Side Tests (Jest)**:
  - Run: `npm run test:server`

### CI Setup (GitHub Actions)
- E2E and server tests run automatically on push/PR to `main` via `.github/workflows/e2e-tests.yaml`.
- Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_EMAIL`, and `TEST_USER_PASSWORD` are set in GitHub Secrets.

### Notes
- Ensure `.env.local` has Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and test user credentials (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`) for local E2E tests.
- Create a test user in Supabase Auth (e.g., `testuser@example.com`, `password123`) via the Supabase dashboard or CLI.
- No xAI keys are needed; tests mock AI calls using `tests/server/mocks/xaiClient.ts`.

## Contributions

K12Beast welcomes contributions from the community! Follow these steps to contribute:

1. **Fork the Repository**: Fork the repo on GitHub and clone your fork locally.
2. **Create a Branch**: Create a new branch for your changes.
    ```
    git checkout -b feature/your-feature-name
    ```
3. **Make Changes**: Implement your feature or bug fix, following the project’s coding style (e.g., use TypeScript, adhere to ESLint rules).
4. **Test Your Changes**: Ensure your changes work by running the app (`npm run dev`) and testing locally.
5. **Commit and Push**: Commit your changes with a clear message and push to your fork.
    ```
    git commit -m "Add your descriptive commit message"
    git push origin feature/your-feature-name
    ```
6. **Submit a Pull Request**: Open a pull request (PR) on the main repository. Describe your changes, reference any related issues, and ensure your PR passes any automated checks.
7. **Sign the Contributor License Agreement (CLA)**: By contributing, you agree that your contributions are licensed under the Apache 2.0 License. No formal CLA is required, but ensure your contributions comply with the license terms.
8. **Code of Conduct**: We follow a standard open-source Code of Conduct. Be respectful, inclusive, and collaborative in all interactions.

For questions, reach out by opening an issue on [GitHub](https://github.com/ivelin/k12beast).