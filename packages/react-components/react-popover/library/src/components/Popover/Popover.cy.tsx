import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';

import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-theme';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import { useRestoreFocusTarget } from '@fluentui/react-tabster';
import { createPresenceComponent } from '@fluentui/react-motion';

import { Popover, PopoverTrigger, PopoverSurface } from '@fluentui/react-popover';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-menu';
import type { PopoverProps } from '@fluentui/react-popover';
import type { JSXElement } from '@fluentui/react-utilities';
const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const popoverTriggerSelector = '[aria-expanded]';
const popoverContentSelector = '[role="group"]';
const popoverInteractiveContentSelector = '[role="dialog"]';
let registerCampaignCoverage: () => void;

describe('Popover source and conformance gaps', () => {
  beforeEach(() => cy.viewport(1000, 800));

  for (const disableMotion of [false, true]) {
    it(`observes native animation creation with surfaceMotion ${disableMotion ? 'disabled' : 'default'}`, () => {
      cy.window().then(window => {
        const animation = cy.spy(window.Element.prototype, 'animate');
        mount(
          <Popover surfaceMotion={disableMotion ? null : undefined}>
            <PopoverTrigger disableButtonEnhancement>
              <button id="animation-trigger">Details</button>
            </PopoverTrigger>
            <PopoverSurface id="animation-surface">Information</PopoverSurface>
          </Popover>,
        );
        cy.get('#animation-trigger').click();
        cy.get('#animation-surface')
          .should('be.visible')
          .should(surface => {
            if (disableMotion) {
              expect(animation).not.to.have.been.called;
            } else {
              expect(animation).to.have.been.calledOn(surface[0]);
            }
          });
      });
    });
  }

  it('cancels hover dismissal when entering the surface and honors the exact configured delay', () => {
    mount(
      <div style={{ padding: 200 }}>
        <button id="hover-outside">Outside</button>
        <Popover openOnHover mouseLeaveDelay={200} surfaceMotion={null}>
          <PopoverTrigger disableButtonEnhancement>
            <button id="hover-trigger">Hover details</button>
          </PopoverTrigger>
          <PopoverSurface id="hover-surface" aria-label="Details" tabIndex={-1}>
            Information
          </PopoverSurface>
        </Popover>
      </div>,
    );
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
    cy.get('#hover-trigger').realHover();
    cy.get('#hover-surface').should('be.visible');
    cy.get('#hover-surface').realHover();
    cy.tick(200);
    cy.get('#hover-surface').should('be.visible');
    cy.get('#hover-outside').realHover();
    cy.tick(199);
    cy.get('#hover-surface').should('be.visible');
    cy.tick(1);
    cy.get('#hover-surface').should('not.exist');
  });

  it('uses the latest open prop and callback without remounting the trigger', () => {
    const first = cy.stub().as('first');
    const second = cy.stub().as('second');
    function Example() {
      const [open, setOpen] = React.useState(false);
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button
            id="external-open"
            onClick={() => {
              setUpdated(true);
              setOpen(true);
            }}
          >
            External open
          </button>
          <Popover open={open} onOpenChange={updated ? second : first} surfaceMotion={null}>
            <PopoverTrigger disableButtonEnhancement>
              <button id="live-trigger">Details</button>
            </PopoverTrigger>
            <PopoverSurface id="live-surface" aria-label="Details">
              <button>Action</button>
            </PopoverSurface>
          </Popover>
          <button id="external-close" onClick={() => setOpen(false)}>
            External close
          </button>
        </>
      );
    }
    mount(<Example />);
    cy.get('#live-trigger').then(original => {
      cy.get('#live-trigger').click();
      cy.get('@first').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { open: true });
      cy.get('#live-surface').should('not.exist');
      cy.get('#external-open').click();
      cy.get('#live-surface').should('be.visible').find('button').should('be.focused');
      cy.get('#live-trigger')
        .should(trigger => expect(trigger[0]).to.equal(original[0]))
        .click();
      cy.get('@second').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { open: false });
      cy.get('#live-surface').should('be.visible');
      cy.get('#external-close').click();
      cy.get('#live-surface').should('not.exist');
      cy.get('@first').should('have.been.calledOnce');
    });
  });

  it('updates context size, appearance, and scroll behavior while preserving open content', () => {
    function Example() {
      const [updated, setUpdated] = React.useState(false);
      return (
        <div style={{ padding: 200 }}>
          <button id="live-outside" style={{ marginRight: 200 }}>
            Outside
          </button>
          <Popover
            defaultOpen
            size={updated ? 'large' : 'small'}
            appearance={updated ? 'brand' : undefined}
            closeOnScroll={updated}
            surfaceMotion={null}
          >
            <PopoverTrigger disableButtonEnhancement>
              <button>Details</button>
            </PopoverTrigger>
            <PopoverSurface id="live-surface" aria-label="Details">
              <button id="update-context" onClick={() => setUpdated(true)}>
                Update context
              </button>
            </PopoverSurface>
          </Popover>
        </div>
      );
    }
    mount(<Example />);
    cy.get('#live-surface')
      .should('have.css', 'padding', '12px')
      .then(original => {
        cy.get('#live-outside').trigger('wheel');
        cy.get('#live-surface').should('be.visible');
        cy.get('#update-context').click();
        cy.get('#live-surface')
          .should(surface => expect(surface[0]).to.equal(original[0]))
          .and('have.css', 'padding', '20px')
          .and('have.css', 'background-color', 'rgb(91, 95, 199)');
        cy.get('#live-outside').trigger('wheel');
        cy.get('#live-surface').should('not.exist');
      });
  });

  it('ignores a changed defaultOpen after initial mount', () => {
    function Example() {
      const [initial, setInitial] = React.useState(false);
      return (
        <>
          <button id="change-default" onClick={() => setInitial(true)}>
            Change default
          </button>
          <Popover defaultOpen={initial}>
            <PopoverTrigger disableButtonEnhancement>
              <button id="default-trigger">Details</button>
            </PopoverTrigger>
            <PopoverSurface id="default-surface">Information</PopoverSurface>
          </Popover>
        </>
      );
    }
    mount(<Example />);
    cy.get('#change-default').click();
    cy.get('#default-trigger').should('have.attr', 'aria-expanded', 'false');
    cy.get('#default-surface').should('not.exist');
    cy.get('#default-trigger').click();
    cy.get('#default-surface').should('be.visible');
  });

  it('preserves child refs and replaces the surface ref when updated while open', () => {
    const triggerRef = React.createRef<HTMLButtonElement>();
    const initialRef = cy.stub().as('initialRef');
    const nextRef = cy.stub().as('nextRef');
    function Example() {
      const [updated, setUpdated] = React.useState(false);
      return (
        <Popover surfaceMotion={null}>
          <PopoverTrigger disableButtonEnhancement>
            <button id="ref-trigger" ref={triggerRef}>
              Details
            </button>
          </PopoverTrigger>
          <PopoverSurface id="ref-surface" ref={updated ? nextRef : initialRef}>
            <button id="change-ref" onClick={() => setUpdated(true)}>
              Change ref
            </button>
          </PopoverSurface>
        </Popover>
      );
    }
    mount(<Example />);
    cy.get('#ref-trigger').then(trigger => expect(triggerRef.current).to.equal(trigger[0]));
    cy.get('#ref-trigger').focus().realPress('Enter');
    cy.get('#ref-surface').then(surface => {
      cy.get('@initialRef').its('lastCall.args.0').should('equal', surface[0]);
      cy.get('#change-ref').click();
      cy.get('@initialRef').its('lastCall.args.0').should('be.null');
      cy.get('@nextRef').its('lastCall.args.0').should('equal', surface[0]);
    });
    cy.realPress('Escape');
    cy.get('#ref-surface').should('not.exist');
    cy.get('@nextRef').its('lastCall.args.0').should('be.null');
    cy.get('#ref-trigger').should('be.focused');
  });

  it('honors prevented Escape on the trigger, then dismisses normally on outside click', () => {
    const changed = cy.stub().as('changed');
    mount(
      <div style={{ padding: 200 }}>
        <button id="prevent-outside">Outside</button>
        <Popover defaultOpen unstable_disableAutoFocus onOpenChange={changed}>
          <PopoverTrigger disableButtonEnhancement>
            <button
              id="prevent-trigger"
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                }
              }}
            >
              Details
            </button>
          </PopoverTrigger>
          <PopoverSurface id="prevent-surface">Information</PopoverSurface>
        </Popover>
      </div>,
    );
    cy.get('#prevent-trigger').focus().realPress('Escape');
    cy.get('#prevent-surface').should('be.visible');
    cy.get('@changed').should('not.have.been.called');
    cy.get('#prevent-outside').click();
    cy.get('#prevent-surface').should('not.exist');
    cy.get('@changed').should('have.been.calledOnce');
  });

  it('renders into the consumer mountNode rather than the default portal container', () => {
    function Example() {
      const [host, setHost] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="consumer-host" ref={setHost} />
          <Popover mountNode={host}>
            <PopoverTrigger disableButtonEnhancement>
              <button id="host-trigger">Details</button>
            </PopoverTrigger>
            <PopoverSurface id="host-surface">Information</PopoverSurface>
          </Popover>
        </>
      );
    }
    mount(<Example />);
    cy.get('#host-trigger').click();
    cy.get('#consumer-host').find('#host-surface').should('be.visible');
    cy.get('#host-trigger').realPress('Escape');
    cy.get('#consumer-host').find('#host-surface').should('not.exist');
  });

  it('forwards presence visibility and content through a custom surfaceMotion renderer', () => {
    const states = cy.stub().as('motionStates');
    const CustomMotion = createPresenceComponent({
      enter: { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 0 },
      exit: { keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: 0 },
    });
    mount(
      <Popover
        surfaceMotion={{
          children: (_Component, props) => {
            states(props.visible);
            return <CustomMotion {...props} />;
          },
        }}
      >
        <PopoverTrigger disableButtonEnhancement>
          <button id="motion-trigger">Details</button>
        </PopoverTrigger>
        <PopoverSurface id="motion-surface">
          <button id="motion-action">Action</button>
        </PopoverSurface>
      </Popover>,
    );
    cy.get('#motion-surface').should('not.exist');
    cy.get('@motionStates').its('lastCall.args.0').should('equal', false);
    cy.get('#motion-trigger').click();
    cy.get('#motion-action').should('be.focused');
    cy.get('@motionStates').its('lastCall.args.0').should('equal', true);
    cy.realPress('Escape');
    cy.get('#motion-surface').should('not.exist');
    cy.get('@motionStates').its('lastCall.args.0').should('equal', false);
  });

  for (const input of ['mouse', 'Enter', 'Space'] as const) {
    it(`composes latest consumer handlers and refs on an enhanced custom trigger using ${input}`, () => {
      const first = cy.stub().as('customFirst');
      const next = cy.stub().as('customNext');
      const reference = React.createRef<HTMLButtonElement>();
      const CustomTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => (
        <button {...props} ref={ref} />
      ));
      function Example() {
        const [updated, setUpdated] = React.useState(false);
        return (
          <Popover surfaceMotion={null}>
            <PopoverTrigger>
              <CustomTrigger id="custom-live-trigger" ref={reference} onClick={updated ? next : first}>
                Custom details
              </CustomTrigger>
            </PopoverTrigger>
            <PopoverSurface id="custom-live-surface">
              <button id="custom-update" onClick={() => setUpdated(true)}>
                Update handler
              </button>
            </PopoverSurface>
          </Popover>
        );
      }
      mount(<Example />);
      cy.get('#custom-live-trigger').then(trigger => expect(reference.current).to.equal(trigger[0]));
      if (input === 'mouse') {
        cy.get('#custom-live-trigger').realClick();
      } else {
        cy.get('#custom-live-trigger').focus().realPress(input);
      }
      cy.get('#custom-live-trigger').should('have.attr', 'aria-expanded', 'true');
      cy.get('#custom-live-surface').should('be.visible');
      cy.get('@customFirst').should('have.been.calledOnce');
      cy.get('#custom-update').click();
      cy.get('#custom-live-trigger').realClick();
      cy.get('#custom-live-surface').should('not.exist');
      cy.get('#custom-live-trigger').should('have.attr', 'aria-expanded', 'false');
      cy.get('@customNext').should('have.been.calledOnce');
      cy.get('@customFirst').should('have.been.calledOnce');
      cy.get('#custom-live-trigger').focus().realPress('Enter');
      cy.get('#custom-live-surface').should('be.visible');
      cy.get('@customNext').should('have.been.calledTwice');
      cy.realPress('Escape');
      cy.get('#custom-live-surface').should('not.exist');
      cy.get('#custom-live-trigger').should('be.focused');
    });
  }

  it('anchors context openings to each right-click coordinate rather than the trigger or stale target', () => {
    mount(
      <div style={{ padding: 200 }}>
        <button id="context-outside">Outside</button>
        <Popover openOnContext positioning={{ position: 'below', align: 'start' }} surfaceMotion={null}>
          <PopoverTrigger disableButtonEnhancement>
            <button id="context-target" style={{ width: 300, height: 150 }}>
              Context target
            </button>
          </PopoverTrigger>
          <PopoverSurface id="context-surface">Information</PopoverSurface>
        </Popover>
      </div>,
    );
    for (const offset of [
      { x: 40, y: 40 },
      { x: 200, y: 100 },
    ]) {
      cy.get('#context-target').then(target => {
        const anchor = target[0].getBoundingClientRect();
        cy.get('#context-target').realClick({ button: 'right', x: offset.x, y: offset.y });
        cy.get('#context-surface').should(surface => {
          const bounds = surface[0].getBoundingClientRect();
          expect(bounds.left).to.be.closeTo(anchor.left + offset.x, 2);
          expect(bounds.top).to.be.closeTo(anchor.top + offset.y + 1, 2);
        });
      });
      cy.get('#context-outside').click();
      cy.get('#context-surface').should('not.exist');
    }
  });

  for (const size of ['small', 'medium', 'large'] as const) {
    it(`adds the ${size} arrow offset to the consumer main-axis offset`, () => {
      mount(
        <div style={{ padding: 200 }}>
          <Popover
            defaultOpen
            withArrow
            size={size}
            surfaceMotion={null}
            positioning={{ position: 'below', align: 'start', offset: 10 }}
          >
            <PopoverTrigger disableButtonEnhancement>
              <button id="offset-trigger">Details</button>
            </PopoverTrigger>
            <PopoverSurface id="offset-surface">Information</PopoverSurface>
          </Popover>
        </div>,
      );
      cy.get('#offset-trigger').then(trigger => {
        cy.get('#offset-surface').should(surface => {
          expect(surface[0].getBoundingClientRect().top - trigger[0].getBoundingClientRect().bottom).to.be.closeTo(
            size === 'small' ? 16 : 18,
            1,
          );
        });
      });
    });
  }

  it('isolates modal outside content, passes standard axe rules, and restores outside accessibility on dismissal', () => {
    mount(
      <div style={{ padding: 200 }}>
        <button id="modal-outside">Outside</button>
        <Popover trapFocus surfaceMotion={null}>
          <PopoverTrigger disableButtonEnhancement>
            <button id="modal-trigger">Details</button>
          </PopoverTrigger>
          <PopoverSurface id="modal-surface" aria-label="Details">
            <button id="modal-action">Action</button>
          </PopoverSurface>
        </Popover>
      </div>,
    );
    for (let cycle = 0; cycle < 2; cycle++) {
      cy.get('#modal-trigger').focus().realPress('Enter');
      cy.get('#modal-action')
        .should('be.focused')
        .should(action => {
          expect(action[0].closest('[aria-hidden="true"]')).to.equal(null);
        });
      cy.get('#modal-outside').should(outside => expect(outside[0].closest('[aria-hidden="true"]')).not.to.equal(null));
      cy.get('#modal-surface')
        .then(surface => axe.run(surface[0]))
        .then((result: axe.AxeResults) => {
          expect(result.violations.map(violation => violation.id)).to.deep.equal([]);
        });
      cy.realPress('Escape');
      cy.get('#modal-surface').should('not.exist');
      cy.get('#modal-outside').should(outside => expect(outside[0].closest('[aria-hidden="true"]')).to.equal(null));
      cy.get('#modal-outside').focus().should('be.focused');
    }
  });

  for (const closeOnIframeFocus of [false, true]) {
    it(`honors closeOnIframeFocus=${closeOnIframeFocus} after an actual external iframe focus polling interval`, () => {
      const changed = cy.stub().as('frameChange');
      cy.clock(Date.now(), ['setInterval', 'clearInterval']);
      mount(
        <div style={{ padding: 200 }}>
          <iframe id="external-frame" title="External content" srcDoc="<button>Embedded action</button>" />
          <button id="frame-outside">Outside</button>
          <Popover closeOnIframeFocus={closeOnIframeFocus} onOpenChange={changed} surfaceMotion={null}>
            <PopoverTrigger disableButtonEnhancement>
              <button id="frame-trigger">Details</button>
            </PopoverTrigger>
            <PopoverSurface id="frame-surface">Information</PopoverSurface>
          </Popover>
        </div>,
      );
      cy.get('#frame-trigger').click();
      cy.get('#frame-surface').should('be.visible');
      cy.get('@frameChange').invoke('resetHistory');
      cy.get('#external-frame').focus().should('be.focused');
      // The iframe-focus detector polls every 100ms. One tick avoids batching multiple
      // close requests before React can commit the first uncontrolled state change.
      cy.tick(100);
      if (closeOnIframeFocus) {
        cy.get('#frame-surface').should('not.exist');
        cy.get('@frameChange')
          .should('have.been.calledOnce')
          .its('firstCall.args.1')
          .should('deep.equal', { open: false });
      } else {
        cy.get('#frame-surface').should('be.visible');
        cy.get('@frameChange').should('not.have.been.called');
        cy.get('#frame-outside').click();
        cy.get('#frame-surface').should('not.exist');
        cy.get('@frameChange')
          .should('have.been.calledOnce')
          .its('firstCall.args.1')
          .should('deep.equal', { open: false });
      }
    });
  }
});

describe('Popover', () => {
  ['uncontrolled', 'controlled'].forEach(scenario => {
    const UncontrolledExample = () => (
      <Popover>
        <PopoverTrigger disableButtonEnhancement>
          <button>Trigger</button>
        </PopoverTrigger>
        <PopoverSurface>This is a popover</PopoverSurface>
      </Popover>
    );

    const ControlledExample = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Popover open={open} onOpenChange={(e, data) => setOpen(data.open)}>
          <PopoverTrigger disableButtonEnhancement>
            <button>Trigger</button>
          </PopoverTrigger>
          <PopoverSurface>This is a popover</PopoverSurface>
        </Popover>
      );
    };

    describe(scenario, () => {
      const Example = scenario === 'controlled' ? ControlledExample : UncontrolledExample;

      beforeEach(() => {
        mount(<Example />);
        cy.get('body').click('bottomRight');
      });

      if (scenario === 'uncontrolled') {
        registerCampaignCoverage = () => {
          const campaignTrigger = '[data-testid="campaign-trigger"]';
          const campaignSurface = '[data-testid="campaign-surface"]';
          const campaignOutside = '[data-testid="campaign-outside"]';

          function campaign(props: Omit<PopoverProps, 'children'> = {}, disabled = false) {
            return (
              <div data-testid="campaign-frame" style={{ padding: 200 }}>
                <button data-testid="campaign-outside">Outside</button>
                <Popover {...props}>
                  <PopoverTrigger disableButtonEnhancement>
                    <button data-testid="campaign-trigger" disabled={disabled}>
                      Details
                    </button>
                  </PopoverTrigger>
                  <PopoverSurface data-testid="campaign-surface" aria-label="Details">
                    <button data-testid="campaign-first">First action</button>
                    <button data-testid="campaign-last">Last action</button>
                  </PopoverSurface>
                </Popover>
              </div>
            );
          }

          function tokenRgb(value: string) {
            expect(value).to.match(/^#[0-9a-f]{6}$/i);
            return `rgb(${[1, 3, 5].map(start => parseInt(value.slice(start, start + 2), 16)).join(', ')})`;
          }

          describe('Popover additional documented contracts', () => {
            beforeEach(() => cy.viewport(1000, 800));

            it('focuses a named non-interactive surface and restores the native trigger on Escape', () => {
              mount(
                <Popover>
                  <PopoverTrigger disableButtonEnhancement>
                    <button data-testid="campaign-trigger">Details</button>
                  </PopoverTrigger>
                  <PopoverSurface data-testid="campaign-surface" tabIndex={-1} aria-labelledby="campaign-heading">
                    <h3 id="campaign-heading">Read-only details</h3>
                    <p>Non-interactive information</p>
                  </PopoverSurface>
                </Popover>,
              );
              cy.get(campaignTrigger).focus().realPress('Enter');
              cy.get(campaignSurface)
                .should('be.focused')
                .and('have.attr', 'role', 'group')
                .then(element => expect(computeAccessibleName(element[0])).to.equal('Read-only details'));
              cy.realPress('Escape');
              cy.get(campaignSurface).should('not.exist');
              cy.get(campaignTrigger).should('be.focused');
            });

            it('supports a triggerless controlled popover anchored to a consumer target with focus restoration', () => {
              function Example() {
                const [target, setTarget] = React.useState<HTMLButtonElement | null>(null);
                const [open, setOpen] = React.useState(false);
                const restore = useRestoreFocusTarget();
                return (
                  <div style={{ padding: 200 }}>
                    <button {...restore} ref={setTarget} data-testid="campaign-trigger" onClick={() => setOpen(true)}>
                      Show details
                    </button>
                    <Popover
                      open={open}
                      positioning={{ target: target ?? undefined, position: 'below', align: 'start' }}
                      onOpenChange={(_event, data) => setOpen(data.open)}
                    >
                      <PopoverSurface data-testid="campaign-surface" aria-label="Details">
                        <button>Action</button>
                      </PopoverSurface>
                    </Popover>
                  </div>
                );
              }
              mount(<Example />);
              cy.get(campaignTrigger).focus().realPress('Enter');
              cy.get(campaignSurface).should('be.visible').find('button').should('be.focused');
              cy.get(campaignTrigger).then(trigger => {
                cy.get(campaignSurface).should(surface => {
                  const anchor = trigger[0].getBoundingClientRect();
                  const bounds = surface[0].getBoundingClientRect();
                  expect(bounds.top).to.be.closeTo(anchor.bottom, 2);
                  expect(bounds.left).to.be.closeTo(anchor.left, 2);
                });
              });
              cy.realPress('Escape');
              cy.get(campaignSurface).should('not.exist');
              cy.get(campaignTrigger).should('be.focused');
            });

            for (const size of ['small', 'medium', 'large'] as const) {
              it(`propagates ${size} size to padding and arrow geometry`, () => {
                mount(campaign({ defaultOpen: true, size, withArrow: true, surfaceMotion: null }));
                cy.get(campaignSurface)
                  .should('have.css', 'padding', { small: '12px', medium: '16px', large: '20px' }[size])
                  .children('div')
                  .should('have.length', 1)
                  .should(arrow => {
                    expect(arrow[0].getBoundingClientRect().width).to.be.closeTo(size === 'small' ? 12 : 16, 0.1);
                    expect(
                      getComputedStyle(arrow[0]).getPropertyValue('--fui-positioning-arrow-height').trim(),
                    ).to.equal(size === 'small' ? '8.484px' : '11.312px');
                  });
              });
            }

            for (const theme of [teamsLightTheme, webDarkTheme, teamsHighContrastTheme]) {
              for (const appearance of [undefined, 'brand', 'inverted'] as const) {
                it(`propagates ${appearance ?? 'default'} appearance for ${theme.colorNeutralBackground1}`, () => {
                  mountBase(
                    <FluentProvider theme={theme}>
                      {campaign({ defaultOpen: true, appearance, surfaceMotion: null })}
                    </FluentProvider>,
                  );
                  const background =
                    appearance === 'brand'
                      ? theme.colorBrandBackground
                      : appearance === 'inverted'
                      ? theme.colorNeutralBackgroundStatic
                      : theme.colorNeutralBackground1;
                  const foreground =
                    appearance === 'brand'
                      ? theme.colorNeutralForegroundOnBrand
                      : appearance === 'inverted'
                      ? theme.colorNeutralForegroundStaticInverted
                      : theme.colorNeutralForeground1;
                  cy.get(campaignSurface)
                    .should('have.css', 'background-color', tokenRgb(background))
                    .and('have.css', 'color', tokenRgb(foreground));
                });
              }
            }

            it('disables motion without disabling open, focus, or dismissal', () => {
              mount(campaign({ surfaceMotion: null }));
              cy.get(campaignSurface).should('not.exist');
              cy.get(campaignTrigger).click().should('have.attr', 'aria-expanded', 'true');
              cy.get('[data-testid="campaign-first"]').should('be.focused');
              cy.realPress('Escape');
              cy.get(campaignSurface).should('not.exist');
              cy.get(campaignTrigger).should('be.focused').and('have.attr', 'aria-expanded', 'false');
            });
          });

          describe('Popover adversarial browser boundaries', () => {
            beforeEach(() => cy.viewport(1000, 800));

            it('uses defaultOpen only for initial state and never emits a mount callback', () => {
              const changed = cy.stub().as('changed');
              mount(campaign({ defaultOpen: true, onOpenChange: changed }));
              cy.get(campaignSurface).should('be.visible');
              cy.get('@changed').should('not.have.been.called');
              cy.get(campaignTrigger).click();
              cy.get(campaignSurface).should('not.exist');
              cy.get('@changed')
                .should('have.been.calledOnce')
                .its('firstCall.args.1')
                .should('deep.equal', { open: false });
              cy.get(campaignTrigger).click();
              cy.get(campaignSurface).should('be.visible');
              cy.get('@changed')
                .should('have.been.calledTwice')
                .its('secondCall.args.1')
                .should('deep.equal', { open: true });
            });

            for (const open of [false, true]) {
              it(`does not mutate controlled open=${open} when the consumer declines the request`, () => {
                const changed = cy.stub().as('changed');
                mount(campaign({ open, onOpenChange: changed }));
                cy.get(campaignTrigger).click();
                cy.get('@changed')
                  .should('have.been.calledOnce')
                  .its('firstCall.args.1')
                  .should('deep.equal', { open: !open });
                cy.get(campaignTrigger).should('have.attr', 'aria-expanded', String(open));
                cy.get(campaignSurface).should(open ? 'be.visible' : 'not.exist');
              });
            }

            it('does not open a disabled native trigger with pointer or keyboard input', () => {
              const changed = cy.stub().as('changed');
              mount(campaign({ onOpenChange: changed }, true));
              cy.get(campaignTrigger).should('be.disabled').realClick();
              cy.get(campaignOutside).focus().realPress('Tab');
              cy.get(campaignTrigger).should('not.be.focused');
              cy.realPress('Enter');
              cy.get(campaignSurface).should('not.exist');
              cy.get('@changed').should('not.have.been.called');
            });

            it('context mode ignores left click and Enter, but reports right click and outside wheel dismissal', () => {
              const changed = cy.stub().as('changed');
              mount(campaign({ openOnContext: true, onOpenChange: changed }));
              cy.get(campaignTrigger).click().focus().realPress('Enter');
              cy.get(campaignSurface).should('not.exist');
              cy.get('@changed').should('not.have.been.called');
              cy.get(campaignTrigger).rightclick();
              cy.get(campaignSurface).should('be.visible');
              cy.get('@changed').its('firstCall.args.0.type').should('equal', 'contextmenu');
              cy.get('@changed').its('firstCall.args.1').should('deep.equal', { open: true });
              cy.get(campaignOutside).trigger('wheel');
              cy.get(campaignSurface).should('not.exist');
              cy.get('@changed').its('lastCall.args.1').should('deep.equal', { open: false });
            });

            it('does not dismiss on inside clicks or wheel events while closeOnScroll is enabled', () => {
              const changed = cy.stub().as('changed');
              mount(campaign({ defaultOpen: true, closeOnScroll: true, onOpenChange: changed }));
              cy.get('[data-testid="campaign-last"]').click().trigger('wheel');
              cy.get(campaignSurface).should('be.visible');
              cy.get('@changed').should('not.have.been.called');
              cy.get(campaignOutside).trigger('wheel');
              cy.get(campaignSurface).should('not.exist');
              cy.get('@changed').should('have.been.calledOnce');
            });

            for (const dir of ['ltr', 'rtl'] as const) {
              it(`traps focus with native forward/reverse Tab and restores focus in ${dir}`, () => {
                mountBase(
                  <FluentProvider theme={teamsLightTheme} dir={dir}>
                    {campaign({ trapFocus: true })}
                  </FluentProvider>,
                );
                cy.get(campaignTrigger).focus().realPress('Space');
                cy.get(campaignSurface).should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
                cy.get('[data-testid="campaign-first"]').should('be.focused');
                cy.realPress(['Shift', 'Tab']);
                cy.get('[data-testid="campaign-last"]').should('be.focused');
                cy.realPress('Tab');
                cy.get('[data-testid="campaign-first"]').should('be.focused');
                cy.realPress('Escape');
                cy.get(campaignSurface).should('not.exist');
                cy.get(campaignTrigger).should('be.focused');
              });

              it(`positions below logical start rather than physical left in ${dir}`, () => {
                mountBase(
                  <FluentProvider theme={teamsLightTheme} dir={dir}>
                    {campaign({
                      defaultOpen: true,
                      positioning: { position: 'below', align: 'start' },
                      surfaceMotion: null,
                    })}
                  </FluentProvider>,
                );
                cy.get(campaignTrigger).then(trigger => {
                  cy.get(campaignSurface).should(surface => {
                    const anchor = trigger[0].getBoundingClientRect();
                    const bounds = surface[0].getBoundingClientRect();
                    expect(bounds.top).to.be.closeTo(anchor.bottom, 2);
                    expect(dir === 'ltr' ? bounds.left : bounds.right).to.be.closeTo(
                      dir === 'ltr' ? anchor.left : anchor.right,
                      2,
                    );
                  });
                });
              });
            }

            it('suppresses arrows when positioning covers the target', () => {
              mount(
                campaign({
                  defaultOpen: true,
                  withArrow: true,
                  positioning: { coverTarget: true },
                  surfaceMotion: null,
                }),
              );
              cy.get(campaignSurface).should('be.visible').children('div').should('not.exist');
            });

            it('runs standard axe rules on a named, non-modal composition without exclusions', () => {
              mount(campaign({ defaultOpen: true, surfaceMotion: null }));
              cy.get(campaignSurface).should('be.visible');
              cy.get('[data-testid="campaign-frame"]').then(frame => {
                cy.get(campaignSurface).then(surface => {
                  cy.then(() => axe.run([frame[0], surface[0]])).then((result: axe.AxeResults) => {
                    expect(
                      result.violations.map(violation => ({
                        id: violation.id,
                        nodes: violation.nodes.map(node => node.target),
                      })),
                    ).to.deep.equal([]);
                  });
                });
              });
            });
          });
        };
      }

      it('should open when clicked', () => {
        cy.get(popoverTriggerSelector).click().get(popoverContentSelector).should('be.visible');
      });

      (['{enter}', 'Space'] as const).forEach((key: '{enter}' | 'Space') => {
        it(`should open with ${key}`, () => {
          cy.get(popoverTriggerSelector).focus().realPress(key);

          cy.get(popoverContentSelector).should('be.visible');
        });
      });

      it('should dismiss on click outside', () => {
        cy.get(popoverTriggerSelector)
          .click()
          .get('body')
          .click('bottomRight')
          .get(popoverContentSelector)
          .should('not.exist');
      });

      it('should dismiss on Escape keydown', () => {
        cy.get(popoverTriggerSelector).click().realPress('Escape');
        cy.get(popoverContentSelector).should('not.exist');
      });

      it('should keep open state on scroll outside', () => {
        cy.get(popoverTriggerSelector).click().get(popoverContentSelector).should('be.visible');
        cy.get('body').trigger('wheel').get(popoverContentSelector).should('be.visible');
      });
    });
  });

  describe('Open on hover', () => {
    beforeEach(() => {
      mount(
        <Popover openOnHover>
          <PopoverTrigger disableButtonEnhancement>
            <button>Trigger</button>
          </PopoverTrigger>
          <PopoverSurface>This is a popover</PopoverSurface>
        </Popover>,
      );
      cy.get('body').click('bottomRight');
    });

    it('should open on hover, and keep open on mouse move to content', () => {
      cy.get(popoverTriggerSelector).trigger('mouseover').get(popoverContentSelector).should('be.visible');
      cy.get(popoverContentSelector).trigger('mouseover').get(popoverContentSelector).should('be.visible');
    });
  });

  describe('With custom trigger', () => {
    const CustomTrigger = React.forwardRef<HTMLButtonElement, {}>((props, ref) => {
      return (
        <button {...props} ref={ref}>
          Custom Trigger
        </button>
      );
    });

    it('should dismiss on click outside', () => {
      mount(
        <Popover>
          <PopoverTrigger disableButtonEnhancement>
            <CustomTrigger />
          </PopoverTrigger>
          <PopoverSurface>This is a popover</PopoverSurface>
        </Popover>,
      );
      cy.get(popoverTriggerSelector).get('body').click('bottomRight').get(popoverContentSelector).should('not.exist');
    });
  });

  describe('Context popover', () => {
    beforeEach(() => {
      mount(
        <Popover openOnContext>
          <PopoverTrigger disableButtonEnhancement>
            <button>Trigger</button>
          </PopoverTrigger>
          <PopoverSurface>This is a popover</PopoverSurface>
        </Popover>,
      );
      cy.get('body').click('bottomRight');
    });

    it('should open when right clicked', () => {
      cy.get(popoverTriggerSelector).rightclick().get(popoverContentSelector).should('be.visible');
    });

    it('should dismiss on scroll outside', () => {
      cy.get(popoverTriggerSelector)
        .rightclick()
        .get('body')
        .trigger('wheel')
        .get(popoverContentSelector)
        .should('not.exist');
    });
  });

  describe('popover with closeOnScroll', () => {
    beforeEach(() => {
      mount(
        <Popover closeOnScroll>
          <PopoverTrigger disableButtonEnhancement>
            <button>Trigger</button>
          </PopoverTrigger>
          <PopoverSurface>This is a popover</PopoverSurface>
        </Popover>,
      );
      cy.get('body').click('bottomRight');
    });

    it('should dismiss on scroll outside', () => {
      cy.get(popoverTriggerSelector).click().get(popoverContentSelector).should('be.visible');
      cy.get('body').trigger('wheel').get(popoverContentSelector).should('not.exist');
    });
  });

  describe('Nested', () => {
    const PopoverL1 = () => {
      const id = 'first';
      return (
        <Popover trapFocus>
          <PopoverTrigger disableButtonEnhancement>
            <button>First nested trigger</button>
          </PopoverTrigger>

          <PopoverSurface aria-labelledby={id}>
            <button>First nested button</button>
            <PopoverL2 />
            <PopoverL2 />
          </PopoverSurface>
        </Popover>
      );
    };

    const PopoverL2 = () => {
      const id = 'second';
      return (
        <Popover trapFocus>
          <PopoverTrigger disableButtonEnhancement>
            <button>Second nested trigger</button>
          </PopoverTrigger>

          <PopoverSurface aria-labelledby={id}>
            <button>Second nested button</button>
          </PopoverSurface>
        </Popover>
      );
    };

    const Example = () => {
      return (
        <Popover trapFocus>
          <PopoverTrigger disableButtonEnhancement>
            <button>Root trigger</button>
          </PopoverTrigger>

          <PopoverSurface>
            <button>Root button</button>
            <PopoverL1 />
          </PopoverSurface>
        </Popover>
      );
    };

    beforeEach(() => {
      mount(<Example />);
      // Open the whole stack of popovers
      cy.contains('Root').click().get('body').contains('First').click().get('body').contains('Second').first().click();
    });

    it('should trap focus with tab', () => {
      cy.focused().then(beforeFocused => {
        cy.focused().realPress('Tab');
        cy.realPress(['Shift', 'Tab']);
        cy.focused().then(afterFocused => {
          expect(beforeFocused[0]).eq(afterFocused[0]);
        });
      });
    });

    it('should trap focus with shift+tab', () => {
      cy.focused().then(beforeFocused => {
        cy.focused().realPress('Tab');
        cy.realPress(['Shift', 'Tab']);
        cy.focused().then(afterFocused => {
          expect(beforeFocused[0]).eq(afterFocused[0]);
        });
      });
    });

    it('should dismiss all nested popovers on outside click', () => {
      cy.get('body').click('bottomRight').get(popoverInteractiveContentSelector).should('not.exist');
    });

    it('should not dismiss when clicking on nested content', () => {
      cy.contains('Second nested button').click().get(popoverInteractiveContentSelector).should('have.length', 3);
    });

    it('should dismiss child popovers when clicking on parents', () => {
      cy.contains('First nested button')
        .click()
        .get(popoverInteractiveContentSelector)
        .should('have.length', 2)
        .contains('Root button')
        .click()
        .get(popoverInteractiveContentSelector)
        .should('have.length', 1);
    });

    it('should when opening a sibling popover, should dismiss other sibling popover', () => {
      const secondNestedTriggerSelector = 'button:contains(Second nested trigger)';

      cy.get(secondNestedTriggerSelector)
        .eq(1)
        .click()
        .get(popoverInteractiveContentSelector)
        .should('have.length', 3)
        .get(secondNestedTriggerSelector)
        .eq(0)
        .click()
        .get(popoverInteractiveContentSelector)
        .should('have.length', 3);
    });

    it('should dismiss each popover in the stack with Escape keydown', () => {
      cy.focused().realPress('Escape');
      cy.get(popoverInteractiveContentSelector).should('have.length', 2);
      cy.focused().realPress('Escape');
      cy.get(popoverInteractiveContentSelector).should('have.length', 1);
      cy.focused().realPress('Escape');
      cy.get(popoverInteractiveContentSelector).should('not.exist');
    });
  });

  describe('updating content', () => {
    const Example = () => {
      const [visible, setVisible] = React.useState(false);

      const changeContent = () => setVisible(true);
      const onOpenChange: PopoverProps['onOpenChange'] = (e, data) => {
        if (data.open === false) {
          setVisible(false);
        }
      };

      return (
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger disableButtonEnhancement>
            <button>Popover trigger</button>
          </PopoverTrigger>

          <PopoverSurface>
            {visible ? (
              <div>The second panel</div>
            ) : (
              <div>
                <button onClick={changeContent}>Action</button>
              </div>
            )}
          </PopoverSurface>
        </Popover>
      );
    };

    it('should not close popover', () => {
      mount(<Example />);
      cy.get(popoverTriggerSelector)
        .click()
        .get(popoverContentSelector)
        .within(() => {
          cy.get('button').click();
        })
        .get(popoverContentSelector)
        .should('exist');
    });
  });

  describe('with inline prop', () => {
    it('should render PopoverSurface in DOM order', () => {
      mount(
        <>
          <div>
            <Popover inline>
              <PopoverTrigger disableButtonEnhancement>
                <button>Popover trigger</button>
              </PopoverTrigger>

              <PopoverSurface>This is a Popover</PopoverSurface>
            </Popover>
          </div>
          <div>Outside content</div>
        </>,
      );

      cy.get(popoverTriggerSelector)
        .click()
        .get(popoverContentSelector)
        .prev()
        .then(popoverSurfacePrev => {
          cy.get(popoverTriggerSelector).then(popoverTrigger => {
            expect(popoverTrigger[0]).eq(popoverSurfacePrev[0]);
          });
        });
    });

    describe('legacy focus trap behaviour', () => {
      it('Tab should not go to the window', () => {
        mount(
          <Popover trapFocus>
            <PopoverTrigger disableButtonEnhancement>
              <button>Popover trigger</button>
            </PopoverTrigger>

            <PopoverSurface>
              <button>One</button>
              <button>Two</button>
            </PopoverSurface>
          </Popover>,
        );

        cy.get(popoverTriggerSelector).focus().realPress('Enter');

        cy.contains('One').should('have.focus').realPress('Tab');
        cy.contains('Two').should('have.focus').realPress('Tab');
        cy.contains('One').should('have.focus').realPress(['Shift', 'Tab']);
        cy.contains('Two').should('have.focus');
      });

      it('should work as inertTrapFocus when set to false', () => {
        mount(
          <Popover
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            legacyTrapFocus={false}
            trapFocus
          >
            <PopoverTrigger disableButtonEnhancement>
              <button>Popover trigger</button>
            </PopoverTrigger>

            <PopoverSurface>
              <button>One</button>
              <button>Two</button>
            </PopoverSurface>
          </Popover>,
        );

        cy.get(popoverTriggerSelector).focus().realPress('Enter');

        cy.contains('One').should('have.focus').realPress('Tab');
        cy.contains('Two').should('have.focus').realPress('Tab');
        cy.focused().should('not.exist');
      });
    });

    describe('inert focus trap behaviour', () => {
      it('Tab should go to the window', () => {
        mount(
          <Popover inertTrapFocus trapFocus>
            <PopoverTrigger disableButtonEnhancement>
              <button>Popover trigger</button>
            </PopoverTrigger>

            <PopoverSurface>
              <button>One</button>
              <button>Two</button>
            </PopoverSurface>
          </Popover>,
        );

        cy.get(popoverTriggerSelector).focus().realPress('Enter');

        cy.contains('One').should('have.focus').realPress('Tab');
        cy.contains('Two').should('have.focus').realPress('Tab');
        cy.focused().should('not.exist');
      });
    });

    describe('trap focus behaviour', () => {
      it('should focus on PopoverSurface when its tabIndex is a number', () => {
        mount(
          <Popover trapFocus>
            <PopoverTrigger disableButtonEnhancement>
              <button>Popover trigger</button>
            </PopoverTrigger>

            <PopoverSurface tabIndex={-1} id="popover-surface">
              <button>One</button>
              <button>Two</button>
            </PopoverSurface>
          </Popover>,
        );

        cy.get(popoverTriggerSelector).focus().realPress('Enter');

        cy.get('#popover-surface').should('have.focus').realPress('Tab');
        cy.contains('One').should('have.focus').realPress('Tab');
        cy.contains('Two').should('have.focus').realPress('Tab');
        cy.contains('One').should('have.focus').realPress(['Shift', 'Tab']);
        cy.contains('Two').should('have.focus');
      });
    });

    describe('close on focus escape', () => {
      it('should close when focus is programmatically moved outside', () => {
        mount(
          <>
            <button id="outside">Outside</button>
            <Popover trapFocus>
              <PopoverTrigger disableButtonEnhancement>
                <button>Popover trigger</button>
              </PopoverTrigger>
              <PopoverSurface>
                <button>Inside</button>
              </PopoverSurface>
            </Popover>
          </>,
        );

        cy.get(popoverTriggerSelector).click();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
        cy.get('#outside').focus();
        cy.get(popoverInteractiveContentSelector).should('not.exist');
      });

      it('should close with inertTrapFocus when focus is programmatically moved outside', () => {
        mount(
          <>
            <button id="outside">Outside</button>
            <Popover trapFocus inertTrapFocus>
              <PopoverTrigger disableButtonEnhancement>
                <button>Popover trigger</button>
              </PopoverTrigger>
              <PopoverSurface>
                <button>Inside</button>
              </PopoverSurface>
            </Popover>
          </>,
        );

        cy.get(popoverTriggerSelector).click();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
        cy.get('#outside').focus();
        cy.get(popoverInteractiveContentSelector).should('not.exist');
      });

      it('should not close without trapFocus when focus moves outside', () => {
        mount(
          <>
            <button id="outside">Outside</button>
            <Popover>
              <PopoverTrigger disableButtonEnhancement>
                <button>Popover trigger</button>
              </PopoverTrigger>
              <PopoverSurface>This is a popover</PopoverSurface>
            </Popover>
          </>,
        );

        cy.get(popoverTriggerSelector).click();
        cy.get(popoverContentSelector).should('be.visible');
        cy.get('#outside').focus();
        cy.get(popoverContentSelector).should('be.visible');
      });

      it('should not close when closeOnFocusOutside is false', () => {
        mount(
          <>
            <button id="outside">Outside</button>
            <Popover trapFocus {...({ closeOnFocusOutside: false } as unknown as PopoverProps)}>
              <PopoverTrigger disableButtonEnhancement>
                <button>Popover trigger</button>
              </PopoverTrigger>
              <PopoverSurface>
                <button>Inside</button>
              </PopoverSurface>
            </Popover>
          </>,
        );

        cy.get(popoverTriggerSelector).click();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
        cy.get('#outside').focus();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
      });

      it('should not close when focus moves outside but was never inside the popover', () => {
        const ControlledPopover = () => {
          const [open, setOpen] = React.useState(false);

          return (
            <>
              <input id="outside" aria-label="external input" />
              <button id="open-programmatically" onClick={() => setOpen(true)}>
                Open programmatically
              </button>
              <Popover
                open={open}
                onOpenChange={(_event, data) => setOpen(data.open)}
                trapFocus
                unstable_disableAutoFocus
              >
                <PopoverTrigger disableButtonEnhancement>
                  <button>Popover anchor</button>
                </PopoverTrigger>
                <PopoverSurface>
                  <button>Inside</button>
                </PopoverSurface>
              </Popover>
            </>
          );
        };

        mount(<ControlledPopover />);

        cy.get('#outside').focus();
        cy.get('#open-programmatically').click();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
        cy.get('#outside').focus();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
      });

      it('should close when autofocus is disabled but focus moves from inside to outside', () => {
        const ControlledPopover = () => {
          const [open, setOpen] = React.useState(false);

          return (
            <>
              <button id="outside">Outside</button>
              <button id="open-programmatically" onClick={() => setOpen(true)}>
                Open programmatically
              </button>
              <Popover
                open={open}
                onOpenChange={(_event, data) => setOpen(data.open)}
                trapFocus
                unstable_disableAutoFocus
              >
                <PopoverTrigger disableButtonEnhancement>
                  <button>Popover anchor</button>
                </PopoverTrigger>
                <PopoverSurface>
                  <button>Inside</button>
                </PopoverSurface>
              </Popover>
            </>
          );
        };

        mount(<ControlledPopover />);

        cy.get('#open-programmatically').click();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
        cy.contains('Inside').focus();
        cy.get('#outside').focus();
        cy.get(popoverInteractiveContentSelector).should('not.exist');
      });

      it('should not close when focus moves to the trigger', () => {
        mount(
          <Popover trapFocus>
            <PopoverTrigger disableButtonEnhancement>
              <button>Popover trigger</button>
            </PopoverTrigger>
            <PopoverSurface>
              <button>Inside</button>
            </PopoverSurface>
          </Popover>,
        );

        cy.get(popoverTriggerSelector).click();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
        cy.get(popoverTriggerSelector).focus();
        cy.get(popoverInteractiveContentSelector).should('be.visible');
      });
    });
  });

  describe('with Iframe', () => {
    const iframeContent = `<div id="iframecontent">
  <button>Hello World!</button>
</div>`;

    const ExampleFrame = () => {
      return <iframe title="frame" srcDoc={iframeContent} />;
    };

    it('should close when focus is on an external iframe', () => {
      mount(
        <>
          <ExampleFrame />
          <div />
          <Popover>
            <PopoverTrigger disableButtonEnhancement>
              <button>Popover trigger</button>
            </PopoverTrigger>

            <PopoverSurface>This is a popover</PopoverSurface>
          </Popover>
        </>,
      );

      cy.get(popoverTriggerSelector).click().get('iframe').focus().get(popoverContentSelector).should('not.exist');
    });

    it('should not close when focus is on an internal iframe', () => {
      mount(
        <>
          <Popover>
            <PopoverTrigger disableButtonEnhancement>
              <button>Popover trigger</button>
            </PopoverTrigger>

            <PopoverSurface>
              <ExampleFrame />
            </PopoverSurface>
          </Popover>
        </>,
      );

      cy.get(popoverTriggerSelector)
        .click()
        .get('iframe')
        .focus()
        // wait is generally bad practice but since the iframe focus
        // detection works through polling, set a value here where the
        // the event would definitely dispatch
        .wait(2000)
        .get(popoverContentSelector)
        .should('exist');
    });

    it('should not close when focus is on an internal iframe in a nested popover', () => {
      mount(
        <>
          <Popover>
            <PopoverTrigger disableButtonEnhancement>
              <button>First</button>
            </PopoverTrigger>

            <PopoverSurface>
              <Popover>
                <PopoverTrigger>
                  <button>Second</button>
                </PopoverTrigger>
                <PopoverSurface>
                  <ExampleFrame />
                </PopoverSurface>
              </Popover>
            </PopoverSurface>
          </Popover>
        </>,
      );

      cy.get(popoverTriggerSelector)
        .first()
        .click()
        .get(popoverTriggerSelector)
        .eq(1)
        .click()
        .get('iframe')
        .focus()
        // wait is generally bad practice but since the iframe focus
        // detection works through polling, set a value here where the
        // the event would definitely dispatch
        .wait(2000)
        .get(popoverContentSelector)
        .should('have.length', 2);
    });
  });

  describe('Without trapFocus', () => {
    it('should restore focus on close', () => {
      mount(
        <Popover>
          <PopoverTrigger>
            <button id="trigger">trigger</button>
          </PopoverTrigger>
          <PopoverSurface>
            <button id="button">button</button>
          </PopoverSurface>
        </Popover>,
      );

      cy.get('#trigger')
        .click()
        .get(popoverContentSelector)
        .should('exist')
        .get('#button')
        .focus()
        .type('{esc}')
        .get(popoverContentSelector)
        .should('not.exist')
        .get('#trigger')
        .should('have.focus');
    });
  });

  describe('Opens menu', () => {
    it('should keep focus in popover once menu is dismissed with mouse', () => {
      mount(
        <Popover trapFocus>
          <PopoverTrigger>
            <button>Popover trigger</button>
          </PopoverTrigger>
          <PopoverSurface>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <button id="menu-trigger">Menu trigger</button>
              </MenuTrigger>

              <MenuPopover>
                <MenuList>
                  <MenuItem id="first-item">Item a</MenuItem>
                  <MenuItem>Item b</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </PopoverSurface>
        </Popover>,
      );

      cy.get(popoverTriggerSelector)
        .click()
        .get('#menu-trigger')
        .click()
        .get('#first-item')
        .should('have.focus')
        .get('#menu-trigger')
        .click()
        .get('#first-item')
        .should('not.exist')
        .get('#menu-trigger')
        .should('have.focus');
    });

    it('should keep focus in popover once menu is dismissed with keyboard', () => {
      mount(
        <Popover trapFocus>
          <PopoverTrigger>
            <button>Popover trigger</button>
          </PopoverTrigger>
          <PopoverSurface>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <button id="menu-trigger">Menu trigger</button>
              </MenuTrigger>

              <MenuPopover>
                <MenuList>
                  <MenuItem id="first-item">Item a</MenuItem>
                  <MenuItem>Item b</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </PopoverSurface>
        </Popover>,
      );

      cy.get(popoverTriggerSelector)
        .click()
        .get('#menu-trigger')
        .click()
        .get('#first-item')
        .should('have.focus')
        .type('{esc}')
        .get('#menu-trigger')
        .should('have.focus');
    });
  });
});

// Register outside the original state matrix so these fixtures do not inherit
// its mount/remount hooks and unrelated restoration history.
registerCampaignCoverage!();
