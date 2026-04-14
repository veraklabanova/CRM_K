// ============================================================
// EnterpriseCRM — Demo Walkthrough (Guided Tour)
// Overlay guided tour through 7 Happy Path scenarios.
// Triggered by "Demo pruchod" button in the header.
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Tour step definitions — 7 Happy Path scenarios
// ---------------------------------------------------------------------------

export interface TourStep {
  id: string;
  title: string;
  route: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'AC-01',
    title: 'Customer 360',
    route: '/customers/CUS-001',
    description: 'Zde vidite kompletni Customer 360 — profil zakaznika se vsemi sekcemi.',
  },
  {
    id: 'AC-04',
    title: 'Pipeline Close',
    route: '/pipeline',
    description: 'Pipeline prehled. Kliknete na prilezitost pro detail.',
  },
  {
    id: 'AC-07',
    title: 'Finance Gate',
    route: '/finance-reviews',
    description: 'Finance Review Queue — dealy cekajici na rozhodnuti Finance Controller.',
  },
  {
    id: 'AC-09',
    title: 'Contract',
    route: '/contracts',
    description: 'Seznam smluv. Vytvorte novou nebo otevrete existujici.',
  },
  {
    id: 'AC-11',
    title: 'Support Case',
    route: '/support-cases',
    description: 'Support pozadavky s SLA indikatory.',
  },
  {
    id: 'AC-14',
    title: 'Conflict Resolution',
    route: '/conflicts',
    description: 'Meziodddelove konflikty. Otevrete konflikt pro rozhodovani.',
  },
  {
    id: 'AC-16',
    title: 'Audit Log',
    route: '/audit-log',
    description: 'Auditni zaznamy — kompletni historie zmen a rozhodnuti.',
  },
];

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface DemoTourState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DemoContext = createContext<DemoTourState | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const DemoTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const navigateToStep = useCallback(
    (stepIndex: number) => {
      const step = TOUR_STEPS[stepIndex];
      if (step) {
        navigate(step.route);
      }
    },
    [navigate],
  );

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    navigateToStep(0);
    console.log('[Telemetry] demo_tour_started');
  }, [navigateToStep]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) {
        // Tour finished — auto-end
        setIsActive(false);
        console.log('[Telemetry] demo_tour_completed');
        return prev;
      }
      navigateToStep(next);
      console.log(`[Telemetry] demo_tour_step_${next + 1}`);
      return next;
    });
  }, [navigateToStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(0, prev - 1);
      navigateToStep(next);
      return next;
    });
  }, [navigateToStep]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    console.log('[Telemetry] demo_tour_ended');
  }, []);

  const value: DemoTourState = {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    startTour,
    nextStep,
    prevStep,
    endTour,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDemoTour(): DemoTourState {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error('useDemoTour must be used within a DemoTourProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Overlay component
// ---------------------------------------------------------------------------

export const DemoWalkthrough: React.FC = () => {
  const { isActive, currentStep, totalSteps, nextStep, prevStep, endTour } = useDemoTour();

  // Close on Escape key
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, endTour]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 transition-opacity"
        onClick={endTour}
      />

      {/* Floating tooltip — top center */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-lg px-4">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white">
            <span className="text-sm font-semibold">
              Krok {currentStep + 1} z {totalSteps}
            </span>
            <span className="text-sm font-medium opacity-90">
              {step.id} — {step.title}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-blue-100">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-gray-700 text-sm leading-relaxed">{step.description}</p>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
            <button
              onClick={endTour}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Ukoncit
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={prevStep}
                disabled={isFirst}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isFirst
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Predchozi
              </button>
              <button
                onClick={nextStep}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {isLast ? 'Dokoncit' : 'Dalsi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoWalkthrough;
