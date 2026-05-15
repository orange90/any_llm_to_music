'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent/90 text-white disabled:bg-accent/40',
  secondary: 'bg-panel2 hover:bg-border text-text border border-border',
  ghost: 'bg-transparent hover:bg-panel2 text-text',
  danger: 'bg-red-500/80 hover:bg-red-500 text-white',
};

const SIZE_CLS: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-md',
  md: 'h-10 px-4 text-sm rounded-lg',
};

function cx(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(' ');
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'primary', size = 'md', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center gap-1 font-medium transition-colors disabled:cursor-not-allowed',
        VARIANT_CLS[variant],
        SIZE_CLS[size],
        className,
      )}
      {...rest}
    />
  );
});
