import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { InteractionTag, InteractionTagSecondary, TagGroup } from '../../index';
import { InteractionTagPrimary } from './InteractionTagPrimary';
import type { InteractionTagPrimaryProps } from './InteractionTagPrimary.types';
import { computeAccessibleName } from 'dom-accessibility-api';
import { Default } from '../../../../stories/src/InteractionTag/InteractionTagDefault.stories';
import { Icon } from '../../../../stories/src/InteractionTag/InteractionTagIcon.stories';
import { Media } from '../../../../stories/src/InteractionTag/InteractionTagMedia.stories';
import { SecondaryText } from '../../../../stories/src/InteractionTag/InteractionTagSecondaryText.stories';
import { Appearance } from '../../../../stories/src/InteractionTag/InteractionTagAppearance.stories';
import { Size } from '../../../../stories/src/InteractionTag/InteractionTagSize.stories';
import { Shape } from '../../../../stories/src/InteractionTag/InteractionTagShape.stories';
import { HasPrimaryAction } from '../../../../stories/src/InteractionTag/InteractionTagHasPrimaryAction.stories';
import { Avatar } from '@fluentui/react-avatar';
import {
  CalendarMonthFilled,
  CalendarMonthRegular,
  bundleIcon,
  iconFilledClassName,
  iconRegularClassName,
} from '@fluentui/react-icons';
import * as axe from 'axe-core';

const CalendarIcon = bundleIcon(CalendarMonthFilled, CalendarMonthRegular);
const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const primary = (props: InteractionTagPrimaryProps = {}) =>
  render(
    <InteractionTag>
      <InteractionTagPrimary id="primary" {...props}>
        Calendar
      </InteractionTagPrimary>
    </InteractionTag>,
  );
const cssColor = (value: string) => {
  const probe = document.createElement('span');
  probe.style.color = value;
  return probe.style.color;
};

describe('InteractionTagPrimary documented slots and styling', () => {
  it('renders default children inside the primary-text slot with a native named action', () => {
    render(<Default />);
    cy.get('.fui-InteractionTagPrimary')
      .should('have.prop', 'tagName', 'BUTTON')
      .and('have.attr', 'type', 'button')
      .should($node => expect(computeAccessibleName($node[0])).to.equal('Primary text'));
    cy.get('.fui-InteractionTagPrimary__primaryText').should('have.text', 'Primary text');
  });

  it('renders the documented leading icon separately from primary text', () => {
    render(<Icon />);
    cy.get('.fui-InteractionTagPrimary__icon svg').should('be.visible');
    cy.get('.fui-InteractionTagPrimary').should($node =>
      expect($node[0].firstElementChild).to.have.class('fui-InteractionTagPrimary__icon'),
    );
  });

  it('provides avatar sizing and shape to the documented media child', () => {
    render(<Media />);
    cy.get('.fui-InteractionTagPrimary__media .fui-Avatar')
      .should('have.css', 'border-top-left-radius', '4px')
      .should($node => expect($node[0].getBoundingClientRect().height).to.equal(28));
  });

  it('renders secondary text in a separate slot below primary text with a combined accessible name', () => {
    render(<SecondaryText />);
    cy.get('.fui-InteractionTagPrimary__primaryText').then($primary => {
      cy.get('.fui-InteractionTagPrimary__secondaryText').should($secondary =>
        expect($secondary[0].getBoundingClientRect().top).to.be.at.least(
          $primary[0].getBoundingClientRect().bottom - 1,
        ),
      );
    });
    cy.get('.fui-InteractionTagPrimary').should($node =>
      expect(computeAccessibleName($node[0])).to.equal('Primary text Secondary text'),
    );
  });

  it('uses exact filled, outlined and brand rest colors from the documented appearance story', () => {
    render(<Appearance />);
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get('.fui-InteractionTagPrimary')
      .eq(0)
      .should('have.css', 'background-color', cssColor(webLightTheme.colorNeutralBackground3));
    cy.get('.fui-InteractionTagPrimary').eq(1).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
    cy.get('.fui-InteractionTagPrimary')
      .eq(2)
      .should('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackground2));
  });

  it('inherits all documented size-specific heights and media dimensions', () => {
    render(<Size />);
    for (const [index, height, avatar] of [
      [0, 32, 28],
      [3, 24, 20],
      [6, 20, 16],
    ] as const) {
      cy.get('.fui-InteractionTagPrimary')
        .eq(index)
        .should($node => expect($node[0].getBoundingClientRect().height).to.equal(height));
      cy.get('.fui-Avatar')
        .eq(index / 3)
        .should($node => expect($node[0].getBoundingClientRect().height).to.equal(avatar));
    }
  });

  it('flattens only the shared action edge while retaining the documented outer shape', () => {
    render(<Shape />);
    cy.get('.fui-InteractionTagPrimary')
      .eq(0)
      .should('have.css', 'border-top-left-radius', '4px')
      .and('have.css', 'border-top-right-radius', '4px');
    cy.get('.fui-InteractionTagPrimary')
      .eq(1)
      .should('have.css', 'border-top-right-radius', webLightTheme.borderRadiusCircular);
    cy.get('.fui-InteractionTagPrimary')
      .eq(2)
      .should('have.css', 'border-top-right-radius', '0px')
      .and('have.css', 'border-top-left-radius', '4px');
    cy.get('.fui-InteractionTagPrimary')
      .eq(3)
      .should('have.css', 'border-top-right-radius', '0px')
      .and('have.css', 'border-top-left-radius', webLightTheme.borderRadiusCircular);
  });

  it('acts as the documented keyboard popover trigger without activating the secondary action', () => {
    render(<HasPrimaryAction />);
    cy.get('.fui-InteractionTagPrimary').focus();
    cy.realPress('Space');
    cy.get('.fui-PopoverSurface').should('be.visible');
    cy.realPress('Escape');
    cy.get('.fui-PopoverSurface').should('not.exist');
    cy.get('.fui-InteractionTagPrimary').should('have.focus');
  });
});

describe('InteractionTagPrimary native action and target boundaries', () => {
  for (const key of ['Enter', 'Space'] as const) {
    it(`uses one native ${key} click with consumer and group callbacks while retaining focus`, () => {
      const click = cy.spy().as('click');
      const select = cy.spy().as('select');
      render(
        <TagGroup onTagSelect={select} aria-label="Calendar">
          <InteractionTag value="a">
            <InteractionTagPrimary id="primary" onClick={click}>
              Calendar
            </InteractionTagPrimary>
          </InteractionTag>
        </TagGroup>,
      );
      cy.get('#primary').focus();
      cy.realPress(key);
      cy.get('@click').should('have.been.calledOnce');
      cy.get('@select').should('have.been.calledOnce');
      cy.get('#primary').should('have.focus').and('have.attr', 'aria-pressed', 'true');
      cy.realPress(key);
      cy.get('@click').should('have.been.calledTwice');
      cy.get('#primary').should('have.attr', 'aria-pressed', 'false');
    });
  }

  it('ignores unrelated keys and honors cancellation of native keyboard activation', () => {
    const click = cy.spy().as('click');
    primary({
      onClick: click,
      onKeyDown: event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
        }
      },
    });
    cy.get('#primary').focus();
    for (const key of ['Escape', 'ArrowLeft', 'ArrowRight', 'a', 'Enter', 'Space'] as const) {
      cy.realPress(key);
    }
    cy.get('@click').should('not.have.been.called');
    cy.get('#primary').realClick();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('makes a locally disabled selected action visibly disabled and blocks its native activation', () => {
    const click = cy.spy().as('click');
    render(
      <InteractionTag selected>
        <InteractionTagPrimary id="primary" disabled onClick={click}>
          Calendar
        </InteractionTagPrimary>
      </InteractionTag>,
    );
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get('#primary').should('be.disabled');
    cy.get('#primary')
      .should('have.css', 'background-color', cssColor(webLightTheme.colorNeutralBackgroundDisabled))
      .and('have.css', 'color', cssColor(webLightTheme.colorNeutralForegroundDisabled));
    cy.get('#primary').realClick();
    cy.get('@click').should('not.have.been.called');
  });

  for (const origin of ['tag', 'group'] as const) {
    it(`prevents explicit child enabled props from bypassing ${origin} disability`, () => {
      const click = cy.spy().as('click');
      const select = cy.spy().as('select');
      const dismiss = cy.spy().as('dismiss');
      render(
        <>
          <TagGroup disabled={origin === 'group'} onTagSelect={select} onDismiss={dismiss} aria-label="Calendar">
            <InteractionTag disabled={origin === 'tag'}>
              <InteractionTagPrimary id="primary" disabled={false} onClick={click} hasSecondaryAction>
                Calendar
              </InteractionTagPrimary>
              <InteractionTagSecondary id="secondary" disabled={false} aria-label="remove" />
            </InteractionTag>
          </TagGroup>
          <InteractionTag>
            <InteractionTagPrimary id="enabled" onClick={click}>
              Enabled
            </InteractionTagPrimary>
          </InteractionTag>
        </>,
      );
      cy.get('#primary').realClick();
      cy.get('#secondary').realClick();
      cy.get('@click').should('not.have.been.called');
      cy.get('@select').should('not.have.been.called');
      cy.get('@dismiss').should('not.have.been.called');
      cy.get('#primary').should('be.disabled');
      cy.get('#secondary').should('be.disabled');
      cy.get('#enabled').focus();
      cy.realPress('Enter');
      cy.get('@click').should('have.been.calledOnce');
    });
  }

  for (const [appearance, rest, hover, pressed] of [
    [
      'filled',
      webLightTheme.colorNeutralBackground3,
      webLightTheme.colorNeutralBackground3Hover,
      webLightTheme.colorNeutralBackground3Pressed,
    ],
    [
      'outline',
      'rgba(0, 0, 0, 0)',
      webLightTheme.colorSubtleBackgroundHover,
      webLightTheme.colorSubtleBackgroundPressed,
    ],
    [
      'brand',
      webLightTheme.colorBrandBackground2,
      webLightTheme.colorBrandBackground2Hover,
      webLightTheme.colorBrandBackground2Pressed,
    ],
  ] as const) {
    it(`reaches exact ${appearance} rest, hover and held pointer endpoints without premature clicks`, () => {
      const click = cy.spy().as('click');
      render(
        <InteractionTag appearance={appearance}>
          <InteractionTagPrimary id="primary" onClick={click}>
            Calendar
          </InteractionTagPrimary>
        </InteractionTag>,
      );
      cy.get('body').realHover({ position: 'bottomRight' });
      cy.get('#primary').should('have.css', 'background-color', cssColor(rest));
      cy.get('#primary').realHover();
      cy.get('#primary').should('have.css', 'background-color', cssColor(hover));
      cy.get('#primary').realMouseDown();
      cy.get('#primary').should('have.css', 'background-color', cssColor(pressed));
      cy.get('@click').should('not.have.been.called');
      cy.get('#primary').realMouseUp();
      cy.get('@click').should('have.been.calledOnce');
    });
  }

  it('uses selected colors on hover and press and restores focus on release', () => {
    const click = cy.spy().as('click');
    render(
      <InteractionTag selected>
        <InteractionTagPrimary id="primary" onClick={click}>
          Calendar
        </InteractionTagPrimary>
      </InteractionTag>,
    );
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get('#primary').should('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackground));
    cy.get('#primary').realHover();
    cy.get('#primary').should('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackgroundHover));
    cy.get('#primary').realMouseDown();
    cy.get('#primary').should('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackgroundPressed));
    cy.get('#primary').realMouseUp();
    cy.get('@click').should('have.been.calledOnce');
    cy.get('#primary').should('have.focus');
  });

  it('switches the bundled outline icon on actual hover and restores the regular icon afterward', () => {
    render(
      <InteractionTag appearance="outline">
        <InteractionTagPrimary id="primary" icon={<CalendarIcon />}>
          Calendar
        </InteractionTagPrimary>
      </InteractionTag>,
    );
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get(`.${iconRegularClassName}`).should('be.visible');
    cy.get(`.${iconFilledClassName}`).should('not.be.visible');
    cy.get('#primary').realHover();
    cy.get(`.${iconRegularClassName}`).should('not.be.visible');
    cy.get(`.${iconFilledClassName}`).should('be.visible');
    cy.get('body').realHover({ position: 'bottomRight' });
    cy.get(`.${iconRegularClassName}`).should('be.visible');
    cy.get(`.${iconFilledClassName}`).should('not.be.visible');
  });

  it('provides a real extra-small target extending two pixels beyond each visible edge', () => {
    const click = cy.spy().as('click');
    render(
      <div style={{ padding: '24px' }}>
        <InteractionTag size="extra-small">
          <InteractionTagPrimary id="primary" onClick={click}>
            Calendar
          </InteractionTagPrimary>
        </InteractionTag>
      </div>,
    );
    cy.get('#primary').then($node => {
      const rect = $node[0].getBoundingClientRect();
      expect(rect.height).to.equal(20);
      const doc = $node[0].ownerDocument;
      const x = rect.left + rect.width / 2;
      expect(doc.elementFromPoint(x, rect.top - 1.5)).to.equal($node[0]);
      expect(doc.elementFromPoint(x, rect.bottom + 1.5)).to.equal($node[0]);
      expect(doc.elementFromPoint(x, rect.top - 1.99)).to.equal($node[0]);
      expect(doc.elementFromPoint(x, rect.bottom + 1.99)).to.equal($node[0]);
      expect(doc.elementFromPoint(x, rect.bottom + 2.5)).not.to.equal($node[0]);
      cy.get('#primary').realClick({ x: rect.width / 2, y: -1.5, scrollBehavior: false });
      cy.get('@click').should('have.been.calledOnce');
      cy.get('#primary').realClick({ x: rect.width / 2, y: rect.height + 1.5, scrollBehavior: false });
      cy.get('@click').should('have.been.calledTwice');
      cy.get('#primary').realClick({ x: rect.width / 2, y: -3, scrollBehavior: false });
      cy.get('@click').should('have.been.calledTwice');
    });
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`retains the outside round edge and flattens the shared action edge in ${dir}`, () => {
      render(
        <InteractionTag shape="circular">
          <InteractionTagPrimary id="primary" hasSecondaryAction>
            Calendar
          </InteractionTagPrimary>
          <InteractionTagSecondary aria-label="remove" />
        </InteractionTag>,
        dir,
      );
      const outer = dir === 'ltr' ? 'border-top-left-radius' : 'border-top-right-radius';
      const inner = dir === 'ltr' ? 'border-top-right-radius' : 'border-top-left-radius';
      cy.get('#primary').should('have.css', outer, webLightTheme.borderRadiusCircular).and('have.css', inner, '0px');
      cy.get('#primary').focus();
      cy.realPress('Tab');
      cy.get('.fui-InteractionTagSecondary').should('have.focus');
      cy.realPress(['Shift', 'Tab']);
      cy.get('#primary').should('have.focus');
    });
  }

  it('passes ordinary axe rules for a labeled icon-only primary action', () => {
    render(
      <InteractionTag>
        <InteractionTagPrimary id="primary" icon={<CalendarIcon />} aria-label="Calendar" />
      </InteractionTag>,
    );
    cy.get('#primary').should($node => expect(computeAccessibleName($node[0])).to.equal('Calendar'));
    cy.get('#primary').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});

describe('InteractionTagPrimary source and conformance contracts', () => {
  it('forwards every populated content slot without rendering ignored root children', () => {
    primary({
      className: 'custom-root',
      media: { id: 'media', className: 'custom-media', children: <Avatar name="Person" /> },
      primaryText: { id: 'text', className: 'custom-text', children: 'Override', title: 'Main' },
      secondaryText: { id: 'detail', className: 'custom-detail', children: 'Details' },
    });
    cy.get('#primary')
      .should('have.class', 'fui-InteractionTagPrimary')
      .and('have.class', 'custom-root')
      .should($node => {
        expect(computeAccessibleName($node[0])).to.equal('Person Main Details');
        expect($node.text()).not.to.contain('Calendar');
      });
    cy.get('#media').should('have.class', 'fui-InteractionTagPrimary__media').and('have.class', 'custom-media');
    cy.get('#text')
      .should('have.class', 'fui-InteractionTagPrimary__primaryText')
      .and('have.class', 'custom-text')
      .and('have.attr', 'title', 'Main')
      .and('have.text', 'Override');
    cy.get('#detail')
      .should('have.class', 'fui-InteractionTagPrimary__secondaryText')
      .and('have.class', 'custom-detail')
      .and('have.text', 'Details');
  });

  it('supports an absent primary text slot with a caller-provided complete accessible label', () => {
    primary({ primaryText: null, secondaryText: 'Details', 'aria-label': 'Calendar action' });
    cy.get('.fui-InteractionTagPrimary__primaryText').should('not.exist');
    cy.get('.fui-InteractionTagPrimary__secondaryText').should('have.text', 'Details');
    cy.get('#primary').should($node => expect(computeAccessibleName($node[0])).to.equal('Calendar action'));
  });

  it('retains generated default naming when the caller supplies an undefined id', () => {
    render(
      <InteractionTag>
        <InteractionTagPrimary id={undefined} hasSecondaryAction>
          Calendar
        </InteractionTagPrimary>
        <InteractionTagSecondary id="secondary" aria-label="remove" />
      </InteractionTag>,
    );
    cy.get('#secondary').should($node => {
      expect(computeAccessibleName($node[0])).to.equal('Calendar remove');
      const ids = $node.attr('aria-labelledby');
      if (!ids) {
        throw new Error('Combined secondary action name has no references');
      }
      for (const id of ids.split(' ')) {
        expect($node[0].ownerDocument.getElementById(id)).not.to.equal(null);
      }
    });
  });

  it('attaches object and content-slot refs and clears them after committed root unmount', () => {
    const rootRef = React.createRef<HTMLButtonElement>();
    const textRef = React.createRef<HTMLSpanElement>();
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          {show && (
            <InteractionTag>
              <InteractionTagPrimary
                id="primary"
                ref={rootRef}
                primaryText={{ id: 'text', ref: textRef, children: 'Calendar' }}
              />
            </InteractionTag>
          )}
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#primary').should($node => expect(rootRef.current).to.equal($node[0]));
    cy.get('#text').should($node => expect(textRef.current).to.equal($node[0]));
    cy.get('#remove').realClick();
    cy.get('#primary')
      .should('not.exist')
      .then(() => {
        expect(rootRef.current).to.equal(null);
        expect(textRef.current).to.equal(null);
      });
  });

  it('forwards a callback ref to the actual native action and sends unmount cleanup', () => {
    const ref = cy.spy().as('ref');
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          {show && (
            <InteractionTag>
              <InteractionTagPrimary id="primary" ref={ref}>
                Calendar
              </InteractionTagPrimary>
            </InteractionTag>
          )}
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#primary').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
    cy.get('#remove').realClick();
    cy.get('#primary').should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
  });

  it('forwards native form metadata without substituting it for group selection identity', () => {
    const select = cy.spy().as('select');
    render(
      <TagGroup onTagSelect={select} aria-label="Calendar">
        <InteractionTag value="tag-key">
          <InteractionTagPrimary
            id="primary"
            name="field"
            value="form-value"
            title="Calendar details"
            data-owner="calendar"
          >
            Calendar
          </InteractionTagPrimary>
        </InteractionTag>
      </TagGroup>,
    );
    cy.get('#primary')
      .should('have.attr', 'name', 'field')
      .and('have.attr', 'value', 'form-value')
      .and('have.attr', 'title', 'Calendar details')
      .and('have.attr', 'data-owner', 'calendar')
      .realClick();
    cy.get('@select').should('have.been.calledOnce').its('firstCall.args.1.value').should('equal', 'tag-key');
  });

  it('retains the same action node and correct padding when icon and secondary content change', () => {
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(value => !value)}>
            Update
          </button>
          <InteractionTag>
            <InteractionTagPrimary
              id="primary"
              icon={updated ? <CalendarIcon /> : null}
              secondaryText={updated ? 'Details' : null}
            >
              Calendar
            </InteractionTagPrimary>
          </InteractionTag>
        </>
      );
    };
    render(<Owner />);
    cy.get('#primary')
      .should('have.css', 'padding-left', '7px')
      .then($original => {
        cy.get('.fui-InteractionTagPrimary__icon').should('not.exist');
        cy.get('#update').realClick();
        cy.get('#primary').should($node => expect($node[0]).to.equal($original[0]));
        cy.get('.fui-InteractionTagPrimary__icon').should('be.visible');
        cy.get('.fui-InteractionTagPrimary__secondaryText').should('have.text', 'Details');
        cy.get('#update').realClick();
        cy.get('.fui-InteractionTagPrimary__icon').should('not.exist');
        cy.get('.fui-InteractionTagPrimary__secondaryText').should('not.exist');
        cy.get('#primary').should('have.css', 'padding-left', '7px');
      });
  });

  it('respects explicit avatar props over inherited media defaults', () => {
    primary({ media: <Avatar name="Person" size={40} shape="circular" /> });
    cy.get('.fui-Avatar')
      .should($node => expect($node[0].getBoundingClientRect().height).to.equal(40))
      .and('have.css', 'border-top-left-radius', webLightTheme.borderRadiusCircular);
  });

  it('uses refreshed handlers and restores locally disabled selected styling without remounting', () => {
    const first = cy.spy().as('first');
    const second = cy.spy().as('second');
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(true)}>
            Update
          </button>
          <InteractionTag selected>
            <InteractionTagPrimary id="primary" disabled={!updated} onClick={updated ? second : first}>
              Calendar
            </InteractionTagPrimary>
          </InteractionTag>
        </>
      );
    };
    render(<Owner />);
    cy.get('#primary')
      .should('be.disabled')
      .then($original => {
        cy.get('#primary').realClick();
        cy.get('@first').should('not.have.been.called');
        cy.get('#update').realClick();
        cy.get('#primary').should($node => expect($node[0]).to.equal($original[0]));
        cy.get('body').realHover({ position: 'bottomRight' });
        cy.get('#primary').should('have.css', 'background-color', cssColor(webLightTheme.colorBrandBackground));
        cy.get('#primary').focus();
        cy.realPress('Enter');
        cy.get('@second').should('have.been.calledOnce');
        cy.get('@first').should('not.have.been.called');
      });
  });

  it('supports explicit bounded ellipsis slot styles without losing the full accessible name', () => {
    const label = 'A very long calendar classification that exceeds the available width';
    render(
      <InteractionTag style={{ width: '120px' }}>
        <InteractionTagPrimary
          id="primary"
          style={{ minWidth: 0, maxWidth: '100%' }}
          primaryText={{ style: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }}
        >
          {label}
        </InteractionTagPrimary>
      </InteractionTag>,
    );
    cy.get('#primary').should($node => {
      expect($node[0].getBoundingClientRect().width).to.be.at.most(120);
      expect(computeAccessibleName($node[0])).to.equal(label);
    });
    cy.get('.fui-InteractionTagPrimary__primaryText')
      .should('have.css', 'text-overflow', 'ellipsis')
      .should($node => {
        expect($node[0].scrollWidth).to.be.greaterThan($node[0].clientWidth);
      });
  });

  it('preserves explicit reset behavior while the default action leaves form fields unchanged', () => {
    const click = cy.spy().as('click');
    render(
      <form>
        <input id="notes" aria-label="Notes" defaultValue="original" />
        <InteractionTag>
          <InteractionTagPrimary id="primary" onClick={click}>
            Action
          </InteractionTagPrimary>
        </InteractionTag>
        <InteractionTag>
          <InteractionTagPrimary id="reset" type="reset">
            Reset notes
          </InteractionTagPrimary>
        </InteractionTag>
      </form>,
    );
    cy.get('#notes').type(' edited');
    cy.get('#primary').realClick();
    cy.get('#notes').should('have.value', 'original edited');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('#reset').realClick();
    cy.get('#notes').should('have.value', 'original');
  });

  for (const appearance of ['filled', 'outline', 'brand'] as const) {
    it(`preserves compact primary and secondary edge hit areas without overexpansion for ${appearance}`, () => {
      const select = cy.spy().as('select');
      const dismiss = cy.spy().as('dismiss');
      render(
        <div style={{ padding: '24px' }}>
          <TagGroup onTagSelect={select} onDismiss={dismiss} aria-label="Calendar">
            <InteractionTag size="extra-small" appearance={appearance}>
              <InteractionTagPrimary id="primary" hasSecondaryAction>
                Calendar
              </InteractionTagPrimary>
              <InteractionTagSecondary id="secondary" aria-label="remove" />
            </InteractionTag>
          </TagGroup>
        </div>,
      );
      cy.get('#primary').then($node => {
        const rect = $node[0].getBoundingClientRect();
        expect($node[0].ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top - 1.5)).to.equal($node[0]);
        cy.get('#primary').realClick({ x: rect.width / 2, y: -1.5, scrollBehavior: false });
      });
      cy.get('@select').should('have.been.calledOnce');
      cy.get('#secondary').then($node => {
        const rect = $node[0].getBoundingClientRect();
        const doc = $node[0].ownerDocument;
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.bottom + 1.5)).to.equal($node[0]);
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.bottom + 1.99)).to.equal($node[0]);
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.bottom + 2.5)).not.to.equal($node[0]);
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.bottom + 3)).not.to.equal($node[0]);
        cy.get('#secondary').realClick({ x: rect.width / 2, y: rect.height + 1.5, scrollBehavior: false });
        cy.get('@dismiss').should('have.been.calledOnce');
        cy.get('#secondary').realClick({ x: rect.width / 2, y: rect.height + 3, scrollBehavior: false });
        cy.get('#secondary').realClick({ x: rect.width / 2, y: rect.height + 2.5, scrollBehavior: false });
        cy.get('@dismiss').should('have.been.calledOnce');
      });
      cy.get('@select').should('have.been.calledOnce');
    });
  }

  it('keeps two-pixel primary hit extensions when the provider changes the border thickness', () => {
    const click = cy.spy().as('click');
    mount(
      <FluentProvider theme={{ ...webLightTheme, strokeWidthThin: '2px' }}>
        <div style={{ padding: '24px' }}>
          <InteractionTag size="extra-small">
            <InteractionTagPrimary id="primary" onClick={click}>
              Calendar
            </InteractionTagPrimary>
          </InteractionTag>
        </div>
      </FluentProvider>,
    );
    cy.get('#primary')
      .should('have.css', 'border-top-width', '2px')
      .then($node => {
        const rect = $node[0].getBoundingClientRect();
        expect(rect.height).to.equal(20);
        const doc = $node[0].ownerDocument;
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.top - 1.5)).to.equal($node[0]);
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.bottom + 1.5)).to.equal($node[0]);
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.top - 1.99)).to.equal($node[0]);
        expect(doc.elementFromPoint(rect.left + rect.width / 2, rect.bottom + 1.99)).to.equal($node[0]);
        cy.get('#primary').realClick({ x: rect.width / 2, y: -1.5, scrollBehavior: false });
        cy.get('@click').should('have.been.calledOnce');
      });
  });
});
