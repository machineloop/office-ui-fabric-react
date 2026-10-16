import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';

import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import type { JSXElement, SlotRenderFunction } from '@fluentui/react-utilities';

import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  DialogProvider,
  renderDialogTitle_unstable,
  useDialogTitle_unstable,
  useDialogTitleStyles_unstable,
} from '@fluentui/react-dialog';
import { Button } from '@fluentui/react-button';
import { getByRole, queryByRole } from '@testing-library/dom';
import type { DialogTitleProps, DialogTitleState } from '@fluentui/react-dialog';
import { dialogActionSelector, dialogTriggerOpenId, dialogTriggerOpenSelector } from '../../testing/selectors';

const mount = (element: JSXElement) => mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);

const rootExposed = () =>
  cy.get('#__cy_root').should($root => {
    expect($root[0].closest('[aria-hidden="true"]'), 'retained dialog owner releases mount isolation').to.equal(null);
    expect($root[0].closest('[inert]')).to.equal(null);
  });

const closeOriginalDialog = () => {
  cy.contains('.fui-DialogSurface button', 'Close').realClick();
  cy.get('.fui-DialogSurface').should('not.exist');
  rootExposed();
};

describe('DialogTitle', () => {
  describe('modalType = modal', () => {
    it('should not have closeButton by default', () => {
      mount(
        <Dialog modalType="modal">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                natus iure cumque eaque?
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Close</Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogActionSelector).should('not.exist');
      closeOriginalDialog();
    });
  });
  describe('modalType = non-modal', () => {
    it('should have closeButton by default', () => {
      mount(
        <Dialog modalType="non-modal">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                natus iure cumque eaque?
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Close</Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogActionSelector).should('exist');
      closeOriginalDialog();
    });
  });
  describe('modalType = alert', () => {
    it('should not have closeButton by default', () => {
      mount(
        <Dialog modalType="alert">
          <DialogTrigger disableButtonEnhancement>
            <Button id={dialogTriggerOpenId}>Open dialog</Button>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam exercitationem cumque repellendus
                eaque est dolor eius expedita nulla ullam? Tenetur reprehenderit aut voluptatum impedit voluptates in
                natus iure cumque eaque?
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Close</Button>
                </DialogTrigger>
                <Button appearance="primary">Do Something</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>,
      );
      cy.get(dialogTriggerOpenSelector).realClick();
      cy.get(dialogActionSelector).should('not.exist');
      closeOriginalDialog();
    });
  });
});

const TitleExample = ({
  modalType = 'modal',
  ...titleProps
}: DialogTitleProps & { modalType?: 'modal' | 'alert' | 'non-modal' }) => (
  <Dialog modalType={modalType}>
    <DialogTrigger disableButtonEnhancement>
      <button id="open-title">Open title example</button>
    </DialogTrigger>
    <DialogSurface id="title-surface">
      <DialogBody>
        <DialogTitle {...titleProps}>Account settings</DialogTitle>
        <DialogContent>Account details</DialogContent>
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <button id="close-title">Close example</button>
          </DialogTrigger>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>
);
const openTitle = () => {
  cy.get('#open-title').realClick();
  cy.get('#title-surface').should($surface =>
    expect($surface[0].getAnimations({ subtree: true }).some(animation => animation.playState === 'running')).to.equal(
      false,
    ),
  );
};

describe('DialogTitle documented scenarios', () => {
  for (const modalType of ['modal', 'alert', 'non-modal'] as const) {
    it(`names the ${modalType} surface from its default level two heading`, () => {
      mount(<TitleExample modalType={modalType} />);
      openTitle();
      cy.get('#title-surface').should($surface => {
        const surface = $surface[0];
        const title = getByRole(surface, 'heading', { name: 'Account settings', level: 2 });
        expect(surface.getAttribute('aria-labelledby')).to.equal(title.id);
        expect(
          getByRole(surface.ownerDocument.body, modalType === 'alert' ? 'alertdialog' : 'dialog', {
            name: 'Account settings',
          }),
        ).to.equal(surface);
        expect(queryByRole(surface, 'button', { name: 'close' }) !== null).to.equal(modalType === 'non-modal');
      });

      cy.get('#close-title').realClick();
      cy.get('#title-surface').should('not.exist');
      cy.get('#open-title').should('be.focused');
      rootExposed();
    });
  }
  for (const activation of ['pointer', 'Enter', 'Space'] as const) {
    it(`closes a non-modal dialog with the default action by native ${activation}`, () => {
      mount(<TitleExample modalType="non-modal" />);
      openTitle();
      cy.get('#title-surface').find('button[aria-label="close"]').should('have.attr', 'type', 'button');
      if (activation === 'pointer') {
        cy.get('#title-surface').find('button[aria-label="close"]').realClick();
      } else {
        cy.get('#title-surface').find('button[aria-label="close"]').should('be.focused').realPress(activation);
      }
      cy.get('#title-surface').should('not.exist');
      cy.get('#open-title').should('be.focused');
      rootExposed();
    });
  }
  it('supports the documented custom Fluent Button action in a modal dialog', () => {
    mount(
      <TitleExample
        action={
          <DialogTrigger action="close">
            <Button id="custom-title-close" appearance="subtle" aria-label="Dismiss account">
              Dismiss
            </Button>
          </DialogTrigger>
        }
      />,
    );
    openTitle();
    cy.get('#custom-title-close')
      .should($button =>
        expect(
          getByRole($button[0].ownerDocument.body, 'button', {
            name: 'Dismiss account',
          }),
        ).to.equal($button[0]),
      )
      .realPress('Enter');
    cy.get('#title-surface').should('not.exist');
    cy.get('#open-title').should('be.focused');
    rootExposed();
  });
  it('omits the documented null action while retaining the non-modal heading and other dismissal', () => {
    mount(<TitleExample modalType="non-modal" action={null} />);
    openTitle();
    cy.get('#title-surface').find('.fui-DialogTitle__action').should('not.exist');
    cy.get('#title-surface').find('h2').should('have.text', 'Account settings');
    cy.get('#close-title').realClick();
    cy.get('#title-surface').should('not.exist');
    rootExposed();
  });
});

describe('DialogTitle supported API and accessibility edges', () => {
  for (const [as, level] of [
    ['h1', 1],
    ['h2', 2],
    ['h3', 3],
    ['h4', 4],
    ['h5', 5],
    ['h6', 6],
    ['div', 3],
  ] as const) {
    it(`supports the ${as} root with an accessible level ${level} heading`, () => {
      mount(
        <DialogTitle
          as={as}
          id="heading"
          role={as === 'div' ? 'heading' : undefined}
          aria-level={as === 'div' ? level : undefined}
          title="Native title"
          aria-label="Account heading"
          lang="fr"
          dir="rtl"
          data-owner="consumer"
          tabIndex={0}
        >
          Account heading
        </DialogTitle>,
      );
      cy.get('#heading')
        .should('have.prop', 'tagName', as.toUpperCase())
        .and('have.attr', 'title', 'Native title')
        .and('have.attr', 'lang', 'fr')
        .and('have.attr', 'dir', 'rtl')
        .and('have.attr', 'data-owner', 'consumer')
        .should($heading =>
          expect(
            getByRole($heading[0].ownerDocument.body, 'heading', {
              name: 'Account heading',
              level,
            }),
          ).to.equal($heading[0]),
        )
        .realClick()
        .should('be.focused');
    });
  }

  for (const [name, children, text] of [
    ['omitted', undefined, ''],
    ['null', null, ''],
    ['zero', 0, '0'],
    [
      'fragment',
      <>
        <span>First</span>
        <strong>Second</strong>
      </>,
      'FirstSecond',
    ],
  ] as const) {
    it(`preserves ${name} heading children without manufacturing an action outside Dialog`, () => {
      mount(<DialogTitle id="heading">{children}</DialogTitle>);
      cy.get('#heading').should('have.text', text).and('have.prop', 'tagName', 'H2');
      cy.get('.fui-DialogTitle__action').should('not.exist');
    });
  }

  it('updates accessible title text and preserves explicit surface label precedence and description', () => {
    const Updating = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <Dialog defaultOpen>
          <DialogSurface
            id="title-surface"
            aria-labelledby="explicit-title"
            aria-describedby="description"
            aria-label={updated ? undefined : 'Ignored label'}
          >
            <DialogBody>
              <DialogTitle id="explicit-title" aria-label={updated ? undefined : 'Initial accessible title'}>
                {updated ? 'Updated title' : 'Visible title'}
              </DialogTitle>
              <DialogContent id="description">Account description</DialogContent>
              <button id="update-title" onClick={() => setUpdated(true)}>
                Update title
              </button>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      );
    };
    mount(<Updating />);
    cy.get('#title-surface').should($surface =>
      expect(
        getByRole($surface[0].ownerDocument.body, 'dialog', {
          name: 'Initial accessible title',
          description: 'Account description',
        }),
      ).to.equal($surface[0]),
    );
    cy.get('#update-title').realClick();
    cy.get('#title-surface').should($surface => {
      expect(
        getByRole($surface[0].ownerDocument.body, 'dialog', {
          name: 'Updated title',
          description: 'Account description',
        }),
      ).to.equal($surface[0]);
      expect(getByRole($surface[0], 'heading', { name: 'Updated title', level: 2 })).to.equal(
        $surface[0].querySelector('h2'),
      );
    });
    cy.get('#explicit-title').should('not.have.attr', 'aria-label');
    cy.get('#update-title').realPress('Escape');
    cy.get('#title-surface').should('not.exist');
    rootExposed();
  });

  it('replaces removes and omits action shorthand while restoring the default non-modal close button', () => {
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      const action: DialogTitleProps['action'] =
        phase === 0
          ? 'Text action'
          : phase === 1
          ? { id: 'custom-action', children: <button id="child-action">Current action</button> }
          : phase === 2
          ? null
          : undefined;
      return (
        <Dialog modalType="non-modal" defaultOpen>
          <DialogSurface id="title-surface">
            <DialogBody>
              <DialogTitle id="heading" action={action}>
                Action lifecycle
              </DialogTitle>
              <button id="advance-title" onClick={() => setPhase(value => value + 1)}>
                Advance action
              </button>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      );
    };
    mount(<Updating />);
    cy.get('.fui-DialogTitle__action').should('have.text', 'Text action');
    cy.get('#advance-title').realClick();
    cy.get('#custom-action').should('have.text', 'Current action');
    cy.get('#child-action').realClick().should('be.focused');
    cy.get('#advance-title').realClick();
    cy.get('.fui-DialogTitle__action').should('not.exist');
    cy.get('#advance-title').realClick();
    cy.get('.fui-DialogTitle__action').find('button[aria-label="close"]').realClick();
    cy.get('#title-surface').should('not.exist');
    rootExposed();
  });

  it('recomputes the omitted default action when modal type changes without remounting the heading', () => {
    let first: Element;
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      const modalType = (['modal', 'non-modal', 'alert'] as const)[phase];
      return (
        <DialogProvider
          value={{
            open: true,
            inertTrapFocus: false,
            modalType,
            isNestedDialog: false,
            dialogRef: { current: null },
            dialogTitleId: 'heading',
            requestOpenChange: () => undefined,
          }}
        >
          <DialogBody>
            <DialogTitle id="heading">Changing mode</DialogTitle>
            <button id="advance-title" onClick={() => setPhase(value => value + 1)}>
              Advance mode
            </button>
          </DialogBody>
        </DialogProvider>
      );
    };
    mount(<Updating />);
    cy.get('#heading').then($heading => {
      first = $heading[0];
    });
    cy.get('.fui-DialogTitle__action').should('not.exist');
    cy.get('#advance-title').realClick();
    cy.get('.fui-DialogTitle__action').find('button[aria-label="close"]').should('be.visible');
    cy.get('#advance-title').realClick();
    cy.get('.fui-DialogTitle__action').should('not.exist');
    cy.get('#heading').should($heading => expect($heading[0]).to.equal(first));
    cy.get('#heading').should($heading =>
      expect(
        getByRole($heading[0].ownerDocument.body, 'heading', {
          name: 'Changing mode',
          level: 2,
        }),
      ).to.equal($heading[0]),
    );
  });

  it('honors a custom close button veto then replaces and removes its latest handler', () => {
    const calls: string[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <Dialog
          defaultOpen
          onOpenChange={(event, data) => {
            calls.push(`request:${data.open}`);
            if (phase === 1) {
              event.preventDefault();
            }
          }}
        >
          <DialogSurface id="title-surface">
            <DialogBody>
              <DialogTitle
                action={
                  <DialogTrigger action="close" disableButtonEnhancement>
                    <button
                      id="veto-close"
                      onClick={
                        phase < 2
                          ? event => {
                              calls.push(phase === 0 ? 'old' : 'new');
                              if (phase === 0) {
                                event.preventDefault();
                              }
                            }
                          : undefined
                      }
                    >
                      Dismiss
                    </button>
                  </DialogTrigger>
                }
              >
                Veto title
              </DialogTitle>
              <button id="advance-title" onClick={() => setPhase(value => value + 1)}>
                Advance handler
              </button>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      );
    };
    mount(<Updating />);
    cy.get('#veto-close').should('be.focused').realPress('Enter');
    cy.get('#title-surface').should('be.visible');
    cy.then(() => expect(calls).to.deep.equal(['old']));
    cy.get('#advance-title').realClick();
    cy.get('#veto-close').realClick().realPress('Space');
    cy.get('#title-surface').should('be.visible');
    cy.then(() => expect(calls).to.deep.equal(['old', 'new', 'request:false', 'new', 'request:false']));
    cy.get('#advance-title').realClick();
    cy.get('#veto-close').realClick();
    cy.get('#title-surface').should('not.exist');
    rootExposed();
    cy.then(() =>
      expect(calls).to.deep.equal(['old', 'new', 'request:false', 'new', 'request:false', 'request:false']),
    );
  });

  it('forwards root event replacement removal and default prevention independently of the sibling action', () => {
    const calls: string[] = [];
    const prevented: boolean[] = [];
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <div onKeyDown={event => prevented.push(event.defaultPrevented)}>
          <button id="advance-title" onClick={() => setPhase(value => value + 1)}>
            Advance root
          </button>
          <DialogTitle
            id="heading"
            tabIndex={0}
            title={phase === 0 ? 'Old tooltip' : undefined}
            aria-label={phase === 0 ? 'Old name' : undefined}
            action={<button id="sibling-action">Sibling action</button>}
            onClick={phase < 2 ? () => calls.push(`click:${phase}`) : undefined}
            onKeyDown={
              phase < 2
                ? event => {
                    calls.push(`${phase}:${event.key}`);
                    event.preventDefault();
                  }
                : undefined
            }
          >
            {phase === 0 ? 'Old heading' : 'Current heading'}
          </DialogTitle>
        </div>
      );
    };
    mount(<Updating />);
    cy.get('#heading').realClick().realPress('ArrowRight');
    cy.get('#sibling-action').realClick();
    cy.get('#advance-title').realClick();
    cy.get('#heading')
      .should($heading => {
        expect($heading[0].hasAttribute('title')).to.equal(false);
        expect($heading[0].hasAttribute('aria-label')).to.equal(false);
      })
      .realClick()
      .realPress('ArrowLeft');
    cy.get('#advance-title').realClick();
    cy.get('#heading').realClick().realPress('ArrowDown');
    cy.then(() => {
      expect(calls).to.deep.equal(['click:0', '0:ArrowRight', 'click:1', '1:ArrowLeft']);
      expect(prevented).to.deep.equal([true, true, false]);
    });
  });

  it('keeps hidden and aria-hidden headings out of accessible queries and restores them on update', () => {
    const Updating = () => {
      const [hidden, setHidden] = React.useState(true);
      return (
        <>
          <button id="reveal-title" onClick={() => setHidden(false)}>
            Reveal titles
          </button>
          <DialogTitle id="native-hidden" hidden={hidden}>
            Native hidden title
          </DialogTitle>
          <DialogTitle id="aria-hidden" aria-hidden={hidden ? true : undefined}>
            ARIA hidden title
          </DialogTitle>
        </>
      );
    };
    mount(<Updating />);
    cy.get('#native-hidden').should('not.be.visible');
    cy.get('#aria-hidden')
      .should('be.visible')
      .should($heading => {
        expect(queryByRole($heading[0].ownerDocument.body, 'heading', { name: 'ARIA hidden title' })).to.equal(null);
        expect(queryByRole($heading[0].ownerDocument.body, 'heading', { name: 'Native hidden title' })).to.equal(null);
      });
    cy.get('#reveal-title').realClick();
    cy.get('#native-hidden').should('be.visible').and('not.have.attr', 'hidden');
    cy.get('#aria-hidden').should($heading => {
      expect($heading[0].hasAttribute('aria-hidden')).to.equal(false);
      expect(getByRole($heading[0].ownerDocument.body, 'heading', { name: 'Native hidden title' })).not.to.equal(null);
      expect(getByRole($heading[0].ownerDocument.body, 'heading', { name: 'ARIA hidden title' })).to.equal($heading[0]);
    });
  });

  it('preserves typed action render props ref native events and sibling placement', () => {
    const ref = React.createRef<HTMLDivElement>();
    const clicked = cy.stub().as('actionClick');
    const renderAction: SlotRenderFunction<NonNullable<DialogTitleState['action']>> = (Component, props) => (
      <Component {...props} data-rendered="true">
        <button id="render-action">Rendered action</button>
      </Component>
    );
    mount(
      <DialogTitle
        id="heading"
        action={{
          id: 'action',
          ref,
          title: 'Action tooltip',
          onClick: clicked,
          children: renderAction,
        }}
      >
        Rendered title
      </DialogTitle>,
    );
    cy.get('#action')
      .should('have.attr', 'data-rendered', 'true')
      .and('have.attr', 'title', 'Action tooltip')
      .and('have.class', 'fui-DialogTitle__action')
      .should($action => {
        expect(ref.current).to.equal($action[0]);
        expect($action[0].previousElementSibling?.id).to.equal('heading');
      });
    cy.get('#render-action').realClick().should('be.focused');
    cy.get('@actionClick').should('have.been.calledOnce');
  });

  it('preserves a typed root render function native heading props and forwarded ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const rootRender: SlotRenderFunction<DialogTitleState['root']> = (Component, props) => (
      <Component {...props} data-rendered="true">
        Rendered heading
      </Component>
    );
    mount(
      <DialogTitle id="heading" ref={ref} aria-label="Rendered accessible title">
        {rootRender}
      </DialogTitle>,
    );
    cy.get('#heading')
      .should('have.attr', 'data-rendered', 'true')
      .and('have.class', 'fui-DialogTitle')
      .should($heading => {
        expect(ref.current).to.equal($heading[0]);
        expect(
          getByRole($heading[0].ownerDocument.body, 'heading', {
            name: 'Rendered accessible title',
            level: 2,
          }),
        ).to.equal($heading[0]);
      })
      .and('have.text', 'Rendered heading');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`updates and resets caller root and action styles with separate ${dir} grid placement`, () => {
      const Updating = () => {
        const [custom, setCustom] = React.useState(true);
        return (
          <FluentProvider theme={teamsLightTheme} dir={dir}>
            <DialogBody style={{ width: '320px' }}>
              <DialogTitle
                id="heading"
                className={custom ? 'custom-heading' : undefined}
                style={
                  custom
                    ? { fontSize: teamsLightTheme.fontSizeBase600, margin: teamsLightTheme.spacingVerticalL }
                    : undefined
                }
                action={
                  custom
                    ? {
                        id: 'action',
                        className: 'custom-action',
                        style: { justifySelf: 'start' },
                        children: (
                          <button id="reset-title" onClick={() => setCustom(false)}>
                            Reset styles
                          </button>
                        ),
                      }
                    : null
                }
              >
                Styled title
              </DialogTitle>
            </DialogBody>
          </FluentProvider>
        );
      };
      mount(<Updating />);
      cy.get('#heading')
        .should('have.class', 'custom-heading')
        .and('have.css', 'font-size', '24px')
        .and('have.css', 'grid-column', '1 / 3');
      cy.get('#action')
        .should('have.class', 'custom-action')
        .and('have.css', 'justify-self', 'start')
        .and('have.css', 'grid-column-start', '3')
        .should($action => {
          const heading = $action[0].previousElementSibling!.getBoundingClientRect();
          const action = $action[0].getBoundingClientRect();
          expect(dir === 'ltr' ? heading.right <= action.left : action.right <= heading.left).to.equal(true);
        });
      cy.get('#reset-title').realClick();
      cy.get('#action').should('not.exist');
      cy.get('#heading')
        .should('not.have.class', 'custom-heading')
        .and('have.css', 'font-size', '20px')
        .and('have.css', 'margin', '0px')
        .and('have.css', 'grid-column', '1 / 4');
    });
  }
});

describe('DialogTitle meaningful unit-derived contracts', () => {
  it('matches the default snapshot heading with no action wrapper outside a dialog', () => {
    mount(<DialogTitle id="heading">Default DialogTitle</DialogTitle>);
    cy.get('#heading')
      .should('have.prop', 'tagName', 'H2')
      .and('have.class', 'fui-DialogTitle')
      .and('have.text', 'Default DialogTitle')
      .and('have.css', 'margin', '0px')
      .and('have.css', 'font-size', '20px')
      .and('have.css', 'font-weight', '600')
      .and('have.css', 'grid-column', '1 / 4')
      .should($heading =>
        expect(
          getByRole($heading[0].ownerDocument.body, 'heading', {
            name: 'Default DialogTitle',
            level: 2,
          }),
        ).to.equal($heading[0]),
      );
    cy.get('.fui-DialogTitle__action').should('not.exist');
  });

  it('forwards the object ref to the heading rather than its sibling action and clears both on unmount', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const actionRef = React.createRef<HTMLDivElement>();
    const Updating = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button id="unmount-title" onClick={() => setShown(false)}>
            Unmount title
          </button>
          {shown && (
            <DialogTitle
              id="heading"
              ref={rootRef}
              action={{
                id: 'action',
                ref: actionRef,
                children: 'Action',
              }}
            >
              Referenced title
            </DialogTitle>
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#heading').should($heading => expect(rootRef.current).to.equal($heading[0]));
    cy.get('#action').should($action => expect(actionRef.current).to.equal($action[0]));
    cy.get('#unmount-title').realClick();
    cy.get('#heading').should('not.exist');
    cy.get('#action').should('not.exist');
    cy.then(() => {
      expect(rootRef.current).to.equal(null);
      expect(actionRef.current).to.equal(null);
    });
  });

  it('detaches replaced root and action callback refs then clears the current refs', () => {
    const firstRoot = cy.stub();
    const nextRoot = cy.stub();
    const firstAction = cy.stub();
    const nextAction = cy.stub();
    const Updating = () => {
      const [phase, setPhase] = React.useState(0);
      return (
        <>
          <button id="advance-title" onClick={() => setPhase(value => value + 1)}>
            Advance refs
          </button>
          {phase < 2 && (
            <DialogTitle
              id="heading"
              ref={phase === 0 ? firstRoot : nextRoot}
              action={{ id: 'action', ref: phase === 0 ? firstAction : nextAction, children: 'Action' }}
            >
              Title
            </DialogTitle>
          )}
        </>
      );
    };
    mount(<Updating />);
    cy.get('#heading').should($heading => expect(firstRoot.lastCall.args[0]).to.equal($heading[0]));
    cy.get('#action').should($action => expect(firstAction.lastCall.args[0]).to.equal($action[0]));
    cy.get('#advance-title').realClick();
    cy.get('#heading').should($heading => {
      expect(firstRoot.lastCall.args[0]).to.equal(null);
      expect(nextRoot.lastCall.args[0]).to.equal($heading[0]);
    });
    cy.get('#action').should($action => {
      expect(firstAction.lastCall.args[0]).to.equal(null);
      expect(nextAction.lastCall.args[0]).to.equal($action[0]);
    });
    cy.get('#advance-title').realClick();
    cy.get('#heading').should('not.exist');
    cy.then(() => {
      expect(nextRoot.lastCall.args[0]).to.equal(null);
      expect(nextAction.lastCall.args[0]).to.equal(null);
    });
  });

  it('supports typed hook style render recomposition with independently styled slots and native activation', () => {
    const Recomposed = React.forwardRef<HTMLDivElement, DialogTitleProps>((props, ref) => {
      const state = useDialogTitle_unstable(props, ref);
      useDialogTitleStyles_unstable(state);
      state.root['aria-label'] = 'Recomposed heading';
      return renderDialogTitle_unstable(state);
    });
    const ref = React.createRef<HTMLDivElement>();
    const clicked = cy.stub().as('recomposedAction');
    mount(
      <Recomposed
        id="heading"
        ref={ref}
        className="consumer-title"
        action={{
          id: 'action',
          children: (
            <button id="recomposed-action" onClick={clicked}>
              Action
            </button>
          ),
        }}
      >
        Recomposed
      </Recomposed>,
    );
    cy.get('#heading')
      .should('have.class', 'consumer-title')
      .and('have.class', 'fui-DialogTitle')
      .and('have.css', 'grid-column', '1 / 3')
      .should($heading => {
        expect(ref.current).to.equal($heading[0]);
        expect(getByRole($heading[0].ownerDocument.body, 'heading', { name: 'Recomposed heading' })).to.equal(
          $heading[0],
        );
      });
    cy.get('#recomposed-action').realClick().should('be.focused').realPress('Space');
    cy.get('@recomposedAction').should('have.been.calledTwice');
  });

  it('applies and removes provider title style hooks while retaining caller props and action focus', () => {
    const ref = React.createRef<HTMLDivElement>();
    const customStyle = (state: unknown) => {
      const title = state as DialogTitleState;
      title.root.style = { ...title.root.style, fontSize: teamsLightTheme.fontSizeBase600 };
      if (title.action) {
        title.action.style = { ...title.action.style, justifySelf: 'start' };
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
                  useDialogTitleStyles_unstable: customStyle,
                }
              : {}
          }
        >
          <DialogTitle
            id="heading"
            ref={ref}
            title="Caller tooltip"
            action={{
              id: 'action',
              children: (
                <button id="reset-provider" onClick={() => setCustom(false)}>
                  Reset provider
                </button>
              ),
            }}
          >
            Provider title
          </DialogTitle>
        </FluentProvider>
      );
    };
    mount(<Updating />);
    cy.get('#heading').should('have.css', 'font-size', '24px');
    cy.get('#action').should('have.css', 'justify-self', 'start');
    cy.get('#reset-provider').realClick().should('be.focused');
    cy.get('#heading')
      .should('have.css', 'font-size', '20px')
      .and('have.attr', 'title', 'Caller tooltip')
      .should($heading => expect(ref.current).to.equal($heading[0]));
    cy.get('#action').should('have.css', 'justify-self', 'end');
    cy.get('#reset-provider').should('be.focused');
  });
});
