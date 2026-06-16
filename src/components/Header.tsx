import React, { useState } from 'react';
import { Search, MapPin, Check, Sparkles, Bell, Info, Plus } from 'lucide-react';
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
  currentView: 'home' | 'rituals';
  setCurrentView: (view: 'home' | 'rituals') => void;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [chatQuery, setChatQuery] = useState('');

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
    <header className="fixed top-0 left-0 right-0 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/60 overflow-hidden font-sans z-50 px-6 py-3.5 shadow-sm" id="safe-one-header">
      {/* Subtle glowing ambient line at top of the bar */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#17A9C9]/25 to-transparent" />
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

            {/* Reports Link (Styled as inactive, other interactions disabled) */}
            <div>
              <span
                className="px-3 py-1.5 text-[13px] tracking-wide font-sans text-zinc-500 hover:text-white transition-all duration-300 whitespace-nowrap select-none cursor-default"
              >
                Reports
              </span>
            </div>

          </div>
        </div>

        {/* Right Side: Notification + User profile */}
        <div className="flex items-center gap-4 justify-end z-10 flex-shrink-0 pr-6">
          
          {/* Action icon 1: Notification Sparkle Bell */}
          <button
            onClick={() => alert('All systems operational. Travel planning feeds synchronized.')}
            className="w-9 h-9 rounded-full bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-[#17A9C9]/50 transition-all duration-200 shadow-sm relative group cursor-pointer"
            title="Safe Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#21e8ff] rounded-full animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#21e8ff] rounded-full" />
          </button>

          {/* Action icon 2: Info Profile Icon (Click handler and interaction removed) */}
          <div
            className="w-9 h-9 rounded-full border border-zinc-900 bg-zinc-900/60 overflow-hidden flex items-center justify-center text-zinc-300 select-none"
            title="Account Suite"
          >
            <svg className="w-full h-full text-zinc-200" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#18181b" />
              <path d="M16 8C19.3137 8 22 10.6863 22 14C22 17.3137 19.3137 20 16 20C12.6863 20 10 17.3137 10 14C10 10.6863 12.6863 8 16 8Z" fill="#71717a" className="fill-zinc-400" />
              <path d="M6 28C6 24.134 10.4772 21 16 21C21.5228 21 26 24.134 26 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400" />
            </svg>
          </div>

        </div>
      </div>
    </header>
  );
}
