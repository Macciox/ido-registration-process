interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingButton({ 
  loading, 
  children, 
  className = '', 
  ...props 
}: { 
  loading: boolean; 
  children: React.ReactNode; 
  className?: string;
  [key: string]: any;
}) {
  return (
    <button 
      {...props}
      disabled={loading || props.disabled}
      className={`flex items-center gap-2 ${className} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}