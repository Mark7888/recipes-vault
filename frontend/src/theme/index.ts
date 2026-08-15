import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  globalCss: {
    'html, body': {
      bg: 'bg',
      color: 'fg',
    },
    // Tell the browser which palette to paint its own UI with — scrollbars,
    // autofill backgrounds, native pickers and spin buttons. Without this they
    // stay light (white) while the rest of the app is dark. Written as plain
    // selectors because Chakra's `_dark` condition is a descendant selector
    // (`.dark &`) and never matches the <html> element that carries the class.
    ':root': { colorScheme: 'light' },
    ':root.dark': { colorScheme: 'dark' },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f0fdf4' },
          100: { value: '#dcfce7' },
          200: { value: '#bbf7d0' },
          300: { value: '#86efac' },
          400: { value: '#4ade80' },
          500: { value: '#22c55e' },
          600: { value: '#16a34a' },
          700: { value: '#15803d' },
          800: { value: '#166534' },
          900: { value: '#14532d' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
