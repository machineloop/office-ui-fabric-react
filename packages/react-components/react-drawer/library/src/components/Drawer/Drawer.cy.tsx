import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';

import { testDrawerBaseScenarios } from '../../e2e/DrawerShared';
import { Drawer } from './Drawer';
import { overlayDrawerClassNames } from '../OverlayDrawer';
import { inlineDrawerClassNames } from '../InlineDrawer';
import type { JSXElement } from '@fluentui/react-utilities';
import { useFluent_unstable } from '@fluentui/react-shared-contexts';
import { useRestoreFocusSource, useRestoreFocusTarget } from '@fluentui/react-tabster';
import { DrawerBody, DrawerHeader, DrawerHeaderTitle, DrawerFooter, DrawerHeaderNavigation } from '../../index';
import type { DrawerProps } from './Drawer.types';
import type { OverlayDrawerProps } from '../OverlayDrawer';
import { useDrawerTestStyles } from './Drawer.cy.styles';
import { createPresenceComponent } from '@fluentui/react-motion';
import type { PresenceComponentProps } from '@fluentui/react-motion';
import { Field } from '@fluentui/react-field';
import { Input } from '@fluentui/react-input';
import { useDrawer_unstable } from './useDrawer';
import { useDrawerStyles_unstable } from './useDrawerStyles.styles';
import { renderDrawer_unstable } from './renderDrawer';
import { useDrawerContextValue, useDrawerContext_unstable } from '../../contexts/drawerContext';

const LongMotion = createPresenceComponent({
  enter: { keyframes: [{ opacity: 1 }, { opacity: 1 }], duration: 3000 },
  exit: { keyframes: [{ opacity: 1 }, { opacity: 1 }], duration: 3000 },
});

const pauseTestMotions = () => {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] },
    }),
  );
  return cy.window().then(win => {
    expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(false);
    const animate = win.Element.prototype.animate;
    cy.stub(win.Element.prototype, 'animate').callsFake(function (
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions,
    ) {
      const animation = animate.call(this, keyframes, options);
      if (typeof options === 'object' && options.duration === 3000) {
        animation.pause();
      }
      return animation;
    });
  });
};

const surface = () => cy.get('[data-test="surface"]');
const scrim = () => cy.get(`.${overlayDrawerClassNames.backdrop}`);
const modes = ['overlay', 'inline'] as const;

const Campaign = ({
  children,
  type: initialType = 'overlay',
  onOpenChange,
  ...props
}: DrawerProps & Pick<OverlayDrawerProps, 'onOpenChange'>) => {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState(initialType);
  const source = useRestoreFocusSource();
  const target = useRestoreFocusTarget();
  const styles = useDrawerTestStyles();
  return (
    <>
      <div data-test="layout" className={styles.layout}>
        <Drawer
          data-test="surface"
          {...source}
          type={type}
          open={open}
          surfaceMotion={type === 'inline' ? undefined : null}
          backdropMotion={null}
          onOpenChange={(event, data) => {
            onOpenChange?.(event, data);
            if (!event.isDefaultPrevented()) {
              setOpen(data.open);
            }
          }}
          {...props}
        >
          <DrawerHeader>
            <DrawerHeaderTitle
              action={
                <button data-test="close" onClick={() => setOpen(false)}>
                  Close panel
                </button>
              }
            >
              Drawer settings
            </DrawerHeaderTitle>
            <DrawerHeaderNavigation aria-label="Settings navigation">
              <button
                data-test="switch"
                onClick={() => setType(current => (current === 'inline' ? 'overlay' : 'inline'))}
              >
                Switch mode
              </button>
            </DrawerHeaderNavigation>
          </DrawerHeader>
          <DrawerBody>
            <label htmlFor="draft">Draft name</label>
            <input id="draft" data-test="draft" aria-describedby="draft-help" />
            <p id="draft-help">Name this draft</p>
            {children}
          </DrawerBody>
          <DrawerFooter>
            <button data-test="last">Last action</button>
          </DrawerFooter>
        </Drawer>
        <main data-test="content" className={styles.content}>
          <button data-test="opener" {...target} onClick={() => setOpen(current => !current)}>
            Toggle drawer
          </button>
          <button data-test="outside">Outside action</button>
        </main>
      </div>
      <div style={{ height: '150vh' }}>Scrollable page</div>
    </>
  );
};

const mountFluent = (element: JSXElement) => {
  mount(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
};

describe('Drawer', () => {
  testDrawerBaseScenarios(Drawer);

  describe('unit and source-derived round', () => {
    beforeEach(() => cy.viewport(1000, 700));

    modes.forEach(type => {
      it(`${type} public hook-style-render recomposition forwards ref, children and root amendments`, () => {
        const ref = React.createRef<HTMLElement>();
        const Recomposed = React.forwardRef<HTMLElement, DrawerProps>((props, forwardedRef) => {
          const state = useDrawer_unstable(props, forwardedRef);
          const context = useDrawerContextValue();
          useDrawerStyles_unstable(state);
          state.root.title = 'Recomposed title';
          return renderDrawer_unstable(state, context);
        });
        mountFluent(
          <Recomposed type={type} open ref={ref} data-test="surface" surfaceMotion={null} backdropMotion={null}>
            <button data-test="child">Recomposed child</button>
          </Recomposed>,
        );
        surface()
          .should('have.class', 'fui-Drawer')
          .and('have.attr', 'title', 'Recomposed title')
          .then($surface => expect(ref.current).to.equal($surface[0]));
        surface().find('[data-test="child"]').should('have.text', 'Recomposed child');
      });

      it(`${type} root children render function receives selected component and forwarded native props`, () => {
        mountFluent(
          <Drawer
            type={type}
            open
            data-test="surface"
            aria-label="Render-function drawer"
            surfaceMotion={null}
            backdropMotion={null}
          >
            {(
              Selected: React.ElementType<React.HTMLAttributes<HTMLElement>>,
              props: React.HTMLAttributes<HTMLElement>,
            ) => (
              <Selected {...props} title="Render function title">
                <button data-test="rendered-child">Rendered child</button>
              </Selected>
            )}
          </Drawer>,
        );
        surface()
          .should('have.attr', 'title', 'Render function title')
          .and('have.attr', 'aria-label', 'Render-function drawer')
          .and('have.class', type === 'inline' ? inlineDrawerClassNames.root : overlayDrawerClassNames.root);
        surface().find('[data-test="rendered-child"]').should('have.text', 'Rendered child');
      });

      it(`${type} surface motion slot reports enter then exit and unmounts only after native animation finish`, () => {
        pauseTestMotions();
        const starts = cy.stub().as('starts');
        const finishes = cy.stub().as('finishes');
        mountFluent(
          <Campaign
            type={type}
            position="end"
            modalType="non-modal"
            surfaceMotion={{
              children: (_, props) => (
                <LongMotion
                  {...props}
                  onMotionStart={(event, data) => {
                    props.onMotionStart?.(event, data);
                    starts(event, data);
                  }}
                  onMotionFinish={(event, data) => {
                    props.onMotionFinish?.(event, data);
                    finishes(event, data);
                  }}
                />
              ),
            }}
          />,
        );
        cy.get('[data-test="opener"]').click();
        cy.get('@starts')
          .should('have.been.calledOnce')
          .then(() => {
            expect(starts.firstCall.args).to.deep.equal([null, { direction: 'enter' }]);
          });
        surface().then($surface => {
          const animations = $surface[0].getAnimations();
          expect(animations).to.have.length(1);
          expect(animations[0].playState).to.equal('paused');
          animations.forEach(animation => animation.finish());
        });
        cy.get('@finishes').should('have.been.calledOnce');
        surface().should('be.visible');
        cy.get('[data-test="close"]').click();
        cy.get('@starts')
          .should('have.been.calledTwice')
          .then(() => {
            expect(starts.secondCall.args).to.deep.equal([null, { direction: 'exit' }]);
          });
        surface()
          .should('exist')
          .then($surface => {
            const animations = $surface[0].getAnimations();
            expect(animations).to.have.length(1);
            animations.forEach(animation => {
              animation.pause();
            });
          });
        cy.get('@finishes').should('have.been.calledOnce');
        surface().then($surface => $surface[0].getAnimations().forEach(animation => animation.finish()));
        surface().should('not.exist');
        cy.get('@finishes')
          .should('have.been.calledTwice')
          .then(() => {
            expect(finishes.secondCall.args).to.deep.equal([null, { direction: 'exit' }]);
          });
      });

      it(`${type} canceled close uses custom motion render function, latest handlers and remains mounted after reopen`, () => {
        pauseTestMotions();
        const observed = cy.stub().as('observed');
        const Interrupt = () => {
          const [open, setOpen] = React.useState(false);
          const [version, setVersion] = React.useState(0);
          return (
            <>
              <button data-test="toggle" onClick={() => setOpen(current => !current)}>
                Toggle
              </button>
              <button data-test="update" onClick={() => setVersion(current => current + 1)}>
                Update
              </button>
              <Drawer
                type={type}
                open={open}
                position="end"
                modalType="non-modal"
                backdropMotion={null}
                data-test="surface"
                surfaceMotion={{
                  children: (_, props) => (
                    <LongMotion
                      {...props}
                      onMotionStart={(event, data) => {
                        props.onMotionStart?.(event, data);
                        observed('start', data.direction, version);
                      }}
                      onMotionFinish={(event, data) => {
                        props.onMotionFinish?.(event, data);
                        observed('finish', data.direction, version);
                      }}
                      onMotionCancel={(event, data) => observed('cancel', data.direction, version)}
                    />
                  ),
                }}
              >
                <button>Action</button>
              </Drawer>
            </>
          );
        };
        mountFluent(<Interrupt />);
        surface().should('not.exist');
        cy.get('[data-test="toggle"]').click();
        surface().then($surface => $surface[0].getAnimations().forEach(animation => animation.finish()));
        cy.get('@observed').should('have.been.calledWith', 'finish', 'enter', 0);
        cy.get('[data-test="toggle"]').click();
        cy.get('@observed').should('have.been.calledWith', 'start', 'exit', 0);
        surface().then($surface => {
          const animations = $surface[0].getAnimations();
          expect(animations).to.have.length(1);
          animations.forEach(animation => animation.pause());
        });
        cy.get('[data-test="update"]').click();
        cy.get('[data-test="toggle"]').click();
        cy.get('@observed').should('have.been.calledWith', 'cancel', 'exit', 1);
        cy.get('@observed').should('have.been.calledWith', 'start', 'enter', 1);
        surface().then($surface => $surface[0].getAnimations().forEach(animation => animation.finish()));
        cy.get('@observed').should('have.been.calledWith', 'finish', 'enter', 1);
        surface().should('be.visible').and('have.css', 'width', '320px');
        cy.get('@observed').then(() => {
          expect(observed.getCalls().some(call => call.args[0] === 'finish' && call.args[1] === 'exit')).to.equal(
            false,
          );
        });
        cy.get('[data-test="toggle"]').click();
        cy.get('@observed').should('have.been.calledWith', 'start', 'exit', 1);
        surface().then($surface => $surface[0].getAnimations().forEach(animation => animation.finish()));
        surface().should('not.exist');
        cy.get('@observed').should('have.been.calledWith', 'finish', 'exit', 1);
      });

      it(`${type} reduced-motion media uses native one-millisecond animations with complete enter-exit lifecycle`, () => {
        const finishes = cy.stub().as('finishes');
        let animate: sinon.SinonSpy;
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Emulation.setEmulatedMedia',
            params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
          }),
        );
        cy.window().then(win => {
          expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true);
          animate = cy.spy(win.Element.prototype, 'animate').as('animate');
        });
        mountFluent(<Campaign type={type} surfaceMotion={{ onMotionFinish: finishes }} />);
        cy.get('[data-test="opener"]').click();
        surface().should('be.visible').and('have.css', 'width', '320px');
        cy.get('@finishes').should('have.been.calledOnce');
        cy.get('@animate').then(() => {
          const calls = animate.getCalls();
          expect(calls.length).to.be.greaterThan(0);
          calls.forEach(call => expect(call.args[1].duration).to.equal(1));
        });
        cy.get('[data-test="close"]').click();
        surface().should('not.exist');
        cy.get('@finishes').should('have.been.calledTwice');
      });
    });

    it('known inherited defect: inline onMotionStart replaces internal enter-direction bookkeeping', () => {
      const starts = cy.stub().as('starts');
      const finishes = cy.stub().as('finishes');
      const CallbackOverride = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <>
            <button data-test="open" onClick={() => setOpen(true)}>
              Open both
            </button>
            <Drawer
              type="inline"
              open={open}
              data-test="surface"
              surfaceMotion={{
                onMotionStart: starts,
                onMotionFinish: finishes,
              }}
            >
              <button>Callback drawer</button>
            </Drawer>
            <Drawer type="inline" open={open} data-test="positive">
              <button>Default callback drawer</button>
            </Drawer>
          </>
        );
      };
      mountFluent(<CallbackOverride />);
      surface().should('not.exist');
      cy.get('[data-test="open"]').click();
      cy.get('@starts').should('have.been.calledOnce');
      cy.get('@finishes').should('have.been.calledOnce');
      cy.get('[data-test="positive"]').should('be.visible').and('have.css', 'width', '320px');
      surface().should('have.css', 'width', '0px').and('not.be.visible');
    });

    it('motion render functions receive size, logical position and direction after wrapper mode switching', () => {
      const params = cy.stub().as('params');
      const MotionParams = () => {
        const [type, setType] = React.useState<DrawerProps['type']>('inline');
        return (
          <FluentProvider theme={webLightTheme} dir="rtl">
            <Drawer
              type={type}
              open
              position="end"
              size="medium"
              data-test="surface"
              backdropMotion={null}
              surfaceMotion={{
                children: (Motion, props) => {
                  params(type, props.position, props.size, props.dir);
                  return <Motion {...props} />;
                },
              }}
            >
              <button data-test="switch" onClick={() => setType('overlay')}>
                Switch
              </button>
            </Drawer>
          </FluentProvider>
        );
      };
      mount(<MotionParams />);
      cy.get('@params').should('have.been.calledWith', 'inline', 'end', 'medium', 'rtl');
      surface().should('have.css', 'width', '592px');
      cy.get('[data-test="switch"]').click();
      surface().should('have.class', overlayDrawerClassNames.root).and('have.css', 'width', '592px');
      cy.get('@params').should('have.been.calledWith', 'overlay', 'end', 'medium', 'rtl');
    });

    it('Field and Input child label, hint and validation relationships remain valid after redispatch', () => {
      const Form = () => {
        const [type, setType] = React.useState<DrawerProps['type']>('inline');
        return (
          <Drawer type={type} open data-test="surface" surfaceMotion={null} backdropMotion={null}>
            <Field
              label="Display name"
              hint="Use a descriptive name"
              validationState="error"
              validationMessage="Name is required"
            >
              <Input />
            </Field>
            <button data-test="switch" onClick={() => setType('overlay')}>
              Switch
            </button>
          </Drawer>
        );
      };
      const checkRelationships = () => {
        surface()
          .find('label')
          .invoke('attr', 'for')
          .then(id => {
            expect(id).to.be.a('string').and.not.equal('');
            surface().find('input').should('have.attr', 'id', id);
          });
        surface()
          .find('input')
          .should('have.attr', 'aria-invalid', 'true')
          .invoke('attr', 'aria-describedby')
          .then(ids => {
            expect(ids).to.be.a('string').and.not.equal('');
            if (!ids) {
              throw new Error('Field descriptions must be linked');
            }
            const descriptions = ids
              .split(' ')
              .map(id => `#${id}`)
              .join(',');
            surface()
              .find(descriptions)
              .should('contain.text', 'Use a descriptive name')
              .and('contain.text', 'Name is required');
          });
      };
      mountFluent(<Form />);
      checkRelationships();
      cy.get('[data-test="switch"]').click();
      surface().should('have.attr', 'role', 'dialog');
      checkRelationships();
    });

    it('characterization: overlay backdrop starts enter twice, then forwards independent finish and exit lifecycle', () => {
      pauseTestMotions();
      const starts = cy.stub().as('backdrop-starts');
      const finishes = cy.stub().as('backdrop-finishes');
      const Backdrop = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <>
            <button data-test="opener" onClick={() => setOpen(true)}>
              Open
            </button>
            <Drawer
              open={open}
              data-test="surface"
              surfaceMotion={{ children: (_, props) => <LongMotion {...props} /> }}
              backdropMotion={{
                children: (_: unknown, props: PresenceComponentProps) => <LongMotion {...props} />,
                onMotionStart: starts,
                onMotionFinish: finishes,
              }}
            >
              <button data-test="close" onClick={() => setOpen(false)}>
                Close
              </button>
            </Drawer>
          </>
        );
      };
      mountFluent(<Backdrop />);
      cy.get('[data-test="opener"]').click();
      cy.get('@backdrop-starts')
        .should('have.been.calledTwice')
        .then(() => {
          expect(starts.firstCall.args).to.deep.equal([null, { direction: 'enter' }]);
          expect(starts.secondCall.args).to.deep.equal([null, { direction: 'enter' }]);
        });
      scrim().then($scrim => {
        const animations = $scrim[0].getAnimations();
        expect(animations).to.have.length(1);
        animations.forEach(animation => animation.finish());
      });
      cy.get('@backdrop-finishes').should('have.been.calledOnce');
      surface().then($surface => $surface[0].getAnimations().forEach(animation => animation.finish()));
      cy.get('[data-test="close"]').click();
      surface().should('exist');
      cy.get('@backdrop-starts')
        .should('have.been.calledThrice')
        .then(() => {
          expect(starts.thirdCall.args).to.deep.equal([null, { direction: 'exit' }]);
        });
      scrim().then($scrim => $scrim[0].getAnimations().forEach(animation => animation.finish()));
      cy.get('@backdrop-finishes').should('have.been.calledTwice');
      surface().then($surface => $surface[0].getAnimations().forEach(animation => animation.finish()));
      surface().should('not.exist');
      scrim().should('not.exist');
    });

    afterEach(() =>
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      ),
    );

    it('independent Drawer providers isolate body scroll state and structured header separators', () => {
      const Probe = ({ id }: { id: string }) => {
        const { scrollState } = useDrawerContext_unstable();
        return <output data-test={id}>{scrollState}</output>;
      };
      const ScrollPair = () => {
        const [expanded, setExpanded] = React.useState(true);
        return (
          <>
            <button data-test="shorten" onClick={() => setExpanded(false)}>
              Shorten content
            </button>
            <Drawer type="inline" open data-test="scroll-drawer" style={{ height: '240px' }} surfaceMotion={null}>
              <DrawerHeader data-test="scroll-header">
                <DrawerHeaderTitle>Scrollable</DrawerHeaderTitle>
              </DrawerHeader>
              <DrawerBody data-test="scroll-body" tabIndex={0} role="group" aria-label="Scrolling content">
                {expanded ? (
                  Array.from({ length: 30 }, (_, index) => <p key={index}>Scrolling row {index}</p>)
                ) : (
                  <p>Short</p>
                )}
              </DrawerBody>
              <DrawerFooter>
                <Probe id="scroll-state" />
              </DrawerFooter>
            </Drawer>
            <Drawer type="inline" open surfaceMotion={null}>
              <DrawerHeader data-test="other-header">Other drawer</DrawerHeader>
              <DrawerBody>Short independent content</DrawerBody>
              <Probe id="other-state" />
            </Drawer>
          </>
        );
      };
      mountFluent(<ScrollPair />);
      cy.get('[data-test="scroll-state"]').should('have.text', 'top');
      cy.get('[data-test="other-state"]').should('have.text', 'none');
      cy.get('[data-test="scroll-body"]').focus().realPress('End');
      cy.get('[data-test="scroll-state"]').should('have.text', 'bottom');
      cy.get('[data-test="scroll-header"]').should($header => {
        expect($header[0].ownerDocument.defaultView?.getComputedStyle($header[0], '::after').opacity).to.equal('1');
      });
      cy.get('[data-test="other-state"]').should('have.text', 'none');
      cy.get('[data-test="shorten"]').click();
      cy.get('[data-test="scroll-state"]').should('have.text', 'none');
      cy.get('[data-test="other-state"]').should('have.text', 'none');
    });

    it('two root Drawers own independent modal scroll locks across switching and final unmount', () => {
      const Owners = () => {
        const [firstType, setFirstType] = React.useState<DrawerProps['type']>('overlay');
        const [secondOpen, setSecondOpen] = React.useState(true);
        return (
          <>
            <div style={{ height: '150vh' }}>Long page</div>
            <Drawer type={firstType} open data-test="first-owner" surfaceMotion={null} backdropMotion={null}>
              <button data-test="switch-owner" onClick={() => setFirstType('inline')}>
                Switch owner
              </button>
            </Drawer>
            {secondOpen && (
              <Drawer open position="end" data-test="second-owner" surfaceMotion={null} backdropMotion={null}>
                <button data-test="switch-first" onClick={() => setFirstType('inline')}>
                  Switch first owner
                </button>
                <button data-test="remove-owner" onClick={() => setSecondOpen(false)}>
                  Remove second owner
                </button>
              </Drawer>
            )}
          </>
        );
      };
      mountFluent(<Owners />);
      cy.get('html').should('have.css', 'overflow-y', 'clip');
      cy.get('[data-test="switch-first"]').click();
      cy.get('[data-test="first-owner"]').should('have.class', inlineDrawerClassNames.root);
      cy.get('[data-test="second-owner"]').should('have.class', overlayDrawerClassNames.root);
      cy.get('html').should('have.css', 'overflow-y', 'clip');
      cy.get('[data-test="remove-owner"]').click();
      cy.get('[data-test="second-owner"]').should('not.exist');
      cy.get('[data-test="first-owner"]').should('have.class', inlineDrawerClassNames.root);
      cy.get('html').should('not.have.css', 'overflow-y', 'clip');
    });

    it('live modalType changes transfer backdrop, focus and scroll ownership without redispatching root', () => {
      let root: HTMLElement;
      const ModalChange = () => {
        const [modal, setModal] = React.useState(true);
        return (
          <>
            <div style={{ height: '150vh' }}>Scrollable page</div>
            <button data-test="outside">Outside</button>
            <Drawer
              open
              position="end"
              modalType={modal ? 'modal' : 'non-modal'}
              surfaceMotion={null}
              backdropMotion={null}
              data-test="surface"
            >
              <button data-test="modal" onClick={() => setModal(current => !current)}>
                Change modality
              </button>
            </Drawer>
          </>
        );
      };
      mountFluent(<ModalChange />);
      surface()
        .should('have.attr', 'aria-modal', 'true')
        .then($surface => {
          root = $surface[0];
        });
      scrim().should('exist');
      cy.get('html').should('have.css', 'overflow-y', 'clip');
      cy.get('[data-test="modal"]').click();
      surface()
        .should('have.attr', 'aria-modal', 'false')
        .then($surface => expect($surface[0]).to.equal(root));
      scrim().should('not.exist');
      cy.get('html').should('not.have.css', 'overflow-y', 'clip');
      cy.get('[data-test="outside"]').focus().should('be.focused');
      cy.get('[data-test="modal"]').click();
      scrim().should('exist');
      cy.get('html').should('have.css', 'overflow-y', 'clip');
    });

    it('portal mountNode replacement moves one root and scrim with no orphan in the old container', () => {
      const MovePortal = () => {
        const [first, setFirst] = React.useState<HTMLDivElement | null>(null);
        const [second, setSecond] = React.useState<HTMLDivElement | null>(null);
        const [moved, setMoved] = React.useState(false);
        const styles = useDrawerTestStyles();
        return (
          <>
            <div ref={setFirst} data-test="first-node" className={styles.mountNode} />
            <div ref={setSecond} data-test="second-node" className={styles.mountNode} />
            <Drawer
              open
              mountNode={moved ? second : first}
              data-test="surface"
              surfaceMotion={null}
              backdropMotion={null}
            >
              <button data-test="move" onClick={() => setMoved(true)}>
                Move portal
              </button>
            </Drawer>
          </>
        );
      };
      mountFluent(<MovePortal />);
      cy.get('[data-test="first-node"]').find('[data-test="surface"]').should('exist');
      cy.get('[data-test="move"]').click();
      cy.get('[data-test="second-node"]').find('[data-test="surface"]').should('have.length', 1);
      cy.get('[data-test="first-node"]').find('[data-test="surface"]').should('not.exist');
      cy.get('[data-test="first-node"]').find(`.${overlayDrawerClassNames.backdrop}`).should('not.exist');
      cy.get('[data-test="second-node"]').find(`.${overlayDrawerClassNames.backdrop}`).should('have.length', 1);
    });
  });

  describe('type prop', () => {
    it('should render OverlayDrawer by default', () => {
      mountFluent(<Drawer id="drawer" open />);

      cy.get(`.${overlayDrawerClassNames.root}`).should('exist');
    });

    it('should render InlineDrawer when type is `inline`', () => {
      mountFluent(<Drawer id="drawer" type="inline" open />);

      cy.get(`.${inlineDrawerClassNames.root}`).should('exist');
    });

    describe('documentation round', () => {
      beforeEach(() => cy.viewport(1000, 700));
      it('default overlay forwards named dialog, heading, field, navigation and footer children', () => {
        mountFluent(<Campaign />);
        cy.get('[data-test="opener"]').click();
        surface().should('have.class', 'fui-Drawer').and('have.class', overlayDrawerClassNames.root);
        surface().should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
        surface()
          .invoke('attr', 'aria-labelledby')
          .then(id => {
            expect(id).to.be.a('string').and.not.equal('');
            surface().find('h2').should('have.attr', 'id', id).and('have.text', 'Drawer settings');
          });
        surface().find('header').should('exist');
        surface().find('nav').should('have.attr', 'aria-label', 'Settings navigation');
        surface().find('footer').should('contain.text', 'Last action');
        cy.get('label[for="draft"]').click();
        cy.get('#draft').should('be.focused').and('have.attr', 'aria-describedby', 'draft-help').type('Settings draft');
        cy.get('#draft-help').should('have.text', 'Name this draft');
      });

      it('overlay forwards Escape reason and manual restore-focus attributes after keyboard opening', () => {
        const changes = cy.stub().as('changes');
        mountFluent(<Campaign onOpenChange={changes} />);
        cy.get('[data-test="opener"]').focus().realPress('Enter');
        cy.get('[data-test="close"]').should('be.focused');
        cy.realPress(['Shift', 'Tab']);
        cy.get('[data-test="last"]').should('be.focused');
        cy.realPress('Tab');
        cy.get('[data-test="close"]').should('be.focused').realPress('Escape');
        surface().should('not.exist');
        cy.get('[data-test="opener"]').should('be.focused');
        cy.get('@changes')
          .should('have.been.calledOnce')
          .then(() => {
            const [event, data] = changes.firstCall.args;
            expect(event.type).to.equal('keydown');
            expect(data).to.deep.equal({ type: 'escapeKeyDown', open: false, event });
          });
      });

      describe('edges and accessibility round', () => {
        beforeEach(() => cy.viewport(1000, 700));

        modes.forEach(type => {
          it(`${type} forwards aside, native attributes, user class, style precedence, click and callback ref lifecycle`, () => {
            const refs: Array<HTMLElement | null> = [];
            const clicked = cy.stub().as('clicked');
            const Native = () => {
              const [open, setOpen] = React.useState(true);
              const styles = useDrawerTestStyles();
              const ref = React.useCallback((node: HTMLElement | null) => {
                refs.push(node);
              }, []);
              return (
                <Drawer
                  type={type}
                  open={open}
                  as="aside"
                  ref={ref}
                  data-test="surface"
                  id="native-drawer"
                  title="Native title"
                  lang="fr"
                  aria-label="Named settings"
                  className={`consumer-drawer ${styles.override}`}
                  style={{ width: '260px' }}
                  surfaceMotion={type === 'inline' ? undefined : null}
                  backdropMotion={null}
                  onClick={clicked}
                >
                  <button data-test="close" onClick={() => setOpen(false)}>
                    Close
                  </button>
                </Drawer>
              );
            };
            mountFluent(<Native />);
            surface()
              .should('have.prop', 'tagName', 'ASIDE')
              .and('have.attr', 'id', 'native-drawer')
              .and('have.attr', 'title', 'Native title')
              .and('have.attr', 'lang', 'fr')
              .and('have.attr', 'aria-label', 'Named settings')
              .and('have.class', 'consumer-drawer')
              .and('have.class', 'fui-Drawer')
              .and('have.css', 'width', '260px');
            surface().then($surface => expect(refs[refs.length - 1]).to.equal($surface[0]));
            cy.get('[data-test="close"]').click();
            cy.get('@clicked').should('have.been.calledOnce');
            surface().should('not.exist');
            cy.then(() => expect(refs[refs.length - 1]).to.equal(null));
          });

          it(`${type} user Griffel class overrides base width and provider tokens reach surface`, () => {
            const Styled = () => {
              const styles = useDrawerTestStyles();
              return (
                <>
                  <span data-test="theme-control" style={{ backgroundColor: webLightTheme.colorBrandBackground2 }} />
                  <Drawer
                    type={type}
                    open
                    className={styles.override}
                    data-test="surface"
                    surfaceMotion={null}
                    backdropMotion={null}
                  >
                    <button>Action</button>
                  </Drawer>
                </>
              );
            };
            mountFluent(<Styled />);
            surface().should('have.css', 'width', '240px');
            cy.get('[data-test="theme-control"]')
              .invoke('css', 'background-color')
              .then(color => {
                surface().should('have.css', 'background-color', color);
              });
          });

          it(`${type} dynamic size, position and custom dimension updates reach the same root`, () => {
            let root: HTMLElement;
            const Dynamic = () => {
              const [stage, setStage] = React.useState(0);
              return (
                <Drawer
                  type={type}
                  open
                  size={stage === 0 ? 'small' : 'medium'}
                  position={stage < 2 ? 'start' : 'bottom'}
                  style={stage === 3 ? { height: '180px' } : undefined}
                  data-test="surface"
                  surfaceMotion={null}
                  backdropMotion={null}
                >
                  <button data-test="advance" onClick={() => setStage(current => current + 1)}>
                    Advance
                  </button>
                </Drawer>
              );
            };
            mountFluent(<Dynamic />);
            surface()
              .should('have.css', 'width', '320px')
              .then($surface => {
                root = $surface[0];
              });
            cy.get('[data-test="advance"]').click();
            surface()
              .should('have.css', 'width', '592px')
              .then($surface => expect($surface[0]).to.equal(root));
            cy.get('[data-test="advance"]').click();
            surface().should('have.css', 'height', '592px');
            cy.get('[data-test="advance"]').click();
            surface()
              .should('have.css', 'height', '180px')
              .then($surface => expect($surface[0]).to.equal(root));
          });

          (['ltr', 'rtl'] as const).forEach(dir => {
            (['start', 'end', 'bottom'] as const).forEach(position => {
              it(`${type} ${dir} ${position} forwards direction and logical layout to selected mode`, () => {
                mount(
                  <FluentProvider theme={webLightTheme} dir={dir}>
                    <Drawer
                      type={type}
                      open
                      position={position}
                      data-test="surface"
                      surfaceMotion={null}
                      backdropMotion={null}
                    >
                      <button>Action</button>
                    </Drawer>
                  </FluentProvider>,
                );
                surface().should('have.css', 'direction', dir);
                const side =
                  position === 'bottom' ? 'bottom' : (position === 'start') === (dir === 'ltr') ? 'left' : 'right';
                surface()
                  .should('have.css', side, '0px')
                  .then($surface => {
                    const rect = $surface[0].getBoundingClientRect();
                    expect(rect.width).to.be.greaterThan(0);
                    if (type === 'overlay') {
                      if (side === 'left') {
                        expect(rect.left).to.equal(0);
                      }
                      if (side === 'right') {
                        expect(rect.right).to.equal(1000);
                      }
                      if (side === 'bottom') {
                        expect(rect.bottom).to.equal(700);
                      }
                    } else {
                      expect(rect.left).to.be.at.least(0);
                      expect(rect.right).to.be.at.most(1000);
                    }
                  });
              });
            });
          });
        });

        it('dynamic provider direction mirrors an already open overlay without replacing the root', () => {
          let root: HTMLElement;
          const Direction = () => {
            const [dir, setDir] = React.useState<'ltr' | 'rtl'>('ltr');
            return (
              <FluentProvider theme={webLightTheme} dir={dir}>
                <Drawer open data-test="surface" surfaceMotion={null} backdropMotion={null}>
                  <button data-test="direction" onClick={() => setDir(current => (current === 'ltr' ? 'rtl' : 'ltr'))}>
                    Direction
                  </button>
                </Drawer>
              </FluentProvider>
            );
          };
          mount(<Direction />);
          surface()
            .should('have.css', 'left', '0px')
            .then($surface => {
              root = $surface[0];
            });
          cy.get('[data-test="direction"]').click();
          surface()
            .should('have.css', 'right', '0px')
            .and('have.css', 'direction', 'rtl')
            .then($surface => {
              expect($surface[0]).to.equal(root);
              expect($surface[0].getBoundingClientRect().right).to.equal(1000);
            });
          cy.get('[data-test="direction"]').click();
          surface().should('have.css', 'left', '0px').and('have.css', 'direction', 'ltr');
        });

        it('inertTrapFocus forwards modal outside-focus exclusion and releases it after close', () => {
          mountFluent(<Campaign inertTrapFocus />);
          cy.get('[data-test="opener"]').click();
          cy.get('[data-test="close"]').should('be.focused');
          cy.get('[data-test="outside"]').focus().should('not.be.focused');
          cy.get('[data-test="close"]').click();
          surface().should('not.exist');
          cy.get('[data-test="outside"]').click().should('be.focused');
        });

        it('controlled overlay emits close requests without mutating parent open state', () => {
          const changes = cy.stub().as('changes');
          mountFluent(
            <Drawer
              open
              onOpenChange={changes}
              data-test="surface"
              surfaceMotion={null}
              backdropMotion={null}
              aria-label="Controlled"
            >
              <button data-test="action">Action</button>
            </Drawer>,
          );
          cy.get('[data-test="action"]').focus().realPress('Escape');
          surface().should('be.visible');
          cy.get('@changes').should('have.been.calledOnce');
          scrim().click(800, 80, { scrollBehavior: false });
          surface().should('be.visible');
          cy.get('@changes')
            .should('have.been.calledTwice')
            .then(() => {
              expect(changes.firstCall.args[1].type).to.equal('escapeKeyDown');
              expect(changes.secondCall.args[1].type).to.equal('backdropClick');
              expect(changes.getCalls().every(call => call.args[1].open === false)).to.equal(true);
            });
        });

        it('deprecated defaultOpen alone is ignored by Drawer, not an uncontrolled contract', () => {
          const changes = cy.stub().as('changes');
          // The deprecated API is intentionally exercised without a controlled open prop.
          mountFluent(<Drawer defaultOpen onOpenChange={changes} data-test="surface" />);
          surface().should('not.exist');
          scrim().should('not.exist');
          cy.get('@changes').should('not.have.been.called');
        });

        it('root key handler and onOpenChange cancellation preserve open with positive dismissal controls', () => {
          const changes = cy.stub().as('changes');
          const Cancel = () => {
            const [cancel, setCancel] = React.useState(true);
            return (
              <Campaign
                onKeyDown={event => {
                  if (event.key === 'Escape' && cancel) {
                    event.preventDefault();
                  }
                }}
                onOpenChange={(event, data) => {
                  changes(event, data);
                  if (cancel) {
                    event.preventDefault();
                  }
                }}
              >
                <button data-test="allow" onClick={() => setCancel(false)}>
                  Allow close
                </button>
              </Campaign>
            );
          };
          mountFluent(<Cancel />);
          cy.get('[data-test="opener"]').click();
          cy.get('#draft').focus().realPress('Escape');
          surface().should('be.visible');
          cy.get('@changes').should('not.have.been.called');
          scrim().click(800, 80, { scrollBehavior: false });
          surface().should('be.visible');
          cy.get('@changes').should('have.been.calledOnce');
          cy.get('[data-test="allow"]').click();
          cy.get('#draft').focus().realPress('Escape');
          surface().should('not.exist');
          cy.get('@changes').should('have.been.calledTwice');
        });

        it('custom backdrop native props and cancellation handler compose with default dismissal', () => {
          const clicks = cy.stub().as('clicks');
          const changes = cy.stub().as('changes');
          const CustomBackdrop = () => {
            const [cancel, setCancel] = React.useState(true);
            return (
              <Campaign
                onOpenChange={changes}
                backdrop={{
                  className: 'consumer-backdrop',
                  id: 'custom-backdrop',
                  onClick: event => {
                    clicks();
                    if (cancel) {
                      event.preventDefault();
                    }
                  },
                }}
              >
                <button data-test="allow" onClick={() => setCancel(false)}>
                  Allow backdrop
                </button>
              </Campaign>
            );
          };
          mountFluent(<CustomBackdrop />);
          cy.get('[data-test="opener"]').click();
          cy.get('#custom-backdrop')
            .should('have.class', 'consumer-backdrop')
            .and('have.attr', 'aria-hidden', 'true')
            .click(800, 80, { scrollBehavior: false });
          cy.get('@clicks').should('have.been.calledOnce');
          cy.get('@changes').should('not.have.been.called');
          surface().should('be.visible');
          cy.get('[data-test="allow"]').click();
          cy.get('#custom-backdrop').click(800, 80, { scrollBehavior: false });
          surface().should('not.exist');
          cy.get('@clicks').should('have.been.calledTwice');
          cy.get('@changes').should('have.been.calledOnce');
        });

        it('backdrop null suppresses only scrim, not overlay dialog semantics or Escape forwarding', () => {
          mountFluent(<Campaign backdrop={null} />);
          cy.get('[data-test="opener"]').click();
          scrim().should('not.exist');
          surface().should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
          cy.get('#draft').focus().realPress('Escape');
          surface().should('not.exist');
        });

        it('latest open-change and native key handlers are used after rerender and mode redispatch', () => {
          const observed = cy.stub().as('observed');
          const Latest = () => {
            const [version, setVersion] = React.useState(0);
            return (
              <Campaign
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    observed('key', version);
                  }
                }}
                onOpenChange={(_, data) => observed(data.type, version)}
              >
                <button data-test="update" onClick={() => setVersion(current => current + 1)}>
                  Update handler
                </button>
              </Campaign>
            );
          };
          mountFluent(<Latest />);
          cy.get('[data-test="opener"]').click();
          cy.get('[data-test="update"]').click();
          cy.get('[data-test="switch"]').click();
          cy.get('[data-test="update"]').click();
          cy.get('[data-test="switch"]').click();
          cy.get('#draft').focus().realPress('Escape');
          surface().should('not.exist');
          cy.get('@observed')
            .should('have.been.calledTwice')
            .then(() => {
              expect(observed.firstCall.args).to.deep.equal(['key', 2]);
              expect(observed.secondCall.args).to.deep.equal(['escapeKeyDown', 2]);
            });
        });

        it('inline region semantics and custom heading IDs are explicit consumer choices', () => {
          mountFluent(
            <Drawer
              type="inline"
              open
              role="region"
              aria-labelledby="inline-heading"
              data-test="surface"
              surfaceMotion={null}
            >
              <DrawerHeader>
                <DrawerHeaderTitle heading={{ as: 'h1', id: 'inline-heading' }}>Navigation settings</DrawerHeaderTitle>
              </DrawerHeader>
            </Drawer>,
          );
          surface().should('have.attr', 'role', 'region').and('have.attr', 'aria-labelledby', 'inline-heading');
          cy.get('#inline-heading').should('have.prop', 'tagName', 'H1').and('have.text', 'Navigation settings');
          surface().should('not.have.attr', 'aria-modal');
        });

        it('aria-label suppresses generated title relationship and empty overlay focuses its root', () => {
          mountFluent(
            <Drawer open aria-label="Empty settings" data-test="surface" surfaceMotion={null} backdropMotion={null} />,
          );
          surface().should('have.attr', 'aria-label', 'Empty settings').and('not.have.attr', 'aria-labelledby');
          surface().should('be.focused');
        });

        it('mode switch while closed does not open a drawer or leak a backdrop, reopening uses the latest mode', () => {
          const Closed = () => {
            const [type, setType] = React.useState<DrawerProps['type']>('overlay');
            const [open, setOpen] = React.useState(false);
            return (
              <>
                <button
                  data-test="switch"
                  onClick={() => setType(current => (current === 'inline' ? 'overlay' : 'inline'))}
                >
                  Switch
                </button>
                <button data-test="open" onClick={() => setOpen(true)}>
                  Open
                </button>
                <Drawer type={type} open={open} data-test="surface">
                  <button>Action</button>
                </Drawer>
              </>
            );
          };
          mountFluent(<Closed />);
          surface().should('not.exist');
          cy.get('[data-test="switch"]').click();
          surface().should('not.exist');
          scrim().should('not.exist');
          cy.get('[data-test="open"]').click();
          surface().should('have.class', inlineDrawerClassNames.root).and('be.visible');
        });

        it('known inherited defect: motion-disabled inline mounted closed remains zero-width after open', () => {
          const Disabled = () => {
            const [open, setOpen] = React.useState(false);
            return (
              <>
                <button data-test="open" onClick={() => setOpen(true)}>
                  Open
                </button>
                <Drawer type="inline" open={open} surfaceMotion={null} data-test="surface">
                  <button>Action</button>
                </Drawer>
                <Drawer type="inline" open surfaceMotion={null} data-test="positive">
                  <button>Initially open</button>
                </Drawer>
                <output data-test="open-state">{String(open)}</output>
              </>
            );
          };
          mountFluent(<Disabled />);
          cy.get('[data-test="positive"]').should('be.visible').and('have.css', 'width', '320px');
          surface().should('not.exist');
          cy.get('[data-test="open"]').click();
          cy.get('[data-test="open-state"]').should('have.text', 'true');
          surface().should('have.css', 'width', '0px').and('not.be.visible');
        });
      });

      it('overlay forwards pointer backdrop reason but not inside pointer actions', () => {
        const changes = cy.stub().as('changes');
        mountFluent(<Campaign onOpenChange={changes} />);
        cy.get('[data-test="opener"]').click();
        cy.get('[data-test="last"]').click();
        cy.get('@changes').should('not.have.been.called');
        scrim().click(800, 80, { scrollBehavior: false });
        surface().should('not.exist');
        cy.get('@changes')
          .should('have.been.calledOnce')
          .then(() => {
            const [event, data] = changes.firstCall.args;
            expect(event.type).to.equal('click');
            expect(data).to.deep.equal({ type: 'backdropClick', open: false, event });
          });
      });

      it('inline dispatch is in-flow, has no implicit dialog semantics or initial focus and leaves outside controls usable', () => {
        const changes = cy.stub().as('changes');
        mountFluent(<Campaign type="inline" onOpenChange={changes} />);
        cy.get('[data-test="opener"]').click().should('be.focused');
        cy.get('[data-test="layout"]')
          .children('[data-test="surface"]')
          .should('have.class', inlineDrawerClassNames.root);
        surface().should('have.css', 'position', 'relative');
        surface().should('not.have.attr', 'role');
        surface().should('not.have.attr', 'aria-modal');
        scrim().should('not.exist');
        cy.get('[data-test="outside"]').click().should('be.focused');
        cy.get('[data-test="draft"]').focus().realPress('Escape');
        surface().should('be.visible');
        cy.get('@changes').should('not.have.been.called');
        cy.get('[data-test="close"]').click();
        surface().should('not.exist');
      });

      it('responsive inline to overlay to inline dispatch changes portal, backdrop, layout and scroll ownership', () => {
        const Responsive = () => {
          const { targetDocument } = useFluent_unstable();
          const [type, setType] = React.useState<DrawerProps['type']>('inline');
          React.useEffect(() => {
            const media = targetDocument?.defaultView?.matchMedia('(max-width: 720px)');
            if (!media) {
              throw new Error('A browser media query is required');
            }
            const change = () => setType(media.matches ? 'overlay' : 'inline');
            change();
            media.addEventListener('change', change);
            return () => media.removeEventListener('change', change);
          }, [targetDocument]);
          const styles = useDrawerTestStyles();
          return (
            <>
              <div data-test="layout" className={styles.layout}>
                <Drawer type={type} open data-test="surface" surfaceMotion={null} backdropMotion={null}>
                  <button>Drawer action</button>
                </Drawer>
                <main data-test="content" className={styles.content}>
                  Page content
                </main>
              </div>
              <div style={{ height: '150vh' }}>Scrollable page</div>
            </>
          );
        };
        cy.viewport(1000, 700);
        mountFluent(<Responsive />);
        cy.get('[data-test="layout"]').children('[data-test="surface"]').should('exist');
        cy.get('[data-test="content"]').then($content => {
          expect($content[0].getBoundingClientRect().left).to.be.greaterThan(300);
        });
        cy.get('html').should('not.have.css', 'overflow-y', 'clip');
        cy.viewport(600, 700);
        surface().should('have.class', overlayDrawerClassNames.root).and('have.css', 'position', 'fixed');
        cy.get('[data-test="layout"]').children('[data-test="surface"]').should('not.exist');
        cy.get('[data-test="content"]').then($content => {
          expect($content[0].getBoundingClientRect().left).to.be.lessThan(50);
        });
        scrim().should('exist');
        cy.get('html').should('have.css', 'overflow-y', 'clip');
        cy.viewport(1000, 700);
        surface().should('have.class', inlineDrawerClassNames.root).and('not.have.class', overlayDrawerClassNames.root);
        cy.get('[data-test="layout"]').children('[data-test="surface"]').should('exist');
        scrim().should('not.exist');
        cy.get('html').should('not.have.css', 'overflow-y', 'clip');
      });

      it('live mode switching retains open and forwarded children but remounts descendant state', () => {
        mountFluent(<Campaign type="inline" />);
        cy.get('[data-test="opener"]').click();
        cy.get('#draft').type('inline draft');
        cy.get('[data-test="switch"]').click();
        surface().should('have.class', overlayDrawerClassNames.root).and('have.attr', 'role', 'dialog');
        cy.get('#draft').should('have.value', '').type('overlay draft');
        cy.get('[data-test="switch"]').click();
        surface().should('have.class', inlineDrawerClassNames.root).and('not.have.attr', 'role');
        cy.get('#draft').should('have.value', '');
        cy.get('[data-test="close"]').click();
        surface().should('not.exist');
      });

      it('non-modal prop is forwarded in overlay mode without backdrop or outside focus blocking', () => {
        mountFluent(<Campaign modalType="non-modal" position="end" />);
        cy.get('[data-test="opener"]').click();
        surface().should('have.attr', 'aria-modal', 'false');
        scrim().should('not.exist');
        cy.get('[data-test="outside"]').click().should('be.focused');
        surface().should('be.visible');
        cy.get('[data-test="last"]').focus().realPress('Tab');
        surface().should($surface => {
          expect($surface[0].contains($surface[0].ownerDocument.activeElement)).to.equal(false);
        });
        cy.get('#draft').focus().realPress('Escape');
        surface().should('not.exist');
      });

      it('alert forwards alertdialog semantics and controlled no-handler dismissal refusal', () => {
        const Alert = () => {
          const [open, setOpen] = React.useState(true);
          return (
            <Drawer
              open={open}
              modalType="alert"
              aria-label="Critical settings"
              data-test="surface"
              surfaceMotion={null}
              backdropMotion={null}
            >
              <button data-test="close" onClick={() => setOpen(false)}>
                Acknowledge
              </button>
            </Drawer>
          );
        };
        mountFluent(<Alert />);
        surface().should('have.attr', 'role', 'alertdialog').and('have.attr', 'aria-label', 'Critical settings');
        cy.get('[data-test="close"]').should('be.focused').realPress('Escape');
        surface().should('be.visible');
        scrim().click(800, 80, { scrollBehavior: false });
        surface().should('be.visible');
        cy.get('[data-test="close"]').focus().realPress('Enter');
        surface().should('not.exist');
      });

      modes.forEach(type => {
        it(`${type} forwards unmountOnClose=false, preserves draft on reopen and hides closed content`, () => {
          mountFluent(<Campaign type={type} unmountOnClose={false} />);
          surface().should('exist').and('have.attr', 'aria-hidden', 'true');
          cy.get('[data-test="opener"]').click();
          surface().should('be.visible').and('not.have.attr', 'aria-hidden');
          cy.get('#draft').type('retained');
          cy.get('[data-test="close"]').click();
          surface().should('have.attr', 'aria-hidden', 'true');
          if (type === 'overlay') {
            surface().should('not.be.visible');
          } else {
            surface().should('have.css', 'width', '0px');
          }
          cy.get('[data-test="opener"]').click();
          surface().should('be.visible');
          cy.get('#draft').should('have.value', 'retained');
        });

        it(`${type} forwards default unmount policy and resets draft after explicit close`, () => {
          mountFluent(<Campaign type={type} />);
          cy.get('[data-test="opener"]').click();
          cy.get('#draft').type('discarded');
          cy.get('[data-test="close"]').click();
          surface().should('not.exist');
          cy.get('[data-test="opener"]').click();
          cy.get('#draft').should('have.value', '');
        });
      });

      const sizes = { small: 320, medium: 592, large: 940, full: 1000 } as const;
      (Object.keys(sizes) as Array<keyof typeof sizes>).forEach(size => {
        it(`inline wrapper forwards ${size} size with measured in-flow width`, () => {
          cy.viewport(1000, 700);
          mountFluent(<Drawer type="inline" open size={size} data-test="surface" surfaceMotion={null} />);
          surface()
            .should('have.css', 'width', `${sizes[size]}px`)
            .then($surface => {
              expect($surface[0].getBoundingClientRect().width).to.equal(sizes[size]);
            });
        });
      });

      it('inline wrapper clamps large width to viewport and permits custom width', () => {
        cy.viewport(319, 700);
        mountFluent(<Drawer type="inline" open size="large" data-test="surface" surfaceMotion={null} />);
        surface().should('have.css', 'width', '319px');
        mountFluent(<Drawer type="inline" open style={{ width: '240px' }} data-test="surface" surfaceMotion={null} />);
        surface().should('have.css', 'width', '240px');
      });

      (['start', 'end', 'bottom'] as const).forEach(position => {
        it(`inline wrapper forwards ${position} separator placement`, () => {
          mountFluent(
            <Drawer type="inline" open position={position} separator data-test="surface" surfaceMotion={null} />,
          );
          const edge = position === 'start' ? 'right' : position === 'end' ? 'left' : 'top';
          surface().should('have.css', `border-${edge}-width`, '1px');
          surface().should('not.have.css', `border-${edge}-color`, 'rgba(0, 0, 0, 0)');
          if (position === 'bottom') {
            surface()
              .should('have.css', 'height', '320px')
              .then($surface => {
                expect($surface[0].getBoundingClientRect().width).to.equal($surface[0].parentElement?.clientWidth);
              });
          }
        });
      });

      it('wrapper forwards element mountNode to overlay portal but renders inline at declaration site', () => {
        const Container = () => {
          const [node, setNode] = React.useState<HTMLDivElement | null>(null);
          const [type, setType] = React.useState<DrawerProps['type']>('overlay');
          const styles = useDrawerTestStyles();
          return (
            <>
              <div data-test="mount-node" ref={setNode} className={styles.mountNode} />
              <div data-test="declaration">
                <Drawer
                  open
                  type={type}
                  mountNode={node}
                  data-test="surface"
                  surfaceMotion={null}
                  backdropMotion={null}
                >
                  <button
                    data-test="switch"
                    onClick={() => setType(current => (current === 'overlay' ? 'inline' : 'overlay'))}
                  >
                    Switch
                  </button>
                </Drawer>
              </div>
            </>
          );
        };
        mountFluent(<Container />);
        cy.get('[data-test="mount-node"]').find('[data-test="surface"]').should('have.css', 'position', 'absolute');
        cy.get('[data-test="mount-node"]')
          .find(`.${overlayDrawerClassNames.backdrop}`)
          .should('have.css', 'position', 'absolute');
        cy.get('[data-test="switch"]').click();
        cy.get('[data-test="declaration"]')
          .children('[data-test="surface"]')
          .should('have.class', inlineDrawerClassNames.root);
        cy.get('[data-test="mount-node"]').find('[data-test="surface"]').should('not.exist');
        scrim().should('not.exist');
        cy.get('[data-test="switch"]').click();
        cy.get('[data-test="mount-node"]').find('[data-test="surface"]').should('have.css', 'position', 'absolute');
      });

      it('wrapper forwards mountNode object class to the overlay portal', () => {
        mountFluent(
          <Drawer
            open
            mountNode={{ className: 'drawer-custom-portal' }}
            data-test="surface"
            surfaceMotion={null}
            backdropMotion={null}
          >
            <button>Action</button>
          </Drawer>,
        );
        cy.get('.drawer-custom-portal').find('[data-test="surface"]').should('have.attr', 'role', 'dialog');
      });
    });
  });
});
