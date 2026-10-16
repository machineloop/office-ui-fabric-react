import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import type { ExtractSlotProps, SlotRenderFunction } from '@fluentui/react-utilities';
import { Divider } from './Divider';
import type { DividerProps, DividerSlots, DividerState } from './Divider.types';
import { dividerClassNames } from './useDividerStyles.styles';
import { useOverrides } from './Divider.cy.styles';

const root = '[data-testid="divider"]';
const wrapper = `.${dividerClassNames.wrapper}`;
const hostWidth = 480;
const hostHeight = 240;

function render(props: DividerProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <div
        data-testid="host"
        style={
          props.vertical
            ? { display: 'flex', flexDirection: 'column', alignItems: 'center', height: hostHeight, width: hostWidth }
            : { width: hostWidth }
        }
      >
        <Divider data-testid="divider" {...props} />
      </div>
    </FluentProvider>,
  );
}

function assertName(text: string) {
  cy.get(root).should($root => {
    const id = $root.attr('aria-labelledby');
    expect(id, 'label relationship').to.be.a('string').and.not.equal('');
    const label = $root[0].ownerDocument.getElementById(id!);
    expect(label, 'label target').to.equal($root.find(wrapper)[0]);
    expect(label?.textContent).to.equal(text);
  });
}

function assertAlignment(vertical: boolean, alignment: 'start' | 'center' | 'end', dir: 'ltr' | 'rtl') {
  cy.get(root).should($root => {
    const bounds = $root[0].getBoundingClientRect();
    const content = $root.find(wrapper)[0].getBoundingClientRect();
    const start = vertical ? content.top - bounds.top : content.left - bounds.left;
    const end = vertical ? bounds.bottom - content.bottom : bounds.right - content.right;
    const reversed = !vertical && dir === 'rtl';
    if (alignment === 'center') {
      expect(start, 'balanced line space around label').to.be.closeTo(end, 1);
    } else if ((alignment === 'start') !== reversed) {
      expect(start, 'short start segment and gap').to.be.closeTo(20, 1);
      expect(end, 'long opposite segment').to.be.greaterThan(start * 3);
    } else {
      expect(end, 'short end segment and gap').to.be.closeTo(20, 1);
      expect(start, 'long opposite segment').to.be.greaterThan(end * 3);
    }
    expect(content.width).to.be.greaterThan(0);
    expect(content.height).to.be.greaterThan(0);
  });
}

const Overrides = () => {
  const styles = useOverrides();
  return (
    <FluentProvider theme={teamsLightTheme}>
      <Divider data-testid="width" className={styles.width}>
        Width
      </Divider>
      <Divider data-testid="height" vertical className={styles.height}>
        Height
      </Divider>
      <Divider data-testid="font" className={styles.font}>
        Font
      </Divider>
      <Divider data-testid="line" appearance="brand" className={styles.line}>
        Line
      </Divider>
      <Divider data-testid="control">Control</Divider>
    </FluentProvider>
  );
};

describe('Divider documented scenarios', () => {
  it('renders a full-width, noninteractive horizontal separator without content', () => {
    render();
    cy.get(root)
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'separator')
      .and('have.attr', 'aria-orientation', 'horizontal')
      .and('not.have.attr', 'aria-labelledby');
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get(root).find(wrapper).should('not.exist');
    cy.get(root).should($root => {
      expect($root[0].getBoundingClientRect().width).to.equal(hostWidth);
      expect($root[0].getBoundingClientRect().height).to.equal(1);
    });
  });
});

describe('Divider content boundaries and accessibility', () => {
  const boundaries: { name: string; content: React.ReactNode; text: string; labeled: boolean }[] = [
    { name: 'undefined', content: undefined, text: '', labeled: false },
    { name: 'null', content: null, text: '', labeled: false },
    { name: 'false', content: false, text: '', labeled: false },
    { name: 'true', content: true, text: '', labeled: true },
    { name: 'empty string', content: '', text: '', labeled: false },
    { name: 'zero', content: 0, text: '0', labeled: false },
    { name: 'nonzero number', content: 7, text: '7', labeled: true },
    { name: 'whitespace', content: ' ', text: ' ', labeled: true },
    { name: 'empty fragment', content: <></>, text: '', labeled: true },
    { name: 'empty array', content: [], text: '', labeled: true },
    {
      name: 'mixed array',
      content: ['Count ', 0, null, false, <span key="end"> items</span>],
      text: 'Count 0 items',
      labeled: true,
    },
  ];
  for (const { name, content, text, labeled } of boundaries) {
    it(`preserves the source-defined presence boundary for ${name}`, () => {
      render({ vertical: true, children: content, style: { flexGrow: 0 } });
      cy.get(root).should('have.attr', 'role', 'separator').and('have.attr', 'aria-orientation', 'vertical');
      if (content === undefined) {
        cy.get(root).find(wrapper).should('not.exist');
      } else {
        cy.get(root).find(wrapper).should('exist').and('have.text', text);
      }
      if (labeled) {
        assertName(text);
      } else {
        cy.get(root).should('not.have.attr', 'aria-labelledby');
      }
      cy.get(root).should($root => {
        expect($root[0].getBoundingClientRect().height).to.equal(content === undefined ? 20 : 84);
      });
    });
  }

  it('gives independent instances unique, local label relationships', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Divider data-testid="first">First</Divider>
        <Divider data-testid="second" vertical>
          Second
        </Divider>
        <Divider data-testid="empty" />
      </FluentProvider>,
    );
    cy.get('[role="separator"]')
      .should('have.length', 3)
      .then($nodes => {
        const firstId = $nodes[0].getAttribute('aria-labelledby');
        const secondId = $nodes[1].getAttribute('aria-labelledby');
        expect(firstId).not.to.equal(secondId);
        expect($nodes[0].querySelector(wrapper)?.id).to.equal(firstId);
        expect($nodes[1].querySelector(wrapper)?.id).to.equal(secondId);
        expect($nodes[2].getAttribute('aria-labelledby')).to.equal(null);
      });
  });

  it('preserves external accessible names and descriptions instead of replacing them', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <span id="external-name">Results</span>
        <p id="external-description">Separates current and archived results</p>
        <Divider data-testid="divider" aria-labelledby="external-name" aria-describedby="external-description">
          Archive
        </Divider>
      </FluentProvider>,
    );
    cy.get(root)
      .should('have.attr', 'aria-labelledby', 'external-name')
      .and('have.attr', 'aria-describedby', 'external-description');
    cy.get('#external-name').should('have.text', 'Results');
    cy.get('#external-description').should('have.text', 'Separates current and archived results');
    cy.get(root).find(wrapper).should('have.text', 'Archive').and('not.have.attr', 'id', 'external-name');
  });

  it('supports an explicit name for an icon-only separator', () => {
    render({
      'aria-label': 'Archived section',
      'aria-labelledby': undefined,
      children: (
        <svg aria-hidden="true" width="16" height="16">
          <path d="M0 0h16v16H0z" />
        </svg>
      ),
    });
    cy.get(root).should('have.attr', 'aria-label', 'Archived section').and('not.have.attr', 'aria-labelledby');
    cy.get(root).find('svg').should('have.attr', 'aria-hidden', 'true').and('be.visible');
  });

  it('allows decorative presentation semantics and native orientation overrides', () => {
    render({ vertical: true, role: 'presentation', 'aria-hidden': true, 'aria-orientation': 'horizontal' });
    cy.get(root)
      .should('have.attr', 'role', 'presentation')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.attr', 'aria-orientation', 'horizontal');
    cy.get(root).should($root => expect($root[0].getBoundingClientRect().height).to.equal(hostHeight));
  });

  it('is skipped by real forward and backward Tab navigation', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <button data-testid="before">Before</button>
        <Divider data-testid="divider">Section</Divider>
        <Divider data-testid="empty" vertical />
        <button data-testid="after">After</button>
      </FluentProvider>,
    );
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get('[data-testid="before"]').should('be.focused');
    cy.get(root).should('not.have.attr', 'aria-valuenow');
    cy.get(root).find(wrapper).should('not.have.attr', 'tabindex');
  });

  it('keeps a custom wrapper id as the generated label target', () => {
    render({ children: 'Custom label', wrapper: { id: 'custom-divider-label' } });
    cy.get(root).find(wrapper).should('have.attr', 'id', 'custom-divider-label');
    assertName('Custom label');
  });

  it('updates orientation, alignment, inset, appearance and direction without replacing the root', () => {
    const Dynamic = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme} dir={updated ? 'rtl' : 'ltr'}>
          <button onClick={() => setUpdated(value => !value)}>Update fixture</button>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: hostWidth,
              height: hostHeight,
            }}
          >
            <Divider
              data-testid="divider"
              vertical={updated}
              inset={updated}
              alignContent={updated ? 'end' : 'start'}
              appearance={updated ? 'brand' : 'default'}
            >
              {updated ? 'Updated' : 'Initial'}
            </Divider>
          </div>
        </FluentProvider>
      );
    };
    mount(<Dynamic />);
    let original: HTMLElement;
    let labelId: string | undefined;
    cy.get(root).then($node => {
      original = $node[0];
      labelId = $node.attr('aria-labelledby');
    });
    assertAlignment(false, 'start', 'ltr');
    cy.contains('button', 'Update fixture').click();
    cy.get(root).should('have.attr', 'aria-orientation', 'vertical').and('have.text', 'Updated');
    assertAlignment(true, 'end', 'rtl');
    cy.get(root).should($node => {
      expect($node[0]).to.equal(original);
      expect($node.attr('aria-labelledby')).to.equal(labelId);
      expect($node[0].getBoundingClientRect().height).to.equal(hostHeight - 24);
      const node = $node[0];
      const probe = node.ownerDocument.createElement('span');
      probe.style.color = teamsLightTheme.colorBrandForeground1;
      node.appendChild(probe);
      expect(node.ownerDocument.defaultView!.getComputedStyle(node).color).to.equal(
        node.ownerDocument.defaultView!.getComputedStyle(probe).color,
      );
      probe.remove();
    });
    assertName('Updated');
    cy.contains('button', 'Update fixture').click();
    cy.get(root).should('have.attr', 'aria-orientation', 'horizontal').and('have.text', 'Initial');
    assertAlignment(false, 'start', 'ltr');
    cy.get(root).should($node => expect($node[0].getBoundingClientRect().width).to.equal(hostWidth));
  });

  it('adds and removes the wrapper and label relationship as content changes', () => {
    const DynamicContent = () => {
      const [content, setContent] = React.useState<React.ReactNode>(undefined);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button onClick={() => setContent('Added')}>Add</button>
          <button onClick={() => setContent(null)}>Null</button>
          <button onClick={() => setContent(undefined)}>Remove</button>
          <Divider data-testid="divider" vertical>
            {content}
          </Divider>
        </FluentProvider>
      );
    };
    mount(<DynamicContent />);
    cy.get(root).find(wrapper).should('not.exist');
    cy.contains('button', 'Add').click();
    assertName('Added');
    let id: string | undefined;
    cy.get(root)
      .invoke('attr', 'aria-labelledby')
      .then(value => {
        id = value;
      });
    cy.contains('button', 'Null').click();
    cy.get(root).find(wrapper).should('exist').and('have.text', '');
    cy.get(root).should('not.have.attr', 'aria-labelledby');
    cy.contains('button', 'Remove').click();
    cy.get(root).find(wrapper).should('not.exist');
    cy.contains('button', 'Add').click();
    assertName('Added');
    cy.get(root).should($node => expect($node.attr('aria-labelledby')).to.equal(id));
  });
});

describe('Divider documented layout and content scenarios', () => {
  it('centers the default text label and links separator semantics to its wrapper', () => {
    render({ children: 'Section' });
    cy.get(root).should('have.class', dividerClassNames.root);
    assertName('Section');
    assertAlignment(false, 'center', 'ltr');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const vertical of [false, true]) {
      for (const alignContent of ['start', 'center', 'end'] as const) {
        it(`positions ${alignContent} content in ${vertical ? 'vertical' : 'horizontal'} ${dir} layout`, () => {
          render({ vertical, alignContent, children: 'Group' }, dir);
          cy.get(root).should('have.attr', 'aria-orientation', vertical ? 'vertical' : 'horizontal');
          assertName('Group');
          assertAlignment(vertical, alignContent, dir);
          cy.get(root).should($root => {
            const bounds = $root[0].getBoundingClientRect();
            expect(vertical ? bounds.height : bounds.width).to.equal(vertical ? hostHeight : hostWidth);
          });
        });
      }
    }
  }

  for (const vertical of [false, true]) {
    for (const withContent of [false, true]) {
      it(`insets ${vertical ? 'vertical' : 'horizontal'} ${withContent ? 'labeled' : 'childless'} lines`, () => {
        render({ vertical, inset: true, children: withContent ? 'Inset' : undefined, alignContent: 'start' });
        cy.get(root).should($root => {
          const node = $root[0];
          const bounds = node.getBoundingClientRect();
          const host = node.parentElement!.getBoundingClientRect();
          if (vertical) {
            expect(bounds.top - host.top).to.equal(12);
            expect(host.bottom - bounds.bottom).to.equal(12);
            expect(bounds.height).to.equal(hostHeight - 24);
          } else {
            expect(bounds.width).to.equal(hostWidth);
            // Pseudo-elements paint the line; unlike real elements they have no DOM rect.
            const view = node.ownerDocument.defaultView!;
            const before = view.getComputedStyle(node, '::before');
            const after = view.getComputedStyle(node, '::after');
            expect(
              parseFloat(before.width) +
                parseFloat(after.width) +
                (withContent ? $root.find(wrapper)[0].getBoundingClientRect().width + 24 : 0),
            ).to.be.closeTo(hostWidth - 24, 1);
            if (withContent) {
              expect($root.find(wrapper)[0].getBoundingClientRect().left - bounds.left).to.equal(32);
            }
          }
        });
        cy.get(root)
          .find(wrapper)
          .should(withContent ? 'exist' : 'not.exist');
      });
    }
  }

  const appearances = {
    default: [teamsLightTheme.colorNeutralForeground2, teamsLightTheme.colorNeutralStroke2],
    subtle: [teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorNeutralStroke3],
    brand: [teamsLightTheme.colorBrandForeground1, teamsLightTheme.colorBrandStroke1],
    strong: [teamsLightTheme.colorNeutralForeground1, teamsLightTheme.colorNeutralStroke1],
  };
  for (const appearance of ['default', 'subtle', 'brand', 'strong'] as const) {
    it(`applies the ${appearance} appearance to label and both painted line segments`, () => {
      render({ appearance, children: 'Appearance' });
      cy.get(root).should($root => {
        const node = $root[0];
        const view = node.ownerDocument.defaultView!;
        const probe = node.ownerDocument.createElement('span');
        node.appendChild(probe);
        probe.style.color = appearances[appearance][0];
        expect(view.getComputedStyle(node).color).to.equal(view.getComputedStyle(probe).color);
        probe.style.color = appearances[appearance][1];
        for (const pseudo of ['::before', '::after']) {
          expect(view.getComputedStyle(node, pseudo).borderTopColor).to.equal(view.getComputedStyle(probe).color);
          expect(view.getComputedStyle(node, pseudo).borderTopWidth).to.equal('1px');
        }
        probe.remove();
      });
      assertName('Appearance');
      assertAlignment(false, 'center', 'ltr');
    });
  }

  it('renders an accessible icon and mixed custom content without replacing its markup', () => {
    render({
      children: (
        <>
          <svg data-testid="icon" role="img" aria-label="Archive" width="16" height="16">
            <title>Archive</title>
            <path d="M0 0h16v16H0z" />
          </svg>
          <strong data-testid="custom">Archived items</strong>
        </>
      ),
    });
    cy.get(root)
      .find(wrapper)
      .find('[data-testid="icon"]')
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Archive');
    cy.get(root).find('strong').should('have.text', 'Archived items');
    assertName('ArchiveArchived items');
    assertAlignment(false, 'center', 'ltr');
  });

  it('supports all documented custom width, height, font and line style overrides', () => {
    mount(<Overrides />);
    cy.get('[data-testid="width"]').should($node => expect($node[0].getBoundingClientRect().width).to.equal(200));
    cy.get('[data-testid="height"]').should($node => expect($node[0].getBoundingClientRect().height).to.equal(50));
    cy.get('[data-testid="font"]')
      .should('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
      .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightBold));
    cy.get('[data-testid="line"]').should($node => {
      const node = $node[0];
      const view = node.ownerDocument.defaultView!;
      const probe = node.ownerDocument.createElement('span');
      probe.style.color = teamsLightTheme.colorPaletteRedBorder2;
      node.appendChild(probe);
      for (const pseudo of ['::before', '::after']) {
        expect(view.getComputedStyle(node, pseudo).borderTopStyle).to.equal('dashed');
        expect(view.getComputedStyle(node, pseudo).borderTopWidth).to.equal(teamsLightTheme.strokeWidthThick);
        expect(view.getComputedStyle(node, pseudo).borderTopColor).to.equal(view.getComputedStyle(probe).color);
      }
      probe.remove();
    });
    cy.get('[data-testid="control"]').should($node => {
      expect($node[0].ownerDocument.defaultView!.getComputedStyle($node[0], '::before').borderTopStyle).to.equal(
        'solid',
      );
      expect($node[0].getBoundingClientRect().width).to.be.greaterThan(200);
    });
  });
});

describe('Divider unit and source-derived contracts', () => {
  it('forwards native root props and the object ref to the actual div', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Divider
          ref={ref}
          data-testid="divider"
          id="native-divider"
          title="Section boundary"
          lang="fr"
          className="consumer-root"
          style={{ width: 100 }}
        >
          Groupe
        </Divider>
      </FluentProvider>,
    );
    cy.get(root)
      .should('have.attr', 'id', 'native-divider')
      .and('have.attr', 'title', 'Section boundary')
      .and('have.attr', 'lang', 'fr')
      .and('have.class', 'consumer-root')
      .and('have.class', dividerClassNames.root);
    cy.get(root).should($node => {
      expect(ref.current).to.equal($node[0]);
      expect($node[0].getBoundingClientRect().width).to.equal(100);
    });
    assertName('Groupe');
  });

  it('forwards wrapper props, classes, style and ref while keeping root children authoritative', () => {
    const ref = React.createRef<HTMLDivElement>();
    render({
      children: 'Root content',
      wrapper: {
        ref,
        className: 'consumer-wrapper',
        title: 'Label wrapper',
        style: { width: 120 },
        children: 'Ignored slot shorthand content',
      },
    });
    cy.get(root)
      .find(wrapper)
      .should('have.class', 'consumer-wrapper')
      .and('have.attr', 'title', 'Label wrapper')
      .and('have.text', 'Root content');
    cy.get(root)
      .find(wrapper)
      .should($node => {
        expect(ref.current).to.equal($node[0]);
        expect($node[0].getBoundingClientRect().width).to.equal(120);
      });
    assertName('Root content');
    assertAlignment(false, 'center', 'ltr');
  });

  it('does not materialize a wrapper from its shorthand alone without root content', () => {
    render({ wrapper: 'Slot-only text' });
    cy.get(root).find(wrapper).should('not.exist');
    cy.get(root).should('have.text', '').and('not.have.attr', 'aria-labelledby');
  });

  it('supports wrapper render-function customization without losing label semantics', () => {
    const renderWrapper: SlotRenderFunction<ExtractSlotProps<DividerSlots['wrapper']>> = (Component, props) => (
      <Component {...props} data-testid="rendered-wrapper">
        <em>{props.children}</em>
      </Component>
    );
    render({
      children: 'Custom render',
      wrapper: {
        children: renderWrapper,
      },
    });
    cy.get(root).find('[data-testid="rendered-wrapper"]').should('have.class', dividerClassNames.wrapper);
    cy.get(root).find('em').should('have.text', 'Custom render');
    assertName('Custom render');
    assertAlignment(false, 'center', 'ltr');
  });

  it('updates a custom wrapper id and preserves an explicit external labeling override', () => {
    const IdFixture = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <span id="external">External label</span>
          <button onClick={() => setUpdated(true)}>Update IDs</button>
          <Divider data-testid="divider" wrapper={{ id: updated ? 'updated-wrapper' : 'initial-wrapper' }}>
            Label
          </Divider>
          <Divider
            data-testid="external-divider"
            wrapper={{ id: updated ? 'other-updated' : 'other-initial' }}
            aria-labelledby="external"
          >
            Internal label
          </Divider>
        </FluentProvider>
      );
    };
    mount(<IdFixture />);
    assertName('Label');
    cy.get(root).should('have.attr', 'aria-labelledby', 'initial-wrapper');
    cy.contains('button', 'Update IDs').click();
    cy.get(root).should('have.attr', 'aria-labelledby', 'updated-wrapper');
    assertName('Label');
    cy.get('[data-testid="external-divider"]').should('have.attr', 'aria-labelledby', 'external');
    cy.get('[data-testid="external-divider"]').find(wrapper).should('have.attr', 'id', 'other-updated');
  });

  it('forwards native events with the latest handlers without adding separator interaction', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const wrapperClick = cy.stub().as('wrapperClick');
    const NativeEvents = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button onClick={() => setUpdated(true)}>Replace handler</button>
          <Divider data-testid="divider" onClick={updated ? latest : first} wrapper={{ onClick: wrapperClick }}>
            Native event
          </Divider>
        </FluentProvider>
      );
    };
    mount(<NativeEvents />);
    cy.get(root).click('left');
    cy.get('@first').should('have.been.calledOnce');
    cy.get('@wrapperClick').should('not.have.been.called');
    cy.contains('button', 'Replace handler').click();
    cy.get(root).find(wrapper).click();
    cy.get('@latest').should('have.been.calledOnce');
    cy.get('@wrapperClick').should('have.been.calledOnce');
    cy.get('@first').should('have.been.calledOnce');
    cy.get(root).should('have.attr', 'role', 'separator').and('not.have.attr', 'tabindex');
    assertName('Native event');
  });

  it('clears root and wrapper refs on unmount and reconnects on remount', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const wrapperRef = React.createRef<HTMLDivElement>();
    const Lifecycle = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button onClick={() => setVisible(value => !value)}>Toggle fixture</button>
          {visible && (
            <Divider data-testid="divider" ref={rootRef} wrapper={{ ref: wrapperRef }}>
              Lifecycle
            </Divider>
          )}
        </FluentProvider>
      );
    };
    mount(<Lifecycle />);
    let original: HTMLElement;
    cy.get(root).then($node => {
      original = $node[0];
      expect(rootRef.current).to.equal(original);
    });
    cy.get(root)
      .find(wrapper)
      .then($node => expect(wrapperRef.current).to.equal($node[0]));
    cy.contains('button', 'Toggle fixture').click();
    cy.get(root)
      .should('not.exist')
      .then(() => {
        expect(rootRef.current).to.equal(null);
        expect(wrapperRef.current).to.equal(null);
        expect(original.isConnected).to.equal(false);
      });
    cy.contains('button', 'Toggle fixture').click();
    cy.get(root).should($node => {
      expect(rootRef.current).to.equal($node[0]);
      expect($node[0]).not.to.equal(original);
    });
    cy.get(root)
      .find(wrapper)
      .should($node => expect(wrapperRef.current).to.equal($node[0]));
    assertName('Lifecycle');
  });

  for (const vertical of [false, true]) {
    it(`honors the unit-derived fixed ${vertical ? 'height' : 'width'} without flex growth`, () => {
      render({
        vertical,
        style: vertical ? { height: 100, flexGrow: 0 } : { width: 100 },
        children: vertical ? 'Height' : 'Width',
      });
      cy.get(root).should($node => {
        const bounds = $node[0].getBoundingClientRect();
        expect(vertical ? bounds.height : bounds.width).to.equal(100);
      });
      assertAlignment(vertical, 'center', 'ltr');
    });
  }

  it('preserves the native color attribute without treating it as a divider appearance prop', () => {
    render({ color: teamsLightTheme.colorPaletteRedForeground1, children: 'Native color' });
    cy.get(root).should('have.attr', 'color', teamsLightTheme.colorPaletteRedForeground1);
    cy.get(root).should($node => {
      const node = $node[0];
      const probe = node.ownerDocument.createElement('span');
      probe.style.color = teamsLightTheme.colorNeutralForeground2;
      node.appendChild(probe);
      expect(node.ownerDocument.defaultView!.getComputedStyle(node).color).to.equal(
        node.ownerDocument.defaultView!.getComputedStyle(probe).color,
      );
      probe.remove();
    });
  });

  it('keeps the documented custom max-height subject to the labeled vertical minimum', () => {
    render({ vertical: true, style: { maxHeight: 50 }, children: 'Max height' });
    cy.get(root).should($node => expect($node[0].getBoundingClientRect().height).to.equal(84));
    cy.get(root).find(wrapper).should('be.visible');
  });

  it('grows and shrinks with a resized layout container without losing centered content', () => {
    const ResizeFixture = () => {
      const [small, setSmall] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme}>
          <button onClick={() => setSmall(value => !value)}>Resize fixture</button>
          <div style={{ width: small ? 240 : hostWidth }}>
            <Divider data-testid="divider">Resize</Divider>
          </div>
        </FluentProvider>
      );
    };
    mount(<ResizeFixture />);
    cy.get(root).should($node => expect($node[0].getBoundingClientRect().width).to.equal(hostWidth));
    assertAlignment(false, 'center', 'ltr');
    cy.contains('button', 'Resize fixture').click();
    cy.get(root).should($node => expect($node[0].getBoundingClientRect().width).to.equal(240));
    assertAlignment(false, 'center', 'ltr');
    cy.contains('button', 'Resize fixture').click();
    cy.get(root).should($node => expect($node[0].getBoundingClientRect().width).to.equal(hostWidth));
  });

  it('responds to direction changes on the same horizontal start-aligned instance', () => {
    const DirectionFixture = () => {
      const [rtl, setRtl] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme} dir={rtl ? 'rtl' : 'ltr'}>
          <button onClick={() => setRtl(value => !value)}>Change direction</button>
          <div style={{ width: hostWidth }}>
            <Divider data-testid="divider" alignContent="start">
              Start
            </Divider>
          </div>
        </FluentProvider>
      );
    };
    mount(<DirectionFixture />);
    assertAlignment(false, 'start', 'ltr');
    cy.contains('button', 'Change direction').click();
    assertAlignment(false, 'start', 'rtl');
    cy.contains('button', 'Change direction').click();
    assertAlignment(false, 'start', 'ltr');
    assertName('Start');
  });

  it('inherits updated provider theme tokens for text and painted vertical lines', () => {
    const ThemeFixture = () => {
      const [dark, setDark] = React.useState(false);
      return (
        <FluentProvider theme={dark ? teamsDarkTheme : teamsLightTheme}>
          <button onClick={() => setDark(true)}>Dark theme</button>
          <Divider data-testid="divider" vertical style={{ height: 100 }}>
            Theme
          </Divider>
        </FluentProvider>
      );
    };
    mount(<ThemeFixture />);
    function checkTheme(theme: typeof teamsLightTheme) {
      cy.get(root).should($node => {
        const node = $node[0];
        const view = node.ownerDocument.defaultView!;
        const probe = node.ownerDocument.createElement('span');
        node.appendChild(probe);
        probe.style.color = theme.colorNeutralForeground2;
        expect(view.getComputedStyle(node).color).to.equal(view.getComputedStyle(probe).color);
        probe.style.color = theme.colorNeutralStroke2;
        for (const pseudo of ['::before', '::after']) {
          expect(view.getComputedStyle(node, pseudo).borderRightColor).to.equal(view.getComputedStyle(probe).color);
          expect(view.getComputedStyle(node, pseudo).borderRightWidth).to.equal(theme.strokeWidthThin);
        }
        probe.remove();
        expect(node.getBoundingClientRect().height).to.equal(100);
      });
    }
    checkTheme(teamsLightTheme);
    cy.contains('button', 'Dark theme').click();
    checkTheme(teamsDarkTheme);
    assertName('Theme');
  });

  it('applies provider custom style hooks after component styles', () => {
    mount(
      <FluentProvider
        theme={teamsLightTheme}
        customStyleHooks_unstable={{
          // eslint-disable-next-line @typescript-eslint/naming-convention
          useDividerStyles_unstable: state => {
            const dividerState = state as DividerState;
            dividerState.root.style = { ...dividerState.root.style, width: 160 };
            dividerState.wrapper.style = { ...dividerState.wrapper.style, width: 80 };
          },
        }}
      >
        <Divider data-testid="divider" style={{ width: 100 }}>
          Provider override
        </Divider>
      </FluentProvider>,
    );
    cy.get(root).should($node => expect($node[0].getBoundingClientRect().width).to.equal(160));
    cy.get(root)
      .find(wrapper)
      .should($node => expect($node[0].getBoundingClientRect().width).to.equal(80));
    assertName('Provider override');
  });

  for (const vertical of [false, true]) {
    it(`paints continuous childless ${vertical ? 'vertical' : 'horizontal'} segments without content gaps`, () => {
      render({ vertical });
      cy.get(root).should($node => {
        const node = $node[0];
        const view = node.ownerDocument.defaultView!;
        const before = view.getComputedStyle(node, '::before');
        const after = view.getComputedStyle(node, '::after');
        const bounds = node.getBoundingClientRect();
        expect(parseFloat(vertical ? before.height : before.width)).to.be.closeTo(
          (vertical ? bounds.height : bounds.width) / 2,
          1,
        );
        expect(parseFloat(vertical ? after.height : after.width)).to.be.closeTo(
          (vertical ? bounds.height : bounds.width) / 2,
          1,
        );
        expect(vertical ? before.marginBottom : before.marginRight).to.equal('0px');
        expect(vertical ? after.marginTop : after.marginLeft).to.equal('0px');
      });
      cy.get(root).find(wrapper).should('not.exist');
    });
  }

  it('forwards explicitly requested focus and keyboard events without inventing adjustable separator state', () => {
    const keyDown = cy.stub().as('keyDown');
    render({ tabIndex: 0, onKeyDown: keyDown, children: 'Focusable by consumer' });
    cy.get(root).focus().should('be.focused');
    cy.realPress('ArrowRight');
    cy.get('@keyDown').should('have.been.calledOnce').and('have.been.calledWithMatch', { key: 'ArrowRight' });
    cy.get(root).should('have.text', 'Focusable by consumer').and('not.have.attr', 'aria-valuenow');
    assertName('Focusable by consumer');
  });

  it('consumes design props rather than leaking them as native root attributes', () => {
    render({ vertical: true, inset: true, alignContent: 'end', appearance: 'strong', children: 'Design props' });
    cy.get(root).should($node => {
      for (const attribute of ['vertical', 'inset', 'aligncontent', 'appearance', 'wrapper']) {
        expect($node[0].hasAttribute(attribute), attribute).to.equal(false);
      }
      expect($node[0].getBoundingClientRect().height).to.equal(hostHeight - 24);
    });
    assertAlignment(true, 'end', 'ltr');
    assertName('Design props');
  });
});
