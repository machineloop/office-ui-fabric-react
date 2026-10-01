import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { useTabsterAttributes } from '@fluentui/react-tabster';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { Dropdown, Combobox, OptionGroup } from '@fluentui/react-combobox';
import type { DropdownProps, ComboboxProps } from '@fluentui/react-combobox';
import type { ExtractSlotProps, JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import type { OptionProps, OptionSlots } from './Option.types';
import { ACTIVEDESCENDANT_FOCUSVISIBLE_ATTRIBUTE, ActiveDescendantContextProvider } from '@fluentui/react-aria';
import type { ActiveDescendantImperativeRef } from '@fluentui/react-aria';
import { ListboxContext } from '../../contexts/ListboxContext';
import type { ListboxContextValue } from '../../contexts/ListboxContext';
import { useOptionCollection } from '../../utils/useOptionCollection';
import { Option } from './Option';
import { optionClassNames } from './useOptionStyles.styles';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const trigger = () => cy.get('[role="combobox"]');
const option = (id: string) => cy.get(`#${id}`);
const check = (id: string) => option(id).find(`.${optionClassNames.checkIcon}`);
const rgb = (hex: string) => `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
const active = (id: string) => {
  trigger().should('have.attr', 'aria-activedescendant', id).and('be.focused');
  option(id).should('be.visible');
};
const payload = (alias: string, index: number, value: string, text: string, selection: string[]) =>
  cy.get(alias).its(`args.${index}.1`).should('deep.equal', {
    optionValue: value,
    optionText: text,
    selectedOptions: selection,
  });

describe('Option - edges and accessibility', () => {
  for (const editable of [false, true]) {
    it(`keeps disabled options arrow navigable but not selectable in ${editable ? 'Combobox' : 'Dropdown'}`, () => {
      const Control = editable ? Input : Select;
      mount(
        <Control onOptionSelect={cy.stub().as('select')}>
          <Option id="enabled">Enabled</Option>
          <Option id="disabled" disabled onClick={cy.stub().as('click')}>
            Disabled
          </Option>
          <Option id="last">Last</Option>
        </Control>,
      );
      trigger().focus();
      cy.realPress('ArrowDown');
      active('enabled');
      cy.realPress('ArrowDown');
      active('disabled');
      option('disabled').should('have.attr', 'aria-disabled', 'true').and('not.have.attr', 'tabindex');
      cy.realPress('Enter');
      cy.get('@select').should('not.have.been.called');
      cy.get('@click').should('not.have.been.called');
      trigger().should('have.attr', 'aria-expanded', 'true');
      cy.realPress('End');
      active('last');
      cy.realPress('Enter');
      payload('@select', 0, 'Last', 'Last', ['Last']);
    });
  }

  it('suppresses disabled pointer click selection and handlers without swallowing other native mouse events', () => {
    mount(
      <Select defaultOpen onOptionSelect={cy.stub().as('select')}>
        <Option
          id="disabled"
          disabled
          onClick={cy.stub().as('click')}
          onMouseDown={cy.stub().as('down')}
          onMouseUp={cy.stub().as('up')}
        >
          Disabled
        </Option>
        <Option id="enabled">Enabled</Option>
      </Select>,
    );
    option('disabled').realClick();
    cy.get('@down').should('have.been.calledOnce');
    cy.get('@up').should('have.been.calledOnce');
    cy.get('@click').should('not.have.been.called');
    cy.get('@select').should('not.have.been.called');
    trigger().should('have.attr', 'aria-expanded', 'true');
    option('enabled').realClick();
    payload('@select', 0, 'Enabled', 'Enabled', ['Enabled']);
  });

  it('supports disabled selected multiselect semantics and retains the selection', () => {
    mount(
      <Select multiselect defaultOpen defaultSelectedOptions={['locked']} onOptionSelect={cy.stub().as('select')}>
        <Option id="locked" disabled>
          locked
        </Option>
        <Option id="available">available</Option>
      </Select>,
    );
    option('locked').should('have.attr', 'aria-checked', 'true').and('have.attr', 'aria-disabled', 'true').click();
    cy.get('@select').should('not.have.been.called');
    check('locked').find('svg').should('have.length', 1);
    option('available').click();
    payload('@select', 0, 'available', 'available', ['locked', 'available']);
    option('locked').should('have.attr', 'aria-checked', 'true');
  });

  it('navigates Home, End and arrows with active descendants, not DOM focus on the options', () => {
    mount(<Select onOptionSelect={cy.stub().as('select')} />);
    trigger().focus();
    cy.realPress('ArrowDown');
    active('cat');
    cy.realPress('End');
    active('duck');
    cy.realPress('ArrowUp');
    active('dog');
    cy.realPress('Home');
    active('cat');
    option('cat').should('have.attr', 'aria-selected', 'false');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('Escape');
    option('cat').should('not.be.visible');
    trigger().should('have.attr', 'aria-expanded', 'false');
    trigger().should('not.have.attr', 'aria-activedescendant');
    trigger().should('be.focused');
  });

  it('toggles multiple selection with real Space and Enter keyboard events', () => {
    mount(<Select multiselect onOptionSelect={cy.stub().as('select')} />);
    trigger().focus();
    cy.realPress('ArrowDown');
    cy.realPress('Space');
    payload('@select', 0, 'Cat', 'Cat', ['Cat']);
    option('cat').should('have.attr', 'aria-checked', 'true');
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Enter');
    payload('@select', 1, 'canine', 'Dog', ['Cat', 'canine']);
    cy.realPress('Space');
    payload('@select', 2, 'canine', 'Dog', ['Cat']);
    option('dog').should('have.attr', 'aria-checked', 'false');
    trigger().should('have.attr', 'aria-expanded', 'true');
  });

  it('exposes unique generated IDs and portaled ownership with correctly named options', () => {
    mount(
      <Select inlinePopup={false}>
        <Option aria-label="Accessible Cat">Visible Cat</Option>
        <Option aria-labelledby="dog-label" text="Dog">
          <span id="dog-label">Accessible Dog</span>
        </Option>
      </Select>,
    );
    trigger().focus();
    cy.realPress('ArrowDown');
    cy.get('[role="option"]')
      .should('have.length', 2)
      .then($options => {
        const ids = [...$options].map(el => el.id);
        expect(ids.every(Boolean)).to.equal(true);
        expect(new Set(ids).size).to.equal(2);
        trigger().should('have.attr', 'aria-activedescendant', ids[0]);
      });
    cy.get('[role="listbox"]').then($listbox => {
      trigger().should('have.attr', 'aria-controls', $listbox.attr('id'));
      cy.get('.fui-Dropdown').should('have.attr', 'aria-owns', $listbox.attr('id'));
    });
    cy.get('[role="option"]').eq(0).should('have.attr', 'aria-label', 'Accessible Cat');
    cy.get('[role="option"]').eq(1).should('have.attr', 'aria-labelledby', 'dog-label');
    cy.realPress('ArrowDown');
    cy.get('[role="option"]')
      .eq(1)
      .then($option => trigger().should('have.attr', 'aria-activedescendant', $option.attr('id')));
    trigger().should('be.focused');
  });

  it('forwards root and check refs, native props and a check render function without losing semantics', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const checkRef = React.createRef<HTMLSpanElement>();
    const renderCheck: SlotRenderFunction<ExtractSlotProps<OptionSlots['checkIcon']>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <i>Custom mark</i>
      </Component>
    );
    mount(
      <Select defaultOpen>
        <Option
          id="native"
          value="native"
          text="Native"
          ref={rootRef}
          title="Tooltip"
          lang="en"
          data-native="yes"
          className="custom-option"
          checkIcon={{ ref: checkRef, children: renderCheck, className: 'custom-check' }}
        >
          Native
        </Option>
      </Select>,
    );
    option('native').should('have.attr', 'data-native', 'yes');
    option('native')
      .should('have.attr', 'title', 'Tooltip')
      .and('have.attr', 'lang', 'en')
      .and('have.class', 'custom-option');
    check('native')
      .should('have.attr', 'data-rendered', 'true')
      .and('have.class', 'custom-check')
      .and('have.attr', 'aria-hidden', 'true');
    option('native').then($root => expect(rootRef.current).to.equal($root[0]));
    check('native').then($check => expect(checkRef.current).to.equal($check[0]));
    option('native').click();
    trigger().should('have.text', 'Native').click();
    option('native').should('have.attr', 'aria-selected', 'true');
    check('native').should('have.css', 'visibility', 'visible');
  });

  it('calls native mouse handlers and prevents mousedown focus transfer without preventing selection', () => {
    mount(
      <Select defaultOpen onOptionSelect={cy.stub().as('select')}>
        <Option
          id="mouse"
          onMouseEnter={cy.stub().as('enter')}
          onMouseLeave={cy.stub().as('leave')}
          onMouseDown={event => {
            event.preventDefault();
          }}
          onClick={cy.stub().as('click')}
        >
          Mouse
        </Option>
      </Select>,
    );
    trigger().focus();
    option('mouse').realHover();
    cy.get('@enter').should('have.been.calledOnce');
    trigger().realHover();
    cy.get('@leave').should('have.been.calledOnce');
    option('mouse').realClick();
    payload('@select', 0, 'Mouse', 'Mouse', ['Mouse']);
    cy.get('@click').should('have.been.calledOnce');
    trigger().should('be.focused');
  });

  for (const size of ['small', 'medium', 'large'] as const) {
    it(`keeps Option token geometry independent of parent ${size} sizing`, () => {
      mount(
        <Select defaultOpen size={size}>
          <Option id="sized">Sized</Option>
        </Select>,
      );
      option('sized')
        .should('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
        .and('have.css', 'line-height', teamsLightTheme.lineHeightBase300)
        .and('have.css', 'padding-top', teamsLightTheme.spacingVerticalSNudge)
        .and('have.css', 'padding-left', teamsLightTheme.spacingHorizontalS);
      option('sized').click();
      trigger().should('have.text', 'Sized');
    });
  }

  for (const dark of [false, true]) {
    it(`uses ${dark ? 'dark' : 'light'} theme colors for selected, unselected and disabled checks`, () => {
      const theme = dark ? teamsDarkTheme : teamsLightTheme;
      mount(
        <Select multiselect defaultOpen defaultSelectedOptions={['Selected']}>
          <Option id="color-selected">Selected</Option>
          <Option id="color-unselected">Unselected</Option>
          <Option id="color-disabled" disabled>
            Disabled
          </Option>
        </Select>,
        'ltr',
        dark,
      );
      trigger().realHover();
      check('color-selected')
        .should('have.css', 'background-color', rgb(theme.colorCompoundBrandBackground))
        .and('have.css', 'color', rgb(theme.colorNeutralForegroundInverted))
        .and('have.css', 'border-top-color', rgb(theme.colorCompoundBrandBackground));
      check('color-unselected').should('have.css', 'border-top-color', rgb(theme.colorNeutralStrokeAccessible));
      option('color-disabled').should('have.css', 'color', rgb(theme.colorNeutralForegroundDisabled));
      check('color-disabled').should('have.css', 'border-top-color', rgb(theme.colorNeutralForegroundDisabled));
    });
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`places the check before text in ${dir} geometry and preserves the hit target`, () => {
      mount(
        <Select multiselect defaultOpen>
          <Option id="geometry" text="Geometry">
            <span data-text="true">Geometry</span>
          </Option>
        </Select>,
        dir,
      );
      option('geometry').should('have.css', 'direction', dir);
      option('geometry').then($option => {
        const iconRect = $option.find(`.${optionClassNames.checkIcon}`)[0].getBoundingClientRect();
        const textRect = $option.find('[data-text]')[0].getBoundingClientRect();
        expect(iconRect.width).to.equal(16);
        expect(iconRect.height).to.equal(16);
        expect(dir === 'ltr' ? iconRect.right <= textRect.left : iconRect.left >= textRect.right).to.equal(true);
      });
      check('geometry').realClick();
      option('geometry').should('have.attr', 'aria-checked', 'true');
      trigger().should('be.focused');
    });
  }

  it('applies the keyboard focus-visible outline to the active descendant', () => {
    mount(<Select />);
    trigger().focus();
    cy.realPress('ArrowDown');
    cy.realPress('ArrowDown');
    active('dog');
    option('dog').should('have.attr', ACTIVEDESCENDANT_FOCUSVISIBLE_ATTRIBUTE);
    option('dog').then($option => {
      const style = $option[0].ownerDocument.defaultView!.getComputedStyle($option[0], '::after');
      expect(style.pointerEvents).to.equal('none');
      expect(style.borderTopWidth).to.equal('2px');
      expect(style.position).to.equal('absolute');
    });
  });

  it('uses GrayText for disabled root and check in supported forced-colors mode', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    mount(
      <Select multiselect defaultOpen>
        <Option id="forced" disabled>
          Disabled
        </Option>
        <Option id="normal">Normal</Option>
      </Select>,
    );
    option('forced').then($option => {
      const view = $option[0].ownerDocument.defaultView!;
      expect(view.matchMedia('(forced-colors: active)').matches).to.equal(true);
      const rootColor = view.getComputedStyle($option[0]).color;
      const checkColor = view.getComputedStyle($option.find(`.${optionClassNames.checkIcon}`)[0]).color;
      const probe = $option[0].ownerDocument.createElement('span');
      probe.style.color = 'GrayText';
      $option[0].appendChild(probe);
      expect(rootColor).to.equal(view.getComputedStyle(probe).color);
      expect(checkColor).to.equal(rootColor);
      probe.remove();
    });
    option('normal').realClick();
    option('normal').should('have.attr', 'aria-checked', 'true');
  });

  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });
});

const Choices = () => (
  <>
    <Option id="cat">Cat</Option>
    <Option id="dog" value="canine" text="Dog">
      <span>Dog</span>
      <small>Friendly companion</small>
    </Option>
    <Option id="duck" value="bird">
      Duck
    </Option>
  </>
);
const Select = (props: DropdownProps) => (
  <Dropdown aria-label="Animal" inlinePopup {...props}>
    {props.children ?? <Choices />}
  </Dropdown>
);
const Input = (props: ComboboxProps) => (
  <Combobox aria-label="Animal" inlinePopup {...props}>
    {props.children ?? <Choices />}
  </Combobox>
);

const contextDefaults: ListboxContextValue = {
  activeOption: undefined,
  focusVisible: false,
  multiselect: false,
  selectedOptions: [],
  getOptionById: () => undefined,
  getOptionsMatchingValue: () => [],
  registerOption: () => () => undefined,
  selectOption: () => undefined,
  setActiveOption: () => undefined,
  onOptionClick: () => undefined,
};

describe('Option - unit-derived lifecycle and event scenarios', () => {
  for (const editable of [false, true]) {
    for (const backwards of [false, true]) {
      it(`re-registers Options after blur and preserves exact selection across real ${
        backwards ? 'Shift+Tab' : editable ? 'forward Tab' : 'forward Tab interception'
      } in ${editable ? 'Combobox' : 'Dropdown'}`, () => {
        const Control = editable ? Input : Select;
        const selects = backwards || editable;
        const keys: string[] = [];
        const Fixture = () => {
          const attrs = useTabsterAttributes({ root: {} });
          const onKeyDown = (event: React.KeyboardEvent) => keys.push(event.key);
          return (
            <div {...attrs}>
              <button id="before">Before</button>
              <Control
                onOptionSelect={cy.stub().as('select')}
                {...(editable ? { input: { onKeyDown } } : { button: { onKeyDown } })}
              />
              <button id="after">After</button>
            </div>
          );
        };
        mount(<Fixture />);
        trigger().focus();
        cy.realPress('ArrowDown');
        active('cat');
        cy.realPress('Enter');
        payload('@select', 0, 'Cat', 'Cat', ['Cat']);
        cy.get('@select').invoke('resetHistory');
        cy.realPress('ArrowDown');
        active('cat');
        cy.realPress('ArrowDown');
        active('dog');
        option('dog').should('have.attr', 'aria-selected', 'false');
        option('dog').then($option => {
          const element = $option[0];
          cy.realPress(backwards ? ['Shift', 'Tab'] : 'Tab');
          cy.focused().should('have.id', backwards ? 'before' : 'after');
          trigger().should('have.attr', 'aria-expanded', 'false');
          trigger().should('not.have.attr', 'aria-activedescendant');
          option('dog').should('not.exist');
          cy.then(() => expect(element.isConnected).to.equal(false));
          if (selects) {
            cy.get('@select').should('have.been.calledOnce');
            payload('@select', 0, 'canine', 'Dog', ['canine']);
            cy.then(() => expect(keys).to.include('Tab'));
          } else {
            cy.get('@select').should('not.have.been.called');
            cy.then(() => expect(keys).not.to.include('Tab'));
          }
          trigger().should(editable ? 'have.value' : 'have.text', selects ? 'Dog' : 'Cat');
          trigger().focus();
          cy.realPress('ArrowDown');
          active(selects ? 'dog' : 'cat');
          option('dog').should('have.attr', 'aria-selected', String(selects));
          option('dog').then($reopened => expect($reopened[0]).not.to.equal(element));
          if (!selects) {
            cy.realPress('ArrowDown');
          }
          active('dog');
          cy.realPress('Enter');
          cy.get('@select').should(selects ? 'have.been.calledTwice' : 'have.been.calledOnce');
          payload('@select', selects ? 1 : 0, 'canine', 'Dog', ['canine']);
          trigger().should(editable ? 'have.value' : 'have.text', 'Dog');
        });
      });
    }
  }

  it('retains multiselect checks and registered values when Escape hides and reopens the same Options', () => {
    mount(<Select multiselect defaultSelectedOptions={['Cat']} onOptionSelect={cy.stub().as('select')} />);
    trigger().focus();
    cy.realPress('ArrowDown');
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Enter');
    payload('@select', 0, 'canine', 'Dog', ['Cat', 'canine']);
    option('dog').then($option => {
      const element = $option[0];
      cy.realPress('Escape');
      trigger().should('have.attr', 'aria-expanded', 'false');
      trigger().should('not.have.attr', 'aria-activedescendant');
      trigger().should('be.focused').and('have.text', 'Cat, Dog');
      option('cat').should('not.be.visible').and('have.attr', 'aria-checked', 'true');
      option('dog').should('not.be.visible').and('have.attr', 'aria-checked', 'true');
      option('dog').then($hidden => expect($hidden[0]).to.equal(element));
      cy.get('@select').should('have.been.calledOnce');
      cy.realPress('ArrowDown');
      active('cat');
      option('cat').should('have.attr', 'aria-checked', 'true');
      option('dog').should('be.visible').and('have.attr', 'aria-checked', 'true');
      check('dog').find('svg').should('have.length', 1);
      option('dog').then($reopened => expect($reopened[0]).to.equal(element));
      cy.realPress('ArrowDown');
      active('dog');
      cy.realPress('Enter');
      payload('@select', 1, 'canine', 'Dog', ['Cat']);
      cy.get('@select').should('have.been.calledTwice');
      option('dog').should('have.attr', 'aria-checked', 'false');
      check('dog').find('svg').should('not.exist');
      trigger().should('have.attr', 'aria-expanded', 'true').and('have.text', 'Cat');
    });
  });

  for (const freeform of [false, true]) {
    it(`retains Combobox Option registration across Escape with ${
      freeform ? 'preserved freeform' : 'reset'
    } typed text`, () => {
      mount(<Input freeform={freeform} onOptionSelect={cy.stub().as('select')} />);
      trigger().focus();
      cy.realPress('ArrowDown');
      active('cat');
      cy.realPress('Enter');
      payload('@select', 0, 'Cat', 'Cat', ['Cat']);
      cy.get('@select').invoke('resetHistory');
      cy.realPress('ArrowDown');
      active('cat');
      trigger().should('have.value', 'Cat');
      cy.realPress(['Control', 'A']);
      cy.realType('Do');
      trigger().should('have.value', 'Do');
      active('dog');
      option('cat').should('have.attr', 'aria-selected', 'true');
      option('dog').should('have.attr', 'aria-selected', 'false');
      option('dog').then($option => {
        const element = $option[0];
        cy.realPress('Escape');
        trigger().should('have.attr', 'aria-expanded', 'false');
        trigger().should('not.have.attr', 'aria-activedescendant');
        trigger()
          .should('be.focused')
          .and('have.value', freeform ? 'Do' : 'Cat');
        option('dog').should('not.be.visible').and('have.attr', 'aria-selected', 'false');
        option('dog').then($hidden => expect($hidden[0]).to.equal(element));
        cy.get('@select').should('not.have.been.called');
        cy.realPress('ArrowDown');
        active('cat');
        trigger().should('have.value', freeform ? 'Do' : 'Cat');
        option('dog').then($reopened => expect($reopened[0]).to.equal(element));
        cy.realPress('ArrowDown');
        active('dog');
        cy.realPress('Enter');
        cy.get('@select').should('have.been.calledOnce');
        payload('@select', 0, 'canine', 'Dog', ['canine']);
        trigger().should('have.value', 'Dog').and('have.attr', 'aria-expanded', 'false');
        cy.realPress('ArrowDown');
        active('dog');
        option('dog').should('have.attr', 'aria-selected', 'true');
        option('dog').then($selected => expect($selected[0]).to.equal(element));
      });
    });
  }

  it('uses unique generated Combobox portal IDs for active registration, selection and persistent reopen identity', () => {
    mount(
      <Input inlinePopup={false} onOptionSelect={cy.stub().as('select')}>
        <Option value="feline">Cat</Option>
        <Option value="canine" text="Dog">
          <span>Rich Dog</span>
        </Option>
      </Input>,
    );
    trigger().focus();
    cy.realPress('ArrowDown');
    cy.get('[role="option"]')
      .should('have.length', 2)
      .then($options => {
        const elements = [...$options];
        const ids = elements.map(element => element.id);
        expect(ids.every(Boolean)).to.equal(true);
        expect(new Set(ids).size).to.equal(2);
        active(ids[0]);
        cy.get('[role="listbox"]').then($listbox => {
          const listbox = $listbox[0];
          trigger().should('have.attr', 'aria-controls', listbox.id);
          cy.get('.fui-Combobox')
            .should('have.attr', 'aria-owns', listbox.id)
            .then($root => {
              expect($root[0].contains(listbox)).to.equal(false);
            });
        });
        cy.realPress('ArrowDown');
        active(ids[1]);
        cy.realPress('Enter');
        cy.get('@select').should('have.been.calledOnce');
        payload('@select', 0, 'canine', 'Dog', ['canine']);
        trigger().should('have.value', 'Dog').and('have.attr', 'aria-expanded', 'false');
        option(ids[1]).should('not.be.visible').and('have.attr', 'aria-selected', 'true');
        cy.realPress('ArrowDown');
        active(ids[1]);
        cy.get('[role="option"]').then($reopened => {
          expect([...$reopened]).to.deep.equal(elements);
          expect([...$reopened].map(element => element.id)).to.deep.equal(ids);
        });
        cy.realPress('Home');
        active(ids[0]);
        cy.realPress('Enter');
        payload('@select', 1, 'feline', 'Cat', ['feline']);
        cy.get('@select').should('have.been.calledTwice');
        trigger().should('have.value', 'Cat');
      });
  });

  it('registers the actual DOM ref and full option data, cleans up before replacement and on unmount', () => {
    const cleanup = cy.stub().as('cleanup');
    const register = cy.stub().as('register');
    register.returns(cleanup);
    const Fixture = () => {
      const [step, setStep] = React.useState(0);
      return (
        <ListboxContext.Provider value={{ ...contextDefaults, registerOption: register }}>
          <button id="update" onClick={() => setStep(step + 1)}>
            Update
          </button>
          {step < 2 && (
            <Option
              id={step ? 'new-id' : 'old-id'}
              text={step ? 'New text' : 'Old text'}
              value={step ? 'new-value' : 'old-value'}
              disabled={step === 1}
            >
              Content
            </Option>
          )}
        </ListboxContext.Provider>
      );
    };
    mount(<Fixture />);
    // The shared mount uses StrictMode, which replays the initial effect and its cleanup.
    cy.get('@register').should('have.been.calledTwice').its('args.1.0').should('deep.equal', {
      id: 'old-id',
      text: 'Old text',
      value: 'old-value',
      disabled: false,
    });
    option('old-id').then($option => expect(register.firstCall.args[1]).to.equal($option[0]));
    cy.get('#update').click();
    option('old-id').should('not.exist');
    option('new-id').should('have.attr', 'aria-disabled', 'true');
    cy.get('@cleanup').should('have.been.calledTwice');
    cy.get('@register').should('have.been.calledThrice').its('args.2.0').should('deep.equal', {
      id: 'new-id',
      text: 'New text',
      value: 'new-value',
      disabled: true,
    });
    cy.then(() => expect(cleanup.secondCall.calledBefore(register.thirdCall)).to.equal(true));
    cy.get('#update').click();
    option('new-id').should('not.exist');
    cy.get('@cleanup').should('have.been.calledThrice');
  });

  it('keeps generated ID, DOM ref and registration identity stable on unrelated parent rerenders', () => {
    const register = cy.stub().as('register');
    register.returns(() => undefined);
    const Fixture = () => {
      const [count, setCount] = React.useState(0);
      return (
        <ListboxContext.Provider value={{ ...contextDefaults, registerOption: register }}>
          <button id="update" onClick={() => setCount(count + 1)}>
            {count}
          </button>
          <Option>Stable</Option>
        </ListboxContext.Provider>
      );
    };
    mount(<Fixture />);
    cy.get('[role="option"]').then($option => {
      const element = $option[0];
      const id = element.id;
      expect(id).not.to.equal('');
      cy.get('#update').click();
      cy.get('[role="option"]')
        .should('have.id', id)
        .then($updated => expect($updated[0]).to.equal(element));
    });
    cy.get('@register').should('have.been.calledTwice');
  });

  it('updates registration text and default value when string children change, without leaving stale collection entries', () => {
    const Fixture = () => {
      const collection = useOptionCollection();
      const [step, setStep] = React.useState(0);
      const [snapshot, setSnapshot] = React.useState('');
      return (
        <ListboxContext.Provider value={{ ...contextDefaults, ...collection }}>
          <button id="update" onClick={() => setStep(step + 1)}>
            Update
          </button>
          <button
            id="inspect"
            onClick={() => setSnapshot(JSON.stringify(collection.getOptionsMatchingValue(() => true)))}
          >
            Inspect
          </button>
          <output id="collection">{snapshot}</output>
          {step < 2 && <Option id="dynamic">{step ? 'New' : 'Old'}</Option>}
        </ListboxContext.Provider>
      );
    };
    mount(<Fixture />);
    cy.get('#inspect').click();
    cy.get('#collection')
      .invoke('text')
      .then(text => expect(JSON.parse(text)).to.deep.equal([{ id: 'dynamic', text: 'Old', value: 'Old' }]));
    cy.get('#update').click();
    cy.get('#inspect').click();
    cy.get('#collection')
      .invoke('text')
      .then(text => expect(JSON.parse(text)).to.deep.equal([{ id: 'dynamic', text: 'New', value: 'New' }]));
    cy.get('#update').click();
    cy.get('#inspect').click();
    cy.get('#collection').should('have.text', '[]');
  });

  it('uses the same memoized registration data for focus and click selection in the documented callback order', () => {
    const register = cy.stub().returns(() => undefined);
    const focus = cy.stub();
    const select = cy.stub();
    const contextClick = cy.stub();
    const click = cy.stub();
    mount(
      <ActiveDescendantContextProvider value={{ controller: { focus } as unknown as ActiveDescendantImperativeRef }}>
        <ListboxContext.Provider
          value={{ ...contextDefaults, registerOption: register, selectOption: select, onOptionClick: contextClick }}
        >
          <Option id="identity" value="key" text="Text" onClick={click}>
            Content
          </Option>
        </ListboxContext.Provider>
      </ActiveDescendantContextProvider>,
    );
    option('identity').click();
    cy.then(() => {
      expect(focus).to.have.been.calledOnceWithExactly('identity');
      expect(select).to.have.been.calledOnce;
      expect(select.firstCall.args[1]).to.equal(register.firstCall.args[0]);
      expect(select.firstCall.args[1]).to.deep.equal({
        id: 'identity',
        value: 'key',
        text: 'Text',
        disabled: undefined,
      });
      expect(select.firstCall.args[0]).to.equal(contextClick.firstCall.args[0]);
      expect(contextClick.firstCall.args[0]).to.equal(click.firstCall.args[0]);
      expect(focus.firstCall.calledBefore(select.firstCall)).to.equal(true);
      expect(select.firstCall.calledBefore(contextClick.firstCall)).to.equal(true);
      expect(contextClick.firstCall.calledBefore(click.firstCall)).to.equal(true);
    });
  });

  it('prevents the disabled click default without calling focus, selection or either click handler', () => {
    const focus = cy.stub().as('focus');
    const select = cy.stub().as('select');
    const contextClick = cy.stub().as('contextClick');
    const click = cy.stub().as('click');
    mount(
      <ActiveDescendantContextProvider value={{ controller: { focus } as unknown as ActiveDescendantImperativeRef }}>
        <ListboxContext.Provider value={{ ...contextDefaults, selectOption: select, onOptionClick: contextClick }}>
          <Option id="disabled" disabled onClick={click}>
            Disabled
          </Option>
          <Option id="enabled" onClick={click}>
            Enabled
          </Option>
        </ListboxContext.Provider>
      </ActiveDescendantContextProvider>,
    );
    option('disabled').then($option => {
      const view = $option[0].ownerDocument.defaultView!;
      const event = new view.MouseEvent('click', { bubbles: true, cancelable: true });
      expect($option[0].dispatchEvent(event)).to.equal(false);
      expect(event.defaultPrevented).to.equal(true);
    });
    for (const alias of ['@focus', '@select', '@contextClick', '@click']) {
      cy.get(alias).should('not.have.been.called');
    }
    option('enabled').click();
    for (const alias of ['@focus', '@select', '@contextClick', '@click']) {
      cy.get(alias).should('have.been.calledOnce');
    }
  });

  it('does not treat native onClick preventDefault as an unsupported selection veto', () => {
    mount(
      <Select defaultOpen onOptionSelect={cy.stub().as('select')}>
        <Option id="prevent" onClick={event => event.preventDefault()}>
          Prevent
        </Option>
      </Select>,
    );
    option('prevent').click();
    payload('@select', 0, 'Prevent', 'Prevent', ['Prevent']);
    trigger().should('have.text', 'Prevent').and('have.attr', 'aria-expanded', 'false');
  });

  it('inherits nearest context and updates selected and multiselect semantics without remounting the option', () => {
    const Fixture = () => {
      const [multi, setMulti] = React.useState(false);
      return (
        <ListboxContext.Provider value={{ ...contextDefaults, selectedOptions: ['outer'] }}>
          <Option id="outer" value="outer">
            Outer
          </Option>
          <button id="update" onClick={() => setMulti(!multi)}>
            Update
          </button>
          <ListboxContext.Provider
            value={{ ...contextDefaults, multiselect: multi, selectedOptions: multi ? ['inner'] : [] }}
          >
            <Option id="inner" value="inner">
              Inner
            </Option>
          </ListboxContext.Provider>
        </ListboxContext.Provider>
      );
    };
    mount(<Fixture />);
    option('outer').should('have.attr', 'aria-selected', 'true');
    option('inner').should('have.attr', 'aria-selected', 'false');
    option('inner').then($initial => {
      cy.get('#update').click();
      option('inner').should('have.attr', 'role', 'menuitemcheckbox').and('have.attr', 'aria-checked', 'true');
      option('inner').should('not.have.attr', 'aria-selected');
      option('inner').then($updated => expect($updated[0]).to.equal($initial[0]));
    });
    option('outer').should('have.attr', 'role', 'option').and('have.attr', 'aria-selected', 'true');
    check('inner').find('svg').should('have.length', 1);
    cy.get('#update').click();
    option('inner').should('have.attr', 'role', 'option').and('have.attr', 'aria-selected', 'false');
    option('inner').should('not.have.attr', 'aria-checked');
    check('inner').should('have.css', 'visibility', 'hidden');
  });

  it('uses latest native and context callbacks after prop and context updates', () => {
    const oldClick = cy.stub().as('oldClick');
    const newClick = cy.stub().as('newClick');
    const oldSelect = cy.stub().as('oldSelect');
    const newSelect = cy.stub().as('newSelect');
    const oldDown = cy.stub().as('oldDown');
    const newDown = cy.stub().as('newDown');
    const oldContextClick = cy.stub().as('oldContextClick');
    const newContextClick = cy.stub().as('newContextClick');
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <ListboxContext.Provider
          value={{
            ...contextDefaults,
            selectOption: updated ? newSelect : oldSelect,
            onOptionClick: updated ? newContextClick : oldContextClick,
          }}
        >
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <Option
            id="latest"
            value={updated ? 'new' : 'old'}
            text={updated ? 'New' : 'Old'}
            onClick={updated ? newClick : oldClick}
            onMouseDown={updated ? newDown : oldDown}
          >
            Content
          </Option>
        </ListboxContext.Provider>
      );
    };
    mount(<Fixture />);
    option('latest').realClick();
    cy.get('@oldClick').should('have.been.calledOnce');
    cy.get('@oldDown').should('have.been.calledOnce');
    cy.get('@oldContextClick').should('have.been.calledOnce');
    cy.get('@oldSelect').its('args.0.1.value').should('equal', 'old');
    cy.get('#update').click();
    option('latest').realClick();
    cy.get('@newClick').should('have.been.calledOnce');
    cy.get('@newDown').should('have.been.calledOnce');
    cy.get('@newContextClick').should('have.been.calledOnce');
    cy.get('@newSelect')
      .its('args.0.1')
      .should('deep.equal', { id: 'latest', text: 'New', value: 'new', disabled: undefined });
    for (const alias of ['@oldClick', '@oldDown', '@oldSelect', '@oldContextClick']) {
      cy.get(alias).should('have.been.calledOnce');
    }
  });

  for (const editable of [false, true]) {
    it(`uses dynamic text, value and disabled data for keyboard selection in ${
      editable ? 'Combobox' : 'Dropdown'
    }`, () => {
      const Control = editable ? Input : Select;
      const onSelect = cy.stub().as('select');
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        return (
          <>
            <button id="update" onClick={() => setStep(step + 1)}>
              Update
            </button>
            <Control open onOptionSelect={onSelect}>
              <Option id="first">First</Option>
              <Option id="dynamic" disabled={step === 1} value={step ? 'new' : 'old'} text={step ? 'New' : 'Old'}>
                Visible
              </Option>
            </Control>
          </>
        );
      };
      mount(<Fixture />);
      cy.get('#update').click();
      option('dynamic').should('have.attr', 'aria-disabled', 'true');
      trigger().focus();
      cy.realPress('End');
      active('dynamic');
      cy.realPress('Enter');
      cy.get('@select').should('not.have.been.called');
      cy.get('#update').click();
      option('dynamic').should('not.have.attr', 'aria-disabled');
      trigger().focus();
      cy.realPress('End');
      active('dynamic');
      cy.realPress('Enter');
      payload('@select', 0, 'new', 'New', ['new']);
      option('dynamic').should('have.attr', 'aria-selected', 'true');
    });
  }

  it('removes options from real Dropdown keyboard/typeahead registration and re-registers re-added IDs', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [step, setStep] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setStep(step + 1)}>
            Update
          </button>
          <Select open onOptionSelect={onSelect}>
            <Option id="first">First</Option>
            {step !== 1 && (
              <Option id="reused" value={step ? 'new' : 'old'} text={step ? 'Zebra' : 'Dog'}>
                Visible
              </Option>
            )}
          </Select>
        </>
      );
    };
    mount(<Fixture />);
    trigger().focus();
    cy.realPress('End');
    active('reused');
    cy.get('#update').click();
    option('reused').should('not.exist');
    trigger().focus();
    cy.realPress('Home');
    active('first');
    cy.realPress('d');
    trigger().should('not.have.attr', 'aria-activedescendant');
    cy.realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.get('#update').click();
    option('reused').should('be.visible');
    trigger().focus();
    cy.realPress('End');
    active('reused');
    cy.realPress('Enter');
    payload('@select', 0, 'new', 'Zebra', ['new']);
  });

  it('supports explicit empty text and retains rich visible content without deriving the wrong value', () => {
    mount(
      <Select defaultOpen onOptionSelect={cy.stub().as('select')}>
        <Option id="blank" text="">
          <b>Visible</b>
        </Option>
      </Select>,
    );
    option('blank').find('b').should('have.text', 'Visible');
    option('blank').click();
    payload('@select', 0, '', '', ['']);
    trigger().click();
    option('blank').should('have.attr', 'aria-selected', 'true');
  });

  it('warns for invalid complex children without text instead of silently deriving their DOM text', () => {
    cy.window().then(view => cy.spy(view.console, 'warn').as('warning'));
    // Deliberately bypass the required text type to verify the source's runtime diagnostic.
    const invalidProps = { id: 'invalid', children: <b>Rich content</b> } as unknown as OptionProps;
    mount(
      <Select defaultOpen onOptionSelect={cy.stub().as('select')}>
        <Option {...invalidProps} />
      </Select>,
    );
    cy.get('@warning').should(
      'have.been.calledWithExactly',
      'Provide a `text` prop to Option components when they contain non-string children.',
    );
    option('invalid').find('b').should('have.text', 'Rich content');
    option('invalid').click();
    payload('@select', 0, '', '', ['']);
  });

  it('preserves Combobox multiselect input focus and checks across pointer and keyboard toggles', () => {
    mount(<Input multiselect defaultOpen onOptionSelect={cy.stub().as('select')} />);
    option('dog').realClick();
    payload('@select', 0, 'canine', 'Dog', ['canine']);
    active('dog');
    option('dog').should('have.attr', 'aria-checked', 'true');
    cy.realPress('Space');
    payload('@select', 1, 'canine', 'Dog', []);
    option('dog').should('have.attr', 'aria-checked', 'false');
    trigger().should('have.attr', 'aria-expanded', 'true');
    cy.realPress('End');
    cy.realPress('Enter');
    payload('@select', 2, 'bird', 'Duck', ['bird']);
    check('duck').find('svg').should('have.length', 1);
  });

  it('matches dynamically changed explicit text rather than stale visible content in Dropdown typeahead', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <Select open onOptionSelect={onSelect}>
            <Option id="first">First</Option>
            <Option id="renamed" text={updated ? 'Zebra' : 'Dog'} value={updated ? 'new' : 'old'}>
              <b>Visible Dog</b>
            </Option>
          </Select>
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#update').click();
    trigger().focus();
    cy.realPress('z');
    active('renamed');
    option('renamed').find('b').should('have.text', 'Visible Dog');
    cy.realPress('Enter');
    payload('@select', 0, 'new', 'Zebra', ['new']);
  });

  it('uses interactive hover colors only for enabled options and honors native style overrides', () => {
    mount(
      <Select multiselect defaultOpen>
        <Option id="hover">Hover</Option>
        <Option id="no-hover" disabled>
          Disabled
        </Option>
        <Option id="style" style={{ fontSize: teamsLightTheme.fontSizeBase400 }}>
          Style
        </Option>
      </Select>,
    );
    option('hover').realHover();
    option('hover')
      .should('have.css', 'background-color', rgb(teamsLightTheme.colorNeutralBackground1Hover))
      .and('have.css', 'color', rgb(teamsLightTheme.colorNeutralForeground1Hover));
    check('hover').should('have.css', 'border-top-color', rgb(teamsLightTheme.colorNeutralForeground1Hover));
    option('no-hover').realHover();
    option('no-hover')
      .should('have.css', 'color', rgb(teamsLightTheme.colorNeutralForegroundDisabled))
      .and('have.css', 'cursor', 'default');
    check('no-hover').should('have.css', 'border-top-color', rgb(teamsLightTheme.colorNeutralForegroundDisabled));
    option('style').should('have.css', 'font-size', teamsLightTheme.fontSizeBase400).realClick();
    option('style').should('have.attr', 'aria-checked', 'true');
  });
});

describe('Option - documented scenarios', () => {
  it('renders an unselected div and does not invent standalone selection state', () => {
    const click = cy.stub().as('click');
    mount(
      <Option id="plain" onClick={click}>
        Plain
      </Option>,
    );
    option('plain').should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'option');
    option('plain').should('have.attr', 'aria-selected', 'false').and('not.have.attr', 'tabindex');
    check('plain').should('have.attr', 'aria-hidden', 'true').and('have.css', 'visibility', 'hidden');
    option('plain').click();
    cy.get('@click').should('have.been.calledOnce');
    option('plain').should('have.attr', 'aria-selected', 'false');
  });

  it('selects string children using text as the default value', () => {
    mount(<Select onOptionSelect={cy.stub().as('select')} />);
    trigger().click();
    option('cat').should('have.attr', 'aria-selected', 'false').click();
    payload('@select', 0, 'Cat', 'Cat', ['Cat']);
    trigger().should('have.text', 'Cat').and('have.attr', 'aria-expanded', 'false').click();
    option('cat').should('have.attr', 'aria-selected', 'true');
    check('cat').should('have.css', 'visibility', 'visible').find('svg').should('have.length', 1);
    option('dog').should('have.attr', 'aria-selected', 'false');
  });

  it('renders complex content but uses explicit text for display and explicit value for selection', () => {
    mount(<Select onOptionSelect={cy.stub().as('select')} />);
    trigger().click();
    option('dog').find('small').should('have.text', 'Friendly companion');
    option('dog').click();
    payload('@select', 0, 'canine', 'Dog', ['canine']);
    trigger().should('have.text', 'Dog').click();
    option('dog').should('have.attr', 'aria-selected', 'true');
  });

  it('uses explicit text rather than children as the implicit value', () => {
    mount(
      <Select onOptionSelect={cy.stub().as('select')}>
        <Option id="override" text="Search label">
          Visible label
        </Option>
      </Select>,
    );
    trigger().click();
    option('override').should('have.text', 'Visible label').click();
    payload('@select', 0, 'Search label', 'Search label', ['Search label']);
    trigger().should('have.text', 'Search label');
  });

  it('preserves empty values instead of falling back to text', () => {
    mount(
      <Select defaultOpen onOptionSelect={cy.stub().as('select')}>
        <Option id="empty" value="">
          Empty value
        </Option>
      </Select>,
    );
    option('empty').click();
    payload('@select', 0, '', 'Empty value', ['']);
    trigger().should('have.text', 'Empty value').click();
    option('empty').should('have.attr', 'aria-selected', 'true');
  });

  it('supports default and controlled parent selections without local selection drift', () => {
    mount(<Select defaultOpen selectedOptions={['canine']} value="Fixed" onOptionSelect={cy.stub().as('select')} />);
    option('dog').should('have.attr', 'aria-selected', 'true');
    option('cat').click();
    payload('@select', 0, 'Cat', 'Cat', ['Cat']);
    trigger().should('have.text', 'Fixed').click();
    option('dog').should('have.attr', 'aria-selected', 'true');
    option('cat').should('have.attr', 'aria-selected', 'false');
  });

  it('toggles multiselect checks with exact pointer payloads and keeps the popup open', () => {
    mount(<Select multiselect defaultOpen onOptionSelect={cy.stub().as('select')} />);
    option('cat').should('have.attr', 'role', 'menuitemcheckbox').and('have.attr', 'aria-checked', 'false');
    option('cat').should('not.have.attr', 'aria-selected');
    check('cat').should('have.css', 'visibility', 'visible').find('svg').should('not.exist');
    option('cat').click();
    payload('@select', 0, 'Cat', 'Cat', ['Cat']);
    check('cat').find('svg').should('have.length', 1);
    option('dog').click();
    payload('@select', 1, 'canine', 'Dog', ['Cat', 'canine']);
    option('cat').click();
    payload('@select', 2, 'Cat', 'Cat', ['canine']);
    option('cat').should('have.attr', 'aria-checked', 'false');
    check('cat').find('svg').should('not.exist');
    trigger().should('have.attr', 'aria-expanded', 'true').and('be.focused');
    cy.get('@select').should('have.been.calledThrice');
  });

  it('uses explicit text in actual Dropdown typeahead and Enter selection', () => {
    mount(<Select onOptionSelect={cy.stub().as('select')} />);
    trigger().focus();
    cy.realPress('d');
    active('dog');
    cy.realPress('u');
    active('duck');
    cy.realPress('Enter');
    payload('@select', 0, 'bird', 'Duck', ['bird']);
    trigger().should('have.text', 'Duck').and('have.attr', 'aria-expanded', 'false');
  });

  it('uses text matching in an editable Combobox and retains input focus', () => {
    mount(<Input onOptionSelect={cy.stub().as('select')} />);
    trigger().click();
    cy.realType('Dog');
    active('dog');
    cy.realPress('Enter');
    payload('@select', 0, 'canine', 'Dog', ['canine']);
    trigger().should('have.value', 'Dog').and('be.focused').and('have.attr', 'aria-expanded', 'false');
  });

  it('uses custom check content and supports removing the optional checkIcon slot', () => {
    mount(
      <Select defaultOpen defaultSelectedOptions={['custom']}>
        <Option id="custom" value="custom" checkIcon={{ children: <b>Chosen</b>, title: 'Custom check' }}>
          Custom
        </Option>
        <Option id="none" checkIcon={null}>
          No check
        </Option>
      </Select>,
    );
    check('custom').should('have.attr', 'title', 'Custom check').and('have.attr', 'aria-hidden', 'true');
    check('custom').find('b').should('have.text', 'Chosen');
    check('custom').find('svg').should('not.exist');
    option('none').find(`.${optionClassNames.checkIcon}`).should('not.exist');
    option('none').click();
    trigger().should('have.text', 'No check').click();
    option('none').should('have.attr', 'aria-selected', 'true');
  });

  it('inherits selection through OptionGroup and nested noninteractive wrappers', () => {
    mount(
      <Select defaultOpen defaultSelectedOptions={['canine']}>
        <OptionGroup label="Pets">
          <div>
            <Choices />
          </div>
        </OptionGroup>
      </Select>,
    );
    option('dog').should('have.attr', 'aria-selected', 'true').click();
    trigger().should('have.text', 'Dog');
  });
});
