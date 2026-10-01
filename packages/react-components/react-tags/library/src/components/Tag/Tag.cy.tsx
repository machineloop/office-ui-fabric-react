import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Avatar } from '@fluentui/react-avatar';
import { CalendarMonthRegular } from '@fluentui/react-icons';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { RefAttributes, SlotRenderFunction } from '@fluentui/react-utilities';
import { TagGroupContextProvider } from '../../contexts/tagGroupContext';
import { Tag } from './Tag';
import type { TagProps } from './Tag.types';
import { TagGroup } from '../TagGroup/TagGroup';
import { useOverrides, useCustomTagStyles } from './Tag.cy.styles.cy';

const root = '[data-testid="tag"]';
const sizes = [
  { size: 'medium', height: 32, avatar: 28, icon: 20 },
  { size: 'small', height: 24, avatar: 20, icon: 16 },
  { size: 'extra-small', height: 20, avatar: 16, icon: 12 },
] as const;
const appearances = ['filled', 'outline', 'brand'] as const;

function rgb(hex: string) {
  return `rgb(${[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
}

function render(props: TagProps = {}, dir: 'ltr' | 'rtl' = 'ltr') {
  return mount(
    <FluentProvider theme={teamsLightTheme} dir={dir}>
      <Tag data-testid="tag" {...props}>
        {props.children ?? 'Primary text'}
      </Tag>
    </FluentProvider>,
  );
}

function changing(initial: TagProps & RefAttributes<HTMLSpanElement | HTMLButtonElement>) {
  const tree = (props: typeof initial) => (
    <FluentProvider theme={teamsLightTheme}>
      <Tag data-testid="tag" {...props} />
    </FluentProvider>
  );
  let replace: (props: typeof initial) => void = _props => {
    throw new Error('Mount has not completed');
  };
  mount(tree(initial)).then(({ rerender }) => {
    replace = props => {
      rerender(tree(props));
    };
  });
  return (props: typeof initial) => cy.then(() => replace(props));
}

describe('Tag documented contracts', () => {
  it('renders a noninteractive span with primary text and medium rounded filled defaults', () => {
    render();
    cy.get(root).should('have.prop', 'tagName', 'SPAN').and('have.class', 'fui-Tag').and('not.have.attr', 'tabindex');
    cy.get(root).should('not.have.attr', 'aria-pressed');
    cy.get(root)
      .should('have.css', 'height', '32px')
      .and('have.css', 'border-radius', teamsLightTheme.borderRadiusMedium)
      .and('have.css', 'background-color', rgb(teamsLightTheme.colorNeutralBackground3));
    cy.get(`${root} .fui-Tag__primaryText`).should('have.text', 'Primary text');
    cy.get(`${root} .fui-Tag__dismissIcon`).should('not.exist');
  });

  describe('Tag supported edges and native accessibility', () => {
    for (const key of ['Enter', 'Space', 'Delete', 'Backspace'] as const) {
      it(`dismisses with native ${key} and passes the exact tag value`, () => {
        const dismissed = cy.spy().as('dismissed');
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <TagGroup onDismiss={dismissed}>
              <Tag data-testid="tag" value="asset-41" dismissible dismissIcon={{ 'aria-label': 'remove' }}>
                Asset
              </Tag>
            </TagGroup>
          </FluentProvider>,
        );
        cy.get(root).focus().should('be.focused');
        cy.realPress(key);
        cy.get('@dismissed')
          .should('have.been.calledOnce')
          .its('firstCall.args.1')
          .should('deep.equal', { value: 'asset-41' });
      });
    }

    it('dismisses on a native pointer click with the value and consumer callback first', () => {
      const order: string[] = [];
      const dismissed = cy.spy(() => order.push('group')).as('dismissed');
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <TagGroup onDismiss={dismissed}>
            <Tag data-testid="tag" value="asset" dismissible onClick={() => order.push('consumer')}>
              Asset
            </Tag>
          </TagGroup>
        </FluentProvider>,
      );
      cy.get(root).realClick();
      cy.get('@dismissed')
        .should('have.been.calledOnce')
        .its('firstCall.args.1')
        .should('deep.equal', { value: 'asset' });
      cy.then(() => expect(order).to.deep.equal(['consumer', 'group']));
    });

    for (const event of ['click', 'keydown'] as const) {
      it(`allows the consumer to cancel ${event} dismissal`, () => {
        const dismissed = cy.spy().as('dismissed');
        mount(
          <FluentProvider theme={teamsLightTheme}>
            <TagGroup onDismiss={dismissed}>
              <Tag
                data-testid="tag"
                dismissible
                {...(event === 'click' ? { onClick: e => e.preventDefault() } : { onKeyDown: e => e.preventDefault() })}
              >
                Cancel
              </Tag>
            </TagGroup>
          </FluentProvider>,
        );
        if (event === 'click') {
          cy.get(root).realClick();
        } else {
          cy.get(root).focus();
          cy.realPress('Delete');
          cy.realPress('Backspace');
        }
        cy.get('@dismissed').should('not.have.been.called');
      });
    }

    it('ignores unrelated keys and never turns selected into an onTagSelect action', () => {
      const dismissed = cy.spy().as('dismissed');
      const selected = cy.spy().as('selected');
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <TagGroup onDismiss={dismissed} onTagSelect={selected}>
            <Tag data-testid="tag" dismissible selected>
              Selected
            </Tag>
          </TagGroup>
        </FluentProvider>,
      );
      cy.get(root).focus();
      cy.realPress('Escape');
      cy.realPress('a');
      cy.get('@dismissed').should('not.have.been.called');
      cy.get(root).realClick();
      cy.get('@dismissed').should('have.been.calledOnce');
      cy.get('@selected').should('not.have.been.called');
      cy.get(root).should('have.attr', 'aria-pressed', 'true');
    });

    it('uses native Tab and Shift+Tab and skips passive and disabled tags', () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <button data-testid="before">Before</button>
          <Tag>Passive</Tag>
          <Tag dismissible disabled>
            Disabled
          </Tag>
          <Tag data-testid="tag" dismissible dismissIcon={{ 'aria-label': 'remove' }}>
            Asset
          </Tag>
          <button data-testid="after">After</button>
        </FluentProvider>,
      );
      cy.get('[data-testid="before"]').focus();
      cy.realPress('Tab');
      cy.get(root).should('be.focused');
      cy.realPress('Tab');
      cy.get('[data-testid="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get(root).should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      cy.get('[data-testid="before"]').should('be.focused');
    });

    it('defaults to button type and does not submit a surrounding form', () => {
      const submitted = cy.spy((e: React.FormEvent) => e.preventDefault()).as('submitted');
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <form onSubmit={submitted}>
            <Tag data-testid="tag" dismissible>
              Asset
            </Tag>
          </form>
        </FluentProvider>,
      );
      cy.get(root).realClick();
      cy.realPress('Enter');
      cy.realPress('Space');
      cy.get('@submitted').should('not.have.been.called');
    });

    it('supports an explicit submit type without swallowing the native form action', () => {
      const submitted = cy.spy((e: React.FormEvent) => e.preventDefault()).as('submitted');
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <form onSubmit={submitted}>
            <Tag data-testid="tag" dismissible type="submit">
              Asset
            </Tag>
          </form>
        </FluentProvider>,
      );
      cy.get(root).realClick();
      cy.get('@submitted').should('have.been.calledOnce');
    });

    it('preserves root native id, title, data, class, style and accessible description', () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <p id="description">Removes this asset</p>
          <Tag
            data-testid="tag"
            id="asset-id"
            title="Asset title"
            className="consumer"
            style={{ opacity: 0.5 }}
            dismissible
            aria-describedby="description"
          >
            Asset
          </Tag>
        </FluentProvider>,
      );
      cy.get(root).should('have.id', 'asset-id').and('have.attr', 'title', 'Asset title');
      cy.get(root).should('have.class', 'consumer').and('have.css', 'opacity', '0.5');
      cy.get(root).should('have.attr', 'aria-describedby', 'description');
      cy.get(root).should(tag => expect(computeAccessibleDescription(tag[0])).to.equal('Removes this asset'));
      cy.get(root).should('not.have.attr', 'appearance');
      cy.get(root).should('not.have.attr', 'dismissible');
    });

    it('removes nondefault design and interaction props back to the original defaults', () => {
      const change = changing({
        appearance: 'brand',
        shape: 'circular',
        size: 'extra-small',
        selected: true,
        disabled: true,
        dismissible: true,
        children: 'Asset',
      });
      cy.get(root).should('be.disabled').and('have.prop', 'tagName', 'BUTTON');
      change({ children: 'Asset' });
      cy.get(root).should('have.prop', 'tagName', 'SPAN').and('have.css', 'height', '32px');
      cy.get(root).should('have.css', 'border-radius', teamsLightTheme.borderRadiusMedium);
      cy.get(root).should('have.css', 'background-color', rgb(teamsLightTheme.colorNeutralBackground3));
      cy.get(root).should('not.have.attr', 'aria-pressed');
      cy.get(`${root} .fui-Tag__dismissIcon`).should('not.exist');
    });

    it('keeps consumer classes and inline overrides across props and removes them when omitted', () => {
      const change = changing({ children: 'Asset', className: 'consumer', style: { height: '48px', opacity: 0.5 } });
      cy.get(root).should('have.class', 'consumer').and('have.css', 'height', '48px');
      change({ children: 'Asset', size: 'small', className: 'consumer', style: { height: '48px', opacity: 0.5 } });
      cy.get(root).should('have.css', 'height', '48px').and('have.css', 'opacity', '0.5');
      change({ children: 'Asset', size: 'small' });
      cy.get(root)
        .should('not.have.class', 'consumer')
        .and('have.css', 'height', '24px')
        .and('have.css', 'opacity', '1');
    });

    it('supports slot omission, empty values and numeric zero without substituting children', () => {
      const change = changing({
        children: 'Fallback',
        primaryText: 'Explicit',
        secondaryText: 0,
        icon: 0,
        dismissible: true,
        dismissIcon: null,
      });
      cy.get(`${root} .fui-Tag__primaryText`).should('have.text', 'Explicit');
      cy.get(`${root} .fui-Tag__secondaryText`).should('have.text', '0');
      cy.get(`${root} .fui-Tag__icon`).should('have.text', '0');
      cy.get(`${root} .fui-Tag__dismissIcon`).should('not.exist');
      change({ children: 'Fallback', primaryText: null, secondaryText: null, icon: null });
      cy.get(`${root} .fui-Tag__primaryText`).should('not.exist');
      cy.get(`${root} .fui-Tag__secondaryText`).should('not.exist');
      cy.get(`${root} .fui-Tag__icon`).should('not.exist');
      change({ children: 0, primaryText: '', secondaryText: '' });
      cy.get(`${root} .fui-Tag__primaryText`).should('have.text', '');
      cy.get(`${root} .fui-Tag__secondaryText`).should('have.text', '');
      change({ children: 0 });
      cy.get(`${root} .fui-Tag__primaryText`).should('have.text', '0');
    });

    it('preserves slot attributes and custom render functions with merged classes', () => {
      const primary: SlotRenderFunction<React.HTMLAttributes<HTMLSpanElement>> = (Component, props) => (
        <Component {...props} data-rendered="yes">
          Rendered {props.children}
        </Component>
      );
      render({
        children: 'Fallback',
        primaryText: { children: primary, title: 'Main title', className: 'custom-primary' },
        secondaryText: { children: 'Details', title: 'Details title', style: { opacity: 0.5 } },
        icon: { children: 'Icon', className: 'custom-icon', 'aria-hidden': true },
        dismissible: true,
        dismissIcon: { children: 'X', 'aria-label': 'remove' },
      });
      cy.get(`${root} .fui-Tag__primaryText`)
        .should('have.class', 'custom-primary')
        .and('have.attr', 'data-rendered', 'yes');
      cy.get(`${root} .fui-Tag__primaryText`)
        .should('have.attr', 'title', 'Main title')
        .and('have.text', 'Rendered Fallback');
      cy.get(`${root} .fui-Tag__secondaryText`)
        .should('have.attr', 'title', 'Details title')
        .and('have.css', 'opacity', '0.5');
      cy.get(`${root} .fui-Tag__icon`).should('have.class', 'custom-icon').and('have.attr', 'aria-hidden', 'true');
      cy.get(`${root} .fui-Tag__dismissIcon`).should('have.text', 'X');
    });

    for (const dir of ['ltr', 'rtl'] as const) {
      it(`positions leading icon and trailing dismiss slot in ${dir}`, () => {
        render({ icon: <CalendarMonthRegular />, dismissible: true, dismissIcon: { 'aria-label': 'remove' } }, dir);
        cy.get(`${root} .fui-Tag__icon`).then(icon => {
          cy.get(`${root} .fui-Tag__dismissIcon`).should(dismiss => {
            const leading = icon[0].getBoundingClientRect();
            const trailing = dismiss[0].getBoundingClientRect();
            if (dir === 'ltr') {
              expect(leading.right).to.be.lessThan(trailing.left);
            } else {
              expect(leading.left).to.be.greaterThan(trailing.right);
            }
          });
        });
      });
    }

    it('passes automated accessibility checks for both documented label strategies and static media', () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <Tag dismissible dismissIcon={{ 'aria-label': 'remove' }}>
            Asset A
          </Tag>
          <Tag dismissible aria-label="Remove asset B" dismissIcon={{ role: 'presentation' }}>
            Asset B
          </Tag>
          <Tag media={<Avatar name="Katri Athokas" />} secondaryText="Owner">
            Asset C
          </Tag>
        </FluentProvider>,
      );
      cy.get('[data-cy-root]').then(async container => {
        const results = await axe.run(container[0]);
        expect(results.violations.map(violation => `${violation.id}: ${violation.description}`)).to.deep.equal([]);
      });
    });
  });

  it('renders an icon in its leading grid slot', () => {
    render({ icon: <CalendarMonthRegular /> });
    cy.get(`${root} .fui-Tag__icon`).should('have.css', 'grid-area', 'media').find('svg').should('be.visible');
  });

  it('renders Avatar media with inherited shape and size and an accessible busy badge', () => {
    render({ media: <Avatar name="Katri Athokas" badge={{ status: 'busy' }} /> });
    cy.get(`${root} .fui-Tag__media`).should('have.css', 'grid-area', 'media');
    cy.get(`${root} .fui-Avatar`).should('have.css', 'width', '28px').and('have.css', 'border-radius', '4px');
    cy.get(`${root} .fui-Avatar__badge`).should('have.attr', 'aria-label', 'busy');
  });

  it('lays secondary text out below the primary without wrapping', () => {
    render({ secondaryText: 'Secondary text' });
    cy.get(`${root} .fui-Tag__secondaryText`)
      .should('have.text', 'Secondary text')
      .and('have.css', 'white-space', 'nowrap')
      .then(secondary => {
        cy.get(`${root} .fui-Tag__primaryText`).should(primary => {
          expect(primary[0].getBoundingClientRect().top).to.be.lessThan(secondary[0].getBoundingClientRect().top);
        });
      });
  });

  for (const { size, height, avatar, icon } of sizes) {
    it(`paints ${size} height and icon dimensions`, () => {
      render({ size, icon: <CalendarMonthRegular />, dismissible: true, dismissIcon: { 'aria-label': 'remove' } });
      cy.get(root).should('have.css', 'height', `${height}px`);
      cy.get(`${root} .fui-Tag__icon`).should('have.css', 'width', `${icon}px`);
      cy.get(`${root} .fui-Tag__dismissIcon`).should('have.css', 'font-size', `${icon}px`);
    });

    it(`provides ${size} Avatar dimensions`, () => {
      render({ size, media: <Avatar name="Katri Athokas" /> });
      cy.get(`${root} .fui-Avatar`).should('have.css', 'width', `${avatar}px`);
      cy.get(root).should('have.css', 'height', `${height}px`);
    });
  }

  for (const shape of ['rounded', 'circular'] as const) {
    it(`paints ${shape} root and Avatar shape`, () => {
      render({ shape, media: <Avatar name="Katri Athokas" /> });
      cy.get(root).should(
        'have.css',
        'border-radius',
        shape === 'rounded' ? teamsLightTheme.borderRadiusMedium : teamsLightTheme.borderRadiusCircular,
      );
      cy.get(`${root} .fui-Avatar`).should(
        'have.css',
        'border-radius',
        shape === 'rounded' ? teamsLightTheme.borderRadiusMedium : teamsLightTheme.borderRadiusCircular,
      );
    });
  }

  for (const appearance of appearances) {
    it(`paints the ${appearance} appearance`, () => {
      render({
        appearance,
        dismissible: true,
        icon: <CalendarMonthRegular />,
        dismissIcon: { 'aria-label': 'remove' },
      });
      cy.get(root).should(
        'have.css',
        'color',
        rgb(appearance === 'brand' ? teamsLightTheme.colorBrandForeground2 : teamsLightTheme.colorNeutralForeground2),
      );
      cy.get(root).should(
        'have.css',
        'background-color',
        appearance === 'brand'
          ? rgb(teamsLightTheme.colorBrandBackground2)
          : appearance === 'outline'
          ? 'rgba(0, 0, 0, 0)'
          : rgb(teamsLightTheme.colorNeutralBackground3),
      );
      if (appearance === 'outline') {
        cy.get(root).should('have.css', 'border-top-color', rgb(teamsLightTheme.colorNeutralStroke1));
      }
    });

    it(`suppresses native interaction for disabled ${appearance}`, () => {
      const clicked = cy.spy().as('clicked');
      render({ disabled: true, appearance, dismissible: true, onClick: clicked, secondaryText: 'Disabled' });
      cy.get(root)
        .should('be.disabled')
        .and('have.css', 'color', rgb(teamsLightTheme.colorNeutralForegroundDisabled))
        .realClick();
      cy.get('@clicked').should('not.have.been.called');
      cy.get(root).then(tag => expect(tag[0]).not.to.equal(tag[0].ownerDocument.activeElement));
    });

    it(`exposes selected state and selected paint for ${appearance}`, () => {
      render({ selected: true, appearance, dismissible: true, secondaryText: 'Selected' });
      cy.get(root)
        .should('have.attr', 'aria-pressed', 'true')
        .and('have.css', 'background-color', rgb(teamsLightTheme.colorBrandBackground))
        .and('have.css', 'color', rgb(teamsLightTheme.colorNeutralForegroundOnBrand));
    });
  }

  it('computes the dismiss action name from the labeled dismiss icon', () => {
    render({ dismissible: true, dismissIcon: { 'aria-label': 'remove' } });
    cy.get(root).should('have.prop', 'tagName', 'BUTTON').and('have.attr', 'type', 'button');
    cy.get(root).should(tag => expect(computeAccessibleName(tag[0])).to.equal('Primary text remove'));
  });

  it('uses a root dismiss label with a presentational icon', () => {
    render({ dismissible: true, 'aria-label': 'Remove Primary text', dismissIcon: { role: 'presentation' } });
    cy.get(root).should(tag => expect(computeAccessibleName(tag[0])).to.equal('Remove Primary text'));
    cy.get(`${root} .fui-Tag__dismissIcon`).should('have.attr', 'role', 'presentation');
  });

  it('implements the documented dismiss/reset recipe with native focus recovery', () => {
    const Recipe = () => {
      const [values, setValues] = React.useState(['1', '2', '3']);
      const first = React.useRef<HTMLButtonElement>(null);
      const reset = React.useRef<HTMLButtonElement>(null);
      const previous = React.useRef(values.length);
      React.useEffect(() => {
        if (!values.length) {
          reset.current?.focus();
        } else if (!previous.current) {
          first.current?.focus();
        }
        previous.current = values.length;
      }, [values.length]);
      return (
        <FluentProvider theme={teamsLightTheme}>
          {values.length > 0 && (
            <TagGroup
              aria-label="Dismiss example"
              onDismiss={(_, data) => setValues(old => old.filter(v => v !== data.value))}
            >
              {values.map((value, index) => (
                <Tag
                  key={value}
                  value={value}
                  ref={index === 0 ? first : undefined}
                  dismissible
                  dismissIcon={{ 'aria-label': 'remove' }}
                >
                  Tag {value}
                </Tag>
              ))}
            </TagGroup>
          )}
          <button ref={reset} disabled={values.length > 0} onClick={() => setValues(['1', '2', '3'])}>
            Reset the example
          </button>
        </FluentProvider>
      );
    };
    mount(<Recipe />);
    cy.contains('button', 'Tag 1').realClick();
    cy.contains('button', 'Tag 1').should('not.exist');
    cy.contains('button', 'Tag 2').should('be.focused');
    cy.realPress('Enter');
    cy.contains('button', 'Tag 3').should('be.focused');
    cy.realPress('Space');
    cy.contains('button', 'Reset the example').should('be.focused').and('not.be.disabled');
    cy.realPress('Enter');
    cy.contains('button', 'Tag 1').should('be.focused');
    cy.get('.fui-Tag').should('have.length', 3);
  });
});

describe('Tag unit and conformance contracts in the browser', () => {
  it('inherits size, appearance and dismissibility from context while explicit props win', () => {
    const tree = (props: TagProps) => (
      <FluentProvider theme={teamsLightTheme}>
        <TagGroupContextProvider
          value={{ size: 'extra-small', appearance: 'brand', dismissible: true, handleTagDismiss: () => undefined }}
        >
          <Tag data-testid="tag" {...props}>
            Asset
          </Tag>
        </TagGroupContextProvider>
      </FluentProvider>
    );
    mount(tree({})).then(({ rerender }) => {
      cy.get(root).should('have.prop', 'tagName', 'BUTTON').and('have.css', 'height', '20px');
      cy.get(root).should('have.css', 'background-color', rgb(teamsLightTheme.colorBrandBackground2));
      cy.then(() => rerender(tree({ size: 'small', appearance: 'outline', dismissible: false })));
      cy.get(root).should('have.prop', 'tagName', 'SPAN').and('have.css', 'height', '24px');
      cy.get(root).should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      cy.then(() => rerender(tree({})));
      cy.get(root).should('have.prop', 'tagName', 'BUTTON').and('have.css', 'height', '20px');
    });
  });

  it('forces disabled from context even when explicitly false and suppresses selected paint', () => {
    const dismissed = cy.spy().as('dismissed');
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TagGroupContextProvider value={{ size: 'medium', disabled: true, handleTagDismiss: dismissed }}>
          <Tag data-testid="tag" disabled={false} selected dismissible>
            Asset
          </Tag>
        </TagGroupContextProvider>
      </FluentProvider>,
    );
    cy.get(root)
      .should('be.disabled')
      .and('have.css', 'background-color', rgb(teamsLightTheme.colorNeutralBackgroundDisabled));
    cy.get(root).realClick();
    cy.get('@dismissed').should('not.have.been.called');
  });

  for (const selected of [true, false, undefined]) {
    it(`maps listbox context to option with aria-selected=${selected}`, () => {
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <TagGroupContextProvider value={{ size: 'medium', role: 'listbox', handleTagDismiss: () => undefined }}>
            <Tag data-testid="tag" selected={selected} dismissible>
              Asset
            </Tag>
          </TagGroupContextProvider>
        </FluentProvider>,
      );
      cy.get(root).should('have.attr', 'role', 'option');
      cy.get(root).should('not.have.attr', 'aria-pressed');
      if (selected === undefined) {
        cy.get(root).should('not.have.attr', 'aria-selected');
      } else {
        cy.get(root).should('have.attr', 'aria-selected', String(selected));
      }
    });
  }

  it('removes selected=false back to omission instead of leaving stale pressed semantics', () => {
    const change = changing({ children: 'Asset', dismissible: true, selected: false });
    cy.get(root).should('have.attr', 'aria-pressed', 'false');
    change({ children: 'Asset', dismissible: true, selected: true });
    cy.get(root).should('have.attr', 'aria-pressed', 'true');
    change({ children: 'Asset', dismissible: true });
    cy.get(root).should('not.have.attr', 'aria-pressed');
  });

  it('keeps a generated id stable through rerenders and uses it as the default dismiss value', () => {
    const dismissed = cy.spy().as('dismissed');
    const tree = (props: TagProps) => (
      <FluentProvider theme={teamsLightTheme}>
        <TagGroup onDismiss={dismissed}>
          <Tag data-testid="tag" dismissible {...props}>
            Asset
          </Tag>
        </TagGroup>
      </FluentProvider>
    );
    mount(tree({})).then(({ rerender }) => {
      cy.get(root)
        .invoke('attr', 'id')
        .then(id => {
          expect(id).to.match(/^fui-Tag/);
          cy.get(root).realClick();
          cy.get('@dismissed').its('lastCall.args.1').should('deep.equal', { value: id });
          cy.then(() => rerender(tree({ size: 'small' })));
          cy.get(root).should('have.id', id);
          cy.get(root).realClick();
          cy.get('@dismissed')
            .should('have.been.calledTwice')
            .its('lastCall.args.1')
            .should('deep.equal', { value: id });
        });
    });
  });

  it('uses the latest value and handlers, handles removal and restoration, and keeps the root identity', () => {
    const first = cy.spy().as('first');
    const latest = cy.spy().as('latest');
    const key = cy.spy().as('key');
    const dismissed = cy.spy().as('dismissed');
    const tree = (props: TagProps) => (
      <FluentProvider theme={teamsLightTheme}>
        <TagGroup onDismiss={dismissed}>
          <Tag data-testid="tag" dismissible {...props}>
            Asset
          </Tag>
        </TagGroup>
      </FluentProvider>
    );
    mount(tree({ onClick: first, onKeyDown: key, value: 'first' })).then(({ rerender }) => {
      cy.get(root).then(original => {
        cy.get(root).realClick();
        cy.get('@first').should('have.been.calledOnce');
        cy.then(() => rerender(tree({ onClick: latest, value: 'latest' })));
        cy.get(root).should(tag => expect(tag[0]).to.equal(original[0]));
        cy.get(root).realClick();
        cy.realPress('Delete');
        cy.get('@latest').should('have.been.calledOnce');
        cy.get('@key').should('not.have.been.called');
        cy.get('@dismissed').its('lastCall.args.1').should('deep.equal', { value: 'latest' });
        cy.then(() => rerender(tree({ value: 'removed' })));
        cy.get(root).realClick();
        cy.get('@latest').should('have.been.calledOnce');
        cy.then(() => rerender(tree({ onClick: first, onKeyDown: key, value: 'restored' })));
        cy.get(root).realClick();
        cy.realPress('Backspace');
        cy.get('@first').should('have.been.calledTwice');
        cy.get('@key').should('have.been.calledOnce');
        cy.get('@dismissed').its('lastCall.args.1').should('deep.equal', { value: 'restored' });
      });
    });
  });

  it('forwards callback refs to the native root and detaches replaced and unmounted refs', () => {
    const first = cy.spy().as('firstRef');
    const second = cy.spy().as('secondRef');
    const tree = (ref?: React.Ref<HTMLSpanElement | HTMLButtonElement>, visible = true, dismissible = false) => (
      <FluentProvider theme={teamsLightTheme}>
        {visible && (
          <Tag data-testid="tag" ref={ref} dismissible={dismissible}>
            Asset
          </Tag>
        )}
      </FluentProvider>
    );
    mount(tree(first)).then(({ rerender }) => {
      cy.get(root).then(tag => {
        cy.get('@firstRef').its('lastCall.args.0').should('equal', tag[0]);
        cy.then(() => rerender(tree(second)));
        cy.get('@firstRef').its('lastCall.args.0').should('be.null');
        cy.get('@secondRef').its('lastCall.args.0').should('equal', tag[0]);
        cy.get(root).should(current => expect(current[0]).to.equal(tag[0]));
        cy.then(() => rerender(tree(second, true, true)));
        cy.get(root)
          .should('have.prop', 'tagName', 'BUTTON')
          .then(button => {
            cy.get('@secondRef').its('lastCall.args.0').should('equal', button[0]);
            cy.then(() => rerender(tree(second, false)));
            cy.get('@secondRef').its('lastCall.args.0').should('be.null');
            cy.get(root).should('not.exist');
          });
      });
    });
  });

  it('forwards and replaces object refs and clears the active ref on unmount', () => {
    const first = React.createRef<HTMLSpanElement | HTMLButtonElement>();
    const second = React.createRef<HTMLSpanElement | HTMLButtonElement>();
    const tree = (ref: typeof first, visible = true) => (
      <FluentProvider theme={teamsLightTheme}>
        {visible && (
          <Tag data-testid="tag" dismissible ref={ref}>
            Asset
          </Tag>
        )}
      </FluentProvider>
    );
    mount(tree(first)).then(({ rerender }) => {
      cy.get(root).then(tag => {
        expect(first.current).to.equal(tag[0]);
        cy.then(() => rerender(tree(second)));
        cy.get(root).should(current => {
          expect(first.current).to.equal(null);
          expect(second.current).to.equal(current[0]);
          expect(current[0]).to.equal(tag[0]);
        });
        cy.then(() => rerender(tree(second, false)));
        cy.then(() => expect(second.current).to.equal(null));
      });
    });
  });

  it('preserves default dismiss SVG while an explicit custom icon and omission take precedence', () => {
    const change = changing({ children: 'Asset', dismissible: true });
    cy.get(`${root} .fui-Tag__dismissIcon svg`).should('be.visible');
    change({ children: 'Asset', dismissible: true, dismissIcon: 'Custom' });
    cy.get(`${root} .fui-Tag__dismissIcon`).should('have.text', 'Custom').find('svg').should('not.exist');
    change({ children: 'Asset', dismissible: false, dismissIcon: 'Custom' });
    cy.get(`${root} .fui-Tag__dismissIcon`).should('not.exist');
    change({ children: 'Asset', dismissible: true });
    cy.get(`${root} .fui-Tag__dismissIcon svg`).should('be.visible');
  });

  for (const { size } of sizes) {
    it(`restores passive ${size} spacing when a retained custom dismiss icon is hidden`, () => {
      const tree = (dismissible: boolean) => (
        <FluentProvider theme={teamsLightTheme}>
          <Tag data-testid="tag" size={size} dismissible={dismissible} dismissIcon="Custom">
            Asset
          </Tag>
          <Tag data-testid="reference" size={size}>
            Asset
          </Tag>
        </FluentProvider>
      );
      mount(tree(true)).then(({ rerender }) => {
        cy.get(`${root} .fui-Tag__dismissIcon`).should('have.text', 'Custom');
        cy.then(() => rerender(tree(false)));
        cy.get(`${root} .fui-Tag__dismissIcon`).should('not.exist');
        cy.get('[data-testid="reference"]').then(reference => {
          const expected = reference[0].ownerDocument.defaultView!.getComputedStyle(reference[0]);
          cy.get(root)
            .should('have.css', 'padding-right', expected.paddingRight)
            .should(tag => {
              expect(tag[0].getBoundingClientRect().width).to.equal(reference[0].getBoundingClientRect().width);
            });
        });
        cy.then(() => rerender(tree(true)));
        cy.get(`${root} .fui-Tag__dismissIcon`).should('have.text', 'Custom');
      });
    });
  }

  it('passes design-only Avatar values through context but explicit Avatar props override', () => {
    render({ size: 'extra-small', shape: 'circular', media: <Avatar name="Owner" size={40} shape="square" /> });
    cy.get(`${root} .fui-Avatar`)
      .should('have.css', 'width', '40px')
      .and('have.css', 'border-radius', teamsLightTheme.borderRadiusMedium);
  });

  it('honors consumer Griffel classes for root and slots after builtin styles', () => {
    const Fixture = () => {
      const classes = useOverrides();
      return (
        <Tag data-testid="tag" className={classes.root} primaryText={{ className: classes.primaryText }}>
          Asset
        </Tag>
      );
    };
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <Fixture />
      </FluentProvider>,
    );
    cy.get(root).should('have.css', 'background-color', rgb(teamsLightTheme.colorPaletteGreenBackground2));
    cy.get(`${root} .fui-Tag__primaryText`).should('have.css', 'font-weight', String(teamsLightTheme.fontWeightBold));
  });

  it('uses FluentProvider custom style hooks and updates to a nested theme', () => {
    const theme = { ...teamsLightTheme, colorNeutralBackground3: teamsLightTheme.colorPaletteGreenBackground2 };
    const hooks = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      useTagStyles_unstable: useCustomTagStyles,
    };
    const tree = (alternate: boolean) => (
      <FluentProvider theme={teamsLightTheme} customStyleHooks_unstable={hooks}>
        <FluentProvider theme={alternate ? theme : teamsLightTheme}>
          <Tag data-testid="tag">Asset</Tag>
        </FluentProvider>
      </FluentProvider>
    );
    mount(tree(true)).then(({ rerender }) => {
      cy.get(root).should('have.css', 'border-radius', `${teamsLightTheme.borderRadiusNone}px`);
      cy.get(root).should('have.css', 'background-color', rgb(theme.colorNeutralBackground3));
      cy.then(() => rerender(tree(false)));
      cy.get(root).should('have.css', 'border-radius', `${teamsLightTheme.borderRadiusNone}px`);
      cy.get(root).should('have.css', 'background-color', rgb(teamsLightTheme.colorNeutralBackground3));
    });
  });

  it('removes a hook-free provider override without changing React hook order or root identity', () => {
    const override = (state: unknown) => {
      const tag = state as import('./Tag.types').TagState;
      tag.root.style = { ...tag.root.style, opacity: 0.5 };
    };
    const hooks = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      useTagStyles_unstable: override,
    };
    const tree = (custom: boolean) => (
      <FluentProvider theme={teamsLightTheme} customStyleHooks_unstable={custom ? hooks : undefined}>
        <Tag data-testid="tag">Asset</Tag>
      </FluentProvider>
    );
    mount(tree(true)).then(({ rerender }) => {
      cy.get(root)
        .should('have.css', 'opacity', '0.5')
        .then(original => {
          cy.then(() => rerender(tree(false)));
          cy.get(root)
            .should('have.css', 'opacity', '1')
            .should(tag => expect(tag[0]).to.equal(original[0]));
          cy.then(() => rerender(tree(true)));
          cy.get(root).should('have.css', 'opacity', '0.5');
        });
    });
  });

  it('keeps passive click and key consumers native without supplying dismiss behavior', () => {
    const clicked = cy.spy().as('clicked');
    const key = cy.spy().as('key');
    const dismissed = cy.spy().as('dismissed');
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <TagGroup onDismiss={dismissed}>
          <Tag data-testid="tag" tabIndex={0} onClick={clicked} onKeyDown={key}>
            Asset
          </Tag>
        </TagGroup>
      </FluentProvider>,
    );
    cy.get(root).realClick();
    cy.realPress('Delete');
    cy.get('@clicked').should('have.been.calledOnce');
    cy.get('@key').should('have.been.calledOnce');
    cy.get('@dismissed').should('not.have.been.called');
  });

  it('exposes the extra-small expanded hit area in the actual painted pseudo elements', () => {
    render({ size: 'extra-small', dismissible: true });
    cy.get(root).should(tag => {
      const view = tag[0].ownerDocument.defaultView!;
      expect(view.getComputedStyle(tag[0], '::before').height).to.equal('2px');
      expect(view.getComputedStyle(tag[0], '::after').height).to.equal('2px');
      expect(view.getComputedStyle(tag[0], '::before').content).to.equal('""');
    });
  });

  it('paints a visible keyboard focus indicator and native dismiss-icon hover state', () => {
    mount(
      <FluentProvider theme={teamsLightTheme}>
        <button data-testid="before">Before</button>
        <Tag data-testid="tag" dismissible dismissIcon={{ 'aria-label': 'remove' }}>
          Asset
        </Tag>
      </FluentProvider>,
    );
    cy.get('[data-testid="before"]').focus();
    cy.realPress('Tab');
    cy.get(root).should('be.focused').and('have.css', 'outline-style', 'solid');
    cy.get(root).should('have.css', 'outline-width', teamsLightTheme.strokeWidthThick);
    cy.get(`${root} .fui-Tag__dismissIcon`).realHover();
    cy.get(`${root} .fui-Tag__dismissIcon`).should(
      'have.css',
      'color',
      rgb(teamsLightTheme.colorCompoundBrandForeground1Hover),
    );
  });
});

describe('Tag defined forced-colors paint', () => {
  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });

  for (const shape of ['rounded', 'circular'] as const) {
    it(`uses system selected colors and the ${shape} protective pseudo border in forced colors`, () => {
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Emulation.setEmulatedMedia',
          params: { features: [{ name: 'forced-colors', value: 'active' }] },
        }),
      );
      mount(
        <FluentProvider theme={teamsLightTheme}>
          <Tag data-testid="tag" shape={shape} selected secondaryText="Description" dismissible>
            Asset
          </Tag>
          <span data-testid="system" style={{ backgroundColor: 'Highlight', color: 'HighlightText' }}>
            System colors
          </span>
        </FluentProvider>,
      );
      cy.get(root).should(tag => {
        const view = tag[0].ownerDocument.defaultView!;
        expect(view.matchMedia('(forced-colors: active)').matches).to.equal(true);
        expect(view.getComputedStyle(tag[0]).forcedColorAdjust).to.equal('none');
        const border = view.getComputedStyle(tag[0], '::before');
        expect(border.content).to.equal('""');
        expect(border.borderTopStyle).to.equal('solid');
        expect(border.borderTopWidth).to.equal('1px');
        if (shape === 'circular') {
          expect(border.borderLeftStyle).to.equal('solid');
          expect(border.borderRightStyle).to.equal('solid');
        }
      });
      cy.get('[data-testid="system"]').then(system => {
        const expected = system[0].ownerDocument.defaultView!.getComputedStyle(system[0]);
        cy.get(root)
          .should('have.css', 'background-color', expected.backgroundColor)
          .and('have.css', 'color', expected.color);
      });
    });
  }
});
