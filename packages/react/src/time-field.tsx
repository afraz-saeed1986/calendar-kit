import type { TimeFieldOptions, TimeSegmentType } from '@calendrix/core';
import { Fragment, useEffect, useRef, type KeyboardEvent } from 'react';
import { toReactProps } from './props';
import { useTimeField } from './use-time-field';

export interface TimeFieldProps extends TimeFieldOptions {
  className?: string;
}

/**
 * A time input made of segments (hour, minute, optional seconds, AM/PM). Each segment is a
 * spinbutton: type digits, or use the up and down arrow keys. It has no styles of its own:
 * style the `calendrix-*` classes, or import `@calendrix/react/styles.css`.
 * It accepts every option of `createTimeField`.
 */
export function TimeField({ className, ...options }: TimeFieldProps) {
  const { field, state } = useTimeField(options);
  const rootRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);

  // When typing completes a segment the core makes the next one active: it needs the real focus.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    const type = state.activeSegment;
    if (!type) return;
    rootRef.current?.querySelector<HTMLElement>(`[data-segment="${type}"]`)?.focus();
  });

  const handleKeyDown = (type: TimeSegmentType, event: KeyboardEvent<HTMLElement>) => {
    const before = field.getState();
    field.handleKeyDown(type, event);
    if (field.getState() !== before) focusPending.current = true;
  };

  return (
    <div
      {...toReactProps(field.getRootProps())}
      ref={rootRef}
      className={['calendrix-time-field', className].filter(Boolean).join(' ')}
    >
      {state.segments.map((segment) => (
        <Fragment key={segment.type}>
          {(segment.type === 'minute' || segment.type === 'second') && (
            <span className="calendrix-separator" aria-hidden="true">
              :
            </span>
          )}
          <span
            {...toReactProps(field.getSegmentProps(segment.type))}
            onKeyDown={(event) => handleKeyDown(segment.type, event)}
            className="calendrix-segment"
          >
            {segment.text}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
