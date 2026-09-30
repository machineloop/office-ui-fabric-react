import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { useARIAButtonProps } from '@fluentui/react-aria';
import { getByRole } from '@testing-library/dom';
import type { JSXElement } from '@fluentui/react-utilities';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogProvider,
  DialogSurface,
  DialogSurfaceProvider,
  DialogTitle,
  DialogTrigger,
  renderDialogTrigger_unstable,
  useDialogTrigger_unstable,
} from '@fluentui/react-dialog';
import type { DialogOpenChangeData, DialogTriggerProps } from '@fluentui/react-dialog';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);

const Direct = ({
  children,
  inside = false,
  onRequest,
}: {
  children: React.ReactNode;
  inside?: boolean;
  onRequest?: (data: DialogOpenChangeData) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  return (
    <DialogProvider
      value={{
        open,
        modalType: 'non-modal',
        inertTrapFocus: false,
        isNestedDialog: false,
        dialogRef,
        requestOpenChange: data => {
          onRequest?.(data);
          setOpen(data.open);
        },
      }}
    >
      <DialogSurfaceProvider value={inside}>{children}</DialogSurfaceProvider>
      <output id="state">{open ? 'open' : 'closed'}</output>
    </DialogProvider>
  );
};

const settled = () =>
  cy
    .get('#surface')
    .should($surface =>
      expect(
        $surface[0].getAnimations({ subtree: true }).some(animation => animation.playState === 'running'),
      ).to.equal(false),
    );

describe('DialogTrigger documented scenarios', () => {
  it('opens outside and closes inside the surface with omitted actions and restores native focus', () => {
    mount(
      <Dialog>
        <DialogTrigger>
          <button id="trigger">Open dialog</button>
        </DialogTrigger>
        <DialogSurface id="surface">
          <DialogBody>
            <DialogTitle action={null}>Trigger contract</DialogTitle>
            <DialogContent>Confirm this change.</DialogContent>
            <DialogTrigger>
              <button id="close">Close dialog</button>
            </DialogTrigger>
          </DialogBody>
        </DialogSurface>
      </Dialog>,
    );
    cy.get('#trigger').realClick();
    settled();
    cy.get('#surface').should($surface =>
      expect(getByRole($surface[0].ownerDocument.body, 'dialog', { name: 'Trigger contract' })).to.equal($surface[0]),
    );
    cy.get('#close').should('be.focused').realPress('Enter');
    cy.get('#surface').should('not.exist');
    cy.get('#trigger').should('be.focused').realPress('Space');
    settled();
    cy.get('#close').realClick();
    cy.get('#surface').should('not.exist');
    cy.get('#trigger').should('be.focused');
  });

  it('honors root open-change veto for both opening and closing with live motion', () => {
    const changes: string[] = [];
    const motionStarts: string[] = [];
    const motionFinishes: string[] = [];
    const Example = () => {
      const [veto, setVeto] = React.useState(true);
      return (
        <>
          <button id="allow" onClick={() => setVeto(false)}>
            Allow opening
          </button>
          <Dialog
            surfaceMotion={{
              onMotionStart: (_, data) => motionStarts.push(data.direction),
              onMotionFinish: (_, data) => motionFinishes.push(data.direction),
            }}
            onOpenChange={(event, data) => {
              changes.push(`${data.type}:${data.open}`);
              if (veto) {
                event.preventDefault();
              } else if (data.open) {
                setVeto(true);
              }
            }}
          >
            <DialogTrigger>
              <button id="trigger">Open dialog</button>
            </DialogTrigger>
            <DialogSurface id="surface">
              <DialogTitle action={null}>Veto contract</DialogTitle>
              <DialogTrigger>
                <button id="close">Close dialog</button>
              </DialogTrigger>
              <button id="allow-close" onClick={() => setVeto(false)}>
                Allow closing
              </button>
            </DialogSurface>
          </Dialog>
        </>
      );
    };
    mount(<Example />);
    cy.get('#trigger').realClick();
    cy.get('#surface').should('not.exist');
    cy.get('#allow').realClick();
    cy.get('#trigger').realClick();
    settled();
    cy.wrap(motionFinishes).should('deep.equal', ['enter']);
    cy.get('#close').realClick();
    cy.get('#surface').should('be.visible');
    cy.then(() => {
      expect(motionStarts).to.deep.equal(['enter']);
      expect(motionFinishes).to.deep.equal(['enter']);
    });
    cy.get('#allow-close').realClick();
    cy.get('#close').realClick();
    cy.get('#surface').should('not.exist');
    cy.then(() => {
      expect(motionStarts).to.deep.equal(['enter', 'exit']);
      expect(motionFinishes).to.deep.equal(['enter', 'exit']);
    });
    cy.then(() =>
      expect(changes).to.deep.equal([
        'triggerClick:true',
        'triggerClick:true',
        'triggerClick:false',
        'triggerClick:false',
      ]),
    );
  });

  it('passes enhanced properties to a render child without adding a wrapper', () => {
    mount(
      <Direct>
        <DialogTrigger>
          {props => (
            <button {...props} id="trigger">
              Render trigger
            </button>
          )}
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger')
      .should('have.attr', 'type', 'button')
      .should($trigger => {
        expect(getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Render trigger' })).to.equal($trigger[0]);
        expect($trigger[0].parentElement?.classList.contains('fui-FluentProvider')).to.equal(true);
      })
      .realClick();
    cy.get('#state').should('have.text', 'open');
  });
});

describe('DialogTrigger supported API and accessibility edges', () => {
  it('defaults an enhanced native button to type button rather than submitting its form', () => {
    const submitted: string[] = [];
    mount(
      <Direct>
        <form
          onSubmit={event => {
            event.preventDefault();
            submitted.push('submit');
          }}
        >
          <DialogTrigger>
            <button id="trigger" type="submit">
              Enhanced button
            </button>
          </DialogTrigger>
        </form>
      </Direct>,
    );
    cy.get('#trigger').should('have.attr', 'type', 'button').realClick().realPress('Enter').realPress('Space');
    cy.get('#state').should('have.text', 'open');
    cy.then(() => expect(submitted).to.have.length(0));
  });

  it('preserves cloned child class and inline styles without imposing trigger styles', () => {
    mount(
      <Direct>
        <DialogTrigger>
          <button id="trigger" className="consumer-control" style={{ display: 'inline-flex' }}>
            Styled child
          </button>
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger')
      .should('have.class', 'consumer-control')
      .and('have.css', 'display', 'inline-flex')
      .should($trigger => expect($trigger[0].className).to.equal('consumer-control'))
      .realClick();
    cy.get('#state').should('have.text', 'open');
  });

  it('blocks enhanced disabled links and strips navigation while retaining their link role', () => {
    const requests: boolean[] = [];
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <DialogTrigger>
          <a id="trigger" href="#destination" aria-disabled="true" tabIndex={0}>
            Disabled link
          </a>
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger').should('not.have.attr', 'href');
    cy.get('#trigger')
      .should($trigger =>
        expect(getByRole($trigger[0].ownerDocument.body, 'link', { name: 'Disabled link' })).to.equal($trigger[0]),
      )
      .realClick()
      .realPress('Enter')
      .realPress('Space');
    cy.get('#state').should('have.text', 'closed');
    cy.then(() => expect(requests).to.have.length(0));
  });

  it('leaves non-enhanced native disabled behavior to the browser', () => {
    const requests: boolean[] = [];
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <button id="trigger" disabled>
            Native disabled
          </button>
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger').should('be.disabled').realClick();
    cy.get('#state').should('have.text', 'closed');
    cy.then(() => expect(requests).to.have.length(0));
  });

  it('preserves child stopPropagation without conflating it with action veto', () => {
    const events: string[] = [];
    mount(
      <Direct onRequest={() => events.push('request')}>
        <div onClick={() => events.push('parent')}>
          <DialogTrigger>
            <button
              id="trigger"
              onClick={event => {
                events.push('child');
                event.stopPropagation();
              }}
            >
              Stop bubbling
            </button>
          </DialogTrigger>
        </div>
      </Direct>,
    );
    cy.get('#trigger').realClick();
    cy.get('#state').should('have.text', 'open');
    cy.then(() => expect(events).to.deep.equal(['child', 'request']));
  });

  it('preserves native render-child refs and consumer attributes when enhancement is disabled', () => {
    const ref = React.createRef<HTMLButtonElement>();
    mount(
      <Direct>
        <DialogTrigger disableButtonEnhancement>
          {props => (
            <button {...props} ref={ref} id="trigger" type="button" aria-label="Render action">
              Render child
            </button>
          )}
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger')
      .should($trigger => {
        expect(ref.current).to.equal($trigger[0]);
        expect(getByRole($trigger[0].ownerDocument.body, 'button', { name: 'Render action' })).to.equal($trigger[0]);
      })
      .realClick()
      .realPress('Enter');
    cy.get('#state').should('have.text', 'open');
  });

  it('renders a usable enhanced child outside a Dialog without requesting external state', () => {
    const clicks: string[] = [];
    mount(
      <DialogTrigger>
        <button id="trigger" onClick={() => clicks.push('click')}>
          Standalone
        </button>
      </DialogTrigger>,
    );
    cy.get('#trigger').should('have.attr', 'type', 'button').realClick().realPress('Space');
    cy.then(() => expect(clicks).to.deep.equal(['click', 'click']));
  });

  for (const inside of [false, true]) {
    for (const action of [undefined, 'open', 'close'] as const) {
      it(`requests ${action ?? 'contextual'} action with inside=${inside}`, () => {
        const requests: DialogOpenChangeData[] = [];
        mount(
          <Direct inside={inside} onRequest={data => requests.push(data)}>
            <DialogTrigger action={action}>
              <button id="trigger">Trigger action</button>
            </DialogTrigger>
          </Direct>,
        );
        cy.get('#trigger').realClick();
        const expected = action ? action === 'open' : !inside;
        cy.get('#state').should('have.text', expected ? 'open' : 'closed');
        cy.then(() => {
          expect(requests).to.have.length(1);
          expect(requests[0].open).to.equal(expected);
          expect(requests[0].type).to.equal('triggerClick');
          expect(requests[0].event.currentTarget).to.equal(null);
          expect(requests[0].event.target).to.equal(Cypress.$('#trigger')[0]);
        });
      });
    }
  }

  for (const control of ['button', 'div', 'anchor'] as const) {
    for (const key of ['Enter', 'Space'] as const) {
      it(`activates enhanced ${control} exactly once with native ${key}`, () => {
        const requests: boolean[] = [];
        const child =
          control === 'button' ? (
            <button id="trigger">Native button</button>
          ) : control === 'div' ? (
            <div id="trigger">Custom button</div>
          ) : (
            <a id="trigger">Anchor button</a>
          );
        mount(
          <Direct onRequest={data => requests.push(data.open)}>
            <DialogTrigger>{child}</DialogTrigger>
          </Direct>,
        );
        cy.get('#trigger')
          .should($trigger => expect(getByRole($trigger[0].ownerDocument.body, 'button')).to.equal($trigger[0]))
          .then($trigger => $trigger[0].focus());
        cy.get('#trigger').should('be.focused').realPress(key);
        cy.get('#state').should('have.text', 'open');
        cy.then(() => expect(requests).to.deep.equal([true]));
      });
    }
  }

  it('retains native link semantics, attributes and consumer navigation veto', () => {
    const requests: boolean[] = [];
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <DialogTrigger>
          <a
            id="trigger"
            href="#destination"
            aria-label="Read details"
            title="Details"
            lang="fr"
            dir="rtl"
            data-owner="consumer"
            onClick={event => event.preventDefault()}
          >
            Details
          </a>
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger')
      .should('have.attr', 'href', '#destination')
      .and('have.attr', 'title', 'Details')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-owner', 'consumer')
      .should($trigger =>
        expect(getByRole($trigger[0].ownerDocument.body, 'link', { name: 'Read details' })).to.equal($trigger[0]),
      )
      .realClick();
    cy.get('#state').should('have.text', 'closed');
    cy.then(() => expect(requests).to.have.length(0));
  });

  for (const ariaDisabled of [false, 'false', true, 'true'] as const) {
    it(`normalizes enhanced aria-disabled=${JSON.stringify(ariaDisabled)}`, () => {
      const requests: boolean[] = [];
      mount(
        <Direct onRequest={data => requests.push(data.open)}>
          <DialogTrigger>
            <button id="trigger" aria-disabled={ariaDisabled}>
              ARIA disabled
            </button>
          </DialogTrigger>
        </Direct>,
      );
      cy.get('#trigger').realClick();
      const blocked = ariaDisabled === true || ariaDisabled === 'true';
      cy.get('#state').should('have.text', blocked ? 'closed' : 'open');
      cy.then(() => expect(requests).to.have.length(blocked ? 0 : 1));
    });
  }

  it('blocks disabled native button pointer and keyboard activation while remaining outside tab order', () => {
    const requests: boolean[] = [];
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <button id="before">Before</button>
        <DialogTrigger>
          <button id="trigger" disabled>
            Disabled trigger
          </button>
        </DialogTrigger>
        <button id="after">After</button>
      </Direct>,
    );
    cy.get('#trigger').should('be.disabled').realClick();
    cy.get('#before').realClick().realPress('Tab');
    cy.get('#after').should('be.focused');
    cy.get('#state').should('have.text', 'closed');
    cy.then(() => expect(requests).to.have.length(0));
  });

  it('keeps disabledFocusable custom buttons focusable without clicks or form submission', () => {
    const requests: boolean[] = [];
    const submitted: string[] = [];
    const Control = React.forwardRef<
      HTMLButtonElement,
      React.ComponentProps<'button'> & { disabledFocusable?: boolean }
    >((props, ref) => <button {...useARIAButtonProps('button', props)} ref={ref} />);
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <form
          onSubmit={event => {
            event.preventDefault();
            submitted.push('submit');
          }}
        >
          <DialogTrigger disableButtonEnhancement>
            <Control id="trigger" disabled disabledFocusable>
              Focusable disabled
            </Control>
          </DialogTrigger>
        </form>
      </Direct>,
    );
    cy.get('#trigger')
      .should('not.be.disabled')
      .and('have.attr', 'aria-disabled', 'true')
      .realClick()
      .should('be.focused')
      .realPress('Enter')
      .realPress('Space');
    cy.get('#state').should('have.text', 'closed');
    cy.then(() => {
      expect(requests).to.have.length(0);
      expect(submitted).to.have.length(0);
    });
  });

  it('lets a non-enhanced native button own its type and native keyboard behavior', () => {
    const submitted: string[] = [];
    const requests: boolean[] = [];
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <form
          onSubmit={event => {
            event.preventDefault();
            submitted.push('submit');
          }}
        >
          <DialogTrigger disableButtonEnhancement>
            <button id="trigger" type="submit" aria-disabled={false}>
              Native submit
            </button>
          </DialogTrigger>
        </form>
      </Direct>,
    );
    cy.get('#trigger').should('have.attr', 'type', 'submit').realClick().realPress('Enter').realPress('Space');
    cy.then(() => {
      expect(requests).to.deep.equal([true, true, true]);
      expect(submitted).to.have.length(3);
    });
  });

  it('does not invent keyboard behavior or semantics when custom control enhancement is disabled', () => {
    const requests: boolean[] = [];
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <div id="trigger" role="button" tabIndex={0}>
            Consumer control
          </div>
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger').realClick().realPress('Enter').realPress('Space');
    cy.then(() => expect(requests).to.deep.equal([true]));
    cy.get('#trigger').should('not.have.attr', 'type');
  });

  it('honors consumer keydown and keyup veto before custom-control synthesized clicks', () => {
    const requests: boolean[] = [];
    const keys: string[] = [];
    mount(
      <Direct onRequest={data => requests.push(data.open)}>
        <DialogTrigger>
          <div
            id="trigger"
            onKeyDown={event => {
              keys.push(`down:${event.key}`);
              event.preventDefault();
            }}
            onKeyUp={event => {
              keys.push(`up:${event.key}`);
              event.preventDefault();
            }}
          >
            Veto keys
          </div>
        </DialogTrigger>
      </Direct>,
    );
    cy.get('#trigger').then($trigger => $trigger[0].focus());
    cy.get('#trigger').realPress('Enter').realPress('Space');
    cy.then(() => {
      expect(keys).to.deep.equal(['down:Enter', 'up:Enter', 'down: ', 'up: ']);
      expect(requests).to.have.length(0);
    });
  });

  it('preserves native click propagation and delivers consumer veto to the parent', () => {
    const events: string[] = [];
    mount(
      <Direct onRequest={() => events.push('request')}>
        <div onClick={event => events.push(`parent:${event.defaultPrevented}`)}>
          <DialogTrigger>
            <button
              id="trigger"
              onClick={event => {
                events.push('child');
                event.preventDefault();
              }}
            >
              Veto click
            </button>
          </DialogTrigger>
        </div>
      </Direct>,
    );
    cy.get('#trigger').realClick();
    cy.then(() => expect(events).to.deep.equal(['child', 'parent:true']));
    cy.get('#state').should('have.text', 'closed');
  });
});

describe('DialogTrigger meaningful unit-derived scenarios', () => {
  it('updates omitted contextual action and the latest provider request callback without remounting', () => {
    const requests: string[] = [];
    const Example = () => {
      const [inside, setInside] = React.useState(false);
      return (
        <Direct inside={inside} onRequest={data => requests.push(`${inside}:${data.open}`)}>
          <button id="update" onClick={() => setInside(value => !value)}>
            Move context
          </button>
          <DialogTrigger>
            <button id="trigger">Contextual trigger</button>
          </DialogTrigger>
        </Direct>
      );
    };
    mount(<Example />);
    let element: HTMLElement;
    cy.get('#trigger')
      .then($trigger => {
        element = $trigger[0];
      })
      .realClick();
    cy.get('#state').should('have.text', 'open');
    cy.get('#update').realClick();
    cy.get('#trigger')
      .should($trigger => expect($trigger[0]).to.equal(element))
      .realClick();
    cy.get('#state').should('have.text', 'closed');
    cy.then(() => expect(requests).to.deep.equal(['false:true', 'true:false']));
  });

  it('detaches a replaced callback ref and attaches the current ref to the same native element', () => {
    const first: Array<HTMLButtonElement | null> = [];
    const second: Array<HTMLButtonElement | null> = [];
    const firstRef = (node: HTMLButtonElement | null) => {
      first.push(node);
    };
    const secondRef = (node: HTMLButtonElement | null) => {
      second.push(node);
    };
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <Direct>
          <button id="update" onClick={() => setUpdated(true)}>
            Replace ref
          </button>
          <DialogTrigger>
            <button id="trigger" ref={updated ? secondRef : firstRef}>
              Ref identity
            </button>
          </DialogTrigger>
        </Direct>
      );
    };
    mount(<Example />);
    let element: HTMLButtonElement;
    let detachedCalls: number;
    cy.get<HTMLButtonElement>('#trigger').then($trigger => {
      element = $trigger[0];
    });
    cy.get('#update').realClick();
    cy.then(() => {
      expect(first[first.length - 1]).to.equal(null);
      expect(second[second.length - 1]).to.equal(element);
      expect(first.filter(node => node !== null).every(node => node === element)).to.equal(true);
      detachedCalls = first.length;
    });
    cy.get('#trigger')
      .should($trigger => expect($trigger[0]).to.equal(element))
      .realClick();
    cy.then(() => {
      expect(first).to.have.length(detachedCalls);
      expect(second[second.length - 1]).to.equal(element);
    });
    cy.get('#state').should('have.text', 'open');
  });

  it('updates enhanced custom disabledFocusable state and restores native activation when removed', () => {
    const requests: boolean[] = [];
    const Control = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & { disabledFocusable?: boolean }>(
      ({ disabledFocusable, ...props }, ref) => <div {...props} ref={ref} />,
    );
    const Example = () => {
      const [disabledFocusable, setDisabledFocusable] = React.useState(true);
      return (
        <Direct onRequest={data => requests.push(data.open)}>
          <button id="update" onClick={() => setDisabledFocusable(false)}>
            Enable control
          </button>
          <DialogTrigger>
            <Control id="trigger" disabledFocusable={disabledFocusable}>
              Enhanced custom
            </Control>
          </DialogTrigger>
        </Direct>
      );
    };
    mount(<Example />);
    cy.get('#trigger')
      .should('have.attr', 'aria-disabled', 'true')
      .and('have.attr', 'tabindex', '0')
      .realClick()
      .should('be.focused')
      .realPress('Enter')
      .realPress('Space');
    cy.then(() => expect(requests).to.have.length(0));
    cy.get('#update').realClick();
    cy.get('#trigger').should('not.have.attr', 'aria-disabled');
    cy.get('#trigger').realClick().realPress('Enter').realPress('Space');
    cy.then(() => expect(requests).to.deep.equal([true, true, true]));
  });

  it('retains callback and object refs through action changes and clears them on unmount', () => {
    const callbacks: Array<HTMLButtonElement | null> = [];
    const objectRef = React.createRef<HTMLButtonElement>();
    const callbackRef = (node: HTMLButtonElement | null) => {
      callbacks.push(node);
    };
    const Example = () => {
      const [action, setAction] = React.useState<'open' | 'close'>('open');
      const [shown, setShown] = React.useState(true);
      return (
        <Direct>
          <button id="update" onClick={() => setAction('close')}>
            Update action
          </button>
          <button id="unmount" onClick={() => setShown(false)}>
            Unmount triggers
          </button>
          {shown && (
            <>
              <DialogTrigger action={action}>
                <button id="trigger" ref={callbackRef}>
                  Callback ref
                </button>
              </DialogTrigger>
              <DialogTrigger action={action}>
                <button id="object" ref={objectRef}>
                  Object ref
                </button>
              </DialogTrigger>
            </>
          )}
        </Direct>
      );
    };
    mount(<Example />);
    let element: HTMLButtonElement;
    cy.get<HTMLButtonElement>('#trigger').then($trigger => {
      element = $trigger[0];
    });
    cy.get('#object').should($object => expect(objectRef.current).to.equal($object[0]));
    cy.get('#update').realClick();
    cy.get('#trigger')
      .should($trigger => expect($trigger[0]).to.equal(element))
      .realClick();
    cy.get('#state').should('have.text', 'closed');
    cy.get('#unmount').realClick();
    cy.get('#trigger').should('not.exist');
    cy.then(() => {
      expect(callbacks).to.include(element);
      expect(callbacks[callbacks.length - 1]).to.equal(null);
      expect(objectRef.current).to.equal(null);
    });
  });

  it('uses the latest forwarded handlers and action then removes handlers without remounting', () => {
    const events: string[] = [];
    const requests: boolean[] = [];
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <Direct onRequest={data => requests.push(data.open)}>
          <button id="update" onClick={() => setPhase(value => value + 1)}>
            Next phase
          </button>
          <DialogTrigger action={phase === 1 ? 'close' : undefined}>
            <div
              id="trigger"
              onClick={phase < 2 ? () => events.push(`${phase}:click`) : undefined}
              onKeyDown={phase < 2 ? event => events.push(`${phase}:down:${event.key}`) : undefined}
              onKeyUp={phase < 2 ? event => events.push(`${phase}:up:${event.key}`) : undefined}
              onFocus={phase < 2 ? () => events.push(`${phase}:focus`) : undefined}
            >
              Updating control
            </div>
          </DialogTrigger>
        </Direct>
      );
    };
    mount(<Example />);
    cy.get('#trigger').realClick().realPress('a');
    cy.get('#update').realClick();
    cy.get('#trigger').realClick().realPress('b');
    cy.get('#update').realClick();
    cy.get('#trigger').realClick().realPress('Enter');
    cy.then(() => {
      expect(events).to.deep.equal([
        '0:focus',
        '0:click',
        '0:down:a',
        '0:up:a',
        '1:focus',
        '1:click',
        '1:down:b',
        '1:up:b',
      ]);
      expect(requests).to.deep.equal([true, false, true, true]);
    });
  });

  it('switches enhancement on and off on the same custom control', () => {
    const requests: boolean[] = [];
    const Example = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <Direct onRequest={data => requests.push(data.open)}>
          <button id="update" onClick={() => setDisabled(value => !value)}>
            Toggle enhancement
          </button>
          <DialogTrigger disableButtonEnhancement={disabled}>
            <div id="trigger" tabIndex={0}>
              Switch control
            </div>
          </DialogTrigger>
        </Direct>
      );
    };
    mount(<Example />);
    cy.get('#trigger').should('have.attr', 'role', 'button').realClick().realPress('Enter');
    cy.get('#update').realClick();
    cy.get('#trigger').should('not.have.attr', 'role');
    cy.get('#trigger').realClick().realPress('Enter');
    cy.get('#update').realClick();
    cy.get('#trigger').should('have.attr', 'role', 'button').realClick().realPress('Space');
    cy.then(() => expect(requests).to.deep.equal([true, true, true, true, true]));
  });

  it('recomposes the public hook and renderer with the same native activation contract', () => {
    const Recomposed = (props: DialogTriggerProps) => renderDialogTrigger_unstable(useDialogTrigger_unstable(props));
    mount(
      <Direct>
        <Recomposed>
          <button id="trigger">Recomposed trigger</button>
        </Recomposed>
      </Direct>,
    );
    cy.get('#trigger').should('have.attr', 'type', 'button').realClick();
    cy.get('#state').should('have.text', 'open');
  });

  for (const boundary of ['omitted', 'null', 'render-null'] as const) {
    it(`renders no DOM for ${boundary} children`, () => {
      mount(
        <div id="host">
          {boundary === 'omitted' ? (
            <DialogTrigger />
          ) : boundary === 'null' ? (
            <DialogTrigger>{null}</DialogTrigger>
          ) : (
            <DialogTrigger>{() => null}</DialogTrigger>
          )}
        </div>,
      );
      cy.get('#host').should('be.empty');
    });
  }

  it('reports unsupported fragment children through the shared single-element boundary', () => {
    class Boundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
      public state = { error: '' };
      public static getDerivedStateFromError(error: Error) {
        return { error: error.message };
      }
      public render() {
        return this.state.error ? <output id="error">{this.state.error}</output> : this.props.children;
      }
    }
    mount(
      <Boundary>
        <DialogTrigger>
          <>
            <button>Invalid fragment</button>
          </>
        </DialogTrigger>
      </Boundary>,
    );
    cy.get('#error')
      .should('contain.text', 'A trigger element must be a single element')
      .and('contain.text', 'not using React Fragments');
  });
});
