import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import {
  computed,
  shallowRef,
  toValue,
  watch,
  type CSSProperties,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

const GAP = 4;
const VIEWPORT_PADDING = 8;

/**
 * Positions a popover under its anchor, flipping and shifting near viewport edges, and keeping it
 * positioned while the page scrolls or resizes. Returns the inline style with `position`, `top`
 * and `left`.
 */
export function usePopoverPosition(
  reference: Readonly<Ref<HTMLElement | null>>,
  floating: Readonly<Ref<HTMLElement | null>>,
  open: Readonly<Ref<boolean>>,
  strategy: MaybeRefOrGetter<'fixed' | 'absolute'>,
): Readonly<Ref<CSSProperties>> {
  const coordinates = shallowRef({ x: 0, y: 0 });

  watch(
    [reference, floating, open, () => toValue(strategy)],
    ([anchor, popover, isOpen, how], _previous, onCleanup) => {
      if (!isOpen || !anchor || !popover) return;
      let stale = false;
      const update = () => {
        void computePosition(anchor, popover, {
          placement: 'bottom-start',
          strategy: how,
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
        }).then(({ x, y }) => {
          if (!stale) coordinates.value = { x, y };
        });
      };
      const stop = autoUpdate(anchor, popover, update);
      onCleanup(() => {
        stale = true;
        stop();
      });
    },
    { flush: 'post', immediate: true },
  );

  return computed<CSSProperties>(() => ({
    position: toValue(strategy),
    left: `${coordinates.value.x}px`,
    top: `${coordinates.value.y}px`,
  }));
}