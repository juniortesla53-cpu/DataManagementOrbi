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
                className={`absolute left-5 top-14 w-0.5 h-4 transition-all duration-500 ${
                  isPast || isCompleted ? 'bg-gradient-to-b from-emerald-400 to-emerald-300' : 'bg-nexus-border'
                }`}
                style={{ zIndex: 1 }}
              />
            )}

            {/* Step container */}
            <div 
              className={`card overflow-hidden transition-all duration-300 ${
                isActive ? 'ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10' : ''
              } ${isFuture ? 'opacity-50' : ''}`}
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
                {/* Number Circle — always shows the number */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg shadow-purple-500/25 scale-110'
                        : isCompleted || isPast
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-nexus-bg border-2 border-nexus-border text-nexus-muted'
                    }`}
                  >
                    {/* Active step pulse ring */}
                    {isActive && (
                      <span className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                    )}
                    <span className="relative font-bold text-sm">{index}</span>
                  </div>

                  {/* Green check badge — overlaid on bottom-right for completed steps */}
                  {(isCompleted || isPast) && !isActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check size={9} strokeWidth={3} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Icon — more prominent with glow effects */}
                <div 
                  className={`relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-purple-100 to-blue-100 text-purple-600 shadow-md shadow-purple-200/50 scale-105' 
                      : isCompleted || isPast
                        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-sm'
                        : 'bg-nexus-bg text-nexus-muted'
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
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
                    <p className={`text-xs mt-0.5 transition-colors ${
                      isActive ? 'text-purple-400' : 'text-nexus-muted'
                    }`}>
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
