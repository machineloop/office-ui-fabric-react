import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import { Popover, PopoverTrigger } from '../../index';
import type { PopoverProps } from '../Popover/Popover.types';
import { PopoverSurface } from './PopoverSurface';
import type { PopoverSurfaceProps } from './PopoverSurface.types';
import { Default } from '../../../../stories/src/Popover/PopoverDefault.stories';
import { Appearance } from '../../../../stories/src/Popover/PopoverAppearance.stories';
import { WithArrow } from '../../../../stories/src/Popover/PopoverWithArrow.stories';
import { WithArrowAutosize } from '../../../../stories/src/Popover/PopoverWithArrowAutosize.stories';
import { TrappingFocus } from '../../../../stories/src/Popover/PopoverTrappingFocus.stories';
import { NonInteractiveContent } from '../../../../stories/src/Popover/PopoverNonInteractiveContent.stories';
import { InternalUpdateContent } from '../../../../stories/src/Popover/PopoverInternalUpdateContent.stories';
import { MotionDisabled } from '../../../../stories/src/Popover/PopoverMotionDisabled.stories';
import { MotionCustom } from '../../../../stories/src/Popover/PopoverMotionCustom.stories';
import { WithoutTrigger } from '../../../../stories/src/Popover/PopoverWithoutTrigger.stories';
import { AnchorToCustomTarget } from '../../../../stories/src/Popover/PopoverAnchorToCustomTarget.stories';
import { CustomTrigger } from '../../../../stories/src/Popover/PopoverCustomTrigger.stories';
import { ControllingOpenAndClose } from '../../../../stories/src/Popover/PopoverControllingOpenAndClose.stories';
import { usePopoverContext_unstable } from '../../popoverContext';
import type { PopoverContextValue } from '../../popoverContext';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const scene = (props: Omit<PopoverProps, 'children'> = {}, surface: PopoverSurfaceProps = {}) =>
  render(
    <div id="scene" style={{ padding: '64px' }}>
      <Popover {...props}>
        <PopoverTrigger disableButtonEnhancement>
          <button id="trigger" type="button">
            Open details
          </button>
        </PopoverTrigger>
        <PopoverSurface id="surface" aria-label="Details" {...surface}>
          <button id="first" type="button">
            First
          </button>
          <input id="input" aria-label="Notes" />
          <button id="last" type="button">
            Last
          </button>
        </PopoverSurface>
      </Popover>
      <button id="outside" type="button">
        Outside
      </button>
    </div>,
  );
const cssColor = (value: string) => {
  const probe = document.createElement('span');
  probe.style.color = value;
  return probe.style.color;
};
const open = () => cy.get('#trigger').realClick();

describe('PopoverSurface documented content, shape and presence', () => {
  it('renders the default story as a positioned group and moves focus into interactive content', () => {
    render(<Default children={<></>} />);
    cy.contains('button', 'Popover trigger').realClick();
    cy.get('.fui-PopoverSurface').should('have.attr', 'role', 'group').and('be.visible');
    cy.contains('.fui-PopoverSurface button', 'Action').should('have.focus');
    cy.realPress('Escape');
    cy.get('.fui-PopoverSurface').should('not.exist');
  });

  it('uses exact documented default, brand and inverted appearance colors', () => {
    render(<Appearance />);
    for (const [name, background, foreground] of [
      ['Default', webLightTheme.colorNeutralBackground1, webLightTheme.colorNeutralForeground1],
      ['Brand', webLightTheme.colorBrandBackground, webLightTheme.colorNeutralForegroundOnBrand],
      ['Inverted', webLightTheme.colorNeutralBackgroundStatic, webLightTheme.colorNeutralForegroundStaticInverted],
    ] as const) {
      cy.contains('button', `${name} appearance Popover trigger`).realClick();
      cy.get('.fui-PopoverSurface')
        .should('have.css', 'background-color', cssColor(background))
        .and('have.css', 'color', cssColor(foreground));
      cy.realPress('Escape');
      cy.get('.fui-PopoverSurface').should('not.exist');
    }
  });

  for (const [size, padding, arrowBox] of [
    ['small', 12, 12],
    ['medium', 16, 16],
    ['large', 20, 16],
  ] as const) {
    it(`uses ${size} context for actual surface padding and arrow geometry`, () => {
      scene({ size, withArrow: true });
      open();
      cy.get('#surface')
        .should('have.css', 'padding-top', `${padding}px`)
        .and('have.css', 'padding-left', `${padding}px`);
      cy.get('#surface > div')
        .should('have.length', 1)
        .should($node => {
          expect($node[0].getBoundingClientRect().height).to.be.closeTo(arrowBox, 0.2);
          expect($node[0].getBoundingClientRect().width).to.be.closeTo(arrowBox, 0.2);
        });
    });
  }

  it('renders an arrow before the documented content without changing the primary action', () => {
    render(<WithArrow />);
    cy.contains('button', 'Popover trigger').realClick();
    cy.get('.fui-PopoverSurface').should($node => {
      expect($node[0].firstElementChild?.tagName).to.equal('DIV');
      expect($node[0].firstElementChild?.childElementCount).to.equal(0);
    });
    cy.contains('.fui-PopoverSurface button', 'Action').should('have.focus');
  });

  it('preserves the documented arrow-overflow strategy and actual bounded inner scrolling', () => {
    cy.viewport(1000, 600);
    render(<WithArrowAutosize />);
    cy.contains('button', 'Popover trigger').realClick();
    cy.get('.fui-PopoverSurface').should('have.css', 'overflow', 'visible');
    cy.get('.fui-PopoverSurface > div')
      .last()
      .should('have.css', 'overflow-y', 'auto')
      .should($node => {
        expect($node[0].scrollHeight).to.be.greaterThan($node[0].clientHeight);
        expect($node[0].getBoundingClientRect().height).to.be.lessThan(600);
      })
      .scrollTo('bottom')
      .should($node => expect($node[0].scrollTop).to.be.greaterThan(0));
  });

  it('names the documented modal surface and confines native tab traversal to its actions', () => {
    render(<TrappingFocus />);
    cy.contains('button', 'Popover trigger').realClick();
    cy.get('.fui-PopoverSurface')
      .should('have.attr', 'role', 'dialog')
      .and('have.attr', 'aria-modal', 'true')
      .should($node => expect(computeAccessibleName($node[0])).to.equal('Popover content'));
    cy.get('.fui-PopoverSurface button').first().should('have.focus');
    cy.realPress('Tab');
    cy.get('.fui-PopoverSurface button').last().should('have.focus');
    cy.realPress('Tab');
    cy.get('.fui-PopoverSurface button').first().should('have.focus');
  });

  it('focuses and names the documented noninteractive surface', () => {
    render(<NonInteractiveContent />);
    cy.contains('button', 'Popover trigger').realClick();
    cy.get('.fui-PopoverSurface')
      .should('have.attr', 'tabindex', '-1')
      .and('have.focus')
      .should($node => expect(computeAccessibleName($node[0])).to.equal('Popover content'));
  });

  it('retains the surface through documented internal content updates and focuses replacement content', () => {
    render(<InternalUpdateContent />);
    cy.contains('button', 'Popover trigger').realClick();
    cy.get('.fui-PopoverSurface').then($original => {
      cy.contains('.fui-PopoverSurface button', 'Action').realClick();
      cy.contains('.fui-PopoverSurface a', 'and a link').should('have.focus');
      cy.get('.fui-PopoverSurface').should($node => expect($node[0]).to.equal($original[0]));
    });
  });

  it('supports immediate presence with the documented disabled motion slot', () => {
    render(<MotionDisabled />);
    cy.contains('button', 'Open popover').realClick();
    cy.get('.fui-PopoverSurface').should('be.visible');
    cy.realPress('Escape');
    cy.get('.fui-PopoverSurface').should('not.exist');
  });

  it('receives the actual DOM ref used by documented custom presence motion', () => {
    cy.window().then(win => {
      const animate = cy.spy(win.Element.prototype, 'animate');
      render(<MotionCustom />);
      cy.contains('button', 'Open popover').realClick();
      cy.get('.fui-PopoverSurface')
        .should('be.visible')
        .then($surface => {
          const node = $surface[0];
          cy.contains('.fui-PopoverSurface button', 'Action').should('have.focus');
          cy.realPress('Escape');
          cy.get('.fui-PopoverSurface').should('not.exist');
          cy.then(() => {
            const frames: Keyframe[] = animate
              .getCalls()
              .filter(call => call.thisValue === node)
              .flatMap(call => call.args[0]);
            expect(frames.length).to.be.greaterThan(0);
            expect(frames.some(frame => frame.opacity !== undefined)).to.equal(true);
            expect(frames.some(frame => String(frame.filter).includes('blur('))).to.equal(true);
            expect(frames.every(frame => frame.transform === undefined)).to.equal(true);
          });
        });
    });
  });

  it('positions and names the documented triggerless surface and restores its explicit focus target', () => {
    render(<WithoutTrigger />);
    cy.contains('button', 'Toggle popover').realClick();
    cy.get('.fui-PopoverSurface')
      .should('have.attr', 'role', 'dialog')
      .and('be.visible')
      .should($node => expect(computeAccessibleName($node[0])).to.equal('Popover content'));
    cy.get('.fui-PopoverSurface button').first().should('have.focus');
    cy.realPress('Escape');
    cy.get('.fui-PopoverSurface').should('not.exist');
    cy.contains('button', 'Toggle popover').should('have.focus');
  });

  it('positions the documented surface against its custom target rather than the opener', () => {
    render(<AnchorToCustomTarget />);
    cy.contains('button', 'Popover trigger').realClick();
    cy.contains('button', 'Custom target').then($target => {
      cy.get('.fui-PopoverSurface')
        .should('have.attr', 'data-popper-placement')
        .then(() => {
          cy.get('.fui-PopoverSurface').should($surface => {
            const target = $target[0].getBoundingClientRect();
            const surface = $surface[0].getBoundingClientRect();
            expect(surface.top).to.be.at.least(target.bottom);
            expect(target.left + target.width / 2).to.be.within(surface.left, surface.right);
          });
        });
    });
  });

  it('receives positioning and focus through the documented custom forwarded trigger ref', () => {
    render(<CustomTrigger />);
    cy.contains('button', 'Custom Trigger').focus();
    cy.realPress('Enter');
    cy.get('.fui-PopoverSurface').should('be.visible').and('have.attr', 'data-popper-placement');
    cy.contains('.fui-PopoverSurface button', 'Action').should('have.focus');
    cy.realPress('Escape');
    cy.get('.fui-PopoverSurface').should('not.exist');
    cy.contains('button', 'Custom Trigger').should('have.focus');
  });

  it('accepts external controlled story opening and keeps owner state synchronized on Escape', () => {
    render(<ControllingOpenAndClose />);
    cy.get('input[type="checkbox"]').realClick();
    cy.get('.fui-PopoverSurface').should('be.visible');
    cy.contains('.fui-PopoverSurface button', 'Action').should('have.focus');
    cy.get('input[type="checkbox"]').should('be.checked');
    cy.realPress('Escape');
    cy.get('.fui-PopoverSurface').should('not.exist');
    cy.get('input[type="checkbox"]').should('not.be.checked');
  });
});

describe('PopoverSurface native interaction and containment boundaries', () => {
  it('closes from an owned input Escape, restores trigger focus and preserves the consumer key handler', () => {
    const key = cy.spy().as('key');
    const change = cy.spy().as('change');
    scene(
      { onOpenChange: change },
      { onKeyDown: event => key(event.key, event.defaultPrevented, event.currentTarget.id) },
    );
    open();
    cy.get('#input').focus();
    cy.realPress('Escape');
    cy.get('#surface').should('not.exist');
    cy.get('#trigger').should('have.focus');
    cy.get('@key')
      .should('have.been.calledOnce')
      .its('firstCall.args')
      .should('deep.equal', ['Escape', true, 'surface']);
    cy.get('@change').should('have.been.calledTwice').its('lastCall.args.1').should('deep.equal', { open: false });
  });

  it('allows ordinary native input keys without requesting closure', () => {
    const change = cy.spy().as('change');
    scene({ onOpenChange: change });
    open();
    cy.get('#input').focus();
    cy.realType('notes');
    cy.realPress('ArrowLeft');
    cy.realPress('Home');
    cy.realPress('Enter');
    cy.get('#input').should('have.value', 'notes').and('have.focus');
    cy.get('#surface').should('be.visible');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('respects a controlled owner rejecting the surface Escape close request', () => {
    const change = cy.spy().as('change');
    scene({ open: true, onOpenChange: change });
    cy.get('#surface').then($original => {
      cy.get('#input').focus();
      cy.realPress('Escape');
      cy.get('@change').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { open: false });
      cy.get('#surface')
        .should('be.visible')
        .should($node => expect($node[0]).to.equal($original[0]));
    });
  });

  it('allows child key cancellation to intercept Escape before the surface handler', () => {
    const change = cy.spy().as('change');
    render(
      <Popover onOpenChange={change}>
        <PopoverTrigger disableButtonEnhancement>
          <button id="trigger">Open</button>
        </PopoverTrigger>
        <PopoverSurface id="surface" aria-label="Details">
          <input
            id="intercept"
            aria-label="Notes"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.stopPropagation();
              }
            }}
          />
        </PopoverSurface>
      </Popover>,
    );
    open();
    cy.get('#intercept').focus();
    cy.realPress('Escape');
    cy.get('#surface').should('be.visible');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('preserves native surface enter/leave callbacks when hover opening is disabled', () => {
    const enter = cy.spy().as('enter');
    const leave = cy.spy().as('leave');
    const change = cy.spy().as('change');
    scene({ defaultOpen: true, onOpenChange: change }, { onMouseEnter: enter, onMouseLeave: leave });
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get('#surface').realHover();
    cy.get('@enter').should('have.been.calledOnce');
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get('@leave').should('have.been.calledOnce');
    cy.get('@change').should('not.have.been.called');
    cy.get('#surface').should('be.visible');
  });

  it('keeps hover-open content alive on entry and requests closure on real departure', () => {
    const enter = cy.spy().as('enter');
    const leave = cy.spy().as('leave');
    const change = cy.spy().as('change');
    scene(
      { defaultOpen: true, openOnHover: true, mouseLeaveDelay: 0, onOpenChange: change },
      { onMouseEnter: enter, onMouseLeave: leave },
    );
    cy.get('#surface').realHover();
    cy.get('@enter').should('have.been.calledOnce');
    cy.get('#surface').should('be.visible');
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get('@leave').should('have.been.calledOnce');
    cy.get('#surface').should('not.exist');
    cy.get('@change').its('lastCall.args.1').should('deep.equal', { open: false });
  });

  it('retains surface interaction without closing, then closes on an actual outside click', () => {
    const click = cy.spy().as('click');
    const change = cy.spy().as('change');
    scene({ onOpenChange: change }, { onClick: click });
    open();
    cy.get('#last').realClick();
    cy.get('@click').should('have.been.calledOnce');
    cy.get('#surface').should('be.visible');
    cy.get('#outside').realClick();
    cy.get('#surface').should('not.exist');
    cy.get('@change').its('lastCall.args.1').should('deep.equal', { open: false });
  });

  it('cycles native Tab and Shift+Tab in the legacy modal trap', () => {
    scene({ trapFocus: true });
    open();
    cy.get('#first').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#last').should('have.focus');
    cy.realPress('Tab');
    cy.get('#first').should('have.focus');
    cy.realPress('Tab');
    cy.get('#input').should('have.focus');
  });

  it('uses standards-like accessibility isolation and closes after deliberate external focus', () => {
    scene({ trapFocus: true, inertTrapFocus: true });
    open();
    cy.get('#first').should('have.focus');
    cy.get('#outside').should($node => expect($node[0].closest('[aria-hidden="true"]')).not.to.equal(null));
    cy.get('#outside').focus();
    cy.get('#surface').should('not.exist');
    cy.get('#outside')
      .should($node => expect($node[0].closest('[aria-hidden="true"]')).to.equal(null))
      .and('have.focus');
  });

  it('keeps nested portal Escape local to the current surface and restores its trigger', () => {
    const outer = cy.spy().as('outer');
    render(
      <Popover defaultOpen trapFocus onOpenChange={outer}>
        <PopoverTrigger disableButtonEnhancement>
          <button>Outer trigger</button>
        </PopoverTrigger>
        <PopoverSurface id="outer-surface" aria-label="Outer">
          <Popover trapFocus>
            <PopoverTrigger disableButtonEnhancement>
              <button id="inner-trigger">Inner trigger</button>
            </PopoverTrigger>
            <PopoverSurface id="inner-surface" aria-label="Inner">
              <button id="inner-action">Inner action</button>
            </PopoverSurface>
          </Popover>
        </PopoverSurface>
      </Popover>,
    );
    cy.get('#inner-trigger').realClick();
    cy.get('#inner-action').should('have.focus');
    cy.realPress('Escape');
    cy.get('#inner-surface').should('not.exist');
    cy.get('#outer-surface').should('be.visible');
    cy.get('#inner-trigger').should('have.focus');
    cy.get('@outer').should('not.have.been.called');
  });

  it('uses the documented propagation stop to keep an inline nested Escape from closing the outer surface', () => {
    const outer = cy.spy().as('outer');
    render(
      <Popover defaultOpen inline trapFocus onOpenChange={outer}>
        <PopoverTrigger disableButtonEnhancement>
          <button>Outer trigger</button>
        </PopoverTrigger>
        <PopoverSurface id="outer-surface" aria-label="Outer">
          <Popover inline trapFocus>
            <PopoverTrigger disableButtonEnhancement>
              <button id="inner-trigger">Inner trigger</button>
            </PopoverTrigger>
            <PopoverSurface id="inner-surface" aria-label="Inner" onKeyDown={event => event.stopPropagation()}>
              <button id="inner-action">Inner action</button>
            </PopoverSurface>
          </Popover>
        </PopoverSurface>
      </Popover>,
    );
    cy.get('#outer-surface').should('have.attr', 'data-popper-placement');
    cy.get('#inner-trigger').focus();
    cy.realPress('Enter');
    cy.get('#inner-surface').should('be.visible');
    cy.get('#inner-action').should($node => {
      const doc = $node[0].ownerDocument;
      const outer = doc.getElementById('outer-surface');
      if (!outer) {
        throw new Error('Outer inline surface is absent');
      }
      expect(
        doc.activeElement?.id,
        JSON.stringify({
          outerOverflow: getComputedStyle(outer).overflow,
          hiddenAncestor: $node[0].closest('[aria-hidden="true"]')?.id,
          rect: $node[0].getBoundingClientRect().toJSON(),
        }),
      ).to.equal('inner-action');
    });
    cy.realPress('Escape');
    cy.get('#inner-surface').should('not.exist');
    cy.get('#outer-surface').should('be.visible');
    cy.get('@outer').should('not.have.been.called');
  });

  it('ignores native scrolling inside the surface while close-on-scroll is enabled', () => {
    const change = cy.spy().as('change');
    render(
      <Popover defaultOpen closeOnScroll onOpenChange={change}>
        <PopoverTrigger disableButtonEnhancement>
          <button>Open</button>
        </PopoverTrigger>
        <PopoverSurface id="surface" aria-label="Scrollable" style={{ height: '100px', overflowY: 'auto' }}>
          <button>Action</button>
          <div style={{ height: '600px' }}>Content</div>
        </PopoverSurface>
      </Popover>,
    );
    cy.get('#surface')
      .scrollTo('bottom')
      .should($node => expect($node[0].scrollTop).to.be.greaterThan(0));
    cy.get('#surface').should('be.visible');
    cy.get('@change').should('not.have.been.called');
  });

  it('passes ordinary axe rules for a named modal with interactive content and its decorative arrow', () => {
    scene({ trapFocus: true, withArrow: true });
    open();
    const sentinel = 'i[data-tabster-dummy][aria-hidden="true"][role="none"][tabindex="0"]';
    cy.get('#surface')
      .find(sentinel)
      .should('have.length', 2)
      .each($node => {
        expect(getComputedStyle($node[0]).contentVisibility).to.equal('hidden');
        expect($node[0].getBoundingClientRect().width).to.be.at.most(1);
      });
    cy.get('#first').focus();
    cy.realPress(['Shift', 'Tab']);
    cy.get('#last').should('have.focus');
    cy.realPress('Tab');
    cy.get('#first').should('have.focus');
    cy.get('#surface').then($node =>
      axe
        .run({ include: [$node[0]], exclude: [sentinel] })
        .then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});

describe('PopoverSurface source and conformance contracts', () => {
  it('forwards native root metadata, caller styling and role overrides', () => {
    const surfaceProps: PopoverSurfaceProps & { 'data-owner': string } = {
      className: 'custom-surface',
      title: 'Details',
      role: 'region',
      'data-owner': 'calendar',
      style: { padding: '7px', borderWidth: '3px' },
    };
    scene({}, surfaceProps);
    open();
    cy.get('#surface')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.class', 'fui-PopoverSurface')
      .and('have.class', 'custom-surface')
      .and('have.attr', 'title', 'Details')
      .and('have.attr', 'role', 'region')
      .and('have.attr', 'data-owner', 'calendar')
      .and('have.css', 'padding-top', '7px')
      .and('have.css', 'border-top-width', '3px');
  });

  it('merges caller and positioning-content refs on the actual surface and clears both after committed exit', () => {
    const ref = React.createRef<HTMLDivElement>();
    let contentRef: PopoverContextValue['contentRef'] | undefined;
    const Probe = () => {
      contentRef = usePopoverContext_unstable(context => context.contentRef);
      return null;
    };
    render(
      <Popover>
        <PopoverTrigger disableButtonEnhancement>
          <button id="trigger">Open</button>
        </PopoverTrigger>
        <PopoverSurface id="surface" aria-label="Details" ref={ref}>
          <Probe />
          <button id="action">Action</button>
        </PopoverSurface>
      </Popover>,
    );
    cy.get('#surface')
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
    open();
    cy.get('#surface').should($node => {
      expect(ref.current).to.equal($node[0]);
      expect(contentRef?.current).to.equal($node[0]);
    });
    cy.get('#action').focus();
    cy.realPress('Escape');
    cy.get('#surface')
      .should('not.exist')
      .then(() => {
        expect(ref.current).to.equal(null);
        expect(contentRef?.current).to.equal(null);
      });
  });

  it('forwards callback refs through surface entry, cleanup and recreation', () => {
    const ref = cy.spy().as('ref');
    render(
      <Popover>
        <PopoverTrigger disableButtonEnhancement>
          <button id="trigger">Open</button>
        </PopoverTrigger>
        <PopoverSurface id="surface" aria-label="Details" ref={ref}>
          <button id="action">Action</button>
        </PopoverSurface>
      </Popover>,
    );
    open();
    cy.get('#surface').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
    cy.get('#action').focus();
    cy.realPress('Escape');
    cy.get('#surface').should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
    open();
    cy.get('#surface').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
  });

  for (const inline of [false, true]) {
    it(`renders the surface in the intended DOM location with inline=${inline}`, () => {
      scene({ inline });
      open();
      cy.get('#scene').then($scene =>
        cy.get('#surface').should($surface => {
          expect($scene[0].contains($surface[0])).to.equal(inline);
        }),
      );
      cy.get('#first').should('have.focus');
    });
  }

  it('uses the caller-provided portal mount node without inventing an extra surface root', () => {
    const Owner = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="mount" ref={setNode} />
          <Popover mountNode={node}>
            <PopoverTrigger disableButtonEnhancement>
              <button id="trigger">Open</button>
            </PopoverTrigger>
            <PopoverSurface id="surface" aria-label="Details">
              <button id="action">Action</button>
            </PopoverSurface>
          </Popover>
        </>
      );
    };
    render(<Owner />);
    cy.get('#mount').should('exist');
    open();
    cy.get('#mount').find('#surface').should('have.length', 1).and('be.visible');
    cy.get('#action').should('have.focus');
  });

  it('updates size, appearance and arrow presence on the same open surface', () => {
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <Popover
          defaultOpen
          size={updated ? 'small' : 'large'}
          appearance={updated ? 'brand' : undefined}
          withArrow={updated}
        >
          <PopoverTrigger disableButtonEnhancement>
            <button>Open</button>
          </PopoverTrigger>
          <PopoverSurface id="surface" aria-label="Details">
            <button id="update" onClick={() => setUpdated(value => !value)}>
              Update
            </button>
          </PopoverSurface>
        </Popover>
      );
    };
    render(<Owner />);
    cy.get('#surface')
      .should('have.css', 'padding-top', '20px')
      .then($original => {
        cy.get('#surface > div').should('not.exist');
        cy.get('#update').realClick();
        cy.get('#surface').should($node => expect($node[0]).to.equal($original[0]));
        cy.get('#surface')
          .should('have.css', 'padding-top', '12px')
          .and('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackground));
        cy.get('#surface > div').should('have.length', 1);
        cy.get('#update').realClick();
        cy.get('#surface > div').should('not.exist');
        cy.get('#surface').should('have.css', 'padding-top', '20px');
      });
  });

  it('uses refreshed native key and mouse handlers without recreating the controlled surface', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <Popover open>
          <PopoverTrigger disableButtonEnhancement>
            <button>Open</button>
          </PopoverTrigger>
          <PopoverSurface
            id="surface"
            aria-label="Details"
            onKeyDown={event => (updated ? second : first)(event.type)}
            onMouseEnter={event => (updated ? second : first)(event.type)}
          >
            <button id="update" onClick={() => setUpdated(true)}>
              Update
            </button>
          </PopoverSurface>
        </Popover>
      );
    };
    cy.get('body').realHover({ position: 'bottomRight' });
    render(<Owner />);
    cy.get('#surface').should('have.attr', 'data-popper-placement');
    cy.get('#surface').then($original => {
      cy.get('#surface').realHover();
      cy.get('@first').should('have.been.calledOnce').its('firstCall.args.0').should('equal', 'mouseenter');
      cy.get('#update').focus();
      cy.realPress('a');
      cy.get('@first').should('have.been.calledTwice').its('lastCall.args.0').should('equal', 'keydown');
      cy.get('#update').realClick();
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get('#surface').realHover();
      cy.get('#update').focus();
      cy.realPress('b');
      cy.get('@second').should('have.been.calledTwice');
      cy.get('@first').should('have.been.calledTwice');
      cy.get('#surface').should($node => expect($node[0]).to.equal($original[0]));
    });
  });

  it('retains custom group semantics and caller tabIndex when an empty surface is focusable', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger disableButtonEnhancement>
          <button>Open</button>
        </PopoverTrigger>
        <PopoverSurface id="surface" aria-label="Empty details" tabIndex={0} />
      </Popover>,
    );
    cy.get('#surface')
      .should('have.attr', 'role', 'group')
      .and('have.attr', 'tabindex', '0')
      .and('have.focus')
      .should($node => expect(computeAccessibleName($node[0])).to.equal('Empty details'));
  });

  it('lets explicit ARIA metadata override the trap defaults without disabling the actual focus policy', () => {
    scene({ trapFocus: true }, { role: 'alertdialog', 'aria-modal': false });
    open();
    cy.get('#surface').should('have.attr', 'role', 'alertdialog').and('have.attr', 'aria-modal', 'false');
    cy.get('#last').focus();
    cy.realPress('Tab');
    cy.get('#first').should('have.focus');
  });

  it('reflects exact provider theme colors across portals without changing surface identity', () => {
    const Owner = () => {
      const [dark, setDark] = React.useState(false);
      return (
        <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
          <Popover defaultOpen>
            <PopoverTrigger disableButtonEnhancement>
              <button>Open</button>
            </PopoverTrigger>
            <PopoverSurface id="surface" aria-label="Details">
              <button id="theme" onClick={() => setDark(true)}>
                Theme
              </button>
            </PopoverSurface>
          </Popover>
        </FluentProvider>
      );
    };
    mount(<Owner />);
    cy.get('#surface')
      .should('have.css', 'background-color', cssColor(webLightTheme.colorNeutralBackground1))
      .then($original => {
        cy.get('#theme').realClick();
        cy.get('#surface')
          .should('have.css', 'background-color', cssColor(webDarkTheme.colorNeutralBackground1))
          .should($node => expect($node[0]).to.equal($original[0]));
      });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`inherits ${dir} direction in its portal and keeps native input/escape behavior`, () => {
      render(
        <Popover>
          <PopoverTrigger disableButtonEnhancement>
            <button id="trigger">Open</button>
          </PopoverTrigger>
          <PopoverSurface id="surface" aria-label="Details">
            <input id="input" aria-label="Notes" />
          </PopoverSurface>
        </Popover>,
        dir,
      );
      open();
      cy.get('#surface').should('have.css', 'direction', dir);
      cy.get('#input').should('have.focus');
      cy.realType('notes');
      cy.get('#input').should('have.value', 'notes');
      cy.realPress('Escape');
      cy.get('#surface').should('not.exist');
      cy.get('#trigger').should('have.focus');
    });
  }
});
