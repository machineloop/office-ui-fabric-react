import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { Field } from '@fluentui/react-field';
import { getByRole } from '@testing-library/react';
import { computeAccessibleDescription, computeAccessibleName } from 'dom-accessibility-api';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { Input } from './Input';
import type { InputProps, InputSlots, InputState } from './Input.types';
import { inputClassNames } from './useInputStyles.styles';

const input = '[data-testid="input"]';
const root = `.${inputClassNames.root}`;
const before = `.${inputClassNames.contentBefore}`;
const after = `.${inputClassNames.contentAfter}`;
const sizes = ['small', 'medium', 'large'] as const;
const appearances = [
  'outline',
  'underline',
  'filled-darker',
  'filled-lighter',
  'filled-darker-shadow',
  'filled-lighter-shadow',
] as const;
const heights = { small: 24, medium: 32, large: 40 };
const fontSizes = { small: 12, medium: 14, large: 16 };

function render(props: InputProps = {}) {
  return mount(
    <FluentProvider theme={teamsLightTheme}>
      <button data-testid="before">Before</button>
      <Input aria-label="Entry" data-testid="input" {...props} />
      <button data-testid="after">After</button>
    </FluentProvider>,
  );
}

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

function nativeInput($input: JQuery<HTMLElement>) {
  const element = $input[0];
  expect(element.tagName).to.equal('INPUT');
  return element as HTMLInputElement;
}

function assertChange(args: unknown[], value: string, target: HTMLInputElement, nativeType = 'input') {
  expect(args).to.have.length(2);
  const event = args[0] as React.ChangeEvent<HTMLInputElement>;
  expect(event.type).to.equal('change');
  expect(event.target).to.equal(target);
  expect(event.nativeEvent.type).to.equal(nativeType);
  expect(args[1]).to.deep.equal({ value });
}

describe('Input browser scenarios', () => {
  it('defaults to a native text input inside an unlabelled inline wrapper', () => {
    render({ placeholder: 'Enter text' });
    cy.get(root).should('have.prop', 'tagName', 'SPAN').and('have.css', 'display', 'inline-flex');
    cy.get(root).should('not.have.attr', 'role');
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get(input).should('have.attr', 'type', 'text').and('have.value', '');
    cy.get(root).find(`${before}, ${after}`).should('not.exist');
    cy.get(root).should($root =>
      expect(getByRole($root[0], 'textbox', { name: 'Entry' })).to.equal($root.find(input)[0]),
    );
    cy.get(input).should('match', ':placeholder-shown').realClick();
    cy.realType('hello');
    cy.get(input).should('have.value', 'hello').and('not.match', ':placeholder-shown');
    cy.get(input).should('have.attr', 'placeholder', 'Enter text');
  });

  describe('Input edges and accessibility', () => {
    for (const appearance of appearances) {
      for (const size of sizes) {
        it(`disables native editing, focus and focus decoration for ${appearance}/${size}`, () => {
          const change = cy.stub().as('change');
          render({
            appearance,
            size,
            disabled: true,
            defaultValue: 'locked',
            onChange: change,
            contentBefore: '$',
            contentAfter: '.00',
          });
          cy.get(input).should('be.disabled').and('have.value', 'locked');
          cy.get('[data-testid="before"]').focus();
          cy.realPress('Tab');
          cy.get('[data-testid="after"]').should('be.focused');
          cy.realPress(['Shift', 'Tab']);
          cy.get('[data-testid="before"]').should('be.focused');
          cy.get(input).then($input => nativeInput($input).focus());
          cy.get(input).should('not.be.focused');
          cy.get(root).should('have.css', 'cursor', 'not-allowed');
          cy.get(input).should('have.css', 'color', rgb(teamsLightTheme.colorNeutralForegroundDisabled));
          cy.get(`${before}, ${after}`).should(
            'have.css',
            'color',
            rgb(teamsLightTheme.colorNeutralForegroundDisabled),
          );
          cy.get(root).should($root => {
            const view = $root[0].ownerDocument.defaultView!;
            expect(view.getComputedStyle($root[0], '::after').content).to.equal('none');
            expect(view.getComputedStyle($root[0]).borderBottomColor).to.equal(
              rgb(teamsLightTheme.colorNeutralStrokeDisabled),
            );
          });
          cy.get('@change').should('not.have.been.called');
        });
      }
    }

    it('keeps readonly text focusable and selectable but not editable or subject to required validation', () => {
      const change = cy.stub().as('change');
      render({ readOnly: true, required: true, defaultValue: 'copy me', onChange: change });
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(input).should('be.focused');
      cy.realPress(['Control', 'A']);
      cy.get(input).should($input => {
        expect(nativeInput($input).selectionStart).to.equal(0);
        expect(nativeInput($input).selectionEnd).to.equal(7);
        expect(nativeInput($input).willValidate).to.equal(false);
      });
      cy.realType('x');
      cy.realPress('Backspace');
      cy.get(input).should('have.value', 'copy me');
      cy.get('@change').should('not.have.been.called');
    });

    it('does not disable consumer action slots implicitly and follows their own native disabled state', () => {
      const click = cy.stub().as('action');
      render({
        disabled: true,
        contentBefore: <button onClick={click}>Prefix action</button>,
        contentAfter: <button disabled>Suffix action</button>,
      });
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.contains('button', 'Prefix action').should('be.focused');
      cy.realPress('Enter');
      cy.get('@action').should('have.been.calledOnce');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
    });

    it('tabs through named prefix action, input and suffix action in both directions', () => {
      const action = cy.stub().as('action');
      render({
        contentBefore: <button onClick={action}>Prefix action</button>,
        contentAfter: <button onClick={action}>Suffix action</button>,
      });
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.contains('button', 'Prefix action').should('be.focused');
      cy.realPress('Tab');
      cy.get(input).should('be.focused');
      cy.realPress('Tab');
      cy.contains('button', 'Suffix action').should('be.focused');
      cy.realPress('Space');
      cy.get('@action').should('have.been.calledOnce');
      cy.realPress(['Shift', 'Tab']);
      cy.get(input).should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.contains('button', 'Prefix action').should('be.focused');
    });

    it('preserves native caret movement, shift selection, insertion, delete and backspace', () => {
      render({ defaultValue: 'abcd' });
      cy.get(input).realClick();
      cy.realPress('Home');
      cy.realPress('ArrowRight');
      cy.realPress(['Shift', 'ArrowRight']);
      cy.realPress(['Shift', 'ArrowRight']);
      cy.get(input).should($input => {
        expect(nativeInput($input).selectionStart).to.equal(1);
        expect(nativeInput($input).selectionEnd).to.equal(3);
      });
      cy.realType('X');
      cy.get(input).should('have.value', 'aXd');
      cy.get(input).should($input => expect(nativeInput($input).selectionStart).to.equal(2));
      cy.realPress('Delete');
      cy.get(input).should('have.value', 'aX');
      cy.realPress('Backspace');
      cy.get(input).should('have.value', 'a');
      cy.realPress('Home');
      cy.realType('z');
      cy.get(input).should('have.value', 'za');
    });

    it('does not convert Escape or Enter into custom clear or multiline behavior', () => {
      const change = cy.stub().as('change');
      render({ defaultValue: 'keep', onChange: change });
      cy.get(input).realClick();
      cy.realPress('Escape');
      cy.realPress('Enter');
      cy.get(input).should('have.value', 'keep');
      cy.get('@change').should('not.have.been.called');
      cy.realPress('End');
      cy.realType('x');
      cy.get(input).should('have.value', 'keepx');
    });

    it('forwards native props to input and style/className to root with slot precedence', () => {
      render({
        id: 'top-id',
        title: 'Top title',
        name: 'top-name',
        autoComplete: 'given-name',
        autoCorrect: 'off',
        spellCheck: false,
        inputMode: 'text',
        className: 'consumer-root',
        style: { width: 320 },
        root: { title: 'Root title', id: 'root-slot' },
        input: {
          id: 'slot-id',
          name: 'slot-name',
          className: 'consumer-input',
          title: 'Slot title',
          size: 9,
          enterKeyHint: 'done',
        },
      });
      cy.get(root).should('have.class', 'consumer-root').and('have.attr', 'title', 'Root title');
      cy.get(root).should('have.attr', 'id', 'root-slot').and('have.css', 'width', '320px');
      cy.get(root).should('not.have.attr', 'name');
      cy.get(input).should('have.class', 'consumer-input').and('have.attr', 'id', 'slot-id');
      cy.get(input).should('have.attr', 'title', 'Slot title').and('have.attr', 'name', 'slot-name');
      cy.get(input).should('have.attr', 'autocomplete', 'given-name').and('have.attr', 'autocorrect', 'off');
      cy.get(input).should('have.attr', 'spellcheck', 'false').and('have.attr', 'inputmode', 'text');
      cy.get(input).should('have.attr', 'enterkeyhint', 'done').and('have.attr', 'size', '9');
      cy.get(input).should('not.have.class', 'consumer-root');
    });

    it('uses the forwarded input ref for focus and selection and separate refs for every other slot', () => {
      const inputRef = React.createRef<HTMLInputElement>();
      const rootRef = React.createRef<HTMLSpanElement>();
      const beforeRef = React.createRef<HTMLSpanElement>();
      const afterRef = React.createRef<HTMLSpanElement>();
      mount(
        <Input
          ref={inputRef}
          aria-label="Entry"
          data-testid="input"
          defaultValue="abcd"
          root={{ ref: rootRef }}
          contentBefore={{ ref: beforeRef, children: '$' }}
          contentAfter={{ ref: afterRef, children: '.00' }}
        />,
      );
      cy.get(input).then($input => {
        expect(inputRef.current).to.equal($input[0]);
        expect(rootRef.current).to.equal($input[0].parentElement);
        expect(beforeRef.current).to.equal(rootRef.current!.firstElementChild);
        expect(afterRef.current).to.equal(rootRef.current!.lastElementChild);
        inputRef.current!.focus();
        inputRef.current!.setSelectionRange(1, 3);
      });
      cy.get(input).should('be.focused');
      cy.realType('X');
      cy.get(input).should('have.value', 'aXd');
    });

    it('uses slot ref precedence rather than promising automatic ref merging', () => {
      const topRef = React.createRef<HTMLInputElement>();
      const slotRef = React.createRef<HTMLInputElement>();
      mount(<Input aria-label="Entry" data-testid="input" ref={topRef} input={{ ref: slotRef }} />);
      cy.get(input).then($input => {
        expect(slotRef.current).to.equal($input[0]);
        expect(topRef.current).to.equal(null);
        slotRef.current!.focus();
      });
      cy.get(input).should('be.focused');
    });

    it('bubbles input/key/focus events, uses slot native handlers and keeps the top-level onChange contract', () => {
      const change = cy.stub().as('change');
      const slotChange = cy.stub().as('slotChange');
      const topInput = cy.stub().as('topInput');
      const slotInput = cy.stub().as('slotInput');
      const rootInput = cy.stub().as('rootInput');
      const key = cy.stub().as('key');
      const focus = cy.stub().as('focus');
      const blur = cy.stub().as('blur');
      render({
        onChange: change,
        onInput: topInput,
        onKeyDown: event => key(event.key, event.currentTarget.tagName),
        onFocus: event => focus(event.currentTarget.tagName),
        onBlur: event => blur(event.currentTarget.tagName),
        root: { onInput: event => rootInput(event.currentTarget.tagName) },
        input: { onInput: event => slotInput(event.currentTarget.tagName), onChange: slotChange },
      });
      cy.get(input).realClick();
      cy.realType('x');
      cy.realPress('Tab');
      cy.get('@change').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { value: 'x' });
      cy.get('@slotChange').should('not.have.been.called');
      cy.get('@topInput').should('not.have.been.called');
      cy.get('@slotInput').should('have.been.calledOnceWithExactly', 'INPUT');
      cy.get('@rootInput').should('have.been.calledOnceWithExactly', 'SPAN');
      cy.get('@focus').should('have.been.calledOnceWithExactly', 'INPUT');
      cy.get('@blur').should('have.been.calledOnceWithExactly', 'INPUT');
      cy.get('@key').should('have.been.calledWithExactly', 'Tab', 'INPUT');
    });

    for (const type of ['text', 'search', 'tel', 'url', 'email', 'password'] as const) {
      it(`enforces applicable maxLength and native value sanitization for ${type} during real editing`, () => {
        render({ type, maxLength: 3, minLength: 2, placeholder: 'Entry' });
        cy.get(input).realClick();
        cy.realType('abcd');
        cy.get(input).should('have.value', 'abc');
        cy.get(input).should($input => {
          expect(nativeInput($input).maxLength).to.equal(3);
          expect(nativeInput($input).minLength).to.equal(2);
          expect(nativeInput($input).validity.tooLong).to.equal(false);
        });
        cy.realPress(['Control', 'A']);
        cy.realType('a');
        cy.get(input).should('have.value', 'a');
        cy.get(input).should($input => expect(nativeInput($input).validity.tooShort).to.equal(true));
        cy.realType('b');
        cy.get(input).should($input => expect(nativeInput($input).validity.tooShort).to.equal(false));
      });
    }

    for (const { type, invalid, valid } of [
      { type: 'email', invalid: 'not-email', valid: 'a@example.test' },
      { type: 'url', invalid: 'not-url', valid: 'https://example.test' },
    ] as const) {
      it(`blocks submit for a ${type} mismatch and submits after real correction`, () => {
        const submit = cy.stub().as('submit');
        const invalidEvent = cy.stub().as('invalid');
        mount(
          <form
            onSubmit={event => {
              event.preventDefault();
              submit();
            }}
          >
            <Input data-testid="input" aria-label="Entry" type={type} required input={{ onInvalid: invalidEvent }} />
            <button type="submit">Submit</button>
          </form>,
        );
        cy.contains('button', 'Submit').realClick();
        cy.get('@submit').should('not.have.been.called');
        cy.get(input).should($input => expect(nativeInput($input).validity.valueMissing).to.equal(true));
        cy.get(input).realClick();
        cy.realType(invalid);
        cy.contains('button', 'Submit').realClick();
        cy.get(input).should($input => expect(nativeInput($input).validity.typeMismatch).to.equal(true));
        cy.get('@submit').should('not.have.been.called');
        cy.get('@invalid').should('have.been.calledTwice');
        cy.get(input).realClick();
        cy.realPress(['Control', 'A']);
        cy.realType(valid);
        cy.realPress('Enter');
        cy.get('@submit').should('have.been.calledOnce');
        cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
      });
    }

    for (const multiple of [false, true]) {
      it(`applies multiple only to the email-list validation contract (${multiple})`, () => {
        render({ type: 'email', multiple });
        cy.get(input).realClick();
        cy.realType('a@example.test,b@example.test');
        cy.get(input).should($input => expect(nativeInput($input).validity.typeMismatch).to.equal(!multiple));
        cy.realPress(['Control', 'A']);
        cy.realType('a@example.test');
        cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
      });
    }

    it('enforces pattern for text with positive controls without confusing ARIA invalid with native validity', () => {
      render({ pattern: '[A-Z]{2}', required: true, 'aria-invalid': true });
      cy.get(input).realClick();
      cy.realType('a');
      cy.get(input).should($input => expect(nativeInput($input).validity.patternMismatch).to.equal(true));
      cy.realPress(['Control', 'A']);
      cy.realType('AB');
      cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
      cy.get(input).should('have.attr', 'aria-invalid', 'true');
    });

    it('forwards min/max/step to number, validates boundaries and preserves native arrow increment', () => {
      render({ type: 'number', min: 2, max: 6, step: 2 });
      cy.get(input).realClick();
      cy.realType('1');
      cy.get(input).should($input => expect(nativeInput($input).validity.rangeUnderflow).to.equal(true));
      cy.realPress(['Control', 'A']);
      cy.realType('3');
      cy.get(input).should($input => expect(nativeInput($input).validity.stepMismatch).to.equal(true));
      cy.realPress(['Control', 'A']);
      cy.realType('2');
      cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
      cy.realPress('ArrowUp');
      cy.get(input).should('have.value', '4');
      cy.realPress('ArrowDown');
      cy.get(input).should('have.value', '2');
      cy.realPress(['Control', 'A']);
      cy.realType('7');
      cy.get(input).should($input => expect(nativeInput($input).validity.rangeOverflow).to.equal(true));
      cy.realPress(['Control', 'A']);
      cy.realType('6');
      cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
    });

    const ranges = [
      {
        type: 'date',
        min: '2026-09-02',
        max: '2026-09-06',
        low: '2026-09-01',
        high: '2026-09-07',
        off: '2026-09-03',
        valid: '2026-09-04',
        step: 2,
      },
      {
        type: 'datetime-local',
        min: '2026-09-30T12:00',
        max: '2026-09-30T12:04',
        low: '2026-09-30T11:59',
        high: '2026-09-30T12:05',
        off: '2026-09-30T12:01',
        valid: '2026-09-30T12:02',
        step: 120,
      },
      {
        type: 'month',
        min: '2026-02',
        max: '2026-06',
        low: '2026-01',
        high: '2026-07',
        off: '2026-03',
        valid: '2026-04',
        step: 2,
      },
      {
        type: 'time',
        min: '12:00',
        max: '12:04',
        low: '11:59',
        high: '12:05',
        off: '12:01',
        valid: '12:02',
        step: 120,
      },
      {
        type: 'week',
        min: '2026-W02',
        max: '2026-W06',
        low: '2026-W01',
        high: '2026-W07',
        off: '2026-W03',
        valid: '2026-W04',
        step: 2,
      },
    ] as const;
    for (const { type, min, max, low, high, off, valid, step } of ranges) {
      it(`matches native ${type} constraint validation through the programmatic DOM API (not user entry)`, () => {
        const change = cy.stub().as('change');
        mount(
          <>
            <Input
              data-testid="input"
              aria-label="Entry"
              type={type}
              min={min}
              max={max}
              step={step}
              onChange={change}
            />
            <input data-testid="native" type={type} min={min} max={max} step={step} />
          </>,
        );
        cy.get(input).then($input => {
          const element = nativeInput($input);
          const control = element.ownerDocument.querySelector<HTMLInputElement>('[data-testid="native"]')!;
          for (const [value, flag] of [
            [low, 'rangeUnderflow'],
            [high, 'rangeOverflow'],
            [off, 'stepMismatch'],
            [valid, 'valid'],
            [min, 'valid'],
            [max, 'valid'],
          ] as const) {
            element.value = value;
            control.value = value;
            expect(element.value).to.equal(control.value).and.equal(value);
            expect(element.validity[flag], `${value}/${flag}`).to.equal(true);
            expect(element.checkValidity()).to.equal(control.checkValidity());
          }
        });
        cy.get('@change').should('not.have.been.called');
      });
    }

    it('submits only successful controls, including readonly but excluding disabled, and honors external form association', () => {
      const submit = cy.stub().as('submit');
      mount(
        <>
          <form
            id="external"
            onSubmit={event => {
              event.preventDefault();
              submit(Array.from(new FormData(event.currentTarget).entries()));
            }}
          >
            <button type="submit">Submit</button>
          </form>
          <Input form="external" name="editable" defaultValue="a" aria-label="Editable" />
          <Input form="external" name="readonly" defaultValue="b" readOnly aria-label="Readonly" />
          <Input form="external" name="disabled" defaultValue="c" disabled aria-label="Disabled" />
          <Input form="external" defaultValue="unnamed" aria-label="Unnamed" />
        </>,
      );
      cy.contains('button', 'Submit').realClick();
      cy.get('@submit').should('have.been.calledOnceWithExactly', [
        ['editable', 'a'],
        ['readonly', 'b'],
      ]);
    });

    it('compares native form reset with the internally controlled implementation without claiming initial-value reset support', () => {
      const change = cy.stub().as('change');
      mount(
        <form>
          <Input data-testid="input" aria-label="Entry" defaultValue="seed" onChange={change} />
          <input aria-label="Native" data-testid="native" defaultValue="seed" />
          <button type="reset">Reset</button>
        </form>,
      );
      cy.get(input).realClick();
      cy.realPress('End');
      cy.realType('x');
      cy.get('[data-testid="native"]').realClick();
      cy.realPress('End');
      cy.realType('x');
      cy.get(input).should('have.value', 'seedx');
      cy.get('[data-testid="native"]').should('have.value', 'seedx');
      cy.contains('button', 'Reset').realClick();
      cy.get('[data-testid="native"]').should('have.value', 'seed');
      cy.get(input).should('have.value', 'seedx');
      cy.get('@change').should('have.been.calledOnce');
    });

    for (const validationState of ['none', 'error', 'warning', 'success'] as const) {
      it(`wires Field name, merged descriptions, required and ${validationState} validation semantics`, () => {
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <span id="extra-description">Extra instructions</span>
            <Field
              label="Full name"
              hint="Helpful hint"
              validationMessage="Validation message"
              validationState={validationState}
              required
            >
              <Input data-testid="input" aria-describedby="extra-description" />
            </Field>
          </FluentProvider>,
        );
        cy.get(input).should($input => {
          const element = nativeInput($input);
          expect(computeAccessibleName(element)).to.equal('Full name');
          expect(computeAccessibleDescription(element)).to.equal('Validation message Helpful hint Extra instructions');
          expect(element.required).to.equal(true);
          expect(element.getAttribute('aria-invalid')).to.equal(validationState === 'error' ? 'true' : null);
          const label = element.ownerDocument.querySelector<HTMLLabelElement>('label')!;
          expect(label.htmlFor).to.equal(element.id);
          expect(element.getAttribute('aria-describedby')!.split(' ')).to.have.length(3);
          const message = element.ownerDocument.getElementById(
            element.getAttribute('aria-describedby')!.split(' ')[0],
          )!;
          expect(message.textContent).to.equal('Validation message');
          expect(message.getAttribute('role')).to.equal(
            validationState === 'error' || validationState === 'warning' ? 'alert' : null,
          );
        });
        cy.get('label').realClick();
        cy.get(input).should('be.focused');
      });
    }

    it('updates Field label, hint, validation, required and size without losing the value', () => {
      const Dynamic = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <FluentProvider theme={teamsLightTheme}>
            <Field
              label={updated ? 'New name' : 'Old name'}
              hint={updated ? 'New hint' : 'Old hint'}
              validationMessage={updated ? 'New error' : undefined}
              required={updated}
              size={updated ? 'large' : 'small'}
            >
              <Input data-testid="input" />
            </Field>
            <button onClick={() => setUpdated(!updated)}>Update</button>
          </FluentProvider>
        );
      };
      mount(<Dynamic />);
      cy.get(input).realClick();
      cy.realType('preserved');
      cy.get(root).should('have.css', 'min-height', '24px');
      cy.contains('button', 'Update').realClick();
      cy.get(input).should('have.value', 'preserved').and('have.attr', 'aria-invalid', 'true');
      cy.get(input).should($input => {
        const element = nativeInput($input);
        expect(computeAccessibleName(element)).to.equal('New name');
        expect(computeAccessibleDescription(element)).to.equal('New error New hint');
        expect(element.required).to.equal(true);
      });
      cy.get(root).should('have.css', 'min-height', '40px');
      cy.contains('button', 'Update').realClick();
      cy.get(input).should($input => {
        const element = nativeInput($input);
        expect(computeAccessibleName(element)).to.equal('Old name');
        expect(computeAccessibleDescription(element)).to.equal('Old hint');
        expect(element.required).to.equal(false);
        expect(element.hasAttribute('aria-invalid')).to.equal(false);
      });
      cy.get(input).should('have.value', 'preserved');
    });

    it('preserves consumer Field overrides and falls back to aria-labelledby for a custom id', () => {
      mount(
        <Field label="Field name" required validationMessage="Error" size="small">
          <Input data-testid="input" id="custom-id" required={false} aria-invalid={false} size="large" />
        </Field>,
      );
      cy.get(input).should('have.attr', 'id', 'custom-id').and('have.attr', 'aria-invalid', 'false');
      cy.get(input).should($input => {
        expect(computeAccessibleName($input[0])).to.equal('Field name');
        expect(nativeInput($input).required).to.equal(false);
        expect($input.attr('aria-labelledby')).to.be.a('string').and.not.equal('');
      });
      cy.get(root).should('have.css', 'min-height', '40px');
    });

    it('supports explicit labelledby prefix/suffix text and decorative content does not contaminate a native label', () => {
      mount(
        <>
          <label id="amount-label" htmlFor="amount">
            Amount
          </label>
          <Input
            id="amount"
            data-testid="input"
            aria-labelledby="amount-label currency units"
            contentBefore={{ id: 'currency', children: 'dollars' }}
            contentAfter={{ id: 'units', children: 'and cents' }}
            defaultValue="12"
          />
        </>,
      );
      cy.get(input).should($input => expect(computeAccessibleName($input[0])).to.equal('Amount dollars and cents'));
      cy.get('label').realClick();
      cy.get(input).should('be.focused').and('have.value', '12');
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      for (const size of sizes) {
        for (const content of ['none', 'before', 'after', 'both'] as const) {
          it(`keeps ${dir}/${size}/${content} geometry inside a narrow root and mirrors visual slots`, () => {
            mount(
              <FluentProvider theme={teamsLightTheme} dir={dir}>
                <Input
                  data-testid="input"
                  aria-label="Entry"
                  size={size}
                  style={{ width: 180 }}
                  defaultValue="Long text stays single-line and scrolls horizontally rather than wrapping"
                  contentBefore={content === 'before' || content === 'both' ? '$' : undefined}
                  contentAfter={content === 'after' || content === 'both' ? '.00' : undefined}
                />
              </FluentProvider>,
            );
            cy.get(root).should($root => {
              const bounds = $root[0].getBoundingClientRect();
              const entry = $root.find(input)[0].getBoundingClientRect();
              expect(bounds.width).to.equal(180);
              expect(bounds.height).to.equal(heights[size]);
              expect(entry.width).to.be.greaterThan(0);
              expect(entry.left).to.be.at.least(bounds.left);
              expect(entry.right).to.be.at.most(bounds.right);
              const view = $root[0].ownerDocument.defaultView!;
              const entryStyle = view.getComputedStyle($root.find(input)[0]);
              const rootStyle = view.getComputedStyle($root[0]);
              const combinedPadding =
                size === 'large'
                  ? `${
                      parseFloat(teamsLightTheme.spacingHorizontalM) +
                      parseFloat(teamsLightTheme.spacingHorizontalSNudge)
                    }px`
                  : size === 'small'
                  ? teamsLightTheme.spacingHorizontalS
                  : teamsLightTheme.spacingHorizontalM;
              const inputPadding =
                size === 'large' ? teamsLightTheme.spacingHorizontalSNudge : teamsLightTheme.spacingHorizontalXXS;
              const rootPadding =
                size === 'large'
                  ? teamsLightTheme.spacingHorizontalM
                  : size === 'small'
                  ? teamsLightTheme.spacingHorizontalSNudge
                  : teamsLightTheme.spacingHorizontalMNudge;
              const hasLeftSlot =
                dir === 'ltr' ? content === 'before' || content === 'both' : content === 'after' || content === 'both';
              const hasRightSlot =
                dir === 'ltr' ? content === 'after' || content === 'both' : content === 'before' || content === 'both';
              expect(entryStyle.paddingLeft).to.equal(hasLeftSlot ? inputPadding : combinedPadding);
              expect(entryStyle.paddingRight).to.equal(hasRightSlot ? inputPadding : combinedPadding);
              expect(rootStyle.paddingLeft).to.equal(hasLeftSlot ? rootPadding : '0px');
              expect(rootStyle.paddingRight).to.equal(hasRightSlot ? rootPadding : '0px');
              for (const selector of [before, after]) {
                const slot = $root.find(selector)[0];
                if (slot) {
                  const slotBounds = slot.getBoundingClientRect();
                  expect(slotBounds.left).to.be.at.least(bounds.left);
                  expect(slotBounds.right).to.be.at.most(bounds.right);
                  if ((selector === before) === (dir === 'ltr')) {
                    expect(slotBounds.right).to.be.at.most(entry.left);
                  } else {
                    expect(slotBounds.left).to.be.at.least(entry.right);
                  }
                }
              }
              expect(nativeInput($root.find(input)).scrollWidth).to.be.greaterThan(
                nativeInput($root.find(input)).clientWidth,
              );
            });
            cy.get(input).realClick();
            cy.realPress('End');
            cy.realType('x');
            cy.get(input).should(
              'have.value',
              'Long text stays single-line and scrolls horizontally rather than wrappingx',
            );
          });
        }
      }
    }

    for (const appearance of appearances) {
      it(`updates ${appearance} from light to dark theme without remounting or losing editing state`, () => {
        const ThemeSwitch = () => {
          const [dark, setDark] = React.useState(false);
          return (
            <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme}>
              <Input data-testid="input" aria-label="Entry" appearance={appearance} />
              <button onClick={() => setDark(!dark)}>Theme</button>
            </FluentProvider>
          );
        };
        mount(<ThemeSwitch />);
        cy.get(input).should('have.css', 'color', rgb(teamsLightTheme.colorNeutralForeground1)).realClick();
        cy.realType('keep');
        cy.get(input).then($input => {
          const original = $input[0];
          cy.contains('button', 'Theme').realClick();
          cy.get(input).should($next => expect($next[0]).to.equal(original));
        });
        cy.get(input)
          .should('have.value', 'keep')
          .and('have.css', 'color', rgb(teamsDarkTheme.colorNeutralForeground1));
        cy.get(root).should(
          'have.css',
          'background-color',
          appearance === 'underline'
            ? 'rgba(0, 0, 0, 0)'
            : rgb(
                appearance.startsWith('filled-darker')
                  ? teamsDarkTheme.colorNeutralBackground3
                  : teamsDarkTheme.colorNeutralBackground1,
              ),
        );
        cy.get(input).realClick();
        cy.realPress('End');
        cy.realType('x');
        cy.get(input).should('have.value', 'keepx');
      });
    }
  });

  for (const appearance of appearances) {
    for (const size of sizes) {
      it(`edits and renders ${appearance}/${size} with native focus and size geometry`, () => {
        render({ appearance, size });
        cy.get(root).should($root => {
          const style = $root[0].ownerDocument.defaultView!.getComputedStyle($root[0]);
          expect($root[0].getBoundingClientRect().height).to.equal(heights[size]);
          expect(style.fontSize).to.equal(`${fontSizes[size]}px`);
          expect(style.borderTopStyle).to.equal(appearance === 'underline' ? 'none' : 'solid');
          expect(style.borderRadius).to.equal(appearance === 'underline' ? '0px' : teamsLightTheme.borderRadiusMedium);
          expect(style.backgroundColor).to.equal(
            appearance === 'underline'
              ? 'rgba(0, 0, 0, 0)'
              : rgb(
                  appearance.startsWith('filled-darker')
                    ? teamsLightTheme.colorNeutralBackground3
                    : teamsLightTheme.colorNeutralBackground1,
                ),
          );
          expect(style.boxShadow === 'none').to.equal(!appearance.endsWith('-shadow'));
        });
        cy.get('[data-testid="before"]').focus();
        cy.realPress('Tab');
        cy.get(input).should('be.focused');
        cy.realType('ab');
        cy.get(input).should('have.value', 'ab');
        cy.get(root).should($root => {
          const style = $root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after');
          expect(style.borderBottomWidth).to.equal('2px');
          expect(style.borderBottomColor).to.equal(rgb(teamsLightTheme.colorCompoundBrandStroke));
          expect(style.transform).to.equal('matrix(1, 0, 0, 1, 0, 0)');
        });
        cy.realPress('Tab');
        cy.get('[data-testid="after"]').should('be.focused');
        cy.get(root).should($root => {
          expect($root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after').transform).to.equal(
            'matrix(0, 0, 0, 1, 0, 0)',
          );
        });
      });
    }
  }

  const types: {
    type: NonNullable<InputProps['type']>;
    value: string;
    role?: 'textbox' | 'searchbox' | 'spinbutton';
  }[] = [
    { type: 'text', value: 'plain', role: 'textbox' },
    { type: 'email', value: 'a@example.test', role: 'textbox' },
    { type: 'password', value: 'secret' },
    { type: 'search', value: 'find', role: 'searchbox' },
    { type: 'tel', value: '+1 555 0100', role: 'textbox' },
    { type: 'url', value: 'https://example.test', role: 'textbox' },
    { type: 'date', value: '2026-09-30' },
    { type: 'datetime-local', value: '2026-09-30T12:30' },
    { type: 'month', value: '2026-09' },
    { type: 'number', value: '12', role: 'spinbutton' },
    { type: 'time', value: '12:30' },
    { type: 'week', value: '2026-W40' },
  ];
  for (const { type, value, role } of types) {
    it(`forwards the supported ${type} type, valid value and native form serialization`, () => {
      const submit = cy.stub().as('submit');
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <form
            onSubmit={event => {
              event.preventDefault();
              submit(Array.from(new FormData(event.currentTarget).entries()));
            }}
          >
            <Input data-testid="input" aria-label="Entry" type={type} defaultValue={value} name="entry" />
            <button type="submit">Submit</button>
          </form>
        </FluentProvider>,
      );
      cy.get(input).should('have.attr', 'type', type).and('have.value', value);
      cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
      if (role) {
        cy.get('form').should($form =>
          expect(getByRole($form[0], role, { name: 'Entry' })).to.equal($form.find(input)[0]),
        );
      }
      cy.contains('button', 'Submit').realClick();
      cy.get('@submit').should('have.been.calledOnceWithExactly', [['entry', value]]);
    });
  }

  it('reports exact real input payloads without an extra change on blur', () => {
    const change = cy.stub().as('change');
    const native = cy.stub().as('native');
    render({ onChange: change, onInput: event => native(event.type, event.currentTarget.value) });
    cy.get(input).realClick();
    cy.realType('ab');
    cy.get(input)
      .should('have.value', 'ab')
      .then($input => {
        expect(change.callCount).to.equal(2);
        assertChange(change.getCall(0).args, 'a', nativeInput($input));
        assertChange(change.getCall(1).args, 'ab', nativeInput($input));
        expect(native.args).to.deep.equal([
          ['input', 'a'],
          ['input', 'ab'],
        ]);
      });
    cy.realPress('Tab');
    cy.get('@change').should('have.been.calledTwice');
  });

  it('retains a fixed controlled value while reporting proposed edits', () => {
    const change = cy.stub().as('change');
    render({ value: 'fixed', onChange: change });
    cy.get(input).realClick();
    cy.realPress('End');
    cy.realType('x');
    cy.get(input)
      .should('have.value', 'fixed')
      .then($input => assertChange(change.firstCall.args, 'fixedx', nativeInput($input)));
    cy.get('@change').should('have.been.calledOnce');
  });

  it('accepts controlled updates and enforces the story limit with a boundary positive control', () => {
    const change = cy.stub().as('change');
    const Controlled = () => {
      const [value, setValue] = React.useState('1234567890123456789');
      return (
        <Input
          data-testid="input"
          aria-label="Entry"
          value={value}
          onChange={(event, data) => {
            change(event, data);
            if (data.value.length <= 20) {
              setValue(data.value);
            }
          }}
        />
      );
    };
    mount(<Controlled />);
    cy.get(input).realClick();
    cy.realPress('End');
    cy.realType('0');
    cy.get(input).should('have.value', '12345678901234567890');
    cy.realType('x');
    cy.get(input).should('have.value', '12345678901234567890');
    cy.get('@change').its('lastCall.args.1').should('deep.equal', { value: '12345678901234567890x' });
    cy.realPress('Backspace');
    cy.get(input).should('have.value', '1234567890123456789');
  });

  it('keeps an uncontrolled default while typing and clearing reports the empty value', () => {
    const change = cy.stub().as('change');
    render({ defaultValue: 'seed', onChange: change });
    cy.get(input).should('have.value', 'seed').realClick();
    cy.realPress('End');
    cy.realType('x');
    cy.get(input).should('have.value', 'seedx');
    cy.realPress(['Control', 'A']);
    cy.realPress('Backspace');
    cy.get(input).should('have.value', '');
    cy.get('@change').should('have.been.calledTwice').its('lastCall.args.1').should('deep.equal', { value: '' });
  });

  it('renders prefix and suffix as siblings, not part of the edited or submitted value', () => {
    const submit = cy.stub().as('submit');
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <form
          onSubmit={event => {
            event.preventDefault();
            submit(new FormData(event.currentTarget).get('amount'));
          }}
        >
          <Input
            data-testid="input"
            aria-label="Entry"
            name="amount"
            defaultValue="12"
            contentBefore="$"
            contentAfter=".00"
          />
          <button type="submit">Submit</button>
        </form>
      </FluentProvider>,
    );
    cy.get(root)
      .children()
      .should($children => {
        expect(Array.from($children, child => child.classList.contains(inputClassNames.input))).to.deep.equal([
          false,
          true,
          false,
        ]);
      });
    cy.get(before).should('have.text', '$');
    cy.get(after).should('have.text', '.00');
    cy.get(root).should($root =>
      expect(getByRole($root[0], 'textbox', { name: 'Entry' })).to.equal($root.find(input)[0]),
    );
    cy.get(input).realClick();
    cy.realPress('End');
    cy.realType('3');
    cy.get(input).should('have.value', '123');
    cy.contains('button', 'Submit').realClick();
    cy.get('@submit').should('have.been.calledOnceWithExactly', '123');
  });

  it('supports inline paragraph placement without turning the wrapper into a label', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <p>
          Inline <Input data-testid="input" aria-label="Inline" contentBefore="Prefix" />
        </p>
        <button data-testid="other">Other</button>
      </FluentProvider>,
    );
    cy.get('p').find(root).should('have.prop', 'tagName', 'SPAN');
    cy.get('[data-testid="other"]').focus();
    cy.get(before).realClick();
    cy.get(input).should('not.be.focused');
    cy.get(input).realClick().should('be.focused');
  });

  it('keeps password masking native and exposes no built-in reveal or clear control', () => {
    render({ type: 'password', autoComplete: 'current-password', defaultValue: 'secret' });
    cy.get(input).should('have.attr', 'autocomplete', 'current-password').realClick();
    cy.realPress('End');
    cy.realType('x');
    cy.get(input).should('have.value', 'secretx').and('have.attr', 'type', 'password');
    cy.get(input).should($input => {
      expect(
        $input[0].ownerDocument.defaultView!.getComputedStyle($input[0]).getPropertyValue('-webkit-text-security'),
      ).to.equal('disc');
    });
    cy.get(root).find('button').should('not.exist');
  });
});

describe('Input unit and source-derived boundaries', () => {
  for (const { name, value, rendered } of [
    { name: 'empty', value: '', rendered: '' },
    { name: 'zero string', value: '0', rendered: '0' },
    { name: 'whitespace', value: '  ', rendered: '  ' },
    { name: 'unicode', value: '日本語 café 😀', rendered: '日本語 café 😀' },
    { name: 'native newline sanitization', value: 'a\nb\rc', rendered: 'abc' },
  ]) {
    for (const controlled of [false, true]) {
      it(`preserves ${name} with ${controlled ? 'value' : 'defaultValue'} without firing a user change`, () => {
        const change = cy.stub().as('change');
        render({ ...(controlled ? { value } : { defaultValue: value }), onChange: change });
        cy.get(input).should('have.value', rendered);
        cy.get('@change').should('not.have.been.called');
      });
    }
  }

  it('matches the unit-defined value precedence when both value props are supplied', () => {
    const change = cy.stub().as('change');
    render({ value: 'controlled', defaultValue: 'default', onChange: change });
    cy.get(input).should('have.value', 'controlled').realClick();
    cy.realPress('End');
    cy.realType('x');
    cy.get(input).should('have.value', 'controlled');
    cy.get('@change')
      .should('have.been.calledOnce')
      .its('firstCall.args.1')
      .should('deep.equal', { value: 'controlledx' });
  });

  for (const controlled of [false, true]) {
    it(`rerenders ${
      controlled ? 'controlled' : 'uncontrolled'
    } values and uses only the latest change/input handlers`, () => {
      const firstChange = cy.stub().as('firstChange');
      const nextChange = cy.stub().as('nextChange');
      const firstInput = cy.stub().as('firstInput');
      const nextInput = cy.stub().as('nextInput');
      const Dynamic = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <Input
              data-testid="input"
              aria-label="Entry"
              {...(controlled ? { value: updated ? 'new' : 'old' } : { defaultValue: updated ? 'new' : 'old' })}
              onChange={updated ? nextChange : firstChange}
              onInput={updated ? nextInput : firstInput}
            />
            <button onClick={() => setUpdated(true)}>Update</button>
          </>
        );
      };
      mount(<Dynamic />);
      cy.get(input).realClick();
      cy.realPress('End');
      cy.realType('x');
      cy.get(input).should('have.value', controlled ? 'old' : 'oldx');
      cy.contains('button', 'Update').realClick();
      cy.get(input).should('have.value', controlled ? 'new' : 'oldx');
      cy.get('@firstChange').should('have.been.calledOnce');
      cy.get('@nextChange').should('not.have.been.called');
      cy.get(input).realClick();
      cy.realPress('End');
      cy.realType('y');
      cy.get(input).should('have.value', controlled ? 'new' : 'oldxy');
      cy.get('@firstChange').should('have.been.calledOnce');
      cy.get('@firstInput').should('have.been.calledOnce');
      cy.get('@nextChange')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { value: controlled ? 'newy' : 'oldxy' });
      cy.get('@nextInput').should('have.been.calledOnce');
    });
  }

  it('does not report any change for controlled prop updates, including empty and Unicode values', () => {
    const change = cy.stub().as('change');
    const Dynamic = () => {
      const [value, setValue] = React.useState('old');
      return (
        <>
          <Input data-testid="input" aria-label="Entry" value={value} onChange={change} />
          <button onClick={() => setValue('')}>Empty</button>
          <button onClick={() => setValue('日本語')}>Unicode</button>
        </>
      );
    };
    mount(<Dynamic />);
    cy.contains('button', 'Empty').realClick();
    cy.get(input).should('have.value', '');
    cy.contains('button', 'Unicode').realClick();
    cy.get(input).should('have.value', '日本語');
    cy.get('@change').should('not.have.been.called');
  });

  it('removes handlers on rerender while retaining uncontrolled editing', () => {
    const change = cy.stub().as('change');
    const Dynamic = () => {
      const [listening, setListening] = React.useState(true);
      return (
        <>
          <Input data-testid="input" aria-label="Entry" onChange={listening ? change : undefined} />
          <button onClick={() => setListening(false)}>Remove handler</button>
        </>
      );
    };
    mount(<Dynamic />);
    cy.get(input).realClick();
    cy.realType('a');
    cy.contains('button', 'Remove handler').realClick();
    cy.get(input).realClick();
    cy.realPress('End');
    cy.realType('b');
    cy.get(input).should('have.value', 'ab');
    cy.get('@change').should('have.been.calledOnce');
  });

  for (const { name, content, text, present } of [
    { name: 'undefined', content: undefined, text: '', present: false },
    { name: 'null', content: null, text: '', present: false },
    { name: 'empty string', content: '', text: '', present: true },
    { name: 'zero', content: 0, text: '0', present: true },
    { name: 'empty fragment', content: <></>, text: '', present: true },
    { name: 'element', content: <em>Prefix</em>, text: 'Prefix', present: true },
  ]) {
    it(`renders both optional slot presence boundaries for ${name}`, () => {
      render({ contentBefore: content, contentAfter: content });
      if (present) {
        cy.get(before).should('have.text', text);
        cy.get(after).should('have.text', text);
        cy.get(root).children().should('have.length', 3);
      } else {
        cy.get(before).should('not.exist');
        cy.get(after).should('not.exist');
        cy.get(root).children().should('have.length', 1);
      }
      cy.get(input).realClick();
      cy.realType('x');
      cy.get(input).should('have.value', 'x');
    });
  }

  it('passes styled props through custom slot render functions without replacing native input behavior', () => {
    const renderRoot: SlotRenderFunction<ExtractSlotProps<InputSlots['root']>> = (Component, props) => (
      <Component {...props} title="custom-root" />
    );
    const renderBefore: SlotRenderFunction<ExtractSlotProps<InputSlots['contentBefore']>> = (Component, props) => (
      <Component {...props}>Before</Component>
    );
    const renderAfter: SlotRenderFunction<ExtractSlotProps<InputSlots['contentAfter']>> = (Component, props) => (
      <Component {...props}>After</Component>
    );
    render({
      root: { children: renderRoot },
      input: { title: 'custom-input' },
      contentBefore: { children: renderBefore },
      contentAfter: { children: renderAfter },
    });
    cy.get(root).should('have.attr', 'title', 'custom-root');
    cy.get(input).should('have.attr', 'title', 'custom-input').and('have.class', inputClassNames.input);
    cy.get(before).should('have.text', 'Before');
    cy.get(after).should('have.text', 'After');
    cy.get(input).realClick();
    cy.realType('x');
    cy.get(input).should('have.value', 'x');
  });

  it('adds and removes slots, disabled and readonly on the same input without losing the value or handlers', () => {
    const change = cy.stub().as('change');
    const Dynamic = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <Input
            data-testid="input"
            aria-label="Entry"
            disabled={phase === 1}
            readOnly={phase === 2}
            contentBefore={phase === 1 ? '$' : undefined}
            contentAfter={phase === 2 ? '.00' : undefined}
            onChange={change}
          />
          <button onClick={() => setPhase((phase + 1) % 3)}>Next</button>
        </>
      );
    };
    mount(<Dynamic />);
    cy.get(input).realClick();
    cy.realType('keep');
    cy.get(input).then($input => {
      const original = $input[0];
      cy.contains('button', 'Next').realClick();
      cy.get(input).should('be.disabled').and('have.value', 'keep');
      cy.get(before).should('have.text', '$');
      cy.contains('button', 'Next').realClick();
      cy.get(input).should('not.be.disabled').and('have.prop', 'readOnly', true);
      cy.get(before).should('not.exist');
      cy.get(after).should('have.text', '.00');
      cy.get(input).realClick();
      cy.realType('x');
      cy.get(input).should('have.value', 'keep');
      cy.contains('button', 'Next').realClick();
      cy.get(after).should('not.exist');
      cy.get(input).should($next => expect($next[0]).to.equal(original));
      cy.get(input).realClick();
      cy.realPress('End');
      cy.realType('x');
      cy.get(input).should('have.value', 'keepx');
      cy.get('@change').should('have.callCount', 5);
    });
  });

  it('forwards synthetic composition boundaries but does not treat composition events alone as committed OS IME text', () => {
    const composition = cy.stub().as('composition');
    const change = cy.stub().as('change');
    render({
      onChange: change,
      onCompositionStart: event => composition(event.type, event.data, event.currentTarget.tagName),
      onCompositionUpdate: event => composition(event.type, event.data, event.currentTarget.tagName),
      onCompositionEnd: event => composition(event.type, event.data, event.currentTarget.tagName),
    });
    cy.get(input).realClick();
    cy.get(input).then($input => {
      const element = nativeInput($input);
      const view = element.ownerDocument.defaultView!;
      for (const [type, data] of [
        ['compositionstart', ''],
        ['compositionupdate', 'あ'],
        ['compositionend', 'あ'],
      ]) {
        element.dispatchEvent(new view.CompositionEvent(type, { bubbles: true, data }));
      }
    });
    cy.get('@composition')
      .should('have.callCount', 3)
      .its('args')
      .should('deep.equal', [
        ['compositionstart', '', 'INPUT'],
        ['compositionupdate', 'あ', 'INPUT'],
        ['compositionend', 'あ', 'INPUT'],
      ]);
    cy.get(input).should('have.value', '');
    cy.get('@change').should('not.have.been.called');
    cy.realType('x');
    cy.get(input).should('have.value', 'x');
    cy.get('@change').should('have.been.calledOnce');
  });

  for (const eventType of ['input', 'change'] as const) {
    it(`reports an explicitly programmatic ${eventType} event and data payload (not trusted user input)`, () => {
      const change = cy.stub().as('change');
      render({ onChange: change });
      cy.get(input).then($input => {
        const element = nativeInput($input);
        const view = element.ownerDocument.defaultView!;
        const descriptor = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')!;
        descriptor.set!.call(element, 'programmatic');
        element.dispatchEvent(new view.Event(eventType, { bubbles: true }));
        assertChange(change.firstCall.args, 'programmatic', element, eventType);
        expect((change.firstCall.args[0] as React.ChangeEvent<HTMLInputElement>).nativeEvent.isTrusted).to.equal(false);
      });
      cy.get(input).should('have.value', 'programmatic');
      cy.get('@change').should('have.been.calledOnce');
    });
  }

  it('captures currentTarget and trusted native input metadata during the real onChange call', () => {
    const observed = cy.stub().as('observed');
    render({
      onChange: (event, data) =>
        observed({
          type: event.type,
          nativeType: event.nativeEvent.type,
          trusted: event.nativeEvent.isTrusted,
          tag: event.currentTarget.tagName,
          sameTarget: event.currentTarget === event.target,
          targetValue: event.target.value,
          data,
        }),
    });
    cy.get(input).realClick();
    cy.realType('x');
    cy.get('@observed').should('have.been.calledOnceWithExactly', {
      type: 'change',
      nativeType: 'input',
      trusted: true,
      tag: 'INPUT',
      sameTarget: true,
      targetValue: 'x',
      data: { value: 'x' },
    });
  });

  for (const invalid of [true, 'true', false, 'false', 'grammar', 'spelling'] as const) {
    it(`keys error borders off the exact source aria-invalid boundary (${String(invalid)}/${typeof invalid})`, () => {
      render({ 'aria-invalid': invalid });
      cy.get('[data-testid="after"]').realHover();
      cy.get(root).should(
        'have.css',
        'border-bottom-color',
        rgb(
          invalid === true || invalid === 'true'
            ? teamsLightTheme.colorPaletteRedBorder2
            : teamsLightTheme.colorNeutralStrokeAccessible,
        ),
      );
      cy.get(input).realClick();
      cy.get(root).should('have.css', 'border-bottom-color', rgb(teamsLightTheme.colorNeutralStrokeAccessiblePressed));
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').realHover();
      cy.get(root).should(
        'have.css',
        'border-bottom-color',
        rgb(
          invalid === true || invalid === 'true'
            ? teamsLightTheme.colorPaletteRedBorder2
            : teamsLightTheme.colorNeutralStrokeAccessible,
        ),
      );
    });
  }

  it('suppresses invalid styles while disabled but retains consumer ARIA', () => {
    render({ disabled: true, 'aria-invalid': true });
    cy.get(input).should('have.attr', 'aria-invalid', 'true');
    cy.get(root).should('have.css', 'border-bottom-color', rgb(teamsLightTheme.colorNeutralStrokeDisabled));
  });

  it('inherits provider appearance overrides while explicit appearance wins', () => {
    mount(
      <FluentProvider theme={teamsLightTheme} overrides_unstable={{ inputDefaultAppearance: 'filled-darker' }}>
        <Input data-testid="inherited" aria-label="Inherited" />
        <Input data-testid="explicit" aria-label="Explicit" appearance="underline" />
      </FluentProvider>,
    );
    cy.get('[data-testid="inherited"]')
      .parent()
      .should('have.css', 'background-color', rgb(teamsLightTheme.colorNeutralBackground3));
    cy.get('[data-testid="explicit"]').parent().should('have.css', 'border-top-style', 'none');
  });

  it('runs the provider custom style hook for Input without discarding built-in classes or editing', () => {
    mount(
      <FluentProvider
        theme={teamsLightTheme}
        customStyleHooks_unstable={{
          // eslint-disable-next-line @typescript-eslint/naming-convention -- Provider API key.
          useInputStyles_unstable: state => {
            const inputState = state as InputState;
            inputState.root.style = { ...inputState.root.style, width: 280 };
          },
        }}
      >
        <Input data-testid="input" aria-label="Entry" />
      </FluentProvider>,
    );
    cy.get(root).should('have.css', 'width', '280px');
    cy.get(input).realClick();
    cy.realType('x');
    cy.get(input).should('have.value', 'x');
  });

  it('demonstrates shared top-level enterKeyHint/onInvalid filtering with functioning slot positive controls', () => {
    const topInvalid = cy.stub().as('topInvalid');
    const slotInvalid = cy.stub().as('slotInvalid');
    mount(
      <>
        <Input data-testid="top" aria-label="Top" required enterKeyHint="done" onInvalid={topInvalid} />
        <Input data-testid="slot" aria-label="Slot" required input={{ enterKeyHint: 'done', onInvalid: slotInvalid }} />
      </>,
    );
    cy.get('[data-testid="top"]').should('not.have.attr', 'enterkeyhint');
    cy.get('[data-testid="slot"]').should('have.attr', 'enterkeyhint', 'done');
    cy.get('[data-testid="top"]').then($input => expect(nativeInput($input).checkValidity()).to.equal(false));
    cy.get('[data-testid="slot"]').then($input => expect(nativeInput($input).checkValidity()).to.equal(false));
    cy.get('@topInvalid').should('not.have.been.called');
    cy.get('@slotInvalid').should('have.been.calledOnce');
  });

  it('keeps controlled values across native form reset and allows an explicit consumer reset handler', () => {
    const change = cy.stub().as('change');
    const Controlled = () => {
      const [value, setValue] = React.useState('seed');
      return (
        <form onReset={() => setValue('seed')}>
          <Input
            data-testid="input"
            aria-label="Entry"
            value={value}
            onChange={(event, data) => {
              change(event, data);
              setValue(data.value);
            }}
          />
          <button type="reset">Reset</button>
        </form>
      );
    };
    mount(<Controlled />);
    cy.get(input).realClick();
    cy.realPress('End');
    cy.realType('x');
    cy.get(input).should('have.value', 'seedx');
    cy.contains('button', 'Reset').realClick();
    cy.get(input).should('have.value', 'seed');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('matches reset cancellation with a native positive control', () => {
    mount(
      <form onReset={event => event.preventDefault()}>
        <Input data-testid="input" aria-label="Entry" defaultValue="seed" />
        <input data-testid="native" aria-label="Native" defaultValue="seed" />
        <button type="reset">Reset</button>
      </form>,
    );
    for (const selector of [input, '[data-testid="native"]']) {
      cy.get(selector).realClick();
      cy.realPress('End');
      cy.realType('x');
    }
    cy.contains('button', 'Reset').realClick();
    cy.get(input).should('have.value', 'seedx');
    cy.get('[data-testid="native"]').should('have.value', 'seedx');
  });

  for (const bypass of ['form', 'submitter'] as const) {
    it(`honors native validation bypass on the ${bypass} with invalid-value positive control`, () => {
      const submit = cy.stub().as('submit');
      mount(
        <form
          noValidate={bypass === 'form'}
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <Input data-testid="input" aria-label="Entry" required />
          <button type="submit" formNoValidate={bypass === 'submitter'}>
            Submit
          </button>
        </form>,
      );
      cy.get(input).should($input => expect(nativeInput($input).validity.valueMissing).to.equal(true));
      cy.contains('button', 'Submit').realClick();
      cy.get('@submit').should('have.been.calledOnce');
    });
  }

  it('updates password type only through consumer props, preserving the same element and value', () => {
    const Reveal = () => {
      const [visible, setVisible] = React.useState(false);
      return (
        <>
          <Input data-testid="input" aria-label="Entry" type={visible ? 'text' : 'password'} defaultValue="secret" />
          <button onClick={() => setVisible(!visible)}>Reveal</button>
        </>
      );
    };
    mount(<Reveal />);
    cy.get(input).then($input => {
      const original = $input[0];
      cy.contains('button', 'Reveal').realClick();
      cy.get(input).should('have.attr', 'type', 'text').and('have.value', 'secret');
      cy.get(input).should($next => expect($next[0]).to.equal(original));
      cy.contains('button', 'Reveal').realClick();
      cy.get(input).should('have.attr', 'type', 'password').and('have.value', 'secret');
    });
  });

  it('cleans up callback refs on unmount and starts fresh uncontrolled state on remount', () => {
    const ref = cy.stub().as('ref');
    const Lifecycle = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          {visible && (
            <Input ref={element => ref(element)} data-testid="input" aria-label="Entry" defaultValue="seed" />
          )}
          <button onClick={() => setVisible(!visible)}>Toggle</button>
        </>
      );
    };
    mount(<Lifecycle />);
    cy.get(input).realClick();
    cy.realPress('End');
    cy.realType('x');
    cy.get(input).should('have.value', 'seedx');
    cy.contains('button', 'Toggle').realClick();
    cy.get(input).should('not.exist');
    cy.get('@ref').its('lastCall.args').should('deep.equal', [null]);
    cy.contains('button', 'Toggle').realClick();
    cy.get(input)
      .should('have.value', 'seed')
      .then($input => expect(ref.lastCall.args[0]).to.equal($input[0]));
  });

  for (const type of ['date', 'datetime-local', 'month', 'number', 'time', 'week'] as const) {
    it(`matches native malformed and empty ${type} value sanitization without simulating a picker`, () => {
      const change = cy.stub().as('change');
      mount(
        <>
          <Input data-testid="input" aria-label="Entry" type={type} defaultValue="not-a-value" onChange={change} />
          <input data-testid="native" type={type} defaultValue="not-a-value" />
        </>,
      );
      cy.get(input).should('have.value', '');
      cy.get('[data-testid="native"]').should('have.value', '');
      cy.get(input).then($input => {
        const element = nativeInput($input);
        const control = element.ownerDocument.querySelector<HTMLInputElement>('[data-testid="native"]')!;
        element.value = '';
        control.value = '';
        expect(element.value).to.equal(control.value);
        expect(element.validity.valid).to.equal(control.validity.valid).and.equal(true);
      });
      cy.get('@change').should('not.have.been.called');
    });
  }

  for (const size of sizes) {
    it(`sizes direct decorative SVG children for ${size} without making them an accessible label`, () => {
      render({
        size,
        contentBefore: (
          <svg aria-hidden="true" width="1em" height="1em">
            <circle cx="5" cy="5" r="4" />
          </svg>
        ),
        contentAfter: (
          <svg aria-hidden="true" width="1em" height="1em">
            <circle cx="5" cy="5" r="4" />
          </svg>
        ),
      });
      cy.get(`${before} > svg, ${after} > svg`)
        .should('have.length', 2)
        .and('have.css', 'font-size', `${size === 'small' ? 16 : size === 'medium' ? 20 : 24}px`);
      cy.get(input).should($input => expect(computeAccessibleName($input[0])).to.equal('Entry'));
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(input).should('be.focused');
    });
  }

  it('generates unique Field relationships and keeps sibling controls and validation isolated', () => {
    mount(
      <>
        <Field label="First" validationMessage="First error">
          <Input data-testid="first" />
        </Field>
        <Field label="Second" hint="Second hint">
          <Input data-testid="second" />
        </Field>
      </>,
    );
    cy.get('[data-testid="first"]').should($input => {
      const element = nativeInput($input);
      const second = element.ownerDocument.querySelector<HTMLInputElement>('[data-testid="second"]')!;
      expect(element.id).not.to.equal(second.id);
      expect(computeAccessibleName(element)).to.equal('First');
      expect(computeAccessibleDescription(element)).to.equal('First error');
      expect(computeAccessibleName(second)).to.equal('Second');
      expect(computeAccessibleDescription(second)).to.equal('Second hint');
      expect(second.hasAttribute('aria-invalid')).to.equal(false);
    });
    cy.get('[data-testid="first"]').realClick();
    cy.realType('a');
    cy.get('[data-testid="second"]').should('have.value', '').realClick();
    cy.realType('b');
    cy.get('[data-testid="first"]').should('have.value', 'a');
    cy.get('[data-testid="second"]').should('have.value', 'b');
  });

  it('does not suppress explicitly synthetic composing input events or invent a composition commit on end', () => {
    const change = cy.stub().as('change');
    const compositionEnd = cy.stub().as('compositionEnd');
    render({ onChange: change, onCompositionEnd: event => compositionEnd(event.data) });
    cy.get(input).realClick();
    cy.get(input).then($input => {
      const element = nativeInput($input);
      const view = element.ownerDocument.defaultView!;
      const setter = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')!.set!;
      element.dispatchEvent(new view.CompositionEvent('compositionstart', { bubbles: true }));
      setter.call(element, 'あ');
      element.dispatchEvent(
        new view.InputEvent('input', {
          bubbles: true,
          data: 'あ',
          inputType: 'insertCompositionText',
          isComposing: true,
        }),
      );
      assertChange(change.firstCall.args, 'あ', element);
      expect(change.firstCall.args[0].nativeEvent.isComposing).to.equal(true);
      expect(change.firstCall.args[0].nativeEvent.isTrusted).to.equal(false);
      element.dispatchEvent(new view.CompositionEvent('compositionend', { bubbles: true, data: 'あ' }));
    });
    cy.get(input).should('have.value', 'あ');
    cy.get('@change').should('have.been.calledOnce');
    cy.get('@compositionEnd').should('have.been.calledOnceWithExactly', 'あ');
    cy.realType('x');
    cy.get(input).should('have.value', 'あx');
    cy.get('@change').should('have.been.calledTwice');
  });

  it('honors consumer key prevention and still accepts an unprevented key', () => {
    const change = cy.stub().as('change');
    render({
      onChange: change,
      onKeyDown: event => {
        if (event.key === 'x') {
          event.preventDefault();
        }
      },
    });
    cy.get(input).realClick();
    cy.realType('x');
    cy.get(input).should('have.value', '');
    cy.get('@change').should('not.have.been.called');
    cy.realType('y');
    cy.get(input).should('have.value', 'y');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('forwards autofocus and negative tabindex without adding a root tab stop', () => {
    render({ autoFocus: true, tabIndex: -1 });
    cy.get(input).should('be.focused').and('have.attr', 'tabindex', '-1');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.get(input).realClick().should('be.focused');
  });

  it('supports fractional number values with step any and validates both range endpoints', () => {
    render({ type: 'number', min: 0, max: 1, step: 'any' });
    cy.get(input).realClick();
    cy.realType('0.5');
    cy.get(input).should('have.value', '0.5');
    cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
    cy.realPress(['Control', 'A']);
    cy.realType('1');
    cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
    cy.realPress(['Control', 'A']);
    cy.realType('0');
    cy.get(input).should($input => expect(nativeInput($input).validity.valid).to.equal(true));
  });

  it('submits a single-input form implicitly with Enter, never inserting a newline', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit(new FormData(event.currentTarget).get('entry'));
        }}
      >
        <Input data-testid="input" aria-label="Entry" name="entry" />
      </form>,
    );
    cy.get(input).realClick();
    cy.realType('value');
    cy.realPress('Enter');
    cy.get('@submit').should('have.been.calledOnceWithExactly', 'value');
    cy.get(input).should('have.value', 'value');
  });

  it('retains fixed controlled text during native reset without reporting a change', () => {
    const change = cy.stub().as('change');
    mount(
      <form>
        <Input data-testid="input" aria-label="Entry" value="fixed" onChange={change} />
        <input data-testid="native" defaultValue="seed" />
        <button type="reset">Reset</button>
      </form>,
    );
    cy.get('[data-testid="native"]').realClick();
    cy.realPress('End');
    cy.realType('x');
    cy.contains('button', 'Reset').realClick();
    cy.get('[data-testid="native"]').should('have.value', 'seed');
    cy.get(input).should('have.value', 'fixed');
    cy.get('@change').should('not.have.been.called');
  });

  it('forwards native selection notifications with real shift-selection positive control', () => {
    const select = cy.stub().as('select');
    render({
      defaultValue: 'abcd',
      onSelect: event => select(event.currentTarget.selectionStart, event.currentTarget.selectionEnd),
    });
    cy.get(input).realClick();
    cy.realPress('Home');
    cy.realPress(['Shift', 'ArrowRight']);
    cy.get(input).should($input => {
      expect(nativeInput($input).selectionStart).to.equal(0);
      expect(nativeInput($input).selectionEnd).to.equal(1);
    });
    cy.get('@select').should('have.been.calledWithExactly', 0, 1);
  });
});
