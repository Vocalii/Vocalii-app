import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import WeatherWidget from './components/WeatherWidget';
import PriceWidget from './components/PriceWidget';
import BusyWidget from './components/BusyWidget';
import AcousticWidget from './components/AcousticWidget';
import InteractiveMap from './components/InteractiveMap';
import AssistantCard from './components/AssistantCard';
import RitualsPage from './components/RitualsPage';
import { DESTINATIONS } from './data';
import { Destination, Attraction, Message, TodoItem } from './types';
import { X, Sparkles, Shield, Bookmark, Terminal, HelpCircle } from 'lucide-react';

const DESTINATION_THEMES: Record<string, {
  color: string;       // main accent hex
  glowColor: string;   // medium intensity
  glowColorLow: string;// low intensity
  mutedColor: string;  // very soft muted color
  gradientFrom: string;// background gradient from color
  glowBg: string;      // linear gradient top color
}> = {
  santorini: {
    color: '#21e8ff',
    glowColor: '#17A9C9',
    glowColorLow: '#0e6d82',
    mutedColor: '#0b353f',
    gradientFrom: '#11141b', // deepened slate-grey
    glowBg: 'rgba(23, 169, 201, 0.05)'
  },
  kyoto: {
    color: '#f43f5e',
    glowColor: '#be123c',
    glowColorLow: '#881337',
    mutedColor: '#4c0519',
    gradientFrom: '#150f11', // deepened cherry-grey
    glowBg: 'rgba(190, 18, 60, 0.05)'
  },
  reykjavik: {
    color: '#a78bfa',
    glowColor: '#7c3aed',
    glowColorLow: '#4c1d95',
    mutedColor: '#2e1065',
    gradientFrom: '#110f17', // deepened violet-grey
    glowBg: 'rgba(124, 58, 237, 0.05)'
  },
  amalfi: {
    color: '#f59e0b',
    glowColor: '#d97706',
    glowColorLow: '#92400e',
    mutedColor: '#451a03',
    gradientFrom: '#13110f', // deepened gold-grey
    glowBg: 'rgba(217, 119, 6, 0.05)'
  }
};

export default function App() {
  // Navigation View tracker
  const [currentView, setCurrentView] = useState<'home' | 'rituals'>('home');

  // Lifted To-Dos state
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      id: '1',
      title: 'Morning dynamic vocal stretch & posture calibration',
      category: 'Warm-up',
      completed: false,
    },
    {
      id: '2',
      title: 'Hydrate: 500ml lukewarm water with honey cyclical intake',
      category: 'Hydration',
      completed: true,
    },
    {
      id: '3',
      title: 'Larynx centering exercise via low hum sweeps',
      category: 'Calibrate',
      completed: false,
    },
  ]);

  const handleToggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
    );
  };

  // Destination and active state trackers
  const [activeDestination, setActiveDestination] = useState<Destination>(DESTINATIONS[0]);
  const [activeSubTab, setActiveSubTab] = useState<'Overview' | 'Hotels' | 'Itinerary' | 'Flights'>('Overview');
  const [activeAttraction, setActiveAttraction] = useState<Attraction>(DESTINATIONS[0].attractions[0]);

  // Dynamic theme resolution
  const currentTheme = DESTINATION_THEMES[activeDestination.id] || DESTINATION_THEMES.santorini;

  // React to primary theme changes and update global CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-accent', currentTheme.color);
    root.style.setProperty('--primary-accent-glow', currentTheme.glowColor);
    root.style.setProperty('--primary-accent-glow-low', currentTheme.glowColorLow);
    root.style.setProperty('--primary-accent-muted', currentTheme.mutedColor);
  }, [currentTheme]);

  // Modals state trackers
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);

  // Chat message timelines
  const [messages, setMessages] = useState<Message[]>([]);
  const [favoritesList, setFavoritesList] = useState<string[]>(['santorini']);

  // Adjust active attraction node when user selects/swaps destination
  useEffect(() => {
    if (activeDestination) {
      setActiveAttraction(activeDestination.attractions[0]);
    }
  }, [activeDestination]);

  // Adjust active subtabs mapping actions
  useEffect(() => {
    // Help user look at corresponding attractions when swapping sub-tabs
    if (activeSubTab === 'Hotels') {
      const hotelNode = activeDestination.attractions.find((a) => a.type === 'hotel');
      if (hotelNode) setActiveAttraction(hotelNode);
    } else if (activeSubTab === 'Overview') {
      const sightNode = activeDestination.attractions.find((a) => a.type === 'sight');
      if (sightNode) setActiveAttraction(sightNode);
    }
  }, [activeSubTab, activeDestination]);

  // Handle auto suggester chips trigger
  const handleAutoSuggest = (type: 'Hotel options' | 'Itinerary' | 'Things to do') => {
    let queryText = '';

    if (type === 'Hotel options') {
      setActiveSubTab('Hotels');
      queryText = `Show me the most spectacular hotel stays and luxury reviews in ${activeDestination.name}, ${activeDestination.country}. What are typical prices of volcano suites?`;
    } else if (type === 'Itinerary') {
      setActiveSubTab('Itinerary');
      queryText = `Draft a premium 3-day itinerary proposal for ${activeDestination.name}, optimizing for scenic sunset viewpoints and culinary spots.`;
    } else if (type === 'Things to do') {
      setActiveSubTab('Overview');
      queryText = `What are the absolute must-visit attractions, archaeological coordinates, or black volcanic sand beaches in ${activeDestination.name}?`;
    }

    // Dispatch message to Assistant
    const mockRef = document.getElementById('assistant-scroll-body');
    if (mockRef) {
      // Find input bar on AssistantCard and fill/simulate click
      const inputEl = document.querySelector('#assistant-card input') as HTMLInputElement;
      if (inputEl) {
        inputEl.value = queryText;
        // Trigger focus
        inputEl.focus();
      }
    }
  };

  const handleToggleFavorite = () => {
    const dId = activeDestination.id;
    if (favoritesList.includes(dId)) {
      setFavoritesList(favoritesList.filter((id) => id !== dId));
    } else {
      setFavoritesList([...favoritesList, dId]);
    }
  };

  const clearChatHistory = () => {
    setMessages([]);
    alert('Companion chat timeline reset.');
  };

  const isCurrentDestinationFavorited = favoritesList.includes(activeDestination.id);

  return (
    <div 
      className="min-h-screen bg-[#0d0e11] text-zinc-100 transition-all duration-[800ms] pb-16 relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(ellipse at top, ${currentTheme.gradientFrom} 0%, #0d0e11 65%, #050608 100%)`
      }}
    >
      
      {/* Premium backdrop ambient glows & structural sheen */}
      <div 
        className="absolute top-0 right-10 w-[700px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-all duration-[800ms]" 
        style={{
          background: `linear-gradient(180deg, ${currentTheme.glowBg} 0%, transparent 100%)`
        }}
      />
      <div 
        className="absolute top-[20%] left-10 w-[600px] h-[600px] rounded-full blur-[130px] pointer-events-none transition-all duration-[800ms]"
        style={{
          background: `radial-gradient(circle, ${currentTheme.color}0a 0%, transparent 70%)`
        }} 
      />
      <div 
        className="absolute bottom-[20%] right-[10%] w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none transition-all duration-[800ms]"
        style={{
          background: `radial-gradient(circle, ${currentTheme.mutedColor}06 0%, transparent 75%)`
        }}
      />
      <div 
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none transition-all duration-[800ms]" 
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${currentTheme.color}15 50%, transparent 100%)`
        }}
      />
      
      {/* Core Header toolbar - stretched to full width with top navigation integrated */}
      <Header
        destinations={DESTINATIONS}
        activeDestination={activeDestination}
        setActiveDestination={setActiveDestination}
        onNewChat={() => {
          setMessages([]);
          const inputEl = document.querySelector('#assistant-card input') as HTMLInputElement;
          if (inputEl) inputEl.value = '';
        }}
        onOpenInfo={() => setInfoModalOpen(true)}
        activeTab={activeSubTab}
        setActiveTab={(tab) => {
          if (['Overview', 'Hotels', 'Itinerary', 'Flights'].includes(tab)) {
            setActiveSubTab(tab as any);
          } else {
            setActiveSubTab('Overview');
          }
        }}
        onClearHistory={clearChatHistory}
        onOpenFavorites={() => setFavoritesModalOpen(true)}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {/* Main Container */}
      <div className="pt-[88px] max-w-7xl mx-auto transition-all duration-300 px-6 md:px-12 flex flex-col gap-6">

        {currentView === 'rituals' ? (
          <RitualsPage
            primaryAccent={currentTheme.color}
            todos={todos}
            onToggleTodo={handleToggleTodo}
          />
        ) : (
          /* Main Grid Module: Left 8 Columns with Hero & Stats, Right 4 Columns with To-Do Assistant */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
            
            {/* Left 8 Columns */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              
              {/* HeroSection */}
              <HeroSection
                destination={activeDestination}
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                isFavorited={isCurrentDestinationFavorited}
                onToggleFavorite={handleToggleFavorite}
              />

              {/* Performance Statistics Section */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 px-1">Performance Statistics</h3>
                
                {/* Vocal fatigue index above the sub-widgets */}
                <div className="h-[210px]">
                  <InteractiveMap
                    destination={activeDestination}
                    activeAttraction={activeAttraction}
                    setActiveAttraction={setActiveAttraction}
                  />
                </div>

                {/* Sub-widgets grid (2 columns per row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <WeatherWidget destination={activeDestination} />
                  <PriceWidget destination={activeDestination} />
                  <BusyWidget destination={activeDestination} />
                  <AcousticWidget destination={activeDestination} />
                </div>
              </div>

            </div>

            {/* Right 4 Columns */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:pt-[12px]">
              
              <div className="flex flex-col gap-2.5">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 px-1 pt-1">Your To Dos</h3>
                <div className="h-auto">
                  <AssistantCard todos={todos} onToggleTodo={handleToggleTodo} />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 px-1">Upcoming Events</h3>
                <div className="bg-[#181b22] border border-zinc-800/80 rounded-[28px] py-6 px-5 shadow-sm backdrop-blur-[12px] transition-all duration-300 flex flex-col h-auto relative overflow-hidden group hover:border-zinc-700/60 hover:bg-[#1d212a] w-full">
                  
                  {/* Visual subtle glowing neutral element in the background */}
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 bg-zinc-800/8 rounded-full blur-[28px] pointer-events-none transition-all duration-500 group-hover:bg-zinc-800/15 group-hover:scale-110 z-0" />
                  
                  <div className="relative z-10 flex flex-col gap-4">
                    {/* Event 1 */}
                    <div className="flex items-center justify-between gap-3.5 py-1.5 px-0.5 w-full">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-medium text-zinc-200 group-hover:text-white transition-colors duration-200 truncate">Vocal Chamber Rehearsal</h4>
                        <p className="text-[10.5px] text-zinc-500 mt-0.5 font-sans">Santorini Sunset Theater • 18:00</p>
                      </div>
                      <div className="text-[11px] font-light text-zinc-500 uppercase tracking-wider flex-shrink-0 select-none">
                        Jun 09
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] bg-zinc-800/40 w-full" />

                    {/* Event 2 */}
                    <div className="flex items-center justify-between gap-3.5 py-1.5 px-0.5 w-full">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-medium text-zinc-200 group-hover:text-white transition-colors duration-200 truncate">Clinical Sound Diagnostic</h4>
                        <p className="text-[10.5px] text-zinc-500 mt-0.5 font-sans">Vocal Wellness Center • 10:30</p>
                      </div>
                      <div className="text-[11px] font-light text-zinc-500 uppercase tracking-wider flex-shrink-0 select-none">
                        Jun 12
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ================= MODAL DIALOGS AND CONFIGURATORS ================= */}

      {/* 1. INFO DIALOG */}
      {infoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-[32px] p-6 max-w-md w-full shadow-2xl relative font-sans animate-zoom-in">
            <button
              onClick={() => setInfoModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-zinc-900 dark:text-white mb-4">
              <div className="w-8 h-8 rounded-full bg-[#eefc4c] flex items-center justify-center text-zinc-950">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-display">About Companion Suite</h3>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              This application is a highly responsive, high-fidelity luxury travel workspace. It replicates premium rounded components, sun/night meteorology dials, price distribution charts, crowd congestion heat-indicators, and vector topographical coordinates mapping.
            </p>

            <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-zinc-850 rounded-2xl border border-neutral-100 dark:border-zinc-800 text-[10px] text-zinc-500 font-mono mb-4">
              <Terminal className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Full-Stack Express server with active Gemini model routing is online.</span>
            </div>

            <button
              onClick={() => setInfoModalOpen(false)}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Back to Board
            </button>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC SAVES DIALOG */}
      {favoritesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative font-sans">
            <button
              onClick={() => setFavoritesModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-zinc-900 dark:text-white mb-4">
              <Bookmark className="w-5 h-5 text-rose-500 fill-current" />
              <h3 className="text-lg font-black tracking-tight font-display">Saves & Favorites ({favoritesList.length})</h3>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {favoritesList.length === 0 ? (
                <span className="text-xs text-zinc-400 text-center py-6">Your bookmark list is empty.</span>
              ) : (
                favoritesList.map((id) => {
                  const place = DESTINATIONS.find((d) => d.id === id);
                  if (!place) return null;
                  return (
                    <div
                      key={id}
                      onClick={() => {
                        setActiveDestination(place);
                        setFavoritesModalOpen(false);
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-neutral-200/55"
                    >
                      <img src={place.imageUrl} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{place.name}</span>
                        <span className="text-[10px] text-zinc-400">{place.country}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setFavoritesModalOpen(false)}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 3. SETTINGS DIALOG */}
      {settingsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative font-sans">
            <button
              onClick={() => setSettingsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black tracking-tight font-display mb-4">Board Settings</h3>

            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-zinc-800/40 rounded-xl">
                <div>
                  <span className="text-xs font-bold block text-zinc-800 dark:text-zinc-150">Active AI Model</span>
                  <span className="text-[9px] text-zinc-400">Gemini 3.5 Flash (Latency optimal)</span>
                </div>
                <span className="text-[10px] bg-lime-100 text-lime-800 border border-lime-200 px-2 py-0.5 rounded-full font-bold">Standard</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-zinc-800/40 rounded-xl">
                <div>
                  <span className="text-xs font-bold block text-zinc-800 dark:text-zinc-150">Visual Theme</span>
                  <span className="text-[9px] text-zinc-400">Auto daylight synced</span>
                </div>
                <span className="text-[10px] bg-neutral-200 text-neutral-800 text-zinc-600 dark:bg-zinc-700 dark:text-neutral-300 px-2 py-0.5 rounded-full font-bold">Auto</span>
              </div>
            </div>

            <button
              onClick={() => setSettingsModalOpen(false)}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Apply Coordinates
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
