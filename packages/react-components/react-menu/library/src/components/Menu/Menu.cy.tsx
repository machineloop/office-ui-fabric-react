import { mount as mountBase } from '@fluentui/scripts-cypress';
import { makeStyles } from '@griffel/react';
import type { JSXElement } from '@fluentui/react-utilities';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuItemCheckbox,
  MenuItemRadio,
  MenuGroup,
  MenuGroupHeader,
  MenuSplitGroup,
  MenuDivider,
  MenuItemLink,
  MenuItemSwitch,
  type MenuProps,
  menuItemClassNames,
} from '@fluentui/react-menu';
import { FluentProvider } from '@fluentui/react-provider';
import { Portal } from '@fluentui/react-portal';
import { Tooltip } from '@fluentui/react-tooltip';
import { createPresenceComponent } from '@fluentui/react-motion';
import type { PositioningImperativeRef } from '@fluentui/react-positioning';
import type { SinonStub as ContractStub } from 'cypress/types/sinon';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import * as React from 'react';

import {
  menuItemRadioSelector,
  menuItemCheckboxSelector,
  menuTriggerSelector,
  menuItemSelector,
  menuSelector,
  menuTriggerId,
} from '../../testing/selectors';

// eslint-disable-next-line @griffel/styles-file
const useStyles = makeStyles({
  pointerPortal: {
    zIndex: 10000000,
  },
});

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

describe('MenuTrigger', () => {
  it('should open menu and focus first item when clicked', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .click()
      .get(menuSelector)
      .should('be.visible')
      .get(menuItemSelector)
      .should('be.focused');
  });

  it('should open menu on hover if openOnHover is set', () => {
    mount(
      <Menu openOnHover hoverDelay={1}>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .realHover()
      .wait(1)
      .get(menuSelector)
      .should('be.visible')
      .get(menuItemSelector)
      .should('be.focused');
  });

  it('should close menu on escape when focus is on the trigger', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .click()
      .get(menuSelector)
      .should('be.visible')
      .get(menuTriggerSelector)
      .type('{esc}')
      .get(menuSelector)
      .should('not.exist');
  });

  (['ArrowDown', 'Enter', 'Space'] as const).forEach(key => {
    it(`should open menu with ${key} and focus first menuitem`, () => {
      mount(
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <button id={menuTriggerId}>Menu</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem>Item</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>,
      );

      cy.get(menuTriggerSelector).focus().realPress(key);
      cy.get(menuSelector).should('be.visible').get(menuItemSelector).first().should('be.focused');
    });
  });

  it('should not automatically focus itself when mounted', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector).should('not.be.focused');
  });

  it('should not focus itself after re-render', () => {
    const Example = () => {
      const [count, setCount] = React.useState(0);

      React.useEffect(() => {
        // trigger 2 re-renders to make sure that the focus effect has finished running
        // after first re-render
        if (count < 2) {
          setCount(c => c + 1);
        }
      }, [count]);

      return (
        <>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button data-status={count < 2 ? 'incomplete' : 'complete'} id={menuTriggerId}>
                Menu
              </button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem>Item</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <input type="text" />
        </>
      );
    };

    mount(<Example />);
    cy.get(menuTriggerSelector).should('have.attr', 'data-status', 'complete').should('not.be.focused');
  });
});

describe('Custom Trigger', () => {
  const CustomMenuTrigger = React.forwardRef<HTMLButtonElement, {}>((props, ref) => {
    return (
      <button id={menuTriggerId} {...props} ref={ref}>
        Custom Trigger
      </button>
    );
  });

  const CustomTriggerExample = () => {
    const [open, setOpen] = React.useState(false);
    const onOpenChange: MenuProps['onOpenChange'] = (e, data) => {
      setOpen(data.open);
    };

    return (
      <Menu open={open} onOpenChange={onOpenChange}>
        <MenuTrigger disableButtonEnhancement>
          <CustomMenuTrigger />
        </MenuTrigger>

        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  };

  it('should open menu when clicked', () => {
    mount(<CustomTriggerExample />);

    cy.contains('Custom Trigger').click().get(menuSelector).should('be.visible');
  });

  it('should dismiss the menu when click outside', () => {
    mount(<CustomTriggerExample />);
    cy.contains('Custom Trigger').click().get('body').click('bottomRight').get(menuSelector).should('not.exist');
  });
});

describe('MenuItem', () => {
  it('should close the menu when clicked', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .trigger('click')
      .get(menuItemSelector)
      .first()
      .click()
      .get(menuSelector)
      .should('not.be.exist');
  });

  it('should not close the menu when disabled on click', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem disabled>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .trigger('click')
      .get('[aria-disabled="true"]')
      .first()
      .click()
      .get(menuSelector)
      .should('be.visible');
  });

  it('should focus on hover', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .trigger('click')
      .get(menuItemSelector)
      .each(el => {
        cy.wrap(el).trigger('mouseover').should('be.focused');
      });
  });
});

describe('MenuItemCheckbox', () => {
  it('should be selected on click', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItemCheckbox name="test" value="test">
              Item
            </MenuItemCheckbox>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .trigger('click')
      .get(menuItemCheckboxSelector)
      .first()
      .click()
      .should('have.attr', 'aria-checked', 'true');
  });

  ['enter', ' '].forEach(key => {
    it(`should be selected on ${key === ' ' ? 'space' : key} key`, () => {
      mount(
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <button id={menuTriggerId}>Menu</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItemCheckbox name="test" value="test">
                Item
              </MenuItemCheckbox>
            </MenuList>
          </MenuPopover>
        </Menu>,
      );
      cy.get(menuTriggerSelector)
        .trigger('click')
        .get(menuItemCheckboxSelector)
        .first()
        .focus()
        .realPress(key === ' ' ? 'Space' : 'Enter');
      cy.get(menuItemCheckboxSelector).first().should('have.attr', 'aria-checked', 'true');
    });
  });
});

describe('MenuItemRadio', () => {
  it('should be selected on', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItemRadio name="test" value="test">
              Item
            </MenuItemRadio>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector).trigger('click').get(menuItemRadioSelector).first().click();

    cy.get(menuTriggerSelector)
      .trigger('click')
      .get(menuItemRadioSelector)
      .first()
      .should('have.attr', 'aria-checked', 'true');
  });

  ['enter', ' '].forEach(key => {
    it(`should be selected on ${key === ' ' ? 'space' : key} key`, () => {
      mount(
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <button id={menuTriggerId}>Menu</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItemRadio name="test" value="test">
                Item
              </MenuItemRadio>
            </MenuList>
          </MenuPopover>
        </Menu>,
      );
      cy.get(menuTriggerSelector)
        .trigger('click')
        .get(menuItemRadioSelector)
        .first()
        .focus()
        .realPress(key === ' ' ? 'Space' : 'Enter')
        .get(menuTriggerSelector)
        .trigger('click')
        .get(menuItemRadioSelector)
        .first()
        .should('have.attr', 'aria-checked', 'true');
    });
  });

  it('should only have one item selected', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItemRadio name="test" value="first">
              First
            </MenuItemRadio>
            <MenuItemRadio name="test" value="second">
              Second
            </MenuItemRadio>
            <MenuItemRadio name="test" value="third">
              Third
            </MenuItemRadio>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .trigger('click')
      .get(menuItemRadioSelector)
      .first()
      .click()
      .get(menuTriggerSelector)
      .trigger('click')
      .get(menuItemRadioSelector)
      .eq(1)
      .click()
      .get(menuTriggerSelector)
      .trigger('click')
      .get(menuItemRadioSelector)
      .eq(2)
      .click()
      .get(menuTriggerSelector)
      .trigger('click')
      .get('[aria-checked="true"]')
      .should('have.length', 1);
  });
});

describe('Menu', () => {
  it('should not focus trigger on dismiss if another element is focused', () => {
    mount(
      <>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <button id={menuTriggerId}>Menu</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem>Item</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <input type="text" />
      </>,
    );
    cy.get(menuTriggerSelector).click().get(menuSelector).should('exist').get('input').realClick();

    cy.get('input').should('be.focused');
  });

  it('should be dismissed with Escape', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .click()
      .focused()
      .type('{esc}')
      .get(menuSelector)
      .should('not.exist')
      .get(menuTriggerSelector)
      .should('be.focused');
  });

  it('should be dismissed on outside click', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector).click().get('body').click('bottomRight').get(menuSelector).should('not.exist');
  });

  it('should be dismissed on with {leftarrow} when not a submenu', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector).click().focused().type('{leftarrow}').get(menuSelector).should('be.visible');
  });

  it('should dismiss when clicking a menu item', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector).click().get(menuItemSelector).first().click().get(menuSelector).should('not.exist');
  });

  it('should not dismiss when clicking a group header', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuGroup>
              <MenuGroupHeader>Header</MenuGroupHeader>
              <MenuItem>Item</MenuItem>
            </MenuGroup>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .click()
      .get(menuSelector)
      .contains('Header')
      .click()
      .get(menuSelector)
      .should('be.visible');
  });

  it('should close on scroll when closeOnScroll is set', () => {
    mount(
      <Menu closeOnScroll>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Menu</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem>Item</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(menuTriggerSelector)
      .click()
      .get(menuSelector)
      .should('exist')
      .get('body')
      .trigger('wheel')
      .get(menuSelector)
      .should('not.exist');
  });

  it('should be able to tab to next element after the root trigger', () => {
    mount(
      <>
        <Menu closeOnScroll>
          <MenuTrigger disableButtonEnhancement>
            <button id={menuTriggerId}>Menu</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem>Item</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <button>After</button>
      </>,
    );

    cy.get(menuTriggerSelector).click().get(menuSelector).should('exist').realPress('Tab');
    cy.contains('After').should('be.focused').get(menuSelector).should('not.exist');
  });

  it('should be able to shift tab to previous element after the root trigger', () => {
    mount(
      <>
        <button>Before</button>
        <Menu closeOnScroll>
          <MenuTrigger disableButtonEnhancement>
            <button id={menuTriggerId}>Menu</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem>Item</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </>,
    );

    cy.get(menuTriggerSelector).click().get(menuSelector).should('exist').realPress(['Shift', 'Tab']);
    cy.contains('Before').should('be.focused').get(menuSelector).should('not.exist');
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`should close menu and focus trigger on ${key}`, () => {
      mount(
        <Menu>
          <MenuTrigger>
            <button id={menuTriggerId}>Menu</button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem>Item</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>,
      );

      cy.get(menuTriggerSelector).click().get(menuSelector).should('exist').realPress(key);
      cy.get(menuSelector).should('not.exist').get(menuTriggerSelector).should('be.focused');
    });
  });
});

describe('SplitMenuItem', () => {
  const example = (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <button id={menuTriggerId}>Menu</button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem>Item</MenuItem>
          <MenuSplitGroup>
            <MenuItem>Split item</MenuItem>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <MenuItem />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem>Item</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </MenuSplitGroup>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
  it('should be able to reach the trigger with down arrow', () => {
    mount(example);
    cy.get(menuTriggerSelector).focus();

    // Can't find a better way than hard code the number of tabstops
    for (let i = 0; i < 3; i++) {
      cy.focused().focus().type('{downarrow}');
    }

    cy.focused().focus().type('{rightarrow}');
    cy.get(menuSelector).should('have.length', 2);
  });

  it('should be able to navigate horizontally within split item', () => {
    mount(example);
    cy.get(menuTriggerSelector).focus();

    // Can't find a better way than hard code the number of tabstops
    for (let i = 0; i < 3; i++) {
      cy.focused().focus().type('{downarrow}');
    }

    cy.focused()
      .focus()
      .type('{leftarrow}') // focus main action of split item
      .focused()
      .should('have.text', 'Split item')
      .focus()
      .type('{rightarrow}')
      .focused()
      .type('{rightarrow}'); // open submenu

    cy.get(menuSelector).should('have.length', 2);
  });
});

// [nestedMenuStory, nestedMenuControlledStory].forEach(story => {
describe(`Nested Menus`, () => {
  const MenuL22Uncontrolled = () => (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem id="menu-l2-2-trigger">Editor Layout</MenuItem>
      </MenuTrigger>

      <MenuPopover>
        <MenuList id="menu-l2-2">
          <MenuItem>Split Up</MenuItem>
          <MenuItem>Split Down</MenuItem>
          <MenuItem>Single</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  const MenuL21Uncontrolled = () => (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem id="menu-l2-1-trigger">Appearance</MenuItem>
      </MenuTrigger>

      <MenuPopover>
        <MenuList id="menu-l2-1">
          <MenuItem>Centered Layout</MenuItem>
          <MenuItem>Zen</MenuItem>
          <MenuItem disabled>Zoom In</MenuItem>
          <MenuItem>Zoom Out</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  const MenuL1Uncontrolled = () => (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem id="menu-l1-trigger">Preferences</MenuItem>
      </MenuTrigger>

      <MenuPopover>
        <MenuList id="menu-l1">
          <MenuItem>Settings</MenuItem>
          <MenuItem>Online Services Settings</MenuItem>
          <MenuItem>Extensions</MenuItem>
          <MenuL21Uncontrolled />
          <MenuL22Uncontrolled />
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  const UncontrolledExample = () => (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <button id={menuTriggerId}>Toggle menu</button>
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem>New</MenuItem>
          <MenuItem>New Window</MenuItem>
          <MenuItem disabled>Open File</MenuItem>
          <MenuItem>Open Folder</MenuItem>
          <MenuL1Uncontrolled />
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  const MenuL21Controlled = () => {
    const [open, setOpen] = React.useState(false);
    const onOpenChange: MenuProps['onOpenChange'] = (e, data) => {
      setOpen(data.open);
    };

    return (
      <Menu open={open} onOpenChange={onOpenChange}>
        <MenuTrigger disableButtonEnhancement>
          <MenuItem id="menu-l2-1-trigger">Editor Layout</MenuItem>
        </MenuTrigger>

        <MenuPopover>
          <MenuList id="menu-l2-1">
            <MenuItem>Split Up</MenuItem>
            <MenuItem>Split Down</MenuItem>
            <MenuItem>Single</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  };

  const MenuL22Controlled = () => {
    const [open, setOpen] = React.useState(false);
    const onOpenChange: MenuProps['onOpenChange'] = (e, data) => {
      setOpen(data.open);
    };

    return (
      <Menu open={open} onOpenChange={onOpenChange}>
        <MenuTrigger disableButtonEnhancement>
          <MenuItem id="menu-l2-2-trigger">Appearance</MenuItem>
        </MenuTrigger>

        <MenuPopover>
          <MenuList id="menu-l2-2">
            <MenuItem>Centered Layout</MenuItem>
            <MenuItem>Zen</MenuItem>
            <MenuItem disabled>Zoom In</MenuItem>
            <MenuItem>Zoom Out</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  };

  const MenuL1Controlled = () => {
    const [open, setOpen] = React.useState(false);
    const onOpenChange: MenuProps['onOpenChange'] = (e, data) => {
      setOpen(data.open);
    };

    return (
      <Menu open={open} onOpenChange={onOpenChange}>
        <MenuTrigger disableButtonEnhancement>
          <MenuItem id="menu-l1-trigger">Preferences</MenuItem>
        </MenuTrigger>

        <MenuPopover>
          <MenuList id="menu-l1">
            <MenuItem>Settings</MenuItem>
            <MenuItem>Online Services Settings</MenuItem>
            <MenuItem>Extensions</MenuItem>
            <MenuL21Controlled />
            <MenuL22Controlled />
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  };

  const ControlledExample = () => {
    return (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button id={menuTriggerId}>Toggle menu</button>
        </MenuTrigger>

        <MenuPopover>
          <MenuList>
            <MenuItem>New</MenuItem>
            <MenuItem>New Window</MenuItem>
            <MenuItem disabled>Open File</MenuItem>
            <MenuItem>Open Folder</MenuItem>
            <MenuL1Controlled />
          </MenuList>
        </MenuPopover>
      </Menu>
    );
  };

  ['controlled', 'uncontrolled'].forEach(scenario => {
    const Example = scenario === 'uncontrolled' ? UncontrolledExample : ControlledExample;

    describe(scenario, () => {
      it('should open on trigger hover and focus first item', () => {
        mount(<Example />);
        cy.get(menuTriggerSelector)
          .click()
          .get(menuSelector)
          .within(() => {
            cy.get(menuItemSelector).eq(4).trigger('mousemove');
          })
          .get(menuSelector)
          .should('have.length', 2)
          .get(menuSelector)
          .eq(1)
          .within(() => {
            cy.get(menuItemSelector).first().should('be.focused');
          });
      });

      ['{rightarrow}', '{enter}', ' '].forEach(key => {
        it(`should open on trigger ${key === ' ' ? 'space' : key} and focus first item`, () => {
          mount(<Example />);
          cy.get(menuTriggerSelector)
            .click()
            .get(menuSelector)
            .within(() => {
              cy.get(menuItemSelector).eq(4).focus().type(key);
            })
            .get(menuSelector)
            .eq(1)
            .within(() => {
              cy.get(menuItemSelector).first().should('be.focused');
            })
            .get(menuSelector)
            .should('have.length', 2);
        });
      });

      it('should close on mouse enter parent menu', () => {
        mount(<Example />);
        cy.get(menuTriggerSelector).click();

        cy.get(menuSelector).within(() => {
          cy.get(menuItemSelector).eq(4).trigger('mousemove');
        });
        cy.get(menuSelector).should('have.length', 2);

        // Mouseout is necessary because internally it will set a flag
        cy.get(menuSelector)
          .eq(0)
          .within(() => {
            cy.get(menuItemSelector).eq(4).trigger('mouseout');
          });

        // move mouse over first element in nested menu
        cy.get(menuSelector)
          .eq(1)
          .within(() => {
            cy.get(menuItemSelector).eq(0).trigger('mouseover');
          });

        // move mouse back to the first element in the root menu
        cy.get(menuItemSelector).first().trigger('mouseover');
        cy.get(menuSelector).should('have.length', 1);
      });

      it('should focus first menuitem in an open submenu with right arrow from the trigger', () => {
        mount(<Example />);
        cy.get(menuTriggerSelector)
          .click()
          .get(menuSelector)
          .within(() => {
            cy.get(menuItemSelector).eq(4).click().focus().type('{rightarrow}');
          })
          .get(menuSelector)
          .eq(1)
          .within(() => {
            cy.get(menuItemSelector).first().should('be.focused');
          })
          .get(menuSelector)
          .should('have.length', 2);
      });

      ['{leftarrow}', '{esc}'].forEach(key => {
        it(`should close on ${key}`, () => {
          mount(<Example />);
          cy.get(menuTriggerSelector)
            .click()
            .get(menuSelector)
            .within(() => {
              cy.get(menuItemSelector).eq(4).focus().type('{rightarrow}').focused().type(key);
            })
            .get(menuSelector)
            .should('have.length', 1);
        });
      });

      it(`should all close when a menu item in the nested menu is clicked`, () => {
        mount(<Example />);
        cy.get(menuTriggerSelector)
          .click()
          .get(menuSelector)
          .within(() => {
            cy.get(menuItemSelector).eq(4).type('{rightarrow}');
          })
          .get(menuSelector)
          .eq(1)
          .within(() => {
            cy.get(menuItemSelector).first().click();
          })
          .get(menuSelector)
          .should('not.exist');
      });

      it('should be able to tab to next element after the root trigger', () => {
        mount(
          <>
            <Example />
            <button>After</button>
          </>,
        );

        cy.get(menuTriggerSelector)
          .click()
          .get(menuSelector)
          .within(() => {
            cy.get(menuItemSelector).eq(4).type('{rightarrow}');
          })
          .get(menuSelector)
          .eq(1)
          .realPress('Tab');

        cy.contains('After').should('be.focused').get(menuSelector).should('not.exist');
      });

      it('should move focus out of document if menu trigger is the last focusable element in DOM', () => {
        mount(<Example />);

        cy.get(menuTriggerSelector)
          .click()
          .get(menuSelector)
          .within(() => {
            cy.get(menuItemSelector).eq(4).type('{rightarrow}');
          })
          .get(menuSelector)
          .eq(1)
          .realPress('Tab');

        cy.realPress(['Shift', 'Tab']);
        cy.get(menuTriggerSelector).should('be.focused');
      });

      it('should be able to shift tab to previous element after the root trigger', () => {
        mount(
          <>
            <button>Before</button>
            <Example />
          </>,
        );

        cy.get(menuTriggerSelector)
          .click()
          .get(menuSelector)
          .within(() => {
            cy.get(menuItemSelector).eq(4).type('{rightarrow}');
          })
          .get(menuSelector)
          .eq(1)
          .realPress(['Shift', 'Tab']);
        cy.contains('Before').should('be.focused').get(menuSelector).should('not.exist');
      });

      it('respects ".hoverDelay" for opening via hover', () => {
        mount(<Example />);

        cy.get(menuTriggerSelector).click();

        cy.get('#menu-l1-trigger').realHover();
        cy.get('#menu-l1').should('be.visible');

        cy.get('#menu-l2-2-trigger').realHover();
        cy.get('#menu-l2-2').should('be.visible');

        // Quickly hover over the second item to ensure it doesn't open due to the timeout
        cy.get('#menu-l2-1-trigger').realHover();
        cy.get('#menu-l2-2-trigger').realHover();

        cy.get('#menu-l2-1').should('not.exist');
        cy.get('#menu-l2-2').should('be.visible');
      });
    });
  });
});

describe('Context menu', () => {
  const ContextMenuExample = () => (
    <Menu openOnContext>
      <MenuTrigger disableButtonEnhancement>
        <button id={menuTriggerId}>trigger</button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem>Item</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  it('should open on right click ', () => {
    mount(<ContextMenuExample />);

    cy.get(menuTriggerSelector).rightclick().get(menuSelector).should('exist');
  });

  it('should not open if event is prevented', () => {
    mount(<ContextMenuExample />);
    cy.get(menuTriggerSelector).then(([trigger]) => {
      trigger.addEventListener('contextmenu', e => e.preventDefault(), { capture: true, once: true });
    });
    cy.get(menuTriggerSelector).rightclick().get(menuSelector).should('not.exist');
  });

  it('should close when the trigger is clicked', () => {
    mount(<ContextMenuExample />);

    cy.get(menuTriggerSelector)
      .rightclick()
      .get(menuSelector)
      .should('exist')
      .get(menuTriggerSelector)
      .click()
      .get(menuSelector)
      .should('not.exist')
      .get(menuTriggerSelector)
      .should('have.focus');
  });

  it('should close on scroll outside', () => {
    mount(<ContextMenuExample />);
    cy.get(menuTriggerSelector)
      .rightclick()
      .get(menuSelector)
      .should('exist')
      .get('body')
      .trigger('wheel')
      .get(menuSelector)
      .should('not.exist')
      .get(menuTriggerSelector)
      .should('have.focus');
  });

  it('should restore focus on escape', () => {
    mount(<ContextMenuExample />);
    cy.get(menuTriggerSelector)
      .rightclick()
      .get(menuSelector)
      .should('exist')
      .focused()
      .type('{esc}')
      .should('not.exist')
      .get(menuTriggerSelector)
      .should('have.focus');
  });
});

/**
 * Cypress doesn't display the cursor position in the viewport, this component shows a red dot at the mouse position.
 */
const DebugPointer: React.FC = () => {
  const styles = useStyles();
  const pointerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (pointerRef.current) {
        pointerRef.current.style.left = `${event.x - 2}px`;
        pointerRef.current.style.top = `${event.y - 2}px`;
      }
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <Portal mountNode={{ className: styles.pointerPortal }}>
      <div
        style={{
          borderRadius: '4px',
          pointerEvents: 'none',
          background: 'red',
          height: '4px',
          width: '4px',
          position: 'fixed',
        }}
        ref={pointerRef}
      />
    </Portal>
  );
};

const MenuWithSafeZoneExample = ({ onOpenChange }: Pick<MenuProps, 'onOpenChange'>) => {
  const menuProps = { safeZone: { timeout: 1000 }, hoverDelay: 100, onOpenChange };

  return (
    <Menu {...menuProps} open>
      <MenuTrigger disableButtonEnhancement>
        <button>root trigger</button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem>item 1</MenuItem>
          <Menu {...menuProps}>
            <MenuTrigger>
              <MenuItem id="item-2">item 2</MenuItem>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem id="secondary-item-2a">secondary item 1A</MenuItem>
                <MenuItem>secondary item 1B</MenuItem>
                <MenuItem>secondary item 1C</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu {...menuProps}>
            <MenuTrigger>
              <MenuItem id="item-3">item 3</MenuItem>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem id="secondary-item-3a">secondary item 1A</MenuItem>
                <MenuItem>secondary item 1B</MenuItem>
                <MenuItem>secondary item 1C</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <MenuItem id="item-4">item 4</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

describe('safeZone', () => {
  it('safe zone prevents a submenu from being closed', () => {
    const changes = cy.stub().as('safeZoneReasons');
    mount(
      <>
        <DebugPointer />
        <MenuWithSafeZoneExample onOpenChange={(event, data) => changes(event, data)} />
      </>,
    );

    cy.get('#item-2').should('be.visible');

    cy.clock();
    cy.get('#item-2').realHover();
    cy.tick(100);
    cy.get('#secondary-item-2a').should('be.visible');
    cy.get('[data-safe-zone]').should('have.css', 'display', 'block');

    cy.get('[data-safe-zone] g').trigger('mouseover', { relatedTarget: null, force: true });
    cy.get('[data-safe-zone]').should('have.css', 'display', 'block');
    cy.get<ContractStub>('@safeZoneReasons').should(stub => {
      const enter = stub.getCalls().find(call => call.args[1].type === 'menuSafeZoneMouseEnter');
      expect(enter, 'safe-zone entry request').not.to.equal(undefined);
      expect(enter?.args[1]).to.include({ open: true, keyboard: false });
      expect(enter?.args[0]).to.equal(enter?.args[1].event);
    });

    cy.then(() => {
      cy.tick(500);
      cy.get('#secondary-item-2a').should('be.visible');
      cy.get('[data-safe-zone]').should('have.css', 'display', 'block');

      cy.tick(2000);
      cy.get('#secondary-item-2a').should('not.exist');
      cy.get('[data-safe-zone]').should('not.exist');
      cy.get<ContractStub>('@safeZoneReasons').should(stub => {
        const timeout = stub.getCalls().find(call => call.args[1].type === 'menuSafeZoneTimeout');
        expect(timeout, 'safe-zone timeout request').not.to.equal(undefined);
        expect(timeout?.args[1]).to.include({ open: false, keyboard: false });
        expect(timeout?.args[0]).to.equal(timeout?.args[1].event);
        expect(timeout?.args[0].type).to.equal('fuimenusafezonetimeout');
      });
    });
  });
});

const contractTrigger = '[data-menu-test="trigger"]';
const contractSurface = '[data-menu-test="surface"]';
const contractFirst = '[data-menu-test="first"]';

const ContractMenu = ({ menuProps = {}, children }: { menuProps?: Partial<MenuProps>; children?: React.ReactNode }) => (
  <div data-menu-test="host">
    <button data-menu-test="before">Before menu</button>
    <Menu {...menuProps}>
      <MenuTrigger disableButtonEnhancement>
        <button data-menu-test="trigger">Actions</button>
      </MenuTrigger>
      <MenuPopover data-menu-test="surface">
        <MenuList>
          {children ?? (
            <>
              <MenuItem data-menu-test="first">Alpha</MenuItem>
              <MenuItem data-menu-test="last">Zulu</MenuItem>
            </>
          )}
        </MenuList>
      </MenuPopover>
    </Menu>
    <button data-menu-test="after">After menu</button>
  </div>
);

function openContractMenu() {
  cy.get(contractSurface).should('not.exist');
  cy.get(contractTrigger).click();
  cy.get(contractSurface).should('be.visible');
}

describe('Menu documentation contracts', () => {
  it('names the action menu, portals without a wrapper, and composes action callbacks', () => {
    const action = cy.stub().as('contractAction');
    mount(
      <ContractMenu>
        <MenuItem data-menu-test="first" onClick={action}>
          Alpha
        </MenuItem>
      </ContractMenu>,
    );
    cy.get(contractTrigger).should('have.attr', 'aria-haspopup', 'menu').and('not.have.attr', 'aria-expanded');
    openContractMenu();
    cy.get(contractFirst).should('be.focused');
    cy.get('[data-menu-test="host"]').find(contractSurface).should('not.exist');
    cy.get(contractTrigger)
      .invoke('attr', 'id')
      .then(id => {
        cy.get(contractSurface).find('[role="menu"]').should('have.attr', 'aria-labelledby', id);
      });
    cy.get(contractFirst).click();
    cy.get('@contractAction').should('have.been.calledOnce');
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).should('be.focused');
  });

  it('uses defaultOpen once, then toggles uncontrolled state without resetting on rerender', () => {
    const Example = () => {
      const [initial, setInitial] = React.useState(true);
      return (
        <>
          <button onClick={() => setInitial(value => !value)}>Change default</button>
          <ContractMenu menuProps={{ defaultOpen: initial }} />
        </>
      );
    };
    mount(<Example />);
    cy.get(contractSurface).should('be.visible');
    cy.get(contractFirst).should('be.focused');
    cy.get(contractTrigger).click();
    cy.get(contractSurface).should('not.exist');
    cy.contains('Change default').click().click();
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).click();
    cy.get(contractSurface).should('be.visible');
  });

  ([false, true] as const).forEach(open => {
    it(`reports requests without changing a controlled open=${open} value`, () => {
      const changes = cy.stub().as('controlledRequests');
      mount(<ContractMenu menuProps={{ open, onOpenChange: (event, data) => changes(event, data) }} />);
      cy.get(contractTrigger).click();
      cy.get<ContractStub>('@controlledRequests')
        .should('have.been.calledOnce')
        .then(stub => {
          const [event, data] = stub.firstCall.args;
          expect(data).to.include({ open: !open, type: 'menuTriggerClick', keyboard: false });
          expect(data.event).to.equal(event);
        });
      cy.get(contractSurface).should(open ? 'be.visible' : 'not.exist');
    });
  });

  it('accepts controlled callbacks and external open/close changes with keyboard focus', () => {
    const Example = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>External open</button>
          <button onClick={() => setOpen(false)}>External close</button>
          <ContractMenu menuProps={{ open, onOpenChange: (_, data) => setOpen(data.open) }} />
        </>
      );
    };
    mount(<Example />);
    cy.contains('External open').click();
    cy.get(contractFirst).should('be.focused');
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).should('be.focused');
    cy.get(contractTrigger).focus().realPress('ArrowDown');
    cy.get(contractFirst).should('be.focused');
    cy.contains('External close').click();
    cy.get(contractSurface).should('not.exist');
    cy.contains('External close').should('be.focused');
  });

  ([false, true] as const).forEach(persistOnItemClick => {
    it(`persistOnItemClick=${persistOnItemClick} preserves action execution and controls dismissal`, () => {
      const action = cy.stub().as('persistentAction');
      mount(
        <ContractMenu menuProps={{ persistOnItemClick }}>
          <MenuItem data-menu-test="first" onClick={action}>
            Alpha
          </MenuItem>
        </ContractMenu>,
      );
      openContractMenu();
      cy.get(contractFirst).click();
      cy.get('@persistentAction').should('have.been.calledOnce');
      cy.get(contractSurface).should(persistOnItemClick ? 'be.visible' : 'not.exist');
      if (persistOnItemClick) {
        cy.realPress('Escape');
        cy.get(contractSurface).should('not.exist');
      }
    });
  });

  it('retains independent checkbox/radio groups across surface unmounting', () => {
    const changes = cy.stub().as('selectionChanges');
    mount(
      <ContractMenu
        menuProps={{
          defaultCheckedValues: { edit: ['cut'], font: ['serif'] },
          onCheckedValueChange: (_, data) => changes(data),
        }}
      >
        <MenuGroup>
          <MenuGroupHeader>Edit</MenuGroupHeader>
          <MenuItemCheckbox name="edit" value="cut">
            Cut
          </MenuItemCheckbox>
          <MenuItemCheckbox name="edit" value="paste">
            Paste
          </MenuItemCheckbox>
        </MenuGroup>
        <MenuDivider />
        <MenuGroup>
          <MenuGroupHeader>Font</MenuGroupHeader>
          <MenuItemRadio name="font" value="serif">
            Serif
          </MenuItemRadio>
          <MenuItemRadio name="font" value="sans">
            Sans
          </MenuItemRadio>
        </MenuGroup>
      </ContractMenu>,
    );
    openContractMenu();
    cy.contains('[role="menuitemcheckbox"]', 'Cut').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Paste').click().should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemradio"]', 'Sans').click();
    cy.get(contractSurface).should('not.exist');
    openContractMenu();
    cy.contains('[role="menuitemcheckbox"]', 'Cut').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Paste').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemradio"]', 'Serif').should('have.attr', 'aria-checked', 'false');
    cy.contains('[role="menuitemradio"]', 'Sans').should('have.attr', 'aria-checked', 'true');
    cy.get('@selectionChanges').should('have.been.calledWith', { name: 'edit', checkedItems: ['cut', 'paste'] });
    cy.get('@selectionChanges').should('have.been.calledWith', { name: 'font', checkedItems: ['sans'] });
  });

  ([false, true] as const).forEach(accept => {
    it(`controlled checkedValues ${accept ? 'accepts' : 'rejects'} selection hints`, () => {
      const changes = cy.stub().as('checkedHints');
      const Example = () => {
        const [checkedValues, setCheckedValues] = React.useState({ edit: ['cut'] });
        return (
          <ContractMenu
            menuProps={{
              checkedValues,
              onCheckedValueChange: (_, data) => {
                changes(data);
                if (accept) {
                  setCheckedValues({ edit: data.checkedItems });
                }
              },
            }}
          >
            <MenuItemCheckbox name="edit" value="cut">
              Cut
            </MenuItemCheckbox>
            <MenuItemCheckbox name="edit" value="paste">
              Paste
            </MenuItemCheckbox>
          </ContractMenu>
        );
      };
      mount(<Example />);
      openContractMenu();
      cy.contains('[role="menuitemcheckbox"]', 'Paste')
        .click()
        .should('have.attr', 'aria-checked', accept ? 'true' : 'false');
      cy.contains('[role="menuitemcheckbox"]', 'Cut').should('have.attr', 'aria-checked', 'true');
      cy.get('@checkedHints').should('have.been.calledOnceWith', { name: 'edit', checkedItems: ['cut', 'paste'] });
    });
  });

  it('supplies icon/checkmark alignment slots through Menu context and updates them dynamically', () => {
    const Example = () => {
      const [align, setAlign] = React.useState(false);
      return (
        <>
          <button onClick={() => setAlign(value => !value)}>Toggle alignment</button>
          <ContractMenu menuProps={{ open: true, hasIcons: align, hasCheckmarks: align }} />
        </>
      );
    };
    mount(<Example />);
    cy.get(contractFirst).find(`.${menuItemClassNames.icon}`).should('not.exist');
    cy.get(contractFirst).find(`.${menuItemClassNames.checkmark}`).should('not.exist');
    cy.contains('Toggle alignment').click();
    cy.get(contractFirst).find(`.${menuItemClassNames.icon}`).should('exist');
    cy.get(contractFirst).find(`.${menuItemClassNames.checkmark}`).should('exist');
    cy.contains('Toggle alignment').click();
    cy.get(contractFirst).find(`.${menuItemClassNames.icon}`).should('not.exist');
    cy.get(contractFirst).find(`.${menuItemClassNames.checkmark}`).should('not.exist');
  });

  ([false, true] as const).forEach(inline => {
    it(`inline=${inline} controls DOM placement without changing interaction`, () => {
      mount(<ContractMenu menuProps={{ inline }} />);
      openContractMenu();
      cy.get('[data-menu-test="host"]')
        .find(contractSurface)
        .should(inline ? 'be.visible' : 'not.exist');
      cy.get(contractFirst).should('be.focused').realPress('Enter');
      cy.get(contractSurface).should('not.exist');
      cy.get(contractTrigger).should('be.focused');
    });
  });

  it('uses a custom mountNode with inline precedence', () => {
    const Example = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      const [inline, setInline] = React.useState(false);
      return (
        <>
          <div data-menu-test="mount-node" ref={setNode} />
          <button onClick={() => setInline(value => !value)}>Toggle inline</button>
          <ContractMenu menuProps={{ mountNode: node, inline }} />
        </>
      );
    };
    mount(<Example />);
    openContractMenu();
    cy.get('[data-menu-test="mount-node"]').find(contractSurface).should('be.visible');
    cy.contains('Toggle inline').click();
    openContractMenu();
    cy.get('[data-menu-test="mount-node"]').find(contractSurface).should('not.exist');
    cy.get('[data-menu-test="host"]').find(contractSurface).should('be.visible');
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
  });

  it('anchors a triggerless controlled menu to an explicit target and dismisses outside', () => {
    const Example = () => {
      const [target, setTarget] = React.useState<HTMLButtonElement | null>(null);
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button ref={setTarget} onClick={() => setOpen(value => !value)}>
            Custom anchor
          </button>
          <Menu
            open={open}
            onOpenChange={(_, data) => setOpen(data.open)}
            positioning={{ target, position: 'below', align: 'start', offset: 12 }}
          >
            <MenuPopover data-menu-test="surface">
              <MenuList aria-label="Custom actions">
                <MenuItem data-menu-test="first">Alpha</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      );
    };
    mount(<Example />);
    cy.contains('Custom anchor').click();
    cy.get(contractFirst).should('be.focused');
    cy.contains('button', 'Custom anchor').then(anchor => {
      const rect = anchor[0].getBoundingClientRect();
      cy.get(contractSurface).should(surface => {
        const popup = surface[0].getBoundingClientRect();
        expect(popup.top).to.be.closeTo(rect.bottom + 12, 2);
        expect(popup.left).to.be.closeTo(rect.left, 2);
      });
    });
    cy.get('body').click('bottomRight');
    cy.get(contractSurface).should('not.exist');
  });

  it('constrains oversized menus to the viewport with autoSize and internal scrolling', () => {
    mount(
      <ContractMenu menuProps={{ positioning: { autoSize: true } }}>
        {Array.from({ length: 80 }, (_, index) => (
          <MenuItem key={index}>Action {index}</MenuItem>
        ))}
      </ContractMenu>,
    );
    openContractMenu();
    cy.window().then(win => {
      cy.get(contractSurface).should(surface => {
        const rect = surface[0].getBoundingClientRect();
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(win.innerHeight);
        expect(surface[0].scrollHeight).to.be.greaterThan(surface[0].clientHeight);
      });
    });
    cy.get(contractSurface).scrollTo('bottom');
    cy.contains('[role="menuitem"]', 'Action 79').should('be.visible').click();
    cy.get(contractSurface).should('not.exist');
  });

  it('disables motion without disabling focus or close/unmount behavior', () => {
    mount(<ContractMenu menuProps={{ surfaceMotion: null }} />);
    openContractMenu();
    cy.get(contractFirst).should('be.focused');
    cy.get(contractSurface).then(surface => expect(surface[0].getAnimations()).to.have.length(0));
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).should('be.focused');
  });

  it('updates memoized selectable children from Menu selection context', () => {
    const MemoItem = React.memo(() => (
      <MenuItemCheckbox name="edit" value="cut">
        Memo Cut
      </MenuItemCheckbox>
    ));
    mount(
      <ContractMenu>
        <MemoItem />
      </ContractMenu>,
    );
    openContractMenu();
    cy.contains('[role="menuitemcheckbox"]', 'Memo Cut').click().should('have.attr', 'aria-checked', 'true');
    cy.get(contractTrigger).click();
    openContractMenu();
    cy.contains('[role="menuitemcheckbox"]', 'Memo Cut')
      .should('have.attr', 'aria-checked', 'true')
      .click()
      .should('have.attr', 'aria-checked', 'false');
  });
});
describe('safeZone continued', () => {
  it('should not be able to open the menu if the safe zone is clicked', () => {
    mount(
      <>
        <DebugPointer />
        <MenuWithSafeZoneExample />
      </>,
    );

    cy.get('#item-2').should('be.visible');

    // Freezing before this native hover exposed a null-ref dispatch in MenuPopover's
    // mouseOverListenerCallbackRef. That sibling lifecycle defect remains unresolved.
    cy.get('#item-2').realHover();
    cy.get('#secondary-item-2a').should('be.visible');
    cy.get('#item-2').trigger('mousemove');
    cy.clock();
    cy.get('[data-safe-zone]').should('have.css', 'display', 'block');

    cy.then(() => {
      cy.tick(500);
      cy.get('#secondary-item-2a').should('be.visible');
      cy.get('[data-safe-zone]').should('have.css', 'display', 'block');

      cy.get('#secondary-item-2a').realHover();
      cy.get('[data-safe-zone]').should('have.css', 'display', 'none');
    });
  });

  it('another submenu could be opened once a safe zone timeouts', () => {
    mount(
      <>
        <DebugPointer />
        <MenuWithSafeZoneExample />
      </>,
    );

    cy.get('#item-2').should('be.visible');

    cy.clock();
    cy.get(`#item-2 .${menuItemClassNames.submenuIndicator}`).realHover();
    cy.tick(100);
    cy.get('#secondary-item-2a').should('be.visible');
    cy.get('[data-safe-zone]').should('have.css', 'display', 'block');

    cy.get(`#item-3 .${menuItemClassNames.submenuIndicator}`).realHover();
    cy.get('#secondary-item-2a').should('be.visible');
    cy.get('#secondary-item-3a').should('not.exist');

    cy.then(() => {
      cy.tick(2000);

      cy.get('#secondary-item-2a').should('not.exist');
      cy.get('#secondary-item-3a').should('be.visible');
    });
  });
});

const ContractSubmenu = ({ menuProps = {} }: { menuProps?: Partial<MenuProps> }) => (
  <Menu {...menuProps}>
    <MenuTrigger disableButtonEnhancement>
      <MenuItem data-menu-test="sub-trigger">More</MenuItem>
    </MenuTrigger>
    <MenuPopover data-menu-test="sub-surface">
      <MenuList>
        <MenuItem data-menu-test="child">Child action</MenuItem>
      </MenuList>
    </MenuPopover>
  </Menu>
);

describe('Menu edge and accessibility contracts', () => {
  (['ltr', 'rtl'] as const).forEach(dir => {
    ([false, true] as const).forEach(controlled => {
      it(`${dir} ${
        controlled ? 'controlled' : 'uncontrolled'
      } submenu arrows close one level and restore focus`, () => {
        const changes = cy.stub().as('nestedChanges');
        const Child = () => {
          const [open, setOpen] = React.useState(false);
          return (
            <ContractSubmenu
              menuProps={{
                inline: true,
                open: controlled ? open : undefined,
                onOpenChange: (event, data) => {
                  changes(event, data);
                  setOpen(data.open);
                },
              }}
            />
          );
        };
        mountBase(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <ContractMenu menuProps={{ inline: true }}>
              <MenuItem data-menu-test="first">Alpha</MenuItem>
              <Child />
            </ContractMenu>
          </FluentProvider>,
        );
        openContractMenu();
        cy.get('[data-menu-test="sub-trigger"]')
          .focus()
          .realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
        cy.get('[data-menu-test="child"]').should('be.focused');
        cy.get(contractSurface).find('[data-menu-test="sub-surface"]').should('not.exist');
        cy.get<ContractStub>('@nestedChanges').then(stub => {
          const [event, data] = stub.firstCall.args;
          expect(data).to.include({ open: true, keyboard: true, type: 'menuTriggerKeyDown' });
          expect(event).to.equal(data.event);
        });
        cy.realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
        cy.get('[data-menu-test="sub-surface"]').should('not.exist');
        cy.get(contractSurface).should('be.visible');
        cy.get('[data-menu-test="sub-trigger"]').should('be.focused');
        cy.realPress('Escape');
        cy.get(contractSurface).should('not.exist');
        cy.get(contractTrigger).should('be.focused');
      });
    });
  });

  (['Tab', 'Shift+Tab'] as const).forEach(key => {
    it(`${key} from a submenu dismisses the stack and continues page tab order`, () => {
      mount(
        <ContractMenu>
          <ContractSubmenu />
        </ContractMenu>,
      );
      openContractMenu();
      cy.get('[data-menu-test="sub-trigger"]').focus().realPress('ArrowRight');
      cy.get('[data-menu-test="child"]').should('be.focused');
      cy.realPress(key === 'Tab' ? 'Tab' : ['Shift', 'Tab']);
      cy.get(contractSurface).should('not.exist');
      cy.get('[data-menu-test="sub-surface"]').should('not.exist');
      cy.get(`[data-menu-test="${key === 'Tab' ? 'after' : 'before'}"]`).should('be.focused');
    });
  });

  it('bubbles nested item dismissal with the original event and data to the root', () => {
    const rootChanges = cy.stub().as('rootChanges');
    const childChanges = cy.stub().as('childChanges');
    mount(
      <ContractMenu menuProps={{ onOpenChange: (event, data) => rootChanges(event, data) }}>
        <ContractSubmenu menuProps={{ onOpenChange: (event, data) => childChanges(event, data) }} />
      </ContractMenu>,
    );
    openContractMenu();
    cy.get('[data-menu-test="sub-trigger"]').focus().realPress('ArrowRight');
    cy.get('[data-menu-test="child"]').click();
    cy.get(contractSurface).should('not.exist');
    cy.get('[data-menu-test="sub-surface"]').should('not.exist');
    cy.get<ContractStub>('@childChanges').then(childStub => {
      const [event, data] = childStub.lastCall.args;
      expect(data).to.include({ open: false, bubble: true, keyboard: false, type: 'menuItemClick' });
      expect(data.event).to.equal(event);
      cy.get<ContractStub>('@rootChanges').then(rootStub => {
        expect(rootStub.lastCall.args[0]).to.equal(event);
        expect(rootStub.lastCall.args[1]).to.deep.equal(data);
      });
    });
    cy.get(contractTrigger).should('be.focused');
  });

  it('submenu persistence prevents bubbling item dismissal but not Escape', () => {
    const changes = cy.stub().as('persistentRoot');
    mount(
      <ContractMenu menuProps={{ onOpenChange: (_, data) => changes(data.type, data.open) }}>
        <ContractSubmenu menuProps={{ persistOnItemClick: true }} />
      </ContractMenu>,
    );
    openContractMenu();
    cy.get('[data-menu-test="sub-trigger"]').focus().realPress('ArrowRight');
    cy.get('[data-menu-test="child"]').click();
    cy.get('[data-menu-test="sub-surface"]').should('be.visible');
    cy.get(contractSurface).should('be.visible');
    cy.get('@persistentRoot').should('not.have.been.calledWith', 'menuItemClick', false);
    cy.realPress('Escape');
    cy.get('[data-menu-test="sub-surface"]').should('not.exist');
    cy.get(contractSurface).should('be.visible');
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
  });

  it('supports circular arrows, Home/End and typeahead without focusing group labels', () => {
    mount(
      <ContractMenu>
        <MenuGroup>
          <MenuGroupHeader>Actions group</MenuGroupHeader>
          <MenuItem data-menu-test="first">Alpha</MenuItem>
          <MenuItem data-menu-test="disabled" disabled>
            Bravo
          </MenuItem>
          <MenuItem data-menu-test="beta">Beta</MenuItem>
          <MenuItem data-menu-test="last">Zulu</MenuItem>
        </MenuGroup>
      </ContractMenu>,
    );
    openContractMenu();
    cy.get(contractFirst).should('be.focused');
    cy.realPress('ArrowUp');
    cy.get('[data-menu-test="last"]').should('be.focused');
    cy.realPress('ArrowDown');
    cy.get(contractFirst).should('be.focused');
    cy.realPress('End');
    cy.get('[data-menu-test="last"]').should('be.focused');
    cy.realPress('Home');
    cy.get(contractFirst).should('be.focused');
    cy.realPress('b');
    cy.get('[data-menu-test="disabled"]').should('be.focused').and('have.attr', 'aria-disabled', 'true');
    cy.realPress('Enter');
    cy.get(contractSurface).should('be.visible');
    cy.realPress('b');
    cy.get('[data-menu-test="beta"]').should('be.focused');
    cy.realPress('Enter');
    cy.get(contractSurface).should('not.exist');
  });

  it('does not steal outside focus during dismissal or unrelated closed rerenders', () => {
    const Example = () => {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <ContractMenu />
          <input aria-label="Outside editor" />
          <button onClick={() => setCount(value => value + 1)}>Rerender {count}</button>
        </>
      );
    };
    mount(<Example />);
    cy.get('input').focus();
    cy.get(contractTrigger).should('not.be.focused');
    openContractMenu();
    cy.get('input').realClick().should('be.focused');
    cy.get(contractSurface).should('not.exist');
    cy.contains('Rerender 0').click();
    cy.contains('Rerender 1').should('be.focused');
    cy.get(contractTrigger).should('not.be.focused');
  });

  it('honors descendant Escape prevention and an unprevented positive control', () => {
    mount(
      <ContractMenu>
        <MenuItem
          data-menu-test="first"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
            }
          }}
        >
          Protected
        </MenuItem>
        <MenuItem data-menu-test="last">Unprotected</MenuItem>
      </ContractMenu>,
    );
    openContractMenu();
    cy.get(contractFirst).focus().realPress('Escape');
    cy.get(contractSurface).should('be.visible');
    cy.get('[data-menu-test="last"]').focus().realPress('Escape');
    cy.get(contractSurface).should('not.exist');
  });

  it('context-only mode suppresses click/keyboard opening and reports pointer placement', () => {
    const changes = cy.stub().as('contextChanges');
    mount(<ContractMenu menuProps={{ openOnContext: true, onOpenChange: (event, data) => changes(event, data) }} />);
    cy.get(contractTrigger).click().focus().realPress('ArrowDown');
    cy.realPress('Enter');
    cy.realPress('Space');
    cy.get(contractSurface).should('not.exist');
    cy.get('@contextChanges').should('not.have.been.called');
    cy.get(contractTrigger).then(trigger => {
      const rect = trigger[0].getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      cy.get(contractTrigger).rightclick();
      cy.get(contractFirst).should('be.focused');
      cy.get(contractSurface).should(surface => {
        const popup = surface[0].getBoundingClientRect();
        expect(popup.left).to.be.closeTo(x, 2);
        expect(popup.top).to.be.closeTo(y, 2);
      });
    });
    cy.get<ContractStub>('@contextChanges').then(stub => {
      const [event, data] = stub.firstCall.args;
      expect(data).to.include({ open: true, type: 'menuTriggerContextMenu', keyboard: false });
      expect(data.event).to.equal(event);
      expect(event.defaultPrevented).to.equal(true);
    });
    cy.get('body').trigger('wheel');
    cy.get(contractSurface).should('not.exist');
    cy.get<ContractStub>('@contextChanges').then(stub => {
      expect(stub.lastCall.args[1]).to.include({ open: false, type: 'scrollOutside' });
      expect(stub.lastCall.args[0]).to.equal(stub.lastCall.args[1].event);
    });
  });

  it('prevents context opening when a consumer cancels it, then opens after cancellation is removed', () => {
    const Example = () => {
      const [prevent, setPrevent] = React.useState(true);
      return (
        <>
          <button onClick={() => setPrevent(false)}>Allow context</button>
          <Menu openOnContext>
            <MenuTrigger disableButtonEnhancement>
              <button
                data-menu-test="trigger"
                onContextMenu={event => {
                  if (prevent) {
                    event.preventDefault();
                  }
                }}
              >
                Context actions
              </button>
            </MenuTrigger>
            <MenuPopover data-menu-test="surface">
              <MenuList>
                <MenuItem>Alpha</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      );
    };
    mount(<Example />);
    cy.get(contractTrigger).rightclick();
    cy.get(contractSurface).should('not.exist');
    cy.contains('Allow context').click();
    cy.get(contractTrigger).rightclick();
    cy.get(contractSurface).should('be.visible');
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
  });

  ([false, true] as const).forEach(closeOnScroll => {
    it(`closeOnScroll=${closeOnScroll} distinguishes internal wheel events from outside scrolling`, () => {
      const changes = cy.stub().as('wheelChanges');
      mount(<ContractMenu menuProps={{ closeOnScroll, onOpenChange: (event, data) => changes(event, data) }} />);
      openContractMenu();
      cy.get(contractSurface).trigger('wheel');
      cy.get(contractTrigger).trigger('wheel');
      cy.get(contractSurface).should('be.visible');
      cy.get('body').trigger('wheel');
      cy.get(contractSurface).should(closeOnScroll ? 'not.exist' : 'be.visible');
      if (closeOnScroll) {
        cy.get<ContractStub>('@wheelChanges').then(stub => {
          expect(stub.lastCall.args[1]).to.include({ open: false, type: 'scrollOutside' });
          expect(stub.lastCall.args[1].event).to.equal(stub.lastCall.args[0]);
        });
      } else {
        cy.realPress('Escape');
        cy.get(contractSurface).should('not.exist');
      }
    });
  });

  it('reports clickOutside only for outside interactions and retains the original native event', () => {
    const changes = cy.stub().as('outsideChanges');
    mount(
      <ContractMenu menuProps={{ onOpenChange: (event, data) => changes(event, data) }}>
        <MenuGroup>
          <MenuGroupHeader>Non-action header</MenuGroupHeader>
          <MenuItem>Alpha</MenuItem>
        </MenuGroup>
      </ContractMenu>,
    );
    openContractMenu();
    cy.contains('Non-action header').click();
    cy.get(contractSurface).should('be.visible');
    cy.get('@outsideChanges').should('have.been.calledOnce');
    cy.get('[data-menu-test="after"]').realClick();
    cy.get(contractSurface).should('not.exist');
    cy.get('[data-menu-test="after"]').should('be.focused');
    cy.get<ContractStub>('@outsideChanges').then(stub => {
      expect(stub.lastCall.args[1]).to.include({ open: false, type: 'clickOutside' });
      expect(stub.lastCall.args[1].event).to.equal(stub.lastCall.args[0]);
    });
  });

  it('does not open on stationary mouseover and observes exact hoverDelay with cancellation', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    const changes = cy.stub().as('hoverChanges');
    mount(
      <ContractMenu
        menuProps={{ openOnHover: true, hoverDelay: 200, onOpenChange: (event, data) => changes(event, data) }}
      />,
    );
    cy.get(contractTrigger).trigger('mouseover');
    cy.tick(200);
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).trigger('mousemove');
    cy.tick(199);
    cy.get(contractSurface).should('not.exist');
    cy.tick(1);
    cy.get(contractSurface).should('be.visible');
    cy.get<ContractStub>('@hoverChanges').then(stub => {
      expect(stub.lastCall.args[1]).to.include({ open: true, keyboard: false, type: 'menuTriggerMouseMove' });
      expect(stub.lastCall.args[1].event).to.equal(stub.lastCall.args[0]);
    });
    cy.get(contractTrigger).trigger('mouseout', { relatedTarget: null });
    cy.tick(199);
    cy.get(contractSurface).should('be.visible');
    cy.get(contractTrigger).trigger('mouseover');
    cy.tick(200);
    cy.get(contractSurface).should('be.visible');
    cy.get<ContractStub>('@hoverChanges').then(stub =>
      expect(stub.lastCall.args[1].type).to.equal('menuTriggerMouseEnter'),
    );
    cy.get(contractTrigger).trigger('mouseout', { relatedTarget: null });
    cy.tick(200);
    cy.get(contractSurface).should('not.exist');
    cy.get<ContractStub>('@hoverChanges').then(stub =>
      expect(stub.lastCall.args[1]).to.include({
        open: false,
        keyboard: false,
        type: 'menuTriggerMouseLeave',
      }),
    );
  });

  it('cancels a pending hover open when leaving before the delay and allows a later entry', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    mount(<ContractMenu menuProps={{ openOnHover: true, hoverDelay: 200 }} />);
    cy.get(contractTrigger).trigger('mousemove');
    cy.tick(100);
    cy.get(contractTrigger).trigger('mouseout', { relatedTarget: null });
    cy.tick(200);
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).trigger('mouseover');
    cy.tick(200);
    cy.get(contractSurface).should('be.visible');
    cy.get(contractFirst).should('be.focused');
  });

  it('root hover is disabled by default but submenu hover is enabled by default', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    mount(
      <ContractMenu>
        <ContractSubmenu menuProps={{ hoverDelay: 1 }} />
      </ContractMenu>,
    );
    cy.get(contractTrigger).trigger('mousemove').trigger('mouseover');
    cy.get(contractSurface).should('not.exist');
    openContractMenu();
    cy.get('[data-menu-test="sub-trigger"]').realHover();
    cy.get('[data-menu-test="child"]').should('be.focused');
    cy.get('[data-menu-test="sub-surface"]').should('be.visible');
    cy.realPress('Escape');
    cy.get('[data-menu-test="sub-surface"]').should('not.exist');
  });

  it('explicit openOnHover=false disables submenu hover but not keyboard opening', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    mount(
      <ContractMenu>
        <ContractSubmenu menuProps={{ openOnHover: false, hoverDelay: 1 }} />
      </ContractMenu>,
    );
    openContractMenu();
    cy.get('[data-menu-test="sub-trigger"]').realHover();
    cy.get('[data-menu-test="sub-surface"]').should('not.exist');
    cy.get('[data-menu-test="sub-trigger"]').focus().realPress('ArrowRight');
    cy.get('[data-menu-test="child"]').should('be.focused');
  });

  it('a disabled trigger rejects pointer, context and keyboard opening until enabled', () => {
    const Example = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <button onClick={() => setDisabled(false)}>Enable trigger</button>
          <Menu openOnHover hoverDelay={1}>
            <MenuTrigger disableButtonEnhancement>
              <button data-menu-test="trigger" aria-disabled={disabled}>
                Actions
              </button>
            </MenuTrigger>
            <MenuPopover data-menu-test="surface">
              <MenuList>
                <MenuItem>Alpha</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      );
    };
    mount(<Example />);
    cy.get(contractTrigger).click().trigger('mousemove').rightclick().focus().realPress('ArrowDown');
    cy.get(contractSurface).should('not.exist');
    cy.contains('Enable trigger').click();
    cy.get(contractTrigger).focus().realPress('ArrowDown');
    cy.get(contractSurface).should('be.visible');
  });
});

describe('Menu unit-derived and composition contracts', () => {
  it('keeps generated trigger ids stable across rerenders and distinct across instances', () => {
    const Example = () => {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <button onClick={() => setCount(value => value + 1)}>Update {count}</button>
          <ContractMenu />
          <ContractMenu />
        </>
      );
    };
    mount(<Example />);
    cy.get(contractTrigger).then(triggers => {
      const ids = Array.from(triggers, trigger => trigger.id);
      expect(ids[0]).not.to.equal('');
      expect(ids[1]).not.to.equal(ids[0]);
      cy.contains('Update 0').click();
      cy.get(contractTrigger).should(updated => {
        expect(Array.from(updated, trigger => trigger.id)).to.deep.equal(ids);
      });
      cy.get(contractTrigger).eq(1).click();
      cy.get(contractSurface).find('[role="menu"]').should('have.attr', 'aria-labelledby', ids[1]);
      cy.realPress('Escape');
      cy.get(contractTrigger).eq(1).should('be.focused');
    });
  });

  it('mounts content only when opened, unmounts on close, and resets local child state on reopen', () => {
    const mounted = cy.stub().as('contentMounted');
    const unmounted = cy.stub().as('contentUnmounted');
    const StatefulItem = () => {
      const [count, setCount] = React.useState(0);
      React.useEffect(() => {
        mounted();
        return () => {
          unmounted();
        };
      }, []);
      return (
        <MenuItem persistOnClick onClick={() => setCount(value => value + 1)}>
          Local count {count}
        </MenuItem>
      );
    };
    mount(
      <ContractMenu>
        <StatefulItem />
      </ContractMenu>,
    );
    cy.get('@contentMounted').should('not.have.been.called');
    openContractMenu();
    // The shared mount helper enables StrictMode's setup/cleanup/setup effect probe.
    cy.get('@contentMounted').should('have.been.calledTwice');
    cy.get('@contentUnmounted').should('have.been.calledOnce');
    cy.contains('Local count 0').click();
    cy.contains('Local count 1').should('be.visible');
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
    cy.get('@contentUnmounted').should('have.been.calledTwice');
    openContractMenu();
    cy.contains('Local count 0').should('be.visible');
    cy.get<ContractStub>('@contentMounted').its('callCount').should('equal', 4);
  });

  it('keeps initial defaultCheckedValues despite prop changes and preserves untouched groups', () => {
    const Example = () => {
      const [defaults, setDefaults] = React.useState({ edit: ['cut'], other: ['keep'] });
      return (
        <>
          <button onClick={() => setDefaults({ edit: ['paste'], other: ['keep'] })}>Replace defaults</button>
          <ContractMenu menuProps={{ defaultCheckedValues: defaults }}>
            <MenuItemCheckbox name="edit" value="cut">
              Cut
            </MenuItemCheckbox>
            <MenuItemCheckbox name="edit" value="paste">
              Paste
            </MenuItemCheckbox>
            <MenuItemCheckbox name="other" value="keep">
              Keep
            </MenuItemCheckbox>
          </ContractMenu>
        </>
      );
    };
    mount(<Example />);
    cy.contains('Replace defaults').click();
    openContractMenu();
    cy.contains('[role="menuitemcheckbox"]', 'Cut')
      .should('have.attr', 'aria-checked', 'true')
      .click()
      .should('have.attr', 'aria-checked', 'false');
    cy.contains('[role="menuitemcheckbox"]', 'Paste')
      .should('have.attr', 'aria-checked', 'false')
      .click()
      .should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Keep').should('have.attr', 'aria-checked', 'true');
    cy.realPress('Escape');
    openContractMenu();
    cy.contains('[role="menuitemcheckbox"]', 'Cut').should('have.attr', 'aria-checked', 'false');
    cy.contains('[role="menuitemcheckbox"]', 'Keep').should('have.attr', 'aria-checked', 'true');
  });

  it('updates controlled checkedValues from external state without emitting change requests', () => {
    const changes = cy.stub().as('externalSelection');
    const Example = () => {
      const [values, setValues] = React.useState({ font: ['serif'] });
      return (
        <>
          <button onClick={() => setValues({ font: ['sans'] })}>External selection</button>
          <ContractMenu menuProps={{ open: true, checkedValues: values, onCheckedValueChange: changes }}>
            <MenuItemRadio name="font" value="serif">
              Serif
            </MenuItemRadio>
            <MenuItemRadio name="font" value="sans">
              Sans
            </MenuItemRadio>
          </ContractMenu>
        </>
      );
    };
    mount(<Example />);
    cy.contains('[role="menuitemradio"]', 'Serif').should('have.attr', 'aria-checked', 'true');
    cy.contains('External selection').click();
    cy.contains('[role="menuitemradio"]', 'Serif').should('have.attr', 'aria-checked', 'false');
    cy.contains('[role="menuitemradio"]', 'Sans').should('have.attr', 'aria-checked', 'true');
    cy.get('@externalSelection').should('not.have.been.called');
    cy.contains('[role="menuitemradio"]', 'Serif').click();
    cy.get('@externalSelection').should('have.been.calledOnce');
    cy.contains('[role="menuitemradio"]', 'Sans').should('have.attr', 'aria-checked', 'true');
  });

  it('MenuList explicit selection and handlers override Menu selection context', () => {
    const parentChanges = cy.stub().as('parentSelection');
    const listChanges = cy.stub().as('listSelection');
    mount(
      <Menu defaultOpen checkedValues={{ edit: ['cut'] }} onCheckedValueChange={parentChanges}>
        <MenuTrigger disableButtonEnhancement>
          <button data-menu-test="trigger">Actions</button>
        </MenuTrigger>
        <MenuPopover data-menu-test="surface">
          <MenuList checkedValues={{ edit: ['paste'] }} onCheckedValueChange={listChanges}>
            <MenuItemCheckbox name="edit" value="cut">
              Cut
            </MenuItemCheckbox>
            <MenuItemCheckbox name="edit" value="paste">
              Paste
            </MenuItemCheckbox>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.contains('[role="menuitemcheckbox"]', 'Cut').should('have.attr', 'aria-checked', 'false').click();
    cy.get<ContractStub>('@listSelection')
      .should('have.been.calledOnce')
      .then(stub => {
        expect(stub.firstCall.args[1]).to.deep.equal({ name: 'edit', checkedItems: ['paste', 'cut'] });
      });
    cy.get('@parentSelection').should('not.have.been.called');
    cy.contains('[role="menuitemcheckbox"]', 'Cut').should('have.attr', 'aria-checked', 'false');
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
  });

  it('isolates selection context between root and nested menus using the same group name', () => {
    mount(
      <ContractMenu menuProps={{ defaultCheckedValues: { edit: ['cut'] } }}>
        <MenuItemCheckbox name="edit" value="cut">
          Root Cut
        </MenuItemCheckbox>
        <Menu defaultCheckedValues={{ edit: ['paste'] }}>
          <MenuTrigger disableButtonEnhancement>
            <MenuItem data-menu-test="sub-trigger">More</MenuItem>
          </MenuTrigger>
          <MenuPopover data-menu-test="sub-surface">
            <MenuList>
              <MenuItemCheckbox name="edit" value="cut">
                Child Cut
              </MenuItemCheckbox>
              <MenuItemCheckbox name="edit" value="paste">
                Child Paste
              </MenuItemCheckbox>
            </MenuList>
          </MenuPopover>
        </Menu>
      </ContractMenu>,
    );
    openContractMenu();
    cy.get('[data-menu-test="sub-trigger"]').focus().realPress('ArrowRight');
    cy.contains('[role="menuitemcheckbox"]', 'Child Cut')
      .should('have.attr', 'aria-checked', 'false')
      .click()
      .should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Child Paste').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Root Cut').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Child Cut').click().should('have.attr', 'aria-checked', 'false');
    cy.contains('[role="menuitemcheckbox"]', 'Root Cut').should('have.attr', 'aria-checked', 'true');
  });

  it('uses the latest callbacks and hoverDelay after rerender without resetting open state', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    const oldChanges = cy.stub().as('oldCallback');
    const newChanges = cy.stub().as('newCallback');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update handlers</button>
          <ContractMenu
            menuProps={{
              openOnHover: true,
              hoverDelay: updated ? 100 : 500,
              onOpenChange: updated ? newChanges : oldChanges,
            }}
          />
        </>
      );
    };
    mount(<Example />);
    cy.contains('Update handlers').click();
    cy.get(contractTrigger).trigger('mousemove');
    cy.tick(99);
    cy.get(contractSurface).should('not.exist');
    cy.tick(1);
    cy.get(contractSurface).should('be.visible');
    cy.get('@oldCallback').should('not.have.been.called');
    cy.get('@newCallback').should('have.been.calledOnce');
  });

  it('uses the default 500ms hover delay and immediate click cancels an armed hover request', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    const changes = cy.stub().as('delayedRequests');
    mount(<ContractMenu menuProps={{ openOnHover: true, onOpenChange: (_, data) => changes(data.type, data.open) }} />);
    cy.get(contractTrigger).trigger('mousemove');
    cy.tick(499);
    cy.get(contractSurface).should('not.exist');
    cy.tick(1);
    cy.get(contractSurface).should('be.visible');
    cy.get(contractTrigger).trigger('mouseout', { relatedTarget: null });
    cy.tick(100);
    cy.get(contractTrigger).click();
    cy.get(contractSurface).should('not.exist');
    cy.tick(500);
    cy.get('@delayedRequests').should('have.been.calledTwice');
    cy.get('@delayedRequests').should('not.have.been.calledWith', 'menuTriggerMouseLeave', false);
  });

  it('cancels a pending hover timer on Menu unmount without contaminating a remounted instance', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    const changes = cy.stub().as('unmountRequests');
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(value => !value)}>Toggle instance</button>
          {visible && <ContractMenu menuProps={{ openOnHover: true, hoverDelay: 200, onOpenChange: changes }} />}
        </>
      );
    };
    mount(<Example />);
    cy.get(contractTrigger).trigger('mousemove');
    cy.tick(100);
    cy.contains('Toggle instance').click();
    cy.get(contractTrigger).should('not.exist');
    cy.tick(200);
    cy.get('@unmountRequests').should('not.have.been.called');
    cy.contains('Toggle instance').click();
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).trigger('mousemove');
    cy.tick(199);
    cy.get(contractSurface).should('not.exist');
    cy.tick(1);
    cy.get(contractSurface).should('be.visible');
    cy.get('@unmountRequests').should('have.been.calledOnce');
  });

  it('root trigger Escape and surface Escape report distinct reasons with original keyboard events', () => {
    const changes = cy.stub().as('keyReasons');
    mount(<ContractMenu menuProps={{ onOpenChange: (event, data) => changes(event, data) }} />);
    cy.get(contractTrigger).focus().realPress('ArrowDown');
    cy.get(contractFirst).should('be.focused');
    cy.get<ContractStub>('@keyReasons').then(stub => {
      expect(stub.lastCall.args[1]).to.include({ open: true, keyboard: true, type: 'menuTriggerKeyDown' });
      expect(stub.lastCall.args[0]).to.equal(stub.lastCall.args[1].event);
    });
    cy.get(contractTrigger).focus().realPress('Escape');
    cy.get(contractSurface).should('not.exist');
    cy.get<ContractStub>('@keyReasons').then(stub =>
      expect(stub.lastCall.args[1]).to.include({
        open: false,
        keyboard: true,
        type: 'menuTriggerKeyDown',
      }),
    );
    openContractMenu();
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
    cy.get<ContractStub>('@keyReasons').then(stub => {
      expect(stub.lastCall.args[1]).to.include({ open: false, keyboard: true, type: 'menuPopoverKeyDown' });
      expect(stub.lastCall.args[0]).to.equal(stub.lastCall.args[1].event);
    });
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`reports keyboard item activation via ${key} with bubble=true and closes`, () => {
      const changes = cy.stub().as('keyboardItem');
      mount(<ContractMenu menuProps={{ onOpenChange: (event, data) => changes(event, data) }} />);
      openContractMenu();
      cy.get(contractFirst).should('be.focused').realPress(key);
      cy.get(contractSurface).should('not.exist');
      cy.get<ContractStub>('@keyboardItem').then(stub => {
        expect(stub.lastCall.args[1]).to.include({
          open: false,
          keyboard: true,
          bubble: true,
          type: 'menuItemClick',
        });
        expect(stub.lastCall.args[0]).to.equal(stub.lastCall.args[1].event);
      });
    });
  });

  it('render-function triggers route interactions to the inner trigger, not the wrapper sibling', () => {
    mount(
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          {props => (
            <div>
              <button data-menu-test="inert">Other action</button>
              <button {...props} data-menu-test="trigger">
                Actions
              </button>
            </div>
          )}
        </MenuTrigger>
        <MenuPopover data-menu-test="surface">
          <MenuList>
            <MenuItem data-menu-test="first">Alpha</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get('[data-menu-test="inert"]').click();
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).focus().realPress('ArrowDown');
    cy.get(contractFirst).should('be.focused');
    cy.realPress('Escape');
    cy.get(contractTrigger).should('be.focused');
    cy.get('[data-menu-test="inert"]').should('not.have.attr', 'aria-haspopup');
  });

  it('a Tooltip-wrapped trigger retains Menu state, naming and keyboard restoration', () => {
    mount(
      <Menu>
        <Tooltip content="Action help" relationship="description">
          <MenuTrigger disableButtonEnhancement>
            <button data-menu-test="trigger">Actions</button>
          </MenuTrigger>
        </Tooltip>
        <MenuPopover data-menu-test="surface">
          <MenuList>
            <MenuItem data-menu-test="first">Alpha</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(contractTrigger).focus();
    cy.contains('[role="tooltip"]', 'Action help').should('be.visible');
    cy.realPress('ArrowDown');
    cy.get(contractFirst).should('be.focused');
    cy.get(contractSurface)
      .find('[role="menu"]')
      .invoke('attr', 'aria-labelledby')
      .then(id => {
        cy.get(contractTrigger).should('have.attr', 'id', id);
      });
    cy.realPress('Escape');
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).should('be.focused');
  });

  it('groups name selectable actions and switch selection persists in Menu state', () => {
    mount(
      <ContractMenu>
        <MenuGroup>
          <MenuGroupHeader data-menu-test="group-label">Options</MenuGroupHeader>
          <MenuItemSwitch name="options" value="preview">
            Preview
          </MenuItemSwitch>
        </MenuGroup>
        <MenuDivider data-menu-test="divider" />
      </ContractMenu>,
    );
    openContractMenu();
    cy.get('[data-menu-test="group-label"]')
      .invoke('attr', 'id')
      .then(id => {
        cy.get(contractSurface).find('[role="group"]').should('have.attr', 'aria-labelledby', id);
      });
    cy.get(contractSurface)
      .find('[data-menu-test="divider"]')
      .should('have.attr', 'role', 'presentation')
      .and('have.attr', 'aria-hidden', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Preview').click().should('have.attr', 'aria-checked', 'true');
    cy.get(contractSurface).should('be.visible');
    cy.realPress('Escape');
    openContractMenu();
    cy.contains('[role="menuitemcheckbox"]', 'Preview').should('have.attr', 'aria-checked', 'true');
  });

  it('a link action retains navigation semantics and delegates dismissal to Menu', () => {
    const action = cy.stub().as('linkAction');
    mount(
      <ContractMenu>
        <MenuItemLink
          href="#menu-destination"
          onClick={event => {
            event.preventDefault();
            action();
          }}
        >
          Destination
        </MenuItemLink>
      </ContractMenu>,
    );
    openContractMenu();
    cy.contains('a[role="menuitem"]', 'Destination').should('have.attr', 'href', '#menu-destination').click();
    cy.get('@linkAction').should('have.been.calledOnce');
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).should('be.focused');
  });

  ([false, true] as const).forEach(persistOnItemClick => {
    it(`item persistOnClick overrides Menu persistOnItemClick=${persistOnItemClick}`, () => {
      mount(
        <ContractMenu menuProps={{ persistOnItemClick }}>
          <MenuItem persistOnClick>Keep open</MenuItem>
          <MenuItem persistOnClick={false}>Dismiss explicitly</MenuItem>
        </ContractMenu>,
      );
      openContractMenu();
      cy.contains('Keep open').click();
      cy.get(contractSurface).should('be.visible');
      cy.contains('Dismiss explicitly').click();
      cy.get(contractSurface).should('not.exist');
    });
  });

  it('updates Menu persistence context while open without resetting the popup', () => {
    const action = cy.stub().as('dynamicAction');
    const Example = () => {
      const [persist, setPersist] = React.useState(false);
      return (
        <ContractMenu menuProps={{ persistOnItemClick: persist }}>
          <MenuItem persistOnClick onClick={() => setPersist(value => !value)}>
            Toggle persistence
          </MenuItem>
          <MenuItem onClick={action}>Dynamic action</MenuItem>
        </ContractMenu>
      );
    };
    mount(<Example />);
    openContractMenu();
    cy.contains('Toggle persistence').click();
    cy.contains('Dynamic action').click();
    cy.get(contractSurface).should('be.visible');
    cy.get('@dynamicAction').should('have.been.calledOnce');
    cy.contains('Toggle persistence').click();
    cy.contains('Dynamic action').click();
    cy.get(contractSurface).should('not.exist');
    cy.get('@dynamicAction').should('have.been.calledTwice');
  });

  it('positioning shorthand and default submenu after/top placement produce observable geometry', () => {
    mount(
      <div style={{ padding: tokens.spacingVerticalXXXL }}>
        <ContractMenu menuProps={{ positioning: 'below-end' }}>
          <ContractSubmenu />
        </ContractMenu>
      </div>,
    );
    openContractMenu();
    cy.get(contractTrigger).then(trigger => {
      const anchor = trigger[0].getBoundingClientRect();
      cy.get(contractSurface).should(surface => {
        const rect = surface[0].getBoundingClientRect();
        expect(rect.top).to.be.closeTo(anchor.bottom, 2);
        expect(rect.right).to.be.closeTo(anchor.right, 2);
      });
    });
    cy.get('[data-menu-test="sub-trigger"]')
      .focus()
      .realPress('ArrowRight')
      .then(() => {
        cy.get('[data-menu-test="sub-trigger"]').then(trigger => {
          const anchor = trigger[0].getBoundingClientRect();
          cy.get('[data-menu-test="sub-surface"]').should(surface => {
            const rect = surface[0].getBoundingClientRect();
            expect(rect.left).to.be.at.least(anchor.right);
            expect(rect.top).to.be.closeTo(anchor.top, 2);
          });
        });
      });
    cy.realPress('Escape');
    cy.get(contractSurface).should('be.visible');
  });

  it('positioning imperative target changes reuse a triggerless Menu at different anchors', () => {
    const positions = cy.stub().as('positionEnd');
    const Example = () => {
      const positioningRef = React.useRef<PositioningImperativeRef>(null);
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button
            onClick={event => {
              positioningRef.current?.setTarget(event.currentTarget);
              setOpen(true);
            }}
          >
            Anchor one
          </button>
          <button
            onClick={event => {
              positioningRef.current?.setTarget(event.currentTarget);
              setOpen(true);
            }}
          >
            Anchor two
          </button>
          <Menu
            open={open}
            onOpenChange={(_, data) => setOpen(data.open)}
            positioning={{ positioningRef, onPositioningEnd: positions }}
          >
            <MenuPopover data-menu-test="surface">
              <MenuList aria-label="Custom actions">
                <MenuItem data-menu-test="first">Alpha</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </>
      );
    };
    mount(<Example />);
    ['Anchor one', 'Anchor two'].forEach(label => {
      cy.contains(label).click();
      cy.get(contractFirst).should('be.focused');
      cy.contains('button', label).then(anchor => {
        const rect = anchor[0].getBoundingClientRect();
        cy.get(contractSurface).should(surface => {
          expect(surface[0].getBoundingClientRect().left).to.be.closeTo(rect.left, 2);
          expect(surface[0].getBoundingClientRect().top).to.be.closeTo(rect.bottom, 2);
        });
      });
      cy.realPress('Escape');
      cy.get(contractSurface).should('not.exist');
    });
    cy.get('@positionEnd').should('have.been.called');
  });

  it('submenu positioning flips inside a constrained boundary instead of overflowing it', () => {
    const Example = () => {
      const [boundary, setBoundary] = React.useState<HTMLDivElement | null>(null);
      return (
        <div ref={setBoundary} data-menu-test="boundary" style={{ width: 380, height: 300, position: 'relative' }}>
          <Menu positioning={{ target: boundary, position: 'below', align: 'end', coverTarget: true, pinned: true }}>
            <MenuTrigger disableButtonEnhancement>
              <button data-menu-test="trigger">Actions</button>
            </MenuTrigger>
            <MenuPopover data-menu-test="surface">
              <MenuList>
                <ContractSubmenu menuProps={{ positioning: { flipBoundary: boundary, overflowBoundary: boundary } }} />
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      );
    };
    mount(<Example />);
    openContractMenu();
    cy.get('[data-menu-test="sub-trigger"]').focus().realPress('ArrowRight');
    cy.get('[data-menu-test="child"]').should('be.focused');
    cy.get('[data-menu-test="boundary"]').then(boundary => {
      const bounds = boundary[0].getBoundingClientRect();
      cy.get('[data-menu-test="sub-trigger"]').then(trigger => {
        const anchor = trigger[0].getBoundingClientRect();
        cy.get('[data-menu-test="sub-surface"]').should(surface => {
          const rect = surface[0].getBoundingClientRect();
          expect(rect.right).to.be.at.most(anchor.left);
          expect(rect.left).to.be.at.least(bounds.left);
          expect(rect.bottom).to.be.at.most(bounds.bottom);
        });
      });
    });
  });

  it('custom exit motion restores trigger focus while the exiting surface is still mounted', () => {
    const ExitMotion = createPresenceComponent({
      enter: [],
      exit: { keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: 60000, reducedMotion: { duration: 60000 } },
    });
    const finished = cy.stub().as('motionFinished');
    mount(
      <ContractMenu
        menuProps={{
          surfaceMotion: {
            children: (_, props) => <ExitMotion {...props} onMotionFinish={finished} />,
          },
        }}
      />,
    );
    openContractMenu();
    cy.get(contractFirst).should('be.focused');
    cy.realPress('Escape');
    cy.get(contractTrigger).should('be.focused').and('not.have.attr', 'aria-expanded');
    cy.get(contractSurface)
      .should('exist')
      .then(surface => {
        const animations = surface[0].getAnimations();
        expect(animations.length).to.be.greaterThan(0);
        animations.forEach(animation => animation.finish());
      });
    cy.get(contractSurface).should('not.exist');
    cy.get('@motionFinished').should('have.been.called');
    openContractMenu();
    cy.get(contractFirst).should('be.focused');
  });

  it('an empty menu opens and dismisses safely without an artificial focus target', () => {
    mount(
      <ContractMenu>
        <MenuGroup>
          <MenuGroupHeader>Empty group</MenuGroupHeader>
        </MenuGroup>
      </ContractMenu>,
    );
    openContractMenu();
    cy.get(contractSurface).find('[role="menuitem"]').should('not.exist');
    cy.get(contractTrigger).should('be.focused').realPress('Escape');
    cy.get(contractSurface).should('not.exist');
    cy.get(contractTrigger).should('be.focused');
  });

  it('context-only mode wins over an explicit openOnHover and still opens on right click', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    const changes = cy.stub().as('contextHoverRequests');
    mount(
      <ContractMenu
        menuProps={{
          openOnContext: true,
          openOnHover: true,
          hoverDelay: 100,
          onOpenChange: changes,
        }}
      />,
    );
    cy.get(contractTrigger).trigger('mousemove').trigger('mouseover');
    cy.tick(100);
    cy.get(contractSurface).should('not.exist');
    cy.get('@contextHoverRequests').should('not.have.been.called');
    cy.get(contractTrigger).rightclick();
    cy.get(contractSurface).should('be.visible');
    cy.get('@contextHoverRequests').should('have.been.calledOnce');
  });

  ([undefined, true] as const).forEach(openOnHover => {
    it(`context-only submenu suppresses ${openOnHover === undefined ? 'default' : 'explicit'} hover opening`, () => {
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.clock();
      const changes = cy.stub().as('subContextHover');
      mount(
        <ContractMenu>
          <ContractSubmenu
            menuProps={{
              openOnContext: true,
              openOnHover,
              hoverDelay: 100,
              onOpenChange: changes,
            }}
          />
        </ContractMenu>,
      );
      openContractMenu();
      cy.get('[data-menu-test="sub-trigger"]').trigger('mousemove').trigger('mouseover');
      cy.tick(100);
      cy.get('[data-menu-test="sub-surface"]').should('not.exist');
      cy.get('@subContextHover').should('not.have.been.called');
      cy.get('[data-menu-test="sub-trigger"]').rightclick();
      cy.get('[data-menu-test="sub-surface"]').should('be.visible');
      cy.get('[data-menu-test="child"]').should('be.focused');
    });
  });

  it('entering the hover surface cancels pending trigger-leave dismissal and reports its reason', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    const changes = cy.stub().as('surfaceHover');
    mount(
      <ContractMenu
        menuProps={{ openOnHover: true, hoverDelay: 100, onOpenChange: (event, data) => changes(event, data) }}
      />,
    );
    cy.get(contractTrigger).trigger('mousemove');
    cy.tick(100);
    cy.get(contractSurface).should('be.visible');
    cy.get(contractTrigger).trigger('mouseout', { relatedTarget: null });
    cy.tick(50);
    cy.get(contractSurface).trigger('mouseover', { relatedTarget: null });
    cy.tick(100);
    cy.get(contractSurface).should('be.visible');
    cy.get<ContractStub>('@surfaceHover').then(stub => {
      expect(stub.lastCall.args[1]).to.include({ open: true, keyboard: false, type: 'menuPopoverMouseEnter' });
      expect(stub.lastCall.args[0]).to.equal(stub.lastCall.args[1].event);
    });
    cy.get(contractTrigger).click();
    cy.get(contractSurface).should('not.exist');
  });

  it('returning to the parent menu reports menuMouseEnter with the underlying native event', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.clock();
    const changes = cy.stub().as('menuEnter');
    mount(
      <ContractMenu>
        <MenuItem data-menu-test="first">Alpha</MenuItem>
        <ContractSubmenu
          menuProps={{ defaultOpen: true, hoverDelay: 100, onOpenChange: (event, data) => changes(event, data) }}
        />
      </ContractMenu>,
    );
    openContractMenu();
    cy.get('[data-menu-test="sub-surface"]').should('be.visible');
    cy.get(contractFirst).trigger('mouseover', { relatedTarget: null });
    cy.tick(100);
    cy.get('[data-menu-test="sub-surface"]').should('not.exist');
    cy.get(contractSurface).should('be.visible');
    cy.get<ContractStub>('@menuEnter').then(stub => {
      const [event, data] = stub.lastCall.args;
      expect(data).to.include({ open: false, type: 'menuMouseEnter' });
      expect(data.event.type).to.equal('fuimenuenter');
      expect(data.event.detail.nativeEvent).to.equal(event);
      expect(event.type).to.equal('mouseover');
    });
  });
});
