import * as React from 'react';
import * as axe from 'axe-core';
import { mount } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  PortalMountNodeProvider,
  createDOMRenderer,
  RendererProvider,
  useFluent as useFluent_unstable,
} from '@fluentui/react-components';
import { Provider as DocumentProvider } from '../../../../../../react-shared-contexts/library/src/ProviderContext';
import { elementContains } from '../../../../../../react-utilities/src/virtualParent/elementContains';
import { getParent } from '../../../../../../react-utilities/src/virtualParent/getParent';
import { hydrateRoot } from 'react-dom/client';
import { Portal } from '../Portal';
import type { PortalProps } from '../Portal.types';
import { usePortalMountNode } from '../usePortalMountNode';
import { usePortal_unstable } from '../usePortal';
import { renderPortal_unstable } from '../renderPortal';
import { Default as PortalStory } from '../../../../../stories/src/Portal/PortalDefault.stories';
import { Default as MountPropsStory } from '../../../../../stories/src/toMountNodeProps/Default.stories';
import { ApplyStylesToPortals as ProviderPortalStory } from '../../../../../../react-provider/stories/src/Provider/FluentProviderApplyStylesToPortals.stories';

const round = Number(Cypress.env('coverageRound') || 5);
const evidencePath = Cypress.env('portalEvidencePath') || `src/components/Portal/reports/browser-${Date.now()}`;
const axeLedger: unknown[] = [];
const listenerCleanup: (() => void)[] = [];
afterEach(() => {
  listenerCleanup.splice(0).forEach(cleanup => cleanup());
});
const listen = (target: EventTarget, type: string, listener: EventListener) => {
  target.addEventListener(type, listener);
  listenerCleanup.push(() => target.removeEventListener(type, listener));
};
const recordAudit = (report: unknown) => {
  axeLedger.push(report);
  return cy.writeFile(`${evidencePath}/axe-ledger.json`, axeLedger, { log: false });
};
const portalRoot = () => cy.get('#portal-content').parent();
const mountFluent = (children: React.ReactElement) =>
  mount(<FluentProvider theme={webLightTheme}>{children}</FluentProvider>);
const audit = (selector: string, phase: string) =>
  cy
    .get(selector)
    .should('be.visible')
    .then($el =>
      cy
        .then(() => axe.run($el[0]))
        .then(result =>
          recordAudit({
            result,
            scenario: Cypress.currentTest.title,
            phase,
            scope: selector,
            passes: result.passes.map(rule => rule.id),
            violations: result.violations,
            incomplete: result.incomplete,
          }).then(() => {
            expect(result.passes.length, 'nonempty axe pass set').to.be.greaterThan(0);
            expect(result.violations, 'strict scoped axe violations').to.deep.equal([]);
            expect(result.incomplete, 'strict scoped axe incomplete findings').to.deep.equal([]);
          }),
        ),
    );

const Content = ({ text = 'Portal action' }: { text?: string }) => (
  <section id="portal-content" aria-label="Portal tools" style={{ background: 'white', color: 'black', padding: 16 }}>
    <button id="portal-button">{text}</button>
  </section>
);

const Lifecycle = ({ initial = true, empty = false }: { initial?: boolean; empty?: boolean }) => {
  const [open, setOpen] = React.useState(initial);
  const [revision, setRevision] = React.useState(0);
  return (
    <div id="logical-parent" style={{ marginTop: 220 }}>
      <button id="toggle" onClick={() => setOpen(value => !value)}>
        Toggle portal
      </button>
      <button id="update" onClick={() => setRevision(value => value + 1)}>
        Update children
      </button>
      {open && <Portal>{empty ? null : <Content text={`Revision ${revision}`} />}</Portal>}
    </div>
  );
};

const Custom = ({ object = false, inside = false }: { object?: boolean; inside?: boolean }) => {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(true);
  const child = open ? (
    <Portal mountNode={object ? { element: node, className: 'ignored-custom-class' } : node}>
      <Content />
    </Portal>
  ) : null;
  return (
    <div id="logical-parent" style={{ marginTop: 220 }}>
      <button id="toggle" onClick={() => setOpen(value => !value)}>
        Toggle portal
      </button>
      <div id="custom-host" ref={setNode} className="consumer-host" dir="rtl" style={{ zIndex: 7 }}>
        <p id="preserved">Consumer sibling</p>
        {inside && child}
      </div>
      {!inside && child}
    </div>
  );
};

const MountSwitch = () => {
  const [a, setA] = React.useState<HTMLDivElement | null>(null);
  const [b, setB] = React.useState<HTMLDivElement | null>(null);
  const [destination, setDestination] = React.useState(0);
  const [open, setOpen] = React.useState(true);
  const targets = [undefined, a, b];
  return (
    <div id="logical-parent" style={{ marginTop: 220 }}>
      <button id="next-target" onClick={() => setDestination(value => (value + 1) % 3)}>
        Next target
      </button>
      <button id="toggle" onClick={() => setOpen(value => !value)}>
        Toggle portal
      </button>
      <div id="host-a" ref={setA}>
        <p>Host A sibling</p>
      </div>
      <div id="host-b" ref={setB}>
        <p>Host B sibling</p>
      </div>
      {open && (
        <Portal mountNode={targets[destination]}>
          <Content />
        </Portal>
      )}
    </div>
  );
};

const Interaction = ({ stop = false }: { stop?: boolean }) => {
  const [clicks, setClicks] = React.useState(0);
  const [keys, setKeys] = React.useState('');
  const [open, setOpen] = React.useState(false);
  return (
    <div
      id="logical-parent"
      style={{ marginTop: 220 }}
      onClick={() => setClicks(value => value + 1)}
      onKeyDown={event => setKeys(event.key)}
    >
      <button id="opener" onClick={() => setOpen(value => !value)}>
        Toggle tools
      </button>
      <output id="clicks" aria-label="React clicks">
        {clicks}
      </output>
      <output id="keys" aria-label="Last key">
        {keys}
      </output>
      {open && (
        <Portal>
          <section
            id="portal-content"
            aria-label="Interaction tools"
            style={{ padding: 16, background: 'white', color: 'black' }}
          >
            <button
              id="portal-button"
              onClick={event => {
                if (stop) {
                  event.stopPropagation();
                }
              }}
            >
              Portal action
            </button>
            <label htmlFor="portal-input">Search</label>
            <input id="portal-input" />
          </section>
        </Portal>
      )}
    </div>
  );
};

const FrameFixture = ({ explicit = false }: { explicit?: boolean }) => {
  const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null);
  const doc = frame?.contentDocument ?? undefined;
  const renderer = React.useMemo(() => createDOMRenderer(doc), [doc]);
  const [clicks, setClicks] = React.useState(0);
  return (
    <div id="frame-fixture">
      <iframe id="frame" title="Portal embedded tools" ref={setFrame} style={{ width: 600, height: 180 }} />
      <output id="frame-clicks" aria-label="Frame clicks">
        {clicks}
      </output>
      {doc && (
        <RendererProvider renderer={renderer} targetDocument={doc}>
          <FluentProvider theme={webLightTheme} targetDocument={doc} dir="rtl">
            <Portal mountNode={explicit ? doc.body : undefined}>
              <section
                id="frame-content"
                aria-label="Embedded portal tools"
                style={{ background: 'white', color: 'black', padding: 16 }}
              >
                <button id="frame-button" onClick={() => setClicks(value => value + 1)}>
                  Embedded action
                </button>
              </section>
            </Portal>
          </FluentProvider>
        </RendererProvider>
      )}
    </div>
  );
};
const frameContent = () => cy.get<HTMLIFrameElement>('#frame').its('0.contentDocument.body').find('#frame-content');
const frameClick = () =>
  frameContent()
    .find('button')
    .then($button => {
      const rect = $button[0].getBoundingClientRect();
      cy.get('#frame').realClick({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    });
const frameAudit = () =>
  frameContent().then($content => {
    const win = $content[0].ownerDocument.defaultView! as unknown as Window & {
      axe: typeof axe;
      eval: (source: string) => void;
    };
    return cy
      .readFile<string>(`${Cypress.config('projectRoot')}/../../../../node_modules/axe-core/axe.min.js`, { log: false })
      .then(source => {
        win.eval(source);
      })
      .then(() => win.axe.run($content[0]))
      .then(result =>
        recordAudit({
          result,
          scenario: Cypress.currentTest.title,
          phase: 'frame content',
          scope: '#frame::#frame-content',
          passes: result.passes.map(rule => rule.id),
          violations: result.violations,
          incomplete: result.incomplete,
        }).then(() => {
          expect(result.passes.length).to.be.greaterThan(0);
          expect(result.violations).to.deep.equal([]);
          expect(result.incomplete).to.deep.equal([]);
        }),
      );
  });

describe('ONLY126 Portal round 1: documented and unit-derived contracts', () => {
  it('R1.01 default body mount is a styled DIV with a hidden anchor and sentinel', () => {
    mountFluent(
      <div id="logical-parent">
        <Portal>
          <Content />
        </Portal>
      </div>,
    );
    portalRoot()
      .should('have.attr', 'data-portal-node', 'true')
      .and('have.attr', 'dir', 'ltr')
      .and('have.css', 'position', 'absolute')
      .and('have.css', 'z-index', '1000000')
      .then($root => {
        expect($root[0].tagName).to.equal('DIV');
        expect($root[0].parentElement).to.equal($root[0].ownerDocument.body);
        expect($root[0].lastElementChild?.tagName).to.equal('SPAN');
        expect($root[0].lastElementChild?.hasAttribute('hidden')).to.equal(true);
      });
    cy.get('#logical-parent > span').should('not.be.visible').and('be.empty').and('have.attr', 'hidden');
    cy.get('#portal-button').realClick().should('be.focused');
    audit('#portal-content', 'default focused content');
  });

  it('R1.02 actual stable Portal story toggles custom content outside the clipping parent', () => {
    mountFluent(<PortalStory />);
    cy.contains('button', 'Toggle portal').realClick().should('have.attr', 'aria-pressed', 'true');
    cy.contains('div', 'Portal content').should($el => {
      expect($el[0].parentElement?.querySelector('span[hidden]')).not.to.equal(null);
      expect($el[0].closest('div')?.parentElement?.textContent).not.to.contain('Clipping parent container');
    });
    cy.contains('code', '"open": true').should('exist');
    cy.contains('button', 'Toggle portal').realClick().should('have.attr', 'aria-pressed', 'false');
    cy.contains('div', 'Portal content').should('not.exist');
  });

  it('R1.03 actual normalization story adds a generated class overriding default zIndex', () => {
    mountFluent(
      <div style={{ marginTop: 220 }}>
        <MountPropsStory />
      </div>,
    );
    cy.contains('button', 'Toggle message').realClick();
    cy.contains('div', 'This message is rendered in a custom mount node')
      .parent()
      .should('have.attr', 'data-portal-node', 'true')
      .and('have.css', 'z-index', '1');
    cy.contains('button', 'Toggle message').realClick();
    cy.get('[data-portal-node]').should('not.exist');
  });

  [undefined, null, {}, { element: null }].forEach((mountNode, index) => {
    it(`R1.0${index + 4} absent/null/object mount variant ${index} falls back to body`, () => {
      mountFluent(
        <Portal mountNode={mountNode}>
          <Content />
        </Portal>,
      );
      portalRoot()
        .should('have.attr', 'data-portal-node', 'true')
        .then($node => expect($node[0].parentElement).to.equal($node[0].ownerDocument.body));
    });
  });

  it('R1.08 object className reaches only the generated mount wrapper', () => {
    mountFluent(
      <Portal mountNode={{ className: 'custom-portal another-class' }}>
        <Content />
      </Portal>,
    );
    portalRoot().should('have.class', 'custom-portal').and('have.class', 'another-class');
    cy.get('#portal-content').should('not.have.class', 'custom-portal');
  });

  [false, true].forEach(object => {
    it(`R1.${object ? '10' : '09'} explicit ${
      object ? 'object' : 'element'
    } mount is used without styling or an extra wrapper`, () => {
      mountFluent(<Custom object={object} />);
      portalRoot()
        .should('have.id', 'custom-host')
        .and('have.class', 'consumer-host')
        .and('have.attr', 'dir', 'rtl')
        .and('have.css', 'z-index', '7')
        .and('not.have.class', 'ignored-custom-class')
        .and('not.have.attr', 'data-portal-node');
      cy.get('[data-portal-node]').should('not.exist');
      audit('#custom-host', 'custom mount including consumer sibling');
      cy.get('#toggle').realClick();
      cy.get('#portal-content').should('not.exist');
      cy.get('#custom-host').should('exist');
      cy.get('#preserved').should('have.text', 'Consumer sibling');
    });
  });

  it('R1.11 mount containing the virtual anchor preserves physical parent instead of introducing a cycle', () => {
    mountFluent(<Custom inside />);
    cy.get('#custom-host').should($host => {
      expect((getParent($host[0]) as HTMLElement)?.id).to.equal('logical-parent');
      expect($host[0].querySelectorAll(':scope > span[hidden]').length).to.equal(2);
      expect(elementContains($host[0], $host[0].querySelector('#portal-button')!)).to.equal(true);
    });
  });

  it('R1.12 internal PortalMountNodeProvider creates an owned DIV beneath its target', () => {
    const Fixture = () => {
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="context-host" ref={setNode} />
          {node && (
            <PortalMountNodeProvider value={node}>
              <Portal>
                <Content />
              </Portal>
            </PortalMountNodeProvider>
          )}
        </>
      );
    };
    mountFluent(<Fixture />);
    portalRoot().parent().should('have.id', 'context-host');
    portalRoot().should('have.attr', 'data-portal-node', 'true');
  });

  it('R1.13 explicit mount wins over provider context target', () => {
    const Fixture = () => {
      const [context, setContext] = React.useState<HTMLDivElement | null>(null);
      const [explicit, setExplicit] = React.useState<HTMLDivElement | null>(null);
      return (
        <>
          <div id="context-host" ref={setContext} />
          <div id="explicit-host" ref={setExplicit} />
          {context && explicit && (
            <PortalMountNodeProvider value={context}>
              <Portal mountNode={explicit}>
                <Content />
              </Portal>
            </PortalMountNodeProvider>
          )}
        </>
      );
    };
    mountFluent(<Fixture />);
    portalRoot().should('have.id', 'explicit-host');
    cy.get('#context-host').should('be.empty');
    cy.get('[data-portal-node]').should('not.exist');
  });

  it('R1.14 unmount removes owned content and wrapper and reopening allocates a fresh node', () => {
    let previous: HTMLElement;
    mountFluent(<Lifecycle />);
    portalRoot().then($root => {
      previous = $root[0];
    });
    cy.get('#toggle').realClick();
    cy.get('[data-portal-node]').should('not.exist');
    cy.get('#logical-parent > span').should('not.exist');
    cy.then(() => expect(previous.isConnected).to.equal(false));
    cy.get('#toggle').realClick();
    portalRoot().then($root => {
      expect($root[0]).not.to.equal(previous);
    });
    cy.get('[data-portal-node]').should('have.length', 1);
  });

  it('R1.15 child updates preserve owned wrapper identity without accumulating sentinels', () => {
    let previous: HTMLElement;
    mountFluent(<Lifecycle />);
    portalRoot().then($root => {
      previous = $root[0];
    });
    cy.get('#update').realClick().realClick();
    cy.get('#portal-button').should('have.text', 'Revision 2');
    portalRoot().then($root => {
      expect($root[0]).to.equal(previous);
      expect($root[0].querySelectorAll(':scope > span[hidden]').length).to.equal(1);
    });
  });

  it('R1.16 empty children retain hidden sentinel and clean up on unmount under StrictMode', () => {
    mountFluent(<Lifecycle empty />);
    cy.get('[data-portal-node]')
      .should('have.length', 1)
      .children()
      .should('have.length', 1)
      .and('not.be.visible')
      .and('have.attr', 'hidden');
    cy.get('#toggle').realClick();
    cy.get('[data-portal-node]').should('not.exist');
  });

  it('R1.17 standalone Portal needs no provider for basic rendering', () => {
    mount(
      <Portal>
        <Content />
      </Portal>,
    );
    portalRoot().should('have.attr', 'dir', 'ltr');
    cy.get('#portal-button').realClick().should('be.focused');
    audit('#portal-content', 'standalone content');
  });

  it('R1.18 direction and theme updates propagate on the same generated mount', () => {
    const DirectionScope = ({ isolatedDirection }: { isolatedDirection: 'ltr' | 'rtl' | undefined }) => {
      const parent = useFluent_unstable();
      return (
        <DocumentProvider value={isolatedDirection === undefined ? parent : { ...parent, dir: isolatedDirection }}>
          <Portal>
            <Content />
          </Portal>
        </DocumentProvider>
      );
    };
    const Fixture = () => {
      const [dark, setDark] = React.useState(false);
      const [direction, setDirection] = React.useState<'ltr' | 'rtl'>('ltr');
      return (
        <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={dark ? 'rtl' : 'ltr'}>
          <button
            id="change-direction"
            dir={direction}
            onClick={() => setDirection(value => (value === 'ltr' ? 'rtl' : 'ltr'))}
          >
            Change direction only
          </button>
          <button id="change-theme" style={{ marginTop: 220 }} onClick={() => setDark(value => !value)}>
            Change theme
          </button>
          {/* Isolate pure flips, then forward the actual FluentProvider context for the original integration check. */}
          <DirectionScope isolatedDirection={dark ? undefined : direction} />
        </FluentProvider>
      );
    };
    let node: HTMLElement;
    let className: string;
    mount(<Fixture />);
    portalRoot().then($root => {
      node = $root[0];
      className = node.className;
      expect(getComputedStyle(node).getPropertyValue('--colorNeutralForeground1').trim()).to.equal(
        webLightTheme.colorNeutralForeground1,
      );
    });
    (['rtl', 'ltr'] as const).forEach(direction => {
      cy.get('#change-direction').realClick();
      cy.get('#change-direction').should('have.attr', 'dir', direction);
      cy.get('#change-direction').parent().should('have.attr', 'dir', 'ltr');
      portalRoot()
        .should('have.attr', 'dir', direction)
        .should($root => {
          expect($root[0], 'direction-only update retains the generated mount').to.equal(node);
          expect($root[0].className, 'direction-only update retains all mount classes').to.equal(className);
          expect(getComputedStyle($root[0]).getPropertyValue('--colorNeutralForeground1').trim()).to.equal(
            webLightTheme.colorNeutralForeground1,
          );
        });
      cy.get('#portal-content').should('have.css', 'direction', direction);
    });
    cy.get('#change-theme').realClick();
    portalRoot()
      .should('have.attr', 'dir', 'rtl')
      .should($root => {
        expect($root[0]).to.equal(node);
        expect(getComputedStyle(node).getPropertyValue('--colorNeutralForeground1').trim()).to.equal(
          webDarkTheme.colorNeutralForeground1,
        );
      });
    audit('#portal-content', 'updated RTL content');
  });

  [true, false].forEach(apply => {
    it(`R1.${apply ? '19' : '20'} applyStylesToPortals=${apply} ${
      apply ? 'copies' : 'excludes'
    } provider classes but preserves theme variables`, () => {
      mount(
        <FluentProvider theme={webLightTheme} className="consumer-provider" applyStylesToPortals={apply}>
          <Portal>
            <Content />
          </Portal>
        </FluentProvider>,
      );
      portalRoot()
        .should(apply ? 'have.class' : 'not.have.class', 'consumer-provider')
        .should($root =>
          expect(getComputedStyle($root[0]).getPropertyValue('--colorNeutralForeground1').trim()).to.equal(
            webLightTheme.colorNeutralForeground1,
          ),
        );
    });
  });
});

if (round >= 2) {
  describe('ONLY126 Portal round 2: browser boundaries and interaction', () => {
    it('R2.01 virtual containment links a detached DOM hierarchy to its logical ancestor', () => {
      mountFluent(
        <div id="logical-parent">
          <Portal>
            <Content />
          </Portal>
        </div>,
      );
      cy.get('#logical-parent').then($parent =>
        portalRoot().should($root => {
          expect($parent[0].contains($root[0])).to.equal(false);
          expect(elementContains($parent[0], $root[0])).to.equal(true);
          expect(getParent($root[0])).to.equal($parent[0].querySelector('span[hidden]'));
          expect(elementContains($root[0], $parent[0])).to.equal(false);
        }),
      );
    });

    it('R2.02 nested portals preserve transitive virtual containment and native DOM separation', () => {
      mountFluent(
        <div id="logical-parent">
          <Portal>
            <section id="outer" aria-label="Outer tools">
              <button id="outer-button">Outer action</button>
              <Portal>
                <Content />
              </Portal>
            </section>
          </Portal>
        </div>,
      );
      cy.get('[data-portal-node]').should('have.length', 2);
      cy.get('#outer').then($outer =>
        cy.get('#portal-button').should($inner => {
          expect($outer[0].contains($inner[0])).to.equal(false);
          expect(elementContains($outer[0], $inner[0])).to.equal(true);
          expect(elementContains($inner[0], $outer[0])).to.equal(false);
        }),
      );
      cy.get('#portal-button').realClick().should('be.focused');
      audit('#portal-content', 'nested action');
    });

    it('R2.03 virtual parent is cleared on custom host after unmount', () => {
      mountFluent(<Custom />);
      cy.get('#custom-host').should($host => expect((getParent($host[0]) as HTMLElement)?.tagName).to.equal('SPAN'));
      cy.get('#toggle').realClick();
      cy.get('#custom-host').should($host =>
        expect((getParent($host[0]) as HTMLElement)?.id).to.equal('logical-parent'),
      );
    });

    it('R2.04 React click bubbles through the logical tree, native click follows the physical tree', () => {
      const nativeParent = cy.stub().as('nativeParent');
      const nativeBody = cy.stub().as('nativeBody');
      mountFluent(<Interaction />);
      cy.get('#opener').realClick();
      cy.get('#logical-parent').then($parent => $parent[0].addEventListener('click', nativeParent));
      cy.document().then(doc => listen(doc.body, 'click', nativeBody));
      cy.get('#portal-button').realClick().should('be.focused');
      cy.get('#clicks').should('have.text', '2');
      cy.get('@nativeParent').should('not.have.been.called');
      cy.get('@nativeBody').should('have.been.calledOnce');
    });

    it('R2.05 stopPropagation in portal children prevents logical ancestor click', () => {
      mountFluent(<Interaction stop />);
      cy.get('#opener').realClick();
      cy.get('#portal-button').realClick();
      cy.get('#clicks').should('have.text', '1');
    });

    it('R2.06 native input typing and keyboard events cross the React portal boundary', () => {
      mountFluent(<Interaction />);
      cy.get('#opener').realClick();
      cy.get('#portal-input').realClick().realType('portal');
      cy.get('#portal-input').should('have.value', 'portal');
      cy.get('#keys').should('have.text', 'l');
      cy.realPress('Escape');
      cy.get('#keys').should('have.text', 'Escape');
      cy.get('#portal-content').should('be.visible');
      audit('#portal-content', 'typed field; Escape is not a dismissal API');
    });

    it('R2.07 Portal does not autofocus, trap focus, or restore focus automatically', () => {
      mountFluent(<Interaction />);
      cy.get('#opener').realClick().should('be.focused');
      cy.realPress('Tab');
      cy.get('#portal-button').should('be.focused');
      cy.realPress('Tab');
      cy.get('#portal-input').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#portal-button').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#opener').should('be.focused');
      cy.get('#opener').realClick();
      cy.get('#portal-content').should('not.exist');
      cy.get('#opener').should('be.focused');
    });

    it('R2.08 removing a focused child does not implement focus restoration', () => {
      const Fixture = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <>
            <button id="opener" style={{ marginTop: 220 }} onClick={() => setOpen(true)}>
              Open
            </button>
            {open && (
              <Portal>
                <button id="close" onClick={() => setOpen(false)}>
                  Close
                </button>
              </Portal>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#opener').realClick();
      cy.get('#close').realClick();
      cy.get('#close').should('not.exist');
      cy.get('#opener').should('not.be.focused');
      cy.document().should(doc => expect(doc.activeElement).to.equal(doc.body));
    });

    it('R2.09 arbitrary React context and children refs survive rendering outside their logical ancestor', () => {
      const Context = React.createContext<string | undefined>(undefined);
      const ref = React.createRef<HTMLButtonElement>();
      const Consumer = () => (
        <button id="context-button" ref={ref}>
          {React.useContext(Context)}
        </button>
      );
      mountFluent(
        <Context.Provider value="Context crosses portal">
          <Portal>
            <Consumer />
          </Portal>
        </Context.Provider>,
      );
      cy.get('#context-button')
        .should('have.text', 'Context crosses portal')
        .then($button => expect(ref.current).to.equal($button[0]));
      cy.get('#context-button').realClick().should('be.focused');
    });

    it('R2.10 child callback ref is cleared when portal unmounts', () => {
      const ref = cy.stub().as('childRef');
      const Fixture = () => {
        const [open, setOpen] = React.useState(true);
        return (
          <>
            <button id="toggle" style={{ marginTop: 220 }} onClick={() => setOpen(value => !value)}>
              Toggle
            </button>
            {open && (
              <Portal>
                <button id="ref-button" ref={ref}>
                  Ref action
                </button>
              </Portal>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#ref-button').then($button => expect(ref.lastCall.args[0]).to.equal($button[0]));
      cy.get('#toggle').realClick();
      cy.get('@childRef').should('have.been.calledWith', null);
      cy.then(() => expect(ref.lastCall.args[0]).to.equal(null));
    });

    it('R2.11 moving fallback to custom A removes owned wrapper and uses A directly', () => {
      let fallback: HTMLElement;
      mountFluent(<MountSwitch />);
      portalRoot().then($root => {
        fallback = $root[0];
      });
      cy.get('#next-target').realClick();
      portalRoot().should('have.id', 'host-a');
      cy.get('[data-portal-node]').should('not.exist');
      cy.then(() => expect(fallback.isConnected).to.equal(false));
    });

    it('R2.12 moving custom A to B clears old virtual parent and preserves sibling DOM', () => {
      mountFluent(<MountSwitch />);
      cy.get('#next-target').realClick().realClick();
      portalRoot().should('have.id', 'host-b');
      cy.get('#host-a')
        .should('have.text', 'Host A sibling')
        .should($node => expect((getParent($node[0]) as HTMLElement)?.id).to.equal('logical-parent'));
      cy.get('#host-b > span[hidden]').should('have.length', 1);
      cy.get('#toggle').realClick();
      cy.get('#host-b').should('have.text', 'Host B sibling');
    });

    it('R2.13 returning from custom B to fallback allocates exactly one owned body node', () => {
      mountFluent(<MountSwitch />);
      cy.get('#next-target').realClick().realClick().realClick();
      portalRoot()
        .should('have.attr', 'data-portal-node', 'true')
        .then($root => expect($root[0].parentElement).to.equal($root[0].ownerDocument.body));
      cy.get('[data-portal-node]').should('have.length', 1);
      cy.get('#host-a').should('have.text', 'Host A sibling');
      cy.get('#host-b').should('have.text', 'Host B sibling');
    });

    it('R2.14 replacing generated class removes stale class while retaining unrelated consumer class', () => {
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="update-class" style={{ marginTop: 220 }} onClick={() => setUpdated(true)}>
              Update class
            </button>
            <Portal mountNode={{ className: updated ? 'class-b' : 'class-a' }}>
              <Content />
            </Portal>
          </>
        );
      };
      let original: HTMLElement;
      mountFluent(<Fixture />);
      portalRoot().then($root => {
        original = $root[0];
        original.classList.add('external-class');
      });
      cy.get('#update-class').realClick();
      portalRoot()
        .should('have.class', 'class-b')
        .and('not.have.class', 'class-a')
        .and('have.class', 'external-class')
        .then($root => expect($root[0]).to.equal(original));
    });

    it('R2.15 multiple portal DOM order follows creation order rather than later logical keyed reorder', () => {
      const Fixture = () => {
        const [reverse, setReverse] = React.useState(false);
        return (
          <>
            <button id="reorder" style={{ marginTop: 220 }} onClick={() => setReverse(true)}>
              Reorder
            </button>
            <div id="logical-parent">
              {(reverse ? ['b', 'a'] : ['a', 'b']).map(id => (
                <Portal key={id}>
                  <button data-order={id}>{id}</button>
                </Portal>
              ))}
            </div>
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('[data-order]').should($buttons =>
        expect([...$buttons].map(button => button.dataset.order)).to.deep.equal(['a', 'b']),
      );
      cy.get('#reorder').realClick();
      cy.get('[data-order]').should($buttons =>
        expect([...$buttons].map(button => button.dataset.order)).to.deep.equal(['a', 'b']),
      );
      cy.get('#logical-parent > span[hidden]').should('have.length', 2);
    });

    it('R2.16 nested providers supply nearest RTL override and merge partial theme into portals', () => {
      mount(
        <FluentProvider theme={webLightTheme} dir="ltr">
          <FluentProvider theme={{ colorBrandBackground2: '#fa8072' }} dir="rtl">
            <Portal>
              <Content />
            </Portal>
          </FluentProvider>
        </FluentProvider>,
      );
      portalRoot()
        .should('have.attr', 'dir', 'rtl')
        .should($root => {
          const style = getComputedStyle($root[0]);
          expect(style.getPropertyValue('--colorBrandBackground2').trim()).to.equal('#fa8072');
          expect(style.getPropertyValue('--colorNeutralForeground1').trim()).to.equal(
            webLightTheme.colorNeutralForeground1,
          );
          expect(style.direction).to.equal('rtl');
        });
      audit('#portal-content', 'nested provider partial theme');
    });

    it('R2.17 Portal does not copy arbitrary provider attributes such as lang or aria-label', () => {
      mount(
        <FluentProvider theme={webLightTheme} lang="ar" aria-label="Logical provider" dir="rtl">
          <Portal>
            <Content />
          </Portal>
        </FluentProvider>,
      );
      portalRoot().should($root => {
        expect($root[0].getAttribute('dir')).to.equal('rtl');
        expect($root[0].hasAttribute('lang')).to.equal(false);
        expect($root[0].hasAttribute('aria-label')).to.equal(false);
      });
    });

    it('R2.18 content escapes actual overflow clipping and retains child inline styling', () => {
      mountFluent(
        <div id="clip" style={{ overflow: 'hidden', width: 40, height: 40, marginTop: 220 }}>
          <Portal>
            <section
              id="portal-content"
              aria-label="Unclipped tools"
              style={{
                position: 'fixed',
                top: 60,
                left: 300,
                width: 200,
                height: 80,
                background: 'white',
                color: 'black',
              }}
            >
              <button id="portal-button">Unclipped action</button>
            </section>
          </Portal>
        </div>,
      );
      cy.get('#portal-content').should('be.visible').and('have.css', 'left', '300px');
      cy.get('#portal-button').realClick().should('be.focused');
      cy.get('#clip').should($clip => expect($clip[0].querySelector('#portal-content')).to.equal(null));
      audit('#portal-content', 'unclipped content');
    });

    [false, true].forEach(explicit => {
      it(`R2.${explicit ? '20' : '19'} same-origin iframe ${
        explicit ? 'explicit body mount' : 'targetDocument fallback'
      } uses the correct realm and receives real clicks`, () => {
        mountFluent(<FrameFixture explicit={explicit} />);
        frameContent()
          .parent()
          .should($root => {
            const doc = $root[0].ownerDocument;
            expect(doc).not.to.equal(document);
            expect($root[0].getAttribute('data-portal-node')).to.equal(explicit ? null : 'true');
            expect(explicit ? $root[0] : $root[0].parentElement).to.equal(doc.body);
            if (!explicit) {
              expect($root[0].getAttribute('dir')).to.equal('rtl');
              expect(doc.defaultView!.getComputedStyle($root[0]).zIndex).to.equal('1000000');
              expect(
                doc.defaultView!.getComputedStyle($root[0]).getPropertyValue('--colorNeutralForeground1').trim(),
              ).to.equal(webLightTheme.colorNeutralForeground1);
            }
          });
        frameClick();
        cy.get('#frame-clicks').should('have.text', '1');
        frameContent()
          .find('button')
          .should($button => expect($button[0].ownerDocument.activeElement).to.equal($button[0]));
        frameAudit();
      });
    });
  });
}

if (round >= 5) {
  describe('ONLY126 Portal round 5: source-grounded adversarial integration', () => {
    it('R5.01 removing a generated custom class preserves identity, data marker, direction and geometry', () => {
      const Fixture = () => {
        const [custom, setCustom] = React.useState(true);
        return (
          <>
            <button id="remove-class" style={{ marginTop: 220 }} onClick={() => setCustom(false)}>
              Remove class
            </button>
            <Portal mountNode={custom ? { className: 'custom-a custom-b' } : {}}>
              <Content />
            </Portal>
          </>
        );
      };
      let original: HTMLElement;
      mountFluent(<Fixture />);
      portalRoot().then($node => {
        original = $node[0];
      });
      cy.get('#remove-class').realClick();
      portalRoot()
        .should('not.have.class', 'custom-a')
        .and('not.have.class', 'custom-b')
        .and('have.attr', 'data-portal-node', 'true')
        .and('have.attr', 'dir', 'ltr')
        .should($node => {
          expect($node[0]).to.equal(original);
          const style = original.ownerDocument.defaultView!.getComputedStyle(original);
          expect([style.top, style.left, style.right, style.position, style.zIndex]).to.deep.equal([
            '0px',
            '0px',
            '0px',
            'absolute',
            '1000000',
          ]);
        });
    });

    it('R5.02 consumer detaching a custom host retains content until unmount and restores physical parent afterward', () => {
      let host: HTMLElement;
      const Fixture = () => {
        const [node, setNode] = React.useState<HTMLDivElement | null>(null);
        const [open, setOpen] = React.useState(true);
        const parent = React.useRef<HTMLDivElement>(null);
        return (
          <>
            <div style={{ marginTop: 220 }}>
              <button id="detach" onClick={() => node!.remove()}>
                Detach host
              </button>
              <button id="reattach" onClick={() => parent.current!.appendChild(node!)}>
                Reattach host
              </button>
              <button id="close" onClick={() => setOpen(false)}>
                Close portal
              </button>
            </div>
            <div id="host-parent" ref={parent}>
              <div id="external-host" ref={setNode}>
                <p>Preserved sibling</p>
              </div>
            </div>
            {node && open && (
              <Portal mountNode={node}>
                <Content />
              </Portal>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#external-host').then($host => {
        host = $host[0];
      });
      cy.get('#detach').realClick();
      cy.then(() => {
        expect(host.isConnected).to.equal(false);
        expect(host.querySelector('#portal-button')).not.to.equal(null);
      });
      cy.get('#portal-button').should('not.exist');
      cy.get('#reattach').realClick();
      cy.get('#portal-button').realClick().should('be.focused');
      cy.get('#close').realClick();
      cy.get('#external-host')
        .should('have.text', 'Preserved sibling')
        .should($host => {
          expect(getParent($host[0])).to.equal(host.parentElement);
          expect(host.querySelector('span[hidden]')).to.equal(null);
        });
    });

    it('R5.03 closing a context-target portal removes only its owned DIV, not the consumer target or siblings', () => {
      const Fixture = () => {
        const [target, setTarget] = React.useState<HTMLDivElement | null>(null);
        const [open, setOpen] = React.useState(true);
        return (
          <>
            <button id="close" style={{ marginTop: 220 }} onClick={() => setOpen(false)}>
              Close
            </button>
            <div id="context-target" ref={setTarget}>
              <p id="sibling">Consumer sibling</p>
            </div>
            {target && open && (
              <PortalMountNodeProvider value={target}>
                <Portal>
                  <Content />
                </Portal>
              </PortalMountNodeProvider>
            )}
          </>
        );
      };
      let owned: HTMLElement;
      mountFluent(<Fixture />);
      portalRoot().then($root => {
        owned = $root[0];
      });
      cy.get('#close').realClick();
      cy.get('#context-target').should('have.html', '<p id="sibling">Consumer sibling</p>');
      cy.then(() => expect(owned.isConnected).to.equal(false));
    });

    it('R5.04 an explicit HTMLElement remains usable when provider targetDocument is absent', () => {
      const Fixture = () => {
        const [node, setNode] = React.useState<HTMLDivElement | null>(null);
        return (
          <>
            <div id="explicit-no-document" ref={setNode} />
            {node && (
              <DocumentProvider value={{ dir: 'rtl', targetDocument: undefined }}>
                <Portal mountNode={node}>
                  <Content />
                </Portal>
              </DocumentProvider>
            )}
          </>
        );
      };
      mount(<Fixture />);
      portalRoot().should('have.id', 'explicit-no-document').and('not.have.attr', 'dir');
      cy.get('[data-portal-node]').should('not.exist');
      cy.get('#portal-button').realClick().should('be.focused');
      audit('#portal-content', 'explicit mount without provider document');
    });

    it('R5.05 foreign context target allocates from its ownerDocument even with a main-document provider', () => {
      const Fixture = () => {
        const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null);
        return (
          <>
            <iframe id="context-frame" title="Foreign context destination" ref={setFrame} />
            {frame?.contentDocument && (
              <PortalMountNodeProvider value={frame.contentDocument.body}>
                <Portal>
                  <Content />
                </Portal>
              </PortalMountNodeProvider>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get<HTMLIFrameElement>('#context-frame')
        .its('0.contentDocument.body')
        .find('#portal-content')
        .parent()
        .should($root => {
          expect($root[0].parentElement).to.equal($root[0].ownerDocument.body);
          expect($root[0].getAttribute('data-portal-node')).to.equal('true');
          expect($root[0].getAttribute('dir')).to.equal('ltr');
        });
      cy.get('[data-portal-node]').should('not.exist');
    });

    it('R5.06 explicit destinations inherit consumer DOM CSS rather than logical provider CSS variables', () => {
      const Fixture = () => {
        const [node, setNode] = React.useState<HTMLDivElement | null>(null);
        return (
          <>
            <div
              id="consumer-css"
              ref={setNode}
              style={
                {
                  color: 'rgb(18, 52, 86)',
                  '--colorNeutralForeground1': 'consumer-token',
                } as React.CSSProperties
              }
            />
            {node && (
              <FluentProvider theme={webLightTheme}>
                <Portal mountNode={node}>
                  <button id="css-child" style={{ color: 'inherit' }}>
                    Consumer CSS
                  </button>
                </Portal>
              </FluentProvider>
            )}
          </>
        );
      };
      mount(<Fixture />);
      cy.get('#css-child')
        .should('have.css', 'color', 'rgb(18, 52, 86)')
        .should($child =>
          expect(
            $child[0].ownerDocument
              .defaultView!.getComputedStyle($child[0])
              .getPropertyValue('--colorNeutralForeground1')
              .trim(),
          ).to.equal('consumer-token'),
        );
      cy.get('#consumer-css').should('not.have.class', 'fui-FluentProvider');
    });

    it('R5.07 trusted native click and Enter preserve exact payload/counts through React logical and DOM physical trees', () => {
      const logicalClick = cy.stub();
      const logicalKey = cy.stub();
      const childClick = cy.stub();
      const nativeParent = cy.stub();
      const nativeBody = cy.stub();
      const nativeKey = cy.stub();
      mountFluent(
        <div id="logical-events" onClick={logicalClick} onKeyDown={logicalKey}>
          <Portal>
            <button id="event-child" onClick={childClick}>
              Event action
            </button>
          </Portal>
        </div>,
      );
      cy.get('#logical-events').then($parent => listen($parent[0], 'click', nativeParent));
      cy.document().then(doc => {
        listen(doc.body, 'click', nativeBody);
        listen(doc.body, 'keydown', nativeKey);
      });
      cy.get('#event-child').realClick().should('be.focused');
      cy.then(() => {
        expect(logicalClick.callCount).to.equal(1);
        expect(childClick.callCount).to.equal(1);
        expect(nativeBody.callCount).to.equal(1);
        expect(nativeParent.callCount).to.equal(0);
        const event = nativeBody.firstCall.args[0] as MouseEvent;
        expect(event.isTrusted).to.equal(true);
        expect(event.button).to.equal(0);
        expect(event.detail).to.equal(1);
        expect((event.target as HTMLElement).id).to.equal('event-child');
        expect(logicalClick.firstCall.args[0].nativeEvent).to.equal(event);
      });
      cy.realPress('Enter');
      cy.then(() => {
        expect(logicalKey.callCount).to.equal(1);
        expect(nativeKey.callCount).to.equal(1);
        const event = nativeKey.firstCall.args[0] as KeyboardEvent;
        expect([event.key, event.code, event.isTrusted]).to.deep.equal(['Enter', 'Enter', true]);
        expect(logicalKey.firstCall.args[0].nativeEvent).to.equal(event);
        expect(childClick.callCount).to.equal(2);
        expect(logicalClick.callCount).to.equal(2);
        expect(nativeBody.callCount).to.equal(2);
        expect(nativeBody.lastCall.args[0].detail).to.equal(0);
        expect(nativeParent.callCount).to.equal(0);
      });
    });

    it('R5.08 trusted iframe click reaches only the frame native document and still updates the main React tree', () => {
      const frameNative = cy.stub();
      const outerNative = cy.stub();
      mountFluent(<FrameFixture />);
      frameContent().then($content => listen($content[0].ownerDocument, 'click', frameNative));
      cy.document().then(doc => listen(doc.body, 'click', outerNative));
      frameClick();
      cy.get('#frame-clicks').should('have.text', '1');
      cy.then(() => {
        expect(frameNative.callCount).to.equal(1);
        expect(outerNative.callCount).to.equal(0);
        const event = frameNative.firstCall.args[0] as MouseEvent;
        expect([event.isTrusted, event.button, event.detail]).to.deep.equal([true, 0, 1]);
        expect((event.target as HTMLElement).id).to.equal('frame-button');
      });
    });

    it('R5.09 trusted shadow click is natively retargeted once and retains the real button in its composed path', () => {
      const events: { trusted: boolean; target: EventTarget | null; first: EventTarget }[] = [];
      const Fixture = () => {
        const [host, setHost] = React.useState<HTMLDivElement | null>(null);
        const [root, setRoot] = React.useState<ShadowRoot>();
        React.useEffect(() => {
          if (host) {
            setRoot(host.shadowRoot ?? host.attachShadow({ mode: 'open' }));
          }
        }, [host]);
        return (
          <>
            <div id="trusted-shadow" ref={setHost} />
            {root && (
              <PortalMountNodeProvider value={root}>
                <Portal>
                  <Content />
                </Portal>
              </PortalMountNodeProvider>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.document().then(doc =>
        listen(doc.body, 'click', event => {
          events.push({ trusted: event.isTrusted, target: event.target, first: event.composedPath()[0] });
        }),
      );
      cy.get('#trusted-shadow').shadow().find('#portal-button').realClick();
      cy.get('#trusted-shadow').then($host => {
        expect(events.length).to.equal(1);
        expect(events[0].trusted).to.equal(true);
        expect(events[0].target).to.equal($host[0]);
        expect(events[0].first).to.equal($host[0].shadowRoot!.querySelector('#portal-button'));
      });
    });

    it('R5.10 two portals sharing one explicit destination remove only their own children and sentinels', () => {
      const Fixture = () => {
        const [node, setNode] = React.useState<HTMLDivElement | null>(null);
        const [first, setFirst] = React.useState(true);
        const [second, setSecond] = React.useState(true);
        return (
          <>
            <button id="close-first" onClick={() => setFirst(false)}>
              Close first
            </button>
            <button id="close-second" onClick={() => setSecond(false)}>
              Close second
            </button>
            <div id="shared-host" ref={setNode}>
              <p>Consumer sibling</p>
            </div>
            {node && first && (
              <Portal mountNode={node}>
                <button id="first-child">First</button>
              </Portal>
            )}
            {node && second && (
              <Portal mountNode={node}>
                <button id="second-child">Second</button>
              </Portal>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#shared-host > span[hidden]').should('have.length', 2);
      cy.get('#close-first').realClick();
      cy.get('#first-child').should('not.exist');
      cy.get('#second-child').realClick().should('be.focused');
      cy.get('#shared-host > span[hidden]').should('have.length', 1);
      cy.get('#close-second').realClick();
      cy.get('#shared-host').should('have.html', '<p>Consumer sibling</p>');
    });

    it('R5.11 changing an explicit destination to null activates fallback and clears custom virtual linkage', () => {
      const Fixture = () => {
        const [node, setNode] = React.useState<HTMLDivElement | null>(null);
        const [fallback, setFallback] = React.useState(false);
        return (
          <div id="switch-parent" style={{ marginTop: 220 }}>
            <button id="null-target" onClick={() => setFallback(true)}>
              Use null
            </button>
            <div id="null-host" ref={setNode}>
              <p>Consumer sibling</p>
            </div>
            {node && (
              <Portal mountNode={fallback ? null : node}>
                <Content />
              </Portal>
            )}
          </div>
        );
      };
      mountFluent(<Fixture />);
      portalRoot().should('have.id', 'null-host');
      cy.get('#null-target').realClick();
      portalRoot()
        .should('have.attr', 'data-portal-node', 'true')
        .should($root => expect($root[0].parentElement).to.equal($root[0].ownerDocument.body));
      cy.get('#null-host')
        .should('have.text', 'Consumer sibling')
        .should($host => expect((getParent($host[0]) as HTMLElement).id).to.equal('switch-parent'));
    });

    it('R5.12 public unstable hook/render composition preserves the hidden anchor and renders modified state children', () => {
      const Composed = () => {
        const state = usePortal_unstable({ children: <Content /> });
        state.children = <button id="composed-child">Modified render state</button>;
        return renderPortal_unstable(state);
      };
      mountFluent(
        <div id="composed-parent">
          <Composed />
        </div>,
      );
      cy.get('#composed-parent').should('have.html', '<span hidden=""></span>');
      cy.get('#portal-content').should('not.exist');
      cy.get('#composed-child').should('have.text', 'Modified render state').realClick().should('be.focused');
      cy.get('#composed-child').parent().should('have.attr', 'data-portal-node', 'true');
    });
  });
}
if (round >= 2) {
  describe('ONLY126 Portal round 2 continued: shadow, SSR and state boundaries', () => {
    it('R2.21 ShadowRoot provider target receives owned portal; events and cleanup work across shadow boundary', () => {
      const Fixture = () => {
        const [host, setHost] = React.useState<HTMLDivElement | null>(null);
        const [root, setRoot] = React.useState<ShadowRoot>();
        const [open, setOpen] = React.useState(true);
        const [clicks, setClicks] = React.useState(0);
        React.useEffect(() => {
          if (host) {
            setRoot(host.shadowRoot ?? host.attachShadow({ mode: 'open' }));
          }
        }, [host]);
        return (
          <div onClick={() => setClicks(value => value + 1)}>
            <button id="toggle-shadow" onClick={() => setOpen(value => !value)}>
              Toggle shadow
            </button>
            <output id="shadow-clicks" aria-label="Shadow clicks">
              {clicks}
            </output>
            <div id="shadow-host" ref={setHost} />
            {root && open && (
              <PortalMountNodeProvider value={root}>
                <Portal>
                  <Content />
                </Portal>
              </PortalMountNodeProvider>
            )}
          </div>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#shadow-host').shadow().find('[data-portal-node]').should('have.attr', 'dir', 'ltr');
      cy.get('#shadow-host').shadow().find('#portal-button').realClick();
      cy.get('#shadow-clicks').should('have.text', '2');
      cy.get('#shadow-host').then($host => {
        const button = $host[0].shadowRoot!.querySelector('button');
        expect($host[0].shadowRoot!.activeElement).to.equal(button);
      });
      audit('#shadow-host', 'shadow content with explicit child styling');
      cy.get('#toggle-shadow').realClick();
      cy.get('#shadow-host')
        .shadow()
        .should($root => expect($root[0].childNodes.length).to.equal(0));
      cy.get('#toggle-shadow').realClick();
      cy.get('#shadow-host').shadow().find('[data-portal-node]').should('have.length', 1);
    });

    it('R2.22 HTMLElement within shadow is an explicit mount without owned wrappers or styling', () => {
      const Fixture = () => {
        const [host, setHost] = React.useState<HTMLDivElement | null>(null);
        const [node, setNode] = React.useState<HTMLElement>();
        React.useEffect(() => {
          if (host) {
            const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
            const element = host.ownerDocument.createElement('div');
            element.id = 'shadow-target';
            root.appendChild(element);
            setNode(element);
            return () => element.remove();
          }
        }, [host]);
        return (
          <>
            <div id="shadow-host" ref={setHost} />
            {node && (
              <Portal mountNode={node}>
                <Content />
              </Portal>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#shadow-host').shadow().find('#portal-content').parent().should('have.id', 'shadow-target');
      cy.get('#shadow-host').shadow().find('[data-portal-node]').should('not.exist');
      cy.get('#shadow-host').shadow().find('#portal-button').realClick();
      audit('#shadow-host', 'explicit shadow HTMLElement');
    });

    it('R2.23 undefined targetDocument renders only the hidden anchor until a browser document is provided', () => {
      const Fixture = () => {
        const [ready, setReady] = React.useState(false);
        return (
          <>
            <button id="ready" onClick={() => setReady(true)}>
              Provide document
            </button>
            <DocumentProvider value={{ dir: 'ltr', targetDocument: ready ? document : undefined }}>
              <div id="boundary">
                <Portal>
                  <Content />
                </Portal>
              </div>
            </DocumentProvider>
          </>
        );
      };
      mount(<Fixture />);
      cy.get('#boundary').should('have.html', '<span hidden=""></span>');
      cy.get('#portal-content').should('not.exist');
      cy.get('[data-portal-node]').should('not.exist');
      cy.get('#ready').realClick();
      portalRoot().should('have.attr', 'data-portal-node', 'true');
      cy.get('#boundary').should('have.html', '<span hidden=""></span>');
    });

    it('R2.24 hydrating the node-test hidden anchor creates client content without recoverable mismatches', () => {
      const errors = cy.stub().as('hydrationErrors');
      const Hydrated = () => {
        const [doc, setDoc] = React.useState<Document>();
        React.useEffect(() => {
          setDoc(document);
        }, []);
        return (
          <DocumentProvider value={{ dir: 'ltr', targetDocument: doc }}>
            <Portal>
              <Content />
            </Portal>
          </DocumentProvider>
        );
      };
      const Fixture = () => {
        const ref = React.useRef<HTMLDivElement>(null);
        React.useEffect(() => {
          ref.current!.innerHTML = '<span hidden=""></span>';
          const root = hydrateRoot(ref.current!, <Hydrated />, { onRecoverableError: errors });
          return () => root.unmount();
        }, []);
        return <div id="hydrate-host" ref={ref} />;
      };
      mount(<Fixture />, { strict: false });
      cy.get('#hydrate-host').should('have.html', '<span hidden=""></span>');
      cy.get('#portal-button').should('be.visible').realClick().should('be.focused');
      cy.get('@hydrationErrors').should('not.have.been.called');
      audit('#portal-content', 'hydrated browser content');
    });

    it('R2.25 direct mount hook disabled flag prevents owned DOM and enables later allocation and disposal', () => {
      const Probe = ({ disabled }: { disabled: boolean }) => {
        const node = usePortalMountNode({ disabled, className: 'hook-class' });
        return (
          <output id="hook-state" aria-label="Hook state">
            {node ? 'created' : 'disabled'}
          </output>
        );
      };
      const Fixture = () => {
        const [disabled, setDisabled] = React.useState(true);
        return (
          <>
            <button id="toggle-hook" onClick={() => setDisabled(value => !value)}>
              Toggle hook
            </button>
            <Probe disabled={disabled} />
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#hook-state').should('have.text', 'disabled');
      cy.get('[data-portal-node]').should('not.exist');
      cy.get('#toggle-hook').realClick();
      cy.get('#hook-state').should('have.text', 'created');
      cy.get('[data-portal-node]').should('have.length', 1).and('have.class', 'hook-class');
      cy.get('#toggle-hook').realClick();
      cy.get('[data-portal-node]').should('not.exist');
    });

    it('R2.26 child component state is preserved for normal updates but reset when the destination changes', () => {
      const Counter = () => {
        const [count, setCount] = React.useState(0);
        return (
          <button id="counter" onClick={() => setCount(value => value + 1)}>
            {count}
          </button>
        );
      };
      const Fixture = () => {
        const [host, setHost] = React.useState<HTMLDivElement | null>(null);
        const [custom, setCustom] = React.useState(false);
        const [revision, setRevision] = React.useState(0);
        const mountNode: PortalProps['mountNode'] = custom ? host : undefined;
        return (
          <>
            <div style={{ marginTop: 220 }}>
              <button id="update" onClick={() => setRevision(value => value + 1)}>
                Update {revision}
              </button>
              <button id="move" onClick={() => setCustom(true)}>
                Move
              </button>
              <div id="counter-host" ref={setHost} />
            </div>
            <Portal mountNode={mountNode}>
              <Counter />
            </Portal>
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#counter').realClick().should('have.text', '1');
      cy.get('#update').realClick();
      cy.get('#counter').should('have.text', '1');
      cy.get('#move').realClick();
      cy.get('#counter-host > #counter').should('have.text', '0');
    });
  });
}

if (round >= 3) {
  describe('ONLY126 Portal round 3: edge lifecycle and public content contracts', () => {
    it('R3.01 stable provider portal story propagates provider styles selectively inside its iframe', () => {
      mountFluent(
        <div id="provider-story">
          <ProviderPortalStory />
        </div>,
      );
      cy.get<HTMLIFrameElement>('#provider-story iframe')
        .its('0.contentDocument.body')
        .find('[data-portal-node]')
        .should('have.length', 2)
        .should($roots => {
          const doc = $roots[0].ownerDocument;
          const providers = doc.querySelectorAll('.fui-FluentProvider:not([data-portal-node])');
          expect(providers.length).to.equal(2);
          expect($roots[0].classList.contains('fui-FluentProvider')).to.equal(true);
          expect($roots[1].classList.contains('fui-FluentProvider')).to.equal(false);
          expect(doc.defaultView!.getComputedStyle($roots[0]).padding).to.equal('5px');
          expect(doc.defaultView!.getComputedStyle($roots[1]).padding).to.equal('0px');
        });
    });

    it('R3.02 no children, false children, text, fragment, and arrays render directly with one sentinel each', () => {
      mountFluent(
        <>
          <Portal />
          <Portal>{false}</Portal>
          <Portal>Plain text</Portal>
          <Portal>
            <>
              <button id="fragment-button" style={{ marginTop: 80 }}>
                Fragment action
              </button>
              <span id="fragment-text">Fragment text</span>
            </>
          </Portal>
          <Portal>
            {[
              <span id="array-a" key="a">
                A
              </span>,
              <span id="array-b" key="b">
                B
              </span>,
            ]}
          </Portal>
        </>,
      );
      cy.get('[data-portal-node]')
        .should('have.length', 5)
        .should($roots => {
          expect($roots[0].childNodes.length).to.equal(1);
          expect($roots[1].childNodes.length).to.equal(1);
          expect($roots[2].firstChild?.nodeType).to.equal(Node.TEXT_NODE);
          expect($roots[2].textContent).to.equal('Plain text');
          expect($roots[3].children.length).to.equal(3);
          expect($roots[4].children.length).to.equal(3);
          [...$roots].forEach(root => expect(root.querySelectorAll(':scope > span[hidden]').length).to.equal(1));
        });
      cy.get('#fragment-button').realClick().should('be.focused');
    });

    it('R3.03 updating children to null leaves the same wrapper and sentinel then restores content', () => {
      const Fixture = () => {
        const [empty, setEmpty] = React.useState(false);
        return (
          <>
            <button id="empty-toggle" style={{ marginTop: 220 }} onClick={() => setEmpty(value => !value)}>
              Toggle content
            </button>
            <Portal>{empty ? null : <Content />}</Portal>
          </>
        );
      };
      let original: HTMLElement;
      mountFluent(<Fixture />);
      portalRoot().then($root => {
        original = $root[0];
      });
      cy.get('#empty-toggle').realClick();
      cy.get('#portal-content').should('not.exist');
      cy.get('[data-portal-node]').should($root => {
        expect($root[0]).to.equal(original);
        expect(original.childNodes.length).to.equal(1);
        expect(original.firstElementChild?.hasAttribute('hidden')).to.equal(true);
      });
      cy.get('#empty-toggle').realClick();
      portalRoot().should($root => expect($root[0]).to.equal(original));
    });

    it('R3.04 child style, ARIA and handler updates target the same child rather than a Portal root API', () => {
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        const [clicks, setClicks] = React.useState('');
        return (
          <>
            <button id="update-props" style={{ marginTop: 220 }} onClick={() => setUpdated(true)}>
              Update
            </button>
            <output id="handler-result" aria-label="Current handler">
              {clicks}
            </output>
            <Portal>
              <section
                id="portal-content"
                aria-label="Updated tools"
                style={{ background: 'white', color: 'black', padding: 16 }}
              >
                <button
                  id="portal-button"
                  className={updated ? 'new-child-class' : 'old-child-class'}
                  aria-label={updated ? 'Save revision' : 'Save draft'}
                  style={{ borderWidth: updated ? 4 : 1 }}
                  onClick={() => setClicks(updated ? 'new' : 'old')}
                >
                  Save
                </button>
              </section>
            </Portal>
          </>
        );
      };
      let child: HTMLElement;
      mountFluent(<Fixture />);
      cy.get('#portal-button').then($button => {
        child = $button[0];
      });
      cy.get('#update-props').realClick();
      cy.get('#portal-button')
        .should('have.class', 'new-child-class')
        .and('not.have.class', 'old-child-class')
        .and('have.attr', 'aria-label', 'Save revision')
        .and('have.css', 'border-top-width', '4px')
        .then($button => {
          expect($button[0]).to.equal(child);
        })
        .realClick();
      cy.get('#handler-result').should('have.text', 'new');
      audit('#portal-content', 'updated child API');
    });

    it('R3.05 unmounting a nested portal subtree removes both owned nodes and releases child refs', () => {
      const ref = React.createRef<HTMLButtonElement>();
      const Fixture = () => {
        const [open, setOpen] = React.useState(true);
        return (
          <>
            <button id="close-tree" style={{ marginTop: 220 }} onClick={() => setOpen(false)}>
              Close tree
            </button>
            {open && (
              <Portal>
                <section>
                  <Portal>
                    <button ref={ref}>Nested child</button>
                  </Portal>
                </section>
              </Portal>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('[data-portal-node]').should('have.length', 2);
      cy.then(() => expect(ref.current?.isConnected).to.equal(true));
      cy.get('#close-tree').realClick();
      cy.get('[data-portal-node]').should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });

    it('R3.06 removing an iframe Portal subtree disposes its owned nodes while preserving the frame document', () => {
      let frameDoc: Document;
      const Fixture = () => {
        const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null);
        const [open, setOpen] = React.useState(true);
        const doc = frame?.contentDocument ?? undefined;
        return (
          <>
            <button id="close-frame" onClick={() => setOpen(false)}>
              Close frame tools
            </button>
            <iframe id="cleanup-frame" title="Cleanup tools" ref={setFrame} />
            {doc && open && (
              <DocumentProvider value={{ dir: 'ltr', targetDocument: doc }}>
                <Portal>
                  <button id="frame-child">Frame child</button>
                </Portal>
              </DocumentProvider>
            )}
          </>
        );
      };
      mount(<Fixture />);
      cy.get<HTMLIFrameElement>('#cleanup-frame')
        .its('0.contentDocument')
        .then(doc => {
          frameDoc = doc;
        })
        .its('body')
        .find('[data-portal-node]')
        .should('have.length', 1);
      cy.get('#close-frame').realClick();
      cy.then(() => {
        expect(frameDoc.body.querySelector('[data-portal-node]')).to.equal(null);
        expect(frameDoc.body.childNodes.length).to.equal(0);
        expect(frameDoc.defaultView?.frameElement?.isConnected).to.equal(true);
      });
    });

    it('R3.07 detached explicit HTMLElement receives children but only consumer attachment makes it visible', () => {
      let node: HTMLElement;
      const Fixture = () => {
        const [element] = React.useState(() => {
          const target = document.createElement('div');
          target.id = 'detached-host';
          return target;
        });
        React.useEffect(() => {
          node = element;
        }, [element]);
        const ref = React.useRef<HTMLDivElement>(null);
        return (
          <>
            <button id="attach" onClick={() => ref.current!.appendChild(element)}>
              Attach tools
            </button>
            <div id="attachment" ref={ref} />
            <Portal mountNode={element}>
              <Content />
            </Portal>
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#attach').should('be.visible');
      cy.then(() => {
        expect(node.isConnected).to.equal(false);
        expect(node.querySelector('#portal-button')?.textContent).to.equal('Portal action');
        expect(node.querySelector('span[hidden]')).not.to.equal(null);
      });
      cy.get('#portal-content').should('not.exist');
      cy.get('#attach').realClick();
      cy.get('#attachment > #detached-host > #portal-content').should('be.visible');
      cy.get('#portal-button').realClick().should('be.focused');
      audit('#detached-host', 'consumer-attached mount');
    });

    it('R3.08 iframe HTMLElement object normalization uses ownerDocument realm rather than global HTMLElement', () => {
      const Fixture = () => {
        const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null);
        return (
          <>
            <iframe id="realm-frame" title="Explicit realm" ref={setFrame} />
            {frame?.contentDocument && (
              <Portal mountNode={{ element: frame.contentDocument.body, className: 'not-copied' }}>
                <button id="realm-child">Realm child</button>
              </Portal>
            )}
          </>
        );
      };
      mount(<Fixture />);
      cy.get<HTMLIFrameElement>('#realm-frame')
        .its('0.contentDocument.body')
        .find('#realm-child')
        .parent()
        .should($body => {
          expect($body[0].tagName).to.equal('BODY');
          expect($body[0].classList.contains('not-copied')).to.equal(false);
          expect($body[0].getAttribute('data-portal-node')).to.equal(null);
        });
      cy.get('[data-portal-node]').should('not.exist');
    });

    it('R3.09 equal zIndex portal stacking follows insertion order and topmost content receives real pointer input', () => {
      const Fixture = () => {
        const [clicked, setClicked] = React.useState('');
        const [topOpen, setTopOpen] = React.useState(true);
        return (
          <>
            <button id="remove-top" style={{ marginTop: 220 }} onClick={() => setTopOpen(false)}>
              Remove top
            </button>
            <output id="stack-result" aria-label="Stack action">
              {clicked}
            </output>
            <Portal>
              <button
                id="bottom-action"
                style={{ position: 'absolute', top: 40, left: 40, width: 160, height: 40 }}
                onClick={() => setClicked('bottom')}
              >
                Bottom action
              </button>
            </Portal>
            {topOpen && (
              <Portal>
                <button
                  id="top-action"
                  style={{ position: 'absolute', top: 40, left: 40, width: 160, height: 40 }}
                  onClick={() => setClicked('top')}
                >
                  Top action
                </button>
              </Portal>
            )}
          </>
        );
      };
      mountFluent(<Fixture />);
      cy.get('#top-action').realClick();
      cy.get('#stack-result').should('have.text', 'top');
      cy.get('#remove-top').realClick();
      cy.get('#bottom-action').realClick();
      cy.get('#stack-result').should('have.text', 'bottom');
    });

    it('R3.10 StrictMode toggling repeatedly leaves one live owned mount and no leaked empty body nodes', () => {
      mountFluent(<Lifecycle initial={false} />);
      Cypress._.times(4, () => {
        cy.get('#toggle').realClick();
        cy.get('[data-portal-node]').should('have.length', 1);
        cy.get('#toggle').realClick();
        cy.get('[data-portal-node]').should('not.exist');
        cy.get('#logical-parent > span[hidden]').should('not.exist');
      });
    });

    it('R3.11 pointer content is not considered hidden just because its logical anchor has hidden=true', () => {
      mountFluent(<Interaction />);
      cy.get('#opener').realClick();
      cy.get('#logical-parent > span[hidden]').should('not.be.visible');
      cy.get('#portal-content')
        .should('be.visible')
        .should($content => expect($content[0].closest('[hidden], [aria-hidden="true"]')).to.equal(null));
      cy.get('#portal-button').realClick().should('be.focused');
      audit('#portal-content', 'accessible detached content');
    });

    it('R3.12 generated wrappers do not copy provider inline style attributes', () => {
      mount(
        <FluentProvider theme={webLightTheme} style={{ fontSize: 29, borderWidth: 9 }}>
          <Portal>
            <Content />
          </Portal>
        </FluentProvider>,
      );
      portalRoot().should($root => {
        expect($root[0].hasAttribute('style')).to.equal(false);
        expect(getComputedStyle($root[0]).fontSize).to.equal('14px');
        expect(getComputedStyle($root[0]).borderTopWidth).to.equal('0px');
      });
    });
  });
}

if (round >= 4) {
  describe('ONLY126 Portal round 4: target-provider update findings', () => {
    it('R4.01 changing provider target alone retains the original modern factory DOM node; a keyed remount relocates it', () => {
      const Fixture = () => {
        const [a, setA] = React.useState<HTMLDivElement | null>(null);
        const [b, setB] = React.useState<HTMLDivElement | null>(null);
        const [second, setSecond] = React.useState(false);
        const [key, setKey] = React.useState(0);
        return (
          <>
            <div style={{ marginTop: 220 }}>
              <button id="change-context-target" onClick={() => setSecond(true)}>
                Change context target
              </button>
              <button id="remount" onClick={() => setKey(value => value + 1)}>
                Remount
              </button>
              <div id="context-a" ref={setA} />
              <div id="context-b" ref={setB} />
            </div>
            {a && b && (
              <PortalMountNodeProvider value={second ? b : a}>
                <Portal key={key}>
                  <Content />
                </Portal>
              </PortalMountNodeProvider>
            )}
          </>
        );
      };
      let original: HTMLElement;
      mountFluent(<Fixture />);
      portalRoot().parent().should('have.id', 'context-a');
      portalRoot().then($root => {
        original = $root[0];
      });
      cy.get('#change-context-target').realClick();
      portalRoot().should($root => expect($root[0]).to.equal(original));
      portalRoot().parent().should('have.id', 'context-a');
      cy.get('#context-b').should('be.empty');
      cy.get('#remount').realClick();
      portalRoot().parent().should('have.id', 'context-b');
      cy.get('#context-a').should('be.empty');
      cy.then(() => expect(original.isConnected).to.equal(false));
    });

    it('R4.02 changing targetDocument alone retains original body node; keyed remount uses the iframe document', () => {
      const Fixture = () => {
        const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null);
        const [external, setExternal] = React.useState(false);
        const [key, setKey] = React.useState(0);
        return (
          <>
            <div style={{ marginTop: 220 }}>
              <button id="change-document" onClick={() => setExternal(true)}>
                Change document
              </button>
              <button id="remount" onClick={() => setKey(value => value + 1)}>
                Remount
              </button>
              <iframe id="target-frame" title="New target document" ref={setFrame} />
            </div>
            <DocumentProvider
              value={{ dir: 'ltr', targetDocument: external ? frame?.contentDocument ?? undefined : document }}
            >
              <Portal key={key}>
                <Content />
              </Portal>
            </DocumentProvider>
          </>
        );
      };
      let original: HTMLElement;
      mount(<Fixture />);
      portalRoot().then($root => {
        original = $root[0];
      });
      cy.get('#change-document').realClick();
      portalRoot().should($root => expect($root[0]).to.equal(original));
      cy.get<HTMLIFrameElement>('#target-frame').its('0.contentDocument.body').should('be.empty');
      cy.get('#remount').realClick();
      cy.get('#portal-content').should('not.exist');
      cy.get<HTMLIFrameElement>('#target-frame')
        .its('0.contentDocument.body')
        .find('#portal-content')
        .parent()
        .should('have.attr', 'data-portal-node', 'true');
      cy.then(() => expect(original.isConnected).to.equal(false));
    });
  });
}
