import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@calendrix/react/styles.css';
import { App } from './App';
import { ExampleFrame, examples } from './examples';
import { followDocsTheme } from './examples/docs-theme';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// The documentation site shows one example in an iframe, chosen by the hash: #date-picker
const Example = examples[window.location.hash.slice(1)];
if (Example) followDocsTheme();
window.addEventListener('hashchange', () => window.location.reload());

createRoot(root).render(
  <StrictMode>
    {Example ? (
      <ExampleFrame>
        <Example />
      </ExampleFrame>
    ) : (
      <App />
    )}
  </StrictMode>,
);
