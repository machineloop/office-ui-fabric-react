import * as React from 'react';
import * as axe from 'axe-core';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
import {
  Button,
  Link,
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import type { JSXElement, SlotRenderFunction, FluentProviderCustomStyleHooks } from '@fluentui/react-components';
import { CardFooter } from '../CardFooter';
import type { CardFooterProps, CardFooterState } from '../CardFooter.types';
import { cardFooterClassNames, useCardFooterStyles_unstable } from '../useCardFooterStyles.styles';
import { useCardFooter_unstable, useCardFooterBase_unstable } from '../useCardFooter';
import { renderCardFooter_unstable } from '../renderCardFooter';
import { Default } from '../../../../../stories/src/CardFooter/CardFooterDefault.stories';
import { Card } from '../../Card/Card';
import type { CardProps } from '../../Card/Card.types';
import { CardHeader } from '../../CardHeader/CardHeader';
import { Default as DefaultCard } from '../../../../../stories/src/Card/CardDefault.stories';
import { WithAction } from '../../../../../stories/src/Card/CardAction.stories';
import { FocusMode } from '../../../../../stories/src/Card/CardFocusMode.stories';
import { Disabled } from '../../../../../stories/src/Card/CardDisabled.stories';
import { assertBaselineNode, assertBaselineEnvelope, nodeMetadata } from './CardFooter.a11y.stories';

const round = Number(Cypress.env('coverageRound') || 5);
const render = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) => {
  mount(
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={dir}>
      <main id="fixture">{element}</main>
    </FluentProvider>,
  );
  cy.get('body').realHover({ position: 'topLeft' });
};
const renderStableStory = (element: JSXElement) => {
  cy.then(() => {
    cy.intercept(
      'GET',
      'https://raw.githubusercontent.com/microsoft/fluentui/master/packages/react-components/react-card/stories/src/assets/*',
      request => {
        const name = new URL(request.url).pathname.split('/').pop()!;
        if (
          ![
            'avatar_elvia.svg',
            'docx.png',
            'doc_template.png',
            'office2.png',
            'pptx.png',
            'sales_template.png',
          ].includes(name)
        ) {
          throw new Error(`Unexpected stable story asset: ${name}`);
        }
        request.reply({
          statusCode: 200,
          headers: { 'content-type': name.endsWith('.svg') ? 'image/svg+xml' : 'image/png' },
          fixture: `../../../packages/react-components/react-card/stories/src/assets/${name},null`,
        });
      },
    );
    render(element);
    cy.get('#fixture').should($scope => {
      const images = Array.from($scope[0].querySelectorAll('img'));
      expect(images.length, 'real checked-in story images').to.be.greaterThan(0);
      images.forEach(image => {
        expect(image.complete, image.src).to.equal(true);
        expect(image.naturalWidth, image.src).to.be.greaterThan(0);
      });
    });
  });
};

const registerRoundFour = () => {
  describe('ONLY127 CardFooter R4 public composition edge cases', () => {
    it('R4.01 action render function can intentionally suppress its wrapper without suppressing main actions', () => {
      const renderAction: SlotRenderFunction<React.ComponentProps<'div'>> = () => null;
      render(
        <CardFooter id="footer" action={{ id: 'action', children: renderAction }}>
          <Button id="reply">Reply</Button>
        </CardFooter>,
      );
      cy.get('#action').should('not.exist');
      footer().find('button').should('have.length', 1);
      cy.get('#reply').realClick().should('have.focus');
      audit('suppressed action render');
    });
    it('R4.02 controlled action render closures update visible content and accessible names in place', () => {
      const Fixture = () => {
        const [count, setCount] = React.useState(0);
        const renderAction: SlotRenderFunction<React.ComponentProps<'div'>> = (Action, props) => (
          <Action {...props}>
            <Button id="more" onClick={() => setCount(count + 1)}>
              More {count}
            </Button>
          </Action>
        );
        return (
          <CardFooter id="footer" action={{ id: 'action', children: renderAction }}>
            <Button>Reply</Button>
          </CardFooter>
        );
      };
      render(<Fixture />);
      cy.get('#action').then($action => {
        const original = $action[0];
        cy.get('#more').realClick().should('have.text', 'More 1').and('have.focus');
        cy.realPress('Enter');
        cy.get('#more')
          .should('have.text', 'More 2')
          .then($el => expect(computeAccessibleName($el[0])).to.equal('More 2'));
        cy.get('#action').should($el => expect($el[0]).to.equal(original));
        audit('updated render function closure');
      });
    });
    it('R4.03 inherited checkbox Space and Enter each select once, while footer Space does not select', () => {
      const selection = cy.stub().as('selection');
      render(<CardFixture cardProps={{ defaultSelected: false, onSelectionChange: selection }} />);
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#card > input').should('have.focus');
      cy.realPress('Space');
      selected(true);
      cy.get('@selection')
        .should('have.been.calledOnce')
        .then(() => expect(selection.firstCall.args[1]).to.deep.equal({ selected: true }));
      cy.realPress('Enter');
      selected(false);
      cy.get('@selection')
        .should('have.been.calledTwice')
        .then(() => expect(selection.secondCall.args[1]).to.deep.equal({ selected: false }));
      cy.realPress('Tab');
      cy.get('#reply').should('have.focus');
      cy.realPress('Space');
      selected(false);
      cy.get('@selection').should('have.been.calledTwice');
      audit('selection keyboard deduplication');
    });
    it('R4.04 default footer Button type does not submit an enclosing form by pointer or keyboard', () => {
      const submit = cy.stub().as('submit');
      const action = cy.stub().as('action');
      render(
        <form
          aria-label="Document"
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <CardFooter
            id="footer"
            action={
              <Button id="more" onClick={action}>
                More
              </Button>
            }
          >
            <Button id="reply" onClick={action}>
              Reply
            </Button>
          </CardFooter>
        </form>,
      );
      cy.get('#reply').should('have.attr', 'type', 'button').realClick();
      cy.realPress('Enter');
      cy.realPress('Tab');
      cy.get('#more').should('have.focus').and('have.attr', 'type', 'button');
      cy.realPress('Space');
      cy.get('@action').should('have.been.calledThrice');
      cy.get('@submit').should('not.have.been.called');
      audit('default non-submit buttons');
    });
    it('R4.05 disabledFocusable child remains a tab stop but neither activates nor selects its Card', () => {
      const action = cy.stub().as('action');
      const selection = cy.stub().as('selection');
      render(
        <>
          <button id="before">Before</button>
          <Card
            id="card"
            defaultSelected={false}
            checkbox={{ 'aria-label': 'Select document' }}
            onSelectionChange={selection}
          >
            <CardFooter id="footer">
              <Button id="reply" disabledFocusable onClick={action}>
                Reply
              </Button>
              <Button id="share">Share</Button>
            </CardFooter>
          </Card>
        </>,
      );
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#card > input').should('have.focus');
      cy.realPress('Tab');
      cy.get('#reply').should('have.focus').and('have.attr', 'aria-disabled', 'true');
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@action').should('not.have.been.called');
      cy.get('@selection').should('not.have.been.called');
      selected(false);
      cy.realPress('Tab');
      cy.get('#share').should('have.focus');
      audit('focusable disabled action');
    });
    it('R4.06 sibling Cards keep selection labels and footer interactions independently scoped', () => {
      render(
        <>
          {['first', 'second'].map(id => (
            <Card key={id} id={id} defaultSelected={false}>
              <CardHeader header={<h2 id={`${id}-title`}>{id} document</h2>} />
              <CardFooter id={`${id}-footer`} action={<Button id={`${id}-more`}>More</Button>}>
                <Button>Reply</Button>
                <span id={`${id}-text`}>Status</span>
              </CardFooter>
            </Card>
          ))}
        </>,
      );
      for (const id of ['first', 'second']) {
        cy.get(`#${id} > input`)
          .should('not.be.checked')
          .should($el => expect(computeAccessibleName($el[0])).to.equal(`${id} document`));
      }
      cy.get('#first-text').realClick();
      cy.get('#first > input').should('be.checked');
      cy.get('#second > input').should('not.be.checked');
      cy.get('#second-more').realClick();
      cy.realPress('Space');
      cy.get('#second > input').should('not.be.checked');
      cy.get('#second-text').realClick();
      cy.get('#second > input').should('be.checked');
      cy.get('#first > input').should('be.checked');
      audit('independent Card contexts');
    });
    for (const placement of ['not-last', 'wrapped'] as const) {
      it(`R4.07 ${placement} footer observes only the applicable direct-child Card CSS rules`, () => {
        const content = (
          <CardFooter id="footer" action={{ id: 'action', children: <Button id="more">More</Button> }}>
            <Button id="reply">Reply</Button>
          </CardFooter>
        );
        render(
          <Card id="card" aria-label="Document" orientation="horizontal" style={{ width: 800 }}>
            {placement === 'wrapped' ? <section aria-label="Actions">{content}</section> : content}
            <div>Following content</div>
          </Card>,
        );
        footer()
          .should('have.css', 'flex-shrink', placement === 'wrapped' ? '1' : '0')
          .and('have.css', 'flex-grow', '0')
          .and('have.css', 'gap', '12px');
        cy.get('#more').realClick().should('have.focus');
        audit(`${placement} inherited CSS`);
      });
    }
    it('R4.08 explicit consumer flexWrap keeps narrow default actions within bounds and keyboard ordered', () => {
      render(
        <>
          <button id="before">Before</button>
          <CardFooter
            id="footer"
            style={{ width: 190, flexWrap: 'wrap' }}
            action={{ id: 'action', style: { marginLeft: 0 }, children: <Button id="more">More</Button> }}
          >
            <Button id="reply">Reply</Button>
            <Button id="share">Share</Button>
          </CardFooter>
        </>,
      );
      footer()
        .should('have.css', 'flex-wrap', 'wrap')
        .should($root => {
          const root = $root[0];
          const reply = root.querySelector('#reply')!.getBoundingClientRect();
          const share = root.querySelector('#share')!.getBoundingClientRect();
          const more = root.querySelector('#more')!.getBoundingClientRect();
          expect(share.top - reply.bottom).to.be.closeTo(12, 1);
          expect(more.top - share.bottom).to.be.closeTo(12, 1);
          expect(root.scrollWidth).to.be.at.most(190);
        });
      cy.get('#before').focus();
      for (const id of ['reply', 'share', 'more']) {
        cy.realPress('Tab');
        cy.get(`#${id}`).should('have.focus');
      }
      audit('supported wrap override');
    });
    it('R4.09 keyed main-action reorder preserves focused DOM identity and the separate final action slot', () => {
      const Fixture = () => {
        const [reversed, setReversed] = React.useState(false);
        return (
          <CardFooter id="footer" action={{ id: 'action', children: <Button id="more">More</Button> }}>
            {(reversed ? ['share', 'reply'] : ['reply', 'share']).map(id => (
              <Button key={id} id={id} onClick={() => setReversed(!reversed)}>
                {id}
              </Button>
            ))}
          </CardFooter>
        );
      };
      render(<Fixture />);
      cy.get('#reply').then($button => {
        const original = $button[0];
        cy.get('#reply').realClick().should('have.focus');
        footer()
          .find('button')
          .should($buttons => expect([...$buttons].map(button => button.id)).to.deep.equal(['share', 'reply', 'more']));
        cy.get('#reply').should($el => expect($el[0]).to.equal(original));
        cy.realPress('Tab');
        cy.get('#more').should('have.focus');
        audit('keyed main-action reorder');
      });
    });
    it('R4.10 root and action groups forward independently resolved labels and descriptions', () => {
      render(
        <section aria-label="Action example" style={{ padding: 16 }}>
          <h2 id="title" style={{ margin: 0 }}>
            Document actions
          </h2>
          <p id="description">Choose a document action</p>
          <span id="extra-label">Additional actions</span>
          <CardFooter
            id="footer"
            role="group"
            aria-labelledby="title"
            aria-describedby="description"
            action={{ id: 'action', role: 'group', 'aria-labelledby': 'extra-label', children: <Button>More</Button> }}
          >
            <Button>Reply</Button>
          </CardFooter>
        </section>,
      );
      footer().should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Document actions');
        expect(computeAccessibleDescription($root[0])).to.equal('Choose a document action');
      });
      cy.get('#action').should($el => expect(computeAccessibleName($el[0])).to.equal('Additional actions'));
      audit('label and description relations');
    });
    it('R4.11 controlled native hidden attribute with explicit display override removes and restores tab stops', () => {
      const Fixture = () => {
        const [hidden, setHidden] = React.useState(true);
        return (
          <>
            <button id="before" onClick={() => setHidden(!hidden)}>
              Toggle actions
            </button>
            <CardFooter id="footer" hidden={hidden} style={{ display: hidden ? 'none' : undefined }}>
              <Button id="reply">Reply</Button>
            </CardFooter>
            <button id="after">After</button>
          </>
        );
      };
      render(<Fixture />);
      footer()
        .should('not.be.visible')
        .then($root => {
          const original = $root[0];
          expect(original.hasAttribute('hidden')).to.equal(true);
          cy.get('#before').focus();
          cy.realPress('Tab');
          cy.get('#after').should('have.focus');
          cy.get('#before').realClick();
          footer()
            .should('be.visible')
            .and('have.css', 'display', 'flex')
            .should($next => {
              expect($next[0]).to.equal(original);
              expect($next[0].hasAttribute('hidden')).to.equal(false);
            });
          cy.realPress('Tab');
          cy.get('#reply').should('have.focus');
          audit('native visibility update');
        });
    });
    for (const appearance of ['filled', 'filled-alternative', 'outline', 'subtle'] as const) {
      it(`R4.12 dark ${appearance} selected Card retains usable footer actions and strict contrast audit`, () => {
        render(<CardFixture cardProps={{ appearance, defaultSelected: true }} />, 'rtl', true);
        selected(true);
        footer().should('have.css', 'gap', '12px').and('have.css', 'flex-shrink', '0');
        cy.get('#more').realClick().should('have.focus');
        cy.realPress('Enter');
        selected(true);
        audit(`dark ${appearance} selected context`);
      });
    }
  });
};
const footer = () => cy.get('#footer');
type AuditBaseline = 'groupper' | 'focus-story' | 'disabled-story' | 'forced-colors';
const snapshotCheck = (check: axe.CheckResult) => ({
  ...check,
  dataKeys: check.data && typeof check.data === 'object' ? Object.keys(check.data) : [],
  undefinedDataKeys:
    check.data && typeof check.data === 'object'
      ? Object.entries(check.data)
          .filter(([, value]) => value === undefined)
          .map(([key]) => key)
      : [],
});
const audit = (phase: string, selector = '#fixture', baseline?: AuditBaseline) =>
  cy.get(selector).then($scope =>
    cy
      .then(() => axe.run($scope[0]))
      .then(result => {
        const document = $scope[0].ownerDocument;
        const report = {
          scenario: Cypress.currentTest.title,
          phase,
          scope: selector,
          classification: baseline || 'clean',
          passes: result.passes.map(({ id }) => id),
          violations: result.violations.map(({ id, impact, description, help, helpUrl, tags, nodes }) => ({
            id,
            impact,
            description,
            help,
            helpUrl,
            tags,
            nodes: nodes.map(({ target, html, failureSummary, impact: nodeImpact, any: anyChecks, all, none }) => ({
              target,
              html,
              metadata: nodeMetadata(document.querySelector(String(target[0]))!),
              actualOuterHTML: document.querySelector(String(target[0]))!.outerHTML,
              failureSummary,
              impact: nodeImpact,
              anyChecks: anyChecks.map(snapshotCheck),
              all: all.map(snapshotCheck),
              none: none.map(snapshotCheck),
            })),
          })),
          incomplete: result.incomplete.map(({ id, impact, description, help, helpUrl, tags, nodes }) => ({
            id,
            impact,
            description,
            help,
            helpUrl,
            tags,
            nodes: nodes.map(({ target, html, failureSummary, impact: nodeImpact, any: anyChecks, all, none }) => ({
              target,
              html,
              metadata: nodeMetadata(document.querySelector(String(target[0]))!),
              actualOuterHTML: document.querySelector(String(target[0]))!.outerHTML,
              failureSummary,
              impact: nodeImpact,
              anyChecks: anyChecks.map(snapshotCheck),
              all: all.map(snapshotCheck),
              none: none.map(snapshotCheck),
            })),
          })),
        };
        const auditPath =
          Cypress.env('cardFooterAuditPath') ||
          `src/components/CardFooter/.temp/audits-${Cypress.env('cardFooterRunId') || Date.now()}.jsonl`;
        return cy.writeFile(auditPath, `${JSON.stringify(report)}\n`, { flag: 'a', log: false }).then(() => {
          expect(report.passes.length, 'axe evaluated rules').to.be.greaterThan(0);
          if (baseline) {
            assertBaselineEnvelope({
              classification: baseline,
              scenario: report.scenario,
              phase,
              scope: selector,
              violationRules: report.violations.map(rule => rule.id),
              violationNodeCounts: report.violations.map(rule => rule.nodes.length),
              incompleteRules: report.incomplete.map(rule => rule.id),
              incompleteNodeCounts: report.incomplete.map(rule => rule.nodes.length),
            });
          }
          if (baseline === 'groupper' || baseline === 'focus-story' || baseline === 'disabled-story') {
            expect(selector).to.equal('#fixture');
            if (baseline === 'groupper') {
              expect(
                /^R3\.05 (ltr|rtl) (no-tab|tab-exit|tab-only) honors real Tab, Enter, Escape and footer action tab order$/.test(
                  report.scenario,
                ) ||
                  report.scenario ===
                    'R3.06 current source defaults interactive Card to no-tab, while footer actions remain reachable',
              ).to.equal(true);
              const match = report.scenario.match(/^R3\.05 (ltr|rtl) (no-tab|tab-exit|tab-only) /);
              expect(phase).to.equal(match ? `${match[1]} ${match[2]} keyboard` : 'implicit interactive focus mode');
            } else {
              expect(report.scenario).to.equal(
                baseline === 'focus-story'
                  ? 'R3.03 stable FocusMode story retains four real footers with named Open and Share actions'
                  : 'R3.04 stable Disabled story explicitly disables the five disabled-card footer pairs',
              );
              expect(phase).to.equal(baseline === 'focus-story' ? 'stable FocusMode' : 'stable Disabled');
            }
            expect(report.violations.map(({ id }) => id)).to.deep.equal(
              baseline === 'disabled-story' ? ['aria-hidden-focus', 'label'] : ['aria-hidden-focus'],
            );
            const cards =
              baseline === 'groupper'
                ? [document.querySelector('#card')!]
                : baseline === 'focus-story'
                ? Array.from(document.querySelectorAll('.fui-Card')).slice(1)
                : [document.querySelectorAll('.fui-Card')[2]];
            const sentinels = cards.flatMap(card => [card.previousElementSibling!, card.nextElementSibling!]);
            expect(result.violations[0].nodes.length).to.equal(baseline === 'focus-story' ? 6 : 2);
            result.violations[0].nodes.forEach((node, index) => {
              expect(node.target).to.have.length(1);
              expect(typeof node.target[0]).to.equal('string');
              const sentinel = sentinels[index];
              expect(document.querySelector(String(node.target[0]))).to.equal(sentinel);
              expect(sentinel.tagName).to.equal('I');
              expect(sentinel.getAttribute('role')).to.equal('none');
              expect(sentinel.getAttribute('tabindex')).to.equal('0');
              expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
              expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
                `isFirst=${index % 2 === 0}, isOutside=true, (Groupper, tabbable=true)`,
              );
              assertBaselineNode(node, sentinel, 'sentinel');
              expect(node.failureSummary).to.equal(
                'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM',
              );
            });
            if (baseline === 'disabled-story') {
              const unnamed = [6, 7].map(
                index =>
                  document
                    .querySelectorAll('.fui-Card')
                    [index].querySelector('.fui-Card__floatingAction .fui-Checkbox__input')!,
              );
              expect(result.violations[1].nodes).to.have.length(2);
              result.violations[1].nodes.forEach((node, index) => {
                expect(node.target).to.have.length(1);
                expect(document.querySelector(String(node.target[0]))).to.equal(unnamed[index]);
                expect(unnamed[index].tagName).to.equal('INPUT');
                expect(unnamed[index].getAttribute('type')).to.equal('checkbox');
                expect(unnamed[index].hasAttribute('disabled')).to.equal(index === 1);
                expect(computeAccessibleName(unnamed[index])).to.equal('');
                assertBaselineNode(node, unnamed[index], 'unnamed-checkbox');
              });
            }
          } else {
            expect(report.violations, `${phase}: violations`).to.deep.equal([]);
          }
          if (baseline === 'forced-colors') {
            expect(
              /^R3\.15 (ltr|rtl) (selected|hovered) Card in real forced-colors media records action currentColor and browser contrast baseline$/.test(
                report.scenario,
              ),
            ).to.equal(true);
            const match = report.scenario.match(/^R3\.15 (ltr|rtl) (selected|hovered) /)!;
            expect(phase).to.equal(`${match[1]} ${match[2]} forced colors`);
            expect(document.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true);
            expect(
              report.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
            ).to.deep.equal([{ id: 'color-contrast', targets: [['#more']] }]);
            const node = result.incomplete[0].nodes[0];
            expect(node.any.map(check => check.id)).to.deep.equal(['color-contrast']);
            expect(node.all).to.deep.equal([]);
            expect(node.none).to.deep.equal([]);
            expect(JSON.parse(JSON.stringify(node.any[0].data))).to.deep.equal({
              fgColor: '#ffffff',
              bgColor: '#ffffff',
              contrastRatio: 1,
              fontSize: '10.5pt (14px)',
              fontWeight: 'normal',
              messageKey: 'equalRatio',
              expectedContrastRatio: '4.5:1',
            });
            const button = document.querySelector('#more')!;
            expect(button.tagName).to.equal('BUTTON');
            expect(button.classList.contains('fui-Button')).to.equal(true);
            expect(button.textContent).to.equal('More');
            assertBaselineNode(node, button, 'forced-colors');
            expect(node.any[0].impact).to.equal('serious');
            expect(node.any[0].relatedNodes?.map(related => related.target)).to.deep.equal([['#more']]);
            const style = document.defaultView!.getComputedStyle(button);
            expect(style.color).to.equal('rgb(255, 255, 255)');
            expect(style.backgroundColor).to.equal('rgb(255, 255, 255)');
          } else {
            expect(report.incomplete, `${phase}: incomplete`).to.deep.equal([]);
          }
        });
      }),
  );
const actions = (props: CardFooterProps = {}, dir: 'ltr' | 'rtl' = 'ltr') =>
  render(
    <CardFooter
      id="footer"
      style={{ width: 400 }}
      action={{
        id: 'action',
        children: (
          <Button id="more" aria-label="More options">
            ...
          </Button>
        ),
      }}
      {...props}
    >
      <Button id="reply">Reply</Button>
      <Button id="share">Share</Button>
    </CardFooter>,
    dir,
  );
const geometry = (dir: 'ltr' | 'rtl', width = 400) =>
  footer().should($footer => {
    const root = $footer[0];
    const rect = root.getBoundingClientRect();
    const reply = root.querySelector('#reply')!.getBoundingClientRect();
    const share = root.querySelector('#share')!.getBoundingClientRect();
    const action = root.querySelector('#action')!.getBoundingClientRect();
    expect(rect.width, 'footer width').to.be.closeTo(width, 1);
    expect(reply.top, 'children share a row').to.be.closeTo(share.top, 1);
    expect(action.top, 'action is in same row').to.be.closeTo(reply.top, 1);
    if (dir === 'ltr') {
      expect(share.left - reply.right, '12px child gap').to.be.closeTo(12, 1);
      expect(rect.right - action.right, 'action at far end').to.be.closeTo(0, 1);
      expect(action.left - share.right, 'auto margin consumes free space').to.be.greaterThan(12);
    } else {
      expect(reply.left - share.right, '12px RTL child gap').to.be.closeTo(12, 1);
      expect(action.left - rect.left, 'action at logical end').to.be.closeTo(0, 1);
      expect(share.left - action.right, 'RTL auto margin').to.be.greaterThan(12);
    }
  });
const useOverrides = makeStyles({
  root: { gap: '20px', alignItems: 'center', padding: '10px' },
  action: { marginLeft: '0px', padding: '4px' },
});
const StyledFooter = () => {
  const styles = useOverrides();
  return (
    <CardFooter
      id="footer"
      className={mergeClasses('consumer-root', styles.root)}
      action={{
        id: 'action',
        className: mergeClasses('consumer-action', styles.action),
        children: <Button id="more">More</Button>,
      }}
    >
      <Button id="reply">Reply</Button>
      <Button id="share">Share</Button>
    </CardFooter>
  );
};
const useFooterState = (base: boolean) => {
  const ref = React.useRef<HTMLElement>(null);
  const useStateHook = base ? useCardFooterBase_unstable : useCardFooter_unstable;
  return useStateHook(
    {
      id: 'footer',
      children: <button id="save">Save</button>,
      action: { id: 'action', children: <button id="more">More</button> },
    },
    ref,
  );
};
const HookFooter = ({ base = false }: { base?: boolean }) => {
  const state = useFooterState(base);
  useCardFooterStyles_unstable(state);
  return renderCardFooter_unstable(state);
};
const HeadlessFooter = () => {
  const state = useFooterState(true);
  return renderCardFooter_unstable(state);
};
const CardFixture = ({
  cardProps = {},
  childDisabled = false,
  onAction,
  label = 'Document',
}: {
  cardProps?: CardProps;
  childDisabled?: boolean;
  onAction?: React.MouseEventHandler<HTMLButtonElement>;
  label?: string;
}) => (
  <>
    <button id="before">Before card</button>
    <Card id="card" aria-labelledby="title" aria-describedby="description" style={{ width: 900 }} {...cardProps}>
      <CardHeader
        header={
          <h2 id="title" style={{ margin: 0 }}>
            {label}
          </h2>
        }
      />
      <p id="description">Document description</p>
      <CardFooter
        id="footer"
        action={{
          id: 'action',
          children: (
            <Button id="more" disabled={childDisabled} onClick={onAction}>
              <span id="more-label">More</span>
            </Button>
          ),
        }}
      >
        <Button id="reply" disabled={childDisabled} onClick={onAction}>
          <span id="reply-label">Reply</span>
        </Button>
        <Button id="share">Share</Button>
        <span id="footer-text">Status</span>
      </CardFooter>
    </Card>
    <button id="after">After card</button>
  </>
);
const selected = (checked: boolean) =>
  cy.get('#card > input[type="checkbox"]').should(checked ? 'be.checked' : 'not.be.checked');
const forcedColors = (active: boolean) =>
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'forced-colors', value: active ? 'active' : 'none' }] },
    }),
  );

describe('ONLY127 CardFooter R1 documented anatomy and unit-derived contracts', () => {
  it('R1.01 stable Default story preserves named actions, order and far-end action', () => {
    render(<Default />);
    cy.get('.fui-CardFooter')
      .should('have.css', 'width', '300px')
      .find('button')
      .should($buttons => {
        expect([...$buttons].map(button => computeAccessibleName(button))).to.deep.equal([
          'Reply',
          'Share',
          'More options',
        ]);
      });
    cy.get('.fui-CardFooter__action').should($action => {
      expect(
        $action[0].parentElement!.getBoundingClientRect().right - $action[0].getBoundingClientRect().right,
      ).to.be.closeTo(0, 1);
    });
    audit('documented story');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`R1.02 ${dir} flex row has a measured 12px gap and trailing auto-aligned action`, () => {
      actions({}, dir);
      footer()
        .should('have.css', 'display', 'flex')
        .and('have.css', 'flex-direction', 'row')
        .and('have.css', 'gap', '12px');
      geometry(dir);
      audit(`${dir} layout`);
    });
    it(`R1.03 ${dir} keyboard follows DOM actions, not reversed visual order`, () => {
      render(
        <>
          <button id="before">Before</button>
          <CardFooter id="footer" action={<Button id="more">More</Button>}>
            <Button id="reply">Reply</Button>
            <Button id="share">Share</Button>
          </CardFooter>
          <button id="after">After</button>
        </>,
        dir,
      );
      cy.get('#before').focus();
      for (const id of ['reply', 'share', 'more', 'after']) {
        cy.realPress('Tab');
        cy.get(`#${id}`).should('have.focus');
      }
      cy.realPress(['Shift', 'Tab']);
      cy.get('#more').should('have.focus');
      audit(`${dir} keyboard`);
    });
  }

  for (const [name, action, expected] of [
    ['omitted', undefined, null],
    ['null', null, null],
    ['string shorthand', 'Action slot', 'Action slot'],
    ['number shorthand', 7, '7'],
    ['JSX shorthand', <button key="extra">Extra</button>, 'Extra'],
    ['empty object', {}, ''],
  ] as const) {
    it(`R1.04 optional action ${name} has exactly the source-defined wrapper behavior`, () => {
      render(
        <CardFooter id="footer" action={action}>
          Default CardFooter
        </CardFooter>,
      );
      footer().should('have.prop', 'tagName', 'DIV').and('have.class', cardFooterClassNames.root);
      footer().should($root => {
        for (const attribute of ['role', 'tabindex', 'action']) {
          expect($root[0].hasAttribute(attribute), attribute).to.equal(false);
        }
      });
      if (expected === null) {
        footer().find(`.${cardFooterClassNames.action}`).should('not.exist');
      } else {
        footer()
          .find(`.${cardFooterClassNames.action}`)
          .should('have.length', 1)
          .and('have.text', expected)
          .and('have.prop', 'tagName', 'DIV');
      }
      footer().should($root => expect($root[0].firstChild!.textContent).to.equal('Default CardFooter'));
      audit(`action ${name}`);
    });
  }

  it('R1.05 object shorthand preserves action attributes, classes, style, ref and click', () => {
    const actionRef = React.createRef<HTMLDivElement>();
    const onClick = cy.stub().as('actionClick');
    actions({
      action: {
        id: 'action',
        ref: actionRef,
        role: 'group',
        'aria-label': 'Additional actions',
        className: 'consumer-action',
        style: { padding: 3 },
        onClick,
        children: <Button id="more">More</Button>,
      },
    });
    cy.get('#action')
      .should('have.class', cardFooterClassNames.action)
      .and('have.class', 'consumer-action')
      .and('have.css', 'padding-top', '3px')
      .then($el => expect(actionRef.current).to.equal($el[0]));
    cy.get('#more').realClick();
    cy.get('@actionClick').should('have.been.calledOnce');
    audit('action object');
  });

  it('R1.06 root forwards object ref, group semantics, title, ARIA, data and consumer class', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <CardFooter
        id="footer"
        ref={ref}
        role="group"
        aria-label="Document actions"
        title="Actions"
        data-owner="consumer"
        className="consumer-root"
      >
        <Button>Save</Button>
      </CardFooter>,
    );
    footer()
      .should('have.class', cardFooterClassNames.root)
      .and('have.class', 'consumer-root')
      .and('have.attr', 'title', 'Actions')
      .and('have.attr', 'data-owner', 'consumer')
      .then($root => {
        expect(ref.current).to.equal($root[0]);
        expect(computeAccessibleName($root[0])).to.equal('Document actions');
      });
    audit('root attributes');
  });

  it('R1.07 callback ref receives mounted root and null on conditional unmount', () => {
    const ref = cy.stub().as('rootRef');
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="toggle" onClick={() => setVisible(!visible)}>
            Toggle footer
          </button>
          {visible && (
            <CardFooter ref={ref} id="footer">
              <Button>Save</Button>
            </CardFooter>
          )}
        </>
      );
    };
    render(<Fixture />);
    footer().then($root => expect(ref).to.have.been.calledWith($root[0]));
    cy.get('#toggle').realClick();
    footer().should('not.exist');
    cy.get('@rootRef').should('have.been.calledWith', null);
    cy.get('#toggle').realClick();
    footer().should('be.visible');
    audit('remounted footer');
  });

  it('R1.08 supported explicit root as div preserves neutral HTML and static classes', () => {
    render(
      <CardFooter id="footer" as="div">
        <Button>Save</Button>
      </CardFooter>,
    );
    footer().should('have.prop', 'tagName', 'DIV').and('have.class', cardFooterClassNames.root);
    audit('explicit root div');
  });

  it('R1.09 supported explicit action as div preserves its wrapper and logical alignment', () => {
    actions({ action: { as: 'div', id: 'action', children: <Button id="more">More</Button> } });
    cy.get('#action').should('have.prop', 'tagName', 'DIV').and('have.class', cardFooterClassNames.action);
    geometry('ltr');
    audit('explicit action div');
  });

  it('R1.10 native footer buttons activate by pointer, Enter and Space exactly once', () => {
    const click = cy.stub().as('click');
    render(
      <CardFooter id="footer">
        <Button id="save" onClick={click}>
          Save
        </Button>
      </CardFooter>,
    );
    cy.get('#save').realClick();
    cy.get('@click').should('have.been.calledOnce');
    cy.realPress('Enter');
    cy.get('@click').should('have.been.calledTwice');
    cy.realPress('Space');
    cy.get('@click').should('have.been.calledThrice');
    audit('button activation');
  });

  it('R1.11 root pointer and keyboard events bubble with the actual child target', () => {
    const click = cy.stub().as('rootClick');
    const key = cy.stub().as('rootKey');
    render(
      <CardFooter id="footer" onClick={click} onKeyDown={key}>
        <Button id="save">Save</Button>
      </CardFooter>,
    );
    cy.get('#save')
      .realClick()
      .then($button => expect(click.firstCall.args[0].target).to.equal($button[0]));
    cy.realPress('Enter');
    cy.get('@rootKey').should('have.been.calledOnce');
    cy.get('@rootClick').should('have.been.calledTwice');
    audit('bubbled events');
  });

  it('R1.12 explicitly focusable root is a normal tab stop without invented keyboard behavior', () => {
    const click = cy.stub().as('rootClick');
    render(
      <>
        <button id="before">Before</button>
        <CardFooter id="footer" role="group" aria-label="Actions" tabIndex={0} onClick={click}>
          <Button id="save">Save</Button>
        </CardFooter>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    footer().should('have.focus');
    cy.realPress('Enter');
    cy.realPress('Space');
    cy.get('@rootClick').should('not.have.been.called');
    cy.realPress('Tab');
    cy.get('#save').should('have.focus');
    audit('explicit focus');
  });
});

if (round >= 2) {
  describe('ONLY127 CardFooter R2 slots, styles and controlled native props', () => {
    it('R2.01 root render function preserves passed classes, ref, events and action children', () => {
      const click = cy.stub().as('rootClick');
      const ref = React.createRef<HTMLDivElement>();
      const renderRoot: SlotRenderFunction<React.ComponentProps<'div'>> = (Root, props) => (
        <Root {...props} role="group" aria-label="Rendered actions">
          <Button id="save">Custom save</Button>
          {props.children}
        </Root>
      );
      render(
        <CardFooter
          id="footer"
          ref={ref}
          className="rendered-root"
          onClick={click}
          action={{ id: 'action', children: <Button id="more">More</Button> }}
        >
          {renderRoot}
        </CardFooter>,
      );
      footer()
        .should('have.class', cardFooterClassNames.root)
        .and('have.class', 'rendered-root')
        .then($root => expect(ref.current).to.equal($root[0]));
      footer()
        .find('button')
        .should($buttons =>
          expect([...$buttons].map(button => button.textContent)).to.deep.equal(['Custom save', 'More']),
        );
      cy.get('#more').realClick();
      cy.get('@rootClick').should('have.been.calledOnce');
      audit('root render function');
    });
    it('R2.02 action render function receives styled props and supports custom interactive content', () => {
      const ref = React.createRef<HTMLDivElement>();
      const click = cy.stub().as('actionClick');
      const renderAction: SlotRenderFunction<React.ComponentProps<'div'>> = (Action, props) => (
        <Action {...props}>
          <Button id="more">Rendered more</Button>
        </Action>
      );
      actions({ action: { id: 'action', ref, className: 'rendered-action', onClick: click, children: renderAction } });
      cy.get('#action')
        .should('have.class', cardFooterClassNames.action)
        .and('have.class', 'rendered-action')
        .then($el => expect(ref.current).to.equal($el[0]));
      geometry('ltr');
      cy.get('#more').realClick();
      cy.get('@actionClick').should('have.been.calledOnce');
      audit('action render function');
    });
    for (const base of [false, true]) {
      it(`R2.03 ${
        base ? 'base' : 'full'
      } public state hook plus style hook and renderer preserves browser behavior`, () => {
        render(<HookFooter base={base} />);
        footer()
          .should('have.css', 'display', 'flex')
          .and('have.css', 'gap', '12px')
          .and('have.class', cardFooterClassNames.root);
        cy.get('#action').should('have.class', cardFooterClassNames.action);
        cy.get('#save').realClick().should('have.focus');
        cy.realPress('Tab');
        cy.get('#more').should('have.focus');
        audit('hook composition');
      });
    }
    it('R2.04 base hook and renderer without styles do not invent static classes or focus management', () => {
      render(<HeadlessFooter />);
      footer().should('not.have.class', cardFooterClassNames.root).and('have.css', 'display', 'block');
      cy.get('#action').should('not.have.class', cardFooterClassNames.action);
      footer().should($el => expect($el[0].hasAttribute('tabindex')).to.equal(false));
      cy.get('#save').realClick().should('have.focus');
      audit('headless composition');
    });
    for (const [name, content, text] of [
      ['array', [<Button key="a">One</Button>, <Button key="b">Two</Button>], 'OneTwo'],
      [
        'fragment',
        <>
          <Button>One</Button>
          <Button>Two</Button>
        </>,
        'OneTwo',
      ],
      ['empty string', '', ''],
      ['zero', 0, '0'],
    ] as const) {
      it(`R2.05 action ${name} shorthand remains a single wrapper with exact children`, () => {
        render(
          <CardFooter id="footer" action={content}>
            Main
          </CardFooter>,
        );
        footer().find(`.${cardFooterClassNames.action}`).should('have.length', 1).and('have.text', text);
        footer().should($el => expect($el[0].childNodes.length).to.equal(2));
        audit(`action ${name}`);
      });
    }
    it('R2.06 controlled root/action text, class, ARIA and styles update in place without stale callbacks', () => {
      const first = cy.stub().as('first');
      const second = cy.stub().as('second');
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setUpdated(!updated)}>
              Update
            </button>
            <CardFooter
              id="footer"
              role="group"
              aria-label={updated ? 'Published actions' : 'Draft actions'}
              className={updated ? 'published' : 'draft'}
              style={{ gap: updated ? 20 : 12 }}
              action={{
                id: 'action',
                className: updated ? 'new-action' : 'old-action',
                children: (
                  <Button id="more" onClick={updated ? second : first}>
                    {updated ? 'Publish' : 'Review'}
                  </Button>
                ),
              }}
            >
              <Button id="reply">{updated ? 'Published' : 'Draft'}</Button>
            </CardFooter>
          </>
        );
      };
      render(<Fixture />);
      footer().then($root => {
        const original = $root[0];
        cy.get('#more').realClick();
        cy.get('@first').should('have.been.calledOnce');
        cy.get('#update').realClick();
        footer()
          .should('have.class', 'published')
          .and('not.have.class', 'draft')
          .and('have.css', 'gap', '20px')
          .then($next => {
            expect($next[0]).to.equal(original);
            expect(computeAccessibleName($next[0])).to.equal('Published actions');
          });
        cy.get('#reply').should('have.text', 'Published');
        cy.get('#action').should('have.class', 'new-action').and('not.have.class', 'old-action');
        cy.get('#more').should('have.text', 'Publish').realClick();
        cy.get('@second').should('have.been.calledOnce');
        cy.get('@first').should('have.been.calledOnce');
        audit('controlled update');
      });
    });
    it('R2.07 removing and restoring action preserves the root and main-button identity', () => {
      const actionRef = cy.stub().as('actionRef');
      const Fixture = () => {
        const [show, setShow] = React.useState(true);
        return (
          <>
            <button id="toggle" onClick={() => setShow(!show)}>
              Toggle action
            </button>
            <CardFooter
              id="footer"
              action={show ? { id: 'action', ref: actionRef, children: <Button id="more">More</Button> } : null}
            >
              <Button id="reply">Reply</Button>
            </CardFooter>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#reply').then($button => {
        const original = $button[0];
        cy.get('#toggle').realClick();
        cy.get('#action').should('not.exist');
        cy.get('@actionRef').should('have.been.calledWith', null);
        cy.get('#reply').should($el => expect($el[0]).to.equal(original));
        cy.get('#toggle').realClick();
        cy.get('#action').should('be.visible');
        cy.get('#reply').should($el => expect($el[0]).to.equal(original));
        audit('action restored');
      });
    });
    it('R2.08 controlled disabled child is skipped by Tab and cannot activate until enabled', () => {
      const click = cy.stub().as('save');
      const Fixture = () => {
        const [disabled, setDisabled] = React.useState(true);
        return (
          <>
            <button id="before" onClick={() => setDisabled(false)}>
              Enable save
            </button>
            <CardFooter id="footer">
              <Button id="save" disabled={disabled} onClick={click}>
                Save
              </Button>
              <Button id="next">Next</Button>
            </CardFooter>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#next').should('have.focus');
      cy.get('#save').realClick();
      cy.get('@save').should('not.have.been.called');
      cy.get('#before').realClick();
      cy.realPress('Tab');
      cy.get('#save').should('not.be.disabled').and('have.focus');
      cy.realPress('Space');
      cy.get('@save').should('have.been.calledOnce');
      audit('enabled child');
    });
    it('R2.09 action Link forwards href and is keyboard reachable with an accessible name', () => {
      const click = cy.stub().as('link');
      render(
        <CardFooter
          id="footer"
          action={
            <Link
              id="link"
              href="#details"
              onClick={event => {
                event.preventDefault();
                click();
              }}
            >
              Details
            </Link>
          }
        >
          <Button id="reply">Reply</Button>
        </CardFooter>,
      );
      cy.get('#reply').focus();
      cy.realPress('Tab');
      cy.get('#link')
        .should('have.focus')
        .and('have.attr', 'href', '#details')
        .then($el => expect(computeAccessibleName($el[0])).to.equal('Details'));
      cy.realPress('Enter');
      cy.get('@link').should('have.been.calledOnce');
      audit('link activation');
    });
    it('R2.10 explicit submit child participates in its enclosing native form', () => {
      const submit = cy.stub().as('submit');
      render(
        <form
          aria-label="Edit document"
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <CardFooter id="footer">
            <Button id="save" type="submit">
              Save
            </Button>
          </CardFooter>
        </form>,
      );
      cy.get('#save').realClick();
      cy.get('@submit').should('have.been.calledOnce');
      cy.realPress('Enter');
      cy.get('@submit').should('have.been.calledTwice');
      audit('form submit');
    });
    it('R2.11 inline root and action styles override defaults with measurable spacing', () => {
      actions({
        style: { width: 400, gap: 24, alignItems: 'center', padding: 8 },
        action: { id: 'action', style: { marginLeft: 0 }, children: <Button id="more">More</Button> },
      });
      footer()
        .should('have.css', 'gap', '24px')
        .and('have.css', 'align-items', 'center')
        .and('have.css', 'padding-left', '8px');
      footer().should($root => {
        const reply = $root[0].querySelector('#reply')!.getBoundingClientRect();
        const share = $root[0].querySelector('#share')!.getBoundingClientRect();
        const action = $root[0].querySelector('#action')!.getBoundingClientRect();
        expect(share.left - reply.right).to.be.closeTo(24, 1);
        expect(action.left - share.right).to.be.closeTo(24, 1);
      });
      audit('inline overrides');
    });
    it('R2.12 consumer Griffel classes override root and action atomic rules without losing static names', () => {
      render(<StyledFooter />);
      footer()
        .should('have.class', cardFooterClassNames.root)
        .and('have.class', 'consumer-root')
        .and('have.css', 'gap', '20px')
        .and('have.css', 'padding-left', '10px');
      cy.get('#action')
        .should('have.class', cardFooterClassNames.action)
        .and('have.class', 'consumer-action')
        .and('have.css', 'margin-left', '0px')
        .and('have.css', 'padding-left', '4px');
      cy.get('#more').realClick().should('have.focus');
      audit('Griffel overrides');
    });
    it('R2.13 named provider style hook executes after default styles and changes both slots', () => {
      const customHook = (unknownState: unknown) => {
        const state = unknownState as CardFooterState;
        state.root.style = { ...state.root.style, gap: 18 };
        if (state.action) {
          state.action.style = { ...state.action.style, padding: 6 };
        }
      };
      const hooks: FluentProviderCustomStyleHooks = {};
      hooks.useCardFooterStyles_unstable = customHook;
      render(
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
          <CardFooter id="footer" action={{ id: 'action', children: <Button>More</Button> }}>
            <Button>Save</Button>
          </CardFooter>
        </FluentProvider>,
      );
      footer().should('have.class', cardFooterClassNames.root).and('have.css', 'gap', '18px');
      cy.get('#action').should('have.class', cardFooterClassNames.action).and('have.css', 'padding-left', '6px');
      audit('provider hook');
    });
    it('R2.14 caller stopPropagation isolates footer action from its ancestor click handler', () => {
      const ancestor = cy.stub().as('ancestor');
      const click = cy.stub().as('child');
      render(
        <div onClick={ancestor}>
          <CardFooter
            id="footer"
            action={
              <Button
                id="more"
                onClick={event => {
                  event.stopPropagation();
                  click();
                }}
              >
                More
              </Button>
            }
          >
            <Button id="reply">Reply</Button>
          </CardFooter>
        </div>,
      );
      cy.get('#more').realClick();
      cy.get('@child').should('have.been.calledOnce');
      cy.get('@ancestor').should('not.have.been.called');
      cy.get('#reply').realClick();
      cy.get('@ancestor').should('have.been.calledOnce');
      audit('event isolation');
    });
    it('R2.15 controlled provider direction updates logical auto margin on the same footer', () => {
      const Fixture = () => {
        const [dir, setDir] = React.useState<'ltr' | 'rtl'>('ltr');
        return (
          <>
            <button id="direction" onClick={() => setDir(dir === 'ltr' ? 'rtl' : 'ltr')}>
              Change direction
            </button>
            <FluentProvider theme={webLightTheme} dir={dir}>
              <CardFooter
                id="footer"
                style={{ width: 400 }}
                action={{ id: 'action', children: <Button id="more">More</Button> }}
              >
                <Button id="reply">Reply</Button>
                <Button id="share">Share</Button>
              </CardFooter>
            </FluentProvider>
          </>
        );
      };
      render(<Fixture />);
      geometry('ltr');
      footer().then($root => {
        const original = $root[0];
        cy.get('#direction').realClick();
        geometry('rtl');
        footer().should($el => expect($el[0]).to.equal(original));
        cy.get('#direction').realClick();
        geometry('ltr');
        audit('direction updated');
      });
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const width of [280, 400, 720]) {
        it(`R2.16 ${dir} fluid footer remains aligned and operable at ${width}px viewport`, () => {
          cy.viewport(width, 600);
          render(
            <CardFooter
              id="footer"
              style={{ width: '100%' }}
              action={{
                id: 'action',
                children: (
                  <Button size="small" id="more">
                    More
                  </Button>
                ),
              }}
            >
              <Button size="small" id="reply">
                Reply
              </Button>
              <Button size="small" id="share">
                Share
              </Button>
            </CardFooter>,
            dir,
          );
          footer().then($root => {
            const actualWidth = $root[0].getBoundingClientRect().width;
            expect(actualWidth)
              .to.be.lessThan(width + 1)
              .and.greaterThan(width - 40);
            geometry(dir, actualWidth);
          });
          cy.get('#more').realClick().should('have.focus');
          cy.get('#share').realClick().should('have.focus');
          audit(`${dir} viewport ${width}`);
        });
      }
    }
    it('R2.17 consumer vertical wrapping is an explicit CSS override, not a footer orientation API', () => {
      actions({
        style: { flexDirection: 'column', gap: 16, width: 160 },
        action: { id: 'action', style: { marginLeft: 0 }, children: <Button id="more">More</Button> },
      });
      footer()
        .should('have.css', 'flex-direction', 'column')
        .and('have.css', 'gap', '16px')
        .should($root => {
          const reply = $root[0].querySelector('#reply')!.getBoundingClientRect();
          const share = $root[0].querySelector('#share')!.getBoundingClientRect();
          expect(share.top - reply.bottom).to.be.closeTo(16, 1);
        });
      cy.get('#more').realClick().should('have.focus');
      audit('consumer column');
    });
    it('R2.18 empty root and action-only footer preserve optional anatomy without anonymous controls', () => {
      render(
        <>
          <CardFooter id="empty" />
          <CardFooter id="footer" action={{ id: 'action', children: <Button id="more">More</Button> }} />
        </>,
      );
      cy.get('#empty').should('be.empty').and('have.class', cardFooterClassNames.root);
      footer().children().should('have.length', 1).and('have.class', cardFooterClassNames.action);
      cy.get('#more').realClick().should('have.focus');
      audit('empty and action-only');
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`R2.19 ${dir} oversized default children overflow rather than receiving undocumented wrapping`, () => {
        actions({ style: { width: 264 } }, dir);
        footer()
          .should('have.css', 'flex-wrap', 'nowrap')
          .should($root => {
            const root = $root[0];
            const buttons = Array.from(root.querySelectorAll('button')).map(button => button.getBoundingClientRect());
            const action = root.querySelector('#action')!.getBoundingClientRect();
            const rect = root.getBoundingClientRect();
            const contentWidth = buttons.reduce((sum, button) => sum + button.width, 0) + 24;
            expect(contentWidth - rect.width).to.be.closeTo(48, 1);
            expect(buttons[0].top).to.be.closeTo(buttons[1].top, 1);
            expect(dir === 'ltr' ? action.right - rect.right : rect.left - action.left).to.be.closeTo(48, 1);
          });
        audit('documented no-wrap constraint');
      });
    }
  });
}

if (round >= 3) {
  describe('ONLY127 CardFooter R3 inherited Card behavior and stable compositions', () => {
    it('R3.01 stable Card Default keeps footer non-shrinking, named and keyboard operable', () => {
      renderStableStory(<DefaultCard />);
      cy.get('.fui-CardFooter')
        .should('have.css', 'flex-shrink', '0')
        .and('have.css', 'gap', '12px')
        .find('button')
        .should($buttons => {
          expect([...$buttons].map(button => computeAccessibleName(button))).to.deep.equal(['Reply', 'Share']);
        });
      cy.contains('.fui-CardFooter button', 'Reply').focus();
      cy.realPress('Tab');
      cy.contains('.fui-CardFooter button', 'Share').should('have.focus');
      audit('stable Card Default');
    });
    it('R3.02 stable WithAction footer keeps native Open keyboard access and existing click bubbling', () => {
      cy.window().then(win => cy.stub(win, 'alert').as('opened'));
      renderStableStory(<WithAction />);
      cy.contains('.fui-CardFooter button', 'Open').realClick();
      cy.get('@opened')
        .should('have.been.calledTwice')
        .and('have.been.calledWith', 'Opened Classroom Collaboration app');
      cy.realPress('Enter');
      cy.get('@opened').should('have.callCount', 5);
      audit('stable WithAction');
    });
    it('R3.03 stable FocusMode story retains four real footers with named Open and Share actions', () => {
      renderStableStory(<FocusMode />);
      cy.get('.fui-CardFooter')
        .should('have.length', 4)
        .each($footer => {
          expect($footer.css('flex-shrink')).to.equal('0');
          expect([...$footer.find('button')].map(button => computeAccessibleName(button))).to.deep.equal([
            'Open',
            'Share',
          ]);
        });
      cy.get('.fui-CardFooter').eq(0).find('button').last().focus();
      cy.realPress('Tab');
      cy.get('.fui-Card').eq(1).should('have.focus');
      cy.realPress('Enter');
      cy.get('.fui-Card').eq(1).find('button').first().should('have.focus');
      cy.realPress('Tab');
      cy.get('.fui-CardFooter').eq(1).find('button').first().should('have.focus');
      cy.realPress('Escape');
      cy.get('.fui-Card').eq(1).should('have.focus');
      audit('stable FocusMode', '#fixture', 'focus-story');
    });
    it('R3.04 stable Disabled story explicitly disables the five disabled-card footer pairs', () => {
      renderStableStory(<Disabled />);
      cy.get('.fui-CardFooter')
        .should('have.length', 10)
        .each(($footer, index) => {
          $footer.find('button').each((_, button) => {
            expect(button.hasAttribute('disabled'), `footer ${index}`).to.equal(index % 2 === 1);
          });
        });
      cy.get('.fui-CardFooter').eq(0).find('button').first().realClick().should('have.focus');
      cy.realPress('Tab');
      cy.get('.fui-CardFooter').eq(0).find('button').last().should('have.focus');
      cy.realPress('Tab');
      cy.get('.fui-Card').eq(2).should('have.focus');
      cy.realPress('Enter');
      cy.get('.fui-CardFooter').eq(2).find('button').first().should('have.focus');
      cy.realPress('Escape');
      cy.get('.fui-Card').eq(2).should('have.focus');
      audit('stable Disabled', '#fixture', 'disabled-story');
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      for (const mode of ['off', 'no-tab', 'tab-exit', 'tab-only'] as const) {
        it(`R3.05 ${dir} ${mode} honors real Tab, Enter, Escape and footer action tab order`, () => {
          render(<CardFixture cardProps={{ focusMode: mode }} />, dir);
          cy.get('#card').should($card =>
            expect($card[0].getAttribute('tabindex')).to.equal(mode === 'off' ? null : '0'),
          );
          cy.get('#before').focus();
          cy.realPress('Tab');
          if (mode === 'off') {
            cy.get('#reply').should('have.focus');
          } else {
            cy.get('#card').should('have.focus');
            cy.realPress('Enter');
            cy.get('#reply').should('have.focus');
          }
          for (const id of ['share', 'more']) {
            cy.realPress('Tab');
            cy.get(`#${id}`).should('have.focus');
          }
          cy.realPress('Tab');
          cy.get(mode === 'no-tab' ? '#reply' : '#after').should('have.focus');
          if (mode === 'no-tab' || mode === 'tab-exit') {
            cy.get('#more').focus();
            cy.realPress('Escape');
            cy.get('#card').should('have.focus');
          }
          audit(`${dir} ${mode} keyboard`, '#fixture', mode === 'off' ? undefined : 'groupper');
        });
      }
    }
    it('R3.06 current source defaults interactive Card to no-tab, while footer actions remain reachable', () => {
      const click = cy.stub().as('cardClick');
      render(<CardFixture cardProps={{ onClick: click }} />);
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#card').should('have.focus');
      cy.realPress('Enter');
      cy.get('#reply').should('have.focus');
      cy.realPress('Tab');
      cy.realPress('Tab');
      cy.get('#more').should('have.focus');
      cy.realPress('Tab');
      cy.get('#reply').should('have.focus');
      cy.realPress('Escape');
      cy.get('#card').should('have.focus');
      cy.get('@cardClick').should('not.have.been.called');
      audit('implicit interactive focus mode', '#fixture', 'groupper');
    });
    it('R3.07 changing inherited focusMode updates root tab participation without replacing footer buttons', () => {
      const Fixture = () => {
        const [mode, setMode] = React.useState<'off' | 'no-tab'>('off');
        return (
          <>
            <button id="mode" onClick={() => setMode(mode === 'off' ? 'no-tab' : 'off')}>
              Change mode
            </button>
            <CardFixture cardProps={{ focusMode: mode }} />
          </>
        );
      };
      render(<Fixture />);
      cy.get('#reply').then($button => {
        const original = $button[0];
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get('#reply').should('have.focus');
        cy.get('#mode').realClick();
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get('#card').should('have.focus');
        cy.realPress('Enter');
        cy.get('#reply')
          .should('have.focus')
          .should($el => expect($el[0]).to.equal(original));
        cy.realPress('Escape');
        cy.get('#mode').realClick();
        cy.get('#card').should($el => expect($el[0].hasAttribute('tabindex')).to.equal(false));
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get('#reply').should('have.focus');
        audit('focusMode changed');
      });
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const initial of [false, true]) {
        it(`R3.08 ${dir} initially ${
          initial ? 'selected' : 'unselected'
        } Card toggles on footer text but not nested buttons`, () => {
          const selection = cy.stub().as('selection');
          const action = cy.stub().as('action');
          render(
            <CardFixture cardProps={{ defaultSelected: initial, onSelectionChange: selection }} onAction={action} />,
            dir,
          );
          selected(initial);
          cy.get('#card > input').should($el => expect(computeAccessibleName($el[0])).to.equal('Document'));
          cy.get('#footer-text').realClick();
          selected(!initial);
          cy.get('@selection')
            .should('have.been.calledOnce')
            .then(() => expect(selection.firstCall.args[1]).to.deep.equal({ selected: !initial }));
          cy.get('#reply-label').realClick();
          cy.realPress('Enter');
          cy.realPress('Space');
          cy.get('#more-label').realClick();
          cy.realPress('Enter');
          cy.realPress('Space');
          cy.get('@action').should('have.callCount', 6);
          cy.get('@selection').should('have.been.calledOnce');
          selected(!initial);
          cy.get('#footer-text').realClick();
          selected(initial);
          cy.get('@selection').should('have.been.calledTwice');
          audit('nested actions isolated from selection');
        });
      }
    }
    for (const commit of [false, true]) {
      it(`R3.09 controlled Card ${
        commit ? 'accepts' : 'rejects'
      } selection requests without stale footer state`, () => {
        const selection = cy.stub().as('selection');
        const Fixture = () => {
          const [checked, setChecked] = React.useState(false);
          return (
            <>
              <button id="external" onClick={() => setChecked(!checked)}>
                External selection
              </button>
              <CardFixture
                cardProps={{
                  selected: checked,
                  onSelectionChange: (event, data) => {
                    selection(event, data);
                    if (commit) {
                      setChecked(data.selected);
                    }
                  },
                }}
              />
            </>
          );
        };
        render(<Fixture />);
        selected(false);
        cy.get('#footer-text').realClick();
        selected(commit);
        cy.get('@selection').should('have.been.calledOnce');
        cy.get('#more').realClick();
        cy.realPress('Enter');
        selected(commit);
        cy.get('@selection').should('have.been.calledOnce');
        cy.get('#external').realClick();
        selected(!commit);
        footer().should('have.css', 'gap', '12px');
        audit('controlled Card selection');
      });
    }
    for (const childDisabled of [false, true]) {
      it(`R3.10 disabled Card ${
        childDisabled ? 'with explicitly disabled' : 'does not implicitly disable'
      } footer actions`, () => {
        const action = cy.stub().as('action');
        const selection = cy.stub().as('selection');
        const cardClick = cy.stub().as('cardClick');
        render(
          <CardFixture
            childDisabled={childDisabled}
            onAction={action}
            cardProps={{ disabled: true, selected: false, onSelectionChange: selection, onClick: cardClick }}
          />,
        );
        cy.get('#card').should('have.attr', 'aria-disabled', 'true');
        cy.get('#card > input').should('be.disabled');
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get(childDisabled ? '#share' : '#reply').should('have.focus');
        cy.get('#reply').should(childDisabled ? 'be.disabled' : 'not.be.disabled');
        cy.get('#reply').realClick();
        cy.get('@action').should(childDisabled ? 'not.have.been.called' : 'have.been.calledOnce');
        cy.get('#footer-text').realClick();
        selected(false);
        cy.get('@selection').should('not.have.been.called');
        cy.get('@cardClick').should('not.have.been.called');
        audit('disabled inheritance');
      });
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const orientation of ['vertical', 'horizontal'] as const) {
        for (const [size, padding] of [
          ['small', 8],
          ['medium', 12],
          ['large', 16],
        ] as const) {
          it(`R3.11 ${dir} ${orientation} ${size} Card retains footer gap, non-shrink and inherited growth`, () => {
            render(<CardFixture cardProps={{ orientation, size }} />, dir);
            cy.get('#card')
              .should('have.css', 'padding-left', `${padding}px`)
              .and('have.css', 'flex-direction', orientation === 'horizontal' ? 'row' : 'column');
            footer()
              .should('have.css', 'gap', '12px')
              .and('have.css', 'flex-shrink', '0')
              .and('have.css', 'flex-grow', orientation === 'horizontal' ? '1' : '0');
            footer().should($root => {
              const rect = $root[0].getBoundingClientRect();
              const action = $root[0].querySelector('#action')!.getBoundingClientRect();
              const reply = $root[0].querySelector('#reply')!.getBoundingClientRect();
              const share = $root[0].querySelector('#share')!.getBoundingClientRect();
              expect(dir === 'ltr' ? share.left - reply.right : reply.left - share.right).to.be.closeTo(12, 1);
              expect(dir === 'ltr' ? rect.right - action.right : action.left - rect.left).to.be.closeTo(0, 1);
            });
            cy.get('#more').realClick().should('have.focus');
            audit(`${dir} ${orientation} ${size}`);
          });
        }
      }
    }
    for (const dark of [false, true]) {
      it(`R3.12 ${dark ? 'dark' : 'light'} selected Card footer preserves named actions and actual contrast`, () => {
        render(<CardFixture cardProps={{ defaultSelected: true }} />, 'ltr', dark);
        selected(true);
        cy.get('#reply').realClick().should('have.focus');
        selected(true);
        audit(`${dark ? 'dark' : 'light'} selected theme`);
      });
    }
    it('R3.13 updated CardHeader context names its selection checkbox without footer relabeling', () => {
      const Fixture = () => {
        const [label, setLabel] = React.useState('Draft document');
        return (
          <>
            <button id="rename" onClick={() => setLabel('Published document')}>
              Rename document
            </button>
            <CardFixture label={label} cardProps={{ defaultSelected: false }} />
          </>
        );
      };
      render(<Fixture />);
      cy.get('#card > input').should($el => expect(computeAccessibleName($el[0])).to.equal('Draft document'));
      cy.get('#rename').realClick();
      cy.get('#card > input').should($el => expect(computeAccessibleName($el[0])).to.equal('Published document'));
      cy.get('#reply').should($el => expect(computeAccessibleName($el[0])).to.equal('Reply'));
      cy.get('#more').should($el => expect(computeAccessibleName($el[0])).to.equal('More'));
      cy.get('#footer-text').realClick();
      selected(true);
      audit('updated inherited accessible name');
    });
    it('R3.14 changing inherited orientation, size and selected state preserves footer identity and action focus', () => {
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="update-card" onClick={() => setUpdated(!updated)}>
              Update card
            </button>
            <CardFixture
              cardProps={{
                size: updated ? 'large' : 'small',
                orientation: updated ? 'horizontal' : 'vertical',
                selected: updated,
              }}
            />
          </>
        );
      };
      render(<Fixture />);
      footer().then($root => {
        const original = $root[0];
        cy.get('#update-card').realClick();
        cy.get('#card').should('have.css', 'padding-left', '16px').and('have.css', 'flex-direction', 'row');
        selected(true);
        footer()
          .should('have.css', 'gap', '12px')
          .and('have.css', 'flex-grow', '1')
          .should($next => expect($next[0]).to.equal(original));
        cy.get('#more').realClick().should('have.focus');
        selected(true);
        audit('inherited controlled update');
      });
    });
  });
  describe('ONLY127 CardFooter forced-colors action Button and Link rules', () => {
    afterEach(() => forcedColors(false));
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const state of ['selected', 'hovered'] as const) {
        it(`R3.15 ${dir} ${state} Card in real forced-colors media records action currentColor and browser contrast baseline`, () => {
          forcedColors(true);
          render(
            <>
              <button id="outside">Outside card</button>
              <Card
                id="card"
                aria-label="Document"
                checkbox={{ 'aria-label': 'Select Document' }}
                selected={state === 'selected'}
                style={{ width: 400 }}
              >
                <CardFooter
                  id="footer"
                  action={{
                    id: 'action',
                    children: (
                      <>
                        <Button id="more">More</Button>
                        <Link id="link" href="#details">
                          Details
                        </Link>
                      </>
                    ),
                  }}
                >
                  <Button id="reply">Reply</Button>
                </CardFooter>
              </Card>
            </>,
            dir,
          );
          cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
          if (state === 'hovered') {
            cy.get('#card').realHover({ position: { x: 8, y: 8 } });
          } else {
            cy.get('#outside').realHover();
          }
          cy.get('#card').should($card => expect($card[0].matches(':hover')).to.equal(state === 'hovered'));
          cy.get('#card').should('have.css', 'forced-color-adjust', 'none');
          footer().should('have.css', 'forced-color-adjust', 'auto');
          for (const selector of ['#more', '#link']) {
            cy.get(selector).should($el => {
              const style = $el[0].ownerDocument.defaultView!.getComputedStyle($el[0]);
              expect($el[0].matches(':hover'), `${selector} is not independently hovered`).to.equal(false);
              expect(style.borderTopColor, `${selector} border`).to.equal(
                selector === '#more' ? 'rgb(0, 0, 0)' : style.color,
              );
              expect(style.outlineColor, `${selector} outline`).to.equal(style.color);
            });
          }
          cy.get('#more').realClick().should('have.focus');
          cy.realPress('Tab');
          cy.get('#link').should('have.focus');
          audit(`${dir} ${state} forced colors`, '#fixture', 'forced-colors');
        });
      }
    }
  });
}
if (round >= 4) {
  registerRoundFour();
}

if (round >= 5) {
  describe('ONLY127 CardFooter R5 adversarial native ownership and live contracts', () => {
    it('R5.01 specification Task composition accepts status text without creating actions or selection', () => {
      render(
        <Card aria-label="Automation task">
          <CardHeader header={<h2>Alert in Teams when a new document is uploaded in channel</h2>} />
          <CardFooter id="footer">
            <span>Automated</span>
            <span>3290 uses</span>
          </CardFooter>
        </Card>,
      );
      footer().should('have.text', 'Automated3290 uses').and('have.css', 'gap', '12px');
      footer().find('button, input, [role], [tabindex]').should('not.exist');
      footer().should($root => {
        expect($root[0].hasAttribute('role')).to.equal(false);
        expect($root[0].hasAttribute('tabindex')).to.equal(false);
      });
      cy.get('.fui-Card').find('input').should('not.exist');
      audit('specification Task text anatomy');
    });

    it('R5.02 real pointer, Enter and Space preserve exact capture/bubble order, event identity and currentTarget', () => {
      type Record = {
        owner: string;
        event: React.MouseEvent<HTMLElement>;
        native: MouseEvent;
        target: EventTarget;
        currentTarget: EventTarget;
        type: string;
        detail: number;
        button: number;
        trusted: boolean;
      };
      const records: Record[] = [];
      const record = (owner: string) => (event: React.MouseEvent<HTMLElement>) => {
        records.push({
          owner,
          event,
          native: event.nativeEvent,
          target: event.target,
          currentTarget: event.currentTarget,
          type: event.type,
          detail: event.detail,
          button: event.button,
          trusted: event.nativeEvent.isTrusted,
        });
      };
      render(
        <section
          id="outer"
          aria-label="Event example"
          onClickCapture={record('outer-capture')}
          onClick={record('outer')}
        >
          <CardFooter
            id="footer"
            onClickCapture={record('root-capture')}
            onClick={record('root')}
            action={{
              id: 'action',
              onClickCapture: record('action-capture'),
              onClick: record('action'),
              children: (
                <Button id="more" onClickCapture={record('child-capture')} onClick={record('child')}>
                  <span id="label">More</span>
                </Button>
              ),
            }}
          />
        </section>,
      );
      const assertPacket = (offset: number, targetId: string, detail: number) =>
        cy.get(`#${targetId}`).then($target => {
          const packet = records.slice(offset, offset + 8);
          expect(packet.map(item => item.owner)).to.deep.equal([
            'outer-capture',
            'root-capture',
            'action-capture',
            'child-capture',
            'child',
            'action',
            'root',
            'outer',
          ]);
          packet.forEach((item, index) => {
            const id = ['outer', 'footer', 'action', 'more', 'more', 'action', 'footer', 'outer'][index];
            expect(item.currentTarget).to.equal($target[0].ownerDocument.getElementById(id));
            expect(item.target).to.equal($target[0]);
            expect(item.native).to.equal(packet[0].native);
            expect(item.event).to.equal(packet[index < 4 ? 0 : 4].event);
            expect({ type: item.type, detail: item.detail, button: item.button, trusted: item.trusted }).to.deep.equal({
              type: 'click',
              detail,
              button: 0,
              trusted: true,
            });
          });
        });
      cy.get('#label').realClick();
      assertPacket(0, 'label', 1);
      cy.get('#more').should('have.focus');
      cy.realPress('Enter');
      assertPacket(8, 'more', 0);
      cy.realPress('Space');
      assertPacket(16, 'more', 0);
      cy.then(() => expect(records).to.have.length(24));
      audit('native click ownership and exact event packets');
    });

    it('R5.03 caller root key cancellation prevents native Enter activation without a footer-generated click', () => {
      const keys: { key: string; target: EventTarget; currentTarget: EventTarget; trusted: boolean }[] = [];
      let clicks = 0;
      render(
        <CardFooter
          id="footer"
          onKeyDown={event => {
            keys.push({
              key: event.key,
              target: event.target,
              currentTarget: event.currentTarget,
              trusted: event.nativeEvent.isTrusted,
            });
            if (event.key === 'Enter') {
              event.preventDefault();
            }
          }}
          action={
            <Button id="more" onClick={() => ++clicks}>
              More
            </Button>
          }
        />,
      );
      cy.get('#more').focus();
      cy.realPress('Enter');
      cy.then(() => expect(clicks).to.equal(0));
      cy.realPress('Space');
      cy.get('#more').then($button => {
        expect(clicks).to.equal(1);
        expect(keys.map(item => item.key)).to.deep.equal(['Enter', ' ']);
        keys.forEach(item => {
          expect(item.target).to.equal($button[0]);
          expect(item.currentTarget).to.equal($button[0].parentElement!.parentElement);
          expect(item.trusted).to.equal(true);
        });
      });
      audit('consumer key cancellation');
    });

    it('R5.04 Link preventDefault retains the same native event and bubbles the cancellation to both passive slots', () => {
      const events: {
        owner: string;
        native: MouseEvent;
        prevented: boolean;
        target: EventTarget;
        currentTarget: EventTarget;
      }[] = [];
      const record = (owner: string, event: React.MouseEvent<HTMLElement>) => {
        events.push({
          owner,
          native: event.nativeEvent,
          prevented: event.defaultPrevented,
          target: event.target,
          currentTarget: event.currentTarget,
        });
      };
      render(
        <CardFooter
          id="footer"
          onClick={event => record('root', event)}
          action={{
            id: 'action',
            onClick: event => record('action', event),
            children: (
              <Link
                id="link"
                href="#details"
                onClick={event => {
                  event.preventDefault();
                  record('link', event);
                }}
              >
                Details
              </Link>
            ),
          }}
        />,
      );
      cy.get('#link').realClick();
      cy.realPress('Enter');
      cy.get('#link').then($link => {
        expect(events).to.have.length(6);
        for (const offset of [0, 3]) {
          const packet = events.slice(offset, offset + 3);
          expect(packet.map(item => item.owner)).to.deep.equal(['link', 'action', 'root']);
          packet.forEach((item, index) => {
            expect(item.native).to.equal(packet[0].native);
            expect(item.prevented).to.equal(true);
            expect(item.target).to.equal($link[0]);
            expect(item.currentTarget).to.equal(
              $link[0].ownerDocument.getElementById(['link', 'action', 'footer'][index]),
            );
          });
        }
      });
      audit('native link cancellation ownership');
    });

    it('R5.05 caller-focusable group does not implement roving focus, selection or keyboard activation', () => {
      let clicks = 0;
      render(
        <CardFooter id="footer" role="group" aria-label="Document actions" tabIndex={0} onClick={() => ++clicks}>
          <Button id="reply">Reply</Button>
          <Button id="share">Share</Button>
        </CardFooter>,
      );
      footer().focus();
      for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape', 'Enter', 'Space'] as const) {
        cy.realPress(key);
        footer().should('have.focus');
      }
      cy.then(() => expect(clicks).to.equal(0));
      footer().find('input, [aria-selected], [aria-checked]').should('not.exist');
      cy.realPress('Tab');
      cy.get('#reply').should('have.focus');
      audit('neutral focusable group ownership');
    });

    it('R5.06 replacing root and action callbacks detaches old refs before attaching the same live nodes', () => {
      const roots: { owner: string; node: HTMLElement | null }[] = [];
      const actionsRefs: { owner: string; node: HTMLDivElement | null }[] = [];
      const firstRoot = (node: HTMLElement | null) => {
        roots.push({ owner: 'first', node });
      };
      const secondRoot = (node: HTMLElement | null) => {
        roots.push({ owner: 'second', node });
      };
      const firstAction = (node: HTMLDivElement | null) => {
        actionsRefs.push({ owner: 'first', node });
      };
      const secondAction = (node: HTMLDivElement | null) => {
        actionsRefs.push({ owner: 'second', node });
      };
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setUpdated(true)}>
              Update refs
            </button>
            <CardFooter
              id="footer"
              ref={updated ? secondRoot : firstRoot}
              action={{
                id: 'action',
                ref: updated ? secondAction : firstAction,
                children: <Button id="more">More</Button>,
              }}
            >
              <Button id="reply">Reply</Button>
            </CardFooter>
          </>
        );
      };
      render(<Fixture />);
      footer().then($root => {
        const root = $root[0];
        const action = root.querySelector('#action');
        expect(roots).to.deep.equal([
          { owner: 'first', node: root },
          { owner: 'first', node: null },
          { owner: 'first', node: root },
        ]);
        expect(actionsRefs).to.deep.equal([
          { owner: 'first', node: action },
          { owner: 'first', node: null },
          { owner: 'first', node: action },
        ]);
        cy.get('#update').realClick();
        footer().should($next => {
          expect($next[0]).to.equal(root);
          expect(roots).to.deep.equal([
            { owner: 'first', node: root },
            { owner: 'first', node: null },
            { owner: 'first', node: root },
            { owner: 'first', node: null },
            { owner: 'second', node: root },
          ]);
          expect(actionsRefs).to.deep.equal([
            { owner: 'first', node: action },
            { owner: 'first', node: null },
            { owner: 'first', node: action },
            { owner: 'first', node: null },
            { owner: 'second', node: action },
          ]);
        });
        audit('root and action ref replacement order');
      });
    });

    it('R5.07 action removal and root remount deliver exact null refs and detach the previous DOM nodes', () => {
      const roots: (HTMLElement | null)[] = [];
      const actionNodes: (HTMLDivElement | null)[] = [];
      const rootRef = (node: HTMLElement | null) => {
        roots.push(node);
      };
      const actionRef = (node: HTMLDivElement | null) => {
        actionNodes.push(node);
      };
      const Fixture = () => {
        const [stage, setStage] = React.useState(0);
        return (
          <>
            <button id="next" onClick={() => setStage(stage + 1)}>
              Next phase
            </button>
            {stage !== 2 && (
              <CardFooter
                id="footer"
                ref={rootRef}
                action={
                  stage === 1
                    ? null
                    : {
                        id: 'action',
                        ref: actionRef,
                        children: <Button>More</Button>,
                      }
                }
              >
                <Button id="reply">Reply</Button>
              </CardFooter>
            )}
          </>
        );
      };
      render(<Fixture />);
      footer().then($root => {
        const root = $root[0];
        const action = root.querySelector('#action');
        const button = root.querySelector('#reply');
        cy.get('#next').realClick();
        cy.get('#action').should('not.exist');
        footer().should($next => {
          expect($next[0]).to.equal(root);
          expect(root.querySelector('#reply')).to.equal(button);
          expect(actionNodes).to.deep.equal([action, null, action, null]);
          expect(roots).to.deep.equal([root, null, root]);
        });
        cy.get('#next').realClick();
        footer()
          .should('not.exist')
          .then(() => {
            expect(roots).to.deep.equal([root, null, root, null]);
            expect(root.isConnected).to.equal(false);
            expect(action!.isConnected).to.equal(false);
          });
        cy.get('#next').realClick();
        footer().should($next => {
          expect($next[0]).not.to.equal(root);
          expect(roots).to.deep.equal([root, null, root, null, $next[0], null, $next[0]]);
          expect(actionNodes).to.deep.equal([
            action,
            null,
            action,
            null,
            $next[0].querySelector('#action'),
            null,
            $next[0].querySelector('#action'),
          ]);
        });
        audit('exact detach and remount lifecycle');
      });
    });

    it('R5.08 native aria-disabled is forwarded without implicitly disabling child actions', () => {
      let clicks = 0;
      render(
        <CardFooter
          id="footer"
          role="group"
          aria-label="Consumer disabled group"
          aria-disabled="true"
          action={{
            id: 'action',
            'aria-disabled': true,
            children: (
              <Button id="more" onClick={() => ++clicks}>
                More
              </Button>
            ),
          }}
        >
          <Button id="reply" onClick={() => ++clicks}>
            Reply
          </Button>
        </CardFooter>,
      );
      footer().should('have.attr', 'aria-disabled', 'true');
      cy.get('#action').should('have.attr', 'aria-disabled', 'true');
      cy.get('#reply').should('not.be.disabled').realClick();
      cy.realPress('Tab');
      cy.get('#more').should('have.focus').and('not.be.disabled');
      cy.realPress('Enter');
      cy.then(() => expect(clicks).to.equal(2));
      audit('ARIA annotation does not own button disabled behavior');
    });

    it('R5.09 frozen root/action props and style objects remain unchanged through consumer rerenders', () => {
      const rootStyle = Object.freeze({ gap: 21 });
      const actionStyle = Object.freeze({ marginLeft: 0, padding: 4 });
      const action = Object.freeze({
        id: 'action',
        className: 'immutable-action',
        style: actionStyle,
        children: <Button id="more">More</Button>,
      });
      const props: CardFooterProps = Object.freeze({
        id: 'footer',
        className: 'immutable-root',
        style: rootStyle,
        action,
      });
      const Fixture = () => {
        const [count, setCount] = React.useState(0);
        return (
          <>
            <button id="update" onClick={() => setCount(count + 1)}>
              Update {count}
            </button>
            <CardFooter {...props}>
              <Button>Reply</Button>
            </CardFooter>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#update').realClick().should('have.text', 'Update 1');
      footer().should('have.css', 'gap', '21px').and('have.class', 'immutable-root');
      cy.get('#action')
        .should('have.css', 'margin-left', '0px')
        .and('have.css', 'padding-left', '4px')
        .and('have.class', 'immutable-action');
      cy.then(() => {
        expect(rootStyle).to.deep.equal({ gap: 21 });
        expect(actionStyle).to.deep.equal({ marginLeft: 0, padding: 4 });
        expect(props.className).to.equal('immutable-root');
        expect(action.className).to.equal('immutable-action');
        expect(props.style).to.equal(rootStyle);
        expect(props.action).to.equal(action);
        expect(action.style).to.equal(actionStyle);
      });
      audit('immutable caller props');
    });

    it('R5.10 nearest provider custom hook updates both styled slots live without invoking the outer hook', () => {
      let outerCalls = 0;
      const outer: FluentProviderCustomStyleHooks = {};
      outer.useCardFooterStyles_unstable = () => {
        ++outerCalls;
      };
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        const inner: FluentProviderCustomStyleHooks = {};
        inner.useCardFooterStyles_unstable = unknownState => {
          const state = unknownState as CardFooterState;
          expect(state.root.className).to.contain(cardFooterClassNames.root);
          expect(state.action!.className).to.contain(cardFooterClassNames.action);
          state.root.style = { ...state.root.style, gap: updated ? 22 : 17 };
          state.action!.style = { ...state.action!.style, padding: updated ? 7 : 3 };
        };
        return (
          <FluentProvider theme={webLightTheme} customStyleHooks_unstable={outer}>
            <button id="update" onClick={() => setUpdated(true)}>
              Update hook
            </button>
            <FluentProvider customStyleHooks_unstable={inner}>
              <CardFooter id="footer" action={{ id: 'action', children: <Button id="more">More</Button> }}>
                <Button>Reply</Button>
              </CardFooter>
            </FluentProvider>
          </FluentProvider>
        );
      };
      render(<Fixture />);
      footer()
        .should('have.css', 'gap', '17px')
        .then($root => {
          const root = $root[0];
          cy.get('#update').realClick();
          footer()
            .should('have.css', 'gap', '22px')
            .should($next => expect($next[0]).to.equal(root));
          cy.get('#action').should('have.css', 'padding-left', '7px');
          cy.then(() => expect(outerCalls).to.equal(0));
          audit('nearest live custom hook context');
        });
    });

    it('R5.11 live light-to-dark RTL provider updates inherited colors and layout without replacing a focused action', () => {
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <FluentProvider theme={updated ? webDarkTheme : webLightTheme} dir={updated ? 'rtl' : 'ltr'}>
            <CardFooter
              id="footer"
              style={{ width: 400 }}
              action={{
                id: 'action',
                children: (
                  <Button id="more" onClick={() => setUpdated(!updated)}>
                    More
                  </Button>
                ),
              }}
            >
              <Button id="reply">Reply</Button>
              <Button id="share">Share</Button>
            </CardFooter>
          </FluentProvider>
        );
      };
      render(<Fixture />);
      geometry('ltr');
      cy.get('#more').then($button => {
        const button = $button[0];
        const before = button.ownerDocument.defaultView!.getComputedStyle(button).backgroundColor;
        cy.get('#more').realClick().should('have.focus');
        geometry('rtl');
        cy.get('#more').should($next => {
          expect($next[0]).to.equal(button);
          expect(button.ownerDocument.defaultView!.getComputedStyle(button).backgroundColor).not.to.equal(before);
        });
        cy.realPress('Enter');
        geometry('ltr');
        cy.get('#more').should('have.focus');
        audit('live theme and direction context');
      });
    });

    it('R5.12 public state hook modifications reach both slots without mutating caller input', () => {
      const ref = React.createRef<HTMLElement>();
      const props: CardFooterProps = {
        id: 'footer',
        title: 'Caller root',
        action: { id: 'action', title: 'Caller action', children: <Button id="more">More</Button> },
      };
      const action = props.action;
      const Fixture = () => {
        const state = useCardFooter_unstable(props, ref);
        state.root.title = 'State root';
        state.action!.title = 'State action';
        state.root.children = <Button id="reply">State reply</Button>;
        state.root.style = { gap: 19 };
        useCardFooterStyles_unstable(state);
        return renderCardFooter_unstable(state);
      };
      render(<Fixture />);
      footer()
        .should('have.attr', 'title', 'State root')
        .and('have.css', 'gap', '19px')
        .then($root => expect(ref.current).to.equal($root[0]));
      cy.get('#action').should('have.attr', 'title', 'State action').and('have.class', cardFooterClassNames.action);
      cy.get('#reply').should('have.text', 'State reply').realClick().should('have.focus');
      cy.realPress('Tab');
      cy.get('#more').should('have.focus');
      cy.then(() => {
        expect(props.title).to.equal('Caller root');
        expect(props.action).to.equal(action);
      });
      audit('public state renderer forwarding');
    });

    it('R5.13 explicit reset Button preserves native form reset ownership and callback order', () => {
      const order: string[] = [];
      render(
        <form aria-label="Edit document" onReset={() => order.push('reset')}>
          <label htmlFor="value">Document name</label>
          <input id="value" defaultValue="Draft" />
          <CardFooter
            id="footer"
            onClick={() => order.push('footer')}
            action={
              <Button id="reset" type="reset" onClick={() => order.push('button')}>
                Reset
              </Button>
            }
          />
        </form>,
      );
      cy.get('#value').focus();
      cy.realPress(['Control', 'A']);
      cy.realType('Published');
      cy.get('#value').should('have.value', 'Published');
      cy.get('#reset').realClick();
      cy.get('#value').should('have.value', 'Draft');
      cy.then(() => expect(order).to.deep.equal(['button', 'footer', 'reset']));
      audit('native form reset owner');
    });

    it('R5.14 native negative tabIndex skips only the root until the consumer enables its group tab stop', () => {
      const Fixture = () => {
        const [enabled, setEnabled] = React.useState(false);
        return (
          <>
            <button id="before" onClick={() => setEnabled(true)}>
              Enable group focus
            </button>
            <CardFooter id="footer" tabIndex={enabled ? 0 : -1} role="group" aria-label="Document actions">
              <Button id="reply">Reply</Button>
            </CardFooter>
            <button id="after">After</button>
          </>
        );
      };
      render(<Fixture />);
      footer()
        .should('have.attr', 'tabindex', '-1')
        .then($root => {
          const root = $root[0];
          cy.get('#before').focus();
          cy.realPress('Tab');
          cy.get('#reply').should('have.focus');
          cy.realPress('Tab');
          cy.get('#after').should('have.focus');
          footer().focus().should('have.focus');
          cy.realPress('Tab');
          cy.get('#reply').should('have.focus');
          cy.get('#before').realClick();
          footer()
            .should('have.attr', 'tabindex', '0')
            .should($next => expect($next[0]).to.equal(root));
          cy.realPress('Tab');
          footer().should('have.focus');
          cy.realPress('Tab');
          cy.get('#reply').should('have.focus');
          audit('native tabIndex controlled group participation');
        });
    });
  });
}
