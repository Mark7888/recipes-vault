import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { system } from './theme/index';
import { queryClient } from './lib/queryClient';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ColorModeProvider } from './components/ui/color-mode';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ChakraProvider value={system}>
        <ColorModeProvider>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </ColorModeProvider>
      </ChakraProvider>
    </ErrorBoundary>
  </StrictMode>
);
