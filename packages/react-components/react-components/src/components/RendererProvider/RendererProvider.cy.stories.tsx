import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { hydrateRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { mount } from '@fluentui/scripts-cypress';
import { RendererProvider } from '../../index';
import {
  RendererProvider as GriffelRendererProvider,
  createDOMRenderer,
  makeStyles,
  useRenderer_unstable,
  TextDirectionProvider,
} from '@griffel/react';
import type { GriffelRenderer, GriffelStyle } from '@griffel/react';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Frame } from '../../../../react-provider/stories/src/Provider/FluentProviderFrame.stories';
import { ApplyStylesToPortals } from '../../../../react-provider/stories/src/Provider/FluentProviderApplyStylesToPortals.stories';
import * as axe from 'axe-core';

const rules: GriffelStyle = {
  color: '#123456',
  backgroundColor: '#eef4fc',
  marginLeft: '13px',
  padding: '8px',
  ':hover': { color: '#204060' },
};
const useStyles = makeStyles({ root: rules });
const Probe = ({
  id = 'probe',
  observe,
  onClick,
}: {
  id?: string;
  observe?: (renderer: GriffelRenderer) => void;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  const renderer = useRenderer_unstable();
  observe?.(renderer);
  const styles = useStyles();
  return (
    <button id={id} type="button" className={styles.root} onClick={onClick}>
      Renderer action
    </button>
  );
};
const sheets = (renderer: GriffelRenderer) => Object.values(renderer.stylesheets).map(sheet => sheet.element);
const computed = (node: HTMLElement) => {
  const win = node.ownerDocument.defaultView;
  if (!win) {
    throw new Error('Rendered element has no document window');
  }
  return win.getComputedStyle(node);
};
const ownedFrames: HTMLIFrameElement[] = [];
const ownedRoots: Root[] = [];
const freshDocument = () =>
  cy.document().then(doc => {
    const frame = doc.createElement('iframe');
    frame.title = 'Renderer test document';
    frame.style.width = '500px';
    frame.style.height = '150px';
    doc.body.appendChild(frame);
    ownedFrames.push(frame);
    const target = frame.contentDocument;
    if (!target) {
      throw new Error('Renderer test frame document is unavailable');
    }
    return target;
  });
afterEach(() => {
  for (const root of ownedRoots) {
    root.unmount();
  }
  ownedRoots.length = 0;
  for (const frame of ownedFrames) {
    frame.remove();
  }
  ownedFrames.length = 0;
});

describe('RendererProvider documented public integration', () => {
  it('is the actual Griffel renderer provider re-export, not FluentProvider', () => {
    expect(RendererProvider).to.equal(GriffelRendererProvider);
    cy.document().then(doc => {
      const renderer = createDOMRenderer(doc, { styleElementAttributes: { 'data-renderer-case': 'basic' } });
      let observed: GriffelRenderer | undefined;
      mount(
        <div id="container">
          <RendererProvider renderer={renderer} targetDocument={doc}>
            <Probe
              observe={value => {
                observed = value;
              }}
            />
          </RendererProvider>
        </div>,
      );
      cy.get('#probe').should($node => {
        expect(observed).to.equal(renderer);
        expect($node[0].parentElement?.id).to.equal('container');
        expect(computed($node[0]).color).to.equal('rgb(18, 52, 86)');
        expect(sheets(renderer).length).to.be.greaterThan(0);
        expect(sheets(renderer).every(sheet => sheet?.ownerDocument === doc)).to.equal(true);
      });
    });
  });

  it('supports the documented iframe document pairing with actual injected styles in the frame', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <Frame />
      </FluentProvider>,
    );
    cy.get<HTMLIFrameElement>('iframe').should($frame => {
      const doc = $frame[0].contentDocument;
      expect(doc).not.to.equal(null);
      expect(doc?.head.querySelectorAll('style[data-make-styles-bucket]').length).to.be.greaterThan(0);
      const text = Array.from(doc?.body.querySelectorAll('div') ?? []).find(
        node => node.textContent === 'Content rendered within iframe',
      );
      expect(text).not.to.equal(undefined);
      if (!text) {
        throw new Error('Documented frame content is not yet rendered');
      }
      expect(computed(text).fontSize).to.equal('20px');
      expect(computed(text).backgroundColor).not.to.equal('rgba(0, 0, 0, 0)');
    });
  });

  it('styles actual portal children in the documented external document', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <ApplyStylesToPortals />
      </FluentProvider>,
    );
    cy.get<HTMLIFrameElement>('iframe').should($frame => {
      const doc = $frame[0].contentDocument;
      if (!doc) {
        throw new Error('Portal frame document is not initialized');
      }
      const portals = Array.from(doc.body.querySelectorAll('div')).filter(
        node => node.textContent?.startsWith('A portal created by FluentProvider') && node.childElementCount === 1,
      );
      expect(portals).to.have.length(2);
      expect(doc.head.querySelectorAll('style[data-make-styles-bucket]').length).to.be.greaterThan(0);
      expect(portals.every(node => computed(node).paddingTop === '5px')).to.equal(true);
    });
  });

  it('uses documented style-element attributes and insertion-point placement without extra wrappers', () => {
    freshDocument().then(doc => {
      const point = doc.createElement('meta');
      point.setAttribute('data-renderer-point', 'case');
      doc.head.appendChild(point);
      const trailing = doc.createElement('meta');
      trailing.setAttribute('data-renderer-trailing', 'case');
      doc.head.appendChild(trailing);
      const renderer = createDOMRenderer(doc, {
        insertionPoint: point,
        styleElementAttributes: { nonce: 'renderer-fixture-nonce', 'data-renderer-case': 'attributes' },
      });
      mount(
        <RendererProvider renderer={renderer} targetDocument={doc}>
          {ReactDOM.createPortal(<Probe />, doc.body)}
        </RendererProvider>,
      );
      cy.wrap(doc.body)
        .find('#probe')
        .should(() => {
          const elements = sheets(renderer);
          expect(elements.length).to.be.greaterThan(0);
          for (const style of elements) {
            if (!style) {
              throw new Error('DOM renderer produced no style element');
            }
            expect(style.nonce).to.equal('renderer-fixture-nonce');
            expect(style.getAttribute('data-renderer-case')).to.equal('attributes');
            expect(point.compareDocumentPosition(style) & Node.DOCUMENT_POSITION_FOLLOWING).not.to.equal(0);
            expect(style.compareDocumentPosition(trailing) & Node.DOCUMENT_POSITION_FOLLOWING).not.to.equal(0);
          }
        });
    });
  });
});

describe('RendererProvider ownership and native boundaries', () => {
  it('provides the nearest renderer to nested children and restores parent ownership after inner removal', () => {
    cy.document().then(doc => {
      const outer = createDOMRenderer(doc);
      const inner = createDOMRenderer(doc);
      const observed = new Map<string, GriffelRenderer>();
      const Owner = () => {
        const [nested, setNested] = React.useState(true);
        return (
          <>
            <button id="update" onClick={() => setNested(false)}>
              Update
            </button>
            <RendererProvider renderer={outer} targetDocument={doc}>
              <Probe id="outer" observe={value => observed.set('outer', value)} />
              {nested ? (
                <RendererProvider renderer={inner} targetDocument={doc}>
                  <Probe id="inner" observe={value => observed.set('inner', value)} />
                </RendererProvider>
              ) : (
                <Probe id="restored" observe={value => observed.set('restored', value)} />
              )}
            </RendererProvider>
          </>
        );
      };
      mount(<Owner />);
      cy.get('#inner').should(() => {
        expect(observed.get('outer')).to.equal(outer);
        expect(observed.get('inner')).to.equal(inner);
      });
      cy.get('#update').realClick();
      cy.get('#inner').should('not.exist');
      cy.get('#restored').should(() => expect(observed.get('restored')).to.equal(outer));
    });
  });

  it('keeps renderer identity, rule count and the actual child node stable through unrelated owner renders', () => {
    freshDocument().then(doc => {
      const renderer = createDOMRenderer(doc);
      let observed: GriffelRenderer | undefined;
      const Owner = () => {
        const [revision, setRevision] = React.useState(0);
        return (
          <>
            <button id="update" onClick={() => setRevision(value => value + 1)}>
              Update {revision}
            </button>
            <RendererProvider renderer={renderer} targetDocument={doc}>
              {ReactDOM.createPortal(
                <Probe
                  observe={value => {
                    observed = value;
                  }}
                />,
                doc.body,
              )}
            </RendererProvider>
          </>
        );
      };
      mount(<Owner />);
      cy.wrap(doc.body)
        .find('#probe')
        .then($original => {
          const rulesBefore = Object.keys(renderer.insertionCache);
          expect(rulesBefore.length).to.be.greaterThan(0);
          cy.get('#update').realClick();
          cy.wrap(doc.body)
            .find('#probe')
            .should($node => {
              expect($node[0]).to.equal($original[0]);
              expect(observed).to.equal(renderer);
              expect(Object.keys(renderer.insertionCache)).to.deep.equal(rulesBefore);
              expect(computed($node[0]).color).to.equal('rgb(18, 52, 86)');
            });
        });
    });
  });

  it('updates renderer ownership without recreating the mounted child or its native behavior', () => {
    cy.document().then(doc => {
      const first = createDOMRenderer(doc);
      const second = createDOMRenderer(doc);
      let observed: GriffelRenderer | undefined;
      const click = cy.spy().as('click');
      const Owner = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <button id="update" onClick={() => setUpdated(true)}>
              Update
            </button>
            <RendererProvider renderer={updated ? second : first} targetDocument={doc}>
              <Probe
                observe={value => {
                  observed = value;
                }}
                onClick={click}
              />
            </RendererProvider>
          </>
        );
      };
      mount(<Owner />);
      cy.get('#probe').then($original => {
        expect(observed).to.equal(first);
        cy.get('#update').realClick();
        cy.get('#probe').should($node => {
          expect($node[0]).to.equal($original[0]);
          expect(observed).to.equal(second);
        });
        cy.get('#probe').focus();
        cy.realPress('Enter');
        cy.get('@click').should('have.been.calledOnce');
      });
    });
  });

  it('preserves child tab order, accessible naming and bubbled clicks without an extra DOM wrapper', () => {
    cy.document().then(doc => {
      const renderer = createDOMRenderer(doc);
      const bubble = cy.spy().as('bubble');
      mount(
        <div id="container" onClick={event => bubble(event.currentTarget.id)}>
          <button id="before">Before</button>
          <RendererProvider renderer={renderer} targetDocument={doc}>
            <Probe />
          </RendererProvider>
          <button id="after">After</button>
        </div>,
      );
      cy.get('#probe').parent().should('have.id', 'container');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#probe').should('have.focus');
      cy.realPress('Space');
      cy.get('@bubble').should('have.been.calledOnce').its('firstCall.args.0').should('equal', 'container');
      cy.realPress('Tab');
      cy.get('#after').should('have.focus');
      cy.get('#probe').then($node =>
        axe
          .run($node[0])
          .then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
      );
    });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`keeps text-direction context independent of renderer ownership in ${dir}`, () => {
      freshDocument().then(doc => {
        const renderer = createDOMRenderer(doc);
        mount(
          <RendererProvider renderer={renderer} targetDocument={doc}>
            <TextDirectionProvider dir={dir}>{ReactDOM.createPortal(<Probe />, doc.body)}</TextDirectionProvider>
          </RendererProvider>,
        );
        const side = dir === 'ltr' ? 'margin-left' : 'margin-right';
        cy.wrap(doc.body).find('#probe').should('have.css', side, '13px');
      });
    });
  }

  it('hydrates a real DOM-free server result before child render without duplicating existing CSS', () => {
    const ssrRules: GriffelStyle = { color: '#284767', backgroundColor: '#f3f7fb', marginLeft: '17px' };
    const useSSRStyles = makeStyles({ root: ssrRules });
    cy.task<{ html: string; css: string; ruleKeys: string[] }>('rendererSSR', {
      rules: ssrRules,
      attributes: { 'data-renderer-case': 'ssr', nonce: 'ssr-fixture-nonce' },
    }).then(seed => {
      expect(seed.ruleKeys.length).to.be.greaterThan(0);
      expect(seed.css).to.contain('data-make-styles-bucket');
      freshDocument().then(doc => {
        const template = doc.createElement('template');
        template.innerHTML = seed.css;
        doc.head.appendChild(template.content);
        const host = doc.createElement('div');
        host.innerHTML = seed.html;
        doc.body.appendChild(host);
        const renderer = createDOMRenderer(doc);
        const snapshots: string[][] = [];
        const ProbeSSR = () => {
          const current = useRenderer_unstable();
          snapshots.push(Object.keys(current.insertionCache));
          const classes = useSSRStyles();
          return (
            <button type="button" className={classes.root}>
              Renderer action
            </button>
          );
        };
        const recovered = cy.spy().as('recovered');
        const styleCount = doc.head.querySelectorAll('style[data-make-styles-bucket]').length;
        const child = host.firstElementChild;
        ownedRoots.push(
          hydrateRoot(
            host,
            <RendererProvider renderer={renderer} targetDocument={doc}>
              <ProbeSSR />
            </RendererProvider>,
            {
              onRecoverableError: recovered,
            },
          ),
        );
        cy.wrap(host)
          .find('button')
          .should($node => {
            expect(snapshots.length).to.be.greaterThan(0);
            expect(seed.ruleKeys.every(key => snapshots[0].includes(key))).to.equal(true);
            expect($node[0]).to.equal(child);
            expect(computed($node[0]).color).to.equal('rgb(40, 71, 103)');
            expect(doc.head.querySelectorAll('style[data-make-styles-bucket]').length).to.equal(styleCount);
            expect(Object.keys(renderer.insertionCache)).to.have.length(seed.ruleKeys.length);
          });
        cy.get('@recovered').should('not.have.been.called');
      });
    });
  });
});

describe('RendererProvider source and unit-informed lifecycle contracts', () => {
  it('rehydrates a changed targetDocument before child render even when renderer identity is unchanged', () => {
    freshDocument().then(first => {
      freshDocument().then(second => {
        const one = first.createElement('style');
        one.dataset.makeStylesBucket = 'd';
        one.textContent = '.renderer-first-document{color:#315273;}';
        first.head.appendChild(one);
        const two = second.createElement('style');
        two.dataset.makeStylesBucket = 'd';
        two.textContent = '.renderer-second-document{color:#426384;}';
        second.head.appendChild(two);
        const renderer = createDOMRenderer(first);
        let snapshot: string[] = [];
        const Reader = () => {
          snapshot = Object.keys(useRenderer_unstable().insertionCache);
          return <output id="reader">Read</output>;
        };
        const Owner = () => {
          const [updated, setUpdated] = React.useState(false);
          return (
            <>
              <button id="update" onClick={() => setUpdated(true)}>
                Update
              </button>
              <RendererProvider renderer={renderer} targetDocument={updated ? second : first}>
                <Reader />
              </RendererProvider>
            </>
          );
        };
        mount(<Owner />);
        cy.get('#reader').should(() => expect(snapshot).to.include(one.textContent));
        cy.get('#update').realClick();
        cy.get('#reader').should(() => {
          expect(snapshot).to.include(one.textContent);
          expect(snapshot).to.include(two.textContent);
        });
      });
    });
  });

  it('retains existing hydrated sheet attributes rather than mutating SSR nodes to match new renderer options', () => {
    freshDocument().then(doc => {
      const existing = doc.createElement('style');
      existing.dataset.makeStylesBucket = 'd';
      existing.nonce = 'original-fixture-nonce';
      existing.textContent = '.renderer-existing{color:#536475;}';
      doc.head.appendChild(existing);
      const renderer = createDOMRenderer(doc, { styleElementAttributes: { nonce: 'new-fixture-nonce' } });
      mount(
        <RendererProvider renderer={renderer} targetDocument={doc}>
          {ReactDOM.createPortal(<Probe />, doc.body)}
        </RendererProvider>,
      );
      cy.wrap(doc.body)
        .find('#probe')
        .should(() => {
          expect(sheets(renderer)).to.include(existing);
          expect(existing.nonce).to.equal('original-fixture-nonce');
          expect(renderer.insertionCache).to.have.property('.renderer-existing{color:#536475;}');
        });
    });
  });

  it('removes child markup and refs without deleting reusable document styles when the provider unmounts', () => {
    freshDocument().then(doc => {
      const renderer = createDOMRenderer(doc);
      const ref = React.createRef<HTMLButtonElement>();
      const Child = () => (
        <button id="child" ref={ref} className={useStyles().root}>
          Action
        </button>
      );
      const Owner = () => {
        const [show, setShow] = React.useState(true);
        return (
          <>
            <button id="remove" onClick={() => setShow(false)}>
              Remove
            </button>
            {show && (
              <RendererProvider renderer={renderer} targetDocument={doc}>
                {ReactDOM.createPortal(<Child />, doc.body)}
              </RendererProvider>
            )}
          </>
        );
      };
      mount(<Owner />);
      cy.wrap(doc.body)
        .find('#child')
        .should($node => expect(ref.current).to.equal($node[0]))
        .then(() => {
          const before = sheets(renderer);
          expect(before.length).to.be.greaterThan(0);
          cy.get('#remove').realClick();
          cy.wrap(doc.body)
            .find('#child')
            .should('not.exist')
            .then(() => {
              expect(ref.current).to.equal(null);
              expect(before.every(style => style?.isConnected)).to.equal(true);
            });
        });
    });
  });

  it('allows null and fragment children while retaining exact renderer ownership', () => {
    cy.document().then(doc => {
      const renderer = createDOMRenderer(doc);
      let observed: GriffelRenderer | undefined;
      mount(
        <div id="container">
          <RendererProvider renderer={renderer} targetDocument={doc}>
            <>
              {null}
              <Probe
                observe={value => {
                  observed = value;
                }}
              />
              <span id="sibling">Sibling</span>
            </>
          </RendererProvider>
        </div>,
      );
      cy.get('#container').children().should('have.length', 2);
      cy.get('#probe').should(() => expect(observed).to.equal(renderer));
      cy.get('#sibling').should('have.text', 'Sibling');
    });
  });
});
