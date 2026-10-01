import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { InfoButton } from './InfoButton';
import { Default } from '../../../../stories/src/InfoLabel/InfoLabelDefault.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const trigger = '.fui-InfoButton';
const info = '.fui-InfoButton__info';

describe('InfoButton unit-contract browser regressions', () => {
  it('forwards button/surface refs and attributes and does not submit a surrounding form', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const infoRef = React.createRef<HTMLDivElement>();
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <InfoButton
          ref={ref}
          title="More details"
          aria-label="Show details"
          info={{ children: 'Details', ref: infoRef, id: 'details' }}
        />
      </form>,
    );
    cy.get(trigger)
      .should('have.attr', 'type', 'button')
      .and('have.attr', 'title', 'More details')
      .and('have.attr', 'aria-label', 'Show details');
    cy.get(trigger).then($button => expect(ref.current).to.equal($button[0]));
    cy.get(trigger).click();
    cy.get('#details')
      .should('have.text', 'Details')
      .then($surface => expect(infoRef.current).to.equal($surface[0]));
    cy.get('@submit').should('not.have.been.called');
  });

  it('merges native root click/blur and surface blur-capture callbacks with dismissal', () => {
    const click = cy.stub().as('click');
    const blur = cy.stub().as('blur');
    const capture = cy.stub().as('capture');
    mount(
      <>
        <InfoButton onClick={click} onBlur={blur} info={{ children: 'Details', onBlurCapture: capture }} />
        <button>Outside</button>
      </>,
    );
    cy.get(trigger).click();
    cy.get(info).should('be.focused');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@blur').should('have.been.called');
    cy.contains('button', 'Outside').click();
    cy.get('@capture').should('have.been.calledOnce');
    cy.get(info).should('not.exist');
  });

  it('reflects updated content and button size without dropping controlled open state', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <InfoButton
            popover={{ open: true }}
            size={updated ? 'large' : 'small'}
            info={updated ? 'New information' : 'Original information'}
          />
        </>
      );
    };
    mount(<Example />);
    cy.get(info).should('contain.text', 'Original information').and('have.css', 'font-size', '12px');
    cy.contains('button', 'Update').click();
    cy.get(info).should('contain.text', 'New information').and('have.css', 'font-size', '14px');
    cy.get(trigger).find('svg:visible').should('have.css', 'width', '20px');
  });
});

describe('InfoButton accessibility and state edges', () => {
  for (const inline of [true, false]) {
    it(`maintains naming and ownership for ${inline ? 'inline' : 'portalled'} information`, () => {
      mount(<Default infoButton={{ inline }} />);
      cy.get(trigger)
        .invoke('attr', 'aria-labelledby')
        .then(ids => {
          expect(ids).to.be.a('string');
          for (const id of ids!.split(' ')) {
            cy.get(`[id="${id}"]`).should('exist');
          }
          cy.get('.fui-InfoLabel')
            .find('label')
            .should('have.text', 'Example label')
            .then($label => {
              cy.get(trigger).should($button => {
                expect(ids!.split(' ')).to.deep.equal([$label.attr('id'), $button.attr('id')]);
                expect($button).to.have.attr('aria-label', 'information');
              });
            });
        });
      cy.get(trigger).click();
      cy.get(info)
        .should('be.focused')
        .invoke('attr', 'id')
        .then(id => {
          cy.get('.fui-InfoLabel').should('have.attr', 'aria-owns', id);
          cy.get('.fui-InfoLabel').should($label => expect($label.find(info)).to.have.length(inline ? 1 : 0));
        });
      cy.get(info).realPress('Escape');
      cy.get('.fui-InfoLabel').should('not.have.attr', 'aria-owns');
    });
  }

  it('keeps the note open when focus returns to the trigger', () => {
    mount(
      <>
        <Default />
        <button>Outside</button>
      </>,
    );
    cy.get(trigger).click();
    cy.get(info).should('be.focused').realPress(['Shift', 'Tab']);
    cy.get(trigger).should('be.focused');
    cy.get(info).should('be.visible');
    cy.get(trigger).realPress('Tab');
    cy.get(info).find('a').should('be.focused');
    cy.get(info).find('a').realPress('Tab');
    cy.get(info).should('not.exist');
  });

  it('reports rejected controlled dismissal and keeps the information visible', () => {
    const change = cy.stub().as('change');
    mount(<InfoButton info="Controlled information" popover={{ open: true, onOpenChange: change }} />);
    cy.get(info).should('be.visible').focus().realPress('Escape');
    cy.get(info).should('be.visible');
    cy.get('@change')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { open: false });
  });
});

describe('InfoButton documented pattern', () => {
  for (const activation of ['click', 'Enter', 'Space'] as const) {
    it(`opens by ${activation} and focuses the information surface`, () => {
      mount(<Default />);
      if (activation === 'click') {
        cy.get(trigger).click();
      } else {
        cy.get(trigger).focus().realPress(activation);
      }
      cy.get(info)
        .should('be.visible')
        .and('be.focused')
        .and('have.attr', 'role', 'note')
        .and('have.attr', 'tabindex', '-1');
      cy.get(info).should('contain.text', 'This is example information').find('a').should('contain.text', 'Learn more');
    });
  }

  it('does not open merely on focus', () => {
    mount(<Default />);
    cy.get(trigger).focus().should('be.focused');
    cy.get(info).should('not.exist');
  });

  it('closes with Escape and restores focus to the trigger', () => {
    mount(<Default />);
    cy.get(trigger).click();
    cy.get(info).should('be.focused').realPress('Escape');
    cy.get(info).should('not.exist');
    cy.get(trigger).should('be.focused');
  });

  it('closes on a second click or outside click', () => {
    mount(
      <>
        <Default />
        <button>Outside</button>
      </>,
    );
    cy.get(trigger).click();
    cy.get(info).should('be.visible');
    cy.get(trigger).click();
    cy.get(info).should('not.exist');
    cy.get(trigger).click();
    cy.contains('button', 'Outside').click();
    cy.get(info).should('not.exist');
    cy.contains('button', 'Outside').should('be.focused');
  });

  it('allows Tab into interactive content and closes once focus leaves the surface', () => {
    mount(
      <>
        <Default />
        <button>Outside</button>
      </>,
    );
    cy.get(trigger).click();
    cy.get(info).should('be.focused').realPress('Tab');
    cy.get(info).find('a').should('be.focused');
    cy.get(info).find('a').realPress('Tab');
    cy.contains('button', 'Outside').should('be.focused');
    cy.get(info).should('not.exist');
  });

  for (const [size, iconSize, fontSize] of [
    ['small', 12, 12],
    ['medium', 16, 12],
    ['large', 20, 14],
  ] as const) {
    it(`maps ${size} to its documented icon and information text sizing`, () => {
      mount(<InfoButton size={size} info="Additional information" />);
      cy.get(trigger).find('svg:visible').should('have.css', 'width', `${iconSize}px`);
      cy.get(trigger).click();
      cy.get(info).should('have.css', 'font-size', `${fontSize}px`).and('have.css', 'max-width', '264px');
    });
  }
});
