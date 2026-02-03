import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="search"]',
    title: 'Search for Students',
    content: 'Type a student name, ID, grade, or teacher name to find students. Press "/" to quickly focus the search bar.',
    position: 'bottom',
  },
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation',
    content: 'Access all features from the sidebar: Reports, Flagging System, Analytics, Observations, and more.',
    position: 'right',
  },
  {
    target: '[data-tour="nori"]',
    title: 'Meet Nori',
    content: 'Nori is your AI assistant. Ask questions about students, request reports, or get insights about your data.',
    position: 'left',
  },
  {
    target: '[data-tour="admin"]',
    title: 'Admin Settings',
    content: 'Manage users, upload data, configure flagging rules, and access system settings.',
    position: 'top',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position
      const pos = { top: 0, left: 0 };
      const tooltipWidth = 320;
      const tooltipHeight = 160;
      const margin = 16;

      switch (step.position) {
        case 'bottom':
          pos.top = rect.bottom + margin;
          pos.left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'top':
          pos.top = rect.top - tooltipHeight - margin;
          pos.left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          pos.top = rect.top + rect.height / 2 - tooltipHeight / 2;
          pos.left = rect.left - tooltipWidth - margin;
          break;
        case 'right':
          pos.top = rect.top + rect.height / 2 - tooltipHeight / 2;
          pos.left = rect.right + margin;
          break;
        default:
          pos.top = rect.bottom + margin;
          pos.left = rect.left;
      }

      // Keep within viewport
      pos.left = Math.max(16, Math.min(pos.left, window.innerWidth - tooltipWidth - 16));
      pos.top = Math.max(16, Math.min(pos.top, window.innerHeight - tooltipHeight - 16));

      setPosition(pos);

      // Scroll target into view if needed
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('wasabi-tour-completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('wasabi-tour-completed', 'true');
    onComplete();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-[100]" />

      {/* Spotlight on target */}
      {targetRect && (
        <div
          className="fixed z-[101] ring-4 ring-wasabi-500 ring-offset-4 ring-offset-transparent rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[102] w-80 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl"
        style={{ top: position.top, left: position.left }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-wasabi-500" />
            <span className="font-semibold text-white">{step.title}</span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 text-gray-400 hover:text-white rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="text-gray-300 text-sm">{step.content}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <div className="text-sm text-gray-500">
            {currentStep + 1} of {TOUR_STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-gray-300 hover:text-white transition text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition text-sm font-medium"
            >
              {currentStep < TOUR_STEPS.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook to check if tour should be shown
export function useShouldShowTour(): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('wasabi-tour-completed');
    setShouldShow(!completed);
  }, []);

  return shouldShow;
}

// Reset tour (for testing or user request)
export function resetTour(): void {
  localStorage.removeItem('wasabi-tour-completed');
}
