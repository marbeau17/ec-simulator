export type PlanType = 'free' | 'pro' | 'business';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: PlanType;
  eventsCreatedThisMonth: number;
}

export type EventPurpose =
  | 'welcome'      // 歓迎会
  | 'farewell'     // 送別会
  | 'year_end'     // 忘年会
  | 'new_year'     // 新年会
  | 'team_building' // チームビルディング
  | 'celebration'  // お祝い（昇進等）
  | 'other';       // その他

export const EVENT_PURPOSE_LABELS: Record<EventPurpose, string> = {
  welcome: '歓迎会',
  farewell: '送別会',
  year_end: '忘年会',
  new_year: '新年会',
  team_building: 'チームビルディング',
  celebration: 'お祝い（昇進・達成等）',
  other: 'その他',
};

export interface Participant {
  id: string;
  name: string;
  email: string;
  isMainPerson: boolean; // 主役フラグ
  isOrganizer: boolean;  // 幹事フラグ
  nearestStation?: string; // 最寄り駅
  workLocation?: string;   // 勤務地
}

export type VoteStatus = 'ok' | 'maybe' | 'ng';

export interface DateVote {
  participantId: string;
  dateCandidate: string; // ISO date string
  status: VoteStatus;
}

export interface DateCandidate {
  date: string;  // ISO date string
  startTime: string; // HH:mm
  votes: DateVote[];
}

export type EventStep =
  | 'purpose'
  | 'participants'
  | 'date_adjustment'
  | 'date_decision'
  | 'location'
  | 'confirmed';

export interface CompanyEvent {
  id: string;
  title: string;
  purpose: EventPurpose;
  purposeNote?: string;
  step: EventStep;
  participants: Participant[];
  dateCandidates: DateCandidate[];
  confirmedDate?: string;
  confirmedTime?: string;
  location?: string;
  locationStation?: string;
  votingDeadline?: string;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimits {
  maxEventsPerMonth: number;
  maxParticipants: number;
  autoReminder: boolean;
  smartDateGeneration: boolean;
  aiDateRecommendation: boolean;
  locationSuggestion: 'station_only' | 'with_restaurants' | 'with_corporate';
  templates: number;
  historyLimit: number;
  adFree: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxEventsPerMonth: 3,
    maxParticipants: 10,
    autoReminder: false,
    smartDateGeneration: false,
    aiDateRecommendation: false,
    locationSuggestion: 'station_only',
    templates: 3,
    historyLimit: 3,
    adFree: false,
  },
  pro: {
    maxEventsPerMonth: Infinity,
    maxParticipants: 30,
    autoReminder: true,
    smartDateGeneration: true,
    aiDateRecommendation: true,
    locationSuggestion: 'with_restaurants',
    templates: 15,
    historyLimit: 365,
    adFree: true,
  },
  business: {
    maxEventsPerMonth: Infinity,
    maxParticipants: 100,
    autoReminder: true,
    smartDateGeneration: true,
    aiDateRecommendation: true,
    locationSuggestion: 'with_corporate',
    templates: Infinity,
    historyLimit: Infinity,
    adFree: true,
  },
};
