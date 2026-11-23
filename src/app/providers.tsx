
import React from 'react';

import { AuthProvider } from '@/features/auth/AuthContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};
