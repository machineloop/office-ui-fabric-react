import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../index';
import { TableBody } from './TableBody';
import type { TableBodyProps } from './TableBody.types';
import { Default } from '../../../../stories/src/Table/Default.stories';
import { NonNativeElements } from '../../../../stories/src/Table/NonNativeElements.stories';
import { SizeSmall } from '../../../../stories/src/Table/SizeSmall.stories';
import { SizeExtraSmall } from '../../../../stories/src/Table/SizeExtraSmall.stories';
import { FocusableElementsInCells } from '../../../../stories/src/Table/FocusableElements.Cells.stories';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const header = (
  <TableHeader>
    <TableRow>
      <TableHeaderCell>Name</TableHeaderCell>
      <TableHeaderCell>Action</TableHeaderCell>
    </TableRow>
  </TableHeader>
);
const rows = (values = ['a', 'b']) =>
  values.map(value => (
    <TableRow id={`row-${value}`} key={value}>
      <TableCell>{value}</TableCell>
      <TableCell>
        <button id={`action-${value}`} type="button">
          Action {value}
        </button>
      </TableCell>
    </TableRow>
  ));
const body = (props: TableBodyProps = {}, noNativeElements = false) =>
  render(
    <Table id="table" aria-label="Items" noNativeElements={noNativeElements}>
      {header}
      <TableBody id="body" {...props}>
        {rows()}
      </TableBody>
    </Table>,
  );

describe('TableBody documented rowgroup contracts', () => {
  it('renders the default story as one native body with the complete rows and named table', () => {
    render(<Default />);
    cy.get('tbody.fui-TableBody').should('have.length', 1).find('tr').should('have.length', 4);
    cy.get('tbody.fui-TableBody tr').first().find('td').should('have.length', 4);
    cy.get('table').should($node => expect(computeAccessibleName($node[0])).to.equal('Default table'));
  });

  it('renders the documented nonnative body as a block rowgroup with native-free row and cell semantics', () => {
    render(<NonNativeElements />);
    cy.get('.fui-TableBody')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'rowgroup')
      .and('have.css', 'display', 'block');
    cy.get('.fui-TableBody > [role="row"]').should('have.length', 4);
    cy.get('.fui-TableBody > [role="row"]').first().find('[role="cell"]').should('have.length', 4);
    cy.get('table, tbody, tr, td').should('not.exist');
  });

  it('preserves documented small and extra-small row density through the body', () => {
    render(
      <>
        <SizeSmall />
        <SizeExtraSmall />
      </>,
    );
    cy.get('.fui-TableBody')
      .eq(0)
      .find('tr')
      .first()
      .then($small => {
        cy.get('.fui-TableBody')
          .eq(1)
          .find('tr')
          .first()
          .should($extra => {
            expect($small[0].getBoundingClientRect().height).to.be.greaterThan(
              $extra[0].getBoundingClientRect().height,
            );
          });
      });
    cy.get('.fui-TableBody').each($body => cy.wrap($body).find('tr').should('have.length', 4));
  });

  it('preserves documented focusable cell entry and Escape return within the body', () => {
    render(<FocusableElementsInCells />);
    cy.get('.fui-TableBody tr').first().find('[role="gridcell"]').last().focus();
    cy.realPress('Enter');
    cy.get('.fui-TableBody tr').first().find('button[aria-label="Edit"]').should('have.focus');
    cy.realPress('Escape');
    cy.get('.fui-TableBody tr').first().find('[role="gridcell"]').last().should('have.focus');
  });
});

describe('TableBody native interaction and rowgroup boundaries', () => {
  for (const noNative of [false, true]) {
    it(`preserves forward/reverse native tab order and descendant activation with noNativeElements=${noNative}`, () => {
      const click = cy.spy().as('click');
      render(
        <Table aria-label="Items" noNativeElements={noNative}>
          {header}
          <TableBody id="body" onClick={event => click(event.currentTarget.id)}>
            {rows()}
          </TableBody>
        </Table>,
      );
      cy.get('#action-a').focus();
      cy.realPress('Tab');
      cy.get('#action-b').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#action-a').should('have.focus');
      cy.realPress('Enter');
      cy.get('@click').should('have.been.calledOnce').its('firstCall.args.0').should('equal', 'body');
    });

    it(`keeps native event bubbling and consumer key handlers without introducing rowgroup keyboard actions in ${
      noNative ? 'div' : 'native'
    } mode`, () => {
      const key = cy.spy().as('key');
      const click = cy.spy().as('click');
      body({ onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => key(event.key), onClick: click }, noNative);
      cy.get('#action-a').focus();
      cy.realPress('Escape');
      cy.get('@key').should('have.been.calledOnce').its('firstCall.args.0').should('equal', 'Escape');
      cy.get('@click').should('not.have.been.called');
      cy.get('#action-a').realClick();
      cy.get('@click').should('have.been.calledOnce');
      cy.get('#row-a').should('exist');
    });
  }

  it('preserves native header/body column alignment through actual browser table layout', () => {
    body();
    cy.get('thead th').then($headers => {
      cy.get('#body tr')
        .first()
        .find('td')
        .should($cells => {
          expect($cells).to.have.length($headers.length);
          for (let index = 0; index < $cells.length; index++) {
            const header = $headers[index].getBoundingClientRect();
            const cell = $cells[index].getBoundingClientRect();
            expect(cell.left).to.be.closeTo(header.left, 0.5);
            expect(cell.width).to.be.closeTo(header.width, 0.5);
          }
        });
    });
  });

  it('renders multiple independent native bodies without moving rows into the header', () => {
    render(
      <Table aria-label="Groups">
        {header}
        <TableBody id="one">{rows(['a'])}</TableBody>
        <TableBody id="two">{rows(['b'])}</TableBody>
      </Table>,
    );
    cy.get('tbody').should('have.length', 2);
    cy.get('#one').find('tr').should('have.length', 1).and('have.id', 'row-a');
    cy.get('#two').find('tr').should('have.length', 1).and('have.id', 'row-b');
    cy.get('thead').find('tr').should('have.length', 1);
  });

  it('honors an explicitly requested native tbody without div-only default metadata', () => {
    body({ as: 'tbody' });
    cy.get('#body').should('have.prop', 'tagName', 'TBODY');
    cy.get('#body').should('not.have.attr', 'role');
    cy.get('#body').should('have.css', 'display', 'table-row-group');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`keeps body direction and native focus access aligned with ${dir}`, () => {
      render(
        <Table aria-label="Items">
          {header}
          <TableBody id="body">{rows()}</TableBody>
        </Table>,
        dir,
      );
      cy.get('#body').should('have.css', 'direction', dir);
      cy.get('#action-a').focus();
      cy.realPress('Tab');
      cy.get('#action-b').should('have.focus');
    });
  }

  it('passes ordinary axe rules for the complete named semantic table containing the body', () => {
    body();
    cy.get('#table').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});

describe('TableBody source and conformance lifecycle contracts', () => {
  it('forwards native root metadata, custom classes/styles and an explicit caller rowgroup role', () => {
    const props: TableBodyProps & { 'data-owner': string } = {
      className: 'custom-body',
      title: 'Items',
      role: 'rowgroup',
      'data-owner': 'items',
      style: { opacity: 0.9 },
    };
    body(props);
    cy.get('#body')
      .should('have.class', 'fui-TableBody')
      .and('have.class', 'custom-body')
      .and('have.attr', 'title', 'Items')
      .and('have.attr', 'data-owner', 'items')
      .and('have.attr', 'role', 'rowgroup')
      .and('have.css', 'opacity', '0.9');
  });

  it('keeps object refs attached to the actual native section and clears them after committed removal', () => {
    const ref = React.createRef<HTMLTableSectionElement>();
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
          <Table aria-label="Items">
            {header}
            {show && (
              <TableBody id="body" ref={ref}>
                {rows()}
              </TableBody>
            )}
          </Table>
        </>
      );
    };
    render(<Owner />);
    cy.get('#body').should($node => expect(ref.current).to.equal($node[0]));
    cy.get('#remove').realClick();
    cy.get('#body')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('forwards callback refs for the actual nonnative group and its unmount cleanup', () => {
    const ref = cy.spy().as('ref');
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
          <Table noNativeElements aria-label="Items">
            {header}
            {show && (
              <TableBody id="body" ref={ref}>
                {rows()}
              </TableBody>
            )}
          </Table>
        </>
      );
    };
    render(<Owner />);
    cy.get('#body').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
    cy.get('#remove').realClick();
    cy.get('#body').should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
  });

  it('retains the same body through keyed row reorder, removal and restoration', () => {
    const Owner = () => {
      const [values, setValues] = React.useState(['a', 'b']);
      return (
        <>
          <button id="reorder" onClick={() => setValues(['b', 'a'])}>
            Reorder
          </button>
          <button id="remove" onClick={() => setValues(['b'])}>
            Remove
          </button>
          <button id="restore" onClick={() => setValues(['a', 'b'])}>
            Restore
          </button>
          <Table aria-label="Items">
            {header}
            <TableBody id="body">{rows(values)}</TableBody>
          </Table>
        </>
      );
    };
    render(<Owner />);
    cy.get('#body').then($body =>
      cy.get('#row-a').then($row => {
        cy.get('#reorder').realClick();
        cy.get('#body > .fui-TableRow').first().should('have.id', 'row-b');
        cy.get('#row-a').should($current => expect($current[0]).to.equal($row[0]));
        cy.get('#remove').realClick();
        cy.get('#row-a').should('not.exist');
        cy.get('#restore').realClick();
        cy.get('#body').should($current => expect($current[0]).to.equal($body[0]));
        cy.get('#body > .fui-TableRow').should('have.length', 2);
      }),
    );
  });

  it('supports an empty and restored body without inventing placeholder rows or resetting the root', () => {
    const Owner = () => {
      const [empty, setEmpty] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setEmpty(value => !value)}>
            Update
          </button>
          <Table aria-label="Items">
            {header}
            <TableBody id="body">{empty ? [] : rows()}</TableBody>
          </Table>
        </>
      );
    };
    render(<Owner />);
    cy.get('#body').then($original => {
      cy.get('#update').realClick();
      cy.get('#body').children().should('have.length', 0);
      cy.get('#body').should($current => expect($current[0]).to.equal($original[0]));
      cy.get('thead th').should('have.length', 2);
      cy.get('#update').realClick();
      cy.get('#body tr').should('have.length', 2);
    });
  });

  it('updates context-native rendering and density rather than retaining stale rowgroup layout', () => {
    const Owner = () => {
      const [div, setDiv] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setDiv(value => !value)}>
            Update
          </button>
          <Table noNativeElements={div} size={div ? 'extra-small' : 'medium'} aria-label="Items">
            {header}
            <TableBody id="body">{rows()}</TableBody>
          </Table>
        </>
      );
    };
    render(<Owner />);
    cy.get('#body').should('have.prop', 'tagName', 'TBODY').and('have.css', 'display', 'table-row-group');
    cy.get('#row-a').then($row => {
      const height = $row[0].getBoundingClientRect().height;
      cy.get('#update').realClick();
      cy.get('#body')
        .should('have.prop', 'tagName', 'DIV')
        .and('have.attr', 'role', 'rowgroup')
        .and('have.css', 'display', 'block');
      cy.get('#row-a').should($current => expect($current[0].getBoundingClientRect().height).to.be.lessThan(height));
      cy.get('#update').realClick();
      cy.get('#body').should('have.prop', 'tagName', 'TBODY').and('have.css', 'display', 'table-row-group');
    });
  });

  it('replaces root event handlers without recreating rows or their focused descendants', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <Table aria-label="Items">
            {header}
            <TableBody id="body" onClick={updated ? second : first}>
              {rows()}
            </TableBody>
          </Table>
        </>
      );
    };
    render(<Owner />);
    cy.get('#action-a').realClick();
    cy.get('@first').should('have.been.calledOnce');
    cy.get('#body').then($original => {
      cy.get('#update').realClick();
      cy.get('#body').should($current => expect($current[0]).to.equal($original[0]));
      cy.get('#action-b').focus();
      cy.realPress('Space');
      cy.get('@second').should('have.been.calledOnce');
      cy.get('@first').should('have.been.calledOnce');
      cy.get('#action-b').should('have.focus');
    });
  });

  it('uses default table context in a valid native host when no Fluent Table provider exists', () => {
    render(
      <table aria-label="Default context">
        <thead>
          <tr>
            <th>Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <TableBody id="body">
          <tr>
            <td>Item</td>
            <td>
              <button id="action" type="button">
                Action
              </button>
            </td>
          </tr>
        </TableBody>
      </table>,
    );
    cy.get('#body').should('have.prop', 'tagName', 'TBODY').and('have.css', 'display', 'table-row-group');
    cy.get('#action').focus().should('have.focus');
  });
});
