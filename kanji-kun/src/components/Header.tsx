import { Link, useLocation } from 'react-router-dom';
import { PlanType } from '../types';
import './Header.css';

interface HeaderProps {
  plan: PlanType;
}

const PLAN_BADGES: Record<PlanType, { label: string; className: string }> = {
  free: { label: 'Free', className: 'badge-free' },
  pro: { label: 'Pro', className: 'badge-pro' },
  business: { label: 'Business', className: 'badge-business' },
};

export function Header({ plan }: HeaderProps) {
  const location = useLocation();
  const badge = PLAN_BADGES[plan];

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">🍻</span>
          <span className="logo-text">カンジくん</span>
        </Link>
        <nav className="nav">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            ダッシュボード
          </Link>
          <Link
            to="/create"
            className={`nav-link ${location.pathname === '/create' ? 'active' : ''}`}
          >
            新規作成
          </Link>
          <Link
            to="/pricing"
            className={`nav-link ${location.pathname === '/pricing' ? 'active' : ''}`}
          >
            料金プラン
          </Link>
        </nav>
        <div className="header-right">
          <span className={`plan-badge ${badge.className}`}>{badge.label}</span>
        </div>
      </div>
    </header>
  );
}
