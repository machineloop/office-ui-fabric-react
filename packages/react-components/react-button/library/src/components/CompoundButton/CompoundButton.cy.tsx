import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme, tokens } from '@fluentui/react-theme';
import { Tooltip } from '@fluentui/react-tooltip';
import { getByRole } from '@testing-library/dom';
import { CompoundButton } from './CompoundButton';
import type { CompoundButtonProps } from './CompoundButton.types';
import { compoundButtonClassNames } from './useCompoundButtonStyles.styles';
import { ButtonContextProvider } from '../../contexts/ButtonContext';
import { useTestStyles } from './CompoundButton.cy.styles';
import { useCompoundButtonBase_unstable, useCompoundButton_unstable } from './useCompoundButton';
import { renderCompoundButton_unstable } from './renderCompoundButton';
import type { CompoundButtonBaseProps } from './CompoundButton.types';

const mount = (element: React.ReactElement, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      {element}
    </FluentProvider>,
  );
const button = () => cy.get('[data-testid="compound"]');
type RootMouseEvent = React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>;
type RootFocusEvent = React.FocusEvent<HTMLButtonElement | HTMLAnchorElement>;
type RootKeyEvent = React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>;
const content = () => button().find(`.${compoundButtonClassNames.contentContainer}`);
const secondary = () => button().find(`.${compoundButtonClassNames.secondaryContent}`);
const glyph = <svg aria-hidden="true" focusable="false" data-testid="glyph" />;
const name = (value: string, role: 'button' | 'link' = 'button', description = '') =>
  cy.get('[data-cy-root]').should(root => {
    expect(getByRole(root[0], role, { name: value, description })).to.equal(
      root[0].querySelector('[data-testid="compound"]'),
    );
  });
const activate = () => {
  button().realClick();
  button().focus().realPress('Enter').realPress('Space');
  cy.get('@click').should('have.been.calledThrice');
};
const appearances = ['secondary', 'primary', 'outline', 'subtle', 'transparent'] as const;
const sizes = ['small', 'medium', 'large'] as const;
const shapes = ['rounded', 'circular', 'square'] as const;
const roots: Array<[string, CompoundButtonProps, 'button' | 'link']> = [
  ['native button', {}, 'button'],
  ['anchor button', { as: 'a' }, 'button'],
  ['anchor link', { as: 'a', href: '#compound-destination' }, 'link'],
];

const BaseCompound = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, CompoundButtonBaseProps>((props, ref) =>
  renderCompoundButton_unstable(useCompoundButtonBase_unstable(props, ref)),
);
const HookCompound = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, CompoundButtonProps>((props, ref) => {
  const state = useCompoundButton_unstable(props, ref);
  return (
    <>
      <output data-testid="state">{`${state.appearance}/${state.size}/${state.shape}/${state.iconPosition}/${state.iconOnly}`}</output>
      {renderCompoundButton_unstable(state)}
    </>
  );
});

describe('CompoundButton unit-derived regressions', () => {
  roots.forEach(([rootName, props, role]) => {
    it(`recomposes the base hook and renderer for ${rootName} without invented visual or checked state`, () => {
      const click = cy.spy().as('click');
      mount(
        <BaseCompound
          data-testid="compound"
          {...props}
          icon={glyph}
          secondaryContent="Details"
          onClick={(event: RootMouseEvent) => {
            event.preventDefault();
            click();
          }}
        >
          Action
        </BaseCompound>,
      );
      name('ActionDetails', role);
      button().should('not.have.class', 'fui-CompoundButton');
      button().should('not.have.attr', 'aria-pressed');
      if (rootName === 'native button') {
        button().should('have.attr', 'type', 'button');
      } else {
        button().should('not.have.attr', 'type');
      }
      activate();
    });

    it(`uses current root click, focus, blur and keyboard closures on ${rootName} and removes them cleanly`, () => {
      const events = cy.spy().as('events');
      const Example = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <div onClick={event => event.preventDefault()}>
              <CompoundButton
                data-testid="compound"
                {...props}
                secondaryContent="Details"
                onClick={
                  phase === 2 ? undefined : (event: RootMouseEvent) => events(phase, 'click', event.currentTarget)
                }
                onFocus={
                  phase === 2 ? undefined : (event: RootFocusEvent) => events(phase, 'focus', event.currentTarget)
                }
                onBlur={phase === 2 ? undefined : (event: RootFocusEvent) => events(phase, 'blur', event.currentTarget)}
                onKeyDown={
                  phase === 2
                    ? undefined
                    : (event: RootKeyEvent) => events(phase, `down:${event.key}`, event.currentTarget)
                }
                onKeyUp={
                  phase === 2
                    ? undefined
                    : (event: RootKeyEvent) => events(phase, `up:${event.key}`, event.currentTarget)
                }
              >
                Action
              </CompoundButton>
            </div>
            <button onClick={() => setPhase(value => value + 1)}>Next handlers</button>
          </>
        );
      };
      mount(<Example />);
      button().realClick().realPress('Enter');
      cy.get('@events').should('have.been.calledWithMatch', 0, 'down:Enter');
      cy.contains('button', 'Next handlers').click();
      cy.get('@events').should('have.been.calledWithMatch', 0, 'blur');
      button().realClick().realPress('Space');
      button().then(element => {
        cy.get('@events').should('have.been.calledWith', 1, 'focus', element[0]);
        cy.get('@events').should('have.been.calledWith', 1, 'click', element[0]);
      });
      cy.get('@events').should('have.been.calledWithMatch', 1, 'up: ');
      cy.contains('button', 'Next handlers').click();
      cy.get('@events').should('have.been.calledWithMatch', 1, 'blur');
      cy.then(() => {
        const count = events.callCount;
        button().realClick().realPress('Enter').realPress('Space');
        cy.contains('button', 'Next handlers').click();
        cy.get('@events').should('have.callCount', count);
      });
      button().realClick();
      cy.get('@events').should('have.been.calledWithMatch', 3, 'click');
    });

    it(`preserves ${rootName} root render-function native props, refs, icon and secondary structure`, () => {
      const ref = cy.spy().as('ref');
      const click = cy.spy().as('click');
      mount(
        <CompoundButton
          data-testid="compound"
          {...props}
          ref={ref}
          icon={glyph}
          secondaryContent="Details"
          onClick={(event: RootMouseEvent) => {
            event.preventDefault();
            click();
          }}
        >
          {(Root: React.ElementType, rootProps: React.HTMLAttributes<HTMLButtonElement | HTMLAnchorElement>) => (
            <Root {...rootProps}>
              <span>Rendered action</span>
              {rootProps.children}
            </Root>
          )}
        </CompoundButton>,
      );
      name('Rendered action Details', role);
      secondary().should('have.text', 'Details');
      button().find('[data-testid="glyph"]').should('have.length', 1);
      button().then(element => cy.get('@ref').its('lastCall.args.0').should('equal', element[0]));
      activate();
    });
  });

  (['icon', 'secondaryContent', 'contentContainer'] as const).forEach(slotName => {
    it(`preserves ${slotName} render-function props, ref and actual renderer-supplied children`, () => {
      const ref = cy.spy().as('ref');
      const slotClick = cy.spy().as('slotClick');
      const click = cy.spy().as('click');
      const props: CompoundButtonProps = {
        [slotName]: {
          id: 'rendered-slot',
          ref,
          title: 'Render title',
          onClick: slotClick,
          children: (Slot: React.ElementType, slotProps: React.HTMLAttributes<HTMLSpanElement>) => (
            <Slot {...slotProps}>
              {slotName === 'icon' ? glyph : slotName === 'secondaryContent' ? 'Rendered details' : slotProps.children}
            </Slot>
          ),
        },
      };
      mount(
        <CompoundButton data-testid="compound" icon={glyph} secondaryContent="Details" {...props} onClick={click}>
          Action
        </CompoundButton>,
      );
      name(
        slotName === 'secondaryContent'
          ? 'Action Render title'
          : slotName === 'contentContainer'
          ? 'Render title'
          : 'Render title Action Details',
      );
      content().should('contain.text', 'Action');
      secondary().should('have.text', slotName === 'secondaryContent' ? 'Rendered details' : 'Details');
      cy.get('#rendered-slot')
        .should('have.attr', 'title', 'Render title')
        .then(element => cy.get('@ref').its('lastCall.args.0').should('equal', element[0]));
      cy.get('#rendered-slot').realClick();
      cy.get('@slotClick').should('have.been.calledOnce');
      cy.get('@click').should('have.been.calledOnce');
    });
  });

  (
    [
      ['absent', undefined],
      ['null', null],
      ['false', false],
      ['empty string', ''],
    ] as const
  ).forEach(([label, children]) => {
    it(`omits the content container for icon-only ${label} primary children and an empty secondary slot`, () => {
      const click = cy.spy().as('click');
      mount(
        <CompoundButton data-testid="compound" icon={glyph} secondaryContent={{}} aria-label="Action" onClick={click}>
          {children}
        </CompoundButton>,
      );
      content().should('not.exist');
      secondary().should('not.exist');
      name('Action');
      activate();
    });
  });

  (
    [
      ['omitted', undefined],
      ['null', null],
      ['empty object', {}],
      ['empty string', ''],
    ] as const
  ).forEach(([label, icon]) => {
    it(`keeps primary and secondary contents for ${label} icon shorthand`, () => {
      mount(
        <CompoundButton data-testid="compound" icon={icon} secondaryContent="Details">
          Action
        </CompoundButton>,
      );
      content().should('have.text', 'ActionDetails');
      name('Action Details');
      if (icon === undefined || icon === null) {
        button().find('.fui-CompoundButton__icon').should('not.exist');
      } else {
        button().find('.fui-CompoundButton__icon').should('have.text', '');
      }
    });
  });

  it('renders non-hidden string icon shorthand with its actual accessible-name contribution', () => {
    mount(
      <CompoundButton data-testid="compound" icon="Calendar" secondaryContent="Details">
        Action
      </CompoundButton>,
    );
    name('Calendar Action Details');
  });

  it('characterizes incorrect loss of primary numeric zero beside an icon without endorsing it', () => {
    mount(
      <CompoundButton data-testid="compound" icon={glyph}>
        {0}
      </CompoundButton>,
    );
    button().should('have.text', '');
    content().should('not.exist');
    name('');
  });

  it('characterizes incorrect loss of secondary numeric zero beside an icon without endorsing it', () => {
    mount(<CompoundButton data-testid="compound" icon={glyph} secondaryContent={0} />);
    secondary().should('not.exist');
    content().should('not.exist');
    name('');
  });

  it('characterizes incorrect numeric zero icon classification as text-layout rather than icon-only', () => {
    mount(<CompoundButton data-testid="compound" icon={0} />);
    button().find('.fui-CompoundButton__icon').should('have.text', '0');
    content().should('have.text', '');
    button().should('have.css', 'min-width', '96px');
    name('0');
  });

  it('preserves numeric zero primary and secondary contents without an icon and with a populated opposite text slot', () => {
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <CompoundButton
            data-testid="compound"
            icon={phase === 0 ? undefined : glyph}
            secondaryContent={phase === 1 ? 'Details' : 0}
          >
            {phase === 2 ? 'Action' : 0}
          </CompoundButton>
          <button onClick={() => setPhase(value => value + 1)}>Next zero control</button>
        </>
      );
    };
    mount(<Example />);
    name('0 0');
    cy.contains('button', 'Next zero control').click();
    name('0 Details');
    cy.contains('button', 'Next zero control').click();
    name('Action 0');
  });

  it('recomputes styled hook defaults, explicit values and ButtonContext size without a controlled checked API', () => {
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <ButtonContextProvider value={phase === 2 ? { size: 'large' } : {}}>
            <HookCompound
              data-testid="compound"
              {...(phase === 1 ? { size: 'small', appearance: 'primary', shape: 'square', iconPosition: 'after' } : {})}
              icon={phase === 3 ? glyph : undefined}
            >
              {phase === 3 ? undefined : 'Action'}
            </HookCompound>
          </ButtonContextProvider>
          <button onClick={() => setPhase(value => value + 1)}>Next hook</button>
        </>
      );
    };
    mount(<Example />);
    cy.get('[data-testid="state"]').should('have.text', 'secondary/medium/rounded/before/false');
    cy.contains('button', 'Next hook').click();
    cy.get('[data-testid="state"]').should('have.text', 'primary/small/square/after/false');
    cy.contains('button', 'Next hook').click();
    cy.get('[data-testid="state"]').should('have.text', 'secondary/large/rounded/before/false');
    cy.contains('button', 'Next hook').click();
    cy.get('[data-testid="state"]').should('have.text', 'secondary/medium/rounded/before/true');
  });

  it('isolates nested and adjacent ButtonContexts and lets explicit size override and then restore inheritance', () => {
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <ButtonContextProvider value={{ size: phase === 2 ? 'large' : 'small' }}>
            <CompoundButton data-testid="compound" size={phase === 0 ? 'large' : undefined} secondaryContent="Details">
              Action
            </CompoundButton>
            <ButtonContextProvider value={{ size: 'medium' }}>
              <CompoundButton data-testid="nested">Nested</CompoundButton>
            </ButtonContextProvider>
          </ButtonContextProvider>
          <CompoundButton data-testid="outside">Outside</CompoundButton>
          <button onClick={() => setPhase(value => value + 1)}>Next context</button>
        </>
      );
    };
    mount(<Example />);
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    cy.get('[data-testid="nested"]').should('have.css', 'min-width', '96px');
    cy.get('[data-testid="outside"]').should('have.css', 'min-width', '96px');
    cy.contains('button', 'Next context').click();
    button().should('have.css', 'min-width', '64px');
    secondary().should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    cy.contains('button', 'Next context').click();
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    cy.get('[data-testid="nested"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    cy.get('[data-testid="outside"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
  });

  it('retains focused root while changing primary/secondary children, icon position, content slots and loading recipe', () => {
    const starts = cy.spy().as('starts');
    const ref = cy.spy().as('ref');
    const Example = () => {
      const [phase, setPhase] = React.useState<'ready' | 'loading' | 'loaded'>('ready');
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          {visible && (
            <CompoundButton
              data-testid="compound"
              ref={ref}
              disabledFocusable={phase === 'loading'}
              aria-busy={phase === 'loading'}
              icon={phase === 'ready' ? undefined : glyph}
              iconPosition={phase === 'loaded' ? 'after' : 'before'}
              secondaryContent={phase === 'ready' ? 'Details' : phase === 'loading' ? 'Please wait' : 'Finished'}
              onClick={() => {
                starts();
                setPhase('loading');
              }}
            >
              {phase === 'ready' ? 'Start' : phase === 'loading' ? 'Loading' : 'Loaded'}
            </CompoundButton>
          )}
          <button onClick={() => setPhase('loaded')}>Complete consumer work</button>
          <button onClick={() => setPhase('ready')}>Reset consumer work</button>
          <button onClick={() => setVisible(false)}>Unmount consumer</button>
        </>
      );
    };
    mount(<Example />);
    name('Start Details');
    button().realClick().should('be.focused');
    name('Loading Please wait');
    button().should('have.attr', 'aria-busy', 'true').and('have.attr', 'aria-disabled', 'true');
    button().realPress('Enter').realPress('Space');
    button().realClick();
    cy.get('@starts').should('have.been.calledOnce');
    cy.contains('button', 'Complete consumer work').click();
    name('Loaded Finished');
    button().should('have.attr', 'aria-busy', 'false');
    button().should(element =>
      expect(element[0].lastElementChild?.classList.contains('fui-CompoundButton__icon')).to.equal(true),
    );
    cy.contains('button', 'Reset consumer work').click();
    name('Start Details');
    button().find('[data-testid="glyph"]').should('not.exist');
    button().realClick().should('be.focused');
    cy.get('@starts').should('have.been.calledTwice');
    cy.contains('button', 'Unmount consumer').click();
    button().should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
  });

  it('gives consumer classes and inline styles precedence on every slot and restores defaults after removal', () => {
    const Example = () => {
      const [override, setOverride] = React.useState(true);
      const classes = useTestStyles();
      return (
        <>
          <CompoundButton
            data-testid="compound"
            className={override ? classes.root : undefined}
            style={override ? { borderRadius: tokens.borderRadiusNone } : undefined}
            icon={{ children: glyph, className: override ? classes.icon : undefined }}
            contentContainer={{ className: override ? classes.content : undefined }}
            secondaryContent={{ children: 'Details', className: override ? classes.secondary : undefined }}
          >
            Action
          </CompoundButton>
          <span
            data-testid="override-color"
            style={{ color: override ? tokens.colorPaletteRedForeground1 : tokens.colorNeutralForeground1 }}
          >
            Reference
          </span>
          <span
            data-testid="override-background"
            style={{ backgroundColor: override ? tokens.colorBrandBackground : tokens.colorNeutralBackground1 }}
          >
            Reference
          </span>
          <button onClick={() => setOverride(false)}>Remove styles</button>
        </>
      );
    };
    mount(<Example />);
    button().should('have.css', 'border-top-left-radius', '0px');
    content().should('have.css', 'text-align', 'center');
    secondary().should('have.css', 'font-weight', String(teamsLightTheme.fontWeightBold));
    cy.get('[data-testid="override-color"]')
      .realHover()
      .invoke('css', 'color')
      .then(color => button().find('.fui-CompoundButton__icon').should('have.css', 'color', color));
    cy.get('[data-testid="override-background"]')
      .invoke('css', 'background-color')
      .then(color => button().should('have.css', 'background-color', color));
    cy.contains('button', 'Remove styles').click();
    button().should('have.css', 'border-top-left-radius', teamsLightTheme.borderRadiusMedium);
    content().should('have.css', 'text-align', 'left');
    secondary().should('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular));
    cy.get('[data-testid="override-color"]')
      .realHover()
      .invoke('css', 'color')
      .then(color => button().find('.fui-CompoundButton__icon').should('have.css', 'color', color));
    cy.get('[data-testid="override-background"]')
      .invoke('css', 'background-color')
      .then(color => button().should('have.css', 'background-color', color));
  });
});

describe('CompoundButton additional source-owned boundaries', () => {
  it('keeps renderer-owned primary and secondary layout instead of treating plain contentContainer children as primary text', () => {
    mount(
      <CompoundButton
        data-testid="compound"
        contentContainer={{ children: 'Not a replacement text slot' }}
        secondaryContent="Details"
      >
        Action
      </CompoundButton>,
    );
    name('Action Details');
    content().should('have.text', 'ActionDetails');
    button().should('not.contain.text', 'Not a replacement text slot');
  });
  roots.forEach(([rootName, props]) => {
    it(`characterizes disabledFocusable ${rootName} keyboard handlers and ancestor interception with enabled controls`, () => {
      const childDown = cy.spy().as('childDown');
      const parentDown = cy.spy().as('parentDown');
      const click = cy.spy().as('click');
      const parentClick = cy.spy().as('parentClick');
      const Example = () => {
        const [disabled, setDisabled] = React.useState(false);
        return (
          <>
            <div onClick={parentClick} onKeyDown={parentDown}>
              <CompoundButton
                data-testid="compound"
                {...props}
                secondaryContent="Details"
                disabledFocusable={disabled}
                onKeyDown={childDown}
                onClick={(event: RootMouseEvent) => {
                  event.preventDefault();
                  click();
                }}
              >
                Action
              </CompoundButton>
            </div>
            <button onClick={() => setDisabled(value => !value)}>Toggle interception</button>
          </>
        );
      };
      mount(<Example />);
      button().realClick().realPress('Enter').realPress('Space');
      cy.get('@click').should('have.been.calledThrice');
      cy.get('@parentClick').should('have.been.calledThrice');
      cy.get('@childDown').should('have.been.calledTwice');
      cy.get('@parentDown').should('have.been.calledTwice');
      cy.contains('button', 'Toggle interception').click();
      button().realClick().focus().realPress('Enter').realPress('Space');
      cy.get('@click').should('have.been.calledThrice');
      cy.get('@parentClick').should('have.been.calledThrice');
      cy.get('@childDown').should('have.callCount', rootName === 'native button' ? 2 : 4);
      cy.get('@parentDown').should('have.callCount', rootName === 'native button' ? 4 : 2);
      cy.contains('button', 'Toggle interception').click();
      button().focus().realPress('Enter');
      cy.get('@click').should('have.callCount', 4);
      cy.get('@childDown').should('have.callCount', rootName === 'native button' ? 3 : 5);
    });

    it(`applies explicit negative tabIndex and restores omitted navigation for ${rootName}`, () => {
      const Example = () => {
        const [excluded, setExcluded] = React.useState(true);
        return (
          <>
            <button>Before</button>
            <CompoundButton data-testid="compound" {...props} {...(excluded ? { tabIndex: -1 } : {})}>
              Action
            </CompoundButton>
            <button>After</button>
            <button onClick={() => setExcluded(false)}>Restore tab</button>
          </>
        );
      };
      mount(<Example />);
      cy.contains('button', 'Before').focus().realPress('Tab');
      cy.contains('button', 'After').should('be.focused');
      button().focus().should('be.focused');
      cy.contains('button', 'Restore tab').click();
      cy.contains('button', 'Before').focus().realPress('Tab');
      button().should('be.focused');
    });
  });

  appearances.forEach(appearance => {
    it(`keeps ${appearance} disabled secondary text theme-colored at rest, hover and active with no enabled callback`, () => {
      const click = cy.spy().as('click');
      mount(
        <>
          <CompoundButton
            data-testid="compound"
            appearance={appearance}
            disabledFocusable
            secondaryContent="Details"
            onClick={click}
          >
            Action
          </CompoundButton>
          <span data-testid="disabled-color" style={{ color: tokens.colorNeutralForegroundDisabled }}>
            Reference
          </span>
        </>,
      );
      cy.get('[data-testid="disabled-color"]')
        .realHover()
        .invoke('css', 'color')
        .then(color => {
          secondary().should('have.css', 'color', color);
          button().realHover();
          secondary().should('have.css', 'color', color);
          button().realMouseDown();
          secondary().should('have.css', 'color', color);
          button().realMouseUp();
        });
      cy.get('@click').should('not.have.been.called');
    });
  });

  it('updates secondary-only, both-text, icon-only and text-only composition with optional-slot refs cleared', () => {
    const secondaryRef = cy.spy().as('secondaryRef');
    const iconRef = cy.spy().as('iconRef');
    const contentRef = cy.spy().as('contentRef');
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <CompoundButton
            data-testid="compound"
            aria-label={phase === 2 ? 'Icon action' : undefined}
            icon={phase < 3 ? { children: glyph, ref: iconRef } : null}
            secondaryContent={phase < 2 ? { children: 'Details', ref: secondaryRef } : null}
            contentContainer={{ ref: contentRef }}
          >
            {phase === 1 || phase === 3 ? 'Action' : undefined}
          </CompoundButton>
          <button onClick={() => setPhase(value => value + 1)}>Next composition</button>
        </>
      );
    };
    mount(<Example />);
    name('Details');
    content().should('exist');
    cy.contains('button', 'Next composition').click();
    name('Action Details');
    cy.contains('button', 'Next composition').click();
    name('Icon action');
    content().should('not.exist');
    cy.get('@secondaryRef').its('lastCall.args.0').should('be.null');
    cy.get('@contentRef').its('lastCall.args.0').should('be.null');
    cy.contains('button', 'Next composition').click();
    name('Action');
    cy.get('@iconRef').its('lastCall.args.0').should('be.null');
    content().then(element => cy.get('@contentRef').its('lastCall.args.0').should('equal', element[0]));
  });

  it('renders no-text/no-icon default and zero text without fabricating text, secondary or live-region slots', () => {
    const Example = () => {
      const [zero, setZero] = React.useState(false);
      return (
        <>
          <CompoundButton data-testid="compound" aria-label={zero ? undefined : 'Empty action'}>
            {zero ? 0 : undefined}
          </CompoundButton>
          <button onClick={() => setZero(true)}>Show zero</button>
        </>
      );
    };
    mount(<Example />);
    content().should('have.text', '');
    secondary().should('not.exist');
    button().find('.fui-CompoundButton__icon').should('not.exist');
    name('Empty action');
    cy.contains('button', 'Show zero').click();
    name('0');
    content().should('have.text', '0');
  });
});

if (Cypress.env('compoundSensitive') === true) {
  describe('CompoundButton sensitive correctness failures requiring production permission', () => {
    it('must preserve primary numeric zero beside a populated icon', () => {
      mount(
        <CompoundButton data-testid="compound" icon={glyph}>
          {0}
        </CompoundButton>,
      );
      button().should('have.text', '0');
      name('0');
    });
    it('must preserve secondary numeric zero beside a populated icon', () => {
      mount(<CompoundButton data-testid="compound" icon={glyph} secondaryContent={0} />);
      secondary().should('have.text', '0');
      name('0');
    });
    it('must classify numeric zero icon shorthand as populated icon-only content', () => {
      mount(<CompoundButton data-testid="compound" icon={0} />);
      content().should('not.exist');
      button().should('have.css', 'min-width', '52px');
    });
  });
}

describe('CompoundButton documented contracts', () => {
  it('defaults to native type button, a primary text node and separate secondary text slot', () => {
    const click = cy.spy().as('click');
    const submit = cy.spy().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <CompoundButton data-testid="compound" icon={glyph} secondaryContent="Details" onClick={click}>
          Action
        </CompoundButton>
        <button type="submit">Submit control</button>
      </form>,
    );
    button().should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button');
    button().should('have.class', 'fui-CompoundButton').and('have.class', 'fui-Button');
    button().find('.fui-CompoundButton__icon').should('have.class', 'fui-Button__icon');
    content().should(element => {
      expect(element[0].firstChild?.nodeType).to.equal(3);
      expect(element[0].firstChild?.textContent).to.equal('Action');
      expect(element[0].children.length).to.equal(1);
    });

    secondary().should('have.prop', 'tagName', 'SPAN').and('have.text', 'Details');
    name('Action Details');
    cy.contains('button', 'Submit control').click();
    activate();
    cy.get('@submit').should('have.been.calledOnce');
  });
});

describe('CompoundButton edges and accessibility', () => {
  let originalUrl = '';
  beforeEach(() => {
    cy.window().then(win => {
      originalUrl = win.location.href;
      win.history.replaceState(null, '', originalUrl.split('#')[0]);
    });
  });
  afterEach(() => {
    cy.window().then(win => win.history.replaceState(null, '', originalUrl));
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });

  (['pointer', 'Enter', 'Space'] as const).forEach(action => {
    it(`performs actual anchor navigation by ${action} and lets the latest click handler cancel it`, () => {
      const click = cy.spy().as('click');
      const Example = () => {
        const [cancel, setCancel] = React.useState(true);
        return (
          <>
            <CompoundButton
              data-testid="compound"
              as="a"
              href="#compound-destination"
              secondaryContent="Destination"
              onClick={(event: RootMouseEvent) => {
                if (cancel) {
                  event.preventDefault();
                }
                click(event.type, event.defaultPrevented);
              }}
            >
              Navigate
            </CompoundButton>
            <button onClick={() => setCancel(false)}>Allow navigation</button>
          </>
        );
      };
      mount(<Example />);
      if (action === 'pointer') {
        button().realClick();
      } else {
        button().focus().realPress(action);
      }
      cy.get('@click').should('have.been.calledWith', 'click', true);
      cy.location('hash').should('equal', '');
      cy.contains('button', 'Allow navigation').click();
      if (action === 'pointer') {
        button().realClick();
      } else {
        button().focus().realPress(action);
      }
      cy.get('@click').should('have.been.calledTwice').and('have.been.calledWith', 'click', false);
      cy.location('hash').should('equal', '#compound-destination');
    });
  });

  (['submit', 'reset'] as const).forEach(type =>
    (['disabled', 'disabledFocusable', 'both', 'aria-disabled'] as const).forEach(mode =>
      (['pointer', 'Enter', 'Space'] as const).forEach(action => {
        it(`characterizes actual native ${type} effects with ${mode} under ${action}, not just callback suppression`, () => {
          const formAction = cy.spy().as('formAction');
          const clicked = cy.spy().as('clicked');
          const Example = () => {
            const [disabled, setDisabled] = React.useState(false);
            const [value, setValue] = React.useState('');
            return (
              <>
                <form
                  id="compound-form"
                  onSubmit={event => {
                    event.preventDefault();
                    if (type === 'submit') {
                      formAction();
                      if (!(event.nativeEvent instanceof SubmitEvent)) {
                        throw new Error('Expected native SubmitEvent');
                      }
                      const data = new FormData(event.currentTarget, event.nativeEvent.submitter);
                      setValue(String(data.get('operation')));
                    }
                  }}
                  onReset={() => type === 'reset' && formAction()}
                >
                  <label>
                    Record
                    <input name="record" defaultValue="Initial" />
                  </label>
                </form>
                <CompoundButton
                  data-testid="compound"
                  type={type}
                  form="compound-form"
                  name="operation"
                  value="save"
                  disabled={(mode === 'disabled' || mode === 'both') && disabled}
                  disabledFocusable={(mode === 'disabledFocusable' || mode === 'both') && disabled}
                  aria-disabled={mode === 'aria-disabled' ? disabled : undefined}
                  secondaryContent="Details"
                  onClick={clicked}
                >
                  Action
                </CompoundButton>
                <output>{value}</output>
                <button>Keyboard boundary</button>
                <button onClick={() => setDisabled(current => !current)}>Toggle form action</button>
              </>
            );
          };
          mount(<Example />);
          cy.get('input').clear().type('Changed');
          button().realClick();
          cy.get('@formAction').should('have.been.calledOnce');
          cy.get('@clicked').should('have.been.calledOnce');
          if (type === 'submit') {
            cy.get('output').should('have.text', 'save');
          } else {
            cy.get('input').should('have.value', 'Initial');
          }
          cy.get('input').clear().type('Changed again');
          cy.contains('button', 'Toggle form action').click();
          if (mode === 'disabled') {
            button().should('be.disabled');
          } else {
            button().should('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
          }
          if (action === 'pointer') {
            button().realClick();
          } else if (mode === 'disabled') {
            cy.contains('button', 'Keyboard boundary').focus();
            button().then(element => element[0].focus());
            button().should('not.be.focused');
            cy.realPress(action);
          } else {
            button().focus().realPress(action);
          }
          cy.get('@formAction').should('have.been.calledOnce');
          cy.get('@clicked').should('have.been.calledOnce');
          cy.get('input').should('have.value', 'Changed again');
          cy.contains('button', 'Toggle form action').click();
          if (action === 'pointer') {
            button().realClick();
          } else {
            button().focus().realPress(action);
          }
          cy.get('@formAction').should('have.been.calledTwice');
          cy.get('@clicked').should('have.been.calledTwice');
          if (type === 'reset') {
            cy.get('input').should('have.value', 'Initial');
          }
        });
      }),
    ),
  );

  roots.forEach(([rootName, props]) => {
    it(`honors current key prevention and forwards unrelated keys without clicks on ${rootName}`, () => {
      const click = cy.spy().as('click');
      const down = cy.spy().as('down');
      const up = cy.spy().as('up');
      const Example = () => {
        const [block, setBlock] = React.useState<'down' | 'up' | 'none'>('down');
        return (
          <>
            <CompoundButton
              data-testid="compound"
              {...props}
              secondaryContent="Details"
              onClick={(event: RootMouseEvent) => {
                event.preventDefault();
                click();
              }}
              onKeyDown={(event: RootKeyEvent) => {
                down(event.key);
                if (block === 'down') {
                  event.preventDefault();
                }
              }}
              onKeyUp={(event: RootKeyEvent) => {
                up(event.key);
                if (block === 'up') {
                  event.preventDefault();
                }
              }}
            >
              Action
            </CompoundButton>
            <button onClick={() => setBlock('up')}>Block up</button>
            <button onClick={() => setBlock('none')}>Allow keys</button>
          </>
        );
      };
      mount(<Example />);
      button().focus().realPress('Enter');
      cy.get('@click').should('not.have.been.called');
      cy.contains('button', 'Block up').click();
      button().focus().realPress('Space');
      cy.get('@click').should('not.have.been.called');
      cy.contains('button', 'Allow keys').click();
      button().focus().realPress('Enter').realPress('Space').realPress('A').realPress('Escape');
      cy.get('@click').should('have.been.calledTwice');
      cy.get('@down').should('have.been.calledWith', 'A').and('have.been.calledWith', 'Escape');
      cy.get('@up').should('have.been.calledWith', 'A').and('have.been.calledWith', 'Escape');
    });

    ([true, 'true', false, 'false'] as const).forEach(ariaDisabled => {
      it(`normalizes aria-disabled ${String(ariaDisabled)} ${typeof ariaDisabled} on ${rootName}`, () => {
        const click = cy.spy().as('click');
        mount(
          <CompoundButton
            data-testid="compound"
            {...props}
            aria-disabled={ariaDisabled}
            tabIndex={0}
            onClick={(event: RootMouseEvent) => {
              event.preventDefault();
              click();
            }}
            secondaryContent="Details"
          >
            Action
          </CompoundButton>,
        );
        button().should('have.attr', 'aria-disabled', String(ariaDisabled));
        button().realClick().focus().realPress('Enter').realPress('Space');
        cy.get('@click').should('have.callCount', ariaDisabled === true || ariaDisabled === 'true' ? 0 : 3);
        cy.location('hash').should('equal', '');
      });
    });
  });

  it('computes content names, explicit labels and description relationships dynamically without automatic announcements', () => {
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <span id="compound-label">External action</span>
          <span id="compound-description">External details</span>
          <CompoundButton
            data-testid="compound"
            icon={glyph}
            aria-label={phase === 1 ? 'Explicit action' : undefined}
            aria-labelledby={phase === 2 ? 'compound-label' : undefined}
            aria-describedby={phase === 2 ? 'compound-description' : undefined}
            secondaryContent={phase === 3 ? null : 'Details'}
          >
            {phase === 3 ? 'Updated' : 'Action'}
          </CompoundButton>
          <button onClick={() => setPhase(value => value + 1)}>Next naming</button>
        </>
      );
    };
    mount(<Example />);
    name('Action Details');
    button().should('not.have.attr', 'aria-live');
    button().should('not.have.attr', 'aria-pressed');
    cy.contains('button', 'Next naming').click();
    name('Explicit action');
    cy.contains('button', 'Next naming').click();
    name('External action', 'button', 'External details');
    cy.contains('button', 'Next naming').click();
    name('Updated');
    secondary().should('not.exist');
    button().should('not.have.attr', 'aria-label');
    button().should('not.have.attr', 'aria-labelledby');
  });

  (['icon', 'secondaryContent', 'contentContainer'] as const).forEach(slotName => {
    it(`forwards ${slotName} slot native props, latest handlers and ref cleanup with bubbling and preventDefault`, () => {
      const slotRef = cy.spy().as('slotRef');
      const root = cy.spy().as('root');
      const slot = cy.spy().as('slot');
      const Example = () => {
        const [phase, setPhase] = React.useState(0);
        const slotProps = {
          id: 'compound-slot',
          title: 'Native slot title',
          className: 'consumer-slot',
          ref: slotRef,
          children: slotName === 'icon' ? glyph : slotName === 'secondaryContent' ? 'Details' : undefined,
          onClick:
            phase < 2
              ? (event: React.MouseEvent<HTMLSpanElement>) => {
                  if (phase === 1) {
                    event.preventDefault();
                  }
                  slot(phase, event.currentTarget);
                }
              : undefined,
        };
        const props: CompoundButtonProps = { [slotName]: phase === 3 ? null : slotProps };
        return (
          <>
            {phase < 4 && (
              <CompoundButton
                data-testid="compound"
                icon={glyph}
                secondaryContent="Details"
                {...props}
                onClick={event => root(phase, event.defaultPrevented)}
              >
                Action
              </CompoundButton>
            )}
            <button onClick={() => setPhase(value => value + 1)}>Next slot</button>
          </>
        );
      };
      mount(<Example />);
      cy.get('#compound-slot')
        .should('have.attr', 'title', 'Native slot title')
        .and('have.class', 'consumer-slot')
        .then(element => cy.get('@slotRef').its('lastCall.args.0').should('equal', element[0]));
      cy.get('#compound-slot').realClick();
      cy.get('@slot').should('have.been.calledOnce').and('have.been.calledWithMatch', 0);
      cy.get('@root').should('have.been.calledWith', 0, false);
      cy.contains('button', 'Next slot').click();
      cy.get('#compound-slot').realClick();
      cy.get('@slot').should('have.been.calledTwice').and('have.been.calledWithMatch', 1);
      cy.get('@root').should('have.been.calledWith', 1, true);
      cy.contains('button', 'Next slot').click();
      cy.get('#compound-slot').realClick();
      cy.get('@slot').should('have.been.calledTwice');
      cy.get('@root').should('have.been.calledWith', 2, false);
      cy.contains('button', 'Next slot').click();
      cy.get('#compound-slot').should('not.exist');
      cy.get('@slotRef').its('lastCall.args.0').should('be.null');
      if (slotName === 'contentContainer') {
        content().should('exist');
        name('Action Details');
      }
      cy.contains('button', 'Next slot').click();
      button().should('not.exist');
      cy.get('@slotRef').its('lastCall.args.0').should('be.null');
    });
  });

  it('forwards root native attributes and live ref across button/anchor replacement and unmount', () => {
    const ref = cy.spy().as('ref');
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      const props: CompoundButtonProps = phase === 1 ? { as: 'a', href: '#compound-destination', target: '_self' } : {};
      return (
        <>
          {phase < 2 && (
            <CompoundButton
              data-testid="compound"
              {...props}
              ref={ref}
              id="native-compound"
              title="Native title"
              aria-keyshortcuts="Alt+S"
              secondaryContent={{ id: 'native-secondary', lang: 'en', children: 'Details' }}
            >
              Action
            </CompoundButton>
          )}
          <button onClick={() => setPhase(value => value + 1)}>Next root</button>
        </>
      );
    };
    mount(<Example />);
    button()
      .should('have.attr', 'id', 'native-compound')
      .and('have.attr', 'title', 'Native title')
      .and('have.attr', 'aria-keyshortcuts', 'Alt+S')
      .then(element => cy.get('@ref').its('lastCall.args.0').should('equal', element[0]));
    secondary().should('have.attr', 'lang', 'en');
    cy.contains('button', 'Next root').click();
    button().should('have.prop', 'tagName', 'A');
    button().should('have.attr', 'target', '_self');
    button().should('not.have.attr', 'type');
    button().then(element => cy.get('@ref').its('lastCall.args.0').should('equal', element[0]));
    cy.get('@ref').should('have.been.calledWith', null);
    cy.contains('button', 'Next root').click();
    button().should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
  });

  (
    [
      ['light', teamsLightTheme],
      ['dark', teamsDarkTheme],
    ] as const
  ).forEach(([themeName, theme]) =>
    appearances.forEach(appearance => {
      it(`uses ${themeName} theme tokens for ${appearance} root and compound secondary text at rest, hover and press`, () => {
        const onBrand = appearance === 'primary';
        const textTokens = [
          onBrand ? tokens.colorNeutralForegroundOnBrand : tokens.colorNeutralForeground2,
          onBrand
            ? tokens.colorNeutralForegroundOnBrand
            : appearance === 'transparent'
            ? tokens.colorNeutralForeground2BrandHover
            : tokens.colorNeutralForeground2Hover,
          onBrand
            ? tokens.colorNeutralForegroundOnBrand
            : appearance === 'transparent'
            ? tokens.colorNeutralForeground2BrandPressed
            : tokens.colorNeutralForeground2Pressed,
        ];
        mountBase(
          <FluentProvider theme={theme}>
            <CompoundButton data-testid="compound" appearance={appearance} secondaryContent="Details">
              Action
            </CompoundButton>
            {textTokens.map((color, index) => (
              <span key={index} data-testid={`color-${index}`} style={{ color }}>
                Reference
              </span>
            ))}
            <span
              data-testid="background"
              style={{
                backgroundColor:
                  appearance === 'primary'
                    ? tokens.colorBrandBackground
                    : appearance === 'secondary'
                    ? tokens.colorNeutralBackground1
                    : appearance === 'subtle'
                    ? tokens.colorSubtleBackground
                    : tokens.colorTransparentBackground,
              }}
            >
              Reference
            </span>
          </FluentProvider>,
        );
        cy.get('[data-testid="background"]')
          .realHover()
          .invoke('css', 'background-color')
          .then(value => button().should('have.css', 'background-color', value));
        cy.get('[data-testid="color-0"]')
          .invoke('css', 'color')
          .then(value => secondary().should('have.css', 'color', value));
        button().realHover();
        cy.get('[data-testid="color-1"]')
          .invoke('css', 'color')
          .then(value => secondary().should('have.css', 'color', value));
        button().realMouseDown();
        cy.get('[data-testid="color-2"]')
          .invoke('css', 'color')
          .then(value => secondary().should('have.css', 'color', value));
        button().realMouseUp();
      });
    }),
  );

  (['primary', 'subtle', 'disabled'] as const).forEach(mode => {
    it(`applies real forced-colors ${mode} secondary text rules and restores media after the case`, () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      mount(
        <>
          <CompoundButton
            data-testid="compound"
            appearance={mode === 'subtle' ? 'subtle' : 'primary'}
            disabled={mode === 'disabled'}
            secondaryContent="Details"
          >
            Action
          </CompoundButton>
          <span
            data-testid="system-color"
            style={{ color: mode === 'disabled' ? 'GrayText' : mode === 'primary' ? 'HighlightText' : 'Canvas' }}
          >
            Reference
          </span>
        </>,
      );
      cy.window().then(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
      if (mode === 'subtle') {
        button().realHover();
      } else {
        cy.get('[data-testid="system-color"]').realHover();
      }
      cy.get('[data-testid="system-color"]')
        .invoke('css', 'color')
        .then(value => secondary().should('have.css', 'color', value));
      name('Action Details');
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [] },
        }),
      );
    });
  });
});

describe('CompoundButton documented contracts', () => {
  appearances.forEach(appearance =>
    sizes.forEach(size =>
      shapes.forEach(shape => {
        it(`renders ${appearance} ${size} ${shape} primary and secondary typography with native action`, () => {
          const click = cy.spy().as('click');
          const radius = {
            rounded: teamsLightTheme.borderRadiusMedium,
            circular: teamsLightTheme.borderRadiusCircular,
            square: teamsLightTheme.borderRadiusNone,
          };
          mount(
            <CompoundButton
              data-testid="compound"
              appearance={appearance}
              size={size}
              shape={shape}
              icon={glyph}
              secondaryContent="Details"
              onClick={click}
            >
              Action
            </CompoundButton>,
          );
          name('Action Details');
          button()
            .should('have.css', 'font-size', teamsLightTheme[size === 'large' ? 'fontSizeBase400' : 'fontSizeBase300'])
            .and('have.css', 'border-top-left-radius', `${parseFloat(radius[shape])}px`);
          secondary()
            .should('have.css', 'font-size', teamsLightTheme[size === 'large' ? 'fontSizeBase300' : 'fontSizeBase200'])
            .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular));
          content().should('have.css', 'display', 'flex').and('have.css', 'flex-direction', 'column');
          button().should(element => {
            const bounds = element[0].getBoundingClientRect();
            expect(bounds.width).to.be.at.least(24);
            expect(bounds.height).to.be.at.least(24);
          });
          button().realClick();
          cy.get('@click').should('have.been.calledOnce');
        });
      }),
    ),
  );

  sizes.forEach(size =>
    (['primary only', 'secondary only', 'both', 'icon only'] as const).forEach(contents => {
      it(`supports ${size} ${contents} contents and compound-owned icon geometry`, () => {
        const click = cy.spy().as('click');
        mount(
          <CompoundButton
            data-testid="compound"
            size={size}
            icon={glyph}
            aria-label={contents === 'icon only' ? 'Icon action' : undefined}
            secondaryContent={contents === 'both' || contents === 'secondary only' ? 'Details' : undefined}
            onClick={click}
          >
            {contents === 'both' || contents === 'primary only' ? 'Action' : undefined}
          </CompoundButton>,
        );
        name(
          contents === 'both'
            ? 'Action Details'
            : contents === 'primary only'
            ? 'Action'
            : contents === 'secondary only'
            ? 'Details'
            : 'Icon action',
        );
        button()
          .find('.fui-CompoundButton__icon')
          .should('have.css', 'width', '40px')
          .and('have.css', 'height', '40px');
        if (contents === 'icon only') {
          content().should('not.exist');
          button().should('have.css', 'min-width', `${{ small: 48, medium: 52, large: 56 }[size]}px`);
          button().should(element => {
            const bounds = element[0].getBoundingClientRect();
            expect(bounds.width).to.equal({ small: 48, medium: 52, large: 56 }[size]);
            expect(bounds.height).to.equal({ small: 50, medium: 54, large: 58 }[size]);
          });
        } else {
          content().should('exist');
        }
        activate();
      });
    }),
  );

  (['ltr', 'rtl'] as const).forEach(dir =>
    (['before', 'after'] as const).forEach(iconPosition => {
      it(`lays out ${iconPosition} icon and vertically stacked text in ${dir}`, () => {
        mount(
          <CompoundButton data-testid="compound" icon={glyph} iconPosition={iconPosition} secondaryContent="Details">
            <span data-testid="primary">Action</span>
          </CompoundButton>,
          dir,
        );
        button().should(element => {
          const root = element[0];
          const icon = root.querySelector('[data-testid="glyph"]')?.parentElement;
          const text = root.querySelector('[data-testid="primary"]');
          const details = root.querySelector(`.${compoundButtonClassNames.secondaryContent}`);
          const container = root.querySelector(`.${compoundButtonClassNames.contentContainer}`);
          expect(icon && text && details && container).not.to.equal(null);
          if (!icon || !text || !details || !container) {
            throw new Error('Missing compound layout slots');
          }
          expect(root.children[iconPosition === 'before' ? 0 : 1]).to.equal(icon);
          const iconRect = icon.getBoundingClientRect();
          const textRect = text.getBoundingClientRect();
          const before = (iconPosition === 'before') === (dir === 'ltr');
          expect(before ? iconRect.right <= textRect.left : textRect.right <= iconRect.left).to.equal(true);
          const contentRect = container.getBoundingClientRect();
          const gap = before ? contentRect.left - iconRect.right : iconRect.left - contentRect.right;
          expect(gap, 'compound icon-to-content token gap').to.be.closeTo(
            parseFloat(teamsLightTheme.spacingHorizontalM),
            0.5,
          );
          expect(details.getBoundingClientRect().top).to.be.at.least(textRect.bottom);
        });
        content().should('have.css', 'text-align', dir === 'ltr' ? 'left' : 'right');
        name('Action Details');
      });
    }),
  );

  it('wraps long primary and secondary text at caller-supported width without clipping its contents', () => {
    const label = 'Long text wraps after it hits the max width of the component';
    const details = 'Additional concise information about the selected action';
    const Example = () => {
      const classes = useTestStyles();
      return (
        <>
          <CompoundButton data-testid="short" secondaryContent="Details">
            Short
          </CompoundButton>
          <CompoundButton data-testid="compound" className={classes.root} secondaryContent={details}>
            {label}
          </CompoundButton>
        </>
      );
    };
    mount(<Example />);
    name(`${label} ${details}`);
    cy.get('[data-testid="short"]').then(short =>
      button().should(element => {
        const root = element[0];
        expect(root.getBoundingClientRect().height).to.be.greaterThan(short[0].getBoundingClientRect().height);
        expect(root.scrollWidth).to.be.at.most(root.clientWidth + 1);
        expect(root.scrollHeight).to.be.at.most(root.clientHeight + 1);
      }),
    );
  });

  it('supports a caller-owned Tooltip label for an icon-only action', () => {
    const click = cy.spy().as('click');
    mount(
      <Tooltip content="Calendar action" relationship="label">
        <CompoundButton data-testid="compound" icon={glyph} onClick={click} />
      </Tooltip>,
    );
    name('Calendar action');
    activate();
  });

  roots.forEach(([rootName, props, role]) => {
    it(`supports ${rootName} native semantics, Enter, Space and forward/backward Tab`, () => {
      const click = cy.spy().as('click');
      mount(
        <>
          <button>Before</button>
          <CompoundButton
            data-testid="compound"
            {...props}
            secondaryContent="Details"
            onClick={(event: RootMouseEvent) => {
              event.preventDefault();
              click();
            }}
          >
            Action
          </CompoundButton>
          <button>After</button>
        </>,
      );
      name('Action Details', role);
      cy.contains('button', 'Before').focus().realPress('Tab');
      button().should('be.focused');
      activate();
      button().realPress('Tab');
      cy.contains('button', 'After').should('be.focused').realPress(['Shift', 'Tab']);
      button().should('be.focused');
    });

    (['disabled', 'disabledFocusable', 'both'] as const).forEach(mode => {
      it(`applies ${mode} ${rootName} focus, callback and native-attribute policy then restores enabled action`, () => {
        const click = cy.spy().as('click');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(false);
          return (
            <>
              <button>Before</button>
              <CompoundButton
                data-testid="compound"
                {...props}
                disabled={mode !== 'disabledFocusable' && disabled}
                disabledFocusable={mode !== 'disabled' && disabled}
                secondaryContent="Details"
                onClick={(event: RootMouseEvent) => {
                  event.preventDefault();
                  click();
                }}
              >
                Action
              </CompoundButton>
              <button>After</button>
              <button onClick={() => setDisabled(value => !value)}>Toggle disabled</button>
            </>
          );
        };
        mount(<Example />);
        // Disable before the first anchor pointer action: Cypress patches clicked anchors.
        cy.contains('button', 'Toggle disabled').click();
        name('Action Details', role);
        if (rootName === 'native button' && mode === 'disabled') {
          button().should('be.disabled');
        } else {
          button().should('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
        }
        if (rootName !== 'native button') {
          button().should('not.have.attr', 'href');
        }
        cy.contains('button', 'Before').focus().realPress('Tab');
        if (mode === 'disabled') {
          cy.contains('button', 'After').should('be.focused');
        } else {
          button().should('be.focused').realPress('Enter').realPress('Space');
        }
        button().realClick();
        cy.get('@click').should('not.have.been.called');
        cy.contains('button', 'Toggle disabled').click();
        activate();
      });
    });
  });
});
