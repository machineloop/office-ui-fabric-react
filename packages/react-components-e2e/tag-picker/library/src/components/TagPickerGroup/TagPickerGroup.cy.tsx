import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Tag } from '@fluentui/react-tags';
import type { TagProps } from '@fluentui/react-tags';
import {
  TagPicker,
  TagPickerControl,
  TagPickerInput,
  TagPickerButton,
  TagPickerList,
  TagPickerOption,
} from '@fluentui/react-tag-picker';
import type { TagPickerProps } from '@fluentui/react-tag-picker';
import { TagPickerGroup } from './TagPickerGroup';
import type { TagPickerGroupProps } from './TagPickerGroup.types';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const group = () => cy.get('.fui-TagPickerGroup');
const tag = (value = 'Alpha') => cy.get(`#tag-${value}`);
const options = ['Alpha', 'Beta', 'Gamma'];
const Picker = ({
  selected = options,
  controlled = false,
  groupProps,
  tagProps,
  button = false,
  ...props
}: {
  selected?: string[];
  controlled?: boolean;
  groupProps?: TagPickerGroupProps & { ref?: React.Ref<HTMLDivElement>; 'data-tabster'?: string };
  tagProps?: TagProps;
  button?: boolean;
} & Partial<TagPickerProps>) => {
  const [values, setValues] = React.useState(selected);
  return (
    <TagPicker
      selectedOptions={controlled ? selected : values}
      {...props}
      onOptionSelect={(event, data) => {
        props.onOptionSelect?.(event, data);
        if (!controlled && !event.defaultPrevented) {
          setValues(data.selectedOptions);
        }
      }}
    >
      <TagPickerControl>
        <TagPickerGroup aria-label="Selected records" {...groupProps}>
          {(controlled ? selected : values).map(value => (
            <Tag key={value} id={`tag-${value}`} value={value} {...tagProps}>
              {value}
            </Tag>
          ))}
        </TagPickerGroup>
        {button ? (
          <TagPickerButton id="input" aria-label="Choose records" />
        ) : (
          <TagPickerInput id="input" aria-label="Choose records" />
        )}
      </TagPickerControl>
      <TagPickerList>
        {options.map(value => (
          <TagPickerOption key={value} value={value}>
            {value}
          </TagPickerOption>
        ))}
      </TagPickerList>
    </TagPicker>
  );
};

describe('TagPickerGroup documented contracts (round 1)', () => {
  it('empty selected context hides the group even when caller supplies children', () => {
    mount(
      <TagPicker noPopover selectedOptions={[]}>
        <TagPickerControl>
          <TagPickerGroup>
            <Tag value="Alpha">Alpha</Tag>
          </TagPickerGroup>
          <TagPickerInput aria-label="Choose" />
        </TagPickerControl>
      </TagPicker>,
    );
    group().should('not.exist');
  });

  describe('TagPickerGroup adversarial improvements (final)', () => {
    it('extra-large inherited base styles cannot override the intended six-pixel horizontal gap', () => {
      mount(<Picker size="extra-large" />);
      tag().then($first => {
        const first = $first[0].getBoundingClientRect();
        tag('Beta').should($second => expect($second[0].getBoundingClientRect().left - first.right).to.equal(6));
      });
      group().should('have.css', 'row-gap', '6px').and('have.css', 'column-gap', '6px');
    });

    it('constrained group wraps tags without overlap and keeps dismissal identities', () => {
      mount(<Picker groupProps={{ style: { width: 100 } }} />);
      tag().then($first => {
        const first = $first[0].getBoundingClientRect();
        tag('Gamma').should($last => expect($last[0].getBoundingClientRect().top).to.be.greaterThan(first.bottom));
      });
      tag('Gamma').focus().realPress('Delete');
      tag('Gamma').should('not.exist');
      tag('Beta').should('have.focus');
    });

    it('live picker size/appearance updates persistent group and child DOM nodes', () => {
      let initial: HTMLElement;
      const Example = () => {
        const [changed, setChanged] = React.useState(false);
        return (
          <>
            <button onClick={() => setChanged(value => !value)}>Change design</button>
            <Picker size={changed ? 'extra-large' : 'medium'} appearance={changed ? 'filled-darker' : 'outline'} />
          </>
        );
      };
      mount(<Example />);
      group().then($group => {
        initial = $group[0];
      });
      cy.contains('button', 'Change design').realClick();
      group().should($group => expect($group[0]).to.equal(initial));
      tag().should('have.css', 'height', '32px').and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      group().should('have.css', 'column-gap', '6px');
    });

    it('group dismissal does not mutate the selection of an independent sibling picker', () => {
      mount(
        <>
          <div id="first">
            <Picker />
          </div>
          <div id="second">
            <Picker />
          </div>
        </>,
      );
      cy.get('#first #tag-Beta').focus().realPress('Delete');
      cy.get('#first #tag-Beta').should('not.exist');
      cy.get('#second #tag-Beta').should('exist');
      cy.get('#first .fui-Tag').should('have.length', 2);
      cy.get('#second .fui-Tag').should('have.length', 3);
    });
  });

  describe('TagPickerGroup unit-derived contracts (round 3)', () => {
    it('without picker context renders no root, children or attached ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      mount(
        <TagPickerGroup ref={ref}>
          <Tag value="Alpha">Alpha</Tag>
        </TagPickerGroup>,
      );
      group()
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
      cy.contains('Alpha').should('not.exist');
    });

    it('nonempty context renders supplied children without implicitly adding options', () => {
      mount(
        <TagPicker noPopover selectedOptions={['missing']}>
          <TagPickerControl>
            <TagPickerGroup id="plain">Custom text</TagPickerGroup>
            <TagPickerInput aria-label="Choose" />
          </TagPickerControl>
        </TagPicker>,
      );
      group().should('contain.text', 'Custom text');
      group().find('[role="option"]').should('not.exist');
    });

    it('root role/tabindex override is forwarded while noncircular group mover wins caller attribute', () => {
      mount(<Picker groupProps={{ role: 'group', tabIndex: -1, 'data-tabster': '{"mover":{"cyclic":true}}' }} />);
      group().should('have.attr', 'role', 'group').and('have.attr', 'tabindex', '-1');
      group()
        .invoke('attr', 'data-tabster')
        .then(value => {
          expect(JSON.parse(value!).mover.cyclic).to.equal(false);
          expect(JSON.parse(value!).mover.memorizeCurrent).to.equal(true);
        });
    });

    it('multiple dismissal transfers focus to the next surviving tag and final dismissal to the input', () => {
      mount(<Picker />);
      tag('Beta').focus().realPress('Delete');
      tag('Gamma').should('have.focus').realPress('Delete');
      tag().should('have.focus').realPress('Delete');
      group().should('not.exist');
      cy.get('#input').should('have.focus');
    });

    it('selected count drives live hiding and ref attachment even with persistent static children', () => {
      const ref = React.createRef<HTMLDivElement>();
      const Example = () => {
        const [selected, setSelected] = React.useState(false);
        return (
          <>
            <button onClick={() => setSelected(value => !value)}>Toggle context</button>
            <TagPicker noPopover selectedOptions={selected ? ['Alpha'] : []}>
              <TagPickerControl>
                <TagPickerGroup ref={ref}>
                  <Tag value="Alpha">Alpha</Tag>
                </TagPickerGroup>
                <TagPickerInput aria-label="Choose" />
              </TagPickerControl>
            </TagPicker>
          </>
        );
      };
      mount(<Example />);
      group()
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
      cy.contains('button', 'Toggle context').realClick();
      group()
        .should('contain.text', 'Alpha')
        .should($group => expect(ref.current).to.equal($group[0]));
      cy.contains('button', 'Toggle context').realClick();
      group()
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
    });
  });

  describe('TagPickerGroup edges and accessibility (round 2)', () => {
    it('native ArrowRight forwards the trusted event then focuses the input trigger', () => {
      const key = cy.stub().as('key');
      mount(<Picker groupProps={{ onKeyDown: key }} />);
      tag('Gamma').focus().realPress('ArrowRight');
      cy.get('#input').should('have.focus');
      cy.get('@key')
        .should('have.been.calledOnce')
        .then(() => {
          expect(key.firstCall.args[0].key).to.equal('ArrowRight');
          expect(key.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
        });
    });

    it('consumer-cancelled ArrowRight preserves tag focus', () => {
      mount(<Picker groupProps={{ onKeyDown: event => event.preventDefault() }} />);
      tag('Gamma').focus().realPress('ArrowRight');
      tag('Gamma').should('have.focus');
    });

    it('cancelled child Delete does not dismiss or call picker selection', () => {
      const select = cy.stub().as('select');
      mount(
        <Picker
          onOptionSelect={select}
          tagProps={{ onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => event.preventDefault() }}
        />,
      );
      tag().focus().realPress('Delete');
      tag().should('exist').and('have.focus');
      cy.get('@select').should('not.have.been.called');
    });

    it('cancelled child click does not dismiss or call picker selection', () => {
      const select = cy.stub().as('select');
      mount(
        <Picker
          onOptionSelect={select}
          tagProps={{ onClick: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault() }}
        />,
      );
      tag().realClick();
      tag().should('exist');
      cy.get('@select').should('not.have.been.called');
    });

    it('cancelled picker selection leaves final tag present and suppresses automatic trigger focus', () => {
      mount(<Picker selected={['Alpha']} onOptionSelect={event => event.preventDefault()} />);
      tag().focus().realPress('Delete');
      tag().should('exist').and('have.focus');
      cy.get('#input').should('not.have.focus');
    });

    it('frozen controlled selected options report requested removal without removing children', () => {
      const select = cy.stub().as('select');
      mount(<Picker controlled onOptionSelect={select} />);
      tag('Beta').focus().realPress('Backspace');
      tag('Beta').should('exist');
      cy.get('@select')
        .should('have.been.calledOnce')
        .then(() => expect(select.firstCall.args[1].selectedOptions).to.deep.equal(['Alpha', 'Gamma']));
    });

    it('root attributes/style/ref are forwarded; ref detaches when last selection is dismissed', () => {
      const ref = React.createRef<HTMLDivElement>();
      mount(
        <Picker
          selected={['Alpha']}
          groupProps={{
            ref,
            id: 'selected-group',
            title: 'Selected',
            className: 'custom-group',
            style: { padding: 11, width: 160 },
          }}
        />,
      );
      group()
        .should('have.id', 'selected-group')
        .and('have.class', 'custom-group')
        .and('have.attr', 'title', 'Selected')
        .and('have.css', 'padding', '11px')
        .should($group => expect(ref.current).to.equal($group[0]));
      tag().focus().realPress('Delete');
      group()
        .should('not.exist')
        .then(() => expect(ref.current).to.equal(null));
      cy.get('#input').should('have.focus');
    });

    it('native Tab visits group tags as a single mover then input, reverse Tab remembers the tag', () => {
      mount(
        <>
          <button id="before">Before</button>
          <Picker />
          <button id="after">After</button>
        </>,
      );
      cy.get('#before').focus().realPress('Tab');
      tag().should('have.focus').realPress('ArrowDown');
      tag('Beta').should('have.focus').realPress('Tab');
      cy.get('#input').should('have.focus').realPress(['Shift', 'Tab']);
      tag('Beta').should('have.focus');
    });

    it('disabled picker disables tags; root aria-disabled override does not enable the actual child controls', () => {
      const select = cy.stub().as('select');
      mount(<Picker disabled onOptionSelect={select} />);
      group().should('have.attr', 'aria-disabled', 'true');
      tag().should('be.disabled').realClick();
      cy.get('@select').should('not.have.been.called');
      mount(<Picker disabled onOptionSelect={select} groupProps={{ 'aria-disabled': false }} />);
      group().should('have.attr', 'aria-disabled', 'false');
      tag().should('be.disabled');
    });
  });

  (['medium', 'large', 'extra-large'] as const).forEach((size, index) => {
    (['outline', 'underline', 'filled-darker', 'filled-lighter'] as const).forEach(appearance => {
      it(`${size}/${appearance}: group contextual sizing and tag appearance`, () => {
        mount(<Picker size={size} appearance={appearance} />);
        group()
          .should('have.attr', 'role', 'listbox')
          .and('have.attr', 'aria-label', 'Selected records')
          .and('have.css', 'flex-wrap', 'wrap')
          .and('have.css', 'gap', index === 0 ? '4px' : '6px')
          .and('have.css', 'padding-top', index === 0 ? '6px' : '8px');
        tag()
          .should('have.attr', 'role', 'option')
          .and('have.prop', 'tagName', 'BUTTON')
          .and('have.css', 'height', `${[20, 24, 32][index]}px`);
        tag().should('have.css', 'border-top-style', 'solid');
        tag().should(
          'have.css',
          'background-color',
          appearance === 'filled-darker' ? 'rgba(0, 0, 0, 0)' : 'rgb(245, 245, 245)',
        );
      });
    });
  });

  (['Delete', 'Backspace', 'Enter', 'Space', 'click'] as const).forEach(key => {
    it(`native ${key} dismisses exactly the focused tag and reports precise selected values`, () => {
      const select = cy.stub().as('select');
      mount(<Picker onOptionSelect={select} />);
      if (key === 'click') {
        tag('Beta').realClick();
      } else {
        tag('Beta').focus().realPress(key);
      }
      tag('Beta').should('not.exist');
      tag().should('exist');
      tag('Gamma').should('exist');
      cy.get('@select')
        .should('have.been.calledOnce')
        .then(() => {
          const [event, data] = select.firstCall.args;
          expect(event.nativeEvent.isTrusted).to.equal(true);
          expect(event.target.closest('button').id).to.equal('tag-Beta');
          expect(data.value).to.equal('Beta');
          expect(data.selectedOptions).to.deep.equal(['Alpha', 'Gamma']);
          expect(data.event).to.equal(event);
          expect(data.type).to.equal(key === 'Backspace' || key === 'Delete' ? 'keydown' : 'click');
        });
    });
  });

  it('group composes with button trigger and final dismissal returns its focus', () => {
    mount(<Picker selected={['Alpha']} button />);
    tag().focus().realPress('Delete');
    group().should('not.exist');
    cy.get('#input').should('have.focus');
  });
});
