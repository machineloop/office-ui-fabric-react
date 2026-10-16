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
  renderDialogBody_unstable,
  useDialogBody_unstable,
  useDialogBodyStyles_unstable,
} from '@fluentui/react-dialog';
import type { DialogBodyProps, DialogBodyState } from '@fluentui/react-dialog';
import { useDialogBodyTestStyles } from './DialogBodyTestStyles.styles';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const settled = () =>
  cy
    .get('#surface')
    .should($surface =>
      expect(
        $surface[0].getAnimations({ subtree: true }).some(animation => animation.playState === 'running'),
      ).to.equal(false),
    );
const LongContent = () => (
  <>
    {Array.from({ length: 50 }, (_, index) => (
      <p key={index}>Body paragraph {index + 1}: All details remain reachable.</p>
    ))}
    <button id="last">Last content control</button>
  </>
);
const Example = ({
  children = 'Body details',
  modalType = 'modal',
}: {
  children?: React.ReactNode;
  modalType?: 'modal' | 'alert' | 'non-modal';
}) => (
  <Dialog modalType={modalType}>
    <DialogTrigger disableButtonEnhancement>
      <button id="open">Open body</button>
    </DialogTrigger>
    <DialogSurface id="surface" aria-labelledby="title">
      <DialogBody id="body">
        <DialogTitle id="title" action={null}>
          Body contract
        </DialogTitle>
        <DialogContent id="content">{children}</DialogContent>
        <DialogActions id="actions">
          <DialogTrigger disableButtonEnhancement>
            <button id="close">Close body</button>
          </DialogTrigger>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>
);

describe('DialogBody documented scenarios', () => {
  for (const modalType of ['modal', 'alert', 'non-modal'] as const) {
    it(`lays out title content and actions without adding dialog semantics for ${modalType}`, () => {
      mount(<Example modalType={modalType} />);
      cy.get('#open').realClick();
      settled();
      cy.get('#body')
        .should('have.class', 'fui-DialogBody')
        .and('have.css', 'display', 'grid')
        .should($body => {
          const body = $body[0];
          expect(body.hasAttribute('role')).to.equal(false);
          expect(
            getByRole(body.ownerDocument.body, modalType === 'alert' ? 'alertdialog' : 'dialog', {
              name: 'Body contract',
            }),
          ).to.equal(body.parentElement);
          const title = body.querySelector('#title')!.getBoundingClientRect();
          const content = body.querySelector('#content')!.getBoundingClientRect();
          const actions = body.querySelector('#actions')!.getBoundingClientRect();
          expect(title.bottom).to.be.lessThan(content.top);
          expect(content.bottom).to.be.lessThan(actions.top);
        });

      cy.get('#close').realClick();
      cy.get('#body').should('not.exist');
      cy.get('#open').should('be.focused');
    });
  }
});

describe('DialogBody supported API layout and accessibility edges', () => {
  for (const [name, children, text] of [
    ['omitted', undefined, ''],
    ['null', null, ''],
    ['zero', 0, '0'],
    [
      'fragment',
      <>
        <span>First</span>
        <span>Second</span>
      </>,
      'FirstSecond',
    ],
  ] as const) {
    it(`preserves ${name} children in the native root`, () => {
      mount(<DialogBody id="body">{children}</DialogBody>);
      cy.get('#body')
        .should('have.prop', 'tagName', 'DIV')
        .and('have.text', text)
        .and('have.css', 'display', 'grid')
        .and('have.css', 'box-sizing', 'border-box')
        .and('have.css', 'gap', '8px')
        .should($body => expect($body[0].hasAttribute('role')).to.equal(false));
    });
  }

  it('forwards explicit div native and accessible attributes without inventing semantics', () => {
    mount(
      <DialogBody
        as="div"
        id="body"
        role="region"
        aria-label="Account"
        title="Details"
        lang="fr"
        dir="rtl"
        tabIndex={0}
        data-owner="consumer"
      >
        Account details
      </DialogBody>,
    );
    cy.get('#body')
      .should('have.attr', 'title', 'Details')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-owner', 'consumer')
      .should($body => expect(getByRole($body[0].ownerDocument.body, 'region', { name: 'Account' })).to.equal($body[0]))
      .realClick()
      .should('be.focused');
  });

  it('uses replaced and removed native handlers and preserves default prevention and bubbling', () => {
    const keys: string[] = [];
    const clicks: string[] = [];
    const bubbled: boolean[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <div onKeyDown={event => bubbled.push(event.defaultPrevented)}>
          <button id="update" onClick={() => setPhase(value => value + 1)}>
            Update handlers
          </button>
          <DialogBody
            id="body"
            tabIndex={0}
            onClick={phase < 2 ? () => clicks.push(phase === 0 ? 'old' : 'new') : undefined}
            onKeyDown={
              phase < 2
                ? event => {
                    keys.push(`${phase}:${event.key}`);
                    event.preventDefault();
                  }
                : undefined
            }
          >
            Handler target
          </DialogBody>
        </div>
      );
    };
    mount(<Updating />);
    cy.get('#body').realClick().realPress('ArrowRight');
    cy.get('#update').realClick();
    cy.get('#body').realClick().realPress('ArrowLeft');
    cy.get('#update').realClick();
    cy.get('#body').realClick().realPress('ArrowDown');
    cy.then(() => {
      expect(clicks).to.deep.equal(['old', 'new']);
      expect(keys).to.deep.equal(['0:ArrowRight', '1:ArrowLeft']);
      expect(bubbled).to.deep.equal([true, true, false]);
    });
  });

  it('removes caller attributes and child semantics on rerender', () => {
    const Updating = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <DialogBody
          id="body"
          role={updated ? undefined : 'region'}
          aria-label={updated ? undefined : 'Old body'}
          title={updated ? undefined : 'Old title'}
          dir={updated ? undefined : 'rtl'}
        >
          {updated ? <span>Current body</span> : <h3>Old heading</h3>}
          <button id="update" onClick={() => setUpdated(true)}>
            Update body
          </button>
        </DialogBody>
      );
    };
    mount(<Updating />);
    cy.get('#body').should('have.attr', 'role', 'region').and('contain.text', 'Old heading');
    cy.get('#update').realClick();
    cy.get('#body')
      .should('contain.text', 'Current body')
      .and('not.contain.text', 'Old heading')
      .should($body => {
        for (const attribute of ['role', 'aria-label', 'title', 'dir']) {
          expect($body[0].hasAttribute(attribute), attribute).to.equal(false);
        }
        expect($body[0].querySelector('h3')).to.equal(null);
      });
  });

  it('preserves caller class and inline layout overrides and resets omitted styles', () => {
    const Updating = () => {
      const styles = useDialogBodyTestStyles();
      const [custom, setCustom] = React.useState(true);
      return (
        <DialogBody
          id="body"
          className={custom ? styles.root : undefined}
          style={custom ? { display: 'flex', maxHeight: '120px', boxSizing: 'content-box' } : undefined}
        >
          <button id="reset" onClick={() => setCustom(false)}>
            Reset layout
          </button>
        </DialogBody>
      );
    };
    mount(<Updating />);
    cy.get('#body')
      .should('have.class', 'fui-DialogBody')
      .and('have.css', 'display', 'flex')
      .and('have.css', 'gap', teamsLightTheme.spacingHorizontalL)
      .and('have.css', 'max-height', '120px')
      .and('have.css', 'box-sizing', 'content-box');
    cy.get('#reset').realClick();
    cy.get('#body')
      .should('have.class', 'fui-DialogBody')
      .and('have.css', 'display', 'grid')
      .and('have.css', 'gap', '8px')
      .and('have.css', 'max-height', '452px')
      .and('have.css', 'box-sizing', 'border-box');
  });

  it('honors consumer hidden state and restores child keyboard navigation', () => {
    const Updating = () => {
      const [hidden, setHidden] = React.useState(true);
      return (
        <>
          <button id="reveal" onClick={() => setHidden(false)}>
            Reveal
          </button>
          <DialogBody id="body" hidden={hidden}>
            <button id="inside">Inside body</button>
          </DialogBody>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#body').should('not.be.visible');
    cy.get('#reveal').realClick().realPress('Tab');
    cy.get('#body').should('be.visible').and('not.have.attr', 'hidden');
    cy.get('#inside').should('be.focused');
  });

  for (const width of [480, 481]) {
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`positions start and end actions across the ${width}px breakpoint in ${dir}`, () => {
        cy.viewport(width, 600);
        mount(
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <DialogBody id="body">
              <DialogTitle id="title" action={null}>
                Layout
              </DialogTitle>
              <DialogContent id="content">Details</DialogContent>
              <DialogActions id="start" position="start">
                <button id="start-button">Back</button>
              </DialogActions>
              <DialogActions id="end" position="end">
                <button id="end-button">Next</button>
              </DialogActions>
            </DialogBody>
          </FluentProvider>,
        );
        cy.get('#body').should($body => {
          const body = $body[0];
          const view = body.ownerDocument.defaultView!;
          const start = body.querySelector('#start')!;
          const end = body.querySelector('#end')!;
          expect(view.getComputedStyle(body.querySelector('#content')!).gridColumn).to.equal('1 / 4');
          expect(view.getComputedStyle(start).gridColumn).to.equal(width === 480 ? '1 / 4' : '1 / 2');
          expect(view.getComputedStyle(end).gridColumn).to.equal(width === 480 ? '1 / 4' : '2 / 4');
          const s = start.getBoundingClientRect();
          const e = end.getBoundingClientRect();
          if (width === 480) {
            expect(s.bottom).to.be.lessThan(e.top);
            expect(s.width).to.be.closeTo(e.width, 1);
          } else {
            expect(s.top).to.equal(e.top);
            if (dir === 'ltr') {
              expect(s.right).to.be.lessThan(e.left);
            } else {
              expect(e.right).to.be.lessThan(s.left);
            }
          }
        });
        cy.get('#start-button').realClick().should('be.focused').realPress('Tab');
        cy.get('#end-button').should('be.focused');
      });
    }
  }

  it('retains multiple content children and their explicit shared grid placement', () => {
    mount(
      <DialogBody id="body">
        <DialogContent id="one">First content</DialogContent>
        <DialogContent id="two">Second content</DialogContent>
      </DialogBody>,
    );
    cy.get('#body').should($body => {
      expect($body[0].children.length).to.equal(2);
      for (const child of Array.from($body[0].children)) {
        const style = child.ownerDocument.defaultView!.getComputedStyle(child);
        expect(style.gridRow).to.equal('2 / 2');
        expect(style.gridColumn).to.equal('1 / 4');
      }
    });
    cy.get('#one').should('have.text', 'First content');
    cy.get('#two').should('have.text', 'Second content');
  });

  it('renders a typed root render function with native props and children intact', () => {
    const ref = React.createRef<HTMLDivElement>();
    const clicked = cy.stub().as('renderClicked');
    const rootRender: SlotRenderFunction<DialogBodyState['root']> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <button id="render-child">Rendered child</button>
      </Component>
    );
    mount(
      <DialogBody id="body" aria-label="Rendered" ref={ref} onClick={clicked}>
        {rootRender}
      </DialogBody>,
    );
    cy.get('#body')
      .should('have.attr', 'data-rendered', 'true')
      .and('have.attr', 'aria-label', 'Rendered')
      .and('have.class', 'fui-DialogBody')
      .and('have.text', 'Rendered child')
      .should($body => expect(ref.current).to.equal($body[0]));
    cy.get('#render-child').realClick().should('be.focused');
    cy.get('@renderClicked').should('have.been.calledOnce');
  });

  describe('DialogBody meaningful unit-derived contracts', () => {
    it('matches the default snapshot and conformance layout in a real browser', () => {
      mount(<DialogBody id="body">Default DialogBody</DialogBody>);
      cy.get('#body')
        .should('have.text', 'Default DialogBody')
        .and('have.prop', 'tagName', 'DIV')
        .and('have.class', 'fui-DialogBody')
        .and('have.css', 'display', 'grid')
        .and('have.css', 'gap', '8px')
        .and('have.css', 'box-sizing', 'border-box')
        .should($body => {
          const style = $body[0].ownerDocument.defaultView!.getComputedStyle($body[0]);
          expect(style.gridTemplateColumns.split(' ')).to.have.length(3);
          expect(style.gridTemplateRows.split(' ')).to.have.length(2);
        });
    });

    it('forwards an object ref to the body and clears it on unmount', () => {
      const ref = React.createRef<HTMLDivElement>();
      const Updating = () => {
        const [shown, setShown] = React.useState(true);
        return (
          <>
            <button id="unmount" onClick={() => setShown(false)}>
              Unmount body
            </button>
            {shown && (
              <DialogBody id="body" ref={ref}>
                Referenced body
              </DialogBody>
            )}
          </>
        );
      };
      mount(<Updating />);
      cy.get('#body').should($body => expect(ref.current).to.equal($body[0]));
      cy.get('#unmount').realClick();
      cy.get('#body').should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });

    it('detaches replaced callback refs and clears the current ref on unmount', () => {
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
              <DialogBody id="body" ref={phase === 0 ? first : second}>
                Body
              </DialogBody>
            )}
          </>
        );
      };
      mount(<Updating />);
      cy.get('#body').should($body => expect(first.lastCall.args[0]).to.equal($body[0]));
      cy.get('#advance').realClick();
      cy.get('#body').should($body => {
        expect(first.lastCall.args[0]).to.equal(null);
        expect(second.lastCall.args[0]).to.equal($body[0]);
      });
      cy.get('#advance').realClick();
      cy.get('#body').should('not.exist');
      cy.then(() => expect(second.lastCall.args[0]).to.equal(null));
    });

    it('supports typed hook style render recomposition with props refs and native activation', () => {
      const Recombined = React.forwardRef<HTMLElement, DialogBodyProps>((props, ref) => {
        const state = useDialogBody_unstable(props, ref);
        useDialogBodyStyles_unstable(state);
        state.root.title = 'Recomposed body';
        return renderDialogBody_unstable(state);
      });
      const ref = React.createRef<HTMLElement>();
      const clicked = cy.stub().as('recomposedClick');
      mount(
        <Recombined id="body" ref={ref} className="consumer-body" tabIndex={0} onClick={clicked}>
          Recomposed
        </Recombined>,
      );
      cy.get('#body')
        .should('have.class', 'consumer-body')
        .and('have.class', 'fui-DialogBody')
        .and('have.attr', 'title', 'Recomposed body')
        .and('have.text', 'Recomposed')
        .should($body => expect(ref.current).to.equal($body[0]))
        .realClick()
        .should('be.focused');
      cy.get('@recomposedClick').should('have.been.calledOnce');
    });

    it('applies and removes provider custom styles without losing caller props or child focus', () => {
      const ref = React.createRef<HTMLDivElement>();
      const customStyle = (state: unknown) => {
        const bodyState = state as DialogBodyState;
        bodyState.root.style = { ...bodyState.root.style, display: 'flex', gap: teamsLightTheme.spacingHorizontalL };
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
                    useDialogBodyStyles_unstable: customStyle,
                  }
                : {}
            }
          >
            <DialogBody id="body" ref={ref} style={{ width: '280px' }}>
              <button id="reset-provider" onClick={() => setCustom(false)}>
                Reset provider
              </button>
              <button id="next">Next control</button>
            </DialogBody>
          </FluentProvider>
        );
      };
      mountBase(<Updating />);
      cy.get('#body')
        .should('have.css', 'display', 'flex')
        .and('have.css', 'gap', teamsLightTheme.spacingHorizontalL)
        .and('have.css', 'width', '280px')
        .should($body => expect(ref.current).to.equal($body[0]));
      cy.get('#reset-provider').realClick().should('be.focused');
      cy.get('#body')
        .should('have.css', 'display', 'grid')
        .and('have.css', 'gap', '8px')
        .and('have.css', 'width', '280px')
        .should($body => expect(ref.current).to.equal($body[0]));
      cy.realPress('Tab');
      cy.get('#next').should('be.focused');
    });

    it('supports content-only and title-only bodies without inserting absent slots', () => {
      mount(
        <>
          <DialogBody id="minimal">
            <DialogContent id="only-content">Only details</DialogContent>
          </DialogBody>
          <DialogBody id="heading-only">
            <DialogTitle action={null}>Only title</DialogTitle>
          </DialogBody>
        </>,
      );
      cy.get('#minimal')
        .should($body => {
          expect($body[0].children.length).to.equal(1);
          expect($body[0].querySelector('.fui-DialogTitle, .fui-DialogActions')).to.equal(null);
        })
        .and('have.text', 'Only details');
      cy.get('#heading-only').should($body => {
        expect($body[0].children.length).to.equal(1);
        expect(getByRole($body[0], 'heading', { level: 2, name: 'Only title' })).to.be.visible;
        expect($body[0].querySelector('.fui-DialogContent, .fui-DialogActions')).to.equal(null);
      });
    });
  });
});
describe('DialogBody documented form and scrolling scenarios', () => {
  it('preserves native form validation submission and editable content inside the body', () => {
    const submitted = cy.stub().as('submitted');
    mount(
      <Dialog defaultOpen modalType="non-modal">
        <DialogSurface id="surface">
          <form
            onSubmit={event => {
              event.preventDefault();
              submitted();
            }}
          >
            <DialogBody id="body">
              <DialogTitle action={null}>Body form</DialogTitle>
              <DialogContent>
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required />
              </DialogContent>
              <DialogActions>
                <button id="submit" type="submit">
                  Submit
                </button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>,
    );
    settled();
    cy.get('#body').should('have.css', 'display', 'grid');
    cy.get('#submit').realClick();
    cy.get('@submitted').should('not.have.been.called');
    cy.get('#email').should('be.focused').and('match', ':invalid').realType('person@example.com').realPress('Enter');
    cy.get('@submitted').should('have.been.calledOnce');
    cy.get('#body').should('be.visible');
  });

  for (const height of [359, 360, 600]) {
    it(`constrains the body and keeps long content and actions reachable at ${height}px height`, () => {
      cy.viewport(800, height);
      mount(
        <Example>
          <LongContent />
        </Example>,
      );
      cy.get('#open').realClick();
      settled();
      cy.get('#body').should('have.css', 'max-height', height === 359 ? 'none' : `${height - 48}px`);
      const scrollable = height === 359 ? '#surface' : '#content';
      cy.get(scrollable)
        .should($element => {
          expect($element[0].scrollHeight).to.be.greaterThan($element[0].clientHeight);
          expect($element[0].clientHeight).to.be.greaterThan(0);
        })
        .scrollTo('bottom')
        .should($element => expect($element[0].scrollTop).to.be.greaterThan(0));
      cy.get('#last').realClick().should('be.focused').realPress('Tab');
      cy.get('#close')
        .should('be.focused')
        .should($close => {
          const rect = $close[0].getBoundingClientRect();
          expect(rect.top).to.be.at.least(0);
          expect(rect.bottom).to.be.at.most(height);
        })
        .realPress('Enter');
      cy.get('#body').should('not.exist');
    });
  }
});
