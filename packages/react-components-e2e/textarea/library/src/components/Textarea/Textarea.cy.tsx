import type {} from 'cypress';
import 'cypress-real-events';
import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsDarkTheme, teamsLightTheme } from '@fluentui/react-theme';
import { Field } from '@fluentui/react-field';
import { getByRole } from '@testing-library/react';
import { computeAccessibleDescription, computeAccessibleName } from 'dom-accessibility-api';
import { getCypressElementCoordinates } from 'cypress-real-events/getCypressElementCoordinates';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { OverridesProvider_unstable } from '@fluentui/react-shared-contexts';
import { Textarea } from './Textarea';
import type { TextareaProps, TextareaSlots } from './Textarea.types';
import { textareaClassNames } from './useTextareaStyles.styles';

const entry = '[data-testid="entry"]';
const root = `.${textareaClassNames.root}`;
const sizes = ['small', 'medium', 'large'] as const;
const appearances = [
  'outline',
  'filled-darker',
  'filled-lighter',
  'filled-darker-shadow',
  'filled-lighter-shadow',
] as const;
const minHeights = { small: 40, medium: 52, large: 64 };
const maxHeights = { small: 200, medium: 260, large: 320 };
const fontSizes = { small: 12, medium: 14, large: 16 };

function render(props: TextareaProps = {}) {
  return mount(
    <FluentProvider theme={teamsLightTheme}>
      <button data-testid="before">Before</button>
      <Textarea aria-label="Entry" data-testid="entry" {...props} />
      <button data-testid="after">After</button>
    </FluentProvider>,
  );
}

function native($entry: JQuery<HTMLElement>): HTMLTextAreaElement {
  expect($entry[0].tagName).to.equal('TEXTAREA');
  return $entry[0] as HTMLTextAreaElement;
}

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

function assertChange(args: unknown[], value: string, element: HTMLTextAreaElement) {
  expect(args).to.have.length(2);
  const event = args[0] as React.ChangeEvent<HTMLTextAreaElement>;
  expect(event.type).to.equal('change');
  expect(event.nativeEvent.type).to.equal('input');
  expect(event.target).to.equal(element);
  expect(args[1]).to.deep.equal({ value });
}

function formEntries(form: HTMLFormElement) {
  const entries: [string, FormDataEntryValue][] = [];
  new FormData(form).forEach((value, name) => entries.push([name, value]));
  return entries;
}

function dragCorner(dx: number, dy: number, selector = entry) {
  cy.get(selector).then($entry => {
    const bounds = $entry[0].getBoundingClientRect();
    const point = getCypressElementCoordinates($entry, { x: bounds.width - 3, y: bounds.height - 3 }, false);
    cy.get(selector).realMouseDown({ x: bounds.width - 3, y: bounds.height - 3, scrollBehavior: false });
    // realMouseMove omits the held-button bit required by Chromium's native resize control.
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchMouseEvent',
        params: {
          type: 'mouseMoved',
          button: 'left',
          buttons: 1,
          x: point.x + dx * point.frameScale,
          y: point.y + dy * point.frameScale,
        },
      }),
    );
    cy.get(selector).realMouseUp();
  });
}

describe('Textarea edges and accessibility', () => {
  for (const appearance of appearances) {
    it(`disables native editing and tab focus with ${appearance}, without a focus underline`, () => {
      const change = cy.stub().as('change');
      render({ appearance, disabled: true, resize: 'both', defaultValue: 'locked', onChange: change });
      cy.get(entry).should('be.disabled').and('have.value', 'locked').and('have.css', 'resize', 'none');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="before"]').should('be.focused');
      cy.get(entry).then($entry => native($entry).focus());
      cy.get(entry).should('not.be.focused').and('have.css', 'cursor', 'not-allowed');
      cy.get(entry).should('have.css', 'color', rgb(teamsLightTheme.colorNeutralForegroundDisabled));
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

  it('keeps readonly content focusable and selectable but not editable or subject to required validation', () => {
    const change = cy.stub().as('change');
    render({ readOnly: true, required: true, defaultValue: 'copy\nme', onChange: change });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(entry).should('be.focused');
    cy.realPress(['Control', 'A']);
    cy.get(entry).should($entry => {
      expect(native($entry).selectionStart).to.equal(0);
      expect(native($entry).selectionEnd).to.equal(7);
      expect(native($entry).willValidate).to.equal(false);
    });
    cy.realType('x');
    cy.realPress('Enter');
    cy.realPress('Backspace');
    cy.get(entry).should('have.value', 'copy\nme');
    cy.get('@change').should('not.have.been.called');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
  });

  it('preserves real multiline caret movement, shift selection, replacement, delete, backspace and tab escape', () => {
    render({ defaultValue: 'abc\ndef\nghi' });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(entry).should('be.focused');
    cy.realPress(['Control', 'Home']);
    cy.realPress('ArrowRight');
    cy.realPress('ArrowDown');
    cy.get(entry).should($entry => expect(native($entry).selectionStart).to.equal(5));
    cy.realPress('ArrowUp');
    cy.realPress(['Shift', 'ArrowRight']);
    cy.realPress(['Shift', 'ArrowRight']);
    cy.get(entry).should($entry => {
      expect(native($entry).selectionStart).to.equal(1);
      expect(native($entry).selectionEnd).to.equal(3);
    });
    cy.realType('X');
    cy.get(entry).should('have.value', 'aX\ndef\nghi');
    cy.realPress('Delete');
    cy.get(entry).should('have.value', 'aXdef\nghi');
    cy.realPress('Backspace');
    cy.get(entry).should('have.value', 'adef\nghi');
    cy.realPress('Enter');
    cy.get(entry).should('have.value', 'a\ndef\nghi');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get(entry).should('be.focused').and('have.value', 'a\ndef\nghi');
  });

  it('forwards min/max length and required validity, enforcing real user input at the exact boundaries', () => {
    const invalid = cy.stub().as('invalid');
    render({ required: true, minLength: 3, maxLength: 5, onInvalid: invalid });
    cy.get(entry).should($entry => {
      expect(native($entry).validity.valueMissing).to.equal(true);
      expect(native($entry).checkValidity()).to.equal(false);
    });
    cy.get('@invalid').should('have.been.calledOnce');
    cy.get(entry).realClick();
    cy.realType('ab');
    cy.get(entry).should($entry => expect(native($entry).validity.tooShort).to.equal(true));
    cy.realType('c');
    cy.get(entry).should($entry => expect(native($entry).validity.valid).to.equal(true));
    cy.realPress('Enter');
    cy.realType('def');
    cy.get(entry).should('have.value', 'abc\nd');
    cy.get(entry).should($entry => {
      expect(native($entry).minLength).to.equal(3);
      expect(native($entry).maxLength).to.equal(5);
      expect(native($entry).validity.valid).to.equal(true);
    });
  });

  for (const wrap of ['soft', 'hard', 'off'] as const) {
    it(`forwards ${wrap} wrapping, rows/cols and native serialization with a plain textarea positive control`, () => {
      const value = 'one two three four five six seven eight nine ten';
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <form>
            <Textarea
              data-testid="entry"
              aria-label="Entry"
              name="fluent"
              rows={4}
              cols={8}
              wrap={wrap}
              defaultValue={value}
            />
            <textarea data-testid="native" name="native" rows={4} cols={8} wrap={wrap} defaultValue={value} />
          </form>
        </FluentProvider>,
      );
      cy.get(entry).should('have.attr', 'wrap', wrap).and('have.attr', 'rows', '4').and('have.attr', 'cols', '8');
      cy.get(entry).should($entry => {
        const element = native($entry);
        const control = element.ownerDocument.querySelector<HTMLTextAreaElement>('[data-testid="native"]')!;
        // Hard-wrap line breaks depend on rendered font/width, not just the cols attribute.
        control.className = element.className;
        const data = new FormData(element.form!);
        expect(data.get('fluent')).to.equal(data.get('native'));
        expect(element.value).to.equal(value);
        if (wrap === 'hard') {
          expect(data.get('fluent')).not.to.equal(value);
          expect(String(data.get('fluent'))).to.include('\n');
        } else {
          expect(data.get('fluent')).to.equal(value);
        }
        expect(element.rows).to.equal(control.rows);
        expect(element.cols).to.equal(control.cols);
        expect(element.ownerDocument.defaultView!.getComputedStyle(element).whiteSpace).to.equal(
          wrap === 'off' ? 'pre' : 'pre-wrap',
        );
      });
    });
  }

  it('makes rows and cols affect actual native geometry when height bounds are explicitly removed', () => {
    render({ rows: 2, cols: 10, textarea: { style: { minHeight: 0, maxHeight: 'none', height: 'auto' } } });
    cy.get(entry).then($entry => {
      const element = native($entry);
      const initial = element.getBoundingClientRect();
      element.rows = 6;
      element.cols = 30;
      const expanded = element.getBoundingClientRect();
      expect(expanded.height).to.be.greaterThan(initial.height * 2);
      expect(expanded.width).to.be.greaterThan(initial.width * 2);
      expect(element.parentElement!.getBoundingClientRect().height).to.be.closeTo(expanded.height + 4, 1);
    });
  });

  it('submits successful named controls, excludes disabled/unnamed controls and does not submit on Enter', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit(formEntries(event.currentTarget));
        }}
      >
        <Textarea data-testid="entry" aria-label="Entry" name="description" defaultValue="first" />
        <Textarea aria-label="Readonly" name="readonly" readOnly defaultValue="read" />
        <Textarea aria-label="Disabled" name="disabled" disabled defaultValue="omit" />
        <Textarea aria-label="Unnamed" defaultValue="omit" />
        <button type="submit">Submit</button>
      </form>,
    );
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realPress('Enter');
    cy.realType('second');
    cy.get(entry).should('have.value', 'first\nsecond');
    cy.get('@submit').should('not.have.been.called');
    cy.contains('button', 'Submit').realClick();
    cy.get('@submit').should('have.been.calledOnceWithExactly', [
      ['description', 'first\nsecond'],
      ['readonly', 'read'],
    ]);
  });

  it('honors external form ownership and blocks then allows a required native submission', () => {
    const submit = cy.stub().as('submit');
    mount(
      <>
        <form
          id="owner"
          onSubmit={event => {
            event.preventDefault();
            submit(formEntries(event.currentTarget));
          }}
        />
        <form id="ancestor">
          <Textarea data-testid="entry" aria-label="Entry" name="entry" form="owner" required />
        </form>
        <button type="submit" form="owner">
          Submit
        </button>
      </>,
    );
    cy.get(entry).should($entry => {
      expect(native($entry).form!.id).to.equal('owner');
      expect(new FormData($entry[0].ownerDocument.querySelector<HTMLFormElement>('#ancestor')!).has('entry')).to.equal(
        false,
      );
    });
    cy.contains('button', 'Submit').realClick();
    cy.get('@submit').should('not.have.been.called');
    cy.get(entry).should('be.focused');
    cy.realType('ok');
    cy.contains('button', 'Submit').realClick();
    cy.get('@submit').should('have.been.calledOnceWithExactly', [['entry', 'ok']]);
  });

  for (const controlled of [false, true]) {
    it(`compares ${
      controlled ? 'controlled' : 'default'
    } form reset to a native control without claiming initial-value reset support`, () => {
      const change = cy.stub().as('change');
      const reset = cy.stub().as('reset');
      const Fixture = () => {
        const [value, setValue] = React.useState('seed');
        return (
          <>
            <form id="owner" onReset={reset} />
            <Textarea
              data-testid="entry"
              aria-label="Entry"
              form="owner"
              {...(controlled ? { value } : { defaultValue: 'seed' })}
              onChange={(event, data) => {
                change(event, data);
                if (controlled) {
                  setValue(data.value);
                }
              }}
            />
            <textarea data-testid="native" form="owner" defaultValue="seed" />
            <button type="reset" form="owner">
              Reset
            </button>
          </>
        );
      };
      mount(<Fixture />);
      cy.get(entry).realClick();
      cy.realPress(['Control', 'End']);
      cy.realType('x');
      cy.get('[data-testid="native"]').realClick();
      cy.realPress(['Control', 'End']);
      cy.realType('x');
      cy.get(entry).should('have.value', 'seedx');
      cy.get('[data-testid="native"]').should('have.value', 'seedx');
      cy.contains('button', 'Reset').realClick();
      cy.get('[data-testid="native"]').should('have.value', 'seed');
      cy.get(entry).should('have.value', 'seedx');
      cy.get('@change').should('have.been.calledOnce');
      cy.get('@reset').should('have.been.calledOnce');
      cy.get(entry).realClick();
      cy.realPress(['Control', 'End']);
      cy.realType('y');
      cy.get(entry).should('have.value', 'seedxy');
    });
  }

  for (const validationState of ['none', 'error', 'warning', 'success'] as const) {
    it(`wires Field labels, merged descriptions, required and ${validationState} validation semantics`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <span id="extra">Extra instructions</span>
          <Field
            label="Description"
            hint="Helpful hint"
            validationMessage="Validation message"
            validationState={validationState}
            required
          >
            <Textarea data-testid="entry" aria-describedby="extra" />
          </Field>
        </FluentProvider>,
      );
      cy.get(entry).should($entry => {
        const element = native($entry);
        expect(computeAccessibleName(element)).to.equal('Description');
        expect(computeAccessibleDescription(element)).to.equal('Validation message Helpful hint Extra instructions');
        expect(element.required).to.equal(true);
        expect(element.getAttribute('aria-invalid')).to.equal(validationState === 'error' ? 'true' : null);
        expect(element.ownerDocument.querySelector<HTMLLabelElement>('label')!.htmlFor).to.equal(element.id);
        const ids = element.getAttribute('aria-describedby')!.split(' ');
        expect(ids).to.have.length(3);
        expect(element.ownerDocument.getElementById(ids[0])!.getAttribute('role')).to.equal(
          validationState === 'error' || validationState === 'warning' ? 'alert' : null,
        );
      });
      if (validationState === 'error') {
        cy.get(root).should('have.css', 'border-top-color', rgb(teamsLightTheme.colorPaletteRedBorder2));
        cy.get(entry).realClick();
        cy.get(root).should($root =>
          expect($root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after').borderBottomColor).to.equal(
            rgb(teamsLightTheme.colorCompoundBrandStroke),
          ),
        );
      }
    });
  }

  it('preserves explicit Field overrides and custom-id labelling without inventing a prefix slot', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <span id="prefix">Request</span>
        <Field label="Details" size="small" required validationMessage="Error">
          <Textarea
            data-testid="entry"
            id="custom"
            size="large"
            required={false}
            aria-invalid={false}
            aria-labelledby="prefix"
          />
        </Field>
      </FluentProvider>,
    );
    cy.get(entry).should('have.attr', 'id', 'custom').and('have.attr', 'aria-invalid', 'false');
    cy.get(entry).should($entry => {
      expect(native($entry).required).to.equal(false);
      expect(computeAccessibleName($entry[0])).to.equal('Request');
    });
    cy.get(entry).should('have.css', 'min-height', '64px');
    cy.get(root).children().should('have.length', 1);
  });

  it('updates Field names, descriptions, required and inherited sizes without replacing or clearing the textarea', () => {
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
            <Textarea data-testid="entry" />
          </Field>
          <button onClick={() => setUpdated(!updated)}>Update</button>
        </FluentProvider>
      );
    };
    mount(<Dynamic />);
    cy.get(entry).realClick();
    cy.realType('preserved');
    cy.get(entry).then($entry => {
      const original = $entry[0];
      cy.contains('button', 'Update').realClick();
      cy.get(entry).should($next => expect($next[0]).to.equal(original));
    });
    cy.get(entry).should('have.value', 'preserved').and('have.css', 'min-height', '64px');
    cy.get(entry).should($entry => {
      expect(computeAccessibleName($entry[0])).to.equal('New name');
      expect(computeAccessibleDescription($entry[0])).to.equal('New error New hint');
      expect(native($entry).required).to.equal(true);
      expect($entry.attr('aria-invalid')).to.equal('true');
    });
    cy.contains('button', 'Update').realClick();
    cy.get(entry).should('have.value', 'preserved').and('have.css', 'min-height', '40px');
    cy.get(entry).should($entry => {
      expect(computeAccessibleName($entry[0])).to.equal('Old name');
      expect(computeAccessibleDescription($entry[0])).to.equal('Old hint');
      expect(native($entry).required).to.equal(false);
      expect($entry.attr('aria-invalid')).to.equal(undefined);
    });
  });

  it('uses native visible-label and aria-labelledby naming without placeholder becoming the name', () => {
    mount(
      <>
        <label htmlFor="notes" id="label">
          Notes
        </label>
        <span id="context">for review</span>
        <Textarea data-testid="entry" id="notes" aria-labelledby="label context" placeholder="Not a label" />
      </>,
    );
    cy.get(entry).should($entry => expect(computeAccessibleName($entry[0])).to.equal('Notes for review'));
    cy.contains('label', 'Notes').realClick();
    cy.get(entry).should('be.focused');
    cy.realType('x');
    cy.get(entry).should($entry => expect(computeAccessibleName($entry[0])).to.equal('Notes for review'));
  });

  it('partitions native props and refs between the actual root and textarea slots and clears refs on unmount', () => {
    const primaryRef = React.createRef<HTMLTextAreaElement>();
    const rootRef = React.createRef<HTMLSpanElement>();
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          {visible && (
            <Textarea
              ref={primaryRef}
              root={{ ref: rootRef, title: 'wrapper' }}
              data-testid="entry"
              id="native-id"
              aria-label="Entry"
              name="notes"
              title="native-title"
              lang="fr"
              spellCheck={false}
              autoComplete="off"
              className="consumer-root"
              style={{ width: 240 }}
              textarea={{ className: 'consumer-textarea', style: { height: 90 } }}
            />
          )}
          <button onClick={() => setVisible(false)}>Unmount</button>
        </>
      );
    };
    mount(<Fixture />);
    cy.get(entry).should('have.attr', 'title', 'native-title').and('have.attr', 'name', 'notes');
    cy.get(entry).should('have.attr', 'id', 'native-id').and('have.attr', 'lang', 'fr');
    cy.get(entry).should('have.attr', 'autocomplete', 'off').and('have.prop', 'spellcheck', false);
    cy.get(entry).should('have.class', 'consumer-textarea').and('not.have.class', 'consumer-root');
    cy.get(root).should('have.class', 'consumer-root').and('have.attr', 'title', 'wrapper');
    cy.get(root).should('not.have.attr', 'name');
    cy.get(entry).then($entry => {
      expect(primaryRef.current).to.equal($entry[0]);
      expect(rootRef.current).to.equal($entry[0].parentElement);
      primaryRef.current!.focus();
      primaryRef.current!.setSelectionRange(0, 0);
    });
    cy.get(entry).should('be.focused').and('have.css', 'height', '90px');
    cy.get(root).should($root => expect($root[0].getBoundingClientRect().width).to.equal(240));
    cy.contains('button', 'Unmount').realClick();
    cy.get(entry).should('not.exist');
    cy.then(() => {
      expect(primaryRef.current).to.equal(null);
      expect(rootRef.current).to.equal(null);
    });
  });

  it('forwards native focus, blur, click, selection and keyboard events with textarea targets and wrapper bubbling', () => {
    const events = cy.stub().as('events');
    const wrapper = cy.stub().as('wrapper');
    const record = (event: React.SyntheticEvent<HTMLTextAreaElement>) =>
      events(event.type, event.target, event.currentTarget);
    render({
      defaultValue: 'abc',
      onFocus: record,
      onBlur: record,
      onClick: record,
      onSelect: record,
      onKeyDown: record,
      onKeyUp: record,
      root: { onClick: event => wrapper(event.target, event.currentTarget) },
    });
    cy.get(entry).realClick();
    cy.realPress(['Control', 'A']);
    cy.realPress('Tab');
    cy.get(entry).then($entry => {
      const element = native($entry);
      for (const type of ['focus', 'click', 'select', 'keydown', 'keyup', 'blur']) {
        const calls = events.args.filter(args => args[0] === type);
        expect(calls.length, type).to.be.greaterThan(0);
        calls.forEach(args => {
          expect(args[1]).to.equal(element);
          expect(args[2]).to.equal(element);
        });
      }
      expect(wrapper.firstCall.args).to.deep.equal([element, element.parentElement]);
    });
  });

  it('renders both actual slots with render functions, preserving native props, styles and consumer-owned prefix content', () => {
    const prefix = cy.stub().as('prefix');
    const renderRoot: SlotRenderFunction<ExtractSlotProps<TextareaSlots['root']>> = (Component, props) => (
      <Component {...props} title="rendered-root">
        <button onClick={prefix}>Consumer prefix</button>
        {props.children}
      </Component>
    );
    const renderTextarea: SlotRenderFunction<ExtractSlotProps<TextareaSlots['textarea']>> = (Component, props) => (
      <Component {...props} title="rendered-textarea" />
    );
    render({ root: { children: renderRoot }, textarea: { children: renderTextarea } });
    cy.get(root).should('have.attr', 'title', 'rendered-root');
    cy.get(entry).should('have.attr', 'title', 'rendered-textarea').and('have.class', textareaClassNames.textarea);
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.contains('button', 'Consumer prefix').should('be.focused');
    cy.realPress('Enter');
    cy.get('@prefix').should('have.been.calledOnce');
    cy.realPress('Tab');
    cy.get(entry).should('be.focused');
    cy.realType('x');
    cy.get(entry).should('have.value', 'x');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`updates themes and dynamic props with ${dir} layout while preserving native editing state`, () => {
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <FluentProvider theme={updated ? teamsDarkTheme : teamsLightTheme} dir={dir}>
            <Textarea
              data-testid="entry"
              aria-label="Entry"
              size={updated ? 'large' : 'small'}
              appearance={updated ? 'filled-darker' : 'outline'}
              resize={updated ? 'both' : 'none'}
              placeholder={updated ? 'New placeholder' : 'Old placeholder'}
              textarea={{ style: { width: 180 } }}
            />
            <button onClick={() => setUpdated(!updated)}>Update</button>
          </FluentProvider>
        );
      };
      mount(<Fixture />);
      cy.get(entry).realClick();
      cy.realType('keep');
      cy.get(entry).then($entry => {
        const element = native($entry);
        element.setSelectionRange(1, 3);
        cy.contains('button', 'Update').realClick();
        cy.get(entry).should($next => {
          expect($next[0]).to.equal(element);
          expect(native($next).selectionStart).to.equal(1);
          expect(native($next).selectionEnd).to.equal(3);
          const bounds = element.getBoundingClientRect();
          const wrapper = element.parentElement!.getBoundingClientRect();
          expect(bounds.width).to.equal(180);
          expect(bounds.left).to.be.at.least(wrapper.left);
          expect(bounds.right).to.be.at.most(wrapper.right);
        });
      });
      cy.get(entry)
        .should('have.value', 'keep')
        .and('have.css', 'direction', dir)
        .and('have.css', 'color', rgb(teamsDarkTheme.colorNeutralForeground1))
        .and('have.css', 'min-height', '64px')
        .and('have.css', 'resize', 'both');
      cy.get(entry).should('have.attr', 'placeholder', 'New placeholder');
      cy.get(root).should('have.css', 'background-color', rgb(teamsDarkTheme.colorNeutralBackground3));
      cy.contains('button', 'Update').realClick();
      cy.get(entry).should('have.value', 'keep').and('have.css', 'resize', 'none');
      cy.get(entry).realClick();
      cy.realPress(['Control', 'End']);
      cy.realType('x');
      cy.get(entry).should('have.value', 'keepx');
    });
  }
});

describe('Textarea documentation scenarios', () => {
  it('renders exactly the wrapper and native multiline textbox, with a persistent label and placeholder', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Field label="Description">
          <Textarea data-testid="entry" placeholder="Type here" />
        </Field>
      </FluentProvider>,
    );
    cy.get(root).should('have.prop', 'tagName', 'SPAN').and('have.css', 'display', 'flex');
    cy.get(root).should('not.have.attr', 'role');
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get(root).children().should('have.length', 1).and('have.class', textareaClassNames.textarea);
    cy.get(entry).should('have.value', '').and('have.css', 'resize', 'none').and('match', ':placeholder-shown');
    cy.get(root).should($root =>
      expect(getByRole($root[0], 'textbox', { name: 'Description' })).to.equal($root.find(entry)[0]),
    );
    cy.contains('label', 'Description').realClick();
    cy.get(entry).should('be.focused');
    cy.realType('first');
    cy.realPress('Enter');
    cy.realType('second');
    cy.get(entry).should('have.value', 'first\nsecond').and('not.match', ':placeholder-shown');
    cy.contains('label', 'Description').should('be.visible');
    cy.get(entry).should('have.attr', 'placeholder', 'Type here');
  });

  for (const appearance of appearances) {
    for (const size of sizes) {
      it(`renders and edits ${appearance}/${size} with bounded size and focus decoration`, () => {
        render({ appearance, size });
        cy.get(entry)
          .should('have.css', 'min-height', `${minHeights[size]}px`)
          .and('have.css', 'max-height', `${maxHeights[size]}px`)
          .and('have.css', 'font-size', `${fontSizes[size]}px`);
        cy.get(root).should($root => {
          const style = $root[0].ownerDocument.defaultView!.getComputedStyle($root[0]);
          expect(style.backgroundColor).to.equal(
            rgb(
              appearance.startsWith('filled-darker')
                ? teamsLightTheme.colorNeutralBackground3
                : teamsLightTheme.colorNeutralBackground1,
            ),
          );
          expect(style.borderTopStyle).to.equal('solid');
          expect(style.boxShadow === 'none').to.equal(!appearance.endsWith('-shadow'));
          expect(style.borderRadius).to.equal(teamsLightTheme.borderRadiusMedium);
          const bounds = $root[0].getBoundingClientRect();
          const child = $root.find(entry)[0].getBoundingClientRect();
          expect(child.height).to.be.at.least(minHeights[size]);
          expect(child.height).to.be.at.most(maxHeights[size]);
          expect(bounds.height).to.be.greaterThan(child.height);
          expect(child.left).to.be.at.least(bounds.left);
          expect(child.right).to.be.at.most(bounds.right);
        });
        cy.get('[data-testid="before"]').focus();
        cy.realPress('Tab');
        cy.get(entry).should('be.focused');
        cy.realType('a');
        cy.realPress('Enter');
        cy.realType('b');
        cy.get(entry).should('have.value', 'a\nb');
        cy.get(root).should($root => {
          const style = $root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after');
          expect(style.borderBottomWidth).to.equal(teamsLightTheme.strokeWidthThick);
          expect(style.borderBottomColor).to.equal(rgb(teamsLightTheme.colorCompoundBrandStroke));
          expect(style.transform).to.equal('matrix(1, 0, 0, 1, 0, 0)');
        });
        cy.realPress('Tab');
        cy.get('[data-testid="after"]').should('be.focused');
        cy.get(root).should($root =>
          expect($root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after').transform).to.equal(
            'matrix(0, 0, 0, 1, 0, 0)',
          ),
        );
      });
    }
  }

  for (const resize of ['none', 'horizontal', 'vertical', 'both'] as const) {
    it(`honors actual native ${resize} resize geometry and keeps the wrapper around the resized textarea`, () => {
      render({ resize, textarea: { style: { width: 180, height: 80 } }, defaultValue: 'line one\nline two' });
      cy.get(entry).should('have.css', 'resize', resize);
      dragCorner(60, 45);
      cy.get(entry).should($entry => {
        const bounds = $entry[0].getBoundingClientRect();
        expect(bounds.width).to.be.closeTo(resize === 'horizontal' || resize === 'both' ? 240 : 180, 2);
        expect(bounds.height).to.be.closeTo(resize === 'vertical' || resize === 'both' ? 125 : 80, 2);
        const wrapper = $entry[0].parentElement!.getBoundingClientRect();
        expect(wrapper.width).to.be.closeTo(bounds.width + 2, 1);
        expect(wrapper.height).to.be.closeTo(bounds.height + 4, 1);
      });
      cy.get(entry).should('have.value', 'line one\nline two').realClick();
      cy.realPress(['Control', 'End']);
      cy.realType('x');
      cy.get(entry).should('have.value', 'line one\nline twox');
    });
  }

  for (const size of sizes) {
    it(`bounds ${size} multiline overflow, scrolls to the caret and accepts textarea height overrides`, () => {
      const lines = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
      render({ size, rows: 40, defaultValue: lines, textarea: { style: { width: 180 } } });
      cy.get(entry).should($entry => {
        const element = native($entry);
        expect(element.getBoundingClientRect().height).to.equal(maxHeights[size]);
        expect(element.scrollHeight).to.be.greaterThan(element.clientHeight);
      });
      cy.get(entry).realClick();
      cy.realPress(['Control', 'End']);
      cy.realPress('Enter');
      cy.realType('last');
      cy.get(entry).should('have.value', `${lines}\nlast`);
      cy.get(entry).should($entry => expect(native($entry).scrollTop).to.be.greaterThan(0));
    });
  }

  it('supports the controlled story 50 character boundary with accepted and rejected edits', () => {
    const change = cy.stub().as('change');
    const Controlled = () => {
      const [value, setValue] = React.useState('a'.repeat(49));
      return (
        <Textarea
          data-testid="entry"
          aria-label="Limited entry"
          value={value}
          onChange={(event, data) => {
            change(event, data);
            if (data.value.length <= 50) {
              setValue(data.value);
            }
          }}
        />
      );
    };
    mount(<Controlled />);
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realType('b');
    cy.get(entry).should('have.value', `${'a'.repeat(49)}b`);
    cy.realType('c');
    cy.get(entry).should('have.value', `${'a'.repeat(49)}b`);
    cy.get(entry).then($entry => {
      expect(change.callCount).to.equal(2);
      assertChange(change.firstCall.args, `${'a'.repeat(49)}b`, native($entry));
      assertChange(change.lastCall.args, `${'a'.repeat(49)}bc`, native($entry));
    });
  });

  it('reports exact uncontrolled input values and no additional change on blur', () => {
    const change = cy.stub().as('change');
    const input = cy.stub().as('input');
    render({ defaultValue: 'start', onChange: change, onInput: event => input(event.type, event.currentTarget.value) });
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realType('a');
    cy.realPress('Enter');
    cy.realType('b');
    cy.get(entry)
      .should('have.value', 'starta\nb')
      .then($entry => {
        expect(change.callCount).to.equal(3);
        ['starta', 'starta\n', 'starta\nb'].forEach((value, index) =>
          assertChange(change.getCall(index).args, value, native($entry)),
        );
        expect(input.args).to.deep.equal([
          ['input', 'starta'],
          ['input', 'starta\n'],
          ['input', 'starta\nb'],
        ]);
      });
    cy.realPress('Tab');
    cy.get('@change').should('have.been.calledThrice');
  });

  it('uses textarea slot height overrides rather than pretending to support auto-grow', () => {
    render({ rows: 40, textarea: { style: { height: 360, maxHeight: 'none' } } });
    cy.get(entry).should('have.css', 'max-height', 'none');
    cy.get(entry).should($entry => expect($entry[0].getBoundingClientRect().height).to.equal(360));
    cy.get(root).should($root => expect($root[0].getBoundingClientRect().height).to.equal(364));
  });
});

describe('Textarea unit and source-derived boundaries', () => {
  for (const { name, value, expected } of [
    { name: 'empty', value: '', expected: '' },
    { name: 'zero', value: '0', expected: '0' },
    { name: 'whitespace and tabs', value: '  \t\n ', expected: '  \t\n ' },
    {
      name: 'Unicode',
      value: 'caf\u00e9 \u65e5\u672c\u8a9e \ud83d\ude00',
      expected: 'caf\u00e9 \u65e5\u672c\u8a9e \ud83d\ude00',
    },
    { name: 'CRLF and CR normalization', value: 'a\r\nb\rc\n', expected: 'a\nb\nc\n' },
  ]) {
    for (const controlled of [false, true]) {
      it(`preserves ${name} through ${
        controlled ? 'value' : 'defaultValue'
      } and native form newline normalization`, () => {
        const change = cy.stub().as('change');
        mount(
          <form>
            <Textarea
              data-testid="entry"
              aria-label="Entry"
              name="fluent"
              {...(controlled ? { value } : { defaultValue: value })}
              onChange={change}
            />
            <textarea name="native" data-testid="native" defaultValue={value} />
          </form>,
        );
        cy.get(entry).should('have.value', expected);
        cy.get('[data-testid="native"]').should('have.value', expected);
        cy.get(entry).should($entry => {
          const form = native($entry).form!;
          const data = new FormData(form);
          expect(data.get('fluent')).to.equal(expected).and.equal(data.get('native'));
        });
        cy.get('@change').should('not.have.been.called');
      });
    }
  }

  it('prefers value over defaultValue and reports proposed edits without mutating a fixed controlled value', () => {
    const change = cy.stub().as('change');
    render({ value: 'fixed', defaultValue: 'ignored', onChange: change });
    cy.get(entry).should('have.value', 'fixed').realClick();
    cy.realPress(['Control', 'End']);
    cy.realPress('Enter');
    cy.get(entry).should('have.value', 'fixed');
    cy.get(entry).then($entry => assertChange(change.firstCall.args, 'fixed\n', native($entry)));
    cy.get('@change').should('have.been.calledOnce');
  });

  for (const controlled of [false, true]) {
    it(`rerenders ${
      controlled ? 'controlled' : 'default'
    } values with only the latest change and input callbacks`, () => {
      const first = cy.stub().as('first');
      const latest = cy.stub().as('latest');
      const firstInput = cy.stub().as('firstInput');
      const latestInput = cy.stub().as('latestInput');
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <Textarea
              data-testid="entry"
              aria-label="Entry"
              {...(controlled ? { value: updated ? 'new' : 'old' } : { defaultValue: updated ? 'new' : 'old' })}
              onChange={updated ? latest : first}
              onInput={updated ? latestInput : firstInput}
            />
            <button onClick={() => setUpdated(true)}>Update</button>
          </>
        );
      };
      mount(<Fixture />);
      cy.get(entry).realClick();
      cy.realPress(['Control', 'End']);
      cy.realType('x');
      cy.get(entry).should('have.value', controlled ? 'old' : 'oldx');
      cy.contains('button', 'Update').realClick();
      cy.get(entry).should('have.value', controlled ? 'new' : 'oldx');
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@latest').should('not.have.been.called');
      cy.get(entry).realClick();
      cy.realPress(['Control', 'End']);
      cy.realType('y');
      cy.get(entry)
        .should('have.value', controlled ? 'new' : 'oldxy')
        .then($entry => {
          assertChange(first.firstCall.args, 'oldx', native($entry));
          assertChange(latest.firstCall.args, controlled ? 'newy' : 'oldxy', native($entry));
        });
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@firstInput').should('have.been.calledOnce');
      cy.get('@latest').should('have.been.calledOnce');
      cy.get('@latestInput').should('have.been.calledOnce');
    });
  }

  it('updates controlled empty and multiline values without reporting user input', () => {
    const change = cy.stub().as('change');
    const Fixture = () => {
      const [value, setValue] = React.useState('old');
      return (
        <>
          <Textarea data-testid="entry" aria-label="Entry" value={value} onChange={change} />
          <button onClick={() => setValue('')}>Empty</button>
          <button onClick={() => setValue('new\r\nline')}>Multiline</button>
        </>
      );
    };
    mount(<Fixture />);
    cy.contains('button', 'Empty').realClick();
    cy.get(entry).should('have.value', '');
    cy.contains('button', 'Multiline').realClick();
    cy.get(entry).should('have.value', 'new\nline');
    cy.get('@change').should('not.have.been.called');
  });

  it('removes and restores onChange handlers without losing uncontrolled editing state', () => {
    const change = cy.stub().as('change');
    const Fixture = () => {
      const [listening, setListening] = React.useState(true);
      return (
        <>
          <Textarea data-testid="entry" aria-label="Entry" onChange={listening ? change : undefined} />
          <button onClick={() => setListening(!listening)}>Toggle</button>
        </>
      );
    };
    mount(<Fixture />);
    cy.get(entry).realClick();
    cy.realType('a');
    cy.contains('button', 'Toggle').realClick();
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realType('b');
    cy.get(entry).should('have.value', 'ab');
    cy.get('@change').should('have.been.calledOnce');
    cy.contains('button', 'Toggle').realClick();
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realType('c');
    cy.get(entry).should('have.value', 'abc');
    cy.get('@change').should('have.been.calledTwice');
  });

  it('forwards synthetic composition lifecycle events without claiming OS IME input coverage', () => {
    const composition = cy.stub().as('composition');
    const change = cy.stub().as('change');
    const record = (event: React.CompositionEvent<HTMLTextAreaElement>) =>
      composition(event.type, event.data, event.target, event.currentTarget, event.nativeEvent.type);
    render({ onCompositionStart: record, onCompositionUpdate: record, onCompositionEnd: record, onChange: change });
    cy.get(entry).then($entry => {
      const element = native($entry);
      const view = element.ownerDocument.defaultView!;
      for (const type of ['compositionstart', 'compositionupdate', 'compositionend']) {
        element.dispatchEvent(new view.CompositionEvent(type, { bubbles: true, data: 'composed' }));
      }
      expect(composition.args).to.deep.equal([
        ['compositionstart', 'composed', element, element, 'compositionstart'],
        ['compositionupdate', 'composed', element, element, 'compositionupdate'],
        ['compositionend', 'composed', element, element, 'compositionend'],
      ]);
    });
    cy.get(entry).should('have.value', '');
    cy.get('@change').should('not.have.been.called');
    cy.get(entry).realClick();
    cy.realType('x');
    cy.get(entry).should('have.value', 'x');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('retains component-owned change/value state and textarea native-event slot precedence', () => {
    const change = cy.stub().as('change');
    const slotChange = cy.stub().as('slotChange');
    const input = cy.stub().as('input');
    const slotInput = cy.stub().as('slotInput');
    render({
      defaultValue: 'seed',
      onChange: change,
      onInput: input,
      textarea: { onChange: slotChange, onInput: slotInput, value: 'slot-value', title: 'slot-title' },
      title: 'top-title',
    });
    cy.get(entry).should('have.value', 'seed').and('have.attr', 'title', 'slot-title').realClick();
    cy.realPress(['Control', 'End']);
    cy.realType('x');
    cy.get(entry).should('have.value', 'seedx');
    cy.get('@change').should('have.been.calledOnce');
    cy.get('@slotChange').should('not.have.been.called');
    cy.get('@input').should('not.have.been.called');
    cy.get('@slotInput').should('have.been.calledOnce');
  });

  it('toggles disabled, readonly and native constraints without replacing the textarea or losing its value', () => {
    const change = cy.stub().as('change');
    const Fixture = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <Textarea
            data-testid="entry"
            aria-label="Entry"
            resize="both"
            disabled={phase === 1}
            readOnly={phase === 2}
            required={phase === 1}
            minLength={phase === 2 ? 2 : undefined}
            maxLength={phase === 2 ? 4 : undefined}
            rows={phase === 2 ? 8 : 2}
            cols={phase === 2 ? 30 : 20}
            wrap={phase === 2 ? 'off' : 'soft'}
            onChange={change}
          />
          <button onClick={() => setPhase((phase + 1) % 3)}>Next</button>
        </>
      );
    };
    mount(<Fixture />);
    cy.get(entry).realClick();
    cy.realType('keep');
    cy.get(entry).then($entry => {
      const original = $entry[0];
      cy.contains('button', 'Next').realClick();
      cy.get(entry).should('be.disabled').and('have.value', 'keep').and('have.css', 'resize', 'none');
      cy.contains('button', 'Next').realClick();
      cy.get(entry).should('not.be.disabled').and('have.prop', 'readOnly', true).and('have.css', 'resize', 'both');
      cy.get(entry).should('have.attr', 'minlength', '2').and('have.attr', 'maxlength', '4');
      cy.get(entry).should('have.attr', 'rows', '8').and('have.attr', 'cols', '30').and('have.attr', 'wrap', 'off');
      cy.get(entry).should($next => expect($next[0]).to.equal(original));
    });
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realType('x');
    cy.get(entry).should('have.value', 'keep');
    cy.contains('button', 'Next').realClick();
    cy.get(entry).should('have.prop', 'readOnly', false);
    cy.get(entry).should('not.have.attr', 'minlength');
    cy.get(entry).should('not.have.attr', 'maxlength');
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realType('x');
    cy.get(entry).should('have.value', 'keepx');
    cy.get('@change').should('have.callCount', 5);
  });

  for (const size of sizes) {
    it(`clamps real vertical resizing at both ${size} height boundaries`, () => {
      render({ size, resize: 'vertical', textarea: { style: { width: 180, height: 100 } } });
      dragCorner(0, 400);
      cy.get(entry).should($entry => expect($entry[0].getBoundingClientRect().height).to.equal(maxHeights[size]));
      dragCorner(0, -400);
      cy.get(entry).should($entry => expect($entry[0].getBoundingClientRect().height).to.equal(minHeights[size]));
    });
  }

  it('does not permit the disabled native resize handle to change geometry', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Textarea
          data-testid="entry"
          aria-label="Entry"
          disabled
          resize="both"
          textarea={{ style: { width: 180, height: 80 } }}
        />
        <textarea
          data-testid="native"
          disabled
          style={{ resize: 'both', boxSizing: 'border-box', width: 180, height: 80 }}
        />
      </FluentProvider>,
    );
    cy.get(entry).should('have.css', 'resize', 'none');
    dragCorner(60, 45);
    cy.get(entry).should($entry => {
      const bounds = $entry[0].getBoundingClientRect();
      expect(bounds.width).to.equal(180);
      expect(bounds.height).to.equal(80);
    });
    // Chromium does not disable resizing merely because a native textarea is disabled.
    dragCorner(60, 45, '[data-testid="native"]');
    cy.get('[data-testid="native"]').should($native => {
      expect($native[0].getBoundingClientRect().width).to.be.closeTo(240, 2);
      expect($native[0].getBoundingClientRect().height).to.be.closeTo(125, 2);
    });
  });

  it('forwards corrected native properties dynamically, honors slot overrides and captures invalid before bubbling', () => {
    const events = cy.stub().as('events');
    const topInvalid = cy.stub().as('topInvalid');
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <Textarea
            data-testid="entry"
            aria-label="Entry"
            required
            minLength={3}
            autoComplete="off"
            onInvalid={topInvalid}
            onInvalidCapture={event => events('capture', event.currentTarget)}
            textarea={
              updated
                ? { minLength: 4, autoComplete: 'on', onInvalid: event => events('slot', event.currentTarget) }
                : undefined
            }
          />
          <button onClick={() => setUpdated(true)}>Update</button>
        </>
      );
    };
    mount(<Fixture />);
    cy.get(entry).should('have.attr', 'minlength', '3').and('have.attr', 'autocomplete', 'off');
    cy.contains('button', 'Update').realClick();
    cy.get(entry)
      .should('have.attr', 'minlength', '4')
      .and('have.attr', 'autocomplete', 'on')
      .then($entry => {
        const element = native($entry);
        expect(element.checkValidity()).to.equal(false);
        expect(events.args).to.deep.equal([
          ['capture', element],
          ['slot', element],
        ]);
      });
    cy.get('@topInvalid').should('not.have.been.called');
    cy.get(root).should('not.have.attr', 'minlength');
    cy.get(root).should('not.have.attr', 'autocomplete');
  });

  it('prevents a native Enter edit when the consumer cancels keydown, with normal Enter as positive control', () => {
    const Fixture = () => {
      const [cancel, setCancel] = React.useState(true);
      return (
        <>
          <Textarea
            data-testid="entry"
            aria-label="Entry"
            defaultValue="seed"
            onKeyDown={event => {
              if (cancel && event.key === 'Enter') {
                event.preventDefault();
              }
            }}
          />
          <button onClick={() => setCancel(false)}>Allow</button>
        </>
      );
    };
    mount(<Fixture />);
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realPress('Enter');
    cy.get(entry).should('have.value', 'seed');
    cy.contains('button', 'Allow').realClick();
    cy.get(entry).realClick();
    cy.realPress(['Control', 'End']);
    cy.realPress('Enter');
    cy.get(entry).should('have.value', 'seed\n');
  });

  it('normalizes native LF values to CRLF in an actual browser URL-encoded form POST', () => {
    cy.intercept('POST', '/textarea-native-submit', {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: 'Submitted',
    }).as('submission');
    mount(
      <>
        <iframe name="textarea-submission" title="Submission result" />
        <form action="/textarea-native-submit" method="post" target="textarea-submission">
          <Textarea data-testid="entry" aria-label="Entry" name="fluent" defaultValue={'a\r\nb\rc\n'} />
          <textarea name="native" defaultValue={'a\r\nb\rc\n'} />
          <button type="submit">Submit</button>
        </form>
      </>,
    );
    cy.get(entry).should('have.value', 'a\nb\nc\n');
    cy.contains('button', 'Submit').realClick();
    cy.wait('@submission')
      .its('request.body')
      .should('equal', 'fluent=a%0D%0Ab%0D%0Ac%0D%0A&native=a%0D%0Ab%0D%0Ac%0D%0A');
  });

  for (const appearance of ['outline', 'filled-darker', 'filled-lighter'] as const) {
    it(`inherits ${appearance} from the appearance context but preserves an explicit component override`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <OverridesProvider_unstable value={{ inputDefaultAppearance: appearance }}>
            <Textarea data-testid="entry" aria-label="Inherited" />
            <Textarea data-testid="explicit" aria-label="Explicit" appearance="outline" />
          </OverridesProvider_unstable>
        </FluentProvider>,
      );
      cy.get(entry)
        .parent()
        .should(
          'have.css',
          'background-color',
          rgb(
            appearance === 'filled-darker'
              ? teamsLightTheme.colorNeutralBackground3
              : teamsLightTheme.colorNeutralBackground1,
          ),
        );
      cy.get('[data-testid="explicit"]')
        .parent()
        .should('have.css', 'border-bottom-color', rgb(teamsLightTheme.colorNeutralStrokeAccessible));
      cy.get(entry).realClick();
      cy.realType('x');
      cy.get(entry).should('have.value', 'x');
    });
  }

  for (const appearance of appearances) {
    it(`refreshes ${appearance} theme tokens and placeholder styling without remounting`, () => {
      const Fixture = () => {
        const [dark, setDark] = React.useState(false);
        return (
          <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme}>
            <Textarea data-testid="entry" aria-label="Entry" appearance={appearance} placeholder="Hint" />
            <button onClick={() => setDark(!dark)}>Theme</button>
          </FluentProvider>
        );
      };
      mount(<Fixture />);
      cy.get(entry).should('have.css', 'color', rgb(teamsLightTheme.colorNeutralForeground1));
      cy.get(entry).then($entry => {
        const original = $entry[0];
        expect(original.ownerDocument.defaultView!.getComputedStyle(original, '::placeholder').color).to.equal(
          rgb(teamsLightTheme.colorNeutralForeground4),
        );
        cy.contains('button', 'Theme').realClick();
        cy.get(entry).should($next => {
          expect($next[0]).to.equal(original);
          expect(original.ownerDocument.defaultView!.getComputedStyle(original, '::placeholder').color).to.equal(
            rgb(teamsDarkTheme.colorNeutralForeground4),
          );
        });
      });
      cy.get(entry).should('have.css', 'color', rgb(teamsDarkTheme.colorNeutralForeground1));
      cy.get(root).should(
        'have.css',
        'background-color',
        rgb(
          appearance.startsWith('filled-darker')
            ? teamsDarkTheme.colorNeutralBackground3
            : teamsDarkTheme.colorNeutralBackground1,
        ),
      );
      cy.get(entry).realClick();
      cy.realType('keep');
      cy.contains('button', 'Theme').realClick();
      cy.get(entry).should('have.value', 'keep').and('have.css', 'color', rgb(teamsLightTheme.colorNeutralForeground1));
    });
  }
});
