# K12Beast

K12Beast is a personalized tutoring app for K12 students, designed to help them master concepts through tailored lessons, examples, and quizzes based on their test results. 

Built with Super Grok 3, Next.js, it leverages Supabase (or any PostgreSQL database) for data storage and the Grok/X xAI API for generating educational content. 
This guide will walk you through setting up a local instance of the app from scratch.

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
1. Navigate to the project directory:
    ```
    cd k12beast
    ```

## Setting Up Environment Variables

K12Beast requires environment variables to connect to Supabase (or PostgreSQL) and the xAI API. Follow these steps:

1. Create a `.env.local` file in the root of the project:
    ```
    touch .env.local
    ```
1. Open `.env.local` in a text editor and add the following variables:
    ```
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
    XAI_API_KEY=your-xai-api-key
    XAI_MODEL_NAME=grok-2-vision-1212 ---(or a more recent model)---
    ```
    - Replace `your-supabase-url` and `your-supabase-anon-key` with values from your Supabase project’s API settings.
    - Replace `your-supabase-service-role-key` with the service role key (keep this secret, do not expose in client-side code).
    - Replace `your-xai-api-key` with your xAI API key.
1. Save the file. These variables will be loaded automatically by the app.

## Installing Dependencies

K12Beast uses Node.js dependencies managed by npm. Install them with the following steps:

1. Ensure you are in the project directory (`k12beast`).
1. Run the following command to install all dependencies:
    ```
    npm install
    ```
1. After installation, you’ll see a message reminding you to set up your environment variables if you haven’t already. Ensure `.env.local` is configured as described in the previous section.
1. The `node_modules` directory and `package-lock.json` will be created, containing all required packages.

## Setting Up Supabase/PostgreSQL

K12Beast uses a PostgreSQL database, which can be hosted via Supabase or any PostgreSQL instance. Follow these steps:

1. **Using Supabase**:
   - Log in to your Supabase account and create a new project.
   - Note your project’s URL and anon key from the API settings.
   - In the Supabase dashboard, go to "Project Settings" > "API" to find your service role key.
   - Deploy the `execute-sql` Edge Function:
     - Copy the code from `src/supabase/functions/execute-sql/index.ts`.
     - In the Supabase dashboard, go to "Edge Functions," create a new function named `execute-sql`, and paste the code.
     - Deploy the function.

2. **Using a Local PostgreSQL Instance**:
   - Install PostgreSQL if not already installed.
   - Create a new database:
        ```
        createdb k12beast
        ```
    - Update `.env.local` with your PostgreSQL connection details instead of Supabase keys (you may need to adjust the app’s Supabase client setup in `src/supabase/serverClient.ts` and `src/supabase/browserClient.ts` to use a direct PostgreSQL connection).

3. Ensure your database is running and accessible with the credentials provided in `.env.local`.

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
1. Start the development server with the following command:
    ```
    npm run dev
    ```
1. The app will:
- Run database migrations automatically (as described in the previous section).
- Start a Next.js development server on `http://localhost:3000`.
1. Open your browser and navigate to `http://localhost:3000` to access the app.
1. You should see the login page. Sign up or log in to start using K12Beast.

## Troubleshooting

Here are solutions to common issues when setting up K12Beast:

- **Error: "Missing Supabase environment variables"**
  - Ensure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`. Double-check your Supabase project settings for the correct values.

- **Error: "Failed to run database migrations on startup"**
  - Check your internet connection if using Supabase.
  - Verify that the `execute-sql` Edge Function is deployed in Supabase (if applicable).
  - Ensure your database credentials in `.env.local` are correct.

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

## Contributions

K12Beast welcomes contributions from the community! Follow these steps to contribute:

1. **Fork the Repository**: Fork the repo on GitHub and clone your fork locally.
1. **Create a Branch**: Create a new branch for your changes.
    ```
    git checkout -b feature/your-feature-name
    ```
1.**Make Changes**: Implement your feature or bug fix, following the project’s coding style (e.g., use TypeScript, adhere to ESLint rules).
1. **Test Your Changes**: Ensure your changes work by running the app (`npm run dev`) and testing locally.
1. **Commit and Push**: Commit your changes with a clear message and push to your fork.
    ```
    git commit -m "Add your descriptive commit message"
    git push origin feature/your-feature-name
    ```
1. **Submit a Pull Request**: Open a pull request (PR) on the main repository. Describe your changes, reference any related issues, and ensure your PR passes any automated checks.
1. **Sign the Contributor License Agreement (CLA)**: By contributing, you agree that your contributions are licensed under the Apache 2.0 License. No formal CLA is required, but ensure your contributions comply with the license terms.
1. **Code of Conduct**: We follow a standard open-source Code of Conduct. Be respectful, inclusive, and collaborative in all interactions.

For questions, reach out by opening an issue on GitHub.