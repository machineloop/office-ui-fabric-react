import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { InfoLabel } from '@fluentui/react-infolabel';
import { infoButtonClassNames } from '../InfoButton/useInfoButtonStyles.styles';
import type { JSXElement } from '@fluentui/react-utilities';
import { Field } from '@fluentui/react-field';
import { Input } from '@fluentui/react-input';
import type { LabelProps } from '@fluentui/react-label';

const mount = (element: JSXElement) => {
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
};

const surfaceSelector = '[role="note"]';

describe('InfoLabel - close on tab-out', () => {
  const openInfoButton = () => {
    return cy.get(`button.${infoButtonClassNames.root}`).focus().realPress('Enter');
  };

  it('no focusable elements', () => {
    mount(
      <>
        <button>before</button>
        <InfoLabel label="InfoLabel's label" info="Example non-focusable info" />
      </>,
    );

    openInfoButton().get(surfaceSelector).should('exist');
    // Shift-tab to InfoButton, the surface should still be visible
    cy.realPress(['Shift', 'Tab']).get(surfaceSelector).should('exist');
    // Shift-tab again to the 'before' button, surface should be hidden
    cy.realPress(['Shift', 'Tab']).get(surfaceSelector).should('not.exist');
    openInfoButton();
    cy.realPress('Tab').get(surfaceSelector).should('not.exist');
  });

  it('single focusable element', () => {
    mount(
      <>
        <button>before</button>
        <InfoLabel
          label="InfoLabel's label"
          info={
            <>
              Example non-focusable info
              <button>one</button>
            </>
          }
        />
      </>,
    );

    openInfoButton().get(surfaceSelector).should('exist');
    // Shift-tab to InfoButton, the surface should still be visible
    cy.realPress(['Shift', 'Tab']).get(surfaceSelector).should('exist');
    // Shift-tab again to the 'before' button, surface should be hidden
    cy.realPress(['Shift', 'Tab']).get(surfaceSelector).should('not.exist');
    openInfoButton();
    // moving into the focusable item
    cy.realPress('Tab').get(surfaceSelector).should('exist');
    // tabbing out with shift + tab from the first focusable item should close the surface since
    // the surface is only focusable programmatically
    cy.realPress(['Shift', 'Tab']).realPress(['Shift', 'Tab']).get(surfaceSelector).should('not.exist');
    openInfoButton();
    cy.realPress('Tab').realPress('Tab').get(surfaceSelector).should('not.exist');
  });

  it('one or more focusable elements', () => {
    mount(
      <>
        <button>before</button>
        <InfoLabel
          label="InfoLabel's label"
          info={
            <>
              Example non-focusable info
              <button>one</button>
              <button>two</button>
              <button>three</button>
            </>
          }
        />
      </>,
    );

    openInfoButton().get(surfaceSelector).should('exist');
    // Shift-tab to InfoButton, the surface should still be visible
    cy.realPress(['Shift', 'Tab']).get(surfaceSelector).should('exist');
    // Shift-tab again to the 'before' button, surface should be hidden
    cy.realPress(['Shift', 'Tab']).get(surfaceSelector).should('not.exist');
    openInfoButton();
    // moving into the focusable item
    cy.realPress('Tab').get(surfaceSelector).should('exist');
    // tabbing out with shift + tab from the first focusable item should close the surface since
    // the surface is only focusable programmatically
    cy.realPress(['Shift', 'Tab']).realPress(['Shift', 'Tab']).get(surfaceSelector).should('not.exist');
    openInfoButton();
    // checking that event does not propagate to children
    cy.realPress('Tab').realPress('Tab').realPress(['Shift', 'Tab']).get(surfaceSelector).should('exist');
    cy.realPress('Tab').realPress('Tab').realPress('Tab').get(surfaceSelector).should('not.exist');
  });
});

describe('InfoLabel - toggle on click', () => {
  const clickInfoButton = () => {
    return cy.get(`button.${infoButtonClassNames.root}`).realClick();
  };

  it('toggles on click', () => {
    mount(<InfoLabel label="InfoLabel's label" info="Example info" />);

    clickInfoButton().get(surfaceSelector).should('exist');
    clickInfoButton().get(surfaceSelector).should('not.exist');
  });

  const root = () => cy.get('.fui-InfoLabel');
  const label = () => cy.get('.fui-InfoLabel__label');
  const trigger = () => cy.get('.fui-InfoLabel__infoButton');
  const surface = () => cy.get('[role="note"]');

  describe('InfoLabel adversarial improvements (final)', () => {
    it('removing and readding optional info does not retain ownership of a newly closed popup', () => {
      const Example = () => {
        const [show, setShow] = React.useState(true);
        return (
          <>
            <button onClick={() => setShow(value => !value)}>Toggle info</button>
            <InfoLabel
              info={show ? { children: <button onClick={() => setShow(false)}>Remove info</button> } : undefined}
            >
              Name
            </InfoLabel>
          </>
        );
      };
      mount(<Example />);
      trigger().realClick();
      root().should('have.attr', 'aria-owns');
      cy.contains('button', 'Remove info').realClick();
      trigger().should('not.exist');
      root().should('not.have.attr', 'aria-owns');
      cy.contains('button', 'Toggle info').realClick();
      trigger().should('exist');
      surface().should('not.exist');
      root().should('not.have.attr', 'aria-owns');
      trigger().realClick();
      surface().should('exist');
    });

    it('portal popup forwards both refs and retains ownership during inner traversal, clearing it only outside', () => {
      const buttonRef = React.createRef<HTMLButtonElement>();
      const infoRef = React.createRef<HTMLDivElement>();
      mount(
        <>
          <InfoLabel
            infoButton={{
              inline: false,
              ref: buttonRef,
              info: {
                id: 'portal-note',
                ref: infoRef,
                children: (
                  <>
                    <button id="inner-one">One</button>
                    <button id="inner-two">Two</button>
                  </>
                ),
              },
            }}
          >
            Name
          </InfoLabel>
          <button id="after">After</button>
        </>,
      );
      trigger()
        .should($button => expect(buttonRef.current).to.equal($button[0]))
        .focus()
        .realPress('Enter');
      surface()
        .should('have.focus')
        .should($surface => expect(infoRef.current).to.equal($surface[0]));
      root().should('have.attr', 'aria-owns', 'portal-note');
      root().find('[role="note"]').should('not.exist');
      surface().realPress('Tab');
      cy.get('#inner-one').should('have.focus').realPress('Tab');
      cy.get('#inner-two').should('have.focus');
      root().should('have.attr', 'aria-owns', 'portal-note');
      cy.get('#after').realClick();
      surface()
        .should('not.exist')
        .then(() => expect(infoRef.current).to.equal(null));
      root().should('not.have.attr', 'aria-owns');
    });

    it('explicit popup naming survives actual custom ID and content changes', () => {
      mount(
        <>
          <span id="external-name">More about records</span>
          <InfoLabel info={{ id: 'named-surface', 'aria-labelledby': 'external-name', children: 'Details' }}>
            Name
          </InfoLabel>
        </>,
      );
      trigger().realClick();
      surface().should('have.attr', 'aria-labelledby', 'external-name');
      root().should('have.attr', 'aria-owns', 'named-surface');
    });
  });

  describe('InfoLabel edges and accessibility (round 2)', () => {
    it('primary native attrs/ref go to Label while root class/style and shorthand overrides stay on wrapper', () => {
      const ref = React.createRef<HTMLLabelElement>();
      mount(
        <InfoLabel
          ref={ref}
          id="native-label"
          htmlFor="target"
          title="Field name"
          className="custom-root"
          style={{ color: 'rgb(1, 2, 3)' }}
          root={{ id: 'root-id', title: 'Wrapper' }}
          label={{ className: 'custom-label' }}
          info="Details"
        >
          Name
        </InfoLabel>,
      );
      label()
        .should('have.id', 'native-label')
        .and('have.attr', 'for', 'target')
        .and('have.attr', 'title', 'Field name')
        .and('have.class', 'custom-label')
        .should($label => expect(ref.current).to.equal($label[0]));
      root()
        .should('have.id', 'root-id')
        .and('have.class', 'custom-root')
        .and('have.attr', 'title', 'Wrapper')
        .and('have.css', 'color', 'rgb(1, 2, 3)');
      label().should('have.css', 'color', 'rgb(1, 2, 3)');
    });

    describe('InfoLabel unit-derived contracts (round 3)', () => {
      it('missing info omits optional button; explicit slot info renders it without top-level info', () => {
        mount(<InfoLabel>Name</InfoLabel>);
        trigger().should('not.exist');
        mount(<InfoLabel infoButton={{ info: 'Slot information' }}>Name</InfoLabel>);
        trigger().realClick();
        surface().should('have.text', 'Slot information');
      });

      it('null optional button suppresses top-level info while empty top-level info stays label-only', () => {
        mount(
          <InfoLabel info="Details" infoButton={null}>
            Name
          </InfoLabel>,
        );
        trigger().should('not.exist');
        mount(<InfoLabel info="">Name</InfoLabel>);
        trigger().should('not.exist');
      });

      it('label shorthand props/children override primary defaults; root shorthand style wins root defaults', () => {
        mount(
          <InfoLabel
            id="top-id"
            size="large"
            style={{ color: 'rgb(1, 2, 3)' }}
            root={{ style: { color: 'rgb(4, 5, 6)' } }}
            label={{ id: 'slot-id', size: 'small', children: 'Slot label' }}
            info="Details"
          >
            Top label
          </InfoLabel>,
        );
        label().should('have.id', 'slot-id').and('have.text', 'Slot label').and('have.css', 'font-size', '12px');
        root().should('have.css', 'color', 'rgb(4, 5, 6)');
      });

      (['top', 'slot'] as const).forEach(source => {
        it(`${source}: exact popup ID is owned while open and popup names itself`, () => {
          mount(
            source === 'top' ? (
              <InfoLabel info={{ id: 'named-note', children: 'Details' }}>Name</InfoLabel>
            ) : (
              <InfoLabel infoButton={{ info: { id: 'named-note', children: 'Details' } }}>Name</InfoLabel>
            ),
          );
          trigger().realClick();
          root().should('have.attr', 'aria-owns', 'named-note');
          surface().should('have.id', 'named-note');
          surface()
            .invoke('attr', 'aria-labelledby')
            .then(id => cy.get(`[id="${id}"]`).should('contain.text', 'Details'));
        });
      });

      it('button compound name references actual overridden label/button IDs in order', () => {
        mount(
          <InfoLabel label={{ id: 'field-label' }} infoButton={{ id: 'info-button', info: 'Details' }}>
            Name
          </InfoLabel>,
        );
        trigger().should('have.attr', 'aria-labelledby', 'field-label info-button');
        label().should('have.id', 'field-label');
        trigger().should('have.id', 'info-button');
      });
    });

    it('defaultOpen creates ownership immediately, without waiting for a user callback', () => {
      mount(
        <InfoLabel info={{ id: 'default-note', children: 'Details' }} infoButton={{ popover: { defaultOpen: true } }}>
          Name
        </InfoLabel>,
      );
      surface().should('be.visible');
      root().should('have.attr', 'aria-owns', 'default-note');
    });

    it('frozen controlled closed popup reports click request without claiming ownership of absent content', () => {
      const change = cy.stub().as('change');
      mount(
        <InfoLabel
          info={{ id: 'frozen-note', children: 'Details' }}
          infoButton={{ popover: { open: false, onOpenChange: change } }}
        >
          Name
        </InfoLabel>,
      );
      trigger().realClick();
      surface().should('not.exist');
      root().should('not.have.attr', 'aria-owns');
      cy.get('@change')
        .should('have.been.calledOnce')
        .then(() => {
          expect(change.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
          expect(change.firstCall.args[1].open).to.equal(true);
        });
    });

    it('live controlled open changes update ownership to match rendered surface', () => {
      const Example = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <>
            <button onClick={() => setOpen(value => !value)}>Toggle</button>
            <InfoLabel info={{ id: 'controlled-note', children: 'Details' }} infoButton={{ popover: { open } }}>
              Name
            </InfoLabel>
          </>
        );
      };
      mount(<Example />);
      cy.contains('button', 'Toggle').realClick();
      surface().should('be.visible');
      root().should('have.attr', 'aria-owns', 'controlled-note');
      cy.contains('button', 'Toggle').realClick();
      surface().should('not.exist');
      root().should('not.have.attr', 'aria-owns');
    });

    it('native tab-out removes stale aria ownership along with the closed popup', () => {
      mount(
        <>
          <InfoLabel info={{ id: 'tab-note', children: 'Details' }}>Name</InfoLabel>
          <button id="after">After</button>
        </>,
      );
      trigger().focus().realPress('Enter');
      surface().should('have.focus');
      root().should('have.attr', 'aria-owns', 'tab-note');
      surface().realPress('Tab');
      cy.get('#after').should('have.focus');
      surface().should('not.exist');
      root().should('not.have.attr', 'aria-owns');
    });

    it('explicit button naming and root ownership overrides are preserved', () => {
      mount(
        <InfoLabel
          root={{ 'aria-owns': 'owner-supplied' }}
          info="Details"
          infoButton={{ 'aria-labelledby': 'custom-name', 'aria-label': 'Custom information' }}
        >
          Name
        </InfoLabel>,
      );
      trigger()
        .should('have.attr', 'aria-labelledby', 'custom-name')
        .and('have.attr', 'aria-label', 'Custom information');
      trigger().realClick();
      root().should('have.attr', 'aria-owns', 'owner-supplied');
    });

    it('button-only composition has a self/label naming relationship and native Escape restoration', () => {
      mount(
        <InfoLabel
          label={{ children: null }}
          infoButton={{ info: 'Only information', 'aria-label': 'Information about records' }}
        />,
      );
      label().should('be.empty');
      trigger().focus().realPress('Space');
      surface().should('have.text', 'Only information').and('have.focus').realPress('Escape');
      trigger().should('have.focus');
    });
  });

  describe('InfoLabel documented contracts (round 1)', () => {
    (['click', 'Enter', 'Space'] as const).forEach(key => {
      it(`native ${key} opens note, moves focus, establishes aria ownership and Escape restores focus`, () => {
        mount(<InfoLabel info="Additional information">Record name</InfoLabel>);
        root().should('not.have.attr', 'aria-owns');
        if (key === 'click') {
          trigger().realClick();
        } else {
          trigger().focus().realPress(key);
        }
        surface().should('have.text', 'Additional information').and('have.focus');
        surface()
          .invoke('attr', 'id')
          .then(id => root().should('have.attr', 'aria-owns', id));
        surface().realPress('Escape');
        surface().should('not.exist');
        trigger().should('have.focus');
        root().should('not.have.attr', 'aria-owns');
      });
    });

    (['small', 'medium', 'large'] as const).forEach((size, index) => {
      it(`${size}: label typography, measured button target and negative-margin alignment`, () => {
        mount(
          <InfoLabel size={size} info="Information">
            Name
          </InfoLabel>,
        );
        label().should('have.css', 'font-size', `${[12, 14, 16][index]}px`);
        trigger().should($button => {
          const rect = $button[0].getBoundingClientRect();
          expect(rect.width).to.equal([20, 24, 24][index]);
          expect(rect.height).to.equal([20, 24, 24][index]);
        });
        trigger().should('have.css', 'margin-top', index === 2 ? '-1px' : '-2px');
      });
    });

    it('required asterisk belongs to the label before the info button', () => {
      mount(
        <InfoLabel info="Information" required>
          Required field
        </InfoLabel>,
      );
      label().find('.fui-Label__required').should('have.text', '*');
      root().children().first().should('have.class', 'fui-InfoLabel__label');
      root().children().last().should('have.class', 'fui-InfoLabel__infoButton');
    });

    it('Field slot-render pattern associates native label and input; button retains compound name', () => {
      mount(
        <Field
          label={{
            children: (_: unknown, props: LabelProps) => (
              <InfoLabel {...props} info="Field information">
                Field name
              </InfoLabel>
            ),
          }}
        >
          <Input />
        </Field>,
      );
      label()
        .invoke('attr', 'for')
        .then(id => {
          cy.get(`[id="${id}"]`).should('have.prop', 'tagName', 'INPUT');
          label().realClick();
          cy.get(`[id="${id}"]`).should('have.focus');
        });
      trigger()
        .invoke('attr', 'aria-labelledby')
        .then(ids => {
          const [labelId, buttonId] = ids!.split(' ');
          label().should('have.id', labelId);
          trigger().should('have.id', buttonId);
        });
    });

    it('focus alone does not open supplemental information', () => {
      mount(<InfoLabel info="Supplemental information">Name</InfoLabel>);
      trigger().focus().should('have.focus');
      surface().should('not.exist');
      root().should('not.have.attr', 'aria-owns');
    });
  });
});
