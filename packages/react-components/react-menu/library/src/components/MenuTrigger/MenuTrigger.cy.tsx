import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Button } from '@fluentui/react-button';
import { Tooltip } from '@fluentui/react-tooltip';
import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-menu';
import type { MenuProps, MenuTriggerProps, MenuTriggerChildProps } from '@fluentui/react-menu';
import { useMenuTriggerBase_unstable, renderMenuTrigger_unstable } from './index';
import type { MenuTriggerBaseProps } from './index';
import { MenuProvider } from '../../contexts/menuContext';
import type { MenuContextValue } from '../../contexts/menuContext';
import { MenuListProvider } from '../../contexts/menuListContext';
import { useMenuTriggerContext_unstable } from '../../contexts/menuTriggerContext';

const trigger = '[data-testid="trigger"]';
const surface = '[data-testid="surface"]';
const first = '[data-testid="first"]';

const Fixture = ({
  child = <button data-testid="trigger">Actions</button>,
  enhancement = true,
  ...props
}: Omit<MenuProps, 'children'> & { child?: MenuTriggerProps['children']; enhancement?: boolean }) => (
  <Menu surfaceMotion={null} {...props}>
    <MenuTrigger disableButtonEnhancement={!enhancement}>{child}</MenuTrigger>
    <MenuPopover data-testid="surface">
      <MenuList>
        <MenuItem data-testid="first">First action</MenuItem>
        <MenuItem>Second action</MenuItem>
      </MenuList>
    </MenuPopover>
  </Menu>
);

const render = (element: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );

const CustomTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => (
  <button {...props} ref={ref} />
));

const context = (overrides: Partial<MenuContextValue> = {}): MenuContextValue => ({
  open: false,
  setOpen: () => undefined,
  checkedValues: {},
  onCheckedValueChange: () => undefined,
  isSubmenu: false,
  triggerRef: { current: null },
  menuPopoverRef: { current: null },
  mountNode: null,
  triggerId: 'context-trigger',
  openOnContext: false,
  openOnHover: false,
  hasIcons: false,
  hasCheckmarks: false,
  inline: false,
  persistOnItemClick: false,
  ...overrides,
});

const BaseTrigger = (props: MenuTriggerBaseProps) => renderMenuTrigger_unstable(useMenuTriggerBase_unstable(props));

class InvalidChildBoundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  public state = { error: '' };
  public static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  public render() {
    return this.state.error ? <output data-testid="error">{this.state.error}</output> : this.props.children;
  }
}

describe('MenuTrigger cloning and native properties', () => {
  it('clones one native child without a wrapper and preserves native attributes', () => {
    render(
      <Fixture
        child={
          <button data-testid="trigger" className="consumer" title="Title" aria-label="Named actions">
            <span>Actions</span>
          </button>
        }
      />,
    );
    cy.get(trigger).should('have.class', 'consumer').and('have.attr', 'title', 'Title');
    cy.get(trigger).should('have.attr', 'aria-label', 'Named actions').and('have.attr', 'aria-haspopup', 'menu');
    cy.get(trigger).should('not.have.attr', 'aria-expanded');
    cy.get(trigger).should('not.be.focused');
    cy.get(trigger).parent().should('have.class', 'fui-FluentProvider');
    cy.get(surface).should('not.exist');
    cy.get(trigger).find('span').click();
    cy.get(surface).should('be.visible');
    cy.get(trigger)
      .invoke('attr', 'id')
      .then(id => cy.get(surface).find('[role="menu"]').should('have.attr', 'aria-labelledby', id));
    cy.get(first).should('be.focused');
    cy.get(trigger).should('have.attr', 'aria-expanded', 'true');
    cy.get(first).click();
    cy.get(surface).should('not.exist');
    cy.get(trigger).should('be.focused').and('not.have.attr', 'aria-expanded');
  });
});

describe('MenuTrigger enhancement opt-out', () => {
  it('disableButtonEnhancement leaves a custom role/tab order and keyboard mechanism to the consumer', () => {
    render(
      <Fixture
        enhancement={false}
        child={
          <div data-testid="trigger" role="menuitem" tabIndex={-1}>
            Actions
          </div>
        }
      />,
    );
    cy.get(trigger)
      .should('have.attr', 'role', 'menuitem')
      .and('have.attr', 'tabindex', '-1')
      .focus()
      .realPress('Enter');
    cy.get(trigger).realPress('Space');
    cy.get(surface).should('not.exist');
    cy.get(trigger).realPress('ArrowDown');
    cy.get(first).should('be.focused');
  });
});

describe('MenuTrigger unit-derived browser contracts', () => {
  it('callback and object refs are merged with the Menu positioning ref and cleared on unmount', () => {
    const callback = cy.stub().as('ref');
    const objectRef = React.createRef<HTMLButtonElement>();
    const value = context();
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button data-testid="remove" onClick={() => setVisible(false)}>
            Remove
          </button>
          {visible && (
            <MenuProvider value={value}>
              <MenuTrigger>
                <button
                  data-testid="trigger"
                  ref={el => {
                    callback(el);
                    objectRef.current = el;
                  }}
                >
                  Actions
                </button>
              </MenuTrigger>
            </MenuProvider>
          )}
        </>
      );
    };
    render(<Example />);
    cy.get(trigger).then($el => {
      expect(objectRef.current).to.equal($el[0]);
      expect(value.triggerRef.current).to.equal($el[0]);
      expect(callback.lastCall.args[0]).to.equal($el[0]);
    });
    cy.get('[data-testid="remove"]').click();
    cy.get(trigger)
      .should('not.exist')
      .then(() => {
        expect(objectRef.current).to.equal(null);
        expect(value.triggerRef.current).to.equal(null);
        expect(callback.lastCall.args[0]).to.equal(null);
      });
  });

  it('retains a direct object ref and positions the menu below the referenced child', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <Fixture
        child={
          <button data-testid="trigger" ref={ref}>
            Actions
          </button>
        }
        positioning={{ position: 'below', align: 'start', offset: 12 }}
      />,
    );
    cy.get(trigger)
      .click()
      .then($el => expect(ref.current).to.equal($el[0]));
    cy.get(surface).should($el => {
      const anchor = ref.current!.getBoundingClientRect();
      const popup = $el[0].getBoundingClientRect();
      expect(popup.top).to.be.closeTo(anchor.bottom + 12, 1);
      expect(popup.left).to.be.closeTo(anchor.left, 1);
    });
  });

  it('preserves consumer id and ARIA overrides rather than replacing them', () => {
    render(
      <Fixture
        child={
          <button data-testid="trigger" id="consumer-id" aria-haspopup="dialog" aria-expanded={false}>
            Actions
          </button>
        }
      />,
    );
    cy.get(trigger)
      .should('have.id', 'consumer-id')
      .and('have.attr', 'aria-haspopup', 'dialog')
      .and('have.attr', 'aria-expanded', 'false')
      .click();
    cy.get(surface).should('be.visible');
    cy.get(trigger).should('have.attr', 'aria-expanded', 'false');
  });

  it('generated IDs are stable across rerender and unique across sibling menus', () => {
    const Example = () => {
      const [count, setCount] = React.useState(0);
      return (
        <>
          <button data-testid="update" onClick={() => setCount(count + 1)}>
            Update {count}
          </button>
          <Fixture />
          <Fixture child={<button data-testid="second-trigger">Second</button>} />
        </>
      );
    };
    render(<Example />);
    cy.get(trigger)
      .invoke('attr', 'id')
      .then(id => {
        expect(id).to.be.a('string').and.not.equal('');
        cy.get('[data-testid="second-trigger"]')
          .invoke('attr', 'id')
          .should(secondId => {
            expect(secondId).to.be.a('string').and.not.equal('');
            expect(secondId).not.to.equal(id);
          });
        cy.get('[data-testid="update"]').click();
        cy.get(trigger).should('have.id', id);
        cy.get('[data-testid="update"]').should('be.focused');
      });
  });

  ['click', 'keydown', 'keyup', 'contextmenu', 'mouseover', 'mousemove', 'mouseout'].forEach(eventName => {
    it(`composes original ${eventName} before the internal handler with original event identity`, () => {
      const child = cy.stub().as('child');
      const change = cy
        .stub()
        .callsFake((e, data) => {
          expect(child).to.have.been.calledOnce;
          expect(child.firstCall.args[0]).to.equal(e);
          expect(data.event).to.equal(e);
        })
        .as('change');
      const eventProps = {
        click: { onClick: child },
        keydown: { onKeyDown: child },
        keyup: { onKeyUp: child },
        contextmenu: { onContextMenu: child },
        mouseover: { onMouseOver: child },
        mousemove: { onMouseMove: child },
        mouseout: { onMouseLeave: child },
      }[eventName];
      const value = context({
        setOpen: change,
        openOnContext: eventName === 'contextmenu',
        openOnHover: ['mouseover', 'mousemove', 'mouseout'].includes(eventName),
      });
      render(
        <MenuProvider value={value}>
          <MenuTrigger disableButtonEnhancement>
            <button data-testid="trigger" {...eventProps}>
              Actions
            </button>
          </MenuTrigger>
        </MenuProvider>,
      );
      cy.get(trigger).trigger(eventName, { key: 'ArrowDown', relatedTarget: null });
      cy.get('@child').should('have.been.calledOnce');
      if (['keyup', 'mouseover'].includes(eventName)) {
        cy.get('@change').should('not.have.been.called');
      } else {
        cy.get('@change').should('have.been.calledOnce');
      }
    });
  });

  it('click prevention is not a veto of the internal click toggle', () => {
    const child = cy
      .stub()
      .callsFake((e: React.MouseEvent) => e.preventDefault())
      .as('child');
    const change = cy.stub().as('change');
    render(
      <Fixture
        onOpenChange={change}
        child={
          <button data-testid="trigger" onClick={child}>
            Actions
          </button>
        }
      />,
    );
    cy.get(trigger).click();
    cy.get(first).should('be.focused');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => {
        expect(change.firstCall.args[0]).to.equal(child.firstCall.args[0]);
        expect(change.firstCall.args[0].defaultPrevented).to.equal(true);
      });
  });

  it('Space keyup prevention vetoes enhanced activation', () => {
    const handler = cy
      .stub()
      .callsFake((e: React.KeyboardEvent) => e.preventDefault())
      .as('handler');
    render(
      <Fixture
        child={
          <div data-testid="trigger" onKeyUp={handler}>
            Actions
          </div>
        }
      />,
    );
    cy.get(trigger).focus().realPress('Space');
    cy.get('@handler').should('have.been.calledOnce');
    cy.get(surface).should('not.exist');
    cy.get(trigger).realPress('Enter');
    cy.get(first).should('be.focused');
  });

  it('onMouseEnter is preserved without incorrectly bypassing the movement guard', () => {
    const enter = cy.stub().as('enter');
    const change = cy.stub().as('change');
    render(
      <MenuProvider value={context({ openOnHover: true, setOpen: change })}>
        <MenuTrigger>
          <button data-testid="trigger" onMouseEnter={enter}>
            Actions
          </button>
        </MenuTrigger>
      </MenuProvider>,
    );
    cy.get(trigger).trigger('mouseover', { relatedTarget: null });
    cy.get('@enter').should('have.been.calledOnce');
    cy.get('@change').should('not.have.been.called');
    cy.get(trigger).trigger('mousemove');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('disabled descendant target is guarded even when the trigger itself is enabled', () => {
    const change = cy.stub().as('change');
    render(
      <Fixture
        enhancement={false}
        onOpenChange={change}
        child={
          <button data-testid="trigger">
            <span aria-disabled="true">Disabled part</span>
            <span data-testid="enabled-part">Enabled part</span>
          </button>
        }
      />,
    );
    cy.contains('span', 'Disabled part').click();
    cy.get(surface).should('not.exist');
    cy.get('@change').should('not.have.been.called');
    cy.get('[data-testid="enabled-part"]').click();
    cy.get(first).should('be.focused');
  });

  it('latest child handlers, disabled state, and menu mode take effect after rerender', () => {
    const before = cy.stub().as('before');
    const after = cy.stub().as('after');
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button data-testid="update" onClick={() => setPhase(phase + 1)}>
            Update
          </button>
          <Fixture
            openOnContext={phase === 2}
            child={
              <button data-testid="trigger" aria-disabled={phase === 0} onClick={phase === 0 ? before : after}>
                Actions
              </button>
            }
          />
        </>
      );
    };
    render(<Example />);
    cy.get(trigger).click();
    cy.get('@before').should('not.have.been.called');
    cy.get(surface).should('not.exist');
    cy.get('[data-testid="update"]').click();
    cy.get(trigger).click();
    cy.get('@after').should('have.been.calledOnce');
    cy.get(first).should('be.focused').realPress('Escape');
    cy.get('[data-testid="update"]').click();
    cy.get(trigger).click();
    cy.get('@after').should('have.been.calledTwice');
    cy.get(surface).should('not.exist');
    cy.get(trigger).rightclick();
    cy.get(surface).should('be.visible');
  });

  it('dynamic enhancement removes and restores synthesized button semantics', () => {
    const Example = () => {
      const [enhancement, setEnhancement] = React.useState(true);
      return (
        <>
          <button data-testid="update" onClick={() => setEnhancement(!enhancement)}>
            Update
          </button>
          <Fixture enhancement={enhancement} child={<div data-testid="trigger">Actions</div>} />
        </>
      );
    };
    render(<Example />);
    cy.get(trigger).should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
    cy.get('[data-testid="update"]').click();
    cy.get(trigger).should('not.have.attr', 'role');
    cy.get(trigger).should('not.have.attr', 'tabindex');
    cy.get(trigger).trigger('keydown', { key: 'Enter' });
    cy.get(surface).should('not.exist');
    cy.get('[data-testid="update"]').click();
    cy.get(trigger).focus().realPress('Enter');
    cy.get(first).should('be.focused');
  });

  it('repeated click toggles use latest open state and deliver precise reasons', () => {
    const change = cy.stub().as('change');
    render(<Fixture onOpenChange={change} />);
    cy.get(trigger).click();
    cy.get(surface).should('be.visible');
    cy.get(trigger).click();
    cy.get(surface).should('not.exist');
    cy.get(trigger).click();
    cy.get(surface).should('be.visible');
    cy.get('@change')
      .should('have.been.calledThrice')
      .then(() => {
        expect(change.getCalls().map(call => call.args[1].open)).to.deep.equal([true, false, true]);
        expect(change.getCalls().map(call => call.args[1].type)).to.deep.equal([
          'menuTriggerClick',
          'menuTriggerClick',
          'menuTriggerClick',
        ]);
      });
  });

  it('root trigger Escape uses its own keydown reason rather than popover dismissal', () => {
    const change = cy.stub().as('change');
    render(<Fixture defaultOpen onOpenChange={change} />);
    cy.get(first).should('be.focused');
    cy.get(trigger).focus().realPress('Escape');
    cy.get(surface).should('not.exist');
    cy.get(trigger).should('be.focused');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() =>
        expect(change.firstCall.args[1]).to.include({ open: false, type: 'menuTriggerKeyDown', keyboard: true }),
      );
  });

  it('safe-zone timeout arms only a submenu and bypasses hover delay once', () => {
    const change = cy.stub().as('change');
    const value = context({ isSubmenu: true, openOnHover: true, setOpen: change });
    render(
      <MenuProvider value={value}>
        <MenuTrigger>
          <button data-testid="trigger">Actions</button>
        </MenuTrigger>
      </MenuProvider>,
    );
    cy.get(trigger).trigger('fuimenusafezonetimeout').trigger('mouseover');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() =>
        expect(change.firstCall.args[1]).to.include({
          ignoreHoverDelay: true,
          open: true,
          type: 'menuTriggerMouseEnter',
        }),
      );
    cy.get(trigger).trigger('mouseover');
    cy.get('@change').should('have.been.calledOnce');
    cy.get(trigger).trigger('mousemove');
    cy.get('@change').should('have.been.calledTwice');
  });

  it('root safe-zone timeout does not bypass stationary mouseover', () => {
    const change = cy.stub().as('change');
    render(
      <MenuProvider value={context({ openOnHover: true, setOpen: change })}>
        <MenuTrigger>
          <button data-testid="trigger">Actions</button>
        </MenuTrigger>
      </MenuProvider>,
    );
    cy.get(trigger).trigger('fuimenusafezonetimeout').trigger('mouseover');
    cy.get('@change').should('not.have.been.called');
    cy.get(trigger).trigger('mousemove');
    cy.get('@change').should('have.been.calledOnce');
  });

  [true, false].forEach(insideList => {
    it(`submenu detection and child context use ${insideList ? 'MenuList ancestry' : 'explicit Menu context'}`, () => {
      const Probe = () => <span data-testid="context">{String(useMenuTriggerContext_unstable())}</span>;
      const child = (
        <MenuTrigger>
          <button data-testid="trigger">
            <Probe />
          </button>
        </MenuTrigger>
      );
      render(
        <MenuProvider value={context({ isSubmenu: !insideList })}>
          {insideList ? (
            <MenuListProvider value={{ checkedValues: {}, hasIcons: false, hasCheckmarks: false }}>
              {child}
            </MenuListProvider>
          ) : (
            child
          )}
        </MenuProvider>,
      );
      cy.get('[data-testid="context"]').should('have.text', 'true');
      cy.get(trigger).should('have.attr', 'aria-expanded', 'false');
    });
  });

  it('root child trigger context is false', () => {
    const Probe = () => <span data-testid="context">{String(useMenuTriggerContext_unstable())}</span>;
    render(
      <Fixture
        child={
          <button data-testid="trigger">
            <Probe />
          </button>
        }
      />,
    );
    cy.get('[data-testid="context"]').should('have.text', 'false');
  });

  [true, false].forEach(allow => {
    it(`grid-like MenuList context shouldOpenOnArrowRight=${allow}`, () => {
      const change = cy.stub().as('change');
      render(
        <MenuProvider value={context({ setOpen: change })}>
          <MenuListProvider
            value={{ checkedValues: {}, hasIcons: false, hasCheckmarks: false, shouldOpenOnArrowRight: allow }}
          >
            <MenuTrigger>
              <button data-testid="trigger">Actions</button>
            </MenuTrigger>
          </MenuListProvider>
        </MenuProvider>,
      );
      cy.get(trigger).focus().realPress('ArrowRight');
      cy.get('@change').should(allow ? 'have.been.calledOnce' : 'not.have.been.called');
      if (allow) {
        cy.then(() =>
          expect(change.firstCall.args[1]).to.include({ open: true, keyboard: true, type: 'menuTriggerKeyDown' }),
        );
      }
    });
  });

  [true, false].forEach(withFocus => {
    it(`base hook already-open submenu delegates focusFirst=${withFocus}`, () => {
      const change = cy.stub().as('change');
      const focus = cy.stub().as('focus');
      render(
        <MenuProvider value={context({ open: true, isSubmenu: true, setOpen: change })}>
          <BaseTrigger focusFirst={withFocus ? focus : undefined}>
            <button data-testid="trigger">Actions</button>
          </BaseTrigger>
        </MenuProvider>,
      );
      cy.get(trigger).focus().realPress('ArrowRight');
      cy.get('@change').should('have.been.calledOnce');
      cy.get('@focus').should(withFocus ? 'have.been.calledOnce' : 'not.have.been.called');
      cy.get(trigger).should('be.focused').realPress('Escape');
      cy.get('@change').should('have.been.calledOnce');
    });
  });

  it('null, undefined, and a render-function returning null render no trigger DOM', () => {
    render(
      <>
        <MenuTrigger>{null}</MenuTrigger>
        <MenuTrigger />
        <MenuTrigger>{() => null}</MenuTrigger>
        <button data-testid="control">Control</button>
      </>,
    );
    cy.get('[data-testid="control"]').parent().children('button').should('have.length', 1);
    cy.get('[aria-haspopup]').should('not.exist');
    cy.get('[data-testid="control"]').click().should('be.focused');
  });

  ['fragment', 'array', 'text'].forEach(kind => {
    it(`rejects unsupported ${kind} child with an explicit single-element error`, () => {
      const child =
        kind === 'fragment' ? (
          <>
            <button>Actions</button>
          </>
        ) : kind === 'array' ? (
          [<button key="a">A</button>, <button key="b">B</button>]
        ) : (
          'text'
        );
      render(
        <InvalidChildBoundary>
          <MenuTrigger>{child as React.ReactElement}</MenuTrigger>
        </InvalidChildBoundary>,
      );
      cy.get('[data-testid="error"]').should(
        'have.text',
        "A trigger element must be a single element for this component. Please ensure that you're not using React Fragments.",
      );
      cy.get('[aria-haspopup]').should('not.exist');
    });
  });
});

describe('MenuTrigger edges and accessibility', () => {
  it('an enhanced anchor with href retains link semantics but supports Space', () => {
    render(
      <Fixture
        child={
          <a data-testid="trigger" href="#actions">
            Actions
          </a>
        }
      />,
    );
    cy.get(trigger).should('have.attr', 'href', '#actions');
    cy.get(trigger).should('not.have.attr', 'role');
    cy.get(trigger).focus().realPress('Space');
    cy.get(surface).should('be.visible');
    cy.get(first).should('be.focused').realPress('Escape');
    cy.get(trigger).should('be.focused');
  });

  describe('MenuTrigger documented contracts', () => {
    [true, false].forEach(enhancement => {
      it(`disabled native trigger blocks pointer and keyboard, enhancement=${enhancement}`, () => {
        const change = cy.stub().as('change');
        render(
          <Fixture
            enhancement={enhancement}
            onOpenChange={change}
            child={
              <button data-testid="trigger" disabled>
                Actions
              </button>
            }
          />,
        );
        cy.get(trigger)
          .should('be.disabled')
          .trigger('click', { force: true })
          .trigger('keydown', { key: 'ArrowDown', force: true });
        cy.get(surface).should('not.exist');
        cy.get('@change').should('not.have.been.called');
      });

      it(`aria-disabled trigger blocks nested-target activation, enhancement=${enhancement}`, () => {
        const change = cy.stub().as('change');
        render(
          <Fixture
            enhancement={enhancement}
            onOpenChange={change}
            child={
              <button data-testid="trigger" aria-disabled="true">
                <span>Nested</span>
              </button>
            }
          />,
        );
        cy.get(trigger).find('span').click();
        cy.get(trigger).focus().realPress('ArrowDown');
        cy.get(surface).should('not.exist');
        cy.get('@change').should('not.have.been.called');
      });
    });

    it('aria-disabled=false is an enabled positive control', () => {
      render(
        <Fixture
          child={
            <button data-testid="trigger" aria-disabled={false}>
              Actions
            </button>
          }
        />,
      );
      cy.get(trigger).should('have.attr', 'aria-disabled', 'false').click();
      cy.get(first).should('be.focused');
    });

    it('disabled enhanced link loses href and remains inert', () => {
      const change = cy.stub().as('change');
      render(
        <Fixture
          onOpenChange={change}
          child={
            <a data-testid="trigger" href="#destination" aria-disabled="true">
              Actions
            </a>
          }
        />,
      );
      cy.get(trigger).should('have.attr', 'role', 'link');
      cy.get(trigger).should('not.have.attr', 'href');
      cy.get(trigger).click().trigger('keydown', { key: 'Enter' }).trigger('keyup', { key: ' ' });
      cy.get(surface).should('not.exist');
      cy.get('@change').should('not.have.been.called');
    });

    ['button', 'div'].forEach(tag => {
      it(`consumer keydown prevention vetoes opening for ${tag}, with unprevented positive control`, () => {
        const Example = () => {
          const [prevent, setPrevent] = React.useState(true);
          return (
            <>
              <button data-testid="enable" onClick={() => setPrevent(false)}>
                Enable
              </button>
              <Fixture
                child={React.createElement(
                  tag,
                  {
                    'data-testid': 'trigger',
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (prevent) {
                        e.preventDefault();
                      }
                    },
                  },
                  'Actions',
                )}
              />
            </>
          );
        };
        render(<Example />);
        cy.get(trigger).focus().realPress('ArrowDown');
        cy.get(trigger).realPress('Enter');
        cy.get(surface).should('not.exist');
        cy.get('[data-testid="enable"]').click();
        cy.get(trigger).focus().realPress('ArrowDown');
        cy.get(first).should('be.focused');
      });
    });

    it('consumer contextmenu prevention vetoes opening and preserves original event identity', () => {
      const change = cy.stub().as('change');
      const handler = cy
        .stub()
        .callsFake((e: React.MouseEvent) => e.preventDefault())
        .as('handler');
      render(
        <Fixture
          openOnContext
          onOpenChange={change}
          child={
            <div data-testid="trigger" onContextMenu={handler}>
              Actions
            </div>
          }
        />,
      );
      cy.get(trigger).rightclick();
      cy.get('@handler').should('have.been.calledOnce');
      cy.get('@change').should('not.have.been.called');
      cy.get(surface).should('not.exist');
    });

    it('normal mode contextmenu preserves the browser default and child callback', () => {
      const handler = cy.stub().as('handler');
      render(
        <Fixture
          child={
            <button data-testid="trigger" onContextMenu={handler}>
              Actions
            </button>
          }
        />,
      );
      cy.get(trigger).trigger('contextmenu');
      cy.get('@handler')
        .should('have.been.calledOnce')
        .then(() => expect(handler.firstCall.args[0].defaultPrevented).to.equal(false));
      cy.get(surface).should('not.exist');
      cy.get(trigger).click();
      cy.get(surface).should('be.visible');
    });

    it('hover requires actual movement, respects delay and closes/reopens after movement', () => {
      const change = cy.stub().as('change');
      render(<Fixture openOnHover hoverDelay={200} onOpenChange={change} />);
      cy.clock();
      cy.get(trigger).trigger('mouseover');
      cy.tick(200);
      cy.get(surface).should('not.exist');
      cy.get('@change').should('not.have.been.called');
      cy.get(trigger).trigger('mousemove');
      cy.tick(199);
      cy.get(surface).should('not.exist');
      cy.tick(1);
      cy.get(first).should('be.focused');
      cy.get('@change')
        .should('have.been.calledOnce')
        .then(() =>
          expect(change.firstCall.args[1]).to.include({ open: true, type: 'menuTriggerMouseMove', keyboard: false }),
        );
      cy.get(trigger).trigger('mousemove');
      cy.tick(200);
      cy.get('@change').should('have.been.calledOnce');
      cy.get(trigger).trigger('mouseout', { relatedTarget: null });
      cy.tick(199);
      cy.get(surface).should('be.visible');
      cy.tick(1);
      cy.get(surface).should('not.exist');
      cy.get(trigger).trigger('mouseover');
      cy.tick(200);
      cy.get(surface).should('be.visible');
      cy.get('@change')
        .should('have.been.calledThrice')
        .then(() => {
          expect(change.secondCall.args[1]).to.include({ open: false, type: 'menuTriggerMouseLeave' });
          expect(change.thirdCall.args[1]).to.include({ open: true, type: 'menuTriggerMouseEnter' });
        });
    });

    it('normal root ignores hover and context mode overrides openOnHover', () => {
      const change = cy.stub().as('change');
      render(<Fixture openOnContext openOnHover hoverDelay={0} onOpenChange={change} />);
      cy.clock();
      cy.get(trigger).trigger('mousemove').trigger('mouseover').trigger('mouseout', { relatedTarget: null });
      cy.tick(500);
      cy.get(surface).should('not.exist');
      cy.get('@change').should('not.have.been.called');
      cy.get(trigger).rightclick();
      cy.get(surface).should('be.visible');
    });

    it('a disabled hover/context target is inert across all mouse handlers', () => {
      const change = cy.stub().as('change');
      render(
        <Fixture
          openOnHover
          hoverDelay={0}
          onOpenChange={change}
          child={
            <div data-testid="trigger" aria-disabled="true">
              Actions
            </div>
          }
        />,
      );
      cy.clock();
      cy.get(trigger)
        .trigger('mouseover')
        .trigger('mousemove')
        .trigger('mouseout', { relatedTarget: null })
        .trigger('contextmenu');
      cy.tick(500);
      cy.get(surface).should('not.exist');
      cy.get('@change').should('not.have.been.called');
    });

    (['ltr', 'rtl'] as const).forEach(dir => {
      it(`${dir} submenu arrow opens, refocuses an already-open menu, and restores nested/root focus`, () => {
        render(
          <Menu surfaceMotion={null}>
            <MenuTrigger>
              <button data-testid="trigger">Root</button>
            </MenuTrigger>
            <MenuPopover data-testid="surface">
              <MenuList>
                <Menu openOnHover={false} surfaceMotion={null}>
                  <MenuTrigger disableButtonEnhancement>
                    <MenuItem data-testid="subtrigger">More actions</MenuItem>
                  </MenuTrigger>
                  <MenuPopover data-testid="subsurface">
                    <MenuList>
                      <MenuItem data-testid="subfirst">Nested action</MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              </MenuList>
            </MenuPopover>
          </Menu>,
          dir,
        );
        const openKey = dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft';
        cy.get(trigger).click();
        cy.get('[data-testid="subtrigger"]')
          .should('have.attr', 'role', 'menuitem')
          .and('have.attr', 'aria-expanded', 'false');
        cy.get('[data-testid="subtrigger"]').realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
        cy.get('[data-testid="subsurface"]').should('not.exist');
        cy.get('[data-testid="subtrigger"]').focus().realPress(openKey);
        cy.get('[data-testid="subfirst"]').should('be.focused');
        cy.get('[data-testid="subtrigger"]').should('have.attr', 'aria-expanded', 'true');
        cy.get('[data-testid="subtrigger"]')
          .invoke('attr', 'id')
          .then(id => cy.get('[data-testid="subsurface"] [role="menu"]').should('have.attr', 'aria-labelledby', id));
        cy.get('[data-testid="subtrigger"]').focus().realPress(openKey);
        cy.get('[data-testid="subfirst"]').should('be.focused').realPress('Escape');
        cy.get('[data-testid="subsurface"]').should('not.exist');
        cy.get('[data-testid="subtrigger"]').should('be.focused').realPress('Escape');
        cy.get(surface).should('not.exist');
        cy.get(trigger).should('be.focused');
      });
    });

    it('controlled state requests do not mutate the trigger expansion', () => {
      const change = cy.stub().as('change');
      render(<Fixture open={false} onOpenChange={change} />);
      cy.get(trigger).click();
      cy.get('@change')
        .should('have.been.calledOnce')
        .then(() => expect(change.firstCall.args[1]).to.include({ open: true, type: 'menuTriggerClick' }));
      cy.get(surface).should('not.exist');
      cy.get(trigger).should('not.have.attr', 'aria-expanded');
    });

    it('external controlled changes update expansion without stealing unrelated focus when closed', () => {
      const Example = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <>
            <button data-testid="external" onClick={() => setOpen(!open)}>
              External
            </button>
            <Fixture open={open} />
          </>
        );
      };
      render(<Example />);
      cy.get('[data-testid="external"]').click();
      cy.get(trigger).should('have.attr', 'aria-expanded', 'true');
      cy.get(first).should('be.focused');
      cy.get('[data-testid="external"]').click();
      cy.get(surface).should('not.exist');
      cy.get('[data-testid="external"]').should('be.focused');
    });
  });

  [true, false].forEach(enhancement => {
    (['Enter', 'Space', 'ArrowDown'] as const).forEach(key => {
      it(`opens a native button with ${key}, enhancement=${enhancement}`, () => {
        render(<Fixture enhancement={enhancement} />);
        cy.get(trigger).focus().realPress(key);
        cy.get(surface).should('be.visible');
        cy.get(first).should('be.focused').realPress('Escape');
        cy.get(surface).should('not.exist');
        cy.get(trigger).should('be.focused');
      });
    });
  });

  ['div', 'a'].forEach(tag => {
    (['Enter', 'Space'] as const).forEach(key => {
      it(`enhances ${tag} to a keyboard button for ${key}`, () => {
        render(<Fixture child={React.createElement(tag, { 'data-testid': 'trigger' }, 'Actions')} />);
        cy.get(trigger).should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0').focus().realPress(key);
        cy.get(first).should('be.focused');
        cy.get(surface).should('be.visible');
      });
    });
  });

  it('supports a ref-forwarding custom component without enhancement', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <Fixture
        enhancement={false}
        child={
          <CustomTrigger ref={ref} data-testid="trigger">
            Custom
          </CustomTrigger>
        }
      />,
    );
    cy.get(trigger).then($el => expect(ref.current).to.equal($el[0]));
    cy.get(trigger).click();
    cy.get(first).should('be.focused').realPress('Escape');
    cy.get(trigger).should('be.focused');
  });

  (['default', 'disabled'] as const).forEach(enhancement => {
    (['Enter', 'Space'] as const).forEach(key => {
      it(`supports a Fluent Button without double ${key} activation, enhancement=${enhancement}`, () => {
        const change = cy.stub().as('change');
        const button = <Button data-testid="trigger">Actions</Button>;
        render(
          <Menu surfaceMotion={null} onOpenChange={change}>
            {enhancement === 'default' ? (
              <MenuTrigger>{button}</MenuTrigger>
            ) : (
              <MenuTrigger disableButtonEnhancement>{button}</MenuTrigger>
            )}
            <MenuPopover data-testid="surface">
              <MenuList>
                <MenuItem data-testid="first">First action</MenuItem>
                <MenuItem>Second action</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>,
        );
        cy.get(surface).should('not.exist');
        cy.get(trigger).should('not.have.attr', 'aria-expanded');
        cy.get(trigger).focus().realPress(key);
        cy.get(surface).should('be.visible');
        cy.get(first).should('be.focused');
        cy.get(trigger).should('have.attr', 'aria-expanded', 'true');
        cy.get('@change')
          .should('have.been.calledOnce')
          .then(() => {
            expect(change.firstCall.args[1]).to.include({ open: true, keyboard: false, type: 'menuTriggerClick' });
            expect(change.firstCall.args[0].type).to.equal('click');
            expect(change.firstCall.args[1].event).to.equal(change.firstCall.args[0]);
          });
        cy.get(trigger).focus().realPress(key);
        cy.get(surface).should('not.exist');
        cy.get(trigger).should('be.focused').and('not.have.attr', 'aria-expanded');
        cy.get('@change')
          .should('have.been.calledTwice')
          .then(() =>
            expect(change.secondCall.args[1]).to.include({ open: false, keyboard: false, type: 'menuTriggerClick' }),
          );
        cy.get(trigger).realPress(key);
        cy.get(surface).should('be.visible');
        cy.get(first).should('be.focused');
        cy.get('@change')
          .should('have.been.calledThrice')
          .then(() =>
            expect(change.thirdCall.args[1]).to.include({ open: true, keyboard: false, type: 'menuTriggerClick' }),
          );
        cy.get(first).realPress('Escape');
        cy.get(surface).should('not.exist');
        cy.get(trigger).should('be.focused').and('not.have.attr', 'aria-expanded');
        cy.get('@change')
          .should('have.callCount', 4)
          .then(() =>
            expect(change.lastCall.args[1]).to.include({ open: false, keyboard: true, type: 'menuPopoverKeyDown' }),
          );
      });
    });
  });

  it('render-function props activate only the designated inner trigger', () => {
    render(
      <Fixture
        enhancement={false}
        child={(props: MenuTriggerChildProps<'button'>) => (
          <div>
            <button data-testid="other">Other action</button>
            <button {...props} data-testid="trigger">
              Actions
            </button>
          </div>
        )}
      />,
    );
    cy.get('[data-testid="other"]').click();
    cy.get(surface).should('not.exist');
    cy.get(trigger).should('have.attr', 'aria-haspopup', 'menu').click();
    cy.get(trigger)
      .invoke('attr', 'id')
      .then(id => cy.get(surface).find('[role="menu"]').should('have.attr', 'aria-labelledby', id));
    cy.get(first).realPress('Escape');
    cy.get(trigger).should('be.focused');
  });

  it('composes a Tooltip description with menu trigger interactions', () => {
    render(
      <Menu surfaceMotion={null}>
        <Tooltip content="Action help" relationship="description">
          <MenuTrigger disableButtonEnhancement>
            <Button data-testid="trigger">Actions</Button>
          </MenuTrigger>
        </Tooltip>
        <MenuPopover data-testid="surface">
          <MenuList>
            <MenuItem data-testid="first">First</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>,
    );
    cy.get(trigger).focus();
    cy.get(trigger)
      .invoke('attr', 'aria-describedby')
      .then(id => cy.get(`#${id}`).should('contain.text', 'Action help'));
    cy.get(trigger).realPress('ArrowDown');
    cy.get(first).should('be.focused');
    cy.get(trigger).should('have.attr', 'aria-haspopup', 'menu').and('have.attr', 'aria-expanded', 'true');
  });

  it('context mode uses right-click, without button semantics or click/keyboard opening', () => {
    render(
      <Fixture
        openOnContext
        child={
          <div data-testid="trigger" tabIndex={0}>
            Context target
          </div>
        }
      />,
    );
    cy.get(trigger).should('not.have.attr', 'role');
    cy.get(trigger).should('not.have.attr', 'aria-haspopup');
    cy.get(trigger).click();
    cy.get(trigger).focus().realPress('ArrowDown');
    cy.get(surface).should('not.exist');
    cy.get(trigger).rightclick();
    cy.get(surface).should('be.visible');
    cy.get(first).should('be.focused');
  });
});

describe('MenuTrigger additional lifecycle and event boundaries', () => {
  [true, false].forEach(enhancement => {
    it(`prevented ArrowDown delivers no open request before another gesture, enhancement=${enhancement}`, () => {
      const child = cy.stub().as('child-keydown');
      const change = cy.stub().as('change');
      const Example = () => {
        const [prevent, setPrevent] = React.useState(true);
        return (
          <>
            <button data-testid="enable" onClick={() => setPrevent(false)}>
              Enable
            </button>
            <Fixture
              enhancement={enhancement}
              onOpenChange={change}
              child={
                <button
                  data-testid="trigger"
                  onKeyDown={event => {
                    child(event);
                    if (prevent) {
                      event.preventDefault();
                    }
                  }}
                >
                  Actions
                </button>
              }
            />
          </>
        );
      };
      render(<Example />);
      cy.get(trigger).focus().realPress('ArrowDown');
      cy.get('@child-keydown')
        .should('have.been.calledOnce')
        .then(() => expect(child.firstCall.args[0].defaultPrevented).to.equal(true));
      cy.get('@change').should('not.have.been.called');
      cy.get(surface).should('not.exist');
      cy.get(trigger).should('be.focused').and('not.have.attr', 'aria-expanded');
      cy.get('[data-testid="enable"]').click();
      cy.get(trigger).focus().realPress('ArrowDown');
      cy.get('@child-keydown').should('have.been.calledTwice');
      cy.get('@change')
        .should('have.been.calledOnce')
        .then(() => {
          expect(change.firstCall.args[0]).to.equal(child.secondCall.args[0]);
          expect(change.firstCall.args[1].event).to.equal(child.secondCall.args[0]);
          expect(change.firstCall.args[1]).to.include({ open: true, keyboard: true, type: 'menuTriggerKeyDown' });
          expect(child.secondCall.args[0].defaultPrevented).to.equal(false);
        });
      cy.get(trigger).should('have.attr', 'aria-expanded', 'true');
      cy.get(surface).should('be.visible');
      cy.get(first).should('be.focused').realPress('Escape');
      cy.get(surface).should('not.exist');
      cy.get(trigger).should('be.focused').and('not.have.attr', 'aria-expanded');
      cy.get('@change')
        .should('have.been.calledTwice')
        .then(() =>
          expect(change.secondCall.args[1]).to.include({ open: false, keyboard: true, type: 'menuPopoverKeyDown' }),
        );
    });
  });

  it('enhanced Space opens on keyup, while Enter opens on keydown', () => {
    const change = cy.stub().as('change');
    render(
      <MenuProvider value={context({ setOpen: change })}>
        <MenuTrigger>
          <div data-testid="trigger">Actions</div>
        </MenuTrigger>
      </MenuProvider>,
    );
    cy.get(trigger).trigger('keydown', { key: ' ' });
    cy.get('@change').should('not.have.been.called');
    cy.get(trigger).trigger('keyup', { key: ' ' });
    cy.get('@change').should('have.been.calledOnce');
    cy.get(trigger).trigger('keydown', { key: 'Enter' });
    cy.get('@change').should('have.been.calledTwice');
    cy.get(trigger).trigger('keyup', { key: 'Enter' });
    cy.get('@change').should('have.been.calledTwice');
  });

  ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'x'].forEach(key => {
    it(`root ${key} is not an opening gesture`, () => {
      const change = cy.stub().as('change');
      render(
        <MenuProvider value={context({ setOpen: change })}>
          <MenuTrigger>
            <button data-testid="trigger">Actions</button>
          </MenuTrigger>
        </MenuProvider>,
      );
      cy.get(trigger).trigger('keydown', { key });
      cy.get('@change').should('not.have.been.called');
      cy.get(trigger).trigger('keydown', { key: 'ArrowDown' });
      cy.get('@change').should('have.been.calledOnce');
    });
  });

  it('context mode preserves child click/keydown handlers without internal opening', () => {
    const click = cy.stub().as('click');
    const keydown = cy.stub().as('keydown');
    const handler = cy.stub().as('context');
    const change = cy.stub().as('change');
    render(
      <Fixture
        openOnContext
        onOpenChange={change}
        child={
          <div data-testid="trigger" tabIndex={0} onClick={click} onKeyDown={keydown} onContextMenu={handler}>
            Actions
          </div>
        }
      />,
    );
    cy.get(trigger).click().focus().realPress('Enter');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@keydown').should('have.been.calledOnce');
    cy.get('@change').should('not.have.been.called');
    cy.get(trigger).rightclick();
    cy.get('@context').should('have.been.calledOnce');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => {
        expect(change.firstCall.args[0]).to.equal(handler.firstCall.args[0]);
        expect(change.firstCall.args[0].defaultPrevented).to.equal(true);
        expect(change.firstCall.args[1]).to.include({ open: true, keyboard: false, type: 'menuTriggerContextMenu' });
      });
    cy.get(surface).should('be.visible');
  });

  it('root hover=false ignores movement/leave with click as a positive control', () => {
    const change = cy.stub().as('change');
    render(<Fixture onOpenChange={change} />);
    cy.clock();
    cy.get(trigger).trigger('mousemove').trigger('mouseover').trigger('mouseout', { relatedTarget: null });
    cy.tick(1000);
    cy.get('@change').should('not.have.been.called');
    cy.get(surface).should('not.exist');
    cy.get(trigger).click();
    cy.get(surface).should('be.visible');
  });

  it('child hover prevention does not veto movement opening or delayed leave', () => {
    const prevent = (e: React.MouseEvent) => e.preventDefault();
    const change = cy.stub().as('change');
    render(
      <Fixture
        openOnHover
        hoverDelay={100}
        onOpenChange={change}
        child={
          <button data-testid="trigger" onMouseMove={prevent} onMouseLeave={prevent}>
            Actions
          </button>
        }
      />,
    );
    cy.clock();
    cy.get(trigger).trigger('mousemove');
    cy.tick(100);
    cy.get(surface).should('be.visible');
    cy.get(trigger).trigger('mouseout', { relatedTarget: null });
    cy.tick(100);
    cy.get(surface).should('not.exist');
    cy.get('@change')
      .should('have.been.calledTwice')
      .then(() => {
        expect(change.firstCall.args[0].defaultPrevented).to.equal(true);
        expect(change.secondCall.args[0].defaultPrevented).to.equal(true);
      });
  });

  it('a disabled context currentTarget blocks nested context activation', () => {
    const change = cy.stub().as('change');
    render(
      <Fixture
        openOnContext
        onOpenChange={change}
        child={
          <div data-testid="trigger" aria-disabled="true">
            <span data-testid="nested">Nested target</span>
          </div>
        }
      />,
    );
    cy.get('[data-testid="nested"]').rightclick();
    cy.get(surface).should('not.exist');
    cy.get('@change').should('not.have.been.called');
  });

  it('replacing a child detaches its safe-zone listener and merges the latest callback ref', () => {
    const before = cy.stub().as('before-ref');
    const after = cy.stub().as('after-ref');
    const change = cy.stub().as('change');
    const value = context({ isSubmenu: true, openOnHover: true, setOpen: change });
    const Example = () => {
      const [replace, setReplace] = React.useState(false);
      return (
        <>
          <button data-testid="replace" onClick={() => setReplace(true)}>
            Replace
          </button>
          <MenuProvider value={value}>
            <MenuTrigger>
              <button key={String(replace)} data-testid="trigger" ref={replace ? after : before}>
                Actions
              </button>
            </MenuTrigger>
          </MenuProvider>
        </>
      );
    };
    render(<Example />);
    cy.get(trigger).then($el => {
      const old = $el[0];
      const remove = cy.spy(old, 'removeEventListener');
      cy.get('[data-testid="replace"]').click();
      cy.get(trigger).then($new => {
        expect($new[0]).not.to.equal(old);
        expect(value.triggerRef.current).to.equal($new[0]);
        expect(before.lastCall.args[0]).to.equal(null);
        expect(after.lastCall.args[0]).to.equal($new[0]);
        expect(remove).to.have.been.calledWith('fuimenusafezonetimeout');
        old.dispatchEvent(new old.ownerDocument.defaultView!.Event('fuimenusafezonetimeout'));
      });
    });
    cy.get(trigger).trigger('mouseover');
    cy.get('@change').should('not.have.been.called');
    cy.get(trigger).trigger('fuimenusafezonetimeout').trigger('mouseover');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('custom enhanced trigger preserves consumer role and tabIndex', () => {
    render(
      <Fixture
        child={
          <CustomTrigger data-testid="trigger" role="menuitem" tabIndex={-1}>
            Custom
          </CustomTrigger>
        }
      />,
    );
    cy.get(trigger)
      .should('have.attr', 'role', 'menuitem')
      .and('have.attr', 'tabindex', '-1')
      .focus()
      .realPress('Enter');
    cy.get(first).should('be.focused').realPress('Escape');
    cy.get(trigger).should('be.focused');
  });

  it('default enhanced render-function trigger gets ARIA keyboard props and a usable ref', () => {
    render(
      <Fixture
        child={props => (
          <div {...props} data-testid="trigger">
            Actions
          </div>
        )}
      />,
    );
    cy.get(trigger).should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0').focus().realPress('Enter');
    cy.get(first).should('be.focused').realPress('Escape');
    cy.get(trigger).should('be.focused');
  });

  it('native trigger type is not rewritten and retains form submission behavior', () => {
    const submit = cy
      .stub()
      .callsFake((e: React.FormEvent) => e.preventDefault())
      .as('submit');
    render(
      <form onSubmit={submit}>
        <Fixture
          child={
            <button data-testid="trigger" type="submit" name="action" value="open">
              Actions
            </button>
          }
        />
      </form>,
    );
    cy.get(trigger)
      .should('have.attr', 'type', 'submit')
      .and('have.attr', 'name', 'action')
      .and('have.attr', 'value', 'open')
      .click();
    cy.get('@submit').should('have.been.calledOnce');
    cy.get(first).should('be.focused');
  });
});

describe('MenuTrigger tab order and accepted controlled requests', () => {
  [false, true].forEach(backwards => {
    it(`${backwards ? 'Shift+Tab' : 'Tab'} closes the menu and proceeds through the real trigger tab order`, () => {
      render(
        <>
          <button data-testid="before">Before</button>
          <Fixture />
          <button data-testid="after">After</button>
        </>,
      );
      cy.get(trigger).focus().realPress('Enter');
      cy.get(first)
        .should('be.focused')
        .realPress(backwards ? ['Shift', 'Tab'] : 'Tab');
      cy.get(surface).should('not.exist');
      cy.get(backwards ? '[data-testid="before"]' : '[data-testid="after"]').should('be.focused');
    });
  });

  [true, false].forEach(enhancement => {
    it(`accepted controlled requests update the child expansion and restore focus, enhancement=${enhancement}`, () => {
      const change = cy.stub().as('change');
      const Example = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <Fixture
            enhancement={enhancement}
            open={open}
            onOpenChange={(event, data) => {
              change(event, data);
              setOpen(data.open);
            }}
          />
        );
      };
      render(<Example />);
      cy.get(trigger).click();
      cy.get(trigger).should('have.attr', 'aria-expanded', 'true');
      cy.get(first).should('be.focused').realPress('Escape');
      cy.get(surface).should('not.exist');
      cy.get(trigger).should('be.focused');
      cy.get(trigger).should('not.have.attr', 'aria-expanded');
      cy.get('@change')
        .should('have.been.calledTwice')
        .then(() => {
          expect(change.firstCall.args[1].open).to.equal(true);
          expect(change.secondCall.args[1].open).to.equal(false);
        });
    });
  });

  it('a Fluent disabledFocusable button remains focusable but blocks activation until enabled', () => {
    const change = cy.stub().as('change');
    const Example = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <button data-testid="enable" onClick={() => setDisabled(false)}>
            Enable
          </button>
          <Fixture
            enhancement={false}
            onOpenChange={change}
            child={
              <Button data-testid="trigger" disabled={disabled} disabledFocusable={disabled}>
                Actions
              </Button>
            }
          />
        </>
      );
    };
    render(<Example />);
    cy.get(trigger).should('not.be.disabled').and('have.attr', 'aria-disabled', 'true').focus().realPress('Enter');
    cy.get(trigger).should('be.focused').realPress('Space');
    cy.get(trigger).click();
    cy.get('@change').should('not.have.been.called');
    cy.get(surface).should('not.exist');
    cy.get('[data-testid="enable"]').click();
    cy.get(trigger).focus().realPress('Enter');
    cy.get(first).should('be.focused');
    cy.get('@change').should('have.been.calledOnce');
  });
});
