import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-theme';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import { Link } from '@fluentui/react-link';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import { MessageBar } from '../MessageBar/MessageBar';
import type { MessageBarProps } from '../MessageBar/MessageBar.types';
import { MessageBarBody } from '../MessageBarBody/MessageBarBody';
import { MessageBarTitle } from './MessageBarTitle';
import type { MessageBarTitleProps } from './MessageBarTitle.types';

const title = '[data-testid="title"]';
const message = '[data-testid="message"]';
const body = '[data-testid="body"]';

function rgb(value: string) {
  expect(value, 'theme color token format').to.match(/^#[0-9a-f]{6}$/i);
  return `rgb(${[1, 3, 5].map(start => parseInt(value.slice(start, start + 2), 16)).join(', ')})`;
}

function wrap(children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr', theme = webLightTheme) {
  return (
    <FluentProvider theme={theme} dir={dir}>
      <div data-testid="frame" style={{ width: 900 }}>
        {children}
      </div>
    </FluentProvider>
  );
}

function composition(props: MessageBarProps = {}, titleProps: MessageBarTitleProps = {}) {
  const { children = 'Service notice', ...nativeTitleProps } = titleProps;
  return (
    <MessageBar data-testid="message" {...props}>
      <MessageBarBody data-testid="body">
        <MessageBarTitle data-testid="title" {...nativeTitleProps}>
          {children}
        </MessageBarTitle>
        <span data-testid="copy">Changes are ready.</span> <Link href="#details">Details</Link>
      </MessageBarBody>
    </MessageBar>
  );
}

function assertNaming(name = 'Service notice') {
  cy.get(message).should(element => {
    const node = element[0];
    const label = node.querySelector<HTMLElement>(title)!;
    expect(label.id, 'generated title id').not.to.equal('');
    expect(node.getAttribute('aria-labelledby')).to.equal(label.id);
    expect(computeAccessibleName(node)).to.equal(name);
  });
}

function assertTypography() {
  cy.get(title)
    .should('have.css', 'display', 'inline')
    .and('have.css', 'font-size', '14px')
    .and('have.css', 'font-weight', '600')
    .and('have.css', 'line-height', '20px');
}

describe('MessageBarTitle documented compositions', () => {
  beforeEach(() => cy.viewport(1200, 800));

  it('renders the snapshot span defaults, not a heading, alert, or tab stop', () => {
    mount(wrap(<MessageBarTitle data-testid="title">Default MessageBarTitle</MessageBarTitle>));
    cy.get(title)
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.class', 'fui-MessageBarTitle')
      .and('have.attr', 'id', '')
      .and('have.text', 'Default MessageBarTitle');
    for (const attribute of ['role', 'tabindex', 'aria-live', 'aria-level']) {
      cy.get(title).should('not.have.attr', attribute);
    }
    assertTypography();
  });
});

describe('MessageBarTitle edge and accessibility contracts', () => {
  beforeEach(() => cy.viewport(1200, 800));

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`does not interrupt forward or reverse native Tab navigation in ${dir}`, () => {
      mount(
        wrap(
          <>
            <button data-testid="before">Before</button>
            {composition()}
            <button data-testid="after">After</button>
          </>,
          dir,
        ),
      );
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.contains('a', 'Details').should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.contains('a', 'Details').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="before"]').should('be.focused');
      cy.get(title).should('not.have.attr', 'tabindex');
      cy.get(title).should('not.be.focused');
    });

    it(`preserves embedded link and button native keyboard contracts in ${dir}`, () => {
      const linkClick = cy.spy().as('linkClick');
      const buttonClick = cy.spy().as('buttonClick');
      mount(
        wrap(
          <>
            <button data-testid="before">Before</button>
            <MessageBar data-testid="message">
              <MessageBarBody>
                <MessageBarTitle data-testid="title">
                  Review{' '}
                  <Link
                    href="#review"
                    onClick={event => {
                      event.preventDefault();
                      linkClick();
                    }}
                  >
                    link
                  </Link>{' '}
                  <button onClick={buttonClick}>Confirm</button>
                </MessageBarTitle>
              </MessageBarBody>
            </MessageBar>
            <button data-testid="after">After</button>
          </>,
          dir,
        ),
      );
      assertNaming('Review link Confirm');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.contains('a', 'link').should('be.focused').and('have.attr', 'href', '#review');
      cy.realPress('Enter');
      cy.get('@linkClick').should('have.been.calledOnce');
      cy.realPress('Space');
      cy.get('@linkClick').should('have.been.calledOnce');
      cy.realPress('Tab');
      cy.contains('button', 'Confirm').should('be.focused');
      cy.realPress('Enter');
      cy.get('@buttonClick').should('have.been.calledOnce');
      cy.realPress('Space');
      cy.get('@buttonClick').should('have.been.calledTwice');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.contains('button', 'Confirm').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.contains('a', 'link').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="before"]').should('be.focused');
      cy.get(title).should('not.be.focused');
    });

    it(`wraps long title content without clipping and returns inline on widening in ${dir}`, () => {
      const tree = (width: number) =>
        wrap(
          <div style={{ width }} data-testid="narrow">
            <MessageBar layout="multiline">
              <MessageBarBody data-testid="body">
                <MessageBarTitle data-testid="title">A longer service notice with several useful words</MessageBarTitle>
                <span data-testid="copy">Follow up.</span>
              </MessageBarBody>
            </MessageBar>
          </div>,
          dir,
        );
      mount(tree(180)).then(({ rerender }) => {
        cy.get(body).should(element => {
          const node = element[0];
          const range = node.ownerDocument.createRange();
          range.selectNodeContents(node.querySelector(title)!);
          expect(range.getBoundingClientRect().height).to.be.greaterThan(20);
          expect(node.scrollWidth).to.be.at.most(node.clientWidth);
          expect(node.getBoundingClientRect().height).to.be.greaterThan(20);
        });
        cy.then(() => rerender(tree(900)));
        cy.get(body).should(element => {
          const node = element[0];
          const range = node.ownerDocument.createRange();
          range.selectNodeContents(node.querySelector(title)!);
          expect(range.getBoundingClientRect().height).to.be.greaterThan(0).and.at.most(20);
          expect(node.getBoundingClientRect().height).to.equal(20);
        });
        assertTypography();
      });
    });
  }

  for (const intent of ['info', 'success', 'warning', 'error'] as const) {
    it(`passes standard axe rules including AA contrast and semantics for ${intent}`, () => {
      mount(wrap(composition({ intent })));
      assertNaming();
      cy.get('[data-testid="frame"]').then(async element => {
        const result = await axe.run(element[0]);
        expect(result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => node.html) }))).to.deep.equal(
          [],
        );
      });
    });
  }

  for (const role of ['status', 'alert'] as const) {
    it(`names a caller-selected ${role} message role through the title and passes axe`, () => {
      mount(wrap(composition({ role })));
      cy.get(message).should('have.attr', 'role', role);
      assertNaming();
      cy.get(title).should('not.have.attr', 'role');
      cy.get(title).should('not.have.attr', 'aria-live');
      cy.get('[data-testid="frame"]').then(async element => {
        const result = await axe.run(element[0]);
        expect(result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => node.html) }))).to.deep.equal(
          [],
        );
      });
    });
  }

  it('updates group naming with rich content while preserving the generated association and root identity', () => {
    const tree = (children: React.ReactNode) => wrap(composition({}, { children }));
    mount(
      tree(
        <>
          First <strong>notice</strong>
        </>,
      ),
    ).then(({ rerender }) => {
      assertNaming('First notice');
      cy.get(title).then(element => {
        const node = element[0];
        const id = node.id;
        cy.then(() =>
          rerender(
            tree(
              <>
                Latest <em>notice</em> 2
              </>,
            ),
          ),
        );
        assertNaming('Latest notice 2');
        cy.get(title).should(current => {
          expect(current[0]).to.equal(node);
          expect(current[0].id).to.equal(id);
        });
        cy.get(title).find('strong').should('not.exist');
        cy.get(title).find('em').should('have.text', 'notice');
      });
    });
  });

  it('isolates generated title ids and accessible names across sibling message bars', () => {
    mount(
      wrap(
        <>
          {composition({ id: 'first-message' }, { children: 'First' })}
          {composition({ id: 'second-message' }, { children: 'Second' })}
        </>,
      ),
    );
    cy.get('[data-testid="frame"]').should(element => {
      const first = element[0].querySelector('#first-message')!;
      const second = element[0].querySelector('#second-message')!;
      const a = first.querySelector('span.fui-MessageBarTitle')!;
      const b = second.querySelector('span.fui-MessageBarTitle')!;
      expect(a.id).not.to.equal('');
      expect(b.id).not.to.equal('');
      expect(a.id).not.to.equal(b.id);
      expect(first.getAttribute('aria-labelledby')).to.equal(a.id);
      expect(second.getAttribute('aria-labelledby')).to.equal(b.id);
      expect(computeAccessibleName(first)).to.equal('First');
      expect(computeAccessibleName(second)).to.equal('Second');
    });
  });

  it('supports an explicit title id when the caller pairs the parent naming reference, and restores generated ids', () => {
    const tree = (custom: boolean) =>
      wrap(composition(custom ? { 'aria-labelledby': 'consumer-title' } : {}, custom ? { id: 'consumer-title' } : {}));
    mount(tree(false)).then(({ rerender }) => {
      cy.get(title).then(element => {
        const generated = element[0].id;
        assertNaming();
        cy.then(() => rerender(tree(true)));
        cy.get(title).should('have.id', 'consumer-title');
        assertNaming();
        cy.then(() => rerender(tree(false)));
        cy.get(title).should('have.id', generated);
        assertNaming();
      });
    });
  });

  it('allows caller heading semantics without changing the native span or parent naming', () => {
    mount(wrap(composition({}, { role: 'heading', 'aria-level': 2 })));
    cy.get(title)
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.attr', 'role', 'heading')
      .and('have.attr', 'aria-level', '2');
    assertNaming();
    cy.get('[data-testid="frame"]').then(async element => {
      const result = await axe.run(element[0]);
      expect(result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => node.html) }))).to.deep.equal([]);
    });
  });

  it('characterizes an unpaired explicit title id and recovers its naming on the same mounted roots', () => {
    const tree = (titleProps: MessageBarTitleProps = {}, props: MessageBarProps = {}) =>
      wrap(composition(props, titleProps));
    mount(tree()).then(({ rerender }) => {
      cy.get(message).then(parent => {
        cy.get(title).then(element => {
          const parentNode = parent[0];
          const titleNode = element[0];
          const generated = titleNode.id;
          assertNaming();
          cy.then(() => rerender(tree({ id: 'unpaired-title' })));
          cy.get(title).should('have.id', 'unpaired-title').and('have.text', 'Service notice');
          cy.get(message).should(current => {
            expect(current[0]).to.equal(parentNode);
            expect(current[0].getAttribute('aria-labelledby')).to.equal(generated);
            expect(current[0].ownerDocument.getElementById(generated), 'missing generated naming target').to.equal(
              null,
            );
            expect(computeAccessibleName(current[0]), 'unpaired default group has no accessible name').to.equal('');
          });
          cy.get(title).should(current => expect(current[0]).to.equal(titleNode));
          cy.then(() => rerender(tree({ id: 'unpaired-title' }, { 'aria-label': 'Fallback notice' })));
          cy.get(message).should(current => {
            expect(current[0].getAttribute('aria-labelledby')).to.equal(generated);
            expect(current[0].ownerDocument.getElementById(generated)).to.equal(null);
            expect(computeAccessibleName(current[0]), 'invalid reference permits explicit label fallback').to.equal(
              'Fallback notice',
            );
          });
          cy.then(() => rerender(tree({ id: 'unpaired-title' }, { 'aria-labelledby': 'unpaired-title' })));
          assertNaming();
          cy.get(message).should('not.have.attr', 'aria-label');
          cy.get(message).should(current => expect(current[0]).to.equal(parentNode));
          cy.get(title).should(current => expect(current[0]).to.equal(titleNode));
          cy.then(() => rerender(tree()));
          cy.get(title).should('have.id', generated);
          assertNaming();
          cy.get(message).should(current => expect(current[0]).to.equal(parentNode));
          cy.get(title).should(current => expect(current[0]).to.equal(titleNode));
        });
      });
    });
  });

  it('uses a valid body naming reference when an explicit title id leaves another reference unresolved', () => {
    const tree = (generated?: string, paired = false) =>
      wrap(
        <MessageBar
          data-testid="message"
          {...(generated ? { 'aria-labelledby': `${paired ? 'explicit-title' : generated} fallback-body` } : {})}
        >
          <MessageBarBody>
            <MessageBarTitle data-testid="title" {...(generated ? { id: 'explicit-title' } : {})}>
              Service notice
            </MessageBarTitle>
            <span id="fallback-body">Body fallback</span>
          </MessageBarBody>
        </MessageBar>,
      );
    mount(tree()).then(({ rerender }) => {
      cy.get(title).then(element => {
        const node = element[0];
        const generated = node.id;
        assertNaming();
        cy.then(() => rerender(tree(generated)));
        cy.get(message).should(current => {
          expect(current[0].getAttribute('aria-labelledby')).to.equal(`${generated} fallback-body`);
          expect(current[0].ownerDocument.getElementById(generated)).to.equal(null);
          expect(computeAccessibleName(current[0])).to.equal('Body fallback');
        });
        cy.get(title).should('have.id', 'explicit-title');
        cy.then(() => rerender(tree(generated, true)));
        cy.get(message).should(current => {
          expect(current[0].getAttribute('aria-labelledby')).to.equal('explicit-title fallback-body');
          expect(computeAccessibleName(current[0])).to.equal('Service notice Body fallback');
        });
        cy.get(title).should(current => expect(current[0]).to.equal(node));
        cy.then(() => rerender(tree()));
        cy.get(title).should('have.id', generated);
        assertNaming();
      });
    });
  });
});

describe('MessageBarTitle documented context and geometry', () => {
  beforeEach(() => cy.viewport(1200, 800));
  for (const intent of ['info', 'success', 'warning', 'error'] as const) {
    for (const layout of ['auto', 'singleline', 'multiline'] as const) {
      it(`names the ${intent}/${layout} message group without becoming a live region`, () => {
        mount(wrap(composition({ intent, layout })));
        cy.get(message).should('have.attr', 'role', 'group');
        cy.get(title).should('have.prop', 'tagName', 'SPAN').and('have.text', 'Service notice');
        cy.get(title).should('not.have.attr', 'role');
        cy.get(title).should('not.have.attr', 'aria-live');
        assertNaming();
        assertTypography();
        cy.get(body).should('contain.text', 'Service noticeChanges are ready. Details');
        cy.contains('a', 'Details').should('have.css', 'text-decoration-line', 'underline');
      });
    }
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`keeps title, body text and inline link on one line with real separation in ${dir}`, () => {
      mount(
        wrap(
          <MessageBar layout="singleline">
            <MessageBarBody data-testid="body">
              <MessageBarTitle data-testid="title">{dir === 'ltr' ? 'Service notice' : 'הודעת שירות'}</MessageBarTitle>
              <span data-testid="copy">{dir === 'ltr' ? 'Changes are ready.' : 'השינויים מוכנים.'}</span>{' '}
              <Link href="#details">{dir === 'ltr' ? 'Details' : 'פרטים'}</Link>
            </MessageBarBody>
          </MessageBar>,
          dir,
        ),
      );
      cy.get(title).should('have.css', 'direction', dir);
      cy.get(body).should(element => {
        const node = element[0];
        const t = node.querySelector<HTMLElement>(title)!;
        const copy = node.querySelector<HTMLElement>('[data-testid="copy"]')!;
        const link = node.querySelector<HTMLElement>('a')!;
        const a = t.getBoundingClientRect();
        const b = copy.getBoundingClientRect();
        const c = link.getBoundingClientRect();
        expect(a.width).to.be.greaterThan(0);
        expect(b.width).to.be.greaterThan(0);
        expect(c.width).to.be.greaterThan(0);
        expect(a.top).to.be.closeTo(b.top, 1);
        expect(c.top).to.be.closeTo(b.top, 1);
        const range = node.ownerDocument.createRange();
        range.selectNodeContents(t);
        const text = range.getBoundingClientRect();
        expect(t.ownerDocument.defaultView!.getComputedStyle(t, '::after').content).to.equal('" "');
        if (dir === 'ltr') {
          expect(b.left - text.right, 'generated space separates text').to.be.greaterThan(1);
          expect(c.left).to.be.greaterThan(b.right);
        } else {
          expect(text.left - b.right, 'generated space separates text').to.be.greaterThan(1);
          expect(c.right).to.be.lessThan(b.left);
        }
      });
    });
  }

  for (const shape of ['rounded', 'square'] as const) {
    it(`preserves inline title typography and naming in the ${shape} story`, () => {
      mount(wrap(composition({ shape })));
      assertNaming();
      assertTypography();
    });
  }

  it('supports a concise title-only body without an action or link requirement', () => {
    mount(
      wrap(
        <MessageBar data-testid="message">
          <MessageBarBody>
            <MessageBarTitle data-testid="title">Saved</MessageBarTitle>
          </MessageBarBody>
        </MessageBar>,
      ),
    );
    assertNaming('Saved');
    cy.get(title).should('be.visible').and('have.text', 'Saved');
    cy.get(message).find('button, a').should('not.exist');
  });
});

describe('MessageBarTitle unit-informed native and provider contracts', () => {
  beforeEach(() => cy.viewport(1200, 800));

  it('forwards the object ref to the native root span and clears it when removed', () => {
    const ref = React.createRef<HTMLSpanElement>();
    mount(
      wrap(
        <MessageBarTitle data-testid="title" ref={ref}>
          Referenced
        </MessageBarTitle>,
      ),
    ).then(({ rerender }) => {
      cy.get(title).should(element => {
        expect(ref.current).to.equal(element[0]);
        expect(ref.current).to.be.instanceOf(element[0].ownerDocument.defaultView!.HTMLSpanElement);
      });
      cy.then(() => rerender(wrap(<></>)));
      cy.get(title).should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  });

  it('releases replaced callback refs, preserves root identity and releases the final callback on unmount', () => {
    const first = cy.spy().as('firstRef');
    const latest = cy.spy().as('latestRef');
    const tree = (ref: React.Ref<HTMLSpanElement>) =>
      wrap(
        <MessageBarTitle data-testid="title" ref={ref}>
          Referenced
        </MessageBarTitle>,
      );
    mount(tree(first)).then(({ rerender }) => {
      cy.get(title).then(element => {
        const node = element[0];
        expect(first.lastCall.args[0]).to.equal(node);
        cy.then(() => rerender(tree(latest)));
        cy.get(title).should(current => {
          expect(current[0]).to.equal(node);
          expect(first.lastCall.args[0]).to.equal(null);
          expect(latest.lastCall.args[0]).to.equal(node);
        });
        cy.then(() => rerender(wrap(<></>)));
        cy.get(title).should('not.exist');
        cy.then(() => expect(latest.lastCall.args[0]).to.equal(null));
      });
    });
  });

  it('honors the supported explicit as span without replacing the root on omission', () => {
    mount(
      wrap(
        <MessageBarTitle data-testid="title" as="span">
          First
        </MessageBarTitle>,
      ),
    ).then(({ rerender }) => {
      cy.get(title).then(element => {
        cy.then(() => rerender(wrap(<MessageBarTitle data-testid="title">Latest</MessageBarTitle>)));
        cy.get(title).should('have.prop', 'tagName', 'SPAN').and('have.text', 'Latest');
        cy.get(title).should(current => expect(current[0]).to.equal(element[0]));
      });
    });
  });

  it('passes merged ids classes styles events and refs to a root render function and restores ordinary rendering', () => {
    const ref = React.createRef<HTMLSpanElement>();
    const click = cy.spy().as('customClick');
    const render: SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <em>Custom notice</em>
      </Component>
    );
    const tree = (children: MessageBarTitleProps['children']) =>
      wrap(
        <MessageBar data-testid="message">
          <MessageBarBody>
            <MessageBarTitle
              data-testid="title"
              className="consumer"
              style={{ fontSize: 18 }}
              ref={ref}
              onClick={click}
            >
              {children}
            </MessageBarTitle>
          </MessageBarBody>
        </MessageBar>,
      );
    mount(tree(render)).then(({ rerender }) => {
      assertNaming('Custom notice');
      cy.get(title)
        .should('have.class', 'fui-MessageBarTitle')
        .and('have.class', 'consumer')
        .and('have.css', 'font-size', '18px')
        .and('have.attr', 'data-rendered', 'true');
      cy.get(title).should(element => expect(ref.current).to.equal(element[0]));
      cy.get(title).realClick();
      cy.get('@customClick').should('have.been.calledOnce');
      cy.then(() => rerender(tree('Ordinary notice')));
      assertNaming('Ordinary notice');
      cy.get(title).should('not.have.attr', 'data-rendered');
      cy.get(title).find('em').should('not.exist');
      cy.get(title).should(element => expect(ref.current).to.equal(element[0]));
      cy.then(() => rerender(wrap(<></>)));
      cy.get(title).should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  });

  it('forwards and replaces native metadata then removes it without stale attributes or root replacement', () => {
    const tree = (props: MessageBarTitleProps, data?: string) =>
      wrap(
        <MessageBarTitle data-testid="title" data-consumer={data} {...props}>
          Notice
        </MessageBarTitle>,
      );
    mount(tree({ id: 'first-title', title: 'Tooltip', lang: 'fr', dir: 'rtl', hidden: true }, 'first')).then(
      ({ rerender }) => {
        cy.get(title)
          .should('have.id', 'first-title')
          .and('have.attr', 'title', 'Tooltip')
          .and('have.attr', 'lang', 'fr')
          .and('have.attr', 'dir', 'rtl')
          .and('have.attr', 'data-consumer', 'first');
        cy.get(title).should('not.be.visible');
        cy.get(title).then(element => {
          cy.then(() => rerender(tree({ id: 'latest-title', title: 'Latest', lang: 'en', dir: 'ltr' }, 'latest')));
          cy.get(title)
            .should('be.visible')
            .and('have.id', 'latest-title')
            .and('have.attr', 'title', 'Latest')
            .and('have.attr', 'lang', 'en')
            .and('have.attr', 'data-consumer', 'latest')
            .and('have.css', 'direction', 'ltr');
          cy.then(() => rerender(tree({})));
          for (const attribute of ['title', 'lang', 'dir', 'data-consumer', 'hidden']) {
            cy.get(title).should('not.have.attr', attribute);
          }
          cy.get(title).should('have.attr', 'id', '').and('be.visible');
          cy.get(title).should(current => expect(current[0]).to.equal(element[0]));
        });
      },
    );
  });

  it('forwards and removes caller heading, label, description and tabIndex attributes', () => {
    const tree = (props: MessageBarTitleProps) =>
      wrap(
        <>
          <button data-testid="before">Before</button>
          <span id="description">Additional context</span>
          <MessageBarTitle data-testid="title" {...props}>
            Visible notice
          </MessageBarTitle>
          <button data-testid="after">After</button>
        </>,
      );
    mount(
      tree({
        role: 'heading',
        'aria-level': 3,
        'aria-label': 'Named notice',
        'aria-describedby': 'description',
        tabIndex: 0,
      }),
    ).then(({ rerender }) => {
      cy.get(title)
        .should('have.attr', 'role', 'heading')
        .and('have.attr', 'aria-level', '3')
        .and('have.attr', 'aria-label', 'Named notice')
        .and('have.attr', 'aria-describedby', 'description')
        .and('have.attr', 'tabindex', '0');
      cy.get(title).should(element => expect(computeAccessibleName(element[0])).to.equal('Named notice'));
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(title).should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.then(() => rerender(tree({})));
      for (const attribute of ['role', 'aria-level', 'aria-label', 'aria-describedby', 'tabindex']) {
        cy.get(title).should('not.have.attr', attribute);
      }
      cy.get(title).should('have.text', 'Visible notice').and('have.prop', 'tagName', 'SPAN');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="before"]').should('be.focused');
    });
  });

  it('renders zero, false, empty, null, omitted and restored children without stale descendants', () => {
    const tree = (children?: React.ReactNode) =>
      wrap(<MessageBarTitle data-testid="title">{children}</MessageBarTitle>);
    mount(tree(<strong>First</strong>)).then(({ rerender }) => {
      for (const [value, text] of [
        [0, '0'],
        [false, ''],
        ['', ''],
        [null, ''],
        [undefined, ''],
        ['Restored', 'Restored'],
      ] as const) {
        cy.then(() => rerender(tree(value)));
        cy.get(title).should('have.text', text).and('have.prop', 'tagName', 'SPAN');
        cy.get(title).find('strong').should('not.exist');
      }
    });
  });

  it('preserves rich child identity during unrelated native root updates', () => {
    const tree = (tooltip: string) =>
      wrap(
        <MessageBarTitle data-testid="title" title={tooltip}>
          <strong data-testid="rich">Notice</strong>
        </MessageBarTitle>,
      );
    mount(tree('First')).then(({ rerender }) => {
      cy.get('[data-testid="rich"]').then(element => {
        cy.then(() => rerender(tree('Latest')));
        cy.get(title).should('have.attr', 'title', 'Latest').and('have.text', 'Notice');
        cy.get('[data-testid="rich"]').should(current => expect(current[0]).to.equal(element[0]));
      });
    });
  });

  it('replaces and removes native handlers without inventing Enter or Space activation on a span', () => {
    const first = cy.spy().as('first');
    const latest = cy.spy().as('latest');
    const key = cy.spy().as('key');
    const tree = (
      onClick?: React.MouseEventHandler<HTMLSpanElement>,
      onKeyDown?: React.KeyboardEventHandler<HTMLSpanElement>,
    ) =>
      wrap(
        <MessageBarTitle data-testid="title" tabIndex={0} onClick={onClick} onKeyDown={onKeyDown}>
          Notice
        </MessageBarTitle>,
      );
    mount(tree(first, key)).then(({ rerender }) => {
      cy.get(title).realClick();
      cy.get('@first').should('have.been.calledOnce');
      cy.get(title).focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@key').should('have.been.calledTwice');
      cy.get('@first').should('have.been.calledOnce');
      cy.then(() => rerender(tree(latest)));
      cy.get(title).realClick();
      cy.get('@latest').should('have.been.calledOnce');
      cy.get('@first').should('have.been.calledOnce');
      cy.get(title).focus();
      cy.realPress('Enter');
      cy.get('@key').should('have.been.calledTwice');
      cy.then(() => rerender(tree()));
      cy.get(title).realClick();
      cy.get('@latest').should('have.been.calledOnce');
      cy.then(() => rerender(tree(first, key)));
      cy.get(title).realClick();
      cy.get('@first').should('have.been.calledTwice');
    });
  });

  it('replaces consumer classes and inline overrides then restores strong token typography', () => {
    const tree = (props: MessageBarTitleProps) =>
      wrap(
        <MessageBarTitle data-testid="title" {...props}>
          Notice
        </MessageBarTitle>,
      );
    mount(
      tree({
        className: 'first',
        style: { display: 'block', fontWeight: 400, fontSize: 22, color: 'rgb(10, 20, 30)' },
      }),
    ).then(({ rerender }) => {
      cy.get(title)
        .should('have.class', 'first')
        .and('have.class', 'fui-MessageBarTitle')
        .and('have.css', 'display', 'block')
        .and('have.css', 'font-weight', '400')
        .and('have.css', 'font-size', '22px')
        .and('have.css', 'color', 'rgb(10, 20, 30)');
      cy.then(() => rerender(tree({ className: 'latest', style: { fontSize: 18 } })));
      cy.get(title).should('not.have.class', 'first');
      cy.get(title)
        .should('have.class', 'latest')
        .and('have.css', 'font-size', '18px')
        .and('have.css', 'display', 'inline');
      cy.then(() => rerender(tree({})));
      cy.get(title).should('not.have.class', 'latest');
      cy.get(title)
        .should('have.class', 'fui-MessageBarTitle')
        .and('have.css', 'color', rgb(webLightTheme.colorNeutralForeground1));
      assertTypography();
    });
  });

  for (const [name, theme] of [
    ['light', webLightTheme],
    ['dark', webDarkTheme],
    ['high contrast', teamsHighContrastTheme],
  ] as const) {
    it(`updates inherited color and font tokens in the ${name} provider without remounting the title`, () => {
      const tree = (value: typeof webLightTheme) => wrap(composition(), 'ltr', value);
      mount(tree(webLightTheme)).then(({ rerender }) => {
        cy.get(title).then(element => {
          const node = element[0];
          const id = node.id;
          cy.then(() => rerender(tree(theme)));
          cy.get(title)
            .should('have.css', 'color', rgb(theme.colorNeutralForeground1))
            .and('have.css', 'font-size', theme.fontSizeBase300)
            .and('have.css', 'font-weight', String(theme.fontWeightSemibold))
            .and('have.css', 'line-height', theme.lineHeightBase300);
          cy.get(title).should(current => {
            expect(current[0]).to.equal(node);
            expect(current[0].id).to.equal(id);
          });
          assertNaming();
          cy.then(() => rerender(tree(webLightTheme)));
          cy.get(title).should('have.css', 'color', rgb(webLightTheme.colorNeutralForeground1));
          assertTypography();
        });
      });
    });
  }

  it('uses changed typography tokens, not hardcoded weight size or line height', () => {
    const custom = { ...webLightTheme, fontSizeBase300: '18px', fontWeightSemibold: 700, lineHeightBase300: '28px' };
    mount(wrap(composition(), 'ltr', webLightTheme)).then(({ rerender }) => {
      assertTypography();
      cy.then(() => rerender(wrap(composition(), 'ltr', custom)));
      cy.get(title)
        .should('have.css', 'font-size', '18px')
        .and('have.css', 'font-weight', '700')
        .and('have.css', 'line-height', '28px');
      assertNaming();
      cy.then(() => rerender(wrap(composition())));
      assertTypography();
    });
  });

  it('inherits changed provider direction, respects a native override and resumes inheritance on removal', () => {
    const tree = (dir: 'ltr' | 'rtl', nativeDir?: 'ltr' | 'rtl') => wrap(composition({}, { dir: nativeDir }), dir);
    mount(tree('ltr')).then(({ rerender }) => {
      cy.get(title).should('have.css', 'direction', 'ltr');
      cy.get(title).then(element => {
        cy.then(() => rerender(tree('rtl')));
        cy.get(title).should('have.css', 'direction', 'rtl');
        cy.then(() => rerender(tree('rtl', 'ltr')));
        cy.get(title).should('have.attr', 'dir', 'ltr').and('have.css', 'direction', 'ltr');
        cy.then(() => rerender(tree('rtl')));
        cy.get(title).should('not.have.attr', 'dir');
        cy.get(title).should('have.css', 'direction', 'rtl');
        cy.get(title).should(current => expect(current[0]).to.equal(element[0]));
        assertNaming();
      });
    });
  });

  it('restores the generated accessible naming reference after a title is removed and reinserted', () => {
    const tree = (visible: boolean) =>
      wrap(
        <MessageBar data-testid="message">
          <MessageBarBody>
            {visible && <MessageBarTitle data-testid="title">Restored notice</MessageBarTitle>}Body text.
          </MessageBarBody>
        </MessageBar>,
      );
    mount(tree(true)).then(({ rerender }) => {
      assertNaming('Restored notice');
      cy.get(title).then(element => {
        const id = element[0].id;
        cy.then(() => rerender(tree(false)));
        cy.get(title).should('not.exist');
        cy.get(message).should('have.attr', 'aria-labelledby', id).and('contain.text', 'Body text.');
        cy.then(() => rerender(tree(true)));
        cy.get(title).should('have.id', id);
        assertNaming('Restored notice');
      });
    });
  });
});
