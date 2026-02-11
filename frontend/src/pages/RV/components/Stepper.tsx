import { Check } from 'lucide-react';

export interface StepConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
}

interface StepperProps {
  steps: StepConfig[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  completedSteps?: Set<number>;
}

export default function Stepper({ steps, currentStep, onStepClick, completedSteps = new Set() }: StepperProps) {
  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const isPast = index < currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <button
                onClick={() => (isPast || isCompleted) && onStepClick?.(index)}
                disabled={!isPast && !isCompleted && !isActive}
                className={`flex flex-col items-center gap-1.5 group transition-all ${
                  (isPast || isCompleted) ? 'cursor-pointer' : isActive ? 'cursor-default' : 'cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/25 scale-110'
                      : isCompleted || isPast
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-nexus-bg border-2 border-nexus-border text-nexus-muted'
                  }`}
                >
                  {isCompleted || isPast ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    <Icon size={18} />
                  )}
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-nexus-purple' : isPast || isCompleted ? 'text-emerald-600' : 'text-nexus-muted'
                  }`}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-[9px] text-nexus-muted mt-0.5 max-w-[100px]">{step.description}</p>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 mt-[-20px]">
                  <div className={`h-[2px] rounded-full transition-all duration-500 ${
                    isPast || isCompleted ? 'bg-emerald-400' : 'bg-nexus-border'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-nexus-muted">Etapa {currentStep + 1} de {steps.length}</span>
          <span className="text-xs font-semibold text-nexus-purple">{steps[currentStep]?.label}</span>
        </div>
        <div className="flex gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'bg-gradient-to-r from-purple-600 to-blue-500'
                  : index < currentStep
                    ? 'bg-emerald-400'
                    : 'bg-nexus-border'
              }`}
            />
          ))}
        </div>
        {steps[currentStep]?.description && (
          <p className="text-[10px] text-nexus-muted mt-1.5">{steps[currentStep].description}</p>
        )}
      </div>
    </div>
  );
}
