"use client";

import { useState, useEffect } from "react";
import supabase from "../supabase/browserClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/upload");
      }
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else setMessage("Sign-up successful! Check your email to confirm.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else router.push("/upload");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">K12Beast</h1>
          <div className="space-x-4">
            <Link href="/upload" className="hover:underline">Chat</Link>
            <Link href="/sessions" className="hover:underline">Sessions</Link>
          </div>
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-full md:max-w-md w-full text-center">
          <h1 className="text-2xl mb-4 md:text-4xl">
            {isSignUp ? "Sign Up for K12Beast" : "Login to K12Beast"}
          </h1>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 mb-2 border border-gray-300 rounded text-base"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 mb-2 border border-gray-300 rounded text-base"
            />
            <button
              type="submit"
              className="w-full p-2 bg-blue-500 text-white rounded text-base hover:bg-blue-700"
            >
              {isSignUp ? "Sign Up" : "Log In"}
            </button>
          </form>
          <p className="text-red-500 text-sm mt-2">{message}</p>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full p-2 bg-gray-300 rounded text-base hover:bg-gray-400 mt-2"
          >
            {isSignUp ? "Switch to Login" : "Switch to Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}