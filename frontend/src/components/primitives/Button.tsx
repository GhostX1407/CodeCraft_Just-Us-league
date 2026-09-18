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
    'relative inline-flex items-center justify-center font-sans font-bold transition-all duration-180 focus-visible:outline-2 focus-visible:outline-[#149B9E] select-none active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100 overflow-hidden';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-lg font-bold',
    md: 'h-10 px-4 text-sm rounded-xl font-bold',
    lg: 'h-12 px-6 text-base font-extrabold rounded-xl',
    stage: 'h-[72px] px-8 text-xl font-black rounded-2xl shadow-lg',
  };

  const variantStyles = {
    primary:
      'bg-[#149B9E] text-white hover:bg-[#0D7C7E] shadow-md shadow-[#149B9E]/25 active:bg-[#0A6466]',
    commit:
      'bg-[#0D9488] text-white hover:bg-[#0F766E] shadow-md shadow-[#0D9488]/25 active:bg-[#115E59]',
    reject:
      'border border-[#E11D48]/40 text-[#E11D48] hover:bg-[#FFE4E6] bg-white shadow-xs',
    secondary:
      'bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-xs',
    ghost:
      'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] bg-transparent',
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
