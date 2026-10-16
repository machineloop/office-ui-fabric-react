import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';

import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import type { JSXElement } from '@fluentui/react-utilities';

import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  ToolbarToggleButton,
  ToolbarRadioButton,
} from '@fluentui/react-toolbar';
import { Default } from '../../../../stories/src/Toolbar/ToolbarDefault.stories';
import { ControlledToggleButton } from '../../../../stories/src/Toolbar/ToolbarControlledToggleButton.stories';
import { ControlledRadio } from '../../../../stories/src/Toolbar/ToolbarRadioControlled.stories';
import { WithPopover } from '../../../../stories/src/Toolbar/ToolbarWithPopover.stories';
import { WithTooltip } from '../../../../stories/src/Toolbar/ToolbarWithTooltip.stories';
import { FarGroup } from '../../../../stories/src/Toolbar/ToolbarFarGroup.stories';
import { OverflowItems } from '../../../../stories/src/Toolbar/ToolbarOverflow.stories';

const button = "[type='button']";

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

describe('Toolbar', () => {
  describe('Navigation', () => {
    it('should navigate with arrows', () => {
      mount(
        <Toolbar>
          <ToolbarButton>First</ToolbarButton>
          <ToolbarButton>Second</ToolbarButton>
          <ToolbarButton>Third</ToolbarButton>
          <ToolbarButton>Fourth</ToolbarButton>
        </Toolbar>,
      );

      cy.get(button).eq(0).click();
      cy.get(button).eq(0).should('be.focused');

      cy.get(button).eq(0).type('{rightArrow}');
      cy.get(button).eq(1).should('be.focused');

      cy.get(button).eq(1).type('{downArrow}');
      cy.get(button).eq(2).should('be.focused');

      cy.get(button).eq(2).type('{upArrow}');
      cy.get(button).eq(1).should('be.focused');

      cy.get(button).eq(1).type('{leftArrow}');
      cy.get(button).eq(0).should('be.focused');
    });

    it('should have circular navigation', () => {
      mount(
        <Toolbar>
          <ToolbarButton>First</ToolbarButton>
          <ToolbarButton>Second</ToolbarButton>
          <ToolbarButton>Third</ToolbarButton>
          <ToolbarButton>Fourth</ToolbarButton>
        </Toolbar>,
      );

      cy.get(button).eq(3).click();
      cy.get(button).eq(3).should('be.focused');

      cy.get(button).eq(3).type('{rightArrow}');
      cy.get(button).eq(0).should('be.focused');

      cy.get(button).eq(0).type('{leftArrow}');
      cy.get(button).eq(3).should('be.focused');
    });
  });

  describe('Toggle Button', () => {
    it('should toggle button state on click', () => {
      mount(
        <Toolbar>
          <ToolbarToggleButton name="group" value="first">
            First
          </ToolbarToggleButton>
        </Toolbar>,
      );

      cy.get(button).eq(0).should('have.attr', 'aria-pressed', 'false');

      cy.get(button).eq(0).click();
      cy.get(button).eq(0).should('have.attr', 'aria-pressed', 'true');

      cy.get(button).eq(0).click();
      cy.get(button).eq(0).should('have.attr', 'aria-pressed', 'false');
    });

    it('should set default checked values', () => {
      mount(
        <Toolbar
          defaultCheckedValues={{
            group: ['first'],
          }}
        >
          <ToolbarToggleButton name="group" value="first">
            First
          </ToolbarToggleButton>
        </Toolbar>,
      );

      cy.get(button).eq(0).should('have.attr', 'aria-pressed', 'true');
    });
  });

  describe('Radio Button', () => {
    it('should toggle button state on click', () => {
      mount(
        <Toolbar>
          <ToolbarRadioButton name="group" value="first">
            First
          </ToolbarRadioButton>
        </Toolbar>,
      );

      cy.get(button).eq(0).should('have.attr', 'aria-checked', 'false');

      cy.get(button).eq(0).click();
      cy.get(button).eq(0).should('have.attr', 'aria-checked', 'true');

      cy.get(button).eq(0).click();
      cy.get(button).eq(0).should('have.attr', 'aria-checked', 'true');
    });

    it('should set default checked values', () => {
      mount(
        <Toolbar
          defaultCheckedValues={{
            group: ['first'],
          }}
        >
          <ToolbarRadioButton name="group" value="first">
            First
          </ToolbarRadioButton>
        </Toolbar>,
      );

      cy.get(button).eq(0).should('have.attr', 'aria-checked', 'true');
    });

    it('should check new value and uncheck previously checked', () => {
      mount(
        <Toolbar
          defaultCheckedValues={{
            group: ['first'],
          }}
        >
          <ToolbarRadioButton name="group" value="first">
            First
          </ToolbarRadioButton>
          <ToolbarRadioButton name="group" value="second">
            Second
          </ToolbarRadioButton>
        </Toolbar>,
      );

      cy.get(button).eq(0).should('have.attr', 'aria-checked', 'true');
      cy.get(button).eq(1).click();

      cy.get(button).eq(1).should('have.attr', 'aria-checked', 'true');
      cy.get(button).eq(0).should('have.attr', 'aria-checked', 'false');
    });
  });
});

describe('ToolbarDivider', () => {
  it('should focus first element', () => {
    mount(
      <Toolbar>
        <ToolbarButton>Item 1</ToolbarButton>
        <ToolbarButton>Item 2</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton>Item 3</ToolbarButton>
      </Toolbar>,
    );

    cy.get(button).eq(2).click().type('{rightarrow}');
    cy.get(button).eq(0).should('be.focused');
  });

  describe('Toolbar browser edges and accessibility', () => {
    it('enters once with Tab, leaves the toolbar, and remembers the active control', () => {
      mount(
        <>
          <button>Before</button>
          <Toolbar aria-label="Formatting">
            <ToolbarButton>First</ToolbarButton>
            <ToolbarButton>Second</ToolbarButton>
            <ToolbarButton>Third</ToolbarButton>
          </Toolbar>
          <button>After</button>
        </>,
      );
      cy.contains('button', 'Before').click().realPress('Tab');
      cy.contains('button', 'First').should('be.focused').realPress('ArrowRight');
      cy.contains('button', 'Second').should('be.focused').realPress('Tab');
      cy.contains('button', 'After').should('be.focused').realPress(['Shift', 'Tab']);
      cy.contains('button', 'Second').should('be.focused');
    });

    describe('Toolbar unit-contract browser regressions', () => {
      it('forwards the root ref and native attributes without leaking state props', () => {
        const ref = React.createRef<HTMLDivElement>();
        mount(
          <Toolbar
            ref={ref}
            title="Formatting controls"
            data-testid="toolbar"
            size="large"
            vertical
            defaultCheckedValues={{ format: ['bold'] }}
          >
            <ToolbarToggleButton name="format" value="bold">
              Bold
            </ToolbarToggleButton>
          </Toolbar>,
        );
        cy.get('[data-testid="toolbar"]').should($root => {
          expect($root).to.have.attr('role', 'toolbar');
          expect($root).to.have.attr('title', 'Formatting controls');
          expect($root).to.have.attr('aria-orientation', 'vertical');
          for (const attribute of ['size', 'vertical', 'defaultCheckedValues']) {
            expect($root).not.to.have.attr(attribute);
          }
        });
        cy.get('[data-testid="toolbar"]').then($root => expect(ref.current).to.equal($root[0]));
        cy.contains('button', 'Bold').should('have.attr', 'aria-pressed', 'true');
      });

      it('preserves selections in a second named group when a toggle changes', () => {
        mount(
          <Toolbar defaultCheckedValues={{ format: ['bold', 'italic'], alignment: ['center'] }}>
            <ToolbarToggleButton name="format" value="bold">
              Bold
            </ToolbarToggleButton>
            <ToolbarToggleButton name="format" value="italic">
              Italic
            </ToolbarToggleButton>
            <ToolbarRadioButton name="alignment" value="center">
              Center
            </ToolbarRadioButton>
          </Toolbar>,
        );
        cy.contains('button', 'Bold').click().should('have.attr', 'aria-pressed', 'false');
        cy.contains('button', 'Italic').should('have.attr', 'aria-pressed', 'true');
        cy.contains('button', 'Center')
          .should('have.attr', 'aria-checked', 'true')
          .and('not.have.attr', 'aria-pressed');
      });

      it('uses current controlled values and handlers after a parent rerender', () => {
        const first = cy.stub().as('first');
        const latest = cy.stub().as('latest');
        const Example = () => {
          const [updated, setUpdated] = React.useState(false);
          return (
            <>
              <button onClick={() => setUpdated(true)}>Update</button>
              <Toolbar
                checkedValues={{ format: updated ? ['italic'] : ['bold'] }}
                onCheckedValueChange={updated ? latest : first}
                size={updated ? 'small' : 'large'}
                vertical={updated}
              >
                <ToolbarToggleButton name="format" value="bold">
                  Bold
                </ToolbarToggleButton>
                <ToolbarToggleButton name="format" value="italic">
                  Italic
                </ToolbarToggleButton>
              </Toolbar>
            </>
          );
        };
        mount(<Example />);
        cy.contains('button', 'Bold').should('have.attr', 'aria-pressed', 'true');
        cy.contains('button', 'Update').click();
        cy.get('[role="toolbar"]')
          .should('have.attr', 'aria-orientation', 'vertical')
          .and('have.css', 'flex-direction', 'column');
        cy.contains('button', 'Italic').should('have.attr', 'aria-pressed', 'true');
        cy.contains('button', 'Bold').click().should('have.attr', 'aria-pressed', 'false');
        cy.get('@first').should('not.have.been.called');
        cy.get('@latest')
          .should('have.been.calledOnce')
          .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
            name: 'format',
            checkedItems: ['italic', 'bold'],
          });
      });

      it('does not reset uncontrolled state when defaultCheckedValues changes', () => {
        const Example = () => {
          const [updated, setUpdated] = React.useState(false);
          return (
            <>
              <button onClick={() => setUpdated(true)}>Update default</button>
              <Toolbar defaultCheckedValues={{ format: updated ? ['italic'] : ['bold'] }}>
                <ToolbarToggleButton name="format" value="bold">
                  Bold
                </ToolbarToggleButton>
                <ToolbarToggleButton name="format" value="italic">
                  Italic
                </ToolbarToggleButton>
              </Toolbar>
            </>
          );
        };
        mount(<Example />);
        cy.contains('button', 'Bold').click().should('have.attr', 'aria-pressed', 'false');
        cy.contains('button', 'Update default').click();
        cy.contains('button', 'Bold').should('have.attr', 'aria-pressed', 'false');
        cy.contains('button', 'Italic').should('have.attr', 'aria-pressed', 'false');
      });

      it('ignores empty selection names and values', () => {
        const change = cy.stub().as('change');
        mount(
          <Toolbar onCheckedValueChange={change}>
            <ToolbarToggleButton name="" value="bold">
              Missing name
            </ToolbarToggleButton>
            <ToolbarToggleButton name="format" value="">
              Missing value
            </ToolbarToggleButton>
            <ToolbarRadioButton name="" value="left">
              Missing radio name
            </ToolbarRadioButton>
          </Toolbar>,
        );
        cy.contains('button', 'Missing name').click().should('have.attr', 'aria-pressed', 'false');
        cy.contains('button', 'Missing value').click().should('have.attr', 'aria-pressed', 'false');
        cy.contains('button', 'Missing radio name').click().should('have.attr', 'aria-checked', 'false');
        cy.get('@change').should('not.have.been.called');
      });
    });

    it('skips disabled and hidden controls but retains disabledFocusable controls', () => {
      const change = cy.stub().as('change');
      mount(
        <Toolbar aria-label="Formatting" onCheckedValueChange={change}>
          <ToolbarButton>First</ToolbarButton>
          <ToolbarToggleButton disabled name="format" value="disabled">
            Disabled
          </ToolbarToggleButton>
          <ToolbarButton style={{ display: 'none' }}>Hidden</ToolbarButton>
          <ToolbarToggleButton disabledFocusable name="format" value="focusable">
            Focusable
          </ToolbarToggleButton>
          <ToolbarButton>Last</ToolbarButton>
        </Toolbar>,
      );
      cy.contains('button', 'First').click().realPress('ArrowRight');
      cy.contains('button', 'Focusable')
        .should('be.focused')
        .and('have.attr', 'aria-disabled', 'true')
        .realPress('Space');
      cy.get('@change').should('not.have.been.called');
      cy.contains('button', 'Focusable').should('have.attr', 'aria-pressed', 'false').realPress('ArrowRight');
      cy.contains('button', 'Last').should('be.focused');
    });

    it('uses right-to-left arrow navigation', () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir="rtl">
          <Toolbar aria-label="Formatting">
            <ToolbarButton>First</ToolbarButton>
            <ToolbarButton>Second</ToolbarButton>
            <ToolbarButton>Third</ToolbarButton>
          </Toolbar>
        </FluentProvider>,
      );
      cy.contains('button', 'First').click().realPress('ArrowLeft');
      cy.contains('button', 'Second').should('be.focused').realPress('ArrowRight');
      cy.contains('button', 'First').should('be.focused');
    });

    it('toggles with native Space and Enter activation exactly once', () => {
      const change = cy.stub().as('change');
      mount(
        <Toolbar aria-label="Formatting" onCheckedValueChange={change}>
          <ToolbarToggleButton name="format" value="bold">
            Bold
          </ToolbarToggleButton>
          <ToolbarButton>Second</ToolbarButton>
          <ToolbarButton>Third</ToolbarButton>
        </Toolbar>,
      );
      cy.contains('button', 'Bold').focus().realPress('Space');
      cy.contains('button', 'Bold').should('have.attr', 'aria-pressed', 'true');
      cy.get('@change')
        .should('have.been.calledOnce')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, { name: 'format', checkedItems: ['bold'] });
      cy.contains('button', 'Bold').realPress('Enter');
      cy.contains('button', 'Bold').should('have.attr', 'aria-pressed', 'false');
      cy.get('@change')
        .should('have.been.calledTwice')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, { name: 'format', checkedItems: [] });
    });

    it('reports a requested controlled change without changing rejected state', () => {
      const change = cy.stub().as('change');
      mount(
        <Toolbar aria-label="Formatting" checkedValues={{ format: ['bold'] }} onCheckedValueChange={change}>
          <ToolbarToggleButton name="format" value="bold">
            Bold
          </ToolbarToggleButton>
          <ToolbarToggleButton name="format" value="italic">
            Italic
          </ToolbarToggleButton>
          <ToolbarButton>Third</ToolbarButton>
        </Toolbar>,
      );
      cy.contains('button', 'Italic').click().should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'Bold').should('have.attr', 'aria-pressed', 'true');
      cy.get('@change')
        .should('have.been.calledOnce')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
          name: 'format',
          checkedItems: ['bold', 'italic'],
        });
    });

    it('isolates selection state in sibling and nested toolbars', () => {
      mount(
        <>
          <Toolbar aria-label="Outer">
            <ToolbarToggleButton name="format" value="bold">
              Outer bold
            </ToolbarToggleButton>
            <Toolbar aria-label="Inner">
              <ToolbarToggleButton name="format" value="bold">
                Inner bold
              </ToolbarToggleButton>
            </Toolbar>
          </Toolbar>
          <Toolbar aria-label="Sibling">
            <ToolbarToggleButton name="format" value="bold">
              Sibling bold
            </ToolbarToggleButton>
          </Toolbar>
        </>,
      );
      cy.contains('button', 'Inner bold').click().should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Outer bold').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'Sibling bold').should('have.attr', 'aria-pressed', 'false');
    });

    it('labels multiple toolbars through both ARIA naming mechanisms', () => {
      mount(
        <>
          <h2 id="format-heading">Formatting</h2>
          <Toolbar aria-labelledby="format-heading">
            <ToolbarButton>Bold</ToolbarButton>
          </Toolbar>
          <Toolbar aria-label="Actions">
            <ToolbarButton>Save</ToolbarButton>
          </Toolbar>
        </>,
      );
      cy.get('[role="toolbar"]').eq(0).should('have.attr', 'aria-labelledby', 'format-heading');
      cy.get('#format-heading').should('have.text', 'Formatting');
      cy.get('[role="toolbar"]').eq(1).should('have.attr', 'aria-label', 'Actions');
      cy.get('[role="toolbar"]').should('not.have.attr', 'aria-orientation');
    });
  });

  describe('Toolbar documented compositions', () => {
    it('opens the documented menu and restores focus on Escape', () => {
      mount(<Default />);
      cy.get('[aria-label="More"]').click();
      cy.get('[role="menu"]').should('be.visible');
      cy.contains('[role="menuitem"]', 'Open File').should('have.attr', 'aria-disabled', 'true');
      cy.get('[role="menuitem"]').first().type('{esc}');
      cy.get('[role="menu"]').should('not.exist');
      cy.get('[aria-label="More"]').should('be.focused');
    });

    it('updates controlled toggle values without clearing other selections', () => {
      mount(<ControlledToggleButton />);
      cy.get('[aria-label="Bold"]').should('have.attr', 'aria-pressed', 'true').click();
      cy.get('[aria-label="Bold"]').should('have.attr', 'aria-pressed', 'false');
      cy.get('[aria-label="Italic"]').should('have.attr', 'aria-pressed', 'true');
      cy.get('[aria-label="Underline"]').click().should('have.attr', 'aria-pressed', 'true');
    });

    it('keeps controlled radio selection exclusive', () => {
      mount(<ControlledRadio />);
      cy.get('[aria-label="Align Center"]').should('have.attr', 'aria-checked', 'true');
      cy.get('[aria-label="Align Right"]').click().should('have.attr', 'aria-checked', 'true');
      cy.get('[aria-label="Align Center"]').should('have.attr', 'aria-checked', 'false');
      cy.get('[role="radio"][aria-checked="true"]').should('have.length', 1);
    });

    it('opens and closes the documented popover', () => {
      mount(<WithPopover />);
      cy.get('[aria-label="Insert image"]').click();
      cy.contains('h3', 'Insert Image').should('be.visible');
      cy.contains('button', 'Close').click();
      cy.contains('h3', 'Insert Image').should('not.exist');
      cy.get('[aria-label="Insert image"]').should('be.focused');
    });

    it('describes focused controls using the documented tooltip', () => {
      mount(<WithTooltip />);
      cy.get('[aria-label="Bold"]').focus();
      cy.get('[role="tooltip"]').should('be.visible').and('contain.text', 'Makes selected text Bold');
      cy.get('[aria-label="Bold"]')
        .invoke('attr', 'aria-describedby')
        .then(id => {
          expect(id).to.be.a('string');
          cy.get(`[id="${id}"]`).should('contain.text', 'Makes selected text Bold');
        });
    });

    it('navigates across the separated groups and divider', () => {
      mount(<FarGroup />);
      cy.get('button').eq(5).click().type('{rightArrow}');
      cy.get('button').eq(6).should('be.focused');
      cy.get('button').eq(0).click().type('{leftArrow}');
      cy.get('button').eq(8).should('be.focused');
    });

    it('restores all displaced actions after shrinking and expanding the documented container', () => {
      const Example = () => {
        const [width, setWidth] = React.useState(800);
        return (
          <>
            <button onClick={() => setWidth(180)}>Shrink</button>
            <button onClick={() => setWidth(800)}>Expand</button>
            <div style={{ width }}>
              <OverflowItems />
            </div>
          </>
        );
      };
      mount(<Example />);
      const actions = '[role="toolbar"] button[aria-label*="Font Size"]';
      cy.get(actions).should('have.length', 10).filter(':visible').should('have.length', 10);
      cy.get('[aria-label="More items"]').should('not.exist');
      cy.contains('button', 'Shrink').click();
      cy.get('[aria-label="More items"]').should('be.visible');
      cy.get(actions)
        .should($actions => expect($actions.filter(':hidden').length).to.be.greaterThan(0))
        .then($actions => {
          const displaced = Array.from($actions.filter(':hidden'), action =>
            action.getAttribute('aria-label')!.replace(/ \( Group \d \)/, ''),
          ).sort();
          cy.get('[aria-label="More items"]').click();
          cy.get('[role="menuitem"]').should($items => {
            expect(Array.from($items, item => item.textContent!.trim()).sort()).to.deep.equal(displaced);
          });
        });
      cy.get('[role="menuitem"]').first().type('{esc}');
      cy.get('[role="menu"]').should('not.exist');
      cy.contains('button', 'Expand').click();
      cy.get('[aria-label="More items"]').should('not.exist');
      cy.get(actions).filter(':visible').should('have.length', 10);
    });

    for (const [size, horizontal, vertical] of [
      ['small', '4px', '0px'],
      ['medium', '8px', '4px'],
      ['large', '20px', '4px'],
    ] as const) {
      it(`applies documented ${size} spacing and keeps controls usable`, () => {
        mount(
          <Toolbar size={size} aria-label="Formatting">
            <ToolbarButton>First</ToolbarButton>
            <ToolbarButton>Second</ToolbarButton>
            <ToolbarButton>Third</ToolbarButton>
          </Toolbar>,
        );
        cy.get('[role="toolbar"]')
          .should('have.css', 'padding-left', horizontal)
          .and('have.css', 'padding-top', vertical);
        cy.contains('button', 'First').click().type('{rightArrow}');
        cy.contains('button', 'Second').should('be.focused');
      });
    }

    for (const appearance of ['subtle', 'transparent'] as const) {
      it(`selects ${appearance} controls`, () => {
        mount(
          <Toolbar aria-label="Formatting">
            {['Bold', 'Italic', 'Underline'].map(value => (
              <ToolbarToggleButton key={value} appearance={appearance} name="format" value={value}>
                {value}
              </ToolbarToggleButton>
            ))}
          </Toolbar>,
        );
        cy.contains('button', 'Bold').click().should('have.attr', 'aria-pressed', 'true');
        cy.contains('button', 'Italic').click().should('have.attr', 'aria-pressed', 'true');
        cy.contains('button', 'Underline').should('have.attr', 'aria-pressed', 'false');
      });
    }

    it('lays out a vertical toolbar and navigates down', () => {
      mount(
        <Toolbar vertical aria-label="Formatting">
          <ToolbarButton>First</ToolbarButton>
          <ToolbarButton>Second</ToolbarButton>
          <ToolbarButton>Third</ToolbarButton>
        </Toolbar>,
      );
      cy.get('[role="toolbar"]')
        .should('have.attr', 'aria-orientation', 'vertical')
        .and('have.css', 'flex-direction', 'column');
      cy.contains('button', 'First').click().type('{downArrow}');
      cy.contains('button', 'Second').should('be.focused');
    });

    it('supports vertically arranged button content in a horizontal toolbar', () => {
      mount(
        <Toolbar aria-label="Formatting">
          <ToolbarButton vertical icon={<span data-testid="icon">+</span>}>
            Increase
          </ToolbarButton>
          <ToolbarButton vertical>Decrease</ToolbarButton>
          <ToolbarButton vertical>Reset</ToolbarButton>
        </Toolbar>,
      );
      cy.contains('button', 'Increase').should('have.css', 'flex-direction', 'column').click().type('{rightArrow}');
      cy.contains('button', 'Decrease').should('be.focused');
    });
  });

  it('should navigate with arrow key', () => {
    mount(
      <Toolbar>
        <ToolbarButton>Item 1</ToolbarButton>
        <ToolbarButton>Item 2</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton>Item 3</ToolbarButton>
      </Toolbar>,
    );

    cy.get(button).eq(0).click();

    cy.get(button).eq(0).type('{rightarrow}');
    cy.get(button).eq(1).should('be.focused');
  });

  it('should have circular navigation', () => {
    mount(
      <Toolbar>
        <ToolbarButton>Item 1</ToolbarButton>
        <ToolbarButton>Item 2</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton>Item 3</ToolbarButton>
      </Toolbar>,
    );

    cy.get(button).eq(0).click();

    cy.get(button).eq(0).type('{leftarrow}');
    cy.get(button).eq(2).should('be.focused');
  });
});
