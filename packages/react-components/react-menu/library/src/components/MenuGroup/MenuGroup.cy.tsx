import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme } from '@fluentui/react-theme';
import { MenuGroup, MenuGroupHeader, MenuItem, MenuList } from '@fluentui/react-menu';
import { GroupingItems } from '../../../../stories/src/Menu/MenuGroupingItems.stories';
import { SelectionGroup } from '../../../../stories/src/Menu/MenuSelectionGroup.stories';

const mount = (children: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{children}</FluentProvider>);

describe('MenuGroup accessibility and context edges', () => {
  it('isolates nested header ids and preserves the outer label', () => {
    mount(
      <MenuList>
        <MenuGroup>
          <MenuGroupHeader>Outer</MenuGroupHeader>
          <MenuItem>Outer action</MenuItem>
          <MenuGroup>
            <MenuGroupHeader>Inner</MenuGroupHeader>
            <MenuItem>Inner action</MenuItem>
          </MenuGroup>
        </MenuGroup>
      </MenuList>,
    );
    cy.get('[role="group"]').then($groups => {
      const outer = $groups.eq(0).attr('aria-labelledby');
      const inner = $groups.eq(1).attr('aria-labelledby');
      expect(outer).not.to.equal(inner);
      cy.get(`[id="${outer}"]`).should('have.text', 'Outer');
      cy.get(`[id="${inner}"]`).should('have.text', 'Inner');
    });
  });

  it('supports a headerless group with an explicit consumer-provided label', () => {
    mount(
      <MenuList>
        <MenuGroup aria-label="Actions" aria-labelledby={undefined}>
          <MenuItem>Save</MenuItem>
        </MenuGroup>
      </MenuList>,
    );
    cy.get('[role="group"]').should('have.attr', 'aria-label', 'Actions');
    cy.get('[role="group"]').should('not.have.attr', 'aria-labelledby');
    cy.contains('[role="menuitem"]', 'Save').focus().should('be.focused');
  });

  it('activates grouped checkboxes with native Space and Escape restores trigger focus', () => {
    mount(<SelectionGroup />);
    cy.contains('button', 'Toggle menu').click();
    cy.contains('[role="menuitemcheckbox"]', 'Show Menu Bar').focus().realPress('Space');
    cy.contains('[role="menuitemcheckbox"]', 'Show Menu Bar').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Show Menu Bar').realPress('Escape');
    cy.get('[role="menu"]').should('not.exist');
    cy.contains('button', 'Toggle menu').should('be.focused');
  });
});

describe('MenuGroup documented compositions', () => {
  it('connects each documented group to its own section header', () => {
    mount(<GroupingItems />);
    cy.contains('button', 'Toggle menu').click();
    cy.get('[role="menu"] [role="group"]')
      .should('have.length', 2)
      .each($group => {
        const id = $group.attr('aria-labelledby');
        expect(id).to.be.a('string').and.not.equal('');
        expect($group.find(`[id="${id}"]`)).to.have.text('Section header');
        expect($group.find('[role="menuitem"]')).to.have.length(3);
      });

    cy.get('[role="group"]').then($groups =>
      expect($groups.eq(0).attr('aria-labelledby')).not.to.equal($groups.eq(1).attr('aria-labelledby')),
    );
  });

  it('navigates across groups while skipping noninteractive headers and divider', () => {
    mount(<GroupingItems />);
    cy.contains('button', 'Toggle menu').click();
    cy.get('[role="menuitem"]').eq(2).focus().realPress('ArrowDown');
    cy.get('[role="menuitem"]').eq(3).should('be.focused');
    cy.get('[role="menuitem"]').eq(0).focus().realPress('ArrowUp');
    cy.get('[role="menuitem"]').eq(5).should('be.focused');
    cy.get('[role="group"]').should('not.have.attr', 'tabindex');
  });

  it('keeps checkbox selection independent from radio selection', () => {
    mount(<SelectionGroup />);
    cy.contains('button', 'Toggle menu').click();
    cy.contains('[role="menuitemcheckbox"]', 'Show Menu Bar').click();
    cy.contains('[role="menuitemcheckbox"]', 'Show Menu Bar').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemradio"]', 'Segoe').click();
    cy.get('[role="menu"]').should('not.exist');
    cy.contains('button', 'Toggle menu').click();
    cy.contains('[role="menuitemradio"]', 'Segoe').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemradio"]', 'Arial').click();
    cy.get('[role="menu"]').should('not.exist');
    cy.contains('button', 'Toggle menu').click();
    cy.contains('[role="menuitemradio"]', 'Arial').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemradio"]', 'Segoe').should('have.attr', 'aria-checked', 'false');
    cy.contains('[role="menuitemcheckbox"]', 'Show Menu Bar').should('have.attr', 'aria-checked', 'true');
    cy.contains('[role="menuitemcheckbox"]', 'Show Debug Panel').should('have.attr', 'aria-disabled', 'true');
  });
});

describe('MenuGroup unit-contract browser regressions', () => {
  it('preserves an explicit aria-labelledby override and forwards root attributes and ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    const click = cy.stub().as('click');
    mount(
      <>
        <span id="custom-heading">Custom actions</span>
        <MenuGroup
          ref={ref}
          aria-labelledby="custom-heading"
          title="Group title"
          className="custom-group"
          onClick={click}
        >
          <MenuGroupHeader>Default heading</MenuGroupHeader>
          <MenuItem>Save</MenuItem>
        </MenuGroup>
      </>,
    );
    cy.get('[role="group"]')
      .should('have.attr', 'aria-labelledby', 'custom-heading')
      .and('have.attr', 'title', 'Group title');
    cy.get('.custom-group').then($group => expect(ref.current).to.equal($group[0]));
    cy.contains('[role="menuitem"]', 'Save').click();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('keeps the generated header id stable through header text changes', () => {
    const Example = () => {
      const [name, setName] = React.useState('Before');
      return (
        <>
          <button onClick={() => setName('After')}>Update</button>
          <MenuGroup>
            <MenuGroupHeader>{name}</MenuGroupHeader>
            <MenuItem>Save</MenuItem>
          </MenuGroup>
        </>
      );
    };
    mount(<Example />);
    cy.get('[role="group"]')
      .invoke('attr', 'aria-labelledby')
      .then(id => {
        cy.get(`[id="${id}"]`).should('have.text', 'Before');
        cy.contains('button', 'Update').click();
        cy.get('[role="group"]').should('have.attr', 'aria-labelledby', id);
        cy.get(`[id="${id}"]`).should('have.text', 'After');
      });
  });

  it('forwards consumer roles and inline styles without changing child context', () => {
    mount(
      <MenuGroup role="region" style={{ padding: 12 }}>
        <MenuGroupHeader>Rendered heading</MenuGroupHeader>
        <MenuItem>Save</MenuItem>
      </MenuGroup>,
    );
    cy.get('[role="region"]')
      .should('have.css', 'padding-top', '12px')
      .invoke('attr', 'aria-labelledby')
      .then(id => {
        cy.get(`[id="${id}"]`).should('have.text', 'Rendered heading');
      });
  });
});
