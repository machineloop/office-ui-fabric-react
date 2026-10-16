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
  renderDialogContent_unstable,
  useDialogContentStyles_unstable,
  useDialogContent_unstable,
} from '@fluentui/react-dialog';
import type { DialogContentProps, DialogContentState } from '@fluentui/react-dialog';
import { useDialogContentTestStyles } from './DialogContentTestStyles.styles';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const settled = () =>
  cy
    .get('#surface')
    .should($surface =>
      expect(
        $surface[0].getAnimations({ subtree: true }).some(animation => animation.playState === 'running'),
      ).to.equal(false),
    );

const Example = ({
  children = 'Confirm this change.',
  description = true,
  modalType = 'modal',
  content,
}: {
  children?: React.ReactNode;
  description?: boolean;
  modalType?: 'modal' | 'alert' | 'non-modal';
  content?: React.ComponentProps<typeof DialogContent>;
}) => (
  <Dialog modalType={modalType}>
    <DialogTrigger disableButtonEnhancement>
      <button id="open">Open content</button>
    </DialogTrigger>
    <DialogSurface id="surface" aria-describedby={description ? 'content' : undefined}>
      <DialogBody>
        <DialogTitle action={null}>Content contract</DialogTitle>
        <DialogContent id="content" {...content}>
          {children}
        </DialogContent>
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <button id="close">Close content</button>
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

const LongContent = () => (
  <>
    <button id="content-first">First content action</button>
    {Array.from({ length: 60 }, (_, index) => (
      <p key={index}>Content paragraph {index + 1}: This information remains available when the dialog overflows.</p>
    ))}
    <button id="content-last">Last content action</button>
  </>
);

describe('DialogContent documented scenarios', () => {
  for (const modalType of ['modal', 'alert', 'non-modal'] as const) {
    it(`renders short content as the explicit accessible description for ${modalType}`, () => {
      mount(<Example modalType={modalType} />);
      open();
      cy.get('#content').should('be.visible').and('have.text', 'Confirm this change.');
      cy.get('#surface').should($surface => {
        expect(
          getByRole($surface[0].ownerDocument.body, modalType === 'alert' ? 'alertdialog' : 'dialog', {
            name: 'Content contract',
            description: 'Confirm this change.',
          }),
        ).to.equal($surface[0]);
      });
      cy.get('#close').realClick();
      cy.get('#content').should('not.exist');
    });
  }
});

describe('DialogContent supported native API and accessibility edges', () => {
  for (const [name, children, text] of [
    ['empty', undefined, ''],
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
    it(`preserves ${name} children without adding behavior or a role`, () => {
      mount(<DialogContent id="content">{children}</DialogContent>);
      cy.get('#content')
        .should('have.prop', 'tagName', 'DIV')
        .and('have.text', text)
        .and('have.css', 'min-height', '32px')
        .should($content => expect($content[0].hasAttribute('role')).to.equal(false));
    });
  }

  it('forwards div native attributes and explicit accessible semantics', () => {
    mount(
      <DialogContent
        as="div"
        id="content"
        role="region"
        aria-label="Details"
        title="Read details"
        tabIndex={0}
        lang="fr"
        dir="rtl"
        data-owner="consumer"
      >
        Détails
      </DialogContent>,
    );
    cy.get('#content')
      .should('have.attr', 'title', 'Read details')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-owner', 'consumer')
      .and('have.attr', 'tabindex', '0')
      .should($content =>
        expect(getByRole($content[0].ownerDocument.body, 'region', { name: 'Details' })).to.equal($content[0]),
      )
      .realClick()
      .should('be.focused');
  });

  it('uses current native handlers after rerender and honors consumer preventDefault', () => {
    const events: string[] = [];
    const prevented: boolean[] = [];
    const Updating = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <div onKeyDown={event => prevented.push(event.defaultPrevented)}>
          <DialogContent
            id="content"
            tabIndex={0}
            onClick={event => {
              events.push(updated ? 'new-click' : 'old-click');
              event.preventDefault();
            }}
            onKeyDown={event => {
              events.push(`${updated ? 'new' : 'old'}-${event.key}`);
              event.preventDefault();
            }}
            onFocus={() => events.push(updated ? 'new-focus' : 'old-focus')}
          >
            <button id="update" onClick={() => setUpdated(true)}>
              Update handlers
            </button>
          </DialogContent>
        </div>
      );
    };
    mount(<Updating />);
    cy.get('#content').realClick({ position: 'topLeft' }).realPress('a');
    cy.get('#update').realClick();
    cy.get('#content').realClick({ position: 'topLeft' }).realPress('b');
    cy.then(() => {
      expect(events).to.include.members(['old-click', 'old-a', 'old-focus', 'new-click', 'new-b', 'new-focus']);
      expect(events.filter(event => event === 'old-a')).to.have.length(1);
      expect(events.filter(event => event === 'new-b')).to.have.length(1);
      expect(prevented).to.deep.equal([true, true]);
    });
    cy.get('#content').should('exist');
  });

  it('preserves caller Griffel and inline overrides and removes them back to defaults', () => {
    const Updating = () => {
      const styles = useDialogContentTestStyles();
      const [custom, setCustom] = React.useState(true);
      return (
        <DialogContent
          id="content"
          className={custom ? styles.root : undefined}
          style={custom ? { maxHeight: '100px', boxSizing: 'content-box' } : undefined}
        >
          <button id="reset" onClick={() => setCustom(false)}>
            Reset content styles
          </button>
        </DialogContent>
      );
    };
    mount(<Updating />);
    cy.get('#content')
      .should('have.class', 'fui-DialogContent')
      .and('have.css', 'overflow-y', 'scroll')
      .and('have.css', 'min-height', '64px')
      .and('have.css', 'padding-top', teamsLightTheme.spacingHorizontalL)
      .and('have.css', 'max-height', '100px')
      .and('have.css', 'box-sizing', 'content-box');
    cy.get('#reset').realClick();
    cy.get('#content')
      .should('have.class', 'fui-DialogContent')
      .and('have.css', 'overflow-y', 'auto')
      .and('have.css', 'min-height', '32px')
      .and('have.css', 'padding-top', teamsLightTheme.strokeWidthThick)
      .and('have.css', 'max-height', 'none')
      .and('have.css', 'box-sizing', 'border-box');
  });

  it('preserves caller scrolling overrides at the short-screen boundary', () => {
    cy.viewport(800, 359);
    const Styled = () => {
      const styles = useDialogContentTestStyles();
      return (
        <Example content={{ className: styles.root, style: { maxHeight: '100px', overflowY: 'scroll' } }}>
          <LongContent />
        </Example>
      );
    };
    mount(<Styled />);
    open();
    cy.get('#content')
      .should('have.css', 'overflow-y', 'scroll')
      .should($content => expect($content[0].scrollHeight).to.be.greaterThan($content[0].clientHeight))
      .scrollTo('bottom')
      .should($content => expect($content[0].scrollTop).to.be.greaterThan(0));
    cy.get('#content-last').realClick().should('be.focused');
    cy.get('#close').realClick();
    cy.get('#content').should('not.exist');
  });

  it('updates content and native attributes without retaining removed semantics', () => {
    const Updating = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <DialogContent
          id="content"
          role={updated ? undefined : 'region'}
          aria-label={updated ? undefined : 'Old details'}
          title={updated ? undefined : 'Old title'}
          data-phase={updated ? 'new' : 'old'}
        >
          <p>{updated ? 'Current details' : 'Old details'}</p>
          <button id="update" onClick={() => setUpdated(true)}>
            Update details
          </button>
        </DialogContent>
      );
    };
    mount(<Updating />);
    cy.get('#content').should('have.attr', 'role', 'region').and('contain.text', 'Old details');
    cy.get('#update').realClick();
    cy.get('#content')
      .should('contain.text', 'Current details')
      .and('not.contain.text', 'Old details')
      .and('have.attr', 'data-phase', 'new')
      .should($content => {
        for (const attribute of ['role', 'aria-label', 'title']) {
          expect($content[0].hasAttribute(attribute), attribute).to.equal(false);
        }
      });
  });

  it('preserves consumer hidden state and restores keyboard-reachable content on removal', () => {
    const Updating = () => {
      const [hidden, setHidden] = React.useState(true);
      return (
        <>
          <button id="reveal" onClick={() => setHidden(false)}>
            Reveal
          </button>
          <DialogContent id="content" hidden={hidden}>
            <button id="inside">Inside</button>
          </DialogContent>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#content').should('not.be.visible');
    cy.get('#reveal').realClick().realPress('Tab');
    cy.get('#inside').should('be.focused');
    cy.get('#content').should('be.visible').and('not.have.attr', 'hidden');
  });
});

describe('DialogContent documented complex and overflowing content', () => {
  it('leaves complex content navigable without an implicit description', () => {
    mount(
      <Example description={false}>
        <h3>Account details</h3>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
        <a id="help" href="#email">
          Email help
        </a>
      </Example>,
    );
    open();
    cy.get('#surface').should($surface =>
      expect(getByRole($surface[0].ownerDocument.body, 'dialog', { description: '' })).to.equal($surface[0]),
    );
    cy.get('#content').should($content => {
      expect(getByRole($content[0], 'heading', { name: 'Account details' })).to.be.visible;
      expect(getByRole($content[0], 'textbox', { name: 'Email' })).to.be.visible;
    });
    cy.get('#email').should('be.focused').realType('person@example.com').realPress('Tab');
    cy.get('#help').should('be.focused');
    cy.get('#email').should('have.value', 'person@example.com');
    cy.get('#close').realClick();
    cy.get('#content').should('not.exist');
  });

  it('hosts form validation and correction without closing on invalid input', () => {
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
            <DialogBody>
              <DialogTitle action={null}>Registration</DialogTitle>
              <DialogContent id="content">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required />
                <label htmlFor="password">Password</label>
                <input id="password" type="password" required />
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
    cy.get('#submit').realClick();
    cy.get('@submitted').should('not.have.been.called');
    cy.get('#email').should('be.focused').and('match', ':invalid').realType('person@example.com');
    cy.get('#password').realClick().realType('example-password');
    cy.get('#submit').realClick();
    cy.get('@submitted').should('have.been.calledOnce');
    cy.get('#content').should('be.visible');
  });

  it('scrolls long content within the viewport while leaving the footer reachable', () => {
    cy.viewport(800, 600);
    mount(
      <Example description={false}>
        <LongContent />
      </Example>,
    );
    open();
    cy.get('#content').should($content => {
      const content = $content[0];
      expect(content.scrollHeight).to.be.greaterThan(content.clientHeight);
      expect(content.clientHeight).to.be.greaterThan(0);
      expect(content.getBoundingClientRect().bottom).to.be.lessThan(600);
      expect(content.ownerDocument.defaultView!.getComputedStyle(content).overflowY).to.equal('auto');
    });
    cy.get('#content')
      .scrollTo('bottom')
      .should($content => expect($content[0].scrollTop).to.be.greaterThan(0));
    cy.get('#content-last').should('be.visible').realClick().should('be.focused').realPress('Tab');
    cy.get('#close').should('be.focused').realPress('Enter');
    cy.get('#content').should('not.exist');
  });

  for (const height of [359, 360]) {
    it(`uses the correct scrolling owner at the ${height}px short-screen boundary`, () => {
      cy.viewport(800, height);
      mount(
        <Example description={false}>
          <LongContent />
        </Example>,
      );
      open();
      cy.get('#content').should($content => {
        expect($content[0].ownerDocument.defaultView!.getComputedStyle($content[0]).overflowY).to.equal(
          height === 359 ? 'visible' : 'auto',
        );
      });
      const owner = height === 359 ? '#surface' : '#content';
      cy.get(owner).should($owner => expect($owner[0].scrollHeight).to.be.greaterThan($owner[0].clientHeight));
      cy.get(owner)
        .scrollTo('bottom')
        .should($owner => expect($owner[0].scrollTop).to.be.greaterThan(0));
      cy.get('#content-last').should('be.visible').realClick().should('be.focused').realPress('Tab');
      cy.get('#close').should('be.focused').realPress('Enter');
      cy.get('#content').should('not.exist');
    });
  }

  it('keeps rich text, lists, and nested interactive content in semantic order', () => {
    mount(
      <Example description={false}>
        <h3>Review</h3>
        <p>
          Read <strong>all</strong> items.
        </p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <button id="nested">Content action</button>
      </Example>,
    );
    open();
    cy.get('#content').should($content => {
      expect(getByRole($content[0], 'list').textContent).to.equal('First itemSecond item');
      expect(getByRole($content[0], 'heading', { name: 'Review' })).to.equal($content[0].firstElementChild);
      expect(getByRole($content[0], 'button', { name: 'Content action' })).to.equal($content[0].lastElementChild);
      expect(Array.from($content[0].children, child => child.tagName)).to.deep.equal(['H3', 'P', 'UL', 'BUTTON']);
    });
    cy.get('#nested').should('be.focused').realPress('Tab');
    cy.get('#close').should('be.focused').realPress('Enter');
    cy.get('#content').should('not.exist');
  });
});

describe('DialogContent meaningful unit-derived contracts', () => {
  it('applies provider custom styling to real scrolling and resets it without losing the content ref', () => {
    cy.viewport(800, 600);
    const ref = React.createRef<HTMLDivElement>();
    const customStyle = (state: unknown) => {
      const contentState = state as DialogContentState;
      contentState.root.style = { ...contentState.root.style, maxHeight: '100px', overflowY: 'auto' };
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
                  useDialogContentStyles_unstable: customStyle,
                }
              : {}
          }
        >
          <Example description={false} content={{ ref, style: { width: '280px' } }}>
            {Array.from({ length: 40 }, (_, index) => (
              <p key={index}>Provider content paragraph {index}</p>
            ))}
            <button id="reset-provider" onClick={() => setCustom(false)}>
              Reset provider style
            </button>
          </Example>
        </FluentProvider>
      );
    };
    mountBase(<Updating />);
    open();
    cy.get('#content')
      .should('have.css', 'max-height', '100px')
      .and('have.css', 'width', '280px')
      .should($content => {
        expect(ref.current).to.equal($content[0]);
        expect($content[0].clientHeight).to.be.at.most(100);
        expect($content[0].scrollHeight).to.be.greaterThan($content[0].clientHeight);
      })
      .scrollTo('bottom')
      .should($content => expect($content[0].scrollTop).to.be.greaterThan(0));
    cy.get('#reset-provider').realClick().should('be.focused');
    cy.get('#content')
      .should('have.css', 'max-height', 'none')
      .and('have.css', 'width', '280px')
      .should($content => {
        expect(ref.current).to.equal($content[0]);
        expect($content[0].clientHeight).to.be.greaterThan(100);
      });
    cy.get('#reset-provider').realPress('Tab');
    cy.get('#close').should('be.focused').realPress('Enter');
    cy.get('#content').should('not.exist');
    cy.then(() => expect(ref.current).to.equal(null));
  });

  it('matches default conformance styling and grid placement in the browser', () => {
    mount(<DialogContent id="content">Default DialogContent</DialogContent>);
    cy.get('#content')
      .should('have.class', 'fui-DialogContent')
      .and('have.text', 'Default DialogContent')
      .and('have.css', 'box-sizing', 'border-box')
      .and('have.css', 'overflow-y', 'auto')
      .and('have.css', 'grid-row-start', '2')
      .and('have.css', 'grid-row-end', '2')
      .and('have.css', 'grid-column-start', '1')
      .and('have.css', 'grid-column-end', '4')
      .and('have.css', 'padding-top', teamsLightTheme.strokeWidthThick)
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
      .and('have.css', 'line-height', teamsLightTheme.lineHeightBase300);
  });

  it('forwards an object ref to the actual content and clears it on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Updating = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button id="unmount" onClick={() => setShown(false)}>
            Unmount content
          </button>
          {shown && (
            <DialogContent id="content" ref={ref}>
              Referenced content
            </DialogContent>
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#content').should($content => expect(ref.current).to.equal($content[0]));
    cy.get('#unmount').realClick();
    cy.get('#content').should('not.exist');
    cy.then(() => expect(ref.current).to.equal(null));
  });

  it('detaches a replaced callback ref and cleans up the current ref', () => {
    const first = cy.stub().as('firstRef');
    const second = cy.stub().as('secondRef');
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance" onClick={() => setPhase(value => value + 1)}>
            Advance ref
          </button>
          {phase < 2 && (
            <DialogContent id="content" ref={phase === 0 ? first : second}>
              Content
            </DialogContent>
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#content').should($content => expect(first.lastCall.args[0]).to.equal($content[0]));
    cy.get('#advance').realClick();
    cy.get('#content').should($content => {
      expect(first.lastCall.args[0]).to.equal(null);
      expect(second.lastCall.args[0]).to.equal($content[0]);
    });
    cy.get('#advance').realClick();
    cy.get('#content').should('not.exist');
    cy.then(() => expect(second.lastCall.args[0]).to.equal(null));
  });

  it('preserves the root render-function slot props, ref, and native activation', () => {
    const ref = React.createRef<HTMLDivElement>();
    const clicked = cy.stub().as('clicked');
    const renderRoot: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props} data-rendered="custom">
        <button id="inside">Slot action</button>
      </Component>
    );
    mount(
      <DialogContent id="content" aria-label="Custom details" role="region" ref={ref} onClick={clicked}>
        {renderRoot}
      </DialogContent>,
    );
    cy.get('#content')
      .should('have.class', 'fui-DialogContent')
      .and('have.attr', 'data-rendered', 'custom')
      .should($content => {
        expect(ref.current).to.equal($content[0]);
        expect(getByRole($content[0].ownerDocument.body, 'region', { name: 'Custom details' })).to.equal($content[0]);
      });
    cy.get('#inside').realClick();
    cy.get('@clicked').should('have.been.calledOnce');
  });

  it('supports typed hook/style/render recomposition without losing props or refs', () => {
    const Recombined = React.forwardRef<HTMLDivElement, DialogContentProps>((props, ref) => {
      const state = useDialogContent_unstable(props, ref);
      useDialogContentStyles_unstable(state);
      state.root.title = 'Recomposed root';
      return renderDialogContent_unstable(state);
    });
    const ref = React.createRef<HTMLDivElement>();
    const clicked = cy.stub().as('clicked');
    mount(
      <Recombined id="content" ref={ref} className="consumer-content" tabIndex={0} onClick={clicked}>
        Recomposed content
      </Recombined>,
    );
    cy.get('#content')
      .should('have.class', 'fui-DialogContent')
      .and('have.class', 'consumer-content')
      .and('have.attr', 'title', 'Recomposed root')
      .and('have.text', 'Recomposed content')
      .and('have.css', 'overflow-y', 'auto')
      .should($content => expect(ref.current).to.equal($content[0]))
      .realClick()
      .should('be.focused');
    cy.get('@clicked').should('have.been.calledOnce');
  });
});
