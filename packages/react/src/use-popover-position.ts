import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import type { CSSProperties } from 'react';

export interface PopoverPosition {
  /** Ref callback for the element the popover is anchored to. */
  setReference: (node: HTMLElement | null) => void;
  /** Ref callback for the popover element. */
  setFloating: (node: HTMLElement | null) => void;
  /** Inline style with `position`, `top` and `left`. */
  style: CSSProperties;
}

const GAP = 4;
const VIEWPORT_PADDING = 8;

/**
 * Positions a popover under its anchor, flipping and shifting near viewport
 * edges, and keeping it positioned while the page scrolls or resizes.
 */
export function usePopoverPosition(open: boolean, strategy: 'fixed' | 'absolute'): PopoverPosition {
  const { refs, floatingStyles } = useFloating({
    open,
    strategy,
    placement: 'bottom-start',
    middleware: [
      offset(GAP),
      flip({ padding: VIEWPORT_PADDING }),
      shift({ padding: VIEWPORT_PADDING }),
      size({
        padding: VIEWPORT_PADDING,
        apply({ availableWidth, availableHeight, elements }) {
          elements.floating.style.maxWidth = `${Math.max(0, availableWidth)}px`;
          elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  return {
    setReference: refs.setReference,
    setFloating: refs.setFloating,
    style: floatingStyles,
  };
}