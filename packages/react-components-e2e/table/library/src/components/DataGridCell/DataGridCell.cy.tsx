import * as React from 'react';
import * as axe from 'axe-core';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { useArrowNavigationGroup, useFocusableGroup } from '@fluentui/react-tabster';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import {
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  createTableColumn,
} from '@fluentui/react-table';
import type { DataGridProps, TableColumnId, TableRowId } from '@fluentui/react-table';
import { DataGridCell } from './DataGridCell';
import type { DataGridCellProps, DataGridCellSlots } from './DataGridCell.types';
import { TableContextProvider } from '../../contexts/tableContext';
import { DataGridContextProvider, dataGridContextDefaultValue } from '../../contexts/dataGridContext';
import { ColumnIdContextProvider, useColumnIdContext } from '../../contexts/columnIdContext';

type Item = { id: string; name: string; amount: number };
const items: Item[] = [
  { id: 'alpha', name: 'Alpha', amount: 2 },
  { id: 'beta', name: 'Beta', amount: 1 },
];
const columns = [
  createTableColumn<Item>({
    columnId: 'name',
    compare: (a, b) => a.name.localeCompare(b.name),
    renderHeaderCell: () => 'Name',
    renderCell: item => item.name,
  }),
  createTableColumn<Item>({
    columnId: 0,
    compare: (a, b) => a.amount - b.amount,
    renderHeaderCell: () => 'Amount',
    renderCell: item => item.amount,
  }),
];
const mount = (element: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider dir={dir} theme={dark ? webDarkTheme : webLightTheme}>
      {element}
    </FluentProvider>,
  );
const cell = (row = 'alpha', column: TableColumnId = 'name') => cy.get(`#cell-${row}-${column}`);
type GridProps = Partial<DataGridProps> & {
  cellProps?: DataGridCellProps & { ref?: React.Ref<HTMLDivElement>; 'data-owner'?: string };
  renderContent?: (item: Item, columnId: TableColumnId) => React.ReactNode;
  keyboardResize?: boolean;
};
const Grid = ({ cellProps, renderContent, keyboardResize, ...props }: GridProps) => (
  <DataGrid
    items={items}
    columns={columns}
    getRowId={(item: Item) => item.id}
    aria-label="Records"
    style={{ width: 600 }}
    {...props}
  >
    <DataGridHeader>
      <DataGridRow
        selectionCell={props.selectionMode ? { checkboxIndicator: { 'aria-label': 'Select all records' } } : undefined}
      >
        {(column, context) => (
          <DataGridHeaderCell
            id={`header-${column.columnId}`}
            onContextMenu={
              keyboardResize ? context.columnSizing_unstable.enableKeyboardMode(column.columnId) : undefined
            }
          >
            {column.renderHeaderCell()}
          </DataGridHeaderCell>
        )}
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
        >
          {column => (
            <DataGridCell id={`cell-${rowId}-${column.columnId}`} {...cellProps}>
              {cellProps?.children ?? (renderContent ? renderContent(item, column.columnId) : column.renderCell(item))}
            </DataGridCell>
          )}
        </DataGridRow>
      )}
    </DataGridBody>
  </DataGrid>
);
const Native = ({ children }: { children: React.ReactNode }) => (
  <TableContextProvider value={{ noNativeElements: false, size: 'medium', sortable: false }}>
    <table role="grid" aria-label="Native records">
      <thead>
        <tr>
          <th scope="col" id="name-header">
            Name
          </th>
          <th scope="col" id="amount-header">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>{children}</tr>
      </tbody>
    </table>
  </TableContextProvider>
);
const Controls = () => (
  <>
    <button>First action</button>
    <button>Second action</button>
  </>
);
const update = (rerender: (element: React.ReactNode) => void, element: React.ReactElement) =>
  rerender(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const auditSubfolder = `DataGridCell-audits-${Date.now()}-${Cypress._.uniqueId()}`;
const retainAudit = (name: string, result: axe.AxeResults) => {
  const override: unknown = Cypress.env('DataGridCellEvidence');
  const directory = override === undefined ? `${Cypress.config('downloadsFolder')}/${auditSubfolder}` : override;
  if (typeof directory !== 'string' || !directory) {
    throw new Error('DataGridCellEvidence must be a non-empty directory path when provided');
  }
  return cy.writeFile(`${directory.replace(/\\/g, '/').replace(/\/$/, '')}/${name}.json`, {
    violations: result.violations,
    incomplete: result.incomplete,
    passes: result.passes.map(finding => finding.id),
  });
};

describe('DataGridCell documentation contracts (round 1)', () => {
  it('renders default div gridcells in column order with no cell-owned selection or sort state', () => {
    mount(<Grid />);
    cell().should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'gridcell').and('have.text', 'Alpha');
    cell().should('have.class', 'fui-DataGridCell').and('have.class', 'fui-TableCell');
    cell().should('not.have.attr', 'aria-selected');
    cell().should('not.have.attr', 'aria-sort');
    cy.get('#row-alpha .fui-DataGridCell').then($cells =>
      expect([...$cells].map(element => element.textContent)).to.deep.equal(['Alpha', '2']),
    );
  });

  it('honors explicit native td selection inside a valid native table', () => {
    mount(
      <Native>
        <DataGridCell as="td" id="native" colSpan={2} headers="name-header">
          Native content
        </DataGridCell>
      </Native>,
    );
    cy.get('#native').should('have.prop', 'tagName', 'TD').and('have.attr', 'role', 'gridcell');
    cy.get('#native').should('have.attr', 'colspan', '2').and('have.attr', 'headers', 'name-header');
    cy.get('#native').should('have.css', 'display', 'table-cell').and('have.css', 'height', '44px');
  });

  it('honors explicit div selection in a non-native grid', () => {
    mount(<Grid cellProps={{ as: 'div', title: 'Cell title', 'aria-label': 'Named cell' }} />);
    cell().should('have.prop', 'tagName', 'DIV').and('have.attr', 'title', 'Cell title');
    cell().should('have.attr', 'aria-label', 'Named cell').and('have.css', 'display', 'flex');
  });

  (['none', 'cell', 'row_unstable', 'composite'] as const).forEach(gridMode => {
    (['none', 'cell', 'group'] as const).forEach(cellMode => {
      it(`grid focus ${gridMode} with cell focus ${cellMode} exposes the supported focus contract`, () => {
        mount(<Grid focusMode={gridMode} cellProps={{ focusMode: cellMode }} />);
        const tabbable = (gridMode === 'cell' || gridMode === 'composite') && cellMode !== 'none';
        if (tabbable) {
          cell().should('have.attr', 'tabindex', '0');
        } else {
          cell().should('not.have.attr', 'tabindex');
        }
        cell().then($cell => {
          const tabster = $cell.attr('data-tabster');
          if (cellMode === 'group') {
            expect(JSON.parse(tabster ?? '{}').groupper.tabbability).to.equal(2);
          } else {
            expect(tabster).to.equal(undefined);
          }
        });
      });
    });
  });

  it('moves between actual cells with horizontal and vertical native arrow keys', () => {
    mount(<Grid />);
    cell().focus().realPress('ArrowRight');
    cell('alpha', 0).should('have.focus').realPress('ArrowDown');
    cell('beta', 0).should('have.focus').realPress('ArrowLeft');
    cell('beta').should('have.focus').realPress('ArrowUp');
    cell().should('have.focus');
  });

  it('composite rows enter cells with Enter and return to their row with Escape', () => {
    mount(<Grid focusMode="composite" />);
    cy.get('#row-alpha').focus().realPress('Enter');
    cell().should('have.focus').realPress('ArrowRight');
    cell('alpha', 0).should('have.focus').realPress('Escape');
    cy.get('#row-alpha').should('have.focus').realPress('ArrowDown');
    cy.get('#row-beta').should('have.focus').realPress('Enter');
    cell('beta').should('have.focus');
  });

  it('group Enter enters interactive children, Tab cycles and Escape restores the cell', () => {
    mount(<Grid cellProps={{ focusMode: 'group' }} renderContent={() => <Controls />} />);
    cell().focus().realPress('Enter');
    cell().find('button').first().should('have.focus').realPress('Tab');
    cell().find('button').last().should('have.focus').realPress('Tab');
    cell().find('button').first().should('have.focus').realPress('Escape');
    cell().should('have.focus');
  });

  it('none leaves a single action navigable without adding a cell tab stop', () => {
    mount(<Grid cellProps={{ focusMode: 'none' }} renderContent={() => <button>Open record</button>} />);
    cell().should('not.have.attr', 'tabindex');
    cell().find('button').focus().realPress('ArrowDown');
    cell('beta').find('button').should('have.focus');
  });

  (['extra-small', 'small', 'medium'] as const).forEach((size, index) => {
    it(`non-native ${size} density has the documented geometry`, () => {
      mount(<Grid size={size} />);
      cell().should('have.css', 'min-height', `${[24, 34, 44][index]}px`);
      cell().then($cell => expect($cell[0].getBoundingClientRect().height).to.equal([24, 34, 44][index]));
    });
  });

  it('row selection triggered through a cell remains row-owned', () => {
    const changed = cy.stub().as('selection');
    mount(<Grid selectionMode="multiselect" onSelectionChange={changed} />);
    cell().click();
    cy.get('#row-alpha').should('have.attr', 'aria-selected', 'true');
    cell().should('not.have.attr', 'aria-selected');
    cy.get('@selection').should('have.been.calledOnce');
    cell().focus().realPress('Space');
    cy.get('#row-alpha').should('have.attr', 'aria-selected', 'false');
    cy.get('@selection').should('have.been.calledTwice');
  });

  it('header sorting reorders row data without making body cells sort controls', () => {
    mount(<Grid sortable />);
    cy.get('#header-0').click();
    cy.get('.fui-DataGridBody .fui-DataGridRow').first().should('have.id', 'row-beta');
    cell('beta', 0).should('have.text', '1').and('not.have.attr', 'aria-sort');
    cell('beta', 0).click();
    cy.get('#header-0').should('have.attr', 'aria-sort', 'ascending');
  });

  it('column sizing uses both string and zero numeric column IDs', () => {
    mount(
      <Grid
        resizableColumns
        resizableColumnsOptions={{ autoFitColumns: false }}
        columnSizingOptions={{
          name: { minWidth: 120, idealWidth: 180 },
          0: { minWidth: 100, idealWidth: 220 },
        }}
      />,
    );
    cell().should('have.css', 'width', '180px');
    cell('alpha', 0).should('have.css', 'width', '220px');
    cell().then($cell => expect($cell[0].getBoundingClientRect().width).to.equal(196));
    cell('alpha', 0).then($cell => expect($cell[0].getBoundingClientRect().width).to.equal(236));
    cell().find('[role="separator"]').should('not.exist');
  });
});

describe('DataGridCell edges and accessibility (round 2)', () => {
  it('forwards native div ref, arbitrary data, class, style and ARIA relationships', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <>
        <span id="cell-label">Account name</span>
        <span id="cell-description">Read only</span>
        <Grid
          cellProps={{
            ref,
            className: 'consumer-cell',
            style: { paddingInline: 12 },
            'aria-labelledby': 'cell-label',
            'aria-describedby': 'cell-description',
            'data-owner': 'consumer',
          }}
        />
      </>,
    );
    cell('beta', 0).then($cell => expect(ref.current).to.equal($cell[0]));
    cell().should('have.class', 'consumer-cell').and('have.attr', 'data-owner', 'consumer');
    cell().should('have.css', 'padding-left', '12px').and('have.css', 'padding-right', '12px');
    cell().then($cell => {
      expect(computeAccessibleName($cell[0])).to.equal('Account name');
      expect(computeAccessibleDescription($cell[0])).to.equal('Read only');
    });
  });

  it('root render function preserves generated attributes, ref and interactive children', () => {
    const ref = React.createRef<HTMLDivElement>();
    const renderRoot: SlotRenderFunction<ExtractSlotProps<DataGridCellSlots['root']>> = (Component, props) =>
      React.createElement<React.HTMLAttributes<HTMLElement>>(
        Component,
        { ...props, title: 'root-function' },
        <button>Rendered action</button>,
      );
    mount(
      <Grid
        cellProps={{
          ref,
          focusMode: 'group',
          children: renderRoot,
        }}
      />,
    );
    cell().should('have.attr', 'title', 'root-function').and('have.attr', 'role', 'gridcell');
    cell('beta', 0).then($cell => expect(ref.current).to.equal($cell[0]));
    cell().focus().realPress('Enter');
    cell().find('button').should('have.focus').realPress('Escape');
    cell().should('have.focus');
  });

  it('forwards native keydown and keyup with original key and currentTarget', () => {
    const down = cy.stub().as('down');
    const up = cy.stub().as('up');
    const gridDown = cy.stub().as('gridDown');
    const received: { type: string; key: string; target: EventTarget; currentTarget: HTMLElement }[] = [];
    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
      received.push({ type: 'down', key: event.key, target: event.target, currentTarget: event.currentTarget });
      down(event);
    };
    const onKeyUp = (event: React.KeyboardEvent<HTMLElement>) => {
      received.push({ type: 'up', key: event.key, target: event.target, currentTarget: event.currentTarget });
      up(event);
    };
    mount(<Grid cellProps={{ onKeyDown, onKeyUp }} onKeyDown={gridDown} />);
    cell().focus().realPress('x');
    cell().then($cell => {
      expect(down).to.have.been.calledOnce;
      expect(up).to.have.been.calledOnce;
      expect(down.firstCall.args[0].key).to.equal('x');
      expect(down.firstCall.args[0].target).to.equal($cell[0]);
      expect(up.firstCall.args[0].key).to.equal('x');
      expect(received).to.deep.equal([
        { type: 'down', key: 'x', target: $cell[0], currentTarget: $cell[0] },
        { type: 'up', key: 'x', target: $cell[0], currentTarget: $cell[0] },
      ]);
      expect(gridDown.firstCall.args[0]).to.equal(down.firstCall.args[0]);
    });
  });

  it('consumer preventDefault on ctrl End is forwarded and blocks grid end navigation', () => {
    const seen: { key: string; prevented: boolean }[] = [];
    mount(
      <Grid
        cellProps={{ onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => event.preventDefault() }}
        onKeyDown={(event: React.KeyboardEvent<HTMLElement>) =>
          seen.push({ key: event.key, prevented: event.defaultPrevented })
        }
      />,
    );
    cell().focus().realPress(['Control', 'End']);
    cell().should('have.focus');
    cy.then(() => expect(seen.find(event => event.key === 'End')).to.deep.equal({ key: 'End', prevented: true }));
  });

  it('unprevented ctrl End and ctrl Home reach the last body and first header cells', () => {
    mount(<Grid />);
    cell().focus().realPress(['Control', 'End']);
    cell('beta', 0).should('have.focus').realPress(['Control', 'Home']);
    cy.get('#header-name').should('have.focus');
  });

  it('interactive button Space activates the child without keyboard row selection', () => {
    const selection = cy.stub().as('selection');
    const click = cy.stub().as('action');
    mount(
      <Grid
        selectionMode="multiselect"
        onSelectionChange={selection}
        cellProps={{ focusMode: 'group' }}
        renderContent={() => <button onClick={click}>Run action</button>}
      />,
    );
    cell().focus().realPress('Enter');
    cell().find('button').should('have.focus').realPress('Space');
    cy.get('@action').should('have.been.calledOnce');
    // Native button click bubbles to the row; this is distinct from row keyboard selection.
    cy.get('@selection').should('have.been.calledOnce');
    cell().should('not.have.attr', 'aria-selected');
  });

  it('stopped child click bubbling leaves row selection unchanged', () => {
    const selection = cy.stub().as('selection');
    mount(
      <Grid
        selectionMode="multiselect"
        onSelectionChange={selection}
        renderContent={() => <button onClick={event => event.stopPropagation()}>Local action</button>}
      />,
    );
    cell().find('button').click();
    cy.get('@selection').should('not.have.been.called');
    cy.get('#row-alpha').should('have.attr', 'aria-selected', 'false');
  });

  it('dynamic items and children update in place and retain focus in a stable keyed cell', () => {
    let original: HTMLElement;
    mount(<Grid />).then(({ rerender }) => {
      cell()
        .focus()
        .then($cell => {
          original = $cell[0];
        });
      cy.then(() => update(rerender, <Grid items={items.map(item => ({ ...item, name: `${item.name} updated` }))} />));
      cell()
        .should('have.text', 'Alpha updated')
        .and('have.focus')
        .then($cell => expect($cell[0]).to.equal(original));
      cy.then(() => update(rerender, <Grid renderContent={() => <strong>Replacement</strong>} />));
      cell().should('have.focus').find('strong').should('have.text', 'Replacement');
    });
  });

  it('reordering keyed columns retains the original cell and its column data', () => {
    let original: HTMLElement;
    mount(<Grid />).then(({ rerender }) => {
      cell()
        .focus()
        .then($cell => {
          original = $cell[0];
        });
      cy.then(() => update(rerender, <Grid columns={[columns[1], columns[0]]} />));
      cy.get('#row-alpha .fui-DataGridCell').first().should('have.id', 'cell-alpha-0').and('have.text', '2');
      cell()
        .should('have.focus')
        .then($cell => expect($cell[0]).to.equal(original));
    });
  });

  it('removing a row detaches its cell refs and preserves other row data', () => {
    const detached: (HTMLElement | null)[] = [];
    const ref = (element: HTMLDivElement | null) => {
      detached.push(element);
    };
    mount(<Grid cellProps={{ ref }} />).then(({ rerender }) => {
      cy.then(() => update(rerender, <Grid items={[items[1]]} cellProps={{ ref }} />));
      cell().should('not.exist');
      cell('beta').should('have.text', 'Beta');
      cy.then(() => expect(detached).to.include(null));
    });
  });

  it('dynamic grid and cell focus modes replace tabindex and group attributes without stale state', () => {
    mount(<Grid cellProps={{ focusMode: 'group' }} />).then(({ rerender }) => {
      cell().should('have.attr', 'data-tabster');
      cy.then(() => update(rerender, <Grid focusMode="none" cellProps={{ focusMode: 'none' }} />));
      cell().should('not.have.attr', 'tabindex');
      cell().should('not.have.attr', 'data-tabster');
      cy.then(() => update(rerender, <Grid cellProps={{ focusMode: 'cell' }} />));
      cell().should('have.attr', 'tabindex', '0');
      cell().focus().realPress('ArrowDown');
      cell('beta').should('have.focus');
    });
  });

  it('latest consumer event closures replace old cell handlers', () => {
    const old = cy.stub().as('old');
    const latest = cy.stub().as('latest');
    mount(<Grid cellProps={{ onClick: old }} />).then(({ rerender }) => {
      cell().click();
      cy.then(() => update(rerender, <Grid cellProps={{ onClick: latest }} />));
      cell().click();
      cy.get('@old').should('have.been.calledOnce');
      cy.get('@latest').should('have.been.calledOnce');
    });
  });

  it('native td callback ref detaches when the cell is removed', () => {
    const old = cy.stub().as('nativeOldClick');
    const latest = cy.stub().as('nativeLatestClick');
    const parent = cy.stub().as('nativeParentClick');
    const ref = cy.stub().as('nativeEventRef');
    const fixture = (handler: typeof old, changed = false, removed = false) => (
      <div onClick={event => parent(event.nativeEvent)}>
        <Native>
          {!removed && (
            <DataGridCell
              as="td"
              id="native-event"
              ref={ref}
              colSpan={2}
              rowSpan={2}
              headers="name-header amount-header"
              focusMode={changed ? 'none' : 'cell'}
              tabIndex={changed ? -1 : 2}
              className={changed ? 'latest-native-class' : 'initial-native-class'}
              title={changed ? 'Latest native props' : 'Initial native props'}
              onClick={event =>
                handler({
                  type: event.type,
                  target: event.target,
                  currentTarget: event.currentTarget,
                  nativeEvent: event.nativeEvent,
                })
              }
            >
              <span id="native-event-child">{changed ? 'Latest content' : 'Initial content'}</span>
            </DataGridCell>
          )}
        </Native>
      </div>
    );
    let original: HTMLElement;
    mount(fixture(old)).then(({ rerender }) => {
      cy.get('#native-event')
        .should('have.prop', 'tagName', 'TD')
        .and('have.attr', 'role', 'gridcell')
        .and('have.attr', 'tabindex', '2')
        .and('have.attr', 'colspan', '2')
        .and('have.attr', 'rowspan', '2')
        .and('have.attr', 'headers', 'name-header amount-header')
        .and('have.class', 'initial-native-class')
        .and('have.css', 'display', 'table-cell');
      cy.get('#native-event').then($cell => {
        original = $cell[0];
        expect(ref.lastCall.args[0]).to.equal(original);
      });
      cy.get('#native-event-child').realClick();
      cy.get('@nativeOldClick').should('have.been.calledOnce');
      cy.get('@nativeParentClick').should('have.been.calledOnce');
      cy.get('#native-event-child').then($child => {
        const received = old.firstCall.args[0];
        expect(received.type).to.equal('click');
        expect(received.target).to.equal($child[0]);
        expect(received.currentTarget).to.equal(original);
        expect(received.nativeEvent.isTrusted).to.equal(true);
        expect(received.nativeEvent.type).to.equal('click');
        expect(received.nativeEvent).to.equal(parent.firstCall.args[0]);
      });
      cy.then(() => update(rerender, fixture(latest, true)));
      cy.get('#native-event')
        .should('have.attr', 'tabindex', '-1')
        .and('have.attr', 'title', 'Latest native props')
        .and('have.class', 'latest-native-class')
        .and('not.have.class', 'initial-native-class')
        .and('not.have.attr', 'data-tabster');
      cy.get('#native-event').then($cell => expect($cell[0]).to.equal(original));
      cy.get('#native-event-child').should('have.text', 'Latest content').realClick();
      cy.get('@nativeOldClick').should('have.been.calledOnce');
      cy.get('@nativeLatestClick').should('have.been.calledOnce');
      cy.get('@nativeParentClick').should('have.been.calledTwice');
      cy.then(() => {
        expect(latest.firstCall.args[0].currentTarget).to.equal(original);
        expect(latest.firstCall.args[0].nativeEvent).to.equal(parent.lastCall.args[0]);
        expect(latest.firstCall.args[0].nativeEvent).not.to.equal(old.firstCall.args[0].nativeEvent);
      });
      cy.then(() => update(rerender, fixture(latest, true, true)));
      cy.get('#native-event').should('not.exist');
      cy.get('@nativeEventRef').should('have.been.calledWith', null);
    });
  });

  it('two sibling grids isolate cell focus and row selection contexts', () => {
    mount(
      <>
        <section id="left">
          <Grid focusMode="none" selectionMode="multiselect" defaultSelectedItems={['alpha']} />
        </section>
        <section id="right">
          <Grid />
        </section>
      </>,
    );
    cy.get('#left #cell-alpha-name').should('not.have.attr', 'tabindex');
    cy.get('#left #row-alpha').should('have.attr', 'aria-selected', 'true');
    cy.get('#right #cell-alpha-name').should('have.attr', 'tabindex', '0');
    cy.get('#right #row-alpha').should('not.have.attr', 'aria-selected');
    cy.get('#right #cell-alpha-name').focus().realPress('ArrowDown');
    cy.get('#right #cell-beta-name').should('have.focus');
  });

  it('RTL uses visual horizontal arrow navigation while retaining logical column IDs', () => {
    mount(<Grid />, 'rtl');
    cell().focus().realPress('ArrowLeft');
    cell('alpha', 0).should('have.focus').realPress('ArrowRight');
    cell().should('have.focus');
    cell().then($first => {
      cell('alpha', 0).then($second =>
        expect($first[0].getBoundingClientRect().left).to.be.greaterThan($second[0].getBoundingClientRect().left),
      );
    });
  });

  ([false, true] as const).forEach(dark => {
    it(`${dark ? 'dark' : 'light'} theme preserves readable inherited text and visible cell focus`, () => {
      mount(<Grid />, 'ltr', dark);
      cell().focus().realPress('ArrowDown');
      cell('beta')
        .should('have.focus')
        .and('have.css', 'outline-style', 'solid')
        .and('have.css', 'outline-width', '2px');
      cell('beta').should('have.css', 'color', dark ? 'rgb(255, 255, 255)' : 'rgb(36, 36, 36)');
      cell('beta').should('have.css', 'outline-color', dark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
    });
  });

  it('native Shift Tab cycles backwards inside a group and Escape restores its cell', () => {
    mount(<Grid cellProps={{ focusMode: 'group' }} renderContent={() => <Controls />} />);
    cell().focus().realPress('Enter');
    cell().find('button').first().should('have.focus').realPress(['Shift', 'Tab']);
    cell().find('button').last().should('have.focus').realPress('Escape');
    cell().should('have.focus');
  });

  it('group child input accepts text and arrows without cell movement', () => {
    mount(<Grid cellProps={{ focusMode: 'group' }} renderContent={() => <input aria-label="Edit name" />} />);
    cell().focus().realPress('Enter');
    cell().find('input').should('have.focus').type('Alpha').realPress('ArrowLeft');
    cell().find('input').should('have.focus').and('have.value', 'Alpha').realPress('Escape');
    cell().should('have.focus');
  });

  it('full-grid axe characterizes only the known inherited Tabster dummy aria-hidden-focus boundary', () => {
    mount(<Grid cellProps={{ focusMode: 'group' }} renderContent={() => <Controls />} />);
    cell().focus().realPress('Enter');
    cell().find('button').first().should('have.focus').realPress('Escape');
    cell().should('have.focus');
    cy.get('.fui-DataGrid [data-tabster-dummy]').should('have.length', 10);
    cy.get('.fui-DataGrid')
      .then(async $grid => {
        const result = await axe.run($grid[0]);
        expect(result.violations.map(finding => finding.id)).to.deep.equal(['aria-hidden-focus']);
        const finding = result.violations[0];
        expect(finding.nodes.map(node => node.target)).to.deep.equal([
          ['.fui-DataGrid > i:nth-child(1)'],
          ['#row-alpha > i:nth-child(1)'],
          ['#row-alpha > i:nth-child(3)'],
          ['#row-alpha > i:nth-child(4)'],
          ['#row-alpha > i:nth-child(6)'],
          ['#row-beta > i:nth-child(1)'],
          ['#row-beta > i:nth-child(3)'],
          ['#row-beta > i:nth-child(4)'],
          ['#row-beta > i:nth-child(6)'],
          ['.fui-DataGrid > i:nth-child(4)'],
        ]);
        expect($grid[0].querySelectorAll('[data-tabster-dummy][aria-hidden="true"][tabindex="0"]')).to.have.length(10);
        finding.nodes.forEach(node => {
          expect(node.any).to.deep.equal([]);
          expect(node.none).to.deep.equal([]);
          expect(node.all.map(check => check.id)).to.deep.equal(['focusable-not-tabbable']);
        });
        expect(result.incomplete, JSON.stringify(result.incomplete)).to.deep.equal([]);
        return result;
      })
      .then(result => retainAudit('axe-full-grid-tabster-boundary', result));
  });

  it('native table fixture passes axe and exposes its explicitly named gridcell', () => {
    mount(
      <Native>
        <DataGridCell as="td" aria-label="Record name">
          Alpha
        </DataGridCell>
        <DataGridCell as="td">2</DataGridCell>
      </Native>,
    );
    cy.get('td')
      .first()
      .then($cell => expect(computeAccessibleName($cell[0])).to.equal('Record name'));
    cy.get('table')
      .then(async $grid => {
        const result = await axe.run($grid[0]);
        expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([]);
        expect(result.incomplete, JSON.stringify(result.incomplete)).to.deep.equal([]);
        return result;
      })
      .then(result => retainAudit('axe-native-clean', result));
  });
});

describe('DataGridCell source and unit regressions (round 3)', () => {
  (['single', 'multiselect'] as const).forEach(selectionMode => {
    it(`controlled ${selectionMode} owner updates selection through cells without adding cell-owned state`, () => {
      const Owner = () => {
        const [selectedItems, setSelectedItems] = React.useState(new Set<TableRowId>());
        const onSelectionChange: NonNullable<DataGridProps['onSelectionChange']> = (_event, data) =>
          setSelectedItems(new Set(data.selectedItems));
        return (
          <Grid selectionMode={selectionMode} selectedItems={selectedItems} onSelectionChange={onSelectionChange} />
        );
      };
      mount(<Owner />);
      cell().click();
      cy.get('#row-alpha').should('have.attr', 'aria-selected', 'true');
      cell('beta').click();
      cy.get('#row-beta').should('have.attr', 'aria-selected', 'true');
      cy.get('#row-alpha').should('have.attr', 'aria-selected', selectionMode === 'single' ? 'false' : 'true');
      cell('beta').should('not.have.attr', 'aria-selected');
    });
  });

  it('native td root render function preserves native props, ref and content', () => {
    const ref = React.createRef<HTMLDivElement>();
    const renderRoot: SlotRenderFunction<ExtractSlotProps<DataGridCellSlots['root']>> = (Component, props) =>
      React.createElement<React.HTMLAttributes<HTMLElement>>(
        Component,
        props,
        <strong>Rendered native content</strong>,
      );
    mount(
      <Native>
        <DataGridCell as="td" id="native-render" ref={ref} colSpan={2} headers="name-header amount-header">
          {renderRoot}
        </DataGridCell>
      </Native>,
    );
    cy.get('#native-render').should('have.prop', 'tagName', 'TD').and('have.attr', 'colspan', '2');
    cy.get('#native-render').should('have.attr', 'headers', 'name-header amount-header');
    cy.get('#native-render').then($cell => expect(ref.current).to.equal($cell[0]));
    cy.get('#native-render strong').should('have.text', 'Rendered native content');
  });

  it('native Tab enters the grid and exits after cell navigation without leaking a tab stop', () => {
    mount(
      <>
        <button id="before">Before</button>
        <Grid />
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus().realPress('Tab');
    cy.get('#header-name').should('have.focus').realPress('ArrowDown');
    cell().should('have.focus').realPress('Tab');
    cy.get('#after').should('have.focus');
  });

  it('empty group Enter does not invent an interactive child or lose its cell focus', () => {
    mount(<Grid cellProps={{ focusMode: 'group' }} renderContent={() => null} />);
    cell().focus().realPress('Enter');
    cell().should('have.focus');
    cell().find('button,input,a').should('not.exist');
    cell().realPress('Escape');
    cell().should('have.focus');
  });

  it('native pointer header resizing changes only matching body cell widths', () => {
    const resize = cy.stub().as('pointerResize');
    mount(
      <Grid
        resizableColumns
        onColumnResize={resize}
        resizableColumnsOptions={{ autoFitColumns: false }}
        columnSizingOptions={{ name: { minWidth: 120, idealWidth: 180 }, 0: { minWidth: 100, idealWidth: 220 } }}
      />,
    );
    cell().should('have.css', 'width', '180px');
    cy.get('#header-name [role="separator"]').then($handle => {
      const bounds = $handle[0].getBoundingClientRect();
      cy.wrap($handle).realMouseDown({ position: 'center' });
      cy.get('body').then($body => {
        const bodyBounds = $body[0].getBoundingClientRect();
        cy.wrap($body).realMouseMove(
          bounds.left + bounds.width / 2 + 40 - bodyBounds.left,
          bounds.top + bounds.height / 2 - bodyBounds.top,
          { position: 'topLeft' },
        );
      });
      cell().should('have.css', 'width', '220px');
      cy.get('body').realMouseUp();
    });
    cell('beta').should('have.css', 'width', '220px');
    cell('alpha', 0).should('have.css', 'width', '220px');
    cy.get('@pointerResize').should('have.been.called');
    cy.then(() => expect(resize.lastCall.args[1]).to.deep.equal({ columnId: 'name', width: 220 }));
    cell().focus().realPress('ArrowDown');
    cell('beta').should('have.focus');
  });

  it('independent primitive Tabster baseline reproduces dummy aria-hidden-focus without any DataGridCell', () => {
    const Baseline = () => {
      const navigation = useArrowNavigationGroup({ axis: 'grid' });
      const group = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
      return (
        <div {...navigation} id="primitive-baseline" role="grid" aria-label="Primitive baseline">
          <div role="row">
            <div role="columnheader">Actions</div>
          </div>
          <div role="row" id="primitive-row">
            <div {...group} role="gridcell" tabIndex={0} id="primitive-cell">
              <Controls />
            </div>
          </div>
        </div>
      );
    };
    mount(<Baseline />);
    cy.get('#primitive-cell').focus().realPress('Enter');
    cy.get('#primitive-cell button').first().should('have.focus').realPress('Escape');
    cy.get('#primitive-cell').should('have.focus');
    cy.get('#primitive-baseline [data-tabster-dummy]').should('have.length', 4);
    cy.get('#primitive-baseline')
      .then(async $grid => {
        const result = await axe.run($grid[0]);
        expect(result.violations.map(finding => finding.id)).to.deep.equal(['aria-hidden-focus']);
        expect(result.violations[0].nodes.map(node => node.target)).to.deep.equal([
          ['#primitive-baseline > i:nth-child(1)'],
          ['#primitive-row > i:nth-child(1)'],
          ['i:nth-child(3)'],
          ['i:nth-child(4)'],
        ]);
        expect($grid[0].querySelectorAll('[data-tabster-dummy][aria-hidden="true"][tabindex="0"]')).to.have.length(4);
        expect(result.incomplete).to.deep.equal([]);
        return result;
      })
      .then(result => retainAudit('axe-independent-primitive-baseline', result));
  });

  it('without DataGrid context defaults to an untabbable div gridcell with no owned interaction', () => {
    const click = cy.stub().as('click');
    mount(
      <div role="grid" aria-label="Manual grid">
        <div role="row">
          <DataGridCell id="standalone" onClick={click}>
            Plain content
          </DataGridCell>
        </div>
      </div>,
    );
    cy.get('#standalone').should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'gridcell');
    cy.get('#standalone').should('not.have.attr', 'tabindex');
    cy.get('#standalone').should('not.have.attr', 'data-tabster');
    cy.get('#standalone').click();
    cy.get('@click').should('have.been.calledOnce');
    cy.get('#standalone').should('not.have.attr', 'aria-selected');
  });

  it('native context does not change the default div tag; explicit td remains required', () => {
    mount(
      <TableContextProvider value={{ noNativeElements: false, size: 'small', sortable: false }}>
        <div role="grid" aria-label="Manual grid">
          <div role="row">
            <DataGridCell id="context-default">Default tag</DataGridCell>
          </div>
        </div>
      </TableContextProvider>,
    );
    cy.get('#context-default').should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'gridcell');
    cy.get('#context-default').should('have.css', 'display', 'table-cell').and('have.css', 'height', '34px');
  });

  (['extra-small', 'small', 'medium'] as const).forEach((size, index) => {
    it(`explicit native td uses ${size} density from Table context`, () => {
      mount(
        <TableContextProvider value={{ noNativeElements: false, size, sortable: false }}>
          <table role="grid" aria-label="Native density">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <DataGridCell as="td" id="native-density">
                  Alpha
                </DataGridCell>
                <td>2</td>
              </tr>
            </tbody>
          </table>
        </TableContextProvider>,
      );
      cy.get('#native-density').should('have.css', 'height', `${[24, 34, 44][index]}px`);
      cy.get('#native-density').then($cell =>
        expect($cell[0].getBoundingClientRect().height).to.equal([24, 34, 44][index]),
      );
    });
  });

  it('explicit native cell tag wins even over non-native context without rewriting siblings', () => {
    mount(
      <TableContextProvider value={{ noNativeElements: true, size: 'small', sortable: false }}>
        <table role="grid" aria-label="Explicit native tag">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <DataGridCell as="td" id="explicit">
                Alpha
              </DataGridCell>
              <td>2</td>
            </tr>
          </tbody>
        </table>
      </TableContextProvider>,
    );
    cy.get('#explicit').should('have.prop', 'tagName', 'TD').and('have.attr', 'role', 'gridcell');
    cy.get('#explicit').should('have.css', 'display', 'flex').and('have.css', 'min-height', '34px');
  });

  it('explicit tabindex overrides generated focus even when the cell focus mode is none', () => {
    mount(<Grid focusMode="none" cellProps={{ focusMode: 'none', tabIndex: 3 }} />);
    cell().should('have.attr', 'tabindex', '3').focus().should('have.focus');
    cell().should('not.have.attr', 'data-tabster');
  });

  it('negative explicit tabindex overrides cell navigation defaults', () => {
    mount(<Grid cellProps={{ tabIndex: -1 }} />);
    cell().should('have.attr', 'tabindex', '-1').focus().should('have.focus');
  });

  it('consumer inline sizing replaces inferred sizing instead of silently merging geometry', () => {
    mount(
      <Grid
        resizableColumns
        resizableColumnsOptions={{ autoFitColumns: false }}
        columnSizingOptions={{ name: { minWidth: 120, idealWidth: 180 } }}
        cellProps={{ style: { width: 90, minWidth: 90, maxWidth: 90 } }}
      />,
    );
    cell()
      .should('have.css', 'width', '90px')
      .and('have.css', 'min-width', '90px')
      .and('have.css', 'max-width', '90px');
    cy.get('#header-name').should('have.css', 'width', '180px');
  });

  it('source sizing callback receives the default empty string ID only when resizing is enabled', () => {
    const sizing = cy
      .stub()
      .as('sizing')
      .returns({ style: { width: 130, minWidth: 130, maxWidth: 130 } });
    const context = {
      ...dataGridContextDefaultValue,
      resizableColumns: false,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      columnSizing_unstable: { ...dataGridContextDefaultValue.columnSizing_unstable, getTableCellProps: sizing },
    };
    const fixture = (enabled: boolean) => (
      <DataGridContextProvider value={{ ...context, resizableColumns: enabled }}>
        <div role="grid" aria-label="Context sizing">
          <div role="row">
            <DataGridCell id="sized">Value</DataGridCell>
          </div>
        </div>
      </DataGridContextProvider>
    );
    mount(fixture(false)).then(({ rerender }) => {
      cy.get('@sizing').should('not.have.been.called');
      cy.then(() => update(rerender, fixture(true)));
      cy.get('@sizing').should('have.been.calledWithExactly', '');
      cy.get('#sized').should('have.css', 'width', '130px');
    });
  });

  it('source sizing callback tracks zero and string column context changes and latest callback identity', () => {
    const old = cy
      .stub()
      .as('oldSizing')
      .returns({ style: { width: 110 } });
    const latest = cy
      .stub()
      .as('latestSizing')
      .returns({ style: { width: 160 } });
    const fixture = (columnId: TableColumnId, callback: typeof old) => (
      <DataGridContextProvider
        value={{
          ...dataGridContextDefaultValue,
          resizableColumns: true,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          columnSizing_unstable: { ...dataGridContextDefaultValue.columnSizing_unstable, getTableCellProps: callback },
        }}
      >
        <ColumnIdContextProvider value={columnId}>
          <div role="grid" aria-label="Context sizing">
            <div role="row">
              <DataGridCell id="sized">Value</DataGridCell>
            </div>
          </div>
        </ColumnIdContextProvider>
      </DataGridContextProvider>
    );
    mount(fixture(0, old)).then(({ rerender }) => {
      cy.get('@oldSizing').should('have.been.calledWithExactly', 0);
      cy.get('#sized').should('have.css', 'width', '110px');
      cy.then(() => update(rerender, fixture('name', latest)));
      cy.get('@latestSizing').should('have.been.calledWithExactly', 'name');
      cy.get('#sized').should('have.css', 'width', '160px');
      let committedCalls: number;
      cy.then(() => {
        expect(old.getCalls().map(call => call.args[0])).to.include(0);
        committedCalls = old.callCount;
      });
      cy.then(() => update(rerender, fixture('name', latest)));
      cy.get('#sized').should('have.css', 'width', '160px');
      cy.then(() => expect(old.callCount).to.equal(committedCalls));
    });
  });

  it('actual row render data context supplies the same numeric and string column IDs to cell descendants', () => {
    const Probe = () => <span data-column={String(useColumnIdContext())}>Column context</span>;
    mount(<Grid renderContent={() => <Probe />} />);
    cell().find('span').should('have.attr', 'data-column', 'name');
    cell('alpha', 0).find('span').should('have.attr', 'data-column', '0');
  });

  ([null, '', 0] as const).forEach(content => {
    it(`preserves ${
      content === null ? 'null' : content === '' ? 'empty' : 'zero'
    } children without invented wrappers`, () => {
      mount(<Grid renderContent={() => content} />);
      cell().should('have.text', content === 0 ? '0' : '');
      cell().children().should('have.length', 0);
      cell().should('have.attr', 'role', 'gridcell');
    });
  });

  it('frozen controlled selection reports the row request without changing cell or row state', () => {
    const changed = cy.stub().as('controlledSelection');
    mount(<Grid selectionMode="single" selectedItems={new Set(['beta'])} onSelectionChange={changed} />);
    cell().click();
    cy.get('#row-alpha').should('have.attr', 'aria-selected', 'false');
    cy.get('#row-beta').should('have.attr', 'aria-selected', 'true');
    cy.get('@controlledSelection').should('have.been.calledOnce');
    cy.then(() => expect([...changed.firstCall.args[1].selectedItems]).to.deep.equal(['alpha']));
    cell().should('not.have.attr', 'aria-selected');
  });

  it('controlled sort updates preserve cell DOM identity, focus and row selection by custom ID', () => {
    let original: HTMLElement;
    mount(
      <Grid
        sortable
        sortState={{ sortColumn: 0, sortDirection: 'ascending' }}
        selectionMode="multiselect"
        selectedItems={new Set(['alpha'])}
      />,
    ).then(({ rerender }) => {
      cell()
        .focus()
        .then($cell => {
          original = $cell[0];
        });
      cy.then(() =>
        update(
          rerender,
          <Grid
            sortable
            sortState={{ sortColumn: 0, sortDirection: 'descending' }}
            selectionMode="multiselect"
            selectedItems={new Set(['alpha'])}
          />,
        ),
      );
      cy.get('.fui-DataGridBody .fui-DataGridRow').first().should('have.id', 'row-alpha');
      cell()
        .should('have.focus')
        .then($cell => expect($cell[0]).to.equal(original));
      cy.get('#row-alpha').should('have.attr', 'aria-selected', 'true');
    });
  });

  it('provider custom cell style hook receives completed state and preserves cell behavior', () => {
    const hook = (state: unknown) => {
      if (
        typeof state !== 'object' ||
        state === null ||
        !('root' in state) ||
        typeof state.root !== 'object' ||
        state.root === null
      ) {
        throw new Error('Expected a completed cell root state');
      }
      Object.assign(state.root, { title: 'Customized cell' });
    };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const hooks = { useDataGridCellStyles_unstable: hook };
    mountBase(
      <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
        <Grid />
      </FluentProvider>,
    );
    cell().should('have.attr', 'title', 'Customized cell').and('have.class', 'fui-DataGridCell');
    cell().focus().realPress('ArrowDown');
    cell('beta').should('have.focus');
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir} native keyboard header resizing updates matching body cell geometry without a cell-owned handle`, () => {
      const resize = cy.stub().as('resize');
      mount(
        <Grid
          keyboardResize
          resizableColumns
          onColumnResize={resize}
          resizableColumnsOptions={{ autoFitColumns: false }}
          columnSizingOptions={{ name: { minWidth: 120, idealWidth: 180 }, 0: { minWidth: 100, idealWidth: 220 } }}
        />,
        dir,
      );
      cell().should('have.css', 'width', '180px');
      cy.get('#header-name').realClick({ button: 'right' });
      cy.get('#header-name [role="separator"]').should('have.focus').realPress('ArrowRight');
      cell().should('have.css', 'width', '200px');
      cell('beta').should('have.css', 'width', '200px');
      cell('alpha', 0).should('have.css', 'width', '220px');
      cell().then($cell => expect($cell[0].getBoundingClientRect().width).to.equal(216));
      cy.get('#header-name').then($header => {
        cell().then($cell => {
          expect($cell[0].getBoundingClientRect().left).to.equal($header[0].getBoundingClientRect().left);
          expect($cell[0].getBoundingClientRect().width).to.equal($header[0].getBoundingClientRect().width);
        });
      });
      cy.get('@resize').should('have.been.called');
      cy.then(() => expect(resize.lastCall.args[1]).to.deep.equal({ columnId: 'name', width: 200 }));
      cy.get('#header-name [role="separator"]').realPress('Escape');
      cy.get('#header-name [role="separator"]').should('have.attr', 'aria-hidden', 'true');
      cell().find('[role="separator"]').should('not.exist');
    });
  });

  it('dynamic sizing options, enablement and density update the same cell without stale inline width', () => {
    const options = { name: { minWidth: 120, idealWidth: 180 } };
    mount(
      <Grid resizableColumns columnSizingOptions={options} resizableColumnsOptions={{ autoFitColumns: false }} />,
    ).then(({ rerender }) => {
      cell().should('have.css', 'width', '180px').focus();
      cy.then(() =>
        update(
          rerender,
          <Grid
            resizableColumns
            size="small"
            resizableColumnsOptions={{ autoFitColumns: false }}
            columnSizingOptions={{ name: { minWidth: 120, idealWidth: 240 } }}
          />,
        ),
      );
      cell().should('have.css', 'width', '240px').and('have.focus').and('have.css', 'min-height', '34px');
      cy.then(() => update(rerender, <Grid size="extra-small" />));
      cell().should('have.focus').and('have.css', 'min-height', '24px');
      cell().then($cell => expect($cell[0].style.width).to.equal(''));
    });
  });

  it('axe positive control detects an unnamed cell child button rather than silently accepting it', () => {
    mount(<Grid focusMode="none" cellProps={{ focusMode: 'none' }} renderContent={() => <button />} />);
    cy.get('.fui-DataGrid').then(async $grid => {
      const result = await axe.run($grid[0]);
      expect(result.violations.map(finding => finding.id)).to.deep.equal(['button-name']);
      expect(result.violations[0].nodes).to.have.length(4);
      expect(result.incomplete).to.deep.equal([]);
    });
  });

  describe('forced colors support', () => {
    afterEach(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'none' }] },
      }),
    );

    it('active forced colors retains keyboard cell focus and geometry using browser system colors', () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      mount(<Grid />);
      cy.window().then(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
      cell().focus().realPress('ArrowDown');
      cell('beta')
        .should('have.focus')
        .and('have.css', 'outline-style', 'solid')
        .and('have.css', 'outline-width', '2px');
      cell('beta').should('have.css', 'forced-color-adjust', 'auto').and('have.css', 'min-height', '44px');
      cell('beta').should('have.text', 'Beta').and('have.attr', 'role', 'gridcell');
      cy.screenshot('DataGridCell-forced-colors');
    });
  });
});
