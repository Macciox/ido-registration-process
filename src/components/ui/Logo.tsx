import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <Link href="/" className={`flex items-center ${className || ''}`}>
      <svg className="h-8 w-auto mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#7c3aed" />
        <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-xl font-bold text-secondary">Decubate IDO</span>
    </Link>
  );
};

export default Logo;