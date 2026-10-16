import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import { AvatarGroupPopover, AvatarGroupItem } from '@fluentui/react-avatar';
import type { JSXElement } from '@fluentui/react-utilities';
import { AvatarGroup } from './AvatarGroup';
import { partitionAvatarGroupItems } from '@fluentui/react-avatar';
import type { AvatarGroupProps, AvatarGroupPopoverProps } from '@fluentui/react-avatar';
import { useAvatarGroupBase_unstable } from './useAvatarGroup';
import { renderAvatarGroup_unstable } from './renderAvatarGroup';
import type { AvatarGroupBaseProps } from './AvatarGroup.types';

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const overflowTriggerSelector = '[type="button"]';

describe('AvatarGroup', () => {
  describe('AvatarGroupOverflow', () => {
    beforeEach(() => {
      mount(
        <AvatarGroupPopover popoverSurface={{ id: 'surface-id' }}>
          <AvatarGroupItem name="Allan Munger" />
          <AvatarGroupItem name="Daisy Phillips" />
          <AvatarGroupItem name="Robert Tolbert" />
          <AvatarGroupItem name="Kevin Sturgis" />
        </AvatarGroupPopover>,
      );
    });

    it('opens popover and focuses on the content', () => {
      cy.get(overflowTriggerSelector).realClick();
      cy.get('#surface-id').should('have.focus');
    });
  });
});

const names = [
  'Johnie McConnell',
  'Allan Munger',
  'Erik Nason',
  'Kristin Patterson',
  'Daisy Phillips',
  'Carole Poland',
  'Carlos Slattery',
  'Robert Tolbert',
  'Kevin Sturgis',
  'Charlotte Waltson',
  'Elliot Woodward',
];
const group = () => cy.get('.fui-AvatarGroup');
const trigger = () => group().find('button[type="button"]');
const surface = () => cy.get('#group-overflow-surface');
const GroupExample = ({
  items = names,
  popoverProps,
  ...props
}: AvatarGroupProps & {
  items?: string[];
  popoverProps?: Partial<AvatarGroupPopoverProps>;
}) => {
  const { inlineItems, overflowItems } = partitionAvatarGroupItems({ items, layout: props.layout });
  return (
    <>
      <button data-test="before">Before</button>
      <AvatarGroup aria-label="Participants" {...props}>
        {inlineItems.map(name => (
          <AvatarGroupItem key={name} name={name} />
        ))}
        {overflowItems && (
          <AvatarGroupPopover popoverSurface={{ id: 'group-overflow-surface' }} {...popoverProps}>
            {overflowItems.map(name => (
              <AvatarGroupItem key={name} name={name} />
            ))}
          </AvatarGroupPopover>
        )}
      </AvatarGroup>
      <button data-test="after">After</button>
    </>
  );
};
const sizes = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 128] as const;

describe('AvatarGroup documented contracts (round 1)', () => {
  (['spread', 'stack', 'pie'] as const).forEach(layout => {
    (['Enter', 'Space'] as const).forEach(key => {
      it(`Default/Layout ${layout}: real partition, native ${key} overflow opening, modal list and focus restoration`, () => {
        mount(<GroupExample layout={layout} />);
        group().should('have.attr', 'role', 'group').and('have.attr', 'aria-label', 'Participants');
        group()
          .children('.fui-AvatarGroupItem')
          .should('have.length', layout === 'pie' ? 3 : 4);
        group()
          .children('.fui-AvatarGroupItem')
          .find('.fui-AvatarGroupItem__avatar')
          .then($avatars =>
            expect(Array.from($avatars).map(avatar => avatar.getAttribute('aria-label'))).to.deep.equal(
              layout === 'pie' ? names.slice(0, 3) : names.slice(-4),
            ),
          );
        trigger().should('have.text', layout === 'pie' ? '' : '+7');
        if (layout === 'pie') {
          group().should('have.css', 'clip-path', 'circle(50%)').and('have.css', 'width', '32px');
          group()
            .children('.fui-AvatarGroupItem')
            .eq(1)
            .should('have.css', 'transform', 'matrix(0.5, 0, 0, 0.5, 0, 0)');
          group()
            .children('.fui-AvatarGroupItem')
            .eq(2)
            .should('have.css', 'transform', 'matrix(0.5, 0, 0, 0.5, 0, 0)');
          group().children('.fui-AvatarGroupItem').first().invoke('css', 'clip-path').should('contain', '25%');
          group().then($group =>
            group()
              .children('.fui-AvatarGroupItem')
              .then($items => {
                const bounds = $group[0].getBoundingClientRect();
                const [first, second, third] = Array.from($items).map(item => item.getBoundingClientRect());
                expect(first.left).to.be.closeTo(bounds.left - bounds.width / 4, 0.5);
                [second, third].forEach(rect => {
                  expect(rect.width).to.be.closeTo(bounds.width / 2, 0.5);
                  expect(rect.height).to.be.closeTo(bounds.height / 2, 0.5);
                  expect(rect.left).to.be.closeTo(bounds.left + bounds.width / 2, 0.5);
                });
                expect(second.top).to.be.closeTo(bounds.top, 0.5);
                expect(third.top).to.be.closeTo(bounds.top + bounds.height / 2, 0.5);
              }),
          );
        } else {
          group()
            .children('.fui-AvatarGroupItem')
            .then($items => {
              const first = $items[0].getBoundingClientRect();
              const second = $items[1].getBoundingClientRect();
              expect(layout === 'spread' ? second.left > first.right : second.left < first.right).to.equal(true);
            });
        }
        cy.get('[data-test="before"]').focus().realPress('Tab');
        trigger().should('be.focused').and('have.attr', 'aria-label', 'View more people.').realPress(key);
        surface().should('be.focused').and('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
        surface()
          .find('ul[role="list"] > li')
          .should('have.length', layout === 'pie' ? 11 : 7);
        surface()
          .find('.fui-AvatarGroupItem__overflowLabel')
          .then($labels =>
            expect(Array.from($labels).map(el => el.textContent)).to.deep.equal(
              layout === 'pie' ? names : names.slice(0, 7),
            ),
          );
        surface()
          .find('.fui-AvatarGroupItem__avatar')
          .then($avatars =>
            expect(Array.from($avatars).map(avatar => avatar.getAttribute('aria-label'))).to.deep.equal(
              layout === 'pie' ? names : names.slice(0, 7),
            ),
          );
        cy.realPress('Tab');
        surface().should('be.focused');
        cy.realPress(['Shift', 'Tab']);
        surface().should('be.focused');
        cy.realPress('Escape');
        surface().should('not.exist');
        trigger().should('be.focused').and('have.attr', 'aria-expanded', 'false');
        cy.realPress('Tab');
        cy.get('[data-test="after"]').should('be.focused');
      });
    });
    sizes.forEach(size => {
      it(`Size ${layout} ${size}: group context controls inline avatar dimensions and correct indicator kind`, () => {
        cy.viewport(1100, 800);
        mount(<GroupExample layout={layout} size={size} />);
        group()
          .children('.fui-AvatarGroupItem')
          .first()
          .should('have.css', 'width', `${size}px`)
          .and('have.css', 'height', `${size}px`);
        group()
          .children('.fui-AvatarGroupItem')
          .first()
          .find('.fui-AvatarGroupItem__avatar')
          .should('have.css', 'width', `${size}px`);
        if (layout !== 'pie') {
          const spacing =
            layout === 'stack'
              ? size < 24
                ? teamsLightTheme.spacingHorizontalXXS
                : size < 48
                ? teamsLightTheme.spacingHorizontalXS
                : size < 96
                ? teamsLightTheme.spacingHorizontalS
                : teamsLightTheme.spacingHorizontalL
              : size < 20
              ? teamsLightTheme.spacingHorizontalS
              : size < 32
              ? teamsLightTheme.spacingHorizontalMNudge
              : size < 64
              ? teamsLightTheme.spacingHorizontalL
              : teamsLightTheme.spacingHorizontalXL;
          const gap = Number.parseFloat(spacing) * (layout === 'stack' ? -1 : 1);
          group()
            .children('.fui-AvatarGroupItem')
            .should($items => {
              const [first, second] = Array.from($items).map(item => item.getBoundingClientRect());
              expect(second.left - first.right, `${layout} ${size} context spacing`).to.be.closeTo(gap, 0.5);
            });
        }
        if (layout === 'pie') {
          group().should('have.css', 'width', `${size}px`).and('have.css', 'height', `${size}px`);
          trigger().should('have.text', '');
        } else if (size < 24) {
          trigger().should('have.text', '').find('svg').should('exist');
        } else {
          trigger().should('have.text', '+7');
        }
        trigger().focus().realPress('Enter');
        surface().should('be.visible').find('.fui-AvatarGroupItem__avatar').first().should('have.css', 'width', '24px');
        cy.realPress('Escape');
        surface().should('not.exist');
      });
    });
  });

  describe('AvatarGroup unit-derived/context lifecycle (round 3)', () => {
    it('root ref/native ID/title/ARIA/classes persist independently of children and clear on unmount', () => {
      const ref = React.createRef<HTMLDivElement>();
      let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
      const Lifecycle = () => {
        const [visible, update] = React.useState(true);
        setVisible = update;
        return visible ? (
          <>
            <span id="group-label">Reviewers</span>
            <span id="group-description">Current participants</span>
            <AvatarGroup
              ref={ref}
              id="native-group"
              title="Reviewers"
              aria-labelledby="group-label"
              aria-describedby="group-description"
              className="consumer-group"
            >
              <AvatarGroupItem name="Mona Kane" />
              <AvatarGroupItem name="Elvia Atkins" />
            </AvatarGroup>
          </>
        ) : (
          <p data-test="removed">Removed</p>
        );
      };
      mount(<Lifecycle />);
      group()
        .should('have.class', 'consumer-group')
        .and('have.attr', 'id', 'native-group')
        .and('have.attr', 'title', 'Reviewers');
      group()
        .should('have.attr', 'aria-labelledby', 'group-label')
        .and('have.attr', 'aria-describedby', 'group-description')
        .then($el => expect(ref.current).to.equal($el[0]));
      cy.then(() => setVisible(false));
      cy.get('[data-test="removed"]').should('exist');
      cy.then(() => expect(ref.current).to.equal(null));
    });
    it('consumer root inline styles override pie clipping/dimensions while context sizing remains explicit', () => {
      mount(
        <AvatarGroup
          layout="pie"
          size={64}
          className="custom-pie"
          style={{
            clipPath: 'none',
            width: tokens.spacingHorizontalXXXL,
            height: tokens.spacingVerticalXXXL,
          }}
        >
          <AvatarGroupItem name="Mona Kane" />
        </AvatarGroup>,
      );
      group()
        .should('have.class', 'custom-pie')
        .and('have.css', 'clip-path', 'none')
        .and('have.css', 'width', teamsLightTheme.spacingHorizontalXXXL)
        .and('have.css', 'height', teamsLightTheme.spacingVerticalXXXL);
      group().children('.fui-AvatarGroupItem').should('have.css', 'width', '64px');
    });
    it('dynamic layout/size update the same group root and all inline/overflow context defaults', () => {
      let setPie: React.Dispatch<React.SetStateAction<boolean>>;
      const Dynamic = () => {
        const [pie, update] = React.useState(false);
        setPie = update;
        return <GroupExample layout={pie ? 'pie' : 'spread'} size={pie ? 64 : 16} />;
      };
      mount(<Dynamic />);
      group().children('.fui-AvatarGroupItem').first().should('have.css', 'width', '16px');
      trigger().find('svg').should('exist');
      group().then($root => {
        cy.then(() => setPie(true));
        group()
          .should('have.css', 'width', '64px')
          .and('have.css', 'clip-path', 'circle(50%)')
          .then($next => expect($next[0]).to.equal($root[0]));
      });
      group().children('.fui-AvatarGroupItem').should('have.length', 3).first().should('have.css', 'width', '64px');
      trigger().should('have.text', '').focus().realPress('Enter');
      surface().find('li').should('have.length', 11);
      surface().find('.fui-AvatarGroupItem__avatar').first().should('have.css', 'width', '24px');
    });
    it('changing children below overflow threshold removes the popup and retains the group and new participant names', () => {
      let setItems: React.Dispatch<React.SetStateAction<string[]>>;
      const Dynamic = () => {
        const [items, update] = React.useState(names);
        setItems = update;
        return <GroupExample items={items} />;
      };
      mount(<Dynamic />);
      trigger().click();
      surface().should('be.visible');
      group().then($root => {
        cy.then(() => setItems(names.slice(0, 3)));
        group().children('.fui-AvatarGroupItem').should('have.length', 3);
        group().then($next => expect($next[0]).to.equal($root[0]));
      });
      surface().should('not.exist');
      trigger().should('not.exist');
      group()
        .find('.fui-AvatarGroupItem__avatar')
        .then($avatars =>
          expect(Array.from($avatars).map(avatar => avatar.getAttribute('aria-label'))).to.deep.equal(
            names.slice(0, 3),
          ),
        );
    });
    it('latest root/overflow callback observes actual native currentTarget and current handler version', () => {
      const calls = cy.stub().as('calls');
      let setVersion: React.Dispatch<React.SetStateAction<number>>;
      const Current = () => {
        const [version, update] = React.useState(0);
        setVersion = update;
        return (
          <GroupExample
            id={`group-${version}`}
            onClick={event => calls('root', version, event.currentTarget.id)}
            popoverProps={{ onOpenChange: (event, data) => calls('popover', version, event.type, data) }}
          />
        );
      };
      mount(<Current />);
      group().should('have.attr', 'id', 'group-0');
      cy.then(() => setVersion(1));
      group().should('have.attr', 'id', 'group-1');
      trigger().click();
      surface().should('be.visible');
      cy.get('@calls').then(() =>
        expect(calls.getCalls().map(call => call.args)).to.deep.equal([
          ['popover', 1, 'click', { open: true }],
          ['root', 1, 'group-1'],
        ]),
      );
    });
    it('controlled overflow rejects requests until external state changes and cannot close itself on Escape', () => {
      const changes = cy.stub().as('changes');
      let setOpen: React.Dispatch<React.SetStateAction<boolean>>;
      const Controlled = () => {
        const [open, update] = React.useState(false);
        setOpen = update;
        return <GroupExample popoverProps={{ open, onOpenChange: changes }} />;
      };
      mount(<Controlled />);
      trigger().click();
      surface().should('not.exist');
      cy.get('@changes').should('have.been.calledOnce');
      cy.get('@changes').then(() => expect(changes.firstCall.args[1]).to.deep.equal({ open: true }));
      cy.then(() => changes.resetHistory());
      cy.then(() => setOpen(true));
      surface().should('be.focused');
      cy.get('@changes').should('not.have.been.called');
      cy.realPress('Escape');
      surface().should('be.visible');
      cy.get('@changes').should('have.been.calledOnce');
      cy.get('@changes').then(() => expect(changes.firstCall.args[1]).to.deep.equal({ open: false }));
      cy.then(() => setOpen(false));
      surface().should('not.exist');
      trigger().should('be.focused');
    });
    it('overflow defaultOpen initializes focus once and later default changes do not reopen it', () => {
      let setDefault: React.Dispatch<React.SetStateAction<boolean>>;
      const Defaults = () => {
        const [value, update] = React.useState(true);
        setDefault = update;
        return (
          <div data-default={String(value)}>
            <GroupExample popoverProps={{ defaultOpen: value }} />
          </div>
        );
      };
      mount(<Defaults />);
      surface().should('be.focused');
      cy.realPress('Escape');
      surface().should('not.exist');
      cy.then(() => setDefault(false));
      cy.get('[data-default="false"]').should('exist');
      cy.then(() => setDefault(true));
      cy.get('[data-default="true"]').should('exist');
      surface().should('not.exist');
      trigger().should('have.attr', 'aria-expanded', 'false');
    });
    it('public Base hook can render native group state with explicitly supplied item context', () => {
      const Base = React.forwardRef<HTMLDivElement, AvatarGroupBaseProps>((props, ref) => {
        const state = useAvatarGroupBase_unstable(props, ref);
        return renderAvatarGroup_unstable(state, { avatarGroup: { layout: state.layout, size: 40 } });
      });
      mount(
        <Base aria-label="Base people">
          <AvatarGroupItem name="Mona Kane" />
          <AvatarGroupItem name="Elvia Atkins" />
        </Base>,
      );
      cy.get('[aria-label="Base people"]')
        .should('have.attr', 'role', 'group')
        .find('.fui-AvatarGroupItem__avatar')
        .each($avatar => cy.wrap($avatar).should('have.css', 'width', '40px'));
    });
    it('consumer avatar-slot size overrides its avatar only, without changing sibling/group context defaults', () => {
      mount(
        <AvatarGroup size={48}>
          <AvatarGroupItem name="Custom" avatar={{ size: 16 }} />
          <AvatarGroupItem name="Default" />
          <AvatarGroupPopover>
            <AvatarGroupItem name="Overflow" />
          </AvatarGroupPopover>
        </AvatarGroup>,
      );
      group()
        .children('.fui-AvatarGroupItem')
        .first()
        .should('have.css', 'width', '48px')
        .find('.fui-AvatarGroupItem__avatar')
        .should('have.css', 'width', '16px');
      group()
        .children('.fui-AvatarGroupItem')
        .eq(1)
        .find('.fui-AvatarGroupItem__avatar')
        .should('have.css', 'width', '48px');
      trigger().should('have.text', '+1');
    });
  });
  (['count', 'icon'] as const).forEach(indicator => {
    it(`Indicator ${indicator}: explicit indicator differs while overflow content remains identical`, () => {
      mount(<GroupExample popoverProps={{ indicator }} />);
      if (indicator === 'count') {
        trigger().should('have.text', '+7');
      } else {
        trigger().should('have.text', '').find('svg').should('exist');
      }
      trigger().click();
      surface().find('li').should('have.length', 7);
    });
  });
  it('Tooltip: localized trigger name and actual hover tooltip preserve keyboard opening', () => {
    mount(<GroupExample popoverProps={{ tooltip: { content: 'More participants', relationship: 'label' } }} />);
    trigger().should('have.attr', 'aria-label', 'More participants').realHover();
    cy.get('[role="tooltip"]').should('be.visible').and('have.text', 'More participants');
    trigger().focus().realPress('Enter');
    surface().should('be.focused');
    cy.realPress('Escape');
    trigger().should('be.focused');
  });
});

describe('AvatarGroup accessibility/edge contracts (round 2)', () => {
  it('disabled overflow trigger is skipped by native Tab and rejects pointer/open callbacks', () => {
    const changes = cy.stub().as('changes');
    mount(<GroupExample popoverProps={{ triggerButton: { disabled: true }, onOpenChange: changes }} />);
    cy.get('[data-test="before"]').focus().realPress('Tab');
    cy.get('[data-test="after"]').should('be.focused');
    trigger().should('be.disabled').click({ force: true });
    surface().should('not.exist');
    cy.get('@changes').should('not.have.been.called');
  });
  [0, 99, 100].forEach(count => {
    it(`explicit count ${count}: supported count formatting/clamping does not alter actual overflow people`, () => {
      mount(<GroupExample popoverProps={{ indicator: 'count', count }} />);
      trigger()
        .should('have.text', count > 99 ? '99+' : `+${count}`)
        .focus()
        .realPress('Enter');
      surface().find('li').should('have.length', 7);
      cy.realPress('Escape');
      trigger().should('be.focused');
    });
  });
  [0, 1, 5].forEach(count => {
    it(`partition boundary ${count}: no unnecessary overflow and passive inline avatars add no Tab stops`, () => {
      mount(<GroupExample items={names.slice(0, count)} />);
      group().should('have.attr', 'role', 'group').children('.fui-AvatarGroupItem').should('have.length', count);
      trigger().should('not.exist');
      cy.get('[data-test="before"]').focus().realPress('Tab');
      cy.get('[data-test="after"]').should('be.focused');
    });
  });
  it('two-person pie creates two opposite half slices and repeats both participants in overflow', () => {
    mount(<GroupExample layout="pie" items={names.slice(0, 2)} />);
    group()
      .children('.fui-AvatarGroupItem')
      .should('have.length', 2)
      .then($items => {
        const [first, second] = Array.from($items).map(item => item.getBoundingClientRect());
        expect(second.left - first.left).to.be.closeTo(first.width / 2, 0.5);
        expect(first.width).to.equal(second.width);
      });
    group().children('.fui-AvatarGroupItem').first().invoke('css', 'clip-path').should('contain', '25%');
    group().children('.fui-AvatarGroupItem').last().invoke('css', 'clip-path').should('contain', '25%');
    trigger().focus().realPress('Space');
    surface()
      .find('.fui-AvatarGroupItem__overflowLabel')
      .then($labels => expect(Array.from($labels).map(el => el.textContent)).to.deep.equal(names.slice(0, 2)));
    surface()
      .find('.fui-AvatarGroupItem__avatar')
      .then($avatars =>
        expect(Array.from($avatars).map(avatar => avatar.getAttribute('aria-label'))).to.deep.equal(names.slice(0, 2)),
      );
  });
  (['spread', 'stack', 'pie'] as const).forEach(layout => {
    it(`RTL ${layout}: logical inline order/geometry and native overflow keyboard access survive direction`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme} dir="rtl">
          <GroupExample layout={layout} />
        </FluentProvider>,
      );
      group()
        .children('.fui-AvatarGroupItem')
        .then($items => {
          const [first, second, third] = Array.from($items).map(item => item.getBoundingClientRect());
          if (layout === 'pie') {
            expect(second.left).to.be.lessThan(first.left);
            expect(third.left).to.be.closeTo(second.left, 0.5);
            expect(third.top).to.be.greaterThan(second.top);
          } else {
            expect(second.left).to.be.lessThan(first.left);
            expect(layout === 'spread' ? second.right < first.left : second.right > first.left).to.equal(true);
          }
        });
      trigger().focus().realPress('Enter');
      surface().should('be.focused');
      cy.realPress('Escape');
      trigger().should('be.focused');
    });
  });
});
