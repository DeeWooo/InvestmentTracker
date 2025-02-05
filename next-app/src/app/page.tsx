"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from '@/components/HomePage';

// export const dynamic = 'force-dynamic';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[HomePage] Checking onboarding status');
    const onboarded = document.cookie.includes('onboarded=');
    if (!onboarded) {
      console.log('[HomePage] Redirecting to onboarding');
      router.push('/onboarding');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1>Loading...</h1>
      </div>
    );
  }

  return <HomePage />;
}