import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepIndicator } from '../components/StepIndicator';
import { ProBadge, FeatureGate } from '../components/ProBadge';
import {
  CompanyEvent,
  EventPurpose,
  EVENT_PURPOSE_LABELS,
  Participant,
  DateCandidate,
  PlanType,
  PLAN_LIMITS,
} from '../types';
import { generateDateCandidates, formatDateJa } from '../utils/holidays';
import { generateId } from '../utils/storage';
import './CreateEvent.css';

interface CreateEventProps {
  plan: PlanType;
  canCreate: boolean;
  onSave: (event: Omit<CompanyEvent, 'id' | 'createdAt' | 'updatedAt'>) => string;
  onIncrementCount: () => void;
}

export function CreateEvent({ plan, canCreate, onSave, onIncrementCount }: CreateEventProps) {
  const navigate = useNavigate();
  const limits = PLAN_LIMITS[plan];

  // Step 1: Purpose
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState<EventPurpose>('welcome');
  const [purposeNote, setPurposeNote] = useState('');

  // Step 2: Participants
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStation, setNewStation] = useState('');
  const [newIsMain, setNewIsMain] = useState(false);

  // Step 3: Date
  const [startTime, setStartTime] = useState('19:00');
  const [dateCandidates, setDateCandidates] = useState<DateCandidate[]>([]);
  const [votingDeadline, setVotingDeadline] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  // Step 4: Location
  const [location, setLocation] = useState('');
  const [locationStation, setLocationStation] = useState('');

  // Current step in wizard
  const [currentStep, setCurrentStep] = useState(0);

  if (!canCreate) {
    return (
      <div className="create-event">
        <div className="limit-reached">
          <h2>🚫 イベント作成上限に達しました</h2>
          <p>
            Freeプランでは月{limits.maxEventsPerMonth}件までイベントを作成できます。
            <br />
            Proプランにアップグレードすると無制限に作成できます。
          </p>
          <button className="btn-primary" onClick={() => navigate('/pricing')}>
            プランをアップグレード
          </button>
        </div>
      </div>
    );
  }

  const addParticipant = () => {
    if (!newName.trim()) return;
    if (participants.length >= limits.maxParticipants) {
      alert(`現在のプランでは最大${limits.maxParticipants}名までです。アップグレードしてください。`);
      return;
    }
    const p: Participant = {
      id: generateId(),
      name: newName.trim(),
      email: newEmail.trim(),
      isMainPerson: newIsMain,
      isOrganizer: false,
      nearestStation: newStation.trim() || undefined,
    };
    setParticipants([...participants, p]);
    setNewName('');
    setNewEmail('');
    setNewStation('');
    setNewIsMain(false);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const toggleMainPerson = (id: string) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, isMainPerson: !p.isMainPerson } : p))
    );
  };

  const generateDates = () => {
    const dates = generateDateCandidates({
      startDate: new Date(),
      participantCount: participants.length,
      avoidBusySeason: limits.smartDateGeneration,
      leadTimeDays: 7,
    });
    const candidates: DateCandidate[] = dates.map((d) => ({
      date: d,
      startTime,
      votes: [],
    }));
    setDateCandidates(candidates);

    // 投票期限を1週間後に自動設定
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    setVotingDeadline(deadline.toISOString().split('T')[0]);
  };

  const removeDateCandidate = (date: string) => {
    setDateCandidates(dateCandidates.filter((d) => d.date !== date));
  };

  const handleSave = () => {
    const eventId = onSave({
      title: title || `${EVENT_PURPOSE_LABELS[purpose]}`,
      purpose,
      purposeNote: purposeNote || undefined,
      step: currentStep < 2 ? 'purpose' : currentStep < 3 ? 'date_adjustment' : 'location',
      participants,
      dateCandidates,
      location: location || undefined,
      locationStation: locationStation || undefined,
      votingDeadline: votingDeadline || undefined,
      reminderEnabled,
    });
    onIncrementCount();
    navigate(`/event/${eventId}`);
  };

  const steps = [
    // Step 0: 目的設定
    <div key="purpose" className="wizard-step">
      <h2>Step 1: 目的・主役を設定</h2>
      <p className="step-description">
        飲み会の目的と主役を明確にすることが、成功の第一歩です。
      </p>

      <div className="form-group">
        <label>イベント名</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：田中さん歓迎会"
          className="input"
        />
      </div>

      <div className="form-group">
        <label>目的</label>
        <div className="purpose-grid">
          {(Object.entries(EVENT_PURPOSE_LABELS) as [EventPurpose, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                className={`purpose-btn ${purpose === key ? 'active' : ''}`}
                onClick={() => setPurpose(key)}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="form-group">
        <label>補足メモ（任意）</label>
        <textarea
          value={purposeNote}
          onChange={(e) => setPurposeNote(e.target.value)}
          placeholder="例：部長からの依頼。新入社員の田中さんを歓迎する目的。"
          className="textarea"
          rows={3}
        />
      </div>

      <div className="guide-tip">
        💡 <strong>幹事ガイド:</strong> 上司から依頼された場合は、目的と主役を必ず確認しましょう。
        「誰のための会か」が明確だと、参加者選びや日程調整がスムーズになります。
      </div>
    </div>,

    // Step 1: 参加者
    <div key="participants" className="wizard-step">
      <h2>Step 2: 参加者を追加</h2>
      <p className="step-description">
        目的にふさわしい参加者を選びましょう。主役には★マークを付けてください。
        <span className="participant-limit">
          （{participants.length}/{limits.maxParticipants}名）
          {plan === 'free' && <ProBadge requiredPlan="pro" />}
        </span>
      </p>

      <div className="add-participant-form">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="名前 *"
          className="input"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="メールアドレス"
          className="input"
        />
        <input
          type="text"
          value={newStation}
          onChange={(e) => setNewStation(e.target.value)}
          placeholder="最寄り駅"
          className="input"
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={newIsMain}
            onChange={(e) => setNewIsMain(e.target.checked)}
          />
          主役
        </label>
        <button className="btn-primary btn-sm" onClick={addParticipant}>
          追加
        </button>
      </div>

      {participants.length > 0 && (
        <table className="participant-table">
          <thead>
            <tr>
              <th>名前</th>
              <th>メール</th>
              <th>最寄り駅</th>
              <th>主役</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.email || '-'}</td>
                <td>{p.nearestStation || '-'}</td>
                <td>
                  <button
                    className={`star-btn ${p.isMainPerson ? 'active' : ''}`}
                    onClick={() => toggleMainPerson(p.id)}
                  >
                    {p.isMainPerson ? '★' : '☆'}
                  </button>
                </td>
                <td>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => removeParticipant(p.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="guide-tip">
        💡 <strong>幹事ガイド:</strong> 参加者リストを作成したら、依頼した上司に
        「足りない人がいないか」を確認しましょう。
      </div>
    </div>,

    // Step 2: 日程調整
    <div key="dates" className="wizard-step">
      <h2>Step 3: 日程調整</h2>
      <p className="step-description">
        候補日を生成し、参加者に投票してもらいます。
      </p>

      <div className="form-row">
        <div className="form-group">
          <label>開始時間</label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input"
          >
            <option value="17:30">17:30（定時直後）</option>
            <option value="18:00">18:00</option>
            <option value="18:30">18:30</option>
            <option value="19:00">19:00</option>
            <option value="19:30">19:30</option>
            <option value="20:00">20:00（遅め）</option>
          </select>
        </div>
        <div className="form-group">
          <label>投票締切日</label>
          <input
            type="date"
            value={votingDeadline}
            onChange={(e) => setVotingDeadline(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <button className="btn-primary" onClick={generateDates}>
        候補日を自動生成
      </button>

      {dateCandidates.length > 0 && (
        <>
          <div className="date-candidates">
            <h3>候補日一覧（{dateCandidates.length}日）</h3>
            <div className="date-list">
              {dateCandidates.map((dc) => (
                <div key={dc.date} className="date-item">
                  <span className="date-text">{formatDateJa(dc.date)}</span>
                  <span className="date-time">{dc.startTime}〜</span>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => removeDateCandidate(dc.date)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-reminder: Pro feature */}
          <div className="reminder-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                disabled={!limits.autoReminder}
              />
              自動リマインド {!limits.autoReminder && <ProBadge requiredPlan="pro" />}
            </label>
            {limits.autoReminder && reminderEnabled && (
              <p className="reminder-note">
                投票締切の3日前と1日前にリマインドメールを自動送信します。
              </p>
            )}
          </div>
        </>
      )}

      {/* Smart date generation info */}
      <FeatureGate
        isLocked={!limits.smartDateGeneration}
        requiredPlan="pro"
        featureName="スマート日程生成"
      >
        <div className="smart-date-info">
          <h4>スマート日程生成 🧠</h4>
          <p>
            飲食店の繁忙期・閑散期を考慮して、予約が取りやすい日程を優先的に提案します。
            忘年会・新年会シーズンは自動的に余裕を持った日程を生成します。
          </p>
        </div>
      </FeatureGate>

      <div className="guide-tip">
        💡 <strong>幹事ガイド:</strong>
        <ul>
          <li>回答期限を明確に伝えましょう</li>
          <li>回答が遅い人には個別に連絡しましょう</li>
          <li>±2名程度は後で調整可能なので、全員分集まらなくても次に進みましょう</li>
        </ul>
      </div>
    </div>,

    // Step 3: 場所決定
    <div key="location" className="wizard-step">
      <h2>Step 4: 場所を決める</h2>
      <p className="step-description">
        参加者の最寄り駅を考慮して、集まりやすい場所を選びましょう。
      </p>

      {participants.some((p) => p.nearestStation) && (
        <div className="station-summary">
          <h4>参加者の最寄り駅</h4>
          <div className="station-tags">
            {participants
              .filter((p) => p.nearestStation)
              .map((p) => (
                <span key={p.id} className="station-tag">
                  {p.name}: {p.nearestStation}
                  {p.isMainPerson && ' ★'}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>エリア・駅名</label>
        <input
          type="text"
          value={locationStation}
          onChange={(e) => setLocationStation(e.target.value)}
          placeholder="例：渋谷、新宿、東京"
          className="input"
        />
      </div>

      <div className="form-group">
        <label>お店・場所名（未定の場合はTBDでOK）</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例：TBD（後日決定）"
          className="input"
        />
      </div>

      {/* Restaurant suggestion: Pro feature */}
      <FeatureGate
        isLocked={limits.locationSuggestion === 'station_only'}
        requiredPlan="pro"
        featureName="飲食店おすすめ提案"
      >
        <div className="restaurant-suggestions">
          <h4>おすすめのお店 🍽️</h4>
          <div className="restaurant-list">
            <div className="restaurant-item">
              <strong>居酒屋 和楽</strong>
              <span>渋谷駅 徒歩3分 | 3,500円〜 | 最大30名</span>
            </div>
            <div className="restaurant-item">
              <strong>個室ダイニング 花鳥</strong>
              <span>渋谷駅 徒歩5分 | 4,000円〜 | 最大20名</span>
            </div>
            <div className="restaurant-item">
              <strong>ビアガーデン SKY</strong>
              <span>渋谷駅 徒歩2分 | 4,500円〜 | 最大50名</span>
            </div>
          </div>
        </div>
      </FeatureGate>

      {/* Google Calendar integration */}
      <div className="calendar-section">
        <h4>📅 Googleカレンダーに追加</h4>
        <p className="calendar-description">
          イベント確定後、参加者全員にGoogleカレンダーの招待を送信できます。
        </p>
        <button
          className="btn-calendar"
          onClick={() => {
            if (!dateCandidates.length && !title) {
              alert('先にイベント情報を入力してください');
              return;
            }
            const eventTitle = encodeURIComponent(
              `【非業務】${title || EVENT_PURPOSE_LABELS[purpose]}`
            );
            const eventLocation = encodeURIComponent(location || 'TBD');
            const eventDetails = encodeURIComponent(
              `${EVENT_PURPOSE_LABELS[purpose]}\n主役: ${participants.find((p) => p.isMainPerson)?.name || '未設定'}\n\nカンジくんで作成`
            );
            // Generate Google Calendar URL
            const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
            const url = `${baseUrl}&text=${eventTitle}&location=${eventLocation}&details=${eventDetails}`;
            window.open(url, '_blank');
          }}
        >
          Googleカレンダーで招待を作成
        </button>
      </div>

      <div className="guide-tip">
        💡 <strong>幹事ガイド:</strong>
        <ul>
          <li>お店が決まっていなくても、まずスケジュールを抑えましょう（場所はTBD）</li>
          <li>件名に「非業務」と入れて重要メールと区別しましょう</li>
          <li>予定は非公開設定にしておきましょう</li>
        </ul>
      </div>
    </div>,

    // Step 4: 確認・保存
    <div key="confirm" className="wizard-step">
      <h2>Step 5: 確認・保存</h2>

      <div className="summary-card">
        <h3>{title || EVENT_PURPOSE_LABELS[purpose]}</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">目的</span>
            <span>{EVENT_PURPOSE_LABELS[purpose]}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">参加者</span>
            <span>{participants.length}名</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">主役</span>
            <span>
              {participants
                .filter((p) => p.isMainPerson)
                .map((p) => p.name)
                .join(', ') || '未設定'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">候補日数</span>
            <span>{dateCandidates.length}日</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">開始時間</span>
            <span>{startTime}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">場所</span>
            <span>{location || locationStation || 'TBD'}</span>
          </div>
        </div>
        {purposeNote && (
          <div className="summary-note">
            <span className="summary-label">メモ</span>
            <p>{purposeNote}</p>
          </div>
        )}
      </div>

      <button className="btn-primary btn-lg" onClick={handleSave}>
        イベントを保存
      </button>
    </div>,
  ];

  return (
    <div className="create-event">
      <StepIndicator
        currentStep={
          currentStep === 0
            ? 'purpose'
            : currentStep === 1
            ? 'participants'
            : currentStep === 2
            ? 'date_adjustment'
            : currentStep === 3
            ? 'location'
            : 'confirmed'
        }
      />

      {steps[currentStep]}

      <div className="wizard-nav">
        {currentStep > 0 && (
          <button
            className="btn-secondary"
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            ← 戻る
          </button>
        )}
        {currentStep < steps.length - 1 && (
          <button
            className="btn-primary"
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            次へ →
          </button>
        )}
      </div>
    </div>
  );
}
