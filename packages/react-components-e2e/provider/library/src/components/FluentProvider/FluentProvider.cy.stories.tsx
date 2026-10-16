import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from './FluentProvider';
import { webLightTheme, webDarkTheme, teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { Portal } from '@fluentui/react-portal';
import { useFluent_unstable, ThemeContext_unstable, useOverrides_unstable } from '@fluentui/react-shared-contexts';
import { Frame } from '../../../../stories/src/Provider/FluentProviderFrame.stories';
import { makeStyles } from '@griffel/react';
import { IdPrefixProvider } from '@fluentui/react-utilities';
import { Button, type ButtonState } from '@fluentui/react-button';
import { Input } from '@fluentui/react-input';

const rgb = (hex: string) => `rgb(${[1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)).join(', ')})`;
const variable = (root: HTMLElement, name: string) =>
  root.ownerDocument.defaultView!.getComputedStyle(root).getPropertyValue(`--${name}`).trim();
const themeClass = (root: HTMLElement) =>
  Array.from(root.classList).find(name => name.includes('fui-FluentProvider') && name !== 'fui-FluentProvider')!;
const usePortalStyles = makeStyles({ customColor: { color: 'rgb(120, 5, 16)' } });

describe('FluentProvider unit-contract browser regressions', () => {
  it('exposes merged context theme and inherited direction/document to descendants', () => {
    const Probe = () => {
      const theme = React.useContext(ThemeContext_unstable)!;
      const context = useFluent_unstable();
      return (
        <output id="context">
          {JSON.stringify({
            brand: theme.colorBrandBackground,
            inherited: theme.colorNeutralForeground1,
            dir: context.dir,
            hasDocument: !!context.targetDocument?.head,
          })}
        </output>
      );
    };
    mount(
      <FluentProvider theme={webLightTheme} dir="rtl">
        <FluentProvider theme={{ colorBrandBackground: '#123456' }}>
          <Probe />
        </FluentProvider>
      </FluentProvider>,
    );
    cy.get('#context').should($output =>
      expect(JSON.parse($output.text())).to.deep.equal({
        brand: '#123456',
        inherited: webLightTheme.colorNeutralForeground1,
        dir: 'rtl',
        hasDocument: true,
      }),
    );
  });

  it('forwards root native attributes and events without leaking provider-only props', () => {
    const click = cy.stub().as('click');
    mount(
      <FluentProvider
        id="native"
        theme={webLightTheme}
        title="Provider title"
        role="region"
        aria-label="Application"
        onClick={click}
        applyStylesToPortals={false}
      >
        <button>Action</button>
      </FluentProvider>,
    );
    cy.get('#native').should($root => {
      expect($root).to.have.attr('role', 'region');
      expect($root).to.have.attr('aria-label', 'Application');
      expect($root).to.have.attr('title', 'Provider title');
      expect($root).not.to.have.attr('theme');
      expect($root).not.to.have.attr('applyStylesToPortals');
    });
    cy.contains('button', 'Action').click();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('generates unique single-rule head styles for nested and sibling providers without body styles', () => {
    mount(
      <>
        <FluentProvider id="first" theme={webLightTheme}>
          <FluentProvider id="nested" theme={webDarkTheme} />
        </FluentProvider>
        <FluentProvider id="second" theme={teamsLightTheme} />
      </>,
    );
    cy.get('#first, #nested, #second').then($roots => {
      const ids = Array.from($roots, root => themeClass(root));
      expect(new Set(ids).size).to.equal(3);
      cy.document().then(document => {
        for (const id of ids) {
          const style = document.head.querySelector<HTMLStyleElement>(`[id="${id}"]`)!;
          expect(style).not.to.equal(null);
          expect(style.sheet!.cssRules).to.have.length(1);
        }
      });
    });
    cy.get('#first, #second').find('style').should('not.exist');
  });

  it('applies nested custom style hooks with the inner hook taking precedence', () => {
    const outer = (state: unknown) => {
      (state as ButtonState).root.title = 'Outer customization';
    };
    const inner = (state: unknown) => {
      (state as ButtonState).root.title = 'Inner customization';
    };
    mount(
      <FluentProvider theme={webLightTheme} customStyleHooks_unstable={{ useButtonStyles_unstable: outer }}>
        <Button>Outer action</Button>
        <FluentProvider customStyleHooks_unstable={{ useButtonStyles_unstable: inner }}>
          <Button>Inner action</Button>
        </FluentProvider>
        <FluentProvider>
          <Button>Inherited action</Button>
        </FluentProvider>
      </FluentProvider>,
    );
    cy.contains('button', 'Outer action').should('have.attr', 'title', 'Outer customization');
    cy.contains('button', 'Inner action').should('have.attr', 'title', 'Inner customization');
    cy.contains('button', 'Inherited action').should('have.attr', 'title', 'Outer customization');
  });

  it('merges nested default-appearance overrides into actual Input components', () => {
    const Probe = () => <output id="override">{useOverrides_unstable().inputDefaultAppearance}</output>;
    mount(
      <FluentProvider theme={webLightTheme} overrides_unstable={{ inputDefaultAppearance: 'filled-lighter' }}>
        <Input id="outer-input" aria-label="Outer input" />
        <FluentProvider overrides_unstable={{ inputDefaultAppearance: 'filled-darker' }}>
          <Input id="inner-input" aria-label="Inner input" />
          <Probe />
        </FluentProvider>
      </FluentProvider>,
    );
    cy.get('#override').should('have.text', 'filled-darker');
    cy.get('#outer-input').parent().should('have.css', 'background-color', rgb(webLightTheme.colorNeutralBackground1));
    cy.get('#inner-input').parent().should('have.css', 'background-color', rgb(webLightTheme.colorNeutralBackground3));
  });
});

describe('FluentProvider browser and accessibility edges', () => {
  it('updates theme and direction without changing the stylesheet id or leaking old rules', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(value => !value)}>Toggle</button>
          <FluentProvider id="dynamic" theme={updated ? webDarkTheme : webLightTheme} dir={updated ? 'rtl' : 'ltr'}>
            Content
          </FluentProvider>
        </>
      );
    };
    mount(<Example />);
    cy.get('#dynamic').then($root => {
      const id = themeClass($root[0]);
      cy.contains('button', 'Toggle').click();
      cy.get('#dynamic')
        .should('have.attr', 'dir', 'rtl')
        .and('have.css', 'color', rgb(webDarkTheme.colorNeutralForeground1));
      cy.get('#dynamic').should('have.class', id);
      cy.document().then(document => {
        const tags = document.head.querySelectorAll<HTMLStyleElement>(`[id="${id}"]`);
        expect(tags).to.have.length(1);
        expect(tags[0].sheet!.cssRules).to.have.length(1);
      });
      cy.contains('button', 'Toggle').click();
      cy.get('#dynamic')
        .should('have.attr', 'dir', 'ltr')
        .and('have.css', 'color', rgb(webLightTheme.colorNeutralForeground1));
    });
  });

  for (const prefix of ['scope:[]', 'scope<', 'scope>']) {
    it(`escapes the ${prefix} prefix in a working browser CSS selector`, () => {
      mount(
        <IdPrefixProvider value={prefix}>
          <FluentProvider id="prefixed" theme={webLightTheme}>
            Content
          </FluentProvider>
        </IdPrefixProvider>,
      );
      cy.get('#prefixed').should($root => {
        expect(themeClass($root[0])).to.contain(prefix);
        expect(variable($root[0], 'colorBrandBackground')).to.equal(webLightTheme.colorBrandBackground);
      });
    });
  }

  it('removes its theme stylesheet on unmount and releases the forwarded ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(false)}>Remove</button>
          {visible && (
            <FluentProvider ref={ref} id="removable" theme={webLightTheme}>
              Content
            </FluentProvider>
          )}
        </>
      );
    };
    mount(<Example />);
    cy.get('#removable').then($root => {
      const id = themeClass($root[0]);
      expect(ref.current).to.equal($root[0]);
      cy.document().then(document => expect(document.getElementById(id)).not.to.equal(null));
      cy.contains('button', 'Remove').click();
      cy.get('#removable')
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
      cy.document().then(document => expect(document.getElementById(id)).to.equal(null));
    });
  });

  it('does not add a tab stop or role and preserves child native keyboard activation', () => {
    const click = cy.stub().as('click');
    mount(
      <>
        <button>Before</button>
        <FluentProvider id="focus-provider" theme={webLightTheme}>
          <button onClick={click}>Action</button>
        </FluentProvider>
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').click().realPress('Tab');
    cy.contains('button', 'Action').should('be.focused').realPress('Space');
    cy.get('@click').should('have.been.calledOnce');
    cy.contains('button', 'Action').realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get('#focus-provider').should('not.have.attr', 'role');
    cy.get('#focus-provider').should('not.have.attr', 'tabindex');
  });
});

describe('FluentProvider documented behavior', () => {
  for (const [name, theme] of [
    ['web light', webLightTheme],
    ['web dark', webDarkTheme],
    ['Teams light', teamsLightTheme],
    ['Teams dark', teamsDarkTheme],
  ] as const) {
    it(`applies ${name} CSS variables and root typography`, () => {
      mount(
        <FluentProvider id="provider" theme={theme}>
          <span id="text">Themed text</span>
        </FluentProvider>,
      );
      cy.get('#provider')
        .should('have.css', 'color', rgb(theme.colorNeutralForeground1))
        .and('have.css', 'background-color', rgb(theme.colorNeutralBackground1))
        .and('have.css', 'font-size', '14px');
      cy.get('#text').should($text => {
        expect(variable($text[0], 'colorBrandBackground')).to.equal(theme.colorBrandBackground);
        expect(variable($text[0], 'fontFamilyBase')).to.equal(theme.fontFamilyBase);
      });
    });
  }

  it('merges nested partial themes while leaving the parent scope unchanged', () => {
    mount(
      <FluentProvider id="outer" theme={webLightTheme}>
        <FluentProvider id="inner" theme={{ colorBrandBackground: '#123456' }}>
          Nested
        </FluentProvider>
      </FluentProvider>,
    );
    cy.get('#inner').should($inner => {
      expect(variable($inner[0], 'colorBrandBackground')).to.equal('#123456');
      expect(variable($inner[0], 'colorNeutralForeground1')).to.equal(webLightTheme.colorNeutralForeground1);
    });
    cy.get('#outer').should($outer =>
      expect(variable($outer[0], 'colorBrandBackground')).to.equal(webLightTheme.colorBrandBackground),
    );
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`provides ${dir} text direction and inherits it in a nested provider`, () => {
      mount(
        <FluentProvider id="outer" dir={dir} theme={webLightTheme} lang={dir === 'rtl' ? 'ar' : 'en'}>
          <FluentProvider id="inner">Direction</FluentProvider>
        </FluentProvider>,
      );
      cy.get('#outer').should('have.attr', 'dir', dir).and('have.css', 'direction', dir);
      cy.get('#inner')
        .should('have.attr', 'dir', dir)
        .and('have.css', 'text-align', dir === 'rtl' ? 'right' : 'left');
    });
  }

  for (const applyStylesToPortals of [true, false]) {
    it(`${applyStylesToPortals ? 'applies' : 'omits'} provider styles on portalled content`, () => {
      const Example = () => {
        const styles = usePortalStyles();
        return (
          <FluentProvider
            id="provider"
            theme={webLightTheme}
            applyStylesToPortals={applyStylesToPortals}
            className={styles.customColor}
          >
            <Portal>
              <span id="portalled">Portal text</span>
            </Portal>
          </FluentProvider>
        );
      };
      mount(<Example />);
      cy.get('#provider').find('#portalled').should('not.exist');
      cy.get('#portalled').should($portal => {
        expect(variable($portal[0], 'colorBrandBackground')).to.equal(webLightTheme.colorBrandBackground);
      });
      if (applyStylesToPortals) {
        cy.get('#portalled').should('have.css', 'color', 'rgb(120, 5, 16)');
      } else {
        cy.get('#portalled').should('not.have.css', 'color', 'rgb(120, 5, 16)');
      }
    });
  }

  it('injects theme rules into the target iframe document', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <Frame />
      </FluentProvider>,
    );
    cy.get('iframe').should($frames => {
      const document = $frames[0].contentDocument!;
      const root = document.querySelector<HTMLElement>('.fui-FluentProvider')!;
      expect(root).not.to.equal(null);
      expect(variable(root, 'colorBrandBackground')).to.equal(webLightTheme.colorBrandBackground);
      expect(document.head.querySelector(`[id="${themeClass(root)}"]`)).not.to.equal(null);
      expect(document.body.textContent).to.contain('Content rendered within iframe');
    });
  });
});
