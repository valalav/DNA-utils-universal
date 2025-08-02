'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { ColorSchemeProvider } from './ColorSchemeProvider';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ColorSchemeProvider>
        <div className="min-h-screen bg-background-primary text-text-primary transition-colors">
          {children}
        </div>
      </ColorSchemeProvider>
    </Provider>
  );
}

export { Providers };
export default Providers;