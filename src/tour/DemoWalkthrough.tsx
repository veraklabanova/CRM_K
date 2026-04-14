// ============================================================
// EnterpriseCRM — Demo Walkthrough (Guided Tour)
// Overlay guided tour through 7 Happy Path scenarios.
// Triggered by "Demo průchod" button in the header.
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
    description: 'Zde vidíte kompletní Customer 360 — profil zákazníka se všemi sekcemi.',
  },
  {
    id: 'AC-04',
    title: 'Pipeline Close',
    route: '/pipeline',
    description: 'Pipeline přehled. Klikněte na příležitost pro detail.',
  },
  {
    id: 'AC-07',
    title: 'Finance Gate',
    route: '/finance-reviews',
    description: 'Finance Review Queue — dealy čekající na rozhodnutí Finance Controller.',
  },
  {
    id: 'AC-09',
    title: 'Contract',
    route: '/contracts',
    description: 'Seznam smluv. Vytvořte novou nebo otevřete existující.',
  },
  {
    id: 'AC-11',
    title: 'Support Case',
    route: '/support-cases',
    description: 'Support požadavky s SLA indikátory.',
  },
  {
    id: 'AC-14',
    title: 'Conflict Resolution',
    route: '/conflicts',
    description: 'Mezioddělové konflikty. Otevřete konflikt pro rozhodování.',
  },
  {
    id: 'AC-16',
    title: 'Audit Log',
    route: '/audit-log',
    description: 'Auditní záznamy — kompletní historie změn a rozhodnutí.',
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
// Overlay component (draggable)
// ---------------------------------------------------------------------------

// Card width constant used for default centering and boundary clamping
const CARD_WIDTH = 480;

export const DemoWalkthrough: React.FC = () => {
  const { isActive, currentStep, totalSteps, nextStep, prevStep, endTour } = useDemoTour();

  // --- Drag state ---
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 80,
    left: Math.max(0, Math.round((typeof window !== 'undefined' ? window.innerWidth : 1024) / 2 - CARD_WIDTH / 2)),
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset position to top-center when tour starts
  useEffect(() => {
    if (isActive) {
      setPosition({
        top: 80,
        left: Math.max(0, Math.round(window.innerWidth / 2 - CARD_WIDTH / 2)),
      });
    }
  }, [isActive]);

  // --- Clamp helper: keep card inside viewport ---
  const clampPosition = useCallback(
    (top: number, left: number): { top: number; left: number } => {
      const cardEl = cardRef.current;
      const cardW = cardEl ? cardEl.offsetWidth : CARD_WIDTH;
      const cardH = cardEl ? cardEl.offsetHeight : 220;
      return {
        top: Math.min(Math.max(0, top), window.innerHeight - cardH),
        left: Math.min(Math.max(0, left), window.innerWidth - cardW),
      };
    },
    [],
  );

  // --- Mouse / touch move & up handlers (registered on window) ---
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (clientX: number, clientY: number) => {
      const newTop = clientY - dragOffset.current.y;
      const newLeft = clientX - dragOffset.current.x;
      setPosition(clampPosition(newTop, newLeft));
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      onMove(e.clientX, e.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, clampPosition]);

  // --- Drag start handlers ---
  const onDragStart = useCallback(
    (clientX: number, clientY: number) => {
      dragOffset.current = {
        x: clientX - position.left,
        y: clientY - position.top,
      };
      setIsDragging(true);
    },
    [position],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onDragStart(e.clientX, e.clientY);
    },
    [onDragStart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [onDragStart],
  );

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

      {/* Floating draggable tooltip */}
      <div
        ref={cardRef}
        className="fixed z-[9999] w-full max-w-lg select-none"
        style={{
          top: position.top,
          left: position.left,
          maxWidth: CARD_WIDTH,
        }}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header bar — drag handle */}
          <div
            className={`flex items-center justify-between px-5 py-3 bg-blue-600 text-white ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Grip icon as drag indicator */}
            <div className="flex items-center gap-2">
              <span
                className="text-white/60 text-base leading-none select-none"
                aria-hidden="true"
                title="Přetažením přesunete"
              >
                &#x2817;
              </span>
              <span className="text-sm font-semibold">
                Krok {currentStep + 1} z {totalSteps}
              </span>
            </div>
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
              Ukončit
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
                Předchozí
              </button>
              <button
                onClick={nextStep}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {isLast ? 'Dokončit' : 'Další'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoWalkthrough;
