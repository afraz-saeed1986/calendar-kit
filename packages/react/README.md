# @calendrix/react

React adapter for [calendrix](../../README.md): an accessible date and time picker with Persian (Jalali) and Gregorian support.

> Pre-alpha. See the [roadmap](../../docs/roadmap.md) for what is implemented.

```bash
pnpm add @calendrix/react @calendrix/core @calendrix/persian
```

```tsx
import { DateTimePicker } from '@calendrix/react';
import { persianPlugin } from '@calendrix/persian';
import '@calendrix/react/styles.css';

<DateTimePicker system="persian" locale="fa-IR" plugins={[persianPlugin]} onChange={console.log} />;
```

| Export                         | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `DateTimePicker`               | Text input and popover with a calendar and a time field  |
| `Calendar`                     | Month calendar with the ARIA grid pattern                |
| `TimeField`                    | Time input made of spinbutton segments                   |
| `useCalendar` / `useTimeField` | Hooks for your own markup                                |
| `toReactProps`                 | Turn the output of a core prop getter into React props   |
| `@calendrix/react/styles.css`  | Optional base styles driven by `--calendrix-*` variables |

Peer dependencies: `react` and `react-dom` 18 or newer. Full guide: [docs/react.md](../../docs/react.md).
