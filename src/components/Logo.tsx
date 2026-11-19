import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'emblem' | 'vector' | 'hybrid';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  variant = 'emblem',
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', img: 'w-7 h-7', text: 'text-base' },
    md: { box: 'w-10 h-10', img: 'w-9 h-9', text: 'text-lg' },
    lg: { box: 'w-16 h-16', img: 'w-14 h-14', text: 'text-2xl' },
    xl: { box: 'w-24 h-24', img: 'w-20 h-20', text: 'text-4xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Logo Icon Mark */}
      <div
        className={`relative ${currentSize.box} rounded-2xl p-0.5 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-400/40 transition-all duration-300 flex items-center justify-center overflow-hidden`}
      >
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-emerald-400/30 blur-sm rounded-2xl animate-pulse" />

        {/* Inner container */}
        <div className="relative w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden border border-emerald-400/30">
          {variant === 'vector' ? (
            /* Custom Scalable Cybernetic Agent Vector */
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-4/5 h-4/5"
            >
              {/* Outer Hexagon Circuit */}
              <polygon
                points="50,6 88,28 88,72 50,94 12,72 12,28"
                stroke="url(#emeraldCyanGrad)"
                strokeWidth="3.5"
                strokeDasharray="4 2"
                className="opacity-70"
              />
              {/* Agent Nodes (4 Specialized Agents) */}
              <circle cx="50" cy="18" r="4.5" fill="#34d399" />
              <circle cx="78" cy="50" r="4.5" fill="#38bdf8" />
              <circle cx="50" cy="82" r="4.5" fill="#fbbf24" />
              <circle cx="22" cy="50" r="4.5" fill="#c084fc" />

              {/* Connecting Quantum Lines */}
              <line x1="50" y1="18" x2="50" y2="50" stroke="#34d399" strokeWidth="2" strokeOpacity="0.8" />
              <line x1="78" y1="50" x2="50" y2="50" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.8" />
              <line x1="50" y1="82" x2="50" y2="50" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.8" />
              <line x1="22" y1="50" x2="50" y2="50" stroke="#c084fc" strokeWidth="2" strokeOpacity="0.8" />

              {/* Center Diamond Kernel */}
              <polygon
                points="50,34 64,50 50,66 36,50"
                fill="url(#coreGradient)"
                stroke="#6ee7b7"
                strokeWidth="2"
              />
              <circle cx="50" cy="50" r="3" fill="#ffffff" />

              <defs>
                <linearGradient id="emeraldCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            /* High-Res AI Studio Generated Cybernetic Emblem */
            <img
              src="/tariq-logo.jpg"
              alt="Tariq-AgentOS Logo"
              className="w-full h-full object-cover scale-110 filter brightness-110 contrast-110"
              onError={(e) => {
                // Fallback to SVG if image fails to load
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          )}
        </div>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex items-center text-right">
          <span
            className={`${currentSize.text} font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors font-mono`}
          >
            Tariq<span className="text-emerald-400 font-sans">-</span>Agent<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-sans">OS</span>
          </span>
        </div>
      )}
    </div>
  );
};
