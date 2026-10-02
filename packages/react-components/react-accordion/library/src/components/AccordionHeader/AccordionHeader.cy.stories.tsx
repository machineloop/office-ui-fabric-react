import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Accordion, AccordionItem, AccordionPanel } from '../../index';
import { AccordionHeader } from './AccordionHeader';
import type { AccordionHeaderProps } from './AccordionHeader.types';
import { Default } from '../../../../stories/src/Accordion/AccordionDefault.stories';
import { HeadingLevels } from '../../../../stories/src/Accordion/AccordionHeaders.stories';
import { Sizes } from '../../../../stories/src/Accordion/AccordionSizes.stories';
import { Inline } from '../../../../stories/src/Accordion/AccordionInline.stories';
import { Disabled } from '../../../../stories/src/Accordion/AccordionDisabled.stories';
import { ExpandIconPosition } from '../../../../stories/src/Accordion/AccordionExpandIconPosition.stories';
import { ExpandIcon } from '../../../../stories/src/Accordion/AccordionExpandIcon.stories';
import { WithIcon } from '../../../../stories/src/Accordion/AccordionWithIcon.stories';
import { useAccordionHeaderContext_unstable } from '../../contexts/accordionHeader';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const header = (props: AccordionHeaderProps = {}, disabled = false) =>
  render(
    <Accordion collapsible>
      <AccordionItem value="a" disabled={disabled}>
        <AccordionHeader id="header" button={{ id: 'trigger' }} {...props}>
          Section
        </AccordionHeader>
        <AccordionPanel id="panel">
          <button id="action">Action</button>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>,
  );
const expanded = (value: boolean) => cy.get('#trigger').should('have.attr', 'aria-expanded', String(value));

describe('AccordionHeader documented stories', () => {
  it('renders a div root with a named native button and closed content', () => {
    render(<Default />);
    cy.get('.fui-AccordionHeader').first().should('have.prop', 'tagName', 'DIV');
    cy.contains('button', 'Accordion Header 1').should('have.attr', 'aria-expanded', 'false').realClick();
    cy.contains('button', 'Accordion Header 1').should('have.attr', 'aria-expanded', 'true');
    cy.contains('Accordion Panel 1').should('be.visible');
  });

  it('places each documented heading around its interactive button', () => {
    render(<HeadingLevels />);
    for (const level of [1, 2, 3, 4]) {
      cy.get(`h${level} > button`).should('have.text', `Accordion Header as h${level}`).realClick();
      cy.get(`h${level} > button`).should('have.attr', 'aria-expanded', 'true');
    }
  });

  it('renders all documented sizes with their actual font and target dimensions', () => {
    render(<Sizes />);
    const sizes = [
      ['Small', 12, 32],
      ['Medium', 14, 44],
      ['Large', 16, 44],
      ['Extra-Large', 20, 44],
    ] as const;
    for (const [name, font, height] of sizes) {
      cy.contains('button', `${name} Header`)
        .should('have.css', 'font-size', `${font}px`)
        .should($node => {
          expect($node[0].getBoundingClientRect().height).to.be.at.least(height);
        })
        .realClick();
      cy.contains('button', `${name} Header`).should('have.attr', 'aria-expanded', 'true');
    }
  });

  it('uses intrinsic-width inline headers instead of stretching to the accordion', () => {
    render(<Inline />);
    cy.get('.fui-AccordionHeader')
      .first()
      .should('have.css', 'display', 'inline-block')
      .should($node => {
        expect($node[0].getBoundingClientRect().width).to.be.lessThan(
          $node[0].closest('.fui-Accordion')!.getBoundingClientRect().width,
        );
      });
    cy.get('.fui-AccordionHeader__button').first().should('have.css', 'display', 'inline-flex').realClick();
    cy.get('.fui-AccordionHeader__button').first().should('have.attr', 'aria-expanded', 'true');
  });

  it('keeps all disabled story buttons natively disabled and closed on pointer input', () => {
    render(<Disabled />);
    cy.get('.fui-AccordionHeader__button').each($node => {
      cy.wrap($node).should('be.disabled').realClick();
      cy.wrap($node).should('have.attr', 'aria-expanded', 'false');
    });
    cy.get('.fui-AccordionPanel').should('not.exist');
  });

  it('puts end and start expand slots at the documented DOM and visual edges', () => {
    render(<ExpandIconPosition />);
    cy.get('.fui-AccordionHeader__button')
      .eq(0)
      .should($node => {
        expect($node[0].lastElementChild).to.have.class('fui-AccordionHeader__expandIcon');
      });
    cy.get('.fui-AccordionHeader__button')
      .eq(1)
      .should($node => {
        expect($node[0].firstElementChild).to.have.class('fui-AccordionHeader__expandIcon');
      });
  });

  it('changes the custom expand icon when the controlled story opens', () => {
    render(<ExpandIcon />);
    cy.get('.fui-AccordionHeader__expandIcon svg')
      .first()
      .then($closed => {
        const path = $closed[0].innerHTML;
        cy.contains('button', 'Accordion Header 1').realClick();
        cy.get('.fui-AccordionHeader__expandIcon svg')
          .first()
          .should($open => expect($open[0].innerHTML).not.to.equal(path));
        cy.contains('button', 'Accordion Header 1').should('have.attr', 'aria-expanded', 'true');
      });
  });

  it('renders a content icon between the expand icon and label without changing the accessible name', () => {
    render(<WithIcon />);
    cy.get('.fui-AccordionHeader__button')
      .first()
      .should($node => {
        expect($node[0].children[0]).to.have.class('fui-AccordionHeader__expandIcon');
        expect($node[0].children[1]).to.have.class('fui-AccordionHeader__icon');
        expect(computeAccessibleName($node[0])).to.equal('Accordion Header 1');
      });
  });
});

describe('AccordionHeader native input and state boundaries', () => {
  for (const as of ['button', 'a'] as const) {
    for (const slotDisabled of [false, undefined]) {
      it(`retains item disability for a ${as} slot with disabled=${String(slotDisabled)}`, () => {
        const toggle = cy.spy().as('disabledSlotToggle');
        const click = cy.spy().as('disabledSlotClick');
        render(
          <>
            <button id="before-disabled">Before</button>
            <Accordion collapsible onToggle={toggle}>
              <AccordionItem value="a" disabled>
                <AccordionHeader
                  button={{
                    as,
                    id: 'blocked-slot',
                    disabled: slotDisabled,
                    onClick: click,
                    tabIndex: as === 'a' ? -1 : undefined,
                  }}
                >
                  Blocked
                </AccordionHeader>
                <AccordionPanel id="blocked-panel">Blocked content</AccordionPanel>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionHeader button={{ id: 'enabled-slot' }}>Enabled</AccordionHeader>
                <AccordionPanel id="enabled-panel">Enabled content</AccordionPanel>
              </AccordionItem>
            </Accordion>
          </>,
        );
        cy.get('#before-disabled').realClick();
        cy.realPress('Tab');
        cy.get('#enabled-slot').should('be.focused');
        cy.get('#blocked-slot').realClick();
        if (as === 'button') {
          cy.get('#blocked-slot').should('be.disabled');
          cy.get('#before-disabled').focus();
          cy.get('#blocked-slot').then($node => $node[0].focus());
          cy.get('#before-disabled').should('be.focused');
        } else {
          cy.get('#blocked-slot').should('have.attr', 'aria-disabled', 'true').focus().should('be.focused');
        }
        cy.realPress('Enter');
        cy.realPress('Space');
        cy.get('#blocked-slot').should('have.attr', 'aria-expanded', 'false');
        cy.get('#blocked-panel').should('not.exist');
        cy.get('@disabledSlotToggle').should('not.have.been.called');
        cy.get('@disabledSlotClick').should('not.have.been.called');
        cy.get('#enabled-slot').focus();
        cy.realPress('Enter');
        cy.get('#enabled-panel').should('be.visible');
        cy.get('@disabledSlotToggle').should('have.been.calledOnce');
      });
    }
  }

  for (const key of ['Enter', 'Space'] as const) {
    it(`opens and closes using native ${key} with focus and click count preserved`, () => {
      const click = cy.spy().as('click');
      header({ button: { id: 'trigger', onClick: click } });
      cy.get('#trigger').focus();
      cy.realPress(key);
      expanded(true);
      cy.get('#panel').should('be.visible');
      cy.get('#trigger').should('have.focus');
      cy.get('@click').should('have.been.calledOnce');
      cy.realPress(key);
      expanded(false);
      cy.get('#panel').should('not.exist');
      cy.get('@click').should('have.been.calledTwice');
    });
  }

  it('ignores unrelated native keys and accepts pointer activation as a positive control', () => {
    const click = cy.spy().as('click');
    header({ button: { id: 'trigger', onClick: click } });
    cy.get('#trigger').focus();
    for (const key of ['Escape', 'a', 'ArrowLeft', 'ArrowRight'] as const) {
      cy.realPress(key);
    }
    expanded(false);
    cy.get('@click').should('not.have.been.called');
    cy.get('#trigger').realClick();
    expanded(true);
    cy.get('@click').should('have.been.calledOnce');
  });

  it('blocks disabled input and skips its native button in tab order with enabled control', () => {
    const click = cy.spy().as('click');
    render(
      <>
        <button id="before">Before</button>
        <Accordion collapsible>
          <AccordionItem value="a" disabled>
            <AccordionHeader button={{ id: 'disabled', onClick: click }}>Disabled</AccordionHeader>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionHeader button={{ id: 'enabled', onClick: click }}>Enabled</AccordionHeader>
          </AccordionItem>
        </Accordion>
      </>,
    );
    cy.get('#disabled').realClick();
    cy.get('#disabled').should('have.attr', 'aria-expanded', 'false');
    cy.get('@click').should('not.have.been.called');
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#enabled').should('have.focus');
    cy.realPress('Enter');
    cy.get('#enabled').should('have.attr', 'aria-expanded', 'true');
    cy.get('@click').should('have.been.calledOnce');
  });

  it('keeps the sole open non-collapsible header focusable without invoking its click handler', () => {
    const click = cy.spy().as('click');
    render(
      <>
        <button id="before">Before</button>
        <Accordion defaultOpenItems="a">
          <AccordionItem value="a">
            <AccordionHeader button={{ id: 'trigger', onClick: click }}>Section</AccordionHeader>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionHeader button={{ id: 'other' }}>Other</AccordionHeader>
          </AccordionItem>
        </Accordion>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#trigger').should('have.attr', 'aria-disabled', 'true').and('not.be.disabled').and('have.focus');
    cy.realPress('Space');
    expanded(true);
    cy.get('#trigger').should('have.focus');
    cy.get('#trigger').realClick();
    cy.get('@click').should('not.have.been.called');
    cy.get('#other').realClick().should('have.attr', 'aria-expanded', 'true');
    cy.get('#trigger').should('not.have.attr', 'aria-disabled');
    cy.get('#trigger').realClick();
    expanded(true);
    cy.get('@click').should('have.been.calledOnce');
  });

  it('allows multiple open headers to collapse until only one remains', () => {
    render(
      <Accordion multiple defaultOpenItems={['a', 'b']}>
        <AccordionItem value="a">
          <AccordionHeader button={{ id: 'trigger' }}>Section</AccordionHeader>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionHeader button={{ id: 'other' }}>Other</AccordionHeader>
        </AccordionItem>
      </Accordion>,
    );
    cy.get('#trigger').should('not.have.attr', 'aria-disabled');
    cy.get('#trigger').realClick();
    expanded(false);
    cy.get('#other').should('have.attr', 'aria-disabled', 'true').realClick();
    cy.get('#other').should('have.attr', 'aria-expanded', 'true');
  });

  it('honors a button slot click cancellation without suppressing the consumer callback', () => {
    const click = cy.spy().as('click');
    header({
      button: {
        id: 'trigger',
        onClick: (ev: React.MouseEvent<HTMLButtonElement>) => {
          click();
          ev.preventDefault();
        },
      },
    });
    cy.get('#trigger').realClick();
    expanded(false);
    cy.get('#trigger').focus();
    cy.realPress('Space');
    expanded(false);
    cy.get('@click').should('have.been.calledTwice');
  });

  it('keeps controlled open state owner-authoritative and sends precise toggle data', () => {
    const toggle = cy.spy().as('toggle');
    render(
      <Accordion collapsible openItems={[]} onToggle={toggle}>
        <AccordionItem value={0}>
          <AccordionHeader button={{ id: 'trigger' }}>Zero</AccordionHeader>
        </AccordionItem>
      </Accordion>,
    );
    cy.get('#trigger').realClick();
    expanded(false);
    cy.get('@toggle')
      .should('have.been.calledOnce')
      .its('firstCall.args.1')
      .should('deep.equal', { value: 0, openItems: [0] });
  });

  it('tabs from the open header into panel content and back with Shift+Tab', () => {
    header();
    cy.get('#trigger').realClick().focus();
    cy.realPress('Tab');
    cy.get('#action').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#trigger').should('have.focus');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    for (const position of ['start', 'end'] as const) {
      it(`positions and rotates the ${position} chevron in ${dir}`, () => {
        render(
          <Accordion collapsible>
            <AccordionItem value="a">
              <AccordionHeader button={{ id: 'trigger' }} expandIconPosition={position}>
                <span id="label">Section</span>
              </AccordionHeader>
            </AccordionItem>
          </Accordion>,
          dir,
        );
        const closed = position === 'end' ? 90 : dir === 'rtl' ? 180 : 0;
        const open = position === 'end' ? -90 : 90;
        cy.get('#trigger .fui-AccordionHeader__expandIcon svg')
          .should('have.attr', 'style')
          .and('contain', `rotate(${closed}deg)`);
        cy.get('#trigger .fui-AccordionHeader__expandIcon').then($icon => {
          cy.get('#label').should($label => {
            const icon = $icon[0].getBoundingClientRect();
            const label = $label[0].getBoundingClientRect();
            const iconIsLeft = (position === 'start') === (dir === 'ltr');
            expect(iconIsLeft ? icon.right <= label.left : icon.left >= label.right).to.equal(true);
          });
        });
        cy.get('#trigger').focus();
        cy.realPress('Enter');
        expanded(true);
        cy.get('#trigger .fui-AccordionHeader__expandIcon svg')
          .should('have.attr', 'style')
          .and('contain', `rotate(${open}deg)`);
      });
    }
  }

  it('passes ordinary axe rules with a named button inside a semantic heading', () => {
    header({ as: 'h2' });
    cy.get('#header').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});

describe('AccordionHeader source and conformance contracts', () => {
  for (const as of ['h5', 'h6'] as const) {
    it(`supports the remaining public ${as} heading root with unchanged button semantics`, () => {
      header({ as });
      cy.get('#header').should('have.prop', 'tagName', as.toUpperCase());
      cy.get('#trigger').should('have.attr', 'type', 'button').realClick();
      expanded(true);
    });
  }

  it('removes the expand slot when null and preserves a custom expand child without default chevrons', () => {
    const Owner = () => {
      const [custom, setCustom] = React.useState(false);
      return (
        <Accordion collapsible>
          <AccordionItem value="a">
            <AccordionHeader button={{ id: 'trigger' }} expandIcon={custom ? <span id="custom">+</span> : null}>
              Section
            </AccordionHeader>
          </AccordionItem>
          <button id="customize" onClick={() => setCustom(true)}>
            Customize
          </button>
        </Accordion>
      );
    };
    render(<Owner />);
    cy.get('.fui-AccordionHeader__expandIcon').should('not.exist');
    cy.get('#trigger').realClick();
    expanded(true);
    cy.get('#customize').realClick();
    cy.get('#custom').should('be.visible');
    cy.get('.fui-AccordionHeader__expandIcon svg').should('not.exist');
    cy.get('.fui-AccordionHeader__expandIcon').should('have.attr', 'aria-hidden', 'true');
  });

  it('forwards independent root and button refs and clears both after committed unmount', () => {
    const root = React.createRef<HTMLDivElement>();
    const buttonRef = React.createRef<HTMLButtonElement>();
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          <Accordion collapsible>
            <AccordionItem value="a">
              {show && (
                <AccordionHeader id="header" as="h2" ref={root} button={{ id: 'trigger', ref: buttonRef }}>
                  Section
                </AccordionHeader>
              )}
            </AccordionItem>
          </Accordion>
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#header').should($node => expect(root.current).to.equal($node[0]));
    cy.get('#trigger').should($node => expect(buttonRef.current).to.equal($node[0]));
    cy.get('#remove').realClick();
    cy.get('#header')
      .should('not.exist')
      .then(() => {
        expect(root.current).to.equal(null);
        expect(buttonRef.current).to.equal(null);
      });
  });

  it('composes root, button, icon and expand class names and native metadata', () => {
    header({
      className: 'root-custom',
      title: 'Heading',
      button: { id: 'trigger', className: 'button-custom', title: 'Expand', name: 'section', value: 'a' },
      icon: { id: 'icon', className: 'icon-custom', children: '●' },
      expandIcon: { id: 'expand', className: 'expand-custom' },
    });
    cy.get('#header')
      .should('have.class', 'fui-AccordionHeader')
      .and('have.class', 'root-custom')
      .and('have.attr', 'title', 'Heading');
    cy.get('#trigger')
      .should('have.class', 'fui-AccordionHeader__button')
      .and('have.class', 'button-custom')
      .and('have.attr', 'title', 'Expand')
      .and('have.attr', 'name', 'section')
      .and('have.attr', 'value', 'a');
    cy.get('#icon').should('have.class', 'fui-AccordionHeader__icon').and('have.class', 'icon-custom');
    cy.get('#expand')
      .should('have.class', 'fui-AccordionHeader__expandIcon')
      .and('have.class', 'expand-custom')
      .and('have.attr', 'aria-hidden', 'true');
    cy.get('#icon').realClick();
    expanded(true);
  });

  it('does not submit enclosing forms through native Enter activation', () => {
    const submit = cy.spy().as('submit');
    render(
      <form
        onSubmit={ev => {
          ev.preventDefault();
          submit();
        }}
      >
        <Accordion collapsible>
          <AccordionItem value="a">
            <AccordionHeader button={{ id: 'trigger' }}>Section</AccordionHeader>
          </AccordionItem>
        </Accordion>
        <button id="submit" type="submit">
          Submit
        </button>
      </form>,
    );
    cy.get('#trigger').focus();
    cy.realPress('Enter');
    expanded(true);
    cy.get('@submit').should('not.have.been.called');
    cy.get('#submit').realClick();
    cy.get('@submit').should('have.been.calledOnce');
  });

  it('supports a href-less anchor button slot with native keyboard activation', () => {
    header({ button: { as: 'a', id: 'trigger' } });
    cy.get('#trigger').should('have.prop', 'tagName', 'A').and('have.attr', 'role', 'button').focus();
    cy.realPress('Space');
    expanded(true);
    cy.realPress('Enter');
    expanded(false);
  });

  it('uses updated slot handlers after owner renders while preserving open state and root', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const Owner = () => {
      const [update, setUpdate] = React.useState(false);
      return (
        <>
          <Accordion collapsible>
            <AccordionItem value="a">
              <AccordionHeader id="header" button={{ id: 'trigger', onClick: update ? second : first }}>
                Section
              </AccordionHeader>
            </AccordionItem>
          </Accordion>
          <button id="update" onClick={() => setUpdate(true)}>
            Update
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#header').then($original => {
      cy.get('#trigger').realClick();
      expanded(true);
      cy.get('#update').realClick();
      cy.get('#header').should($current => expect($current[0]).to.equal($original[0]));
      cy.get('#trigger').realClick();
      expanded(false);
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@second').should('have.been.calledOnce');
    });
  });

  it('updates item disability and restores real keyboard interaction without remounting', () => {
    const Owner = () => {
      const [disabled, setDisabled] = React.useState(false);
      return (
        <>
          <Accordion collapsible>
            <AccordionItem value="a" disabled={disabled}>
              <AccordionHeader button={{ id: 'trigger' }}>Section</AccordionHeader>
            </AccordionItem>
          </Accordion>
          <button id="disable" onClick={() => setDisabled(value => !value)}>
            Disable
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#trigger').realClick();
    expanded(true);
    cy.get('#disable').realClick();
    cy.get('#trigger').should('be.disabled').realClick();
    expanded(true);
    cy.get('#disable').realClick();
    cy.get('#trigger').should('not.be.disabled').focus();
    cy.realPress('Space');
    expanded(false);
  });

  it('publishes live header context to custom child content across item and owner updates', () => {
    const Consumer = () => {
      const value = useAccordionHeaderContext_unstable();
      return <span id="context">{JSON.stringify(value)}</span>;
    };
    const Owner = () => {
      const [large, setLarge] = React.useState(false);
      return (
        <>
          <Accordion collapsible>
            <AccordionItem value="a">
              <AccordionHeader
                button={{ id: 'trigger' }}
                size={large ? 'large' : 'medium'}
                expandIconPosition={large ? 'end' : 'start'}
              >
                Section <Consumer />
              </AccordionHeader>
            </AccordionItem>
          </Accordion>
          <button id="update" onClick={() => setLarge(true)}>
            Update
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#context')
      .invoke('text')
      .then(text =>
        expect(JSON.parse(text)).to.deep.equal({
          disabled: false,
          open: false,
          size: 'medium',
          expandIconPosition: 'start',
        }),
      );
    cy.get('#trigger').realClick();
    cy.get('#update').realClick();
    cy.get('#context').should($node =>
      expect(JSON.parse($node.text())).to.deep.equal({
        disabled: false,
        open: true,
        size: 'large',
        expandIconPosition: 'end',
      }),
    );
  });

  it('changes expanded ARIA and chevron state on external controlled updates', () => {
    const Owner = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <Accordion collapsible openItems={open ? ['a'] : []}>
            <AccordionItem value="a">
              <AccordionHeader button={{ id: 'trigger' }}>Section</AccordionHeader>
            </AccordionItem>
          </Accordion>
          <button id="external" onClick={() => setOpen(value => !value)}>
            External
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#external').realClick();
    expanded(true);
    cy.get('#trigger svg').should('have.attr', 'style').and('contain', 'rotate(90deg)');
    cy.get('#external').realClick();
    expanded(false);
    cy.get('#trigger svg').should('have.attr', 'style').and('contain', 'rotate(0deg)');
  });
});
