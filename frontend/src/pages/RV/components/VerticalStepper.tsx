import { Check, ChevronDown, ChevronUp } from 'lucide-react';

export interface StepConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
}

interface VerticalStepperProps {
  steps: StepConfig[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  completedSteps?: Set<number>;
  children: React.ReactNode[];
}

export default function VerticalStepper({ 
  steps, 
  currentStep, 
  onStepClick, 
  completedSteps = new Set(),
  children 
}: VerticalStepperProps) {
  
  return (
    <div className="w-full space-y-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(index);
        const isPast = index < currentStep;
        const isFuture = index > currentStep;
        const Icon = step.icon;
        const isClickable = (isPast || isCompleted) && !isActive;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Vertical connector line */}
            {!isLast && (
              <div 
                className={`absolute left-5 top-12 w-0.5 h-6 transition-all duration-300 ${
                  isPast || isCompleted ? 'bg-emerald-400' : 'bg-nexus-border'
                }`}
                style={{ zIndex: 0 }}
              />
            )}

            {/* Step container */}
            <div 
              className={`card overflow-hidden transition-all duration-300 ${
                isActive ? 'ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10' : ''
              } ${isFuture ? 'opacity-60' : ''}`}
            >
              {/* Header */}
              <button
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={`w-full flex items-center gap-4 p-4 transition-all duration-200 ${
                  isClickable 
                    ? 'cursor-pointer hover:bg-nexus-bg/50' 
                    : isActive 
                      ? 'cursor-default' 
                      : 'cursor-not-allowed'
                }`}
              >
                {/* Number or Check Circle */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/25 scale-105'
                      : isCompleted || isPast
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-nexus-bg border-2 border-nexus-border text-nexus-muted'
                  }`}
                >
                  {isCompleted || (isPast && !isActive) ? (
                    <Check size={20} strokeWidth={2.5} />
                  ) : (
                    <span className="font-bold text-sm">{index}</span>
                  )}
                </div>

                {/* Icon */}
                <div 
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-purple-100 text-purple-600' 
                      : isCompleted || isPast
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-nexus-bg text-nexus-muted'
                  }`}
                >
                  <Icon size={18} />
                </div>

                {/* Title and Description */}
                <div className="flex-1 text-left">
                  <p className={`font-semibold text-sm transition-colors ${
                    isActive 
                      ? 'text-nexus-purple' 
                      : isCompleted || isPast 
                        ? 'text-emerald-600' 
                        : 'text-nexus-text'
                  }`}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-nexus-muted mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Chevron indicator */}
                <div className="flex-shrink-0">
                  {isActive ? (
                    <ChevronUp 
                      size={20} 
                      className="text-nexus-purple transition-transform duration-300" 
                    />
                  ) : (
                    <ChevronDown 
                      size={20} 
                      className={`transition-all duration-300 ${
                        isClickable ? 'text-nexus-text' : 'text-nexus-muted'
                      }`}
                    />
                  )}
                </div>
              </button>

              {/* Content (expanded only when active) */}
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  isActive ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="border-t border-nexus-border p-6 bg-nexus-bg/30">
                  {children[index]}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
