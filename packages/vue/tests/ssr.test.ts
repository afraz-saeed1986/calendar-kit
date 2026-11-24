// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, h, type Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Calendar, DatePicker, DateTimePicker, TimeField } from '../src/index';

const now = () => new Date(2026, 9, 14);

const render = (component: Component, props: Record<string, unknown> = {}) =>
  renderToString(createSSRApp({ render: () => h(component, props) }));

describe('server rendering', () => {
  it('renders a Calendar without a DOM', async () => {
    const html = await render(Calendar, { now });
    expect(html).toContain('October');
    expect(html.match(/calendrix-day"/g)).toHaveLength(42);
  });

  it('renders a TimeField without a DOM', async () => {
    const html = await render(TimeField, {
      hourCycle: 24,
      defaultValue: { hour: 9, minute: 30, second: 0 },
    });
    expect(html).toContain('calendrix-segment');
    expect(html).toContain('09');
  });

  it('renders a closed DatePicker without a DOM', async () => {
    const html = await render(DatePicker, { now });
    expect(html).toContain('calendrix-input');
    expect(html).not.toContain('role="dialog"');
  });

  it('renders a closed DateTimePicker without a DOM', async () => {
    const html = await render(DateTimePicker, { now });
    expect(html).toContain('calendrix-input');
    expect(html).not.toContain('role="dialog"');
  });
});
