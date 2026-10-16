import 'cypress-real-events';
import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Button } from '@fluentui/react-button';
import { Tooltip } from './index';
import { getByRole } from '@testing-library/dom';
import { useTooltipCallerStyles } from '../../testing/Tooltip.cy.styles';
import type { TooltipProps } from './Tooltip.types';
import type { SlotRenderFunction } from '@fluentui/react-utilities';

const mount = (element: React.ReactElement) => {
  return mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const tooltip = () => cy.get('[role="tooltip"]');
const wrap = (element: React.ReactElement) => <FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>;
const color = (hex: string) => {
  const value = hex.replace('#', '');
  return `rgb(${[0, 2, 4].map(start => parseInt(value.slice(start, start + 2), 16)).join(', ')})`;
};
const centered = (element: React.ReactElement) => (
  <div style={{ position: 'fixed', top: '40%', left: '40%' }}>{element}</div>
);

const hoverTrigger = () => {
  cy.get('body').realHover({ position: 'bottomRight' });
  cy.get('#trigger').realHover();
};

describe('Tooltip meaningful unit-derived browser contracts', () => {
  it('uses the latest visibility callback when pending show and hide timers cross rerenders', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    const initial = cy.stub().as('pendingInitial');
    const shown = cy.stub().as('pendingShown');
    const hidden = cy.stub().as('pendingHidden');
    const render = (callback: TooltipProps['onVisibleChange'], version: string) => (
      <Tooltip content="Pending callbacks" relationship="label" onVisibleChange={callback}>
        <Button id="trigger" data-version={version}>
          Trigger
        </Button>
      </Tooltip>
    );
    mount(render(initial, 'initial')).then(({ rerender }) => {
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
      cy.tick(100);
      cy.then(() => rerender(wrap(render(shown, 'shown'))));
      cy.get('#trigger').should('have.attr', 'data-version', 'shown');
      cy.tick(149);
      tooltip().should('not.exist');
      cy.tick(1);
      tooltip().should('be.visible');
      cy.get('@pendingInitial').should('not.have.been.called');
      cy.get('@pendingShown').should('have.been.calledOnce');
      cy.then(() => expect(shown.firstCall.args[1]).to.deep.equal({ visible: true }));
      cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
      cy.tick(100);
      cy.then(() => rerender(wrap(render(hidden, 'hidden'))));
      cy.get('#trigger').should('have.attr', 'data-version', 'hidden');
      cy.tick(149);
      tooltip().should('be.visible');
      cy.tick(1);
      tooltip().should('not.exist');
      cy.get('@pendingInitial').should('not.have.been.called');
      cy.get('@pendingShown').should('have.been.calledOnce');
      cy.get('@pendingHidden').should('have.been.calledOnce');
      cy.then(() => expect(hidden.firstCall.args[1]).to.deep.equal({ visible: false }));
    });
  });

  it('uses the latest visibility callback in an installed native Escape listener', () => {
    const initial = cy.stub().as('listenerInitial');
    const latest = cy.stub().as('listenerLatest');
    const render = (callback: TooltipProps['onVisibleChange'], version: string) =>
      centered(
        <>
          <button id="listener-before">Before</button>
          <Tooltip content="Listener callbacks" relationship="label" onVisibleChange={callback}>
            <Button id="trigger" data-version={version}>
              Trigger
            </Button>
          </Tooltip>
        </>,
      );
    mount(render(initial, 'initial')).then(({ rerender }) => {
      cy.get('#listener-before').focus();
      cy.realPress('Tab');
      cy.get('#trigger').should('be.focused');
      tooltip().should('be.visible');
      cy.get('@listenerInitial').should('have.been.calledOnce');
      cy.then(() => rerender(wrap(render(latest, 'latest'))));
      cy.get('#trigger').should('have.attr', 'data-version', 'latest');
      cy.realPress('Escape');
      tooltip().should('not.exist');
      cy.get('@listenerInitial').should('have.been.calledOnce');
      cy.get('@listenerLatest').should('have.been.calledOnce');
      cy.get('#trigger').then($trigger => {
        expect(latest.firstCall.args[0]).to.equal(undefined);
        const data = latest.firstCall.args[1];
        expect(data.visible).to.equal(false);
        expect(data.documentKeyboardEvent).to.be.instanceOf($trigger[0].ownerDocument.defaultView!.KeyboardEvent);
        expect(data.documentKeyboardEvent.key).to.equal('Escape');
        expect(data.documentKeyboardEvent.defaultPrevented).to.equal(true);
      });
    });
  });

  it('uses the latest visibility callback in tooltip-context handoff while visible', () => {
    const initial = cy.stub().as('handoffInitial');
    const latest = cy.stub().as('handoffLatest');
    const render = (callback: TooltipProps['onVisibleChange'], version: string) =>
      centered(
        <>
          <Tooltip content="First registered" relationship="label" onVisibleChange={callback}>
            <Button id="trigger" data-version={version}>
              First
            </Button>
          </Tooltip>
          <Tooltip content="Second registered" relationship="label" showDelay={0}>
            <Button id="second-trigger">Second</Button>
          </Tooltip>
        </>,
      );
    mount(render(initial, 'initial')).then(({ rerender }) => {
      hoverTrigger();
      tooltip().should('be.visible').and('have.text', 'First registered');
      cy.get('@handoffInitial').should('have.been.calledOnce');
      cy.then(() => rerender(wrap(render(latest, 'latest'))));
      cy.get('#trigger').should('have.attr', 'data-version', 'latest');
      cy.get('#second-trigger').realHover();
      tooltip().should('have.length', 1).and('have.text', 'Second registered').and('be.visible');
      cy.get('@handoffInitial').should('have.been.calledOnce');
      cy.get('@handoffLatest').should('have.been.calledOnce');
      cy.then(() =>
        expect(latest.firstCall.args).to.deep.equal([undefined, { visible: false, documentKeyboardEvent: undefined }]),
      );
    });
  });

  it('renders hidden formatted labels with a stable ID and computed accessible name', () => {
    mount(
      <Tooltip
        relationship="label"
        content={{
          children: (
            <span>
              This is <strong>formatted</strong> help
            </span>
          ),
          id: 'formatted-label',
        }}
      >
        <Button id="trigger" />
      </Tooltip>,
    );
    tooltip().should('have.id', 'formatted-label').and('not.be.visible').and('have.text', 'This is formatted help');
    cy.get('#trigger').should($trigger => {
      expect($trigger[0].getAttribute('aria-labelledby')).to.equal('formatted-label');
      expect(getByRole($trigger[0].ownerDocument.body, 'button', { name: 'This is formatted help' })).to.equal(
        $trigger[0],
      );
    });
    hoverTrigger();
    tooltip().should('be.visible').and('have.id', 'formatted-label');
  });

  for (const attribute of ['aria-label', 'aria-labelledby', 'aria-describedby'] as const) {
    it(`preserves caller ${attribute} precedence and restores generated semantics after omission`, () => {
      const render = (override: boolean) => (
        <>
          <span id="caller-label">Caller label</span>
          <span id="caller-description">Caller description</span>
          <Tooltip
            content="Tooltip information"
            relationship={attribute === 'aria-describedby' ? 'description' : 'label'}
          >
            <Button
              id="trigger"
              {...(override
                ? {
                    [attribute]:
                      attribute === 'aria-label'
                        ? 'Caller label'
                        : attribute === 'aria-labelledby'
                        ? 'caller-label'
                        : 'caller-description',
                  }
                : {})}
            >
              Visible
            </Button>
          </Tooltip>
        </>
      );
      mount(render(true)).then(({ rerender }) => {
        cy.get('#trigger').should($trigger => {
          expect(
            getByRole($trigger[0].ownerDocument.body, 'button', {
              name: attribute === 'aria-describedby' ? 'Visible' : 'Caller label',
              description: attribute === 'aria-describedby' ? 'Caller description' : '',
            }),
          ).to.equal($trigger[0]);
        });
        cy.then(() => rerender(wrap(render(false))));
        cy.get('#trigger').should($trigger => {
          expect(
            getByRole($trigger[0].ownerDocument.body, 'button', {
              name: attribute === 'aria-describedby' ? 'Visible' : 'Tooltip information',
              description: attribute === 'aria-describedby' ? 'Tooltip information' : '',
            }),
          ).to.equal($trigger[0]);
          if (attribute === 'aria-labelledby') {
            expect($trigger[0].hasAttribute(attribute)).to.equal(false);
          }
        });
      });
    });
  }

  it('updates simple label text before display and removes stale label text', () => {
    const render = (content: string) => (
      <Tooltip relationship="label" content={content}>
        <Button id="trigger" />
      </Tooltip>
    );
    mount(render('Initial label')).then(({ rerender }) => {
      cy.get('#trigger').should('have.attr', 'aria-label', 'Initial label');
      cy.then(() => rerender(wrap(render('Updated label'))));
      cy.get('#trigger').should('have.attr', 'aria-label', 'Updated label');
      tooltip().should('not.exist');
      hoverTrigger();
      tooltip().should('be.visible').and('have.text', 'Updated label');
    });
  });

  it('preserves trigger and content refs, clears content on hide and releases trigger on unmount', () => {
    const triggerRef = React.createRef<HTMLButtonElement>();
    const contentRef = React.createRef<HTMLDivElement>();
    const render = (visible: boolean) => (
      <Tooltip visible={visible} content={{ children: 'Referenced', ref: contentRef }} relationship="label">
        <Button id="trigger" ref={triggerRef}>
          Trigger
        </Button>
      </Tooltip>
    );
    mount(render(true)).then(({ rerender }) => {
      cy.get('#trigger').should($trigger => expect(triggerRef.current).to.equal($trigger[0]));
      tooltip().should($tip => expect(contentRef.current).to.equal($tip[0]));
      cy.then(() => rerender(wrap(render(false))));
      tooltip().should('not.exist');
      cy.get('#trigger').should($trigger => {
        expect(triggerRef.current).to.equal($trigger[0]);
        expect(contentRef.current).to.equal(null);
      });
      cy.then(() => rerender(wrap(<></>)));
      cy.get('#trigger').should('not.exist');
      cy.then(() => expect(triggerRef.current).to.equal(null));
    });
  });

  it('merges latest child pointer callbacks and visibility callbacks without stale handler invocation', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    const firstChild = cy.stub().as('firstChild');
    const secondChild = cy.stub().as('secondChild');
    const firstChanges = cy.stub().as('firstChanges');
    const secondChanges = cy.stub().as('secondChanges');
    const render = (child: (target: EventTarget) => void, changes: TooltipProps['onVisibleChange']) => (
      <Tooltip content="Latest callbacks" relationship="label" showDelay={0} hideDelay={0} onVisibleChange={changes}>
        <Button id="trigger" onPointerEnter={event => child(event.currentTarget)}>
          {child === firstChild ? 'Initial' : 'Updated'}
        </Button>
      </Tooltip>
    );
    mount(render(firstChild, firstChanges)).then(({ rerender }) => {
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
      cy.tick(0);
      tooltip().should('be.visible');
      cy.get('#trigger').then($trigger => expect(firstChild).to.have.been.calledOnceWithExactly($trigger[0]));
      cy.get('@firstChanges').should('have.been.calledOnce');
      cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
      cy.tick(0);
      tooltip().should('not.exist');
      cy.then(() => rerender(wrap(render(secondChild, secondChanges))));
      cy.get('#trigger').should('have.text', 'Updated');
      cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
      cy.tick(0);
      tooltip().should('be.visible');
      cy.get('@firstChild').should('have.been.calledOnce');
      cy.get('@firstChanges').should('have.been.calledTwice');
      cy.get('@secondChild').should('have.been.calledOnce');
      cy.get('@secondChanges').should('have.been.calledOnce');
    });
  });

  for (const popup of [true, 'menu', 'listbox', 'dialog'] as const) {
    it(`suppresses content for an expanded ${popup} popup and restores it on collapse`, () => {
      const render = (expanded: boolean | 'true' | 'false') => (
        <Tooltip visible content="Popup tooltip" relationship="label">
          <Button id="trigger" aria-haspopup={popup} aria-expanded={expanded}>
            Open
          </Button>
        </Tooltip>
      );
      mount(render(false)).then(({ rerender }) => {
        tooltip().should('be.visible');
        cy.then(() => rerender(wrap(render(true))));
        tooltip().should('not.exist');
        cy.then(() => rerender(wrap(render('true'))));
        tooltip().should('not.exist');
        cy.then(() => rerender(wrap(render('false'))));
        tooltip().should('be.visible');
      });
    });
  }

  it('supports trigger render functions with generated ARIA, pointer handlers and positioning refs', () => {
    mount(
      centered(
        <Tooltip content="Rendered trigger" relationship="description">
          {props => (
            <button {...props} ref={props.ref as React.Ref<HTMLButtonElement>} id="trigger">
              Custom trigger
            </button>
          )}
        </Tooltip>,
      ),
    );
    cy.get('#trigger').should($trigger => {
      expect(
        getByRole($trigger[0].ownerDocument.body, 'button', {
          name: 'Custom trigger',
          description: 'Rendered trigger',
        }),
      ).to.equal($trigger[0]);
    });
    hoverTrigger();
    tooltip().should('be.visible').and('have.attr', 'data-popper-placement', 'top');
  });

  it('supports content render functions while retaining slot ID, ref and native attrs', () => {
    const contentRef = React.createRef<HTMLDivElement>();
    const renderContent: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props}>
        <strong>Rendered content</strong>
      </Component>
    );
    mount(
      <Tooltip
        visible
        relationship="description"
        content={{
          children: renderContent,
          ref: contentRef,
          id: 'rendered-content',
          title: 'Content title',
          ...{ 'data-testid': 'rendered-slot' },
        }}
      >
        <Button id="trigger">Trigger</Button>
      </Tooltip>,
    );
    tooltip()
      .should('have.id', 'rendered-content')
      .and('have.attr', 'title', 'Content title')
      .and('have.attr', 'data-testid', 'rendered-slot')
      .and('have.text', 'Rendered content')
      .should($tip => expect(contentRef.current).to.equal($tip[0]));
    cy.get('#trigger').should($trigger => {
      expect(
        getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Trigger', description: 'Content title' }),
      ).to.equal($trigger[0]);
    });
  });

  it('forwards native positioning completion details for actual DOM target clipping and recovery', () => {
    const events = cy.stub().as('positioningEvents');
    mount(
      <div id="unit-scroll" style={{ height: '100px', overflow: 'auto', position: 'relative' }}>
        <div style={{ height: '400px' }}>
          <Tooltip visible content="Positioning events" relationship="label" positioning={{ onPositioningEnd: events }}>
            <Button id="trigger">Trigger</Button>
          </Tooltip>
        </div>
      </div>,
    );
    tooltip().should('be.visible');
    cy.get('@positioningEvents').should('have.been.called');
    cy.get('#unit-scroll').scrollTo(0, 300);
    tooltip().should('have.css', 'visibility', 'hidden').and('have.css', 'pointer-events', 'none');
    cy.then(() => expect(events.lastCall.args[0].detail.referenceHidden).to.equal(true));
    cy.get('#unit-scroll').scrollTo(0, 0);
    tooltip().should('be.visible');
    cy.then(() => expect(events.lastCall.args[0].detail.referenceHidden).to.equal(false));
  });

  it('keeps a virtual target visible despite referenceHidden positioning flags', () => {
    const events = cy.stub().as('virtualEvents');
    const target = {
      getBoundingClientRect: () => ({
        x: 200,
        y: 200,
        left: 200,
        top: 200,
        right: 240,
        bottom: 240,
        width: 40,
        height: 40,
        toJSON: () => ({}),
      }),
    };
    mount(
      <Tooltip
        visible
        content="Virtual tooltip"
        relationship="label"
        positioning={{ target, onPositioningEnd: events }}
      >
        <Button id="trigger">Trigger</Button>
      </Tooltip>,
    );
    tooltip().should('be.visible');
    tooltip().then($tip => {
      events.resetHistory();
      const event = new $tip[0].ownerDocument.defaultView!.CustomEvent('fui-positioningend', {
        detail: { placement: 'top', escaped: true, referenceHidden: true },
      });
      $tip[0].dispatchEvent(event);
      expect(events).to.have.been.calledOnceWithExactly(event);
    });
    tooltip().should('be.visible').and('have.css', 'visibility', 'visible');
  });
});

describe('Tooltip supported edge and accessibility contracts', () => {
  it('preserves native trigger Enter and Space activation while keyboard tooltip visibility is active', () => {
    const activate = cy.stub().as('nativeActivate');
    mount(
      <>
        <button id="before">Before</button>
        <Tooltip content="Activation help" relationship="description">
          <Button id="trigger" onClick={activate}>
            Action
          </Button>
        </Tooltip>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    tooltip().should('be.visible');
    cy.realPress('Enter');
    cy.get('@nativeActivate').should('have.been.calledOnce');
    cy.realPress('Space');
    cy.get('@nativeActivate').should('have.been.calledTwice');
    cy.get('#trigger').should('be.focused');
    tooltip().should('be.visible');
  });

  it('restores default above placement after an explicit below-end positioning is omitted', () => {
    const render = (positioning?: TooltipProps['positioning']) =>
      centered(
        <Tooltip visible content="Position reset" relationship="label" positioning={positioning}>
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      );
    mount(render('below-end')).then(({ rerender }) => {
      tooltip().should('have.attr', 'data-popper-placement', 'bottom-end');
      cy.then(() => rerender(wrap(render())));
      tooltip().should('have.attr', 'data-popper-placement', 'top').and('be.visible');
    });
  });

  it('restores default delay boundaries after established custom delays are omitted', () => {
    cy.get('body').realHover({ position: 'bottomRight' });
    const render = (custom: boolean) => (
      <Tooltip
        content="Delay reset"
        relationship="label"
        showDelay={custom ? 600 : undefined}
        hideDelay={custom ? 800 : undefined}
      >
        <Button id="trigger" data-version={custom ? 'custom' : 'defaults'}>
          Trigger
        </Button>
      </Tooltip>
    );
    mount(render(true)).then(({ rerender }) => {
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
      cy.tick(599);
      tooltip().should('not.exist');
      cy.tick(1);
      tooltip().should('be.visible');
      cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
      cy.tick(799);
      tooltip().should('be.visible');
      cy.tick(1);
      tooltip().should('not.exist');
      cy.then(() => rerender(wrap(render(false))));
      cy.get('#trigger').should('have.attr', 'data-version', 'defaults');
      cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
      cy.tick(249);
      tooltip().should('not.exist');
      cy.tick(1);
      tooltip().should('be.visible');
      cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
      cy.tick(249);
      tooltip().should('be.visible');
      cy.tick(1);
      tooltip().should('not.exist');
    });
  });

  for (const [name, showDelay, hideDelay] of [
    ['default', undefined, undefined],
    ['custom', 600, 800],
  ] as const) {
    it(`honors exact ${name} show and hide delay boundaries`, () => {
      mount(
        <Tooltip content="Delayed tooltip" relationship="label" showDelay={showDelay} hideDelay={hideDelay}>
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      );
      cy.clock(0, ['setTimeout', 'clearTimeout']);
      cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
      cy.tick((showDelay ?? 250) - 1);
      tooltip().should('not.exist');
      cy.tick(1);
      tooltip().should('be.visible');
      cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
      cy.tick((hideDelay ?? 250) - 1);
      tooltip().should('be.visible');
      cy.tick(1);
      tooltip().should('not.exist');
    });
  }

  it('supports zero delays without treating zero as an omitted default', () => {
    mount(
      <Tooltip content="Immediate tooltip" relationship="label" showDelay={0} hideDelay={0}>
        <Button id="trigger">Trigger</Button>
      </Tooltip>,
    );
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
    cy.tick(0);
    tooltip().should('be.visible');
    cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
    cy.tick(0);
    tooltip().should('not.exist');
  });

  it('cancels pending show on early departure and pending hide on trigger reentry', () => {
    mount(
      <Tooltip content="Cancellable tooltip" relationship="label">
        <Button id="trigger">Trigger</Button>
      </Tooltip>,
    );
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
    cy.tick(100);
    cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
    cy.tick(500);
    tooltip().should('not.exist');
    cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
    cy.tick(250);
    tooltip().should('be.visible');
    cy.get('#trigger').trigger('pointerout', { pointerType: 'mouse' });
    cy.tick(100);
    cy.get('#trigger').trigger('pointerover', { pointerType: 'mouse' });
    cy.tick(500);
    tooltip().should('be.visible');
  });

  it('keeps native hovered content visible beyond hideDelay and dismisses after leaving content', () => {
    mount(
      centered(
        <Tooltip content="Hoverable tooltip" relationship="label">
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      ),
    );
    hoverTrigger();
    tooltip().should('be.visible').realHover();
    cy.wait(300);
    tooltip().should('be.visible');
    cy.get('body').realHover({ position: 'bottomRight' });
    tooltip().should('not.exist');
  });

  it('dismisses on native Escape with document event provenance without moving trigger focus', () => {
    const changes = cy.stub().as('escapeChanges');
    mount(
      <>
        <button id="before">Before</button>
        <Tooltip content="Escape tooltip" relationship="label" onVisibleChange={changes}>
          <Button id="trigger">Trigger</Button>
        </Tooltip>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    tooltip().should('be.visible');
    cy.get('@escapeChanges').should('have.been.calledOnce');
    cy.realPress('Escape');
    tooltip().should('not.exist');
    cy.get('#trigger').should('be.focused');
    cy.get('#trigger').then($trigger => {
      const [event, data] = changes.lastCall.args;
      expect(event).to.equal(undefined);
      expect(data.visible).to.equal(false);
      expect(data.documentKeyboardEvent).to.be.instanceOf($trigger[0].ownerDocument.defaultView!.KeyboardEvent);
      expect(data.documentKeyboardEvent.key).to.equal('Escape');
      expect(data.documentKeyboardEvent.defaultPrevented).to.equal(true);
      expect(changes.callCount).to.equal(2);
    });
  });

  it('requests controlled dismissal without hiding until the caller updates visible', () => {
    const changes = cy.stub().as('controlledChanges');
    const render = (visible: boolean) => (
      <Tooltip visible={visible} onVisibleChange={changes} content="Controlled" relationship="description">
        <Button id="trigger">Trigger</Button>
      </Tooltip>
    );
    mount(render(true)).then(({ rerender }) => {
      tooltip().should('be.visible');
      cy.realPress('Escape');
      cy.get('@controlledChanges').should('have.been.calledOnce');
      tooltip().should('be.visible');
      cy.then(() => rerender(wrap(render(false))));
      tooltip().should('not.be.visible');
      cy.get('@controlledChanges').should('have.been.calledOnce');
    });
  });

  it('keeps controlled false hidden while notifying the caller of hover requests', () => {
    const changes = cy.stub().as('controlledShow');
    mount(
      <Tooltip visible={false} content="Disabled controlled" relationship="description" onVisibleChange={changes}>
        <Button id="trigger">Trigger</Button>
      </Tooltip>,
    );
    hoverTrigger();
    cy.get('@controlledShow').should('have.been.calledOnce');
    tooltip().should('not.be.visible');
    cy.then(() => expect(changes.firstCall.args[1].visible).to.equal(true));
  });

  it('immediately replaces another visible tooltip without waiting its configured showDelay', () => {
    mount(
      <>
        <Tooltip content="First tooltip" relationship="label">
          <Button id="first-trigger">First</Button>
        </Tooltip>
        <Tooltip content="Second tooltip" relationship="label" showDelay={1000}>
          <Button id="second-trigger">Second</Button>
        </Tooltip>
      </>,
    );
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    cy.get('#first-trigger').trigger('pointerover', { pointerType: 'mouse' });
    cy.tick(250);
    tooltip().should('have.text', 'First tooltip');
    cy.get('#second-trigger').trigger('pointerover', { pointerType: 'mouse' });
    cy.tick(0);
    tooltip().should('have.length', 1).and('have.text', 'Second tooltip').and('be.visible');
  });

  it('does not show after programmatic focus when not navigating with the keyboard', () => {
    const FocusRestoration = () => {
      const ref = React.useRef<HTMLButtonElement>(null);
      return (
        <>
          <button id="pointer-mode" onClick={() => ref.current?.focus()}>
            Restore focus
          </button>
          <Tooltip content="Focus restoration tooltip" relationship="label">
            <Button id="trigger" ref={ref}>
              Trigger
            </Button>
          </Tooltip>
        </>
      );
    };
    mount(<FocusRestoration />);
    cy.get('#pointer-mode').realClick();
    cy.get('#trigger').should('be.focused');
    cy.wait(300);
    tooltip().should('not.exist');
  });

  it('updates all three relationships and removes obsolete generated trigger ARIA attributes', () => {
    const render = (relationship: TooltipProps['relationship']) => (
      <Tooltip content="Useful information" relationship={relationship}>
        <Button id="trigger">Visible name</Button>
      </Tooltip>
    );
    mount(render('description')).then(({ rerender }) => {
      let id: string;
      tooltip().then($tip => {
        id = $tip[0].id;
      });
      cy.get('#trigger').should($trigger => {
        expect($trigger[0].getAttribute('aria-describedby')).to.equal(id);
      });
      cy.then(() => rerender(wrap(render('label'))));
      cy.get('#trigger')
        .should('have.attr', 'aria-label', 'Useful information')
        .should($trigger => {
          expect($trigger[0].hasAttribute('aria-describedby')).to.equal(false);
        });
      tooltip().should('not.exist');
      cy.then(() => rerender(wrap(render('inaccessible'))));
      cy.get('#trigger').should($trigger => {
        for (const attr of ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-description']) {
          expect($trigger[0].hasAttribute(attr), attr).to.equal(false);
        }
        expect(getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Visible name', description: '' })).to.equal(
          $trigger[0],
        );
      });
      tooltip().should('not.exist');
      hoverTrigger();
      tooltip().should('be.visible').and('have.text', 'Useful information');
    });
  });

  it('resets appearance and arrow defaults on omission after explicit nondefaults', () => {
    const render = (props: Pick<TooltipProps, 'appearance' | 'withArrow'> = {}) =>
      centered(
        <Tooltip visible content="Reset tooltip" relationship="label" {...props}>
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      );
    mount(render({ appearance: 'inverted', withArrow: true })).then(({ rerender }) => {
      tooltip().should('have.css', 'background-color', color(teamsLightTheme.colorNeutralBackgroundStatic));
      tooltip().children().should('have.length', 1);
      cy.then(() => rerender(wrap(render())));
      tooltip().should('have.css', 'background-color', color(teamsLightTheme.colorNeutralBackground1));
      tooltip().children().should('have.length', 0);
    });
  });

  it('preserves caller content style and Griffel override across updates and resets after omission', () => {
    const Styled = ({ override }: { override: boolean }) => {
      const classes = useTooltipCallerStyles();
      return centered(
        <Tooltip
          visible
          appearance="inverted"
          relationship="label"
          content={{
            children: override ? 'Customized' : 'Reset',
            className: override ? classes.content : undefined,
            style: override ? { fontSize: teamsLightTheme.fontSizeBase400 } : undefined,
          }}
        >
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      );
    };
    mount(<Styled override />).then(({ rerender }) => {
      tooltip()
        .should('have.css', 'background-color', color(teamsLightTheme.colorBrandBackground))
        .and('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
      cy.then(() => rerender(wrap(<Styled override />)));
      tooltip().should('have.css', 'background-color', color(teamsLightTheme.colorBrandBackground));
      cy.then(() => rerender(wrap(<Styled override={false} />)));
      tooltip()
        .should('have.text', 'Reset')
        .and('have.css', 'background-color', color(teamsLightTheme.colorNeutralBackgroundStatic))
        .and('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    });
  });

  for (const position of ['before', 'after'] as const) {
    it(`mirrors logical ${position} placement in RTL`, () => {
      mountBase(
        <FluentProvider theme={teamsLightTheme} dir="rtl">
          {centered(
            <Tooltip visible positioning={position} content="RTL tooltip" relationship="label">
              <Button id="trigger">Trigger</Button>
            </Tooltip>,
          )}
        </FluentProvider>,
      );
      tooltip()
        .should('be.visible')
        .and('have.attr', 'data-popper-placement', position === 'before' ? 'right' : 'left')
        .should($tip => {
          const trigger = $tip[0].ownerDocument.getElementById('trigger')!.getBoundingClientRect();
          const rect = $tip[0].getBoundingClientRect();
          if (position === 'before') {
            expect(rect.left).to.be.greaterThan(trigger.right);
          } else {
            expect(rect.right).to.be.lessThan(trigger.left);
          }
        });
    });
  }

  it('moves custom portal content between mountNodes and leaves no stale content on unmount', () => {
    const MovingPortal = ({ second, present = true }: { second: boolean; present?: boolean }) => {
      const [firstNode, setFirstNode] = React.useState<HTMLDivElement | null>(null);
      const [secondNode, setSecondNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="first-mount" ref={setFirstNode} />
          <div id="second-mount" ref={setSecondNode} />
          {present && (
            <Tooltip visible mountNode={second ? secondNode : firstNode} content="Moving portal" relationship="label">
              <Button id="trigger">Trigger</Button>
            </Tooltip>
          )}
        </>
      );
    };
    mount(<MovingPortal second={false} />).then(({ rerender }) => {
      cy.get('#first-mount').find('[role="tooltip"]').should('have.length', 1);
      cy.then(() => rerender(wrap(<MovingPortal second />)));
      cy.get('#second-mount').find('[role="tooltip"]').should('have.length', 1);
      cy.get('#first-mount').find('[role="tooltip"]').should('not.exist');
      cy.then(() => rerender(wrap(<MovingPortal second present={false} />)));
      tooltip().should('not.exist');
    });
  });
});

describe('Tooltip documented functional scenarios', () => {
  it('shows on native hover above the trigger and hides after leaving', () => {
    mount(
      centered(
        <Tooltip content="Example tooltip" relationship="label">
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      ),
    );
    tooltip().should('not.exist');
    hoverTrigger();
    tooltip().should('be.visible').and('have.text', 'Example tooltip').and('have.attr', 'data-popper-placement', 'top');
    cy.get('body').realHover({ position: 'bottomRight' });
    tooltip().should('not.exist');
  });

  it('shows on native keyboard focus and hides on blur without adding a tooltip tab stop', () => {
    mount(
      <>
        <button id="before">Before</button>
        <Tooltip content="Keyboard tooltip" relationship="label">
          <Button id="trigger">Trigger</Button>
        </Tooltip>
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#trigger').should('be.focused');
    tooltip().should('be.visible');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
    tooltip().should('not.exist');
  });

  it('provides the icon-only trigger accessible label even before the string tooltip mounts', () => {
    mount(
      <Tooltip content="Bold" relationship="label">
        <Button id="trigger" icon={<span aria-hidden="true">B</span>} />
      </Tooltip>,
    );
    tooltip().should('not.exist');
    cy.get('#trigger').should($trigger => {
      expect(getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Bold' })).to.equal($trigger[0]);
    });
  });

  it('provides a description without replacing the visible trigger accessible name while hidden or visible', () => {
    mount(
      <Tooltip content="Additional details" relationship="description">
        <Button id="trigger">Button</Button>
      </Tooltip>,
    );
    tooltip().should('not.be.visible').and('have.text', 'Additional details');
    cy.get('#trigger').should($trigger => {
      expect(
        getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Button', description: 'Additional details' }),
      ).to.equal($trigger[0]);
    });
    hoverTrigger();
    tooltip().should('be.visible');
    cy.get('#trigger').should($trigger => {
      expect(
        getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Button', description: 'Additional details' }),
      ).to.equal($trigger[0]);
    });
  });

  for (const appearance of ['normal', 'inverted'] as const) {
    it(`paints documented ${appearance} appearance using theme tokens`, () => {
      mount(
        centered(
          <Tooltip visible content="Appearance tooltip" relationship="label" appearance={appearance}>
            <Button id="trigger">Trigger</Button>
          </Tooltip>,
        ),
      );
      tooltip()
        .should('be.visible')
        .and(
          'have.css',
          'background-color',
          color(
            appearance === 'normal'
              ? teamsLightTheme.colorNeutralBackground1
              : teamsLightTheme.colorNeutralBackgroundStatic,
          ),
        )
        .and(
          'have.css',
          'color',
          color(
            appearance === 'normal'
              ? teamsLightTheme.colorNeutralForeground1
              : teamsLightTheme.colorNeutralForegroundStaticInverted,
          ),
        )
        .and('have.css', 'font-family', teamsLightTheme.fontFamilyBase)
        .and('have.css', 'font-size', teamsLightTheme.fontSizeBase200)
        .and('have.css', 'line-height', teamsLightTheme.lineHeightBase200);
    });
  }

  for (const [position, placement] of [
    ['above-start', 'top-start'],
    ['above', 'top'],
    ['above-end', 'top-end'],
    ['before-top', 'left-start'],
    ['before', 'left'],
    ['before-bottom', 'left-end'],
    ['after-top', 'right-start'],
    ['after', 'right'],
    ['after-bottom', 'right-end'],
    ['below-start', 'bottom-start'],
    ['below', 'bottom'],
    ['below-end', 'bottom-end'],
  ] as const) {
    it(`positions the tooltip and arrow for documented ${position} shorthand`, () => {
      mount(
        centered(
          <Tooltip visible withArrow positioning={position} content={`Placement ${position}`} relationship="label">
            <Button id="trigger" style={{ width: '120px', height: '64px' }}>
              Trigger
            </Button>
          </Tooltip>,
        ),
      );
      tooltip()
        .should('be.visible')
        .and('have.attr', 'data-popper-placement', placement)
        .should($tip => {
          const trigger = $tip[0].ownerDocument.getElementById('trigger')!.getBoundingClientRect();
          const rect = $tip[0].getBoundingClientRect();
          const arrow = $tip[0].firstElementChild as HTMLElement;
          const arrowRect = arrow.getBoundingClientRect();
          expect(arrowRect.width).to.be.greaterThan(0);
          expect(arrowRect.height).to.be.greaterThan(0);
          if (placement.startsWith('top')) {
            expect(rect.bottom).to.be.lessThan(trigger.top);
            expect(arrowRect.bottom).to.be.greaterThan(rect.bottom);
          } else if (placement.startsWith('bottom')) {
            expect(rect.top).to.be.greaterThan(trigger.bottom);
            expect(arrowRect.top).to.be.lessThan(rect.top);
          } else if (placement.startsWith('left')) {
            expect(rect.right).to.be.lessThan(trigger.left);
            expect(arrowRect.right).to.be.greaterThan(rect.right);
          } else {
            expect(rect.left).to.be.greaterThan(trigger.right);
            expect(arrowRect.left).to.be.lessThan(rect.left);
          }
        });
    });
  }

  it('does not render an arrow by default and adds one when withArrow is true', () => {
    const render = (withArrow?: boolean) =>
      centered(
        <Tooltip visible withArrow={withArrow} content="Arrow tooltip" relationship="label">
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      );
    mount(render()).then(({ rerender }) => {
      tooltip().children().should('have.length', 0);
      cy.then(() => rerender(wrap(render(true))));
      tooltip().children().should('have.length', 1).and('be.visible');
    });
  });

  it('uses the documented content slot for caller color overrides and arrow inheritance', () => {
    const Styled = () => {
      const classes = useTooltipCallerStyles();
      return centered(
        <Tooltip
          visible
          withArrow
          content={{ children: 'Styled tooltip', className: classes.content }}
          relationship="label"
        >
          <Button id="trigger">Trigger</Button>
        </Tooltip>,
      );
    };
    mount(<Styled />);
    tooltip()
      .should('have.class', 'fui-Tooltip__content')
      .and('have.css', 'background-color', color(teamsLightTheme.colorBrandBackground))
      .and('have.css', 'color', color(teamsLightTheme.colorNeutralForegroundInverted));
    tooltip().children().should('have.css', 'background-color', color(teamsLightTheme.colorBrandBackground));
  });

  it('renders the portal content into the documented custom mountNode instead of the default portal', () => {
    const CustomMount = () => {
      const [mountNode, setMountNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <Tooltip visible mountNode={mountNode} content="Custom portal" relationship="label">
            <Button id="trigger">Trigger</Button>
          </Tooltip>
          <div ref={setMountNode} id="custom-mount" />
        </>
      );
    };
    mount(<CustomMount />);
    cy.get('#custom-mount').find('[role="tooltip"]').should('be.visible').and('have.text', 'Custom portal');
    tooltip().should('have.length', 1);
  });

  it('positions against a documented custom target while the wrapping button remains the interactive trigger', () => {
    const CustomTarget = () => {
      const [target, setTarget] = React.useState<HTMLSpanElement | null>(null);
      return centered(
        <Tooltip visible withArrow positioning={{ target }} content="Custom target" relationship="description">
          <Button
            id="trigger"
            icon={{
              ref: setTarget,
              children: (
                <span data-testid="target-icon" aria-hidden="true">
                  I
                </span>
              ),
            }}
          >
            Button with icon
          </Button>
        </Tooltip>,
      );
    };
    mount(<CustomTarget />);
    tooltip()
      .should('be.visible')
      .and('have.attr', 'data-popper-placement', 'top')
      .should($tip => {
        const target = $tip[0].ownerDocument.querySelector('.fui-Button__icon')!.getBoundingClientRect();
        const rect = $tip[0].getBoundingClientRect();
        expect(rect.left + rect.width / 2).to.be.closeTo(target.left + target.width / 2, 1);
        expect(rect.bottom).to.be.lessThan(target.top);
      });
    cy.get('#trigger').should($trigger => {
      expect(
        getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Button with icon', description: 'Custom target' }),
      ).to.equal($trigger[0]);
    });
  });

  it('respects documented controlled visibility gating and consumes onVisibleChange requests', () => {
    const Controlled = () => {
      const [enabled, setEnabled] = React.useState(false);
      const [visible, setVisible] = React.useState(false);
      return (
        <>
          <button id="enable" onClick={() => setEnabled(value => !value)}>
            Toggle tooltip
          </button>
          <Tooltip
            visible={enabled && visible}
            onVisibleChange={(_, data) => setVisible(data.visible)}
            content="Controlled tooltip"
            relationship="description"
          >
            <Button id="trigger">Trigger</Button>
          </Tooltip>
        </>
      );
    };
    mount(<Controlled />);
    hoverTrigger();
    tooltip().should('not.be.visible');
    cy.get('#enable').click();
    hoverTrigger();
    tooltip().should('be.visible');
    cy.get('body').realHover({ position: 'bottomRight' });
    tooltip().should('not.be.visible');
    hoverTrigger();
    tooltip().should('be.visible');
    cy.get('#enable').click();
    tooltip().should('not.be.visible');
  });
});

describe('Tooltip', () => {
  describe('overflow behavior (regression: #32882)', () => {
    it('hides and restores the tooltip when its trigger scrolls out of view', () => {
      // Isolate clipping from native pointerleave dismissal as scrolling moves the trigger away from the cursor.
      mount(
        <div
          id="scroll-container"
          style={{
            height: '100px',
            width: '200px',
            overflow: 'hidden scroll',
            position: 'relative',
          }}
        >
          <div style={{ height: '400px', paddingTop: '8px' }}>
            <Tooltip content="Overflow tooltip" relationship="label" visible>
              <Button id="trigger">Hover me</Button>
            </Tooltip>
          </div>
        </div>,
      );

      hoverTrigger();

      cy.get('[role="tooltip"]')
        .should('be.visible')
        .then($tooltip => {
          cy.get('#scroll-container').scrollTo(0, 300);
          cy.wrap($tooltip).should('not.be.visible');

          cy.get('#scroll-container').scrollTo(0, 0);
          cy.wrap($tooltip).should('be.visible');
        });
    });

    it('keeps partially clipped triggers visible and hides only after full clipping', () => {
      mount(
        <div id="scroll-container" style={{ height: '100px', overflow: 'auto', position: 'relative' }}>
          <div style={{ height: '400px', paddingTop: '8px' }}>
            <Tooltip content="Partially clipped trigger" relationship="label" visible>
              <Button id="trigger">Trigger</Button>
            </Tooltip>
          </div>
        </div>,
      );

      cy.get('[role="tooltip"]')
        .should('be.visible')
        .then($tooltip => {
          cy.get('#scroll-container').scrollTo(0, 20);
          cy.get('#trigger').should($trigger => {
            const triggerRect = $trigger[0].getBoundingClientRect();
            const containerRect = $trigger[0].closest('#scroll-container')!.getBoundingClientRect();

            expect(triggerRect.top).to.be.lessThan(containerRect.top);
            expect(triggerRect.bottom).to.be.greaterThan(containerRect.top);
          });
          cy.wrap($tooltip).should('be.visible');

          cy.get('#scroll-container').scrollTo(0, 300);
          cy.wrap($tooltip).should('not.be.visible');
          cy.get('#scroll-container').scrollTo(0, 0);
          cy.wrap($tooltip).should('be.visible');
        });
    });
  });

  describe('viewport boundaries', () => {
    [
      { position: 'above' as const, top: 0, left: 300 },
      { position: 'below' as const, bottom: 0, left: 300 },
      { position: 'before' as const, top: 200, left: 0 },
      { position: 'after' as const, top: 200, right: 0 },
    ].forEach(({ position, ...style }) => {
      it(`keeps the tooltip in view at the ${position} viewport edge`, () => {
        cy.viewport(800, 600);
        mount(
          <div style={{ position: 'fixed', ...style }}>
            <Tooltip content="Viewport tooltip" relationship="label" visible positioning={position}>
              <Button id="trigger">Trigger</Button>
            </Tooltip>
          </div>,
        );

        cy.get('[role="tooltip"]')
          .should($tooltip => expect($tooltip).to.have.attr('data-popper-placement'))
          .should('be.visible')
          .should($tooltip => {
            const rect = $tooltip[0].getBoundingClientRect();

            expect(rect.top).to.be.at.least(0);
            expect(rect.left).to.be.at.least(0);
            expect(rect.bottom).to.be.at.most(600);
            expect(rect.right).to.be.at.most(800);
          });
      });
    });

    it('does not hide escaped content for a visible trigger with a pinned large offset', () => {
      const Example = () => {
        const [offset, setOffset] = React.useState(1000);

        return (
          <>
            <Button onClick={() => setOffset(4)}>Reset offset</Button>
            <div style={{ position: 'fixed', top: '200px', left: '300px' }}>
              <Tooltip content="Offset tooltip" relationship="label" visible positioning={{ pinned: true, offset }}>
                <Button id="trigger">Trigger</Button>
              </Tooltip>
            </div>
          </>
        );
      };

      cy.viewport(800, 600);
      mount(<Example />);

      cy.get('#trigger').should('be.visible');
      cy.get('[role="tooltip"]')
        .should($tooltip => {
          expect($tooltip).to.have.attr('data-popper-escaped');
          expect($tooltip).not.to.have.attr('data-popper-reference-hidden');
          expect($tooltip.css('visibility')).to.equal('visible');
          expect($tooltip[0].getBoundingClientRect().bottom).to.be.lessThan(0);
        })
        .then($tooltip => {
          cy.contains('button', 'Reset offset').click();
          cy.wrap($tooltip).should($element => {
            expect($element).not.to.have.attr('data-popper-escaped');
            expect($element).to.be.visible;
          });
        });
    });

    it('does not hide oversized content while its trigger remains visible', () => {
      cy.viewport(800, 600);
      mount(
        <div style={{ position: 'fixed', top: '200px', left: '300px' }}>
          <Tooltip
            content={{ children: 'Oversized tooltip', style: { width: '1000px', height: '800px', maxWidth: 'none' } }}
            relationship="label"
            visible
          >
            <Button id="trigger">Trigger</Button>
          </Tooltip>
        </div>,
      );

      cy.get('#trigger').should('be.visible');
      cy.get('[role="tooltip"]')
        .should($tooltip => expect($tooltip).to.have.attr('data-popper-placement'))
        .should('be.visible')
        .should($tooltip => {
          const rect = $tooltip[0].getBoundingClientRect();

          expect(rect.width).to.be.greaterThan(800);
          expect(rect.height).to.be.greaterThan(600);
        });
    });
  });

  // Verifies the fix for regression reported in https://github.com/microsoft/fluentui/issues/36604
  describe('static non-scrolling overflow:hidden container', () => {
    it('still shows the tooltip when its trigger sits in a tightly-fitted overflow:hidden container', () => {
      mount(
        <div style={{ overflow: 'hidden', display: 'flex' }}>
          <Tooltip content="I should still appear" relationship="label">
            <Button id="trigger">Hover me</Button>
          </Tooltip>
        </div>,
      );

      hoverTrigger();

      cy.get('[role="tooltip"]').should('be.visible').and('have.text', 'I should still appear');
    });

    it('still hides the tooltip when the trigger itself is clipped', () => {
      mount(
        <div style={{ height: '40px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '100px' }}>
            <Tooltip content="Clipped trigger" relationship="label" visible>
              <Button id="trigger">Hover me</Button>
            </Tooltip>
          </div>
        </div>,
      );

      cy.get('[role="tooltip"]').should('not.be.visible');
    });

    it('respects overflow clipping through a fixed-position containing block', () => {
      mount(
        <div style={{ height: '40px', overflow: 'hidden', position: 'relative', transform: 'translateZ(0)' }}>
          <div style={{ position: 'fixed', top: '100px' }}>
            <Tooltip content="Fixed clipped trigger" relationship="label" visible>
              <Button id="trigger">Hover me</Button>
            </Tooltip>
          </div>
        </div>,
      );

      cy.get('[role="tooltip"]').should('not.be.visible');
    });

    it('does not clip a fixed-position trigger through a non-containing scroll ancestor', () => {
      mount(
        <div style={{ height: '40px', overflow: 'auto' }}>
          <div style={{ height: '300px' }}>
            <div style={{ position: 'fixed', top: '100px' }}>
              <Tooltip content="Fixed visible trigger" relationship="label" visible>
                <Button id="trigger">Hover me</Button>
              </Tooltip>
            </div>
          </div>
        </div>,
      );

      cy.get('[role="tooltip"]').should('be.visible');
    });

    it('re-evaluates clipping ancestors after overflow styles change', () => {
      mount(
        <div id="dynamic-overflow-container">
          <div style={{ height: '300px' }}>
            <Tooltip content="Dynamic overflow" relationship="label" visible>
              <Button id="trigger">Hover me</Button>
            </Tooltip>
          </div>
        </div>,
      );

      cy.get('[role="tooltip"]')
        .should('be.visible')
        .then($tooltip => {
          cy.get('#dynamic-overflow-container').invoke('attr', 'style', 'height: 40px; overflow: auto');
          cy.get('#dynamic-overflow-container').scrollTo(0, 200);
          cy.window().trigger('resize');
          cy.wrap($tooltip).should('not.be.visible');

          cy.get('#dynamic-overflow-container').scrollTo(0, 0);
          cy.get('#dynamic-overflow-container').invoke('attr', 'style', 'overflow: visible');
          cy.window().trigger('resize');
          cy.wrap($tooltip).should('be.visible');
        });
    });
  });

  describe('nested scrollable ancestors', () => {
    it('hides the tooltip when the outer scroll parent clips its trigger', () => {
      mount(
        <div
          id="outer-scroll-container"
          style={{
            height: '100px',
            width: '200px',
            overflow: 'hidden scroll',
            position: 'relative',
          }}
        >
          <div style={{ height: '400px', paddingTop: '8px' }}>
            <div id="inner-scroll-container" style={{ height: '200px', overflow: 'hidden scroll' }}>
              <div style={{ height: '400px' }}>
                <div style={{ overflow: 'hidden', display: 'flex' }}>
                  <Tooltip content="Nested tooltip" relationship="label">
                    <Button id="trigger">Hover me</Button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>,
      );

      hoverTrigger();

      cy.get('[role="tooltip"]').should('be.visible');
      cy.get('#outer-scroll-container').scrollTo(0, 300);
      cy.get('[role="tooltip"]').should('not.be.visible');
      cy.get('#outer-scroll-container').scrollTo(0, 0);
      cy.get('[role="tooltip"]').should('be.visible');
    });

    it('hides when an inner scroll moves the trigger outside an outer clipping ancestor', () => {
      mount(
        <div id="outer-clip-container" style={{ height: '100px', width: '200px', overflow: 'hidden' }}>
          <div
            id="inner-scroll-container"
            style={{ height: '200px', overflow: 'auto', position: 'relative', top: '-50px' }}
          >
            <div style={{ height: '400px', paddingTop: '100px' }}>
              <Tooltip content="Outer clipped tooltip" relationship="label" visible>
                <Button id="trigger">Hover me</Button>
              </Tooltip>
            </div>
          </div>
        </div>,
      );

      cy.get('[role="tooltip"]')
        .should('be.visible')
        .then($tooltip => {
          cy.get('#inner-scroll-container').scrollTo(0, 99);
          cy.get('#outer-clip-container').then($outer => {
            cy.get('#inner-scroll-container').then($inner => {
              cy.get('#trigger').then($trigger => {
                const triggerRect = $trigger[0].getBoundingClientRect();
                const innerRect = $inner[0].getBoundingClientRect();
                const outerRect = $outer[0].getBoundingClientRect();

                expect(triggerRect.top).to.be.at.least(innerRect.top);
                expect(triggerRect.bottom).to.be.at.most(innerRect.bottom);
                expect(triggerRect.bottom).to.be.at.most(outerRect.top);
              });
            });
          });
          cy.wrap($tooltip).should('not.be.visible');

          cy.get('#inner-scroll-container').scrollTo(0, 0);
          cy.wrap($tooltip).should('be.visible');
        });
    });
  });
});
