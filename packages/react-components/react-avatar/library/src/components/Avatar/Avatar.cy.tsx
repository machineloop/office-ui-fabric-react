import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { getByRole, queryByRole } from '@testing-library/dom';
import { GuestRegular, PeopleTeamRegular, CalendarMonthRegular, PersonRegular } from '@fluentui/react-icons';
import {
  Avatar,
  AvatarContextProvider,
  renderAvatar_unstable,
  useAvatar_unstable,
  useAvatarStyles_unstable,
} from '@fluentui/react-avatar';
import type { AvatarNamedColor, AvatarSize, AvatarProps, AvatarState } from '@fluentui/react-avatar';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const imageSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path fill="rgb(20,100,200)" d="M0 0h2v2H0z"/></svg>';
const imageSrc = `data:image/svg+xml,${encodeURIComponent(imageSvg)}`;
const sizes: AvatarSize[] = [16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 128];
const palette: [AvatarNamedColor, string, string][] = [
  ['dark-red', teamsLightTheme.colorPaletteDarkRedForeground2, teamsLightTheme.colorPaletteDarkRedBackground2],
  ['cranberry', teamsLightTheme.colorPaletteCranberryForeground2, teamsLightTheme.colorPaletteCranberryBackground2],
  ['red', teamsLightTheme.colorPaletteRedForeground2, teamsLightTheme.colorPaletteRedBackground2],
  ['pumpkin', teamsLightTheme.colorPalettePumpkinForeground2, teamsLightTheme.colorPalettePumpkinBackground2],
  ['peach', teamsLightTheme.colorPalettePeachForeground2, teamsLightTheme.colorPalettePeachBackground2],
  ['marigold', teamsLightTheme.colorPaletteMarigoldForeground2, teamsLightTheme.colorPaletteMarigoldBackground2],
  ['gold', teamsLightTheme.colorPaletteGoldForeground2, teamsLightTheme.colorPaletteGoldBackground2],
  ['brass', teamsLightTheme.colorPaletteBrassForeground2, teamsLightTheme.colorPaletteBrassBackground2],
  ['brown', teamsLightTheme.colorPaletteBrownForeground2, teamsLightTheme.colorPaletteBrownBackground2],
  ['forest', teamsLightTheme.colorPaletteForestForeground2, teamsLightTheme.colorPaletteForestBackground2],
  ['seafoam', teamsLightTheme.colorPaletteSeafoamForeground2, teamsLightTheme.colorPaletteSeafoamBackground2],
  ['dark-green', teamsLightTheme.colorPaletteDarkGreenForeground2, teamsLightTheme.colorPaletteDarkGreenBackground2],
  ['light-teal', teamsLightTheme.colorPaletteLightTealForeground2, teamsLightTheme.colorPaletteLightTealBackground2],
  ['teal', teamsLightTheme.colorPaletteTealForeground2, teamsLightTheme.colorPaletteTealBackground2],
  ['steel', teamsLightTheme.colorPaletteSteelForeground2, teamsLightTheme.colorPaletteSteelBackground2],
  ['blue', teamsLightTheme.colorPaletteBlueForeground2, teamsLightTheme.colorPaletteBlueBackground2],
  ['royal-blue', teamsLightTheme.colorPaletteRoyalBlueForeground2, teamsLightTheme.colorPaletteRoyalBlueBackground2],
  ['cornflower', teamsLightTheme.colorPaletteCornflowerForeground2, teamsLightTheme.colorPaletteCornflowerBackground2],
  ['navy', teamsLightTheme.colorPaletteNavyForeground2, teamsLightTheme.colorPaletteNavyBackground2],
  ['lavender', teamsLightTheme.colorPaletteLavenderForeground2, teamsLightTheme.colorPaletteLavenderBackground2],
  ['purple', teamsLightTheme.colorPalettePurpleForeground2, teamsLightTheme.colorPalettePurpleBackground2],
  ['grape', teamsLightTheme.colorPaletteGrapeForeground2, teamsLightTheme.colorPaletteGrapeBackground2],
  ['lilac', teamsLightTheme.colorPaletteLilacForeground2, teamsLightTheme.colorPaletteLilacBackground2],
  ['pink', teamsLightTheme.colorPalettePinkForeground2, teamsLightTheme.colorPalettePinkBackground2],
  ['magenta', teamsLightTheme.colorPaletteMagentaForeground2, teamsLightTheme.colorPaletteMagentaBackground2],
  ['plum', teamsLightTheme.colorPalettePlumForeground2, teamsLightTheme.colorPalettePlumBackground2],
  ['beige', teamsLightTheme.colorPaletteBeigeForeground2, teamsLightTheme.colorPaletteBeigeBackground2],
  ['mink', teamsLightTheme.colorPaletteMinkForeground2, teamsLightTheme.colorPaletteMinkBackground2],
  ['platinum', teamsLightTheme.colorPalettePlatinumForeground2, teamsLightTheme.colorPalettePlatinumBackground2],
  ['anchor', teamsLightTheme.colorPaletteAnchorForeground2, teamsLightTheme.colorPaletteAnchorBackground2],
];
const assertPaint = (element: HTMLElement, foreground: string, background: string) => {
  const style = element.ownerDocument.defaultView!.getComputedStyle(element);
  const probe = element.ownerDocument.createElement('span');
  probe.style.color = foreground;
  expect(style.color).to.equal(probe.style.color);
  probe.style.backgroundColor = background;
  expect(style.backgroundColor).to.equal(probe.style.backgroundColor);
};
const ringColors: Record<AvatarNamedColor | 'neutral' | 'brand', string> = {
  neutral: teamsLightTheme.colorBrandStroke1,
  brand: teamsLightTheme.colorBrandStroke1,
  'dark-red': teamsLightTheme.colorPaletteDarkRedBorderActive,
  cranberry: teamsLightTheme.colorPaletteCranberryBorderActive,
  red: teamsLightTheme.colorPaletteRedBorderActive,
  pumpkin: teamsLightTheme.colorPalettePumpkinBorderActive,
  peach: teamsLightTheme.colorPalettePeachBorderActive,
  marigold: teamsLightTheme.colorPaletteMarigoldBorderActive,
  gold: teamsLightTheme.colorPaletteGoldBorderActive,
  brass: teamsLightTheme.colorPaletteBrassBorderActive,
  brown: teamsLightTheme.colorPaletteBrownBorderActive,
  forest: teamsLightTheme.colorPaletteForestBorderActive,
  seafoam: teamsLightTheme.colorPaletteSeafoamBorderActive,
  'dark-green': teamsLightTheme.colorPaletteDarkGreenBorderActive,
  'light-teal': teamsLightTheme.colorPaletteLightTealBorderActive,
  teal: teamsLightTheme.colorPaletteTealBorderActive,
  steel: teamsLightTheme.colorPaletteSteelBorderActive,
  blue: teamsLightTheme.colorPaletteBlueBorderActive,
  'royal-blue': teamsLightTheme.colorPaletteRoyalBlueBorderActive,
  cornflower: teamsLightTheme.colorPaletteCornflowerBorderActive,
  navy: teamsLightTheme.colorPaletteNavyBorderActive,
  lavender: teamsLightTheme.colorPaletteLavenderBorderActive,
  purple: teamsLightTheme.colorPalettePurpleBorderActive,
  grape: teamsLightTheme.colorPaletteGrapeBorderActive,
  lilac: teamsLightTheme.colorPaletteLilacBorderActive,
  pink: teamsLightTheme.colorPalettePinkBorderActive,
  magenta: teamsLightTheme.colorPaletteMagentaBorderActive,
  plum: teamsLightTheme.colorPalettePlumBorderActive,
  beige: teamsLightTheme.colorPaletteBeigeBorderActive,
  mink: teamsLightTheme.colorPaletteMinkBorderActive,
  platinum: teamsLightTheme.colorPalettePlatinumBorderActive,
  anchor: teamsLightTheme.colorPaletteAnchorBorderActive,
};
const assertShadow = (element: HTMLElement, expected: string) => {
  const view = element.ownerDocument.defaultView!;
  const probe = element.ownerDocument.createElement('span');
  probe.style.boxShadow = expected;
  element.appendChild(probe);
  const normalized = view.getComputedStyle(probe).boxShadow;
  probe.remove();
  expect(view.getComputedStyle(element, '::after').boxShadow).to.equal(normalized);
};
const assertAvatarName = (element: HTMLElement, name: string) =>
  expect(getByRole(element.ownerDocument.body, 'img', { name })).to.equal(element);
const settledAvatar = () =>
  cy
    .get('#avatar')
    .should($avatar =>
      expect($avatar[0].getAnimations({ subtree: true }).some(animation => animation.playState === 'running')).to.equal(
        false,
      ),
    );

describe('Avatar documented scenarios', () => {
  it('renders the documented accessible Guest default with a painted Person icon', () => {
    mount(
      <>
        <Avatar id="avatar" aria-label="Guest" />
        <span id="person-reference">
          <PersonRegular />
        </span>
      </>,
    );
    cy.get('#avatar')
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.class', 'fui-Avatar')
      .and('have.css', 'width', '32px')
      .and('have.css', 'height', '32px')
      .should($avatar => assertAvatarName($avatar[0], 'Guest'));
    cy.get('#avatar .fui-Avatar__icon')
      .should('have.attr', 'aria-hidden', 'true')
      .and('have.css', 'font-size', '20px')
      .should($icon => {
        assertPaint($icon[0], teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorNeutralBackground6);
        expect($icon[0].querySelector('svg path')!.getAttribute('d')).to.equal(
          $icon[0].ownerDocument.querySelector('#person-reference svg path')!.getAttribute('d'),
        );
        expect($icon[0].getBoundingClientRect().width).to.equal(32);
      });
    cy.get('#avatar .fui-Avatar__initials').should('not.exist');
  });

  for (const size of sizes) {
    for (const shape of ['circular', 'square'] as const) {
      it(`paints documented ${size}px ${shape} initials with the expected typography and radius`, () => {
        mount(<Avatar id="avatar" size={size} shape={shape} name="Ashley McCarthy" />);
        const radius =
          shape === 'circular'
            ? teamsLightTheme.borderRadiusCircular
            : size <= 24
            ? teamsLightTheme.borderRadiusSmall
            : size <= 48
            ? teamsLightTheme.borderRadiusMedium
            : size <= 72
            ? teamsLightTheme.borderRadiusLarge
            : teamsLightTheme.borderRadiusXLarge;
        const font =
          size <= 24
            ? '10px'
            : size <= 28
            ? '12px'
            : size <= 40
            ? '14px'
            : size <= 56
            ? '16px'
            : size <= 96
            ? '20px'
            : '24px';
        cy.get('#avatar')
          .should('have.css', 'width', `${size}px`)
          .and('have.css', 'height', `${size}px`)
          .and('have.css', 'border-radius', radius)
          .and('have.css', 'font-size', font)
          .should($avatar => assertAvatarName($avatar[0], 'Ashley McCarthy'));
        cy.get('#avatar .fui-Avatar__initials')
          .should('have.text', size === 16 ? 'A' : 'AM')
          .and('have.css', 'border-radius', radius)
          .should($initials => {
            const rect = $initials[0].getBoundingClientRect();
            expect(rect.width).to.equal(size);
            expect(rect.height).to.equal(size);
          });
      });
    }
  }

  for (const [color, fg, bg] of [
    ['neutral', teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorNeutralBackground6],
    ['brand', teamsLightTheme.colorNeutralForegroundStaticInverted, teamsLightTheme.colorBrandBackgroundStatic],
    ...palette,
  ] as const) {
    it(`paints documented ${color} initials and active ring using matching theme colors`, () => {
      mount(<Avatar id="avatar" name="Palette person" color={color} initials="PP" active="active" />);
      cy.get('#avatar .fui-Avatar__initials')
        .should('have.text', 'PP')
        .should($initials => assertPaint($initials[0], fg, bg));
      cy.get('#avatar').should($avatar => {
        assertAvatarName($avatar[0], 'Palette person active');
        const probe = $avatar[0].ownerDocument.createElement('span');
        probe.style.color = ringColors[color];
        const ring = $avatar[0].ownerDocument.defaultView!.getComputedStyle($avatar[0], '::before');
        expect(ring.color).to.equal(probe.style.color);
        expect(ring.content).to.equal('""');
      });
    });
  }

  it('uses documented colorful name and id hashing with stable exact palette paint', () => {
    mount(
      <>
        <Avatar id="avatar" color="colorful" name="A" />
        <Avatar id="same-color" color="colorful" idForColor="A" initials="ID" aria-label="Identifier" />
      </>,
    );
    // Single character A hashes to 65, selecting index 5 (marigold) in the public colorful palette.
    cy.get('#avatar .fui-Avatar__initials').should($initials =>
      assertPaint(
        $initials[0],
        teamsLightTheme.colorPaletteMarigoldForeground2,
        teamsLightTheme.colorPaletteMarigoldBackground2,
      ),
    );
    cy.get('#same-color .fui-Avatar__initials').should($initials =>
      assertPaint(
        $initials[0],
        teamsLightTheme.colorPaletteMarigoldForeground2,
        teamsLightTheme.colorPaletteMarigoldBackground2,
      ),
    );
  });

  it('renders documented custom initials instead of deriving them from the accessible name', () => {
    mount(<Avatar id="avatar" name="Cecil Robin Folk" initials="CRF" />);
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'CRF').and('be.visible');
    cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], 'Cecil Robin Folk'));
  });

  it('renders documented custom icon glyphs in circular and square avatars', () => {
    mount(
      <>
        <Avatar id="avatar" icon={<GuestRegular />} aria-label="Guest" />
        <Avatar id="team" icon={<PeopleTeamRegular />} shape="square" aria-label="Team" />
        <span id="guest-reference">
          <GuestRegular />
        </span>
        <span id="team-reference">
          <PeopleTeamRegular />
        </span>
      </>,
    );
    for (const [id, reference, name] of [
      ['avatar', 'guest-reference', 'Guest'],
      ['team', 'team-reference', 'Team'],
    ]) {
      cy.get(`#${id}`).should($avatar => {
        assertAvatarName($avatar[0], name);
        const path = $avatar[0].querySelector('svg path')!.getAttribute('d');
        expect(path).to.equal($avatar[0].ownerDocument.querySelector(`#${reference} svg path`)!.getAttribute('d'));
        expect(path).not.to.equal('');
      });
    }
  });

  it('loads the documented image over initials using deterministic local pixels and decorative image semantics', () => {
    const ref = React.createRef<HTMLImageElement>();
    mount(<Avatar id="avatar" name="Katri Athokas" image={{ src: imageSrc, ref }} />);
    cy.get('#avatar img')
      .should($image => {
        expect(ref.current).to.equal($image[0]);
        expect(ref.current!.complete).to.equal(true);
        expect(ref.current!.naturalWidth).to.equal(2);
        const canvas = $image[0].ownerDocument.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.drawImage(ref.current!, 0, 0);
        expect(Array.from(context.getImageData(0, 0, 1, 1).data)).to.deep.equal([20, 100, 200, 255]);
        const rect = $image[0].getBoundingClientRect();
        expect($image[0].ownerDocument.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).to.equal(
          $image[0],
        );
      })
      .and('have.attr', 'role', 'presentation')
      .and('have.attr', 'aria-hidden', 'true')
      .and('have.attr', 'alt', '')
      .and('have.css', 'object-fit', 'cover');
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'KA');
    cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], 'Katri Athokas'));
  });

  for (const [status, text] of [
    ['available', 'available'],
    ['busy', 'busy'],
    ['out-of-office', 'out of office'],
    ['away', 'away'],
    ['offline', 'offline'],
    ['do-not-disturb', 'do not disturb'],
    ['blocked', 'blocked'],
  ] as const) {
    for (const outOfOffice of [false, true]) {
      it(`includes documented ${status} presence with outOfOffice ${outOfOffice} in the computed name`, () => {
        mount(<Avatar id="avatar" name="Presence person" badge={{ status, outOfOffice }} />);
        const label = text + (outOfOffice && status !== 'out-of-office' ? ' out of office' : '');
        cy.get('#avatar').should($avatar => {
          assertAvatarName($avatar[0], `Presence person ${label}`);
          const badge = getByRole($avatar[0], 'img', { name: label });
          expect(badge.classList.contains('fui-Avatar__badge')).to.equal(true);
          expect(badge.querySelector('svg path')!.getAttribute('d')).to.match(/^M/);
          expect(badge.getBoundingClientRect().width).to.equal(10);
        });
        cy.get('#avatar .fui-Avatar__initials').should('have.css', 'mask-image').and('not.equal', 'none');
      });
    }
  }

  it('renders the documented custom badge icon while preserving presence naming', () => {
    mount(
      <>
        <Avatar id="avatar" name="John Doe" badge={{ icon: <CalendarMonthRegular /> }} />
        <span id="badge-reference">
          <CalendarMonthRegular />
        </span>
      </>,
    );
    cy.get('#avatar').should($avatar => {
      assertAvatarName($avatar[0], 'John Doe available');
      expect($avatar[0].querySelector('.fui-Avatar__badge svg path')!.getAttribute('d')).to.equal(
        $avatar[0].ownerDocument.querySelector('#badge-reference svg path')!.getAttribute('d'),
      );
    });
  });

  for (const activeAppearance of ['ring', 'shadow', 'ring-shadow'] as const) {
    it(`paints documented active ${activeAppearance} decorations and includes active in its name`, () => {
      mount(<Avatar id="avatar" name="Active person" active="active" activeAppearance={activeAppearance} />);
      settledAvatar();
      cy.get('#avatar').should($avatar => {
        assertAvatarName($avatar[0], 'Active person active');
        const view = $avatar[0].ownerDocument.defaultView!;
        const ring = view.getComputedStyle($avatar[0], '::before');
        const shadow = view.getComputedStyle($avatar[0], '::after');
        expect(ring.content).to.equal(activeAppearance === 'shadow' ? 'none' : '""');
        expect(shadow.content).to.equal(activeAppearance === 'ring' ? 'none' : '""');
        if (activeAppearance !== 'shadow') {
          expect(ring.borderWidth).to.equal('2px');
        }
        if (activeAppearance !== 'ring') {
          assertShadow($avatar[0], teamsLightTheme.shadow8);
        }
      });
    });
  }

  it('paints documented inactive scale opacity and presence plus inactive name', () => {
    mount(<Avatar id="avatar" name="Isaac Fielder" active="inactive" badge={{ status: 'away' }} />);
    settledAvatar();
    cy.get('#avatar')
      .should('have.css', 'opacity', '0.8')
      .and('have.css', 'transform', 'matrix(0.875, 0, 0, 0.875, 0, 0)')
      .should($avatar => {
        assertAvatarName($avatar[0], 'Isaac Fielder away inactive');
        expect($avatar[0].getBoundingClientRect().width).to.equal(28);
        expect($avatar[0].querySelector('[hidden]')!.textContent).to.equal('inactive');
      });
  });
});

describe('Avatar supported API and accessibility edges', () => {
  for (const size of sizes) {
    it(`scales the fallback icon badge ring and shadow at the supported ${size}px boundary`, () => {
      mount(
        <Avatar
          id="avatar"
          size={size}
          aria-label="Sized guest"
          active="active"
          activeAppearance="ring-shadow"
          badge={{ status: 'available' }}
        />,
      );
      const iconSize =
        size <= 16 ? 12 : size <= 24 ? 16 : size <= 40 ? 20 : size <= 48 ? 24 : size <= 56 ? 28 : size <= 72 ? 32 : 48;
      const badgeSize = size >= 96 ? 28 : size >= 64 ? 20 : size >= 56 ? 16 : size >= 40 ? 12 : size >= 28 ? 10 : 6;
      const ringWidth = size <= 48 ? 2 : size <= 64 ? 3 : 4;
      settledAvatar();
      cy.get('#avatar .fui-Avatar__icon').should('have.css', 'font-size', `${iconSize}px`);
      cy.get('#avatar .fui-Avatar__badge').should('have.css', 'width', `${badgeSize}px`);
      cy.get('#avatar').should($avatar => {
        assertAvatarName($avatar[0], 'Sized guest');
        const view = $avatar[0].ownerDocument.defaultView!;
        const ring = view.getComputedStyle($avatar[0], '::before');
        const shadow = view.getComputedStyle($avatar[0], '::after');
        expect(ring.borderWidth).to.equal(`${ringWidth}px`);
        expect(ring.maskImage).to.contain('radial-gradient');
        assertShadow(
          $avatar[0],
          size <= 28
            ? teamsLightTheme.shadow4
            : size <= 48
            ? teamsLightTheme.shadow8
            : size <= 64
            ? teamsLightTheme.shadow16
            : teamsLightTheme.shadow28,
        );
        expect(shadow.content).to.equal('""');
      });
    });
  }

  it('updates active appearance and resets activity to the undecorated named default', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance activity
          </button>
          <Avatar
            id="avatar"
            name="Activity person"
            active={phase === 0 ? 'active' : phase === 1 ? 'inactive' : undefined}
            activeAppearance={phase === 0 ? 'ring-shadow' : phase === 1 ? 'shadow' : undefined}
          />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], 'Activity person active'));
    cy.get('#advance-avatar').realClick();
    settledAvatar();
    cy.get('#avatar')
      .should('have.css', 'opacity', '0.8')
      .should($avatar => assertAvatarName($avatar[0], 'Activity person inactive'));
    cy.get('#advance-avatar').realClick();
    settledAvatar();
    cy.get('#avatar')
      .should('have.css', 'opacity', '1')
      .and('have.css', 'transform', 'none')
      .should($avatar => {
        assertAvatarName($avatar[0], 'Activity person');
        const view = $avatar[0].ownerDocument.defaultView!;
        expect(view.getComputedStyle($avatar[0], '::before').content).to.equal('none');
        expect(view.getComputedStyle($avatar[0], '::after').content).to.equal('none');
        expect($avatar[0].querySelector('[hidden]')).to.equal(null);
      });
  });

  it('updates name and colorful id overrides then returns to neutral when options are omitted', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance color
          </button>
          <Avatar
            id="avatar"
            name={phase === 0 ? 'A' : 'B'}
            color={phase < 3 ? 'colorful' : undefined}
            idForColor={phase === 1 ? 'A' : undefined}
          />
        </>
      );
    };
    mount(<Updating />);
    for (const [phase, fg, bg, text] of [
      [0, teamsLightTheme.colorPaletteMarigoldForeground2, teamsLightTheme.colorPaletteMarigoldBackground2, 'A'],
      [1, teamsLightTheme.colorPaletteMarigoldForeground2, teamsLightTheme.colorPaletteMarigoldBackground2, 'B'],
      [2, teamsLightTheme.colorPaletteGoldForeground2, teamsLightTheme.colorPaletteGoldBackground2, 'B'],
      [3, teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorNeutralBackground6, 'B'],
    ] as const) {
      if (phase > 0) {
        cy.get('#advance-avatar').realClick();
      }
      cy.get('#avatar .fui-Avatar__initials')
        .should('have.text', text)
        .should($initials => assertPaint($initials[0], fg, bg));
      cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], text));
    }
  });

  it('resets explicit square size and native attributes to circular default size on omission', () => {
    const Updating = () => {
      const [custom, setCustom] = React.useState(true);
      return (
        <>
          <button id="reset-avatar" onClick={() => setCustom(false)}>
            Reset props
          </button>
          <Avatar
            id="avatar"
            as="span"
            name="Reset person"
            size={custom ? 72 : undefined}
            shape={custom ? 'square' : undefined}
            title={custom ? 'Tooltip' : undefined}
            lang={custom ? 'fr' : undefined}
            dir={custom ? 'rtl' : undefined}
            data-owner={custom ? 'caller' : undefined}
          />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar')
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.attr', 'title', 'Tooltip')
      .and('have.attr', 'lang', 'fr')
      .and('have.attr', 'dir', 'rtl')
      .and('have.attr', 'data-owner', 'caller')
      .and('have.css', 'width', '72px')
      .and('have.css', 'border-radius', teamsLightTheme.borderRadiusLarge);
    cy.get('#reset-avatar').realClick();
    cy.get('#avatar')
      .should('have.css', 'width', '32px')
      .and('have.css', 'height', '32px')
      .and('have.css', 'border-radius', teamsLightTheme.borderRadiusCircular)
      .should($avatar => {
        for (const key of ['title', 'lang', 'dir', 'data-owner', 'name', 'size', 'shape']) {
          expect($avatar[0].hasAttribute(key), key).to.equal(false);
        }
        assertAvatarName($avatar[0], 'Reset person');
      });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`places the badge and its transparent paint cutout on the logical end in ${dir}`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme} dir={dir}>
          <Avatar id="avatar" name="Kat Larrson" size={64} badge={{ status: 'away' }} />
        </FluentProvider>,
      );
      cy.get('#avatar .fui-Avatar__initials')
        .should('have.text', dir === 'rtl' ? 'LK' : 'KL')
        .should($initials =>
          expect($initials[0].ownerDocument.defaultView!.getComputedStyle($initials[0]).maskImage).to.contain(
            dir === 'rtl' ? 'left 10px' : 'right 10px',
          ),
        );
      cy.get('#avatar').should($avatar => {
        const root = $avatar[0].getBoundingClientRect();
        const badge = $avatar[0].querySelector('.fui-Avatar__badge')!.getBoundingClientRect();
        expect(badge.bottom).to.equal(root.bottom);
        expect(dir === 'rtl' ? badge.left : badge.right).to.equal(dir === 'rtl' ? root.left : root.right);
      });
    });
  }

  it('updates default status and out of office labeling then removes the badge and all label references', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance badge
          </button>
          <Avatar
            id="avatar"
            name="Badge person"
            active={phase < 2 ? 'active' : undefined}
            badge={phase === 0 ? {} : phase === 1 ? { status: 'unknown', outOfOffice: true } : null}
          />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], 'Badge person available active'));
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], 'Badge person unknown out of office active'));
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar .fui-Avatar__badge').should('not.exist');
    cy.get('#avatar').should($avatar => {
      assertAvatarName($avatar[0], 'Badge person');
      expect($avatar[0].hasAttribute('aria-labelledby')).to.equal(false);
      expect($avatar[0].querySelector('[hidden]')).to.equal(null);
    });
    cy.get('#avatar .fui-Avatar__initials').should('have.css', 'mask-image', 'none');
  });

  it('gives explicit aria label and labelledby precedence then restores default name badge and activity', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <span id="external-label">External name</span>
          <span id="description">Profile description</span>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance labels
          </button>
          <Avatar
            id="avatar"
            name="Named person"
            active="active"
            badge={{ status: 'away' }}
            aria-label={phase < 2 ? 'Caller name' : undefined}
            aria-labelledby={phase === 0 ? 'external-label' : undefined}
            aria-describedby="description"
          />
        </>
      );
    };
    mount(<Updating />);
    for (const [phase, name] of [
      [0, 'External name'],
      [1, 'Caller name'],
      [2, 'Named person away active'],
    ] as const) {
      if (phase > 0) {
        cy.get('#advance-avatar').realClick();
      }
      cy.get('#avatar').should($avatar =>
        expect(
          getByRole($avatar[0].ownerDocument.body, 'img', {
            name,
            description: 'Profile description',
          }),
        ).to.equal($avatar[0]),
      );
    }
  });

  it('keeps explicit empty labels without silently restoring name or activity strings', () => {
    mount(<Avatar id="avatar" name="Not the label" aria-label="" active="active" badge={{ status: 'busy' }} />);
    cy.get('#avatar').should($avatar => {
      assertAvatarName($avatar[0], '');
      expect($avatar[0].getAttribute('aria-label')).to.equal('');
      expect($avatar[0].hasAttribute('aria-labelledby')).to.equal(false);
      expect($avatar[0].querySelector('[hidden]')).to.equal(null);
    });
  });

  it('honors hidden and aria-hidden on the native root and restores accessibility when removed', () => {
    const Updating = () => {
      const [hidden, setHidden] = React.useState(true);
      return (
        <>
          <button id="reveal-avatar" onClick={() => setHidden(false)}>
            Reveal avatars
          </button>
          <Avatar id="avatar" name="Hidden person" hidden={hidden} />
          <Avatar id="aria-hidden-avatar" name="ARIA hidden person" aria-hidden={hidden ? true : undefined} />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar').should('not.be.visible');
    cy.get('#aria-hidden-avatar')
      .should('be.visible')
      .should($avatar => {
        expect(queryByRole($avatar[0].ownerDocument.body, 'img', { name: 'Hidden person' })).to.equal(null);
        expect(queryByRole($avatar[0].ownerDocument.body, 'img', { name: 'ARIA hidden person' })).to.equal(null);
      });
    cy.get('#reveal-avatar').realClick();
    cy.get('#avatar')
      .should('be.visible')
      .should($avatar => assertAvatarName($avatar[0], 'Hidden person'));
    cy.get('#aria-hidden-avatar').should($avatar => {
      expect($avatar[0].hasAttribute('aria-hidden')).to.equal(false);
      assertAvatarName($avatar[0], 'ARIA hidden person');
    });
  });

  it('forwards explicit interactive semantics and uses latest removed root events without inventing button behavior', () => {
    const clicks: number[] = [];
    const keys: string[] = [];
    const prevented: boolean[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <div onKeyDown={event => prevented.push(event.defaultPrevented)}>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance handlers
          </button>
          <Avatar
            id="avatar"
            role="button"
            tabIndex={0}
            aria-label="Profile action"
            onClick={phase < 2 ? () => clicks.push(phase) : undefined}
            onKeyDown={
              phase < 2
                ? event => {
                    keys.push(`${phase}:${event.key}`);
                    event.preventDefault();
                  }
                : undefined
            }
          />
        </div>
      );
    };
    mount(<Updating />);
    cy.get('#avatar')
      .should($avatar =>
        expect(
          getByRole($avatar[0].ownerDocument.body, 'button', {
            name: 'Profile action',
          }),
        ).to.equal($avatar[0]),
      )
      .realClick()
      .should('be.focused')
      .realPress('Enter');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar').realClick().realPress('Space');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar').realClick().realPress('ArrowRight');
    cy.then(() => {
      expect(clicks).to.deep.equal([0, 1]);
      expect(keys).to.deep.equal(['0:Enter', '1: ']);
      expect(prevented).to.deep.equal([true, true, false]);
    });
  });

  for (const [label, image] of [
    ['omitted', undefined],
    ['null', null],
    ['missing src', {}],
    ['empty src', { src: '' }],
  ] as const) {
    it(`omits a ${label} image rather than fetching a document or suppressing fallback initials`, () => {
      mount(<Avatar id="avatar" name="Fallback person" image={image} />);
      cy.get('#avatar img').should('not.exist');
      cy.get('#avatar .fui-Avatar__initials').should('have.text', 'FP').and('be.visible');
    });
  }

  it('shows initials during a genuinely pending local image load then paints the loaded image above them', () => {
    let release: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    cy.intercept('GET', '**/avatar-held.svg', async request => {
      await gate;
      request.reply({ statusCode: 200, headers: { 'content-type': 'image/svg+xml' }, body: imageSvg });
    }).as('heldImage');
    const ref = React.createRef<HTMLImageElement>();
    mount(<Avatar id="avatar" name="Loading person" image={{ src: '/avatar-held.svg', ref }} />);
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'LP').and('be.visible');
    cy.get('#avatar img').should(() => {
      expect(ref.current!.complete).to.equal(false);
      expect(ref.current!.naturalWidth).to.equal(0);
    });
    cy.then(() => release());
    cy.wait('@heldImage');
    cy.get('#avatar img').should($image => {
      expect(ref.current!.naturalWidth).to.equal(2);
      const rect = $image[0].getBoundingClientRect();
      expect($image[0].ownerDocument.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).to.equal(
        $image[0],
      );
    });
  });

  it('falls back after real image errors and recovers on src load with latest replaced and removed handlers', () => {
    const calls: string[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance image
          </button>
          <Avatar
            id="avatar"
            aria-label="Image guest"
            icon={<GuestRegular />}
            image={{
              src: phase % 2 === 0 ? `data:image/png;base64,broken${phase}` : imageSrc + `#${phase}`,
              onError:
                phase < 2
                  ? event => {
                      event.preventDefault();
                      calls.push(`error:${phase}`);
                    }
                  : undefined,
              onLoad: phase < 2 ? () => calls.push(`load:${phase}`) : undefined,
            }}
          />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar img').should('not.be.visible').and('have.attr', 'hidden');
    cy.get('#avatar .fui-Avatar__icon').should('be.visible');
    cy.then(() => expect(calls).to.deep.equal(['error:0']));
    cy.get('#advance-avatar').realClick();
    cy.get<HTMLImageElement>('#avatar img')
      .should('be.visible')
      .should($image => {
        expect($image[0].hasAttribute('hidden')).to.equal(false);
        expect($image[0].naturalWidth).to.equal(2);
      });
    cy.get('#avatar .fui-Avatar__icon').should('not.exist');
    cy.then(() => expect(calls).to.deep.equal(['error:0', 'load:1']));
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar img').should('not.be.visible');
    cy.get('#avatar .fui-Avatar__icon').should('be.visible');
    cy.get('#advance-avatar').realClick();
    cy.get<HTMLImageElement>('#avatar img')
      .should('be.visible')
      .should($image => expect($image[0].naturalWidth).to.equal(2));
    cy.get('#avatar .fui-Avatar__icon').should('not.exist');
    cy.then(() => expect(calls).to.deep.equal(['error:0', 'load:1']));
  });

  it('retains initials after image failure then removes the image slot on src omission', () => {
    const Updating = () => {
      const [removed, setRemoved] = React.useState(false);
      return (
        <>
          <button id="remove-image" onClick={() => setRemoved(true)}>
            Remove source
          </button>
          <Avatar
            id="avatar"
            name="Initials fallback"
            image={{ src: removed ? undefined : 'data:image/png;base64,broken' }}
          />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar img').should('not.be.visible');
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'IF').and('be.visible');
    cy.get('#avatar .fui-Avatar__icon').should('not.exist');
    cy.get('#remove-image').realClick();
    cy.get('#avatar img').should('not.exist');
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'IF');
  });

  it('replaces custom initials removes them with null and restores name-derived defaults on omission', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      const initials: AvatarProps['initials'] =
        phase === 0
          ? { id: 'initials', children: 'XY' }
          : phase === 1
          ? { id: 'initials', children: 'ZZ' }
          : phase === 2
          ? null
          : undefined;
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance initials
          </button>
          <Avatar id="avatar" name="Name Default" initials={initials} />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#initials').should('have.text', 'XY');
    cy.get('#advance-avatar').realClick();
    cy.get('#initials').should('have.text', 'ZZ');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar .fui-Avatar__initials').should('not.exist');
    cy.get('#avatar .fui-Avatar__icon').should('be.visible');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'ND');
    cy.get('#avatar .fui-Avatar__icon').should('not.exist');
  });

  for (const icon of [null, { children: null }] as const) {
    it(`supports ${icon === null ? 'null icon slot' : 'null icon children'} without restoring the Person glyph`, () => {
      mount(<Avatar id="avatar" icon={icon} aria-label="No glyph" />);
      cy.get('#avatar svg').should('not.exist');
      cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], 'No glyph'));
      cy.get('#avatar .fui-Avatar__icon').should(icon === null ? 'not.exist' : 'exist');
    });
  }

  it('updates caller slot styles and resets overrides without dropping class names or defaults', () => {
    const Updating = () => {
      const [custom, setCustom] = React.useState(true);
      return (
        <>
          <button id="reset-avatar" onClick={() => setCustom(false)}>
            Reset styles
          </button>
          <Avatar
            id="avatar"
            name="Style person"
            size={40}
            className={custom ? 'custom-avatar' : undefined}
            style={custom ? { width: '45px', height: '45px' } : undefined}
            initials={{
              className: custom ? 'custom-initials' : undefined,
              style: custom ? { backgroundColor: teamsLightTheme.colorBrandBackgroundStatic } : undefined,
            }}
          />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar')
      .should('have.class', 'custom-avatar')
      .and('have.css', 'width', '45px')
      .and('have.css', 'height', '45px');
    cy.get('#avatar .fui-Avatar__initials')
      .should('have.class', 'custom-initials')
      .should($initials =>
        assertPaint($initials[0], teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorBrandBackgroundStatic),
      );
    cy.get('#reset-avatar').realClick();
    cy.get('#avatar')
      .should('not.have.class', 'custom-avatar')
      .and('have.class', 'fui-Avatar')
      .and('have.css', 'width', '40px')
      .and('have.css', 'height', '40px');
    cy.get('#avatar .fui-Avatar__initials')
      .should('not.have.class', 'custom-initials')
      .should($initials =>
        assertPaint($initials[0], teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorNeutralBackground6),
      );
  });
});

describe('Avatar meaningful unit-derived contracts', () => {
  for (const [name, initials] of [
    ['First', 'F'],
    ['First Last', 'FL'],
    ['First Middle Last', 'FL'],
    ['First Second Third Fourth', 'F'],
    [' David (The man) Goff [Team] ', 'DG'],
    ['David Zearing-Goff', 'DZ'],
    ['4lex 5loo', '45'],
    ['\u00cdrissa \u00de\u00f3r\u00f0ard\u00f3ttir', '\u00cd\u00de'],
    ['\u{20000} \u{20001}', '\u{20000}\u{20001}'],
    ['\u{20000}\u6842', '\u{20000}'],
    ['(111)-555-1234', ''],
    ['\u062e\u0633\u0631\u0648', ''],
    ['\u6842\u82f1', ''],
    ['\uac15\ud604', ''],
    ['\u304b\u308a', ''],
    ['', ''],
    ['   ', ''],
  ] as const) {
    it(`renders the unit-derived initials or icon fallback for name ${JSON.stringify(name)}`, () => {
      mount(
        <>
          <Avatar id="avatar" name={name} />
          <span id="person-reference">
            <PersonRegular />
          </span>
        </>,
      );
      if (initials) {
        cy.get('#avatar .fui-Avatar__initials').should('have.text', initials).and('be.visible');
        cy.get('#avatar .fui-Avatar__icon').should('not.exist');
      } else {
        cy.get('#avatar .fui-Avatar__initials').should('not.exist');
        cy.get('#avatar .fui-Avatar__icon svg path').should($path =>
          expect($path[0].getAttribute('d')).to.equal(
            $path[0].ownerDocument.querySelector('#person-reference svg path')!.getAttribute('d'),
          ),
        );
      }
      cy.get('#avatar').should($avatar => {
        expect($avatar[0].hasAttribute('name')).to.equal(false);
        if (name) {
          assertAvatarName($avatar[0], name.trim().replace(/\s+/g, ' '));
        }
      });
    });
  }

  it('reverses whole supplementary initials in RTL and keeps only the first code point at size 16', () => {
    const Updating = () => {
      const [small, setSmall] = React.useState(false);
      return (
        <FluentProvider theme={teamsLightTheme} dir="rtl">
          <button id="shrink-avatar" onClick={() => setSmall(true)}>
            Shrink avatar
          </button>
          <Avatar id="avatar" name={'\u{20000} \u{20001}'} size={small ? 16 : 32} />
        </FluentProvider>
      );
    };
    mount(<Updating />);
    cy.get('#avatar .fui-Avatar__initials').should('have.text', '\u{20001}\u{20000}');
    cy.get('#shrink-avatar').realClick();
    cy.get('#avatar .fui-Avatar__initials').should('have.text', '\u{20000}');
  });

  it('prioritizes a successfully painted image over initials and omits the custom icon until both disappear', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance fallback
          </button>
          <Avatar
            id="avatar"
            name={phase < 2 ? 'First Last' : undefined}
            aria-label="Fallback order"
            image={phase === 0 ? { src: imageSrc } : null}
            icon={<GuestRegular />}
          />
          <span id="glyph-reference">
            <GuestRegular />
          </span>
        </>
      );
    };
    mount(<Updating />);
    cy.get<HTMLImageElement>('#avatar img').should($image => {
      expect($image[0].naturalWidth).to.equal(2);
      expect($image[0].previousElementSibling!.textContent).to.equal('FL');
    });
    cy.get('#avatar .fui-Avatar__icon').should('not.exist');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar img').should('not.exist');
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'FL').and('be.visible');
    cy.get('#avatar .fui-Avatar__icon').should('not.exist');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar .fui-Avatar__initials').should('not.exist');
    cy.get('#avatar .fui-Avatar__icon').should($icon =>
      expect($icon[0].querySelector('svg path')!.getAttribute('d')).to.equal(
        $icon[0].ownerDocument.querySelector('#glyph-reference svg path')!.getAttribute('d'),
      ),
    );
  });

  it('names custom initials with explicit or generated IDs and includes badge and hidden activity text', () => {
    mount(
      <>
        <Avatar
          id="explicit-avatar"
          initials={{ id: 'initials-label', children: 'FL' }}
          badge={{ id: 'presence-label', status: 'away' }}
          active="inactive"
        />
        <Avatar id="generated-avatar" initials="ABC" />
      </>,
    );
    cy.get('#explicit-avatar').should($avatar => {
      assertAvatarName($avatar[0], 'FL away inactive');
      expect($avatar[0].getAttribute('aria-labelledby')).to.equal(
        'initials-label presence-label explicit-avatar__active',
      );
      const active = $avatar[0].querySelector('#explicit-avatar__active')!;
      expect(active.hasAttribute('hidden')).to.equal(true);
      expect(active.textContent).to.equal('inactive');
    });
    cy.get('#generated-avatar').should($avatar => {
      assertAvatarName($avatar[0], 'ABC');
      const initials = $avatar[0].querySelector('.fui-Avatar__initials')!;
      expect(initials.id).not.to.equal('');
      expect($avatar[0].getAttribute('aria-labelledby')).to.equal(initials.id);
    });
  });

  it('forwards object refs to each actual slot and clears them across fallback changes and unmount', () => {
    const rootRef = React.createRef<HTMLSpanElement>();
    const initialsRef = React.createRef<HTMLSpanElement>();
    const imageRef = React.createRef<HTMLImageElement>();
    const badgeRef = React.createRef<HTMLDivElement>();
    const iconRef = React.createRef<HTMLSpanElement>();
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance refs
          </button>
          {phase < 2 && (
            <Avatar
              id="avatar"
              ref={rootRef}
              name={phase === 0 ? 'Ref Person' : undefined}
              initials={{ ref: initialsRef }}
              image={phase === 0 ? { src: imageSrc, ref: imageRef } : null}
              badge={{ ref: badgeRef }}
              icon={{ ref: iconRef }}
            />
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar').should($avatar => {
      expect(rootRef.current).to.equal($avatar[0]);
      expect(initialsRef.current).to.equal($avatar[0].querySelector('.fui-Avatar__initials'));
      expect(imageRef.current).to.equal($avatar[0].querySelector('img'));
      expect(badgeRef.current).to.equal($avatar[0].querySelector('.fui-Avatar__badge'));
      expect(iconRef.current).to.equal(null);
    });
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar .fui-Avatar__icon').should($icon => {
      expect(iconRef.current).to.equal($icon[0]);
      expect(initialsRef.current).to.equal(null);
      expect(imageRef.current).to.equal(null);
    });
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar').should('not.exist');
    cy.then(() => {
      for (const ref of [rootRef, initialsRef, imageRef, badgeRef, iconRef]) {
        expect(ref.current).to.equal(null);
      }
    });
  });

  it('detaches replaced callback refs for root initials and badge and clears current callbacks on unmount', () => {
    const first = [cy.stub(), cy.stub(), cy.stub()];
    const next = [cy.stub(), cy.stub(), cy.stub()];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      const refs = phase === 0 ? first : next;
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance callbacks
          </button>
          {phase < 2 && (
            <Avatar
              id="avatar"
              ref={refs[0]}
              name="Callback person"
              initials={{ ref: refs[1] }}
              badge={{ ref: refs[2] }}
            />
          )}
        </>
      );
    };
    mount(<Updating />);
    for (const [index, selector] of [
      [0, '#avatar'],
      [1, '#avatar .fui-Avatar__initials'],
      [2, '#avatar .fui-Avatar__badge'],
    ] as const) {
      cy.get(selector).should($slot => expect(first[index].lastCall.args[0]).to.equal($slot[0]));
    }
    cy.get('#advance-avatar').realClick();
    for (const [index, selector] of [
      [0, '#avatar'],
      [1, '#avatar .fui-Avatar__initials'],
      [2, '#avatar .fui-Avatar__badge'],
    ] as const) {
      cy.get(selector).should($slot => {
        expect(first[index].lastCall.args[0]).to.equal(null);
        expect(next[index].lastCall.args[0]).to.equal($slot[0]);
      });
    }
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar').should('not.exist');
    cy.then(() => next.forEach(ref => expect(ref.lastCall.args[0]).to.equal(null)));
  });

  it('preserves typed root initials and badge render functions with native image props refs and children', () => {
    const rootRef = React.createRef<HTMLSpanElement>();
    const imageRef = React.createRef<HTMLImageElement>();
    const rootRender: SlotRenderFunction<AvatarState['root']> = (Component, props) => (
      <Component {...props} data-rendered="root">
        {props.children}
      </Component>
    );
    const initialsRender: SlotRenderFunction<NonNullable<AvatarState['initials']>> = (Component, props) => (
      <Component {...props} data-rendered="initials">
        XY
      </Component>
    );
    const badgeRender: SlotRenderFunction<NonNullable<AvatarState['badge']>> = (Component, props) => (
      <Component {...props} data-rendered="badge" />
    );
    mount(
      <Avatar
        id="avatar"
        ref={rootRef}
        name="Rendered person"
        initials={{ children: initialsRender }}
        image={{ src: imageSrc, ref: imageRef }}
        badge={{ status: 'busy', children: badgeRender }}
      >
        {rootRender}
      </Avatar>,
    );
    cy.get('#avatar')
      .should('have.attr', 'data-rendered', 'root')
      .should($avatar => {
        expect(rootRef.current).to.equal($avatar[0]);
        assertAvatarName($avatar[0], 'Rendered person busy');
      });
    cy.get('#avatar .fui-Avatar__initials').should('have.attr', 'data-rendered', 'initials').and('have.text', 'XY');
    cy.get('#avatar img').should($image => {
      expect(imageRef.current).to.equal($image[0]);
      expect(imageRef.current!.naturalWidth).to.equal(2);
    });
    cy.get('#avatar .fui-Avatar__badge').should('have.attr', 'data-rendered', 'badge');
  });

  it('renders a typed icon function with its native props and expected custom glyph', () => {
    const ref = React.createRef<HTMLSpanElement>();
    const iconRender: SlotRenderFunction<NonNullable<AvatarState['icon']>> = (Component, props) => (
      <Component {...props} data-rendered="icon">
        <GuestRegular />
      </Component>
    );
    mount(
      <>
        <Avatar id="avatar" aria-label="Rendered guest" icon={{ children: iconRender, ref, title: 'Icon tooltip' }} />
        <span id="glyph-reference">
          <GuestRegular />
        </span>
      </>,
    );
    cy.get('#avatar .fui-Avatar__icon')
      .should('have.attr', 'data-rendered', 'icon')
      .and('have.attr', 'title', 'Icon tooltip')
      .and('have.attr', 'aria-hidden', 'true')
      .should($icon => {
        expect(ref.current).to.equal($icon[0]);
        expect($icon[0].querySelector('svg path')!.getAttribute('d')).to.equal(
          $icon[0].ownerDocument.querySelector('#glyph-reference svg path')!.getAttribute('d'),
        );
      });
  });

  it('uses latest removed initials and badge native handlers and preserves default prevention and bubbling', () => {
    const calls: string[] = [];
    const bubbled: boolean[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      const handler =
        phase < 2
          ? (event: React.MouseEvent<HTMLElement>) => {
              calls.push(`${event.currentTarget.id}:${phase}`);
              event.preventDefault();
            }
          : undefined;
      return (
        <div
          onClick={event => {
            if (event.target !== event.currentTarget) {
              bubbled.push(event.defaultPrevented);
            }
          }}
        >
          <button
            id="advance-avatar"
            onClick={event => {
              event.stopPropagation();
              setPhase(value => value + 1);
            }}
          >
            Advance slots
          </button>
          <Avatar
            id="avatar"
            name="Event person"
            size={64}
            initials={{ id: 'initials', onClick: handler }}
            badge={{ id: 'badge', onClick: handler }}
          />
        </div>
      );
    };
    mount(<Updating />);
    for (let phase = 0; phase < 3; phase++) {
      if (phase > 0) {
        cy.get('#advance-avatar').realClick();
      }
      cy.get('#initials').realClick();
      cy.get('#badge').realClick();
    }
    cy.then(() => {
      expect(calls).to.deep.equal(['initials:0', 'badge:0', 'initials:1', 'badge:1']);
      expect(bubbled).to.deep.equal([true, true, true, true, false, false]);
    });
  });

  it('inherits Avatar context defaults honors explicit overrides and resets when the provider is removed', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      const avatar = (
        <Avatar
          id="avatar"
          name="Context person"
          size={phase === 1 ? 40 : undefined}
          shape={phase === 1 ? 'circular' : undefined}
        />
      );
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance context
          </button>
          {phase < 3 ? (
            <AvatarContextProvider value={{ size: 64, shape: 'square' }}>{avatar}</AvatarContextProvider>
          ) : (
            avatar
          )}
        </>
      );
    };
    mount(<Updating />);
    for (const [phase, size, radius] of [
      [0, 64, teamsLightTheme.borderRadiusLarge],
      [1, 40, teamsLightTheme.borderRadiusCircular],
      [2, 64, teamsLightTheme.borderRadiusLarge],
      [3, 32, teamsLightTheme.borderRadiusCircular],
    ] as const) {
      if (phase > 0) {
        cy.get('#advance-avatar').realClick();
      }
      cy.get('#avatar')
        .should('have.css', 'width', `${size}px`)
        .and('have.css', 'border-radius', radius)
        .should($avatar => assertAvatarName($avatar[0], 'Context person'));
    }
  });

  it('supports typed hook style render recomposition with native refs accessible labels and slot paint', () => {
    const Recomposed = React.forwardRef<HTMLElement, AvatarProps>((props, ref) => {
      const state = useAvatar_unstable(props, ref);
      useAvatarStyles_unstable(state);
      state.root.title = 'Recomposed tooltip';
      return renderAvatar_unstable(state);
    });
    const ref = React.createRef<HTMLElement>();
    mount(<Recomposed id="avatar" ref={ref} name="Recomposed person" color="brand" className="consumer-avatar" />);
    cy.get('#avatar')
      .should('have.class', 'consumer-avatar')
      .and('have.class', 'fui-Avatar')
      .and('have.attr', 'title', 'Recomposed tooltip')
      .should($avatar => {
        expect(ref.current).to.equal($avatar[0]);
        assertAvatarName($avatar[0], 'Recomposed person');
      });
    cy.get('#avatar .fui-Avatar__initials')
      .should('have.text', 'RP')
      .should($initials =>
        assertPaint(
          $initials[0],
          teamsLightTheme.colorNeutralForegroundStaticInverted,
          teamsLightTheme.colorBrandBackgroundStatic,
        ),
      );
  });

  it('applies and removes provider custom style hooks without losing caller props refs or painted initials', () => {
    const ref = React.createRef<HTMLSpanElement>();
    const customStyle = (state: unknown) => {
      const avatar = state as AvatarState;
      avatar.root.style = { ...avatar.root.style, width: '45px', height: '45px' };
      if (avatar.initials) {
        avatar.initials.style = {
          ...avatar.initials.style,
          backgroundColor: teamsLightTheme.colorBrandBackgroundStatic,
        };
      }
    };
    const Updating = () => {
      const [custom, setCustom] = React.useState(true);
      return (
        <FluentProvider
          theme={teamsLightTheme}
          customStyleHooks_unstable={
            custom
              ? {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  useAvatarStyles_unstable: customStyle,
                }
              : {}
          }
        >
          <button id="reset-provider" onClick={() => setCustom(false)}>
            Reset provider
          </button>
          <Avatar id="avatar" ref={ref} name="Provider person" title="Caller tooltip" />
        </FluentProvider>
      );
    };
    mount(<Updating />);
    cy.get('#avatar').should('have.css', 'width', '45px');
    cy.get('#avatar .fui-Avatar__initials').should($initials =>
      assertPaint($initials[0], teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorBrandBackgroundStatic),
    );
    cy.get('#reset-provider').realClick().should('be.focused');
    cy.get('#avatar')
      .should('have.css', 'width', '32px')
      .and('have.attr', 'title', 'Caller tooltip')
      .should($avatar => {
        expect(ref.current).to.equal($avatar[0]);
        assertAvatarName($avatar[0], 'Provider person');
      });
    cy.get('#avatar .fui-Avatar__initials').should($initials =>
      assertPaint($initials[0], teamsLightTheme.colorNeutralForeground3, teamsLightTheme.colorNeutralBackground6),
    );
  });
});

describe('Avatar remaining supported default restoration contracts', () => {
  it('keeps explicit unset activity undecorated despite a non-default active appearance', () => {
    mount(<Avatar id="avatar" name="Unset person" active="unset" activeAppearance="ring-shadow" />);
    cy.get('#avatar')
      .should('have.css', 'opacity', '1')
      .and('have.css', 'transform', 'none')
      .should($avatar => {
        assertAvatarName($avatar[0], 'Unset person');
        const view = $avatar[0].ownerDocument.defaultView!;
        expect(view.getComputedStyle($avatar[0], '::before').content).to.equal('none');
        expect(view.getComputedStyle($avatar[0], '::after').content).to.equal('none');
      });
  });

  it('replaces a custom icon removes it with null and restores the Person glyph on omission', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      const icon: AvatarProps['icon'] =
        phase === 0 ? <GuestRegular /> : phase === 1 ? <PeopleTeamRegular /> : phase === 2 ? null : undefined;
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance icon
          </button>
          <Avatar id="avatar" aria-label="Icon lifecycle" icon={icon} />
          <span id="guest-reference">
            <GuestRegular />
          </span>
          <span id="team-reference">
            <PeopleTeamRegular />
          </span>
          <span id="person-reference">
            <PersonRegular />
          </span>
        </>
      );
    };
    mount(<Updating />);
    for (const [phase, reference] of [
      [0, 'guest-reference'],
      [1, 'team-reference'],
      [2, null],
      [3, 'person-reference'],
    ] as const) {
      if (phase > 0) {
        cy.get('#advance-avatar').realClick();
      }
      if (reference) {
        cy.get('#avatar .fui-Avatar__icon svg path').should($path =>
          expect($path[0].getAttribute('d')).to.equal(
            $path[0].ownerDocument.querySelector(`#${reference} svg path`)!.getAttribute('d'),
          ),
        );
      } else {
        cy.get('#avatar .fui-Avatar__icon').should('not.exist');
      }
    }
  });

  it('treats empty and zero custom initials as empty slots and restores derived initials on omission', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-avatar" onClick={() => setPhase(value => value + 1)}>
            Advance empty initials
          </button>
          <Avatar id="avatar" name="Empty Person" initials={phase === 0 ? '' : phase === 1 ? 0 : undefined} />
        </>
      );
    };
    mount(<Updating />);
    cy.get('#avatar .fui-Avatar__initials').should('not.exist');
    cy.get('#avatar .fui-Avatar__icon').should('be.visible');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar .fui-Avatar__initials').should('not.exist');
    cy.get('#avatar .fui-Avatar__icon').should('be.visible');
    cy.get('#advance-avatar').realClick();
    cy.get('#avatar .fui-Avatar__initials').should('have.text', 'EP');
    cy.get('#avatar .fui-Avatar__icon').should('not.exist');
    cy.get('#avatar').should($avatar => assertAvatarName($avatar[0], 'Empty Person'));
  });
});
