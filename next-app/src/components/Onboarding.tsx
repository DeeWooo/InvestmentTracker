"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Onboarding() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const steps = [
    {
      title: '全面掌控你的投资',
      description: '实时跟踪所有投资组合的表现，掌握最新动态',
      image: '/onboarding/1.png'
    },
    {
      title: '智能分析，洞察先机',
      description: '通过专业的数据分析，做出更明智的投资决策',
      image: '/onboarding/2.png'
    },
    {
      title: '个性化提醒，不错过任何机会',
      description: '设置价格提醒，及时把握市场变化',
      image: '/onboarding/3.png'
    }
  ];

  const currentStep = steps[step];

  const handleComplete = () => {
    document.cookie = 'onboarding_complete=true; path=/';
    router.push('/');
  };

  return (
    <div className="flex flex-col h-screen p-6">
      {/* 内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <img 
          src={currentStep.image} 
          alt={currentStep.title}
          className="w-64 h-64 mb-8"
        />
        <h2 className="text-2xl font-bold mb-4 text-center">
          {currentStep.title}
        </h2>
        <p className="text-gray-500 text-center max-w-md">
          {currentStep.description}
        </p>
      </div>

      {/* 底部控制区域 */}
      <div className="space-y-4">
        {/* 进度指示器 */}
        <div className="flex justify-center space-x-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === step ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between">
          {step > 0 && (
            <Button 
              variant="ghost" 
              onClick={() => setStep(step - 1)}
            >
              上一步
            </Button>
          )}
          
          {step < steps.length - 1 ? (
            <Button 
              className="ml-auto"
              onClick={() => setStep(step + 1)}
            >
              下一步
            </Button>
          ) : (
            <Button 
              className="ml-auto"
              onClick={handleComplete}
            >
              开始使用
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}