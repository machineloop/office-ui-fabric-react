import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import * as axe from 'axe-core';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { TableRow } from './TableRow';
import type { TableRowProps, TableRowSlots } from './TableRow.types';
import { Table } from '../Table/Table';
import { TableHeader } from '../TableHeader/TableHeader';
import { TableBody } from '../TableBody/TableBody';
import { TableCell } from '../TableCell/TableCell';
import { TableHeaderCell } from '../TableHeaderCell/TableHeaderCell';
import { TableSelectionCell } from '../TableSelectionCell/TableSelectionCell';
import { TableCellActions } from '../TableCellActions/TableCellActions';
import { TableCellLayout } from '../TableCellLayout/TableCellLayout';
import { TableContextProvider, tableContextDefaultValue } from '../../contexts/tableContext';

const row = '[data-testid="row"]';
const modes = [false, true] as const;
const directions = ['ltr', 'rtl'] as const;
const appearances = ['none', 'brand', 'neutral'] as const;
const sizes = [
  { size: 'medium', height: 44 },
  { size: 'small', height: 34 },
  { size: 'extra-small', height: 24 },
] as const;

const Fixture = ({
  noNativeElements = false,
  size = 'medium',
  rowProps = {},
  children,
}: {
  noNativeElements?: boolean;
  size?: 'medium' | 'small' | 'extra-small';
  rowProps?: React.ComponentProps<typeof TableRow>;
  children?: TableRowProps['children'];
}) => {
  return (
    <Table noNativeElements={noNativeElements} size={size} aria-label="Files" style={{ width: 480 }}>
      <TableHeader>
        <TableRow data-testid="header">
          <TableHeaderCell id="file-header">File</TableHeaderCell>
          <TableHeaderCell id="owner-header">Owner</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow data-testid="row" {...rowProps}>
          {children ?? rowProps.children ?? (
            <>
              <TableCell data-testid="file" headers="file-header">
                Report
              </TableCell>
              <TableCell data-testid="owner" headers="owner-header">
                Ada
              </TableCell>
            </>
          )}
        </TableRow>
        <TableRow data-testid="sibling">
          <TableCell>Notes</TableCell>
          <TableCell>Grace</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

function render(content: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <button data-testid="before">Before</button>
      {content}
      <button data-testid="after">After</button>
    </FluentProvider>,
  ).then(() => cy.get('[data-testid="before"]').realHover());
}

function colorToken(
  selector: string,
  property: string,
  token:
    | 'colorBrandBackground2'
    | 'colorSubtleBackgroundSelected'
    | 'colorSubtleBackgroundHover'
    | 'colorSubtleBackgroundPressed'
    | 'colorNeutralForeground1Hover'
    | 'colorNeutralForeground1'
    | 'colorNeutralForeground1Pressed',
) {
  cy.get(selector).should(
    'have.css',
    property,
    `rgb(${teamsLightTheme[token]
      .slice(1)
      .match(/../g)!
      .map(hex => parseInt(hex, 16))
      .join(', ')})`,
  );
}

const Selection = ({ mode, noNativeElements }: { mode: 'single' | 'multiple'; noNativeElements: boolean }) => {
  const [selected, setSelected] = React.useState<string[]>(['a']);
  const [order, setOrder] = React.useState(['a', 'b']);
  const toggle = (id: string) =>
    setSelected(previous =>
      previous.includes(id) ? previous.filter(item => item !== id) : mode === 'single' ? [id] : [...previous, id],
    );
  return (
    <>
      <button data-testid="reorder" onClick={() => setOrder(previous => [...previous].reverse())}>
        Reverse
      </button>
      <Table
        noNativeElements={noNativeElements}
        role="grid"
        aria-label="Selectable files"
        aria-multiselectable={mode === 'multiple'}
      >
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Selection</TableHeaderCell>
            <TableHeaderCell>File</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.map(id => (
            <TableRow
              key={id}
              data-testid={id}
              tabIndex={0}
              aria-selected={selected.includes(id)}
              appearance={selected.includes(id) ? 'brand' : 'none'}
              onClick={() => toggle(id)}
              onKeyDown={event => {
                if (event.key === ' ') {
                  event.preventDefault();
                  toggle(id);
                }
              }}
            >
              <TableSelectionCell
                role="gridcell"
                type={mode === 'single' ? 'radio' : 'checkbox'}
                checked={selected.includes(id)}
                checkboxIndicator={{ 'aria-label': `Select ${id}` }}
                radioIndicator={{ 'aria-label': `Select ${id}` }}
              />
              <TableCell role="gridcell">{id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

describe('TableRow documented scenarios', () => {
  for (const noNativeElements of modes) {
    it(`renders semantic row, sibling cells and header (${noNativeElements ? 'ARIA' : 'native'})`, () => {
      render(<Fixture noNativeElements={noNativeElements} />);
      cy.get(row)
        .should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TR')
        .and('have.class', 'fui-TableRow')
        .and('have.css', 'display', noNativeElements ? 'flex' : 'table-row');
      cy.get(row).children().should('have.length', 2);
      cy.get(row).find('.fui-TableCell').should('have.length', 2);
      if (noNativeElements) {
        cy.get(row).should('have.attr', 'role', 'row');
        cy.get(row).children().should('have.attr', 'role', 'cell');
      } else {
        cy.get(row).should('not.have.attr', 'role');
        cy.get(row).parent().should('have.prop', 'tagName', 'TBODY');
        cy.get('[data-testid="header"]').parent().should('have.prop', 'tagName', 'THEAD');
        cy.get('[data-testid="file"]').should('have.attr', 'headers', 'file-header');
      }
    });
  }
});

describe('TableRow contract boundaries and finite content cases', () => {
  for (const noNativeElements of modes) {
    it(`does not equate aria-selected, checked or appearance (${noNativeElements ? 'div' : 'tr'})`, () => {
      const click = cy.stub().as('selectionClick');
      render(
        <Fixture
          noNativeElements={noNativeElements}
          rowProps={{ 'aria-selected': true, appearance: 'none', onClick: click }}
        >
          <TableSelectionCell checked={false} checkboxIndicator={{ 'aria-label': 'Select report' }} />
          <TableCell>Report</TableCell>
        </Fixture>,
      );
      cy.get(row).should('have.attr', 'aria-selected', 'true').and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      cy.get(row).find('input').should('not.be.checked').click();
      cy.get('@selectionClick').should('have.been.calledOnce');
      cy.get(row).find('input').should('not.be.checked');
      cy.get(row).should('have.attr', 'aria-selected', 'true');
    });
    it(`bubbles exactly one pointer event from an indicator into consumer-owned selection (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const callback = cy.stub().as('toggle');
      const Consumer = () => {
        const [selected, setSelected] = React.useState(false);
        return (
          <Fixture
            noNativeElements={noNativeElements}
            rowProps={{
              'aria-selected': selected,
              appearance: selected ? 'neutral' : 'none',
              onClick: () => {
                callback();
                setSelected(previous => !previous);
              },
            }}
          >
            <TableSelectionCell checked={selected} checkboxIndicator={{ 'aria-label': 'Select report' }} />
            <TableCell>Report</TableCell>
          </Fixture>
        );
      };
      render(<Consumer />);
      cy.get(row).find('input').click();
      cy.get('@toggle').should('have.been.calledOnce');
      cy.get(row).should('have.attr', 'aria-selected', 'true').find('input').should('be.checked');
      cy.get(row).find('input').click();
      cy.get('@toggle').should('have.been.calledTwice');
      cy.get(row).should('have.attr', 'aria-selected', 'false').find('input').should('not.be.checked');
    });
    it(`preserves empty and mixed cell content without adding wrappers (${noNativeElements ? 'div' : 'tr'})`, () => {
      render(
        <Table noNativeElements={noNativeElements} aria-label="Content cases">
          <TableBody>
            <TableRow data-testid="empty" />
            <TableRow data-testid="row">
              <TableCell>
                {0}
                {null}
                {false}
                <strong> report</strong>
                {[' one', ' two']}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>,
      );
      cy.get('[data-testid="empty"]').children().should('have.length', 0);
      cy.get(row).children().should('have.length', 2).first().should('have.text', '0 report one two');
      cy.get(row).find('strong').should('have.length', 1).and('have.text', ' report');
      cy.get(row).children().last().should('be.empty');
      cy.get(row).should('not.have.attr', 'tabindex');
      cy.get(row).should('not.have.attr', 'aria-selected');
    });
    it(`delivers user pointer, focus and blur callbacks once per transition (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const enter = cy.stub().as('enter');
      const leave = cy.stub().as('leave');
      const focus = cy.stub().as('focus');
      const blur = cy.stub().as('blur');
      render(
        <Fixture
          noNativeElements={noNativeElements}
          rowProps={{
            tabIndex: 0,
            onMouseEnter: enter,
            onMouseLeave: leave,
            onFocus: focus,
            onBlur: blur,
          }}
        />,
      );
      cy.get(row).realHover();
      cy.get('@enter').should('have.been.calledOnce');
      cy.get('[data-testid="before"]').realHover();
      cy.get('@leave').should('have.been.calledOnce');
      cy.get(row).focus();
      cy.get('@focus').should('have.been.calledOnce');
      cy.get('[data-testid="after"]').focus();
      cy.get('@blur').should('have.been.calledOnce');
      cy.then(() => {
        expect(focus.firstCall.args[0].type).to.equal('focus');
        expect(blur.firstCall.args[0].type).to.equal('blur');
      });
    });
    it(`retains header context through nested table body rather than resetting it (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      render(
        <Table noNativeElements={noNativeElements} aria-label="Outer header context">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>
                <Table noNativeElements={noNativeElements} aria-label="Nested header table">
                  <TableBody>
                    <TableRow data-testid="row">
                      <TableCell>Nested body row</TableCell>
                      <TableCell>Owner</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableHeaderCell>
              <TableHeaderCell>Outer owner</TableHeaderCell>
            </TableRow>
          </TableHeader>
        </Table>,
      );
      cy.get(row).realHover();
      cy.get(row).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
    });
  }
});

const Grid = ({
  noNativeElements,
  cells = false,
  navigationEnabled = true,
}: {
  noNativeElements: boolean;
  cells?: boolean;
  navigationEnabled?: boolean;
}) => {
  const navigation = useArrowNavigationGroup({ axis: cells ? 'grid' : 'vertical' });
  return (
    <Table
      {...(navigationEnabled ? navigation : {})}
      noNativeElements={noNativeElements}
      role="grid"
      aria-labelledby="grid-name"
      style={{ width: 480 }}
    >
      <TableHeader>
        <TableRow>
          <TableHeaderCell id="grid-file">File</TableHeaderCell>
          <TableHeaderCell id="grid-owner">Owner</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {['a', 'b'].map(id => (
          <TableRow key={id} data-testid={`grid-${id}`} tabIndex={cells ? undefined : 0} aria-selected={id === 'a'}>
            <TableCell
              role="rowheader"
              aria-labelledby="grid-file"
              tabIndex={cells ? 0 : undefined}
              data-testid={`${id}-file`}
            >
              {id === 'a' ? 'Report' : 'Notes'}
            </TableCell>
            <TableCell
              role="gridcell"
              aria-labelledby="grid-owner"
              tabIndex={cells ? 0 : undefined}
              data-testid={`${id}-owner`}
            >
              {id === 'a' ? 'Ada' : 'Grace'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

describe('TableRow edges and accessibility', () => {
  it('documents and guards known external mover accessibility violations in a div grid', () => {
    render(
      <>
        <h2 id="grid-name">Files grid</h2>
        <Grid noNativeElements />
      </>,
    );
    cy.get('[role="grid"]').find('i[data-tabster-dummy]').should('have.length', 2);
    cy.get('[role="grid"]').then(async $grid => {
      const grid = $grid[0];
      const results = await axe.run(grid, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      });
      // This is known-failure data, not an accessibility pass; a dependency fix must change this baseline.
      expect(results.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.length }))).to.deep.equal([
        { id: 'aria-hidden-focus', nodes: 2 },
      ]);
      const failingElements = results.violations[0].nodes.map(node => {
        expect(node.target).to.have.length(1);
        const selector = node.target[0];
        if (typeof selector !== 'string') {
          throw new Error('Expected a single light-DOM dummy-node selector');
        }
        const element = grid.ownerDocument.querySelector(selector);
        expect(element?.matches('i[data-tabster-dummy][aria-hidden="true"][tabindex="0"]')).to.equal(true);
        return element;
      });
      expect(failingElements).to.have.members(Array.from(grid.querySelectorAll('i[data-tabster-dummy]')));
    });
  });
  for (const noNativeElements of modes) {
    for (const as of ['tr', 'div'] as const) {
      it(`explicit ${as} wins over noNativeElements=${noNativeElements}; display still follows context`, () => {
        const explicit = (
          <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements }}>
            <TableRow as={as} data-testid="row">
              {as === 'tr' ? <td>Native content</td> : <div role="cell">ARIA content</div>}
            </TableRow>
          </TableContextProvider>
        );
        render(
          as === 'tr' ? (
            <table aria-label="Explicit table">
              <tbody>{explicit}</tbody>
            </table>
          ) : (
            <div role="table" aria-label="Explicit table">
              <div role="rowgroup">{explicit}</div>
            </div>
          ),
        );
        cy.get(row)
          .should('have.prop', 'tagName', as.toUpperCase())
          .and('have.css', 'display', noNativeElements ? 'flex' : 'table-row');
        if (as === 'div') {
          cy.get(row).should('have.attr', 'role', 'row');
        } else {
          cy.get(row).should('not.have.attr', 'role');
        }
      });
    }
    it(`passes refs, native attributes, user classes and styles (${noNativeElements ? 'div' : 'tr'})`, () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <>
          <p id="row-description">Report details for Ada</p>
          <Fixture
            noNativeElements={noNativeElements}
            rowProps={{
              ref,
              id: 'report-row',
              title: 'Report details',
              lang: 'en',
              dir: 'rtl',
              tabIndex: -1,
              'aria-rowindex': 2,
              'aria-describedby': 'row-description',
              className: 'consumer-row',
              style: { opacity: 0.8 },
            }}
          />
        </>,
      );
      cy.get(row)
        .should('have.attr', 'id', 'report-row')
        .and('have.attr', 'title', 'Report details')
        .and('have.attr', 'lang', 'en')
        .and('have.attr', 'dir', 'rtl')
        .and('have.attr', 'tabindex', '-1')
        .and('have.attr', 'aria-rowindex', '2')
        .and('have.attr', 'aria-describedby', 'row-description')
        .and('have.class', 'consumer-row')
        .and('have.class', 'fui-TableRow')
        .and('have.css', 'opacity', '0.8')
        .should($row => expect(ref.current).to.equal($row[0]));
      cy.get('#row-description').should('have.text', 'Report details for Ada');
    });
    it(`forwards and removes an explicit row role without replacing the root (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const ref = React.createRef<HTMLDivElement>();
      const click = cy.stub().as('roleClick');
      const explicitRole = noNativeElements ? 'presentation' : 'row';
      const Consumer = () => {
        const [explicit, setExplicit] = React.useState(false);
        const rowProps = explicit ? { ref, onClick: click, role: explicitRole } : { ref, onClick: click };
        return (
          <>
            <button data-testid="toggle-role" onClick={() => setExplicit(previous => !previous)}>
              Toggle explicit role
            </button>
            {noNativeElements ? (
              <Table
                noNativeElements
                role={explicit ? 'presentation' : 'table'}
                aria-label={explicit ? undefined : 'Files'}
              >
                <TableBody role={explicit ? 'presentation' : 'rowgroup'}>
                  <TableRow data-testid="row" {...rowProps}>
                    <div data-testid="file" role={explicit ? undefined : 'cell'}>
                      Report
                    </div>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <Fixture rowProps={rowProps} />
            )}
          </>
        );
      };
      const assertDefaultRole = () => {
        if (noNativeElements) {
          cy.get(row).should('have.attr', 'role', 'row');
        } else {
          cy.get(row).should('not.have.attr', 'role');
        }
      };
      render(<Consumer />);
      assertDefaultRole();
      cy.get('[data-testid="file"]').click();
      cy.get('@roleClick').should('have.been.calledOnce');
      cy.get(row)
        .should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TR')
        .then($row => {
          const original = $row[0];
          expect(ref.current).to.equal(original);
          cy.get('[data-testid="toggle-role"]').click();
          cy.get(row)
            .should('have.attr', 'role', explicitRole)
            .should($updated => {
              expect($updated[0]).to.equal(original);
              expect(ref.current).to.equal(original);
            });
          cy.get('[data-testid="file"]').should('have.text', 'Report').click();
          cy.get('@roleClick').should('have.been.calledTwice');
          if (noNativeElements) {
            cy.get('[data-testid="file"]').should('not.have.attr', 'role');
            cy.get('[role="presentation"]').should('have.length', 3);
          } else {
            cy.get('[data-testid="sibling"]').should('not.have.attr', 'role');
          }
          cy.get('[data-testid="toggle-role"]').click();
          assertDefaultRole();
          cy.get(row).should($updated => {
            expect($updated[0]).to.equal(original);
            expect(ref.current).to.equal(original);
          });
          if (noNativeElements) {
            cy.get('[data-testid="file"]').should('have.attr', 'role', 'cell');
            cy.get('[role="table"] > [role="rowgroup"]').should('contain', 'Report');
          }
          cy.get('[data-testid="file"]').click();
          cy.get('@roleClick').should('have.been.calledThrice');
        });
    });
    it(`aria-disabled is descriptive, not event suppression (${noNativeElements ? 'div' : 'tr'})`, () => {
      const click = cy.stub().as('disabledClick');
      const key = cy.stub().as('disabledKey');
      render(
        <Fixture
          noNativeElements={noNativeElements}
          rowProps={{ 'aria-disabled': true, tabIndex: 0, onClick: click, onKeyDown: key }}
        />,
      );
      cy.get(row).should('have.attr', 'aria-disabled', 'true').click();
      cy.get('@disabledClick').should('have.been.calledOnce');
      cy.get(row).focus().realPress('Enter');
      cy.get('@disabledKey').should('have.been.calledOnce');
      cy.get(row).should('be.focused');
      cy.get(row).realHover();
      colorToken(row, 'background-color', 'colorSubtleBackgroundHover');
    });
    for (const dir of directions) {
      it(`native Tab/Shift+Tab and consumer composed row navigation (${dir}, ${
        noNativeElements ? 'div' : 'tr'
      })`, () => {
        render(
          <>
            <h2 id="grid-name">Files grid</h2>
            <Grid noNativeElements={noNativeElements} />
          </>,
          dir,
        );
        cy.get('[data-testid="before"]').focus().realPress('Tab');
        cy.get('[data-testid="grid-a"]').should('be.focused').realPress('ArrowDown');
        cy.get('[data-testid="grid-b"]').should('be.focused').realPress('ArrowUp');
        cy.get('[data-testid="grid-a"]').should('be.focused');
        cy.get('[data-testid="grid-a"]').realPress('Tab');
        cy.get('[data-testid="after"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get('[data-testid="grid-a"]').should('be.focused');
        cy.get('[role="grid"]').should('have.attr', 'aria-labelledby', 'grid-name');
        cy.get('[data-testid="a-file"]')
          .should('have.attr', 'role', 'rowheader')
          .and('have.attr', 'aria-labelledby', 'grid-file');
        cy.get('[data-testid="grid-a"]').should('have.attr', 'aria-selected', 'true');
        cy.get('[data-testid="grid-b"]').should('have.attr', 'aria-selected', 'false');
        cy.get('[data-testid="grid-a"]').should('have.css', 'outline-style', 'solid');
        cy.get('[data-testid="grid-a"]').should('have.css', 'outline-width', '2px');
      });
      it(`composes real cell vertical navigation and direction geometry (${dir}, ${
        noNativeElements ? 'div' : 'tr'
      })`, () => {
        render(
          <>
            <h2 id="grid-name">Files grid</h2>
            <Grid noNativeElements={noNativeElements} cells />
          </>,
          dir,
        );
        cy.get('[data-testid="before"]').focus().realPress('Tab');
        cy.get('[data-testid="a-file"]').should('be.focused').realPress('ArrowDown');
        cy.get('[data-testid="b-file"]').should('be.focused').realPress('ArrowUp');
        cy.get('[data-testid="a-file"]').should('be.focused');
        cy.get('[data-testid="a-file"]').then($file => {
          cy.get('[data-testid="a-owner"]').should($owner => {
            const fileX = $file[0].getBoundingClientRect().left;
            const ownerX = $owner[0].getBoundingClientRect().left;
            expect(dir === 'ltr' ? fileX < ownerX : fileX > ownerX).to.equal(true);
          });
        });
        // RTL horizontal movement has the external Tabster limitation documented in TableRow.cy.md.
        if (dir === 'ltr') {
          cy.get('[data-testid="a-file"]').realPress('ArrowRight');
          cy.get('[data-testid="a-owner"]').should('be.focused').realPress('ArrowLeft');
          cy.get('[data-testid="a-file"]').should('be.focused');
        }
      });
      it(`passes WCAG scan for component-owned labelled grid without external mover (${dir}, ${
        noNativeElements ? 'div' : 'tr'
      })`, () => {
        render(
          <>
            <h2 id="grid-name">Files grid</h2>
            <Grid noNativeElements={noNativeElements} navigationEnabled={false} />
          </>,
          dir,
        );
        cy.get('[role="grid"]').then(async $grid => {
          const results = await axe.run($grid[0], {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          });
          expect(
            results.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.length })),
          ).to.deep.equal([]);
        });
      });
    }
    it(`passes WCAG scan for labelled noninteractive table (${noNativeElements ? 'ARIA' : 'native'})`, () => {
      render(<Fixture noNativeElements={noNativeElements} />);
      cy.get('.fui-Table').then(async $table => {
        const results = await axe.run($table[0], {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        });
        expect(results.violations.map(violation => violation.id)).to.deep.equal([]);
      });
    });
  }
});
describe('TableRow documented density and selection', () => {
  for (const noNativeElements of modes) {
    for (const { size, height } of sizes) {
      it(`inherits ${size} density in ${noNativeElements ? 'div' : 'tr'} rows`, () => {
        render(<Fixture size={size} noNativeElements={noNativeElements} />);
        cy.get('[data-testid="file"]').should($cell => {
          expect($cell[0].getBoundingClientRect().height).to.be.closeTo(height, 1);
        });
        cy.get(row).should('have.css', 'font-size', size === 'extra-small' ? '12px' : '14px');
        cy.get(row).should('have.css', 'border-bottom-width', size === 'extra-small' ? '0px' : '1px');
        cy.get('[data-testid="sibling"]').should('have.css', 'font-size', size === 'extra-small' ? '12px' : '14px');
      });
    }
    for (const appearance of appearances) {
      it(`renders ${appearance} appearance without inventing selection (${noNativeElements ? 'div' : 'tr'})`, () => {
        const click = cy.stub().as('click');
        render(<Fixture noNativeElements={noNativeElements} rowProps={{ appearance, onClick: click }} />);
        if (appearance === 'none') {
          cy.get(row).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
        } else {
          colorToken(
            row,
            'background-color',
            appearance === 'brand' ? 'colorBrandBackground2' : 'colorSubtleBackgroundSelected',
          );
        }
        cy.get(row).should('not.have.attr', 'aria-selected');
        cy.get(row).click();
        cy.get('@click').should('have.been.calledOnce');
        cy.get(row).should('not.have.attr', 'aria-selected');
        cy.get('[data-testid="sibling"]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      });
    }
    for (const mode of ['single', 'multiple'] as const) {
      it(`supports consumer-owned ${mode} selection and stable keyed reorder (${
        noNativeElements ? 'div' : 'tr'
      })`, () => {
        render(<Selection mode={mode} noNativeElements={noNativeElements} />);
        cy.get('[data-testid="a"]').should('have.attr', 'aria-selected', 'true');
        cy.get('[data-testid="b"]').should('have.attr', 'aria-selected', 'false').click();
        cy.get('[data-testid="b"]').should('have.attr', 'aria-selected', 'true').find('input').should('be.checked');
        cy.get('[data-testid="a"]').should('have.attr', 'aria-selected', mode === 'single' ? 'false' : 'true');
        cy.get('[data-testid="b"]').then($b => {
          const element = $b[0];
          cy.get('[data-testid="reorder"]').click();
          cy.get('tbody, [role="rowgroup"]').last().children().first().should('have.attr', 'data-testid', 'b');
          cy.get('[data-testid="b"]').should($new => expect($new[0]).to.equal(element));
        });
        cy.get('[data-testid="b"]').focus().realPress('Space');
        cy.get('[data-testid="b"]')
          .should('have.attr', 'aria-selected', 'false')
          .find('input')
          .should('not.be.checked');
      });
    }
  }
});

describe('TableRow unit-derived styles, events and lifecycle', () => {
  for (const noNativeElements of modes) {
    for (const appearance of appearances) {
      it(`derives hover, active, focus-within and idle styles for ${appearance} (${
        noNativeElements ? 'div' : 'tr'
      })`, () => {
        render(
          <Fixture noNativeElements={noNativeElements} rowProps={{ appearance, tabIndex: 0 }}>
            <TableSelectionCell
              data-testid="selection"
              subtle
              checked={false}
              checkboxIndicator={{ 'aria-label': 'Select report' }}
            />
            <TableCell>
              <TableCellLayout appearance="primary">Report</TableCellLayout>
              <div>
                <TableCellActions data-testid="actions">
                  <button data-testid="edit">Edit report</button>
                </TableCellActions>
              </div>
            </TableCell>
          </Fixture>,
        );
        cy.get('[data-testid="selection"]').should('have.css', 'opacity', '0');
        cy.get('[data-testid="actions"]').should('have.css', 'opacity', '0');
        cy.get('.fui-TableCellLayout__main').should('have.css', 'font-weight', '600');
        cy.get(row).realHover();
        colorToken(row, 'background-color', 'colorSubtleBackgroundHover');
        colorToken(row, 'color', 'colorNeutralForeground1Hover');
        cy.get('[data-testid="selection"]').should('have.css', 'opacity', '1');
        cy.get('[data-testid="actions"]').should('have.css', 'opacity', '1');
        cy.get(row).realMouseDown();
        colorToken(
          row,
          'background-color',
          appearance === 'brand'
            ? 'colorBrandBackground2'
            : appearance === 'neutral'
            ? 'colorSubtleBackgroundSelected'
            : 'colorSubtleBackgroundPressed',
        );
        colorToken(row, 'color', appearance === 'brand' ? 'colorNeutralForeground1' : 'colorNeutralForeground1Pressed');
        cy.get(row).realMouseUp();
        cy.get('[data-testid="before"]').realHover();
        cy.get('[data-testid="before"]').focus().realPress('Tab');
        cy.get(row).should('be.focused').and('have.css', 'outline-width', '2px');
        cy.get(row).realPress('Tab');
        cy.get('[data-testid="selection"] input').should('be.focused');
        cy.get('[data-testid="actions"]').should('have.css', 'opacity', '1');
        cy.get('[data-testid="selection"]').should('have.css', 'opacity', '1');
        cy.get('[data-testid="after"]').focus();
        cy.get('[data-testid="selection"]').should('have.css', 'opacity', '0');
        cy.get('[data-testid="actions"]').should('have.css', 'opacity', '0');
        cy.get('[data-testid="sibling"]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      });
    }
    it(`header context suppresses hover but still reveals actions on keyboard focus (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      render(
        <Table noNativeElements={noNativeElements} aria-label="Header controls">
          <TableHeader>
            <TableRow data-testid="row">
              <TableHeaderCell>
                File
                <TableCellActions data-testid="actions">
                  <button data-testid="header-action">Filter files</button>
                </TableCellActions>
              </TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Report</TableCell>
              <TableCell>Ada</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      cy.get(row).realHover();
      cy.get(row).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      cy.get('[data-testid="actions"]').should('have.css', 'opacity', '0');
      cy.get('[data-testid="before"]').realHover().focus().realPress('Tab');
      cy.get('[data-testid="header-action"]').should('be.focused');
      cy.get('[data-testid="actions"]').should('have.css', 'opacity', '1');
      cy.get('[data-testid="after"]').focus();
      cy.get('[data-testid="actions"]').should('have.css', 'opacity', '0');
    });
    it(`checked subtle indicators are visible independently of row appearance (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      render(
        <Fixture noNativeElements={noNativeElements} rowProps={{ appearance: 'none', 'aria-selected': false }}>
          <TableSelectionCell
            data-testid="selection"
            subtle
            checked
            checkboxIndicator={{ 'aria-label': 'Checked report' }}
          />
          <TableCell>Report</TableCell>
        </Fixture>,
      );
      cy.get('[data-testid="selection"]').should('have.css', 'opacity', '1').find('input').should('be.checked');
      cy.get(row).should('have.attr', 'aria-selected', 'false').and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
    });
    it(`forwards exact native events and preventDefault without built-in keyboard activation (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const click = cy.stub().as('rowClick');
      const key = cy.stub().as('rowKey');
      const bubbled = cy.stub().as('bubble');
      render(
        <div onClick={event => bubbled(event.defaultPrevented)}>
          <Fixture
            noNativeElements={noNativeElements}
            rowProps={{
              tabIndex: 0,
              onClick: (event: React.MouseEvent<HTMLElement>) => {
                event.preventDefault();
                click(
                  event.type,
                  event.currentTarget.getAttribute('data-testid'),
                  event.target,
                  event.defaultPrevented,
                );
              },
              onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
                if (event.key === ' ') {
                  event.preventDefault();
                }
                key(event.key, event.defaultPrevented, event.currentTarget.getAttribute('data-testid'));
              },
            }}
          />
        </div>,
      );
      cy.get('[data-testid="file"]')
        .click()
        .then($file => {
          expect(click).to.have.been.calledOnceWithExactly('click', 'row', $file[0], true);
          expect(bubbled).to.have.been.calledOnceWithExactly(true);
        });
      cy.get(row).focus().realPress('Space').realPress('Enter').realPress('ArrowDown');
      cy.get('@rowKey').should('have.callCount', 3);
      cy.then(() => {
        expect(key.firstCall.args).to.deep.equal([' ', true, 'row']);
        expect(key.secondCall.args).to.deep.equal(['Enter', false, 'row']);
        expect(key.thirdCall.args).to.deep.equal(['ArrowDown', false, 'row']);
      });
      cy.get('@rowClick').should('have.been.calledOnce');
      cy.get(row).should('be.focused').and('not.have.attr', 'aria-selected');
    });
    it(`consumer action preventDefault guards row selection without suppressing callbacks (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const rowEvents = cy.stub().as('rowEvents');
      const action = cy.stub().as('action');
      const Consumer = () => {
        const [selected, setSelected] = React.useState(false);
        return (
          <Fixture
            noNativeElements={noNativeElements}
            rowProps={{
              tabIndex: 0,
              'aria-selected': selected,
              appearance: selected ? 'brand' : 'none',
              onClick: (event: React.MouseEvent<HTMLElement>) => {
                rowEvents(event.type, event.defaultPrevented);
                if (!event.defaultPrevented) {
                  setSelected(previous => !previous);
                }
              },
              onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
                rowEvents(event.key, event.defaultPrevented);
                if (event.key === ' ' && !event.defaultPrevented) {
                  event.preventDefault();
                  setSelected(previous => !previous);
                }
              },
            }}
          >
            <TableCell data-testid="file">Report</TableCell>
            <TableCell>
              <TableCellActions
                visible
                onClick={event => event.preventDefault()}
                onKeyDown={event => {
                  if (event.key === ' ') {
                    event.preventDefault();
                  }
                }}
              >
                <button data-testid="edit" onClick={action}>
                  Edit report
                </button>
              </TableCellActions>
            </TableCell>
          </Fixture>
        );
      };
      render(<Consumer />);
      cy.get('[data-testid="edit"]').click();
      cy.get('@action').should('have.been.calledOnce');
      cy.get('@rowEvents').should('have.been.calledOnceWithExactly', 'click', true);
      cy.get(row).should('have.attr', 'aria-selected', 'false');
      cy.get('[data-testid="edit"]').focus().realPress('Space');
      cy.get('@rowEvents').should('have.callCount', 2);
      cy.then(() => expect(rowEvents.secondCall.args).to.deep.equal([' ', true]));
      cy.get(row).should('have.attr', 'aria-selected', 'false');
      cy.get('[data-testid="file"]').click();
      cy.get(row).should('have.attr', 'aria-selected', 'true');
      cy.get(row).focus().realPress('Space');
      cy.get(row).should('have.attr', 'aria-selected', 'false');
      cy.get('@rowEvents').should('have.callCount', 4);
    });
    it(`supports root render functions and merged forwarded ref (${noNativeElements ? 'div' : 'tr'})`, () => {
      const ref = React.createRef<HTMLDivElement>();
      const click = cy.stub().as('renderClick');
      const renderRoot: SlotRenderFunction<ExtractSlotProps<TableRowSlots['root']>> = (Component, props) =>
        React.createElement<React.HTMLAttributes<HTMLElement>>(
          Component,
          props,
          noNativeElements ? (
            <div role="cell" data-testid="render-cell">
              Customized report
            </div>
          ) : (
            <td data-testid="render-cell">Customized report</td>
          ),
        );
      render(
        <Fixture
          noNativeElements={noNativeElements}
          rowProps={{ children: renderRoot, ref, title: 'Custom row', onClick: click }}
        />,
      );
      cy.get(row)
        .should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TR')
        .and('have.attr', 'title', 'Custom row')
        .and('have.class', 'fui-TableRow')
        .should($row => expect(ref.current).to.equal($row[0]));
      cy.get('[data-testid="render-cell"]').should('have.text', 'Customized report').click();
      cy.get('@renderClick').should('have.been.calledOnce');
    });
    it(`rerenders latest props and handlers, preserving row and child identity (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const first = cy.stub().as('first');
      const latest = cy.stub().as('latest');
      const ref = React.createRef<HTMLDivElement>();
      const Dynamic = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button data-testid="update" onClick={() => setUpdated(true)}>
              Update row
            </button>
            <Fixture
              noNativeElements={noNativeElements}
              size={updated ? 'extra-small' : 'medium'}
              rowProps={{
                ref,
                title: updated ? 'Latest' : 'Initial',
                appearance: updated ? 'neutral' : 'none',
                'aria-selected': updated,
                onClick: updated ? latest : first,
              }}
            >
              <TableCell>
                <input data-testid="draft" aria-label="Draft" defaultValue="Persistent" />
              </TableCell>
              <TableCell>{updated ? 'Grace' : 'Ada'}</TableCell>
            </Fixture>
          </>
        );
      };
      render(<Dynamic />);
      cy.get(row).then($row => {
        const original = $row[0];
        cy.get('[data-testid="draft"]')
          .focus()
          .type(' edited')
          .then($input => {
            const input = $input[0];
            cy.get(row).click('right');
            cy.get('@first').should('have.been.calledOnce');
            cy.get('[data-testid="update"]').click();
            cy.get(row)
              .should('have.attr', 'title', 'Latest')
              .and('have.attr', 'aria-selected', 'true')
              .and('have.css', 'font-size', '12px')
              .should($new => {
                expect($new[0]).to.equal(original);
                expect(ref.current).to.equal(original);
              });
            cy.get('[data-testid="draft"]')
              .should('have.value', 'Persistent edited')
              .should($new => expect($new[0]).to.equal(input));
            cy.get('[data-testid="before"]').realHover();
            colorToken(row, 'background-color', 'colorSubtleBackgroundSelected');
            cy.get(row).click('right');
            cy.get('@latest').should('have.been.calledOnce');
            cy.get('@first').should('have.been.calledOnce');
          });
      });
    });
    it(`context mode changes replace semantic roots and reattach merged refs (starts ${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const ref = cy.stub();
      const click = cy.stub().as('modeClick');
      const DynamicMode = () => {
        const [mode, setMode] = React.useState(noNativeElements);
        return (
          <>
            <button data-testid="mode" onClick={() => setMode(previous => !previous)}>
              Change table mode
            </button>
            <Fixture noNativeElements={mode} size="small" rowProps={{ ref, onClick: click, 'aria-selected': true }} />
          </>
        );
      };
      render(<DynamicMode />);
      cy.get(row)
        .should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TR')
        .then($row => {
          const original = $row[0];
          expect(ref.lastCall.args[0]).to.equal(original);
          cy.get('[data-testid="mode"]').click();
          cy.get(row)
            .should('have.prop', 'tagName', noNativeElements ? 'TR' : 'DIV')
            .and('have.css', 'display', noNativeElements ? 'table-row' : 'flex')
            .and('have.attr', 'aria-selected', 'true')
            .should($new => {
              expect($new[0]).not.to.equal(original);
              expect(ref.lastCall.args[0]).to.equal($new[0]);
              expect(ref.getCalls().some(call => call.args[0] === null)).to.equal(true);
            });
          cy.get('[data-testid="file"]').should($cell =>
            expect($cell[0].getBoundingClientRect().height).to.be.closeTo(34, 1),
          );
          cy.get(row).click();
          cy.get('@modeClick').should('have.been.calledOnce');
          cy.get('[data-testid="mode"]').click();
          cy.get(row)
            .should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TR')
            .should($new => expect(ref.lastCall.args[0]).to.equal($new[0]));
        });
    });
    it(`object and callback refs clear on removal and attach to a fresh row (${
      noNativeElements ? 'div' : 'tr'
    })`, () => {
      const ref = React.createRef<HTMLDivElement>();
      const callback = cy.stub();
      const Lifecycle = () => {
        const [shown, setShown] = React.useState(true);
        return (
          <>
            <button data-testid="toggle" onClick={() => setShown(previous => !previous)}>
              Toggle row
            </button>
            <Table noNativeElements={noNativeElements} aria-label="Lifecycle">
              <TableBody>
                {shown && (
                  <>
                    <TableRow data-testid="row" ref={ref}>
                      <TableCell>Report</TableCell>
                    </TableRow>
                    <TableRow data-testid="callback" ref={callback}>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </>
        );
      };
      render(<Lifecycle />);
      cy.get(row).then($row => {
        const original = $row[0];
        expect(ref.current).to.equal(original);
        cy.get('[data-testid="callback"]').should($callback =>
          expect(callback.lastCall.args[0]).to.equal($callback[0]),
        );
        cy.get('[data-testid="toggle"]').click();
        cy.get(row)
          .should('not.exist')
          .then(() => {
            expect(ref.current).to.equal(null);
            expect(callback.lastCall.args[0]).to.equal(null);
          });
        cy.get('[data-testid="toggle"]').click();
        cy.get(row).should($new => {
          expect($new[0]).not.to.equal(original);
          expect(ref.current).to.equal($new[0]);
        });
        cy.get('[data-testid="callback"]').should($callback =>
          expect(callback.lastCall.args[0]).to.equal($callback[0]),
        );
      });
    });
    for (const innerMode of modes) {
      it(`nearest table context resets density/layout; ancestor descendant selectors reach nested children (outer=${noNativeElements}, inner=${innerMode})`, () => {
        render(
          <Fixture noNativeElements={noNativeElements} size="extra-small">
            <TableCell>
              <Table noNativeElements={innerMode} size="small" aria-label="Nested files">
                <TableHeader>
                  <TableRow data-testid="inner-header">
                    <TableHeaderCell>Selection</TableHeaderCell>
                    <TableHeaderCell>File</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow data-testid="inner-row">
                    <TableSelectionCell
                      data-testid="inner-selection"
                      subtle
                      checked={false}
                      checkboxIndicator={{ 'aria-label': 'Select nested file' }}
                    />
                    <TableCell data-testid="inner-cell">Nested report</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableCell>
            <TableCell data-testid="outer-cell">Outer owner</TableCell>
          </Fixture>,
        );
        cy.get('[data-testid="inner-row"]')
          .should('have.prop', 'tagName', innerMode ? 'DIV' : 'TR')
          .and('have.css', 'display', innerMode ? 'flex' : 'table-row')
          .and('have.css', 'font-size', '12px')
          .and('have.css', 'border-bottom-width', '1px');
        cy.get('[data-testid="inner-cell"]').should($cell =>
          expect($cell[0].getBoundingClientRect().height).to.be.closeTo(34, 1),
        );
        cy.get('[data-testid="outer-cell"]').should($cell =>
          expect($cell[0].getBoundingClientRect().height).to.be.at.least(24),
        );
        cy.get('[data-testid="inner-selection"]').should('have.css', 'opacity', '0');
        cy.get('[data-testid="outer-cell"]').realHover();
        cy.get('[data-testid="inner-selection"]').should('have.css', 'opacity', '1');
        cy.get('[data-testid="inner-row"]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
        cy.get('[data-testid="inner-header"]').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
        cy.get('[data-testid="before"]').realHover();
        cy.get('[data-testid="inner-selection"]').should('have.css', 'opacity', '0');
      });
    }
  }
});

describe('TableRow forced-colors source branches', () => {
  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });
  for (const noNativeElements of modes) {
    for (const appearance of appearances) {
      it(`retains high-contrast selection borders and focus for ${appearance} (${
        noNativeElements ? 'div' : 'tr'
      })`, () => {
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Emulation.setEmulatedMedia',
            params: { features: [{ name: 'forced-colors', value: 'active' }] },
          }),
        );
        render(
          <>
            <span data-testid="highlight" style={{ color: 'Highlight', forcedColorAdjust: 'none' }}>
              System highlight
            </span>
            <Fixture noNativeElements={noNativeElements} rowProps={{ appearance, tabIndex: 0 }} />
          </>,
        );
        cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
        cy.get(row).should('have.css', 'border-bottom-width', appearance === 'none' ? '1px' : '2px');
        cy.get('[data-testid="before"]').focus().realPress('Tab');
        cy.get(row)
          .should('be.focused')
          .and('have.css', 'outline-width', '2px')
          .and('have.css', 'outline-offset', appearance === 'none' ? '0px' : '-4px');
        cy.get('[data-testid="after"]').focus();
        cy.get(row).realHover();
        cy.get('[data-testid="highlight"]').then($highlight => {
          cy.get(row).should('have.css', 'color', $highlight.css('color'));
        });
      });
    }
  }
});
