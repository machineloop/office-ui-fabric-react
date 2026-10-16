import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { List } from '../List/List';
import { ListItem } from './ListItem';
import { Default } from '../../../../stories/src/List/ListDefault.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const choices = (
  <>
    <ListItem value="one">One</ListItem>
    <ListItem value="two">Two</ListItem>
    <ListItem value="three">Three</ListItem>
  </>
);

describe('ListItem unit-derived contracts', () => {
  it('forwards native refs, attributes, classes and explicit element choices', () => {
    const li = React.createRef<HTMLLIElement>();
    const div = React.createRef<HTMLDivElement>();
    mount(
      <>
        <List>
          <ListItem as="li" ref={li} value="one" className="consumer" title="Location" aria-label="First">
            One
          </ListItem>
        </List>
        <List as="div">
          <ListItem as="div" ref={div} value="two">
            Two
          </ListItem>
        </List>
      </>,
    );
    cy.get('#one').should($root => {
      expect($root[0].tagName).to.equal('LI');
      expect(li.current).to.equal($root[0]);
      expect($root)
        .to.have.class('fui-ListItem')
        .and.have.class('consumer')
        .and.have.attr('title', 'Location')
        .and.have.attr('aria-label', 'First');
      expect($root).not.to.have.attr('disabledSelection');
    });
    cy.get('#two').should($root => {
      expect($root[0].tagName).to.equal('DIV');
      expect(div.current).to.equal($root[0]);
    });
  });
  it('supplies numeric action values and the original event in the action payload', () => {
    const action = cy.stub().as('action');
    mount(
      <List navigationMode="items">
        <ListItem value={42} onAction={action}>
          Answer
        </ListItem>
      </List>,
    );
    cy.get('[id="42"]').click();
    cy.get('@action')
      .should('have.been.calledOnce')
      .then(() => {
        const args = action.firstCall.args;
        expect(args[1].value).to.equal(42);
        expect(args[1].event).to.equal(args[0]);
        expect(args[0].detail.originalEvent.type).to.equal('click');
      });
  });
  it('respects root click and keydown prevention before invoking actions', () => {
    const action = cy.stub().as('action');
    mount(
      <List navigationMode="items">
        <ListItem
          value="one"
          onAction={action}
          onClick={ev => ev.preventDefault()}
          onKeyDown={ev => ev.preventDefault()}
        >
          One
        </ListItem>
      </List>,
    );
    cy.get('#one').click().realPress('Enter').realPress('Space');
    cy.get('@action').should('not.have.been.called');
  });
  it('merges checkmark props, ref and change callback with selection state', () => {
    const ref = React.createRef<HTMLInputElement>();
    const change = cy.stub().as('change');
    mount(
      <List selectionMode="multiselect">
        <ListItem
          value="one"
          checkmark={{ input: { ref, 'aria-label': 'Select One' }, className: 'custom-checkmark', onChange: change }}
        >
          One
        </ListItem>
      </List>,
    );
    cy.get('#one .fui-ListItem__checkmark').should('have.class', 'custom-checkmark');
    cy.get('#one input')
      .should($input => expect(ref.current).to.equal($input[0]))
      .check();
    cy.get('#one input').should('have.attr', 'aria-label', 'Select One').and('be.checked');
    cy.get('#one').should('have.attr', 'aria-selected', 'true');
    cy.get('@change').should('have.been.calledOnce');
  });
});

describe('ListItem accessibility and selection edges', () => {
  it('keeps disabled selection inert while permitting an explicitly supplied action', () => {
    const action = cy.stub().as('action');
    mount(
      <List selectionMode="multiselect">
        <ListItem value="one" disabledSelection>
          One
        </ListItem>
        <ListItem value="two" disabledSelection onAction={action}>
          Two
        </ListItem>
      </List>,
    );
    cy.get('#one').should('have.attr', 'aria-disabled', 'true');
    cy.get('#one input').should('be.disabled');
    cy.get('#one').click().should('have.attr', 'aria-selected', 'false');
    cy.get('#one').realPress('Space');
    cy.get('#one').should('have.attr', 'aria-selected', 'false');
    cy.get('#one').realPress('Enter');
    cy.get('#one').should('have.attr', 'aria-selected', 'false');
    cy.get('#two').click().should('have.attr', 'aria-selected', 'false');
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#two').realPress('Space');
    cy.get('#two').should('have.attr', 'aria-selected', 'false');
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#two').realPress('Enter');
    cy.get('#two').should('have.attr', 'aria-selected', 'false');
    cy.get('@action').should('have.callCount', 2);
  });
  it('does not route checkbox clicks into the primary action', () => {
    const action = cy.stub().as('action');
    mount(
      <List selectionMode="multiselect">
        <ListItem value="one" onAction={action}>
          One
        </ListItem>
      </List>,
    );
    cy.get('#one input').check();
    cy.get('#one').should('have.attr', 'aria-selected', 'true');
    cy.get('@action').should('not.have.been.called');
  });
  it('reports controlled selection requests without accepting rejected changes', () => {
    const change = cy.stub().as('change');
    mount(
      <List selectionMode="multiselect" selectedItems={['one']} onSelectionChange={change}>
        {choices}
      </List>,
    );
    cy.get('#two').click();
    cy.get('#one').should('have.attr', 'aria-selected', 'true');
    cy.get('#two').should('have.attr', 'aria-selected', 'false');
    cy.get('@change')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { selectedItems: ['one', 'two'] });
  });
  it('supports composite horizontal traversal and vertical escape to the next row', () => {
    mount(
      <>
        <button>Before</button>
        <List navigationMode="composite">
          <ListItem value="one">
            <span role="gridcell">
              <button>A</button>
            </span>
            <span role="gridcell">
              <button>B</button>
            </span>
          </ListItem>
          <ListItem value="two">
            <span role="gridcell">
              <button>C</button>
            </span>
          </ListItem>
        </List>
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.get('#one').should('be.focused').realPress('ArrowRight');
    cy.get('#one').contains('button', /^A$/).should('be.focused').realPress('ArrowRight');
    cy.get('#one').contains('button', /^B$/).should('be.focused').realPress('ArrowLeft');
    cy.get('#one').contains('button', /^A$/).should('be.focused').realPress('ArrowLeft');
    cy.get('#one').should('be.focused').realPress('ArrowRight');
    cy.get('#one').contains('button', /^A$/).realPress('ArrowDown');
    cy.get('#two').should('be.focused').realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
  });
});

describe('ListItem documented scenarios', () => {
  it('renders the noninteractive default story as seven native list items', () => {
    mount(<Default />);
    cy.get('ul .fui-ListItem')
      .should('have.length', 7)
      .each($item => {
        expect($item[0].tagName).to.equal('LI');
        expect($item).not.to.have.attr('tabindex');
      });
    cy.contains('.fui-ListItem', 'Asia').should('be.visible');
    cy.get('input[type="checkbox"]').should('not.exist');
  });
  it('supports item navigation and primary click/Enter/Space actions', () => {
    const action = cy.stub().as('action');
    mount(
      <>
        <button>Before</button>
        <List navigationMode="items">
          <ListItem value="one" onAction={action}>
            One
          </ListItem>
          <ListItem value="two">Two</ListItem>
        </List>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.get('#one').should('be.focused').click().realPress('Enter').realPress('Space');
    cy.get('@action').should('have.callCount', 3);
    cy.get('#one').realPress('ArrowDown');
    cy.get('#two').should('be.focused');
  });
  for (const selectionMode of ['single', 'multiselect'] as const) {
    it(`supports ${selectionMode} checkbox and Space selection`, () => {
      mount(<List selectionMode={selectionMode}>{choices}</List>);
      cy.get('#one').click().should('have.attr', 'aria-selected', 'true');
      cy.get('#two').focus().realPress('Space');
      cy.get('#two').should('have.attr', 'aria-selected', 'true');
      cy.get('#one').should('have.attr', 'aria-selected', selectionMode === 'single' ? 'false' : 'true');
      cy.get('#two input').should('be.checked').uncheck();
      cy.get('#two').should('have.attr', 'aria-selected', selectionMode === 'single' ? 'true' : 'false');
    });
  }
  it('keeps custom primary actions separate from Space selection when prevented', () => {
    const action = cy.stub().as('action');
    mount(
      <List selectionMode="multiselect">
        <ListItem
          value="one"
          onAction={ev => {
            ev.preventDefault();
            action();
          }}
        >
          One
        </ListItem>
      </List>,
    );
    cy.get('#one').click().should('have.attr', 'aria-selected', 'false');
    cy.get('#one input').should('not.be.checked');
    cy.get('@action').should('have.been.calledOnce');
    cy.get('#one').realPress('Enter');
    cy.get('#one').should('have.attr', 'aria-selected', 'false');
    cy.get('#one input').should('not.be.checked');
    cy.get('@action').should('have.callCount', 2);
    cy.get('#one').should('have.attr', 'aria-selected', 'false').realPress('Space');
    cy.get('#one').should('have.attr', 'aria-selected', 'true');
    cy.get('@action').should('have.callCount', 2);
  });
  it('provides composite row/gridcell semantics and secondary action entry', () => {
    mount(
      <List navigationMode="composite">
        <ListItem value="one">
          <span role="gridcell">One</span>
          <span role="gridcell">
            <button>Secondary</button>
          </span>
        </ListItem>
      </List>,
    );
    cy.get('[role="grid"] #one').should('have.attr', 'role', 'row').focus().realPress('ArrowRight');
    cy.contains('button', 'Secondary').should('be.focused').realPress('Escape');
    cy.get('#one').should('be.focused');
  });
});
