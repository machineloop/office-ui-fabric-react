import * as React from 'react';
import * as axe from 'axe-core';
import { mount } from '@fluentui/scripts-cypress';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { getTabster } from 'tabster';
// nx-ignore-next-line
import { FluentProvider, webLightTheme, webDarkTheme, makeStyles } from '@fluentui/react-components';
// eslint-disable-next-line @fluentui/no-restricted-imports -- Exercise the actual public custom-style extension rather than copied component logic.
import { CustomStyleHooksProvider_unstable } from '@fluentui/react-shared-contexts';
import {
  TeachingPopoverBody,
  teachingPopoverBodyClassNames,
  TeachingPopover,
  TeachingPopoverSurface,
  TeachingPopoverTrigger,
  TeachingPopoverTitle,
} from '../../../index';
import type { TeachingPopoverBodyProps, TeachingPopoverBodyState } from '../../../index';
import { ComposedBody, RawBody, UpdatingBody } from './fixtures.stories';
import * as Facade from '../../../TeachingPopoverBody';
import * as Local from '../index';
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
const evidence = `src/components/TeachingPopoverBody/.evidence/audits-${Date.now()}-${Cypress._.random(
  100000,
  999999,
)}`;
const titles: string[] = [];
let ordinal = 0;
let events: Array<{ type: string; trusted: boolean }> = [];
type Profile = 'stable-basic' | 'stable-carousel' | 'stable-carousel-text';
const surface = () => cy.get('.fui-TeachingPopoverSurface');
const body = () => cy.get('#body');
const media = () => cy.get('.fui-TeachingPopoverBody__media');
function scenario(level: number, title: string, test: () => void) {
  if (level <= round) {
    titles.push(title);
    it(title, test);
  }
}
function stage(children: React.ReactNode, dark = false, rtl = false) {
  return mount(
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={rtl ? 'rtl' : 'ltr'}>
      <main id="row138-stage" style={{ minHeight: 600, width: 900, padding: 24 }}>
        {children}
      </main>
    </FluentProvider>,
    { strict: false },
  );
}
function render(props: TeachingPopoverBodyProps & { 'data-owner'?: string } = {}) {
  return stage(
    <TeachingPopoverBody id="body" style={{ width: 288 }} {...props}>
      Body content
    </TeachingPopoverBody>,
  );
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
function expectedFindings(profile?: Profile) {
  const targets =
    profile === 'stable-carousel'
      ? [
          ['.fui-PopoverSurface > i:nth-child(1)'],
          ['.fui-TeachingPopoverCarouselNav > i:nth-child(1)'],
          ['.fui-TeachingPopoverCarouselNav > i:nth-child(5)'],
          ['.fui-PopoverSurface > i:nth-child(5)'],
        ]
      : [['.fui-PopoverSurface > i:nth-child(1)'], [profile === 'stable-basic' ? 'i:nth-child(6)' : 'i:nth-child(5)']];
  return {
    violations: profile
      ? [
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
        ]
      : [],
    incomplete: profile
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
function settled() {
  return surface()
    .should('be.visible')
    .should($node =>
      expect(
        $node[0].getAnimations({ subtree: true }).filter(animation => animation.playState === 'running'),
      ).to.have.length(0),
    );
}
function openStable() {
  cy.get('#row138-stage [aria-expanded]')
    .focus()
    .should($node =>
      expect(getTabster($node[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement()).to.equal($node[0]),
    )
    .realClick()
    .should('have.attr', 'aria-expanded', 'true');
  settled();
}
function audit(phase = 'final', profile?: Profile) {
  cy.get('#row138-stage')
    .should('be.visible')
    .and('not.be.empty')
    .should($stage => {
      if (profile === 'stable-carousel') {
        expect(
          $stage[0].ownerDocument.querySelectorAll('.fui-TeachingPopoverCarouselNav > [data-tabster-dummy]'),
        ).to.have.length(2);
        expect(
          $stage[0].ownerDocument.querySelectorAll('.fui-TeachingPopoverCarouselNav > [role="tab"]'),
        ).to.have.length(3);
      }
      if (!profile) {
        expect($stage[0].closest('[aria-hidden="true"]')).to.equal(null);
        expect($stage[0].querySelectorAll('button[aria-hidden="true"]')).to.have.length(0);
      }
    })
    .then($stage => {
      const document = $stage[0].ownerDocument;
      const roots = [
        $stage[0],
        ...Array.from(document.querySelectorAll<HTMLElement>('.fui-TeachingPopoverSurface')).filter(
          node => !$stage[0].contains(node),
        ),
      ];
      return axe.run(roots).then(fullResults => {
        const actual = {
          violations: findingShape(fullResults.violations),
          incomplete: findingShape(fullResults.incomplete),
        };
        const expected = expectedFindings(profile);
        cy.writeFile(`${evidence}/audit-${++ordinal}.json`, {
          scenario: Cypress.currentTest.title,
          phase,
          round,
          retries: Cypress.currentRetry,
          fullResults,
          auditedRoots: roots.map(node => ({
            id: node.id,
            exposed: !node.closest('[aria-hidden="true"]'),
            nonempty: node.childElementCount > 0,
          })),
          profile: profile ?? null,
          events,
          actualFindingShape: actual,
          expectedFindingShape: expected,
        }).then(() => {
          expect(fullResults.passes.length).to.be.greaterThan(0);
          expect(actual, 'reject every unknown or duplicate finding').to.deep.equal(expected);
          expect(Cypress.currentRetry).to.equal(0);
          if (profile) {
            expect(Cypress.currentTest.title).to.match(
              /^stable (Default|AppearanceBrand|Carousel|CarouselAppearanceBrand|CarouselText) /,
            );
            expect(phase).to.match(/^stable-page-[123]$/);
            expect(computeAccessibleName(document.querySelector('.fui-TeachingPopoverSurface')!)).to.equal('');
            for (const node of fullResults.incomplete[0].nodes) {
              const sentinel = document.querySelector<HTMLElement>(String(node.target[0]));
              expect(sentinel?.tagName).to.equal('I');
              expect(sentinel?.getAttribute('aria-hidden')).to.equal('true');
              expect(sentinel?.getAttribute('tabindex')).to.equal('0');
              expect(sentinel?.getAttribute('role')).to.equal('none');
              expect(sentinel?.childElementCount).to.equal(0);
              expect(sentinel?.textContent).to.equal('');
              const template = document.createElement('template');
              template.innerHTML = node.html;
              const captured = template.content.querySelector<HTMLElement>('i');
              if (!sentinel || !captured) {
                throw new Error('Known sentinel requires captured and live elements');
              }
              expect(template.content.childElementCount).to.equal(1);
              expect(template.content.firstElementChild).to.equal(captured);
              expect(captured.childElementCount).to.equal(0);
              expect(captured.textContent).to.equal('');
              const attributesOf = (element: HTMLElement) =>
                Array.from(element.attributes)
                  .filter(attribute => attribute.name !== 'style')
                  .map(attribute => [attribute.name, attribute.value])
                  .sort(([left], [right]) => left.localeCompare(right));
              const styleOf = (element: HTMLElement) =>
                Array.from(element.style)
                  .filter(property => property !== 'top' && property !== 'left')
                  .sort()
                  .map(property => [
                    property,
                    element.style.getPropertyValue(property),
                    element.style.getPropertyPriority(property),
                  ]);
              expect(attributesOf(captured)).to.deep.equal(attributesOf(sentinel));
              expect(styleOf(captured)).to.deep.equal(styleOf(sentinel));
              for (let ancestor: HTMLElement | null = sentinel; ancestor; ancestor = ancestor.parentElement) {
                const transform = document.defaultView!.getComputedStyle(ancestor).transform;
                if (transform && transform !== 'none') {
                  expect(ancestor.scrollTop, 'stable story transformed ancestor has no vertical offset').to.equal(0);
                  expect(ancestor.scrollLeft, 'stable story transformed ancestor has no horizontal offset').to.equal(0);
                }
              }
              for (const property of ['top', 'left']) {
                expect(captured.style.getPropertyPriority(property)).to.equal('');
                expect(sentinel.style.getPropertyPriority(property)).to.equal('');
                expect(['', '0px'], 'captured sentinel position is unset or the measured zero offset').to.include(
                  captured.style.getPropertyValue(property),
                );
                expect(['', '0px'], 'live sentinel position is unset or the measured zero offset').to.include(
                  sentinel.style.getPropertyValue(property),
                );
              }
              for (const attribute of ['aria-hidden', 'tabindex', 'role', 'data-tabster-dummy']) {
                expect(captured.getAttribute(attribute)).to.equal(sentinel.getAttribute(attribute));
              }
              for (const [property, value] of [
                ['position', 'fixed'],
                ['height', '1px'],
                ['width', '1px'],
                ['opacity', '0.001'],
                ['z-index', '-1'],
                ['content-visibility', 'hidden'],
              ] as const) {
                expect(captured.style.getPropertyValue(property)).to.equal(value);
                expect(document.defaultView!.getComputedStyle(sentinel).getPropertyValue(property)).to.equal(value);
              }
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
            const mutations = [
              (value: typeof actual) => {
                value.violations[0].id = 'unknown-rule';
              },
              (value: typeof actual) => {
                value.violations.push(value.violations[0]);
              },
              (value: typeof actual) => {
                value.incomplete[0].nodes.push(value.incomplete[0].nodes[0]);
              },
              (value: typeof actual) => {
                value.incomplete[0].nodes[0].all[0].id = 'unknown-check';
              },
              (value: typeof actual) => {
                value.incomplete[0].nodes[0].target = ['#unknown-target'];
              },
              (value: typeof actual) => {
                value.violations[0].impact = 'critical';
              },
            ];
            for (const mutate of mutations) {
              const changed = Cypress._.cloneDeep(actual);
              mutate(changed);
              expect(() => expect(changed).to.deep.equal(expected)).to.throw();
            }
            cy.writeFile(`${evidence}/guards-${ordinal}.json`, {
              scenario: Cypress.currentTest.title,
              phase,
              rejected: [
                'unknown-rule',
                'duplicate-rule',
                'duplicate-node',
                'unknown-check',
                'wrong-target',
                'wrong-impact',
              ],
              expected,
            });
          }
        });
      });
    });
}

describe('row138 TeachingPopoverBody', { retries: 0 }, () => {
  before(() => {
    expect(React.version).to.equal('19.2.0');
    expect(new Set(titles).size).to.equal(titles.length);
    expect(titles.length).to.equal([18, 35, 53][round - 1]);
    cy.writeFile(`${evidence}/manifest.json`, { round, titles, expectedCount: titles.length, retries: 0 });
  });
  beforeEach(() => {
    events = [];
    cy.viewport(1100, 800);
    cy.get('body').realHover({ position: 'topLeft' });
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.setCacheDisabled',
        params: { cacheDisabled: true },
      }),
    );
  });
  afterEach(function () {
    if (this.currentTest?.state !== 'failed') {
      audit();
    }
  });

  scenario(1, 'default snapshot contract is a single native div with content and no media or role', () => {
    render();
    body()
      .should('have.prop', 'tagName', 'DIV')
      .and('have.text', 'Body content')
      .and('have.class', teachingPopoverBodyClassNames.root)
      .and('not.have.attr', 'role');
    body().should('not.have.attr', 'tabindex');
    body().children().should('have.length', 0);
    media().should('not.exist');
    cy.then(() => expect(TeachingPopoverBody.displayName).to.equal('TeachingPopoverBody'));
  });
  for (const [name, props] of [
    ['omitted', {}],
    ['undefined', { media: undefined }],
    ['null', { media: null }],
  ] as const) {
    scenario(1, `${name} optional media produces no wrapper and keeps children`, () => {
      render(props);
      media().should('not.exist');
      body().should('have.text', 'Body content');
    });
  }
  scenario(1, 'string shorthand media is a span preceding root text exactly once', () => {
    render({ media: 'Media text' });
    media().should('have.prop', 'tagName', 'SPAN').and('have.text', 'Media text');
    body().then($node => {
      expect($node[0].childNodes).to.have.length(2);
      expect($node[0].firstChild).to.equal($node[0].querySelector('span'));
      expect($node[0].lastChild?.textContent).to.equal('Body content');
    });
  });
  scenario(1, 'element shorthand wraps rather than clones the exact consumer child', () => {
    render({ media: <strong id="media-child">Illustration caption</strong> });
    media()
      .children()
      .should('have.length', 1)
      .and('have.attr', 'id', 'media-child')
      .and('have.prop', 'tagName', 'STRONG');
  });
  scenario(1, 'object media forwards id class style title language and native data attributes', () => {
    render({
      media: {
        id: 'media',
        className: 'consumer-media',
        style: { marginBottom: 7 },
        title: 'Caption',
        lang: 'fr',
        ...{ 'data-owner': 'caller' },
        children: 'Media',
      },
    });
    media()
      .should('have.attr', 'id', 'media')
      .and('have.class', 'consumer-media')
      .and('have.attr', 'title', 'Caption')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'data-owner', 'caller')
      .and('have.css', 'margin-bottom', '7px');
  });
  scenario(1, 'media render function changes the component tag while preserving forwarded slot props and order', () => {
    render({
      media: {
        children: (_Component: React.ElementType, slotProps: React.ComponentPropsWithRef<'span'>) =>
          React.createElement('div', slotProps, 'Block media'),
      },
    });
    media().should('have.prop', 'tagName', 'DIV').and('have.class', teachingPopoverBodyClassNames.media);
    body().children().first().should('have.class', teachingPopoverBodyClassNames.media);
  });
  scenario(1, 'native root attributes are forwarded without leaking mediaLength or component props', () => {
    render({
      role: 'region',
      'aria-label': 'Lesson body',
      title: 'Details',
      lang: 'en',
      dir: 'rtl',
      'data-owner': 'caller',
      mediaLength: 'medium',
      media: 'Picture',
    });
    body()
      .should('have.attr', 'role', 'region')
      .and('have.attr', 'aria-label', 'Lesson body')
      .and('have.attr', 'title', 'Details')
      .and('have.attr', 'lang', 'en')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-owner', 'caller')
      .and('not.have.attr', 'mediaLength');
    body().should('not.have.attr', 'media');
    body().then($node => expect(computeAccessibleName($node[0])).to.equal('Lesson body'));
  });
  scenario(1, 'root class and inline style retain consumer ownership after generated styles', () => {
    render({ className: 'consumer-body', style: { width: 288, paddingBottom: 9, flexDirection: 'row' } });
    body()
      .should('have.class', 'consumer-body')
      .and('have.class', teachingPopoverBodyClassNames.root)
      .and('have.css', 'padding-bottom', '9px')
      .and('have.css', 'flex-direction', 'row');
  });
  scenario(1, 'root and media callback refs attach to the actual div and span', () => {
    const root = cy.stub();
    const slotRef = cy.stub();
    stage(
      <TeachingPopoverBody id="body" ref={root} media={{ ref: slotRef, children: 'Media' }}>
        Content
      </TeachingPopoverBody>,
    );
    body().then($node => expect(root.lastCall.args[0]).to.equal($node[0]));
    media().then($node => expect(slotRef.lastCall.args[0]).to.equal($node[0]));
  });
  scenario(1, 'object refs attach to root and media without introducing a wrapper', () => {
    const root = React.createRef<HTMLDivElement>();
    const slotRef = React.createRef<HTMLSpanElement>();
    stage(
      <TeachingPopoverBody id="body" ref={root} media={{ ref: slotRef, children: 'Media' }}>
        Content
      </TeachingPopoverBody>,
    );
    body().then($node => expect(root.current).to.equal($node[0]));
    media().then($node => expect(slotRef.current).to.equal($node[0]));
    cy.get('#row138-stage').children().should('have.length', 1);
  });
  scenario(1, 'source hook defaults short and records exact root media component metadata', () => {
    let state: TeachingPopoverBodyState;
    stage(
      <ComposedBody
        id="body"
        onState={value => {
          state = value;
        }}
      >
        Content
      </ComposedBody>,
    );
    cy.wrap(null)
      .should(() => expect(state).not.to.equal(undefined))
      .then(() => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Characterize metadata emitted by the actual current hook.
        expect(state.components).to.deep.equal({ root: 'div', media: 'span' });
        expect(state.mediaLength).to.equal('short');
        expect(state.media).to.equal(undefined);
        expect(state.root.children).to.equal('Content');
      });
    body().should('have.class', teachingPopoverBodyClassNames.root);
    cy.get('[data-media-classes]').should('have.text', 'base,medium,short,tall');
  });
  scenario(1, 'source hook styles renderer preserve frozen caller props and media object', () => {
    const slotProps = Object.freeze({ id: 'media', children: 'Frozen media', className: 'frozen-media' });
    const props = Object.freeze({
      id: 'body',
      media: slotProps,
      mediaLength: 'tall' as const,
      children: 'Frozen content',
    });
    stage(<ComposedBody {...props} />);
    body().should('contain.text', 'Frozen content');
    media().should('have.class', 'frozen-media');
    cy.then(() => {
      expect(props.media).to.equal(slotProps);
      expect(slotProps).to.deep.equal({ id: 'media', children: 'Frozen media', className: 'frozen-media' });
    });
  });
  scenario(1, 'render ordering is media then heading then paragraph then native action', () => {
    stage(
      <TeachingPopoverBody id="body" media="Media">
        <h2>Heading</h2>
        <p>Description</p>
        <button>Action</button>
      </TeachingPopoverBody>,
    );
    body()
      .children()
      .then($nodes => expect(Array.from($nodes, node => node.tagName)).to.deep.equal(['SPAN', 'H2', 'P', 'BUTTON']));
  });
  scenario(1, 'live prop change preserves root media and keyed child identity and state', () => {
    stage(<UpdatingBody />);
    let root: HTMLElement;
    let slotNode: HTMLElement;
    let child: HTMLElement;
    body().then($node => {
      root = $node[0];
    });
    media().then($node => {
      slotNode = $node[0];
    });
    cy.get('#state-child')
      .realClick()
      .should('have.text', 'Count 1')
      .then($node => {
        child = $node[0];
      });
    cy.get('#update').realClick();
    body()
      .should('have.attr', 'data-version', '1')
      .then($node => expect($node[0]).to.equal(root));
    media()
      .should('have.text', 'Media 1')
      .then($node => expect($node[0]).to.equal(slotNode));
    cy.get('#state-child')
      .should('have.text', 'Count 1')
      .then($node => expect($node[0]).to.equal(child));
  });
  scenario(1, 'removing media detaches only its ref while preserving descendant state', () => {
    const root = cy.stub();
    const slotRef = cy.stub();
    stage(<UpdatingBody bodyRef={root} mediaRef={slotRef} />);
    cy.get('#state-child').realClick();
    cy.get('#toggle-media').realClick();
    media().should('not.exist');
    cy.then(() => {
      expect(slotRef.lastCall.args[0]).to.equal(null);
      expect(root.callCount).to.equal(1);
    });
    cy.get('#state-child').should('have.text', 'Count 1');
    cy.get('#toggle-media').realClick();
    media().should('have.text', 'Media 0');
    cy.then(() => expect(slotRef.lastCall.args[0].tagName).to.equal('SPAN'));
  });
  scenario(1, 'unmount detaches root media descendant refs and removes real DOM nodes', () => {
    const root = cy.stub();
    const slotRef = cy.stub();
    const childRef = cy.stub();
    let oldRoot: HTMLElement;
    stage(<UpdatingBody bodyRef={root} mediaRef={slotRef} childRef={childRef} />);
    body().then($node => {
      oldRoot = $node[0];
    });
    cy.get('#unmount-body').realClick();
    body().should('not.exist');
    media().should('not.exist');
    cy.then(() => {
      expect(root.lastCall.args[0]).to.equal(null);
      expect(slotRef.lastCall.args[0]).to.equal(null);
      expect(childRef.lastCall.args[0]).to.equal(null);
      expect(oldRoot.isConnected).to.equal(false);
    });
  });

  for (const [length, height] of [
    ['short', 117],
    ['medium', 176],
    ['tall', 288],
  ] as const) {
    scenario(2, `${length} media has source aspect ratio and exact 288px-wide geometry`, () => {
      render({ mediaLength: length, media: 'Media' });
      media().should($node => {
        const bounds = $node[0].getBoundingClientRect();
        expect(bounds.width).to.be.closeTo(288, 0.1);
        expect(bounds.height).to.be.closeTo(height, 0.1);
        expect(parseFloat(getComputedStyle($node[0]).aspectRatio)).to.be.closeTo(288 / height, 0.00001);
      });
      body().should('have.css', 'display', 'flex').and('have.css', 'flex-direction', 'column');
      body().should('have.css', 'padding-bottom', '12px');
      media().should('have.css', 'margin-bottom', '12px').and('have.css', 'overflow', 'hidden');
      media().should('have.css', 'display', 'flex').and('have.css', 'justify-content', 'center');
      media().should('have.css', 'vertical-align', 'middle').and('have.css', 'grid-area', 'media');
    });
  }
  scenario(2, 'default and explicit undefined mediaLength both resolve short in actual source state', () => {
    const states: TeachingPopoverBodyState[] = [];
    stage(
      <>
        <ComposedBody id="body" media="Default" onState={state => states.push(state)} />
        <ComposedBody id="explicit" media="Undefined" mediaLength={undefined} onState={state => states.push(state)} />
      </>,
    );
    cy.wrap(null).should(() => {
      expect(states).to.have.length(2);
      expect(states.map(state => state.mediaLength)).to.deep.equal(['short', 'short']);
    });
    media()
      .should('have.length', 2)
      .then($nodes =>
        expect(getComputedStyle($nodes[0]).aspectRatio).to.equal(getComputedStyle($nodes[1]).aspectRatio),
      );
  });
  scenario(
    2,
    'media width follows real container resize while the source supports guard retains its fallback height',
    () => {
      stage(
        <div id="container" style={{ width: '50vw' }}>
          <TeachingPopoverBody id="body" media="Media" mediaLength="medium">
            Content
          </TeachingPopoverBody>
        </div>,
      );
      media().should($node => expect($node[0].getBoundingClientRect().width).to.be.closeTo(550, 0.1));
      cy.viewport(800, 800);
      media().should($node => {
        const bounds = $node[0].getBoundingClientRect();
        expect(bounds.width).to.be.closeTo(400, 0.1);
        expect(bounds.height).to.be.closeTo(176, 0.1);
        expect($node[0].ownerDocument.defaultView!.CSS.supports('aspect-ratio', '1')).to.equal(true);
        expect($node[0].ownerDocument.defaultView!.CSS.supports('(aspect-ratio)')).to.equal(false);
      });
    },
  );
  scenario(2, 'root content begins after media height plus the source 12px bottom margin', () => {
    stage(
      <TeachingPopoverBody id="body" style={{ width: 288 }} media="Media">
        <div id="content">Content</div>
      </TeachingPopoverBody>,
    );
    body().should($node => {
      const slotBounds = $node[0].querySelector('span')!.getBoundingClientRect();
      const textBounds = $node[0].querySelector('#content')!.getBoundingClientRect();
      expect(textBounds.top - slotBounds.bottom).to.be.closeTo(12, 0.1);
      expect($node[0].getBoundingClientRect().bottom - textBounds.bottom).to.be.closeTo(12, 0.1);
    });
  });
  scenario(2, 'long body paragraphs wrap at a real narrow width and grow on resize without clipping', () => {
    const text = 'A long lesson explains the feature with many ordinary words. '.repeat(15);
    stage(
      <TeachingPopoverBody id="body" style={{ width: '40vw' }}>
        <p style={{ margin: 0 }}>{text}</p>
      </TeachingPopoverBody>,
    );
    let height = 0;
    body().then($node => {
      height = $node[0].getBoundingClientRect().height;
    });
    cy.viewport(600, 800);
    body().should($node => {
      expect($node[0].getBoundingClientRect().height).to.be.greaterThan(height);
      expect($node[0].scrollWidth).to.equal($node[0].clientWidth);
      expect(getComputedStyle($node[0]).maxHeight).to.equal('none');
      expect(getComputedStyle($node[0]).overflow).to.equal('visible');
    });
  });
  scenario(
    2,
    'caller Griffel classes override generated root and media styles without losing stable class names',
    () => {
      const useOverrides = makeStyles({
        root: { paddingBottom: '21px' },
        media: { marginBottom: '25px', justifyContent: 'flex-start' },
      });
      const App = () => {
        const styles = useOverrides();
        return (
          <TeachingPopoverBody id="body" className={styles.root} media={{ className: styles.media, children: 'Media' }}>
            Content
          </TeachingPopoverBody>
        );
      };
      stage(<App />);
      body().should('have.css', 'padding-bottom', '21px').and('have.class', teachingPopoverBodyClassNames.root);
      media()
        .should('have.css', 'margin-bottom', '25px')
        .and('have.css', 'justify-content', 'flex-start')
        .and('have.class', teachingPopoverBodyClassNames.media);
    },
  );
  scenario(2, 'custom provider style hook runs after source styles and can override both slots', () => {
    const seen = cy.stub();
    stage(
      <CustomStyleHooksProvider_unstable
        value={{
          // eslint-disable-next-line @typescript-eslint/naming-convention -- Exact public hook key.
          useTeachingPopoverBodyStyles_unstable: state => {
            if (typeof state !== 'object' || state === null || !('root' in state) || !('media' in state)) {
              throw new Error('Body style hook requires source Body state');
            }
            const sourceState = state as TeachingPopoverBodyState;
            seen(sourceState.root.className, sourceState.media?.className);
            sourceState.root.style = { ...sourceState.root.style, paddingBottom: 19 };
            if (sourceState.media) {
              sourceState.media.style = { ...sourceState.media.style, marginBottom: 23 };
            }
          },
        }}
      >
        <TeachingPopoverBody id="body" media="Media">
          Content
        </TeachingPopoverBody>
      </CustomStyleHooksProvider_unstable>,
    );
    body().should('have.css', 'padding-bottom', '19px');
    media().should('have.css', 'margin-bottom', '23px');
    cy.then(() => {
      expect(seen.firstCall.args[0]).to.contain(teachingPopoverBodyClassNames.root);
      expect(seen.firstCall.args[1]).to.contain(teachingPopoverBodyClassNames.media);
    });
  });
  scenario(2, 'slot render function preserves forwarded ref class style and native media click props', () => {
    const slotRef = React.createRef<HTMLSpanElement>();
    const clicked = cy.stub();
    render({
      media: {
        id: 'media',
        ref: slotRef,
        title: 'Custom media',
        style: { marginBottom: 17 },
        onClick: event => {
          events.push({ type: event.type, trusted: event.nativeEvent.isTrusted });
          clicked(event.currentTarget);
        },
        children: (Component: React.ElementType, slotProps: React.ComponentPropsWithRef<'span'>) => (
          <Component {...slotProps}>
            <span id="custom-child">Custom caption</span>
          </Component>
        ),
      },
    });
    media().should('have.attr', 'title', 'Custom media').and('have.css', 'margin-bottom', '17px');
    cy.get('#custom-child').realClick();
    media().then($node => {
      expect(slotRef.current).to.equal($node[0]);
      expect(clicked.firstCall.args[0]).to.equal($node[0]);
      expect(events).to.deep.equal([{ type: 'click', trusted: true }]);
    });
  });
  for (const [kind, alt] of [
    ['decorative', ''],
    ['named', 'Feature illustration'],
  ] as const) {
    scenario(2, `${kind} image has caller-owned accessible name and a trusted decoded local SVG load`, () => {
      cy.readFile('src/components/TeachingPopoverBody/testing/media.svg', 'utf8').then(svg => {
        cy.intercept('GET', '**/row138-media.svg', { headers: { 'content-type': 'image/svg+xml' }, body: svg });
      });
      stage(
        <TeachingPopoverBody
          id="body"
          style={{ width: 288 }}
          media={
            <img
              id="loaded-image"
              src="/row138-media.svg"
              alt={alt}
              style={{ width: '100%', objectFit: 'cover' }}
              onLoad={event => events.push({ type: event.type, trusted: event.nativeEvent.isTrusted })}
            />
          }
        >
          Content
        </TeachingPopoverBody>,
      );
      cy.get('#loaded-image')
        .should($node => {
          const image = $node[0] as HTMLImageElement;
          expect(image.complete).to.equal(true);
          expect(image.naturalWidth).to.equal(288);
          expect(image.naturalHeight).to.equal(176);
          expect(computeAccessibleName(image)).to.equal(alt);
        })
        .then($node => ($node[0] as HTMLImageElement).decode());
      cy.wrap(null).should(() => expect(events).to.deep.equal([{ type: 'load', trusted: true }]));
      cy.get('#loaded-image').should('have.css', 'object-fit', 'cover');
      media().should('have.css', 'object-fit', 'fill').and('have.css', 'max-height', 'none');
    });
  }
  scenario(2, 'native child button click bubbles only through caller media and root handlers', () => {
    const order: string[] = [];
    stage(
      <TeachingPopoverBody
        id="body"
        onClick={event => {
          order.push('root');
          events.push({ type: event.type, trusted: event.nativeEvent.isTrusted });
        }}
        media={{
          onClick: () => order.push('media'),
          children: <button onClick={() => order.push('button')}>Child action</button>,
        }}
      >
        Content
      </TeachingPopoverBody>,
    );
    cy.contains('button', 'Child action').realClick();
    cy.then(() => expect(order).to.deep.equal(['button', 'media', 'root']));
    body().should('not.have.attr', 'aria-expanded');
  });
  scenario(2, 'consumer stopPropagation prevents root notification without Body adding behavior', () => {
    const rootClick = cy.stub();
    stage(
      <TeachingPopoverBody id="body" onClick={rootClick}>
        <button onClick={event => event.stopPropagation()}>Stop bubbling</button>
      </TeachingPopoverBody>,
    );
    cy.contains('button', 'Stop bubbling').realClick();
    cy.then(() => expect(rootClick).not.to.have.been.called);
  });
  scenario(2, 'native Tab follows media link then content button and skips the noninteractive Body root', () => {
    stage(
      <>
        <button id="before">Before</button>
        <TeachingPopoverBody
          id="body"
          media={
            <a id="media-link" href="#lesson">
              Read lesson
            </a>
          }
        >
          <button id="content-button">Action</button>
        </TeachingPopoverBody>
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#media-link').should('have.focus');
    cy.realPress('Tab');
    cy.get('#content-button').should('have.focus');
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
  });
  scenario(2, 'native form submission and input state belong to descendants not the Body', () => {
    const submitted = cy.stub();
    stage(
      <form
        onSubmit={event => {
          event.preventDefault();
          submitted(event.currentTarget);
          events.push({ type: event.type, trusted: event.nativeEvent.isTrusted });
        }}
      >
        <TeachingPopoverBody id="body">
          <label htmlFor="answer">Answer</label>
          <input id="answer" name="answer" />
          <button type="submit">Submit lesson</button>
        </TeachingPopoverBody>
      </form>,
    );
    cy.get('#answer').realClick().realType('Ready');
    cy.contains('button', 'Submit lesson').realClick();
    cy.then(() => {
      expect(submitted).to.have.been.calledOnce;
      expect(new FormData(submitted.firstCall.args[0]).get('answer')).to.equal('Ready');
      expect(events).to.deep.equal([{ type: 'submit', trusted: true }]);
    });
  });
  scenario(2, 'caller root keydown and focus handlers receive trusted native descendant events', () => {
    const focus = cy.stub();
    stage(
      <TeachingPopoverBody
        id="body"
        onFocus={focus}
        onKeyDown={event => events.push({ type: event.key, trusted: event.nativeEvent.isTrusted })}
      >
        <button id="native">Native action</button>
      </TeachingPopoverBody>,
    );
    cy.get('#native').realClick();
    cy.realPress('ArrowDown');
    cy.then(() => {
      expect(focus).to.have.been.calledOnce;
      expect(events).to.deep.equal([{ type: 'ArrowDown', trusted: true }]);
    });
    cy.get('#native').should('have.focus');
  });

  for (const [name, Story] of [
    ['Default', Default],
    ['AppearanceBrand', AppearanceBrand],
  ] as const) {
    scenario(
      3,
      `stable ${name} preserves exact media title text and action composition without patching the story`,
      () => {
        cy.readFile('src/components/TeachingPopoverBody/testing/media.svg', 'utf8').then(svg => {
          cy.intercept('GET', '**/fabric-website/assets/images/wireframe/image-square.png', {
            headers: { 'content-type': 'image/svg+xml' },
            body: svg,
          });
        });
        stage(<Story />);
        openStable();
        surface()
          .find('.fui-TeachingPopoverBody')
          .should('have.length', 1)
          .children()
          .then($nodes => expect(Array.from($nodes, node => node.tagName)).to.deep.equal(['SPAN', 'H2', 'DIV']));
        surface().find('h2').should('have.text', 'Teaching Bubble Title');
        surface().find('.fui-TeachingPopoverBody > div').should('have.text', 'This is a teaching popover body');
        surface().find('.fui-TeachingPopoverHeader').should('contain.text', 'Tips');
        surface()
          .find('img')
          .should('have.prop', 'complete', true)
          .and('have.prop', 'naturalWidth', 288)
          .and('have.attr', 'alt', 'test image')
          .and('have.css', 'object-fit', 'cover')
          .then($node => ($node[0] as HTMLImageElement).decode());
        audit('stable-page-1', 'stable-basic');
        cy.screenshot(`positive/stable-${name}`, { capture: 'viewport' });
        cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Page.bringToFront' }));
        cy.document().should(document => expect(document.hasFocus()).to.equal(true));
        cy.contains('.fui-TeachingPopoverFooter button', 'Learn more').realClick();
        surface().find('.fui-TeachingPopoverBody').should('be.visible');
        cy.contains('.fui-TeachingPopoverFooter button', 'Got it').realClick();
        surface().should('not.exist');
        cy.get('#row138-stage [aria-expanded]').should('have.focus');
      },
    );
  }
  for (const [name, Story, text] of [
    ['Carousel', Carousel, false],
    ['CarouselAppearanceBrand', CarouselBrand, false],
    ['CarouselText', CarouselText, true],
  ] as const) {
    scenario(3, `stable ${name} exposes only the current Body and decodes media on all three original pages`, () => {
      cy.readFile('src/components/TeachingPopoverBody/testing/media.svg', 'utf8').then(svg => {
        cy.intercept('GET', '**/fabric-website/assets/images/wireframe/image-square.png', {
          headers: { 'content-type': 'image/svg+xml' },
          body: svg,
        });
      });
      stage(<Story />);
      openStable();
      const page = (index: number) => {
        settled();
        surface()
          .find('[data-carousel-active-item="true"]')
          .should('have.length', 1)
          .find('.fui-TeachingPopoverBody')
          .should('have.length', 1)
          .and('contain.text', `This is page: ${index}`);
        surface().find('[data-carousel-active-item="false"]').should('have.length', 2).and('be.empty');
        surface()
          .find('.fui-TeachingPopoverBody')
          .should('have.length', 1)
          .children()
          .then($nodes => expect(Array.from($nodes, node => node.tagName)).to.deep.equal(['SPAN', 'H2', 'DIV']));
        surface().find('h2').should('have.text', 'Teaching Bubble Title');
        surface()
          .find('img')
          .should('have.prop', 'complete', true)
          .and('have.prop', 'naturalWidth', 288)
          .and('have.attr', 'alt', 'test image')
          .then($node => ($node[0] as HTMLImageElement).decode());
        if (text) {
          surface().find('.fui-TeachingPopoverCarouselPageCount').should('have.text', `${index} of 3`);
        } else {
          surface().find('[aria-selected="true"]').should('have.attr', 'aria-label', `Tip ${index}`);
        }
        audit(`stable-page-${index}`, text ? 'stable-carousel-text' : 'stable-carousel');
      };
      page(1);
      cy.contains('button', 'Next').realClick();
      page(2);
      cy.contains('button', 'Previous').realClick();
      surface().find('.fui-TeachingPopoverBody').should('contain.text', 'This is page: 1');
      cy.contains('button', 'Next').realClick();
      surface().find('.fui-TeachingPopoverBody').should('contain.text', 'This is page: 2');
      cy.contains('button', 'Next').realClick();
      page(3);
      cy.screenshot(`positive/stable-${name}`, { capture: 'viewport' });
      cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Page.bringToFront' }));
      cy.document().should(document => expect(document.hasFocus()).to.equal(true));
      cy.contains('button', 'Finish').realClick();
      surface().should('not.exist');
      openStable();
      surface().find('.fui-TeachingPopoverBody').should('contain.text', 'This is page: 1');
      cy.contains('button', 'Close').realClick();
      surface().should('not.exist');
    });
  }
  for (const [name, dark, appearance, background, foreground] of [
    ['light', false, undefined, 'rgb(255, 255, 255)', 'rgb(36, 36, 36)'],
    ['dark', true, undefined, 'rgb(41, 41, 41)', 'rgb(255, 255, 255)'],
    ['brand', false, 'brand', 'rgb(15, 108, 189)', 'rgb(255, 255, 255)'],
    ['inverted-source', false, 'inverted', 'rgb(51, 51, 51)', 'rgb(255, 255, 255)'],
  ] as const) {
    scenario(
      3,
      `${name} owner context supplies Body text color without inventing Body appearance or backgrounds`,
      () => {
        stage(
          <TeachingPopover defaultOpen trapFocus={false} appearance={appearance}>
            <TeachingPopoverTrigger>
              <button id="owner-trigger">Show themed lesson</button>
            </TeachingPopoverTrigger>
            <TeachingPopoverSurface aria-labelledby="body-heading" aria-describedby="body-description">
              <TeachingPopoverBody id="body" media="Media">
                <h2 id="body-heading">Feature heading</h2>
                <p id="body-description">Feature description</p>
              </TeachingPopoverBody>
            </TeachingPopoverSurface>
          </TeachingPopover>,
          dark,
        );
        settled();
        surface().should('have.css', 'background-color', background);
        body().should('have.css', 'color', foreground).and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
        surface().then($node => {
          expect(computeAccessibleName($node[0])).to.equal('Feature heading');
          expect(computeAccessibleDescription($node[0])).to.equal('Feature description');
        });
      },
    );
  }
  scenario(3, 'RTL changes inherited direction without reversing media heading and text DOM order', () => {
    stage(
      <TeachingPopoverBody id="body" media="Media" style={{ width: 288 }}>
        <h2>Heading</h2>
        <p>Content</p>
      </TeachingPopoverBody>,
      false,
      true,
    );
    body().should('have.css', 'direction', 'rtl').and('have.css', 'flex-direction', 'column');
    body()
      .children()
      .then($nodes => expect(Array.from($nodes, node => node.tagName)).to.deep.equal(['SPAN', 'H2', 'P']));
    body().should($node =>
      expect($node[0].querySelector('h2')!.getBoundingClientRect().top).to.be.greaterThan(
        $node[0].querySelector('span')!.getBoundingClientRect().bottom,
      ),
    );
  });
  scenario(3, 'forced colors uses real Chrome native media features while preserving Body layout and names', () => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: 'active' }] },
      }),
    );
    stage(
      <TeachingPopoverBody id="body" media="Media" style={{ width: 288 }}>
        <h2>Feature</h2>
        <button id="forced-action">Native action</button>
      </TeachingPopoverBody>,
    );
    body().should($node => {
      expect($node[0].ownerDocument.defaultView!.matchMedia('(forced-colors: active)').matches).to.equal(true);
      expect(getComputedStyle($node[0]).forcedColorAdjust).to.equal('auto');
      expect(getComputedStyle($node[0]).display).to.equal('flex');
      expect($node[0].querySelector('span')!.getBoundingClientRect().height).to.be.closeTo(117, 0.1);
      expect(computeAccessibleName($node[0].querySelector('button')!)).to.equal('Native action');
    });
    cy.get('#forced-action').realClick().should('have.focus');
    audit('forced-colors');
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });
  scenario(
    3,
    'live Body text media and size updates preserve open owner focus root identity and settled geometry',
    () => {
      const rootRef = React.createRef<HTMLDivElement>();
      const App = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <TeachingPopover defaultOpen trapFocus={false}>
            <TeachingPopoverTrigger>
              <button>Show update lesson</button>
            </TeachingPopoverTrigger>
            <TeachingPopoverSurface aria-labelledby="live-title" aria-describedby="live-description">
              <TeachingPopoverBody
                id="body"
                ref={rootRef}
                mediaLength={updated ? 'tall' : 'short'}
                media={updated ? 'Updated media' : 'Initial media'}
              >
                <TeachingPopoverTitle id="live-title">Live lesson</TeachingPopoverTitle>
                <p id="live-description">{updated ? 'Updated description' : 'Initial description'}</p>
                <button id="live-update" onClick={() => setUpdated(true)}>
                  Update content
                </button>
              </TeachingPopoverBody>
            </TeachingPopoverSurface>
          </TeachingPopover>
        );
      };
      stage(<App />);
      settled();
      let root: HTMLElement;
      let height = 0;
      body().then($node => {
        root = $node[0];
      });
      surface().then($node => {
        height = $node[0].getBoundingClientRect().height;
      });
      cy.get('#live-update').realClick().should('have.focus');
      body()
        .should('contain.text', 'Updated media')
        .and('contain.text', 'Updated description')
        .then($node => {
          expect($node[0]).to.equal(root);
          expect(rootRef.current).to.equal(root);
        });
      settled().should($node => {
        expect($node[0].getBoundingClientRect().height).to.be.greaterThan(height);
        expect(computeAccessibleDescription($node[0])).to.equal('Updated description');
      });
      cy.get('#live-update').should('have.focus');
    },
  );
  scenario(
    3,
    'nearest nested teaching surface owns Body description and inherits its own brand rather than the outer owner',
    () => {
      stage(
        <TeachingPopover defaultOpen trapFocus={false} appearance="inverted">
          <TeachingPopoverSurface aria-label="Outer lesson">
            <TeachingPopover defaultOpen trapFocus={false} appearance="brand">
              <TeachingPopoverTrigger>
                <button>Inner trigger</button>
              </TeachingPopoverTrigger>
              <TeachingPopoverSurface
                id="inner-surface"
                aria-labelledby="inner-heading"
                aria-describedby="inner-description"
              >
                <TeachingPopoverBody id="body">
                  <TeachingPopoverTitle id="inner-heading">Inner lesson</TeachingPopoverTitle>
                  <p id="inner-description">Inner description</p>
                </TeachingPopoverBody>
              </TeachingPopoverSurface>
            </TeachingPopover>
          </TeachingPopoverSurface>
        </TeachingPopover>,
      );
      settled();
      body()
        .should('have.css', 'color', 'rgb(255, 255, 255)')
        .then($node => {
          expect($node[0].closest('.fui-TeachingPopoverSurface')?.id).to.equal('inner-surface');
        });
      surface().should('have.length', 2);
      cy.get('#inner-surface')
        .should('have.css', 'background-color', 'rgb(15, 108, 189)')
        .then($node => {
          expect(computeAccessibleName($node[0])).to.equal('Inner lesson');
          expect(computeAccessibleDescription($node[0])).to.equal('Inner description');
        });
    },
  );
  scenario(3, 'native link Enter invokes caller navigation prevention without a Body-owned activation', () => {
    const activated = cy.stub();
    stage(
      <TeachingPopoverBody id="body">
        <a
          id="lesson-link"
          href="#feature"
          onClick={event => {
            event.preventDefault();
            activated(event.currentTarget);
            events.push({ type: event.type, trusted: event.nativeEvent.isTrusted });
          }}
        >
          Read feature
        </a>
      </TeachingPopoverBody>,
    );
    cy.get('#lesson-link').focus();
    cy.realPress('Enter');
    cy.then(() => {
      expect(activated).to.have.been.calledOnce;
      expect(events).to.deep.equal([{ type: 'click', trusted: true }]);
    });
    body().should('not.have.attr', 'role');
  });
  scenario(
    3,
    'root render function keeps forwarded root ref and props while composing the generated media before custom content',
    () => {
      const rootRef = React.createRef<HTMLDivElement>();
      const clicked = cy.stub();
      stage(
        <TeachingPopoverBody
          id="body"
          ref={rootRef}
          className="custom-root"
          title="Root composition"
          media="Media"
          onClick={clicked}
        >
          {(Component: React.ElementType, slotProps: React.ComponentPropsWithRef<'div'>) => (
            <Component {...slotProps}>
              {slotProps.children}
              <h2>Custom heading</h2>
              <button id="custom-root-action">Custom action</button>
            </Component>
          )}
        </TeachingPopoverBody>,
      );
      body()
        .should('have.attr', 'title', 'Root composition')
        .and('have.class', 'custom-root')
        .and('have.class', teachingPopoverBodyClassNames.root)
        .then($node => expect(rootRef.current).to.equal($node[0]));
      body()
        .children()
        .then($nodes => expect(Array.from($nodes, node => node.tagName)).to.deep.equal(['SPAN', 'H2', 'BUTTON']));
      cy.get('#custom-root-action').realClick();
      cy.then(() => expect(clicked).to.have.been.calledOnce);
    },
  );
  scenario(3, 'bare source hook and renderer create native ordered slots without adding full-component styles', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    stage(
      <RawBody id="body" ref={rootRef} media="Raw media">
        <h2>Raw heading</h2>
        <p>Raw content</p>
      </RawBody>,
    );
    body()
      .should('not.have.class', teachingPopoverBodyClassNames.root)
      .then($node => {
        expect(rootRef.current).to.equal($node[0]);
        expect(getComputedStyle($node[0]).display).to.equal('block');
        expect(getComputedStyle($node[0]).paddingBottom).to.equal('0px');
        expect(Array.from($node[0].children, node => node.tagName)).to.deep.equal(['SPAN', 'H2', 'P']);
      });
    body()
      .children()
      .first()
      .should('have.text', 'Raw media')
      .and('not.have.class', teachingPopoverBodyClassNames.media);
  });
  scenario(
    3,
    'public root facade resolves the exact component hook styles renderer classnames and useMediaStyles exports',
    () => {
      stage(
        <ComposedBody id="body" media="Export media">
          Export content
        </ComposedBody>,
      );
      cy.then(() => {
        expect(Facade.TeachingPopoverBody).to.equal(Local.TeachingPopoverBody);
        expect(Facade.useTeachingPopoverBody_unstable).to.equal(Local.useTeachingPopoverBody_unstable);
        expect(Facade.useTeachingPopoverBodyStyles_unstable).to.equal(Local.useTeachingPopoverBodyStyles_unstable);
        expect(Facade.renderTeachingPopoverBody_unstable).to.equal(Local.renderTeachingPopoverBody_unstable);
        expect(Facade.teachingPopoverBodyClassNames).to.equal(Local.teachingPopoverBodyClassNames);
        expect(Facade.useMediaStyles).to.equal(Local.useMediaStyles);
      });
      body().should('contain.text', 'Export media').and('contain.text', 'Export content');
    },
  );
  scenario(3, 'live native handler replacement uses current root and media callbacks on unchanged DOM nodes', () => {
    const observed: string[] = [];
    const App = () => {
      const [version, setVersion] = React.useState(0);
      return (
        <>
          <button id="replace-handler" onClick={() => setVersion(1)}>
            Replace handlers
          </button>
          <TeachingPopoverBody
            id="body"
            onClick={() => observed.push(`root-${version}`)}
            media={{
              id: 'media',
              onClick: event => {
                observed.push(`media-${version}`);
                events.push({ type: event.type, trusted: event.nativeEvent.isTrusted });
              },
              children: <button id="handler-action">Media action</button>,
            }}
          >
            Content {version}
          </TeachingPopoverBody>
        </>
      );
    };
    stage(<App />);
    let node: HTMLElement;
    media().then($node => {
      node = $node[0];
    });
    cy.get('#handler-action').realClick();
    cy.get('#replace-handler').realClick();
    body().should('contain.text', 'Content 1');
    cy.get('#handler-action').realClick();
    media().then($node => expect($node[0]).to.equal(node));
    cy.then(() => expect(observed).to.deep.equal(['media-0', 'root-0', 'media-1', 'root-1']));
  });
});
