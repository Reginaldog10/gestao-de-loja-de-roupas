import React from 'react';

interface LogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className, style }) => {
  return (
    <svg 
      viewBox="0 0 104 103" 
      width={size} 
      height={size} 
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="glowPosLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="40%" stopColor="#6d28ff" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Anel superior esquerdo (letra G externa) */}
      <path 
        d="M91.4,21.6 C82.8,10.2 68.8,3 53,3 C24.8,3 2,25.8 2,54 C2,64.2 5,73.8 10.2,81.8 L23.8,72.2 C20.2,66.8 18,60.6 18,54 C18,34.7 33.7,19 53,19 C63.8,19 73.4,24 79.4,31.8 L91.4,21.6 Z" 
        fill="url(#glowPosLogoGrad)"
      />
      {/* Círculo central, haste vertical e anel inferior (letra P e parte inferior do G) */}
      <path 
        d="M33,54 L33,83.4 C33,87.6 33.6,91.6 34.6,95.4 C39.4,98.4 45,100 51,100 C79.2,100 102,77.2 102,49 L102,40.5 L67.5,40.5 C67.5,30.8 59.7,23 50,23 C40.3,23 32.5,30.8 32.5,40.5 C32.5,50.2 40.3,58 50,58 C55,58 59.5,55.9 62.7,52.5 L102,52.5 L102,49 C102,71.1 84.1,89 62,89 C57,89 52.3,88.1 48,86.4 L48,54 C48,52.9 47.1,52 46,52 L35,52 C33.9,52 33,52.9 33,54 Z" 
        fill="url(#glowPosLogoGrad)"
      />
    </svg>
  );
};
