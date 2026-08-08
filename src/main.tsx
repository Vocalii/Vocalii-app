import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {loadRitualsFromSanity} from './ritualsData.ts';
import {loadHabitsFromSanity} from './habitsData.ts';
import {loadTraitsFromSanity} from './traitsData.ts';
import './index.css';

// Kicks off the live content fetches before the app renders, so components that read
// EXERCISE_RITUALS/DAILY_HABITS/VOCAL_HABITS/TRAITS synchronously on first render already see
// Sanity's data rather than the static fallback. All three are internally time-boxed (each
// loader's own timeout), so a slow/offline Sanity delays boot briefly rather than hanging — none
// of them throw.
await Promise.all([loadRitualsFromSanity(), loadHabitsFromSanity(), loadTraitsFromSanity()]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
