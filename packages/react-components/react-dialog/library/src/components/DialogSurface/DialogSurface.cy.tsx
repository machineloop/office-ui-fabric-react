import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/dom';
import type { JSXElement } from '@fluentui/react-utilities';
import { Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger } from '@fluentui/react-dialog';
import type { DialogProps, DialogSurfaceProps } from '@fluentui/react-dialog';
import { OverlayDrawer, DrawerBody } from '@fluentui/react-drawer';
import { useDialogSurfaceTestStyles } from './DialogSurfaceTestStyles.styles';
import { Fade } from '@fluentui/react-motion-components-preview';
import { useDialogSurfaceContext_unstable } from '../../contexts';
import type { MotionImperativeRef } from '@fluentui/react-motion';

const wrap = (element: JSXElement) => <FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>;
const mount = (element: JSXElement) => mountBase(wrap(element));
const settled = (selector: string) =>
  cy
    .get(selector)
    .should($element =>
      expect(
        $element[0].getAnimations({ subtree: true }).some(animation => animation.playState === 'running'),
      ).to.equal(false),
    );

const Surface = (props: DialogSurfaceProps) => (
  <DialogSurface id="surface" backdrop={{ id: 'backdrop' }} {...props}>
    {props.children ?? (
      <DialogBody>
        <DialogTitle action={null}>Surface contract</DialogTitle>
        <DialogContent id="description">A short explanation.</DialogContent>
        <button id="first">First action</button>
        <button id="last">Last action</button>
      </DialogBody>
    )}
  </DialogSurface>
);

const Example = ({ surface, ...props }: Omit<DialogProps, 'children'> & { surface?: DialogSurfaceProps }) => (
  <Dialog {...props}>
    <DialogTrigger disableButtonEnhancement>
      <button id="open">Open surface</button>
    </DialogTrigger>
    <Surface {...surface} />
  </Dialog>
);

const backdropColor = (selector: string, transparent: boolean) =>
  cy.get(selector).should($element => {
    const color = $element[0].ownerDocument.defaultView!.getComputedStyle($element[0]).backgroundColor;
    expect(color).to.equal(transparent ? 'rgba(0, 0, 0, 0)' : teamsLightTheme.colorBackgroundOverlay);
  });

describe('DialogSurface supported API edges and accessibility', () => {
  for (const modalType of ['modal', 'alert', 'non-modal'] as const) {
    it(`delivers backdrop clicks before dismissal for modalType=${modalType}`, () => {
      const order: string[] = [];
      const changed = cy.stub().as('changed');
      mount(
        <Example
          defaultOpen
          modalType={modalType}
          onOpenChange={(event, data) => {
            order.push(data.type);
            changed(event, data);
          }}
          surface={{ backdrop: { id: 'backdrop', onClick: () => order.push('consumer') } }}
        />,
      );
      settled('#surface');
      cy.get('#backdrop').realClick({ position: 'topLeft' });
      if (modalType === 'modal') {
        cy.get('#surface').should('not.exist');
        cy.get('@changed').should('have.been.calledOnce');
        cy.then(() => {
          expect(order).to.deep.equal(['consumer', 'backdropClick']);
          expect(changed.firstCall.args[1]).to.include({ type: 'backdropClick', open: false });
          expect(changed.firstCall.args[0]).to.equal(changed.firstCall.args[1].event);
        });
      } else {
        cy.get('#surface').should('be.visible');
        cy.get('@changed').should('not.have.been.called');
        cy.then(() => expect(order).to.deep.equal(['consumer']));
      }
    });
  }

  it('honors backdrop preventDefault and uses the latest handler and appearance on update', () => {
    const changed = cy.stub().as('changed');
    const blocked = cy.stub().as('blocked');
    const allowed = cy.stub().as('allowed');
    const Updating = () => {
      const [prevent, setPrevent] = React.useState(true);
      return (
        <Example
          defaultOpen
          onOpenChange={changed}
          surface={{
            backdrop: {
              id: 'backdrop',
              appearance: prevent ? 'transparent' : 'dimmed',
              onClick: event => {
                if (prevent) {
                  blocked();
                  event.preventDefault();
                } else {
                  allowed();
                }
              },
            },
            children: (
              <button id="allow" onClick={() => setPrevent(false)}>
                Allow dismissal
              </button>
            ),
          }}
        />
      );
    };
    mount(<Updating />);
    backdropColor('#backdrop', true);
    cy.get('#backdrop').realClick({ position: 'topLeft' });
    cy.get('@blocked').should('have.been.calledOnce');
    cy.get('@changed').should('not.have.been.called');
    settled('#surface');
    cy.get('#allow').realClick();
    backdropColor('#backdrop', false);
    cy.get('#backdrop').realClick({ position: 'topLeft' });
    cy.get('#surface').should('not.exist');
    cy.get('@allowed').should('have.been.calledOnce');
    cy.get('@changed').should('have.been.calledOnce');
  });

  it('calls consumer keydown before Escape dismissal and honors preventDefault after updates', () => {
    const seen: Array<[string, boolean]> = [];
    const changed = cy.stub().as('changed');
    const Updating = () => {
      const [prevent, setPrevent] = React.useState(true);
      return (
        <Example
          defaultOpen
          onOpenChange={changed}
          surface={{
            onKeyDown: event => {
              seen.push([event.key, event.defaultPrevented]);
              if (prevent) {
                event.preventDefault();
              }
            },
            children: (
              <button id="allow" onClick={() => setPrevent(false)}>
                Allow Escape
              </button>
            ),
          }}
        />
      );
    };
    mount(<Updating />);
    cy.get('#allow').should('be.focused').realPress('Escape');
    cy.get('#surface').should('be.visible');
    cy.get('@changed').should('not.have.been.called');
    settled('#surface');
    cy.get('#allow').realClick().realPress('a');
    cy.get('@changed').should('not.have.been.called');
    cy.get('#allow').realPress('Escape');
    cy.get('#surface').should('not.exist');
    cy.then(() => {
      expect(seen).to.deep.equal([
        ['Escape', false],
        ['a', false],
        ['Escape', false],
      ]);
      expect(changed.firstCall.args[1]).to.include({ type: 'escapeKeyDown', open: false });
      expect(changed.firstCall.args[0]).to.equal(changed.firstCall.args[1].event);
      expect(changed.firstCall.args[0].isDefaultPrevented()).to.equal(true);
    });
  });

  it('removes a nullable backdrop without weakening surface focus trapping', () => {
    mount(<Example defaultOpen surface={{ backdrop: null }} />);
    cy.get('.fui-DialogSurface__backdrop').should('not.exist');
    cy.get('#first').should('be.focused').realPress(['Shift', 'Tab']);
    cy.get('#last').should('be.focused').realPress('Tab');
    cy.get('#first').should('be.focused').realPress('Escape');
    cy.get('#surface').should('not.exist');
  });

  it('preserves backdrop render-function attributes and native dismissal', () => {
    mount(
      <Example
        defaultOpen
        surface={{
          backdrop: {
            id: 'backdrop',
            appearance: 'transparent',
            children: (Slot: React.ElementType, props: React.HTMLAttributes<HTMLDivElement>) => (
              <Slot {...props} data-rendered="backdrop" />
            ),
          },
        }}
      />,
    );
    backdropColor('#backdrop', true);
    cy.get('#backdrop').should('have.attr', 'data-rendered', 'backdrop').and('have.attr', 'aria-hidden', 'true');
    cy.get('#backdrop').realClick({ position: 'topLeft' });
    cy.get('#surface').should('not.exist');
  });

  it('renders custom root markup while preserving modal attributes and merged refs', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <Dialog defaultOpen>
        <DialogSurface ref={ref} id="custom-root" aria-label="Rendered surface">
          <button id="custom-action">Custom action</button>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#custom-action').should('be.focused');
    cy.get('#custom-root').should($root => {
      expect(ref.current).to.equal($root[0]);
      expect(getByRole($root[0].ownerDocument.body, 'dialog', { name: 'Rendered surface' })).to.equal($root[0]);
    });
    cy.get('#custom-action').realPress('Escape');
    cy.get('#custom-root').should('not.exist');
    cy.then(() => expect(ref.current).to.equal(null));
  });

  for (const objectNode of [false, true]) {
    it(`moves portal surface and backdrop between mount nodes using objectNode=${objectNode}`, () => {
      let move: () => void;
      const PortalExample = () => {
        const [first, setFirst] = React.useState<HTMLDivElement | null>(null);
        const [second, setSecond] = React.useState<HTMLDivElement | null>(null);
        const [moved, setMoved] = React.useState(false);
        move = () => setMoved(true);
        const element = moved ? second : first;
        return (
          <>
            <div id="portal-one" ref={setFirst} />
            <div id="portal-two" ref={setSecond} />
            {first && second && (
              <Example
                defaultOpen
                surface={{
                  mountNode: objectNode ? { element, className: 'surface-portal' } : element,
                }}
              />
            )}
          </>
        );
      };
      mount(<PortalExample />).then(({ rerender }) => {
        cy.get('#portal-one #surface').should('be.visible');
        cy.get('#portal-one #backdrop').should('exist');
        cy.then(() => move());
        cy.get('#portal-two #surface').should('be.visible');
        cy.get('#portal-two #backdrop').should('exist');
        cy.get('#portal-one').should('be.empty');
        cy.get('#first').realClick().realPress('Escape');
        cy.get('#portal-two #surface').should('not.exist');
        cy.get('#portal-two #backdrop').should('not.exist');
        cy.then(() => rerender(wrap(<div>Unmounted</div>)));
        cy.get('#surface').should('not.exist');
        cy.get('.fui-DialogSurface__backdrop').should('not.exist');
      });
    });
  }

  it('adds a portal wrapper class when mountNode specifies only className', () => {
    mount(<Example defaultOpen surface={{ mountNode: { className: 'custom-portal' } }} />);
    cy.get('.custom-portal #surface').should('be.visible');
    cy.get('.custom-portal #backdrop').should('exist');
  });

  it('preserves root and backdrop consumer style and class precedence', () => {
    const Styled = () => {
      const styles = useDialogSurfaceTestStyles();
      return (
        <Example
          defaultOpen
          surface={{
            className: styles.root,
            style: { width: '350px' },
            backdrop: { id: 'backdrop', className: styles.backdrop, appearance: 'transparent' },
          }}
        />
      );
    };
    mount(<Styled />);
    cy.get('#surface')
      .should('have.class', 'fui-DialogSurface')
      .and('have.css', 'max-width', '400px')
      .and('have.css', 'width', '350px')
      .and('have.css', 'background-color', 'rgb(91, 95, 199)');
    cy.get('#backdrop')
      .should('have.class', 'fui-DialogSurface__backdrop')
      .and('have.css', 'background-color', 'rgb(91, 95, 199)');
  });

  for (const width of [480, 481]) {
    it(`constrains the fixed surface within the width=${width} breakpoint`, () => {
      cy.viewport(width, 720);
      mount(<Example defaultOpen />);
      settled('#surface');
      cy.get('#surface')
        .should($surface => {
          const rect = $surface[0].getBoundingClientRect();
          expect(rect.left).to.be.at.least(0);
          expect(rect.right).to.be.at.most(width);
        })
        .and('have.css', 'max-width', width === 480 ? '480px' : '600px');
      cy.get('#last').realClick().should('be.focused');
    });
  }

  for (const height of [359, 360]) {
    it(`supports native overflow at the height=${height} short-screen boundary`, () => {
      cy.viewport(800, height);
      mount(
        <Example
          defaultOpen
          surface={{
            children: (
              <DialogBody>
                <DialogTitle action={null}>Long surface</DialogTitle>
                <DialogContent id="long-surface-content">
                  {Array.from({ length: 40 }, (_, index) => (
                    <p key={index}>Long surface paragraph {index}</p>
                  ))}
                  <button id="bottom-action">Bottom action</button>
                </DialogContent>
              </DialogBody>
            ),
          }}
        />,
      );
      settled('#surface');
      cy.get('#surface').should('have.css', 'overflow-y', height === 359 ? 'auto' : 'visible');
      const scrollSelector = height === 359 ? '#surface' : '#long-surface-content';
      cy.get(scrollSelector)
        .should($scroll => expect($scroll[0].scrollHeight).to.be.greaterThan($scroll[0].clientHeight))
        .scrollTo('top')
        .scrollTo('bottom')
        .should($scroll => expect($scroll[0].scrollTop).to.be.greaterThan(0));
      cy.get('#surface').should($surface => {
        const rect = $surface[0].getBoundingClientRect();
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom).to.be.at.most(height);
      });
      cy.get('#bottom-action').realClick().should('be.focused').realPress('Escape');
      cy.get('#surface').should('not.exist');
    });
  }

  it('preserves the portal provider direction and native focus loop in RTL', () => {
    mountBase(
      <FluentProvider theme={teamsLightTheme} dir="rtl">
        <Example defaultOpen />
      </FluentProvider>,
    );
    cy.get('#surface').should('have.css', 'direction', 'rtl');
    cy.get('#first').should('be.focused').realPress(['Shift', 'Tab']);
    cy.get('#last').should('be.focused').realPress('Tab');
    cy.get('#first').should('be.focused');
  });

  it('changes modal semantics and releases the owned page lock without unmounting the surface', () => {
    const Updating = () => {
      const [modalType, setType] = React.useState<DialogProps['modalType']>('modal');
      return (
        <Example
          defaultOpen
          modalType={modalType}
          surface={{
            children: (
              <>
                <button id="nonmodal" onClick={() => setType('non-modal')}>
                  Nonmodal
                </button>
                <button id="alert" onClick={() => setType('alert')}>
                  Alert
                </button>
              </>
            ),
          }}
        />
      );
    };
    mount(
      <>
        <Updating />
        {Array.from({ length: 100 }, (_, i) => (
          <p key={i}>Page paragraph {i}</p>
        ))}
      </>,
    );
    cy.get('html').should('have.css', 'overflow', 'visible clip');
    settled('#surface');
    cy.get('#nonmodal').realClick();
    cy.get('#surface').should('have.attr', 'aria-modal', 'false');
    cy.get('html').should('not.have.css', 'overflow', 'visible clip');
    cy.get('#alert').realClick();
    cy.get('#surface').should('have.attr', 'role', 'alertdialog').and('have.attr', 'aria-modal', 'true');
    cy.get('html').should('have.css', 'overflow', 'visible clip');
    cy.get('#alert').realPress('Escape');
    cy.get('#surface').should('not.exist');
    cy.get('html').should('not.have.css', 'overflow', 'visible clip');
  });
});

describe('DialogSurface adversarial review regressions', () => {
  beforeEach(() =>
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] },
      }),
    ),
  );
  afterEach(() =>
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    ),
  );

  it('forwards backdrop imperative pause, rate and resume to the native effect and clears the ref', () => {
    const ref = React.createRef<MotionImperativeRef | undefined>();
    const finished = cy.stub().as('imperativeFinished');
    mount(
      <Example
        unmountOnClose={false}
        surfaceMotion={null}
        surface={{
          backdropMotion: {
            imperativeRef: ref,
            duration: 10000,
            delay: 30,
            easing: 'linear',
            outOpacity: 0.15,
            inOpacity: 0.8,
            onMotionFinish: finished,
          },
        }}
      />,
    ).then(({ rerender }) => {
      cy.get('#open').realClick();
      cy.get('#backdrop').should($backdrop => {
        const animations = $backdrop[0].getAnimations();
        expect(animations).to.have.length(1);
        expect(animations[0].playState).to.equal('running');
        const effect = animations[0].effect as KeyframeEffect;
        expect(effect.getTiming()).to.include({ duration: 10000, delay: 30, easing: 'linear' });
        expect(effect.getKeyframes().map(frame => frame.opacity)).to.deep.equal(['0.15', '0.8']);
        expect(ref.current).to.have.keys('setPlayState', 'setPlaybackRate');
      });
      cy.then(() => ref.current!.setPlayState('paused'));
      cy.get('#backdrop').should($backdrop => expect($backdrop[0].getAnimations()[0].playState).to.equal('paused'));
      cy.then(() => ref.current!.setPlaybackRate(0.5));
      cy.get('#backdrop').should($backdrop => expect($backdrop[0].getAnimations()[0].playbackRate).to.equal(0.5));
      cy.then(() => {
        ref.current!.setPlaybackRate(1000);
        ref.current!.setPlayState('running');
      });
      cy.get('@imperativeFinished').should('have.been.calledWith', null, { direction: 'enter' });
      cy.get('#backdrop').should($backdrop => expect($backdrop[0].getAnimations()[0].playState).to.equal('finished'));
      cy.then(() => rerender(wrap(<p>Unmounted</p>)));
      cy.get('#backdrop').should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  });

  it('uses latest independent exit timing, opacity and callbacks on a retained backdrop', () => {
    const initialStart = cy.stub().as('initialBackdropStart');
    const initialFinish = cy.stub().as('initialBackdropFinish');
    const latestStart = cy.stub().as('latestBackdropStart');
    const latestFinish = cy.stub().as('latestBackdropFinish');
    let update: () => void;
    let enterAnimation: Animation;
    const Updating = () => {
      const [updated, setUpdated] = React.useState(false);
      update = () => setUpdated(true);
      return (
        <Example
          unmountOnClose={false}
          surfaceMotion={null}
          surface={{
            backdropMotion: {
              duration: 100,
              delay: 10,
              easing: 'linear',
              exitDuration: updated ? 240 : 180,
              exitDelay: updated ? 20 : 25,
              exitEasing: updated ? 'ease-in' : 'ease-out',
              outOpacity: updated ? 0.3 : 0.2,
              inOpacity: updated ? 0.6 : 0.7,
              onMotionStart: updated ? latestStart : initialStart,
              onMotionFinish: updated ? latestFinish : initialFinish,
            },
          }}
        />
      );
    };
    mount(<Updating />);
    cy.get('#open').realClick();
    cy.get('@initialBackdropFinish').should('have.been.calledWith', null, { direction: 'enter' });
    cy.get('#backdrop')
      .should($backdrop => {
        const animation = $backdrop[0].getAnimations()[0];
        const effect = animation.effect as KeyframeEffect;
        expect(effect.getTiming()).to.include({ duration: 100, delay: 10, easing: 'linear' });
        expect(effect.getKeyframes().map(frame => frame.opacity)).to.deep.equal(['0.2', '0.7']);
      })
      .then($backdrop => {
        enterAnimation = $backdrop[0].getAnimations()[0];
      });
    cy.then(() => {
      initialStart.resetHistory();
      initialFinish.resetHistory();
      update();
    });
    cy.get('#first').should('be.focused').realPress('Escape');
    cy.get('@latestBackdropFinish').should('have.been.calledWith', null, { direction: 'exit' });
    cy.get('@latestBackdropStart').should('have.been.calledWith', null, { direction: 'exit' });
    cy.get('@initialBackdropStart').should('not.have.been.called');
    cy.get('@initialBackdropFinish').should('not.have.been.called');
    cy.get('#backdrop').should($backdrop => {
      const animation = $backdrop[0].getAnimations()[0];
      expect(animation).not.to.equal(enterAnimation);
      expect(animation.playState).to.equal('finished');
      const effect = animation.effect as KeyframeEffect;
      expect(effect.getTiming()).to.include({ duration: 240, delay: 20, easing: 'ease-in' });
      expect(effect.getKeyframes().map(frame => frame.opacity)).to.deep.equal(['0.6', '0.3']);
    });
    cy.get('#open').should('be.focused');
  });
});

describe('DialogSurface documented contracts', () => {
  it('portals the visible surface and hidden backdrop with title-based accessible name', () => {
    mount(<Example defaultOpen />);
    cy.get('#surface').should('be.visible').and('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
    cy.get('#backdrop').should('have.attr', 'aria-hidden', 'true');
    cy.get('#first').should('be.focused');
    cy.get('#surface').should($surface => {
      expect(getByRole($surface[0].ownerDocument.body, 'dialog', { name: 'Surface contract' })).to.equal($surface[0]);
      expect($surface[0].closest('[data-cy-root]')).to.equal(null);
      expect($surface[0].hasAttribute('aria-describedby')).to.equal(false);
    });
  });

  describe('DialogSurface meaningful unit-derived browser behavior', () => {
    afterEach(() =>
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      ),
    );

    it('forwards a callback ref and native root attributes then clears the ref on unmount', () => {
      const ref = cy.stub().as('surfaceRef');
      mount(
        <Dialog defaultOpen>
          <DialogSurface
            ref={ref}
            id="native-surface"
            title="Native title"
            data-contract="forwarded"
            tabIndex={0}
            aria-label="Native surface"
          >
            <button>Action</button>
          </DialogSurface>
        </Dialog>,
      );
      cy.get('#native-surface')
        .should('have.attr', 'title', 'Native title')
        .and('have.attr', 'data-contract', 'forwarded')
        .and('have.attr', 'tabindex', '0');
      cy.get('#native-surface').should($surface => expect(ref.lastCall.args[0]).to.equal($surface[0]));
      cy.get('#native-surface button').should('be.focused').realPress('Escape');
      cy.get('#native-surface').should('not.exist');
      cy.then(() => expect(ref.lastCall.args[0]).to.equal(null));
    });

    it('updates the computed accessible name and description without replacing the root', () => {
      let original: HTMLElement;
      const Updating = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <Example
            defaultOpen
            surface={{
              'aria-label': updated ? 'Updated name' : 'Initial name',
              'aria-describedby': 'dynamic-description',
              children: (
                <>
                  <p id="dynamic-description">{updated ? 'Updated description' : 'Initial description'}</p>
                  <button id="update-label" onClick={() => setUpdated(true)}>
                    Update label
                  </button>
                </>
              ),
            }}
          />
        );
      };
      mount(<Updating />);
      cy.get('#surface')
        .should($surface => {
          expect(
            getByRole($surface[0].ownerDocument.body, 'dialog', {
              name: 'Initial name',
              description: 'Initial description',
            }),
          ).to.equal($surface[0]);
        })
        .then($surface => {
          original = $surface[0];
        });
      settled('#surface');
      cy.get('#update-label').realClick();
      cy.get('#surface').should($surface => {
        expect($surface[0]).to.equal(original);
        expect(
          getByRole($surface[0].ownerDocument.body, 'dialog', {
            name: 'Updated name',
            description: 'Updated description',
          }),
        ).to.equal(original);
      });
    });

    it('provides surface context to descendants through the portal', () => {
      const Probe = () => <output id="surface-context">{String(useDialogSurfaceContext_unstable())}</output>;
      mount(
        <>
          <Probe />
          <Example
            defaultOpen
            surface={{
              children: (
                <>
                  <Probe />
                  <button>Action</button>
                </>
              ),
            }}
          />
        </>,
      );
      cy.get('#surface #surface-context').should('have.text', 'true');
      cy.get('[data-cy-root] #surface-context').should('have.text', 'false');
    });

    it('releases StrictMode scroll ownership and portal markup on native unmount', () => {
      mount(
        <React.StrictMode>
          <Example defaultOpen />
          {Array.from({ length: 100 }, (_, i) => (
            <p key={i}>Page {i}</p>
          ))}
        </React.StrictMode>,
      ).then(({ rerender }) => {
        cy.get('html').should('have.css', 'overflow', 'visible clip');
        cy.get('#first').should('be.focused');
        cy.then(() => rerender(wrap(<p>Unmounted</p>)));
        cy.get('#surface').should('not.exist');
        cy.get('#backdrop').should('not.exist');
        cy.get('html').should('not.have.css', 'overflow', 'visible clip');
      });
    });

    for (const reduced of [false, true]) {
      it(`runs backdrop enter and exit callbacks and custom duration with reduced motion=${reduced}`, () => {
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Emulation.setEmulatedMedia',
            params: { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] },
          }),
        );
        const started = cy.stub().as('backdropStarted');
        const finished = cy.stub().as('backdropFinished');
        mount(
          <Example
            surface={{
              backdropMotion: { duration: 120, easing: 'linear', onMotionStart: started, onMotionFinish: finished },
            }}
          />,
        );
        cy.get('#open').realClick();
        cy.get('@backdropFinished').should('have.been.called');
        cy.get('#backdrop').should($backdrop => {
          const animations = $backdrop[0].getAnimations();
          expect(animations).to.have.length(1);
          expect(animations[0].playState).to.equal('finished');
          expect(animations[0].effect!.getTiming()).to.include({ duration: reduced ? 1 : 120, easing: 'linear' });
        });
        cy.get('#first').realPress('Escape');
        cy.get('#surface').should('not.exist');
        cy.then(() => {
          for (const callback of [started, finished]) {
            const directions = callback.getCalls().map(call => call.args[1].direction);
            expect(directions[0]).to.equal('enter');
            expect(directions.at(-1)).to.equal('exit');
            expect(directions.filter(direction => direction === 'exit')).to.have.length(1);
            expect(directions.slice(0, -1).every(direction => direction === 'enter')).to.equal(true);
          }
        });
      });
    }

    it('supports the backdrop motion render function and forwards children plus visibility updates', () => {
      const finished = cy.stub().as('customBackdropFinished');
      const visible: Array<boolean | undefined> = [];
      mount(
        <Example
          surface={{
            backdropMotion: {
              children: (_, props) => {
                visible.push(props.visible);
                return (
                  <Fade {...props} duration={100} onMotionFinish={finished}>
                    {props.children}
                  </Fade>
                );
              },
            },
          }}
        />,
      );
      cy.get('#open').realClick();
      cy.get('@customBackdropFinished').should('have.been.called');
      cy.get('#backdrop').should('have.css', 'opacity', '1');
      cy.get('#first').realPress('Escape');
      cy.get('#surface').should('not.exist');
      cy.then(() => {
        expect(visible).to.include(true).and.include(false);
        expect(finished.getCalls().map(call => call.args[1].direction)).to.deep.equal(['enter', 'exit']);
      });
    });

    it('disables backdrop motion without suppressing native dismissal', () => {
      mount(<Example surfaceMotion={null} surface={{ backdropMotion: null }} />);
      cy.get('#open').realClick();
      cy.get('#backdrop').should($backdrop => expect($backdrop[0].getAnimations()).to.have.length(0));
      cy.get('#backdrop').realClick({ position: 'topLeft' });
      cy.get('#surface').should('not.exist');
      cy.get('#backdrop').should('not.exist');
    });

    it('forwards the backdrop slot ref and clears it when the surface is removed', () => {
      const ref = React.createRef<HTMLDivElement>();
      mount(<Example defaultOpen surface={{ backdrop: { id: 'backdrop', ref } }} />);
      cy.get('#backdrop').should($backdrop => expect(ref.current).to.equal($backdrop[0]));
      cy.get('#backdrop').realClick({ position: 'topLeft' });
      cy.get('#surface').should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });

    it('renders a root children function with native focus and semantics intact', () => {
      mount(
        <Dialog defaultOpen>
          <DialogSurface id="rendered-root" aria-label="Custom root">
            {(Slot: React.ElementType, props: React.HTMLAttributes<HTMLDivElement>) => (
              <Slot {...props} data-rendered="root">
                <button id="rendered-action">Rendered action</button>
              </Slot>
            )}
          </DialogSurface>
        </Dialog>,
      );
      cy.get('#rendered-root').should('have.attr', 'data-rendered', 'root').and('have.attr', 'role', 'dialog');
      cy.get('#rendered-action').should('be.focused').realPress('Escape');
      cy.get('#rendered-root').should('not.exist');
    });

    it('retains animated closed nodes but hides their semantics and pointer interaction', () => {
      mount(<Example unmountOnClose={false} surface={{ backdropMotion: { duration: 80 } }} />);
      cy.get('#surface').should('have.attr', 'aria-hidden', 'true').and('have.css', 'pointer-events', 'none');
      cy.get('#backdrop').should('have.css', 'opacity', '0').and('have.css', 'pointer-events', 'none');
      cy.get('#open').realClick();
      cy.get('#first').should('be.focused');
      settled('#surface');
      cy.get('#backdrop').should('have.css', 'opacity', '1');
      cy.get('#first').realPress('Escape');
      cy.get('#surface').should('have.attr', 'aria-hidden', 'true').and('have.css', 'pointer-events', 'none');
      cy.get('#backdrop').should('have.css', 'opacity', '0').and('have.css', 'pointer-events', 'none');
      cy.get('#open').should('be.focused');
    });

    it('hides a retained null-motion backdrop before open and after close', () => {
      mount(<Example unmountOnClose={false} surfaceMotion={null} surface={{ backdropMotion: null }} />);
      cy.get('#backdrop').should('not.be.visible');
      cy.get('#open').realClick();
      cy.get('#backdrop').should('not.have.attr', 'hidden');
      cy.get('#backdrop').should('have.css', 'display', 'block');
      cy.get('#backdrop').should($backdrop =>
        expect($backdrop[0].ownerDocument.elementFromPoint(10, 10)).to.equal($backdrop[0]),
      );
      cy.get('#first').should('be.focused').realPress('Escape');
      cy.get('#backdrop').should('not.be.visible').and('have.css', 'pointer-events', 'none');
      cy.get('#open').should('be.focused').realClick();
      cy.get('#backdrop').should('not.have.attr', 'hidden');
      cy.get('#backdrop').should('have.css', 'display', 'block');
      cy.get('#first').should('be.focused');
      cy.get('#backdrop').realClick({ position: 'topLeft', x: 10, y: 10 });
      cy.get('#backdrop').should('have.attr', 'hidden');
      cy.get('#backdrop').should('have.css', 'display', 'none');
      cy.get('#surface').should('not.be.visible');
    });
  });

  it('accepts an explicit name and short accessible description without a title', () => {
    mount(
      <Example
        defaultOpen
        surface={{
          'aria-label': 'Confirm removal',
          'aria-describedby': 'short-description',
          children: (
            <>
              <p id="short-description">Removal is permanent.</p>
              <button>Cancel</button>
            </>
          ),
        }}
      />,
    );
    cy.get('#surface').should('not.have.attr', 'aria-labelledby');
    cy.get('#surface').should($surface => {
      expect(
        getByRole($surface[0].ownerDocument.body, 'dialog', {
          name: 'Confirm removal',
          description: 'Removal is permanent.',
        }),
      ).to.equal($surface[0]);
    });
  });

  it('accepts explicit labelledby and aria-modal false for popup accessibility', () => {
    mount(
      <Example
        defaultOpen
        surface={{
          'aria-labelledby': 'custom-title',
          'aria-modal': false,
          children: (
            <>
              <h2 id="custom-title">Custom title</h2>
              <button>Popup trigger</button>
            </>
          ),
        }}
      />,
    );
    cy.get('#surface').should('have.attr', 'aria-modal', 'false');
    cy.get('#surface').should($surface =>
      expect(getByRole($surface[0].ownerDocument.body, 'dialog', { name: 'Custom title' })).to.equal($surface[0]),
    );
  });

  for (const appearance of [undefined, 'dimmed', 'transparent'] as const) {
    it(`uses ${appearance ?? 'default dimmed'} appearance for a standalone backdrop`, () => {
      mount(<Example defaultOpen surface={{ backdrop: { id: 'backdrop', appearance } }} />);
      backdropColor('#backdrop', appearance === 'transparent');
      cy.get('#backdrop').should('not.have.attr', 'appearance');
      cy.get('#surface').should('be.visible');
    });

    it(`uses ${appearance ?? 'default transparent'} appearance for a nested backdrop`, () => {
      mount(
        <Dialog>
          <DialogTrigger disableButtonEnhancement>
            <button id="parent-open">Open parent</button>
          </DialogTrigger>
          <DialogSurface aria-label="Parent" backdrop={{ id: 'parent-backdrop' }}>
            <Dialog>
              <DialogTrigger disableButtonEnhancement>
                <button id="nested-open">Open nested</button>
              </DialogTrigger>
              <Surface backdrop={{ id: 'backdrop', appearance }} />
            </Dialog>
          </DialogSurface>
        </Dialog>,
      );
      cy.get('#parent-open').realClick();
      settled('[aria-label="Parent"]');
      cy.get('#nested-open').should('be.focused').realClick();
      backdropColor('#backdrop', appearance !== 'dimmed');
      backdropColor('#parent-backdrop', false);
      cy.get('#first').should('be.focused');
      cy.get('#first').realPress('Escape');
      cy.get('#surface').should('not.exist');
      cy.get('[aria-label="Parent"]').should('be.visible');
      cy.get('#nested-open').should('be.focused');
    });
  }

  it('uses a dimmed default backdrop inside an OverlayDrawer', () => {
    const DrawerExample = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button id="show-drawer" onClick={() => setOpen(true)}>
            Show drawer
          </button>
          <OverlayDrawer open={open}>
            <DrawerBody>
              <Dialog>
                <DialogTrigger disableButtonEnhancement>
                  <button id="drawer-open">Open dialog</button>
                </DialogTrigger>
                <Surface />
              </Dialog>
            </DrawerBody>
          </OverlayDrawer>
        </>
      );
    };
    mount(<DrawerExample />);
    cy.get('#show-drawer').realClick();
    settled('.fui-OverlayDrawer');
    cy.get('#drawer-open').should('be.focused').realClick();
    backdropColor('#backdrop', false);
    cy.get('#surface').should('be.visible');
    cy.get('#first').should('be.focused');
  });

  it('omits the default non-modal backdrop and permits native outside focus', () => {
    mount(<Example defaultOpen modalType="non-modal" surface={{ backdrop: undefined }} />);
    cy.get('#backdrop').should('not.exist');
    cy.get('#surface').should('have.attr', 'aria-modal', 'false');
    cy.get('#open').realClick().should('be.focused');
    cy.realPress('Escape');
    cy.get('#surface').should('be.visible');
    cy.get('#first').realClick().realPress('Escape');
    cy.get('#surface').should('not.exist');
  });

  it('renders an alertdialog that ignores backdrop dismissal but accepts Escape', () => {
    mount(<Example defaultOpen modalType="alert" />);
    cy.get('#surface').should($surface =>
      expect(getByRole($surface[0].ownerDocument.body, 'alertdialog', { name: 'Surface contract' })).to.equal(
        $surface[0],
      ),
    );
    cy.get('#backdrop').realClick({ position: 'topLeft' });
    cy.get('#surface').should('be.visible');
    cy.get('#first').realClick().realPress('Escape');
    cy.get('#surface').should('not.exist');
  });

  it('focuses the empty-action surface as a keyboard fallback and restores the trigger', () => {
    mount(<Example surface={{ 'aria-label': 'Loading', children: <p>Loading content</p> }} />);
    cy.get('#open').realClick();
    cy.get('#surface').should('be.focused').and('have.attr', 'tabindex', '-1').realPress('Escape');
    cy.get('#surface').should('not.exist');
    cy.get('#open').should('be.focused');
  });

  it('retains a hidden null-motion surface and form state across close and reopen', () => {
    mount(
      <Example
        unmountOnClose={false}
        surfaceMotion={null}
        surface={{
          'aria-label': 'Retained surface',
          backdropMotion: { duration: 0 },
          children: <input id="draft" aria-label="Draft" defaultValue="initial" />,
        }}
      />,
    );
    cy.get('#surface').should('not.be.visible').and('have.attr', 'aria-hidden', 'true');
    cy.get('#open').realClick();
    cy.get('#draft').should('be.focused').clear().type('saved').realPress('Escape');
    cy.get('#surface').should('not.be.visible').and('have.attr', 'hidden');
    cy.get('#open').should('be.focused').realClick();
    cy.get('#surface').should('be.visible').and('not.have.attr', 'aria-hidden');
    cy.get('#draft').should('have.value', 'saved').and('be.focused');
  });
});
