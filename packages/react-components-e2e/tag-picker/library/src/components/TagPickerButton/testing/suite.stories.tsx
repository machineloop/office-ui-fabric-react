import * as React from 'react';
import * as axe from 'axe-core';
import type { SlotRenderFunction } from '@fluentui/react-components';
import type { TagPickerButtonProps } from '../../../index';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider, webLightTheme, webDarkTheme, Field, IdPrefixProvider } from '@fluentui/react-components';
// eslint-disable-next-line @fluentui/no-restricted-imports -- This internal provider is not exported by react-components.
import { CustomStyleHooksProvider_unstable } from '@fluentui/react-shared-contexts';
import { TagPickerButton } from '../../../index';
import { Button as StableStory } from '../../../../../stories/src/TagPicker/TagPickerButton.stories';
import { Harness, ContextButton, FormFixture, fruits } from './fixtures.stories';
import type { HarnessProps, RecordedEvent } from './fixtures.stories';

const rawRound: unknown = Cypress.env('coverageRound') ?? 3;
if ((typeof rawRound !== 'number' && typeof rawRound !== 'string') || ![1, 2, 3, '1', '2', '3'].includes(rawRound)) {
  throw new Error('coverageRound must be exactly 1, 2, or 3');
}
const round = Number(rawRound);
const evidence = `src/components/TagPickerButton/.evidence/audits-${Date.now()}-${Cypress._.random(100000, 999999)}`;
const titles: string[] = [];
const profiles: Record<string, number> = {};
let ordinal = 0;
let events: RecordedEvent[] = [];
let realEvents: Array<{ command: string; args: unknown }> = [];
let restoreListeners: (() => void) | undefined;
function stage(children: React.ReactNode, dark = false, rtl = false) {
  return mount(
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={rtl ? 'rtl' : 'ltr'}>
      <main id="row136-stage" style={{ padding: 24, minHeight: 400, width: 600 }}>
        {children}
      </main>
    </FluentProvider>,
    { strict: false },
  );
}
function harness(props: HarnessProps = {}, dark = false, rtl = false) {
  return stage(<Harness {...props} onRecord={event => events.push(event)} />, dark, rtl);
}
const trigger = () => cy.get('#row136-stage [data-trigger]');
const popup = () => cy.get('[data-popup]');
const option = (value: string) => popup().find(`[data-option="${value}"]`);
function assertIdReference(value: string | undefined, attribute: string): asserts value is string {
  expect(value, `required ${attribute} IDREF`).to.be.a('string').and.not.equal('');
}
function active(value: string) {
  trigger().should($button => {
    const id = $button.attr('aria-activedescendant');
    expect(id, 'nonempty active descendant').to.be.a('string').and.not.equal('');
    expect($button[0].ownerDocument.getElementById(id!)?.getAttribute('data-option')).to.equal(value);
    expect($button[0].ownerDocument.activeElement).to.equal($button[0]);
  });
}
function selected(values: string[]) {
  cy.get('[data-selected]').should('have.text', JSON.stringify(values));
}
function press(key: Parameters<Cypress.Chainable['realPress']>[0]) {
  return cy.realPress(key);
}
function open() {
  trigger().realClick();
  trigger().should('have.attr', 'aria-expanded', 'true');
  popup().should('be.visible');
}
const emptyListTitle = 'empty list opens and navigation cannot create a selection or descendant';
function moverShape(tags: number) {
  return [
    {
      id: 'aria-hidden-focus',
      nodes: [1, tags + 2].map(index => ({
        target: [`i:nth-child(${index})`],
        anyChecks: [],
        none: [],
        all: [{ id: 'focusable-not-tabbable', data: null, impact: 'serious' }],
      })),
    },
  ];
}
function findingShape(results: axe.Result[]) {
  return results.map(rule => ({
    id: rule.id,
    nodes: rule.nodes.map(node => ({
      target: node.target,
      anyChecks: node.any.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
      none: node.none.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
      all: node.all.map(check => ({ id: check.id, data: check.data, impact: check.impact })),
    })),
  }));
}
function assertMoverShape(shape: ReturnType<typeof findingShape>, tags: number) {
  expect(shape, 'exact independent known mover profile').to.deep.equal(moverShape(tags));
}

describe('row136 TagPickerButton', { retries: 0 }, () => {
  let finalAuditStarted = false;
  function scenario(level: number, title: string, body: () => void, moverTags = 0) {
    if (level <= round) {
      titles.push(title);
      profiles[title] = moverTags;
      it(title, () => {
        body();
        cy.then(() => {
          restoreListeners?.();
          restoreListeners = undefined;
        });
        audit(title);
      });
    }
  }
  before(() => {
    expect(React.version).to.equal('19.2.0');
    expect(new Set(titles).size).to.equal(titles.length);
    cy.writeFile(`${evidence}/manifest.json`, { round, titles, profiles, retries: 0 });
  });
  beforeEach(() => {
    finalAuditStarted = false;
    events = [];
    realEvents = [];
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
    cy.on('command:end', command => {
      const name: unknown = command.get('name');
      if (typeof name === 'string' && ['realClick', 'realPress', 'realHover'].includes(name)) {
        realEvents.push({ command: name, args: command.get('args') });
      }
    });
    cy.on('fail', error => {
      restoreListeners?.();
      restoreListeners = undefined;
      throw error;
    });
  });
  function audit(title: string, failedCaseDiagnostic = false) {
    const subject = cy.get('#row136-stage');
    if (!failedCaseDiagnostic) {
      subject
        .should('be.visible')
        .and('not.be.empty')
        .should($stage => {
          const tags = profiles[title!];
          if (tags) {
            const groups = Array.from($stage[0].querySelectorAll<HTMLElement>('.fui-TagPickerGroup')).filter(group =>
              group.querySelector('.fui-Tag'),
            );
            expect(groups, 'one independently expected selected-tag mover').to.have.length(1);
            const group = groups[0];
            expect(group.children, 'selected tags and both mover sentinels are committed').to.have.length(tags + 2);
            expect(group.querySelectorAll('.fui-Tag')).to.have.length(tags);
            expect(group.firstElementChild?.getAttribute('data-tabster-dummy')).to.equal(
              'isFirst=true, isOutside=false, (Mover, tabbable=true)',
            );
            expect(group.lastElementChild?.getAttribute('data-tabster-dummy')).to.equal(
              'isFirst=false, isOutside=false, (Mover, tabbable=true)',
            );
          }
        });
    }
    return subject.then($stage => {
      const document = $stage[0].ownerDocument;
      const context = [
        $stage[0],
        ...Array.from(document.querySelectorAll<HTMLElement>('.fui-TagPickerList')).filter(
          node => !$stage[0].contains(node),
        ),
      ];
      finalAuditStarted = true;
      return axe.run(context).then(fullResults => {
        cy.writeFile(`${evidence}/audit-${++ordinal}.json`, {
          kind: 'axe',
          scenario: title,
          round,
          retries: Cypress.currentRetry,
          fullResults,
          realEvents,
          events,
          knownMoverTags: profiles[title!],
          knownEmptyList: title === emptyListTitle,
          failedCaseDiagnostic,
          auditedRoots: context.map(node => ({
            tag: node.tagName,
            id: node.id,
            role: node.getAttribute('role'),
            popup: node.classList.contains('fui-TagPickerList'),
          })),
        }).then(() => {
          if (failedCaseDiagnostic) {
            return;
          }
          expect(fullResults.passes.length, 'default axe executed rules').to.be.greaterThan(0);
          const tags = profiles[title!];
          if (tags) {
            expect(
              fullResults.violations.map(rule => rule.id),
              'exact source-known Tabster finding',
            ).to.deep.equal(['aria-hidden-focus']);
            const nodes = fullResults.violations[0].nodes;
            assertMoverShape(findingShape(fullResults.violations), tags);
            expect(nodes).to.have.length(2);
            expect(nodes.map(node => node.target)).to.deep.equal([['i:nth-child(1)'], [`i:nth-child(${tags + 2})`]]);
            for (const node of nodes) {
              expect(node.any).to.deep.equal([]);
              expect(node.none).to.deep.equal([]);
              expect(node.all).to.have.length(1);
              expect(node.all[0]).to.include({ id: 'focusable-not-tabbable', data: null, impact: 'serious' });
              const related = node.all[0].relatedNodes;
              if (!related) {
                throw new Error('Known mover finding must identify its related node');
              }
              expect(related).to.have.length(1);
              expect(related[0].target).to.deep.equal(node.target);
              expect(related[0].html).to.equal(node.html);
              const target = document.querySelector<HTMLElement>(String(node.target[0]));
              expect(target?.getAttribute('data-tabster-dummy')).to.match(
                /^isFirst=(true|false), isOutside=false, \(Mover, tabbable=true\)$/,
              );
              expect(target?.getAttribute('aria-hidden')).to.equal('true');
              expect(target?.getAttribute('tabindex')).to.equal('0');
              expect(target?.parentElement?.getAttribute('aria-label')).to.equal(
                title === 'stable consuming Button story runs unchanged and adds selected employee tags'
                  ? 'Selected Employees'
                  : 'Selected fruit',
              );
            }
          } else {
            expect(fullResults.violations, 'unexpected default axe violations').to.deep.equal([]);
          }
          if (title === emptyListTitle) {
            expect(findingShape(fullResults.incomplete)).to.deep.equal([
              {
                id: 'aria-required-children',
                nodes: [
                  {
                    target: [`#${document.querySelector<HTMLElement>('[data-popup]')!.id}`],
                    anyChecks: [{ id: 'aria-required-children', data: ['group', 'option'], impact: 'critical' }],
                    none: [],
                    all: [],
                  },
                ],
              },
            ]);
            expect(document.querySelector('[data-popup]')?.childElementCount).to.equal(0);
          } else {
            expect(fullResults.incomplete, 'unexpected default axe incompletes').to.deep.equal([]);
          }
          expect(Cypress.currentRetry).to.equal(0);
        });
      });
    });
  }
  afterEach(function () {
    const test = this.currentTest;
    cy.then(() => {
      restoreListeners?.();
      restoreListeners = undefined;
    });
    cy.then(() => {
      if (test?.state === 'failed' && !finalAuditStarted) {
        return audit(test.title, true);
      }
    });
  });

  scenario(1, 'standalone is a named native button with closed combobox semantics', () => {
    stage(<TagPickerButton aria-label="Standalone">Content</TagPickerButton>);
    cy.get('.fui-TagPickerButton').should($button => {
      expect($button[0].tagName).to.equal('BUTTON');
      expect($button.attr('type')).to.equal('button');
      expect($button.attr('role')).to.equal('combobox');
      expect($button.attr('aria-expanded')).to.equal('false');
      expect($button.attr('aria-controls')).to.equal(undefined);
      expect($button.attr('aria-haspopup')).to.equal(undefined);
      expect($button.text()).to.equal('Content');
      expect(computeAccessibleName($button[0])).to.equal('Standalone');
    });
  });
  scenario(1, 'standalone click and native keys cannot invent picker state', () => {
    stage(<TagPickerButton aria-label="Standalone">Content</TagPickerButton>);
    cy.get('.fui-TagPickerButton').realClick();
    press('ArrowDown');
    press('Enter');
    press('Space');
    cy.get('.fui-TagPickerButton').should('have.attr', 'aria-expanded', 'false');
  });
  scenario(1, 'native pointer toggles the actual portaled list and ARIA ownership', () => {
    harness();
    open();
    trigger().then($button => {
      const id = $button.attr('aria-controls');
      expect(id).to.be.a('string').and.not.equal('');
      expect($button[0].ownerDocument.getElementById(id!)?.getAttribute('role')).to.equal('listbox');
      cy.get('[data-control]').should('have.attr', 'aria-owns', id);
      expect($button[0].closest('main')?.contains($button[0].ownerDocument.getElementById(id!))).to.equal(false);
    });
    trigger().realClick().should('have.attr', 'aria-expanded', 'false').and('not.have.attr', 'aria-controls');
    popup().should('not.be.visible');
    cy.then(() => {
      expect(events.filter(e => e.kind === 'open').map(e => [e.open, e.type, e.trusted, e.identity])).to.deep.equal([
        [true, 'click', true, true],
        [false, 'click', true, true],
      ]);
    });
  });
  for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Space'] as const) {
    scenario(1, `native ${key} opens closed picker without a synthetic click`, () => {
      harness();
      trigger().focus();
      press(key);
      active('apple');
      trigger().should('have.attr', 'aria-expanded', 'true');
      cy.then(() => {
        expect(events.filter(e => e.kind === 'open')).to.have.length(1);
        expect(events.find(e => e.kind === 'open')).to.include({
          type: 'keydown',
          trusted: true,
          identity: true,
          open: true,
        });
        expect(events.filter(e => e.kind === 'click')).to.have.length(0);
      });
    });
  }
  scenario(1, 'arrows Home and End navigate real options and clamp boundaries', () => {
    harness();
    open();
    active('apple');
    press('ArrowUp');
    active('apple');
    press('ArrowDown');
    active('apricot');
    press('End');
    active('cherry');
    press('ArrowDown');
    active('cherry');
    press('Home');
    active('apple');
  });
  scenario(1, 'PageDown and PageUp move ten options and clamp to bounds', () => {
    harness({ options: Array.from({ length: 15 }, (_, index) => ({ value: `v${index}`, text: `Fruit ${index}` })) });
    open();
    active('v0');
    press('PageDown');
    active('v10');
    press('PageDown');
    active('v14');
    press('PageUp');
    active('v4');
    press('PageUp');
    active('v0');
  });
  scenario(1, 'Escape closes without selecting and retains native trigger focus', () => {
    harness();
    open();
    press('ArrowDown');
    press('Escape');
    trigger()
      .should('be.focused')
      .and('have.attr', 'aria-expanded', 'false')
      .and('not.have.attr', 'aria-activedescendant');
    selected([]);
    cy.then(() => expect(events.filter(e => e.kind === 'select')).to.have.length(0));
  });
  for (const key of ['Enter', 'Space'] as const) {
    scenario(
      1,
      `source characterization: ${key} selects but keeps multiselect popup open`,
      () => {
        harness();
        open();
        press('ArrowDown');
        press(key);
        selected(['apricot']);
        trigger().should('be.focused').and('have.attr', 'aria-expanded', 'true');
        option('apricot').should('not.have.attr', 'aria-selected');
        cy.then(() =>
          expect(events.filter(e => e.kind === 'select')).to.deep.equal([
            {
              kind: 'select',
              type: 'keydown',
              key: key === 'Space' ? ' ' : key,
              trusted: true,
              version: 0,
              prevented: true,
              value: 'apricot',
              selectedOptions: ['apricot'],
              identity: true,
            },
          ]),
        );
      },
      1,
    );
  }
  scenario(
    1,
    'native option click selects once closes and restores trigger focus',
    () => {
      harness();
      open();
      option('banana').realClick();
      selected(['banana']);
      trigger().should('have.attr', 'aria-expanded', 'false').and('be.focused');
      cy.then(() => {
        expect(events.filter(e => e.kind === 'select')).to.have.length(1);
        expect(events.find(e => e.kind === 'select')).to.include({
          value: 'banana',
          type: 'click',
          trusted: true,
          identity: true,
        });
        const meaningful = events.filter(e => ['select', 'open'].includes(e.kind));
        expect(meaningful.map(e => e.kind)).to.deep.equal(['open', 'select', 'open']);
      });
    },
    1,
  );
  scenario(1, 'Tab closes without selecting and reaches next control', () => {
    harness();
    open();
    press('Tab');
    cy.get('[data-after]').should('be.focused');
    trigger().should('have.attr', 'aria-expanded', 'false');
    selected([]);
    cy.then(() => expect(events.filter(e => e.kind === 'select')).to.have.length(0));
  });
  scenario(1, 'Shift Tab reaches previous control from an empty picker', () => {
    harness();
    open();
    press(['Shift', 'Tab']);
    cy.get('[data-before]').should('be.focused');
    trigger().should('have.attr', 'aria-expanded', 'false');
  });
  scenario(1, 'outside native pointer closes without stealing outside focus', () => {
    harness();
    open();
    cy.get('[data-after]').realClick().should('be.focused');
    trigger().should('have.attr', 'aria-expanded', 'false');
    popup().should('not.exist');
  });
  scenario(1, 'defaultOpen mounts an inline list with exact active descendant ownership', () => {
    harness({ picker: { defaultOpen: true, inline: true } });
    trigger().focus();
    active('apple');
    popup().then($popup => expect($popup[0].closest('#row136-stage')).not.to.equal(null));
  });
  scenario(1, 'controlled open refusal emits a request without changing state', () => {
    harness({ picker: { open: false } });
    trigger().realClick();
    trigger().should('have.attr', 'aria-expanded', 'false');
    cy.then(() => expect(events.filter(e => e.kind === 'open').map(e => e.open)).to.deep.equal([true]));
  });
  scenario(1, 'controlled open true refuses Escape until the external controller closes', () => {
    harness({ picker: { open: true } });
    trigger().focus();
    press('Escape');
    trigger().should('have.attr', 'aria-expanded', 'true');
    cy.get('[data-close]').realClick();
    trigger().should('have.attr', 'aria-expanded', 'false');
  });
  scenario(
    1,
    'uncontrolled selection accumulates in stable option order',
    () => {
      harness({ selection: 'uncontrolled' });
      open();
      press('Space');
      press('ArrowDown');
      press('Space');
      selected(['apple', 'apricot']);
    },
    2,
  );
  scenario(1, 'controlled selection refusal preserves state and emits exact requested value', () => {
    harness({ selection: 'refuse' });
    open();
    press('Space');
    selected([]);
    option('apple').should('not.have.attr', 'aria-selected');
    cy.then(() =>
      expect(events.filter(e => e.kind === 'select').map(e => e.selectedOptions)).to.deep.equal([['apple']]),
    );
  });
  scenario(
    1,
    'reselecting an existing option reports unchanged selection rather than toggling it off',
    () => {
      harness({ picker: { defaultSelectedOptions: ['apple'] } });
      trigger().focus();
      press('ArrowDown');
      press('Space');
      selected(['apple']);
      cy.then(() =>
        expect(events.filter(e => e.kind === 'select').map(e => e.selectedOptions)).to.deep.equal([['apple']]),
      );
    },
    1,
  );
  scenario(1, 'disabled native button suppresses pointer activation and keyboard focus', () => {
    harness({ button: { disabled: true } });
    trigger().realClick();
    trigger().should('be.disabled').and('have.attr', 'aria-expanded', 'false');
    cy.get('[data-before]').realClick();
    press('Tab');
    cy.get('[data-after]').should('be.focused');
    cy.then(() => expect(events).to.deep.equal([]));
  });
  scenario(1, 'source characterization: picker disabled does not disable its button but rejects opening', () => {
    harness({ picker: { disabled: true } });
    trigger().realClick().should('not.be.disabled').and('be.focused');
    press('ArrowDown');
    trigger().should('have.attr', 'aria-expanded', 'false');
    cy.then(() => expect(events.filter(e => e.kind === 'open')).to.have.length(0));
  });
  scenario(1, 'source characterization: aria-disabled alone does not suppress trigger opening', () => {
    harness({ button: { 'aria-disabled': true } });
    open();
    trigger().should('have.attr', 'aria-disabled', 'true').and('not.be.disabled');
  });
  scenario(1, 'type-ahead opening matches mounted options using their real text', () => {
    harness();
    trigger().focus();
    press('b');
    active('banana');
    selected([]);
    option('banana').should('not.have.attr', 'aria-selected');
  });
  scenario(1, 'type-ahead accumulates characters and repeated letters cycle matches', () => {
    harness();
    trigger().focus();
    press('a');
    active('apple');
    press('a');
    active('apricot');
  });
  scenario(1, 'default expand icon native pointer opens and focuses the button', () => {
    harness();
    cy.get('[data-control] .fui-TagPickerControl__expandIcon').realClick();
    trigger().should('be.focused').and('have.attr', 'aria-expanded', 'true');
  });
  scenario(
    1,
    'stable consuming Button story runs unchanged and adds selected employee tags',
    () => {
      stage(<StableStory />);
      cy.get('#row136-stage .fui-TagPickerButton').realClick();
      cy.get('[role="option"]').contains('John Doe').realClick();
      cy.get('#row136-stage [role="listbox"]').should('contain.text', 'John Doe');
      cy.get('#row136-stage .fui-TagPickerButton').should('have.attr', 'aria-expanded', 'false');
    },
    1,
  );

  scenario(2, 'context value supplies default content while explicit children take precedence', () => {
    stage(<ContextButton context={{ value: 'Context text' }} props={{ children: <strong>Consumer text</strong> }} />);
    cy.get('.fui-TagPickerButton').should('have.text', 'Consumer text').find('strong').should('have.length', 1);
  });
  scenario(2, 'context value is rendered when no children are supplied', () => {
    stage(<ContextButton context={{ value: 'Context text' }} />);
    cy.get('.fui-TagPickerButton').should('have.text', 'Context text');
  });
  scenario(2, 'empty context value and explicit null children keep the native button empty', () => {
    stage(<ContextButton context={{ value: '' }} props={{ children: null }} />);
    cy.get('.fui-TagPickerButton').should('be.empty').and('have.attr', 'aria-label', 'Context button');
  });
  for (const [size, font, padding] of [
    ['medium', '12px', '3px'],
    ['large', '14px', '5px'],
    ['extra-large', '16px', '7px'],
  ] as const) {
    scenario(2, `context ${size} wins over conflicting button size and yields actual computed typography`, () => {
      stage(
        <ContextButton
          context={{ size }}
          props={{ size: size === 'medium' ? 'large' : 'medium', children: 'Sized' }}
        />,
      );
      cy.get('.fui-TagPickerButton').should('have.css', 'font-size', font).and('have.css', 'padding-top', padding);
    });
  }
  scenario(2, 'source characterization: button appearance is ignored rather than styling a border', () => {
    stage(
      <ContextButton
        context={{ appearance: 'underline' }}
        props={{ appearance: 'filled-darker', children: 'Appearance' }}
      />,
    );
    cy.get('.fui-TagPickerButton')
      .should('have.css', 'border-top-style', 'none')
      .and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
  });
  scenario(2, 'selected context visually clips the button but keeps its accessible name and focusability', () => {
    stage(<ContextButton context={{ selectedOptions: ['apple'] }} props={{ children: 'Selected' }} />);
    cy.get('.fui-TagPickerButton')
      .should('have.css', 'position', 'absolute')
      .and('have.css', 'width', '1px')
      .and('have.css', 'clip', 'rect(0px, 0px, 0px, 0px)')
      .focus()
      .should('be.focused')
      .then($button => expect(computeAccessibleName($button[0])).to.equal('Context button'));
  });
  scenario(2, 'external clear selection restores the visible button dimensions without remount', () => {
    harness();
    open();
    press('Space');
    selected(['apple']);
    trigger().should('have.css', 'position', 'absolute');
    cy.get('[data-reset]').realClick();
    selected([]);
    trigger().should('have.css', 'position', 'static').and('have.css', 'clip', 'auto');
  });
  for (const base of [false, true]) {
    scenario(
      2,
      `public ${base ? 'base' : 'full styled'} hook and render composition produces real native button behavior`,
      () => {
        const calls: Array<{ open: boolean; trusted: boolean }> = [];
        stage(
          <ContextButton
            hook
            base={base}
            context={{
              size: 'large',
              setOpen: (event, requested) => calls.push({ open: requested, trusted: event.nativeEvent.isTrusted }),
            }}
            props={{ children: 'Composed' }}
          />,
        );
        cy.get('[aria-label="Context button"]').should('have.prop', 'tagName', 'BUTTON');
        cy.get('[aria-label="Context button"]').realClick();
        press('ArrowDown');
        cy.then(() =>
          expect(calls).to.deep.equal([
            { open: true, trusted: true },
            { open: true, trusted: true },
          ]),
        );
        cy.get('[aria-label="Context button"]').should(base ? 'not.have.class' : 'have.class', 'fui-TagPickerButton');
      },
    );
  }
  scenario(2, 'forwarded object ref resolves the exact rendered native button', () => {
    const ref = React.createRef<HTMLButtonElement>();
    harness({ buttonRef: ref });
    trigger().then($button => expect(ref.current).to.equal($button[0]));
  });
  scenario(2, 'callback ref is cleared on unmount and replaced with a new element on remount', () => {
    const refs: Array<HTMLButtonElement | null> = [];
    harness({
      buttonRef: element => {
        refs.push(element);
      },
    });
    trigger().then($button => {
      const original = $button[0];
      cy.get('[data-unmount]').realClick();
      cy.then(() => expect(refs[refs.length - 1]).to.equal(null));
      cy.get('[data-remount]').realClick();
      trigger().then($new => {
        expect($new[0]).not.to.equal(original);
        expect(refs[refs.length - 1]).to.equal($new[0]);
        expect(original.isConnected).to.equal(false);
      });
    });
  });
  scenario(
    2,
    'latest open and option callbacks run after a real rerender without stale closures',
    () => {
      harness();
      cy.get('[data-version]').realClick();
      open();
      press('Space');
      selected(['apple']);
      cy.then(() =>
        expect(events.filter(e => ['open', 'select'].includes(e.kind)).every(e => e.version === 1)).to.equal(true),
      );
    },
    1,
  );
  scenario(
    2,
    'native consumer key handler observes internal selection after default prevention',
    () => {
      const calls: Array<{ key: string; prevented: boolean }> = [];
      harness({
        button: {
          onKeyDown: event => {
            calls.push({ key: event.key, prevented: event.defaultPrevented });
          },
        },
      });
      open();
      press('End');
      press('Space');
      selected(['cherry']);
      cy.then(() =>
        expect(calls).to.deep.equal([
          { key: 'End', prevented: true },
          { key: ' ', prevented: true },
        ]),
      );
    },
    1,
  );
  scenario(
    2,
    'source characterization: consumer preventDefault cannot veto already merged internal click opening',
    () => {
      harness({ button: { onClick: event => event.preventDefault() } });
      open();
      cy.then(() => expect(events.filter(e => e.kind === 'open')).to.have.length(1));
    },
  );
  scenario(
    2,
    'source characterization: consumer preventDefault cannot veto already merged internal key selection',
    () => {
      harness({ button: { onKeyDown: event => event.preventDefault() } });
      open();
      press('Space');
      selected(['apple']);
    },
    1,
  );
  scenario(
    2,
    'filtering selected options updates active descendant to the next registered option',
    () => {
      harness({ filter: true });
      open();
      press('Space');
      selected(['apple']);
      option('apple').should('not.exist');
      active('apricot');
    },
    1,
  );
  scenario(
    2,
    'grouped list preserves option text navigation and native selection',
    () => {
      harness({ grouped: true });
      trigger().focus();
      press('b');
      active('banana');
      press('Space');
      selected(['banana']);
      popup().find('[role="group"]').should('have.length', 1);
    },
    1,
  );
  scenario(2, 'type-ahead timeout starts a fresh search after 500 milliseconds', () => {
    harness();
    trigger().focus();
    press('a');
    active('apple');
    cy.wait(550);
    press('b');
    active('banana');
  });
  scenario(2, 'unmatched type-ahead clears active descendant without selecting', () => {
    harness();
    trigger().focus();
    press('z');
    trigger().should('have.attr', 'aria-expanded', 'true').and('not.have.attr', 'aria-activedescendant');
    selected([]);
  });
  scenario(2, 'modified character shortcuts do not open or select', () => {
    harness();
    trigger().focus();
    press(['Control', 'b']);
    press(['Alt', 'b']);
    trigger().should('have.attr', 'aria-expanded', 'false');
    cy.then(() => expect(events.filter(e => ['open', 'select'].includes(e.kind))).to.deep.equal([]));
  });
  scenario(2, 'explicit label and description ID references name the actual button', () => {
    stage(
      <>
        <span id="fruit-label">Labeled fruit</span>
        <span id="fruit-help">Choose a fruit from this list</span>
        <TagPickerButton id="fruit-button" aria-labelledby="fruit-label" aria-describedby="fruit-help" />
      </>,
    );
    cy.get('#fruit-button').then($button => {
      expect(computeAccessibleName($button[0])).to.equal('Labeled fruit');
      expect(computeAccessibleDescription($button[0])).to.equal('Choose a fruit from this list');
    });
  });
  scenario(2, 'native attributes className and inline style survive slot resolution', () => {
    stage(
      <TagPickerButton
        aria-label="Attributes"
        title="Fruit hint"
        name="fruit"
        value="apple"
        id="custom-button"
        className="consumer-class"
        style={{ letterSpacing: '2px' }}
        data-native="yes"
      />,
    );
    cy.get('#custom-button')
      .should('have.class', 'fui-TagPickerButton')
      .and('have.class', 'consumer-class')
      .and('have.attr', 'title', 'Fruit hint')
      .and('have.attr', 'name', 'fruit')
      .and('have.attr', 'value', 'apple')
      .and('have.attr', 'data-native', 'yes')
      .and('have.css', 'letter-spacing', '2px');
  });
  scenario(2, 'custom provider style hook augments the actual button after built-in styles', () => {
    let calls = 0;
    stage(
      <CustomStyleHooksProvider_unstable
        value={{
          // eslint-disable-next-line @typescript-eslint/naming-convention -- Public style-hook key.
          useTagPickerButtonStyles_unstable: state => {
            calls++;
            if (
              !state ||
              typeof state !== 'object' ||
              !('root' in state) ||
              !state.root ||
              typeof state.root !== 'object'
            ) {
              throw new Error('Expected native button slot state');
            }
            Object.assign(state.root, { style: { outline: '2px solid rgb(128, 0, 128)' } });
          },
        }}
      >
        <TagPickerButton aria-label="Custom styled">Styled</TagPickerButton>
      </CustomStyleHooksProvider_unstable>,
    );
    cy.get('.fui-TagPickerButton').should('have.css', 'outline-color', 'rgb(128, 0, 128)');
    cy.then(() => expect(calls).to.be.greaterThan(0));
  });
  for (const type of [undefined, 'submit', 'reset'] as const) {
    scenario(2, `native form ${type ?? 'default button'} has exact pointer default action`, () => {
      const actions: Array<{ type: string; trusted: boolean; submitter: Element | null }> = [];
      stage(
        <FormFixture
          type={type}
          record={(kind, trusted, submitter) => actions.push({ type: kind, trusted, submitter })}
        />,
      );
      cy.get('#form-input').then($input => {
        ($input[0] as HTMLInputElement).value = 'changed';
      });
      cy.get('[data-form-button]')
        .realClick()
        .then($button => {
          expect(actions).to.deep.equal(
            type ? [{ type, trusted: true, submitter: type === 'submit' ? $button[0] : null }] : [],
          );
        });
      cy.get('#form-input').should('have.value', type === 'reset' ? 'original' : 'changed');
    });
  }
  scenario(2, 'native disabled submit suppresses form default action and consumer handler', () => {
    const actions: string[] = [];
    stage(<FormFixture type="submit" disabled record={kind => actions.push(kind)} />);
    cy.get('[data-form-button]').realClick();
    cy.then(() => expect(actions).to.deep.equal([]));
  });
  scenario(2, 'source characterization: native Enter is consumed by standalone submit trigger', () => {
    const actions: string[] = [];
    stage(<FormFixture type="submit" record={kind => actions.push(kind)} />);
    cy.get('[data-form-button]').focus();
    press('Enter');
    cy.then(() => expect(actions).to.deep.equal([]));
  });

  for (const appearance of ['outline', 'underline', 'filled-lighter', 'filled-darker'] as const) {
    scenario(
      3,
      `picker ${appearance} styles the control while its button retains native dropdown functionality`,
      () => {
        harness({ picker: { appearance }, button: { children: 'Choose' } });
        cy.get('[data-control]').should($control => {
          const style = $control[0].ownerDocument.defaultView!.getComputedStyle($control[0]);
          expect(style.borderTopStyle).to.equal(appearance === 'underline' ? 'none' : 'solid');
          expect(style.borderBottomStyle).to.equal('solid');
          expect(style.backgroundColor).to.equal(
            appearance === 'underline'
              ? 'rgba(0, 0, 0, 0)'
              : appearance === 'filled-darker'
              ? 'rgb(245, 245, 245)'
              : 'rgb(255, 255, 255)',
          );
        });
        open();
        press('Escape');
        trigger().should('be.focused');
      },
    );
  }
  scenario(3, 'native hover changes the outline control border without opening its popup', () => {
    harness();
    cy.get('[data-before]').realHover();
    cy.get('[data-control]').should('have.css', 'border-top-color', 'rgb(209, 209, 209)');
    trigger().realHover();
    cy.get('[data-control]').should('have.css', 'border-top-color', 'rgb(199, 199, 199)');
    trigger().should('have.attr', 'aria-expanded', 'false');
  });
  scenario(3, 'native Tab focus exposes the control focus indicator without opening', () => {
    harness();
    cy.get('[data-before]').realClick();
    press('Tab');
    trigger().should('be.focused');
    cy.get('[data-control]').should($control => {
      const style = $control[0].ownerDocument.defaultView!.getComputedStyle($control[0], '::after');
      expect(style.transform).to.equal('matrix(1, 0, 0, 1, 0, 0)');
      expect(style.borderBottomWidth).to.equal('2px');
    });
    trigger().should('have.attr', 'aria-expanded', 'false');
  });
  scenario(
    3,
    'RTL native keyboard navigation retains correct active descendants and pointer selection',
    () => {
      harness({}, false, true);
      open();
      press('End');
      active('cherry');
      option('banana').realClick();
      selected(['banana']);
      trigger().should('have.css', 'direction', 'rtl');
    },
    1,
  );
  scenario(3, 'dark theme uses actual foreground tokens and default axe contrast on visible button text', () => {
    harness({ button: { children: 'Choose a fruit' } }, true);
    trigger().should('have.css', 'color', 'rgb(255, 255, 255)');
    open();
    press('Escape');
  });
  scenario(
    3,
    'real CDP forced-colors media changes disabled control system border while retaining native focus',
    () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      harness({ picker: { disabled: true }, button: { children: 'Disabled picker' } });
      cy.window().then(window => expect(window.matchMedia('(forced-colors: active)').matches).to.equal(true));
      cy.get('[data-control]').then($control => {
        const document = $control[0].ownerDocument;
        const swatch = document.createElement('span');
        swatch.style.color = 'GrayText';
        document.body.appendChild(swatch);
        const systemColor = document.defaultView!.getComputedStyle(swatch).color;
        swatch.remove();
        expect(document.defaultView!.getComputedStyle($control[0]).borderTopColor).to.equal(systemColor);
      });
      trigger().realClick().should('be.focused').and('have.attr', 'aria-expanded', 'false');
    },
  );
  scenario(3, 'context trigger ref and forwarded ref share the same exact native button', () => {
    const shared = React.createRef<HTMLButtonElement>();
    const forwarded = React.createRef<HTMLButtonElement>();
    stage(<ContextButton context={{ triggerRef: shared }} forwardedRef={forwarded} />);
    cy.get('.fui-TagPickerButton').then($button => {
      expect(shared.current).to.equal($button[0]);
      expect(forwarded.current).to.equal(shared.current);
    });
  });
  scenario(3, 'root children render callback customizes the actual resolved button without losing handlers', () => {
    const requests: boolean[] = [];
    const render: SlotRenderFunction<TagPickerButtonProps> = (Component, props) => (
      <Component {...props} data-rendered>
        <strong>Rendered slot</strong>
      </Component>
    );
    stage(
      <ContextButton
        context={{ setOpen: (_event, value) => requests.push(value) }}
        props={{
          children: render,
        }}
      />,
    );
    cy.get('[data-rendered]').should('have.prop', 'tagName', 'BUTTON');
    cy.get('[data-rendered]').realClick();
    cy.then(() => expect(requests).to.deep.equal([true]));
  });
  scenario(3, 'source characterization: accepted small button size is ignored in medium picker context', () => {
    stage(<ContextButton props={{ size: 'small', children: 'Small prop' }} />);
    cy.get('.fui-TagPickerButton').should('have.css', 'font-size', '12px').and('have.css', 'min-height', '32px');
  });
  scenario(3, 'source characterization: Field does not inject button label or description props', () => {
    stage(
      <Field label="Field label" hint="Field hint">
        <TagPickerButton aria-label="Explicit name" />
      </Field>,
    );
    cy.get('.fui-TagPickerButton').should($button => {
      expect($button.attr('aria-labelledby')).to.equal(undefined);
      expect($button.attr('aria-describedby')).to.equal(undefined);
      expect(computeAccessibleName($button[0])).to.equal('Explicit name');
      expect(computeAccessibleDescription($button[0])).to.equal('');
    });
  });
  scenario(3, 'prefix provider scopes generated list and option IDs and resolves every live ID reference', () => {
    stage(
      <IdPrefixProvider value="row136-">
        <Harness />
      </IdPrefixProvider>,
    );
    open();
    trigger().then($button => {
      expect($button, 'one provider-scoped trigger').to.have.length(1);
      const document = $button[0].ownerDocument;
      const controls = $button.attr('aria-controls');
      const descendant = $button.attr('aria-activedescendant');
      assertIdReference(controls, 'aria-controls');
      assertIdReference(descendant, 'aria-activedescendant');
      expect(controls.split(/\s+/), 'exactly one aria-controls IDREF').to.have.length(1);
      expect(descendant.split(/\s+/), 'exactly one aria-activedescendant IDREF').to.have.length(1);
      expect(controls.startsWith('row136-picker-listbox')).to.equal(true);
      expect(descendant.startsWith('row136-fluent-option')).to.equal(true);
      expect(document.querySelectorAll(`[id="${controls}"]`)).to.have.length(1);
      expect(document.querySelectorAll(`[id="${descendant}"]`)).to.have.length(1);
      expect(document.getElementById(controls)?.contains(document.getElementById(descendant))).to.equal(true);
    });
  });
  scenario(3, 'two picker instances have independent generated IDs and selection ownership', () => {
    stage(
      <>
        <div data-instance="one">
          <Harness />
        </div>
        <div data-instance="two">
          <Harness />
        </div>
      </>,
    );
    cy.get('[data-instance="one"] [data-trigger]')
      .realClick()
      .then($button => {
        const firstID = $button.attr('aria-controls');
        cy.get('[data-instance="two"] [data-trigger]')
          .realClick()
          .then($second => {
            expect($second.attr('aria-controls')).not.to.equal(firstID);
            expect(
              $second[0].ownerDocument.getElementById($second.attr('aria-controls')!)?.getAttribute('data-popup'),
            ).to.equal('true');
          });
      });
    cy.get('[data-instance="one"] [data-trigger]').should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-selected]')
      .should('have.length', 2)
      .each($output => expect($output.text()).to.equal('[]'));
  });
  scenario(3, 'source characterization: custom list ID needs a matching explicit button aria-controls override', () => {
    harness({ list: { id: 'consumer-list' }, button: { 'aria-controls': 'consumer-list' } });
    open();
    trigger().should('have.attr', 'aria-controls', 'consumer-list');
    popup().should('have.attr', 'id', 'consumer-list');
    // The control still owns its generated ID; close before the final audit and record the mismatch explicitly.
    cy.get('[data-control]').then($control => {
      const owns = $control.attr('aria-owns')!;
      expect(owns).not.to.equal('consumer-list');
      expect($control[0].ownerDocument.getElementById(owns)).to.equal(null);
      return axe
        .run([$control[0].closest('main')!, $control[0].ownerDocument.getElementById('consumer-list')!])
        .then(results => {
          cy.writeFile(`${evidence}/finding-custom-list-id.json`, results).then(() => {
            expect(findingShape(results.violations)).to.deep.equal([
              {
                id: 'aria-valid-attr-value',
                nodes: [
                  {
                    target: ['.fui-TagPickerControl'],
                    anyChecks: [],
                    none: [],
                    all: [{ id: 'aria-valid-attr-value', data: [`aria-owns="${owns}"`], impact: 'critical' }],
                  },
                ],
              },
            ]);
            expect(findingShape(results.incomplete)).to.deep.equal([]);
          });
        });
    });
    press('Escape');
  });
  scenario(3, 'custom expand icon retains its slot label and opens through trusted mousedown', () => {
    harness({ control: { expandIcon: { children: <span data-custom-icon>v</span>, 'aria-label': 'Expand fruits' } } });
    cy.get('[data-custom-icon]').realClick();
    trigger().should('be.focused').and('have.attr', 'aria-expanded', 'true');
    cy.get('.fui-TagPickerControl__expandIcon').should('have.attr', 'aria-label', 'Expand fruits');
    cy.then(() => expect(events.filter(e => e.kind === 'open').map(e => e.type)).to.deep.equal(['mousedown']));
  });
  scenario(3, 'null expand icon removes the icon slot but native button still opens normally', () => {
    harness({ control: { expandIcon: null } });
    cy.get('.fui-TagPickerControl__expandIcon').should('not.exist');
    open();
  });
  scenario(3, 'secondary action receives native Tab after trigger and does not select', () => {
    harness({
      control: {
        secondaryAction: (
          <button data-secondary type="button">
            Secondary
          </button>
        ),
      },
    });
    open();
    press('Tab');
    cy.get('[data-secondary]').should('be.focused');
    selected([]);
  });
  scenario(3, 'control background opens once while consumer mousedown prevention vetoes its own handler', () => {
    harness({ control: { onMouseDown: event => event.preventDefault() } });
    cy.get('[data-control]').realClick({ position: 'left' });
    trigger().should('have.attr', 'aria-expanded', 'false');
    cy.then(() => expect(events.filter(e => e.kind === 'open')).to.have.length(0));
  });
  scenario(3, 'button and picker disabled together reject both native pointer and keyboard opening', () => {
    harness({ picker: { disabled: true }, button: { disabled: true } });
    trigger().realClick().should('be.disabled').and('have.attr', 'aria-expanded', 'false');
    cy.get('[data-before]').realClick();
    press('Tab');
    cy.get('[data-after]').should('be.focused');
    cy.then(() => expect(events).to.deep.equal([]));
  });
  scenario(3, 'source characterization: explicit enabled button cannot override disabled picker state', () => {
    harness({ picker: { disabled: true }, button: { disabled: false } });
    trigger().realClick();
    press('Enter');
    trigger().should('not.be.disabled').and('have.attr', 'aria-expanded', 'false');
    cy.then(() => expect(events.filter(e => e.kind === 'open')).to.have.length(0));
  });
  scenario(
    3,
    'source characterization: mixed Input and Button share expansion but last mounted input owns active descendant',
    () => {
      harness({ mixInput: true });
      open();
      trigger().should('not.have.attr', 'aria-activedescendant');
      cy.get('[data-mixed-input]')
        .should('have.attr', 'aria-expanded', 'true')
        .and('have.attr', 'aria-activedescendant');
      option('banana').realClick();
      selected(['banana']);
      cy.get('[data-mixed-input]').should('be.focused');
    },
    1,
  );
  scenario(3, 'selected tag native dismissal returns focus to the button and restores visible layout', () => {
    harness({ picker: { defaultSelectedOptions: ['apple'] } });
    cy.get('.fui-Tag__dismissIcon').realClick();
    selected([]);
    trigger().should('be.focused').and('have.css', 'position', 'static');
    cy.then(() =>
      expect(events.filter(e => e.kind === 'select').map(e => [e.value, e.selectedOptions])).to.deep.equal([
        ['apple', []],
      ]),
    );
  });
  scenario(
    3,
    'native Shift Tab visits selected tag and ArrowRight returns to the hidden button',
    () => {
      harness({ picker: { defaultSelectedOptions: ['apple'] } });
      trigger().focus();
      press(['Shift', 'Tab']);
      cy.get('.fui-Tag').should('be.focused');
      press('ArrowRight');
      trigger().should('be.focused');
    },
    1,
  );
  scenario(3, 'disableAutoFocus keeps no active option until the first native ArrowDown', () => {
    harness({ picker: { disableAutoFocus: true } });
    open();
    trigger().should('not.have.attr', 'aria-activedescendant');
    press('ArrowDown');
    active('apple');
  });
  scenario(3, 'empty list opens and navigation cannot create a selection or descendant', () => {
    harness({ options: [] });
    open();
    press('End');
    press('Space');
    selected([]);
    trigger().should('not.have.attr', 'aria-activedescendant');
    cy.then(() => expect(events.filter(e => e.kind === 'select')).to.have.length(0));
  });
  scenario(
    3,
    'Alt ArrowUp source multiselect action selects without closing',
    () => {
      harness();
      open();
      press(['Alt', 'ArrowUp']);
      selected(['apple']);
      trigger().should('have.attr', 'aria-expanded', 'true');
    },
    1,
  );
  scenario(
    3,
    'source characterization: Backspace does not dismiss selected tags from the button trigger',
    () => {
      harness({ picker: { defaultSelectedOptions: ['apple'] } });
      trigger().focus();
      press('Backspace');
      selected(['apple']);
      cy.then(() => expect(events.filter(e => e.kind === 'select')).to.have.length(0));
    },
    1,
  );
  scenario(
    3,
    'unmount removes open portals and remount cannot reuse stale option IDs or callbacks',
    () => {
      harness();
      open();
      popup().then($old => {
        const old = $old[0];
        const oldID = old.id;
        cy.get('[data-unmount]').realClick();
        popup().should('not.exist');
        cy.then(() => expect(old.isConnected).to.equal(false));
        cy.get('[data-version]').realClick();
        cy.get('[data-remount]').realClick();
        open();
        popup().should($new => expect($new[0].id).not.to.equal(oldID));
        press('Space');
        selected(['apple']);
        cy.then(() => expect(events.filter(e => e.kind === 'select').map(e => e.version)).to.deep.equal([1]));
      });
    },
    1,
  );
  scenario(3, 'stale type-ahead timeout is cleaned on unmount before a new picker searches', () => {
    harness();
    trigger().focus();
    press('a');
    active('apple');
    cy.get('[data-unmount]').realClick();
    cy.get('[data-remount]').realClick();
    trigger().focus();
    press('b');
    active('banana');
    cy.wait(550);
    active('banana');
  });
  scenario(
    3,
    'uncontrolled default selection survives external clear and resets only on remount',
    () => {
      harness({ selection: 'uncontrolled', picker: { defaultSelectedOptions: ['apple'] } });
      cy.get('[data-reset]').realClick();
      selected(['apple']);
      trigger().focus();
      press('ArrowDown');
      press('End');
      press('Space');
      selected(['apple', 'cherry']);
      cy.get('[data-unmount]').realClick();
      cy.get('[data-remount]').realClick();
      selected(['apple']);
      trigger().focus();
      cy.get('[aria-label="Selected fruit"] > [data-tabster-dummy]')
        .should('have.length', 2)
        .each($dummy => expect($dummy.attr('tabindex')).to.equal('0'));
    },
    1,
  );
  scenario(3, 'type-ahead uses text rather than option value and does not treat Backspace as input editing', () => {
    harness({ options: [{ value: 'opaque-123', text: 'Banana' }, ...fruits.slice(0, 2)] });
    trigger().focus();
    press('b');
    active('opaque-123');
    press('Backspace');
    active('opaque-123');
  });
  scenario(
    3,
    'known-finding guards reject foreign targets checks count and severity rather than blanket allowances',
    () => {
      stage(<ContextButton props={{ children: 'Audit guards' }} />);
      const shape = moverShape(1);
      assertMoverShape(shape, 1);
      const wrongTarget = Cypress._.cloneDeep(shape);
      wrongTarget[0].nodes[0].target = ['button'];
      expect(() => assertMoverShape(wrongTarget, 1)).to.throw();
      const wrongCheck = Cypress._.cloneDeep(shape);
      wrongCheck[0].nodes[0].all[0].id = 'unexpected-check';
      expect(() => assertMoverShape(wrongCheck, 1)).to.throw();
      const wrongSeverity = Cypress._.cloneDeep(shape);
      wrongSeverity[0].nodes[0].all[0].impact = 'minor';
      expect(() => assertMoverShape(wrongSeverity, 1)).to.throw();
      expect(() => assertMoverShape([], 1)).to.throw();
      expect(() => assertMoverShape(shape, 2)).to.throw();
    },
  );
  scenario(3, 'legacy hook placeholder fallback exists at runtime but remains outside the public API', () => {
    const legacy = { placeholder: 'Legacy placeholder', 'aria-label': 'Legacy fallback' };
    stage(<TagPickerButton {...legacy} />);
    cy.get('.fui-TagPickerButton').should('have.text', 'Legacy placeholder');
  });
  scenario(
    3,
    'source characterization: explicit undefined type removes button default and allows native submit',
    () => {
      const submissions: Array<{ trusted: boolean; submitter: Element | null }> = [];
      stage(
        <form
          onSubmit={event => {
            event.preventDefault();
            submissions.push({
              trusted: event.nativeEvent.isTrusted,
              submitter: (event.nativeEvent as SubmitEvent).submitter,
            });
          }}
        >
          <TagPickerButton data-undefined-type aria-label="Undefined type" type={undefined}>
            Submit
          </TagPickerButton>
        </form>,
      );
      cy.get('[data-undefined-type]').should('not.have.attr', 'type');
      cy.get('[data-undefined-type]')
        .realClick()
        .then($button => {
          expect(submissions).to.deep.equal([{ trusted: true, submitter: $button[0] }]);
        });
    },
  );
  scenario(3, 'noPopover source composition opens logically but has a dangling controls reference until closed', () => {
    stage(<Harness picker={{ noPopover: true }} />);
    trigger().realClick().should('have.attr', 'aria-expanded', 'true');
    popup().should('not.exist');
    trigger().then($button => {
      const id = $button.attr('aria-controls');
      expect(id).to.be.a('string').and.not.equal('');
      expect($button[0].ownerDocument.getElementById(id!)).to.equal(null);
      return axe.run($button[0].closest('main')!).then(results => {
        cy.writeFile(`${evidence}/finding-no-popover.json`, results).then(() => {
          expect(findingShape(results.violations)).to.deep.equal([
            {
              id: 'aria-valid-attr-value',
              nodes: [
                {
                  target: ['.fui-TagPickerButton'],
                  anyChecks: [],
                  none: [],
                  all: [{ id: 'aria-valid-attr-value', data: [`aria-controls="${id}"`], impact: 'critical' }],
                },
              ],
            },
          ]);
          expect(results.incomplete).to.deep.equal([]);
          expect(results.passes.length).to.be.greaterThan(0);
        });
      });
      scenario(
        3,
        'owned list active-descendant listeners detach exactly on unmount without touching document listeners',
        () => {
          const live: Array<{ target: EventTarget; listener: EventListenerOrEventListenerObject | null }> = [];
          cy.window().then(window => {
            const prototype = window.EventTarget.prototype;
            const add = prototype.addEventListener;
            const remove = prototype.removeEventListener;
            prototype.addEventListener = function (type, listener, options) {
              add.call(this, type, listener, options);
              if (type === 'activedescendantchange') {
                live.push({ target: this, listener });
              }
            };
            prototype.removeEventListener = function (type, listener, options) {
              remove.call(this, type, listener, options);
              if (type === 'activedescendantchange') {
                const index = live.findIndex(item => item.target === this && item.listener === listener);
                if (index >= 0) {
                  live.splice(index, 1);
                }
              }
            };
            restoreListeners = () => {
              prototype.addEventListener = add;
              prototype.removeEventListener = remove;
            };
          });
          harness();
          open();
          popup().then($popup => {
            const target = $popup[0];
            expect(live.filter(item => item.target === target)).to.have.length(1);
            cy.get('[data-unmount]').realClick();
            cy.then(() => expect(live.filter(item => item.target === target)).to.have.length(0));
            popup().should('not.exist');
          });
          scenario(
            3,
            'source characterization: selected options have neither aria-selected nor aria-checked in the actual listbox',
            () => {
              harness();
              open();
              press('Space');
              selected(['apple']);
              popup().should('have.attr', 'role', 'listbox');
              option('apple').should($option => {
                expect($option.attr('role')).to.equal('option');
                expect($option.attr('aria-selected')).to.equal(undefined);
                expect($option.attr('aria-checked')).to.equal(undefined);
              });
              cy.get('[aria-label="Selected fruit"]')
                .should('have.attr', 'role', 'listbox')
                .find('.fui-Tag')
                .should('have.length', 1);
            },
            1,
          );
          scenario(
            3,
            'source characterization: uncontrolled onOptionSelect preventDefault does not roll back committed state',
            () => {
              harness({ selection: 'uncontrolled', picker: { onOptionSelect: event => event.preventDefault() } });
              open();
              press('Space');
              selected(['apple']);
            },
            1,
          );
          scenario(
            3,
            'source characterization: disabled picker with defaultOpen allows selection through its enabled button',
            () => {
              harness({ picker: { disabled: true, defaultOpen: true } });
              trigger().focus();
              press('Space');
              selected(['apple']);
              trigger().should('not.be.disabled').and('have.attr', 'aria-expanded', 'true');
              cy.get('[data-reset]').realClick();
              selected([]);
              cy.get('[data-close]').realClick();
              trigger().should('have.attr', 'aria-expanded', 'false');
            },
          );
          scenario(3, 'Escape stops parent keyboard propagation only when picker is open', () => {
            const keys: string[] = [];
            stage(
              <div onKeyDown={event => keys.push(event.key)}>
                <Harness />
              </div>,
            );
            const escapeIgnored = (expected: boolean) =>
              trigger().should($trigger => {
                expect($trigger.attr('data-tabster')).to.be.a('string');
                expect(JSON.parse($trigger.attr('data-tabster')!)).to.have.nested.property(
                  'focusable.ignoreKeydown.Escape',
                  expected,
                );
              });
            escapeIgnored(false);
            trigger().focus();
            press('Escape');
            cy.then(() => expect(keys).to.deep.equal(['Escape']));
            trigger().realClick();
            escapeIgnored(true);
            press('Escape');
            escapeIgnored(false);
            cy.then(() => expect(keys).to.deep.equal(['Escape']));
          });
          scenario(
            3,
            'ordinary capture handler can veto native form submit without blocking merged picker opening',
            () => {
              const requests: boolean[] = [];
              const submissions: boolean[] = [];
              stage(
                <form
                  onSubmit={event => {
                    event.preventDefault();
                    submissions.push(event.nativeEvent.isTrusted);
                  }}
                >
                  <ContextButton
                    context={{ setOpen: (_event, value) => requests.push(value) }}
                    props={{ type: 'submit', onClickCapture: event => event.preventDefault(), children: 'Captured' }}
                  />
                </form>,
              );
              cy.get('.fui-TagPickerButton').realClick();
              cy.then(() => {
                expect(requests).to.deep.equal([true]);
                expect(submissions).to.deep.equal([]);
              });
            },
          );
        },
      );
    });
    press('Escape');
    trigger().should('not.have.attr', 'aria-controls');
  });
});
