import * as React from 'react';
import * as axe from 'axe-core';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Button,
  Image,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import type { JSXElement, SlotRenderFunction, FluentProviderCustomStyleHooks } from '@fluentui/react-components';
import { CardPreview } from '../CardPreview';
import type { CardPreviewProps, CardPreviewState } from '../CardPreview.types';
import { useCardPreview_unstable, useCardPreviewBase_unstable } from '../useCardPreview';
import { renderCardPreview_unstable } from '../renderCardPreview';
import { cardPreviewClassNames, useCardPreviewStyles_unstable } from '../useCardPreviewStyles.styles';
import { Card } from '../../Card/Card';
import type { CardProps } from '../../Card/Card.types';
import { CardHeader } from '../../CardHeader/CardHeader';
import { CardProvider } from '../../Card/CardContext';
import { Default } from '../../../../../stories/src/CardPreview/CardPreviewDefault.stories';
import { Default as DefaultCard } from '../../../../../stories/src/Card/CardDefault.stories';
import { Orientation } from '../../../../../stories/src/Card/CardOrientation.stories';
import { Selectable } from '../../../../../stories/src/Card/CardSelectable.stories';
import { SelectableIndicator } from '../../../../../stories/src/Card/CardSelectableIndicator.stories';
import { Disabled } from '../../../../../stories/src/Card/CardDisabled.stories';
import { FocusMode } from '../../../../../stories/src/Card/CardFocusMode.stories';
import { WithAction } from '../../../../../stories/src/Card/CardAction.stories';
import { Templates } from '../../../../../stories/src/Card/CardTemplates.stories';

const round = Number(Cypress.env('coverageRound') || 6);
const defaultEvidenceDirectory = `src/components/CardPreview/.cypress-downloads/standard-${Date.now()}`;
const evidencePath = (name: string, fallback: string): string => {
  const value: unknown = Cypress.env(name);
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a nonempty evidence filename`);
  }
  return value;
};
const auditPath = evidencePath('cardPreviewAuditPath', `${defaultEvidenceDirectory}/audits.jsonl`);
const paintPath = evidencePath('cardPreviewPaintPath', `${defaultEvidenceDirectory}/paint.jsonl`);
const labelOf = (selector: string, expected: string) =>
  cy.get(selector).should($el => expect(computeAccessibleName($el[0])).to.equal(expected));
const ActionPicture = ({ onAction }: { onAction?: () => void }) => (
  <Picture
    logo={{
      children: (
        <Button id="badge-action" onClick={onAction} style={{ minWidth: 32, padding: 0 }}>
          App
        </Button>
      ),
      style: { width: 40, backgroundColor: '#fff' },
    }}
  />
);
const image = (width = 320, height = 180, color = '#dbeafe') =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${color}"/><circle cx="${
      width / 2
    }" cy="${height / 2}" r="${height / 4}" fill="#185abd"/></svg>`,
  )}`;
const preview = () => cy.get('#preview');
const logo = () => cy.get('.fui-CardPreview__logo');
const render = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) => {
  mount(
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={dir}>
      <main id="fixture" style={{ padding: 16 }}>
        {element}
      </main>
    </FluentProvider>,
  );
  cy.get('body').realHover({ position: 'topLeft' });
};
const loaded = (selector = '#fixture img') =>
  cy.get<HTMLImageElement>(selector).should($images => {
    expect($images.length).to.be.greaterThan(0);
    Array.from($images).forEach(img => {
      expect(img.complete, img.src).to.equal(true);
      expect(img.naturalWidth, img.src).to.be.greaterThan(0);
      expect(img.naturalHeight, img.src).to.be.greaterThan(0);
    });
  });
const near = (actual: number, expected: number, message: string) =>
  expect(actual, message).to.be.closeTo(expected, 0.6);
const geometry = (withLogo = true) =>
  preview().should($root => {
    const root = $root[0];
    const win = root.ownerDocument.defaultView!;
    const rect = root.getBoundingClientRect();
    expect(win.getComputedStyle(root).position).to.equal('relative');
    const img = root.querySelector<HTMLImageElement>(':scope > img')!;
    near(img.getBoundingClientRect().width, rect.width, 'image fills actual preview width');
    near(img.getBoundingClientRect().height, rect.height, 'image fills actual preview height');
    expect(win.getComputedStyle(img).display).to.equal('block');
    if (withLogo) {
      const badge = root.querySelector<HTMLElement>('.fui-CardPreview__logo')!;
      const badgeRect = badge.getBoundingClientRect();
      near(badgeRect.width, 32, 'logo width');
      near(badgeRect.height, 32, 'logo height');
      near(rect.bottom - badgeRect.bottom, 12, 'logo bottom inset');
      near(
        badgeRect.left - rect.left,
        win.getComputedStyle(root).direction === 'rtl' ? rect.width - 44 : 12,
        'logical logo start',
      );
      expect(win.getComputedStyle(badge).position).to.equal('absolute');
    }
  });
const renderStory = (element: JSXElement) => {
  const assets = [
    'docx.png',
    'doc_template.png',
    'avatar_elvia.svg',
    'app_logo.svg',
    'office1.png',
    'office2.png',
    'pptx.png',
    'sales_template.png',
    'logo3.svg',
    'intelligence.png',
    'xlsx.png',
    'logo.svg',
    'logo2.svg',
  ];
  const bytes = new Map<string, string>();
  assets.forEach(name => {
    cy.readFile(`../stories/src/assets/${name}`, 'base64', { log: false }).then(data => bytes.set(name, data));
  });
  cy.then(() => {
    cy.intercept(
      'GET',
      'https://raw.githubusercontent.com/microsoft/fluentui/master/packages/react-components/react-card/stories/src/assets/*',
      request => {
        const name = new URL(request.url).pathname.split('/').pop()!;
        expect(assets).to.include(name);
        const content = bytes.get(name);
        expect(content, `checked-in ${name}`).to.be.a('string').and.not.be.empty;
        request.reply({
          statusCode: 200,
          headers: { 'content-type': name.endsWith('.svg') ? 'image/svg+xml' : 'image/png' },
          fixture: `../../../packages/react-components/react-card/stories/src/assets/${name},null`,
        });
      },
    );
    render(element);
    loaded();
  });
};
const Picture = React.forwardRef<HTMLDivElement, CardPreviewProps>((props, ref) => (
  <CardPreview
    ref={ref}
    id="preview"
    style={{ width: 320, height: 180 }}
    logo={{ as: 'img', src: image(32, 32), alt: 'Document app' }}
    {...props}
  >
    <img id="image" src={image()} alt="Document preview" />
  </CardPreview>
));
const CardFixture = ({ cardProps, children }: { cardProps?: CardProps; children?: React.ReactNode }) => (
  <>
    <button id="before">Before</button>
    <Card id="card" aria-label="Document" style={{ width: 360 }} {...cardProps}>
      {children || <Picture style={{ height: 180 }} />}
      <div>
        <Button id="open">Open</Button>
        <Button id="share">Share</Button>
      </div>
    </Card>
    <button id="after">After</button>
  </>
);

const screenshotPixels = (name: string, points: number[][]) => {
  let screenshotPath = '';
  preview().screenshot(name, {
    onAfterScreenshot: (_element, details) => {
      screenshotPath = details.path;
    },
  });
  return cy
    .then(() => {
      expect(screenshotPath, 'actual screenshot absolute path').not.to.equal('');
      return cy.readFile(screenshotPath, 'base64', { log: false });
    })
    .then(encoded =>
      cy.window().then(
        win =>
          new Cypress.Promise<{ width: number; height: number; colors: number[][] }>((resolve, reject) => {
            const picture = new win.Image();
            picture.onerror = () => reject(new Error('Cannot decode actual screenshot'));
            picture.onload = () => {
              const canvas = win.document.createElement('canvas');
              canvas.width = picture.naturalWidth;
              canvas.height = picture.naturalHeight;
              const context = canvas.getContext('2d');
              if (!context) {
                reject(new Error('Missing screenshot canvas context'));
                return;
              }
              context.drawImage(picture, 0, 0);
              resolve({
                width: canvas.width,
                height: canvas.height,
                colors: points.map(([x, y]) => {
                  expect(x).to.be.within(0, canvas.width - 1);
                  expect(y).to.be.within(0, canvas.height - 1);
                  return Array.from(context.getImageData(x, y, 1, 1).data);
                }),
              });
            };
            picture.src = `data:image/png;base64,${encoded}`;
          }),
      ),
    )
    .then(report => {
      return cy
        .writeFile(paintPath, `${JSON.stringify({ name, points, ...report })}\n`, {
          flag: 'a+',
          log: false,
        })
        .then(() => report);
    });
};

const profileFor = (scenario: string) =>
  scenario === 'R1.04 preserves unit snapshot text before the logo wrapper and static slot classes'
    ? 'snapshot-logo-text-overlap'
    : scenario === 'R1.05 logo 0 follows optional slot nullish semantics'
    ? 'numeric-logo-image-background'
    : scenario === 'R3.04 direct preview image aria-label provides the source-supported internal checkbox name'
    ? 'empty-alt-global-aria'
    : /^R4\.01 (ltr|rtl) (no-tab|tab-exit|tab-only) keeps preview actions reachable by real Tab Enter and Escape$/.test(
        scenario,
      ) ||
      /^R4\.18 (no-tab|tab-exit|tab-only) preserves reverse native Tab from the second preview action$/.test(
        scenario,
      ) ||
      scenario === 'R4.21 current interactive Card defaults to no-tab and keeps preview logo actions reachable'
    ? 'groupper-sentinels'
    : scenario === 'R4.12 stable FocusMode story keeps four loaded previews and real keyboard entry'
    ? 'focus-story-sentinels'
    : scenario === 'R4.13 stable Disabled story retains all ten previews and disables the five matching action pairs'
    ? 'disabled-story-sentinels-and-labels'
    : 'clean';

afterEach(() => {
  cy.get('#fixture').then($scope =>
    cy
      .then(() => axe.run($scope[0]))
      .then(result => {
        const report = {
          scenario: Cypress.currentTest.title,
          classification: profileFor(Cypress.currentTest.title),
          phase: 'afterEach-current-live-fixture',
          passes: result.passes.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => node.target) })),
          target: '#fixture',
          evaluatedNodes: result.passes.reduce((sum, rule) => sum + rule.nodes.length, 0),
          violations: result.violations,
          incomplete: result.incomplete,
          negativeMutants: [] as string[],
          findingNodes: [...result.violations, ...result.incomplete].flatMap(rule =>
            rule.nodes.map(node => {
              const element = $scope[0].ownerDocument.querySelector(String(node.target[0]));
              if (!element) {
                throw new Error('An audited finding must resolve to its actual live element');
              }
              return {
                rule: rule.id,
                target: node.target,
                tagName: element.tagName,
                name: computeAccessibleName(element),
                role: element.getAttribute('role'),
                tabindex: element.getAttribute('tabindex'),
              };
            }),
          ),
        };
        const validate = () => {
          expect(report.classification).to.equal(profileFor(report.scenario));
          expect(report.phase).to.equal('afterEach-current-live-fixture');
          expect(report.target).to.equal('#fixture');
          expect(report.passes.length, 'axe ran applicable rules').to.be.greaterThan(0);
          expect(report.evaluatedNodes, 'axe evaluated actual nodes').to.be.greaterThan(0);
          if (report.classification === 'empty-alt-global-aria') {
            expect(
              result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
            ).to.deep.equal([{ id: 'presentation-role-conflict', targets: [['#image']] }]);
            const node = result.violations[0].nodes[0];
            expect(node.any).to.deep.equal([]);
            expect(node.all).to.deep.equal([]);
            expect(node.none.map(check => ({ id: check.id, data: check.data }))).to.deep.equal([
              { id: 'has-global-aria-attribute', data: ['aria-label'] },
            ]);
            expect(node.failureSummary).to.equal(
              'Fix all of the following:\n  Element does not have global ARIA attribute',
            );
            const img = $scope[0].querySelector('#image')!;
            expect(img.tagName).to.equal('IMG');
            expect(img.getAttribute('alt')).to.equal('');
            expect(img.getAttribute('aria-label')).to.equal('ARIA document');
            expect(img.getAttribute('role')).to.equal(null);
            expect(img.getAttribute('tabindex')).to.equal(null);
            expect(computeAccessibleName(img)).to.equal('ARIA document');
          } else if (
            report.classification === 'groupper-sentinels' ||
            report.classification === 'focus-story-sentinels' ||
            report.classification === 'disabled-story-sentinels-and-labels'
          ) {
            const disabledStory = report.classification === 'disabled-story-sentinels-and-labels';
            expect(result.violations.map(({ id }) => id)).to.deep.equal(
              disabledStory ? ['aria-hidden-focus', 'label'] : ['aria-hidden-focus'],
            );
            const story = report.classification === 'focus-story-sentinels';
            const cards = story
              ? Array.from($scope[0].querySelectorAll('.fui-Card')).slice(1)
              : disabledStory
              ? [$scope[0].querySelectorAll('.fui-Card')[2]]
              : [$scope[0].querySelector('#card')!];
            expect(cards).to.have.length(story ? 3 : 1);
            const sentinels = cards.flatMap(card => [card.previousElementSibling, card.nextElementSibling]);
            expect(result.violations[0].nodes).to.have.length(story ? 6 : 2);
            result.violations[0].nodes.forEach((node, index) => {
              expect(node.target).to.have.length(1);
              expect($scope[0].ownerDocument.querySelector(String(node.target[0]))).to.equal(sentinels[index]);
              const sentinel = sentinels[index]!;
              expect(sentinel.tagName).to.equal('I');
              expect(sentinel.getAttribute('role')).to.equal('none');
              expect(sentinel.getAttribute('tabindex')).to.equal('0');
              expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
              expect(computeAccessibleName(sentinel)).to.equal('');
              expect(sentinel.hasAttribute('aria-label')).to.equal(false);
              expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
                `isFirst=${index % 2 === 0}, isOutside=true, (Groupper, tabbable=true)`,
              );
              expect(node.any).to.deep.equal([]);
              expect(node.none).to.deep.equal([]);
              expect(
                node.all.map(check => ({
                  id: check.id,
                  data: check.data,
                  impact: check.impact,
                  message: check.message,
                })),
              ).to.deep.equal([
                {
                  id: 'focusable-not-tabbable',
                  data: null,
                  impact: 'serious',
                  message: 'Focusable content should have tabindex="-1" or be removed from the DOM',
                },
              ]);
              expect(node.all[0].relatedNodes?.map(related => related.target)).to.deep.equal([node.target]);
              expect(node.failureSummary).to.equal(
                'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM',
              );
            });
            if (disabledStory) {
              const unnamed = [6, 7].map(
                index =>
                  $scope[0]
                    .querySelectorAll('.fui-Card')
                    [index].querySelector('.fui-Card__floatingAction .fui-Checkbox__input')!,
              );
              expect(result.violations[1].nodes).to.have.length(2);
              result.violations[1].nodes.forEach((node, index) => {
                expect(node.target).to.have.length(1);
                expect($scope[0].ownerDocument.querySelector(String(node.target[0]))).to.equal(unnamed[index]);
                expect(unnamed[index].tagName).to.equal('INPUT');
                expect(unnamed[index].getAttribute('type')).to.equal('checkbox');
                expect(unnamed[index].getAttribute('role')).to.equal(null);
                expect(unnamed[index].getAttribute('tabindex')).to.equal(null);
                expect(unnamed[index].hasAttribute('disabled')).to.equal(index === 1);
                expect(computeAccessibleName(unnamed[index])).to.equal('');
                expect(node.any.map(check => check.id)).to.deep.equal([
                  'implicit-label',
                  'explicit-label',
                  'aria-label',
                  'aria-labelledby',
                  'non-empty-title',
                  'non-empty-placeholder',
                  'presentational-role',
                ]);
                expect(node.all).to.deep.equal([]);
                expect(node.none).to.deep.equal([]);
                expect(node.any.map(check => check.data)).to.deep.equal([
                  null,
                  null,
                  null,
                  null,
                  { messageKey: 'noAttr' },
                  { messageKey: 'noAttr' },
                  null,
                ]);
                expect(
                  node.any.every(check => check.impact === 'critical' && check.relatedNodes?.length === 0),
                ).to.equal(true);
                expect(node.failureSummary).to.equal(
                  'Fix any of the following:\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element has no placeholder attribute\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                );
              });
            }
          } else {
            expect(report.violations, 'unknown accessibility violations').to.deep.equal([]);
          }
          if (
            report.classification === 'snapshot-logo-text-overlap' ||
            report.classification === 'numeric-logo-image-background'
          ) {
            const snapshot = report.classification === 'snapshot-logo-text-overlap';
            expect(report.scenario).to.equal(
              snapshot
                ? 'R1.04 preserves unit snapshot text before the logo wrapper and static slot classes'
                : 'R1.05 logo 0 follows optional slot nullish semantics',
            );
            expect(
              result.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
            ).to.deep.equal([{ id: 'color-contrast', targets: [['.fui-CardPreview__logo']] }]);
            const node = result.incomplete[0].nodes[0];
            expect(node.any.map(check => check.id)).to.deep.equal(['color-contrast']);
            expect(node.all).to.deep.equal([]);
            expect(node.none).to.deep.equal([]);
            expect(JSON.parse(JSON.stringify(node.any[0].data))).to.deep.equal({
              contrastRatio: 0,
              fontSize: '10.5pt (14px)',
              fontWeight: 'normal',
              messageKey: snapshot ? 'elmPartiallyObscuring' : 'shortTextContent',
              expectedContrastRatio: '4.5:1',
            });
            expect(node.failureSummary).to.equal(
              snapshot
                ? "Fix any of the following:\n  Element's background color could not be determined because it partially overlaps other elements"
                : 'Fix any of the following:\n  Element content is too short to determine if it is actual text content',
            );
            expect($scope[0].querySelector('.fui-CardPreview__logo')!.textContent).to.equal(
              snapshot ? 'Logo slot' : '0',
            );
            const badge = $scope[0].querySelector('.fui-CardPreview__logo')!;
            expect(badge.tagName).to.equal('DIV');
            expect(badge.getAttribute('role')).to.equal(null);
            expect(badge.getAttribute('tabindex')).to.equal(null);
            expect(computeAccessibleName(badge)).to.equal('');
            expect(node.any[0].relatedNodes?.map(related => related.target)).to.deep.equal(snapshot ? [] : [['img']]);
          } else {
            expect(report.incomplete, 'unknown accessibility incompletes').to.deep.equal([]);
          }
        };
        return cy
          .writeFile(`${auditPath}.raw`, `${JSON.stringify(report)}\n`, {
            flag: 'a+',
            log: false,
          })
          .then(() => {
            validate();
            if (report.classification !== 'clean') {
              const scenario = report.scenario;
              report.scenario = `${scenario} unrelated`;
              expect(validate, 'different scenario must be rejected').to.throw();
              report.scenario = scenario;
              report.negativeMutants.push('scenario');
              const phase = report.phase;
              report.phase = 'unverified-phase';
              expect(validate, 'different phase must be rejected').to.throw();
              report.phase = phase;
              report.negativeMutants.push('phase');
              for (const rules of [result.violations, result.incomplete]) {
                for (const rule of rules) {
                  const id = rule.id;
                  rule.id = 'unknown-rule';
                  expect(validate, 'unknown rule must be rejected').to.throw();
                  rule.id = id;
                  report.negativeMutants.push(`${id}:rule`);
                  const node = rule.nodes[0];
                  rule.nodes.push(node);
                  expect(validate, 'extra finding node must be rejected').to.throw();
                  rule.nodes.pop();
                  report.negativeMutants.push(`${id}:count`);
                  const target = node.target;
                  node.target = ['#fixture'];
                  expect(validate, 'different target must be rejected').to.throw();
                  node.target = target;
                  report.negativeMutants.push(`${id}:target`);
                  const check = node.any[0] || node.all[0] || node.none[0];
                  const checkId = check.id;
                  check.id = 'unknown-check';
                  expect(validate, 'different check must be rejected').to.throw();
                  check.id = checkId;
                  report.negativeMutants.push(`${id}:check`);
                  if (id === 'aria-hidden-focus') {
                    const sentinel = $scope[0].ownerDocument.querySelector(String(target[0]))!;
                    sentinel.setAttribute('tabindex', '-1');
                    expect(validate, 'different tabindex must be rejected').to.throw();
                    sentinel.setAttribute('tabindex', '0');
                    sentinel.setAttribute('role', 'presentation');
                    expect(validate, 'different role must be rejected').to.throw();
                    sentinel.setAttribute('role', 'none');
                    sentinel.setAttribute('aria-label', 'Not the baseline sentinel');
                    expect(validate, 'different name attribute must be rejected').to.throw();
                    sentinel.removeAttribute('aria-label');
                    report.negativeMutants.push(`${id}:tabindex`, `${id}:role`, `${id}:name`);
                  }
                }
              }
              validate();
            }
            return cy.writeFile(auditPath, `${JSON.stringify(report)}\n`, {
              flag: 'a+',
              log: false,
            });
          });
      }),
  );
});

if (round >= 5) {
  describe('ONLY128 CardPreview R5 adversarial native media and state integration', () => {
    it('R5.01 explicit supported root as div forwards frozen consumer props without mutating the logo object', () => {
      const rootStyle = Object.freeze({ width: 320, height: 180 });
      const badgeStyle = Object.freeze({ width: 32, height: 32 });
      const badge = Object.freeze({
        as: 'img' as const,
        id: 'frozen-logo',
        src: image(32, 32),
        alt: 'Frozen app',
        className: 'frozen-badge',
        style: badgeStyle,
      });
      const props = Object.freeze({
        as: 'div' as const,
        id: 'preview',
        className: 'frozen-root',
        style: rootStyle,
        logo: badge,
      });
      render(
        <CardPreview {...props}>
          <img id="image" src={image()} alt="Immutable preview" />
        </CardPreview>,
      );
      loaded();
      geometry();
      preview().should('match', 'div').and('have.class', 'frozen-root').and('not.have.attr', 'as');
      logo().should('have.class', 'frozen-badge').and('have.id', 'frozen-logo');
      cy.then(() => {
        expect(props.className).to.equal('frozen-root');
        expect(badge.className).to.equal('frozen-badge');
        expect(props.style).to.equal(rootStyle);
        expect(badge.style).to.equal(badgeStyle);
        expect(Object.keys(badge)).to.deep.equal(['as', 'id', 'src', 'alt', 'className', 'style']);
      });
    });
    it('R5.02 native trusted image click preserves capture bubble order event identity and exact owner refs', () => {
      const entries: string[] = [];
      const events: Event[] = [];
      const ref = React.createRef<HTMLDivElement>();
      const record = (name: string) => (event: React.MouseEvent<HTMLElement>) => {
        entries.push(`${name}:${event.currentTarget.id}:${(event.target as HTMLElement).id}`);
        events.push(event.nativeEvent);
        expect(event.nativeEvent.isTrusted).to.equal(true);
        expect(event.currentTarget.ownerDocument).to.equal(ref.current!.ownerDocument);
      };
      render(
        <div id="outer" onClickCapture={record('outer-capture')} onClick={record('outer-bubble')}>
          <CardPreview
            ref={ref}
            id="preview"
            onClickCapture={record('preview-capture')}
            onClick={record('preview-bubble')}
            style={{ width: 320, height: 180 }}
          >
            <img id="image" src={image()} alt="Event preview" onClick={record('image')} />
          </CardPreview>
        </div>,
      );
      loaded();
      cy.get('#image').realClick();
      preview().then($root => {
        expect(ref.current).to.equal($root[0]);
        expect(entries).to.deep.equal([
          'outer-capture:outer:image',
          'preview-capture:preview:image',
          'image:image:image',
          'preview-bubble:preview:image',
          'outer-bubble:outer:image',
        ]);
        expect(events).to.have.length(5);
        expect(events.every(event => event === events[0])).to.equal(true);
      });
    });
    it('R5.03 native focusable image Enter and Space bubble keys without inventing preview activation', () => {
      const key = cy.stub().as('passiveKey');
      const click = cy.stub().as('passiveClick');
      render(
        <CardPreview
          id="preview"
          onKeyDown={event =>
            key(event.key, event.currentTarget.id, (event.target as HTMLElement).id, event.nativeEvent.isTrusted)
          }
          onClick={click}
        >
          <img id="image" tabIndex={0} src={image()} alt="Focusable consumer image" />
        </CardPreview>,
      );
      loaded();
      cy.get('#image').focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@passiveKey')
        .should('have.been.calledTwice')
        .then(() => {
          expect(key.firstCall.args).to.deep.equal(['Enter', 'preview', 'image', true]);
          expect(key.secondCall.args).to.deep.equal([' ', 'preview', 'image', true]);
        });
      cy.get('@passiveClick').should('not.have.been.called');
      preview().should('not.have.attr', 'tabindex');
      preview().should('not.have.attr', 'role');
    });
    it('R5.04 ordinary public Image remains the direct media child with loading fit and image semantics', () => {
      render(
        <CardPreview id="preview" style={{ width: 320, height: 180 }}>
          <Image id="image" src={image()} alt="Public Image preview" fit="contain" loading="eager" decoding="async" />
        </CardPreview>,
      );
      loaded();
      geometry(false);
      cy.get('#image')
        .should('have.class', 'fui-Image')
        .and('have.css', 'object-fit', 'contain')
        .and('have.attr', 'loading', 'eager');
      cy.get('#image').should('not.have.attr', 'decoding');
      labelOf('#image', 'Public Image preview');
      preview().children().should('have.length', 1);
    });
    it('R5.05 native picture sources remain inside a full-size media wrapper without a preview image substitute', () => {
      render(
        <CardPreview id="preview" style={{ width: 320, height: 180 }}>
          <picture id="media">
            <source type="image/svg+xml" srcSet={image()} />
            <img
              id="image"
              src={image(320, 180, '#ffffff')}
              alt="Responsive media preview"
              style={{ width: '100%', height: '100%' }}
            />
          </picture>
        </CardPreview>,
      );
      loaded();
      cy.get('#media').should($media => {
        near($media[0].getBoundingClientRect().width, 320, 'picture fills root width');
        near($media[0].getBoundingClientRect().height, 180, 'picture fills root height');
      });
      cy.get<HTMLImageElement>('#image').should($img => expect($img[0].currentSrc).to.equal(image()));
      preview().find('> img').should('not.exist');
      preview().find('picture > img').should('have.length', 1);
    });
    it('R5.06 actual image decoding bubbles supported root onLoad while native capture filtering remains explicit', () => {
      const calls: string[] = [];
      const capture = cy.stub().as('filteredLoadCapture');
      const rootRef = React.createRef<HTMLDivElement>();
      const childRef = React.createRef<HTMLImageElement>();
      render(
        <CardPreview
          id="preview"
          ref={rootRef}
          onLoadCapture={capture}
          onLoad={event => {
            expect(event.currentTarget).to.equal(rootRef.current);
            expect(event.target).to.equal(childRef.current);
            expect(event.nativeEvent.isTrusted).to.equal(true);
            calls.push('root-load');
          }}
        >
          <img
            id="image"
            ref={childRef}
            src={image(321, 181)}
            alt="Decoded preview"
            onLoad={event => {
              expect(event.currentTarget).to.equal(childRef.current);
              calls.push('image-load');
            }}
          />
        </CardPreview>,
      );
      loaded();
      cy.get<HTMLImageElement>('#image')
        .then($image => $image[0].decode())
        .then(() => {
          expect(calls).to.deep.equal(['image-load', 'root-load']);
        });
      cy.get('@filteredLoadCapture').should('not.have.been.called');
    });
    for (const partial of ['id', 'label'] as const) {
      it(`R5.07 partial ${partial} Card naming context does not suppress preview-derived label setters`, () => {
        const setReferenceLabel = cy.stub().as('partialLabel');
        const setReferenceId = cy.stub().as('partialId');
        render(
          <CardProvider
            value={{
              selectableA11yProps: {
                referenceId: partial === 'id' ? 'existing-description' : undefined,
                referenceLabel: partial === 'label' ? 'Existing label' : undefined,
                setReferenceId,
                setReferenceLabel,
              },
            }}
          >
            <Picture />
          </CardProvider>,
        );
        loaded();
        cy.get('@partialLabel').should('have.been.calledTwice').and('have.been.calledWith', 'Document preview');
        cy.get('@partialId').should('not.have.been.called');
      });
    }
    it('R5.08 replacing a context setter reruns image discovery while preserving the root node', () => {
      const first = cy.stub().as('firstContext');
      const second = cy.stub().as('secondContext');
      const setReferenceId = cy.stub();
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(true)}>
              Replace context
            </button>
            <CardProvider
              value={{ selectableA11yProps: { setReferenceId, setReferenceLabel: changed ? second : first } }}
            >
              <Picture />
            </CardProvider>
          </>
        );
      };
      render(<Fixture />);
      loaded();
      cy.get('@firstContext').should('have.been.calledTwice');
      preview().then($root => {
        const root = $root[0];
        cy.get('#update').realClick();
        cy.get('@secondContext').should('have.been.calledOnce').and('have.been.calledWith', 'Document preview');
        preview().should($next => expect($next[0]).to.equal(root));
        cy.get('@firstContext').should('have.been.calledTwice');
      });
    });
    it('R5.09 consumer image stopPropagation prevents root and selectable Card click dispatch without preview state', () => {
      const root = cy.stub().as('stoppedRoot');
      const selection = cy.stub().as('stoppedSelection');
      render(
        <CardFixture cardProps={{ defaultSelected: false, onSelectionChange: selection }}>
          <CardPreview id="preview" onClick={root}>
            <img id="image" src={image()} alt="Stopped preview" onClick={event => event.stopPropagation()} />
          </CardPreview>
        </CardFixture>,
      );
      loaded();
      cy.get('#image').realClick();
      cy.get('@stoppedRoot').should('not.have.been.called');
      cy.get('@stoppedSelection').should('not.have.been.called');
      cy.get('#card > input').should('not.be.checked');
      preview().should('not.have.attr', 'aria-selected');
    });
    it('R5.10 trusted native contextmenu reaches the passive root and honors consumer preventDefault', () => {
      const menu = cy.stub().as('nativeMenu');
      render(
        <Picture
          onContextMenu={event => {
            event.preventDefault();
            menu(
              event.type,
              event.currentTarget.id,
              (event.target as HTMLElement).id,
              event.defaultPrevented,
              event.nativeEvent.isTrusted,
            );
          }}
        />,
      );
      loaded();
      cy.get('#image').realClick({ button: 'right' });
      cy.get('@nativeMenu')
        .should('have.been.calledOnce')
        .then(() => {
          expect(menu.firstCall.args).to.deep.equal(['contextmenu', 'preview', 'image', true, true]);
        });
      preview().should('not.have.attr', 'role');
      preview().should('not.have.attr', 'tabindex');
    });
    it('R5.11 external controlled selection changes do not replace preview media or emit synthetic proposals', () => {
      const selection = cy.stub().as('externalSelection');
      const Fixture = () => {
        const [selected, setSelected] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setSelected(!selected)}>
              External selection
            </button>
            <CardFixture cardProps={{ selected, onSelectionChange: selection }} />
          </>
        );
      };
      render(<Fixture />);
      loaded();
      preview().then($root => {
        const root = $root[0];
        const media = root.querySelector('#image');
        cy.get('#update').realClick();
        cy.get('#card > input').should('be.checked');
        cy.get('@externalSelection').should('not.have.been.called');
        cy.get('#image').realClick();
        cy.get('@externalSelection')
          .should('have.been.calledOnce')
          .then(() => {
            expect(selection.firstCall.args[1]).to.deep.equal({ selected: false });
          });
        cy.get('#card > input').should('be.checked');
        preview().should($next => {
          expect($next[0]).to.equal(root);
          expect(root.querySelector('#image')).to.equal(media);
        });
      });
    });
    it('R5.12 static logo class excludes a consumer direct child from stretch rules without creating a logo slot', () => {
      render(
        <CardPreview id="preview" style={{ width: 320, height: 180 }}>
          <img
            id="image"
            className={cardPreviewClassNames.logo}
            src={image(40, 20)}
            alt="Consumer classified image"
            style={{ width: 40, height: 20 }}
          />
        </CardPreview>,
      );
      loaded();
      preview().children().should('have.length', 1);
      cy.get('#image').should($image => {
        near($image[0].getBoundingClientRect().width, 40, 'excluded direct child width');
        near($image[0].getBoundingClientRect().height, 20, 'excluded direct child height');
      });
    });
    for (const base of [false, true]) {
      it(`R5.13 ${
        base ? 'base' : 'standard'
      } hook state preserves components and style-hook return identity without hidden selection state`, () => {
        const ref = React.createRef<HTMLElement>();
        const usePreview = base ? useCardPreviewBase_unstable : useCardPreview_unstable;
        const Fixture = () => {
          const state = usePreview(
            { id: 'preview', children: <img id="image" src={image()} alt="Hook state preview" />, logo: null },
            ref,
          );
          // eslint-disable-next-line @typescript-eslint/no-deprecated -- Verify the existing exported state compatibility contract.
          expect(state.components).to.deep.equal({ root: 'div', logo: 'div' });
          expect(state.logo).to.equal(undefined);
          expect(useCardPreviewStyles_unstable(state)).to.equal(state);
          expect(Object.keys(state).sort()).to.deep.equal(['components', 'logo', 'root']);
          return renderCardPreview_unstable(state);
        };
        render(<Fixture />);
        loaded();
        preview().then($root => expect(ref.current).to.equal($root[0]));
        logo().should('not.exist');
      });
    }
    it('R5.14 nearest custom style hook receives root and logo builtins and never invokes the outer provider hook', () => {
      const outer = cy.stub().as('outerStyle');
      const inner = cy.stub().as('innerStyle');
      const useInnerPreviewStyles = (value: unknown) => {
        if (typeof value !== 'object' || value === null || !('root' in value) || !('components' in value)) {
          throw new Error('Expected actual preview state');
        }
        const state = value as CardPreviewState;
        expect(state.root.className).to.contain(cardPreviewClassNames.root);
        expect(state.logo!.className).to.contain(cardPreviewClassNames.logo);
        inner();
        state.root.style = { ...state.root.style, outline: '3px solid rgb(18, 52, 86)' };
      };
      const outerHooks: FluentProviderCustomStyleHooks = {};
      outerHooks.useCardPreviewStyles_unstable = outer;
      const innerHooks: FluentProviderCustomStyleHooks = {};
      innerHooks.useCardPreviewStyles_unstable = useInnerPreviewStyles;
      render(
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={outerHooks}>
          <FluentProvider theme={webLightTheme} customStyleHooks_unstable={innerHooks}>
            <Picture />
          </FluentProvider>
        </FluentProvider>,
      );
      loaded();
      geometry();
      cy.get('@innerStyle').should('have.been.calledTwice');
      cy.get('@outerStyle').should('not.have.been.called');
      preview().should('have.css', 'outline-width', '3px').and('have.css', 'outline-color', 'rgb(18, 52, 86)');
    });
    for (const loading of ['eager', 'lazy'] as const) {
      it(`R5.15 native image loading ${loading} remains consumer-controlled and decodes without preview placeholders`, () => {
        render(
          <CardPreview id="preview" style={{ width: 320, height: 180 }}>
            <img id="image" src={image(322, 182)} alt="Loading consumer preview" loading={loading} decoding="async" />
          </CardPreview>,
        );
        loaded();
        geometry(false);
        cy.get<HTMLImageElement>('#image')
          .should('have.attr', 'loading', loading)
          .and('have.attr', 'decoding', 'async')
          .then($img => $img[0].decode())
          .then(() => {
            preview().children().should('have.length', 1);
            preview().find('[role="progressbar"]').should('not.exist');
          });
      });
    }
  });
}

afterEach(() => {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [] },
    }),
  );
});

describe('ONLY128 CardPreview R1 documented anatomy and real image layout', () => {
  it('R1.01 mounts the unchanged stable Default story with loaded Word images and overlay', () => {
    renderStory(<Default />);
    cy.get('.fui-CardPreview')
      .should('have.length', 1)
      .find('> img')
      .should('have.attr', 'alt', 'Preview of a Word document ');
    logo().find('img').should('have.attr', 'alt', 'Microsoft Word logo');
    cy.get('.fui-CardPreview').should($el => {
      const rect = $el[0].getBoundingClientRect();
      near($el[0].querySelector('img')!.getBoundingClientRect().width, rect.width, 'story image fills preview');
      const badge = $el[0].querySelector('.fui-CardPreview__logo')!.getBoundingClientRect();
      near(rect.bottom - badge.bottom, 12, 'story logo bottom');
      near(badge.left - rect.left, 12, 'story logo left');
    });
  });
});
if (round >= 2) {
  describe('ONLY128 CardPreview R2 public slots native props refs and live composition', () => {
    it('R2.01 forwards native id title lang dir data role and ARIA relationships without leaking logo', () => {
      render(
        <>
          <h2 id="title">Document preview</h2>
          <p id="description">Quarterly report</p>
          <Picture
            role="group"
            title="Preview tooltip"
            lang="en"
            dir="rtl"
            data-source="local"
            aria-labelledby="title"
            aria-describedby="description"
          />
        </>,
        'rtl',
      );
      loaded();
      preview()
        .should('have.attr', 'title', 'Preview tooltip')
        .and('have.attr', 'lang', 'en')
        .and('have.attr', 'dir', 'rtl')
        .and('have.attr', 'data-source', 'local')
        .and('not.have.attr', 'logo');
      preview().should($root => {
        expect(computeAccessibleName($root[0])).to.equal('Document preview');
        expect(computeAccessibleDescription($root[0])).to.equal('Quarterly report');
      });
      geometry();
    });
    it('R2.02 native pointer and keyboard handlers receive the actual root and nested image target', () => {
      const click = cy.stub().as('click');
      const key = cy.stub().as('key');
      render(
        <Picture
          tabIndex={0}
          onClick={event => click(event.type, event.currentTarget.id, (event.target as HTMLElement).id)}
          onKeyDown={event => key(event.key, event.currentTarget.id)}
        />,
      );
      loaded();
      cy.get('#image').realClick();
      cy.get('@click').should('have.been.calledOnce').and('have.been.calledWith', 'click', 'preview', 'image');
      preview().focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@key').should('have.been.calledTwice');
      cy.get('@click').should('have.been.calledOnce');
    });
    it('R2.03 default preview is not a button and native Tab bypasses it for child actions', () => {
      render(
        <>
          <button id="before">Before</button>
          <CardPreview id="preview">
            <Button id="open">Open preview</Button>
          </CardPreview>
          <button id="after">After</button>
        </>,
      );
      preview().should('not.have.attr', 'role');
      preview().should('not.have.attr', 'tabindex');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#open').should('have.focus');
      cy.realPress('Tab');
      cy.get('#after').should('have.focus');
    });
    it('R2.04 logo JSX is wrapped once and native image shorthand is rendered as the slot itself', () => {
      render(
        <>
          <CardPreview id="wrapped" logo={<img id="inner-logo" src={image(32, 32)} alt="Wrapped app" />} />
          <CardPreview
            id="native"
            logo={{
              as: 'img',
              id: 'native-logo',
              src: image(32, 32),
              alt: 'Native app',
              title: 'Logo',
              loading: 'eager',
            }}
          />
        </>,
      );
      loaded();
      cy.get('#wrapped > div.fui-CardPreview__logo > #inner-logo').should('have.length', 1);
      cy.get('#native > img.fui-CardPreview__logo').should('have.id', 'native-logo').and('have.attr', 'title', 'Logo');
      cy.get('#native').find('div').should('not.exist');
    });
    it('R2.05 an explicit empty logo object renders an empty 32px slot', () => {
      render(<Picture logo={{ id: 'empty' }} />);
      loaded();
      logo().should('have.id', 'empty').and('be.empty');
      geometry();
    });
    it('R2.06 logo slot class style title data and ARIA are kept separate from the root', () => {
      const logoProps = {
        id: 'badge',
        className: 'consumer-logo',
        title: 'App badge',
        'data-logo': 'consumer',
        role: 'img',
        'aria-label': 'App badge',
        style: { backgroundColor: '#ffffff', borderRadius: 4 },
      };
      render(<Picture className="consumer-root" logo={logoProps} />);
      preview().should('have.class', 'consumer-root').and('not.have.attr', 'data-logo');
      logo()
        .should('have.class', 'consumer-logo')
        .and('have.class', cardPreviewClassNames.logo)
        .and('have.attr', 'data-logo', 'consumer')
        .and('have.css', 'border-radius', '4px');
      geometry();
    });
    it('R2.07 inline consumer root and logo dimensions override builtin geometry', () => {
      render(
        <Picture
          style={{ width: 300, height: 150, position: 'absolute' }}
          logo={{ as: 'img', src: image(32, 32), alt: 'App', style: { width: 48, height: 40, left: 20, bottom: 8 } }}
        />,
      );
      loaded();
      preview().should('have.css', 'position', 'absolute');
      logo().should($el => {
        const badge = $el[0].getBoundingClientRect();
        const root = $el[0].parentElement!.getBoundingClientRect();
        near(badge.width, 48, 'custom width');
        near(badge.height, 40, 'custom height');
        near(badge.left - root.left, 20, 'custom left');
        near(root.bottom - badge.bottom, 8, 'custom bottom');
      });
    });
    it('R2.08 Griffel classes merge after builtin root and logo styles', () => {
      const useStyles = makeStyles({
        root: { width: '280px', height: '160px', position: 'relative' },
        logo: { width: '44px', height: '36px', bottom: '6px', left: '18px' },
      });
      const Fixture = () => {
        const styles = useStyles();
        return (
          <CardPreview
            id="preview"
            className={styles.root}
            logo={{ as: 'img', src: image(32, 32), alt: 'App', className: styles.logo }}
          >
            <img src={image()} alt="Preview" />
          </CardPreview>
        );
      };
      render(<Fixture />);
      loaded();
      preview().should('have.css', 'width', '280px').and('have.css', 'height', '160px');
      logo()
        .should('have.css', 'width', '44px')
        .and('have.css', 'height', '36px')
        .and('have.css', 'bottom', '6px')
        .and('have.css', 'left', '18px');
    });
    for (const kind of ['object', 'callback'] as const) {
      it(`R2.09 ${kind} root ref identifies the native div and clears after a real unmount`, () => {
        const object = React.createRef<HTMLDivElement>();
        const callback = cy.stub().as('ref');
        const Fixture = () => {
          const [visible, setVisible] = React.useState(true);
          return (
            <>
              <button id="toggle" onClick={() => setVisible(!visible)}>
                Toggle
              </button>
              {visible && <Picture ref={kind === 'object' ? object : callback} />}
            </>
          );
        };
        render(<Fixture />);
        preview().then($el => {
          if (kind === 'object') {
            expect(object.current).to.equal($el[0]);
          } else {
            expect(callback.lastCall.args[0]).to.equal($el[0]);
          }
        });
        cy.get('#toggle').realClick();
        preview()
          .should('not.exist')
          .then(() => {
            if (kind === 'object') {
              expect(object.current).to.equal(null);
            } else {
              expect(callback.lastCall.args[0]).to.equal(null);
            }
          });
      });
      it(`R2.10 ${kind} logo ref identifies the chosen native img and clears on slot removal`, () => {
        const object = React.createRef<HTMLImageElement>();
        const callback = cy.stub().as('logoRef');
        const Fixture = () => {
          const [visible, setVisible] = React.useState(true);
          return (
            <>
              <button id="toggle" onClick={() => setVisible(!visible)}>
                Toggle
              </button>
              <Picture
                logo={
                  visible
                    ? { as: 'img', ref: kind === 'object' ? object : callback, src: image(32, 32), alt: 'App' }
                    : null
                }
              />
            </>
          );
        };
        render(<Fixture />);
        loaded();
        logo().then($el => {
          if (kind === 'object') {
            expect(object.current).to.equal($el[0]);
          } else {
            expect(callback.lastCall.args[0]).to.equal($el[0]);
          }
        });
        cy.get('#toggle').realClick();
        logo()
          .should('not.exist')
          .then(() => {
            if (kind === 'object') {
              expect(object.current).to.equal(null);
            } else {
              expect(callback.lastCall.args[0]).to.equal(null);
            }
          });
        geometry(false);
      });
    }
    it('R2.11 replacing forwarded root callback refs clears the old ref without replacing the node', () => {
      const first = cy.stub();
      const second = cy.stub();
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(true)}>
              Update
            </button>
            <Picture ref={changed ? second : first} />
          </>
        );
      };
      render(<Fixture />);
      preview().then($el => {
        const root = $el[0];
        expect(first.lastCall.args[0]).to.equal(root);
        cy.get('#update').realClick();
        preview()
          .should($next => expect($next[0]).to.equal(root))
          .then(() => {
            expect(first.lastCall.args[0]).to.equal(null);
            expect(second.lastCall.args[0]).to.equal(root);
          });
      });
    });
    for (const children of [undefined, null, false, '', 0] as const) {
      it(`R2.12 root child ${String(children)} is preserved without substituting an image`, () => {
        render(<CardPreview id="preview">{children}</CardPreview>);
        preview()
          .should('have.text', children === 0 ? '0' : '')
          .children()
          .should('have.length', 0);
      });
    }
    it('R2.13 logo render function receives native props styles and ref and keeps child activation', () => {
      const ref = React.createRef<HTMLDivElement>();
      const click = cy.stub().as('logoClick');
      const renderLogo: SlotRenderFunction<React.ComponentProps<'div'>> = (Logo, props) => (
        <Logo {...props} style={{ ...props.style, width: 80, backgroundColor: '#fff' }}>
          <button id="badge-action" onClick={click}>
            App
          </button>
        </Logo>
      );
      const logoProps = { id: 'badge', ref, 'data-slot': 'logo', children: renderLogo };
      render(<Picture logo={logoProps} />);
      logo().should('have.id', 'badge').and('have.attr', 'data-slot', 'logo').and('have.css', 'width', '80px');
      logo().then($el => expect(ref.current).to.equal($el[0]));
      cy.get('#badge-action').realClick();
      cy.realPress('Enter');
      cy.get('@logoClick').should('have.been.calledTwice');
    });
    it('R2.14 logo render function can suppress its slot while leaving the preview image visible', () => {
      const renderLogo: SlotRenderFunction<React.ComponentProps<'div'>> = () => null;
      render(<Picture logo={{ id: 'suppressed', children: renderLogo }} />);
      cy.get('#suppressed').should('not.exist');
      logo().should('not.exist');
      loaded();
      geometry(false);
    });
    it('R2.15 root render function receives the generated logo and can retain it alongside custom content', () => {
      const ref = React.createRef<HTMLDivElement>();
      const renderRoot: SlotRenderFunction<React.ComponentProps<'div'>> = (Root, props) => (
        <Root {...props}>
          <img id="custom-image" src={image()} alt="Custom preview" />
          {props.children}
        </Root>
      );
      render(
        <CardPreview
          id="preview"
          ref={ref}
          style={{ width: 320, height: 180 }}
          logo={{ as: 'img', src: image(32, 32), alt: 'App' }}
        >
          {renderRoot}
        </CardPreview>,
      );
      loaded();
      geometry();
      preview().then($el => expect(ref.current).to.equal($el[0]));
      cy.get('#custom-image').should('have.length', 1);
    });
    it('R2.16 root render function can suppress the complete tree including its logo and ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      const renderRoot: SlotRenderFunction<React.ComponentProps<'div'>> = () => null;
      render(
        <>
          <button>Retained action</button>
          <CardPreview id="preview" ref={ref} logo="Hidden">
            {renderRoot}
          </CardPreview>
        </>,
      );
      preview()
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
      logo().should('not.exist');
      cy.contains('button', 'Retained action').realClick().should('have.focus');
    });
    it('R2.17 provider custom style hook runs after builtins and controls visible root and logo paint', () => {
      const useStyles = makeStyles({ root: { backgroundColor: '#123456' }, logo: { width: '40px' } });
      const useCustomPreviewStyles = (unknownState: unknown) => {
        const styles = useStyles();
        if (
          typeof unknownState !== 'object' ||
          unknownState === null ||
          !('root' in unknownState) ||
          !('components' in unknownState)
        ) {
          throw new Error('Expected CardPreview state from the provider style hook');
        }
        const state = unknownState as CardPreviewState;
        state.root.className = mergeClasses(state.root.className, styles.root);
        if (state.logo) {
          state.logo.className = mergeClasses(state.logo.className, styles.logo);
        }
      };
      const hooks: FluentProviderCustomStyleHooks = {};
      hooks.useCardPreviewStyles_unstable = useCustomPreviewStyles;
      render(
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
          <Picture />
        </FluentProvider>,
      );
      preview().should('have.class', cardPreviewClassNames.root).and('have.css', 'background-color', 'rgb(18, 52, 86)');
      logo().should('have.class', cardPreviewClassNames.logo).and('have.css', 'width', '40px');
    });
    for (const base of [false, true]) {
      it(`R2.18 ${
        base ? 'base' : 'standard'
      } public hook and renderer produce working slots with forwarded refs`, () => {
        const ref = React.createRef<HTMLElement>();
        const usePreview = base ? useCardPreviewBase_unstable : useCardPreview_unstable;
        const HookPreview = () => {
          const state = usePreview(
            {
              id: 'preview',
              logo: { as: 'img', src: image(32, 32), alt: 'App' },
              style: { width: 320, height: 180 },
              children: <img src={image()} alt="Preview" />,
            },
            ref,
          );
          useCardPreviewStyles_unstable(state);
          return renderCardPreview_unstable(state);
        };
        render(<HookPreview />);
        loaded();
        geometry();
        preview().then($el => expect(ref.current).to.equal($el[0]));
      });
    }
    it('R2.19 live native attribute style and handler replacement removes stale values on the same root', () => {
      const first = cy.stub().as('first');
      const second = cy.stub().as('second');
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        return (
          <>
            <button id="update" onClick={() => setStep(step + 1)}>
              Update
            </button>
            <Picture
              title={step === 0 ? 'Original' : undefined}
              data-step={step}
              className={step === 0 ? 'original' : undefined}
              style={{ width: step === 0 ? 320 : 240, height: 180 }}
              onClick={step === 0 ? first : step === 1 ? second : undefined}
            />
          </>
        );
      };
      render(<Fixture />);
      loaded();
      preview().then($el => {
        const root = $el[0];
        cy.get('#image').realClick();
        cy.get('@first').should('have.been.calledOnce');
        cy.get('#update').realClick();
        preview().should('not.have.attr', 'title');
        preview()
          .should('not.have.class', 'original')
          .and('have.attr', 'data-step', '1')
          .and('have.css', 'width', '240px');
        preview().should($next => expect($next[0]).to.equal(root));
        cy.get('#image').realClick();
        cy.get('@second').should('have.been.calledOnce');
        cy.get('#update').realClick();
        cy.get('#image').realClick();
        cy.get('@first').should('have.been.calledOnce');
        cy.get('@second').should('have.been.calledOnce');
      });
    });
    it('R2.20 image src alt fitting and logo element type update in place without stale wrappers', () => {
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(!changed)}>
              Update
            </button>
            <CardPreview
              id="preview"
              style={{ width: 320, height: 180 }}
              logo={
                changed ? { as: 'img', src: image(40, 40), alt: 'New app' } : <img src={image(32, 32)} alt="Old app" />
              }
            >
              <img
                id="image"
                src={image(changed ? 180 : 320, changed ? 320 : 180)}
                alt={changed ? 'New preview' : 'Old preview'}
                style={{ objectFit: changed ? 'contain' : 'cover' }}
              />
            </CardPreview>
          </>
        );
      };
      render(<Fixture />);
      loaded();
      preview().then($el => {
        const root = $el[0];
        cy.get('#update').realClick();
        loaded();
        preview().should($next => expect($next[0]).to.equal(root));
        cy.get('#image')
          .should('have.attr', 'alt', 'New preview')
          .and('have.css', 'object-fit', 'contain')
          .should($img => expect(($img[0] as HTMLImageElement).naturalHeight).to.equal(320));
        logo().should('match', 'img').and('have.attr', 'alt', 'New app').find('img').should('not.exist');
        geometry();
      });
    });
    it('R2.21 live logo render closures keep the slot node while updating accessible action names', () => {
      const Fixture = () => {
        const [count, setCount] = React.useState(0);
        const renderLogo: SlotRenderFunction<React.ComponentProps<'div'>> = (Logo, props) => (
          <Logo {...props} style={{ width: 110, backgroundColor: '#fff' }}>
            <button id="badge-action" onClick={() => setCount(count + 1)}>
              App {count}
            </button>
          </Logo>
        );
        return <Picture logo={{ children: renderLogo }} />;
      };
      render(<Fixture />);
      logo().then($el => {
        const badge = $el[0];
        cy.get('#badge-action').realClick().should('have.text', 'App 1');
        cy.realPress('Enter');
        cy.get('#badge-action')
          .should('have.text', 'App 2')
          .should($button => expect(computeAccessibleName($button[0])).to.equal('App 2'));
        logo().should($next => expect($next[0]).to.equal(badge));
      });
    });
  });
}
describe('ONLY128 CardPreview R1 continued layout and anatomy', () => {
  it('R1.02 mounts the unchanged stable Card default and preserves header-preview-footer order', () => {
    renderStory(<DefaultCard />);
    cy.get('.fui-Card').find('> .fui-CardHeader + .fui-CardPreview + .fui-CardFooter').should('have.length', 1);
    cy.get('.fui-CardPreview > img').should($img =>
      expect(computeAccessibleName($img[0])).to.equal('Preview of a Word document: About Us - Overview'),
    );
    cy.contains('button', 'Reply').realClick().should('have.focus');
  });
});

if (round >= 3) {
  describe('ONLY128 CardPreview R3 Card context layout and accessibility propagation', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const size of ['small', 'medium', 'large'] as const) {
        for (const orientation of ['vertical', 'horizontal'] as const) {
          for (const placement of ['first', 'middle', 'last', 'only'] as const) {
            it(`R3.01 ${dir} ${size} ${orientation} ${placement} honors actual direct-child flush layout and logo geometry`, () => {
              const padding = { small: 8, medium: 12, large: 16 }[size];
              render(
                <Card
                  id="card"
                  size={size}
                  orientation={orientation}
                  style={{ width: orientation === 'horizontal' && placement === 'only' ? 120 : 360 }}
                >
                  {(placement === 'middle' || placement === 'last') && (
                    <div
                      id="leading"
                      style={{ flexGrow: orientation === 'horizontal' && placement === 'last' ? 1 : undefined }}
                    >
                      Leading content
                    </div>
                  )}
                  <Picture
                    style={orientation === 'horizontal' ? { width: 120, height: 180, flexShrink: 0 } : { height: 180 }}
                  />
                  {(placement === 'first' || placement === 'middle') && <div id="trailing">Trailing content</div>}
                </Card>,
                dir,
              );
              loaded();
              geometry();
              preview().should($root => {
                const root = $root[0];
                const card = root.parentElement!;
                const win = root.ownerDocument.defaultView!;
                const style = win.getComputedStyle(root);
                const cardRect = card.getBoundingClientRect();
                const rect = root.getBoundingClientRect();
                expect(win.getComputedStyle(card).paddingTop).to.equal(`${padding}px`);
                expect(win.getComputedStyle(card).flexDirection).to.equal(
                  orientation === 'vertical' ? 'column' : 'row',
                );
                if (orientation === 'vertical') {
                  expect(style.marginLeft).to.equal(`${-padding}px`);
                  expect(style.marginRight).to.equal(`${-padding}px`);
                  near(rect.left, cardRect.left, 'flush left');
                  near(rect.right, cardRect.right, 'flush right');
                  expect(style.marginTop).to.equal(
                    placement === 'first' || placement === 'only' ? `${-padding}px` : '0px',
                  );
                  expect(style.marginBottom).to.equal(
                    placement === 'last' || placement === 'only' ? `${-padding}px` : '0px',
                  );
                  if (placement === 'first' || placement === 'only') {
                    near(rect.top, cardRect.top, 'flush top');
                  }
                  if (placement === 'last' || placement === 'only') {
                    near(rect.bottom, cardRect.bottom, 'flush bottom');
                  }
                } else {
                  expect(style.marginTop).to.equal(`${-padding}px`);
                  expect(style.marginBottom).to.equal(`${-padding}px`);
                  near(rect.top, cardRect.top, 'flush top');
                  near(rect.bottom, cardRect.bottom, 'flush bottom');
                  const startMargin = dir === 'ltr' ? style.marginLeft : style.marginRight;
                  const endMargin = dir === 'ltr' ? style.marginRight : style.marginLeft;
                  expect(startMargin).to.equal(placement === 'first' || placement === 'only' ? `${-padding}px` : '0px');
                  expect(endMargin).to.equal(placement === 'last' || placement === 'only' ? `${-padding}px` : '0px');
                  if (placement === 'first' || placement === 'only') {
                    near(
                      dir === 'ltr' ? rect.left : rect.right,
                      dir === 'ltr' ? cardRect.left : cardRect.right,
                      'flush inline start',
                    );
                  }
                  if (placement === 'last' || placement === 'only') {
                    near(
                      dir === 'ltr' ? rect.right : rect.left,
                      dir === 'ltr' ? cardRect.right : cardRect.left,
                      'flush inline end',
                    );
                  }
                }
                expect(win.getComputedStyle(card).overflow).to.equal('hidden');
                near(rect.height, 180, 'preview height independent of size tokens');
              });
            });
          }
        }
      }
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`R3.02 ${dir} wrapped preview does not accidentally match Card direct-child negative margins`, () => {
        render(
          <Card id="card" size="large" style={{ width: 360 }}>
            <div id="wrapper">
              <Picture style={{ height: 180 }} />
            </div>
          </Card>,
          dir,
        );
        loaded();
        geometry();
        preview().should($el => {
          const root = $el[0];
          const win = root.ownerDocument.defaultView!;
          expect(win.getComputedStyle(root).marginLeft).to.equal('0px');
          expect(win.getComputedStyle(root).marginRight).to.equal('0px');
          const card = root.closest('#card')!.getBoundingClientRect();
          near(root.getBoundingClientRect().left - card.left, 16, 'retained wrapper padding');
          near(card.right - root.getBoundingClientRect().right, 16, 'retained wrapper padding');
        });
      });
      it(`R3.03 ${dir} responsive image and logo recompute at real narrow and wide viewport widths`, () => {
        render(
          <Card id="card" style={{ width: '100%', maxWidth: 720 }}>
            <Picture style={{ height: 180 }} />
            <div>Document content</div>
          </Card>,
          dir,
        );
        loaded();
        for (const width of [375, 1000]) {
          cy.viewport(width, 800);
          geometry();
          cy.get('#card').should($card => {
            const rect = $card[0].getBoundingClientRect();
            near(rect.width, Math.min(720, width - 48), 'responsive Card width within provider and fixture padding');
            expect(rect.right).to.be.at.most(width);
          });
        }
      });
    }
    for (const kind of ['alt', 'aria-label', 'describedby', 'alt-before-label'] as const) {
      it(`R3.04 direct preview image ${kind} provides the source-supported internal checkbox name`, () => {
        const props =
          kind === 'alt'
            ? { alt: 'Alt document' }
            : kind === 'aria-label'
            ? { alt: '', 'aria-label': 'ARIA document' }
            : kind === 'describedby'
            ? { alt: 'Alt fallback', 'aria-describedby': 'document-description' }
            : { alt: 'Alt document', 'aria-label': 'ARIA image name' };
        render(
          <>
            <p id="document-description">Described document</p>
            <CardFixture cardProps={{ defaultSelected: false }}>
              <CardPreview id="preview">
                <img id="image" src={image()} {...props} />
              </CardPreview>
            </CardFixture>
          </>,
        );
        loaded();
        const expected =
          kind === 'describedby' ? 'Described document' : kind === 'aria-label' ? 'ARIA document' : 'Alt document';
        labelOf('#card > input', expected);
        if (kind === 'describedby') {
          cy.get('#card > input').should('have.attr', 'aria-labelledby', 'document-description');
        }
        if (kind === 'alt-before-label') {
          labelOf('#image', 'ARIA image name');
        }
        cy.get('#image').realClick();
        cy.get('#card > input').should('be.checked');
      });
    }
    for (const position of ['before', 'after'] as const) {
      it(`R3.05 CardHeader ${position} preview takes naming precedence over image alt`, () => {
        const header = (
          <CardHeader
            header={
              <h2 id="document-title" style={{ margin: 0 }}>
                Header document
              </h2>
            }
          />
        );
        render(
          <Card id="card" defaultSelected={false} style={{ width: 360 }}>
            {position === 'before' && header}
            <Picture style={{ height: 180 }} />
            {position === 'after' && header}
          </Card>,
        );
        loaded();
        cy.get('#card > input').should('have.attr', 'aria-labelledby', 'document-title');
        labelOf('#card > input', 'Header document');
      });
    }
    it('R3.06 nested image and logo images are not fallback label candidates', () => {
      render(
        <Card
          id="card"
          defaultSelected={false}
          checkbox={{ 'aria-label': 'Explicit selection' }}
          style={{ width: 360 }}
        >
          <CardPreview id="preview" logo={<img src={image(32, 32)} alt="Logo is not title" />}>
            <div>
              <img src={image()} alt="Nested is not title" />
            </div>
          </CardPreview>
        </Card>,
      );
      loaded();
      labelOf('#card > input', 'Explicit selection');
      cy.get('#card > input').should('not.have.attr', 'aria-labelledby');
    });
    it('R3.07 sibling Cards keep preview-derived names and surface selection independent', () => {
      render(
        <>
          {['First', 'Second'].map(title => (
            <Card id={title} key={title} defaultSelected={false} style={{ width: 360 }}>
              <CardPreview>
                <img id={`${title}-image`} src={image()} alt={`${title} document`} />
              </CardPreview>
            </Card>
          ))}
        </>,
      );
      loaded();
      labelOf('#First > input', 'First document');
      labelOf('#Second > input', 'Second document');
      cy.get('#First-image').realClick();
      cy.get('#First > input').should('be.checked');
      cy.get('#Second > input').should('not.be.checked');
      cy.get('#Second-image').realClick();
      cy.get('#Second > input').should('be.checked');
      cy.get('#First > input').should('be.checked');
    });
    it('R3.08 multiple previews use the first matching direct image under the parent Card', () => {
      render(
        <Card id="card" defaultSelected={false} style={{ width: 360 }}>
          <CardPreview id="first-preview">
            <img src={image()} alt="First document" />
          </CardPreview>
          <CardPreview id="second-preview">
            <img src={image()} alt="Second document" />
          </CardPreview>
        </Card>,
      );
      loaded();
      labelOf('#card > input', 'First document');
      cy.get('#second-preview > img').realClick();
      cy.get('#card > input').should('be.checked');
    });
    it('R3.09 changing only image alt does not promise unsupported automatic checkbox relabeling', () => {
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(true)}>
              Update
            </button>
            <Card id="card" defaultSelected={false} style={{ width: 360 }}>
              <CardPreview id="preview">
                <img id="image" src={image()} alt={changed ? 'Updated image' : 'Initial image'} />
              </CardPreview>
            </Card>
          </>
        );
      };
      render(<Fixture />);
      loaded();
      labelOf('#card > input', 'Initial image');
      cy.get('#update').realClick();
      labelOf('#image', 'Updated image');
      labelOf('#card > input', 'Initial image');
    });
    it('R3.10 a live describedby target updates the checkbox accessible name without replacing its ID', () => {
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(true)}>
              Update
            </button>
            <p id="description">{changed ? 'Updated document' : 'Initial document'}</p>
            <Card id="card" defaultSelected={false} style={{ width: 360 }}>
              <CardPreview>
                <img src={image()} alt="Preview" aria-describedby="description" />
              </CardPreview>
            </Card>
          </>
        );
      };
      render(<Fixture />);
      loaded();
      labelOf('#card > input', 'Initial document');
      cy.get('#update').realClick();
      labelOf('#card > input', 'Updated document');
      cy.get('#card > input').should('have.attr', 'aria-labelledby', 'description');
    });
    it('R3.11 explicit checkbox naming overrides the preview fallback', () => {
      render(<CardFixture cardProps={{ defaultSelected: false, checkbox: { 'aria-label': 'Select explicitly' } }} />);
      loaded();
      labelOf('#card > input', 'Select explicitly');
    });
    it('R3.12 live size orientation and content reordering recompute flush rules on the same preview', () => {
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(!changed)}>
              Update
            </button>
            <Card
              id="card"
              size={changed ? 'large' : 'small'}
              orientation={changed ? 'horizontal' : 'vertical'}
              style={{ width: 360 }}
            >
              {changed && <div key="text">Content</div>}
              <Picture key="preview" style={changed ? { width: 120, height: 180, flexShrink: 0 } : { height: 180 }} />
              {!changed && <div key="text">Content</div>}
            </Card>
          </>
        );
      };
      render(<Fixture />);
      loaded();
      preview().then($el => {
        const root = $el[0];
        cy.get('#update').realClick();
        geometry();
        preview().should($next => {
          expect($next[0]).to.equal(root);
          const style = root.ownerDocument.defaultView!.getComputedStyle(root);
          expect(style.marginTop).to.equal('-16px');
          expect(style.marginRight).to.equal('-16px');
          expect(style.marginLeft).to.equal('0px');
        });
        cy.get('#update').realClick();
        geometry();
        preview().should('have.css', 'margin-top', '-8px').and('have.css', 'margin-left', '-8px');
      });
    });
  });
}
describe('ONLY128 CardPreview R1 remaining standalone anatomy and fitting', () => {
  it('R1.03 stable Orientation renders a genuine 64px square horizontal preview', () => {
    renderStory(<Orientation />);
    cy.get('.fui-CardPreview').should($root => {
      const rect = $root[0].getBoundingClientRect();
      near(rect.width, 64, 'story width');
      near(rect.height, 64, 'story height');
      expect(
        $root[0].parentElement!.ownerDocument.defaultView!.getComputedStyle($root[0].parentElement!).flexDirection,
      ).to.equal('row');
    });
  });
  it('R1.04 preserves unit snapshot text before the logo wrapper and static slot classes', () => {
    render(
      <CardPreview id="preview" logo="Logo slot">
        Default CardPreview
      </CardPreview>,
    );
    preview()
      .should('have.class', cardPreviewClassNames.root)
      .should($el => {
        expect($el[0].tagName).to.equal('DIV');
        expect($el[0].firstChild!.textContent).to.equal('Default CardPreview');
        expect($el[0].lastElementChild!.textContent).to.equal('Logo slot');
      });
    logo().should('have.class', cardPreviewClassNames.logo);
  });
  for (const value of [undefined, null, false, '', 0] as const) {
    it(`R1.05 logo ${String(value)} follows optional slot nullish semantics`, () => {
      render(
        <CardPreview id="preview" logo={value === false ? { children: false } : value}>
          <img src={image()} alt="Preview" />
        </CardPreview>,
      );
      if (value === undefined || value === null) {
        logo().should('not.exist');
        preview().children().should('have.length', 1);
      } else {
        logo().should('have.text', value === 0 ? '0' : '');
        preview().children().should('have.length', 2);
      }
      loaded();
    });
  }
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const dimensions of [
      [320, 180],
      [180, 320],
      [240, 240],
    ] as const) {
      it(`R1.06 ${dir} ${dimensions.join(
        'x',
      )} preview fills its image box and anchors a 32px logo at logical start`, () => {
        render(<Picture style={{ width: dimensions[0], height: dimensions[1] }} />, dir);
        loaded();
        geometry();
      });
    }
  }
  for (const fit of ['fill', 'contain', 'cover', 'none', 'scale-down'] as const) {
    it(`R1.07 consumer object-fit ${fit} survives full-size image rules without invented defaults`, () => {
      render(
        <CardPreview id="preview" style={{ width: 240, height: 240 }}>
          <img id="image" src={image()} alt="Landscape document" style={{ objectFit: fit }} />
        </CardPreview>,
      );
      loaded();
      geometry(false);
      cy.get('#image')
        .should('have.css', 'object-fit', fit)
        .should($el => {
          const img = $el[0] as HTMLImageElement;
          expect(img.naturalWidth).to.equal(320);
          expect(img.naturalHeight).to.equal(180);
          near(img.getBoundingClientRect().width, 240, 'fitting box width');
          near(img.getBoundingClientRect().height, 240, 'fitting box height');
        });
    });
  }
  it('R1.08 no fit prop leaves the browser default fill and intrinsic ratio outside a constrained height', () => {
    render(
      <CardPreview id="preview" style={{ width: 400 }}>
        <img id="image" src={image()} alt="Document" />
      </CardPreview>,
    );
    loaded();
    cy.get('#image')
      .should('have.css', 'object-fit', 'fill')
      .should($el => near($el[0].getBoundingClientRect().height, 225, 'intrinsic scaled ratio'));
  });
  it('R1.09 direct non-logo children all stretch while nested descendants retain authored dimensions', () => {
    render(
      <CardPreview
        id="preview"
        style={{ width: 320, height: 180 }}
        logo={{ as: 'img', src: image(32, 32), alt: 'App' }}
      >
        <div id="wrapper">
          <img id="nested" src={image(40, 20)} alt="Nested preview" style={{ width: 40, height: 20 }} />
        </div>
      </CardPreview>,
    );
    loaded();
    cy.get('#wrapper')
      .should('have.css', 'display', 'block')
      .should($el => {
        near($el[0].getBoundingClientRect().width, 320, 'direct wrapper width');
        near($el[0].getBoundingClientRect().height, 180, 'direct wrapper height');
      });
    cy.get('#nested').should($el => {
      near($el[0].getBoundingClientRect().width, 40, 'nested width untouched');
      near($el[0].getBoundingClientRect().height, 20, 'nested height untouched');
    });
  });
});

if (round >= 4) {
  describe('ONLY128 CardPreview R4 real interactions stable recipes and accessibility', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const mode of ['off', 'no-tab', 'tab-exit', 'tab-only'] as const) {
        it(`R4.01 ${dir} ${mode} keeps preview actions reachable by real Tab Enter and Escape`, () => {
          render(
            <CardFixture cardProps={{ focusMode: mode }}>
              <ActionPicture />
            </CardFixture>,
            dir,
          );
          loaded();
          cy.get('#before').focus();
          cy.realPress('Tab');
          if (mode !== 'off') {
            cy.get('#card').should('have.focus');
            cy.realPress(mode === 'tab-only' ? 'Tab' : 'Enter');
          }
          cy.get('#badge-action').should('have.focus');
          cy.realPress('Tab');
          cy.get('#open').should('have.focus');
          cy.realPress('Tab');
          cy.get('#share').should('have.focus');
          cy.realPress('Tab');
          cy.get(mode === 'no-tab' ? '#badge-action' : '#after').should('have.focus');
          if (mode !== 'off') {
            cy.get('#badge-action').realClick();
            cy.realPress('Escape');
            cy.get('#card').should('have.focus');
          }
          preview().should('not.have.attr', 'tabindex');
        });
      }
    }
    it('R4.02 selectable preview surface and nonfocusable logo each toggle once with native event payloads', () => {
      const selection = cy.stub().as('selection');
      render(<CardFixture cardProps={{ defaultSelected: false, onSelectionChange: selection }} />);
      loaded();
      labelOf('#card > input', 'Document preview');
      cy.get('#image').realClick();
      cy.get('#card > input').should('be.checked');
      cy.get('@selection')
        .should('have.been.calledOnce')
        .then(() => {
          expect(selection.firstCall.args[1]).to.deep.equal({ selected: true });
          expect(selection.firstCall.args[0].type).to.equal('click');
          expect(selection.firstCall.args[0].target.id).to.equal('image');
        });
      logo().realClick();
      cy.get('#card > input').should('not.be.checked');
      cy.get('@selection')
        .should('have.been.calledTwice')
        .then(() => expect(selection.secondCall.args[1]).to.deep.equal({ selected: false }));
    });
    for (const key of ['Enter', 'Space'] as const) {
      it(`R4.03 preview-named checkbox ${key} selects once while nested logo action ${key} never selects`, () => {
        const selection = cy.stub().as('selection');
        const action = cy.stub().as('action');
        render(
          <CardFixture cardProps={{ defaultSelected: false, onSelectionChange: selection }}>
            <ActionPicture onAction={action} />
          </CardFixture>,
        );
        loaded();
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get('#card > input').should('have.focus');
        cy.realPress(key);
        cy.get('#card > input').should('be.checked');
        cy.get('@selection').should('have.been.calledOnce');
        cy.realPress('Tab');
        cy.get('#badge-action').should('have.focus');
        cy.realPress(key);
        cy.get('@action').should('have.been.calledOnce');
        cy.get('@selection').should('have.been.calledOnce');
        cy.get('#card > input').should('be.checked');
      });
    }
    it('R4.04 a real nested logo button pointer action does not toggle its selectable Card', () => {
      const action = cy.stub().as('action');
      const selection = cy.stub().as('selection');
      render(
        <CardFixture cardProps={{ defaultSelected: false, onSelectionChange: selection }}>
          <ActionPicture onAction={action} />
        </CardFixture>,
      );
      loaded();
      cy.get('#badge-action').realClick();
      cy.get('@action').should('have.been.calledOnce');
      cy.get('@selection').should('not.have.been.called');
      cy.get('#card > input').should('not.be.checked');
    });
    it('R4.05 controlled Card selection proposes changes but never mutates a fixed selected prop', () => {
      const selection = cy.stub().as('selection');
      render(<CardFixture cardProps={{ selected: false, onSelectionChange: selection }} />);
      loaded();
      cy.get('#image').realClick();
      cy.get('#image').realClick();
      cy.get('#card > input').should('not.be.checked');
      cy.get('@selection')
        .should('have.been.calledTwice')
        .then(() => {
          expect(selection.firstCall.args[1]).to.deep.equal({ selected: true });
          expect(selection.secondCall.args[1]).to.deep.equal({ selected: true });
        });
    });
    for (const selected of [false, true]) {
      it(`R4.06 disabled selected=${selected} preserves image layout and selection while enabled logo children remain actionable`, () => {
        const selection = cy.stub().as('selection');
        const action = cy.stub().as('action');
        render(
          <CardFixture cardProps={{ disabled: true, defaultSelected: selected, onSelectionChange: selection }}>
            <ActionPicture onAction={action} />
          </CardFixture>,
        );
        loaded();
        cy.get('#card').should('have.attr', 'aria-disabled', 'true');
        cy.get('#card > input')
          .should('be.disabled')
          .and(selected ? 'be.checked' : 'not.be.checked');
        cy.get('#image').realClick();
        cy.get('@selection').should('not.have.been.called');
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get('#badge-action').should('have.focus');
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('@action').should('have.been.calledTwice');
        cy.get('@selection').should('not.have.been.called');
      });
    }
    it('R4.07 logo overlay is above the image in browser hit testing without covering its center', () => {
      render(<Picture />);
      loaded();
      geometry();
      preview().should($root => {
        const root = $root[0];
        const badge = root.querySelector('.fui-CardPreview__logo')!;
        const rect = badge.getBoundingClientRect();
        const document = root.ownerDocument;
        expect(document.elementFromPoint(rect.left + 16, rect.top + 16)).to.equal(badge);
        const imageRect = root.querySelector('#image')!.getBoundingClientRect();
        expect(
          document.elementFromPoint(imageRect.left + imageRect.width / 2, imageRect.top + imageRect.height / 2),
        ).to.equal(root.querySelector('#image'));
      });
    });
    for (const dark of [false, true]) {
      it(`R4.08 ${
        dark ? 'dark' : 'light'
      } provider retains geometry image names and decorative-image semantics`, () => {
        render(
          <CardPreview
            id="preview"
            style={{ width: 320, height: 180 }}
            logo={{ as: 'img', src: image(32, 32), alt: '' }}
          >
            <img id="image" src={image()} alt="Named document" />
          </CardPreview>,
          'ltr',
          dark,
        );
        loaded();
        geometry();
        labelOf('#image', 'Named document');
        logo().should($el => expect(computeAccessibleName($el[0])).to.equal(''));
      });
    }
    it('R4.09 live logo removal and restoration preserves root image identity and native action focus', () => {
      const Fixture = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setVisible(!visible)}>
              Toggle logo
            </button>
            <Picture logo={visible ? { as: 'img', src: image(32, 32), alt: 'App' } : null} />
          </>
        );
      };
      render(<Fixture />);
      loaded();
      cy.get('#image').then($image => {
        const original = $image[0];
        cy.get('#update').realClick().should('have.focus');
        logo().should('not.exist');
        cy.get('#image').should($next => expect($next[0]).to.equal(original));
        cy.realPress('Enter');
        loaded();
        geometry();
        cy.get('#image').should($next => expect($next[0]).to.equal(original));
      });
    });
    it('R4.10 stable Selectable story uses Header names and independent preview surface selection', () => {
      renderStory(<Selectable />);
      cy.get('.fui-CardPreview').should('have.length', 2);
      cy.get('.fui-Card > input').each($input =>
        expect(computeAccessibleName($input[0])).to.equal('iOS App Prototype'),
      );
      cy.get('.fui-CardPreview > img').first().realClick();
      cy.get('.fui-Card > input').eq(0).should('be.checked');
      cy.get('.fui-Card > input').eq(1).should('not.be.checked');
    });
    it('R4.11 stable SelectableIndicator story synchronizes preview click and the named floating checkbox', () => {
      renderStory(<SelectableIndicator />);
      cy.get('.fui-CardPreview').should('have.length', 2);
      cy.get('.fui-CardPreview > img').first().realClick();
      cy.get('.fui-Checkbox__input').eq(0).should('be.checked').focus();
      cy.realPress('Space');
      cy.get('.fui-Checkbox__input').eq(0).should('not.be.checked');
      cy.get('.fui-Checkbox__input').eq(1).should('not.be.checked');
      cy.get('.fui-Card > input').should('not.exist');
    });
    it('R4.12 stable FocusMode story keeps four loaded previews and real keyboard entry', () => {
      renderStory(<FocusMode />);
      cy.get('.fui-CardPreview').should('have.length', 4);
      cy.get('.fui-Card').eq(1).focus();
      cy.realPress('Enter');
      cy.get('.fui-Card').eq(1).find('button').first().should('have.focus');
      cy.realPress('Escape');
      cy.get('.fui-Card').eq(1).should('have.focus');
    });
    it('R4.13 stable Disabled story retains all ten previews and disables the five matching action pairs', () => {
      renderStory(<Disabled />);
      cy.get('.fui-CardPreview').should('have.length', 10);
      cy.get('.fui-Card[aria-disabled="true"]')
        .should('have.length', 5)
        .each($card => {
          expect($card.find('.fui-CardPreview > img')).to.have.length(1);
          expect($card.find('.fui-CardFooter button:disabled')).to.have.length(2);
        });
      cy.get('.fui-Card').eq(4).find('.fui-CardPreview > img').realClick();
      cy.get('.fui-Card').eq(4).find('> input').should('be.checked');
      cy.get('.fui-Card').eq(5).find('.fui-CardPreview > img').realClick();
      cy.get('.fui-Card').eq(5).find('> input').should('not.be.checked');
    });
    it('R4.14 stable WithAction story invokes the preview action and records current Open keyboard bubbling', () => {
      const alert = cy.stub().as('alert');
      cy.on('window:alert', alert);
      renderStory(<WithAction />);
      cy.get('.fui-CardPreview').should('have.length', 2);
      cy.get('.fui-CardPreview > img').first().realClick();
      cy.get('@alert').should('have.been.calledOnce').and('have.been.calledWith', 'Opened Classroom Collaboration app');
      cy.contains('button', 'Open').focus();
      cy.realPress('Enter');
      cy.get('@alert').should('have.callCount', 4);
      cy.get('.fui-Card').first().should('not.have.attr', 'tabindex');
    });
    it('R4.15 stable Templates image-only Card has a loaded full-bleed preview and no invented selection', () => {
      renderStory(<Templates />);
      cy.get('.fui-CardPreview')
        .should('have.length', 1)
        .find('> img')
        .should('have.attr', 'alt', 'Intelligence - Design to Amplify');
      cy.get('.fui-CardPreview').should($root => {
        const card = $root[0].parentElement!.getBoundingClientRect();
        const rect = $root[0].getBoundingClientRect();
        near(rect.width, card.width, 'template full-bleed width');
        near(rect.height, card.height, 'template full-bleed height');
      });
      cy.get('.fui-CardPreview > img').realClick();
      cy.get('.fui-CardPreview').parent().find('input').should('not.exist');
    });
    for (const fit of ['fill', 'contain', 'cover', 'none', 'scale-down'] as const) {
      it(`R4.16 ${fit} paints the actual image crop letterbox and circle dimensions in a browser screenshot`, () => {
        render(
          <CardPreview id="preview" style={{ width: 240, height: 240, backgroundColor: '#fff' }}>
            <img id="image" src={image()} alt="Fitting preview" style={{ objectFit: fit }} />
          </CardPreview>,
        );
        loaded();
        geometry(false);
        const name = `preview-fit-${fit}`;
        const pale = [219, 234, 254, 255];
        const blue = [24, 90, 189, 255];
        const white = [255, 255, 255, 255];
        screenshotPixels(name, [
          [120, 20],
          [170, 120],
          [120, 170],
          [120, 120],
          [160, 120],
        ]).then(report => {
          expect(report.width).to.equal(240);
          expect(report.height).to.equal(240);
          expect(report.colors).to.deep.equal([
            fit === 'fill' || fit === 'cover' ? pale : white,
            fit === 'cover' ? blue : pale,
            fit === 'fill' || fit === 'cover' ? blue : pale,
            blue,
            fit === 'none' || fit === 'cover' ? blue : pale,
          ]);
        });
      });
    }
    it('R4.17 scale-down does not upscale a genuinely smaller intrinsic image', () => {
      render(
        <CardPreview id="preview" style={{ width: 240, height: 240, backgroundColor: '#fff' }}>
          <img src={image(60, 40)} alt="Small preview" style={{ objectFit: 'scale-down' }} />
        </CardPreview>,
      );
      loaded();
      screenshotPixels('preview-fit-small', [
        [120, 70],
        [140, 120],
        [120, 120],
      ]).then(report => {
        expect(report.colors).to.deep.equal([
          [255, 255, 255, 255],
          [219, 234, 254, 255],
          [24, 90, 189, 255],
        ]);
      });
    });
    for (const mode of ['off', 'no-tab', 'tab-exit', 'tab-only'] as const) {
      it(`R4.18 ${mode} preserves reverse native Tab from the second preview action`, () => {
        render(
          <CardFixture cardProps={{ focusMode: mode }}>
            <ActionPicture />
          </CardFixture>,
        );
        loaded();
        cy.get('#open').realClick();
        cy.realPress(['Shift', 'Tab']);
        cy.get('#badge-action').should('have.focus');
        if (mode !== 'off') {
          cy.realPress('Escape');
          cy.get('#card').should('have.focus');
        }
      });
    }
    it('R4.19 a preseeded complete Card naming context suppresses image-derived setters', () => {
      const setReferenceLabel = cy.stub().as('labelSetter');
      const setReferenceId = cy.stub().as('idSetter');
      render(
        <CardProvider
          value={{
            selectableA11yProps: {
              referenceId: 'existing-title',
              referenceLabel: 'Existing document',
              setReferenceLabel,
              setReferenceId,
            },
          }}
        >
          <Picture />
        </CardProvider>,
      );
      loaded();
      geometry();
      cy.get('@labelSetter').should('not.have.been.called');
      cy.get('@idSetter').should('not.have.been.called');
      labelOf('#image', 'Document preview');
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`R4.20 ${dir} selected forced-colors Card leaves preview color adjustment automatic and images fitted`, () => {
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Emulation.setEmulatedMedia',
            params: { features: [{ name: 'forced-colors', value: 'active' }] },
          }),
        );
        render(
          <Card id="card" selected style={{ width: 360 }}>
            <Picture style={{ height: 180 }} />
          </Card>,
          dir,
        );
        loaded();
        geometry();
        cy.get('#card').should($el => {
          const win = $el[0].ownerDocument.defaultView!;
          expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true);
          expect(win.getComputedStyle($el[0]).forcedColorAdjust).to.equal('none');
          expect(win.getComputedStyle($el[0].querySelector('#preview')!).forcedColorAdjust).to.equal('auto');
        });
      });
    }
    it('R4.21 current interactive Card defaults to no-tab and keeps preview logo actions reachable', () => {
      const click = cy.stub().as('cardClick');
      render(
        <CardFixture cardProps={{ onClick: click }}>
          <ActionPicture />
        </CardFixture>,
      );
      loaded();
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#card').should('have.focus');
      cy.realPress('Enter');
      cy.get('#badge-action').should('have.focus');
      cy.realPress('Tab');
      cy.get('#open').should('have.focus');
      cy.realPress('Tab');
      cy.get('#share').should('have.focus');
      cy.realPress('Tab');
      cy.get('#badge-action').should('have.focus');
      cy.realPress('Escape');
      cy.get('#card').should('have.focus');
      cy.get('#image').realClick();
      cy.get('@cardClick').should('have.been.calledOnce');
    });
    it('R4.22 keyboard-only Card handlers do not invent pointer interactivity or root focus management', () => {
      const key = cy.stub().as('cardKey');
      render(
        <CardFixture cardProps={{ onKeyDown: event => key(event.key) }}>
          <ActionPicture />
        </CardFixture>,
      );
      loaded();
      cy.get('#card').should('not.have.attr', 'tabindex');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#badge-action').should('have.focus');
      cy.realPress('Enter');
      cy.get('@cardKey').should('have.been.calledOnce').and('have.been.calledWith', 'Enter');
    });
    it('R4.23 live provider direction and theme replace logo anchoring without replacing the root or image', () => {
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <FluentProvider theme={changed ? webDarkTheme : webLightTheme} dir={changed ? 'rtl' : 'ltr'}>
            <button id="update" onClick={() => setChanged(!changed)}>
              Update provider
            </button>
            <Picture />
          </FluentProvider>
        );
      };
      render(<Fixture />);
      loaded();
      geometry();
      preview().then($el => {
        const root = $el[0];
        const img = root.querySelector('#image');
        cy.get('#update').realClick();
        geometry();
        preview().should($next => {
          expect($next[0]).to.equal(root);
          expect(root.querySelector('#image')).to.equal(img);
          expect(root.ownerDocument.defaultView!.getComputedStyle(root).direction).to.equal('rtl');
          expect(root.ownerDocument.defaultView!.getComputedStyle(root).color).to.equal('rgb(255, 255, 255)');
        });
        cy.get('#update').realClick();
        geometry();
        preview().should('have.css', 'direction', 'ltr');
      });
    });
  });
}

if (round >= 6) {
  describe('ONLY128 CardPreview R6 source-selector boundaries and native lifecycle', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const appearance of ['filled', 'filled-alternative', 'outline', 'subtle'] as const) {
        it(`R6.01 ${dir} parent appearance ${appearance} does not change preview full-bleed layout or static slot classes`, () => {
          render(
            <Card id="card" appearance={appearance} style={{ width: 360 }}>
              <Picture style={{ height: 180 }} />
            </Card>,
            dir,
          );
          loaded();
          geometry();
          preview().should($root => {
            const media = $root[0].getBoundingClientRect();
            const card = $root[0].parentElement!.getBoundingClientRect();
            near(media.left, card.left, 'appearance-independent flush left');
            near(media.right, card.right, 'appearance-independent flush right');
            near(media.top, card.top, 'appearance-independent flush top');
            near(media.bottom, card.bottom, 'appearance-independent flush bottom');
            expect($root[0].classList.contains(cardPreviewClassNames.root)).to.equal(true);
          });
          logo().should('have.class', cardPreviewClassNames.logo);
          cy.get('#card').find('> input').should('not.exist');
        });
      }
    }
    it('R6.02 a native img logo alone matches the actual direct-image naming selector rather than an invented logo exclusion', () => {
      render(
        <Card id="card" defaultSelected={false} style={{ width: 360 }}>
          <CardPreview
            id="preview"
            style={{ height: 100 }}
            logo={{ as: 'img', id: 'native-logo', src: image(32, 32), alt: 'Native logo fallback' }}
          />
        </Card>,
      );
      loaded();
      preview().children().should('have.length', 1);
      labelOf('#card > input', 'Native logo fallback');
      cy.get('#native-logo').realClick();
      cy.get('#card > input').should('be.checked');
    });
    it('R6.03 an image with no alt attribute and explicit ARIA label supplies a valid nonpresentational fallback name', () => {
      render(
        <Card id="card" defaultSelected={false} style={{ width: 360 }}>
          <CardPreview id="preview">
            <img id="image" src={image()} aria-label="Explicit image label" />
          </CardPreview>
        </Card>,
      );
      loaded();
      cy.get('#image').should('not.have.attr', 'alt');
      labelOf('#image', 'Explicit image label');
      labelOf('#card > input', 'Explicit image label');
      cy.get('#image').realClick();
      cy.get('#card > input').should('be.checked');
    });
    it('R6.04 multiple describedby IDREFs take source precedence over both alt and ARIA label for Card selection', () => {
      render(
        <>
          <p id="first-description">Quarterly document</p>
          <p id="second-description">Version two</p>
          <Card id="card" defaultSelected={false} style={{ width: 360 }}>
            <CardPreview id="preview">
              <img
                id="image"
                src={image()}
                alt="Alt fallback"
                aria-label="Image label"
                aria-describedby="first-description second-description"
              />
            </CardPreview>
          </Card>
        </>,
      );
      loaded();
      labelOf('#image', 'Image label');
      cy.get('#image').should($img =>
        expect(computeAccessibleDescription($img[0])).to.equal('Quarterly document Version two'),
      );
      cy.get('#card > input').should('have.attr', 'aria-labelledby', 'first-description second-description');
      labelOf('#card > input', 'Quarterly document Version two');
    });
    it('R6.05 live div-to-img logo replacement clears the old slot ref and assigns the new native element without replacing the root', () => {
      const slotRef = cy.stub().as('replacementRef');
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(true)}>
              Replace logo
            </button>
            <Picture
              logo={
                changed
                  ? { as: 'img', id: 'badge', src: image(32, 32), alt: 'Replacement app', ref: slotRef }
                  : { id: 'badge', ref: slotRef }
              }
            />
          </>
        );
      };
      render(<Fixture />);
      loaded();
      preview().then($root => {
        const root = $root[0];
        logo().then($badge => {
          const old = $badge[0];
          expect(slotRef.lastCall.args[0]).to.equal(old);
          expect(old.tagName).to.equal('DIV');
          slotRef.resetHistory();
          cy.get('#update').realClick();
          loaded();
          logo().should($new => {
            expect($new[0].tagName).to.equal('IMG');
            expect($new[0]).not.to.equal(old);
            expect(slotRef.firstCall.args[0]).to.equal(null);
            expect(slotRef.lastCall.args[0]).to.equal($new[0]);
            expect(old.isConnected).to.equal(false);
          });
          preview().should($new => expect($new[0]).to.equal(root));
        });
      });
    });
    it('R6.06 an actual native broken image reports its error and alt without fabricating a preview loading or failure state', () => {
      const error = cy.stub().as('nativeImageError');
      render(
        <CardPreview id="preview" style={{ width: 320, height: 180 }}>
          <img
            id="image"
            src="data:image/png;base64,bm90LWEtcG5n"
            alt="Unavailable document preview"
            onError={event => error(event.type, event.currentTarget.id, event.nativeEvent.isTrusted)}
          />
        </CardPreview>,
      );
      cy.get('@nativeImageError')
        .should('have.been.calledOnce')
        .then(() => {
          expect(error.firstCall.args).to.deep.equal(['error', 'image', true]);
        });
      cy.get<HTMLImageElement>('#image').should($image => {
        expect($image[0].complete).to.equal(true);
        expect($image[0].naturalWidth).to.equal(0);
        expect($image[0].naturalHeight).to.equal(0);
      });
      labelOf('#image', 'Unavailable document preview');
      preview().children().should('have.length', 1);
      preview().find('[role="progressbar"], [role="alert"]').should('not.exist');
    });
    it('R6.07 native hidden updates reveal the same root and named media without internal visibility state', () => {
      const Fixture = () => {
        const [hidden, setHidden] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setHidden(false)}>
              Reveal preview
            </button>
            <Picture hidden={hidden} />
          </>
        );
      };
      render(<Fixture />);
      preview()
        .should('not.be.visible')
        .then($root => {
          const root = $root[0];
          cy.get('#update').realClick();
          preview()
            .should('be.visible')
            .should($new => expect($new[0]).to.equal(root));
          preview().should('not.have.attr', 'hidden');
          loaded();
          geometry();
        });
    });
  });
}
