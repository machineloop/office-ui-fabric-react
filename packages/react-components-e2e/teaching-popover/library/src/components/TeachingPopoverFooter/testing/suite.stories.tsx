import * as React from 'react';
import * as axe from 'axe-core';
import { getTabster } from 'tabster';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
// nx-ignore-next-line
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
// nx-ignore-next-line
import type { ButtonProps } from '@fluentui/react-components';
type NativeButtonProps = Extract<ButtonProps, { as?: 'button' }>;
import {
  TeachingPopoverFooter,
  ComposedFooter,
  ContextFooter,
  Harness,
  BaseFooter,
  FocusObserver,
  SpanAction,
} from './fixtures.stories';
import type { FooterProps, FooterEvent, OwnerEvent, Trace, HarnessProps } from './fixtures.stories';
import type { TeachingPopoverFooterState, TeachingPopoverFooterBaseState } from '../../../index';
import {
  TeachingPopoverCarousel,
  TeachingPopoverCarouselCard,
  TeachingPopoverBody,
  TeachingPopoverTitle,
} from '../../../index';
// nx-ignore-next-line
import { Default } from '../../../../../stories/src/TeachingPopover/TeachingPopoverDefault.stories';
// nx-ignore-next-line
import { AppearanceBrand } from '../../../../../stories/src/TeachingPopover/TeachingPopoverAppearanceBrand.stories';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Actual public custom-style provider used by the production component.
import { CustomStyleHooksProvider_unstable } from '@fluentui/react-shared-contexts';

const useConsumerStyles = makeStyles({ root: { gap: '19px', paddingTop: '17px' }, primary: { minWidth: '123px' } });
const ConsumerStyled = () => {
  const styles = useConsumerStyles();
  return (
    <TeachingPopoverFooter
      id="footer"
      className={styles.root}
      primary={{ children: 'OK', className: styles.primary }}
      secondary="Cancel"
    />
  );
};
function assertFooterState(state: unknown): asserts state is TeachingPopoverFooterState {
  if (
    typeof state !== 'object' ||
    state === null ||
    !('root' in state) ||
    typeof state.root !== 'object' ||
    state.root === null ||
    !('primary' in state) ||
    typeof state.primary !== 'object' ||
    state.primary === null ||
    !('footerLayout' in state) ||
    !['horizontal', 'vertical'].includes(String(state.footerLayout))
  ) {
    throw new Error('Expected actual Footer state with resolved root and primary slots');
  }
}

const rawRound: unknown = Cypress.env('coverageRound') ?? 3;
if ((typeof rawRound !== 'number' && typeof rawRound !== 'string') || ![1, 2, 3, '1', '2', '3'].includes(rawRound)) {
  throw new Error('coverageRound must be exactly 1, 2, or 3');
}
const round = Number(rawRound);
const evidence = `src/components/TeachingPopoverFooter/.evidence/audits-${Date.now()}-${Cypress._.random(
  100000,
  999999,
)}`;
const titles: string[] = [];
let ordinal = 0;
let finalAuditStarted = false;
let auditAcquisitionUnfinished = false;
let events: Trace[] = [];
let originals: Array<FooterEvent | OwnerEvent> = [];
let nativeCommands: Array<{ command: string; args: unknown }> = [];
function scenario(level: number, title: string, body: () => void) {
  if (level <= round) {
    titles.push(title);
    it(title, () => {
      body();
      audit();
    });
  }
}
function stage(children: React.ReactNode, dark = false, rtl = false) {
  return mount(
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={rtl ? 'rtl' : 'ltr'}>
      <main id="row139-stage" style={{ minHeight: 600, width: 900, padding: 24 }}>
        <FocusObserver />
        {children}
      </main>
    </FluentProvider>,
    { strict: false },
  );
}
function footer(props: FooterProps = { primary: 'Learn more', secondary: 'Got it' }, dark = false, rtl = false) {
  return stage(<TeachingPopoverFooter id="footer" {...props} />, dark, rtl);
}
function harness(props: HarnessProps = {}, dark = false, rtl = false) {
  return stage(
    <Harness
      {...props}
      onRecord={event => events.push(event)}
      onOwner={(event, data) => {
        originals.push(event);
        expect(Object.keys(data)).to.deep.equal(['open']);
        props.onOwner?.(event, data);
      }}
      onAction={event => {
        originals.push(event);
        props.onAction?.(event);
      }}
    />,
    dark,
    rtl,
  );
}
const primary = () => cy.get('.fui-TeachingPopoverFooter__primary');
const secondary = () => cy.get('.fui-TeachingPopoverFooter__secondary');
const surface = () => cy.get('.fui-TeachingPopoverSurface');
function focus(selector: string) {
  cy.get(selector)
    .focus()
    .should('have.focus')
    .should($node =>
      expect(getTabster($node[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement()).to.equal($node[0]),
    );
}
function settled() {
  return surface()
    .should('be.visible')
    .should($surface => {
      expect($surface[0].getBoundingClientRect().width).to.be.greaterThan(0);
      expect(
        $surface[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
      ).to.have.length(0);
    });
}
function rootBoundaryReady() {
  const marker = 'isFirst=false, isOutside=false, (Root, tabbable=false)';
  const selector = `:scope > i[data-tabster-dummy="${marker}"]`;
  return cy
    .document()
    .should(document =>
      expect(document.body.querySelectorAll(selector), 'one native body-owned trailing Root sentinel').to.have.length(
        1,
      ),
    )
    .then(document => {
      const body = document.body;
      const sentinel = body.querySelector<HTMLElement>(selector);
      if (!sentinel) throw new Error('Required native body Root sentinel is absent');
      return cy.wrap(sentinel).should(() => {
        expect(document.body).to.equal(body);
        const matches = body.querySelectorAll(selector);
        expect(matches).to.have.length(1);
        expect(matches[0], 'the same original trailing Root sentinel remains').to.equal(sentinel);
        expect(sentinel.isConnected).to.equal(true);
        expect(sentinel.parentElement).to.equal(body);
        expect(sentinel.tagName).to.equal('I');
        expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(marker);
        expect(body.lastElementChild, 'native Root boundary is settled after portal insertion').to.equal(sentinel);
      });
    });
}
function open() {
  focus('#trigger');
  cy.get('#trigger').realClick().should('have.attr', 'aria-expanded', 'true');
  settled();
  rootBoundaryReady();
  audit('open-panel');
}
function closed(restore = true) {
  surface().should('not.exist');
  cy.get('#trigger').should('have.attr', 'aria-expanded', 'false');
  if (restore) {
    cy.get('#trigger').should('have.focus');
  }
  cy.get('#row139-stage').should($stage => {
    expect($stage[0].closest('[aria-hidden="true"]'), 'closed owner releases the retained stage').to.equal(null);
    expect($stage[0].closest('[inert]')).to.equal(null);
  });
}
function escape() {
  settled();
  cy.realPress('Escape');
  closed();
}
function findingShape(rules: axe.Result[]) {
  return rules.map(rule => ({
    id: rule.id,
    impact: rule.impact,
    nodes: rule.nodes.map(node => ({
      target: node.target,
      impact: node.impact,
      anyChecks: node.any.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
      all: node.all.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
      none: node.none.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
    })),
  }));
}
function stableViolations() {
  return [
    {
      id: 'aria-dialog-name',
      impact: 'serious',
      nodes: [
        {
          target: ['.fui-PopoverSurface'],
          impact: 'serious',
          anyChecks: ['aria-label', 'aria-labelledby', 'non-empty-title'].map(id => ({
            id,
            data: id === 'non-empty-title' ? { messageKey: 'noAttr' } : null,
            impact: 'serious',
          })),
          all: [],
          none: [],
        },
      ],
    },
  ];
}
function stableIncompletes() {
  return [
    {
      id: 'aria-hidden-focus',
      impact: 'serious',
      nodes: [['.fui-PopoverSurface > i:nth-child(1)'], ['i:nth-child(6)']].map(target => ({
        target,
        impact: 'serious',
        anyChecks: [],
        none: [],
        all: [{ id: 'focusable-modal-open', data: null, impact: 'serious' }],
      })),
    },
  ];
}
function guardFindingMutations(shape: ReturnType<typeof findingShape>, expected: unknown) {
  const mutations = Array.from({ length: 6 }, () => Cypress._.cloneDeep(shape));
  mutations[0].push({ ...shape[0], id: 'unknown-rule' });
  mutations[1].push(shape[0]);
  mutations[2][0].nodes.push(shape[0].nodes[0]);
  const checks = mutations[3][0].nodes[0].anyChecks.length
    ? mutations[3][0].nodes[0].anyChecks
    : mutations[3][0].nodes[0].all;
  checks[0].id = 'unknown-check';
  mutations[4][0].nodes[0].target = ['#unknown-target'];
  mutations[5][0].impact = 'critical';
  for (const mutation of mutations) {
    expect(() => expect(mutation).to.deep.equal(expected)).to.throw();
  }
}
function audit(phase = 'final', profile: false | 'stable-basic' = false, failedCaseDiagnostic = false) {
  const subject = cy.get('#row139-stage');
  if (!failedCaseDiagnostic) {
    subject
      .should('be.visible')
      .and('not.be.empty')
      .should($stage => {
        const roots = [
          $stage[0],
          ...Array.from($stage[0].ownerDocument.querySelectorAll<HTMLElement>('.fui-TeachingPopoverSurface')),
        ];
        for (const root of roots) {
          expect(
            root.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
          ).to.have.length(0);
        }
        expect(Boolean($stage[0].closest('[aria-hidden="true"]'))).to.equal(Boolean(profile));
        if (!profile) {
          expect(
            Array.from($stage[0].querySelectorAll('button, a, input')).filter(node =>
              node.closest('[aria-hidden="true"]'),
            ),
          ).to.have.length(0);
        } else {
          expect($stage[0].ownerDocument.querySelectorAll('.fui-PopoverSurface > [data-tabster-dummy]')).to.have.length(
            2,
          );
        }
      });
  }
  return subject.then($stage => {
    const document = $stage[0].ownerDocument;
    const roots = [
      $stage[0],
      ...Array.from(document.querySelectorAll<HTMLElement>('.fui-TeachingPopoverSurface')).filter(
        node => !$stage[0].contains(node),
      ),
    ];
    if (!failedCaseDiagnostic) {
      for (const root of roots) {
        expect(root.getBoundingClientRect().width).to.be.greaterThan(0);
        expect(root.textContent?.trim()).not.to.equal('');
        expect(
          root.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
        ).to.have.length(0);
      }
    }
    auditAcquisitionUnfinished = true;
    if (phase === 'final') {
      finalAuditStarted = true;
    }
    return axe.run(roots).then(fullResults => {
      cy.writeFile(`${evidence}/audit-${++ordinal}.json`, {
        scenario: Cypress.currentTest.title,
        phase,
        profile,
        round,
        retries: Cypress.currentRetry,
        fullResults,
        failedCaseDiagnostic,
        events,
        nativeCommands,
        auditedRoots: roots.map(node => ({ tag: node.tagName, id: node.id, role: node.getAttribute('role') })),
      }).then(() => {
        auditAcquisitionUnfinished = false;
        if (failedCaseDiagnostic) {
          return;
        }
        expect(fullResults.passes.length).to.be.greaterThan(0);
        expect(findingShape(fullResults.violations), 'all unexpected violations rejected').to.deep.equal(
          profile ? stableViolations() : [],
        );
        expect(findingShape(fullResults.incomplete), 'all unexpected incompletes rejected').to.deep.equal(
          profile ? stableIncompletes() : [],
        );
        if (profile) {
          expect(Cypress.currentTest.title).to.match(/^unchanged stable (Default|AppearanceBrand) /);
          expect(phase).to.equal('stable-open');
          const dialog = document.querySelector('.fui-TeachingPopoverSurface')!;
          expect(dialog.getAttribute('role')).to.equal('dialog');
          expect(dialog.hasAttribute('aria-label')).to.equal(false);
          expect(dialog.hasAttribute('aria-labelledby')).to.equal(false);
          expect(dialog.hasAttribute('title')).to.equal(false);
          expect(computeAccessibleName(dialog)).to.equal('');
          expect(fullResults.violations[0].nodes[0].html).to.equal(`${dialog.outerHTML.split('>')[0]}>`);
          for (const node of fullResults.incomplete[0].nodes) {
            const sentinel = document.querySelector(String(node.target[0]));
            expect(sentinel?.tagName).to.equal('I');
            expect(sentinel?.getAttribute('aria-hidden')).to.equal('true');
            expect(sentinel?.getAttribute('tabindex')).to.equal('0');
            expect(sentinel?.getAttribute('role')).to.equal('none');
            expect(sentinel?.getAttribute('data-tabster-dummy')).to.match(
              /^isFirst=(true|false), isOutside=false, \(Modalizer, tabbable=true\)$/,
            );
            expect(sentinel?.childElementCount).to.equal(0);
            expect(sentinel?.textContent).to.equal('');
            expect(sentinel?.outerHTML).to.equal(node.html);
            expect(sentinel?.closest('.fui-TeachingPopoverSurface')).not.to.equal(null);
            expect(node.all[0].relatedNodes).to.have.length(1);
            expect(node.all[0].relatedNodes![0]).to.deep.equal({ target: node.target, html: node.html });
          }
          const shape = findingShape(fullResults.incomplete);
          const expected = stableIncompletes();
          const rejected = [
            'unknown-rule',
            'duplicate-rule',
            'duplicate-node',
            'unknown-check',
            'wrong-target',
            'wrong-impact',
          ];
          guardFindingMutations(shape, expected);
          guardFindingMutations(findingShape(fullResults.violations), stableViolations());
          cy.writeFile(`${evidence}/classifier-guards-${ordinal}.json`, {
            scenario: Cypress.currentTest.title,
            rejected,
            expected,
            guardedProfiles: ['violations', 'incomplete'],
          });
        }
        expect(Cypress.currentRetry).to.equal(0);
      });
    });
  });
}

describe('row139 TeachingPopoverFooter', { retries: 0 }, () => {
  before(() => {
    expect(new Set(titles).size).to.equal(titles.length);
    expect(titles.length).to.equal([25, 63, 84][round - 1]);
    Object.freeze(titles);
    cy.writeFile(`${evidence}/manifest.json`, { round, titles, expectedCount: [25, 63, 84][round - 1], retries: 0 });
  });
  beforeEach(() => {
    finalAuditStarted = false;
    auditAcquisitionUnfinished = false;
    cy.viewport(1100, 800);
    cy.get('body').realHover({ position: 'topLeft' });
    events = [];
    originals = [];
    nativeCommands = [];
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
    cy.on('command:end', command => {
      const name: unknown = command.get('name');
      if (typeof name === 'string' && ['realClick', 'realPress', 'realHover'].includes(name)) {
        nativeCommands.push({ command: name, args: command.get('args') });
      }
    });
  });
  afterEach(function () {
    const test = this.currentTest;
    cy.then(() => {
      if (test?.state === 'failed' && !finalAuditStarted && !auditAcquisitionUnfinished) {
        return audit('final', false, true);
      }
    });
  });

  scenario(1, 'source defaults are native buttons in primary then secondary order with localized labels', () => {
    footer();
    cy.get('#footer')
      .should('have.prop', 'tagName', 'DIV')
      .find('button')
      .should('have.length', 2)
      .then($buttons => {
        expect(Array.from($buttons).map(node => node.textContent)).to.deep.equal(['Learn more', 'Got it']);
        for (const button of Array.from($buttons)) {
          expect(button.type).to.equal('button');
        }
      });
    primary().should($button => expect(computeAccessibleName($button[0])).to.equal('Learn more'));
    secondary().should($button => expect(computeAccessibleName($button[0])).to.equal('Got it'));
  });
  for (const layout of ['horizontal', 'vertical'] as const) {
    scenario(1, `${layout} layout has source flex direction gap padding and measured button alignment`, () => {
      footer({ primary: 'Primary', secondary: 'Secondary', footerLayout: layout });
      cy.get('#footer')
        .should('have.css', 'display', 'flex')
        .and('have.css', 'gap', '8px')
        .and('have.css', 'padding-top', '12px')
        .and('have.css', 'flex-direction', layout === 'horizontal' ? 'row' : 'column');
      primary().then($primary =>
        secondary().should($secondary => {
          const p = $primary[0].getBoundingClientRect();
          const s = $secondary[0].getBoundingClientRect();
          if (layout === 'horizontal') {
            expect(p.top).to.equal(s.top);
            expect(s.left - p.right).to.be.closeTo(8, 0.1);
            expect(p.width).to.be.at.least(96);
            expect(s.width).to.be.at.least(96);
          } else {
            expect(p.left).to.equal(s.left);
            expect(s.top - p.bottom).to.be.closeTo(8, 0.1);
          }
        }),
      );
    });
  }
  for (const [label, secondarySlot] of [
    ['omitted', undefined],
    ['explicit undefined', undefined],
    ['null', null],
  ] as const) {
    scenario(1, `${label} secondary is absent while mandatory primary remains`, () => {
      footer({ primary: 'Only action', secondary: secondarySlot });
      primary().should('have.text', 'Only action');
      secondary().should('not.exist');
      cy.get('#footer').find('button').should('have.length', 1);
    });
  }
  scenario(
    1,
    'root children are intentionally replaced by primary and secondary slots as in the original snapshot',
    () => {
      footer({ primary: 'Primary', secondary: 'Secondary', children: 'Ignored root children' });
      cy.get('#footer').should('have.text', 'PrimarySecondary').and('not.contain.text', 'Ignored root children');
    },
  );
  scenario(1, 'slot JSX localization renders actual native descendants and accessible names', () => {
    footer({ primary: <span lang="fr">En savoir plus</span>, secondary: <strong>Compris</strong> });
    primary().find('span').should('have.attr', 'lang', 'fr');
    primary().should($node => expect(computeAccessibleName($node[0])).to.equal('En savoir plus'));
    secondary().find('strong').should('have.text', 'Compris');
  });
  scenario(1, 'native root attributes and ARIA description belong to the root not to Button slots', () => {
    stage(
      <>
        <p id="footer-description">Actions for this lesson</p>
        <TeachingPopoverFooter
          id="footer"
          title="Lesson footer"
          aria-describedby="footer-description"
          primary="OK"
          data-owned="footer"
        />
      </>,
    );
    cy.get('#footer')
      .should('have.attr', 'title', 'Lesson footer')
      .and('have.attr', 'data-owned', 'footer')
      .should($node => expect(computeAccessibleDescription($node[0])).to.equal('Actions for this lesson'));
    primary().should('not.have.attr', 'aria-describedby');
  });
  scenario(1, 'direct Button ARIA label and describedby override text without repairing DOM', () => {
    stage(
      <>
        <p id="action-description">Read the detailed guide</p>
        <TeachingPopoverFooter
          primary={{ children: 'Read', 'aria-label': 'Learn the feature', 'aria-describedby': 'action-description' }}
        />
      </>,
    );
    primary().should($node => {
      expect(computeAccessibleName($node[0])).to.equal('Learn the feature');
      expect(computeAccessibleDescription($node[0])).to.equal('Read the detailed guide');
    });
  });
  scenario(1, 'root ref is the rendered DIV and consumer classes merge with all slot classes', () => {
    const ref = React.createRef<HTMLDivElement>();
    stage(
      <TeachingPopoverFooter
        ref={ref}
        id="footer"
        className="consumer-root"
        primary={{ children: 'OK', className: 'consumer-primary' }}
        secondary={{ children: 'Cancel', className: 'consumer-secondary' }}
      />,
    );
    cy.get('#footer')
      .should('have.class', 'fui-TeachingPopoverFooter')
      .and('have.class', 'consumer-root')
      .then($node => expect(ref.current).to.equal($node[0]));
    primary().should('have.class', 'consumer-primary');
    secondary().should('have.class', 'consumer-secondary');
  });
  scenario(1, 'frozen caller slot and root props are not mutated by hook or style state', () => {
    const p = Object.freeze({ children: 'OK', className: 'original-primary' });
    const s = Object.freeze({ children: 'Cancel', className: 'original-secondary' });
    const props = Object.freeze({
      primary: p,
      secondary: s,
      footerLayout: 'vertical' as const,
      className: 'original-root',
    });
    const before = JSON.stringify(props);
    footer(props);
    primary()
      .should('have.text', 'OK')
      .then(() => expect(JSON.stringify(props)).to.equal(before));
  });
  scenario(
    1,
    'public hook style render recomposition exposes exact components slots layout and source defaults',
    () => {
      let state: TeachingPopoverFooterState | undefined;
      stage(
        <ComposedFooter
          primary="OK"
          secondary="Cancel"
          onState={value => {
            state = value;
          }}
        />,
      );
      primary()
        .should('have.text', 'OK')
        .then(() => {
          expect(state?.footerLayout).to.equal('horizontal');
          expect(state?.appearance).to.equal(undefined);
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- Characterizes the existing original unit contract.
          expect(state?.components.root).to.equal('div');
          expect(state?.primary.appearance).to.equal('primary');
          expect(state?.secondary?.appearance).to.equal(undefined);
          expect(state?.root.className).to.contain('fui-TeachingPopoverFooter');
        });
    },
  );
  for (const appearance of [undefined, 'brand', 'inverted'] as const) {
    scenario(1, `context appearance ${String(appearance)} selects actual primary and secondary defaults`, () => {
      let state: TeachingPopoverFooterState | undefined;
      stage(
        <ContextFooter
          appearance={appearance}
          footer={{ primary: 'OK', secondary: 'Cancel' }}
          onState={value => {
            state = value;
          }}
        />,
      );
      primary()
        .should('be.visible')
        .then(() => {
          expect(state?.appearance).to.equal(appearance);
          expect(state?.primary.appearance).to.equal(appearance === 'brand' ? undefined : 'primary');
          expect(state?.secondary?.appearance).to.equal(appearance === 'brand' ? 'primary' : undefined);
        });
      primary().should(
        'have.css',
        'background-color',
        appearance === 'brand' ? 'rgb(255, 255, 255)' : 'rgb(15, 108, 189)',
      );
    });
  }
  scenario(1, 'consumer Button appearance overrides hook defaults in brand context', () => {
    stage(
      <ContextFooter
        appearance="brand"
        footer={{
          primary: { children: 'OK', appearance: 'outline' },
          secondary: { children: 'Cancel', appearance: 'subtle' },
        }}
      />,
    );
    secondary().should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
  });
  scenario(1, 'no owner invokes localized consumer callbacks once without fabricating an owner or data payload', () => {
    const calls: FooterEvent[] = [];
    footer({ primary: { children: 'OK', onClick: (event: FooterEvent) => calls.push(event) } });
    primary().realClick();
    cy.then(() => {
      expect(calls).to.have.length(1);
      expect(calls[0].type).to.equal('click');
      expect(calls[0].nativeEvent.isTrusted).to.equal(true);
    });
  });
  scenario(
    1,
    'primary with secondary runs only its action while secondary toggles owner before consumer and root',
    () => {
      harness();
      open();
      primary().realClick();
      settled();
      cy.then(() => expect(events.map(event => event.callback)).to.deep.equal(['owner', 'primary', 'root']));
      secondary().realClick();
      closed();
      cy.then(() => {
        expect(events.map(event => event.callback)).to.deep.equal([
          'owner',
          'primary',
          'root',
          'owner',
          'secondary',
          'root',
        ]);
        expect(events[3]).to.include({
          type: 'click',
          open: false,
          trusted: true,
          prevented: false,
          target: 'secondary',
        });
        expect(originals[2]).to.equal(originals[3]);
      });
    },
  );
  scenario(1, 'primary without secondary toggles before its action with the exact same original event', () => {
    const action: FooterEvent[] = [];
    harness({
      footer: {
        primary: { id: 'primary', children: 'Only action', onClick: (event: FooterEvent) => action.push(event) },
      },
    });
    open();
    primary().realClick();
    closed();
    cy.then(() => {
      expect(events.map(event => event.callback)).to.deep.equal(['owner', 'owner', 'root']);
      expect(originals[1]).to.equal(action[0]);
      expect(events[1].open).to.equal(false);
    });
  });
  scenario(1, 'consumer preventDefault is too late to veto internally first composed secondary toggle', () => {
    harness({ preventAction: true });
    open();
    secondary().realClick();
    closed();
    cy.then(() => {
      expect(events[1]).to.include({ callback: 'owner', open: false, prevented: false });
      expect(events[2]).to.include({ callback: 'secondary', prevented: true });
      expect(events[3]).to.include({ callback: 'root', prevented: true });
    });
  });
  scenario(1, 'capture preventDefault vetoes internal toggle but preserves consumer and bubbling callbacks', () => {
    harness({ captureVeto: true });
    open();
    secondary().realClick();
    settled();
    cy.then(() => expect(events.map(event => event.callback)).to.deep.equal(['owner', 'secondary', 'root']));
    escape();
  });
  scenario(1, 'owner preventDefault does not undo an accepted uncontrolled close', () => {
    harness({ ownerVeto: true });
    open();
    secondary().realClick();
    closed();
    cy.then(() => expect(events[2]).to.include({ callback: 'secondary', prevented: true }));
  });
  scenario(1, 'controlled refusal records close request while retaining open DOM until external state changes', () => {
    harness({ control: 'refuse', defaultOpen: true });
    settled();
    audit('default-open');
    secondary().realClick();
    settled();
    cy.then(() => expect(events[0]).to.include({ callback: 'owner', open: false }));
    cy.get('#external-close').realClick();
    closed(false);
  });
  scenario(1, 'controlled acceptance consumes close payload and removes the real owned portal', () => {
    harness({ control: 'accept' });
    open();
    secondary().realClick();
    closed();
    cy.then(() =>
      expect(events.filter(event => event.callback === 'owner').map(event => event.open)).to.deep.equal([true, false]),
    );
  });

  for (const key of ['Enter', 'Space'] as const) {
    for (const action of ['primary', 'secondary'] as const) {
      scenario(2, `native ${key} on ${action} has exact activation order and original trusted event`, () => {
        harness();
        open();
        focus(`#${action}`);
        cy.realPress(key);
        if (action === 'secondary') {
          closed();
        } else {
          settled();
        }
        cy.then(() => {
          expect(events.map(event => event.callback)).to.deep.equal(
            action === 'primary' ? ['owner', 'primary', 'root'] : ['owner', 'owner', 'secondary', 'root'],
          );
          const actionEvent = events.find(event => event.callback === action);
          expect(actionEvent).to.include({ type: 'click', trusted: true, target: action });
          if (action === 'secondary') {
            expect(originals[1]).to.equal(originals[2]);
          }
        });
        if (action === 'primary') {
          escape();
        }
      });
    }
    scenario(2, `native ${key} primary-only closes through its internally composed callback`, () => {
      const calls: FooterEvent[] = [];
      harness({
        footer: { primary: { id: 'primary', children: 'Finish', onClick: (event: FooterEvent) => calls.push(event) } },
      });
      open();
      focus('#primary');
      cy.realPress(key);
      closed();
      cy.then(() => {
        expect(calls).to.have.length(1);
        expect(calls[0]).to.equal(originals[1]);
        expect(calls[0].nativeEvent.isTrusted).to.equal(true);
      });
    });
  }
  scenario(2, 'real Tab and ShiftTab traverse the two native slots in DOM order with public focus observation', () => {
    stage(
      <>
        <button id="before">Before</button>
        <TeachingPopoverFooter
          id="footer"
          primary={{ id: 'primary', children: 'Learn' }}
          secondary={{ id: 'secondary', children: 'Done' }}
        />
        <button id="after">After</button>
      </>,
    );
    focus('#before');
    cy.realPress('Tab');
    primary().should('have.focus');
    cy.realPress('Tab');
    secondary().should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    primary().should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#before').should('have.focus');
  });
  for (const state of ['disabled', 'disabledFocusable', 'aria-disabled'] as const) {
    for (const action of ['primary', 'secondary'] as const) {
      scenario(2, `${state} ${action} guards real pointer Enter and Space callbacks without closing`, () => {
        const calls: FooterEvent[] = [];
        const disabled = state === 'aria-disabled' ? { 'aria-disabled': true } : { [state]: true };
        const props: FooterProps = {
          primary: {
            id: 'primary',
            children: 'Learn',
            ...(action === 'primary' ? disabled : {}),
            onClick: (event: FooterEvent) => calls.push(event),
          },
          secondary: {
            id: 'secondary',
            children: 'Done',
            ...(action === 'secondary' ? disabled : {}),
            onClick: (event: FooterEvent) => calls.push(event),
          },
        };
        harness({ footer: props });
        open();
        const button = action === 'primary' ? primary : secondary;
        button().should(state === 'disabled' ? 'be.disabled' : 'not.be.disabled');
        if (state !== 'disabled') {
          button().should('have.attr', 'aria-disabled', 'true');
          focus(`#${action}`);
          cy.realPress('Enter');
          cy.realPress('Space');
        }
        button().realClick();
        settled();
        cy.then(() => {
          expect(calls).to.have.length(0);
          expect(events.filter(event => event.callback === 'owner')).to.have.length(1);
        });
        focus('#replace');
        escape();
      });
    }
  }
  scenario(2, 'native-disabled is skipped by Tab while disabledFocusable remains focusable but inert', () => {
    stage(
      <>
        <button id="before">Before</button>
        <TeachingPopoverFooter
          primary={{ id: 'primary', children: 'Disabled', disabled: true }}
          secondary={{ id: 'secondary', children: 'Focusable disabled', disabledFocusable: true }}
        />
        <button id="after">After</button>
      </>,
    );
    focus('#before');
    cy.realPress('Tab');
    secondary().should('have.focus');
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
  });
  for (const type of ['button', 'submit', 'reset'] as const) {
    scenario(2, `native form ${type} slot honors actual form action type name and value`, () => {
      const submissions: string[] = [];
      let resets = 0;
      stage(
        <form
          id="form"
          onSubmit={event => {
            event.preventDefault();
            const native = event.nativeEvent;
            expect(native).to.be.instanceOf(SubmitEvent);
            if (native instanceof SubmitEvent && native.submitter?.tagName === 'BUTTON') {
              submissions.push(`${native.submitter.getAttribute('name')}:${native.submitter.getAttribute('value')}`);
            }
          }}
          onReset={() => {
            resets++;
          }}
        >
          <label htmlFor="field">Lesson notes</label>
          <input id="field" name="notes" defaultValue="original" />
          <TeachingPopoverFooter
            primary={{ id: 'primary', children: 'Form action', type, name: 'lesson-action', value: 'accepted' }}
          />
        </form>,
      );
      cy.get('#field').clear().type('changed');
      primary()
        .should('have.attr', 'type', type)
        .and('have.attr', 'name', 'lesson-action')
        .and('have.attr', 'value', 'accepted')
        .realClick();
      cy.get('#field').should('have.value', type === 'reset' ? 'original' : 'changed');
      cy.then(() => {
        expect(submissions).to.deep.equal(type === 'submit' ? ['lesson-action:accepted'] : []);
        expect(resets).to.equal(type === 'reset' ? 1 : 0);
      });
    });
  }
  scenario(2, 'omitted native type defaults to button and cannot accidentally submit a containing form', () => {
    let count = 0;
    stage(
      <form
        onSubmit={event => {
          event.preventDefault();
          count++;
        }}
      >
        <TeachingPopoverFooter primary="Default action" secondary="Secondary action" />
      </form>,
    );
    primary().realClick();
    secondary().realClick();
    cy.then(() => expect(count).to.equal(0));
  });
  for (const type of ['submit', 'reset'] as const) {
    scenario(2, `disabledFocusable ${type} cancels the actual native form action for all input modes`, () => {
      let count = 0;
      stage(
        <form
          onSubmit={event => {
            event.preventDefault();
            count++;
          }}
          onReset={() => {
            count++;
          }}
        >
          <TeachingPopoverFooter
            primary={{ id: 'primary', children: 'Unavailable action', disabledFocusable: true, type }}
          />
        </form>,
      );
      primary().realClick();
      focus('#primary');
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.then(() => expect(count).to.equal(0));
    });
  }
  scenario(
    2,
    'anchor Button slot preserves href target rel download and link semantics without invented root polymorphism',
    () => {
      const calls: FooterEvent[] = [];
      footer({
        primary: {
          as: 'a',
          href: '#guide',
          target: '_self',
          rel: 'help',
          download: 'guide.txt',
          children: 'Guide',
          onClick: (event: FooterEvent) => {
            event.preventDefault();
            calls.push(event);
          },
        },
      });
      primary()
        .should('have.prop', 'tagName', 'A')
        .and('have.attr', 'href', '#guide')
        .and('have.attr', 'target', '_self')
        .and('have.attr', 'rel', 'help')
        .and('have.attr', 'download', 'guide.txt')
        .and('not.have.attr', 'type');
      primary().realClick();
      cy.then(() => {
        expect(calls).to.have.length(1);
        expect(calls[0].nativeEvent.isTrusted).to.equal(true);
      });
    },
  );
  for (const key of ['Enter', 'Space'] as const) {
    scenario(2, `anchor without href ${key} is a role button whose ARIA helper click is explicitly untrusted`, () => {
      const calls: FooterEvent[] = [];
      footer({
        primary: {
          as: 'a',
          id: 'primary',
          children: 'Anchor action',
          onClick: (event: FooterEvent) => calls.push(event),
        },
      });
      primary().should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
      focus('#primary');
      cy.realPress(key);
      cy.then(() => {
        expect(calls).to.have.length(1);
        expect(calls[0].type).to.equal('click');
        expect(calls[0].nativeEvent.isTrusted).to.equal(false);
      });
      cy.writeFile(`${evidence}/trust-${key}.json`, {
        scenario: Cypress.currentTest.title,
        cdpKey: key,
        source: 'useARIAButtonProps currentTarget.click',
        trustedClick: false,
      });
    });
  }
  scenario(2, 'disabled anchor removes href retains link role and prevents navigation and action', () => {
    const calls: FooterEvent[] = [];
    footer({
      primary: {
        as: 'a',
        href: '#guide',
        children: 'Guide',
        disabled: true,
        onClick: (event: FooterEvent) => calls.push(event),
      },
    });
    primary()
      .should($node => expect($node[0].hasAttribute('href')).to.equal(false))
      .and('have.attr', 'role', 'link')
      .and('have.attr', 'aria-disabled', 'true')
      .realClick();
    cy.then(() => expect(calls).to.have.length(0));
  });
  scenario(2, 'slot render functions preserve component native props and append meaningful suffix content', () => {
    footer({
      primary: {
        children: (Component: React.ElementType<NativeButtonProps>, props: Omit<NativeButtonProps, 'as'>) => (
          <Component {...props} as="button" aria-label="Read guide">
            Read <span data-suffix>guide</span>
          </Component>
        ),
      },
      secondary: {
        children: (Component: React.ElementType<NativeButtonProps>, props: Omit<NativeButtonProps, 'as'>) => (
          <Component {...props} as="button">
            Done <span data-suffix>now</span>
          </Component>
        ),
      },
    });
    primary().should('have.attr', 'type', 'button').find('[data-suffix]').should('have.text', 'guide');
    secondary().should('have.attr', 'type', 'button').find('[data-suffix]').should('have.text', 'now');
  });
  scenario(2, 'Button slot root refs identify the actual native button elements', () => {
    const p = React.createRef<HTMLButtonElement>();
    const s = React.createRef<HTMLButtonElement>();
    footer({ primary: { children: 'OK', ref: p }, secondary: { children: 'Cancel', ref: s } });
    primary().then($node => expect(p.current).to.equal($node[0]));
    secondary().then($node => expect(s.current).to.equal($node[0]));
  });
  scenario(2, 'base hook has only root and handleButtonClick with no invented Button or appearance state', () => {
    let state: TeachingPopoverFooterBaseState | undefined;
    stage(
      <BaseFooter
        onState={value => {
          state = value;
        }}
      />,
    );
    cy.get('#base-action')
      .realClick()
      .then(() => {
        expect(state?.footerLayout).to.equal('horizontal');
        expect(state?.root.id).to.equal('base-root');
        expect(state).not.to.have.property('primary');
        expect(state).not.to.have.property('secondary');
        expect(state).not.to.have.property('appearance');
      });
  });
  scenario(
    2,
    'replaced context appearance and latest toggle closure update while the native button DOM identity remains',
    () => {
      const toggles: Array<{ event: OwnerEvent; latest: boolean }> = [];
      let node: HTMLElement;
      stage(
        <ContextFooter
          footer={{ primary: { id: 'primary', children: 'OK' } }}
          onVersionToggle={(event, latest) => toggles.push({ event, latest })}
        />,
      );
      primary()
        .then($node => {
          node = $node[0];
        })
        .realClick();
      cy.get('#replace-context').realClick();
      primary()
        .should('have.css', 'background-color', 'rgb(255, 255, 255)')
        .then($node => {
          expect($node[0]).to.equal(node);
        })
        .realClick();
      cy.then(() => expect(toggles.map(item => item.latest)).to.deep.equal([false, true]));
    },
  );
  scenario(
    2,
    'latest owner and action callbacks survive internal rerender without stale closure or duplicate toggle',
    () => {
      harness();
      open();
      cy.get('#replace').realClick();
      secondary().realClick();
      closed();
      cy.then(() =>
        expect(events.map(event => event.callback)).to.deep.equal([
          'owner',
          'owner-latest',
          'secondary-latest',
          'root',
        ]),
      );
    },
  );
  scenario(2, 'uncontrolled defaultOpen closes then reopens with fresh source toggle state', () => {
    harness({ defaultOpen: true });
    settled();
    audit('default-open');
    focus('#trigger');
    secondary().realClick();
    closed();
    open();
    secondary().realClick();
    closed();
    cy.then(() =>
      expect(events.filter(event => event.callback === 'owner').map(event => event.open)).to.deep.equal([
        false,
        true,
        false,
      ]),
    );
  });
  scenario(2, 'outside real pointer closes and Escape independently restores focus to the original trigger', () => {
    harness();
    open();
    cy.get('#before').realClick();
    closed(false);
    open();
    escape();
    cy.then(() =>
      expect(events.filter(event => event.callback === 'owner').map(event => event.open)).to.deep.equal([
        true,
        false,
        true,
        false,
      ]),
    );
  });
  scenario(2, 'public hook style render behaves identically inside a real owner', () => {
    harness({ composed: true });
    open();
    primary().realClick();
    settled();
    secondary().realClick();
    closed();
    cy.then(() =>
      expect(events.map(event => event.callback)).to.deep.equal([
        'owner',
        'primary',
        'root',
        'owner',
        'secondary',
        'root',
      ]),
    );
  });
  scenario(
    2,
    'custom provider style hook receives mutable owned state after built-in styles and preserves consumer classes',
    () => {
      const states: TeachingPopoverFooterState[] = [];
      stage(
        <CustomStyleHooksProvider_unstable
          value={{
            // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact public provider key.
            useTeachingPopoverFooterStyles_unstable: state => {
              assertFooterState(state);
              expect(state.root.className).to.contain('fui-TeachingPopoverFooter');
              states.push(state);
              state.root.className = mergeClasses(state.root.className, 'provider-root');
              state.primary.className = mergeClasses(state.primary.className, 'provider-primary');
              state.root.style = { ...state.root.style, gap: 23 };
            },
          }}
        >
          <TeachingPopoverFooter id="footer" className="consumer-root" primary="OK" secondary="Cancel" />
        </CustomStyleHooksProvider_unstable>,
      );
      cy.get('#footer')
        .should('have.class', 'consumer-root')
        .and('have.class', 'provider-root')
        .and('have.css', 'gap', '23px');
      primary()
        .should('have.class', 'provider-primary')
        .then(() => expect(states.length).to.be.greaterThan(0));
    },
  );
  scenario(
    2,
    'consumer Griffel classes override built-in declarations without removing root or button contracts',
    () => {
      stage(<ConsumerStyled />);
      cy.get('#footer')
        .should('have.class', 'fui-TeachingPopoverFooter')
        .and('have.css', 'gap', '19px')
        .and('have.css', 'padding-top', '17px');
      primary().should('have.class', 'fui-TeachingPopoverFooter__primary').and('have.css', 'min-width', '123px');
    },
  );
  for (const dark of [false, true]) {
    for (const rtl of [false, true]) {
      scenario(
        2,
        `${dark ? 'dark' : 'light'} ${
          rtl ? 'RTL' : 'LTR'
        } horizontal geometry preserves source gap end alignment and theme variables`,
        () => {
          footer(undefined, dark, rtl);
          cy.get('#footer').should('have.css', 'justify-content', 'flex-end');
          primary().then($p =>
            secondary().should($s => {
              const p = $p[0].getBoundingClientRect();
              const s = $s[0].getBoundingClientRect();
              expect(p.top).to.equal(s.top);
              expect(rtl ? p.left - s.right : s.left - p.right).to.be.closeTo(8, 0.1);
              const style = $p[0].ownerDocument.defaultView!.getComputedStyle($p[0]);
              const token = style
                .getPropertyValue(tokens.colorBrandBackground.replace('var(', '').replace(')', ''))
                .trim();
              expect(token.toLowerCase()).to.equal(
                (dark ? webDarkTheme : webLightTheme).colorBrandBackground.toLowerCase(),
              );
            }),
          );
        },
      );
    }
  }
  for (const veto of [false, true]) {
    scenario(
      3,
      `base hook real original event ${veto ? 'prevention vetoes' : 'passes through'} source context toggle`,
      () => {
        const calls: OwnerEvent[] = [];
        stage(
          <ContextFooter
            footer={{ primary: 'Unused' }}
            onToggle={event => calls.push(event)}
            content={<BaseFooter veto={veto} />}
          />,
        );
        cy.get('#base-action').realClick();
        cy.then(() => {
          expect(calls).to.have.length(veto ? 0 : 1);
          if (!veto) {
            expect(calls[0].type).to.equal('click');
            expect('nativeEvent' in calls[0] && calls[0].nativeEvent.isTrusted).to.equal(true);
          }
        });
      },
    );
  }
  scenario(3, 'base handleButtonClick retains stable identity across new source provider closures', () => {
    const states: TeachingPopoverFooterBaseState[] = [];
    stage(
      <ContextFooter footer={{ primary: 'Unused' }} content={<BaseFooter onState={state => states.push(state)} />} />,
    );
    cy.get('#base-action').should('be.visible');
    cy.get('#replace-context').realClick();
    cy.get('#base-action').realClick();
    cy.then(() => {
      expect(states.length).to.be.greaterThan(1);
      expect(states[states.length - 1].handleButtonClick).to.equal(states[0].handleButtonClick);
    });
  });
  scenario(3, 'nested source provider chooses nearest appearance and toggle not an outer owner closure', () => {
    const outer: OwnerEvent[] = [];
    const inner: OwnerEvent[] = [];
    stage(
      <ContextFooter
        appearance="brand"
        footer={{ primary: 'Unused' }}
        onToggle={event => outer.push(event)}
        content={
          <ContextFooter
            prefix="inner-"
            appearance="inverted"
            footer={{ primary: 'Nearest action' }}
            onToggle={event => inner.push(event)}
          />
        }
      />,
    );
    primary().should('have.css', 'background-color', 'rgb(15, 108, 189)').realClick();
    cy.then(() => {
      expect(outer).to.have.length(0);
      expect(inner).to.have.length(1);
    });
  });
  scenario(
    3,
    'two independent real popovers close only their own Footer and retain distinct original callbacks',
    () => {
      const first: Trace[] = [];
      const second: Trace[] = [];
      let firstPortal: HTMLElement;
      let rootBody: HTMLElement;
      let trailingRoot: HTMLElement;
      const rootMarker = 'isFirst=false, isOutside=false, (Root, tabbable=false)';
      const rootSelector = `:scope > i[data-tabster-dummy="${rootMarker}"]`;
      function assertOwnedPortal(host: HTMLElement | null): asserts host is HTMLElement {
        expect(host, 'first surface has a generated portal host').not.to.equal(null);
      }
      function assertRootBoundary(node: HTMLElement | null): asserts node is HTMLElement {
        expect(node, 'existing body-owned trailing Root sentinel').not.to.equal(null);
      }
      stage(
        <>
          <Harness onRecord={event => first.push(event)} />
          <Harness prefix="second-" onRecord={event => second.push(event)} />
        </>,
      );
      open();
      cy.get<HTMLElement>('#surface').then($first => {
        expect($first, 'one first-owner surface').to.have.length(1);
        const firstSurface = $first[0];
        const host = firstSurface.closest<HTMLElement>('[data-portal-node="true"]');
        assertOwnedPortal(host);
        expect(host.tagName, 'generated first portal host').to.equal('DIV');
        expect(host, 'portal host is distinct from its first surface').not.to.equal(firstSurface);
        expect(host.isConnected, 'first portal is live while its surface is open').to.equal(true);
        expect(host.contains(firstSurface), 'captured host owns the first surface').to.equal(true);
        firstPortal = host;
        rootBody = firstSurface.ownerDocument.body;
        const boundary = rootBody.querySelector<HTMLElement>(rootSelector);
        assertRootBoundary(boundary);
        expect(boundary.tagName, 'native Root sentinel').to.equal('I');
        expect(boundary.parentElement, 'Root sentinel belongs directly to the captured body').to.equal(rootBody);
        expect(boundary.isConnected, 'captured Root sentinel is connected').to.equal(true);
        expect(boundary.getAttribute('data-tabster-dummy'), 'captured trailing Root marker').to.equal(rootMarker);
        trailingRoot = boundary;
      });
      cy.get('#secondary').realClick();
      closed();
      cy.wrap(null).should(() =>
        expect(firstPortal.isConnected, 'first owned portal is disposed before opening the second owner').to.equal(
          false,
        ),
      );
      focus('#second-trigger');
      cy.get('#second-trigger').realClick().should('have.attr', 'aria-expanded', 'true');
      settled();
      cy.wrap(null).should(() => {
        expect(rootBody.querySelector(rootSelector), 'same existing trailing Root sentinel').to.equal(trailingRoot);
        expect(trailingRoot.isConnected, 'trailing Root sentinel remains connected').to.equal(true);
        expect(trailingRoot.parentElement, 'trailing Root sentinel retains its body owner').to.equal(rootBody);
        expect(trailingRoot.getAttribute('data-tabster-dummy'), 'unchanged trailing Root marker').to.equal(rootMarker);
        expect(rootBody.lastElementChild, 'Tabster trailing Root boundary settled after the second portal').to.equal(
          trailingRoot,
        );
      });
      audit('second-owner-open');
      cy.get('#second-secondary').realClick();
      surface().should('not.exist');
      cy.get('#second-trigger').should('have.attr', 'aria-expanded', 'false').and('have.focus');
      cy.then(() => {
        expect(first.map(event => event.callback)).to.deep.equal(['owner', 'owner', 'secondary', 'root']);
        expect(second.map(event => event.callback)).to.deep.equal(['owner', 'owner', 'secondary', 'root']);
        expect(first[1].target).to.equal('secondary');
        expect(second[1].target).to.equal('second-secondary');
      });
    },
  );
  scenario(3, 'secondary dismissal does not reopen unmounted uncontrolled portal or duplicate closing action', () => {
    harness();
    open();
    secondary().realClick();
    closed();
    cy.then(() => {
      expect(events.filter(event => event.callback === 'owner' && event.open === false)).to.have.length(1);
      expect(events.filter(event => event.callback === 'secondary')).to.have.length(1);
    });
  });
  scenario(
    3,
    'primary consumer stopPropagation stops root bubbling but does not invent an internal primary close',
    () => {
      const calls: FooterEvent[] = [];
      harness({
        footer: {
          primary: {
            id: 'primary',
            children: 'Learn',
            onClick: (event: FooterEvent) => {
              calls.push(event);
              event.stopPropagation();
            },
          },
          secondary: 'Done',
        },
      });
      open();
      primary().realClick();
      settled();
      cy.then(() => {
        expect(calls).to.have.length(1);
        expect(events.map(event => event.callback)).to.deep.equal(['owner']);
      });
      escape();
    },
  );
  scenario(
    3,
    'secondary consumer stopPropagation preserves already-run close and suppresses only root bubbling',
    () => {
      const calls: FooterEvent[] = [];
      harness({
        footer: {
          primary: 'Learn',
          secondary: {
            id: 'secondary',
            children: 'Done',
            onClick: (event: FooterEvent) => {
              calls.push(event);
              event.stopPropagation();
            },
          },
        },
      });
      open();
      secondary().realClick();
      closed();
      cy.then(() => {
        expect(calls).to.have.length(1);
        expect(events.map(event => event.callback)).to.deep.equal(['owner', 'owner']);
        expect(calls[0]).to.equal(originals[1]);
      });
    },
  );
  scenario(
    3,
    'native root click pointer enter and keyboard handlers remain consumer callbacks not Footer action APIs',
    () => {
      const types: string[] = [];
      footer({
        primary: { id: 'primary', children: 'OK' },
        onPointerEnter: event => types.push(event.type),
        onKeyDown: event => types.push(event.key),
        onClick: event => types.push(event.type),
      });
      primary().realHover();
      focus('#primary');
      cy.realPress('Enter');
      cy.then(() => {
        expect(types).to.include('pointerenter');
        expect(types).to.include('Enter');
        expect(types).to.include('click');
      });
    },
  );
  for (const layout of ['horizontal', 'vertical'] as const) {
    scenario(3, `brand ${layout} actual slot computed colors border and radius resolve source token values`, () => {
      stage(<ContextFooter appearance="brand" footer={{ primary: 'OK', secondary: 'Cancel', footerLayout: layout }} />);
      primary()
        .should('have.css', 'background-color', 'rgb(255, 255, 255)')
        .and('have.css', 'color', 'rgb(15, 108, 189)')
        .and('have.css', 'border-radius', '4px');
      secondary().should('have.css', 'border-top-color', 'rgb(255, 255, 255)').and('have.css', 'border-radius', '4px');
    });
  }
  scenario(3, 'real brand hover uses source hover token with a positive normal-state comparison', () => {
    stage(<ContextFooter appearance="brand" footer={{ primary: 'OK', secondary: 'Cancel' }} />);
    primary().should('have.css', 'color', 'rgb(15, 108, 189)').realHover();
    primary().should('have.css', 'color', 'rgb(17, 94, 163)').and('have.css', 'background-color', 'rgb(255, 255, 255)');
    cy.get('#replace-context').realHover();
    primary().should('have.css', 'color', 'rgb(15, 108, 189)');
  });
  scenario(
    3,
    'CDP forced colors is active and uses actual Button system colors while preserving native action and source geometry',
    () => {
      const calls: FooterEvent[] = [];
      stage(
        <>
          <TeachingPopoverFooter
            id="footer"
            primary={{ id: 'primary', children: 'OK', onClick: (event: FooterEvent) => calls.push(event) }}
            secondary="Cancel"
          />
          <span
            id="system-reference"
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 24,
              height: 24,
              backgroundColor: 'Highlight',
              color: 'HighlightText',
              forcedColorAdjust: 'none',
            }}
          />
        </>,
      );
      cy.window().then(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(false));
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
      primary().should('have.css', 'forced-color-adjust', 'none');
      cy.get('#system-reference').then($reference => {
        const style = $reference[0].ownerDocument.defaultView!.getComputedStyle($reference[0]);
        primary().should('have.css', 'background-color', style.backgroundColor).and('have.css', 'color', style.color);
      });
      cy.get('#footer').should('have.css', 'gap', '8px');
      primary().realClick();
      cy.then(() => expect(calls).to.have.length(1));
      audit('forced-colors-active');
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      );
      cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(false));
    },
  );
  for (const key of ['Enter', 'Space'] as const) {
    scenario(
      3,
      `source-only span slot ${key} preserves DOM identity and original event but helper-emulated click is untrusted`,
      () => {
        const ownerEvents: OwnerEvent[] = [];
        let node: HTMLElement;
        stage(
          <ContextFooter
            footer={{
              primary: {
                children: (_Component: React.ElementType<NativeButtonProps>, props: Omit<NativeButtonProps, 'as'>) => (
                  <SpanAction onClick={props.onClick} />
                ),
              },
            }}
            onToggle={event => ownerEvents.push(event)}
          />,
        );
        cy.get('#span-action')
          .should('have.attr', 'role', 'button')
          .and('have.attr', 'tabindex', '0')
          .then($node => {
            node = $node[0];
          });
        focus('#span-action');
        cy.realPress(key);
        cy.get('#span-action').then($node => {
          expect($node[0]).to.equal(node);
        });
        cy.then(() => {
          expect(ownerEvents).to.have.length(1);
          expect(ownerEvents[0].type).to.equal('click');
          expect('nativeEvent' in ownerEvents[0] && ownerEvents[0].nativeEvent.isTrusted).to.equal(false);
        });
        cy.writeFile(`${evidence}/trust-span-${key}.json`, {
          scenario: Cypress.currentTest.title,
          cdpKey: key,
          sourceOnly: true,
          trustedClick: false,
          stableDOM: true,
        });
      },
    );
  }
  scenario(
    3,
    'controlled refusal coalesces no state acceptance and each real click retains a distinct original event',
    () => {
      harness({ control: 'refuse', defaultOpen: true });
      settled();
      audit('refused-open');
      secondary().realClick();
      secondary().realClick();
      settled();
      cy.then(() => {
        const closeRequests = events.filter(event => event.callback === 'owner');
        expect(closeRequests.map(event => event.open)).to.deep.equal([false, false]);
        expect(originals[0]).to.equal(originals[1]);
        expect(originals[2]).to.equal(originals[3]);
        expect(originals[0]).not.to.equal(originals[2]);
      });
      cy.get('#external-close').realClick();
      closed(false);
    },
  );
  scenario(
    3,
    'root slot children render function preserves generated buttons and appends consumer suffix through source rendering',
    () => {
      footer({
        primary: 'Read',
        secondary: 'Done',
        children: (Root: React.ElementType, props: React.HTMLAttributes<HTMLDivElement>) => (
          <Root {...props}>
            {props.children}
            <span data-root-suffix>Additional footer note</span>
          </Root>
        ),
      });
      cy.get('#footer').should('have.prop', 'tagName', 'DIV').find('button').should('have.length', 2);
      cy.get('#footer [data-root-suffix]').should('have.text', 'Additional footer note');
    },
  );
  scenario(
    3,
    'native Button icon suffix remains part of the supported slot without becoming a carousel next action',
    () => {
      footer({
        primary: { children: 'Guide', iconPosition: 'after', icon: <span aria-hidden="true">+</span> },
        secondary: 'Close',
      });
      primary().should($node => expect(computeAccessibleName($node[0])).to.equal('Guide'));
      primary().find('.fui-Button__icon').should('have.text', '+');
    },
  );
  scenario(3, 'ordinary Footer consumes no carousel page context and primary does not advance carousel cards', () => {
    stage(
      <TeachingPopoverCarousel defaultValue="one">
        <TeachingPopoverCarouselCard value="one">
          <TeachingPopoverBody>
            <TeachingPopoverTitle>First lesson</TeachingPopoverTitle>
            <p>Page one content</p>
          </TeachingPopoverBody>
        </TeachingPopoverCarouselCard>
        <TeachingPopoverCarouselCard value="two">
          <TeachingPopoverBody>
            <TeachingPopoverTitle>Second lesson</TeachingPopoverTitle>
            <p>Page two content</p>
          </TeachingPopoverBody>
        </TeachingPopoverCarouselCard>
        <TeachingPopoverFooter primary="Learn more" secondary="Done" />
      </TeachingPopoverCarousel>,
    );
    cy.get('[data-carousel-active-item="true"]').should('have.length', 1).and('contain.text', 'Page one content');
    primary().realClick();
    cy.get('[data-carousel-active-item="true"]').should('contain.text', 'Page one content');
    cy.get('.fui-TeachingPopoverCarouselFooter').should('not.exist');
  });
  for (const [name, Story, brand] of [
    ['Default', Default, false],
    ['AppearanceBrand', AppearanceBrand, true],
  ] as const) {
    scenario(
      3,
      `unchanged stable ${name} uses real Footer primary secondary and header dismiss without relabeling`,
      () => {
        cy.intercept('GET', '**/fabric-website/assets/images/wireframe/image-square.png', {
          headers: { 'content-type': 'image/svg+xml' },
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="176"><rect width="288" height="176" fill="#777"/></svg>',
        });
        stage(<Story />);
        const trigger = () => cy.get('#row139-stage [aria-expanded]');
        trigger().focus().realClick().should('have.attr', 'aria-expanded', 'true');
        settled();
        surface()
          .find('img')
          .should('have.prop', 'complete', true)
          .and('have.prop', 'naturalWidth', 288)
          .and('have.attr', 'alt', 'test image');
        primary().should('have.text', 'Learn more');
        secondary().should('have.text', 'Got it');
        surface().find('h2').should('have.text', 'Teaching Bubble Title');
        if (brand) {
          surface().should('have.css', 'background-color', 'rgb(15, 108, 189)');
        }
        primary()
          .focus()
          .should('have.focus')
          .should($node =>
            expect(getTabster($node[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement()).to.equal(
              $node[0],
            ),
          );
        cy.realPress('Tab');
        secondary().should('have.focus');
        cy.realPress(['Shift', 'Tab']);
        primary().should('have.focus');
        audit('stable-open', 'stable-basic');
        cy.screenshot(`positive/stable-${name}`, { capture: 'viewport' });
        cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Page.bringToFront' }));
        cy.document().should(document => expect(document.hasFocus()).to.equal(true));
        primary().realClick();
        settled();
        secondary().realClick();
        surface().should('not.exist');
        trigger().should('have.focus').realClick();
        settled();
        surface().find('button[aria-label="dismiss"]').realClick();
        surface().should('not.exist');
        trigger().should('have.focus');
      },
    );
  }
});
