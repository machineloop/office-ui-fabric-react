import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import type { JSXElement, SelectionItemId } from '@fluentui/react-utilities';
import { FixedSizeList } from 'react-window';
import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-menu';
import 'cypress-real-events';
import { List } from './List';
import type { ListProps } from './List.types';
import { ListItem } from '../ListItem';
import type { ListItemProps } from '../ListItem';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const item = (value: SelectionItemId) => cy.get(`[data-test="item-${value}"]`);
const press = (key: Parameters<typeof cy.realPress>[0], target: string) => {
  cy.realPress(key);
  cy.get(`[data-test="${target}"]`).should('be.focused');
};
const selected = (values: SelectionItemId[], ids: SelectionItemId[] = ['a', 'b', 'c']) => {
  ids.forEach(id => {
    item(id).should('have.attr', 'aria-selected', String(values.includes(id)));
    item(id)
      .find('input[type="checkbox"]')
      .should(values.includes(id) ? 'be.checked' : 'not.be.checked');
  });
  cy.get('[data-test="selection"]').should('have.text', JSON.stringify(values));
};

type FixtureProps = {
  selectionMode?: ListProps['selectionMode'];
  navigationMode?: ListProps['navigationMode'];
  initial?: SelectionItemId[];
  controlled?: boolean;
  rejectChanges?: boolean;
  customAction?: boolean;
  activeOnFocus?: boolean;
  menu?: boolean;
  secondaryBehavior?: 'preventDefault' | 'stopPropagation';
  disabled?: SelectionItemId[];
  ids?: SelectionItemId[];
  onSelectionChange?: ListProps['onSelectionChange'];
  onAction?: ListItemProps['onAction'];
  onClick?: React.MouseEventHandler<HTMLLIElement & HTMLDivElement>;
  onSecondary?: React.MouseEventHandler<HTMLButtonElement>;
  listProps?: ListProps;
};

const Fixture = ({
  selectionMode,
  navigationMode,
  initial = [],
  controlled = false,
  rejectChanges = false,
  customAction = false,
  activeOnFocus = false,
  menu = false,
  secondaryBehavior = 'preventDefault',
  disabled = [],
  ids = ['a', 'b', 'c'],
  onSelectionChange,
  onAction,
  onClick,
  onSecondary,
  listProps,
}: FixtureProps) => {
  const [selection, setSelection] = React.useState<SelectionItemId[]>(initial);
  return (
    <>
      <button data-test="before">Before list</button>
      <List
        aria-label="Example list"
        data-test="list"
        navigationMode={navigationMode}
        selectionMode={selectionMode}
        defaultSelectedItems={controlled ? undefined : initial}
        selectedItems={controlled ? selection : undefined}
        onSelectionChange={(event, data) => {
          onSelectionChange?.(event, data);
          if (!rejectChanges) {
            setSelection(data.selectedItems);
          }
        }}
        {...listProps}
      >
        {ids.map(id => (
          <ListItem
            key={id}
            value={id}
            data-test={`item-${id}`}
            aria-label={`Item ${id}`}
            disabledSelection={disabled.includes(id)}
            checkmark={
              activeOnFocus
                ? null
                : selectionMode
                ? {
                    'aria-label': `Select ${id}`,
                    root: { role: navigationMode === 'composite' ? 'gridcell' : undefined },
                  }
                : undefined
            }
            onAction={
              customAction || onAction
                ? (event, data) => {
                    if (customAction) {
                      event.preventDefault();
                    }
                    onAction?.(event, data);
                  }
                : undefined
            }
            onClick={onClick}
            onFocus={
              activeOnFocus
                ? event => {
                    if (event.target === event.currentTarget) {
                      setSelection([id]);
                    }
                  }
                : undefined
            }
          >
            {navigationMode === 'composite' ? (
              <>
                <span role="gridcell">Item {id}</span>
                <span role="gridcell">
                  <button
                    data-test={`secondary-${id}`}
                    onClick={event => {
                      if (secondaryBehavior === 'stopPropagation') {
                        event.stopPropagation();
                      } else {
                        event.preventDefault();
                      }
                      onSecondary?.(event);
                    }}
                  >
                    Details {id}
                  </button>
                </span>
                <span role="gridcell">
                  {menu ? (
                    <Menu>
                      <MenuTrigger disableButtonEnhancement>
                        <button data-test={`last-${id}`} onClick={event => event.preventDefault()}>
                          More {id}
                        </button>
                      </MenuTrigger>
                      <MenuPopover>
                        <MenuList>
                          <MenuItem data-test={`menu-${id}`} onClick={event => event.preventDefault()}>
                            About {id}
                          </MenuItem>
                        </MenuList>
                      </MenuPopover>
                    </Menu>
                  ) : (
                    <button data-test={`last-${id}`} onClick={event => event.preventDefault()}>
                      More {id}
                    </button>
                  )}
                </span>
              </>
            ) : (
              `Item ${id}`
            )}
          </ListItem>
        ))}
      </List>
      <button data-test="after">After list</button>
      <button data-test="replace" onClick={() => setSelection(['c'])}>
        Select only c
      </button>
      <button data-test="clear" onClick={() => setSelection([])}>
        Clear
      </button>
      <output data-test="selection">{JSON.stringify(selection)}</output>
    </>
  );
};

const VirtualOuter = React.forwardRef<HTMLUListElement, ListProps>((props, ref) => (
  <List {...props} ref={ref} aria-label="Virtual list" data-test="virtual" tabIndex={0} />
));
const VirtualActionOuter = React.forwardRef<HTMLUListElement, ListProps>((props, ref) => (
  <List {...props} ref={ref} aria-label="Virtual list" data-test="virtual" navigationMode="items" />
));
const VirtualFixture = ({
  actionable = false,
  onAction,
}: {
  actionable?: boolean;
  onAction?: ListItemProps['onAction'];
}) => {
  const rowHeight = Number.parseInt(teamsLightTheme.lineHeightBase500, 10);
  return (
    <>
      <button data-test="before">Before virtual list</button>
      <FixedSizeList
        height={rowHeight * 5}
        width="100%"
        itemSize={rowHeight}
        itemCount={100}
        outerElementType={actionable ? VirtualActionOuter : VirtualOuter}
      >
        {({ index, style }) => (
          <ListItem
            style={{ ...style, color: tokens.colorNeutralForeground1 }}
            value={`virtual-${index}`}
            data-test={`virtual-${index}`}
            aria-setsize={100}
            aria-posinset={index + 1}
            onAction={actionable ? onAction : undefined}
          >
            Virtual item {index}
          </ListItem>
        )}
      </FixedSizeList>
      <button data-test="after">After virtual list</button>
    </>
  );
};

describe('List documented scenarios', () => {
  it('Default: non-interactive content has list semantics without item tab stops or selection', () => {
    mount(<Fixture />);
    cy.get('[data-test="list"]').should('have.prop', 'tagName', 'UL').and('have.attr', 'role', 'list');
    cy.get('[data-test^="item-"]').should('have.length', 3).and('have.attr', 'role', 'listitem');
    item('a').should('not.have.attr', 'tabindex');
    item('a').should('not.have.attr', 'aria-selected');
    cy.get('input[type="checkbox"]').should('not.exist');
    cy.get('[data-test="before"]').focus();
    press('Tab', 'after');
  });

  describe('List undocumented and accessibility edges', () => {
    (['single', 'multiselect'] as const).forEach(selectionMode => {
      it(`${selectionMode}: disabled selection blocks row click, Enter, Space and native checkbox`, () => {
        const change = cy.stub().as('change');
        mount(<Fixture selectionMode={selectionMode} disabled={['b']} onSelectionChange={change} />);
        selected([]);
        item('b').should('have.attr', 'aria-disabled', 'true').find('input').should('be.disabled');
        item('b').click();
        selected([]);
        cy.get('@change').should('not.have.been.called');
        item('b').focus();
        cy.realPress('Enter');
        selected([]);
        cy.get('@change').should('not.have.been.called');
        cy.realPress('Space');
        selected([]);
        cy.get('@change').should('not.have.been.called');
        item('a').click();
        selected(['a']);
        cy.get('@change').should('have.been.calledOnce');
      });
    });

    it('Selection-disabled rows retain an independent custom action without aria-disabled', () => {
      const action = cy.stub().as('action');
      const change = cy.stub().as('change');
      mount(<Fixture selectionMode="multiselect" disabled={['b']} onAction={action} onSelectionChange={change} />);
      item('b').should('not.have.attr', 'aria-disabled');
      item('b').find('input').should('be.disabled');
      item('b').click();
      selected([]);
      cy.get('@action').should('have.been.calledOnce');
      cy.get('@change').should('not.have.been.called');
      item('b').focus();
      cy.realPress('Enter');
      selected([]);
      cy.get('@action').should('have.been.calledTwice');
      cy.get('@change').should('not.have.been.called');
      cy.realPress('Space');
      selected([]);
      cy.get('@action').should('have.been.calledTwice');
      cy.get('@change').should('not.have.been.called');
    });

    it('A controlled owner may reject selection proposals without optimistic visual selection', () => {
      const change = cy.stub().as('change');
      mount(
        <Fixture selectionMode="multiselect" controlled rejectChanges initial={['a']} onSelectionChange={change} />,
      );
      selected(['a']);
      item('b').click();
      selected(['a']);
      cy.get('@change')
        .should('have.been.calledOnce')
        .its('lastCall.args.1.selectedItems')
        .should('deep.equal', ['a', 'b']);
      item('a').focus();
      cy.realPress('Space');
      selected(['a']);
      cy.get('@change').should('have.been.calledTwice').its('lastCall.args.1.selectedItems').should('deep.equal', []);
    });

    it('Rapid repeated multiselect activation neither loses other items nor duplicates IDs', () => {
      const change = cy.stub().as('change');
      mount(<Fixture selectionMode="multiselect" initial={['b']} onSelectionChange={change} />);
      selected(['b']);
      item('a').focus();
      for (const values of [['b', 'a'], ['b'], ['b', 'a'], ['b']]) {
        cy.realPress('Space');
        selected(values);
      }
      cy.get('@change').should('have.callCount', 4);
      item('c').click();
      selected(['b', 'c']);
      cy.get('@change').should('have.callCount', 5);
    });

    it('Numeric zero remains a numeric selection ID in callbacks and controlled state', () => {
      const change = cy.stub().as('change');
      mount(<Fixture selectionMode="multiselect" controlled ids={[0, 'b', 'c']} onSelectionChange={change} />);
      selected([], [0, 'b', 'c']);
      item(0).click();
      selected([0], [0, 'b', 'c']);
      cy.get('@change').its('lastCall.args.1.selectedItems').should('deep.equal', [0]);
      item(0).focus();
      cy.realPress('Space');
      selected([], [0, 'b', 'c']);
      cy.get('@change').should('have.been.calledTwice');
    });

    it('Item navigation crosses boundaries without wrapping, selecting, or invoking actions', () => {
      const action = cy.stub().as('action');
      const change = cy.stub().as('change');
      mount(
        <Fixture navigationMode="items" selectionMode="multiselect" onAction={action} onSelectionChange={change} />,
      );
      item('a').focus();
      for (const [key, target] of [
        ['ArrowUp', 'item-a'],
        ['Home', 'item-a'],
        ['End', 'item-c'],
        ['ArrowDown', 'item-c'],
        ['PageUp', 'item-a'],
        ['PageDown', 'item-c'],
      ] as const) {
        press(key, target);
        selected([]);
        cy.get('@action').should('not.have.been.called');
        cy.get('@change').should('not.have.been.called');
      }
      press('Tab', 'after');
      press(['Shift', 'Tab'], 'item-c');
      selected([]);
    });

    it('RTL composite actions use reversed horizontal movement and retain vertical navigation', () => {
      mount(<Fixture navigationMode="composite" />, 'rtl');
      item('a').focus();
      press('ArrowRight', 'secondary-a');
      press('ArrowLeft', 'last-a');
      press('ArrowRight', 'secondary-a');
      press('Escape', 'item-a');
      press('ArrowDown', 'item-b');
      press('ArrowUp', 'item-a');
      item('a').should('not.have.attr', 'aria-selected');
    });

    it('Named list and items preserve labels, descriptions and non-tabbable checkbox indicators', () => {
      mount(
        <>
          <p id="list-help">Choose any number of entries</p>
          <Fixture selectionMode="multiselect" listProps={{ 'aria-describedby': 'list-help' }} />
        </>,
      );
      cy.get('[data-test="list"]')
        .should('have.attr', 'aria-label', 'Example list')
        .and('have.attr', 'aria-describedby', 'list-help');
      item('a').should('have.attr', 'aria-label', 'Item a');
      item('a').find('input').should('have.attr', 'aria-label', 'Select a').and('have.attr', 'tabindex', '-1');
      cy.get('[data-test="before"]').focus();
      press('Tab', 'item-a');
      press('Tab', 'after');
      selected([]);
    });

    it('Empty and one-item interactive lists have usable Tab exits and no boundary phantom items', () => {
      mount(<Fixture navigationMode="items" ids={[]} />);
      cy.get('[data-test="list"]').should('exist').and('have.attr', 'role', 'list');
      cy.get('[data-test^="item-"]').should('not.exist');
      cy.get('[data-test="before"]').focus();
      press('Tab', 'after');
      mount(<Fixture navigationMode="items" ids={['a']} />);
      item('a').focus();
      press('ArrowDown', 'item-a');
      press('ArrowUp', 'item-a');
      press('Home', 'item-a');
      press('End', 'item-a');
      cy.get('[data-test^="item-"]').should('have.length', 1);
      press('Tab', 'after');
    });

    it('Sibling lists isolate selection and independently infer their child roles', () => {
      mount(
        <>
          <List data-test="first" selectionMode="single" aria-label="First">
            <ListItem value="shared" data-test="first-shared">
              First shared
            </ListItem>
          </List>
          <List data-test="second" selectionMode="multiselect" aria-label="Second">
            <ListItem value="shared" data-test="second-shared">
              Second shared
            </ListItem>
          </List>
        </>,
      );
      cy.get('[data-test="first-shared"]').click().should('have.attr', 'aria-selected', 'true');
      cy.get('[data-test="second-shared"]').should('have.attr', 'aria-selected', 'false');
      cy.get('[data-test="second-shared"]').click().should('have.attr', 'aria-selected', 'true');
      cy.get('[data-test="first-shared"]').should('have.attr', 'aria-selected', 'true');
      cy.get('[data-test="first"]').should('not.have.attr', 'aria-multiselectable');
      cy.get('[data-test="second"]').should('have.attr', 'aria-multiselectable', 'true');
      cy.get('[data-test="second-shared"]').focus();
      cy.realPress('Space');
      cy.get('[data-test="second-shared"]').should('have.attr', 'aria-selected', 'false');
      cy.get('[data-test="first-shared"]').should('have.attr', 'aria-selected', 'true');
    });

    it('Stable values survive item reordering/removal without migrating selection to another row', () => {
      const Dynamic = () => {
        const [ids, setIds] = React.useState(['a', 'b', 'c']);
        return (
          <>
            <Fixture ids={ids} controlled selectionMode="multiselect" initial={['b']} />
            <button data-test="reverse" onClick={() => setIds(current => [...current].reverse())}>
              Reverse
            </button>
            <button data-test="remove" onClick={() => setIds(current => current.filter(id => id !== 'b'))}>
              Remove b
            </button>
            <button data-test="restore" onClick={() => setIds(['a', 'b', 'c'])}>
              Restore
            </button>
          </>
        );
      };
      mount(<Dynamic />);
      selected(['b']);
      cy.get('[data-test="reverse"]').click();
      cy.get('[data-test^="item-"]').first().should('have.attr', 'data-test', 'item-c');
      selected(['b']);
      cy.get('[data-test="remove"]').click();
      item('b').should('not.exist');
      selected(['b'], ['a', 'c']);
      cy.get('[data-test="restore"]').click();
      selected(['b']);
      item('c').click();
      selected(['b', 'c']);
    });
  });

  it('SingleAction: click, Enter and Space invoke the primary action without selection', () => {
    const action = cy.stub().as('action');
    mount(<Fixture navigationMode="items" onAction={action} />);
    item('a').click().should('be.focused');
    cy.get('@action').should('have.been.calledOnce');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledTwice');
    cy.realPress('Space');
    cy.get('@action').should('have.been.calledThrice');
    item('a').should('not.have.attr', 'aria-selected');
    cy.get('input[type="checkbox"]').should('not.exist');
  });

  (['single', 'multiselect'] as const).forEach(mode => {
    it(`SingleActionSelection: ${mode} infers focusability and supports Enter/Space/checkbox`, () => {
      const change = cy.stub().as('change');
      mount(<Fixture selectionMode={mode} onSelectionChange={change} />);
      selected([]);
      cy.get('[data-test="list"]').should('have.attr', 'role', 'listbox');
      item('a').should('have.attr', 'tabindex', '0').focus();
      cy.realPress('Space');
      selected(['a']);
      cy.get('@change').should('have.been.calledOnce');
      cy.realPress('Enter');
      selected(mode === 'single' ? ['a'] : []);
      cy.get('@change').should('have.been.calledTwice');
      item('b').find('input').click();
      selected(['b']);
      cy.get('@change').should('have.been.calledThrice');
    });
  });

  it('SingleActionSelectionControlled: external state replacement/clear updates every item', () => {
    mount(<Fixture selectionMode="multiselect" initial={['a', 'b']} controlled />);
    selected(['a', 'b']);
    cy.get('[data-test="replace"]').click();
    selected(['c']);
    cy.get('[data-test="clear"]').click();
    selected([]);
    item('b').click();
    selected(['b']);
  });

  (['items', 'composite'] as const).forEach(navigationMode => {
    it(`DifferentPrimary: ${navigationMode} custom action cancels click/Enter selection but not Space/checkbox`, () => {
      const action = cy.stub().as('action');
      const change = cy.stub().as('change');
      mount(
        <Fixture
          navigationMode={navigationMode}
          selectionMode="multiselect"
          customAction
          onAction={action}
          onSelectionChange={change}
        />,
      );
      item('a').click();
      selected([]);
      cy.get('@action').should('have.been.calledOnce');
      cy.get('@change').should('not.have.been.called');
      item('a').focus();
      cy.realPress('Enter');
      selected([]);
      cy.get('@action').should('have.been.calledTwice');
      cy.get('@change').should('not.have.been.called');
      cy.realPress('Space');
      selected(['a']);
      cy.get('@action').should('have.been.calledTwice');
      cy.get('@change').should('have.been.calledOnce');
      item('a').find('input').click();
      selected([]);
      cy.get('@action').should('have.been.calledTwice');
      cy.get('@change').should('have.been.calledTwice');
    });
  });

  it('MultipleActionsWithPrimary: rows/cells expose secondary actions without triggering the primary', () => {
    const action = cy.stub().as('action');
    const secondary = cy.stub().as('secondary');
    mount(<Fixture navigationMode="composite" onAction={action} onSecondary={secondary} />);
    cy.get('[data-test="list"]').should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'grid');
    item('a').should('have.attr', 'role', 'row').find('[role="gridcell"]').should('have.length', 3);
    item('a').click();
    cy.get('@action').should('have.been.calledOnce');
    press('ArrowRight', 'secondary-a');
    cy.realPress('Enter');
    cy.get('@secondary').should('have.been.calledOnce');
    cy.get('@action').should('have.been.calledOnce');
    press('ArrowRight', 'last-a');
    press('ArrowRight', 'last-a');
    press('ArrowLeft', 'secondary-a');
    press('Escape', 'item-a');
    press('ArrowDown', 'item-b');
    cy.get('input').should('not.exist');
  });

  it('MultipleActionsSelection: secondary mouse/keyboard actions preserve selection and row movement does not select', () => {
    const secondary = cy.stub().as('secondary');
    const change = cy.stub().as('change');
    mount(
      <Fixture
        navigationMode="composite"
        selectionMode="multiselect"
        onSecondary={secondary}
        onSelectionChange={change}
      />,
    );
    item('a').click();
    selected(['a']);
    cy.get('@change').should('have.been.calledOnce');
    cy.get('[data-test="secondary-b"]').click();
    selected(['a']);
    cy.get('@secondary').should('have.been.calledOnce');
    cy.get('@change').should('have.been.calledOnce');
    cy.realPress('Space');
    selected(['a']);
    cy.get('@secondary').should('have.been.calledTwice');
    cy.get('@change').should('have.been.calledOnce');
    press('ArrowDown', 'item-c');
    selected(['a']);
    cy.realPress('Space');
    selected(['a', 'c']);
    cy.get('@change').should('have.been.calledTwice');
  });

  it('Composite Tab exits the entire list and Shift+Tab restores the memorized row', () => {
    mount(<Fixture navigationMode="composite" />);
    cy.get('[data-test="before"]').focus();
    press('Tab', 'item-a');
    press('ArrowDown', 'item-b');
    press('ArrowRight', 'secondary-b');
    press('Tab', 'after');
    press(['Shift', 'Tab'], 'item-b');
    press('ArrowRight', 'secondary-b');
    press('ArrowLeft', 'item-b');
  });

  it('ListActiveElement: row focus controls selection but focus within the row does not replace it', () => {
    mount(
      <Fixture
        navigationMode="composite"
        selectionMode="single"
        controlled
        activeOnFocus
        initial={['a']}
        secondaryBehavior="stopPropagation"
      />,
    );
    item('a').focus();
    item('a').should('have.attr', 'aria-selected', 'true');
    item('b').should('have.attr', 'aria-selected', 'false');
    press('ArrowDown', 'item-b');
    item('a').should('have.attr', 'aria-selected', 'false');
    item('b').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-test="selection"]').should('have.text', '["b"]');
    press('ArrowRight', 'secondary-b');
    item('b').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-test="selection"]').should('have.text', '["b"]');
    cy.get('input').should('not.exist');
  });

  it('VirtualizedList: scrollable root and explicit set positions survive recycling', () => {
    mount(<VirtualFixture />);
    cy.get('[data-test="virtual"]').should('have.attr', 'tabindex', '0').and('have.attr', 'role', 'list');
    cy.get('[data-test="virtual-0"]').should('have.attr', 'aria-setsize', '100').and('have.attr', 'aria-posinset', '1');
    cy.get('[data-test="virtual-99"]').should('not.exist');
    cy.get('[data-test="virtual"]').focus().should('be.focused');
    cy.realPress('ArrowDown');
    cy.get('[data-test="virtual"]').should(element => {
      expect(element[0].scrollTop).to.be.greaterThan(0);
    });
    cy.get('[data-test="virtual"]').scrollTo('bottom');
    cy.get('[data-test="virtual-0"]').should('not.exist');
    cy.get('[data-test="virtual-99"]')
      .should('be.visible')
      .and('have.attr', 'aria-posinset', '100')
      .and('have.attr', 'aria-setsize', '100');
    cy.get('[data-test="virtual-99"]').should('not.have.attr', 'tabindex');
    cy.get('[data-test="virtual"]').scrollTo('top');
    cy.get('[data-test="virtual-0"]').should('be.visible').and('have.attr', 'aria-posinset', '1');
    cy.get('[data-test="virtual-99"]').should('not.exist');
  });

  it('VirtualizedListWithActionableItems: visible recycled items remain keyboard actionable', () => {
    const action = cy.stub().as('action');
    mount(<VirtualFixture actionable onAction={action} />);
    cy.get('[data-test="before"]').focus().should('be.focused');
    press('Tab', 'virtual-0');
    press('ArrowDown', 'virtual-1');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledOnce').its('firstCall.args.1.value').should('equal', 'virtual-1');
    cy.get('[data-test="virtual"]').scrollTo('bottom');
    cy.get('[data-test="virtual-0"]').should('not.exist');
    cy.get('[data-test="virtual-99"]').should('be.visible').and('have.attr', 'aria-posinset', '100').focus();
    cy.realPress('Space');
    cy.get('@action').should('have.been.calledTwice').its('lastCall.args.1.value').should('equal', 'virtual-99');
    cy.get('[data-test="virtual-99"]').should('not.have.attr', 'aria-selected');
  });
});

class ExpectedMarkupError extends React.Component<{ children: React.ReactNode }, { message: string }> {
  state = { message: '' };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    return this.state.message ? <output data-test="markup-error">{this.state.message}</output> : this.props.children;
  }
}

describe('List unit-derived browser contracts', () => {
  ([undefined, 'items', 'composite'] as const).forEach(navigationMode => {
    ([undefined, 'single', 'multiselect'] as const).forEach(selectionMode => {
      it(`Role/focus/checkmark matrix: navigation=${navigationMode || 'none'}, selection=${
        selectionMode || 'none'
      }`, () => {
        mount(<Fixture navigationMode={navigationMode} selectionMode={selectionMode} />);
        const rootRole = navigationMode === 'composite' ? 'grid' : selectionMode ? 'listbox' : 'list';
        const childRole = rootRole === 'grid' ? 'row' : rootRole === 'listbox' ? 'option' : 'listitem';
        cy.get('[data-test="list"]').should('have.attr', 'role', rootRole);
        if (selectionMode === 'multiselect') {
          cy.get('[data-test="list"]').should('have.attr', 'aria-multiselectable', 'true');
        } else {
          cy.get('[data-test="list"]').should('not.have.attr', 'aria-multiselectable');
        }
        for (const id of ['a', 'b', 'c']) {
          item(id).should('have.attr', 'role', childRole);
          if (selectionMode || navigationMode) {
            item(id).should('have.attr', 'tabindex', '0');
          } else {
            item(id).should('not.have.attr', 'tabindex');
          }
          if (selectionMode) {
            item(id).should('have.attr', 'aria-selected', 'false');
            item(id).find('input[type="checkbox"]').should('have.length', 1).and('not.be.checked');
          } else {
            item(id).should('not.have.attr', 'aria-selected');
            item(id).find('input[type="checkbox"]').should('not.exist');
          }
        }
      });
    });
  });

  ([undefined, 'items', 'composite'] as const).forEach(navigationMode => {
    it(`Explicit root/item roles survive navigation=${navigationMode || 'none'}`, () => {
      mount(
        <List navigationMode={navigationMode} selectionMode="multiselect" role="group" data-test="custom-list">
          <ListItem value="custom" role="article" data-test="custom-item">
            <span role={navigationMode === 'composite' ? 'gridcell' : undefined}>Custom content</span>
          </ListItem>
        </List>,
      );
      cy.get('[data-test="custom-list"]').should('have.attr', 'role', 'group');
      cy.get('[data-test="custom-item"]')
        .should('have.attr', 'role', 'article')
        .and('have.attr', 'aria-selected', 'false');
      cy.get('[data-test="custom-item"]').click().should('have.attr', 'aria-selected', 'true');
      cy.get('[data-test="custom-list"]').should('have.attr', 'role', 'group');
      cy.get('[data-test="custom-item"]').should('have.attr', 'role', 'article');
    });
  });

  (['ul', 'ol'] as const).forEach(as => {
    it(`Explicit ${as} roots preserve native markup, forwarded refs and item navigation`, () => {
      const ref = React.createRef<HTMLUListElement | HTMLOListElement>();
      mount(
        <>
          <button data-test="before">Before list</button>
          <List as={as} ref={ref} navigationMode="items" aria-label="Native list" data-test="native">
            <ListItem data-test="native-first">First</ListItem>
            <ListItem data-test="native-second">Second</ListItem>
          </List>
          <button data-test="after">After list</button>
        </>,
      );
      cy.get('[data-test="native"]').should('have.prop', 'tagName', as.toUpperCase()).and('have.attr', 'role', 'list');
      cy.get('[data-test="native"]').then(element => expect(ref.current).to.equal(element[0]));
      cy.get('[data-test="native-first"]').should('have.prop', 'tagName', 'LI').and('have.attr', 'role', 'listitem');
      cy.get('[data-test="before"]').focus();
      press('Tab', 'native-first');
      press('ArrowDown', 'native-second');
      press('Tab', 'after');
      cy.get('[data-test="native-second"]').should('not.have.attr', 'aria-selected');
      cy.get('input').should('not.exist');
    });
  });

  it('Compatible div roots, forwarded ref, class and native attributes are preserved', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <List as="div" ref={ref} id="native-list" className="consumer-list" title="List title" data-test="native">
        <ListItem as="div" data-test="native-item">
          Native div
        </ListItem>
      </List>,
    );
    cy.get('[data-test="native"]')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.id', 'native-list')
      .and('have.class', 'consumer-list')
      .and('have.attr', 'title', 'List title');
    cy.get('[data-test="native-item"]').should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'listitem');
    cy.get('[data-test="native"]').then(element => expect(ref.current).to.equal(element[0]));
    cy.get('input').should('not.exist');
  });

  it('Invalid div/li combinations report the unit-tested diagnostic through an explicit error boundary', () => {
    mount(
      <ExpectedMarkupError>
        <List as="div">
          <ListItem>Invalid li</ListItem>
        </List>
      </ExpectedMarkupError>,
    );
    cy.get('[data-test="markup-error"]').should(
      'have.text',
      'ListItem cannot be rendered as a li when its parent is a div.',
    );
    cy.get('.fui-List').should('not.exist');
    mount(
      <ExpectedMarkupError>
        <List>
          <ListItem as="div">Invalid div</ListItem>
        </List>
      </ExpectedMarkupError>,
    );
    cy.get('[data-test="markup-error"]').should(
      'have.text',
      'ListItem cannot be rendered as a div when its parent is not a div.',
    );
    cy.get('.fui-List').should('not.exist');
    mount(<Fixture />);
    cy.get('[data-test="markup-error"]').should('not.exist');
    cy.get('[data-test="list"]').should('have.attr', 'role', 'list');
  });

  it('Selection callback contains the original event, change type and exact selectedItems array', () => {
    const change = cy.stub().as('change');
    mount(<Fixture selectionMode="multiselect" onSelectionChange={change} />);
    item('a').click();
    selected(['a']);
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => {
        const [event, data] = change.lastCall.args;
        expect(data).to.have.keys('event', 'type', 'selectedItems');
        expect(data.event).to.equal(event);
        expect(data.type).to.equal('change');
        expect(event.type).to.equal('click');
        expect(data.selectedItems).to.deep.equal(['a']);
      });
    item('b').focus();
    cy.realPress('Space');
    selected(['a', 'b']);
    cy.get('@change')
      .should('have.been.calledTwice')
      .then(() => {
        const [event, data] = change.lastCall.args;
        expect(data.event).to.equal(event);
        expect(event.type).to.equal('keydown');
        expect(event.key).to.equal(' ');
        expect(data.type).to.equal('change');
        expect(data.selectedItems).to.deep.equal(['a', 'b']);
      });
  });

  it('Action callback reports ListItemAction, matching event, numeric value and original keyboard event', () => {
    const action = cy.stub().as('action');
    mount(<Fixture navigationMode="items" ids={[0, 'b', 'c']} onAction={action} />);
    item(0).focus();
    cy.realPress('Enter');
    cy.get('@action')
      .should('have.been.calledOnce')
      .then(() => {
        const [event, data] = action.lastCall.args;
        expect(data).to.have.keys('event', 'type', 'value');
        expect(data.event).to.equal(event);
        expect(data.type).to.equal('ListItemAction');
        expect(data.value).to.equal(0);
        expect(event.cancelable).to.equal(true);
        expect(event.bubbles).to.equal(true);
        expect(event.detail.originalEvent.key).to.equal('Enter');
      });
    item(0).should('not.have.attr', 'aria-selected');
    cy.get('input').should('not.exist');
  });

  it('Checkbox selection invokes onClick but not onAction and synchronizes native checked state', () => {
    const action = cy.stub().as('action');
    const click = cy.stub().as('click');
    const change = cy.stub().as('change');
    mount(<Fixture selectionMode="multiselect" onAction={action} onClick={click} onSelectionChange={change} />);
    item('a').find('input').click();
    selected(['a']);
    cy.get('@action').should('not.have.been.called');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@change').should('have.been.calledOnce');
    item('a').find('input').click();
    selected([]);
    cy.get('@action').should('not.have.been.called');
    cy.get('@click').should('have.been.calledTwice');
    cy.get('@change').should('have.been.calledTwice');
  });

  it('Cancelled row onClick prevents both the primary action and selection', () => {
    const action = cy.stub().as('action');
    const change = cy.stub().as('change');
    const click = cy
      .stub()
      .callsFake((event: React.MouseEvent) => event.preventDefault())
      .as('click');
    mount(<Fixture selectionMode="multiselect" onAction={action} onClick={click} onSelectionChange={change} />);
    item('a').click();
    selected([]);
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@action').should('not.have.been.called');
    cy.get('@change').should('not.have.been.called');
    item('a').focus();
    cy.realPress('Space');
    selected(['a']);
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@action').should('not.have.been.called');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('Unrelated keys do not emit click/action/selection or move focus', () => {
    const action = cy.stub().as('action');
    const click = cy.stub().as('click');
    const change = cy.stub().as('change');
    mount(<Fixture selectionMode="multiselect" onAction={action} onClick={click} onSelectionChange={change} />);
    item('a').focus();
    for (const key of ['A', 'Escape', 'ArrowLeft'] as const) {
      press(key, 'item-a');
      selected([]);
      cy.get('@action').should('not.have.been.called');
      cy.get('@click').should('not.have.been.called');
      cy.get('@change').should('not.have.been.called');
    }
  });

  it('Single selection reactivation retains the selected item, while another item replaces it', () => {
    const change = cy.stub().as('change');
    mount(<Fixture selectionMode="single" initial={['a']} onSelectionChange={change} />);
    selected(['a']);
    item('a').click();
    selected(['a']);
    cy.get('@change').should('have.been.calledOnce').its('lastCall.args.1.selectedItems').should('deep.equal', ['a']);
    item('b').focus();
    cy.realPress('Space');
    selected(['b']);
    cy.get('@change').should('have.been.calledTwice').its('lastCall.args.1.selectedItems').should('deep.equal', ['b']);
    item('c').focus();
    cy.realPress('Enter');
    selected(['c']);
    cy.get('@change').should('have.been.calledThrice').its('lastCall.args.1.selectedItems').should('deep.equal', ['c']);
  });

  it('Documented secondary menu opens, restores focus on Escape, and never changes selection', () => {
    const action = cy.stub().as('action');
    const change = cy.stub().as('change');
    mount(
      <Fixture
        navigationMode="composite"
        selectionMode="multiselect"
        initial={['a']}
        menu
        customAction
        onAction={action}
        onSelectionChange={change}
      />,
    );
    selected(['a']);
    cy.get('[data-test="last-b"]').click();
    cy.get('[data-test="menu-b"]').should('be.visible');
    selected(['a']);
    cy.get('@action').should('not.have.been.called');
    cy.get('@change').should('not.have.been.called');
    cy.realPress('Escape');
    cy.get('[data-test="menu-b"]').should('not.exist');
    cy.get('[data-test="last-b"]').should('be.focused');
    selected(['a']);
    cy.realPress('Enter');
    cy.get('[data-test="menu-b"]').should('be.visible').and('be.focused');
    cy.realPress('Enter');
    cy.get('[data-test="menu-b"]').should('not.exist');
    selected(['a']);
    cy.get('@action').should('not.have.been.called');
    cy.get('@change').should('not.have.been.called');
  });

  it('Initially selected disabled items cannot be deselected by mouse or keyboard', () => {
    const change = cy.stub().as('change');
    mount(<Fixture selectionMode="multiselect" initial={['b']} disabled={['b']} onSelectionChange={change} />);
    selected(['b']);
    item('b').click();
    selected(['b']);
    cy.get('@change').should('not.have.been.called');
    item('b').focus();
    cy.realPress('Space');
    selected(['b']);
    cy.get('@change').should('not.have.been.called');
    cy.realPress('Enter');
    selected(['b']);
    cy.get('@change').should('not.have.been.called');
    item('a').click();
    selected(['b', 'a']);
    cy.get('@change').should('have.been.calledOnce');
  });

  it('Selection-related props without selectionMode do not enable selection implicitly', () => {
    const change = cy.stub().as('change');
    const action = cy.stub().as('action');
    mount(<Fixture initial={['a']} controlled navigationMode="items" onAction={action} onSelectionChange={change} />);
    item('a').should('not.have.attr', 'aria-selected');
    cy.get('input').should('not.exist');
    item('a').click();
    cy.get('@action').should('have.been.calledOnce');
    cy.get('@change').should('not.have.been.called');
    item('a').focus();
    cy.realPress('Space');
    cy.get('@action').should('have.been.calledTwice');
    cy.get('@change').should('not.have.been.called');
    item('a').should('not.have.attr', 'aria-selected');
    cy.get('[data-test="selection"]').should('have.text', '["a"]');
  });
});
