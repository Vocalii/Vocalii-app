import React, { useState } from 'react';
import { MapPin, Sparkles, Flame, ArrowRight } from 'lucide-react';
import { Destination } from '../types';

interface HeroSectionProps {
  destination: Destination;
  activeSubTab: 'Overview' | 'Hotels' | 'Itinerary' | 'Flights';
  setActiveSubTab: (tab: 'Overview' | 'Hotels' | 'Itinerary' | 'Flights') => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export default function HeroSection({
  destination,
  isFavorited,
  onToggleFavorite,
}: HeroSectionProps) {
  // Let user toggle between high fidelity Call of Duty HUD and beautiful scenic caldera photo!
  const [hudMode, setHudMode] = useState(true);

  // Render Call of Duty Campaign Tactical Dashboard for Santorini
  const renderTacticalHud = () => {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c202a] via-[#181b22] to-[#12141a] flex flex-col justify-center gap-5 p-6 md:p-7 select-none overflow-hidden rounded-3xl border border-zinc-800/70 shadow-sm">
        
        {/* Sleek top ambient glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#17A9C9]/20 to-transparent" />
        
        {/* Soft elegant ambient color glows */}
        <div className="absolute bottom-[-10%] left-[-15%] w-[50%] h-[45%] bg-[#17A9C9]/[0.02] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[55%] h-[55%] bg-[#8b5cf6]/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-[#21e8ff]/[0.02] rounded-full blur-[90px] pointer-events-none" />

        {/* TOP PANEL: Title & Shooter tags */}
        <div className="flex items-start justify-between z-20">
          <div className="flex flex-col">
            <h2 className="text-white text-xl md:text-2xl font-light tracking-wide font-display leading-none">
              Welcome back, Gabriella
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                Your vocal health and performance statistics
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-zinc-900/60 text-[10px] tracking-[0.2em] font-bold uppercase text-zinc-400 border border-zinc-800/80 rounded-full shadow-inner mt-0.5">
              Vocalist
            </span>
          </div>
        </div>

        {/* Bottom segment: All stats wrapped into 3 beautiful buttons side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] font-sans w-full z-10 mt-6 pb-1">
          <button className="sm:col-span-2 relative flex items-center justify-between gap-3 bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 backdrop-blur-md hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 px-4 py-3.5 rounded-xl border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 text-left transition-all duration-300 group cursor-pointer shadow-[0_0_20px_rgba(23,169,201,0.12)] overflow-hidden">
            {/* Dynamic premium top highlight line */}
            <div className="absolute top-0 left-0 w-0 h-[1.5px] bg-[#21e8ff] transition-all duration-500 group-hover:w-full" />
            
            <div className="flex items-center gap-2.5">
              <span className="text-cyan-300 group-hover:text-[#21e8ff] text-[12px] font-medium tracking-wide font-display transition-colors duration-300">
                Vocal Safety Status
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:text-[#21e8ff] group-hover:translate-x-0.5 transition-all duration-300" />
          </button>
          
          <button className="sm:col-span-1 relative flex items-center justify-between gap-3 bg-zinc-900/30 backdrop-blur-md hover:bg-zinc-900/60 px-4 py-3.5 rounded-xl border border-zinc-800/80 hover:border-zinc-700/80 text-left transition-all duration-300 group cursor-pointer shadow-md overflow-hidden">
            {/* Dynamic premium top highlight line */}
            <div className="absolute top-0 left-0 w-0 h-[1.5px] bg-zinc-500/30 transition-all duration-500 group-hover:w-full" />
            
            <div className="flex items-center gap-2.5">
              <span className="text-zinc-350 group-hover:text-white text-[12px] font-light tracking-wide font-display transition-colors duration-300">
                Analyze Strain
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-300" />
          </button>

          <button className="sm:col-span-1 relative flex items-center justify-between gap-3 bg-zinc-900/30 backdrop-blur-md hover:bg-zinc-900/60 px-4 py-3.5 rounded-xl border border-zinc-800/80 hover:border-zinc-700/80 text-left transition-all duration-300 group cursor-pointer shadow-md overflow-hidden">
            {/* Dynamic premium top highlight line */}
            <div className="absolute top-0 left-0 w-0 h-[1.5px] bg-zinc-500/30 transition-all duration-500 group-hover:w-full" />
            
            <div className="flex items-center gap-2.5">
              <span className="text-zinc-350 group-hover:text-white text-[12px] font-light tracking-wide font-display transition-colors duration-300">
                Session Report
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-300" />
          </button>
        </div>

      </div>
    );
  };

  // Render traditional scenic postcard dashboard view
  const renderScenicCard = () => {
    return (
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-sm border border-zinc-850/50 group">
        
        {/* Background Scenic High-Res Destination Image */}
        <img
          src={destination.imageUrl}
          alt={destination.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* Overlapping Gradient Sheen */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

        {/* Content Container (Grid / Flex overlay) */}
        <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-between z-10 text-white">
          
          {/* Top Layer: Geotag */}
          <div className="flex items-center justify-between">
            {/* Geotag */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full border border-white/20">
              <MapPin className="w-3.5 h-3.5 text-[#fff843]" />
              <span className="text-xs font-semibold tracking-wide uppercase">{destination.country}</span>
            </div>

            {/* Switch Intel mode back on for Santorini */}
            {destination.id === 'santorini' && (
              <button
                onClick={() => setHudMode(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e11d48] text-white hover:bg-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-205 cursor-pointer shadow-lg shadow-rose-950/40 transform hover:scale-105"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                Enable Combat HUD
              </button>
            )}
          </div>

          {/* Middle/Bottom Layer: Elegant Rounded Text Headline */}
          <div className="max-w-2xl transform transition-transform duration-300 select-text">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display tracking-tight text-white mb-1.5 pb-0.5 leading-none flex items-center gap-2">
              {destination.name}
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse-soft" />
            </h1>
            <p className="text-xs md:text-sm text-neutral-200 line-clamp-2 md:line-clamp-3 leading-relaxed tracking-wide font-normal font-sans opacity-95">
              {destination.description}
            </p>
          </div>

        </div>
      </div>
    );
  };

  return (
    <section className="w-full py-2 font-sans relative" id="destination-hero">
      <div className="relative w-full min-h-[280px] sm:min-h-[220px] lg:min-h-[210px] xl:min-h-[200px] h-auto">
        {destination.id === 'santorini' && hudMode ? renderTacticalHud() : renderScenicCard()}
      </div>
    </section>
  );
}
