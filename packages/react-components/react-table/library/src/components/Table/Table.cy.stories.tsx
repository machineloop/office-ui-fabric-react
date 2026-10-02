import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  createTableColumn,
  useTableFeatures,
  useTableSort,
  useTableSelection,
  TableSelectionCell,
  useTableColumnSizing_unstable,
} from '../../index';
import type { TableProps, TableColumnId } from '../../index';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useTableContext } from '../../contexts/tableContext';

const content = () => (
  <>
    <TableHeader id="table-head">
      <TableRow id="header-row">
        <TableHeaderCell id="name-heading">Name</TableHeaderCell>
        <TableHeaderCell id="count-heading">Count</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody id="table-body">
      <TableRow id="row-alpha">
        <TableCell id="cell-alpha">Alpha</TableCell>
        <TableCell>2</TableCell>
      </TableRow>
      <TableRow id="row-bravo">
        <TableCell>Bravo</TableCell>
        <TableCell>1</TableCell>
      </TableRow>
    </TableBody>
  </>
);

const Example = (props: TableProps) => (
  <Table id="table" aria-label="Inventory" {...props}>
    {props.children ?? content()}
  </Table>
);

const mountTable = (props: TableProps = {}) =>
  mount(
    <FluentProvider theme={webLightTheme}>
      <Example {...props} />
    </FluentProvider>,
  );

const records = [
  { name: 'Alpha', count: 2 },
  { name: 'Bravo', count: 1 },
];
const columns = [
  createTableColumn<(typeof records)[number]>({ columnId: 'name', compare: (a, b) => a.name.localeCompare(b.name) }),
  createTableColumn<(typeof records)[number]>({ columnId: 'count', compare: (a, b) => a.count - b.count }),
];

describe('Table live source and conformance contracts', () => {
  it('forwards explicit native table attributes when as="table" is provided', () => {
    mountTable({ as: 'table', cellPadding: 7, cellSpacing: 3 });
    cy.get('#table').should('have.prop', 'tagName', 'TABLE');
    cy.get('#table').should('have.attr', 'cellpadding', '7').and('have.attr', 'cellspacing', '3');
    cy.get('#table').should('not.have.attr', 'role');
  });

  it('honors an explicit div root with consumer-provided role-based children', () => {
    mountTable({ as: 'div', noNativeElements: true });
    cy.get('#table').should('have.prop', 'tagName', 'DIV');
    cy.get('#table').should('have.attr', 'role', 'table');
    cy.get('#cell-alpha').should('have.attr', 'role', 'cell');
  });

  it('forwards consumer classes, styles, native data and ARIA props without leaking context-only props', () => {
    mountTable({
      className: 'consumer-table',
      style: { border: '4px solid red' },
      title: 'Inventory details',
      sortable: true,
      size: 'small',
      noNativeElements: true,
    });
    cy.get('#table').should('have.class', 'fui-Table').and('have.class', 'consumer-table');
    cy.get('#table').should('have.css', 'border-top-width', '4px').and('have.attr', 'title', 'Inventory details');
    cy.get('#table').should(table => {
      for (const attribute of ['size', 'sortable', 'nonativeelements']) {
        expect(table[0].hasAttribute(attribute), attribute).to.equal(false);
      }
    });
  });

  it('updates size on the same root and cell while preserving rendered content', () => {
    function LiveSize() {
      const [size, setSize] = React.useState<TableProps['size']>('medium');
      return (
        <>
          <button id="small-size" onClick={() => setSize('small')}>
            Small
          </button>
          <button id="extra-small-size" onClick={() => setSize('extra-small')}>
            Extra small
          </button>
          <Example size={size} noNativeElements />
        </>
      );
    }
    mount(
      <FluentProvider theme={webLightTheme}>
        <LiveSize />
      </FluentProvider>,
    );
    cy.get('#table').then(root => {
      cy.get('#cell-alpha').then(cell => {
        cy.get('#small-size').realClick();
        cy.get('#table').should(current => expect(current[0]).to.equal(root[0]));
        cy.get('#cell-alpha').should(current => {
          expect(current[0]).to.equal(cell[0]);
          expect(current[0].getBoundingClientRect().height).to.equal(34);
        });
        cy.get('#extra-small-size').realClick();
        cy.get('#cell-alpha').should('have.css', 'min-height', '24px').and('have.text', 'Alpha');
      });
    });
  });

  it('updates sortable context and per-header accessibility on existing DOM', () => {
    function LiveSortability() {
      const [sortable, setSortable] = React.useState(false);
      return (
        <>
          <button id="toggle-sortability" onClick={() => setSortable(value => !value)}>
            Toggle sortable
          </button>
          <Example sortable={sortable} />
        </>
      );
    }
    mount(
      <FluentProvider theme={webLightTheme}>
        <LiveSortability />
      </FluentProvider>,
    );
    cy.get('#name-heading').then(header => {
      cy.get('#name-heading [role="button"]').should('not.exist');
      cy.get('#toggle-sortability').realClick();
      cy.get('#name-heading').should(current => expect(current[0]).to.equal(header[0]));
      cy.get('#name-heading').should('have.attr', 'aria-sort', 'none');
      cy.get('#name-heading [role="button"]').should('have.attr', 'tabindex', '0');
      cy.get('#toggle-sortability').realClick();
      cy.get('#name-heading').should('not.have.attr', 'aria-sort');
      cy.get('#name-heading [role="button"]').should('not.exist');
    });
  });

  it('updates native-element policy, root ref and all descendant semantics in both directions', () => {
    const ref = React.createRef<HTMLDivElement>();
    function LiveNativePolicy() {
      const [noNativeElements, setNoNativeElements] = React.useState(false);
      return (
        <>
          <button id="toggle-native" onClick={() => setNoNativeElements(value => !value)}>
            Toggle markup
          </button>
          <Table id="table" ref={ref} noNativeElements={noNativeElements} aria-label="Live inventory">
            {content()}
          </Table>
        </>
      );
    }
    mount(
      <FluentProvider theme={webLightTheme}>
        <LiveNativePolicy />
      </FluentProvider>,
    );
    cy.get('#table').should(root => {
      expect(root[0].tagName).to.equal('TABLE');
      expect(ref.current).to.equal(root[0]);
    });
    cy.get('#toggle-native').realClick();
    cy.get('#table').should(root => {
      expect(root[0].tagName).to.equal('DIV');
      expect(ref.current).to.equal(root[0]);
    });
    cy.get('#table [role="rowgroup"]').should('have.length', 2);
    cy.get('#table [role="cell"]').should('have.length', 4);
    cy.get('#table tbody, #table td').should('not.exist');
    cy.get('#toggle-native').realClick();
    cy.get('#table').should(root => {
      expect(root[0].tagName).to.equal('TABLE');
      expect(ref.current).to.equal(root[0]);
    });
    cy.get('#table tbody td').should('have.length', 4);
    cy.get('#table [role="cell"]').should('not.exist');
  });

  it('isolates nested table contexts and restores default context outside the table', () => {
    function Probe({ id }: { id: string }) {
      const context = useTableContext();
      return (
        <span
          id={id}
          data-size={context.size}
          data-native={String(!context.noNativeElements)}
          data-sortable={String(context.sortable)}
        >
          Context
        </span>
      );
    }
    mount(
      <FluentProvider theme={webLightTheme}>
        <Table id="outer-table" noNativeElements size="extra-small" sortable>
          <TableBody>
            <TableRow>
              <TableCell>
                <Probe id="outer-probe" />
                <Table id="inner-table" size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Probe id="inner-probe" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Probe id="restored-outer-probe" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Probe id="default-probe" />
      </FluentProvider>,
    );
    cy.get('#outer-probe, #restored-outer-probe').each(probe => {
      expect(probe.attr('data-size')).to.equal('extra-small');
      expect(probe.attr('data-native')).to.equal('false');
      expect(probe.attr('data-sortable')).to.equal('true');
    });
    cy.get('#inner-probe').should('have.attr', 'data-size', 'small').and('have.attr', 'data-native', 'true');
    cy.get('#inner-probe').should('have.attr', 'data-sortable', 'false');
    cy.get('#default-probe').should('have.attr', 'data-size', 'medium').and('have.attr', 'data-native', 'true');
    cy.get('#default-probe').should('have.attr', 'data-sortable', 'false');
    cy.get('#inner-table td').should('have.length', 1);
  });

  it('forwards latest root event handlers and preserves bubbling/cancellation ordering', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const cellClick = cy.spy().as('cellClick');
    function LiveHandlers() {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update-handler" onClick={() => setUpdated(true)}>
            Update
          </button>
          <Example onClick={updated ? second : first}>
            <TableBody>
              <TableRow>
                <TableCell id="bubble-cell" onClick={event => cellClick(event.type)}>
                  Bubbles
                </TableCell>
                <TableCell id="stop-cell" onClick={event => event.stopPropagation()}>
                  Stops
                </TableCell>
              </TableRow>
            </TableBody>
          </Example>
        </>
      );
    }
    mount(
      <FluentProvider theme={webLightTheme}>
        <LiveHandlers />
      </FluentProvider>,
    );
    cy.get('#bubble-cell').realClick();
    cy.get('@cellClick').should('have.been.calledOnceWithExactly', 'click');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('#update-handler').realClick();
    cy.get('#bubble-cell').realClick();
    cy.get('@second').should('have.been.calledOnce');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('#stop-cell').realClick();
    cy.get('@second').should('have.been.calledOnce');
  });

  for (const noNativeElements of [false, true]) {
    it(`forwards the real ${noNativeElements ? 'div' : 'table'} object ref and clears it after unmount`, () => {
      const ref = React.createRef<HTMLDivElement>();
      function RefExample() {
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            <button id="unmount-table" onClick={() => setVisible(false)}>
              Unmount
            </button>
            {visible && (
              <Table id="table" ref={ref} noNativeElements={noNativeElements}>
                {content()}
              </Table>
            )}
          </>
        );
      }
      mount(
        <FluentProvider theme={webLightTheme}>
          <RefExample />
        </FluentProvider>,
      );
      cy.get('#table').should(table => expect(ref.current).to.equal(table[0]));
      cy.get('#unmount-table').realClick();
      cy.get('#table').should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  }

  it('notifies callback refs on mount and root unmount', () => {
    const ref = cy.spy().as('ref');
    function RefExample() {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="unmount-callback-table" onClick={() => setVisible(false)}>
            Unmount
          </button>
          {visible && (
            <Table id="table" ref={ref}>
              {content()}
            </Table>
          )}
        </>
      );
    }
    mount(
      <FluentProvider theme={webLightTheme}>
        <RefExample />
      </FluentProvider>,
    );
    cy.get('#table').then(table => cy.get('@ref').should('have.been.calledWith', table[0]));
    cy.get('#unmount-callback-table').realClick();
    cy.get('#table').should('not.exist');
    cy.get('@ref').should('have.been.calledWith', null);
  });

  it('renders live empty and restored row data without replacing the root or header', () => {
    function LiveRows() {
      const [empty, setEmpty] = React.useState(false);
      return (
        <>
          <button id="toggle-rows" onClick={() => setEmpty(value => !value)}>
            Toggle rows
          </button>
          <Example>
            <TableHeader>
              <TableRow>
                <TableHeaderCell id="stable-header">Name</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody id="live-body">
              {!empty && (
                <TableRow>
                  <TableCell>Restorable row</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Example>
        </>
      );
    }
    mount(
      <FluentProvider theme={webLightTheme}>
        <LiveRows />
      </FluentProvider>,
    );
    cy.get('#table').then(root => {
      cy.get('#stable-header').then(header => {
        cy.get('#toggle-rows').realClick();
        cy.get('#live-body').should('be.empty');
        cy.get('#table').should(current => expect(current[0]).to.equal(root[0]));
        cy.get('#stable-header').should(current => expect(current[0]).to.equal(header[0]));
        cy.get('#toggle-rows').realClick();
        cy.get('#live-body').should('contain.text', 'Restorable row');
      });
    });
  });
});
function SortExample({ controlled, noNativeElements = false }: { controlled: boolean; noNativeElements?: boolean }) {
  const [sortState, setSortState] = React.useState<{
    sortColumn: TableColumnId | undefined;
    sortDirection: 'ascending' | 'descending';
  }>({
    sortColumn: 'name',
    sortDirection: 'ascending',
  });
  const {
    getRows,
    sort: { sort, getSortDirection, toggleColumnSort },
  } = useTableFeatures({ columns, items: records }, [
    useTableSort({
      ...(controlled ? { sortState } : { defaultSortState: sortState }),
      onSortChange: (_, data) => setSortState(data),
    }),
  ]);
  return (
    <Example sortable noNativeElements={noNativeElements}>
      <TableHeader>
        <TableRow>
          {['name', 'count'].map(column => (
            <TableHeaderCell
              key={column}
              id={`sort-${column}`}
              sortDirection={getSortDirection(column)}
              onClick={event => toggleColumnSort(event, column)}
            >
              {column}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody id="sorted-body">
        {sort(getRows()).map(({ item }) => (
          <TableRow key={item.name} data-row={item.name}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Example>
  );
}

describe('Table documented browser contracts', () => {
  it('renders semantic table structure and keeps two-dimensional data in its rows', () => {
    mountTable();
    cy.get('#table').should('have.prop', 'tagName', 'TABLE');
    cy.get('#table-head').should('have.prop', 'tagName', 'THEAD');
    cy.get('#table-body').should('have.prop', 'tagName', 'TBODY');
    cy.get('#table tr').should('have.length', 3);
    cy.get('#table th').should('have.length', 2);
    cy.get('#table td').should('have.length', 4);
    cy.get('#row-alpha').should('contain.text', 'Alpha').and('contain.text', '2');
    cy.get('#table').should('have.css', 'display', 'table').and('have.css', 'table-layout', 'fixed');
    cy.get('#table').should('have.css', 'border-collapse', 'collapse');
  });

  it('propagates noNativeElements to every descendant with semantic roles and flex row layout', () => {
    mountTable({ noNativeElements: true });
    cy.get('#table').should('have.prop', 'tagName', 'DIV');
    cy.get('#table').should('have.attr', 'role', 'table').and('have.css', 'display', 'block');
    cy.get('#table [role="rowgroup"]').should('have.length', 2);
    cy.get('#table [role="row"]').should('have.length', 3);
    cy.get('#table [role="columnheader"]').should('have.length', 2);
    cy.get('#table [role="cell"]').should('have.length', 4);
    cy.get('#table table, #table thead, #table tbody, #table tr, #table th, #table td').should('not.exist');
    cy.get('#row-alpha').should('have.css', 'display', 'flex');
    cy.get('#cell-alpha').should('have.css', 'display', 'flex');
    cy.get('#row-alpha').should(row => {
      const cells = row[0].children;
      expect(cells[0].getBoundingClientRect().width).to.be.greaterThan(0);
      expect(cells[1].getBoundingClientRect().left).to.be.greaterThan(cells[0].getBoundingClientRect().left);
    });
  });

  for (const [noNativeElements, size, cellHeight, rowHeight] of [
    [false, 'extra-small', 24, 24],
    [false, 'small', 35, 35],
    [false, 'medium', 45, 45],
    [true, 'extra-small', 24, 24],
    [true, 'small', 34, 35],
    [true, 'medium', 44, 45],
  ] as const) {
    it(`propagates ${size} size into real ${noNativeElements ? 'flex' : 'native'} row geometry`, () => {
      mountTable({ size, noNativeElements });
      cy.get('#cell-alpha').should(cell => expect(cell[0].getBoundingClientRect().height).to.equal(cellHeight));
      cy.get('#row-alpha').should(row => expect(row[0].getBoundingClientRect().height).to.equal(rowHeight));
    });
  }

  it('uses the best-practice accessible label and visible heading reference', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <h2 id="inventory-heading">Current inventory</h2>
        <Example aria-labelledby="inventory-heading" />
      </FluentProvider>,
    );
    cy.get('#table').should(table => expect(computeAccessibleName(table[0])).to.equal('Current inventory'));
  });

  it('preserves an explicit min-width under a narrow scroll container', () => {
    cy.viewport(400, 500);
    mount(
      <FluentProvider theme={webLightTheme}>
        <div id="scroll-container" style={{ width: 250, overflowX: 'auto' }}>
          <Example style={{ minWidth: 600 }} />
        </div>
      </FluentProvider>,
    );
    cy.get('#table').should(table => expect(table[0].getBoundingClientRect().width).to.be.at.least(600));
    cy.get('#scroll-container').should(container =>
      expect(container[0].scrollWidth).to.be.greaterThan(container[0].clientWidth),
    );
  });

  for (const controlled of [false, true]) {
    it(`composes documented ${
      controlled ? 'controlled' : 'uncontrolled'
    } sorting with pointer and keyboard activation`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <SortExample controlled={controlled} />
        </FluentProvider>,
      );
      cy.get('#sort-name').should('have.attr', 'aria-sort', 'ascending');
      cy.get('#sorted-body > *').first().should('have.attr', 'data-row', 'Alpha');
      cy.get('#sort-name [role="button"]').realClick();
      cy.get('#sort-name').should('have.attr', 'aria-sort', 'descending');
      cy.get('#sorted-body > *').first().should('have.attr', 'data-row', 'Bravo');
      cy.get('#sort-count [role="button"]').focus();
      cy.realPress('Enter');
      cy.get('#sort-count').should('have.attr', 'aria-sort', 'ascending');
      cy.get('#sort-name').should('have.attr', 'aria-sort', 'none');
      cy.get('#sorted-body > *').first().should('have.attr', 'data-row', 'Bravo');
      cy.realPress('Space');
      cy.get('#sort-count').should('have.attr', 'aria-sort', 'descending');
      cy.get('#sorted-body > *').first().should('have.attr', 'data-row', 'Alpha');
    });
  }
});

describe('Table native boundaries and accessibility', () => {
  for (const noNativeElements of [false, true]) {
    it(`passes scoped axe and has a named ${noNativeElements ? 'role-based' : 'native'} table`, () => {
      mountTable({ noNativeElements });
      cy.get('#table').should(table => expect(computeAccessibleName(table[0])).to.equal('Inventory'));
      cy.get('#table').then(async table => {
        const results = await axe.run(table[0]);
        expect(results.violations).to.deep.equal([]);
      });
    });

    it(`does not invent keyboard navigation or tab stops for primitive ${
      noNativeElements ? 'div' : 'native'
    } cells`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <button id="before-table">Before</button>
          <Example noNativeElements={noNativeElements} tabIndex={0} />
          <button id="after-table">After</button>
        </FluentProvider>,
      );
      cy.get('#before-table').focus();
      cy.realPress('Tab');
      cy.get('#table').should('have.focus');
      cy.realPress('ArrowDown');
      cy.realPress('ArrowRight');
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('#table').should('have.focus');
      cy.get('#table-body').should('contain.text', 'Alpha2Bravo1');
      cy.realPress('Tab');
      cy.get('#after-table').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#table').should('have.focus');
    });
  }

  for (const [dir, nextKey] of [
    ['ltr', 'ArrowRight'],
    ['rtl', 'ArrowLeft'],
  ] as const) {
    it(`supports the documented consumer-supplied grid keyboard navigation in ${dir}`, () => {
      function Grid() {
        const attributes = useArrowNavigationGroup({ axis: 'grid' });
        return (
          <Example {...attributes} role="grid">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Count</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, row) => (
                <TableRow key={record.name}>
                  <TableCell id={`grid-${row}-0`} role="gridcell" tabIndex={0}>
                    {record.name}
                  </TableCell>
                  <TableCell id={`grid-${row}-1`} role="gridcell" tabIndex={0}>
                    {record.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Example>
        );
      }
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <Grid />
        </FluentProvider>,
      );
      cy.get('#table').should('have.attr', 'role', 'grid');
      cy.get('#grid-0-0').should(cell => {
        expect(cell[0].ownerDocument.defaultView!.getComputedStyle(cell[0]).direction).to.equal(dir);
      });
      cy.get('#table').should(table => {
        const mover = JSON.parse(table[0].getAttribute('data-tabster')!).mover;
        expect(mover.direction).to.equal(3);
        const first = table[0].querySelector('#grid-0-0')!.getBoundingClientRect();
        const second = table[0].querySelector('#grid-0-1')!.getBoundingClientRect();
        const directionSign = dir === 'rtl' ? -1 : 1;
        expect(
          (second.left - first.left) * directionSign,
          'columns follow the native writing direction',
        ).to.be.greaterThan(0);
      });
      cy.get('#grid-0-0').focus();
      cy.get('#grid-0-0').should('have.focus');
      cy.realPress(nextKey);
      cy.get('#grid-0-1').should(cell => {
        expect(cell[0].ownerDocument.activeElement?.id, 'native horizontal grid navigation target').to.equal(
          'grid-0-1',
        );
      });
      cy.realPress('ArrowDown');
      cy.get('#grid-1-1').should('have.focus');
      cy.realPress('ArrowUp');
      cy.get('#grid-0-1').should('have.focus');
      cy.realPress(nextKey);
      cy.get('#grid-0-1').should('have.focus');
      cy.realPress('Home');
      cy.get('#grid-0-0').should('have.focus');
      cy.realPress('End');
      cy.get('#grid-0-1').should('have.focus');
      cy.realPress('PageDown');
      cy.get('#grid-1-1').should('have.focus');
      cy.realPress('PageUp');
      cy.get('#grid-0-1').should('have.focus');
      cy.realPress(dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#grid-0-0').should('have.focus');
      cy.realPress(dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#grid-0-0').should('have.focus');
      cy.get('#grid-0-1').should(cell => {
        expect(cell[0].getBoundingClientRect().width).to.be.greaterThan(0);
        expect(cell[0].getBoundingClientRect().height).to.be.greaterThan(0);
      });
    });
  }

  it('supports sorting in a role-based nonnative table without losing table roles', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <SortExample controlled noNativeElements />
      </FluentProvider>,
    );
    cy.get('#table').should('have.attr', 'role', 'table');
    cy.get('#sort-name').should('have.attr', 'role', 'columnheader');
    cy.get('#sort-name [role="button"]').realClick();
    cy.get('#sorted-body > *').first().should('have.attr', 'data-row', 'Bravo');
    cy.get('#sorted-body [role="cell"]').should('have.length', 4);
  });

  it('lets a header override sortable context without affecting its siblings', () => {
    const enabledClick = cy.spy().as('enabledClick');
    const plainClick = cy.spy().as('plainClick');
    mountTable({
      sortable: true,
      children: (
        <>
          <TableHeader>
            <TableRow>
              <TableHeaderCell id="enabled-heading" onClick={enabledClick}>
                Sortable
              </TableHeaderCell>
              <TableHeaderCell id="plain-heading" sortable={false} onClick={plainClick}>
                Plain
              </TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>One</TableCell>
              <TableCell>Two</TableCell>
            </TableRow>
          </TableBody>
        </>
      ),
    });
    cy.get('#enabled-heading').should('have.attr', 'aria-sort', 'none');
    cy.get('#plain-heading').should('not.have.attr', 'aria-sort');
    cy.get('#plain-heading [role="button"]').should('not.exist');
    cy.get('#enabled-heading [role="button"]').focus();
    cy.realPress('Enter');
    cy.get('@enabledClick').should('have.been.calledOnce');
    cy.get('@plainClick').should('not.have.been.called');
  });

  it('lets a header opt into sorting when the table is not sortable', () => {
    mountTable({
      children: (
        <>
          <TableHeader>
            <TableRow>
              <TableHeaderCell id="opt-in" sortable sortDirection="ascending">
                Sortable
              </TableHeaderCell>
              <TableHeaderCell id="opt-out">Plain</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>One</TableCell>
              <TableCell>Two</TableCell>
            </TableRow>
          </TableBody>
        </>
      ),
    });
    cy.get('#opt-in').should('have.attr', 'aria-sort', 'ascending');
    cy.get('#opt-in [role="button"]').should('exist');
    cy.get('#opt-out [role="button"]').should('not.exist');
  });

  it('does not automatically reorder data merely because sortable is set', () => {
    mountTable({ sortable: true });
    cy.get('#name-heading [role="button"]').realClick();
    cy.get('#table-body > *').first().should('have.attr', 'id', 'row-alpha');
    cy.get('#name-heading').should('have.attr', 'aria-sort', 'none');
  });

  it('does not automatically select rows when data or cells are clicked', () => {
    mountTable();
    cy.get('#cell-alpha').realClick();
    cy.get('#row-alpha').should('not.have.attr', 'aria-selected');
    cy.get('#row-bravo').should('not.have.attr', 'aria-selected');
    cy.get('#table input').should('not.exist');
  });

  it('supports native caption and labelled table semantics with arbitrary table content', () => {
    mountTable({
      'aria-label': undefined,
      children: (
        <>
          <caption id="caption">Quarterly totals</caption>
          {content()}
          <tfoot>
            <tr>
              <td>Total</td>
              <td>3</td>
            </tr>
          </tfoot>
        </>
      ),
    });
    cy.get('#caption').should('be.visible');
    cy.get('#table').should(table => expect(computeAccessibleName(table[0])).to.equal('Quarterly totals'));
    cy.get('#table tfoot td').last().should('have.text', '3');
  });
});

function SelectionExample({
  controlled,
  selectionMode,
}: {
  controlled: boolean;
  selectionMode: 'single' | 'multiselect';
}) {
  const [selectedItems, setSelectedItems] = React.useState<Set<string | number>>(new Set());
  const {
    getRows,
    selection: { toggleRow, isRowSelected, allRowsSelected, someRowsSelected, toggleAllRows },
  } = useTableFeatures({ columns, items: records }, [
    useTableSelection({
      selectionMode,
      ...(controlled ? { selectedItems } : { defaultSelectedItems: selectedItems }),
      onSelectionChange: (_, data) => setSelectedItems(data.selectedItems),
    }),
  ]);
  const type = selectionMode === 'single' ? 'radio' : 'checkbox';
  return (
    <Example role="grid" aria-label="Selectable inventory">
      <TableHeader>
        <TableRow>
          {selectionMode === 'multiselect' ? (
            <TableSelectionCell
              id="select-all"
              checked={allRowsSelected ? true : someRowsSelected ? 'mixed' : false}
              onClick={toggleAllRows}
              onKeyDown={event => {
                if (event.key === ' ') {
                  event.preventDefault();
                  toggleAllRows(event);
                }
              }}
              checkboxIndicator={{ 'aria-label': 'Select all rows' }}
            />
          ) : (
            <TableHeaderCell>Select</TableHeaderCell>
          )}
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Count</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {getRows().map(({ item, rowId }) => (
          <TableRow
            key={item.name}
            id={`select-${item.name}`}
            tabIndex={0}
            aria-selected={isRowSelected(rowId)}
            onClick={event => toggleRow(event, rowId)}
            onKeyDown={event => {
              if (event.key === ' ') {
                event.preventDefault();
                toggleRow(event, rowId);
              }
            }}
          >
            <TableSelectionCell
              checked={isRowSelected(rowId)}
              type={type}
              role="gridcell"
              radioIndicator={{ 'aria-label': `Select ${item.name}` }}
              checkboxIndicator={{ 'aria-label': `Select ${item.name}` }}
            />
            <TableCell role="gridcell">{item.name}</TableCell>
            <TableCell role="gridcell">{item.count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Example>
  );
}

function ResizeExample({ firstId = 'name' }: { firstId?: TableColumnId }) {
  const resizeColumns = React.useMemo(() => [{ ...columns[0], columnId: firstId }, columns[1]], [firstId]);
  const {
    getRows,
    tableRef,
    columnSizing_unstable: sizing,
  } = useTableFeatures({ columns: resizeColumns, items: records }, [
    useTableColumnSizing_unstable({
      autoFitColumns: false,
      columnSizingOptions: {
        [firstId]: { defaultWidth: 200, minWidth: 100 },
        count: { defaultWidth: 200, minWidth: 100 },
      },
    }),
  ]);
  return (
    <>
      <button id="resize-keyboard" onClick={sizing.enableKeyboardMode(firstId)}>
        Resize name column
      </button>
      <Table id="table" noNativeElements aria-label="Resizable inventory" ref={tableRef} {...sizing.getTableProps()}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell id="resize-name" {...sizing.getTableHeaderCellProps(firstId)}>
              Name
            </TableHeaderCell>
            <TableHeaderCell {...sizing.getTableHeaderCellProps('count')}>Count</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getRows().map(({ item }) => (
            <TableRow key={item.name}>
              <TableCell id={`resize-cell-${item.name}`} {...sizing.getTableCellProps(firstId)}>
                {item.name}
              </TableCell>
              <TableCell {...sizing.getTableCellProps('count')}>{item.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

describe('Table documented feature composition', () => {
  for (const controlled of [false, true]) {
    for (const [selectionMode, alphaAfterSecond, alphaAfterSpace, bravoAfterSpace] of [
      ['single', 'false', 'true', 'false'],
      ['multiselect', 'true', 'false', 'true'],
    ] as const) {
      it(`composes ${controlled ? 'controlled' : 'uncontrolled'} ${selectionMode} selection with native events`, () => {
        mount(
          <FluentProvider theme={webLightTheme}>
            <SelectionExample controlled={controlled} selectionMode={selectionMode} />
          </FluentProvider>,
        );
        cy.get('#select-Alpha').should('have.attr', 'aria-selected', 'false');
        cy.get('#select-Alpha input').realClick();
        cy.get('#select-Alpha').should('have.attr', 'aria-selected', 'true');
        cy.get('#select-Alpha input').should('be.checked');
        cy.get('#select-Bravo input').realClick();
        cy.get('#select-Bravo').should('have.attr', 'aria-selected', 'true');
        cy.get('#select-Alpha').should('have.attr', 'aria-selected', alphaAfterSecond);
        cy.get('#select-Alpha').focus();
        cy.realPress('Space');
        cy.get('#select-Bravo').should('have.attr', 'aria-selected', bravoAfterSpace);
        cy.get('#select-Alpha').should('have.attr', 'aria-selected', alphaAfterSpace);
      });
    }
  }

  for (const controlled of [false, true]) {
    it(`composes ${
      controlled ? 'controlled' : 'uncontrolled'
    } select-all and mixed state with pointer and Space`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <SelectionExample controlled={controlled} selectionMode="multiselect" />
        </FluentProvider>,
      );
      cy.get('#select-all input').should('not.be.checked').and('have.prop', 'indeterminate', false);
      cy.get('#select-Alpha input').realClick();
      cy.get('#select-all input').should('have.prop', 'indeterminate', true);
      cy.get('#select-all input').realClick();
      cy.get('#select-all input').should('be.checked').and('have.prop', 'indeterminate', false);
      cy.get('#select-Alpha, #select-Bravo').should('have.attr', 'aria-selected', 'true');
      cy.get('#select-Alpha input, #select-Bravo input').each(input =>
        expect(input[0]).to.have.property('checked', true),
      );
      cy.get('#select-all input').focus();
      cy.realPress('Space');
      cy.get('#select-all input').should('not.be.checked').and('have.prop', 'indeterminate', false);
      cy.get('#select-Alpha, #select-Bravo').should('have.attr', 'aria-selected', 'false');
      cy.get('#select-Alpha input, #select-Bravo input').each(input =>
        expect(input[0]).to.have.property('checked', false),
      );
      cy.realPress('Space');
      cy.get('#select-all input').should('be.checked');
      cy.get('#select-Alpha, #select-Bravo').should('have.attr', 'aria-selected', 'true');
    });
  }

  for (const firstId of ['name', 0] as const) {
    it(`composes keyboard column resizing with real header and body geometry for column ${firstId}`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <ResizeExample firstId={firstId} />
        </FluentProvider>,
      );
      cy.get('#resize-name')
        .should(header => {
          expect(header[0].style.width).to.equal('200px');
          expect(header[0].getBoundingClientRect().width).to.be.greaterThan(0);
        })
        .then(header => {
          const width = header[0].getBoundingClientRect().width;
          cy.get('#resize-keyboard').realClick();
          cy.realPress('ArrowRight');
          cy.get('#resize-name, #resize-cell-Alpha').should(cells => {
            for (const cell of cells) {
              expect(cell.style.width).to.equal('220px');
              expect(cell.getBoundingClientRect().width).to.equal(width + 20);
            }
          });
          cy.realPress('ArrowLeft');
          cy.get('#resize-name').should(current => expect(current[0].getBoundingClientRect().width).to.equal(width));
          cy.realPress(['Shift', 'ArrowRight']);
          cy.get('#resize-name, #resize-cell-Alpha').should(cells => {
            for (const cell of cells) {
              expect(cell.style.width).to.equal('205px');
              expect(cell.getBoundingClientRect().width).to.equal(width + 5);
            }
          });
          cy.realPress(['Shift', 'ArrowLeft']);
          cy.get('#resize-name').should(current => expect(current[0].getBoundingClientRect().width).to.equal(width));
          cy.realPress('Escape');
          cy.get('#resize-name .fui-TableResizeHandle')
            .should('have.attr', 'aria-hidden', 'true')
            .and('not.have.attr', 'tabindex');
          cy.realPress('ArrowRight');
          cy.get('#resize-name').should(current => expect(current[0].getBoundingClientRect().width).to.equal(width));
          cy.get('#resize-keyboard').realClick();
          cy.get('#resize-name .fui-TableResizeHandle').should('be.focused').and('have.attr', 'aria-hidden', 'false');
          cy.get('#resize-keyboard').focus();
          cy.get('#resize-name .fui-TableResizeHandle')
            .should('have.attr', 'aria-hidden', 'true')
            .and('not.have.attr', 'tabindex');
          cy.realPress('ArrowRight');
          cy.get('#resize-name').should(current => expect(current[0].getBoundingClientRect().width).to.equal(width));
        });
    });

    it(`composes real pointer resizing, minimum-width clamping and release cleanup for column ${firstId}`, () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <ResizeExample firstId={firstId} />
        </FluentProvider>,
      );
      cy.get('#resize-name .fui-TableResizeHandle').realHover();
      cy.get('#resize-name .fui-TableResizeHandle')
        .should('be.visible')
        .then(handle => {
          const rect = handle[0].getBoundingClientRect();
          const bodyRect = handle[0].ownerDocument.body.getBoundingClientRect();
          const x = rect.left + rect.width / 2 - bodyRect.left;
          const y = rect.top + rect.height / 2 - bodyRect.top;
          cy.wrap(handle).realMouseDown({ position: 'center' });
          cy.get('body').realMouseMove(x + 40, y, { position: 'topLeft' });
          cy.get('#resize-name, #resize-cell-Alpha').should(cells => {
            for (const cell of cells) {
              expect(cell.style.width).to.equal('240px');
            }
            expect(cells[0].getBoundingClientRect().width).to.equal(cells[1].getBoundingClientRect().width);
          });
          cy.get('#resize-name').should('have.css', 'pointer-events', 'none');
          cy.get('body').realMouseMove(x - 200, y, { position: 'topLeft' });
          cy.get('#resize-name, #resize-cell-Alpha').should(cells => {
            for (const cell of cells) {
              expect(cell.style.width).to.equal('100px');
            }
          });
          cy.get('body').realMouseUp();
          cy.get('#resize-name').should('have.css', 'pointer-events', 'auto');
          cy.get('body').realMouseMove(x + 80, y, { position: 'topLeft' });
          cy.get('#resize-name, #resize-cell-Alpha').should(cells => {
            for (const cell of cells) {
              expect(cell.style.width).to.equal('100px');
            }
          });
        });
    });
  }
});

describe('Coupled navigation policy preservation', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const axis of ['horizontal', 'vertical'] as const) {
      it(`preserves ${axis} bounded and cyclic navigation in ${dir}`, () => {
        function Policy() {
          const [circular, setCircular] = React.useState(false);
          const attributes = useArrowNavigationGroup({ axis, circular });
          return (
            <>
              <button id="cycle-policy" onClick={() => setCircular(true)}>
                Enable circular
              </button>
              <Example {...attributes} role="grid">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>First</TableHeaderCell>
                    <TableHeaderCell>Second</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell id="policy-first" role="gridcell" tabIndex={0}>
                      First
                    </TableCell>
                    <TableCell id="policy-second" role="gridcell" tabIndex={0}>
                      Second
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Example>
            </>
          );
        }
        const forward = axis === 'vertical' ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        const backward = axis === 'vertical' ? 'ArrowUp' : dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
        mount(
          <FluentProvider theme={webLightTheme} dir={dir}>
            <Policy />
          </FluentProvider>,
        );
        cy.get('#policy-first').focus();
        cy.realPress(forward);
        cy.get('#policy-second').should('have.focus');
        cy.realPress(forward);
        cy.get('#policy-second').should('have.focus');
        cy.realPress(backward);
        cy.get('#policy-first').should('have.focus');
        cy.get('#cycle-policy').realClick();
        cy.get('#policy-second').focus();
        cy.realPress(forward);
        cy.get('#policy-first').should('have.focus');
        cy.realPress(backward);
        cy.get('#policy-second').should('have.focus');
      });
    }

    it(`keeps nested mover ownership and input arrow editing in ${dir}`, () => {
      function NestedPolicy() {
        const outer = useArrowNavigationGroup({ axis: 'grid' });
        const inner = useArrowNavigationGroup({ axis: 'horizontal' });
        return (
          <>
            <input id="native-policy-input" aria-label="Native editable control" defaultValue="abc" />
            <Example {...outer} role="grid">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Editing</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell role="gridcell">
                    <input id="policy-input" aria-label="Editable value" defaultValue="abc" />
                  </TableCell>
                  <TableCell role="gridcell">
                    <div {...inner}>
                      <button id="inner-first">First inner action</button>
                      <button id="inner-second">Second inner action</button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Example>
          </>
        );
      }
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <NestedPolicy />
        </FluentProvider>,
      );
      cy.get<HTMLInputElement>('#native-policy-input')
        .focus()
        .then(input => {
          input[0].setSelectionRange(1, 1);
        });
      cy.realPress('ArrowRight');
      cy.get<HTMLInputElement>('#native-policy-input').then(control => {
        const caret = control[0].selectionStart;
        expect(caret, 'native arrow key moves the caret').not.to.equal(1);
        cy.get<HTMLInputElement>('#policy-input')
          .focus()
          .then(input => input[0].setSelectionRange(1, 1));
        cy.realPress('ArrowRight');
        cy.get('#policy-input').should('have.focus').and('have.prop', 'selectionStart', caret);
      });
      cy.get('#inner-first').focus();
      cy.realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('#inner-second').should('have.focus');
      cy.realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('#inner-second').should('have.focus');
      cy.realPress('ArrowDown');
      cy.get('#inner-second').should('have.focus');
      cy.realPress(dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#inner-first').should('have.focus');
    });

    it(`honors explicit horizontal keydown opt-outs without disabling vertical grid movement in ${dir}`, () => {
      function OptOut() {
        const attributes = useArrowNavigationGroup({
          axis: 'grid',
          ignoreDefaultKeydown: { ArrowLeft: true, ArrowRight: true },
        });
        return (
          <Example {...attributes} role="grid">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>First</TableHeaderCell>
                <TableHeaderCell>Second</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((item, index) => (
                <TableRow key={item.name}>
                  <TableCell role="gridcell" tabIndex={0} id={`optout-${index}`}>
                    {item.name}
                  </TableCell>
                  <TableCell role="gridcell" tabIndex={0}>
                    {item.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Example>
        );
      }
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <OptOut />
        </FluentProvider>,
      );
      cy.get('#optout-0').focus();
      cy.realPress('ArrowLeft');
      cy.realPress('ArrowRight');
      cy.get('#optout-0').should('have.focus');
      cy.realPress('ArrowDown');
      cy.get('#optout-1').should('have.focus');
    });
  }
});

function BranchGeometry({ axis }: { axis: 'grid' | 'grid-linear' }) {
  const attributes = useArrowNavigationGroup({ axis });
  return (
    <Example {...attributes} role="grid" style={{ width: 600 }}>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>First column</TableHeaderCell>
          <TableHeaderCell>Second column</TableHeaderCell>
          <TableHeaderCell>Third column</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[0, 1, 2].map(row => (
          <TableRow key={row}>
            {[0, 1, 2].map(column => (
              <TableCell key={column} id={`geometry-${row}-${column}`} tabIndex={0} role="gridcell">
                Cell {row}-{column}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Example>
  );
}

describe('Independent grid row and page branches', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const [ltrKey, rtlKey, row, column] of [
      ['ArrowLeft', 'ArrowRight', 1, 0],
      ['ArrowRight', 'ArrowLeft', 1, 2],
      ['Home', 'Home', 1, 0],
      ['End', 'End', 1, 2],
      ['PageUp', 'PageUp', 0, 1],
      ['PageDown', 'PageDown', 2, 1],
    ] as const) {
      const key = dir === 'rtl' ? rtlKey : ltrKey;
      it(`uses the correct real-layout target for native ${key} in ${dir}`, () => {
        mount(
          <FluentProvider theme={webLightTheme} dir={dir}>
            <BranchGeometry axis="grid" />
          </FluentProvider>,
        );
        cy.get('#geometry-1-1')
          .should(origin => {
            expect(origin[0].ownerDocument.defaultView!.getComputedStyle(origin[0]).direction).to.equal(dir);
            expect(origin[0].getBoundingClientRect().width).to.be.greaterThan(0);
            expect(origin[0].getBoundingClientRect().height).to.be.greaterThan(0);
          })
          .then(origin => {
            const rect = origin[0].getBoundingClientRect();
            const directionSign = dir === 'rtl' ? -1 : 1;
            cy.get(`#geometry-${row}-${column}`).should(target => {
              const targetRect = target[0].getBoundingClientRect();
              expect(targetRect.left).to.equal(rect.left + (column - 1) * rect.width * directionSign);
              expect(targetRect.top).to.equal(rect.top + (row - 1) * rect.height);
              expect(targetRect.width).to.be.greaterThan(0);
              expect(targetRect.height).to.be.greaterThan(0);
            });
          });
        cy.get('#geometry-1-1').focus();
        cy.get('#geometry-1-1').should('have.focus');
        cy.realPress(key);
        cy.get(`#geometry-${row}-${column}`).should('have.focus');
      });
    }

    it(`preserves native GridLinear cross-row forward and reverse traversal in ${dir}`, () => {
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <BranchGeometry axis="grid-linear" />
        </FluentProvider>,
      );
      cy.get('#geometry-0-2').should('be.visible').focus();
      cy.realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('#geometry-1-0').should('have.focus');
      cy.realPress(dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#geometry-0-2').should('have.focus');
    });
  }
});
