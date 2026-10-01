import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { mount as mountBase } from '@fluentui/scripts-cypress';

import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { useTabsterAttributes } from '@fluentui/react-tabster';

import { Dropdown, Option, OptionGroup } from '@fluentui/react-combobox';
import type { DropdownProps } from '@fluentui/react-combobox';
import type { DropdownSlots } from './Dropdown.types';
import type { SinonStub } from 'cypress/types/sinon';
import { Field } from '@fluentui/react-field';

import { triggerSelector, listboxSelector, triggerId } from '../../testing/selectors';
import type { ExtractSlotProps, JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { iconSizes } from '../../utils/internalTokens';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') => {
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
};

describe('Dropdown - controlling open/close state', () => {
  const ControlledOpenCloseStateDropdown = (props: Partial<DropdownProps>) => {
    const options = ['Cat', 'Dog', 'Ferret', 'Fish', 'Hamster', 'Snake'];

    const [open, setOpen] = React.useState(false);
    const handleOpenChange: DropdownProps['onOpenChange'] = (e, data) => setOpen(data.open);
    const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = event => setOpen(!!event.target.checked);

    return (
      <>
        <label>
          <input id={triggerId} type="checkbox" name="state" value="open" checked={open} onChange={handleInputChange} />
          Open/Close
        </label>

        <Dropdown placeholder="Select an animal" open={open} onOpenChange={handleOpenChange}>
          {options.map(option => (
            <Option key={option}>{option}</Option>
          ))}
        </Dropdown>
      </>
    );
  };

  it('should open/close dropdown when the controlled input state changes', () => {
    mount(<ControlledOpenCloseStateDropdown />);

    cy.get(triggerSelector).check();
    cy.get(listboxSelector).should('be.visible');

    cy.get(triggerSelector).uncheck();
    cy.get(listboxSelector).should('not.exist');
  });

  it('should close dropdown when clicked outside', () => {
    mount(<ControlledOpenCloseStateDropdown />);
    cy.get(triggerSelector).check();
    cy.get(listboxSelector).should('be.visible');
    cy.get('body').click({ force: true });
    cy.get(listboxSelector).should('not.exist');
  });
});

const choices = [
  { value: 'cat', text: 'Cat' },
  { value: 'dog', text: 'Dog' },
  { value: 'dolphin', text: 'Dolphin' },
  { value: 'duck', text: 'Duck' },
  { value: 'fish', text: 'Fish' },
];

const options = () =>
  choices.map(choice => (
    <Option key={choice.value} id={`option-${choice.value}`} value={choice.value}>
      {choice.text}
    </Option>
  ));

const trigger = () => cy.get<HTMLButtonElement>('[role="combobox"]');
const popup = () => cy.get('.fui-Dropdown__listbox');
const active = (value: string) => {
  trigger().should('have.attr', 'aria-activedescendant', `option-${value}`);
  cy.get(`#option-${value}`).should('be.visible');
  trigger().should('be.focused');
};
const selected = (value: string, checked = true, multiselect = false) =>
  cy.get(`#option-${value}`).should('have.attr', multiselect ? 'aria-checked' : 'aria-selected', String(checked));

const Basic = (props: DropdownProps) => (
  <Dropdown aria-label="Pet" placeholder="Choose a pet" {...props}>
    {props.children ?? options()}
  </Dropdown>
);

const ControlledSelection = ({ multiselect = false }: { multiselect?: boolean }) => {
  const [selection, setSelection] = React.useState(['cat']);
  const [value, setValue] = React.useState('Cat');
  return (
    <Basic
      multiselect={multiselect}
      value={value}
      selectedOptions={selection}
      onOptionSelect={(_, data) => {
        setSelection(data.selectedOptions);
        setValue(data.selectedOptions.map(key => choices.find(choice => choice.value === key)?.text).join(', '));
      }}
    />
  );
};

describe('Dropdown - documented scenarios', () => {
  it('uses a named native button, placeholder, and single-select option semantics', () => {
    mount(<Basic />);
    trigger().should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button');
    trigger().should('have.attr', 'aria-label', 'Pet').and('have.attr', 'aria-expanded', 'false');
    trigger().should('contain.text', 'Choose a pet');
    cy.get('input, select').should('not.exist');
    popup().should('not.exist');
    trigger().click();
    popup().should('have.attr', 'role', 'listbox').and('be.visible');
    cy.get('[role="option"]').should('have.length', choices.length);
    selected('cat', false);
    cy.get('#option-dog').click();
    trigger().should('contain.text', 'Dog').and('have.attr', 'aria-expanded', 'false');
    trigger().should('be.focused');
  });

  it('uses default selection and display value, then replaces them on selection', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic defaultSelectedOptions={['dog']} defaultValue="Dog" onOptionSelect={onSelect} />);
    trigger().should('contain.text', 'Dog').click();
    active('dog');
    selected('dog');
    cy.get('#option-fish').click();
    trigger().should('contain.text', 'Fish');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
        optionValue: 'fish',
        optionText: 'Fish',
        selectedOptions: ['fish'],
      });
    trigger().click();
    selected('dog', false);
    selected('fish');
  });

  it('keeps controlled open authoritative while reporting close and open requests', () => {
    const onOpen = cy.stub().as('open');
    mount(<Basic open onOpenChange={onOpen} />);
    trigger().click();
    popup().should('be.visible');
    trigger().should('have.attr', 'aria-expanded', 'true');
    cy.get('@open').should('have.been.calledWithMatch', Cypress.sinon.match.any, { open: false });
    cy.realPress('Escape');
    popup().should('be.visible');
  });

  it('keeps controlled selection and display authoritative while reporting the proposed selection', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic defaultOpen selectedOptions={['cat']} value="Pinned display" onOptionSelect={onSelect} />);
    selected('cat');
    cy.get('#option-dog').click();
    trigger().should('contain.text', 'Pinned display').click();
    selected('cat');
    selected('dog', false);
    cy.get('@select').should('have.been.calledWithMatch', Cypress.sinon.match.any, {
      optionValue: 'dog',
      optionText: 'Dog',
      selectedOptions: ['dog'],
    });
  });

  it('updates controlled single selection and value through its callback', () => {
    mount(<ControlledSelection />);
    trigger().should('contain.text', 'Cat').click();
    cy.get('#option-dog').click();
    trigger().should('contain.text', 'Dog').click();
    selected('dog');
    selected('cat', false);
  });

  it('toggles uncontrolled multiple selections with exact payloads and remains open', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic multiselect defaultSelectedOptions={['cat']} defaultValue="Cat" onOptionSelect={onSelect} />);
    trigger().click();
    popup().should('have.attr', 'role', 'menu');
    cy.get('[role="menuitemcheckbox"]').should('have.length', choices.length);
    selected('cat', true, true);
    cy.get('#option-dog').click();
    selected('dog', true, true);
    trigger().should('contain.text', 'Cat, Dog').and('have.attr', 'aria-expanded', 'true');
    cy.get('@select').should('have.been.calledWithMatch', Cypress.sinon.match.any, {
      optionValue: 'dog',
      optionText: 'Dog',
      selectedOptions: ['cat', 'dog'],
    });
    cy.get('#option-cat').click();
    selected('cat', false, true);
    trigger().should('have.text', 'Dog');
    cy.get('@select')
      .should('have.been.calledTwice')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
        optionValue: 'cat',
        optionText: 'Cat',
        selectedOptions: ['dog'],
      });
  });

  it('updates controlled multiple selection and can return to an empty placeholder', () => {
    mount(<ControlledSelection multiselect />);
    trigger().click();
    cy.get('#option-dog').click();
    trigger().should('have.text', 'Cat, Dog');
    cy.get('#option-cat').click();
    cy.get('#option-dog').click();
    trigger().should('contain.text', 'Choose a pet');
    selected('dog', false, true);
    popup().should('be.visible');
  });

  it('clears single selection with a composed custom clear button and restores focus', () => {
    const onSelect = cy.stub().as('select');
    const onClear = cy.stub().as('clear');
    mount(
      <Basic
        clearable
        defaultValue="Dog"
        defaultSelectedOptions={['dog']}
        onOptionSelect={onSelect}
        clearButton={{ children: 'Remove', 'aria-label': 'Remove pet', onClick: onClear }}
      />,
    );
    cy.get('.fui-Dropdown__expandIcon').should('not.be.visible');
    cy.get('[aria-label="Remove pet"]').should('be.visible').click();
    trigger().should('contain.text', 'Choose a pet').and('be.focused');
    cy.get('[aria-label="Remove pet"]').should('not.be.visible');
    cy.get('.fui-Dropdown__expandIcon').should('be.visible');
    cy.get('@clear').should('have.been.calledOnce');
    cy.get<SinonStub>('@select')
      .should('have.been.calledOnce')
      .then(stub => {
        expect(stub.lastCall.args[1]).to.deep.equal({
          optionValue: undefined,
          optionText: undefined,
          selectedOptions: [],
        });
      });
    trigger().click();
    selected('dog', false);
  });

  it('uses explicit text for complex option content, callbacks, typeahead, and display', () => {
    const onSelect = cy.stub().as('select');
    mount(
      <Basic onOptionSelect={onSelect}>
        <Option id="option-cat" value="cat" text="Cat">
          <span aria-hidden="true">*</span>
          <span>Cat</span>
          <span>Available</span>
        </Option>
        <Option id="option-dog" value="dog" text="Dog" checkIcon={<span>Selected</span>}>
          <span>Dog</span>
          <span>Busy</span>
        </Option>
      </Basic>,
    );
    trigger().click();
    cy.realPress('d');
    active('dog');
    cy.realPress('Enter');
    trigger().should('have.text', 'Dog');
    cy.get('@select').should('have.been.calledWithMatch', Cypress.sinon.match.any, {
      optionValue: 'dog',
      optionText: 'Dog',
      selectedOptions: ['dog'],
    });
  });

  it('names option groups and navigates across group labels without selecting disabled options', () => {
    const onSelect = cy.stub().as('select');
    mount(
      <Basic onOptionSelect={onSelect}>
        <OptionGroup label="Land">
          <Option id="option-cat" value="cat">
            Cat
          </Option>
          <Option id="option-dog" value="dog" disabled>
            Dog
          </Option>
        </OptionGroup>
        <OptionGroup label={{ children: 'Sea', style: { fontStyle: 'italic' } }}>
          <Option id="option-fish" value="fish">
            Fish
          </Option>
        </OptionGroup>
      </Basic>,
    );
    trigger().click();
    cy.get('[role="group"]')
      .should('have.length', 2)
      .each($group => {
        const labelId = $group.attr('aria-labelledby');
        expect(labelId).to.be.a('string');
        cy.get(`#${labelId}`).should('have.attr', 'role', 'presentation').and('be.visible');
      });
    cy.get('#option-dog').should('have.attr', 'aria-disabled', 'true').click();
    cy.get('@select').should('not.have.been.called');
    popup().should('be.visible');
    cy.realPress('End');
    active('fish');
    cy.realPress('Home');
    active('cat');
    cy.realPress('End');
    cy.realPress('Enter');
    trigger().should('have.text', 'Fish');
  });

  it('connects Field label, hint, required state and validation message', () => {
    mount(
      <Field label="Favorite pet" hint="Choose one" validationMessage="A pet is required" required>
        <Dropdown placeholder="Choose a pet">{options()}</Dropdown>
      </Field>,
    );
    cy.get('label').then($label => {
      trigger().should('have.id', $label.attr('for'));
    });
    trigger().should('have.attr', 'aria-invalid', 'true').and('have.attr', 'aria-required', 'true');
    trigger()
      .invoke('attr', 'aria-describedby')
      .then(ids => {
        expect(ids).to.be.a('string');
        const descriptions = String(ids).split(' ');
        cy.get(descriptions.map(id => `#${id}`).join(','))
          .should('contain.text', 'Choose one')
          .and('contain.text', 'A pet is required');
      });
    trigger().click();
    cy.get('label').then($label => popup().should('have.attr', 'aria-labelledby', $label.attr('id')));
  });

  it('renders portaled ownership and control relationships only while expanded', () => {
    mount(<Basic />);
    trigger().click();
    popup().then($popup => {
      trigger().should('have.attr', 'aria-controls', $popup.attr('id'));
      cy.get('.fui-Dropdown').should('have.attr', 'aria-owns', $popup.attr('id'));
    });
    cy.get('.fui-Dropdown').find('.fui-Dropdown__listbox').should('not.exist');
    cy.realPress('Escape');
    trigger().should('not.have.attr', 'aria-controls');
    cy.get('.fui-Dropdown').should('not.have.attr', 'aria-owns');
  });

  it('renders inline popup in DOM order without aria-owns', () => {
    mount(<Basic inlinePopup />);
    trigger().click();
    cy.get('.fui-Dropdown').find('[role="listbox"]').should('be.visible');
    cy.get('.fui-Dropdown').should('not.have.attr', 'aria-owns');
    trigger().then($trigger => {
      popup().then($popup => {
        expect($trigger[0].compareDocumentPosition($popup[0])).to.equal(Node.DOCUMENT_POSITION_FOLLOWING);
      });
    });
    cy.realPress('ArrowDown');
    active('dog');
  });

  it('customizes button content, expand icon and listbox styles without losing interactions', () => {
    const onSelect = cy.stub().as('select');
    mount(
      <Basic
        button={<span data-testid="custom-display">Custom display</span>}
        expandIcon={{ children: '+', id: 'custom-icon' }}
        listbox={{ className: 'custom-popup', style: { maxHeight: '100px' } }}
        positioning={{ autoSize: false }}
        onOptionSelect={onSelect}
      />,
    );
    trigger().should('contain.text', 'Custom display').click();
    cy.get('#custom-icon').should('contain.text', '+');
    popup().should('have.class', 'custom-popup').and('have.css', 'max-height', '100px');
    cy.get('#option-dog').click();
    trigger().should('contain.text', 'Custom display');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('does not open a disabled trigger and hides its clear action', () => {
    const onOpen = cy.stub().as('open');
    mount(<Basic disabled clearable defaultValue="Cat" defaultSelectedOptions={['cat']} onOpenChange={onOpen} />);
    trigger().should('be.disabled').and('contain.text', 'Cat');
    cy.get('.fui-Dropdown__clearButton').should('not.be.visible');
    popup().should('not.exist');
    trigger().click({ force: true });
    cy.get('@open').should('not.have.been.called');
    popup().should('not.exist');
  });

  (['small', 'medium', 'large'] as const).forEach(size => {
    it(`applies ${size} typography and clickable option behavior`, () => {
      mount(<Basic size={size} />);
      cy.get('.fui-Dropdown').should($root => {
        const lineHeight =
          teamsLightTheme[
            size === 'small' ? 'lineHeightBase200' : size === 'large' ? 'lineHeightBase400' : 'lineHeightBase300'
          ];
        const verticalPadding = size === 'small' ? 3 : size === 'large' ? 7 : 5;
        const expectedHeight =
          Math.max(parseFloat(lineHeight), parseFloat(iconSizes[size])) +
          2 * verticalPadding +
          2 * parseFloat(teamsLightTheme.strokeWidthThin);
        expect($root[0].getBoundingClientRect().height).to.equal(expectedHeight);
      });
      trigger().should(
        'have.css',
        'font-size',
        teamsLightTheme[
          size === 'small' ? 'fontSizeBase200' : size === 'large' ? 'fontSizeBase400' : 'fontSizeBase300'
        ],
      );
      trigger().click();
      cy.get('#option-dog').click();
      trigger().should('have.text', 'Dog');
    });
  });

  (['outline', 'underline', 'filled-darker', 'filled-lighter'] as const).forEach(appearance => {
    it(`applies ${appearance} border/background semantics and keyboard interaction`, () => {
      mount(<Basic appearance={appearance} />);
      cy.get('.fui-Dropdown').should($root => {
        const style = $root[0].ownerDocument.defaultView!.getComputedStyle($root[0]);
        expect(style.borderTopWidth).to.equal(appearance === 'underline' ? '0px' : teamsLightTheme.strokeWidthThin);
        expect(style.borderBottomWidth).to.equal(teamsLightTheme.strokeWidthThin);
        if (appearance === 'underline') {
          expect(style.borderRadius).to.equal('0px');
        }
        if (appearance.startsWith('filled')) {
          expect(style.borderTopColor).to.equal('rgba(0, 0, 0, 0)');
        }
        const token =
          appearance === 'filled-darker'
            ? teamsLightTheme.colorNeutralBackground3
            : teamsLightTheme.colorNeutralBackground1;
        if (appearance !== 'underline') {
          expect(style.backgroundColor).to.equal(
            `rgb(${parseInt(token.slice(1, 3), 16)}, ${parseInt(token.slice(3, 5), 16)}, ${parseInt(
              token.slice(5, 7),
              16,
            )})`,
          );
        }
      });
      trigger().focus();
      cy.realPress('Enter');
      cy.realPress('ArrowDown');
      cy.realPress('Enter');
      trigger().should('have.text', 'Dog');
    });
  });
});

describe('Dropdown - edges and accessibility', () => {
  (['Enter', 'Space', 'ArrowDown', 'ArrowUp'] as const).forEach(key => {
    it(`opens with ${key} without prematurely selecting and keeps focus on the trigger`, () => {
      const onSelect = cy.stub().as('select');
      mount(<Basic onOptionSelect={onSelect} />);
      trigger().focus();
      cy.realPress(key);
      popup().should('be.visible');
      active('cat');
      selected('cat', false);
      cy.get('@select').should('not.have.been.called');
    });
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`selects with ${key}, closes single-select and reopens at the selected option`, () => {
      const onSelect = cy.stub().as('select');
      mount(<Basic onOptionSelect={onSelect} />);
      trigger().click();
      cy.realPress('ArrowDown');
      active('dog');
      cy.realPress(key);
      trigger().should('have.text', 'Dog').and('have.attr', 'aria-expanded', 'false');
      trigger().should('be.focused').and('not.have.attr', 'aria-activedescendant');
      cy.get('@select').should('have.been.calledOnce');
      cy.realPress('ArrowDown');
      active('dog');
      selected('dog');
    });

    it(`toggles multiple selection twice with ${key} and does not close`, () => {
      const onSelect = cy.stub().as('select');
      mount(<Basic multiselect onOptionSelect={onSelect} />);
      trigger().click();
      cy.realPress('ArrowDown');
      cy.realPress(key);
      selected('dog', true, true);
      popup().should('be.visible');
      cy.realPress(key);
      selected('dog', false, true);
      trigger().should('contain.text', 'Choose a pet').and('have.attr', 'aria-expanded', 'true');
      cy.get<SinonStub>('@select')
        .should('have.been.calledTwice')
        .then(stub => {
          expect(stub.firstCall.args[1].selectedOptions).to.deep.equal(['dog']);
          expect(stub.lastCall.args[1].selectedOptions).to.deep.equal([]);
        });
    });
  });

  it('navigates Home/End and boundary arrows without changing selection', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic onOptionSelect={onSelect} />);
    trigger().click();
    cy.realPress('End');
    active('fish');
    cy.realPress('ArrowDown');
    active('fish');
    cy.realPress('Home');
    active('cat');
    cy.realPress('ArrowUp');
    active('cat');
    cy.get('@select').should('not.have.been.called');
  });

  it('Escape closes without selection, stops parent Escape, and preserves trigger focus', () => {
    const onParent = cy.stub().as('parent');
    const onSelect = cy.stub().as('select');
    mount(
      <div onKeyDown={event => event.key === 'Escape' && onParent()}>
        <Basic onOptionSelect={onSelect} />
      </div>,
    );
    trigger().click();
    cy.realPress('End');
    cy.realPress('Escape');
    trigger().should('be.focused').and('have.attr', 'aria-expanded', 'false');
    trigger().should('contain.text', 'Choose a pet');
    cy.get('@select').should('not.have.been.called');
    cy.get('@parent').should('not.have.been.called');
    cy.realPress('Escape');
    cy.get('@parent').should('have.been.calledOnce');
  });

  it('supports Alt+Down to open and Alt+Up to close and select the active single option', () => {
    mount(<Basic />);
    trigger().focus();
    cy.realPress(['Alt', 'ArrowDown']);
    active('cat');
    cy.realPress('ArrowDown');
    cy.realPress(['Alt', 'ArrowUp']);
    trigger().should('have.text', 'Dog').and('have.attr', 'aria-expanded', 'false');
    trigger().should('be.focused');
  });

  [false, true].forEach(multiselect => {
    [false, true].forEach(backwards => {
      it(`${backwards ? 'Shift+Tab' : 'Tab'} closes ${
        multiselect ? 'multiple' : 'single'
      } popup and moves native focus`, () => {
        const onSelect = cy.stub().as('select');
        const trace: string[] = [];
        const Fixture = () => {
          const attrs = useTabsterAttributes({ root: {} });
          return (
            <div {...attrs}>
              <button id="before">Before</button>
              <Basic
                multiselect={multiselect}
                onOptionSelect={onSelect}
                onOpenChange={(event, data) => trace.push(`${event.type}:${data.open}`)}
                button={{ onKeyDown: event => trace.push(`key:${event.key}`), onBlur: () => trace.push('blur') }}
              />
              <button id="after">After</button>
            </div>
          );
        };
        mount(<Fixture />);
        trigger().click();
        cy.realPress('ArrowDown');
        active('dog');
        cy.realPress(backwards ? ['Shift', 'Tab'] : 'Tab');
        cy.focused().should('have.id', backwards ? 'before' : 'after');
        trigger().should('have.attr', 'aria-expanded', 'false');
        popup().should('not.exist');
        if (multiselect) {
          cy.get('@select').should('not.have.been.called');
          trigger().should('contain.text', 'Choose a pet');
        } else if (backwards) {
          cy.get('@select').should('have.been.calledOnce');
          cy.then(() => expect(trace).to.include('key:Tab'));
          trigger().should('have.text', 'Dog');
        } else {
          // Tabster intercepts forward Tab before React's selection handler.
          cy.get('@select').should('not.have.been.called');
          cy.then(() => {
            expect(trace).to.not.include('key:Tab');
            expect(trace).to.include('blur:false');
          });
          trigger().should('contain.text', 'Choose a pet');
        }
      });
    });
  });

  it('opens to the matching option on the first printable character', () => {
    mount(<Basic />);
    trigger().focus();
    cy.realPress('d');
    active('dog');
    selected('dog', false);
  });

  for (const { keys, match } of [
    { keys: ['d', 'd'], match: 'dog' },
    { keys: ['d', 'u'], match: 'duck' },
    { keys: ['d', 'z'], match: undefined },
  ]) {
    it(`matches ${keys.join('')} before popup mount in one synchronous native event batch (not realPress)`, () => {
      cy.clock();
      const onOpen = cy.stub().as('burstOpen');
      const onSelect = cy.stub().as('burstSelect');
      mount(
        <Basic onOpenChange={onOpen} onOptionSelect={onSelect}>
          {options().slice(1)}
        </Basic>,
      );
      popup().should('not.exist');
      cy.window().then(win => {
        trigger().then($trigger => {
          const button = $trigger[0];
          ReactDOM.unstable_batchedUpdates(() => {
            button.focus();
            for (const key of keys) {
              button.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true }));
              button.dispatchEvent(new win.KeyboardEvent('keyup', { key, bubbles: true }));
              expect(button.getAttribute('aria-expanded'), 'no intervening React commit').to.equal('false');
              expect(button.ownerDocument.querySelector('[role="listbox"]'), 'popup has not mounted').to.be.null;
            }
          });
        });
      });
      popup().should('be.visible');
      trigger().should('be.focused').and('contain.text', 'Choose a pet');
      if (match) {
        active(match);
      } else {
        trigger().should('not.have.attr', 'aria-activedescendant');
      }
      cy.get('@burstOpen').should('have.been.calledTwice');
      cy.then(() => {
        expect(onOpen.getCalls().map(call => ({ key: call.args[0].key, open: call.args[1].open }))).to.deep.equal(
          keys.map(key => ({ key, open: true })),
        );
      });
      cy.get('@burstSelect').should('not.have.been.called');
      for (const value of ['dog', 'dolphin', 'duck', 'fish']) {
        selected(value, false);
      }
      if (keys.join('') === 'dd') {
        for (const value of ['dolphin', 'duck', 'dog']) {
          trigger().trigger('keydown', { key: 'd' });
          active(value);
        }
      }
      cy.tick(499);
      trigger().trigger('keydown', { key: 'f' });
      trigger().should('not.have.attr', 'aria-activedescendant');
      cy.tick(499);
      trigger().trigger('keydown', { key: 'i' });
      trigger().should('not.have.attr', 'aria-activedescendant');
      cy.tick(500);
      trigger().trigger('keydown', { key: 'f' });
      active('fish');
      cy.get('@burstOpen').should('have.been.calledTwice');
      cy.get('@burstSelect').should('not.have.been.called');
      trigger().trigger('keydown', { key: 'Enter' });
      trigger().should('contain.text', 'Fish').and('have.attr', 'aria-expanded', 'false');
      cy.get('@burstSelect')
        .should('have.been.calledOnce')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
          optionValue: 'fish',
          optionText: 'Fish',
          selectedOptions: ['fish'],
        });
      cy.get('@burstOpen')
        .should('have.been.calledThrice')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, { open: false });
    });
  }

  for (const { keys, match, text } of [
    { keys: ['d', 'd'] as const, match: 'dolphin', text: 'Dolphin' },
    { keys: ['d', 'u'] as const, match: 'duck', text: 'Duck' },
  ]) {
    it(`matches rapid realPress ${keys.join('')} from closed without assertions between keystrokes`, () => {
      const onOpen = cy.stub().as('rapidOpen');
      const onSelect = cy.stub().as('rapidSelect');
      mount(
        <Basic onOpenChange={onOpen} onOptionSelect={onSelect}>
          {options().slice(1)}
        </Basic>,
      );
      trigger().focus();
      cy.realPress(keys[0], { pressDelay: 0 });
      cy.realPress(keys[1], { pressDelay: 0 });
      active(match);
      cy.get('@rapidOpen').should('have.been.calledOnce');
      cy.get('@rapidSelect').should('not.have.been.called');
      selected(match, false);
      cy.realPress('Enter');
      trigger().should('contain.text', text).and('have.attr', 'aria-expanded', 'false');
      cy.get('@rapidSelect')
        .should('have.been.calledOnce')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, { selectedOptions: [match] });
    });
  }

  it('prefers a literal repeated-letter prefix over cycling fallback in a pre-mount native batch (not realPress)', () => {
    const onSelect = cy.stub().as('literalSelect');
    mount(
      <Basic onOptionSelect={onSelect}>
        <Option id="option-aardvark" value="aardvark">
          Aardvark
        </Option>
        <Option id="option-ant" value="ant">
          Ant
        </Option>
      </Basic>,
    );
    popup().should('not.exist');
    cy.window().then(win => {
      trigger().then($trigger => {
        const button = $trigger[0];
        ReactDOM.unstable_batchedUpdates(() => {
          button.focus();
          for (let i = 0; i < 2; i++) {
            button.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
            button.dispatchEvent(new win.KeyboardEvent('keyup', { key: 'a', bubbles: true }));
            expect(button.getAttribute('aria-expanded'), 'no intervening React commit').to.equal('false');
            expect(button.ownerDocument.querySelector('[role="listbox"]'), 'popup has not mounted').to.be.null;
          }
        });
      });
    });
    active('aardvark');
    selected('aardvark', false);
    cy.realPress('a');
    active('ant');
    cy.get('@literalSelect').should('not.have.been.called');
  });

  it('cycles repeated characters, wraps, and keeps selection separate from typeahead', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic onOptionSelect={onSelect} />);
    trigger().click();
    cy.realPress('d');
    active('dog');
    cy.realPress('d');
    active('dolphin');
    cy.realPress('d');
    active('duck');
    cy.realPress('d');
    active('dog');
    cy.get('@select').should('not.have.been.called');
  });

  it('matches case-insensitive multi-character prefixes and resets the exact 500ms search timeout', () => {
    cy.clock();
    mount(<Basic />);
    trigger().click();
    trigger().trigger('keydown', { key: 'D' });
    active('dog');
    cy.tick(499);
    trigger().trigger('keydown', { key: 'u' });
    active('duck');
    cy.tick(500);
    trigger().trigger('keydown', { key: 'f' });
    active('fish');
  });

  it('clears unmatched active state and ignores modified printable shortcuts', () => {
    mount(<Basic />);
    trigger().click();
    cy.realPress(['Control', 'f']);
    active('cat');
    cy.realPress('z');
    trigger().should('not.have.attr', 'aria-activedescendant');
    cy.realPress('Home');
    active('cat');
  });

  it('allows disabled options to be active but never selects them by pointer, Space, Enter or Tab', () => {
    const onSelect = cy.stub().as('select');
    mount(
      <>
        <Basic onOptionSelect={onSelect}>
          <Option id="option-cat" value="cat">
            Cat
          </Option>
          <Option id="option-dog" value="dog" disabled>
            Dog
          </Option>
          <Option id="option-fish" value="fish">
            Fish
          </Option>
        </Basic>
        <button id="after">After</button>
      </>,
    );
    trigger().click();
    cy.get('#option-dog').click();
    selected('dog', false);
    cy.realPress('ArrowDown');
    active('dog');
    cy.realPress('Space');
    cy.realPress('Enter');
    popup().should('be.visible');
    cy.get('@select').should('not.have.been.called');
    cy.realPress('Tab');
    cy.focused().should('have.id', 'after');
    cy.get('@select').should('not.have.been.called');
    trigger().click();
    cy.realPress('End');
    cy.realPress('Enter');
    trigger().should('have.text', 'Fish');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('forwards native props and button/root/listbox refs and composes slot event handlers', () => {
    const buttonRef = React.createRef<HTMLButtonElement>();
    const rootRef = React.createRef<HTMLDivElement>();
    const listRef = React.createRef<HTMLDivElement>();
    const slotRef = React.createRef<HTMLButtonElement>();
    const click = cy.stub().as('click');
    const key = cy.stub().as('key');
    const focus = cy.stub().as('focus');
    const blur = cy.stub().as('blur');
    mount(
      <>
        <Dropdown
          ref={buttonRef}
          id="native-trigger"
          title="Pet title"
          aria-label="Native pet"
          className="native-root"
          root={{ ref: rootRef, id: 'native-root' }}
          button={{
            ref: slotRef,
            className: 'native-button',
            onClick: click,
            onKeyDown: key,
            onFocus: focus,
            onBlur: blur,
          }}
          listbox={{ ref: listRef, 'aria-label': 'Available pets', className: 'native-list' }}
        >
          {options()}
        </Dropdown>
        <button id="outside">Outside</button>
      </>,
    );
    trigger()
      .should('have.id', 'native-trigger')
      .and('have.attr', 'title', 'Pet title')
      .and('have.class', 'native-button');
    cy.get('#native-root').should('have.class', 'native-root');
    trigger().click();
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@focus').should('have.been.calledOnce');
    popup().should('have.class', 'native-list').and('have.attr', 'aria-label', 'Available pets');
    trigger().then($button => {
      expect(buttonRef.current).to.equal($button[0]);
      expect(slotRef.current).to.equal($button[0]);
      expect(rootRef.current).to.equal($button[0].parentElement);
      expect(listRef.current?.getAttribute('role')).to.equal('listbox');
    });
    cy.realPress('ArrowDown');
    active('dog');
    cy.get('@key').should('have.been.calledOnce');
    cy.get('#outside').click();
    trigger().should('have.attr', 'aria-expanded', 'false');
    cy.get('@blur').should('have.been.calledOnce');
  });

  it('can omit expand and clear slots without losing selection and focus', () => {
    mount(<Basic expandIcon={null} clearButton={null} clearable defaultValue="Cat" defaultSelectedOptions={['cat']} />);
    cy.get('.fui-Dropdown__expandIcon, .fui-Dropdown__clearButton').should('not.exist');
    trigger().click();
    cy.get('#option-dog').click();
    trigger().should('have.text', 'Dog').and('be.focused');
  });

  it('can omit listbox explicitly while still reporting requested open state', () => {
    const onOpen = cy.stub().as('open');
    mount(<Basic listbox={null} onOpenChange={onOpen} />);
    trigger().click();
    popup().should('not.exist');
    trigger().should('have.attr', 'aria-expanded', 'true').and('not.have.attr', 'aria-controls');
    cy.get('@open').should('have.been.calledWithMatch', Cypress.sinon.match.any, { open: true });
    cy.realPress('Escape');
    trigger().should('have.attr', 'aria-expanded', 'false');
  });

  it('hides rather than removes the empty clear slot and excludes it from tab navigation', () => {
    mount(
      <>
        <Basic clearable />
        <button id="after">After</button>
      </>,
    );
    cy.get('.fui-Dropdown__clearButton').should('exist').and('not.be.visible').and('not.have.attr', 'tabindex');
    trigger().focus();
    cy.realPress('Tab');
    cy.focused().should('have.id', 'after');
  });

  it('supports a custom portal mount and inlinePopup takes precedence', () => {
    const Fixture = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      const [inline, setInline] = React.useState(false);
      return (
        <>
          <div id="portal-target" ref={setNode} />
          <button id="inline" onClick={() => setInline(true)}>
            Inline
          </button>
          <Basic open mountNode={node} inlinePopup={inline} />
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#portal-target').find('[role="listbox"]').should('be.visible');
    cy.get('#inline').click();
    cy.get('#portal-target').find('[role="listbox"]').should('not.exist');
    cy.get('.fui-Dropdown').find('[role="listbox"]').should('be.visible');
    cy.get('.fui-Dropdown').should('not.have.attr', 'aria-owns');
  });

  it('uses updated open, select, active and native handlers after a rerender', () => {
    const oldOpen = cy.stub().as('oldOpen');
    const oldSelect = cy.stub().as('oldSelect');
    const oldActive = cy.stub().as('oldActive');
    const newOpen = cy.stub().as('newOpen');
    const newSelect = cy.stub().as('newSelect');
    const newActive = cy.stub().as('newActive');
    const oldKey = cy.stub().as('oldKey');
    const newKey = cy.stub().as('newKey');
    const Fixture = () => {
      const [latest, setLatest] = React.useState(false);
      return (
        <>
          <button id="replace" onClick={() => setLatest(true)}>
            Replace callbacks
          </button>
          <Basic
            onOpenChange={latest ? newOpen : oldOpen}
            onOptionSelect={latest ? newSelect : oldSelect}
            onActiveOptionChange={latest ? newActive : oldActive}
            button={{ onKeyDown: latest ? newKey : oldKey }}
          />
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#replace').click();
    trigger().click();
    cy.realPress('ArrowDown');
    cy.realPress('Enter');
    trigger().should('have.text', 'Dog');
    cy.get('@oldOpen').should('not.have.been.called');
    cy.get('@oldSelect').should('not.have.been.called');
    cy.get('@oldActive').should('not.have.been.called');
    cy.get('@oldKey').should('not.have.been.called');
    cy.get('@newOpen').should('have.been.calledWithMatch', Cypress.sinon.match.any, { open: true });
    cy.get('@newOpen').should('have.been.calledWithMatch', Cypress.sinon.match.any, { open: false });
    cy.get('@newSelect').should('have.been.calledOnce');
    cy.get('@newActive').should('have.been.calledWithMatch', Cypress.sinon.match.any, {
      type: 'change',
      previousOption: { value: 'cat' },
      nextOption: { value: 'dog' },
    });
    cy.get('@newKey').should('have.been.calledTwice');
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`aligns below/start in ${dir}, matches target width, and positions the icon at logical end`, () => {
      mount(
        <div style={{ padding: '80px' }}>
          <Basic style={{ width: '320px' }} />
        </div>,
        dir,
      );
      trigger().click();
      popup().should($popup => {
        const root = $popup[0].ownerDocument.querySelector('.fui-Dropdown')!;
        const target = root.getBoundingClientRect();
        const rect = $popup[0].getBoundingClientRect();
        expect(Math.abs(rect.width - target.width)).to.be.lessThan(2);
        expect(Math.abs(rect.top - target.bottom - 2)).to.be.lessThan(2);
        expect(Math.abs(dir === 'ltr' ? rect.left - target.left : rect.right - target.right)).to.be.lessThan(2);
        const icon = root.querySelector('.fui-Dropdown__expandIcon')!.getBoundingClientRect();
        expect(
          dir === 'ltr' ? icon.left > target.left + target.width / 2 : icon.right < target.left + target.width / 2,
        ).to.equal(true);
      });
      cy.realPress('End');
      active('fish');
      cy.realPress('Enter');
      trigger().should('have.text', 'Fish');
    });
  });

  it('honors explicit above/end positioning and main-axis offset', () => {
    mount(
      <div style={{ paddingTop: '350px', paddingLeft: '80px' }}>
        <Basic positioning={{ position: 'above', align: 'end', offset: 12, fallbackPositions: [] }} />
      </div>,
    );
    trigger().click();
    popup().should($popup => {
      const target = $popup[0].ownerDocument.querySelector('.fui-Dropdown')!.getBoundingClientRect();
      const rect = $popup[0].getBoundingClientRect();
      expect(Math.abs(target.top - rect.bottom - 12)).to.be.lessThan(2);
      expect(Math.abs(target.right - rect.right)).to.be.lessThan(2);
    });
  });

  it('scrolls a constrained popup to the keyboard-active option', () => {
    mount(
      <Basic positioning={{ autoSize: false }} listbox={{ style: { maxHeight: '100px' } }}>
        {Array.from({ length: 25 }, (_, i) => (
          <Option key={i} id={`option-${i}`} value={String(i)}>{`Pet ${i}`}</Option>
        ))}
      </Basic>,
    );
    trigger().click();
    popup().should('have.css', 'overflow-y', 'auto');
    cy.realPress('End');
    active('24');
    popup().should($popup => {
      expect($popup[0].scrollTop).to.be.greaterThan(0);
      const rect = $popup[0].getBoundingClientRect();
      const option = $popup[0].querySelector('#option-24')!.getBoundingClientRect();
      expect(option.bottom).to.be.at.most(rect.bottom + 1);
      expect(option.top).to.be.at.least(rect.top - 1);
    });
    cy.realPress('Home');
    active('0');
    popup().should($popup => {
      const rect = $popup[0].getBoundingClientRect();
      const option = $popup[0].querySelector('#option-0')!.getBoundingClientRect();
      expect($popup[0].scrollTop).to.be.lessThan(4);
      expect(option.top).to.be.at.least(rect.top);
      expect(option.bottom).to.be.at.most(rect.bottom);
    });
  });

  it('supports external labels and explicit aria-labelledby without treating placeholder as a label', () => {
    mount(
      <>
        <label id="pet-label" htmlFor="pet-trigger">
          Persistent label
        </label>
        <Dropdown id="pet-trigger" aria-labelledby="pet-label" placeholder="Temporary placeholder">
          {options()}
        </Dropdown>
      </>,
    );
    cy.get('#pet-label').click();
    trigger()
      .should('be.focused')
      .and('have.attr', 'aria-labelledby', 'pet-label')
      .and('have.attr', 'aria-expanded', 'true');
    cy.get('#option-dog').click();
    trigger().should('have.text', 'Dog').and('have.attr', 'aria-labelledby', 'pet-label');
    cy.get('#pet-label').should('have.text', 'Persistent label');
  });

  it('does not override explicit popup labeling or trigger validation props with Field defaults', () => {
    mount(
      <Field label="Field label" required validationMessage="Field error">
        <Basic aria-invalid={false} aria-required={false} listbox={{ 'aria-label': 'Explicit choices' }} />
      </Field>,
    );
    trigger().should('have.attr', 'aria-invalid', 'false').and('have.attr', 'aria-required', 'false');
    trigger().click();
    popup().should('have.attr', 'aria-label', 'Explicit choices').and('not.have.attr', 'aria-labelledby');
  });
});

describe('Dropdown - unit-derived and lifecycle scenarios', () => {
  it('mounts a hidden listbox on focus, keeps it collapsed after Escape, and removes it on blur', () => {
    mount(
      <>
        <Basic inlinePopup />
        <button id="after">After</button>
      </>,
    );
    popup().should('not.exist');
    trigger().focus();
    popup().should('exist').and('not.be.visible').and('have.css', 'display', 'none');
    trigger().should('have.attr', 'aria-expanded', 'false').and('not.have.attr', 'aria-controls');
    cy.realPress('Enter');
    popup().should('be.visible');
    cy.realPress('Escape');
    popup().should('exist').and('not.be.visible');
    cy.get('#after').focus();
    popup().should('not.exist');
  });

  it('retains the first matching option while completing a prefix after opening', () => {
    mount(
      <Basic>
        <Option id="option-red" value="red">
          Red
        </Option>
        <Option id="option-redder" value="redder">
          Redder
        </Option>
        <Option id="option-green" value="green">
          Green
        </Option>
      </Basic>,
    );
    trigger().focus();
    cy.realPress('r');
    active('red');
    cy.realPress('e');
    cy.realPress('d');
    active('red');
    cy.realPress('Enter');
    trigger().should('have.text', 'Red');
  });

  it('does not retain an active option for an unmatched opening character', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic onOptionSelect={onSelect} />);
    trigger().focus();
    cy.realPress('z');
    popup().should('be.visible');
    trigger().should('not.have.attr', 'aria-activedescendant');
    cy.realPress('Enter');
    trigger().should('have.attr', 'aria-expanded', 'false').and('contain.text', 'Choose a pet');
    cy.get('@select').should('not.have.been.called');
  });

  it('honors disableAutoFocus while still allowing explicit keyboard navigation and typed matching', () => {
    mount(<Basic disableAutoFocus />);
    trigger().click();
    trigger().should('not.have.attr', 'aria-activedescendant');
    cy.realPress('ArrowDown');
    active('cat');
    cy.realPress('Escape');
    cy.realPress('f');
    active('fish');
    cy.realPress('Enter');
    trigger().should('have.text', 'Fish');
  });

  it('reports complete active-option metadata and the actual change event', () => {
    const onActive = cy.stub().as('active');
    mount(<Basic onActiveOptionChange={onActive} />);
    trigger().click();
    cy.realPress('ArrowDown');
    active('dog');
    cy.get<SinonStub>('@active')
      .should('have.been.called')
      .then(stub => {
        const [event, data] = stub.lastCall.args;
        expect(event.type).to.equal('activedescendantchange');
        expect(data.event).to.equal(event);
        expect(data.type).to.equal('change');
        expect(data.previousOption).to.deep.equal({ id: 'option-cat', value: 'cat', text: 'Cat', disabled: undefined });
        expect(data.nextOption).to.deep.equal({ id: 'option-dog', value: 'dog', text: 'Dog', disabled: undefined });
      });
  });

  (['PageDown', 'PageUp'] as const).forEach(key => {
    it(`moves exactly ten options with ${key} and clamps at the boundary`, () => {
      mount(
        <Basic>
          {Array.from({ length: 24 }, (_, i) => (
            <Option key={i} value={String(i)} id={`option-${i}`}>{`Pet ${i}`}</Option>
          ))}
        </Basic>,
      );
      trigger().click();
      if (key === 'PageUp') {
        cy.realPress('End');
        active('23');
      }
      cy.realPress(key);
      active(key === 'PageDown' ? '10' : '13');
      cy.realPress(key);
      active(key === 'PageDown' ? '20' : '3');
      cy.realPress(key);
      active(key === 'PageDown' ? '23' : '0');
    });
  });

  it('does not reinitialize uncontrolled defaults when their props change', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button id="defaults" onClick={() => setChanged(true)}>
            Change defaults
          </button>
          <Basic
            defaultOpen={!changed}
            defaultSelectedOptions={changed ? ['fish'] : ['cat']}
            defaultValue={changed ? 'Fish' : 'Cat'}
          />
        </>
      );
    };
    mount(<Fixture />);
    popup().should('be.visible');
    cy.get('#option-dog').click();
    trigger().should('have.text', 'Dog');
    cy.get('#defaults').click();
    trigger().should('have.text', 'Dog').and('have.attr', 'aria-expanded', 'false');
    trigger().click();
    selected('dog');
    selected('fish', false);
  });

  it('reacts to controlled open, selection, value and disabled props on rerender', () => {
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button id="props" onClick={() => setChanged(!changed)}>
            Change props
          </button>
          <Basic
            open={changed}
            disabled={!changed}
            selectedOptions={changed ? ['fish'] : ['cat']}
            value={changed ? 'Fish' : 'Cat'}
          />
        </>
      );
    };
    mount(<Fixture />);
    trigger().should('be.disabled').and('have.text', 'Cat').and('have.attr', 'aria-expanded', 'false');
    cy.get('#props').click();
    trigger().should('not.be.disabled').and('have.text', 'Fish').and('have.attr', 'aria-expanded', 'true');
    selected('fish');
    cy.get('#props').click();
    trigger().should('be.disabled').and('have.text', 'Cat');
    popup().should('not.exist');
  });

  it('does not mutate controlled selections or value when clearing without consumer acceptance', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic clearable selectedOptions={['cat']} value="Cat" onOptionSelect={onSelect} />);
    cy.get('[aria-label="Clear selection"]').click();
    trigger().should('have.text', 'Cat').and('be.focused');
    cy.get('[aria-label="Clear selection"]').should('be.visible');
    cy.get<SinonStub>('@select')
      .should('have.been.calledOnce')
      .then(stub =>
        expect(stub.lastCall.args[1]).to.deep.equal({
          optionValue: undefined,
          optionText: undefined,
          selectedOptions: [],
        }),
      );
    trigger().click();
    selected('cat');
  });

  it('keeps controlled multiple selection unchanged while reporting full proposed toggle payloads', () => {
    const onSelect = cy.stub().as('select');
    mount(<Basic multiselect selectedOptions={['cat']} value="Pinned" onOptionSelect={onSelect} />);
    trigger().click();
    cy.get('#option-dog').click();
    selected('dog', false, true);
    selected('cat', true, true);
    cy.get('#option-cat').click();
    selected('cat', true, true);
    trigger().should('have.text', 'Pinned');
    cy.get<SinonStub>('@select')
      .should('have.been.calledTwice')
      .then(stub => {
        expect(stub.firstCall.args[1].selectedOptions).to.deep.equal(['cat', 'dog']);
        expect(stub.lastCall.args[1].selectedOptions).to.deep.equal([]);
      });
  });

  it('treats controlled empty value as a placeholder even when an option is selected', () => {
    mount(<Basic value="" selectedOptions={['dog']} />);
    trigger().should('contain.text', 'Choose a pet').click();
    selected('dog');
    cy.get('#option-fish').click();
    trigger().should('contain.text', 'Choose a pet').click();
    selected('dog');
  });

  it('derives text and identity from plain string children without an explicit value', () => {
    const onSelect = cy.stub().as('select');
    mount(
      <Basic onOptionSelect={onSelect}>
        <Option id="option-cat">Cat</Option>
        <Option id="option-dog">Dog</Option>
      </Basic>,
    );
    trigger().click();
    cy.get('#option-cat').click();
    trigger().should('have.text', 'Cat');
    cy.get('@select').should('have.been.calledWithMatch', Cypress.sinon.match.any, {
      optionValue: 'Cat',
      optionText: 'Cat',
      selectedOptions: ['Cat'],
    });
  });

  it('supports explicit listbox children and composes mouse handlers while retaining trigger focus', () => {
    const down = cy.stub().as('down');
    const click = cy.stub().as('listClick');
    mount(
      <Basic
        listbox={{
          children: (
            <Option id="option-fish" value="fish">
              Fish
            </Option>
          ),
          onMouseDown: down,
          onClick: click,
        }}
      />,
    );
    trigger().click();
    cy.get('[role="option"]').should('have.length', 1);
    cy.get('#option-fish').click();
    trigger().should('have.text', 'Fish').and('be.focused');
    cy.get('@down').should('have.been.calledOnce');
    cy.get('@listClick').should('have.been.calledOnce');
  });

  it('slot-native handlers override top-level native handlers, but still compose internal behavior', () => {
    const topClick = cy.stub().as('topClick');
    const slotClick = cy.stub().as('slotClick');
    mount(<Basic onClick={topClick} button={{ onClick: slotClick }} />);
    trigger().click();
    popup().should('be.visible');
    cy.get('@slotClick').should('have.been.calledOnce');
    cy.get('@topClick').should('not.have.been.called');
  });

  it('orders native slot key handlers after internal selection and respects native default prevention', () => {
    const onKey = cy.stub().as('key');
    const onSubmit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Basic button={{ type: 'submit', onKeyDown: event => onKey(event.key, event.defaultPrevented) }} />
      </form>,
    );
    trigger().focus();
    cy.realPress('Enter');
    popup().should('be.visible');
    cy.realPress('ArrowDown');
    cy.realPress('Enter');
    trigger().should('have.text', 'Dog');
    cy.get('@key').should('have.been.calledWith', 'Enter', true);
    cy.get('@submit').should('not.have.been.called');
  });

  it('is not a native select/input: selection is not implicitly submitted or constrained by Field required', () => {
    const onSubmit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSubmit(data.get('pet'), data.get('native'));
        }}
      >
        <Field label="Pet" required>
          <Dropdown name="pet" defaultValue="Cat" defaultSelectedOptions={['cat']}>
            {options()}
          </Dropdown>
        </Field>
        <input name="native" defaultValue="Native value" />
        <button type="submit" id="submit">
          Submit
        </button>
      </form>,
    );
    trigger()
      .should('have.attr', 'name', 'pet')
      .and('have.attr', 'type', 'button')
      .and('have.attr', 'aria-required', 'true');
    trigger().then($button => {
      expect($button[0].willValidate).to.equal(false);
      expect($button[0].checkValidity()).to.equal(true);
      expect($button[0].value).to.equal('');
    });
    cy.get('input[type="hidden"], select').should('not.exist');
    trigger().click();
    cy.get('#option-dog').click();
    trigger().should('have.text', 'Dog');
    cy.get('#submit').click();
    cy.get('@submit').should('have.been.calledOnce').and('have.been.calledWithExactly', null, 'Native value');
  });

  it('does not submit from its default button or clear button and native form reset does not reset React selection', () => {
    const onSubmit = cy.stub().as('submit');
    const onSelect = cy.stub().as('select');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Basic clearable defaultValue="Cat" defaultSelectedOptions={['cat']} onOptionSelect={onSelect} />
        <button id="reset" type="reset">
          Reset native form
        </button>
        <button id="submit" type="submit">
          Submit
        </button>
      </form>,
    );
    trigger().click();
    cy.get('#option-dog').click();
    cy.get('#reset').click();
    trigger().should('have.text', 'Dog');
    cy.get('@select').should('have.been.calledOnce');
    cy.get('[aria-label="Clear selection"]').click();
    trigger().should('contain.text', 'Choose a pet');
    cy.get('@submit').should('not.have.been.called');
    cy.get('#submit').click();
    cy.get('@submit').should('have.been.calledOnce');
  });

  it('honors an explicit native submit type and value while consumer-owned hidden input submits selection', () => {
    const onSubmit = cy.stub().as('submit');
    const Fixture = () => {
      const [selection, setSelection] = React.useState('cat');
      const [value, setValue] = React.useState('Cat');
      return (
        <form
          onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit(data.get('pet'), (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value'));
          }}
        >
          <input type="hidden" name="pet" value={selection} />
          <Basic
            value={value}
            selectedOptions={[selection]}
            button={{ type: 'submit', value: 'send' }}
            onOptionSelect={(_, data) => {
              setSelection(data.optionValue ?? '');
              setValue(data.optionText ?? '');
            }}
          />
          <button type="submit" id="submit">
            Submit form
          </button>
        </form>
      );
    };
    mount(<Fixture />);
    trigger().should('have.attr', 'type', 'submit').and('have.prop', 'value', 'send').click();
    cy.get('@submit').should('have.been.calledOnce').and('have.been.calledWithExactly', 'cat', 'send');
    cy.get('#option-dog').click();
    cy.get('#submit').click();
    cy.get('@submit').should('have.been.calledTwice').and('have.been.calledWithExactly', 'dog', null);
  });

  it('uses DOM order for navigation after keyed options reorder and preserves selected identity without callbacks', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [reversed, setReversed] = React.useState(false);
      return (
        <>
          <button id="reorder" onClick={() => setReversed(true)}>
            Reorder
          </button>
          <Basic open defaultValue="Dog" defaultSelectedOptions={['dog']} onOptionSelect={onSelect}>
            {(reversed ? [...choices].reverse() : choices).map(choice => (
              <Option id={`option-${choice.value}`} key={choice.value} value={choice.value}>
                {choice.text}
              </Option>
            ))}
          </Basic>
        </>
      );
    };
    mount(<Fixture />);
    selected('dog');
    cy.get('#reorder').click();
    selected('dog');
    cy.get('@select').should('not.have.been.called');
    trigger().focus();
    cy.realPress('Home');
    active('fish');
    cy.realPress('End');
    active('cat');
    cy.realPress('ArrowUp');
    active('dog');
    cy.realPress('Enter');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('navigates and selects remaining options after keyed removal without emitting implicit selection changes', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [removed, setRemoved] = React.useState(false);
      return (
        <>
          <button id="remove" onClick={() => setRemoved(true)}>
            Remove first
          </button>
          <Basic open onOptionSelect={onSelect}>
            {choices
              .filter(choice => !removed || choice.value !== 'cat')
              .map(choice => (
                <Option key={choice.value} value={choice.value} id={`option-${choice.value}`}>
                  {choice.text}
                </Option>
              ))}
          </Basic>
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#remove').click();
    cy.get('#option-cat').should('not.exist');
    cy.get('@select').should('not.have.been.called');
    trigger().focus();
    cy.realPress('Home');
    active('dog');
    cy.realPress('Enter');
    trigger().should('have.text', 'Dog');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('registers newly populated options in an initially empty open popup', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [loaded, setLoaded] = React.useState(false);
      return (
        <>
          <button id="load" onClick={() => setLoaded(true)}>
            Load
          </button>
          <Basic open onOptionSelect={onSelect}>
            {loaded ? options() : <span>No options yet</span>}
          </Basic>
        </>
      );
    };
    mount(<Fixture />);
    popup().should('contain.text', 'No options yet');
    trigger().focus();
    trigger().should('not.have.attr', 'aria-activedescendant');
    cy.get('#load').click();
    cy.get('[role="option"]').should('have.length', choices.length);
    trigger().focus();
    active('cat');
    cy.realPress('Enter');
    trigger().should('have.text', 'Cat');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('uses latest option text/value metadata after rerender instead of the old registration', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button id="metadata" onClick={() => setChanged(true)}>
            Update option
          </button>
          <Basic open onOptionSelect={onSelect}>
            <Option id="option-cat" value="cat">
              Cat
            </Option>
            <Option id="option-dog" value={changed ? 'hound' : 'dog'} text={changed ? 'Hound' : 'Dog'}>
              <span>{changed ? 'Hound' : 'Dog'}</span>
            </Option>
          </Basic>
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#metadata').click();
    trigger().focus();
    cy.realPress('h');
    active('dog');
    cy.realPress('Enter');
    trigger().should('have.text', 'Hound');
    cy.get('@select').should('have.been.calledWithMatch', Cypress.sinon.match.any, {
      optionValue: 'hound',
      optionText: 'Hound',
      selectedOptions: ['hound'],
    });
  });

  it('applies dynamic option disabled state and permits selection only after it is re-enabled', () => {
    const onSelect = cy.stub().as('select');
    const Fixture = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <button id="enable" onClick={() => setDisabled(false)}>
            Enable Dog
          </button>
          <Basic open onOptionSelect={onSelect}>
            <Option id="option-cat" value="cat">
              Cat
            </Option>
            <Option id="option-dog" value="dog" disabled={disabled}>
              Dog
            </Option>
          </Basic>
        </>
      );
    };
    mount(<Fixture />);
    trigger().focus();
    cy.realPress('End');
    active('dog');
    cy.realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.get('#enable').click();
    cy.get('#option-dog').should('not.have.attr', 'aria-disabled');
    cy.get('#option-dog').click();
    trigger().should('have.text', 'Dog');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('inherits Field size but lets an explicit Dropdown size override it', () => {
    mount(
      <>
        <Field size="large" label="Inherited">
          <Basic id="inherited" />
        </Field>
        <Field size="large" label="Override">
          <Basic id="override" size="small" />
        </Field>
      </>,
    );
    cy.get('#inherited').should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    cy.get('#override').should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    cy.get('#override').click();
    cy.get('#option-dog').click();
    cy.get('#override').should('have.text', 'Dog');
    cy.get('#inherited').should('contain.text', 'Choose a pet');
  });

  it('uses fallback placement above when there is insufficient space below', () => {
    mount(
      <div style={{ position: 'fixed', bottom: '10px', left: '80px' }}>
        <Basic />
      </div>,
    );
    trigger().click();
    popup().should($popup => {
      const target = $popup[0].ownerDocument.querySelector('.fui-Dropdown')!.getBoundingClientRect();
      const rect = $popup[0].getBoundingClientRect();
      expect(rect.bottom).to.be.at.most(target.top);
      expect(rect.top).to.be.at.least(0);
    });
    cy.realPress('End');
    cy.realPress('Enter');
    trigger().should('have.text', 'Fish');
  });

  it('isolates typeahead and selection across separate dropdown instances', () => {
    mount(
      <>
        <Basic id="first">
          <Option value="cat">Cat</Option>
          <Option value="dog">Dog</Option>
        </Basic>
        <Basic id="second">
          <Option value="fish">Fish</Option>
          <Option value="fox">Fox</Option>
        </Basic>
      </>,
    );
    cy.get('#first').focus();
    cy.realPress('d');
    cy.realPress('Enter');
    cy.get('#first').should('have.text', 'Dog');
    cy.get('#second').focus();
    cy.realPress('f');
    cy.realPress('o');
    cy.realPress('Enter');
    cy.get('#second').should('have.text', 'Fox');
    cy.get('#first').should('have.text', 'Dog');
  });

  it('starts fresh after unmount/remount while a typeahead reset is pending', () => {
    cy.clock();
    const Fixture = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button id="toggle" onClick={() => setShow(!show)}>
            Toggle
          </button>
          {show && <Basic />}
        </>
      );
    };
    mount(<Fixture />);
    trigger().click();
    trigger().trigger('keydown', { key: 'd' });
    active('dog');
    cy.get('#toggle').click();
    trigger().should('not.exist');
    cy.tick(500);
    cy.get('#toggle').click();
    trigger().should('contain.text', 'Choose a pet').focus();
    trigger().trigger('keydown', { key: 'f' });
    active('fish');
  });

  it('expires a pending search when controlled open is denied beyond 500ms', () => {
    cy.clock();
    const Fixture = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button id="accept" onClick={() => setOpen(true)}>
            Accept open
          </button>
          <Basic open={open} />
        </>
      );
    };
    mount(<Fixture />);
    trigger().focus();
    trigger().trigger('keydown', { key: 'd' });
    trigger().should('have.attr', 'aria-expanded', 'false');
    cy.tick(500);
    cy.get('#accept').click();
    trigger().focus();
    active('cat');
  });

  it('still expires the search timeout when a navigation key intervenes', () => {
    cy.clock();
    mount(<Basic />);
    trigger().click();
    trigger().trigger('keydown', { key: 'd' });
    active('dog');
    cy.tick(250);
    trigger().trigger('keydown', { key: 'ArrowDown' });
    active('dolphin');
    cy.tick(250);
    trigger().trigger('keydown', { key: 'f' });
    active('fish');
  });

  it('reports unsupported clearable multiselect and omits the clear slot while preserving selection', () => {
    cy.window().then(win => cy.spy(win.console, 'error').as('error'));
    mount(<Basic multiselect clearable defaultSelectedOptions={['cat']} defaultValue="Cat" />);
    cy.get('.fui-Dropdown__clearButton').should('not.exist');
    cy.get('.fui-Dropdown__expandIcon').should('be.visible');
    cy.get('@error').should('have.been.calledWithMatch', '"clearable" prop is not supported in multiselect mode');
    trigger().click();
    selected('cat', true, true);
    cy.get('#option-dog').click();
    trigger().should('have.text', 'Cat, Dog').and('have.attr', 'aria-expanded', 'true');
  });

  it('supports slot render functions while retaining native props and library children', () => {
    const renderRoot: SlotRenderFunction<ExtractSlotProps<DropdownSlots['root']>> = (Component, props) => (
      <Component {...props} data-custom-root="true">
        {props.children}
      </Component>
    );
    const renderButton: SlotRenderFunction<ExtractSlotProps<DropdownSlots['button']>> = (Component, props) => (
      <Component {...props}>
        <span data-testid="render-content">Rendered pet</span>
        {props.children}
      </Component>
    );
    mount(<Basic root={{ children: renderRoot }} button={{ children: renderButton }} />);
    cy.get('[data-custom-root="true"]').should('have.class', 'fui-Dropdown');
    trigger().should('contain.text', 'Rendered pet').and('have.attr', 'type', 'button');
    cy.get('[data-testid="render-content"]').should('be.visible');
    trigger().click();
    cy.get('#option-dog').click();
    trigger().should('contain.text', 'Dog').and('contain.text', 'Rendered pet').and('be.focused');
    cy.get('.fui-Dropdown__expandIcon').should('be.visible');
  });

  it('uses the latest clear-slot and selection handlers after rerender', () => {
    const oldClear = cy.stub().as('oldClear');
    const newClear = cy.stub().as('newClear');
    const oldSelect = cy.stub().as('oldSelect');
    const newSelect = cy.stub().as('newSelect');
    const Fixture = () => {
      const [latest, setLatest] = React.useState(false);
      return (
        <>
          <button id="latest" onClick={() => setLatest(true)}>
            Latest
          </button>
          <Basic
            clearable
            defaultValue="Cat"
            defaultSelectedOptions={['cat']}
            clearButton={{ onClick: latest ? newClear : oldClear }}
            onOptionSelect={latest ? newSelect : oldSelect}
          />
        </>
      );
    };
    mount(<Fixture />);
    cy.get('#latest').click();
    cy.get('[aria-label="Clear selection"]').click();
    trigger().should('contain.text', 'Choose a pet').and('be.focused');
    cy.get('@oldClear').should('not.have.been.called');
    cy.get('@oldSelect').should('not.have.been.called');
    cy.get('@newClear').should('have.been.calledOnce');
    cy.get('@newSelect').should('have.been.calledOnce');
  });

  [false, true].forEach(multiselect => {
    it(`lets the consumer remove a selected ${
      multiselect ? 'multiple' : 'single'
    } option and clear controlled state without callbacks`, () => {
      const onSelect = cy.stub().as('select');
      const Fixture = () => {
        const [removed, setRemoved] = React.useState(false);
        return (
          <>
            <button id="remove-selected" onClick={() => setRemoved(true)}>
              Remove selected
            </button>
            <Basic
              open
              multiselect={multiselect}
              selectedOptions={removed ? [] : ['dog']}
              value={removed ? '' : 'Dog'}
              onOptionSelect={onSelect}
            >
              {choices
                .filter(choice => !removed || choice.value !== 'dog')
                .map(choice => (
                  <Option key={choice.value} value={choice.value} id={`option-${choice.value}`}>
                    {choice.text}
                  </Option>
                ))}
            </Basic>
          </>
        );
      };
      mount(<Fixture />);
      selected('dog', true, multiselect);
      cy.get('#remove-selected').click();
      cy.get('#option-dog').should('not.exist');
      trigger().should('contain.text', 'Choose a pet');
      cy.get('@select').should('not.have.been.called');
      trigger().focus();
      cy.realPress('Home');
      active('cat');
      selected('cat', false, multiselect);
      cy.realPress('Enter');
      selected('cat', false, multiselect);
      cy.get('@select')
        .should('have.been.calledOnce')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
          optionValue: 'cat',
          optionText: 'Cat',
          selectedOptions: ['cat'],
        });
    });
  });

  it('sets all forwarded refs to null when unmounting the component', () => {
    const buttonRef = React.createRef<HTMLButtonElement>();
    const rootRef = React.createRef<HTMLDivElement>();
    const listRef = React.createRef<HTMLDivElement>();
    const Fixture = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button id="unmount" onClick={() => setShow(false)}>
            Unmount
          </button>
          {show && (
            <Dropdown ref={buttonRef} root={{ ref: rootRef }} listbox={{ ref: listRef }} open>
              {options()}
            </Dropdown>
          )}
        </>
      );
    };
    mount(<Fixture />);
    popup().should('be.visible');
    cy.then(() => {
      expect(buttonRef.current?.tagName).to.equal('BUTTON');
      expect(rootRef.current?.tagName).to.equal('DIV');
      expect(listRef.current?.getAttribute('role')).to.equal('listbox');
    });
    cy.get('#unmount').click();
    trigger().should('not.exist');
    popup().should('not.exist');
    cy.then(() => {
      expect(buttonRef.current).to.be.null;
      expect(rootRef.current).to.be.null;
      expect(listRef.current).to.be.null;
    });
  });

  it('truncates custom display visually without truncating its text or subsequent selection', () => {
    const longText = 'SuperLongAnimalName_123456789_AdditionalCharacters@fluentui.dev';
    const Fixture = () => {
      const [value, setValue] = React.useState(longText);
      return (
        <Basic
          style={{ width: '250px', minWidth: 0 }}
          defaultValue={longText}
          defaultSelectedOptions={['long']}
          button={
            <span id="truncated" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value}
            </span>
          }
          onOptionSelect={(_, data) => setValue(data.optionText ?? '')}
        >
          <Option value="long" text={longText}>
            <span>{longText}</span>
          </Option>
          <Option id="option-dog" value="dog">
            Dog
          </Option>
        </Basic>
      );
    };
    mount(<Fixture />);
    cy.get('#truncated')
      .should('have.text', longText)
      .and('have.css', 'text-overflow', 'ellipsis')
      .should($span => {
        expect($span[0].scrollWidth).to.be.greaterThan($span[0].clientWidth);
      });
    trigger().click();
    cy.get('#option-dog').click();
    cy.get('#truncated')
      .should('have.text', 'Dog')
      .should($span => expect($span[0].scrollWidth).to.equal($span[0].clientWidth));
    trigger().should('be.focused');
  });
});

describe('Dropdown - tab navigation', () => {
  const TabsterRoot = (props: { children?: React.ReactNode }) => {
    const tabsterAttrs = useTabsterAttributes({ root: {} });
    return <div {...tabsterAttrs}>{props.children}</div>;
  };

  const DropdownComponent = (props: Partial<DropdownProps>) => {
    const animals = ['Cat', 'Dog', 'Ferret', 'Fish', 'Hamster', 'Snake'];

    return (
      <Dropdown placeholder="Select an animal" {...props}>
        {animals.map(option => (
          <Option key={option}>{option}</Option>
        ))}
      </Dropdown>
    );
  };

  it('can tab between multiple dropdowns', () => {
    mount(
      <TabsterRoot>
        <DropdownComponent id="first" />
        <DropdownComponent id="second" />
        <DropdownComponent id="third" />
      </TabsterRoot>,
    );

    // Focus the first dropdown
    cy.get('#first').focus();

    // Navigate to the next dropdown
    cy.realPress('Tab');
    cy.focused().should('have.id', 'second');

    // Navigate to the next dropdown
    cy.realPress('Tab');
    cy.focused().should('have.id', 'third');

    // Loop back to the previous dropdown
    cy.realPress(['Shift', 'Tab']);
    cy.focused().should('have.id', 'second');
  });

  it('can tab between multiple dropdowns (clearable)', () => {
    mount(
      <TabsterRoot>
        <DropdownComponent id="first" clearable selectedOptions={['Cat']} />
        <DropdownComponent id="second" />
        <DropdownComponent id="third" />
      </TabsterRoot>,
    );

    // Focus the first dropdown
    cy.get('#first').focus();

    // Navigates to the clear button, since the dropdown is clearable and has selected options
    cy.realPress('Tab');
    cy.focused().should('have.attr', 'aria-label', 'Clear selection');

    // Navigate to the next dropdown
    cy.realPress('Tab');
    cy.focused().should('have.id', 'second');

    // Navigate to the next dropdown
    cy.realPress('Tab');
    cy.focused().should('have.id', 'third');
  });

  it('can tab between multiple dropdowns (skip disabled)', () => {
    mount(
      <TabsterRoot>
        <DropdownComponent id="first" />
        <DropdownComponent id="second" disabled />
        <DropdownComponent id="third" />
        <DropdownComponent id="fourth" />
      </TabsterRoot>,
    );

    // Focus the first dropdown
    cy.get('#first').focus();

    // Navigate to the next dropdown and skip disabled one
    cy.realPress('Tab');
    cy.focused().should('have.id', 'third');

    // Navigate to the previous dropdown and skip disabled one
    cy.realPress(['Shift', 'Tab']);
    cy.focused().should('have.id', 'first');
  });
});
