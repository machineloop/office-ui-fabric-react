import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';

import { DrawerBody } from './DrawerBody';
import type { JSXElement } from '@fluentui/react-utilities';
import { DrawerProvider, useDrawerContextValue } from '../../contexts';
import { WithScroll } from '../../../../stories/src/Drawer/DrawerWithScroll.stories';

const mountFluent = (element: JSXElement) => {
  mount(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
};

function assertScrollPosition(element: HTMLElement, position: number) {
  expect(element.scrollTop).to.equal(position);
}

describe('DrawerBody documented scrolling compositions', () => {
  it('scrolls all four header/footer combinations without moving the surrounding content', () => {
    mountFluent(<WithScroll />);
    cy.get('.fui-DrawerBody')
      .should('have.length', 4)
      .each($body => {
        const siblings = Array.from($body.parent().find('.fui-DrawerHeader, .fui-DrawerFooter'), element => ({
          element,
          top: element.getBoundingClientRect().top,
        }));
        cy.wrap($body).should('have.attr', 'tabindex', '0').and('have.attr', 'aria-label', 'Example scrolling content');
        cy.wrap($body)
          .scrollTo('bottom')
          .should($element => {
            expect($element[0].scrollHeight).to.be.greaterThan($element[0].clientHeight);
            assertScrollPosition($element[0], $element[0].scrollHeight - $element[0].clientHeight);
            for (const sibling of siblings) {
              expect(sibling.element.getBoundingClientRect().top).to.equal(sibling.top);
            }
          });
        cy.wrap($body)
          .scrollTo('top')
          .should($element => assertScrollPosition($element[0], 0));
      });
  });

  it('permits native keyboard scroll when the body has no interactive children', () => {
    mountFluent(<WithScroll />);
    cy.get('.fui-DrawerBody').first().focus().realPress('PageDown');
    cy.get('.fui-DrawerBody')
      .first()
      .should($body => expect($body[0].scrollTop).to.be.greaterThan(0));
    cy.get('.fui-DrawerBody').first().should('be.focused').realPress(['Control', 'Home']);
    cy.get('.fui-DrawerBody')
      .first()
      .should($body => assertScrollPosition($body[0], 0));
  });
});

const ScrollExample = () => {
  const context = useDrawerContextValue();
  const [long, setLong] = React.useState(true);
  return (
    <DrawerProvider value={context}>
      <output id="state">{context.scrollState}</output>
      <button onClick={() => setLong(false)}>Short content</button>
      <DrawerBody
        id="scroll-body"
        style={{ height: 200, flex: 'none' }}
        tabIndex={0}
        role="group"
        aria-label="Scroll content"
      >
        <div style={{ height: long ? 600 : 20 }}>Content</div>
      </DrawerBody>
    </DrawerProvider>
  );
};

describe('DrawerBody implementation and accessibility edges', () => {
  it('reports top, middle and bottom positions and returns to top', () => {
    mountFluent(<ScrollExample />);
    cy.get('#state').should('have.text', 'top');
    cy.get('#scroll-body').scrollTo(0, 80);
    cy.get('#state').should('have.text', 'middle');
    cy.get('#scroll-body').scrollTo('bottom');
    cy.get('#state').should('have.text', 'bottom');
    cy.get('#scroll-body').scrollTo('top');
    cy.get('#state').should('have.text', 'top');
  });

  it('recalculates through ResizeObserver when body geometry changes without changing children', () => {
    mountFluent(<ScrollExample />);
    cy.get('#state').should('have.text', 'top');
    cy.get('#scroll-body').invoke('css', 'height', '900px');
    cy.get('#state').should('have.text', 'none');
    cy.get('#scroll-body').invoke('css', 'height', '200px');
    cy.get('#state').should('have.text', 'top');
  });

  it('clears the scrolling state when overflowing children shrink', () => {
    mountFluent(<ScrollExample />);
    cy.get('#scroll-body').scrollTo('bottom');
    cy.get('#state').should('have.text', 'bottom');
    cy.contains('button', 'Short content').click();
    cy.get('#state').should('have.text', 'none');
    cy.get('#scroll-body').should($body => expect($body[0].scrollHeight).to.equal($body[0].clientHeight));
  });
});

describe('DrawerBody unit-contract browser regressions', () => {
  it('forwards native root props/ref and clears the ref when unmounted', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(false)}>Remove body</button>
          {visible && (
            <DrawerBody ref={ref} id="ref-body" title="Body title" role="region" aria-label="Details">
              Details
            </DrawerBody>
          )}
        </>
      );
    };
    mountFluent(<Example />);
    cy.get('#ref-body')
      .should('have.attr', 'role', 'region')
      .and('have.attr', 'aria-label', 'Details')
      .and('have.attr', 'title', 'Body title')
      .and('contain.text', 'Details');
    cy.get('#ref-body').then($body => expect(ref.current).to.equal($body[0]));
    cy.contains('button', 'Remove body').click();
    cy.get('#ref-body')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });

  it('merges the latest native scroll handler with Drawer context updates', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const Example = () => {
      const context = useDrawerContextValue();
      const [updated, setUpdated] = React.useState(false);
      return (
        <DrawerProvider value={context}>
          <button onClick={() => setUpdated(true)}>Update handler</button>
          <output id="handler-state">{context.scrollState}</output>
          <DrawerBody id="handler-body" onScroll={updated ? latest : first} style={{ height: 200 }}>
            <div style={{ height: 600 }}>Long content</div>
          </DrawerBody>
        </DrawerProvider>
      );
    };
    mountFluent(<Example />);
    cy.contains('button', 'Update handler').click();
    cy.get('#handler-body').scrollTo(0, 80);
    cy.get('#handler-state').should('have.text', 'middle');
    cy.get('@first').should('not.have.been.called');
    cy.get('@latest').should('have.been.called');
  });

  it('adds top/bottom inset only where headers and footers are absent', () => {
    mountFluent(<WithScroll />);
    cy.get('.fui-DrawerBody').each(($body, index) => {
      expect($body).to.have.css('padding-left', '24px');
      expect($body).to.have.css('padding-right', '24px');
      expect($body).to.have.css('padding-top', index === 0 || index === 2 ? '25px' : '0px');
      expect($body).to.have.css('padding-bottom', index === 0 || index === 1 ? '25px' : '0px');
    });
  });
});

describe('DrawerBody', () => {
  it('should render drawer body and be scrollable', () => {
    const Example = () => (
      <DrawerBody id="drawer-body" style={{ height: '200px' }}>
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Corrupti, animi? Quos, eum pariatur. Labore magni vel
        doloremque reiciendis, consequatur porro explicabo similique harum illo, ad hic, earum nobis accusantium quasi?
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident eligendi impedit culpa ea ipsum voluptate
        inventore labore, delectus nam veniam dolor debitis dolorem blanditiis in, natus deleniti illo. Asperiores,
        porro. Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat obcaecati aperiam recusandae. Pariatur
        dolorem cumque odit delectus voluptates ea ipsam culpa voluptate? Praesentium beatae corrupti accusamus.
        Suscipit voluptas natus illo?
      </DrawerBody>
    );

    mountFluent(<Example />);

    cy.get('#drawer-body').should('exist');
    cy.get('#drawer-body')
      .scrollTo('bottom')
      .should($e => assertScrollPosition($e[0], $e[0].scrollHeight - $e[0].clientHeight));

    cy.get('#drawer-body')
      .scrollTo('top')
      .should($e => assertScrollPosition($e[0], 0));
  });

  it('updates scrollState when children change from short to long', () => {
    const shortContent = 'Short content';
    const longContent = Array(50)
      .fill(
        'lorem ipsum dolor sit amet consectetur, adipisicing elit. Corrupti, animi? Quos, eum pariatur. Labore magni vel doloremque reiciendis, consequatur porro explicabo similique harum illo, ad hic, earum nobis accusantium quasi?',
      )
      .join(' ');

    const Example = () => {
      const context = useDrawerContextValue();
      const [showLong, setShowLong] = React.useState(false);

      return (
        <DrawerProvider value={context}>
          <div id="scroll-state">{context.scrollState}</div>

          <DrawerBody id="drawer-body" style={{ height: '200px' }}>
            {showLong ? longContent : shortContent}
          </DrawerBody>

          <button id="toggle-content" onClick={() => setShowLong(s => !s)}>
            Toggle
          </button>
        </DrawerProvider>
      );
    };

    mountFluent(<Example />);

    // Initially short content should result in 'none'
    cy.get('#drawer-body').should('exist');
    cy.get('#scroll-state').should('have.text', 'none');

    // Toggle to long content and assert context scroll state updates to 'top'
    cy.get('#toggle-content').click();
    cy.get('#scroll-state').should('have.text', 'top');

    // Scroll to bottom and assert it becomes 'bottom'
    cy.get('#drawer-body')
      .scrollTo('bottom')
      // wait for any rAF-based updates and then assert the scrollState
      .then(() => cy.get('#scroll-state').should('have.text', 'bottom'));
  });
});
