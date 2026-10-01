import * as React from 'react';
import { flushSync } from 'react-dom';
import { render, fireEvent, act } from '@testing-library/react';
import { Field } from '@fluentui/react-field';
import { Checkbox } from './Checkbox';
import { isConformant } from '../../testing/isConformant';
import { resetIdsForTests } from '@fluentui/react-utilities';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import type { CheckboxOnChangeData } from './Checkbox.types';

// TODO: add more tests here, and create visual regression tests in /apps/vr-tests

describe('Checkbox', () => {
  beforeEach(() => {
    resetIdsForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  isConformant({
    Component: Checkbox,
    displayName: 'Checkbox',
    primarySlot: 'input',
    testOptions: {
      'has-static-classnames': [
        {
          props: { label: 'Test Label' },
        },
      ],
      'consistent-callback-args': {
        legacyCallbacks: ['onChange'],
      },
    },
  });

  it('renders a default state', () => {
    const renderedComponent = render(<Checkbox />);
    expect(renderedComponent.container).toMatchSnapshot();
  });

  it('renders with a label', () => {
    const renderedComponent = render(<Checkbox label="Unchecked Checkbox" />);
    expect(renderedComponent.container).toMatchSnapshot();
  });

  it('renders checked', () => {
    const renderedComponent = render(<Checkbox checked label="Checked Checkbox" />);
    expect(renderedComponent.container).toMatchSnapshot();
  });

  it('renders mixed', () => {
    const renderedComponent = render(<Checkbox checked="mixed" label="Mixed Checkbox" />);
    expect(renderedComponent.container).toMatchSnapshot();
  });

  it('renders a custom indicator', () => {
    const renderedComponent = render(<Checkbox indicator={<span id="indicator" />} label="Custom indicator" />);
    expect(renderedComponent.container).toMatchSnapshot();
  });

  it('respects id prop', () => {
    const renderedComponent = render(<Checkbox id="checkbox" label="Checkbox" />);
    expect(renderedComponent.getByRole('checkbox').id).toEqual('checkbox');
  });

  it('forwards ref to the input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    const renderedComponent = render(<Checkbox ref={ref} />);
    expect(ref.current).toBe(renderedComponent.getByRole('checkbox'));
  });

  it('defaults to unchecked non-mixed', () => {
    const renderedComponent = render(<Checkbox />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);
  });

  it('respects defaultChecked prop', () => {
    const renderedComponent = render(<Checkbox defaultChecked />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(false);
  });

  it('respects defaultChecked="mixed"', () => {
    const renderedComponent = render(<Checkbox defaultChecked="mixed" />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
  });

  it('ignores defaultChecked updates', () => {
    const renderedComponent = render(<Checkbox defaultChecked />);
    renderedComponent.rerender(<Checkbox defaultChecked={false} />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(false);
  });

  it('respects checked prop', () => {
    const renderedComponent = render(<Checkbox checked />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(false);
  });

  it('respects checked="mixed"', () => {
    const renderedComponent = render(<Checkbox checked="mixed" />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
  });

  it('respects checked updates', () => {
    const renderedComponent = render(<Checkbox checked />);
    renderedComponent.rerender(<Checkbox checked={false} />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);

    renderedComponent.rerender(<Checkbox checked="mixed" />);

    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
  });

  // Make sure that setting ref on the input slot doesn't break the
  // Checkbox's internal inputRef that's used to set indeterminate
  it('handles checked="mixed" when a ref is set on the input slot', () => {
    const inputRef = React.createRef<HTMLInputElement>();

    const renderedComponent = render(<Checkbox checked="mixed" input={{ ref: inputRef }} />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(inputRef.current).toBe(input);
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
  });

  it('calls onChange with the correct value', () => {
    const onChange = jest.fn<void, [React.FormEvent<HTMLInputElement>, CheckboxOnChangeData]>();

    const renderedComponent = render(<Checkbox onChange={onChange} />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    expect(onChange).toHaveBeenCalledTimes(0);

    fireEvent.click(input);
    fireEvent.click(input);
    fireEvent.click(input);

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange.mock.calls[0][1]).toEqual({ checked: true });
    expect(onChange.mock.calls[1][1]).toEqual({ checked: false });
    expect(onChange.mock.calls[2][1]).toEqual({ checked: true });
  });

  it('calls custom onChange passed via input slot prop', () => {
    const onChange = jest.fn();
    const slotOnChange = jest.fn();

    const renderedComponent = render(<Checkbox onChange={onChange} input={{ onChange: slotOnChange }} />);
    fireEvent.click(renderedComponent.getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(slotOnChange).toHaveBeenCalledTimes(1);
  });

  it('retains controlled mixed on native click without a state update', () => {
    const onChange = jest.fn();
    const rendered = render(<Checkbox checked="mixed" onChange={onChange} />);
    const input = rendered.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(input);
    expect(onChange.mock.calls[0][1]).toEqual({ checked: true });
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
  });

  for (const defaultChecked of [false, true, 'mixed'] as const) {
    it(`restores uncontrolled ${defaultChecked} after native form reset`, async () => {
      const onChange = jest.fn();
      const rendered = render(
        <form>
          <Checkbox defaultChecked={defaultChecked} onChange={onChange} />
          <input type="checkbox" defaultChecked aria-label="Native sibling" />
        </form>,
      );
      const input = rendered.getAllByRole('checkbox')[0] as HTMLInputElement;
      const sibling = rendered.getByLabelText('Native sibling') as HTMLInputElement;
      fireEvent.click(input);
      fireEvent.click(sibling);
      await act(async () => {
        input.form!.reset();
      });
      expect(input.checked).toBe(defaultChecked === true);
      expect(input.indeterminate).toBe(defaultChecked === 'mixed');
      expect(sibling.checked).toBe(true);
      expect(rendered.container.querySelector('.fui-Checkbox__indicator svg') !== null).toBe(defaultChecked !== false);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  }

  it('honors cancelation, external form ownership and controlled reset values', async () => {
    const rendered = render(
      <>
        <form id="owner" onReset={event => event.preventDefault()} />
        <form id="other" />
        <Checkbox form="owner" defaultChecked="mixed" label="Uncontrolled" />
        <Checkbox form="owner" checked="mixed" label="Controlled" />
      </>,
    );
    const uncontrolled = rendered.getByLabelText('Uncontrolled') as HTMLInputElement;
    const controlled = rendered.getByLabelText('Controlled') as HTMLInputElement;
    fireEvent.click(uncontrolled);
    await act(async () => {
      uncontrolled.form!.reset();
    });
    expect(uncontrolled.checked).toBe(true);
    expect(uncontrolled.indeterminate).toBe(false);
    rendered.rerender(
      <>
        <form id="owner" />
        <form id="other" />
        <Checkbox form="owner" defaultChecked={false} label="Uncontrolled" />
        <Checkbox form="owner" checked={true} label="Controlled" />
      </>,
    );
    await act(async () => {
      (rendered.container.querySelector('#other') as HTMLFormElement).reset();
    });
    expect(uncontrolled.checked).toBe(true);
    await act(async () => {
      uncontrolled.form!.reset();
    });
    expect(uncontrolled.checked).toBe(false);
    expect(uncontrolled.indeterminate).toBe(true);
    expect(controlled.checked).toBe(true);
    expect(controlled.indeterminate).toBe(false);
  });

  for (const checked of [false, true, 'mixed'] as const) {
    it(`preserves controlled ${checked} on native reset after a prop transition`, async () => {
      const rendered = render(
        <form>
          <Checkbox checked={!checked} />
        </form>,
      );
      rendered.rerender(
        <form>
          <Checkbox checked={checked} />
        </form>,
      );
      const input = rendered.getByRole('checkbox') as HTMLInputElement;
      await act(async () => {
        input.form!.reset();
      });
      expect(input.checked).toBe(checked === true);
      expect(input.indeterminate).toBe(checked === 'mixed');
    });
  }

  it('handles stopped reset propagation and does not update an unmounted input', async () => {
    const rendered = render(
      <form onReset={event => event.stopPropagation()}>
        <Checkbox defaultChecked="mixed" />
      </form>,
    );
    const input = rendered.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(input);
    await act(async () => {
      input.form!.reset();
    });
    expect(input.indeterminate).toBe(true);
    fireEvent.click(input);
    await act(async () => {
      input.form!.reset();
      rendered.unmount();
    });
    expect(input.indeterminate).toBe(false);
  });

  for (const checked of [false, true, 'mixed'] as const) {
    it(`reads latest controlled ${checked} during queued reset correction with a stable listener`, async () => {
      const onChange = jest.fn();
      const rendered = render(<></>);
      const doc = rendered.container.ownerDocument;
      const add = jest.spyOn(doc, 'addEventListener');
      const remove = jest.spyOn(doc, 'removeEventListener');
      rendered.rerender(
        <form>
          <Checkbox checked={checked === true ? 'mixed' : true} onChange={onChange} />
        </form>,
      );
      const input = rendered.getByRole('checkbox') as HTMLInputElement;
      const registrations = () => add.mock.calls.filter(call => call[0] === 'reset');
      const removals = () => remove.mock.calls.filter(call => call[0] === 'reset');
      const original = registrations()[0];
      await act(async () => {
        input.form!.reset();
        flushSync(() =>
          rendered.rerender(
            <form>
              <Checkbox checked={checked} onChange={onChange} />
            </form>,
          ),
        );
        expect(registrations()).toEqual([original]);
        expect(removals()).toHaveLength(0);
      });
      expect(input.checked).toBe(checked === true);
      expect(input.indeterminate).toBe(checked === 'mixed');
      expect(onChange).not.toHaveBeenCalled();
      rendered.unmount();
      expect(removals()).toEqual([original]);
      add.mockRestore();
      remove.mockRestore();
    });
  }

  for (const refSlot of ['forwarded', 'input'] as const) {
    for (const checked of [false, true, 'mixed'] as const) {
      it(`preserves queued controlled ${checked} with changing inline ${refSlot} refs`, async () => {
        const notifications = jest.fn();
        const onChange = jest.fn();
        const rendered = render(<></>);
        const doc = rendered.container.ownerDocument;
        const add = jest.spyOn(doc, 'addEventListener');
        const remove = jest.spyOn(doc, 'removeEventListener');
        const content = (value: boolean | 'mixed', revision: number) => {
          const ref = (node: HTMLInputElement | null) => notifications(revision, node);
          return (
            <form>
              <Checkbox
                checked={value}
                onChange={onChange}
                ref={refSlot === 'forwarded' ? ref : undefined}
                input={refSlot === 'input' ? { ref } : undefined}
              />
            </form>
          );
        };
        rendered.rerender(content(checked === true ? 'mixed' : true, 0));
        const input = rendered.getByRole('checkbox') as HTMLInputElement;
        const registrations = () => add.mock.calls.filter(call => call[0] === 'reset' && call[2] === true);
        const removals = () => remove.mock.calls.filter(call => call[0] === 'reset' && call[2] === true);
        const original = registrations()[0];
        expect(notifications.mock.calls).toEqual([[0, input]]);
        await act(async () => {
          input.form!.reset();
          flushSync(() => rendered.rerender(content(checked, 1)));
          expect(notifications.mock.calls).toEqual([
            [0, input],
            [0, null],
            [1, input],
          ]);
          expect(registrations()).toEqual([original]);
          expect(removals()).toHaveLength(0);
        });
        expect(input.checked).toBe(checked === true);
        expect(input.indeterminate).toBe(checked === 'mixed');
        expect(onChange).not.toHaveBeenCalled();
        await act(async () => {
          input.form!.reset();
          rendered.unmount();
          expect(notifications.mock.calls).toEqual([
            [0, input],
            [0, null],
            [1, input],
            [1, null],
          ]);
          expect(removals()).toEqual([original]);
          const checkedWrites = jest.spyOn(input, 'checked', 'set');
          const mixedWrites = jest.spyOn(input, 'indeterminate', 'set');
          await Promise.resolve();
          expect(checkedWrites).not.toHaveBeenCalled();
          expect(mixedWrites).not.toHaveBeenCalled();
        });
        expect(onChange).not.toHaveBeenCalled();
      });
    }

    it(`restores pending uncontrolled reset with changing inline ${refSlot} refs and default props`, async () => {
      const notifications = jest.fn();
      const onChange = jest.fn();
      const content = (revision: number) => {
        const ref = (node: HTMLInputElement | null) => notifications(revision, node);
        return (
          <form>
            <Checkbox
              defaultChecked={revision === 0 ? 'mixed' : true}
              onChange={onChange}
              ref={refSlot === 'forwarded' ? ref : undefined}
              input={refSlot === 'input' ? { ref } : undefined}
            />
          </form>
        );
      };
      const rendered = render(content(0));
      const input = rendered.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(input);
      await act(async () => {
        input.form!.reset();
        flushSync(() => rendered.rerender(content(1)));
      });
      expect(input.checked).toBe(false);
      expect(input.indeterminate).toBe(true);
      expect(notifications.mock.calls).toEqual([
        [0, input],
        [0, null],
        [1, input],
      ]);
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  }

  it('follows replacement input nodes without correcting the detached reset target', async () => {
    const notifications = jest.fn();
    const rendered = render(<></>);
    const doc = rendered.container.ownerDocument;
    const add = jest.spyOn(doc, 'addEventListener');
    const remove = jest.spyOn(doc, 'removeEventListener');
    const content = (revision: number) => {
      const renderRoot: SlotRenderFunction<React.ComponentProps<'span'>> = (Component, props) => (
        <Component key={revision} {...props} />
      );
      return (
        <form>
          <Checkbox defaultChecked="mixed" ref={notifications} root={{ children: renderRoot }} />
        </form>
      );
    };
    rendered.rerender(content(0));
    const original = rendered.getByRole('checkbox') as HTMLInputElement;
    const registrations = () => add.mock.calls.filter(call => call[0] === 'reset' && call[2] === true);
    const removals = () => remove.mock.calls.filter(call => call[0] === 'reset' && call[2] === true);
    const listener = registrations()[0];
    fireEvent.click(original);
    await act(async () => original.form!.reset());
    expect(original.indeterminate).toBe(true);
    let checkedWrites: jest.SpyInstance;
    let mixedWrites: jest.SpyInstance;
    await act(async () => {
      original.form!.reset();
      flushSync(() => rendered.rerender(content(1)));
      checkedWrites = jest.spyOn(original, 'checked', 'set');
      mixedWrites = jest.spyOn(original, 'indeterminate', 'set');
    });
    const replacement = rendered.getByRole('checkbox') as HTMLInputElement;
    expect(replacement).not.toBe(original);
    expect(replacement.indeterminate).toBe(true);
    expect(checkedWrites!).not.toHaveBeenCalled();
    expect(mixedWrites!).not.toHaveBeenCalled();
    expect(notifications.mock.calls).toEqual([[original], [null], [replacement]]);
    expect(registrations()).toEqual([listener]);
    expect(removals()).toHaveLength(0);
    fireEvent.click(replacement);
    await act(async () => replacement.form!.reset());
    expect(replacement.checked).toBe(false);
    expect(replacement.indeterminate).toBe(true);
    rendered.unmount();
    expect(removals()).toEqual([listener]);
    expect(notifications).toHaveBeenLastCalledWith(null);
  });

  it('restores the initial uncontrolled baseline after reset and a same-tick state update', async () => {
    const onChange = jest.fn();
    const rendered = render(
      <form>
        <Checkbox defaultChecked="mixed" onChange={onChange} />
      </form>,
    );
    const input = rendered.getByRole('checkbox') as HTMLInputElement;
    await act(async () => {
      input.form!.reset();
      flushSync(() => fireEvent.click(input));
      expect(input.indeterminate).toBe(false);
    });
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
    expect(rendered.container.querySelector('.fui-Checkbox__indicator svg')).not.toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.click(input);
    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('does not write detached input properties or emit callbacks after queued reset unmount', async () => {
    const onChange = jest.fn();
    const rendered = render(
      <form>
        <Checkbox defaultChecked="mixed" onChange={onChange} />
      </form>,
    );
    const input = rendered.getByRole('checkbox') as HTMLInputElement;
    const form = input.form!;
    fireEvent.click(input);
    let detachedState: [boolean, boolean];
    await act(async () => {
      form.reset();
      rendered.unmount();
      detachedState = [input.checked, input.indeterminate];
    });
    expect([input.checked, input.indeterminate]).toEqual(detachedState!);
    expect(input.indeterminate).toBe(false);
    await act(async () => form.reset());
    expect([input.checked, input.indeterminate]).toEqual(detachedState!);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignores queued reset after the live form owner changes', async () => {
    const onChange = jest.fn();
    const content = (form: string) => (
      <>
        <form id="former-owner" />
        <form id="current-owner" />
        <Checkbox form={form} defaultChecked="mixed" onChange={onChange} />
      </>
    );
    const rendered = render(content('former-owner'));
    const input = rendered.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(input);
    await act(async () => {
      input.form!.reset();
      flushSync(() => rendered.rerender(content('current-owner')));
    });
    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(false);
    await act(async () => input.form!.reset());
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("doesn't remove controlled mixed when no onChange provided", () => {
    const renderedComponent = render(<Checkbox checked="mixed" />);
    const input = renderedComponent.getByRole('checkbox') as HTMLInputElement;
    expect(input.indeterminate).toEqual(true);

    fireEvent.change(input);

    expect(input.indeterminate).toEqual(true);
  });

  it('gets props from a surrounding Field', () => {
    const renderedComponent = render(
      <Field validationMessage="Test error message" required>
        <Checkbox label="Checkbox" />
      </Field>,
    );

    const checkbox = renderedComponent.getByRole('checkbox') as HTMLInputElement;
    const message = renderedComponent.getByText('Test error message');

    expect(checkbox.getAttribute('aria-describedby')).toEqual(message.id);
    expect(checkbox.getAttribute('aria-invalid')).toEqual('true');
    expect(checkbox.required).toBe(true);
  });

  it('is labelled by both the Field and Checkbox labels, if both are present', () => {
    const renderedComponent = render(
      <Field label="Field label">
        <Checkbox label="Checkbox label" />
      </Field>,
    );

    const fieldLabel = renderedComponent.getByText('Field label') as HTMLLabelElement;
    const checkboxLabel = renderedComponent.getByText('Checkbox label') as HTMLLabelElement;
    const checkbox = renderedComponent.getByRole('checkbox') as HTMLInputElement;

    // The checkbox should be labelled by both labels using htmlFor and not aria-labelledby
    expect(checkbox.id).toEqual(fieldLabel.htmlFor);
    expect(checkbox.id).toEqual(checkboxLabel.htmlFor);
    expect(checkbox.getAttribute('aria-labelledby')).toBeNull();
  });

  describe('Accessibility Tests', () => {
    it('renders the input slot (as input)', () => {
      const { container } = render(<Checkbox input={{ className: 'test' }} />);
      const inputElement = container.querySelector('.test');
      expect(inputElement?.tagName).toEqual('INPUT');
    });

    it('provides the input slot with a type of (checkbox)', () => {
      const { container } = render(<Checkbox input={{ className: 'test' }} />);
      const inputElement = container.querySelector('.test');
      expect(inputElement?.getAttribute('type')).toEqual('checkbox');
    });
  });
});
