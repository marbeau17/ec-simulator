import { useState, useCallback } from 'react';
import { User, PlanType, PLAN_LIMITS } from '../types';
import { getStoredUser, saveUser } from '../utils/storage';

export function useUser() {
  const [user, setUser] = useState<User>(getStoredUser);

  const updatePlan = useCallback((plan: PlanType) => {
    setUser((prev) => {
      const next = { ...prev, plan };
      saveUser(next);
      return next;
    });
  }, []);

  const incrementEventCount = useCallback(() => {
    setUser((prev) => {
      const next = { ...prev, eventsCreatedThisMonth: prev.eventsCreatedThisMonth + 1 };
      saveUser(next);
      return next;
    });
  }, []);

  const canCreateEvent = user.eventsCreatedThisMonth < PLAN_LIMITS[user.plan].maxEventsPerMonth;
  const limits = PLAN_LIMITS[user.plan];

  return { user, updatePlan, incrementEventCount, canCreateEvent, limits };
}
