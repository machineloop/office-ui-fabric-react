import * as React from 'react';
import * as axe from 'axe-core';
import { getTabster } from 'tabster';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
// nx-ignore-next-line
import { AriaLiveAnnouncer, FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { Harness, CarouselFixture, ComposedOwner, TeachingPopoverFooter } from './fixtures.stories';
import type { HarnessProps, RecordEvent, OpenEvent } from './fixtures.stories';
import {
  TeachingPopover,
  TeachingPopoverTrigger,
  TeachingPopoverSurface,
  useTeachingPopover_unstable,
  renderTeachingPopover_unstable,
  useTeachingPopoverContextValues_unstable,
} from '../../../index';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Context alias is not exported by the aggregate public entry.
import { renderPopover_unstable, usePopoverContextValues_unstable } from '@fluentui/react-popover';
// eslint-disable-next-line @fluentui/no-restricted-imports -- The provider is not exported by the aggregate public entry.
import { CustomStyleHooksProvider_unstable } from '@fluentui/react-shared-contexts';
// nx-ignore-next-line
import { Default } from '../../../../../stories/src/TeachingPopover/TeachingPopoverDefault.stories';
// nx-ignore-next-line
import { AppearanceBrand } from '../../../../../stories/src/TeachingPopover/TeachingPopoverAppearanceBrand.stories';
// nx-ignore-next-line
import { Carousel } from '../../../../../stories/src/TeachingPopover/TeachingPopoverCarousel.stories';
// nx-ignore-next-line
import { CarouselBrand } from '../../../../../stories/src/TeachingPopover/TeachingPopoverCarouselAppearanceBrand.stories';
// nx-ignore-next-line
import { CarouselText } from '../../../../../stories/src/TeachingPopover/TeachingPopoverCarouselText.stories';

const rawRound: unknown = Cypress.env('coverageRound') ?? 3;
if ((typeof rawRound !== 'number' && typeof rawRound !== 'string') || ![1, 2, 3, '1', '2', '3'].includes(rawRound)) {
  throw new Error('coverageRound must be exactly 1, 2, or 3');
}
const round = Number(rawRound);
const evidence = `src/components/TeachingPopover/.evidence/audits-${Date.now()}-${Cypress._.random(100000, 999999)}`;
type AuditWindow = Window & typeof globalThis & { axe: typeof axe };
const titles: string[] = [];
const autoFocusOptOut = {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact inherited public API spelling.
  unstable_disableAutoFocus: true,
};
let ordinal = 0;
let finalAuditStarted = false;
let auditAcquisitionUnfinished = false;
let events: RecordEvent[] = [];
let originals: OpenEvent[] = [];
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
      <main id="row137-stage" style={{ minHeight: 600, width: 900, padding: 24 }}>
        {children}
      </main>
    </FluentProvider>,
    { strict: false },
  );
}
function harness(props: HarnessProps = {}, dark = false, rtl = false) {
  return stage(
    <Harness {...props} onRecord={event => events.push(event)} onOriginal={event => originals.push(event)} />,
    dark,
    rtl,
  );
}
const trigger = () => cy.get('#row137-stage [aria-expanded]');
const surface = () => cy.get('.fui-TeachingPopoverSurface');
function observedFocus() {
  trigger()
    .focus()
    .should($trigger =>
      expect(getTabster($trigger[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement()).to.equal(
        $trigger[0],
      ),
    );
}
function settled() {
  return surface()
    .should('be.visible')
    .should($surface =>
      expect(
        $surface[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
      ).to.have.length(0),
    );
}
function open() {
  observedFocus();
  trigger().realClick();
  trigger().should('have.attr', 'aria-expanded', 'true');
  settled();
}
function close(restore = true) {
  settled();
  cy.realPress('Escape');
  surface().should('not.exist');
  trigger().should('have.attr', 'aria-expanded', 'false');
  if (restore) {
    trigger().should('have.focus');
  }
}
function record(index: number, type: string, value: boolean, callback = 'initial', trusted = true) {
  cy.then(() => expect(events[index]).to.deep.equal({ type, open: value, trusted, callback }));
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
function modalShape(profile: true | 'stable-basic' | 'stable-carousel' | 'stable-carousel-text') {
  const targets =
    profile === true
      ? [['#teaching-surface > i:nth-child(1)'], ['i:nth-child(5)']]
      : profile === 'stable-carousel'
      ? [
          ['.fui-PopoverSurface > i:nth-child(1)'],
          ['.fui-TeachingPopoverCarouselNav > i:nth-child(1)'],
          ['.fui-TeachingPopoverCarouselNav > i:nth-child(5)'],
          ['.fui-PopoverSurface > i:nth-child(5)'],
        ]
      : [['.fui-PopoverSurface > i:nth-child(1)'], [profile === 'stable-basic' ? 'i:nth-child(6)' : 'i:nth-child(5)']];
  return [
    {
      id: 'aria-hidden-focus',
      impact: 'serious',
      nodes: targets.map(target => ({
        target,
        impact: 'serious',
        anyChecks: [],
        none: [],
        all: [{ id: 'focusable-modal-open', data: null, impact: 'serious' }],
      })),
    },
  ];
}
function unnamedDialogShape() {
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
function audit(
  phase = 'final',
  modal: boolean | 'stable-basic' | 'stable-carousel' | 'stable-carousel-text' = false,
  failedCaseDiagnostic = false,
) {
  const subject = cy.get('#row137-stage');
  if (!failedCaseDiagnostic) {
    subject
      .should('be.visible')
      .and('not.be.empty')
      .should($stage =>
        expect(Boolean($stage[0].closest('[aria-hidden="true"]')), 'only live modal hides fixture').to.equal(
          Boolean(modal),
        ),
      )
      .should($stage => {
        if (!modal) {
          expect(
            Array.from($stage[0].querySelectorAll('button, a, input, select, textarea')).filter(node =>
              node.closest('[aria-hidden="true"]'),
            ),
            'Tabster has restored all closed fixture controls',
          ).to.have.length(0);
        }
        if (modal === 'stable-carousel') {
          const document = $stage[0].ownerDocument;
          expect(
            document.querySelectorAll('.fui-TeachingPopoverCarouselNav > [data-tabster-dummy]'),
            'actual three-tab mover readiness',
          ).to.have.length(2);
          expect(document.querySelectorAll('.fui-TeachingPopoverCarouselNav > [role="tab"]')).to.have.length(3);
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
    let auditor = axe;
    if (document.querySelector('iframe')) {
      const targetWindow = document.defaultView as AuditWindow;
      if (!targetWindow.axe) {
        throw new Error('Full iframe audit requires the raw browser axe engine');
      }
      auditor = targetWindow.axe;
    }
    auditAcquisitionUnfinished = true;
    if (phase === 'final') {
      finalAuditStarted = true;
    }
    return auditor.run(roots).then(fullResults => {
      cy.writeFile(`${evidence}/audit-${++ordinal}.json`, {
        scenario: Cypress.currentTest.title,
        modal,
        phase,
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
        expect(fullResults.passes.length, 'full default axe rules executed').to.be.greaterThan(0);
        const stable = modal === 'stable-basic' || modal === 'stable-carousel' || modal === 'stable-carousel-text';
        expect(findingShape(fullResults.violations), 'unknown violations rejected').to.deep.equal(
          stable ? unnamedDialogShape() : [],
        );
        if (modal) {
          if (stable) {
            expect(Cypress.currentTest.title).to.match(
              modal === 'stable-basic'
                ? /^stable (Default|AppearanceBrand) mounts unchanged /
                : /^stable (Carousel|CarouselAppearanceBrand|CarouselText) visits exactly three unchanged pages /,
            );
            expect(phase).to.equal('stable-open');
            expect(computeAccessibleName(document.querySelector('.fui-TeachingPopoverSurface')!)).to.equal('');
          } else {
            expect(Cypress.currentTest.title).to.equal(
              'trusted pointer opens once and Escape restores the observed trigger',
            );
            expect(phase).to.equal('open-modal');
          }
          const shape = findingShape(fullResults.incomplete);
          expect(shape).to.deep.equal(modalShape(modal));
          for (const node of fullResults.incomplete[0].nodes) {
            const sentinel = document.querySelector<HTMLElement>(String(node.target[0]));
            expect(sentinel?.tagName).to.equal('I');
            expect(sentinel?.getAttribute('aria-hidden')).to.equal('true');
            expect(sentinel?.getAttribute('tabindex')).to.equal('0');
            expect(sentinel?.getAttribute('role')).to.equal('none');
            expect(sentinel?.childElementCount).to.equal(0);
            expect(sentinel?.textContent).to.equal('');
            expect(sentinel?.outerHTML).to.equal(node.html);
            expect(sentinel?.getAttribute('data-tabster-dummy')).to.match(
              String(node.target[0]).startsWith('.fui-TeachingPopoverCarouselNav')
                ? /^isFirst=(true|false), isOutside=false, \(Mover, tabbable=true\)$/
                : /^isFirst=(true|false), isOutside=false, \(Modalizer, tabbable=true\)$/,
            );
            expect(sentinel?.closest('.fui-TeachingPopoverSurface')).not.to.equal(null);
            expect(node.all[0].relatedNodes).to.have.length(1);
            expect(node.all[0].relatedNodes![0].target).to.deep.equal(node.target);
            expect(node.all[0].relatedNodes![0].html).to.equal(node.html);
          }
          const unknown = [...shape, { ...shape[0], id: 'unknown-rule' }];
          expect(() => expect(unknown).to.deep.equal(modalShape(modal))).to.throw();
          expect(() => expect([...shape, shape[0]]).to.deep.equal(modalShape(modal))).to.throw();
          expect(() =>
            expect([{ ...shape[0], nodes: [...shape[0].nodes, shape[0].nodes[0]] }]).to.deep.equal(modalShape(modal)),
          ).to.throw();
          const changedCheck = Cypress._.cloneDeep(shape);
          changedCheck[0].nodes[0].all[0].id = 'unknown-check';
          expect(() => expect(changedCheck).to.deep.equal(modalShape(modal))).to.throw();
          const changedTarget = Cypress._.cloneDeep(shape);
          changedTarget[0].nodes[0].target = ['#unknown-target'];
          expect(() => expect(changedTarget).to.deep.equal(modalShape(modal))).to.throw();
          const changedImpact = Cypress._.cloneDeep(shape);
          changedImpact[0].impact = 'critical';
          expect(() => expect(changedImpact).to.deep.equal(modalShape(modal))).to.throw();
          cy.writeFile(`${evidence}/classifier-guards-${ordinal}.json`, {
            scenario: Cypress.currentTest.title,
            rejected: [
              'unknown-rule',
              'duplicate-rule',
              'duplicate-node',
              'unknown-check',
              'wrong-target',
              'wrong-impact',
            ],
            expected: modalShape(modal),
          });
        } else {
          expect(fullResults.incomplete, 'unknown incompletes rejected').to.deep.equal([]);
        }
        expect(Cypress.currentRetry).to.equal(0);
      });
    });
  });
}

describe('row137 TeachingPopover', { retries: 0 }, () => {
  before(() => {
    expect(React.version).to.equal('19.2.0');
    expect(new Set(titles).size).to.equal(titles.length);
    expect(titles.length).to.equal([17, 54, 79][round - 1]);
    cy.writeFile(`${evidence}/manifest.json`, { round, titles, expectedCount: [17, 54, 79][round - 1], retries: 0 });
  });
  beforeEach(() => {
    finalAuditStarted = false;
    auditAcquisitionUnfinished = false;
    cy.viewport(1100, 800);
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.setCacheDisabled',
        params: { cacheDisabled: true },
      }),
    );
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
      if (typeof name === 'string' && ['realClick', 'realPress', 'realHover', 'realMouseWheel'].includes(name)) {
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

  scenario(1, 'closed defaults are a native trigger and a non-DOM owner without fabricated callbacks', () => {
    harness();
    trigger()
      .should('have.prop', 'tagName', 'BUTTON')
      .and('have.attr', 'type', 'button')
      .and('have.attr', 'aria-expanded', 'false');
    surface().should('not.exist');
    cy.get('#row137-stage > .fui-TeachingPopover').should('not.exist');
    cy.then(() => expect(events).to.deep.equal([]));
  });
  scenario(1, 'trusted pointer opens once and Escape restores the observed trigger', () => {
    harness();
    open();
    surface().should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
    cy.get('#lesson-one').should('have.focus');
    record(0, 'click', true);
    audit('open-modal', true);
    close();
    record(1, 'keydown', false);
    cy.then(() => expect(events).to.have.length(2));
  });
  for (const key of ['Enter', 'Space'] as const) {
    scenario(1, `native ${key} activation opens once with original click identity`, () => {
      let click: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement> | undefined;
      harness({
        onTrigger: event => {
          click = event;
        },
      });
      observedFocus();
      cy.realPress(key);
      settled();
      record(0, 'click', true, 'initial', false);
      cy.then(() => {
        expect(originals[0]).to.equal(click);
        expect(events).to.have.length(1);
      });
      close();
    });
  }
  scenario(1, 'default focus trap wraps Tab and ShiftTab over actual actions', () => {
    harness();
    open();
    cy.get('#lesson-one').should('have.focus');
    cy.realPress('Tab');
    cy.get('#lesson-two').should('have.focus');
    cy.realPress('Tab');
    cy.get('#lesson-one').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#lesson-two').should('have.focus');
    close();
  });
  scenario(1, 'explicit trapFocus false keeps group semantics and permits native Tab exit', () => {
    harness({ owner: { trapFocus: false, inline: true } });
    open();
    surface().should('have.attr', 'role', 'group').and('not.have.attr', 'aria-modal');
    cy.realPress('Tab');
    cy.get('#lesson-two').should('have.focus');
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    surface().should('exist');
    cy.get('#lesson-two').focus();
    close();
  });
  scenario(1, 'outside trusted pointer dismisses without intercepting the outside action', () => {
    harness();
    open();
    cy.get('#after').realClick();
    surface().should('not.exist');
    record(1, 'click', false);
  });
  scenario(1, 'inside pointer and live content update preserve owner open state', () => {
    harness();
    open();
    cy.get('#lesson-one').realClick();
    cy.get('#lesson-description').should('have.text', 'Second teaching panel');
    surface().should('exist');
    cy.then(() => expect(events).to.have.length(1));
    close();
  });
  scenario(1, 'defaultOpen initializes without an open notification and remount resets it', () => {
    harness({ owner: { defaultOpen: true } });
    settled();
    trigger().should('have.attr', 'aria-expanded', 'true');
    cy.then(() => expect(events).to.deep.equal([]));
    close(false);
    cy.get('#unmount').realClick();
    cy.get('#remount').realClick();
    settled();
    trigger().should('have.attr', 'aria-expanded', 'true');
    close(false);
  });
  scenario(1, 'controlled false rejects open requests without fabricating surface or focus changes', () => {
    harness({ control: 'reject' });
    observedFocus();
    trigger().realClick();
    trigger().should('have.attr', 'aria-expanded', 'false').and('have.focus');
    surface().should('not.exist');
    record(0, 'click', true);
    trigger().realClick();
    record(1, 'click', true);
  });
  scenario(1, 'controlled true rejects repeated Escape until external state accepts closure', () => {
    harness({ control: 'reject', initial: true, owner: { trapFocus: false } });
    settled();
    cy.realPress('Escape');
    record(0, 'keydown', false);
    surface().should('exist');
    cy.realPress('Escape');
    record(1, 'keydown', false);
    cy.get('#external-close').realClick();
    surface().should('not.exist');
  });
  scenario(1, 'controlled owner accepts requests and external transitions do not emit callbacks', () => {
    harness({ control: 'accept' });
    open();
    close();
    cy.then(() => expect(events).to.have.length(2));
    cy.get('#external-open').realClick();
    settled();
    cy.then(() => expect(events).to.have.length(2));
    close();
    record(2, 'keydown', false);
  });
  scenario(1, 'latest callback and live owner props are used after rerender', () => {
    harness();
    cy.get('#replace').realClick();
    open();
    record(0, 'click', true, 'latest');
    surface().children('div').not('.fui-TeachingPopoverBody').should('have.length', 0);
    cy.get('[data-context]').should('contain.text', '"size":"large"');
    close();
    record(1, 'keydown', false, 'latest');
  });
  scenario(1, 'disabled native trigger cannot request opening with pointer or Enter', () => {
    harness({ trigger: { disabled: true } });
    trigger().should('be.disabled').realClick();
    cy.get('#before').focus();
    cy.realPress('Tab');
    trigger().should('not.have.focus');
    cy.then(() => expect(events).to.deep.equal([]));
    surface().should('not.exist');
  });
  scenario(1, 'disabledFocusable trigger is tabbable but Enter and Space remain inert', () => {
    harness({ trigger: { disabledFocusable: true } });
    trigger().should('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
    observedFocus();
    cy.realPress('Enter');
    cy.realPress('Space');
    surface().should('not.exist');
    cy.then(() => expect(events).to.deep.equal([]));
  });
  scenario(1, 'heading label and long description define the actual dialog name and description', () => {
    harness();
    open();
    surface().should($surface => {
      expect(computeAccessibleName($surface[0])).to.equal('Learn the feature');
      expect(computeAccessibleDescription($surface[0])).to.equal('First teaching panel');
    });
    cy.get('#lesson-title').should('have.prop', 'tagName', 'H2');
    close();
  });
  scenario(1, 'public complete hook context and render preserve real owner refs and aliases', () => {
    let latest: import('../../../index').TeachingPopoverState | undefined;
    harness({
      composed: true,
      onState: state => {
        latest = state;
      },
    });
    open();
    cy.then(() => {
      expect(renderTeachingPopover_unstable).to.equal(renderPopover_unstable);
      expect(useTeachingPopoverContextValues_unstable).to.equal(usePopoverContextValues_unstable);
      expect(latest?.triggerRef.current).to.equal(Cypress.$('#teaching-trigger')[0]);
      expect(latest?.contentRef.current).to.equal(Cypress.$('#teaching-surface')[0]);
      expect(latest?.arrowRef.current?.parentElement).to.equal(latest?.contentRef.current);
      expect(latest?.trapFocus).to.equal(true);
      expect(latest?.withArrow).to.equal(true);
      expect(latest?.inline).to.equal(false);
      expect(latest?.size).to.equal('medium');
    });
    close();
  });

  scenario(2, 'withArrow false removes only the real arrow while retaining dialog ownership', () => {
    harness({ owner: { withArrow: false } });
    open();
    surface().children('div').should('have.length', 1);
    cy.get('[data-context]').should('contain.text', '"withArrow":false');
    close();
  });
  scenario(2, 'inline true places surface beside the trigger and applies inline stacking', () => {
    harness({ owner: { inline: true } });
    open();
    cy.get('#row137-stage .fui-TeachingPopoverSurface').should('have.length', 1);
    surface()
      .should('have.css', 'z-index', '1')
      .should($surface => expect($surface[0].previousElementSibling?.id).to.equal('teaching-trigger'));
    close();
  });
  scenario(2, 'default portal is outside the owner DOM and removed after closure', () => {
    harness();
    open();
    surface().should($surface => expect($surface[0].closest('#row137-stage')).to.equal(null));
    close();
    cy.get('#row137-stage').should('not.be.empty');
  });
  scenario(2, 'mountNode HTMLElement routes the actual portal without changing modal semantics', () => {
    const App = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="portal-destination" ref={setNode} />
          {node && <Harness owner={{ mountNode: node }} />}
        </>
      );
    };
    stage(<App />);
    open();
    cy.get('#portal-destination .fui-TeachingPopoverSurface').should('have.length', 1);
    close();
  });
  for (const size of ['small', 'medium', 'large'] as const) {
    scenario(2, `inherited ${size} size propagates context and arrow geometry while teaching padding wins`, () => {
      harness({ owner: { size } });
      open();
      cy.get('[data-context]').should('contain.text', `"size":"${size}"`);
      surface().should('have.css', 'padding-top', '16px').and('have.css', 'min-width', '320px');
      surface()
        .children('div')
        .first()
        .should($arrow => {
          const style = $arrow[0].ownerDocument.defaultView!.getComputedStyle($arrow[0]);
          expect(parseFloat(style.width)).to.be.closeTo((size === 'small' ? 6 : 8) * Math.SQRT2, 0.1);
        });
      close();
    });
  }
  for (const [position, relation] of [
    ['above', 'top'],
    ['below', 'bottom'],
    ['before', 'left'],
    ['after', 'right'],
  ] as const) {
    scenario(2, `positioning ${position} uses actual target-relative CSS geometry`, () => {
      harness({ owner: { positioning: { position, autoSize: false, flipBoundary: null } } });
      open();
      surface().should($surface => {
        const rect = $surface[0].getBoundingClientRect();
        const anchor = $surface[0].ownerDocument.getElementById('teaching-trigger')!.getBoundingClientRect();
        if (relation === 'top') {
          expect(rect.bottom).to.be.at.most(anchor.top + 1);
        }
        if (relation === 'bottom') {
          expect(rect.top).to.be.at.least(anchor.bottom - 1);
        }
        if (relation === 'left') {
          expect(rect.right).to.be.at.most(anchor.left + 1);
        }
        if (relation === 'right') {
          expect(rect.left).to.be.at.least(anchor.right - 1);
        }
      });
      close();
    });
  }
  scenario(2, 'source characterization coverTarget false arrow decision is overwritten by teaching defaults', () => {
    harness({ owner: { positioning: { coverTarget: true } } });
    open();
    cy.get('[data-context]').should('contain.text', '"withArrow":true');
    surface().children('div').should('have.length', 2);
    close();
  });
  scenario(2, 'surface native class style title and ARIA overrides reach real DOM not owner root', () => {
    harness({
      surface: {
        className: 'authored-surface',
        title: 'Native title',
        'aria-label': 'Explicit lesson',
        'aria-labelledby': undefined,
        style: { width: 400, padding: 24 },
        tabIndex: -1,
      },
    });
    open();
    surface()
      .should('have.class', 'authored-surface')
      .and('have.attr', 'title', 'Native title')
      .and('have.css', 'width', '400px')
      .and('have.css', 'padding-top', '24px')
      .and('have.focus');
    surface().should($node => expect(computeAccessibleName($node[0])).to.equal('Explicit lesson'));
    close();
  });
  scenario(2, 'surface Escape handler observes the same prevented source event after owner dismissal', () => {
    let slotEvent: React.KeyboardEvent<HTMLDivElement> | undefined;
    harness({
      surface: {
        onKeyDown: event => {
          slotEvent = event;
        },
      },
    });
    open();
    close();
    cy.then(() => {
      expect(originals[1]).to.equal(slotEvent);
      expect(slotEvent?.defaultPrevented).to.equal(true);
    });
  });
  scenario(2, 'source characterization trigger click preventDefault does not cancel owner toggle', () => {
    harness({ onTrigger: event => event.preventDefault() });
    open();
    record(0, 'click', true);
    close();
  });
  scenario(2, 'trigger Escape preventDefault cancels owner dismissal when autofocus is disabled', () => {
    harness({
      owner: autoFocusOptOut,
      trigger: {
        onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>) => {
          if (event.key === 'Escape') {
            event.preventDefault();
          }
        },
      },
    });
    open();
    trigger().should('have.focus');
    cy.realPress('Escape');
    surface().should('exist');
    cy.then(() => expect(events).to.have.length(1));
    cy.get('#lesson-one').focus();
    close();
  });
  scenario(2, 'unstable_disableAutoFocus keeps the native trigger active until explicit inside focus', () => {
    harness({ owner: autoFocusOptOut });
    open();
    trigger().should('have.focus');
    cy.realPress('Escape');
    surface().should('not.exist');
    record(1, 'keydown', false);
  });
  scenario(2, 'explicit trapFocus true listens to genuine inside-to-outside focus transitions', () => {
    harness({ owner: { trapFocus: true, inertTrapFocus: true } });
    open();
    cy.get('#lesson-two').focus();
    cy.get('#after').focus();
    surface().should('not.exist');
    record(1, 'focusin', false);
  });
  scenario(2, 'source characterization implicit trapFocus default omits owner focus-out listener', () => {
    harness({ owner: { inertTrapFocus: true } });
    open();
    cy.get('#lesson-two').focus();
    cy.get('#after').focus();
    surface().should('exist');
    cy.then(() => expect(events).to.have.length(1));
    cy.get('#lesson-one').focus();
    close();
  });
  scenario(2, 'outside-to-outside focus never dismisses explicit trap when auto focus is disabled', () => {
    harness({ control: 'accept', owner: { trapFocus: true, inertTrapFocus: true, ...autoFocusOptOut } });
    cy.get('#external-open').realClick();
    settled();
    cy.get('#before').focus();
    cy.get('#after').focus();
    surface().should('exist');
    cy.then(() => expect(events).to.deep.equal([]));
    cy.get('#lesson-one').focus();
    close(false);
  });
  scenario(2, 'legacyTrapFocus false maps to inert navigation without setting native inert', () => {
    harness({ owner: { legacyTrapFocus: false } });
    open();
    cy.get('[data-context]').should('contain.text', '"inertTrapFocus":true');
    cy.get('#before').should('not.have.attr', 'inert');
    close();
  });
  scenario(2, 'inertTrapFocus explicit false overrides deprecated legacy opt-out', () => {
    harness({ owner: { legacyTrapFocus: false, inertTrapFocus: false } });
    open();
    cy.get('[data-context]').should('contain.text', '"inertTrapFocus":false');
    close();
  });
  scenario(2, 'native hover opens and a zero-delay outside mouseleave dismisses', () => {
    harness({ owner: { openOnHover: true, mouseLeaveDelay: 0, trapFocus: false, ...autoFocusOptOut } });
    trigger().realHover();
    settled();
    record(0, 'mouseenter', true);
    cy.get('#after').realHover();
    surface().should('not.exist');
    cy.then(() => {
      expect(events[events.length - 1]).to.deep.equal({
        type: 'mouseleave',
        open: false,
        trusted: true,
        callback: 'initial',
      });
      expect(events.slice(0, -1).every(event => event.type === 'mouseenter' && event.open && event.trusted)).to.equal(
        true,
      );
    });
  });
  scenario(2, 'hover entering the real surface cancels pending trigger leave dismissal', () => {
    harness({ owner: { openOnHover: true, trapFocus: false, ...autoFocusOptOut } });
    trigger().realHover();
    settled();
    surface().realHover();
    settled();
    cy.then(() => expect(events.length).to.be.at.least(2));
    cy.then(() =>
      expect(events.every(event => event.type === 'mouseenter' && event.open && event.trusted)).to.equal(true),
    );
    cy.get('#lesson-one').focus();
    close(false);
  });
  scenario(2, 'context mode ignores ordinary click and opens at a trusted right pointer target', () => {
    harness({ owner: { openOnContext: true } });
    observedFocus();
    trigger().realClick();
    surface().should('not.exist');
    trigger().realClick({ button: 'right' });
    settled();
    record(0, 'contextmenu', true);
    close();
  });
  scenario(2, 'native wheel outside closes only when closeOnScroll is enabled', () => {
    stage(
      <>
        <div
          id="scroll-area"
          tabIndex={0}
          role="region"
          aria-label="Outside scrolling region"
          style={{ position: 'fixed', right: 16, bottom: 16, width: 100, height: 100, overflow: 'auto' }}
        >
          <div style={{ height: 1000 }}>Outside scroll</div>
        </div>
        <Harness owner={{ closeOnScroll: true, trapFocus: false }} onRecord={event => events.push(event)} />
      </>,
    );
    open();
    cy.get('#scroll-area').realHover().realMouseWheel({ deltaY: 100 });
    cy.get('#scroll-area').should($node => expect($node[0].scrollTop).to.be.greaterThan(0));
    surface().should('not.exist');
    record(1, 'wheel', false);
  });
  scenario(2, 'default owner stays open on outside native scrolling', () => {
    stage(
      <>
        <div
          id="scroll-area"
          tabIndex={0}
          role="region"
          aria-label="Outside scrolling region"
          style={{ position: 'fixed', right: 16, bottom: 16, width: 100, height: 100, overflow: 'auto' }}
        >
          <div style={{ height: 1000 }}>Outside scroll</div>
        </div>
        <Harness owner={{ trapFocus: false }} onRecord={event => events.push(event)} />
      </>,
    );
    open();
    cy.get('#scroll-area').realHover().realMouseWheel({ deltaY: 100 });
    cy.get('#scroll-area').should($node => expect($node[0].scrollTop).to.be.greaterThan(0));
    surface().should('exist');
    cy.get('#lesson-one').focus();
    close();
  });
  for (const [appearance, dark, background, foreground] of [
    [undefined, false, 'rgb(255, 255, 255)', 'rgb(36, 36, 36)'],
    ['brand', false, 'rgb(15, 108, 189)', 'rgb(255, 255, 255)'],
    [undefined, true, 'rgb(41, 41, 41)', 'rgb(255, 255, 255)'],
    ['brand', true, 'rgb(17, 94, 163)', 'rgb(255, 255, 255)'],
    ['inverted', false, 'rgb(51, 51, 51)', 'rgb(255, 255, 255)'],
  ] as const) {
    scenario(
      2,
      `${dark ? 'dark' : 'light'} ${appearance ?? 'default'} appearance propagates actual inherited CSS tokens`,
      () => {
        harness({ owner: { appearance } }, dark);
        open();
        surface().should('have.css', 'background-color', background).and('have.css', 'color', foreground);
        close();
      },
    );
  }
  scenario(2, 'RTL before positioning mirrors target geometry through the actual provider', () => {
    harness({ owner: { positioning: { position: 'before', flipBoundary: null } } }, false, true);
    open();
    surface()
      .should('have.css', 'direction', 'rtl')
      .should($node => {
        expect($node[0].getBoundingClientRect().left).to.be.at.least(
          $node[0].ownerDocument.getElementById('teaching-trigger')!.getBoundingClientRect().right - 1,
        );
      });
    close();
  });
  scenario(2, 'real forced-colors media preserves native dialog and focus ownership', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    harness();
    open();
    surface().should($node =>
      expect($node[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true),
    );
    cy.get('#lesson-one').should('have.focus');
    close();
  });
  scenario(2, 'mountNode object routes its real element while className is fallback-only by source contract', () => {
    const App = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="object-destination" ref={setNode} />
          {node && <Harness owner={{ mountNode: { element: node, className: 'authored-portal' } }} />}
        </>
      );
    };
    stage(<App />);
    open();
    cy.get('#object-destination .fui-TeachingPopoverSurface').should('have.length', 1);
    cy.get('#object-destination').should('not.have.class', 'authored-portal');
    close();
  });
  scenario(2, 'mountNode object className decorates only the generated fallback portal', () => {
    harness({ owner: { mountNode: { className: 'authored-fallback-portal' } } });
    open();
    surface().parents('.authored-fallback-portal').should('have.length', 1);
    close();
    cy.get('.authored-fallback-portal').should('not.exist');
  });
  scenario(
    2,
    'provider customization reaches the supported child surface style hook without inventing owner styling',
    () => {
      let calls = 0;
      stage(
        <CustomStyleHooksProvider_unstable
          value={{
            // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact inherited child style-hook key.
            useTeachingPopoverSurfaceStyles_unstable: state => {
              calls++;
              if (
                !state ||
                typeof state !== 'object' ||
                !('root' in state) ||
                !state.root ||
                typeof state.root !== 'object'
              ) {
                throw new Error('Expected a real TeachingPopoverSurface state');
              }
              Object.assign(state.root, { style: { outline: '3px solid rgb(0, 128, 0)' } });
            },
          }}
        >
          <Harness />
        </CustomStyleHooksProvider_unstable>,
      );
      open();
      surface().should('have.css', 'outline-width', '3px').and('have.css', 'outline-color', 'rgb(0, 128, 0)');
      cy.then(() => expect(calls).to.be.greaterThan(0));
      close();
    },
  );
  scenario(
    3,
    'frozen controlled false overrides defaultOpen and latest rejected requests retain exact event identity',
    () => {
      let slotEvent: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement> | undefined;
      const frozen = Object.freeze({ defaultOpen: true, withArrow: true });
      harness({
        control: 'reject',
        owner: frozen,
        onTrigger: event => {
          slotEvent = event;
        },
      });
      trigger().should('have.attr', 'aria-expanded', 'false');
      surface().should('not.exist');
      cy.get('#replace').realClick();
      observedFocus();
      trigger().realClick();
      record(0, 'click', true, 'latest');
      cy.then(() => {
        expect(originals[0]).to.equal(slotEvent);
        expect(frozen).to.deep.equal({ defaultOpen: true, withArrow: true });
        expect(events).to.have.length(1);
      });
      surface().should('not.exist');
    },
  );
  scenario(3, 'defaultOpen changes after mount never replace uncontrolled owner state', () => {
    const App = () => {
      const [initial, setInitial] = React.useState(false);
      return (
        <>
          <button id="change-initial" onClick={() => setInitial(true)}>
            Change initial prop
          </button>
          <TeachingPopover defaultOpen={initial}>
            <TeachingPopoverTrigger disableButtonEnhancement>
              <button id="teaching-trigger">Uncontrolled lesson</button>
            </TeachingPopoverTrigger>
            <TeachingPopoverSurface aria-label="Uncontrolled lesson">
              <button id="inside-initial" onClick={() => setInitial(false)}>
                Reset initial prop
              </button>
            </TeachingPopoverSurface>
          </TeachingPopover>
        </>
      );
    };
    stage(<App />);
    cy.get('#change-initial').realClick();
    trigger().should('have.attr', 'aria-expanded', 'false');
    surface().should('not.exist');
    open();
    cy.get('#inside-initial').realClick();
    surface().should('exist');
    close();
  });

  scenario(3, 'teaching carousel callbacks preserve original trusted click event and exact source data', () => {
    const callbacks: Array<{ kind: string; event: unknown; data: unknown }> = [];
    let nativeAnnouncements: Cypress.Agent<sinon.SinonSpy> | undefined;
    cy.document().then(document => {
      if ('ariaNotify' in document && typeof document.ariaNotify === 'function') {
        nativeAnnouncements = cy.spy(document, 'ariaNotify');
      }
    });
    const announced = (message: string, calls: number) =>
      cy.then(() => {
        if (nativeAnnouncements) {
          cy.wrap(nativeAnnouncements)
            .should('have.callCount', calls)
            .then(spy => expect(spy.lastCall.args).to.deep.equal([message, { priority: 'normal' }]));
        } else {
          cy.get('[aria-live="assertive"]').should('contain.text', message);
        }
      });
    stage(
      <AriaLiveAnnouncer>
        <CarouselFixture onRecord={(kind, event, data) => callbacks.push({ kind, event, data })} />
      </AriaLiveAnnouncer>,
    );
    open();
    cy.contains('button', 'Next').realClick();
    announced('Lesson two', 1);
    cy.contains('button', 'Next').realClick();
    announced('Lesson three', 2);
    settled();
    cy.contains('button', 'Finish').realClick();
    cy.then(() =>
      cy.writeFile(
        `${evidence}/carousel-callbacks.json`,
        callbacks.map(item => {
          const event = item.event as React.MouseEvent;
          const data = item.data as { event: unknown; type: string; value: string };
          return {
            kind: item.kind,
            eventType: event.type,
            trusted: event.nativeEvent.isTrusted,
            sameEvent: data.event === event,
            data: { type: data.type, value: data.value },
          };
        }),
      ),
    );
    surface().should('not.exist');
    cy.then(() => {
      expect(callbacks.map(item => item.kind)).to.deep.equal(['value', 'value', 'finish']);
      expect(callbacks.map(item => item.data)).to.deep.equal(
        callbacks.map((item, index) => ({ event: item.event, type: 'click', value: ['two', 'three', 'three'][index] })),
      );
      for (const item of callbacks) {
        const event = item.event as React.MouseEvent;
        expect(event.type).to.equal('click');
        expect(event.nativeEvent.isTrusted).to.equal(true);
      }
    });
  });
  for (const [name, Story, brand] of [
    ['Default', Default, false],
    ['AppearanceBrand', AppearanceBrand, true],
  ] as const) {
    scenario(
      3,
      `stable ${name} mounts unchanged with real image and documented primary secondary dismiss interactions`,
      () => {
        cy.intercept('GET', '**/fabric-website/assets/images/wireframe/image-square.png', {
          headers: { 'content-type': 'image/svg+xml' },
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="176"><rect width="288" height="176" fill="#777"/></svg>',
        }).as('stableImage');
        stage(<Story />);
        open();
        surface()
          .find('img')
          .should('have.prop', 'complete', true)
          .and('have.prop', 'naturalWidth', 288)
          .and('have.attr', 'alt', 'test image');
        surface().find('.fui-TeachingPopoverHeader').should('contain.text', 'Tips');
        surface().find('h2').should('have.text', 'Teaching Bubble Title');
        surface().should('contain.text', 'This is a teaching popover body');
        if (brand) {
          surface().should('have.css', 'background-color', 'rgb(15, 108, 189)');
        }
        audit('stable-open', 'stable-basic');
        cy.screenshot(`positive/stable-${name}`, { capture: 'viewport' });
        cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Page.bringToFront' }));
        cy.document().should(document =>
          expect(document.hasFocus(), 'real browser focus restored after capture').to.equal(true),
        );
        cy.contains('.fui-TeachingPopoverFooter button', 'Learn more').realClick();
        surface().should('exist');
        settled();
        cy.contains('.fui-TeachingPopoverFooter button', 'Got it').realClick();
        surface().should('not.exist');
        trigger().should('have.focus');
        open();
        surface().find('button[aria-label="dismiss"]').realClick();
        surface().should('not.exist');
        trigger().should('have.focus');
      },
    );
  }
  for (const [name, Story, text] of [
    ['Carousel', Carousel, false],
    ['CarouselAppearanceBrand', CarouselBrand, false],
    ['CarouselText', CarouselText, true],
  ] as const) {
    scenario(3, `stable ${name} visits exactly three unchanged pages with nav previous next close and finish`, () => {
      cy.intercept('GET', '**/fabric-website/assets/images/wireframe/image-square.png', {
        headers: { 'content-type': 'image/svg+xml' },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="176"><rect width="288" height="176" fill="#777"/></svg>',
      });
      stage(<Story />);
      open();
      surface().find('[data-carousel-item]').should('have.length', 3);
      const page = (pageNumber: number) => {
        surface()
          .find('[data-carousel-active-item="true"]')
          .should('have.length', 1)
          .and('contain.text', `This is page: ${pageNumber}`);
        surface().find('[data-carousel-active-item="false"]').should('have.length', 2).and('be.empty');
        if (text) {
          surface().find('.fui-TeachingPopoverCarouselPageCount').should('have.text', `${pageNumber} of 3`);
        } else {
          surface().find('[role="tab"]').should('have.length', 3);
          surface().find('[aria-selected="true"]').should('have.attr', 'aria-label', `Tip ${pageNumber}`);
        }
      };
      page(1);
      audit('stable-open', text ? 'stable-carousel-text' : 'stable-carousel');
      cy.contains('button', 'Next').realClick();
      page(2);
      cy.contains('button', 'Previous').realClick();
      page(1);
      if (!text) {
        surface().find('[role="tab"]').eq(2).realClick();
        page(3);
      } else {
        cy.contains('button', 'Next').realClick();
        page(2);
        cy.contains('button', 'Next').realClick();
        page(3);
      }
      cy.screenshot(`positive/stable-${name}`, { capture: 'viewport' });
      cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Page.bringToFront' }));
      cy.document().should(document =>
        expect(document.hasFocus(), 'real browser focus restored after capture').to.equal(true),
      );
      settled();
      cy.contains('button', 'Finish').realClick();
      surface().should('not.exist');
      trigger().should('have.focus');
      open();
      page(1);
      settled();
      cy.contains('button', 'Close').realClick();
      surface().should('not.exist');
      trigger().should('have.focus');
    });
  }
  scenario(3, 'controlled teaching carousel accepts real navigation without inventing owner open callbacks', () => {
    const change = cy.stub();
    stage(<CarouselFixture controlled owner={{ onOpenChange: change }} />);
    open();
    cy.contains('button', 'Next').realClick();
    surface().find('[data-carousel-active-item="true"]').should('have.attr', 'data-carousel-item', 'two');
    cy.wrap(change).should('have.been.calledOnce');
    close();
    cy.wrap(change).should('have.been.calledTwice');
  });
  scenario(3, 'carousel Tab enters real icon navigation and ArrowRight changes focus without selecting a page', () => {
    stage(<CarouselFixture />);
    open();
    surface().find('[role="tab"]').first().focus();
    cy.realPress('ArrowRight');
    surface().find('[role="tab"]').eq(1).should('have.focus');
    surface().find('[data-carousel-active-item="true"]').should('have.attr', 'data-carousel-item', 'one');
    cy.realPress('Enter');
    surface().find('[data-carousel-active-item="true"]').should('have.attr', 'data-carousel-item', 'two');
    cy.realPress('Tab');
    cy.contains('button', 'Next').should('have.focus');
    close();
  });
  scenario(3, 'text carousel height follows real active content and final step aligns labels with three pages', () => {
    stage(<CarouselFixture text />);
    open();
    let firstHeight = 0;
    surface().then($node => {
      firstHeight = $node[0].getBoundingClientRect().height;
    });
    surface().find('.fui-TeachingPopoverCarouselPageCount').should('have.text', '1 of 3');
    cy.contains('button', 'Next').realClick();
    surface().find('.fui-TeachingPopoverCarouselPageCount').should('have.text', '2 of 3');
    settled();
    surface().should($node => expect($node[0].getBoundingClientRect().height).to.be.greaterThan(firstHeight));
    cy.contains('button', 'Next').realClick();
    surface().find('.fui-TeachingPopoverCarouselPageCount').should('have.text', '3 of 3');
    cy.contains('button', 'Finish').should('be.visible');
    close();
  });
  scenario(3, 'header dismiss uses the same source event and explicit trigger restoration', () => {
    harness({ header: true });
    open();
    surface().find('[aria-label="dismiss"]').realClick();
    surface().should('not.exist');
    trigger().should('have.focus');
    record(1, 'click', false);
  });
  scenario(3, 'single-action teaching footer interoperates with inherited owner toggle', () => {
    harness({ content: <TeachingPopoverFooter primary="Done" /> });
    open();
    cy.contains('button', 'Done').realClick();
    surface().should('not.exist');
    trigger().should('have.focus');
    record(1, 'click', false);
  });
  scenario(3, 'single surface with positioning target opens programmatically without fabricating a trigger', () => {
    const App = () => {
      const [node, setNode] = React.useState<HTMLButtonElement | null>(null);
      return (
        <>
          <button id="target" ref={setNode}>
            Position target
          </button>
          {node && <Harness noTrigger owner={{ defaultOpen: true, positioning: { target: node } }} />}
        </>
      );
    };
    stage(<App />);
    settled();
    trigger().should('not.exist');
    surface().should('have.attr', 'role', 'dialog');
    cy.realPress('Escape');
    surface().should('not.exist');
  });
  scenario(3, 'plain native trigger with enhancement opted out retains genuine native Enter click', () => {
    const changed = cy.stub();
    stage(
      <TeachingPopover onOpenChange={changed}>
        <TeachingPopoverTrigger disableButtonEnhancement>
          <button id="teaching-trigger">Native lesson</button>
        </TeachingPopoverTrigger>
        <TeachingPopoverSurface aria-label="Native lesson">
          <button>Action</button>
        </TeachingPopoverSurface>
      </TeachingPopover>,
    );
    observedFocus();
    cy.realPress('Enter');
    settled();
    cy.wrap(changed).should('have.been.calledOnce');
    cy.then(() => expect((changed.firstCall.args[0] as React.MouseEvent).nativeEvent.isTrusted).to.equal(true));
    close();
  });
  scenario(3, 'custom nonbutton trigger exposes enhanced role and native Space keyboard activation', () => {
    stage(
      <TeachingPopover>
        <TeachingPopoverTrigger>
          <span id="teaching-trigger">Custom lesson</span>
        </TeachingPopoverTrigger>
        <TeachingPopoverSurface aria-label="Custom lesson">
          <button>Action</button>
        </TeachingPopoverSurface>
      </TeachingPopover>,
    );
    trigger().should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
    observedFocus();
    cy.realPress('Space');
    settled();
    close();
  });
  scenario(3, 'complete hook render without context uses inherited inert default provider fallback', () => {
    const Fallback = () => {
      const state = useTeachingPopover_unstable({
        defaultOpen: true,
        children: (
          <TeachingPopoverSurface aria-label="Fallback lesson">
            <button>Action</button>
          </TeachingPopoverSurface>
        ),
      });
      return renderTeachingPopover_unstable(state);
    };
    stage(<Fallback />);
    settled();
    surface().should('have.attr', 'role', 'group').and('not.have.attr', 'aria-modal');
    audit('fallback-group');
    stage(<p>Fallback owner unmounted</p>);
    surface().should('not.exist');
  });
  scenario(3, 'public composed owner renders one child with context while retaining non-DOM hierarchy', () => {
    const App = () => {
      const [shown, setShown] = React.useState(false);
      return (
        <>
          <button id="composed-start" onClick={() => setShown(true)}>
            Show composed lesson
          </button>
          <ComposedOwner open={shown} onOpenChange={(_event, data) => setShown(data.open)}>
            <TeachingPopoverSurface aria-label="Composed lesson">
              <button>Action</button>
            </TeachingPopoverSurface>
          </ComposedOwner>
        </>
      );
    };
    stage(<App />);
    cy.get('#composed-start')
      .focus()
      .should($node =>
        expect(getTabster($node[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement()).to.equal($node[0]),
      )
      .realClick();
    settled();
    surface().should('have.attr', 'role', 'dialog');
    cy.realPress('Escape');
    surface().should('not.exist');
    cy.document().should(document => expect(document.activeElement).to.equal(document.body));
  });
  scenario(3, 'merged native trigger and surface refs clear on portal closure and owner unmount', () => {
    const triggerRef = React.createRef<HTMLButtonElement>();
    const surfaceRef = React.createRef<HTMLDivElement>();
    harness({ composed: true, triggerRef, surfaceRef });
    open();
    cy.then(() => {
      expect(triggerRef.current?.id).to.equal('teaching-trigger');
      expect(surfaceRef.current?.id).to.equal('teaching-surface');
    });
    close();
    cy.then(() => {
      expect(surfaceRef.current).to.equal(null);
      expect(triggerRef.current?.isConnected).to.equal(true);
    });
    cy.get('#unmount').realClick();
    cy.then(() => expect(triggerRef.current).to.equal(null));
    cy.get('#after').realClick();
    cy.realPress('Escape');
    cy.then(() => expect(events).to.have.length(2));
  });
  scenario(3, 'open owner unmount removes actual portal and leaves no outside click or Escape handler', () => {
    harness();
    open();
    settled();
    cy.get('#unmount').realClick();
    surface().should('not.exist');
    trigger().should('not.exist');
    cy.then(() => {
      expect(events).to.have.length(2);
    });
    cy.get('#after').realClick();
    cy.realPress('Escape');
    cy.then(() => expect(events).to.have.length(2));
  });
  scenario(3, 'surface motion finish reports actual enter and exit phases with null source event', () => {
    const motion = cy.stub();
    harness({ owner: { surfaceMotion: { onMotionFinish: motion } } });
    open();
    cy.wrap(motion).should('have.been.calledOnce');
    cy.then(() => expect(motion.firstCall.args).to.deep.equal([null, { direction: 'enter' }]));
    close();
    cy.wrap(motion).should('have.been.calledTwice');
    cy.then(() => expect(motion.lastCall.args).to.deep.equal([null, { direction: 'exit' }]));
  });
  scenario(3, 'long teaching content scrolls natively inside without closeOnScroll dismissal', () => {
    harness({
      owner: { closeOnScroll: true },
      surface: { style: { maxHeight: 300, overflowY: 'auto' }, tabIndex: -1 },
      content: (
        <>
          <p style={{ height: 600 }}>Long lesson content</p>
          <button id="long-action">End of lesson</button>
        </>
      ),
    });
    open();
    surface().realHover().realMouseWheel({ deltaY: 300 });
    surface().should($node => expect($node[0].scrollTop).to.be.greaterThan(0));
    trigger().should('have.attr', 'aria-expanded', 'true');
    close();
  });
  for (const closeOnIframeFocus of [true, false]) {
    scenario(
      3,
      `outside iframe focus ${closeOnIframeFocus ? 'enabled' : 'opted out'} follows inherited owner contract`,
      () => {
        stage(
          <>
            <iframe
              id="outside-frame"
              title="Outside lesson"
              srcDoc="<html lang='en'><head><title>Outside lesson</title></head><body><main aria-label='Outside lesson'><h1 style='font-size:14px;margin:0'>Outside lesson</h1><button style='width:100%;height:100px'>Frame action</button></main></body></html>"
              style={{ position: 'fixed', right: 16, bottom: 16, width: 140, height: 140 }}
            />
            <Harness owner={{ closeOnIframeFocus, trapFocus: false }} />
          </>,
        );
        cy.get('#outside-frame').should($frame =>
          expect(($frame[0] as HTMLIFrameElement).contentDocument?.querySelector('button')).not.to.equal(null),
        );
        cy.readFile<string>('..\\..\\..\\..\\node_modules\\axe-core\\axe.min.js').then(source => {
          cy.window().then(window => {
            (window as AuditWindow).eval(source);
            const frame = window.document.querySelector<HTMLIFrameElement>('#outside-frame');
            if (!frame?.contentWindow) {
              throw new Error('Expected real loaded same-origin frame');
            }
            (frame.contentWindow as AuditWindow).eval(source);
          });
        });
        open();
        cy.get('#outside-frame').realClick();
        if (closeOnIframeFocus) {
          surface().should('not.exist');
        } else {
          surface().should('exist');
          cy.get('#lesson-one').focus();
          close();
        }
      },
    );
  }
  scenario(3, 'context owner closes on native outside wheel without explicit closeOnScroll', () => {
    stage(
      <>
        <div
          id="scroll-area"
          role="region"
          aria-label="Outside scroll"
          tabIndex={0}
          style={{ position: 'fixed', right: 16, bottom: 16, width: 100, height: 100, overflow: 'auto' }}
        >
          <div style={{ height: 1000 }}>Scroll content</div>
        </div>
        <Harness owner={{ openOnContext: true, trapFocus: false }} />
      </>,
    );
    observedFocus();
    trigger().realClick({ button: 'right' });
    settled();
    cy.get('#scroll-area').realHover().realMouseWheel({ deltaY: 100 });
    surface().should('not.exist');
  });
});
