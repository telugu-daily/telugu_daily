import { createContext, useContext } from 'react';

interface ThemeContextType {
  theme: {
    backgroundColor: string;
    cardBackground: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    border: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = {
    backgroundColor: '#F5F5F5',
    cardBackground: '#FFFFFF',
    textPrimary: '#2C3E50',
    textSecondary: '#8E8E93',
    accent: '#4ECDC4',
    border: '#E1E1E6',
  };

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};