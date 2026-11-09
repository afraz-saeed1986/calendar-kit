import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';
import { usePopoverPosition } from './use-popover-position';

const TABBABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside the popover by wrapping around at its ends. */
function trapTab(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget;
  const items = Array.from(dialog.querySelectorAll<HTMLElement>(TABBABLE));
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export interface PickerPopoverProps {
  ref: (node: HTMLDivElement | null) => void;
  id: string;
  role: 'dialog';
  className: string;
  style: CSSProperties;
  tabIndex: number;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

export interface PickerPopover {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  /** Close the popover, and give the focus back to the input when `returnFocus` is true. */
  close: (returnFocus: boolean) => void;
  inputRef: RefObject<HTMLInputElement>;
  /** Ref of the element the popover is anchored to: the wrapper of the input and the button. */
  setWrapper: (node: HTMLDivElement | null) => void;
  /** The id of the popover, for `aria-controls`. */
  dialogId: string;
  /** Spread these on the popover element and add its `aria-label` and children. */
  popoverProps: PickerPopoverProps;
  /** Put the popover in `document.body` unless `portal` is false. */
  renderLayer: (node: ReactNode) => ReactNode;
}

/**
 * What the pickers share: the open state, the position (Floating UI), the portal, the click
 * outside, Escape, the focus trap and the focus on open (ADR 0013).
 */
export function usePickerPopover({ portal }: { portal: boolean }): PickerPopover {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();

  const {
    setReference,
    setFloating,
    style: popoverStyle,
  } = usePopoverPosition(open, portal ? 'fixed' : 'absolute');

  // Each element is needed twice: by our own checks and by the positioning.
  const setWrapper = useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      setReference(node);
    },
    [setReference],
  );
  const setPopover = useCallback(
    (node: HTMLDivElement | null) => {
      popoverRef.current = node;
      setFloating(node);
    },
    [setFloating],
  );

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) inputRef.current?.focus();
  }, []);

  // A pointer down outside the input and the popover closes it. The popover can be in the body,
  // so it is not inside the wrapper.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Opening moves the focus into the calendar, on the focused day.
  useEffect(() => {
    if (!open) return;
    popoverRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus();
  }, [open]);

  // Escape closes the popover from anywhere, even when a click left the focus on the page.
  // A calendar that used the key to leave its month or year view has already handled it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const renderLayer = (node: ReactNode) => (portal ? createPortal(node, document.body) : node);

  return {
    open,
    setOpen,
    close,
    inputRef,
    setWrapper,
    dialogId,
    popoverProps: {
      ref: setPopover,
      id: dialogId,
      role: 'dialog',
      className: 'calendrix-popover',
      style: popoverStyle,
      tabIndex: -1,
      onKeyDown: trapTab,
    },
    renderLayer,
  };
}