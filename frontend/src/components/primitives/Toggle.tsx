import React from 'react';
import clsx from 'clsx';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  sublabel?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  sublabel,
  disabled = false,
}) => {
  return (
    <label
      className={clsx(
        'flex items-center justify-between p-3.5 border border-[#E8E2D9] rounded-xl bg-white cursor-pointer select-none transition-colors',
        checked ? 'border-[#EA580C] bg-[#FFF7ED]/70' : 'hover:bg-[#FAF8F5]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div>
        <div className="text-sm font-bold text-[#2D231C]">{label}</div>
        {sublabel && <div className="text-xs text-[#7D7067] font-medium">{sublabel}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }}
        className={clsx(
          'w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out',
          checked ? 'bg-[#EA580C]' : 'bg-[#D8CFBF]'
        )}
      >
        <div
          className={clsx(
            'bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}
        />
      </button>
    </label>
  );
};

interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  unit?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  label,
  value,
  min = 0,
  max = 99,
  onChange,
  unit,
}) => {
  return (
    <div className="flex items-center justify-between p-3.5 border border-[#E8E2D9] rounded-xl bg-white">
      <span className="text-sm font-bold text-[#2D231C]">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-lg border border-[#E8E2D9] bg-white flex items-center justify-center text-[#2D231C] hover:bg-[#FAF8F5] disabled:opacity-30 disabled:pointer-events-none active:scale-95 font-mono text-base font-bold shadow-xs"
        >
          -
        </button>
        <span className="w-10 text-center font-mono text-sm font-extrabold text-[#2D231C]">
          {value}
          {unit && <span className="text-xs text-[#7D7067] ml-0.5 font-bold">{unit}</span>}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-lg border border-[#E8E2D9] bg-white flex items-center justify-center text-[#2D231C] hover:bg-[#FAF8F5] disabled:opacity-30 disabled:pointer-events-none active:scale-95 font-mono text-base font-bold shadow-xs"
        >
          +
        </button>
      </div>
    </div>
  );
};
