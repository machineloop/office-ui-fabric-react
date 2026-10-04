import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import {
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  createTableColumn,
} from '@fluentui/react-table';
import type { DataGridProps, TableColumnDefinition, TableRowData, TableRowId } from '@fluentui/react-table';
import { DataGridBody } from './DataGridBody';
import type { DataGridBodyProps } from './DataGridBody.types';
import { TableContextProvider } from '../../contexts/tableContext';
import { useTableRowIdContext } from '../../contexts/rowIdContext';
import * as axe from 'axe-core';
import { slot } from '@fluentui/react-utilities';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import { useDataGridBody_unstable } from './useDataGridBody';
import { useDataGridBodyStyles_unstable } from './useDataGridBodyStyles.styles';
import { renderDataGridBody_unstable } from './renderDataGridBody';
import { DataGridContextProvider, dataGridContextDefaultValue } from '../../contexts/dataGridContext';
import { useTableFeatures } from '../../hooks/useTableFeatures';
import type { RowEnhancer, TableFeaturesState } from '../../hooks/types';

type Item = { id: TableRowId; name: string; amount: number };
const items: Item[] = [
  { id: 0, name: 'Beta', amount: 2 },
  { id: 'a', name: 'Alpha', amount: 1 },
  { id: 'c', name: 'Gamma', amount: 3 },
];
const columns: TableColumnDefinition<Item>[] = [
  createTableColumn<Item>({
    columnId: 'name',
    compare: (a, b) => a.name.localeCompare(b.name),
    renderHeaderCell: () => 'Name',
    renderCell: item => item.name,
  }),
  createTableColumn<Item>({
    columnId: 'amount',
    compare: (a, b) => a.amount - b.amount,
    renderHeaderCell: () => 'Amount',
    renderCell: item => item.amount,
  }),
];
const mount = (element: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mountBase(
    <FluentProvider dir={dir} theme={dark ? teamsDarkTheme : teamsLightTheme}>
      {element}
    </FluentProvider>,
  );
const body = () => cy.get('#body');
const row = (id: TableRowId) => cy.get(`#row-${id}`);
const expectOrder = (ids: TableRowId[], selector = '#body') =>
  cy
    .get(selector)
    .children('[role="row"]')
    .then($rows => {
      expect([...$rows].map(element => element.getAttribute('data-row-id'))).to.deep.equal(ids.map(String));
    });

describe('DataGridBody lifecycle, isolation and accessibility (round 2)', () => {
  it('reorders provider-keyed stateful rows without caller keys and preserves their DOM and local edits', () => {
    const StatefulRow = ({ item, rowId }: TableRowData<Item>) => {
      const [value, setValue] = React.useState(item.name);
      return (
        <div role="row" data-row-id={rowId}>
          <div role="gridcell">
            <input aria-label={`Edit ${item.name}`} value={value} onChange={e => setValue(e.target.value)} />
          </div>
        </div>
      );
    };
    const Fixture = () => {
      const [records, setRecords] = React.useState(items);
      return (
        <>
          <button onClick={() => setRecords([records[2], records[0], records[1]])}>Reorder</button>
          <Grid items={records} bodyProps={{ children: data => <StatefulRow {...data} /> }} />
        </>
      );
    };
    let initial: HTMLElement;
    mount(<Fixture />);
    body()
      .children()
      .first()
      .then($row => {
        initial = $row[0];
      });
    cy.get('input[aria-label="Edit Beta"]').clear().type('Edited zero');
    cy.contains('button', 'Reorder').realClick();
    expectOrder(['c', 0, 'a']);
    body()
      .children()
      .eq(1)
      .then($row => expect($row[0]).to.equal(initial));
    cy.get('input[aria-label="Edit Beta"]').should('have.value', 'Edited zero');
    cy.get('input[aria-label="Edit Alpha"]').should('have.value', 'Alpha');
  });

  it('filters and removes membership then reinserts a fresh row while retaining surviving row state', () => {
    const StatefulRow = ({ item, rowId }: TableRowData<Item>) => (
      <div role="row" data-row-id={rowId}>
        <div role="gridcell">
          <input aria-label={`Edit ${item.name}`} defaultValue={item.name} />
        </div>
      </div>
    );
    const Fixture = () => {
      const [records, setRecords] = React.useState(items);
      return (
        <>
          <button onClick={() => setRecords(items.filter(item => item.id !== 0))}>Filter zero</button>
          <button onClick={() => setRecords([])}>Remove all</button>
          <button onClick={() => setRecords(items)}>Restore</button>
          <Grid items={records} bodyProps={{ children: data => <StatefulRow {...data} /> }} />
        </>
      );
    };
    let survivor: HTMLElement;
    mount(<Fixture />);
    cy.get('input[aria-label="Edit Beta"]').clear().type('Discarded edit');
    cy.get('input[aria-label="Edit Alpha"]')
      .clear()
      .type('Survivor edit')
      .then($input => {
        survivor = $input[0];
      });
    cy.contains('button', 'Filter zero').realClick();
    expectOrder(['a', 'c']);
    cy.get('input[aria-label="Edit Beta"]').should('not.exist');
    cy.get('input[aria-label="Edit Alpha"]')
      .should('have.value', 'Survivor edit')
      .then($input => expect($input[0]).to.equal(survivor));
    cy.contains('button', 'Restore').realClick();
    expectOrder([0, 'a', 'c']);
    cy.get('input[aria-label="Edit Beta"]').should('have.value', 'Beta');
    cy.get('input[aria-label="Edit Alpha"]').should('have.value', 'Survivor edit');
    cy.contains('button', 'Remove all').realClick();
    body().should('be.empty');
    cy.contains('button', 'Restore').realClick();
    cy.get('input[aria-label="Edit Alpha"]').should('have.value', 'Alpha');
  });

  it('same-ID replacement supplies the new item to fresh row and cell closures without replacing the row node', () => {
    const report = cy.stub().as('report');
    const Fixture = () => {
      const [records, setRecords] = React.useState(items);
      const [version, setVersion] = React.useState('old');
      return (
        <>
          <button
            onClick={() => {
              setRecords(items.map(item => (item.id === 0 ? { ...item, name: 'Updated', amount: 9 } : item)));
              setVersion('new');
            }}
          >
            Replace
          </button>
          <Grid
            items={records}
            bodyProps={{
              children: ({ item, rowId }) => (
                <DataGridRow<Item> id={`row-${rowId}`} data-row-id={rowId} onClick={() => report(version, item)}>
                  {column => <DataGridCell>{column.renderCell(item)}</DataGridCell>}
                </DataGridRow>
              ),
            }}
          />
        </>
      );
    };
    let initial: HTMLElement;
    mount(<Fixture />);
    row(0).then($row => {
      initial = $row[0];
    });
    row(0).realClick();
    cy.get('@report').its('firstCall.args').should('deep.equal', ['old', items[0]]);
    cy.contains('button', 'Replace').realClick();
    row(0)
      .should('contain.text', 'Updated')
      .and('contain.text', '9')
      .then($row => expect($row[0]).to.equal(initial));
    row(0).realClick();
    cy.get('@report')
      .its('lastCall.args')
      .should('deep.equal', ['new', { id: 0, name: 'Updated', amount: 9 }]);
    row('a').should('contain.text', 'Alpha');
  });

  it('in-place record mutation is visible on explicit rerender and body does not clone the item', () => {
    const records = items.map(item => ({ ...item }));
    const renderRow = cy.spy((data: TableRowData<Item>) => <Row {...data} />).as('renderRow');
    const Fixture = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button
            onClick={() => {
              records[0].name = 'Mutated';
              setVersion(version + 1);
            }}
          >
            Mutate
          </button>
          <Grid items={records} bodyProps={{ children: renderRow, title: String(version) }} />
        </>
      );
    };
    mount(<Fixture />);
    row(0).should('contain.text', 'Beta');
    cy.contains('button', 'Mutate').realClick();
    row(0).should('contain.text', 'Mutated');
    cy.get('@renderRow').then(() => {
      const latest = renderRow.getCalls().slice(-3);
      expect(latest[0].args[0].item).to.equal(records[0]);
      expect(latest[0].args[0].item.name).to.equal('Mutated');
    });
  });

  it('changing getRowId updates callback and provider identities even when the item array is unchanged', () => {
    const Fixture = () => {
      const [useNames, setUseNames] = React.useState(false);
      return (
        <>
          <button onClick={() => setUseNames(true)}>Use names</button>
          <Grid getRowId={(item: Item) => (useNames ? item.name : item.id)} />
        </>
      );
    };
    mount(<Fixture />);
    expectOrder([0, 'a', 'c']);
    cy.contains('button', 'Use names').realClick();
    expectOrder(['Beta', 'Alpha', 'Gamma']);
    row(0).should('not.exist');
    row('Beta').should('have.attr', 'data-context-id', 'Beta').and('have.attr', 'data-id-type', 'string');
  });

  it('sorted keyed rows retain their DOM state and root selection across sort toggles', () => {
    let initial: HTMLElement;
    const change = cy.stub().as('selectionChange');
    mount(
      <Grid
        sortable
        selectionMode="multiselect"
        defaultSelectedItems={[0]}
        onSelectionChange={change}
        defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
      />,
    );
    row(0).then($row => {
      initial = $row[0];
    });
    cy.contains('[role="columnheader"]', 'Name').realClick();
    expectOrder(['c', 0, 'a']);
    row(0)
      .should('have.attr', 'aria-selected', 'true')
      .then($row => expect($row[0]).to.equal(initial));
    row('a').should('have.attr', 'aria-selected', 'false');
    cy.get('@selectionChange').should('not.have.been.called');
    row(0).realClick().should('have.attr', 'aria-selected', 'false');
    cy.get('@selectionChange').then(() => expect([...change.lastCall.args[1].selectedItems]).to.deep.equal([]));
  });

  it('root selection callbacks remain fresh after replacement and filtering uses current membership', () => {
    const change = cy.stub().as('change');
    const Fixture = () => {
      const [current, setCurrent] = React.useState(items);
      const [version, setVersion] = React.useState('old');
      return (
        <>
          <button
            onClick={() => {
              setCurrent([items[1]]);
              setVersion('new');
            }}
          >
            Keep Alpha
          </button>
          <Grid
            items={current}
            selectionMode="multiselect"
            onSelectionChange={(e, data) => change(version, [...data.selectedItems])}
          />
        </>
      );
    };
    mount(<Fixture />);
    row(0).realClick();
    cy.get('@change')
      .its('lastCall.args')
      .should('deep.equal', ['old', [0]]);
    cy.contains('button', 'Keep Alpha').realClick();
    expectOrder(['a']);
    cy.get('input[aria-label="Select all records"]').realClick();
    row('a').should('have.attr', 'aria-selected', 'true');
    cy.get('@change').then(() => {
      expect(change.lastCall.args[0]).to.equal('new');
      expect(change.lastCall.args[1]).to.include('a');
      expect(change.lastCall.args[1]).not.to.include('c');
    });
  });

  it('dynamic columns are rendered for every current item and removal leaves no stale cells', () => {
    const Fixture = () => {
      const [defs, setDefs] = React.useState(columns);
      return (
        <>
          <button
            onClick={() =>
              setDefs([
                columns[1],
                columns[0],
                createTableColumn<Item>({
                  columnId: 'extra',
                  renderHeaderCell: () => 'Extra',
                  renderCell: item => `Extra ${item.name}`,
                }),
              ])
            }
          >
            Expand columns
          </button>
          <button onClick={() => setDefs([columns[0]])}>Reduce columns</button>
          <Grid columns={defs} />
        </>
      );
    };
    mount(<Fixture />);
    body().find('.fui-DataGridCell').should('have.length', 6);
    cy.contains('button', 'Expand columns').realClick();
    row(0)
      .find('.fui-DataGridCell')
      .then($cells => expect([...$cells].map(cell => cell.textContent)).to.deep.equal(['2', 'Beta', 'Extra Beta']));
    body().find('.fui-DataGridCell').should('have.length', 9);
    cy.contains('button', 'Reduce columns').realClick();
    body().find('.fui-DataGridCell').should('have.length', 3);
    row(0).should('have.text', 'Beta');
    expectOrder([0, 'a', 'c']);
  });

  it('latest body event handlers replace old closures while preserving normal row bubbling', () => {
    const report = cy.stub().as('report');
    const Fixture = () => {
      const [version, setVersion] = React.useState('old');
      return (
        <>
          <button onClick={() => setVersion('new')}>Update callbacks</button>
          <Grid
            bodyProps={{
              tabIndex: -1,
              onClick: () => report(version, 'click'),
              onKeyDown: () => report(version, 'key'),
            }}
          />
        </>
      );
    };
    mount(<Fixture />);
    row(0).realClick();
    cy.get('@report').its('lastCall.args').should('deep.equal', ['old', 'click']);
    cy.contains('button', 'Update callbacks').realClick();
    row('a').realClick();
    cy.get('@report').its('lastCall.args').should('deep.equal', ['new', 'click']);
    body().focus().realPress('Enter');
    cy.get('@report').its('lastCall.args').should('deep.equal', ['new', 'key']);
    cy.get('@report').should('have.been.calledThrice');
  });

  it('callback refs detach on unmount and reattach to a new root without an extra body wrapper', () => {
    const ref = cy.stub().as('ref');
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(!visible)}>Toggle body</button>
          {visible && <Grid bodyProps={{ ref }} />}
        </>
      );
    };
    let initial: HTMLElement;
    mount(<Fixture />);
    body().then($body => {
      initial = $body[0];
      expect(ref.lastCall.args[0]).to.equal(initial);
    });
    cy.contains('button', 'Toggle body').realClick();
    body().should('not.exist');
    cy.get('@ref').then(() => expect(ref.lastCall.args[0]).to.equal(null));
    cy.contains('button', 'Toggle body').realClick();
    body().then($body => {
      expect(ref.lastCall.args[0]).to.equal($body[0]);
      expect($body[0]).not.to.equal(initial);
    });
    cy.get('.fui-DataGridBody').should('have.length', 1);
  });

  it('separate DataGrid roots with overlapping IDs isolate data, sorting, selection and row providers', () => {
    const left = cy.stub().as('left');
    const right = cy.stub().as('right');
    mount(
      <>
        <section id="left">
          <Grid
            rowPrefix="left-row"
            sortable
            selectionMode="multiselect"
            onSelectionChange={left}
            defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
            bodyProps={{ id: 'left-body' }}
          />
        </section>
        <section id="right">
          <Grid
            rowPrefix="right-row"
            items={[{ id: 0, name: 'Other', amount: 7 }]}
            selectionMode="multiselect"
            onSelectionChange={right}
            bodyProps={{ id: 'right-body' }}
          />
        </section>
      </>,
    );
    expectOrder(['a', 0, 'c'], '#left-body');
    expectOrder([0], '#right-body');
    cy.get('#right-body > [data-row-id="0"]').should('contain.text', 'Other').realClick();
    cy.get('#right-body > [data-row-id="0"]').should('have.attr', 'aria-selected', 'true');
    cy.get('#left-body > [data-row-id="0"]').should('have.attr', 'aria-selected', 'false').and('contain.text', 'Beta');
    cy.get('@left').should('not.have.been.called');
    cy.get('@right').then(() => expect([...right.firstCall.args[1].selectedItems]).to.deep.equal([0]));
    cy.get('#left').contains('[role="columnheader"]', 'Name').realClick();
    expectOrder(['c', 0, 'a'], '#left-body');
    expectOrder([0], '#right-body');
  });

  it('multiple body instances map their own rows and share only their actual root owner state', () => {
    const renderRows =
      (prefix: string) =>
      ({ item, rowId }: TableRowData<Item>) =>
        (
          <DataGridRow<Item> data-row-id={rowId} id={`${prefix}-${rowId}`}>
            {column => <DataGridCell>{column.renderCell(item)}</DataGridCell>}
          </DataGridRow>
        );
    mount(
      <DataGrid
        items={items}
        columns={columns}
        getRowId={(item: Item) => item.id}
        selectionMode="multiselect"
        aria-label="Two bodies"
      >
        <DataGridBody<Item> id="first-body">{renderRows('first')}</DataGridBody>
        <DataGridBody<Item> id="second-body">{renderRows('second')}</DataGridBody>
      </DataGrid>,
    );
    expectOrder([0, 'a', 'c'], '#first-body');
    expectOrder([0, 'a', 'c'], '#second-body');
    cy.get('#first-0').realClick().should('have.attr', 'aria-selected', 'true');
    cy.get('#second-0').should('have.attr', 'aria-selected', 'true');
    cy.get('#second-a').should('have.attr', 'aria-selected', 'false');
    cy.get('[role="grid"]').children('.fui-DataGridBody').should('have.length', 2);
  });

  it('nested roots restore the outer row context after the inner body and isolate overlapping IDs', () => {
    const Probe = ({ id }: { id: string }) => <span id={id}>{String(useTableRowIdContext())}</span>;
    mount(
      <DataGrid items={[items[1]]} columns={columns} getRowId={(item: Item) => item.id} aria-label="Outer">
        <DataGridBody<Item> id="outer-body">
          {({ rowId }) => (
            <div role="row" data-row-id={rowId}>
              <div role="gridcell">
                <Probe id="before-inner" />
                <Grid items={[{ id: 0, name: 'Inner', amount: 8 }]} bodyProps={{ id: 'inner-body' }} />
                <Probe id="after-inner" />
              </div>
            </div>
          )}
        </DataGridBody>
        <Probe id="outside-row" />
      </DataGrid>,
    );
    cy.get('#before-inner').should('have.text', 'a');
    cy.get('#after-inner').should('have.text', 'a');
    cy.get('#outside-row').should('have.text', '');
    cy.get('#inner-body > [role="row"]').should('have.attr', 'data-context-id', '0').and('contain.text', 'Inner');
    expectOrder(['a'], '#outer-body');
    expectOrder([0], '#inner-body');
  });

  for (const noNativeElements of [false, true]) {
    it(`inherited type-supported tbody override is ignored with noNativeElements=${noNativeElements}`, () => {
      mount(
        <TableContextProvider value={{ noNativeElements, sortable: false, size: 'medium' }}>
          <DataGridBody as="tbody" id="body">
            {() => null}
          </DataGridBody>
        </TableContextProvider>,
      );
      body().should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'rowgroup');
      body().should('have.css', 'display', noNativeElements ? 'block' : 'table-row-group');
    });
  }

  it('public div override retains valid real-root rowgroup ownership and root-owned rowcount', () => {
    mount(<Grid aria-rowcount={4} bodyProps={{ as: 'div', 'aria-label': 'Record rows' }} />);
    cy.get('[role="grid"]')
      .should('have.attr', 'aria-rowcount', '4')
      .children('[role="rowgroup"]')
      .should('have.length', 2);
    body().should('have.attr', 'aria-label', 'Record rows');
    body().should('not.have.attr', 'aria-rowcount');
    body().children('[role="row"]').should('have.length', 3);
    body().find('[role="gridcell"]').should('have.length', 6);
    cy.get('[role="grid"]').should('have.length', 1);
    cy.get('[role="grid"] > [role="rowgroup"] > [role="row"]').should('have.length', 4);
  });

  for (const focusMode of ['none', 'cell'] as const) {
    it(`full axe audits with focusMode=${focusMode} require ${
      focusMode === 'none' ? 'zero violations' : 'exact root mover sentinels'
    } and detect exactly one unnamed control`, () => {
      mount(
        <>
          <h2 id="records-title">Records heading</h2>
          <Grid
            aria-label={undefined}
            aria-labelledby="records-title"
            selectionMode="multiselect"
            focusMode={focusMode}
          />
        </>,
      );
      cy.get('[role="grid"]').should('have.attr', 'aria-labelledby', 'records-title');
      row(0).find('input').should('have.attr', 'aria-label', 'Select Beta');
      if (focusMode === 'cell') {
        cy.get('[role="grid"] > [data-tabster-dummy]').should('have.length', 2);
      }
      const scan = async (bodyElement: HTMLElement, phase: string, positiveControl?: HTMLButtonElement) => {
        const root = bodyElement.closest('[role="grid"]');
        if (!root) {
          throw new Error('Missing real grid owner');
        }
        const sentinels = Array.from(root.querySelectorAll<HTMLElement>('[data-tabster-dummy]'));
        const moverEnabled = focusMode === 'cell';
        expect(sentinels).to.have.length(moverEnabled ? 2 : 0);
        const tabster = JSON.parse(root.getAttribute('data-tabster') ?? '{}');
        expect(Boolean(tabster.mover)).to.equal(moverEnabled);
        const sentinelState = sentinels.map((sentinel, index) => {
          expect(sentinel).to.equal(index === 0 ? root.firstElementChild : root.lastElementChild);
          expect(sentinel.parentElement).to.equal(root);
          expect(bodyElement.contains(sentinel)).to.equal(false);
          expect(sentinel.tagName).to.equal('I');
          expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
            `isFirst=${index === 0}, isOutside=false, (Mover, tabbable=true)`,
          );
          expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
          expect(sentinel.getAttribute('role')).to.equal('none');
          expect(sentinel.tabIndex).to.equal(0);
          const style = sentinel.ownerDocument.defaultView?.getComputedStyle(sentinel);
          if (!style) {
            throw new Error('Missing sentinel layout window');
          }
          const rect = sentinel.getBoundingClientRect();
          expect(style.display).not.to.equal('none');
          expect(style.visibility).to.equal('visible');
          expect(style.contentVisibility).to.equal('hidden');
          expect(style.opacity).to.equal('0.001');
          expect(rect.width).to.equal(1);
          expect(rect.height).to.equal(1);
          return {
            html: sentinel.outerHTML,
            tabIndex: sentinel.tabIndex,
            display: style.display,
            visibility: style.visibility,
            contentVisibility: style.contentVisibility,
            opacity: style.opacity,
            width: rect.width,
            height: rect.height,
          };
        });
        const audit = await axe.run(root);
        const expectedRules = moverEnabled ? ['aria-hidden-focus'] : [];
        if (positiveControl) {
          expectedRules.push('button-name');
        }
        expect(audit.violations.map(violation => violation.id).sort()).to.deep.equal(expectedRules.sort());
        if (moverEnabled) {
          const violation = audit.violations.find(result => result.id === 'aria-hidden-focus');
          if (!violation) {
            throw new Error('Missing expected mover sentinel violation');
          }
          expect(violation.nodes).to.have.length(2);
          violation.nodes.forEach((node, index) => {
            expect(node.target).to.have.length(1);
            const target = node.target[0];
            if (typeof target !== 'string') {
              throw new Error('Unexpected shadow or frame sentinel target');
            }
            expect(root.querySelector(target)).to.equal(sentinels[index]);
            expect(node.html).to.equal(sentinelState[index].html);
            expect(node.any).to.deep.equal([]);
            expect(node.none).to.deep.equal([]);
            expect(node.all.map(check => check.id)).to.deep.equal(['focusable-not-tabbable']);
          });
        }
        if (positiveControl) {
          const violation = audit.violations.find(result => result.id === 'button-name');
          if (!violation) {
            throw new Error('Missing unnamed-button positive control violation');
          }
          expect(violation.nodes).to.have.length(1);
          expect(violation.nodes[0].target).to.deep.equal(['#body-unnamed-control']);
          expect(root.querySelector('#body-unnamed-control')).to.equal(positiveControl);
          expect(violation.nodes[0].html).to.equal(positiveControl.outerHTML);
        }
        return { phase, moverEnabled, sentinelState, violations: audit.violations };
      };
      body().then(async $body => {
        const initial = await scan($body[0], 'before-navigation');
        cy.writeFile(`${Cypress.env('bodyEvidencePath')}\\axe-${focusMode}-before-navigation.json`, initial);
      });
      if (focusMode === 'cell') {
        row(0).find('.fui-DataGridCell').first().realClick().should('have.focus').realPress('ArrowDown');
        row('a').find('.fui-DataGridCell').first().should('have.focus');
      }
      body().then(async $body => {
        const root = $body[0].closest('[role="grid"]');
        if (!root) {
          throw new Error('Missing real grid owner');
        }
        const baseline = await scan($body[0], 'baseline');
        const bodyAudit = await axe.run($body[0]);
        expect(bodyAudit.violations).to.deep.equal([]);
        const cell = root.querySelector('[role="gridcell"]');
        if (!cell) {
          throw new Error('Missing body gridcell for positive control');
        }
        const unnamedButton = cell.ownerDocument.createElement('button');
        unnamedButton.id = 'body-unnamed-control';
        cell.appendChild(unnamedButton);
        const negative = await scan($body[0], 'positive-control', unnamedButton);
        unnamedButton.remove();
        expect(root.querySelector('#body-unnamed-control')).to.equal(null);
        const restored = await scan($body[0], 'restored');
        const restoredBody = await axe.run($body[0]);
        expect(restoredBody.violations).to.deep.equal([]);
        cy.writeFile(`${Cypress.env('bodyEvidencePath')}\\axe-${focusMode}-full-audit.json`, {
          baseline,
          body: bodyAudit.violations,
          positiveControl: negative,
          restored,
          restoredBody: restoredBody.violations,
        });
      });
    });
  }

  it('empty body retains its rowgroup name without inventing a live-region announcement or focus target', () => {
    mount(<Grid items={[]} bodyProps={{ 'aria-label': 'Empty rows' }} />);
    body().should('be.empty').and('have.attr', 'aria-label', 'Empty rows');
    body().should('not.have.attr', 'aria-live');
    body().should('not.have.attr', 'tabindex');
    cy.get('[role="status"], [role="alert"]').should('not.exist');
  });

  it('RTL dark provider changes inherited direction without changing item membership or root classes', () => {
    mount(<Grid />, 'rtl', true);
    body()
      .should('have.css', 'direction', 'rtl')
      .and('have.class', 'fui-DataGridBody')
      .and('have.class', 'fui-TableBody');
    expectOrder([0, 'a', 'c']);
    row(0).find('.fui-DataGridCell').last().focus().realPress('ArrowRight');
    row(0).find('.fui-DataGridCell').first().should('have.focus');
  });

  it('composite root keyboard navigation reaches the current sorted rows and row selection remains root-owned', () => {
    const change = cy.stub().as('change');
    mount(
      <Grid
        focusMode="composite"
        sortable
        selectionMode="multiselect"
        onSelectionChange={change}
        defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
      />,
    );
    row('a').focus().realPress('ArrowDown');
    row(0).should('have.focus').realPress('Space');
    row(0).should('have.attr', 'aria-selected', 'true');
    cy.get('@change').then(() => expect([...change.lastCall.args[1].selectedItems]).to.deep.equal([0]));
    body().should('not.have.attr', 'tabindex');
  });
});
const Row = ({ item, rowId, prefix = 'row' }: TableRowData<Item> & { prefix?: string }) => {
  const contextId = useTableRowIdContext();
  return (
    <DataGridRow<Item>
      id={`${prefix}-${rowId}`}
      data-row-id={rowId}
      data-context-id={contextId}
      data-id-type={typeof contextId}
      selectionCell={undefined}
    >
      {column => <DataGridCell>{column.renderCell(item)}</DataGridCell>}
    </DataGridRow>
  );
};
const SelectableRow = ({ item, rowId, prefix = 'row' }: TableRowData<Item> & { prefix?: string }) => {
  const contextId = useTableRowIdContext();
  return (
    <DataGridRow<Item>
      id={`${prefix}-${rowId}`}
      data-row-id={rowId}
      data-context-id={contextId}
      data-id-type={typeof contextId}
      selectionCell={{
        checkboxIndicator: { 'aria-label': `Select ${item.name}` },
        radioIndicator: { 'aria-label': `Select ${item.name}` },
      }}
    >
      {column => <DataGridCell>{column.renderCell(item)}</DataGridCell>}
    </DataGridRow>
  );
};
type GridProps = Partial<DataGridProps> & {
  bodyProps?: Partial<DataGridBodyProps<Item>> & { ref?: React.Ref<HTMLElement> };
  rowPrefix?: string;
};
const Grid = ({ bodyProps, rowPrefix, ...props }: GridProps) => (
  <DataGrid aria-label="Records" items={items} columns={columns} getRowId={(item: Item) => item.id} {...props}>
    <DataGridHeader>
      <DataGridRow selectionCell={{ checkboxIndicator: { 'aria-label': 'Select all records' } }}>
        {column => <DataGridHeaderCell>{column.renderHeaderCell()}</DataGridHeaderCell>}
      </DataGridRow>
    </DataGridHeader>
    <DataGridBody<Item> id="body" {...bodyProps}>
      {bodyProps?.children ??
        (data =>
          props.selectionMode ? <SelectableRow {...data} prefix={rowPrefix} /> : <Row {...data} prefix={rowPrefix} />)}
    </DataGridBody>
  </DataGrid>
);

describe('DataGridBody documented contracts (round 1)', () => {
  it('maps actual items once into ordered rows and typed per-row contexts without DOM wrappers', () => {
    const renderRow = cy.spy((data: TableRowData<Item>) => <Row {...data} />).as('renderRow');
    mount(<Grid bodyProps={{ children: renderRow }} />);
    expectOrder([0, 'a', 'c']);
    body().should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'rowgroup');
    body().children().should('have.length', 3);
    row(0).should('have.attr', 'data-context-id', '0').and('have.attr', 'data-id-type', 'number');
    row('a').should('have.attr', 'data-context-id', 'a').and('have.attr', 'data-id-type', 'string');
    cy.get('@renderRow').then(() => {
      expect(renderRow.callCount % items.length).to.equal(0);
      expect(renderRow.callCount).to.be.greaterThan(0);
      renderRow.getCalls().forEach((call, index) => {
        expect(call.args).to.have.length(1);
        expect(call.args[0]).to.have.keys('item', 'rowId');
        expect(call.args[0].item).to.equal(items[index % items.length]);
        expect(call.args[0].rowId).to.equal(items[index % items.length].id);
      });
    });
  });

  it('uses collection indexes including zero when the root omits getRowId', () => {
    mount(<Grid getRowId={undefined} />);
    expectOrder([0, 1, 2]);
    row(1).should('contain.text', 'Alpha').and('have.attr', 'data-context-id', '1');
  });

  it('renders an empty root for an empty collection and never invokes the row callback', () => {
    const renderRow = cy.spy((data: TableRowData<Item>) => <Row {...data} />).as('renderRow');
    mount(<Grid items={[]} bodyProps={{ children: renderRow }} />);
    body().should('have.attr', 'role', 'rowgroup').and('be.empty');
    cy.get('@renderRow').should('not.have.been.called');
  });

  it('outside a DataGrid uses the empty default data context rather than calling children once', () => {
    const renderRow = cy.spy(() => 'unexpected').as('renderRow');
    mount(<DataGridBody id="body">{renderRow}</DataGridBody>);
    body().should('be.empty').and('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'rowgroup');
    cy.get('@renderRow').should('not.have.been.called');
    body().should('have.css', 'display', 'table-row-group');
  });

  it('forwards the object ref to the single root and merges body and table-body classes', () => {
    const ref = React.createRef<HTMLElement>();
    mount(<Grid bodyProps={{ ref, className: 'consumer-body', title: 'Records body', 'aria-label': 'Record rows' }} />);
    body()
      .should('have.class', 'fui-DataGridBody')
      .and('have.class', 'fui-TableBody')
      .and('have.class', 'consumer-body');
    body().should('have.attr', 'title', 'Records body').and('have.attr', 'aria-label', 'Record rows');
    body().then($body => expect(ref.current).to.equal($body[0]));
    body().should('have.css', 'display', 'block').and('not.have.attr', 'tabindex');
    cy.get('.fui-DataGridBody').should('have.length', 1);
  });

  it('preserves native attributes and bubbles row events to the body without body-owned selection', () => {
    const click = cy.stub().as('click');
    const key = cy.stub().as('key');
    mount(<Grid bodyProps={{ onClick: click, onKeyDown: key, 'aria-describedby': 'description', tabIndex: -1 }} />);
    row(0).realClick();
    cy.get('@click').should('have.been.calledOnce');
    body().focus().realPress('Enter');
    cy.get('@key').should('have.been.calledOnce');
    body().should('have.attr', 'aria-describedby', 'description');
    row(0).should('not.have.attr', 'aria-selected');
  });

  it('supports a typed unknown-record renderer with narrowing instead of assuming an item shape', () => {
    const records: unknown[] = [{ label: 'Record' }, 'primitive', null];
    mount(
      <DataGrid items={records} columns={[]} aria-label="Unknown records">
        <DataGridBody id="body">
          {({ item, rowId }) => (
            <div role="row" data-row-id={rowId}>
              <div role="gridcell">
                {typeof item === 'object' && item !== null && 'label' in item ? String(item.label) : String(item)}
              </div>
            </div>
          )}
        </DataGridBody>
      </DataGrid>,
    );
    expectOrder([0, 1, 2]);
    body().should('have.text', 'Recordprimitivenull');
  });

  it('accepts fragment and null row results without manufacturing rows or selection controls', () => {
    mount(
      <Grid
        bodyProps={{
          children: ({ item, rowId }) =>
            rowId === 'a' ? null : (
              <React.Fragment>
                <Row item={item} rowId={rowId} />
              </React.Fragment>
            ),
        }}
      />,
    );
    expectOrder([0, 'c']);
    body().find('input').should('not.exist');
    row('a').should('not.exist');
  });

  it('renders a ReactNode string for each item rather than interpreting it as a root slot function', () => {
    mount(<Grid bodyProps={{ children: ({ item }) => item.name }} />);
    body().should('have.text', 'BetaAlphaGamma').children().should('have.length', 0);
  });

  it('reflects default root sorting in rendered rows while keeping data row IDs', () => {
    mount(<Grid sortable defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }} />);
    expectOrder(['a', 0, 'c']);
    cy.contains('[role="columnheader"]', 'Name').realClick();
    expectOrder(['c', 0, 'a']);
    row(0).should('have.attr', 'data-context-id', '0').and('contain.text', 'Beta');
  });

  it('does not apply root sort state when sortable is disabled', () => {
    mount(<Grid sortable={false} sortState={{ sortColumn: 'name', sortDirection: 'ascending' }} />);
    expectOrder([0, 'a', 'c']);
    cy.contains('[role="columnheader"]', 'Name').should('not.have.attr', 'aria-sort');
  });

  it('controlled sorting requests a root change but rows wait for the owner to accept it', () => {
    const change = cy.stub().as('sortChange');
    const Fixture = () => {
      const [sortState, setSortState] = React.useState<NonNullable<DataGridProps['sortState']>>({
        sortColumn: 'name',
        sortDirection: 'ascending',
      });
      return (
        <>
          <button onClick={() => setSortState({ sortColumn: 'name', sortDirection: 'descending' })}>Accept sort</button>
          <Grid sortable sortState={sortState} onSortChange={change} />
        </>
      );
    };
    mount(<Fixture />);
    expectOrder(['a', 0, 'c']);
    cy.contains('[role="columnheader"]', 'Name').realClick();
    cy.get('@sortChange')
      .should('have.been.calledOnce')
      .its('firstCall.args.1')
      .should('deep.equal', { sortColumn: 'name', sortDirection: 'descending' });
    expectOrder(['a', 0, 'c']);
    cy.contains('button', 'Accept sort').realClick();
    expectOrder(['c', 0, 'a']);
  });

  for (const mode of ['single', 'multiselect'] as const) {
    it(`real root ${mode} selection reflects per-item row context and callbacks`, () => {
      const change = cy.stub().as('selectionChange');
      mount(<Grid selectionMode={mode} onSelectionChange={change} />);
      row(0).realClick();
      row(0).should('have.attr', 'aria-selected', 'true');
      row('a').should('have.attr', 'aria-selected', 'false').realClick();
      row('a').should('have.attr', 'aria-selected', 'true');
      row(0).should('have.attr', 'aria-selected', mode === 'single' ? 'false' : 'true');
      cy.get('@selectionChange').then(() => {
        expect([...change.firstCall.args[1].selectedItems]).to.deep.equal([0]);
        expect([...change.lastCall.args[1].selectedItems]).to.deep.equal(mode === 'single' ? ['a'] : [0, 'a']);
      });
    });
  }

  it('controlled selection leaves rows unchanged until root owner updates selectedItems', () => {
    const change = cy.stub().as('selectionChange');
    const Fixture = () => {
      const [selected, setSelected] = React.useState<Set<TableRowId>>(new Set());
      return (
        <>
          <button onClick={() => setSelected(new Set([0]))}>Accept selection</button>
          <Grid selectionMode="multiselect" selectedItems={selected} onSelectionChange={change} />
        </>
      );
    };
    mount(<Fixture />);
    row(0).realClick().should('have.attr', 'aria-selected', 'false');
    cy.get('@selectionChange').then(() => expect([...change.firstCall.args[1].selectedItems]).to.deep.equal([0]));
    cy.contains('button', 'Accept selection').realClick();
    row(0).should('have.attr', 'aria-selected', 'true');
    row('a').should('have.attr', 'aria-selected', 'false');
  });

  it('body stays passive while real root cell keyboard navigation moves through current rows', () => {
    mount(<Grid focusMode="cell" />);
    row(0).find('.fui-DataGridCell').first().focus().realPress('ArrowDown');
    row('a').find('.fui-DataGridCell').first().should('have.focus').realPress('ArrowRight');
    row('a').find('.fui-DataGridCell').last().should('have.focus').realPress('ArrowDown');
    row('c').find('.fui-DataGridCell').last().should('have.focus');
    body().should('not.have.attr', 'tabindex');
    body().should('not.have.attr', 'aria-selected');
  });

  it('real row keyboard selection uses numeric zero context after sorting', () => {
    const change = cy.stub().as('selectionChange');
    mount(
      <Grid
        sortable
        focusMode="row_unstable"
        selectionMode="multiselect"
        onSelectionChange={change}
        defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
      />,
    );
    row(0).focus().should('have.focus').realPress('Space');
    row(0).should('have.attr', 'aria-selected', 'true');
    cy.get('@selectionChange').then(() => expect([...change.lastCall.args[1].selectedItems]).to.deep.equal([0]));
    expectOrder(['a', 0, 'c']);
  });
});

type ContextFixtureProps = {
  records?: Item[];
  advertisedItems?: Item[];
  sortable?: boolean;
  reverse?: boolean;
  observeRows?: (rows: TableRowData<Item>[], enhancer: unknown) => void;
  observeSort?: (rows: TableRowData<Item>[]) => void;
  children: React.ReactNode;
};
const ContextFixture = ({
  records = items,
  advertisedItems = [],
  sortable = false,
  reverse = false,
  observeRows,
  observeSort,
  children,
}: ContextFixtureProps) => {
  const features = useTableFeatures({ items: records, columns, getRowId: item => item.id });
  const getRows: TableFeaturesState<Item>['getRows'] = <TRowState extends TableRowData<Item>>(
    enhancer?: RowEnhancer<Item, TRowState>,
  ) => {
    const rows = features.getRows(enhancer);
    observeRows?.(rows, enhancer);
    return rows;
  };
  const sort = <TRowState extends TableRowData<Item>>(rows: TRowState[]) => {
    observeSort?.(rows);
    return reverse ? [...rows].reverse() : rows;
  };
  return (
    <TableContextProvider value={{ noNativeElements: true, sortable, size: 'medium' }}>
      <DataGridContextProvider
        value={{
          ...dataGridContextDefaultValue,
          ...features,
          items: advertisedItems,
          getRows,
          sort: { ...features.sort, sort },
        }}
      >
        {children}
      </DataGridContextProvider>
    </TableContextProvider>
  );
};

const RootRenderBody = ({
  renderRoot,
  ...props
}: DataGridBodyProps & { renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> }) => {
  const state = useDataGridBody_unstable(props, null);
  state.root = slot.always({ ...state.root, children: renderRoot }, { elementType: 'div' });
  useDataGridBodyStyles_unstable(state);
  return renderDataGridBody_unstable(state);
};

const NativeBody = ({ forwardedRef }: { forwardedRef: React.Ref<HTMLTableSectionElement> }) => {
  const state = useDataGridBody_unstable(
    {
      children: ({ item, rowId }) => {
        if (typeof item !== 'object' || item === null || !('name' in item) || !('amount' in item)) {
          throw new Error('Native fixture received an invalid item');
        }
        return (
          <tr role="row" data-row-id={rowId}>
            <td role="gridcell">{String(item.name)}</td>
            <td role="gridcell">{String(item.amount)}</td>
          </tr>
        );
      },
    },
    forwardedRef,
  );
  // assertSlots still reconciles slot element types against this compatibility map in development.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  state.components.root = 'tbody';
  state.root = slot.always<React.ComponentPropsWithRef<'tbody'>>(
    { id: 'body', ref: forwardedRef, role: 'rowgroup', 'aria-label': 'Native rows' },
    { elementType: 'tbody' },
  );
  useDataGridBodyStyles_unstable(state);
  return renderDataGridBody_unstable(state);
};

describe('DataGridBody source and unit-derived regressions (round 3)', () => {
  for (const sortable of [false, true]) {
    it(`exact dispatch gets rows without an enhancer and invokes sort only when sortable=${sortable}`, () => {
      const getRows = cy.stub().as('getRows');
      const sort = cy.stub().as('sort');
      const renderRow = cy.spy((data: TableRowData<Item>) => <Row {...data} />).as('renderRow');
      mount(
        <ContextFixture sortable={sortable} reverse observeRows={getRows} observeSort={sort}>
          <DataGridBody<Item> id="body">{renderRow}</DataGridBody>
        </ContextFixture>,
      );
      expectOrder(sortable ? ['c', 'a', 0] : [0, 'a', 'c']);
      cy.get('@getRows').then(() => {
        expect(getRows.callCount).to.be.greaterThan(0);
        expect(renderRow.callCount).to.equal(getRows.callCount * items.length);
        expect(sort.callCount).to.equal(sortable ? getRows.callCount : 0);
        getRows.getCalls().forEach(call => expect(call.args[1]).to.equal(undefined));
        if (sortable) {
          sort.getCalls().forEach((call, index) => expect(call.args[0]).to.equal(getRows.getCall(index).args[0]));
        }
        const expected = sortable ? [...getRows.lastCall.args[0]].reverse() : getRows.lastCall.args[0];
        renderRow
          .getCalls()
          .slice(-3)
          .forEach((call, index) => expect(call.args[0]).to.equal(expected[index]));
      });
    });
  }

  it('maps current getRows output rather than the independently advertised context items', () => {
    mount(
      <ContextFixture records={[items[2]]} advertisedItems={[items[0], items[1]]}>
        <DataGridBody<Item> id="body">{data => <Row {...data} />}</DataGridBody>
      </ContextFixture>,
    );
    expectOrder(['c']);
    row('c').should('contain.text', 'Gamma');
    row(0).should('not.exist');
    row('a').should('not.exist');
  });

  it('updates getRows and sort function identities and uses the current children closure', () => {
    const report = cy.stub().as('report');
    const Fixture = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button onClick={() => setVersion(1)}>Replace context functions</button>
          <ContextFixture records={version ? [items[2], items[1]] : items} sortable reverse={!!version}>
            <DataGridBody<Item> id="body">
              {data => (
                <div role="row" data-row-id={data.rowId}>
                  <div role="gridcell">
                    <button onClick={() => report(version, data.item, data.rowId)}>{data.item.name}</button>
                  </div>
                </div>
              )}
            </DataGridBody>
          </ContextFixture>
        </>
      );
    };
    mount(<Fixture />);
    expectOrder([0, 'a', 'c']);
    body().contains('button', 'Beta').realClick();
    cy.get('@report').its('lastCall.args').should('deep.equal', [0, items[0], 0]);
    cy.contains('button', 'Replace context functions').realClick();
    expectOrder(['a', 'c']);
    body().contains('button', 'Alpha').realClick();
    cy.get('@report').its('lastCall.args').should('deep.equal', [1, items[1], 'a']);
  });

  it('changing only sortable context selects the existing sort function and preserves current membership', () => {
    const sort = cy.stub().as('sort');
    const Fixture = () => {
      const [sortable, setSortable] = React.useState(false);
      return (
        <>
          <button onClick={() => setSortable(!sortable)}>Toggle sortable</button>
          <ContextFixture sortable={sortable} reverse observeSort={sort}>
            <DataGridBody<Item> id="body">{data => <Row {...data} />}</DataGridBody>
          </ContextFixture>
        </>
      );
    };
    mount(<Fixture />);
    expectOrder([0, 'a', 'c']);
    cy.get('@sort').should('not.have.been.called');
    cy.contains('button', 'Toggle sortable').realClick();
    expectOrder(['c', 'a', 0]);
    cy.get('@sort').should('have.been.called');
    cy.then(() => sort.resetHistory());
    cy.contains('button', 'Toggle sortable').realClick();
    expectOrder([0, 'a', 'c']);
    cy.get('@sort').should('not.have.been.called');
  });

  it('sorting and mapping leave frozen original items, order and records unmodified', () => {
    const frozen = items.map(item => Object.freeze({ ...item }));
    Object.freeze(frozen);
    const renderRow = cy.spy((data: TableRowData<Item>) => <Row {...data} />).as('renderRow');
    mount(
      <Grid
        items={frozen}
        sortable
        defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
        bodyProps={{ children: renderRow }}
      />,
    );
    expectOrder(['a', 0, 'c']);
    cy.contains('[role="columnheader"]', 'Name').realClick();
    expectOrder(['c', 0, 'a']);
    cy.then(() => {
      expect(frozen.map(item => item.id)).to.deep.equal([0, 'a', 'c']);
      expect(frozen).to.deep.equal(items);
      renderRow.getCalls().forEach(call => expect(frozen).to.include(call.args[0].item));
    });
  });

  it('a hook-composed whole-root slot function receives mapped children once per root render, not row data', () => {
    const root = cy
      .spy(
        (
          Component: React.ElementType<React.ComponentPropsWithRef<'div'>>,
          props: React.ComponentPropsWithRef<'div'>,
        ) => (
          <Component {...props} data-root-rendered="true">
            {props.children}
          </Component>
        ),
      )
      .as('root');
    const rowRender = cy
      .spy(({ item, rowId }: TableRowData<unknown>) => (
        <div role="row" data-row-id={rowId}>
          <div role="gridcell">
            {typeof item === 'object' && item !== null && 'name' in item ? String(item.name) : 'invalid'}
          </div>
        </div>
      ))
      .as('rowRender');
    mount(
      <ContextFixture>
        <RootRenderBody id="body" aria-label="Root function rows" className="consumer-root" renderRoot={root}>
          {rowRender}
        </RootRenderBody>
      </ContextFixture>,
    );
    expectOrder([0, 'a', 'c']);
    body()
      .should('have.attr', 'data-root-rendered', 'true')
      .and('have.attr', 'aria-label', 'Root function rows')
      .and('have.class', 'consumer-root')
      .and('have.class', 'fui-DataGridBody');
    cy.get('@root').then(() => {
      expect(root.callCount).to.be.greaterThan(0);
      expect(rowRender.callCount).to.equal(root.callCount * items.length);
      root.getCalls().forEach(call => {
        expect(call.args).to.have.length(2);
        expect(call.args[0]).to.equal('div');
        expect(call.args[1].children).to.be.an('array').with.length(3);
        expect(call.args[1]).not.to.have.property('item');
      });
    });
  });

  it('whole-root slot replacement can intentionally omit mapped rows without becoming a per-row renderer', () => {
    const rowRender = cy
      .spy(({ rowId }: TableRowData<unknown>) => <div role="row" data-row-id={rowId} />)
      .as('rowRender');
    const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props}>Root replacement</Component>
    );
    mount(
      <ContextFixture>
        <RootRenderBody id="body" renderRoot={renderRoot}>
          {rowRender}
        </RootRenderBody>
      </ContextFixture>,
    );
    body().should('have.text', 'Root replacement');
    body().children().should('have.length', 0);
    cy.get('@rowRender').should('have.been.called');
  });

  it('hook-composed native tbody uses actual root data under a valid table with native rows and cells', () => {
    const ref = React.createRef<HTMLTableSectionElement>();
    mount(
      <DataGrid
        as="table"
        noNativeElements={false}
        focusMode="none"
        items={items}
        columns={columns}
        getRowId={(item: Item) => item.id}
        aria-label="Native records"
        aria-rowcount={4}
      >
        <thead>
          <tr role="row">
            <th scope="col" role="columnheader">
              Name
            </th>
            <th scope="col" role="columnheader">
              Amount
            </th>
          </tr>
        </thead>
        <NativeBody forwardedRef={ref} />
      </DataGrid>,
    );
    body()
      .should('have.prop', 'tagName', 'TBODY')
      .and('have.attr', 'role', 'rowgroup')
      .and('have.class', 'fui-DataGridBody')
      .and('have.class', 'fui-TableBody');
    body().should('have.css', 'display', 'table-row-group');
    body().then($body => {
      expect(ref.current).to.equal($body[0]);
      expect($body[0].parentElement?.tagName).to.equal('TABLE');
      expect($body[0].parentElement?.getAttribute('role')).to.equal('grid');
    });
    expectOrder([0, 'a', 'c']);
    body().children('tr').should('have.length', 3);
    body().find('tr > td[role="gridcell"]').should('have.length', 6);
    body().find('div').should('not.exist');
    cy.get('table[role="grid"]').should('have.length', 1).and('have.attr', 'aria-rowcount', '4');
    body().should('not.have.attr', 'aria-rowcount');
  });

  it('string zero and empty-string IDs are delivered without truthiness fallback', () => {
    const records: Item[] = [
      { id: '0', name: 'String zero', amount: 1 },
      { id: '', name: 'Empty ID', amount: 2 },
    ];
    const Probe = ({ item, rowId }: TableRowData<Item>) => (
      <div role="row" data-row-id={rowId} data-context-type={typeof useTableRowIdContext()}>
        <div role="gridcell">
          {String(useTableRowIdContext())}:{item.name}
        </div>
      </div>
    );
    mount(<Grid items={records} bodyProps={{ children: data => <Probe {...data} /> }} />);
    expectOrder(['0', '']);
    body().children().first().should('have.attr', 'data-context-type', 'string').and('have.text', '0:String zero');
    body().children().last().should('have.attr', 'data-context-type', 'string').and('have.text', ':Empty ID');
  });

  it('body root role and aria overrides are forwarded rather than regenerated as row props', () => {
    mount(<Grid bodyProps={{ role: 'presentation', 'aria-hidden': true, lang: 'fr', dir: 'rtl' }} />);
    body()
      .should('have.attr', 'role', 'presentation')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl');
    row(0).should('have.attr', 'role', 'row');
    row(0).should('not.have.attr', 'lang');
    expectOrder([0, 'a', 'c']);
  });

  for (const noNativeElements of [false, true]) {
    it(`real-root tbody request keeps current mapped rows in a div with noNativeElements=${noNativeElements}`, () => {
      mount(<Grid as="div" noNativeElements={noNativeElements} bodyProps={{ as: 'tbody' }} />);
      expectOrder([0, 'a', 'c']);
      body().should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'rowgroup');
      body().should('have.css', 'display', noNativeElements ? 'block' : 'table-row-group');
      body().find('[role="gridcell"]').should('have.length', 6);
      cy.get('tbody').should('not.exist');
      body().parent().should('have.attr', 'role', 'grid');
    });
  }

  it('consumer inline layout and style updates belong to the single body root rather than per-item rows', () => {
    const Fixture = () => {
      const [flex, setFlex] = React.useState(false);
      return (
        <>
          <button onClick={() => setFlex(true)}>Change body style</button>
          <Grid
            bodyProps={{ style: { display: flex ? 'flex' : 'block' }, className: flex ? 'new-body' : 'old-body' }}
          />
        </>
      );
    };
    mount(<Fixture />);
    body().should('have.css', 'display', 'block').and('have.class', 'old-body');
    cy.contains('button', 'Change body style').realClick();
    body()
      .should('have.css', 'display', 'flex')
      .and('have.class', 'new-body')
      .and('not.have.class', 'old-body')
      .and('have.class', 'fui-DataGridBody')
      .and('have.class', 'fui-TableBody');
    body()
      .children()
      .each($row => expect($row.attr('style')).to.equal(undefined));
    expectOrder([0, 'a', 'c']);
  });

  it('latest root sort callback and comparator reorder the same retained body rows with current items', () => {
    const report = cy.stub().as('report');
    const Fixture = () => {
      const [version, setVersion] = React.useState('old');
      const defs =
        version === 'old'
          ? columns
          : [
              createTableColumn<Item>({
                ...columns[0],
                compare: (a, b) => b.name.localeCompare(a.name),
              }),
              columns[1],
            ];
      return (
        <>
          <button onClick={() => setVersion('new')}>Replace sorting</button>
          <Grid sortable columns={defs} onSortChange={(e, state) => report(version, state)} />
        </>
      );
    };
    mount(<Fixture />);
    expectOrder([0, 'a', 'c']);
    cy.contains('[role="columnheader"]', 'Name').realClick();
    expectOrder(['a', 0, 'c']);
    cy.get('@report')
      .its('lastCall.args')
      .should('deep.equal', ['old', { sortColumn: 'name', sortDirection: 'ascending' }]);
    cy.contains('button', 'Replace sorting').realClick();
    expectOrder(['c', 0, 'a']);
    cy.contains('[role="columnheader"]', 'Name').realClick();
    expectOrder(['a', 0, 'c']);
    cy.get('@report')
      .its('lastCall.args')
      .should('deep.equal', ['new', { sortColumn: 'name', sortDirection: 'descending' }]);
  });
});
