import * as React from 'react';
import { createPortal, flushSync } from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import * as axe from 'axe-core';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
// nx-ignore-next-line
import { Field, FluentProvider, Input, webLightTheme } from '@fluentui/react-components';
import { IdPrefixProvider, useId } from '../../../src/hooks/useId';
import { IdPrefixProvider as PublicProvider, useId as publicUseId } from '../../../src/index';
import { IdPrefixProvider as HooksProvider } from '../../../src/hooks/index';
import { SSRProvider } from '../../../src/ssr';
import { HookOrder, Lifecycle, Probe } from './fixtures.stories';

const rawRound: unknown = Cypress.env('coverageRound') ?? 3;
if ((typeof rawRound !== 'number' && typeof rawRound !== 'string') || ![1, 2, 3, '1', '2', '3'].includes(rawRound)) {
  throw new Error('coverageRound must be exactly 1, 2, or 3');
}
const round = Number(rawRound);
const scope = 'testing/IdPrefixProvider';
const evidence = `${scope}/.evidence/audits-${Date.now()}-${Cypress._.random(100000, 999999)}`;
const titles: string[] = [];
const roots: Root[] = [];
const label = 'row135 IdPrefixProvider';
let ordinal = 0;
let realEvents: Array<{ command: string; args: unknown }> = [];

function scenario(level: number, title: string, body: () => void) {
  if (level <= round) {
    titles.push(title);
    it(title, body);
  }
}

function mountStage(children: React.ReactNode) {
  return mount(
    <main id="row135-stage" style={{ color: '#000', background: '#fff', padding: 16 }}>
      {children}
    </main>,
    { strict: false },
  );
}

function probe(name = 'Name') {
  return cy.get(`[data-probe="${name}"]`);
}

function prefix(expected: string, name = 'Name') {
  probe(name).should($probe => {
    const id = $probe.attr('data-generated');
    expect(id, 'actual useId value').to.be.a('string').and.not.equal('');
    expect(id?.startsWith(expected), `literal prefix ${JSON.stringify(expected)}`).to.equal(true);
    expect(id?.slice(expected.length), 'nonempty native suffix').not.to.equal('');
  });
}

function ids(stage: HTMLElement) {
  return Array.from(stage.querySelectorAll<HTMLElement>('[id]')).map(node => node.id);
}

function assertReferences(stage: HTMLElement) {
  const values = ids(stage);
  expect(new Set(values).size, 'no duplicate owned DOM IDs').to.equal(values.length);
  for (const element of stage.querySelectorAll<HTMLElement>(
    '[for],[aria-labelledby],[aria-describedby],[aria-controls]',
  )) {
    for (const attribute of ['for', 'aria-labelledby', 'aria-describedby', 'aria-controls']) {
      const value = element.getAttribute(attribute);
      if (value !== null) {
        expect(value.trim(), `nonempty ${attribute}`).not.to.equal('');
        const tokens = attribute === 'for' ? [value] : value.trim().split(/\s+/);
        for (const token of tokens) {
          const targets = Array.from(stage.querySelectorAll<HTMLElement>('[id]')).filter(node => node.id === token);
          expect(targets, `${attribute} resolves exactly once: ${token}`).to.have.length(1);
          if (stage.isConnected) {
            expect(element.ownerDocument.getElementById(token), 'document-level target').to.equal(targets[0]);
          }
        }
      }
    }
  }
}

function externalRoot(stage: HTMLElement, children: React.ReactNode, identifierPrefix?: string) {
  const container = stage.ownerDocument.createElement('div');
  container.dataset.externalRoot = 'true';
  stage.appendChild(container);
  const root = createRoot(container, { identifierPrefix });
  roots.push(root);
  flushSync(() => root.render(children));
  return { root, container };
}

describe(label, { retries: 0 }, () => {
  beforeEach(() => {
    realEvents = [];
    cy.on('command:end', command => {
      const name: unknown = command.get('name');
      if (typeof name === 'string' && ['realClick', 'realPress'].includes(name)) {
        realEvents.push({ command: name, args: command.get('args') });
      }
    });
  });
  before(() => {
    expect(React.version, 'native browser runtime').to.equal('19.2.0');
    expect(React.useId, 'unmocked native hook').to.be.a('function');
    cy.writeFile(`${evidence}/manifest.json`, { kind: 'manifest', round, titles, react: React.version, retries: 0 });
  });

  afterEach(function () {
    const title = this.currentTest?.title;
    expect(title, 'registered audit identity').to.be.a('string');
    const retries = Cypress.currentRetry;
    expect(retries, 'no case retried').to.equal(0);
    cy.get('#row135-stage')
      .should('be.visible')
      .and('not.be.empty')
      .then($stage => {
        const stage = $stage[0];
        assertReferences(stage);
        return axe.run(stage).then(fullResults => ({ fullResults, domIds: ids(stage) }));
      })
      .then(({ fullResults: results, domIds }) => {
        expect(results.passes.length, 'nonempty default axe pass set').to.be.greaterThan(0);
        expect(results.violations, 'no default axe violations').to.deep.equal([]);
        expect(results.incomplete, 'no unreviewed axe incomplete results').to.deep.equal([]);
        cy.writeFile(`${evidence}/audit-${++ordinal}.json`, {
          kind: 'axe',
          scenario: title,
          round,
          retries,
          ids: domIds,
          realEvents,
          fullResults: results,
        });
      });
    cy.then(() => {
      flushSync(() => roots.splice(0).forEach(root => root.unmount()));
      cy.get('#row135-stage').then($stage => {
        for (const container of $stage[0].querySelectorAll('[data-external-root]')) {
          expect(container.childNodes.length, 'independent roots cleaned').to.equal(0);
          container.remove();
        }
      });
    });
  });

  for (const [name, value] of [
    ['ordinary', 'scope-'],
    ['empty', ''],
    ['undefined', undefined],
    ['Unicode', '\u03b4\u65e5-'],
    ['punctuation', 'scope:[]<>#.-'],
    ['leading space', ' scope-'],
    ['trailing space', 'scope- '],
    ['embedded space', 'scope one-'],
    ['tab', 'scope\t'],
    ['newline', 'scope\n'],
  ] as const) {
    scenario(1, `preserves ${name} context prefix literally`, () => {
      const literal = Boolean(value && /\s/.test(value));
      mountStage(
        <IdPrefixProvider value={value}>
          <Probe name="Name" literal={literal} />
        </IdPrefixProvider>,
      );
      prefix(`${value || ''}fui-`);
      if (literal) {
        probe().should('not.have.attr', 'id');
        probe().find('input,label').should('not.exist');
      }
    });
  }

  for (const [name, value] of [
    ['leading whitespace', ' explicit'],
    ['trailing whitespace', 'explicit '],
    ['tab', 'explicit\tid'],
  ] as const) {
    scenario(1, `provided ID preserves ${name} literally without claiming valid HTML IDREFs`, () => {
      mountStage(
        <IdPrefixProvider value="ignored-">
          <Probe name="Name" provided={value} literal />
        </IdPrefixProvider>,
      );
      probe().should('have.attr', 'data-generated', value).and('not.have.attr', 'id');
    });
  }

  for (const [name, value] of [
    ['ordinary', 'explicit'],
    ['punctuation', 'custom:[]'],
    ['Unicode', '\u03b4-id'],
    ['empty fallback', ''],
    ['undefined fallback', undefined],
  ] as const) {
    scenario(1, `uses provided ID ${name} with documented truthiness`, () => {
      mountStage(
        <IdPrefixProvider value="scope-">
          <Probe name="Name" prefix="local-" provided={value} />
        </IdPrefixProvider>,
      );
      if (value) {
        probe().should('have.attr', 'data-generated', value);
      } else {
        prefix('scope-local-');
      }
    });
  }

  for (const [name, value, expected] of [
    ['default', undefined, 'scope-fui-'],
    ['custom', 'local-', 'scope-local-'],
    ['empty', '', 'scope-'],
    ['colon', 'local:', 'scope-local:'],
  ] as const) {
    scenario(1, `concatenates ${name} hook prefix without inserting separators`, () => {
      mountStage(
        <IdPrefixProvider value="scope-">
          <Probe name="Name" prefix={value} />
        </IdPrefixProvider>,
      );
      prefix(expected);
    });
  }

  scenario(1, 'uses the default prefix outside any provider', () => {
    mountStage(<Probe name="Name" />);
    prefix('fui-');
  });

  for (const [name, value, expected] of [
    ['nearest override', 'inner-', 'inner-fui-'],
    ['empty resets outer scope', '', 'fui-'],
    ['undefined resets outer scope', undefined, 'fui-'],
  ] as const) {
    scenario(1, `nested provider ${name}`, () => {
      mountStage(
        <IdPrefixProvider value="outer-">
          <Probe name="Outer" />
          <IdPrefixProvider value={value}>
            <Probe name="Name" />
          </IdPrefixProvider>
          <Probe name="Sibling" />
        </IdPrefixProvider>,
      );
      prefix(expected);
      prefix('outer-fui-', 'Outer');
      prefix('outer-fui-', 'Sibling');
    });
  }

  scenario(1, 'public and hooks reexports share the production provider and hook', () => {
    expect(PublicProvider).to.equal(IdPrefixProvider);
    expect(HooksProvider).to.equal(IdPrefixProvider);
    expect(publicUseId).to.equal(useId);
    mountStage(
      <PublicProvider value="public-">
        <Probe name="Name" />
      </PublicProvider>,
    );
    prefix('public-fui-');
  });

  scenario(1, 'provider produces no DOM wrapper, appearance or slots', () => {
    mountStage(
      <IdPrefixProvider value="scope-">
        <Probe name="Name" />
      </IdPrefixProvider>,
    );
    cy.get('#row135-stage').children().should('have.length', 1).and('have.attr', 'data-probe', 'Name');
  });

  for (const kind of ['prefix', 'local', 'provided', 'key', 'order', 'remove'] as const) {
    scenario(2, `updates ${kind} while preserving the appropriate native identities`, () => {
      mountStage(<Lifecycle kind={kind} />);
      cy.get('#row135-stage').then($stage => {
        const before = Object.fromEntries(
          Array.from($stage[0].querySelectorAll<HTMLElement>('[data-probe]')).map(node => [
            node.dataset.probe!,
            node.dataset.generated!,
          ]),
        );
        cy.contains('button', 'Change').realClick();
        cy.get('#row135-stage').should($next => {
          const after = Object.fromEntries(
            Array.from($next[0].querySelectorAll<HTMLElement>('[data-probe]')).map(node => [
              node.dataset.probe!,
              node.dataset.generated!,
            ]),
          );
          if (kind === 'prefix') {
            expect(after.First).to.equal(before.First.replace('inner-', 'new-'));
          } else if (kind === 'local') {
            expect(after.First).to.equal(before.First.replace('fui-', 'custom-'));
          } else if (kind === 'provided') {
            expect(after.First).to.equal('explicit');
          } else if (kind === 'key') {
            expect(after.First).not.to.equal(before.First);
            expect(after.Second).to.equal(before.Second);
          } else if (kind === 'order') {
            expect(after).to.deep.equal(before);
            expect(
              Array.from($next[0].querySelectorAll('[data-probe]')).map(node => node.getAttribute('data-probe')),
            ).to.deep.equal(['First', 'C', 'B', 'A']);
          } else {
            expect(after.First).to.match(/^outer-fui-/);
            expect(after.First).not.to.equal(before.First);
          }
        });
        if (kind === 'prefix' || kind === 'local' || kind === 'provided') {
          cy.contains('button', 'Change').realClick();
          probe('First').should('have.attr', 'data-generated', before.First);
        }
      });
    });
  }

  scenario(2, 'retains IDs, DOM nodes, focus and input state on an unrelated rerender', () => {
    mountStage(<Lifecycle kind="prefix" />);
    probe('First')
      .find('input')
      .then($input => {
        const node = $input[0];
        const id = node.id;
        cy.wrap($input).type('retained');
        cy.contains('button', 'Rerender').realClick();
        cy.contains('button', 'Focus First').realClick();
        probe('First')
          .find('input')
          .should($next => {
            expect($next[0]).to.equal(node);
            expect($next[0].id).to.equal(id);
          })
          .and('have.value', 'retained')
          .and('have.focus');
      });
  });

  scenario(2, 'conditionally provided IDs do not change hook order or following state', () => {
    mountStage(
      <IdPrefixProvider value="scope-">
        <HookOrder />
      </IdPrefixProvider>,
    );
    cy.get('[data-second]').then($node => {
      const second = $node.attr('data-second');
      cy.contains('button', 'Switch ID').realClick();
      cy.get('[data-first]')
        .should('have.attr', 'data-first')
        .and('match', /^scope-first-/);
      cy.contains('button', 'Increment').realClick();
      cy.get('[data-second]').should('have.attr', 'data-second', second).and('have.text', 'Count 1');
      cy.contains('button', 'Switch ID').realClick();
      cy.get('[data-first]').should('have.attr', 'data-first', 'explicit');
    });
  });

  for (const [name, value] of [
    ['empty', ''],
    ['undefined', undefined],
    ['Unicode', '\u03b4-'],
  ] as const) {
    scenario(2, `native context transition to ${name} preserves suffix and restores prior associations`, () => {
      const Example: React.FC = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <IdPrefixProvider value={changed ? value : 'initial-'}>
            <button type="button" onClick={() => setChanged(!changed)}>
              Transition
            </button>
            <Probe name="Name" />
          </IdPrefixProvider>
        );
      };
      mountStage(<Example />);
      probe().then($probe => {
        const before = $probe.attr('data-generated')!;
        const input = $probe.find('input')[0];
        cy.contains('button', 'Transition').realClick();
        probe().should('have.attr', 'data-generated', `${value || ''}${before.slice('initial-'.length)}`);
        probe()
          .find('input')
          .should($input => expect($input[0]).to.equal(input));
        probe().find('label').realClick();
        probe().find('input').should('have.focus');
        cy.contains('button', 'Transition').realClick();
        probe().should('have.attr', 'data-generated', before);
      });
    });
  }

  scenario(2, 'changing context leaves a truthy provided input ID untouched but updates generated descriptions', () => {
    const Example: React.FC = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <IdPrefixProvider value={changed ? 'b-' : 'a-'}>
          <button type="button" onClick={() => setChanged(!changed)}>
            Transition
          </button>
          <Probe name="Name" provided="explicit" />
        </IdPrefixProvider>
      );
    };
    mountStage(<Example />);
    probe()
      .find('input')
      .then($input => {
        const before = $input.attr('aria-describedby')!;
        cy.contains('button', 'Transition').realClick();
        probe()
          .find('input')
          .should('have.attr', 'id', 'explicit')
          .and('have.attr', 'aria-describedby', before.replace('a-', 'b-'));
        probe().find('label').realClick();
        probe().find('input').should('have.focus');
      });
  });

  for (const context of ['outer-', 'inner-']) {
    scenario(2, `real label click and accessible name resolve in ${context} scope`, () => {
      mountStage(
        <IdPrefixProvider value={context}>
          <Probe name="Name" />
        </IdPrefixProvider>,
      );
      probe().find('label').realClick();
      probe()
        .find('input')
        .should('have.focus')
        .then($input => {
          expect(computeAccessibleName($input[0])).to.equal('Name');
          expect(computeAccessibleDescription($input[0])).to.equal('Help for Name');
          expect($input[0].labels?.[0].htmlFor).to.equal($input[0].id);
        });
    });
  }

  scenario(2, 'CDP Tab follows input and both referenced controls in order', () => {
    mountStage(
      <IdPrefixProvider value="scope-">
        <Probe name="Name" />
      </IdPrefixProvider>,
    );
    probe().find('input').focus();
    cy.realPress('Tab');
    cy.contains('button', 'Focus Name').should('have.focus');
    cy.realPress('Tab');
    cy.contains('button', 'Toggle Name').should('have.focus');
  });

  scenario(2, 'CDP Enter opens the uniquely referenced aria-controls panel', () => {
    mountStage(
      <IdPrefixProvider value="scope-">
        <Probe name="Name" />
      </IdPrefixProvider>,
    );
    cy.contains('button', 'Toggle Name').focus();
    cy.realPress('Enter');
    cy.contains('button', 'Toggle Name')
      .should('have.attr', 'aria-expanded', 'true')
      .then($button => {
        const panel = $button[0].ownerDocument.getElementById($button.attr('aria-controls')!);
        expect(panel?.hidden).to.equal(false);
        expect(panel?.textContent).to.equal('Details for Name');
      });
  });

  scenario(2, 'provider value changes update label, description and control IDREFs together', () => {
    mountStage(<Lifecycle kind="prefix" />);
    cy.contains('button', 'Change').realClick();
    probe('First').find('label').realClick();
    probe('First')
      .find('input')
      .should('have.focus')
      .and('have.attr', 'id')
      .and('match', /^new-fui-/);
    probe('First')
      .find('[aria-controls]')
      .should('have.attr', 'aria-controls')
      .and('match', /^new-panel-/);
    probe('First')
      .find('input')
      .then($input => {
        expect(computeAccessibleDescription($input[0])).to.equal('Help for First');
      });
  });

  scenario(2, 'sibling providers isolate their labels and generated IDs', () => {
    mountStage(
      <>
        <IdPrefixProvider value="a-">
          <Probe name="A" />
        </IdPrefixProvider>
        <IdPrefixProvider value="b-">
          <Probe name="B" />
        </IdPrefixProvider>
      </>,
    );
    prefix('a-fui-', 'A');
    prefix('b-fui-', 'B');
    probe('B').find('label').realClick();
    probe('B').find('input').should('have.focus');
    probe('A').find('input').should('not.have.focus');
  });

  for (const strict of [false, true]) {
    scenario(2, `${strict ? 'StrictMode' : 'ordinary mode'} keeps multiple instances unique across rerenders`, () => {
      const content = <Lifecycle kind="order" />;
      mountStage(strict ? <React.StrictMode>{content}</React.StrictMode> : content);
      cy.get('#row135-stage').then($stage => {
        const before = ids($stage[0]);
        cy.contains('button', 'Rerender').realClick();
        cy.get('#row135-stage').should($next => expect(ids($next[0])).to.deep.equal(before));
      });
    });
  }

  for (const [name, left, right, strict] of [
    ['same prefix', 'same-', 'same-', false],
    ['different prefixes', 'a-', 'b-', false],
    ['StrictMode same prefix', 'same-', 'same-', true],
    ['empty prefixes', '', '', false],
  ] as const) {
    scenario(3, `independent createRoot instances have unique IDs with ${name}`, () => {
      mountStage(<p>Independent roots</p>);
      cy.get('#row135-stage').then($stage => {
        const content = (value: string, control: string) => (
          <IdPrefixProvider value={value}>
            <Probe name={control} />
          </IdPrefixProvider>
        );
        externalRoot(
          $stage[0],
          strict ? <React.StrictMode>{content(left, 'Left')}</React.StrictMode> : content(left, 'Left'),
        );
        externalRoot(
          $stage[0],
          strict ? <React.StrictMode>{content(right, 'Right')}</React.StrictMode> : content(right, 'Right'),
        );
      });
      prefix(`${left}fui-`, 'Left');
      prefix(`${right}fui-`, 'Right');
    });
  }

  scenario(3, 'React root identifierPrefix composes with the provider prefix', () => {
    mountStage(<p>Root option</p>);
    cy.get('#row135-stage').then($stage => {
      externalRoot(
        $stage[0],
        <IdPrefixProvider value="scope-">
          <Probe name="Name" />
        </IdPrefixProvider>,
        'root-option-',
      );
    });
    prefix('scope-fui-');
    probe().should($probe =>
      expect($probe.attr('data-generated')!.slice('scope-fui-'.length)).to.contain('root-option-'),
    );
  });

  scenario(3, 'rerendering one independent root changes only its namespace and retains both native identities', () => {
    mountStage(<p>Independent updates</p>);
    cy.get('#row135-stage').then($stage => {
      const left = externalRoot(
        $stage[0],
        <IdPrefixProvider value="a-">
          <Probe name="Left" />
        </IdPrefixProvider>,
      );
      externalRoot(
        $stage[0],
        <IdPrefixProvider value="b-">
          <Probe name="Right" />
        </IdPrefixProvider>,
      );
      const beforeLeft = left.container.querySelector('input')!;
      const leftId = beforeLeft.id;
      const beforeRight = $stage[0].querySelector<HTMLElement>('[data-probe="Right"]')!.dataset.generated;
      flushSync(() =>
        left.root.render(
          <IdPrefixProvider value="new-">
            <Probe name="Left" />
          </IdPrefixProvider>,
        ),
      );
      expect(left.container.querySelector('input')).to.equal(beforeLeft);
      expect(beforeLeft.id).to.equal(leftId.replace('a-', 'new-'));
      expect($stage[0].querySelector<HTMLElement>('[data-probe="Right"]')!.dataset.generated).to.equal(beforeRight);
    });
    probe('Left').find('label').realClick();
    probe('Left').find('input').should('have.focus');
  });

  scenario(3, 'unmount and createRoot remount allocate fresh IDs without stale label targets', () => {
    mountStage(<Probe name="Survivor" />);
    cy.get('#row135-stage').then($stage => {
      const first = externalRoot(
        $stage[0],
        <IdPrefixProvider value="root-">
          <Probe name="Name" />
        </IdPrefixProvider>,
      );
      const oldInput = first.container.querySelector('input')!;
      const oldId = oldInput.id;
      flushSync(() => first.root.unmount());
      roots.splice(roots.indexOf(first.root), 1);
      expect(first.container.childNodes.length).to.equal(0);
      expect(oldInput.isConnected).to.equal(false);
      first.container.remove();
      const next = externalRoot(
        $stage[0],
        <IdPrefixProvider value="root-">
          <Probe name="Name" />
        </IdPrefixProvider>,
      );
      expect(next.container.querySelector('input')!.id).not.to.equal(oldId);
      expect($stage[0].ownerDocument.getElementById(oldId)).to.equal(null);
    });
    probe().find('label').realClick();
    probe().find('input').should('have.focus');
  });

  for (const nested of [false, true]) {
    scenario(
      3,
      `ReactDOM portal ${nested ? 'overrides with its nearest provider' : 'inherits the source context'}`,
      () => {
        mountStage(<p>Portal destination</p>);
        cy.get('#row135-stage').then($stage => {
          const destination = $stage[0].ownerDocument.createElement('div');
          destination.dataset.portal = 'true';
          $stage[0].appendChild(destination);
          externalRoot(
            $stage[0],
            <IdPrefixProvider value="source-">
              <Probe name="Source" />
              {createPortal(
                nested ? (
                  <IdPrefixProvider value="portal-">
                    <Probe name="Portal" />
                  </IdPrefixProvider>
                ) : (
                  <Probe name="Portal" />
                ),
                destination,
              )}
            </IdPrefixProvider>,
          );
        });
        prefix('source-fui-', 'Source');
        prefix(nested ? 'portal-fui-' : 'source-fui-', 'Portal');
        cy.get('[data-portal]').find('[data-probe="Portal"]').should('exist');
        probe('Portal').find('label').realClick();
        probe('Portal').find('input').should('have.focus');
      },
    );
  }

  scenario(3, 'a separate root inside provider-owned DOM does not inherit React context', () => {
    mountStage(
      <IdPrefixProvider value="source-">
        <Probe name="Source" />
        <div data-destination />
      </IdPrefixProvider>,
    );
    cy.get('[data-destination]').then($destination => {
      externalRoot($destination[0], <Probe name="Independent" />);
    });
    prefix('source-fui-', 'Source');
    prefix('fui-', 'Independent');
  });

  scenario(3, 'unmounting a portal source removes portalled controls and leaves a live sibling', () => {
    mountStage(<Probe name="Survivor" />);
    cy.get('#row135-stage').then($stage => {
      const destination = $stage[0].ownerDocument.createElement('div');
      $stage[0].appendChild(destination);
      const { root } = externalRoot(
        $stage[0],
        <IdPrefixProvider value="portal-">{createPortal(<Probe name="Removed" />, destination)}</IdPrefixProvider>,
      );
      expect(destination.querySelector('input')).not.to.equal(null);
      flushSync(() => root.unmount());
      roots.splice(roots.indexOf(root), 1);
      expect(destination.childNodes.length).to.equal(0);
      destination.remove();
    });
    probe('Removed').should('not.exist');
    probe('Survivor').find('label').realClick();
    probe('Survivor').find('input').should('have.focus');
  });

  for (const [name, value, rootPrefix, strict, ssr] of [
    ['default', undefined, '', false, false],
    ['provider', 'scope-', '', false, false],
    ['root option', 'scope-', 'hydration-', false, false],
    ['StrictMode', 'strict-', 'strict-root-', true, false],
    ['SSRProvider native ID no-op', 'ssr-', 'ssr-root-', false, true],
  ] as const) {
    scenario(3, `real renderToString and hydrateRoot preserve ${name} IDs and DOM without recovery`, () => {
      mountStage(<p>Hydration destination</p>);
      cy.spy(console, 'error').as('hydrationConsole');
      const errors: unknown[] = [];
      cy.get('#row135-stage').then($stage => {
        let content: React.ReactNode = (
          <IdPrefixProvider value={value}>
            <Probe name="Hydrated" />
          </IdPrefixProvider>
        );
        if (ssr) {
          const withoutSSRProvider = renderToString(content, { identifierPrefix: rootPrefix });
          content = <SSRProvider>{content}</SSRProvider>;
          expect(
            renderToString(content, { identifierPrefix: rootPrefix }),
            'SSRProvider does not change native React ID markup',
          ).to.equal(withoutSSRProvider);
        }
        if (strict) {
          content = <React.StrictMode>{content}</React.StrictMode>;
        }
        const container = $stage[0].ownerDocument.createElement('div');
        container.dataset.externalRoot = 'true';
        container.innerHTML = renderToString(content, { identifierPrefix: rootPrefix });
        $stage[0].appendChild(container);
        const input = container.querySelector('input')!;
        const before = ids(container);
        const root = hydrateRoot(container, content, {
          identifierPrefix: rootPrefix,
          onRecoverableError: error => errors.push(error),
        });
        roots.push(root);
        cy.wrap(container)
          .find('input')
          .should($input => {
            expect($input[0]).to.equal(input);
            expect(ids(container)).to.deep.equal(before);
          });
      });
      probe('Hydrated').find('input').type('hydrated');
      cy.contains('button', 'Focus Hydrated').realClick();
      probe('Hydrated').find('input').should('have.value', 'hydrated').and('have.focus');
      cy.then(() => expect(errors, 'no hydration recovery').to.deep.equal([]));
      cy.get('@hydrationConsole').should('not.have.been.called');
    });
  }

  scenario(3, 'repeated native SSR renders are deterministic without resetting private counters', () => {
    mountStage(<Probe name="Name" />);
    const content = (
      <IdPrefixProvider value="server-">
        <Probe name="Server" />
      </IdPrefixProvider>
    );
    expect(renderToString(content, { identifierPrefix: 'request-' })).to.equal(
      renderToString(content, { identifierPrefix: 'request-' }),
    );
  });

  scenario(3, 'equal SSR namespaces can collide across independent requests, detected on an inert copy', () => {
    mountStage(<Probe name="Name" />);
    cy.get('#row135-stage').then($stage => {
      const content = (
        <IdPrefixProvider value="same-">
          <Probe name="Server" />
        </IdPrefixProvider>
      );
      const copy = $stage[0].ownerDocument.createElement('div');
      copy.innerHTML = renderToString(content) + renderToString(content);
      expect(() => assertReferences(copy)).to.throw('no duplicate owned DOM IDs');
      expect(copy.isConnected).to.equal(false);
    });
  });

  scenario(3, 'distinct React server root namespaces prevent cross-root hydration collisions', () => {
    mountStage(<p>Two hydrated roots</p>);
    cy.spy(console, 'error').as('hydrationConsole');
    const errors: unknown[] = [];
    cy.get('#row135-stage').then($stage => {
      for (const name of ['Left', 'Right']) {
        const content = (
          <IdPrefixProvider value="same-">
            <Probe name={name} />
          </IdPrefixProvider>
        );
        const container = $stage[0].ownerDocument.createElement('div');
        container.dataset.externalRoot = 'true';
        container.innerHTML = renderToString(content, { identifierPrefix: `${name}-` });
        $stage[0].appendChild(container);
        roots.push(
          hydrateRoot(container, content, {
            identifierPrefix: `${name}-`,
            onRecoverableError: error => errors.push(error),
          }),
        );
      }
    });
    probe('Left').find('input').type('left');
    probe('Right').find('label').realClick();
    probe('Right').find('input').should('have.focus').and('have.value', '');
    probe('Left').find('input').should('have.value', 'left');
    cy.then(() => expect(errors).to.deep.equal([]));
    cy.get('@hydrationConsole').should('not.have.been.called');
  });

  for (const value of ['consumer-', 'consumer:[]', '\u03b4-']) {
    scenario(3, `real Fluent Field and Input associate generated IDs under ${JSON.stringify(value)}`, () => {
      mountStage(
        <IdPrefixProvider value={value}>
          <FluentProvider theme={webLightTheme}>
            <Field label="Fluent name" hint="Fluent hint">
              <Input />
            </Field>
          </FluentProvider>
        </IdPrefixProvider>,
      );
      cy.get('#row135-stage label').realClick();
      cy.get('#row135-stage input')
        .should('have.focus')
        .then($input => {
          expect($input[0].id.startsWith(value)).to.equal(true);
          expect(computeAccessibleName($input[0])).to.equal('Fluent name');
          expect(computeAccessibleDescription($input[0])).to.equal('Fluent hint');
        });
    });
  }

  scenario(3, 'native hook removes colons only from the React-generated portion', () => {
    mountStage(
      <IdPrefixProvider value="scope:">
        <Probe name="Name" prefix="local:" />
      </IdPrefixProvider>,
    );
    probe().should($probe => {
      const id = $probe.attr('data-generated')!;
      expect(id.startsWith('scope:local:')).to.equal(true);
      expect(id.slice('scope:local:'.length)).not.to.contain(':');
    });
  });

  scenario(3, 'IDREF validator rejects a detached duplicate-ID negative control', () => {
    mountStage(<Probe name="Name" />);
    cy.get('#row135-stage').then($stage => {
      const copy = $stage[0].cloneNode(true) as HTMLElement;
      copy.appendChild(copy.querySelector('input')!.cloneNode(true));
      expect(() => assertReferences(copy)).to.throw('no duplicate owned DOM IDs');
      expect(copy.isConnected).to.equal(false);
    });
  });

  scenario(3, 'IDREF validator rejects a detached unresolved-reference negative control', () => {
    mountStage(<Probe name="Name" />);
    cy.get('#row135-stage').then($stage => {
      const copy = $stage[0].cloneNode(true) as HTMLElement;
      copy.querySelector('input')!.setAttribute('aria-describedby', 'missing-row135-target');
      expect(() => assertReferences(copy)).to.throw('resolves exactly once');
      expect(copy.isConnected).to.equal(false);
    });
  });
});
