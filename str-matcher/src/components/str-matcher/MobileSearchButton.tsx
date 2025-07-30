"use client";

import React, { useState, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface MobileSearchButtonProps {
 onFindMatches: () => void;
 isLoading?: boolean;
 isDisabled?: boolean;
}

const MobileSearchButton: React.FC<MobileSearchButtonProps> = ({ 
 onFindMatches,
 isLoading = false,
 isDisabled = false
}) => {
 const { t } = useTranslation();
 const [buttonPosition, setButtonPosition] = useState({ x: 20, y: window.innerHeight - 80 });
 const [isDragging, setIsDragging] = useState(false);
 const buttonRef = useRef<HTMLDivElement>(null);

 return (
   <div 
     ref={buttonRef}
     className="fixed z-50 cursor-move touch-none select-none md:hidden"
     style={{
       left: `${Math.max(20, Math.min(buttonPosition.x, window.innerWidth - 200))}px`,
       top: `${Math.max(20, Math.min(buttonPosition.y, window.innerHeight - 60))}px`
     }}
     onTouchStart={() => setIsDragging(true)}
   >
     <button
       onClick={onFindMatches}
       disabled={isDisabled}
       className="px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-hover
                 disabled:bg-gray-400 shadow-lg flex items-center gap-2"
     >
       {isLoading ? (
         <>
           <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
           {t('search.searching')}
         </>
       ) : (
         <>
           <svg 
             xmlns="http://www.w3.org/2000/svg" 
             width="20" 
             height="20" 
             viewBox="0 0 24 24" 
             fill="none" 
             stroke="currentColor" 
             strokeWidth="2" 
             strokeLinecap="round" 
             strokeLinejoin="round"
           >
             <circle cx="11" cy="11" r="8"/>
             <line x1="21" y1="21" x2="16.65" y2="16.65"/>
           </svg>
           {t('search.button')}
         </>
       )}
     </button>
   </div>
 );
};

export default MobileSearchButton;