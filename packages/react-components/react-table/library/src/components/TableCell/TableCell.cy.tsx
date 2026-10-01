import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { Avatar } from '@fluentui/react-avatar';
import { useArrowNavigationGroup, useFocusableGroup } from '@fluentui/react-tabster';
import * as axe from 'axe-core';
import { TableCell } from './TableCell';
import type { TableCellProps, TableCellSlots } from './TableCell.types';
import { Table } from '../Table/Table';
import type { TableProps } from '../Table/Table.types';
import { TableBody } from '../TableBody/TableBody';
import { TableHeader } from '../TableHeader/TableHeader';
import { TableHeaderCell } from '../TableHeaderCell/TableHeaderCell';
import { TableRow } from '../TableRow/TableRow';
import { TableCellLayout } from '../TableCellLayout/TableCellLayout';
import { TableCellActions } from '../TableCellActions/TableCellActions';
import { TableContextProvider, tableContextDefaultValue } from '../../contexts/tableContext';
import { useOverrides } from './TableCell.cy.styles';

const cell = '[data-testid="cell"]';
const media = '.fui-TableCellLayout__media';
const main = '.fui-TableCellLayout__main';
const description = '.fui-TableCellLayout__description';
const actions = '.fui-TableCellActions';
const sizes = [
  { size: 'medium', height: 44, avatar: 32, icon: 20 },
  { size: 'small', height: 34, avatar: 24, icon: 20 },
  { size: 'extra-small', height: 24, avatar: 20, icon: 16 },
] as const;
const directions = ['ltr', 'rtl'] as const;
const modes = [false, true] as const;

const Fixture = ({ children, noNativeElements = false, size, ...props }: TableProps) => {
  return (
    <Table aria-label="Files" noNativeElements={noNativeElements} size={size} style={{ width: 480 }} {...props}>
      <TableHeader>
        <TableRow>
          <TableHeaderCell id="file-header">File</TableHeaderCell>
          <TableHeaderCell id="owner-header">Owner</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          {children}
          <TableCell data-testid="peer" {...(props.role === 'grid' ? { role: 'gridcell' } : {})}>
            Other owner
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

function render(
  props: TableCellProps = {},
  tableProps: TableProps = {},
  dir: 'ltr' | 'rtl' = 'ltr',
  ref?: React.Ref<HTMLDivElement>,
) {
  return mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <Fixture {...tableProps}>
        <TableCell data-testid="cell" {...props} ref={ref} />
      </Fixture>
      <button data-testid="outside">Outside table</button>
    </FluentProvider>,
  );
}

function rect(element: Element) {
  return element.getBoundingClientRect();
}

const GridFixture = ({
  noNativeElements = false,
  grouped = false,
}: {
  noNativeElements?: boolean;
  grouped?: boolean;
}) => {
  const navigation = useArrowNavigationGroup({ axis: 'grid' });
  const group = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
  return (
    <>
      <button data-testid="before">Before grid</button>
      <Table
        {...navigation}
        noNativeElements={noNativeElements}
        role="grid"
        aria-label="Editable files"
        style={{ width: 480 }}
      >
        <TableHeader>
          <TableRow>
            <TableHeaderCell>File</TableHeaderCell>
            <TableHeaderCell>Owner</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell data-testid="a" role="gridcell" tabIndex={0} {...(grouped ? group : {})}>
              {grouped ? (
                <TableCellLayout>
                  <button data-testid="edit">Edit</button>
                  <button data-testid="delete">Delete</button>
                </TableCellLayout>
              ) : (
                'Report'
              )}
            </TableCell>
            <TableCell data-testid="b" role="gridcell" tabIndex={0}>
              Ada
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell data-testid="c" role="gridcell" tabIndex={0}>
              Notes
            </TableCell>
            <TableCell data-testid="d" role="gridcell" tabIndex={0}>
              Grace
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <button data-testid="after">After grid</button>
    </>
  );
};

describe('TableCell unit-derived and lifecycle scenarios', () => {
  for (const noNativeElements of modes) {
    it(`renders empty, numeric and mixed children without adding wrappers or interactive behavior (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      render(
        {
          children: (
            <>
              {null}
              {false}
              {0}
              <strong>Report</strong>
              <span> details</span>
            </>
          ),
        },
        { noNativeElements },
      );
      cy.get(cell).should('have.text', '0Report details');
      cy.get(cell).children().should('have.length', 2);
      cy.get(`${cell} strong`).should('have.text', 'Report');
      cy.get(`${cell} span`).should('have.text', ' details');
      cy.get(cell).should('not.have.attr', 'tabindex');
    });

    it(`lets tall content expand beyond the density minimum without clipping (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      render(
        {
          children: (
            <div data-testid="tall" style={{ height: 88 }}>
              Tall report
            </div>
          ),
        },
        { noNativeElements },
      );
      cy.get(cell).should($cell => {
        const bounds = rect($cell[0]);
        const child = rect($cell.find('[data-testid="tall"]')[0]);
        expect(bounds.height, 'cell expands for tall content').to.be.at.least(88);
        expect(child.top, 'top remains within the cell').to.be.at.least(bounds.top);
        expect(child.bottom, 'bottom remains within the cell').to.be.at.most(bounds.bottom);
        expect($cell.css('overflow-y'), 'cell does not hide content').to.equal('visible');
      });
    });

    it(`forwards object refs and callback refs, including detach on removal (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const objectRef = React.createRef<HTMLDivElement>();
      const callback = cy.stub().as('ref');
      const Lifecycle = () => {
        const [shown, setShown] = React.useState(true);
        return (
          <FluentProvider theme={teamsLightTheme}>
            <button onClick={() => setShown(value => !value)}>Toggle cell</button>
            <Fixture noNativeElements={noNativeElements}>
              {shown && (
                <TableCell data-testid="cell" ref={objectRef}>
                  Report
                </TableCell>
              )}
              {shown && (
                <TableCell data-testid="callback" ref={callback}>
                  Callback cell
                </TableCell>
              )}
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<Lifecycle />);
      cy.get(cell).then($cell => expect(objectRef.current).to.equal($cell[0]));
      cy.get('[data-testid="callback"]').then($cell => expect(callback.lastCall.args[0]).to.equal($cell[0]));
      cy.contains('button', 'Toggle cell').click();
      cy.get(cell)
        .should('not.exist')
        .then(() => {
          expect(objectRef.current).to.equal(null);
          expect(callback.lastCall.args[0]).to.equal(null);
        });
      cy.contains('button', 'Toggle cell').click();
      cy.get(cell).then($cell => expect(objectRef.current).to.equal($cell[0]));
      cy.get('[data-testid="callback"]').then($cell => expect(callback.lastCall.args[0]).to.equal($cell[0]));
    });

    it(`supports root render-function customization with native props and refs (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const ref = React.createRef<HTMLDivElement>();
      const onClick = cy.stub().as('customClick');
      const renderRoot: SlotRenderFunction<ExtractSlotProps<TableCellSlots['root']>> = (Component, props) =>
        React.createElement<React.HTMLAttributes<HTMLElement>>(
          Component,
          props,
          <strong data-testid="custom-content">Custom report</strong>,
        );
      render({ children: renderRoot, onClick, title: 'Customized report' }, { noNativeElements }, 'ltr', ref);
      cy.get(cell).should('have.class', 'fui-TableCell').and('have.attr', 'title', 'Customized report');
      cy.get(cell).should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TD');
      cy.get(`${cell} strong`).should('have.text', 'Custom report').click();
      cy.get('@customClick').should('have.been.calledOnce');
      cy.get(cell).then($cell => expect(ref.current).to.equal($cell[0]));
    });

    it(`preserves root classes and applies consumer Griffel and inline overrides (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const Overrides = () => {
        const styles = useOverrides();
        return (
          <FluentProvider theme={teamsLightTheme}>
            <Fixture noNativeElements={noNativeElements}>
              <TableCell data-testid="cell" className={styles.root} style={{ cursor: 'crosshair' }}>
                Report
              </TableCell>
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<Overrides />);
      cy.get(cell)
        .should('have.class', 'fui-TableCell')
        .and('have.css', 'cursor', 'crosshair')
        .and('have.css', 'padding-left', teamsLightTheme.spacingHorizontalXXL)
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalXXL)
        .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightBold));
      cy.get('[data-testid="peer"]')
        .should('have.css', 'padding-left', teamsLightTheme.spacingHorizontalS)
        .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular));
    });

    it(`forwards bubbling, capture, keyboard, focus, blur, double click and context menu handlers (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const order: string[] = [];
      const focus = cy.stub().as('focus');
      const blur = cy.stub().as('blur');
      const doubleClick = cy.stub().as('double');
      const contextMenu = cy.stub().as('context');
      const keyDown = cy.stub().as('down');
      const keyUp = cy.stub().as('up');
      render(
        {
          tabIndex: 0,
          onClickCapture: (event: React.MouseEvent<HTMLElement>) => {
            expect(event.currentTarget.tagName).to.equal(noNativeElements ? 'DIV' : 'TD');
            order.push('capture');
          },
          onClick: (event: React.MouseEvent<HTMLElement>) => {
            expect(event.target).not.to.equal(event.currentTarget);
            order.push('bubble');
          },
          onFocus: focus,
          onBlur: blur,
          onDoubleClick: doubleClick,
          onContextMenu: contextMenu,
          onKeyDown: keyDown,
          onKeyUp: keyUp,
          children: <span data-testid="event-child">Report</span>,
        },
        { noNativeElements },
      );
      cy.get('[data-testid="event-child"]')
        .click()
        .then(() => expect(order).to.deep.equal(['capture', 'bubble']));
      cy.get('[data-testid="event-child"]').dblclick();
      cy.get('@double').should('have.been.calledOnce');
      cy.get('[data-testid="event-child"]').rightclick();
      cy.get('@context').should('have.been.calledOnce');
      cy.get(cell).focus();
      cy.realPress('F2');
      cy.get('@down').should('have.been.calledOnce');
      cy.get('@up').should('have.been.calledOnce');
      cy.get('@focus').should('have.been.called');
      cy.get('[data-testid="outside"]').focus();
      cy.get('@blur').should('have.been.called');
    });

    it(`uses latest handlers, attributes and content without replacing a retained root (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const first = cy.stub().as('first');
      const latest = cy.stub().as('latest');
      const DynamicProps = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <FluentProvider theme={teamsLightTheme}>
            <button onClick={() => setUpdated(value => !value)}>Update props</button>
            <Fixture noNativeElements={noNativeElements}>
              <TableCell
                data-testid="cell"
                id={updated ? 'new-report' : 'old-report'}
                title={updated ? 'Updated' : 'Original'}
                className={updated ? 'updated-cell' : 'original-cell'}
                aria-label={updated ? 'Updated report' : 'Original report'}
                tabIndex={updated ? -1 : 0}
                onClick={updated ? latest : first}
                onKeyDown={updated ? latest : first}
              >
                {updated ? <strong>New report</strong> : 'Old report'}
              </TableCell>
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<DynamicProps />);
      cy.get(cell).as('retained', { type: 'static' }).click();
      cy.get('@first').should('have.been.calledOnce');
      cy.contains('button', 'Update props').click();
      cy.get(cell)
        .should('have.attr', 'id', 'new-report')
        .and('have.attr', 'title', 'Updated')
        .and('have.attr', 'aria-label', 'Updated report')
        .and('have.attr', 'tabindex', '-1')
        .and('have.class', 'updated-cell')
        .and('not.have.class', 'original-cell');
      cy.get('@retained').then(previous => cy.get(cell).should($cell => expect($cell[0]).to.equal(previous[0])));
      cy.get(cell).find('strong').should('have.text', 'New report').click();
      cy.get(cell).focus();
      cy.realPress('F2');
      cy.get('@latest').should('have.been.calledTwice');
      cy.get('@first').should('have.been.calledOnce');
      cy.contains('button', 'Update props').click();
      cy.get(cell).should('have.attr', 'id', 'old-report').and('have.text', 'Old report');
      cy.get(cell).click();
      cy.get('@first').should('have.been.calledTwice');
      cy.get('@latest').should('have.been.calledTwice');
    });

    it(`updates all density contexts while preserving cell, layout and stateful child identity (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const StatefulChild = () => {
        const [count, setCount] = React.useState(0);
        return (
          <button data-testid="counter" onClick={() => setCount(value => value + 1)}>
            Count {count}
          </button>
        );
      };
      const Density = () => {
        const [index, setIndex] = React.useState(0);
        return (
          <FluentProvider theme={teamsLightTheme}>
            <button onClick={() => setIndex(value => (value + 1) % sizes.length)}>Next density</button>
            <Fixture noNativeElements={noNativeElements} size={sizes[index].size}>
              <TableCell data-testid="cell">
                <TableCellLayout media={<Avatar name="Ada" aria-label="Ada" />}>
                  <StatefulChild />
                </TableCellLayout>
              </TableCell>
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<Density />);
      cy.get(cell).as('originalCell', { type: 'static' });
      cy.get(`${cell} .fui-TableCellLayout`).as('originalLayout', { type: 'static' });
      cy.get('[data-testid="counter"]').as('originalChild', { type: 'static' }).click();
      for (const index of [1, 2, 0]) {
        cy.contains('button', 'Next density').click();
        cy.get('[data-testid="counter"]').should('have.text', 'Count 1');
        cy.get(`${cell} .fui-Avatar`).should($avatar => expect(rect($avatar[0]).width).to.equal(sizes[index].avatar));
        cy.get(`${cell} ${media}`).should('have.css', 'font-size', `${sizes[index].icon}px`);
        cy.get(cell).should($cell => expect(rect($cell[0]).height).to.be.closeTo(sizes[index].height, 1));
      }
      cy.get('@originalCell').then(previous => cy.get(cell).should($cell => expect($cell[0]).to.equal(previous[0])));
      cy.get('@originalLayout').then(previous =>
        cy.get(`${cell} .fui-TableCellLayout`).should($layout => expect($layout[0]).to.equal(previous[0])),
      );
      cy.get('@originalChild').then(previous =>
        cy.get('[data-testid="counter"]').should($child => expect($child[0]).to.equal(previous[0])),
      );
    });

    it(`updates primary appearance, optional composition slots and truncation without stale styles (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const DynamicComposition = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <FluentProvider theme={teamsLightTheme}>
            <button onClick={() => setUpdated(value => !value)}>Update layout</button>
            <Fixture noNativeElements={noNativeElements}>
              <TableCell data-testid="cell">
                <TableCellLayout
                  appearance={updated ? 'primary' : undefined}
                  truncate={updated}
                  media={updated ? <span aria-hidden="true">M</span> : null}
                  description={updated ? 'Updated description' : null}
                >
                  {updated ? 'LongReportName'.repeat(30) : 'Report'}
                </TableCellLayout>
                {updated && (
                  <TableCellActions visible>
                    <button>Edit</button>
                  </TableCellActions>
                )}
              </TableCell>
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<DynamicComposition />);
      cy.get(`${cell} ${media}`).should('not.exist');
      cy.get(`${cell} ${description}`).should('not.exist');
      cy.get(`${cell} ${actions}`).should('not.exist');
      cy.get(`${cell} ${main}`).should('have.css', 'font-weight', '400').and('have.css', 'text-overflow', 'clip');
      cy.get(`${cell} .fui-TableCellLayout`).as('originalLayout', { type: 'static' });
      cy.contains('button', 'Update layout').click();
      cy.get(`${cell} ${description}`).should('have.text', 'Updated description');
      cy.get(`${cell} ${media}`).should('have.css', 'font-size', '24px');
      cy.get(`${cell} ${main}`)
        .should('have.css', 'font-weight', '600')
        .and('have.css', 'text-overflow', 'ellipsis')
        .should($main => expect($main[0].scrollWidth).to.be.greaterThan($main[0].clientWidth));
      cy.get(`${cell} ${actions}`).should('have.css', 'opacity', '1');
      cy.get('@originalLayout').then(previous =>
        cy.get(`${cell} .fui-TableCellLayout`).should($layout => expect($layout[0]).to.equal(previous[0])),
      );
      cy.contains('button', 'Update layout').click();
      cy.get(`${cell} ${main}`)
        .should('have.text', 'Report')
        .and('have.css', 'font-weight', '400')
        .and('have.css', 'text-overflow', 'clip')
        .and('have.css', 'overflow-x', 'visible');
      cy.get(`${cell} ${description}`).should('not.exist');
      cy.get(`${cell} ${media}`).should('not.exist');
      cy.get(`${cell} ${actions}`).should('not.exist');
    });

    for (const innerNativeElements of modes) {
      it(`resets nested table boundaries and permits an explicit media size override (outer div=${noNativeElements}, inner div=${innerNativeElements})`, () => {
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <Fixture noNativeElements={noNativeElements} size="extra-small">
              <TableCell data-testid="cell">
                <TableCellLayout media={<Avatar name="Ada" aria-label="Ada" />}>Outer</TableCellLayout>
                <Table noNativeElements={innerNativeElements} aria-label="Nested table">
                  <TableBody>
                    <TableRow>
                      <TableCell data-testid="inner">
                        <TableCellLayout media={<Avatar name="Grace" aria-label="Grace" />}>
                          Inner default medium
                        </TableCellLayout>
                      </TableCell>
                      <TableCell data-testid="override">
                        <TableCellLayout media={<Avatar size={40} name="Alan" aria-label="Alan" />}>
                          Explicit avatar size
                        </TableCellLayout>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableCell>
            </Fixture>
          </FluentProvider>,
        );
        cy.get('[data-testid="inner"]')
          .should('have.prop', 'tagName', innerNativeElements ? 'DIV' : 'TD')
          .and('have.css', 'display', innerNativeElements ? 'flex' : 'table-cell');
        cy.get('[data-testid="inner"]').should($cell => expect(rect($cell[0]).height).to.be.at.least(44));
        cy.get('[data-testid="inner"] .fui-Avatar').should($avatar => expect(rect($avatar[0]).width).to.equal(32));
        cy.get('[data-testid="override"] .fui-Avatar').should($avatar => expect(rect($avatar[0]).width).to.equal(40));
        cy.get(`${cell} > .fui-TableCellLayout .fui-Avatar`).should($avatar =>
          expect(rect($avatar[0]).width).to.equal(20),
        );
        cy.get('[data-testid="peer"]').should($cell => expect(rect($cell[0]).height).to.be.at.least(24));
        cy.get('[data-testid="peer"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
        if (noNativeElements) {
          cy.get('[data-testid="peer"]').should('have.css', 'min-height', '24px');
        }
      });
    }

    for (const dir of directions) {
      it(`honors consumer logical end alignment with actual text geometry (${
        noNativeElements ? 'div' : 'td'
      }, ${dir})`, () => {
        render(
          {
            style: noNativeElements ? { justifyContent: 'flex-end' } : { textAlign: 'end' },
            children: <span data-testid="aligned">Report</span>,
          },
          { noNativeElements },
          dir,
        );
        cy.get(cell).should($cell => {
          const bounds = rect($cell[0]);
          const text = rect($cell.find('[data-testid="aligned"]')[0]);
          const padding = parseFloat(teamsLightTheme.spacingHorizontalS);
          expect(
            dir === 'ltr' ? bounds.right - text.right : text.left - bounds.left,
            'logical end padding',
          ).to.be.closeTo(padding, 1);
          expect(
            dir === 'ltr' ? text.left - bounds.left : bounds.right - text.right,
            'opposite space',
          ).to.be.greaterThan(padding * 2);
        });
      });
    }
  }

  it('changes native/flex context with correct ref detach/attach and restores native semantics', () => {
    const references = cy.stub().as('references');
    const DynamicMode = () => {
      const [noNativeElements, setNoNativeElements] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button onClick={() => setNoNativeElements(value => !value)}>Change rendering mode</button>
          <Fixture noNativeElements={noNativeElements}>
            <TableCell data-testid="cell" ref={references}>
              Report
            </TableCell>
          </Fixture>
        </FluentProvider>
      );
    };
    mount(<DynamicMode />);
    cy.get(cell).should('have.prop', 'tagName', 'TD').as('nativeCell', { type: 'static' });
    cy.contains('button', 'Change rendering mode').click();
    cy.get(cell)
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'cell')
      .and('have.css', 'display', 'flex');
    cy.get(cell).then($cell => {
      expect(references.getCalls().map(call => call.args[0])).to.include(null);
      expect(references.lastCall.args[0]).to.equal($cell[0]);
    });
    cy.get('@nativeCell').should($old => expect($old[0].isConnected).to.equal(false));
    cy.contains('button', 'Change rendering mode').click();
    cy.get(cell).should('have.prop', 'tagName', 'TD');
    cy.get(cell).should('not.have.attr', 'role');
    cy.get(cell)
      .should('have.css', 'display', 'table-cell')
      .then($cell => expect(references.lastCall.args[0]).to.equal($cell[0]));
  });
});

describe('TableCell documented scenarios', () => {
  for (const noNativeElements of modes) {
    for (const { size, height, avatar, icon } of sizes) {
      it(`inherits ${size} dimensions and layout media in ${noNativeElements ? 'flex' : 'native'} mode`, () => {
        render(
          {
            children: (
              <TableCellLayout media={<Avatar name="Ada Lovelace" aria-label="Ada Lovelace" />}>Report</TableCellLayout>
            ),
          },
          { noNativeElements, size },
        );
        cy.get(cell)
          .should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TD')
          .and('have.class', 'fui-TableCell')
          .and('have.css', 'display', noNativeElements ? 'flex' : 'table-cell');
        if (noNativeElements) {
          cy.get(cell).should('have.attr', 'role', 'cell').and('have.css', 'min-height', `${height}px`);
        } else {
          cy.get(cell).should('not.have.attr', 'role');
          cy.get(cell).should('have.css', 'vertical-align', 'middle');
          cy.get(cell).parent().should('have.prop', 'tagName', 'TR');
          cy.get(cell).parent().parent().should('have.prop', 'tagName', 'TBODY');
        }
        cy.get(cell).should($cell => {
          expect(rect($cell[0]).height, 'density geometry').to.be.closeTo(height, 1);
        });
        cy.get(`${cell} .fui-Avatar`).should($avatar => {
          expect(rect($avatar[0]).width, 'inherited avatar width').to.equal(avatar);
          expect(rect($avatar[0]).height, 'inherited avatar height').to.equal(avatar);
        });
        cy.get(`${cell} ${media}`).should('have.css', 'font-size', `${icon}px`);
        cy.get(`${cell} ${main}`).should('have.text', 'Report');
        cy.get(cell).should('not.have.attr', 'tabindex');
      });
    }

    for (const primary of [false, true]) {
      it(`composes ${primary ? 'primary' : 'ordinary'} main and description in ${
        noNativeElements ? 'flex' : 'native'
      } cells`, () => {
        render(
          {
            children: (
              <TableCellLayout
                appearance={primary ? 'primary' : undefined}
                media={<span aria-hidden="true">M</span>}
                description="My organization"
              >
                Quarterly report
              </TableCellLayout>
            ),
          },
          { noNativeElements },
        );
        cy.get(`${cell} ${main}`)
          .should('have.text', 'Quarterly report')
          .and('have.css', 'font-weight', primary ? '600' : '400');
        cy.get(`${cell} ${media}`).should('have.css', 'font-size', primary ? '24px' : '20px');
        cy.get(`${cell} ${description}`)
          .should('have.text', 'My organization')
          .and('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
        cy.get(cell).should($cell => {
          const heading = rect($cell.find(main)[0]);
          const details = rect($cell.find(description)[0]);
          expect(details.top, 'description below main text').to.be.at.least(heading.bottom - 1);
          expect(heading.left, 'stacked text alignment').to.be.closeTo(details.left, 1);
          expect(rect($cell[0]).height, 'content does not collapse cell').to.be.at.least(44);
        });
      });
    }

    for (const dir of directions) {
      it(`positions media before text and vertically centers contents (${
        noNativeElements ? 'flex' : 'native'
      }, ${dir})`, () => {
        render(
          { children: <TableCellLayout media={<span aria-hidden="true">M</span>}>Report</TableCellLayout> },
          { noNativeElements },
          dir,
        );
        cy.get(cell).should($cell => {
          const bounds = rect($cell[0]);
          const picture = rect($cell.find(media)[0]);
          const text = rect($cell.find(main)[0]);
          const gap = dir === 'ltr' ? text.left - picture.right : picture.left - text.right;
          expect(gap, 'logical media/text gap').to.be.closeTo(parseFloat(teamsLightTheme.spacingHorizontalS), 1);
          expect((picture.top + picture.bottom) / 2, 'media vertical centering').to.be.closeTo(
            (bounds.top + bounds.bottom) / 2,
            1,
          );
          expect((text.top + text.bottom) / 2, 'text vertical centering').to.be.closeTo(
            (picture.top + picture.bottom) / 2,
            1,
          );
          expect(picture.left, 'media inside cell').to.be.at.least(bounds.left);
          expect(text.right, 'text inside cell').to.be.at.most(bounds.right);
        });
      });

      it(`constrains truncated text with a non-truncated positive control (${
        noNativeElements ? 'flex' : 'native'
      }, ${dir})`, () => {
        const text = 'VeryLongUnbrokenReportName'.repeat(8);
        render(
          {
            children: (
              <>
                <TableCellLayout data-testid="truncated" truncate media={<span aria-hidden="true">M</span>}>
                  {text}
                </TableCellLayout>
                <TableCellLayout data-testid="untruncated">{text}</TableCellLayout>
              </>
            ),
            style: { flexDirection: 'column', alignItems: 'stretch' },
          },
          { noNativeElements },
          dir,
        );
        cy.get(`[data-testid="truncated"] ${main}`)
          .should('have.css', 'text-overflow', 'ellipsis')
          .and('have.css', 'white-space', 'nowrap')
          .and('have.css', 'overflow-x', 'hidden')
          .should($main => {
            expect($main[0].scrollWidth, 'real overflowing content').to.be.greaterThan($main[0].clientWidth);
            expect(rect($main[0]).width, 'nonzero clipped text').to.be.greaterThan(20);
            expect(rect($main[0]).width, 'bounded text width').to.be.lessThan(240);
          });
        cy.get('[data-testid="truncated"]').should($layout => {
          const bounds = rect($layout.closest(cell)[0]);
          expect(rect($layout[0]).left).to.be.at.least(bounds.left);
          expect(rect($layout[0]).right).to.be.at.most(bounds.right);
        });
        cy.get(`[data-testid="untruncated"] ${main}`)
          .should('have.css', 'text-overflow', 'clip')
          .and('have.css', 'overflow-x', 'visible')
          .should($main => {
            expect(rect($main[0]).width, 'positive control actually exceeds cell').to.be.greaterThan(240);
          });
      });

      it(`reveals actionable children on row hover and anchors them within the cell (${
        noNativeElements ? 'flex' : 'native'
      }, ${dir})`, () => {
        const onEdit = cy.stub().as('edit');
        render(
          {
            children: (
              <>
                <TableCellLayout>Report</TableCellLayout>
                <TableCellActions>
                  <button onClick={onEdit}>Edit report</button>
                </TableCellActions>
              </>
            ),
          },
          { noNativeElements },
          dir,
        );
        cy.get('[data-testid="outside"]').realHover();
        cy.get(cell).should('have.css', 'position', 'relative');
        cy.get(`${cell} ${actions}`).should('have.css', 'opacity', '0');
        cy.get(cell).realHover();
        cy.get(`${cell} ${actions}`)
          .should('have.css', 'opacity', '1')
          .should($actions => {
            const bounds = rect($actions.closest(cell)[0]);
            const actionBounds = rect($actions[0]);
            expect(
              dir === 'ltr' ? actionBounds.right : actionBounds.left,
              'logical trailing action edge',
            ).to.be.closeTo(dir === 'ltr' ? bounds.right : bounds.left, 1);
            expect((actionBounds.top + actionBounds.bottom) / 2, 'action vertical centering').to.be.closeTo(
              (bounds.top + bounds.bottom) / 2,
              1,
            );
          });
        cy.contains('button', 'Edit report').click();
        cy.get('@edit').should('have.been.calledOnce');
        cy.get('[data-testid="peer"]').realHover();
        cy.get(`${cell} ${actions}`).should('have.css', 'opacity', '1');
        cy.contains('button', 'Edit report').blur();
        cy.get('[data-testid="outside"]').realHover();
        cy.get(`${cell} ${actions}`).should('have.css', 'opacity', '0');
      });
    }
  }
});

describe('TableCell edges and accessibility', () => {
  for (const noNativeElements of modes) {
    for (const as of ['td', 'div'] as const) {
      it(`honors explicit as="${as}" over noNativeElements=${noNativeElements}`, () => {
        const target = (
          <TableCell as={as} data-testid="cell">
            Explicit cell
          </TableCell>
        );
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements }}>
              {as === 'td' ? (
                <table aria-label="Explicit native cell">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {target}
                      <td>Ada</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div role="table" aria-label="Explicit div cell">
                  <div role="row">
                    <div role="columnheader">File</div>
                    <div role="columnheader">Owner</div>
                  </div>
                  <div role="row">
                    {target}
                    <div role="cell">Ada</div>
                  </div>
                </div>
              )}
            </TableContextProvider>
          </FluentProvider>,
        );
        cy.get(cell).should('have.prop', 'tagName', as.toUpperCase());
        if (as === 'td') {
          cy.get(cell).should('not.have.attr', 'role');
        } else {
          cy.get(cell).should('have.attr', 'role', 'cell');
        }
        cy.get(cell).should('have.css', 'display', noNativeElements ? 'flex' : 'table-cell');
      });
    }

    for (const grid of [false, true]) {
      it(`preserves names and relationships with a WCAG scan (${noNativeElements ? 'div' : 'td'}, ${
        grid ? 'grid' : 'table'
      })`, () => {
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <p id="cell-label">Quarterly report</p>
            <p id="cell-help">Read only file</p>
            <Fixture noNativeElements={noNativeElements} {...(grid ? { role: 'grid' } : {})}>
              <TableCell
                data-testid="cell"
                headers="file-header"
                {...(grid ? { role: 'gridcell' } : {})}
                aria-labelledby="cell-label"
                aria-describedby="cell-help"
                title="File information"
              >
                <TableCellLayout media={<span aria-hidden="true">M</span>}>Report</TableCellLayout>
              </TableCell>
            </Fixture>
          </FluentProvider>,
        );
        cy.get(cell)
          .should('have.attr', 'aria-labelledby', 'cell-label')
          .and('have.attr', 'aria-describedby', 'cell-help')
          .and('have.attr', 'title', 'File information');
        if (grid) {
          cy.get(cell).should('have.attr', 'role', 'gridcell');
        }
        cy.get(cell).should($cell => {
          const owner = $cell[0].ownerDocument;
          expect(owner.getElementById($cell.attr('aria-labelledby')!)?.textContent).to.equal('Quarterly report');
          expect(owner.getElementById($cell.attr('aria-describedby')!)?.textContent).to.equal('Read only file');
          expect(owner.getElementById('file-header')?.textContent).to.equal('File');
        });
        cy.get('.fui-Table').then($table =>
          axe
            .run($table[0], { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
            .then(result => expect(result.violations, 'WCAG violations').to.deep.equal([])),
        );
      });
    }

    it(`leaves ordinary cells out of native tab order and preserves interactive children (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const activate = cy.stub().as('activate');
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="before">Before table</button>
          <Fixture noNativeElements={noNativeElements}>
            <TableCell data-testid="cell">
              <button data-testid="button" onClick={activate}>
                Edit
              </button>
              <button disabled>Unavailable</button>
              <a data-testid="link" href="#details">
                Details
              </a>
              <input data-testid="input" aria-label="File name" defaultValue="Report" />
            </TableCell>
          </Fixture>
          <button data-testid="after">After table</button>
        </FluentProvider>,
      );
      cy.get(cell).should('not.have.attr', 'tabindex');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="button"]').should('be.focused');
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@activate').should('have.been.calledTwice');
      cy.realPress('Tab');
      cy.get('[data-testid="link"]').should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="input"]').should('be.focused').and('have.value', 'Report');
      cy.realPress('End');
      cy.get('[data-testid="input"]').type(' revised').should('have.value', 'Report revised');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="input"]').should('be.focused');
    });

    it(`does not invent arrow navigation or activation for a focusable primitive (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      const onKeyDown = cy.stub().as('key');
      const onClick = cy.stub().as('click');
      render(
        { role: 'gridcell', tabIndex: 0, onKeyDown, onClick, children: 'Focusable report' },
        { noNativeElements, role: 'grid' },
      );
      cy.get(cell).focus();
      cy.realPress('ArrowRight');
      cy.realPress('ArrowDown');
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get(cell).should('be.focused');
      cy.get('@key').should('have.callCount', 4);
      cy.get('@click').should('not.have.been.called');
      cy.get('[data-testid="peer"]').should('not.have.attr', 'tabindex');
      cy.realPress('Tab');
      cy.get('[data-testid="outside"]').should('be.focused');
    });

    for (const dir of directions) {
      it(`supports consumer-supplied ${
        dir === 'ltr' ? 'four-direction' : 'vertical RTL'
      } grid navigation and focus geometry (${noNativeElements ? 'div' : 'td'})`, () => {
        mount(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <GridFixture noNativeElements={noNativeElements} />
          </FluentProvider>,
        );
        cy.get('.fui-Table').should('have.attr', 'data-tabster');
        cy.get('[data-testid="before"]').focus();
        cy.realPress('Tab');
        cy.get('[data-testid="a"]').should('be.focused').and('have.attr', 'role', 'gridcell');
        cy.get('[data-testid="a"]')
          .should('have.css', 'outline-style', 'solid')
          .and('have.css', 'outline-width', '2px');
        cy.get('[data-testid="a"]').should($cell => {
          expect(rect($cell[0]).height, 'focus target has usable geometry').to.be.at.least(44);
          expect(rect($cell[0]).width, 'focus target has usable width').to.be.greaterThan(100);
        });
        cy.get('[data-testid="a"]').should($cell => {
          const peer = $cell[0].ownerDocument.querySelector('[data-testid="b"]')!;
          expect(rect($cell[0]).left < rect(peer).left, 'direction changes physical column order').to.equal(
            dir === 'ltr',
          );
        });
        // Tabster's Grid mover rejects horizontal RTL rectangles; see TableCell evidence.
        if (dir === 'ltr') {
          cy.realPress('ArrowRight');
          cy.get('[data-testid="b"]').should('be.focused');
          cy.realPress('ArrowDown');
          cy.get('[data-testid="d"]').should('be.focused');
          cy.realPress('ArrowLeft');
        } else {
          cy.realPress('ArrowDown');
        }
        cy.get('[data-testid="c"]').should('be.focused');
        cy.realPress('ArrowUp');
        cy.get('[data-testid="a"]').should('be.focused');
        cy.realPress('Tab');
        cy.get('[data-testid="after"]').should('be.focused');
      });
    }

    it(`integrates Enter/Tab/Shift-Tab/Escape for a documented focusable group (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <GridFixture noNativeElements={noNativeElements} grouped />
        </FluentProvider>,
      );
      cy.get('[data-testid="a"]').should('have.attr', 'data-tabster');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="a"]').should('be.focused');
      cy.realPress('Enter');
      cy.get('[data-testid="edit"]').should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="delete"]').should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="edit"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="delete"]').should('be.focused');
      cy.realPress('Escape');
      cy.get('[data-testid="a"]').should('be.focused');
      cy.realPress('ArrowRight');
      cy.get('[data-testid="b"]').should('be.focused');
    });

    it(`reveals actions during keyboard focus within and removes them on exit (${
      noNativeElements ? 'div' : 'td'
    })`, () => {
      render(
        {
          children: (
            <>
              <TableCellLayout>Report</TableCellLayout>
              <TableCellActions>
                <button data-testid="edit">Edit report</button>
              </TableCellActions>
            </>
          ),
        },
        { noNativeElements },
      );
      cy.get('[data-testid="outside"]').realHover().focus();
      cy.get(`${cell} ${actions}`).should('have.css', 'opacity', '0');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="edit"]').should('be.focused');
      cy.get(`${cell} ${actions}`).should('have.css', 'opacity', '1');
      cy.realPress('Tab');
      cy.get('[data-testid="outside"]').should('be.focused');
      cy.get(`${cell} ${actions}`).should('have.css', 'opacity', '0');
    });

    it(`inherits row appearance without becoming selected or interactive (${noNativeElements ? 'div' : 'td'})`, () => {
      const Appearance = () => {
        const [appearance, setAppearance] = React.useState<'none' | 'brand' | 'neutral'>('none');
        return (
          <FluentProvider theme={teamsLightTheme}>
            <button onClick={() => setAppearance('brand')}>Brand row</button>
            <button onClick={() => setAppearance('neutral')}>Neutral row</button>
            <Table noNativeElements={noNativeElements} aria-label="Appearance">
              <TableBody>
                <TableRow data-testid="row" appearance={appearance}>
                  <TableCell data-testid="cell">Report</TableCell>
                  <TableCell>Other</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </FluentProvider>
        );
      };
      mount(<Appearance />);
      cy.get(cell).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      cy.get('[data-testid="row"]').invoke('css', 'background-color').as('plainBackground', { type: 'static' });
      cy.contains('button', 'Brand row').click();
      cy.get('@plainBackground').then(plain => {
        cy.get('[data-testid="row"]').should($row => expect($row.css('background-color')).not.to.equal(plain));
      });
      cy.get(cell).should('not.have.attr', 'aria-selected');
      cy.get(cell).should('not.have.attr', 'tabindex');
      cy.get('[data-testid="row"]').invoke('css', 'background-color').as('brandBackground', { type: 'static' });
      cy.contains('button', 'Neutral row').click();
      cy.get('@brandBackground').then(brand => {
        cy.get('[data-testid="row"]').should($row => expect($row.css('background-color')).not.to.equal(brand));
      });
      cy.get(cell).should($cell => {
        expect($cell.css('color'), 'cell inherits row foreground').to.equal($cell.parent().css('color'));
        expect(rect($cell[0]).height, 'appearance retains density').to.be.at.least(44);
      });
    });
  }

  it('forwards native spans and headers with actual two-dimensional span geometry', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Table aria-label="Spanning files" style={{ width: 480 }}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell id="span-file">File</TableHeaderCell>
              <TableHeaderCell id="span-owner">Owner</TableHeaderCell>
              <TableHeaderCell>Details</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell data-testid="cell" colSpan={2} rowSpan={2} headers="span-file span-owner">
                Shared report
              </TableCell>
              <TableCell data-testid="top">First detail</TableCell>
            </TableRow>
            <TableRow>
              <TableCell data-testid="bottom">Second detail</TableCell>
            </TableRow>
            <TableRow>
              <TableCell data-testid="single">File</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Detail</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </FluentProvider>,
    );
    cy.get(cell)
      .should('have.attr', 'colspan', '2')
      .and('have.attr', 'rowspan', '2')
      .and('have.attr', 'headers', 'span-file span-owner');
    cy.get(cell).should($cell => {
      const owner = $cell[0].ownerDocument;
      const bounds = rect($cell[0]);
      const top = rect(owner.querySelector('[data-testid="top"]')!);
      const bottom = rect(owner.querySelector('[data-testid="bottom"]')!);
      const single = rect(owner.querySelector('[data-testid="single"]')!);
      expect(bounds.width, 'two columns').to.be.closeTo(single.width * 2, 1);
      expect(bounds.height, 'two rows').to.be.closeTo(top.height + bottom.height, 1);
      expect(bounds.right, 'neighbor starts after spanning cell').to.be.closeTo(bottom.left, 1);
      expect(bounds.top).to.be.closeTo(top.top, 1);
      expect(bounds.bottom).to.be.closeTo(bottom.bottom, 1);
    });
  });

  it('forwards virtualized grid index and span relationships without native table attributes', () => {
    render(
      { role: 'gridcell', 'aria-colindex': 3, 'aria-colspan': 2, 'aria-rowspan': 2, children: 'Virtual report' },
      { noNativeElements: true, role: 'grid', 'aria-colcount': 10, 'aria-rowcount': 100 },
    );
    cy.get(cell)
      .should('have.attr', 'aria-colindex', '3')
      .and('have.attr', 'aria-colspan', '2')
      .and('have.attr', 'aria-rowspan', '2');
    cy.get(cell).should('not.have.attr', 'colspan');
    cy.get(cell).should('not.have.attr', 'rowspan');
    cy.get('.fui-Table').should('have.attr', 'aria-colcount', '10').and('have.attr', 'aria-rowcount', '100');
  });
});
