import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Checkbox } from '@fluentui/react-checkbox';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { RefAttributes, SlotRenderFunction } from '@fluentui/react-utilities';
import { Card } from './Card';
import type { CardBaseProps, CardProps } from './Card.types';
import { useCardBase_unstable } from './useCard';
import { renderCard_unstable } from './renderCard';
import { CardHeader } from '../CardHeader/CardHeader';
import { CardPreview } from '../CardPreview/CardPreview';
import { CardFooter } from '../CardFooter/CardFooter';
import { useOverrides, useCustomCardStyles } from './Card.functional.styles.cy';

const root = '[data-testid="card"]';
const checkbox = `${root} .fui-Card__checkbox`;
const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48"%3E%3C/svg%3E';
const sizes = [
  { size: 'small', padding: 8, radius: webLightTheme.borderRadiusSmall },
  { size: 'medium', padding: 12, radius: webLightTheme.borderRadiusMedium },
  { size: 'large', padding: 16, radius: webLightTheme.borderRadiusLarge },
] as const;
const appearances = ['filled', 'filled-alternative', 'outline', 'subtle'] as const;

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

function computedToken(element: HTMLElement, property: string, value: string) {
  const probe = element.ownerDocument.createElement('span');
  probe.style.setProperty(property, value);
  element.parentElement!.appendChild(probe);
  const result = element.ownerDocument.defaultView!.getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

const Content = ({ actions = true }: { actions?: boolean }) => (
  <>
    <CardHeader
      image={<img src={image} alt="Document logo" />}
      header={<h3 id="card-title">Project briefing</h3>}
      description={<span id="card-description">Shared document</span>}
    />
    <p data-testid="surface">Document content</p>
    {actions && (
      <CardFooter>
        <button data-testid="open">Open</button>
        <button data-testid="share">Share</button>
      </CardFooter>
    )}
  </>
);

function render(props: CardProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      <button data-testid="before">Before</button>
      <Card data-testid="card" style={{ width: 400 }} {...props}>
        {props.children ?? <Content />}
      </Card>
      <button data-testid="after">After</button>
    </FluentProvider>,
  );
}

function changing(initial: CardProps & RefAttributes<HTMLDivElement>) {
  const tree = (props: typeof initial) => (
    <FluentProvider theme={webLightTheme}>
      <Card data-testid="card" style={{ width: 400 }} {...props}>
        {props.children ?? <Content />}
      </Card>
      <button data-testid="outside">Outside</button>
    </FluentProvider>
  );
  let replace: (props: typeof initial) => void = () => {
    throw new Error('Mount has not completed');
  };
  mount(tree(initial)).then(({ rerender }) => {
    replace = props => {
      rerender(tree(props));
    };
  });
  return (props: typeof initial) => cy.then(() => replace(props));
}

describe('Card documented visual and composition contracts', () => {
  it('renders the default group, vertical medium filled paint and rich header/footer anatomy', () => {
    render();
    cy.get(root).should('have.prop', 'tagName', 'DIV').and('have.attr', 'role', 'group');
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get(root).should('have.css', 'flex-direction', 'column').and('have.css', 'padding', '12px');
    cy.get(root)
      .should('have.css', 'border-radius', webLightTheme.borderRadiusMedium)
      .and('have.css', 'background-color', rgb(webLightTheme.colorNeutralBackground1));
    cy.get(`${root} .fui-CardHeader`).should('contain.text', 'Project briefing').and('contain.text', 'Shared document');
    cy.get(`${root} .fui-CardFooter button`).should('have.length', 2);
    cy.get(root).should(card => {
      const style = card[0].ownerDocument.defaultView!.getComputedStyle(card[0]);
      expect(style.boxShadow).to.equal(computedToken(card[0], 'box-shadow', webLightTheme.shadow4));
    });
  });

  for (const { size, padding, radius } of sizes) {
    it(`uses ${size} token radius and actual padding/gap without imposing card dimensions`, () => {
      render({ size });
      cy.get(root)
        .should('have.css', 'padding', `${padding}px`)
        .and('have.css', 'gap', `${padding}px`)
        .and('have.css', 'border-radius', radius)
        .and('have.css', 'width', '400px');
      cy.get(root).should(card => {
        const border = card[0].ownerDocument.defaultView!.getComputedStyle(card[0], '::after');
        expect(border.borderRadius).to.equal(radius);
        expect(border.borderTopWidth).to.equal(webLightTheme.strokeWidthThin);
        expect(border.pointerEvents).to.equal('none');
      });
    });
  }

  for (const appearance of appearances) {
    it(`paints ${appearance} background, shadow and actual pseudo border`, () => {
      render({ appearance });
      cy.get(root).should(card => {
        const view = card[0].ownerDocument.defaultView!;
        const style = view.getComputedStyle(card[0]);
        const border = view.getComputedStyle(card[0], '::after');
        const background =
          appearance === 'filled'
            ? webLightTheme.colorNeutralBackground1
            : appearance === 'filled-alternative'
            ? webLightTheme.colorNeutralBackground2
            : 'transparent';
        expect(style.backgroundColor).to.equal(computedToken(card[0], 'background-color', background));
        expect(style.boxShadow).to.equal(
          computedToken(card[0], 'box-shadow', appearance.startsWith('filled') ? webLightTheme.shadow4 : 'none'),
        );
        expect(border.borderTopColor).to.equal(
          appearance === 'outline' ? rgb(webLightTheme.colorNeutralStroke1) : 'rgba(0, 0, 0, 0)',
        );
      });
    });
  }

  for (const orientation of ['vertical', 'horizontal'] as const) {
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`lays the ${orientation} preview flush to the border in ${dir}`, () => {
        render(
          {
            orientation,
            children: (
              <>
                <CardPreview data-testid="preview">
                  <img src={image} alt="Presentation Preview" />
                </CardPreview>
                <CardHeader header="Project briefing" description="Shared document" />
              </>
            ),
          },
          dir,
        );
        cy.get(root).should('have.css', 'flex-direction', orientation === 'vertical' ? 'column' : 'row');
        cy.get(root).then(card => {
          cy.get('[data-testid="preview"]').should(preview => {
            const outer = card[0].getBoundingClientRect();
            const inner = preview[0].getBoundingClientRect();
            if (orientation === 'vertical') {
              expect(inner.left).to.equal(outer.left);
              expect(inner.right).to.equal(outer.right);
              expect(inner.top).to.equal(outer.top);
            } else {
              expect(dir === 'ltr' ? inner.left : inner.right).to.equal(dir === 'ltr' ? outer.left : outer.right);
            }
          });
        });
      });
    }
  }

  it('supports documented controlled surface selection and keeps child actions independent', () => {
    const changed = cy.spy().as('changed');
    const action = cy.spy().as('action');
    const Fixture = () => {
      const [selected, setSelected] = React.useState(false);
      return (
        <FluentProvider theme={webLightTheme}>
          <Card
            data-testid="card"
            selected={selected}
            onSelectionChange={(event, data) => {
              changed(event, data);
              setSelected(data.selected);
            }}
          >
            <Content actions={false} />
            <button data-testid="open" onClick={action}>
              <span>Open document</span>
            </button>
          </Card>
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    cy.get(checkbox)
      .should('not.be.checked')
      .should(input => expect(computeAccessibleName(input[0])).to.equal('Project briefing'));
    cy.get('[data-testid="surface"]').realClick();
    cy.get(checkbox).should('be.checked');
    cy.get('@changed').should('have.been.calledOnce').its('firstCall.args.1').should('deep.equal', { selected: true });
    cy.get('[data-testid="open"] span').realClick();
    cy.get('@action').should('have.been.calledOnce');
    cy.get('@changed').should('have.been.calledOnce');
    cy.get(checkbox).should('be.checked');
  });

  it('composes the documented floating checkbox indicator with synchronized surface and native keyboard state', () => {
    const Fixture = () => {
      const [selected, setSelected] = React.useState(false);
      return (
        <FluentProvider theme={webLightTheme}>
          <Card
            data-testid="card"
            selected={selected}
            onSelectionChange={(_, data) => setSelected(data.selected)}
            floatingAction={
              <Checkbox
                aria-labelledby="card-title"
                checked={selected}
                onChange={(_, data) => setSelected(data.checked === true)}
              />
            }
          >
            <Content />
          </Card>
        </FluentProvider>
      );
    };
    mount(<Fixture />);
    cy.get(checkbox).should('not.exist');
    cy.get(`${root} .fui-Checkbox__input`)
      .should('not.be.checked')
      .should(input => expect(computeAccessibleName(input[0])).to.equal('Project briefing'));
    cy.get('[data-testid="surface"]').realClick();
    cy.get(`${root} .fui-Checkbox__input`).should('be.checked').focus();
    cy.realPress('Space');
    cy.get(`${root} .fui-Checkbox__input`).should('not.be.checked');
  });

  it('makes an off-mode action available through its native inner button and root pointer handler', () => {
    const action = cy.spy().as('action');
    render({
      focusMode: 'off',
      onClick: action,
      children: (
        <>
          <p data-testid="surface">Open project</p>
          <button data-testid="open">Open</button>
        </>
      ),
    });
    cy.get(root).should('not.have.attr', 'tabindex');
    cy.get('[data-testid="surface"]').realClick();
    cy.get('@action').should('have.been.calledOnce');
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get('[data-testid="open"]').should('be.focused');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledTwice');
  });

  it('preserves a linked-card title as a real keyboard-accessible link', () => {
    const action = cy.spy((event: React.MouseEvent) => event.preventDefault()).as('action');
    render({
      focusMode: 'off',
      children: (
        <CardHeader
          header={
            <h3>
              <a href="#project" onClick={action}>
                Project briefing
              </a>
            </h3>
          }
        />
      ),
    });
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.contains('a', 'Project briefing').should('be.focused').and('have.attr', 'href', '#project');
    cy.realPress('Enter');
    cy.get('@action').should('have.been.calledOnce');
  });

  for (const appearance of appearances) {
    it(`disables ${appearance} card surface/selection but leaves explicitly enabled children usable`, () => {
      const changed = cy.spy().as('changed');
      const action = cy.spy().as('action');
      render({
        disabled: true,
        appearance,
        defaultSelected: false,
        onSelectionChange: changed,
        onClick: changed,
        children: (
          <>
            <Content actions={false} />
            <button data-testid="open" onClick={action}>
              Open
            </button>
          </>
        ),
      });
      cy.get(root)
        .should('have.attr', 'aria-disabled', 'true')
        .and('have.css', 'color', rgb(webLightTheme.colorNeutralForegroundDisabled));
      cy.get(root).should('not.have.attr', 'tabindex');
      cy.get(checkbox).should('be.disabled');
      cy.get('[data-testid="surface"]').realClick();
      cy.get('@changed').should('not.have.been.called');
      cy.get('[data-testid="open"]').realClick();
      cy.get('@action').should('have.been.calledOnce');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="open"]').should('be.focused');
      cy.realPress('Enter');
      cy.get('@action').should('have.been.calledTwice');
    });
  }

  it('supports template list-item semantics and ordinary independent task controls', () => {
    mount(
      <FluentProvider theme={webLightTheme}>
        <div role="list">
          <Card data-testid="card" role="listitem" size="small">
            <CardHeader header={<h3>Project briefing</h3>} />
            <label>
              <input data-testid="task" type="checkbox" />
              Task title
            </label>
          </Card>
        </div>
      </FluentProvider>,
    );
    cy.get(root).should('have.attr', 'role', 'listitem');
    cy.get(checkbox).should('not.exist');
    cy.get('[data-testid="task"]').realClick().should('be.checked');
  });

  it('computes the documented focusable card name and description from semantic text', () => {
    render({ focusMode: 'tab-only', 'aria-labelledby': 'card-title', 'aria-describedby': 'card-description' });
    cy.get(root).should(card => {
      expect(computeAccessibleName(card[0])).to.equal('Project briefing');
      expect(computeAccessibleDescription(card[0])).to.equal('Shared document');
    });
  });

  describe('Card unit and conformance mappings in the browser', () => {
    for (const eventProp of [
      'onClick',
      'onDoubleClick',
      'onMouseUp',
      'onMouseDown',
      'onPointerUp',
      'onPointerDown',
      'onTouchStart',
      'onTouchEnd',
      'onDragStart',
      'onDragEnd',
    ] as const) {
      it(`classifies ${eventProp} as interactive and uses the current inferred no-tab native behavior`, () => {
        const props: CardProps = { [eventProp]: cy.spy() };
        render({ ...props, 'aria-labelledby': 'card-title' });
        cy.get('[data-testid="before"]').focus();
        cy.realPress('Tab');
        cy.get(root).should('be.focused').and('have.attr', 'tabindex', '0').and('have.attr', 'data-tabster');
        cy.realPress('Tab');
        cy.get('[data-testid="after"]').should('be.focused');
      });
    }

    it('does not infer pointer interactivity from a keyboard-only handler', () => {
      render({ onKeyDown: cy.spy() });
      cy.get(root).should('not.have.attr', 'tabindex');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get('[data-testid="open"]').should('be.focused');
    });

    it('updates/removes focusMode, interactive inference and disabled attributes without stale group behavior', () => {
      const change = changing({ onClick: cy.spy(), focusMode: 'tab-only' });
      cy.get(root).should('have.attr', 'tabindex', '0').and('have.attr', 'data-tabster');
      change({ onClick: cy.spy(), focusMode: 'off' });
      cy.get(root).should('not.have.attr', 'tabindex');
      cy.get(root).should('not.have.attr', 'data-tabster');
      change({ onClick: cy.spy(), focusMode: 'no-tab', disabled: true });
      cy.get(root).should('have.attr', 'aria-disabled', 'true');
      cy.get(root).should('not.have.attr', 'tabindex');
      change({ onClick: cy.spy() });
      cy.get(root).should('have.attr', 'tabindex', '0').and('have.attr', 'data-tabster');
      cy.get(root).should('not.have.attr', 'aria-disabled');
      change({});
      cy.get(root).should('not.have.attr', 'tabindex');
      cy.get(root).should('not.have.attr', 'data-tabster');
    });

    it('ignores root group focus modes for a selectable card and focuses the actual checkbox on Tab', () => {
      render({ defaultSelected: false, focusMode: 'no-tab' });
      cy.get(root).should('not.have.attr', 'tabindex');
      cy.get(root).should('not.have.attr', 'data-tabster');
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(checkbox).should('be.focused');
      cy.get(root).should(card => {
        const border = card[0].ownerDocument.defaultView!.getComputedStyle(card[0], '::after');
        expect(border.borderTopWidth).to.equal(webLightTheme.strokeWidthThick);
        expect(border.borderTopColor).to.equal(rgb(webLightTheme.colorStrokeFocus2));
      });
      cy.realPress('Tab');
      cy.get('[data-testid="open"]').should('be.focused');
    });

    const BaseCard = (props: CardBaseProps) => {
      const state = useCardBase_unstable(props, React.useRef<HTMLDivElement>(null));
      return renderCard_unstable(state, { selectableA11yProps: state.selectableA11yProps });
    };

    for (const restrict of [true, false]) {
      it(`honors the headless selection restriction predicate=${restrict} in native pointer events`, () => {
        const changed = cy.spy().as('changed');
        const predicate = cy.spy(() => restrict).as('predicate');
        mount(
          <FluentProvider theme={webLightTheme}>
            <BaseCard
              data-testid="card"
              defaultSelected={false}
              onSelectionChange={changed}
              shouldRestrictTriggerAction={predicate}
              checkbox={{ 'aria-label': 'Select project' }}
            >
              <span data-testid="surface">Project</span>
            </BaseCard>
          </FluentProvider>,
        );
        cy.get('[data-testid="surface"]').realClick();
        cy.get('@predicate').should('have.been.calledOnce');
        cy.get(`${root} input`).should(restrict ? 'not.be.checked' : 'be.checked');
        cy.get('@changed').should(restrict ? 'not.have.been.called' : 'have.been.calledOnce');
      });
    }

    it('bypasses the headless restriction for the actual native checkbox pointer and Enter target', () => {
      const changed = cy.spy().as('changed');
      const predicate = cy.spy(() => true).as('predicate');
      mount(
        <FluentProvider theme={webLightTheme}>
          <BaseCard
            data-testid="card"
            defaultSelected={false}
            onSelectionChange={changed}
            shouldRestrictTriggerAction={predicate}
            checkbox={{ 'aria-label': 'Select project' }}
          >
            Project
          </BaseCard>
        </FluentProvider>,
      );
      cy.get(`${root} input`).realClick().should('be.checked');
      cy.realPress('Enter');
      cy.get(`${root} input`).should('not.be.checked');
      cy.get('@changed').should('have.been.calledTwice');
      cy.get('@predicate').should('not.have.been.called');
    });

    for (const appearance of appearances) {
      it(`uses ${appearance} actual hover and selected paint`, () => {
        const backgroundToken = {
          filled: webLightTheme.colorNeutralBackground1Hover,
          'filled-alternative': webLightTheme.colorNeutralBackground2Hover,
          outline: webLightTheme.colorTransparentBackgroundHover,
          subtle: webLightTheme.colorSubtleBackgroundHover,
        };
        const selectedToken = {
          filled: webLightTheme.colorNeutralBackground1Selected,
          'filled-alternative': webLightTheme.colorNeutralBackground2Selected,
          outline: webLightTheme.colorTransparentBackgroundSelected,
          subtle: webLightTheme.colorSubtleBackgroundSelected,
        };
        const change = changing({ appearance, selected: false });
        cy.get('[data-testid="surface"]').realHover();
        cy.get(root).should(card => {
          expect(card[0].ownerDocument.defaultView!.getComputedStyle(card[0]).backgroundColor).to.equal(
            computedToken(card[0], 'background-color', backgroundToken[appearance]),
          );
        });
        change({ appearance, selected: true });
        cy.get(root).should(card => {
          const view = card[0].ownerDocument.defaultView!;
          expect(view.getComputedStyle(card[0]).backgroundColor).to.equal(
            computedToken(card[0], 'background-color', selectedToken[appearance]),
          );
          expect(view.getComputedStyle(card[0], '::after').borderTopColor).to.equal(
            rgb(
              appearance === 'outline'
                ? webLightTheme.colorNeutralStroke1Hover
                : webLightTheme.colorNeutralStroke1Selected,
            ),
          );
        });
        cy.get('[data-testid="outside"]').realHover();
        cy.get(root).should(card => {
          expect(card[0].ownerDocument.defaultView!.getComputedStyle(card[0], '::after').borderTopColor).to.equal(
            rgb(webLightTheme.colorNeutralStroke1Selected),
          );
        });
      });
    }

    it('honors user Griffel overrides for root and floating action after builtin styles', () => {
      const Fixture = () => {
        const classes = useOverrides();
        return (
          <Card
            data-testid="card"
            className={classes.root}
            floatingAction={{ children: 'Action', className: classes.floatingAction }}
          >
            Project
          </Card>
        );
      };
      mount(
        <FluentProvider theme={webLightTheme}>
          <Fixture />
        </FluentProvider>,
      );
      cy.get(root).should('have.css', 'background-color', rgb(webLightTheme.colorPaletteGreenBackground2));
      cy.get(`${root} .fui-Card__floatingAction`).should('have.css', 'top', webLightTheme.spacingVerticalL);
    });

    it('applies provider custom style hooks and live nested theme replacements', () => {
      const theme = { ...webLightTheme, colorNeutralBackground1: webLightTheme.colorPaletteGreenBackground2 };
      const hooks = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        useCardStyles_unstable: useCustomCardStyles,
      };
      const tree = (alternate: boolean) => (
        <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
          <FluentProvider theme={alternate ? theme : webLightTheme}>
            <Card data-testid="card">Project</Card>
          </FluentProvider>
        </FluentProvider>
      );
      mount(tree(true)).then(({ rerender }) => {
        cy.get(root)
          .should('have.css', 'border-radius', '0px')
          .and('have.css', 'background-color', rgb(theme.colorNeutralBackground1));
        cy.then(() => rerender(tree(false)));
        cy.get(root)
          .should('have.css', 'border-radius', '0px')
          .and('have.css', 'background-color', rgb(webLightTheme.colorNeutralBackground1));
      });
    });

    it('updates and removes selection callbacks and native keyboard handlers without stale closures', () => {
      const first = cy.spy().as('first');
      const latest = cy.spy().as('latest');
      const key = cy.spy().as('key');
      const change = changing({ selected: false, onSelectionChange: first, onKeyDown: key });
      cy.get(checkbox).focus();
      cy.realPress('Enter');
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@key').should('have.been.calledOnce');
      change({ selected: false, onSelectionChange: latest });
      cy.get(checkbox).focus();
      cy.realPress('Enter');
      cy.get('@latest').should('have.been.calledOnce');
      cy.get('@key').should('have.been.calledOnce');
      change({ selected: false });
      cy.get('[data-testid="surface"]').realClick();
      cy.get('@latest').should('have.been.calledOnce');
      change({ selected: false, onSelectionChange: first, onKeyDown: key });
      cy.get(checkbox).focus();
      cy.realPress('Enter');
      cy.get('@first').should('have.been.calledTwice');
      cy.get('@key').should('have.been.calledTwice');
    });

    it('reports a single selection change per native internal checkbox Space activation', () => {
      const changed = cy.spy().as('changed');
      render({ defaultSelected: false, onSelectionChange: changed });
      cy.get(checkbox).focus();
      cy.realPress('Space');
      cy.get(checkbox).should('be.checked');
      cy.get('@changed')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { selected: true });
      cy.realPress('Space');
      cy.get(checkbox).should('not.be.checked');
      cy.get('@changed')
        .should('have.been.calledTwice')
        .its('lastCall.args.1')
        .should('deep.equal', { selected: false });
    });

    it('preserves custom checkbox change handlers while selecting once from the native click', () => {
      const changed = cy.spy().as('changed');
      const native = cy.spy().as('native');
      render({ defaultSelected: false, onSelectionChange: changed, checkbox: { onChange: native } });
      cy.get(checkbox).focus();
      cy.realPress('Space');
      cy.get(checkbox).should('be.checked');
      cy.get('@native').should('have.been.calledOnce');
      cy.get('@changed').should('have.been.calledOnce');
    });
  });

  describe('Card defined forced-colors styles', () => {
    afterEach(() => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      );
    });

    for (const appearance of appearances) {
      it(`paints ${appearance} selected system colors while allowing native preview/footer color adjustment`, () => {
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Emulation.setEmulatedMedia',
            params: { features: [{ name: 'forced-colors', value: 'active' }] },
          }),
        );
        mount(
          <FluentProvider theme={webLightTheme}>
            <Card data-testid="card" appearance={appearance} selected checkbox={{ 'aria-label': 'Select project' }}>
              <CardPreview data-testid="preview">
                <img src={image} alt="Document preview" />
              </CardPreview>
              <CardFooter data-testid="footer">
                <button>Open</button>
              </CardFooter>
            </Card>
            <span data-testid="system" style={{ backgroundColor: 'Highlight', color: 'HighlightText' }}>
              System colors
            </span>
          </FluentProvider>,
        );
        cy.get(root).should(card => {
          const view = card[0].ownerDocument.defaultView!;
          expect(view.matchMedia('(forced-colors: active)').matches).to.equal(true);
          expect(view.getComputedStyle(card[0]).forcedColorAdjust).to.equal('none');
        });
        cy.get('[data-testid="system"]').then(system => {
          const expected = system[0].ownerDocument.defaultView!.getComputedStyle(system[0]);
          cy.get(root)
            .should('have.css', 'background-color', expected.backgroundColor)
            .and('have.css', 'color', expected.color);
        });
        cy.get('[data-testid="preview"]').should('have.css', 'forced-color-adjust', 'auto');
        cy.get('[data-testid="footer"]').should('have.css', 'forced-color-adjust', 'auto');
      });
    }

    it('uses actual system hover paint for a nonselected interactive card in forced colors', () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      mount(
        <FluentProvider theme={webLightTheme}>
          <Card data-testid="card" onClick={cy.spy()}>
            <p data-testid="surface">Project</p>
          </Card>
          <span data-testid="system" style={{ backgroundColor: 'Highlight', color: 'HighlightText' }}>
            System colors
          </span>
        </FluentProvider>,
      );
      cy.get('[data-testid="surface"]').realHover();
      cy.get(root).should('have.css', 'forced-color-adjust', 'none');
      cy.get('[data-testid="system"]').then(system => {
        const expected = system[0].ownerDocument.defaultView!.getComputedStyle(system[0]);
        cy.get(root)
          .should('have.css', 'background-color', expected.backgroundColor)
          .and('have.css', 'color', expected.color);
      });
    });
  });

  describe('Card native pressed appearance', () => {
    afterEach(() => {
      cy.get('[data-testid="surface"]').realMouseUp();
    });

    for (const appearance of appearances) {
      it(`paints ${appearance} pressed background during a real held pointer`, () => {
        const backgroundToken = {
          filled: webLightTheme.colorNeutralBackground1Pressed,
          'filled-alternative': webLightTheme.colorNeutralBackground2Pressed,
          outline: webLightTheme.colorTransparentBackgroundPressed,
          subtle: webLightTheme.colorSubtleBackgroundPressed,
        };
        const clicked = cy.spy().as('clicked');
        render({ appearance, onClick: clicked });
        cy.get('[data-testid="surface"]').realMouseDown();
        cy.get(root).should(card => {
          expect(card[0].ownerDocument.defaultView!.getComputedStyle(card[0]).backgroundColor).to.equal(
            computedToken(card[0], 'background-color', backgroundToken[appearance]),
          );
        });
        cy.get('[data-testid="surface"]').realMouseUp();
        cy.get('@clicked').should('have.been.calledOnce');
      });
    }
  });

  describe('Card supported edges and native accessibility', () => {
    for (const key of ['Enter', 'Space'] as const) {
      it(`preserves a nested button native ${key} action without changing card selection`, () => {
        const changed = cy.spy().as('changed');
        const action = cy.spy().as('action');
        render({
          defaultSelected: false,
          onSelectionChange: changed,
          children: (
            <>
              <CardHeader header="Project briefing" />
              <button data-testid="open" onClick={action}>
                <span>Open document</span>
              </button>
            </>
          ),
        });
        cy.get('[data-testid="open"]').focus();
        cy.realPress(key);
        cy.get('@action').should('have.been.calledOnce');
        cy.get('@changed').should('not.have.been.called');
        cy.get(checkbox).should('not.be.checked');
      });
    }

    it('preserves native linked-title Enter activation without changing selection', () => {
      const changed = cy.spy().as('changed');
      const action = cy.spy((event: React.MouseEvent) => event.preventDefault()).as('action');
      render({
        defaultSelected: false,
        onSelectionChange: changed,
        children: (
          <CardHeader
            header={
              <h3>
                <a data-testid="link" href="#project" onClick={action}>
                  Project briefing
                </a>
              </h3>
            }
          />
        ),
      });
      cy.get('[data-testid="link"]').focus();
      cy.realPress('Enter');
      cy.get('@action').should('have.been.calledOnce');
      cy.get('@changed').should('not.have.been.called');
    });

    it('does not restrict pointer selection from an ordinary nonfocusable content descendant', () => {
      const changed = cy.spy().as('changed');
      render({ defaultSelected: false, onSelectionChange: changed });
      cy.get('[data-testid="surface"]').realClick();
      cy.get(checkbox).should('be.checked');
      cy.get('@changed').should('have.been.calledOnce').its('firstCall.args.0.type').should('equal', 'click');
    });

    for (const focusMode of ['off', 'no-tab', 'tab-exit', 'tab-only'] as const) {
      it(`supports reverse native Tab navigation in ${focusMode}`, () => {
        render({ focusMode, 'aria-labelledby': 'card-title' });
        cy.get('[data-testid="share"]').focus();
        cy.realPress(['Shift', 'Tab']);
        cy.get('[data-testid="open"]').should('be.focused');
        cy.realPress(['Shift', 'Tab']);
        if (focusMode === 'no-tab') {
          cy.get('[data-testid="share"]').should('be.focused');
          cy.realPress('Escape');
          cy.get(root).should('be.focused');
        } else {
          cy.get('[data-testid="before"]').should('be.focused');
        }
      });
    }

    it('uses controlled state without silently updating it and reports the proposed next value', () => {
      const changed = cy.spy().as('changed');
      const change = changing({ selected: false, onSelectionChange: changed });
      cy.get('[data-testid="surface"]').realClick();
      cy.get('@changed')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { selected: true });
      cy.get(checkbox).should('not.be.checked');
      change({ selected: true, onSelectionChange: changed });
      cy.get(checkbox).should('be.checked');
      cy.get('[data-testid="surface"]').realClick();
      cy.get('@changed')
        .should('have.been.calledTwice')
        .its('lastCall.args.1')
        .should('deep.equal', { selected: false });
      cy.get(checkbox).should('be.checked');
    });

    it('uses defaultSelected only at initialization and keeps uncontrolled selection across rerenders', () => {
      const change = changing({ defaultSelected: true });
      cy.get(checkbox).should('be.checked');
      change({ defaultSelected: false, size: 'small' });
      cy.get(checkbox).should('be.checked');
      cy.get('[data-testid="surface"]').realClick();
      cy.get(checkbox).should('not.be.checked');
      change({ defaultSelected: true, size: 'large' });
      cy.get(checkbox).should('not.be.checked');
    });

    it('supports callback-only selectability with real uncontrolled selection', () => {
      const changed = cy.spy().as('changed');
      render({ onSelectionChange: changed });
      cy.get(checkbox).should('not.be.checked');
      cy.get('[data-testid="surface"]').realClick();
      cy.get(checkbox).should('be.checked');
      cy.get('@changed').should('have.been.calledOnce');
    });

    it('omits the checkbox when explicitly null while retaining surface selection', () => {
      const changed = cy.spy().as('changed');
      render({ defaultSelected: false, checkbox: null, onSelectionChange: changed });
      cy.get(checkbox).should('not.exist');
      cy.get('[data-testid="surface"]').realClick();
      cy.get('@changed')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { selected: true });
    });

    it('renders floating action shorthand, null, empty and zero according to current slot truthiness', () => {
      const change = changing({ selected: false, floatingAction: 'Action' });
      cy.get(`${root} .fui-Card__floatingAction`).should('have.text', 'Action');
      cy.get(checkbox).should('not.exist');
      change({ selected: false, floatingAction: null });
      cy.get(`${root} .fui-Card__floatingAction`).should('not.exist');
      cy.get(checkbox).should('exist');
      change({ selected: false, floatingAction: '' });
      cy.get(`${root} .fui-Card__floatingAction`).should('not.exist');
      change({ selected: false, floatingAction: 0 });
      cy.get(`${root} .fui-Card__floatingAction`).should('not.exist');
      cy.get(checkbox).should('exist');
    });

    it('preserves floating-action render-function attributes and consumer slot styles', () => {
      const action: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
        <Component {...props} data-rendered="yes">
          <button>Custom action</button>
        </Component>
      );
      render({
        floatingAction: {
          children: action,
          className: 'custom-floating',
          title: 'Action title',
          style: { opacity: 0.5 },
        },
      });
      cy.get(`${root} .fui-Card__floatingAction`)
        .should('have.class', 'custom-floating')
        .and('have.attr', 'data-rendered', 'yes');
      cy.get(`${root} .fui-Card__floatingAction`)
        .should('have.attr', 'title', 'Action title')
        .and('have.css', 'opacity', '0.5');
      cy.contains('button', 'Custom action').should('be.visible');
    });

    it('preserves native root attributes and inline/class overrides across changes and omission', () => {
      const change = changing({
        id: 'project-card',
        className: 'consumer',
        title: 'Project',
        style: { width: 420, padding: 24, opacity: 0.5 },
      });
      cy.get(root).should('have.id', 'project-card').and('have.class', 'consumer').and('have.css', 'padding', '24px');
      change({ className: 'consumer', size: 'small', style: { width: 420, padding: 24, opacity: 0.5 } });
      cy.get(root)
        .should('have.class', 'consumer')
        .and('have.css', 'padding', '24px')
        .and('have.css', 'opacity', '0.5');
      cy.get(root).should('not.have.attr', 'title');
      change({ size: 'small' });
      cy.get(root)
        .should('not.have.class', 'consumer')
        .and('have.css', 'padding', '8px')
        .and('have.css', 'opacity', '1');
      cy.get(root).should('not.have.attr', 'size');
      cy.get(root).should('not.have.attr', 'orientation');
    });

    it('removes nondefault appearance, size, orientation and disabled props back to native defaults', () => {
      const change = changing({ appearance: 'outline', size: 'large', orientation: 'horizontal', disabled: true });
      cy.get(root).should('have.attr', 'aria-disabled', 'true').and('have.css', 'flex-direction', 'row');
      change({});
      cy.get(root).should('not.have.attr', 'aria-disabled');
      cy.get(root).should('have.css', 'flex-direction', 'column').and('have.css', 'padding', '12px');
      cy.get(root).should('have.css', 'background-color', rgb(webLightTheme.colorNeutralBackground1));
    });

    it('uses latest, removed and restored native surface handlers on the same root', () => {
      const first = cy.spy().as('first');
      const latest = cy.spy().as('latest');
      const change = changing({ onClick: first, focusMode: 'off' });
      cy.get(root).then(original => {
        cy.get('[data-testid="surface"]').realClick();
        cy.get('@first').should('have.been.calledOnce');
        change({ onClick: latest, focusMode: 'off' });
        cy.get(root).should(card => expect(card[0]).to.equal(original[0]));
        cy.get('[data-testid="surface"]').realClick();
        cy.get('@latest').should('have.been.calledOnce');
        change({ focusMode: 'off' });
        cy.get('[data-testid="surface"]').realClick();
        cy.get('@latest').should('have.been.calledOnce');
        change({ onClick: first, focusMode: 'off' });
        cy.get('[data-testid="surface"]').realClick();
        cy.get('@first').should('have.been.calledTwice');
      });
    });

    it('forwards, replaces and clears callback refs without changing the native root', () => {
      const first = cy.spy().as('firstRef');
      const second = cy.spy().as('secondRef');
      const tree = (ref: React.Ref<HTMLDivElement>, visible = true) => (
        <FluentProvider theme={webLightTheme}>
          {visible && (
            <Card data-testid="card" ref={ref}>
              Project
            </Card>
          )}
        </FluentProvider>
      );
      mount(tree(first)).then(({ rerender }) => {
        cy.get(root).then(original => {
          cy.get('@firstRef').its('lastCall.args.0').should('equal', original[0]);
          cy.then(() => rerender(tree(second)));
          cy.get('@firstRef').its('lastCall.args.0').should('be.null');
          cy.get('@secondRef').its('lastCall.args.0').should('equal', original[0]);
          cy.get(root).should(card => expect(card[0]).to.equal(original[0]));
          cy.then(() => rerender(tree(second, false)));
          cy.get('@secondRef').its('lastCall.args.0').should('be.null');
        });
      });
    });

    it('forwards, replaces and clears object refs on native root unmount', () => {
      const first = React.createRef<HTMLDivElement>();
      const second = React.createRef<HTMLDivElement>();
      const tree = (ref: typeof first, visible = true) => (
        <FluentProvider theme={webLightTheme}>
          {visible && (
            <Card data-testid="card" ref={ref}>
              Project
            </Card>
          )}
        </FluentProvider>
      );
      mount(tree(first)).then(({ rerender }) => {
        cy.get(root).then(original => {
          expect(first.current).to.equal(original[0]);
          cy.then(() => rerender(tree(second)));
          cy.get(root).should(card => {
            expect(first.current).to.equal(null);
            expect(second.current).to.equal(card[0]);
          });
          cy.then(() => rerender(tree(second, false)));
          cy.then(() => expect(second.current).to.equal(null));
        });
      });
    });

    it('retains root children numeric zero and empty strings without substituting a fixture', () => {
      render({ children: 0 });
      cy.get(root).should('have.text', '0');
      const change = changing({ children: '' });
      cy.get(root).should('have.text', '');
      change({ children: 'Restored' });
      cy.get(root).should('have.text', 'Restored');
    });

    it('passes axe for named focusable, internally selectable and native task-control recipes', () => {
      mount(
        <FluentProvider theme={webLightTheme}>
          <Card focusMode="tab-only" aria-label="Project" aria-describedby="description">
            <p id="description">Shared document</p>
            <button>Open</button>
          </Card>
          <Card defaultSelected={false} checkbox={{ 'aria-label': 'Select project' }}>
            Project
          </Card>
          <Card>
            <label>
              <input type="checkbox" />
              Task title
            </label>
          </Card>
        </FluentProvider>,
      );
      cy.get('[data-cy-root]').then(async container => {
        const results = await axe.run(container[0]);
        expect(results.violations.map(violation => `${violation.id}: ${violation.description}`)).to.deep.equal([]);
      });
    });
  });
});
