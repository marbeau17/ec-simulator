import { EventStep } from '../types';
import './StepIndicator.css';

const STEPS: { key: EventStep; label: string; num: number }[] = [
  { key: 'purpose', label: '目的設定', num: 1 },
  { key: 'participants', label: '参加者', num: 2 },
  { key: 'date_adjustment', label: '日程調整', num: 3 },
  { key: 'date_decision', label: '日程決定', num: 4 },
  { key: 'location', label: '場所決定', num: 5 },
  { key: 'confirmed', label: '確定', num: 6 },
];

interface StepIndicatorProps {
  currentStep: EventStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="step-indicator">
      {STEPS.map((step, i) => (
        <div
          key={step.key}
          className={`step-item ${
            i < currentIndex ? 'completed' : i === currentIndex ? 'active' : 'pending'
          }`}
        >
          <div className="step-circle">{i < currentIndex ? '✓' : step.num}</div>
          <span className="step-label">{step.label}</span>
          {i < STEPS.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  );
}
