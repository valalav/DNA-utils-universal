"use client";

import * as React from "react";
import { useTranslation } from "@/hooks/useTranslation";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>((props, ref) => {
 const { className, ...other } = props;
 return (
   <div
     ref={ref}
     className={`rounded-2xl border border-border-light bg-background-primary shadow-lg transition-all hover:shadow-xl ${className || ''}`}
     {...other}
   />
 );
});
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>((props, ref) => {
 const { className, ...other } = props;
 return (
   <div
     ref={ref}
     className={`flex flex-col space-y-1.5 p-6 bg-gradient-to-r from-background-secondary to-background-tertiary/30 border-b border-border-light transition-all rounded-t-2xl ${className || ''}`}
     {...other}
   />
 );
});
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>((props, ref) => {
 const { className, ...other } = props;
 return (
   <h3
     ref={ref}
     className={`text-xl font-bold leading-none tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent transition-all ${className || ''}`}
     {...other}
   />
 );
});
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>((props, ref) => {
 const { className, ...other } = props;
 return (
   <div 
     ref={ref}
     className={`p-6 pt-0 text-text-primary transition-all ${className || ''}`}
     {...other}
   />
 );
});
CardContent.displayName = "CardContent";