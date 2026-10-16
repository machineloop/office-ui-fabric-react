import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, teamsDarkTheme } from '@fluentui/react-theme';
import { Button, ButtonContextProvider } from '@fluentui/react-button';
import { DismissRegular } from '@fluentui/react-icons';
import { getByRole } from '@testing-library/dom';
import { AnnounceProvider } from '@fluentui/react-shared-contexts';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';
import { MessageBar } from '../MessageBar/MessageBar';
import { MessageBarBody } from '../MessageBarBody/MessageBarBody';
import { MessageBarTitle } from '../MessageBarTitle/MessageBarTitle';
import { MessageBarContextProvider } from '../../contexts/messageBarContext';
import { MessageBarActions } from './MessageBarActions';
import type { MessageBarActionsProps, MessageBarActionsState } from './MessageBarActions.types';
import { messageBarActionsClassNames } from './useMessageBarActionsStyles.styles';
import { useActionOverrides } from './MessageBarActions.cy.styles';

const actions = '[data-testid="actions"]';
const container = `.${messageBarActionsClassNames.containerAction}`;
const message = '[data-testid="message"]';
const wrap = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', theme = teamsLightTheme) => (
  <FluentProvider theme={theme} dir={dir}>
    {element}
  </FluentProvider>
);
const mount = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr') => mountBase(wrap(element, dir));

const Message = ({ layout = 'singleline' }: { layout?: 'singleline' | 'multiline' | 'auto' }) => {
  return (
    <MessageBar data-testid="message" layout={layout}>
      <MessageBarBody data-testid="body">
        <MessageBarTitle>Service notice</MessageBarTitle> Changes are ready for review.
      </MessageBarBody>
      <MessageBarActions
        data-testid="actions"
        containerAction={<Button aria-label="Dismiss notice" appearance="transparent" icon={<DismissRegular />} />}
      >
        <Button data-testid="review">Review</Button>
        <Button data-testid="details">Details</Button>
      </MessageBarActions>
    </MessageBar>
  );
};

function assertPlacement(layout: 'singleline' | 'multiline', dir: 'ltr' | 'rtl' = 'ltr') {
  cy.get(message).should($message => {
    const root = $message[0];
    const action = root.querySelector<HTMLElement>(actions)!;
    const dismiss = root.querySelector<HTMLElement>(container)!;
    const body = root.querySelector<HTMLElement>('[data-testid="body"]')!;
    const view = root.ownerDocument.defaultView!;
    const a = action.getBoundingClientRect();
    const d = dismiss.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    expect(action.parentElement, 'fragment root is a direct grid child').to.equal(root);
    expect(dismiss.parentElement, 'container is a sibling, not an action descendant').to.equal(root);
    expect(view.getComputedStyle(action).gridArea).to.equal('secondaryActions');
    expect(view.getComputedStyle(dismiss).gridArea).to.equal('actions');
    expect(a.width).to.be.greaterThan(0);
    expect(d.width).to.be.greaterThan(0);
    expect(a.height).to.be.greaterThan(0);
    const order = Array.from(root.children);
    if (layout === 'singleline') {
      expect(order.indexOf(action)).to.be.lessThan(order.indexOf(dismiss));
      expect(a.top + a.height / 2).to.be.closeTo(b.top + b.height / 2, 1);
      if (dir === 'ltr') {
        expect(a.left).to.be.at.least(b.right);
        expect(d.left).to.be.at.least(a.right);
      } else {
        expect(a.right).to.be.at.most(b.left);
        expect(d.right).to.be.at.most(a.left);
      }
    } else {
      expect(order.indexOf(dismiss)).to.be.lessThan(order.indexOf(action));
      expect(a.top).to.be.greaterThan(b.bottom);
      expect(d.top).to.be.lessThan(a.top);
      expect(view.getComputedStyle(action).justifyContent).to.equal('end');
      expect(view.getComputedStyle(action).marginTop).to.equal(teamsLightTheme.spacingVerticalMNudge);
      expect(view.getComputedStyle(action).marginBottom).to.equal(teamsLightTheme.spacingVerticalS);
      const last = action.lastElementChild!.getBoundingClientRect();
      if (dir === 'ltr') {
        expect(a.right - last.right).to.be.closeTo(parseFloat(teamsLightTheme.spacingVerticalM), 1);
      } else {
        expect(last.left - a.left).to.be.closeTo(parseFloat(teamsLightTheme.spacingVerticalM), 1);
      }
    }
  });
}

describe('MessageBarActions edges and accessibility', () => {
  beforeEach(() => cy.viewport(1400, 800));

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const layout of ['singleline', 'multiline'] as const) {
      it(`uses actual forward and reverse Tab order in ${layout}/${dir} without wrapper tab stops`, () => {
        mount(
          <>
            <button data-testid="before">Before</button>
            <Message layout={layout} />
            <button data-testid="after">After</button>
          </>,
          dir,
        );
        cy.get(message).should($message => {
          expect(getByRole($message[0].parentElement!, 'group', { name: 'Service notice' })).to.equal($message[0]);
          expect(getByRole($message[0], 'button', { name: 'Review' })).to.equal(
            $message[0].querySelector('[data-testid="review"]'),
          );
          expect(getByRole($message[0], 'button', { name: 'Details' })).to.equal(
            $message[0].querySelector('[data-testid="details"]'),
          );
          expect(getByRole($message[0], 'button', { name: 'Dismiss notice' }).querySelector('svg')).not.to.equal(null);
          for (const slot of [actions, container]) {
            expect($message[0].querySelector(slot)!.hasAttribute('tabindex')).to.equal(false);
          }
        });
        const order =
          layout === 'singleline'
            ? ['[data-testid="review"]', '[data-testid="details"]', '[aria-label="Dismiss notice"]']
            : ['[aria-label="Dismiss notice"]', '[data-testid="review"]', '[data-testid="details"]'];
        cy.get('[data-testid="before"]').focus();
        for (const selector of [...order, '[data-testid="after"]']) {
          cy.realPress('Tab');
          cy.get(selector).should('be.focused');
        }
        for (const selector of [...order].reverse().concat('[data-testid="before"]')) {
          cy.realPress(['Shift', 'Tab']);
          cy.get(selector).should('be.focused');
        }
      });
    }
  }

  it('lets the child buttons handle real Enter/Space activation without altering either slot', () => {
    const review = cy.stub().as('keyboardReview');
    const dismiss = cy.stub().as('keyboardDismiss');
    mount(
      <MessageBarActions
        data-testid="actions"
        containerAction={<Button aria-label="Dismiss notice" onClick={dismiss} />}
      >
        <Button data-testid="review" onClick={review}>
          Review
        </Button>
      </MessageBarActions>,
    );
    cy.get('[data-testid="review"]').focus();
    cy.realPress('Enter');
    cy.get('@keyboardReview').should('have.been.calledOnce');
    cy.realPress('Space');
    cy.get('@keyboardReview').should('have.been.calledTwice');
    cy.realPress('Tab');
    cy.get('[aria-label="Dismiss notice"]').should('be.focused');
    cy.realPress('Enter');
    cy.realPress('Space');
    cy.get('@keyboardDismiss').should('have.been.calledTwice');
    cy.get(actions).should('be.visible');
    cy.get(container).should('be.visible');
  });

  it('preserves native disabled buttons and named links in descendant tab order', () => {
    const disabled = cy.stub().as('disabledAction');
    mount(
      <>
        <button data-testid="before">Before</button>
        <MessageBarActions data-testid="actions" containerAction={<Button aria-label="Dismiss notice" />}>
          <Button disabled onClick={disabled}>
            Unavailable
          </Button>
          <a href="#action-help" data-testid="help">
            Action help
          </a>
          <button data-testid="native">Native action</button>
        </MessageBarActions>
        <button data-testid="after">After</button>
      </>,
    );
    cy.get(actions).should($actions => {
      expect(getByRole($actions[0], 'button', { name: 'Unavailable' }).hasAttribute('disabled')).to.equal(true);
      expect(getByRole($actions[0], 'link', { name: 'Action help' }).getAttribute('href')).to.equal('#action-help');
    });
    cy.get('[data-testid="before"]').focus();
    for (const selector of [
      '[data-testid="help"]',
      '[data-testid="native"]',
      '[aria-label="Dismiss notice"]',
      '[data-testid="after"]',
    ]) {
      cy.realPress('Tab');
      cy.get(selector).should('be.focused');
    }
    cy.get('@disabledAction').should('not.have.been.called');
  });

  for (const selector of ['[data-testid="review"]', '[aria-label="Dismiss notice"]']) {
    it(`preserves the focused ${
      selector.includes('review') ? 'secondary' : 'container'
    } button DOM node through real reflow`, () => {
      mount(<ResizeFixture direction="column" />);
      assertPlacement('singleline');
      let original: HTMLElement;
      cy.get(selector)
        .focus()
        .then($button => {
          original = $button[0];
        });
      cy.get('[data-testid="host"]').invoke('css', 'width', '360px');
      assertPlacement('multiline');
      cy.get(selector)
        .should('be.focused')
        .should($button => expect($button[0]).to.equal(original));
      cy.get('[data-testid="host"]').invoke('css', 'width', '1100px');
      assertPlacement('singleline');
      cy.get(selector)
        .should('be.focused')
        .should($button => expect($button[0]).to.equal(original));
    });
  }

  it('forwards native root and container attributes and explicit semantics independently', () => {
    mount(
      <>
        <span id="actions-label">Available actions</span>
        <span id="actions-description">Choose one option</span>
        <MessageBarActions
          data-testid="actions"
          id="native-actions"
          title="Actions tooltip"
          role="group"
          aria-labelledby="actions-label"
          aria-describedby="actions-description"
          lang="fr"
          data-consumer="root"
          containerAction={{
            id: 'native-container',
            role: 'group',
            'aria-label': 'Dismiss controls',
            title: 'Dismiss tooltip',
            children: <Button aria-label="Dismiss notice" />,
          }}
        >
          <Button>Review</Button>
        </MessageBarActions>
      </>,
    );
    cy.get('[data-cy-root]').should($root => {
      const group = getByRole($root[0], 'group', { name: 'Available actions' });
      expect(group.id).to.equal('native-actions');
      expect(group.getAttribute('aria-describedby')).to.equal('actions-description');
      expect(group.ownerDocument.getElementById('actions-description')?.textContent).to.equal('Choose one option');
      expect(group.getAttribute('title')).to.equal('Actions tooltip');
      expect(group.getAttribute('lang')).to.equal('fr');
      expect(group.getAttribute('data-consumer')).to.equal('root');
      const dismiss = getByRole($root[0], 'group', { name: 'Dismiss controls' });
      expect(dismiss.id).to.equal('native-container');
      expect(dismiss.getAttribute('title')).to.equal('Dismiss tooltip');
      expect(getByRole(dismiss, 'button', { name: 'Dismiss notice' })).to.exist;
    });
    cy.get(actions).should('not.have.attr', 'containerAction');
  });

  it('does not infer a child button name from the container label; consumer naming remains explicit', () => {
    mount(
      <>
        <span id="dismiss-label">Close service notice</span>
        <MessageBarActions
          data-testid="actions"
          containerAction={{
            'aria-label': 'Container label',
            children: <Button aria-labelledby="dismiss-label" icon={<DismissRegular />} />,
          }}
        >
          <Button aria-label="Inspect changes">Review</Button>
        </MessageBarActions>
      </>,
    );
    cy.get('[data-cy-root]').should($root => {
      expect(getByRole($root[0], 'button', { name: 'Close service notice' }).getAttribute('aria-labelledby')).to.equal(
        'dismiss-label',
      );
      expect(getByRole($root[0], 'button', { name: 'Inspect changes' }).textContent).to.equal('Review');
      expect($root[0].querySelector(container)?.getAttribute('aria-label')).to.equal('Container label');
    });
  });

  it('keeps native click bubbling within its sibling slot and uses the latest handler', () => {
    const first = cy.stub().as('firstRootClick');
    const latest = cy.stub().as('latestRootClick');
    const slotClick = cy.stub().as('slotClick');
    const render = (click?: (target: EventTarget, currentTarget: EventTarget) => void) => (
      <MessageBarActions
        data-testid="actions"
        onClick={click ? event => click(event.target, event.currentTarget) : undefined}
        containerAction={{
          onClick: event => slotClick(event.target, event.currentTarget),
          children: <button data-testid="dismiss">Dismiss</button>,
        }}
      >
        <button data-testid="review">Review</button>
      </MessageBarActions>
    );
    mount(render(first)).then(({ rerender }) => {
      cy.get('[data-testid="review"]').realClick();
      cy.get(actions).then($actions => {
        expect(first.firstCall.args).to.deep.equal([$actions[0].firstElementChild, $actions[0]]);
      });
      cy.get('[data-testid="dismiss"]').realClick();
      cy.get(container).then($container => {
        expect(slotClick.firstCall.args).to.deep.equal([$container[0].firstElementChild, $container[0]]);
      });
      cy.get('@firstRootClick').should('have.been.calledOnce');
      cy.then(() => rerender(wrap(render(latest))));
      cy.get('[data-testid="review"]').realClick();
      cy.get('@latestRootClick').should('have.been.calledOnce');
      cy.get('@firstRootClick').should('have.been.calledOnce');
      cy.then(() => rerender(wrap(render())));
      cy.get('[data-testid="review"]').realClick();
      cy.get('@latestRootClick').should('have.been.calledOnce');
    });
  });

  it('forwards focus/blur/key events when the consumer makes the root a tab stop', () => {
    const focus = cy.stub().as('rootFocus');
    const blur = cy.stub().as('rootBlur');
    const key = cy.stub().as('rootKey');
    mount(
      <>
        <button data-testid="before">Before</button>
        <MessageBarActions
          data-testid="actions"
          tabIndex={0}
          onFocus={event => focus(event.target, event.currentTarget)}
          onBlur={event => blur(event.target, event.currentTarget)}
          onKeyDown={event => {
            key(event.key, event.currentTarget);
            if (event.key === 'Enter') {
              event.preventDefault();
            }
          }}
        >
          Focusable actions
        </MessageBarActions>
        <button data-testid="after">After</button>
      </>,
    );
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(actions)
      .should('be.focused')
      .then($actions => {
        expect(focus.firstCall.args).to.deep.equal([$actions[0], $actions[0]]);
      });
    cy.realPress('Enter');
    cy.get(actions).then($actions => expect(key.firstCall.args).to.deep.equal(['Enter', $actions[0]]));
    cy.realPress('Tab');
    cy.get('[data-testid="after"]').should('be.focused');
    cy.get(actions).then($actions => expect(blur.firstCall.args).to.deep.equal([$actions[0], $actions[0]]));
  });

  it('updates token spacing and Button colors with live light/custom/dark provider themes', () => {
    const custom = {
      ...teamsLightTheme,
      spacingHorizontalM: teamsLightTheme.spacingHorizontalXXL,
      spacingVerticalM: teamsLightTheme.spacingVerticalXS,
      spacingVerticalMNudge: teamsLightTheme.spacingVerticalL,
      spacingVerticalS: teamsLightTheme.spacingVerticalXXL,
    };
    const themed = (theme: typeof teamsLightTheme) =>
      wrap(
        <>
          <span
            data-testid="color-probe"
            style={{ color: theme.colorNeutralForeground1, backgroundColor: theme.colorNeutralBackground1 }}
          />
          <Message layout="multiline" />
        </>,
        'ltr',
        theme,
      );
    mountBase(themed(teamsLightTheme)).then(({ rerender }) => {
      for (const theme of [teamsLightTheme, custom, teamsDarkTheme]) {
        cy.then(() => rerender(themed(theme)));
        cy.get(actions)
          .should('have.css', 'column-gap', theme.spacingHorizontalM)
          .and('have.css', 'padding-right', theme.spacingVerticalM)
          .and('have.css', 'margin-top', theme.spacingVerticalMNudge)
          .and('have.css', 'margin-bottom', theme.spacingVerticalS);
        cy.get(container).should('have.css', 'padding-right', theme.spacingHorizontalM);
        cy.get('[data-testid="color-probe"]').then($probe => {
          const css = $probe[0].ownerDocument.defaultView!.getComputedStyle($probe[0]);
          cy.get('[data-testid="review"]')
            .should('have.css', 'color', css.color)
            .and('have.css', 'background-color', css.backgroundColor);
        });
      }
    });
  });

  it('updates directional padding and geometry without changing DOM order on live direction changes', () => {
    mount(<Message layout="multiline" />).then(({ rerender }) => {
      assertPlacement('multiline', 'ltr');
      cy.then(() => rerender(wrap(<Message layout="multiline" />, 'rtl')));
      assertPlacement('multiline', 'rtl');
      cy.get(actions)
        .should('have.css', 'padding-left', teamsLightTheme.spacingVerticalM)
        .and('have.css', 'padding-right', '0px');
      cy.get(container)
        .should('have.css', 'padding-left', teamsLightTheme.spacingHorizontalM)
        .and('have.css', 'padding-right', '0px');
      cy.then(() => rerender(wrap(<Message layout="singleline" />, 'ltr')));
      assertPlacement('singleline', 'ltr');
      cy.get(actions)
        .should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM)
        .and('have.css', 'padding-left', '0px');
    });
  });

  it('lets caller Griffel classes override root/container styling and restores defaults on removal', () => {
    const Styled = ({ override }: { override: boolean }) => {
      const classes = useActionOverrides();
      return (
        <MessageBarActions
          data-testid="actions"
          className={override ? classes.root : undefined}
          containerAction={{ className: override ? classes.container : undefined, children: <Button>Dismiss</Button> }}
        >
          <Button>Review</Button>
          <Button>Details</Button>
        </MessageBarActions>
      );
    };
    mount(<Styled override />).then(({ rerender }) => {
      cy.get(actions)
        .should('have.class', messageBarActionsClassNames.root)
        .and('have.css', 'column-gap', teamsLightTheme.spacingHorizontalXXL)
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalXXL);
      cy.get(container)
        .should('have.class', messageBarActionsClassNames.containerAction)
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalL);
      cy.then(() => rerender(wrap(<Styled override={false} />)));
      cy.get(actions)
        .should('have.css', 'column-gap', teamsLightTheme.spacingHorizontalM)
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM);
      cy.get(container).should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM);
    });
  });

  it('adds/replaces/removes the container slot and its latest callback without disturbing secondary actions', () => {
    const first = cy.stub().as('firstDismiss');
    const latest = cy.stub().as('latestDismiss');
    const render = (slot?: MessageBarActionsProps['containerAction']) => (
      <MessageBarActions data-testid="actions" containerAction={slot}>
        <Button>Review</Button>
      </MessageBarActions>
    );
    mount(render()).then(({ rerender }) => {
      let root: HTMLElement;
      cy.get(actions).then($actions => {
        root = $actions[0];
      });
      cy.get(container).should('not.exist');
      cy.then(() => rerender(wrap(render(<Button aria-label="First dismiss" onClick={first} />))));
      cy.get('[aria-label="First dismiss"]').realClick();
      cy.get('@firstDismiss').should('have.been.calledOnce');
      cy.then(() =>
        rerender(
          wrap(
            render({
              children: <Button aria-label="Latest dismiss" onClick={latest} />,
              className: 'latest-container',
            }),
          ),
        ),
      );
      cy.get('[aria-label="First dismiss"]').should('not.exist');
      cy.get(container).should('have.class', 'latest-container');
      cy.get('[aria-label="Latest dismiss"]').realClick();
      cy.get('@latestDismiss').should('have.been.calledOnce');
      cy.get('@firstDismiss').should('have.been.calledOnce');
      cy.then(() => rerender(wrap(render(null))));
      cy.get(container).should('not.exist');
      cy.get(actions)
        .should('have.text', 'Review')
        .should($actions => expect($actions[0]).to.equal(root));
    });
  });
});

const ResizeFixture = ({ direction }: { direction: 'row' | 'column' }) => {
  const [width, setWidth] = React.useState(1100);
  return (
    <>
      <button onClick={() => setWidth(360)} data-testid="narrow">
        Narrow
      </button>
      <button onClick={() => setWidth(1100)} data-testid="wide">
        Wide
      </button>
      <div data-testid="host" style={{ display: 'flex', flexDirection: direction, width }}>
        <div style={{ width: '100%', minWidth: 0 }}>
          <Message layout="auto" />
        </div>
      </div>
    </>
  );
};

describe('MessageBarActions documented scenarios', () => {
  beforeEach(() => cy.viewport(1400, 800));

  it('renders the default standalone div and literal children without creating a container action', () => {
    mount(<MessageBarActions data-testid="actions">Default MessageBarActions</MessageBarActions>);
    cy.get(actions).should('have.prop', 'tagName', 'DIV');
    cy.get(actions)
      .should('have.text', 'Default MessageBarActions')
      .and('have.class', messageBarActionsClassNames.root)
      .and('have.css', 'display', 'flex');
    cy.get(actions).should($actions => {
      expect($actions[0].hasAttribute('role')).to.equal(false);
      expect($actions[0].hasAttribute('tabindex')).to.equal(false);
    });
    cy.get(container).should('not.exist');
  });

  it('supports secondary actions without a dismiss control and supplies small Button defaults', () => {
    mount(
      <>
        <MessageBarActions data-testid="actions">
          <Button>Review</Button>
          <Button>Details</Button>
        </MessageBarActions>
        <Button data-testid="outside">Outside</Button>
      </>,
    );
    cy.get(actions)
      .find('button')
      .should('have.length', 2)
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    cy.get('[data-testid="outside"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    cy.get(container).should('not.exist');
  });

  for (const layout of ['singleline', 'multiline'] as const) {
    it(`renders a container-only dismiss button in ${layout} while hiding the empty secondary root`, () => {
      mount(
        <MessageBar layout={layout} data-testid="message">
          <MessageBarBody>Notice</MessageBarBody>
          <MessageBarActions
            data-testid="actions"
            containerAction={<Button aria-label="Dismiss notice" icon={<DismissRegular />} />}
          />
        </MessageBar>,
      );
      cy.get(actions).should('exist').and('have.css', 'display', 'none').and('be.empty');
      cy.get(container).should('be.visible').and('have.prop', 'tagName', 'DIV');
      cy.get(message).should($message => {
        const dismiss = getByRole($message[0], 'button', { name: 'Dismiss notice' });
        expect(dismiss.parentElement).to.equal($message[0].querySelector(container));
        expect(dismiss.parentElement?.parentElement).to.equal($message[0]);
      });
      cy.get(container).find('button').should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    });
  }

  for (const value of [undefined, null]) {
    it(`does not render an optional container when it is ${String(value)}`, () => {
      mount(
        <MessageBarActions data-testid="actions" containerAction={value}>
          <Button>Review</Button>
        </MessageBarActions>,
      );
      cy.get(actions).should('be.visible').find('button').should('have.text', 'Review');
      cy.get(container).should('not.exist');
    });
  }

  it('accepts object container slot props without routing them onto the secondary root', () => {
    mount(
      <MessageBarActions
        data-testid="actions"
        containerAction={{
          id: 'dismiss-container',
          'aria-label': 'Container controls',
          className: 'consumer-container',
          children: <Button aria-label="Dismiss notice" icon={<DismissRegular />} />,
        }}
      >
        <Button>Review</Button>
      </MessageBarActions>,
    );
    cy.get(container)
      .should('have.id', 'dismiss-container')
      .and('have.attr', 'aria-label', 'Container controls')
      .and('have.class', 'consumer-container');
    cy.get(actions).should($actions => {
      expect($actions[0].hasAttribute('id')).to.equal(false);
      expect($actions[0].hasAttribute('aria-label')).to.equal(false);
    });
    cy.get(actions).find('button').should('have.length', 1);
    cy.get(actions).find('[aria-label="Dismiss notice"]').should('not.exist');
  });

  it('scopes small Button defaults to both slots and preserves explicit size overrides', () => {
    mount(
      <ButtonContextProvider value={{ size: 'large' }}>
        <MessageBarActions
          data-testid="actions"
          containerAction={
            <>
              <Button data-testid="dismiss-default">Dismiss</Button>
              <Button data-testid="dismiss-large" size="large">
                Large dismiss
              </Button>
            </>
          }
        >
          <Button data-testid="action-default">Review</Button>
          <Button data-testid="action-medium" size="medium">
            Medium action
          </Button>
        </MessageBarActions>
        <Button data-testid="outside">Outside</Button>
      </ButtonContextProvider>,
    );
    for (const id of ['action-default', 'dismiss-default']) {
      cy.get(`[data-testid="${id}"]`).should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    }
    cy.get('[data-testid="action-medium"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
    cy.get('[data-testid="dismiss-large"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    cy.get('[data-testid="outside"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const layout of ['singleline', 'multiline'] as const) {
      it(`places both slots in the ${layout} parent grid in ${dir}`, () => {
        mount(<Message layout={layout} />, dir);
        assertPlacement(layout, dir);
        cy.get(actions)
          .should('have.css', 'column-gap', teamsLightTheme.spacingHorizontalM)
          .and('have.css', dir === 'ltr' ? 'padding-right' : 'padding-left', teamsLightTheme.spacingHorizontalM);
        cy.get(container).should(
          'have.css',
          dir === 'ltr' ? 'padding-right' : 'padding-left',
          teamsLightTheme.spacingHorizontalM,
        );
      });
    }
  }

  for (const direction of ['row', 'column'] as const) {
    it(`follows real parent reflow in a ${direction} flex host and returns to the wide layout`, () => {
      mount(<ResizeFixture direction={direction} />);
      assertPlacement('singleline');
      cy.get('[data-testid="host"]').should('have.css', 'flex-direction', direction).and('have.css', 'width', '1100px');
      cy.get('[data-testid="narrow"]').click();
      cy.get('[data-testid="host"]').should('have.css', 'width', '360px');
      assertPlacement('multiline');
      cy.get('[data-testid="wide"]').click();
      assertPlacement('singleline');
    });
  }

  it('renders a dismiss affordance but does not remove the message or react to Escape itself', () => {
    const dismiss = cy.stub().as('passiveDismiss');
    mount(
      <MessageBar layout="singleline" data-testid="message">
        <MessageBarBody>Notice</MessageBarBody>
        <MessageBarActions containerAction={<Button aria-label="Dismiss notice" onClick={dismiss} />}>
          <Button>Review</Button>
        </MessageBarActions>
      </MessageBar>,
    );
    cy.get('[aria-label="Dismiss notice"]').realClick();
    cy.get('@passiveDismiss').should('have.been.calledOnce');
    cy.get(message).should('be.visible');
    cy.realPress('Escape');
    cy.get(message).should('be.visible');
    cy.get('@passiveDismiss').should('have.been.calledOnce');
  });

  it('lets a consumer remove only its chosen message through the dismiss handler', () => {
    const DismissFixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          {visible && (
            <MessageBar data-testid="removable" layout="singleline">
              <MessageBarBody>Removable notice</MessageBarBody>
              <MessageBarActions
                containerAction={<Button aria-label="Dismiss removable" onClick={() => setVisible(false)} />}
              />
            </MessageBar>
          )}
          <Message />
        </>
      );
    };
    mount(<DismissFixture />);
    cy.get('[data-testid="removable"]').should('be.visible');
    cy.get('[aria-label="Dismiss removable"]').realClick();
    cy.get('[data-testid="removable"]').should('not.exist');
    cy.get(message).should('be.visible');
    cy.get('[aria-label="Dismiss notice"]').should('be.visible');
  });
});

describe('MessageBarActions source and unit-derived contracts', () => {
  const childCases: { name: string; children: React.ReactNode; hasActions: boolean; text: string }[] = [
    { name: 'undefined', children: undefined, hasActions: false, text: '' },
    { name: 'null', children: null, hasActions: false, text: '' },
    { name: 'false', children: false, hasActions: false, text: '' },
    { name: 'true', children: true, hasActions: true, text: '' },
    { name: 'empty string', children: '', hasActions: false, text: '' },
    { name: 'zero', children: 0, hasActions: false, text: '0' },
    { name: 'nonzero number', children: 1, hasActions: true, text: '1' },
    { name: 'whitespace', children: ' ', hasActions: true, text: ' ' },
    { name: 'empty fragment', children: <></>, hasActions: true, text: '' },
    { name: 'empty array', children: [], hasActions: true, text: '' },
    { name: 'array of empty nodes', children: [null, false], hasActions: true, text: '' },
    {
      name: 'mixed keyed children',
      children: [0, <button key="review">Review</button>, null],
      hasActions: true,
      text: '0Review',
    },
  ];

  for (const { name, children, hasActions, text } of childCases) {
    it(`preserves the required root and current hasActions truthiness for ${name} children`, () => {
      mount(
        <MessageBar layout="multiline">
          <MessageBarBody>Body</MessageBarBody>
          <MessageBarActions data-testid="actions" containerAction={<Button aria-label="Dismiss notice" />}>
            {children}
          </MessageBarActions>
        </MessageBar>,
      );
      cy.get(actions)
        .should('have.text', text)
        .and('have.class', messageBarActionsClassNames.root)
        .and('have.css', 'display', hasActions ? 'flex' : 'none');
      cy.get(container).should('be.visible').find('button').should('have.attr', 'aria-label', 'Dismiss notice');
    });
  }

  it('recomputes empty/nonempty child styling across rerenders without replacing the root or container', () => {
    const render = (children: React.ReactNode) => (
      <MessageBarActions data-testid="actions" containerAction={<Button aria-label="Dismiss notice" />}>
        {children}
      </MessageBarActions>
    );
    mount(render(<Button>Review</Button>)).then(({ rerender }) => {
      let root: HTMLElement;
      let dismiss: HTMLElement;
      cy.get(actions).then($actions => {
        root = $actions[0];
      });
      cy.get(container).then($container => {
        dismiss = $container[0];
      });
      for (const { children, hasActions, text } of childCases.slice(0, 11)) {
        cy.then(() => rerender(wrap(render(children))));
        cy.get(actions).should('have.css', 'display', hasActions ? 'flex' : 'none');
        cy.get(actions).should($actions => {
          expect($actions[0]).to.equal(root);
          expect($actions.text()).to.equal(text);
        });
        cy.get(container)
          .should('be.visible')
          .should($container => expect($container[0]).to.equal(dismiss));
      }
      cy.then(() => rerender(wrap(render(<Button>Updated action</Button>))));
      cy.get(actions).should('be.visible').find('button').should('have.text', 'Updated action');
    });
  });

  const slotCases: { name: string; value: MessageBarActionsProps['containerAction']; text: string }[] = [
    { name: 'empty object', value: {}, text: '' },
    { name: 'empty string', value: '', text: '' },
    { name: 'zero shorthand', value: 0, text: '0' },
    { name: 'text shorthand', value: 'Container text', text: 'Container text' },
    { name: 'null children object', value: { children: null }, text: '' },
    {
      name: 'mixed shorthand array',
      value: [<Button key="dismiss">Dismiss</Button>, ' suffix'],
      text: 'Dismiss suffix',
    },
  ];
  for (const { name, value, text } of slotCases) {
    it(`renders an explicitly supplied ${name} container rather than treating it as slot omission`, () => {
      mount(
        <MessageBarActions data-testid="actions" containerAction={value}>
          <Button>Review</Button>
        </MessageBarActions>,
      );
      cy.get(container)
        .should('have.text', text)
        .and('have.class', messageBarActionsClassNames.containerAction)
        .and('have.css', 'grid-area', 'actions');
      cy.get(container).should('have.prop', 'tagName', 'DIV');
      cy.get(actions).should('have.text', 'Review');
    });
  }

  it('merges the forwarded object ref with the context actionsRef, targeting only the secondary root and clearing both', () => {
    const caller = React.createRef<HTMLDivElement>();
    const context = React.createRef<HTMLDivElement>();
    const bodyRef = React.createRef<HTMLDivElement>();
    mount(
      <MessageBarContextProvider value={{ layout: 'singleline', titleId: '', actionsRef: context, bodyRef }}>
        <MessageBarActions ref={caller} data-testid="actions" containerAction={<Button>Dismiss</Button>}>
          <Button>Review</Button>
        </MessageBarActions>
      </MessageBarContextProvider>,
    ).then(({ rerender }) => {
      cy.get(actions).should($actions => {
        expect(caller.current).to.equal($actions[0]);
        expect(context.current).to.equal($actions[0]);
        expect(caller.current).to.be.instanceOf($actions[0].ownerDocument.defaultView!.HTMLDivElement);
        expect(caller.current?.textContent).to.equal('Review');
        expect(bodyRef.current).to.equal(null);
      });
      cy.then(() => rerender(wrap(<></>)));
      cy.get(actions).should('not.exist');
      cy.get(container).should('not.exist');
      cy.then(() => {
        expect(caller.current).to.equal(null);
        expect(context.current).to.equal(null);
      });
    });
  });

  it('clears a replaced callback ref, assigns the latest callback to the same root and releases it on unmount', () => {
    const first = cy.stub().as('firstRef');
    const latest = cy.stub().as('latestRef');
    mount(
      <MessageBarActions ref={first} data-testid="actions">
        <Button>Review</Button>
      </MessageBarActions>,
    ).then(({ rerender }) => {
      let root: HTMLElement;
      cy.get(actions).then($actions => {
        root = $actions[0];
        expect(first.lastCall.args[0]).to.equal(root);
      });
      cy.then(() =>
        rerender(
          wrap(
            <MessageBarActions ref={latest} data-testid="actions">
              <Button>Updated</Button>
            </MessageBarActions>,
          ),
        ),
      );
      cy.get(actions).should($actions => {
        expect($actions[0]).to.equal(root);
        expect(first.lastCall.args[0]).to.equal(null);
        expect(latest.lastCall.args[0]).to.equal(root);
      });
      cy.then(() => rerender(wrap(<></>)));
      cy.get(actions).should('not.exist');
      cy.then(() => expect(latest.lastCall.args[0]).to.equal(null));
    });
  });

  it('forwards a separate container ref through layout moves and clears it when the optional slot is removed', () => {
    const caller = React.createRef<HTMLDivElement>();
    const dismiss = React.createRef<HTMLDivElement>();
    const render = (layout: 'singleline' | 'multiline', present: boolean) => (
      <MessageBar data-testid="message" layout={layout}>
        <MessageBarBody>Body</MessageBarBody>
        <MessageBarActions
          ref={caller}
          data-testid="actions"
          containerAction={present ? { ref: dismiss, children: <Button>Dismiss</Button> } : null}
        >
          <Button>Review</Button>
        </MessageBarActions>
      </MessageBar>
    );
    mount(render('singleline', true)).then(({ rerender }) => {
      let original: HTMLElement;
      cy.get(container).then($container => {
        original = $container[0];
        expect(dismiss.current).to.equal(original);
        expect(dismiss.current).not.to.equal(caller.current);
      });
      cy.then(() => rerender(wrap(render('multiline', true))));
      cy.get(container).should($container => {
        expect($container[0]).to.equal(original);
        expect(dismiss.current).to.equal(original);
      });
      cy.then(() => rerender(wrap(render('multiline', false))));
      cy.get(container).should('not.exist');
      cy.get(actions).should($actions => {
        expect(dismiss.current).to.equal(null);
        expect(caller.current).to.equal($actions[0]);
      });
    });
  });

  it('keeps refs and layout context independent across sibling MessageBars', () => {
    const first = React.createRef<HTMLDivElement>();
    const second = React.createRef<HTMLDivElement>();
    const render = (firstLayout: 'singleline' | 'multiline') => (
      <>
        <MessageBar data-testid="first-message" layout={firstLayout}>
          <MessageBarBody>First</MessageBarBody>
          <MessageBarActions ref={first} data-testid="first-actions" containerAction={<Button>First dismiss</Button>}>
            <Button>First action</Button>
          </MessageBarActions>
        </MessageBar>
        <MessageBar data-testid="second-message" layout="singleline">
          <MessageBarBody>Second</MessageBarBody>
          <MessageBarActions
            ref={second}
            data-testid="second-actions"
            containerAction={<Button>Second dismiss</Button>}
          >
            <Button>Second action</Button>
          </MessageBarActions>
        </MessageBar>
      </>
    );
    mount(render('singleline')).then(({ rerender }) => {
      cy.then(() => rerender(wrap(render('multiline'))));
      cy.get('[data-testid="first-message"]').should($message => {
        expect(first.current).to.equal($message[0].querySelector('[data-testid="first-actions"]'));
        expect($message[0].querySelector(container)?.nextElementSibling).to.equal(first.current);
      });
      cy.get('[data-testid="second-message"]').should($message => {
        expect(second.current).to.equal($message[0].querySelector('[data-testid="second-actions"]'));
        expect(second.current?.nextElementSibling).to.equal($message[0].querySelector(container));
        expect(first.current).not.to.equal(second.current);
      });
    });
  });

  it('passes native props, styles, ref and small Button context to a root render function', () => {
    const caller = React.createRef<HTMLDivElement>();
    const activate = cy.stub().as('renderRootClick');
    const renderRoot: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props}>
        <Button onClick={activate}>Rendered action</Button>
      </Component>
    );
    mount(
      <MessageBarActions
        ref={caller}
        data-testid="actions"
        className="rendered-root"
        title="Rendered tooltip"
        containerAction={<Button>Dismiss</Button>}
      >
        {renderRoot}
      </MessageBarActions>,
    );
    cy.get(actions)
      .should('have.class', 'rendered-root')
      .and('have.class', messageBarActionsClassNames.root)
      .and('have.attr', 'title', 'Rendered tooltip')
      .and('have.css', 'column-gap', teamsLightTheme.spacingHorizontalM);
    cy.get(actions).should($actions => expect(caller.current).to.equal($actions[0]));
    cy.get(actions).find('button').should('have.css', 'font-size', teamsLightTheme.fontSizeBase200).realClick();
    cy.get('@renderRootClick').should('have.been.calledOnce');
  });

  it('passes container slot props/ref and Button context to a render function independently of root children', () => {
    const ref = React.createRef<HTMLDivElement>();
    const activate = cy.stub().as('renderContainerClick');
    const renderContainer: SlotRenderFunction<React.HTMLAttributes<HTMLDivElement>> = (Component, props) => (
      <Component {...props}>
        <Button aria-label="Rendered dismiss" onClick={activate} icon={<DismissRegular />} />
      </Component>
    );
    mount(
      <MessageBarActions
        data-testid="actions"
        containerAction={{ ref, className: 'rendered-container', title: 'Custom container', children: renderContainer }}
      >
        <Button>Review</Button>
      </MessageBarActions>,
    );
    cy.get(container)
      .should('have.class', 'rendered-container')
      .and('have.class', messageBarActionsClassNames.containerAction)
      .and('have.attr', 'title', 'Custom container')
      .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM);
    cy.get(container).should($container => expect(ref.current).to.equal($container[0]));
    cy.get('[aria-label="Rendered dismiss"]')
      .should('have.css', 'font-size', teamsLightTheme.fontSizeBase200)
      .realClick();
    cy.get('@renderContainerClick').should('have.been.calledOnce');
    cy.get(actions).should('have.text', 'Review');
  });

  it('preserves consumer inline styles for both slots and restores them when omitted', () => {
    const render = (override: boolean) => (
      <MessageBarActions
        data-testid="actions"
        style={
          override
            ? { columnGap: teamsLightTheme.spacingHorizontalXXL, paddingRight: teamsLightTheme.spacingHorizontalL }
            : undefined
        }
        containerAction={{
          style: override ? { paddingRight: teamsLightTheme.spacingHorizontalXS } : undefined,
          children: <Button>Dismiss</Button>,
        }}
      >
        <Button>Review</Button>
      </MessageBarActions>
    );
    mount(render(true)).then(({ rerender }) => {
      cy.get(actions)
        .should('have.css', 'column-gap', teamsLightTheme.spacingHorizontalXXL)
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalL);
      cy.get(container).should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalXS);
      cy.then(() => rerender(wrap(render(false))));
      cy.get(actions)
        .should('have.css', 'column-gap', teamsLightTheme.spacingHorizontalM)
        .and('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM);
      cy.get(container).should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalM);
    });
  });

  it('invokes provider custom style hooks after component styles for both slots', () => {
    mountBase(
      <FluentProvider
        theme={teamsLightTheme}
        customStyleHooks_unstable={{
          // eslint-disable-next-line @typescript-eslint/naming-convention
          useMessageBarActionsStyles_unstable: state => {
            const actionState = state as MessageBarActionsState;
            actionState.root.style = { ...actionState.root.style, columnGap: teamsLightTheme.spacingHorizontalXXL };
            if (actionState.containerAction) {
              actionState.containerAction.style = {
                ...actionState.containerAction.style,
                paddingRight: teamsLightTheme.spacingHorizontalL,
              };
            }
          },
        }}
      >
        <MessageBarActions
          data-testid="actions"
          style={{ columnGap: teamsLightTheme.spacingHorizontalXS }}
          containerAction={{
            style: { paddingRight: teamsLightTheme.spacingHorizontalXS },
            children: <Button>Dismiss</Button>,
          }}
        >
          <Button>Review</Button>
        </MessageBarActions>
      </FluentProvider>,
    );
    cy.get(actions).should('have.css', 'column-gap', teamsLightTheme.spacingHorizontalXXL);
    cy.get(container).should('have.css', 'padding-right', teamsLightTheme.spacingHorizontalL);
  });

  it('preserves static and caller classes on both slots and replaces/removes only caller classes', () => {
    const render = (name?: string) => (
      <MessageBarActions
        data-testid="actions"
        className={name ? `${name}-root` : undefined}
        containerAction={{ className: name ? `${name}-container` : undefined, children: <Button>Dismiss</Button> }}
      >
        <Button>Review</Button>
      </MessageBarActions>
    );
    mount(render('first')).then(({ rerender }) => {
      cy.get(actions).should('have.class', 'first-root').and('have.class', messageBarActionsClassNames.root);
      cy.get(container)
        .should('have.class', 'first-container')
        .and('have.class', messageBarActionsClassNames.containerAction);
      cy.then(() => rerender(wrap(render('latest'))));
      cy.get(actions).should('not.have.class', 'first-root').and('have.class', 'latest-root');
      cy.get(container).should('not.have.class', 'first-container').and('have.class', 'latest-container');
      cy.then(() => rerender(wrap(render())));
      cy.get(actions).should('not.have.class', 'latest-root').and('have.class', messageBarActionsClassNames.root);
      cy.get(container)
        .should('not.have.class', 'latest-container')
        .and('have.class', messageBarActionsClassNames.containerAction);
    });
  });

  it('registers only secondary text in the parent announcement via actionsRef, excluding the sibling container', () => {
    const announce = cy.spy().as('announceActions');
    mount(
      <AnnounceProvider value={{ announce }}>
        <MessageBar layout="singleline">
          <MessageBarBody>Body</MessageBarBody>
          <MessageBarActions data-testid="actions" containerAction={<Button>Container dismiss</Button>}>
            <Button>Review</Button>
            <Button>Details</Button>
          </MessageBarActions>
        </MessageBar>
      </AnnounceProvider>,
    );
    cy.get('@announceActions').should(() => {
      expect(announce.callCount).to.be.greaterThan(0);
      for (const call of announce.getCalls()) {
        expect(call.args).to.deep.equal(['Body,ReviewDetails', { polite: true, alert: false }]);
      }
    });
    cy.get(container).should('have.text', 'Container dismiss');
    cy.get(actions).should('have.text', 'ReviewDetails');
  });

  it('renders unresolved auto context like singleline and reverses siblings only for multiline', () => {
    const actionsRef = React.createRef<HTMLDivElement>();
    const bodyRef = React.createRef<HTMLDivElement>();
    const render = (layout: 'auto' | 'multiline') => (
      <MessageBarContextProvider value={{ layout, titleId: '', actionsRef, bodyRef }}>
        <div data-testid="host">
          <MessageBarActions data-testid="actions" containerAction={<Button>Dismiss</Button>}>
            <Button>Review</Button>
          </MessageBarActions>
        </div>
      </MessageBarContextProvider>
    );
    mount(render('auto')).then(({ rerender }) => {
      cy.get(actions).should($actions => expect($actions[0].nextElementSibling?.matches(container)).to.equal(true));
      cy.then(() => rerender(wrap(render('multiline'))));
      cy.get(actions).should($actions => expect($actions[0].previousElementSibling?.matches(container)).to.equal(true));
    });
  });

  it('preserves consumer-owned child state in both slots through manual layout switches', () => {
    const Counter = ({ name }: { name: string }) => {
      const [count, setCount] = React.useState(0);
      return (
        <Button data-testid={name} onClick={() => setCount(value => value + 1)}>
          {name} {count}
        </Button>
      );
    };
    const render = (layout: 'singleline' | 'multiline') => (
      <MessageBar layout={layout}>
        <MessageBarBody>Body</MessageBarBody>
        <MessageBarActions data-testid="actions" containerAction={<Counter name="container-count" />}>
          <Counter name="action-count" />
        </MessageBarActions>
      </MessageBar>
    );
    mount(render('singleline')).then(({ rerender }) => {
      cy.get('[data-testid="action-count"]').click().should('have.text', 'action-count 1');
      cy.get('[data-testid="container-count"]').click().should('have.text', 'container-count 1');
      cy.then(() => rerender(wrap(render('multiline'))));
      cy.get('[data-testid="action-count"]')
        .should('have.text', 'action-count 1')
        .click()
        .should('have.text', 'action-count 2');
      cy.get('[data-testid="container-count"]')
        .should('have.text', 'container-count 1')
        .click()
        .should('have.text', 'container-count 2');
      cy.then(() => rerender(wrap(render('singleline'))));
      cy.get('[data-testid="action-count"]').should('have.text', 'action-count 2');
      cy.get('[data-testid="container-count"]').should('have.text', 'container-count 2');
    });
  });

  it('allows an explicit nested Button context to override size within one subtree only', () => {
    mount(
      <MessageBarActions data-testid="actions" containerAction={<Button>Dismiss</Button>}>
        <ButtonContextProvider value={{ size: 'large' }}>
          <Button data-testid="nested-size">Nested</Button>
        </ButtonContextProvider>
        <Button data-testid="sibling-size">Sibling</Button>
      </MessageBarActions>,
    );
    cy.get('[data-testid="nested-size"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    cy.get('[data-testid="sibling-size"]').should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
    cy.get(container).find('button').should('have.css', 'font-size', teamsLightTheme.fontSizeBase200);
  });
});
