import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'red' | 'orange' | 'gray' | 'blue';

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-700',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
