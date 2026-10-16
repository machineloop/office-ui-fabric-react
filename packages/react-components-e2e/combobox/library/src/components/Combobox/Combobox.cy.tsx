import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';

import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';

import { Combobox, Option } from '@fluentui/react-combobox';
import type { ComboboxProps } from '@fluentui/react-combobox';

import { triggerSelector, listboxSelector, triggerId } from '../../testing/selectors';
import type { JSXElement } from '@fluentui/react-utilities';
import { Field } from '@fluentui/react-field';
import { Filtering } from '../../../../stories/src/Combobox/ComboboxFiltering.stories';
import { Freeform } from '../../../../stories/src/Combobox/ComboboxFreeform.stories';
import { Grouped } from '../../../../stories/src/Combobox/ComboboxGrouped.stories';
import { Controlled } from '../../../../stories/src/Combobox/ComboboxControlled.stories';

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const Options = () => (
  <>
    <Option value="cat">Cat</Option>
    <Option value="dog">Dog</Option>
    <Option value="fish">Fish</Option>
  </>
);
const input = '[role="combobox"]';
const popup = '[role="listbox"]:visible';

describe('Combobox documented scenarios', () => {
  it('selects an option by pointer and closes the popup', () => {
    mount(
      <Combobox aria-label="Pet">
        <Options />
      </Combobox>,
    );
    cy.get(input).click();
    cy.contains('[role="option"]', 'Dog').click();
    cy.get(input).should('have.value', 'Dog').and('have.attr', 'aria-expanded', 'false');
    cy.get(popup).should('not.exist');
  });

  it('filters options and announces an empty result', () => {
    mount(<Filtering />);
    cy.get(input).type('Do');
    cy.get(popup).find('[role="option"]').should('have.length', 2);
    cy.contains('[role="option"]', 'Dolphin').click();
    cy.get(input).should('have.value', 'Dolphin');
    cy.get(input).clear().type('zzz');
    cy.get(popup).should('contain.text', 'No animals match your search.');
    cy.get(popup).find('[role="option"]:not([aria-disabled="true"])').should('not.exist');
  });

  it('offers a custom freeform option and retains custom text on blur', () => {
    mount(
      <>
        <Freeform />
        <button>Outside</button>
      </>,
    );
    cy.get(input).type('Unicorn');
    cy.contains('[role="option"]', 'Search for "Unicorn"').should('be.visible').click();
    cy.get(input).should('have.value', 'Unicorn');
    cy.contains('button', 'Outside').click();
    cy.get(input).should('have.value', 'Unicorn');
  });

  it('selects options in the documented labelled groups', () => {
    mount(<Grouped />);
    cy.get(input).click();
    cy.get(popup).find('[role="group"]').should('have.length.greaterThan', 1);
    cy.get(popup)
      .find('[role="option"]')
      .last()
      .then($option => {
        const text = $option.text().trim();
        cy.wrap($option).click();
        cy.get(input).should('have.value', text);
      });
  });

  it('updates the documented controlled selection', () => {
    mount(<Controlled />);
    cy.get(input).eq(1).click();
    cy.contains('[role="option"]', 'Wanda Howard').click();
    cy.get(input).eq(1).should('have.value', 'whoward').click();
    cy.contains('[role="option"]', 'Wanda Howard').should('have.attr', 'aria-selected', 'true');
  });

  it('keeps multiselect open and supports deselection', () => {
    const select = cy.stub().as('select');
    mount(
      <Combobox aria-label="Pets" multiselect onOptionSelect={select}>
        <Options />
      </Combobox>,
    );
    cy.get(input).click();
    cy.contains('[role="menuitemcheckbox"]', 'Cat').click().should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Dog').click().should('have.attr', 'aria-checked', 'true');
    cy.get(input).should('have.attr', 'aria-expanded', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Cat').click().should('have.attr', 'aria-checked', 'false');
    cy.get('@select')
      .should('have.been.calledThrice')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { selectedOptions: ['dog'] });
  });

  it('clears a selection while preserving input focus', () => {
    mount(
      <Combobox aria-label="Pet" clearable>
        <Options />
      </Combobox>,
    );
    cy.get('.fui-Combobox__clearIcon').should('not.be.visible');
    cy.get(input).click();
    cy.contains('[role="option"]', 'Cat').click();
    cy.get('.fui-Combobox__clearIcon').should('be.visible').click();
    cy.get(input).should('have.value', '').and('be.focused');
    cy.get('.fui-Combobox__clearIcon').should('not.be.visible');
  });

  for (const size of ['small', 'medium', 'large'] as const) {
    for (const appearance of ['outline', 'underline', 'filled-darker', 'filled-lighter'] as const) {
      it(`selects in the ${size}/${appearance} variant`, () => {
        mount(
          <Combobox aria-label="Pet" size={size} appearance={appearance}>
            <Options />
          </Combobox>,
        );
        cy.get(input).click();
        cy.contains('[role="option"]', 'Fish').click();
        cy.get(input).should('have.value', 'Fish').and('have.attr', 'aria-expanded', 'false');
      });
    }
  }

  it('does not open or accept text when disabled', () => {
    mount(
      <Combobox aria-label="Pet" disabled>
        <Options />
      </Combobox>,
    );
    cy.get(input).should('be.disabled');
    cy.get('.fui-Combobox__expandIcon').should('have.attr', 'aria-disabled', 'true').click();
    cy.get(popup).should('not.exist');
    cy.get(input).should('have.value', '');
  });
});

describe('Combobox keyboard and accessibility edges', () => {
  it('keeps focus on input while arrows update the active descendant and Enter selects', () => {
    mount(
      <Combobox aria-label="Pet">
        <Options />
      </Combobox>,
    );
    cy.get(input).click().realPress('ArrowDown');
    cy.get(input)
      .should('be.focused')
      .invoke('attr', 'aria-activedescendant')
      .then(id => {
        cy.get(`[id="${id}"]`).should('have.text', 'Dog');
      });
    cy.get(input).realPress('Enter');
    cy.get(input).should('have.value', 'Dog').and('have.attr', 'aria-expanded', 'false');
  });

  it('uses Alt arrows and Escape without stealing input focus', () => {
    mount(
      <Combobox aria-label="Pet">
        <Options />
      </Combobox>,
    );
    cy.get(input).focus().realPress(['Alt', 'ArrowDown']);
    cy.get(popup).should('be.visible');
    cy.get(input).realPress(['Alt', 'ArrowUp']);
    cy.get(input).should('have.attr', 'aria-expanded', 'false');
    cy.get(input).realPress('Enter');
    cy.get(popup).should('be.visible');
    cy.get(input).realPress('Escape');
    cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });

  it('moves to boundary options and clears ARIA active descendant for text cursor movement', () => {
    mount(
      <Combobox aria-label="Pet">
        <Options />
      </Combobox>,
    );
    cy.get(input).click().realPress('End');
    cy.get(input)
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Fish'));
    cy.get(input).realPress('Home');
    cy.get(input)
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Cat'));
    cy.get(input).realPress('ArrowLeft');
    cy.get(input).should('not.have.attr', 'aria-activedescendant');
    cy.get(input).realPress('ArrowDown');
    cy.get(input)
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Dog'));
  });

  it('does not select disabled options through pointer or keyboard', () => {
    const selected = cy.stub().as('selected');
    mount(
      <Combobox aria-label="Pet" onOptionSelect={selected}>
        <Option>Cat</Option>
        <Option disabled>Dog</Option>
        <Option>Fish</Option>
      </Combobox>,
    );
    cy.get(input).click();
    cy.contains('[role="option"]', 'Dog').should('have.attr', 'aria-disabled', 'true').click();
    cy.get('@selected').should('not.have.been.called');
    cy.get(input).focus().realPress('ArrowDown');
    cy.get(input).realPress('Enter');
    cy.get('@selected').should('not.have.been.called');
    cy.get(input).realPress('ArrowDown');
    cy.get(input).realPress('Enter');
    cy.get(input).should('have.value', 'Fish');
  });

  it('allows freeform Space input while typing rather than selecting an option', () => {
    const selected = cy.stub().as('selected');
    mount(
      <Combobox aria-label="Pet" freeform onOptionSelect={selected}>
        <Option>Fox Terrier</Option>
      </Combobox>,
    );
    cy.get(input).type('Fox ').should('have.value', 'Fox ');
    cy.get('@selected').should('not.have.been.called');
    cy.get(input).realPress('ArrowDown').realPress('Space');
    cy.get(input).should('have.value', 'Fox Terrier');
    cy.get('@selected').should('have.been.calledOnce');
  });

  for (const inlinePopup of [false, true]) {
    it(`connects the ${inlinePopup ? 'inline' : 'portalled'} popup with stable ARIA ids`, () => {
      mount(
        <Combobox aria-label="Pet" inlinePopup={inlinePopup}>
          <Options />
        </Combobox>,
      );
      cy.get('.fui-Combobox__expandIcon').should('have.attr', 'aria-label', 'Open Pet').click();
      cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'true');
      cy.get(popup)
        .invoke('attr', 'id')
        .then(id => {
          cy.get(input).should('have.attr', 'aria-controls', id);
          cy.get('.fui-Combobox').should($root => {
            if (inlinePopup) {
              expect($root).not.to.have.attr('aria-owns');
              expect($root.find(`[id="${id}"]`)).to.have.length(1);
            } else {
              expect($root).to.have.attr('aria-owns', id);
              expect($root.find(`[id="${id}"]`)).to.have.length(0);
            }
          });
        });
      cy.get(input).realPress('Escape');
      cy.get(input).should('not.have.attr', 'aria-controls');
    });
  }

  it('retains rejected controlled selection and reports the requested value', () => {
    const selected = cy.stub().as('selected');
    mount(
      <Combobox aria-label="Pet" selectedOptions={['cat']} value="Cat" onOptionSelect={selected}>
        <Options />
      </Combobox>,
    );
    cy.get(input).click();
    cy.contains('[role="option"]', 'Dog').click();
    cy.get(input).should('have.value', 'Cat');
    cy.get('@selected')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
        optionValue: 'dog',
        optionText: 'Dog',
        selectedOptions: ['dog'],
      });
    cy.get(input).click();
    cy.contains('[role="option"]', 'Cat').should('have.attr', 'aria-selected', 'true');
    cy.contains('[role="option"]', 'Dog').should('have.attr', 'aria-selected', 'false');
  });
});

describe('Combobox unit-contract browser regressions', () => {
  it('commits the active option when Tab leaves an open combobox', () => {
    mount(
      <>
        <Combobox aria-label="Pet">
          <Options />
        </Combobox>
        <button>Next</button>
      </>,
    );
    cy.get(input).click().realPress('ArrowDown');
    cy.get(input).realPress('Tab');
    cy.contains('button', 'Next').should('be.focused');
    cy.get(input).should('have.value', 'Dog').and('have.attr', 'aria-expanded', 'false');
  });

  it('discards unmatched text on collapsed non-freeform blur', () => {
    mount(
      <>
        <Combobox aria-label="Pet">
          <Options />
        </Combobox>
        <button>Next</button>
      </>,
    );
    cy.get(input).type('Unicorn').realPress('Escape');
    cy.contains('button', 'Next').click();
    cy.get(input).should('have.value', '');
  });

  it('preserves freeform text including spaces after blur', () => {
    mount(
      <>
        <Combobox aria-label="Pet" freeform>
          <Options />
        </Combobox>
        <button>Next</button>
      </>,
    );
    cy.get(input).type('Snow leopard').realPress('Escape');
    cy.contains('button', 'Next').click();
    cy.get(input).should('have.value', 'Snow leopard');
  });

  it('selects a complete case-insensitive match on collapsed blur', () => {
    const select = cy.stub().as('select');
    mount(
      <>
        <Combobox aria-label="Pet" open={false} onOptionSelect={select}>
          <Options />
        </Combobox>
        <button>Next</button>
      </>,
    );
    cy.get(input).type('dOg');
    cy.contains('button', 'Next').click();
    cy.get(input).should('have.value', 'Dog');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { optionValue: 'dog', selectedOptions: ['dog'] });
  });

  it('honors a controlled open state when closure is rejected', () => {
    const change = cy.stub().as('openChange');
    mount(
      <Combobox aria-label="Pet" open onOpenChange={change}>
        <Options />
      </Combobox>,
    );
    cy.get(input).focus().realPress('Escape');
    cy.get(popup).should('be.visible');
    cy.get(input).should('have.attr', 'aria-expanded', 'true');
    cy.get('@openChange')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { open: false });
  });

  it('uses input refs, partitions native attributes and accepts custom expand labels', () => {
    const ref = React.createRef<HTMLInputElement>();
    mount(
      <Combobox
        ref={ref}
        id="pet-input"
        aria-label="Pet"
        name="pet"
        root={{ className: 'pet-root' }}
        expandIcon={{ 'aria-label': 'Show pets' }}
      >
        <Options />
      </Combobox>,
    );
    cy.get(input).should('have.attr', 'id', 'pet-input').and('have.attr', 'name', 'pet');
    cy.get(input).then($input => expect(ref.current).to.equal($input[0]));
    cy.get('.pet-root').should('have.class', 'fui-Combobox');
    cy.get('[aria-label="Show pets"]').click();
    cy.get(input).should('be.focused');
    cy.get(popup).should('be.visible');
  });

  it('inherits required, invalid and description semantics from Field', () => {
    mount(
      <Field label="Pet" required validationMessage="Pick a pet">
        <Combobox>
          <Options />
        </Combobox>
      </Field>,
    );
    cy.get(input).should('have.attr', 'required');
    cy.get(input).should('have.attr', 'aria-invalid', 'true');
    cy.get(input)
      .invoke('attr', 'id')
      .then(id => cy.get(`label[for="${id}"]`).should('contain.text', 'Pet'));
    cy.get(input)
      .invoke('attr', 'aria-describedby')
      .then(ids => {
        expect(ids).to.be.a('string');
        cy.get(`[id="${ids!.split(' ')[0]}"]`).should('contain.text', 'Pick a pet');
      });
  });

  it('reports active option changes without changing selection', () => {
    const active = cy.stub().as('active');
    const selected = cy.stub().as('selected');
    mount(
      <Combobox aria-label="Pet" onActiveOptionChange={active} onOptionSelect={selected}>
        <Options />
      </Combobox>,
    );
    cy.get(input).click().realPress('ArrowDown');
    cy.get('@active').should('have.been.calledWithMatch', Cypress.sinon.match.any, {
      nextOption: { value: 'dog', text: 'Dog' },
    });
    cy.get('@selected').should('not.have.been.called');
  });

  it('pages through long option lists without moving DOM focus', () => {
    mount(
      <Combobox aria-label="Numbers">
        {Array.from({ length: 25 }, (_, index) => (
          <Option key={index} value={`${index}`}>{`Item ${index}`}</Option>
        ))}
      </Combobox>,
    );
    cy.get(input).click().realPress('PageDown');
    cy.get(input)
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Item 10'));
    cy.get(input).realPress('PageUp');
    cy.get(input)
      .should('be.focused')
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Item 0'));
  });
});

describe('Combobox controlling open/close state', () => {
  const ControlledOpenCloseStateCombobox = (props: Partial<ComboboxProps>) => {
    const options = ['Cat', 'Dog', 'Ferret', 'Fish', 'Hamster', 'Snake'];

    const [open, setOpen] = React.useState(false);
    const handleOpenChange: ComboboxProps['onOpenChange'] = (e, data) => setOpen(data.open);
    const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = event => setOpen(!!event.target.checked);

    return (
      <>
        <label>
          <input id={triggerId} type="checkbox" name="state" value="open" checked={open} onChange={handleInputChange} />
          Open/Close
        </label>

        <Combobox placeholder="Select an animal" open={open} onOpenChange={handleOpenChange} {...props}>
          {options.map(option => (
            <Option key={option}>{option}</Option>
          ))}
        </Combobox>
      </>
    );
  };

  it('should open/close dropdown when the controlled input state changes', () => {
    mount(<ControlledOpenCloseStateCombobox />);

    cy.get(triggerSelector).check();
    cy.get(listboxSelector).should('be.visible');

    cy.get(triggerSelector).uncheck();
    cy.get(listboxSelector).should('not.exist');
  });

  it('should close dropdown when clicked outside', () => {
    mount(<ControlledOpenCloseStateCombobox />);

    cy.get(triggerSelector).check();
    cy.get(listboxSelector).should('be.visible');

    cy.get('body').click({ force: true });
    cy.get(listboxSelector).should('not.exist');
  });
});
