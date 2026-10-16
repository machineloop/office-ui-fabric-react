import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  Toolbar,
  ToolbarDivider,
  ToolbarGroup,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import { ToolbarButton } from '../ToolbarButton';
import type { ToolbarButtonProps } from '../ToolbarButton.types';
import type { ToolbarButtonState } from '../ToolbarButton.types';
import { useToolbarButton_unstable, useToolbarButtonBase_unstable } from '../useToolbarButton';
import { useToolbarButtonStyles_unstable } from '../useToolbarButtonStyles.styles';
import { Default } from '../../../../../stories/src/Toolbar/ToolbarDefault.stories';
import { Small } from '../../../../../stories/src/Toolbar/ToolbarSmall.stories';
import { Medium } from '../../../../../stories/src/Toolbar/ToolbarMedium.stories';
import { Large } from '../../../../../stories/src/Toolbar/ToolbarLarge.stories';
import { VerticalButton } from '../../../../../stories/src/Toolbar/ToolbarVerticalButton.stories';
import { FarGroup } from '../../../../../stories/src/Toolbar/ToolbarFarGroup.stories';
import { WithTooltip } from '../../../../../stories/src/Toolbar/ToolbarWithTooltip.stories';
import { WithPopover } from '../../../../../stories/src/Toolbar/ToolbarWithPopover.stories';
import { OverflowItems } from '../../../../../stories/src/Toolbar/ToolbarOverflow.stories';
// Internal positive control: ToolbarButton deliberately bypasses inherited Button size context.
// eslint-disable-next-line @fluentui/no-restricted-imports
import { ButtonContextProvider } from '@fluentui/react-button';
import type { SlotRenderFunction } from '@fluentui/react-components';
import { bundleIcon, CalendarMonthFilled, CalendarMonthRegular } from '@fluentui/react-icons';
// eslint-disable-next-line @fluentui/no-restricted-imports
import { CustomStyleHooksProvider_unstable as CustomStyleHooksProvider } from '@fluentui/react-shared-contexts';
// eslint-disable-next-line @fluentui/no-restricted-imports
import { renderButton_unstable } from '@fluentui/react-button';

const round = Number(Cypress.env('coverageRound') || 8);
const requestedAuditDirectory: unknown = Cypress.env('toolbarButtonAuditDirectory');
if (
  requestedAuditDirectory !== undefined &&
  (typeof requestedAuditDirectory !== 'string' || !requestedAuditDirectory.trim())
) {
  throw new Error('toolbarButtonAuditDirectory must be a nonempty string when provided');
}
const auditDirectory =
  requestedAuditDirectory ?? `src/components/ToolbarButton/.temp/audits-${Date.now()}-${Cypress._.uniqueId()}`;
let auditIndex = 0;
const CalendarMonth = bundleIcon(CalendarMonthFilled, CalendarMonthRegular);
const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') => {
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <main id="fixture">
        <button id="before">Before</button>
        {children}
        <button id="after" style={{ display: 'block', marginTop: 300 }}>
          After
        </button>
      </main>
    </FluentProvider>,
  );
  cy.document().then(doc => {
    doc.documentElement.lang = 'en';
  });
  cy.get('body').realHover({ position: 'topLeft' });
  cy.get('#fixture').should($fixture => {
    for (const toolbar of Array.from($fixture[0].querySelectorAll('[role="toolbar"]'))) {
      expect(toolbar.hasAttribute('data-tabster'), 'actual mover is registered').to.equal(true);
      expect(
        toolbar.querySelectorAll(':scope > [data-tabster-dummy*="Mover"]').length,
        'mover initialized both sentinels before native keyboard input',
      ).to.equal(2);
    }
  });
};
const Icon = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
    <path d="M4 10h12M10 4v12" stroke="currentColor" />
  </svg>
);
const fixture = (props: ToolbarButtonProps = {}, dir: 'ltr' | 'rtl' = 'ltr', vertical = false) =>
  render(
    <Toolbar id="toolbar" aria-label="Editing" vertical={vertical}>
      <ToolbarButton id="first" {...props}>
        First
      </ToolbarButton>
      <ToolbarButton id="second">Second</ToolbarButton>
      <ToolbarButton id="third">Third</ToolbarButton>
    </Toolbar>,
    dir,
  );
const focused = (id: string) => cy.get(`#${id}`).should('have.focus');
const name = (selector: string, expected: string) =>
  cy.get(selector).should($element => expect(computeAccessibleName($element[0])).to.equal(expected));
const assertKnownFindings = (result: axe.AxeResults, doc: Document, stage: string, scenario: string) => {
  const stagedScenarios: Record<string, string> = {
    'visible-tooltip': 'R3 documented tooltip gives Highlight a description on real hover and keyboard focus',
    'open-image-popover': 'R3 documented popover traps keyboard focus and restores ToolbarButton after closing',
    'open-table-popover': 'R3 documented popover traps keyboard focus and restores ToolbarButton after closing',
    'open-overflow-menu':
      'R3 documented overflow responds to real resize control and matches hidden command menu exactly',
    'open-generated-menu': 'R3 unmodified menu ArrowDown is toolbar navigation, not an opening shortcut',
  };
  if (stage !== 'final') {
    if (stage === 'open-formula-popover') {
      expect(scenario).to.match(
        /^R7 documented Insert Formula (pointer|Enter|Space) opens the real modal and restores its owner trigger$/,
      );
    } else if (stage === 'open-quick-popover') {
      expect(scenario).to.match(
        /^R7 documented Quick Actions (pointer|Enter|Space) opens the real modal and restores its owner trigger$/,
      );
    } else if (stage === 'open-menu') {
      expect(scenario).to.match(
        /^R3 menu (pointer|Enter|Space) opening, disabled item discovery, selection callback and focus restoration$/,
      );
    } else {
      expect(scenario).to.equal(stagedScenarios[stage]);
      expect(stagedScenarios[stage]).to.be.a('string');
    }
  }
  expect(scenario).to.equal(Cypress.currentTest.title);
  expect(result.testEngine).to.deep.equal({ name: 'axe-core', version: axe.version });
  expect(result.passes.length, 'axe evaluated real DOM').to.be.greaterThan(0);
  const storyPopover =
    (scenario === 'R3 documented popover traps keyboard focus and restores ToolbarButton after closing' &&
      (stage === 'open-image-popover' || stage === 'open-table-popover')) ||
    (stage === 'open-formula-popover' &&
      /^R7 documented Insert Formula (pointer|Enter|Space) opens the real modal and restores its owner trigger$/.test(
        scenario,
      )) ||
    (stage === 'open-quick-popover' &&
      /^R7 documented Quick Actions (pointer|Enter|Space) opens the real modal and restores its owner trigger$/.test(
        scenario,
      ));
  const modal = doc.querySelector('.fui-PopoverSurface[role="dialog"][aria-modal="true"]');
  const checkSentinel = (node: axe.NodeResult, check: 'focusable-modal-open' | 'focusable-not-tabbable') => {
    expect(node.impact).to.equal('serious');
    expect(node.target).to.have.length(1);
    expect(node.target[0]).to.be.a('string');
    const template = doc.createElement('template');
    template.innerHTML = node.html;
    const reported = template.content.firstElementChild;
    expect(reported?.tagName).to.equal('I');
    expect(reported?.textContent).to.equal('');
    expect(reported?.childElementCount).to.equal(0);
    const sentinel = node.element;
    expect(sentinel, 'axe provides the exact live DOM finding node').to.be.instanceOf(doc.defaultView!.HTMLElement);
    expect(doc.contains(sentinel!)).to.equal(true);
    for (const attribute of ['data-tabster-dummy', 'aria-hidden', 'tabindex', 'role']) {
      expect(sentinel?.getAttribute(attribute)).to.equal(reported?.getAttribute(attribute));
    }
    expect(sentinel).not.to.equal(undefined);
    const liveSentinel = sentinel!;
    expect(liveSentinel.tagName).to.equal('I');
    expect(liveSentinel.getAttribute('data-tabster-dummy')).to.match(
      check === 'focusable-modal-open'
        ? /^isFirst=(true|false), isOutside=false, \((Mover|Modalizer), tabbable=true\)$/
        : /^isFirst=(true|false), isOutside=false, \(Mover, tabbable=true\)$/,
    );
    expect(liveSentinel.parentElement?.hasAttribute('data-tabster')).to.equal(true);
    expect(
      liveSentinel.parentElement?.classList.contains('fui-Toolbar') ||
        (liveSentinel.parentElement?.classList.contains('fui-MenuList') &&
          liveSentinel.parentElement?.getAttribute('role') === 'menu' &&
          ['open-menu', 'open-overflow-menu', 'open-generated-menu', 'final'].includes(stage)) ||
        (check === 'focusable-modal-open' && liveSentinel.parentElement === modal),
    ).to.equal(true);
    expect(liveSentinel.getAttribute('aria-hidden')).to.equal('true');
    expect(liveSentinel.getAttribute('tabindex')).to.equal('0');
    expect(liveSentinel.getAttribute('role')).to.equal('none');
    expect(liveSentinel.textContent).to.equal('');
    expect(liveSentinel.childElementCount).to.equal(0);
    expect(node.any).to.deep.equal([]);
    expect(node.none).to.deep.equal([]);
    expect(node.all).to.deep.equal([
      {
        id: check,
        data: null,
        relatedNodes: [{ html: node.html, target: node.target, element: liveSentinel }],
        impact: 'serious',
        message:
          check === 'focusable-modal-open'
            ? 'Check that focusable elements are not tabbable in the current state'
            : 'Focusable content should have tabindex="-1" or be removed from the DOM',
      },
    ]);
  };
  for (const rule of result.violations) {
    expect(rule.impact).to.equal('serious');
    expect(rule.nodes.length).to.be.greaterThan(0);
    if (rule.id === 'aria-dialog-name' && storyPopover) {
      expect(rule.nodes).to.have.length(1);
      const node = rule.nodes[0];
      expect(node.element).to.equal(modal);
      expect(node.target).to.deep.equal(['.fui-PopoverSurface']);
      expect(modal).not.to.equal(null);
      expect(modal?.querySelector('h3')?.textContent).to.equal(
        stage === 'open-image-popover'
          ? 'Insert Image'
          : stage === 'open-formula-popover'
          ? 'Insert Formula'
          : stage === 'open-quick-popover'
          ? 'Quick Actions'
          : 'Insert Table',
      );
      expect(computeAccessibleName(modal!)).to.equal('');
      expect(node.html).to.equal(modal!.outerHTML.slice(0, modal!.outerHTML.indexOf('>') + 1));
      expect(node.impact).to.equal('serious');
      expect(node.any).to.deep.equal([
        {
          id: 'aria-label',
          data: null,
          relatedNodes: [],
          impact: 'serious',
          message: 'aria-label attribute does not exist or is empty',
        },
        {
          id: 'aria-labelledby',
          data: null,
          relatedNodes: [],
          impact: 'serious',
          message:
            'aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty',
        },
        {
          id: 'non-empty-title',
          data: { messageKey: 'noAttr' },
          relatedNodes: [],
          impact: 'serious',
          message: 'Element has no title attribute',
        },
      ]);
      expect(node.all).to.deep.equal([]);
      expect(node.none).to.deep.equal([]);
    } else {
      expect(rule.id, 'only evidenced Tabster sentinel finding is allowed').to.equal('aria-hidden-focus');
      rule.nodes.forEach(node => checkSentinel(node, 'focusable-not-tabbable'));
    }
  }
  for (const rule of result.incomplete) {
    if (rule.id === 'heading-order' && storyPopover) {
      expect(rule.impact).to.equal('moderate');
      expect(rule.nodes).to.have.length(1);
      const node = rule.nodes[0];
      const heading = modal?.querySelector('h3');
      expect(node.element).to.equal(heading);
      expect(heading).not.to.equal(null);
      expect(node.target).to.deep.equal(['h3']);
      expect(node.html).to.equal(heading?.outerHTML);
      expect(node.impact).to.equal('moderate');
      expect(doc.querySelectorAll('#fixture h1, #fixture h2')).to.have.length(0);
      expect(node.any).to.have.length(1);
      const data = node.any[0].data as {
        headingOrder: Array<{ ancestry: string[]; level: number }>;
      };
      expect(data, 'heading-order check data is present').to.be.an('object');
      expect(Object.keys(data)).to.deep.equal(['headingOrder']);
      expect(data.headingOrder).to.have.length(1);
      expect(data.headingOrder[0], 'heading-order ancestry entry is present').to.be.an('object');
      expect(Object.keys(data.headingOrder[0]).sort()).to.deep.equal(['ancestry', 'level']);
      expect(data.headingOrder[0].level).to.equal(3);
      expect(data.headingOrder[0].ancestry).to.have.length(1);
      const ancestry = data.headingOrder[0].ancestry[0];
      expect(ancestry).to.match(/^html > body(?: > div:nth-child\([1-9]\d*\))+ > h3:nth-child\([1-9]\d*\)$/);
      const actualAncestorTags: string[] = [];
      for (let ancestor: Element | null = heading!; ancestor; ancestor = ancestor.parentElement) {
        actualAncestorTags.unshift(ancestor.tagName.toLowerCase());
      }
      expect(ancestry.split(' > ').map(part => part.split(':')[0])).to.deep.equal(actualAncestorTags);
      expect(node.any).to.deep.equal([
        {
          id: 'heading-order',
          data,
          relatedNodes: [],
          impact: 'moderate',
          message: 'Unable to determine previous heading',
        },
      ]);
      expect(node.all).to.deep.equal([]);
      expect(node.none).to.deep.equal([]);
      continue;
    }
    expect(rule.id, 'only the scoped modal sentinel manual review is allowed').to.equal('aria-hidden-focus');
    expect(rule.impact).to.equal('serious');
    expect(storyPopover).to.equal(true);
    expect(modal).not.to.equal(null);
    expect(rule.nodes.length).to.be.greaterThan(0);
    rule.nodes.forEach(node => checkSentinel(node, 'focusable-modal-open'));
  }
};
const audit = (stage = 'final') =>
  cy.document().then(doc => {
    const elements = Array.from(
      doc.querySelectorAll<HTMLElement>('#fixture, .fui-MenuPopover, .fui-PopoverSurface, [role="tooltip"]'),
    );
    return axe.run(elements, { elementRef: true }).then(result => {
      cy.writeFile(`${auditDirectory}/audit-${auditIndex++}.json`, {
        test: Cypress.currentTest.titlePath.join(' :: '),
        stage,
        environment: Cypress.env(),
        retries: Cypress.config('retries'),
        result: JSON.parse(
          JSON.stringify(result, (_key, value: unknown) =>
            value instanceof doc.defaultView!.Element
              ? { actualDOMElement: true, tagName: value.tagName, html: value.outerHTML }
              : value,
          ),
        ),
      });
      const classify = () => {
        const scenario = Cypress.currentTest.title;
        assertKnownFindings(result, doc, stage, scenario);
        if (round >= 6) {
          const mutations: Array<[string, (changed: axe.AxeResults) => void]> = [
            ['unknown violation', changed => changed.violations.push({ ...result.passes[0], id: 'unknown-rule' })],
            ['unknown incomplete', changed => changed.incomplete.push({ ...result.passes[0], id: 'unknown-rule' })],
            [
              'zero evaluated passes',
              changed => {
                changed.passes = [];
              },
            ],
          ];
          for (const kind of ['violations', 'incomplete'] as const) {
            for (const [ruleIndex, rule] of result[kind].entries()) {
              const prefix = `${kind} ${rule.id}`;
              mutations.push(
                [
                  `${prefix} target`,
                  changed => {
                    changed[kind][ruleIndex].nodes[0].target = ['#before'];
                  },
                ],
                [
                  `${prefix} html`,
                  changed => {
                    changed[kind][ruleIndex].nodes[0].html = '<button>Impostor</button>';
                  },
                ],
                [
                  `${prefix} live element`,
                  changed => {
                    changed[kind][ruleIndex].nodes[0].element = doc.querySelector<HTMLElement>('#before')!;
                  },
                ],
                [
                  `${prefix} impact`,
                  changed => {
                    changed[kind][ruleIndex].nodes[0].impact = 'minor';
                  },
                ],
                [
                  `${prefix} rule impact`,
                  changed => {
                    changed[kind][ruleIndex].impact = 'minor';
                  },
                ],
                [
                  `${prefix} empty nodes`,
                  changed => {
                    changed[kind][ruleIndex].nodes = [];
                  },
                ],
                [
                  `${prefix} extra check`,
                  changed => {
                    changed[kind][ruleIndex].nodes[0].none.push({
                      id: 'unknown',
                      data: null,
                      relatedNodes: [],
                      impact: 'serious',
                      message: 'unknown',
                    });
                  },
                ],
                [
                  `${prefix} check message`,
                  changed => {
                    const node = changed[kind][ruleIndex].nodes[0];
                    (node.any[0] || node.all[0]).message = 'unknown';
                  },
                ],
                [
                  `${prefix} check identity`,
                  changed => {
                    const node = changed[kind][ruleIndex].nodes[0];
                    (node.any[0] || node.all[0]).id = 'unknown-check';
                  },
                ],
                [
                  `${prefix} check impact`,
                  changed => {
                    const node = changed[kind][ruleIndex].nodes[0];
                    (node.any[0] || node.all[0]).impact = 'minor';
                  },
                ],
                [
                  `${prefix} check group`,
                  changed => {
                    const node = changed[kind][ruleIndex].nodes[0];
                    if (node.any.length) {
                      node.none = node.any;
                      node.any = [];
                    } else {
                      node.none = node.all;
                      node.all = [];
                    }
                  },
                ],
                [
                  `${prefix} check data`,
                  changed => {
                    const node = changed[kind][ruleIndex].nodes[0];
                    (node.any[0] || node.all[0]).data = { unknown: true };
                  },
                ],
                [
                  `${prefix} related node`,
                  changed => {
                    const node = changed[kind][ruleIndex].nodes[0];
                    (node.any[0] || node.all[0]).relatedNodes = [
                      { html: '<button>Unknown</button>', target: ['#before'] },
                    ];
                  },
                ],
              );
            }
          }
          for (const [label, mutate] of mutations) {
            const changed: axe.AxeResults = JSON.parse(
              JSON.stringify(result, (_key, value: unknown) =>
                value instanceof doc.defaultView!.Element ? undefined : value,
              ),
            );
            for (const kind of ['violations', 'incomplete'] as const) {
              changed[kind].forEach((rule, ruleIndex) => {
                rule.nodes.forEach((node, nodeIndex) => {
                  const actual = result[kind][ruleIndex].nodes[nodeIndex];
                  node.element = actual.element;
                  for (const group of ['any', 'all', 'none'] as const) {
                    node[group].forEach((check, checkIndex) => {
                      check.relatedNodes?.forEach((related, relatedIndex) => {
                        related.element = actual[group][checkIndex].relatedNodes?.[relatedIndex].element;
                      });
                    });
                  }
                });
              });
            }
            mutate(changed);
            expect(() => assertKnownFindings(changed, doc, stage, scenario), label).to.throw();
          }
          expect(() => assertKnownFindings(result, doc, 'unknown-phase', scenario), 'unknown phase').to.throw();
          expect(() => assertKnownFindings(result, doc, stage, 'unknown-scenario'), 'unknown scenario').to.throw();
          cy.writeFile(`${auditDirectory}/classifier-${auditIndex - 1}.json`, {
            test: scenario,
            stage,
            rejectedMutations: [...mutations.map(([label]) => label), 'unknown phase', 'unknown scenario'],
          });
        }
      };
      cy.then(classify);
    });
  });
// Classifier failures belong to the testcase, not a hook that aborts later scenarios.
const it = (title: string, body: () => void): Mocha.Test =>
  globalThis.it(title, () => {
    body();
    return audit();
  });

const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
const cssColor = (token: string) => (token === 'transparent' ? 'rgba(0, 0, 0, 0)' : rgb(token));

if (round >= 8) {
  describe('ONLY129 round 8: complete supported themed-disabled style and live availability matrix', () => {
    for (const [themeName, theme] of [
      ['web light', webLightTheme],
      ['web dark', webDarkTheme],
      ['teams light', teamsLightTheme],
      ['teams dark', teamsDarkTheme],
      ['teams high contrast', teamsHighContrastTheme],
    ] as const) {
      for (const appearance of ['primary', 'subtle', 'transparent'] as const) {
        for (const state of ['disabled', 'disabledFocusable', 'both'] as const) {
          it(`R8 ${themeName} ${appearance} ${state} exact disabled tokens and live restoration preserve native semantics`, () => {
            const clicked = cy.spy().as('clicked');
            const focusable = state !== 'disabled';
            const Fixture = () => {
              const [enabled, setEnabled] = React.useState(false);
              return (
                <>
                  <button id="update" onClick={() => setEnabled(value => !value)}>
                    Update availability
                  </button>
                  <FluentProvider theme={theme}>
                    <Toolbar aria-label="Themed availability">
                      <ToolbarButton
                        id="action"
                        appearance={appearance}
                        icon={<Icon />}
                        disabled={!enabled && state !== 'disabledFocusable'}
                        disabledFocusable={!enabled && focusable}
                        onClick={clicked}
                      >
                        Run
                      </ToolbarButton>
                      <ToolbarButton id="second">Second</ToolbarButton>
                      <ToolbarButton id="third">Third</ToolbarButton>
                    </Toolbar>
                  </FluentProvider>
                </>
              );
            };
            render(<Fixture />);
            const disabledBackground =
              appearance === 'primary' ? rgb(theme.colorNeutralBackgroundDisabled) : 'rgba(0, 0, 0, 0)';
            cy.get('#action').then($initial => {
              const root = $initial[0];
              cy.get('#action')
                .should('have.prop', 'disabled', !focusable)
                .and('have.css', 'background-color', disabledBackground)
                .and('have.css', 'color', rgb(theme.colorNeutralForegroundDisabled))
                .and('have.css', 'cursor', 'not-allowed');
              cy.get('#action .fui-Button__icon').should(
                'have.css',
                'color',
                rgb(theme.colorNeutralForegroundDisabled),
              );
              cy.get('#action').realHover();
              cy.get('#action')
                .should('have.css', 'background-color', disabledBackground)
                .and('have.css', 'color', rgb(theme.colorNeutralForegroundDisabled));
              cy.get('#action').realClick();
              if (focusable) {
                focused('action');
                cy.realPress('Enter');
                cy.realPress('Space');
              }
              cy.get('@clicked').should('not.have.been.called');
              cy.get('#update').focus();
              cy.realPress('Tab');
              focused(focusable ? 'action' : 'second');
              cy.get('#update').realClick();
              cy.get('#action')
                .should($enabled => expect($enabled[0]).to.equal(root))
                .and('not.be.disabled');
              cy.get('#action').should('not.have.attr', 'aria-disabled');
              cy.get('#action').should(
                'have.css',
                'background-color',
                appearance === 'primary' ? rgb(theme.colorBrandBackground) : 'rgba(0, 0, 0, 0)',
              );
              cy.get('#action').realClick();
              cy.realPress('Enter');
              cy.realPress('Space');
              cy.get('@clicked').should('have.been.calledThrice');
              cy.get('#action').should('not.have.attr', 'aria-pressed');
              cy.get('#action').should('not.have.attr', 'aria-checked');
              cy.get('#action').should(
                'have.css',
                'background-color',
                appearance === 'primary'
                  ? rgb(theme.colorBrandBackgroundHover)
                  : appearance === 'subtle'
                  ? rgb(theme.colorSubtleBackgroundHover)
                  : cssColor(theme.colorTransparentBackgroundHover),
              );
              cy.get('#action').should(
                'have.css',
                'color',
                rgb(
                  appearance === 'primary'
                    ? theme.colorNeutralForegroundOnBrand
                    : appearance === 'subtle'
                    ? theme.colorNeutralForeground2Hover
                    : theme.colorNeutralForeground2BrandHover,
                ),
              );
              cy.get('#action .fui-Button__icon').should(
                'have.css',
                'color',
                rgb(
                  appearance === 'primary'
                    ? theme.colorNeutralForegroundOnBrand
                    : theme.colorNeutralForeground2BrandHover,
                ),
              );
              name('#action', 'Run');
            });
          });
        }
      }
    }
  });
}

if (round >= 7) {
  describe('ONLY129 round 7: remaining actual WithPopover owner triggers', () => {
    for (const [selector, heading, phase, next] of [
      ['[aria-label="Insert Formula"]', 'Insert Formula', 'open-formula-popover', 'Quick Actions'],
      ['button:contains("Quick Actions")', 'Quick Actions', 'open-quick-popover', 'Insert image'],
    ] as const) {
      for (const method of ['pointer', 'Enter', 'Space'] as const) {
        it(`R7 documented ${heading} ${method} opens the real modal and restores its owner trigger`, () => {
          render(<WithPopover />);
          if (method === 'pointer') {
            cy.get(selector).realClick();
          } else {
            cy.get(selector).focus().should('have.focus');
            cy.realPress(method);
          }
          cy.contains('.fui-PopoverSurface h3', heading).should('be.visible');
          cy.contains('.fui-PopoverSurface button', 'Close').should('have.focus');
          audit(phase);
          cy.realPress(['Shift', 'Tab']);
          cy.contains('.fui-PopoverSurface button', 'Close').should('have.focus');
          cy.realPress('Escape');
          cy.get('.fui-PopoverSurface').should('not.exist');
          cy.get(selector).should('have.focus');
          cy.realPress('ArrowRight');
          if (next === 'Quick Actions') {
            cy.contains('button', next).should('have.focus');
          } else {
            cy.get(`[aria-label="${next}"]`).should('have.focus');
          }
        });
      }
    }
  });
}

if (round >= 6) {
  describe('ONLY129 round 6: unit-derived hooks and adversarial native lifecycle', () => {
    for (const hook of ['full', 'base'] as const) {
      for (const as of ['button', 'a'] as const) {
        it(`R6 ${hook} ${as} hook exposes actual state, native root and minimal icon slot`, () => {
          const ref = React.createRef<HTMLButtonElement & HTMLAnchorElement>();
          const states: Array<ReturnType<typeof useToolbarButtonBase_unstable>> = [];
          const props: ToolbarButtonProps = { as, id: 'action', icon: <Icon />, children: 'Run', vertical: true };
          const Full = () => {
            const state = useToolbarButton_unstable(props, ref);
            useToolbarButtonStyles_unstable(state);
            states.push(state);
            expect(state.appearance).to.equal('subtle');
            expect(state.size).to.equal('medium');
            expect(state.shape).to.equal('rounded');
            return renderButton_unstable(state);
          };
          const Base = () => {
            const state = useToolbarButtonBase_unstable(props, ref);
            states.push(state);
            expect('appearance' in state).to.equal(false);
            expect('size' in state).to.equal(false);
            expect('shape' in state).to.equal(false);
            return renderButton_unstable(state);
          };
          render(hook === 'full' ? <Full /> : <Base />);
          cy.get('#action').should('have.prop', 'tagName', as === 'button' ? 'BUTTON' : 'A');
          name('#action', 'Run');
          cy.then(() => {
            const state = states[states.length - 1];
            expect(state.vertical).to.equal(true);
            expect(state.iconOnly).to.equal(false);
            expect(state.iconPosition).to.equal('before');
            expect(state.disabled).to.equal(false);
            expect(state.disabledFocusable).to.equal(false);
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- The inherited source unit explicitly verifies this current compatibility state field.
            expect(state.components).to.deep.equal({ root: 'button', icon: 'span' });
            expect(ref.current).to.equal(Cypress.$('#action')[0]);
            expect(state.icon?.children).to.equal(props.icon);
          });
          if (hook === 'full') {
            cy.get('#action').should('have.class', 'fui-Button').and('have.css', 'flex-direction', 'column');
          } else {
            cy.get('#action').should('not.have.class', 'fui-Button');
          }
          cy.get('#action').realClick();
          focused('action');
          cy.realPress('Space');
        });
      }
    }
    for (const as of ['button', 'a'] as const) {
      it(`R6 ${as} hook callback identity is stable while current callback and disabled state change`, () => {
        const states: ToolbarButtonState[] = [];
        const calls: string[] = [];
        const Fixture = () => {
          const [phase, setPhase] = React.useState(0);
          const state = useToolbarButton_unstable(
            {
              as,
              id: 'action',
              children: 'Run',
              disabledFocusable: phase === 1,
              'aria-disabled': false,
              title: `phase-${phase}`,
              onClick: () => calls.push(`phase-${phase}`),
            },
            null,
          );
          useToolbarButtonStyles_unstable(state);
          states.push(state);
          return (
            <>
              <button id="update" onClick={() => setPhase(value => value + 1)}>
                Update
              </button>
              {renderButton_unstable(state)}
            </>
          );
        };
        render(<Fixture />);
        cy.get('#action').realClick();
        cy.get('#update').realClick();
        cy.get('#action').should('have.attr', 'aria-disabled', 'true').realClick();
        cy.realPress('Space');
        cy.get('#update').realClick();
        cy.get('#action').should('have.attr', 'title', 'phase-2');
        cy.get('#action').should('have.attr', 'aria-disabled', 'false');
        cy.get('#action').realClick();
        cy.realPress('Enter');
        cy.then(() => {
          expect(calls).to.deep.equal(['phase-0', 'phase-2', 'phase-2']);
          expect(states.length).to.be.greaterThan(2);
          expect(states.every(state => state.root.onClick === states[0].root.onClick)).to.equal(true);
          if (as === 'a') {
            expect(states.every(state => state.root.onKeyDown === states[0].root.onKeyDown)).to.equal(true);
            expect(states.every(state => state.root.onKeyUp === states[0].root.onKeyUp)).to.equal(true);
          }
        });
        cy.get('#action').should('have.css', 'color', rgb(webLightTheme.colorNeutralForeground2Hover));
      });
      for (const key of ['Enter', 'Space'] as const) {
        it(`R6 ${as} ${key} trusted keyboard sequence honors native versus generated click timing`, () => {
          const events: Array<[string, boolean]> = [];
          render(
            <ToolbarButton
              as={as}
              id="action"
              onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>) =>
                events.push(['down', event.nativeEvent.isTrusted])
              }
              onKeyUp={(event: React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>) =>
                events.push(['up', event.nativeEvent.isTrusted])
              }
              onClick={(event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) =>
                events.push(['click', event.nativeEvent.isTrusted])
              }
            >
              Run
            </ToolbarButton>,
          );
          cy.get('#action').focus();
          focused('action');
          cy.realPress(key);
          cy.then(() =>
            expect(events).to.deep.equal(
              key === 'Enter'
                ? [
                    ['down', true],
                    ['click', as === 'button'],
                    ['up', true],
                  ]
                : [
                    ['down', true],
                    ['up', true],
                    ['click', as === 'button'],
                  ],
            ),
          );
        });
      }
      it(`R6 ${as} navigation and unrelated keys never invoke the action or create toggle state`, () => {
        const clicked = cy.spy().as('clicked');
        fixture({ as, onClick: clicked });
        cy.get('#first').focus();
        focused('first');
        for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape', 'a'] as const) {
          cy.realPress(key);
        }
        cy.get('@clicked').should('not.have.been.called');
        cy.get('#first').should('not.have.attr', 'aria-pressed');
        cy.get('#first').should('not.have.attr', 'aria-checked');
      });
      it(`R6 ${as} native disabled overrides aria-disabled false without permitting callbacks`, () => {
        const clicked = cy.spy().as('clicked');
        render(
          <ToolbarButton as={as} id="action" disabled aria-disabled="false" onClick={clicked}>
            Run
          </ToolbarButton>,
        );
        cy.get('#action').realClick();
        cy.get('@clicked').should('not.have.been.called');
        if (as === 'button') {
          cy.get('#action').should('be.disabled').and('have.attr', 'aria-disabled', 'false');
        } else {
          cy.get('#action').should('have.attr', 'aria-disabled', 'true').and('not.have.attr', 'href');
        }
      });
    }
    it('R6 root and icon object refs detach on unmount and attach to new nodes after remount', () => {
      const root = React.createRef<HTMLButtonElement>();
      const icon = React.createRef<HTMLSpanElement>();
      const Fixture = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setVisible(value => !value)}>
              Update
            </button>
            {visible && (
              <ToolbarButton id="action" ref={root} icon={{ ref: icon, children: <Icon /> }}>
                Run
              </ToolbarButton>
            )}
          </>
        );
      };
      render(<Fixture />);
      cy.get('#action').then($old => {
        const oldRoot = $old[0];
        const oldIcon = icon.current;
        cy.get('#update').realClick();
        cy.get('#action').should('not.exist');
        cy.then(() => {
          expect(root.current).to.equal(null);
          expect(icon.current).to.equal(null);
        });
        cy.get('#update').realClick();
        cy.get('#action')
          .should($new => {
            expect(root.current).to.equal($new[0]);
            expect(root.current).not.to.equal(oldRoot);
            expect(icon.current).to.equal($new[0].querySelector('.fui-Button__icon'));
            expect(icon.current).not.to.equal(oldIcon);
          })
          .realClick();
        cy.realPress('Space');
      });
    });
    it('R6 live theme, direction and mutable root/icon classes update without replacing roots', () => {
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(value => !value)}>
              Update
            </button>
            <FluentProvider theme={changed ? webDarkTheme : webLightTheme} dir={changed ? 'rtl' : 'ltr'}>
              <Toolbar aria-label="Live themed commands">
                <ToolbarButton
                  id="action"
                  appearance="primary"
                  className={changed ? 'new-root' : 'old-root'}
                  icon={{ children: <Icon />, className: changed ? 'new-icon' : 'old-icon' }}
                >
                  Run
                </ToolbarButton>
                <ToolbarButton id="two">Two</ToolbarButton>
                <ToolbarButton id="three">Three</ToolbarButton>
              </Toolbar>
            </FluentProvider>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#action').then($old => {
        const oldRoot = $old[0];
        cy.get('#action')
          .should('have.class', 'old-root')
          .and('have.css', 'background-color', rgb(webLightTheme.colorBrandBackground));
        cy.get('#update').realClick();
        cy.get('#action')
          .should($current => expect($current[0]).to.equal(oldRoot))
          .and('have.class', 'new-root')
          .and('not.have.class', 'old-root')
          .and('have.css', 'background-color', rgb(webDarkTheme.colorBrandBackground));
        cy.get('#action .fui-Button__icon').should('have.class', 'new-icon').and('not.have.class', 'old-icon');
        cy.get('#action').focus();
        focused('action');
        cy.realPress('ArrowLeft');
        focused('two');
        cy.get('#update').realClick();
        cy.get('#action').should('have.class', 'old-root').and('not.have.class', 'new-root');
        cy.get('#action').should('have.css', 'background-color', rgb(webLightTheme.colorBrandBackground));
        cy.get('#two').should('have.css', 'color', rgb(webLightTheme.colorNeutralForeground2));
      });
    });
    for (const controlled of [false, true]) {
      it(`R6 ${
        controlled ? 'controlled' : 'default'
      } toolbar checked values remain unrelated to an action press`, () => {
        const clicked = cy.spy().as('clicked');
        const checked = cy.spy().as('checked');
        const Fixture = () => {
          const [values, setValues] = React.useState({ commands: ['one'] });
          return (
            <>
              <button id="update" onClick={() => setValues({ commands: ['two'] })}>
                Update values
              </button>
              <Toolbar
                aria-label="Action not toggle"
                checkedValues={controlled ? values : undefined}
                defaultCheckedValues={controlled ? undefined : values}
                onCheckedValueChange={checked}
              >
                <ToolbarButton id="action" name="commands" value="one" onClick={clicked}>
                  Run
                </ToolbarButton>
                <ToolbarButton>Two</ToolbarButton>
                <ToolbarButton>Three</ToolbarButton>
              </Toolbar>
            </>
          );
        };
        render(<Fixture />);
        cy.get('#action').realClick();
        cy.realPress('Enter');
        cy.get('#update').realClick();
        cy.get('#action').realClick();
        cy.realPress('Space');
        cy.get('@clicked').should('have.callCount', 4);
        cy.get('@checked').should('not.have.been.called');
        cy.get('#action').should('not.have.attr', 'aria-pressed');
        cy.get('#action').should('not.have.attr', 'aria-checked');
      });
    }
    it('R6 native external form association and submitter name/value survive source prop filtering', () => {
      const submitted = cy.spy().as('submitted');
      render(
        <>
          <form
            id="external"
            onSubmit={event => {
              event.preventDefault();
              const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
              submitted(submitter.name, submitter.value, submitter.form?.id);
            }}
          />
          <ToolbarButton id="action" form="external" type="submit" name="command" value="save">
            Save
          </ToolbarButton>
        </>,
      );
      cy.get('#action').should('have.attr', 'form', 'external').realClick();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@submitted')
        .should('have.been.calledThrice')
        .then(() =>
          expect(submitted.getCalls().map(call => call.args)).to.deep.equal([
            ['command', 'save', 'external'],
            ['command', 'save', 'external'],
            ['command', 'save', 'external'],
          ]),
        );
    });
    it('R6 named empty native button without an icon does not become icon-only or lose activation', () => {
      const clicked = cy.spy().as('clicked');
      render(<ToolbarButton id="action" aria-label="Run" onClick={clicked} />);
      name('#action', 'Run');
      cy.get('#action').should('have.css', 'min-width', '96px').and('have.text', '').realClick();
      cy.realPress('Space');
      cy.get('@clicked').should('have.been.calledTwice');
      cy.get('#action .fui-Button__icon').should('not.exist');
    });
  });
}

if (round >= 5) {
  describe('ONLY129 round 5: documented themes, owner styling and responsive commands', () => {
    for (const [themeName, theme] of [
      ['web light', webLightTheme],
      ['web dark', webDarkTheme],
      ['teams light', teamsLightTheme],
      ['teams dark', teamsDarkTheme],
      ['teams high contrast', teamsHighContrastTheme],
    ] as const) {
      for (const appearance of ['primary', 'subtle', 'transparent'] as const) {
        for (const dir of ['ltr', 'rtl'] as const) {
          it(`R5 ${themeName} ${appearance} ${dir} paints exact tokens and remains a native action`, () => {
            const clicked = cy.spy().as('clicked');
            render(
              <FluentProvider theme={theme} dir={dir}>
                <Toolbar aria-label="Themed commands">
                  <ToolbarButton id="action" appearance={appearance} icon={<Icon />} onClick={clicked}>
                    Run
                  </ToolbarButton>
                  <ToolbarButton id="two">Two</ToolbarButton>
                  <ToolbarButton id="three">Three</ToolbarButton>
                </Toolbar>
              </FluentProvider>,
            );
            cy.get('#action')
              .should(
                'have.css',
                'background-color',
                appearance === 'primary' ? rgb(theme.colorBrandBackground) : 'rgba(0, 0, 0, 0)',
              )
              .and(
                'have.css',
                'color',
                rgb(appearance === 'primary' ? theme.colorNeutralForegroundOnBrand : theme.colorNeutralForeground2),
              )
              .and('have.attr', 'type', 'button')
              .and('not.have.attr', 'aria-pressed');
            cy.get('#action').realHover();
            cy.get('#action').should(
              'have.css',
              'background-color',
              appearance === 'primary'
                ? rgb(theme.colorBrandBackgroundHover)
                : appearance === 'subtle'
                ? rgb(theme.colorSubtleBackgroundHover)
                : cssColor(theme.colorTransparentBackgroundHover),
            );
            cy.get('#action').realClick();
            cy.realPress('Enter');
            cy.realPress('Space');
            cy.get('@clicked').should('have.been.calledThrice');
            cy.realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
            focused('two');
            cy.get('#action').should(
              'have.css',
              'color',
              rgb(
                appearance === 'primary'
                  ? theme.colorNeutralForegroundOnBrand
                  : appearance === 'subtle'
                  ? theme.colorNeutralForeground2Hover
                  : theme.colorNeutralForeground2BrandHover,
              ),
            );
            name('#action', 'Run');
          });
        }
      }
    }
    for (const vertical of [false, true]) {
      it(`R5 owner custom style hook runs after inherited ${
        vertical ? 'vertical' : 'horizontal'
      } root and icon styles`, () => {
        const states: ToolbarButtonState[] = [];
        const clicked = cy.spy().as('clicked');
        render(
          <CustomStyleHooksProvider
            value={{
              // eslint-disable-next-line @typescript-eslint/naming-convention -- Public custom-hook registration key.
              useToolbarButtonStyles_unstable: value => {
                const state = value as ToolbarButtonState;
                states.push(state);
                state.root.className = `${state.root.className} owner-custom-root`;
                state.root.style = { ...state.root.style, minWidth: 140 };
                if (state.icon) {
                  state.icon.className = `${state.icon.className} owner-custom-icon`;
                }
              },
            }}
          >
            <ToolbarButton id="action" vertical={vertical} icon={<Icon />} onClick={clicked}>
              Run
            </ToolbarButton>
          </CustomStyleHooksProvider>,
        );
        cy.get('#action')
          .should('have.class', 'owner-custom-root')
          .and('have.class', 'fui-Button')
          .and('have.css', 'min-width', '140px')
          .and('have.css', 'flex-direction', vertical ? 'column' : 'row');
        cy.get('#action .fui-Button__icon')
          .should('have.class', 'owner-custom-icon')
          .and('have.css', 'font-size', vertical ? '24px' : '20px');
        cy.then(() => {
          expect(states.length).to.be.greaterThan(0);
          expect(
            states.every(state => state.size === 'medium' && state.shape === 'rounded' && state.vertical === vertical),
          ).to.equal(true);
        });
        cy.get('#action').realClick();
        cy.realPress('Space');
        cy.get('@clicked').should('have.been.calledTwice');
      });
    }
    for (const width of [320, 640, 1280]) {
      it(`R5 ${width}px viewport preserves target sizes, group navigation and native activation`, () => {
        cy.viewport(width, 800);
        const clicked = cy.spy().as('clicked');
        render(
          <Toolbar aria-label="Responsive commands">
            <ToolbarGroup role="presentation">
              <ToolbarButton id="one" aria-label="Add" icon={<Icon />} onClick={clicked} />
              <ToolbarButton id="two">Two</ToolbarButton>
            </ToolbarGroup>
            <ToolbarDivider />
            <ToolbarGroup role="presentation">
              <ToolbarButton id="three">Three</ToolbarButton>
            </ToolbarGroup>
          </Toolbar>,
        );
        cy.get('#one').should('have.css', 'width', '32px').and('have.css', 'height', '32px');
        cy.get('#before').focus();
        cy.realPress('Tab');
        focused('one');
        cy.realPress('Space');
        cy.get('@clicked').should('have.been.calledOnce');
        cy.realPress('End');
        focused('three');
        cy.realPress('ArrowRight');
        focused('one');
        cy.get('[role="toolbar"]').should($toolbar =>
          expect($toolbar[0].getBoundingClientRect().right).to.be.at.most(width),
        );
      });
    }
  });
}

describe('ONLY129 round 1: documented defaults and toolbar keyboard contracts', () => {
  it('R1 default native button preserves unit defaults, name and medium rounded layout', () => {
    fixture();
    cy.get('#first')
      .should('have.prop', 'tagName', 'BUTTON')
      .and('have.attr', 'type', 'button')
      .should($button => {
        expect($button[0].hasAttribute('disabled')).to.equal(false);
        expect($button[0].hasAttribute('aria-disabled')).to.equal(false);
      })
      .and('have.class', 'fui-Button')
      .and('have.css', 'min-width', '96px')
      .and('have.css', 'border-radius', '4px')
      .and('have.css', 'font-size', '14px')
      .and('have.css', 'flex-direction', 'row');
    name('#first', 'First');
    cy.get('#toolbar').should('have.attr', 'role', 'toolbar').and('not.have.attr', 'aria-orientation');
    cy.get('#first').realClick();
    focused('first');
  });
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const vertical of [false, true]) {
      it(`R1 ${dir} ${vertical ? 'vertical' : 'horizontal'} circular arrows and single Tab stop`, () => {
        fixture({}, dir, vertical);
        cy.get('#before').focus();
        cy.realPress('Tab');
        focused('first');
        const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
        const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
        cy.realPress(forward);
        focused('second');
        cy.realPress(forward);
        focused('third');
        cy.realPress(forward);
        focused('first');
        cy.realPress(backward);
        focused('third');
        cy.realPress('ArrowDown');
        focused('first');
        cy.realPress('ArrowUp');
        focused('third');
        cy.realPress('Tab');
        focused('after');
        cy.realPress(['Shift', 'Tab']);
        focused('third');
        cy.realPress(['Shift', 'Tab']);
        focused('before');
        cy.get('#toolbar').should('have.css', 'flex-direction', vertical ? 'column' : 'row');
        if (vertical) {
          cy.get('#toolbar').should('have.attr', 'aria-orientation', 'vertical');
        }
      });
    }
  }
  for (const key of ['Enter', 'Space'] as const) {
    it(`R1 enabled ${key} and pointer activate exactly once with target and bubbling`, () => {
      const clicks = cy.spy().as('clicks');
      const parent = cy.spy().as('parent');
      render(
        <div onClick={parent}>
          <ToolbarButton id="action" onClick={clicks}>
            Run
          </ToolbarButton>
        </div>,
      );
      cy.get('#action').realClick();
      cy.get('@clicks').should('have.been.calledOnce');
      cy.get('@parent').should('have.been.calledOnce');
      cy.realPress(key);
      cy.get('@clicks')
        .should('have.been.calledTwice')
        .then(() => {
          const event = clicks.secondCall.args[0] as React.MouseEvent<HTMLButtonElement>;
          expect(event.type).to.equal('click');
          expect(event.target).to.equal(Cypress.$('#action')[0]);
        });
      cy.get('@parent').should('have.been.calledTwice');
    });
  }
  for (const [label, Story, padding] of [
    ['small', Small, '0px 4px'],
    ['medium', Medium, '4px 8px'],
    ['large', Large, '4px 20px'],
  ] as const) {
    it(`R1 documented ${label} story changes toolbar spacing, not ToolbarButton size`, () => {
      render(<Story />);
      cy.get('[role="toolbar"]').should('have.css', 'padding', padding);
      cy.get('[role="toolbar"] button')
        .should('have.length', 3)
        .each($button => {
          expect($button.css('width')).to.equal('32px');
          expect($button.css('height')).to.equal('32px');
        });
      name('[aria-label="Increase Font Size"]', 'Increase Font Size');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('[aria-label="Increase Font Size"]').should('have.focus');
      cy.realPress('ArrowRight');
      cy.get('[aria-label="Decrease Font Size"]').should('have.focus');
    });
  }
  it('R1 documented Default reaches menu trigger across separator and Escape restores focus', () => {
    render(<Default />);
    cy.get('[aria-label="Reset Font Size"]').focus();
    cy.realPress('ArrowRight');
    cy.get('[aria-label="More"]').should('have.focus').and('have.attr', 'aria-haspopup', 'menu');
    cy.realPress('Enter');
    cy.get('[role="menu"]').should('be.visible');
    cy.contains('[role="menuitem"]', 'New Window').should('be.visible');
    cy.realPress('Escape');
    cy.get('[role="menu"]').should('not.exist');
    cy.get('[aria-label="More"]').should('have.focus');
  });
  it('R1 documented VerticalButton stacks icons and text without making toolbar vertical', () => {
    render(<VerticalButton />);
    cy.get('[role="toolbar"]').should('have.css', 'flex-direction', 'row');
    cy.contains('button', 'Increase').should('have.css', 'flex-direction', 'column').realClick();
    cy.realPress('ArrowRight');
    cy.contains('button', 'Decrease').should('have.focus');
    cy.get('.fui-Button__icon').each($icon => expect($icon.css('font-size')).to.equal('24px'));
  });
  it('R1 documented FarGroup crosses both groups without focusing divider or group', () => {
    render(<FarGroup />);
    cy.get('[role="toolbar"] button').should('have.length', 9).first().focus();
    for (let index = 1; index < 9; index++) {
      cy.realPress('ArrowRight');
      cy.get('[role="toolbar"] button').eq(index).should('have.focus');
    }
    cy.realPress('ArrowRight');
    cy.get('[role="toolbar"] button').first().should('have.focus');
    cy.get('[role="toolbar"]').should($toolbar => {
      const buttons = $toolbar[0].querySelectorAll('button');
      expect(buttons[6].getBoundingClientRect().left).to.be.greaterThan(buttons[5].getBoundingClientRect().right);
    });
  });
  it('R1 default type prevents accidental form submission but explicit submit honors native form', () => {
    const submitted = cy.spy().as('submitted');
    render(
      <form
        onSubmit={event => {
          event.preventDefault();
          submitted();
        }}
      >
        <ToolbarButton id="default">Default</ToolbarButton>
        <ToolbarButton id="submit" type="submit">
          Submit
        </ToolbarButton>
      </form>,
    );
    cy.get('#default').realClick();
    cy.realPress('Enter');
    cy.get('@submitted').should('not.have.been.called');
    cy.get('#submit').realClick();
    cy.get('@submitted').should('have.been.calledOnce');
    cy.realPress('Space');
    cy.get('@submitted').should('have.been.calledTwice');
  });
  it('R1 standalone ToolbarButton keeps normal tab order outside any toolbar', () => {
    render(
      <>
        <ToolbarButton id="one">One</ToolbarButton>
        <ToolbarButton id="two">Two</ToolbarButton>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    focused('one');
    cy.realPress('ArrowRight');
    focused('one');
    cy.realPress('Tab');
    focused('two');
    cy.realPress('Tab');
    focused('after');
  });
  it('R1 nested presentation groups and divider are skipped by real arrow navigation', () => {
    render(
      <Toolbar aria-label="Grouped">
        <ToolbarGroup role="presentation">
          <ToolbarButton id="one">One</ToolbarButton>
        </ToolbarGroup>
        <ToolbarDivider />
        <ToolbarGroup role="presentation">
          <ToolbarButton id="two">Two</ToolbarButton>
          <ToolbarButton id="three">Three</ToolbarButton>
        </ToolbarGroup>
      </Toolbar>,
    );
    cy.get('#one').focus();
    cy.realPress('ArrowRight');
    focused('two');
    cy.realPress('End');
    focused('three');
    cy.realPress('Home');
    focused('one');
  });
});

if (round >= 2) {
  describe('ONLY129 round 2: disabled, links and inherited unit behavior', () => {
    for (const [label, props, focusable] of [
      ['disabled', { disabled: true }, false],
      ['disabledFocusable', { disabledFocusable: true }, true],
      ['both', { disabled: true, disabledFocusable: true }, true],
    ] as const) {
      it(`R2 native ${label} suppresses pointer, Enter, Space and bubbling with exact semantics`, () => {
        const clicked = cy.spy().as('clicked');
        const parent = cy.spy().as('parent');
        render(
          <div onClick={parent}>
            <ToolbarButton id="action" {...props} onClick={clicked}>
              Run
            </ToolbarButton>
          </div>,
        );
        cy.get('#action').should('have.prop', 'disabled', !focusable);
        if (focusable) {
          cy.get('#action').should('have.attr', 'aria-disabled', 'true');
        } else {
          cy.get('#action').should('not.have.attr', 'aria-disabled');
        }
        cy.get('#before').focus();
        cy.realPress('Tab');
        focused(focusable ? 'action' : 'after');
        cy.get('#action').realClick();
        if (focusable) {
          focused('action');
          cy.realPress('Enter');
          cy.realPress('Space');
        }
        cy.get('@clicked').should('not.have.been.called');
        cy.get('@parent').should('not.have.been.called');
        cy.get('#action').should('have.css', 'cursor', 'not-allowed');
      });
    }
    for (const ariaDisabled of [true, 'true'] as const) {
      it(`R2 aria-disabled ${typeof ariaDisabled} blocks native activation without native disabling`, () => {
        const clicked = cy.spy().as('clicked');
        const parent = cy.spy().as('parent');
        render(
          <div onClick={parent}>
            <ToolbarButton id="action" aria-disabled={ariaDisabled} onClick={clicked}>
              Run
            </ToolbarButton>
          </div>,
        );
        cy.get('#action').should('have.prop', 'disabled', false).realClick();
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('@clicked').should('not.have.been.called');
        cy.get('@parent').should('not.have.been.called');
        cy.get('#action').should('have.attr', 'aria-disabled', 'true');
        name('#action', 'Run');
      });
    }
    for (const ariaDisabled of [false, 'false'] as const) {
      it(`R2 aria-disabled false ${typeof ariaDisabled} does not accidentally disable clicks`, () => {
        const clicked = cy.spy().as('clicked');
        render(
          <ToolbarButton id="action" aria-disabled={ariaDisabled} onClick={clicked}>
            Run
          </ToolbarButton>,
        );
        cy.get('#action').realClick();
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('@clicked').should('have.been.calledThrice');
      });
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const vertical of [false, true]) {
        it(`R2 ${dir} ${
          vertical ? 'vertical' : 'horizontal'
        } arrows skip disabled but include disabledFocusable`, () => {
          const clicked = cy.spy().as('clicked');
          render(
            <Toolbar aria-label="Disabled commands" vertical={vertical}>
              <ToolbarButton id="one">One</ToolbarButton>
              <ToolbarButton id="skip" disabled>
                Skip
              </ToolbarButton>
              <ToolbarButton id="discover" disabledFocusable onClick={clicked}>
                Unavailable
              </ToolbarButton>
              <ToolbarButton id="last">Last</ToolbarButton>
            </Toolbar>,
            dir,
          );
          cy.get('#before').focus();
          cy.realPress('Tab');
          focused('one');
          const forward = vertical ? 'ArrowDown' : dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
          cy.realPress(forward);
          focused('discover');
          cy.realPress('Enter');
          cy.realPress('Space');
          cy.get('@clicked').should('not.have.been.called');
          cy.realPress(forward);
          focused('last');
          cy.realPress(forward);
          focused('one');
          cy.realPress('Tab');
          focused('after');
        });
      }
    }
    for (const [label, href] of [
      ['link', '#toolbar-destination'],
      ['href-less', undefined],
      ['empty-href', ''],
    ] as const) {
      it(`R2 ${label} anchor preserves role, focusability and one activation per input`, () => {
        const clicked = cy.spy().as('clicked');
        render(
          <ToolbarButton
            as="a"
            id="action"
            href={href}
            onClick={event => {
              event.preventDefault();
              clicked(event.type, event.currentTarget.tagName);
            }}
          >
            Destination
          </ToolbarButton>,
        );
        cy.get('#action')
          .should('have.prop', 'tagName', 'A')
          .should($anchor => {
            expect($anchor.attr('role')).to.equal(href ? undefined : 'button');
            if (!href) {
              expect($anchor[0].tabIndex).to.equal(0);
            }
          });
        name('#action', 'Destination');
        cy.get('#before').focus();
        cy.realPress('Tab');
        focused('action');
        cy.realPress('Enter');
        cy.get('@clicked').should('have.been.calledOnce');
        cy.realPress('Space');
        cy.get('@clicked').should('have.been.calledTwice');
        cy.get('#action').realClick();
        cy.get('@clicked').should('have.been.calledThrice').and('have.been.always.calledWithExactly', 'click', 'A');
      });
    }
    for (const [label, props, focusable] of [
      ['disabled', { disabled: true }, false],
      ['disabledFocusable', { disabledFocusable: true }, true],
      ['both', { disabled: true, disabledFocusable: true }, true],
      ['aria-disabled', { 'aria-disabled': true }, false],
    ] as const) {
      it(`R2 ${label} link removes href and cancels activation without losing link role`, () => {
        const clicked = cy.spy().as('clicked');
        const parent = cy.spy().as('parent');
        render(
          <div onClick={parent}>
            <ToolbarButton as="a" href="#not-visited" id="action" {...props} onClick={clicked}>
              Destination
            </ToolbarButton>
          </div>,
        );
        cy.get('#action').should($anchor => {
          expect($anchor[0].tagName).to.equal('A');
          expect($anchor.attr('href')).to.equal(undefined);
          expect($anchor.attr('role')).to.equal('link');
          expect($anchor.attr('aria-disabled')).to.equal('true');
          expect($anchor.attr('disabled')).to.equal(undefined);
        });
        cy.get('#before').focus();
        cy.realPress('Tab');
        focused(focusable ? 'action' : 'after');
        cy.get('#action').realClick();
        if (focusable) {
          cy.realPress('Enter');
          cy.realPress('Space');
        }
        cy.get('@clicked').should('not.have.been.called');
        cy.get('@parent').should('not.have.been.called');
      });
    }
    it('R2 native disabledFocusable omits consumer key handlers but anchors retain them', () => {
      const down = cy.spy().as('down');
      const up = cy.spy().as('up');
      render(
        <>
          <ToolbarButton id="native" disabledFocusable onKeyDown={down} onKeyUp={up}>
            Native
          </ToolbarButton>
          <ToolbarButton as="a" id="anchor" disabledFocusable onKeyDown={down} onKeyUp={up}>
            Anchor
          </ToolbarButton>
        </>,
      );
      cy.get('#native').focus();
      cy.realPress('Space');
      cy.realPress('Enter');
      cy.get('@down').should('not.have.been.called');
      cy.get('@up').should('not.have.been.called');
      cy.get('#anchor').focus();
      cy.realPress('Space');
      cy.realPress('Enter');
      cy.get('@down').should('have.been.calledTwice');
      cy.get('@up').should('have.been.calledTwice');
    });
    for (const key of ['Enter', 'Space'] as const) {
      it(`R2 anchor consumer prevention suppresses ${key} activation before built-in handling`, () => {
        const clicked = cy.spy().as('clicked');
        const down = cy.spy().as('down');
        const up = cy.spy().as('up');
        render(
          <ToolbarButton
            as="a"
            id="action"
            onClick={clicked}
            onKeyDown={event => {
              event.preventDefault();
              down(event.key);
            }}
            onKeyUp={event => {
              event.preventDefault();
              up(event.key);
            }}
          >
            Run
          </ToolbarButton>,
        );
        cy.get('#action').focus();
        cy.realPress(key);
        cy.get('@clicked').should('not.have.been.called');
        cy.get('@down').should('have.been.calledOnceWithExactly', key === 'Space' ? ' ' : 'Enter');
        cy.get('@up').should('have.been.calledOnceWithExactly', key === 'Space' ? ' ' : 'Enter');
      });
    }
    for (const type of ['submit', 'reset'] as const) {
      it(`R2 disabledFocusable ${type} cancels native form defaults for all inputs`, () => {
        const submitted = cy.spy().as('submitted');
        const reset = cy.spy().as('reset');
        const clicked = cy.spy().as('clicked');
        render(
          <form
            onSubmit={event => {
              event.preventDefault();
              submitted();
            }}
            onReset={reset}
          >
            <label htmlFor="field">Value</label>
            <input id="field" defaultValue="original" />
            <ToolbarButton id="action" type={type} disabledFocusable onClick={clicked}>
              Run
            </ToolbarButton>
          </form>,
        );
        cy.get('#field').clear().type('edited');
        cy.get('#action').realClick();
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('#field').should('have.value', 'edited');
        cy.get('@submitted').should('not.have.been.called');
        cy.get('@reset').should('not.have.been.called');
        cy.get('@clicked').should('not.have.been.called');
      });
    }
    it('R2 negative tabIndex excludes the command from toolbar navigation without disabling pointer activation', () => {
      const clicked = cy.spy().as('clicked');
      fixture({ tabIndex: -1, onClick: clicked });
      cy.get('#before').focus();
      cy.realPress('Tab');
      focused('second');
      cy.realPress('ArrowLeft');
      focused('third');
      cy.get('#first').realClick();
      focused('first');
      cy.get('@clicked').should('have.been.calledOnce');
    });
    it('R2 focus, blur and keyboard callbacks forward actual events and do not duplicate native click', () => {
      const events: string[] = [];
      render(
        <ToolbarButton
          id="action"
          onFocus={event => events.push(`focus:${event.currentTarget.id}`)}
          onBlur={event => events.push(`blur:${event.currentTarget.id}`)}
          onKeyDown={event => events.push(`down:${event.key}`)}
          onKeyUp={event => events.push(`up:${event.key}`)}
          onClick={event => events.push(`click:${event.currentTarget.id}`)}
        >
          Run
        </ToolbarButton>,
      );
      cy.get('#action').focus();
      cy.realPress('Enter');
      cy.get('#after').focus();
      cy.then(() =>
        expect(events).to.deep.equal(['focus:action', 'down:Enter', 'click:action', 'up:Enter', 'blur:action']),
      );
    });
    it('R2 actual href navigation is preserved for an enabled link', () => {
      render(
        <>
          <ToolbarButton as="a" id="action" href="#destination">
            Go to destination
          </ToolbarButton>
          <section id="destination" aria-label="Destination">
            Destination content
          </section>
        </>,
      );
      cy.get('#action').realClick();
      cy.location('hash').should('equal', '#destination');
      cy.get('#action').focus();
      cy.realPress('Enter');
      cy.location('hash').should('equal', '#destination');
    });
  });
}
if (round >= 3) {
  describe('ONLY129 round 3: slots, updates, composition and layout', () => {
    for (const [label, children] of [
      ['undefined', undefined],
      ['null', null],
      ['false', false],
      ['empty string', ''],
    ] as const) {
      it(`R3 unit-derived ${label} children produce a named 32px icon-only button`, () => {
        const clicked = cy.spy().as('clicked');
        render(
          <ToolbarButton id="action" icon={<Icon />} aria-label="Add" onClick={clicked}>
            {children}
          </ToolbarButton>,
        );
        name('#action', 'Add');
        cy.get('#action')
          .should('have.css', 'width', '32px')
          .and('have.css', 'height', '32px')
          .find('.fui-Button__icon')
          .should('have.length', 1)
          .find('svg')
          .should('have.attr', 'aria-hidden', 'true');
        cy.get('#action').realClick();
        cy.realPress('Space');
        cy.get('@clicked').should('have.been.calledTwice');
      });
    }

    if (round >= 4) {
      describe('ONLY129 round 4: inherited icon states and live toolbar boundaries', () => {
        for (const appearance of ['subtle', 'transparent'] as const) {
          for (const state of ['enabled', 'disabled', 'disabledFocusable'] as const) {
            it(`R4 ${appearance} bundled icon ${state} has exact resting, hover and activation behavior`, () => {
              const clicked = cy.spy().as('clicked');
              fixture({
                appearance,
                icon: <CalendarMonth />,
                onClick: clicked,
                disabled: state === 'disabled',
                disabledFocusable: state === 'disabledFocusable',
              });
              cy.get('#first .fui-Icon-filled').should('have.css', 'display', 'none');
              cy.get('#first .fui-Icon-regular').should('not.have.css', 'display', 'none');
              cy.get('#first').realHover();
              cy.get('#first .fui-Icon-filled').should('have.css', 'display', state === 'enabled' ? 'block' : 'none');
              cy.get('#first .fui-Icon-regular').should('have.css', 'display', state === 'enabled' ? 'none' : 'block');
              cy.get('#first').realClick();
              cy.get('@clicked').should(state === 'enabled' ? 'have.been.calledOnce' : 'not.have.been.called');
              cy.get('body').realHover({ position: 'topLeft' });
              cy.get('#second').focus();
              cy.get('#first .fui-Icon-filled').should('have.css', 'display', 'none');
              cy.get('#first .fui-Icon-regular').should('not.have.css', 'display', 'none');
            });
          }
        }
        it('R4 intrinsic name/value do not turn ToolbarButton into a toggle or call checked-value callback', () => {
          const checked = cy.spy().as('checked');
          const clicked = cy.spy().as('clicked');
          render(
            <Toolbar
              aria-label="Ordinary commands"
              defaultCheckedValues={{ commands: ['one'] }}
              onCheckedValueChange={checked}
            >
              <ToolbarButton id="one" name="commands" value="one" onClick={clicked}>
                One
              </ToolbarButton>
              <ToolbarButton>Two</ToolbarButton>
              <ToolbarButton>Three</ToolbarButton>
            </Toolbar>,
          );
          cy.get('#one').should('have.attr', 'name', 'commands').and('have.attr', 'value', 'one');
          cy.get('#one').realClick();
          cy.realPress('Space');
          cy.get('@clicked').should('have.been.calledTwice');
          cy.get('@checked').should('not.have.been.called');
          cy.get('#one').should('not.have.attr', 'aria-pressed');
          cy.get('#one').should('not.have.attr', 'aria-checked');
        });
        it('R4 two labelled toolbars keep navigation and remembered tab stops isolated', () => {
          render(
            <>
              <Toolbar aria-label="First toolbar">
                <ToolbarButton id="one">One</ToolbarButton>
                <ToolbarButton id="two">Two</ToolbarButton>
                <ToolbarButton id="three">Three</ToolbarButton>
              </Toolbar>
              <Toolbar aria-label="Second toolbar">
                <ToolbarButton id="four">Four</ToolbarButton>
                <ToolbarButton id="five">Five</ToolbarButton>
                <ToolbarButton id="six">Six</ToolbarButton>
              </Toolbar>
            </>,
          );
          cy.get('#before').focus();
          cy.realPress('Tab');
          focused('one');
          cy.realPress('ArrowLeft');
          focused('three');
          cy.realPress('Tab');
          focused('four');
          cy.realPress('ArrowRight');
          focused('five');
          cy.realPress('Tab');
          focused('after');
          cy.realPress(['Shift', 'Tab']);
          focused('five');
          cy.realPress(['Shift', 'Tab']);
          focused('three');
          cy.get('[role="toolbar"]').should('have.length', 2);
          name('[aria-label="First toolbar"]', 'First toolbar');
          name('[aria-label="Second toolbar"]', 'Second toolbar');
        });
        it('R4 insertion, removal and keyed reorder refresh the mover without replacing surviving roots', () => {
          const Fixture = () => {
            const [phase, setPhase] = React.useState(0);
            const ids =
              phase === 0 ? ['one', 'two', 'three'] : phase === 1 ? ['one', 'three'] : ['three', 'two', 'one'];
            return (
              <>
                <button id="update" onClick={() => setPhase(value => (value + 1) % 3)}>
                  Update membership
                </button>
                <Toolbar aria-label="Dynamic membership">
                  {ids.map(id => (
                    <ToolbarButton key={id} id={id}>
                      {id}
                    </ToolbarButton>
                  ))}
                </Toolbar>
              </>
            );
          };
          render(<Fixture />);
          cy.get('#one').then($one => {
            const root = $one[0];
            cy.get('#update').realClick();
            cy.get('#two').should('not.exist');
            cy.get('#one').focus();
            cy.realPress('ArrowRight');
            focused('three');
            cy.get('#update').realClick();
            cy.get('[role="toolbar"] button').should($buttons =>
              expect(Array.from($buttons, button => button.id)).to.deep.equal(['three', 'two', 'one']),
            );
            cy.get('#one')
              .should($current => expect($current[0]).to.equal(root))
              .focus();
            cy.realPress('ArrowRight');
            focused('three');
            cy.realPress('ArrowRight');
            focused('two');
          });
        });
        it('R4 enabled reset type performs the native reset once for pointer and Space', () => {
          const reset = cy.spy().as('reset');
          render(
            <form onReset={reset}>
              <label htmlFor="field">Value</label>
              <input id="field" defaultValue="original" />
              <ToolbarButton id="action" type="reset">
                Reset
              </ToolbarButton>
            </form>,
          );
          cy.get('#field').clear().type('edited');
          cy.get('#action').realClick();
          cy.get('#field').should('have.value', 'original');
          cy.get('@reset').should('have.been.calledOnce');
          cy.get('#field').clear().type('changed again');
          cy.get('#action').focus();
          cy.realPress('Space');
          cy.get('#field').should('have.value', 'original');
          cy.get('@reset').should('have.been.calledTwice');
        });
        for (const key of ['Enter', 'Space'] as const) {
          it(`R4 native consumer key prevention suppresses ${key} default activation`, () => {
            const clicked = cy.spy().as('clicked');
            const down = cy.spy().as('down');
            render(
              <ToolbarButton
                id="action"
                onClick={clicked}
                onKeyDown={event => {
                  event.preventDefault();
                  down(event.key);
                }}
              >
                Run
              </ToolbarButton>,
            );
            cy.get('#action').focus();
            cy.realPress(key);
            cy.get('@down').should('have.been.calledOnceWithExactly', key === 'Space' ? ' ' : 'Enter');
            cy.get('@clicked').should('not.have.been.called');
            cy.get('#action').realClick();
            cy.get('@clicked').should('have.been.calledOnce');
          });
        }
      });
    }
    it('R3 numeric zero children remain visible beside an icon rather than becoming icon-only', () => {
      render(
        <ToolbarButton id="action" icon={<Icon />}>
          {0}
        </ToolbarButton>,
      );
      name('#action', '0');
      cy.get('#action')
        .should('have.text', '0')
        .and('have.css', 'min-width', '96px')
        .find('.fui-Button__icon')
        .should('have.length', 1);
      cy.get('#action').realClick();
      focused('action');
    });
    it('R3 numeric zero icon shorthand is populated and receives icon-only sizing', () => {
      render(<ToolbarButton id="action" icon={0} aria-label="Zero" />);
      cy.get('#action').should('have.text', '0').and('have.css', 'width', '32px');
      name('#action', 'Zero');
      cy.get('#before').focus();
      cy.realPress('Tab');
      focused('action');
    });
    for (const icon of [undefined, null] as const) {
      it(`R3 ${String(icon)} optional icon is absent and text button stays usable`, () => {
        const clicked = cy.spy().as('clicked');
        render(
          <ToolbarButton id="action" icon={icon} onClick={clicked}>
            Run
          </ToolbarButton>,
        );
        cy.get('#action').should('have.text', 'Run').and('have.css', 'min-width', '96px');
        cy.get('#action .fui-Button__icon').should('not.exist');
        cy.get('#action').realClick();
        cy.get('@clicked').should('have.been.calledOnce');
      });
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const vertical of [false, true]) {
        it(`R3 ${dir} ${vertical ? 'vertical' : 'horizontal'} icon and text order has measurable layout`, () => {
          render(
            <ToolbarButton id="action" vertical={vertical} icon={<Icon />}>
              <span id="label">Add</span>
            </ToolbarButton>,
            dir,
          );
          cy.get('#action').should('have.css', 'flex-direction', vertical ? 'column' : 'row');
          cy.get('.fui-Button__icon').should('have.css', 'font-size', vertical ? '24px' : '20px');
          cy.get('#action').should($button => {
            const iconRect = $button[0].querySelector('.fui-Button__icon')!.getBoundingClientRect();
            const labelRect = $button[0].querySelector('#label')!.getBoundingClientRect();
            if (vertical) {
              expect(iconRect.bottom).to.be.at.most(labelRect.top);
            } else if (dir === 'ltr') {
              expect(iconRect.right).to.be.lessThan(labelRect.left);
            } else {
              expect(labelRect.right).to.be.lessThan(iconRect.left);
            }
            expect($button[0].firstElementChild?.classList.contains('fui-Button__icon')).to.equal(true);
          });
          cy.get('#action').realClick();
          focused('action');
        });
      }
    }
    for (const appearance of ['primary', 'subtle', 'transparent'] as const) {
      it(`R3 ${appearance} exact theme colors change on real hover and show keyboard focus`, () => {
        fixture({ appearance, icon: <Icon /> });
        const background = appearance === 'primary' ? rgb(webLightTheme.colorBrandBackground) : 'rgba(0, 0, 0, 0)';
        const hoverBackground =
          appearance === 'primary'
            ? rgb(webLightTheme.colorBrandBackgroundHover)
            : appearance === 'subtle'
            ? rgb(webLightTheme.colorSubtleBackgroundHover)
            : 'rgba(0, 0, 0, 0)';
        cy.get('#first').should('have.css', 'background-color', background);
        cy.get('#first').realHover();
        cy.get('#first').should('have.css', 'background-color', hoverBackground).and('have.css', 'cursor', 'pointer');
        if (appearance !== 'primary') {
          cy.get('#first .fui-Button__icon').should(
            'have.css',
            'color',
            rgb(webLightTheme.colorNeutralForeground2BrandHover),
          );
        }
        cy.get('body').realHover({ position: 'topLeft' });
        cy.get('#before').focus();
        cy.realPress('Tab');
        focused('first');
        cy.get('#first').should($button => {
          const style = getComputedStyle($button[0]);
          expect(style.boxShadow, 'keyboard focus is painted').not.to.equal('none');
          expect(style.borderTopColor).to.equal(rgb(webLightTheme.colorStrokeFocus2));
        });
      });
    }
    for (const size of ['small', 'medium', 'large'] as const) {
      it(`R3 ${size} Button context sizes ordinary Button but does not override ToolbarButton`, () => {
        render(
          <ButtonContextProvider value={{ size }}>
            <Button id="ordinary" icon={<Icon />} aria-label="Ordinary" />
            <Toolbar size={size} vertical aria-label="Explicit context">
              <ToolbarButton id="action" icon={<Icon />}>
                Run
              </ToolbarButton>
              <ToolbarButton>Second</ToolbarButton>
              <ToolbarButton>Third</ToolbarButton>
            </Toolbar>
          </ButtonContextProvider>,
        );
        cy.get('#ordinary').should('have.css', 'width', size === 'small' ? '24px' : size === 'large' ? '40px' : '32px');
        cy.get('#action')
          .should('have.css', 'font-size', '14px')
          .and('have.css', 'flex-direction', 'row')
          .and('have.css', 'min-width', '96px');
        cy.get('#action .fui-Button__icon').should('have.css', 'font-size', '20px');
        cy.get('#action').realClick();
        cy.realPress('ArrowDown');
        cy.contains('button', 'Second').should('have.focus');
      });
    }
    it('R3 icon slot preserves span, attributes, class, style, ref and bubbling target', () => {
      const iconRef = React.createRef<HTMLSpanElement>();
      const clicked = cy.spy().as('clicked');
      render(
        <ToolbarButton
          id="action"
          className="owner-root"
          title="Command"
          data-owner="yes"
          icon={{
            id: 'custom-icon',
            ref: iconRef,
            className: 'owner-icon',
            'aria-hidden': true,
            title: 'Decorative icon',
            style: { color: 'rgb(120, 0, 0)', margin: 0 },
            children: <Icon />,
          }}
          onClick={event => clicked(event.currentTarget.id, (event.target as Element).tagName)}
        >
          Run
        </ToolbarButton>,
      );
      cy.get('#action')
        .should('have.class', 'owner-root')
        .and('have.attr', 'data-owner', 'yes')
        .and('have.attr', 'title', 'Command');
      cy.get('#custom-icon')
        .should('have.prop', 'tagName', 'SPAN')
        .and('have.class', 'owner-icon')
        .and('have.class', 'fui-Button__icon')
        .and('have.css', 'margin', '0px')
        .and('have.css', 'color', 'rgb(120, 0, 0)');
      cy.then(() => expect(iconRef.current).to.equal(Cypress.$('#custom-icon')[0]));
      name('#action', 'Command');
      cy.get('#custom-icon svg').realClick();
      cy.get('@clicked').should('have.been.calledOnceWithExactly', 'action', 'path');
    });
    it('R3 icon slot render function customizes actual markup without losing default icon styling', () => {
      const renderIcon: SlotRenderFunction<React.ComponentProps<'span'>> = (Component, props) => (
        <Component {...props} id="rendered-icon" aria-hidden="true">
          <Icon />
        </Component>
      );
      render(
        <ToolbarButton
          id="action"
          icon={{
            children: renderIcon,
          }}
        >
          Run
        </ToolbarButton>,
      );
      cy.get('#rendered-icon')
        .should('have.class', 'fui-Button__icon')
        .and('have.css', 'width', '20px')
        .find('svg')
        .should('have.length', 1);
      cy.get('#rendered-icon').realClick();
      focused('action');
      name('#action', 'Run');
    });
    for (const as of ['button', 'a'] as const) {
      it(`R3 ${as} forwarded object ref points to the real root and can focus it`, () => {
        const ref = React.createRef<HTMLButtonElement & HTMLAnchorElement>();
        render(
          <ToolbarButton as={as} id="action" ref={ref}>
            Run
          </ToolbarButton>,
        );
        cy.then(() => {
          expect(ref.current).to.equal(Cypress.$('#action')[0]);
          expect(ref.current?.tagName).to.equal(as === 'a' ? 'A' : 'BUTTON');
          ref.current?.focus();
        });
        focused('action');
        cy.realPress('Enter');
      });
    }
    it('R3 callback ref receives the root and null on real controlled unmount', () => {
      const refs: Array<HTMLButtonElement | HTMLAnchorElement | null> = [];
      const Fixture = () => {
        const [visible, setVisible] = React.useState(true);
        const ref = React.useCallback((element: HTMLButtonElement | HTMLAnchorElement | null) => {
          refs.push(element);
        }, []);
        return (
          <>
            <button id="toggle" onClick={() => setVisible(value => !value)}>
              Toggle
            </button>
            {visible && (
              <ToolbarButton id="action" ref={ref}>
                Run
              </ToolbarButton>
            )}
          </>
        );
      };
      render(<Fixture />);
      cy.get('#action').then($button => expect(refs).to.deep.equal([$button[0], null, $button[0]]));
      cy.get('#toggle').realClick();
      cy.get('#action').should('not.exist');
      cy.then(() => {
        expect(refs).to.have.length(4);
        expect(refs[3]).to.equal(null);
      });
      cy.get('#toggle').realClick();
      cy.get('#action').then($button => {
        expect(refs).to.have.length(7);
        expect(refs.slice(4)).to.deep.equal([$button[0], null, $button[0]]);
      });
    });
    it('R3 user inline layout overrides survive vertical style and remain pointer/keyboard usable', () => {
      render(
        <ToolbarButton
          id="action"
          vertical
          icon={<Icon />}
          style={{ width: 180, minWidth: 180, height: 64, flexDirection: 'row', borderRadius: 0 }}
        >
          Wide
        </ToolbarButton>,
      );
      cy.get('#action')
        .should('have.css', 'width', '180px')
        .and('have.css', 'height', '64px')
        .and('have.css', 'flex-direction', 'row')
        .and('have.css', 'border-radius', '0px');
      cy.get('#action').realClick();
      cy.realPress('Space');
      focused('action');
    });
    it('R3 live disabled, appearance, vertical, icon and callback updates do not retain stale handlers', () => {
      const calls: string[] = [];
      const Fixture = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setChanged(value => !value)}>
              Update
            </button>
            <Toolbar aria-label="Updated commands">
              <ToolbarButton
                id="action"
                disabledFocusable={!changed}
                appearance={changed ? 'primary' : 'subtle'}
                vertical={changed}
                icon={changed ? <Icon /> : null}
                aria-label={changed ? 'Updated' : 'Original'}
                onClick={() => calls.push(changed ? 'new' : 'old')}
              >
                {changed ? 'Updated' : 'Original'}
              </ToolbarButton>
              <ToolbarButton id="two">Two</ToolbarButton>
              <ToolbarButton id="three">Three</ToolbarButton>
            </Toolbar>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#action').realClick();
      cy.then(() => expect(calls).to.deep.equal([]));
      cy.get('#update').realClick();
      cy.get('#action')
        .should('have.text', 'Updated')
        .and('have.css', 'flex-direction', 'column')
        .find('.fui-Button__icon')
        .should('have.length', 1);
      name('#action', 'Updated');
      cy.get('#action').should('not.have.attr', 'aria-disabled');
      cy.get('#action').realClick();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.then(() => expect(calls).to.deep.equal(['new', 'new', 'new']));
      cy.get('#update').realClick();
      cy.get('#action').should('have.attr', 'aria-disabled', 'true').and('have.css', 'flex-direction', 'row');
      cy.get('#action .fui-Button__icon').should('not.exist');
      cy.get('#action').realClick();
      cy.realPress('Enter');
      cy.then(() => expect(calls).to.deep.equal(['new', 'new', 'new']));
    });
    it('R3 toolbar orientation and size update in place while explicit button vertical stays independent', () => {
      const Fixture = () => {
        const [vertical, setVertical] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setVertical(value => !value)}>
              Update
            </button>
            <Toolbar
              id="toolbar"
              aria-label="Changing orientation"
              vertical={vertical}
              size={vertical ? 'large' : 'small'}
            >
              <ToolbarButton id="one" vertical icon={<Icon />}>
                One
              </ToolbarButton>
              <ToolbarButton id="two">Two</ToolbarButton>
              <ToolbarButton id="three">Three</ToolbarButton>
            </Toolbar>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#toolbar').should('have.css', 'padding', '0px 4px');
      cy.get('#one').should('have.css', 'flex-direction', 'column');
      cy.get('#update').realClick();
      cy.get('#toolbar')
        .should('have.css', 'flex-direction', 'column')
        .and('have.attr', 'aria-orientation', 'vertical');
      cy.get('#two').should('have.css', 'flex-direction', 'row').and('have.css', 'font-size', '14px');
      cy.get('#one').focus();
      focused('one');
      cy.realPress('ArrowDown');
      focused('two');
      cy.get('#update').realClick();
      cy.get('#toolbar').should('have.css', 'flex-direction', 'row').and('not.have.attr', 'aria-orientation');
      cy.get('#one').should('have.css', 'flex-direction', 'column');
    });
    it('R3 native disabled becomes enabled and re-enters roving navigation after a real update', () => {
      const Fixture = () => {
        const [disabled, setDisabled] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setDisabled(value => !value)}>
              Update
            </button>
            <Toolbar aria-label="Changing availability">
              <ToolbarButton id="one">One</ToolbarButton>
              <ToolbarButton id="two" disabled={disabled}>
                Two
              </ToolbarButton>
              <ToolbarButton id="three">Three</ToolbarButton>
            </Toolbar>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#one').focus();
      cy.realPress('ArrowRight');
      focused('three');
      cy.get('#update').realClick();
      cy.get('#two').should('not.be.disabled');
      cy.get('#one').focus();
      cy.realPress('ArrowRight');
      focused('two');
      cy.get('#update').realClick();
      cy.get('#two').should('be.disabled');
      cy.get('#one').focus();
      cy.realPress('ArrowRight');
      focused('three');
    });
    it('R3 changing anchor href and disabled state restores actual navigation attributes', () => {
      const Fixture = () => {
        const [enabled, setEnabled] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setEnabled(value => !value)}>
              Update
            </button>
            <ToolbarButton id="action" as="a" href={enabled ? '#restored' : '#original'} disabled={!enabled}>
              Destination
            </ToolbarButton>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#action').should('not.have.attr', 'href');
      cy.get('#update').realClick();
      cy.get('#action').should('have.attr', 'href', '#restored');
      cy.get('#action').should('not.have.attr', 'role');
      cy.get('#update').focus();
      cy.realPress('Space');
      cy.get('#action').should('not.have.attr', 'href');
      cy.get('#update').realClick();
      cy.get('#action').should('have.attr', 'href', '#restored').realClick();
      cy.location('hash').should('equal', '#restored');
      cy.get('#action').should('have.css', 'color', rgb(webLightTheme.colorNeutralForeground2Hover));
    });
    it('R3 live content switch between icon-only and text recalculates dimensions and accessible name', () => {
      const Fixture = () => {
        const [text, setText] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setText(value => !value)}>
              Update
            </button>
            <ToolbarButton id="action" icon={<Icon />} aria-label={text ? undefined : 'Add'}>
              {text ? 'Add item' : null}
            </ToolbarButton>
          </>
        );
      };
      render(<Fixture />);
      cy.get('#action').should('have.css', 'width', '32px');
      name('#action', 'Add');
      cy.get('#update').realClick();
      cy.get('#action').should('have.css', 'min-width', '96px').and('have.text', 'Add item');
      name('#action', 'Add item');
      cy.get('#update').realClick();
      cy.get('#action').should('have.css', 'width', '32px');
      name('#action', 'Add');
    });
    for (const method of ['pointer', 'Enter', 'Space'] as const) {
      it(`R3 menu ${method} opening, disabled item discovery, selection callback and focus restoration`, () => {
        const selected = cy.spy().as('selected');
        render(
          <Toolbar aria-label="Menu commands">
            <ToolbarButton id="one">One</ToolbarButton>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <ToolbarButton id="trigger">Actions</ToolbarButton>
              </MenuTrigger>
              <MenuPopover>
                <MenuList aria-labelledby="trigger">
                  <MenuItem onClick={() => selected('new')}>New</MenuItem>
                  <MenuItem disabled>Unavailable</MenuItem>
                  <MenuItem onClick={() => selected('save')}>Save</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
            <ToolbarButton id="three">Three</ToolbarButton>
          </Toolbar>,
        );
        if (method === 'pointer') {
          cy.get('#trigger').realClick();
        } else {
          cy.get('#trigger').focus();
          cy.realPress(method);
        }
        cy.get('#trigger').should('have.attr', 'aria-expanded', 'true').and('have.attr', 'aria-haspopup', 'menu');
        cy.contains('[role="menuitem"]', 'New').should('have.focus');
        audit('open-menu');
        cy.realPress('ArrowDown');
        cy.contains('[role="menuitem"]', 'Unavailable').should('have.focus').and('have.attr', 'aria-disabled', 'true');
        cy.realPress('Enter');
        cy.get('@selected').should('not.have.been.called');
        cy.get('[role="menu"]').should('be.visible');
        cy.realPress('ArrowDown');
        cy.contains('[role="menuitem"]', 'Save').should('have.focus');
        cy.realPress('Enter');
        cy.get('@selected').should('have.been.calledOnceWithExactly', 'save');
        cy.get('[role="menu"]').should('not.exist');
        focused('trigger');
        cy.get('#trigger').should('not.have.attr', 'aria-expanded');
        cy.realPress('ArrowRight');
        focused('three');
      });
    }
    for (const disabledFocusable of [false, true]) {
      it(`R3 disabled menu trigger ${disabledFocusable ? 'focusable' : 'native'} cannot open menu`, () => {
        render(
          <Toolbar aria-label="Unavailable actions">
            <ToolbarButton id="one">One</ToolbarButton>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <ToolbarButton id="trigger" disabled disabledFocusable={disabledFocusable}>
                  Actions
                </ToolbarButton>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem>New</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
            <ToolbarButton id="three">Three</ToolbarButton>
          </Toolbar>,
        );
        cy.get('#trigger').realClick();
        if (disabledFocusable) {
          cy.realPress('Enter');
          cy.realPress('Space');
        }
        cy.get('[role="menu"]').should('not.exist');
        cy.get('#trigger').should('not.have.attr', 'aria-expanded');
        cy.get('#one').focus();
        cy.realPress('ArrowRight');
        focused(disabledFocusable ? 'trigger' : 'three');
      });
    }
    it('R3 documented tooltip gives Highlight a description on real hover and keyboard focus', () => {
      render(<WithTooltip />);
      cy.get('[aria-label="Highlight"]').realHover();
      cy.get('[role="tooltip"]')
        .filter(':visible')
        .should('have.length', 1)
        .and('have.text', 'Highlights the selected text');
      audit('visible-tooltip');
      cy.get('[aria-label="Highlight"]').should($button =>
        expect(computeAccessibleDescription($button[0])).to.equal('Highlights the selected text'),
      );
      name('[aria-label="Highlight"]', 'Highlight');
      cy.get('body').realHover({ position: 'topLeft' });
      cy.contains('[role="tooltip"]', 'Highlights the selected text').should('not.be.visible');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('[aria-label="Bold"]').should('have.focus');
      cy.realPress('ArrowRight');
      cy.get('[aria-label="Italic"]').should('have.focus');
      cy.realPress('ArrowRight');
      cy.get('[aria-label="Underline"]').should('have.focus');
      cy.realPress('ArrowRight');
      cy.get('[aria-label="Highlight"]').should('have.focus');
      cy.contains('[role="tooltip"]', 'Highlights the selected text').should('be.visible');
    });
    it('R3 documented popover traps keyboard focus and restores ToolbarButton after closing', () => {
      render(<WithPopover />);
      cy.get('[aria-label="Insert image"]').realClick();
      cy.contains('.fui-PopoverSurface h3', 'Insert Image').should('be.visible');
      cy.contains('.fui-PopoverSurface button', 'Close').should('have.focus');
      audit('open-image-popover');
      cy.realPress('Tab');
      cy.contains('.fui-PopoverSurface button', 'Close').should('have.focus');
      cy.realPress('Enter');
      cy.get('.fui-PopoverSurface').should('not.exist');
      cy.get('[aria-label="Insert image"]').should('have.focus');
      cy.realPress('ArrowRight');
      cy.get('[aria-label="Insert Table"]').should('have.focus');
      cy.realPress('Space');
      cy.contains('.fui-PopoverSurface h3', 'Insert Table').should('be.visible');
      audit('open-table-popover');
      cy.realPress('Escape');
      cy.get('.fui-PopoverSurface').should('not.exist');
      cy.get('[aria-label="Insert Table"]').should('have.focus');
    });
    it('R3 documented overflow responds to real resize control and matches hidden command menu exactly', () => {
      const Fixture = () => {
        const [narrow, setNarrow] = React.useState(false);
        return (
          <>
            <button id="resize" onClick={() => setNarrow(value => !value)}>
              Resize
            </button>
            <div id="overflow-host" style={{ width: narrow ? 180 : 800 }}>
              <OverflowItems />
            </div>
          </>
        );
      };
      render(<Fixture />);
      cy.get('[aria-label="More items"]').should('not.exist');
      cy.get('[role="toolbar"] button').filter(':visible').should('have.length', 10);
      cy.get('#resize').realClick();
      cy.get('[aria-label="More items"]').should('be.visible');
      cy.get('[role="toolbar"] button[aria-label*="Font Size"]')
        .filter(':visible')
        .then($visible => {
          const hiddenCount = 10 - $visible.length;
          expect(hiddenCount).to.be.greaterThan(0);
          cy.get('[aria-label="More items"]').realClick();
          cy.get('[role="menuitem"]').should('have.length', hiddenCount);
          audit('open-overflow-menu');
        });
      cy.realPress('Escape');
      cy.get('[aria-label="More items"]').should('have.focus');
      cy.get('#resize').realClick();
      cy.get('[aria-label="More items"]').should('not.exist');
      cy.get('[role="toolbar"] button').filter(':visible').should('have.length', 10).first().focus();
      cy.realPress('ArrowRight');
      cy.get('[role="toolbar"] button').filter(':visible').eq(1).should('have.focus');
    });
    it('R3 unmodified menu ArrowDown is toolbar navigation, not an opening shortcut', () => {
      render(
        <Toolbar aria-label="Arrow conflict">
          <ToolbarButton id="one">One</ToolbarButton>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <ToolbarButton data-testid="trigger">Actions</ToolbarButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem>New</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <ToolbarButton id="three">Three</ToolbarButton>
        </Toolbar>,
      );
      cy.get('[data-testid="trigger"]').focus();
      cy.realPress('ArrowDown');
      focused('three');
      cy.get('[role="menu"]').should('not.exist');
      cy.realPress('ArrowUp');
      cy.get('[data-testid="trigger"]').should('have.focus');
      cy.realPress('Enter');
      cy.contains('[role="menuitem"]', 'New').should('have.focus');
      audit('open-generated-menu');
      cy.realPress('Escape');
      cy.get('[data-testid="trigger"]').should('have.focus');
    });
    for (const appearance of ['primary', 'subtle', 'transparent'] as const) {
      it(`R3 ${appearance} real pointer press paints exact pressed color and activates only on release`, () => {
        const clicked = cy.spy().as('clicked');
        fixture({ appearance, onClick: clicked });
        const hex =
          appearance === 'primary'
            ? webLightTheme.colorBrandBackgroundPressed
            : appearance === 'subtle'
            ? webLightTheme.colorSubtleBackgroundPressed
            : undefined;
        const pressed = hex
          ? `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`
          : 'rgba(0, 0, 0, 0)';
        cy.get('#first').realMouseDown();
        cy.get('#first').should('have.css', 'background-color', pressed);
        cy.get('@clicked').should('not.have.been.called');
        cy.get('#first').realMouseUp();
        cy.get('@clicked').should('have.been.calledOnce');
        focused('first');
      });
    }
    it('R3 root slot render function preserves native behavior, ref and styling with custom content', () => {
      const ref = React.createRef<HTMLButtonElement>();
      const clicked = cy.spy().as('clicked');
      const renderRoot: SlotRenderFunction<React.ComponentProps<'button'>> = (Root, props) => (
        <Root {...props} data-rendered="root">
          <span>Custom command</span>
        </Root>
      );
      render(
        <ToolbarButton id="action" ref={ref} onClick={clicked}>
          {renderRoot}
        </ToolbarButton>,
      );
      cy.get('#action')
        .should('have.attr', 'type', 'button')
        .and('have.attr', 'data-rendered', 'root')
        .and('have.class', 'fui-Button')
        .and('have.text', 'Custom command');
      name('#action', 'Custom command');
      cy.then(() => expect(ref.current).to.equal(Cypress.$('#action')[0]));
      cy.get('#action span').realClick();
      cy.realPress('Space');
      cy.get('@clicked').should('have.been.calledTwice');
    });
    it('R3 aria-labelledby overrides children and description survives intrinsic props', () => {
      render(
        <>
          <span id="action-label">Accessible command</span>
          <span id="action-description">Does useful work</span>
          <ToolbarButton id="action" aria-labelledby="action-label" aria-describedby="action-description">
            Visible command
          </ToolbarButton>
        </>,
      );
      name('#action', 'Accessible command');
      cy.get('#action').should($button =>
        expect(computeAccessibleDescription($button[0])).to.equal('Does useful work'),
      );
      cy.get('#action').realClick();
      focused('action');
    });
  });
}
