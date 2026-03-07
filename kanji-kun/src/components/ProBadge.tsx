import { Link } from 'react-router-dom';
import './ProBadge.css';

interface ProBadgeProps {
  requiredPlan: 'pro' | 'business';
}

export function ProBadge({ requiredPlan }: ProBadgeProps) {
  return (
    <Link to="/pricing" className="pro-badge-link">
      <span className={`pro-badge ${requiredPlan === 'business' ? 'business' : ''}`}>
        {requiredPlan === 'pro' ? 'Pro' : 'Business'}
      </span>
    </Link>
  );
}

interface FeatureGateProps {
  children: React.ReactNode;
  isLocked: boolean;
  requiredPlan: 'pro' | 'business';
  featureName: string;
}

export function FeatureGate({ children, isLocked, requiredPlan, featureName }: FeatureGateProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div className="feature-gate">
      <div className="feature-gate-overlay">
        <div className="feature-gate-content">
          <span className="gate-lock">🔒</span>
          <p className="gate-text">{featureName}は{requiredPlan === 'pro' ? 'Pro' : 'Business'}プラン以上で利用可能です</p>
          <Link to="/pricing" className="gate-upgrade-btn">
            プランをアップグレード
          </Link>
        </div>
      </div>
      <div className="feature-gate-preview">{children}</div>
    </div>
  );
}
