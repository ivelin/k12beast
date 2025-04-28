// File path: src/app/page.tsx
// Updated home page with improved mobile responsiveness for iPhone

"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// Animation variants for the hero section
const heroVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

// Animation variants for feature cards
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center">
      {/* Hero Section with Dragon Image */}
      <motion.div
        className="container text-center max-w-[90vw] sm:max-w-2xl py-8"
        initial="hidden"
        animate="visible"
        variants={heroVariants}
      >
        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-4">
          Unleash Your K12Beast
        </h1>
        {/* Dragon Image */}
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-6">
          <Image
            src="/k12beast.jpg"
            alt="K12Beast Dragon Mascot"
            fill
            className="object-contain animate-bounce-slow"
            priority
          />
        </div>

        {/* Description */}
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 px-4">
          Your magical study companion for K12 success! Chat with our AI, take fun quizzes, and soar to the top of your class!
        </p>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 px-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 transition-all">
            <Link href="/chat" className="text-primary-foreground">
              Start Learning
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10 transition-all"
          >
            <Link href="/public/signup">
              Sign Up Now
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Feature Cards Section */}
      <motion.div
        className="container max-w-[90vw] sm:max-w-4xl py-8 mb-8"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: { staggerChildren: 0.2 },
          },
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          {/* Feature 1: AI Tutor */}
          <motion.div
            className="bg-card p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            variants={cardVariants}
          >
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">AI Tutor</h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              Submit your problem via text or photo to start an AI tutoring session.
            </p>
          </motion.div>

          {/* Feature 2: Personalized Quizzes */}
          <motion.div
            className="bg-card p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            variants={cardVariants}
          >
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Personalized Quizzes</h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              Test your knowledge with fun and tailored quizzes.
            </p>
          </motion.div>

          {/* Feature 3: Track Progress */}
          <motion.div
            className="bg-card p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            variants={cardVariants}
          >
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Track Progress</h3>
            <p className="text-muted-foreground text-sm sm:text-base">
              Monitor your readiness and excel in school tests.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}