'use client';

import { Tabs } from 'nextra/components';
import { useEffect } from 'react';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const frameworks = [
  ['React', 'react'],
  ['Vue', 'vue'],
  ['Angular', 'angular'],
];

const currentTheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

/** Tells a demo iframe which theme the site shows. */
function sendTheme(frame) {
  frame.contentWindow?.postMessage(
    { type: 'calendrix-theme', theme: currentTheme() },
    window.location.origin,
  );
}

/** One live example in a tab for each framework. `name` is the hash of the example in the demo apps. */
export function Example({ name, height = 600 }) {
  useEffect(() => {
    // The site toggles the "dark" class on <html>: tell every demo on the page when it changes.
    const observer = new MutationObserver(() =>
      document.querySelectorAll('iframe[data-calendrix]').forEach(sendTheme),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Tabs items={frameworks.map(([label]) => label)}>
      {frameworks.map(([label, dir]) => (
        <Tabs.Tab key={dir}>
          <iframe
            data-calendrix=""
            title={`${label}: ${name}`}
            src={`${base}/demos/${dir}/index.html#${name}`}
            loading="lazy"
            onLoad={(event) => sendTheme(event.currentTarget)}
            style={{ width: '100%', height, border: '1px solid #8884', borderRadius: 8 }}
          />
        </Tabs.Tab>
      ))}
    </Tabs>
  );
}
