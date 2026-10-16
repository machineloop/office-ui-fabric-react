import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';
import { BreadcrumbItem } from '../BreadcrumbItem/BreadcrumbItem';
import { BreadcrumbButton } from './BreadcrumbButton';
import { Default } from '../../../../stories/src/Breadcrumb/BreadcrumbDefault.stories';
import { BreadcrumbSize } from '../../../../stories/src/Breadcrumb/BreadcrumbSize.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);

describe('BreadcrumbButton unit-derived contracts', () => {
  it('forwards button refs, attributes, classes and icon-slot overrides', () => {
    const ref = React.createRef<HTMLButtonElement>();
    mount(
      <BreadcrumbButton
        ref={ref}
        id="home"
        className="consumer"
        title="Home title"
        icon={{ children: '★', id: 'icon' }}
      >
        Home
      </BreadcrumbButton>,
    );
    cy.get('#home').should($root => {
      expect($root[0].tagName).to.equal('BUTTON');
      expect(ref.current).to.equal($root[0]);
      expect($root).to.have.class('fui-Button').and.have.class('fui-BreadcrumbButton').and.have.class('consumer');
      expect($root).to.have.attr('title', 'Home title');
      expect($root).not.to.have.attr('current');
    });
    cy.get('#icon').should('contain.text', '★').and('have.class', 'fui-Button__icon');
  });
  it('accepts explicit anchor and button arms rather than guessing from href alone', () => {
    const ref = React.createRef<HTMLAnchorElement>();
    mount(
      <>
        <BreadcrumbButton as="a" href="#home" ref={ref}>
          Anchor
        </BreadcrumbButton>
        <BreadcrumbButton as="button">Button</BreadcrumbButton>
      </>,
    );
    cy.contains('a', 'Anchor').should($root => expect(ref.current).to.equal($root[0]));
    cy.contains('button', 'Button').should('not.have.attr', 'role');
  });
  it('preserves consumer ARIA overrides and updates current state', () => {
    const Harness = () => {
      const [current, setCurrent] = React.useState(true);
      return (
        <>
          <button onClick={() => setCurrent(false)}>Update</button>
          <BreadcrumbButton current={current}>Home</BreadcrumbButton>
          <BreadcrumbButton current aria-current="step" aria-disabled={false}>
            Override
          </BreadcrumbButton>
        </>
      );
    };
    mount(<Harness />);
    cy.contains('button', 'Home').should('have.attr', 'aria-current', 'page');
    cy.contains('button', 'Override').should('have.attr', 'aria-current', 'step');
    cy.contains('button', 'Override').should('have.attr', 'aria-disabled', 'false');
    cy.contains('button', 'Update').click();
    cy.contains('button', 'Home').should('not.have.attr', 'aria-current');
    cy.contains('button', 'Home').should('not.have.attr', 'aria-disabled');
  });
});

describe('BreadcrumbButton keyboard and accessibility edges', () => {
  it('activates native buttons once per Enter and Space with ordinary tab order', () => {
    const click = cy.stub().as('click');
    mount(
      <>
        <button>Before</button>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbButton onClick={click}>Home</BreadcrumbButton>
          </BreadcrumbItem>
        </Breadcrumb>
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('button', 'Home').should('be.focused').realPress('Enter').realPress('Space').realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get('@click').should('have.callCount', 2);
  });
  for (const mode of ['disabled', 'disabledFocusable', 'current'] as const) {
    it(`suppresses pointer and keyboard activation for ${mode}`, () => {
      const click = cy.stub().as('click');
      mount(
        <>
          <button>Before</button>
          <BreadcrumbButton {...{ [mode]: true }} onClick={click}>
            Home
          </BreadcrumbButton>
          <button>After</button>
        </>,
      );
      if (mode === 'disabled') {
        cy.contains('button', 'Home').should('be.disabled');
        cy.contains('button', 'Before').click().realPress('Tab');
        cy.contains('button', 'After').should('be.focused');
      } else {
        cy.contains('button', 'Home')
          .should('have.attr', 'aria-disabled', 'true')
          .click()
          .realPress('Enter')
          .realPress('Space');
      }
      cy.get('@click').should('not.have.been.called');
    });
  }
  it('uses anchor semantics with href and supports Enter without navigation in the fixture', () => {
    const click = cy.stub().as('click');
    mount(
      <>
        <button>Before</button>
        <BreadcrumbButton
          href="#home"
          onClick={ev => {
            ev.preventDefault();
            click();
          }}
        >
          Home
        </BreadcrumbButton>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('a', 'Home').should('be.focused').realPress('Enter');
    cy.get('@click').should('have.been.calledOnce');
  });
});

describe('BreadcrumbButton documented scenarios', () => {
  it('renders the documented link, icon and current-page breadcrumb', () => {
    mount(<Default />);
    cy.get('nav[aria-label="Breadcrumb default example"] a').should('have.length', 4);
    cy.contains('a', 'Item 1').should('have.attr', 'href', 'https://www.bing.com/');
    cy.contains('a', 'Item 2').find('.fui-Button__icon svg').should('have.attr', 'aria-hidden', 'true');
    cy.contains('a', 'Item 4').should('have.attr', 'aria-current', 'page');
    cy.contains('a', 'Item 4').should('have.attr', 'aria-disabled', 'true');
  });
  it('inherits all three documented breadcrumb sizes', () => {
    mount(<BreadcrumbSize />);
    for (const [size, font] of [
      ['Small', '12px'],
      ['Medium', '14px'],
      ['Large', '16px'],
    ]) {
      cy.get(`nav[aria-label="${size} breadcrumb example with buttons"]`)
        .contains('button', 'Item 1')
        .should('have.css', 'font-size', font);
    }
  });
  it('renders standalone text and icon buttons with activation', () => {
    const click = cy.stub().as('click');
    mount(
      <BreadcrumbButton icon={<span aria-hidden="true">★</span>} onClick={click}>
        Home
      </BreadcrumbButton>,
    );
    cy.contains('button', 'Home').find('.fui-Button__icon').should('contain.text', '★');
    cy.contains('button', 'Home').click();
    cy.get('@click').should('have.been.calledOnce');
  });
});
