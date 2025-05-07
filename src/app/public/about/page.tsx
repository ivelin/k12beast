// File path: src/app/public/about/page.tsx
// About page for K12Beast, detailing its purpose, open-source status, and brand ownership

import Link from "next/link";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[90vw] sm:max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">About K12Beast</h1>
      <p className="mb-4 text-muted-foreground">
        K12Beast is a personalized tutoring platform designed to help K-12 students
        master academic concepts through AI-powered lessons, examples, and quizzes.
        Our mission is to make learning engaging and accessible for students,
        parents, and educators.
      </p>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Open-Source Software</h2>
        <p className="text-muted-foreground">
          K12Beast is proudly open-source, licensed under the{" "}
          <a
            href="https://www.apache.org/licenses/LICENSE-2.0"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apache License 2.0
          </a>
          . Developers can explore, contribute to, or modify the source code on our{" "}
          <a
            href="https://github.com/ivelin/k12beast"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub repository
          </a>
          .
        </p>
      </section>
      <section className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Ownership</h2>
        <p className="text-muted-foreground">
          The K12Beast brand and the k12beast.com domain are owned by zk0 DBA,
          a company based in Austin, Texas.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
        <p className="text-muted-foreground">
          Have questions? Reach out to us at{" "}
          <a
            href="mailto:support@k12beast.com"
            className="text-primary hover:underline"
          >
            support@k12beast.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}