import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  createTableColumn,
} from '@fluentui/react-table';
import type { DataGridProps, TableColumnDefinition } from '@fluentui/react-table';
import { DataGridRow } from './DataGridRow';
import type { DataGridRowProps } from './DataGridRow.types';
import { useColumnIdContext } from '../../contexts/columnIdContext';

type Item = { id: string; name: string; amount: number };
const items: Item[] = [
  { id: 'alpha', name: 'Alpha', amount: 1 },
  { id: 'beta', name: 'Beta', amount: 2 },
  { id: 'gamma', name: 'Gamma', amount: 3 },
];
const columns = [
  createTableColumn<Item>({
    columnId: 'name',
    renderHeaderCell: () => 'Name',
    compare: (a, b) => a.name.localeCompare(b.name),
    renderCell: item => item.name,
  }),
  createTableColumn<Item>({
    columnId: 'amount',
    renderHeaderCell: () => 'Amount',
    compare: (a, b) => a.amount - b.amount,
    renderCell: item => item.amount,
  }),
];
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const row = (id = 'alpha') => cy.get(`#row-${id}`);
const Grid = ({
  rowProps,
  headerProps,
  ...props
}: Partial<DataGridProps> & {
  rowProps?: Partial<DataGridRowProps<Item>> & { ref?: React.Ref<HTMLElement> };
  headerProps?: Partial<DataGridRowProps<Item>>;
}) => (
  <DataGrid items={items} columns={columns} getRowId={(item: Item) => item.id} aria-label="Records" {...props}>
    <DataGridHeader>
      <DataGridRow
        id="header"
        selectionCell={props.selectionMode ? { checkboxIndicator: { 'aria-label': 'Select all records' } } : undefined}
        {...headerProps}
      >
        {column => <DataGridHeaderCell>{column.renderHeaderCell()}</DataGridHeaderCell>}
      </DataGridRow>
    </DataGridHeader>
    <DataGridBody<Item>>
      {({ item, rowId }) => (
        <DataGridRow<Item>
          key={rowId}
          id={`row-${rowId}`}
          selectionCell={
            props.selectionMode
              ? {
                  checkboxIndicator: { 'aria-label': `Select ${item.name}` },
                  radioIndicator: { 'aria-label': `Select ${item.name}` },
                }
              : undefined
          }
          {...rowProps}
        >
          {rowProps?.children ?? (column => <DataGridCell>{column.renderCell(item)}</DataGridCell>)}
        </DataGridRow>
      )}
    </DataGridBody>
  </DataGrid>
);

describe('DataGridRow documented contracts (round 1)', () => {
  it('default renders function children in column order and no selection indicator', () => {
    mount(<Grid />);
    row().should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'row').and('not.have.attr', 'aria-selected');
    row()
      .find('[role="gridcell"]')
      .should('have.length', 2)
      .then($cells => expect([...$cells].map(cell => cell.textContent)).to.deep.equal(['Alpha', '1']));
    cy.get('input').should('not.exist');
  });

  describe('DataGridRow adversarial improvements (final)', () => {
    it('composite native ArrowDown enters the next row; Enter enters cells and Escape restores its row', () => {
      mount(<Grid focusMode="composite" />);
      row().focus().realPress('ArrowDown');
      row('beta').should('have.focus').realPress('Enter');
      row('beta').find('.fui-DataGridCell').first().should('have.focus').realPress('ArrowRight');
      row('beta').find('.fui-DataGridCell').last().should('have.focus').realPress('Escape');
      row('beta').should('have.focus');
    });

    it('cell focus native ArrowDown preserves the matching column and custom row identity', () => {
      mount(<Grid focusMode="cell" />);
      row().find('.fui-DataGridCell').last().focus().realPress('ArrowDown');
      row('beta').find('.fui-DataGridCell').last().should('have.focus').realPress('ArrowUp');
      row().find('.fui-DataGridCell').last().should('have.focus');
    });

    it('group cell nested controls can be entered and escaped with native keys without selecting the row', () => {
      const change = cy.stub().as('change');
      mount(
        <Grid
          selectionMode="multiselect"
          onSelectionChange={change}
          rowProps={{
            children: () => (
              <DataGridCell focusMode="group">
                <button>One</button>
                <button>Two</button>
              </DataGridCell>
            ),
          }}
        />,
      );
      row().find('.fui-DataGridCell').first().focus().realPress('Enter');
      row().find('button').first().should('have.focus').realPress('Tab');
      row().find('button').eq(1).should('have.focus').realPress('Escape');
      row().find('.fui-DataGridCell').first().should('have.focus');
      cy.get('@change').should('not.have.been.called');
    });

    it('sortable header reorders persistent custom-ID rows without losing default selection', () => {
      let initial: HTMLElement;
      const change = cy.stub().as('change');
      mount(
        <Grid
          sortable
          selectionMode="multiselect"
          defaultSelectedItems={['alpha']}
          onSelectionChange={change}
          defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
        />,
      );
      row().then($row => {
        initial = $row[0];
      });
      cy.get('#header .fui-DataGridHeaderCell').first().realClick();
      cy.get('.fui-DataGridBody')
        .children('[role="row"]')
        .then($rows =>
          expect([...$rows].map(element => element.id)).to.deep.equal(['row-gamma', 'row-beta', 'row-alpha']),
        );
      row()
        .should('have.attr', 'aria-selected', 'true')
        .should($row => expect($row[0]).to.equal(initial));
      cy.get('@change').should('not.have.been.called');
    });

    it('controlled sorting keeps row order until the owner accepts its requested state', () => {
      const sort = cy.stub().as('sort');
      mount(<Grid sortable sortState={{ sortColumn: 'name', sortDirection: 'ascending' }} onSortChange={sort} />);
      cy.get('#header .fui-DataGridHeaderCell').first().realClick();
      cy.get('.fui-DataGridBody').children().first().should('have.id', 'row-alpha');
      cy.get('@sort')
        .should('have.been.calledOnce')
        .then(() => {
          expect(sort.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
          expect(sort.firstCall.args[1]).to.deep.equal({ sortColumn: 'name', sortDirection: 'descending' });
        });
    });

    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`${dir}: resizable column widths align body/header cells through row column contexts`, () => {
        mount(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <Grid
              resizableColumns
              resizableColumnsOptions={{ autoFitColumns: false }}
              columnSizingOptions={{ name: { defaultWidth: 180 }, amount: { defaultWidth: 140 } }}
            />
          </FluentProvider>,
        );
        row()
          .find('.fui-DataGridCell')
          .should($cells => {
            expect(getComputedStyle($cells[0]).width).to.equal('180px');
            expect(getComputedStyle($cells[1]).width).to.equal('140px');
            expect($cells[0].getBoundingClientRect().width).to.equal(196);
            expect($cells[1].getBoundingClientRect().width).to.equal(156);
          });
        cy.get('#header .fui-DataGridHeaderCell').should($cells => {
          expect($cells[0].getBoundingClientRect().width).to.equal(196);
          expect($cells[1].getBoundingClientRect().width).to.equal(156);
        });
      });
    });

    it('removing a row detaches its ref; remaining row IDs, state and function children remain correct', () => {
      const ref = React.createRef<HTMLElement>();
      const Example = () => {
        const [reduced, setReduced] = React.useState(false);
        return (
          <>
            <button onClick={() => setReduced(true)}>Remove</button>
            <Grid
              items={reduced ? items.slice(0, 2) : items}
              selectionMode="multiselect"
              defaultSelectedItems={['alpha']}
              rowProps={{ ref }}
            />
          </>
        );
      };
      mount(<Example />);
      row('gamma').should($row => expect(ref.current).to.equal($row[0]));
      cy.contains('button', 'Remove').realClick();
      row('gamma')
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
      row().should('have.attr', 'aria-selected', 'true').and('contain.text', 'Alpha');
      row('beta').find('.fui-DataGridCell').first().realClick();
      row('beta').should('have.attr', 'aria-selected', 'true');
    });
  });

  describe('DataGridRow unit-derived contracts (round 3)', () => {
    it('without grid context renders a row and does not invoke children for nonexistent columns', () => {
      const renderCell = cy.stub().as('renderCell');
      mount(<DataGridRow>{renderCell}</DataGridRow>);
      cy.get('.fui-DataGridRow').should('have.attr', 'role', 'row').and('be.empty');
      cy.get('@renderCell').should('not.have.been.called');
    });

    it('each render function receives the exact column object, latest grid context and matching column ID', () => {
      const seen: Array<{ column: TableColumnDefinition<Item>; contextColumns: TableColumnDefinition<Item>[] }> = [];
      const ColumnId = () => <span data-column-context>{useColumnIdContext()}</span>;
      mount(
        <Grid
          rowProps={{
            children: (column, context) => {
              seen.push({ column, contextColumns: context.columns });
              return (
                <DataGridCell>
                  <ColumnId />
                </DataGridCell>
              );
            },
          }}
        />,
      );
      row()
        .find('[data-column-context]')
        .then($spans => expect([...$spans].map(span => span.textContent)).to.deep.equal(['name', 'amount']));
      cy.then(() => {
        expect(seen).not.to.be.empty;
        seen.forEach(({ column, contextColumns }) => {
          expect(column).to.equal(columns.find(def => def.columnId === column.columnId));
          expect(contextColumns).to.equal(columns);
        });
      });
    });

    it('nonselectable row forwards native click and Space without preventing default or selection callback', () => {
      const change = cy.stub().as('change');
      const click = cy.stub().as('click');
      const keydown = cy.stub().as('keydown');
      mount(
        <Grid focusMode="row_unstable" onSelectionChange={change} rowProps={{ onClick: click, onKeyDown: keydown }} />,
      );
      row().realClick().realPress('Space');
      cy.get('@change').should('not.have.been.called');
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@keydown')
        .should('have.been.calledOnce')
        .then(() => {
          expect(keydown.firstCall.args[0].defaultPrevented).to.equal(false);
          expect(keydown.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
        });
      row().should('not.have.attr', 'aria-selected');
    });

    it('header native Space never toggles selection and remains uncancelled', () => {
      const change = cy.stub().as('change');
      const keydown = cy.stub().as('keydown');
      mount(
        <Grid
          selectionMode="multiselect"
          onSelectionChange={change}
          headerProps={{ tabIndex: 0, onKeyDown: keydown }}
        />,
      );
      cy.get('#header').focus().realPress('Space');
      cy.get('@change').should('not.have.been.called');
      cy.get('@keydown')
        .should('have.been.calledOnce')
        .then(() => expect(keydown.firstCall.args[0].defaultPrevented).to.equal(false));
      row().should('have.attr', 'aria-selected', 'false');
    });

    it('null selection slot removes indicator without disabling native row selection', () => {
      const change = cy.stub().as('change');
      mount(<Grid selectionMode="multiselect" onSelectionChange={change} rowProps={{ selectionCell: null }} />);
      row().find('.fui-DataGridRow__selectionCell').should('not.exist');
      row().find('.fui-DataGridCell').first().realClick();
      row().should('have.attr', 'aria-selected', 'true');
      cy.get('@change').should('have.been.calledOnce');
    });

    it('explicit root and selection-slot attributes override inferred values but forced div remains', () => {
      mount(
        <Grid
          selectionMode="multiselect"
          defaultSelectedItems={['alpha']}
          rowProps={{
            as: 'tr',
            'aria-selected': false,
            appearance: 'none',
            selectionCell: {
              checked: false,
              className: 'custom-selection',
              checkboxIndicator: { 'aria-label': 'Override indicator', checked: true },
            },
          }}
        />,
      );
      row().should('have.prop', 'tagName', 'DIV').and('have.attr', 'aria-selected', 'false');
      row().find('.fui-DataGridRow__selectionCell').should('have.class', 'custom-selection');
      row().find('input').should('have.attr', 'aria-label', 'Override indicator').and('be.checked');
    });

    it('selection indicator real pointer click toggles exactly once through its row', () => {
      const change = cy.stub().as('change');
      mount(<Grid selectionMode="multiselect" onSelectionChange={change} />);
      row().find('.fui-DataGridRow__selectionCell').realClick();
      row().find('input[type="checkbox"]').should('be.checked');
      cy.get('@change')
        .should('have.been.calledOnce')
        .then(() => expect([...change.firstCall.args[1].selectedItems]).to.deep.equal(['alpha']));
    });

    it('column reorder and replacement update function children and contexts without remounting rows', () => {
      let initial: HTMLElement;
      const Example = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button onClick={() => setChanged(value => !value)}>Reorder</button>
            <Grid columns={changed ? [columns[1], columns[0]] : columns} />
          </>
        );
      };
      mount(<Example />);
      row().then($row => {
        initial = $row[0];
      });
      cy.contains('button', 'Reorder').realClick();
      row().should($row => expect($row[0]).to.equal(initial));
      row()
        .find('.fui-DataGridCell')
        .then($cells => expect([...$cells].map(cell => cell.textContent)).to.deep.equal(['1', 'Alpha']));
    });
  });

  describe('DataGridRow edges and accessibility (round 2)', () => {
    (['none', 'cell', 'row_unstable', 'composite'] as const).forEach(focusMode => {
      it(`${focusMode}: body/header row tabindex contract`, () => {
        mount(<Grid focusMode={focusMode} selectionMode="multiselect" />);
        if (focusMode === 'composite' || focusMode === 'row_unstable') {
          row().should('have.attr', 'tabindex', '0');
          row().focus().should('have.focus');
        } else {
          row().should('not.have.attr', 'tabindex');
          row().should('have.prop', 'tabIndex', -1);
        }
        cy.get('#header').should('not.have.attr', 'tabindex');
        if (focusMode === 'composite') {
          row().should('have.attr', 'data-tabster');
        }
      });
    });

    it('native Space selects once, prevents scrolling and passes the identical event to both callbacks', () => {
      const change = cy.stub().as('change');
      const keydown = cy.stub().as('keydown');
      mount(
        <Grid
          focusMode="row_unstable"
          selectionMode="multiselect"
          onSelectionChange={change}
          rowProps={{ onKeyDown: keydown }}
        />,
      );
      row().focus().realPress('Space');
      row().should('have.attr', 'aria-selected', 'true');
      cy.get('@change').should('have.been.calledOnce');
      cy.get('@keydown')
        .should('have.been.calledOnce')
        .then(() => {
          const [event, data] = change.firstCall.args;
          expect(event).to.equal(keydown.firstCall.args[0]);
          expect(event.type).to.equal('keydown');
          expect(event.key).to.equal(' ');
          expect(event.defaultPrevented).to.equal(true);
          expect(event.nativeEvent.isTrusted).to.equal(true);
          expect(event.target.id).to.equal('row-alpha');
          expect([...data.selectedItems]).to.deep.equal(['alpha']);
        });
      row().realPress('Space');
      row().should('have.attr', 'aria-selected', 'false');
      cy.get('@change').should('have.been.calledTwice');
    });

    it('native Enter does not select a row, and header click does not select any row', () => {
      const change = cy.stub().as('change');
      const keydown = cy.stub().as('keydown');
      mount(
        <Grid
          focusMode="row_unstable"
          selectionMode="multiselect"
          onSelectionChange={change}
          rowProps={{ onKeyDown: keydown }}
        />,
      );
      row().focus().realPress('Enter');
      cy.get('#header .fui-DataGridHeaderCell').last().realClick();
      row().should('have.attr', 'aria-selected', 'false');
      cy.get('@change').should('not.have.been.called');
      cy.get('@keydown')
        .should('have.been.calledOnce')
        .then(() => expect(keydown.firstCall.args[0].defaultPrevented).to.equal(false));
    });

    it('native click invokes selection before consumer handler, preserving exact event and target', () => {
      const order: string[] = [];
      const change = cy
        .stub()
        .callsFake(() => order.push('selection'))
        .as('change');
      const click = cy
        .stub()
        .callsFake((event: React.MouseEvent) => {
          order.push('consumer');
          event.preventDefault();
        })
        .as('click');
      mount(<Grid selectionMode="multiselect" onSelectionChange={change} rowProps={{ onClick: click }} />);
      row().find('.fui-DataGridCell').first().realClick();
      row().should('have.attr', 'aria-selected', 'true');
      cy.get('@click')
        .should('have.been.calledOnce')
        .then(() => {
          expect(order).to.deep.equal(['selection', 'consumer']);
          expect(change.firstCall.args[0]).to.equal(click.firstCall.args[0]);
          expect(change.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
          expect(change.firstCall.args[0].target.classList.contains('fui-DataGridCell')).to.equal(true);
        });
    });

    it('interactive child receives native Space without row key selection; its native click then bubbles once', () => {
      const change = cy.stub().as('change');
      const keydown = cy.stub().as('keydown');
      const button = cy.stub().as('button');
      const interactiveColumns = [
        createTableColumn<Item>({
          columnId: 'action',
          renderHeaderCell: () => 'Action',
          renderCell: () => <button onClick={button}>Run</button>,
        }),
        columns[1],
      ];
      mount(
        <Grid
          columns={interactiveColumns}
          selectionMode="multiselect"
          onSelectionChange={change}
          rowProps={{ onKeyDown: keydown }}
        />,
      );
      row().find('button').focus().realPress('Space');
      cy.get('@button').should('have.been.calledOnce');
      cy.get('@change')
        .should('have.been.calledOnce')
        .then(() => expect(change.firstCall.args[0].type).to.equal('click'));
      cy.get('@keydown')
        .should('have.been.calledOnce')
        .then(() => expect(keydown.firstCall.args[0].defaultPrevented).to.equal(false));
    });

    it('stopped child click does not reach row selection or consumer callback', () => {
      const change = cy.stub().as('change');
      const click = cy.stub().as('click');
      const interactiveColumns = [
        createTableColumn<Item>({
          columnId: 'action',
          renderHeaderCell: () => 'Action',
          renderCell: () => <button onClick={event => event.stopPropagation()}>Run</button>,
        }),
        columns[1],
      ];
      mount(
        <Grid
          columns={interactiveColumns}
          selectionMode="multiselect"
          onSelectionChange={change}
          rowProps={{ onClick: click }}
        />,
      );
      row().find('button').realClick();
      row().should('have.attr', 'aria-selected', 'false');
      cy.get('@change').should('not.have.been.called');
      cy.get('@click').should('not.have.been.called');
    });

    it('root native attributes, explicit tabindex, styles and ref identity survive selection rerender', () => {
      const ref = React.createRef<HTMLElement>();
      mount(
        <Grid
          selectionMode="multiselect"
          rowProps={{
            ref,
            tabIndex: -1,
            title: 'Record',
            className: 'custom-row',
            'aria-label': 'Custom record',
            style: { minHeight: 50 },
          }}
        />,
      );
      row()
        .should('have.attr', 'tabindex', '-1')
        .and('have.attr', 'title', 'Record')
        .and('have.attr', 'aria-label', 'Custom record')
        .and('have.class', 'custom-row')
        .should($row => {
          expect($row[0].getBoundingClientRect().height).to.be.at.least(50);
        });
      row('gamma').should($row => expect(ref.current).to.equal($row[0]));
      row('gamma').find('.fui-DataGridCell').first().realClick();
      row('gamma')
        .should('have.attr', 'aria-selected', 'true')
        .should($row => expect(ref.current).to.equal($row[0]));
    });

    it('live selected state and selection mode update existing row nodes and indicator types', () => {
      let initial: HTMLElement;
      const Example = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button onClick={() => setChanged(value => !value)}>Change</button>
            <Grid selectionMode={changed ? 'single' : 'multiselect'} selectedItems={changed ? ['beta'] : ['alpha']} />
          </>
        );
      };
      mount(<Example />);
      row().then($row => {
        initial = $row[0];
      });
      row().find('input[type="checkbox"]').should('be.checked');
      cy.contains('button', 'Change').realClick();
      row()
        .should('have.attr', 'aria-selected', 'false')
        .should($row => expect($row[0]).to.equal(initial));
      row('beta').find('input[type="radio"]').should('be.checked');
      cy.get('#header input[type="radio"]').should('not.exist');
    });
  });

  (['multiselect', 'single'] as const).forEach(selectionMode => {
    it(`${selectionMode}: default selection and real row-click transitions`, () => {
      mount(<Grid selectionMode={selectionMode} defaultSelectedItems={['alpha']} />);
      row().should('have.attr', 'aria-selected', 'true');
      row()
        .find(`input[type="${selectionMode === 'single' ? 'radio' : 'checkbox'}"]`)
        .should('be.checked');
      row('beta').find('.fui-DataGridCell').first().realClick();
      row('beta').should('have.attr', 'aria-selected', 'true');
      row().should('have.attr', 'aria-selected', selectionMode === 'single' ? 'false' : 'true');
      row('beta').find('.fui-DataGridCell').first().realClick();
      row('beta').should('have.attr', 'aria-selected', selectionMode === 'single' ? 'true' : 'false');
    });

    it(`${selectionMode}: frozen controlled state emits exact requested custom row IDs`, () => {
      const change = cy.stub().as('selection');
      mount(<Grid selectionMode={selectionMode} selectedItems={['alpha']} onSelectionChange={change} />);
      row('beta').find('.fui-DataGridCell').first().realClick();
      row('beta').should('have.attr', 'aria-selected', 'false');
      row().should('have.attr', 'aria-selected', 'true');
      cy.get('@selection')
        .should('have.been.calledOnce')
        .then(() => {
          const [event, data] = change.firstCall.args;
          expect(event.type).to.equal('click');
          expect(event.nativeEvent.isTrusted).to.equal(true);
          expect([...data.selectedItems]).to.deep.equal(selectionMode === 'single' ? ['beta'] : ['alpha', 'beta']);
        });
    });

    it(`${selectionMode}: controlled owner accepts selection changes`, () => {
      const Example = () => {
        const [selected, setSelected] = React.useState(new Set<string | number>(['alpha']));
        return (
          <Grid
            selectionMode={selectionMode}
            selectedItems={selected}
            onSelectionChange={(_, data) => setSelected(data.selectedItems)}
          />
        );
      };
      mount(<Example />);
      row('beta').find('.fui-DataGridCell').first().realClick();
      row('beta').should('have.attr', 'aria-selected', 'true');
      row().should('have.attr', 'aria-selected', selectionMode === 'single' ? 'false' : 'true');
    });
  });

  it('multiselect header transitions mixed -> all -> none through selection cell', () => {
    mount(<Grid selectionMode="multiselect" defaultSelectedItems={['alpha']} />);
    cy.get('#header input[type="checkbox"]').should('have.prop', 'indeterminate', true);
    cy.get('#header .fui-DataGridRow__selectionCell').realClick();
    cy.get('[id^="row-"]').each($row => cy.wrap($row).should('have.attr', 'aria-selected', 'true'));
    cy.get('#header input').should('be.checked').and('have.prop', 'indeterminate', false);
    cy.get('#header .fui-DataGridRow__selectionCell').realClick();
    cy.get('[id^="row-"]').each($row => cy.wrap($row).should('have.attr', 'aria-selected', 'false'));
  });

  (['brand', 'neutral', 'none'] as const).forEach(selectionAppearance => {
    it(`${selectionAppearance}: selected appearance remains semantically selected`, () => {
      mount(
        <Grid selectionMode="multiselect" selectionAppearance={selectionAppearance} defaultSelectedItems={['alpha']} />,
      );
      row().should('have.attr', 'aria-selected', 'true');
      row().then($row => {
        const selected = getComputedStyle($row[0]).backgroundColor;
        row('beta').then($other => {
          const other = getComputedStyle($other[0]).backgroundColor;
          expect(selected === other).to.equal(selectionAppearance === 'none');
        });
      });
    });
  });

  it('subtle unselected indicator becomes visible on native pointer hover', () => {
    mount(<Grid selectionMode="multiselect" subtleSelection />);
    cy.get('[aria-label="Records"]').realHover({ position: 'topLeft' });
    row().find('.fui-TableSelectionCell').should('have.css', 'opacity', '0');
    row().realHover();
    row().find('.fui-TableSelectionCell').should('have.css', 'opacity', '1');
  });
});
