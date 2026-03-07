import { CompanyEvent, User, PlanType } from '../types';

const EVENTS_KEY = 'kanji_kun_events';
const USER_KEY = 'kanji_kun_user';

export function getStoredEvents(): CompanyEvent[] {
  const data = localStorage.getItem(EVENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveEvents(events: CompanyEvent[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function getStoredUser(): User {
  const data = localStorage.getItem(USER_KEY);
  if (data) return JSON.parse(data);
  const defaultUser: User = {
    id: crypto.randomUUID(),
    name: 'ゲスト',
    email: '',
    plan: 'free',
    eventsCreatedThisMonth: 0,
  };
  saveUser(defaultUser);
  return defaultUser;
}

export function saveUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function generateId(): string {
  return crypto.randomUUID();
}
