import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/dom';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { useHasParentContext } from '@fluentui/react-context-selector';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuItemCheckbox,
  MenuItemRadio,
  renderMenuList_unstable,
  useMenuList_unstable,
  useMenuListBase_unstable,
  useMenuListStyles_unstable,
  useMenuListContextValues_unstable,
  useMenuListContext_unstable,
} from '@fluentui/react-menu';
import type { MenuListProps, MenuProps, MenuCheckedValueChangeData, MenuListState } from '@fluentui/react-menu';
import { MenuListContext } from '../../contexts/menuListContext';
import { useMenuListTestStyles } from './MenuListTestStyles.styles';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const Popup = ({
  children,
  list = {},
  ...menu
}: { children: React.ReactNode; list?: MenuListProps } & Pick<
  MenuProps,
  | 'hasIcons'
  | 'hasCheckmarks'
  | 'checkedValues'
  | 'defaultCheckedValues'
  | 'onCheckedValueChange'
  | 'persistOnItemClick'
>) => (
  <Menu {...menu}>
    <MenuTrigger disableButtonEnhancement>
      <button data-testid="trigger">Commands</button>
    </MenuTrigger>
    <MenuPopover id="popover">
      <MenuList id="list" {...list}>
        {children}
      </MenuList>
    </MenuPopover>
  </Menu>
);
const trigger = '[data-testid="trigger"]';
const preferences = '[data-testid="preferences"]';
const open = () => {
  cy.get(trigger).realClick();
  cy.get('#popover').should('be.visible');
};
const activate = (id: string, method: 'pointer' | 'Enter' | 'Space') => {
  if (method === 'pointer') {
    cy.get(id).realClick();
  } else {
    cy.get(id).realHover().should('be.focused');
    cy.realPress(method);
  }
};
const checked = (id: string, value: boolean) => cy.get(id).should('have.attr', 'aria-checked', String(value));
const Submenu = () => (
  <Menu>
    <MenuTrigger disableButtonEnhancement>
      <MenuItem data-testid="preferences">Preferences</MenuItem>
    </MenuTrigger>
    <MenuPopover id="submenu">
      <MenuList id="sublist">
        <MenuItem id="subfirst">Color</MenuItem>
        <MenuItem id="sublast">Theme</MenuItem>
      </MenuList>
    </MenuPopover>
  </Menu>
);

describe('MenuList direct documented scenarios', () => {
  it('navigates the permanent list using native hover arrows Home End and a single tab stop', () => {
    mount(
      <>
        <button id="before">Before</button>
        <MenuList id="list" aria-label="Editing">
          <MenuItem id="cut">Cut</MenuItem>
          <MenuItem id="paste">Paste</MenuItem>
          <MenuItem id="edit">Edit</MenuItem>
        </MenuList>
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').realClick();
    cy.realPress('Tab');
    cy.get('#cut').should('be.focused');
    cy.get('#list').should($list => {
      expect(getByRole($list[0].parentElement!, 'menu', { name: 'Editing' })).to.equal($list[0]);
      expect(getByRole($list[0], 'menuitem', { name: 'Cut' })).to.equal($list[0].querySelector('#cut'));
    });
    cy.realPress('ArrowDown');
    cy.get('#paste').should('be.focused');
    cy.realPress('End');
    cy.get('#edit').should('be.focused');
    cy.realPress('ArrowDown');
    cy.get('#cut').should('be.focused');
    cy.realPress('ArrowUp');
    cy.get('#edit').should('be.focused');
    cy.realPress('Home');
    cy.get('#cut').should('be.focused');
    cy.get('#paste').realHover().should('be.focused');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#paste').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#before').should('be.focused');
  });
});

describe('MenuList meaningful unit-derived browser contracts', () => {
  it('matches the default snapshot semantics styles and live child context', () => {
    const Probe = () => {
      const present = useHasParentContext(MenuListContext);
      const value = useMenuListContext_unstable(context => ({
        checkedValues: context.checkedValues,
        hasIcons: context.hasIcons,
        hasCheckmarks: context.hasCheckmarks,
      }));
      return <output id="context">{JSON.stringify({ present, ...value })}</output>;
    };
    mount(
      <MenuList id="list">
        <span>Default MenuList</span>
        <Probe />
      </MenuList>,
    );
    cy.get('#list')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'menu')
      .and('have.class', 'fui-MenuList')
      .and('have.css', 'display', 'flex')
      .and('have.css', 'flex-direction', 'column')
      .and('have.css', 'gap', '2px')
      .should($list => {
        const raw = $list[0].getAttribute('data-tabster');
        expect(raw).not.to.equal(null);
        expect(JSON.parse(raw!).mover).to.deep.equal({ cyclic: true, direction: 1, memorizeCurrent: true });
      });
    cy.get('#context').should(
      'have.text',
      '{"present":true,"checkedValues":{},"hasIcons":false,"hasCheckmarks":false}',
    );
  });

  for (const [name, initial, expected] of [
    ['check empty group', [], ['copy']],
    ['append to existing group', ['cut'], ['cut', 'copy']],
    ['uncheck only value', ['copy'], []],
    ['uncheck second value', ['cut', 'copy'], ['cut']],
  ] as const) {
    it(`implements the unit-derived checkbox path ${name} without mutating caller values`, () => {
      const initialValues = { edit: [...initial], unrelated: ['retained'] };
      const before = JSON.stringify(initialValues);
      const changes: MenuCheckedValueChangeData[] = [];
      mount(
        <MenuList defaultCheckedValues={initialValues} onCheckedValueChange={(_, data) => changes.push(data)}>
          <MenuItemCheckbox id="copy" name="edit" value="copy">
            Copy
          </MenuItemCheckbox>
          <MenuItemCheckbox id="cut" name="edit" value="cut">
            Cut
          </MenuItemCheckbox>
          <MenuItemCheckbox id="unrelated" name="unrelated" value="retained">
            Retained
          </MenuItemCheckbox>
        </MenuList>,
      );
      checked(
        '#copy',
        initial.some(value => value === 'copy'),
      );
      cy.get('#copy').realClick();
      checked(
        '#copy',
        expected.some(value => value === 'copy'),
      );
      checked(
        '#cut',
        expected.some(value => value === 'cut'),
      );
      checked('#unrelated', true);
      cy.then(() => {
        expect(changes).to.deep.equal([{ name: 'edit', checkedItems: [...expected] }]);
        expect(JSON.stringify(initialValues)).to.equal(before);
      });
    });
  }

  for (const initial of [[], ['arial'], ['calibri']]) {
    it(`implements the unit-derived radio path from ${JSON.stringify(initial)} without changing other groups`, () => {
      const initialValues = { font: initial, unrelated: ['retained'] };
      const before = JSON.stringify(initialValues);
      const changes: MenuCheckedValueChangeData[] = [];
      mount(
        <MenuList defaultCheckedValues={initialValues} onCheckedValueChange={(_, data) => changes.push(data)}>
          <MenuItemRadio id="arial" name="font" value="arial">
            Arial
          </MenuItemRadio>
          <MenuItemRadio id="calibri" name="font" value="calibri">
            Calibri
          </MenuItemRadio>
          <MenuItemCheckbox id="unrelated" name="unrelated" value="retained">
            Retained
          </MenuItemCheckbox>
        </MenuList>,
      );
      cy.get('#arial').realHover().should('be.focused');
      cy.realPress('Enter');
      checked('#arial', true);
      checked('#calibri', false);
      checked('#unrelated', true);
      cy.then(() => {
        expect(changes).to.deep.equal([{ name: 'font', checkedItems: ['arial'] }]);
        expect(JSON.stringify(initialValues)).to.equal(before);
      });
    });
  }

  it('gives controlled values precedence over defaults while retaining caller ownership', () => {
    const change = cy.stub().as('controlledChange');
    mount(
      <MenuList
        checkedValues={{ edit: ['paste'] }}
        defaultCheckedValues={{ edit: ['cut'] }}
        onCheckedValueChange={change}
      >
        <MenuItemCheckbox id="cut" name="edit" value="cut">
          Cut
        </MenuItemCheckbox>
        <MenuItemCheckbox id="paste" name="edit" value="paste">
          Paste
        </MenuItemCheckbox>
      </MenuList>,
    );
    checked('#cut', false);
    checked('#paste', true);
    cy.get('#cut').realClick();
    checked('#cut', false);
    checked('#paste', true);
    cy.get('@controlledChange')
      .should('have.been.calledOnce')
      .its('firstCall.args.1')
      .should('deep.equal', { name: 'edit', checkedItems: ['paste', 'cut'] });
  });

  it('updates the provider child context for flags and selection and isolates separate lists', () => {
    const Probe = () => {
      const values = useMenuListContext_unstable(context => ({
        checkedValues: context.checkedValues,
        hasIcons: context.hasIcons,
        hasCheckmarks: context.hasCheckmarks,
      }));
      return <output id="context">{JSON.stringify(values)}</output>;
    };
    const Updating = () => {
      const [flags, setFlags] = React.useState(false);
      return (
        <>
          <button id="flags" onClick={() => setFlags(true)}>
            Update flags
          </button>
          <MenuList hasIcons={flags} hasCheckmarks={flags}>
            <MenuItemCheckbox id="copy" name="edit" value="copy">
              Copy
            </MenuItemCheckbox>
            <MenuItemRadio id="arial" name="font" value="arial">
              Arial
            </MenuItemRadio>
            <Probe />
          </MenuList>
          <MenuList>
            <MenuItemCheckbox id="isolated" name="edit" value="copy">
              Isolated copy
            </MenuItemCheckbox>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#context').should('have.text', '{"checkedValues":{},"hasIcons":false,"hasCheckmarks":false}');
    cy.get('#copy').realClick();
    cy.get('#arial').realClick();
    cy.get('#flags').realClick();
    cy.get('#context').should(
      'have.text',
      '{"checkedValues":{"edit":["copy"],"font":["arial"]},"hasIcons":true,"hasCheckmarks":true}',
    );
    checked('#isolated', false);
    cy.get('#isolated').realClick();
    checked('#isolated', true);
    checked('#copy', true);
  });

  it('clears object refs on unmount and reattaches them to a new live list', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Updating = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button id="toggle" onClick={() => setShown(value => !value)}>
            Toggle
          </button>
          {shown && (
            <MenuList id="list" ref={ref}>
              <MenuItem id="item">Action</MenuItem>
            </MenuList>
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#list').should($list => expect(ref.current).to.equal($list[0]));
    cy.get('#toggle').realClick();
    cy.get('#list').should('not.exist');
    cy.then(() => expect(ref.current).to.equal(null));
    cy.get('#toggle').realClick();
    cy.get('#list').should($list => expect(ref.current).to.equal($list[0]));
    cy.realPress('Tab');
    cy.get('#item').should('be.focused');
  });

  it('detaches replaced callback refs and clears the current ref on unmount', () => {
    const first = cy.stub();
    const second = cy.stub();
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance" onClick={() => setPhase(value => value + 1)}>
            Advance
          </button>
          {phase < 2 && (
            <MenuList id="list" ref={phase === 0 ? first : second}>
              <MenuItem>Action</MenuItem>
            </MenuList>
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#list').should($list => expect(first.lastCall.args[0]).to.equal($list[0]));
    cy.get('#advance').realClick();
    cy.get('#list').should($list => {
      expect(first.lastCall.args[0]).to.equal(null);
      expect(second.lastCall.args[0]).to.equal($list[0]);
    });
    cy.get('#advance').realClick();
    cy.get('#list').should('not.exist');
    cy.then(() => expect(second.lastCall.args[0]).to.equal(null));
  });

  it('supports a typed root slot render function with child selection and live keyboard search', () => {
    const ref = React.createRef<HTMLDivElement>();
    const changed = cy.stub().as('slotSelection');
    const renderRoot: SlotRenderFunction<MenuListState['root']> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <MenuItem id="alpha">Alpha</MenuItem>
        <MenuItemCheckbox id="beta" name="edit" value="beta">
          Beta
        </MenuItemCheckbox>
      </Component>
    );
    mount(
      <MenuList id="list" ref={ref} aria-label="Rendered commands" onCheckedValueChange={changed}>
        {renderRoot}
      </MenuList>,
    );
    cy.get('#list')
      .should('have.attr', 'data-rendered', 'true')
      .and('have.class', 'fui-MenuList')
      .should($list => {
        expect(ref.current).to.equal($list[0]);
        expect(getByRole($list[0].parentElement!, 'menu', { name: 'Rendered commands' })).to.equal($list[0]);
      });
    cy.get('#alpha').realHover();
    cy.realPress('b');
    cy.get('#beta').should('be.focused');
    cy.realPress('Space');
    checked('#beta', true);
    cy.get('@slotSelection')
      .should('have.been.calledOnce')
      .its('firstCall.args.1')
      .should('deep.equal', { name: 'edit', checkedItems: ['beta'] });
  });

  for (const base of [false, true]) {
    it(`supports typed ${base ? 'Tabster-free base' : 'full'} hook context style render recomposition`, () => {
      const useList = base ? useMenuListBase_unstable : useMenuList_unstable;
      const Recombined = React.forwardRef<HTMLElement, MenuListProps>((props, ref) => {
        const state = useList(props, ref);
        const contexts = useMenuListContextValues_unstable(state);
        useMenuListStyles_unstable(state);
        state.root.title = 'Recomposed list';
        return renderMenuList_unstable(state, contexts);
      });
      const ref = React.createRef<HTMLElement>();
      const changed = cy.stub().as('recomposedSelection');
      mount(
        <Recombined id="list" ref={ref} aria-label="Recomposed commands" onCheckedValueChange={changed}>
          <MenuItem id="alpha">Alpha</MenuItem>
          <MenuItemCheckbox id="beta" name="edit" value="beta">
            Beta
          </MenuItemCheckbox>
        </Recombined>,
      );
      cy.get('#list')
        .should('have.attr', 'title', 'Recomposed list')
        .and('have.class', 'fui-MenuList')
        .should($list => {
          expect(ref.current).to.equal($list[0]);
          expect($list[0].hasAttribute('data-tabster')).to.equal(!base);
        });
      cy.get('#alpha').realHover().should('be.focused');
      cy.realPress('b');
      cy.get('#beta').should('be.focused');
      cy.realPress('Enter');
      checked('#beta', true);
      cy.get('@recomposedSelection')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { name: 'edit', checkedItems: ['beta'] });
      cy.realPress('ArrowUp');
      cy.get(base ? '#beta' : '#alpha').should('be.focused');
    });
  }

  it('allows caller classes to override list styles and restores defaults after removal', () => {
    const Updating = () => {
      const styles = useMenuListTestStyles();
      const [custom, setCustom] = React.useState(true);
      return (
        <MenuList id="list" className={custom ? styles.root : undefined} data-owner="caller">
          <MenuItem id="reset" onClick={() => setCustom(false)}>
            Reset
          </MenuItem>
          <MenuItem id="next">Next</MenuItem>
        </MenuList>
      );
    };
    mount(<Updating />);
    cy.get('#list').should('have.css', 'gap', teamsLightTheme.spacingVerticalL);
    cy.get('#reset').realClick();
    cy.get('#list').should('have.css', 'gap', '2px').and('have.attr', 'data-owner', 'caller');
    cy.realPress('ArrowDown');
    cy.get('#next').should('be.focused');
  });

  it('applies and removes provider style hooks without losing inline width refs or navigation', () => {
    const ref = React.createRef<HTMLDivElement>();
    const customStyle = (state: unknown) => {
      const list = state as MenuListState;
      list.root.style = { ...list.root.style, gap: teamsLightTheme.spacingVerticalL };
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
                  useMenuListStyles_unstable: customStyle,
                }
              : {}
          }
        >
          <MenuList id="list" ref={ref} style={{ width: '280px' }}>
            <MenuItem id="reset" onClick={() => setCustom(false)}>
              Reset
            </MenuItem>
            <MenuItem id="next">Next</MenuItem>
          </MenuList>
        </FluentProvider>
      );
    };
    mountBase(<Updating />);
    cy.get('#list')
      .should('have.css', 'gap', teamsLightTheme.spacingVerticalL)
      .and('have.css', 'width', '280px')
      .should($list => expect(ref.current).to.equal($list[0]));
    cy.get('#reset').realClick().should('be.focused');
    cy.get('#list')
      .should('have.css', 'gap', '2px')
      .and('have.css', 'width', '280px')
      .should($list => expect(ref.current).to.equal($list[0]));
    cy.realPress('ArrowDown');
    cy.get('#next').should('be.focused');
  });
});
describe('MenuList supported keyboard selection and native accessibility edges', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    it(`cycles typeahead across all selectable roles ignores case and preserves focus on no match in ${dir}`, () => {
      mount(
        <MenuList id="list" aria-label="Search">
          <MenuItem id="alpha">Alpha</MenuItem>
          <MenuItemCheckbox id="amber" name="choice" value="amber">
            Amber
          </MenuItemCheckbox>
          <MenuItemRadio id="azure" name="color" value="azure">
            Azure
          </MenuItemRadio>
          <MenuItem id="beta">BETA</MenuItem>
          <MenuItem id="gamma">Gamma</MenuItem>
        </MenuList>,
        dir,
      );
      cy.get('#alpha').realHover().should('be.focused');
      cy.realPress('a');
      cy.get('#amber').should('be.focused');
      cy.realPress('A');
      cy.get('#azure').should('be.focused');
      cy.realPress('a');
      cy.get('#alpha').should('be.focused');
      cy.realPress('b');
      cy.get('#beta').should('be.focused');
      cy.realPress('z');
      cy.get('#beta').should('be.focused');
      cy.realPress('ArrowDown');
      cy.get('#gamma').should('be.focused');
      cy.realPress('ArrowDown');
      cy.get('#alpha').should('be.focused');
      cy.realPress('End');
      cy.get('#gamma').should('be.focused');
      cy.realPress('Home');
      cy.get('#alpha').should('be.focused');
    });
  }

  for (const backwards of [false, true]) {
    it(`lets the popup handle ${
      backwards ? 'Shift+Tab' : 'Tab'
    } and removes its navigation listener after close`, () => {
      mount(
        <>
          <button id="before">Before</button>
          <Popup>
            <MenuItem id="first">First</MenuItem>
            <MenuItem id="last">Last</MenuItem>
          </Popup>
          <button id="after">After</button>
        </>,
      );
      open();
      cy.get('#first').should('be.focused');
      cy.realPress(backwards ? ['Shift', 'Tab'] : 'Tab');
      cy.get('#popover').should('not.exist');
      cy.get(backwards ? '#before' : '#after').should('be.focused');
      open();
      cy.get('#first').should('be.focused');
      cy.realPress('Escape');
      cy.get('#popover').should('not.exist');
      cy.get(trigger).should('be.focused');
      cy.realPress('Tab');
      cy.get('#after').should('be.focused');
    });
  }

  it('uses the generated trigger as computed popup menu name and honors explicit accessible overrides', () => {
    const Updating = () => {
      const [custom, setCustom] = React.useState(false);
      return (
        <>
          <span id="description">Available commands</span>
          <button id="update" onClick={() => setCustom(value => !value)}>
            Update label
          </button>
          <Popup
            list={{
              ...(custom ? { 'aria-labelledby': undefined, 'aria-label': 'Custom commands' } : {}),
              'aria-describedby': 'description',
            }}
          >
            <MenuItem>Run</MenuItem>
          </Popup>
        </>
      );
    };
    mount(<Updating />);
    open();
    cy.get('#list').should($list =>
      expect(
        getByRole($list[0].ownerDocument.body, 'menu', { name: 'Commands', description: 'Available commands' }),
      ).to.equal($list[0]),
    );
    cy.realPress('Escape');
    cy.get('#update').realClick();
    open();
    cy.get('#list').should($list =>
      expect(
        getByRole($list[0].ownerDocument.body, 'menu', { name: 'Custom commands', description: 'Available commands' }),
      ).to.equal($list[0]),
    );
    cy.realPress('Escape');
  });

  for (const allDisabled of [false, true]) {
    it(`keeps ${allDisabled ? 'all' : 'individual'} disabled actions navigable but inactive`, () => {
      const action = cy.stub().as('disabledAction');
      mount(
        <>
          <button id="before">Before</button>
          <MenuList id="list">
            <MenuItem id="first" disabled={allDisabled} onClick={action}>
              Alpha
            </MenuItem>
            <MenuItem id="disabled" disabled onClick={action}>
              Beta
            </MenuItem>
            <MenuItemCheckbox id="check" disabled name="edit" value="copy" onClick={action}>
              Copy
            </MenuItemCheckbox>
          </MenuList>
          <button id="after">After</button>
        </>,
      );
      cy.get('#before').realClick();
      cy.realPress('Tab');
      cy.get('#first').should('be.focused');
      cy.realPress('ArrowDown');
      cy.get('#disabled').should('be.focused').and('have.attr', 'aria-disabled', 'true');
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('#disabled').realClick();
      cy.realPress('c');
      cy.get('#check').should('be.focused');
      cy.realPress('Enter');
      checked('#check', false);
      cy.get('@disabledAction').should('not.have.been.called');
      cy.realPress('Tab');
      cy.get('#after').should('be.focused');
    });
  }

  for (const [name, children, text] of [
    ['omitted', undefined, ''],
    ['null', null, ''],
    ['zero', 0, '0'],
  ] as const) {
    it(`handles ${name} children as a native menu without inserting focusable actions`, () => {
      mount(
        <>
          <button id="before">Before</button>
          <MenuList id="list">{children}</MenuList>
          <button id="after">After</button>
        </>,
      );
      cy.get('#list').should('have.text', text).and('have.attr', 'role', 'menu').and('have.prop', 'tagName', 'DIV');
      cy.get('#before').realClick();
      cy.realPress('Tab');
      cy.get('#after').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#before').should('be.focused');
    });
  }

  it('searches only recognized menu roles and focusable visible children through groups and fragments', () => {
    mount(
      <MenuList id="list">
        <MenuItem id="alpha">Alpha</MenuItem>
        <>
          <div role="group">
            <MenuItem id="beta">Beta</MenuItem>
          </div>
          <span>Decorative text</span>
        </>
        <button id="foreign">Bravo non-menu control</button>
        <button id="custom" role="menuitem">
          Charlie custom action
        </button>
        <MenuItem id="hidden-item" style={{ display: 'none' }}>
          Delta hidden
        </MenuItem>
        <MenuItem id="last">Echo</MenuItem>
      </MenuList>,
    );
    cy.get('#alpha').realHover().should('be.focused');
    cy.realPress('b');
    cy.get('#beta').should('be.focused');
    cy.realPress('b');
    cy.get('#beta').should('be.focused');
    cy.realPress('c');
    cy.get('#custom').should('be.focused');
    cy.get('#beta').realHover().should('be.focused');
    cy.realPress('d');
    cy.get('#beta').should('be.focused');
    cy.realPress('e');
    cy.get('#last').should('be.focused');
    cy.realPress('ArrowUp');
    cy.get('#custom').should('be.focused');
    cy.realPress('ArrowUp');
    cy.get('#foreign').should('be.focused');
  });

  it('follows dynamic child order and replacement for keyboard and first-character navigation', () => {
    const Updating = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <MenuList id="list">
            {updated ? (
              <>
                <MenuItem id="new" key="new">
                  Zulu
                </MenuItem>
                <MenuItem id="beta" key="beta">
                  Delta
                </MenuItem>
                <MenuItem id="alpha" key="alpha">
                  Alpha
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem id="alpha" key="alpha">
                  Alpha
                </MenuItem>
                <MenuItem id="beta" key="beta">
                  Beta
                </MenuItem>
                <MenuItem id="removed" key="removed">
                  Removed
                </MenuItem>
              </>
            )}
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#alpha').realHover();
    cy.realPress('ArrowDown');
    cy.get('#beta').should('be.focused');
    cy.get('#update').realClick();
    cy.get('#removed').should('not.exist');
    cy.get('#beta').realHover();
    cy.realPress('Home');
    cy.get('#new').should('be.focused');
    cy.realPress('ArrowDown');
    cy.get('#beta').should('be.focused').and('have.text', 'Delta');
    cy.realPress('a');
    cy.get('#alpha').should('be.focused');
    cy.realPress('d');
    cy.get('#beta').should('be.focused').and('have.text', 'Delta');
    cy.realPress('a');
    cy.get('#alpha').should('be.focused');
    cy.realPress('b');
    cy.get('#alpha').should('be.focused');
    cy.realPress('z');
    cy.get('#new').should('be.focused');
  });

  it('forwards explicit div native props and cleans removed role name description and handlers', () => {
    const keys: string[] = [];
    const clicks: string[] = [];
    const bubbled: boolean[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <div onKeyDown={event => bubbled.push(event.defaultPrevented)}>
          <span id="description">List description</span>
          <button id="update" onClick={() => setPhase(value => value + 1)}>
            Update
          </button>
          <MenuList
            as="div"
            id="list"
            role={phase < 2 ? 'group' : undefined}
            aria-label={phase < 2 ? 'Native actions' : undefined}
            aria-describedby={phase < 2 ? 'description' : undefined}
            title={phase < 2 ? 'Commands' : undefined}
            lang="fr"
            dir="rtl"
            data-owner="caller"
            onClick={phase < 2 ? () => clicks.push(String(phase)) : undefined}
            onKeyDown={
              phase < 2
                ? event => {
                    if (event.key === 'Enter') {
                      keys.push(String(phase));
                      event.preventDefault();
                    }
                  }
                : undefined
            }
          >
            <button id="item">Action</button>
          </MenuList>
        </div>
      );
    };
    mount(<Updating />);
    cy.get('#list')
      .should('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-owner', 'caller')
      .should($list =>
        expect(
          getByRole($list[0].parentElement!, 'group', { name: 'Native actions', description: 'List description' }),
        ).to.equal($list[0]),
      );
    cy.get('#item').realClick();
    cy.realPress('Enter');
    cy.get('#update').realClick();
    cy.get('#item').realClick();
    cy.realPress('Enter');
    cy.get('#update').realClick();
    cy.get('#list').should($list => {
      for (const attribute of ['role', 'aria-label', 'aria-describedby', 'title']) {
        expect($list[0].hasAttribute(attribute), attribute).to.equal(false);
      }
    });
    cy.get('#item').realClick();
    cy.realPress('Enter');
    cy.then(() => {
      expect(keys).to.deep.equal(['0', '1']);
      expect(clicks).to.deep.equal(['0', '1']);
      expect(bubbled).to.deep.equal([true, true, false]);
    });
  });

  it('honors native hidden and restores the one-stop keyboard group after unhiding', () => {
    const Updating = () => {
      const [hidden, setHidden] = React.useState(true);
      return (
        <>
          <button id="toggle" onClick={() => setHidden(value => !value)}>
            Toggle
          </button>
          <MenuList id="list" hidden={hidden}>
            <MenuItem id="item">Action</MenuItem>
          </MenuList>
          <button id="after">After</button>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#list').should('have.attr', 'hidden');
    cy.get('#list').should('not.be.visible');
    cy.get('#toggle').realClick();
    cy.realPress('Tab');
    cy.get('#item').should('be.focused');
    cy.get('#list').should('not.have.attr', 'hidden');
    cy.get('#toggle').realClick();
    cy.get('#list').should('not.be.visible');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
  });

  it('retains initial default values after defaults change and clears controlled values on external update', () => {
    const Updating = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <MenuList id="defaults" defaultCheckedValues={{ edit: updated ? ['paste'] : ['cut'] }}>
            <MenuItemCheckbox id="default-cut" name="edit" value="cut">
              Cut
            </MenuItemCheckbox>
            <MenuItemCheckbox id="default-paste" name="edit" value="paste">
              Paste
            </MenuItemCheckbox>
          </MenuList>
          <MenuList id="controlled" checkedValues={updated ? {} : { edit: ['cut'] }}>
            <MenuItemCheckbox id="controlled-cut" name="edit" value="cut">
              Cut
            </MenuItemCheckbox>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    checked('#default-cut', true);
    checked('#default-paste', false);
    checked('#controlled-cut', true);
    cy.get('#controlled-cut').realClick();
    checked('#controlled-cut', true);
    cy.get('#update').realClick();
    checked('#default-cut', true);
    checked('#default-paste', false);
    checked('#controlled-cut', false);
  });

  it('uses the latest checked-value callback then updates uncontrolled state after callback removal', () => {
    const changes: string[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setPhase(value => value + 1)}>
            Update callback
          </button>
          <MenuList
            onCheckedValueChange={phase < 2 ? (_, data) => changes.push(`${phase}:${JSON.stringify(data)}`) : undefined}
          >
            <MenuItemCheckbox id="check" name="edit" value="copy">
              Copy
            </MenuItemCheckbox>
            <MenuItemRadio id="radio" name="font" value="arial">
              Arial
            </MenuItemRadio>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#check').realClick();
    checked('#check', true);
    cy.get('#radio').realClick();
    checked('#radio', true);
    cy.get('#update').realClick();
    cy.get('#check').realClick();
    checked('#check', false);
    cy.get('#radio').realClick();
    cy.get('#update').realClick();
    cy.get('#check').realClick();
    checked('#check', true);
    cy.get('#radio').realClick();
    checked('#radio', true);
    cy.then(() =>
      expect(changes).to.deep.equal([
        '0:{"name":"edit","checkedItems":["copy"]}',
        '0:{"name":"font","checkedItems":["arial"]}',
        '1:{"name":"edit","checkedItems":[]}',
        '1:{"name":"font","checkedItems":["arial"]}',
      ]),
    );
  });

  it('does not treat checked-value notification preventDefault as a controlled selection veto', () => {
    const changes: MenuCheckedValueChangeData[] = [];
    mount(
      <MenuList
        onCheckedValueChange={(event, data) => {
          event.preventDefault();
          changes.push(data);
        }}
      >
        <MenuItemCheckbox id="check" name="edit" value="copy">
          Copy
        </MenuItemCheckbox>
        <MenuItemRadio id="radio" name="font" value="arial">
          Arial
        </MenuItemRadio>
      </MenuList>,
    );
    cy.get('#check').realClick();
    checked('#check', true);
    cy.get('#radio').realClick();
    checked('#radio', true);
    cy.then(() =>
      expect(changes).to.deep.equal([
        { name: 'edit', checkedItems: ['copy'] },
        { name: 'font', checkedItems: ['arial'] },
      ]),
    );
  });

  it('inherits checked values and callback from Menu and updates all child roles', () => {
    const changes: MenuCheckedValueChangeData[] = [];
    mount(
      <Popup
        defaultCheckedValues={{ edit: ['cut'], font: ['arial'] }}
        onCheckedValueChange={(_, data) => changes.push(data)}
      >
        <MenuItemCheckbox id="cut" name="edit" value="cut">
          Cut
        </MenuItemCheckbox>
        <MenuItemCheckbox id="paste" name="edit" value="paste">
          Paste
        </MenuItemCheckbox>
        <MenuItemRadio id="arial" name="font" value="arial">
          Arial
        </MenuItemRadio>
        <MenuItemRadio id="calibri" name="font" value="calibri" persistOnClick>
          Calibri
        </MenuItemRadio>
      </Popup>,
    );
    open();
    checked('#cut', true);
    checked('#arial', true);
    cy.get('#paste').realClick();
    checked('#paste', true);
    checked('#cut', true);
    cy.get('#calibri').realClick();
    checked('#calibri', true);
    checked('#arial', false);
    checked('#paste', true);
    cy.then(() =>
      expect(changes).to.deep.equal([
        { name: 'edit', checkedItems: ['cut', 'paste'] },
        { name: 'font', checkedItems: ['calibri'] },
      ]),
    );
    cy.realPress('Escape');
    cy.get('#popover').should('not.exist');
  });

  it('gives explicit list checked values and callback precedence over Menu context', () => {
    const parent = cy.stub().as('parentChange');
    const own: MenuCheckedValueChangeData[] = [];
    const Updating = () => {
      const [values, setValues] = React.useState<Record<string, string[]>>({ edit: ['paste'] });
      return (
        <Popup
          checkedValues={{ edit: ['cut'] }}
          onCheckedValueChange={parent}
          list={{
            checkedValues: values,
            onCheckedValueChange: (_, data) => {
              own.push(data);
              setValues(current => ({ ...current, [data.name]: data.checkedItems }));
            },
          }}
        >
          <MenuItemCheckbox id="cut" name="edit" value="cut">
            Cut
          </MenuItemCheckbox>
          <MenuItemCheckbox id="paste" name="edit" value="paste">
            Paste
          </MenuItemCheckbox>
        </Popup>
      );
    };
    mount(<Updating />);
    open();
    checked('#cut', false);
    checked('#paste', true);
    cy.get('#cut').realClick();
    checked('#cut', true);
    checked('#paste', true);
    cy.get('@parentChange').should('not.have.been.called');
    cy.then(() => expect(own).to.deep.equal([{ name: 'edit', checkedItems: ['paste', 'cut'] }]));
    cy.realPress('Escape');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const hasIcons of [undefined, false, true] as const) {
      for (const hasCheckmarks of [undefined, false, true] as const) {
        it(`reserves real ${dir} item alignment for icons=${String(hasIcons)} checks=${String(hasCheckmarks)}`, () => {
          mount(
            <MenuList
              id="list"
              hasIcons={hasIcons}
              hasCheckmarks={hasCheckmarks}
              defaultCheckedValues={{ edit: ['checked'] }}
            >
              <MenuItem
                id="with-icon"
                icon={<svg aria-hidden="true" />}
                checkmark={hasCheckmarks ? <svg aria-hidden="true" /> : undefined}
              >
                With icon
              </MenuItem>
              <MenuItemCheckbox id="with-check" name="edit" value="checked">
                With checkmark
              </MenuItemCheckbox>
              <MenuItem id="plain">Plain</MenuItem>
            </MenuList>,
            dir,
          );
          cy.get('#plain .fui-MenuItem__icon').should(hasIcons ? 'exist' : 'not.exist');
          cy.get('#plain .fui-MenuItem__checkmark').should(hasCheckmarks ? 'exist' : 'not.exist');
          checked('#with-check', true);
          cy.get('#with-check .fui-MenuItem__checkmark').should('be.visible');
          cy.get('#list').should($list => {
            const root = $list[0];
            expect(root.hasAttribute('hasIcons')).to.equal(false);
            expect(root.hasAttribute('hasCheckmarks')).to.equal(false);
            const withIcon = root.querySelector('#with-icon .fui-MenuItem__content')!.getBoundingClientRect();
            const plain = root.querySelector('#plain .fui-MenuItem__content')!.getBoundingClientRect();
            const difference = dir === 'ltr' ? plain.left - withIcon.left : withIcon.right - plain.right;
            if (hasIcons) {
              expect(Math.abs(difference)).to.be.lessThan(1);
            } else {
              expect(Math.abs(difference)).to.be.greaterThan(20);
            }
            const withCheck = root.querySelector('#with-check .fui-MenuItem__content')!.getBoundingClientRect();
            const checkmark = root.querySelector('#with-check .fui-MenuItem__checkmark')!.getBoundingClientRect();
            expect(checkmark.width).to.be.greaterThan(0);
            const checkDifference = dir === 'ltr' ? plain.left - withCheck.left : withCheck.right - plain.right;
            if (hasCheckmarks) {
              const placeholder = root.querySelector('#plain .fui-MenuItem__checkmark')!.getBoundingClientRect();
              expect(placeholder.width).to.be.greaterThan(0);
              expect(Math.abs(placeholder.width - checkmark.width)).to.be.lessThan(1);
              expect(Math.abs(checkDifference)).to.be.lessThan(1);
            } else {
              const view = root.ownerDocument.defaultView!;
              const gap = parseFloat(view.getComputedStyle(root.querySelector('#with-check')!).columnGap);
              expect(Math.abs(Math.abs(checkDifference) - checkmark.width - gap)).to.be.lessThan(1);
            }
          });
        });
      }
    }
  }

  it('inherits alignment hints from Menu and explicit false overrides remove placeholder slots', () => {
    const Updating = () => {
      const [overridden, setOverridden] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setOverridden(true)}>
            Override
          </button>
          <Popup
            hasIcons
            hasCheckmarks
            list={{ hasIcons: overridden ? false : undefined, hasCheckmarks: overridden ? false : undefined }}
          >
            <MenuItem id="plain">Plain</MenuItem>
          </Popup>
        </>
      );
    };
    mount(<Updating />);
    open();
    cy.get('#plain .fui-MenuItem__icon').should('exist');
    cy.get('#plain .fui-MenuItem__checkmark').should('exist');
    cy.realPress('Escape');
    cy.get('#update').realClick();
    open();
    cy.get('#plain .fui-MenuItem__icon').should('not.exist');
    cy.get('#plain .fui-MenuItem__checkmark').should('not.exist');
    cy.realPress('Escape');
  });
});
describe('MenuList documented selection and submenus', () => {
  for (const kind of ['checkbox', 'radio'] as const) {
    for (const controlled of [false, true]) {
      for (const method of ['pointer', 'Enter', 'Space'] as const) {
        it(`updates documented ${controlled ? 'controlled' : 'uncontrolled'} ${kind} selection with ${method}`, () => {
          const changes: MenuCheckedValueChangeData[] = [];
          const Selectable = kind === 'checkbox' ? MenuItemCheckbox : MenuItemRadio;
          const Example = () => {
            const [values, setValues] = React.useState<Record<string, string[]>>({ edit: ['cut'] });
            return (
              <MenuList
                id="list"
                aria-label="Selection"
                checkedValues={controlled ? values : undefined}
                defaultCheckedValues={controlled ? undefined : { edit: ['cut'] }}
                onCheckedValueChange={(_, data) => {
                  changes.push(data);
                  if (controlled) {
                    setValues(current => ({ ...current, [data.name]: data.checkedItems }));
                  }
                }}
              >
                <Selectable id="cut" name="edit" value="cut">
                  Cut
                </Selectable>
                <Selectable id="paste" name="edit" value="paste">
                  Paste
                </Selectable>
                <Selectable id="other" name="other" value="x">
                  Other
                </Selectable>
              </MenuList>
            );
          };
          mount(<Example />);
          checked('#cut', true);
          checked('#paste', false);
          checked('#other', false);
          cy.get('#list').should($list =>
            expect(getByRole($list[0], `menuitem${kind}`, { name: 'Cut', checked: true })).to.equal(
              $list[0].querySelector('#cut'),
            ),
          );
          activate('#paste', method);
          checked('#paste', true);
          checked('#cut', kind === 'checkbox');
          activate('#other', method);
          checked('#other', true);
          checked('#paste', true);
          activate('#paste', method);
          checked('#paste', kind === 'radio');
          cy.then(() =>
            expect(changes).to.deep.equal([
              { name: 'edit', checkedItems: kind === 'checkbox' ? ['cut', 'paste'] : ['paste'] },
              { name: 'other', checkedItems: ['x'] },
              { name: 'edit', checkedItems: kind === 'checkbox' ? ['cut'] : ['paste'] },
            ]),
          );
        });
      }
    }
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`opens and closes the documented nested submenu with native ${dir} keys`, () => {
      mount(
        <MenuList id="list" aria-label="Permanent commands">
          <MenuItem id="first">Cut</MenuItem>
          <Submenu />
        </MenuList>,
        dir,
      );
      cy.get(preferences).realHover().should('be.focused');
      cy.realPress('ArrowDown');
      cy.get('#first').should('be.focused');
      cy.get('#submenu').should('not.exist');
      cy.realPress('ArrowUp');
      cy.get(preferences).should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#subfirst').should('be.focused');
      cy.get('#sublist').should($list =>
        expect(getByRole($list[0].ownerDocument.body, 'menu', { name: 'Preferences' })).to.equal($list[0]),
      );
      cy.realPress('End');
      cy.get('#sublast').should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('#submenu').should('not.exist');
      cy.get(preferences).should('be.focused');
    });
  }
});

describe('MenuList live context isolation and native root focus', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    it(`keeps nested submenu arrow and typeahead searches scoped to their own ${dir} list`, () => {
      mount(
        <MenuList id="list">
          <MenuItem id="alpha">Alpha</MenuItem>
          <Submenu />
          <MenuItem id="beta">Beta</MenuItem>
        </MenuList>,
        dir,
      );
      cy.get(preferences).realHover().should('be.focused');
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#subfirst').should('be.focused');
      cy.realPress('ArrowUp');
      cy.get('#sublast').should('be.focused');
      cy.realPress('b');
      cy.get('#sublast').should('be.focused');
      cy.realPress('c');
      cy.get('#subfirst').should('be.focused');
      cy.realPress('Escape');
      cy.get('#submenu').should('not.exist');
      cy.get(preferences).should('be.focused');
      cy.realPress('b');
      cy.get('#beta').should('be.focused');
    });
  }

  it('isolates parent and submenu checked values even when their group names match', () => {
    const parent: MenuCheckedValueChangeData[] = [];
    const child: MenuCheckedValueChangeData[] = [];
    mount(
      <MenuList defaultCheckedValues={{ edit: ['copy'] }} onCheckedValueChange={(_, data) => parent.push(data)}>
        <MenuItemCheckbox id="parent-copy" name="edit" value="copy">
          Parent copy
        </MenuItemCheckbox>
        <Menu onCheckedValueChange={(_, data) => child.push(data)}>
          <MenuTrigger disableButtonEnhancement>
            <MenuItem data-testid="preferences">Preferences</MenuItem>
          </MenuTrigger>
          <MenuPopover id="submenu">
            <MenuList>
              <MenuItemCheckbox id="child-copy" name="edit" value="copy">
                Child copy
              </MenuItemCheckbox>
            </MenuList>
          </MenuPopover>
        </Menu>
      </MenuList>,
    );
    checked('#parent-copy', true);
    cy.get(preferences).realHover();
    cy.realPress('ArrowRight');
    checked('#child-copy', false);
    cy.get('#child-copy').realClick();
    checked('#child-copy', true);
    checked('#parent-copy', true);
    cy.realPress('Escape');
    cy.get('#parent-copy').realClick();
    checked('#parent-copy', false);
    cy.get(preferences).realHover();
    cy.realPress('ArrowRight');
    checked('#child-copy', true);
    cy.then(() => {
      expect(parent).to.deep.equal([{ name: 'edit', checkedItems: [] }]);
      expect(child).to.deep.equal([{ name: 'edit', checkedItems: ['copy'] }]);
    });
    cy.realPress('Escape');
  });

  it('forwards native root tabIndex and current focus callbacks without requiring menuitem children', () => {
    const focus: string[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="update" onClick={() => setPhase(value => value + 1)}>
            Update
          </button>
          <MenuList
            id="list"
            tabIndex={phase < 3 ? 0 : undefined}
            onFocus={phase < 2 ? () => focus.push(String(phase)) : undefined}
          >
            <span>Nonconforming text content</span>
          </MenuList>
          <button id="after">After</button>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#list').realClick().should('be.focused');
    cy.get('#update').realClick();
    cy.realPress('Tab');
    cy.get('#list').should('be.focused').and('have.attr', 'tabindex', '0');
    cy.get('#update').realClick();
    cy.realPress('Tab');
    cy.get('#list').should('be.focused');
    cy.then(() => expect(focus).to.deep.equal(['0', '1']));
    cy.get('#update').realClick();
    cy.get('#list').should('not.have.attr', 'tabindex');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
    cy.then(() => expect(focus).to.deep.equal(['0', '1']));
  });

  it('removes live alignment flags without retaining icon or checkmark placeholder slots', () => {
    const Updating = () => {
      const [flags, setFlags] = React.useState(true);
      return (
        <>
          <button id="update" onClick={() => setFlags(false)}>
            Remove flags
          </button>
          <MenuList id="list" hasIcons={flags ? true : undefined} hasCheckmarks={flags ? true : undefined}>
            <MenuItem id="plain">Plain</MenuItem>
          </MenuList>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#plain .fui-MenuItem__icon').should('exist');
    cy.get('#plain .fui-MenuItem__checkmark').should('exist');
    cy.get('#update').realClick();
    cy.get('#plain .fui-MenuItem__icon').should('not.exist');
    cy.get('#plain .fui-MenuItem__checkmark').should('not.exist');
    cy.realPress('Tab');
    cy.get('#plain').should('be.focused');
  });
});
