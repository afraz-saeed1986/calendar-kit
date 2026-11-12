import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  type OnInit,
} from '@angular/core';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
} from '@floating-ui/dom';

export type PopoverDismissReason = 'outside' | 'escape';

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Turns an element into a popover anchored to another element:
 * `<div [calendrixPopover]="anchorElement" (dismiss)="close()">…</div>`.
 *
 * It moves the element to the end of `<body>` (unless `[portal]="false"`), keeps it next to the
 * anchor (flip, shift, size, auto update), keeps Tab inside it, moves the focus into it when it
 * opens, and emits `dismiss` for a press outside and for Escape. It never closes by itself and
 * never returns the focus: the owner does both (see ADR 0013).
 */
@Directive({
  selector: '[calendrixPopover]',
  host: {
    class: 'calendrix-popover',
    tabindex: '-1',
    '(keydown)': 'onKeydown($event)',
  },
})
export class CalendrixPopover implements OnInit {
  /** The element the popover is placed next to. A press inside it is not an outside press. */
  readonly anchor = input.required<HTMLElement>({ alias: 'calendrixPopover' });
  /** Move the popover to `<body>`. Default: true. */
  readonly portal = input(true);
  readonly placement = input<Placement>('bottom-start');
  readonly dismiss = output<PopoverDismissReason>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const target =
        this.element.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]') ?? this.element;
      target.focus();
    });
  }

  ngOnInit(): void {
    const element = this.element;
    const portaled = this.portal();
    if (portaled) this.document.body.appendChild(element);

    // Fixed positioning, so a scrolling ancestor of the anchor cannot clip or offset the popover.
    element.style.position = 'fixed';
    element.style.left = '0px';
    element.style.top = '0px';

    const anchor = this.anchor();
    const update = () => {
      void computePosition(anchor, element, {
        strategy: 'fixed',
        placement: this.placement(),
        middleware: [
          offset(4),
          flip(),
          shift({ padding: 8 }),
          size({
            padding: 8,
            apply: ({ availableHeight }) => {
              element.style.maxHeight = `${Math.max(120, Math.floor(availableHeight))}px`;
              element.style.overflowY = 'auto';
            },
          }),
        ],
      }).then(({ x, y }) => {
        element.style.left = `${Math.round(x)}px`;
        element.style.top = `${Math.round(y)}px`;
      });
    };
    const stopAutoUpdate = autoUpdate(anchor, element, update);

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target || element.contains(target) || anchor.contains(target)) return;
      this.dismiss.emit('outside');
    };
    this.document.addEventListener('pointerdown', onPointerDown, true);

    // Escape closes the popover from anywhere, even when a click left the focus on the page. A
    // layer inside that used the key first (the month or year view of the calendar) has already
    // called `preventDefault`.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      this.dismiss.emit('escape');
    };
    this.document.addEventListener('keydown', onKeyDown);

    this.destroyRef.onDestroy(() => {
      stopAutoUpdate();
      this.document.removeEventListener('pointerdown', onPointerDown, true);
      this.document.removeEventListener('keydown', onKeyDown);
      // Angular only removes the nodes it still finds in the host view, not an element we moved.
      if (portaled) element.remove();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {

    if (event.key !== 'Tab') return;

    const items = Array.from(this.element.querySelectorAll<HTMLElement>(TABBABLE));
    if (items.length === 0) {
      event.preventDefault();
      this.element.focus();
      return;
    }
    const first = items[0] as HTMLElement;
    const last = items[items.length - 1] as HTMLElement;
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || active === this.element)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
