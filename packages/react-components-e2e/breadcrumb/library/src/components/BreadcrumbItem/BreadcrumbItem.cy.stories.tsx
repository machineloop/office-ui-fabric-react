import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';
import { BreadcrumbButton } from '../BreadcrumbButton/BreadcrumbButton';
import { BreadcrumbItem } from './BreadcrumbItem';
import { Default } from '../../../../stories/src/Breadcrumb/BreadcrumbDefault.stories';
import { BreadcrumbSize } from '../../../../stories/src/Breadcrumb/BreadcrumbSize.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);

describe('BreadcrumbItem unit-derived contracts', () => {
  it('forwards the native li ref, root classes, attributes and events', () => {
    const ref = React.createRef<HTMLLIElement>();
    const click = cy.stub().as('click');
    mount(
      <Breadcrumb>
        <BreadcrumbItem ref={ref} id="item" className="consumer" title="Location" aria-label="Location" onClick={click}>
          Home
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('#item')
      .should($item => {
        expect(ref.current).to.equal($item[0]);
        expect($item[0].tagName).to.equal('LI');
        expect($item).to.have.class('fui-BreadcrumbItem').and.have.class('consumer');
        expect($item).to.have.attr('title', 'Location').and.have.attr('aria-label', 'Location');
      })
      .click();
    cy.get('@click').should('have.been.calledOnce');
  });
  it('supports empty content and updates native attributes and child content', () => {
    const Harness = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <Breadcrumb>
            <BreadcrumbItem id="item" title={updated ? 'New' : 'Old'}>
              {updated ? <strong>New location</strong> : null}
            </BreadcrumbItem>
          </Breadcrumb>
        </>
      );
    };
    mount(<Harness />);
    cy.get('#item').should('be.empty').and('have.attr', 'title', 'Old');
    cy.contains('button', 'Update').click();
    cy.get('#item').should('have.attr', 'title', 'New');
    cy.get('#item strong').should('have.text', 'New location');
  });
});

describe('BreadcrumbItem accessibility and content edges', () => {
  it('does not add a tab stop around a working child button', () => {
    const click = cy.stub().as('click');
    mount(
      <>
        <button>Before</button>
        <Breadcrumb aria-label="Path">
          <BreadcrumbItem>
            <BreadcrumbButton onClick={click}>Home</BreadcrumbButton>
          </BreadcrumbItem>
          <BreadcrumbItem>Current</BreadcrumbItem>
        </Breadcrumb>
        <button>After</button>
      </>,
    );
    cy.get('.fui-BreadcrumbItem').each($item => expect($item).not.to.have.attr('tabindex'));
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('button', 'Home').should('be.focused').realPress('Enter').realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get('@click').should('have.been.calledOnce');
  });
  it('preserves multiline nested content without introducing roles or ARIA', () => {
    mount(
      <Breadcrumb>
        <BreadcrumbItem id="item">
          <span>
            Long first line
            <br />
            Second line
          </span>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('#item')
      .should('contain.text', 'Long first line')
      .and('contain.text', 'Second line')
      .and('not.have.attr', 'role');
    cy.get('#item br').should('have.length', 1);
    cy.get('#item').should('not.have.attr', 'aria-current');
  });
  it('keeps item and child readable and aligned in RTL', () => {
    mountBase(
      <FluentProvider theme={webLightTheme} dir="rtl">
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbButton>مرحبا</BreadcrumbButton>
          </BreadcrumbItem>
        </Breadcrumb>
      </FluentProvider>,
    );
    cy.get('.fui-BreadcrumbItem').should('have.css', 'direction', 'rtl').and('have.css', 'align-items', 'center');
    cy.contains('button', 'مرحبا').should('be.visible');
  });
});

describe('BreadcrumbItem documented scenarios', () => {
  it('renders ordered-list items around documented links and icons', () => {
    mount(<Default />);
    cy.get('nav > ol > .fui-BreadcrumbItem')
      .should('have.length', 4)
      .each($item => {
        expect($item[0].tagName).to.equal('LI');
        expect($item.find('a')).to.have.length(1);
      });
    cy.get('.fui-BreadcrumbItem').eq(1).find('.fui-Button__icon').should('exist');
    cy.get('.fui-BreadcrumbItem').last().find('a').should('have.attr', 'aria-current', 'page');
  });
  for (const size of ['Small', 'Medium', 'Large']) {
    it(`preserves the ${size.toLowerCase()} story structure and flex alignment`, () => {
      mount(<BreadcrumbSize />);
      cy.get(`nav[aria-label="${size} breadcrumb example with buttons"] .fui-BreadcrumbItem`)
        .should('have.length', 4)
        .each($item => {
          expect($item).to.have.css('display', 'flex').and.have.css('align-items', 'center');
          expect($item.find('button')).to.have.length(1);
        });
    });
  }
});
