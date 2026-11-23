
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'profile';
  openAuthModal: (tab?: 'login' | 'register' | 'profile') => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [authModalTab, setAuthModalTab] = useState<
    'login' | 'register' | 'profile'
  >('login');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let authEventVersion = 0;

    // Nasłuchiwanie zmian sesji.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventVersion++;

      if (!mounted) return;

      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Zapamiętujemy wersję przed pobraniem sesji.
    const initialVersion = authEventVersion;

    // Przywracanie zapisanej sesji.
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        // Nie nadpisujemy nowszego zdarzenia autoryzacji.
        if (!mounted || authEventVersion !== initialVersion) {
          return;
        }

        setUser(data.session?.user ?? null);
      } catch (error) {
        console.error('Błąd inicjalizacji autoryzacji:', error);

        if (mounted && authEventVersion === initialVersion) {
          setUser(null);
        }
      } finally {
        if (mounted && authEventVersion === initialVersion) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = (
    tab: 'login' | 'register' | 'profile' = 'login'
  ) => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    }

    setUser(null);
    closeAuthModal();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
};
