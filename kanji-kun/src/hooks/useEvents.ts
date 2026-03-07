import { useState, useCallback } from 'react';
import { CompanyEvent } from '../types';
import { getStoredEvents, saveEvents, generateId } from '../utils/storage';

export function useEvents() {
  const [events, setEvents] = useState<CompanyEvent[]>(getStoredEvents);

  const addEvent = useCallback((event: Omit<CompanyEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEvent: CompanyEvent = {
      ...event,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEvents((prev) => {
      const next = [...prev, newEvent];
      saveEvents(next);
      return next;
    });
    return newEvent.id;
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<CompanyEvent>) => {
    setEvents((prev) => {
      const next = prev.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      );
      saveEvents(next);
      return next;
    });
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveEvents(next);
      return next;
    });
  }, []);

  const getEvent = useCallback(
    (id: string) => events.find((e) => e.id === id),
    [events]
  );

  return { events, addEvent, updateEvent, deleteEvent, getEvent };
}
