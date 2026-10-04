import type * as axe from 'axe-core';
import { computeAccessibleName } from 'dom-accessibility-api';

export const nodeMetadata = (
  element: Element,
): {
  tag: string;
  role: string | null;
  name: string;
  tabIndex: number;
  tabIndexAttribute: string | null;
} => ({
  tag: element.tagName,
  role:
    element.getAttribute('role') ||
    (element.tagName === 'BUTTON' ? 'button' : element.getAttribute('type') === 'checkbox' ? 'checkbox' : null),
  name: computeAccessibleName(element),
  tabIndex: (element as HTMLElement).tabIndex,
  tabIndexAttribute: element.getAttribute('tabindex'),
});
const checkboxChecks = [
  ['implicit-label', null, 'Element does not have an implicit (wrapped) <label>'],
  ['explicit-label', null, 'Element does not have an explicit <label>'],
  ['aria-label', null, 'aria-label attribute does not exist or is empty'],
  [
    'aria-labelledby',
    null,
    'aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty',
  ],
  ['non-empty-title', { messageKey: 'noAttr' }, 'Element has no title attribute'],
  ['non-empty-placeholder', { messageKey: 'noAttr' }, 'Element has no placeholder attribute'],
  [
    'presentational-role',
    null,
    'Element\'s default semantics were not overridden with role="none" or role="presentation"',
  ],
] as const;

export const assertBaselineNode = (
  node: axe.NodeResult,
  element: Element,
  kind: 'sentinel' | 'unnamed-checkbox' | 'forced-colors',
): void => {
  const document = element.ownerDocument;
  const actual = {
    metadata: nodeMetadata(element),
    impact: node.impact,
    failureSummary: node.failureSummary,
    htmlMatchesNode: node.html === element.outerHTML,
    anyChecks: node.any.map(check => ({
      ...check,
      relatedNodes: check.relatedNodes?.map(related => ({
        targetLength: related.target.length,
        sameNode: document.querySelector(String(related.target[0])) === element,
        htmlMatchesNode: related.html === element.outerHTML,
      })),
    })),
    all: node.all.map(check => ({
      ...check,
      relatedNodes: check.relatedNodes?.map(related => ({
        targetLength: related.target.length,
        sameNode: document.querySelector(String(related.target[0])) === element,
        htmlMatchesNode: related.html === element.outerHTML,
      })),
    })),
    none: node.none,
  };
  const relatedNodes = [{ targetLength: 1, sameNode: true, htmlMatchesNode: true }];
  const expected = {
    metadata:
      kind === 'sentinel'
        ? { tag: 'I', role: 'none', name: '', tabIndex: 0, tabIndexAttribute: '0' }
        : kind === 'unnamed-checkbox'
        ? { tag: 'INPUT', role: 'checkbox', name: '', tabIndex: 0, tabIndexAttribute: null }
        : { tag: 'BUTTON', role: 'button', name: 'More', tabIndex: 0, tabIndexAttribute: null },
    impact: kind === 'unnamed-checkbox' ? 'critical' : 'serious',
    failureSummary:
      kind === 'sentinel'
        ? 'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM'
        : kind === 'forced-colors'
        ? 'Fix any of the following:\n  Element has a 1:1 contrast ratio with the background'
        : `Fix any of the following:\n  ${checkboxChecks.map(([, , message]) => message).join('\n  ')}`,
    htmlMatchesNode: true,
    anyChecks:
      kind === 'unnamed-checkbox'
        ? checkboxChecks.map(([id, data, message]) => ({ id, data, relatedNodes: [], impact: 'critical', message }))
        : kind === 'forced-colors'
        ? [
            {
              id: 'color-contrast',
              data: {
                fgColor: '#ffffff',
                bgColor: '#ffffff',
                contrastRatio: 1,
                fontSize: '10.5pt (14px)',
                fontWeight: 'normal',
                messageKey: 'equalRatio',
                expectedContrastRatio: '4.5:1',
                shadowColor: undefined,
              },
              relatedNodes,
              impact: 'serious',
              message: 'Element has a 1:1 contrast ratio with the background',
            },
          ]
        : [],
    all:
      kind === 'sentinel'
        ? [
            {
              id: 'focusable-not-tabbable',
              data: null,
              relatedNodes,
              impact: 'serious',
              message: 'Focusable content should have tabindex="-1" or be removed from the DOM',
            },
          ]
        : [],
    none: [],
  };
  expect(actual, `exact ${kind} axe node/check profile`).to.deep.equal(expected);
  // Exercise the same matcher against mutations, not a second weaker classifier.
  const matches = (candidate: unknown) => Cypress._.isEqual(candidate, expected);
  expect(matches(actual)).to.equal(true);
  for (const candidate of [
    { ...actual, metadata: { ...actual.metadata, role: actual.metadata.role === 'button' ? 'group' : 'button' } },
    { ...actual, metadata: { ...actual.metadata, name: 'Unexpected name' } },
    { ...actual, metadata: { ...actual.metadata, tabIndex: -1 } },
    { ...actual, impact: 'minor' },
    { ...actual, failureSummary: 'Unexpected failure' },
    { ...actual, htmlMatchesNode: false },
    { ...actual, none: [{ id: 'unexpected' }] },
  ]) {
    expect(matches(candidate), 'reject changed node metadata or added check').to.equal(false);
  }
  for (const key of ['anyChecks', 'all'] as const) {
    for (const [index, check] of actual[key].entries()) {
      for (const mutation of [
        { ...check, id: 'unexpected' },
        { ...check, data: { unexpected: true } },
        { ...check, impact: 'minor' },
        { ...check, message: 'Unexpected message' },
        { ...check, relatedNodes: [{ targetLength: 2, sameNode: false, htmlMatchesNode: false }] },
      ]) {
        const checks: unknown[] = [...actual[key]];
        checks[index] = mutation;
        expect(matches({ ...actual, [key]: checks }), `reject changed ${key} check ${index}`).to.equal(false);
      }
    }
  }
};

export const assertBaselineEnvelope = (profile: {
  classification: string;
  scenario: string;
  phase: string;
  scope: string;
  violationRules: string[];
  violationNodeCounts: number[];
  incompleteRules: string[];
  incompleteNodeCounts: number[];
}): void => {
  const matches = (candidate: typeof profile) => {
    const { classification, scenario, phase, scope } = candidate;
    if (scope !== '#fixture') {
      return false;
    }
    let expectedPhase: string;
    let violationRules: string[];
    let violationNodeCounts: number[];
    let incompleteRules: string[] = [];
    let incompleteNodeCounts: number[] = [];
    if (classification === 'groupper') {
      const match = scenario.match(
        /^R3\.05 (ltr|rtl) (no-tab|tab-exit|tab-only) honors real Tab, Enter, Escape and footer action tab order$/,
      );
      if (
        !match &&
        scenario !== 'R3.06 current source defaults interactive Card to no-tab, while footer actions remain reachable'
      ) {
        return false;
      }
      expectedPhase = match ? `${match[1]} ${match[2]} keyboard` : 'implicit interactive focus mode';
      violationRules = ['aria-hidden-focus'];
      violationNodeCounts = [2];
    } else if (classification === 'focus-story') {
      if (scenario !== 'R3.03 stable FocusMode story retains four real footers with named Open and Share actions') {
        return false;
      }
      expectedPhase = 'stable FocusMode';
      violationRules = ['aria-hidden-focus'];
      violationNodeCounts = [6];
    } else if (classification === 'disabled-story') {
      if (scenario !== 'R3.04 stable Disabled story explicitly disables the five disabled-card footer pairs') {
        return false;
      }
      expectedPhase = 'stable Disabled';
      violationRules = ['aria-hidden-focus', 'label'];
      violationNodeCounts = [2, 2];
    } else if (classification === 'forced-colors') {
      const match = scenario.match(
        /^R3\.15 (ltr|rtl) (selected|hovered) Card in real forced-colors media records action currentColor and browser contrast baseline$/,
      );
      if (!match) {
        return false;
      }
      expectedPhase = `${match[1]} ${match[2]} forced colors`;
      violationRules = [];
      violationNodeCounts = [];
      incompleteRules = ['color-contrast'];
      incompleteNodeCounts = [1];
    } else {
      return false;
    }
    return (
      phase === expectedPhase &&
      Cypress._.isEqual(candidate.violationRules, violationRules) &&
      Cypress._.isEqual(candidate.violationNodeCounts, violationNodeCounts) &&
      Cypress._.isEqual(candidate.incompleteRules, incompleteRules) &&
      Cypress._.isEqual(candidate.incompleteNodeCounts, incompleteNodeCounts)
    );
  };
  expect(matches(profile), 'exact known-manual envelope').to.equal(true);
  for (const candidate of [
    { ...profile, scenario: 'R5 unexpected scenario' },
    { ...profile, phase: 'unexpected phase' },
    { ...profile, scope: '#footer' },
    { ...profile, classification: 'clean' },
    { ...profile, violationRules: ['unexpected'] },
    { ...profile, violationNodeCounts: [999] },
    { ...profile, incompleteRules: ['unexpected'] },
    { ...profile, incompleteNodeCounts: [999] },
  ]) {
    expect(matches(candidate), 'reject changed classification/scenario/phase/scope/rules/counts').to.equal(false);
  }
};
