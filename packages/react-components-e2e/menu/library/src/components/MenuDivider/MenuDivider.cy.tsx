import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme, teamsHighContrastTheme } from '@fluentui/react-theme';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuGroup, MenuGroupHeader } from '@fluentui/react-menu';
import { CutRegular } from '@fluentui/react-icons';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import { MenuDivider } from './MenuDivider';
import type { MenuDividerProps } from './MenuDivider.types';

const root = '[data-testid="divider"]';

function rgb(value: string) {
  expect(value, 'theme color token format').to.match(/^#[0-9a-f]{6}$/i);
  return `rgb(${[1, 3, 5].map(start => parseInt(value.slice(start, start + 2), 16)).join(', ')})`;
}

function render(props: MenuDividerProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <div data-testid="frame" style={{ width: 200 }}>
        <button data-testid="before">Before</button>
        <MenuDivider data-testid="divider" {...props} />
        <button data-testid="after">After</button>
      </div>
    </FluentProvider>,
  );
}

function menu(grouped = false, dir: 'ltr' | 'rtl' = 'ltr', onActivate?: React.MouseEventHandler<HTMLDivElement>) {
  const first = (
    <MenuItem icon={<CutRegular />} onClick={onActivate}>
      Cut
    </MenuItem>
  );
  const second = <MenuItem onClick={onActivate}>Paste</MenuItem>;
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <Menu persistOnItemClick hasIcons>
        <MenuTrigger disableButtonEnhancement>
          <button data-testid="trigger">Commands</button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {grouped ? (
              <MenuGroup data-testid="first-group">
                <MenuGroupHeader>Edit</MenuGroupHeader>
                {first}
              </MenuGroup>
            ) : (
              first
            )}
            <MenuDivider data-testid="divider" />
            {grouped ? (
              <MenuGroup data-testid="second-group">
                <MenuGroupHeader>Clipboard</MenuGroupHeader>
                {second}
              </MenuGroup>
            ) : (
              second
            )}
          </MenuList>
        </MenuPopover>
      </Menu>
    </FluentProvider>,
  );
  cy.get('[data-testid="trigger"]').realClick();
  cy.get('[role="menu"]').should('be.visible');
}

describe('MenuDivider documented compositions', () => {
  it('renders the native div snapshot defaults without interactive or separator semantics', () => {
    render({ children: 'Snapshot content' });
    cy.get(root).should('have.prop', 'tagName', 'DIV').and('have.class', 'fui-MenuDivider');
    cy.get(root)
      .should('have.attr', 'role', 'presentation')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.text', 'Snapshot content');
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get(root).should('not.have.attr', 'aria-orientation');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`extends the native divider rectangle five pixels beyond both edges in ${dir}`, () => {
      render({}, dir);
      cy.get(root)
        .should('have.css', 'direction', dir)
        .and('have.css', 'margin-top', '4px')
        .and('have.css', 'margin-bottom', '4px');
      cy.get(root).should('have.css', 'margin-left', '-5px').and('have.css', 'margin-right', '-5px');
      cy.get(root)
        .should('have.css', 'border-bottom-width', webLightTheme.strokeWidthThin)
        .and('have.css', 'border-bottom-style', 'solid');
      cy.get(root).should('have.css', 'border-bottom-color', rgb(webLightTheme.colorNeutralStroke2));
      cy.get('[data-testid="frame"]').then(frame => {
        cy.get(root).should(divider => {
          const outside = frame[0].getBoundingClientRect();
          const line = divider[0].getBoundingClientRect();
          expect(line.left).to.equal(outside.left - 5);
          expect(line.right).to.equal(outside.right + 5);
          expect(line.height).to.equal(1);
        });
      });
    });

    it(`is decorative between real icon-bearing menu items and skipped by arrow focus in ${dir}`, () => {
      menu(false, dir);
      cy.get(root).should('be.visible').and('have.attr', 'aria-hidden', 'true');
      cy.contains('[role="menuitem"]', 'Cut').find('svg').should('be.visible');
      cy.contains('[role="menuitem"]', 'Cut').focus();
      cy.realPress('ArrowDown');
      cy.contains('[role="menuitem"]', 'Paste').should('be.focused');
      cy.realPress('ArrowUp');
      cy.contains('[role="menuitem"]', 'Cut').should('be.focused');
      cy.get(root).should('not.be.focused');
      cy.realPress('Escape');
      cy.get('[data-testid="trigger"]').should('be.focused');
      cy.get('[role="menu"]').should('not.exist');
    });
  }

  it('does not replace the logical accessible groups in the grouping story', () => {
    menu(true);
    cy.get('[role="group"]').should('have.length', 2);
    cy.get('[data-testid="first-group"]').should(group => expect(computeAccessibleName(group[0])).to.equal('Edit'));
    cy.get('[data-testid="second-group"]').should(group =>
      expect(computeAccessibleName(group[0])).to.equal('Clipboard'),
    );
    cy.get(root).should('have.attr', 'role', 'presentation');
    cy.get(root).should(divider => expect(computeAccessibleName(divider[0])).to.equal(''));
  });

  it('is skipped by native forward and reverse Tab outside a menu', () => {
    render();
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get('[data-testid="before"]').should('be.focused');
  });

  it('does not select an item or close the menu when the visual line is hovered or clicked', () => {
    const activate = cy.spy().as('activate');
    menu(false, 'ltr', activate);
    cy.contains('[role="menuitem"]', 'Paste').focus();
    cy.get(root).realHover();
    cy.contains('[role="menuitem"]', 'Paste').should('be.focused');
    cy.get(root).realClick();
    cy.get('[role="menu"]').should('be.visible');
    cy.get(root).should('not.have.attr', 'aria-selected');
    cy.get('@activate').should('not.have.been.called');
    cy.contains('[role="menuitem"]', 'Paste').realClick();
    cy.get('@activate').should('have.been.calledOnce');
  });

  it('passes axe in the documented grouped menu except the independent Tabster focus sentinels', () => {
    menu(true);
    cy.get('[role="menu"]').then(async element => {
      const result = await axe.run({ include: [element[0]], exclude: ['[data-tabster-dummy]'] });
      expect(
        JSON.stringify(result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => node.html) }))),
      ).to.equal('[]');
    });
  });
});

describe('MenuDivider native and unit-informed browser contracts', () => {
  it('forwards an object ref to the rendered div and clears it on unmount', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(<MenuDivider ref={ref} data-testid="divider" />).then(({ rerender }) => {
      cy.get(root).should(divider => expect(ref.current).to.equal(divider[0]));
      cy.then(() => rerender(<></>));
      cy.get(root).should('not.exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
  });

  it('clears replaced callback refs while retaining root identity and clears the final ref', () => {
    const first = cy.spy().as('firstRef');
    const latest = cy.spy().as('latestRef');
    const tree = (ref: React.Ref<HTMLDivElement>) => <MenuDivider data-testid="divider" ref={ref} />;
    mount(tree(first)).then(({ rerender }) => {
      cy.get(root).then(divider => {
        const node = divider[0];
        cy.get('@firstRef').should('have.been.calledWith', node);
        cy.then(() => rerender(tree(latest)));
        cy.get(root).should(current => expect(current[0]).to.equal(node));
        cy.get('@firstRef').should('have.been.calledWith', null);
        cy.get('@latestRef').should('have.been.calledWith', node);
        cy.then(() => rerender(<></>));
        cy.get(root).should('not.exist');
        cy.get('@latestRef').should('have.been.calledWith', null);
      });
    });
  });

  it('honors caller semantic overrides and restores decorative defaults on omission', () => {
    const tree = (props: MenuDividerProps) => <MenuDivider data-testid="divider" {...props} />;
    mount(
      tree({
        role: 'separator',
        'aria-hidden': false,
        'aria-label': 'Section boundary',
        'aria-orientation': 'horizontal',
      }),
    ).then(({ rerender }) => {
      cy.get(root).should('have.attr', 'role', 'separator').and('have.attr', 'aria-hidden', 'false');
      cy.get(root).should(divider => expect(computeAccessibleName(divider[0])).to.equal('Section boundary'));
      cy.then(() => rerender(tree({})));
      cy.get(root).should('have.attr', 'role', 'presentation').and('have.attr', 'aria-hidden', 'true');
      cy.get(root).should('not.have.attr', 'aria-label');
      cy.get(root).should('not.have.attr', 'aria-orientation');
    });
  });

  it('forwards and removes native id title language and direction without replacing the root', () => {
    const tree = (props: MenuDividerProps) => <MenuDivider data-testid="divider" {...props} />;
    mount(tree({ id: 'first', title: 'Boundary', lang: 'fr', dir: 'rtl' })).then(({ rerender }) => {
      cy.get(root).then(divider => {
        cy.get(root)
          .should('have.id', 'first')
          .and('have.attr', 'title', 'Boundary')
          .and('have.attr', 'lang', 'fr')
          .and('have.css', 'direction', 'rtl');
        cy.then(() => rerender(tree({ id: 'latest', lang: 'en', dir: 'ltr' })));
        cy.get(root).should('have.id', 'latest').and('have.attr', 'lang', 'en').and('have.css', 'direction', 'ltr');
        cy.get(root).should('not.have.attr', 'title');
        cy.then(() => rerender(tree({})));
        cy.get(root).should('not.have.attr', 'id');
        cy.get(root).should('not.have.attr', 'lang');
        cy.get(root).should('not.have.attr', 'dir');
        cy.get(root).should(current => expect(current[0]).to.equal(divider[0]));
      });
    });
  });

  it('retains consumer classes and inline overrides then restores token paint and spacing', () => {
    const tree = (props: MenuDividerProps) => (
      <FluentProvider theme={webLightTheme}>
        <MenuDivider data-testid="divider" {...props} />
      </FluentProvider>
    );
    mount(
      tree({ className: 'consumer', style: { margin: '12px 0', borderBottom: '3px dotted rgb(10, 20, 30)' } }),
    ).then(({ rerender }) => {
      cy.get(root)
        .should('have.class', 'consumer')
        .and('have.class', 'fui-MenuDivider')
        .and('have.css', 'margin-top', '12px')
        .and('have.css', 'margin-left', '0px');
      cy.get(root)
        .should('have.css', 'border-bottom-width', '3px')
        .and('have.css', 'border-bottom-style', 'dotted')
        .and('have.css', 'border-bottom-color', 'rgb(10, 20, 30)');
      cy.then(() => rerender(tree({})));
      cy.get(root).should('not.have.class', 'consumer');
      cy.get(root)
        .should('have.class', 'fui-MenuDivider')
        .and('have.css', 'margin-top', '4px')
        .and('have.css', 'margin-left', '-5px');
      cy.get(root)
        .should('have.css', 'border-bottom-width', '1px')
        .and('have.css', 'border-bottom-style', 'solid')
        .and('have.css', 'border-bottom-color', rgb(webLightTheme.colorNeutralStroke2));
    });
  });

  it('renders zero empty null omitted and restored children without stale content', () => {
    const tree = (children?: React.ReactNode) => <MenuDivider data-testid="divider">{children}</MenuDivider>;
    mount(tree('Content')).then(({ rerender }) => {
      for (const [value, text] of [
        [0, '0'],
        ['', ''],
        [null, ''],
        [undefined, ''],
        ['Restored', 'Restored'],
      ] as const) {
        cy.then(() => rerender(tree(value)));
        cy.get(root).should('have.text', text).and('have.attr', 'aria-hidden', 'true');
      }
    });
  });

  it('retains rich descendant identity during root native updates without adding semantics', () => {
    const tree = (title: string) => (
      <MenuDivider data-testid="divider" title={title}>
        <strong data-testid="content">Visual content</strong>
      </MenuDivider>
    );
    mount(tree('First')).then(({ rerender }) => {
      cy.get('[data-testid="content"]').then(child => {
        cy.then(() => rerender(tree('Latest')));
        cy.get(root).should('have.attr', 'title', 'Latest').and('have.attr', 'aria-hidden', 'true');
        cy.get('[data-testid="content"]').should(current => expect(current[0]).to.equal(child[0]));
      });
    });
  });

  it('supports root render functions with merged native props styles and refs', () => {
    const ref = React.createRef<HTMLDivElement>();
    const custom: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <span>Custom visual content</span>
      </Component>
    );
    mount(
      <FluentProvider theme={webLightTheme}>
        <MenuDivider data-testid="divider" ref={ref} id="custom" className="consumer" children={custom} />
      </FluentProvider>,
    ).then(({ rerender }) => {
      cy.get(root)
        .should('have.id', 'custom')
        .and('have.class', 'consumer')
        .and('have.class', 'fui-MenuDivider')
        .and('have.attr', 'data-rendered', 'true')
        .and('have.text', 'Custom visual content');
      cy.get(root).should('have.attr', 'aria-hidden', 'true').and('have.css', 'border-bottom-width', '1px');
      cy.get(root).should(divider => expect(ref.current).to.equal(divider[0]));
      cy.then(() =>
        rerender(
          <MenuDivider data-testid="divider" ref={ref}>
            Regular content
          </MenuDivider>,
        ),
      );
      cy.get(root).should('have.text', 'Regular content');
      cy.get(root).should('not.have.attr', 'data-rendered');
      cy.get(root).should(divider => expect(ref.current).to.equal(divider[0]));
    });
  });

  it('preserves the supported explicit as div and updates children on the same root', () => {
    mount(
      <MenuDivider data-testid="divider" as="div">
        First
      </MenuDivider>,
    ).then(({ rerender }) => {
      cy.get(root).then(divider => {
        cy.then(() => rerender(<MenuDivider data-testid="divider">Latest</MenuDivider>));
        cy.get(root).should('have.prop', 'tagName', 'DIV').and('have.text', 'Latest');
        cy.get(root).should(current => expect(current[0]).to.equal(divider[0]));
      });
    });
  });

  it('honors latest removed and restored native handlers without inventing keyboard clicks', () => {
    const first = cy.spy().as('first');
    const latest = cy.spy().as('latest');
    const key = cy.spy().as('key');
    const tree = (
      onClick?: React.MouseEventHandler<HTMLDivElement>,
      onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>,
    ) => (
      <MenuDivider
        data-testid="divider"
        aria-hidden={false}
        tabIndex={0}
        style={{ height: 20 }}
        onClick={onClick}
        onKeyDown={onKeyDown}
      />
    );
    mount(tree(first, key)).then(({ rerender }) => {
      cy.get(root).realClick();
      cy.get(root).focus();
      cy.realPress('Enter');
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@key').should('have.been.calledOnce');
      cy.then(() => rerender(tree(latest)));
      cy.get(root).realClick();
      cy.get(root).focus();
      cy.realPress('Enter');
      cy.get('@latest').should('have.been.calledOnce');
      cy.get('@key').should('have.been.calledOnce');
      cy.then(() => rerender(tree()));
      cy.get(root).realClick();
      cy.get('@latest').should('have.been.calledOnce');
      cy.then(() => rerender(tree(first, key)));
      cy.get(root).realClick();
      cy.get(root).focus();
      cy.realPress('Enter');
      cy.get('@first').should('have.been.calledTwice');
      cy.get('@key').should('have.been.calledTwice');
    });
  });

  for (const [name, theme] of [
    ['dark', webDarkTheme],
    ['high contrast', teamsHighContrastTheme],
  ] as const) {
    it(`updates ${name} provider border tokens without changing geometry or root identity`, () => {
      const tree = (value: typeof webLightTheme) => (
        <FluentProvider theme={value}>
          <MenuDivider data-testid="divider" />
        </FluentProvider>
      );
      mount(tree(webLightTheme)).then(({ rerender }) => {
        cy.get(root).then(divider => {
          const original = divider[0].getBoundingClientRect();
          cy.then(() => rerender(tree(theme)));
          cy.get(root)
            .should('have.css', 'border-bottom-color', rgb(theme.colorNeutralStroke2))
            .and('have.css', 'border-bottom-width', theme.strokeWidthThin)
            .and('have.css', 'margin-left', '-5px');
          cy.get(root).should(current => {
            expect(current[0]).to.equal(divider[0]);
            const rectangle = current[0].getBoundingClientRect();
            expect(rectangle.width).to.equal(original.width);
            expect(rectangle.height).to.equal(original.height);
          });
          cy.then(() => rerender(tree(webLightTheme)));
          cy.get(root).should('have.css', 'border-bottom-color', rgb(webLightTheme.colorNeutralStroke2));
        });
      });
    });
  }
});

describe('MenuDivider browser layout edges', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    it(`tracks parent resizing without stale width in ${dir}`, () => {
      const tree = (width: number) => (
        <FluentProvider theme={webLightTheme} dir={dir}>
          <div data-testid="frame" style={{ width }}>
            <MenuDivider data-testid="divider" />
          </div>
        </FluentProvider>
      );
      mount(tree(200)).then(({ rerender }) => {
        cy.get(root).should(divider => expect(divider[0].getBoundingClientRect().width).to.equal(210));
        cy.then(() => rerender(tree(80)));
        cy.get('[data-testid="frame"]').then(frame => {
          cy.get(root).should(divider => {
            const outside = frame[0].getBoundingClientRect();
            const line = divider[0].getBoundingClientRect();
            expect(line.width).to.equal(90);
            expect(line.left).to.equal(outside.left - 5);
            expect(line.right).to.equal(outside.right + 5);
          });
        });
      });
    });
  }
});
