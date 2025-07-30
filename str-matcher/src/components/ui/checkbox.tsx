"use client";

import * as React from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className={`h-5 w-5 rounded-lg border-2 border-gray-300 text-primary 
                   focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 
                   disabled:cursor-not-allowed disabled:opacity-50 
                   hover:border-primary/50 checked:border-primary 
                   transition-all duration-300 ease-in-out ${className || ''}`}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };