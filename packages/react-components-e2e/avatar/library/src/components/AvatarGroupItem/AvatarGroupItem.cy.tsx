import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { AvatarGroup, AvatarGroupPopover, partitionAvatarGroupItems } from '@fluentui/react-avatar';
import type { AvatarGroupProps, AvatarSize, AvatarProps } from '@fluentui/react-avatar';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { AvatarGroupItem } from './AvatarGroupItem';
import { avatarGroupItemClassNames as classes } from './useAvatarGroupItemStyles.styles';
import { AvatarGroupContext } from '../../contexts/AvatarGroupContext';

const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const root = () => cy.get(`.${classes.root}`);
const avatar = () => cy.get(`.${classes.avatar}`);
const label = () => cy.get(`.${classes.overflowLabel}`);
const trigger = () => cy.get('#item-overflow-trigger');
const surface = () => cy.get('#item-overflow');
const names = ['Allan Munger', 'Daisy Phillips', 'Katri Athokas', 'Robert Tolbert', 'Kevin Sturgis', 'Erik Nason'];
const sizes: AvatarSize[] = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 128];
const rgb = (hex: string) => `rgb(${[1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;

const PartitionedExample = ({ layout }: Pick<AvatarGroupProps, 'layout'>) => {
  const { inlineItems, overflowItems } = partitionAvatarGroupItems({ items: names, layout });
  return (
    <>
      <button data-test="before">Before</button>
      <AvatarGroup layout={layout} aria-label="Participants">
        {inlineItems.map(name => (
          <AvatarGroupItem key={name} name={name} />
        ))}
        <AvatarGroupPopover triggerButton={{ id: 'item-overflow-trigger' }} popoverSurface={{ id: 'item-overflow' }}>
          {overflowItems?.map(name => (
            <AvatarGroupItem key={name} name={name} />
          ))}
        </AvatarGroupPopover>
      </AvatarGroup>
      <button data-test="after">After</button>
    </>
  );
};

const OverflowExample = ({ children }: { children: React.ReactNode }) => (
  <AvatarGroup size={72} layout="stack">
    <AvatarGroupPopover triggerButton={{ id: 'item-overflow-trigger' }} popoverSurface={{ id: 'item-overflow' }}>
      {children}
    </AvatarGroupPopover>
  </AvatarGroup>
);
const openOverflow = () => {
  trigger().realClick();
  surface().should('be.visible').and('have.focus');
};

describe('AvatarGroupItem docs-derived contracts (round 1)', () => {
  (['spread', 'stack', 'pie'] as const).forEach(layout => {
    (['Enter', 'Space'] as const).forEach(key => {
      it(`${layout}: inline and overflow item identity, native ${key}, Escape and restored focus`, () => {
        mount(<PartitionedExample layout={layout} />);
        const inlineNames = layout === 'pie' ? names.slice(0, 3) : names.slice(-4);
        const overflowNames = layout === 'pie' ? names : names.slice(0, 2);
        cy.get('.fui-AvatarGroup')
          .children(`.${classes.root}`)
          .should('have.length', inlineNames.length)
          .each(($item, index) => {
            expect($item.prop('tagName')).to.equal('DIV');
            expect($item.find(`.${classes.avatar}`).attr('aria-label')).to.equal(inlineNames[index]);
            expect($item.find(`.${classes.avatar}`).attr('role')).to.equal('img');
            expect($item.find(`.${classes.overflowLabel}`)).to.have.length(0);
          });
        if (layout === 'pie') {
          cy.get('.fui-AvatarGroup')
            .children(`.${classes.root}`)
            .eq(1)
            .should('have.css', 'transform', 'matrix(0.5, 0, 0, 0.5, 0, 0)')
            .and('have.css', 'left', '16px')
            .and('have.css', 'clip-path', 'inset(0px 0px 2px 2px)');
          cy.get('.fui-AvatarGroup')
            .children(`.${classes.root}`)
            .eq(2)
            .should('have.css', 'top', '16px')
            .and('have.css', 'clip-path', 'inset(2px 0px 0px 2px)');
        }
        cy.get('[data-test="before"]').focus();
        cy.realPress('Tab');
        trigger().should('have.focus');
        cy.realPress(key);
        surface().should('be.visible').and('have.focus');
        surface()
          .find('ul[role="list"]')
          .children(`.${classes.root}`)
          .should('have.length', overflowNames.length)
          .each(($item, index) => {
            expect($item.prop('tagName')).to.equal('LI');
            expect($item.find(`.${classes.avatar}`).attr('aria-label')).to.equal(overflowNames[index]);
            expect($item.find(`.${classes.avatar}`).css('width')).to.equal('24px');
            expect($item.find(`.${classes.overflowLabel}`).text()).to.equal(overflowNames[index]);
            expect($item.find(`.${classes.overflowLabel}`).attr('aria-hidden')).to.equal('true');
          });
        cy.realPress('Escape');
        surface().should('not.exist');
        trigger().should('have.focus');
        cy.realPress('Tab');
        cy.get('[data-test="after"]').should('have.focus');
      });
    });
  });

  describe('AvatarGroupItem undocumented and accessibility edges (round 2)', () => {
    it('an explicitly blank avatar slot name does not fall back to the primary name', () => {
      mount(
        <AvatarGroupContext.Provider value={{ isOverflow: true }}>
          <AvatarGroupItem name="Must not leak" avatar={{ name: '' }} />
        </AvatarGroupContext.Provider>,
      );
      label().should('have.text', '');
      avatar().should('not.have.attr', 'aria-label');
    });

    it('customizing the avatar without a name preserves its default name and overflow label', () => {
      mount(
        <AvatarGroupContext.Provider value={{ isOverflow: true }}>
          <AvatarGroupItem name="Default Name" avatar={{ initials: 'DN' }} />
        </AvatarGroupContext.Provider>,
      );
      label().should('have.text', 'Default Name');
      avatar().should('have.attr', 'aria-label', 'Default Name').and('have.text', 'DN');
    });

    it('overflow label follows the resolved avatar slot name, including a slot override of the primary name', () => {
      mount(
        <OverflowExample>
          <AvatarGroupItem avatar={{ name: 'Slot Only' }} />
          <AvatarGroupItem name="Stale Name" avatar={{ name: 'Resolved Name' }} />
          <AvatarGroupItem name="Default Name" avatar={{ name: 'Avatar Name' }} overflowLabel="Custom Label" />
        </OverflowExample>,
      );
      openOverflow();
      label()
        .should('have.length', 3)
        .then($labels => {
          expect(Array.from($labels).map(node => node.textContent)).to.deep.equal([
            'Slot Only',
            'Resolved Name',
            'Custom Label',
          ]);
        });
      avatar()
        .should('have.length', 3)
        .then($avatars => {
          expect(Array.from($avatars).map(node => node.getAttribute('aria-label'))).to.deep.equal([
            'Slot Only',
            'Resolved Name',
            'Avatar Name',
          ]);
        });
    });

    (['Enter', 'Space', 'pointer'] as const).forEach(key => {
      it(`opt-in focusable avatar forwards ${key} and ref without inventing native button activation`, () => {
        const onAvatarClick = cy.stub().as('avatarClick');
        const onRootClick = cy.stub().as('rootClick');
        const onKeyDown = cy.stub().as('avatarKeyDown');
        const ref = React.createRef<HTMLElement>();
        mount(
          <>
            <button data-test="before">Before</button>
            <AvatarGroup>
              <AvatarGroupItem
                ref={ref}
                name="Katri Athokas"
                data-test="primary"
                root={{ id: 'custom-item-root', onClick: onRootClick }}
                avatar={{ tabIndex: 0, onClick: onAvatarClick, onKeyDown }}
              />
            </AvatarGroup>
            <button data-test="after">After</button>
          </>,
        );
        avatar()
          .should('have.prop', 'tagName', 'SPAN')
          .and('have.attr', 'role', 'img')
          .and('have.attr', 'aria-label', 'Katri Athokas')
          .and('have.attr', 'data-test', 'primary');
        cy.get('#custom-item-root').should('not.have.attr', 'data-test');
        avatar().then($avatar => expect(ref.current).to.equal($avatar[0]));
        cy.get('[data-test="before"]').focus();
        cy.realPress('Tab');
        avatar().should('have.focus');
        cy.then(() => onKeyDown.resetHistory());
        if (key === 'pointer') {
          avatar().realClick();
          cy.get('@avatarClick').should('have.been.calledOnce');
          cy.get('@rootClick').should('have.been.calledOnce');
          cy.get('@avatarKeyDown').should('not.have.been.called');
        } else {
          cy.realPress(key);
          cy.get('@avatarKeyDown')
            .should('have.been.calledOnce')
            .then(() => {
              const event = onKeyDown.firstCall.args[0] as React.KeyboardEvent;
              expect(event.key).to.equal(key === 'Space' ? ' ' : 'Enter');
              expect(event.nativeEvent.isTrusted).to.equal(true);
            });
          cy.get('@avatarClick').should('not.have.been.called');
          cy.get('@rootClick').should('not.have.been.called');
        }
        cy.realPress('Tab');
        cy.get('[data-test="after"]').should('have.focus');
        cy.realPress(['Shift', 'Tab']);
        avatar().should('have.focus');
      });
    });

    it('static overflow items do not enter the tab order or activate on native keyboard/pointer input', () => {
      const onClick = cy.stub().as('itemClick');
      mount(
        <OverflowExample>
          <AvatarGroupItem name="Katri Athokas" onClick={onClick} />
          <AvatarGroupItem name="Daisy Phillips" />
        </OverflowExample>,
      );
      openOverflow();
      avatar().each($avatar => expect($avatar.attr('tabindex')).to.equal(undefined));
      cy.realPress('Tab');
      surface().should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      surface().should('have.focus');
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@itemClick').should('not.have.been.called');
      avatar().first().realClick();
      cy.get('@itemClick').should('have.been.calledOnce');
      surface().should('be.visible');
      cy.realPress('Escape');
      surface().should('not.exist');
      trigger().should('have.focus');
    });

    it('explicit aria-label and aria-labelledby override the name without exposing the duplicate overflow label', () => {
      mount(
        <OverflowExample>
          <AvatarGroupItem name="Katri Athokas" aria-label="Translated name" />
          <AvatarGroupItem
            name="Daisy Phillips"
            aria-labelledby="external-name"
            overflowLabel={{ children: <span id="external-name">External name</span>, 'aria-hidden': false }}
          />
        </OverflowExample>,
      );
      openOverflow();
      avatar().first().should('have.attr', 'aria-label', 'Translated name');
      avatar().last().should('have.attr', 'aria-labelledby', 'external-name').and('not.have.attr', 'aria-label');
      label().first().should('have.text', 'Katri Athokas').and('have.attr', 'aria-hidden', 'true');
      label().last().should('have.text', 'External name').and('have.attr', 'aria-hidden', 'false');
    });

    it('presence and active status retain resolvable accessible-name references on the primary avatar', () => {
      mount(
        <OverflowExample>
          <AvatarGroupItem id="status-avatar" name="Katri Athokas" badge={{ status: 'available' }} active="active" />
        </OverflowExample>,
      );
      openOverflow();
      avatar()
        .should('have.id', 'status-avatar')
        .and('have.attr', 'aria-label', 'Katri Athokas')
        .and('have.attr', 'aria-labelledby', 'status-avatar status-avatar__badge status-avatar__active');
      cy.get('#status-avatar__badge').should('have.attr', 'aria-label', 'available');
      cy.get('#status-avatar__active').should('have.text', 'active').and('have.attr', 'hidden');
      label().should('have.text', 'Katri Athokas').and('have.attr', 'aria-hidden', 'true');
    });

    it('avatar slot overrides forwarded primary props and context size while root retains group dimensions', () => {
      mount(
        <AvatarGroup size={48}>
          <AvatarGroupItem
            name="Primary Name"
            initials="PN"
            className="item-style"
            style={{ outlineWidth: '3px', outlineStyle: 'solid' }}
            avatar={{
              name: 'Slot Name',
              initials: 'SN!',
              size: 20,
              shape: 'square',
              color: 'brand',
              className: 'avatar-style',
            }}
          />
        </AvatarGroup>,
      );
      root()
        .should('have.class', 'item-style')
        .and('have.css', 'width', '48px')
        .and('have.css', 'outline-width', '3px');
      avatar()
        .should('have.class', 'avatar-style')
        .and('not.have.class', 'item-style')
        .and('have.css', 'width', '20px')
        .and('have.attr', 'aria-label', 'Slot Name')
        .and('have.text', 'SN!')
        .and('have.css', 'border-radius', '2px');
      avatar()
        .find('.fui-Avatar__initials')
        .should('have.css', 'background-color', rgb(teamsLightTheme.colorBrandBackgroundStatic));
    });

    ([2, 3] as const).forEach(count => {
      it(`RTL pie ${count} items uses mirrored clipping and offsets; overflow removes pie presentation`, () => {
        mount(
          <AvatarGroup layout="pie">
            {names.slice(0, count).map(name => (
              <AvatarGroupItem key={name} name={name} />
            ))}
            <AvatarGroupPopover
              triggerButton={{ id: 'item-overflow-trigger' }}
              popoverSurface={{ id: 'item-overflow' }}
            >
              <AvatarGroupItem name="Katri Athokas" />
            </AvatarGroupPopover>
          </AvatarGroup>,
          'rtl',
        );
        cy.get('.fui-AvatarGroup')
          .children(`.${classes.root}`)
          .first()
          .should('have.css', 'clip-path', 'inset(0px 25% 0px calc(25% + 1px))');
        cy.get('.fui-AvatarGroup')
          .children(`.${classes.root}`)
          .eq(1)
          .should('have.css', 'left', count === 2 ? '-8px' : '0px')
          .and('have.css', 'transform', count === 2 ? 'none' : 'matrix(0.5, 0, 0, 0.5, 0, 0)');
        openOverflow();
        surface()
          .find(`.${classes.root}`)
          .should('have.css', 'position', 'relative')
          .and('have.css', 'clip-path', 'none')
          .and('have.css', 'transform', 'none')
          .and('have.css', 'margin-left', '0px');
        surface()
          .find(`.${classes.avatar}`)
          .should('have.css', 'width', '24px')
          .and('have.css', 'border-radius', '10000px');
        label().should('have.text', 'Katri Athokas');
      });
    });

    it('duplicate and Unicode names remain distinct list entries with literal labels and no injected markup', () => {
      const values = ['Katri Athokas', 'Katri Athokas', '李 明', '<script>literal</script>'];
      mount(
        <OverflowExample>
          {values.map((name, index) => (
            <AvatarGroupItem key={index} name={name} />
          ))}
        </OverflowExample>,
      );
      openOverflow();
      surface()
        .find(`li.${classes.root}`)
        .should('have.length', 4)
        .each(($item, index) => {
          expect($item.find(`.${classes.avatar}`).attr('aria-label')).to.equal(values[index]);
          expect($item.find(`.${classes.overflowLabel}`).text()).to.equal(values[index]);
          expect($item.find('script')).to.have.length(0);
        });
    });
  });

  sizes.forEach(size => {
    it(`size ${size}: all documented layouts inherit item and avatar dimensions and initials`, () => {
      mount(
        <div>
          {(['spread', 'stack', 'pie'] as const).map(layout => (
            <AvatarGroup key={layout} layout={layout} size={size} data-test={layout}>
              <AvatarGroupItem name="Katri Athokas" />
              <AvatarGroupItem name="Daisy Phillips" />
            </AvatarGroup>
          ))}
        </div>,
      );
      root()
        .should('have.length', 6)
        .each($item => {
          cy.wrap($item).should('have.css', 'width', `${size}px`).and('have.css', 'height', `${size}px`);
        });
      avatar()
        .should('have.length', 6)
        .each($avatar => {
          cy.wrap($avatar).should('have.css', 'width', `${size}px`).and('have.css', 'height', `${size}px`);
        });
      cy.get('[data-test="spread"]')
        .find(`.${classes.avatar}`)
        .first()
        .should('have.text', size === 16 ? 'K' : 'KA');
      cy.get('[data-test="stack"]')
        .children()
        .eq(1)
        .should('have.css', 'margin-left', size < 24 ? '-2px' : size < 48 ? '-4px' : size < 96 ? '-8px' : '-16px');
      const stroke = size < 56 ? 2 : size < 72 ? 3 : 4;
      cy.get('[data-test="stack"]')
        .children()
        .first()
        .should('have.css', 'box-shadow', `${rgb(teamsLightTheme.colorNeutralBackground2)} 0px 0px 0px ${stroke}px`);
      cy.get('[data-test="spread"]').children().first().should('have.css', 'margin-left', '0px');
      cy.get('[data-test="spread"]')
        .children()
        .last()
        .should('have.css', 'margin-left', size < 20 ? '8px' : size < 32 ? '10px' : size < 64 ? '16px' : '20px');
      cy.get('[data-test="pie"]')
        .children()
        .first()
        .should('have.css', 'position', 'absolute')
        .and('have.css', 'clip-path', `inset(0px calc(25% + ${stroke / 2}px) 0px 25%)`)
        .and('have.css', 'left', `${-size / 4}px`);
      cy.get('[data-test="pie"]')
        .children()
        .last()
        .should('have.css', 'clip-path', `inset(0px 25% 0px calc(25% + ${stroke / 2}px))`)
        .and('have.css', 'left', `${size / 4}px`);
      label().should('not.exist');
    });
  });

  it('image representation loads locally and leaves the name on the avatar, not the decorative image', () => {
    const src = `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>',
    )}`;
    mount(
      <AvatarGroup>
        <AvatarGroupItem name="Katri Athokas" image={{ src }} />
      </AvatarGroup>,
    );
    avatar().should('have.attr', 'aria-label', 'Katri Athokas');
    avatar()
      .find('img')
      .should('be.visible')
      .and('have.attr', 'src', src)
      .and('have.attr', 'alt', '')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.attr', 'role', 'presentation');
    avatar()
      .find('img')
      .should($img => {
        expect(($img[0] as HTMLImageElement).complete).to.equal(true);
        expect(($img[0] as HTMLImageElement).naturalWidth).to.equal(4);
      });
  });

  it('default item is a colorful 32px graphical avatar, not an interactive control', () => {
    mount(
      <AvatarGroup>
        <AvatarGroupItem name="Katri Athokas" />
      </AvatarGroup>,
    );
    root().should('have.prop', 'tagName', 'DIV').and('have.css', 'width', '32px');
    avatar().should('have.attr', 'role', 'img').and('have.attr', 'aria-label', 'Katri Athokas').and('have.text', 'KA');
    avatar().should('not.have.attr', 'tabindex');
    avatar()
      .find('.fui-Avatar__initials')
      .should('have.css', 'background-color', rgb(teamsLightTheme.colorPaletteLilacBackground2));
  });

  it('primary avatar initials and icon slots forward customization', () => {
    mount(
      <AvatarGroup>
        <AvatarGroupItem name="Katri Athokas" initials="K!" data-test="custom-initials" />
        <AvatarGroupItem icon={<span data-test="entity-icon">Entity</span>} aria-label="Entity" />
      </AvatarGroup>,
    );
    cy.get('[data-test="custom-initials"]').should('have.text', 'K!').and('have.attr', 'role', 'img');
    cy.get('[data-test="entity-icon"]')
      .should('be.visible')
      .parents(`.${classes.avatar}`)
      .should('have.attr', 'aria-label', 'Entity');
  });
});

describe('AvatarGroupItem unit-derived contracts (round 3)', () => {
  ([false, true, undefined] as const).forEach(isOverflow => {
    it(`unit parity for isOverflow=${String(isOverflow)}: primary test ID and conditional label/tag`, () => {
      mount(
        <AvatarGroupContext.Provider value={{ isOverflow }}>
          <AvatarGroupItem data-testid="unit-avatar" name="Katri Athokas" />
        </AvatarGroupContext.Provider>,
      );
      cy.get('[data-testid="unit-avatar"]').should('have.text', 'KA').and('have.attr', 'role', 'img');
      root()
        .should('have.prop', 'tagName', isOverflow ? 'LI' : 'DIV')
        .and('not.have.attr', 'data-testid');
      if (isOverflow) {
        label().should('have.text', 'Katri Athokas').and('have.attr', 'aria-hidden', 'true');
        root().should('have.text', 'KAKatri Athokas');
      } else {
        label().should('not.exist');
        root().should('have.text', 'KA');
      }
      avatar().should('have.css', 'width', '32px');
    });
  });

  it('unit custom JSX overflowLabel preserves children, test ID and default duplicate-name hiding', () => {
    mount(
      <AvatarGroupContext.Provider value={{ isOverflow: true }}>
        <AvatarGroupItem name="Katri Athokas" overflowLabel={<span data-testid="unit-label">Test Label</span>} />
      </AvatarGroupContext.Provider>,
    );
    cy.get('[data-testid="unit-label"]')
      .should('have.text', 'Test Label')
      .parents(`.${classes.overflowLabel}`)
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.class', classes.overflowLabel);
    root().should('have.prop', 'tagName', 'LI');
    avatar().should('have.text', 'KA').and('have.attr', 'aria-label', 'Katri Athokas');
  });

  it('conformance: primary and root refs point to different slots and detach/reattach without stale nodes', () => {
    const primaryRef = React.createRef<HTMLElement>();
    const rootRef = React.createRef<HTMLDivElement>();
    const RefFixture = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <button data-test="toggle-item" onClick={() => setShow(!show)}>
            Toggle item
          </button>
          <AvatarGroup>
            {show && <AvatarGroupItem ref={primaryRef} root={{ ref: rootRef }} name="Katri Athokas" />}
          </AvatarGroup>
        </>
      );
    };
    mount(<RefFixture />);
    avatar().then($avatar => expect(primaryRef.current).to.equal($avatar[0]));
    root().then($root => {
      expect(rootRef.current).to.equal($root[0]);
      expect(rootRef.current).not.to.equal(primaryRef.current);
    });
    cy.get('[data-test="toggle-item"]').realClick();
    root().should('not.exist');
    cy.then(() => {
      expect(primaryRef.current).to.equal(null);
      expect(rootRef.current).to.equal(null);
    });
    cy.get('[data-test="toggle-item"]').realClick();
    root()
      .should('have.length', 1)
      .then($root => expect(rootRef.current).to.equal($root[0]));
    avatar()
      .should('have.length', 1)
      .then($avatar => expect(primaryRef.current).to.equal($avatar[0]));
  });

  it('context updates rerender inline/overflow tags, label and inherited avatar size in both directions', () => {
    const ContextFixture = () => {
      const [overflow, setOverflow] = React.useState(false);
      return (
        <>
          <button data-test="toggle-context" onClick={() => setOverflow(!overflow)}>
            Toggle context
          </button>
          <AvatarGroupContext.Provider value={{ isOverflow: overflow, size: overflow ? 72 : 16, layout: 'stack' }}>
            <AvatarGroupItem name="Katri Athokas" />
          </AvatarGroupContext.Provider>
        </>
      );
    };
    mount(<ContextFixture />);
    root().should('have.prop', 'tagName', 'DIV').and('have.css', 'width', '16px');
    avatar().should('have.css', 'width', '16px').and('have.text', 'K');
    label().should('not.exist');
    cy.get('[data-test="toggle-context"]').realClick();
    root().should('have.prop', 'tagName', 'LI').and('have.css', 'box-shadow', 'none');
    avatar().should('have.css', 'width', '72px').and('have.text', 'KA');
    label().should('have.text', 'Katri Athokas');
    cy.get('[data-test="toggle-context"]').realClick();
    root().should('have.prop', 'tagName', 'DIV').and('have.css', 'width', '16px');
    avatar().should('have.css', 'width', '16px').and('have.text', 'K');
    label().should('not.exist');
  });

  it('prop updates recompute resolved avatar name and default label; explicit label is never overwritten', () => {
    const NameFixture = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button data-test="change-name" onClick={() => setChanged(!changed)}>
            Change name
          </button>
          <AvatarGroupContext.Provider value={{ isOverflow: true }}>
            <AvatarGroupItem name="Stale Name" avatar={{ name: changed ? 'Daisy Phillips' : 'Katri Athokas' }} />
            <AvatarGroupItem name={changed ? 'Daisy Phillips' : 'Katri Athokas'} overflowLabel="Pinned label" />
          </AvatarGroupContext.Provider>
        </>
      );
    };
    mount(<NameFixture />);
    avatar().first().should('have.attr', 'aria-label', 'Katri Athokas').and('have.text', 'KA');
    label().first().should('have.text', 'Katri Athokas');
    cy.get('[data-test="change-name"]').realClick();
    avatar().each($avatar => {
      cy.wrap($avatar).should('have.attr', 'aria-label', 'Daisy Phillips').and('have.text', 'DP');
    });
    label().first().should('have.text', 'Daisy Phillips');
    label().last().should('have.text', 'Pinned label');
    cy.get('[data-test="change-name"]').realClick();
    label().first().should('have.text', 'Katri Athokas');
    label().last().should('have.text', 'Pinned label');
  });

  it('conformance: root slot overrides root style/class while primary native attributes and slot classes remain separate', () => {
    mount(
      <AvatarGroupContext.Provider value={{ isOverflow: true }}>
        <AvatarGroupItem
          name="Katri Athokas"
          title="Primary title"
          id="primary-native"
          className="outer-class"
          style={{ padding: '13px' }}
          root={{ id: 'root-native', className: 'root-class', style: { padding: '7px' } }}
          avatar={{ className: 'primary-class' }}
          overflowLabel={{ className: 'label-class', title: 'Label title' }}
        />
      </AvatarGroupContext.Provider>,
    );
    root()
      .should('have.class', classes.root)
      .and('have.class', 'root-class')
      .and('not.have.class', 'outer-class')
      .and('have.css', 'padding', '7px')
      .and('have.id', 'root-native')
      .and('not.have.attr', 'title');
    avatar()
      .should('have.class', classes.avatar)
      .and('have.class', 'primary-class')
      .and('have.id', 'primary-native')
      .and('have.attr', 'title', 'Primary title')
      .and('not.have.class', 'root-class')
      .and('not.have.attr', 'name');
    avatar().should('not.have.attr', 'size');
    label()
      .should('have.class', classes.overflowLabel)
      .and('have.class', 'label-class')
      .and('have.attr', 'title', 'Label title');
  });

  it('slot render functions preserve generated root children, avatar props and hidden custom label', () => {
    const renderRoot: SlotRenderFunction<React.ComponentPropsWithRef<'div'>> = (Component, props) => (
      <Component {...props} data-test="render-root" />
    );
    const renderAvatar: SlotRenderFunction<AvatarProps> = (Component, props) => (
      <Component {...props} initials="RF" data-test="render-avatar" />
    );
    const renderLabel: SlotRenderFunction<React.ComponentPropsWithRef<'span'>> = (Component, props) => (
      <Component {...props} data-test="render-label">
        Rendered label
      </Component>
    );
    mount(
      <OverflowExample>
        <AvatarGroupItem
          name="Katri Athokas"
          root={{ children: renderRoot }}
          avatar={{ children: renderAvatar }}
          overflowLabel={{ children: renderLabel }}
        />
      </OverflowExample>,
    );
    openOverflow();
    cy.get('[data-test="render-root"]')
      .should('have.prop', 'tagName', 'LI')
      .and('have.class', classes.root)
      .children()
      .should('have.length', 2);
    cy.get('[data-test="render-avatar"]')
      .should('have.text', 'RF')
      .and('have.attr', 'aria-label', 'Katri Athokas')
      .and('have.css', 'width', '24px');
    cy.get('[data-test="render-label"]')
      .should('have.text', 'Rendered label')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.class', classes.overflowLabel);
  });
});
