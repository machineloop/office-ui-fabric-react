import * as React from 'react';
import * as axe from 'axe-core';
import { getTabster } from 'tabster';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
// nx-ignore-next-line
import type { SlotRenderFunction } from '@fluentui/react-components';
// nx-ignore-next-line
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  RendererProvider,
  createDOMRenderer,
} from '@fluentui/react-components';
import {
  TeachingPopoverSurface,
  teachingPopoverSurfaceClassNames,
  TeachingPopoverBody,
  TeachingPopoverHeader,
  TeachingPopoverTitle,
  TeachingPopoverFooter,
  TeachingPopover,
  TeachingPopoverTrigger,
} from '../../../index';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Runtime identity of the actual public facade.
import * as PublicAPI from '@fluentui/react-teaching-popover';
import * as SurfaceModule from '../index';
// eslint-disable-next-line @fluentui/no-restricted-imports -- The actual inherited custom style provider.
import { CustomStyleHooksProvider_unstable } from '@fluentui/react-shared-contexts';
import { Harness, ComposedSurface, ContextConsumer } from './fixtures.stories';
import type { HarnessProps, EventRecord, OpenEvent } from './fixtures.stories';
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
const evidence = `src/components/TeachingPopoverSurface/.evidence/audits-${Date.now()}-${Cypress._.random(
  100000,
  999999,
)}`;
const titles: string[] = [];
let registering = true;
let ordinal = 0;
let finalAuditStarted = false;
let auditAcquisitionUnfinished = false;
let records: EventRecord[] = [];
let originals: OpenEvent[] = [];
let nativeCommands: Array<{ command: string; args: unknown }> = [];
let finalProfile: Profile = 'clean';
type Profile = 'clean' | 'unnamed' | 'image' | 'frame' | 'modal' | 'stable-basic' | 'stable-carousel' | 'stable-text';
type AuditWindow = Window & typeof globalThis & { axe: typeof axe };
function scenario(level: number, title: string, body: () => void) {
  if (!registering) {
    throw new Error('All scenarios must register synchronously, never inside a running case');
  }
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
      <main id="row140-stage" style={{ minHeight: 650, width: 950, padding: 24 }}>
        {children}
      </main>
    </FluentProvider>,
    { strict: false },
  );
}
function harness(props: HarnessProps = {}, dark = false, rtl = false) {
  return stage(
    <Harness
      {...props}
      onRecord={(record, event) => {
        records.push(record);
        originals.push(event);
      }}
    />,
    dark,
    rtl,
  );
}
const surface = () => cy.get('.fui-TeachingPopoverSurface', { includeShadowDom: true });
const trigger = () => cy.get('#row140-stage [aria-expanded]');
function settled() {
  return surface()
    .should('be.visible')
    .should($node =>
      expect(
        $node[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
      ).to.have.length(0),
    );
}
function open() {
  trigger()
    .focus()
    .should($node =>
      expect(getTabster($node[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement()).to.equal($node[0]),
    )
    .realClick();
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
function standalone(props: React.ComponentProps<typeof TeachingPopoverSurface> & { 'data-testid'?: string } = {}) {
  return stage(
    <>
      <p style={{ position: 'fixed', bottom: 16, left: 16 }}>Standalone exposed stage</p>
      <TeachingPopoverSurface id="surface" aria-label="Standalone lesson" {...props}>
        {props.children ?? <p>Standalone content</p>}
      </TeachingPopoverSurface>
    </>,
  );
}
function shape(rules: axe.Result[]) {
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
function expected(profile: Profile) {
  const stable = profile.startsWith('stable-');
  const targets =
    profile === 'modal'
      ? [['#surface > i:nth-child(1)'], ['#surface > i:nth-child(4)']]
      : profile === 'stable-carousel'
      ? [
          ['.fui-PopoverSurface > i:nth-child(1)'],
          ['.fui-TeachingPopoverCarouselNav > i:nth-child(1)'],
          ['.fui-TeachingPopoverCarouselNav > i:nth-child(5)'],
          ['.fui-PopoverSurface > i:nth-child(5)'],
        ]
      : [['.fui-PopoverSurface > i:nth-child(1)'], [profile === 'stable-basic' ? 'i:nth-child(6)' : 'i:nth-child(5)']];
  return {
    violations:
      profile === 'unnamed' || stable
        ? [
            {
              id: 'aria-dialog-name',
              impact: 'serious',
              nodes: [
                {
                  target: [stable ? '.fui-PopoverSurface' : '#surface'],
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
          ]
        : profile === 'image'
        ? [
            {
              id: 'image-alt',
              impact: 'critical',
              nodes: [
                {
                  target: ['#unnamed-image'],
                  impact: 'critical',
                  anyChecks: ['has-alt', 'aria-label', 'aria-labelledby', 'non-empty-title', 'presentational-role'].map(
                    id => ({
                      id,
                      data: id === 'non-empty-title' ? { messageKey: 'noAttr' } : null,
                      impact: 'critical',
                    }),
                  ),
                  all: [],
                  none: [],
                },
              ],
            },
          ]
        : profile === 'frame'
        ? [
            {
              id: 'aria-hidden-focus',
              impact: 'serious',
              nodes: [
                ['#inside-frame', 'i:nth-child(1)'],
                ['#inside-frame', 'i:nth-child(3)'],
              ].map(target => ({
                target,
                impact: 'serious',
                anyChecks: [],
                none: [],
                all: [{ id: 'focusable-not-tabbable', data: null, impact: 'serious' }],
              })),
            },
          ]
        : [],
    incomplete:
      profile === 'modal' || stable
        ? [
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
          ]
        : [],
  };
}
const modalTargets = ['#surface > i:nth-child(1)', '#surface > i:nth-child(4)'];
function waitForNativePlacement(
  placements: ReadonlyArray<{ sentinel: HTMLElement }>,
  verifyRetained: () => void,
  label: string,
) {
  verifyRetained();
  return cy.wrap(placements).should(() => {
    verifyRetained();
    for (const { sentinel } of placements) {
      expect(sentinel.style.top, `${label} vertical placement is initialized`).to.equal('0px');
      expect(sentinel.style.left, `${label} horizontal placement is initialized`).to.equal('0px');
    }
  });
}
function modalPlacementReady() {
  return surface().then($surface => {
    expect($surface, 'one active native modal Surface').to.have.length(1);
    const surfaceRoot = $surface[0];
    expect(surfaceRoot.id, 'active modal retains the original caller Surface ID').to.equal('surface');
    const ownerDocument = surfaceRoot.ownerDocument;
    function requiredSentinel(value: HTMLElement | null): asserts value is HTMLElement {
      expect(value, 'required native Modalizer sentinel').not.to.equal(null);
    }
    const placements = modalTargets.map((staticSelector, index) => {
      const nativeSelector = `#${surfaceRoot.id} > i:nth-child(${index === 0 ? 1 : 4})`;
      const nativeNodes = ownerDocument.querySelectorAll<HTMLElement>(nativeSelector);
      const staticNodes = ownerDocument.querySelectorAll<HTMLElement>(staticSelector);
      expect(nativeNodes, 'native modal selector is globally unique').to.have.length(1);
      expect(staticNodes, 'static modal selector is globally unique').to.have.length(1);
      const sentinel = nativeNodes.item(0);
      requiredSentinel(sentinel);
      expect(sentinel, 'native and static selectors capture the same sentinel').to.equal(staticNodes.item(0));
      return { sentinel, nativeSelector, staticSelector, index };
    });
    function retainedPair() {
      const currentRoots = ownerDocument.querySelectorAll('#surface');
      expect(currentRoots, 'captured modal Surface remains unique').to.have.length(1);
      expect(currentRoots.item(0), 'the original modal Surface remains active').to.equal(surfaceRoot);
      expect(surfaceRoot.isConnected, 'captured modal Surface remains connected').to.equal(true);
      for (const { sentinel, nativeSelector, staticSelector, index } of placements) {
        const nativeNodes = ownerDocument.querySelectorAll(nativeSelector);
        const staticNodes = ownerDocument.querySelectorAll(staticSelector);
        expect(nativeNodes, 'retained native modal selector remains unique').to.have.length(1);
        expect(staticNodes, 'retained static modal selector remains unique').to.have.length(1);
        expect(nativeNodes.item(0), 'native selector retains the original sentinel').to.equal(sentinel);
        expect(staticNodes.item(0), 'static selector retains the original sentinel').to.equal(sentinel);
        expect(sentinel.isConnected, 'captured native sentinel remains connected').to.equal(true);
        expect(sentinel.ownerDocument).to.equal(ownerDocument);
        expect(sentinel.parentElement).to.equal(surfaceRoot);
        expect(sentinel.tagName).to.equal('I');
        expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
          `isFirst=${index === 0}, isOutside=false, (Modalizer, tabbable=true)`,
        );
        expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
        expect(sentinel.getAttribute('tabindex')).to.equal('0');
        expect(sentinel.getAttribute('role')).to.equal('none');
        expect(sentinel.childNodes).to.have.length(0);
        expect(sentinel.style.position).to.equal('fixed');
      }
    }
    return waitForNativePlacement(placements, retainedPair, 'no-scroll modal dummy');
  });
}
function stablePlacementReady(profile: 'stable-basic' | 'stable-carousel' | 'stable-text') {
  const targets = expected(profile).incomplete[0].nodes.map(node => {
    expect(node.target, 'one static stable sentinel selector').to.have.length(1);
    return String(node.target[0]);
  });
  return surface()
    .should($surface => {
      expect($surface, 'one original stable Surface').to.have.length(1);
      for (const selector of targets) {
        expect($surface[0].ownerDocument.querySelectorAll(selector), `${selector} is globally unique`).to.have.length(
          1,
        );
      }
    })
    .then($surface => {
      const surfaceRoot = $surface[0];
      const document = surfaceRoot.ownerDocument;
      const placements = targets.map(selector => {
        const sentinel = document.querySelector<HTMLElement>(selector);
        if (!sentinel) throw new Error(`Missing required stable sentinel ${selector}`);
        return {
          sentinel,
          selector,
          parent: sentinel.parentElement,
          mover: selector.startsWith('.fui-TeachingPopoverCarouselNav'),
          first: selector.includes('nth-child(1)'),
        };
      });
      const verifyRetained = () => {
        const roots = document.querySelectorAll('.fui-TeachingPopoverSurface');
        expect(roots, 'original stable Surface remains unique').to.have.length(1);
        expect(roots[0]).to.equal(surfaceRoot);
        expect(surfaceRoot.isConnected).to.equal(true);
        for (const { sentinel, selector, parent, mover, first } of placements) {
          const matches = document.querySelectorAll(selector);
          expect(matches, 'static selector retains one native sentinel').to.have.length(1);
          expect(matches[0], 'static selector retains the captured native sentinel').to.equal(sentinel);
          expect(sentinel.isConnected).to.equal(true);
          expect(sentinel.ownerDocument).to.equal(document);
          expect(sentinel.parentElement).to.equal(parent);
          expect(sentinel.closest('.fui-TeachingPopoverSurface')).to.equal(surfaceRoot);
          if (mover) {
            expect(parent?.classList.contains('fui-TeachingPopoverCarouselNav')).to.equal(true);
          } else {
            expect(parent).to.equal(surfaceRoot);
          }
          expect(sentinel.tagName).to.equal('I');
          expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
            `isFirst=${first}, isOutside=false, (${mover ? 'Mover' : 'Modalizer'}, tabbable=true)`,
          );
          expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
          expect(sentinel.getAttribute('tabindex')).to.equal('0');
          expect(sentinel.getAttribute('role')).to.equal('none');
          expect(sentinel.childNodes).to.have.length(0);
          expect(sentinel.style.position).to.equal('fixed');
        }
      };
      return waitForNativePlacement(placements, verifyRetained, 'stable native dummy');
    });
}
function iframeRootPlacementReady() {
  return cy.get<HTMLIFrameElement>('#inside-frame').then($frame => {
    expect($frame, 'one original native iframe').to.have.length(1);
    const frame = $frame[0];
    function requiredValue<T>(value: T | null, message: string): asserts value is T {
      expect(value, message).not.to.equal(null);
    }
    const currentDocument = frame.contentDocument;
    const currentWindow = frame.contentWindow;
    requiredValue(currentDocument, 'original iframe child document exists');
    requiredValue(currentWindow, 'original iframe child window exists');
    const childDocument = currentDocument;
    const childWindow = currentWindow;
    const bodyRoot = childDocument.body;
    requiredValue(bodyRoot, 'original child body Root exists');
    const placements = expected('frame').violations[0].nodes.map((node, index) => {
      const nativeSelector = String(node.target[1]);
      const staticSelector = index === 0 ? 'body > i:first-child' : 'body > i:last-child';
      const nativeNodes = childDocument.querySelectorAll<HTMLElement>(nativeSelector);
      const staticNodes = childDocument.querySelectorAll<HTMLElement>(staticSelector);
      expect(nativeNodes, 'child native Root selector is unique').to.have.length(1);
      expect(staticNodes, 'direct-body static Root selector is unique').to.have.length(1);
      const sentinel = nativeNodes.item(0);
      requiredValue(sentinel, 'required native child Root sentinel');
      expect(sentinel, 'native and static child selectors identify the same sentinel').to.equal(staticNodes.item(0));
      return { sentinel, nativeSelector, staticSelector, index };
    });
    function retainedPair() {
      expect(frame.isConnected, 'original iframe remains connected').to.equal(true);
      expect(frame.contentDocument, 'original child document is retained').to.equal(childDocument);
      expect(frame.contentWindow, 'original child window is retained').to.equal(childWindow);
      expect(childDocument.defaultView).to.equal(childWindow);
      expect(childDocument.body, 'original body Root is retained').to.equal(bodyRoot);
      expect(bodyRoot.isConnected, 'original child Root remains connected').to.equal(true);
      expect(bodyRoot.ownerDocument).to.equal(childDocument);
      expect(bodyRoot.parentElement).to.equal(childDocument.documentElement);
      expect(bodyRoot.tagName).to.equal('BODY');
      expect(bodyRoot.getAttribute('data-tabster'), 'plain child autoRoot registration').to.equal('{"root":{}}');
      for (const { sentinel, nativeSelector, staticSelector, index } of placements) {
        const nativeNodes = childDocument.querySelectorAll(nativeSelector);
        const staticNodes = childDocument.querySelectorAll(staticSelector);
        expect(nativeNodes, 'retained child native Root selector remains unique').to.have.length(1);
        expect(staticNodes, 'retained direct-body Root selector remains unique').to.have.length(1);
        expect(nativeNodes.item(0), 'child native selector retains the original sentinel').to.equal(sentinel);
        expect(staticNodes.item(0), 'child static selector retains the original sentinel').to.equal(sentinel);
        expect(sentinel.isConnected, 'original child sentinel remains connected').to.equal(true);
        expect(sentinel.ownerDocument).to.equal(childDocument);
        expect(sentinel.parentElement).to.equal(bodyRoot);
        expect(sentinel.tagName).to.equal('I');
        expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
          `isFirst=${index === 0}, isOutside=false, (Root, tabbable=true)`,
        );
        expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
        expect(sentinel.getAttribute('tabindex')).to.equal('0');
        expect(sentinel.getAttribute('role')).to.equal('none');
        expect(sentinel.childNodes).to.have.length(0);
        expect(sentinel.style.position).to.equal('fixed');
      }
    }
    return waitForNativePlacement(placements, retainedPair, 'plain child body Root');
  });
}
function semanticModalShape(
  document: Document,
  actualShape: { violations: ReturnType<typeof shape>; incomplete: ReturnType<typeof shape> },
  profile: Profile,
  scenarioTitle: string,
  phase: string,
) {
  const semanticShape = Cypress._.cloneDeep(actualShape);
  const selectorProofs: Array<{
    rawTarget: string[];
    staticTarget: string[];
    rawCount: number;
    staticCount: number;
    sameElement: boolean;
    html: string;
  }> = [];
  if (profile === 'modal') {
    expect(
      [
        [
          'default modal exposes the actual open sentinel checkpoint and restores observed focus after close',
          'open-modal',
        ],
        [
          'controlled modal refusal retains actual open dialog checkpoint before external closure',
          'controlled-refused-modal',
        ],
      ].some(([title, checkpoint]) => title === scenarioTitle && checkpoint === phase),
      'static modal scenario/checkpoint pair',
    ).to.equal(true);
    expect(actualShape.violations).to.deep.equal([]);
    expect(actualShape.incomplete).to.have.length(1);
    expect(actualShape.incomplete[0].id).to.equal('aria-hidden-focus');
    expect(actualShape.incomplete[0].nodes).to.have.length(2);
    const roots = document.querySelectorAll('#surface');
    expect(roots).to.have.length(1);
    expect(roots[0].classList.contains('fui-TeachingPopoverSurface')).to.equal(true);
    expect(roots[0].getAttribute('role')).to.equal('dialog');
    expect(roots[0].getAttribute('aria-modal')).to.equal('true');
    for (const [index, staticSelector] of modalTargets.entries()) {
      const node = actualShape.incomplete[0].nodes[index];
      expect(node.target).to.have.length(1);
      expect(node.target[0], `known modal selector alias must identify ${staticSelector}`).to.be.oneOf([
        staticSelector,
        `i:nth-child(${index === 0 ? 1 : 4})`,
      ]);
      const rawNodes = document.querySelectorAll(String(node.target[0]));
      const staticNodes = document.querySelectorAll(staticSelector);
      expect(rawNodes, 'raw selector is globally unique').to.have.length(1);
      expect(staticNodes, 'independent static selector is globally unique').to.have.length(1);
      expect(rawNodes[0], 'both selectors identify the same live sentinel').to.equal(staticNodes[0]);
      const sentinel = staticNodes[0];
      expect(sentinel.parentElement).to.equal(roots[0]);
      expect(sentinel.tagName).to.equal('I');
      expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
        `isFirst=${index === 0}, isOutside=false, (Modalizer, tabbable=true)`,
      );
      expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
      expect(sentinel.getAttribute('tabindex')).to.equal('0');
      expect(sentinel.getAttribute('role')).to.equal('none');
      expect(sentinel.childNodes).to.have.length(0);
      selectorProofs.push({
        rawTarget: [...node.target].map(String),
        staticTarget: [staticSelector],
        rawCount: rawNodes.length,
        staticCount: staticNodes.length,
        sameElement: rawNodes[0] === staticNodes[0],
        html: sentinel.outerHTML,
      });
      semanticShape.incomplete[0].nodes[index].target = [staticSelector];
    }
  }
  expect(semanticShape).to.deep.equal(expected(profile));
  return { semanticShape, selectorProofs };
}
function audit(phase = 'final', profile: Profile = finalProfile, failedCaseDiagnostic = false) {
  const subject = cy.get('#row140-stage');
  if (!failedCaseDiagnostic) {
    subject
      .should('be.visible')
      .and('not.be.empty')
      .should($stage => {
        if (profile !== 'modal' && !profile.startsWith('stable-')) {
          expect($stage[0].closest('[aria-hidden="true"]'), 'actual closed-stage restoration').to.equal(null);
          expect(
            Array.from($stage[0].querySelectorAll('button, a, input, select, textarea')).filter(node =>
              node.closest('[aria-hidden="true"]'),
            ),
            'all closed-stage controls are independently exposed',
          ).to.have.length(0);
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
      expect(
        roots.some(node => !node.closest('[aria-hidden="true"]')),
        'a real exposed audit root',
      ).to.equal(true);
    }
    const auditor = document.querySelector('iframe') ? (document.defaultView as AuditWindow).axe : axe;
    if (!auditor) {
      throw new Error('Actual iframe audits require the raw independent browser axe engine');
    }
    auditAcquisitionUnfinished = true;
    if (phase === 'final') {
      finalAuditStarted = true;
    }
    return auditor.run(roots).then(fullResults => {
      const actualShape = { violations: shape(fullResults.violations), incomplete: shape(fullResults.incomplete) };
      const expectedShape = expected(profile);
      const auditFile = `${evidence}/audit-${++ordinal}.json`;
      const rawRecord = {
        scenario: Cypress.currentTest.title,
        phase,
        profile,
        round,
        retries: Cypress.currentRetry,
        fullResults,
        actualShape,
        expectedShape,
        classified: false,
        failedCaseDiagnostic,
        events: records,
        nativeCommands,
        auditedRoots: roots.map(node => ({
          tag: node.tagName,
          id: node.id,
          role: node.getAttribute('role'),
          exposed: !node.closest('[aria-hidden="true"]'),
        })),
      };
      cy.writeFile(auditFile, rawRecord).then(() => {
        auditAcquisitionUnfinished = false;
        if (failedCaseDiagnostic) {
          return;
        }
        const { semanticShape, selectorProofs } = semanticModalShape(
          document,
          actualShape,
          profile,
          Cypress.currentTest.title,
          phase,
        );
        cy.writeFile(auditFile, {
          ...rawRecord,
          semanticShape,
          selectorProofs,
          modalSelectorDocument: profile === 'modal' ? document.documentElement.outerHTML : null,
          classified: Cypress._.isEqual(semanticShape, expectedShape),
        });
        expect(fullResults.passes.length).to.be.greaterThan(0);
        if (document.querySelector('iframe')) {
          expect(
            fullResults.passes.some(rule => rule.nodes.some(node => node.target.length > 1)),
            'raw engine traversed actual frame descendants, not just the iframe element',
          ).to.equal(true);
        }
        if (document.querySelector('#shadow-host')?.shadowRoot?.querySelector('.fui-TeachingPopoverSurface')) {
          expect(
            fullResults.passes.some(rule =>
              rule.nodes.some(node => JSON.stringify(node.target).includes('shadow-host')),
            ),
            'full rules traversed actual shadow descendants',
          ).to.equal(true);
        }
        expect(semanticShape).to.deep.equal(expectedShape);
        expect(Cypress.currentRetry).to.equal(0);
        if (profile !== 'clean') {
          if (profile === 'image') {
            expect(Cypress.currentTest.title).to.equal(
              'unnamed native image retains its exact critical alternative-text finding and classifier guards',
            );
            expect(document.querySelector('#unnamed-image')?.hasAttribute('alt')).to.equal(false);
          } else if (profile === 'frame') {
            expect(Cypress.currentTest.title).to.equal(
              'supported iframe document portal uses native root refs real CDP child input and raw full frame audits',
            );
            expect(phase).to.be.oneOf(['iframe-surface-open', 'final']);
            const frame = document.querySelector<HTMLIFrameElement>('#inside-frame');
            if (!frame?.contentDocument) {
              throw new Error('Expected actual frame document');
            }
            for (const node of fullResults.violations[0].nodes) {
              const sentinel = frame.contentDocument.querySelector<HTMLElement>(String(node.target[1]));
              expect(sentinel?.tagName).to.equal('I');
              expect(sentinel?.getAttribute('aria-hidden')).to.equal('true');
              expect(sentinel?.getAttribute('tabindex')).to.equal('0');
              expect(sentinel?.getAttribute('role')).to.equal('none');
              expect(sentinel?.getAttribute('data-tabster-dummy')).to.match(
                /^isFirst=(true|false), isOutside=false, \(Root, tabbable=true\)$/,
              );
              expect(sentinel?.childElementCount).to.equal(0);
              expect(sentinel?.textContent).to.equal('');
              expect(sentinel?.outerHTML).to.equal(node.html);
              expect(node.all[0].relatedNodes).to.have.length(1);
              expect(node.all[0].relatedNodes![0].target).to.deep.equal(node.target);
              expect(node.all[0].relatedNodes![0].html).to.equal(node.html);
            }
          } else if (profile === 'unnamed') {
            expect(Cypress.currentTest.title).to.equal(
              'explicit unnamed standalone dialog retains the exact known serious naming violation',
            );
            expect(computeAccessibleName(document.querySelector('#surface')!)).to.equal('');
          } else {
            if (profile === 'modal') {
              expect(Cypress.currentTest.title).to.be.oneOf([
                'default modal exposes the actual open sentinel checkpoint and restores observed focus after close',
                'controlled modal refusal retains actual open dialog checkpoint before external closure',
              ]);
              expect(phase).to.be.oneOf(['open-modal', 'controlled-refused-modal']);
            } else {
              expect(Cypress.currentTest.title).to.match(
                /^stable (Default|AppearanceBrand|Carousel|CarouselBrand|CarouselText) /,
              );
              expect(phase).to.equal('stable-open');
              expect(computeAccessibleName(document.querySelector('.fui-TeachingPopoverSurface')!)).to.equal('');
            }
            for (const node of fullResults.incomplete[0].nodes) {
              const sentinel = document.querySelector<HTMLElement>(String(node.target[0]));
              expect(sentinel?.tagName).to.equal('I');
              expect(sentinel?.getAttribute('aria-hidden')).to.equal('true');
              expect(sentinel?.getAttribute('tabindex')).to.equal('0');
              expect(sentinel?.getAttribute('role')).to.equal('none');
              expect(sentinel?.getAttribute('data-tabster-dummy')).to.match(
                String(node.target[0]).startsWith('.fui-TeachingPopoverCarouselNav')
                  ? /^isFirst=(true|false), isOutside=false, \(Mover, tabbable=true\)$/
                  : /^isFirst=(true|false), isOutside=false, \(Modalizer, tabbable=true\)$/,
              );
              expect(sentinel?.childElementCount).to.equal(0);
              expect(sentinel?.textContent).to.equal('');
              expect(sentinel?.outerHTML).to.equal(node.html);
              expect(sentinel?.closest('.fui-TeachingPopoverSurface')).not.to.equal(null);
              expect(node.all[0].relatedNodes).to.have.length(1);
              expect(node.all[0].relatedNodes![0].target).to.deep.equal(node.target);
              expect(node.all[0].relatedNodes![0].html).to.equal(node.html);
            }
          }
          const guards = [
            'unknown-rule',
            'duplicate-rule',
            'duplicate-node',
            'unknown-check',
            'wrong-target',
            'wrong-impact',
          ];
          for (const guard of guards) {
            const bad = Cypress._.cloneDeep(actualShape);
            const negative = profile === 'unnamed' || profile === 'image' || profile === 'frame';
            const rules = negative ? bad.violations : bad.incomplete;
            if (guard === 'unknown-rule') {
              rules[0].id = 'unknown';
            }
            if (guard === 'duplicate-rule') {
              rules.push(rules[0]);
            }
            if (guard === 'duplicate-node') {
              rules[0].nodes.push(rules[0].nodes[0]);
            }
            if (guard === 'unknown-check') {
              (negative && profile !== 'frame' ? rules[0].nodes[0].anyChecks : rules[0].nodes[0].all)[0].id = 'unknown';
            }
            if (guard === 'wrong-target') {
              rules[0].nodes[0].target = ['#wrong'];
            }
            if (guard === 'wrong-impact') {
              rules[0].impact = negative && profile === 'image' ? 'serious' : 'critical';
            }
            expect(() => semanticModalShape(document, bad, profile, Cypress.currentTest.title, phase)).to.throw();
          }
          const selectorGuards: string[] = [];
          if (profile === 'modal') {
            const fixture = document.implementation.createHTMLDocument('Modal selector guards');
            fixture.body.append(document.querySelector('#surface')!.cloneNode(true));
            const aliasShape = Cypress._.cloneDeep(actualShape);
            aliasShape.incomplete[0].nodes.forEach((node, index) => {
              node.target = [`i:nth-child(${index === 0 ? 1 : 4})`];
            });
            semanticModalShape(fixture, aliasShape, profile, Cypress.currentTest.title, phase);
            for (const guard of [
              'unknown-selector',
              'wrong-element',
              'duplicate-selector',
              'absent-selector',
              'wrong-context',
              'wrong-marker',
            ]) {
              const badDocument = document.implementation.createHTMLDocument('Negative modal selector guard');
              badDocument.body.append(fixture.querySelector('#surface')!.cloneNode(true));
              const bad = Cypress._.cloneDeep(aliasShape);
              if (guard === 'unknown-selector') {
                bad.incomplete[0].nodes[1].target = ['#surface i:last-child'];
              } else if (guard === 'wrong-element') {
                bad.incomplete[0].nodes[1].target = ['i:nth-child(1)'];
              } else if (guard === 'duplicate-selector') {
                const duplicate = badDocument.createElement('div');
                duplicate.append(badDocument.querySelector(modalTargets[0])!.cloneNode(true));
                badDocument.body.append(duplicate);
              } else if (guard === 'absent-selector') {
                badDocument.querySelector(modalTargets[1])!.remove();
              } else if (guard === 'wrong-marker') {
                badDocument.querySelector(modalTargets[1])!.setAttribute('data-tabster-dummy', 'unknown');
              }
              expect(() =>
                semanticModalShape(
                  badDocument,
                  bad,
                  profile,
                  Cypress.currentTest.title,
                  guard === 'wrong-context' ? 'final' : phase,
                ),
              ).to.throw();
              selectorGuards.push(guard);
            }
          }
          cy.writeFile(`${evidence}/classifier-guards-${ordinal}.json`, {
            scenario: Cypress.currentTest.title,
            rejected: guards,
            selectorRejected: selectorGuards,
          });
        }
      });
    });
  });
}

describe('row140 TeachingPopoverSurface', { retries: 0 }, () => {
  before(() => {
    expect(React.version).to.equal('19.2.0');
    expect(new Set(titles).size).to.equal(titles.length);
    expect(titles.length).to.equal([23, 62, 90][round - 1]);
    cy.writeFile(`${evidence}/manifest.json`, { round, titles, expectedCount: titles.length, retries: 0 });
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
    records = [];
    originals = [];
    nativeCommands = [];
    finalProfile = 'clean';
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
        return audit('final', finalProfile, true);
      }
    });
  });

  scenario(1, 'contextless default is a portalled native div group without modal tabindex or arrow', () => {
    standalone();
    settled().should('have.prop', 'tagName', 'DIV');
    surface().should('have.attr', 'role', 'group');
    surface().should('not.have.attr', 'aria-modal');
    surface().should('not.have.attr', 'tabindex');
    surface().should($node => {
      expect($node[0].closest('#row140-stage')).to.equal(null);
      expect($node[0].parentElement?.getAttribute('data-portal-node')).to.equal('true');
      expect($node[0].children).to.have.length(1);
    });
  });
  scenario(1, 'both public static classes and caller class survive the inherited styling merge', () => {
    standalone({ className: 'caller-surface' });
    surface()
      .should('have.class', teachingPopoverSurfaceClassNames.root)
      .and('have.class', 'fui-PopoverSurface')
      .and('have.class', 'caller-surface');
  });
  scenario(1, 'explicit ARIA label is the accessible name and native title remains independent metadata', () => {
    standalone({ 'aria-label': 'Explicit lesson', title: 'Native surface title' });
    surface()
      .should('have.attr', 'title', 'Native surface title')
      .should($node => expect(computeAccessibleName($node[0])).to.equal('Explicit lesson'));
  });
  scenario(1, 'labelledby takes precedence over label and describedby resolves actual rendered text', () => {
    standalone({
      'aria-label': 'Fallback',
      'aria-labelledby': 'standalone-title',
      'aria-describedby': 'standalone-description',
      children: (
        <>
          <h2 id="standalone-title">Rendered title</h2>
          <p id="standalone-description">Rendered description</p>
        </>
      ),
    });
    surface().should($node => {
      expect(computeAccessibleName($node[0])).to.equal('Rendered title');
      expect(computeAccessibleDescription($node[0])).to.equal('Rendered description');
    });
    settled();
    cy.get('#standalone-title')
      .should('be.visible')
      .should($heading => {
        expect($heading[0].closest('[aria-hidden="true"]'), 'audited rendered heading is exposed').to.equal(null);
        expect($heading[0].closest('[inert]')).to.equal(null);
      });
  });
  scenario(1, 'native language direction hidden-false and data metadata pass through without owner props', () => {
    standalone({ lang: 'en', dir: 'rtl', hidden: false, 'data-testid': 'surface-metadata' });
    surface()
      .should('have.attr', 'lang', 'en')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-testid', 'surface-metadata')
      .and('not.have.attr', 'hidden');
  });
  scenario(1, 'native explicit positive tabindex participates in real keyboard focus', () => {
    standalone({ tabIndex: 0, children: <button id="inside">Inside action</button> });
    surface().focus().should('have.focus');
    cy.realPress('Tab');
    cy.get('#inside').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    surface().should('have.focus');
  });
  scenario(1, 'native negative tabindex is programmatically focusable without changing group role', () => {
    standalone({ tabIndex: -1 });
    surface().focus().should('have.focus').and('have.attr', 'role', 'group').and('have.attr', 'tabindex', '-1');
  });
  scenario(1, 'contextless Escape uses the fallback content ref and prevents the genuine event without closing', () => {
    const key = cy.stub();
    standalone({ tabIndex: 0, onKeyDown: key });
    surface().focus();
    cy.realPress('Escape');
    cy.wrap(key).should('have.been.calledOnce');
    cy.then(() => {
      const event = key.firstCall.args[0] as React.KeyboardEvent;
      expect(event.key).to.equal('Escape');
      expect(event.nativeEvent.isTrusted).to.equal(true);
      expect(event.defaultPrevented).to.equal(true);
    });
    surface().should('exist');
  });
  scenario(1, 'contextless pointer enter leave and click preserve exact original handlers', () => {
    const enter = cy.stub();
    const leave = cy.stub();
    const click = cy.stub();
    const down = cy.stub();
    const up = cy.stub();
    standalone({ onMouseEnter: enter, onMouseLeave: leave, onClick: click, onPointerDown: down, onPointerUp: up });
    cy.get('#row140-stage > p').realHover();
    cy.then(() => {
      // Mounting a portal under the parked pointer can emit an initial enter/leave.
      for (const handler of [click, down, up]) {
        expect(handler, 'mount and outside hover must not activate the surface').not.to.have.been.called;
      }
      for (const handler of [enter, leave]) {
        handler.resetHistory();
      }
    });
    surface().realHover().realClick();
    cy.get('#row140-stage > p').realHover();
    cy.wrap(enter).should('have.been.calledOnce');
    cy.wrap(leave).should('have.been.calledOnce');
    cy.wrap(click).should('have.been.calledOnce');
    cy.wrap(down).should('have.been.calledOnce');
    cy.wrap(up).should('have.been.calledOnce');
    cy.then(() => {
      for (const handler of [enter, leave, click, down, up]) {
        expect((handler.firstCall.args[0] as React.MouseEvent).nativeEvent.isTrusted).to.equal(true);
      }
      expect((down.firstCall.args[0] as React.PointerEvent).pointerType).to.equal('mouse');
      expect((up.firstCall.args[0] as React.PointerEvent).pointerType).to.equal('mouse');
    });
  });
  scenario(1, 'children text fragments elements and null render without a fabricated wrapper slot', () => {
    standalone({
      children: (
        <>
          Leading text<span data-fragment>Fragment child</span>
          {null}
          <strong>Trailing text</strong>
        </>
      ),
    });
    surface()
      .should('have.text', 'Leading textFragment childTrailing text')
      .find('[data-fragment]')
      .should('have.prop', 'tagName', 'SPAN');
    surface().should($node => expect($node[0].children).to.have.length(2));
  });
  scenario(1, 'caller inline styles override owned padding radius minimum width and inherited colors', () => {
    standalone({
      style: {
        padding: 24,
        borderRadius: 13,
        minWidth: 350,
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(0, 0, 0)',
      },
    });
    surface()
      .should('have.css', 'padding', '24px')
      .and('have.css', 'border-radius', '13px')
      .and('have.css', 'min-width', '350px')
      .and('have.css', 'background-color', 'rgb(255, 255, 255)')
      .and('have.css', 'color', 'rgb(0, 0, 0)');
  });
  scenario(
    1,
    'source styles retain sixteen pixel padding eight pixel radius and three hundred twenty minimum width',
    () => {
      standalone();
      surface()
        .should('have.css', 'padding', '16px')
        .and('have.css', 'border-radius', '8px')
        .and('have.css', 'min-width', '320px')
        .and('have.css', 'box-sizing', 'border-box')
        .and('have.css', 'border-top-width', '1px')
        .and('have.css', 'border-top-style', 'solid');
      surface().should($node => {
        const css = getComputedStyle($node[0]);
        expect(css.filter).to.contain('drop-shadow');
        expect(css.filter).to.contain('8px 16px');
        expect($node[0].getBoundingClientRect().width).to.be.at.least(320);
      });
    },
  );
  scenario(1, 'forwarded root ref is the actual portalled div and resets on source unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    standalone({ ref });
    surface().then($node => expect(ref.current).to.equal($node[0]));
    stage(<p>Standalone unmounted explicitly</p>);
    surface().should('not.exist');
    cy.then(() => expect(ref.current).to.equal(null));
    cy.get('[data-portal-node]').should('not.exist');
  });
  scenario(1, 'callback ref attaches once to the native root and detaches with null', () => {
    const values: Array<HTMLDivElement | null> = [];
    standalone({
      ref: node => {
        values.push(node);
      },
    });
    surface().then($node => expect(values).to.deep.equal([$node[0]]));
    stage(<p>Callback ref owner unmounted</p>);
    surface().should('not.exist');
    cy.then(() => {
      expect(values).to.have.length(2);
      expect(values[1]).to.equal(null);
    });
  });
  scenario(
    1,
    'complete public hook style and renderer expose actual inherited state without adding a base hook',
    () => {
      let state: Parameters<NonNullable<HarnessProps['onState']>>[0] | undefined;
      stage(
        <>
          <p>Composed stage</p>
          <ComposedSurface
            id="surface"
            aria-label="Composed lesson"
            onState={value => {
              state = value;
            }}
          >
            Composed content
          </ComposedSurface>
        </>,
      );
      surface().should('have.text', 'Composed content').and('have.class', 'fui-TeachingPopoverSurface');
      cy.then(() => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Verify the still-exported state contract.
        expect(state?.components).to.deep.equal({ root: 'div' });
        expect(state?.size).to.equal('medium');
        expect(state?.withArrow).to.equal(undefined);
        expect(state?.inline).to.equal(false);
        expect(state?.appearance).to.equal(undefined);
        expect(state?.root.role).to.equal('group');
        expect(state?.arrowClassName).to.be.a('string');
      });
    },
  );
  scenario(1, 'owner trapFocus false supplies group semantics while default teaching arrow is present', () => {
    harness({ owner: { trapFocus: false } });
    open();
    surface().should('have.attr', 'role', 'group').and('not.have.attr', 'aria-modal');
    surface().should($node => expect($node[0].firstElementChild?.tagName).to.equal('DIV'));
    cy.get('#surface-first').should('have.focus');
    close();
  });
  scenario(1, 'source Escape closes before consumer key handler and passes the same prevented trusted event', () => {
    const order: string[] = [];
    let requested: OpenEvent | undefined;
    harness({
      owner: {
        trapFocus: false,
        onOpenChange: (event, data) => {
          if (!data.open) {
            order.push('owner');
            requested = event;
          }
        },
      },
      surface: {
        onKeyDown: event => {
          order.push('consumer');
          expect(event).to.equal(requested);
          expect(event.defaultPrevented).to.equal(true);
        },
      },
    });
    open();
    close();
    cy.then(() => {
      expect(order).to.deep.equal(['owner', 'consumer']);
      expect(records[1]).to.deep.equal({ type: 'keydown', open: false, trusted: true, prevented: true, version: 0 });
    });
  });
  scenario(1, 'consumer key handler preventDefault is too late to veto the Surface close request', () => {
    harness({ owner: { trapFocus: false }, surface: { onKeyDown: event => event.preventDefault() } });
    open();
    close();
    cy.then(() => expect(records.map(record => record.open)).to.deep.equal([true, false]));
  });
  scenario(1, 'child stopPropagation prevents Surface from receiving the otherwise prevented native Escape', () => {
    const surfaceKey = cy.stub();
    let childEvent: React.KeyboardEvent | undefined;
    harness({
      owner: { trapFocus: false },
      surface: { onKeyDown: surfaceKey },
      children: (
        <button
          id="child-cancel"
          onKeyDown={event => {
            event.preventDefault();
            event.stopPropagation();
            childEvent = event;
          }}
        >
          Child cancel
        </button>
      ),
    });
    open();
    cy.realPress('Escape');
    surface().should('exist');
    cy.then(() => expect(records).to.have.length(1));
    cy.wrap(surfaceKey).should('not.have.been.called');
    cy.then(() => {
      expect(childEvent?.nativeEvent.isTrusted).to.equal(true);
      expect(childEvent?.defaultPrevented).to.equal(true);
    });
    cy.get('#surface-title').should('exist');
    cy.get('#outside').realClick();
    surface().should('not.exist');
  });
  scenario(1, 'non Escape native keys preserve unprevented consumer events and do not close', () => {
    const keys: Array<{ key: string; prevented: boolean; trusted: boolean }> = [];
    harness({
      owner: { trapFocus: false },
      surface: {
        onKeyDown: event =>
          keys.push({ key: event.key, prevented: event.defaultPrevented, trusted: event.nativeEvent.isTrusted }),
      },
    });
    open();
    cy.realPress('ArrowDown');
    surface().should('exist');
    cy.then(() => expect(keys).to.deep.equal([{ key: 'ArrowDown', prevented: false, trusted: true }]));
    close();
  });
  scenario(1, 'controlled accept honors real Surface Escape and controlled refuse retains its current DOM', () => {
    harness({ control: 'accept', owner: { trapFocus: false } });
    open();
    close();
    harness({ control: 'refuse', initial: true, owner: { trapFocus: false } });
    settled();
    cy.realPress('Escape');
    surface().should('exist');
    cy.then(() => expect(records.at(-1)?.open).to.equal(false));
    cy.get('#external-close').realClick();
    surface().should('not.exist');
  });
  scenario(1, 'controlled refused close exposes a genuine still-open group audit before external closure', () => {
    harness({ control: 'refuse', initial: true, owner: { trapFocus: false } });
    settled();
    cy.realPress('Escape');
    settled();
    audit('controlled-refused-open');
    cy.get('#external-close').realClick();
    surface().should('not.exist');
  });
  scenario(1, 'explicit unnamed standalone dialog retains the exact known serious naming violation', () => {
    finalProfile = 'unnamed';
    standalone({ role: 'dialog', 'aria-label': undefined });
    surface().should('have.attr', 'role', 'dialog').and('not.have.attr', 'aria-modal');
  });
  scenario(2, 'Teaching owner default makes the native surface a modal dialog with first-action autofocus', () => {
    harness();
    open();
    surface().should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
    cy.get('#surface-first').should('have.focus');
    surface().should($node => {
      expect(computeAccessibleName($node[0])).to.equal('Surface lesson');
      expect(computeAccessibleDescription($node[0])).to.equal('First lesson');
    });
    close();
  });
  scenario(2, 'native explicit root tabindex changes owner autofocus to the actual surface container', () => {
    harness({ surface: { tabIndex: -1 } });
    open();
    surface().should('have.focus').and('have.attr', 'tabindex', '-1');
    close();
  });
  scenario(2, 'native role and aria-modal overrides win over inherited default trap semantics', () => {
    harness({ surface: { role: 'group', 'aria-modal': undefined } });
    open();
    surface().should('have.attr', 'role', 'group');
    surface().should('not.have.attr', 'aria-modal');
    cy.get('#surface-first').should('have.focus');
    close();
  });
  scenario(2, 'real Tab and Shift Tab wrap between actual first and last actions under default trap', () => {
    harness();
    open();
    surface().find('[data-tabster-dummy]').should('have.length', 2);
    cy.realPress(['Shift', 'Tab']);
    cy.get('#surface-last').should('have.focus');
    cy.realPress('Tab');
    cy.get('#surface-first').should('have.focus');
    cy.realPress('Tab');
    cy.get('#surface-last').should('have.focus');
    close();
  });
  scenario(2, 'trapFocus false permits native Tab to leave surface and does not fabricate a dismissal', () => {
    harness({ owner: { trapFocus: false } });
    open();
    cy.realPress('Tab');
    cy.get('#surface-last').should('have.focus');
    cy.realPress('Tab');
    surface()
      .should('exist')
      .should($node => expect($node[0].contains($node[0].ownerDocument.activeElement)).to.equal(false));
    cy.then(() => expect(records).to.have.length(1));
    cy.get('#surface-first').focus();
    close();
  });
  scenario(2, 'inertTrapFocus true preserves owner modal data without adding the native inert attribute', () => {
    harness({ owner: { inertTrapFocus: true } });
    open();
    surface().should('have.attr', 'role', 'dialog');
    surface().should($node =>
      expect(JSON.parse($node[0].getAttribute('data-tabster')!).modalizer.isTrapped).to.equal(false),
    );
    cy.get('#outside').should('not.have.attr', 'inert');
    close();
  });
  scenario(2, 'owner disableAutoFocus retains observed trigger until focus is explicitly moved into Surface', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact inherited owner option.
    harness({ owner: { unstable_disableAutoFocus: true } });
    open();
    trigger().should('have.focus');
    cy.get('#surface-first').focus();
    close();
  });
  scenario(
    2,
    'explicit owner trapFocus handles genuine inside-to-outside focus transitions through Surface refs',
    () => {
      harness({ owner: { trapFocus: true, inertTrapFocus: true } });
      open();
      cy.get('#surface-last').focus();
      cy.get('#outside').focus();
      surface().should('not.exist');
      cy.then(() => expect(records[1]).to.include({ type: 'focusin', open: false, trusted: true }));
    },
  );
  scenario(
    2,
    'implicit teaching trap default characterizes the absent owner focus-out listener without repairing source',
    () => {
      harness({ owner: { inertTrapFocus: true } });
      open();
      cy.get('#surface-last').focus();
      cy.get('#outside').focus();
      surface().should('exist');
      cy.then(() => expect(records).to.have.length(1));
      cy.get('#surface-first').focus();
      close();
    },
  );
  scenario(2, 'child preventDefault alone reaches Surface Escape with the original prevented event', () => {
    harness({
      owner: { trapFocus: false },
      children: <button onKeyDown={event => event.preventDefault()}>Prevent default only</button>,
    });
    open();
    close();
    cy.then(() => expect(records[1]).to.include({ type: 'keydown', open: false, prevented: true, trusted: true }));
  });
  scenario(
    2,
    'latest owner callback and size update retain the existing native root while changing arrow presence',
    () => {
      let root: HTMLElement;
      harness({ control: 'refuse', initial: true, owner: { trapFocus: false } });
      settled().then($node => {
        root = $node[0];
      });
      cy.get('#replace').realClick();
      surface().should($node => {
        expect($node[0]).to.equal(root);
        expect($node[0].children).to.have.length(1);
      });
      cy.get('#surface-first').focus();
      cy.realPress('Escape');
      cy.then(() => expect(records[records.length - 1]).to.include({ version: 1, open: false, type: 'keydown' }));
      cy.get('#external-close').realClick();
      surface().should('not.exist');
    },
  );
  scenario(2, 'body updates preserve the Surface DOM refs and ARIA description while owner stays open', () => {
    const ref = React.createRef<HTMLDivElement>();
    let root: HTMLElement;
    harness({ surfaceRef: ref });
    open();
    surface().then($node => {
      root = $node[0];
    });
    cy.get('#surface-first').realClick();
    surface().should($node => {
      expect($node[0]).to.equal(root);
      expect(ref.current).to.equal(root);
      expect(computeAccessibleDescription($node[0])).to.equal('Updated lesson');
    });
    cy.then(() => expect(records).to.have.length(1));
    close();
    cy.then(() => expect(ref.current).to.equal(null));
  });
  scenario(
    2,
    'owner content and arrow refs merge with forwarded Surface ref and reset on actual animation unmount',
    () => {
      const ref = React.createRef<HTMLDivElement>();
      let ownerState: Parameters<NonNullable<HarnessProps['onOwnerState']>>[0] | undefined;
      harness({
        surfaceRef: ref,
        onOwnerState: state => {
          ownerState = state;
        },
      });
      open();
      surface().then($node => {
        expect(ref.current).to.equal($node[0]);
        expect(ownerState?.contentRef.current).to.equal($node[0]);
        expect(ownerState?.arrowRef.current?.parentElement).to.equal($node[0]);
      });
      close();
      cy.then(() => {
        expect(ref.current).to.equal(null);
        expect(ownerState?.contentRef.current).to.equal(null);
        expect(ownerState?.arrowRef.current).to.equal(null);
      });
    },
  );
  scenario(2, 'source motion reports actual completed enter and exit while Surface refs follow DOM lifetime', () => {
    const finish = cy.stub();
    const ref = React.createRef<HTMLDivElement>();
    harness({ surfaceRef: ref, owner: { surfaceMotion: { onMotionFinish: finish } } });
    open();
    cy.wrap(finish).should('have.been.calledOnce');
    cy.then(() => expect(finish.firstCall.args).to.deep.equal([null, { direction: 'enter' }]));
    close();
    cy.wrap(finish).should('have.been.calledTwice');
    cy.then(() => {
      expect(finish.lastCall.args).to.deep.equal([null, { direction: 'exit' }]);
      expect(ref.current).to.equal(null);
    });
  });
  scenario(2, 'inline owner renders Surface next to actual trigger with inherited z-index instead of a portal', () => {
    harness({ owner: { inline: true } });
    open();
    cy.get('#row140-stage .fui-TeachingPopoverSurface').should('have.length', 1).and('have.css', 'z-index', '1');
    surface().should($node => expect($node[0].previousElementSibling?.id).to.equal('surface-trigger'));
    close();
  });
  for (const size of ['small', 'medium', 'large'] as const) {
    scenario(
      2,
      `${size} context controls actual six or eight pixel arrow height but teaching padding remains sixteen`,
      () => {
        let state: Parameters<NonNullable<HarnessProps['onState']>>[0] | undefined;
        harness({
          composed: true,
          onState: value => {
            state = value;
          },
          owner: { size },
        });
        open();
        surface().should('have.css', 'padding', '16px').and('have.css', 'min-width', '320px');
        cy.then(() => expect(state?.size).to.equal(size));
        surface()
          .children('div')
          .first()
          .should($arrow => {
            expect(parseFloat(getComputedStyle($arrow[0]).width)).to.be.closeTo(
              (size === 'small' ? 6 : 8) * Math.SQRT2,
              0.1,
            );
            expect(getComputedStyle($arrow[0]).position).to.equal('absolute');
          });
        close();
      },
    );
  }
  for (const [position, placement] of [
    ['above', 'top'],
    ['below', 'bottom'],
    ['before', 'left'],
    ['after', 'right'],
  ] as const) {
    scenario(
      2,
      `${position} owner positioning produces actual Surface target geometry and matching arrow placement`,
      () => {
        harness({ owner: { positioning: { position, autoSize: false, flipBoundary: null }, withArrow: true } });
        open();
        surface()
          .should('have.attr', 'data-popper-placement', placement)
          .should($node => {
            const rect = $node[0].getBoundingClientRect();
            const target = $node[0].ownerDocument.getElementById('surface-trigger')!.getBoundingClientRect();
            if (placement === 'top') {
              expect(rect.bottom).to.be.at.most(target.top);
            }
            if (placement === 'bottom') {
              expect(rect.top).to.be.at.least(target.bottom);
            }
            if (placement === 'left') {
              expect(rect.right).to.be.at.most(target.left);
            }
            if (placement === 'right') {
              expect(rect.left).to.be.at.least(target.right);
            }
            const arrow = $node[0].querySelector(':scope > div');
            expect(arrow, 'intrinsic arrow, not a Tabster sentinel').not.to.equal(null);
            expect(getComputedStyle(arrow!).transform).not.to.equal('none');
          });
        close();
      },
    );
  }
  scenario(2, 'coverTarget with OMITTED withArrow characterizes teaching overwrite of inherited suppression', () => {
    const owner = Object.freeze({ positioning: Object.freeze({ coverTarget: true }), trapFocus: false });
    let state: Parameters<NonNullable<HarnessProps['onState']>>[0] | undefined;
    harness({
      owner,
      composed: true,
      onState: value => {
        state = value;
      },
    });
    open();
    cy.then(() => {
      expect(Object.prototype.hasOwnProperty.call(owner, 'withArrow')).to.equal(false);
      expect(state?.withArrow).to.equal(true);
    });
    surface().children('div').should('have.length', 2);
    close();
  });
  scenario(2, 'explicit owner withArrow false suppresses intrinsic arrow without changing Surface content', () => {
    harness({ owner: { withArrow: false } });
    open();
    surface().children('div').should('have.length', 1);
    cy.get('#surface-title').should('have.text', 'Surface lesson');
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
      `${dark ? 'dark' : 'light'} ${
        appearance ?? 'normal'
      } inherited appearance supplies source background and foreground tokens`,
      () => {
        harness({ owner: { appearance } }, dark);
        open();
        surface().should('have.css', 'background-color', background).and('have.css', 'color', foreground);
        close();
      },
    );
  }
  scenario(2, 'RTL inherited before placement mirrors actual geometry and portal direction', () => {
    harness({ owner: { positioning: { position: 'before', flipBoundary: null } } }, false, true);
    open();
    surface()
      .should('have.css', 'direction', 'rtl')
      .should($node =>
        expect($node[0].getBoundingClientRect().left).to.be.at.least(
          $node[0].ownerDocument.getElementById('surface-trigger')!.getBoundingClientRect().right - 1,
        ),
      );
    close();
  });
  scenario(2, 'owner mountNode element directs real Surface portal and does not steal ownership of the host', () => {
    const App = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="surface-destination" ref={setNode} />
          {node && <Harness owner={{ mountNode: node }} />}
        </>
      );
    };
    stage(<App />);
    open();
    cy.get('#surface-destination .fui-TeachingPopoverSurface').should('have.length', 1);
    close();
    cy.get('#surface-destination').should('exist').and('be.empty');
  });
  scenario(2, 'owner mountNode object applies class only to generated fallback portal and cleans it up', () => {
    harness({ owner: { mountNode: { className: 'surface-owned-fallback' } } });
    open();
    surface().parents('.surface-owned-fallback').should('have.length', 1);
    close();
    cy.get('.surface-owned-fallback').should('not.exist');
  });
  scenario(2, 'mounted owner element ignores fallback className by actual portal source contract', () => {
    const App = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="object-destination" ref={setNode} />
          {node && <Harness owner={{ mountNode: { element: node, className: 'unused-fallback' } }} />}
        </>
      );
    };
    stage(<App />);
    open();
    cy.get('#object-destination .fui-TeachingPopoverSurface').should('have.length', 1);
    cy.get('#object-destination').should('not.have.class', 'unused-fallback');
    close();
  });
  scenario(2, 'custom style hook sees source classes before applying supported native root style overrides', () => {
    let calls = 0;
    stage(
      <CustomStyleHooksProvider_unstable
        value={{
          // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact exported style-hook key.
          useTeachingPopoverSurfaceStyles_unstable: state => {
            if (
              !state ||
              typeof state !== 'object' ||
              !('root' in state) ||
              !state.root ||
              typeof state.root !== 'object' ||
              !('className' in state.root)
            ) {
              throw new Error('Expected actual Surface slot state');
            }
            expect(state.root.className).to.contain('fui-TeachingPopoverSurface');
            calls++;
            Object.assign(state.root, { style: { outline: '3px solid rgb(0, 128, 0)', padding: 24 } });
          },
        }}
      >
        <Harness />
      </CustomStyleHooksProvider_unstable>,
    );
    open();
    surface()
      .should('have.css', 'outline-width', '3px')
      .and('have.css', 'outline-color', 'rgb(0, 128, 0)')
      .and('have.css', 'padding', '24px');
    cy.then(() => expect(calls).to.be.greaterThan(0));
    close();
  });
  scenario(2, 'Surface custom slot children render function forwards native attributes styles and merged ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props}>
        <span data-render-child>Custom root content</span>
      </Component>
    );
    standalone({
      ref,
      title: 'Render function',
      style: { padding: 25 },
      children: renderRoot,
    });
    surface()
      .should('have.attr', 'title', 'Render function')
      .and('have.css', 'padding', '25px')
      .find('[data-render-child]')
      .should('have.text', 'Custom root content');
    surface().then($node => expect(ref.current).to.equal($node[0]));
  });
  scenario(
    2,
    'root inline background style wins over brand context while child consumer keeps original context',
    () => {
      harness({
        owner: { appearance: 'brand', trapFocus: false },
        surface: { style: { backgroundColor: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' } },
        children: (
          <ContextConsumer>
            <p>Context preserved</p>
          </ContextConsumer>
        ),
      });
      open();
      surface().should('have.css', 'background-color', 'rgb(255, 255, 255)');
      cy.get('[data-context]')
        .should('have.attr', 'data-context')
        .then(value =>
          expect(JSON.parse(String(value))).to.include({ appearance: 'brand', withArrow: true, size: 'medium' }),
        );
      close();
    },
  );
  scenario(
    2,
    'brand context reaches real Header Body Title and Footer without an invented Surface context provider',
    () => {
      harness({
        owner: { appearance: 'brand' },
        children: (
          <>
            <TeachingPopoverHeader>Brand tips</TeachingPopoverHeader>
            <TeachingPopoverBody>
              <TeachingPopoverTitle>Brand child title</TeachingPopoverTitle>
              <p>Brand body content</p>
            </TeachingPopoverBody>
            <TeachingPopoverFooter primary="Done" />
          </>
        ),
      });
      open();
      surface().find('.fui-TeachingPopoverHeader').should('have.css', 'color', 'rgb(255, 255, 255)');
      surface().find('.fui-TeachingPopoverTitle').should('have.css', 'color', 'rgb(255, 255, 255)');
      surface().find('.fui-TeachingPopoverFooter button').should('be.visible');
      close();
    },
  );
  scenario(2, 'real forced colors emulation preserves Surface dialog and positive system foreground contrast', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    harness();
    open();
    surface()
      .should('have.attr', 'role', 'dialog')
      .should($node => {
        const win = $node[0].ownerDocument.defaultView!;
        expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true);
        expect(win.getComputedStyle($node[0]).color).not.to.equal(win.getComputedStyle($node[0]).backgroundColor);
        expect(win.getComputedStyle($node[0]).filter).to.contain('drop-shadow');
      });
    close();
  });
  scenario(
    2,
    'default modal exposes the actual open sentinel checkpoint and restores observed focus after close',
    () => {
      harness();
      open();
      surface().find('[data-tabster-dummy]').should('have.length', 2);
      modalPlacementReady();
      audit('open-modal', 'modal');
      close();
      cy.get('#row140-stage').should($node => expect($node[0].closest('[aria-hidden="true"]')).to.equal(null));
    },
  );
  scenario(3, 'controlled modal refusal retains actual open dialog checkpoint before external closure', () => {
    harness({ control: 'refuse', initial: true });
    settled();
    cy.get('#surface-first').should('have.focus');
    cy.realPress('Escape');
    settled();
    cy.then(() => expect(records[0]).to.include({ open: false, type: 'keydown', prevented: true, trusted: true }));
    modalPlacementReady();
    audit('controlled-refused-modal', 'modal');
    cy.get('#external-close').realClick();
    surface().should('not.exist');
  });
  scenario(3, 'zero-delay source mouseleave defers the owner request until after the original consumer handler', () => {
    const order: string[] = [];
    const original: React.MouseEvent[] = [];
    harness({
      owner: {
        openOnHover: true,
        mouseLeaveDelay: 0,
        trapFocus: false,
        // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact owner option spelling.
        unstable_disableAutoFocus: true,
        onOpenChange: (event, data) => {
          if (!data.open) {
            order.push('owner');
            expect(event.type).to.equal('mouseleave');
          }
        },
      },
      surface: {
        onMouseEnter: event => {
          original.push(event);
        },
        onMouseLeave: event => {
          order.push('consumer');
          expect(event.nativeEvent.isTrusted).to.equal(true);
        },
      },
    });
    trigger().realHover();
    settled();
    surface().realHover();
    settled();
    cy.then(() => {
      expect(original.length).to.be.at.least(1);
      for (const event of original) {
        expect(event.nativeEvent.isTrusted).to.equal(true);
        expect(originals).to.include(event);
      }
      expect(
        originals.filter(
          event =>
            event.type === 'mouseenter' &&
            event.target instanceof Element &&
            event.target.closest('.fui-TeachingPopoverSurface'),
        ),
      ).to.have.length(original.length);
    });
    surface().should($node => expect($node[0].matches(':hover')).to.equal(true));
    cy.then(() => {
      order.length = 0;
    });
    cy.get('#outside').realHover();
    surface().should('not.exist');
    cy.then(() => expect(order).to.deep.equal(['consumer', 'owner']));
  });
  scenario(3, 'hovered Surface cancels pending trigger leave and remains live through a real inside action', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact owner option spelling.
    harness({ owner: { openOnHover: true, trapFocus: false, unstable_disableAutoFocus: true } });
    trigger().realHover();
    settled();
    surface().realHover();
    settled();
    cy.get('#surface-first').realClick();
    cy.get('#surface-description').should('have.text', 'Updated lesson');
    cy.then(() => expect(records.filter(record => !record.open)).to.have.length(0));
    cy.get('#surface-first').focus();
    close(false);
  });
  scenario(3, 'trusted outside click closes Surface while inside native pointer action preserves the root', () => {
    harness({ owner: { trapFocus: false } });
    open();
    let root: HTMLElement;
    surface().then($node => {
      root = $node[0];
    });
    cy.get('#surface-first').realClick();
    surface().then($node => expect($node[0]).to.equal(root));
    cy.get('#outside').realClick();
    surface().should('not.exist');
    cy.then(() => expect(records[1]).to.include({ type: 'click', open: false, trusted: true }));
  });
  for (const closeOnScroll of [true, false]) {
    scenario(
      3,
      `actual outside wheel ${closeOnScroll ? 'closes' : 'does not close'} Surface according to inherited owner option`,
      () => {
        stage(
          <>
            <div
              id="scroll-region"
              tabIndex={0}
              role="region"
              aria-label="Outside scrolling"
              style={{ position: 'fixed', right: 20, bottom: 20, width: 100, height: 100, overflow: 'auto' }}
            >
              <div style={{ height: 1000 }}>Actual scroll content</div>
            </div>
            <Harness
              owner={{ trapFocus: false, closeOnScroll }}
              onRecord={(record, event) => {
                records.push(record);
                originals.push(event);
              }}
            />
          </>,
        );
        open();
        cy.get('#scroll-region').realHover().realMouseWheel({ deltaY: 120 });
        cy.get('#scroll-region').should($node => expect($node[0].scrollTop).to.be.greaterThan(0));
        if (closeOnScroll) {
          surface().should('not.exist');
          cy.then(() => expect(records[1]).to.include({ type: 'wheel', open: false, trusted: true }));
        } else {
          surface().should('exist');
          cy.get('#surface-first').focus();
          close();
        }
      },
    );
  }
  scenario(3, 'long readable content wraps to caller maxWidth without exceeding the measured source surface', () => {
    harness({
      owner: { trapFocus: false },
      surface: { style: { width: 360, maxWidth: 360, overflowWrap: 'anywhere' } },
      children: <p id="long-content">{'A readable long lesson with meaningful wrapping. '.repeat(30)}</p>,
    });
    open();
    surface().should($node => {
      const root = $node[0];
      const content = root.querySelector('#long-content')!;
      expect(root.getBoundingClientRect().width).to.be.closeTo(360, 1);
      expect(root.scrollWidth).to.be.at.most(root.clientWidth);
      expect(content.getBoundingClientRect().height).to.be.greaterThan(100);
      expect(content.getBoundingClientRect().right).to.be.at.most(root.getBoundingClientRect().right);
    });
    close();
  });
  scenario(3, 'caller maxHeight overflow supports native Surface scrolling without an outside-dismiss request', () => {
    harness({
      owner: { trapFocus: false, closeOnScroll: true },
      surface: { style: { maxHeight: 160, overflowY: 'auto' } },
      children: (
        <div style={{ height: 700 }}>
          <button id="scroll-action">Scrollable lesson action</button>
          <p>Long lesson</p>
        </div>
      ),
    });
    open();
    surface().realHover().realMouseWheel({ deltaY: 120 });
    surface().should($node => {
      expect($node[0].getBoundingClientRect().height).to.be.at.most(160);
      expect($node[0].scrollTop).to.be.greaterThan(0);
    });
    cy.then(() => expect(records).to.have.length(1));
    cy.get('#surface-title').should('exist');
    cy.get('#outside').realClick();
    surface().should('not.exist');
  });
  scenario(3, 'source minWidth wins over a smaller maxWidth unless caller explicitly overrides minWidth', () => {
    standalone({ style: { maxWidth: 240 } });
    surface().should($node => expect($node[0].getBoundingClientRect().width).to.be.at.least(320));
    standalone({ style: { minWidth: 0, width: 240, maxWidth: 240 } });
    surface().should($node => expect($node[0].getBoundingClientRect().width).to.be.closeTo(240, 1));
  });
  scenario(
    3,
    'actual viewport resize repositions the same Surface DOM inside the available horizontal boundary',
    () => {
      harness({ owner: { positioning: 'above' } });
      open();
      let root: HTMLElement;
      surface().then($node => {
        root = $node[0];
      });
      cy.viewport(720, 800);
      surface().should($node => {
        expect($node[0]).to.equal(root);
        const rect = $node[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(720);
      });
      close();
    },
  );
  scenario(
    3,
    'frozen owner Surface and style props remain byte-equivalent through source class and ref merging',
    () => {
      const style = Object.freeze({ padding: 21 });
      const surfaceProps = Object.freeze({
        id: 'surface',
        title: 'Frozen surface',
        style,
        'aria-label': 'Frozen lesson',
        'aria-labelledby': undefined,
      });
      const owner = Object.freeze({ trapFocus: false, withArrow: true });
      harness({ surface: surfaceProps, owner });
      open();
      surface().should('have.css', 'padding', '21px');
      cy.then(() => {
        expect(surfaceProps.style).to.equal(style);
        expect(surfaceProps).to.deep.equal({
          id: 'surface',
          title: 'Frozen surface',
          style: { padding: 21 },
          'aria-label': 'Frozen lesson',
          'aria-labelledby': undefined,
        });
        expect(owner).to.deep.equal({ trapFocus: false, withArrow: true });
      });
      close();
    },
  );
  scenario(
    3,
    'recomposition permits documented state parameter changes and returns the same styled state identity',
    () => {
      let before: Parameters<NonNullable<HarnessProps['onState']>>[0] | undefined;
      let after: typeof before;
      stage(
        <>
          <p style={{ position: 'fixed', bottom: 16 }}>Recomposition stage</p>
          <ComposedSurface
            id="surface"
            aria-label="Recomposed lesson"
            prepareState={state => {
              before = state;
              state.root.style = { padding: 23 };
              state.inline = true;
              state.withArrow = false;
            }}
            onState={state => {
              after = state;
            }}
          >
            Recomposed content
          </ComposedSurface>
        </>,
      );
      cy.get('#row140-stage .fui-TeachingPopoverSurface')
        .should('have.css', 'padding', '23px')
        .and('have.css', 'z-index', '1');
      cy.then(() => expect(after).to.equal(before));
    },
  );
  scenario(
    3,
    'public package facade and component index retain identical component hooks renderer and class object',
    () => {
      standalone();
      cy.then(() => {
        expect(PublicAPI.TeachingPopoverSurface).to.equal(SurfaceModule.TeachingPopoverSurface);
        expect(PublicAPI.useTeachingPopoverSurface_unstable).to.equal(SurfaceModule.useTeachingPopoverSurface_unstable);
        expect(PublicAPI.useTeachingPopoverSurfaceStyles_unstable).to.equal(
          SurfaceModule.useTeachingPopoverSurfaceStyles_unstable,
        );
        expect(PublicAPI.renderTeachingPopoverSurface_unstable).to.equal(
          SurfaceModule.renderTeachingPopoverSurface_unstable,
        );
        expect(PublicAPI.teachingPopoverSurfaceClassNames).to.equal(SurfaceModule.teachingPopoverSurfaceClassNames);
        expect(Object.prototype.hasOwnProperty.call(PublicAPI, 'useTeachingPopoverSurfaceBase_unstable')).to.equal(
          false,
        );
        expect(
          Object.prototype.hasOwnProperty.call(PublicAPI, 'useTeachingPopoverSurfaceContextValues_unstable'),
        ).to.equal(false);
      });
    },
  );
  scenario(
    3,
    'open owner unmount clears Surface root and portal without residual Escape outside-click or wheel callbacks',
    () => {
      const ref = React.createRef<HTMLDivElement>();
      harness({ surfaceRef: ref, control: 'refuse', initial: true, owner: { trapFocus: false, closeOnScroll: true } });
      settled();
      cy.get('#unmount').realClick();
      surface().should('not.exist');
      trigger().should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
      let count = 0;
      cy.then(() => {
        count = records.length;
      });
      cy.get('#outside').realClick();
      cy.realPress('Escape');
      cy.get('#row140-stage').realMouseWheel({ deltaY: 100 });
      cy.then(() => expect(records).to.have.length(count));
      cy.get('[data-portal-node]').should('not.exist');
    },
  );
  scenario(
    3,
    'default trigger has no invented aria-controls while explicit caller surface ID remains unchanged',
    () => {
      harness({ surface: { id: 'caller-surface-id' } });
      open();
      trigger().should('not.have.attr', 'aria-controls');
      surface().should('have.attr', 'id', 'caller-surface-id');
      close();
    },
  );
  scenario(
    3,
    'two independent owners preserve caller ARIA ID references and isolate Surface refs on sequential opening',
    () => {
      const refs = [React.createRef<HTMLDivElement>(), React.createRef<HTMLDivElement>()];
      stage(
        <>
          {['one', 'two'].map((name, index) => (
            <TeachingPopover key={name} trapFocus={false}>
              <TeachingPopoverTrigger disableButtonEnhancement>
                <button id={`trigger-${name}`} aria-controls={`panel-${name}`}>
                  Show {name}
                </button>
              </TeachingPopoverTrigger>
              <TeachingPopoverSurface id={`panel-${name}`} aria-label={`Lesson ${name}`} ref={refs[index]}>
                <button id={`action-${name}`}>Action {name}</button>
              </TeachingPopoverSurface>
            </TeachingPopover>
          ))}
        </>,
      );
      cy.get('#trigger-one').realClick();
      settled();
      cy.get('#action-one').should('have.focus');
      cy.get('#trigger-one').should('have.attr', 'aria-controls', 'panel-one');
      cy.then(() => {
        expect(refs[0].current?.id).to.equal('panel-one');
        expect(refs[1].current).to.equal(null);
      });
      cy.get('#trigger-two').realClick();
      cy.get('#panel-one').should('not.exist');
      cy.get('#panel-two').should('be.visible');
      cy.get('#trigger-two').should('have.attr', 'aria-controls', 'panel-two');
      cy.get('#action-two').should('have.focus');
      cy.realPress('Escape');
      surface().should('not.exist');
      cy.then(() => {
        expect(refs[0].current).to.equal(null);
        expect(refs[1].current).to.equal(null);
      });
    },
  );
  scenario(3, 'nested inline Surface stops child Escape propagation without dismissing its outer owner', () => {
    stage(
      <TeachingPopover trapFocus={false} inline>
        <TeachingPopoverTrigger disableButtonEnhancement>
          <button id="outer-trigger">Outer lesson</button>
        </TeachingPopoverTrigger>
        <TeachingPopoverSurface id="outer-surface" aria-label="Outer lesson">
          <TeachingPopover trapFocus={false} inline>
            <TeachingPopoverTrigger disableButtonEnhancement>
              <button id="inner-trigger">Inner lesson</button>
            </TeachingPopoverTrigger>
            <TeachingPopoverSurface
              id="inner-surface"
              aria-label="Inner lesson"
              onKeyDown={event => event.stopPropagation()}
            >
              <button id="inner-action">Inner action</button>
            </TeachingPopoverSurface>
          </TeachingPopover>
        </TeachingPopoverSurface>
      </TeachingPopover>,
    );
    cy.get('#outer-trigger').realClick();
    cy.get('#inner-trigger').should('have.focus').realClick();
    cy.get('#inner-action').should('have.focus');
    cy.realPress('Escape');
    cy.get('#inner-surface').should('not.exist');
    cy.get('#outer-surface').should('exist');
    cy.get('#inner-trigger').focus();
    cy.realPress('Escape');
    surface().should('not.exist');
  });
  for (const closeOnIframeFocus of [true, false]) {
    scenario(
      3,
      `real same-origin iframe focus ${
        closeOnIframeFocus ? 'dismisses' : 'preserves'
      } Surface and full raw browser axe audits the frame`,
      () => {
        stage(
          <>
            <iframe
              id="outside-frame"
              title="Outside surface"
              srcDoc="<html lang='en'><head><title>Outside surface</title></head><body><main aria-label='Outside frame lesson'><h1 style='font-size:14px;margin:0'>Outside surface</h1><button style='width:100%;height:100px'>Frame action</button></main></body></html>"
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
              throw new Error('Expected loaded same-origin frame');
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
          cy.get('#surface-first').focus();
          close();
        }
      },
    );
  }
  for (const [name, Story, brand] of [
    ['Default', Default, false],
    ['AppearanceBrand', AppearanceBrand, true],
  ] as const) {
    scenario(
      3,
      `stable ${name} mounts unchanged with decoded image actual header body footer and Surface dismissal`,
      () => {
        cy.intercept('GET', '**/fabric-website/assets/images/wireframe/image-square.png', {
          headers: { 'content-type': 'image/svg+xml' },
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="176"><rect width="288" height="176" fill="#777"/></svg>',
        });
        stage(<Story />);
        open();
        surface()
          .find('img')
          .should('have.prop', 'complete', true)
          .and('have.prop', 'naturalWidth', 288)
          .and('have.attr', 'alt', 'test image');
        surface()
          .find('img')
          .then($image => ($image[0] as HTMLImageElement).decode());
        surface().find('.fui-TeachingPopoverHeader').should('contain.text', 'Tips');
        surface().find('h2').should('have.text', 'Teaching Bubble Title');
        surface().should('contain.text', 'This is a teaching popover body');
        if (brand) {
          surface().should('have.css', 'background-color', 'rgb(15, 108, 189)');
        }
        stablePlacementReady('stable-basic');
        audit('stable-open', 'stable-basic');
        cy.screenshot(`positive/stable-${name}`, { capture: 'viewport' });
        cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Page.bringToFront' }));
        cy.document().should(document => expect(document.hasFocus()).to.equal(true));
        cy.contains('.fui-TeachingPopoverFooter button', 'Learn more').realClick();
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
  scenario(
    3,
    'native title names an explicitly authored standalone dialog without fabricating owner modal policy',
    () => {
      standalone({ role: 'dialog', 'aria-label': undefined, title: 'Title named lesson' });
      surface().should($node => expect(computeAccessibleName($node[0])).to.equal('Title named lesson'));
      surface().should('not.have.attr', 'aria-modal');
    },
  );
  scenario(3, 'unnamed native image retains its exact critical alternative-text finding and classifier guards', () => {
    finalProfile = 'image';
    standalone({
      children: (
        <img
          id="unnamed-image"
          width={80}
          height={80}
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23777'/%3E%3C/svg%3E"
        />
      ),
    });
    cy.get('#unnamed-image').should('have.prop', 'complete', true).and('have.prop', 'naturalWidth', 80);
    cy.get('#unnamed-image').then($image => ($image[0] as HTMLImageElement).decode());
  });
  scenario(
    3,
    'supported HTMLElement portal destination in an open shadow root preserves native actions and source cleanup',
    () => {
      const App = () => {
        const [destination, setDestination] = React.useState<HTMLDivElement | null>(null);
        return (
          <>
            <div
              id="shadow-host"
              ref={host => {
                if (host && !host.shadowRoot) {
                  const shadow = host.attachShadow({ mode: 'open' });
                  const node = host.ownerDocument.createElement('div');
                  node.id = 'shadow-destination';
                  shadow.appendChild(node);
                  setDestination(node);
                }
              }}
            />
            {destination && (
              <Harness
                owner={{ mountNode: destination, trapFocus: false }}
                surface={{ style: { width: 320, padding: 16, backgroundColor: 'white', color: 'black' } }}
              />
            )}
          </>
        );
      };
      stage(<App />);
      open();
      cy.get('#shadow-host').shadow().find('#shadow-destination .fui-TeachingPopoverSurface').should('have.length', 1);
      cy.get('#shadow-host').shadow().find('#surface-first').realClick();
      cy.get('#shadow-host').shadow().find('#surface-description').should('have.text', 'Updated lesson');
      audit('shadow-open');
      cy.get('#shadow-host').shadow().find('#surface-first').focus();
      close(false);
      trigger().should('not.have.focus');
      cy.get('#shadow-host').shadow().find('#shadow-destination').should('exist').and('be.empty');
    },
  );
  scenario(
    3,
    'supported iframe document portal uses native root refs real CDP child input and raw full frame audits',
    () => {
      const rootRef = React.createRef<HTMLDivElement>();
      const clicked = cy.stub();
      const keyed = cy.stub();
      const App = () => {
        const [document, setDocument] = React.useState<Document | null>(null);
        const renderer = React.useMemo(() => (document ? createDOMRenderer(document) : undefined), [document]);
        return (
          <>
            <iframe
              id="inside-frame"
              title="Portalled surface lesson"
              srcDoc="<html lang='en'><head><title>Portalled surface lesson</title></head><body><main aria-label='Frame lesson'><h1>Frame lesson</h1></main></body></html>"
              onLoad={event => {
                setDocument(event.currentTarget.contentDocument);
              }}
              style={{ position: 'fixed', left: 20, top: 60, width: 600, height: 600 }}
            />
            {document && renderer && (
              <RendererProvider renderer={renderer}>
                <FluentProvider targetDocument={document} theme={webLightTheme}>
                  <TeachingPopover
                    defaultOpen
                    trapFocus={false}
                    // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact inherited option.
                    unstable_disableAutoFocus
                    mountNode={document.querySelector<HTMLElement>('main')}
                  >
                    <TeachingPopoverSurface
                      id="frame-surface"
                      aria-label="Frame source lesson"
                      ref={rootRef}
                      onKeyDown={keyed}
                      style={{ position: 'static', width: 320 }}
                    >
                      <button id="frame-action" onClick={clicked}>
                        Frame native action
                      </button>
                    </TeachingPopoverSurface>
                  </TeachingPopover>
                </FluentProvider>
              </RendererProvider>
            )}
          </>
        );
      };
      stage(<App />);
      finalProfile = 'frame';
      cy.get('#inside-frame').should($frame => {
        const frame = $frame[0] as HTMLIFrameElement;
        expect(frame.contentDocument?.getElementById('frame-action')).not.to.equal(null);
        expect(rootRef.current?.ownerDocument).to.equal(frame.contentDocument);
        expect(rootRef.current?.getAttribute('role')).to.equal('group');
        expect(rootRef.current?.getAnimations().filter(animation => animation.playState === 'running')).to.have.length(
          0,
        );
      });
      cy.readFile<string>('..\\..\\..\\..\\node_modules\\axe-core\\axe.min.js').then(source => {
        cy.window().then(window => {
          (window as AuditWindow).eval(source);
          const frame = window.document.querySelector<HTMLIFrameElement>('#inside-frame');
          if (!frame?.contentWindow) {
            throw new Error('Expected native iframe document');
          }
          (frame.contentWindow as AuditWindow).eval(source);
        });
      });
      cy.get('#inside-frame').then($frame => {
        const frame = $frame[0] as HTMLIFrameElement;
        const button = frame.contentDocument!.getElementById('frame-action')!;
        cy.wrap(Cypress.$(button)).realClick();
      });
      cy.wrap(clicked).should('have.been.calledOnce');
      cy.then(() => expect((clicked.firstCall.args[0] as React.MouseEvent).nativeEvent.isTrusted).to.equal(true));
      iframeRootPlacementReady();
      audit('iframe-surface-open', 'frame');
      cy.realPress('Escape');
      cy.get('#inside-frame').should($frame =>
        expect(($frame[0] as HTMLIFrameElement).contentDocument?.getElementById('frame-surface')).to.equal(null),
      );
      cy.wrap(keyed).should('have.been.calledOnce');
      cy.then(() => {
        expect(rootRef.current).to.equal(null);
        expect((keyed.firstCall.args[0] as React.KeyboardEvent).nativeEvent.isTrusted).to.equal(true);
      });
    },
  );
  for (const [name, Story, text] of [
    ['Carousel', Carousel, false],
    ['CarouselBrand', CarouselBrand, false],
    ['CarouselText', CarouselText, true],
  ] as const) {
    scenario(
      3,
      `stable ${name} keeps Surface readable across exactly three unchanged pages with real tabs or count and cleanup`,
      () => {
        cy.intercept('GET', '**/fabric-website/assets/images/wireframe/image-square.png', {
          headers: { 'content-type': 'image/svg+xml' },
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="288" height="176"><rect width="288" height="176" fill="#777"/></svg>',
        });
        registering = false;
        stage(<Story />);
        open();
        let root: HTMLElement;
        surface().then($node => {
          root = $node[0];
        });
        const page = (index: number) => {
          surface().find('[data-carousel-item]').should('have.length', 3);
          surface()
            .find('[data-carousel-active-item="true"]')
            .should('have.length', 1)
            .and('contain.text', `This is page: ${index}`);
          surface().find('[data-carousel-active-item="false"]').should('have.length', 2).and('be.empty');
          surface()
            .find('img')
            .should('have.prop', 'complete', true)
            .and('have.prop', 'naturalWidth', 288)
            .and('have.attr', 'alt', 'test image');
          surface()
            .find('img')
            .then($image => ($image[0] as HTMLImageElement).decode());
          surface().should($node => {
            expect($node[0]).to.equal(root);
            expect($node[0].getBoundingClientRect().height).to.be.greaterThan(250);
          });
          if (text) {
            surface().find('.fui-TeachingPopoverCarouselPageCount').should('have.text', `${index} of 3`);
          } else {
            surface().find('[role="tab"]').should('have.length', 3);
            surface().find('[aria-selected="true"]').should('have.attr', 'aria-label', `Tip ${index}`);
          }
        };
        page(1);
        stablePlacementReady(text ? 'stable-text' : 'stable-carousel');
        audit('stable-open', text ? 'stable-text' : 'stable-carousel');
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
        cy.document().should(document => expect(document.hasFocus()).to.equal(true));
        settled();
        cy.contains('button', 'Finish').realClick();
        surface().should('not.exist');
        trigger().should('have.focus');
        open();
        surface().then($node => {
          root = $node[0];
        });
        page(1);
        settled();
        cy.contains('button', 'Close').realClick();
        surface().should('not.exist');
        trigger().should('have.focus');
      },
    );
  }
});
