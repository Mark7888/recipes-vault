import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
// The package imports this itself, but that import does not survive the bundle
// — without naming it here the reference renders as unstyled markup.
import '@scalar/api-reference-react/style.css';

/**
 * The API reference, rendered by Scalar from the spec the server generates at
 * /api/openapi.json — so the docs are whatever the running build actually
 * serves, never a copy that drifts.
 *
 * Outside the app's Layout on purpose: Scalar brings its own full-page shell,
 * its own theming and its own scroll handling, and the page is public — reading
 * how to authenticate should not require being authenticated.
 */
export default function ApiDocs() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  // next-themes toggles the class on <html>; Scalar takes the mode as a prop,
  // so mirror the change instead of letting the two disagree.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <ApiReferenceReact
      configuration={{
        url: '/api/openapi.json',
        darkMode: theme === 'dark',
      }}
    />
  );
}
