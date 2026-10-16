import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Link, LinkContextProvider } from '@fluentui/react-link';
import { Button } from '@fluentui/react-button';
import { getByRole } from '@testing-library/dom';
import { MessageBar, MessageBarActions, MessageBarBody, MessageBarTitle } from '@fluentui/react-message-bar';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { useBodyOverrideStyles } from '../../testing/MessageBarBody.cy.styles';
import { MessageBarContextProvider } from '../../contexts/messageBarContext';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const body = () => cy.get('[data-testid="body"]');
const assertInlineLink = (selector = '.fui-Link') =>
  cy.get(selector).should('have.css', 'text-decoration-line', 'underline');
const wrap = (element: JSXElement) => <FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>;

describe('MessageBarBody unit-derived conformance and source contracts', () => {
  it('forwards an object ref to the actual div and clears it on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <MessageBarBody ref={ref} data-testid="body">
        Referenced
      </MessageBarBody>,
    ).then(({ rerender }) => {
      body().should($body => {
        expect(ref.current).to.equal($body[0]);
        expect(ref.current).to.be.instanceOf($body[0].ownerDocument.defaultView!.HTMLDivElement);
      });
      cy.then(() => rerender(wrap(<></>)));
      body().should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  });

  it('cleans up the previous callback ref when replaced and the latest one on unmount', () => {
    const first = cy.stub().as('firstRef');
    const second = cy.stub().as('secondRef');
    mount(
      <MessageBarBody ref={first} data-testid="body">
        Referenced
      </MessageBarBody>,
    ).then(({ rerender }) => {
      let root: HTMLElement;
      body().then($body => {
        root = $body[0];
        expect(first.lastCall.args[0]).to.equal(root);
      });
      cy.then(() =>
        rerender(
          wrap(
            <MessageBarBody ref={second} data-testid="body">
              Updated
            </MessageBarBody>,
          ),
        ),
      );
      body().should($body => {
        expect($body[0]).to.equal(root);
        expect(first.lastCall.args[0]).to.equal(null);
        expect(second.lastCall.args[0]).to.equal(root);
      });
      cy.then(() => rerender(wrap(<></>)));
      body().should('not.exist');
      cy.then(() => expect(second.lastCall.args[0]).to.equal(null));
    });
  });

  it('merges caller and MessageBar context refs and releases both on removal', () => {
    const caller = React.createRef<HTMLDivElement>();
    const contextBody = { current: null as HTMLDivElement | null };
    const actionsRef = { current: null as HTMLDivElement | null };
    mount(
      <MessageBarContextProvider
        value={{ layout: 'singleline', titleId: 'ref-title', bodyRef: contextBody, actionsRef }}
      >
        <MessageBarBody data-testid="body" ref={caller}>
          Merged refs
        </MessageBarBody>
      </MessageBarContextProvider>,
    ).then(({ rerender }) => {
      body().should($body => {
        expect(caller.current).to.equal($body[0]);
        expect(contextBody.current).to.equal($body[0]);
      });
      cy.then(() => rerender(wrap(<></>)));
      body().should('not.exist');
      cy.then(() => {
        expect(caller.current).to.equal(null);
        expect(contextBody.current).to.equal(null);
      });
    });
  });

  it('keeps independent body refs and inline contexts isolated across sibling MessageBars', () => {
    const first = React.createRef<HTMLDivElement>();
    const second = React.createRef<HTMLDivElement>();
    mount(
      <>
        <MessageBar>
          <MessageBarBody ref={first} data-testid="first-body">
            <Link>First</Link>
          </MessageBarBody>
        </MessageBar>
        <MessageBar>
          <MessageBarBody ref={second} data-testid="second-body">
            <Link>Second</Link>
          </MessageBarBody>
        </MessageBar>
      </>,
    ).then(({ rerender }) => {
      cy.get('[data-testid="first-body"]').should($body => expect(first.current).to.equal($body[0]));
      cy.get('[data-testid="second-body"]').should($body => {
        expect(second.current).to.equal($body[0]);
        expect(first.current).not.to.equal(second.current);
      });
      assertInlineLink();
      cy.then(() =>
        rerender(
          wrap(
            <>
              <MessageBar>
                <MessageBarBody ref={first} data-testid="first-body">
                  Updated first
                </MessageBarBody>
              </MessageBar>
              <MessageBar>
                <MessageBarBody ref={second} data-testid="second-body">
                  <Link>Second</Link>
                </MessageBarBody>
              </MessageBar>
            </>,
          ),
        ),
      );
      cy.get('[data-testid="first-body"]').should('have.text', 'Updated first');
      cy.get('[data-testid="second-body"]')
        .should('have.text', 'Second')
        .should($body => expect(second.current).to.equal($body[0]));
      assertInlineLink();
    });
  });

  it('preserves static and caller class names, replaces the caller class and removes it on omission', () => {
    mount(
      <MessageBarBody className="first-body-class" data-testid="body">
        Classes
      </MessageBarBody>,
    ).then(({ rerender }) => {
      body().should('have.class', 'first-body-class').and('have.class', 'fui-MessageBarBody');
      cy.then(() =>
        rerender(
          wrap(
            <MessageBarBody className="second-body-class" data-testid="body">
              Classes
            </MessageBarBody>,
          ),
        ),
      );
      body()
        .should('not.have.class', 'first-body-class')
        .and('have.class', 'second-body-class')
        .and('have.class', 'fui-MessageBarBody');
      cy.then(() => rerender(wrap(<MessageBarBody data-testid="body">Classes</MessageBarBody>)));
      body().should('not.have.class', 'second-body-class').and('have.class', 'fui-MessageBarBody');
    });
  });

  it('supports root render-function children without losing refs, styling or inline Link context', () => {
    const ref = React.createRef<HTMLDivElement>();
    const activate = cy.stub().as('renderedActivate');
    const renderRoot: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props}>
        <Link onClick={activate}>Rendered help</Link>
      </Component>
    );
    mount(
      <MessageBarBody data-testid="body" ref={ref} className="rendered-body">
        {renderRoot}
      </MessageBarBody>,
    );
    body()
      .should('have.class', 'rendered-body')
      .and('have.class', 'fui-MessageBarBody')
      .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM)
      .should($body => expect(ref.current).to.equal($body[0]));
    assertInlineLink();
    cy.get('.fui-Link').click();
    cy.get('@renderedActivate').should('have.been.calledOnce');
  });

  it('forwards the latest click handler with native target/currentTarget and removes stale handlers', () => {
    const first = cy.stub().as('firstClick');
    const second = cy.stub().as('secondClick');
    const render = (handle?: (target: EventTarget, currentTarget: EventTarget) => void) => (
      <MessageBarBody
        data-testid="body"
        onClick={handle ? event => handle(event.target, event.currentTarget) : undefined}
      >
        <button data-testid="child">Action</button>
      </MessageBarBody>
    );
    mount(render(first)).then(({ rerender }) => {
      cy.get('[data-testid="child"]').click();
      body().then($body => {
        expect(first).to.have.been.calledOnce;
        expect(first.firstCall.args[0]).to.equal($body[0].querySelector('button'));
        expect(first.firstCall.args[1]).to.equal($body[0]);
      });
      cy.then(() => rerender(wrap(render(second))));
      cy.get('[data-testid="child"]').click();
      cy.get('@firstClick').should('have.been.calledOnce');
      cy.get('@secondClick').should('have.been.calledOnce');
      cy.then(() => rerender(wrap(render())));
      cy.get('[data-testid="child"]').click();
      cy.get('@firstClick').should('have.been.calledOnce');
      cy.get('@secondClick').should('have.been.calledOnce');
    });
  });

  it('forwards focus, blur and native key events when the caller makes the root focusable', () => {
    const focus = cy.stub().as('bodyFocus');
    const blur = cy.stub().as('bodyBlur');
    const key = cy.stub().as('bodyKey');
    mount(
      <>
        <MessageBarBody
          data-testid="body"
          tabIndex={0}
          onFocus={event => focus(event.target, event.currentTarget)}
          onBlur={event => blur(event.target, event.currentTarget)}
          onKeyDown={event => key(event.key, event.currentTarget)}
        >
          Focusable body
        </MessageBarBody>
        <button data-testid="after">After</button>
      </>,
    );
    body().focus().should('be.focused');
    body().then($body => expect(focus).to.have.been.calledWith($body[0], $body[0]));
    cy.realPress('Enter');
    body().then($body => expect(key).to.have.been.calledWith('Enter', $body[0]));
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    body().then($body => expect(blur).to.have.been.calledWith($body[0], $body[0]));
  });
});

describe('MessageBarBody documented body styling', () => {
  it('renders the default div and readable body typography with token spacing', () => {
    mount(<MessageBarBody data-testid="body">Default MessageBarBody</MessageBarBody>);
    body()
      .should('have.prop', 'tagName', 'DIV')
      .and('have.class', 'fui-MessageBarBody')
      .and('have.text', 'Default MessageBarBody')
      .and('be.visible')
      .and('have.css', 'font-family', teamsLightTheme.fontFamilyBase)
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
      .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular))
      .and('have.css', 'line-height', teamsLightTheme.lineHeightBase300)
      .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM)
      .and('have.css', 'grid-area', 'body');
  });
});

describe('MessageBarBody supported edge and accessibility contracts', () => {
  for (const [name, children] of [
    ['omitted', undefined],
    ['null', null],
    ['empty string', ''],
    ['empty array', []],
  ] as const) {
    it(`preserves the required styled root for ${name} children`, () => {
      mount(<MessageBarBody data-testid="body">{children}</MessageBarBody>);
      body()
        .should('have.prop', 'tagName', 'DIV')
        .and('have.class', 'fui-MessageBarBody')
        .and('have.text', '')
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM);
    });
  }

  it('renders mixed children literally without extra wrappers or escaping regressions', () => {
    mount(
      <MessageBarBody data-testid="body">
        {'<status> & useful '}
        {0}
        <strong>important</strong>
        <> details</>
      </MessageBarBody>,
    );
    body().should('have.text', '<status> & useful 0important details');
    body().children().should('have.length', 1).and('have.prop', 'tagName', 'STRONG');
  });

  it('updates and clears body content while preserving root identity', () => {
    mount(<MessageBarBody data-testid="body">Initial</MessageBarBody>).then(({ rerender }) => {
      let root: HTMLElement;
      body().then($body => {
        root = $body[0];
      });
      cy.then(() => rerender(wrap(<MessageBarBody data-testid="body">Updated</MessageBarBody>)));
      body()
        .should('have.text', 'Updated')
        .should($body => expect($body[0]).to.equal(root));
      cy.then(() => rerender(wrap(<MessageBarBody data-testid="body" />)));
      body()
        .should('have.text', '')
        .should($body => expect($body[0]).to.equal(root));
    });
  });

  it('scopes inline Link context to descendants and overrides an outer non-inline context', () => {
    mount(
      <LinkContextProvider value={{ inline: false }}>
        <Link data-testid="before">Before</Link>
        <MessageBarBody data-testid="body">
          <span>
            <Link data-testid="inside">Inside</Link>
          </span>
        </MessageBarBody>
        <Link data-testid="after">After</Link>
      </LinkContextProvider>,
    );
    assertInlineLink('[data-testid="inside"]');
    cy.get('[data-testid="before"]').should('have.css', 'text-decoration-line', 'none');
    cy.get('[data-testid="after"]').should('have.css', 'text-decoration-line', 'none');
  });

  it('respects explicit Link inline false and restores inherited inline on prop omission', () => {
    const render = (inline?: boolean) => (
      <MessageBarBody data-testid="body">
        <Link inline={inline}>Help</Link>
      </MessageBarBody>
    );
    mount(render(false)).then(({ rerender }) => {
      cy.get('.fui-Link').should('have.css', 'text-decoration-line', 'none');
      cy.then(() => rerender(wrap(render(true))));
      assertInlineLink();
      cy.then(() => rerender(wrap(render(false))));
      cy.get('.fui-Link').should('have.css', 'text-decoration-line', 'none');
      cy.then(() => rerender(wrap(render())));
      assertInlineLink();
    });
  });

  it('supports native anchor role, name, href and accessible description inside the body', () => {
    mount(
      <>
        <span id="help-description">Opens contextual help</span>
        <MessageBarBody data-testid="body">
          <Link href="#body-help" aria-describedby="help-description">
            Help
          </Link>
        </MessageBarBody>
      </>,
    );
    body().should($body => {
      const link = getByRole($body[0], 'link', { name: 'Help', description: 'Opens contextual help' });
      expect(link.getAttribute('href')).to.equal('#body-help');
    });
    assertInlineLink();
  });

  it('does not add a tab stop and preserves native tab order and Enter activation of descendants', () => {
    const help = cy.stub().as('keyboardHelp');
    const retry = cy.stub().as('keyboardRetry');
    mount(
      <>
        <button data-testid="before">Before</button>
        <MessageBarBody data-testid="body">
          Text <Link onClick={help}>Help</Link> <button onClick={retry}>Retry</button>
        </MessageBarBody>
        <button data-testid="after">After</button>
      </>,
    );
    body().should($body => {
      expect($body[0].hasAttribute('tabindex')).to.equal(false);
      expect($body[0].hasAttribute('role')).to.equal(false);
    });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('.fui-Link').should('be.focused');
    cy.realPress('Enter');
    cy.get('@keyboardHelp').should('have.been.calledOnce');
    cy.realPress('Tab');
    cy.contains('button', 'Retry').should('be.focused');
    cy.realPress('Enter');
    cy.get('@keyboardRetry').should('have.been.calledOnce');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.contains('button', 'Retry').should('be.focused');
  });

  it('forwards caller role, accessible name and description and cleans them up on omission', () => {
    mount(
      <>
        <span id="body-description">Detailed status</span>
        <MessageBarBody
          data-testid="body"
          role="region"
          aria-label="Current status"
          aria-describedby="body-description"
        >
          Useful content
        </MessageBarBody>
      </>,
    ).then(({ rerender }) => {
      body().should($body => {
        expect(
          getByRole($body[0].ownerDocument.body, 'region', {
            name: 'Current status',
            description: 'Detailed status',
          }),
        ).to.equal($body[0]);
      });
      cy.then(() => rerender(wrap(<MessageBarBody data-testid="body">Useful content</MessageBarBody>)));
      body().should($body => {
        for (const attribute of ['role', 'aria-label', 'aria-describedby']) {
          expect($body[0].hasAttribute(attribute), attribute).to.equal(false);
        }
      });
    });
  });

  it('forwards native id, title, language, direction and data attributes and clears omitted values', () => {
    mount(
      <MessageBarBody data-testid="body" id="custom-body" title="Details" lang="ar" dir="rtl" data-status="warning">
        Useful content
      </MessageBarBody>,
    ).then(({ rerender }) => {
      body()
        .should('have.id', 'custom-body')
        .and('have.attr', 'title', 'Details')
        .and('have.attr', 'lang', 'ar')
        .and('have.attr', 'dir', 'rtl')
        .and('have.attr', 'data-status', 'warning');
      cy.then(() =>
        rerender(
          wrap(
            <MessageBarBody
              data-testid="body"
              id="updated-body"
              title="Updated"
              lang="en"
              dir="ltr"
              data-status="success"
            />,
          ),
        ),
      );
      body()
        .should('have.id', 'updated-body')
        .and('have.attr', 'title', 'Updated')
        .and('have.attr', 'lang', 'en')
        .and('have.attr', 'dir', 'ltr')
        .and('have.attr', 'data-status', 'success');
      cy.then(() => rerender(wrap(<MessageBarBody data-testid="body" />)));
      body().should($body => {
        for (const attribute of ['id', 'title', 'lang', 'dir', 'data-status']) {
          expect($body[0].hasAttribute(attribute), attribute).to.equal(false);
        }
      });
    });
  });

  it('honors caller inline styles and restores token defaults when styles are omitted', () => {
    mount(
      <MessageBarBody data-testid="body" style={{ paddingRight: teamsLightTheme.spacingHorizontalXXL }}>
        Styled
      </MessageBarBody>,
    ).then(({ rerender }) => {
      body().should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalXXL);
      cy.then(() => rerender(wrap(<MessageBarBody data-testid="body">Reset</MessageBarBody>)));
      body().should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM);
    });
  });

  it('preserves caller Griffel class precedence across updates and restores defaults after removal', () => {
    const StyledBody = ({ override }: { override: boolean }) => {
      const classes = useBodyOverrideStyles();
      return (
        <MessageBarBody data-testid="body" className={override ? classes.root : undefined}>
          Styled
        </MessageBarBody>
      );
    };
    mount(<StyledBody override />).then(({ rerender }) => {
      body()
        .should('have.class', 'fui-MessageBarBody')
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalXXL)
        .and('have.css', 'font-size', teamsLightTheme.fontSizeBase500);
      cy.then(() => rerender(wrap(<StyledBody override />)));
      body().should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalXXL);
      cy.then(() => rerender(wrap(<StyledBody override={false} />)));
      body()
        .should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM)
        .and('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    });
  });
});

describe('MessageBarBody documented composition', () => {
  it('composes title, text, inline Link and actionable siblings without stealing link activation', () => {
    const help = cy.stub().as('help');
    const retry = cy.stub().as('retry');
    const dismiss = cy.stub().as('dismiss');
    mount(
      <MessageBar>
        <MessageBarBody data-testid="body">
          <MessageBarTitle>Descriptive title</MessageBarTitle>
          Message providing actionable information. <Link onClick={help}>Help</Link>
        </MessageBarBody>
        <MessageBarActions containerAction={<Button aria-label="Dismiss" onClick={dismiss} />}>
          <Button onClick={retry}>Retry</Button>
        </MessageBarActions>
      </MessageBar>,
    );
    body().should('contain.text', 'Descriptive title').and('contain.text', 'Message providing actionable information.');
    assertInlineLink();
    cy.get('.fui-Link').click();
    cy.get('@help').should('have.been.calledOnce');
    cy.contains('button', 'Retry').click();
    cy.get('@retry').should('have.been.calledOnce');
    cy.get('[aria-label="Dismiss"]').click();
    cy.get('@dismiss').should('have.been.calledOnce');
    cy.get('.fui-MessageBar').should($bar => {
      expect(getByRole($bar[0].ownerDocument.body, 'group', { name: 'Descriptive title' })).to.equal($bar[0]);
    });
  });

  for (const intent of ['info', 'warning', 'error', 'success'] as const) {
    it(`preserves readable body and inline link under documented ${intent} intent`, () => {
      mount(
        <MessageBar intent={intent}>
          <MessageBarBody data-testid="body">
            <MessageBarTitle>{intent} title</MessageBarTitle> Useful message. <Link>Help</Link>
          </MessageBarBody>
        </MessageBar>,
      );
      body().should('be.visible').and('contain.text', `${intent} title`).and('contain.text', 'Useful message.');
      assertInlineLink();
      body().should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    });
  }

  for (const layout of ['singleline', 'multiline'] as const) {
    it(`occupies the named body grid area in documented ${layout} layout`, () => {
      mount(
        <MessageBar layout={layout}>
          <MessageBarBody data-testid="body">
            <MessageBarTitle>Layout title</MessageBarTitle> Useful message. <Link>Help</Link>
          </MessageBarBody>
          <MessageBarActions>
            <Button>Retry</Button>
          </MessageBarActions>
        </MessageBar>,
      );
      body().should('have.css', 'grid-area', 'body').and('be.visible');
      cy.get('.fui-MessageBar').should($bar => {
        const element = $bar[0];
        const bodyRect = element.querySelector('.fui-MessageBarBody')!.getBoundingClientRect();
        const actionRect = element.querySelector('.fui-MessageBarActions')!.getBoundingClientRect();
        expect(bodyRect.width).to.be.greaterThan(0);
        if (layout === 'singleline') {
          expect(actionRect.left).to.be.at.least(bodyRect.right);
        } else {
          expect(actionRect.top).to.be.greaterThan(bodyRect.bottom);
        }
      });
      assertInlineLink();
    });
  }
});
