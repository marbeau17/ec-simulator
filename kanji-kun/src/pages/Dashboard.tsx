import { Link } from 'react-router-dom';
import { CompanyEvent, EVENT_PURPOSE_LABELS, PlanType, PLAN_LIMITS } from '../types';
import { formatDateJa } from '../utils/holidays';
import './Dashboard.css';

interface DashboardProps {
  events: CompanyEvent[];
  onDelete: (id: string) => void;
  plan: PlanType;
  eventsCreatedThisMonth: number;
}

const STEP_LABELS: Record<string, string> = {
  purpose: '目的設定',
  participants: '参加者選定',
  date_adjustment: '日程調整中',
  date_decision: '日程決定',
  location: '場所決定',
  confirmed: '確定済み',
};

const STEP_COLORS: Record<string, string> = {
  purpose: '#f39c12',
  participants: '#e67e22',
  date_adjustment: '#3498db',
  date_decision: '#2980b9',
  location: '#8e44ad',
  confirmed: '#27ae60',
};

export function Dashboard({ events, onDelete, plan, eventsCreatedThisMonth }: DashboardProps) {
  const limits = PLAN_LIMITS[plan];
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>ダッシュボード</h1>
          <p className="dashboard-subtitle">イベントの管理・進捗状況</p>
        </div>
        <Link to="/create" className="btn-primary">
          ＋ 新規イベント作成
        </Link>
      </div>

      {/* 使用状況 */}
      <div className="usage-cards">
        <div className="usage-card">
          <div className="usage-label">今月のイベント作成数</div>
          <div className="usage-value">
            {eventsCreatedThisMonth} / {limits.maxEventsPerMonth === Infinity ? '∞' : limits.maxEventsPerMonth}
          </div>
          {plan === 'free' && eventsCreatedThisMonth >= limits.maxEventsPerMonth && (
            <Link to="/pricing" className="usage-upgrade">
              上限に達しました → アップグレード
            </Link>
          )}
        </div>
        <div className="usage-card">
          <div className="usage-label">現在のプラン</div>
          <div className="usage-value plan-display">{plan.toUpperCase()}</div>
          {plan === 'free' && (
            <Link to="/pricing" className="usage-upgrade">
              Proで全機能解放 →
            </Link>
          )}
        </div>
        <div className="usage-card">
          <div className="usage-label">アクティブイベント</div>
          <div className="usage-value">{events.filter((e) => e.step !== 'confirmed').length}</div>
        </div>
      </div>

      {/* 広告エリア（Freeプランのみ） */}
      {!limits.adFree && (
        <div className="ad-banner">
          <span className="ad-label">AD</span>
          <span>飲食店の予約はホットペッパーで！幹事様向け特典あり 🍺</span>
          <Link to="/pricing" className="ad-remove">広告を非表示にする</Link>
        </div>
      )}

      {/* イベント一覧 */}
      {sortedEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>まだイベントがありません</h2>
          <p>「新規イベント作成」から飲み会の企画を始めましょう</p>
          <Link to="/create" className="btn-primary">
            最初のイベントを作成
          </Link>
        </div>
      ) : (
        <div className="event-list">
          {sortedEvents.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-card-header">
                <div>
                  <h3 className="event-title">{event.title}</h3>
                  <span className="event-purpose">
                    {EVENT_PURPOSE_LABELS[event.purpose]}
                  </span>
                </div>
                <span
                  className="event-status"
                  style={{ background: STEP_COLORS[event.step] }}
                >
                  {STEP_LABELS[event.step]}
                </span>
              </div>
              <div className="event-card-body">
                <div className="event-meta">
                  <span>👥 {event.participants.length}名</span>
                  {event.confirmedDate && (
                    <span>📅 {formatDateJa(event.confirmedDate)}</span>
                  )}
                  {event.location && <span>📍 {event.location}</span>}
                </div>
                <div className="event-main-person">
                  主役: {event.participants.find((p) => p.isMainPerson)?.name || '未設定'}
                </div>
              </div>
              <div className="event-card-actions">
                <Link to={`/event/${event.id}`} className="btn-secondary">
                  詳細・編集
                </Link>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (confirm('このイベントを削除しますか？')) {
                      onDelete(event.id);
                    }
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
