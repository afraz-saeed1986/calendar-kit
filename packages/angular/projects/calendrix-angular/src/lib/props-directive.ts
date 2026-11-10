import { DestroyRef, Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';
import type { AttributeValue, ElementProps } from '@calendrix/core';

type Handler = (event: Event) => void;

/** `aria-*` and `data-*` attributes keep a boolean as text ("true"); others are present or absent. */
const TEXT_ATTRIBUTE = /^(aria|data)-/;

/**
 * Applies what a prop getter of the core returns (`{ attrs, handlers }`) to an element:
 * the attributes, and the handlers as event listeners. Set `calendrixHandlers` to false to apply
 * only the attributes, when the component handles the events itself.
 */
@Directive({ selector: '[calendrixProps]' })
export class CalendrixPropsDirective {
  readonly props = input<ElementProps<object> | null | undefined>(undefined, {
    alias: 'calendrixProps',
  });
  readonly handlers = input(true, { alias: 'calendrixHandlers' });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private applied = new Set<string>();
  private latest: Record<string, Handler | undefined> = {};
  private readonly listeners = new Map<string, () => void>();

  constructor() {
    effect(() => {
      const props = this.props();
      this.applyAttributes(props?.attrs ?? {});

      // A listener is added once per event; it calls the newest handler.
      this.latest = this.handlers()
        ? ((props?.handlers ?? {}) as Record<string, Handler | undefined>)
        : {};
      for (const name of Object.keys(this.latest)) {
        if (this.listeners.has(name)) continue;
        this.listeners.set(
          name,
          this.renderer.listen(this.element, name, (event: Event) => this.latest[name]?.(event)),
        );
      }
    });

    inject(DestroyRef).onDestroy(() => {
      for (const stop of this.listeners.values()) stop();
    });
  }

  private applyAttributes(attrs: Record<string, AttributeValue>): void {
    const next = new Set<string>();
    for (const [name, value] of Object.entries(attrs)) {
      const asText = TEXT_ATTRIBUTE.test(name);
      if (value === undefined || (value === false && !asText)) continue;
      next.add(name);
      this.renderer.setAttribute(this.element, name, value === true && !asText ? '' : String(value));
    }
    for (const name of this.applied) {
      if (!next.has(name)) this.renderer.removeAttribute(this.element, name);
    }
    this.applied = next;
  }
}