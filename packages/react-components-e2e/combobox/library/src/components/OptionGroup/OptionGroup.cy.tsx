import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { Combobox, Dropdown, Option } from '@fluentui/react-combobox';
import type { DropdownProps } from '@fluentui/react-combobox';
import { OptionGroup } from './OptionGroup';
import type { OptionGroupProps } from './OptionGroup.types';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const trigger = () => cy.get('[role="combobox"]');
const option = (name: string) => cy.get(`[data-option="${name}"]`);
const active = (name: string) => {
  option(name)
    .invoke('attr', 'id')
    .then(id => trigger().should('have.attr', 'aria-activedescendant', id));
  trigger().should('be.focused');
};

const Grouped = ({
  host,
  custom = false,
  multiselect = false,
  onOptionSelect,
}: {
  host: 'Combobox' | 'Dropdown';
  custom?: boolean;
  multiselect?: boolean;
  onOptionSelect?: DropdownProps['onOptionSelect'];
}) => {
  const Host = host === 'Combobox' ? Combobox : Dropdown;
  const groups =
    custom && host === 'Dropdown'
      ? [
          ['Land', 'Cat', 'Dog', 'Rabbit'],
          ['Sea', 'Fish', 'Turtle'],
        ]
      : [
          ['Land', 'Cat', 'Dog', 'Ferret', 'Hamster'],
          ['Sea', 'Fish', 'Jellyfish', 'Octopus', 'Seal'],
        ];
  return (
    <>
      <button data-test="before">Before</button>
      <Host
        aria-label="Best pet"
        placeholder="Select an animal"
        multiselect={multiselect}
        onOptionSelect={onOptionSelect}
      >
        {groups.map(([label, ...items]) => (
          <OptionGroup key={label} label={custom ? { children: label, className: 'custom-label' } : label}>
            {items.map(name => (
              <Option
                key={name}
                data-option={name}
                text={name}
                disabled={name === 'Ferret'}
                checkIcon={custom ? <span data-test="custom-check">Checked</span> : undefined}
              >
                {custom && host === 'Dropdown' ? <span>{name}</span> : name}
              </Option>
            ))}
          </OptionGroup>
        ))}
      </Host>
      <button data-test="after">After</button>
    </>
  );
};

describe('OptionGroup documented scenarios', () => {
  it('renders a visible separator between groups but not after the last group', () => {
    mount(
      <Dropdown aria-label="Separated groups" defaultOpen>
        <OptionGroup label="Land" data-test="first-group">
          <Option>Cat</Option>
        </OptionGroup>
        <OptionGroup label="Sea" data-test="last-group">
          <Option>Fish</Option>
        </OptionGroup>
      </Dropdown>,
    );
    cy.get('[data-test="first-group"]').should(group => {
      const separator = group[0].ownerDocument.defaultView!.getComputedStyle(group[0], '::after');
      expect(separator.content, 'generated separator').to.equal('""');
      expect(separator.display).to.equal('block');
      expect(separator.borderBottomStyle).to.equal('solid');
      expect(separator.borderBottomWidth).to.equal('1px');
      expect(separator.borderBottomColor).not.to.equal('rgba(0, 0, 0, 0)');
    });
    cy.get('[data-test="last-group"]').should(group => {
      const separator = group[0].ownerDocument.defaultView!.getComputedStyle(group[0], '::after');
      expect(separator.content, 'no trailing separator').to.equal('none');
    });
  });

  (['Combobox', 'Dropdown'] as const).forEach(host => {
    [false, true].forEach(custom => {
      it(`${host} ${
        custom ? 'CustomOptions' : 'Grouped'
      }: named groups, disabled rejection, cross-group selection`, () => {
        const select = cy.stub().as('select');
        mount(<Grouped host={host} custom={custom} onOptionSelect={select} />);
        cy.get('[data-test="before"]').focus();
        cy.realPress('Tab');
        trigger().should('be.focused');
        cy.realPress('ArrowDown');
        cy.get('[role="listbox"]').should('be.visible').find('[role="group"]').should('have.length', 2);
        cy.get('[role="group"]').each((group, index) => {
          cy.wrap(group)
            .invoke('attr', 'aria-labelledby')
            .then(id => {
              cy.wrap(group)
                .find(`[id="${id}"]`)
                .should('be.visible')
                .and('have.text', index === 0 ? 'Land' : 'Sea');
              cy.get(`[id="${id}"]`).should('have.attr', 'role', 'presentation');
            });

          cy.wrap(group)
            .find('.fui-Option')
            .should('have.length', custom && host === 'Dropdown' ? (index === 0 ? 3 : 2) : 4);
          cy.wrap(group)
            .find(`[data-option="${index === 0 ? 'Cat' : 'Fish'}"]`)
            .should('exist');
          cy.wrap(group).should(element => {
            expect(element).not.to.have.attr('tabindex');
            expect(element).not.to.have.attr('aria-selected');
          });
        });
        active('Cat');
        cy.realPress('ArrowDown');
        active('Dog');
        cy.realPress('ArrowDown');
        if (!(custom && host === 'Dropdown')) {
          active('Ferret');
          cy.realPress('Enter');
          cy.get('@select').should('not.have.been.called');
          option('Ferret').should('have.attr', 'aria-selected', 'false');
          cy.realPress('ArrowDown');
        }
        active(custom && host === 'Dropdown' ? 'Rabbit' : 'Hamster');
        cy.get('@select').should('not.have.been.called');
        cy.realPress('ArrowDown');
        active('Fish');
        if (custom) {
          option('Fish').find('[data-test="custom-check"]').should('not.be.visible');
        }
        cy.realPress('Enter');
        cy.get('@select')
          .should('have.been.calledOnce')
          .its('firstCall.args.1.selectedOptions')
          .should('deep.equal', ['Fish']);
        trigger().should('have.attr', 'aria-expanded', 'false');
        cy.get('[role="listbox"]').should('not.be.visible');
        trigger().should('be.focused');
        if (host === 'Combobox') {
          trigger().should('have.value', 'Fish');
        } else {
          trigger().should('have.text', 'Fish');
        }
        cy.realPress('ArrowDown');
        option('Fish').should('have.attr', 'aria-selected', 'true');
        option('Cat').should('have.attr', 'aria-selected', 'false');
        if (custom) {
          cy.get('.custom-label').should('have.length', 2);
          option('Fish').find('[data-test="custom-check"]').should('be.visible');
          option('Cat').find('[data-test="custom-check"]').should('not.be.visible');
          if (host === 'Dropdown') {
            cy.realPress('T');
            active('Turtle');
            cy.get('@select').should('have.been.calledOnce');
          }
        }
        cy.realPress('Escape');
        trigger().should('have.attr', 'aria-expanded', 'false');
        cy.get('[role="listbox"]').should('not.be.visible');
        cy.realPress('Tab');
        cy.get('[data-test="after"]').should('be.focused');
      });
    });
    it(`${host}: grouped multiselect preserves selections across group boundaries`, () => {
      const select = cy.stub().as('select');
      mount(<Grouped host={host} multiselect onOptionSelect={select} />);
      trigger().click();
      option('Cat').click().should('have.attr', 'aria-checked', 'true');
      option('Fish').click().should('have.attr', 'aria-checked', 'true');
      option('Dog').should('have.attr', 'aria-checked', 'false');
      option('Cat').should('have.attr', 'aria-checked', 'true');
      cy.get('@select')
        .should('have.been.calledTwice')
        .its('lastCall.args.1.selectedOptions')
        .should('deep.equal', ['Cat', 'Fish']);
      option('Ferret').click().should('have.attr', 'aria-checked', 'false');
      cy.get('@select').should('have.been.calledTwice');
      option('Cat').click().should('have.attr', 'aria-checked', 'false');
      option('Fish').should('have.attr', 'aria-checked', 'true');
    });
  });
});

describe('OptionGroup undocumented and accessibility edges', () => {
  it('unlabelled and null-label groups use consumer names without a dangling label reference or Tab stops', () => {
    mount(
      <>
        <button data-test="before">Before</button>
        <Dropdown aria-label="Optional groups">
          <OptionGroup aria-label="No visual label" data-test="unlabelled">
            <Option data-option="Cat">Cat</Option>
          </OptionGroup>
          <OptionGroup label={null} aria-label="Null visual label" data-test="null-label">
            <Option data-option="Fish">Fish</Option>
          </OptionGroup>
        </Dropdown>
        <button data-test="after">After</button>
      </>,
    );
    cy.get('[data-test="before"]').focus();
    cy.realPress('Tab');
    trigger().should('be.focused');
    cy.realPress('ArrowDown');
    ['unlabelled', 'null-label'].forEach(test => {
      cy.get(`[data-test="${test}"]`).should('have.attr', 'role', 'group');
      cy.get(`[data-test="${test}"]`).should('not.have.attr', 'aria-labelledby');
      cy.get(`[data-test="${test}"]`).find('.fui-OptionGroup__label').should('not.exist');
    });
    cy.realPress('ArrowDown');
    active('Fish');
    cy.realPress('Escape');
    cy.realPress('Tab');
    cy.get('[data-test="after"]').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    trigger().should('be.focused');
  });

  it('duplicate label text still has distinct in-group ID references across reopen', () => {
    mount(
      <Dropdown aria-label="Same labels">
        <OptionGroup label="Pets">
          <Option>Cat</Option>
        </OptionGroup>
        <OptionGroup label="Pets">
          <Option>Fish</Option>
        </OptionGroup>
      </Dropdown>,
    );
    trigger().click();
    const ids: string[] = [];
    cy.get('[role="group"]')
      .each(group => {
        const id = group.attr('aria-labelledby');
        expect(id).to.be.a('string').and.not.be.empty;
        ids.push(id!);
        cy.wrap(group).find(`[id="${id}"]`).should('have.text', 'Pets');
      })
      .then(() => expect(new Set(ids).size).to.equal(2));
    cy.realPress('Escape');
    cy.realPress('ArrowDown');
    cy.get('[role="group"]').each((group, index) => expect(group.attr('aria-labelledby')).to.equal(ids[index]));
  });

  it('custom label slot IDs name their own groups without dangling generated references', () => {
    mount(
      <Dropdown aria-label="Custom label ID" defaultOpen>
        <OptionGroup label={{ id: 'consumer-label', children: 'Land' }} data-test="custom-id">
          <Option>Cat</Option>
        </OptionGroup>
      </Dropdown>,
    );
    cy.get('[data-test="custom-id"]').should('have.attr', 'aria-labelledby', 'consumer-label');
    cy.get('[data-test="custom-id"]').find('#consumer-label').should('be.visible').and('have.text', 'Land');
  });

  it('dynamic label removal and restoration preserve children and stable generated IDs', () => {
    const Dynamic = () => {
      const [label, setLabel] = React.useState<OptionGroupProps['label']>('Land');
      return (
        <>
          <button onClick={() => setLabel(label ? null : 'Renamed land')}>Toggle label</button>
          <Dropdown aria-label="Dynamic labels" open>
            <OptionGroup label={label} aria-label={!label ? 'Land without header' : undefined} data-test="dynamic">
              <Option data-option="Cat">Cat</Option>
            </OptionGroup>
          </Dropdown>
        </>
      );
    };
    mount(<Dynamic />);
    cy.get('[data-test="dynamic"]')
      .invoke('attr', 'aria-labelledby')
      .then(id => {
        cy.contains('button', 'Toggle label').click();
        cy.get('[data-test="dynamic"]').should('not.have.attr', 'aria-labelledby');
        cy.get('[data-test="dynamic"]').should('have.attr', 'aria-label', 'Land without header');
        cy.get('[data-test="dynamic"]').find('.fui-OptionGroup__label').should('not.exist');
        option('Cat').should('be.visible');
        cy.contains('button', 'Toggle label').click();
        cy.get('[data-test="dynamic"]').should('have.attr', 'aria-labelledby', id);
        cy.get('[data-test="dynamic"]').find('.fui-OptionGroup__label').should('have.text', 'Renamed land');
        cy.get('[data-test="dynamic"]').should('not.have.attr', 'aria-label');
      });
  });

  (['Combobox', 'Dropdown'] as const).forEach(host => {
    it(`${host}: owner-rejected selection leaves group and child state unchanged`, () => {
      const Host = host === 'Combobox' ? Combobox : Dropdown;
      const select = cy.stub().as('select');
      mount(
        <Host aria-label="Rejected proposal" selectedOptions={['Cat']} value="Cat" onOptionSelect={select}>
          <OptionGroup label="Land">
            <Option value="Cat" data-option="Cat">
              Cat
            </Option>
          </OptionGroup>
          <OptionGroup label="Sea">
            <Option value="Fish" data-option="Fish">
              Fish
            </Option>
          </OptionGroup>
        </Host>,
      );
      trigger().click();
      option('Fish').click();
      cy.get('@select')
        .should('have.been.calledOnce')
        .its('firstCall.args.1.selectedOptions')
        .should('deep.equal', ['Fish']);
      trigger().click();
      option('Cat').should('have.attr', 'aria-selected', 'true');
      option('Fish').should('have.attr', 'aria-selected', 'false');
      cy.get('[role="group"]').should('have.length', 2);
    });
  });
});

describe('OptionGroup unit-derived browser contracts', () => {
  it('preserves root/label slot classes, attributes, custom markup and refs while naming visible content', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const labelRef = React.createRef<HTMLSpanElement>();
    mount(
      <Dropdown aria-label="Native group props" defaultOpen>
        <OptionGroup
          ref={rootRef}
          id="native-group"
          className="consumer-group"
          title="Native title"
          data-test="native"
          label={{
            ref: labelRef,
            className: 'consumer-label',
            title: 'Label title',
            children: <strong>Rich label</strong>,
          }}
        >
          <Option data-option="Cat">Cat</Option>
        </OptionGroup>
      </Dropdown>,
    );
    cy.get('#native-group').should('have.class', 'fui-OptionGroup').and('have.class', 'consumer-group');
    cy.get('#native-group').should('have.attr', 'title', 'Native title');
    cy.get('#native-group').then(element => expect(rootRef.current).to.equal(element[0]));
    cy.get('.consumer-label').should('have.class', 'fui-OptionGroup__label').and('have.attr', 'title', 'Label title');
    cy.get('.consumer-label').find('strong').should('have.text', 'Rich label');
    cy.get('.consumer-label').then(element => expect(labelRef.current).to.equal(element[0]));
    cy.get('#native-group')
      .invoke('attr', 'aria-labelledby')
      .then(id => cy.get(`#native-group [id="${id}"]`).should('have.text', 'Rich label'));
    option('Cat').should('be.visible');
  });

  it('explicit root role and external aria-labelledby override generated group defaults', () => {
    mount(
      <>
        <span id="external-name">External group name</span>
        <Dropdown aria-label="Explicit semantics" defaultOpen>
          <OptionGroup role="region" aria-labelledby="external-name" label="Internal label" data-test="override">
            <Option data-option="Cat">Cat</Option>
          </OptionGroup>
        </Dropdown>
      </>,
    );
    cy.get('[data-test="override"]').should('have.attr', 'role', 'region');
    cy.get('[data-test="override"]').should('have.attr', 'aria-labelledby', 'external-name');
    cy.get('#external-name').should('have.text', 'External group name');
    cy.get('[data-test="override"]').find('.fui-OptionGroup__label').should('have.text', 'Internal label');
  });

  it('root and label refs clear on unmount and point to new nodes on remount', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const labelRef = React.createRef<HTMLSpanElement>();
    const Lifecycle = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button onClick={() => setShown(!shown)}>Toggle group</button>
          <Dropdown aria-label="Lifecycle" open>
            {shown && (
              <OptionGroup ref={rootRef} label={{ ref: labelRef, children: 'Land' }}>
                <Option>Cat</Option>
              </OptionGroup>
            )}
          </Dropdown>
        </>
      );
    };
    mount(<Lifecycle />);
    cy.get('.fui-OptionGroup').then(element => {
      const original = element[0];
      expect(rootRef.current).to.equal(original);
      expect(labelRef.current?.textContent).to.equal('Land');
      cy.contains('button', 'Toggle group').click();
      cy.get('.fui-OptionGroup')
        .should('not.exist')
        .then(() => {
          expect(rootRef.current).to.equal(null);
          expect(labelRef.current).to.equal(null);
          expect(original.isConnected).to.equal(false);
        });
      cy.contains('button', 'Toggle group').click();
      cy.get('.fui-OptionGroup').then(remounted => {
        expect(rootRef.current).to.equal(remounted[0]);
        expect(rootRef.current).not.to.equal(original);
        expect(labelRef.current?.isConnected).to.equal(true);
      });
    });
  });

  it('label click does not select children and current root/label handlers receive native events', () => {
    const rootClick = cy.stub().as('rootClick');
    const labelClick = cy.stub().as('labelClick');
    const select = cy.stub().as('select');
    mount(
      <Dropdown aria-label="Group event forwarding" defaultOpen onOptionSelect={select}>
        <OptionGroup
          data-test="events"
          onClick={rootClick}
          label={{ children: 'Land', onClick: labelClick, className: 'event-label' }}
        >
          <Option data-option="Cat">Cat</Option>
        </OptionGroup>
      </Dropdown>,
    );
    cy.get('.event-label').click();
    cy.get('@rootClick').should('have.been.calledOnce');
    cy.get('@labelClick').should('have.been.calledOnce').its('firstCall.args.0.type').should('equal', 'click');
    cy.get('@select').should('not.have.been.called');
    option('Cat').should('have.attr', 'aria-selected', 'false').click();
    cy.get('@rootClick').should('have.been.calledTwice');
    cy.get('@labelClick').should('have.been.calledOnce');
    cy.get('@select').should('have.been.calledOnce').its('firstCall.args.1.optionText').should('equal', 'Cat');
  });

  it('empty groups keep labels but never become options or consume keyboard navigation', () => {
    mount(
      <Dropdown aria-label="Empty groups">
        <OptionGroup label="Empty first" data-test="empty" />
        <OptionGroup label="Land">
          <Option data-option="Cat">Cat</Option>
        </OptionGroup>
        <OptionGroup label="Empty middle" />
        <OptionGroup label="Sea">
          <Option data-option="Fish">Fish</Option>
        </OptionGroup>
      </Dropdown>,
    );
    trigger().click();
    cy.get('[role="group"]').should('have.length', 4);
    cy.get('[data-test="empty"]').find('.fui-OptionGroup__label').should('have.text', 'Empty first');
    cy.get('[role="option"]').should('have.length', 2);
    active('Cat');
    cy.realPress('ArrowDown');
    active('Fish');
    cy.realPress('ArrowDown');
    active('Fish');
    cy.realPress('Home');
    active('Cat');
  });

  it('reordered and replaced grouped children update navigation and payloads without stale values', () => {
    const select = cy.stub().as('select');
    const DynamicChildren = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button data-test="replace" onClick={() => setChanged(!changed)}>
            Replace children
          </button>
          <Dropdown aria-label="Changing groups" open onOptionSelect={select}>
            <OptionGroup label="Land">
              {(changed ? ['Dog', 'Cat'] : ['Cat', 'Hamster']).map(name => (
                <Option key={name} data-option={name}>
                  {name}
                </Option>
              ))}
            </OptionGroup>
            <OptionGroup label="Sea">
              <Option data-option="Fish">Fish</Option>
            </OptionGroup>
          </Dropdown>
        </>
      );
    };
    mount(<DynamicChildren />);
    trigger().focus();
    cy.realPress('Home');
    active('Cat');
    cy.get('[data-test="replace"]').click();
    option('Hamster').should('not.exist');
    cy.realPress('Tab');
    trigger().should('be.focused');
    cy.realPress('Home');
    active('Dog');
    cy.realPress('ArrowDown');
    active('Cat');
    cy.realPress('ArrowDown');
    active('Fish');
    cy.realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .its('firstCall.args.1.selectedOptions')
      .should('deep.equal', ['Fish']);
    option('Fish').should('have.attr', 'aria-selected', 'true');
    option('Cat').should('have.attr', 'aria-selected', 'false');
  });
});
