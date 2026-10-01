import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Persona } from './Persona';

const mount = (children: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const avatar = '.fui-Persona__avatar';
const primary = '.fui-Persona__primaryText';

describe('Persona unit-contract browser regressions', () => {
  it('defaults primary text to name but preserves explicit primaryText overrides', () => {
    mount(
      <>
        <Persona name="Default name" />
        <Persona name="Avatar name" primaryText="Display alias" />
      </>,
    );
    cy.get(primary).eq(0).should('have.text', 'Default name');
    cy.get(primary).eq(1).should('have.text', 'Display alias');
    cy.get(avatar).eq(1).should('have.attr', 'aria-label', 'Avatar name');
  });

  it('forwards root ref, native attributes, consumer role and events', () => {
    const ref = React.createRef<HTMLDivElement>();
    const click = cy.stub().as('click');
    mount(<Persona ref={ref} name="Alex Morgan" id="persona-root" title="Profile" role="article" onClick={click} />);
    cy.get('#persona-root').should('have.attr', 'title', 'Profile').and('have.attr', 'role', 'article');
    cy.get('#persona-root').then($root => expect(ref.current).to.equal($root[0]));
    cy.get(primary).click();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('updates text, size, coin mode and presence on a parent rerender', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <Persona
            name={updated ? 'Updated name' : 'Original name'}
            size={updated ? 'huge' : 'small'}
            presenceOnly={updated}
            presence={{ status: updated ? 'busy' : 'available' }}
            secondaryText={updated ? 'Busy' : 'Available'}
          />
        </>
      );
    };
    mount(<Example />);
    cy.get(avatar).should('have.css', 'width', '28px');
    cy.contains('button', 'Update').click();
    cy.get(avatar).should('not.exist');
    cy.get('.fui-Persona__presence').should('have.css', 'width', '20px').and('have.attr', 'aria-label', 'busy');
    cy.get(primary).should('have.text', 'Updated name');
    cy.get('.fui-Persona__secondaryText').should('have.text', 'Busy');
  });

  it('accepts text-slot object shorthand and omission with slot attributes intact', () => {
    mount(
      <Persona
        name="Alex Morgan"
        primaryText={{ children: 'Alias', title: 'Primary tooltip' }}
        secondaryText={null}
        tertiaryText={{ children: 'Engineer', className: 'custom-tertiary' }}
        quaternaryText="Contoso"
      />,
    );
    cy.get(primary).should('have.text', 'Alias').and('have.attr', 'title', 'Primary tooltip');
    cy.get('.fui-Persona__secondaryText').should('not.exist');
    cy.get('.custom-tertiary').should('have.text', 'Engineer');
    cy.get('.fui-Persona__quaternaryText').should('have.text', 'Contoso');
  });

  it('respects explicit Avatar size and name instead of overwriting slot overrides', () => {
    mount(<Persona size="small" name="Default name" avatar={{ size: 64, name: 'Custom avatar' }} />);
    cy.get(avatar).should('have.css', 'width', '64px').and('have.attr', 'aria-label', 'Custom avatar');
    cy.get(primary).should('have.text', 'Default name');
  });
});

describe('Persona browser accessibility and edges', () => {
  it('does not insert decorative Persona content into the keyboard tab order', () => {
    mount(
      <>
        <button>Before</button>
        <Persona name="Alex Morgan" secondaryText="Engineer" />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get('.fui-Persona').should('not.have.attr', 'role');
    cy.get(avatar).should('have.attr', 'role', 'img').and('have.attr', 'aria-label', 'Alex Morgan');
  });

  for (const textPosition of ['after', 'before', 'below'] as const) {
    it(`respects RTL layout for text ${textPosition}`, () => {
      mount(<Persona name="Alex Morgan" textPosition={textPosition} />, 'rtl');
      cy.get('.fui-Persona').should($root => {
        const coin = $root.find(avatar)[0].getBoundingClientRect();
        const text = $root.find(primary)[0].getBoundingClientRect();
        if (textPosition === 'after') {
          expect(text.right).to.be.lessThan(coin.left);
        } else if (textPosition === 'before') {
          expect(text.left).to.be.greaterThan(coin.right);
        } else {
          expect(text.top).to.be.greaterThan(coin.bottom);
        }
      });
    });
  }

  it('supports null coin slots without hiding the text content', () => {
    mount(
      <>
        <Persona name="Avatar omitted" avatar={null} />
        <Persona name="Presence omitted" presenceOnly presence={null} />
      </>,
    );
    cy.get(avatar).should('not.exist');
    cy.get('.fui-Persona__presence').should('not.exist');
    cy.get(primary).eq(0).should('have.text', 'Avatar omitted');
    cy.get(primary).eq(1).should('have.text', 'Presence omitted');
  });

  it('preserves consumer interactive text and its native keyboard behavior', () => {
    const click = cy.stub().as('click');
    mount(
      <>
        <button>Before</button>
        <Persona
          name="Alex Morgan"
          secondaryText={
            <a href="#profile" onClick={click}>
              View profile
            </a>
          }
        />
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('a', 'View profile').should('be.focused').realPress('Enter');
    cy.get('@click').should('have.been.calledOnce');
  });
});

describe('Persona documented scenarios', () => {
  for (const [size, avatarSize, presenceSize] of [
    ['extra-small', 20, 6],
    ['small', 28, 10],
    ['medium', 32, 12],
    ['large', 36, 16],
    ['extra-large', 40, 20],
    ['huge', 56, 20],
  ] as const) {
    it(`renders the documented ${size} avatar size and presence composition`, () => {
      mount(<Persona size={size} name="Alex Morgan" secondaryText="Available" presence={{ status: 'available' }} />);
      cy.get(avatar).should('have.css', 'width', `${avatarSize}px`).and('have.css', 'height', `${avatarSize}px`);
      cy.get(primary).should('have.text', 'Alex Morgan');
      cy.get('.fui-Persona__secondaryText').should('have.text', 'Available');
      cy.get(avatar).find('.fui-PresenceBadge').should('be.visible');
    });
    it(`renders ${size} presence-only without an avatar`, () => {
      mount(<Persona size={size} name="Alex Morgan" presenceOnly presence={{ status: 'available' }} />);
      cy.get(avatar).should('not.exist');
      cy.get('.fui-Persona__presence').should('have.css', 'width', `${presenceSize}px`);
      cy.get(primary).should('have.text', 'Alex Morgan');
    });
  }

  for (const textPosition of ['after', 'before', 'below'] as const) {
    it(`places text ${textPosition} the avatar in measured browser layout`, () => {
      mount(<Persona name="Alex Morgan" textPosition={textPosition} secondaryText="Engineer" />);
      cy.get('.fui-Persona').should($root => {
        const coin = $root.find(avatar)[0].getBoundingClientRect();
        const text = $root.find(primary)[0].getBoundingClientRect();
        if (textPosition === 'after') {
          expect(text.left).to.be.greaterThan(coin.right);
        } else if (textPosition === 'before') {
          expect(text.right).to.be.lessThan(coin.left);
        } else {
          expect(text.top).to.be.greaterThan(coin.bottom);
        }
      });
    });
  }

  for (const textAlignment of ['start', 'center'] as const) {
    it(`aligns four text lines at ${textAlignment}`, () => {
      mount(
        <Persona
          name="Alex Morgan"
          textAlignment={textAlignment}
          secondaryText="Available"
          tertiaryText="Engineer"
          quaternaryText="Contoso"
        />,
      );
      cy.get('.fui-Persona').should($root => {
        const coin = $root.find(avatar)[0].getBoundingClientRect();
        const first = $root.find(primary)[0].getBoundingClientRect();
        const last = $root.find('.fui-Persona__quaternaryText')[0].getBoundingClientRect();
        if (textAlignment === 'start') {
          expect(coin.top).to.equal(first.top);
        } else {
          expect(Math.abs((coin.top + coin.bottom) / 2 - (first.top + last.bottom) / 2)).to.be.lessThan(1);
        }
      });
    });
  }

  it('supports documented consumer overrides for previous presence behavior', () => {
    mount(
      <Persona
        name="Alex Morgan"
        presence={{
          status: 'away',
          outOfOffice: true,
          icon: <span className="custom-presence-icon">Away</span>,
          className: 'legacy-presence',
        }}
      />,
    );
    cy.get(avatar).find('.legacy-presence').should('be.visible');
    cy.get('.custom-presence-icon').should('have.text', 'Away');
  });
});
