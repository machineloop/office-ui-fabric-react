import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import { FixedSizeList } from 'react-window';
import type { ListChildComponentProps } from 'react-window';
import * as axe from 'axe-core';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { DataGrid, DataGridBody, DataGridCell, DataGridHeader, DataGridRow, createTableColumn } from '../../index';
import type { DataGridProps, TableColumnDefinition } from '../../index';
import { DataGridHeaderCell } from './DataGridHeaderCell';
import type { DataGridHeaderCellProps } from './DataGridHeaderCell.types';
import { TableContextProvider } from '../../contexts/tableContext';
import { DataGridContextProvider, dataGridContextDefaultValue } from '../../contexts/dataGridContext';
import { ColumnIdContextProvider } from '../../contexts/columnIdContext';
import { useDataGridHeaderCell_unstable } from './useDataGridHeaderCell';
import { useDataGridHeaderCellStyles_unstable } from './useDataGridHeaderCellStyles.styles';
import { renderDataGridHeaderCell_unstable } from './renderDataGridHeaderCell';
import type { EnableKeyboardModeOnChangeCallback } from '../../hooks/types';
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

const requested: unknown = Cypress.env('coverageRound');
const round = requested === undefined ? 7 : Number(requested);
if (!Number.isInteger(round) || round < 1 || round > 7) {
  throw new Error('coverageRound must be an integer from 1 through 7');
}
const describeRound = (n: number, title: string, tests: () => void) => {
  if (n <= round) {
    describe(title, tests);
  }
};
const auditLedger = Cypress.env('auditLedger') ?? 'src/components/DataGridHeaderCell/reports/current-audit-ledger.json';
type AuditScope = { passes: number; violations: axe.Result[]; incomplete: axe.Result[] };
type UncontrolledSortInput = {
  mode: 'uncontrolled';
  strictMode: boolean;
  requests: Parameters<NonNullable<DataGridProps['onSortChange']>>[1][];
};
type AuditReport = {
  scenario: string;
  label: string;
  scope: string;
  headerScope: string;
  root: AuditScope;
  header: AuditScope;
  uncontrolledSort?: UncontrolledSortInput & {
    callbackCount: number;
    domDirection: string | null | undefined;
    rowOrder: (string | undefined)[];
  };
};
before(() => cy.writeFile(auditLedger, []));
const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr', strict = true) => {
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <main>{children}</main>
    </FluentProvider>,
    { strict },
  );
  cy.get('body').realHover({ position: 'topLeft' });
};
type Item = { name: string; value: number };
const items: Item[] = [
  { name: 'Bravo', value: 2 },
  { name: 'Alpha', value: 3 },
  { name: 'Charlie', value: 1 },
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
    compare: (a, b) => a.value - b.value,
    renderHeaderCell: () => 'Value',
    renderCell: item => item.value,
  }),
  createTableColumn<Item>({ columnId: 'plain', renderHeaderCell: () => 'Plain', renderCell: () => 'Read only' }),
];
const Grid = ({
  cellProps,
  cellRef,
  headerContent,
  resizingMenu,
  keyboardChange,
  ...props
}: Partial<DataGridProps> & {
  cellProps?: DataGridHeaderCellProps;
  cellRef?: React.Ref<HTMLDivElement>;
  headerContent?: (column: TableColumnDefinition<Item>) => React.ReactNode;
  resizingMenu?: boolean;
  keyboardChange?: EnableKeyboardModeOnChangeCallback;
}) => (
  <>
    <button id="before">Before</button>
    <DataGrid items={items} columns={columns} aria-label="Inventory" {...props}>
      <DataGridHeader>
        <DataGridRow selectionCell={props.selectionMode ? { checkboxIndicator: { 'aria-label': 'Select all' } } : null}>
          {(column, dataGrid) => {
            const content = (
              <DataGridHeaderCell
                data-column={column.columnId}
                ref={column.columnId === 'name' ? cellRef : undefined}
                {...(column.columnId === 'name' ? cellProps : {})}
              >
                {headerContent ? headerContent(column) : column.renderHeaderCell()}
              </DataGridHeaderCell>
            );
            return resizingMenu ? (
              <Menu openOnContext>
                <MenuTrigger>{content}</MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem
                      onClick={dataGrid.columnSizing_unstable.enableKeyboardMode(column.columnId, keyboardChange)}
                    >
                      Keyboard Column Resizing
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            ) : (
              content
            );
          }}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<Item>>
        {({ item, rowId }) => (
          <DataGridRow<Item>
            key={rowId}
            selectionCell={props.selectionMode ? { checkboxIndicator: { 'aria-label': `Select ${item.name}` } } : null}
          >
            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
    <button id="after">After</button>
  </>
);
const cell = (id = 'name') => cy.get(`.fui-DataGridHeaderCell[data-column="${id}"]`);
const sortButton = (id = 'name') => cell(id).find('[role="button"],button');
const order = (names: string[]) =>
  cy.get('.fui-DataGridBody .fui-DataGridRow').should($rows => {
    expect(Array.from($rows, row => row.querySelector('.fui-DataGridCell')?.textContent)).to.deep.equal(names);
  });

const emptyScenario = 'R3.10 empty grid requires exact empty-body incomplete classification';
const assertFindings = (
  result: Pick<axe.AxeResults, 'violations' | 'incomplete'>,
  scope: Element,
  scenario = Cypress.currentTest.title,
  phase = '',
) => {
  const empty =
    scenario === emptyScenario && phase === 'empty body strict incomplete' && scope.matches('.fui-DataGrid');
  const overlap =
    scope.matches('.fui-DataGrid') &&
    ((scenario === 'R3.07 context menu does not sort and Escape closes but non-tabstop trigger cannot restore focus' &&
      phase === 'open menu grid') ||
      (scenario === 'R3.13 stable FocusableElementsInCells author group opens menu and Escape returns through group' &&
        phase === 'author menu open'));
  const clipped =
    scope.matches('.fui-DataGrid') &&
    phase === 'local virtualized header' &&
    scenario === 'R3.14 local virtualization recomposition preserves header sorting across native scrolling';
  expect(
    result.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(n => n.target) })),
    'exact classified incomplete set',
  ).to.deep.equal(
    empty
      ? [{ id: 'aria-required-children', targets: [['.fui-DataGridBody']] }]
      : overlap || clipped
      ? [{ id: 'color-contrast', targets: result.incomplete[0]?.nodes.map(node => node.target) }]
      : [],
  );
  if (empty) {
    const bodies = scope.querySelectorAll('.fui-DataGridBody');
    expect(bodies).to.have.length(1);
    expect(bodies[0].getAttribute('role')).to.equal('rowgroup');
    expect(bodies[0].childNodes).to.have.length(0);
    const node = result.incomplete[0].nodes[0];
    expect(node.any.map(({ id, data }) => ({ id, data }))).to.deep.equal([
      { id: 'aria-required-children', data: ['row'] },
    ]);
    expect(node.all).to.deep.equal([]);
    expect(node.none).to.deep.equal([]);
  }
  if (overlap || clipped) {
    const authorMenu = phase === 'author menu open';
    const expected = clipped
      ? ['54', '53'].flatMap(id => Array.from(scope.querySelectorAll(`[data-virtual="${id}"] .fui-DataGridCell`)))
      : authorMenu
      ? Array.from(scope.querySelectorAll('.fui-DataGridBody .fui-DataGridRow'))
          .slice(0, 2)
          .map(row => row.querySelectorAll('.fui-DataGridCell')[1].querySelector('.fui-TableCellLayout__main'))
      : [scope.querySelector('.fui-DataGridBody .fui-DataGridRow')!.querySelectorAll('.fui-DataGridCell')[1]];
    const nodes = result.incomplete[0].nodes;
    expect(nodes).to.have.length(expected.length);
    expect(expected.map(element => element?.textContent)).to.deep.equal(
      clipped
        ? ['Item 54', '54', 'Read only', 'Item 53', '53', 'Read only']
        : authorMenu
        ? ['Max Mustermann', 'Erika Mustermann']
        : ['2'],
    );
    expect(
      nodes.map(node => {
        expect(node.target).to.have.length(1);
        expect(node.any).to.have.length(1);
        const check = node.any[0];
        expect(check.id).to.equal('color-contrast');
        expect(Object.keys(check.data).sort()).to.deep.equal([
          'bgColor',
          'contrastRatio',
          'expectedContrastRatio',
          'fgColor',
          'fontSize',
          'fontWeight',
          'messageKey',
          'shadowColor',
        ]);
        expect(check.data.bgColor).to.equal(undefined);
        expect(check.data.fgColor).to.equal(undefined);
        expect(check.data.shadowColor).to.equal(undefined);
        expect(check.data.contrastRatio, 'contrastRatio').to.equal(0);
        expect(check.data.fontSize, 'fontSize').to.equal('10.5pt (14px)');
        expect(check.data.fontWeight, 'fontWeight').to.equal('normal');
        expect(check.data.messageKey, 'messageKey').to.equal(
          clipped ? 'elmPartiallyObscured' : authorMenu ? 'bgOverlap' : 'shortTextContent',
        );
        expect(check.data.expectedContrastRatio, 'expectedContrastRatio').to.equal('4.5:1');
        expect(node.all).to.deep.equal([]);
        expect(node.none).to.deep.equal([]);
        return scope.querySelector(String(node.target[0]));
      }),
    ).to.deep.equal(expected);
    if (overlap) {
      const popover = scope.ownerDocument.querySelector('.fui-MenuPopover');
      expect(popover, 'actual visible overlay').not.to.equal(null);
      expect(popover!.getBoundingClientRect().height).to.be.greaterThan(0);
    } else {
      const viewport = scope.querySelector('#virtual-body > div')!;
      expect(viewport.scrollTop).to.equal(800);
      expected.forEach(element => {
        const rect = element!.getBoundingClientRect();
        const bottom = viewport.getBoundingClientRect().bottom;
        expect(rect.top).to.be.at.least(bottom - 4);
        expect(rect.bottom).to.be.greaterThan(bottom);
      });
    }
  }
  const dummies = Array.from(scope.querySelectorAll('i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]')).filter(
    element => element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible',
  );
  const activeResize =
    phase === 'active resize' &&
    scope.matches('.fui-DataGrid,.fui-DataGridHeader') &&
    [
      ...[true, false].flatMap(autoFit =>
        ['Escape', 'Enter', 'Space'].map(
          exit => `R3.01 autoFit=${autoFit} keyboard resizing exact steps precision ${exit} exit focus and sort`,
        ),
      ),
    ].includes(scenario);
  const allowed = [
    ...(result.violations.some(finding => finding.id === 'aria-hidden-focus') ? ['aria-hidden-focus'] : []),
    ...(activeResize ? ['aria-required-attr'] : []),
  ];
  expect(
    result.violations.map(v => v.id),
    'exact classified violation set',
  ).to.deep.equal(allowed);
  const dummyFinding = result.violations.find(finding => finding.id === 'aria-hidden-focus');
  if (dummyFinding) {
    const nodes = dummyFinding.nodes;
    expect(nodes).to.have.length(dummies.length);
    expect(
      nodes.map(node => {
        expect(node.target).to.have.length(1);
        const element = scope.querySelector(String(node.target[0]));
        expect(element?.matches('i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]')).to.equal(true);
        expect(element?.getAttribute('role')).to.equal('none');
        expect(node.any).to.deep.equal([]);
        expect(node.none).to.deep.equal([]);
        expect(node.all.map(({ id, data }) => ({ id, data }))).to.deep.equal([
          { id: 'focusable-not-tabbable', data: null },
        ]);
        return element;
      }),
    ).to.have.members(dummies);
  }
  if (activeResize) {
    const finding = result.violations.find(value => value.id === 'aria-required-attr')!;
    expect(finding.nodes).to.have.length(1);
    const node = finding.nodes[0];
    expect(node.target).to.have.length(1);
    const separator = scope.querySelector(String(node.target[0]));
    expect(separator).to.equal(scope.querySelector('[data-column="name"] .fui-TableResizeHandle[aria-hidden="false"]'));
    expect(separator?.getAttribute('role')).to.equal('separator');
    expect(separator?.getAttribute('aria-label')).to.equal('Resize column');
    expect(separator?.getAttribute('aria-valuetext')).to.equal('180 pixels');
    expect(separator?.hasAttribute('aria-valuenow')).to.equal(false);
    expect(node.any.map(({ id, data }) => ({ id, data }))).to.deep.equal([
      { id: 'aria-required-attr', data: ['aria-valuenow'] },
    ]);
    expect(node.all).to.deep.equal([]);
    expect(node.none).to.deep.equal([]);
  }
};
const audit = (label: string, selector = '.fui-DataGrid', uncontrolledSort?: UncontrolledSortInput) =>
  cy
    .get(selector)
    .should('have.length', 1)
    .then(async $scope => {
      const scope = $scope[0];
      if (scope.matches('.fui-DataGrid')) {
        expect(scope.querySelectorAll('.fui-DataGridHeader'), 'complete single header audit scope').to.have.length(1);
      }
      const root = await axe.run(scope);
      const header = scope.querySelector('.fui-DataGridHeader') ?? scope;
      const headerResult = await axe.run(header);
      return { scope, header, root, headerResult };
    })
    .then(({ scope, header, root, headerResult }) =>
      cy
        .readFile<AuditReport[]>(auditLedger)
        .then(reports =>
          cy.writeFile(auditLedger, [
            ...reports,
            {
              scenario: Cypress.currentTest.title,
              label,
              scope: selector,
              headerScope: header === scope ? selector : '.fui-DataGridHeader',
              uncontrolledSort: uncontrolledSort
                ? {
                    ...uncontrolledSort,
                    callbackCount: uncontrolledSort.requests.length,
                    domDirection: scope.querySelector('[data-column="name"]')?.getAttribute('aria-sort'),
                    rowOrder: Array.from(
                      scope.querySelectorAll('.fui-DataGridBody .fui-DataGridRow'),
                      row => row.querySelector('.fui-DataGridCell')?.textContent ?? undefined,
                    ),
                  }
                : undefined,
              root: { passes: root.passes.length, violations: root.violations, incomplete: root.incomplete },
              header: {
                passes: headerResult.passes.length,
                violations: headerResult.violations,
                incomplete: headerResult.incomplete,
              },
            },
          ]),
        )
        .then(() => {
          expect(root.passes.length).to.be.greaterThan(0);
          expect(headerResult.passes.length).to.be.greaterThan(0);
          assertFindings(root, scope, Cypress.currentTest.title, label);
          assertFindings(headerResult, header, Cypress.currentTest.title, label);
          if (root.incomplete.length && Cypress.currentTest.title !== emptyScenario) {
            const finding = root.incomplete[0];
            const node = finding.nodes[0];
            const reject = (
              incomplete: axe.Result[],
              phase = label,
              scenario = Cypress.currentTest.title,
              dom: Element = scope,
            ) =>
              expect(() =>
                assertFindings({ violations: root.violations, incomplete }, dom, scenario, phase),
              ).to.throw();
            reject([]);
            reject([...root.incomplete, { ...finding, id: 'aria-required-children' }]);
            reject([{ ...finding, id: 'aria-required-children' }]);
            reject([{ ...finding, nodes: [] }]);
            reject([{ ...finding, nodes: [...finding.nodes, node] }]);
            reject([
              { ...finding, nodes: [{ ...node, target: ['.fui-DataGridHeaderCell'] }, ...finding.nodes.slice(1)] },
            ]);
            const wrongCheck = { ...node };
            wrongCheck.any = node.any.map(check => ({ ...check, data: { ...check.data, messageKey: 'unclassified' } }));
            reject([{ ...finding, nodes: [wrongCheck, ...finding.nodes.slice(1)] }]);
            reject(root.incomplete, 'wrong phase');
            reject(root.incomplete, label, 'wrong scenario');
            reject(root.incomplete, label, Cypress.currentTest.title, header);
          }
          if (label === 'active resize') {
            const finding = root.violations.find(value => value.id === 'aria-required-attr')!;
            const node = finding.nodes[0];
            const reject = (
              replacement: axe.Result | undefined,
              phase = label,
              scenario = Cypress.currentTest.title,
              dom: Element = scope,
            ) => {
              const violations = root.violations.filter(value => value.id !== 'aria-required-attr');
              if (replacement) {
                violations.push(replacement);
              }
              expect(() => assertFindings({ violations, incomplete: [] }, dom, scenario, phase)).to.throw();
            };
            reject(undefined);
            reject({ ...finding, id: 'aria-valid-attr-value' });
            reject({ ...finding, nodes: [] });
            reject({ ...finding, nodes: [node, node] });
            reject({ ...finding, nodes: [{ ...node, target: ['.fui-DataGridHeaderCell'] }] });
            const wrongCheck = { ...node };
            wrongCheck.any = node.any.map(check => ({ ...check, data: ['aria-valuemax'] }));
            reject({ ...finding, nodes: [wrongCheck] });
            reject(finding, 'wrong phase');
            reject(finding, label, 'wrong scenario');
            reject(finding, label, Cypress.currentTest.title, scope.querySelector('.fui-DataGridHeaderCell')!);
          }
          if (Cypress.currentTest.title === emptyScenario) {
            const finding = root.incomplete[0];
            const node = finding.nodes[0];
            const reject = (incomplete: axe.Result[], dom: Element = scope, scenario = emptyScenario, phase = label) =>
              expect(() =>
                assertFindings({ violations: root.violations, incomplete }, dom, scenario, phase),
              ).to.throw();
            reject([]);
            reject([...root.incomplete, { ...finding, id: 'color-contrast' }]);
            reject([{ ...finding, id: 'color-contrast' }]);
            reject([{ ...finding, nodes: [] }]);
            reject([{ ...finding, nodes: [node, node] }]);
            reject([{ ...finding, nodes: [{ ...node, target: ['#wrong'] }] }]);
            const wrongChildren = { ...node };
            wrongChildren.any = node.any.map(check => ({ ...check, data: ['gridcell'] }));
            reject([{ ...finding, nodes: [wrongChildren] }]);
            reject(root.incomplete, header);
            reject(root.incomplete, scope, 'unlisted scenario');
            reject(root.incomplete, scope, emptyScenario, 'unlisted phase');
            const nonempty = scope.cloneNode(true) as Element;
            nonempty.querySelector('.fui-DataGridBody')!.appendChild(scope.ownerDocument.createElement('div'));
            reject(root.incomplete, nonempty);
          }
        }),
    );

describeRound(1, 'component124 round 1: inherited and context contracts', () => {
  it('R1.01 standalone default snapshot is a focusable div columnheader', () => {
    render(<DataGridHeaderCell id="standalone">Default DataGridHeaderCell</DataGridHeaderCell>);
    cy.get('#standalone')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'columnheader')
      .and('have.attr', 'tabindex', '0')
      .and('have.class', 'fui-TableHeaderCell');
    cy.get('#standalone').should('not.have.attr', 'aria-sort');
    cy.get('#standalone')
      .find('.fui-DataGridHeaderCell__button')
      .should('have.text', 'Default DataGridHeaderCell')
      .and('not.have.attr', 'role');
  });

  describeRound(2, 'component124 round 2: native activation callbacks and focus', () => {
    for (const activation of ['pointer', 'Enter', 'Space'] as const) {
      it(`R2.01 ${activation} sorts once per activation with exact callback payload and bubbling targets`, () => {
        const onSortChange = cy.stub().as('sort');
        const onClick = cy.stub().as('click');
        render(<Grid sortable onSortChange={onSortChange} cellProps={{ onClick }} />, 'ltr', false);
        const activate = () => {
          if (activation === 'pointer') {
            sortButton().realClick();
          } else {
            sortButton().focus();
            cy.realPress(activation);
          }
        };
        activate();
        cell().should('have.attr', 'aria-sort', 'ascending');
        order(['Alpha', 'Bravo', 'Charlie']);
        cy.get('@sort')
          .should('have.been.calledOnce')
          .its('firstCall.args.1')
          .should('deep.equal', { sortColumn: 'name', sortDirection: 'ascending' });
        cy.get('@click').should('have.been.calledOnce');
        cell().then($cell => {
          expect(onClick.firstCall.args[0].currentTarget).to.equal(null);
          expect(onClick.firstCall.args[0].target).to.equal($cell[0].querySelector('.fui-DataGridHeaderCell__button'));
        });
        activate();
        cell().should('have.attr', 'aria-sort', 'descending');
        order(['Charlie', 'Bravo', 'Alpha']);
        cy.get('@sort')
          .should('have.been.calledTwice')
          .its('secondCall.args.1')
          .should('deep.equal', { sortColumn: 'name', sortDirection: 'descending' });
        cy.get('@click').should('have.been.calledTwice');
        sortButton('value').realClick();
        cell('value').should('have.attr', 'aria-sort', 'ascending');
        cell().should('have.attr', 'aria-sort', 'none').find('.fui-DataGridHeaderCell__sortIcon').should('not.exist');
        order(['Charlie', 'Bravo', 'Alpha']);
        audit(`${activation} activation`);
      });
    }
    it('R2.02 Space keydown does not activate and native keyup activates', () => {
      const onSortChange = cy.stub().as('sort');
      render(<Grid sortable onSortChange={onSortChange} />, 'ltr', false);
      sortButton().focus();
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchKeyEvent',
          params: { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
        }),
      );
      cy.get('@sort').should('not.have.been.called');
      cell().should('have.attr', 'aria-sort', 'none');
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchKeyEvent',
          params: { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 },
        }),
      );
      cy.get('@sort').should('have.been.calledOnce');
      cell().should('have.attr', 'aria-sort', 'ascending');
      audit('Space phases');
    });
    it('R2.03 root click is the sorting surface and preserves synchronous currentTarget', () => {
      const clicked = cy.stub().as('clicked');
      render(
        <Grid
          sortable
          cellProps={{
            onClick: (event: React.MouseEvent<HTMLElement>) => clicked(event.type, event.target, event.currentTarget),
          }}
        />,
        'ltr',
        false,
      );
      cell().realClick({ position: 'topLeft' });
      cy.get('@clicked').should('have.been.calledOnce');
      cell()
        .should('have.attr', 'aria-sort', 'ascending')
        .then($cell => {
          expect(clicked.firstCall.args[0]).to.equal('click');
          expect(clicked.firstCall.args[2]).to.equal($cell[0]);
        });
      audit('root click');
    });
    it('R2.04 root callback preventDefault occurs after internal sort and does not undo it', () => {
      const clicked = cy.stub().as('clicked');
      render(
        <Grid
          sortable
          cellProps={{
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              event.preventDefault();
              clicked(event.defaultPrevented);
            },
          }}
        />,
        'ltr',
        false,
      );
      sortButton().realClick();
      cy.get('@clicked').should('have.been.calledOnceWithExactly', true);
      cell().should('have.attr', 'aria-sort', 'ascending');
      order(['Alpha', 'Bravo', 'Charlie']);
      audit('root preventDefault');
    });
    it('R2.05 button callback stopPropagation suppresses root callback and context sorting', () => {
      const onClick = cy.stub().as('root');
      const onSortChange = cy.stub().as('sort');
      render(
        <Grid
          sortable
          onSortChange={onSortChange}
          cellProps={{
            onClick,
            button: { onClick: (event: React.MouseEvent<HTMLElement>) => event.stopPropagation() },
          }}
        />,
      );
      sortButton().realClick().focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@root').should('not.have.been.called');
      cy.get('@sort').should('not.have.been.called');
      cell().should('have.attr', 'aria-sort', 'none');
      audit('stopped button bubbling');
    });
    it('R2.06 button disabled blocks pointer and keyboard sorting but does not disable root surface', () => {
      const onSortChange = cy.stub().as('sort');
      render(
        <Grid
          sortable
          onSortChange={onSortChange}
          cellProps={{ button: { disabled: true, disabledFocusable: true } }}
        />,
        'ltr',
        false,
      );
      sortButton().should('have.attr', 'aria-disabled', 'true').realClick().focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@sort').should('not.have.been.called');
      cell().realClick({ position: 'topLeft' });
      cy.get('@sort').should('have.been.calledOnce');
      audit('disabled slot and independent root');
    });
    it('R2.07 controlled sort rejection preserves DOM and row order until external update', () => {
      const changed = cy.stub().as('changed');
      const Controlled = () => {
        const [state, setState] = React.useState({ sortColumn: 'name', sortDirection: 'ascending' as const });
        return (
          <>
            <button id="external" onClick={() => setState({ sortColumn: 'value', sortDirection: 'ascending' })}>
              External sort
            </button>
            <Grid sortable sortState={state} onSortChange={changed} />
          </>
        );
      };
      render(<Controlled />);
      sortButton().realClick();
      cy.get('@changed')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { sortColumn: 'name', sortDirection: 'descending' });
      cell().should('have.attr', 'aria-sort', 'ascending');
      order(['Alpha', 'Bravo', 'Charlie']);
      cy.get('#external').realClick();
      cell().should('have.attr', 'aria-sort', 'none');
      cell('value').should('have.attr', 'aria-sort', 'ascending');
      order(['Charlie', 'Bravo', 'Alpha']);
      audit('external controlled update');
    });
    it('R2.08 rerender updates callbacks comparator grid sortability and inherited icon without remount', () => {
      const old = cy.stub().as('old');
      const latest = cy.stub().as('latest');
      let initial: Element;
      const Changing = () => {
        const [enabled, setEnabled] = React.useState(true);
        return (
          <>
            <button id="change" onClick={() => setEnabled(value => !value)}>
              Change
            </button>
            <Grid sortable={enabled} cellProps={{ onClick: enabled ? old : latest }} />
          </>
        );
      };
      render(<Changing />);
      cell().then($cell => {
        initial = $cell[0];
      });
      sortButton().realClick();
      cy.get('@old').should('have.been.calledOnce');
      cy.get('#change').realClick();
      cell().should('have.attr', 'tabindex', '0').and('not.have.attr', 'aria-sort');
      cell()
        .realClick()
        .then($cell => expect($cell[0]).to.equal(initial));
      cy.get('@latest').should('have.been.calledOnce');
      cy.get('@old').should('have.been.calledOnce');
      cy.get('#change').realClick();
      cell().should('have.attr', 'aria-sort', 'ascending');
      sortButton().realClick();
      cell().should('have.attr', 'aria-sort', 'descending');
      audit('context rerender');
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`R2.09 ${dir} native grid arrows Ctrl Home End and Tab move real focus`, () => {
        render(<Grid sortable />, dir);
        cy.get('#before').realClick();
        cy.realPress('Tab');
        sortButton().should('have.focus');
        cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
        sortButton('value').should('have.focus');
        cy.realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
        cell('plain').should('have.focus');
        cy.realPress('ArrowDown');
        cy.get('.fui-DataGridBody .fui-DataGridRow').first().find('.fui-DataGridCell').last().should('have.focus');
        cy.realPress('ArrowUp');
        cell('plain').should('have.focus');
        cy.realPress(['Control', 'End']);
        cy.get('.fui-DataGridBody .fui-DataGridRow').last().find('.fui-DataGridCell').last().should('have.focus');
        cy.realPress(['Control', 'Home']);
        sortButton().should('have.focus');
        cy.realPress('Tab');
        cy.get('#after').should('have.focus');
        cy.realPress(['Shift', 'Tab']);
        sortButton().should('have.focus');
        audit(`${dir} focus navigation`);
      });
      it(`R2.10 ${dir} group Enter traps Tab Shift Tab and Escape restores root`, () => {
        const action = cy.stub().as('action');
        render(
          <Grid
            cellProps={{ focusMode: 'group' }}
            headerContent={column =>
              column.columnId === 'name' ? (
                <>
                  Name
                  <button id="first-action" onClick={action}>
                    Edit
                  </button>
                  <button id="second-action">More</button>
                </>
              ) : (
                column.renderHeaderCell()
              )
            }
          />,
          dir,
        );
        cy.get('#before').realClick();
        cy.realPress('Tab');
        cell().should('have.focus');
        cy.realPress('Enter');
        cy.get('#first-action').should('have.focus');
        cy.realPress('Enter');
        cy.get('@action').should('have.been.calledOnce');
        cy.realPress('Tab');
        cy.get('#second-action').should('have.focus');
        cy.realPress('Tab');
        cy.get('#first-action').should('have.focus');
        cy.realPress(['Shift', 'Tab']);
        cy.get('#second-action').should('have.focus');
        cy.realPress('Escape');
        cell().should('have.focus');
        audit(`${dir} group navigation`);
      });
    }
    it('R2.11 focusMode none routes entry into the only nested action without root tab stop', () => {
      const action = cy.stub().as('action');
      render(
        <Grid
          cellProps={{ focusMode: 'none' }}
          headerContent={column =>
            column.columnId === 'name' ? (
              <button id="single-action" onClick={action}>
                Open name
              </button>
            ) : (
              column.renderHeaderCell()
            )
          }
        />,
      );
      cell().should('not.have.attr', 'tabindex');
      cy.get('#before').realClick();
      cy.realPress('Tab');
      cy.get('#single-action').should('have.focus');
      cy.realPress('Space');
      cy.get('@action').should('have.been.calledOnce');
      audit('single nested action');
    });
    it('R2.12 native button slot gets browser keyboard activation and reset styles', () => {
      const sorted = cy.stub().as('sort');
      render(<Grid sortable onSortChange={sorted} cellProps={{ button: { as: 'button' } }} />, 'ltr', false);
      sortButton().should('have.prop', 'tagName', 'BUTTON').and('have.css', 'border-top-width', '0px').focus();
      cy.realPress('Enter');
      cell().should('have.attr', 'aria-sort', 'ascending');
      cy.realPress('Space');
      cell().should('have.attr', 'aria-sort', 'descending');
      cy.get('@sort').should('have.been.calledTwice');
      audit('native button slot');
    });
    it('R2.13 sorted selection grid does not select rows when invoking header sorting', () => {
      const selected = cy.stub().as('selection');
      render(<Grid sortable selectionMode="multiselect" onSelectionChange={selected} />);
      sortButton().realClick();
      cell().should('have.attr', 'aria-sort', 'ascending');
      cy.get('@selection').should('not.have.been.called');
      cy.get('.fui-DataGridBody input').each($input => expect($input).to.have.prop('checked', false));
      audit('sort versus selection');
    });
    it('R2.14 root focus blur and key callbacks receive the mounted element and native key', () => {
      const focused = cy.stub().as('focused');
      const blurred = cy.stub().as('blurred');
      const key = cy.stub().as('key');
      render(
        <Grid
          cellProps={{
            onFocus: (e: React.FocusEvent<HTMLElement>) => focused(e.currentTarget),
            onBlur: (e: React.FocusEvent<HTMLElement>) => blurred(e.currentTarget),
            onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => key(e.key, e.currentTarget),
          }}
        />,
      );
      cell().realClick();
      cy.realPress('Enter');
      cell().then($cell => {
        expect(focused).to.have.been.calledWithExactly($cell[0]);
        expect(key).to.have.been.calledWithExactly('Enter', $cell[0]);
      });
      cy.get('#after').realClick();
      cell().then($cell => expect(blurred).to.have.been.calledWithExactly($cell[0]));
      audit('event forwarding');
    });
  });
  for (const sortable of [false, true]) {
    it(`R1.02 grid sortable=${sortable} gates compare and default focus`, () => {
      render(<Grid sortable={sortable} />);
      cell().should($cell => expect($cell[0].getAttribute('tabindex')).to.equal(sortable ? null : '0'));
      cell()
        .find('[role="button"]')
        .should(sortable ? 'exist' : 'not.exist');
      cell('plain').should('have.attr', 'tabindex', '0').and('not.have.attr', 'aria-sort');
      cell('plain').find('[role="button"]').should('not.exist');
      audit('sortability defaults');
    });
  }
  for (const focusMode of ['cell', 'none', 'group'] as const) {
    for (const sortable of [false, true]) {
      it(`R1.03 focusMode=${focusMode} sortable=${sortable} overrides default root focus`, () => {
        render(<Grid sortable={sortable} cellProps={{ focusMode }} />);
        cell().should($cell => expect($cell[0].getAttribute('tabindex')).to.equal(focusMode === 'none' ? null : '0'));
        if (focusMode === 'group') {
          cell().then($cell => expect(JSON.parse($cell[0].getAttribute('data-tabster')!)).to.have.property('groupper'));
        }
        cell().realClick();
        if (focusMode === 'group') {
          cell().focus().should('have.focus');
        }
        audit('explicit focus mode');
      });
    }
  }
  it('R1.04 native th tag attributes and merged forwarded ref survive table layout', () => {
    const ref = React.createRef<HTMLDivElement>();
    const nativeProps = { scope: 'col', abbr: 'Nm', headers: 'group', colSpan: 2, rowSpan: 1 };
    render(
      <table aria-label="Native inventory">
        <thead>
          <tr>
            <th id="group" colSpan={2}>
              Group
            </th>
          </tr>
          <tr>
            <DataGridHeaderCell as="th" ref={ref} id="native" {...nativeProps}>
              Name
            </DataGridHeaderCell>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Alpha</td>
            <td>1</td>
          </tr>
        </tbody>
      </table>,
    );
    cy.get('#native')
      .should('have.prop', 'tagName', 'TH')
      .and('have.attr', 'abbr', 'Nm')
      .and('have.attr', 'headers', 'group')
      .and('have.attr', 'scope', 'col')
      .and('have.attr', 'colspan', '2')
      .and('have.css', 'display', 'table-cell')
      .then($cell => expect(ref.current).to.equal($cell[0]));
    cy.get('#native').should('not.have.attr', 'role');
    cy.get('#native').realClick().should('have.focus');
    audit('native table', 'table');
  });
  it('R1.05 div intrinsic filtering and root data aria class style forwarding', () => {
    render(
      <Grid
        cellProps={{
          as: 'div',
          className: 'authored',
          title: 'Header title',
          'aria-label': 'Inventory column',
          style: { color: 'rgb(1, 2, 3)' },
          ...{ abbr: 'Drop', headers: 'Drop' },
        }}
      />,
    );
    cell()
      .should('have.class', 'authored')
      .and('have.attr', 'title', 'Header title')
      .and('have.css', 'color', 'rgb(1, 2, 3)');
    cell().should($cell => {
      expect($cell[0].hasAttribute('abbr')).to.equal(false);
      expect($cell[0].hasAttribute('headers')).to.equal(false);
      expect(computeAccessibleName($cell[0])).to.equal('Inventory column');
    });
    audit('authored root');
  });
  it('R1.06 all slots retain authored and inherited static classes and DOM order', () => {
    render(
      <Grid
        sortable
        cellProps={{
          button: { className: 'button-custom', 'aria-label': 'Sort inventory' },
          sortIcon: { className: 'icon-custom', children: <span aria-hidden="true">Custom icon</span> },
          aside: { className: 'aside-custom', children: 'Aside' },
        }}
      />,
    );
    sortButton()
      .should('have.class', 'fui-TableHeaderCell__button')
      .and('have.class', 'button-custom')
      .then($button => expect(computeAccessibleName($button[0])).to.equal('Sort inventory'));
    cell()
      .find('.fui-DataGridHeaderCell__sortIcon')
      .should('have.class', 'fui-TableHeaderCell__sortIcon')
      .and('have.class', 'icon-custom');
    cell()
      .find('.fui-DataGridHeaderCell__aside')
      .should('have.class', 'fui-TableHeaderCell__aside')
      .and('have.class', 'aside-custom');
    cell().then($cell => {
      expect($cell[0].children).to.have.length(2);
      expect($cell[0].children[0]).to.equal($cell[0].querySelector('.fui-DataGridHeaderCell__button'));
      expect($cell[0].children[1]).to.equal($cell[0].querySelector('.fui-DataGridHeaderCell__aside'));
      expect($cell[0].children[0].lastElementChild).to.equal(
        $cell[0].querySelector('.fui-DataGridHeaderCell__sortIcon'),
      );
    });
    sortButton().realClick();
    cell().should('have.attr', 'aria-sort', 'ascending');
    audit('slot composition');
  });
  it('R1.07 null optional slots suppress context sort icon without suppressing sorting', () => {
    render(
      <Grid
        sortable
        defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
        cellProps={{ sortIcon: null, aside: null }}
      />,
    );
    cell().find('.fui-DataGridHeaderCell__sortIcon,.fui-DataGridHeaderCell__aside').should('not.exist');
    sortButton().realClick();
    cell().should('have.attr', 'aria-sort', 'descending');
    order(['Charlie', 'Bravo', 'Alpha']);
    audit('null optional slots');
  });
  for (const sortDirection of ['ascending', 'descending'] as const) {
    it(`R1.08 public sortDirection=${sortDirection} overrides context narration only`, () => {
      render(<Grid sortable cellProps={{ sortDirection }} />);
      cell()
        .should('have.attr', 'aria-sort', sortDirection)
        .find('.fui-DataGridHeaderCell__sortIcon svg')
        .should('exist');
      sortButton().realClick();
      cell().should('have.attr', 'aria-sort', sortDirection);
      order(['Alpha', 'Bravo', 'Charlie']);
      audit('explicit direction');
    });
  }
  it('R1.09 compare arity zero disables sorting even when function exists', () => {
    const onSortChange = cy.stub().as('sort');
    render(
      <Grid
        sortable
        columns={[
          createTableColumn<Item>({
            columnId: 'name',
            compare: () => 1,
            renderHeaderCell: () => 'Name',
            renderCell: item => item.name,
          }),
          columns[1],
        ]}
        onSortChange={onSortChange}
      />,
    );
    cell().should('have.attr', 'tabindex', '0').and('not.have.attr', 'aria-sort');
    cell().realClick();
    cy.realPress('Enter');
    cy.realPress('Space');
    cy.get('@sort').should('not.have.been.called');
    order(['Bravo', 'Alpha', 'Charlie']);
    audit('zero-arity comparator');
  });
  it('R1.10 column context IDs including zero select the matching sort callback', () => {
    const toggle = cy.stub().as('toggle');
    render(
      <TableContextProvider value={{ noNativeElements: true, size: 'medium', sortable: true }}>
        <DataGridContextProvider
          value={{
            ...dataGridContextDefaultValue,
            columns: [createTableColumn({ columnId: 0, compare: (a, b) => 1 })],
            sort: {
              ...dataGridContextDefaultValue.sort,
              toggleColumnSort: toggle,
              getSortDirection: () => 'descending',
            },
          }}
        >
          <ColumnIdContextProvider value={0}>
            <DataGridHeaderCell id="zero">Zero</DataGridHeaderCell>
          </ColumnIdContextProvider>
        </DataGridContextProvider>
      </TableContextProvider>,
    );
    cy.get('#zero').should('have.attr', 'aria-sort', 'descending').find('[role="button"]').realClick();
    cy.get('@toggle').should('have.been.calledOnce').its('firstCall.args.1').should('equal', 0);
  });
  it('R1.11 unknown column context is unsortable despite sortable table', () => {
    const toggle = cy.stub().as('toggle');
    render(
      <TableContextProvider value={{ noNativeElements: true, size: 'medium', sortable: true }}>
        <DataGridContextProvider
          value={{
            ...dataGridContextDefaultValue,
            columns,
            sort: { ...dataGridContextDefaultValue.sort, toggleColumnSort: toggle },
          }}
        >
          <ColumnIdContextProvider value="missing">
            <DataGridHeaderCell id="missing">Missing</DataGridHeaderCell>
          </ColumnIdContextProvider>
        </DataGridContextProvider>
      </TableContextProvider>,
    );
    cy.get('#missing').should('have.attr', 'tabindex', '0').and('not.have.attr', 'aria-sort');
    cy.get('#missing').realClick();
    cy.get('@toggle').should('not.have.been.called');
  });
});

const alignedWidth = (id: string, expected: number) => {
  cell(id).should($cell => expect(Number.parseFloat($cell[0].style.width)).to.be.closeTo(expected, 0.5));
  const index = columns.findIndex(column => column.columnId === id);
  cy.get('.fui-DataGridBody .fui-DataGridRow').each($row =>
    expect(
      Number.parseFloat($row[0].querySelectorAll<HTMLElement>('.fui-DataGridCell')[index].style.width),
    ).to.be.closeTo(expected, 0.5),
  );
};
const sizingOptions = {
  name: { defaultWidth: 180, minWidth: 100, idealWidth: 180 },
  value: { defaultWidth: 160, minWidth: 100, idealWidth: 160 },
  plain: { defaultWidth: 140, minWidth: 100, idealWidth: 140 },
};
const openResize = (id = 'name') => {
  cell(id).realClick({ button: 'right' });
  cy.contains('[role="menuitem"]', 'Keyboard Column Resizing').should('be.visible').realClick();
  cell(id).find('[role="separator"]').should('have.focus').and('have.attr', 'aria-hidden', 'false');
};
const Reconstructed = React.forwardRef<HTMLDivElement, DataGridHeaderCellProps>((props, ref) => {
  const state = useDataGridHeaderCell_unstable(props, ref);
  useDataGridHeaderCellStyles_unstable(state);
  return renderDataGridHeaderCell_unstable(state);
});

describeRound(3, 'component124 round 3: resize stable stories and strict accessibility', () => {
  for (const autoFitColumns of [true, false]) {
    for (const exit of ['Escape', 'Enter', 'Space'] as const) {
      it(`R3.01 autoFit=${autoFitColumns} keyboard resizing exact steps precision ${exit} exit focus and sort`, () => {
        const resized = cy.stub().as('resize');
        const changed = cy.stub().as('mode');
        render(
          <Grid
            sortable
            resizableColumns
            resizingMenu
            keyboardChange={changed}
            columnSizingOptions={sizingOptions}
            onColumnResize={resized}
            resizableColumnsOptions={{ autoFitColumns }}
            style={{ width: '600px' }}
          />,
          'ltr',
          false,
        );
        cy.get('.fui-DataGridHeaderCell [role="separator"]').should('have.length', autoFitColumns ? 2 : 3);
        cell().then($cell => {
          const width = Number.parseFloat($cell[0].style.width);
          openResize();
          cy.get('@mode').should('have.been.calledOnceWithExactly', 'name', true);
          audit('active resize');
          cy.realPress('ArrowRight');
          alignedWidth('name', width + 20);
          cy.get('@resize')
            .its('lastCall.args.1')
            .should('deep.equal', { columnId: 'name', width: width + 20 });
          cy.realPress(['Shift', 'ArrowLeft']);
          alignedWidth('name', width + 15);
          cell()
            .find('[role="separator"]')
            .should('have.attr', 'aria-valuetext', `${width + 15} pixels`);
          cy.realPress(exit);
          sortButton().should('have.focus');
          cell().find('[role="separator"]').should('have.attr', 'aria-hidden', 'true').and('not.have.attr', 'tabindex');
          cy.get('@mode').should('have.been.calledTwice').its('lastCall.args').should('deep.equal', ['name', false]);
          cell().should('have.attr', 'aria-sort', exit === 'Space' ? 'ascending' : 'none');
          cy.realPress('Enter');
          cell().should('have.attr', 'aria-sort', exit === 'Space' ? 'descending' : 'ascending');
          order(exit === 'Space' ? ['Charlie', 'Bravo', 'Alpha'] : ['Alpha', 'Bravo', 'Charlie']);
          audit('resized and exited');
        });
      });
    }
    it(`R3.02 autoFit=${autoFitColumns} native primary pointer drag updates callbacks and body without sorting`, () => {
      const sorted = cy.stub().as('sort');
      const resized = cy.stub().as('resize');
      const dragStart = cy.stub();
      render(
        <Grid
          sortable
          resizableColumns
          columnSizingOptions={sizingOptions}
          onSortChange={sorted}
          onColumnResize={resized}
          cellProps={{ onMouseDown: (event: React.MouseEvent<HTMLElement>) => dragStart(event.clientX) }}
          resizableColumnsOptions={{ autoFitColumns }}
          style={{ width: '600px' }}
        />,
        'ltr',
        false,
      );
      cell().then($cell => {
        const width = Number.parseFloat($cell[0].style.width);
        const handle = () => cell().find('[role="separator"]');
        handle().realMouseDown({ position: 'topLeft' });
        handle().realMouseMove(40, 0);
        cell().should('have.css', 'pointer-events', 'none');
        cy.get('@resize')
          .should('have.been.called')
          .then(() => {
            const [event, data] = resized.lastCall.args;
            expect(data.columnId).to.equal('name');
            expect(data.width).to.be.greaterThan(width + 30);
            expect(data.width).to.equal(width + event.clientX - dragStart.lastCall.args[0]);
            alignedWidth('name', data.width);
          });
        cy.get('body').realMouseUp();
        cell().should('have.css', 'pointer-events', 'auto').and('have.attr', 'aria-sort', 'none');
        cy.get('@sort').should('not.have.been.called');
        audit('pointer resize');
      });
    });
  }
  it('R3.03 RTL native keyboard resizing uses physical key deltas and restores focus', () => {
    render(
      <Grid
        sortable
        resizableColumns
        resizingMenu
        columnSizingOptions={sizingOptions}
        resizableColumnsOptions={{ autoFitColumns: false }}
      />,
      'rtl',
    );
    cell().then($cell => {
      const width = Number.parseFloat($cell[0].style.width);
      openResize();
      cy.realPress('ArrowRight');
      alignedWidth('name', width + 20);
      cy.realPress('ArrowLeft');
      alignedWidth('name', width);
      cy.realPress('Escape');
      sortButton().should('have.focus');
      audit('RTL resize');
    });
  });
  it('R3.04 keyboard min width clamps exactly and adjacent disabled auto-fit column stays unchanged', () => {
    render(
      <Grid
        sortable
        resizableColumns
        resizingMenu
        columnSizingOptions={sizingOptions}
        resizableColumnsOptions={{ autoFitColumns: false }}
      />,
    );
    openResize();
    for (let i = 0; i < 6; i++) {
      cy.realPress('ArrowLeft');
    }
    alignedWidth('name', 100);
    alignedWidth('value', 160);
    cell().find('[role="separator"]').should('have.attr', 'aria-valuetext', '100 pixels');
    cy.realPress('Escape');
    audit('minimum width');
  });
  it('R3.05 explicit style and aside override sizing injection without disabling body sizing', () => {
    render(
      <Grid
        resizableColumns
        columnSizingOptions={sizingOptions}
        resizableColumnsOptions={{ autoFitColumns: false }}
        cellProps={{
          style: { width: '90px', minWidth: '90px', maxWidth: '90px' },
          aside: <button id="custom-aside">Custom aside</button>,
        }}
      />,
    );
    cell().should('have.css', 'width', '90px');
    cell().find('[role="separator"]').should('not.exist');
    cy.get('#custom-aside').realClick();
    cy.get('.fui-DataGridBody .fui-DataGridRow')
      .first()
      .find('.fui-DataGridCell')
      .first()
      .should('have.css', 'width', '180px');
    audit('sizing prop precedence');
  });
  it('R3.06 owner columnSizingOptions update replaces widths without remount and preserves sorting', () => {
    const Owner = () => {
      const [wide, setWide] = React.useState(false);
      return (
        <>
          <button id="widen" onClick={() => setWide(true)}>
            Widen externally
          </button>
          <Grid
            sortable
            resizableColumns
            columnSizingOptions={{ ...sizingOptions, name: { ...sizingOptions.name, idealWidth: wide ? 240 : 180 } }}
            resizableColumnsOptions={{ autoFitColumns: false }}
          />
        </>
      );
    };
    render(<Owner />);
    sortButton().realClick();
    alignedWidth('name', 180);
    cy.get('#widen').realClick();
    alignedWidth('name', 240);
    cell().should('have.attr', 'aria-sort', 'ascending');
    order(['Alpha', 'Bravo', 'Charlie']);
    audit('controlled width update');
  });
  it('R3.07 context menu does not sort and Escape closes but non-tabstop trigger cannot restore focus', () => {
    const context = cy.stub().as('context');
    const sort = cy.stub().as('sort');
    render(
      <Grid
        sortable
        resizableColumns
        resizingMenu
        onSortChange={sort}
        cellProps={{
          onContextMenu: (event: React.MouseEvent<HTMLElement>) => context(event.type, event.currentTarget),
        }}
      />,
    );
    sortButton().focus().should('have.focus');
    cell().realClick({ button: 'right' });
    cy.get('[role="menu"]').should('be.visible');
    cy.get('@sort').should('not.have.been.called');
    cell().then($cell => expect(context).to.have.been.calledOnceWithExactly('contextmenu', $cell[0]));
    audit('open menu grid');
    audit('open context popover', '.fui-MenuPopover');
    cy.realPress('Escape');
    cy.get('[role="menu"]').should('not.exist');
    cell().should('not.have.attr', 'tabindex');
    cy.document().should(doc => expect(doc.activeElement).to.equal(doc.body));
    audit('closed menu');
  });
  it('R3.08 resize mode blur restores prior sortable button and deactivates separator', () => {
    render(<Grid sortable resizableColumns resizingMenu resizableColumnsOptions={{ autoFitColumns: false }} />);
    openResize();
    cy.get('#after').realClick();
    cell().find('[role="separator"]').should('have.attr', 'aria-hidden', 'true').and('not.have.attr', 'tabindex');
    sortButton().should('have.focus');
    audit('blur resize mode');
  });
  it('R3.09 public hook styles renderer reconstruction keeps slots and merged ref behavior', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <DataGrid items={items} columns={columns} aria-label="Reconstructed inventory">
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => <Reconstructed ref={ref}>{renderHeaderCell()}</Reconstructed>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<Item>>
          {({ item, rowId }) => (
            <DataGridRow<Item> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>,
    );
    cy.get('.fui-DataGridHeaderCell')
      .last()
      .then($cell => expect(ref.current).to.equal($cell[0]));
    cy.get('.fui-DataGridHeaderCell').first().realClick().should('have.focus');
    audit('reconstructed public hooks');
  });
  it(emptyScenario, () => {
    render(<Grid sortable items={[]} />);
    sortButton().realClick();
    cell().should('have.attr', 'aria-sort', 'ascending');
    audit('empty body strict incomplete');
  });
  it('R3.11 known-finding classifier rejects new rules wrong nodes duplicates and arbitrary hidden focusables', () => {
    render(<Grid sortable />);
    cy.get('#before').realClick();
    cy.realPress('Tab');
    sortButton().should('have.focus');
    cy.get('.fui-DataGrid').then(async $grid => {
      const scope = $grid[0];
      const result = await axe.run(scope);
      assertFindings(result, scope);
      expect(result.violations).to.have.length(1);
      const finding = result.violations[0];
      const node = finding.nodes[0];
      const reject = (violations: axe.Result[]) =>
        expect(() => assertFindings({ violations, incomplete: [] }, scope)).to.throw();
      reject([{ ...finding, id: 'button-name' }]);
      reject([finding, { ...finding, id: 'button-name' }]);
      reject([{ ...finding, nodes: [node, node] }]);
      reject([{ ...finding, nodes: [{ ...node, target: ['.fui-DataGridHeaderCell'] }] }]);
      reject([{ ...finding, nodes: [] }]);
      expect(() =>
        assertFindings({ violations: [], incomplete: [{ ...finding, id: 'color-contrast' }] }, scope),
      ).to.throw();
    });
  });
  const stableStories = [
    ['Default', Default, true],
    ['Sort', Sort, true],
    ['SortControlled', SortControlled, true],
    ['MultipleSelect', MultipleSelect, false],
    ['MultipleSelectControlled', MultipleSelectControlled, false],
    ['SingleSelect', SingleSelect, false],
    ['SingleSelectControlled', SingleSelectControlled, false],
    ['CompositeNavigation', CompositeNavigation, false],
    ['FocusableElementsInCells', FocusableElementsInCells, true],
    ['SubtleSelection', SubtleSelection, false],
    ['SelectionAppearance', SelectionAppearance, false],
    ['CustomRowId', CustomRowId, false],
    ['ResizableColumns', ResizableColumns, true],
    ['ResizableColumnsDisableAutoFit', ResizableColumnsDisableAutoFit, true],
  ] as const;
  for (const [name, Story, sortable] of stableStories) {
    it(`R3.12 stable ${name} consumes header cell with real activation focus and full-grid axe`, () => {
      render(
        <>
          <Story />
          <button id="story-after">After story</button>
        </>,
      );
      const file = () => cy.get('.fui-DataGridHeaderCell').filter(':contains("File")');
      if (sortable) {
        file().then($file => {
          const direction = $file.attr('aria-sort');
          file().find('[role="button"]').realClick();
          file().should('have.attr', 'aria-sort', direction === 'ascending' ? 'descending' : 'ascending');
        });
      } else {
        file().realClick().should('have.focus');
        cy.realPress('ArrowRight');
        cy.get('.fui-DataGridHeaderCell').filter(':contains("Author")').should('have.focus');
      }
      cy.get('.fui-DataGridHeaderCell').each($cell => {
        expect($cell).to.have.class('fui-TableHeaderCell');
        expect($cell[0].getAttribute('role')).to.equal('columnheader');
      });
      cy.get('#story-after').realClick().should('have.focus');
      audit(`stable consumer ${name}`);
    });
  }
  it('R3.13 stable FocusableElementsInCells author group opens menu and Escape returns through group', () => {
    render(<FocusableElementsInCells />);
    const author = () => cy.get('.fui-DataGridHeaderCell').filter(':contains("Author")');
    author().realClick().focus();
    cy.realPress('Enter');
    author().find('button[aria-label="Edit"]').should('have.focus');
    cy.realPress('Tab');
    author().find('button[aria-label="More options"]').should('have.focus');
    cy.realPress('Enter');
    cy.get('[role="menu"]').should('be.visible');
    audit('author menu open');
    audit('author popover open', '.fui-MenuPopover');
    cy.realPress('Escape');
    author().find('button[aria-label="More options"]').should('have.focus');
    cy.realPress('Escape');
    author().should('have.focus').and('not.have.attr', 'aria-sort');
    audit('author group closed');
  });
  it('R3.14 local virtualization recomposition preserves header sorting across native scrolling', () => {
    const virtualItems = Array.from({ length: 80 }, (_, index) => ({
      name: `Item ${String(index).padStart(2, '0')}`,
      value: index,
    }));
    const VirtualRows = ({ index, style, data }: Omit<ListChildComponentProps, 'data'> & { data: Item[] }) => (
      <DataGridRow<Item> key={data[index].name} data-virtual={data[index].value} style={style}>
        {({ renderCell }) => <DataGridCell>{renderCell(data[index])}</DataGridCell>}
      </DataGridRow>
    );
    const VirtualGrid = () => {
      const [descending, setDescending] = React.useState(false);
      const data = descending ? [...virtualItems].reverse() : virtualItems;
      return (
        <DataGrid
          items={virtualItems}
          columns={columns}
          sortable
          aria-label="Virtual inventory"
          sortState={{ sortColumn: 'name', sortDirection: descending ? 'descending' : 'ascending' }}
          onSortChange={(_e, state) => setDescending(state.sortDirection === 'descending')}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ columnId, renderHeaderCell }) => (
                <DataGridHeaderCell data-column={columnId}>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <div role="rowgroup" id="virtual-body">
            <FixedSizeList height={200} itemSize={40} itemCount={data.length} itemData={data} width={600}>
              {VirtualRows}
            </FixedSizeList>
          </div>
        </DataGrid>
      );
    };
    render(<VirtualGrid />);
    cy.get('[role="rowgroup"]').last().find('[role="row"]').first().should('contain.text', 'Item 00');
    sortButton().realClick();
    cy.get('[role="rowgroup"]').last().find('[role="row"]').first().should('contain.text', 'Item 79');
    cy.get('[role="rowgroup"]').last().children().realHover().realMouseWheel({ deltaY: 800 });
    cy.get('[role="rowgroup"]').last().find('[role="row"]').first().should('not.contain.text', 'Item 79');
    cy.get('[role="rowgroup"]').last().children().scrollTo(0, 800).should('have.prop', 'scrollTop', 800);
    cell().should('have.attr', 'aria-sort', 'descending');
    audit('local virtualized header');
  });
});

describeRound(4, 'component124 round 4: styling lifecycle and dynamic public contracts', () => {
  for (const size of ['small', 'medium', 'extra-small'] as const) {
    it(`R4.01 size=${size} preserves inherited header flex reset and minimum content height`, () => {
      render(<Grid sortable size={size} />);
      cell()
        .should('have.css', 'display', 'flex')
        .and('have.css', 'min-width', '0px')
        .and('have.css', 'position', 'relative')
        .and('have.css', 'padding-left', '8px')
        .and('have.css', 'font-weight', '400');
      sortButton()
        .should('have.css', 'display', 'flex')
        .and('have.css', 'min-height', '32px')
        .and('have.css', 'cursor', 'pointer')
        .and('have.css', 'border-top-width', '0px')
        .and('have.css', 'outline-style', 'none');
      sortButton().realClick();
      cell()
        .find('.fui-DataGridHeaderCell__sortIcon')
        .should('have.css', 'display', 'flex')
        .and('have.css', 'padding-top', '2px');
      audit(`size ${size}`);
    });
  }
  it('R4.02 sortable hover uses inherited subtle hover background and pointer exit restores it', () => {
    render(<Grid sortable />);
    cell().then($cell => {
      const resting = getComputedStyle($cell[0]).backgroundColor;
      sortButton().realHover();
      cell().should('have.css', 'background-color', 'rgb(245, 245, 245)');
      cy.get('#after').realHover();
      cell().should('have.css', 'background-color', resting);
    });
    audit('interactive styling');
  });
  it('R4.03 provider custom style hook augments slots without losing authored classes sorting and refs', () => {
    const useStyles = makeStyles({ root: { paddingLeft: '14px' }, button: { columnGap: '10px' } });
    const useOverride = (state: unknown) => {
      const styles = useStyles();
      if (!state || typeof state !== 'object' || !('root' in state) || !('button' in state)) {
        throw new Error('Header style hook requires root and button slots');
      }
      const { root, button } = state;
      if (
        !root ||
        typeof root !== 'object' ||
        !('className' in root) ||
        typeof root.className !== 'string' ||
        !button ||
        typeof button !== 'object' ||
        !('className' in button) ||
        typeof button.className !== 'string'
      ) {
        throw new Error('Header style hook requires styled root and button slot objects');
      }
      // Public style hooks mutate resolved slot state before rendering.
      root.className = mergeClasses(root.className, styles.root);
      button.className = mergeClasses(button.className, styles.button);
    };
    const hook = 'useDataGridHeaderCellStyles_unstable';
    const ref = React.createRef<HTMLDivElement>();
    render(
      <FluentProvider customStyleHooks_unstable={{ [hook]: useOverride }}>
        <Grid sortable cellRef={ref} cellProps={{ className: 'authored-cell' }} />
      </FluentProvider>,
    );
    cell()
      .should('have.class', 'authored-cell')
      .and('have.class', 'fui-TableHeaderCell')
      .and('have.css', 'padding-left', '14px')
      .then($cell => expect(ref.current).to.equal($cell[0]));
    sortButton().should('have.css', 'column-gap', '10px').realClick();
    cell().should('have.attr', 'aria-sort', 'ascending');
    audit('custom style hook');
  });
  it('R4.04 callback ref detaches on unmount and remount creates a live header cell', () => {
    let current: HTMLDivElement | null = null;
    let first: Element;
    const ref = (element: HTMLDivElement | null) => {
      current = element;
    };
    const Owner = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="toggle-grid" onClick={() => setVisible(value => !value)}>
            Toggle grid
          </button>
          {visible && <Grid sortable cellRef={ref} />}
        </>
      );
    };
    render(<Owner />);
    cell().then($cell => {
      first = $cell[0];
      expect(current).to.equal(first);
    });
    cy.get('#toggle-grid').realClick();
    cy.get('.fui-DataGridHeaderCell')
      .should('not.exist')
      .then(() => expect(current).to.equal(null));
    cy.get('#toggle-grid').realClick();
    cell().then($cell => {
      expect(current).to.equal($cell[0]);
      expect(current).not.to.equal(first);
    });
    sortButton().realClick();
    cell().should('have.attr', 'aria-sort', 'ascending');
    audit('ref lifecycle');
  });
  it('R4.05 author tabIndex overrides focusMode default without changing nested sort button focus', () => {
    render(<Grid sortable cellProps={{ focusMode: 'cell', tabIndex: -1 }} />);
    cell().should('have.attr', 'tabindex', '-1');
    cy.get('#before').realClick();
    cy.realPress('Tab');
    sortButton().should('have.focus');
    cy.realPress('Enter');
    cell().should('have.attr', 'aria-sort', 'ascending');
    audit('explicit root tabIndex');
  });
  it('R4.06 dynamic compare removal and restoration updates default focus and sort narration without remount', () => {
    let initial: Element;
    const Owner = () => {
      const [enabled, setEnabled] = React.useState(true);
      const definitions = [
        createTableColumn<Item>({
          columnId: 'name',
          compare: enabled ? (a, b) => a.name.localeCompare(b.name) : () => 0,
          renderHeaderCell: () => 'Name',
          renderCell: item => item.name,
        }),
        columns[1],
        columns[2],
      ];
      return (
        <>
          <button id="compare-toggle" onClick={() => setEnabled(value => !value)}>
            Toggle comparator
          </button>
          <Grid sortable columns={definitions} />
        </>
      );
    };
    render(<Owner />);
    sortButton().realClick();
    cell().then($cell => {
      initial = $cell[0];
    });
    cy.get('#compare-toggle').realClick();
    cell().should('have.attr', 'tabindex', '0').and('not.have.attr', 'aria-sort');
    cell().find('[role="button"]').should('not.exist');
    cell()
      .realClick()
      .then($cell => expect($cell[0]).to.equal(initial));
    order(['Bravo', 'Alpha', 'Charlie']);
    cy.get('#compare-toggle').realClick();
    cell().should('have.attr', 'aria-sort', 'ascending');
    order(['Alpha', 'Bravo', 'Charlie']);
    audit('dynamic comparator');
  });
  it('R4.07 context-menu preventDefault suppresses MenuTrigger composition without sorting', () => {
    const context = cy.stub().as('context');
    const sort = cy.stub().as('sort');
    render(
      <Grid
        sortable
        resizableColumns
        resizingMenu
        onSortChange={sort}
        cellProps={{
          onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
            event.preventDefault();
            context(event.currentTarget);
          },
        }}
      />,
    );
    cell().realClick({ button: 'right' });
    cy.get('[role="menu"]').should('not.exist');
    cy.get('@context').should('have.been.calledOnce');
    cy.get('@sort').should('not.have.been.called');
    audit('prevented context menu');
  });
  it('R4.08 secondary resize-handle pointer is ignored and does not begin drag', () => {
    const resize = cy.stub().as('resize');
    render(
      <Grid
        sortable
        resizableColumns
        columnSizingOptions={sizingOptions}
        onColumnResize={resize}
        resizableColumnsOptions={{ autoFitColumns: false }}
      />,
    );
    cell().find('[role="separator"]').realMouseDown({ button: 'right' });
    cell().find('[role="separator"]').realMouseMove(40, 0);
    cy.get('body').realMouseUp({ button: 'right' });
    alignedWidth('name', 180);
    cell().should('have.css', 'pointer-events', 'auto').and('have.attr', 'aria-sort', 'none');
    cy.get('@resize').should('not.have.been.called');
    audit('non-primary resize');
  });
  it('R4.09 StrictMode duplicate uncontrolled sort callbacks represent one DOM state transition', () => {
    const sort = cy.stub().as('sort');
    const requests: Parameters<NonNullable<DataGridProps['onSortChange']>>[1][] = [];
    render(
      <Grid
        sortable
        defaultSortState={{ sortColumn: 'name', sortDirection: 'ascending' }}
        onSortChange={(_event, state) => {
          requests.push({ ...state });
          sort(state);
        }}
      />,
    );
    sortButton().realClick();
    cy.get('@sort').should('have.been.calledTwice');
    cy.get('@sort').its('firstCall.args.0').should('deep.equal', { sortColumn: 'name', sortDirection: 'descending' });
    cy.get('@sort').its('lastCall.args.0').should('deep.equal', { sortColumn: 'name', sortDirection: 'descending' });
    cell().should('have.attr', 'aria-sort', 'descending');
    order(['Charlie', 'Bravo', 'Alpha']);
    audit('StrictMode sort baseline', '.fui-DataGrid', { mode: 'uncontrolled', strictMode: true, requests });
  });
  it('R4.10 native th with context sorting retains button Enter Space activation', () => {
    const toggle = cy.stub().as('toggle');
    render(
      <TableContextProvider value={{ noNativeElements: false, size: 'medium', sortable: true }}>
        <DataGridContextProvider
          value={{
            ...dataGridContextDefaultValue,
            columns,
            sort: {
              ...dataGridContextDefaultValue.sort,
              toggleColumnSort: toggle,
              getSortDirection: () => 'ascending',
            },
          }}
        >
          <ColumnIdContextProvider value="name">
            <table aria-label="Native sortable inventory">
              <thead>
                <tr>
                  <DataGridHeaderCell as="th" id="native-sort">
                    Name
                  </DataGridHeaderCell>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Alpha</td>
                </tr>
              </tbody>
            </table>
          </ColumnIdContextProvider>
        </DataGridContextProvider>
      </TableContextProvider>,
    );
    cy.get('#native-sort')
      .should('have.prop', 'tagName', 'TH')
      .and('have.attr', 'aria-sort', 'ascending')
      .find('[role="button"]')
      .focus();
    cy.realPress('Enter');
    cy.realPress('Space');
    cy.get('@toggle').should('have.been.calledTwice');
    cy.get('@toggle').its('firstCall.args.1').should('equal', 'name');
    audit('native sorting table', 'table');
  });
});

describeRound(5, 'component124 fresh documented scenarios', () => {
  for (const [name, theme] of [
    ['light', webLightTheme],
    ['dark', webDarkTheme],
  ] as const) {
    it(`R5.01 ${name} theme supplies live header hover tokens and preserves native sorting`, () => {
      const Owner = () => {
        const [alternate, setAlternate] = React.useState(false);
        return (
          <FluentProvider theme={alternate ? (name === 'light' ? webDarkTheme : webLightTheme) : theme}>
            <button id="theme-change" onClick={() => setAlternate(true)}>
              Change theme
            </button>
            <Grid sortable />
          </FluentProvider>
        );
      };
      render(<Owner />);
      sortButton().realHover();
      cell().should('have.css', 'background-color', name === 'light' ? 'rgb(245, 245, 245)' : 'rgb(56, 56, 56)');
      sortButton().realClick();
      cell().should('have.attr', 'aria-sort', 'ascending');
      order(['Alpha', 'Bravo', 'Charlie']);
      cy.get('#theme-change').realClick();
      sortButton().realHover();
      cell().should('have.css', 'background-color', name === 'light' ? 'rgb(56, 56, 56)' : 'rgb(245, 245, 245)');
      sortButton().realClick();
      cell().should('have.attr', 'aria-sort', 'descending');
      order(['Charlie', 'Bravo', 'Alpha']);
      cy.get('#after').realHover();
      audit(`live ${name} theme`);
    });
  }
  it('R5.02 custom row IDs preserve existing selected data through ascending and descending header sorts', () => {
    const selection = cy.stub().as('selection');
    render(
      <Grid
        sortable
        selectionMode="multiselect"
        getRowId={item => item.name}
        defaultSelectedItems={new Set(['Bravo'])}
        onSelectionChange={selection}
      />,
    );
    const checked = () =>
      cy.get('.fui-DataGridBody input:checked').should('have.length', 1).and('have.attr', 'aria-label', 'Select Bravo');
    checked();
    sortButton().realClick();
    order(['Alpha', 'Bravo', 'Charlie']);
    checked();
    sortButton().realClick();
    order(['Charlie', 'Bravo', 'Alpha']);
    checked();
    cy.get('@selection').should('not.have.been.called');
    audit('selected custom ID survives sorting');
  });
  it('R5.03 external owner updates labelledby descriptions data attributes and content on the same root', () => {
    let initial: Element;
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <h2 id="grid-label">{updated ? 'Updated inventory' : 'Original inventory'}</h2>
          <span id="header-description">{updated ? 'Updated description' : 'Original description'}</span>
          <button id="update-label" onClick={() => setUpdated(true)}>
            Update accessible labels
          </button>
          <Grid
            sortable
            aria-label={undefined}
            aria-labelledby="grid-label"
            cellProps={{
              'aria-describedby': 'header-description',
              ...{ 'data-owner': updated ? 'updated' : 'original' },
            }}
            headerContent={column =>
              column.columnId === 'name' ? (updated ? 'Updated name' : 'Name') : column.renderHeaderCell()
            }
          />
        </>
      );
    };
    render(<Owner />);
    cell().then($cell => {
      initial = $cell[0];
      expect(computeAccessibleName($cell[0])).to.equal('Name');
    });
    cy.get('#update-label').realClick();
    cy.get('.fui-DataGrid').then($grid => expect(computeAccessibleName($grid[0])).to.equal('Updated inventory'));
    cell()
      .should('have.attr', 'data-owner', 'updated')
      .and('have.attr', 'aria-describedby', 'header-description')
      .then($cell => {
        expect($cell[0]).to.equal(initial);
        expect(computeAccessibleName($cell[0])).to.equal('Updated name');
        expect(computeAccessibleDescription($cell[0])).to.equal('Updated description');
      });
    sortButton().realClick();
    cell().should('have.attr', 'aria-sort', 'ascending');
    audit('live accessible owner props');
  });
});

describeRound(6, 'component124 fresh undocumented event and accessibility edges', () => {
  for (const activation of ['pointer', 'Enter', 'Space'] as const) {
    it(`R6.01 ${activation} controlled request preserves event identity slot-sort-root order and native trust`, () => {
      const calls: {
        phase: 'slot' | 'sort' | 'root';
        event: React.SyntheticEvent;
        target: EventTarget;
        currentTarget: EventTarget;
        trusted: boolean;
        prevented: boolean;
      }[] = [];
      const keys: { key: string; trusted: boolean }[] = [];
      const requestedStates: Parameters<NonNullable<DataGridProps['onSortChange']>>[1][] = [];
      const record = (phase: 'slot' | 'sort' | 'root', event: React.SyntheticEvent) =>
        calls.push({
          phase,
          event,
          target: event.target,
          currentTarget: event.currentTarget,
          trusted: event.nativeEvent.isTrusted,
          prevented: event.defaultPrevented,
        });
      render(
        <Grid
          sortable
          sortState={{ sortColumn: undefined, sortDirection: 'ascending' }}
          onSortChange={(event, state) => {
            record('sort', event);
            requestedStates.push(state);
          }}
          cellProps={{
            button: { onClick: (event: React.MouseEvent<HTMLElement>) => record('slot', event) },
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              event.preventDefault();
              record('root', event);
            },
            onKeyDown: (event: React.KeyboardEvent<HTMLElement>) =>
              keys.push({ key: event.key, trusted: event.nativeEvent.isTrusted }),
          }}
        />,
        'ltr',
        false,
      );
      if (activation === 'pointer') {
        sortButton().realClick();
      } else {
        sortButton().focus();
        cy.realPress(activation);
      }
      cell()
        .should('have.attr', 'aria-sort', 'none')
        .then($cell => {
          const button = $cell[0].querySelector('.fui-DataGridHeaderCell__button');
          expect(calls.map(call => call.phase)).to.deep.equal(['slot', 'sort', 'root']);
          expect(calls.map(call => call.currentTarget)).to.deep.equal([button, $cell[0], $cell[0]]);
          expect(calls.map(call => call.target)).to.deep.equal([button, button, button]);
          expect(calls[0].event).to.equal(calls[1].event).and.to.equal(calls[2].event);
          expect(calls.map(call => call.prevented)).to.deep.equal([false, false, true]);
          expect(calls.map(call => call.trusted)).to.deep.equal(Array(3).fill(activation === 'pointer'));
          expect(requestedStates).to.deep.equal([{ sortColumn: 'name', sortDirection: 'ascending' }]);
          expect(keys).to.deep.equal(
            activation === 'pointer' ? [] : [{ key: activation === 'Space' ? ' ' : 'Enter', trusted: true }],
          );
        });
      order(['Bravo', 'Alpha', 'Charlie']);
      audit(`${activation} controlled event identity`);
    });
  }
});

describeRound(7, 'component124 fresh unit-derived context integration', () => {
  it('R7.01 context layout changes preserve explicit native tag attributes and root identity', () => {
    let initial: Element;
    const nativeProps = { scope: 'col', abbr: 'Nm', headers: 'native-group' };
    const Owner = () => {
      const [flex, setFlex] = React.useState(false);
      return (
        <>
          <button id="change-layout" onClick={() => setFlex(true)}>
            Change context layout
          </button>
          <TableContextProvider value={{ noNativeElements: flex, size: 'medium', sortable: false }}>
            <table aria-label="Native layout inventory">
              <thead>
                <tr>
                  <th id="native-group">Group</th>
                </tr>
                <tr>
                  <DataGridHeaderCell as="th" id="context-native" {...nativeProps}>
                    Name
                  </DataGridHeaderCell>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Alpha</td>
                </tr>
              </tbody>
            </table>
          </TableContextProvider>
        </>
      );
    };
    render(<Owner />);
    cy.get('#context-native')
      .should('have.css', 'display', 'table-cell')
      .then($cell => {
        initial = $cell[0];
      });
    cy.get('#change-layout').realClick();
    cy.get('#context-native')
      .should('have.prop', 'tagName', 'TH')
      .and('have.css', 'display', 'flex')
      .and('have.attr', 'abbr', 'Nm')
      .and('have.attr', 'headers', 'native-group')
      .and('have.attr', 'scope', 'col')
      .and('not.have.attr', 'role');
    cy.get('#context-native').then($cell => expect($cell[0]).to.equal(initial));
    audit('context-owned native layout', 'table');
  });
  it('R7.02 column reorder removal and restoration keep surviving identity and context sort state', () => {
    let initialName: Element;
    let initialValue: Element;
    const sorted = cy.stub().as('sorted');
    const Owner = () => {
      const [phase, setPhase] = React.useState(0);
      const definitions =
        phase === 1 ? [columns[1], columns[0], columns[2]] : phase === 2 ? [columns[1], columns[2]] : columns;
      return (
        <>
          <button id="change-columns" onClick={() => setPhase(value => value + 1)}>
            Change columns
          </button>
          <Grid sortable columns={definitions} onSortChange={sorted} />
        </>
      );
    };
    render(<Owner />, 'ltr', false);
    sortButton().realClick();
    cell().then($cell => {
      initialName = $cell[0];
    });
    cell('value').then($cell => {
      initialValue = $cell[0];
    });
    cy.get('#change-columns').realClick();
    cy.get('.fui-DataGridHeaderCell').should($cells =>
      expect(Array.from($cells, node => node.getAttribute('data-column'))).to.deep.equal(['value', 'name', 'plain']),
    );
    cell()
      .should('have.attr', 'aria-sort', 'ascending')
      .then($cell => expect($cell[0]).to.equal(initialName));
    cy.get('.fui-DataGridBody .fui-DataGridRow')
      .first()
      .find('.fui-DataGridCell')
      .should($cells =>
        expect(Array.from($cells, node => node.textContent)).to.deep.equal(['3', 'Alpha', 'Read only']),
      );
    cy.get('#change-columns').realClick();
    cell().should('not.exist');
    cy.get('.fui-DataGridHeaderCell').should('have.length', 2);
    cell('value').then($cell => expect($cell[0]).to.equal(initialValue));
    cy.get('.fui-DataGridBody .fui-DataGridRow')
      .first()
      .find('.fui-DataGridCell')
      .should($cells => expect(Array.from($cells, node => node.textContent)).to.deep.equal(['2', 'Read only']));
    cy.get('#change-columns').realClick();
    cell()
      .should('have.attr', 'aria-sort', 'ascending')
      .then($cell => expect($cell[0]).not.to.equal(initialName));
    cell('value').then($cell => expect($cell[0]).to.equal(initialValue));
    order(['Alpha', 'Bravo', 'Charlie']);
    cy.get('@sorted').should('have.been.calledOnce');
    audit('dynamic column context');
  });
  it('R7.03 live resizing context removes and reinstates handles widths without resetting sorting or root', () => {
    let initial: Element;
    const Owner = () => {
      const [enabled, setEnabled] = React.useState(true);
      return (
        <>
          <button id="toggle-resizing" onClick={() => setEnabled(value => !value)}>
            Toggle resizing
          </button>
          <Grid
            sortable
            resizableColumns={enabled}
            columnSizingOptions={sizingOptions}
            resizableColumnsOptions={{ autoFitColumns: false }}
          />
        </>
      );
    };
    render(<Owner />);
    alignedWidth('name', 180);
    cell().then($cell => {
      initial = $cell[0];
    });
    cy.get('.fui-DataGridHeaderCell [role="separator"]').should('have.length', 3);
    sortButton().realClick();
    cy.get('#toggle-resizing').realClick();
    cell()
      .should('have.attr', 'aria-sort', 'ascending')
      .then($cell => {
        expect($cell[0]).to.equal(initial);
        expect($cell[0].style.width).to.equal('');
      });
    cy.get('.fui-DataGridHeaderCell [role="separator"]').should('not.exist');
    cy.get('.fui-DataGridBody .fui-DataGridCell').each($cell => expect($cell[0].style.width).to.equal(''));
    order(['Alpha', 'Bravo', 'Charlie']);
    audit('resizing context disabled');
    cy.get('#toggle-resizing').realClick();
    alignedWidth('name', 180);
    cy.get('.fui-DataGridHeaderCell [role="separator"]').should('have.length', 3);
    cell()
      .should('have.attr', 'aria-sort', 'ascending')
      .then($cell => expect($cell[0]).to.equal(initial));
    order(['Alpha', 'Bravo', 'Charlie']);
    audit('resizing context restored');
  });
});
