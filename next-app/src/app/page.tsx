"use client";

import { Onboarding } from '@/components/Onboarding';
import { useEffect, useState } from 'react';

// export const dynamic = 'force-dynamic';

export default function Home() {
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
    useEffect(() => {
      const onboardingComplete = document.cookie.includes('onboarding_complete=true');
      setHasCompletedOnboarding(onboardingComplete);
    }, []);
  
    if (!hasCompletedOnboarding) {
      return <Onboarding />;
    }
  
    return (
      <main>
        <h1>Welcome to the Investment Tracker</h1>
      </main>
    );
  }