import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Overflow } from '../Overflow/Overflow';
import { OverflowItem } from './OverflowItem';
import { useIsOverflowItemVisible } from '../../useIsOverflowItemVisible';
import { useIsOverflowGroupVisible } from '../../useIsOverflowGroupVisible';
import type { OverflowProps } from '../Overflow/Overflow.types';
import { OverflowByPriority } from '../../../../stories/src/Overflow/OverflowByPriority.stories';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-menu';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const itemStyle: React.CSSProperties = { width: 100, height: 40, flexShrink: 0 };
const Probe = () => {
  const visible = useIsOverflowItemVisible('three');
  const group = useIsOverflowGroupVisible('group');
  return (
    <output id="probe" style={{ display: 'none' }}>
      {String(visible)}:{group}
    </output>
  );
};
const Harness = ({
  priority = false,
  pinned = false,
  ...props
}: Omit<OverflowProps, 'children'> & { priority?: boolean; pinned?: boolean }) => {
  const [narrow, setNarrow] = React.useState(false);
  return (
    <>
      <button onClick={() => setNarrow(!narrow)}>Resize</button>
      <Overflow {...props}>
        <div id="area" style={{ display: 'flex', overflow: 'hidden', width: narrow ? 150 : 330 }}>
          <OverflowItem id="one" groupId="group">
            <button id="one" style={itemStyle}>
              One
            </button>
          </OverflowItem>
          <OverflowItem id="two" groupId="group">
            <button id="two" style={itemStyle}>
              Two
            </button>
          </OverflowItem>
          <OverflowItem id="three" {...(pinned ? { pinned: true } : { priority: priority ? 10 : 0 })}>
            <button id="three" style={itemStyle}>
              Three
            </button>
          </OverflowItem>
          <Probe />
        </div>
      </Overflow>
    </>
  );
};

describe('OverflowItem unit-derived trigger contracts', () => {
  it('merges wrapper and child refs without rendering an extra DOM node', () => {
    const wrapper = React.createRef<HTMLElement>();
    const child = React.createRef<HTMLButtonElement>();
    mount(
      <div id="parent">
        <OverflowItem id="registered" ref={wrapper}>
          <button id="child" ref={child}>
            Child
          </button>
        </OverflowItem>
      </div>,
    );
    cy.get('#parent > button')
      .should('have.length', 1)
      .then($button => {
        expect(wrapper.current).to.equal($button[0]);
        expect(child.current).to.equal($button[0]);
        expect($button[0].parentElement?.children.length).to.equal(1);
      });
  });
  for (const outer of ['overflow', 'menu'] as const) {
    it(`propagates refs and trigger behavior with ${outer} outermost`, () => {
      const wrapper = React.createRef<HTMLElement>();
      const child = React.createRef<HTMLButtonElement>();
      const button = (
        <button id="trigger" ref={child}>
          Open
        </button>
      );
      mount(
        <Menu>
          {outer === 'overflow' ? (
            <OverflowItem id="item" ref={wrapper}>
              <MenuTrigger disableButtonEnhancement>{button}</MenuTrigger>
            </OverflowItem>
          ) : (
            <MenuTrigger disableButtonEnhancement>
              <OverflowItem id="item" ref={wrapper}>
                {button}
              </OverflowItem>
            </MenuTrigger>
          )}
          <MenuPopover>
            <MenuList>
              <MenuItem>Action</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>,
      );
      cy.get('#trigger')
        .should($button => {
          expect(wrapper.current).to.equal($button[0]);
          expect(child.current).to.equal($button[0]);
          expect($button).to.have.attr('aria-haspopup', 'menu');
        })
        .click();
      cy.contains('[role="menuitem"]', 'Action').should('be.visible').realPress('Escape');
      cy.get('#trigger').should('be.focused');
    });
  }
  it('clears both refs when its child is unmounted', () => {
    const wrapper = React.createRef<HTMLElement>();
    const child = React.createRef<HTMLButtonElement>();
    const Dynamic = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(false)}>Remove</button>
          {visible && (
            <OverflowItem id="item" ref={wrapper}>
              <button id="child" ref={child}>
                Child
              </button>
            </OverflowItem>
          )}
        </>
      );
    };
    mount(<Dynamic />);
    cy.get('#child').should('exist');
    cy.contains('button', 'Remove').click();
    cy.get('#child')
      .should('not.exist')
      .then(() => {
        expect(wrapper.current).to.equal(null);
        expect(child.current).to.equal(null);
      });
  });
});

describe('OverflowItem accessibility and lifecycle edges', () => {
  it('removes hidden children from native tab order and restores their tab stops', () => {
    mount(
      <>
        <Harness />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Resize').click().realPress('Tab');
    cy.get('#one').should('be.focused').realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.contains('button', 'Resize').click().realPress('Tab');
    cy.get('#one').should('be.focused').realPress('Tab');
    cy.get('#two').should('be.focused').realPress('Tab');
    cy.get('#three').should('be.focused');
  });
  it('unregisters removed items and registers newly mounted items at constrained width', () => {
    const Dynamic = () => {
      const [removed, setRemoved] = React.useState(false);
      return (
        <>
          <button onClick={() => setRemoved(!removed)}>Toggle</button>
          <Overflow>
            <div id="dynamic" style={{ display: 'flex', width: 150, overflow: 'hidden' }}>
              {!removed && (
                <OverflowItem id="one">
                  <button id="one" style={itemStyle}>
                    One
                  </button>
                </OverflowItem>
              )}
              <OverflowItem id="two">
                <button id="two" style={itemStyle}>
                  Two
                </button>
              </OverflowItem>
            </div>
          </Overflow>
        </>
      );
    };
    mount(<Dynamic />);
    cy.get('#one').should('be.visible');
    cy.get('#two').should('not.be.visible');
    cy.contains('button', 'Toggle').click();
    cy.get('#one').should('not.exist');
    cy.get('#two').should('be.visible');
    cy.contains('button', 'Toggle').click();
    cy.get('#one').should('be.visible');
    cy.get('#two').should('not.be.visible');
  });
  it('preserves native child semantics and callbacks outside an Overflow provider', () => {
    const click = cy.stub().as('click');
    mount(
      <OverflowItem id="manager-id">
        <button id="child-id" aria-label="Child" onClick={click}>
          Child
        </button>
      </OverflowItem>,
    );
    cy.get('#child-id').should('have.attr', 'aria-label', 'Child').click().realPress('Enter');
    cy.get('@click').should('have.callCount', 2);
    cy.get('#manager-id').should('not.exist');
  });
});

describe('OverflowItem documented scenarios', () => {
  it('hides trailing items on resize and restores every registered item', () => {
    mount(<Harness />);
    cy.get('#area > button:visible').should('have.length', 3);
    cy.contains('button', 'Resize').click();
    cy.get('#one').should('be.visible');
    cy.get('#two').should('not.be.visible');
    cy.get('#three').should('not.be.visible');
    cy.get('#probe').should('have.text', 'false:overflow');
    cy.contains('button', 'Resize').click();
    cy.get('#area > button:visible').should('have.length', 3);
    cy.get('#probe').should('have.text', 'true:visible');
  });
  it('overflows by priority rather than DOM order', () => {
    mount(<Harness priority />);
    cy.get('#area > button:visible').should('have.length', 3);
    cy.contains('button', 'Resize').click();
    cy.get('#three').should('be.visible');
    cy.get('#one').should('not.be.visible');
    cy.get('#two').should('not.be.visible');
  });
  it('never hides a pinned item at constrained width', () => {
    mount(<Harness pinned />);
    cy.contains('button', 'Resize').click();
    cy.get('#three').should('be.visible');
    cy.get('#area > button:visible').should('have.length', 1);
  });
  it('honors minimumVisible even when items cannot fit', () => {
    mount(<Harness minimumVisible={2} />);
    cy.contains('button', 'Resize').click();
    cy.get('#area > button:visible').should('have.length', 2);
  });
  it('composes with the documented priority overflow menu', () => {
    mount(<OverflowByPriority />);
    cy.get('.fui-Overflow').invoke('css', 'width', '300px');
    cy.contains('button', /^\+\d+ items$/)
      .should('be.visible')
      .click();
    cy.get('[role="menuitem"]').should('have.length.greaterThan', 0);
    cy.contains('button', 'Priority 7').should('be.visible');
  });
});
