"use client";

import React from 'react';
import { Checkbox } from '../checkbox';
import { useTranslation } from '@/hooks/useTranslation';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
 startIcon?: React.ReactNode;
 label?: string;
 error?: string;
}

const Input: React.FC<InputProps> = ({ 
 startIcon, 
 className, 
 label,
 error,
 ...props 
}) => {
 const { t } = useTranslation();
 
 return (
   <div className="flex flex-col gap-1">
     {label && (
       <label className="text-sm font-medium text-text-primary">
         {label}
       </label>
     )}
     <div className="relative">
       {startIcon && (
         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
           {startIcon}
         </div>
       )}
       <input
         className={`w-full p-2 ${startIcon ? 'pl-10' : ''} border rounded
                    bg-background-primary text-text-primary 
                    border-border-medium focus:border-accent focus:ring-1
                    focus:ring-accent outline-none transition-colors
                    ${error ? 'border-error' : ''}
                    ${className || ''}`}
         {...props}
       />
     </div>
     {error && (
       <span className="text-xs text-error">
         {error}
       </span>
     )}
   </div>
 );
};

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
 className,
 children,
 ...props
}) => (
 <select
   className={`w-full p-2 border rounded bg-background-primary
              text-text-primary border-border-medium
              focus:border-accent focus:ring-1 focus:ring-accent 
              outline-none transition-colors ${className || ''}`}
   {...props}
 >
   {children}
 </select>
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
 className,
 ...props
}) => (
 <textarea
   className={`w-full p-2 border rounded bg-background-primary
              text-text-primary border-border-medium
              focus:border-accent focus:ring-1 focus:ring-accent 
              outline-none transition-colors resize-none ${className || ''}`}
   {...props}
 />
);

export const FormControls = {
 Input,
 Select,
 TextArea,
 Checkbox
};