import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Button } from '@fluentui/react-button';
import { Popover, PopoverSurface } from '@fluentui/react-popover';
import type { PopoverProps } from '@fluentui/react-popover';
import { PopoverTrigger } from './PopoverTrigger';
import type { PopoverTriggerProps } from './PopoverTrigger.types';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const trigger = () => cy.get('[data-test="trigger"]');
const surface = () => cy.get('[data-test="surface"]');
const closed = () => {
  trigger().should('have.attr', 'aria-expanded', 'false');
  surface().should('not.exist');
};
const opened = () => {
  trigger().should('have.attr', 'aria-expanded', 'true');
  surface().should('be.visible');
};

const Fixture = ({
  child = <button data-test="trigger">Trigger</button>,
  triggerProps,
  passive = false,
  ...props
}: Omit<PopoverProps, 'children'> & {
  child?: React.ReactElement;
  triggerProps?: Omit<PopoverTriggerProps, 'children'>;
  passive?: boolean;
}) => (
  <>
    <button data-test="before">Before</button>
    <Popover surfaceMotion={null} {...props}>
      <PopoverTrigger {...triggerProps}>{child}</PopoverTrigger>
      <PopoverSurface data-test="surface" aria-label="Details" tabIndex={passive ? -1 : undefined}>
        <h3>Popover content</h3>
        {passive ? <p>Non-interactive content</p> : <button data-test="action">Action</button>}
      </PopoverSurface>
    </Popover>
    <button data-test="after">After</button>
  </>
);

describe('PopoverTrigger documented scenarios (round 1)', () => {
  it('README/default: clones the button without a wrapper; click opens, focuses content and toggles closed', () => {
    mount(<Fixture />);
    closed();
    trigger().parent().children('button').should('have.length', 3);
    trigger().click();
    opened();
    cy.get('[data-test="action"]').should('be.focused');
    trigger().click();
    closed();
  });

  describe('PopoverTrigger accessibility and undocumented edges (round 2)', () => {
    it('native aria-disabled submit trigger stays tabbable but cancels all form actions and callbacks', () => {
      const submits = cy.stub().as('submits');
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(
        <form
          onSubmit={event => {
            event.preventDefault();
            submits();
          }}
        >
          <Fixture
            onOpenChange={changes}
            child={
              <button type="submit" aria-disabled data-test="trigger" onClick={click}>
                Disabled submit
              </button>
            }
          />
        </form>,
      );
      cy.get('[data-test="before"]').focus();
      cy.realPress('Tab');
      trigger().should('be.focused').and('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
      cy.realPress('Enter');
      cy.realPress('Space');
      trigger().click();
      closed();
      cy.get('@submits').should('not.have.been.called');
      cy.get('@click').should('not.have.been.called');
      cy.get('@changes').should('not.have.been.called');
    });

    it('context-mode trigger-focused Escape dismisses after the consumer handler', () => {
      const keys = cy.stub().as('keys');
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          openOnContext
          defaultOpen
          unstable_disableAutoFocus
          onOpenChange={changes}
          child={
            <button data-test="trigger" onKeyDown={event => keys(event.key)}>
              Context trigger
            </button>
          }
        />,
      );
      trigger().focus().realPress('Escape');
      closed();
      trigger().should('be.focused');
      cy.get('@keys').should('have.been.calledOnceWithExactly', 'Escape');
      cy.get('@changes').should('have.been.calledOnce');
      cy.get('@changes').then(() => expect(changes.firstCall.args[1]).to.deep.equal({ open: false }));
    });

    it('child-prevented click still toggles and forwards a prevented event after the consumer handler', () => {
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          onOpenChange={(event, data) => changes(event.type, event.defaultPrevented, data)}
          child={
            <button
              data-test="trigger"
              onClick={event => {
                event.preventDefault();
                click(event.currentTarget.dataset.test);
              }}
            >
              Prevented click
            </button>
          }
        />,
      );
      trigger().click();
      opened();
      cy.get('@click').should('have.been.calledOnceWithExactly', 'trigger');
      cy.get('@changes').should('have.been.calledOnceWithExactly', 'click', true, { open: true });
      cy.then(() => expect(click).to.have.been.calledBefore(changes));
    });

    (['Enter', 'Space'] as const).forEach(key => {
      it(`enhanced div activates once by native ${key}, exposes button semantics and restores focus`, () => {
        const click = cy.stub().as('click');
        const changes = cy.stub().as('changes');
        mount(
          <Fixture
            onOpenChange={changes}
            child={
              <div data-test="trigger" onClick={click}>
                Enhanced trigger
              </div>
            }
          />,
        );
        trigger().should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
        cy.get('[data-test="before"]').focus();
        cy.realPress('Tab');
        trigger().should('be.focused');
        cy.realPress(key);
        opened();
        cy.get('@click').should('have.been.calledOnce');
        cy.get('@changes').should('have.been.calledOnce');
        cy.realPress('Escape');
        closed();
        trigger().should('be.focused');
      });
    });

    it('native disabled button is skipped by Tab and rejects pointer/key callbacks', () => {
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          onOpenChange={changes}
          child={
            <button disabled data-test="trigger" onClick={click}>
              Disabled trigger
            </button>
          }
        />,
      );
      trigger().should('be.disabled');
      cy.get('[data-test="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-test="after"]').should('be.focused');
      trigger().click({ force: true }).trigger('keydown', { key: 'Enter', force: true });
      closed();
      cy.get('@click').should('not.have.been.called');
      cy.get('@changes').should('not.have.been.called');
    });

    ['true', true].forEach(disabled => {
      it(`aria-disabled ${typeof disabled} div remains tabbable but rejects click/Enter/Space`, () => {
        const click = cy.stub().as('click');
        const changes = cy.stub().as('changes');
        mount(
          <Fixture
            onOpenChange={changes}
            child={
              <div aria-disabled={disabled as true | 'true'} data-test="trigger" onClick={click}>
                Disabled
              </div>
            }
          />,
        );
        cy.get('[data-test="before"]').focus();
        cy.realPress('Tab');
        trigger().should('be.focused').and('have.attr', 'aria-disabled', 'true');
        cy.realPress('Enter');
        cy.realPress('Space');
        trigger().click();
        closed();
        cy.get('@click').should('not.have.been.called');
        cy.get('@changes').should('not.have.been.called');
      });
    });

    it('disabledFocusable Fluent button stays in native Tab order without activation callbacks', () => {
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          onOpenChange={changes}
          triggerProps={{ disableButtonEnhancement: true }}
          child={
            <Button disabledFocusable data-test="trigger" onClick={click}>
              Disabled focusable
            </Button>
          }
        />,
      );
      cy.get('[data-test="before"]').focus();
      cy.realPress('Tab');
      trigger().should('be.focused').and('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
      cy.realPress('Enter');
      cy.realPress('Space');
      trigger().click();
      closed();
      cy.get('@click').should('not.have.been.called');
      cy.get('@changes').should('not.have.been.called');
    });

    it('aria-disabled anchor loses href, preserves explicit tabIndex and rejects activation/navigation', () => {
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          onOpenChange={changes}
          child={
            <a href="#disabled-navigation" aria-disabled tabIndex={0} data-test="trigger">
              Disabled link
            </a>
          }
        />,
      );
      trigger().should('not.have.attr', 'href');
      trigger().should('have.attr', 'role', 'link');
      cy.get('[data-test="before"]').focus();
      cy.realPress('Tab');
      trigger().should('be.focused');
      cy.realPress('Enter');
      cy.realPress('Space');
      trigger().click();
      closed();
      cy.get('@changes').should('not.have.been.called');
    });

    it('prevented enhanced Enter/Space does not activate or notify the open callback', () => {
      const keys = cy.stub().as('keys');
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          onOpenChange={changes}
          child={
            <div
              data-test="trigger"
              onKeyDown={event => {
                keys(event.key, event.currentTarget.dataset.test);
                event.preventDefault();
              }}
              onKeyUp={event => event.preventDefault()}
            >
              Cancelled
            </div>
          }
        />,
      );
      trigger().focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      closed();
      cy.get('@changes').should('not.have.been.called');
      cy.get('@keys').should('have.been.calledWithExactly', 'Enter', 'trigger');
      cy.get('@keys').should('have.been.calledWithExactly', ' ', 'trigger');
    });

    it('child-prevented Escape on the trigger retains open state with no dismissal callback', () => {
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          defaultOpen
          unstable_disableAutoFocus
          onOpenChange={changes}
          child={
            <button
              data-test="trigger"
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                }
              }}
            >
              Cancel Escape
            </button>
          }
        />,
      );
      trigger().focus().realPress('Escape');
      opened();
      trigger().should('be.focused');
      cy.get('@changes').should('not.have.been.called');
    });

    it('closed Escape and navigation keys preserve focus and produce no open requests', () => {
      const keys = cy.stub().as('keys');
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          onOpenChange={changes}
          child={
            <button data-test="trigger" onKeyDown={event => keys(event.key)}>
              Trigger
            </button>
          }
        />,
      );
      trigger().focus();
      (['Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'] as const).forEach(key =>
        cy.realPress(key),
      );
      closed();
      trigger().should('be.focused');
      cy.get('@keys').should('have.callCount', 7);
      cy.get('@changes').should('not.have.been.called');
    });

    it('hover and context consumer callbacks are preserved when opening modes are off, without notifications', () => {
      const enter = cy.stub().as('enter');
      const leave = cy.stub().as('leave');
      const context = cy.stub().as('context');
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          onOpenChange={changes}
          child={
            <button data-test="trigger" onMouseEnter={enter} onMouseLeave={leave} onContextMenu={context}>
              Trigger
            </button>
          }
        />,
      );
      trigger().trigger('mouseover').trigger('mouseout', { relatedTarget: null });
      cy.get('@enter').should('have.been.calledOnce');
      cy.get('@leave').should('have.been.calledOnce');
      trigger().rightclick();
      closed();
      cy.get('@context').should('have.been.calledOnce');
      cy.get('@changes').should('not.have.been.called');
    });

    it('current context mode ignores native Enter/Space; right click still opens', () => {
      const changes = cy.stub().as('changes');
      mount(<Fixture openOnContext onOpenChange={changes} />);
      trigger().focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      closed();
      cy.get('@changes').should('not.have.been.called');
      trigger().rightclick();
      opened();
      cy.get('@changes').should('have.been.calledOnce');
    });

    it('hover timeout is cancelled on trigger reentry without a stale closing request', () => {
      cy.clock();
      const changes = cy.stub().as('changes');
      mount(<Fixture openOnHover mouseLeaveDelay={100} onOpenChange={changes} />);
      trigger().trigger('mouseover');
      opened();
      trigger().trigger('mouseout', { relatedTarget: null });
      cy.tick(99);
      trigger().trigger('mouseover');
      cy.tick(101);
      opened();
      cy.get('@changes').should('have.callCount', 2);
      cy.get('@changes').then(() =>
        expect(changes.getCalls().map(call => call.args[1])).to.deep.equal([{ open: true }, { open: true }]),
      );
    });

    it('render-function child receives injected ARIA/ref/events and activates by keyboard', () => {
      const click = cy.stub().as('click');
      mount(
        <Popover surfaceMotion={null}>
          <PopoverTrigger>
            {props => (
              <button
                {...props}
                ref={props.ref as React.Ref<HTMLButtonElement>}
                data-test="trigger"
                onClick={event => {
                  click(event.currentTarget.dataset.test);
                  props.onClick?.(event);
                }}
              >
                Render trigger
              </button>
            )}
          </PopoverTrigger>
          <PopoverSurface data-test="surface">
            <button>Action</button>
          </PopoverSurface>
        </Popover>,
      );
      trigger().should('have.attr', 'aria-expanded', 'false').focus().realPress('Enter');
      opened();
      cy.get('@click').should('have.been.calledOnceWithExactly', 'trigger');
      cy.realPress('Escape');
      closed();
      trigger().should('be.focused');
    });
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`default native keyboard ${key} opens and Escape restores trigger focus`, () => {
      mount(<Fixture />);
      cy.get('[data-test="before"]').focus();
      cy.realPress('Tab');
      trigger().should('be.focused');
      cy.realPress(key);
      opened();
      cy.get('[data-test="action"]').should('be.focused');
      cy.realPress('Escape');
      closed();
      trigger().should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-test="before"]').should('be.focused');
    });
  });

  it('NonInteractiveContent: named tabindex=-1 surface receives focus and Escape returns it', () => {
    mount(<Fixture passive />);
    trigger().focus().realPress('Enter');
    surface().should('be.focused').and('have.attr', 'aria-label', 'Details');
    cy.realPress('Escape');
    closed();
    trigger().should('be.focused');
  });

  it('CustomTrigger: a forwarding custom component receives expanded state and injected interactions', () => {
    const Custom = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => (
      <button {...props} ref={ref} />
    ));
    const ref = React.createRef<HTMLButtonElement>();
    mount(
      <Fixture
        child={
          <Custom ref={ref} data-test="trigger">
            Custom Trigger
          </Custom>
        }
      />,
    );
    trigger().then($el => expect(ref.current).to.equal($el[0]));
    trigger().focus().realPress('Enter');
    opened();
    cy.realPress('Escape');
    trigger().should('be.focused');
  });

  it('ControllingOpenAndClose: accepting requests updates the controlled state and callback envelope', () => {
    const changes = cy.stub().as('changes');
    const Controlled = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <Fixture
          open={open}
          onOpenChange={(event, data) => {
            changes(event.type, data);
            setOpen(data.open);
          }}
          child={<Button data-test="trigger">Controlled trigger</Button>}
          triggerProps={{ disableButtonEnhancement: true }}
        />
      );
    };
    mount(<Controlled />);
    trigger().click();
    opened();
    cy.get('@changes').should('have.been.calledOnceWithExactly', 'click', { open: true });
    cy.realPress('Escape');
    closed();
    cy.get('@changes').should('have.been.calledWithExactly', 'keydown', { open: false });
    cy.get('@changes').should('have.callCount', 2);
  });

  it('TrappingFocus: modal surface traps native Tab/shiftTab and releases on Escape', () => {
    mount(<Fixture trapFocus />);
    trigger().focus().realPress('Enter');
    surface().should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
    cy.get('[data-test="action"]').should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-test="action"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get('[data-test="action"]').should('be.focused');
    cy.realPress('Escape');
    closed();
    trigger().should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-test="after"]').should('be.focused');
  });

  it('Spec hover: enter opens, leave closes after the configured delay, retaining consumer handlers', () => {
    cy.clock();
    const enter = cy.stub().as('enter');
    const leave = cy.stub().as('leave');
    const changes = cy.stub().as('changes');
    mount(
      <Fixture
        openOnHover
        mouseLeaveDelay={25}
        onOpenChange={changes}
        child={
          <button data-test="trigger" onMouseEnter={enter} onMouseLeave={leave}>
            Trigger
          </button>
        }
      />,
    );
    trigger().trigger('mouseover');
    opened();
    cy.get('@enter').should('have.been.calledOnce');
    trigger().trigger('mouseout', { relatedTarget: null });
    cy.tick(24);
    opened();
    cy.get('@changes').should('have.been.calledOnce');
    cy.tick(1);
    closed();
    cy.get('@leave').should('have.been.calledOnce');
    cy.get('@changes').should('have.callCount', 2);
  });

  it('Spec hover: entering content cancels trigger leave and surface leave starts a new delay', () => {
    cy.clock();
    const changes = cy.stub().as('changes');
    mount(<Fixture openOnHover mouseLeaveDelay={100} onOpenChange={changes} />);
    trigger().trigger('mouseover');
    opened();
    trigger().trigger('mouseout', { relatedTarget: null });
    cy.tick(50);
    surface().trigger('mouseover');
    cy.tick(100);
    opened();
    surface().trigger('mouseout', { relatedTarget: null });
    cy.tick(99);
    opened();
    cy.tick(1);
    closed();
    cy.get('@changes').should('have.callCount', 3);
  });

  it('ControllingOpenAndClose: rejected requests cannot mutate open and external state changes need no callback', () => {
    const changes = cy.stub().as('changes');
    const Controlled = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <Fixture open={open} onOpenChange={changes} unstable_disableAutoFocus />
          <button data-test="external" onClick={() => setOpen(value => !value)}>
            External toggle
          </button>
        </>
      );
    };
    mount(<Controlled />);
    trigger().click();
    closed();
    cy.get('@changes').should('have.been.calledOnce');
    cy.then(() => changes.resetHistory());
    cy.get('[data-test="external"]').click();
    opened();
    cy.get('@changes').should('not.have.been.called');
    trigger().focus().realPress('Escape');
    opened();
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(() => expect(changes.firstCall.args[1]).to.deep.equal({ open: false }));
  });

  it('NestedPopovers: inner Escape only closes inner and restores its trigger before outer Escape', () => {
    const Inner = () => (
      <Popover trapFocus surfaceMotion={null}>
        <PopoverTrigger>
          <button data-test="inner-trigger">Inner trigger</button>
        </PopoverTrigger>
        <PopoverSurface data-test="inner-surface" aria-label="Inner">
          <button data-test="inner-action">Inner action</button>
        </PopoverSurface>
      </Popover>
    );
    mount(
      <Popover trapFocus surfaceMotion={null}>
        <PopoverTrigger>
          <button data-test="outer-trigger">Outer trigger</button>
        </PopoverTrigger>
        <PopoverSurface data-test="outer-surface" aria-label="Outer">
          <button data-test="outer-action">Outer action</button>
          <Inner />
        </PopoverSurface>
      </Popover>,
    );
    cy.get('[data-test="outer-trigger"]').focus().realPress('Enter');
    cy.get('[data-test="outer-action"]').should('be.focused');
    cy.realPress('Tab');
    cy.get('[data-test="inner-trigger"]').should('be.focused');
    cy.realPress('Enter');
    cy.get('[data-test="inner-action"]').should('be.focused');
    cy.realPress('Escape');
    cy.get('[data-test="inner-surface"]').should('not.exist');
    cy.get('[data-test="inner-trigger"]').should('have.attr', 'aria-expanded', 'false').and('be.focused');
    cy.get('[data-test="outer-surface"]').should('be.visible');
    cy.realPress('Escape');
    cy.get('[data-test="outer-surface"]').should('not.exist');
    cy.get('[data-test="outer-trigger"]').should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });

  it('Spec context: right click opens but left click does not toggle; consumer callback receives prevented event', () => {
    const context = cy.stub().as('context');
    const changes = cy.stub().as('changes');
    mount(
      <Fixture
        openOnContext
        onOpenChange={changes}
        child={
          <button data-test="trigger" onContextMenu={context}>
            Trigger
          </button>
        }
      />,
    );
    trigger().click();
    closed();
    cy.get('@changes').should('not.have.been.called');
    trigger().rightclick();
    opened();
    cy.get('@context').should('have.been.calledOnce');
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(stub => {
      const [event, data] = (stub as unknown as Cypress.Agent<sinon.SinonStub>).firstCall.args;
      expect(event.type).to.equal('contextmenu');
      expect(event.defaultPrevented).to.equal(true);
      expect(data).to.deep.equal({ open: true });
    });
    cy.realPress('Escape');
    closed();
  });

  it('Spec inline/defaultOpen: starts expanded, Escape on the trigger closes without auto-focus', () => {
    mount(<Fixture inline defaultOpen unstable_disableAutoFocus />);
    opened();
    surface()
      .parent()
      .should($parent => expect($parent.find('[data-test="trigger"]')).to.have.length(1));
    trigger().focus().realPress('Escape');
    closed();
    trigger().should('be.focused');
  });

  it('Spec outside click dismisses without reporting a second trigger click', () => {
    const click = cy.stub().as('click');
    mount(
      <Fixture
        child={
          <button data-test="trigger" onClick={click}>
            Trigger
          </button>
        }
      />,
    );
    trigger().click();
    opened();
    cy.get('[data-test="after"]').click();
    closed();
    cy.get('@click').should('have.been.calledOnce');
  });

  ['default', 'brand', 'inverted'].forEach(appearance => {
    it(`Appearance ${appearance} and WithArrow preserve trigger activation`, () => {
      mount(<Fixture appearance={appearance as PopoverProps['appearance']} withArrow />);
      trigger().focus().realPress('Enter');
      opened();
      surface().children().first().should('have.prop', 'tagName', 'DIV');
      cy.realPress('Escape');
      closed();
    });
  });

  describe('PopoverTrigger unit-derived and lifecycle browser contracts (round 3)', () => {
    it('unit aria-expanded undefined override stays absent through a real open/close cycle', () => {
      mount(
        <Fixture
          child={
            <button data-test="trigger" aria-expanded={undefined}>
              Override
            </button>
          }
        />,
      );
      trigger().should('not.have.attr', 'aria-expanded');
      trigger().click();
      surface().should('be.visible');
      trigger().should('not.have.attr', 'aria-expanded');
      cy.realPress('Escape');
      surface().should('not.exist');
      trigger().should('not.have.attr', 'aria-expanded');
      trigger().should('be.focused');
    });

    it('unit consumer aria-expanded override wins even when parent context is closed', () => {
      mount(
        <Fixture
          child={
            <button data-test="trigger" aria-expanded="true">
              Override
            </button>
          }
        />,
      );
      trigger().should('have.attr', 'aria-expanded', 'true');
      surface().should('not.exist');
      trigger().click();
      surface().should('be.visible');
      cy.realPress('Escape');
      surface().should('not.exist');
      trigger().should('have.attr', 'aria-expanded', 'true');
    });

    it('unit child object ref and native id/class/title/ARIA/data attributes survive cloning and opening', () => {
      const ref = React.createRef<HTMLButtonElement>();
      mount(
        <Fixture
          child={
            <button
              ref={ref}
              data-test="trigger"
              id="native-trigger"
              className="consumer-trigger"
              title="Details title"
              aria-label="Open details"
              aria-describedby="trigger-help"
              data-consumer="retained"
            >
              Visible text
            </button>
          }
        />,
      );
      trigger().should('have.attr', 'id', 'native-trigger').and('have.class', 'consumer-trigger');
      trigger().should('have.attr', 'title', 'Details title').and('have.attr', 'aria-label', 'Open details');
      trigger().should('have.attr', 'aria-describedby', 'trigger-help').and('have.attr', 'data-consumer', 'retained');
      trigger().then($el => expect(ref.current).to.equal($el[0]));
      trigger().click();
      opened();
      cy.realPress('Escape');
      trigger()
        .should('be.focused')
        .then($el => expect(ref.current).to.equal($el[0]));
    });

    it('unit child callback ref clears on replacement/unmount and the new target restores focus', () => {
      const first = cy.stub().as('firstRef');
      const second = cy.stub().as('secondRef');
      let setStage: React.Dispatch<React.SetStateAction<number>>;
      const Lifecycle = () => {
        const [stage, update] = React.useState(0);
        setStage = update;
        return stage === 2 ? (
          <p data-test="unmounted">Unmounted</p>
        ) : (
          <Fixture
            child={
              <button key={stage} ref={stage === 0 ? first : second} data-test="trigger">
                Stage {stage}
              </button>
            }
          />
        );
      };
      mount(<Lifecycle />);
      trigger().then($el => expect(first.lastCall.args[0]).to.equal($el[0]));
      cy.then(() => setStage(1));
      trigger()
        .should('have.text', 'Stage 1')
        .then($el => {
          expect(first.lastCall.args[0]).to.equal(null);
          expect(second.lastCall.args[0]).to.equal($el[0]);
        });
      trigger().focus().realPress('Enter');
      opened();
      cy.realPress('Escape');
      trigger().should('be.focused');
      cy.then(() => setStage(2));
      cy.get('[data-test="unmounted"]').should('exist');
      cy.then(() => expect(second.lastCall.args[0]).to.equal(null));
    });

    it('unit merged handlers use the latest five child callbacks and currentTarget after rerender', () => {
      const events = cy.stub().as('events');
      let setVersion: React.Dispatch<React.SetStateAction<number>>;
      const Current = () => {
        const [version, update] = React.useState(0);
        setVersion = update;
        const record = (event: React.SyntheticEvent<HTMLButtonElement>) =>
          events(version, event.type, event.currentTarget.dataset.version);
        return (
          <Fixture
            child={
              <button
                data-test="trigger"
                data-version={version}
                onClick={record}
                onContextMenu={record}
                onKeyDown={record}
                onMouseEnter={record}
                onMouseLeave={record}
              >
                Version {version}
              </button>
            }
          />
        );
      };
      mount(<Current />);
      trigger().should('have.text', 'Version 0');
      cy.then(() => setVersion(1));
      trigger().should('have.text', 'Version 1').trigger('mouseover').trigger('mouseout', { relatedTarget: null });
      trigger().trigger('contextmenu').focus().realPress('ArrowDown');
      trigger().click();
      opened();
      cy.get('@events').then(() => {
        const calls = events.getCalls().map(call => call.args);
        expect(calls.every(args => args[0] === 1 && args[2] === '1')).to.equal(true);
        ['mouseenter', 'mouseleave', 'contextmenu', 'keydown', 'click'].forEach(type =>
          expect(
            calls.some(args => args[1] === type),
            type,
          ).to.equal(true),
        );
      });
    });

    it('parent callback is current after rerender and sees the child handler before each exact request', () => {
      const order = cy.stub().as('order');
      let setVersion: React.Dispatch<React.SetStateAction<number>>;
      const Current = () => {
        const [version, update] = React.useState(0);
        setVersion = update;
        return (
          <Fixture
            unstable_disableAutoFocus
            onOpenChange={(event, data) => order('parent', version, event.type, data.open)}
            child={
              <button data-test="trigger" onClick={() => order('child', version)}>
                Trigger
              </button>
            }
          />
        );
      };
      mount(<Current />);
      trigger().should('exist');
      cy.then(() => setVersion(1));
      trigger().click();
      opened();
      trigger().click();
      closed();
      cy.get('@order').then(() =>
        expect(order.getCalls().map(call => call.args)).to.deep.equal([
          ['child', 1],
          ['parent', 1, 'click', true],
          ['child', 1],
          ['parent', 1, 'click', false],
        ]),
      );
    });

    it('changed context/hover flags take effect on the existing child instead of stale closures', () => {
      let setMode: React.Dispatch<React.SetStateAction<'click' | 'context' | 'hover'>>;
      const Current = () => {
        const [mode, update] = React.useState<'click' | 'context' | 'hover'>('click');
        setMode = update;
        return (
          <Fixture
            openOnContext={mode === 'context'}
            openOnHover={mode === 'hover'}
            mouseLeaveDelay={0}
            child={
              <button data-test="trigger" data-mode={mode}>
                Trigger
              </button>
            }
          />
        );
      };
      mount(<Current />);
      trigger().should('have.attr', 'data-mode', 'click');
      cy.then(() => setMode('context'));
      trigger().should('have.attr', 'data-mode', 'context').click();
      closed();
      trigger().rightclick();
      opened();
      cy.realPress('Escape');
      closed();
      cy.then(() => setMode('hover'));
      trigger().should('have.attr', 'data-mode', 'hover').trigger('mouseover');
      opened();
      trigger().trigger('mouseout', { relatedTarget: null });
      closed();
      cy.then(() => setMode('click'));
      trigger().should('have.attr', 'data-mode', 'click').trigger('mouseover');
      closed();
      trigger().click();
      opened();
    });

    it('defaultOpen is initialization-only and ignores later changes on the same popover', () => {
      let setDefault: React.Dispatch<React.SetStateAction<boolean>>;
      const Defaults = () => {
        const [defaultOpen, update] = React.useState(false);
        setDefault = update;
        return (
          <Fixture
            defaultOpen={defaultOpen}
            child={
              <button data-test="trigger" data-default={String(defaultOpen)}>
                Trigger
              </button>
            }
          />
        );
      };
      mount(<Defaults />);
      trigger().should('have.attr', 'data-default', 'false');
      cy.then(() => setDefault(true));
      trigger().should('have.attr', 'data-default', 'true');
      closed();
      trigger().click();
      opened();
      cy.realPress('Escape');
      closed();
      cy.then(() => setDefault(false));
      trigger().should('have.attr', 'data-default', 'false');
      closed();
    });

    it('unmounting during a pending hover close clears the timeout without a callback after removal', () => {
      cy.clock();
      const changes = cy.stub().as('changes');
      let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
      const Lifecycle = () => {
        const [visible, update] = React.useState(true);
        setVisible = update;
        return visible ? (
          <Fixture openOnHover mouseLeaveDelay={100} onOpenChange={changes} />
        ) : (
          <p data-test="unmounted">Unmounted</p>
        );
      };
      mount(<Lifecycle />);
      trigger().trigger('mouseover');
      opened();
      trigger().trigger('mouseout', { relatedTarget: null });
      cy.then(() => setVisible(false));
      cy.get('[data-test="unmounted"]').should('exist');
      cy.tick(100);
      surface().should('not.exist');
      cy.get('@changes').should('have.been.calledOnce');
    });

    it('native enabled submit button preserves form submission while opening exactly once', () => {
      const submits = cy.stub().as('submits');
      const changes = cy.stub().as('changes');
      mount(
        <form
          onSubmit={event => {
            event.preventDefault();
            submits();
          }}
        >
          <Fixture
            onOpenChange={changes}
            child={
              <button type="submit" name="details" value="show" data-test="trigger">
                Submit and open
              </button>
            }
          />
        </form>,
      );
      trigger().should('have.attr', 'type', 'submit').and('have.attr', 'name', 'details');
      trigger().should('have.attr', 'value', 'show').focus().realPress('Enter');
      opened();
      cy.get('@submits').should('have.been.calledOnce');
      cy.get('@changes').should('have.been.calledOnce');
    });

    it('null child renders no trigger DOM and can be replaced with a working trigger', () => {
      let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
      const Empty = () => {
        const [visible, update] = React.useState(false);
        setVisible = update;
        return (
          <div data-test="empty-mounted">
            <Popover surfaceMotion={null}>
              <PopoverTrigger>{visible ? <button data-test="trigger">Added trigger</button> : null}</PopoverTrigger>
              <PopoverSurface data-test="surface">
                <button>Action</button>
              </PopoverSurface>
            </Popover>
          </div>
        );
      };
      mount(<Empty />);
      cy.get('[data-test="empty-mounted"]').should('exist');
      trigger().should('not.exist');
      surface().should('not.exist');
      cy.then(() => setVisible(true));
      trigger().should('have.attr', 'aria-expanded', 'false').focus().realPress('Space');
      opened();
      cy.realPress('Escape');
      closed();
    });

    [false, true].forEach(openOnContext => {
      it(`nested trigger-focused Escape closes inner only with context=${openOnContext}`, () => {
        const outerChanges = cy.stub().as('outerChanges');
        const innerChanges = cy.stub().as('innerChanges');
        const Inner = () => (
          <Popover
            openOnContext={openOnContext}
            unstable_disableAutoFocus
            surfaceMotion={null}
            onOpenChange={innerChanges}
          >
            <PopoverTrigger>
              <button data-test="inner-trigger">Inner trigger</button>
            </PopoverTrigger>
            <PopoverSurface data-test="inner-surface" aria-label="Inner">
              <button>Inner action</button>
            </PopoverSurface>
          </Popover>
        );
        mount(
          <Popover surfaceMotion={null} onOpenChange={outerChanges}>
            <PopoverTrigger>
              <button data-test="outer-trigger">Outer trigger</button>
            </PopoverTrigger>
            <PopoverSurface data-test="outer-surface" aria-label="Outer">
              <Inner />
            </PopoverSurface>
          </Popover>,
        );
        cy.get('[data-test="outer-trigger"]').focus().realPress('Enter');
        cy.get('[data-test="inner-trigger"]').should('be.focused');
        if (openOnContext) {
          cy.get('[data-test="inner-trigger"]').rightclick();
        } else {
          cy.realPress('Enter');
        }
        cy.get('[data-test="inner-surface"]').should('be.visible');
        cy.get('[data-test="inner-trigger"]').should('be.focused');
        cy.then(() => {
          outerChanges.resetHistory();
          innerChanges.resetHistory();
        });
        cy.realPress('Escape');
        cy.get('[data-test="inner-surface"]').should('not.exist');
        cy.get('[data-test="inner-trigger"]').should('have.attr', 'aria-expanded', 'false').and('be.focused');
        cy.get('[data-test="outer-surface"]').should('be.visible');
        cy.get('[data-test="outer-trigger"]').should('have.attr', 'aria-expanded', 'true');
        cy.get('@outerChanges').should('not.have.been.called');
        cy.get('@innerChanges').should('have.been.calledOnce');
        cy.get('@innerChanges').then(() => expect(innerChanges.firstCall.args[1]).to.deep.equal({ open: false }));
      });
    });

    it('context child-prevented Escape retains open state and reports no request in the browser', () => {
      const changes = cy.stub().as('changes');
      mount(
        <Fixture
          openOnContext
          defaultOpen
          unstable_disableAutoFocus
          onOpenChange={changes}
          child={
            <button data-test="trigger" onKeyDown={event => event.preventDefault()}>
              Cancelled context
            </button>
          }
        />,
      );
      trigger().focus().realPress('Escape');
      opened();
      cy.get('@changes').should('not.have.been.called');
    });
  });
});
