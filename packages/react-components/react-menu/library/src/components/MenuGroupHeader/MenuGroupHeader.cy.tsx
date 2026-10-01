import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-theme';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { RefAttributes, SlotRenderFunction } from '@fluentui/react-utilities';
import { CutRegular } from '@fluentui/react-icons';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuItemCheckbox,
  MenuItemRadio,
  MenuGroup,
  MenuDivider,
} from '@fluentui/react-menu';
import { MenuGroupHeader } from './MenuGroupHeader';
import type { MenuGroupHeaderProps } from './MenuGroupHeader.types';
import { MenuGroupContextProvider } from '../../contexts/menuGroupContext';

const root = '[data-testid="header"]';
const trigger = '[data-testid="trigger"]';

function rgb(hex: string) {
  expect(hex, 'theme color token must be six-digit hexadecimal').to.match(/^#[0-9a-f]{6}$/i);
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

function render(props: MenuGroupHeaderProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <button data-testid="before">Before</button>
      <MenuGroupHeader data-testid="header" {...props}>
        {props.children ?? 'Section header'}
      </MenuGroupHeader>
      <button data-testid="after">After</button>
    </FluentProvider>,
  );
}

function changing(initial: MenuGroupHeaderProps & RefAttributes<HTMLDivElement>, initialContextId = '') {
  const tree = (props: typeof initial, headerId: string) => (
    <FluentProvider theme={webLightTheme}>
      <MenuGroupContextProvider value={{ headerId }}>
        <MenuGroupHeader data-testid="header" {...props} />
      </MenuGroupContextProvider>
    </FluentProvider>
  );
  let replace: (props: typeof initial, headerId: string) => void = () => {
    throw new Error('Mount has not completed');
  };
  mount(tree(initial, initialContextId)).then(({ rerender }) => {
    replace = (props, headerId) => {
      rerender(tree(props, headerId));
    };
  });
  return (props: typeof initial, headerId = initialContextId) => cy.then(() => replace(props, headerId));
}

describe('MenuGroupHeader unit-informed browser contracts', () => {
  it('forwards an object ref to the actual div and clears it on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <MenuGroupHeader ref={ref} data-testid="header">
        Actions
      </MenuGroupHeader>,
    ).then(({ rerender }) => {
      cy.get(root).should(header => expect(ref.current).to.equal(header[0]));
      cy.then(() => rerender(<></>));
      cy.get(root).should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  });

  it('detaches replaced callback refs, retains node identity and clears the last ref on unmount', () => {
    const first = cy.spy().as('firstRef');
    const second = cy.spy().as('secondRef');
    const tree = (ref?: React.Ref<HTMLDivElement>) => (
      <MenuGroupHeader ref={ref} data-testid="header">
        Actions
      </MenuGroupHeader>
    );
    mount(tree(first)).then(({ rerender }) => {
      cy.get(root).then(header => {
        const node = header[0];
        cy.get('@firstRef').should('have.been.calledWith', node);
        cy.then(() => rerender(tree(second)));
        cy.get(root).should(latest => expect(latest[0]).to.equal(node));
        cy.get('@firstRef').should('have.been.calledWith', null);
        cy.get('@secondRef').should('have.been.calledWith', node);
        cy.then(() => rerender(<></>));
        cy.get(root).should('not.exist');
        cy.get('@secondRef').should('have.been.calledWith', null);
      });
    });
  });

  it('allows an explicit empty id to override context and restores context when omitted', () => {
    const change = changing({ id: '', children: 'Actions' }, 'context-id');
    cy.get(root).should('have.attr', 'id', '');
    change({ children: 'Actions' });
    cy.get(root).should('have.id', 'context-id');
  });

  it('retains native div identity for the supported explicit as value', () => {
    const change = changing({ as: 'div', children: 'Actions' });
    cy.get(root).then(original => {
      change({ children: 'Latest' });
      cy.get(root).should('have.prop', 'tagName', 'DIV').and('have.text', 'Latest');
      cy.get(root).should(header => expect(header[0]).to.equal(original[0]));
    });
  });

  it('updates and removes native hidden, language and direction attributes', () => {
    const change = changing({ hidden: true, lang: 'fr', dir: 'rtl', children: 'Actions' });
    cy.get(root).should('have.attr', 'hidden');
    cy.get(root).should('have.attr', 'lang', 'fr').and('have.css', 'direction', 'rtl');
    change({ hidden: false, lang: 'en', dir: 'ltr', children: 'Actions' });
    cy.get(root).should('not.have.attr', 'hidden');
    cy.get(root).should('have.attr', 'lang', 'en').and('have.css', 'direction', 'ltr');
    change({ children: 'Actions' });
    cy.get(root).should('not.have.attr', 'lang');
    cy.get(root).should('not.have.attr', 'dir');
  });

  it('allows native explicit tabIndex and restores nonfocusable default after removal', () => {
    const change = changing({ tabIndex: 0, children: 'Actions' });
    cy.get(root).focus().should('be.focused').and('have.attr', 'tabindex', '0');
    change({ children: 'Actions' });
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get(root).then(header => {
      (header[0] as HTMLDivElement).blur();
      (header[0] as HTMLDivElement).focus();
    });
    cy.get(root).should('not.be.focused');
  });

  it('updates and removes explicit ARIA overrides without retaining heading semantics', () => {
    const change = changing({ role: 'heading', 'aria-level': 3, 'aria-label': 'First', children: 'Actions' });
    cy.get(root).should(header => expect(computeAccessibleName(header[0])).to.equal('First'));
    change({ role: 'heading', 'aria-level': 4, 'aria-label': 'Latest', children: 'Actions' });
    cy.get(root).should('have.attr', 'aria-level', '4');
    cy.get(root).should(header => expect(computeAccessibleName(header[0])).to.equal('Latest'));
    change({ children: 'Actions' });
    cy.get(root).should('not.have.attr', 'role');
    cy.get(root).should('not.have.attr', 'aria-level');
    cy.get(root).should('not.have.attr', 'aria-label');
  });

  it('keeps header label overrides distinct from the text used to name its group', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <MenuGroup data-testid="group">
          <MenuGroupHeader data-testid="header" aria-label="Custom group name">
            Visible actions
          </MenuGroupHeader>
        </MenuGroup>
      </FluentProvider>,
    );
    cy.get(root).should('have.text', 'Visible actions');
    cy.get('[data-testid="group"]').should(group =>
      expect(computeAccessibleName(group[0])).to.equal('Custom group name'),
    );
  });

  it('renders text literally rather than parsing markup', () => {
    render({ children: '<strong>Actions & commands</strong>' });
    cy.get(root).should('have.text', '<strong>Actions & commands</strong>');
    cy.get(`${root} strong`).should('not.exist');
  });

  it('lets native child clicks bubble and respects consumer stopPropagation', () => {
    const parent = cy.spy().as('parent');
    const headerClick = cy.spy().as('headerClick');
    const tree = (stop: boolean) => (
      <div onClick={parent}>
        <MenuGroupHeader
          data-testid="header"
          onClick={event => {
            headerClick(event);
            if (stop) {
              event.stopPropagation();
            }
          }}
        >
          <button data-testid="child">Help</button>
        </MenuGroupHeader>
      </div>
    );
    mount(tree(false)).then(({ rerender }) => {
      cy.get('[data-testid="child"]').realClick();
      cy.get('@headerClick').should('have.been.calledOnce');
      cy.get('@parent').should('have.been.calledOnce');
      cy.then(() => rerender(tree(true)));
      cy.get('[data-testid="child"]').realClick();
      cy.get('@headerClick').should('have.been.calledTwice');
      cy.get('@parent').should('have.been.calledOnce');
    });
  });

  for (const [name, theme] of [
    ['dark', webDarkTheme],
    ['high contrast', teamsHighContrastTheme],
  ] as const) {
    it(`updates header paint to ${name} provider tokens without replacing the header`, () => {
      const tree = (value: typeof webLightTheme) => (
        <FluentProvider theme={value}>
          <MenuGroupHeader data-testid="header">Actions</MenuGroupHeader>
        </FluentProvider>
      );
      mount(tree(webLightTheme)).then(({ rerender }) => {
        cy.get(root).then(original => {
          cy.then(() => rerender(tree(theme)));
          cy.get(root).should('have.css', 'color', rgb(theme.colorNeutralForeground3));
          cy.get(root).should('have.css', 'font-size', theme.fontSizeBase200).and('have.css', 'height', '32px');
          cy.get(root).should(header => expect(header[0]).to.equal(original[0]));
        });
      });
    });
  }
});
const GroupedMenu = ({ selection = false, icons = false }: { selection?: boolean; icons?: boolean }) => (
  <Menu persistOnItemClick hasIcons={icons}>
    <MenuTrigger disableButtonEnhancement>
      <button data-testid="trigger">Commands</button>
    </MenuTrigger>
    <MenuPopover>
      <MenuList>
        <MenuGroup data-testid="edit-group">
          <MenuGroupHeader data-testid="header">{selection ? 'Checkbox group' : 'Edit commands'}</MenuGroupHeader>
          {selection ? (
            <MenuItemCheckbox name="view" value="bar">
              Show Menu Bar
            </MenuItemCheckbox>
          ) : (
            <MenuItem icon={icons ? <CutRegular /> : undefined}>Cut</MenuItem>
          )}
          <MenuItem>Paste</MenuItem>
        </MenuGroup>
        <MenuDivider />
        <MenuGroup data-testid="view-group">
          <MenuGroupHeader data-testid="second-header">{selection ? 'Radio group' : 'View commands'}</MenuGroupHeader>
          {selection ? (
            <MenuItemRadio name="font" value="segoe">
              Segoe
            </MenuItemRadio>
          ) : (
            <MenuItem>Edit</MenuItem>
          )}
          {selection ? (
            <MenuItemRadio name="font" value="arial">
              Arial
            </MenuItemRadio>
          ) : (
            <MenuItem>View</MenuItem>
          )}
        </MenuGroup>
      </MenuList>
    </MenuPopover>
  </Menu>
);

function menu(selection = false, icons = false) {
  mount(
    <FluentProvider theme={webLightTheme}>
      <GroupedMenu selection={selection} icons={icons} />
    </FluentProvider>,
  );
  cy.get(trigger).realClick();
  cy.get('[role="menu"]').should('be.visible');
}

describe('MenuGroupHeader documented contracts', () => {
  it('renders the snapshot native div defaults with exact token paint and vertically centered content', () => {
    render({ children: <span data-testid="label">Section header</span> });
    cy.get(root)
      .should('have.prop', 'tagName', 'DIV')
      .and('have.class', 'fui-MenuGroupHeader')
      .and('have.attr', 'id', '');
    cy.get(root).should('not.have.attr', 'role');
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get(root)
      .should('have.css', 'height', '32px')
      .and('have.css', 'display', 'flex')
      .and('have.css', 'align-items', 'center');
    cy.get(root).should('have.css', 'padding-left', '8px').and('have.css', 'padding-right', '8px');
    cy.get(root)
      .should('have.css', 'font-size', webLightTheme.fontSizeBase200)
      .and('have.css', 'font-weight', String(webLightTheme.fontWeightSemibold))
      .and('have.css', 'color', rgb(webLightTheme.colorNeutralForeground3));
    cy.get(root).then(header => {
      cy.get('[data-testid="label"]').should(label => {
        const outer = header[0].getBoundingClientRect();
        const inner = label[0].getBoundingClientRect();
        expect(inner.top + inner.height / 2).to.equal(outer.top + outer.height / 2);
      });
    });
  });

  it('labels both documented logical menu groups with distinct real header ids and computed group names', () => {
    menu();
    cy.get('[data-testid="edit-group"]').should(group => {
      const header = group[0].querySelector('.fui-MenuGroupHeader')!;
      expect(header.id).not.to.equal('');
      expect(group.attr('aria-labelledby')).to.equal(header.id);
      expect(computeAccessibleName(group[0])).to.equal('Edit commands');
    });
    cy.get('[data-testid="view-group"]').should(group => {
      const header = group[0].querySelector('.fui-MenuGroupHeader')!;
      expect(group.attr('aria-labelledby')).to.equal(header.id);
      expect(computeAccessibleName(group[0])).to.equal('View commands');
    });
    cy.get(root).then(first => {
      cy.get('[data-testid="second-header"]').should(second => expect(second[0].id).not.to.equal(first[0].id));
    });
    cy.get('.fui-MenuDivider')
      .should('have.length', 1)
      .and('have.attr', 'role', 'presentation')
      .and('have.attr', 'aria-hidden', 'true');
  });

  it('skips headers during native menu Arrow navigation and returns focus to the trigger on Escape', () => {
    menu();
    cy.contains('[role="menuitem"]', 'Cut').focus();
    cy.realPress('ArrowDown');
    cy.contains('[role="menuitem"]', 'Paste').should('be.focused');
    cy.realPress('ArrowDown');
    cy.contains('[role="menuitem"]', 'Edit').should('be.focused');
    cy.get(root).should('not.be.focused');
    cy.get('[data-testid="second-header"]').should('not.be.focused');
    cy.realPress('ArrowUp');
    cy.contains('[role="menuitem"]', 'Paste').should('be.focused');
    cy.realPress('Escape');
    cy.get(trigger).should('be.focused');
    cy.get('[role="menu"]').should('not.exist');
  });

  it('keeps headers stable while checkbox and radio selection areas update independently', () => {
    menu(true);
    cy.get(root)
      .invoke('attr', 'id')
      .then(id => {
        cy.contains('[role="menuitemcheckbox"]', 'Show Menu Bar')
          .realClick()
          .should('have.attr', 'aria-checked', 'true');
        cy.get(root).should('have.id', id);
        cy.get('[data-testid="edit-group"]').should(group =>
          expect(computeAccessibleName(group[0])).to.equal('Checkbox group'),
        );
        cy.contains('[role="menuitemradio"]', 'Segoe').realClick().should('have.attr', 'aria-checked', 'true');
        cy.contains('[role="menuitemradio"]', 'Arial').realClick().should('have.attr', 'aria-checked', 'true');
        cy.contains('[role="menuitemradio"]', 'Segoe').should('have.attr', 'aria-checked', 'false');
        cy.get('[data-testid="view-group"]').should(group =>
          expect(computeAccessibleName(group[0])).to.equal('Radio group'),
        );
      });
  });

  it('is noninteractive and skipped by native forward and reverse Tab by default', () => {
    render();
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get('[data-testid="before"]').should('be.focused');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`inherits ${dir} direction without altering header padding or typography`, () => {
      render({}, dir);
      cy.get(root)
        .should('have.css', 'direction', dir)
        .and('have.css', 'padding-left', '8px')
        .and('have.css', 'padding-right', '8px')
        .and('have.css', 'font-size', webLightTheme.fontSizeBase200);
    });
  }

  it('preserves header geometry and group naming next to documented icon-bearing menu items', () => {
    menu(false, true);
    cy.get(root).should('have.css', 'height', '32px').and('have.css', 'padding-left', '8px');
    cy.contains('[role="menuitem"]', 'Cut').find('svg').should('be.visible');
    cy.get('[data-testid="edit-group"]').should(group =>
      expect(computeAccessibleName(group[0])).to.equal('Edit commands'),
    );
  });
});

describe('MenuGroupHeader supported native and context edges', () => {
  it('uses caller ids before context ids and restores context on direct omission', () => {
    const change = changing({ id: 'caller', children: 'Actions' }, 'context-a');
    cy.get(root).should('have.id', 'caller');
    change({ id: 'latest-caller', children: 'Actions' }, 'context-b');
    cy.get(root).should('have.id', 'latest-caller');
    change({ children: 'Actions' }, 'context-b');
    cy.get(root).should('have.id', 'context-b');
    change({ children: 'Actions' }, '');
    cy.get(root).should('have.attr', 'id', '');
  });

  it('uses the nearest provider without leaking its id to outer or standalone headers', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <MenuGroupContextProvider value={{ headerId: 'outer' }}>
          <MenuGroupHeader data-testid="outer">Outer</MenuGroupHeader>
          <MenuGroupContextProvider value={{ headerId: 'inner' }}>
            <MenuGroupHeader data-testid="header">Inner</MenuGroupHeader>
          </MenuGroupContextProvider>
        </MenuGroupContextProvider>
        <MenuGroupHeader data-testid="standalone">Standalone</MenuGroupHeader>
      </FluentProvider>,
    );
    cy.get(root).should('have.id', 'inner');
    cy.get('[data-testid="outer"]').should('have.id', 'outer');
    cy.get('[data-testid="standalone"]').should('have.attr', 'id', '');
  });

  it('updates the actual group accessible name while preserving generated id and root identity', () => {
    const tree = (children: React.ReactNode) => (
      <FluentProvider theme={webLightTheme}>
        <MenuGroup data-testid="group">
          <MenuGroupHeader data-testid="header">{children}</MenuGroupHeader>
          <p>Contents</p>
        </MenuGroup>
      </FluentProvider>
    );
    mount(tree('Actions')).then(({ rerender }) => {
      cy.get(root).then(original => {
        const id = original[0].id;
        cy.get('[data-testid="group"]').should(group => expect(computeAccessibleName(group[0])).to.equal('Actions'));
        cy.then(() => rerender(tree('Latest actions')));
        cy.get(root)
          .should('have.id', id)
          .should(header => expect(header[0]).to.equal(original[0]));
        cy.get('[data-testid="group"]').should(group =>
          expect(computeAccessibleName(group[0])).to.equal('Latest actions'),
        );
        cy.then(() =>
          rerender(
            tree(
              <>
                <strong>Rich</strong> actions
              </>,
            ),
          ),
        );
        cy.get('[data-testid="group"]').should(group =>
          expect(computeAccessibleName(group[0])).to.equal('Rich actions'),
        );
      });
    });
  });

  it('supports explicit matching caller group/header ids without assuming automatic group relabeling', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <MenuGroup aria-labelledby="custom-header" data-testid="group">
          <MenuGroupHeader id="custom-header" data-testid="header">
            Custom actions
          </MenuGroupHeader>
        </MenuGroup>
      </FluentProvider>,
    );
    cy.get(root).should('have.id', 'custom-header');
    cy.get('[data-testid="group"]').should(group => expect(computeAccessibleName(group[0])).to.equal('Custom actions'));
  });

  it('renders string, zero, empty, null and omitted children without stale content', () => {
    const change = changing({ children: 'Actions' });
    cy.get(root).should('have.text', 'Actions');
    change({ children: 0 });
    cy.get(root).should('have.text', '0');
    change({ children: '' });
    cy.get(root).should('have.text', '');
    change({ children: null });
    cy.get(root).should('have.text', '').and('have.css', 'height', '32px');
    change({});
    cy.get(root).should('have.text', '');
    change({ children: 'Restored' });
    cy.get(root).should('have.text', 'Restored');
  });

  it('preserves rich native descendants and does not absorb their normal Tab focus', () => {
    render({
      children: (
        <>
          <strong>Actions</strong>
          <button data-testid="help">Help</button>
        </>
      ),
    });
    cy.get(`${root} strong`).should('have.text', 'Actions');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="help"]').should('be.focused');
    cy.get(root).should('not.be.focused');
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
  });

  it('honors root render functions while preserving merged styles and the inherited id', () => {
    const custom: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props} data-rendered="yes">
        <strong>Rendered actions</strong>
      </Component>
    );
    const change = changing({ children: custom, className: 'consumer', title: 'Header title' }, 'context-id');
    cy.get(root)
      .should('have.id', 'context-id')
      .and('have.class', 'fui-MenuGroupHeader')
      .and('have.class', 'consumer')
      .and('have.attr', 'data-rendered', 'yes');
    cy.get(root)
      .should('have.attr', 'title', 'Header title')
      .and('have.text', 'Rendered actions')
      .and('have.css', 'height', '32px');
    change({ children: 'Regular actions' });
    cy.get(root).should('not.have.attr', 'data-rendered');
    cy.get(root).should('have.text', 'Regular actions').and('have.id', 'context-id');
  });

  it('forwards explicit native heading semantics, labels and descriptions without inventing defaults', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <p id="help-description">Keyboard commands</p>
        <MenuGroupHeader
          data-testid="header"
          role="heading"
          aria-level={2}
          aria-label="Actions heading"
          aria-describedby="help-description"
          title="Header title"
        >
          Actions
        </MenuGroupHeader>
      </FluentProvider>,
    );
    cy.get(root)
      .should('have.attr', 'role', 'heading')
      .and('have.attr', 'aria-level', '2')
      .and('have.attr', 'title', 'Header title');
    cy.get(root).should(header => {
      expect(computeAccessibleName(header[0])).to.equal('Actions heading');
      expect(computeAccessibleDescription(header[0])).to.equal('Keyboard commands');
    });
  });

  it('keeps user classes and inline overrides through changes and restores default omission', () => {
    const change = changing({
      children: 'Actions',
      className: 'consumer',
      style: { height: 48, opacity: 0.5 },
      role: 'presentation',
      title: 'Custom',
    });
    cy.get(root)
      .should('have.class', 'consumer')
      .and('have.css', 'height', '48px')
      .and('have.attr', 'role', 'presentation');
    change({ children: 'Latest', className: 'consumer', style: { height: 48, opacity: 0.5 } });
    cy.get(root).should('have.css', 'height', '48px').and('have.css', 'opacity', '0.5');
    cy.get(root).should('not.have.attr', 'role');
    change({ children: 'Actions' });
    cy.get(root).should('not.have.class', 'consumer').and('have.css', 'height', '32px').and('have.css', 'opacity', '1');
    cy.get(root).should('not.have.attr', 'title');
  });

  it('uses latest, removed and restored native click/key handlers on the same div', () => {
    const first = cy.spy().as('first');
    const latest = cy.spy().as('latest');
    const key = cy.spy().as('key');
    const change = changing({ children: 'Actions', tabIndex: 0, onClick: first, onKeyDown: key });
    cy.get(root).then(original => {
      cy.get(root).realClick();
      cy.realPress('Enter');
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@key').should('have.been.calledOnce');
      change({ children: 'Actions', tabIndex: 0, onClick: latest });
      cy.get(root).should(header => expect(header[0]).to.equal(original[0]));
      cy.get(root).realClick();
      cy.realPress('Enter');
      cy.get('@latest').should('have.been.calledOnce');
      cy.get('@key').should('have.been.calledOnce');
      change({ children: 'Actions', tabIndex: 0 });
      cy.get(root).realClick();
      cy.get('@latest').should('have.been.calledOnce');
      change({ children: 'Actions', tabIndex: 0, onClick: first, onKeyDown: key });
      cy.get(root).realClick();
      cy.realPress('Enter');
      cy.get('@first').should('have.been.calledTwice');
      cy.get('@key').should('have.been.calledTwice');
    });
  });

  it('does not treat native header hover as a menu-item focus/selection action', () => {
    menu();
    cy.contains('[role="menuitem"]', 'Paste').focus();
    cy.get(root).realHover();
    cy.contains('[role="menuitem"]', 'Paste').should('be.focused');
    cy.get(root).should('not.have.attr', 'aria-selected');
    cy.get(root).should('not.have.attr', 'tabindex');
  });

  it('passes axe for the real documented grouped menu markup', () => {
    menu();
    cy.get('[role="menu"]').then(async element => {
      // Tabster's focus sentinels are intentionally aria-hidden and outside the header contract.
      const results = await axe.run({
        include: [element[0]],
        exclude: ['[data-tabster-dummy]'],
      });
      expect(
        JSON.stringify(
          results.violations.map(violation => ({
            id: violation.id,
            nodes: violation.nodes.map(node => ({
              html: node.html,
              target: node.target,
              summary: node.failureSummary,
            })),
          })),
        ),
      ).to.equal('[]');
    });
  });
});
