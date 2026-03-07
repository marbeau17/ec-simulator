import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { CreateEvent } from './pages/CreateEvent';
import { EventDetail } from './pages/EventDetail';
import { Pricing } from './pages/Pricing';
import { useEvents } from './hooks/useEvents';
import { useUser } from './hooks/useUser';
import './App.css';

function App() {
  const { events, addEvent, updateEvent, deleteEvent, getEvent } = useEvents();
  const { user, updatePlan, incrementEventCount, canCreateEvent } = useUser();

  return (
    <BrowserRouter>
      <div className="app">
        <Header plan={user.plan} />
        <main className="main">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  events={events}
                  onDelete={deleteEvent}
                  plan={user.plan}
                  eventsCreatedThisMonth={user.eventsCreatedThisMonth}
                />
              }
            />
            <Route
              path="/create"
              element={
                <CreateEvent
                  plan={user.plan}
                  canCreate={canCreateEvent}
                  onSave={addEvent}
                  onIncrementCount={incrementEventCount}
                />
              }
            />
            <Route
              path="/event/:id"
              element={
                <EventDetail
                  getEvent={getEvent}
                  updateEvent={updateEvent}
                  plan={user.plan}
                />
              }
            />
            <Route
              path="/pricing"
              element={
                <Pricing
                  currentPlan={user.plan}
                  onChangePlan={updatePlan}
                />
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          <p>カンジくん — AI会社イベント幹事アシスタント</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
