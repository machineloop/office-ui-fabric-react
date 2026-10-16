import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Table, TableHeader, TableRow, TableHeaderCell } from '@fluentui/react-table';
import { Default } from '../../../../stories/src/Table/Default.stories';
import { NonNativeElements } from '../../../../stories/src/Table/NonNativeElements.stories';
import { Sort } from '../../../../stories/src/Table/Sort.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);

describe('TableHeader unit-contract browser regressions', () => {
  it('forwards native root refs, attributes, classes and bubbled events', () => {
    const ref = React.createRef<HTMLTableSectionElement>();
    const click = cy.stub().as('click');
    mount(
      <Table aria-label="Example">
        <TableHeader ref={ref} id="native-header" title="Header title" className="custom-header" onClick={click}>
          <TableRow>
            <TableHeaderCell>Header</TableHeaderCell>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    cy.get('#native-header').should('have.class', 'custom-header').and('have.attr', 'title', 'Header title');
    cy.get('#native-header').then($root => expect(ref.current).to.equal($root[0]));
    cy.contains('th', 'Header').click();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('supports an explicit div root with consumer rowgroup labeling', () => {
    mount(
      <Table noNativeElements aria-label="Example">
        <TableHeader as="div" id="div-header" aria-label="Columns">
          <TableRow>
            <TableHeaderCell>Header</TableHeaderCell>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    cy.get('#div-header')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'rowgroup')
      .and('have.attr', 'aria-label', 'Columns');
    cy.get('#div-header [role="columnheader"]').should('have.text', 'Header');
  });

  it('updates header content while preserving the forwarded native node and latest handler', () => {
    const ref = React.createRef<HTMLTableSectionElement>();
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <Table aria-label="Example">
            <TableHeader ref={ref} id="update-header" onClick={updated ? latest : first}>
              <TableRow>
                <TableHeaderCell>{updated ? 'Updated' : 'Original'}</TableHeaderCell>
              </TableRow>
            </TableHeader>
          </Table>
        </>
      );
    };
    mount(<Example />);
    cy.get('#update-header').then($root => {
      const node = $root[0];
      cy.contains('button', 'Update').click();
      cy.contains('th', 'Updated').click();
      cy.get('#update-header').then($updated => expect($updated[0]).to.equal(node));
      cy.get('@first').should('not.have.been.called');
      cy.get('@latest').should('have.been.calledOnce');
    });
  });
});

describe('TableHeader implementation and accessibility edges', () => {
  it('does not add a tab stop but preserves sortable descendant keyboard order', () => {
    mount(
      <>
        <button>Before</button>
        <Sort />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.get('thead [role="button"]').eq(0).should('be.focused');
    cy.get('thead').should('not.have.attr', 'tabindex');
    cy.get('thead [role="button"]').eq(0).realPress('Tab');
    cy.get('thead [role="button"]').eq(1).should('be.focused');
  });

  it('uses native semantics for an explicit thead override', () => {
    mount(
      <Table aria-label="Example">
        <TableHeader as="thead" id="explicit-header">
          <TableRow>
            <TableHeaderCell>Header</TableHeaderCell>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    cy.get('#explicit-header').should('have.prop', 'tagName', 'THEAD');
    cy.get('#explicit-header').should('not.have.attr', 'role');
  });

  it('switches native and non-native context together with its row/header children', () => {
    const Example = () => {
      const [nonNative, setNonNative] = React.useState(false);
      return (
        <>
          <button onClick={() => setNonNative(value => !value)}>Toggle context</button>
          <Table noNativeElements={nonNative} aria-label="Example">
            <TableHeader id="dynamic-header">
              <TableRow>
                <TableHeaderCell>Header</TableHeaderCell>
              </TableRow>
            </TableHeader>
          </Table>
        </>
      );
    };
    mount(<Example />);
    cy.get('#dynamic-header').should('have.prop', 'tagName', 'THEAD');
    cy.contains('button', 'Toggle context').click();
    cy.get('#dynamic-header')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'rowgroup')
      .and('have.css', 'display', 'block');
    cy.get('#dynamic-header [role="columnheader"]').should('have.prop', 'tagName', 'DIV');
    cy.contains('button', 'Toggle context').click();
    cy.get('#dynamic-header').should('have.prop', 'tagName', 'THEAD');
    cy.get('#dynamic-header th').should('have.text', 'Header');
  });
});

describe('TableHeader documented compositions', () => {
  it('renders the native documented header row with four column headers', () => {
    mount(<Default />);
    cy.get('table > thead.fui-TableHeader').should('have.css', 'display', 'table-row-group');
    cy.get('thead > tr > th')
      .should('have.length', 4)
      .then($headers =>
        expect(Array.from($headers, header => header.textContent)).to.deep.equal([
          'File',
          'Author',
          'Last updated',
          'Last update',
        ]),
      );
    cy.get('table > tbody').should('exist');
  });

  it('uses non-native rowgroup/row/columnheader semantics and flex layout', () => {
    mount(<NonNativeElements />);
    cy.get('[role="table"] > .fui-TableHeader')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'rowgroup')
      .and('have.css', 'display', 'block');
    cy.get('.fui-TableHeader [role="row"]').should('have.length', 1);
    cy.get('.fui-TableHeader [role="columnheader"]').should('have.length', 4);
  });

  it('preserves actual sorting interactions across the header wrapper', () => {
    mount(<Sort />);
    cy.contains('thead th', 'File').should('have.attr', 'aria-sort', 'ascending').click();
    cy.contains('thead th', 'File').should('have.attr', 'aria-sort', 'descending');
    cy.get('tbody tr td:first-child').then($cells =>
      expect(Array.from($cells, cell => cell.textContent)).to.deep.equal([
        'Training recording',
        'Thursday presentation',
        'Purchase order',
        'Meeting notes',
      ]),
    );
    cy.contains('thead th', 'File').find('[role="button"]').focus().realPress('Enter');
    cy.contains('thead th', 'File').should('have.attr', 'aria-sort', 'ascending');
  });
});
