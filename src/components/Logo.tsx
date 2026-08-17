import React from 'react';
import { GraduationCap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'dark',
  className = '',
  onClick
}) => {
  const containerSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl'
  };

  const iconSizes = {
    sm: 'w-4.5 h-4.5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  };

  const textSizes = {
    sm: 'text-base font-bold',
    md: 'text-xl font-bold',
    lg: 'text-2xl sm:text-3xl font-black'
  };

  const textColors = variant === 'dark'
    ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent'
    : 'text-slate-900';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-3 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Original Logo Symbol */}
      <div className={`${containerSizes[size]} bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
        <GraduationCap className={`${iconSizes[size]} text-white`} />
      </div>

      {/* Website Name */}
      <div>
        <span className={`${textSizes[size]} ${textColors} tracking-tight`}>
          Calculate GPA Plus
        </span>
      </div>
    </div>
  );
};
