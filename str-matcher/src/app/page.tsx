"use client";

import dynamic from 'next/dynamic';
import React from 'react';

interface STRMatcherProps {}

const STRMatcher = dynamic<STRMatcherProps>(
  () => import('@/components/str-matcher/STRMatcher').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="min-h-screen p-4 bg-background-primary text-text-primary">
      <STRMatcher />
    </main>
  );
}