// File path: src/components/ui/CallToAction.tsx
// Subtle call-to-action button for documentation pages, shown only to non-logged-in users

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CallToAction() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null indicates loading

  useEffect(() => {
    // Check for the supabase-auth-token cookie
    const cookies = document.cookie;
    const hasAuthToken = cookies.includes('supabase-auth-token=');
    console.log('CallToAction: Cookie check - supabase-auth-token present:', hasAuthToken);
    setIsAuthenticated(hasAuthToken);
  }, []);

  // Don't render anything until auth status is determined
  if (isAuthenticated === null) {
    return null;
  }

  // Hide CTA if user is authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="mt-6 text-center">
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link href="/public/signup">
          Sign up to start supporting your child’s learning
        </Link>
      </Button>
    </div>
  );
}