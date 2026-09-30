import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/dom';
import { Field } from './Field';
import type { FieldProps } from './Field.types';
import type { FieldState } from './Field.types';
import { useFieldControlProps_unstable } from '../../contexts/useFieldControlProps';
import { useFieldContext_unstable } from '../../contexts/FieldContext';
import { useFieldContextValues_unstable } from '../../contexts/useFieldContextValues';
import { useField_unstable } from './useField';
import { useFieldBase_unstable } from './useFieldBase';
import type { FieldBaseProps } from './Field.types';
import { renderField_unstable } from './renderField';
import { useFieldStyles_unstable } from './useFieldStyles.styles';
import { useFieldTestStyles } from '../../testing/FieldTest.styles';
import { Tooltip } from '@fluentui/react-tooltip';
import { Input } from '@fluentui/react-input';
import { Textarea } from '@fluentui/react-textarea';
import { Checkbox } from '@fluentui/react-checkbox';
import { Switch } from '@fluentui/react-switch';
import { Radio, RadioGroup } from '@fluentui/react-radio';
import { Slider } from '@fluentui/react-slider';
import { SpinButton } from '@fluentui/react-spinbutton';
import { Combobox, Option } from '@fluentui/react-combobox';
import { ProgressBar } from '@fluentui/react-progress';
import { InfoLabel } from '@fluentui/react-infolabel';
import type { LabelProps } from '@fluentui/react-label';
import { SparkleFilled, DiamondDismiss12Filled, Warning12Filled, CheckmarkCircle12Filled } from '@fluentui/react-icons';
import type { JSXElement } from '@fluentui/react-utilities';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import { slot } from '@fluentui/react-utilities';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const named = (role: string, name: string) =>
  cy.get('#field').should($field => expect(getByRole($field[0], role, { name })).to.exist);
const paint = (selector: string, color: string) =>
  cy.get(selector).should($element => {
    const probe = $element[0].ownerDocument.createElement('span');
    probe.style.color = color;
    expect($element[0].ownerDocument.defaultView!.getComputedStyle($element[0]).color).to.equal(probe.style.color);
  });
const NativeInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...useFieldControlProps_unstable(props, { supportsLabelFor: true, supportsRequired: true })} />
);
const Group = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <div role="group" {...useFieldControlProps_unstable(props)}>
    <button>Group action</button>
  </div>
);

const RecomposedField = React.forwardRef<HTMLDivElement, FieldProps>((props, ref) => {
  const state = useField_unstable(props, ref);
  useFieldStyles_unstable(state);
  return renderField_unstable(state, useFieldContextValues_unstable(state));
});

describe('Field meaningful unit-derived contracts', () => {
  it('recomposes the base hook with a native label, no default error icon and an explicit custom icon', () => {
    const BaseField = React.forwardRef<HTMLDivElement, FieldBaseProps>((props, ref) => {
      const state = useFieldBase_unstable(props, ref);
      const context = useFieldContextValues_unstable({ ...state, size: 'medium', orientation: 'vertical' });
      return renderField_unstable(state, context);
    });
    const ref = React.createRef<HTMLDivElement>();
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="update-base" onClick={() => setPhase(value => value + 1)}>
            Update
          </button>
          <BaseField
            id="field"
            ref={ref}
            label="Base label"
            hint={{ id: 'base-hint', children: 'Base hint' }}
            validationMessage={phase > 0 ? { id: 'base-message', children: 'Base error' } : undefined}
            validationMessageIcon={phase === 2 ? { id: 'base-icon', children: 'Explicit icon' } : undefined}
          >
            <NativeInput />
          </BaseField>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#field').should($field => {
      expect(ref.current).to.equal($field[0]);
      expect(getByRole($field[0], 'textbox', { name: 'Base label', description: 'Base hint' })).to.exist;
    });
    cy.get('label').should('not.have.class', 'fui-Label');
    cy.get('label').click();
    cy.get('input').should('be.focused').type('retained');
    cy.get('input').should('not.have.attr', 'aria-invalid');
    cy.get('#update-base').click();
    cy.get('#base-message').should('have.text', 'Base error').and('have.attr', 'role', 'alert');
    cy.get('#base-message').children().should('have.length', 0);
    cy.get('input')
      .should('have.attr', 'aria-invalid', 'true')
      .and('have.attr', 'aria-describedby', 'base-message base-hint')
      .and('have.value', 'retained');
    cy.get('#update-base').click();
    cy.get('#base-message > #base-icon').should('have.text', 'Explicit icon');
    cy.get('#field').should(
      $field =>
        expect(
          getByRole($field[0], 'textbox', { name: 'Base label', description: 'Explicit iconBase error Base hint' }),
        ).to.exist,
    );
    cy.get('label').click();
    cy.get('input').should('be.focused').and('have.value', 'retained');
  });

  it('removes explicit null slots and retains only the consumer description and native input value', () => {
    const Updating = () => {
      const [active, setActive] = React.useState(true);
      return (
        <>
          <button id="remove" onClick={() => setActive(false)}>
            Remove
          </button>
          <Field
            id="field"
            label={active ? 'Value' : null}
            validationMessage={active ? 'Message' : null}
            hint={active ? 'Hint' : null}
          >
            <Input aria-label={active ? undefined : 'Consumer name'} aria-describedby="consumer" />
          </Field>
          <span id="consumer">Consumer description</span>
        </>
      );
    };
    mount(<Updating />);
    named('textbox', 'Value');
    cy.get('input').type('retained');
    cy.get('#remove').click();
    cy.get('.fui-Field__label,.fui-Field__validationMessage,.fui-Field__hint,.fui-Field__validationMessageIcon').should(
      'not.exist',
    );
    cy.get('input').should('have.value', 'retained').and('have.attr', 'aria-describedby', 'consumer');
    cy.get('input').should('not.have.attr', 'aria-labelledby');
    cy.get('input').should('not.have.attr', 'aria-invalid');
    cy.get('#field').should(
      $field =>
        expect(getByRole($field[0], 'textbox', { name: 'Consumer name', description: 'Consumer description' })).to
          .exist,
    );
  });

  for (const validationState of ['error', 'warning', 'success'] as const) {
    it(`uses the exact ${validationState} source icon rather than an arbitrary painted SVG`, () => {
      mount(
        <>
          <Field id="field" label="Value" validationState={validationState} validationMessage="Message">
            <Input />
          </Field>
          <span id="reference">
            {validationState === 'error' ? (
              <DiamondDismiss12Filled />
            ) : validationState === 'warning' ? (
              <Warning12Filled />
            ) : (
              <CheckmarkCircle12Filled />
            )}
          </span>
        </>,
      );
      cy.get('.fui-Field__validationMessageIcon svg').should($svg =>
        expect($svg[0].innerHTML).to.equal($svg[0].ownerDocument.querySelector('#reference svg')!.innerHTML),
      );
      cy.get('input').type(validationState).should('have.value', validationState);
    });
  }

  for (const mode of ['generated', 'matching', 'mismatched'] as const) {
    it(`connects a native control with ${mode} label-for and ID contracts`, () => {
      mount(
        <Field id="field" label={mode === 'matching' ? { children: 'Value', htmlFor: 'control' } : 'Value'}>
          <NativeInput id={mode === 'generated' ? undefined : 'control'} />
        </Field>,
      );
      named('textbox', 'Value');
      cy.get('#field').should($field => {
        const input = $field[0].querySelector('input')!;
        const label = $field[0].querySelector('label')!;
        expect(input.id).not.to.equal('');
        if (mode === 'mismatched') {
          expect(input.getAttribute('aria-labelledby')).to.equal(label.id);
          expect(label.htmlFor).not.to.equal(input.id);
        } else {
          expect(label.htmlFor).to.equal(input.id);
          expect(input.hasAttribute('aria-labelledby')).to.equal(false);
        }
      });
      if (mode === 'mismatched') {
        cy.get('input').click();
      } else {
        cy.get('label').click();
      }
      cy.get('input').should('be.focused').type(mode).should('have.value', mode);
    });
  }

  it('sets label and required ARIA on a non-labelable group and preserves native child actions', () => {
    const action = cy.stub().as('action');
    mount(
      <Field id="field" label="Group" required>
        <Group onClick={action} />
      </Field>,
    );
    named('group', 'Group');
    cy.get('[role=group]').should('have.attr', 'aria-required', 'true');
    cy.get('[role=group]').should('not.have.attr', 'required');
    cy.contains('button', 'Group action').click();
    cy.get('@action').should('have.been.calledOnce');
  });

  for (const hint of [false, true]) {
    for (const message of [false, true]) {
      it(`merges hint=${hint} and message=${message} ahead of the consumer description`, () => {
        mount(
          <>
            <Field
              id="field"
              label="Value"
              hint={hint ? { children: 'Hint', id: 'hint' } : undefined}
              validationMessage={message ? { children: 'Message', id: 'message' } : undefined}
            >
              <NativeInput aria-describedby="consumer" />
            </Field>
            <span id="consumer">Consumer</span>
          </>,
        );
        const ids = [...(message ? ['message'] : []), ...(hint ? ['hint'] : []), 'consumer'];
        const description = [...(message ? ['Message'] : []), ...(hint ? ['Hint'] : []), 'Consumer'].join(' ');
        cy.get('input').should('have.attr', 'aria-describedby', ids.join(' '));
        cy.get('#field').should(
          $field => expect(getByRole($field[0], 'textbox', { name: 'Value', description })).to.exist,
        );
        cy.get('input').type('described').should('have.value', 'described');
      });
    }
  }

  it('passes Field props through intermediate wrappers without cloning arbitrary native children', () => {
    mount(
      <Field id="field" label="Value" hint="Hint">
        <div>
          <span>Wrapper</span>
          <NativeInput />
        </div>
      </Field>,
    );
    cy.get('#field').should(
      $field => expect(getByRole($field[0], 'textbox', { name: 'Value', description: 'Hint' })).to.exist,
    );
    cy.get('label').click();
    cy.get('input').should('be.focused').type('wrapped').should('have.value', 'wrapped');
  });

  for (const required of [false, true]) {
    for (const validationState of ['error', 'warning', 'success', 'none'] as const) {
      it(`passes exact child-render ARIA for required=${required} and ${validationState}`, () => {
        const render = cy.spy().as('render');
        mount(
          <Field
            id="field"
            label={{ children: 'Value', id: 'label' }}
            hint={{ children: 'Hint', id: 'hint' }}
            validationMessage={{ children: 'Message', id: 'message' }}
            required={required}
            validationState={validationState}
          >
            {props => {
              render(props);
              return <input {...props} />;
            }}
          </Field>,
        );
        cy.get('label').then($label =>
          cy.get('@render').should('have.been.calledWithExactly', {
            id: ($label[0] as HTMLLabelElement).htmlFor,
            'aria-labelledby': 'label',
            'aria-describedby': 'message hint',
            ...(required ? { 'aria-required': true } : {}),
            ...(validationState === 'error' ? { 'aria-invalid': true } : {}),
          }),
        );
        cy.get('input').should('have.prop', 'required', false);
        named('textbox', 'Value');
        cy.get('label').click();
        cy.get('input').should('be.focused').type('render').should('have.value', 'render');
      });
    }
  }

  for (const size of ['small', 'medium', 'large'] as const) {
    it(`exposes ${size} through context and supportsSize without overriding a consumer size`, () => {
      const Control = () => {
        const inherited = useFieldControlProps_unstable<{ id?: string; size?: FieldProps['size'] }>(
          {},
          { supportsSize: true },
        );
        const override = useFieldControlProps_unstable({ id: 'probe', size: 'small' }, { supportsSize: true });
        const context = useFieldContext_unstable();
        return (
          <>
            <input
              id={inherited.id}
              data-size={inherited.size}
              data-override={override.size}
              data-orientation={context?.orientation}
              data-state={context?.validationState}
            />
          </>
        );
      };
      mount(
        <Field id="field" label="Value" size={size} orientation="horizontal" validationState="warning">
          <Control />
        </Field>,
      );
      cy.get('input')
        .should('have.attr', 'data-size', size)
        .and('have.attr', 'data-override', 'small')
        .and('have.attr', 'data-orientation', 'horizontal')
        .and('have.attr', 'data-state', 'warning');
      cy.get('label').click();
      cy.get('input').should('be.focused').type(size).should('have.value', size);
    });
  }

  it('leaves standalone control props untouched outside a Field context', () => {
    const props = { id: 'standalone', 'aria-label': 'Standalone', 'aria-describedby': 'consumer' };
    const Control = () => {
      const inherited = useFieldControlProps_unstable(props);
      const empty = useFieldControlProps_unstable();
      return <input {...inherited} data-same={inherited === props} data-empty={empty === undefined} />;
    };
    mount(
      <>
        <Control />
        <span id="consumer">Consumer</span>
      </>,
    );
    cy.get('input')
      .should('have.attr', 'data-same', 'true')
      .and('have.attr', 'data-empty', 'true')
      .and('have.attr', 'aria-describedby', 'consumer');
    cy.get('input').type('standalone').should('have.value', 'standalone');
  });

  it('recomposes public hooks and renderer with native label behavior and root ref cleanup', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Updating = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="unmount" onClick={() => setVisible(false)}>
            Unmount
          </button>
          {visible && (
            <RecomposedField id="field" ref={ref} label="Recomposed" hint="Hook hint" required size="small">
              <NativeInput />
            </RecomposedField>
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#field').should($field => {
      expect(ref.current).to.equal($field[0]);
      expect(getByRole($field[0], 'textbox', { name: 'Recomposed', description: 'Hook hint' })).to.exist;
    });
    cy.get('label').click();
    cy.get('input').should('be.focused').and('have.prop', 'required', true).type('recomposed');
    cy.get('#unmount').click();
    cy.get('#field')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('runs every slot render callback with relationships, classes, children and native actions intact', () => {
    const root: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props} data-slot="root" />
    );
    const label: SlotRenderFunction<LabelProps> = (Component, props) => (
      <Component {...props} data-slot="label">
        Slot label
      </Component>
    );
    const secondary: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props} data-slot="secondary">
        {props.children}Slot text
      </Component>
    );
    const icon: SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> = (Component, props) => (
      <Component {...props} data-slot="icon">
        Custom icon
      </Component>
    );
    const SlotsField = (props: FieldProps) => {
      const state = useField_unstable(props, React.useRef<HTMLDivElement>(null));
      state.root = slot.always({ ...state.root, children: root }, { elementType: 'div' });
      useFieldStyles_unstable(state);
      return renderField_unstable(state, useFieldContextValues_unstable(state));
    };
    mount(
      <SlotsField
        id="field"
        label={{ children: label }}
        validationMessage={{ children: secondary }}
        hint={{ children: secondary }}
        validationMessageIcon={{ children: icon }}
      >
        <NativeInput />
      </SlotsField>,
    );
    cy.get('#field').should('have.attr', 'data-slot', 'root');
    cy.get('[data-slot=label]')
      .should('have.class', 'fui-Field__label')
      .should($label => expect(($label[0] as HTMLLabelElement).htmlFor).not.to.equal(''));
    cy.get('[data-slot=secondary]').should('have.length', 2);
    cy.get('[data-slot=icon]').should('have.text', 'Custom icon');
    cy.get('[data-slot=label]').click();
    cy.get('input').should('be.focused').type('slots').should('have.value', 'slots');
    named('textbox', 'Slot label');
    cy.get('input').should($input => {
      const ids = $input[0].getAttribute('aria-describedby')!.split(' ');
      expect(ids).to.have.length(2);
      for (const id of ids) {
        expect($input[0].ownerDocument.getElementById(id)!.getAttribute('data-slot')).to.equal('secondary');
      }
    });
  });
});

describe('Field documented scenarios', () => {
  it('labels the default success Input and keeps native editing independent of validation', () => {
    mount(
      <Field id="field" label="Example field" validationState="success" validationMessage="This is a success message.">
        <Input />
      </Field>,
    );
    named('textbox', 'Example field');
    cy.get('label').click();
    cy.get('input')
      .should('be.focused')
      .type('A value')
      .should('have.value', 'A value')
      .and('not.have.attr', 'aria-invalid');
    cy.get('.fui-Field__validationMessage').should('have.text', 'This is a success message.');
  });

  describe('Field supported edges and accessibility', () => {
    for (const validationState of ['error', 'warning', 'success', 'none'] as const) {
      it(`removes ${validationState} semantics, size, orientation and required when props return to omission`, () => {
        const Updating = () => {
          const [active, setActive] = React.useState(true);
          return (
            <>
              <button id="reset" onClick={() => setActive(false)}>
                Reset
              </button>
              <Field
                id="field"
                label="Value"
                {...(active
                  ? ({
                      size: 'large',
                      orientation: 'horizontal',
                      required: true,
                      validationState,
                      validationMessage: 'Old message',
                      hint: 'Old hint',
                    } as const)
                  : {})}
              >
                <Input />
              </Field>
            </>
          );
        };
        mount(<Updating />);
        cy.get('input').type('retained').should('have.prop', 'required', true);
        cy.get('.fui-Input').should('have.css', 'min-height', '40px');
        cy.get('.fui-Field__validationMessage').should('contain.text', 'Old message');
        cy.get('#reset').click();
        cy.get('input').should('have.value', 'retained').and('have.prop', 'required', false);
        cy.get('input').should('not.have.attr', 'aria-invalid');
        cy.get('input').should('not.have.attr', 'aria-describedby');
        cy.get('.fui-Input').should('have.css', 'min-height', '32px');
        cy.get('.fui-Field__label').should('have.css', 'font-size', '14px').and('have.css', 'grid-row-start', 'auto');
        cy.get(
          '.fui-Label__required,.fui-Field__validationMessage,.fui-Field__hint,.fui-Field__validationMessageIcon',
        ).should('not.exist');
        cy.get('label').click();
        cy.get('input').should('be.focused');
        named('textbox', 'Value');
      });
    }

    it('updates label, hint and message IDs without stale description references or remounting the input', () => {
      const Updating = () => {
        const [next, setNext] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setNext(true)}>
              Update
            </button>
            <Field
              id="field"
              label={{ id: next ? 'new-label' : 'old-label', children: next ? 'New label' : 'Old label' }}
              hint={{ id: next ? 'new-hint' : 'old-hint', children: next ? 'New hint' : 'Old hint' }}
              validationMessage={{
                id: next ? 'new-message' : 'old-message',
                children: next ? 'New message' : 'Old message',
              }}
            >
              <Input id="caller-input" aria-describedby="consumer-description" />
            </Field>
            <span id="consumer-description">Consumer description</span>
          </>
        );
      };
      mount(<Updating />);
      cy.get('input')
        .type('retained')
        .should('have.attr', 'aria-describedby', 'old-message old-hint consumer-description');
      cy.get('#update').click();
      cy.get('input')
        .should('have.value', 'retained')
        .and('have.attr', 'aria-labelledby', 'new-label')
        .and('have.attr', 'aria-describedby', 'new-message new-hint consumer-description');
      cy.get('#old-label,#old-hint,#old-message').should('not.exist');
      cy.get('#field').should(
        $field =>
          expect(
            getByRole($field[0], 'textbox', {
              name: 'New label',
              description: 'New message New hint Consumer description',
            }),
          ).to.exist,
      );
    });

    for (const label of [undefined, null] as const) {
      it(`aligns horizontal content without a ${
        label === null ? 'null' : 'omitted'
      } label and retains a caller name`, () => {
        mount(
          <div style={{ width: 400 }}>
            <Field id="field" orientation="horizontal" label={label} hint="Hint">
              <Input aria-label="Caller name" />
            </Field>
          </div>,
        );
        cy.get('.fui-Field__label').should('not.exist');
        cy.get('#field').should($field => {
          expect(
            $field[0].querySelector('.fui-Input')!.getBoundingClientRect().left -
              $field[0].getBoundingClientRect().left,
          ).to.be.closeTo(132, 1);
          expect(getByRole($field[0], 'textbox', { name: 'Caller name', description: 'Hint' })).to.exist;
        });
        cy.get('input').type('unlabelled').should('have.value', 'unlabelled');
      });
    }

    for (const icon of [undefined, null, 'Custom icon'] as const) {
      it(`handles ${icon === null ? 'suppressed' : icon ?? 'default'} error icons and their text gutter`, () => {
        mount(
          <Field id="field" label="Value" validationMessage="Error" validationMessageIcon={icon}>
            <Input />
          </Field>,
        );
        cy.get('.fui-Field__validationMessage').should('have.css', 'padding-left', icon === null ? '0px' : '16px');
        if (icon === null) {
          cy.get('.fui-Field__validationMessageIcon').should('not.exist');
        } else {
          cy.get('.fui-Field__validationMessageIcon').should(
            icon ? 'have.text' : 'be.visible',
            ...(icon ? [icon] : []),
          );
        }
        cy.get('input').type('value').should('have.value', 'value');
      });
    }

    it('does not render an orphan icon when no validation message exists', () => {
      mount(
        <Field id="field" label="Value" validationState="error" validationMessageIcon="Orphan">
          <Input />
        </Field>,
      );
      cy.get('.fui-Field__validationMessageIcon,.fui-Field__validationMessage').should('not.exist');
      cy.get('input').should('have.attr', 'aria-invalid', 'true');
      cy.get('input').type('value').should('have.value', 'value');
    });

    it('honors label size and required overrides independently of the control context', () => {
      mount(
        <Field id="field" size="large" required label={{ children: 'Value', size: 'small', required: false }}>
          <Input size="medium" required={false} />
        </Field>,
      );
      cy.get('label').should('have.css', 'font-size', '12px');
      cy.get('.fui-Label__required').should('not.exist');
      cy.get('.fui-Input').should('have.css', 'min-height', '32px');
      cy.get('input').should('have.prop', 'required', false).type('override').should('have.value', 'override');
    });

    it('honors explicit message roles and preserves caller ARIA overrides with merged descriptions', () => {
      mount(
        <>
          <span id="caller-label">Caller label</span>
          <span id="caller-description">Caller description</span>
          <span id="caller-error">Caller error</span>
          <Field
            id="field"
            label="Field label"
            required
            validationState="error"
            validationMessage={{ children: 'Field message', id: 'message', role: 'status' }}
            hint={{ children: 'Field hint', id: 'hint' }}
          >
            <NativeInput
              id="caller-control"
              required={false}
              aria-required={false}
              aria-invalid={false}
              aria-labelledby="caller-label"
              aria-errormessage="caller-error"
              aria-describedby="caller-description"
            />
          </Field>
        </>,
      );
      cy.get('input')
        .should('have.attr', 'id', 'caller-control')
        .and('have.attr', 'aria-labelledby', 'caller-label')
        .and('have.attr', 'aria-invalid', 'false')
        .and('have.attr', 'aria-required', 'false')
        .and('have.attr', 'aria-errormessage', 'caller-error')
        .and('have.attr', 'aria-describedby', 'message hint caller-description')
        .and('have.prop', 'required', false);
      cy.get('[role=status]').should('contain.text', 'Field message');
      cy.get('#field').should(
        $field =>
          expect(
            getByRole($field[0], 'textbox', {
              name: 'Caller label',
              description: 'Field message Field hint Caller description',
            }),
          ).to.exist,
      );
      cy.get('input').type('override').should('have.value', 'override');
    });

    it('merges a real focused Tooltip description with both Field descriptions', () => {
      mount(
        <Field id="field" label="Value" hint="Field hint" validationMessage="Field message">
          <Tooltip relationship="description" content="Tooltip description">
            <NativeInput />
          </Tooltip>
        </Field>,
      );
      cy.get('input').focus();
      cy.get('[role=tooltip]').should('be.visible');
      cy.get('#field').should(
        $field =>
          expect(
            getByRole($field[0], 'textbox', {
              name: 'Value',
              description: 'Field message Field hint Tooltip description',
            }),
          ).to.exist,
      );
    });

    it('keeps nested fields isolated and generated IDs unique across siblings', () => {
      mount(
        <>
          <Field id="outer" label="Outer" hint="Outer hint">
            <Field id="field" label="Inner" hint="Inner hint">
              <Input />
            </Field>
          </Field>
          <Field id="sibling" label="Sibling">
            <Input />
          </Field>
        </>,
      );
      cy.get('#field').should(
        $field => expect(getByRole($field[0], 'textbox', { name: 'Inner', description: 'Inner hint' })).to.exist,
      );
      cy.get('#sibling label').click();
      cy.get('#sibling input').should('be.focused');
      cy.get('input').should($inputs => expect($inputs[0].id).not.to.equal($inputs[1].id));
      cy.get('#field label').click();
      cy.get('#field input').should('be.focused');
    });

    it('forwards the root ref and latest bubbling event handlers and clears them on removal and unmount', () => {
      const ref = React.createRef<HTMLDivElement>();
      const oldClick = cy.stub().as('oldClick');
      const nextClick = cy.stub().as('nextClick');
      const change = cy.stub().as('change');
      const focus = cy.stub().as('focus');
      const blur = cy.stub().as('blur');
      const Updating = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <button id="update" onClick={() => setPhase(value => value + 1)}>
              Update
            </button>
            {phase < 3 && (
              <Field
                id="field"
                ref={ref}
                label="Value"
                onClick={phase === 0 ? oldClick : phase === 1 ? nextClick : undefined}
                onChange={change}
                onFocus={focus}
                onBlur={blur}
              >
                <Input />
              </Field>
            )}
          </>
        );
      };
      mount(<Updating />);
      cy.get('#field').should($field => expect(ref.current).to.equal($field[0]));
      cy.get('input').click().type('a');
      cy.get('@oldClick').should('have.been.calledOnce');
      cy.get('@change').should('have.been.calledOnce');
      cy.get('@focus').should('have.been.calledOnce');
      cy.get('#update').click();
      cy.get('@blur').should('have.been.calledOnce');
      cy.get('input').click();
      cy.get('@nextClick').should('have.been.calledOnce');
      cy.get('#update').click();
      cy.get('input').click();
      cy.get('@oldClick').should('have.been.calledOnce');
      cy.get('@nextClick').should('have.been.calledOnce');
      cy.get('#update').click();
      cy.get('#field')
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
    });

    it('preserves and removes consumer class and inline styles on all slots', () => {
      const Updating = () => {
        const styles = useFieldTestStyles();
        const [custom, setCustom] = React.useState(true);
        return (
          <>
            <button id="reset" onClick={() => setCustom(false)}>
              Reset
            </button>
            <Field
              id="field"
              className={custom ? styles.root : undefined}
              style={custom ? { display: 'block' } : undefined}
              label={{ children: 'Value', className: custom ? styles.text : undefined }}
              hint={{ children: 'Hint', className: custom ? styles.text : undefined }}
              validationMessage={{ children: 'Error', className: custom ? styles.text : undefined }}
              validationMessageIcon={{ children: 'Icon', style: custom ? { display: 'none' } : undefined }}
            >
              <Input />
            </Field>
          </>
        );
      };
      mount(<Updating />);
      cy.get('#field').should('have.class', 'fui-Field').and('have.css', 'display', 'block');
      paint('.fui-Field__label', teamsLightTheme.colorBrandForeground1);
      paint('.fui-Field__hint', teamsLightTheme.colorBrandForeground1);
      paint('.fui-Field__validationMessage', teamsLightTheme.colorBrandForeground1);
      cy.get('.fui-Field__validationMessageIcon').should('have.css', 'display', 'none');
      cy.get('#reset').click();
      cy.get('#field').should('have.css', 'display', 'grid');
      paint('.fui-Field__label', teamsLightTheme.colorNeutralForeground1);
      paint('.fui-Field__hint', teamsLightTheme.colorNeutralForeground3);
      paint('.fui-Field__validationMessage', teamsLightTheme.colorPaletteRedForeground1);
      cy.get('.fui-Field__validationMessageIcon').should('have.css', 'display', 'inline-block');
      cy.get('label').click();
      cy.get('input').should('be.focused');
    });

    it('applies and removes the provider custom style hook as an observable override', () => {
      const customStyle = (state: unknown) => {
        const field = state as FieldState;
        field.root.style = { ...field.root.style, display: 'block' };
      };
      const Updating = () => {
        const [custom, setCustom] = React.useState(true);
        return (
          <FluentProvider
            theme={teamsLightTheme}
            customStyleHooks_unstable={
              custom
                ? {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    useFieldStyles_unstable: customStyle,
                  }
                : {}
            }
          >
            <button id="reset" onClick={() => setCustom(false)}>
              Reset
            </button>
            <Field id="field" label="Value">
              <Input />
            </Field>
          </FluentProvider>
        );
      };
      mount(<Updating />);
      cy.get('#field').should('have.css', 'display', 'block');
      cy.get('#reset').click();
      cy.get('#field').should('have.css', 'display', 'grid');
      cy.get('label').click();
      cy.get('input').should('be.focused');
    });
  });

  for (const orientation of ['vertical', 'horizontal'] as const) {
    for (const size of ['small', 'medium', 'large'] as const) {
      it(`lays out the documented ${orientation} ${size} label, control and secondary text`, () => {
        mount(
          <Field
            id="field"
            style={{ width: 400 }}
            label="Example field"
            orientation={orientation}
            size={size}
            validationMessage="Message"
            hint="Hint"
          >
            <Input />
          </Field>,
        );
        cy.get('.fui-Field__label').should(
          'have.css',
          'font-size',
          size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        );
        cy.get('.fui-Input').should(
          'have.css',
          'min-height',
          size === 'small' ? '24px' : size === 'large' ? '40px' : '32px',
        );
        cy.get('#field').should($field => {
          const root = $field[0];
          const label = root.querySelector('label')!.getBoundingClientRect();
          const input = root.querySelector('.fui-Input')!.getBoundingClientRect();
          const hint = root.querySelector('.fui-Field__hint')!.getBoundingClientRect();
          const message = root.querySelector('.fui-Field__validationMessage')!.getBoundingClientRect();
          if (orientation === 'horizontal') {
            expect(input.left - root.getBoundingClientRect().left).to.be.closeTo(132, 1);
            expect(input.left).to.be.greaterThan(label.right);
            expect(message.left).to.equal(input.left);
            expect(hint.left).to.equal(input.left);
          } else {
            expect(input.top).to.be.at.least(label.bottom);
            expect(input.left).to.equal(root.getBoundingClientRect().left);
          }
          expect(message.top).to.be.at.least(input.bottom);
          expect(hint.top).to.be.at.least(message.bottom);
        });
        cy.get('label').click();
        cy.get('input').should('be.focused').type(size).should('have.value', size);
      });
    }
  }

  it('connects hint text as the actual accessible description', () => {
    mount(
      <Field id="field" label="Example with hint" hint="Sample hint text.">
        <Input />
      </Field>,
    );
    cy.get('#field').should(
      $field =>
        expect(getByRole($field[0], 'textbox', { name: 'Example with hint', description: 'Sample hint text.' })).to
          .exist,
    );
    cy.get('input').type('hint').should('have.value', 'hint');
  });

  it('requires a native value and allows submission only after entry', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <Field id="field" label="Required field" required>
          <Input />
        </Field>
        <button type="submit">Submit</button>
      </form>,
    );
    cy.get('.fui-Label__required').should('have.text', '*').and('have.attr', 'aria-hidden', 'true');
    cy.get('input').should('have.prop', 'required', true).and('not.have.attr', 'aria-required');
    cy.contains('button', 'Submit').click();
    cy.get('@submit').should('not.have.been.called');
    cy.get('input')
      .should('be.focused')
      .should($input => expect(($input[0] as HTMLInputElement).validity.valueMissing).to.equal(true));
    cy.get('input').type('Valid');
    cy.contains('button', 'Submit').click();
    cy.get('@submit').should('have.been.calledOnce');
  });

  it('leaves the documented disabled control label readable without enabling the input', () => {
    mount(
      <Field id="field" label="Field with disabled control">
        <Input disabled />
      </Field>,
    );
    cy.get('input').should('be.disabled');
    cy.get('label').should('not.have.attr', 'disabled');
    cy.get('label').click();
    cy.get('input').should('not.be.focused').and('have.value', '');
    paint('label', teamsLightTheme.colorNeutralForeground1);
    named('textbox', 'Field with disabled control');
  });

  for (const validationState of [undefined, 'error', 'warning', 'success', 'none'] as const) {
    it(`renders documented ${validationState ?? 'implicit error'} validation semantics and paint`, () => {
      mount(
        <Field id="field" label="Value" validationState={validationState} validationMessage="Feedback">
          <Input />
        </Field>,
      );
      const error = validationState === undefined || validationState === 'error';
      const alert = error || validationState === 'warning';
      cy.get('.fui-Field__validationMessage').should($message =>
        expect($message[0].getAttribute('role')).to.equal(alert ? 'alert' : null),
      );
      cy.get('input').should($input => expect($input[0].getAttribute('aria-invalid')).to.equal(error ? 'true' : null));
      paint(
        '.fui-Field__validationMessage',
        error ? teamsLightTheme.colorPaletteRedForeground1 : teamsLightTheme.colorNeutralForeground3,
      );
      if (validationState === 'none') {
        cy.get('.fui-Field__validationMessageIcon').should('not.exist');
      } else {
        cy.get('.fui-Field__validationMessageIcon svg').should('have.attr', 'aria-hidden', 'true');
        paint(
          '.fui-Field__validationMessageIcon',
          error
            ? teamsLightTheme.colorPaletteRedForeground1
            : validationState === 'warning'
            ? teamsLightTheme.colorPaletteDarkOrangeForeground1
            : teamsLightTheme.colorPaletteGreenForeground1,
        );
      }
      cy.get('#field').should(
        $field => expect(getByRole($field[0], 'textbox', { name: 'Value', description: 'Feedback' })).to.exist,
      );
      cy.get('input').type('edited').should('have.value', 'edited');
      cy.get('.fui-Field__validationMessage').should('contain.text', 'Feedback');
    });
  }

  it('renders the documented custom validation icon with none state', () => {
    mount(
      <Field
        id="field"
        label="Custom state"
        validationState="none"
        validationMessageIcon={<SparkleFilled />}
        validationMessage="Custom message"
      >
        <Input />
      </Field>,
    );
    cy.get('.fui-Field__validationMessageIcon svg').should('be.visible');
    cy.get('.fui-Field__validationMessage').should('not.have.attr', 'role');
    cy.get('input').should('not.have.attr', 'aria-invalid');
    cy.get('input').type('custom').should('have.value', 'custom');
    named('textbox', 'Custom state');
  });

  it('uses the documented third-party render function to label and describe a native input', () => {
    mount(
      <Field id="field" label="Third party input" hint="Third party hint">
        {props => (
          <div>
            <input {...props} />
          </div>
        )}
      </Field>,
    );
    cy.get('#field').should(
      $field =>
        expect(getByRole($field[0], 'textbox', { name: 'Third party input', description: 'Third party hint' })).to
          .exist,
    );
    cy.get('label').click();
    cy.get('input').should('be.focused').type('third party').should('have.value', 'third party');
  });

  it('replaces the label with InfoLabel while preserving focus association and opening its information', () => {
    mount(
      <Field
        id="field"
        label={{
          children: (_: unknown, props: LabelProps) => (
            <InfoLabel {...props} info="Example info">
              Field with an info button
            </InfoLabel>
          ),
        }}
      >
        <Input />
      </Field>,
    );
    named('textbox', 'Field with an info button');
    cy.get('label').click();
    cy.get('input').should('be.focused');
    cy.get('#field button').click();
    cy.contains('Example info').should('be.visible');
    cy.realPress('Escape');
    cy.contains('Example info').should('not.exist');
  });

  it('labels the documented Textarea and supports multiline native editing', () => {
    mount(
      <Field id="field" label="Textarea">
        <Textarea />
      </Field>,
    );
    named('textbox', 'Textarea');
    cy.get('label').click();
    cy.get('textarea').should('be.focused').type('one{enter}two').should('have.value', 'one\ntwo');
  });

  it('labels the documented Combobox and supports real option selection', () => {
    mount(
      <Field id="field" label="Combobox">
        <Combobox>
          <Option>Option 1</Option>
          <Option>Option 2</Option>
        </Combobox>
      </Field>,
    );
    named('combobox', 'Combobox');
    cy.get('input').click();
    cy.contains('[role=option]', 'Option 2').click();
    cy.get('input').should('have.value', 'Option 2');
  });

  it('labels the documented SpinButton and supports native arrow increments', () => {
    mount(
      <Field id="field" label="SpinButton">
        <SpinButton defaultValue={1} />
      </Field>,
    );
    named('spinbutton', 'SpinButton');
    cy.get('input').focus();
    cy.realPress('ArrowUp');
    cy.get('input').should('have.value', '2');
  });

  it('keeps the documented Checkbox own label and adds the Field description', () => {
    mount(
      <Field id="field" hint="Checkbox hint">
        <Checkbox label="Checkbox" />
      </Field>,
    );
    cy.get('#field').should(
      $field => expect(getByRole($field[0], 'checkbox', { name: 'Checkbox', description: 'Checkbox hint' })).to.exist,
    );
    cy.get('label').click();
    cy.get('input').should('be.checked');
  });

  it('labels the documented Slider and supports native arrow changes', () => {
    mount(
      <Field id="field" label="Slider">
        <Slider defaultValue={25} />
      </Field>,
    );
    named('slider', 'Slider');
    cy.get('input').focus();
    cy.realPress('ArrowRight');
    cy.get('input').should('have.value', '26');
  });

  it('labels the documented Switch and toggles through the native label', () => {
    mount(
      <Field id="field" label="Switch">
        <Switch />
      </Field>,
    );
    named('switch', 'Switch');
    cy.get('.fui-Field__label').click();
    cy.get('input').should('be.checked');
    cy.realPress('Space');
    cy.get('input').should('not.be.checked');
  });

  it('labels the documented RadioGroup and supports native keyboard selection', () => {
    mount(
      <Field id="field" label="RadioGroup">
        <RadioGroup>
          <Radio value="one" label="Option 1" />
          <Radio value="two" label="Option 2" />
        </RadioGroup>
      </Field>,
    );
    named('radiogroup', 'RadioGroup');
    cy.get('input[value=one]').check().focus();
    cy.realPress('ArrowDown');
    cy.get('input[value=two]').should('be.checked').and('be.focused');
  });

  it('labels a ProgressBar as recommended without inventing a label-for focus contract', () => {
    mount(
      <Field id="field" label="Progress">
        <ProgressBar value={0.5} />
      </Field>,
    );
    named('progressbar', 'Progress');
    cy.get('[role=progressbar]').should('have.attr', 'aria-valuenow', '0.5');
  });
});
