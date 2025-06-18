import React, { ButtonHTMLAttributes } from 'react';
import { useBranding } from '@/lib/BrandingProvider';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const { mediaKit } = useBranding();
  
  // Base classes
  let baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition-colors';
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  // Custom styles based on media kit
  let customStyle = {};
  
  if (mediaKit) {
    // Apply custom button style if available
    if (mediaKit.button_style === 'rounded') {
      baseClasses = baseClasses.replace('rounded-md', 'rounded-full');
    } else if (mediaKit.button_style === 'sharp') {
      baseClasses = baseClasses.replace('rounded-md', 'rounded-none');
    }
    
    // Apply custom colors for primary variant
    if (variant === 'primary') {
      customStyle = {
        backgroundColor: mediaKit.primary_color,
        color: '#ffffff',
        ':hover': {
          backgroundColor: adjustColor(mediaKit.primary_color, -20) // Darken for hover
        }
      };
    }
    // Apply custom colors for secondary variant
    else if (variant === 'secondary') {
      customStyle = {
        backgroundColor: mediaKit.secondary_color,
        color: '#ffffff',
        ':hover': {
          backgroundColor: adjustColor(mediaKit.secondary_color, -20) // Darken for hover
        }
      };
    }
    // Apply custom colors for outline variant
    else if (variant === 'outline') {
      customStyle = {
        borderColor: mediaKit.primary_color,
        color: mediaKit.primary_color,
        ':hover': {
          backgroundColor: `${mediaKit.primary_color}20` // Very light version for hover
        }
      };
    }
  }
  
  // Default variant classes (used if no media kit is available)
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark',
    outline: 'border border-primary text-primary hover:bg-primary-light'
  };
  
  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${!mediaKit ? variantClasses[variant] : ''} ${className}`}
      style={mediaKit ? customStyle : {}}
      {...props}
    >
      {children}
    </button>
  );
};

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  // Remove # if present
  color = color.replace('#', '');
  
  // Parse the color
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Adjust each component
  const adjustR = Math.max(0, Math.min(255, r + amount));
  const adjustG = Math.max(0, Math.min(255, g + amount));
  const adjustB = Math.max(0, Math.min(255, b + amount));
  
  // Convert back to hex
  return `#${adjustR.toString(16).padStart(2, '0')}${adjustG.toString(16).padStart(2, '0')}${adjustB.toString(16).padStart(2, '0')}`;
}

export default Button;