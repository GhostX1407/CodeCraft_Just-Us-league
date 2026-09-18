import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'commit' | 'reject' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'stage';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-sans font-bold transition-all duration-180 focus-visible:outline-2 focus-visible:outline-[#EA580C] select-none active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100 overflow-hidden';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-lg font-bold',
    md: 'h-10 px-4 text-sm rounded-xl font-bold',
    lg: 'h-12 px-6 text-base font-extrabold rounded-xl',
    stage: 'h-[72px] px-8 text-xl font-black rounded-2xl shadow-lg',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white hover:brightness-105 shadow-md shadow-[#EA580C]/25 active:scale-[0.98]',
    commit:
      'bg-[#52796F] text-white hover:bg-[#354F52] shadow-md shadow-[#52796F]/25 active:bg-[#2F4858]',
    reject:
      'border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#FEE2E2] bg-white shadow-xs',
    secondary:
      'bg-white border border-[#E8E2D9] text-[#2D231C] hover:bg-[#FAF8F5] hover:border-[#D8CFBF] shadow-xs',
    ghost:
      'text-[#7D7067] hover:text-[#2D231C] hover:bg-[#F4EFE6] bg-transparent',
  };

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="relative z-10 flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          <span>Confirming…</span>
        </span>
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </button>
  );
};
