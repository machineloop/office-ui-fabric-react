import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Radio } from '@fluentui/react-radio';
import { RadioGroup } from './RadioGroup';
import { Field } from '@fluentui/react-field';
import { ControlledValue } from '../../../../stories/src/RadioGroup/RadioGroupControlledValue.stories';
import { LabelSubtext } from '../../../../stories/src/RadioGroup/RadioGroupLabelSubtext.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const Choices = () => (
  <>
    <Radio value="apple" label="Apple" />
    <Radio value="pear" label="Pear" />
    <Radio value="banana" label="Banana" />
  </>
);
const radios = 'input[type="radio"]';

describe('RadioGroup unit-derived contracts', () => {
  it('shares generated names within groups but isolates different groups', () => {
    mount(
      <>
        <RadioGroup data-testid="first">
          <Choices />
        </RadioGroup>
        <RadioGroup data-testid="second">
          <Choices />
        </RadioGroup>
      </>,
    );
    cy.get('[data-testid="first"] input').then($first => {
      const name = ($first[0] as HTMLInputElement).name;
      expect(name).not.to.equal('');
      $first.each((_, input) => {
        expect(input).to.have.attr('name', name);
      });
      cy.get('[data-testid="second"] input').each($input => expect($input).not.to.have.attr('name', name));
    });
    cy.get('[data-testid="first"]').contains('label', 'Apple').click();
    cy.get('[data-testid="second"]').contains('label', 'Pear').click();
    cy.get(`${radios}:checked`).should('have.length', 2);
  });

  it('preserves explicit group names and individual overrides with callbacks', () => {
    const change = cy.stub().as('change');
    mount(
      <RadioGroup name="fruit" onChange={change}>
        <Radio value="apple" label="Apple" />
        <Radio name="local" value="pear" label="Pear" />
      </RadioGroup>,
    );
    cy.get(`${radios}[value="apple"]`).should('have.attr', 'name', 'fruit');
    cy.get(`${radios}[value="pear"]`).should('have.attr', 'name', 'local');
    cy.contains('label', 'Pear').click();
    cy.get('@change')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pear' });
  });

  it('ignores later defaultValue changes but accepts controlled value updates', () => {
    const Harness = () => {
      const [value, setValue] = React.useState('apple');
      return (
        <>
          <button onClick={() => setValue('pear')}>Update</button>
          <RadioGroup data-testid="default" defaultValue={value}>
            <Choices />
          </RadioGroup>
          <RadioGroup data-testid="controlled" value={value}>
            <Choices />
          </RadioGroup>
        </>
      );
    };
    mount(<Harness />);
    cy.contains('button', 'Update').click();
    cy.get('[data-testid="default"] input:checked').should('have.value', 'apple');
    cy.get('[data-testid="controlled"] input:checked').should('have.value', 'pear');
  });

  it('supports individual checked and defaultChecked contracts', () => {
    mount(
      <>
        <RadioGroup data-testid="default">
          <Radio value="apple" label="Apple" defaultChecked />
          <Radio value="pear" label="Pear" />
        </RadioGroup>
        <RadioGroup data-testid="controlled">
          <Radio value="banana" label="Banana" checked onChange={() => undefined} />
        </RadioGroup>
      </>,
    );
    cy.get('[data-testid="default"] input:checked').should('have.value', 'apple');
    cy.get('[data-testid="controlled"] input:checked').should('have.value', 'banana');
  });

  it('forwards root refs, attributes and classes without leaking state props', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <RadioGroup
        ref={ref}
        id="group"
        className="consumer"
        aria-label="Fruit"
        layout="horizontal"
        name="fruit"
        defaultValue="apple"
        required
      >
        <Choices />
      </RadioGroup>,
    );
    cy.get('#group').should($root => {
      expect($root).to.have.class('consumer').and.have.attr('aria-label', 'Fruit');
      expect($root).not.to.have.attr('layout');
      expect($root).not.to.have.attr('name');
      expect(ref.current).to.equal($root[0]);
    });
    cy.get(radios).each($input => expect($input).to.have.attr('required'));
  });

  it('propagates validation error descriptions and required ARIA from Field', () => {
    mount(
      <Field label="Fruit" validationMessage="Select fruit" required>
        <RadioGroup>
          <Choices />
        </RadioGroup>
      </Field>,
    );
    cy.get('[role="radiogroup"]')
      .should('have.attr', 'aria-required', 'true')
      .invoke('attr', 'aria-describedby')
      .then(id => cy.get(`[id="${id}"]`).should('contain.text', 'Select fruit'));
  });
});

describe('RadioGroup native keyboard and accessibility edges', () => {
  for (const layout of ['vertical', 'horizontal', 'horizontal-stacked'] as const) {
    it(`provides one tab stop, wraparound arrows and disabled skipping in ${layout}`, () => {
      const change = cy.stub().as('change');
      mount(
        <>
          <button>Before</button>
          <RadioGroup aria-label="Fruit" layout={layout} defaultValue="apple" onChange={change}>
            <Radio value="apple" label="Apple" />
            <Radio value="pear" label="Pear" disabled />
            <Radio value="banana" label="Banana" />
          </RadioGroup>
          <button>After</button>
        </>,
      );
      cy.contains('button', 'Before').click().realPress('Tab');
      cy.get(`${radios}[value="apple"]`).should('be.focused').realPress('ArrowRight');
      cy.get(`${radios}[value="banana"]`).should('be.focused').and('be.checked').realPress('ArrowDown');
      cy.get(`${radios}[value="apple"]`).should('be.focused').and('be.checked').realPress('ArrowLeft');
      cy.get(`${radios}[value="banana"]`).should('be.focused').and('be.checked').realPress('ArrowUp');
      cy.get(`${radios}[value="apple"]`).should('be.checked').realPress('Space');
      cy.get('@change').should('have.callCount', 4);
      cy.get(`${radios}[value="apple"]`).realPress('Tab');
      cy.contains('button', 'After').should('be.focused').realPress(['Shift', 'Tab']);
      cy.get(`${radios}[value="apple"]`).should('be.focused');
    });
  }

  it('reports requested controlled changes without accepting rejected selection', () => {
    const change = cy.stub().as('change');
    mount(
      <RadioGroup aria-label="Fruit" value="apple" onChange={change}>
        <Choices />
      </RadioGroup>,
    );
    cy.contains('label', 'Pear').click();
    cy.get(`${radios}:checked`).should('have.length', 1).and('have.value', 'apple');
    cy.get('@change')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pear' });
  });

  it('validates a Field-required group through native form validity', () => {
    mount(
      <form id="fruit-form">
        <Field label="Favorite fruit" required>
          <RadioGroup>
            <Choices />
          </RadioGroup>
        </Field>
      </form>,
    );
    cy.get('#fruit-form').should($form => expect(($form[0] as HTMLFormElement).checkValidity()).to.equal(false));
    cy.contains('label', 'Pear').click();
    cy.get('#fruit-form').should($form => expect(($form[0] as HTMLFormElement).checkValidity()).to.equal(true));
  });

  it('ignores non-radio change events bubbling through the group', () => {
    const change = cy.stub().as('change');
    mount(
      <RadioGroup aria-label="Fruit" onChange={change}>
        <Choices />
        <input id="extra-checkbox" type="checkbox" />
      </RadioGroup>,
    );
    cy.get('#extra-checkbox').check();
    cy.get('@change').should('not.have.been.called');
    cy.contains('label', 'Apple').click();
    cy.get('@change')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'apple' });
  });

  it('propagates Field descriptions while respecting local radio description overrides', () => {
    mount(
      <>
        <span id="local-description">Local description</span>
        <Field label="Favorite fruit" hint="Choose one fruit">
          <RadioGroup>
            <Radio value="apple" label="Apple" />
            <Radio value="pear" label="Pear" aria-describedby="local-description" />
          </RadioGroup>
        </Field>
      </>,
    );
    cy.get(`${radios}[value="apple"]`)
      .invoke('attr', 'aria-describedby')
      .then(ids => {
        expect(ids).to.be.a('string');
        for (const id of ids!.split(' ')) {
          cy.get(`[id="${id}"]`).should('contain.text', 'Choose one fruit');
        }
      });
    cy.get(`${radios}[value="pear"]`).should('have.attr', 'aria-describedby', 'local-description');
  });
});

describe('RadioGroup documented scenarios', () => {
  for (const layout of ['vertical', 'horizontal', 'horizontal-stacked'] as const) {
    it(`renders ${layout} layout and allows exclusive selection`, () => {
      mount(
        <RadioGroup aria-label="Fruit" layout={layout}>
          <Choices />
        </RadioGroup>,
      );
      cy.get('[role="radiogroup"]').should('have.css', 'flex-direction', layout === 'vertical' ? 'column' : 'row');
      cy.contains('label', 'Apple').click();
      cy.get(`${radios}[value="apple"]`).should('be.checked');
      cy.contains('label', 'Pear').click();
      cy.get(`${radios}:checked`).should('have.length', 1).and('have.value', 'pear');
      if (layout === 'horizontal-stacked') {
        cy.get('.fui-Radio')
          .first()
          .should($root => {
            const indicator = $root.find('.fui-Radio__indicator')[0].getBoundingClientRect();
            const label = $root.find('label')[0].getBoundingClientRect();
            expect(label.top).to.be.at.least(indicator.bottom);
          });
      }
    });
  }

  it('sets the initial default selection and permits replacement', () => {
    mount(
      <RadioGroup aria-label="Fruit" defaultValue="pear">
        <Choices />
      </RadioGroup>,
    );
    cy.get(`${radios}:checked`).should('have.value', 'pear');
    cy.contains('label', 'Banana').click();
    cy.get(`${radios}:checked`).should('have.length', 1).and('have.value', 'banana');
  });

  it('updates and clears the documented controlled selection', () => {
    mount(<ControlledValue />);
    cy.get(`${radios}:checked`).should('have.value', 'banana');
    cy.contains('label', 'Pear').click();
    cy.get(`${radios}:checked`).should('have.value', 'pear');
    cy.contains('button', 'Clear selection').click();
    cy.get(`${radios}:checked`).should('not.exist');
  });

  it('propagates group disabled state to every native input', () => {
    mount(
      <RadioGroup aria-label="Fruit" disabled defaultValue="pear">
        <Choices />
      </RadioGroup>,
    );
    cy.get(radios)
      .should('have.length', 3)
      .each($radio => expect($radio).to.be.disabled);
    cy.contains('label', 'Apple').click();
    cy.get(`${radios}:checked`).should('have.value', 'pear');
  });

  it('disables only an individual unavailable option', () => {
    mount(
      <RadioGroup aria-label="Fruit">
        <Radio value="apple" label="Apple" />
        <Radio value="pear" label="Pear" disabled />
      </RadioGroup>,
    );
    cy.get(`${radios}[value="pear"]`).should('be.disabled');
    cy.contains('label', 'Apple').click();
    cy.get(`${radios}[value="apple"]`).should('be.checked').and('not.be.disabled');
  });

  it('inherits group naming and required attributes from Field', () => {
    mount(
      <Field label="Favorite fruit" required>
        <RadioGroup>
          <Choices />
        </RadioGroup>
      </Field>,
    );
    cy.get('[role="radiogroup"]')
      .invoke('attr', 'aria-labelledby')
      .then(id => cy.get(`[id="${id}"]`).should('contain.text', 'Favorite fruit'));
    cy.get(radios).each($radio => expect($radio).to.have.attr('required'));
  });

  it('preserves documented formatted label subtext and native label activation', () => {
    mount(<LabelSubtext />);
    cy.contains('label', 'Banana').should('contain.text', 'This is an example subtext').click();
    cy.get(`${radios}:checked`).should('have.value', 'A');
  });
});
