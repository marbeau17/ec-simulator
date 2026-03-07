import { useParams, Link, useNavigate } from 'react-router-dom';
import { StepIndicator } from '../components/StepIndicator';
import { FeatureGate } from '../components/ProBadge';
import {
  CompanyEvent,
  EVENT_PURPOSE_LABELS,
  DateVote,
  VoteStatus,
  PlanType,
  PLAN_LIMITS,
} from '../types';
import { formatDateJa } from '../utils/holidays';
import { recommendBestDate } from '../utils/dateRecommendation';
import './EventDetail.css';

interface EventDetailProps {
  getEvent: (id: string) => CompanyEvent | undefined;
  updateEvent: (id: string, updates: Partial<CompanyEvent>) => void;
  plan: PlanType;
}

export function EventDetail({ getEvent, updateEvent, plan }: EventDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const limits = PLAN_LIMITS[plan];
  const event = id ? getEvent(id) : undefined;

  if (!event) {
    return (
      <div className="event-detail">
        <div className="not-found">
          <h2>イベントが見つかりません</h2>
          <Link to="/" className="btn-secondary">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  const handleVote = (dateStr: string, participantId: string, status: VoteStatus) => {
    const newCandidates = event.dateCandidates.map((dc) => {
      if (dc.date !== dateStr) return dc;
      const existingIdx = dc.votes.findIndex((v) => v.participantId === participantId);
      const newVote: DateVote = { participantId, dateCandidate: dateStr, status };
      const newVotes = [...dc.votes];
      if (existingIdx >= 0) {
        newVotes[existingIdx] = newVote;
      } else {
        newVotes.push(newVote);
      }
      return { ...dc, votes: newVotes };
    });
    updateEvent(event.id, { dateCandidates: newCandidates });
  };

  const getVote = (dateStr: string, participantId: string): VoteStatus | null => {
    const dc = event.dateCandidates.find((d) => d.date === dateStr);
    if (!dc) return null;
    const vote = dc.votes.find((v) => v.participantId === participantId);
    return vote?.status ?? null;
  };

  const confirmDate = (dateStr: string, startTime: string) => {
    updateEvent(event.id, {
      confirmedDate: dateStr,
      confirmedTime: startTime,
      step: 'location',
    });
  };

  const advanceStep = (step: CompanyEvent['step']) => {
    updateEvent(event.id, { step });
  };

  const recommendations = limits.aiDateRecommendation
    ? recommendBestDate(event.dateCandidates, event.participants)
    : [];

  const generateShareLink = () => {
    const text = `【日程調整のお願い】\n\n${event.title}\n目的: ${EVENT_PURPOSE_LABELS[event.purpose]}\n\n以下のリンクから参加可否を回答してください。\n${window.location.href}/vote\n\n回答期限: ${event.votingDeadline || '未設定'}\n\nよろしくお願いいたします。`;
    navigator.clipboard.writeText(text);
    alert('共有テキストをクリップボードにコピーしました');
  };

  const openGoogleCalendar = () => {
    if (!event.confirmedDate) return;
    const title = encodeURIComponent(`【非業務】${event.title}`);
    const location = encodeURIComponent(event.location || 'TBD');
    const mainPerson = event.participants.find((p) => p.isMainPerson)?.name || '未設定';
    const details = encodeURIComponent(
      `${EVENT_PURPOSE_LABELS[event.purpose]}\n主役: ${mainPerson}\n参加者: ${event.participants.map((p) => p.name).join(', ')}\n\nカンジくんで作成`
    );
    const dateStr = event.confirmedDate.replace(/-/g, '');
    const timeStr = (event.confirmedTime || '19:00').replace(':', '') + '00';
    const endTimeH = parseInt((event.confirmedTime || '19:00').split(':')[0]) + 2;
    const endTimeStr = String(endTimeH).padStart(2, '0') + (event.confirmedTime || '19:00').split(':')[1] + '00';

    const emails = event.participants
      .filter((p) => p.email)
      .map((p) => p.email)
      .join(',');

    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${details}&dates=${dateStr}T${timeStr}/${dateStr}T${endTimeStr}`;
    if (emails) {
      url += `&add=${encodeURIComponent(emails)}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="event-detail">
      <div className="detail-header">
        <div>
          <h1>{event.title}</h1>
          <span className="detail-purpose">{EVENT_PURPOSE_LABELS[event.purpose]}</span>
        </div>
        <Link to="/" className="btn-secondary">
          ← 一覧に戻る
        </Link>
      </div>

      <StepIndicator currentStep={event.step} />

      {/* 参加者一覧 */}
      <section className="detail-section">
        <h2>参加者（{event.participants.length}名）</h2>
        <div className="participants-grid">
          {event.participants.map((p) => (
            <div key={p.id} className={`participant-card ${p.isMainPerson ? 'main' : ''}`}>
              <span className="participant-name">
                {p.isMainPerson && '★ '}
                {p.name}
              </span>
              {p.nearestStation && (
                <span className="participant-station">{p.nearestStation}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 日程投票テーブル */}
      {event.dateCandidates.length > 0 && (
        <section className="detail-section">
          <div className="section-header">
            <h2>日程投票</h2>
            <div className="section-actions">
              <button className="btn-secondary" onClick={generateShareLink}>
                📋 共有テキストをコピー
              </button>
            </div>
          </div>

          {event.votingDeadline && (
            <p className="voting-deadline">
              投票締切: {formatDateJa(event.votingDeadline)}
            </p>
          )}

          <div className="vote-table-wrapper">
            <table className="vote-table">
              <thead>
                <tr>
                  <th>日程</th>
                  {event.participants.map((p) => (
                    <th key={p.id}>
                      {p.isMainPerson && '★'}
                      {p.name}
                    </th>
                  ))}
                  <th>○</th>
                  <th>△</th>
                  <th>✕</th>
                </tr>
              </thead>
              <tbody>
                {event.dateCandidates.map((dc) => {
                  const okCount = dc.votes.filter((v) => v.status === 'ok').length;
                  const maybeCount = dc.votes.filter((v) => v.status === 'maybe').length;
                  const ngCount = dc.votes.filter((v) => v.status === 'ng').length;

                  return (
                    <tr key={dc.date}>
                      <td className="date-cell">
                        <div>{formatDateJa(dc.date)}</div>
                        <div className="time-label">{dc.startTime}〜</div>
                      </td>
                      {event.participants.map((p) => {
                        const vote = getVote(dc.date, p.id);
                        return (
                          <td key={p.id} className="vote-cell">
                            <div className="vote-buttons">
                              <button
                                className={`vote-btn ok ${vote === 'ok' ? 'active' : ''}`}
                                onClick={() => handleVote(dc.date, p.id, 'ok')}
                              >
                                ○
                              </button>
                              <button
                                className={`vote-btn maybe ${vote === 'maybe' ? 'active' : ''}`}
                                onClick={() => handleVote(dc.date, p.id, 'maybe')}
                              >
                                △
                              </button>
                              <button
                                className={`vote-btn ng ${vote === 'ng' ? 'active' : ''}`}
                                onClick={() => handleVote(dc.date, p.id, 'ng')}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td className="count-ok">{okCount}</td>
                      <td className="count-maybe">{maybeCount}</td>
                      <td className="count-ng">{ngCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* AI Date Recommendation */}
          <FeatureGate
            isLocked={!limits.aiDateRecommendation}
            requiredPlan="pro"
            featureName="AI最適日程提案"
          >
            {recommendations.length > 0 && (
              <div className="recommendation-section">
                <h3>🧠 AI推奨日程</h3>
                <p className="rec-description">主役の参加を最優先にスコアリングしています</p>
                <div className="rec-list">
                  {recommendations.slice(0, 3).map((rec, i) => (
                    <div
                      key={rec.date}
                      className={`rec-item ${i === 0 ? 'top' : ''}`}
                    >
                      <div className="rec-rank">#{i + 1}</div>
                      <div className="rec-info">
                        <span className="rec-date">{formatDateJa(rec.date)}</span>
                        <span className="rec-stats">
                          ○{rec.okCount} △{rec.maybeCount} ✕{rec.ngCount}
                          {rec.mainPersonAvailable ? ' | 主役OK' : ' | 主役NG'}
                        </span>
                      </div>
                      <div className="rec-score">Score: {rec.score}</div>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => confirmDate(rec.date, rec.startTime)}
                      >
                        この日に決定
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </FeatureGate>

          {/* Manual date confirmation */}
          {event.step === 'date_adjustment' && (
            <div className="manual-confirm">
              <h3>日程を手動で決定</h3>
              <div className="confirm-options">
                {event.dateCandidates.map((dc) => (
                  <button
                    key={dc.date}
                    className="btn-secondary"
                    onClick={() => confirmDate(dc.date, dc.startTime)}
                  >
                    {formatDateJa(dc.date)} {dc.startTime}〜 に決定
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 確定情報 */}
      {event.confirmedDate && (
        <section className="detail-section confirmed-section">
          <h2>✅ 確定情報</h2>
          <div className="confirmed-info">
            <div className="confirmed-item">
              <span className="confirmed-label">日程</span>
              <span className="confirmed-value">{formatDateJa(event.confirmedDate)}</span>
            </div>
            <div className="confirmed-item">
              <span className="confirmed-label">時間</span>
              <span className="confirmed-value">{event.confirmedTime}〜</span>
            </div>
            <div className="confirmed-item">
              <span className="confirmed-label">場所</span>
              <span className="confirmed-value">{event.location || 'TBD'}</span>
            </div>
          </div>

          <div className="calendar-actions">
            <button className="btn-calendar" onClick={openGoogleCalendar}>
              📅 Googleカレンダーに招待を送信
            </button>
          </div>
        </section>
      )}

      {/* ステップ進行ボタン */}
      <div className="step-actions">
        {event.step === 'purpose' && (
          <button className="btn-primary" onClick={() => advanceStep('participants')}>
            参加者選定に進む →
          </button>
        )}
        {event.step === 'participants' && (
          <button className="btn-primary" onClick={() => advanceStep('date_adjustment')}>
            日程調整に進む →
          </button>
        )}
        {event.step === 'date_decision' && (
          <button className="btn-primary" onClick={() => advanceStep('location')}>
            場所決定に進む →
          </button>
        )}
        {event.step === 'location' && (
          <button className="btn-primary" onClick={() => advanceStep('confirmed')}>
            イベントを確定する ✓
          </button>
        )}
      </div>
    </div>
  );
}
