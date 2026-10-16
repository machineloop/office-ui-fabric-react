import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { TagPicker, TagPickerControl, TagPickerInput, TagPickerList, TagPickerGroup } from '@fluentui/react-tag-picker';
import type { TagPickerProps } from '@fluentui/react-tag-picker';
import { TagPickerOption } from './TagPickerOption';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const Picker = ({ children, ...props }: Omit<TagPickerProps, 'children'> & { children: React.ReactNode }) => (
  <TagPicker {...props}>
    <TagPickerControl>
      <TagPickerGroup aria-label="Selected people" />
      <TagPickerInput aria-label="Choose people" />
    </TagPickerControl>
    <TagPickerList>{children}</TagPickerList>
  </TagPicker>
);
const option = '.fui-TagPickerOption';
const input = '[role="combobox"]';

describe('TagPickerOption unit-contract browser regressions', () => {
  it('forwards root refs/native attributes and merges option click with picker selection', () => {
    const ref = React.createRef<HTMLDivElement>();
    const click = cy.stub().as('click');
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOption
          ref={ref}
          value="alex"
          id="custom-option"
          title="Option tooltip"
          className="custom-option"
          onClick={click}
        >
          Alex Morgan
        </TagPickerOption>
      </Picker>,
    );
    cy.get(input).click();
    cy.get('#custom-option').should('have.attr', 'title', 'Option tooltip').and('have.class', 'custom-option');
    cy.get('#custom-option').then($option => expect(ref.current).to.equal($option[0]));
    cy.get('#custom-option').click();
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'alex' });
  });

  it('supports slot object attributes and null optional slots without empty decoration', () => {
    mount(
      <Picker>
        <TagPickerOption
          value="alex"
          media={{ children: 'AM', title: 'Media title' }}
          secondaryContent={{ children: 'Engineer', title: 'Secondary title' }}
        >
          Alex Morgan
        </TagPickerOption>
        <TagPickerOption value="riley" media={null} secondaryContent={null}>
          Riley Chen
        </TagPickerOption>
      </Picker>,
    );
    cy.get(input).click();
    cy.get(option).eq(0).find('.fui-TagPickerOption__media').should('have.attr', 'title', 'Media title');
    cy.get(option).eq(0).find('.fui-TagPickerOption__secondaryContent').should('have.attr', 'title', 'Secondary title');
    cy.get(option)
      .eq(1)
      .should('have.css', 'display', 'flex')
      .find('.fui-TagPickerOption__media, .fui-TagPickerOption__secondaryContent')
      .should('not.exist');
  });

  it('updates registered option text/value and latest root callback after parent rerender', () => {
    const select = cy.stub().as('select');
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <Picker open onOptionSelect={select}>
            <TagPickerOption
              value={updated ? 'new' : 'old'}
              text={updated ? 'New name' : 'Old name'}
              onClick={updated ? latest : first}
            >
              {updated ? 'New name' : 'Old name'}
            </TagPickerOption>
          </Picker>
        </>
      );
    };
    mount(<Example />);
    cy.contains('button', 'Update').click();
    cy.get(input).focus().type('New');
    cy.get(input)
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'New name'));
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'new', selectedOptions: ['new'] });
    cy.get(option).should('have.text', 'New name').click();
    cy.get('@first').should('not.have.been.called');
    cy.get('@latest').should('have.been.calledOnce');
    cy.get('@select').should('have.been.calledTwice');
  });
});

describe('TagPickerOption browser accessibility and state edges', () => {
  it('uses input focus and active-descendant navigation rather than option DOM focus', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOption value="alex">Alex Morgan</TagPickerOption>
        <TagPickerOption value="riley">Riley Chen</TagPickerOption>
      </Picker>,
    );
    cy.get(input).click().realPress('ArrowDown');
    cy.get(input)
      .should('be.focused')
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.class', 'fui-TagPickerOption').and('have.text', 'Riley Chen'));
    cy.get('@select').should('not.have.been.called');
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'riley' });
  });

  it('preserves option semantics without checkbox decoration even when already selected', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker defaultSelectedOptions={['alex']} onOptionSelect={select}>
        <TagPickerOption value="alex">Alex Morgan</TagPickerOption>
      </Picker>,
    );
    cy.get(input).click();
    cy.get(option).should('have.attr', 'role', 'option');
    cy.get(option).should('not.have.attr', 'aria-checked');
    cy.get(option).find('.fui-Option__checkIcon').should('not.exist');
    cy.get(option).click();
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'alex', selectedOptions: ['alex'] });
  });

  it('cancels navigation with Escape without selecting the active option', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOption value="alex">Alex Morgan</TagPickerOption>
      </Picker>,
    );
    cy.get(input).click().realPress('Escape');
    cy.get(option).should('not.be.visible');
    cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false');
    cy.get('@select').should('not.have.been.called');
  });
});

describe('TagPickerOption documented composition', () => {
  it('selects a simple option and returns its value through the picker callback', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOption value="alex">Alex Morgan</TagPickerOption>
      </Picker>,
    );
    cy.get(input).click();
    cy.get(option).should('have.attr', 'role', 'option').and('have.text', 'Alex Morgan').click();
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'alex', selectedOptions: ['alex'] });
    cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });

  it('renders media and secondary information without polluting type-to-find text', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOption
          value="alex"
          text="Alex Morgan"
          media={<span aria-hidden="true">AM</span>}
          secondaryContent="Engineer"
        >
          <strong>Alex Morgan</strong>
        </TagPickerOption>
        <TagPickerOption value="riley">Riley Chen</TagPickerOption>
      </Picker>,
    );
    cy.get(input).type('Alex').realPress('Enter');
    cy.get('@select').should('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'alex' });
    cy.get(input).click();
    cy.get(option).first().should('have.css', 'display', 'grid');
    cy.get(option).first().find('.fui-TagPickerOption__media').should('contain.text', 'AM');
    cy.get(option)
      .first()
      .find('.fui-TagPickerOption__secondaryContent')
      .should('have.text', 'Engineer')
      .and('have.css', 'font-size', '12px');
  });

  it('places a secondary line beside media spanning both text lines', () => {
    mount(
      <Picker>
        <TagPickerOption value="alex" media={<span>AM</span>} secondaryContent="Engineer">
          Alex Morgan
        </TagPickerOption>
      </Picker>,
    );
    cy.get(input).click();
    cy.get(option).find('.fui-TagPickerOption__media').should('have.css', 'grid-row-start', 'span 2');
    cy.get(option)
      .find('.fui-TagPickerOption__secondaryContent')
      .should('have.css', 'grid-column-start', '2')
      .and('have.css', 'grid-row-start', '2');
  });
});
