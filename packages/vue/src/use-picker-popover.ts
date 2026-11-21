import { ref, toValue, useId, watch, type MaybeRefOrGetter } from 'vue';
import { usePopoverPosition } from './use-popover-position';

const TABBABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside the popover by wrapping around at its ends. */
export function trapTab(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget as HTMLElement;
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

/**
 * What the pickers share: the open state, the position (Floating UI), the click outside, Escape,
 * the focus trap and the focus on open (ADR 0013). The component binds `inputRef`, `wrapperRef`
 * (the anchor: the input and the button) and `popoverRef` as template refs, puts `dialogId` and
 * `popoverStyle` on the popover, `trapTab` on its `keydown`, and wraps it in
 * `<Teleport to="body" :disabled="!portal">`.
 */
export function usePickerPopover(options: { portal: MaybeRefOrGetter<boolean> }) {
  const open = ref(false);
  const inputRef = ref<HTMLInputElement | null>(null);
  const wrapperRef = ref<HTMLElement | null>(null);
  const popoverRef = ref<HTMLElement | null>(null);
  const dialogId = useId();

  const popoverStyle = usePopoverPosition(wrapperRef, popoverRef, open, () =>
    toValue(options.portal) ? 'fixed' : 'absolute',
  );

  // The theme of an ancestor does not reach a popover in the body (ADR 0026). The popover is a
  // new element each time it opens, so the watcher runs for each opening.
  watch(
    popoverRef,
    (node) => {
      if (!node || !toValue(options.portal)) return;
      const theme = wrapperRef.value?.closest('[data-theme]')?.getAttribute('data-theme');
      if (theme) node.setAttribute('data-theme', theme);
    },
    { flush: 'post' },
  );

  /** Close the popover, and give the focus back to the input when `returnFocus` is true. */
  function close(returnFocus: boolean): void {
    open.value = false;
    if (returnFocus) inputRef.value?.focus();
  }

  // Runs after the popover is in the DOM. Opening moves the focus into the calendar, on the
  // focused day; the listeners live while the popover is open.
  watch(
    open,
    (isOpen, _previous, onCleanup) => {
      if (!isOpen) return;
      popoverRef.value?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus();

      // A pointer down outside the input and the popover closes it. The popover can be in the
      // body, so it is not inside the wrapper.
      const onPointerDown = (event: Event) => {
        const target = event.target as Node;
        if (wrapperRef.value?.contains(target) || popoverRef.value?.contains(target)) return;
        open.value = false;
      };
      // Escape closes the popover from anywhere, even when a click left the focus on the page.
      // A calendar that used the key to leave its month or year view has already handled it.
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;
        event.preventDefault();
        close(true);
      };
      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      onCleanup(() => {
        document.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
      });
    },
    { flush: 'post' },
  );

  return { open, close, inputRef, wrapperRef, popoverRef, dialogId, popoverStyle, trapTab };
}

export type PickerPopover = ReturnType<typeof usePickerPopover>;