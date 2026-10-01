import 'cypress-real-events';
import * as React from 'react';
import { flushSync } from 'react-dom';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { Field } from '@fluentui/react-field';
import { Checkbox } from './Checkbox';
import type { CheckboxProps } from './Checkbox.types';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import type { LabelProps } from '@fluentui/react-label';
import { checkboxClassNames } from './useCheckboxStyles.styles';

const input = `.${checkboxClassNames.input}`;
const indicator = `.${checkboxClassNames.indicator}`;
const label = `.${checkboxClassNames.label}`;
const root = `.${checkboxClassNames.root}`;
const values = [false, true, 'mixed'] as const;
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const assertValue = (value: CheckboxProps['checked'], selector = input) =>
  cy
    .get(selector)
    .should('have.prop', 'checked', value === true)
    .and('have.prop', 'indeterminate', value === 'mixed');
const entries = (form: HTMLFormElement) => {
  const result: [string, FormDataEntryValue][] = [];
  new FormData(form).forEach((value, name) => result.push([name, value]));
  return result;
};
const media = (features: { name: string; value: string }[]) =>
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features },
    }),
  );

describe('Checkbox unit-derived updates and composition', () => {
  afterEach(() => media([]));

  it('submits duplicate names and default on value while reflecting dynamic disabled and name/value props', () => {
    const Submission = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <form id="submission">
          <Checkbox label="Default value" defaultChecked name="options" disabled={updated} />
          <Checkbox
            label="Named value"
            defaultChecked
            name={updated ? 'new-name' : 'options'}
            value={updated ? 'new-value' : 'second'}
          />
          <input type="checkbox" defaultChecked name="options" value="native" />
          <button type="button" onClick={() => setUpdated(true)}>
            Update submission
          </button>
        </form>
      );
    };
    mount(<Submission />);
    cy.get('#submission').then($form =>
      expect(entries($form[0] as HTMLFormElement)).to.deep.equal([
        ['options', 'on'],
        ['options', 'second'],
        ['options', 'native'],
      ]),
    );
    cy.contains('button', 'Update submission').click();
    cy.get('#submission').then($form =>
      expect(entries($form[0] as HTMLFormElement)).to.deep.equal([
        ['new-name', 'new-value'],
        ['options', 'native'],
      ]),
    );
    cy.get(`${input}:first`).should('be.disabled').and('be.checked');
    cy.get(`${input}:last`).should('have.attr', 'name', 'new-name').and('have.value', 'new-value').and('be.checked');
  });

  it('updates Field validation and required relationships without changing checked state', () => {
    const Validation = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update validation</button>
          <Field
            label="Dynamic Field"
            hint={updated ? 'New hint' : 'Old hint'}
            required={!updated}
            validationState={updated ? 'success' : 'error'}
            validationMessage={updated ? 'Valid' : 'Invalid'}
          >
            <Checkbox defaultChecked="mixed" />
          </Field>
        </>
      );
    };
    mount(<Validation />);
    cy.get(input).should('have.attr', 'aria-invalid', 'true').and('have.prop', 'required', true);
    cy.contains('button', 'Update validation').click();
    assertValue('mixed');
    cy.get(input).should('have.prop', 'required', false);
    cy.get(input).should('not.have.attr', 'aria-invalid');
    cy.get(input).then($input => {
      const control = $input[0];
      const ids = control.getAttribute('aria-describedby')!.split(' ');
      expect(ids.map(id => control.ownerDocument.getElementById(id)?.textContent)).to.have.members([
        'New hint',
        'Valid',
      ]);
    });
  });

  it('updates native id and label association and keeps generated ids unique between siblings', () => {
    const Identity = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update id</button>
          <Checkbox id={updated ? 'updated-id' : undefined} label="First label" />
          <Checkbox label="Second label" />
        </>
      );
    };
    mount(<Identity />);
    cy.get(input).then($inputs => expect($inputs[0].id).not.to.equal($inputs[1].id));
    cy.contains('button', 'Update id').click();
    cy.get(`${input}:first`).should('have.id', 'updated-id');
    cy.contains(label, 'First label').should('have.attr', 'for', 'updated-id').click();
    assertValue(true, `${input}:first`);
    assertValue(false, `${input}:last`);
  });

  for (const size of ['medium', 'large'] as const) {
    for (const shape of ['square', 'circular'] as const) {
      for (const checked of values) {
        it(`uses the ${size} ${shape} ${checked} indicator glyph without adding accessible content`, () => {
          mount(<Checkbox size={size} shape={shape} checked={checked} label="Glyph" />);
          assertValue(checked);
          cy.get(indicator).should('have.attr', 'aria-hidden', 'true');
          cy.get(indicator)
            .find('svg')
            .should('have.length', checked === false ? 0 : 1);
          if (checked !== false) {
            cy.get(indicator)
              .find('svg')
              .should('have.attr', 'aria-hidden', 'true')
              .then($svg => {
                const glyph = $svg[0].getAttribute('viewBox');
                expect(glyph).to.equal(
                  checked === 'mixed' && shape === 'circular'
                    ? '0 0 20 20'
                    : size === 'large'
                    ? '0 0 16 16'
                    : '0 0 12 12',
                );
              });
          }
        });
      }
    }
  }

  for (const checked of values) {
    it(`uses hover and pressed state tokens for ${checked} and returns to rest`, () => {
      mount(<Checkbox checked={checked} label="Pointer state" />);
      const variable =
        checked === true ? '--fui-Checkbox__indicator--backgroundColor' : '--fui-Checkbox__indicator--borderColor';
      const hover =
        checked === true
          ? teamsLightTheme.colorCompoundBrandBackgroundHover
          : checked === 'mixed'
          ? teamsLightTheme.colorCompoundBrandStrokeHover
          : teamsLightTheme.colorNeutralStrokeAccessibleHover;
      const pressed =
        checked === true
          ? teamsLightTheme.colorCompoundBrandBackgroundPressed
          : checked === 'mixed'
          ? teamsLightTheme.colorCompoundBrandStrokePressed
          : teamsLightTheme.colorNeutralStrokeAccessiblePressed;
      cy.get(input).realHover();
      cy.get(root).should($root =>
        expect(getComputedStyle($root[0]).getPropertyValue(variable).trim()).to.equal(hover),
      );
      cy.get(input).realMouseDown();
      cy.get(root).should($root =>
        expect(getComputedStyle($root[0]).getPropertyValue(variable).trim()).to.equal(pressed),
      );
      cy.get(input).realMouseUp();
      assertValue(checked);
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get(root).should($root =>
        expect(getComputedStyle($root[0]).getPropertyValue(variable).trim()).to.equal(
          checked === true
            ? teamsLightTheme.colorCompoundBrandBackground
            : checked === 'mixed'
            ? teamsLightTheme.colorCompoundBrandStroke
            : '',
        ),
      );
    });
  }

  it('draws the root keyboard focus outline and removes it after Tab leaves', () => {
    mount(
      <>
        <button>Before focus</button>
        <Checkbox label="Focusable" />
        <button>After focus</button>
      </>,
    );
    cy.contains('button', 'Before focus').focus();
    cy.realPress('Tab');
    cy.get(input).should('be.focused');
    cy.get(root).should($root => {
      const outline = getComputedStyle($root[0], '::after');
      expect(outline.content).to.equal('""');
      expect(outline.borderTopStyle).to.equal('solid');
      expect(outline.borderTopWidth).to.equal('2px');
      expect(outline.pointerEvents).to.equal('none');
    });
    cy.realPress('Tab');
    cy.contains('button', 'After focus').should('be.focused');
    cy.get(root).should($root => expect(getComputedStyle($root[0], '::after').content).to.equal('none'));
  });

  for (const value of values) {
    it(`retains controlled ${value} without a state update after mouse and Space`, () => {
      const changes = cy.stub().as('changes');
      mount(<Checkbox checked={value} label="Controlled" onChange={(_, data) => changes(data)} />);
      cy.get(input).realClick();
      assertValue(value);
      cy.realPress('Space');
      assertValue(value);
      cy.get('@changes').should('have.been.calledTwice');
      cy.then(() => expect(changes.args).to.deep.equal([[{ checked: value !== true }], [{ checked: value !== true }]]));
    });

    it(`ignores defaultChecked changes from ${value} but retains the initial reset value`, () => {
      const Updated = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <form>
            <Checkbox defaultChecked={updated ? (value === true ? false : true) : value} label="Default" />
            <button type="button" onClick={() => setUpdated(true)}>
              Update default
            </button>
            <button type="reset">Reset</button>
          </form>
        );
      };
      mount(<Updated />);
      cy.contains('button', 'Update default').click();
      assertValue(value);
      cy.get(input).click();
      assertValue(value !== true);
      cy.contains('button', 'Reset').click();
      assertValue(value);
    });

    it(`keeps current controlled ${value} during reset after a controlled transition`, () => {
      const ControlledReset = () => {
        const [checked, setChecked] = React.useState<CheckboxProps['checked']>(value === true ? false : true);
        return (
          <form>
            <Checkbox checked={checked} label="Controlled" />
            <button type="button" onClick={() => setChecked(value)}>
              Update
            </button>
            <button type="reset">Reset</button>
          </form>
        );
      };
      mount(<ControlledReset />);
      cy.contains('button', 'Update').click();
      assertValue(value);
      cy.contains('button', 'Reset').click();
      assertValue(value);
    });
  }

  it('cycles controlled false true mixed false true mixed with matching native properties and icons', () => {
    const Cycle = () => {
      const [index, setIndex] = React.useState(0);
      return (
        <>
          <Checkbox checked={values[index % values.length]} label="Cycle" />
          <button onClick={() => setIndex(index + 1)}>Next</button>
        </>
      );
    };
    mount(<Cycle />);
    [false, true, 'mixed', false, true, 'mixed'].forEach(value => {
      assertValue(value as CheckboxProps['checked']);
      cy.get(indicator)
        .find('svg')
        .should('have.length', value === false ? 0 : 1);
      cy.contains('button', 'Next').click();
    });
  });

  it('uses latest input and component handlers in order with native payload after rerender', () => {
    const events = cy.stub().as('events');
    const Latest = () => {
      const [generation, setGeneration] = React.useState(0);
      return (
        <>
          <button onClick={() => setGeneration(1)}>Update</button>
          <Checkbox
            name="choice"
            value="selected"
            label="Latest"
            input={{ onChange: event => events('input', generation, event.currentTarget.checked) }}
            onChange={(event, data) =>
              events(
                'component',
                generation,
                event.currentTarget.name,
                event.currentTarget.value,
                event.currentTarget.checked,
                event.currentTarget.indeterminate,
                data,
              )
            }
          />
        </>
      );
    };
    mount(<Latest />);
    cy.get(input).click();
    cy.contains('button', 'Update').click();
    assertValue(true);
    cy.get(input).click();
    cy.then(() =>
      expect(events.args).to.deep.equal([
        ['input', 0, true],
        ['component', 0, 'choice', 'selected', true, false, { checked: true }],
        ['input', 1, false],
        ['component', 1, 'choice', 'selected', false, false, { checked: false }],
      ]),
    );
  });

  it('supports the mixed onChange branch when a native slot handler sets indeterminate', () => {
    const changes = cy.stub().as('changes');
    mount(
      <Checkbox
        label="Native indeterminate"
        input={{
          onChange: event => {
            event.currentTarget.indeterminate = true;
          },
        }}
        onChange={(_, data) => changes(data)}
      />,
    );
    cy.get(input).click();
    assertValue('mixed');
    cy.get('@changes').should('have.been.calledOnceWithExactly', { checked: 'mixed' });
  });

  it('partitions native attributes, root style and all slot refs without losing input synchronization', () => {
    const rootRef = React.createRef<HTMLSpanElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const indicatorRef = React.createRef<HTMLDivElement>();
    const labelRef = React.createRef<HTMLLabelElement>();
    const forwarded = cy.stub().as('forwarded');
    mount(
      <Checkbox
        id="native-id"
        title="Native title"
        name="choice"
        value="yes"
        tabIndex={-1}
        aria-label="Native name"
        checked="mixed"
        className="consumer-root"
        style={{ marginTop: '11px' }}
        ref={forwarded}
        root={{ ref: rootRef }}
        input={{ ref: inputRef, className: 'consumer-input' }}
        indicator={{ ref: indicatorRef, className: 'consumer-indicator' }}
        label={{ ref: labelRef, children: 'Label', className: 'consumer-label' }}
      />,
    );
    cy.get(root).should('have.class', 'consumer-root').and('have.css', 'margin-top', '11px');
    cy.get(root).should('not.have.attr', 'title');
    cy.get(root).should('not.have.attr', 'name');
    cy.get(input)
      .should('have.id', 'native-id')
      .and('have.attr', 'title', 'Native title')
      .and('have.attr', 'name', 'choice')
      .and('have.value', 'yes')
      .and('have.attr', 'tabindex', '-1')
      .and('have.attr', 'aria-label', 'Native name')
      .and('have.class', 'consumer-input');
    assertValue('mixed');
    cy.get(label).should('have.attr', 'for', 'native-id').and('have.class', 'consumer-label');
    cy.get(indicator).should('have.class', 'consumer-indicator');
    cy.get(input).then($input => {
      expect(inputRef.current).to.equal($input[0]);
      expect(forwarded).not.to.have.been.called;
      expect(rootRef.current).to.equal($input[0].parentElement);
      expect(indicatorRef.current?.classList.contains(checkboxClassNames.indicator)).to.equal(true);
      expect(labelRef.current?.htmlFor).to.equal('native-id');
    });
  });

  it('gives explicit input slot native attributes precedence over top-level props', () => {
    mount(
      <Checkbox
        id="outer"
        name="outer"
        value="outer"
        aria-label="Outer"
        input={{ id: 'inner', name: 'inner', value: 'inner', 'aria-label': 'Inner', disabled: true }}
        label={{ children: 'Slot label', htmlFor: 'inner' }}
      />,
    );
    cy.get(input)
      .should('have.id', 'inner')
      .and('have.attr', 'name', 'inner')
      .and('have.value', 'inner')
      .and('have.attr', 'aria-label', 'Inner')
      .and('be.disabled');
    cy.get(label).should('have.attr', 'for', 'inner');
  });

  it('renders custom and null indicator and optional label without replacing native semantics', () => {
    mount(
      <>
        <Checkbox defaultChecked indicator={<span data-testid="custom-icon">Custom</span>} label="Custom" />
        <Checkbox indicator={null} label={null} aria-label="No visual slots" style={{ minHeight: '32px' }} />
      </>,
    );
    cy.get(indicator).should('have.length', 1).find('[data-testid="custom-icon"]').should('have.text', 'Custom');
    cy.get(label).should('have.length', 1);
    cy.get(input).should('have.length', 2);
    cy.get(`${input}:last`).click();
    assertValue(true, `${input}:last`);
  });

  it('supports render functions for root indicator and Label preserving supplied props', () => {
    const renderRoot: SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> = (Component, props) => (
      <Component {...props} data-testid="render-root" />
    );
    const renderIndicator: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props} data-testid="render-indicator">
        <span>Custom icon</span>
      </Component>
    );
    const renderLabel: SlotRenderFunction<LabelProps> = (Component, props) => (
      <Component {...props} data-testid="render-label">
        Rendered label
      </Component>
    );
    mount(
      <Checkbox
        defaultChecked="mixed"
        root={{ children: renderRoot }}
        input={{ className: 'render-input' }}
        indicator={{ children: renderIndicator }}
        label={{ children: renderLabel }}
      />,
    );
    cy.get('[data-testid="render-root"]').should('have.class', checkboxClassNames.root);
    cy.get('.render-input').should('have.attr', 'type', 'checkbox');
    cy.get('[data-testid="render-indicator"]')
      .should('have.attr', 'aria-hidden', 'true')
      .and('have.text', 'Custom icon')
      .find('svg')
      .should('not.exist');
    assertValue('mixed');
    cy.get('[data-testid="render-label"]').click();
    assertValue(true);
  });

  it('updates disabled, required, size, shape, placement and theme without losing checked state', () => {
    const Dynamic = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider theme={updated ? teamsDarkTheme : teamsLightTheme} dir={updated ? 'rtl' : 'ltr'}>
          <button onClick={() => setUpdated(!updated)}>Update</button>
          <Checkbox
            label="Dynamic"
            defaultChecked="mixed"
            disabled={updated}
            required={updated}
            size={updated ? 'large' : 'medium'}
            shape={updated ? 'circular' : 'square'}
            labelPosition={updated ? 'before' : 'after'}
          />
        </FluentProvider>
      );
    };
    mountBase(<Dynamic />);
    cy.contains('button', 'Update').click();
    assertValue('mixed');
    cy.get(input).should('be.disabled').and('have.prop', 'required', true);
    cy.get(indicator).should('have.css', 'width', '20px').and('have.css', 'border-top-left-radius', '10000px');
    cy.contains(label, 'Dynamic').realClick();
    assertValue('mixed');
    cy.contains('button', 'Update').click();
    cy.get(input).should('not.be.disabled').and('have.prop', 'required', false).focus();
    cy.realPress('Space');
    assertValue(true);
    cy.get(indicator).should('have.css', 'width', '16px').and('have.css', 'border-top-left-radius', '2px');
  });

  it('cancels native reset and follows dynamically reassigned external form ownership', () => {
    const Ownership = () => {
      const [second, setSecond] = React.useState(false);
      const [cancel, setCancel] = React.useState(true);
      return (
        <>
          <form id="first">
            <button type="reset">Reset first</button>
          </form>
          <form
            id="second"
            onReset={event => {
              if (cancel) {
                event.preventDefault();
              }
            }}
          >
            <button type="reset">Reset second</button>
          </form>
          <Checkbox label="External" form={second ? 'second' : 'first'} defaultChecked="mixed" />
          <input type="checkbox" form="first" defaultChecked aria-label="Native external" />
          <button onClick={() => setSecond(true)}>Reassign</button>
          <button onClick={() => setCancel(false)}>Allow reset</button>
        </>
      );
    };
    mount(<Ownership />);
    cy.get(input).click();
    cy.get('[aria-label="Native external"]').click();
    cy.contains('button', 'Reassign').click();
    cy.contains('button', 'Reset first').click();
    assertValue(true);
    cy.get('[aria-label="Native external"]').should('be.checked');
    cy.contains('button', 'Reset second').click();
    assertValue(true);
    cy.contains('button', 'Allow reset').click();
    cy.contains('button', 'Reset second').click();
    assertValue('mixed');
    cy.get('#second').then($form => expect(entries($form[0] as HTMLFormElement)).to.deep.equal([]));
  });

  it('resets via the native form method and ignores unrelated form reset', () => {
    mount(
      <>
        <form id="owner">
          <Checkbox label="Choice" defaultChecked />
        </form>
        <form id="unrelated" />
      </>,
    );
    cy.get(input).click();
    assertValue(false);
    cy.get('#unrelated').then($form => ($form[0] as HTMLFormElement).reset());
    assertValue(false);
    cy.get('#owner').then($form => ($form[0] as HTMLFormElement).reset());
    assertValue(true);
  });

  it('cleans up reset listeners and forwarded refs on unmount then starts a fresh uncontrolled instance', () => {
    const ref = cy.stub().as('ref');
    const Lifecycle = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <form id="lifecycle">
          <button type="button" onClick={() => setVisible(!visible)}>
            Toggle mount
          </button>
          {visible && <Checkbox defaultChecked="mixed" label="Lifecycle" ref={ref} />}
        </form>
      );
    };
    mount(<Lifecycle />);
    cy.get(input).click();
    assertValue(true);
    cy.contains('button', 'Toggle mount').click();
    cy.get(input).should('not.exist');
    cy.get('@ref').should('have.been.calledWith', null);
    cy.get('#lifecycle').then($form => ($form[0] as HTMLFormElement).reset());
    cy.contains('button', 'Toggle mount').click();
    assertValue('mixed');
  });

  for (const value of values) {
    it(`reads latest controlled ${value} after reset and a same-tick committed update without listener churn`, () => {
      const changes = cy.stub().as('changes');
      let update: () => void;
      const PendingReset = () => {
        const [checked, setChecked] = React.useState<CheckboxProps['checked']>(value === true ? 'mixed' : true);
        update = () => setChecked(value);
        return (
          <form id="pending-reset">
            <Checkbox checked={checked} onChange={changes} />
          </form>
        );
      };
      cy.document().then(doc => {
        const add = cy.spy(doc, 'addEventListener');
        const remove = cy.spy(doc, 'removeEventListener');
        mount(<PendingReset />);
        cy.get(input).then($input => {
          const element = $input[0] as HTMLInputElement;
          const resets = () => add.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
          const removals = () => remove.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
          // The shared mount helper replays mount effects once under StrictMode.
          expect(resets()).to.have.length(2);
          expect(removals()).to.have.length(1);
          expect(removals()[0].args).to.deep.equal(resets()[0].args);
          const original = resets()[1].args[1];
          element.form!.reset();
          flushSync(() => update());
          expect(resets()).to.have.length(2);
          expect(resets()[1].args[1]).to.equal(original);
          expect(removals()).to.have.length(1);
        });
      });
      assertValue(value);
      cy.get('@changes').should('not.have.been.called');
    });
  }

  for (const refSlot of ['forwarded', 'input'] as const) {
    for (const value of values) {
      it(`preserves queued controlled ${value} with changing inline ${refSlot} refs`, () => {
        const notifications = cy.stub();
        const changes = cy.stub().as('changes');
        let update: () => void;
        let hide: () => void;
        let detached: HTMLInputElement;
        const PendingInlineRef = () => {
          const [revision, setRevision] = React.useState(0);
          const [visible, setVisible] = React.useState(true);
          update = () => setRevision(1);
          hide = () => setVisible(false);
          const ref = (node: HTMLInputElement | null) => notifications(revision, node);
          return (
            <form>
              {visible && (
                <Checkbox
                  checked={revision === 0 ? (value === true ? 'mixed' : true) : value}
                  onChange={changes}
                  ref={refSlot === 'forwarded' ? ref : undefined}
                  input={refSlot === 'input' ? { ref } : undefined}
                />
              )}
            </form>
          );
        };
        cy.document().then(doc => {
          const add = cy.spy(doc, 'addEventListener');
          const remove = cy.spy(doc, 'removeEventListener');
          mount(<PendingInlineRef />);
          cy.get(input).then($input => {
            detached = $input[0] as HTMLInputElement;
            const resets = () => add.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
            const removals = () => remove.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
            const calls = () => notifications.getCalls().map(call => call.args);
            expect(resets()).to.have.length(2);
            expect(removals()).to.have.length(1);
            expect(removals()[0].args).to.deep.equal(resets()[0].args);
            const original = resets()[1].args;
            // StrictMode replays callback attachment alongside mount effects.
            expect(calls()).to.deep.equal([
              [0, detached],
              [0, null],
              [0, detached],
            ]);
            detached.form!.reset();
            flushSync(() => update());
            expect(calls()).to.deep.equal([
              [0, detached],
              [0, null],
              [0, detached],
              [0, null],
              [1, detached],
            ]);
            expect(resets()).to.have.length(2);
            expect(resets()[1].args).to.deep.equal(original);
            expect(removals()).to.have.length(1);
          });
          assertValue(value);
          cy.then(() => {
            detached.form!.reset();
            flushSync(() => hide());
            expect(notifications.getCalls().map(call => call.args)).to.deep.equal([
              [0, detached],
              [0, null],
              [0, detached],
              [0, null],
              [1, detached],
              [1, null],
            ]);
            const resets = add.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
            const removals = remove.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
            expect(resets).to.have.length(2);
            expect(removals).to.have.length(2);
            expect(removals[1].args).to.deep.equal(resets[1].args);
            // Oppose both properties that a stale controlled correction would write.
            detached.checked = value !== true;
            detached.indeterminate = value !== 'mixed';
          });
        });
        cy.get(input).should('not.exist');
        cy.then(() => {
          expect(detached.checked).to.equal(value !== true);
          expect(detached.indeterminate).to.equal(value !== 'mixed');
        });
        cy.get('@changes').should('not.have.been.called');
      });
    }

    it(`restores pending uncontrolled reset with changing inline ${refSlot} refs and default props`, () => {
      const notifications = cy.stub();
      const changes = cy.stub().as('changes');
      let update: () => void;
      const PendingDefaultRef = () => {
        const [revision, setRevision] = React.useState(0);
        update = () => setRevision(1);
        const ref = (node: HTMLInputElement | null) => notifications(revision, node);
        return (
          <form>
            <Checkbox
              defaultChecked={revision === 0 ? 'mixed' : true}
              onChange={changes}
              ref={refSlot === 'forwarded' ? ref : undefined}
              input={refSlot === 'input' ? { ref } : undefined}
            />
          </form>
        );
      };
      mount(<PendingDefaultRef />);
      cy.get(input).click();
      cy.get(input).then($input => {
        const element = $input[0] as HTMLInputElement;
        element.form!.reset();
        flushSync(() => update());
        expect(notifications.getCalls().map(call => call.args)).to.deep.equal([
          [0, element],
          [0, null],
          [0, element],
          [0, null],
          [1, element],
        ]);
      });
      assertValue('mixed');
      cy.get(indicator).find('svg').should('exist');
      cy.get('@changes').should('have.been.calledOnce');
    });
  }

  it('follows replacement input nodes without correcting the detached reset target', () => {
    const notifications = cy.stub();
    const changes = cy.stub().as('changes');
    let replace: () => void;
    let original: HTMLInputElement;
    const Replacement = () => {
      const [revision, setRevision] = React.useState(0);
      replace = () => setRevision(1);
      const renderRoot: SlotRenderFunction<React.ComponentProps<'span'>> = (Component, props) => (
        <Component key={revision} {...props} />
      );
      return (
        <form>
          <Checkbox defaultChecked="mixed" onChange={changes} ref={notifications} root={{ children: renderRoot }} />
        </form>
      );
    };
    cy.document().then(doc => {
      const add = cy.spy(doc, 'addEventListener');
      const remove = cy.spy(doc, 'removeEventListener');
      mount(<Replacement />);
      cy.get(input).then($input => {
        original = $input[0] as HTMLInputElement;
        original.form!.reset();
        flushSync(() => replace());
        original.checked = true;
        original.indeterminate = false;
        const resets = add.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
        const removals = remove.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
        expect(resets).to.have.length(2);
        expect(removals).to.have.length(1);
        expect(removals[0].args).to.deep.equal(resets[0].args);
      });
    });
    assertValue('mixed');
    cy.get(input).then($input => {
      const replacement = $input[0] as HTMLInputElement;
      expect(replacement).not.to.equal(original);
      expect(notifications.getCalls().map(call => call.args)).to.deep.equal([
        [original],
        [null],
        [original],
        [null],
        [replacement],
        [null],
        [replacement],
      ]);
      expect(original.checked).to.equal(true);
      expect(original.indeterminate).to.equal(false);
    });
    cy.get(input).click();
    assertValue(true);
    cy.get(input).then($input => ($input[0] as HTMLInputElement).form!.reset());
    assertValue('mixed');
    cy.get('@changes').should('have.been.calledOnce');
  });

  it('restores the initial uncontrolled baseline after reset and a same-tick native state update', () => {
    const changes = cy.stub().as('changes');
    mount(
      <form>
        <Checkbox defaultChecked="mixed" onChange={changes} />
      </form>,
    );
    cy.get(input).then($input => {
      const element = $input[0] as HTMLInputElement;
      element.form!.reset();
      flushSync(() => element.click());
      expect(element.indeterminate).to.equal(false);
    });
    assertValue('mixed');
    cy.get(indicator).find('svg').should('exist');
    cy.get('@changes').should('have.been.calledOnce');
    cy.get(input).click();
    assertValue(true);
    cy.get('@changes').should('have.been.calledTwice');
  });

  it('cancels queued correction on actual unmount and removes the same reset listener', () => {
    const changes = cy.stub().as('changes');
    let hide: () => void;
    let detached: HTMLInputElement;
    const PendingUnmount = () => {
      const [visible, setVisible] = React.useState(true);
      hide = () => setVisible(false);
      return <form id="pending-unmount">{visible && <Checkbox defaultChecked="mixed" onChange={changes} />}</form>;
    };
    cy.document().then(doc => {
      const add = cy.spy(doc, 'addEventListener');
      const remove = cy.spy(doc, 'removeEventListener');
      mount(<PendingUnmount />);
      cy.get(input).click();
      cy.get(input).then($input => {
        detached = $input[0] as HTMLInputElement;
        detached.form!.reset();
        flushSync(() => hide());
        const resets = add.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
        const removals = remove.getCalls().filter(call => call.args[0] === 'reset' && call.args[2] === true);
        expect(resets).to.have.length(2);
        expect(removals).to.have.length(2);
        expect(removals[0].args).to.deep.equal(resets[0].args);
        expect(removals[1].args).to.deep.equal(resets[1].args);
      });
    });
    cy.get(input).should('not.exist');
    cy.then(() => {
      expect(detached.indeterminate).to.equal(false);
      const before = [detached.checked, detached.indeterminate];
      cy.get('#pending-unmount').then($form => {
        ($form[0] as HTMLFormElement).reset();
        return Promise.resolve().then(() => expect([detached.checked, detached.indeterminate]).to.deep.equal(before));
      });
    });
    cy.get('@changes').should('have.been.calledOnce');
  });

  it('ignores queued reset from a former form owner after a same-tick reassignment', () => {
    const changes = cy.stub().as('changes');
    let reassign: () => void;
    const Reassignment = () => {
      const [second, setSecond] = React.useState(false);
      reassign = () => setSecond(true);
      return (
        <>
          <form id="former-owner" />
          <form id="current-owner" />
          <Checkbox form={second ? 'current-owner' : 'former-owner'} defaultChecked="mixed" onChange={changes} />
        </>
      );
    };
    mount(<Reassignment />);
    cy.get(input).click();
    cy.get(input).then($input => {
      ($input[0] as HTMLInputElement).form!.reset();
      flushSync(() => reassign());
    });
    assertValue(true);
    cy.get('#former-owner').then($form => ($form[0] as HTMLFormElement).reset());
    assertValue(true);
    cy.get('#current-owner').then($form => ($form[0] as HTMLFormElement).reset());
    assertValue('mixed');
    cy.get('@changes').should('have.been.calledOnce');
  });
});

describe('Checkbox documented scenarios', () => {
  for (const value of values) {
    it(`initializes uncontrolled ${value} and emits exact native activation payloads`, () => {
      const changes = cy.stub().as('changes');
      mount(
        <Checkbox
          defaultChecked={value}
          label="Choice"
          onChange={(event, data) =>
            changes(
              event.currentTarget.tagName,
              event.currentTarget.type,
              event.currentTarget.checked,
              event.currentTarget.indeterminate,
              data,
            )
          }
        />,
      );
      assertValue(value);
      cy.get(indicator).should('have.attr', 'aria-hidden', 'true');
      cy.get(indicator)
        .find('svg')
        .should('have.length', value === false ? 0 : 1);
      cy.get(input).realClick();
      assertValue(value !== true);
      cy.get(input).realClick();
      assertValue(value === true);
      cy.then(() =>
        expect(changes.args).to.deep.equal([
          ['INPUT', 'checkbox', value !== true, false, { checked: value !== true }],
          ['INPUT', 'checkbox', value === true, false, { checked: value === true }],
        ]),
      );
    });
  }
});

describe('Checkbox edges and accessibility', () => {
  afterEach(() => media([]));

  it('uses real Tab, Shift+Tab, Space and Enter and skips disabled controls', () => {
    const changes = cy.stub().as('changes');
    mount(
      <>
        <button>Before</button>
        <Checkbox label="Disabled" disabled onChange={changes} />
        <Checkbox label="Active" onChange={changes} />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').focus();
    cy.realPress('Tab');
    cy.get(`${input}:last`).should('be.focused');
    cy.realPress('Space');
    assertValue(true, `${input}:last`);
    cy.realPress('Enter');
    assertValue(true, `${input}:last`);
    cy.get('@changes').should('have.been.calledOnce');
    cy.realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get(`${input}:last`).should('be.focused');
    cy.contains(label, 'Disabled').realClick();
    assertValue(false, `${input}:first`);
    cy.get('@changes').should('have.been.calledOnce');
    cy.get(root).first().should('have.css', 'cursor', 'default');
  });

  it('preserves native readOnly checkbox activation rather than assuming text-input semantics', () => {
    const changes = cy.stub().as('changes');
    mount(<Checkbox label="Read only" readOnly onChange={changes} />);
    cy.get(input).should('have.prop', 'readOnly', true).realClick();
    assertValue(true);
    cy.realPress('Space');
    assertValue(false);
    cy.get('@changes').should('have.been.calledTwice');
  });

  it('Enter submits a form without changing the checkbox', () => {
    const submit = cy.stub().as('submit');
    const change = cy.stub().as('change');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <Checkbox label="Choice" onChange={change} />
        <button type="submit">Submit</button>
      </form>,
    );
    cy.get(input).focus();
    cy.realPress('Enter');
    cy.get('@submit').should('have.been.calledOnce');
    cy.get('@change').should('not.have.been.called');
    assertValue(false);
  });

  it('associates Field labels, hint, validation and consumer descriptions', () => {
    mount(
      <>
        <span id="extra">Extra description</span>
        <Field label="Field label" hint="Hint" validationMessage="Error" required>
          <Checkbox label="Checkbox label" aria-describedby="extra" />
        </Field>
      </>,
    );
    cy.get(input)
      .should('have.prop', 'required', true)
      .and('have.attr', 'aria-invalid', 'true')
      .and('not.have.attr', 'aria-labelledby');
    cy.get(input).then($input => {
      const control = $input[0] as HTMLInputElement;
      expect(Array.from(control.labels || []).map(item => item.textContent?.replace('*', '').trim())).to.deep.equal([
        'Field label',
        'Checkbox label',
      ]);
      const ids = control.getAttribute('aria-describedby')!.split(' ');
      expect(ids.map(id => control.ownerDocument.getElementById(id)?.textContent)).to.have.members([
        'Extra description',
        'Hint',
        'Error',
      ]);
    });
    cy.contains('label', 'Field label').realClick();
    assertValue(true);
  });

  it('honors explicit Field overrides and external aria-labelledby', () => {
    mount(
      <>
        <span id="external-name">External name</span>
        <Field label="Inherited" required validationMessage="Invalid">
          <Checkbox id="custom-id" aria-labelledby="external-name" aria-invalid={false} required={false} />
        </Field>
      </>,
    );
    cy.get(input)
      .should('have.id', 'custom-id')
      .and('have.attr', 'aria-labelledby', 'external-name')
      .and('have.attr', 'aria-invalid', 'false')
      .and('have.prop', 'required', false);
  });

  it('exposes actual native AX roles names descriptions mixed and disabled state', () => {
    mount(
      <>
        <Field label="Agreement" hint="Read carefully" validationMessage="Required" required>
          <Checkbox defaultChecked="mixed" />
        </Field>
        <Checkbox aria-label="Unavailable" disabled defaultChecked />
        <span id="name">External name</span>
        <Checkbox aria-labelledby="name" />
      </>,
    );
    cy.get(input).should('have.length', 3);
    cy.document().then(async doc => {
      type Frame = { frame: { id: string; url: string }; childFrames?: Frame[] };
      const frames: { frameTree: Frame } = await Cypress.automation('remote:debugger:protocol', {
        command: 'Page.getFrameTree',
        params: {},
      });
      const flatten = (frame: Frame): Frame[] => [frame, ...(frame.childFrames || []).flatMap(flatten)];
      const aut = flatten(frames.frameTree).find(frame => frame.frame.url === doc.location.href);
      expect(aut).to.exist;
      const tree: {
        nodes: {
          role?: { value: string };
          name?: { value: string };
          description?: { value: string };
          properties?: { name: string; value: { value: string | boolean } }[];
        }[];
      } = await Cypress.automation('remote:debugger:protocol', {
        command: 'Accessibility.getFullAXTree',
        params: { frameId: aut!.frame.id },
      });
      const controls = tree.nodes.filter(node => node.role?.value === 'checkbox');
      expect(controls).to.have.length(3);
      const agreement = controls.find(node => node.name?.value === 'Agreement');
      expect(agreement?.description?.value).to.contain('Read carefully').and.contain('Required');
      expect(agreement?.properties).to.deep.include({ name: 'checked', value: { type: 'tristate', value: 'mixed' } });
      const disabled = controls.find(node => node.name?.value === 'Unavailable');
      expect(disabled?.properties).to.deep.include({ name: 'disabled', value: { type: 'boolean', value: true } });
      expect(disabled?.properties).to.deep.include({ name: 'checked', value: { type: 'tristate', value: 'true' } });
      expect(controls.find(node => node.name?.value === 'External name')).to.exist;
    });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const labelPosition of ['before', 'after'] as const) {
      it(`mirrors ${labelPosition} label and native hit geometry in ${dir}`, () => {
        mountBase(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <Checkbox label="Choice" labelPosition={labelPosition} />
          </FluentProvider>,
        );
        cy.get(indicator).then($indicator => {
          const box = $indicator[0].getBoundingClientRect();
          cy.get(label).then($label => {
            const text = $label[0].getBoundingClientRect();
            expect(
              (labelPosition === 'before') === (dir === 'ltr') ? text.right <= box.left : box.right <= text.left,
            ).to.equal(true);
          });
          cy.get(input).then($input => {
            const hit = $input[0].getBoundingClientRect();
            expect(hit.left).to.be.at.most(box.left);
            expect(hit.right).to.be.at.least(box.right);
          });
        });
        cy.get(input).realClick();
        assertValue(true);
      });
    }
  }

  for (const theme of [teamsLightTheme, teamsDarkTheme]) {
    it(`uses ${theme === teamsLightTheme ? 'light' : 'dark'} theme contrast tokens for all states`, () => {
      mountBase(
        <FluentProvider theme={theme}>
          <Checkbox label="Unchecked" />
          <Checkbox label="Checked" checked />
          <Checkbox label="Mixed" checked="mixed" />
          <Checkbox label="Disabled" disabled checked />
        </FluentProvider>,
      );
      const rgb = (color: string) => {
        const hex = color.replace('#', '');
        return `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(
          hex.slice(4, 6),
          16,
        )})`;
      };
      cy.get(indicator).eq(0).should('have.css', 'border-top-color', rgb(theme.colorNeutralStrokeAccessible));
      cy.get(indicator)
        .eq(1)
        .should('have.css', 'background-color', rgb(theme.colorCompoundBrandBackground))
        .and('have.css', 'color', rgb(theme.colorNeutralForegroundInverted));
      cy.get(indicator)
        .eq(2)
        .should('have.css', 'color', rgb(theme.colorCompoundBrandForeground1))
        .and('have.css', 'border-top-color', rgb(theme.colorCompoundBrandStroke));
      cy.get(indicator)
        .eq(3)
        .should('have.css', 'color', rgb(theme.colorNeutralForegroundDisabled))
        .and('have.css', 'border-top-color', rgb(theme.colorNeutralStrokeDisabled));
    });
  }

  it('applies forced-colors disabled GrayText and keeps positive control keyboard activation', () => {
    mount(
      <>
        <Checkbox label="Disabled" disabled checked="mixed" />
        <Checkbox label="Active" />
      </>,
    );
    media([{ name: 'forced-colors', value: 'active' }]);
    cy.window().then(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
    cy.document().then(doc => {
      const probe = doc.createElement('span');
      probe.style.color = 'GrayText';
      doc.body.appendChild(probe);
      const gray = getComputedStyle(probe).color;
      probe.remove();
      cy.get(root).first().should('have.css', 'color', gray);
      cy.get(indicator).first().should('have.css', 'color', gray);
    });
    cy.get(`${input}:last`).focus();
    cy.realPress('Space');
    assertValue(true, `${input}:last`);
    assertValue('mixed', `${input}:first`);
  });

  for (const value of values) {
    it(`restores uncontrolled ${value} on native reset without change and without resetting native sibling incorrectly`, () => {
      const changes = cy.stub().as('changes');
      mount(
        <form>
          <Checkbox defaultChecked={value} label="Reset choice" onChange={changes} name="choice" />
          <input type="checkbox" aria-label="Native sibling" defaultChecked />
          <button type="reset">Reset</button>
        </form>,
      );
      cy.get(input).click();
      cy.get('[aria-label="Native sibling"]').click().should('not.be.checked');
      cy.contains('button', 'Reset').click();
      assertValue(value);
      cy.get('[aria-label="Native sibling"]').should('be.checked');
      cy.get('@changes').should('have.been.calledOnce');
      cy.get(indicator)
        .find('svg')
        .should('have.length', value === false ? 0 : 1);
      cy.get(input).click();
      assertValue(value !== true);
    });
  }
});

describe('Checkbox documented variants', () => {
  for (const value of values) {
    it(`controls ${value} with an updating handler`, () => {
      const Controlled = () => {
        const [checked, setChecked] = React.useState<CheckboxProps['checked']>(value);
        return <Checkbox checked={checked} onChange={(_, data) => setChecked(data.checked)} label="Controlled" />;
      };
      mount(<Controlled />);
      assertValue(value);
      cy.get(label).realClick();
      assertValue(value !== true);
    });
  }

  for (const size of ['medium', 'large'] as const) {
    for (const shape of ['square', 'circular'] as const) {
      for (const labelPosition of ['before', 'after'] as const) {
        it(`renders ${size} ${shape} label ${labelPosition} geometry and hit area`, () => {
          mount(<Checkbox size={size} shape={shape} labelPosition={labelPosition} label="Choice" />);
          cy.get(indicator)
            .should('have.css', 'width', size === 'large' ? '20px' : '16px')
            .and('have.css', 'height', size === 'large' ? '20px' : '16px')
            .and('have.css', 'pointer-events', 'none');
          cy.get(indicator).then($indicator => {
            const box = $indicator[0].getBoundingClientRect();
            const radius = parseFloat(getComputedStyle($indicator[0]).borderTopLeftRadius);
            expect(radius).to.equal(shape === 'circular' ? 10000 : 2);
            cy.get(label).then($label => {
              const text = $label[0].getBoundingClientRect();
              expect(labelPosition === 'before' ? text.right <= box.left : box.right <= text.left).to.equal(true);
            });
          });
          cy.get(input).then($input => {
            const box = $input[0].getBoundingClientRect();
            expect(box.width).to.be.at.least(24);
            expect(box.height).to.be.at.least(24);
          });
          cy.get(input).click(2, 2);
          assertValue(true);
          cy.get(label).realClick();
          assertValue(false);
        });
      }
    }
  }

  it('wraps long labels while keeping the indicator aligned to the first line', () => {
    mount(
      <Checkbox
        style={{ maxWidth: '180px' }}
        label="A very long checkbox label which wraps across several lines of text"
      />,
    );
    cy.get(label).then($label => {
      const text = $label[0].getBoundingClientRect();
      expect(text.height).to.be.greaterThan(40);
      cy.get(indicator).then($indicator => {
        const box = $indicator[0].getBoundingClientRect();
        expect(box.top - text.top).to.be.within(0, 12);
        expect(box.bottom).to.be.lessThan(text.bottom);
      });
    });
  });

  it('uses native required validation and submits only successful checkbox controls', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit(entries(event.currentTarget));
        }}
      >
        <Checkbox label="Required" required name="consent" value="yes" />
        <Checkbox label="Mixed" defaultChecked="mixed" name="mixed" />
        <Checkbox label="Disabled" disabled defaultChecked name="disabled" />
        <Checkbox label="Unnamed" defaultChecked />
        <input type="checkbox" defaultChecked name="native" value="sibling" />
        <button type="submit">Submit</button>
      </form>,
    );
    cy.get(`${input}[name="consent"]`)
      .should('have.prop', 'required', true)
      .then($input => expect(($input[0] as HTMLInputElement).validity.valueMissing).to.equal(true));
    cy.contains('button', 'Submit').click();
    cy.get('@submit').should('not.have.been.called');
    cy.contains(label, 'Required').click();
    cy.contains('button', 'Submit').click();
    cy.get('@submit').should('have.been.calledOnceWithExactly', [
      ['consent', 'yes'],
      ['native', 'sibling'],
    ]);
  });

  it('implements the documented select-all mixed group', () => {
    const Group = () => {
      const [options, setOptions] = React.useState([false, true, false]);
      return (
        <>
          <Checkbox
            label="All options"
            checked={options.every(Boolean) ? true : options.some(Boolean) ? 'mixed' : false}
            onChange={(_, data) => setOptions(options.map(() => !!data.checked))}
          />
          {options.map((checked, index) => (
            <Checkbox
              key={index}
              label={`Option ${index}`}
              checked={checked}
              onChange={(_, data) => setOptions(options.map((value, i) => (i === index ? !!data.checked : value)))}
            />
          ))}
        </>
      );
    };
    mount(<Group />);
    assertValue('mixed', `${input}:first`);
    cy.contains(label, 'All options').click();
    cy.get(input).each($input => expect(($input[0] as HTMLInputElement).checked).to.equal(true));
    cy.contains(label, 'Option 0').click();
    assertValue('mixed', `${input}:first`);
    cy.contains(label, 'All options').click();
    cy.contains(label, 'All options').click();
    cy.get(input).each($input => expect(($input[0] as HTMLInputElement).checked).to.equal(false));
  });
});
