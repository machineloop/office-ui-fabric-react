import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';

import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import type { JSXElement } from '@fluentui/react-utilities';
import { getByRole, queryByRole } from '@testing-library/dom';
import { useRestoreFocusTarget } from '@fluentui/react-tabster';
import type { DialogProps } from './Dialog.types';
import type { DialogSurfaceProps } from '../DialogSurface/DialogSurface.types';
import { Fade } from '@fluentui/react-motion-components-preview';

import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
} from '@fluentui/react-dialog';
import { Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-popover';
import { Tooltip } from '@fluentui/react-tooltip';
import { Button } from '@fluentui/react-button';
import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-menu';
import {
  dialogSurfaceSelector,
  dialogTriggerCloseId,
  dialogTriggerCloseSelector,
  dialogTriggerOpenId,
  dialogTriggerOpenSelector,
} from '../../testing/selectors';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const wrap = (element: JSXElement) => <FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>;

const ContractSurface = ({ long = false, modalType }: { long?: boolean; modalType?: DialogProps['modalType'] }) => (
  <DialogSurface id="contract-surface" backdrop={modalType === 'non-modal' ? undefined : { id: 'contract-backdrop' }}>
    <DialogBody>
      <DialogTitle action={null}>Contract dialog</DialogTitle>
      <div>
        <label htmlFor="contract-input">Draft</label>
        <input id="contract-input" defaultValue="initial" />
      </div>
      <DialogContent id="contract-content">
        Dialog content
        {long && Array.from({ length: 80 }, (_, i) => <p key={i}>Scrollable dialog paragraph {i}</p>)}
      </DialogContent>
      <DialogActions>
        <DialogTrigger disableButtonEnhancement>
          <Button id="contract-close">Close contract</Button>
        </DialogTrigger>
        <Button id="contract-last">Last action</Button>
      </DialogActions>
    </DialogBody>
  </DialogSurface>
);

const ContractDialog = ({ long, ...props }: Omit<DialogProps, 'children'> & { long?: boolean }) => (
  <Dialog {...props}>
    <DialogTrigger disableButtonEnhancement>
      <Button id="contract-open">Open contract</Button>
    </DialogTrigger>
    <ContractSurface long={long} modalType={props.modalType} />
  </Dialog>
);

describe('Dialog documented browser contracts', () => {
  afterEach(() =>
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    ),
  );
  it('controls opening and closing through callback event data', () => {
    const changed = cy.stub().as('controlledChange');
    const Controlled = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <ContractDialog
          open={open}
          onOpenChange={(event, data) => {
            changed(event, data);
            setOpen(data.open);
          }}
        />
      );
    };
    mount(<Controlled />);
    cy.get('#contract-open').realClick();
    cy.get('#contract-input').should('be.focused');
    cy.get('#contract-close').realClick();
    cy.get('#contract-surface').should('not.exist');
    cy.get('#contract-open').should('be.focused');
    cy.then(() => {
      expect(changed.getCalls().map(call => [call.args[1].type, call.args[1].open])).to.deep.equal([
        ['triggerClick', true],
        ['triggerClick', false],
      ]);
      changed.getCalls().forEach(call => expect(call.args[0]).to.equal(call.args[1].event));
    });
  });

  it('supports a forwarding custom trigger and restores its native focus', () => {
    const triggerRef = React.createRef<HTMLButtonElement>();
    const Custom = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>((props, ref) => (
      <Button {...props} ref={ref}>
        Custom trigger
      </Button>
    ));
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Custom id="custom-trigger" ref={triggerRef} />
        </DialogTrigger>
        <ContractSurface />
      </Dialog>,
    );
    cy.get('#custom-trigger').realClick();
    cy.get('#contract-input').should('be.focused');
    cy.get('#contract-close').realClick();
    cy.get('#custom-trigger')
      .should('be.focused')
      .then($trigger => expect(triggerRef.current).to.equal($trigger[0]));
  });

  it('supports a single surface with an external controlled restore-focus target', () => {
    const External = () => {
      const [open, setOpen] = React.useState(false);
      const restore = useRestoreFocusTarget();
      return (
        <>
          <Button id="external-open" {...restore} onClick={() => setOpen(true)}>
            External trigger
          </Button>
          <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
            <ContractSurface />
          </Dialog>
        </>
      );
    };
    mount(<External />);
    cy.get('#external-open').realClick();
    cy.get('#contract-input').should('be.focused').realPress('Escape');
    cy.get('#contract-surface').should('not.exist');
    cy.get('#external-open').should('be.focused');
  });

  it('computes confirmation naming and description and focuses the first action', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id="confirmation-open">Delete file</Button>
        </DialogTrigger>
        <DialogSurface aria-labelledby="confirmation-title" aria-describedby="confirmation-content">
          <DialogBody>
            <DialogTitle id="confirmation-title">Delete the draft?</DialogTitle>
            <DialogContent id="confirmation-content">This action is permanent.</DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id="confirm-delete">Delete</Button>
              </DialogTrigger>
              <DialogTrigger disableButtonEnhancement>
                <Button>Cancel</Button>
              </DialogTrigger>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#confirmation-open').realClick();
    cy.get('body').should($body => {
      expect(
        getByRole($body[0], 'dialog', {
          name: 'Delete the draft?',
          description: 'This action is permanent.',
        }),
      ).to.exist;
    });
    cy.get('#confirm-delete').should('be.focused').realClick();
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('#confirmation-open').should('be.focused');
  });

  for (const modalType of ['modal', 'alert'] as const) {
    it(`implements documented ${modalType} backdrop dismissal policy`, () => {
      const changed = cy.stub().as('backdropChange');
      mount(<ContractDialog modalType={modalType} onOpenChange={changed} />);
      cy.get('#contract-open').realClick();
      cy.get('#contract-backdrop').realClick({ position: 'topLeft' });
      if (modalType === 'modal') {
        cy.get('#contract-surface').should('not.exist');
        cy.get('@backdropChange').should('have.been.calledTwice');
        cy.then(() => expect(changed.lastCall.args[1]).to.include({ type: 'backdropClick', open: false }));
      } else {
        cy.get('#contract-surface').should('be.visible').and('have.attr', 'role', 'alertdialog');
        cy.get('@backdropChange').should('have.been.calledOnce');
        cy.get('#contract-close').realClick();
        cy.get('#contract-surface').should('not.exist');
      }
    });
  }

  it('keeps non-modal outside interaction and Escape separate from the title close action', () => {
    mount(
      <>
        <Dialog modalType="non-modal">
          <DialogTrigger disableButtonEnhancement>
            <Button id="nonmodal-open">Open nonmodal</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Nonmodal title</DialogTitle>
              <DialogContent>Content</DialogContent>
            </DialogBody>
          </DialogSurface>
        </Dialog>
        <Button id="nonmodal-outside">Outside</Button>
      </>,
    );
    cy.get('#nonmodal-open').realClick();
    cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'false');
    cy.get('.fui-DialogSurface__backdrop').should('not.exist');
    cy.get('#nonmodal-outside').realClick().should('be.focused').realPress('Escape');
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('body').then($body => cy.wrap(getByRole($body[0], 'button', { name: 'close' })).realClick());
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('#nonmodal-open').should('be.focused');
  });

  for (const unmountOnClose of [true, false]) {
    it(`${unmountOnClose ? 'resets' : 'preserves'} input state and scroll position across close and reopen`, () => {
      let content: HTMLElement;
      let scrollTop: number;
      mount(<ContractDialog unmountOnClose={unmountOnClose} long />);
      if (!unmountOnClose) {
        cy.get('#contract-surface').should('not.be.visible').and('have.attr', 'aria-hidden', 'true');
        cy.get('body').should($body => expect(queryByRole($body[0], 'dialog')).to.equal(null));
      }
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').clear().type('saved draft');
      cy.get('#contract-content')
        .should($content => {
          expect($content[0].scrollHeight).to.be.greaterThan($content[0].clientHeight);
        })
        .scrollTo('bottom')
        .then($content => {
          content = $content[0];
          scrollTop = content.scrollTop;
          expect(scrollTop).to.be.greaterThan(0);
        });
      cy.get('#contract-close').realClick();
      if (unmountOnClose) {
        cy.get('#contract-surface').should('not.exist');
      } else {
        cy.get('#contract-surface').should('not.be.visible').and('have.attr', 'aria-hidden', 'true');
      }
      cy.get('#contract-open').should('be.focused');
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').should('have.value', unmountOnClose ? 'initial' : 'saved draft');
      cy.get('#contract-content').then($content => {
        expect($content[0] === content).to.equal(!unmountOnClose);
        expect($content[0].scrollTop).to.equal(unmountOnClose ? 0 : scrollTop);
      });
    });
  }

  it('validates native form input before successful controlled submission closes the dialog', () => {
    const submit = cy.stub().as('formSubmit');
    const Form = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
          <DialogTrigger disableButtonEnhancement>
            <Button id="form-open">Open form</Button>
          </DialogTrigger>
          <DialogSurface aria-describedby={undefined}>
            <form
              onSubmit={event => {
                event.preventDefault();
                submit();
                setOpen(false);
              }}
            >
              <DialogBody>
                <DialogTitle>Validated form</DialogTitle>
                <DialogContent>
                  <label htmlFor="form-email">Email</label>
                  <input id="form-email" required type="email" />
                </DialogContent>
                <DialogActions>
                  <Button id="form-submit" type="submit">
                    Submit
                  </Button>
                  <DialogTrigger disableButtonEnhancement>
                    <Button id="form-cancel">Cancel</Button>
                  </DialogTrigger>
                </DialogActions>
              </DialogBody>
            </form>
          </DialogSurface>
        </Dialog>
      );
    };
    mount(<Form />);
    cy.get('#form-open').realClick();
    cy.get('#form-email').should('be.focused');
    cy.get('[role="dialog"]').should('not.have.attr', 'aria-describedby');
    cy.get('#form-submit').realClick();
    cy.get('@formSubmit').should('not.have.been.called');
    cy.get('#form-email').should('be.focused').type('not-an-email');
    cy.get('#form-submit').realClick();
    cy.get('@formSubmit').should('not.have.been.called');
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('#form-email').clear().type('draft@example.com');
    cy.get('#form-submit').realClick();
    cy.get('@formSubmit').should('have.been.calledOnce');
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('#form-open').should('be.focused');
    cy.get('#form-open').realClick();
    cy.get('#form-cancel').realClick();
    cy.get('@formSubmit').should('have.been.calledOnce');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('closes a no-focusable composition with native Escape and backdrop', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id="empty-open">Open empty</Button>
        </DialogTrigger>
        <DialogSurface id="empty-surface" backdrop={{ id: 'empty-backdrop' }}>
          <DialogBody>
            <DialogTitle>Loading dialog</DialogTitle>
            <DialogContent>Loading</DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#empty-open').realClick();
    cy.get('#empty-surface').should('be.focused').realPress('Escape');
    cy.get('#empty-surface').should('not.exist');
    cy.get('#empty-open').should('be.focused').realClick();
    cy.get('#empty-backdrop').realClick({ position: 'topLeft' });
    cy.get('#empty-surface').should('not.exist');
  });

  it('retains outer focus and scroll lock when native Escape dismisses only the inner dialog', () => {
    mount(
      <>
        <Dialog>
          <DialogTrigger disableButtonEnhancement>
            <Button id="outer-open">Open outer</Button>
          </DialogTrigger>
          <DialogSurface id="outer-surface">
            <DialogBody>
              <DialogTitle>Outer</DialogTitle>
              <Dialog>
                <DialogTrigger disableButtonEnhancement>
                  <Button id="inner-open">Open inner</Button>
                </DialogTrigger>
                <DialogSurface id="inner-surface">
                  <DialogBody>
                    <DialogTitle>Inner</DialogTitle>
                    <DialogTrigger disableButtonEnhancement>
                      <Button id="inner-close">Close inner</Button>
                    </DialogTrigger>
                  </DialogBody>
                </DialogSurface>
              </Dialog>
              <DialogTrigger disableButtonEnhancement>
                <Button id="outer-close">Close outer</Button>
              </DialogTrigger>
            </DialogBody>
          </DialogSurface>
        </Dialog>
        {Array.from({ length: 100 }, (_, i) => (
          <p key={i}>Page paragraph {i}</p>
        ))}
      </>,
    );
    cy.get('#outer-open').realClick();
    cy.get('html').should('have.css', 'overflow', 'visible clip');
    cy.get('#inner-open').realClick();
    cy.get('#inner-close').should('be.focused').realPress('Escape');
    cy.get('#inner-surface').should('not.exist');
    cy.get('#outer-surface').should('be.visible');
    cy.get('#inner-open').should('be.focused');
    cy.get('html').should('have.css', 'overflow', 'visible clip');
    cy.get('#inner-open').realPress('Escape');
    cy.get('#outer-surface').should('not.exist');
    cy.get('html').should('not.have.css', 'overflow', 'visible clip');
    cy.get('#outer-open').should('be.focused');
  });

  for (const reduced of [false, true]) {
    it(`runs custom surface motion parameters through enter and exit callbacks with reduced motion=${reduced}`, () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] },
        }),
      );
      const start = cy.stub().as('motionStart');
      const finish = cy.stub().as('motionFinish');
      mount(
        <ContractDialog
          surfaceMotion={{
            duration: 180,
            outScale: 0.6,
            easing: 'linear',
            animateOpacity: false,
            onMotionStart: start,
            onMotionFinish: finish,
          }}
        />,
      );
      cy.get('#contract-open').realClick();
      cy.get('@motionFinish').should('have.been.called');
      cy.get('#contract-surface')
        .should('be.visible')
        .and($surface => {
          expect($surface[0].getAnimations().some(animation => animation.playState === 'running')).to.equal(false);
          const animations = $surface[0].getAnimations();
          expect(animations).to.have.length(1);
          const effect = animations[0].effect as KeyframeEffect;
          expect(effect.getKeyframes().map(frame => frame.scale)).to.deep.equal(['0.6', '1']);
          expect(effect.getTiming()).to.include({ duration: reduced ? 1 : 180, easing: 'linear' });
        });
      cy.get('#contract-close').realClick();
      cy.get('#contract-surface').should('not.exist');
      cy.then(() => {
        expect(start.getCalls().map(call => call.args[1].direction)).to.deep.equal(['enter', 'exit']);
        expect(finish.getCalls().map(call => call.args[1].direction)).to.deep.equal(['enter', 'exit']);
      });
    });
  }
});

describe('Dialog supported edges and accessibility', () => {
  for (const defaultOpen of [false, true]) {
    it(`initializes defaultOpen=${defaultOpen} once and ignores later default changes`, () => {
      let updateDefault: (next: boolean) => void;
      const Defaults = () => {
        const [value, setValue] = React.useState(defaultOpen);
        updateDefault = setValue;
        return (
          <>
            <output id="default-value">{String(value)}</output>
            <ContractDialog defaultOpen={value} />
          </>
        );
      };
      mount(<Defaults />);
      cy.get('#default-value').should('have.text', String(defaultOpen));
      cy.get('#contract-surface').should(defaultOpen ? 'be.visible' : 'not.exist');
      cy.then(() => updateDefault(!defaultOpen));
      cy.get('#default-value').should('have.text', String(!defaultOpen));
      cy.get('#contract-surface').should(defaultOpen ? 'be.visible' : 'not.exist');
      cy.get(defaultOpen ? '#contract-close' : '#contract-open').realClick();
      cy.get('#contract-surface').should(defaultOpen ? 'not.exist' : 'be.visible');
    });
  }

  it('leaves controlled requests to the owner and applies external open updates without notifications', () => {
    const changed = cy.stub().as('ownerChange');
    mount(<ContractDialog open={false} onOpenChange={changed} />).then(({ rerender }) => {
      cy.get('#contract-open').realClick();
      cy.get('@ownerChange').should('have.been.calledOnce');
      cy.get('#contract-surface').should('not.exist');
      cy.then(() => rerender(wrap(<ContractDialog open onOpenChange={changed} />)));
      cy.get('#contract-input').should('be.focused');
      cy.get('@ownerChange').should('have.been.calledOnce');
      cy.get('#contract-close').realClick();
      cy.get('@ownerChange').should('have.been.calledTwice');
      cy.get('#contract-surface').should('be.visible');
      cy.then(() => rerender(wrap(<ContractDialog open={false} onOpenChange={changed} />)));
      cy.get('#contract-surface').should('not.exist');
      cy.get('@ownerChange').should('have.been.calledTwice');
    });
  });

  for (const type of ['triggerClick', 'escapeKeyDown', 'backdropClick'] as const) {
    it(`allows onOpenChange to veto ${type} closing and then permits a later request`, () => {
      let veto = true;
      const changed = cy.stub().as('vetoChange');
      mount(
        <ContractDialog
          defaultOpen
          onOpenChange={(event, data) => {
            changed(event, data);
            if (veto) {
              event.preventDefault();
            }
          }}
        />,
      );
      const requestClose = () => {
        if (type === 'triggerClick') {
          cy.get('#contract-close').realClick();
        } else if (type === 'escapeKeyDown') {
          cy.get('#contract-input').focus().realPress('Escape');
        } else {
          cy.get('#contract-backdrop').realClick({ position: 'topLeft' });
        }
      };
      requestClose();
      cy.get('@vetoChange').should('have.been.calledOnce');
      cy.get('#contract-surface').should('be.visible');
      cy.then(() => {
        const [event, data] = changed.firstCall.args;
        expect(data).to.include({ type, open: false });
        expect(data.event).to.equal(event);
        expect(event.isDefaultPrevented()).to.equal(true);
        expect(event.type).to.equal(type === 'escapeKeyDown' ? 'keydown' : 'click');
        if (type === 'escapeKeyDown') {
          expect(event.key).to.equal('Escape');
        }
        veto = false;
      });
      requestClose();
      cy.get('#contract-surface').should('not.exist');
      cy.get('@vetoChange').should('have.been.calledTwice');
    });
  }

  it('allows onOpenChange to veto opening without losing a subsequent trigger request', () => {
    let veto = true;
    const changed = cy.stub().as('vetoOpen');
    mount(
      <ContractDialog
        onOpenChange={(event, data) => {
          changed(event, data);
          if (veto) {
            event.preventDefault();
          }
        }}
      />,
    );
    cy.get('#contract-open').realClick();
    cy.get('@vetoOpen').should('have.been.calledOnce');
    cy.get('#contract-surface').should('not.exist');
    cy.then(() => {
      expect(changed.firstCall.args[1]).to.include({ type: 'triggerClick', open: true });
      veto = false;
    });
    cy.get('#contract-open').realClick();
    cy.get('#contract-input').should('be.focused');
    cy.get('@vetoOpen').should('have.been.calledTwice');
  });

  it('honors child click, surface keydown and backdrop preventDefault before notifying Dialog', () => {
    let veto = true;
    const changed = cy.stub().as('compositionChange');
    const child = cy.stub().as('childClick');
    const key = cy.stub().as('surfaceKey');
    const backdrop = cy.stub().as('backdropClick');
    mount(
      <Dialog onOpenChange={changed}>
        <DialogTrigger disableButtonEnhancement>
          <Button
            id="veto-trigger"
            onClick={event => {
              child();
              if (veto) {
                event.preventDefault();
              }
            }}
          >
            Open
          </Button>
        </DialogTrigger>
        <DialogSurface
          id="veto-surface"
          onKeyDown={event => {
            key();
            if (veto) {
              event.preventDefault();
            }
          }}
          backdrop={{
            id: 'veto-backdrop',
            onClick: event => {
              backdrop();
              if (veto) {
                event.preventDefault();
              }
            },
          }}
        >
          <DialogTitle>Veto surface</DialogTitle>
          <Button id="veto-inside">Inside</Button>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#veto-trigger').realClick();
    cy.get('@childClick').should('have.been.calledOnce');
    cy.get('@compositionChange').should('not.have.been.called');
    cy.get('#veto-surface').should('not.exist');
    cy.then(() => {
      veto = false;
    });
    cy.get('#veto-trigger').realClick();
    cy.get('#veto-inside').should('be.focused');
    cy.then(() => {
      veto = true;
    });
    cy.get('#veto-inside').realPress('Escape');
    cy.get('@surfaceKey').should('have.been.calledOnce');
    cy.get('#veto-backdrop').realClick({ position: 'topLeft' });
    cy.get('@backdropClick').should('have.been.calledOnce');
    cy.get('@compositionChange').should('have.been.calledOnce');
    cy.get('#veto-surface').should('be.visible');
    cy.then(() => {
      veto = false;
    });
    cy.get('#veto-backdrop').realClick({ position: 'topLeft' });
    cy.get('#veto-surface').should('not.exist');
    cy.get('@compositionChange').should('have.been.calledTwice');
  });

  it('uses the latest onOpenChange for trigger, Escape and backdrop requests after rerenders', () => {
    const initial = cy.stub().as('initialHandler');
    const latest = cy.stub().as('latestHandler');
    mount(<ContractDialog onOpenChange={initial} />).then(({ rerender }) => {
      cy.then(() => rerender(wrap(<ContractDialog onOpenChange={latest} />)));
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').should('be.focused').realPress('Escape');
      cy.get('#contract-surface').should('not.exist');
      cy.get('#contract-open').realClick();
      cy.get('#contract-backdrop').realClick({ position: 'topLeft' });
      cy.get('#contract-surface').should('not.exist');
      cy.get('@initialHandler').should('not.have.been.called');
      cy.then(() =>
        expect(latest.getCalls().map(call => call.args[1].type)).to.deep.equal([
          'triggerClick',
          'escapeKeyDown',
          'triggerClick',
          'backdropClick',
        ]),
      );
    });
  });

  for (const modalType of ['modal', 'non-modal', 'alert'] as const) {
    it(`computes ${modalType} semantics, default title naming and portal ownership`, () => {
      mount(<ContractDialog modalType={modalType} />);
      cy.get('#contract-open').realClick();
      cy.get('body').should($body => {
        const surface = getByRole($body[0], modalType === 'alert' ? 'alertdialog' : 'dialog', {
          name: 'Contract dialog',
        });
        expect(surface.getAttribute('aria-modal')).to.equal(String(modalType !== 'non-modal'));
        expect(surface.closest('[data-cy-root]')).to.equal(null);
        expect(surface.ownerDocument).to.equal($body[0].ownerDocument);
      });
      cy.get('#contract-close').realClick();
      cy.get('#contract-surface').should('not.exist');
    });
  }

  it('supports accessible label override without a title and custom description', () => {
    mount(
      <Dialog defaultOpen>
        <DialogSurface aria-label="Explicit dialog name" aria-describedby="explicit-description">
          <p id="explicit-description">Explicit short description</p>
          <Button>Action</Button>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('body').should($body => {
      expect(
        getByRole($body[0], 'dialog', {
          name: 'Explicit dialog name',
          description: 'Explicit short description',
        }),
      ).to.exist;
    });
    cy.get('[role="dialog"]').should('not.have.attr', 'aria-labelledby');
  });

  it('supports the documented aria-modal override for a portaled popup composition', () => {
    mount(
      <Dialog defaultOpen>
        <DialogSurface aria-modal={false}>
          <DialogTitle>Popup composition</DialogTitle>
          <Popover>
            <PopoverTrigger disableButtonEnhancement>
              <Button id="a11y-popover-open">Open popup</Button>
            </PopoverTrigger>
            <PopoverSurface aria-label="Dialog popup">
              <Button id="a11y-popup-action">Popup action</Button>
            </PopoverSurface>
          </Popover>
          <DialogTrigger disableButtonEnhancement>
            <Button id="a11y-popup-close">Close dialog</Button>
          </DialogTrigger>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'false');
    cy.get('#a11y-popover-open').realClick();
    cy.get('#a11y-popup-action').should('be.visible').focus().realPress('Escape');
    cy.get('#a11y-popup-action').should('not.exist');
    cy.get('#a11y-popover-open').should('be.focused');
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('#a11y-popup-close').realClick();
    cy.get('[role="dialog"]').should('not.exist');
  });

  for (const modalType of ['modal', 'alert'] as const) {
    it(`traps native reverse Tab for ${modalType} and restores focus after Escape`, () => {
      mount(<ContractDialog modalType={modalType} />);
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').should('be.focused').realPress(['Shift', 'Tab']);
      cy.get('#contract-last').should('be.focused').realPress('Tab');
      cy.get('#contract-input').should('be.focused').realPress('Escape');
      cy.get('#contract-surface').should('not.exist');
      cy.get('#contract-open').should('be.focused');
    });

    it(`prevents outside focus with inertTrapFocus for ${modalType} and releases it on close`, () => {
      mount(
        <>
          <ContractDialog modalType={modalType} inertTrapFocus />
          <Button id="inert-outside">Outside</Button>
        </>,
      );
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').should('be.focused');
      cy.get('#inert-outside').focus();
      cy.get('#inert-outside').should('not.be.focused');
      cy.get('#contract-close').realClick();
      cy.get('#contract-surface').should('not.exist');
      cy.get('#inert-outside').realClick().should('be.focused');
    });
  }

  it('allows native non-modal Tab to leave and return without dismissing', () => {
    mount(
      <>
        <ContractDialog modalType="non-modal" />
        <Button id="tab-outside">Outside</Button>
      </>,
    );
    cy.get('#contract-open').realClick();
    cy.get('#contract-last').focus().realPress('Tab');
    cy.get('#contract-surface').should('be.visible');
    cy.get('#contract-surface').should($surface => {
      expect($surface[0].contains($surface[0].ownerDocument.activeElement)).to.equal(false);
    });
    cy.get('#tab-outside').realClick().realPress('Escape');
    cy.get('#contract-surface').should('be.visible');
    cy.get('#contract-input').realClick().realPress('Escape');
    cy.get('#contract-surface').should('not.exist');
  });

  it('updates live modalType semantics, backdrop and scroll policy without changing open state', () => {
    const changed = cy.stub().as('modeChange');
    const render = (modalType: DialogProps['modalType']) => (
      <>
        <ContractDialog open modalType={modalType} onOpenChange={changed} />
        {Array.from({ length: 100 }, (_, i) => (
          <p key={i}>Scrollable page {i}</p>
        ))}
      </>
    );
    mount(render('modal')).then(({ rerender }) => {
      cy.get('html').should('have.css', 'overflow', 'visible clip');
      cy.then(() => rerender(wrap(render('non-modal'))));
      cy.get('#contract-surface').should('be.visible').and('have.attr', 'aria-modal', 'false');
      cy.get('#contract-backdrop').should('not.exist');
      cy.get('html').should('not.have.css', 'overflow', 'visible clip');
      cy.then(() => rerender(wrap(render('alert'))));
      cy.get('#contract-surface').should('have.attr', 'role', 'alertdialog').and('have.attr', 'aria-modal', 'true');
      cy.get('html').should('have.css', 'overflow', 'visible clip');
      cy.get('#contract-backdrop').realClick({ position: 'topLeft' });
      cy.get('@modeChange').should('not.have.been.called');
      cy.get('#contract-surface').should('be.visible');
    });
  });

  it('enhances a native non-button trigger for keyboard activation and preserves disabled semantics', () => {
    const render = (disabled: boolean) => (
      <Dialog>
        <DialogTrigger>
          <div id="enhanced-trigger" aria-disabled={disabled}>
            Enhanced trigger
          </div>
        </DialogTrigger>
        <ContractSurface />
      </Dialog>
    );
    mount(render(true)).then(({ rerender }) => {
      cy.get('#enhanced-trigger').should('have.attr', 'role', 'button').focus().realPress('Enter');
      cy.get('#contract-surface').should('not.exist');
      cy.then(() => rerender(wrap(render(false))));
      cy.get('#enhanced-trigger').focus().realPress('Space');
      cy.get('#contract-input').should('be.focused');
      cy.get('#contract-close').realClick();
      cy.get('#enhanced-trigger').should('be.focused').realPress('Enter');
      cy.get('#contract-surface').should('be.visible');
    });
  });

  it('releases a StrictMode modal scroll lock on unmount and does not duplicate native change requests', () => {
    const changed = cy.stub().as('strictChange');
    mount(
      <React.StrictMode>
        <ContractDialog onOpenChange={changed} />
        {Array.from({ length: 100 }, (_, i) => (
          <p key={i}>StrictMode page {i}</p>
        ))}
      </React.StrictMode>,
    ).then(({ rerender }) => {
      cy.get('#contract-open').realClick();
      cy.get('@strictChange').should('have.been.calledOnce');
      cy.get('html').should('have.css', 'overflow', 'visible clip');
      cy.get('#contract-input').should('be.focused').realPress('Escape');
      cy.get('#contract-surface').should('not.exist');
      cy.get('@strictChange').should('have.been.calledTwice');
      cy.get('html').should('not.have.css', 'overflow', 'visible clip');
      cy.get('#contract-open').realClick();
      cy.get('html').should('have.css', 'overflow', 'visible clip');
      cy.then(() => rerender(wrap(<Button id="after-unmount">After unmount</Button>)));
      cy.get('#contract-surface').should('not.exist');
      cy.get('html').should('not.have.css', 'overflow', 'visible clip');
      cy.get('#after-unmount').realClick().should('be.focused');
      cy.get('@strictChange').should('have.been.calledThrice');
    });
  });
});

describe('Dialog meaningful unit-derived browser contracts', () => {
  for (const initialUnmount of [true, false]) {
    it(`applies a live unmountOnClose change from ${initialUnmount} without remounting open content`, () => {
      let change: () => void;
      const Persistence = () => {
        const [unmountOnClose, setUnmount] = React.useState(initialUnmount);
        change = () => setUnmount(value => !value);
        return (
          <>
            <output id="persistence-setting">{String(unmountOnClose)}</output>
            <ContractDialog unmountOnClose={unmountOnClose} />
          </>
        );
      };
      mount(<Persistence />);
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').type(' changed');
      let input: HTMLElement;
      cy.get('#contract-input').then($input => {
        input = $input[0];
      });
      cy.get('#contract-last').realClick().should('be.focused');
      cy.then(() => change());
      cy.get('#persistence-setting').should('have.text', String(!initialUnmount));
      cy.get('#contract-last').should('be.focused');
      cy.get('#contract-input')
        .should('have.value', 'initial changed')
        .then($input => expect($input[0]).to.equal(input));
      cy.get('#contract-close').realClick();
      cy.get('#contract-surface').should(initialUnmount ? 'not.be.visible' : 'not.exist');
      cy.get('#contract-open').should('be.focused');
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').should('have.value', initialUnmount ? 'initial changed' : 'initial');
    });
  }

  for (const initialUnmount of [true, false]) {
    it(`preserves non-modal outside focus when unmountOnClose changes from ${initialUnmount}`, () => {
      let change: () => void;
      const Persistence = () => {
        const [unmountOnClose, setUnmount] = React.useState(initialUnmount);
        change = () => setUnmount(value => !value);
        return (
          <>
            <output id="outside-persistence-setting">{String(unmountOnClose)}</output>
            <ContractDialog modalType="non-modal" unmountOnClose={unmountOnClose} />
            <Button id="persistence-outside">Outside target</Button>
          </>
        );
      };
      mount(<Persistence />);
      cy.get('#contract-open').realClick();
      cy.get('#contract-input').should('be.focused');
      cy.get('#persistence-outside').realClick().should('be.focused');
      cy.then(() => change());
      cy.get('#outside-persistence-setting').should('have.text', String(!initialUnmount));
      cy.get('#persistence-outside').should('be.focused');
      cy.get('#contract-surface').should('be.visible');
    });
  }

  it('does not steal outside focus when a retained non-modal dialog is externally closed', () => {
    let close: () => void;
    const RetainedNonModal = () => {
      const [open, setOpen] = React.useState(false);
      close = () => setOpen(false);
      return (
        <>
          <ContractDialog
            open={open}
            unmountOnClose={false}
            modalType="non-modal"
            onOpenChange={(_, data) => setOpen(data.open)}
          />
          <Button id="retained-outside">Outside target</Button>
        </>
      );
    };
    mount(<RetainedNonModal />);
    cy.get('#contract-open').realClick();
    cy.get('#contract-input').should('be.focused');
    cy.get('#retained-outside').realClick().should('be.focused');
    cy.then(() => close());
    cy.get('#contract-surface').should('not.be.visible');
    cy.get('#retained-outside').should('be.focused');
  });

  it('honors explicit trigger actions rather than their placement in the composition', () => {
    const changed = cy.stub().as('explicitActions');
    mount(
      <Dialog onOpenChange={changed}>
        <div>
          <DialogTrigger action="close" disableButtonEnhancement>
            <Button id="outside-close">Outside close</Button>
          </DialogTrigger>
          <DialogTrigger action="open" disableButtonEnhancement>
            <Button id="outside-open">Outside open</Button>
          </DialogTrigger>
        </div>
        <DialogSurface id="explicit-surface">
          <DialogTitle>Explicit actions</DialogTitle>
          <DialogTrigger action="open" disableButtonEnhancement>
            <Button id="inside-open">Inside open</Button>
          </DialogTrigger>
          <DialogTrigger action="close" disableButtonEnhancement>
            <Button id="inside-close">Inside close</Button>
          </DialogTrigger>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#outside-close').realClick();
    cy.get('#explicit-surface').should('not.exist');
    cy.get('#outside-open').realClick();
    cy.get('#inside-open').should('be.focused').realClick();
    cy.get('#explicit-surface').should('be.visible');
    cy.get('#inside-close').realClick();
    cy.get('#explicit-surface').should('not.exist');
    cy.then(() => expect(changed.getCalls().map(call => call.args[1].open)).to.deep.equal([false, true, true, false]));
  });

  it('retains content across live motion parameter updates and restores focus after closing', () => {
    let updateMotion: () => void;
    const MotionChange = () => {
      const [updated, setUpdated] = React.useState(false);
      updateMotion = () => setUpdated(true);
      return (
        <>
          <output id="motion-setting">{String(updated)}</output>
          <ContractDialog
            unmountOnClose={false}
            surfaceMotion={updated ? { duration: 120, outScale: 0.4, easing: 'linear' } : { duration: 0 }}
          />
        </>
      );
    };
    mount(<MotionChange />);
    cy.get('#contract-open').realClick();
    cy.get('#contract-input').should('be.focused').type(' retained');
    let input: HTMLElement;
    cy.get('#contract-input').then($input => {
      input = $input[0];
    });
    cy.then(() => updateMotion());
    cy.get('#motion-setting').should('have.text', 'true');
    cy.get('#contract-input').then($input => expect($input[0]).to.equal(input));
    cy.get('#contract-close').realClick();
    cy.get('#contract-surface').should('not.be.visible');
    cy.get('#contract-open').should('be.focused').realClick();
    cy.get('#contract-input').should('have.value', 'initial retained').and('be.focused');
  });

  it('opens and closes through a custom forwarding surface while preserving DOM ref and visibility', () => {
    const surfaceRef = React.createRef<HTMLDivElement>();
    const CustomSurface = React.forwardRef<HTMLDivElement, DialogSurfaceProps>((props, ref) => (
      <DialogSurface {...props} ref={ref} className="caller-surface" />
    ));
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id="forward-open">Open custom surface</Button>
        </DialogTrigger>
        <CustomSurface id="forward-surface" ref={surfaceRef}>
          <DialogTitle>Custom surface title</DialogTitle>
          <p id="forward-content">Custom surface content</p>
          <DialogTrigger disableButtonEnhancement>
            <Button id="forward-close">Close custom surface</Button>
          </DialogTrigger>
        </CustomSurface>
      </Dialog>,
    );
    cy.get('#forward-open').should('be.visible');
    cy.get('#forward-content').should('not.exist');
    cy.get('#forward-open').realClick();
    cy.get('#forward-content').should('be.visible');
    cy.get('#forward-surface')
      .should('have.class', 'caller-surface')
      .then($surface => {
        expect(surfaceRef.current).to.equal($surface[0]);
      });
    cy.get('#forward-close').should('be.focused').realClick();
    cy.get('#forward-content').should('not.exist');
    cy.then(() => expect(surfaceRef.current).to.equal(null));
    cy.get('#forward-open').should('be.focused');
  });

  for (const unmountOnClose of [true, false]) {
    it(`keeps state, focus and DOM lifecycle coherent with surfaceMotion=null and unmountOnClose=${unmountOnClose}`, () => {
      mount(
        <Dialog surfaceMotion={null} unmountOnClose={unmountOnClose}>
          <DialogTrigger disableButtonEnhancement>
            <Button id="null-motion-open">Open without motion</Button>
          </DialogTrigger>
          <DialogSurface id="null-motion-surface" backdropMotion={{ duration: 0 }}>
            <DialogTitle>Motion disabled</DialogTitle>
            <input id="null-motion-input" defaultValue="initial" />
            <DialogTrigger disableButtonEnhancement>
              <Button id="null-motion-close">Close without motion</Button>
            </DialogTrigger>
          </DialogSurface>
        </Dialog>,
      );
      cy.get('#null-motion-open').should('be.visible');
      cy.get('#null-motion-surface').should(unmountOnClose ? 'not.exist' : 'not.be.visible');
      cy.get('#null-motion-open').realClick();
      cy.get('#null-motion-input').should('be.focused').clear().type('edited');
      cy.get('#null-motion-surface').should($surface => expect($surface[0].getAnimations()).to.have.length(0));
      cy.get('#null-motion-close').realClick();
      cy.get('#null-motion-surface').should(unmountOnClose ? 'not.exist' : 'not.be.visible');
      cy.get('#null-motion-open').should('be.focused').realClick();
      cy.get('#null-motion-input')
        .should('have.value', unmountOnClose ? 'initial' : 'edited')
        .and('be.focused');
      cy.get('#null-motion-input').realPress('Escape');
      cy.get('#null-motion-surface').should(unmountOnClose ? 'not.exist' : 'not.be.visible');
    });
  }

  it('replaces surface motion through its render function while forwarding visibility and lifecycle props', () => {
    const rendered = cy.stub();
    const finished = cy.stub().as('replacementFinish');
    mount(
      <ContractDialog
        surfaceMotion={{
          duration: 120,
          onMotionFinish: finished,
          children: (_, props) => {
            rendered({ visible: props.visible, appear: props.appear, unmountOnExit: props.unmountOnExit });
            return (
              <Fade {...props} duration={120}>
                {props.children}
              </Fade>
            );
          },
        }}
      />,
    );
    cy.get('#contract-open').realClick();
    cy.get('#contract-input').should('be.focused');
    cy.get('@replacementFinish').should('have.been.calledOnce');
    cy.get('#contract-surface').should('be.visible');
    cy.get('#contract-close').realClick();
    cy.get('#contract-surface').should('not.exist');
    cy.get('@replacementFinish').should('have.been.calledTwice');
    cy.then(() => {
      const props = rendered.getCalls().map(call => call.args[0]);
      expect(
        props.some(value => value.visible === true && value.appear === true && value.unmountOnExit === true),
      ).to.equal(true);
      expect(props.some(value => value.visible === false && value.unmountOnExit === true)).to.equal(true);
      expect(finished.getCalls().map(call => call.args[1].direction)).to.deep.equal(['enter', 'exit']);
    });
    cy.get('#contract-open').should('be.focused');
  });

  it('focuses the first enabled tabbable control rather than disabled or hidden controls', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id="candidate-open">Open candidates</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogTitle>Focus candidates</DialogTitle>
          <Button disabled id="disabled-candidate">
            Disabled
          </Button>
          <div hidden>
            <Button id="hidden-candidate">Hidden</Button>
          </div>
          <Button tabIndex={-1} id="negative-candidate">
            Programmatic only
          </Button>
          <Button id="first-candidate">First enabled</Button>
          <DialogTrigger disableButtonEnhancement>
            <Button id="candidate-close">Close</Button>
          </DialogTrigger>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#candidate-open').realClick();
    cy.get('#first-candidate').should('be.focused').realPress('Tab');
    cy.get('#candidate-close').should('be.focused').realPress('Escape');
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('#candidate-open').should('be.focused');
  });

  it('supports caller focus after lazily adding the first focusable control', () => {
    let load: () => void;
    const Lazy = () => {
      const [loaded, setLoaded] = React.useState(false);
      const ref = React.useRef<HTMLButtonElement>(null);
      load = () => setLoaded(true);
      React.useEffect(() => {
        if (loaded) {
          ref.current?.focus();
        }
      }, [loaded]);
      return (
        <Dialog>
          <DialogTrigger disableButtonEnhancement>
            <Button id="lazy-open">Open lazy content</Button>
          </DialogTrigger>
          <DialogSurface id="lazy-surface">
            <DialogTitle>Lazy dialog</DialogTitle>
            {loaded ? (
              <DialogTrigger disableButtonEnhancement>
                <Button id="lazy-close" ref={ref}>
                  Loaded close
                </Button>
              </DialogTrigger>
            ) : (
              <p id="lazy-loading">Loading</p>
            )}
          </DialogSurface>
        </Dialog>
      );
    };
    mount(<Lazy />);
    cy.get('#lazy-open').realClick();
    cy.get('#lazy-loading').should('be.visible');
    cy.get('#lazy-surface').should('be.focused');
    cy.then(() => load());
    cy.get('#lazy-close').should('be.focused').realClick();
    cy.get('#lazy-surface').should('not.exist');
    cy.get('#lazy-open').should('be.focused');
  });

  it('preserves independent sibling modal scroll locks until the last open owner closes', () => {
    let setOpen: React.Dispatch<React.SetStateAction<[boolean, boolean]>>;
    const Siblings = () => {
      const [open, update] = React.useState<[boolean, boolean]>([true, true]);
      setOpen = update;
      return (
        <>
          <Dialog open={open[0]}>
            <DialogSurface id="sibling-first">
              <DialogTitle>First sibling</DialogTitle>
              <Button>First action</Button>
            </DialogSurface>
          </Dialog>
          <Dialog open={open[1]}>
            <DialogSurface id="sibling-second">
              <DialogTitle>Second sibling</DialogTitle>
              <Button>Second action</Button>
            </DialogSurface>
          </Dialog>
          {Array.from({ length: 100 }, (_, i) => (
            <p key={i}>Sibling page {i}</p>
          ))}
        </>
      );
    };
    mount(<Siblings />);
    cy.get('#sibling-first').should('exist').and('have.attr', 'aria-modal', 'true');
    cy.get('#sibling-second').should('be.visible');
    cy.get('html').should('have.css', 'overflow', 'visible clip');
    cy.then(() => setOpen([false, true]));
    cy.get('#sibling-first').should('not.exist');
    cy.get('#sibling-second').should('be.visible');
    cy.get('html').should('have.css', 'overflow', 'visible clip');
    cy.then(() => setOpen([false, false]));
    cy.get('#sibling-second').should('not.exist');
    cy.get('html').should('not.have.css', 'overflow', 'visible clip');
  });

  it('keeps long content scrollable within the viewport with visible title and actions', () => {
    mount(<ContractDialog long />);
    cy.get('#contract-open').realClick();
    cy.get('#contract-content')
      .should($content => {
        expect($content[0].scrollHeight).to.be.greaterThan($content[0].clientHeight);
      })
      .scrollTo('bottom');
    cy.get('#contract-content').should($content => expect($content[0].scrollTop).to.be.greaterThan(0));
    cy.get('#contract-surface').should($surface => {
      const bounds = $surface[0].getBoundingClientRect();
      expect(bounds.top).to.be.at.least(0);
      expect(bounds.bottom).to.be.at.most($surface[0].ownerDocument.documentElement.clientHeight);
    });
    cy.get('#contract-surface h2').should('be.visible');
    cy.get('#contract-close').should('be.visible').realClick();
    cy.get('#contract-surface').should('not.exist');
  });
});

describe('Dialog', () => {
  it('should be closed by default', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id={dialogTriggerOpenId}>Open dialog</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogContent>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button appearance="primary">Do Something</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get(dialogTriggerOpenSelector).should('exist');
    cy.get(dialogSurfaceSelector).should('not.exist');
  });
  it('should open when trigger is clicked', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id={dialogTriggerOpenId}>Open dialog</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogContent>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button appearance="primary">Do Something</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get(dialogTriggerOpenSelector).realClick();
    cy.get(dialogSurfaceSelector).should('exist');
  });
  it('should focus on first focusabled element when opened', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id={dialogTriggerOpenId}>Open dialog</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogContent>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button appearance="primary">Do Something</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get(dialogTriggerOpenSelector).realClick();
    cy.get(dialogTriggerCloseSelector).should('be.focused');
  });
  it('should focus on dialog surface if no focusable element in dialog', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id={dialogTriggerOpenId}>Open dialog</Button>
        </DialogTrigger>
        <DialogSurface id="dialog-surface">
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogContent>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get(dialogTriggerOpenSelector).realClick();
    cy.get(dialogSurfaceSelector).should('be.focused');
  });
  it('should focus back on trigger when dialog closed', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id={dialogTriggerOpenId}>Open dialog</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogContent>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button appearance="primary">Do Something</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get(dialogTriggerOpenSelector).realClick();
    cy.get(dialogTriggerCloseSelector).realClick();
    cy.get(dialogTriggerOpenSelector).should('be.focused');
  });

  it('should remain mounted after close when unmountOnClose is false', () => {
    mount(
      <Dialog unmountOnClose={false}>
        <DialogTrigger disableButtonEnhancement>
          <Button id={dialogTriggerOpenId}>Open dialog</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogContent>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button appearance="primary">Do Something</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );

    cy.get(dialogTriggerOpenSelector).realClick();
    cy.get(dialogSurfaceSelector).should('exist');

    cy.get(dialogTriggerCloseSelector).realClick();
    // dialog surface should remain mounted when unmountOnClose is false
    cy.get(dialogSurfaceSelector).should('exist');
  });

  it('should allow change of focus on open', () => {
    const CustomFocusedElementOnOpen = () => {
      const buttonRef = React.useRef<HTMLButtonElement>(null);
      const [open, setOpen] = React.useState(false);
      React.useEffect(() => {
        if (open && buttonRef.current) {
          buttonRef.current.focus();
        }
      }, [open]);
      return (
        <Dialog open={open} onOpenChange={(event, data) => setOpen(data.open)}>
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>This dialog focus on the second button instead of the first</DialogContent>
              <DialogActions position="start">
                <Button appearance="outline">Third Action</Button>
              </DialogActions>
              <DialogActions position="end">
                <DialogTrigger disableButtonEnhancement>
                  <Button id={dialogTriggerCloseId} ref={buttonRef} appearance="secondary">
                    Close
                  </Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      );
    };
    mount(<CustomFocusedElementOnOpen />);
    cy.get(dialogTriggerOpenSelector).realClick();
    cy.get(dialogTriggerCloseSelector).should('be.focused');
  });
  it('should not close with Escape keydown while focusing other elements that control Escape', () => {
    mount(
      <Dialog modalType="non-modal">
        <DialogTrigger disableButtonEnhancement>
          <Button id={dialogTriggerOpenId}>Open dialog</Button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogContent>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button id="open-menu-btn">Toggle menu</Button>
                </MenuTrigger>

                <MenuPopover>
                  <MenuList>
                    <MenuItem>Item</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
              <Popover>
                <PopoverTrigger disableButtonEnhancement>
                  <Button id="open-popover-btn">Popover trigger</Button>
                </PopoverTrigger>
                <PopoverSurface aria-label="label">Content</PopoverSurface>
              </Popover>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Tooltip hideDelay={0} showDelay={0} content="Test tooltip" relationship="label">
                  <Button id={dialogTriggerCloseId} appearance="secondary">
                    Close
                  </Button>
                </Tooltip>
              </DialogTrigger>
              <Button appearance="primary">Do Something</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    // Open Menu and then close it with Escape
    cy.get(dialogTriggerOpenSelector).realClick();
    cy.get('#open-menu-btn').realClick();
    cy.focused().realType('{esc}');
    cy.get(dialogSurfaceSelector).should('exist');
    cy.get('#open-menu-btn').should('have.focus');

    // Open Popover and then close it with Escape
    cy.get('#open-popover-btn').realClick();
    cy.focused().realType('{esc}');
    cy.get(dialogSurfaceSelector).should('exist');
    cy.get('#open-popover-btn').should('have.focus');

    // Open Tooltip, wait for the tooltip to appear and then close it with Escape
    cy.get(dialogTriggerCloseSelector).focus().wait(0).realType('{esc}');
    cy.get(dialogSurfaceSelector).should('exist');
  });
  describe('modalType = modal', () => {
    it('should close with escape keydown', () => {
      mount(
        <Dialog modalType="modal">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                natus iure cumque eaque?
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button id={dialogTriggerCloseId} appearance="secondary">
                    Close
                  </Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.focused().realType('{esc}');
      cy.get(dialogSurfaceSelector).should('not.exist');
    });
    it('should lock body scroll when dialog open', () => {
      mount(
        <>
          <Dialog modalType="modal">
            <DialogTrigger disableButtonEnhancement>
              <Button id={dialogTriggerOpenId}>Open dialog</Button>
            </DialogTrigger>
            <DialogSurface>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogBody>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                natus iure cumque eaque?
              </DialogBody>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button id={dialogTriggerCloseId} appearance="secondary">
                    Close
                  </Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogSurface>
          </Dialog>
          {lorem}
        </>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get('html').should('have.css', 'overflow', 'visible clip');
    });

    it('should focus trap by default', () => {
      mount(
        <Dialog modalType="modal">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogBody>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogBody>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button id="do-something-btn" appearance="primary">
                Do Something
              </Button>
            </DialogActions>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogTriggerCloseSelector).should('be.focused').realPress('Tab');
      cy.get('#do-something-btn').should('be.focused').realPress('Tab');
      cy.get(dialogTriggerCloseSelector).should('be.focused');
    });
    it('should focus on window after last element when inertTrapFocus=true', () => {
      mount(
        <Dialog inertTrapFocus modalType="modal">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogBody>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogBody>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button id="do-something-btn" appearance="primary">
                Do Something
              </Button>
            </DialogActions>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogTriggerCloseSelector).should('be.focused').realPress('Tab');
      cy.get('#do-something-btn').should('be.focused').realPress('Tab');
      cy.focused().should('not.exist');
    });
  });
  describe('modalType = non-modal', () => {
    it('should close with escape keydown and return focus to trigger', () => {
      mount(
        <Dialog modalType="non-modal">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                natus iure cumque eaque?
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button id={dialogTriggerCloseId} appearance="secondary">
                    Close
                  </Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.focused().realType('{esc}');
      cy.get(dialogSurfaceSelector).should('not.exist');
      cy.get(dialogTriggerOpenSelector).should('be.focused');
    });
    it('should not lock body scroll when dialog open', () => {
      mount(
        <>
          <Dialog modalType="non-modal">
            <DialogTrigger disableButtonEnhancement>
              <Button id={dialogTriggerOpenId}>Open dialog</Button>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogContent>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                  eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                  natus iure cumque eaque?
                </DialogContent>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button id={dialogTriggerCloseId} appearance="secondary">
                      Close
                    </Button>
                  </DialogTrigger>
                  <Button appearance="primary">Do Something</Button>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
          {lorem}
        </>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get('html').should('not.have.css', 'overflow', 'visible clip');
    });
    it('should be able to focus inside non-modal dialog after navigating outside', () => {
      mount(
        <>
          <Dialog modalType="non-modal">
            <DialogTrigger disableButtonEnhancement>
              <Button id={dialogTriggerOpenId}>Open dialog</Button>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button id={dialogTriggerCloseId} appearance="secondary">
                      Close
                    </Button>
                  </DialogTrigger>
                  <Button id="extra-btn-inside" appearance="primary">
                    Do Something
                  </Button>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
          <Button id="extra-btn-outside">Button outside dialog</Button>
        </>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogTriggerCloseSelector).should('be.focused');
      cy.get('#extra-btn-outside').realClick().should('be.focused');
      cy.get('#extra-btn-inside').realClick().should('be.focused').realType('{esc}');
      cy.get(dialogSurfaceSelector).should('not.exist');
    });
  });
  describe('modalType = alert', () => {
    it('should close with escape keydown', () => {
      mount(
        <Dialog modalType="alert">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                natus iure cumque eaque?
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button id={dialogTriggerCloseId} appearance="secondary">
                    Close
                  </Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.focused().realType('{esc}');
      cy.get(dialogSurfaceSelector).should('not.exist');
    });
    it('should lock body scroll when dialog open', () => {
      mount(
        <>
          <Dialog modalType="alert">
            <DialogTrigger disableButtonEnhancement>
              <Button id={dialogTriggerOpenId}>Open dialog</Button>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogContent>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                  eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                  natus iure cumque eaque?
                </DialogContent>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button id={dialogTriggerCloseId} appearance="secondary">
                      Close
                    </Button>
                  </DialogTrigger>
                  <Button appearance="primary">Do Something</Button>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
          {lorem}
        </>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get('html').should('have.css', 'overflow', 'visible clip');
    });
    it('should focus trap by default', () => {
      mount(
        <Dialog modalType="alert">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogBody>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogBody>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button id="do-something-btn" appearance="primary">
                Do Something
              </Button>
            </DialogActions>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogTriggerCloseSelector).should('be.focused').realPress('Tab');
      cy.get('#do-something-btn').should('be.focused').realPress('Tab');
      cy.get(dialogTriggerCloseSelector).should('be.focused');
    });
    it('should focus on window after last element when inertTrapFocus=true', () => {
      mount(
        <Dialog inertTrapFocus modalType="alert">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogBody>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque
              est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure
              cumque eaque?
            </DialogBody>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id={dialogTriggerCloseId} appearance="secondary">
                  Close
                </Button>
              </DialogTrigger>
              <Button id="do-something-btn" appearance="primary">
                Do Something
              </Button>
            </DialogActions>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogTriggerCloseSelector).should('be.focused').realPress('Tab');
      cy.get('#do-something-btn').should('be.focused').realPress('Tab');
      cy.focused().should('not.exist');
    });
  });

  it('should allow nested dialogs', () => {
    mount(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <Button id="open-first-dialog-btn">Open nested dialog</Button>
        </DialogTrigger>
        <DialogSurface id="first-dialog">
          <DialogBody>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button id="close-first-dialog-btn">Close</Button>
              </DialogTrigger>
              <Dialog>
                <DialogTrigger disableButtonEnhancement>
                  <Button id="open-second-dialog-btn" appearance="primary">
                    Open inner dialog
                  </Button>
                </DialogTrigger>
                <DialogSurface id="second-dialog">
                  <DialogBody>
                    <DialogTitle>Inner dialog title</DialogTitle>
                    <DialogContent>
                      ⛔️ just because you can doesn't mean you should have nested dialogs ⛔️
                    </DialogContent>
                    <DialogActions>
                      <DialogTrigger disableButtonEnhancement>
                        <Button id="close-second-dialog-btn" appearance="primary">
                          Close
                        </Button>
                      </DialogTrigger>
                    </DialogActions>
                  </DialogBody>
                </DialogSurface>
              </Dialog>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#open-first-dialog-btn').realClick();
    cy.get('#first-dialog').should('exist');
    cy.get('#second-dialog').should('not.exist');
    cy.get('#open-second-dialog-btn').should('exist').realClick();
    cy.get('#second-dialog').should('exist');
    cy.get('#close-second-dialog-btn').should('exist').realClick();
    cy.get('#second-dialog').should('not.exist');
    cy.get('#first-dialog').should('exist');
    cy.get('#close-first-dialog-btn').should('exist').realClick();
    cy.get('#second-dialog').should('not.exist');
    cy.get('#first-dialog').should('not.exist');
  });
});

const lorem = (
  <>
    {Array.from({ length: 10 }, (_, i) => (
      <p key={i}>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus eaque est
        dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in natus iure cumque
        eaque?
      </p>
    ))}
  </>
);
