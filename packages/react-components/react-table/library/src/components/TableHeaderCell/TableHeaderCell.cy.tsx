import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { ArrowUpRegular, ArrowDownRegular } from '@fluentui/react-icons';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import * as axe from 'axe-core';
import { TableHeaderCell } from './TableHeaderCell';
import type { TableHeaderCellProps, TableHeaderCellSlots } from './TableHeaderCell.types';
import { Table } from '../Table/Table';
import type { TableProps } from '../Table/Table.types';
import { TableHeader } from '../TableHeader/TableHeader';
import { TableRow } from '../TableRow/TableRow';
import { TableBody } from '../TableBody/TableBody';
import { TableCell } from '../TableCell/TableCell';
import { TableContextProvider, tableContextDefaultValue } from '../../contexts/tableContext';
import { useTableFeatures } from '../../hooks/useTableFeatures';
import { useTableSort } from '../../hooks/useTableSort';
import { createTableColumn } from '../../hooks/createColumn';
import type { SortState } from '../../hooks/types';
import { useOverrides } from './TableHeaderCell.cy.styles';

const cell = '[data-testid="header"]';
const button = `${cell} .fui-TableHeaderCell__button`;
const icon = `${cell} .fui-TableHeaderCell__sortIcon`;
const modes = [false, true] as const;

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

const items = [
  { file: 'Zulu', owner: 'Ada' },
  { file: 'Alpha', owner: 'Zoe' },
  { file: 'Mike', owner: 'Grace' },
];
const columns = [
  createTableColumn<(typeof items)[number]>({ columnId: 'file', compare: (a, b) => a.file.localeCompare(b.file) }),
  createTableColumn<(typeof items)[number]>({ columnId: 'owner', compare: (a, b) => a.owner.localeCompare(b.owner) }),
];

const SortingFixture = ({ controlled, noNativeElements }: { controlled: boolean; noNativeElements: boolean }) => {
  const [sortState, setSortState] = React.useState<SortState>({ sortColumn: 'file', sortDirection: 'ascending' });
  const {
    getRows,
    sort: { sort, toggleColumnSort, getSortDirection },
  } = useTableFeatures({ items, columns }, [
    useTableSort({
      sortState: controlled ? sortState : undefined,
      defaultSortState: { sortColumn: 'file', sortDirection: 'ascending' },
      onSortChange: (_, nextState) => setSortState(nextState),
    }),
  ]);
  return (
    <FluentProvider theme={teamsLightTheme}>
      <Table aria-label="Sorted files" sortable noNativeElements={noNativeElements}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell
              data-testid="header"
              sortDirection={getSortDirection('file')}
              onClick={e => toggleColumnSort(e, 'file')}
            >
              File
            </TableHeaderCell>
            <TableHeaderCell
              data-testid="peer"
              sortDirection={getSortDirection('owner')}
              onClick={e => toggleColumnSort(e, 'owner')}
            >
              Owner
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sort(getRows()).map(({ item }) => (
            <TableRow key={item.file}>
              <TableCell data-testid="file">{item.file}</TableCell>
              <TableCell>{item.owner}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </FluentProvider>
  );
};

const Fixture = ({ children, ...props }: TableProps) => (
  <Table aria-label="Files" style={{ width: 480 }} {...props}>
    <TableHeader>
      <TableRow>
        {children}
        <TableHeaderCell data-testid="peer">Owner</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>Report</TableCell>
        <TableCell>Ada</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

function render(props: TableHeaderCellProps = {}, tableProps: TableProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <button data-testid="before">Before</button>
      <Fixture {...tableProps}>
        <TableHeaderCell data-testid="header" {...props} />
      </Fixture>
      <button data-testid="after">After</button>
    </FluentProvider>,
  );
}

describe('TableHeaderCell unit-derived and lifecycle scenarios', () => {
  for (const noNativeElements of modes) {
    const mode = noNativeElements ? 'div' : 'th';
    for (const controlled of modes) {
      it(`composes actual ${
        controlled ? 'controlled' : 'uncontrolled'
      } sorted rows with feature hooks (${mode})`, () => {
        mount(<SortingFixture controlled={controlled} noNativeElements={noNativeElements} />);
        const order = (expected: string[]) =>
          cy
            .get('[data-testid="file"]')
            .should($cells => expect([...$cells].map(el => el.textContent)).to.deep.equal(expected));
        order(['Alpha', 'Mike', 'Zulu']);
        cy.get(cell).should('have.attr', 'aria-sort', 'ascending');
        cy.get(button).click();
        order(['Zulu', 'Mike', 'Alpha']);
        cy.get(cell).should('have.attr', 'aria-sort', 'descending');
        cy.get('[data-testid="peer"] .fui-TableHeaderCell__button').focus();
        cy.realPress('Enter');
        order(['Zulu', 'Mike', 'Alpha']);
        cy.get('[data-testid="peer"]').should('have.attr', 'aria-sort', 'ascending');
        cy.get(cell).should('have.attr', 'aria-sort', 'none');
        cy.get(icon).should('not.exist');
        cy.realPress('Space');
        order(['Alpha', 'Mike', 'Zulu']);
        cy.get('[data-testid="peer"]').should('have.attr', 'aria-sort', 'descending');
        cy.get(button).focus();
        cy.realPress('Enter');
        order(['Alpha', 'Mike', 'Zulu']);
        cy.get(cell).should('have.attr', 'aria-sort', 'ascending');
      });
    }

    it(`rerenders directions, current handlers and children while retaining node identity (${mode})`, () => {
      const first = cy.stub().as('first');
      const latest = cy.stub().as('latest');
      let originalRoot: HTMLElement;
      let originalChild: HTMLElement;
      let upPath: string | undefined;
      let update: React.Dispatch<React.SetStateAction<boolean>>;
      const StableChild = () => {
        const [count, setCount] = React.useState(0);
        return (
          <span data-testid="stable" onDoubleClick={() => setCount(c => c + 1)}>
            File {count}
          </span>
        );
      };
      const Dynamic = () => {
        const [changed, setChanged] = React.useState(false);
        update = setChanged;
        return (
          <FluentProvider theme={teamsLightTheme}>
            <Fixture noNativeElements={noNativeElements} sortable>
              <TableHeaderCell
                data-testid="header"
                sortDirection={changed ? 'descending' : 'ascending'}
                onClick={changed ? latest : first}
                button={{ 'aria-label': changed ? 'Sort newest' : 'Sort oldest' }}
              >
                <StableChild />
                {changed ? ' updated' : ' original'}
              </TableHeaderCell>
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<Dynamic />);
      cy.get('[data-testid="stable"]').dblclick();
      cy.get('[data-testid="stable"]').should('have.text', 'File 1');
      cy.get(cell).then($el => {
        originalRoot = $el[0];
      });
      cy.get('[data-testid="stable"]').then($el => {
        originalChild = $el[0];
      });
      cy.get(icon)
        .find('path')
        .then($el => {
          upPath = $el.attr('d');
        });
      cy.get(button).click().focus();
      cy.get('@first').then(stub => (stub as unknown as sinon.SinonStub).resetHistory());
      cy.then(() => update(true));
      cy.get(cell).should('have.attr', 'aria-sort', 'descending');
      cy.get(button).should('have.attr', 'aria-label', 'Sort newest').and('be.focused');
      cy.get('[data-testid="stable"]').should('have.text', 'File 1');
      cy.get(cell).should('contain.text', 'updated');
      cy.get(cell).should($new => expect($new[0]).to.equal(originalRoot));
      cy.get('[data-testid="stable"]').should($new => expect($new[0]).to.equal(originalChild));
      cy.get(icon)
        .find('path')
        .should($new => expect($new.attr('d')).not.to.equal(upPath));
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@latest').should('have.been.calledTwice');
      cy.get('@first').should('not.have.been.called');
    });

    it(`transitions sortable and icon presence without retaining obsolete ARIA (${mode})`, () => {
      let update: React.Dispatch<React.SetStateAction<number>>;
      const Dynamic = () => {
        const [step, setStep] = React.useState(0);
        update = setStep;
        return (
          <FluentProvider theme={teamsLightTheme}>
            <Fixture noNativeElements={noNativeElements} sortable>
              <TableHeaderCell
                data-testid="header"
                sortable={step !== 2}
                sortDirection={step === 1 ? 'ascending' : undefined}
              >
                File
              </TableHeaderCell>
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<Dynamic />);
      cy.get(cell).should('have.attr', 'aria-sort', 'none');
      cy.get(icon).should('not.exist');
      cy.then(() => update(1));
      cy.get(icon).find('svg').should('exist');
      cy.get(cell).should('have.attr', 'aria-sort', 'ascending');
      cy.then(() => update(2));
      cy.get(cell).should('not.have.attr', 'aria-sort');
      cy.get(button).should('not.have.attr', 'role');
      cy.get(button).should('not.have.attr', 'tabindex');
      cy.get(icon).should('not.exist');
      cy.then(() => update(0));
      cy.get(button).should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
      cy.get(cell).should('have.attr', 'aria-sort', 'none');
    });

    for (const as of ['div', 'button'] as const) {
      it(`updates disabled ${as} and its latest callback with positive activation controls (${mode})`, () => {
        const active = cy.stub().as('active');
        const latest = cy.stub().as('latest');
        let update: React.Dispatch<React.SetStateAction<number>>;
        const Dynamic = () => {
          const [step, setStep] = React.useState(0);
          update = setStep;
          return (
            <FluentProvider theme={teamsLightTheme}>
              <Fixture noNativeElements={noNativeElements}>
                <TableHeaderCell
                  data-testid="header"
                  sortable
                  button={{ as, disabled: step === 1, onClick: step === 2 ? latest : active }}
                >
                  File
                </TableHeaderCell>
              </Fixture>
            </FluentProvider>
          );
        };
        mount(<Dynamic />);
        cy.get(button).realClick();
        cy.get('@active').should('have.been.calledOnce');
        cy.then(() => update(1));
        if (as === 'button') {
          cy.get(button).should('be.disabled');
        } else {
          cy.get(button).should('have.attr', 'aria-disabled', 'true');
        }
        cy.get(button).realClick();
        cy.get('@active').should('have.been.calledOnce');
        cy.then(() => update(2));
        if (as === 'button') {
          cy.get(button).should('not.be.disabled');
        } else {
          cy.get(button).should('not.have.attr', 'aria-disabled');
          cy.get(button).should('have.attr', 'tabindex', '0');
        }
        cy.get(button).focus();
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('@latest').should('have.been.calledTwice');
        cy.get('@active').should('have.been.calledOnce');
      });
    }

    it(`resolves forwarded and slot refs and clears them when removed (${mode})`, () => {
      const rootRef = React.createRef<HTMLDivElement>();
      const slotRef = React.createRef<HTMLDivElement>();
      const iconRef = React.createRef<HTMLSpanElement>();
      const asideRef = React.createRef<HTMLSpanElement>();
      let remove: React.Dispatch<React.SetStateAction<boolean>>;
      const Dynamic = () => {
        const [visible, setVisible] = React.useState(true);
        remove = setVisible;
        return (
          <FluentProvider theme={teamsLightTheme}>
            <Fixture noNativeElements={noNativeElements}>
              {visible && (
                <TableHeaderCell
                  ref={rootRef}
                  data-testid="header"
                  sortable
                  button={{ as: 'div', ref: slotRef }}
                  sortDirection="ascending"
                  sortIcon={{ ref: iconRef }}
                  aside={{ ref: asideRef, children: 'Resize' }}
                >
                  File
                </TableHeaderCell>
              )}
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<Dynamic />);
      cy.get(cell).then($el => expect(rootRef.current).to.equal($el[0]));
      cy.get(button).then($el => expect(slotRef.current).to.equal($el[0]));
      cy.get(icon).then($el => expect(iconRef.current).to.equal($el[0]));
      cy.get(`${cell} .fui-TableHeaderCell__aside`).then($el => expect(asideRef.current).to.equal($el[0]));
      cy.then(() => remove(false));
      cy.get(cell).should('not.exist');
      cy.then(() => [rootRef, slotRef, iconRef, asideRef].forEach(ref => expect(ref.current).to.equal(null)));
    });

    it(`preserves empty, zero and mixed children with supplied root attributes (${mode})`, () => {
      render(
        {
          id: 'header-id',
          title: 'File information',
          lang: 'en',
          'aria-label': 'Document column',
          'aria-sort': 'other',
          children: (
            <>
              {null}
              {false}
              {0}
              <strong>File</strong>
              <span> details</span>
            </>
          ),
        },
        { noNativeElements },
      );
      cy.get(cell)
        .should('have.text', '0File details')
        .and('have.attr', 'id', 'header-id')
        .and('have.attr', 'title', 'File information')
        .and('have.attr', 'lang', 'en');
      cy.get(cell).should('have.attr', 'aria-label', 'Document column').and('have.attr', 'aria-sort', 'other');
      cy.get(button).find('strong').should('have.length', 1);
      render({ children: null }, { noNativeElements });
      cy.get(button).should('be.empty');
    });

    for (const appearance of ['none', 'neutral', 'brand'] as const) {
      it(`row appearance=${appearance} is inherited and sortable press styling is observable (${mode})`, () => {
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <Table aria-label="Files" noNativeElements={noNativeElements}>
              <TableHeader>
                <TableRow appearance={appearance}>
                  <TableHeaderCell data-testid="header" sortable>
                    File
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
            </Table>
          </FluentProvider>,
        );
        cy.get(cell)
          .parent()
          .should(
            'have.css',
            'background-color',
            appearance === 'brand'
              ? rgb(teamsLightTheme.colorBrandBackground2)
              : appearance === 'neutral'
              ? rgb(teamsLightTheme.colorSubtleBackgroundSelected)
              : 'rgba(0, 0, 0, 0)',
          );
        cy.get(button).realMouseDown();
        cy.get(cell).should('have.css', 'background-color', rgb(teamsLightTheme.colorSubtleBackgroundPressed));
        cy.get(button).realMouseUp();
      });
    }
  }

  it('isolates nested table contexts instead of inheriting the outer sortable/native mode', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Table aria-label="Outer" sortable>
          <TableHeader>
            <TableRow>
              <TableHeaderCell data-testid="outer">Outer file</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <Table aria-label="Inner" noNativeElements>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell data-testid="header">Inner file</TableHeaderCell>
                      <TableHeaderCell>Owner</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Notes</TableCell>
                      <TableCell>Ada</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableCell>
              <TableCell>Outer owner</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </FluentProvider>,
    );
    cy.get('[data-testid="outer"]').should('have.prop', 'tagName', 'TH').and('have.attr', 'aria-sort', 'none');
    cy.get(cell).should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'columnheader');
    cy.get(cell).should('not.have.attr', 'aria-sort');
    cy.get(button).should('not.have.attr', 'role');
  });

  it('consumer classes override computed root styles and preserve static slot classes', () => {
    const Custom = () => {
      const styles = useOverrides();
      return (
        <FluentProvider theme={teamsLightTheme}>
          <Fixture>
            <TableHeaderCell
              data-testid="header"
              className={styles.root}
              button={{ className: 'custom-button' }}
              sortIcon={{ className: 'custom-icon', children: 'Arrow' }}
              aside={{ className: 'custom-aside', children: 'Resize' }}
            >
              File
            </TableHeaderCell>
          </Fixture>
        </FluentProvider>
      );
    };
    mount(<Custom />);
    cy.get(cell).should('have.class', 'fui-TableHeaderCell');
    cy.get(cell).should('have.css', 'font-weight', String(teamsLightTheme.fontWeightBold));
    cy.get(cell).should('have.css', 'padding-left', teamsLightTheme.spacingHorizontalXXL);
    cy.get(button).should('have.class', 'custom-button').and('have.class', 'fui-TableHeaderCell__button');
    cy.get(icon).should('have.class', 'custom-icon').and('have.text', 'Arrow');
    cy.get(`${cell} .fui-TableHeaderCell__aside`).should('have.class', 'custom-aside');
  });
});

describe('TableHeaderCell documented scenarios', () => {
  for (const noNativeElements of modes) {
    const mode = noNativeElements ? 'div' : 'th';
    it(`renders a noninteractive named header with valid table structure (${mode})`, () => {
      render({ children: 'File' }, { noNativeElements });
      cy.get(cell).should('have.prop', 'tagName', mode.toUpperCase()).and('have.text', 'File');
      cy.get(cell).should('not.have.attr', 'aria-sort');
      cy.get(cell).should('not.have.attr', 'tabindex');
      cy.get(button).should('not.have.attr', 'role');
      cy.get(button).should('not.have.attr', 'tabindex');
      cy.get(icon).should('not.exist');
      cy.get('.fui-TableHeader').should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'THEAD');
      cy.get(cell)
        .parent()
        .should('have.prop', 'tagName', noNativeElements ? 'DIV' : 'TR');
      if (noNativeElements) {
        cy.get(cell).should('have.attr', 'role', 'columnheader');
      }
    });
  }
});

const GridFixture = ({ noNativeElements }: { noNativeElements: boolean }) => {
  const navigation = useArrowNavigationGroup({ axis: 'grid' });
  return (
    <FluentProvider theme={teamsLightTheme}>
      <button data-testid="before">Before</button>
      <Table {...navigation} aria-label="Files grid" role="grid" sortable noNativeElements={noNativeElements}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell data-testid="header">File</TableHeaderCell>
            <TableHeaderCell data-testid="peer">Owner</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell role="gridcell" tabIndex={0} data-testid="data">
              Report
            </TableCell>
            <TableCell role="gridcell" tabIndex={0}>
              Ada
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <button data-testid="after">After</button>
    </FluentProvider>
  );
};

describe('TableHeaderCell edges and accessibility', () => {
  for (const noNativeElements of modes) {
    const mode = noNativeElements ? 'div' : 'th';
    for (const href of [undefined, '#files'] as const) {
      it(`supports anchor button slot ${
        href ? 'with native link semantics' : 'with ARIA button semantics'
      } (${mode})`, () => {
        const activate = cy.stub().as('anchor');
        render(
          {
            children: 'File',
            sortable: true,
            button: {
              as: 'a',
              href,
              onClick: e => {
                e.preventDefault();
                activate(e.type);
              },
            },
          },
          { noNativeElements },
        );
        cy.get(button).should('have.prop', 'tagName', 'A');
        if (href) {
          cy.get(button).should('have.attr', 'href', href);
          cy.get(button).should('not.have.attr', 'role');
        } else {
          cy.get(button).should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
        }
        cy.get('[data-testid="before"]').focus();
        cy.realPress('Tab');
        cy.get(button).should('be.focused').click();
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('@anchor').should('have.been.calledThrice').and('always.have.been.calledWith', 'click');
        cy.get(cell).should('have.attr', 'aria-sort', 'none');
        cy.get('.fui-TableBody').should('have.text', 'ReportAda');
      });
    }
    it(`disabled anchor removes navigation and prevents pointer and keyboard activation (${mode})`, () => {
      const activate = cy.stub().as('disabledLink');
      render(
        {
          children: 'File',
          sortable: true,
          button: { as: 'a', href: '#files', disabled: true, onClick: activate },
        },
        { noNativeElements },
      );
      cy.get(button).should('have.attr', 'role', 'link').and('have.attr', 'aria-disabled', 'true');
      cy.get(button).should('not.have.attr', 'href');
      cy.get(button).should('not.have.attr', 'tabindex');
      cy.get(button).realClick().trigger('keydown', { key: 'Enter' }).trigger('keyup', { key: ' ' });
      cy.get('@disabledLink').should('not.have.been.called');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
    });
    for (const as of ['div', 'button'] as const) {
      it(`disabled ${as} sort button blocks pointer/keyboard and leaves tab order (${mode})`, () => {
        const onClick = cy.stub().as('disabled');
        const rootClick = cy.stub().as('root');
        render(
          { children: 'File', onClick: rootClick, button: { as, disabled: true, onClick } },
          { noNativeElements, sortable: true },
        );
        if (as === 'button') {
          cy.get(button).should('be.disabled');
        } else {
          cy.get(button).should('have.attr', 'aria-disabled', 'true');
          cy.get(button).should('not.have.attr', 'tabindex');
        }
        cy.get(button).realClick();
        cy.get('[data-testid="before"]').focus();
        cy.realPress('Tab');
        cy.get('[data-testid="peer"] .fui-TableHeaderCell__button').should('be.focused');
        if (as === 'div') {
          cy.get(button).trigger('keydown', { key: 'Enter' }).trigger('keyup', { key: ' ' });
        }
        cy.get('@disabled').should('not.have.been.called');
        cy.get('@root').should('not.have.been.called');
      });

      it(`disabledFocusable ${as} remains reachable but blocks activation (${mode})`, () => {
        const onClick = cy.stub().as('disabledFocusable');
        render(
          { children: 'File', button: { as, disabledFocusable: true, onClick } },
          { noNativeElements, sortable: true },
        );
        cy.get(button).should('have.attr', 'aria-disabled', 'true');
        if (as === 'button') {
          cy.get(button).should('not.be.disabled');
        }
        cy.get('[data-testid="before"]').focus();
        cy.realPress('Tab');
        cy.get(button).should('be.focused').click();
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('@disabledFocusable').should('not.have.been.called');
      });
    }

    it(`respects prevented keyboard defaults and separate slot/root handlers (${mode})`, () => {
      const rootClick = cy.stub().as('root');
      const slotClick = cy.stub().as('slot');
      const keydown = cy.stub().as('keydown');
      render(
        {
          children: 'File',
          sortable: true,
          onClick: rootClick,
          button: {
            as: 'div',
            onClick: slotClick,
            onKeyDown: e => {
              keydown(e.key);
              e.preventDefault();
            },
            onKeyUp: e => e.preventDefault(),
          },
        },
        { noNativeElements },
      );
      cy.get(button).focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@keydown').should('have.been.calledWith', 'Enter').and('have.been.calledWith', ' ');
      cy.get('@slot').should('not.have.been.called');
      cy.get('@root').should('not.have.been.called');
      cy.get(button).click();
      cy.get('@slot').should('have.been.calledOnce');
      cy.get('@root').should('have.been.calledOnce');
      cy.get('@root').then(stub => {
        const event = (stub as unknown as sinon.SinonStub).firstCall.args[0];
        expect(event.target.closest('.fui-TableHeaderCell__button')).not.to.equal(null);
      });
    });

    it(`tabs through sort buttons and aside, not passive headers (${mode})`, () => {
      render(
        { children: 'File', sortable: true, aside: <button data-testid="resize">Resize File</button> },
        { noNativeElements },
      );
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(button).should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="resize"]').should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="resize"]').should('be.focused');
    });

    it(`keyboard focus produces a root focus-within outline and blur removes it (${mode})`, () => {
      render({ children: 'File', sortable: true }, { noNativeElements });
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(button).should('be.focused');
      cy.get(cell).should('have.css', 'outline-style', 'solid');
      cy.get(cell).should('have.css', 'outline-width', '2px');
      cy.get(button).should('have.css', 'outline-style', 'none');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.get(cell).should('have.css', 'outline-style', 'none');
    });

    it(`consumer-provided grid navigation moves between headers and data (${mode})`, () => {
      mount(<GridFixture noNativeElements={noNativeElements} />);
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(button).should('be.focused');
      cy.realPress('ArrowRight');
      cy.get('[data-testid="peer"] .fui-TableHeaderCell__button').should('be.focused');
      cy.realPress('ArrowLeft');
      cy.get(button).should('be.focused');
      cy.realPress('ArrowDown');
      cy.get('[data-testid="data"]').should('be.focused');
      cy.realPress('ArrowUp');
      cy.get(button).should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
    });

    it(`retains accessible naming, descriptions and sort narration without WCAG violations (${mode})`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <span id="file-name">File</span>
          <span id="file-help">Activate to sort files</span>
          <Fixture noNativeElements={noNativeElements} sortable>
            <TableHeaderCell
              data-testid="header"
              sortDirection="ascending"
              aria-describedby="file-help"
              button={{ 'aria-labelledby': 'file-name', 'aria-describedby': 'file-help' }}
            >
              File
            </TableHeaderCell>
          </Fixture>
        </FluentProvider>,
      );
      cy.get(button)
        .should('have.attr', 'aria-labelledby', 'file-name')
        .and('have.attr', 'aria-describedby', 'file-help');
      cy.get(cell).should('have.attr', 'aria-sort', 'ascending');
      cy.get(button).should($button => {
        const owner = $button[0].ownerDocument;
        expect(owner.getElementById($button.attr('aria-labelledby')!)?.textContent).to.equal('File');
        expect(owner.getElementById($button.attr('aria-describedby')!)?.textContent).to.equal('Activate to sort files');
      });
      cy.get('.fui-Table').then($table =>
        axe
          .run($table[0], {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
          })
          .then(result => expect(result.violations, 'WCAG violations').to.deep.equal([])),
      );
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      for (const size of ['medium', 'small', 'extra-small'] as const) {
        it(`lays out label, icon, aside and peer in ${dir}, density=${size} (${mode})`, () => {
          render(
            {
              children: <span data-testid="label">File</span>,
              sortable: true,
              sortDirection: 'ascending',
              aside: <span data-testid="aside">Resize</span>,
            },
            { noNativeElements, size },
            dir,
          );
          cy.get(button).should('have.css', 'display', 'flex').and('have.css', 'min-height', '32px');
          cy.get(cell).should('have.css', 'display', noNativeElements ? 'flex' : 'table-cell');
          cy.get(cell).should($cell => {
            const root = $cell[0];
            const label = root.querySelector('[data-testid="label"]')!.getBoundingClientRect();
            const arrow = root.querySelector('.fui-TableHeaderCell__sortIcon')!.getBoundingClientRect();
            const first = root.getBoundingClientRect();
            const peer = root.parentElement!.querySelector('[data-testid="peer"]')!.getBoundingClientRect();
            const aside = root.querySelector('[data-testid="aside"]')!.getBoundingClientRect();
            expect(first.height).to.be.at.least(32);
            expect(label.width).to.be.greaterThan(0);
            expect(arrow.width).to.equal(12);
            expect(aside.width).to.be.greaterThan(0);
            if (dir === 'ltr') {
              expect(label.right).to.be.at.most(arrow.left);
              expect(arrow.left - label.right, 'LTR label-icon token gap').to.be.closeTo(
                parseFloat(teamsLightTheme.spacingHorizontalXS),
                0.5,
              );
              expect(first.right).to.be.at.most(peer.left + 1);
            } else {
              expect(arrow.right).to.be.at.most(label.left);
              expect(label.left - arrow.right, 'RTL label-icon token gap').to.be.closeTo(
                parseFloat(teamsLightTheme.spacingHorizontalXS),
                0.5,
              );
              expect(peer.right).to.be.at.most(first.left + 1);
            }
          });
        });
      }
    }

    it(`supports root/button/sortIcon/aside render functions without losing native semantics (${mode})`, () => {
      const activate = cy.stub().as('renderFunctionActivate');
      const rootRender: SlotRenderFunction<ExtractSlotProps<TableHeaderCellSlots['root']>> = (Component, props) =>
        React.createElement<React.HTMLAttributes<HTMLElement>>(
          Component,
          Object.assign({}, props, { 'data-render': 'root' }),
        );
      const buttonRender: SlotRenderFunction<ExtractSlotProps<TableHeaderCellSlots['button']>> = (Component, props) =>
        React.createElement<React.HTMLAttributes<HTMLElement>>(
          Component,
          Object.assign({}, props, { 'data-render': 'button' }),
          <>
            <strong data-testid="rendered-label">File</strong>
            {props.children}
          </>,
        );
      const iconRender: SlotRenderFunction<ExtractSlotProps<TableHeaderCellSlots['sortIcon']>> = (Component, props) => (
        <Component {...props} data-render="icon" />
      );
      const asideRender: SlotRenderFunction<ExtractSlotProps<TableHeaderCellSlots['aside']>> = (Component, props) => (
        <Component {...props} data-render="aside">
          Resize
        </Component>
      );
      render(
        {
          sortable: true,
          sortDirection: 'ascending',
          children: rootRender,
          button: { as: 'div', children: buttonRender, onClick: activate },
          sortIcon: { children: iconRender },
          aside: { children: asideRender },
        },
        { noNativeElements },
      );
      cy.get(cell).should('have.attr', 'data-render', 'root').and('have.prop', 'tagName', mode.toUpperCase());
      cy.get(button).should('have.attr', 'data-render', 'button').and('have.attr', 'role', 'button');
      cy.get(icon).should('have.attr', 'data-render', 'icon').find('svg').should('exist');
      cy.get(`${cell} .fui-TableHeaderCell__aside`)
        .should('have.attr', 'data-render', 'aside')
        .and('have.text', 'Resize');
      cy.get('[data-testid="rendered-label"]').should('have.text', 'File').click();
      cy.get(button).focus();
      cy.realPress('Enter');
      cy.get('@renderFunctionActivate').should('have.been.calledTwice');
    });
  }
});

describe('TableHeaderCell documented sorting and native props', () => {
  for (const noNativeElements of modes) {
    const mode = noNativeElements ? 'div' : 'th';
    it(`maps default arrow geometry to the supplied direction with independent icon controls (${mode})`, () => {
      let update: React.Dispatch<React.SetStateAction<TableHeaderCellProps['sortDirection']>>;
      let ascendingPaths: Array<string | null>;
      let descendingPaths: Array<string | null>;
      const Dynamic = () => {
        const [sortDirection, setSortDirection] = React.useState<TableHeaderCellProps['sortDirection']>('ascending');
        update = setSortDirection;
        return (
          <FluentProvider theme={teamsLightTheme}>
            <ArrowUpRegular data-testid="ascending-control" fontSize={12} />
            <ArrowDownRegular data-testid="descending-control" fontSize={12} />
            <Fixture noNativeElements={noNativeElements} sortable>
              <TableHeaderCell data-testid="header" sortDirection={sortDirection}>
                File
              </TableHeaderCell>
            </Fixture>
          </FluentProvider>
        );
      };
      mount(<Dynamic />);
      cy.get('[data-testid="ascending-control"] path').then($paths => {
        ascendingPaths = [...$paths].map(path => path.getAttribute('d'));
        expect(ascendingPaths).not.to.be.empty;
        ascendingPaths.forEach(value => expect(value).to.be.a('string').and.not.be.empty);
      });
      cy.get('[data-testid="descending-control"] path').then($paths => {
        descendingPaths = [...$paths].map(path => path.getAttribute('d'));
        expect(descendingPaths).not.to.be.empty;
        descendingPaths.forEach(value => expect(value).to.be.a('string').and.not.be.empty);
        expect(descendingPaths, 'independent up/down controls differ').not.to.deep.equal(ascendingPaths);
      });
      cy.get(cell).should('have.attr', 'aria-sort', 'ascending');
      cy.get(icon).find('svg').should('have.attr', 'aria-hidden', 'true');
      cy.get(icon)
        .find('path')
        .should($paths =>
          expect(
            [...$paths].map(path => path.getAttribute('d')),
            'ascending uses ArrowUpRegular',
          ).to.deep.equal(ascendingPaths),
        );
      cy.then(() => update('descending'));
      cy.get(cell).should('have.attr', 'aria-sort', 'descending');
      cy.get(icon)
        .find('path')
        .should($paths =>
          expect(
            [...$paths].map(path => path.getAttribute('d')),
            'descending uses ArrowDownRegular',
          ).to.deep.equal(descendingPaths),
        );
      cy.then(() => update(undefined));
      cy.get(cell).should('have.attr', 'aria-sort', 'none');
      cy.get(icon).should('not.exist');
      cy.get('[data-testid="ascending-control"], [data-testid="descending-control"]').should('have.length', 2);
      cy.get('.fui-TableBody').should('have.text', 'ReportAda');
    });

    for (const sortDirection of [undefined, 'ascending', 'descending'] as const) {
      it(`renders sort narration and arrow for ${sortDirection ?? 'none'} (${mode})`, () => {
        render({ children: 'File', sortDirection }, { noNativeElements, sortable: true });
        cy.get(cell).should('have.attr', 'aria-sort', sortDirection ?? 'none');
        cy.get(button).should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
        if (sortDirection) {
          cy.get(icon).find('svg').should('have.attr', 'aria-hidden', 'true');
          cy.get(icon).find('svg').should('have.css', 'width', '12px');
          cy.get(icon).find('path').invoke('attr', 'd').should('be.a', 'string').and('not.be.empty');
        } else {
          cy.get(icon).should('not.exist');
        }
      });
    }

    for (const sortable of modes) {
      it(`cell sortable=${sortable} overrides inverse table context (${mode})`, () => {
        render({ children: 'File', sortable, sortDirection: 'ascending' }, { noNativeElements, sortable: !sortable });
        cy.get(icon).find('svg').should('exist');
        if (sortable) {
          cy.get(cell).should('have.attr', 'aria-sort', 'ascending');
          cy.get(button).should('have.attr', 'role', 'button');
          cy.get('[data-testid="peer"]').should('not.have.attr', 'aria-sort');
        } else {
          cy.get(cell).should('not.have.attr', 'aria-sort');
          cy.get(button).should('not.have.attr', 'role');
          cy.get('[data-testid="peer"]').should('have.attr', 'aria-sort', 'none');
        }
      });
    }

    it(`activates sorting through click, Enter and Space without owning data/state (${mode})`, () => {
      const onClick = cy.stub().as('activate');
      render({ children: 'File', onClick }, { noNativeElements, sortable: true });
      cy.get(button).click().focus();
      cy.get('@activate').should('have.been.calledOnce');
      cy.realPress('Enter');
      cy.get('@activate').should('have.been.calledTwice');
      cy.realPress('Space');
      cy.get('@activate').should('have.been.calledThrice');
      cy.get('@activate').then(stub => {
        const calls = (stub as unknown as sinon.SinonStub).getCalls();
        expect(calls.map(call => call.args[0].type)).to.deep.equal(['click', 'click', 'click']);
      });
      cy.get(cell).should('have.attr', 'aria-sort', 'none');
      cy.get('.fui-TableBody').should('have.text', 'ReportAda');
    });

    it(`supports native button slot keyboard semantics (${mode})`, () => {
      const onClick = cy.stub().as('native');
      render(
        { children: 'File', button: { as: 'button', type: 'button', onClick } },
        { noNativeElements, sortable: true },
      );
      cy.get(button).should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button').focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get(button).click();
      cy.get('@native').should('have.been.calledThrice');
    });

    it(`allows custom and suppressed sort icons and trailing aside (${mode})`, () => {
      render(
        { children: 'File', sortDirection: 'descending', sortIcon: 'Custom arrow', aside: 'Resize' },
        { noNativeElements, sortable: true },
      );
      cy.get(icon).should('have.text', 'Custom arrow').find('svg').should('not.exist');
      cy.get(button).should('have.text', 'FileCustom arrow');
      cy.get(cell).children().last().should('have.class', 'fui-TableHeaderCell__aside').and('have.text', 'Resize');
      render({ children: 'File', sortDirection: 'ascending', sortIcon: null }, { noNativeElements, sortable: true });
      cy.get(icon).should('not.exist');
      cy.get(cell).should('have.attr', 'aria-sort', 'ascending');
    });
  }

  for (const noNativeElements of modes) {
    for (const as of ['th', 'div'] as const) {
      it(`explicit as=${as} wins over context noNativeElements=${noNativeElements}`, () => {
        const header = (
          <TableHeaderCell data-testid="header" as={as}>
            File
          </TableHeaderCell>
        );
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <TableContextProvider value={{ ...tableContextDefaultValue, noNativeElements }}>
              {as === 'th' ? (
                <table>
                  <thead>
                    <tr>{header}</tr>
                  </thead>
                </table>
              ) : (
                <div role="table">
                  <div role="rowgroup">
                    <div role="row">{header}</div>
                  </div>
                </div>
              )}
            </TableContextProvider>
          </FluentProvider>,
        );
        cy.get(cell).should('have.prop', 'tagName', as.toUpperCase());
        cy.get(cell).should('have.css', 'display', noNativeElements ? 'flex' : 'table-cell');
        if (as === 'div') {
          cy.get(cell).should('have.attr', 'role', 'columnheader');
        } else {
          cy.get(cell).should('not.have.attr', 'role');
        }
      });
    }
  }

  it('preserves native spans, scope, abbreviation, header relationships and refs', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const buttonRef = React.createRef<HTMLButtonElement>();
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <table aria-label="Spanning headers">
          <thead>
            <tr>
              <th id="group" colSpan={2}>
                Group
              </th>
            </tr>
            <tr>
              <TableHeaderCell
                data-testid="header"
                ref={rootRef}
                id="file"
                colSpan={2}
                rowSpan={2}
                scope="colgroup"
                abbr="Doc"
                headers="group"
                button={{ as: 'button', type: 'button', ref: buttonRef }}
              >
                Document
              </TableHeaderCell>
            </tr>
            <tr />
          </thead>
          <tbody>
            <tr>
              <td headers="file">Report</td>
              <td headers="file">Notes</td>
            </tr>
          </tbody>
        </table>
      </FluentProvider>,
    );
    cy.get(cell)
      .should('have.attr', 'colspan', '2')
      .and('have.attr', 'rowspan', '2')
      .and('have.attr', 'scope', 'colgroup')
      .and('have.attr', 'abbr', 'Doc')
      .and('have.attr', 'headers', 'group');
    cy.get(cell).then($cell => expect(rootRef.current).to.equal($cell[0]));
    cy.get(button).then($button => expect(buttonRef.current).to.equal($button[0]));
    cy.get('td[headers="file"]').should('have.length', 2);
  });
});
