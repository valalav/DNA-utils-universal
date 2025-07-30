"use client";

import * as React from "react";
import { useTranslation } from "@/hooks/useTranslation";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
 variant?: "default" | "destructive";
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
 const { className, variant = "default", ...other } = props;
 const { t } = useTranslation();

 return (
   <div
     ref={ref}
     role="alert"
     className={`relative w-full rounded-lg border p-4 transition-colors ${
       variant === "destructive" 
         ? "border-error/50 bg-error/10 text-error"
         : "border-border-light bg-background-primary text-text-primary"
     }`}
     {...other}
   />
 );
});
Alert.displayName = "Alert";

export const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
 (props, ref) => {
   const { className, ...other } = props;
   return (
     <div
       ref={ref}
       className="text-sm text-text-secondary [&_p]:leading-relaxed transition-colors"
       {...other}
     />
   );
 }
);
AlertDescription.displayName = "AlertDescription";