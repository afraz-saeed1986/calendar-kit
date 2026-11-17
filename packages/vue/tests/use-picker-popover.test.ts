import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { usePickerPopover, type PickerPopover } from '../src/use-picker-popover';

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

function harness(portal = false) {
  let popover!: PickerPopover;
  const Harness = defineComponent({
    setup() {
      popover = usePickerPopover({ portal });
      return () =>
        h('div', [
          h('div', { ref: popover.wrapperRef, id: 'wrapper' }, [h('input', { ref: popover.inputRef })]),
          popover.open.value
            ? h(
                'div',
                {
                  ref: popover.popoverRef,
                  role: 'dialog',
                  id: popover.dialogId,
                  style: popover.popoverStyle.value,
                  tabindex: -1,
                  onKeydown: popover.trapTab,
                },
                [
                  h('div', { role: 'grid' }, [h('div', { id: 'cell', tabindex: 0 })]),
                  h('button', { id: 'last' }, 'last'),
                ],
              )
            : null,
        ]);
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, popover };
}

async function open(popover: PickerPopover) {
  popover.open.value = true;
  await nextTick();
  await flushPromises();
}

describe('usePickerPopover', () => {
  it('positions the popover with absolute strategy inside the page', async () => {
    const { wrapper, popover } = harness(false);
    await open(popover);
    expect(wrapper.get<HTMLElement>('[role="dialog"]').element.style.position).toBe('absolute');
  });

  it('positions the popover with fixed strategy when it is in a portal', async () => {
    const { wrapper, popover } = harness(true);
    await open(popover);
    expect(wrapper.get<HTMLElement>('[role="dialog"]').element.style.position).toBe('fixed');
  });

  it('moves the focus to the focused day when it opens', async () => {
    const { popover } = harness();
    await open(popover);
    expect(document.activeElement?.id).toBe('cell');
  });

  it('closes with Escape and gives the focus back to the input', async () => {
    const { wrapper, popover } = harness();
    await open(popover);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    await nextTick();
    expect(popover.open.value).toBe(false);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.get('input').element);
  });

  it('closes when the pointer goes down outside', async () => {
    const { popover } = harness();
    await open(popover);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(popover.open.value).toBe(false);
  });

  it('stays open when the pointer goes down inside the input or the popover', async () => {
    const { wrapper, popover } = harness();
    await open(popover);
    wrapper.get('input').element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    wrapper.get('#last').element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(popover.open.value).toBe(true);
  });

  it('wraps Tab around at the end of the popover', async () => {
    const { wrapper, popover } = harness();
    await open(popover);
    wrapper.get<HTMLElement>('#last').element.focus();
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Tab' });
    expect(document.activeElement?.id).toBe('cell');
  });
});