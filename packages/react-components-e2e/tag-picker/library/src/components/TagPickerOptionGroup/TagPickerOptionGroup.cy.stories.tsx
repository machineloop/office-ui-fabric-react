import * as React from 'react';
import * as axe from 'axe-core';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  teamsHighContrastTheme,
  TagPicker,
  TagPickerControl,
  TagPickerGroup,
  TagPickerInput,
  TagPickerList,
  TagPickerOption,
  Option,
} from '@fluentui/react-components';
import type { Theme, TagPickerProps } from '@fluentui/react-components';
import { Grouped } from '../../../../stories/src/TagPicker/TagPickerGrouped.stories';
import { TagPickerOptionGroup } from './TagPickerOptionGroup';
import type { TagPickerOptionGroupState } from './TagPickerOptionGroup.types';

const group = '.fui-TagPickerOptionGroup';
const label = '.fui-TagPickerOptionGroup__label';
const input = '[role="combobox"]';
const option = '.fui-Option[role="option"]';
const mount = (children: React.ReactElement, theme: Theme = webLightTheme, dir: 'ltr' | 'rtl' = 'ltr') =>
  mountBase(
    <FluentProvider theme={theme} dir={dir}>
      <main aria-label="Group test">{children}</main>
    </FluentProvider>,
  );

const Picker = ({ children, ...props }: Omit<TagPickerProps, 'children'> & { children: React.ReactNode }) => (
  <TagPicker {...props}>
    <TagPickerControl>
      <TagPickerGroup aria-label="Selected employees" />
      <TagPickerInput aria-label="Select employees" />
    </TagPickerControl>
    <TagPickerList aria-label="Available employees">{children}</TagPickerList>
  </TagPicker>
);

const Groups = () => (
  <>
    <TagPickerOptionGroup label="Managers">
      <TagPickerOption value="john">John Doe</TagPickerOption>
      <TagPickerOption value="jane">Jane Doe</TagPickerOption>
    </TagPickerOptionGroup>
    <TagPickerOptionGroup label="Devs">
      <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
      <TagPickerOption value="amelie">Amelie Dupont</TagPickerOption>
    </TagPickerOptionGroup>
  </>
);

const expectActive = (text: string) =>
  cy
    .get(input)
    .should('be.focused')
    .invoke('attr', 'aria-activedescendant')
    .should('be.a', 'string')
    .and('not.be.empty')
    .then(id => {
      expect(id, 'active option id').to.be.a('string').and.not.be.empty;
      cy.get(`[id="${id}"]`).should('have.attr', 'role', 'option').and('have.text', text);
    });

const auditReports: {
  test: string;
  scope: string;
  passes: number;
  groupPasses: number;
  violations: number;
}[] = [];

const audit = (scope = 'main, .fui-TagPickerList:visible') =>
  cy
    .get(scope)
    .should('be.visible')
    .then($regions => axe.run({ include: Array.from($regions) }))
    .then(result => {
      const groupPasses = result.passes.filter(pass =>
        pass.nodes.some(node => node.html.includes('fui-TagPickerOptionGroup')),
      ).length;
      expect(result.passes.length, 'axe evaluated the mounted composition').to.be.greaterThan(0);
      expect(groupPasses, 'axe evaluated the target groups, including portaled lists').to.be.greaterThan(0);
      expect(
        result.violations.map(v => `${v.id}: ${JSON.stringify(v.nodes.map(node => node.html))}`),
        'axe violations',
      ).to.deep.equal([]);
      auditReports.push({
        test: Cypress.currentTest.title,
        scope,
        passes: result.passes.length,
        groupPasses,
        violations: result.violations.length,
      });
      return cy.writeFile('src/components/TagPickerOptionGroup/.cypress-downloads/axe-audits.json', auditReports, {
        log: false,
      });
    });

describe('TagPickerOptionGroup documented grouping', () => {
  it('D01 renders the actual Grouped story with named groups and rich options', () => {
    mount(<Grouped />);
    cy.get(input).realClick();
    cy.get(group)
      .should('have.length', 2)
      .each(($group, index) => {
        cy.wrap($group).should('have.attr', 'role', 'group').find(option).should('have.length', 4);
        const id = $group.attr('aria-labelledby');
        expect(id).to.be.a('string').and.not.be.empty;
        cy.get(`[id="${id}"]`).should('have.text', index === 0 ? 'Managers' : 'Devs');
      });
    cy.get(`${group} ${option}`).each($option => {
      cy.wrap($option).find('.fui-TagPickerOption__media .fui-Avatar').should('have.attr', 'aria-hidden', 'true');
      cy.wrap($option).find('.fui-TagPickerOption__secondaryContent').should('have.text', 'Microsoft FTE');
    });
    audit();
  });

  it('D02 selects from both story groups and excludes selected values when reopened', () => {
    mount(<Grouped />);
    cy.get(input).realClick();
    cy.contains(option, 'John Doe').realClick();
    cy.get('.fui-Tag').should('have.length', 1).and('contain.text', 'John Doe');
    cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false').realClick();
    cy.get(group).first().find(option).should('have.length', 3);
    cy.contains(option, 'John Doe').should('not.exist');
    cy.contains(option, 'Pierre Dupont').realClick();
    cy.get('.fui-Tag').should('have.length', 2).and('contain.text', 'Pierre Dupont');
    cy.get(input).realClick();
    cy.get(group).last().find(option).should('have.length', 3);
    cy.contains(option, 'Pierre Dupont').should('not.exist');
    audit('.fui-TagPickerList');
  });

  it('D03 removes exhausted story groups and ignores the no-options sentinel', () => {
    mount(<Grouped />);
    const managers = ['John Doe', 'Jane Doe', 'Max Mustermann', 'Erika Mustermann'];
    const devs = ['Pierre Dupont', 'Amelie Dupont', 'Mario Rossi', 'Maria Rossi'];
    managers.forEach(name => {
      cy.get(input).realClick();
      cy.contains(option, name).realClick();
    });
    cy.get(input).realClick();
    cy.get(group).should('have.length', 1).find(label).should('have.text', 'Devs');
    cy.get(input).realPress('Escape');
    devs.forEach(name => {
      cy.get(input).realClick();
      cy.contains(option, name).realClick();
    });
    cy.get('.fui-Tag').should('have.length', 8);
    cy.get(input).realClick();
    cy.get(group).should('not.exist');
    cy.contains(option, 'No options available').realClick();
    cy.get('.fui-Tag').should('have.length', 8);
    cy.get(input).realClick();
    cy.contains(option, 'No options available').should('be.visible');
  });

  it('D04 restores the appropriate group when a selected story tag is dismissed', () => {
    mount(<Grouped />);
    ['John Doe', 'Jane Doe', 'Max Mustermann', 'Erika Mustermann'].forEach(name => {
      cy.get(input).realClick();
      cy.contains(option, name).realClick();
    });
    cy.get(input).realClick();
    cy.get(group).should('have.length', 1);
    cy.get(input).realPress('Escape');
    cy.contains('.fui-Tag', 'John Doe').realClick();
    cy.get('.fui-Tag').should('have.length', 3);
    cy.get(input).realClick();
    cy.get(group)
      .should('have.length', 2)
      .first()
      .find(option)
      .should('have.length', 1)
      .and('contain.text', 'John Doe');
  });

  it('D05 Backspace focuses the last tag then deletion restores its exhausted department', () => {
    mount(<Grouped />);
    ['Pierre Dupont', 'John Doe', 'Jane Doe', 'Max Mustermann', 'Erika Mustermann'].forEach(name => {
      cy.get(input).realClick();
      cy.contains(option, name).realClick();
    });
    cy.get(input).realClick();
    cy.get(group).should('have.length', 1).find(label).should('have.text', 'Devs');
    cy.get(input).realPress('Escape');
    cy.get(input).should('have.value', '').realPress('Backspace');
    cy.get('.fui-Tag').should('have.length', 5);
    cy.contains('.fui-Tag', 'Erika Mustermann').should('be.focused').realPress('Backspace');
    cy.get('.fui-Tag')
      .should('have.length', 4)
      .and('contain.text', 'Pierre Dupont')
      .and('not.contain.text', 'Erika Mustermann');
    cy.contains('.fui-Tag', 'Max Mustermann').should('be.focused').realPress('Tab');
    cy.get(input).should('be.focused').realPress('ArrowDown');
    cy.get(group).should('have.length', 2).first().find(label).should('have.text', 'Managers');
    cy.get(group).first().find(option).should('have.length', 1).and('contain.text', 'Erika Mustermann');
    cy.contains(option, 'Erika Mustermann').realClick();
    cy.get('.fui-Tag').should('have.length', 5).and('contain.text', 'Erika Mustermann');
  });
});

describe('TagPickerOptionGroup unit snapshot contract', () => {
  it('P01 preserves the unit snapshot default without an optional label', () => {
    mount(<TagPickerOptionGroup>Default TagPickerOptionGroup</TagPickerOptionGroup>);
    cy.get(group)
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'group')
      .and('have.class', 'fui-OptionGroup')
      .and('have.text', 'Default TagPickerOptionGroup')
      .and('not.have.attr', 'aria-labelledby');
    cy.get(label).should('not.exist');
  });
});

describe('TagPickerOptionGroup keyboard and picker integration', () => {
  (['Enter', 'ArrowDown', 'ArrowUp'] as const).forEach(key => {
    it(`K01 opens grouped options with ${key} from a real Tab focus`, () => {
      const select = cy.stub().as('select');
      mount(
        <>
          <button>Before</button>
          <Picker onOptionSelect={select}>
            <Groups />
          </Picker>
        </>,
      );
      cy.contains('button', 'Before').realClick().realPress('Tab');
      cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false').realPress(key);
      cy.get(input).should('have.attr', 'aria-expanded', 'true');
      cy.get(group).should('have.length', 2).and('be.visible');
      expectActive('John Doe');
      cy.get('@select').should('not.have.been.called');
      audit();
    });
  });

  it('K02 traverses group boundaries in both directions without focusing labels', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <Groups />
      </Picker>,
    );
    cy.get(input).realClick();
    expectActive('John Doe');
    cy.get(input).realPress('ArrowDown');
    expectActive('Jane Doe');
    cy.get(input).realPress('ArrowDown');
    expectActive('Pierre Dupont');
    cy.get(input).realPress('ArrowUp');
    expectActive('Jane Doe');
    cy.get('@select').should('not.have.been.called');
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
        value: 'jane',
        type: 'keydown',
        selectedOptions: ['jane'],
      });
    cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });

  it('K03 Home and End navigate options rather than group labels', () => {
    mount(
      <Picker>
        <Groups />
      </Picker>,
    );
    cy.get(input).realClick().realPress('End');
    expectActive('Amelie Dupont');
    cy.get(input).realPress('Home');
    expectActive('John Doe');
  });

  it('K04 type-to-find searches option text across groups, never headings', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <Groups />
      </Picker>,
    );
    cy.get(input).realClick().realType('Pierre');
    expectActive('Pierre Dupont');
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pierre', selectedOptions: ['pierre'] });
    cy.get(input).should('have.value', '').realClick().realType('Managers');
    cy.get(input).should('not.have.attr', 'aria-activedescendant').realPress('Enter');
    cy.get('@select').should('have.been.calledOnce');
    cy.get(group).should('have.length', 2);
  });

  it('K05 disabled base Option children remain navigable but never select by pointer or Enter', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOptionGroup label="Unavailable">
          <Option disabled role="option" value="john">
            John Doe
          </Option>
        </TagPickerOptionGroup>
        <TagPickerOptionGroup label="Available">
          <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.contains(option, 'John Doe').should('have.attr', 'aria-disabled', 'true').realClick();
    cy.get('@select').should('not.have.been.called');
    cy.get(input).should('have.attr', 'aria-expanded', 'true').realPress('Home');
    expectActive('John Doe');
    cy.get(input).realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.get(input).should('have.attr', 'aria-expanded', 'false').realPress('ArrowDown').realPress('ArrowDown');
    expectActive('Pierre Dupont');
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pierre', selectedOptions: ['pierre'] });
  });

  it('K06 Escape closes groups without selecting and reopening retains labels', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <Groups />
      </Picker>,
    );
    cy.get(input).realClick().realPress('ArrowDown').realPress('Escape');
    cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false');
    cy.get(group).should('not.be.visible');
    cy.get('@select').should('not.have.been.called');
    cy.get(input).realPress('ArrowDown');
    cy.get(group).should('be.visible').find(label).should('have.length', 2);
    audit();
  });

  it('K07 Tab leaves the picker without tab stops on groups, headings or options', () => {
    const select = cy.stub().as('select');
    mount(
      <>
        <Picker onOptionSelect={select}>
          <Groups />
        </Picker>
        <button>After</button>
      </>,
    );
    cy.get(input).realClick().realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
    cy.get(input).should('have.attr', 'aria-expanded', 'false');
    cy.get('@select').should('not.have.been.called');
    cy.contains('button', 'After').realPress(['Shift', 'Tab']);
    cy.get(input).should('be.focused');
  });

  it('K08 controlled open requests and selections retain their exact payloads', () => {
    const open = cy.stub().as('open');
    const select = cy.stub().as('select');
    const Example = () => {
      const [isOpen, setOpen] = React.useState(false);
      return (
        <Picker
          open={isOpen}
          onOpenChange={(event, data) => {
            open(event, data);
            setOpen(data.open);
          }}
          onOptionSelect={select}
        >
          <Groups />
        </Picker>
      );
    };
    mount(<Example />);
    cy.get(input).realClick();
    cy.get('@open')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { open: true });
    cy.contains(option, 'Pierre Dupont').realClick();
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
        value: 'pierre',
        type: 'click',
        selectedOptions: ['pierre'],
      });
    cy.get('@select')
      .its('lastCall.args')
      .then(args => expect(args[1].event).to.equal(args[0]));
    cy.get('@open')
      .should('have.been.calledTwice')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { open: false });
    cy.get(input).should('have.attr', 'aria-expanded', 'false');
  });
});

describe('TagPickerOptionGroup styles and documented visual variants', () => {
  [
    { name: 'light', theme: webLightTheme },
    { name: 'dark', theme: webDarkTheme },
    { name: 'high contrast', theme: teamsHighContrastTheme },
  ].forEach(({ name, theme }) => {
    it(`S01 ${name} grouped story retains theme styles, semantics and selection`, () => {
      mount(<Grouped />, theme);
      cy.get(input).realClick();
      cy.get(label)
        .first()
        .should('have.css', 'font-size', '12px')
        .and('have.css', 'font-weight', '600')
        .and('have.css', 'line-height', '16px')
        .and('have.css', 'padding', '8px 6px')
        .then($label => {
          const expected = $label[0].ownerDocument.createElement('span');
          expected.style.color = theme.colorNeutralForeground3;
          $label[0].appendChild(expected);
          expect($label.css('color')).to.equal(expected.ownerDocument.defaultView?.getComputedStyle(expected).color);
          expected.remove();
        });
      audit();
      cy.contains(option, 'Pierre Dupont').realClick();
      cy.get('.fui-Tag').should('have.length', 1).and('contain.text', 'Pierre Dupont');
    });
  });

  it('S02 RTL preserves group order, label layout and cross-group keyboard selection', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker defaultOpen onOptionSelect={select}>
        <Groups />
      </Picker>,
      webLightTheme,
      'rtl',
    );
    cy.get(group).should('have.css', 'direction', 'rtl').find(label).first().should('have.text', 'Managers');
    cy.get(input).realClick().realPress('ArrowDown');
    expectActive('John Doe');
    cy.get(input).realPress('ArrowDown').realPress('ArrowDown');
    expectActive('Pierre Dupont');
    audit();
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pierre' });
  });

  (['medium', 'large', 'extra-large'] as const).forEach(size => {
    it(`S03 ${size} picker preserves flex group layout and static heading metrics`, () => {
      mount(
        <Picker size={size}>
          <Groups />
        </Picker>,
      );
      cy.get(input).realClick();
      cy.get(group)
        .first()
        .should('have.css', 'display', 'flex')
        .and('have.css', 'flex-direction', 'column')
        .and('have.css', 'row-gap', '2px');
      cy.get(label).should('have.css', 'display', 'block').and('have.css', 'font-size', '12px');
      cy.get(group)
        .first()
        .then($group => {
          const heading = $group.find(label)[0].getBoundingClientRect();
          const options = $group.find(option);
          expect(options[0].getBoundingClientRect().top).to.be.at.least(heading.bottom);
          expect(options[1].getBoundingClientRect().top).to.be.at.least(options[0].getBoundingClientRect().bottom);
        });
      cy.contains(option, 'Jane Doe').realClick();
      cy.get(input).should('have.attr', 'aria-expanded', 'false');
    });
  });

  it('S04 draws a separator only after a non-final group and updates when groups disappear', () => {
    const Example = () => {
      const [second, setSecond] = React.useState(true);
      return (
        <>
          <button onClick={() => setSecond(false)}>Remove second group</button>
          <Picker open>
            <TagPickerOptionGroup label="Managers">
              <TagPickerOption value="john">John Doe</TagPickerOption>
            </TagPickerOptionGroup>
            {second && (
              <TagPickerOptionGroup label="Devs">
                <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
              </TagPickerOptionGroup>
            )}
          </Picker>
        </>
      );
    };
    mount(<Example />);
    cy.get(group)
      .first()
      .then($group => {
        const pseudo = $group[0].ownerDocument.defaultView?.getComputedStyle($group[0], '::after');
        expect(pseudo?.content).to.equal('""');
        expect(pseudo?.borderBottomWidth).to.equal('1px');
        expect(pseudo?.borderBottomStyle).to.equal('solid');
        expect(pseudo?.paddingBottom).to.equal('4px');
        expect(pseudo?.marginLeft).to.equal('-4px');
      });
    cy.get(group)
      .last()
      .then($group =>
        expect($group[0].ownerDocument.defaultView?.getComputedStyle($group[0], '::after').content).to.equal('none'),
      );
    cy.contains('button', 'Remove second group').realClick();
    cy.get(group)
      .should('have.length', 1)
      .then($group =>
        expect($group[0].ownerDocument.defaultView?.getComputedStyle($group[0], '::after').content).to.equal('none'),
      );
  });
});

describe('TagPickerOptionGroup inherited public contracts', () => {
  it('P02 forwards native root props, root ref and consumer classes', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <TagPickerOptionGroup
        ref={ref}
        id="people"
        title="Employees"
        className="consumer-group"
        data-testid="native"
        aria-label="People"
      >
        Content
      </TagPickerOptionGroup>,
    );
    cy.get('#people')
      .should('have.attr', 'title', 'Employees')
      .and('have.attr', 'data-testid', 'native')
      .and('have.attr', 'aria-label', 'People')
      .and('have.class', 'consumer-group')
      .and('have.class', 'fui-OptionGroup')
      .then($root => expect(ref.current).to.equal($root[0]));
    audit();
  });

  it('P03 generates distinct label ids and renders labels before options', () => {
    mount(
      <Picker>
        <Groups />
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(group).then($groups => {
      const ids = Array.from($groups, element => element.getAttribute('aria-labelledby'));
      expect(new Set(ids).size).to.equal(2);
      $groups.each((_, element) => {
        expect(element.firstElementChild?.id).to.equal(element.getAttribute('aria-labelledby'));
        expect(element.firstElementChild?.getAttribute('role')).to.equal('presentation');
      });
    });
    audit();
  });

  it('P04 supports rich label slot attributes, class, ref and explicit id linkage', () => {
    const ref = React.createRef<HTMLSpanElement>();
    mount(
      <Picker>
        <TagPickerOptionGroup
          aria-labelledby="management-label"
          label={{
            id: 'management-label',
            ref,
            className: 'consumer-label',
            title: 'Department',
            children: <strong>Managers</strong>,
          }}
        >
          <TagPickerOption value="john">John Doe</TagPickerOption>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(label)
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.class', 'fui-OptionGroup__label')
      .and('have.class', 'consumer-label')
      .and('have.attr', 'title', 'Department')
      .then($label => expect(ref.current).to.equal($label[0]));
    cy.get(`${label} strong`).should('have.text', 'Managers');
    cy.get(group).should('have.attr', 'aria-labelledby', 'management-label');
    audit();
  });

  [undefined, null].forEach(value => {
    it(`P05 label ${value} uses the consumer aria-label without an empty slot`, () => {
      mount(
        <Picker>
          <TagPickerOptionGroup label={value} aria-label="Engineering">
            <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
          </TagPickerOptionGroup>
        </Picker>,
      );
      cy.get(input).realClick();
      cy.get(group).should('have.attr', 'aria-label', 'Engineering').and('not.have.attr', 'aria-labelledby');
      cy.get(label).should('not.exist');
      cy.get(option).realClick();
      cy.get(input).should('have.attr', 'aria-expanded', 'false');
    });
  });

  it('P06 honors a root accessible-name override independently of its visible label', () => {
    mount(
      <Picker>
        <TagPickerOptionGroup aria-label="Management team" aria-labelledby={undefined} label="Managers">
          <TagPickerOption value="john">John Doe</TagPickerOption>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(group).should('have.attr', 'aria-label', 'Management team').and('not.have.attr', 'aria-labelledby');
    cy.get(label).should('have.text', 'Managers');
    audit();
  });

  it('P07 forwards root and label pointer callbacks but labels never select', () => {
    const rootClick = cy.stub().as('rootClick');
    const labelClick = cy.stub().as('labelClick');
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOptionGroup onClick={rootClick} label={{ children: 'Managers', onClick: labelClick }}>
          <TagPickerOption value="john">John Doe</TagPickerOption>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(label).realClick();
    cy.get('@labelClick').should('have.been.calledOnce');
    cy.get('@rootClick').should('have.been.calledOnce');
    cy.get('@select').should('not.have.been.called');
    cy.get(input).should('have.attr', 'aria-expanded', 'true');
    cy.get(option).realClick();
    cy.get('@rootClick').should('have.been.calledTwice');
    cy.get('@labelClick').should('have.been.calledOnce');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'john', selectedOptions: ['john'] });
  });

  it('P08 uses native tabIndex and keyboard handlers when explicitly supplied', () => {
    const key = cy.stub().as('key');
    mount(
      <>
        <button>Before</button>
        <TagPickerOptionGroup tabIndex={0} onKeyDown={key} label="Managers" />
        <button>After</button>
      </>,
    );
    cy.contains('button', 'Before').realClick().realPress('Tab');
    cy.get(group).should('be.focused').realPress('Enter');
    cy.get('@key')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match({ key: 'Enter' }));
    cy.get(group).realPress('Tab');
    cy.contains('button', 'After').should('be.focused');
  });

  it('P09 derives the group name from a consumer label id without a root override', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOptionGroup label={{ id: 'consumer-department', children: 'Engineering' }}>
          <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(group).should('have.attr', 'aria-labelledby', 'consumer-department');
    cy.get('#consumer-department').should('have.text', 'Engineering').and('have.attr', 'role', 'presentation');
    audit();
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pierre', selectedOptions: ['pierre'] });
  });

  it('P10 explicit external name references take precedence over the label slot id', () => {
    mount(
      <>
        <span id="external-department">Engineering</span>
        <span id="external-location">Paris</span>
        <Picker>
          <TagPickerOptionGroup
            aria-labelledby="external-department external-location"
            label={{ id: 'visible-department', children: 'Devs' }}
          >
            <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
          </TagPickerOptionGroup>
        </Picker>
      </>,
    );
    cy.get(input).realClick();
    cy.get(group).should('have.attr', 'aria-labelledby', 'external-department external-location');
    cy.get('#external-department').should('have.text', 'Engineering');
    cy.get('#external-location').should('have.text', 'Paris');
    cy.get('#visible-department').should('have.text', 'Devs');
    audit();
    cy.get(input).realPress('Enter');
    cy.get(input).should('have.attr', 'aria-expanded', 'false').and('be.focused');
  });

  [0, ''].forEach(value => {
    it(`P11 falsy shorthand label ${JSON.stringify(value)} still renders a linked slot`, () => {
      mount(
        <TagPickerOptionGroup aria-label="Department" label={value}>
          Content
        </TagPickerOptionGroup>,
      );
      cy.get(label).should('have.length', 1).and('have.text', String(value));
      cy.get(group).then($group => {
        expect($group.attr('aria-labelledby')).to.equal($group.find(label).attr('id'));
        expect($group[0].firstElementChild).to.equal($group.find(label)[0]);
      });
    });
  });
});

describe('TagPickerOptionGroup dynamic and composition gaps', () => {
  it('R01 updates label text without changing the generated accessible-name id', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Rename</button>
          <Picker open>
            <TagPickerOptionGroup label={updated ? 'Leaders' : 'Managers'}>
              <TagPickerOption value="john">John Doe</TagPickerOption>
            </TagPickerOptionGroup>
          </Picker>
        </>
      );
    };
    mount(<Example />);
    cy.get(group)
      .invoke('attr', 'aria-labelledby')
      .then(id => {
        cy.contains('button', 'Rename').realClick();
        cy.get(group).should('have.attr', 'aria-labelledby', id);
        cy.get(`[id="${id}"]`).should('have.text', 'Leaders');
      });
    audit();
  });

  it('R02 removes and restores the label slot, cleans its ref and preserves the root ref', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const labelRef = React.createRef<HTMLSpanElement>();
    const Example = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button onClick={() => setShown(value => !value)}>Toggle label</button>
          <TagPickerOptionGroup
            ref={rootRef}
            aria-label="Management"
            label={shown ? { children: 'Managers', ref: labelRef } : null}
          >
            Content
          </TagPickerOptionGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get(label).then($label => expect(labelRef.current).to.equal($label[0]));
    cy.get(group).then($root => {
      const original = $root[0];
      cy.contains('button', 'Toggle label').realClick();
      cy.get(label).should('not.exist');
      cy.get(group)
        .should('not.have.attr', 'aria-labelledby')
        .then(() => {
          expect(labelRef.current).to.equal(null);
          expect(rootRef.current).to.equal(original);
        });
      cy.contains('button', 'Toggle label').realClick();
      cy.get(label)
        .should('have.text', 'Managers')
        .then($label => expect(labelRef.current).to.equal($label[0]));
      cy.get(group).then($restoredRoot => {
        expect(rootRef.current).to.equal(original);
        expect($restoredRoot.attr('aria-labelledby')).to.equal(labelRef.current?.id);
      });
    });
    audit();
  });

  it('R03 rerenders native props and uses the latest root and label callbacks', () => {
    const first = cy.stub().as('first');
    const latest = cy.stub().as('latest');
    const firstLabel = cy.stub().as('firstLabel');
    const latestLabel = cy.stub().as('latestLabel');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Update</button>
          <TagPickerOptionGroup
            title={updated ? 'New title' : 'Old title'}
            className={updated ? 'latest-class' : 'first-class'}
            onClick={updated ? latest : first}
            label={{ children: updated ? 'New label' : 'Old label', onClick: updated ? latestLabel : firstLabel }}
          />
        </>
      );
    };
    mount(<Example />);
    cy.contains('button', 'Update').realClick();
    cy.get(group)
      .should('have.attr', 'title', 'New title')
      .and('have.class', 'latest-class')
      .and('not.have.class', 'first-class');
    cy.get(label).should('have.text', 'New label').realClick();
    cy.get('@first').should('not.have.been.called');
    cy.get('@firstLabel').should('not.have.been.called');
    cy.get('@latest').should('have.been.calledOnce');
    cy.get('@latestLabel').should('have.been.calledOnce');
  });

  it('R04 unregisters removed group options and registers replacements for type-to-find', () => {
    const select = cy.stub().as('select');
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Replace group</button>
          <Picker open onOptionSelect={select}>
            {updated ? (
              <TagPickerOptionGroup key="new" label="Devs">
                <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
              </TagPickerOptionGroup>
            ) : (
              <TagPickerOptionGroup key="old" label="Managers">
                <TagPickerOption value="john">John Doe</TagPickerOption>
              </TagPickerOptionGroup>
            )}
          </Picker>
        </>
      );
    };
    mount(<Example />);
    cy.get(group).find(option).should('have.text', 'John Doe');
    cy.contains('button', 'Replace group').realClick();
    cy.get(label).should('have.text', 'Devs');
    cy.contains(option, 'John Doe').should('not.exist');
    cy.get(input).realClick().realType('John');
    cy.get(input).should('not.have.attr', 'aria-activedescendant').realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.get(input).should('have.value', '').realType('Pierre');
    expectActive('Pierre Dupont');
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pierre', selectedOptions: ['pierre'] });
  });

  it('R05 moving an option between groups preserves one registered selectable value', () => {
    const select = cy.stub().as('select');
    const Example = () => {
      const [moved, setMoved] = React.useState(false);
      return (
        <>
          <button onClick={() => setMoved(true)}>Move employee</button>
          <Picker open onOptionSelect={select}>
            <TagPickerOptionGroup label="Managers">
              {!moved && <TagPickerOption value="john">John Doe</TagPickerOption>}
            </TagPickerOptionGroup>
            <TagPickerOptionGroup label="Devs">
              {moved && <TagPickerOption value="john">John Doe</TagPickerOption>}
              <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
            </TagPickerOptionGroup>
          </Picker>
        </>
      );
    };
    mount(<Example />);
    cy.contains('button', 'Move employee').realClick();
    cy.get(group).first().find(option).should('not.exist');
    cy.get(group).last().find(option).should('have.length', 2);
    cy.contains(option, 'John Doe').should('have.length', 1).realClick();
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'john', selectedOptions: ['john'] });
  });

  it('R06 input-driven filtering removes empty groups and restores correct named options', () => {
    const select = cy.stub().as('select');
    const Example = () => {
      const [query, setQuery] = React.useState('');
      const people = [
        { label: 'Managers', name: 'John Doe', value: 'john' },
        { label: 'Devs', name: 'Pierre Dupont', value: 'pierre' },
      ];
      const matches = people.filter(person => person.name.toLowerCase().includes(query.toLowerCase()));
      return (
        <TagPicker onOptionSelect={select}>
          <TagPickerControl>
            <TagPickerGroup aria-label="Selected employees" />
            <TagPickerInput aria-label="Filter employees" onChange={event => setQuery(event.target.value)} />
          </TagPickerControl>
          <TagPickerList aria-label="Available employees">
            {matches.map(person => (
              <TagPickerOptionGroup key={person.value} label={person.label}>
                <TagPickerOption value={person.value}>{person.name}</TagPickerOption>
              </TagPickerOptionGroup>
            ))}
            {matches.length === 0 && (
              <Option disabled role="option" value="none">
                No matches
              </Option>
            )}
          </TagPickerList>
        </TagPicker>
      );
    };
    mount(<Example />);
    cy.get(input).realClick().realType('Pierre');
    cy.get(group).should('have.length', 1).find(label).should('have.text', 'Devs');
    cy.get(option).should('have.length', 1).and('have.text', 'Pierre Dupont');
    audit();
    cy.get(input).realPress(['Control', 'A']).realType('zzzz');
    cy.get(group).should('not.exist');
    cy.get(option).should('have.text', 'No matches').and('have.attr', 'aria-disabled', 'true').realClick();
    cy.get('@select').should('not.have.been.called');
    cy.get(input).realPress(['Control', 'A']).realType('John');
    cy.get(group).should('have.length', 1).find(label).should('have.text', 'Managers');
    cy.get(option).should('have.text', 'John Doe').realClick();
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'john', selectedOptions: ['john'] });
  });

  it('R07 an empty group is not registered as an option or included in type-to-find', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOptionGroup label="Empty department" />
        <TagPickerOptionGroup label="Devs">
          <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(group).first().find(option).should('not.exist');
    expectActive('Pierre Dupont');
    cy.get(input).realType('Empty department').realPress('Enter');
    cy.get('@select').should('not.have.been.called');
    cy.get(input).should('have.attr', 'aria-expanded', 'false');
  });

  it('R08 nested groups preserve both label relationships and descendant keyboard selection', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOptionGroup label="Engineering">
          <TagPickerOptionGroup label="Devs">
            <TagPickerOption value="pierre">Pierre Dupont</TagPickerOption>
          </TagPickerOptionGroup>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(group)
      .should('have.length', 2)
      .each($group => {
        const id = $group.attr('aria-labelledby');
        cy.get(`[id="${id}"]`).should('be.visible');
      });
    expectActive('Pierre Dupont');
    audit();
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pierre', selectedOptions: ['pierre'] });
  });

  it('R09 mixed grouped and ungrouped options share DOM-order keyboard registration', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOption value="before">Before groups</TagPickerOption>
        <Groups />
        <TagPickerOption value="after">After groups</TagPickerOption>
      </Picker>,
    );
    cy.get(input).realClick();
    expectActive('Before groups');
    cy.get(input).realPress('ArrowDown');
    expectActive('John Doe');
    cy.get(input).realPress('End');
    expectActive('After groups');
    cy.get(input).realPress('ArrowUp');
    expectActive('Amelie Dupont');
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'amelie', selectedOptions: ['amelie'] });
  });

  it('R10 controlled selectedOptions remain authoritative across both groups', () => {
    const select = cy.stub().as('select');
    mount(
      <Picker selectedOptions={['john']} onOptionSelect={select}>
        <Groups />
      </Picker>,
    );
    cy.get(input).realClick();
    cy.contains(option, 'John Doe').realClick();
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'john', selectedOptions: ['john'] });
    cy.get(input).realClick();
    cy.contains(option, 'Pierre Dupont').realClick();
    cy.get('@select')
      .should('have.been.calledTwice')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, {
        value: 'pierre',
        selectedOptions: ['john', 'pierre'],
      });
    cy.get(input).realClick();
    cy.contains(option, 'Pierre Dupont').realClick();
    cy.get('@select').should('have.been.calledThrice');
    cy.get('@select').its('lastCall.args.1.selectedOptions').should('deep.equal', ['john', 'pierre']);
  });

  it('R11 disabled picker skips grouped options on Tab and works after being enabled', () => {
    const select = cy.stub().as('select');
    const Example = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <button onClick={() => setDisabled(false)}>Enable</button>
          <Picker disabled={disabled} onOptionSelect={select}>
            <Groups />
          </Picker>
          <button>After</button>
        </>
      );
    };
    mount(<Example />);
    cy.get(input).should('be.disabled').and('have.attr', 'aria-expanded', 'false');
    cy.contains('button', 'After').realClick().realPress(['Shift', 'Tab']);
    cy.contains('button', 'Enable').should('be.focused');
    cy.get('@select').should('not.have.been.called');
    cy.contains('button', 'Enable').realPress('Enter').realPress('Tab');
    cy.get(input).should('not.be.disabled').and('be.focused').realPress('ArrowDown');
    expectActive('John Doe');
    cy.get(input).realPress('Enter');
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'john', selectedOptions: ['john'] });
  });

  it('R12 label stopPropagation isolates its callback without blocking child option selection', () => {
    const root = cy.stub().as('root');
    const slot = cy.stub().as('slot');
    const select = cy.stub().as('select');
    mount(
      <Picker onOptionSelect={select}>
        <TagPickerOptionGroup
          onClick={root}
          label={{
            children: 'Managers',
            onClick: event => {
              slot();
              event.stopPropagation();
            },
          }}
        >
          <TagPickerOption value="john">John Doe</TagPickerOption>
        </TagPickerOptionGroup>
      </Picker>,
    );
    cy.get(input).realClick();
    cy.get(label).realClick();
    cy.get('@slot').should('have.been.calledOnce');
    cy.get('@root').should('not.have.been.called');
    cy.get('@select').should('not.have.been.called');
    cy.get(option).realClick();
    cy.get('@root').should('have.been.calledOnce');
    cy.get('@select').should('have.been.calledOnce');
  });

  it('R13 native role, description and inline slot styles override defaults without losing static classes', () => {
    mount(
      <>
        <p id="description">Select a manager from this department</p>
        <TagPickerOptionGroup
          role="region"
          aria-describedby="description"
          style={{ rowGap: 7 }}
          label={{ children: 'Managers', role: 'note', style: { fontSize: 18 } }}
        >
          Content
        </TagPickerOptionGroup>
      </>,
    );
    cy.get(group)
      .should('have.attr', 'role', 'region')
      .and('have.attr', 'aria-describedby', 'description')
      .and('have.css', 'row-gap', '7px')
      .and('have.class', 'fui-OptionGroup');
    cy.get(label)
      .should('have.attr', 'role', 'note')
      .and('have.css', 'font-size', '18px')
      .and('have.class', 'fui-OptionGroup__label');
    audit();
  });

  it('R14 provider custom style hook receives both styled slots and preserves working selection', () => {
    const hook = cy.stub().as('hook');
    const select = cy.stub().as('select');
    mount(
      <FluentProvider
        customStyleHooks_unstable={{
          // eslint-disable-next-line @typescript-eslint/naming-convention
          useTagPickerOptionGroupStyles_unstable: state => {
            // The provider hook boundary is intentionally unknown; this hook is registered for this component only.
            const groupState = state as TagPickerOptionGroupState;
            hook(groupState.root.className, groupState.label?.className);
            groupState.root.style = { ...groupState.root.style, rowGap: 9 };
            if (groupState.label) {
              groupState.label.style = { ...groupState.label.style, fontWeight: 700 };
            }
          },
        }}
      >
        <Picker onOptionSelect={select}>
          <TagPickerOptionGroup label="Managers">
            <TagPickerOption value="john">John Doe</TagPickerOption>
          </TagPickerOptionGroup>
        </Picker>
      </FluentProvider>,
    );
    cy.get(input).realClick();
    cy.get('@hook').should(
      'have.been.calledWithMatch',
      Cypress.sinon.match('fui-TagPickerOptionGroup'),
      Cypress.sinon.match('fui-TagPickerOptionGroup__label'),
    );
    cy.get(group).should('have.css', 'row-gap', '9px');
    cy.get(label).should('have.css', 'font-weight', '700');
    cy.get(option).realClick();
    cy.get('@select')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'john', selectedOptions: ['john'] });
  });

  it('R15 unmounting a group clears both refs and remounting generates a fresh name relationship', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const labelRef = React.createRef<HTMLSpanElement>();
    const Example = () => {
      const [shown, setShown] = React.useState(true);
      return (
        <>
          <button onClick={() => setShown(value => !value)}>Toggle department</button>
          {shown && (
            <TagPickerOptionGroup ref={rootRef} label={{ children: 'Managers', ref: labelRef }}>
              Content
            </TagPickerOptionGroup>
          )}
        </>
      );
    };
    mount(<Example />);
    cy.get(group).then($group => {
      const originalRoot = $group[0];
      const originalId = $group.attr('aria-labelledby');
      expect(rootRef.current).to.equal(originalRoot);
      expect(labelRef.current?.id).to.equal(originalId);
      cy.contains('button', 'Toggle department').realClick();
      cy.get(group)
        .should('not.exist')
        .then(() => {
          expect(rootRef.current).to.equal(null);
          expect(labelRef.current).to.equal(null);
        });
      cy.contains('button', 'Toggle department').realClick();
      cy.get(group).then($replacement => {
        expect(rootRef.current).to.equal($replacement[0]).and.not.equal(originalRoot);
        expect($replacement.attr('aria-labelledby')).to.equal(labelRef.current?.id).and.not.equal(originalId);
      });
    });
    audit();
  });

  it('R16 updating a consumer label id updates name linkage without replacing the group', () => {
    const Example = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button onClick={() => setUpdated(true)}>Rename department id</button>
          <TagPickerOptionGroup
            label={{ id: updated ? 'department-new' : 'department-old', children: updated ? 'Leaders' : 'Managers' }}
          >
            Content
          </TagPickerOptionGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get(group)
      .should('have.attr', 'aria-labelledby', 'department-old')
      .then($root => {
        const original = $root[0];
        cy.contains('button', 'Rename department id').realClick();
        cy.get('#department-old').should('not.exist');
        cy.get('#department-new').should('have.text', 'Leaders');
        cy.get(group)
          .should('have.attr', 'aria-labelledby', 'department-new')
          .then($updated => expect($updated[0]).to.equal(original));
      });
    audit();
  });
});

describe('TagPickerOptionGroup list ownership accessibility', () => {
  [false, true].forEach(inline => {
    it(`A01 ${inline ? 'inline' : 'portaled'} default-open groups belong to the input-controlled listbox`, () => {
      const select = cy.stub().as('select');
      mount(
        <Picker inline={inline} defaultOpen onOptionSelect={select}>
          <Groups />
        </Picker>,
      );
      cy.get(input)
        .should('have.attr', 'aria-expanded', 'true')
        .invoke('attr', 'aria-controls')
        .then(id => {
          expect(id, 'controlled list id').to.be.a('string').and.not.be.empty;
          cy.get(`[id="${id}"]`)
            .should('have.attr', 'role', 'listbox')
            .and('have.attr', 'aria-label', 'Available employees')
            .find(group)
            .should('have.length', 2);
        });
      cy.get('main')
        .find(group)
        .should('have.length', inline ? 2 : 0);
      cy.get(group)
        .should('have.length', 2)
        .each($group => {
          expect($group.attr('tabindex'), 'groups are not independent tab stops').to.equal(undefined);
          cy.get(`[id="${$group.attr('aria-labelledby')}"]`).should('have.attr', 'role', 'presentation');
        });
      audit();
      cy.contains(option, 'Pierre Dupont').realClick();
      cy.get('@select')
        .should('have.been.calledOnce')
        .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'pierre', selectedOptions: ['pierre'] });
      cy.get(input).should('be.focused').and('have.attr', 'aria-expanded', 'false');
    });
  });

  it('A02 multiple picker instances keep list ids, group names and callbacks isolated', () => {
    const first = cy.stub().as('first');
    const second = cy.stub().as('second');
    mount(
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section aria-label="First picker">
          <Picker defaultOpen onOptionSelect={first}>
            <Groups />
          </Picker>
        </section>
        <section aria-label="Second picker">
          <Picker defaultOpen onOptionSelect={second}>
            <Groups />
          </Picker>
        </section>
      </div>,
    );
    cy.get(input)
      .should('have.length', 2)
      .then($inputs => {
        const ids = Array.from($inputs, element => element.getAttribute('aria-controls'));
        expect(
          ids.every(id => Boolean(id)),
          'both inputs control a list',
        ).to.equal(true);
        expect(new Set(ids).size, 'different list ownership').to.equal(2);
        ids.forEach(id => cy.get(`[id="${id}"]`).find(group).should('have.length', 2));
      });
    cy.get(group)
      .should('have.length', 4)
      .then($groups => {
        const ids = Array.from($groups, element => element.getAttribute('aria-labelledby'));
        expect(new Set(ids).size, 'no duplicated group label ids across instances').to.equal(4);
      });
    audit();
    cy.get(input)
      .eq(1)
      .realClick()
      .should('be.focused')
      .realPress('ArrowDown')
      .realPress('ArrowDown')
      .realPress('Enter');
    cy.get('@first').should('not.have.been.called');
    cy.get('@second')
      .should('have.been.calledOnce')
      .and('have.been.calledWithMatch', Cypress.sinon.match.any, { value: 'jane', selectedOptions: ['jane'] });
    cy.get(input).eq(1).should('be.focused').and('have.attr', 'aria-expanded', 'false');
  });
});
