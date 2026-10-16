import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import { Tooltip } from '@fluentui/react-tooltip';
import { Spinner } from '@fluentui/react-spinner';
import { useTimeout } from '@fluentui/react-utilities';
import { getByRole } from '@testing-library/dom';
import { useARIAButtonProps } from '@fluentui/react-aria';
import { makeStyles, mergeClasses } from '@griffel/react';
import { Button } from './Button';
import { useButtonBase_unstable } from './useButton';
import { renderButton_unstable } from './renderButton';
import { ButtonContextProvider } from '../../contexts/ButtonContext';
import type { ButtonProps } from './Button.types';

type ButtonMouseEvent = React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>;
type ButtonKeyboardEvent = React.KeyboardEvent<HTMLButtonElement | HTMLAnchorElement>;
const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const button = () => cy.get('[data-testid="button"]');
const icon = <svg aria-hidden="true" data-testid="glyph" focusable="false" />;
const assertName = (name: string, role: 'button' | 'link' = 'button') =>
  cy.get('[data-cy-root]').should(root => {
    expect(getByRole(root[0], role, { name })).to.equal(root[0].querySelector('[data-testid="button"]'));
  });
const assertIconOrder = (position: 'before' | 'after') =>
  button().should(element => {
    const nodes = element[0].childNodes;
    const glyph = element[0].querySelector('[data-testid="glyph"]');
    expect(nodes.length).to.equal(2);
    expect(glyph).not.to.equal(null);
    expect(nodes[position === 'before' ? 0 : 1].contains(glyph)).to.equal(true);
    expect(nodes[position === 'before' ? 1 : 0].textContent).to.equal('Action');
  });

describe('Button unit-derived browser regressions', () => {
  const variants: Array<[string, ButtonProps]> = [
    ['native button', {}],
    ['anchor button', { as: 'a' }],
    ['anchor link', { as: 'a', href: '#button-unit-destination' }],
  ];

  variants.forEach(([name, props]) => {
    it(`activates ${name} on Enter down and Space release, not Space down`, () => {
      const events: string[] = [];
      const onClick = cy.spy().as('click');
      mount(
        <Button
          data-testid="button"
          {...props}
          onKeyDown={(event: ButtonKeyboardEvent) => events.push(`down:${event.key}`)}
          onKeyUp={(event: ButtonKeyboardEvent) => events.push(`up:${event.key}`)}
          onClick={(event: ButtonMouseEvent) => {
            event.preventDefault();
            events.push('click');
            onClick(event.type, event.currentTarget);
          }}
        >
          Action
        </Button>,
      );
      button().focus().realPress('Enter');
      cy.get('@click').should('have.been.calledOnce');
      cy.then(() => expect(events).to.deep.equal(['down:Enter', 'click', 'up:Enter']));
      button().realPress('Space');
      cy.get('@click').should('have.been.calledTwice');
      button().then(element => {
        cy.get('@click').its('firstCall.args').should('deep.equal', ['click', element[0]]);
        cy.get('@click').its('lastCall.args').should('deep.equal', ['click', element[0]]);
      });
      cy.then(() => expect(events).to.deep.equal(['down:Enter', 'click', 'up:Enter', 'down: ', 'up: ', 'click']));
    });

    it(`respects consumer keydown and keyup prevention for ${name} and restores activation`, () => {
      const clicked = cy.spy().as('click');
      const down = cy.spy().as('down');
      const up = cy.spy().as('up');
      const Example = () => {
        const [block, setBlock] = React.useState<'none' | 'down' | 'up'>('none');
        return (
          <>
            <Button
              data-testid="button"
              {...props}
              onKeyDown={(event: ButtonKeyboardEvent) => {
                down();
                if (block === 'down') {
                  event.preventDefault();
                }
              }}
              onKeyUp={(event: ButtonKeyboardEvent) => {
                up();
                if (block === 'up') {
                  event.preventDefault();
                }
              }}
              onClick={(event: ButtonMouseEvent) => {
                event.preventDefault();
                clicked();
              }}
            >
              Action
            </Button>
            <button onClick={() => setBlock('down')}>Block down</button>
            <button onClick={() => setBlock('up')}>Block up</button>
            <button onClick={() => setBlock('none')}>Allow keys</button>
          </>
        );
      };
      mount(<Example />);
      button().focus().realPress('Enter').realPress('Space');
      cy.get('@click').should('have.been.calledTwice');
      cy.contains('button', 'Block down').click();
      button().focus().realPress('Enter');
      cy.get('@down').should('have.been.calledThrice');
      cy.get('@click').should('have.been.calledTwice');
      cy.contains('button', 'Block up').click();
      button().focus().realPress('Space');
      cy.get('@up').should('have.callCount', 4);
      cy.get('@click').should('have.been.calledTwice');
      cy.contains('button', 'Allow keys').click();
      button().focus().realPress('Enter').realPress('Space');
      cy.get('@click').should('have.callCount', 4);
    });

    it(`forwards non-activation keys on ${name} without inventing clicks`, () => {
      const clicked = cy.spy().as('click');
      const down = cy.spy().as('down');
      const up = cy.spy().as('up');
      mount(
        <Button
          data-testid="button"
          {...props}
          onKeyDown={down}
          onKeyUp={up}
          onClick={(event: ButtonMouseEvent) => {
            event.preventDefault();
            clicked();
          }}
        >
          Action
        </Button>,
      );
      button().click();
      cy.get('@click').should('have.been.calledOnce');
      button().focus().realPress('A').realPress('ArrowRight').realPress('Escape');
      cy.get('@down').should('have.been.calledThrice');
      cy.get('@up').should('have.been.calledThrice');
      cy.get('@click').should('have.been.calledOnce');
    });

    ([false, 'false'] as const).forEach(ariaDisabled => {
      it(`keeps ${name} active with aria-disabled=${String(ariaDisabled)} (${typeof ariaDisabled})`, () => {
        const onClick = cy.spy().as('click');
        mount(
          <Button
            data-testid="button"
            {...props}
            aria-disabled={ariaDisabled}
            onClick={(event: ButtonMouseEvent) => {
              event.preventDefault();
              onClick();
            }}
          >
            Action
          </Button>,
        );
        button().should('have.attr', 'aria-disabled', 'false').and('not.be.disabled');
        activate();
      });
    });

    it(`honors explicit tabIndex overrides and restores default navigation for ${name}`, () => {
      const clicked = cy.spy().as('click');
      const Example = () => {
        const [phase, setPhase] = React.useState(0);
        const tabProps = phase < 3 ? { tabIndex: phase === 0 ? 0 : phase === 1 ? -1 : undefined } : {};
        return (
          <>
            <button>Before</button>
            <Button
              data-testid="button"
              {...props}
              {...tabProps}
              onClick={(event: ButtonMouseEvent) => {
                event.preventDefault();
                clicked();
              }}
            >
              Action
            </Button>
            <button>After</button>
            <button onClick={() => setPhase(value => value + 1)}>Next tab state</button>
          </>
        );
      };
      mount(<Example />);
      cy.contains('button', 'Before').focus().realPress('Tab');
      button().should('be.focused');
      cy.contains('button', 'Next tab state').click();
      button().should('have.attr', 'tabindex', '-1');
      cy.contains('button', 'Before').focus().realPress('Tab');
      cy.contains('button', 'After').should('be.focused');
      button().focus().should('be.focused');
      cy.contains('button', 'Next tab state').click();
      button().should('not.have.attr', 'tabindex');
      cy.contains('button', 'Before').focus().realPress('Tab');
      if (name === 'anchor button') {
        cy.contains('button', 'After').should('be.focused');
      } else {
        button().should('be.focused');
      }
      cy.contains('button', 'Next tab state').click();
      cy.contains('button', 'Before').focus().realPress('Tab');
      button().should('be.focused');
      activate();
    });

    it(`preserves native action props and icon contents through a root render function for ${name}`, () => {
      const onClick = cy.spy().as('click');
      mount(
        <Button
          data-testid="button"
          {...props}
          icon={icon}
          onClick={(event: ButtonMouseEvent) => {
            event.preventDefault();
            onClick();
          }}
        >
          {(Root: React.ElementType, rootProps: React.HTMLAttributes<HTMLButtonElement | HTMLAnchorElement>) => (
            <Root {...rootProps}>
              <span>Rendered action</span>
              {rootProps.children}
            </Root>
          )}
        </Button>,
      );
      assertName('Rendered action', name === 'anchor link' ? 'link' : 'button');
      button().find('[data-testid="glyph"]').should('have.length', 1);
      activate();
    });
  });

  variants.slice(1).forEach(([name, props]) => {
    (['disabled', 'disabledFocusable'] as const).forEach(disabledProp => {
      it(`applies ${disabledProp} anchor focus and activation policy for ${name}`, () => {
        const clicked = cy.spy().as('click');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(true);
          return (
            <>
              <button>Before</button>
              <Button
                data-testid="button"
                {...props}
                {...{ [disabledProp]: disabled }}
                onClick={(event: ButtonMouseEvent) => {
                  event.preventDefault();
                  clicked();
                }}
              >
                Action
              </Button>
              <button>After</button>
              <button onClick={() => setDisabled(false)}>Enable action</button>
            </>
          );
        };
        mount(<Example />);
        assertName('Action', name === 'anchor link' ? 'link' : 'button');
        button().should('have.attr', 'aria-disabled', 'true').and('not.be.disabled');
        button().should('not.have.attr', 'href');
        cy.contains('button', 'Before').focus().realPress('Tab');
        if (disabledProp === 'disabled') {
          cy.contains('button', 'After').should('be.focused');
        } else {
          button().should('be.focused').realPress('Enter').realPress('Space');
        }
        button().realClick();
        cy.contains('button', 'Enable action').click();
        cy.contains('button', 'Before').focus().realPress('Tab');
        button().should('be.focused');
        activate();
      });
    });
  });

  it('omits native keyboard handlers while disabledFocusable and restores current handlers on enable', () => {
    const clicked = cy.spy().as('click');
    const down = cy.spy().as('down');
    const up = cy.spy().as('up');
    const Example = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <>
          <Button data-testid="button" disabledFocusable={disabled} onKeyDown={down} onKeyUp={up} onClick={clicked}>
            Action
          </Button>
          <button onClick={() => setDisabled(value => !value)}>Toggle disabledFocusable</button>
        </>
      );
    };
    mount(<Example />);
    button().focus().realPress('Enter').realPress('Space');
    cy.get('@down').should('have.been.calledTwice');
    cy.get('@up').should('have.been.calledTwice');
    cy.get('@click').should('have.been.calledTwice');
    cy.contains('button', 'Toggle disabledFocusable').click();
    button().focus().realPress('Enter').realPress('Space');
    cy.get('@down').should('have.been.calledTwice');
    cy.get('@up').should('have.been.calledTwice');
    cy.get('@click').should('have.been.calledTwice');
    cy.contains('button', 'Toggle disabledFocusable').click();
    button().focus().realPress('Enter').realPress('Space');
    cy.get('@down').should('have.callCount', 4);
    cy.get('@up').should('have.callCount', 4);
    cy.get('@click').should('have.callCount', 4);
  });

  it('prioritizes explicit size over context and recomputes context and default size after omission', () => {
    const onClick = cy.spy().as('click');
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <ButtonContextProvider value={phase < 2 ? { size: 'large' } : phase === 2 ? { size: 'small' } : {}}>
            <Button data-testid="button" {...(phase === 0 ? { size: 'small' as const } : {})} onClick={onClick}>
              Action
            </Button>
          </ButtonContextProvider>
          <button onClick={() => setPhase(value => value + 1)}>Next size state</button>
        </>
      );
    };
    mount(<Example />);
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase200).click();
    cy.contains('button', 'Next size state').click();
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase400).click();
    cy.contains('button', 'Next size state').click();
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase200).click();
    cy.contains('button', 'Next size state').click();
    button().should('have.css', 'font-size', teamsLightTheme.fontSizeBase300).click();
    cy.get('@click').should('have.callCount', 4);
  });

  it('forwards icon slot props, bubbling events and refs and clears the optional slot', () => {
    const rootClick = cy.spy().as('click');
    const iconClick = cy.spy().as('iconClick');
    const ref = cy.spy().as('iconRef');
    const Example = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <Button
            data-testid="button"
            onClick={rootClick}
            icon={
              show
                ? {
                    children: icon,
                    id: 'icon-slot',
                    'aria-hidden': true,
                    title: 'Decorative glyph',
                    className: 'custom-icon',
                    style: { fontSize: tokens.fontSizeBase600 },
                    onClick: iconClick,
                    ref,
                  }
                : null
            }
          >
            Action
          </Button>
          <button onClick={() => setShow(false)}>Remove icon</button>
        </>
      );
    };
    mount(<Example />);
    assertName('Action');
    cy.get('#icon-slot')
      .should('have.class', 'custom-icon')
      .and('have.attr', 'title', 'Decorative glyph')
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase600)
      .then(element => {
        cy.get('@iconRef').its('lastCall.args.0').should('equal', element[0]);
      });
    cy.get('#icon-slot').click();
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@iconClick').should('have.been.calledOnce');
    cy.contains('button', 'Remove icon').click();
    cy.get('#icon-slot').should('not.exist');
    cy.get('@iconRef').its('lastCall.args.0').should('be.null');
    button().click();
    cy.get('@click').should('have.been.calledTwice');
    cy.get('@iconClick').should('have.been.calledOnce');
  });

  // This test-only override must not enter the library's extracted production styles.
  // eslint-disable-next-line @griffel/styles-file
  const useOverrides = makeStyles({
    root: { backgroundColor: tokens.colorBrandBackground, fontSize: tokens.fontSizeBase500 },
  });
  it('removes native and styling overrides and recomputes omitted appearance, shape and size defaults', () => {
    const clicked = cy.spy().as('click');
    const Example = () => {
      const [override, setOverride] = React.useState(true);
      const classes = useOverrides();
      const props: ButtonProps = override
        ? {
            appearance: 'outline',
            shape: 'square',
            size: 'small',
            title: 'Custom title',
            className: mergeClasses(classes.root, 'custom-button'),
            style: { fontSize: tokens.fontSizeBase600, borderRadius: tokens.borderRadiusCircular },
          }
        : {};
      return (
        <>
          <Button data-testid="button" {...props} onClick={clicked}>
            Action
          </Button>
          <span
            data-testid="background-reference"
            style={{ backgroundColor: override ? tokens.colorBrandBackground : tokens.colorNeutralBackground1 }}
          >
            Reference
          </span>
          <button onClick={() => setOverride(false)}>Remove overrides</button>
        </>
      );
    };
    mount(<Example />);
    button()
      .should('have.class', 'custom-button')
      .and('have.attr', 'title', 'Custom title')
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase600)
      .and('have.css', 'border-top-left-radius', teamsLightTheme.borderRadiusCircular);
    cy.get('[data-testid="background-reference"]')
      .realHover()
      .invoke('css', 'background-color')
      .then(color => button().should('have.css', 'background-color', color));
    button().click();
    cy.contains('button', 'Remove overrides').click();
    button().should('not.have.class', 'custom-button').and('not.have.attr', 'title');
    button()
      .should('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
      .and('have.css', 'border-top-left-radius', teamsLightTheme.borderRadiusMedium);
    cy.get('[data-testid="background-reference"]')
      .realHover()
      .invoke('css', 'background-color')
      .then(color => button().should('have.css', 'background-color', color));
    button().click();
    cy.get('@click').should('have.been.calledTwice');
  });

  const RecomposedButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>((props, ref) => {
    const state = useButtonBase_unstable(props, ref);
    state.root.className = mergeClasses('custom-button', state.root.className);
    return renderButton_unstable(state);
  });
  variants.forEach(([name, props]) => {
    it(`preserves ${name} keyboard and native type semantics when recomposing the base hook`, () => {
      const onClick = cy.spy().as('click');
      mount(
        <RecomposedButton
          data-testid="button"
          {...props}
          onClick={(event: ButtonMouseEvent) => {
            event.preventDefault();
            onClick();
          }}
        >
          Action
        </RecomposedButton>,
      );
      button().should('have.class', 'custom-button');
      if (name === 'native button') {
        button().should('have.attr', 'type', 'button');
      } else {
        button().should('not.have.attr', 'type');
      }
      assertName('Action', name === 'anchor link' ? 'link' : 'button');
      activate();
    });
  });

  (
    [
      ['empty contents', undefined],
      ['numeric contents', 0],
    ] as const
  ).forEach(([name, children]) => {
    it(`keeps ${name} actionable without fabricating an icon slot`, () => {
      const onClick = cy.spy().as('click');
      mount(
        <Button data-testid="button" aria-label="Action" onClick={onClick}>
          {children}
        </Button>,
      );
      button().should('have.text', children === undefined ? '' : '0');
      button().find('.fui-Button__icon').should('not.exist');
      assertName('Action');
      activate();
    });
  });
});
const activate = () => {
  button().click();
  cy.get('@click').should('have.been.calledOnce');
  button().focus().realPress('Enter');
  cy.get('@click').should('have.been.calledTwice');
  button().realPress('Space');
  cy.get('@click').should('have.been.calledThrice');
};

const LoadingExample = ({ onStart }: { onStart: () => void }) => {
  const [state, setState] = React.useState<'initial' | 'loading' | 'loaded'>('initial');
  const [startTimeout, cancelTimeout] = useTimeout();
  return (
    <>
      <Button
        data-testid="button"
        disabledFocusable={state !== 'initial'}
        icon={state === 'loading' ? <Spinner size="tiny" aria-hidden="true" /> : state === 'loaded' ? icon : null}
        onClick={() => {
          onStart();
          setState('loading');
          startTimeout(() => setState('loaded'), 5000);
        }}
      >
        {state === 'initial' ? 'Start loading' : state === 'loading' ? 'Loading' : 'Loaded'}
      </Button>
      <Button
        onClick={() => {
          cancelTimeout();
          setState('initial');
        }}
      >
        Reset loading state
      </Button>
    </>
  );
};

describe('Button independent-review regressions', () => {
  (['submit', 'reset'] as const).forEach(type => {
    (['pointer', 'Enter', 'Space'] as const).forEach(activation => {
      it(`prevents native ${type} defaults for disabledFocusable under ${activation} activation`, () => {
        const action = cy.spy().as('formAction');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(false);
          return (
            <form
              onSubmit={event => {
                event.preventDefault();
                if (type === 'submit') {
                  action();
                }
              }}
              onReset={() => {
                if (type === 'reset') {
                  action();
                }
              }}
            >
              <label>
                Record
                <input name="record" defaultValue="Initial" />
              </label>
              <Button data-testid="button" type={type} disabledFocusable={disabled}>
                Action
              </Button>
              <button type="button" onClick={() => setDisabled(true)}>
                Disable form action
              </button>
            </form>
          );
        };
        mount(<Example />);
        button().click();
        cy.get('@formAction').should('have.been.calledOnce');
        cy.get('input[name="record"]').clear().type('Changed');
        cy.contains('button', 'Disable form action').click();
        button().should('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
        if (activation === 'pointer') {
          button().realClick();
        } else {
          button().focus().realPress(activation);
        }
        cy.get('@formAction').should('have.been.calledOnce');
        cy.get('input[name="record"]').should('have.value', 'Changed');
      });
    });
  });

  it('preserves numeric zero contents beside an icon without changing the action name', () => {
    const onClick = cy.spy().as('click');
    mount(
      <Button data-testid="button" icon={icon} onClick={onClick}>
        {0}
      </Button>,
    );
    button().should('have.text', '0');
    button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
    assertName('0');
    activate();
  });

  it('renders string icon shorthand with its actual text contribution and action', () => {
    const onClick = cy.spy().as('click');
    mount(
      <Button data-testid="button" icon="String glyph" onClick={onClick}>
        Action
      </Button>,
    );
    button().find('.fui-Button__icon').should('have.text', 'String glyph').and('be.visible');
    assertName('String glyph Action');
    activate();
  });

  it('forwards icon render-function props and ref while keeping its action keyboard accessible', () => {
    const onClick = cy.spy().as('click');
    const onIconClick = cy.spy().as('iconClick');
    const ref = cy.spy().as('iconRef');
    mount(
      <Button
        data-testid="button"
        onClick={onClick}
        icon={{
          ref,
          onClick: onIconClick,
          'aria-hidden': true,
          children: (Slot: React.ElementType, slotProps: React.HTMLAttributes<HTMLSpanElement>) => (
            <Slot {...slotProps} id="rendered-icon">
              {icon}
            </Slot>
          ),
        }}
      >
        Action
      </Button>,
    );
    assertName('Action');
    cy.get('#rendered-icon')
      .should('be.visible')
      .then(element => {
        cy.get('@iconRef').its('lastCall.args.0').should('equal', element[0]);
      });
    activate();
    cy.get('#rendered-icon').click();
    cy.get('@click').should('have.callCount', 4);
    cy.get('@iconClick').should('have.been.calledOnce');
  });

  (
    [
      ['anchor button', { as: 'a' }],
      ['anchor link', { as: 'a', href: '#combined-disabled' }],
    ] as Array<[string, ButtonProps]>
  ).forEach(([name, props]) => {
    it(`retains focus and intercepts activation with both disabled flags for ${name}`, () => {
      const clicked = cy.spy().as('click');
      const down = cy.spy().as('down');
      const up = cy.spy().as('up');
      const Example = () => {
        const [disabled, setDisabled] = React.useState(true);
        return (
          <>
            <button>Before</button>
            <Button
              data-testid="button"
              {...props}
              disabled={disabled}
              disabledFocusable={disabled}
              onKeyDown={down}
              onKeyUp={up}
              onClick={(event: ButtonMouseEvent) => {
                event.preventDefault();
                clicked();
              }}
            >
              Action
            </Button>
            <button onClick={() => setDisabled(false)}>Enable combined action</button>
          </>
        );
      };
      mount(<Example />);
      assertName('Action', name === 'anchor link' ? 'link' : 'button');
      button().should('have.attr', 'aria-disabled', 'true');
      button().should('not.have.attr', 'href');
      cy.contains('button', 'Before').focus().realPress('Tab');
      button().should('be.focused').realPress('Enter').realPress('Space');
      cy.get('@down').should('have.been.calledTwice');
      cy.get('@up').should('have.been.calledThrice');
      cy.get('@up').should('have.been.calledWithMatch', { key: 'Tab' });
      cy.get('@up').should('have.been.calledWithMatch', { key: 'Enter' });
      cy.get('@up').should('have.been.calledWithMatch', { key: ' ' });
      button().realClick();
      cy.contains('button', 'Enable combined action').click();
      activate();
    });
  });
});

describe('Button documented contracts', () => {
  it('defaults to a native non-submit button and activates by pointer, Enter and Space', () => {
    const onClick = cy.spy().as('click');
    const onSubmit = cy.spy().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Button data-testid="button" onClick={onClick}>
          Action
        </Button>
        <Button type="submit">Submit positive control</Button>
      </form>,
    );
    button().should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button');
    assertName('Action');
    cy.contains('button', 'Submit positive control').click();
    cy.get('@submit').should('have.been.calledOnce');
    activate();
    cy.get('@submit').should('have.been.calledOnce');
  });

  describe('Button supported edges and accessibility', () => {
    const variants: Array<[string, ButtonProps]> = [
      ['native button', {}],
      ['anchor button', { as: 'a' }],
      ['anchor link', { as: 'a', href: '#button-destination' }],
    ];

    variants.forEach(([name, props]) => {
      ([true, 'true'] as const).forEach(ariaDisabled => {
        it(`blocks pointer and keyboard activation for ${name} with aria-disabled=${String(
          ariaDisabled,
        )} (${typeof ariaDisabled})`, () => {
          const onClick = cy.spy().as('click');
          const Example = () => {
            const [disabled, setDisabled] = React.useState(false);
            return (
              <>
                <Button
                  data-testid="button"
                  {...props}
                  tabIndex={0}
                  aria-disabled={disabled ? ariaDisabled : undefined}
                  onClick={(event: ButtonMouseEvent) => {
                    event.preventDefault();
                    onClick();
                  }}
                >
                  Action
                </Button>
                <button onClick={() => setDisabled(true)}>Disable with ARIA</button>
                <button onClick={() => setDisabled(false)}>Remove ARIA</button>
              </>
            );
          };
          mount(<Example />);
          activate();
          cy.contains('button', 'Disable with ARIA').click();
          button().should('have.attr', 'aria-disabled', 'true');
          button().realClick().focus().realPress('Enter').realPress('Space');
          cy.get('@click').should('have.been.calledThrice');
          cy.contains('button', 'Remove ARIA').click();
          button().click();
          cy.get('@click').should('have.callCount', 4);
        });
      });
    });

    it('retains focus when its action makes the native button disabledFocusable and disabled together', () => {
      const onClick = cy.spy().as('click');
      const Example = () => {
        const [disabled, setDisabled] = React.useState(false);
        return (
          <>
            <Button
              data-testid="button"
              disabled={disabled}
              disabledFocusable={disabled}
              onClick={() => {
                onClick();
                setDisabled(true);
              }}
            >
              Action
            </Button>
            <button onClick={() => setDisabled(false)}>Enable</button>
          </>
        );
      };
      mount(<Example />);
      button().click().should('be.focused').and('not.be.disabled');
      button().should('have.attr', 'aria-disabled', 'true');
      cy.get('@click').should('have.been.calledOnce');
      button().realPress('Enter').realPress('Space');
      button().realClick();
      cy.get('@click').should('have.been.calledOnce');
      cy.contains('button', 'Enable').click();
      button().click().should('be.focused');
      cy.get('@click').should('have.been.calledTwice');
    });

    it('updates computed labels and description relationships and restores content naming', () => {
      const Example = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <span id="action-label">{phase === 0 ? 'Save record' : 'Update record'}</span>
            <span id="action-description">
              {phase === 0 ? 'Saves the current record' : 'Updates the current record'}
            </span>
            <span id="replacement-description">Replacement description</span>
            <Button
              data-testid="button"
              aria-labelledby={phase < 2 ? 'action-label' : undefined}
              aria-describedby={
                phase === 0 ? 'action-description' : phase === 1 ? 'replacement-description' : undefined
              }
              icon={icon}
            >
              Visible action
            </Button>
            <button onClick={() => setPhase(value => value + 1)}>Update relationships</button>
          </>
        );
      };
      mount(<Example />);
      cy.get('[data-cy-root]').should(root => {
        expect(getByRole(root[0], 'button', { name: 'Save record', description: 'Saves the current record' })).to.equal(
          root[0].querySelector('[data-testid="button"]'),
        );
      });
      cy.contains('button', 'Update relationships').click();
      cy.get('[data-cy-root]').should(root => {
        expect(
          getByRole(root[0], 'button', { name: 'Update record', description: 'Replacement description' }),
        ).to.equal(root[0].querySelector('[data-testid="button"]'));
      });
      cy.contains('button', 'Update relationships').click();
      assertName('Visible action');
      button().should('not.have.attr', 'aria-labelledby');
      button().should('not.have.attr', 'aria-describedby');
      cy.get('[data-cy-root]').should(root => {
        expect(getByRole(root[0], 'button', { name: 'Visible action', description: '' })).to.equal(
          root[0].querySelector('[data-testid="button"]'),
        );
      });
    });

    it('submits an associated form with its native name/value and honors reset', () => {
      const onSubmit = cy.spy().as('submit');
      const Example = () => {
        const [operation, setOperation] = React.useState('');
        return (
          <>
            <form
              id="button-form"
              onSubmit={event => {
                event.preventDefault();
                onSubmit();
                const native = event.nativeEvent as SubmitEvent;
                const data = new FormData(event.currentTarget, native.submitter);
                setOperation(String(data.get('operation')));
              }}
            >
              <label>
                Record
                <input name="record" defaultValue="Initial" />
              </label>
              <Button type="reset">Reset form</Button>
            </form>
            <Button data-testid="button" type="submit" form="button-form" name="operation" value="save">
              Save record
            </Button>
            <output>{operation}</output>
          </>
        );
      };
      mount(<Example />);
      button().click();
      cy.get('@submit').should('have.been.calledOnce');
      cy.get('output').should('have.text', 'save');
      button().focus().realPress('Enter').realPress('Space');
      cy.get('@submit').should('have.been.calledThrice');
      cy.get('input[name="record"]').clear().type('Changed').should('have.value', 'Changed');
      cy.contains('button', 'Reset form').click();
      cy.get('input[name="record"]').should('have.value', 'Initial');
      cy.get('@submit').should('have.been.calledThrice');
    });

    let originalUrl: string | undefined;
    afterEach(() => {
      if (originalUrl) {
        const url = originalUrl;
        cy.window().then(win => win.history.replaceState(null, '', url));
        originalUrl = undefined;
      }
    });

    it('removes/restores its destination when disabled and navigates a real anchor href', () => {
      const clicked = cy.spy().as('navigationClick');
      const Example = () => {
        const [disabled, setDisabled] = React.useState(false);
        return (
          <>
            <Button data-testid="button" as="a" href="#button-native-destination" disabled={disabled} onClick={clicked}>
              Go to destination
            </Button>
            <button onClick={() => setDisabled(true)}>Disable link</button>
            <button onClick={() => setDisabled(false)}>Enable link</button>
          </>
        );
      };
      cy.location('href').then(url => {
        originalUrl = url;
        cy.window().then(win => win.history.replaceState(null, '', url.split('#')[0]));
      });
      mount(<Example />);
      assertName('Go to destination', 'link');
      button().should('have.attr', 'href', '#button-native-destination');
      // Cypress 14 patches clicked anchors' removeAttribute to ignore non-target attributes.
      // Exercise href removal before the first pointer click without altering native methods.
      cy.contains('button', 'Disable link').click();
      button().should('not.have.attr', 'href');
      assertName('Go to destination', 'link');
      button().should('have.attr', 'aria-disabled', 'true');
      button().realClick();
      cy.location('hash').should('equal', '');
      cy.contains('button', 'Enable link').click();
      button().should('have.attr', 'href', '#button-native-destination').realClick();
      cy.get('@navigationClick').should('have.been.calledOnce');
      cy.location('hash').should('equal', '#button-native-destination');
    });

    it('updates icon order, icon-only content and removal without retaining stale slots', () => {
      const onClick = cy.spy().as('click');
      const Example = () => {
        const [phase, setPhase] = React.useState(0);
        return (
          <>
            <Button
              data-testid="button"
              icon={phase > 0 ? icon : undefined}
              iconPosition={phase === 2 ? 'after' : 'before'}
              aria-label={phase === 3 ? 'Icon action' : undefined}
              onClick={onClick}
            >
              {phase === 3 ? undefined : 'Action'}
            </Button>
            <button onClick={() => setPhase(value => (value + 1) % 4)}>Next icon state</button>
          </>
        );
      };
      mount(<Example />);
      assertName('Action');
      button().find('[data-testid="glyph"]').should('not.exist');
      cy.contains('button', 'Next icon state').click();
      button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
      assertIconOrder('before');
      cy.contains('button', 'Next icon state').click();
      button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
      assertIconOrder('after');
      cy.contains('button', 'Next icon state').click();
      assertName('Icon action');
      button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
      button().should('have.text', '');
      button().should(element => expect(element[0].childNodes.length).to.equal(1));
      button().click();
      cy.get('@click').should('have.been.calledOnce');
      cy.contains('button', 'Next icon state').click();
      assertName('Action');
      button().find('[data-testid="glyph"]').should('not.exist');
      button().click();
      cy.get('@click').should('have.been.calledTwice');
    });

    it('forwards the live root ref across button/anchor replacement and clears it on unmount', () => {
      const ref = cy.spy().as('rootRef');
      const Example = () => {
        const [anchor, setAnchor] = React.useState(false);
        const [mounted, setMounted] = React.useState(true);
        const props: ButtonProps = anchor ? { as: 'a' } : {};
        return (
          <>
            <button onClick={() => setAnchor(true)}>Render anchor</button>
            <button onClick={() => setMounted(false)}>Unmount</button>
            {mounted && (
              <Button data-testid="button" {...props} ref={ref}>
                Referenced action
              </Button>
            )}
          </>
        );
      };
      mount(<Example />);
      button()
        .should('have.prop', 'tagName', 'BUTTON')
        .then(element => {
          cy.get('@rootRef').its('lastCall.args.0').should('equal', element[0]);
        });
      cy.contains('button', 'Render anchor').click();
      button()
        .should('have.prop', 'tagName', 'A')
        .then(element => {
          cy.get('@rootRef').its('lastCall.args.0').should('equal', element[0]);
        });
      assertName('Referenced action');
      cy.contains('button', 'Unmount').click();
      button().should('not.exist');
      cy.get('@rootRef').its('lastCall.args.0').should('be.null');
    });
  });

  (
    [
      ['secondary', tokens.colorNeutralBackground1, tokens.colorNeutralStroke1],
      ['primary', tokens.colorBrandBackground, tokens.colorTransparentStroke],
      ['outline', tokens.colorTransparentBackground, tokens.colorNeutralStroke1],
      ['subtle', tokens.colorSubtleBackground, tokens.colorTransparentStroke],
      ['transparent', tokens.colorTransparentBackground, tokens.colorTransparentStroke],
    ] as const
  ).forEach(([appearance, backgroundColor, borderColor]) => {
    it(`keeps ${appearance} appearance actionable with its theme-backed emphasis`, () => {
      const onClick = cy.spy().as('click');
      mount(
        <>
          <Button data-testid="button" appearance={appearance} icon={icon} onClick={onClick}>
            Action
          </Button>
          <span data-testid="reference" style={{ backgroundColor, borderColor }}>
            Reference
          </span>
        </>,
      );
      cy.get('[data-testid="reference"]')
        .realHover()
        .invoke('css', 'background-color')
        .then(expected => {
          button().should('have.css', 'background-color', expected);
        });
      cy.get('[data-testid="reference"]')
        .invoke('css', 'border-top-color')
        .then(expected => {
          button().should('have.css', 'border-top-color', expected);
        });
      assertName('Action');
      button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
      activate();
    });
  });

  (['rounded', 'circular', 'square'] as const).forEach(shape => {
    it(`keeps the ${shape} shape actionable`, () => {
      const radius = {
        rounded: teamsLightTheme.borderRadiusMedium,
        circular: teamsLightTheme.borderRadiusCircular,
        square: teamsLightTheme.borderRadiusNone,
      };
      const onClick = cy.spy().as('click');
      mount(
        <Button data-testid="button" shape={shape} onClick={onClick}>
          Action
        </Button>,
      );
      button().should('have.css', 'border-top-left-radius', `${parseFloat(radius[shape])}px`);
      assertName('Action');
      activate();
    });
  });

  (
    [
      ['small', 'fontSizeBase200', 'lineHeightBase200'],
      ['medium', 'fontSizeBase300', 'lineHeightBase300'],
      ['large', 'fontSizeBase400', 'lineHeightBase400'],
    ] as const
  ).forEach(([size, fontSize, lineHeight]) => {
    (['text', 'text and icon', 'icon only'] as const).forEach(content => {
      it(`supports ${size} ${content} activation and the minimum accessible target size`, () => {
        const onClick = cy.spy().as('click');
        mount(
          <Button
            data-testid="button"
            size={size}
            icon={content === 'text' ? undefined : icon}
            aria-label={content === 'icon only' ? 'Action' : undefined}
            onClick={onClick}
          >
            {content === 'icon only' ? undefined : 'Action'}
          </Button>,
        );
        assertName('Action');
        if (content !== 'text') {
          button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
        } else {
          button().find('[data-testid="glyph"]').should('not.exist');
        }
        button()
          .should('have.css', 'font-size', teamsLightTheme[fontSize])
          .and('have.css', 'line-height', teamsLightTheme[lineHeight]);
        button().should(element => {
          const bounds = element[0].getBoundingClientRect();
          expect(bounds.width, 'WCAG 2.5.8 width').to.be.at.least(24);
          expect(bounds.height, 'WCAG 2.5.8 height').to.be.at.least(24);
        });
        activate();
      });
    });
  });

  (['before', 'after'] as const).forEach(iconPosition => {
    it(`places the icon ${iconPosition} content without changing the accessible name or action`, () => {
      const onClick = cy.spy().as('click');
      mount(
        <Button data-testid="button" icon={icon} iconPosition={iconPosition} onClick={onClick}>
          Action
        </Button>,
      );
      assertIconOrder(iconPosition);
      assertName('Action');
      button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
      activate();
    });
  });

  it('uses Tooltip label relationship for a labelled icon-only action', () => {
    const onClick = cy.spy().as('click');
    mount(
      <Tooltip content="Calendar action" relationship="label">
        <Button data-testid="button" icon={icon} onClick={onClick} />
      </Tooltip>,
    );
    assertName('Calendar action');
    button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
    activate();
  });

  (['secondary', 'primary'] as const).forEach(appearance => {
    (['disabled', 'disabledFocusable'] as const).forEach(disabledProp => {
      it(`blocks ${appearance} ${disabledProp} activation and preserves its documented focus policy`, () => {
        const onClick = cy.spy().as('click');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(false);
          return (
            <>
              <button>Before</button>
              <Button data-testid="button" appearance={appearance} {...{ [disabledProp]: disabled }} onClick={onClick}>
                Action
              </Button>
              <button>After</button>
              <button onClick={() => setDisabled(true)}>Disable</button>
              <button onClick={() => setDisabled(false)}>Enable</button>
            </>
          );
        };
        mount(<Example />);
        button().click();
        cy.get('@click').should('have.been.calledOnce');
        cy.contains('button', 'Disable').click();
        if (disabledProp === 'disabled') {
          button().should('be.disabled');
          cy.contains('button', 'Before').focus().realPress('Tab');
          cy.contains('button', 'After').should('be.focused');
        } else {
          button().should('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
          cy.contains('button', 'Before').focus().realPress('Tab');
          button().should('be.focused').realPress('Enter').realPress('Space');
        }
        button().realClick();
        cy.get('@click').should('have.been.calledOnce');
        cy.contains('button', 'Enable').click();
        button().click();
        cy.get('@click').should('have.been.calledTwice');
      });
    });
  });

  it('wraps a long label without losing its accessible name or action', () => {
    const label = 'Long text wraps after it hits the max width of the component';
    const onClick = cy.spy().as('click');
    mount(
      <>
        <Button data-testid="short">Short</Button>
        <Button data-testid="button" style={{ width: tokens.spacingHorizontalXXXL }} onClick={onClick}>
          {label}
        </Button>
      </>,
    );
    assertName(label);
    cy.get('[data-testid="short"]').then(short => {
      button().should(element => {
        expect(element[0].getBoundingClientRect().height).to.be.greaterThan(short[0].getBoundingClientRect().height);
      });
    });
    activate();
  });

  it('supports loading, completion, reset and cancellation through caller-owned contents and disabledFocusable', () => {
    const started = cy.spy().as('started');
    cy.clock();
    mount(<LoadingExample onStart={started} />);
    assertName('Start loading');
    button().find('.fui-Spinner').should('not.exist');
    button().find('[data-testid="glyph"]').should('not.exist');
    button().click().should('be.focused').and('have.attr', 'aria-disabled', 'true');
    assertName('Loading');
    button().find('.fui-Spinner').should('have.length', 1).and('be.visible');
    button().find('[data-testid="glyph"]').should('not.exist');
    button().click();
    cy.get('@started').should('have.been.calledOnce');
    cy.tick(4999);
    assertName('Loading');
    cy.tick(1);
    assertName('Loaded');
    button().find('.fui-Spinner').should('not.exist');
    button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
    button().click();
    cy.get('@started').should('have.been.calledOnce');
    button().should('be.focused');
    cy.contains('button', 'Reset loading state').click();
    assertName('Start loading');
    button().find('.fui-Spinner').should('not.exist');
    button().find('[data-testid="glyph"]').should('not.exist');
    button().click();
    cy.get('@started').should('have.been.calledTwice');
    cy.contains('button', 'Reset loading state').click();
    cy.tick(5000);
    assertName('Start loading');
  });

  (
    [
      [{}, 'BUTTON', 'button'],
      [{ as: 'a' }, 'A', 'button'],
      [{ as: 'a', href: '#button-destination' }, 'A', 'link'],
    ] as const
  ).forEach(([props, tag, role]) => {
    it(`supports labelled ${tag} ${role} semantics and bidirectional keyboard navigation`, () => {
      const onClick = cy.spy().as('click');
      mount(
        <>
          <button>Before</button>
          <Button
            data-testid="button"
            {...props}
            onClick={(event: ButtonMouseEvent) => {
              event.preventDefault();
              onClick();
            }}
          >
            Action
          </Button>
          <button>After</button>
        </>,
      );
      assertName('Action', role);
      button().should('have.prop', 'tagName', tag);
      cy.contains('button', 'Before').focus().realPress('Tab');
      button().should('be.focused');
      activate();
      button().realPress('Tab');
      cy.contains('button', 'After').should('be.focused').realPress(['Shift', 'Tab']);
      button().should('be.focused');
    });
  });
});

describe('Button reviewed native contracts', () => {
  let originalUrl: string | undefined;
  beforeEach(() => {
    originalUrl = undefined;
    cy.location('href').then(url => {
      originalUrl = url;
      cy.window().then(win => win.history.replaceState(null, '', url.split('#')[0]));
    });
  });
  afterEach(() => {
    if (originalUrl) {
      const url = originalUrl;
      cy.window().then(win => win.history.replaceState(null, '', url));
      originalUrl = undefined;
    }
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`performs actual href navigation through a native click generated by ${key}`, () => {
      const clicked = cy.spy().as('click');
      mount(
        <Button
          data-testid="button"
          as="a"
          href="#keyboard-native-destination"
          onClick={event => clicked(event.type, event.currentTarget)}
        >
          Navigate
        </Button>,
      );
      button().focus().realPress(key);
      cy.get('@click').should('have.been.calledOnce');
      button().then(element => cy.get('@click').its('lastCall.args').should('deep.equal', ['click', element[0]]));
      cy.location('hash').should('equal', '#keyboard-native-destination');
    });
  });

  it('allows a consumer to cancel native pointer and keyboard link navigation', () => {
    const clicked = cy.spy().as('click');
    mount(
      <Button
        data-testid="button"
        as="a"
        href="#cancelled-destination"
        onClick={event => {
          event.preventDefault();
          clicked(event.defaultPrevented);
        }}
      >
        Cancelled navigation
      </Button>,
    );
    activate();
    cy.get('@click').should('always.have.been.calledWith', true);
    cy.location('hash').should('equal', '');
  });

  it('recomputes role and default tab navigation when the same enabled anchor gains and loses href', () => {
    const clicked = cy.spy().as('click');
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button>Before</button>
          <Button
            data-testid="button"
            as="a"
            {...(phase === 1 ? { href: '#semantic-destination' } : {})}
            onClick={clicked}
          >
            Action
          </Button>
          <button>After</button>
          <button onClick={() => setPhase(value => value + 1)}>Change href semantics</button>
        </>
      );
    };
    mount(<Example />);
    assertName('Action');
    button().should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
    cy.contains('button', 'Before').focus().realPress('Tab');
    button().should('be.focused');
    cy.contains('button', 'Change href semantics').click();
    assertName('Action', 'link');
    button().should('have.attr', 'href', '#semantic-destination');
    button().should('not.have.attr', 'role');
    cy.contains('button', 'Before').focus().realPress('Tab');
    button().should('be.focused');
    cy.contains('button', 'Change href semantics').click();
    assertName('Action');
    button().should('not.have.attr', 'href');
    button().should('have.attr', 'role', 'button').and('have.attr', 'tabindex', '0');
    cy.contains('button', 'Before').focus().realPress('Tab');
    button().should('be.focused');
    activate();
  });

  const anchors: Array<[string, ButtonProps]> = [
    ['anchor button', { as: 'a' }],
    ['anchor link', { as: 'a', href: '#anchor-interception' }],
  ];
  anchors.forEach(([name, props]) => {
    (['disabled', 'disabledFocusable', 'aria-disabled', 'both'] as const).forEach(mode => {
      it(`intercepts ${mode} ${name} activation before ancestors while forwarding unrelated keys`, () => {
        const clicked = cy.spy().as('click');
        const parentClick = cy.spy().as('parentClick');
        const parentDown = cy.spy().as('parentDown');
        const parentUp = cy.spy().as('parentUp');
        const childDown = cy.spy().as('childDown');
        const childUp = cy.spy().as('childUp');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(false);
          const disabledProps = mode === 'both' ? { disabled, disabledFocusable: disabled } : { [mode]: disabled };
          return (
            <>
              <div onClick={parentClick} onKeyDown={parentDown} onKeyUp={parentUp}>
                <Button
                  data-testid="button"
                  {...props}
                  {...disabledProps}
                  tabIndex={0}
                  onKeyDown={childDown}
                  onKeyUp={childUp}
                  onClick={(event: ButtonMouseEvent) => {
                    event.preventDefault();
                    clicked();
                  }}
                >
                  Action
                </Button>
              </div>
              <button onClick={() => setDisabled(true)}>Disable interception</button>
              <button onClick={() => setDisabled(false)}>Enable interception</button>
            </>
          );
        };
        mount(<Example />);
        activate();
        cy.get('@parentClick').should('have.been.calledThrice');
        cy.get('@parentDown').should('have.been.calledTwice');
        cy.get('@parentUp').should('have.been.calledTwice');
        cy.contains('button', 'Disable interception').click();
        button().realClick();
        button().focus().realPress('Enter').realPress('Space');
        cy.get('@click').should('have.been.calledThrice');
        cy.get('@parentClick').should('have.been.calledThrice');
        cy.get('@parentDown').should('have.been.calledTwice');
        cy.get('@parentUp').should('have.been.calledTwice');
        cy.get('@childDown').should('have.callCount', 4);
        cy.get('@childUp').should('have.callCount', 4);
        button().realPress('A');
        cy.get('@parentDown').should('have.been.calledThrice');
        cy.get('@parentUp').should('have.been.calledThrice');
        cy.get('@click').should('have.been.calledThrice');
        cy.location('hash').should('equal', '');
        cy.contains('button', 'Enable interception').click();
        button().click();
        cy.get('@click').should('have.callCount', 4);
        cy.get('@parentClick').should('have.callCount', 4);
      });
    });

    it(`prevents Space scrolling for ${name} in an established scrollable region`, () => {
      const clicked = cy.spy().as('click');
      let scrollEnded: PromiseLike<void>;
      mount(
        <div data-testid="scrollport" style={{ height: tokens.fontSizeHero900, overflowY: 'auto' }}>
          <a id="native-scroll-control" tabIndex={0} style={{ display: 'block' }}>
            Native scroll control
          </a>
          <Button
            data-testid="button"
            {...props}
            style={{ position: 'sticky', top: tokens.spacingVerticalNone }}
            onClick={(event: ButtonMouseEvent) => {
              event.preventDefault();
              clicked();
            }}
          >
            Action
          </Button>
          {Array.from({ length: 20 }, (_, index) => (
            <p key={index}>Scrollable content {index}</p>
          ))}
        </div>,
      );
      cy.get('[data-testid="scrollport"]').then(element => {
        expect(element[0].scrollHeight).to.be.greaterThan(element[0].clientHeight);
        scrollEnded = new Cypress.Promise<void>(resolve =>
          element[0].addEventListener('scrollend', () => resolve(), { once: true }),
        );
      });
      cy.get('#native-scroll-control').focus().realPress('Space', { pressDelay: 100 });
      cy.get('[data-testid="scrollport"]').should(element => expect(element[0].scrollTop).to.be.greaterThan(0));
      cy.then(() => scrollEnded);
      button().focus();
      cy.get('[data-testid="scrollport"]').then(element => {
        const position = element[0].scrollTop;
        button().realPress('Space', { pressDelay: 100 });
        cy.get('[data-testid="scrollport"]').should('have.prop', 'scrollTop', position);
      });
      cy.get('@click').should('have.been.calledOnce');
    });
  });

  (['submit', 'reset'] as const).forEach(type => {
    (['disabledFocusable', 'both', 'aria-disabled'] as const).forEach(mode => {
      it(`cancels ${type} defaults for a direct ARIA hook consumer using ${mode} and restores enabled defaults`, () => {
        const clicked = cy.spy().as('click');
        const action = cy.spy().as('formAction');
        const Example = () => {
          const [disabled, setDisabled] = React.useState(false);
          const disabledProps = mode === 'both' ? { disabled, disabledFocusable: disabled } : { [mode]: disabled };
          const native = useARIAButtonProps('button', { type, ...disabledProps, onClick: clicked });
          return (
            <form
              onSubmit={event => {
                event.preventDefault();
                if (type === 'submit') {
                  action();
                }
              }}
              onReset={() => {
                if (type === 'reset') {
                  action();
                }
              }}
            >
              <label>
                Record
                <input name="record" defaultValue="Initial" />
              </label>
              <button {...native} data-testid="button">
                Action
              </button>
              <button type="button" onClick={() => setDisabled(true)}>
                Disable direct action
              </button>
              <button type="button" onClick={() => setDisabled(false)}>
                Enable direct action
              </button>
            </form>
          );
        };
        mount(<Example />);
        cy.get('input[name="record"]').clear().type('Changed');
        button().click();
        cy.get('@click').should('have.been.calledOnce');
        cy.get('@formAction').should('have.been.calledOnce');
        if (type === 'reset') {
          cy.get('input[name="record"]').should('have.value', 'Initial');
        }
        cy.get('input[name="record"]').clear().type('Changed again');
        cy.contains('button', 'Disable direct action').click();
        button().should('not.be.disabled').and('have.attr', 'aria-disabled', 'true');
        button().realClick();
        button().focus().realPress('Enter').realPress('Space');
        cy.get('@click').should('have.been.calledOnce');
        cy.get('@formAction').should('have.been.calledOnce');
        cy.get('input[name="record"]').should('have.value', 'Changed again');
        cy.contains('button', 'Enable direct action').click();
        button().click();
        button().focus().realPress('Enter').realPress('Space');
        cy.get('@click').should('have.callCount', 4);
        cy.get('@formAction').should('have.callCount', 4);
        if (type === 'reset') {
          cy.get('input[name="record"]').should('have.value', 'Initial');
        }
      });
    });
  });

  (
    [
      ['absent', undefined],
      ['null', null],
      ['false', false],
      ['empty string', ''],
    ] as const
  ).forEach(([name, children]) => {
    it(`keeps an icon-only action usable with ${name} children`, () => {
      const clicked = cy.spy().as('click');
      mount(
        <Button data-testid="button" icon={icon} aria-label="Action" onClick={clicked}>
          {children}
        </Button>,
      );
      assertName('Action');
      button().should('have.text', '');
      button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
      button().should(element => expect(element[0].childNodes.length).to.equal(1));
      activate();
    });
  });

  it('renders numeric zero icon shorthand with icon-only geometry and a native action', () => {
    const clicked = cy.spy().as('click');
    mount(<Button data-testid="button" icon={0} onClick={clicked} />);
    assertName('0');
    button().find('.fui-Button__icon').should('have.text', '0').and('be.visible');
    button().should(element => {
      const bounds = element[0].getBoundingClientRect();
      expect(bounds.width).to.equal(bounds.height);
    });
    activate();
  });

  const variants: Array<[string, ButtonProps]> = [['native button', {}], ...anchors];
  variants.forEach(([name, props]) => {
    it(`replaces and removes current click, focus and blur handlers on ${name}`, () => {
      const oldClick = cy.spy().as('oldClick');
      const currentClick = cy.spy().as('currentClick');
      const oldFocus = cy.spy().as('oldFocus');
      const currentFocus = cy.spy().as('currentFocus');
      const oldBlur = cy.spy().as('oldBlur');
      const currentBlur = cy.spy().as('currentBlur');
      const Example = () => {
        const [phase, setPhase] = React.useState(0);
        const click = phase === 0 ? oldClick : currentClick;
        const focus = phase === 0 ? oldFocus : currentFocus;
        const blur = phase === 0 ? oldBlur : currentBlur;
        return (
          <>
            <div onClick={event => event.preventDefault()}>
              <Button
                data-testid="button"
                {...props}
                onClick={phase === 2 ? undefined : (event: ButtonMouseEvent) => click(event.currentTarget, event.type)}
                onFocus={
                  phase === 2
                    ? undefined
                    : (event: React.FocusEvent<HTMLButtonElement | HTMLAnchorElement>) =>
                        focus(event.currentTarget, event.type)
                }
                onBlur={
                  phase === 2
                    ? undefined
                    : (event: React.FocusEvent<HTMLButtonElement | HTMLAnchorElement>) =>
                        blur(event.currentTarget, event.type)
                }
              >
                Action
              </Button>
            </div>
            <button onClick={() => setPhase(value => value + 1)}>Next handlers</button>
          </>
        );
      };
      mount(<Example />);
      button().realClick();
      cy.get('@oldClick').should('have.been.calledOnce');
      button().then(element => cy.get('@oldFocus').its('lastCall.args').should('deep.equal', [element[0], 'focus']));
      cy.contains('button', 'Next handlers').click();
      cy.get('@oldBlur').should('have.been.calledOnce');
      button().realClick();
      cy.get('@currentClick').should('have.been.calledOnce');
      cy.get('@oldClick').should('have.been.calledOnce');
      cy.get('@currentFocus').should('have.been.calledOnce');
      cy.contains('button', 'Next handlers').click();
      cy.get('@currentBlur').should('have.been.calledOnce');
      button().realClick().should('be.focused');
      cy.get('@currentClick').should('have.been.calledOnce');
      cy.get('@currentFocus').should('have.been.calledOnce');
      cy.contains('button', 'Next handlers').click();
      cy.get('@currentBlur').should('have.been.calledOnce');
      button().realClick();
      cy.get('@currentClick').should('have.been.calledTwice');
      cy.get('@currentFocus').should('have.been.calledTwice');
      button().realPress('Tab');
      cy.contains('button', 'Next handlers').should('be.focused');
      cy.get('@currentBlur').should('have.been.calledTwice');
      button().then(element => cy.get('@currentBlur').its('lastCall.args').should('deep.equal', [element[0], 'blur']));
      cy.get('@oldClick').should('have.been.calledOnce');
      cy.get('@oldFocus').should('have.been.calledOnce');
      cy.get('@oldBlur').should('have.been.calledOnce');
      cy.location('hash').should('equal', '');
    });
  });

  it('keeps loading and loaded states keyboard-disabled with live timers and restores a fresh action on reset', () => {
    const started = cy.spy().as('started');
    mount(<LoadingExample onStart={started} />);
    button().realClick();
    assertName('Loading');
    button().find('.fui-Spinner').should('have.length', 1).and('be.visible');
    button().should('be.focused').realPress('Enter').realPress('Space');
    button().realClick();
    cy.get('@started').should('have.been.calledOnce');
    assertName('Loaded');
    button().find('.fui-Spinner').should('not.exist');
    button().find('[data-testid="glyph"]').should('have.length', 1).and('be.visible');
    button().should('be.focused').realPress('Enter').realPress('Space');
    button().realClick();
    cy.get('@started').should('have.been.calledOnce');
    cy.contains('button', 'Reset loading state').realClick();
    assertName('Start loading');
    button().find('[data-testid="glyph"]').should('not.exist');
    button().realClick();
    cy.get('@started').should('have.been.calledTwice');
    cy.contains('button', 'Reset loading state').realClick();
    assertName('Start loading');
  });
});
