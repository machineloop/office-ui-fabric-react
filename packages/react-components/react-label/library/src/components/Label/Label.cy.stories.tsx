import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Label } from './Label';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const required = '.fui-Label__required';

describe('Label unit-contract browser regressions', () => {
  it('forwards the native label ref, attributes, classes and current click callback', () => {
    const ref = React.createRef<HTMLLabelElement>();
    const click = cy.stub().as('click');
    mount(
      <Label ref={ref} id="label-root" title="Label tooltip" className="custom-label" onClick={click}>
        Name
      </Label>,
    );
    cy.get('#label-root')
      .should('have.prop', 'tagName', 'LABEL')
      .and('have.attr', 'title', 'Label tooltip')
      .and('have.class', 'custom-label');
    cy.get('#label-root').then($root => expect(ref.current).to.equal($root[0]));
    cy.get('#label-root').click();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('preserves custom required-slot attributes and explicitly overridden ARIA hiding', () => {
    const ref = React.createRef<HTMLSpanElement>();
    mount(<Label required={{ children: 'Required', ref, title: 'Requirement', 'aria-hidden': false }}>Name</Label>);
    cy.get(required)
      .should('have.text', 'Required')
      .and('have.attr', 'title', 'Requirement')
      .and('have.attr', 'aria-hidden', 'false');
    cy.get(required).then($indicator => expect(ref.current).to.equal($indicator[0]));
    cy.get('label').should($label => {
      for (const attribute of ['required', 'size', 'weight', 'disabled']) {
        expect($label).not.to.have.attr(attribute);
      }
    });
  });

  it('updates htmlFor, text, required indicator and typography with parent props', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <Label htmlFor={updated ? 'second' : 'first'} required={!updated} size={updated ? 'large' : 'small'}>
            {updated ? 'Updated name' : 'Original name'}
          </Label>
          <input id="first" />
          <input id="second" />
        </>
      );
    };
    mount(<Example />);
    cy.get(required).should('have.text', '*');
    cy.contains('button', 'Update').click();
    cy.get('label')
      .should('have.attr', 'for', 'second')
      .and('have.text', 'Updated name')
      .and('have.css', 'font-size', '16px')
      .click();
    cy.get('#second').should('be.focused');
    cy.get(required).should('not.exist');
  });
});

describe('Label accessibility and native-control edges', () => {
  it('uses native label association to toggle a checkbox and retains keyboard control behavior', () => {
    const change = cy.stub().as('change');
    mount(
      <>
        <Label id="checkbox-label" htmlFor="choice">
          Choice
        </Label>
        <input id="choice" type="checkbox" onChange={change} />
      </>,
    );
    cy.get('#checkbox-label').click();
    cy.get('#choice')
      .should('be.checked')
      .and('be.focused')
      .then($input => {
        expect(($input[0] as HTMLInputElement).labels!.item(0)).to.equal(
          $input[0].ownerDocument.getElementById('checkbox-label'),
        );
      });
    cy.get('#choice').realPress('Space');
    cy.get('#choice').should('not.be.checked');
    cy.get('@change').should('have.been.calledTwice');
  });

  it('keeps required and disabled label props visual rather than mutating the associated control', () => {
    mount(
      <>
        <Label htmlFor="visual" required disabled>
          Visual state
        </Label>
        <input id="visual" />
      </>,
    );
    cy.get('#visual').should('not.be.disabled');
    cy.get('#visual').should('not.have.attr', 'required');
    cy.get('#visual').should('not.have.attr', 'aria-required');
    cy.get(required).should('have.attr', 'aria-hidden', 'true');
    cy.get('label').click();
    cy.get('#visual').should('be.focused');
  });

  it('adds no tab stop between the preceding control and its associated input', () => {
    mount(
      <>
        <button>Before</button>
        <Label htmlFor="name">Name</Label>
        <input id="name" />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.get('#name').should('be.focused').realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get('label').should('not.have.attr', 'tabindex');
  });
});

describe('Label documented scenarios', () => {
  for (const [size, fontSize] of [
    ['small', 12],
    ['medium', 14],
    ['large', 16],
  ] as const) {
    for (const weight of ['regular', 'semibold'] as const) {
      it(`renders ${size}/${weight} typography and names an input`, () => {
        mount(
          <>
            <Label htmlFor="name" size={size} weight={weight}>
              Name
            </Label>
            <input id="name" />
          </>,
        );
        cy.get('label')
          .should('have.css', 'font-size', `${fontSize}px`)
          .and('have.css', 'font-weight', size === 'large' || weight === 'semibold' ? '600' : '400');
        cy.contains('label', 'Name').click();
        cy.get('#name').should('be.focused').type('Alex').should('have.value', 'Alex');
      });
    }
  }

  it('displays default, string and JSX required indicators as decorative by default', () => {
    mount(
      <>
        <Label required>Default</Label>
        <Label required="***">String</Label>
        <Label required={<strong>Required</strong>}>JSX</Label>
        <Label>No indicator</Label>
      </>,
    );
    cy.get(required)
      .should('have.length', 3)
      .each($indicator => expect($indicator).to.have.attr('aria-hidden', 'true'));
    cy.get(required).eq(0).should('have.text', '*');
    cy.get(required).eq(1).should('have.text', '***');
    cy.get(required).eq(2).find('strong').should('have.text', 'Required');
    cy.get('label').eq(3).find(required).should('not.exist');
  });

  it('renders the disabled appearance while leaving native control disability to its owner', () => {
    mount(
      <>
        <Label disabled required htmlFor="disabled-input">
          Disabled label
        </Label>
        <input id="disabled-input" disabled />
      </>,
    );
    cy.get('label').should('have.css', 'color', 'rgb(189, 189, 189)');
    cy.contains('label', 'Disabled label').click();
    cy.get('#disabled-input').should('be.disabled').and('not.be.focused');
  });
});
