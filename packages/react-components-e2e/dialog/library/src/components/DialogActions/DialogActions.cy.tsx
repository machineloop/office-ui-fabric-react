import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { getByRole } from '@testing-library/dom';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  renderDialogActions_unstable,
  useDialogActions_unstable,
  useDialogActionsStyles_unstable,
} from '@fluentui/react-dialog';
import type { DialogActionsProps, DialogActionsState } from '@fluentui/react-dialog';
import { useDialogActionsTestStyles } from './DialogActionsTestStyles.styles';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const settled = () =>
  cy
    .get('#surface')
    .should($surface =>
      expect(
        $surface[0].getAnimations({ subtree: true }).some(animation => animation.playState === 'running'),
      ).to.equal(false),
    );
const Example = ({ actions = {}, secondary = false }: { actions?: DialogActionsProps; secondary?: boolean }) => (
  <Dialog>
    <DialogTrigger disableButtonEnhancement>
      <button id="open">Open actions</button>
    </DialogTrigger>
    <DialogSurface id="surface">
      <DialogBody id="body">
        <DialogTitle action={null}>Actions contract</DialogTitle>
        <DialogContent>Choose what happens next.</DialogContent>
        {secondary && (
          <DialogActions id="secondary" position="start">
            <button>Secondary</button>
          </DialogActions>
        )}
        <DialogActions id="actions" {...actions}>
          <button id="primary">Primary</button>
          <DialogTrigger disableButtonEnhancement>
            <button id="close">Close</button>
          </DialogTrigger>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>
);
const open = () => {
  cy.get('#open').realClick();
  settled();
};

describe('DialogActions documented scenarios', () => {
  it('keeps a destructive action disabled until the caller confirms and closes through DialogTrigger', () => {
    const Campaign = () => {
      const [checked, setChecked] = React.useState(false);
      return (
        <Dialog modalType="non-modal">
          <DialogTrigger disableButtonEnhancement>
            <button id="open">Open campaign</button>
          </DialogTrigger>
          <DialogSurface id="surface" aria-describedby={undefined}>
            <DialogBody>
              <DialogTitle action={null}>Delete this campaign?</DialogTitle>
              <DialogContent>
                <label>
                  <input
                    id="confirm"
                    type="checkbox"
                    checked={checked}
                    onChange={event => setChecked(event.target.checked)}
                  />
                  Confirm deletion
                </label>
              </DialogContent>
              <DialogActions id="actions">
                <DialogTrigger disableButtonEnhancement>
                  <button id="delete" disabled={!checked}>
                    Delete
                  </button>
                </DialogTrigger>
                <DialogTrigger disableButtonEnhancement>
                  <button id="close">Cancel</button>
                </DialogTrigger>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      );
    };
    mount(<Campaign />);
    open();
    cy.get('#delete').should('be.disabled');
    cy.get('#confirm').realClick();
    cy.get('#delete').should('not.be.disabled').realClick();
    cy.get('#actions').should('not.exist');
    cy.get('#open').should('be.focused').realClick();
    settled();
    cy.get('#close').realClick();
    cy.get('#actions').should('not.exist');
  });

  describe('DialogActions meaningful unit-derived contracts', () => {
    it('matches the default snapshot and conformance root in the live browser', () => {
      mount(<DialogActions id="actions">Default DialogActions</DialogActions>);
      cy.get('#actions')
        .should('have.text', 'Default DialogActions')
        .and('have.prop', 'tagName', 'DIV')
        .and('have.class', 'fui-DialogActions')
        .and('have.css', 'box-sizing', 'border-box')
        .and('have.css', 'display', 'flex')
        .and('have.css', 'gap', '8px')
        .and('have.css', 'justify-self', 'end')
        .and('have.css', 'grid-row-start', '3');
    });

    it('clears an object ref on unmount and attaches it again on remount', () => {
      const ref = React.createRef<HTMLDivElement>();
      const Updating = () => {
        const [shown, setShown] = React.useState(true);
        return (
          <>
            <button id="toggle" onClick={() => setShown(value => !value)}>
              Toggle
            </button>
            {shown && (
              <DialogActions id="actions" ref={ref}>
                <button>Action</button>
              </DialogActions>
            )}
          </>
        );
      };
      mount(<Updating />);
      cy.get('#actions').should($root => expect(ref.current).to.equal($root[0]));
      cy.get('#toggle').realClick();
      cy.get('#actions').should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
      cy.get('#toggle').realClick();
      cy.get('#actions').should($root => expect(ref.current).to.equal($root[0]));
    });

    it('detaches replaced callback refs and clears the current callback on unmount', () => {
      const first = cy.stub();
      const second = cy.stub();
      const Updating = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <button id="advance" onClick={() => setPhase(value => value + 1)}>
              Advance
            </button>
            {phase < 2 && (
              <DialogActions id="actions" ref={phase === 0 ? first : second}>
                Action
              </DialogActions>
            )}
          </>
        );
      };
      mount(<Updating />);
      cy.get('#actions').should($root => expect(first.lastCall.args[0]).to.equal($root[0]));
      cy.get('#advance').realClick();
      cy.get('#actions').should($root => {
        expect(first.lastCall.args[0]).to.equal(null);
        expect(second.lastCall.args[0]).to.equal($root[0]);
      });
      cy.get('#advance').realClick();
      cy.get('#actions').should('not.exist');
      cy.then(() => expect(second.lastCall.args[0]).to.equal(null));
    });

    it('preserves typed root render function props ref and child event activation', () => {
      const ref = React.createRef<HTMLDivElement>();
      const clicked = cy.stub().as('renderClicked');
      const renderRoot: SlotRenderFunction<DialogActionsState['root']> = (Component, props) => (
        <Component {...props} data-rendered="true">
          <button id="child">Rendered action</button>
        </Component>
      );
      mount(
        <DialogActions id="actions" ref={ref} aria-label="Rendered actions" onClick={clicked}>
          {renderRoot}
        </DialogActions>,
      );
      cy.get('#actions')
        .should('have.attr', 'data-rendered', 'true')
        .and('have.attr', 'aria-label', 'Rendered actions')
        .and('have.class', 'fui-DialogActions')
        .and('have.text', 'Rendered action')
        .should($root => expect(ref.current).to.equal($root[0]));
      cy.get('#child').realClick().should('be.focused');
      cy.get('@renderClicked').should('have.been.calledOnce');
    });

    it('supports typed hook style render recomposition with native props and refs', () => {
      const Recombined = React.forwardRef<HTMLElement, DialogActionsProps>((props, ref) => {
        const state = useDialogActions_unstable(props, ref);
        useDialogActionsStyles_unstable(state);
        state.root.title = 'Recomposed actions';
        return renderDialogActions_unstable(state);
      });
      const ref = React.createRef<HTMLElement>();
      const clicked = cy.stub().as('recomposedClicked');
      mount(
        <Recombined id="actions" ref={ref} position="start" fluid onClick={clicked}>
          <button id="child">Recomposed</button>
        </Recombined>,
      );
      cy.get('#actions')
        .should('have.attr', 'title', 'Recomposed actions')
        .and('have.css', 'grid-column-start', '1')
        .and('have.css', 'grid-column-end', '4')
        .should($root => expect(ref.current).to.equal($root[0]));
      cy.get('#child').realClick();
      cy.get('@recomposedClicked').should('have.been.calledOnce');
    });

    it('allows caller classes to override layout and removes them without losing native props', () => {
      const Updating = () => {
        const styles = useDialogActionsTestStyles();
        const [custom, setCustom] = React.useState(true);
        return (
          <DialogActions id="actions" className={custom ? styles.root : undefined} data-owner="caller">
            <button id="toggle" onClick={() => setCustom(false)}>
              Reset class
            </button>
            <button id="next">Next</button>
          </DialogActions>
        );
      };
      mount(<Updating />);
      cy.get('#actions')
        .should('have.css', 'flex-direction', 'column')
        .and('have.css', 'gap', teamsLightTheme.spacingHorizontalL);
      cy.get('#toggle').realClick();
      cy.get('#actions')
        .should('have.css', 'flex-direction', 'row')
        .and('have.css', 'gap', '8px')
        .and('have.attr', 'data-owner', 'caller');
      cy.realPress('Tab');
      cy.get('#next').should('be.focused');
    });

    it('applies and removes provider style hooks while preserving caller overrides and focus', () => {
      const ref = React.createRef<HTMLDivElement>();
      const customStyle = (state: unknown) => {
        const actions = state as DialogActionsState;
        actions.root.style = {
          ...actions.root.style,
          flexDirection: 'column',
          gap: teamsLightTheme.spacingHorizontalL,
        };
      };
      const Updating = () => {
        const [custom, setCustom] = React.useState(true);
        return (
          <FluentProvider
            theme={teamsLightTheme}
            customStyleHooks_unstable={
              custom
                ? {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    useDialogActionsStyles_unstable: customStyle,
                  }
                : {}
            }
          >
            <DialogActions id="actions" ref={ref} style={{ width: '280px' }}>
              <button id="toggle" onClick={() => setCustom(false)}>
                Reset provider
              </button>
              <button id="next">Next</button>
            </DialogActions>
          </FluentProvider>
        );
      };
      mountBase(<Updating />);
      cy.get('#actions')
        .should('have.css', 'flex-direction', 'column')
        .and('have.css', 'gap', teamsLightTheme.spacingHorizontalL)
        .and('have.css', 'width', '280px')
        .should($root => expect(ref.current).to.equal($root[0]));
      cy.get('#toggle').realClick().should('be.focused');
      cy.get('#actions')
        .should('have.css', 'flex-direction', 'row')
        .and('have.css', 'gap', '8px')
        .and('have.css', 'width', '280px')
        .should($root => expect(ref.current).to.equal($root[0]));
      cy.realPress('Tab');
      cy.get('#next').should('be.focused');
    });

    it('updates dynamic children and native attributes without retaining removed actions', () => {
      const Updating = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setUpdated(true)}>
              Update
            </button>
            <DialogActions
              id="actions"
              title={updated ? undefined : 'Original'}
              aria-label={updated ? 'Updated' : 'Original'}
            >
              {updated ? (
                <button id="new" key="new">
                  New action
                </button>
              ) : (
                <button id="old" key="old">
                  Old action
                </button>
              )}
            </DialogActions>
          </>
        );
      };
      mount(<Updating />);
      cy.get('#old').realClick().should('be.focused');
      cy.get('#update').realClick();
      cy.get('#old').should('not.exist');
      cy.get('#actions').should('not.have.attr', 'title');
      cy.get('#actions').should('have.attr', 'aria-label', 'Updated').and('have.text', 'New action');
      cy.realPress('Tab');
      cy.get('#new').should('be.focused');
    });
  });

  describe('DialogActions supported native layout and accessibility contracts', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const width of [480, 481, 800]) {
        for (const position of ['start', 'end'] as const) {
          for (const fluid of [false, true]) {
            it(`lays out ${dir} ${width}px ${position} fluid=${fluid} using real child geometry`, () => {
              cy.viewport(width, 600);
              mountBase(
                <FluentProvider theme={teamsLightTheme} dir={dir}>
                  <Example actions={{ position, fluid }} secondary={!fluid} />
                </FluentProvider>,
              );
              open();
              cy.get('#actions').should($actions => {
                const root = $actions[0];
                const style = root.ownerDocument.defaultView!.getComputedStyle(root);
                const bounds = root.parentElement!.getBoundingClientRect();
                const rect = root.getBoundingClientRect();
                const first = root.querySelector('#primary')!.getBoundingClientRect();
                const last = root.querySelector('#close')!.getBoundingClientRect();
                expect(style.direction).to.equal(dir);
                expect(style.flexDirection).to.equal(width <= 480 ? 'column' : 'row');
                if (width <= 480) {
                  expect(style.gridRowStart).to.equal(position === 'start' ? '3' : '4');
                  expect(style.gridColumnStart).to.equal('1');
                  expect(style.gridColumnEnd).to.equal('4');
                  expect(Math.abs(rect.width - bounds.width)).to.be.lessThan(1);
                  expect(Math.abs(last.top - first.bottom - 8)).to.be.lessThan(1);
                  expect(Math.abs(first.width - rect.width)).to.be.lessThan(1);
                  expect(Math.abs(last.width - rect.width)).to.be.lessThan(1);
                } else {
                  expect(style.gridRowStart).to.equal('3');
                  const startsLeft = (position === 'start') === (dir === 'ltr');
                  expect(Math.abs(startsLeft ? rect.left - bounds.left : rect.right - bounds.right)).to.be.lessThan(1);
                  expect(
                    Math.abs((dir === 'ltr' ? last.left - first.right : first.left - last.right) - 8),
                  ).to.be.lessThan(1);
                }
                if (!fluid && width <= 480 && position === 'end') {
                  expect(
                    root.parentElement!.querySelector('#secondary')!.getBoundingClientRect().bottom,
                  ).to.be.lessThan(rect.top);
                }
              });
              cy.get('#primary').realClick().should('be.focused');
              cy.realPress('Tab');
              cy.get('#close').should('be.focused');
              cy.realPress(['Shift', 'Tab']);
              cy.get('#primary').should('be.focused');
              cy.get('#close').realClick();
              cy.get('#actions').should('not.exist');
            });
          }
        }
      }
    }

    for (const height of [359, 360]) {
      it(`keeps native actions reachable in a short ${height}px surface`, () => {
        cy.viewport(800, height);
        mount(<Example actions={{ fluid: true, style: { width: '100%' } }} />);
        open();
        cy.get('#actions').should($actions => {
          const root = $actions[0];
          expect(
            Math.abs(root.getBoundingClientRect().width - root.parentElement!.getBoundingClientRect().width),
          ).to.be.lessThan(1);
        });
        cy.get('#primary').realClick().should('be.focused');
        cy.realPress('Tab');
        cy.get('#close').should('be.focused');
        cy.realPress('Enter');
        cy.get('#actions').should('not.exist');
        cy.get('#open').should('be.focused');
      });
    }

    it('updates position fluid and responsive layout without retaining obsolete styles', () => {
      const Updating = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <DialogBody id="body" style={{ width: '300px' }}>
            <DialogActions
              id="actions"
              position={phase === 0 ? 'start' : undefined}
              fluid={phase === 1 ? true : undefined}
            >
              <button id="advance" onClick={() => setPhase(value => value + 1)}>
                Advance
              </button>
              <button id="next">Next</button>
            </DialogActions>
          </DialogBody>
        );
      };
      cy.viewport(800, 600);
      mount(<Updating />);
      cy.get('#actions').should('have.css', 'grid-column-start', '1').and('have.css', 'grid-column-end', '2');
      cy.get('#advance').realClick();
      cy.get('#actions')
        .should('have.css', 'justify-self', 'end')
        .and('have.css', 'grid-column-start', '1')
        .and('have.css', 'grid-column-end', '4');
      cy.get('#advance').realClick();
      cy.get('#actions').should('have.css', 'grid-column-start', '2').and('have.css', 'grid-column-end', '4');
      cy.viewport(480, 600);
      cy.get('#actions').should('have.css', 'flex-direction', 'column').and('have.css', 'justify-self', 'stretch');
      cy.viewport(481, 600);
      cy.get('#actions').should('have.css', 'flex-direction', 'row').and('have.css', 'justify-self', 'end');
    });

    for (const [name, children, text] of [
      ['omitted', undefined, ''],
      ['null', null, ''],
      ['zero', 0, '0'],
      [
        'fragment',
        <>
          <span>One</span>
          <span>Two</span>
        </>,
        'OneTwo',
      ],
    ] as const) {
      it(`preserves ${name} children without adding semantics or leaking layout props`, () => {
        mount(
          <DialogActions id="actions" position="start" fluid>
            {children}
          </DialogActions>,
        );
        cy.get('#actions')
          .should('have.prop', 'tagName', 'DIV')
          .and('have.text', text)
          .should($root => {
            for (const attribute of ['role', 'tabindex', 'position', 'fluid']) {
              expect($root[0].hasAttribute(attribute), attribute).to.equal(false);
            }
          });
      });
    }

    it('forwards native and computed accessible attributes to an explicit div', () => {
      mount(
        <>
          <span id="description">Choose an action</span>
          <DialogActions
            as="div"
            id="actions"
            role="group"
            aria-label="Account actions"
            aria-describedby="description"
            title="Actions"
            lang="fr"
            dir="rtl"
            data-owner="caller"
            tabIndex={0}
          >
            <span>Continue</span>
          </DialogActions>
        </>,
      );
      cy.get('#actions')
        .should('have.attr', 'title', 'Actions')
        .and('have.attr', 'lang', 'fr')
        .and('have.attr', 'dir', 'rtl')
        .and('have.attr', 'data-owner', 'caller')
        .should($root => {
          expect(
            getByRole($root[0].ownerDocument.body, 'group', {
              name: 'Account actions',
              description: 'Choose an action',
            }),
          ).to.equal($root[0]);
        })
        .realClick()
        .should('be.focused');
    });

    it('replaces and removes native handlers and preserves bubbling and caller cancellation', () => {
      const keys: string[] = [];
      const clicks: string[] = [];
      const bubbled: boolean[] = [];
      const Updating = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <div onKeyDown={event => bubbled.push(event.defaultPrevented)}>
            <button id="advance" onClick={() => setPhase(value => value + 1)}>
              Advance
            </button>
            <DialogActions
              id="actions"
              onClick={phase < 2 ? () => clicks.push(String(phase)) : undefined}
              onKeyDown={
                phase < 2
                  ? event => {
                      if (event.key === 'Enter') {
                        keys.push(String(phase));
                        event.preventDefault();
                      }
                    }
                  : undefined
              }
            >
              <button id="child">Action</button>
            </DialogActions>
          </div>
        );
      };
      mount(<Updating />);
      cy.get('#child').realClick();
      cy.realPress('Enter');
      cy.get('#advance').realClick();
      cy.get('#child').realClick();
      cy.realPress('Enter');
      cy.get('#advance').realClick();
      cy.get('#child').realClick();
      cy.realPress('Enter');
      cy.then(() => {
        expect(keys).to.deep.equal(['0', '1']);
        expect(clicks).to.deep.equal(['0', '1']);
        expect(bubbled).to.deep.equal([true, true, false]);
      });
    });

    it('honors native hidden and restores action visibility and keyboard access', () => {
      const Updating = () => {
        const [hidden, setHidden] = React.useState(true);
        return (
          <>
            <button id="toggle" onClick={() => setHidden(value => !value)}>
              Toggle
            </button>
            <DialogActions id="actions" hidden={hidden}>
              <button id="child">Action</button>
            </DialogActions>
            <button id="after">After actions</button>
          </>
        );
      };
      mount(<Updating />);
      cy.get('#actions').should('have.attr', 'hidden');
      cy.get('#actions').should('not.be.visible');
      cy.get('#toggle').realClick();
      cy.get('#actions').should('not.have.attr', 'hidden');
      cy.get('#actions').should('be.visible');
      cy.realPress('Tab');
      cy.get('#child').should('be.focused');
      cy.get('#toggle').realClick();
      cy.get('#actions').should('not.be.visible');
      cy.realPress('Tab');
      cy.get('#after').should('be.focused');
    });

    it('preserves native form validation submit reset and caller-owned dialog close', () => {
      const submissions: string[] = [];
      const resets = cy.stub().as('reset');
      const Form = () => {
        const [opened, setOpened] = React.useState(true);
        return (
          <Dialog open={opened}>
            <DialogSurface id="surface">
              <form
                id="form"
                onReset={resets}
                onSubmit={event => {
                  event.preventDefault();
                  const value = new FormData(event.currentTarget).get('account');
                  if (typeof value !== 'string') {
                    throw new Error('Expected the account form field to contain a string');
                  }
                  submissions.push(value);
                  setOpened(false);
                }}
              >
                <DialogBody>
                  <DialogTitle action={null}>Save account</DialogTitle>
                  <DialogContent>
                    <label>
                      Account
                      <input id="account" name="account" required defaultValue="" />
                    </label>
                  </DialogContent>
                  <DialogActions id="actions">
                    <button id="submit" type="submit">
                      Save
                    </button>
                    <button id="reset" type="reset">
                      Reset
                    </button>
                    <button id="ordinary" type="button">
                      Other action
                    </button>
                  </DialogActions>
                </DialogBody>
              </form>
            </DialogSurface>
          </Dialog>
        );
      };
      mount(<Form />);
      settled();
      cy.get('#submit').realClick();
      cy.get('#account').should('be.focused').and('have.prop', 'validity').its('valueMissing').should('equal', true);
      cy.then(() => expect(submissions).to.deep.equal([]));
      cy.get('#account').realType('Draft');
      cy.get('#ordinary').realClick();
      cy.get('#surface').should('be.visible');
      cy.get('#reset').realClick();
      cy.get('@reset').should('have.been.calledOnce');
      cy.get('#account').should('have.value', '').realClick().realType('Final');
      cy.get('#submit').realClick();
      cy.get('#actions').should('not.exist');
      cy.then(() => expect(submissions).to.deep.equal(['Final']));
    });
  });

  for (const position of [undefined, 'start', 'end'] as const) {
    for (const fluid of [undefined, false, true] as const) {
      it(`lays out ${position ?? 'default'} position with ${String(
        fluid,
      )} fluid and leaves ordinary actions caller-owned`, () => {
        cy.viewport(800, 600);
        mount(<Example actions={{ position, fluid }} />);
        open();
        cy.get('#actions')
          .should('have.css', 'display', 'flex')
          .and('have.css', 'gap', '8px')
          .should($actions => {
            const actions = $actions[0];
            const body = actions.parentElement!;
            const rect = actions.getBoundingClientRect();
            const bounds = body.getBoundingClientRect();
            const style = actions.ownerDocument.defaultView!.getComputedStyle(actions);
            expect(style.justifySelf).to.equal(position === 'start' ? 'start' : 'end');
            expect(style.gridColumnStart).to.equal(fluid || position === 'start' ? '1' : '2');
            expect(style.gridColumnEnd).to.equal(fluid || position !== 'start' ? '4' : '2');
            expect(actions.hasAttribute('role')).to.equal(false);
            if (position === 'start') {
              expect(Math.abs(rect.left - bounds.left)).to.be.lessThan(1);
            } else {
              expect(Math.abs(rect.right - bounds.right)).to.be.lessThan(1);
            }
            const first = actions.querySelector('#primary')!.getBoundingClientRect();
            const last = actions.querySelector('#close')!.getBoundingClientRect();
            expect(Math.abs(last.left - first.right - 8)).to.be.lessThan(1);
          });
        cy.get('#primary').realClick();
        cy.get('#surface').should($surface =>
          expect(getByRole($surface[0].ownerDocument.body, 'dialog', { name: 'Actions contract' })).to.equal(
            $surface[0],
          ),
        );
        cy.get('#close').realClick();
        cy.get('#actions').should('not.exist');
        cy.get('#open').should('be.focused');
      });
    }
  }

  it('separates primary end actions and secondary start actions in the body grid', () => {
    cy.viewport(800, 600);
    mount(<Example secondary />);
    open();
    cy.get('#body').should($body => {
      const secondary = $body[0].querySelector('#secondary')!.getBoundingClientRect();
      const primary = $body[0].querySelector('#actions')!.getBoundingClientRect();
      expect(secondary.right).to.be.lessThan(primary.left);
      expect(Math.abs(secondary.top - primary.top)).to.be.lessThan(1);
    });
    cy.get('#close').realClick();
    cy.get('#body').should('not.exist');
  });
});
