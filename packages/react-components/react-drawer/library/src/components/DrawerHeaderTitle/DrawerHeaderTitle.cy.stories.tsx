import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { OverlayDrawer, DrawerHeader } from '@fluentui/react-drawer';
import { DrawerHeaderTitle } from './DrawerHeaderTitle';
import { WithTitle } from '../../../../stories/src/Drawer/DrawerWithTitle.stories';

const mount = (children: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const title = '.fui-DrawerHeaderTitle';
const heading = '.fui-DrawerHeaderTitle__heading';
const action = '.fui-DrawerHeaderTitle__action';

describe('DrawerHeaderTitle unit-contract browser regressions', () => {
  it('forwards root and heading refs plus native slot attributes', () => {
    const ref = React.createRef<HTMLDivElement>();
    const headingRef = React.createRef<HTMLHeadingElement>();
    mount(
      <DrawerHeaderTitle
        ref={ref}
        id="title-root"
        title="Title wrapper"
        heading={{ ref: headingRef, id: 'custom-heading', title: 'Heading tooltip', children: 'Slot title' }}
      >
        Ignored default
      </DrawerHeaderTitle>,
    );
    cy.get('#title-root').should('have.attr', 'title', 'Title wrapper').and('have.text', 'Slot title');
    cy.get('#title-root').then($root => expect(ref.current).to.equal($root[0]));
    cy.get('#custom-heading')
      .should('have.attr', 'title', 'Heading tooltip')
      .then($heading => expect(headingRef.current).to.equal($heading[0]));
  });

  it('omits optional heading and action slots when explicitly null', () => {
    mount(
      <>
        <DrawerHeaderTitle heading={null} action={<button>Only action</button>}>
          Omitted heading
        </DrawerHeaderTitle>
        <DrawerHeaderTitle action={null}>Only heading</DrawerHeaderTitle>
      </>,
    );
    cy.get(title).eq(0).find(heading).should('not.exist');
    cy.get(title).eq(0).should('not.contain.text', 'Omitted heading').find('button').should('have.text', 'Only action');
    cy.get(title).eq(1).find(action).should('not.exist');
    cy.get(title).eq(1).find(heading).should('have.text', 'Only heading');
  });

  it('preserves updated content, custom classes and latest bubbled root events', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <DrawerHeaderTitle
            className="custom-title"
            onClick={updated ? latest : first}
            action={<button>Action</button>}
          >
            {updated ? 'Updated title' : 'Original title'}
          </DrawerHeaderTitle>
        </>
      );
    };
    mount(<Example />);
    cy.contains('button', 'Update').click();
    cy.get('.custom-title')
      .should('have.class', 'fui-DrawerHeaderTitle')
      .find(heading)
      .should('have.text', 'Updated title');
    cy.contains('button', 'Action').click();
    cy.get('@first').should('not.have.been.called');
    cy.get('@latest').should('have.been.calledOnce');
  });
});

describe('DrawerHeaderTitle accessibility and implementation edges', () => {
  it('supports all native heading levels and consumer-supplied div heading semantics', () => {
    mount(
      <>
        {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map(as => (
          <DrawerHeaderTitle key={as} heading={{ as }}>
            {as} title
          </DrawerHeaderTitle>
        ))}
        <DrawerHeaderTitle heading={{ as: 'div', role: 'heading', 'aria-level': 3 }}>Div title</DrawerHeaderTitle>
      </>,
    );
    cy.get(heading)
      .should('have.length', 7)
      .each(($heading, index) => {
        expect($heading[0].tagName).to.equal(index < 6 ? `H${index + 1}` : 'DIV');
      });
    cy.contains('[role="heading"]', 'Div title').should('have.attr', 'aria-level', '3');
  });

  it('provides the dialog-context heading id used by an overlay drawer accessible name', () => {
    mount(
      <OverlayDrawer open>
        <DrawerHeader>
          <DrawerHeaderTitle>Overlay details</DrawerHeaderTitle>
        </DrawerHeader>
      </OverlayDrawer>,
    );
    cy.get('[role="dialog"]')
      .invoke('attr', 'aria-labelledby')
      .then(id => {
        expect(id).to.be.a('string');
        cy.get(`[id="${id}"]`)
          .should('have.text', 'Overlay details')
          .and('have.class', 'fui-DrawerHeaderTitle__heading');
      });
  });

  it('mirrors heading/action placement in RTL without making the wrapper focusable', () => {
    mount(
      <DrawerHeaderTitle style={{ width: 320 }} action={<button>Close</button>}>
        Details
      </DrawerHeaderTitle>,
      'rtl',
    );
    cy.get(title).should($root => {
      const text = $root.find(heading)[0].getBoundingClientRect();
      const button = $root.find(action)[0].getBoundingClientRect();
      expect(button.right).to.be.lessThan(text.left);
    });
    cy.get(title).should('not.have.attr', 'tabindex');
    cy.contains('button', 'Close').focus().should('be.focused');
  });
});

describe('DrawerHeaderTitle documented scenarios', () => {
  it('renders the documented default and customized heading tags inside a header', () => {
    mount(<WithTitle />);
    cy.get(title).should('have.length', 3);
    cy.get(heading).eq(0).should('have.prop', 'tagName', 'H2').and('have.text', 'Drawer with title');
    cy.get(heading).eq(1).should('have.prop', 'tagName', 'H1').and('have.text', 'Drawer with custom tag');
    cy.get(action).find('[aria-label="Close"]').should('be.visible');
  });

  it('lays out the action after the heading without changing the heading semantics', () => {
    mount(
      <DrawerHeaderTitle style={{ width: 320 }} action={<button>Close</button>}>
        Details
      </DrawerHeaderTitle>,
    );
    cy.get(title).should($root => {
      const text = $root.find(heading)[0].getBoundingClientRect();
      const button = $root.find(action)[0].getBoundingClientRect();
      expect(button.left).to.be.greaterThan(text.right);
      expect(button.top).to.equal(text.top);
    });
    cy.get(heading).should('have.prop', 'tagName', 'H2').and('have.text', 'Details');
  });

  it('preserves native close-action activation', () => {
    const close = cy.stub().as('close');
    mount(<DrawerHeaderTitle action={<button onClick={close}>Close</button>}>Details</DrawerHeaderTitle>);
    cy.contains('button', 'Close').focus().realPress('Enter');
    cy.get('@close').should('have.been.calledOnce');
  });
});
