"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface CollapsibleProps {
 title: string;
 children: React.ReactNode;
 defaultOpen?: boolean;
}

export const Collapsible: React.FC<CollapsibleProps> = ({ 
 title, 
 children, 
 defaultOpen = false 
}) => {
 const { t } = useTranslation();
 const [isOpen, setIsOpen] = useState(defaultOpen);

 return (
   <div className="mb-5">
     <button
       onClick={() => setIsOpen(!isOpen)}
       className="min-w-[160px] w-full flex items-center justify-between h-12 px-5 
                bg-background-primary border border-border-light rounded-xl
                text-sm font-medium hover:bg-background-secondary transition-all
                shadow-md hover:shadow-lg group"
       aria-expanded={isOpen}
     >
       <span className="truncate font-bold">{title}</span>
       <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
         <ChevronDown className={`h-4 w-4 flex-shrink-0 text-primary transition-transform duration-300 ${isOpen ? 'transform rotate-0' : 'transform rotate-180'}`} />
       </div>
     </button>
     <div 
       className={`mt-3 transition-all duration-300 ease-in-out overflow-hidden ${
         isOpen ? 'max-h-[2000px] opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-95'
       } transform-origin-top`}
       role="region"
       aria-labelledby={`${title}-button`}
     >
       <div className={`p-2 rounded-xl bg-background-primary/50 border border-transparent ${isOpen ? 'block animate-fadeIn' : 'hidden'}`}>
         {children}
       </div>
     </div>
   </div>
 );
};

export default Collapsible;