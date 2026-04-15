import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
        <linearGradient id="anvilGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Hexagon Background */}
      <path 
        d="M100 10 L180 50 L180 150 L100 190 L20 150 L20 50 Z" 
        fill="url(#hexGradient)" 
        stroke="#38bdf8" 
        strokeWidth="2" 
        strokeOpacity="0.3"
      />

      {/* Pulse/Heartbeat Line */}
      <path 
        d="M40 145 L70 145 L80 120 L95 160 L105 135 L115 145 L160 145" 
        fill="none" 
        stroke="#38bdf8" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />

      {/* Anvil */}
      <path 
        d="M30 115 C 50 115, 60 125, 70 125 L130 125 C 140 125, 150 115, 170 115 L165 130 L135 130 C 130 140, 125 155, 135 165 L65 165 C 75 155, 70 140, 65 130 L35 130 Z" 
        fill="url(#anvilGradient)"
        stroke="#0f172a"
        strokeWidth="2"
      />
      
      {/* Anvil Highlight */}
      <path 
        d="M35 117 C 50 117, 60 127, 70 127 L130 127 C 140 127, 150 117, 165 117" 
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1.5"
        opacity="0.5"
      />

      {/* Glowing Letter Č */}
      <g filter="url(#glow)">
        <path 
          d="M115 75 C 115 60, 105 50, 90 50 C 70 50, 55 65, 55 85 C 55 105, 70 120, 90 120 C 105 120, 115 110, 115 95 L95 95 C 95 100, 90 105, 85 105 C 75 105, 70 95, 70 85 C 70 75, 75 65, 85 65 C 90 65, 95 70, 95 75 Z" 
          fill="url(#glowGradient)"
        />
        {/* Caron */}
        <path 
          d="M75 40 L85 48 L95 40 L90 35 L85 40 L80 35 Z" 
          fill="url(#glowGradient)"
        />
      </g>

      {/* Robotic Arm */}
      <g transform="translate(15, -10)">
        {/* Arm segments */}
        <path d="M180 120 L150 90" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" />
        <path d="M180 120 L150 90" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
        
        {/* Joints */}
        <circle cx="150" cy="90" r="10" fill="#475569" stroke="#0f172a" strokeWidth="2" />
        <circle cx="150" cy="90" r="4" fill="#38bdf8" />
        
        {/* Hand/Claw */}
        <path d="M145 85 L130 70 L120 75 L135 90 Z" fill="#64748b" stroke="#0f172a" strokeWidth="1.5" />
        <path d="M140 95 L125 80 L115 85 L130 100 Z" fill="#64748b" stroke="#0f172a" strokeWidth="1.5" />
        
        {/* Hammer Handle */}
        <path d="M100 100 L140 60" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
        
        {/* Hammer Head */}
        <path d="M90 50 L110 30 L120 40 L100 60 Z" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
        <path d="M85 55 L95 45 L100 50 L90 60 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
      </g>

      {/* Sparks */}
      <g filter="url(#sparkGlow)">
        <circle cx="105" cy="45" r="2" fill="#38bdf8" />
        <circle cx="115" cy="35" r="1.5" fill="#38bdf8" />
        <circle cx="95" cy="25" r="2" fill="#f97316" />
        <circle cx="125" cy="55" r="1" fill="#f97316" />
        <circle cx="85" cy="55" r="1.5" fill="#38bdf8" />
        
        <path d="M105 45 L120 20" stroke="#38bdf8" strokeWidth="1" opacity="0.8" />
        <path d="M105 45 L85 15" stroke="#f97316" strokeWidth="1.5" opacity="0.8" />
        <path d="M105 45 L135 40" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
        <path d="M105 45 L80 40" stroke="#f97316" strokeWidth="1" opacity="0.7" />
      </g>
      
      {/* Binary/Digital background elements */}
      <text x="130" y="40" fontSize="8" fill="#38bdf8" opacity="0.4" fontFamily="monospace">01</text>
      <text x="145" y="55" fontSize="6" fill="#38bdf8" opacity="0.3" fontFamily="monospace">10</text>
      <text x="125" y="65" fontSize="7" fill="#38bdf8" opacity="0.5" fontFamily="monospace">11</text>
      <text x="155" y="35" fontSize="5" fill="#38bdf8" opacity="0.2" fontFamily="monospace">00</text>

    </svg>
  );
};
