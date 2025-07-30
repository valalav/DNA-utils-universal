import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors 
          ${variant === "ghost" ? "hover:bg-gray-100" : "bg-primary text-white hover:bg-primary/90"}
          ${size === "sm" ? "px-2 py-1 text-sm" : "px-4 py-2"}
          ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button"; 