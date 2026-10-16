import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';

import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import { mergeClasses } from '@griffel/react';
import { AnnounceProvider } from '@fluentui/react-shared-contexts';
import { AriaLiveAnnouncer } from '@fluentui/react-aria';
import { getByRole } from '@testing-library/dom';
import { motionTokens } from '@fluentui/react-motion';
import { useIsomorphicLayoutEffect } from '@fluentui/react-utilities';
import { useCallerOverrideStyles } from '../../testing/MessageBar.cy.styles';

import {
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  MessageBarGroup,
} from '@fluentui/react-message-bar';
import type { MessageBarProps, MessageBarIntent } from './MessageBar.types';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const Test = () => {
  const actionRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    actionRef.current?.focus();
  }, []);

  return (
    <div style={{ width: 400 }}>
      <MessageBar intent="success">
        <MessageBarBody>
          <MessageBarTitle>Descriptive title</MessageBarTitle>
          Message providing information to the user with actionable insights. <a>Link</a>
        </MessageBarBody>
        <MessageBarActions containerAction={<button id="containerAction">XXX</button>}>
          <button id="action" ref={actionRef}>
            Action
          </button>
        </MessageBarActions>
      </MessageBar>
    </div>
  );
};

describe('MessageBar', () => {
  // ⚠️ - This test will fail on headed cypress runs, since cypress element highlighting injects divs that
  // trigger resize observer updates
  it('Should render MessageActions slots with correct keys', () => {
    mount(<Test />);

    cy.on('uncaught:exception', err => {
      // Ignore uncaught exceptions from resize observer
      // These seem to only happen on cypress headed runs
      if (err.message.includes('ResizeObserver loop completed with undelivered notifications')) {
        return false;
      }
    });

    // wait for resize observer to trigger
    cy.wait(1000).get('#action').should('be.focused').get('#containerAction').should('not.be.focused');
  });

  type FixtureProps = MessageBarProps & {
    'data-native-prop'?: string;
    ref?: React.Ref<HTMLDivElement>;
    titleText?: string;
    bodyText?: string;
    handleAction?: (action: string) => void;
    handleDismiss?: () => void;
  };
  const createMessage = ({
    titleText = 'Descriptive title',
    bodyText = 'Message providing actionable information for this page.',
    handleAction,
    handleDismiss,
    ...props
  }: FixtureProps = {}) => (
    <MessageBar {...props} data-testid="message">
      <MessageBarBody data-testid="body">
        <MessageBarTitle data-testid="title">{titleText}</MessageBarTitle> {bodyText} <a href="#message-help">Help</a>
      </MessageBarBody>
      <MessageBarActions
        data-testid="actions"
        containerAction={
          <button aria-label={`Dismiss ${titleText}`} onClick={handleDismiss}>
            Dismiss
          </button>
        }
      >
        <button onClick={() => handleAction?.('Retry')}>Retry</button>
        <button onClick={() => handleAction?.('Details')}>Details</button>
      </MessageBarActions>
    </MessageBar>
  );
  const message = () => cy.get('[data-testid="message"]');
  const body = () => cy.get('[data-testid="body"]');
  const button = (name: string) =>
    cy.get('button').filter((_, element) => (element.getAttribute('aria-label') ?? element.textContent) === name);
  const assertLayout = (layout: 'singleline' | 'multiline') =>
    message().should($message => {
      const root = $message[0];
      const view = root.ownerDocument.defaultView!;
      const bodyElement = root.querySelector<HTMLElement>('[data-testid="body"]')!;
      const actionsElement = root.querySelector<HTMLElement>('[data-testid="actions"]')!;
      const dismissElement = root.querySelector<HTMLElement>('[aria-label^="Dismiss "]')!;
      const bodyRect = bodyElement.getBoundingClientRect();
      const actionsRect = actionsElement.getBoundingClientRect();
      const dismissRect = dismissElement.getBoundingClientRect();
      expect(view.getComputedStyle(root).whiteSpace).to.equal(layout === 'singleline' ? 'nowrap' : 'normal');
      expect(actionsRect.width).to.be.greaterThan(0);
      expect(bodyRect.height).to.be.greaterThan(0);
      if (layout === 'singleline') {
        expect(actionsRect.top + actionsRect.height / 2).to.be.closeTo(bodyRect.top + bodyRect.height / 2, 0.5);
        expect(actionsRect.left).to.be.greaterThan(bodyRect.left);
        expect(dismissRect.left, 'dismiss follows secondary actions').to.be.at.least(actionsRect.right);
        expect(root.querySelector('.fui-MessageBar__bottomReflowSpacer')).to.equal(null);
      } else {
        expect(actionsRect.top).to.be.greaterThan(bodyRect.bottom);
        expect(dismissRect.top).to.be.lessThan(actionsRect.top);
        expect(root.querySelector('.fui-MessageBar__bottomReflowSpacer')).not.to.equal(null);
      }
    });

  const intentDesign = {
    info: {
      background: teamsLightTheme.colorNeutralBackground3,
      border: teamsLightTheme.colorNeutralStroke1,
      foreground: teamsLightTheme.colorNeutralForeground3,
    },
    success: {
      background: teamsLightTheme.colorStatusSuccessBackground1,
      border: teamsLightTheme.colorStatusSuccessBorder1,
      foreground: teamsLightTheme.colorStatusSuccessForeground1,
    },
    warning: {
      background: teamsLightTheme.colorStatusWarningBackground1,
      border: teamsLightTheme.colorStatusWarningBorder1,
      foreground: teamsLightTheme.colorStatusWarningForeground3,
    },
    error: {
      background: teamsLightTheme.colorStatusDangerBackground1,
      border: teamsLightTheme.colorStatusDangerBorder1,
      foreground: teamsLightTheme.colorStatusDangerForeground1,
    },
  };
  const intents = ['info', 'success', 'warning', 'error'] as const;

  describe('MessageBar finite functional contracts', () => {
    let originalUrl: string;
    beforeEach(() => {
      cy.viewport(1000, 700);
      return cy.window().then(view => {
        originalUrl = view.location.href;
        return Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] },
        });
      });
    });
    afterEach(() =>
      cy.window().then(view => {
        view.history.replaceState(null, '', originalUrl);
        return Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { media: 'screen', features: [] },
        });
      }),
    );

    it('renders the default named group with reachable body link/actions and no automatic dismissal', () => {
      mount(createMessage());
      cy.get('[data-cy-root]').should($root => {
        const group = getByRole($root[0], 'group', { name: 'Descriptive title' });
        expect(getByRole(group, 'link', { name: 'Help' }).getAttribute('href')).to.equal('#message-help');
        expect(getByRole(group, 'button', { name: 'Retry' })).to.exist;
        expect(getByRole(group, 'button', { name: 'Details' })).to.exist;
        expect(getByRole(group, 'button', { name: 'Dismiss Descriptive title' })).to.exist;
        expect(group.getAttribute('aria-labelledby')).to.equal(group.querySelector('[data-testid="title"]')!.id);
      });
      assertLayout('singleline');
      message().should('have.css', 'border-radius', teamsLightTheme.borderRadiusMedium);
      button('Dismiss Descriptive title').realClick();
      message().should('be.visible');
    });

    for (const intent of intents) {
      it(`uses documented ${intent} design/default glyph and current intent announcement preset`, () => {
        const announce = cy.spy().as('announce');
        const design = intentDesign[intent];
        mount(
          <AnnounceProvider value={{ announce }}>
            <span
              data-testid="design"
              style={{ backgroundColor: design.background, borderColor: design.border, color: design.foreground }}
            />
            {createMessage({ intent })}
          </AnnounceProvider>,
        );
        cy.get('[data-testid="design"]').then($probe => {
          const style = $probe[0].ownerDocument.defaultView!.getComputedStyle($probe[0]);
          message()
            .should('have.css', 'background-color', style.backgroundColor)
            .and('have.css', 'border-top-color', style.borderTopColor);
          cy.get('.fui-MessageBar__icon')
            .should('have.css', 'color', style.color)
            .find('svg')
            .should('have.length', 1)
            .and('have.attr', 'aria-hidden', 'true');
        });
        cy.get('@announce').should(() => {
          expect(announce.callCount).to.be.greaterThan(0);
          const expected =
            'Descriptive title Message providing actionable information for this page. Help,RetryDetails';
          announce
            .getCalls()
            .forEach(call =>
              expect(call.args).to.deep.equal([expected, { polite: intent === 'info', alert: intent !== 'info' }]),
            );
        });
        body().should('contain.text', 'Message providing actionable information');
      });

      for (const politeness of ['polite', 'assertive'] as const) {
        it(`honors explicit ${politeness} announcement priority with ${intent} intent`, () => {
          const announce = cy.spy().as('announce');
          mount(<AnnounceProvider value={{ announce }}>{createMessage({ intent, politeness })}</AnnounceProvider>);
          cy.get('@announce').should(() => {
            expect(announce.callCount).to.be.greaterThan(0);
            announce
              .getCalls()
              .forEach(call =>
                expect(call.args).to.deep.equal([
                  'Descriptive title Message providing actionable information for this page. Help,RetryDetails',
                  { polite: politeness === 'polite', alert: politeness === 'assertive' },
                ]),
              );
          });
          cy.get('[data-cy-root]').should(
            $root => expect(getByRole($root[0], 'group', { name: 'Descriptive title' })).to.exist,
          );
        });
      }

      it(`switches documented manual layout for ${intent} while preserving action identity and focus`, () => {
        const Fixture = () => {
          const [multiline, setMultiline] = React.useState(false);
          return (
            <>
              <button onMouseDown={event => event.preventDefault()} onClick={() => setMultiline(value => !value)}>
                Toggle manual layout
              </button>
              {createMessage({ intent, layout: multiline ? 'multiline' : 'singleline' })}
            </>
          );
        };
        mount(<Fixture />);
        assertLayout('singleline');
        cy.contains('button', 'Retry')
          .realClick()
          .should('be.focused')
          .then($original => {
            const original = $original[0];
            cy.contains('button', 'Toggle manual layout').realClick();
            assertLayout('multiline');
            cy.contains('button', 'Retry')
              .should('be.focused')
              .and($current => expect($current[0]).to.equal(original));
            cy.contains('button', 'Toggle manual layout').realClick();
            assertLayout('singleline');
            cy.contains('button', 'Retry')
              .should('be.focused')
              .and($current => expect($current[0]).to.equal(original));
          });
      });
    }

    for (const shape of ['rounded', 'square'] as const) {
      it(`uses documented ${shape} corners while preserving group naming and native actions`, () => {
        const action = cy.spy().as('shapeAction');
        mount(createMessage({ shape, handleAction: action }));
        message().should('have.css', 'border-radius', shape === 'rounded' ? teamsLightTheme.borderRadiusMedium : '0px');
        cy.get('[data-cy-root]').should(
          $root => expect(getByRole($root[0], 'group', { name: 'Descriptive title' })).to.exist,
        );
        cy.contains('button', 'Retry').realClick();
        cy.get('@shapeAction').should('have.been.calledOnceWithExactly', 'Retry');
        message().should('be.visible');
      });
    }

    for (const target of ['Retry', 'Dismiss Descriptive title']) {
      it(`automatically reflows and restores real action positions without recreating or blurring ${target}`, () => {
        const Fixture = () => {
          const [compact, setCompact] = React.useState(false);
          return (
            <>
              <button onMouseDown={event => event.preventDefault()} onClick={() => setCompact(value => !value)}>
                Resize message container
              </button>
              <div data-testid="frame" style={{ width: compact ? '30%' : '100%' }}>
                {createMessage()}
              </div>
            </>
          );
        };
        mount(<Fixture />);
        assertLayout('singleline');
        button(target)
          .realClick()
          .should('be.focused')
          .then($original => {
            const original = $original[0];
            cy.contains('button', 'Resize message container').realClick();
            assertLayout('multiline');
            body().should($body => {
              const element = $body[0];
              expect(element.getBoundingClientRect().height).to.be.greaterThan(
                parseFloat(element.ownerDocument.defaultView!.getComputedStyle(element).lineHeight),
              );
            });
            button(target)
              .should('be.focused')
              .and($current => expect($current[0]).to.equal(original));
            cy.contains('button', 'Resize message container').realClick();
            assertLayout('singleline');
            button(target)
              .should('be.focused')
              .and($current => expect($current[0]).to.equal(original));
          });
      });
    }

    for (const activation of ['pointer', 'Enter', 'Space'] as const) {
      it(`performs documented actions through ${activation} without implicitly removing the message`, () => {
        const action = cy.spy().as('action');
        const Fixture = () => {
          const [selected, setSelected] = React.useState('No action');
          return (
            <>
              {createMessage({
                handleAction: value => {
                  action(value);
                  setSelected(value);
                },
              })}
              <output>{selected}</output>
            </>
          );
        };
        mount(<Fixture />);
        cy.contains('output', 'No action').should('be.visible');
        cy.contains('button', 'Retry').realClick();
        cy.get('@action').should('have.been.calledOnceWithExactly', 'Retry');
        cy.contains('output', 'Retry').should('be.visible');
        cy.then(() => action.resetHistory());
        cy.contains('button', 'Details').focus();
        if (activation === 'pointer') {
          cy.contains('button', 'Details').realClick();
        } else {
          cy.realPress(activation);
        }
        cy.get('@action').should('have.been.calledOnceWithExactly', 'Details');
        cy.contains('output', 'Details').should('be.visible');
        message().should('be.visible');
      });
    }

    for (const activation of ['pointer', 'Enter'] as const) {
      it(`retains native body-link navigation through ${activation} while the message persists`, () => {
        mount(createMessage());
        cy.location('hash').should('not.equal', '#message-help');
        cy.contains('a', 'Help').focus();
        if (activation === 'pointer') {
          cy.contains('a', 'Help').realClick();
        } else {
          cy.realPress('Enter');
        }
        cy.location('hash').should('equal', '#message-help');
        message().should('be.visible');
      });
    }

    it('integrates the documented real AriaLiveAnnouncer with body and action narration', () => {
      const Fixture = () => {
        const [visible, setVisible] = React.useState(false);
        return (
          <AriaLiveAnnouncer>
            <button onClick={() => setVisible(true)}>Show announced message</button>
            {visible && createMessage()}
          </AriaLiveAnnouncer>
        );
      };
      const narration = 'Descriptive title Message providing actionable information for this page. Help,RetryDetails';
      cy.document().then(doc => {
        const nativeAnnouncement =
          'ariaNotify' in doc && typeof doc.ariaNotify === 'function'
            ? cy.spy(doc, 'ariaNotify').as('nativeAnnouncement')
            : undefined;
        mount(<Fixture />);
        if (nativeAnnouncement) {
          cy.get('@nativeAnnouncement').should('not.have.been.called');
        } else {
          cy.get('[aria-live]').should('have.text', '');
        }
        cy.contains('button', 'Show announced message').realClick();
        message().should('be.visible');
        if (nativeAnnouncement) {
          cy.get('@nativeAnnouncement').should(() => {
            expect(nativeAnnouncement).to.have.been.calledTwice;
            nativeAnnouncement
              .getCalls()
              .forEach(call => expect(call.args).to.deep.equal([narration, { priority: 'normal' }]));
          });
        } else {
          cy.get('[aria-live]').should('have.text', `${narration}. ${narration}. `);
        }
        cy.get('[data-cy-root]').should(
          $root => expect(getByRole($root[0], 'group', { name: 'Descriptive title' })).to.exist,
        );
      });
    });

    it('persists until the caller removes it rather than imposing an undocumented expiry timer', () => {
      cy.clock();
      mount(createMessage());
      message().should('be.visible');
      cy.tick(60000);
      message().should('be.visible');
      body().should('contain.text', 'Message providing actionable information');
    });

    for (const intent of intents) {
      it(`updates ${intent} priority overrides and restores the default without replacing the root`, () => {
        const announce = cy.spy().as('announce');
        const Fixture = () => {
          const [step, setStep] = React.useState(0);
          const priorities = [undefined, 'polite', 'assertive', undefined] as const;
          return (
            <AnnounceProvider value={{ announce }}>
              <button onClick={() => setStep(value => value + 1)}>Next priority</button>
              {createMessage({ intent, politeness: priorities[step] })}
            </AnnounceProvider>
          );
        };
        mount(<Fixture />);
        message().then($root => {
          const original = $root[0];
          const assertPriority = (polite: boolean) =>
            cy.get('@announce').should(() => {
              expect(announce.callCount).to.be.greaterThan(0);
              expect(announce.lastCall.args).to.deep.equal([
                'Descriptive title Message providing actionable information for this page. Help,RetryDetails',
                { polite, alert: !polite },
              ]);
            });
          assertPriority(intent === 'info');
          cy.contains('button', 'Next priority').realClick();
          assertPriority(true);
          cy.then(() => announce.resetHistory());
          cy.contains('button', 'Next priority').realClick();
          assertPriority(false);
          if (intent === 'info') {
            cy.then(() => announce.resetHistory());
          }
          cy.contains('button', 'Next priority').realClick();
          assertPriority(intent === 'info');
          message().should($current => expect($current[0]).to.equal(original));
        });
      });
    }

    for (const layout of ['singleline', 'multiline', 'auto'] as const) {
      it(`retains native forward/reverse Tab order in ${layout} without focusing the decorative group or icon`, () => {
        mount(
          <>
            <button>Before message</button>
            {createMessage({ layout })}
            <button>After message</button>
          </>,
        );
        assertLayout(layout === 'multiline' ? 'multiline' : 'singleline');
        message().should('not.have.attr', 'tabindex');
        cy.contains('button', 'Before message').focus();
        cy.realPress('Tab');
        cy.contains('a', 'Help').should('be.focused');
        const sequence =
          layout === 'multiline'
            ? ['Dismiss Descriptive title', 'Retry', 'Details', 'After message']
            : ['Retry', 'Details', 'Dismiss Descriptive title', 'After message'];
        for (const name of sequence) {
          cy.realPress('Tab');
          button(name).should('be.focused');
        }
        for (const name of sequence.slice(0, -1).reverse()) {
          cy.realPress(['Shift', 'Tab']);
          button(name).should('be.focused');
        }
        cy.realPress(['Shift', 'Tab']);
        cy.contains('a', 'Help').should('be.focused');
        cy.realPress(['Shift', 'Tab']);
        cy.contains('button', 'Before message').should('be.focused');
      });
    }

    it('updates title-derived group names and explicit native names/descriptions while preserving identity', () => {
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        return (
          <>
            <button onClick={() => setStep(value => value + 1)}>Update accessibility</button>
            <span id="message-description">{step ? 'Updated description' : 'Original description'}</span>
            {createMessage({
              titleText: step ? 'Updated title' : 'Descriptive title',
              'aria-describedby': 'message-description',
              ...(step === 2 ? { 'aria-label': 'Caller name', 'aria-labelledby': undefined } : {}),
            })}
          </>
        );
      };
      mount(<Fixture />);
      message().then($initial => {
        const original = $initial[0];
        const assertName = (name: string, description: string) =>
          cy.get('[data-cy-root]').should($root => {
            expect(getByRole($root[0], 'group', { name, description })).to.equal(original);
          });
        assertName('Descriptive title', 'Original description');
        cy.contains('button', 'Update accessibility').realClick();
        assertName('Updated title', 'Updated description');
        cy.contains('button', 'Update accessibility').realClick();
        assertName('Caller name', 'Updated description');
        message().should('not.have.attr', 'aria-labelledby');
        cy.contains('button', 'Update accessibility').realClick();
        assertName('Updated title', 'Updated description');
        message().should('have.attr', 'aria-labelledby').and('not.be.empty');
      });
    });

    it('preserves separate title relationships for multiple message groups', () => {
      mount(
        <>
          {createMessage({ titleText: 'First notice' })}
          {createMessage({ titleText: 'Second notice' })}
        </>,
      );
      cy.get('[data-cy-root]').should($root => {
        const first = getByRole($root[0], 'group', { name: 'First notice' });
        const second = getByRole($root[0], 'group', { name: 'Second notice' });
        const firstTitle = first.querySelector('[data-testid="title"]')!;
        const secondTitle = second.querySelector('[data-testid="title"]')!;
        expect(firstTitle.id).not.to.equal(secondTitle.id);
        expect(first.getAttribute('aria-labelledby')).to.equal(firstTitle.id);
        expect(second.getAttribute('aria-labelledby')).to.equal(secondTitle.id);
      });
    });

    it('honors caller-owned role and focus semantics while retaining native children', () => {
      const focus = cy.spy().as('rootFocus');
      mount(createMessage({ role: 'region', tabIndex: 0, onFocus: event => focus(event.target) }));
      cy.get('[data-cy-root]').should($root => {
        expect(getByRole($root[0], 'region', { name: 'Descriptive title' })).to.equal(
          $root[0].querySelector('[data-testid="message"]'),
        );
      });
      message().focus().should('be.focused');
      cy.get('@rootFocus').should('have.been.calledOnce');
      cy.realPress('Tab');
      cy.contains('a', 'Help').should('be.focused');
      cy.contains('button', 'Retry').realClick().should('be.focused');
      message().should('be.visible');
    });

    for (const value of [0, 'Custom glyph', <span key="glyph">Custom glyph</span>] as const) {
      it(`renders supported icon ${
        typeof value === 'object' ? 'JSX' : JSON.stringify(value)
      } instead of the default SVG`, () => {
        mount(createMessage({ icon: value }));
        cy.get('.fui-MessageBar__icon')
          .should('have.text', value === 0 ? '0' : 'Custom glyph')
          .find('svg')
          .should('not.exist');
        cy.contains('button', 'Retry').realClick().should('be.focused');
        message().should('be.visible');
      });
    }

    it('supports native icon slot props/ref and returns to the generated icon after explicit removal', () => {
      const iconRef = cy.spy().as('iconRef');
      const click = cy.spy().as('iconClick');
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        return (
          <>
            <button onClick={() => setStep(value => value + 1)}>Next icon</button>
            {createMessage({
              icon:
                step === 0
                  ? {
                      as: 'div',
                      role: 'img',
                      'aria-label': 'Caller status',
                      className: 'caller-icon',
                      style: { marginRight: tokens.spacingHorizontalXXL },
                      ref: node => iconRef(node),
                      onClick: click,
                      children: '!',
                    }
                  : step === 1
                  ? null
                  : undefined,
            })}
          </>
        );
      };
      mount(<Fixture />);
      cy.get('[data-cy-root]').should($root => {
        expect(getByRole($root[0], 'img', { name: 'Caller status' }).tagName).to.equal('DIV');
      });
      cy.get('.caller-icon')
        .should('have.css', 'margin-right', teamsLightTheme.spacingHorizontalXXL)
        .realClick()
        .then($icon => {
          const original = $icon[0];
          cy.get('@iconClick').should('have.been.calledOnce');
          cy.get('@iconRef').should(() => expect(iconRef.lastCall.args[0]).to.equal(original));
          cy.contains('button', 'Next icon').realClick();
          cy.get('.fui-MessageBar__icon').should('not.exist');
          cy.get('@iconRef').should(() => expect(iconRef.lastCall.args).to.deep.equal([null]));
          cy.then(() => expect(original.isConnected).to.equal(false));
          cy.contains('button', 'Next icon').realClick();
          cy.get('.fui-MessageBar__icon').find('svg').should('have.length', 1);
          cy.get('.caller-icon').should('not.exist');
        });
    });

    it('supports an icon render function with actual native child activation and root bubbling', () => {
      const child = cy.spy().as('renderedIcon');
      const root = cy.spy().as('iconRoot');
      const renderIcon: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
        <Component {...props}>
          <button onClick={child}>Rendered icon action</button>
        </Component>
      );
      mount(
        createMessage({
          onClick: event => root(event.target),
          icon: {
            children: renderIcon,
          },
        }),
      );
      cy.contains('button', 'Rendered icon action').focus();
      cy.realPress('Enter');
      cy.get('@renderedIcon').should('have.been.calledOnce');
      cy.contains('button', 'Rendered icon action').then($button =>
        cy.get('@iconRoot').should('have.been.calledOnceWithExactly', $button[0]),
      );
      message().should('be.visible');
    });

    it('retains bottom spacer caller classes and Griffel precedence with native ref/style props', () => {
      const ref = cy.spy().as('spacerRef');
      const Fixture = () => {
        const classes = useCallerOverrideStyles();
        return (
          <MessageBar
            data-testid="message"
            layout="multiline"
            bottomReflowSpacer={{
              id: 'caller-spacer',
              className: mergeClasses(classes.spacer, 'caller-spacer'),
              style: { minHeight: tokens.spacingVerticalL },
              ref: node => ref(node),
              'aria-hidden': true,
            }}
          >
            <MessageBarBody>Caller-owned message with no actions</MessageBarBody>
          </MessageBar>
        );
      };
      mount(<Fixture />);
      cy.get('#caller-spacer')
        .should('have.class', 'caller-spacer')
        .and('have.class', 'fui-MessageBar__bottomReflowSpacer')
        .and('have.css', 'margin-bottom', teamsLightTheme.spacingVerticalXXL)
        .and('have.css', 'min-height', teamsLightTheme.spacingVerticalL)
        .and('have.attr', 'aria-hidden', 'true')
        .then($spacer => cy.get('@spacerRef').should(() => expect(ref.lastCall.args[0]).to.equal($spacer[0])));
    });

    it('honors explicitly supplied/null bottom spacer slots in either manual layout and restores defaults', () => {
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        const scenarios: MessageBarProps[] = [
          { layout: 'singleline' },
          { layout: 'singleline', bottomReflowSpacer: { id: 'supplied-spacer', children: 'Custom space' } },
          { layout: 'multiline', bottomReflowSpacer: null },
          { layout: 'multiline' },
          { layout: 'singleline' },
        ];
        return (
          <>
            <button onClick={() => setStep(value => value + 1)}>Next spacer</button>
            {createMessage(scenarios[step])}
          </>
        );
      };
      mount(<Fixture />);
      cy.get('.fui-MessageBar__bottomReflowSpacer').should('not.exist');
      cy.contains('button', 'Next spacer').realClick();
      cy.get('#supplied-spacer').should('have.text', 'Custom space');
      cy.contains('button', 'Next spacer').realClick();
      cy.get('.fui-MessageBar__bottomReflowSpacer').should('not.exist');
      message().should('have.css', 'white-space', 'normal');
      cy.contains('button', 'Next spacer').realClick();
      cy.get('.fui-MessageBar__bottomReflowSpacer').should('exist').and('not.have.attr', 'data-testid');
      cy.contains('button', 'Next spacer').realClick();
      cy.get('.fui-MessageBar__bottomReflowSpacer').should('not.exist');
    });

    it('forwards root native props/ref through keyed replacement and reports null on removal', () => {
      const ref = cy.spy().as('rootRef');
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        const captureRef = React.useCallback((node: HTMLDivElement | null) => ref(node), []);
        return (
          <>
            <button onClick={() => setStep(value => value + 1)}>Next root</button>
            {step < 2 &&
              createMessage({
                as: 'div',
                key: step,
                ref: captureRef,
                id: 'caller-message',
                className: 'caller-root',
                title: 'Native title',
                'aria-roledescription': 'notification',
                'data-native-prop': 'forwarded',
              })}
          </>
        );
      };
      mount(<Fixture />);
      message()
        .should('have.prop', 'tagName', 'DIV')
        .and('have.class', 'fui-MessageBar')
        .and('have.class', 'caller-root')
        .and('have.attr', 'id', 'caller-message')
        .and('have.attr', 'title', 'Native title')
        .and('have.attr', 'aria-roledescription', 'notification')
        .and('have.attr', 'data-native-prop', 'forwarded')
        .then($initial => {
          const initial = $initial[0];
          cy.get('@rootRef').should(() => expect(ref.lastCall.args[0]).to.equal(initial));
          cy.contains('button', 'Next root').realClick();
          message()
            .should('have.prop', 'tagName', 'DIV')
            .then($current => {
              expect($current[0]).not.to.equal(initial);
              expect(initial.isConnected).to.equal(false);
              expect(ref.getCalls().some(call => call.args[0] === null)).to.equal(true);
              expect(ref.lastCall.args[0]).to.equal($current[0]);
              cy.contains('button', 'Next root').realClick();
              message().should('not.exist');
              cy.get('@rootRef').should(() => expect(ref.lastCall.args).to.deep.equal([null]));
            });
        });
    });

    it('uses latest root native pointer/keyboard handlers and respects their omission without intercepting children', () => {
      const old = cy.spy().as('oldRoot');
      const latest = cy.spy().as('latestRoot');
      const child = cy.spy().as('childAction');
      const key = cy.spy().as('rootKey');
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        const handler = step === 0 ? old : step === 1 ? latest : undefined;
        return (
          <>
            <button onClick={() => setStep(value => value + 1)}>Replace root callbacks</button>
            {createMessage({
              handleAction: child,
              onClick: handler ? event => handler(event.target, event.currentTarget) : undefined,
              onKeyDown: event => key(event.key),
            })}
          </>
        );
      };
      mount(<Fixture />);
      cy.contains('button', 'Retry')
        .realClick()
        .then($button => {
          message().then($root => cy.get('@oldRoot').should('have.been.calledOnceWithExactly', $button[0], $root[0]));
        });
      cy.get('@childAction').should('have.been.calledOnceWithExactly', 'Retry');
      cy.contains('button', 'Replace root callbacks').realClick();
      cy.contains('button', 'Retry').focus();
      cy.realPress('Enter');
      cy.get('@rootKey').should('have.been.calledOnceWithExactly', 'Enter');
      cy.get('@latestRoot').should('have.been.calledOnce');
      cy.get('@oldRoot').should('have.been.calledOnce');
      cy.get('@childAction').should('have.been.calledTwice');
      cy.contains('button', 'Replace root callbacks').realClick();
      cy.contains('button', 'Retry').realClick();
      cy.get('@latestRoot').should('have.been.calledOnce');
      cy.get('@oldRoot').should('have.been.calledOnce');
      cy.get('@childAction').should('have.been.calledThrice');
    });

    it('changes intent designs/glyphs in place and restores the omitted preset', () => {
      const Fixture = () => {
        const [step, setStep] = React.useState(0);
        return (
          <>
            <button onClick={() => setStep(value => value + 1)}>Next intent</button>
            {createMessage({ intent: intents[step], layout: 'singleline' })}
          </>
        );
      };
      mount(<Fixture />);
      message().then($initial => {
        const original = $initial[0];
        let initialGlyph: string;
        const glyphs = new Set<string>();
        for (const intent of intents) {
          cy.get('.fui-MessageBar__icon svg').then($svg => {
            const glyph = $svg[0].innerHTML;
            if (intent === 'info') {
              initialGlyph = glyph;
            }
            expect(glyphs.has(glyph)).to.equal(false);
            glyphs.add(glyph);
          });
          cy.contains('button', 'Next intent').realClick();
          message().should($current => expect($current[0]).to.equal(original));
        }
        cy.get('.fui-MessageBar__icon svg').should($svg => expect($svg[0].innerHTML).to.equal(initialGlyph));
        message().should('have.css', 'white-space', 'nowrap');
      });
    });

    for (const layout of ['singleline', 'multiline'] as const) {
      it(`supports RTL ${layout} action placement and native activation without reversing semantic order`, () => {
        const action = cy.spy().as('rtlAction');
        mountBase(
          <FluentProvider theme={teamsLightTheme} dir="rtl">
            {createMessage({ layout, handleAction: action })}
          </FluentProvider>,
        );
        message().should($root => {
          const bodyRect = $root[0].querySelector('[data-testid="body"]')!.getBoundingClientRect();
          const actionRect = $root[0].querySelector('[data-testid="actions"]')!.getBoundingClientRect();
          const dismissRect = $root[0].querySelector('[aria-label^="Dismiss "]')!.getBoundingClientRect();
          expect($root[0].ownerDocument.defaultView!.getComputedStyle($root[0]).direction).to.equal('rtl');
          if (layout === 'singleline') {
            expect(actionRect.right).to.be.at.most(bodyRect.left);
            expect(dismissRect.right).to.be.at.most(actionRect.left);
          } else {
            expect(actionRect.top).to.be.greaterThan(bodyRect.bottom);
            expect(dismissRect.top).to.be.lessThan(actionRect.top);
          }
        });
        cy.contains('button', 'Retry').focus();
        cy.realPress('Enter');
        cy.get('@rtlAction').should('have.been.calledOnceWithExactly', 'Retry');
        cy.realPress('Tab');
        cy.contains('button', 'Details').should('be.focused');
      });
    }

    for (const activation of ['pointer', 'Enter', 'Space'] as const) {
      it(`supports caller-owned dismissal and explicit focus restoration through ${activation}`, () => {
        const dismiss = cy.spy().as('callerDismiss');
        const Fixture = () => {
          const [visible, setVisible] = React.useState(true);
          const outside = React.useRef<HTMLButtonElement>(null);
          return (
            <>
              <button ref={outside} onClick={() => setVisible(true)}>
                Show again
              </button>
              {visible &&
                createMessage({
                  handleDismiss: () => {
                    dismiss();
                    setVisible(false);
                    outside.current?.focus();
                  },
                })}
            </>
          );
        };
        mount(<Fixture />);
        message().should('be.visible');
        button('Dismiss Descriptive title').focus();
        if (activation === 'pointer') {
          button('Dismiss Descriptive title').realClick();
        } else {
          cy.realPress(activation);
        }
        cy.get('@callerDismiss').should('have.been.calledOnceWithExactly');
        message().should('not.exist');
        cy.contains('button', 'Show again').should('be.focused');
        cy.realPress('Enter');
        message().should('be.visible');
        cy.get('@callerDismiss').should('have.been.calledOnce');
      });
    }

    describe('unit-derived browser contracts', () => {
      it('renders direct children from the default snapshot without leaking component-only props to the DOM', () => {
        const announce = cy.spy().as('directAnnouncement');
        mount(
          <AnnounceProvider value={{ announce }}>
            <MessageBar data-testid="message">Default MessageBar</MessageBar>
          </AnnounceProvider>,
        );
        message()
          .should('have.text', 'Default MessageBar')
          .and('have.attr', 'role', 'group')
          .and('have.css', 'white-space', 'nowrap')
          .and('have.css', 'border-radius', teamsLightTheme.borderRadiusMedium)
          .and($root => {
            for (const prop of ['intent', 'layout', 'shape', 'politeness', 'icon', 'bottomReflowSpacer']) {
              expect($root[0].hasAttribute(prop), prop).to.equal(false);
            }
          });
        cy.get('.fui-MessageBar__icon svg').should('have.attr', 'aria-hidden', 'true');
        cy.get('.fui-MessageBar__bottomReflowSpacer').should('not.exist');
        cy.get('@directAnnouncement').should(() => {
          expect(announce.callCount).to.be.greaterThan(0);
          announce.getCalls().forEach(call => expect(call.args).to.deep.equal(['', { polite: true, alert: false }]));
        });
      });

      it('renders the hook custom state combination and distinguishes empty icon children from an absent slot', () => {
        const Fixture = () => {
          const [step, setStep] = React.useState(0);
          return (
            <>
              <button onClick={() => setStep(value => value + 1)}>Next empty icon</button>
              {createMessage({
                intent: 'error',
                layout: 'multiline',
                shape: 'square',
                icon: step === 0 ? { children: null } : step === 1 ? null : undefined,
              })}
            </>
          );
        };
        mount(<Fixture />);
        assertLayout('multiline');
        message().should('have.css', 'border-radius', '0px');
        cy.get('.fui-MessageBar__icon').should('exist').and('have.text', '').find('svg').should('not.exist');
        cy.contains('button', 'Next empty icon').realClick();
        cy.get('.fui-MessageBar__icon').should('not.exist');
        cy.contains('button', 'Next empty icon').realClick();
        cy.get('.fui-MessageBar__icon svg').should('have.length', 1);
        assertLayout('multiline');
        cy.contains('button', 'Retry').realClick().should('be.focused');
      });

      for (const content of ['body-only', 'actions-only', 'empty'] as const) {
        it(`announces ${content} composition without spurious separators or container-action text`, () => {
          const announce = cy.spy().as('partialAnnouncement');
          mount(
            <AnnounceProvider value={{ announce }}>
              <MessageBar data-testid="message" layout="singleline">
                {content === 'body-only' && <MessageBarBody>Only body</MessageBarBody>}
                {content === 'actions-only' && (
                  <MessageBarActions containerAction={<button>Container action</button>}>
                    <button>Action 1</button>
                    <button>Action 2</button>
                  </MessageBarActions>
                )}
              </MessageBar>
            </AnnounceProvider>,
          );
          const expected = content === 'body-only' ? 'Only body' : content === 'actions-only' ? 'Action 1Action 2' : '';
          cy.get('@partialAnnouncement').should(() => {
            expect(announce.callCount).to.be.greaterThan(0);
            announce
              .getCalls()
              .forEach(call => expect(call.args).to.deep.equal([expected, { polite: true, alert: false }]));
          });
          message().should('be.visible');
          if (content === 'actions-only') {
            cy.contains('button', 'Action 1').focus();
            cy.realPress('Tab');
            cy.contains('button', 'Action 2').should('be.focused');
            cy.realPress('Tab');
            cy.contains('button', 'Container action').should('be.focused');
          }
        });
      }

      it('gives root/icon caller Griffel overrides precedence over custom intent and shape styles', () => {
        const Fixture = () => {
          const classes = useCallerOverrideStyles();
          return (
            <>
              <span
                data-testid="override-probe"
                style={{ backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1 }}
              />
              {createMessage({
                intent: 'error',
                shape: 'square',
                className: mergeClasses(classes.root, 'unit-root'),
                icon: { className: mergeClasses(classes.icon, 'unit-icon') },
              })}
            </>
          );
        };
        mount(<Fixture />);
        cy.get('[data-testid="override-probe"]').then($probe => {
          const style = $probe[0].ownerDocument.defaultView!.getComputedStyle($probe[0]);
          message()
            .should('have.class', 'fui-MessageBar')
            .and('have.class', 'unit-root')
            .and('have.css', 'background-color', style.backgroundColor)
            .and('have.css', 'border-radius', teamsLightTheme.borderRadiusLarge);
          cy.get('.unit-icon').should('have.class', 'fui-MessageBar__icon').and('have.css', 'color', style.color);
        });
        cy.contains('button', 'Retry').realClick().should('be.focused');
      });

      it('restores auto layout exactly at the cached singleline overflow width, not one pixel below', () => {
        const Fixture = () => {
          const [width, setWidth] = React.useState(1000);
          const threshold = React.useRef(0);
          const root = React.useRef<HTMLDivElement>(null);
          useIsomorphicLayoutEffect(() => {
            if (width === 300) {
              threshold.current = root.current!.scrollWidth;
            }
          }, [width]);
          return (
            <>
              <button onMouseDown={event => event.preventDefault()} onClick={() => setWidth(300)}>
                Measure narrow overflow
              </button>
              <button onMouseDown={event => event.preventDefault()} onClick={() => setWidth(threshold.current - 1)}>
                Grow below threshold
              </button>
              <button onMouseDown={event => event.preventDefault()} onClick={() => setWidth(threshold.current)}>
                Grow to threshold
              </button>
              <div data-testid="boundary-frame" style={{ width }}>
                {createMessage({ ref: root })}
              </div>
            </>
          );
        };
        mount(<Fixture />);
        assertLayout('singleline');
        cy.contains('button', 'Retry').realClick().should('be.focused');
        cy.contains('button', 'Measure narrow overflow').realClick();
        assertLayout('multiline');
        cy.contains('button', 'Grow below threshold').realClick();
        assertLayout('multiline');
        message().then($below => {
          const belowWidth = $below[0].getBoundingClientRect().width;
          expect(belowWidth).to.be.greaterThan(300);
          cy.contains('button', 'Grow to threshold').realClick();
          message().should($at => expect($at[0].getBoundingClientRect().width).to.equal(belowWidth + 1));
          assertLayout('singleline');
          cy.contains('button', 'Retry').should('be.focused');
        });
      });

      it('does not flicker during successive narrow resizes and restores singleline across repeated resize cycles', () => {
        const widths = [1000, 300, 280, 360, 320, 1000, 300, 1000];
        const Fixture = () => {
          const [step, setStep] = React.useState(0);
          return (
            <>
              <button onMouseDown={event => event.preventDefault()} onClick={() => setStep(value => value + 1)}>
                Advance unit resize
              </button>
              <div data-testid="unit-frame" style={{ width: widths[step] }}>
                {createMessage()}
              </div>
            </>
          );
        };
        mount(<Fixture />);
        assertLayout('singleline');
        cy.contains('button', 'Retry')
          .realClick()
          .should('be.focused')
          .then($initial => {
            const originalAction = $initial[0];
            let originalSpacer: Element;
            for (let step = 1; step < widths.length; step++) {
              cy.contains('button', 'Advance unit resize').realClick();
              cy.get('[data-testid="unit-frame"]').should('have.css', 'width', `${widths[step]}px`);
              assertLayout(widths[step] === 1000 ? 'singleline' : 'multiline');
              cy.contains('button', 'Retry')
                .should('be.focused')
                .and($current => expect($current[0]).to.equal(originalAction));
              if (step === 1) {
                cy.get('.fui-MessageBar__bottomReflowSpacer').then($spacer => {
                  originalSpacer = $spacer[0];
                });
              } else if (step < 5) {
                cy.get('.fui-MessageBar__bottomReflowSpacer').should($spacer =>
                  expect($spacer[0], 'spacer is not removed/recreated while remaining narrow').to.equal(originalSpacer),
                );
              }
            }
          });
      });
    });

    it('respects actual reduced-motion entry/exit durations in the documented group recipe', () => {
      let animate: ReturnType<typeof cy.spy>;
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
        }),
      );
      cy.window().then(view => {
        expect(view.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true);
        animate = cy.spy(view.Element.prototype, 'animate').as('reducedMotion');
      });
      const Fixture = () => {
        const [visible, setVisible] = React.useState(false);
        return (
          <>
            <button onClick={() => setVisible(value => !value)}>Toggle reduced-motion message</button>
            <MessageBarGroup animate="both">{visible ? [createMessage({ key: 'motion' })] : []}</MessageBarGroup>
          </>
        );
      };
      mount(<Fixture />);
      message().should('not.exist');
      cy.contains('button', 'Toggle reduced-motion message').realClick();
      message()
        .should('be.visible')
        .then($root => {
          const original = $root[0];
          cy.get('@reducedMotion').should(() => {
            const calls = animate.getCalls().filter(call => call.thisValue === original);
            expect(calls.length).to.be.at.least(2);
            const effects = calls.map(call => (call.returnValue as Animation).effect as KeyframeEffect);
            expect(new Set(effects.map(effect => JSON.stringify(effect.getKeyframes()))).size).to.equal(2);
            expect(effects.every(effect => effect.target === original && effect.getTiming().duration === 1)).to.equal(
              true,
            );
            expect(effects.some(effect => effect.getKeyframes().some(frame => frame.opacity === '0'))).to.equal(true);
            expect(
              effects.some(effect => effect.getKeyframes().some(frame => String(frame.translate).includes('-100%'))),
            ).to.equal(true);
          });
          cy.then(() => animate.resetHistory());
          cy.contains('button', 'Toggle reduced-motion message').realClick();
          message().should('not.exist');
          cy.get('@reducedMotion').should(() => {
            const calls = animate.getCalls().filter(call => call.thisValue === original);
            expect(calls).to.have.length(1);
            expect((calls[0].returnValue as Animation).effect!.getTiming().duration).to.equal(1);
          });
        });
    });

    for (const animate of ['exit-only', 'both'] as const) {
      it(`supports documented ${animate} group add/dismiss/clear with actual native motion and retained siblings`, () => {
        let motionSpy: ReturnType<typeof cy.spy>;
        cy.window().then(view => {
          motionSpy = cy.spy(view.Element.prototype, 'animate').as('motion');
        });
        const Fixture = () => {
          const [messages, setMessages] = React.useState<{ id: number; intent: MessageBarIntent }[]>([]);
          const counter = React.useRef(0);
          return (
            <>
              <button
                onClick={() => {
                  const id = ++counter.current;
                  setMessages(value => [...value, { id, intent: intents[(id - 1) % intents.length] }]);
                }}
              >
                Add message
              </button>
              <button onClick={() => setMessages([])}>Clear messages</button>
              <MessageBarGroup
                animate={animate}
                style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}
              >
                {messages.map(({ id, intent }) =>
                  createMessage({
                    key: id,
                    titleText: `Message ${id}`,
                    intent,
                    handleDismiss: () => setMessages(value => value.filter(entry => entry.id !== id)),
                  }),
                )}
              </MessageBarGroup>
            </>
          );
        };
        mount(<Fixture />);
        message().should('not.exist');
        cy.contains('button', 'Add message').realClick();
        cy.contains('[data-testid="message"]', 'Message 1')
          .should('be.visible')
          .then($first => {
            const first = $first[0];
            cy.get('@motion').should(() => {
              const entryCalls = motionSpy.getCalls().filter(call => call.thisValue === first);
              expect(entryCalls.length).to.satisfy((count: number) => (animate === 'both' ? count >= 2 : count === 0));
              if (animate === 'both') {
                const effects = entryCalls.map(call => (call.returnValue as Animation).effect as KeyframeEffect);
                expect(effects.every(effect => effect.target === first)).to.equal(true);
                effects.forEach(effect => expect(effect.getTiming().duration).to.equal(motionTokens.durationGentle));
                expect(new Set(effects.map(effect => JSON.stringify(effect.getKeyframes()))).size).to.equal(2);
                expect(effects.some(effect => effect.getKeyframes().some(frame => frame.opacity === '0'))).to.equal(
                  true,
                );
                expect(
                  effects.some(effect =>
                    effect.getKeyframes().some(frame => String(frame.translate).includes('-100%')),
                  ),
                ).to.equal(true);
              }
            });
            cy.contains('[data-testid="message"]', 'Message 1').should($settled => {
              expect($settled[0].getAnimations().some(animation => animation.playState === 'running')).to.equal(false);
            });
            cy.contains('button', 'Add message').realClick();
            message().should('have.length', 2);
            message().should($messages => {
              $messages.each((_, element) => {
                expect(element.getAnimations().some(animation => animation.playState === 'running')).to.equal(false);
              });
            });
            cy.contains('[data-testid="message"]', 'Message 2').should('be.visible');
            cy.then(() => motionSpy.resetHistory());
            button('Dismiss Message 1').realClick();
            cy.get('@motion').should(() => {
              const exits = motionSpy.getCalls().filter(call => call.thisValue === first);
              expect(exits).to.have.length(1);
              const exit = exits[0];
              const effect = (exit.returnValue as Animation).effect as KeyframeEffect;
              expect(effect.target).to.equal(first);
              expect(effect.getTiming().duration).to.equal(motionTokens.durationGentle);
              expect(effect.getKeyframes().map(frame => frame.opacity)).to.deep.equal(['1', '0']);
            });
            cy.contains('[data-testid="message"]', 'Message 1').should('not.exist');
            cy.contains('[data-testid="message"]', 'Message 2').should('be.visible');
            cy.contains('button', 'Clear messages').realClick();
            message().should('not.exist');
            cy.then(() => expect(first.isConnected).to.equal(false));
          });
      });
    }
  });
});
