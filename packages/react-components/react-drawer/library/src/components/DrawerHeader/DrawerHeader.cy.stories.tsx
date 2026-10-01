import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { DrawerHeader } from './DrawerHeader';
import { DrawerProvider, useDrawerContextValue } from '../../contexts';
import { WithTitle } from '../../../../stories/src/Drawer/DrawerWithTitle.stories';
import { WithScroll } from '../../../../stories/src/Drawer/DrawerWithScroll.stories';
import { Separator } from '../../../../stories/src/Drawer/DrawerSeparator.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const header = '.fui-DrawerHeader';
const opacity = ($root: JQuery<HTMLElement>, expected: string) => {
  const separator = $root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after');
  expect(separator.content).to.equal('""');
  expect(separator.height).to.equal('1px');
  expect(separator.opacity).to.equal(expected);
};

describe('DrawerHeader unit-contract browser regressions', () => {
  it('forwards root refs, attributes and events with a consumer role override', () => {
    const ref = React.createRef<HTMLElement>();
    const click = cy.stub().as('click');
    mount(
      <DrawerHeader
        ref={ref}
        id="native-header"
        title="Header tooltip"
        role="region"
        aria-label="Details"
        onClick={click}
      >
        Header text
      </DrawerHeader>,
    );
    cy.get('#native-header')
      .should('have.attr', 'role', 'region')
      .and('have.attr', 'aria-label', 'Details')
      .and('have.attr', 'title', 'Header tooltip');
    cy.get('#native-header').then($root => expect(ref.current).to.equal($root[0]));
    cy.get('#native-header').click();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('preserves custom classes and updates children and inline layout overrides', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <DrawerHeader className="custom-header" style={{ flexDirection: updated ? 'row' : 'column' }}>
            {updated ? 'Updated title' : 'Original title'}
          </DrawerHeader>
        </>
      );
    };
    mount(<Example />);
    cy.get('.custom-header').should('have.text', 'Original title').and('have.css', 'flex-direction', 'column');
    cy.contains('button', 'Update').click();
    cy.get('.custom-header')
      .should('have.text', 'Updated title')
      .and('have.class', 'fui-DrawerHeader')
      .and('have.css', 'flex-direction', 'row');
  });

  it('applies the default spacing and border-box layout in the actual browser', () => {
    mount(<DrawerHeader>Header text</DrawerHeader>);
    cy.get(header)
      .should('have.css', 'padding-top', '24px')
      .and('have.css', 'padding-left', '24px')
      .and('have.css', 'padding-right', '24px')
      .and('have.css', 'padding-bottom', '8px')
      .and('have.css', 'gap', '8px')
      .and('have.css', 'box-sizing', 'border-box');
  });
});

describe('DrawerHeader context and accessibility edges', () => {
  it('handles every context scroll-state transition including removal of the separator', () => {
    const Example = () => {
      const context = useDrawerContextValue();
      return (
        <DrawerProvider value={context}>
          {(['none', 'top', 'middle', 'bottom'] as const).map(state => (
            <button key={state} onClick={() => context.setScrollState(state)}>
              {state}
            </button>
          ))}
          <DrawerHeader id="state-header">Header</DrawerHeader>
        </DrawerProvider>
      );
    };
    mount(<Example />);
    cy.get('#state-header').should($root =>
      expect($root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after').content).to.equal('none'),
    );
    cy.contains('button', 'top').click();
    cy.get('#state-header').should($root => opacity($root, '0'));
    cy.contains('button', 'middle').click();
    cy.get('#state-header').should($root => opacity($root, '1'));
    cy.contains('button', 'bottom').click();
    cy.get('#state-header').should($root => opacity($root, '1'));
    cy.contains('button', 'none').click();
    cy.get('#state-header').should($root =>
      expect($root[0].ownerDocument.defaultView!.getComputedStyle($root[0], '::after').content).to.equal('none'),
    );
  });

  it('does not add a tab stop or prevent native action activation', () => {
    const action = cy.stub().as('action');
    mount(
      <>
        <button>Before</button>
        <DrawerHeader>
          <h2>Details</h2>
          <button onClick={action}>Action</button>
        </DrawerHeader>
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('button', 'Action').should('be.focused').realPress('Space');
    cy.get('@action').should('have.been.calledOnce');
    cy.get(header).should('not.have.attr', 'tabindex');
    cy.contains('button', 'Action').realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
  });

  it('isolates nested drawer header separator contexts', () => {
    const Example = () => {
      const context = useDrawerContextValue();
      return (
        <DrawerProvider value={{ ...context, scrollState: 'middle' }}>
          <DrawerHeader id="outer-header">Outer</DrawerHeader>
          <DrawerProvider value={{ ...context, scrollState: 'top' }}>
            <DrawerHeader id="inner-header">Inner</DrawerHeader>
          </DrawerProvider>
        </DrawerProvider>
      );
    };
    mount(<Example />);
    cy.get('#outer-header').should($root => opacity($root, '1'));
    cy.get('#inner-header').should($root => opacity($root, '0'));
  });
});

describe('DrawerHeader documented compositions', () => {
  it('contains structured headings and action without adding an unscoped banner landmark', () => {
    mount(<WithTitle />);
    cy.get(header)
      .should('have.prop', 'tagName', 'HEADER')
      .and('have.attr', 'role', 'none')
      .and('have.css', 'display', 'flex')
      .and('have.css', 'flex-direction', 'column');
    cy.get(header).find('h1, h2').should('have.length', 3);
    cy.get(header).find('[aria-label="Close"]').should('be.visible');
  });

  it('retains the documented close action behavior in a separator drawer', () => {
    mount(<Separator />);
    cy.get(header).should('have.length', 3);
    cy.get(header).first().find('[aria-label="Close"]').focus().realPress('Enter');
    cy.get(header).should('have.length', 2);
    cy.contains('button', 'Toggle start').click();
    cy.get(header).should('have.length', 3);
  });

  it('reveals the bottom separator only after scrolling away from the top', () => {
    mount(<WithScroll />);
    cy.get(header)
      .first()
      .should($header => opacity($header, '0'));
    cy.get('.fui-DrawerBody').eq(1).scrollTo(0, 50);
    cy.get(header)
      .first()
      .should($header => opacity($header, '1'));
    cy.get('.fui-DrawerBody').eq(1).scrollTo('bottom');
    cy.get(header)
      .first()
      .should($header => opacity($header, '1'));
    cy.get('.fui-DrawerBody').eq(1).scrollTo('top');
    cy.get(header)
      .first()
      .should($header => opacity($header, '0'));
  });
});
