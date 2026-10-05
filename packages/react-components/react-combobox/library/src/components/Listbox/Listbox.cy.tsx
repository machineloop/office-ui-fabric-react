import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsDarkTheme, teamsLightTheme } from '@fluentui/react-theme';
import type { ExtractSlotProps, ForwardRefComponent, JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { Field } from '@fluentui/react-field';
import type { SinonStub } from 'cypress/types/sinon';
import { Combobox, Dropdown, Option, OptionGroup } from '@fluentui/react-combobox';
import { Listbox } from './Listbox';
import type { ListboxProps, ListboxSlots } from './Listbox.types';
import { useTestStyles } from './Listbox.cy.styles';
import { useListbox_unstable } from './useListbox';
import { useListboxStyles_unstable } from './useListboxStyles.styles';
import { renderListbox_unstable } from './renderListbox';
import { useListboxContextValues } from '../../contexts/useListboxContextValues';
import { assertAbsentOrLiveActiveDescendant } from './Listbox.cy.assertions';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );

const choices = [
  { value: 'cat', text: 'Cat' },
  { value: 'dog', text: 'Dog' },
  { value: 'fish', text: 'Fish' },
];
const options = (prefix = 'option') =>
  choices.map(choice => (
    <Option key={choice.value} id={`${prefix}-${choice.value}`} value={choice.value}>
      {choice.text}
    </Option>
  ));
const Basic: ForwardRefComponent<ListboxProps> = React.forwardRef((props, ref) => (
  <Listbox id="list" aria-label="Pets" {...props} ref={ref}>
    {props.children ?? options()}
  </Listbox>
));
const root = () => cy.get('#list');
const rgb = (hex: string) => `rgb(${[1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)).join(', ')})`;
const active = (value: string) => {
  root().should('have.attr', 'aria-activedescendant', `option-${value}`);
  cy.get(`#option-${value}`).should('have.attr', 'data-activedescendant');
};
const selected = (value: string, checked = true, multiselect = false) =>
  cy.get(`#option-${value}`).should('have.attr', multiselect ? 'aria-checked' : 'aria-selected', String(checked));
const payload = (alias: string, index: number, value: string, text: string, selection: string[], type?: string) =>
  cy.get<SinonStub>(alias).then(stub => {
    expect(stub.callCount).to.equal(index + 1);
    expect(stub.getCall(index).args[1]).to.deep.equal({
      optionValue: value,
      optionText: text,
      selectedOptions: selection,
    });
    if (type) {
      expect(stub.getCall(index).args[0].type).to.equal(type);
    }
  });

describe('Listbox - edges and accessibility', () => {
  it('keeps controlled values and latest handler when selection mode changes in both directions', () => {
    const before = cy.stub().as('before');
    const after = cy.stub().as('after');
    const Fixture = () => {
      const [multiselect, setMultiselect] = React.useState(false);
      const [values, setValues] = React.useState(['cat']);
      const [latest, setLatest] = React.useState(false);
      return (
        <>
          <button
            id="mode"
            onClick={() => {
              setMultiselect(current => !current);
              setLatest(true);
            }}
          >
            Switch controlled mode
          </button>
          <Basic
            multiselect={multiselect}
            selectedOptions={values}
            onOptionSelect={(event, data) => {
              (latest ? after : before)(event, data);
              setValues(data.selectedOptions);
            }}
          />
        </>
      );
    };
    mount(<Fixture />);
    selected('cat');
    cy.get('#option-dog').realClick();
    payload('@before', 0, 'dog', 'Dog', ['dog'], 'click');
    cy.get('#mode').realClick();
    root().should('have.attr', 'role', 'menu');
    cy.get('#option-dog').should('have.attr', 'role', 'menuitemcheckbox');
    selected('dog', true, true);
    cy.get('#option-fish').realClick();
    payload('@after', 0, 'fish', 'Fish', ['dog', 'fish'], 'click');
    selected('dog', true, true);
    selected('fish', true, true);
    cy.get('#mode').realClick();
    root().should('have.attr', 'role', 'listbox');
    cy.get('#option-dog').should('have.attr', 'role', 'option');
    root().focus();
    cy.realPress('Home');
    active('cat');
    cy.realPress('Enter');
    payload('@after', 1, 'cat', 'Cat', ['cat'], 'keydown');
    selected('cat');
    selected('dog', false);
    selected('fish', false);
    cy.get('@before').should('have.been.calledOnce');
  });

  [false, true].forEach(initialMultiselect => {
    it(`updates standalone context semantics through ${
      initialMultiselect ? 'multiple-single-multiple' : 'single-multiple-single'
    } mode changes`, () => {
      const onOptionSelect = cy.stub().as('select');
      const Fixture = () => {
        const [multiselect, setMultiselect] = React.useState(initialMultiselect);
        return (
          <>
            <button id="mode" onClick={() => setMultiselect(current => !current)}>
              Switch selection mode
            </button>
            <Basic multiselect={multiselect} defaultSelectedOptions={['cat']} onOptionSelect={onOptionSelect}>
              <Option id="option-cat" value="cat">
                Cat
              </Option>
              <Option id="option-dog" value="dog" disabled>
                Dog
              </Option>
              <Option id="option-fish" value="fish">
                Fish
              </Option>
            </Basic>
          </>
        );
      };
      mount(<Fixture />);
      root().should('have.attr', 'role', initialMultiselect ? 'menu' : 'listbox');
      selected('cat', true, initialMultiselect);
      cy.get('#mode').realClick();
      root().should('have.attr', 'role', initialMultiselect ? 'listbox' : 'menu');
      cy.get('#option-cat').should('have.attr', 'role', initialMultiselect ? 'option' : 'menuitemcheckbox');
      selected('cat', true, !initialMultiselect);
      cy.get('#option-dog').realClick();
      selected('dog', false, !initialMultiselect);
      cy.get('@select').should('not.have.been.called');
      cy.get('#option-fish').realClick();
      selected('fish', true, !initialMultiselect);
      selected('cat', !initialMultiselect, !initialMultiselect);
      payload('@select', 0, 'fish', 'Fish', initialMultiselect ? ['fish'] : ['cat', 'fish'], 'click');
      cy.get<SinonStub>('@select').then(stub => {
        const event = stub.firstCall.args[0];
        expect(event.nativeEvent.type).to.equal('click');
        expect(event.nativeEvent.target).to.equal(event.target);
        expect(event.nativeEvent.isTrusted).to.equal(true);
        expect((event.target as HTMLElement).closest('[id^="option-"]')?.id).to.equal('option-fish');
      });
      cy.get('#mode').realClick();
      root().should('have.attr', 'role', initialMultiselect ? 'menu' : 'listbox');
      cy.get('#option-fish').should('have.attr', 'role', initialMultiselect ? 'menuitemcheckbox' : 'option');
      selected('fish', true, initialMultiselect);
      root().focus();
      cy.realPress('Home');
      active('cat');
      cy.realPress('Space');
      selected('cat', true, initialMultiselect);
      selected('fish', initialMultiselect, initialMultiselect);
      payload('@select', 1, 'cat', 'Cat', initialMultiselect ? ['fish', 'cat'] : ['cat'], 'keydown');
      cy.get<SinonStub>('@select').then(stub => {
        const event = stub.secondCall.args[0];
        expect(event.nativeEvent.type).to.equal('keydown');
        expect(event.nativeEvent.target).to.equal(event.target);
        expect(event.nativeEvent.isTrusted).to.equal(true);
        expect(event.target.id).to.equal('list');
        expect(event.key).to.equal(' ');
      });
    });
  });

  it('resolves external label and description IDs without treating HTML label as div naming', () => {
    mount(
      <>
        <span id="name">Choose pets</span>
        <span id="help">Use arrows</span>
        <Basic aria-label={undefined} aria-labelledby="name" aria-describedby="help" />
      </>,
    );
    root().should('have.attr', 'aria-labelledby', 'name');
    root().should('have.attr', 'aria-describedby', 'help');
    root().should('not.have.attr', 'aria-label');
    cy.get('#name').should('have.text', 'Choose pets');
    cy.get('#help').should('have.text', 'Use arrows');
    root().focus();
    cy.realPress('Enter');
    selected('cat');
  });

  it('uses unique generated option IDs for real active-descendant relationships', () => {
    mount(
      <Basic>
        <Option value="cat">Cat</Option>
        <Option value="dog">Dog</Option>
      </Basic>,
    );
    cy.get('[role="option"]').then(elements => {
      const ids = elements.toArray().map(element => element.id);
      expect(ids.every(Boolean)).to.equal(true);
      expect(new Set(ids).size).to.equal(2);
      root().should('have.attr', 'aria-activedescendant', ids[0]);
      root().focus();
      cy.realPress('ArrowDown');
      root().should('have.attr', 'aria-activedescendant', ids[1]);
      cy.realPress('Enter');
      cy.get('[role="option"]').eq(1).should('have.attr', 'aria-selected', 'true');
    });
  });

  it('supports unlabelled groups with explicit accessible group naming', () => {
    mount(
      <Basic>
        <OptionGroup aria-label="Land">
          <Option id="option-cat" value="cat">
            Cat
          </Option>
        </OptionGroup>
        <OptionGroup label="Water">
          <Option id="option-fish" value="fish">
            Fish
          </Option>
        </OptionGroup>
      </Basic>,
    );
    cy.get('[role="group"]').first().should('have.attr', 'aria-label', 'Land');
    cy.get('[role="group"]').first().should('not.have.attr', 'aria-labelledby');
    root().focus();
    cy.realPress('End');
    active('fish');
    cy.realPress('Home');
    active('cat');
  });

  it('forwards the actual root ref native attributes click and mouse handlers', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <Basic
        ref={ref}
        title="Native title"
        lang="en"
        data-native="kept"
        onClick={cy.stub().as('click')}
        onMouseDown={cy.stub().as('down')}
      />,
    );
    root().should('have.attr', 'title', 'Native title').and('have.attr', 'lang', 'en');
    root()
      .should('have.attr', 'data-native', 'kept')
      .then(element => expect(ref.current).to.equal(element[0]));
    cy.get('#option-dog').realClick();
    selected('dog');
    cy.get('@down').should('have.been.calledOnce');
    cy.get('@click').should('have.been.calledOnce');
  });

  it('supports root render functions with forwarded props ref options and keyboard behavior', () => {
    const ref = React.createRef<HTMLDivElement>();
    const render: SlotRenderFunction<ExtractSlotProps<ListboxSlots['root']>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        {options()}
      </Component>
    );
    mount(
      <Listbox id="list" aria-label="Rendered pets" ref={ref}>
        {render}
      </Listbox>,
    );
    root().should('have.attr', 'data-rendered', 'true').and('have.class', 'fui-Listbox');
    root().then(element => expect(ref.current).to.equal(element[0]));
    root().focus();
    cy.realPress('End');
    active('fish');
    cy.realPress('Enter');
    selected('fish');
  });

  it('honors native role and tabindex overrides without leaking selection props to DOM', () => {
    mount(<Basic role="menu" tabIndex={-1} disableAutoFocus defaultSelectedOptions={['cat']} />);
    root().should('have.attr', 'role', 'menu').and('have.attr', 'tabindex', '-1');
    root().then(element => {
      ['multiselect', 'selectedoptions', 'defaultselectedoptions', 'disableautofocus'].forEach(name =>
        expect(element[0].hasAttribute(name), name).to.equal(false),
      );
    });
    selected('cat');
    root().focus();
    cy.realPress('ArrowDown');
    active('cat');
  });

  it('disableAutoFocus suppresses initialization but not navigation selection or native focus', () => {
    mount(<Basic disableAutoFocus defaultSelectedOptions={['dog']} onOptionSelect={cy.stub().as('select')} />);
    root().should('not.have.attr', 'aria-activedescendant');
    root().focus();
    cy.realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('ArrowDown');
    active('cat');
    cy.realPress('Space');
    selected('cat');
    payload('@select', 0, 'cat', 'Cat', ['cat']);
  });

  it('does not move native focus on mount despite initializing an active descendant', () => {
    const Fixture = () => {
      const [shown, setShown] = React.useState(false);
      return (
        <>
          <button id="show" onClick={() => setShown(true)}>
            Show list
          </button>
          {shown && <Basic />}
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#show').realClick().should('be.focused');
    active('cat');
    cy.get('#option-cat').should('not.have.attr', 'data-activedescendant-focusvisible');
  });

  it('shows keyboard focus-visible on the active option and hides it on blur', () => {
    mount(
      <>
        <button id="before">Before</button>
        <Basic />
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    root().should('be.focused');
    cy.realPress('ArrowDown');
    cy.get('#option-dog').should('have.attr', 'data-activedescendant-focusvisible');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
    cy.get('#option-dog').should('not.have.attr', 'data-activedescendant-focusvisible');
    active('dog');
    cy.realPress(['Shift', 'Tab']);
    root().should('be.focused');
    cy.get('#option-dog').should('have.attr', 'data-activedescendant-focusvisible');
  });

  it('composes consumer keydown focus and blur handlers before internal navigation', () => {
    const observations: string[] = [];
    mount(
      <Basic
        onKeyDown={event =>
          observations.push(
            `${event.key}:${event.currentTarget.getAttribute('aria-activedescendant')}:${event.defaultPrevented}`,
          )
        }
        onFocus={cy.stub().as('focus')}
        onBlur={cy.stub().as('blur')}
      />,
    );
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    cy.then(() => expect(observations).to.deep.equal(['ArrowDown:option-cat:false']));
    root().blur();
    cy.get('@focus').should('have.been.calledOnce');
    cy.get('@blur').should('have.been.calledOnce');
  });

  it('consumer preventDefault does not veto composed internal keydown selection', () => {
    mount(<Basic onKeyDown={event => event.preventDefault()} onOptionSelect={cy.stub().as('select')} />);
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Enter');
    selected('dog');
    payload('@select', 0, 'dog', 'Dog', ['dog']);
  });

  it('does not select close or clear on standalone Escape printable or horizontal keys', () => {
    mount(<Basic defaultSelectedOptions={['dog']} onOptionSelect={cy.stub().as('select')} />);
    root().focus();
    cy.realPress('Escape');
    cy.realPress('ArrowLeft');
    cy.realPress('ArrowRight');
    cy.realType('c');
    active('dog');
    selected('dog');
    root().should('be.visible').and('be.focused');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('Home');
    cy.realPress('Enter');
    payload('@select', 0, 'cat', 'Cat', ['cat']);
  });

  it('allows disabled selected multiselect state but cannot toggle it', () => {
    mount(
      <Basic multiselect defaultSelectedOptions={['dog']} onOptionSelect={cy.stub().as('select')}>
        <Option id="option-cat" value="cat">
          Cat
        </Option>
        <Option id="option-dog" value="dog" disabled>
          Dog
        </Option>
      </Basic>,
    );
    selected('dog', true, true);
    root().focus();
    cy.realPress('End');
    active('dog');
    cy.realPress('Space');
    cy.realPress('Enter');
    cy.get('#option-dog').realClick();
    selected('dog', true, true);
    cy.get('@select').should('not.have.been.called');
    root().focus();
    cy.realPress('Home');
    cy.realPress('Space');
    payload('@select', 0, 'cat', 'Cat', ['dog', 'cat']);
  });

  it('skips static presentation wrappers and exposes decorative checks as hidden', () => {
    mount(
      <Basic>
        <span role="presentation">Decoration</span>
        <div>
          <Option id="option-cat" value="cat">
            Cat
          </Option>
        </div>
        <span role="none">Divider</span>
        <Option id="option-dog" value="dog">
          Dog
        </Option>
      </Basic>,
    );
    cy.get('.fui-Option__checkIcon').should('have.length', 2).and('have.attr', 'aria-hidden', 'true');
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Home');
    active('cat');
  });

  it('supports empty string option values with exact callbacks', () => {
    mount(
      <Basic onOptionSelect={cy.stub().as('select')}>
        <Option id="empty-value" value="" text="Empty key">
          Empty key
        </Option>
      </Basic>,
    );
    root().focus();
    cy.realPress('Enter');
    cy.get('#empty-value').should('have.attr', 'aria-selected', 'true');
    payload('@select', 0, '', 'Empty key', ['']);
  });

  it('merges consumer Griffel classes last and preserves static root class', () => {
    const Styled = () => {
      const styles = useTestStyles();
      return <Basic className={styles.override} />;
    };
    mount(<Styled />);
    root().should('have.class', 'fui-Listbox').and('have.css', 'padding-top', teamsLightTheme.spacingHorizontalXXL);
    root().should('have.css', 'background-color', rgb(teamsLightTheme.colorBrandBackground));
    root().focus();
    cy.realPress('End');
    cy.realPress('Enter');
    selected('fish');
  });

  it('invokes the provider custom Listbox style hook without losing behavior', () => {
    const hook = cy
      .stub()
      .callsFake((state: { root: { className?: string } }) => {
        state.root.className = `${state.root.className} custom-listbox`;
      })
      .as('styleHook');
    const customStyleHooks = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      useListboxStyles_unstable: hook,
    };
    mountBase(
      <FluentProvider theme={teamsLightTheme} customStyleHooks_unstable={customStyleHooks}>
        <Basic />
      </FluentProvider>,
    );
    root().should('have.class', 'custom-listbox').and('have.class', 'fui-Listbox');
    cy.get('@styleHook').should('have.been.called');
    root().focus();
    cy.realPress('Enter');
    selected('cat');
  });

  it('uses inherited light and dark provider backgrounds without changing selection', () => {
    mount(
      <>
        <Basic id="light" defaultSelectedOptions={['cat']}>
          {options('light')}
        </Basic>
        <FluentProvider theme={teamsDarkTheme}>
          <Basic id="dark" defaultSelectedOptions={['dog']}>
            {options('dark')}
          </Basic>
        </FluentProvider>
      </>,
    );
    cy.get('#light').should('have.css', 'background-color', rgb(teamsLightTheme.colorNeutralBackground1));
    cy.get('#dark').should('have.css', 'background-color', rgb(teamsDarkTheme.colorNeutralBackground1));
    cy.get('#light-cat').should('have.attr', 'aria-selected', 'true');
    cy.get('#dark-dog').should('have.attr', 'aria-selected', 'true');
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`preserves vertical navigation and reverses option check layout in ${dir}`, () => {
      mount(<Basic defaultSelectedOptions={['cat']} />, dir);
      root().should('have.css', 'direction', dir);
      cy.get('#option-cat').then(element => {
        const check = element[0].querySelector('.fui-Option__checkIcon');
        expect(check).not.to.equal(null);
        const checkRect = check!.getBoundingClientRect();
        const range = element[0].ownerDocument.createRange();
        range.selectNodeContents(element[0].lastChild!);
        const textRect = range.getBoundingClientRect();
        if (dir === 'ltr') {
          expect(checkRect.right).to.be.at.most(textRect.left);
        } else {
          expect(checkRect.left).to.be.at.least(textRect.right);
        }
      });
      root().focus();
      cy.realPress('ArrowDown');
      active('dog');
      cy.realPress('Enter');
      selected('dog');
    });
  });

  it('scrolls real active descendants into view within a constrained list', () => {
    const Scroll = () => {
      const styles = useTestStyles();
      return (
        <Basic className={styles.scroll}>
          {Array.from({ length: 20 }, (_, i) => (
            <Option key={i} id={`long-${i}`} value={String(i)}>{`Item ${i}`}</Option>
          ))}
        </Basic>
      );
    };
    mount(<Scroll />);
    root().then(element => expect(element[0].scrollHeight).to.be.greaterThan(element[0].clientHeight));
    root().focus();
    cy.realPress('End');
    root().should('have.attr', 'aria-activedescendant', 'long-19');
    root().then(element => {
      const listRect = element[0].getBoundingClientRect();
      const lastRect = element[0].querySelector('#long-19')!.getBoundingClientRect();
      expect(element[0].scrollTop).to.be.greaterThan(0);
      expect(lastRect.bottom).to.be.at.most(listRect.bottom);
      expect(lastRect.top).to.be.at.least(listRect.top);
    });
    cy.realPress('Home');
    root().should('have.attr', 'aria-activedescendant', 'long-0');
    root().then(element => {
      const listRect = element[0].getBoundingClientRect();
      const firstRect = element[0].querySelector('#long-0')!.getBoundingClientRect();
      expect(firstRect.top).to.be.at.least(listRect.top);
      expect(firstRect.bottom).to.be.at.most(listRect.bottom);
    });
  });

  [false, true].forEach(inlinePopup => {
    it(`retains parent ownership and popup refs with ${
      inlinePopup ? 'inline' : 'portaled'
    } Dropdown composition`, () => {
      const ref = React.createRef<HTMLDivElement>();
      mount(
        <Dropdown
          root={{ id: 'parent' }}
          inlinePopup={inlinePopup}
          aria-label="Pets"
          listbox={{ id: 'popup', ref, 'aria-label': 'Pet options' }}
        >
          {options()}
        </Dropdown>,
      );
      cy.get('[role="combobox"]').realClick();
      cy.get('#popup').then(element => {
        expect(ref.current).to.equal(element[0]);
        expect(element[0].closest('#parent') !== null).to.equal(inlinePopup);
      });
      cy.get('[role="combobox"]').should('have.attr', 'aria-controls', 'popup');
      if (inlinePopup) {
        cy.get('#parent').should('not.have.attr', 'aria-owns');
      } else {
        cy.get('#parent').should('have.attr', 'aria-owns', 'popup');
      }
      cy.get('#popup').should('have.attr', 'aria-label', 'Pet options');
      cy.get('#option-dog').realClick();
      cy.get('[role="combobox"]').should('be.focused').and('contain.text', 'Dog');
    });
  });

  it('inherits Field labeling in a popup but preserves an explicit popup label', () => {
    mount(
      <>
        <Field label="Favorite pet">
          <Dropdown id="first" listbox={{ id: 'field-popup' }}>
            {options('first')}
          </Dropdown>
        </Field>
        <Field label="Other pet">
          <Combobox id="second" listbox={{ id: 'explicit-popup', 'aria-label': 'Explicit choices' }}>
            {options('second')}
          </Combobox>
        </Field>
      </>,
    );
    cy.get('#first').realClick();
    cy.get('#field-popup')
      .invoke('attr', 'aria-labelledby')
      .then(id => {
        expect(id).to.be.a('string').and.not.equal('');
        cy.get(`#${id}`).should('have.text', 'Favorite pet');
      });
    cy.realPress('Escape');
    cy.get('#second').realClick();
    cy.get('#explicit-popup').should('have.attr', 'aria-label', 'Explicit choices');
  });

  (['small', 'medium', 'large'] as const).forEach(size => {
    it(`does not invent standalone size inheritance from ${size} Dropdown and Combobox contexts`, () => {
      mount(
        <>
          <Dropdown size={size} id="dropdown" aria-label="Dropdown" listbox={{ id: 'dropdown-list' }}>
            {options('dropdown')}
          </Dropdown>
          <Combobox size={size} id="combobox" aria-label="Combobox" listbox={{ id: 'combobox-list' }}>
            {options('combobox')}
          </Combobox>
          <Basic />
        </>,
      );
      cy.get('#option-cat').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
      cy.get('#dropdown').realClick();
      cy.get('#dropdown-cat').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
      cy.get('#dropdown-list').should('have.css', 'padding-top', teamsLightTheme.spacingHorizontalXS);
      cy.realPress('Escape');
      cy.get('#combobox').realClick();
      cy.get('#combobox-cat').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
      cy.get('#combobox-list').should('have.css', 'padding-top', teamsLightTheme.spacingHorizontalXS);
      cy.get('#combobox-dog').realClick();
      cy.get('#combobox').should('have.value', 'Dog');
    });
  });
});

const Controlled = ({ multiselect = false }: { multiselect?: boolean }) => {
  const [selection, setSelection] = React.useState(['dog']);
  return (
    <>
      <button onClick={() => setSelection(['fish'])}>External selection</button>
      <Basic
        multiselect={multiselect}
        selectedOptions={selection}
        onOptionSelect={(_, data) => setSelection(data.selectedOptions)}
      />
      <output>{selection.join(',')}</output>
    </>
  );
};

describe('Listbox - documentation', () => {
  it('renders a named standalone div with unselected options and one tab stop', () => {
    mount(<Basic />);
    root().should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'listbox');
    root().should('have.attr', 'aria-label', 'Pets').and('have.attr', 'tabindex', '0');
    cy.get('[role="option"]').should('have.length', 3).and('not.have.attr', 'tabindex');
    choices.forEach(choice => selected(choice.value, false));
    active('cat');
    root().should('not.have.attr', 'aria-expanded');
    root().should('not.have.attr', 'aria-multiselectable');
  });

  it('initializes default single selection then replaces it with the exact click payload', () => {
    mount(<Basic defaultSelectedOptions={['dog']} onOptionSelect={cy.stub().as('select')} />);
    selected('dog');
    active('dog');
    cy.get('#option-fish').realClick();
    selected('fish');
    selected('dog', false);
    active('fish');
    payload('@select', 0, 'fish', 'Fish', ['fish'], 'click');
    root().should('be.visible');
  });

  it('keeps controlled single selection authoritative while reporting a proposal', () => {
    mount(<Basic selectedOptions={['dog']} onOptionSelect={cy.stub().as('select')} />);
    cy.get('#option-cat').realClick();
    selected('dog');
    selected('cat', false);
    active('cat');
    payload('@select', 0, 'cat', 'Cat', ['cat'], 'click');
  });

  it('accepts callback and external updates in controlled single mode', () => {
    mount(<Controlled />);
    cy.get('#option-cat').realClick();
    selected('cat');
    cy.get('output').should('have.text', 'cat');
    cy.contains('button', 'External selection').realClick();
    selected('fish');
    selected('cat', false);
    root().focus();
    cy.realPress('End');
    active('fish');
    cy.realPress('Enter');
    cy.get('output').should('have.text', 'fish');
  });

  it('uses menu checkbox semantics rather than aria-multiselectable for multiselect', () => {
    mount(<Basic multiselect defaultSelectedOptions={['dog', 'fish']} />);
    root().should('have.attr', 'role', 'menu').and('not.have.attr', 'aria-multiselectable');
    cy.get('[role="menuitemcheckbox"]').should('have.length', 3).and('not.have.attr', 'aria-selected');
    selected('dog', true, true);
    selected('fish', true, true);
    selected('cat', false, true);
    active('cat');
  });

  it('adds and removes uncontrolled multiple values with ordered exact payloads', () => {
    mount(<Basic multiselect defaultSelectedOptions={['dog']} onOptionSelect={cy.stub().as('select')} />);
    cy.get('#option-cat').realClick();
    selected('cat', true, true);
    selected('dog', true, true);
    payload('@select', 0, 'cat', 'Cat', ['dog', 'cat'], 'click');
    cy.get('#option-dog').realClick();
    selected('dog', false, true);
    payload('@select', 1, 'dog', 'Dog', ['cat'], 'click');
    root().should('be.visible');
  });

  it('keeps controlled multiple values fixed while proposing both add and remove', () => {
    mount(<Basic multiselect selectedOptions={['dog']} onOptionSelect={cy.stub().as('select')} />);
    cy.get('#option-cat').realClick();
    payload('@select', 0, 'cat', 'Cat', ['dog', 'cat']);
    selected('cat', false, true);
    cy.get('#option-dog').realClick();
    payload('@select', 1, 'dog', 'Dog', []);
    selected('dog', true, true);
  });

  it('updates controlled multiple selection without mixing default props', () => {
    mount(<Controlled multiselect />);
    cy.get('#option-cat').realClick();
    cy.get('output').should('have.text', 'dog,cat');
    cy.get('#option-dog').realClick();
    cy.get('output').should('have.text', 'cat');
    selected('cat', true, true);
    selected('dog', false, true);
  });

  it('uses explicit value and text for rich noninteractive option payloads', () => {
    mount(
      <Basic onOptionSelect={cy.stub().as('select')}>
        <Option id="rich" value="key" text="Accessible cat">
          <span aria-hidden="true">Decorative</span>
          <b>Visible cat</b>
        </Option>
      </Basic>,
    );
    cy.get('#rich b').realClick();
    payload('@select', 0, 'key', 'Accessible cat', ['key']);
    cy.get('#rich').should('have.attr', 'aria-selected', 'true');
    root().should('have.attr', 'aria-activedescendant', 'rich');
  });

  it('uses explicit text as the default key rather than the visual children', () => {
    mount(
      <Basic onOptionSelect={cy.stub().as('select')}>
        <Option id="text" text="Plain label">
          Visible label
        </Option>
      </Basic>,
    );
    cy.get('#text').realClick();
    payload('@select', 0, 'Plain label', 'Plain label', ['Plain label']);
  });

  it('uses string children as value and text when no overrides are supplied', () => {
    mount(
      <Basic onOptionSelect={cy.stub().as('select')}>
        <Option id="plain">Plain cat</Option>
      </Basic>,
    );
    cy.get('#plain').realClick();
    payload('@select', 0, 'Plain cat', 'Plain cat', ['Plain cat']);
  });

  it('links labelled OptionGroups and navigates across groups without selecting labels', () => {
    mount(
      <Basic onOptionSelect={cy.stub().as('select')}>
        <OptionGroup label={{ id: 'land-label', children: 'Land' }}>
          <Option id="option-cat" value="cat">
            Cat
          </Option>
          <Option id="option-dog" value="dog">
            Dog
          </Option>
        </OptionGroup>
        <OptionGroup label={{ id: 'water-label', children: 'Water' }}>
          <Option id="option-fish" value="fish">
            Fish
          </Option>
        </OptionGroup>
      </Basic>,
    );
    cy.get('[role="group"]').first().should('have.attr', 'aria-labelledby', 'land-label');
    cy.get('[role="group"]').last().should('have.attr', 'aria-labelledby', 'water-label');
    cy.get('#land-label').should('have.attr', 'role', 'presentation');
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('ArrowDown');
    active('fish');
    cy.realPress('Enter');
    payload('@select', 0, 'fish', 'Fish', ['fish'], 'keydown');
  });

  it('keeps disabled options keyboard navigable but blocks pointer and keyboard selection', () => {
    mount(
      <Basic onOptionSelect={cy.stub().as('select')}>
        <Option id="option-cat" value="cat">
          Cat
        </Option>
        <Option id="option-dog" value="dog" disabled onClick={cy.stub().as('disabledClick')}>
          Dog
        </Option>
        <Option id="option-fish" value="fish">
          Fish
        </Option>
      </Basic>,
    );
    cy.get('#option-dog').should('have.attr', 'aria-disabled', 'true').realClick();
    active('cat');
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Enter');
    cy.realPress('Space');
    selected('dog', false);
    cy.get('@select').should('not.have.been.called');
    cy.get('@disabledClick').should('not.have.been.called');
    cy.realPress('ArrowDown');
    cy.realPress('Enter');
    selected('fish');
    payload('@select', 0, 'fish', 'Fish', ['fish']);
  });

  it('navigates real arrows and Home End without changing selection or wrapping', () => {
    mount(<Basic onOptionSelect={cy.stub().as('select')} />);
    root().focus();
    cy.realPress('ArrowUp');
    active('cat');
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('End');
    active('fish');
    cy.realPress('ArrowDown');
    active('fish');
    cy.realPress('ArrowUp');
    active('dog');
    cy.realPress('Home');
    active('cat');
    root().should('be.focused');
    cy.get('@select').should('not.have.been.called');
    choices.forEach(choice => selected(choice.value, false));
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`selects with real ${key} and leaves the standalone list visible`, () => {
      mount(<Basic onOptionSelect={cy.stub().as('select')} />);
      root().focus();
      cy.realPress('ArrowDown');
      cy.realPress(key);
      selected('dog');
      payload('@select', 0, 'dog', 'Dog', ['dog'], 'keydown');
      root().should('be.focused').and('be.visible');
    });
  });

  it('toggles multiple selection with real Space and Enter without closing', () => {
    mount(<Basic multiselect onOptionSelect={cy.stub().as('select')} />);
    root().focus();
    cy.realPress('Space');
    selected('cat', true, true);
    payload('@select', 0, 'cat', 'Cat', ['cat']);
    cy.realPress('Enter');
    selected('cat', false, true);
    payload('@select', 1, 'cat', 'Cat', []);
    root().should('be.focused').and('be.visible');
  });

  it('does not invent standalone typeahead and contrasts real Dropdown typeahead', () => {
    mount(
      <>
        <Basic onOptionSelect={cy.stub().as('standalone')} />
        <Dropdown aria-label="Popup pets" listbox={{ 'aria-label': 'Popup options' }}>
          {options('popup')}
        </Dropdown>
      </>,
    );
    root().focus();
    cy.realType('fi');
    active('cat');
    cy.get('@standalone').should('not.have.been.called');
    cy.get('[role="combobox"]').realClick();
    cy.realType('fi');
    cy.get('[role="combobox"]').should('have.attr', 'aria-activedescendant', 'popup-fish');
    cy.realPress('Enter');
    cy.get('[role="combobox"]').should('contain.text', 'Fish').and('have.attr', 'aria-expanded', 'false');
  });

  it('allows real Tab and Shift Tab out without selecting the active standalone option', () => {
    mount(
      <>
        <button id="before">Before</button>
        <Basic defaultSelectedOptions={['cat']} onOptionSelect={cy.stub().as('select')} />
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    root().should('be.focused');
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
    selected('cat');
    selected('dog', false);
    cy.realPress(['Shift', 'Tab']);
    root().should('be.focused');
    active('dog');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#before').should('be.focused');
    cy.get('@select').should('not.have.been.called');
    root().should('be.visible');
  });

  it('lets Dropdown own popup open state selection and trigger active descendants', () => {
    mount(
      <Dropdown
        aria-label="Popup pets"
        listbox={{ id: 'popup-list', 'aria-label': 'Popup options' }}
        onOptionSelect={cy.stub().as('select')}
      >
        {options()}
      </Dropdown>,
    );
    cy.get('[role="combobox"]').realClick().should('have.attr', 'aria-controls', 'popup-list');
    cy.get('#popup-list').should('be.visible').and('not.have.attr', 'tabindex');
    cy.get('#popup-list').should('not.have.attr', 'aria-activedescendant');
    cy.get('[role="combobox"]').should('have.attr', 'aria-activedescendant', 'option-cat').and('be.focused');
    cy.get('#option-dog').realClick();
    payload('@select', 0, 'dog', 'Dog', ['dog']);
    cy.get('[role="combobox"]').should('have.attr', 'aria-expanded', 'false').and('be.focused');
  });

  it('lets Combobox own real typed matching selection and popup closure', () => {
    mount(
      <Combobox
        aria-label="Editable pets"
        listbox={{ id: 'popup-list', 'aria-label': 'Popup options' }}
        onOptionSelect={cy.stub().as('select')}
      >
        {options()}
      </Combobox>,
    );
    cy.get('input[role="combobox"]').realClick();
    cy.realType('Fi');
    cy.get('input').should('have.value', 'Fi').and('have.attr', 'aria-activedescendant', 'option-fish');
    cy.get('#popup-list').should('be.visible').and('not.have.attr', 'aria-activedescendant');
    cy.realPress('Enter');
    payload('@select', 0, 'fish', 'Fish', ['fish']);
    cy.get('input').should('have.value', 'Fish').and('have.attr', 'aria-expanded', 'false').and('be.focused');
  });
});

const Dynamic = ({ onOptionSelect, multiselect }: Pick<ListboxProps, 'onOptionSelect' | 'multiselect'>) => {
  const [items, setItems] = React.useState(choices);
  const [disabled, setDisabled] = React.useState(false);
  return (
    <>
      <button id="reverse" onClick={() => setItems([...items].reverse())}>
        Reverse
      </button>
      <button id="remove" onClick={() => setItems(items.filter(item => item.value !== 'dog'))}>
        Remove dog
      </button>
      <button id="empty" onClick={() => setItems([])}>
        Empty
      </button>
      <button id="restore" onClick={() => setItems(choices)}>
        Restore
      </button>
      <button
        id="edit"
        onClick={() => setItems(items.map(item => (item.value === 'dog' ? { value: 'bird', text: 'Bird' } : item)))}
      >
        Edit dog
      </button>
      <button id="disable" onClick={() => setDisabled(!disabled)}>
        Toggle disabled
      </button>
      <Basic onOptionSelect={onOptionSelect} multiselect={multiselect}>
        {items.map(item => (
          <Option key={item.value} id={`option-${item.value}`} value={item.value} disabled={disabled}>
            {item.text}
          </Option>
        ))}
      </Basic>
    </>
  );
};

describe('Listbox - unit derived and lifecycle', () => {
  [false, true].forEach(multiselect => {
    [false, true].forEach(empty => {
      it(`KNOWN BUG characterization only: ${
        multiselect ? 'menu checkbox' : 'single list'
      } retains exactly the removed active ID with ${empty ? 'no' : 'remaining'} options`, () => {
        mount(<Dynamic multiselect={multiselect} onOptionSelect={cy.stub().as('select')} />);
        root().should('have.attr', 'role', multiselect ? 'menu' : 'listbox');
        root().focus();
        cy.realPress('ArrowDown');
        active('dog');
        root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
        cy.get(empty ? '#empty' : '#remove').realClick();
        cy.get('#option-dog').should('not.exist');
        cy.get(multiselect ? '[role="menuitemcheckbox"]' : '[role="option"]').should('have.length', empty ? 0 : 2);
        // Characterizes BUGUNFIXED, not a correctness contract; the opt-in suite requires absent-or-live here.
        root().should('have.attr', 'aria-activedescendant', 'option-dog');
        root().then(element => expect(element[0].ownerDocument.getElementById('option-dog')).to.equal(null));
        root().focus();
        cy.realPress('Enter');
        cy.get('@select').should('not.have.been.called');
        if (!empty) {
          cy.realPress('Home');
          active('cat');
          root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
          cy.realPress('Enter');
          payload('@select', 0, 'cat', 'Cat', ['cat']);
          selected('cat', true, multiselect);
        }
      });
    });

    it(`accepts absent active descendant after consumer controller blur before removal in ${
      multiselect ? 'menu checkbox' : 'single list'
    } mode`, () => {
      const onOptionSelect = cy.stub().as('select');
      const Fixture = () => {
        const [removed, setRemoved] = React.useState(false);
        const ref = React.useRef<HTMLElement>(null);
        const state = useListbox_unstable(
          {
            id: 'list',
            'aria-label': 'Consumer cleanup',
            multiselect,
            onOptionSelect,
            children: removed ? options().slice(1) : options(),
          },
          ref,
        );
        const context = useListboxContextValues(state);
        useListboxStyles_unstable(state);
        return (
          <>
            <button
              id="cleanup"
              onClick={() => {
                state.activeDescendantController.blur();
                setRemoved(true);
              }}
            >
              Blur controller and remove active option
            </button>
            {renderListbox_unstable(state, context)}
          </>
        );
      };
      mount(<Fixture />);
      active('cat');
      root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
      cy.get('#cleanup').realClick();
      cy.get('#option-cat').should('not.exist');
      root().should('not.have.attr', 'aria-activedescendant');
      root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
      root().focus();
      cy.realPress('Enter');
      cy.get('@select').should('not.have.been.called');
      cy.realPress('ArrowDown');
      active('dog');
      root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
      cy.realPress('Enter');
      payload('@select', 0, 'dog', 'Dog', ['dog']);
      selected('dog', true, multiselect);
    });
  });

  it('maps PageDown and PageUp to last and first even with more than ten options', () => {
    mount(
      <Basic>
        {Array.from({ length: 20 }, (_, i) => (
          <Option key={i} id={`page-${i}`}>{`Item ${i}`}</Option>
        ))}
      </Basic>,
    );
    root().focus();
    cy.realPress('PageDown');
    root().should('have.attr', 'aria-activedescendant', 'page-19');
    cy.realPress('PageUp');
    root().should('have.attr', 'aria-activedescendant', 'page-0');
    cy.get('[aria-selected="true"]').should('not.exist');
  });

  it('Alt ArrowUp selects the active standalone option without closing', () => {
    mount(<Basic onOptionSelect={cy.stub().as('select')} />);
    root().focus();
    cy.realPress('End');
    cy.realPress(['Alt', 'ArrowUp']);
    selected('fish');
    payload('@select', 0, 'fish', 'Fish', ['fish'], 'keydown');
    root().should('be.focused').and('be.visible');
  });

  it('uses the first selected key in single mode rather than DOM order', () => {
    mount(<Basic selectedOptions={['fish', 'cat']} />);
    active('fish');
    selected('cat');
    selected('fish');
    selected('dog', false);
  });

  it('uses the last registered duplicate-value match for initial active descendant', () => {
    mount(
      <Basic selectedOptions={['same']}>
        <Option id="duplicate-first" value="same">
          First
        </Option>
        <Option id="duplicate-last" value="same">
          Last
        </Option>
      </Basic>,
    );
    root().should('have.attr', 'aria-activedescendant', 'duplicate-last');
    cy.get('[aria-selected="true"]').should('have.length', 2);
    root().focus();
    cy.realPress('Home');
    root().should('have.attr', 'aria-activedescendant', 'duplicate-first');
  });

  it('does not synthesize an active option for an unmatched controlled key', () => {
    mount(<Basic selectedOptions={['missing']} onOptionSelect={cy.stub().as('select')} />);
    root().should('not.have.attr', 'aria-activedescendant');
    choices.forEach(choice => selected(choice.value, false));
    root().focus();
    cy.realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('ArrowUp');
    active('cat');
    cy.realPress('Enter');
    payload('@select', 0, 'cat', 'Cat', ['cat']);
    selected('cat', false);
  });

  it('initializes a disabled selected option but does not allow selecting it again', () => {
    mount(
      <Basic defaultSelectedOptions={['dog']} onOptionSelect={cy.stub().as('select')}>
        <Option id="option-cat" value="cat">
          Cat
        </Option>
        <Option id="option-dog" value="dog" disabled>
          Dog
        </Option>
      </Basic>,
    );
    active('dog');
    selected('dog');
    root().focus();
    cy.realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('Home');
    cy.realPress('Enter');
    payload('@select', 0, 'cat', 'Cat', ['cat']);
  });

  it('does not reinitialize default selection or active descendant on unrelated rerenders', () => {
    const Fixture = () => {
      const [value, setValue] = React.useState('dog');
      return (
        <>
          <button id="change" onClick={() => setValue('fish')}>
            Change defaults
          </button>
          <Basic defaultSelectedOptions={[value]} />
        </>
      );
    };
    mount(<Fixture />);
    root().focus();
    cy.realPress('Home');
    cy.realPress('Enter');
    selected('cat');
    cy.get('#change').realClick();
    selected('cat');
    selected('fish', false);
    active('cat');
  });

  it('does not move the last active descendant when controlled selection changes', () => {
    mount(<Controlled />);
    active('dog');
    cy.contains('button', 'External selection').realClick();
    selected('fish');
    active('dog');
    root().focus();
    cy.realPress('ArrowDown');
    active('fish');
  });

  it('keeps keyed DOM nodes and navigates reordered DOM rather than registration order', () => {
    mount(<Dynamic />);
    cy.get('#option-dog').then(element => {
      const original = element[0];
      cy.get('#reverse').realClick();
      cy.get('#option-dog').then(current => expect(current[0]).to.equal(original));
    });
    root().focus();
    cy.realPress('Home');
    active('fish');
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('End');
    active('cat');
  });

  it('unregisters removed inactive options and skips them in real navigation', () => {
    mount(<Dynamic onOptionSelect={cy.stub().as('select')} />);
    active('cat');
    root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
    cy.get('#remove').realClick();
    cy.get('#option-dog').should('not.exist');
    active('cat');
    root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
    cy.get('@select').should('not.have.been.called');
    root().focus();
    cy.realPress('ArrowDown');
    active('fish');
    cy.realPress('Enter');
    payload('@select', 0, 'fish', 'Fish', ['fish']);
  });

  it('recovers navigation after removing the active option and cannot select its old registration', () => {
    mount(<Dynamic onOptionSelect={cy.stub().as('select')} />);
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    cy.get('#remove').realClick();
    cy.get('#option-dog').should('not.exist');
    root().focus();
    cy.realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('ArrowDown');
    active('cat');
    cy.realPress('Enter');
    payload('@select', 0, 'cat', 'Cat', ['cat']);
  });

  it('retains selection by value across removal and readdition with a new DOM node', () => {
    mount(<Dynamic onOptionSelect={cy.stub().as('select')} />);
    cy.get('#option-dog').realClick();
    payload('@select', 0, 'dog', 'Dog', ['dog']);
    cy.get('#option-dog').then(element => {
      const original = element[0];
      cy.get('#remove').realClick();
      cy.then(() => expect(original.isConnected).to.equal(false));
      cy.get('#restore').realClick();
      cy.get('#option-dog').then(current => expect(current[0]).not.to.equal(original));
    });
    selected('dog');
    root().then(element => assertAbsentOrLiveActiveDescendant(element[0]));
    root().focus();
    cy.realPress('Enter');
    payload('@select', 1, 'dog', 'Dog', ['dog']);
    cy.realPress('Home');
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Enter');
    payload('@select', 2, 'dog', 'Dog', ['dog']);
  });

  it('handles empty lists without inventing callbacks and navigates newly added options', () => {
    mount(<Dynamic onOptionSelect={cy.stub().as('select')} />);
    cy.get('#empty').realClick();
    cy.get('[role="option"]').should('not.exist');
    root().focus();
    (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', 'Space'] as const).forEach(key =>
      cy.realPress(key),
    );
    cy.get('@select').should('not.have.been.called');
    cy.get('#restore').realClick();
    cy.get('[role="option"]').should('have.length', 3);
    root().focus();
    cy.realPress('End');
    active('fish');
    cy.realPress('Space');
    payload('@select', 0, 'fish', 'Fish', ['fish']);
  });

  it('supports an initially empty list and lazy options without rerunning mount initialization', () => {
    const Fixture = () => {
      const [shown, setShown] = React.useState(false);
      return (
        <>
          <button id="add" onClick={() => setShown(true)}>
            Add
          </button>
          <Basic>{shown ? options() : []}</Basic>
        </>
      );
    };
    mount(<Fixture />);
    root().should('not.have.attr', 'aria-activedescendant');
    cy.get('#add').realClick();
    cy.get('[role="option"]').should('have.length', 3);
    root().should('not.have.attr', 'aria-activedescendant');
    root().focus();
    cy.realPress('ArrowDown');
    active('cat');
    cy.realPress('Enter');
    selected('cat');
  });

  it('uses updated value and text after replacing an option without stale callback data', () => {
    mount(<Dynamic onOptionSelect={cy.stub().as('select')} />);
    cy.get('#edit').realClick();
    cy.get('#option-dog').should('not.exist');
    cy.get('#option-bird').should('have.text', 'Bird');
    root().focus();
    cy.realPress('Home');
    cy.realPress('ArrowDown');
    active('bird');
    cy.realPress('Enter');
    payload('@select', 0, 'bird', 'Bird', ['bird']);
  });

  it('reregisters changed text and value on the same keyed DOM element', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button id="change" onClick={() => setChanged(true)}>
            Change data
          </button>
          <Basic onOptionSelect={onSelect}>
            <Option id="option-cat" value={changed ? 'new-key' : 'cat'} text={changed ? 'New label' : 'Cat'}>
              {changed ? 'New content' : 'Cat'}
            </Option>
          </Basic>
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#option-cat').then(element => {
      const original = element[0];
      cy.get('#change').realClick();
      cy.get('#option-cat').then(current => expect(current[0]).to.equal(original));
    });
    root().focus();
    cy.realPress('Enter');
    payload('@select', 0, 'new-key', 'New label', ['new-key']);
    selected('cat');
  });

  it('reregisters disabled data for keyboard selection and resumes when reenabled', () => {
    mount(<Dynamic onOptionSelect={cy.stub().as('select')} />);
    cy.get('#disable').realClick();
    root().focus();
    cy.realPress('End');
    active('fish');
    cy.realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.get('#disable').realClick();
    root().focus();
    cy.realPress('Enter');
    payload('@select', 0, 'fish', 'Fish', ['fish']);
  });

  it('keeps sibling standalone registries selection and active descendants independent', () => {
    mount(
      <>
        <Basic id="first">{options('first')}</Basic>
        <Basic id="second" multiselect>
          {options('second')}
        </Basic>
      </>,
    );
    cy.get('#first-dog').realClick();
    cy.get('#first-dog').should('have.attr', 'aria-selected', 'true');
    cy.get('#second-dog').should('have.attr', 'aria-checked', 'false');
    cy.get('#second').focus();
    cy.realPress('End');
    cy.realPress('Space');
    cy.get('#second-fish').should('have.attr', 'aria-checked', 'true');
    cy.get('#first').should('have.attr', 'aria-activedescendant', 'first-dog');
    cy.get('#second').should('have.attr', 'aria-activedescendant', 'second-fish');
  });

  it('characterizes nested Listbox inheritance: pointer selection uses parent context not local props', () => {
    mount(
      <Basic onOptionSelect={cy.stub().as('parent')}>
        <Option id="option-cat" value="cat">
          Cat
        </Option>
        <Listbox
          id="nested"
          aria-label="Nested characterization"
          selectedOptions={['dog']}
          onOptionSelect={cy.stub().as('nested')}
        >
          <Option id="option-dog" value="dog">
            Dog
          </Option>
        </Listbox>
      </Basic>,
    );
    selected('dog', false);
    cy.get('#option-dog').realClick();
    selected('dog');
    payload('@parent', 0, 'dog', 'Dog', ['dog']);
    cy.get('@nested').should('not.have.been.called');
    root().should('have.attr', 'aria-activedescendant', 'option-dog');
    cy.get('#nested').should('not.have.attr', 'aria-activedescendant');
  });

  it('uses the latest consumer callback and selection closure after rerender', () => {
    const oldCallback = cy.stub().as('old');
    const latestCallback = cy.stub().as('latest');
    const Fixture = () => {
      const [latest, setLatest] = React.useState(false);
      return (
        <>
          <button id="change" onClick={() => setLatest(true)}>
            Replace callback
          </button>
          <Basic multiselect onOptionSelect={latest ? latestCallback : oldCallback} />
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#option-cat').realClick();
    payload('@old', 0, 'cat', 'Cat', ['cat']);
    cy.get('#change').realClick();
    root().focus();
    cy.realPress('ArrowDown');
    cy.realPress('Space');
    payload('@latest', 0, 'dog', 'Dog', ['cat', 'dog']);
    cy.get('@old').should('have.been.calledOnce');
  });

  it('uses latest native keydown focus and blur callbacks after rerender', () => {
    const before = cy.stub().as('before');
    const after = cy.stub().as('after');
    const Fixture = () => {
      const [latest, setLatest] = React.useState(false);
      const callback = latest ? after : before;
      return (
        <>
          <button id="change" onClick={() => setLatest(true)}>
            Replace native callbacks
          </button>
          <Basic onKeyDown={callback} onFocus={callback} onBlur={callback} />
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#change').realClick();
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    root().blur();
    cy.get('@before').should('not.have.been.called');
    cy.get('@after').should('have.been.calledThrice');
  });

  it('clears selection through recomposed state with undefined value and text payload', () => {
    const Recompose = (props: ListboxProps) => {
      const ref = React.useRef<HTMLElement>(null);
      const state = useListbox_unstable(props, ref);
      const context = useListboxContextValues(state);
      useListboxStyles_unstable(state);
      return (
        <>
          <button id="clear" onClick={state.clearSelection}>
            Clear
          </button>
          {renderListbox_unstable(state, context)}
        </>
      );
    };
    mount(
      <Recompose
        id="list"
        aria-label="Recomposed pets"
        multiselect
        defaultSelectedOptions={['cat', 'dog']}
        onOptionSelect={cy.stub().as('select')}
      >
        {options()}
      </Recompose>,
    );
    selected('cat', true, true);
    cy.get('#clear').realClick();
    choices.forEach(choice => selected(choice.value, false, true));
    cy.get<SinonStub>('@select').then(stub => {
      expect(stub.callCount).to.equal(1);
      expect(stub.firstCall.args[1]).to.deep.equal({
        optionValue: undefined,
        optionText: undefined,
        selectedOptions: [],
      });
    });
    root().focus();
    cy.realPress('End');
    cy.realPress('Space');
    payload('@select', 1, 'fish', 'Fish', ['fish']);
  });

  it('detaches forwarded refs on removal and initializes a fresh remount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Fixture = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button id="toggle" onClick={() => setShown(!shown)}>
            Toggle
          </button>
          {shown && <Basic ref={ref} defaultSelectedOptions={['dog']} />}
        </>
      );
    };
    mount(<Fixture />);
    active('dog');
    root().then(element => {
      const original = element[0];
      cy.get('#toggle').realClick();
      root().should('not.exist');
      cy.then(() => {
        expect(ref.current).to.equal(null);
        expect(original.isConnected).to.equal(false);
      });
      cy.get('#toggle').realClick();
      root().then(current => {
        expect(ref.current).to.equal(current[0]);
        expect(current[0]).not.to.equal(original);
      });
    });
    active('dog');
    selected('dog');
  });

  it('exposes current registration count ID value and text matching after cleanup', () => {
    const Registry = () => {
      const [items, setItems] = React.useState(choices);
      const [report, setReport] = React.useState('');
      const ref = React.useRef<HTMLElement>(null);
      const state = useListbox_unstable(
        {
          id: 'list',
          'aria-label': 'Registry',
          children: items.map(item => (
            <Option id={`option-${item.value}`} key={item.value} value={item.value}>
              {item.text}
            </Option>
          )),
        },
        ref,
      );
      const context = useListboxContextValues(state);
      useListboxStyles_unstable(state);
      return (
        <>
          <button id="remove" onClick={() => setItems(items.filter(item => item.value !== 'dog'))}>
            Remove
          </button>
          <button id="empty" onClick={() => setItems([])}>
            Empty
          </button>
          <button
            id="inspect"
            onClick={() =>
              setReport(
                JSON.stringify({
                  count: state.getCount(),
                  dog: state.getOptionById('option-dog')?.value ?? null,
                  values: state.getOptionsMatchingValue(value => value === 'cat').map(option => option.id),
                  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Verify the exported legacy collection API.
                  texts: state.getOptionsMatchingText(text => text.startsWith('F')).map(option => option.value),
                }),
              )
            }
          >
            Inspect
          </button>
          <output>{report}</output>
          {renderListbox_unstable(state, context)}
        </>
      );
    };
    mount(<Registry />);
    cy.get('#inspect').realClick();
    cy.get('output').should(
      'have.text',
      JSON.stringify({ count: 3, dog: 'dog', values: ['option-cat'], texts: ['fish'] }),
    );
    cy.get('#remove').realClick();
    cy.get('#inspect').realClick();
    cy.get('output').should(
      'have.text',
      JSON.stringify({ count: 2, dog: null, values: ['option-cat'], texts: ['fish'] }),
    );
    cy.get('#empty').realClick();
    cy.get('#inspect').realClick();
    cy.get('output').should('have.text', JSON.stringify({ count: 0, dog: null, values: [], texts: [] }));
  });

  it('uses a changed explicit ID and current registration after navigation recovery', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button id="change" onClick={() => setChanged(true)}>
            Change ID
          </button>
          <Basic onOptionSelect={onSelect}>
            <Option id={changed ? 'new-id' : 'old-id'} value="cat">
              Cat
            </Option>
          </Basic>
        </>
      );
    };
    mount(<Fixture />);
    root().should('have.attr', 'aria-activedescendant', 'old-id');
    cy.get('#change').realClick();
    cy.get('#old-id').should('not.exist');
    root().focus();
    cy.realPress('Home');
    root().should('have.attr', 'aria-activedescendant', 'new-id');
    cy.realPress('Enter');
    payload('@select', 0, 'cat', 'Cat', ['cat']);
  });

  it('leaves multiselect state unchanged when real Tab moves focus away', () => {
    mount(
      <>
        <Basic multiselect defaultSelectedOptions={['cat']} onOptionSelect={cy.stub().as('select')} />
        <button id="after">After</button>
      </>,
    );
    root().focus();
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
    selected('cat', true, true);
    selected('dog', false, true);
    cy.get('@select').should('not.have.been.called');
    cy.realPress(['Shift', 'Tab']);
    root().should('be.focused');
    active('dog');
    cy.realPress('Space');
    payload('@select', 0, 'dog', 'Dog', ['cat', 'dog']);
  });

  ['Dropdown', 'Combobox'].forEach(kind => {
    it(`uses parent multiselect context for exact popup toggles and Escape in ${kind}`, () => {
      const Parent = kind === 'Dropdown' ? Dropdown : Combobox;
      mount(
        <Parent
          aria-label="Pets"
          multiselect
          defaultSelectedOptions={['cat']}
          defaultValue="Cat"
          listbox={{ id: 'popup' }}
          onOptionSelect={cy.stub().as('select')}
        >
          {options()}
        </Parent>,
      );
      cy.get('[role="combobox"]').realClick();
      cy.get('#popup').should('have.attr', 'role', 'menu');
      cy.get('#popup').should('not.have.attr', 'aria-multiselectable');
      cy.get('[role="combobox"]').should('have.attr', 'aria-activedescendant', 'option-cat');
      selected('cat', true, true);
      cy.realPress('ArrowDown');
      cy.realPress('Enter');
      selected('dog', true, true);
      payload('@select', 0, 'dog', 'Dog', ['cat', 'dog']);
      cy.get('[role="combobox"]').should('have.attr', 'aria-expanded', 'true');
      cy.realPress('Space');
      selected('dog', false, true);
      payload('@select', 1, 'dog', 'Dog', ['cat']);
      cy.realPress('Escape');
      cy.get('[role="combobox"]').should('have.attr', 'aria-expanded', 'false').and('be.focused');
      cy.get('@select').should('have.been.calledTwice');
    });
  });
});
