import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
  mergeClasses,
  assertSlots,
} from '@fluentui/react-components';
import { FixedSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import * as axe from 'axe-core';
import { computeAccessibleName } from 'dom-accessibility-api';
import {
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeaderCell,
  DataGridRow,
  Table,
  TableRow,
  TableHeaderCell,
  createTableColumn,
} from '../../index';
import type { DataGridProps, TableRowId } from '../../index';
import type { SortState } from '../../hooks/types';
import { DataGridHeader } from './DataGridHeader';
import type { DataGridHeaderProps, DataGridHeaderSlots, DataGridHeaderState } from './DataGridHeader.types';
import { useDataGridHeader_unstable } from './useDataGridHeader';
import { useDataGridHeaderStyles_unstable } from './useDataGridHeaderStyles.styles';
import { renderDataGridHeader_unstable } from './renderDataGridHeader';
import { TableRowIdContextProvider } from '../../contexts/rowIdContext';
import { Default } from '../../../../stories/src/DataGrid/Default.stories';
import { Sort } from '../../../../stories/src/DataGrid/Sort.stories';
import { SortControlled } from '../../../../stories/src/DataGrid/SortControlled.stories';
import { MultipleSelect } from '../../../../stories/src/DataGrid/MultipleSelect.stories';
import { MultipleSelectControlled } from '../../../../stories/src/DataGrid/MultipleSelectControlled.stories';
import { SingleSelect } from '../../../../stories/src/DataGrid/SingleSelect.stories';
import { SingleSelectControlled } from '../../../../stories/src/DataGrid/SingleSelectControlled.stories';
import { CompositeNavigation } from '../../../../stories/src/DataGrid/CompositeNavigation.stories';
import { FocusableElementsInCells } from '../../../../stories/src/DataGrid/FocusableElementsInCells.stories';
import { SubtleSelection } from '../../../../stories/src/DataGrid/SubtleSelection.stories';
import { SelectionAppearance } from '../../../../stories/src/DataGrid/SelectionAppearance.stories';
import { CustomRowId } from '../../../../stories/src/DataGrid/CustomRowId.stories';
import { ResizableColumns } from '../../../../stories/src/DataGrid/ResizableColumns.stories';
import { ResizableColumnsDisableAutoFit } from '../../../../stories/src/DataGrid/ResizableColumnsDisableAutoFit.stories';

const requestedRound: unknown = Cypress.env('coverageRound');
const coverageRound = requestedRound === undefined ? 7 : Number(requestedRound);
if (!Number.isInteger(coverageRound) || coverageRound < 1 || coverageRound > 7) {
  throw new Error('coverageRound must be an integer from 1 through 7');
}
const describeRound = (round: number, title: string, tests: () => void) => {
  if (round <= coverageRound) {
    describe(title, tests);
  }
};

before(() => cy.writeFile('src/components/DataGridHeader/reports/row123-audits.jsonl', ''));

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr', strict = true) => {
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <main>{children}</main>
    </FluentProvider>,
    { strict },
  );
  cy.get('body').realHover({ position: 'topLeft' });
};
const header = () => cy.get('.fui-DataGridHeader');
const headerInput = () => header().find<HTMLInputElement>('input');
const bodyRows = () => cy.get('.fui-DataGridBody .fui-DataGridRow');
const fileHeader = () => header().find('[role="columnheader"]').filter(':contains("File")');
const order = (expected: string[]) =>
  bodyRows().should($rows => {
    expect(Array.from($rows, row => row.querySelector('.fui-DataGridCell')?.textContent)).to.deep.equal(expected);
  });
const selected = (indices: number[]) =>
  bodyRows().should($rows => {
    expect($rows).to.have.length(4);
    $rows.each((index, row) => {
      expect(row.getAttribute('aria-selected'), `row ${index}`).to.equal(String(indices.includes(index)));
      expect(row.querySelector<HTMLInputElement>('input')!.checked, `input ${index}`).to.equal(indices.includes(index));
    });
  });
const ascending = ['Meeting notes', 'Purchase order', 'Thursday presentation', 'Training recording'];
const descending = [...ascending].reverse();
const emptyBodyScenarios = [
  'R3.06 empty data emits an empty select-all set without inventing a header row ID',
  'R4.06 hidden attribute is forwarded but authored display wins; explicit display hiding removes/restores tab stops',
];
const assertIncomplete = (
  result: Pick<axe.AxeResults, 'incomplete'>,
  element: Element,
  scenario: string,
  scope: 'grid' | 'header',
) => {
  const expected = scope === 'grid' && emptyBodyScenarios.includes(scenario);
  expect(
    result.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })),
    `${scenario} ${scope}: exact incomplete rule/node set`,
  ).to.deep.equal(expected ? [{ id: 'aria-required-children', targets: [['.fui-DataGridBody']] }] : []);
  if (expected) {
    const bodies = element.querySelectorAll('.fui-DataGridBody');
    expect(bodies, `${scenario}: exactly one empty body`).to.have.length(1);
    expect(bodies[0].getAttribute('role')).to.equal('rowgroup');
    expect(bodies[0].childNodes).to.have.length(0);
    const node = result.incomplete[0].nodes[0];
    expect(node.any.map(({ id, data }) => ({ id, data }))).to.deep.equal([
      { id: 'aria-required-children', data: ['row'] },
    ]);
    expect(node.all).to.deep.equal([]);
    expect(node.none).to.deep.equal([]);
  }
};
const verifyIncompleteRejections = (result: axe.AxeResults, element: Element, scenario: string) => {
  const finding = result.incomplete[0];
  const node = finding.nodes[0];
  const reject = (incomplete: axe.Result[], test = scenario, scope: 'grid' | 'header' = 'grid', dom = element) =>
    expect(() => assertIncomplete({ incomplete }, dom, test, scope)).to.throw();
  reject([]);
  reject([...result.incomplete, { ...finding, id: 'color-contrast' }]);
  reject([{ ...finding, id: 'color-contrast' }]);
  reject([{ ...finding, nodes: [] }]);
  reject([{ ...finding, nodes: [node, node] }]);
  reject([{ ...finding, nodes: [{ ...node, target: ['#header'] }] }]);
  const wrongChildren = { ...node };
  wrongChildren.any = node.any.map(check => ({ ...check, data: ['gridcell'] }));
  reject([{ ...finding, nodes: [wrongChildren] }]);
  reject(result.incomplete, 'unlisted empty-grid scenario');
  reject(result.incomplete, scenario, 'header');
  const nonempty = element.cloneNode(true) as Element;
  nonempty.querySelector('.fui-DataGridBody')!.appendChild(element.ownerDocument.createElement('div'));
  reject(result.incomplete, scenario, 'grid', nonempty);
};
const assertAudit = (result: axe.AxeResults, element: Element, label: string) => {
  expect(result.passes.length, `${label} evaluated rules`).to.be.greaterThan(0);
  if (!result.violations.length) {
    expect(result.violations, label).to.deep.equal([]);
    return;
  }
  expect(
    result.violations.map(({ id }) => id),
    `${label}: exact external Tabster baseline`,
  ).to.deep.equal(['aria-hidden-focus']);
  const failing = result.violations[0].nodes.map(node => {
    expect(node.target).to.have.length(1);
    const target = element.querySelector(String(node.target[0]));
    expect(target?.matches('i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]')).to.equal(true);
    return target;
  });
  expect(failing, `${label}: no additional failing nodes`).to.have.members(
    Array.from(element.querySelectorAll('i[data-tabster-dummy][tabindex="0"]')),
  );
};
const audit = (label: string) =>
  cy
    .get('.fui-DataGrid')
    .then($grid =>
      axe
        .run($grid[0])
        .then(grid =>
          axe.run($grid[0].querySelector('.fui-DataGridHeader')!).then(root => ({ grid, root, element: $grid[0] })),
        ),
    )
    .then(result =>
      cy
        .writeFile(
          'src/components/DataGridHeader/reports/row123-audits.jsonl',
          `${JSON.stringify({
            label,
            scenario: Cypress.currentTest.title,
            passes: result.grid.passes.length,
            headerPasses: result.root.passes.length,
            headerViolations: result.root.violations.map(({ id }) => id),
            headerViolationDetails: result.root.violations,
            gridViolations: result.grid.violations.map(({ id, nodes }) => ({
              id,
              targets: nodes.map(node => node.target),
            })),
            incomplete: result.grid.incomplete.map(({ id }) => id),
            gridIncompleteDetails: result.grid.incomplete,
            headerIncompleteDetails: result.root.incomplete,
          })}\n`,
          { flag: 'a+' },
        )
        .then(() => {
          const scenario = Cypress.currentTest.title;
          assertIncomplete(result.root, result.element.querySelector('.fui-DataGridHeader')!, scenario, 'header');
          assertIncomplete(result.grid, result.element, scenario, 'grid');
          if (scenario === emptyBodyScenarios[0]) {
            verifyIncompleteRejections(result.grid, result.element, scenario);
          }
          assertAudit(result.root, result.element.querySelector('.fui-DataGridHeader')!, `${label} header`);
          assertAudit(result.grid, result.element, `${label} full grid`);
        }),
    );

type Item = { id: string; name: string; value: number };
const items: Item[] = [
  { id: 'a', name: 'Alpha', value: 2 },
  { id: 'b', name: 'Bravo', value: 1 },
  { id: 'c', name: 'Charlie', value: 3 },
];
const columns = [
  createTableColumn<Item>({
    columnId: 'name',
    compare: (a, b) => a.name.localeCompare(b.name),
    renderHeaderCell: () => 'Name',
    renderCell: item => item.name,
  }),
  createTableColumn<Item>({
    columnId: 'value',
    renderHeaderCell: () => 'Value',
    renderCell: item => item.value,
  }),
];
const Grid = ({
  headerProps,
  headerRef,
  ...props
}: Partial<DataGridProps> & { headerProps?: DataGridHeaderProps; headerRef?: React.Ref<HTMLDivElement> }) => (
  <>
    <button id="before">Before grid</button>
    <DataGrid items={items} columns={columns} getRowId={(item: Item) => item.id} aria-label="Inventory" {...props}>
      <DataGridHeader id="header" ref={headerRef} {...headerProps}>
        <DataGridRow
          selectionCell={props.selectionMode ? { checkboxIndicator: { 'aria-label': 'Select all rows' } } : null}
        >
          {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<Item>>
        {({ item, rowId }) => (
          <DataGridRow<Item>
            key={rowId}
            data-rowid={rowId}
            selectionCell={props.selectionMode ? { checkboxIndicator: { 'aria-label': `Select ${item.name}` } } : null}
          >
            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
    <button id="after">After grid</button>
  </>
);

describeRound(1, 'DataGridHeader round 1: root and inherited TableHeader contracts', () => {
  it('R1.01 renders the standalone unit snapshot as a div rowgroup with both static classes', () => {
    render(<DataGridHeader id="standalone">Default DataGridHeader</DataGridHeader>);
    header()
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'rowgroup')
      .and('have.class', 'fui-TableHeader')
      .and('have.text', 'Default DataGridHeader');
    header().should('not.have.attr', 'tabindex');
  });

  for (const as of [undefined, 'div', 'thead'] as const) {
    it(`R1.02 forces div semantics for public as=${String(as)}`, () => {
      render(<Grid headerProps={{ as }} />);
      header()
        .should('have.prop', 'tagName', 'DIV')
        .and('have.attr', 'role', 'rowgroup')
        .and('have.css', 'display', 'block');
      header().find('[role="row"]').should('have.length', 1);
      header().find('[role="columnheader"]').should('have.length', 2);
      header().find('[role="columnheader"]').first().realClick();
      audit(`forced div ${String(as)}`);
    });
  }

  it('R1.03 forwards attributes, class, style, object ref and real bubbled event targets', () => {
    const ref = React.createRef<HTMLDivElement>();
    const click = cy.spy().as('click');
    const key = cy.spy().as('key');
    render(
      <Grid
        headerRef={ref}
        headerProps={{
          title: 'Columns',
          className: 'consumer-header',
          'aria-label': 'Inventory columns',
          style: { display: 'flex' },
          onClick: (event: React.MouseEvent<HTMLDivElement>) => click(event.currentTarget.id, event.target),
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => key(event.currentTarget.id, event.key),
        }}
      />,
    );
    header()
      .should('have.class', 'consumer-header')
      .and('have.attr', 'title', 'Columns')
      .and('have.css', 'display', 'flex')
      .then($header => expect(ref.current).to.equal($header[0]));
    header().should($header => expect(computeAccessibleName($header[0])).to.equal('Inventory columns'));
    header()
      .find('.fui-DataGridHeaderCell__button')
      .first()
      .realClick()
      .then($cell => {
        cy.get('@click').should('have.been.calledOnceWithExactly', 'header', $cell[0]);
      });
    cy.realPress('Enter');
    cy.get('@key').should('have.been.calledOnceWithExactly', 'header', 'Enter');
  });

  it('R1.04 keeps the root node and latest handler on rerender, and clears callback ref on unmount', () => {
    const refSpy = cy.spy().as('ref');
    const ref = (node: HTMLElement | null) => {
      refSpy(node);
    };
    const first = cy.spy().as('first');
    const latest = cy.spy().as('latest');
    const Fixture = () => {
      const [state, setState] = React.useState(0);
      return (
        <>
          <button onClick={() => setState(value => value + 1)}>Update header</button>
          {state < 2 && (
            <Grid
              headerRef={ref}
              headerProps={{
                title: state ? 'Updated' : 'Original',
                onClick: state ? latest : first,
              }}
            />
          )}
        </>
      );
    };
    render(<Fixture />);
    header().then($header => {
      const node = $header[0];
      cy.get('@ref').should('have.been.calledWithExactly', node);
      cy.contains('button', 'Update header').realClick();
      header()
        .should('have.attr', 'title', 'Updated')
        .then($updated => expect($updated[0]).to.equal(node));
      header().find('[role="columnheader"]').first().realClick();
      cy.get('@first').should('not.have.been.called');
      cy.get('@latest').should('have.been.calledOnce');
      cy.contains('button', 'Update header').realClick();
      header().should('not.exist');
      cy.get('@ref').should('have.been.calledWithExactly', null);
    });
  });

  for (const noNativeElements of [false, true]) {
    it(`R1.05 inherits ${noNativeElements ? 'flex' : 'table'} layout without becoming a thead`, () => {
      render(
        <Table as="div" noNativeElements={noNativeElements} aria-label="Primitive host">
          <DataGridHeader>
            <TableRow as="div">
              <TableHeaderCell as="div">Name</TableHeaderCell>
            </TableRow>
          </DataGridHeader>
        </Table>,
      );
      header()
        .should('have.prop', 'tagName', 'DIV')
        .and('have.attr', 'role', 'rowgroup')
        .and('have.css', 'display', noNativeElements ? 'block' : 'table-row-group');
    });
  }
});

describeRound(1, 'DataGridHeader round 1: documented interactive compositions', () => {
  it('R1.06 default composition keeps the header unselected while sorting and select-all update the body', () => {
    render(<Default />);
    header().find('[role="columnheader"]').should('have.length', 4);
    header().find('[role="row"]').should('have.attr', 'aria-selected', 'false').and('not.have.attr', 'tabindex');
    fileHeader().realClick().should('have.attr', 'aria-sort', 'ascending');
    order(ascending);
    headerInput().realClick().should('be.checked');
    selected([0, 1, 2, 3]);
    header().find('[role="row"]').should('have.attr', 'aria-selected', 'false');
    audit('default sorted and selected');
  });
});

describeRound(2, 'DataGridHeader round 2: documented navigation and selection variants', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    it(`R2.01 ${dir} cell navigation crosses the header/body boundary and returns with Ctrl+Home`, () => {
      render(<Grid />, dir);
      cy.get('#before').realClick();
      cy.realPress('Tab');
      header().find('[role="columnheader"]').eq(0).should('have.focus');
      header().should('not.have.attr', 'tabindex');
      cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      header().find('[role="columnheader"]').eq(1).should('have.focus');
      cy.realPress('ArrowDown');
      bodyRows().eq(0).find('[role="gridcell"]').eq(1).should('have.focus');
      cy.realPress('ArrowUp');
      header().find('[role="columnheader"]').eq(1).should('have.focus');
      cy.realPress(['Control', 'End']);
      bodyRows().last().find('[role="gridcell"]').last().should('have.focus');
      cy.realPress(['Control', 'Home']);
      header().find('[role="columnheader"]').first().should('have.focus');
      cy.realPress('Tab');
      cy.get('#after').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      header().find('[role="columnheader"]').first().should('have.focus');
      audit(`${dir} keyboard navigation`);
    });
  }

  it('R2.02 composite story navigates header cells then body row groups without making the header tabbable', () => {
    render(
      <>
        <button id="before">Before</button>
        <CompositeNavigation />
      </>,
    );
    cy.get('#before').realClick();
    cy.realPress('Tab');
    headerInput().should('have.focus');
    cy.realPress('ArrowRight');
    fileHeader().should('have.focus');
    cy.realPress('ArrowDown');
    bodyRows().first().should('have.focus');
    cy.realPress('ArrowRight');
    bodyRows().first().find('input').should('have.focus');
    cy.realPress('Escape');
    bodyRows().first().should('have.focus');
    cy.realPress(['Control', 'Home']);
    headerInput().should('have.focus');
    header().find('[role="row"]').should('not.have.attr', 'tabindex');
    audit('composite navigation');
  });

  it('R2.03 grouped header actions enter, trap Tab, open a menu and Escape back to their column', () => {
    render(<FocusableElementsInCells />);
    const author = () => header().find('[role="columnheader"]').filter(':contains("Author")');
    author().realClick().focus();
    cy.realPress('Enter');
    author().find('button[aria-label="Edit"]').should('have.focus');
    cy.realPress('Tab');
    author().find('button[aria-label="More options"]').should('have.focus');
    cy.realPress('Tab');
    author().find('button[aria-label="Edit"]').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    author().find('button[aria-label="More options"]').should('have.focus');
    cy.realPress('Enter');
    cy.get('[role="menu"]').should('be.visible').find('[role="menuitem"]').should('have.length', 2);
    cy.realPress('Escape');
    author().find('button[aria-label="More options"]').should('have.focus');
    cy.realPress('Escape');
    author().should('have.focus').and('not.have.attr', 'aria-sort');
    audit('grouped header actions');
  });

  it('R2.04 subtle header selection reveals on hover/focus and remains visible when all selected', () => {
    render(
      <>
        <button id="outside">Outside grid</button>
        <SubtleSelection />
      </>,
    );
    const indicator = () => header().find('.fui-DataGridSelectionCell');
    indicator().should('have.css', 'opacity', '1');
    headerInput().realClick();
    selected([0, 1, 2, 3]);
    headerInput().realClick();
    selected([]);
    cy.get('#outside').realClick();
    indicator().should('have.css', 'opacity', '0');
    fileHeader().realHover();
    indicator().should('have.css', 'opacity', '1');
    cy.get('#outside').realClick();
    cy.realPress('Tab');
    headerInput().should('have.focus');
    indicator().should('have.css', 'opacity', '1');
    cy.realPress('Space');
    selected([0, 1, 2, 3]);
    bodyRows().first().find('[role="gridcell"]').eq(1).focus();
    indicator().should('have.css', 'opacity', '1');
    audit('subtle selected header');
  });

  it('R2.05 neutral selection changes body appearance but not the header row appearance', () => {
    render(<SelectionAppearance />);
    header()
      .find('[role="row"]')
      .then($headerRow => {
        const before = $headerRow.css('background-color');
        headerInput().realClick();
        selected([0, 1, 2, 3]);
        header().find('[role="row"]').should('have.css', 'background-color', before);
        bodyRows()
          .first()
          .should($row => expect($row.css('background-color')).not.to.equal(before));
      });
    audit('neutral selection');
  });

  it('R2.06 custom row IDs synchronize external indicators with header select-all, never adding a header ID', () => {
    render(<CustomRowId />);
    cy.get('ul input').should('have.length', 4).eq(1).should('be.checked');
    headerInput().realClick();
    selected([0, 1, 2, 3]);
    cy.get('ul input').each($input => {
      expect($input).to.have.prop('checked', true);
    });
    headerInput().focus();
    cy.realPress('Space');
    selected([]);
    cy.get('ul input').each($input => {
      expect($input).to.have.prop('checked', false);
    });
    bodyRows().eq(0).realClick();
    cy.get('ul input').eq(0).should('be.checked');
    cy.get('ul input').eq(1).should('not.be.checked');
    headerInput().should('have.prop', 'indeterminate', true);
    audit('identity-based selection');
  });

  it('R2.07 columns without compare stay non-sortable through pointer and keyboard', () => {
    render(<Sort />);
    const unsortable = () => header().find('[role="columnheader"]').filter(':contains("Not sortable")');
    unsortable().should('not.have.attr', 'aria-sort');
    unsortable().should('have.attr', 'tabindex', '0');
    unsortable().find('[role="button"]').should('not.exist');
    unsortable().realClick();
    cy.realPress('Enter');
    cy.realPress('Space');
    fileHeader().should('have.attr', 'aria-sort', 'ascending');
    order(ascending);
  });
});

const alignedColumn = (index: number, width: number) => {
  header()
    .find('[role="columnheader"]')
    .eq(index)
    .should($cell => expect($cell[0].getBoundingClientRect().width).to.be.closeTo(width, 0.5));
  bodyRows().each($row => {
    const cell = $row[0].querySelectorAll('.fui-DataGridCell')[index];
    expect(cell.getBoundingClientRect().width, `body column ${index}`).to.be.closeTo(width, 0.5);
  });
};

describeRound(2, 'DataGridHeader round 2: documented column resizing', () => {
  for (const [name, Story, handles] of [
    ['auto-fit', ResizableColumns, 3],
    ['overflow', ResizableColumnsDisableAutoFit, 4],
  ] as const) {
    for (const exit of ['Escape', 'Enter', 'Space'] as const) {
      it(`R2.08 ${name} keyboard resizing changes exact widths and ${exit} restores sorting focus`, () => {
        render(<Story />);
        header().find('[role="separator"]').should('have.length', handles);
        fileHeader().then($cell => {
          const width = $cell[0].getBoundingClientRect().width;
          const contentWidth = Number.parseFloat($cell[0].style.width);
          fileHeader().realClick({ button: 'right' });
          cy.contains('[role="menuitem"]', 'Keyboard Column Resizing').should('be.visible').realClick();
          const handle = () => fileHeader().find('[role="separator"]');
          handle().should('have.focus').and('have.attr', 'aria-hidden', 'false');
          cy.realPress('ArrowRight');
          alignedColumn(0, width + 20);
          handle().should('have.attr', 'aria-valuetext', `${contentWidth + 20} pixels`);
          cy.realPress(['Shift', 'ArrowLeft']);
          alignedColumn(0, width + 15);
          cy.realPress(exit);
          fileHeader().find('[role="button"]').should('have.focus');
          handle().should('have.attr', 'aria-hidden', 'true').and('not.have.attr', 'tabindex');
          fileHeader().should('have.attr', 'aria-sort', exit === 'Space' ? 'ascending' : 'none');
          cy.realPress('Enter');
          fileHeader().should('have.attr', 'aria-sort', exit === 'Space' ? 'descending' : 'ascending');
          order(exit === 'Space' ? descending : ascending);
          audit(`${name} resize exit ${exit}`);
        });
      });
    }

    it(`R2.09 ${name} pointer dragging resizes without sorting, with header/body alignment`, () => {
      render(<Story />);
      fileHeader().then($cell => {
        const width = $cell[0].getBoundingClientRect().width;
        const handle = () => fileHeader().find('[role="separator"]');
        handle().realMouseDown();
        handle().realMouseMove(40, 0);
        header()
          .find('[role="columnheader"]')
          .first()
          .should($resized => expect($resized[0].getBoundingClientRect().width).to.be.greaterThan(width + 20))
          .then($resized => {
            alignedColumn(0, $resized[0].getBoundingClientRect().width);
          });
        cy.get('body').realMouseUp();
        fileHeader().should('have.attr', 'aria-sort', 'none');
        fileHeader().realClick().should('have.attr', 'aria-sort', 'ascending');
        order(ascending);
      });
    });
  }

  it('R2.10 disabled auto-fit preserves widths while container shrinks and allows last-column keyboard growth', () => {
    render(<ResizableColumnsDisableAutoFit />);
    cy.get('.fui-DataGrid').parent().invoke('css', 'width', '350px');
    fileHeader().should('have.css', 'width', '180px');
    const last = () => header().find('[role="columnheader"]').last();
    last()
      .scrollIntoView()
      .then($cell => {
        const width = $cell[0].getBoundingClientRect().width;
        last().realClick({ button: 'right' });
        cy.contains('[role="menuitem"]', 'Keyboard Column Resizing').realClick();
        last().find('[role="separator"]').should('have.focus');
        cy.realPress('ArrowRight');
        alignedColumn(3, width + 20);
        cy.realPress('Escape');
        last().find('[role="button"]').should('have.focus');
        cy.get('.fui-DataGrid')
          .parent()
          .should($container => expect($container[0].scrollWidth).to.be.greaterThan($container[0].clientWidth));
      });
  });
});

describeRound(1, 'DataGridHeader round 1: controlled and uncontrolled contracts', () => {
  for (const [name, Story] of [
    ['uncontrolled', Sort],
    ['controlled', SortControlled],
  ] as const) {
    it(`R1.07 ${name} sorting toggles through pointer, Enter and Space with body order and aria-sort`, () => {
      render(<Story />);
      fileHeader().should('have.attr', 'aria-sort', 'ascending');
      order(ascending);
      fileHeader().realClick().should('have.attr', 'aria-sort', 'descending');
      order(descending);
      fileHeader().find('[role="button"]').focus();
      cy.realPress('Enter');
      fileHeader().should('have.attr', 'aria-sort', 'ascending');
      order(ascending);
      cy.realPress('Space');
      fileHeader().should('have.attr', 'aria-sort', 'descending');
      order(descending);
      audit(`${name} sorting`);
    });
  }
});

const nameHeader = () => header().find('[role="columnheader"]').filter(':contains("Name")');
const gridSelection = (ids: string[]) =>
  bodyRows().should($rows => {
    expect($rows).to.have.length(3);
    $rows.each((_index, row) => {
      expect(row.getAttribute('aria-selected')).to.equal(String(ids.includes(row.getAttribute('data-rowid')!)));
      expect(row.querySelector<HTMLInputElement>('input')!.checked).to.equal(
        ids.includes(row.getAttribute('data-rowid')!),
      );
    });
  });

describeRound(3, 'DataGridHeader round 3: observable callback and controlled state contracts', () => {
  for (const controlled of [false, true]) {
    it(`R3.01 ${
      controlled ? 'controlled' : 'uncontrolled'
    } select-all emits exact IDs once per pointer/Space activation`, () => {
      const change = cy.spy().as('selection');
      const Fixture = () => {
        const [value, setValue] = React.useState(new Set<TableRowId>(['b']));
        return (
          <Grid
            selectionMode="multiselect"
            defaultSelectedItems={new Set(['b'])}
            selectedItems={controlled ? value : undefined}
            onSelectionChange={(event, data) => {
              change(event.type, [...data.selectedItems].sort());
              setValue(data.selectedItems);
            }}
          />
        );
      };
      render(<Fixture />);
      gridSelection(['b']);
      headerInput().realClick();
      cy.get('@selection').should('have.been.calledOnceWithExactly', 'click', ['a', 'b', 'c']);
      gridSelection(['a', 'b', 'c']);
      headerInput().focus();
      cy.realPress('Space');
      cy.get('@selection').should('have.callCount', 2).its('lastCall.args').should('deep.equal', ['click', []]);
      gridSelection([]);
      headerInput().should('not.be.checked').and('have.prop', 'indeterminate', false);
      bodyRows().eq(0).realClick();
      cy.get('@selection')
        .should('have.callCount', 3)
        .its('lastCall.args')
        .should('deep.equal', ['click', ['a']]);
      gridSelection(['a']);
      headerInput().should('have.prop', 'indeterminate', true);
      audit(`${controlled ? 'controlled' : 'uncontrolled'} selection callbacks`);
    });
  }

  it('R3.02 rejected controlled selection emits requests without optimistic DOM changes; owner updates are honored', () => {
    const change = cy.spy().as('selection');
    const Fixture = () => {
      const [value, setValue] = React.useState(new Set<TableRowId>(['b']));
      return (
        <>
          <button id="accept" onClick={() => setValue(new Set(['a', 'b', 'c']))}>
            Accept selection
          </button>
          <Grid
            selectionMode="multiselect"
            selectedItems={value}
            onSelectionChange={(_event, data) => change([...data.selectedItems].sort())}
          />
        </>
      );
    };
    render(<Fixture />);
    headerInput().realClick();
    cy.get('@selection').should('have.been.calledOnceWithExactly', ['a', 'b', 'c']);
    gridSelection(['b']);
    headerInput().should('have.prop', 'indeterminate', true);
    cy.get('#accept').realClick();
    gridSelection(['a', 'b', 'c']);
    headerInput().should('be.checked').and('have.prop', 'indeterminate', false);
    headerInput().focus();
    cy.realPress('Space');
    cy.get('@selection').should('have.callCount', 2).its('lastCall.args').should('deep.equal', [[]]);
    gridSelection(['a', 'b', 'c']);
    headerInput().should('be.checked');
  });

  for (const controlled of [false, true]) {
    it(`R3.03 ${
      controlled ? 'controlled' : 'uncontrolled'
    } sorting emits exact state once and never selects the header`, () => {
      const change = cy.spy().as('sort');
      const selection = cy.spy().as('selection');
      const Fixture = () => {
        const [value, setValue] = React.useState<SortState>({ sortColumn: 'name', sortDirection: 'ascending' });
        return (
          <Grid
            sortable
            selectionMode="multiselect"
            defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
            sortState={controlled ? value : undefined}
            onSortChange={(event, data) => {
              change(event.type, data);
              setValue(data);
            }}
            onSelectionChange={selection}
          />
        );
      };
      render(<Fixture />, 'ltr', false);
      nameHeader().realClick();
      cy.get('@sort').should('have.been.calledOnceWithExactly', 'click', {
        sortColumn: 'name',
        sortDirection: 'descending',
      });
      nameHeader().should('have.attr', 'aria-sort', 'descending');
      order(['Charlie', 'Bravo', 'Alpha']);
      nameHeader().find('[role="button"]').focus();
      cy.realPress('Enter');
      cy.get('@sort')
        .should('have.callCount', 2)
        .its('lastCall.args')
        .should('deep.equal', ['click', { sortColumn: 'name', sortDirection: 'ascending' }]);
      order(['Alpha', 'Bravo', 'Charlie']);
      cy.realPress('Space');
      cy.get('@sort')
        .should('have.callCount', 3)
        .its('lastCall.args')
        .should('deep.equal', ['click', { sortColumn: 'name', sortDirection: 'descending' }]);
      cy.get('@selection').should('not.have.been.called');
      gridSelection([]);
      header().find('[role="row"]').should('have.attr', 'aria-selected', 'false');
    });
  }

  it('R3.04 rejected controlled sorting keeps order and aria-sort until an external owner update', () => {
    const sort = cy.spy().as('sort');
    const Fixture = () => {
      const [direction, setDirection] = React.useState<'ascending' | 'descending'>('ascending');
      return (
        <>
          <button id="owner" onClick={() => setDirection('descending')}>
            Owner sort
          </button>
          <Grid
            sortable
            sortState={{ sortColumn: 'name', sortDirection: direction }}
            onSortChange={(_event, data) => sort(data)}
          />
        </>
      );
    };
    render(<Fixture />);
    nameHeader().realClick();
    cy.get('@sort').should('have.been.calledOnceWithExactly', { sortColumn: 'name', sortDirection: 'descending' });
    nameHeader().should('have.attr', 'aria-sort', 'ascending');
    order(['Alpha', 'Bravo', 'Charlie']);
    cy.get('#owner').realClick();
    nameHeader().should('have.attr', 'aria-sort', 'descending');
    order(['Charlie', 'Bravo', 'Alpha']);
  });

  it('R3.05 non-sortable grids have no sort buttons, sort ARIA or sort callbacks despite comparator columns', () => {
    const sort = cy.spy().as('sort');
    render(<Grid sortable={false} onSortChange={sort} />);
    headerInput().should('not.exist');
    header().find('[role="button"]').should('not.exist');
    nameHeader().realClick();
    cy.realPress('Enter');
    cy.realPress('Space');
    cy.get('@sort').should('not.have.been.called');
    nameHeader().should('not.have.attr', 'aria-sort');
    order(['Alpha', 'Bravo', 'Charlie']);
  });
});

describeRound(3, 'DataGridHeader round 3: dynamic data, context and public composition', () => {
  it('R3.06 empty data emits an empty select-all set without inventing a header row ID', () => {
    const change = cy.spy().as('selection');
    render(
      <Grid
        items={[]}
        selectionMode="multiselect"
        onSelectionChange={(_event, data) => change([...data.selectedItems])}
      />,
    );
    bodyRows().should('not.exist');
    headerInput().should('not.be.checked').and('have.prop', 'indeterminate', false).realClick();
    cy.get('@selection').should('have.been.calledOnceWithExactly', []);
    headerInput().should('not.be.checked').and('have.prop', 'indeterminate', false);
    header().find('[role="row"]').should('have.attr', 'aria-selected', 'false');
    audit('empty grid');
  });

  it('R3.07 item removal/restoration recomputes mixed/all without remounting the root or changing existing IDs', () => {
    const Fixture = () => {
      const [reduced, setReduced] = React.useState(false);
      return (
        <>
          <button id="toggle-items" onClick={() => setReduced(value => !value)}>
            Toggle items
          </button>
          <Grid
            items={reduced ? items.slice(0, 2) : items}
            selectionMode="multiselect"
            defaultSelectedItems={new Set(['a', 'b'])}
          />
        </>
      );
    };
    render(<Fixture />);
    header().then($root => {
      const node = $root[0];
      headerInput().should('have.prop', 'indeterminate', true);
      cy.get('#toggle-items').realClick();
      bodyRows().should('have.length', 2);
      headerInput().should('be.checked').and('have.prop', 'indeterminate', false);
      cy.get('#toggle-items').realClick();
      gridSelection(['a', 'b']);
      headerInput().should('have.prop', 'indeterminate', true);
      header().then($current => expect($current[0]).to.equal(node));
    });
  });

  it('R3.08 column insertion/reordering updates header names, body cells and column-specific sorting', () => {
    const valueColumn = createTableColumn<Item>({
      columnId: 'value',
      compare: (a, b) => a.value - b.value,
      renderHeaderCell: () => 'Amount',
      renderCell: item => item.value,
    });
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="columns" onClick={() => setUpdated(true)}>
            Update columns
          </button>
          <Grid sortable columns={updated ? [valueColumn, columns[0]] : [columns[0]]} />
        </>
      );
    };
    render(<Fixture />);
    header().find('[role="columnheader"]').should('have.length', 1);
    cy.get('#columns').realClick();
    header()
      .find('[role="columnheader"]')
      .should($cells => expect(Array.from($cells, cell => cell.textContent)).to.deep.equal(['Amount', 'Name']));
    header().find('[role="columnheader"]').first().realClick().should('have.attr', 'aria-sort', 'ascending');
    bodyRows().should($rows =>
      expect(Array.from($rows, row => row.getAttribute('data-rowid'))).to.deep.equal(['b', 'a', 'c']),
    );
    nameHeader().should('have.attr', 'aria-sort', 'none');
    audit('dynamic columns');
  });

  it('R3.09 table layout context changes styling while the header stays a div rowgroup and retains its node', () => {
    const Fixture = () => {
      const [flex, setFlex] = React.useState(false);
      return (
        <>
          <button id="layout" onClick={() => setFlex(value => !value)}>
            Toggle layout
          </button>
          <Table as="div" noNativeElements={flex} aria-label="Layout host">
            <DataGridHeader id="layout-header">
              <TableRow as="div">
                <TableHeaderCell as="div">Name</TableHeaderCell>
              </TableRow>
            </DataGridHeader>
          </Table>
        </>
      );
    };
    render(<Fixture />);
    header()
      .should('have.css', 'display', 'table-row-group')
      .then($root => {
        const node = $root[0];
        cy.get('#layout').realClick();
        header()
          .should('have.css', 'display', 'block')
          .and('have.attr', 'role', 'rowgroup')
          .and('have.prop', 'tagName', 'DIV')
          .then($current => expect($current[0]).to.equal(node));
        cy.get('#layout').realClick();
        header().should('have.css', 'display', 'table-row-group');
      });
  });

  for (const size of ['medium', 'small', 'extra-small'] as const) {
    it(`R3.10 ${size} inherits size context but retains 32px header buttons and full-width alignment`, () => {
      render(<Grid size={size} />);
      header().find('.fui-DataGridHeaderCell__button').should('have.css', 'min-height', '32px');
      header().should('have.css', 'display', 'block').and('have.class', 'fui-TableHeader');
      header()
        .find('[role="row"]')
        .then($headerRow => {
          bodyRows()
            .first()
            .should($row => {
              expect($headerRow[0].getBoundingClientRect().width).to.equal($row[0].getBoundingClientRect().width);
              const headerCells = $headerRow[0].querySelectorAll('[role="columnheader"]');
              const cells = $row[0].querySelectorAll('[role="gridcell"]');
              headerCells.forEach((cell, index) =>
                expect(cell.getBoundingClientRect().left).to.be.closeTo(cells[index].getBoundingClientRect().left, 0.5),
              );
            });
        });
      audit(`${size} sizing`);
    });
  }

  for (const focusMode of ['none', 'row_unstable'] as const) {
    it(`R3.11 ${focusMode} leaves the header root/row untabbable while preserving descendant navigation`, () => {
      render(<Grid focusMode={focusMode} />);
      cy.get('.fui-DataGrid').should('not.have.attr', 'data-tabster');
      header().should('not.have.attr', 'tabindex');
      header().find('[role="row"]').should('not.have.attr', 'tabindex');
      cy.get('#before').realClick();
      cy.realPress('Tab');
      nameHeader().should('have.focus');
      cy.realPress('Tab');
      header().find('[role="columnheader"]').last().should('have.focus');
      cy.realPress('Tab');
      if (focusMode === 'row_unstable') {
        bodyRows().first().should('have.focus').and('have.attr', 'tabindex', '0');
      } else {
        cy.get('#after').should('have.focus');
        bodyRows().should('not.have.attr', 'tabindex');
      }
      audit(`${focusMode} focus`);
    });
  }

  it('R3.12 multiple header rows provide header context to each descendant and do not leak into the body', () => {
    const change = cy.spy().as('selection');
    render(
      <DataGrid
        items={items}
        columns={columns}
        getRowId={(item: Item) => item.id}
        aria-label="Multiple header groups"
        selectionMode="multiselect"
        onSelectionChange={(_event, data) => change([...data.selectedItems].sort())}
      >
        <DataGridHeader>
          {[0, 1].map(index => (
            <DataGridRow
              key={index}
              selectionCell={{ checkboxIndicator: { 'aria-label': `Select all group ${index}` } }}
            >
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          ))}
        </DataGridHeader>
        <DataGridBody<Item>>
          {({ item, rowId }) => (
            <DataGridRow<Item>
              key={rowId}
              selectionCell={{ checkboxIndicator: { 'aria-label': `Select ${item.name}` } }}
            >
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>,
    );
    header().find('[role="row"]').should('have.length', 2);
    headerInput().eq(1).realClick();
    cy.get('@selection').should('have.been.calledOnceWithExactly', ['a', 'b', 'c']);
    headerInput().each($input => {
      expect($input).to.have.prop('checked', true);
    });
    bodyRows().eq(1).realClick();
    cy.get('@selection')
      .should('have.callCount', 2)
      .its('lastCall.args')
      .should('deep.equal', [['a', 'c']]);
    headerInput().each($input => {
      expect($input).to.have.prop('indeterminate', true);
    });
    header().find('[role="columnheader"]').first().realClick();
    cy.get('@selection').should('have.callCount', 2);
    audit('multiple header rows');
  });

  it('R3.13 separate grids isolate header select-all and sorting state', () => {
    render(
      <>
        <section id="one">
          <Grid sortable selectionMode="multiselect" />
        </section>
        <section id="two">
          <Grid sortable selectionMode="multiselect" headerProps={{ id: 'second-header' }} />
        </section>
      </>,
    );
    cy.get('#one .fui-DataGridHeader input').realClick();
    cy.get('#one .fui-DataGridBody input').each($input => {
      expect($input).to.have.prop('checked', true);
    });
    cy.get('#two .fui-DataGridHeader input').should('not.be.checked');
    cy.get('#two .fui-DataGridBody input').each($input => {
      expect($input).to.have.prop('checked', false);
    });
    cy.contains('#one [role="columnheader"]', 'Name')
      .realClick()
      .realClick()
      .should('have.attr', 'aria-sort', 'descending');
    cy.contains('#two [role="columnheader"]', 'Name').should('have.attr', 'aria-sort', 'none');
    cy.get('#two .fui-DataGridBody [data-rowid]').first().should('have.attr', 'data-rowid', 'a');
  });

  it('R3.14 public headless hooks reproduce rendering, styles, ref forwarding and header context', () => {
    const ref = React.createRef<HTMLElement>();
    const Headless = () => {
      const state = useDataGridHeader_unstable(
        {
          id: 'headless',
          children: (
            <DataGridRow selectionCell={{ checkboxIndicator: { 'aria-label': 'Select all rows' } }}>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          ),
        },
        ref,
      );
      useDataGridHeaderStyles_unstable(state);
      return renderDataGridHeader_unstable(state);
    };
    render(
      <DataGrid items={items} columns={columns} aria-label="Headless header" selectionMode="multiselect">
        <Headless />
      </DataGrid>,
    );
    header()
      .should('have.attr', 'role', 'rowgroup')
      .and('have.css', 'display', 'block')
      .then($root => expect(ref.current).to.equal($root[0]));
    headerInput().realClick().should('be.checked');
    header().find('[role="row"]').should('have.attr', 'aria-selected', 'false');
    audit('public headless header');
  });

  it('R3.15 custom style hook runs after default styles and retains consumer root properties', () => {
    const useConsumerStyles = makeStyles({ root: { display: 'flex' } });
    const useOverride = (state: unknown) => {
      const styles = useConsumerStyles();
      assertSlots<DataGridHeaderSlots>(state);
      if (!state.root) {
        throw new Error('DataGridHeader custom style hook requires a root slot');
      }
      state.root.className = mergeClasses(state.root.className, styles.root);
    };
    const hookName = 'useDataGridHeaderStyles_unstable';
    render(
      <FluentProvider customStyleHooks_unstable={{ [hookName]: useOverride }}>
        <Grid headerProps={{ title: 'Customized', className: 'custom-root' }} />
      </FluentProvider>,
    );
    header()
      .should('have.css', 'display', 'flex')
      .and('have.class', 'fui-DataGridHeader')
      .and('have.class', 'fui-TableHeader')
      .and('have.class', 'custom-root')
      .and('have.attr', 'title', 'Customized');
    nameHeader().realClick().should('have.focus');
  });
});

const virtualItems: Item[] = Array.from({ length: 100 }, (_unused, index) => ({
  id: `row-${index}`,
  name: `Item ${index}`,
  value: index,
}));
const WindowRow = ({ index, style }: ListChildComponentProps) => (
  <TableRowIdContextProvider value={virtualItems[index].id}>
    <DataGridRow<Item>
      style={style}
      data-window-row={index}
      aria-rowindex={index + 2}
      selectionCell={{ checkboxIndicator: { 'aria-label': `Select item ${index}` } }}
    >
      {({ renderCell }) => <DataGridCell>{renderCell(virtualItems[index])}</DataGridCell>}
    </DataGridRow>
  </TableRowIdContextProvider>
);

describeRound(3, 'DataGridHeader round 3: local virtualization analogue', () => {
  it('R3.16 persistent header selects all logical IDs including unmounted rows and reflects selection after scroll', () => {
    const change = cy.spy().as('selection');
    render(
      <DataGrid
        items={virtualItems}
        columns={columns}
        getRowId={(item: Item) => item.id}
        aria-label="Virtualized inventory"
        aria-rowcount={101}
        selectionMode="multiselect"
        focusMode="row_unstable"
        onSelectionChange={(_event, data) => change([...data.selectedItems].sort())}
      >
        <DataGridHeader id="virtual-header">
          <DataGridRow selectionCell={{ checkboxIndicator: { 'aria-label': 'Select all virtual rows' } }}>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <div role="rowgroup" id="virtual-body">
          <FixedSizeList height={160} width="100%" itemCount={virtualItems.length} itemSize={40}>
            {WindowRow}
          </FixedSizeList>
        </div>
      </DataGrid>,
    );
    cy.get('[data-window-row="0"]').should('exist');
    cy.get('[data-window-row="99"]').should('not.exist');
    header().then($root => {
      const node = $root[0];
      headerInput().realClick();
      cy.get('@selection').should('have.been.calledOnceWithExactly', virtualItems.map(item => item.id).sort());
      cy.get('#virtual-body > div').scrollTo('bottom');
      cy.get('[data-window-row="0"]').should('not.exist');
      cy.get('[data-window-row="99"] input').should('be.checked');
      cy.get('[data-window-row="99"]')
        .should('be.visible')
        .and('have.attr', 'aria-selected', 'true')
        .focus()
        .should('have.focus');
      cy.realPress('Space');
      cy.get('[data-window-row="99"]').should('have.attr', 'aria-selected', 'false');
      cy.get('@selection')
        .should('have.callCount', 2)
        .its('lastCall.args')
        .should('deep.equal', [
          virtualItems
            .slice(0, 99)
            .map(item => item.id)
            .sort(),
        ]);
      headerInput().should('have.prop', 'indeterminate', true);
      cy.get('#virtual-body > div').scrollTo('top');
      cy.get('[data-window-row="0"] input').should('be.checked');
      headerInput().realClick().should('be.checked');
      cy.get('@selection').should('have.callCount', 3);
      cy.get('#virtual-body > div').scrollTo('bottom');
      cy.get('[data-window-row="99"] input').should('be.checked');
      header().then($current => expect($current[0]).to.equal(node));
      audit('local virtualized header');
    });
  });
});

describeRound(1, 'DataGridHeader round 1: selection context regressions', () => {
  for (const [name, Story] of [
    ['uncontrolled', MultipleSelect],
    ['controlled', MultipleSelectControlled],
  ] as const) {
    it(`R1.08 ${name} select-all transitions mixed/all/none and body selection feeds back to header`, () => {
      render(<Story />);
      selected([1]);
      headerInput().should('have.prop', 'indeterminate', true).and('not.be.checked');
      headerInput().realClick();
      selected([0, 1, 2, 3]);
      headerInput().should('be.checked').and('have.prop', 'indeterminate', false);
      header().find('[role="gridcell"]').should('have.attr', 'aria-selected', 'true');
      headerInput().focus();
      cy.realPress('Space');
      selected([]);
      header().find('[role="gridcell"]').should('have.attr', 'aria-selected', 'false');
      bodyRows().eq(2).realClick();
      selected([2]);
      headerInput().should('have.prop', 'indeterminate', true);
      header().find('[role="gridcell"]').should('not.have.attr', 'aria-selected');
      audit(`${name} mixed selection`);
    });
  }
});

describeRound(3, 'DataGridHeader round 3: inherited StrictMode sorting baseline', () => {
  it('R3.17 StrictMode repeats uncontrolled sort callbacks while changing DOM sort state only once', () => {
    const sort = cy.spy().as('sort');
    render(
      <Grid
        sortable
        defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
        onSortChange={(_event, data) => sort(data)}
      />,
    );
    nameHeader().realClick();
    cy.get('@sort').should('have.callCount', 2);
    cy.get('@sort')
      .its('firstCall.args')
      .should('deep.equal', [{ sortColumn: 'name', sortDirection: 'descending' }]);
    cy.get('@sort')
      .its('lastCall.args')
      .should('deep.equal', [{ sortColumn: 'name', sortDirection: 'descending' }]);
    nameHeader().should('have.attr', 'aria-sort', 'descending');
    order(['Charlie', 'Bravo', 'Alpha']);
  });
});

describeRound(1, 'DataGridHeader round 1: single selection and header events', () => {
  for (const [name, Story] of [
    ['uncontrolled', SingleSelect],
    ['controlled', SingleSelectControlled],
  ] as const) {
    it(`R1.09 ${name} single selection leaves an invisible input-free header placeholder`, () => {
      render(<Story />);
      selected([1]);
      headerInput().should('not.exist');
      header().find('.fui-DataGridSelectionCell').should('have.length', 1).and('have.css', 'opacity', '0');
      header().find('[role="columnheader"]').first().realClick();
      cy.realPress('Space');
      selected([1]);
      bodyRows().eq(2).realClick();
      selected([2]);
      headerInput().should('not.exist');
      audit(`${name} single selection`);
    });
  }

  it('R1.10 real header clicks and Space bubble but do not select rows or call selection callback', () => {
    const change = cy.spy().as('selection');
    const click = cy.spy().as('rootClick');
    const key = cy.spy().as('rootKey');
    render(
      <Grid
        selectionMode="multiselect"
        onSelectionChange={change}
        headerProps={{ onClick: click, onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => key(event.key) }}
      />,
    );
    header().find('[role="columnheader"]').first().realClick();
    cy.realPress('Space');
    cy.get('@rootClick').should('have.been.calledOnce');
    cy.get('@rootKey').should('have.been.calledOnceWithExactly', ' ');
    cy.get('@selection').should('not.have.been.called');
    bodyRows().should($rows => {
      $rows.each((_index, row) => {
        expect(row.getAttribute('aria-selected')).to.equal('false');
      });
    });
    headerInput().should('not.be.checked').and('have.prop', 'indeterminate', false);
  });
});

const ResizeGrid = ({
  onColumnResize,
  columnSizingOptions = { name: { defaultWidth: 120, minWidth: 80 }, value: { defaultWidth: 100, minWidth: 80 } },
}: Pick<DataGridProps, 'onColumnResize' | 'columnSizingOptions'>) => (
  <DataGrid
    items={items}
    columns={columns}
    getRowId={(item: Item) => item.id}
    aria-label="Resize inventory"
    sortable
    resizableColumns
    resizableColumnsOptions={{ autoFitColumns: false }}
    columnSizingOptions={columnSizingOptions}
    onColumnResize={onColumnResize}
  >
    <DataGridHeader>
      <DataGridRow>
        {({ renderHeaderCell, columnId }, context) => (
          <DataGridHeaderCell onContextMenu={context.columnSizing_unstable.enableKeyboardMode(columnId)}>
            {renderHeaderCell()}
          </DataGridHeaderCell>
        )}
      </DataGridRow>
    </DataGridHeader>
    <DataGridBody<Item>>
      {({ item, rowId }) => (
        <DataGridRow<Item> key={rowId}>
          {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
        </DataGridRow>
      )}
    </DataGridBody>
  </DataGrid>
);

describeRound(5, 'DataGridHeader round 5: remaining documented layout and sizing contracts', () => {
  it('R5.01 documented min-width preserves header/body alignment in a narrow scrolling container', () => {
    render(
      <div id="narrow" style={{ width: 350, overflowX: 'auto' }}>
        <Default />
      </div>,
    );
    cy.get('.fui-DataGrid').should('have.css', 'min-width', '550px');
    cy.get('#narrow').should($container => {
      expect($container[0].clientWidth).to.equal(350);
      expect($container[0].scrollWidth).to.be.greaterThan(350);
    });
    header().then($root => {
      const width = $root[0].getBoundingClientRect().width;
      expect(width).to.be.at.least(550);
      bodyRows().each($row => expect($row[0].getBoundingClientRect().width).to.be.closeTo(width, 0.5));
    });
    fileHeader().realClick().should('have.attr', 'aria-sort', 'ascending');
    order(ascending);
    headerInput().realClick();
    selected([0, 1, 2, 3]);
    audit('documented min-width in narrow container');
  });

  it('R5.02 documented onColumnResize and idealWidth owner updates synchronize header/body without remounting', () => {
    const resize = cy.spy().as('resize-owner');
    const Fixture = () => {
      const [width, setWidth] = React.useState(120);
      return (
        <>
          <button id="external-width" onClick={() => setWidth(220)}>
            External width
          </button>
          <ResizeGrid
            columnSizingOptions={{
              name: { minWidth: 80, defaultWidth: 120, idealWidth: width },
              value: { minWidth: 80, defaultWidth: 100 },
            }}
            onColumnResize={(event, data) => {
              resize(event?.type, data);
              setWidth(data.width);
            }}
          />
        </>
      );
    };
    render(<Fixture />);
    header().then($root => {
      const node = $root[0];
      nameHeader().should('have.css', 'width', '120px').realClick({ button: 'right' });
      nameHeader().find('[role="separator"]').should('have.focus');
      cy.realPress('ArrowRight');
      cy.get('@resize-owner').should('have.been.calledOnceWithExactly', 'keydown', { columnId: 'name', width: 140 });
      nameHeader().should('have.css', 'width', '140px');
      cy.realPress('Escape');
      cy.get('#external-width').realClick();
      nameHeader().should('have.css', 'width', '220px');
      bodyRows().find('.fui-DataGridCell').filter(':nth-child(1)').should('have.css', 'width', '220px');
      nameHeader().find('[role="separator"]').should('have.attr', 'aria-valuetext', '220 pixels');
      header().then($current => expect($current[0]).to.equal(node));
      cy.get('@resize-owner').should('have.callCount', 1);
      audit('documented external sizing owner');
    });
  });
});

describeRound(4, 'DataGridHeader round 4: resize callbacks and root accessibility edges', () => {
  it('R4.01 keyboard resize emits exact native-event payloads, clamps at minWidth and keeps sort unchanged', () => {
    const resize = cy.spy().as('resize');
    const callback: DataGridProps['onColumnResize'] = (event, data) =>
      resize(event?.type, event && 'key' in event ? event.key : undefined, data);
    render(<ResizeGrid onColumnResize={callback} />);
    nameHeader().should('have.css', 'width', '120px').realClick({ button: 'right' });
    const handle = () => nameHeader().find('[role="separator"]');
    handle().should('have.focus');
    cy.realPress('ArrowRight');
    cy.get('@resize').should('have.been.calledOnceWithExactly', 'keydown', 'ArrowRight', {
      columnId: 'name',
      width: 140,
    });
    nameHeader().should('have.css', 'width', '140px');
    handle().should('have.attr', 'aria-valuetext', '140 pixels');
    cy.realPress(['Shift', 'ArrowLeft']);
    cy.get('@resize')
      .should('have.callCount', 2)
      .its('lastCall.args')
      .should('deep.equal', ['keydown', 'ArrowLeft', { columnId: 'name', width: 135 }]);
    nameHeader().should('have.css', 'width', '135px');
    for (let index = 0; index < 4; index++) {
      cy.realPress('ArrowLeft');
    }
    nameHeader().should('have.css', 'width', '80px');
    cy.get('@resize')
      .should('have.callCount', 6)
      .its('lastCall.args')
      .should('deep.equal', ['keydown', 'ArrowLeft', { columnId: 'name', width: 80 }]);
    handle().should('have.attr', 'aria-valuetext', '80 pixels');
    cy.realPress('Escape');
    nameHeader().find('[role="button"]').should('have.focus');
    nameHeader().should('have.attr', 'aria-sort', 'none');
    audit('exact resize callback and minimum width');
  });

  it('R4.02 pointer resize emits native mousemove with the actual resulting column width and does not sort', () => {
    const resize = cy.spy().as('resize');
    render(<ResizeGrid onColumnResize={(event, data) => resize(event?.type, data)} />);
    nameHeader().should('have.css', 'width', '120px');
    nameHeader().find('[role="separator"]').realMouseDown().realMouseMove(40, 0);
    nameHeader()
      .should($cell => expect(Number.parseFloat($cell[0].style.width)).to.be.greaterThan(140))
      .then($cell => {
        const width = Number.parseFloat($cell[0].style.width);
        cy.get('@resize')
          .its('lastCall.args')
          .should('deep.equal', ['mousemove', { columnId: 'name', width }]);
        bodyRows().find('.fui-DataGridCell').filter(':nth-child(1)').should('have.css', 'width', `${width}px`);
      });
    cy.get('body').realMouseUp();
    nameHeader().should('have.attr', 'aria-sort', 'none');
    order(['Alpha', 'Bravo', 'Charlie']);
  });

  it('R4.03 visible heading, rowgroup, columns and select-all keep their accessible names through interaction', () => {
    render(
      <>
        <h2 id="inventory-title">Project inventory</h2>
        <Grid
          aria-label={undefined}
          aria-labelledby="inventory-title"
          selectionMode="multiselect"
          headerProps={{ 'aria-label': 'Inventory columns' }}
        />
      </>,
    );
    cy.get('.fui-DataGrid').should($grid => expect(computeAccessibleName($grid[0])).to.equal('Project inventory'));
    header().should($root => expect(computeAccessibleName($root[0])).to.equal('Inventory columns'));
    headerInput().should($input => expect(computeAccessibleName($input[0])).to.equal('Select all rows'));
    header()
      .find('[role="columnheader"]')
      .should($cells =>
        expect(Array.from($cells, cell => computeAccessibleName(cell))).to.deep.equal(['Name', 'Value']),
      );
    headerInput().realClick();
    gridSelection(['a', 'b', 'c']);
    header().should('have.attr', 'role', 'rowgroup');
    header().find('[role="row"]').should('have.attr', 'aria-selected', 'false');
    audit('visible heading and named header');
  });

  it('R4.04 explicit root tabIndex becomes the mover Tab entry while descendants retain arrow navigation', () => {
    const focus = cy.spy().as('focus');
    render(
      <Grid
        headerProps={{
          tabIndex: 0,
          onFocus: (event: React.FocusEvent<HTMLDivElement>) => focus(event.currentTarget.id, event.target),
        }}
      />,
    );
    cy.get('#before').realClick();
    cy.realPress('Tab');
    header()
      .should('have.focus')
      .then($root => {
        cy.get('@focus').should('have.been.calledOnceWithExactly', 'header', $root[0]);
      });
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    nameHeader().focus();
    nameHeader().should('have.focus');
    cy.get('@focus').should('have.callCount', 2);
    cy.realPress('ArrowRight');
    header().find('[role="columnheader"]').last().should('have.focus');
  });

  it('R4.05 null and fragment children update without remounting the public header root', () => {
    const Fixture = () => {
      const [visible, setVisible] = React.useState(false);
      return (
        <>
          <button id="content" onClick={() => setVisible(value => !value)}>
            Toggle content
          </button>
          <DataGridHeader id="content-header">
            {visible ? (
              <>
                <span>First</span>
                <span>Second</span>
              </>
            ) : null}
          </DataGridHeader>
        </>
      );
    };
    render(<Fixture />);
    header()
      .should('be.empty')
      .then($root => {
        const node = $root[0];
        cy.get('#content').realClick();
        header().should('have.text', 'FirstSecond').find('span').should('have.length', 2);
        cy.get('#content').realClick();
        header()
          .should('be.empty')
          .then($current => expect($current[0]).to.equal(node));
      });
  });

  it('R4.06 hidden attribute is forwarded but authored display wins; explicit display hiding removes/restores tab stops', () => {
    const Fixture = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="visibility" onClick={() => setPhase(value => value + 1)}>
            Toggle header visibility
          </button>
          <Grid items={[]} headerProps={{ hidden: phase < 2, style: { display: phase === 1 ? 'none' : undefined } }} />
        </>
      );
    };
    render(<Fixture />);
    header().should('be.visible').and('have.attr', 'hidden');
    header().should('have.css', 'display', 'block');
    cy.get('#visibility').realClick();
    header().should('not.be.visible').and('have.attr', 'hidden');
    cy.get('#before').realClick();
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    cy.get('#visibility').realClick();
    header().should('be.visible').and('not.have.attr', 'hidden');
    cy.get('#before').realClick();
    cy.realPress('Tab');
    nameHeader().should('have.focus');
    audit('restored visible header');
  });
});

describeRound(6, 'DataGridHeader round 6: event identity, ownership and provider boundaries', () => {
  it('R6.01 select-all shares the original event through callback and root bubbling without mutating controlled input', () => {
    const owner = Object.freeze(new Set<TableRowId>(['b']));
    const events: React.SyntheticEvent[] = [];
    const trace: string[] = [];
    let requested: Set<TableRowId> | undefined;
    render(
      <Grid
        selectionMode="multiselect"
        selectedItems={owner}
        onSelectionChange={(event, data) => {
          trace.push('selection');
          events.push(event);
          requested = data.selectedItems;
          expect(event.currentTarget).to.have.class('fui-DataGridSelectionCell');
          expect(event.type).to.equal('click');
        }}
        headerProps={{
          onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            trace.push('header');
            events.push(event);
            expect(event.currentTarget.id).to.equal('header');
            expect(event.target).to.have.property('tagName', 'INPUT');
          },
        }}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          trace.push('grid');
          events.push(event);
          expect(event.currentTarget).to.have.class('fui-DataGrid');
        }}
      />,
    );
    headerInput()
      .realClick()
      .then(() => {
        expect(trace).to.deep.equal(['selection', 'header', 'grid']);
        expect(events[1]).to.equal(events[0]);
        expect(events[2]).to.equal(events[0]);
        expect(requested).not.to.equal(owner);
        expect([...requested!]).to.deep.equal(['b', 'a', 'c']);
        expect([...owner]).to.deep.equal(['b']);
      });
    gridSelection(['b']);
    headerInput().should('have.prop', 'indeterminate', true);
    audit('controlled selection event identity and order');
  });

  it('R6.02 sorting precedes root handlers and shares event identity while the frozen owner rejects updates', () => {
    const owner = Object.freeze<SortState>({ sortColumn: 'name', sortDirection: 'ascending' });
    const trace: string[] = [];
    const events: React.SyntheticEvent[] = [];
    const requests: SortState[] = [];
    render(
      <Grid
        sortable
        sortState={owner}
        onSortChange={(event, data) => {
          trace.push('sort');
          events.push(event);
          requests.push(data);
          expect(event.currentTarget).to.have.class('fui-DataGridHeaderCell');
        }}
        headerProps={{
          onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            trace.push('header');
            events.push(event);
            event.preventDefault();
          },
        }}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          trace.push('grid');
          events.push(event);
          expect(event.defaultPrevented).to.equal(true);
        }}
      />,
      'ltr',
      false,
    );
    nameHeader().realClick();
    nameHeader().find('[role="button"]').focus();
    cy.realPress('Enter');
    cy.then(() => {
      expect(trace).to.deep.equal(['sort', 'header', 'grid', 'sort', 'header', 'grid']);
      expect(events[1]).to.equal(events[0]);
      expect(events[2]).to.equal(events[0]);
      expect(events[4]).to.equal(events[3]);
      expect(events[5]).to.equal(events[3]);
      expect(events[3]).not.to.equal(events[0]);
      expect(requests).to.deep.equal([
        { sortColumn: 'name', sortDirection: 'descending' },
        { sortColumn: 'name', sortDirection: 'descending' },
      ]);
      expect(requests[0]).not.to.equal(owner);
      expect(owner).to.deep.equal({ sortColumn: 'name', sortDirection: 'ascending' });
    });
    nameHeader().should('have.attr', 'aria-sort', 'ascending');
    order(['Alpha', 'Bravo', 'Charlie']);
  });

  it('R6.03 live dark-theme and RTL provider updates preserve root, selection, sorting and reversed arrow navigation', () => {
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider theme={updated ? webDarkTheme : webLightTheme} dir={updated ? 'rtl' : 'ltr'}>
          <button id="provider-update" onClick={() => setUpdated(true)}>
            Update provider
          </button>
          <Grid sortable selectionMode="multiselect" />
        </FluentProvider>
      );
    };
    render(<Fixture />, 'ltr', false);
    headerInput().realClick();
    nameHeader().realClick().realClick().should('have.attr', 'aria-sort', 'descending');
    header()
      .should('have.css', 'color', 'rgb(36, 36, 36)')
      .then($root => {
        const node = $root[0];
        cy.get('#provider-update').realClick();
        cy.get('body').realHover({ position: 'topLeft' });
        header().should('have.css', 'color', 'rgb(255, 255, 255)').and('have.css', 'direction', 'rtl');
        header().then($current => expect($current[0]).to.equal(node));
      });
    gridSelection(['a', 'b', 'c']);
    nameHeader().should('have.attr', 'aria-sort', 'descending');
    order(['Charlie', 'Bravo', 'Alpha']);
    nameHeader().find('[role="button"]').focus();
    cy.realPress('ArrowLeft');
    header().find('[role="columnheader"]').last().should('have.focus');
    audit('live dark RTL provider');
  });

  it('R6.04 numeric zero and obsolete selected IDs retain their types through header all/none transitions', () => {
    const change = cy.spy().as('numeric-selection');
    render(
      <Grid
        getRowId={(item: Item) => item.value - 1}
        selectionMode="multiselect"
        defaultSelectedItems={new Set<TableRowId>([-1, 0])}
        onSelectionChange={(_event, data) => change([...data.selectedItems])}
      />,
    );
    headerInput().should('have.prop', 'indeterminate', true).and('not.be.checked');
    bodyRows().filter('[data-rowid="0"]').should('have.attr', 'aria-selected', 'true');
    headerInput().realClick();
    cy.get('@numeric-selection').should('have.been.calledOnceWithExactly', [-1, 0, 1, 2]);
    headerInput().should('be.checked').and('have.prop', 'indeterminate', false);
    bodyRows().each($row => {
      expect($row).to.have.attr('aria-selected', 'true');
      expect($row.find('input')).to.have.prop('checked', true);
    });
    headerInput().focus();
    cy.realPress('Space');
    cy.get('@numeric-selection').should('have.callCount', 2).its('lastCall.args').should('deep.equal', [[]]);
    bodyRows().each($row => {
      expect($row).to.have.attr('aria-selected', 'false');
      expect($row.find('input')).to.have.prop('checked', false);
    });
    header().find('[role="row"]').should('have.attr', 'aria-selected', 'false');
    audit('numeric identities with obsolete selection');
  });

  it('R6.05 removing and restoring the header does not leak header context into persistent body rows', () => {
    const change = cy.spy().as('body-selection');
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="toggle-header" onClick={() => setVisible(value => !value)}>
            Toggle header
          </button>
          <DataGrid
            items={items}
            columns={columns}
            getRowId={(item: Item) => item.id}
            selectionMode="multiselect"
            focusMode="row_unstable"
            aria-label="Header lifecycle"
            onSelectionChange={(_event, data) => change([...data.selectedItems])}
          >
            {visible && (
              <DataGridHeader>
                <DataGridRow selectionCell={{ checkboxIndicator: { 'aria-label': 'Select all rows' } }}>
                  {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
                </DataGridRow>
              </DataGridHeader>
            )}
            <DataGridBody<Item>>
              {({ item, rowId }) => (
                <DataGridRow<Item>
                  key={rowId}
                  selectionCell={{ checkboxIndicator: { 'aria-label': `Select ${item.name}` } }}
                >
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </>
      );
    };
    render(<Fixture />);
    bodyRows()
      .first()
      .then($row => {
        const node = $row[0];
        cy.get('#toggle-header').realClick();
        header().should('not.exist');
        bodyRows().first().focus().should('have.focus');
        cy.realPress('Space');
        cy.get('@body-selection').should('have.been.calledOnceWithExactly', ['a']);
        cy.get('#toggle-header').realClick();
        headerInput().should('have.prop', 'indeterminate', true);
        header().find('[role="row"]').should('not.have.attr', 'tabindex');
        header().find('[role="row"]').should('have.attr', 'aria-selected', 'false');
        bodyRows()
          .first()
          .then($current => expect($current[0]).to.equal(node));
        headerInput().realClick();
        cy.get('@body-selection')
          .should('have.callCount', 2)
          .its('lastCall.args')
          .should('deep.equal', [['a', 'b', 'c']]);
        audit('restored header context boundary');
      });
  });
});

describeRound(7, 'DataGridHeader round 7: additional public hook and ref conformance', () => {
  it('R7.01 replacing the callback ref clears the previous owner and unmount clears only the latest owner', () => {
    const first = cy.spy().as('first-ref');
    const latest = cy.spy().as('latest-ref');
    const firstRef = (node: HTMLDivElement | null) => {
      first(node);
    };
    const latestRef = (node: HTMLDivElement | null) => {
      latest(node);
    };
    const Fixture = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="ref-phase" onClick={() => setPhase(value => value + 1)}>
            Advance ref phase
          </button>
          {phase < 2 && <DataGridHeader ref={phase ? latestRef : firstRef}>Ref lifecycle</DataGridHeader>}
        </>
      );
    };
    render(<Fixture />, 'ltr', false);
    header().then($root => {
      const node = $root[0];
      cy.get('@first-ref').should('have.been.calledOnceWithExactly', node);
      cy.get('@latest-ref').should('not.have.been.called');
      cy.get('#ref-phase').realClick();
      header().then($current => expect($current[0]).to.equal(node));
      cy.get('@first-ref').should('have.callCount', 2).its('lastCall.args').should('deep.equal', [null]);
      cy.get('@latest-ref').should('have.been.calledOnceWithExactly', node);
      cy.get('#ref-phase').realClick();
      header().should('not.exist');
      cy.get('@first-ref').should('have.callCount', 2);
      cy.get('@latest-ref').should('have.callCount', 2).its('lastCall.args').should('deep.equal', [null]);
    });
  });

  it('R7.02 headless state forces the div root and styles return the same state through inherited context updates', () => {
    let captured: DataGridHeaderState | undefined;
    let styled: DataGridHeaderState | undefined;
    const ref = React.createRef<HTMLElement>();
    const Headless = () => {
      const state = useDataGridHeader_unstable(
        { as: 'thead', className: 'headless-consumer', children: 'Columns' },
        ref,
      );
      styled = useDataGridHeaderStyles_unstable(state);
      captured = state;
      return renderDataGridHeader_unstable(state);
    };
    const Fixture = () => {
      const [flex, setFlex] = React.useState(false);
      return (
        <>
          <button id="headless-context" onClick={() => setFlex(true)}>
            Update inherited context
          </button>
          <Table as="div" noNativeElements={flex} aria-label="Headless context host">
            <Headless />
          </Table>
        </>
      );
    };
    render(<Fixture />);
    header()
      .should('have.css', 'display', 'table-row-group')
      .then($root => {
        const node = $root[0];
        expect(node.tagName).to.equal('DIV');
        expect(captured?.root.role).to.equal('rowgroup');
        expect(captured?.noNativeElements).to.equal(false);
        expect(styled).to.equal(captured);
        expect(ref.current).to.equal(node);
        cy.get('#headless-context').realClick();
        header().should('have.css', 'display', 'block').and('have.class', 'headless-consumer');
        header()
          .should('have.class', 'fui-DataGridHeader')
          .and('have.class', 'fui-TableHeader')
          .then($current => {
            expect($current[0]).to.equal(node);
            expect(ref.current).to.equal(node);
            expect($current[0].tagName).to.equal('DIV');
            expect(captured?.root.role).to.equal('rowgroup');
            expect(captured?.noNativeElements).to.equal(true);
            expect(styled).to.equal(captured);
          });
      });
  });
});
