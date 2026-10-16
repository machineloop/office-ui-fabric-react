import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { Field } from '@fluentui/react-field';
import type { ListboxProps } from '@fluentui/react-combobox';
import type { JSXIntrinsicElement, JSXIntrinsicElementKeys } from '@fluentui/react-utilities';
import { TagPicker } from '../TagPicker/TagPicker';
import type { TagPickerProps } from '../TagPicker/TagPicker.types';
import { TagPickerControl } from '../TagPickerControl/TagPickerControl';
import { TagPickerInput } from '../TagPickerInput/TagPickerInput';
import { TagPickerButton } from '../TagPickerButton/TagPickerButton';
import { TagPickerOption } from '../TagPickerOption/TagPickerOption';
import { TagPickerOptionGroup } from '../TagPickerOptionGroup/TagPickerOptionGroup';
import { TagPickerList } from './TagPickerList';
import type { TagPickerListProps } from './TagPickerList.types';
import {
  TagPickerContextProvider,
  tagPickerContextDefaultValue,
  useTagPickerContext_unstable,
} from '../../contexts/TagPickerContext';
import type { TagPickerContextValue } from '../../contexts/TagPickerContext';
import 'cypress-real-events';
import { useTagPickerListTestStyles } from './TagPickerList.cy.styles';

type NativeElements = { [Tag in JSXIntrinsicElementKeys]: JSXIntrinsicElement<Tag> };

// FluentProvider's custom runtime still reads the global JSX namespace with React 19.
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    interface Element extends React.ReactElement {}
    interface ElementClass extends React.Component {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}
    interface IntrinsicElements extends NativeElements {}
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}

const list = '[data-testid="list"]';
const input = '[data-testid="input"]';
const alpha = '#option-alpha';
const beta = '#option-beta';

type FixtureProps = {
  picker?: Omit<Partial<TagPickerProps>, 'children'>;
  listProps?: TagPickerListProps;
  children?: React.ReactNode;
  button?: boolean;
  listRef?: React.Ref<HTMLDivElement>;
};

const Fixture = ({ picker, listProps, children, button, listRef }: FixtureProps) => (
  <div data-testid="host">
    <button data-testid="before">Before</button>
    <TagPicker inline {...picker}>
      <TagPickerControl data-testid="control">
        {button ? (
          <TagPickerButton data-testid="input" aria-label="Choose tags" />
        ) : (
          <TagPickerInput data-testid="input" aria-label="Choose tags" />
        )}
      </TagPickerControl>
      <TagPickerList data-testid="list" aria-label="Available tags" ref={listRef} {...listProps}>
        {children === undefined ? (
          <>
            <TagPickerOption id="option-alpha" value="alpha">
              Alpha
            </TagPickerOption>
            <TagPickerOption id="option-beta" value="beta">
              Beta
            </TagPickerOption>
            <TagPickerOption id="option-gamma" value="gamma">
              Gamma
            </TagPickerOption>
          </>
        ) : (
          children
        )}
      </TagPickerList>
    </TagPicker>
    <button data-testid="after">After</button>
  </div>
);

const render = (element: React.ReactElement, dark = false, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );

const active = (id: string) => {
  cy.get(input).should('be.focused').and('have.attr', 'aria-activedescendant', id);
  cy.get(`[id="${id}"]`).should('have.attr', 'role', 'option');
};

const ScrollingFixture = () => {
  const styles = useTagPickerListTestStyles();
  return (
    <Fixture listProps={{ className: styles.scrolling }}>
      {Array.from({ length: 30 }, (_, index) => (
        <TagPickerOption id={`scroll-option-${index}`} key={index} value={`${index}`}>
          {`Item ${index}`}
        </TagPickerOption>
      ))}
    </Fixture>
  );
};

const RegistryProbe = ({ ready }: { ready: (lookup: TagPickerContextValue['getOptionById']) => void }) => {
  const lookup = useTagPickerContext_unstable(ctx => ctx.getOptionById);
  React.useEffect(() => ready(lookup), [lookup, ready]);
  return null;
};

const DynamicFixture = ({
  selected,
  ready,
}: {
  selected: NonNullable<TagPickerProps['onOptionSelect']>;
  ready: (lookup: TagPickerContextValue['getOptionById']) => void;
}) => {
  const [revision, revise] = React.useState(0);
  const [empty, setEmpty] = React.useState(false);
  const [reverse, setReverse] = React.useState(false);
  const values = reverse ? ['beta', 'alpha'] : ['alpha', 'beta'];
  return (
    <>
      <button data-testid="revise" onMouseDown={event => event.preventDefault()} onClick={() => revise(v => v + 1)}>
        Revise
      </button>
      <button data-testid="empty" onMouseDown={event => event.preventDefault()} onClick={() => setEmpty(v => !v)}>
        Empty
      </button>
      <button data-testid="reverse" onMouseDown={event => event.preventDefault()} onClick={() => setReverse(v => !v)}>
        Reverse
      </button>
      <TagPicker inline open onOptionSelect={selected}>
        <TagPickerControl>
          <TagPickerInput data-testid="input" aria-label="Choose tags" />
          <RegistryProbe ready={ready} />
        </TagPickerControl>
        <TagPickerList data-testid="list" aria-label="Available tags">
          {!empty &&
            values.map(value => (
              <TagPickerOption key={value} id={`dynamic-${value}-${revision}`} value={`${value}-${revision}`}>
                {`${value} revision ${revision}`}
              </TagPickerOption>
            ))}
        </TagPickerList>
      </TagPicker>
    </>
  );
};

const OverrideFixture = () => {
  const styles = useTagPickerListTestStyles();
  return <Fixture listProps={{ className: styles.override }} />;
};

describe('TagPickerList documentation contracts', () => {
  it('D01 opens a named listbox with matching input controls and native div identity', () => {
    render(<Fixture />);
    cy.get(list).should('not.exist');
    cy.get(input).realClick();
    cy.get(list)
      .should('be.visible')
      .and('have.attr', 'role', 'listbox')
      .and('have.attr', 'aria-label', 'Available tags')
      .and('not.have.attr', 'tabindex');
    cy.get(list).then($list => {
      expect($list[0].tagName).to.equal('DIV');
      cy.get(input).should('have.attr', 'aria-controls', $list.attr('id'));
      cy.get('[data-testid="control"]').should('have.attr', 'aria-owns', $list.attr('id'));
    });

    cy.get(`${list} [role="option"]`).should('have.length', 3);
    active('option-alpha');
  });

  describe('TagPickerList edges and accessibility', () => {
    it('E01 inherits the surrounding Field label when the list has no explicit name', () => {
      render(
        <Field label="Employees">
          <Fixture listProps={{ 'aria-label': undefined }} />
        </Field>,
      );
      cy.get(input).realClick();
      cy.get(list).then($list => {
        const labelId = $list.attr('aria-labelledby');
        expect(labelId).to.be.a('string').and.not.equal('');
        cy.get(`[id="${labelId}"]`).should('have.text', 'Employees');
      });
    });

    it('E02 explicit aria-label takes precedence over Field naming', () => {
      render(
        <Field label="Employees">
          <Fixture />
        </Field>,
      );
      cy.get(input).realClick();
      cy.get(list).should('have.attr', 'aria-label', 'Available tags').and('not.have.attr', 'aria-labelledby');
    });

    it('E03 explicit labelledby and describedby references remain intact', () => {
      render(
        <>
          <span id="list-name">Choices</span>
          <span id="list-help">Choose a person</span>
          <Fixture
            listProps={{
              'aria-label': undefined,
              'aria-labelledby': 'list-name',
              'aria-describedby': 'list-help',
            }}
          />
        </>,
      );
      cy.get(input).realClick();
      cy.get(list)
        .should('have.attr', 'aria-labelledby', 'list-name')
        .and('have.attr', 'aria-describedby', 'list-help');
      cy.get('#list-name').should('have.text', 'Choices');
      cy.get('#list-help').should('have.text', 'Choose a person');
    });

    it('E04 an empty list stays a named listbox without fabricated options or active descendants', () => {
      const selected = cy.stub().as('selected');
      render(<Fixture picker={{ onOptionSelect: selected }}>{null}</Fixture>);
      cy.get(input).realClick();
      cy.get(list).should('be.visible').and('have.attr', 'role', 'listbox');
      cy.get(`${list} [role="option"]`).should('not.exist');
      cy.get(input).should('not.have.attr', 'aria-activedescendant');
      cy.realPress('ArrowDown');
      cy.realPress('Enter');
      cy.get('@selected').should('not.have.been.called');
      cy.get(input).should('be.focused');
    });

    it('E05 plain text and presentational children do not register as selectable options', () => {
      const selected = cy.stub().as('selected');
      render(
        <Fixture picker={{ onOptionSelect: selected }}>
          No matches
          <span role="presentation" data-testid="message">
            Try another query
          </span>
        </Fixture>,
      );
      cy.get(input).realClick();
      cy.get('[data-testid="message"]').realClick();
      cy.get(list).should('be.visible');
      cy.get(input).should('be.focused').and('not.have.attr', 'aria-activedescendant');
      cy.get(`${list} [role="option"]`).should('not.exist');
      cy.get('@selected').should('not.have.been.called');
    });

    it('E06 a native role=option child without Fluent option registration is not keyboard selectable', () => {
      const selected = cy.stub().as('selected');
      render(
        <Fixture picker={{ onOptionSelect: selected }}>
          <div role="option" id="unregistered-option">
            Static content
          </div>
        </Fixture>,
      );
      cy.get(input).realClick();
      cy.realPress('ArrowDown');
      cy.get(input).should('not.have.attr', 'aria-activedescendant');
      cy.realPress('Enter');
      cy.get('@selected').should('not.have.been.called');
    });

    it('E07 known option boundary aria-disabled alone does not disable navigation or selection', () => {
      const selected = cy.stub().as('selected');
      render(
        <Fixture picker={{ onOptionSelect: selected }}>
          <TagPickerOption id="disabled-option" aria-disabled="true" value="disabled">
            Disabled
          </TagPickerOption>
          <TagPickerOption id="option-alpha" value="alpha">
            Alpha
          </TagPickerOption>
          <TagPickerOption id="disabled-middle" aria-disabled="true" value="middle">
            Middle
          </TagPickerOption>
          <TagPickerOption id="option-beta" value="beta">
            Beta
          </TagPickerOption>
        </Fixture>,
      );
      cy.get(input).realClick();
      active('disabled-option');
      cy.get('#disabled-option').should('have.attr', 'aria-disabled', 'true').realClick();
      cy.get('@selected').its('firstCall.args.1.selectedOptions').should('deep.equal', ['disabled']);
      cy.get(list).should('not.be.visible');
    });

    it('E08 skips headings and separators between real registered options', () => {
      render(
        <Fixture>
          <h3>Choices</h3>
          <TagPickerOption id="option-alpha" value="alpha">
            Alpha
          </TagPickerOption>
          <div role="separator" />
          <TagPickerOption id="option-beta" value="beta">
            Beta
          </TagPickerOption>
        </Fixture>,
      );
      cy.get(input).realClick();
      active('option-alpha');
      cy.realPress('ArrowDown');
      active('option-beta');
      cy.get(`${list} [role="option"]`).should('have.length', 2);
    });

    it('E09 Tab leaves the popup without placing the list in the tab order', () => {
      render(<Fixture />);
      cy.get(input).realClick();
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.get(list).should('not.exist');
    });

    it('E10 Shift+Tab returns to the preceding native control', () => {
      render(<Fixture />);
      cy.get(input).realClick();
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="before"]').should('be.focused');
      cy.get(list).should('not.exist');
    });

    it('E11 Home End and page keys navigate registered options without wrapping at boundaries', () => {
      render(<Fixture />);
      cy.get(input).realClick();
      cy.realPress('End');
      active('option-gamma');
      cy.realPress('ArrowDown');
      active('option-gamma');
      cy.realPress('Home');
      active('option-alpha');
      cy.realPress('ArrowUp');
      active('option-alpha');
      cy.realPress('PageDown');
      active('option-gamma');
      cy.realPress('PageUp');
      active('option-alpha');
    });

    it('E12 typing uses parent option text matching rather than list-owned filtering', () => {
      render(<Fixture />);
      cy.get(input).realClick().realType('Be');
      active('option-beta');
      cy.get(`${list} [role="option"]`).should('have.length', 3);
      cy.get(input).should('have.value', 'Be');
    });

    it('E13 parent disableAutoFocus controls activation while deprecated list prop has no effect', () => {
      render(<Fixture picker={{ disableAutoFocus: true }} listProps={{ disableAutoFocus: false }} />);
      cy.get(input).realClick().should('not.have.attr', 'aria-activedescendant');
      cy.realPress('ArrowDown');
      active('option-alpha');
    });

    it('E14 list disableAutoFocus=true does not override parent auto activation', () => {
      render(<Fixture listProps={{ disableAutoFocus: true }} />);
      cy.get(input).realClick();
      active('option-alpha');
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      it(`E15 ${dir} keyboard activation scrolls the last option into the list viewport`, () => {
        render(<ScrollingFixture />, false, dir);
        cy.get(input).realClick();
        cy.get(list).should('have.css', 'direction', dir);
        cy.get(list).then($list => {
          expect($list[0].scrollHeight).to.be.greaterThan($list[0].clientHeight);
          expect($list[0].scrollTop).to.equal(0);
        });
        cy.realPress('End');
        active('scroll-option-29');
        cy.get(list).should($list => {
          expect($list[0].scrollTop).to.be.greaterThan(0);
          const bounds = $list[0].getBoundingClientRect();
          const optionBounds = $list[0].querySelector('#scroll-option-29')!.getBoundingClientRect();
          expect(optionBounds.top).to.be.at.least(bounds.top);
          expect(optionBounds.bottom).to.be.at.most(bounds.bottom);
        });
        cy.realPress('Home');
        active('scroll-option-0');
        cy.get(list).should($list => {
          const bounds = $list[0].getBoundingClientRect();
          const optionBounds = $list[0].querySelector('#scroll-option-0')!.getBoundingClientRect();
          expect(optionBounds.top).to.be.at.least(bounds.top);
          expect(optionBounds.bottom).to.be.at.most(bounds.bottom);
          expect($list[0].scrollTop).to.be.lessThan($list[0].clientHeight);
        });
      });
    }

    for (const dark of [false, true]) {
      it(`E16 ${dark ? 'dark' : 'light'} theme supplies the list surface tokens`, () => {
        const theme = dark ? teamsDarkTheme : teamsLightTheme;
        render(<Fixture />, dark);
        cy.get(input).realClick();
        cy.get(list).should('have.css', 'background-color', dark ? 'rgb(41, 41, 41)' : 'rgb(255, 255, 255)');
        cy.get(list).should('have.css', 'border-radius', theme.borderRadiusMedium);
        cy.get(list).then($list => {
          expect($list[0].style.getPropertyValue('background-color')).to.equal('');
          expect($list.css('box-shadow')).not.to.equal('none');
        });
      });
    }

    it('E17 known boundary custom list ID is not propagated to picker-owned controls relationships', () => {
      render(<Fixture listProps={{ id: 'custom-list' }} />);
      cy.get(input).realClick();
      cy.get(list).should('have.attr', 'id', 'custom-list');
      cy.get(input).then($input => {
        const controls = $input.attr('aria-controls');
        expect(controls).to.be.a('string').and.not.equal('custom-list');
        expect($input[0].ownerDocument.getElementById(controls!)).to.equal(null);
        cy.get('[data-testid="control"]').should('have.attr', 'aria-owns', controls);
      });
    });

    it('E18 known option-owned boundary selected options omit default aria-selected and aria-checked', () => {
      render(<Fixture picker={{ defaultSelectedOptions: ['alpha'] }} />);
      cy.get(input).realClick();
      cy.get(alpha).should('have.attr', 'role', 'option').and('not.have.attr', 'aria-selected');
      cy.get(alpha).should('not.have.attr', 'aria-checked');
      cy.get(list).should('have.attr', 'role', 'listbox').and('not.have.attr', 'aria-multiselectable');
    });
  });
  it('D02 navigates down and up while DOM focus stays on the real input', () => {
    render(<Fixture />);
    cy.get(input).realClick();
    active('option-alpha');
    cy.realPress('ArrowDown');
    active('option-beta');
    cy.realPress('ArrowUp');
    active('option-alpha');
  });

  it('D03 Enter selects through picker context and closes without moving input focus', () => {
    const selected = cy.stub().as('selected');
    render(<Fixture picker={{ onOptionSelect: selected }} />);
    cy.get(input).realClick();
    cy.realPress('ArrowDown');
    cy.realPress('Enter');
    cy.get('@selected').should('have.been.calledOnce').its('firstCall.args.1').should('include', {
      value: 'beta',
      type: 'keydown',
    });
    cy.get('@selected').its('firstCall.args.1.selectedOptions').should('deep.equal', ['beta']);
    cy.get(list).should('not.be.visible');
    cy.get(input).should('be.focused').and('not.have.attr', 'aria-controls');
  });

  it('D04 pointer option selection bubbles through the list and restores trigger focus', () => {
    const selected = cy.stub().as('selected');
    const clicked = cy.stub().as('clicked');
    render(<Fixture picker={{ onOptionSelect: selected }} listProps={{ onClick: clicked }} />);
    cy.get(input).realClick();
    cy.get(beta).realClick();
    cy.get('@selected').its('firstCall.args.1').should('include', { value: 'beta', type: 'click' });
    cy.get('@clicked').should('have.been.calledOnce');
    cy.get(input).should('be.focused');
    cy.get(list).should('not.be.visible');
  });

  it('D05 Escape hides the focused list and clears active and controls relationships', () => {
    render(<Fixture />);
    cy.get(input).realClick();
    cy.realPress('Escape');
    cy.get(list).should('have.css', 'display', 'none');
    cy.get(input).should('be.focused').and('not.have.attr', 'aria-activedescendant');
    cy.get(input).should('not.have.attr', 'aria-controls');
  });

  it('D06 outside pointer interaction closes and permits focus outside the popup', () => {
    render(<Fixture />);
    cy.get(input).realClick();
    cy.get('[data-testid="before"]').realClick().should('be.focused');
    cy.get(list).should('not.exist');
  });

  for (const inline of [true, false]) {
    it(`D07 ${inline ? 'inline' : 'portal'} placement preserves list relationships and selection`, () => {
      const selected = cy.stub().as('selected');
      render(<Fixture picker={{ inline, onOptionSelect: selected }} />);
      cy.get(input).realClick();
      cy.get(list).then($list => {
        expect(Boolean($list.closest('[data-testid="host"]').length)).to.equal(inline);
        cy.get(input).should('have.attr', 'aria-controls', $list.attr('id'));
        cy.get('[data-testid="control"]').then($control => {
          const popup = $list[0].getBoundingClientRect();
          const control = $control[0].getBoundingClientRect();
          expect(Math.abs(popup.width - control.width)).to.be.at.most(1);
          expect(Math.abs(popup.left - control.left)).to.be.at.most(1);
          expect(popup.top - control.bottom).to.be.within(1, 3);
        });
      });
      cy.get(alpha).realClick();
      cy.get('@selected').its('firstCall.args.1.selectedOptions').should('deep.equal', ['alpha']);
    });
  }

  it('D08 defaultOpen displays the list without stealing initial DOM focus', () => {
    render(<Fixture picker={{ defaultOpen: true }} />);
    cy.get(list).should('be.visible');
    cy.get(input).should('not.be.focused');
    cy.get(input).realClick();
    cy.realPress('ArrowDown');
    cy.get(input).should('be.focused');
  });

  it('D09 button trigger uses the same list controls and active-descendant contract', () => {
    render(<Fixture button />);
    cy.get(input).realClick();
    cy.get(list).should('be.visible');
    active('option-alpha');
    cy.realPress('ArrowDown');
    active('option-beta');
    cy.realPress('Escape');
    cy.get(input).should('be.focused');
  });

  it('D10 disabled picker does not open its list on pointer or keyboard', () => {
    render(<Fixture picker={{ disabled: true }} />);
    cy.get(input).should('be.disabled');
    cy.get('[data-testid="before"]').realClick();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.get(list).should('not.exist');
  });

  it('D11 grouped options retain their group labels without adding list-owned selection', () => {
    render(
      <Fixture>
        <TagPickerOptionGroup label="Team A">
          <TagPickerOption id="option-alpha" value="alpha">
            Alpha
          </TagPickerOption>
        </TagPickerOptionGroup>
        <TagPickerOptionGroup label="Team B">
          <TagPickerOption id="option-beta" value="beta">
            Beta
          </TagPickerOption>
        </TagPickerOptionGroup>
      </Fixture>,
    );
    cy.get(input).realClick();
    cy.get(`${list} [role="group"]`).each(($group, index) => {
      cy.get(`[id="${$group.attr('aria-labelledby')}"]`).should('have.text', index ? 'Team B' : 'Team A');
    });
    cy.realPress('ArrowDown');
    active('option-beta');
  });

  for (const size of ['medium', 'large', 'extra-large'] as const) {
    for (const appearance of ['outline', 'underline', 'filled-darker', 'filled-lighter'] as const) {
      it(`D12 ${size}/${appearance} picker variants leave the list base layout unchanged`, () => {
        render(<Fixture picker={{ size, appearance }} />);
        cy.get(input).realClick();
        cy.get(list)
          .should('have.css', 'display', 'flex')
          .and('have.css', 'flex-direction', 'column')
          .and('have.css', 'box-sizing', 'border-box')
          .and('have.css', 'overflow-y', 'auto')
          .and('have.css', 'background-color', 'rgb(255, 255, 255)')
          .and('have.css', 'border-radius', teamsLightTheme.borderRadiusMedium);
        cy.get(list).then($list => {
          const view = $list[0].ownerDocument.defaultView;
          expect(view).not.to.equal(null);
          expect(parseFloat($list.css('max-height'))).to.equal(view!.innerHeight * 0.8);
        });
        cy.get(`${list} [role="option"]`).should('have.length', 3);
      });
    }
  }
});

describe('TagPickerList unit and source derived contracts', () => {
  it('U01 defaults to a collapsed native div outside picker context', () => {
    render(<TagPickerList data-testid="list">Default list</TagPickerList>);
    cy.get(list)
      .should('have.css', 'display', 'none')
      .and('have.attr', 'role', 'listbox')
      .and('have.attr', 'id', '')
      .and('have.class', 'fui-Listbox')
      .and('have.class', 'fui-TagPickerList');
    cy.get(list).should('have.text', 'Default list');
  });

  it('U02 context open updates collapse styles on the same native list node', () => {
    const Toggle = () => {
      const [open, setOpen] = React.useState(true);
      return (
        <>
          <button data-testid="toggle" onClick={() => setOpen(v => !v)}>
            Toggle
          </button>
          <TagPickerContextProvider value={{ ...tagPickerContextDefaultValue, open, popoverId: 'stable-list' }}>
            <TagPickerList data-testid="list">Content</TagPickerList>
          </TagPickerContextProvider>
        </>
      );
    };
    render(<Toggle />);
    cy.get(list).then($list => {
      const native = $list[0];
      cy.get('[data-testid="toggle"]').realClick();
      cy.get(list)
        .should('have.css', 'display', 'none')
        .then($next => expect($next[0]).to.equal(native));
      cy.get('[data-testid="toggle"]').realClick();
      cy.get(list)
        .should('be.visible')
        .then($next => expect($next[0]).to.equal(native));
    });
  });

  it('U03 merges forwarded and context popover refs and clears both on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const popoverRef = React.createRef<HTMLDivElement>();
    const Toggle = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button data-testid="toggle" onClick={() => setShown(v => !v)}>
            Toggle
          </button>
          <TagPickerContextProvider value={{ ...tagPickerContextDefaultValue, open: true, popoverRef }}>
            {shown && <TagPickerList data-testid="list" ref={ref} />}
          </TagPickerContextProvider>
        </>
      );
    };
    render(<Toggle />);
    cy.get(list).then($list => {
      expect(ref.current).to.equal($list[0]);
      expect(popoverRef.current).to.equal($list[0]);
    });
    cy.get('[data-testid="toggle"]').realClick();
    cy.get(list).should('not.exist');
    cy.then(() => {
      expect(ref.current).to.equal(null);
      expect(popoverRef.current).to.equal(null);
    });
  });

  it('U04 callback ref receives the exact rendered root and null on lifecycle removal', () => {
    const ref = cy.stub().as('ref');
    render(<Fixture listRef={ref} />);
    cy.get(input).realClick();
    cy.get(list).then($list => expect(ref.lastCall.args[0]).to.equal($list[0]));
    cy.get('[data-testid="before"]').realClick();
    cy.get(list).should('not.exist');
    cy.then(() => expect(ref.lastCall.args[0]).to.equal(null));
  });

  it('U05 native title lang data and tabIndex survive while caller role cannot replace listbox', () => {
    const nativeProps: TagPickerListProps & { 'data-contract': string } = {
      title: 'Choices help',
      lang: 'fr',
      'data-contract': 'native',
      tabIndex: -1,
      role: 'menu',
    };
    render(<Fixture listProps={nativeProps} />);
    cy.get(input).realClick();
    cy.get(list)
      .should('have.attr', 'title', 'Choices help')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'data-contract', 'native')
      .and('have.attr', 'tabindex', '-1')
      .and('have.attr', 'role', 'listbox');
  });

  it('U06 consumer styles win over list defaults without losing static classes', () => {
    render(<OverrideFixture />);
    cy.get(input).realClick();
    cy.get(list)
      .should('have.css', 'border-radius', teamsLightTheme.borderRadiusXLarge)
      .and('have.css', 'box-shadow', 'none')
      .and('have.class', 'fui-TagPickerList')
      .and('have.class', 'fui-Listbox');
  });

  it('U07 root render function forwards native props and ref to the rendered Listbox', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <TagPickerContextProvider value={{ ...tagPickerContextDefaultValue, open: true, popoverId: 'render-list' }}>
        <TagPickerList data-testid="list" aria-label="Render choices" ref={ref}>
          {(Component: React.ElementType<ListboxProps>, props: Omit<ListboxProps, 'as'>) => (
            <Component {...props} data-rendered="true">
              <span>Rendered content</span>
            </Component>
          )}
        </TagPickerList>
      </TagPickerContextProvider>,
    );
    cy.get(list)
      .should('have.attr', 'data-rendered', 'true')
      .and('have.attr', 'role', 'listbox')
      .and('have.attr', 'id', 'render-list')
      .and('have.text', 'Rendered content');
    cy.get(list).then($list => expect(ref.current).to.equal($list[0]));
  });

  it('U08 list mousedown and click callbacks observe composed prevention and focused trigger', () => {
    const seen: string[] = [];
    render(
      <Fixture
        listProps={{
          onMouseDown: event => {
            expect(event.defaultPrevented).to.equal(true);
            seen.push('mousedown');
          },
          onClick: event => {
            expect(event.defaultPrevented).to.equal(true);
            expect(event.currentTarget.ownerDocument.activeElement?.getAttribute('data-testid')).to.equal('input');
            seen.push('click');
          },
        }}
      >
        <span data-testid="content">Nonselectable content</span>
      </Fixture>,
    );
    cy.get(input).realClick();
    cy.get('[data-testid="content"]').realClick();
    cy.then(() => expect(seen).to.deep.equal(['mousedown', 'click']));
    cy.get(list).should('be.visible');
  });

  it('U09 rerenders use latest list event closures without replacing the native root', () => {
    const seen: string[] = [];
    const Latest = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button
            data-testid="revise"
            onMouseDown={event => event.preventDefault()}
            onClick={() => setVersion(v => v + 1)}
          >
            Revise
          </button>
          <Fixture
            picker={{ open: true }}
            listProps={{
              onMouseDown: () => seen.push(`down-${version}`),
              onClick: () => seen.push(`click-${version}`),
            }}
          >
            <span data-testid="content">Content</span>
          </Fixture>
        </>
      );
    };
    render(<Latest />);
    cy.get('[data-testid="content"]').realClick();
    cy.get(list).then($list => {
      const native = $list[0];
      cy.get('[data-testid="revise"]').realClick();
      cy.get('[data-testid="content"]').realClick();
      cy.get(list).then($next => expect($next[0]).to.equal(native));
    });
    cy.then(() => expect(seen).to.deep.equal(['down-0', 'click-0', 'down-1', 'click-1']));
  });

  it('U10 controlled open ignores dismissal requests until the owner changes open', () => {
    const changed = cy.stub().as('changed');
    const Controlled = () => {
      const [open, setOpen] = React.useState(true);
      return (
        <>
          <button data-testid="close" onClick={() => setOpen(false)}>
            Close
          </button>
          <Fixture picker={{ open, onOpenChange: changed }} />
        </>
      );
    };
    render(<Controlled />);
    cy.get(input).realClick();
    cy.realPress('Escape');
    cy.get('@changed').its('lastCall.args.1').should('include', { open: false, type: 'keydown' });
    cy.get(list).should('be.visible');
    cy.get('[data-testid="close"]').realClick();
    cy.get(list).should('not.exist');
  });

  it('U11 list selection props do not replace parent picker selection ownership', () => {
    const selected = cy.stub().as('selected');
    const listSelected = cy.stub().as('listSelected');
    render(
      <Fixture
        picker={{ selectedOptions: ['alpha'], onOptionSelect: selected, open: true }}
        listProps={{ selectedOptions: ['beta'], onOptionSelect: listSelected }}
      />,
    );
    cy.get(beta).realClick();
    cy.get('@selected').its('firstCall.args.1.selectedOptions').should('deep.equal', ['alpha', 'beta']);
    cy.get('@listSelected').should('not.have.been.called');
    cy.get(alpha).realClick();
    cy.get('@selected').its('lastCall.args.1.selectedOptions').should('deep.equal', ['alpha']);
    cy.get(list).should('be.visible');
  });

  it('U12 uncontrolled picker selection accumulates while repeated selected choices stay selected', () => {
    const selected = cy.stub().as('selected');
    render(<Fixture picker={{ defaultSelectedOptions: ['alpha'], onOptionSelect: selected, open: true }} />);
    cy.get(beta).realClick();
    cy.get('@selected').its('firstCall.args.1.selectedOptions').should('deep.equal', ['alpha', 'beta']);
    cy.get(beta).realClick();
    cy.get('@selected').its('lastCall.args.1.selectedOptions').should('deep.equal', ['alpha', 'beta']);
  });

  it('U13 changing option IDs and values unregisters old data and selects current registry data', () => {
    const selected = cy.stub().as('selected');
    let lookup: TagPickerContextValue['getOptionById'] = () => undefined;
    render(<DynamicFixture selected={selected} ready={next => (lookup = next)} />);
    cy.get(input).realClick();
    cy.then(() => expect(lookup('dynamic-alpha-0')).to.include({ value: 'alpha-0', text: 'alpha revision 0' }));
    cy.get('[data-testid="revise"]').realClick();
    cy.get('#dynamic-alpha-1').should('be.visible');
    active('dynamic-alpha-1');
    cy.then(() => {
      expect(lookup('dynamic-alpha-0')).to.equal(undefined);
      expect(lookup('dynamic-alpha-1')).to.include({ value: 'alpha-1', text: 'alpha revision 1' });
    });
    cy.realPress('Home');
    active('dynamic-alpha-1');
    cy.realPress('Enter');
    cy.get('@selected').its('lastCall.args.1.selectedOptions').should('deep.equal', ['alpha-1']);
  });

  it('U14 emptying and repopulating dynamic children cleans registry and restores a valid active option', () => {
    const selected = cy.stub().as('selected');
    let lookup: TagPickerContextValue['getOptionById'] = () => undefined;
    render(<DynamicFixture selected={selected} ready={next => (lookup = next)} />);
    cy.get(input).realClick();
    active('dynamic-alpha-0');
    cy.get('[data-testid="empty"]').realClick();
    cy.get(`${list} [role="option"]`).should('not.exist');
    cy.then(() => expect(lookup('dynamic-alpha-0')).to.equal(undefined));
    cy.realPress('Enter');
    cy.get('@selected').should('not.have.been.called');
    cy.get('[data-testid="empty"]').realClick();
    cy.get(`${list} [role="option"]`).should('have.length', 2);
    active('dynamic-alpha-0');
    cy.realPress('Enter');
    cy.get('@selected').its('firstCall.args.1.selectedOptions').should('deep.equal', ['alpha-0']);
  });

  it('U15 reordered stable children navigate in current DOM order rather than registration order', () => {
    const selected = cy.stub().as('selected');
    render(<DynamicFixture selected={selected} ready={() => undefined} />);
    cy.get(input).realClick();
    cy.get('[data-testid="reverse"]').realClick();
    cy.get(`${list} [role="option"]`).first().should('have.id', 'dynamic-beta-0');
    cy.realPress('Home');
    active('dynamic-beta-0');
    cy.realPress('ArrowDown');
    active('dynamic-alpha-0');
    cy.realPress('Enter');
    cy.get('@selected').its('lastCall.args.1.value').should('equal', 'alpha-0');
  });

  it('U16 two real picker lists have unique IDs and isolated selection registries', () => {
    const first = cy.stub().as('first');
    const second = cy.stub().as('second');
    render(
      <>
        <Fixture picker={{ open: true, onOptionSelect: first }}>
          <TagPickerOption id="first-choice" value="first">
            First
          </TagPickerOption>
        </Fixture>
        <Fixture picker={{ open: true, onOptionSelect: second }}>
          <TagPickerOption id="second-choice" value="second">
            Second
          </TagPickerOption>
        </Fixture>
      </>,
    );
    cy.get(list).then($lists => expect($lists[0].id).not.to.equal($lists[1].id));
    cy.get(input).last().realClick();
    cy.realPress('Enter');
    cy.get('@second').its('firstCall.args.1.selectedOptions').should('deep.equal', ['second']);
    cy.get('@first').should('not.have.been.called');
    cy.get(input).first().realClick();
    cy.realPress('Enter');
    cy.get('@first').its('firstCall.args.1.selectedOptions').should('deep.equal', ['first']);
  });

  it('U17 known boundary removing every active child leaves a stale active-descendant attribute', () => {
    const selected = cy.stub().as('selected');
    render(<DynamicFixture selected={selected} ready={() => undefined} />);
    cy.get(input).realClick();
    active('dynamic-alpha-0');
    cy.get('[data-testid="empty"]').realClick();
    cy.get(list).should('be.visible');
    cy.get(`${list} [role="option"]`).should('not.exist');
    cy.get(input).should('have.attr', 'aria-activedescendant', 'dynamic-alpha-0');
    cy.get(input).then($input => {
      expect($input[0].ownerDocument.getElementById($input.attr('aria-activedescendant')!)).to.equal(null);
    });
    cy.realPress('Enter');
    cy.get('@selected').should('not.have.been.called');
    cy.get('[data-testid="empty"]').realClick();
    active('dynamic-alpha-0');
  });

  it('U18 native focus blur and key handlers run when the consumer opts into list tab order', () => {
    const seen: string[] = [];
    render(
      <TagPickerContextProvider value={{ ...tagPickerContextDefaultValue, open: true }}>
        <button data-testid="before">Before</button>
        <TagPickerList
          data-testid="list"
          tabIndex={0}
          onFocus={() => seen.push('focus')}
          onBlur={() => seen.push('blur')}
          onKeyDown={event => seen.push(event.key)}
        >
          Plain list content
        </TagPickerList>
        <button data-testid="after">After</button>
      </TagPickerContextProvider>,
    );
    cy.get('[data-testid="before"]').realClick();
    cy.realPress('Tab');
    cy.get(list).should('be.focused');
    cy.realPress('Escape');
    cy.get(list).should('be.visible').and('be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.then(() => expect(seen).to.deep.equal(['focus', 'Escape', 'Tab', 'blur']));
  });

  it('U19 inherited multiselect=false changes option semantics but not parent selection ownership', () => {
    const selected = cy.stub().as('selected');
    render(
      <Fixture
        picker={{ open: true, selectedOptions: ['alpha'], onOptionSelect: selected }}
        listProps={{ multiselect: false }}
      />,
    );
    cy.get(alpha).should('have.attr', 'aria-selected', 'true');
    cy.get(beta).should('have.attr', 'aria-selected', 'false');
    cy.get(beta).realClick();
    cy.get('@selected').its('firstCall.args.1.selectedOptions').should('deep.equal', ['alpha', 'beta']);
    cy.get(alpha).should('have.attr', 'aria-selected', 'true');
    cy.get(beta).should('have.attr', 'aria-selected', 'false');
  });

  it('U20 rerendered picker callbacks receive latest selection and close-request closures', () => {
    const seen: string[] = [];
    const LatestPicker = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button
            data-testid="revise"
            onMouseDown={event => event.preventDefault()}
            onClick={() => setVersion(v => v + 1)}
          >
            Revise
          </button>
          <Fixture
            picker={{
              open: true,
              onOptionSelect: (_, data) => seen.push(`select-${version}:${data.value}`),
              onOpenChange: (_, data) => seen.push(`open-${version}:${data.open}`),
            }}
          />
        </>
      );
    };
    render(<LatestPicker />);
    cy.get(alpha).realClick();
    cy.then(() => expect(seen).to.deep.equal(['select-0:alpha', 'open-0:false']));
    cy.get('[data-testid="revise"]').realClick();
    cy.get(beta).realClick();
    cy.then(() => expect(seen).to.deep.equal(['select-0:alpha', 'open-0:false', 'select-1:beta', 'open-1:false']));
    cy.realPress('Escape');
    cy.then(() => expect(seen[seen.length - 1]).to.equal('open-1:false'));
  });
});
