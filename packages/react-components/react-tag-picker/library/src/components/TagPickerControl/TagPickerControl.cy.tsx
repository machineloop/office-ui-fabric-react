import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, tokens } from '@fluentui/react-theme';
import {
  TagPicker,
  TagPickerGroup,
  TagPickerInput,
  TagPickerButton,
  TagPickerList,
  TagPickerOption,
} from '@fluentui/react-tag-picker';
import type { TagPickerProps } from '@fluentui/react-tag-picker';
import { Tag } from '@fluentui/react-tags';
import { Button } from '@fluentui/react-button';
import { Field } from '@fluentui/react-field';
import { TagPickerControl } from './TagPickerControl';
import type { TagPickerControlProps } from './TagPickerControl.types';
import { useTagPickerControlBase_unstable } from './useTagPickerControl';
import { renderTagPickerControl_unstable } from './renderTagPickerControl';
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const control = () => cy.get('.fui-TagPickerControl');
const input = () => cy.get('[data-test="input"]');
const expand = () => cy.get('.fui-TagPickerControl__expandIcon');
const list = () => cy.get('.fui-TagPickerList');
const active = (name: string) =>
  cy
    .get(`[data-option="${name}"]`)
    .invoke('attr', 'id')
    .then(id => input().should('have.attr', 'aria-activedescendant', id).and('be.focused'));
const options = ['John', 'Jane', 'Erika'];
const Fixture = ({
  controlProps,
  initial = [],
  secondary = false,
  button = false,
  onOptionSelect,
  ...props
}: Omit<TagPickerProps, 'children'> & {
  controlProps?: TagPickerControlProps;
  initial?: string[];
  secondary?: boolean;
  button?: boolean;
}) => {
  const [selected, setSelected] = React.useState(initial);
  const Input = button ? TagPickerButton : TagPickerInput;
  return (
    <>
      <button data-test="before">Before</button>
      <TagPicker
        selectedOptions={selected}
        onOptionSelect={(event, data) => {
          onOptionSelect?.(event, data);
          setSelected(data.selectedOptions);
        }}
        {...props}
      >
        <TagPickerControl
          style={{ maxWidth: `calc(${tokens.spacingHorizontalXXXL} * 12)` }}
          secondaryAction={
            secondary ? (
              <Button data-test="clear" onClick={() => setSelected([])}>
                All Clear
              </Button>
            ) : undefined
          }
          {...controlProps}
        >
          <TagPickerGroup aria-label="Selected employees">
            {selected.map(name => (
              <Tag key={name} value={name} dismissible data-tag={name}>
                {name}
              </Tag>
            ))}
          </TagPickerGroup>
          <Input aria-label="Employees" data-test="input" />
        </TagPickerControl>
        <TagPickerList>
          {options
            .filter(name => !selected.includes(name))
            .map(name => (
              <TagPickerOption key={name} value={name} data-option={name}>
                {name}
              </TagPickerOption>
            ))}
        </TagPickerList>
      </TagPicker>
      <button data-test="after">After</button>
    </>
  );
};
const cssColor = (color: string) =>
  color === 'transparent'
    ? 'rgba(0, 0, 0, 0)'
    : color.startsWith('#')
    ? `rgb(${[1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16)).join(', ')})`
    : color.replace(/,\s*/g, ', ');

describe('TagPickerControl documented scenarios (round 1)', () => {
  it('Default: expand pointer toggles popup, focuses input, exposes real ownership and actual mousedown envelope', () => {
    const changes = cy.stub().as('changes');
    mount(<Fixture onOpenChange={changes} />);
    expand()
      .should('have.attr', 'role', 'button')
      .and('have.attr', 'aria-label', 'Open Employees')
      .and('have.attr', 'aria-expanded', 'false')
      .click();
    input().should('be.focused').and('have.attr', 'aria-expanded', 'true');
    list()
      .should('be.visible')
      .invoke('attr', 'id')
      .then(id => control().should('have.attr', 'aria-owns', id));
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(() => {
      const [event, data] = changes.firstCall.args;
      expect(data).to.deep.equal({ open: true, type: 'mousedown', event });
    });
    expand().click();
    input().should('be.focused').and('have.attr', 'aria-expanded', 'false');
    control().should('not.have.attr', 'aria-owns');
  });
  it('Default/README: native Tab/arrows/Enter select a tag while input focus and control identity are retained', () => {
    const select = cy.stub().as('select');
    mount(<Fixture onOptionSelect={select} />);
    cy.get('[data-test="before"]').focus().realPress('Tab');
    input().should('be.focused').realPress('ArrowDown');
    list().should('be.visible');
    active('John');
    cy.realPress('ArrowDown');
    active('Jane');
    cy.realPress('Enter');
    cy.get('[data-tag="Jane"]').should('exist');
    input().should('be.focused').and('have.attr', 'aria-expanded', 'false');
    cy.get('@select').should('have.been.calledOnce');
    cy.get('@select').then(() => {
      const [event, data] = select.firstCall.args;
      expect(data).to.deep.equal({ value: 'Jane', selectedOptions: ['Jane'], type: event.type, event });
    });
    cy.realPress('Tab');
    cy.get('[data-test="after"]').should('be.focused');
  });
  it('SecondaryAction: native Tab reaches clear, removes selected tags without opening the popup', () => {
    mount(<Fixture initial={['John']} secondary />);
    cy.get('[data-tag="John"]').should('exist');
    input().focus().realPress('Tab');
    cy.get('[data-test="clear"]').should('be.focused').realPress('Enter');
    cy.get('[data-tag="John"]').should('not.exist');
    control().should('not.have.attr', 'aria-owns');
    expand().should('have.attr', 'aria-expanded', 'false');
  });
  it('ExpandIcon: custom nested icon opens the popup; explicit null removes expand and aside', () => {
    mount(<Fixture controlProps={{ expandIcon: <span data-test="custom-icon">Expand</span> }} />);
    cy.get('[data-test="custom-icon"]').click();
    list().should('be.visible');
    input().should('be.focused');
    cy.realPress('Escape');
    mount(<Fixture controlProps={{ expandIcon: null }} />);
    expand().should('not.exist');
    cy.get('.fui-TagPickerControl__aside').should('not.exist');
    input().focus().realPress('ArrowDown');
    list().should('be.visible');
  });
  it('NoPopover: no automatic expand/aside or aria-owns while consumer Enter can add a custom tag', () => {
    const Custom = () => {
      const [tags, setTags] = React.useState<string[]>([]);
      const [value, setValue] = React.useState('');
      return (
        <TagPicker noPopover selectedOptions={tags}>
          <TagPickerControl>
            <TagPickerGroup>
              {tags.map(name => (
                <Tag key={name} value={name} data-tag={name}>
                  {name}
                </Tag>
              ))}
            </TagPickerGroup>
            <TagPickerInput
              data-test="input"
              aria-label="Add employees"
              value={value}
              onChange={event => setValue(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && value) {
                  setTags([...tags, value]);
                  setValue('');
                }
              }}
            />
          </TagPickerControl>
        </TagPicker>
      );
    };
    mount(<Custom />);
    expand().should('not.exist');
    input().type('Ada').realPress('Enter');
    cy.get('[data-tag="Ada"]').should('exist');
    input().should('have.value', '');
    control().should('not.have.attr', 'aria-owns');
    list().should('not.exist');
  });
  (['medium', 'large', 'extra-large'] as const).forEach((size, index) => {
    it(`Size ${size}: inherited control/aside/icon dimensions and pointer interaction`, () => {
      mount(<Fixture size={size} />);
      control().should('have.css', 'min-height', ['32px', '40px', '44px'][index]);
      cy.get('.fui-TagPickerControl__aside').should('have.css', 'min-height', ['32px', '40px', '44px'][index]);
      expand().should('have.css', 'font-size', ['16px', '20px', '24px'][index]).click();
      list().should('be.visible');
    });
  });
  (['outline', 'underline', 'filled-lighter', 'filled-darker'] as const).forEach(appearance => {
    it(`Appearance ${appearance}: computed control styling and native Escape contract`, () => {
      mount(<Fixture appearance={appearance} />);
      control().should(
        'have.css',
        'background-color',
        cssColor(
          appearance === 'filled-darker'
            ? webLightTheme.colorNeutralBackground3
            : appearance === 'underline'
            ? webLightTheme.colorTransparentBackground
            : webLightTheme.colorNeutralBackground1,
        ),
      );
      control().should(
        'have.css',
        'border-radius',
        appearance === 'underline' ? '0px' : webLightTheme.borderRadiusMedium,
      );
      input().focus().realPress('ArrowDown');
      list().should('be.visible');
      cy.realPress('Escape');
      input().should('be.focused').and('have.attr', 'aria-expanded', 'false');
    });
  });
  it('TagPickerButton composition: control pointer focuses the button-backed combobox and native selection works', () => {
    mount(<Fixture button />);
    expand().click();
    input().should('have.prop', 'tagName', 'BUTTON').and('be.focused');
    cy.realPress('ArrowDown');
    cy.realPress('Enter');
    cy.get('[data-tag]').should('have.length', 1);
  });
  it('Disabled story prevents expansion while a consumer secondary action can change selected tags', () => {
    const changes = cy.stub().as('changes');
    const select = cy.stub().as('select');
    mount(<Fixture disabled secondary initial={['John']} onOpenChange={changes} onOptionSelect={select} />);
    input().should('be.disabled');
    expand().should('have.attr', 'aria-disabled', 'true').click();
    control().should('not.have.attr', 'aria-owns');
    cy.get('@changes').should('not.have.been.called');
    cy.get('[data-tag="John"]').should('be.disabled');
    cy.get('[data-test="clear"]').focus().realPress('Enter');
    cy.get('[data-tag="John"]').should('not.exist');
    cy.get('@select').should('not.have.been.called');
  });
});

describe('TagPickerControl a11y/cancellation edges (round 2)', () => {
  it('consumer root mousedown is preserved and can cancel expand toggling without an open callback', () => {
    const mouse = cy.stub().as('mouse');
    const changes = cy.stub().as('changes');
    mount(
      <Fixture
        onOpenChange={changes}
        controlProps={{
          id: 'owned-control',
          onMouseDown: event => {
            mouse(event.type, event.currentTarget.id);
            event.preventDefault();
          },
        }}
      />,
    );
    expand().click();
    cy.get('@mouse').should('have.been.calledOnceWithExactly', 'mousedown', 'owned-control');
    cy.get('@changes').should('not.have.been.called');
    input().should('have.attr', 'aria-expanded', 'false');
    control().should('not.have.attr', 'aria-owns');
  });
  it('capture-phase cancellation blocks root toggling and preserves outside focus', () => {
    const changes = cy.stub().as('changes');
    mount(<Fixture onOpenChange={changes} controlProps={{ onMouseDownCapture: event => event.preventDefault() }} />);
    cy.get('[data-test="before"]').focus();
    expand().click();
    cy.get('[data-test="before"]').should('be.focused');
    cy.get('@changes').should('not.have.been.called');
    control().should('not.have.attr', 'aria-owns');
  });
  it('unrelated root child/secondary action clicks do not request expansion or steal input focus', () => {
    const changes = cy.stub().as('changes');
    const action = cy.stub().as('action');
    mount(
      <TagPicker onOpenChange={changes}>
        <TagPickerControl
          secondaryAction={
            <button data-test="secondary" onClick={action}>
              Extra
            </button>
          }
        >
          <span data-test="unrelated">Informational content</span>
          <TagPickerInput data-test="input" aria-label="Employees" />
        </TagPickerControl>
        <TagPickerList>
          <TagPickerOption value="John">John</TagPickerOption>
        </TagPickerList>
      </TagPicker>,
    );
    cy.get('[data-test="unrelated"]').click();
    control().should('not.have.attr', 'aria-owns');
    cy.get('[data-test="secondary"]').click().should('be.focused');
    cy.get('@changes').should('not.have.been.called');
    cy.get('@action').should('have.been.calledOnce');
  });
  it('native Home/End on the button-backed trigger reach option endpoints without selecting', () => {
    const select = cy.stub().as('select');
    mount(<Fixture button onOptionSelect={select} />);
    input().focus().realPress('ArrowDown');
    cy.realPress('End');
    active('Erika');
    cy.realPress('Home');
    active('John');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('Escape');
    input().should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });
  it('default expand label tracks a dynamic input aria-label without requiring remount', () => {
    let setLabel: React.Dispatch<React.SetStateAction<string>>;
    const Dynamic = () => {
      const [label, update] = React.useState('Employees');
      setLabel = update;
      return (
        <TagPicker>
          <TagPickerControl>
            <TagPickerInput aria-label={label} data-test="input" />
          </TagPickerControl>
          <TagPickerList>
            <TagPickerOption value="John">John</TagPickerOption>
          </TagPickerList>
        </TagPicker>
      );
    };
    mount(<Dynamic />);
    expand().should('have.attr', 'aria-label', 'Open Employees');
    cy.then(() => setLabel('Reviewers'));
    input().should('have.attr', 'aria-label', 'Reviewers');
    expand().should('have.attr', 'aria-label', 'Open Reviewers');
  });
  it('input labelledby builds real composed expand name references to Open plus the label element', () => {
    mount(
      <>
        <span id="employees-label">Employees</span>
        <TagPicker>
          <TagPickerControl>
            <TagPickerInput aria-labelledby="employees-label" data-test="input" />
          </TagPickerControl>
          <TagPickerList>
            <TagPickerOption value="John">John</TagPickerOption>
          </TagPickerList>
        </TagPicker>
      </>,
    );
    expand()
      .should('have.attr', 'aria-label', 'Open')
      .invoke('attr', 'id')
      .then(id => {
        expand().should('have.attr', 'aria-labelledby', `${id} employees-label`);
        cy.get('#employees-label').should('have.text', 'Employees');
        expect(id).to.be.a('string').and.not.equal('');
      });
  });
  it('explicit expand accessible name is preserved instead of overwritten by the input name', () => {
    mount(
      <Fixture controlProps={{ expandIcon: { 'aria-label': 'Choose an employee', children: <span>Expand</span> } }} />,
    );
    expand().should('have.attr', 'aria-label', 'Choose an employee');
    expand().click();
    list().should('be.visible');
    expand().should('have.attr', 'aria-label', 'Choose an employee');
  });
  (['outline', 'underline'] as const).forEach(appearance => {
    it(`Field error ${appearance} derives invalid border styling without stealing native input semantics`, () => {
      mount(
        <Field label="Employees" validationState="error" validationMessage="Choose an employee">
          <Fixture appearance={appearance} />
        </Field>,
      );
      control().should(
        'have.css',
        appearance === 'outline' ? 'border-top-color' : 'border-bottom-color',
        cssColor(webLightTheme.colorPaletteRedBorder2),
      );
      input().should('have.attr', 'aria-invalid', 'true').focus().realPress('ArrowDown');
      list().should('be.visible');
    });
  });
});

describe('TagPickerControl unit-derived/lifecycle contracts (round 3)', () => {
  it('root/expand/secondary refs preserve native attributes/classes and clear on full unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const expandRef = cy.stub().as('expandRef');
    const secondaryRef = cy.stub().as('secondaryRef');
    let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    const Lifecycle = () => {
      const [visible, update] = React.useState(true);
      setVisible = update;
      return visible ? (
        <TagPicker>
          <TagPickerControl
            ref={ref}
            id="native-control"
            title="Employees"
            className="consumer-control"
            aria-describedby="helper"
            expandIcon={{
              ref: expandRef,
              id: 'custom-expand',
              className: 'consumer-expand',
              'aria-label': 'Choose employees',
              children: <span>Expand</span>,
            }}
            secondaryAction={{
              ref: secondaryRef,
              id: 'secondary-slot',
              className: 'consumer-secondary',
              children: <button>Extra</button>,
            }}
          >
            <span id="helper">Choose reviewers</span>
            <TagPickerInput data-test="input" aria-label="Employees" />
          </TagPickerControl>
          <TagPickerList>
            <TagPickerOption value="John">John</TagPickerOption>
          </TagPickerList>
        </TagPicker>
      ) : (
        <p data-test="removed">Removed</p>
      );
    };
    mount(<Lifecycle />);
    control()
      .should('have.class', 'consumer-control')
      .and('have.attr', 'id', 'native-control')
      .and('have.attr', 'title', 'Employees')
      .and('have.attr', 'aria-describedby', 'helper')
      .then($el => expect(ref.current).to.equal($el[0]));
    expand()
      .should('have.class', 'consumer-expand')
      .and('have.attr', 'id', 'custom-expand')
      .then($el => expect(expandRef.lastCall.args[0]).to.equal($el[0]));
    cy.get('#secondary-slot')
      .should('have.class', 'consumer-secondary')
      .then($el => expect(secondaryRef.lastCall.args[0]).to.equal($el[0]));
    expand().click();
    list().should('be.visible');
    control().then($control =>
      list().then($list =>
        expect($list[0].getBoundingClientRect().width).to.be.closeTo($control[0].getBoundingClientRect().width, 1),
      ),
    );
    cy.then(() => setVisible(false));
    cy.get('[data-test="removed"]').should('exist');
    cy.then(() => {
      expect(ref.current).to.equal(null);
      expect(expandRef.lastCall.args[0]).to.equal(null);
      expect(secondaryRef.lastCall.args[0]).to.equal(null);
    });
  });
  it('ResizeObserver tracks live aside width and removes stale reserved padding when both slots disappear', () => {
    let setStage: React.Dispatch<React.SetStateAction<number>>;
    let firstWidth = 0;
    const Dynamic = () => {
      const [stage, update] = React.useState(0);
      setStage = update;
      return (
        <Fixture
          controlProps={{
            expandIcon: stage === 2 ? null : undefined,
            secondaryAction:
              stage === 2 ? null : <Button>{stage === 0 ? 'Extra' : 'Extra action with wide text'}</Button>,
          }}
        />
      );
    };
    mount(<Dynamic />);
    control().should($control => {
      const doc = $control[0].ownerDocument;
      const styles = doc.defaultView!.getComputedStyle($control[0]);
      const aside = $control[0].querySelector('.fui-TagPickerControl__aside')!;
      const measured = parseFloat(styles.getPropertyValue('--fui-TagPickerControl-aside-width'));
      expect(measured).to.be.greaterThan(0);
      expect(measured).to.be.closeTo(aside.getBoundingClientRect().width, 1);
      expect(parseFloat(styles.paddingRight)).to.be.closeTo(measured + parseFloat(webLightTheme.spacingHorizontalM), 1);
      firstWidth = measured;
    });
    cy.then(() => setStage(1));
    control().should($control => {
      const styles = $control[0].ownerDocument.defaultView!.getComputedStyle($control[0]);
      const aside = $control[0].querySelector('.fui-TagPickerControl__aside')!;
      const measured = parseFloat(styles.getPropertyValue('--fui-TagPickerControl-aside-width'));
      expect(measured).to.be.greaterThan(firstWidth);
      expect(measured).to.be.closeTo(aside.getBoundingClientRect().width, 1);
    });
    cy.then(() => setStage(2));
    cy.get('.fui-TagPickerControl__aside').should('not.exist');
    control().should('have.css', 'padding-right', webLightTheme.spacingHorizontalM);
    control().then($el => expect($el[0].style.getPropertyValue('--fui-TagPickerControl-aside-width')).to.equal(''));
  });
  it('an explicitly supplied consumer aside width survives when expand and secondary slots are absent', () => {
    mount(
      <Fixture
        controlProps={{
          expandIcon: null,
          secondaryAction: null,
          style: { '--fui-TagPickerControl-aside-width': tokens.spacingHorizontalXXL },
        }}
      />,
    );
    cy.get('.fui-TagPickerControl__aside').should('not.exist');
    control().should(
      'have.css',
      'padding-right',
      `${parseFloat(webLightTheme.spacingHorizontalM) + parseFloat(webLightTheme.spacingHorizontalXXL)}px`,
    );
    control().then($el =>
      expect($el[0].style.getPropertyValue('--fui-TagPickerControl-aside-width')).to.equal(tokens.spacingHorizontalXXL),
    );
  });
  it('latest root/parent callbacks retain currentTarget, event identity and consumer-before-toggle ordering', () => {
    const calls = cy.stub().as('calls');
    let setVersion: React.Dispatch<React.SetStateAction<number>>;
    const Current = () => {
      const [version, update] = React.useState(0);
      setVersion = update;
      return (
        <Fixture
          controlProps={{
            id: `control-${version}`,
            onMouseDown: event => calls('consumer', version, event.currentTarget.id, event.defaultPrevented),
          }}
          onOpenChange={(event, data) =>
            calls('parent', version, event.type, data.open, data.event === event, event.defaultPrevented)
          }
        />
      );
    };
    mount(<Current />);
    control().should('have.attr', 'id', 'control-0');
    cy.then(() => setVersion(1));
    control().should('have.attr', 'id', 'control-1');
    expand().click();
    list().should('be.visible');
    cy.get('@calls').then(() =>
      expect(calls.getCalls().map(call => call.args)).to.deep.equal([
        ['consumer', 1, 'control-1', false],
        ['parent', 1, 'mousedown', true, true, true],
      ]),
    );
  });
  it('controlled parent rejects pointer/keyboard requests until external open changes without extra callbacks', () => {
    const changes = cy.stub().as('changes');
    let setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    const Controlled = () => {
      const [open, update] = React.useState(false);
      setOpen = update;
      return <Fixture open={open} onOpenChange={changes} />;
    };
    mount(<Controlled />);
    expand().click();
    input().should('have.attr', 'aria-expanded', 'false');
    control().should('not.have.attr', 'aria-owns');
    cy.get('@changes').should('have.been.calledOnce');
    cy.then(() => changes.resetHistory());
    cy.then(() => setOpen(true));
    list().should('be.visible');
    cy.get('@changes').should('not.have.been.called');
    input().focus().realPress('Escape');
    list().should('be.visible');
    input().should('have.attr', 'aria-expanded', 'true');
    cy.get('@changes').should('have.been.calledOnce');
  });
  it('defaultOpen initializes once and later default changes do not open the control', () => {
    let setDefault: React.Dispatch<React.SetStateAction<boolean>>;
    const Defaults = () => {
      const [value, update] = React.useState(false);
      setDefault = update;
      return (
        <div data-default={String(value)}>
          <Fixture defaultOpen={value} />
        </div>
      );
    };
    mount(<Defaults />);
    control().should('exist');
    cy.then(() => setDefault(true));
    cy.get('[data-default="true"]').should('exist');
    expand().should('have.attr', 'aria-expanded', 'false');
    control().should('not.have.attr', 'aria-owns');
  });
  it('unit Base hook has no automatic expand/aside, but explicit expand object remains functional', () => {
    const Base = React.forwardRef<HTMLDivElement, TagPickerControlProps>((props, ref) =>
      renderTagPickerControl_unstable(useTagPickerControlBase_unstable(props, ref)),
    );
    mount(
      <TagPicker>
        <Base>
          <TagPickerInput data-test="input" aria-label="Employees" />
        </Base>
        <TagPickerList>
          <TagPickerOption value="John">John</TagPickerOption>
        </TagPickerList>
      </TagPicker>,
    );
    cy.get('[data-test="input"]').should('exist');
    cy.get('[role="button"]').should('not.exist');
    mount(
      <TagPicker>
        <Base expandIcon={{ id: 'base-expand', 'aria-label': 'Expand choices', children: <span>Open</span> }}>
          <TagPickerInput data-test="input" aria-label="Employees" />
        </Base>
        <TagPickerList>
          <TagPickerOption value="John">John</TagPickerOption>
        </TagPickerList>
      </TagPicker>,
    );
    cy.get('#base-expand').should('have.attr', 'role', 'button').click();
    list().should('be.visible');
    input().should('be.focused');
  });
  it('dynamic parent size/appearance update existing control, aside and icon styles without replacing root', () => {
    let setLarge: React.Dispatch<React.SetStateAction<boolean>>;
    const Dynamic = () => {
      const [large, update] = React.useState(false);
      setLarge = update;
      return <Fixture size={large ? 'extra-large' : 'medium'} appearance={large ? 'filled-darker' : 'underline'} />;
    };
    mount(<Dynamic />);
    control()
      .should('have.css', 'min-height', '32px')
      .then($root => {
        cy.then(() => setLarge(true));
        control()
          .should('have.css', 'min-height', '44px')
          .and('have.css', 'background-color', cssColor(webLightTheme.colorNeutralBackground3))
          .then($next => expect($next[0]).to.equal($root[0]));
      });
    expand().should('have.css', 'font-size', '24px');
    cy.get('.fui-TagPickerControl__aside').should('have.css', 'min-height', '44px');
  });
});
