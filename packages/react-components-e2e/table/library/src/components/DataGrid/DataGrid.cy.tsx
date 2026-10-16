import * as React from 'react';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import type { DataGridProps, TableColumnDefinition, TableRowId } from '@fluentui/react-table';
import {
  DataGrid,
  DataGridHeader,
  DataGridRow,
  createTableColumn,
  DataGridCell,
  DataGridBody,
  DataGridHeaderCell,
} from '@fluentui/react-table';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { useDataGridContext_unstable } from '../../contexts/dataGridContext';
import * as axe from 'axe-core';

interface Item {
  first: string;
  second: string;
  third: string;
}

const testColumns: TableColumnDefinition<Item>[] = [
  createTableColumn({ columnId: 'first', renderHeaderCell: () => 'header-1', renderCell: item => item.first }),
  createTableColumn({ columnId: 'second', renderHeaderCell: () => 'header-2', renderCell: item => item.second }),
  createTableColumn({ columnId: 'third', renderHeaderCell: () => 'header-3', renderCell: item => item.third }),
];

const testItems: Item[] = [
  { first: '1-1', second: '1-2', third: '1-3' },
  { first: '2-1', second: '2-2', third: '2-3' },
  { first: '3-1', second: '3-2', third: '3-3' },
  { first: '4-1', second: '4-2', third: '4-3' },
  { first: '5-1', second: '5-2', third: '5-3' },
  { first: '6-1', second: '6-2', third: '6-3' },
  { first: '7-1', second: '7-2', third: '7-3' },
];

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

describe('DataGrid', () => {
  const Example = () => (
    <DataGrid items={testItems} columns={testColumns}>
      <DataGridHeader>
        <DataGridRow<Item>>{({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell()}</DataGridCell>}</DataGridRow>
      </DataGridHeader>
      <DataGridBody<Item>>
        {({ item }) => (
          <DataGridRow<Item>>{({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}</DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  );

  it('should move focus with arrow keys', () => {
    mount(<Example />);

    cy.contains('header-1').click();
    cy.focused().should('have.text', 'header-1').realPress('ArrowRight');
    cy.focused().should('have.text', 'header-2').realPress('ArrowLeft');
    cy.focused().should('have.text', 'header-1').realPress('ArrowDown');
    cy.focused().should('have.text', '1-1').realPress('ArrowRight');
    cy.focused().should('have.text', '1-2').realPress('ArrowLeft');
    cy.focused().should('have.text', '1-1').realPress('ArrowUp');
    cy.focused().should('have.text', 'header-1');
  });

  interface RootItem {
    id: TableRowId;
    name: string;
    value: number;
  }

  const rootItems: RootItem[] = [
    { id: 0, name: 'Charlie', value: 3 },
    { id: 'a', name: 'Alpha', value: 1 },
    { id: 'b', name: 'Beta', value: 2 },
  ];
  const rootColumns = [
    createTableColumn<RootItem>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => 'Name',
      renderCell: item => item.name,
    }),
    createTableColumn<RootItem>({
      columnId: 'value',
      compare: (a, b) => a.value - b.value,
      renderHeaderCell: () => 'Value',
      renderCell: item => item.value,
    }),
    createTableColumn<RootItem>({
      columnId: 'static',
      renderHeaderCell: () => 'Not sortable',
      renderCell: item => `Record ${item.name}`,
    }),
  ];

  const RootProbe = () => {
    const selected = useDataGridContext_unstable(ctx => Array.from(ctx.selection.selectedRows));
    const all = useDataGridContext_unstable(ctx => ctx.selection.allRowsSelected);
    const some = useDataGridContext_unstable(ctx => ctx.selection.someRowsSelected);
    const mode = useDataGridContext_unstable(ctx => ctx.focusMode);
    const sortColumn = useDataGridContext_unstable(ctx => ctx.sort.sortColumn);
    const sortDirection = useDataGridContext_unstable(ctx => ctx.sort.sortDirection);
    return (
      <output data-testid="state">{JSON.stringify({ selected, all, some, mode, sortColumn, sortDirection })}</output>
    );
  };

  type RootExampleProps = Omit<DataGridProps, 'items' | 'columns' | 'children'> & {
    items?: RootItem[];
    columns?: TableColumnDefinition<RootItem>[];
    gridRef?: React.Ref<HTMLDivElement>;
    probe?: boolean;
    resizeActions?: boolean;
    extra?: React.ReactNode;
  };

  const RootExample = ({
    items = rootItems,
    columns = rootColumns,
    gridRef,
    probe = false,
    resizeActions = false,
    extra,
    ...props
  }: RootExampleProps) => (
    <DataGrid
      aria-label="Records"
      items={items}
      columns={columns}
      getRowId={(item: RootItem) => item.id}
      ref={gridRef}
      {...props}
    >
      <DataGridHeader>
        <DataGridRow<RootItem>
          selectionCell={
            props.selectionMode ? { checkboxIndicator: { 'aria-label': 'Select all records' } } : undefined
          }
        >
          {({ renderHeaderCell, columnId }, context) => (
            <DataGridHeaderCell data-column={columnId}>
              {renderHeaderCell()}
              {resizeActions && (
                <button onClick={context.columnSizing_unstable.enableKeyboardMode(columnId)}>Resize {columnId}</button>
              )}
            </DataGridHeaderCell>
          )}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<RootItem> data-testid="body">
        {({ item, rowId }) => (
          <DataGridRow<RootItem>
            key={rowId}
            data-row={rowId}
            selectionCell={
              props.selectionMode
                ? {
                    checkboxIndicator: { 'aria-label': `Select ${item.name}` },
                    radioIndicator: { 'aria-label': `Select ${item.name}` },
                  }
                : undefined
            }
          >
            {({ renderCell, columnId }) => <DataGridCell data-column={columnId}>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
      {probe && <RootProbe />}
      {extra}
    </DataGrid>
  );

  const row = (id: TableRowId) => cy.get(`[data-testid="body"] [data-row="${id}"]`);
  const header = (id: TableRowId) => cy.get(`[role="columnheader"][data-column="${id}"]`);
  const order = (...ids: TableRowId[]) =>
    cy.get('[data-testid="body"] [data-row]').should(rows => {
      expect(Array.from(rows, el => el.getAttribute('data-row'))).to.deep.equal(ids.map(String));
    });
  const selection = (selected: TableRowId[], all: boolean, some: boolean) =>
    cy.get('[data-testid="state"]').should(el => {
      const state = JSON.parse(el.text());
      expect(state.selected).to.deep.equal(selected);
      expect(state.all).to.equal(all);
      expect(state.some).to.equal(some);
    });

  describe('DataGrid root documented contracts', () => {
    it('renders the named native grid roles and column render functions', () => {
      mount(<RootExample />);
      cy.get('[role="grid"]').should('have.attr', 'aria-label', 'Records').and('have.prop', 'tagName', 'DIV');
      cy.get('[role="rowgroup"]').should('have.length', 2);
      cy.get('[role="row"]').should('have.length', 4);
      header('name').should('have.text', 'Name');
      row(0).find('[role="gridcell"]').should('have.length', 3).eq(0).should('have.text', 'Charlie');
      cy.get('[role="grid"]').should('have.css', 'display', 'block');
      row(0).should('have.css', 'display', 'flex');
      cy.get('input').should('not.exist');
    });

    it('uses the visible label and description relationships supplied to the root', () => {
      mount(
        <>
          <h2 id="records-title">Saved records</h2>
          <p id="records-help">Choose a record</p>
          <RootExample aria-label={undefined} aria-labelledby="records-title" aria-describedby="records-help" />
        </>,
      );
      cy.get('[role="grid"]')
        .should('have.attr', 'aria-labelledby', 'records-title')
        .and('have.attr', 'aria-describedby', 'records-help');
      cy.get('#records-title').should('have.text', 'Saved records');
      cy.get('#records-help').should('have.text', 'Choose a record');
    });

    it('characterizes duplicated uncontrolled sort callbacks in development while sorting pointer descending without mutating items', () => {
      const onSortChange = cy.stub().as('sort');
      mount(
        <RootExample
          sortable
          defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
          onSortChange={onSortChange}
        />,
      );
      order('a', 'b', 0);
      header('name').should('have.attr', 'aria-sort', 'ascending').find('[role="button"]').realClick();
      order(0, 'b', 'a');
      header('name').should('have.attr', 'aria-sort', 'descending');
      cy.get('@sort')
        .should('have.been.calledTwice')
        .its('firstCall.args')
        .should(args => {
          expect(args[0].type).to.equal('click');
          expect(args[0].nativeEvent.isTrusted).to.equal(true);
          expect(args[1]).to.deep.equal({ sortColumn: 'name', sortDirection: 'descending' });
          expect(rootItems.map(item => item.id)).to.deep.equal([0, 'a', 'b']);
        });
    });

    it('starts a newly sorted column ascending and leaves non-comparator columns passive', () => {
      const changed = cy.stub().as('sort');
      mount(
        <RootExample
          sortable
          onSortChange={changed}
          defaultSortState={{ sortColumn: 'name', sortDirection: 'descending' }}
        />,
      );
      header('value').find('[role="button"]').realClick();
      order('a', 'b', 0);
      header('value').should('have.attr', 'aria-sort', 'ascending');
      header('name').should('have.attr', 'aria-sort', 'none');
      header('static').should('not.have.attr', 'aria-sort');
      header('static').find('[role="button"]').should('not.exist');
      header('static').realClick();
      cy.get('@sort').should('have.been.calledTwice');
    });

    for (const key of ['Enter', 'Space'] as const) {
      it(`characterizes duplicated uncontrolled sort callbacks with native ${key} activation and a mouse-shaped callback API`, () => {
        const changed = cy.stub().as('sort');
        mount(<RootExample sortable onSortChange={changed} />);
        header('name').find('[role="button"]').focus().realPress(key);
        order('a', 'b', 0);
        cy.get('@sort')
          .should('have.been.calledTwice')
          .its('firstCall.args')
          .should(args => {
            expect(args[0].type).to.equal('click');
            expect(args[1]).to.deep.equal({ sortColumn: 'name', sortDirection: 'ascending' });
          });
      });
    }

    it('keeps controlled sorting unchanged until the owner supplies a new state', () => {
      const changed = cy.stub().as('sort');
      const Controlled = () => {
        const [sortState, setSortState] = React.useState({ sortColumn: 'name', sortDirection: 'ascending' as const });
        return (
          <>
            <button onClick={() => setSortState({ sortColumn: 'value', sortDirection: 'ascending' })}>
              Owner update
            </button>
            <RootExample sortable sortState={sortState} onSortChange={changed} />
          </>
        );
      };
      mount(<Controlled />);
      header('name').find('[role="button"]').realClick();
      cy.get('@sort')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { sortColumn: 'name', sortDirection: 'descending' });
      order('a', 'b', 0);
      header('name').should('have.attr', 'aria-sort', 'ascending');
      cy.contains('button', 'Owner update').realClick();
      header('value').should('have.attr', 'aria-sort', 'ascending');
      header('name').should('have.attr', 'aria-sort', 'none');
    });

    it('accepts controlled sort proposals when the owner updates state', () => {
      const Controlled = () => {
        const [sortState, setSortState] = React.useState<NonNullable<DataGridProps['sortState']>>({
          sortColumn: 'value',
          sortDirection: 'descending',
        });
        return <RootExample sortable sortState={sortState} onSortChange={(_, data) => setSortState(data)} />;
      };
      mount(<Controlled />);
      order(0, 'b', 'a');
      header('value').find('[role="button"]').realClick();
      order('a', 'b', 0);
    });

    it('disables sorting despite a configured default when sortable is false', () => {
      const changed = cy.stub().as('sort');
      mount(
        <RootExample defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }} onSortChange={changed} />,
      );
      order(0, 'a', 'b');
      header('name').should('not.have.attr', 'aria-sort');
      header('name').realClick();
      cy.get('@sort').should('not.have.been.called');
    });

    it('toggles multiselection from partial to all to none with numeric zero and string IDs', () => {
      const changed = cy.stub().as('select');
      mount(<RootExample selectionMode="multiselect" defaultSelectedItems={[0]} onSelectionChange={changed} probe />);
      selection([0], false, true);
      row(0).should('have.attr', 'aria-selected', 'true');
      cy.get('input[aria-label="Select all records"]').should('have.prop', 'indeterminate', true).realClick();
      selection([0, 'a', 'b'], true, true);
      cy.get('[data-testid="body"] input').should('be.checked');
      cy.get('input[aria-label="Select all records"]').realClick();
      selection([], false, false);
      cy.get('[data-testid="body"] [aria-selected="true"]').should('not.exist');
      cy.get('@select')
        .should('have.been.calledTwice')
        .its('firstCall.args')
        .should(args => {
          expect(args[0].nativeEvent.isTrusted).to.equal(true);
          expect(Object.keys(args[1])).to.deep.equal(['selectedItems']);
          expect(args[1].selectedItems).to.be.instanceOf(Set);
          expect(Array.from(args[1].selectedItems)).to.deep.equal([0, 'a', 'b']);
        });
    });

    it('toggles a row through native pointer and Space with an exact selection payload and no invented reason', () => {
      const changed = cy.stub().as('select');
      mount(<RootExample selectionMode="multiselect" onSelectionChange={changed} probe />);
      row(0).find('[data-column="name"]').realClick();
      selection([0], false, true);
      row(0).find('[data-column="name"]').realPress('Space');
      selection([], false, false);
      cy.get('@select')
        .should('have.been.calledTwice')
        .its('secondCall.args')
        .should(args => {
          expect(args[0].type).to.equal('keydown');
          expect(args[0].key).to.equal(' ');
          expect(args[0].defaultPrevented).to.equal(true);
          expect(args[0].nativeEvent.isTrusted).to.equal(true);
          expect(Object.keys(args[1])).to.deep.equal(['selectedItems']);
        });
    });

    it('toggles the named native checkbox once without double-bubbling selection', () => {
      const changed = cy.stub().as('select');
      mount(<RootExample selectionMode="multiselect" onSelectionChange={changed} probe />);
      cy.get('input[aria-label="Select Alpha"]').realClick();
      selection(['a'], false, true);
      row('a').should('have.attr', 'aria-selected', 'true');
      cy.get('input[aria-label="Select Alpha"]').realPress('Space');
      selection([], false, false);
      cy.get('@select').should('have.been.calledTwice');
    });

    it('single selection replaces the previous row and reselecting never toggles it off', () => {
      mount(<RootExample selectionMode="single" defaultSelectedItems={['a']} probe />);
      cy.get('input[type="radio"]').should('have.length', 3);
      cy.get('[role="columnheader"] input[type="radio"]').should('not.exist');
      row(0).find('[data-column="name"]').realClick();
      selection([0], true, true);
      row(0).find('[data-column="name"]').realPress('Space');
      selection([0], true, true);
      cy.get('input[aria-label="Select Beta"]').realClick();
      selection(['b'], true, true);
      row(0).should('have.attr', 'aria-selected', 'false');
    });

    for (const selectionMode of ['single', 'multiselect'] as const) {
      it(`controlled ${selectionMode} selection proposes changes but remains owner-controlled`, () => {
        const changed = cy.stub().as('select');
        const Controlled = () => {
          const [selectedItems, setSelectedItems] = React.useState<TableRowId[]>([0]);
          return (
            <>
              <button onClick={() => setSelectedItems(['b'])}>Owner selection</button>
              <RootExample
                selectionMode={selectionMode}
                selectedItems={selectedItems}
                onSelectionChange={changed}
                probe
              />
            </>
          );
        };
        mount(<Controlled />);
        row('a').find('[data-column="name"]').realClick();
        selection([0], selectionMode === 'single', true);
        cy.get('@select')
          .should('have.been.calledOnce')
          .its('firstCall.args.1.selectedItems')
          .should(ids => {
            expect(Array.from(ids)).to.deep.equal(selectionMode === 'single' ? ['a'] : [0, 'a']);
          });
        cy.contains('button', 'Owner selection').realClick();
        selection(['b'], selectionMode === 'single', true);
        row('b').should('have.attr', 'aria-selected', 'true');
      });

      it(`controlled ${selectionMode} accepts native selection proposals`, () => {
        const Controlled = () => {
          const [selectedItems, setSelectedItems] = React.useState(new Set<TableRowId>());
          return (
            <RootExample
              selectionMode={selectionMode}
              selectedItems={selectedItems}
              onSelectionChange={(_, data) => setSelectedItems(data.selectedItems)}
              probe
            />
          );
        };
        mount(<Controlled />);
        row(0).find('[data-column="name"]').realClick();
        row('a').find('[data-column="name"]').realClick();
        selection(selectionMode === 'single' ? ['a'] : [0, 'a'], selectionMode === 'single', true);
      });
    }

    for (const [size, height] of [
      ['extra-small', '24px'],
      ['small', '34px'],
      ['medium', '44px'],
    ] as const) {
      it(`propagates supported ${size} density to flex-layout cells`, () => {
        mount(<RootExample size={size} />);
        row(0).find('[data-column="name"]').should('have.css', 'min-height', height).and('have.css', 'display', 'flex');
      });
    }

    for (const appearance of ['brand', 'neutral', 'none'] as const) {
      it(`propagates ${appearance} selectionAppearance without changing selection semantics`, () => {
        mount(<RootExample selectionMode="multiselect" selectionAppearance={appearance} defaultSelectedItems={[0]} />);
        row(0)
          .should('have.attr', 'aria-selected', 'true')
          .then(selected => {
            row('b').should(unselected => {
              const view = selected[0].ownerDocument.defaultView;
              expect(view).not.to.equal(null);
              const selectedColor = view?.getComputedStyle(selected[0]).backgroundColor;
              const unselectedColor = view?.getComputedStyle(unselected[0]).backgroundColor;
              if (appearance === 'none') {
                expect(selectedColor).to.equal(unselectedColor);
              } else {
                expect(selectedColor).not.to.equal(unselectedColor);
              }
            });
          });
      });
    }

    it('reveals subtle selection on hover focus and checked state with a hidden positive control', () => {
      mount(<RootExample selectionMode="multiselect" subtleSelection defaultSelectedItems={[0]} />);
      row('b').find('.fui-DataGridSelectionCell').should('have.css', 'opacity', '0');
      row(0).find('.fui-DataGridSelectionCell').should('have.css', 'opacity', '1');
      row('b').realHover();
      row('b').find('.fui-DataGridSelectionCell').should('have.css', 'opacity', '1');
      header('name').realHover();
      row('b').find('.fui-DataGridSelectionCell').should('have.css', 'opacity', '0');
      header('name').realClick().realPress('ArrowDown');
      cy.realPress('ArrowDown');
      cy.realPress('ArrowDown');
      cy.focused().should('have.text', 'Beta');
      row('b').find('.fui-DataGridSelectionCell').should('have.css', 'opacity', '1');
    });

    it('disables root selection when no selectionMode is supplied', () => {
      const changed = cy.stub().as('select');
      mount(<RootExample onSelectionChange={changed} defaultSelectedItems={[0]} />);
      row(0).should('not.have.attr', 'aria-selected');
      row(0).find('[data-column="name"]').realClick().realPress('Space');
      cy.get('input').should('not.exist');
      cy.get('@select').should('not.have.been.called');
    });
  });

  describe('DataGrid root edges and accessibility', () => {
    it('preserves selected stable row identity and the actual DOM node after sorting and reordering', () => {
      const Dynamic = () => {
        const [items, setItems] = React.useState(rootItems);
        return (
          <>
            <button onClick={() => setItems([...rootItems].reverse())}>Reverse items</button>
            <RootExample items={items} sortable selectionMode="multiselect" defaultSelectedItems={[0]} />
          </>
        );
      };
      mount(<Dynamic />);
      row(0).as('originalRow', { type: 'static' });
      header('name').find('[role="button"]').realClick();
      order('a', 'b', 0);
      cy.contains('button', 'Reverse items').realClick();
      row(0).should('have.attr', 'aria-selected', 'true');
      cy.get('@originalRow').then(original => row(0).should(current => expect(current[0]).to.equal(original[0])));
    });

    it('characterizes index identity as positional when items reorder without getRowId', () => {
      const Dynamic = () => {
        const [items, setItems] = React.useState(rootItems);
        return (
          <>
            <button onClick={() => setItems([...rootItems].reverse())}>Reverse index items</button>
            <RootExample items={items} getRowId={undefined} selectionMode="multiselect" defaultSelectedItems={[0]} />
          </>
        );
      };
      mount(<Dynamic />);
      row(0).should('have.attr', 'aria-selected', 'true').find('[data-column="name"]').should('have.text', 'Charlie');
      cy.contains('button', 'Reverse index items').realClick();
      row(0).should('have.attr', 'aria-selected', 'true').find('[data-column="name"]').should('have.text', 'Beta');
      row(2).should('have.attr', 'aria-selected', 'false').find('[data-column="name"]').should('have.text', 'Charlie');
    });

    it('retains filtered IDs but computes header selection only from currently present rows', () => {
      const Dynamic = () => {
        const [items, setItems] = React.useState(rootItems);
        return (
          <>
            <button onClick={() => setItems(rootItems.slice(1))}>Filter Charlie</button>
            <button onClick={() => setItems(rootItems)}>Restore Charlie</button>
            <RootExample items={items} selectionMode="multiselect" defaultSelectedItems={[0]} probe />
          </>
        );
      };
      mount(<Dynamic />);
      selection([0], false, true);
      cy.contains('button', 'Filter Charlie').realClick();
      selection([0], false, false);
      cy.get('input[aria-label="Select all records"]')
        .should('not.be.checked')
        .and('have.prop', 'indeterminate', false);
      cy.contains('button', 'Restore Charlie').realClick();
      row(0).should('have.attr', 'aria-selected', 'true');
      selection([0], false, true);
    });

    it('header clear-all removes retained obsolete IDs rather than only visible selected rows', () => {
      mount(
        <RootExample
          items={rootItems.slice(1)}
          selectionMode="multiselect"
          defaultSelectedItems={[0, 'a', 'b']}
          probe
        />,
      );
      selection([0, 'a', 'b'], true, true);
      cy.get('input[aria-label="Select all records"]').realClick();
      selection([], false, false);
    });

    it('recomputes all-selected when an unselected item is removed and uses latest items for select-all', () => {
      const Dynamic = () => {
        const [items, setItems] = React.useState(rootItems);
        return (
          <>
            <button onClick={() => setItems(rootItems.slice(0, 2))}>Remove Beta</button>
            <button onClick={() => setItems([...rootItems, { id: 'd', name: 'Delta', value: 4 }])}>Add Delta</button>
            <RootExample items={items} selectionMode="multiselect" defaultSelectedItems={[0, 'a']} probe />
          </>
        );
      };
      mount(<Dynamic />);
      selection([0, 'a'], false, true);
      cy.contains('button', 'Remove Beta').realClick();
      selection([0, 'a'], true, true);
      cy.contains('button', 'Add Delta').realClick();
      selection([0, 'a'], false, true);
      cy.get('input[aria-label="Select all records"]').realClick();
      selection([0, 'a', 'b', 'd'], true, true);
      row('d').should('have.attr', 'aria-selected', 'true');
    });

    for (const [label, items, columns] of [
      ['empty items', [], rootColumns],
      ['one item', rootItems.slice(0, 1), rootColumns],
      ['zero columns', rootItems, []],
      ['one column discouraged by guidance', rootItems, rootColumns.slice(0, 1)],
      ['empty items and columns', [], []],
    ] as const) {
      it(`renders finite ${label} without invented placeholders or announcements`, () => {
        mount(<RootExample items={[...items]} columns={[...columns]} />);
        cy.get('[role="grid"]').should('exist');
        cy.get('[data-testid="body"] [data-row]').should('have.length', items.length);
        cy.get('[role="columnheader"]').should('have.length', columns.length);
        cy.get('[data-testid="body"] [data-column]').should('have.length', items.length * columns.length);
        cy.get('[role="status"],[aria-live]').should('not.exist');
      });
    }

    it('preserves empty-string and numeric-zero row IDs as distinct supported falsy values', () => {
      const items = [
        { id: '', name: 'Empty ID', value: 1 },
        { id: 0, name: 'Zero ID', value: 2 },
      ];
      mount(<RootExample items={items} selectionMode="multiselect" probe />);
      row('').find('[data-column="name"]').realClick();
      selection([''], false, true);
      row(0).find('[data-column="name"]').realClick();
      selection(['', 0], true, true);
      row('').should('have.attr', 'aria-selected', 'true');
      row(0).should('have.attr', 'aria-selected', 'true');
    });

    it('updates columns and render functions in place including removal to zero and restoration', () => {
      const Dynamic = () => {
        const [columns, setColumns] = React.useState(rootColumns);
        return (
          <>
            <button onClick={() => setColumns([rootColumns[1], rootColumns[0]])}>Reorder columns</button>
            <button onClick={() => setColumns([])}>Remove columns</button>
            <button
              onClick={() =>
                setColumns([
                  createTableColumn<RootItem>({
                    ...rootColumns[0],
                    renderHeaderCell: () => 'Renamed',
                    renderCell: item => `Updated ${item.name}`,
                  }),
                ])
              }
            >
              Restore columns
            </button>
            <RootExample columns={columns} selectionMode="multiselect" defaultSelectedItems={[0]} />
          </>
        );
      };
      mount(<Dynamic />);
      cy.contains('button', 'Reorder columns').realClick();
      row(0).find('[data-column]').first().should('have.text', '3');
      cy.contains('button', 'Remove columns').realClick();
      cy.get('[role="columnheader"]').should('not.exist');
      row(0).should('have.attr', 'aria-selected', 'true').find('[data-column]').should('not.exist');
      cy.contains('button', 'Restore columns').realClick();
      header('name').should('have.text', 'Renamed');
      row(0).find('[data-column="name"]').should('have.text', 'Updated Charlie');
    });

    it('uses the latest comparator and callbacks after root prop updates', () => {
      const oldSort = cy.stub().as('oldSort');
      const newSort = cy.stub().as('newSort');
      const oldSelect = cy.stub().as('oldSelect');
      const newSelect = cy.stub().as('newSelect');
      const Dynamic = () => {
        const [updated, setUpdated] = React.useState(false);
        const columns = React.useMemo(
          () =>
            updated
              ? [
                  createTableColumn<RootItem>({ ...rootColumns[0], compare: (a, b) => b.value - a.value }),
                  ...rootColumns.slice(1),
                ]
              : rootColumns,
          [updated],
        );
        return (
          <>
            <button onClick={() => setUpdated(true)}>Update root props</button>
            <RootExample
              columns={columns}
              sortable
              sortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
              selectionMode="multiselect"
              selectedItems={[]}
              onSortChange={updated ? newSort : oldSort}
              onSelectionChange={updated ? newSelect : oldSelect}
            />
          </>
        );
      };
      mount(<Dynamic />);
      order('a', 'b', 0);
      header('name').find('[role="button"]').realClick();
      row(0).find('[data-column="name"]').realClick();
      cy.get('@oldSort').should('have.been.calledOnce');
      cy.get('@oldSelect').should('have.been.calledOnce');
      cy.contains('button', 'Update root props').realClick();
      order(0, 'b', 'a');
      header('name').find('[role="button"]').realClick();
      row('b').find('[data-column="name"]').realClick();
      cy.get('@newSort').should('have.been.calledOnce');
      cy.get('@newSelect')
        .should('have.been.calledOnce')
        .its('firstCall.args.1.selectedItems')
        .should(ids => expect(Array.from(ids)).to.deep.equal(['b']));
      cy.get('@oldSort').should('have.been.calledOnce');
      cy.get('@oldSelect').should('have.been.calledOnce');
    });

    it('ignores updated defaults after initialization without resetting uncontrolled state', () => {
      const Dynamic = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button onClick={() => setUpdated(true)}>Change defaults</button>
            <RootExample
              sortable
              selectionMode="multiselect"
              defaultSortState={{ sortColumn: 'name', sortDirection: updated ? 'descending' : 'ascending' }}
              defaultSelectedItems={updated ? ['b'] : [0]}
              probe
            />
          </>
        );
      };
      mount(<Dynamic />);
      order('a', 'b', 0);
      cy.contains('button', 'Change defaults').realClick();
      order('a', 'b', 0);
      selection([0], false, true);
    });

    it('forwards native root attributes classes styles object refs and clears the ref on unmount', () => {
      const ref = React.createRef<HTMLDivElement>();
      const Dynamic = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            <button onClick={() => setVisible(false)}>Unmount grid</button>
            {visible && (
              <RootExample
                gridRef={ref}
                id="native-root"
                title="Grid title"
                data-owner="root"
                className="custom-root"
                style={{ minWidth: '550px' }}
                tabIndex={-1}
              />
            )}
          </>
        );
      };
      mount(<Dynamic />);
      cy.get('#native-root')
        .should('have.class', 'fui-DataGrid')
        .and('have.class', 'fui-Table')
        .and('have.class', 'custom-root')
        .and('have.attr', 'data-owner', 'root')
        .and('have.attr', 'title', 'Grid title')
        .and('have.attr', 'tabindex', '-1')
        .and('have.css', 'min-width', '550px')
        .then(root => expect(ref.current).to.equal(root[0]));
      cy.contains('button', 'Unmount grid').realClick();
      cy.get('#native-root')
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
    });

    for (const as of ['div', 'table'] as const) {
      it(`honors supported root as=${as} without imposing sibling native semantics`, () => {
        const ref = cy.stub().as('ref');
        mount(<DataGrid as={as} items={[]} columns={[]} ref={ref} aria-label="Empty native root" />);
        cy.get('[role="grid"]')
          .should('have.prop', 'tagName', as.toUpperCase())
          .then(root => {
            expect(ref).to.have.been.calledWith(root[0]);
          });
      });
    }

    it('composes root onKeyDown before Ctrl Home End and honors preventDefault with latest closures', () => {
      const calls = cy.stub().as('keys');
      const Dynamic = () => {
        const [prevent, setPrevent] = React.useState(false);
        return (
          <>
            <button onClick={() => setPrevent(true)}>Prevent root navigation</button>
            <RootExample
              onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                calls(prevent, event.key, event.nativeEvent.isTrusted);
                if (prevent) {
                  event.preventDefault();
                }
              }}
            />
          </>
        );
      };
      mount(<Dynamic />);
      row('a').find('[data-column="name"]').realClick().realPress(['Control', 'Home']);
      cy.focused().should('have.text', 'Name');
      cy.realPress(['Control', 'End']);
      cy.focused().should('have.text', 'Record Beta');
      cy.contains('button', 'Prevent root navigation').realClick();
      row('a').find('[data-column="name"]').realClick().realPress(['Control', 'Home']);
      cy.focused().should('have.text', 'Alpha');
      cy.get('@keys').should('have.been.calledWith', true, 'Home', true);
    });

    it('root cell navigation enters once by Tab and exits to the surrounding buttons', () => {
      mount(
        <>
          <button>Before root</button>
          <RootExample />
          <button>After root</button>
        </>,
      );
      cy.contains('button', 'Before root').realClick().realPress('Tab');
      cy.focused().should('have.text', 'Name').realPress('ArrowDown');
      cy.focused().should('have.text', 'Charlie').realPress('Tab');
      cy.focused().should('have.text', 'After root').realPress(['Shift', 'Tab']);
      cy.focused().should('have.text', 'Charlie').realPress(['Shift', 'Tab']);
      cy.focused().should('have.text', 'Before root');
    });

    it('characterizes none focus mode as no mover while root Ctrl Home End remains active', () => {
      mount(<RootExample focusMode="none" />);
      cy.get('[role="grid"]').should('not.have.attr', 'data-tabster');
      row(0).find('[data-column="name"]').should('not.have.attr', 'tabindex');
      header('name').realClick().realPress('ArrowRight');
      cy.focused().should('have.text', 'Name');
      cy.realPress(['Control', 'End']);
      cy.focused().should('have.text', 'Name');
      header('value').realClick().realPress(['Control', 'Home']);
      cy.focused().should('have.text', 'Name');
    });

    it('characterizes row_unstable as tabbable rows without an automatic root arrow mover', () => {
      mount(<RootExample focusMode="row_unstable" selectionMode="multiselect" probe />);
      cy.get('[role="grid"]').should('not.have.attr', 'data-tabster');
      row(0).should('have.attr', 'tabindex', '0').focus().realPress('ArrowDown');
      cy.focused().should('have.attr', 'data-row', '0').realPress('Space');
      selection([0], false, true);
      row(0).find('[data-column="name"]').should('not.have.attr', 'tabindex');
    });

    it('uses native RTL cell arrow navigation and preserves logical Home End boundaries', () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir="rtl">
          <RootExample />
        </FluentProvider>,
      );
      row(0).find('[data-column="name"]').realClick().realPress('ArrowLeft');
      cy.focused().should('have.text', '3').realPress('ArrowRight');
      cy.focused().should('have.text', 'Charlie').realPress('End');
      cy.focused().should('have.text', 'Record Charlie').realPress('Home');
      cy.focused().should('have.text', 'Charlie');
    });

    it('isolates nested grid selection and sorting contexts without asserting nested event containment', () => {
      mount(
        <DataGrid
          items={rootItems}
          columns={rootColumns}
          selectionMode="single"
          defaultSelectedItems={[0]}
          aria-label="Outer context"
        >
          <RootProbe />
          <RootExample aria-label="Inner context" sortable selectionMode="multiselect" probe />
        </DataGrid>,
      );
      cy.get('[aria-label="Outer context"] > [data-testid="state"]').should('contain.text', '"selected":[0]');
      row('a').find('[data-column="name"]').realClick();
      header('name').find('[role="button"]').realClick();
      order('a', 'b', 0);
      cy.get('[aria-label="Inner context"] [data-testid="state"]').should('contain.text', '"selected":["a"]');
      cy.get('[aria-label="Outer context"] > [data-testid="state"]').should('contain.text', '"selected":[0]');
    });

    it('audits native selection and sort ARIA with a deliberate missing-button-name positive control', () => {
      mount(<RootExample sortable selectionMode="multiselect" aria-label="Audited records" />);
      const options: axe.RunOptions = {
        runOnly: {
          type: 'rule',
          values: [
            'aria-allowed-attr',
            'aria-valid-attr-value',
            'aria-required-children',
            'aria-required-parent',
            'aria-command-name',
            'button-name',
            'label',
          ],
        },
      };
      cy.get('[role="grid"]').then(async grid => {
        const result = await axe.run(grid[0], options);
        expect(result.violations, 'scoped ARIA and label violations').to.deep.equal([]);
        const button = grid[0].querySelector('[role="button"]');
        expect(button).not.to.equal(null);
        const original = button?.innerHTML;
        button?.replaceChildren();
        const negative = await axe.run(grid[0], options);
        expect(negative.violations.map(violation => violation.id)).to.include('aria-command-name');
        if (button && original !== undefined) {
          button.innerHTML = original;
        }
        const restored = await axe.run(grid[0], options);
        expect(restored.violations).to.deep.equal([]);
      });
    });
  });

  describe('DataGrid root unit and source regressions', () => {
    const sizingOptions = {
      name: { defaultWidth: 200, minWidth: 100 },
      value: { defaultWidth: 150, minWidth: 100 },
      static: { defaultWidth: 150, minWidth: 100 },
    };
    const width = (column: TableRowId, pixels: number) => {
      header(column).should('have.css', 'width', `${pixels}px`);
      row(0).find(`[data-column="${column}"]`).should('have.css', 'width', `${pixels}px`);
    };
    const Sized = (props: RootExampleProps) => (
      <div style={{ width: '600px' }}>
        <RootExample resizableColumns columnSizingOptions={sizingOptions} {...props} />
      </div>
    );

    it('allocates actual root layout width including selection-cell offset and header body alignment', () => {
      mount(<Sized selectionMode="multiselect" />);
      width('name', 200);
      width('value', 150);
      width('static', 158);
      header('name').then(cell => {
        expect(cell[0].getBoundingClientRect().width).to.equal(216);
        row(0)
          .find('[data-column="name"]')
          .should(body =>
            expect(body[0].getBoundingClientRect().width).to.equal(cell[0].getBoundingClientRect().width),
          );
      });
      cy.get('[role="separator"]').should('have.length', 2).and('have.attr', 'aria-hidden', 'true');
      header('static').find('[role="separator"]').should('not.exist');
    });

    it('honors the explicit root containerWidthOffset instead of the implicit selection offset', () => {
      mount(<Sized containerWidthOffset={-20} />);
      width('static', 182);
      cy.get('[role="grid"]').should('have.css', 'min-width', 'fit-content');
    });

    it('disables autofit keeps all configured widths and enables the last resize handle', () => {
      mount(<Sized resizableColumnsOptions={{ autoFitColumns: false }} />);
      width('name', 200);
      width('value', 150);
      width('static', 150);
      header('static').find('[role="separator"]').should('exist');
      cy.get('[role="separator"]').should('have.length', 3);
    });

    it('does not render sizing handles unless resizableColumns is enabled', () => {
      mount(<Sized resizableColumns={false} />);
      cy.get('[role="separator"]').should('not.exist');
      header('name').should(cell => expect(cell[0].style.width).to.equal(''));
    });

    it('resizes by native drag emits native event and width payload and never sorts or selects', () => {
      const resize = cy.stub().as('resize');
      const sort = cy.stub().as('sort');
      const select = cy.stub().as('select');
      mount(
        <Sized
          sortable
          selectionMode="multiselect"
          onColumnResize={resize}
          onSortChange={sort}
          onSelectionChange={select}
        />,
      );
      width('name', 200);
      header('name').find('[role="separator"]').realMouseDown().realMouseMove(40, 0, { position: 'center' });
      width('name', 240);
      header('name').should('have.css', 'pointer-events', 'none');
      cy.get('[role="grid"]').realMouseUp();
      header('name').should('not.have.css', 'pointer-events', 'none');
      cy.get('@resize')
        .should('have.been.called')
        .its('lastCall.args')
        .should(args => {
          expect(args[0].type).to.equal('mousemove');
          expect(args[0].isTrusted).to.equal(true);
          expect(args[1]).to.deep.equal({ columnId: 'name', width: 240 });
        });
      cy.get('@sort').should('not.have.been.called');
      cy.get('@select').should('not.have.been.called');
    });

    it('ignores the secondary mouse button for resizing with a primary-drag positive control', () => {
      const resize = cy.stub().as('resize');
      mount(<Sized onColumnResize={resize} resizableColumnsOptions={{ autoFitColumns: false }} />);
      header('name')
        .find('[role="separator"]')
        .realMouseDown({ button: 'right' })
        .realMouseMove(20, 0, { position: 'center' })
        .realMouseUp({ button: 'right' });
      width('name', 200);
      cy.get('@resize').should('not.have.been.called');
      header('name').find('[role="separator"]').realMouseDown().realMouseMove(20, 0, { position: 'center' });
      width('name', 220);
      cy.get('[role="grid"]').realMouseUp();
      cy.get('@resize').should('have.been.called');
    });

    for (const exit of ['Escape', 'Enter', 'Space'] as const) {
      it(`resizes using real keyboard arrows precision and ${exit} restores the previous header focus`, () => {
        const resize = cy.stub().as('resize');
        mount(<Sized resizeActions onColumnResize={resize} />);
        cy.contains('button', 'Resize name').realClick();
        cy.focused()
          .should('have.attr', 'role', 'separator')
          .and('have.attr', 'aria-label', 'Resize column')
          .and('have.attr', 'aria-valuetext', '200 pixels')
          .and('have.attr', 'aria-hidden', 'false')
          .realPress('ArrowRight');
        width('name', 220);
        cy.focused().should('have.attr', 'aria-valuetext', '220 pixels').realPress(['Shift', 'ArrowLeft']);
        width('name', 215);
        cy.get('@resize')
          .should('have.been.calledTwice')
          .its('lastCall.args')
          .should(args => {
            expect(args[0].type).to.equal('keydown');
            expect(args[0].isTrusted).to.equal(true);
            expect(args[1]).to.deep.equal({ columnId: 'name', width: 215 });
          });
        cy.realPress(exit);
        cy.focused().should('have.text', 'Resize name');
        header('name')
          .find('[role="separator"]')
          .should('have.attr', 'aria-hidden', 'true')
          .and('not.have.attr', 'tabindex');
      });
    }

    it('clamps keyboard resizing to the configured minimum and reports the clamped payload', () => {
      const resize = cy.stub().as('resize');
      mount(<Sized resizeActions onColumnResize={resize} />);
      cy.contains('button', 'Resize name').realClick();
      for (let index = 0; index < 6; index++) {
        cy.realPress('ArrowLeft');
      }
      width('name', 100);
      cy.focused().should('have.attr', 'aria-valuetext', '100 pixels');
      cy.get('@resize')
        .should('have.callCount', 6)
        .its('lastCall.args.1')
        .should('deep.equal', { columnId: 'name', width: 100 });
      cy.realPress('Escape');
    });

    it('retains resized widths on fresh equivalent inline options and applies changed ideal widths and callbacks', () => {
      const oldResize = cy.stub().as('oldResize');
      const newResize = cy.stub().as('newResize');
      const Dynamic = () => {
        const [generation, setGeneration] = React.useState(0);
        return (
          <>
            <button onClick={() => setGeneration(1)}>Equivalent options</button>
            <button onClick={() => setGeneration(2)}>Changed sizing options</button>
            <Sized
              resizeActions
              resizableColumnsOptions={{ autoFitColumns: false }}
              columnSizingOptions={{
                ...sizingOptions,
                name: {
                  defaultWidth: 200,
                  minWidth: 100,
                  ...(generation === 2 ? { idealWidth: 260, padding: 24 } : {}),
                },
              }}
              onColumnResize={generation === 2 ? newResize : oldResize}
            />
          </>
        );
      };
      mount(<Dynamic />);
      cy.contains('button', 'Resize name').realClick();
      cy.realPress('ArrowRight');
      width('name', 220);
      cy.realPress('Escape');
      cy.contains('button', 'Equivalent options').realClick();
      width('name', 220);
      cy.contains('button', 'Changed sizing options').realClick();
      width('name', 260);
      cy.contains('button', 'Resize name').realClick();
      cy.realPress('ArrowRight');
      width('name', 280);
      cy.get('@oldResize').should('have.been.calledOnce');
      cy.get('@newResize')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { columnId: 'name', width: 280 });
      cy.realPress('Escape');
    });

    it('observes parent-width shrink and expansion while respecting minimum widths', () => {
      const Dynamic = () => {
        const [containerWidth, setContainerWidth] = React.useState(600);
        return (
          <>
            <button onClick={() => setContainerWidth(250)}>Narrow root parent</button>
            <button onClick={() => setContainerWidth(600)}>Expand root parent</button>
            <div style={{ width: containerWidth, overflowX: 'auto' }}>
              <RootExample resizableColumns columnSizingOptions={sizingOptions} />
            </div>
          </>
        );
      };
      mount(<Dynamic />);
      width('name', 200);
      width('static', 202);
      cy.contains('button', 'Narrow root parent').realClick();
      width('name', 100);
      width('value', 100);
      width('static', 100);
      cy.contains('button', 'Expand root parent').realClick();
      width('name', 200);
      width('value', 150);
      width('static', 202);
    });

    it('uses the latest default sizing when adding a column and preserves widths on removal', () => {
      const extra = createTableColumn<RootItem>({
        columnId: 'extra',
        renderHeaderCell: () => 'Extra',
        renderCell: item => `Extra ${item.name}`,
      });
      const Dynamic = () => {
        const [expanded, setExpanded] = React.useState(false);
        return (
          <>
            <button onClick={() => setExpanded(true)}>Add sized column</button>
            <button onClick={() => setExpanded(false)}>Remove sized column</button>
            <Sized
              columns={expanded ? [...rootColumns, extra] : rootColumns}
              resizableColumnsOptions={{ autoFitColumns: false }}
              columnSizingOptions={{ ...sizingOptions, extra: { defaultWidth: expanded ? 240 : 180, minWidth: 110 } }}
            />
          </>
        );
      };
      mount(<Dynamic />);
      cy.contains('button', 'Add sized column').realClick();
      width('extra', 240);
      width('name', 200);
      cy.contains('button', 'Remove sized column').realClick();
      cy.get('[data-column="extra"]').should('not.exist');
      width('name', 200);
    });

    it('sorts numeric-zero and empty-string column IDs with actual headers and comparator functions', () => {
      const columns = [
        createTableColumn<RootItem>({ ...rootColumns[0], columnId: 0 }),
        createTableColumn<RootItem>({ ...rootColumns[1], columnId: '' }),
      ];
      mount(
        <RootExample columns={columns} sortable defaultSortState={{ sortColumn: 0, sortDirection: 'descending' }} />,
      );
      order(0, 'b', 'a');
      header(0).should('have.attr', 'aria-sort', 'descending');
      header('').find('[role="button"]').realClick();
      order('a', 'b', 0);
      header('').should('have.attr', 'aria-sort', 'ascending');
      header(0).should('have.attr', 'aria-sort', 'none');
    });

    it('resizes numeric-zero and empty-string column IDs through keyboard with no falsy-ID fallback', () => {
      const columns = [
        createTableColumn<RootItem>({ ...rootColumns[0], columnId: 0 }),
        createTableColumn<RootItem>({ ...rootColumns[1], columnId: '' }),
      ];
      mount(
        <Sized
          columns={columns}
          resizeActions
          columnSizingOptions={{ 0: { defaultWidth: 200 }, '': { defaultWidth: 150 } }}
          resizableColumnsOptions={{ autoFitColumns: false }}
        />,
      );
      cy.contains('button', /^Resize 0$/).realClick();
      cy.realPress('ArrowRight');
      width(0, 220);
      cy.realPress('Escape');
      cy.contains('button', /^Resize $/).realClick();
      cy.realPress(['Shift', 'ArrowRight']);
      width('', 155);
      cy.realPress('Escape');
    });

    it('characterizes physical keyboard resizing increments in RTL rather than claiming mirrored helper behavior', () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir="rtl">
          <Sized resizeActions />
        </FluentProvider>,
      );
      cy.contains('button', 'Resize name').realClick();
      cy.realPress('ArrowRight');
      width('name', 220);
      cy.realPress('ArrowLeft');
      width('name', 200);
      cy.realPress('Escape');
    });

    it('keeps equal-comparator row order stable and keeps input items immutable', () => {
      const items = [rootItems[0], { ...rootItems[1], value: 3 }, { ...rootItems[2], value: 3 }];
      mount(
        <RootExample items={items} sortable defaultSortState={{ sortColumn: 'value', sortDirection: 'descending' }} />,
      );
      order(0, 'a', 'b');
      header('value').find('[role="button"]').realClick();
      order(0, 'a', 'b');
      cy.then(() => expect(items.map(item => item.id)).to.deep.equal([0, 'a', 'b']));
    });

    it('retains a removed sort column state without sorting until its comparator is restored', () => {
      const Dynamic = () => {
        const [columns, setColumns] = React.useState(rootColumns);
        return (
          <>
            <button onClick={() => setColumns(rootColumns.slice(1))}>Remove sorted column</button>
            <button onClick={() => setColumns(rootColumns)}>Restore sorted column</button>
            <RootExample
              columns={columns}
              sortable
              defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
            />
          </>
        );
      };
      mount(<Dynamic />);
      order('a', 'b', 0);
      cy.contains('button', 'Remove sorted column').realClick();
      order(0, 'a', 'b');
      cy.get('[role="columnheader"][aria-sort="ascending"]').should('not.exist');
      cy.contains('button', 'Restore sorted column').realClick();
      order('a', 'b', 0);
      header('name').should('have.attr', 'aria-sort', 'ascending');
    });

    const FeatureActions = () => {
      const state = useDataGridContext_unstable(ctx => ctx);
      const rows = state.getRows();
      return (
        <>
          <output data-testid="row-ids">{JSON.stringify(rows.map(data => data.rowId))}</output>
          <output data-testid="column-ids">{JSON.stringify(state.columns.map(column => column.columnId))}</output>
          <button onClick={event => state.selection.selectRow(event, 0)}>Select zero</button>
          <button onClick={event => state.selection.deselectRow(event, 0)}>Deselect zero</button>
          <button onClick={event => state.selection.clearRows(event)}>Clear rows</button>
          <button onClick={event => state.sort.setColumnSort(event, 'name', 'descending')}>Set descending</button>
          <button onClick={() => state.columnSizing_unstable.setColumnWidth('name', 230)}>Set width</button>
          <button onClick={() => state.columnSizing_unstable.setColumnWidth('unknown', 900)}>Unknown width</button>
        </>
      );
    };

    it('exposes selection and sort feature methods through root context with fresh observable state', () => {
      mount(
        <DataGrid
          items={rootItems}
          columns={rootColumns}
          getRowId={(item: RootItem) => item.id}
          selectionMode="multiselect"
        >
          <RootProbe />
          <FeatureActions />
        </DataGrid>,
      );
      cy.get('[data-testid="row-ids"]').should('have.text', '[0,"a","b"]');
      cy.contains('button', 'Select zero').realClick();
      selection([0], false, true);
      cy.contains('button', 'Deselect zero').realClick();
      selection([], false, false);
      cy.contains('button', 'Select zero').realClick();
      cy.contains('button', 'Clear rows').realClick();
      selection([], false, false);
      cy.contains('button', 'Set descending').realClick();
      cy.get('[data-testid="state"]').should('contain.text', '"sortColumn":"name","sortDirection":"descending"');
    });

    it('characterizes unsupported duplicate row IDs as unvalidated and collapsed before keyed rendering', () => {
      const items = [
        { id: 0, name: 'Duplicate A', value: 1 },
        { id: 0, name: 'Duplicate B', value: 2 },
      ];
      expect(new Set(items.map(item => item.id)).size, 'unsupported duplicate fixture positive control').to.be.lessThan(
        items.length,
      );
      mount(
        <DataGrid
          items={items}
          columns={rootColumns}
          getRowId={(item: RootItem) => item.id}
          selectionMode="multiselect"
        >
          <RootProbe />
          <FeatureActions />
        </DataGrid>,
      );
      cy.get('[data-testid="row-ids"]').should('have.text', '[0,0]');
      cy.contains('button', 'Select zero').realClick();
      selection([0], true, true);
    });

    it('accepts root slot render functions without dropping root classes attributes or feature context', () => {
      const ref = React.createRef<HTMLDivElement>();
      const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
        <Component {...props} data-testid="rendered-root">
          <RootProbe />
          <FeatureActions />
        </Component>
      );
      mount(
        <DataGrid
          items={rootItems}
          columns={rootColumns}
          ref={ref}
          aria-label="Custom renderer"
          selectionMode="multiselect"
          defaultSelectedItems={[0]}
        >
          {renderRoot}
        </DataGrid>,
      );
      cy.get('[data-testid="rendered-root"]')
        .should('have.attr', 'role', 'grid')
        .and('have.attr', 'aria-label', 'Custom renderer')
        .and('have.class', 'fui-DataGrid')
        .then(root => expect(ref.current).to.equal(root[0]));
      selection([0], false, true);
      cy.contains('button', 'Clear rows').realClick();
      selection([], false, false);
    });

    it('characterizes source composite RTL physical ArrowRight entry and the ArrowLeft escape mismatch', () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir="rtl">
          <RootExample focusMode="composite" />
        </FluentProvider>,
      );
      row(0).focus().realPress('ArrowRight');
      cy.focused().should('have.text', 'Charlie').realPress('ArrowLeft');
      cy.focused().should('have.attr', 'role', 'gridcell').and('have.text', '3');
    });

    it('uses root columnSizing feature methods and characterizes unknown columns as a silent source no-op', () => {
      const resize = cy.stub().as('resize');
      mount(<Sized extra={<FeatureActions />} onColumnResize={resize} />);
      cy.contains('button', 'Set width').realClick();
      width('name', 230);
      cy.get('@resize')
        .should('have.been.calledOnce')
        .its('firstCall.args')
        .should(args => {
          expect(args[0]).to.equal(undefined);
          expect(args[1]).to.deep.equal({ columnId: 'name', width: 230 });
        });
      cy.contains('button', 'Unknown width').realClick();
      width('name', 230);
      cy.get('@resize').should('have.been.calledOnce');
    });

    it('composes root click after native row selection and uses the latest root callback', () => {
      const events: string[] = [];
      const Dynamic = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button onClick={() => setUpdated(true)}>Replace root click</button>
            <RootExample
              selectionMode="multiselect"
              onSelectionChange={() => events.push('selection')}
              onClick={() => events.push(updated ? 'new-root' : 'old-root')}
            />
          </>
        );
      };
      mount(<Dynamic />);
      row(0).find('[data-column="name"]').realClick();
      cy.then(() => expect(events).to.deep.equal(['selection', 'old-root']));
      cy.contains('button', 'Replace root click').realClick();
      row('a').find('[data-column="name"]').realClick();
      cy.then(() => expect(events).to.deep.equal(['selection', 'old-root', 'selection', 'new-root']));
    });

    it('characterizes a root preventDefault callback as too late to veto descendant Space selection', () => {
      const changed = cy.stub().as('select');
      mount(
        <RootExample
          selectionMode="multiselect"
          onSelectionChange={changed}
          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => event.preventDefault()}
          probe
        />,
      );
      row(0).find('[data-column="name"]').focus().realPress('Space');
      selection([0], false, true);
      cy.get('@select').should('have.been.calledOnce');
    });

    it('updates supported root focus modes without remounting the root or retaining obsolete mover attributes', () => {
      const Dynamic = () => {
        const [focusMode, setFocusMode] = React.useState<NonNullable<DataGridProps['focusMode']>>('cell');
        return (
          <>
            <button onClick={() => setFocusMode('composite')}>Use composite</button>
            <button onClick={() => setFocusMode('none')}>Use none</button>
            <RootExample focusMode={focusMode} />
          </>
        );
      };
      mount(<Dynamic />);
      cy.get('[role="grid"]').as('originalRoot', { type: 'static' }).should('have.attr', 'data-tabster');
      cy.contains('button', 'Use composite').realClick();
      row(0).should('have.attr', 'tabindex', '0').and('have.attr', 'data-tabster');
      cy.contains('button', 'Use none').realClick();
      cy.get('[role="grid"]').should('not.have.attr', 'data-tabster');
      row(0).should('not.have.attr', 'tabindex');
      row(0).should('not.have.attr', 'data-tabster');
      cy.get('@originalRoot').then(original =>
        cy.get('[role="grid"]').should(current => expect(current[0]).to.equal(original[0])),
      );
    });

    it('refreshes custom getRowId and uses the new identities for native select-all without migrating old IDs', () => {
      const Dynamic = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button onClick={() => setUpdated(true)}>Change identity function</button>
            <RootExample
              getRowId={(item: RootItem) => (updated ? item.name : item.id)}
              selectionMode="multiselect"
              defaultSelectedItems={[0]}
              probe
            />
          </>
        );
      };
      mount(<Dynamic />);
      selection([0], false, true);
      cy.contains('button', 'Change identity function').realClick();
      selection([0], false, false);
      row('Charlie').should('have.attr', 'aria-selected', 'false');
      cy.get('input[aria-label="Select all records"]').realClick();
      selection([0, 'Charlie', 'Alpha', 'Beta'], true, true);
    });

    it('characterizes duplicate column IDs as unvalidated root inputs without claiming keyed render support', () => {
      const columns = [rootColumns[0], { ...rootColumns[0], renderHeaderCell: () => 'Duplicate name' }];
      expect(new Set(columns.map(column => column.columnId)).size).to.be.lessThan(columns.length);
      mount(
        <DataGrid items={rootItems} columns={columns}>
          <FeatureActions />
        </DataGrid>,
      );
      cy.get('[data-testid="column-ids"]').should('have.text', '["name","name"]');
    });

    it('computes empty selectable root aggregates as false and clears obsolete IDs on native header activation', () => {
      const changed = cy.stub().as('select');
      mount(
        <RootExample
          items={[]}
          selectionMode="multiselect"
          defaultSelectedItems={[0]}
          onSelectionChange={changed}
          probe
        />,
      );
      selection([0], false, false);
      cy.get('[data-testid="body"] [role="row"]').should('not.exist');
      cy.get('input[aria-label="Select all records"]')
        .should('not.be.checked')
        .and('have.prop', 'indeterminate', false);
      cy.get('input[aria-label="Select all records"]').realClick();
      selection([], false, false);
      cy.get('@select')
        .should('have.been.calledOnce')
        .its('firstCall.args.1.selectedItems')
        .should(ids => expect(Array.from(ids)).to.deep.equal([]));
    });

    it('keeps native selection usable with zero resizable columns and no invented resize handles', () => {
      mount(<Sized columns={[]} selectionMode="multiselect" probe />);
      cy.get('[role="separator"],[role="columnheader"]').should('not.exist');
      cy.get('input[aria-label="Select Charlie"]').realClick();
      selection([0], false, true);
      cy.get('input[aria-label="Select all records"]').realClick();
      selection([0, 'a', 'b'], true, true);
    });

    it('isolates real nested-cell grid contexts while characterizing native selection bubbling to the outer row', () => {
      const outerSelection = cy.stub().as('outerSelection');
      const innerSelection = cy.stub().as('innerSelection');
      const columns = [
        createTableColumn<RootItem>({
          columnId: 'nested',
          renderHeaderCell: () => 'Nested records',
          renderCell: () => (
            <RootExample
              aria-label="Nested records grid"
              selectionMode="multiselect"
              onSelectionChange={innerSelection}
              probe
            />
          ),
        }),
      ];
      mount(
        <RootExample
          items={rootItems.slice(0, 1)}
          columns={columns}
          selectionMode="single"
          aria-label="Containing records grid"
          onSelectionChange={outerSelection}
          probe
        />,
      );
      cy.get('[aria-label="Nested records grid"] [data-row="a"] [data-column="name"]').realClick();
      cy.get('@innerSelection')
        .should('have.been.calledOnce')
        .its('firstCall.args.1.selectedItems')
        .should(ids => expect(Array.from(ids)).to.deep.equal(['a']));
      cy.get('@outerSelection')
        .should('have.been.calledOnce')
        .its('firstCall.args.1.selectedItems')
        .should(ids => expect(Array.from(ids)).to.deep.equal([0]));
      cy.get('[aria-label="Containing records grid"] > [data-testid="state"]').should('contain.text', '"selected":[0]');
      cy.get('[aria-label="Nested records grid"] > [data-testid="state"]').should('contain.text', '"selected":["a"]');
    });
  });

  it('should move focus to last cell with End', () => {
    mount(<Example />);

    cy.contains('1-1').click().realPress('End');
    cy.focused().should('have.text', '1-3');
  });

  it('should move focus to first cell with Home', () => {
    mount(<Example />);

    cy.contains('1-3').click().realPress('Home');
    cy.focused().should('have.text', '1-1');
  });

  it('should move focus to last cell with End', () => {
    mount(<Example />);

    cy.contains('1-1').click().realPress('End');
    cy.focused().should('have.text', '1-3');
  });

  it('should move focus to first cell with Home', () => {
    mount(<Example />);

    cy.contains('1-3').click().realPress('Home');
    cy.focused().should('have.text', '1-1');
  });

  it('should move to first cell in first row with CTRL+Home', () => {
    mount(<Example />);

    cy.contains('4-1').click().realPress(['Control', 'Home']);
    cy.focused().should('have.text', 'header-1');
  });

  it('should move to last cell in last row with CTRL+Home', () => {
    mount(<Example />);

    cy.contains('4-1').click().realPress(['Control', 'End']);
    cy.focused().should('have.text', '7-3');
  });

  it('should use focusable group for cells', () => {
    const NestedFocusableExample = () => (
      <DataGrid items={testItems} columns={testColumns}>
        <DataGridHeader>
          <DataGridRow<Item>>{({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell()}</DataGridCell>}</DataGridRow>
        </DataGridHeader>
        <DataGridBody<Item>>
          {({ item }) => (
            <DataGridRow<Item>>
              {({ renderCell }) => (
                <DataGridCell focusMode="group">
                  <button>{renderCell(item)}-1</button>
                  <button>{renderCell(item)}-2</button>
                </DataGridCell>
              )}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    );
    mount(<NestedFocusableExample />);

    cy.contains('header-1').click().realPress('ArrowDown');
    cy.focused().contains('1-1-11-1-2').focus().realPress('Enter');
    cy.focused().should('have.text', '1-1-1').realPress('Tab');
    cy.focused().should('have.text', '1-1-2').realPress('Tab');
    cy.focused().should('have.text', '1-1-1').realPress('ArrowDown');
    cy.focused().should('have.text', '1-1-1').realPress('ArrowUp');
    cy.focused().should('have.text', '1-1-1').realPress('ArrowLeft');
    cy.focused().should('have.text', '1-1-1').realPress('ArrowRight');
    cy.focused().should('have.text', '1-1-1').realPress('Escape');
    cy.focused().should('have.text', '1-1-11-1-2').realPress('ArrowRight');
    cy.focused().should('have.text', '1-2-11-2-2');
  });

  it('should navigate in composite mode', () => {
    const CompositeExample = () => (
      <>
        <button>Before</button>
        <DataGrid items={testItems} focusMode="composite" columns={testColumns}>
          <DataGridHeader>
            <DataGridRow<Item>>
              {({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell()}</DataGridCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<Item>>
            {({ item }) => (
              <DataGridRow<Item>>{({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}</DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
        <button>After</button>
      </>
    );
    mount(<CompositeExample />);

    cy.contains('header-1').click().realPress('ArrowRight');
    cy.focused().should('have.text', 'header-2').realPress('ArrowDown');
    cy.focused().should('have.attr', 'role', 'row').realPress('ArrowRight');
    cy.focused().should('have.text', '1-1').should('have.attr', 'role', 'gridcell').realPress('ArrowRight');
    cy.focused().should('have.text', '1-2').should('have.attr', 'role', 'gridcell').realPress('ArrowDown');
    cy.focused().should('have.attr', 'role', 'row').realPress('ArrowRight');
    cy.focused().should('have.text', '2-1').should('have.attr', 'role', 'gridcell').realPress('ArrowLeft');
    cy.focused().should('have.attr', 'role', 'row').should('have.text', '2-12-22-3').realPress('ArrowRight');
    cy.focused().should('have.text', '2-1').should('have.attr', 'role', 'gridcell').realPress('Tab');
    cy.focused().should('have.text', 'After').realPress(['Shift', 'Tab']);
    cy.focused().should('have.attr', 'role', 'row').should('have.text', '2-12-22-3').realPress('PageUp');
    cy.focused().should('have.text', 'header-1').should('have.attr', 'role', 'gridcell').realPress('ArrowRight');
    cy.focused().should('have.text', 'header-2').realPress('ArrowRight');
    cy.focused().should('have.text', 'header-3').should('have.attr', 'role', 'gridcell').realPress(['Shift', 'Tab']);
    cy.focused().should('have.text', 'Before');
  });

  it("should set tabIndex -1 for cell focusMode 'none'", () => {
    const columns = [
      ...testColumns,
      createTableColumn({
        columnId: 'action',
        renderHeaderCell: () => 'action',
        renderCell: () => <button>action</button>,
      }),
    ];
    const CompositeExample = () => (
      <>
        <button>Before</button>
        <DataGrid items={testItems} columns={columns}>
          <DataGridHeader>
            <DataGridRow<Item>>
              {({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell()}</DataGridCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<Item>>
            {({ item }) => (
              <DataGridRow<Item>>
                {({ renderCell, columnId }) => (
                  <DataGridCell focusMode={columnId === 'action' ? 'none' : 'cell'}>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
        <button>After</button>
      </>
    );
    mount(<CompositeExample />);

    cy.contains('header-1').click().realPress('ArrowRight');
    cy.realPress('ArrowRight');
    cy.realPress('ArrowRight');
    cy.realPress('ArrowRight');
    cy.realPress('ArrowDown');
    cy.focused().should('have.text', 'action').should('have.prop', 'tagName', 'BUTTON');
    cy.realPress('ArrowDown');
    cy.focused().should('have.text', 'action').should('have.prop', 'tagName', 'BUTTON');
    cy.realPress('ArrowLeft');
    cy.focused().should('have.text', '2-3');
    cy.realPress('ArrowRight');
    cy.focused().should('have.text', 'action').should('have.prop', 'tagName', 'BUTTON');
  });

  describe('Column resizing', () => {
    beforeEach(() => {
      cy.viewport(900, 600);
    });

    const validateHeaderWidth = (columnId: string, width: number) => {
      cy.get('div')
        .contains(columnId)
        .should(el => expect(el.width()).eq(width));
    };

    it('renders ideal column widths', () => {
      const columnSizingOptions = {
        first: {
          idealWidth: 150,
          minWidth: 70,
        },
        second: {
          idealWidth: 160,
          minWidth: 80,
        },
        third: {
          idealWidth: 170,
          minWidth: 90,
        },
      };
      const ResizableDataGrid = () => (
        <DataGrid items={testItems} columns={testColumns} resizableColumns columnSizingOptions={columnSizingOptions}>
          <DataGridHeader>
            <DataGridRow<Item>>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<Item>>
            {({ item }) => (
              <DataGridRow<Item>>
                {({ renderCell, columnId }) => (
                  <DataGridCell focusMode={columnId === 'action' ? 'none' : 'cell'}>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      );

      mount(<ResizableDataGrid />);

      // Ideal widths
      validateHeaderWidth('header-1', 150);
      validateHeaderWidth('header-2', 160);
      validateHeaderWidth('header-3', 526); // this is ideal + rest of the space

      // Minimum widths
      cy.viewport(200, 600);
      validateHeaderWidth('header-1', 70);
      validateHeaderWidth('header-2', 80);
      validateHeaderWidth('header-3', 90);

      // growing
      cy.viewport(400, 600);

      validateHeaderWidth('header-1', 150);
      validateHeaderWidth('header-2', 96);
      validateHeaderWidth('header-3', 90);

      // Ideal widths again
      cy.viewport(900, 600);
      validateHeaderWidth('header-1', 150);
      validateHeaderWidth('header-2', 160);
      validateHeaderWidth('header-3', 526);
    });
  });
});
