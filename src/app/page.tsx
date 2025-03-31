'use client';

import { useState } from 'react';
import supabase from '../supabase/client';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else setMessage('Sign-up successful! Check your email to confirm.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else router.push('/upload');
    }
  };

  return (
    <div className="max-w-full p-5 mx-auto text-center md:max-w-md">
      <h1 className="text-2xl mb-4 md:text-4xl">
        {isSignUp ? 'Sign Up for k12beast' : 'Login to k12beast'}
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
          {isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <p className="text-red-500 text-sm">{message}</p>
      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="w-full p-2 bg-gray-300 rounded text-base hover:bg-gray-400"
      >
        {isSignUp ? 'Switch to Login' : 'Switch to Sign Up'}
      </button>
    </div>
  );
}