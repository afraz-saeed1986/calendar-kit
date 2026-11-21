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
  const seenFocusRequest = useRef(state.focusRequest);

  // When typing completes a segment the core makes the next one active and asks for the focus.
  useEffect(() => {
    if (state.focusRequest === seenFocusRequest.current) return;
    seenFocusRequest.current = state.focusRequest;
    const type = state.activeSegment;
    if (!type) return;
    rootRef.current?.querySelector<HTMLElement>(`[data-segment="${type}"]`)?.focus();
  });

  // Text from an on-screen keyboard (ADR 0024). The native `beforeinput` event bubbles, so one
  // listener on the root serves every segment.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const segmentOf = (event: Event): { element: HTMLElement; type: TimeSegmentType } | null => {
      const target = event.target;
      const element = target instanceof Element ? target.closest<HTMLElement>('[data-segment]') : null;
      return element ? { element, type: element.dataset.segment as TimeSegmentType } : null;
    };
    const onBeforeInput = (event: InputEvent) => {
      const found = segmentOf(event);
      if (found) field.handleBeforeInput(found.type, event);
    };
    // A composition cannot be cancelled. The browser has written into the text of the segment, so
    // write the text from the state back into the same text node (React keeps that node).
    const onInput = (event: Event) => {
      if (!(event as InputEvent).isComposing) return;
      const found = segmentOf(event);
      if (!found) return;
      const text = field.getState().segments.find((s) => s.type === found.type)?.text;
      const node = found.element.firstChild;
      if (text !== undefined && node?.nodeType === Node.TEXT_NODE) (node as Text).data = text;
    };
    root.addEventListener('beforeinput', onBeforeInput as EventListener);
    root.addEventListener('input', onInput);
    return () => {
      root.removeEventListener('beforeinput', onBeforeInput as EventListener);
      root.removeEventListener('input', onInput);
    };
  }, [field]);

  const handleKeyDown = (type: TimeSegmentType, event: KeyboardEvent<HTMLElement>) => {
    // Typing that completes a segment gives a new `focusRequest`; the effect above moves the focus.
    field.handleKeyDown(type, event);
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
            suppressContentEditableWarning
            className="calendrix-segment"
          >
            {segment.text}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
