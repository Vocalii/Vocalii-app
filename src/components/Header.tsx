import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Check, Sparkles, Bell, Info, Plus, User, Settings, LogOut } from 'lucide-react';
import { Destination } from '../types';

interface HeaderProps {
  destinations: Destination[];
  activeDestination: Destination;
  setActiveDestination: (dest: Destination) => void;
  onNewChat: () => void;
  onOpenInfo: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClearHistory: () => void;
  onOpenFavorites: () => void;
  currentView: 'home' | 'rituals' | 'reports';
  setCurrentView: (view: 'home' | 'rituals' | 'reports') => void;
}

export default function Header({
  destinations,
  activeDestination,
  setActiveDestination,
  onNewChat,
  onOpenInfo,
  activeTab,
  setActiveTab,
  onClearHistory,
  onOpenFavorites,
  currentView,
  setCurrentView,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Your vocal baseline has been saved', time: '2m ago' },
    { id: 2, text: 'New coaching tip available for you', time: '18m ago' },
    { id: 3, text: 'Weekly vocal health report is ready', time: '1h ago' },
    { id: 4, text: 'Reminder: complete your morning ritual', time: '3h ago' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatQuery, setChatQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDestinations = destinations.filter(dest =>
    dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dest.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && chatQuery.trim()) {
      const assistantInput = document.querySelector('#assistant-card input') as HTMLInputElement;
      if (assistantInput) {
        assistantInput.value = chatQuery;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(assistantInput, chatQuery);
          assistantInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        assistantInput.focus();
        setChatQuery('');
      } else {
        alert('To dispatch: ' + chatQuery + '. Enter questions in the AI Advisor Card below.');
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 font-sans z-50 px-6 py-3.5 shadow-sm" id="safe-one-header">
      <div className="w-full flex items-center justify-between gap-4 relative">
        
        {/* Left Side: Logo & Brand "SAFE ONE" - styled to align nicely */}
        <div className="flex items-center gap-2.5 z-10 flex-shrink-0 select-none pl-3">
          <div className="w-9 h-9 rounded-full border border-zinc-800 bg-gradient-to-tr from-zinc-950 to-zinc-900 flex items-center justify-center text-[#21e8ff] shadow-inner flex-shrink-0 hover:border-[#17A9C9]/50 transition-colors duration-350">
            <svg className="w-5 h-5 text-[#21e8ff]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7V12C3 17 6.5 21 12 22C17.5 21 21 17 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="#17A9C9" fillOpacity="0.15" />
              <path d="M13.5 8.5L9.5 13H13L11.5 16.5L15.5 12H12L13.5 8.5Z" fill="currentColor" />
            </svg>
          </div>
          <span className="text-xs font-normal tracking-[0.25em] text-white uppercase font-sans whitespace-nowrap opacity-80 ">
            Vocalii
          </span>
        </div>

        {/* Center: Replaced the horizontal layout navigation icons with clean, modern text links */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20 select-none">
          <div className="flex items-center gap-7">
            
            {/* Home Link */}
            <div className="relative">
              <button
                onClick={() => {
                  setCurrentView('home');
                  setActiveTab('Overview');
                }}
                className={`px-3 py-1.5 text-[13px] tracking-wide transition-all duration-300 relative cursor-pointer font-sans whitespace-nowrap ${
                  currentView === 'home'
                    ? 'text-white font-medium'
                    : 'text-zinc-500 hover:text-white font-normal'
                }`}
              >
                Home
              </button>
            </div>

            {/* Rituals Link */}
            <div className="relative">
              <button
                onClick={() => {
                  setCurrentView('rituals');
                }}
                className={`px-3 py-1.5 text-[13px] tracking-wide transition-all duration-300 relative cursor-pointer font-sans whitespace-nowrap ${
                  currentView === 'rituals'
                    ? 'text-white font-medium'
                    : 'text-zinc-500 hover:text-white font-normal'
                }`}
              >
                Rituals
              </button>
            </div>

            {/* Reports Link */}
            <div className="relative">
              <button
                onClick={() => setCurrentView('reports')}
                className={`px-3 py-1.5 text-[13px] tracking-wide transition-all duration-300 relative cursor-pointer font-sans whitespace-nowrap ${
                  currentView === 'reports'
                    ? 'text-white font-medium'
                    : 'text-zinc-500 hover:text-white font-normal'
                }`}
              >
                Reports
              </button>
            </div>

          </div>
        </div>

        {/* Right Side: Notification + User profile */}
        <div className="flex items-center gap-4 justify-end z-10 flex-shrink-0 pr-6">
          
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200 shadow-sm relative group cursor-pointer ${notifOpen ? 'text-[#21e8ff] bg-[#17A9C9]/20 border-[#17A9C9]/30' : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-[#21e8ff] hover:bg-[#17A9C9]/20 hover:border-[#17A9C9]/30'}`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#21e8ff] rounded-full animate-ping" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#21e8ff] rounded-full" />
                </>
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-11 w-72 rounded-[20px] z-50 overflow-hidden"
                style={{
                  background: 'linear-gradient(to bottom, rgba(15,28,35,1) 0%, rgba(11,14,19,1) 100%)',
                  border: '1px solid rgba(23,169,201,0.3)',
                  boxShadow: '0 0 24px rgba(23,169,201,0.08), 0 12px 40px rgba(0,0,0,0.5)',
                }}
              >
                {/* Top sheen */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#17A9C9]/25 to-transparent" />
                {/* Bottom glow blob */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-16 bg-[#17A9C9]/15 rounded-full blur-[30px] pointer-events-none" />

                <div className="px-4 pt-3.5 pb-2 relative z-10">
                  <span className="text-[9px] font-medium text-[#21e8ff] uppercase tracking-wider bg-[#17A9C9]/15 px-2.5 py-1 rounded-full border border-[#17A9C9]/30">Notifications</span>
                </div>

                <div className="flex flex-col relative z-10">
                  {notifications.length === 0 ? (
                    <p className="text-[12px] text-zinc-600 text-center py-6">No new notifications</p>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={n.id}>
                        {i > 0 && <div className="h-px mx-4 bg-[#17A9C9]/10" />}
                        <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#17A9C9]/5 transition-colors duration-150">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#21e8ff] mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(33,232,255,0.6)]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-zinc-300 leading-snug">{n.text}</p>
                            <p className="text-[10px] text-[#21e8ff]/40 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-3 py-2.5 relative z-10" style={{ borderTop: '1px solid rgba(23,169,201,0.12)' }}>
                  <button
                    onClick={() => { setNotifications([]); setNotifOpen(false); }}
                    className="w-full py-2 rounded-xl text-[11px] text-[#21e8ff]/50 hover:text-[#21e8ff] hover:bg-[#17A9C9]/10 transition-all duration-150 cursor-pointer tracking-wide border border-transparent hover:border-[#17A9C9]/20"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile button + dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="w-9 h-9 rounded-full bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 shadow-sm cursor-pointer"
              title="Account"
            >
              <User className="w-4 h-4" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-11 w-36 rounded-xl z-50 py-1 overflow-hidden"
                style={{
                  background: 'rgba(13,14,17,0.85)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                {/* top sheen line */}
                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-zinc-300 hover:text-white hover:bg-white/5 transition-colors duration-150 cursor-pointer">
                  <User className="w-3 h-3 text-zinc-500" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-zinc-300 hover:text-white hover:bg-white/5 transition-colors duration-150 cursor-pointer">
                  <Settings className="w-3 h-3 text-zinc-500" />
                  Settings
                </button>
                <div className="h-px mx-2.5 my-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors duration-150 cursor-pointer">
                  <LogOut className="w-3 h-3" />
                  Log out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
