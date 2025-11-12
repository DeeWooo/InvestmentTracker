"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomePage from '@/components/HomePage';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[HomePage] Checking onboarding status');
    // 使用 localStorage 替代 cookie，在 Tauri 桌面应用中更可靠
    const onboarded = localStorage.getItem('onboarded');
    if (!onboarded) {
      console.log('[HomePage] Redirecting to onboarding');
      router.push('/onboarding');
    } else {
      console.log('[HomePage] User already onboarded');
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