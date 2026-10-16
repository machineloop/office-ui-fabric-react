import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import type { TagPickerProps } from './TagPicker.types';
import { TagPicker } from './TagPicker';
import { TagPickerControl } from '../TagPickerControl/TagPickerControl';
import { TagPickerGroup } from '../TagPickerGroup/TagPickerGroup';
import { Tag } from '@fluentui/react-tags';
import { TagPickerInput } from '../TagPickerInput/TagPickerInput';
import { TagPickerList } from '../TagPickerList/TagPickerList';
import { TagPickerOption } from '../TagPickerOption/TagPickerOption';
import { Avatar } from '@fluentui/react-avatar';
import { Button } from '@fluentui/react-button';
import { getTabster } from 'tabster';

import 'cypress-real-events';
import { tagPickerControlClassNames } from '../TagPickerControl/useTagPickerControlStyles.styles';
import type { JSXElement } from '@fluentui/react-utilities';
import { Filtering } from '../../../../stories/src/TagPicker/TagPickerFiltering.stories';
import { Grouped } from '../../../../stories/src/TagPicker/TagPickerGrouped.stories';
import { SingleSelect } from '../../../../stories/src/TagPicker/TagPickerSingleSelect.stories';
import { Button as ButtonStory } from '../../../../stories/src/TagPicker/TagPickerButton.stories';
import { SingleLine } from '../../../../stories/src/TagPicker/TagPickerSingleLine.stories';
import { TruncatedText } from '../../../../stories/src/TagPicker/TagPickerTruncatedText.stories';

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const enterFromAfter = () =>
  cy
    .get('#after-button')
    .realClick()
    .should($after =>
      expect(
        getTabster($after[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement(),
        'native focus backend has observed the original after button',
      ).to.equal($after[0]),
    )
    .realPress(['Shift', 'Tab']);

const options = [
  'John Doe',
  'Jane Doe',
  'Max Mustermann',
  'Erika Mustermann',
  'Pierre Dupont',
  'Amelie Dupont',
  'Mario Rossi',
  'Maria Rossi',
];

type TagPickerControlledProps = Pick<
  TagPickerProps,
  'open' | 'defaultOpen' | 'defaultSelectedOptions' | 'noPopover' | 'size' | 'appearance'
>;

const TagPickerControlled = ({
  open,
  defaultOpen,
  defaultSelectedOptions = [],
  noPopover = false,
  size,
  appearance,
}: TagPickerControlledProps) => {
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>(defaultSelectedOptions);
  const onOptionSelect: TagPickerProps['onOptionSelect'] = (_, data) => setSelectedOptions(data.selectedOptions);
  const handleAllClear: React.MouseEventHandler = _ => setSelectedOptions([]);

  return (
    <div style={{ display: 'flex', maxWidth: 400, flexDirection: 'column', gap: 20 }}>
      <span id="employees-label">Selected Employees</span>
      <span id="alternate-label">Alternate Employees</span>
      <button id="before-button">Before</button>

      <TagPicker
        size={size}
        appearance={appearance}
        noPopover={noPopover}
        onOptionSelect={onOptionSelect}
        selectedOptions={selectedOptions}
        open={open}
        defaultOpen={defaultOpen}
        inline
      >
        <TagPickerControl
          data-testid="tag-picker-control"
          secondaryAction={
            <Button
              data-testid="tag-picker-control__secondaryAction"
              appearance="transparent"
              size="small"
              shape="rounded"
              onClick={handleAllClear}
            >
              All Clear
            </Button>
          }
        >
          <TagPickerGroup data-testid="tag-picker-group">
            {selectedOptions.map(option => (
              <Tag
                data-testid={`tag--${option}`}
                key={option}
                shape="rounded"
                media={<Avatar name={option} color="colorful" />}
                value={option}
              >
                {option}
              </Tag>
            ))}
          </TagPickerGroup>
          <TagPickerInput data-testid="tag-picker-input" aria-labelledby="employees-label" />
        </TagPickerControl>
        {noPopover ? undefined : (
          <TagPickerList data-testid="tag-picker-list">
            {options
              .filter(option => !selectedOptions.includes(option))
              .map((option, index) => (
                <TagPickerOption
                  id={`tag-picker-option--${index}`}
                  data-testid={`tag-picker-option--${option}`}
                  secondaryContent="Microsoft FTE"
                  media={<Avatar name={option} color="colorful" />}
                  value={option}
                  key={option}
                >
                  {option}
                </TagPickerOption>
              ))}
          </TagPickerList>
        )}
      </TagPicker>

      <button id="after-button">After</button>
    </div>
  );
};

describe('TagPicker documented compositions', () => {
  it('keeps the single-line composition usable after selecting and dismissing a tag', () => {
    mount(<SingleLine />);
    cy.get('[role="combobox"]').click();
    cy.get('.fui-TagPickerList').contains('[role="option"]', 'John Doe').click();
    cy.get('.fui-Tag').should('have.length', 1);
    cy.get('.fui-Tag').click();
    cy.get('.fui-Tag').should('not.exist');
  });

  it('renders truncated tag text with its full underlying value and permits dismissal', () => {
    mount(<TruncatedText />);
    const text = 'This tag has text truncation based on a fixed width of 50px';
    cy.contains('.fui-Tag__primaryText', text)
      .should('have.css', 'text-overflow', 'ellipsis')
      .and('have.css', 'width', '50px');
    cy.contains('.fui-Tag', text).click();
    cy.contains('.fui-Tag', text).should('not.exist');
    cy.get('[role="combobox"]').click();
    cy.get('.fui-TagPickerList').contains('[role="option"]', text).should('be.visible');
  });

  it('filters typed text, adds the selected tag, and excludes it on reopen', () => {
    mount(<Filtering />);
    cy.get('[role="combobox"]').type('Dupont');
    cy.get('[role="option"]:visible').should('have.length', 2);
    cy.contains('[role="option"]', 'Pierre Dupont').click();
    cy.get('.fui-Tag').should('have.length', 1).and('contain.text', 'Pierre Dupont');
    cy.get('[role="combobox"]').should('have.value', '').click();
    cy.get('.fui-TagPickerList').should('be.visible');
    cy.get('.fui-TagPickerList').contains('[role="option"]', 'Pierre Dupont').should('not.exist');
  });

  it('keeps selection unchanged for the documented no-match sentinel', () => {
    mount(<Filtering />);
    cy.get('[role="combobox"]').type('zzzz');
    cy.contains('[role="option"]', "We couldn't find any matches").click();
    cy.get('.fui-Tag').should('not.exist');
  });

  it('preserves group labels and selects an option from either group', () => {
    mount(<Grouped />);
    cy.get('[role="combobox"]').click();
    cy.get('.fui-TagPickerList [role="group"]')
      .should('have.length', 2)
      .each(($group, index) => {
        const id = $group.attr('aria-labelledby');
        expect(id).to.be.a('string');
        cy.get(`[id="${id}"]`).should('have.text', index === 0 ? 'Managers' : 'Devs');
      });
    cy.contains('[role="option"]', 'John Doe').click();
    cy.get('[role="combobox"]').click();
    cy.contains('[role="option"]', 'Pierre Dupont').click();
    cy.get('.fui-Tag').should('have.length', 2);
  });

  it('replaces the previous tag in the documented single-select composition', () => {
    mount(<SingleSelect />);
    cy.get('[role="combobox"]').click();
    cy.contains('[role="option"]', 'John Doe').click();
    cy.get('[role="combobox"]').click();
    cy.contains('[role="option"]', 'Jane Doe').click();
    cy.get('.fui-Tag').should('have.length', 1).and('contain.text', 'Jane Doe');
  });

  it('selects through the button-only trigger without rendering a text input', () => {
    mount(<ButtonStory />);
    cy.get('input').should('not.exist');
    cy.get('button[role="combobox"]').click();
    cy.contains('[role="option"]', 'John Doe').click();
    cy.get('.fui-Tag').should('contain.text', 'John Doe');
    cy.get('button[role="combobox"]').should('be.focused');
  });

  for (const size of ['medium', 'large', 'extra-large'] as const) {
    for (const appearance of ['outline', 'underline', 'filled-darker', 'filled-lighter'] as const) {
      it(`selects using ${size}/${appearance}`, () => {
        mount(<TagPickerControlled size={size} appearance={appearance} />);
        cy.get('[data-testid="tag-picker-control"]').should(
          'have.css',
          'min-height',
          size === 'medium' ? '32px' : size === 'large' ? '40px' : '44px',
        );
        cy.get('[data-testid="tag-picker-input"]').click();
        cy.get('[data-testid="tag-picker-option--John Doe"]').click();
        cy.get('[data-testid="tag--John Doe"]').should('be.visible');
        cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      });
    }
  }
});

const EdgePicker = (props: Omit<TagPickerProps, 'children'>) => (
  <TagPicker {...props}>
    <TagPickerControl>
      <TagPickerGroup aria-label="Selected employees">
        <Tag value="one">One</Tag>
      </TagPickerGroup>
      <TagPickerInput aria-label="Choose employees" />
    </TagPickerControl>
    <TagPickerList>
      <TagPickerOption value="one">One</TagPickerOption>
      <TagPickerOption value="two">Two</TagPickerOption>
    </TagPickerList>
  </TagPicker>
);

describe('TagPicker browser state and accessibility edges', () => {
  it('does not toggle off an already selected popup option', () => {
    const selected = cy.stub().as('selected');
    mount(<EdgePicker defaultSelectedOptions={['one']} onOptionSelect={selected} />);
    cy.get('[role="combobox"]').click();
    cy.get('.fui-TagPickerList').contains('[role="option"]', 'One').click();
    cy.get('@selected')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
        value: 'one',
        selectedOptions: ['one'],
        type: 'click',
      });
    cy.get('[role="combobox"]').should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });

  it('reports rejected controlled selection without changing the next requested selection', () => {
    const selected = cy.stub().as('selected');
    mount(<EdgePicker selectedOptions={['one']} onOptionSelect={selected} />);
    cy.get('[role="combobox"]').click();
    cy.get('.fui-TagPickerList').contains('[role="option"]', 'Two').click();
    cy.get('@selected')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'two', selectedOptions: ['one', 'two'] });
    cy.get('[role="combobox"]').click();
    cy.get('.fui-TagPickerList').contains('[role="option"]', 'Two').click();
    cy.get('@selected')
      .should('have.been.calledTwice')
      .then(() => {
        expect(selected.getCall(1).args[1].selectedOptions).to.deep.equal(['one', 'two']);
      });
  });

  it('uses valid input and expand-button label relationships and popup controls', () => {
    mount(<TagPickerControlled />);
    cy.get('[data-testid="tag-picker-input"]')
      .invoke('attr', 'aria-labelledby')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Selected Employees'));
    cy.get(`.${tagPickerControlClassNames.expandIcon}`)
      .should('have.attr', 'aria-labelledby')
      .and('contain', 'employees-label');
    cy.get('[data-testid="tag-picker-input"]').click();
    cy.get('[data-testid="tag-picker-list"]')
      .invoke('attr', 'id')
      .then(id => cy.get('[data-testid="tag-picker-input"]').should('have.attr', 'aria-controls', id));
  });

  it('propagates disabled state to input and expand control without opening', () => {
    mount(<EdgePicker disabled />);
    cy.get('[role="combobox"]').should('be.disabled');
    cy.get(`.${tagPickerControlClassNames.expandIcon}`).should('have.attr', 'aria-disabled', 'true').click();
    cy.get('.fui-TagPickerList:visible').should('not.exist');
  });
});

describe('TagPicker unit-contract browser regressions', () => {
  it('honors a consumer expand label and forwards keyboard open callback data', () => {
    const openChange = cy.stub().as('openChange');
    mount(
      <TagPicker onOpenChange={openChange}>
        <TagPickerControl expandIcon={{ 'aria-label': 'Find colleagues' }}>
          <TagPickerInput aria-label="Choose colleagues" />
        </TagPickerControl>
        <TagPickerList>
          <TagPickerOption value="one">One</TagPickerOption>
        </TagPickerList>
      </TagPicker>,
    );
    cy.get(`.${tagPickerControlClassNames.expandIcon}`).should('have.attr', 'aria-label', 'Find colleagues');
    cy.get('[role="combobox"]').focus().realPress('ArrowDown');
    cy.get('.fui-TagPickerList').should('be.visible');
    cy.get('@openChange')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { open: true, type: 'keydown' });
  });

  it('uses the latest callback after parent rerender and supplies the native event', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <EdgePicker selectedOptions={['one']} onOptionSelect={updated ? latest : first} />
        </>
      );
    };
    mount(<Example />);
    cy.contains('button', 'Update').click();
    cy.get('[role="combobox"]').click();
    cy.get('.fui-TagPickerList').contains('[role="option"]', 'Two').click();
    cy.get('@first').should('not.have.been.called');
    cy.get('@latest')
      .should('have.been.calledOnce')
      .then(() => {
        const [event, data] = latest.getCall(0).args;
        expect(data.event).to.equal(event);
        expect(data.type).to.equal('click');
        expect(data.selectedOptions).to.deep.equal(['one', 'two']);
      });
  });

  it('honors controlled open rejection without removing the popover', () => {
    const openChange = cy.stub().as('openChange');
    mount(<EdgePicker open onOpenChange={openChange} />);
    cy.get('[role="combobox"]').focus().realPress('Escape');
    cy.get('.fui-TagPickerList').should('be.visible');
    cy.get('[role="combobox"]').should('have.attr', 'aria-expanded', 'true');
    cy.get('@openChange')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { open: false });
  });
});

describe('TagPicker', () => {
  it('should render a closed listbox', () => {
    mount(<TagPickerControlled />);

    cy.get('[data-testid="tag-picker-control"]').should('exist');
    cy.get('[data-testid="tag-picker-list"]').should('not.exist');
  });

  it('should render an opened listbox', () => {
    mount(<TagPickerControlled open />);

    cy.get('[data-testid="tag-picker-control"]').should('exist');
    cy.get('[data-testid="tag-picker-list"]').should('be.visible');
  });

  describe('Mouse navigation', () => {
    it('should open/close a listbox once trigger is clicked', () => {
      mount(<TagPickerControlled />);

      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
      cy.get('[data-testid="tag-picker-input"]').realClick();
      cy.get('[data-testid="tag-picker-list"]').should('be.visible');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      cy.get('[data-testid="tag-picker-input"]').realClick();
      cy.get('[data-testid="tag-picker-list"]').should('not.be.visible');
    });

    it('should open/close a listbox once expandIcon is clicked', () => {
      mount(<TagPickerControlled />);

      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
      cy.get(`.${tagPickerControlClassNames.expandIcon}`).realClick();
      cy.get('[data-testid="tag-picker-list"]').should('be.visible');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      cy.get(`.${tagPickerControlClassNames.expandIcon}`).realClick();
      cy.get('[data-testid="tag-picker-list"]').should('not.be.visible');
    });

    it('should open/close a listbox once surface (control) is clicked', () => {
      mount(<TagPickerControlled />);

      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
      cy.get('[data-testid="tag-picker-control"]').realClick();
      cy.get('[data-testid="tag-picker-list"]').should('be.visible');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      cy.get('[data-testid="tag-picker-control"]').realClick();
      cy.get('[data-testid="tag-picker-list"]').should('not.be.visible');
    });

    it('should open/close a listbox once surface (tag group) is clicked', () => {
      mount(<TagPickerControlled defaultSelectedOptions={options} />);

      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
      cy.get('[data-testid="tag-picker-group"]').realClick({ x: 1, y: 1 }); // make sure to not click on tag
      cy.get('[data-testid="tag-picker-list"]').should('be.visible');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      cy.get('[data-testid="tag-picker-group"]').realClick({ x: 1, y: 1 });
      cy.get('[data-testid="tag-picker-list"]').should('not.be.visible');
    });

    it('should not open/close a listbox once secondary action is clicked', () => {
      mount(<TagPickerControlled />);

      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
      cy.get('[data-testid="tag-picker-control__secondaryAction"]').realClick();
      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
    });

    it('should select a tag on option click', () => {
      mount(<TagPickerControlled defaultOpen />);

      cy.get('[data-testid="tag-picker-list"]').should('be.visible');
      cy.get(`[data-testid="tag-picker-option--${options[0]}"]`).should('exist').realClick();
      cy.get('[data-testid="tag-picker-list"]').should('not.be.visible');
      cy.get(`[data-testid="tag--${options[0]}"]`).should('exist');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
    });

    it('should dismiss a tag on tag click', () => {
      mount(<TagPickerControlled defaultOpen />);

      cy.get(`[data-testid="tag-picker-option--${options[0]}"]`).realClick();
      cy.get(`[data-testid="tag--${options[0]}"]`).should('exist').realClick().should('not.exist');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
    });

    it('should dismiss a tag on clear all click', () => {
      mount(<TagPickerControlled defaultOpen />);

      cy.get(`[data-testid="tag-picker-option--${options[0]}"]`).realClick();
      cy.get(`[data-testid="tag--${options[0]}"]`).should('exist').realClick();
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      cy.get('[data-testid="tag-picker-control__secondaryAction"]').should('exist').realClick();
      cy.get(`[data-testid="tag--${options[0]}"]`).should('not.exist');
    });
  });

  describe('Keyboard navigation', () => {
    it('should not open listbox on input focus', () => {
      mount(<TagPickerControlled />);

      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
      cy.get('#before-button').realClick().realPress('Tab');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      cy.get('[data-testid="tag-picker-list"]').should('exist').should('not.be.visible');
    });

    (['Enter', 'ArrowDown', 'ArrowUp'] as const).forEach(keypress => {
      it(`should open listbox on input ${keypress} key press`, () => {
        mount(<TagPickerControlled />);

        cy.get('[data-testid="tag-picker-list"]').should('not.exist');
        cy.get('#before-button').realClick().realPress('Tab');
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress(keypress);
        cy.get('[data-testid="tag-picker-list"]').should('exist').should('be.visible');
        cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-activedescendant', `tag-picker-option--0`);
      });
    });

    it('should not open listbox on input Space key press', () => {
      mount(<TagPickerControlled />);

      cy.get('[data-testid="tag-picker-list"]').should('not.exist');
      cy.get('#before-button').realClick().realPress('Tab');
      cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress('Space');
      cy.get('[data-testid="tag-picker-list"]').should('exist').should('not.be.visible');
    });

    it('should close listbox on input Escape key press', () => {
      mount(<TagPickerControlled defaultOpen />);

      cy.get('[data-testid="tag-picker-list"]').should('be.visible');
      cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-activedescendant', `tag-picker-option--0`);
      cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-expanded', 'true');
      cy.get('[data-testid="tag-picker-input"]').focus().realPress('Escape');
      cy.get('[data-testid="tag-picker-list"]').should('exist').should('not.be.visible');
      cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-expanded', 'false');
    });

    (['ArrowDown', 'ArrowUp'] as const).forEach(keypress =>
      it(`should move aria-activedescendant on ${keypress}`, () => {
        mount(<TagPickerControlled defaultOpen />);

        cy.get('[data-testid="tag-picker-list"]').should('be.visible');
        cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-activedescendant', `tag-picker-option--0`);
        cy.get('[data-testid="tag-picker-input"]').focus().realPress('ArrowDown');
        cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-activedescendant', `tag-picker-option--1`);
        cy.get('[data-testid="tag-picker-input"]').focus().realPress(keypress);
        cy.get(`[data-testid="tag-picker-input"]`).should(
          'have.attr',
          'aria-activedescendant',
          `tag-picker-option--${keypress === 'ArrowDown' ? 2 : 0}`,
        );
      }),
    );

    (['Enter', 'Space'] as const).forEach(keypress =>
      it(`should close listbox and select activedescendant on ${keypress} key press`, () => {
        mount(<TagPickerControlled />);

        cy.get('[data-testid="tag-picker-list"]').should('not.exist');
        cy.get(`[data-testid="tag--${options[0]}]"`).should('not.exist');

        cy.get('#before-button').realClick().realPress('Tab');
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress('Enter');
        cy.get('[data-testid="tag-picker-list"]').should('exist').should('be.visible');
        cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-expanded', 'true');
        cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-activedescendant', `tag-picker-option--0`);

        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress(keypress);
        cy.get('[data-testid="tag-picker-list"]').should('exist').should('not.be.visible');
        cy.get(`[data-testid="tag-picker-input"]`).should('have.attr', 'aria-expanded', 'false');

        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress('Tab');
        cy.get(`[data-testid="tag-picker-input"]`).should('not.have.attr', 'aria-activedescendant');
        cy.get(`[data-testid="tag-picker-option--0"]`).should('not.exist');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('exist');
      }),
    );

    describe('Tags', () => {
      it('should focus on last tag on Shift + Tab', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.visible');
        cy.get('[data-testid="tag-picker-control__secondaryAction"]').should('be.visible');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('be.visible');

        enterFromAfter();
        cy.get('[data-testid="tag-picker-control__secondaryAction"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('be.focused');
      });

      it('should not navigate circularly between tags with Arrow key press', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        cy.get('#before-button').realClick().realPress('Tab');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.focused').realPress('ArrowRight');
        cy.get(`[data-testid="tag--${options[1]}"]`).should('be.focused').realPress('ArrowDown');
        cy.get(`[data-testid="tag--${options[2]}"]`).should('be.focused').realPress('ArrowLeft');
        cy.get(`[data-testid="tag--${options[1]}"]`).should('be.focused').realPress('ArrowUp');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.focused').realPress('ArrowUp');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.focused');

        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`)
          .focus()
          .realPress('ArrowRight');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('not.be.focused');
      });

      it('should navigate from tags to input and back with Arrow key press', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        cy.get('#before-button').realClick().realPress('Tab');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.focused').realPress('Tab');
        cy.get(`[data-testid="tag-picker-input"]`).should('be.focused').realPress('ArrowLeft');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`)
          .should('be.focused')
          .realPress('ArrowRight');
        cy.get(`[data-testid="tag-picker-input"]`).should('be.focused');
      });

      it('should memorize last focused tag while switching focus between tags and input', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        cy.get('#before-button').realClick().realPress('Tab');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.focused').realPress('ArrowRight');
        cy.get(`[data-testid="tag--${options[1]}"]`).should('be.focused').realPress('Tab');
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get(`[data-testid="tag--${options[1]}"]`).should('be.focused');
      });

      it('should remove tag on Backspace key press and focus on next one', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        cy.get('#before-button').realClick().realPress('Tab');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.focused').realPress('Backspace').should('not.exist');
        cy.get(`[data-testid="tag--${options[1]}"]`).should('be.focused');
      });

      it('should focus on input once all tags have been removed', () => {
        mount(<TagPickerControlled defaultSelectedOptions={[options[0]]} />);

        cy.get('#before-button').realClick().realPress('Tab');
        cy.get(`[data-testid="tag--${options[0]}"]`).should('be.focused').realPress('Backspace').should('not.exist');
        cy.get('[data-testid="tag-picker-input"]').should('be.focused');
      });
    });

    describe('input', () => {
      it('should move to last tag on Backspace key press on input, when input is empty', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        enterFromAfter();
        cy.get('[data-testid="tag-picker-control__secondaryAction"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realPress('Backspace');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('be.focused');
      });

      it('should delete input content on Backspace when input is not empty', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        enterFromAfter();
        cy.get('[data-testid="tag-picker-control__secondaryAction"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realType('Some Text').realPress('Backspace');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('not.be.focused');
        cy.get('[data-testid="tag-picker-input"]').should('have.value', 'Some Tex').should('be.focused');
      });

      it('should move to last tag on Backspace key press on input, when input is not empty but the cursor is on the first character', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        enterFromAfter();
        cy.get('[data-testid="tag-picker-control__secondaryAction"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realType('SomeText').realPress('Backspace');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('not.be.focused');

        cy.get('[data-testid="tag-picker-input"]').should('be.focused').should('have.value', 'SomeTex');
        cy.get('[data-testid="tag-picker-input"]')
          // TODO: we should be able to use realType here, but it does not as expected
          .type('{moveToStart}')
          .realPress('Backspace');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('be.focused');
      });

      it('should delete input content on Backspace when input is not empty and selected', () => {
        mount(<TagPickerControlled defaultSelectedOptions={options} />);

        enterFromAfter();
        cy.get('[data-testid="tag-picker-control__secondaryAction"]').should('be.focused').realPress(['Shift', 'Tab']);
        cy.get('[data-testid="tag-picker-input"]').should('be.focused').realType('SomeText').realPress('Backspace');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('not.be.focused');

        cy.get('[data-testid="tag-picker-input"]').should('be.focused').should('have.value', 'SomeTex');
        cy.get('[data-testid="tag-picker-input"]')
          // TODO: we should be able to use realType here, but it does not as expected
          .type('{selectAll}')
          .realPress('Backspace');
        cy.get(`[data-testid="tag--${options[options.length - 1]}"]`).should('not.be.focused');
        cy.get('[data-testid="tag-picker-input"]').should('have.value', '').should('be.focused');
      });
    });
  });

  describe('Expand Icon', () => {
    it('should update aria-label and aria-labelledby on input change', () => {
      mount(<TagPickerControlled />);

      cy.get(`.${tagPickerControlClassNames.expandIcon}`).should('exist');
      cy.get('[data-testid="tag-picker-input"]').should('have.attr', 'aria-labelledby', 'employees-label');
      cy.get(`.${tagPickerControlClassNames.expandIcon}`)
        .should('have.attr', 'aria-labelledby')
        .and('contain', 'employees-label');

      cy.get('[data-testid="tag-picker-input"]')
        .invoke('attr', 'aria-labelledby', 'alternate-label')
        .should('have.attr', 'aria-labelledby', 'alternate-label');
      cy.get(`.${tagPickerControlClassNames.expandIcon}`)
        .should('have.attr', 'aria-labelledby')
        .and('contain', 'alternate-label');
    });
  });

  it('should not render popover when "noPopover"', () => {
    mount(<TagPickerControlled noPopover />);

    cy.get('[data-testid="tag-picker-control"]').should('exist');
    cy.get(`.${tagPickerControlClassNames.expandIcon}`).should('not.exist');
    cy.get('[data-testid="tag-picker-list"]').should('not.exist');
    cy.get('[data-testid="tag-picker-input"]').realClick();
    cy.get('[data-testid="tag-picker-list"]').should('not.exist');
  });
});
