import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../index';
import { TableSelectionCell } from './TableSelectionCell';
import type { TableSelectionCellProps } from './TableSelectionCell.types';
import { MultipleSelect } from '../../../../stories/src/Table/MultipleSelect.stories';
import { MultipleSelectControlled } from '../../../../stories/src/Table/MultipleSelectControlled.stories';
import { SingleSelect } from '../../../../stories/src/Table/SingleSelect.stories';
import { SingleSelectControlled } from '../../../../stories/src/Table/SingleSelectControlled.stories';
import { SubtleSelection } from '../../../../stories/src/Table/SubtleSelection.stories';
import { SelectionWithCellActions } from '../../../../stories/src/Table/SelectionWithCellActions.stories';
import { Virtualization } from '../../../../stories/src/Table/Virtualization.stories';
import { Memoization } from '../../../../stories/src/Table/Memoization.stories';
import { DataGrid as PrimitiveDataGrid } from '../../../../stories/src/Table/DataGrid.stories';

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') => {
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
  // Real-event pointer coordinates survive remounts; start outside every table.
  cy.get('body').realHover({ position: 'topLeft' });
};

const Fixture = ({
  cells,
  noNativeElements = false,
  size = 'medium',
  selectionWidth = 44,
}: {
  cells: React.ReactNode;
  noNativeElements?: boolean;
  size?: 'medium' | 'small' | 'extra-small';
  selectionWidth?: number;
}) => (
  <>
    <button id="before">Before table</button>
    <Table id="table" aria-label="Selection examples" noNativeElements={noNativeElements} size={size}>
      <TableHeader>
        <TableRow>
          <TableHeaderCell style={{ width: selectionWidth, padding: 0 }}>Select</TableHeaderCell>
          <TableHeaderCell>Item</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow id="row">
          {cells}
          <TableCell>
            <button id="after">Row action</button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </>
);
const cell = (
  props: TableSelectionCellProps & { ref?: React.Ref<HTMLDivElement>; 'data-owner'?: string } = {},
  noNativeElements = false,
  selectionWidth = 44,
) =>
  render(
    <Fixture
      noNativeElements={noNativeElements}
      selectionWidth={selectionWidth}
      cells={<TableSelectionCell id="selection" checkboxIndicator={{ 'aria-label': 'Select item' }} {...props} />}
    />,
  );
const rowInputs = () => cy.get('.fui-TableBody .fui-TableSelectionCell input');
const headerInput = () => cy.get('.fui-TableHeader .fui-TableSelectionCell input');
function assertSelectionInput(input: HTMLInputElement | null, message: string): asserts input is HTMLInputElement {
  expect(input, message).not.to.equal(null);
}
const assertSelected = (selected: number[]) =>
  cy.get('.fui-TableBody .fui-TableRow').should($rows => {
    expect($rows).to.have.length(4);
    $rows.each((index, row) => {
      expect(row.getAttribute('aria-selected'), `row ${index} selection`).to.equal(String(selected.includes(index)));
      const input = row.querySelector<HTMLInputElement>('input');
      assertSelectionInput(input, `row ${index} indicator exists`);
      expect(input.checked, `row ${index} indicator`).to.equal(selected.includes(index));
    });
  });
const audit = () =>
  cy.get('#table').then($table =>
    axe.run($table[0], { rules: { region: { enabled: false } } }).then(result => {
      expect(result.passes.length, 'axe actually evaluated the table').to.be.greaterThan(0);
      expect(
        result.violations.map(violation => `${violation.id}: ${violation.help}`),
        'axe violations',
      ).to.deep.equal([]);
    }),
  );

describe('TableSelectionCell documented selection compositions', () => {
  for (const [name, Story] of [
    ['uncontrolled', MultipleSelect],
    ['controlled', MultipleSelectControlled],
  ] as const) {
    it(`${name} multiselect supports partial/all/none and row click without double toggling`, () => {
      render(<Story />);
      assertSelected([0, 1]);
      headerInput().should('have.prop', 'indeterminate', true).and('not.be.checked');
      headerInput().realClick();
      assertSelected([0, 1, 2, 3]);
      headerInput().should('be.checked').and('have.prop', 'indeterminate', false);
      headerInput().realClick();
      assertSelected([]);
      cy.contains('.fui-TableBody .fui-TableRow', 'Training recording').realClick();
      assertSelected([2]);
      rowInputs().eq(2).realClick();
      assertSelected([]);
    });

    it(`${name} row selection drives the header through none, mixed, all, mixed and none`, () => {
      render(<Story />);
      headerInput().realClick();
      headerInput().realClick();
      assertSelected([]);
      headerInput().should('not.be.checked').and('have.prop', 'indeterminate', false);
      for (let index = 0; index < 4; index++) {
        rowInputs().eq(index).realClick();
        assertSelected(Array.from({ length: index + 1 }, (_, selected) => selected));
        headerInput()
          .should('have.prop', 'checked', index === 3)
          .and('have.prop', 'indeterminate', index !== 3);
      }
      for (let index = 0; index < 4; index++) {
        rowInputs().eq(index).realClick();
        assertSelected(Array.from({ length: 3 - index }, (_, selected) => selected + index + 1));
        headerInput()
          .should('not.be.checked')
          .and('have.prop', 'indeterminate', index !== 3);
      }
    });

    it(`${name} multiselect supports Space from indicators and select-all without double activation`, () => {
      render(<Story />);
      rowInputs().eq(3).focus();
      cy.realPress('Space');
      assertSelected([0, 1, 3]);
      headerInput().focus();
      cy.realPress('Space');
      assertSelected([0, 1, 2, 3]);
      cy.realPress('Space');
      assertSelected([]);
    });
  }
  for (const [name, Story] of [
    ['uncontrolled', SingleSelect],
    ['controlled', SingleSelectControlled],
  ] as const) {
    it(`${name} single select replaces selection through pointer and keyboard and keeps a header placeholder`, () => {
      render(<Story />);
      assertSelected([1]);
      rowInputs().should($inputs => {
        const radioNames = Array.from($inputs, input => input.getAttribute('name'));
        expect(radioNames.every(radioName => typeof radioName === 'string' && radioName.length > 0)).to.equal(true);
        expect(new Set(radioNames).size).to.equal(radioNames.length);
      });
      cy.get('.fui-TableHeader .fui-TableSelectionCell').should('exist').find('input').should('not.exist');
      rowInputs().eq(0).realClick();
      assertSelected([0]);
      rowInputs().eq(2).focus();
      cy.realPress('Space');
      assertSelected([2]);
      cy.contains('.fui-TableBody .fui-TableRow', 'Purchase order').realClick();
      assertSelected([3]);
    });
  }

  it('subtle story reveals unchecked indicators on row hover and keyboard focus, but selected indicators persist', () => {
    render(<SubtleSelection />);
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(0).should('have.css', 'opacity', '1');
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '0');
    cy.contains('.fui-TableBody .fui-TableRow', 'Training recording').realHover();
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '1');
    cy.get('.fui-TableHeader').realHover();
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '0');
    rowInputs().eq(1).focus();
    cy.realPress('Tab');
    rowInputs().eq(2).should('have.focus');
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '1');
    cy.realPress('Space');
    assertSelected([0, 1, 2]);
    rowInputs().eq(0).focus();
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '1');
    rowInputs().eq(2).realClick();
    assertSelected([0, 1]);
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '1');
    rowInputs().eq(1).focus();
    cy.realPress('Tab');
    rowInputs().eq(2).should('have.focus');
    cy.get('.fui-TableHeader').realHover();
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '1');
    rowInputs().eq(0).focus();
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(2).should('have.css', 'opacity', '0');
  });

  it('cell actions prevent row selection on pointer and Space while selection inputs still toggle', () => {
    render(<SelectionWithCellActions />);
    cy.get('.fui-TableBody .fui-TableRow').eq(2).realHover().find('button[aria-label="Edit"]').realClick();
    assertSelected([0, 1]);
    cy.realPress('Space');
    assertSelected([0, 1]);
    rowInputs().eq(2).realClick();
    assertSelected([0, 1, 2]);
  });

  it('virtualized selection survives unmount/remount of flex rows', () => {
    render(<Virtualization />);
    cy.get('.fui-TableBody [aria-rowindex="2"] input').should('be.checked');
    cy.get('.fui-TableBody [aria-rowindex="2"]').realClick({ scrollBehavior: false });
    cy.get('.fui-TableBody [aria-rowindex="2"] input').should('not.be.checked');
    cy.get('.fui-TableBody [aria-rowindex="4"] input').should('not.be.checked');
    cy.get('.fui-TableBody [aria-rowindex="4"]').realClick({ scrollBehavior: false });
    cy.get('.fui-TableBody [aria-rowindex="4"] input').should('be.checked');
    cy.get('.fui-TableBody > div').scrollTo('bottom');
    cy.get('.fui-TableBody [aria-rowindex="2"]').should('not.exist');
    cy.get('.fui-TableBody [aria-rowindex="4"]').should('not.exist');
    cy.get('.fui-TableBody > div').scrollTo('top');
    cy.get('.fui-TableBody [aria-rowindex="2"] input').should('not.be.checked');
    cy.get('.fui-TableBody [aria-rowindex="3"] input').should('be.checked');
    cy.get('.fui-TableBody [aria-rowindex="4"] input').should('be.checked');
    cy.get('.fui-TableBody .fui-TableSelectionCell').first().should('have.attr', 'role', 'cell');
  });

  it('memoized rows update indicator and aria-selected without disturbing other selections', () => {
    render(<Memoization />);
    assertSelected([0, 2]);
    rowInputs().eq(1).realClick();
    assertSelected([0, 1, 2]);
    rowInputs().eq(0).focus();
    cy.realPress('Space');
    assertSelected([1, 2]);
    cy.get('.fui-TableBody .fui-TableSelectionCell').eq(1).should('have.attr', 'role', 'gridcell');
  });

  it('primitive DataGrid preserves identity-based selection and gridcell ARIA when sort changes row order', () => {
    render(<PrimitiveDataGrid />);
    assertSelected([0, 2]);
    cy.contains('.fui-TableBody .fui-TableRow', 'Purchase order').find('input').realClick();
    assertSelected([0, 1, 2]);
    cy.contains('.fui-TableHeaderCell', 'File').realClick();
    cy.get('.fui-TableBody .fui-TableRow').first().should('contain.text', 'Training recording');
    assertSelected([1, 2, 3]);
    cy.contains('.fui-TableBody .fui-TableRow', 'Purchase order')
      .find('.fui-TableSelectionCell')
      .should('have.attr', 'role', 'gridcell')
      .and('have.attr', 'aria-selected', 'true');
  });
});

describe('TableSelectionCell public root, indicator and state contracts', () => {
  for (const noNative of [false, true]) {
    for (const size of ['medium', 'small', 'extra-small'] as const) {
      it(`preserves selection width, alignment and accessible structure in ${
        noNative ? 'flex' : 'native'
      } ${size}`, () => {
        render(
          <Fixture
            noNativeElements={noNative}
            size={size}
            cells={<TableSelectionCell id="selection" checkboxIndicator={{ 'aria-label': 'Select item' }} />}
          />,
        );
        cy.get('#selection')
          .should('have.prop', 'tagName', noNative ? 'DIV' : 'TD')
          .and('have.css', 'display', noNative ? 'flex' : 'table-cell')
          .and('have.css', 'padding', '0px')
          .should($cell => {
            const rect = $cell[0].getBoundingClientRect();
            expect(rect.width).to.be.closeTo(44, 0.5);
            const indicator = $cell[0].querySelector<HTMLInputElement>('input');
            assertSelectionInput(indicator, 'selection indicator exists before alignment measurement');
            const input = indicator.getBoundingClientRect();
            expect(input.left + input.width / 2).to.be.closeTo(rect.left + rect.width / 2, 0.5);
          });
        cy.get('#selection input').should('not.be.checked').and('have.attr', 'type', 'checkbox');
        cy.get('#selection input').should($input => expect(computeAccessibleName($input[0])).to.equal('Select item'));
        audit();
      });
    }
  }

  it('omitted checked is uncontrolled at the checkbox slot and supports pointer, Space and native tab order', () => {
    const change = cy.spy().as('change');
    cell({ checkboxIndicator: { 'aria-label': 'Select item', onChange: (_event, data) => change(data.checked) } });
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#selection input').should('have.focus').and('not.be.checked');
    cy.realPress('Space');
    cy.get('#selection input').should('be.checked');
    cy.get('@change').should('have.been.calledOnceWith', true);
    cy.get('#selection input').realClick().should('not.be.checked');
    cy.get('@change').should('have.been.calledTwice').its('secondCall.args.0').should('equal', false);
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#selection input').should('have.focus');
  });

  for (const checked of [false, true, 'mixed'] as const) {
    it(`explicit checked=${checked} remains controlled when the consumer ignores changes`, () => {
      const change = cy.spy().as('change');
      cell({
        checked,
        checkboxIndicator: { 'aria-label': 'Select item', onChange: (_event, data) => change(data.checked) },
      });
      cy.get('#selection input')
        .should('have.prop', 'checked', checked === true)
        .and('have.prop', 'indeterminate', checked === 'mixed')
        .realClick();
      cy.get('@change').should('have.been.calledOnceWith', checked !== true);
      cy.get('#selection input')
        .should('have.prop', 'checked', checked === true)
        .and('have.prop', 'indeterminate', checked === 'mixed');
    });
  }

  it('controlled consumer drives false/mixed/true transitions without remounting and clears native indeterminate', () => {
    const Controlled = () => {
      const [checked, setChecked] = React.useState<boolean | 'mixed'>('mixed');
      return (
        <>
          <button id="mixed" onClick={() => setChecked('mixed')}>
            Set mixed
          </button>
          <Fixture
            cells={
              <TableSelectionCell
                id="selection"
                checked={checked}
                checkboxIndicator={{
                  'aria-label': 'Select item',
                  onChange: (_event, data) => setChecked(data.checked),
                }}
              />
            }
          />
        </>
      );
    };
    render(<Controlled />);
    cy.get('#selection input').should('have.prop', 'indeterminate', true).realClick();
    cy.get('#selection input').should('be.checked').and('have.prop', 'indeterminate', false);
    cy.realPress('Space');
    cy.get('#selection input').should('not.be.checked').and('have.prop', 'indeterminate', false);
    cy.get('#mixed').realClick();
    cy.get('#selection input').should('not.be.checked').and('have.prop', 'indeterminate', true);
    audit();
  });

  it('checkbox slot defaultChecked initializes uncontrolled state and slot checked overrides cell checked', () => {
    render(
      <Fixture
        cells={
          <>
            <TableSelectionCell id="default" checkboxIndicator={{ 'aria-label': 'Default', defaultChecked: true }} />
            <TableSelectionCell
              id="override"
              checked={false}
              checkboxIndicator={{ 'aria-label': 'Override', checked: 'mixed' }}
            />
          </>
        }
      />,
    );
    cy.get('#default input').should('be.checked').realClick().should('not.be.checked');
    cy.get('#override input').should('have.prop', 'indeterminate', true).and('not.be.checked');
  });

  it('radio defaults to controlled false; mixed maps to selected and only the chosen type renders', () => {
    render(
      <Fixture
        cells={
          <>
            <TableSelectionCell id="radio" type="radio" radioIndicator={{ 'aria-label': 'Radio' }} />
            <TableSelectionCell
              id="mixed-radio"
              type="radio"
              checked="mixed"
              radioIndicator={{ 'aria-label': 'Mixed radio' }}
            />
            <TableSelectionCell
              id="checkbox"
              type="checkbox"
              radioIndicator={{ 'aria-label': 'Unused radio' }}
              checkboxIndicator={{ 'aria-label': 'Checkbox' }}
            />
          </>
        }
      />,
    );
    cy.get('#radio input').should('not.be.checked').realClick().should('not.be.checked');
    cy.get('#mixed-radio input').should('be.checked').and('have.attr', 'type', 'radio');
    cy.get('#mixed-radio .fui-TableSelectionCell__radioIndicator').should('exist');
    cy.get('#checkbox input').should('have.length', 1).and('have.attr', 'type', 'checkbox');
    cy.get('#checkbox .fui-TableSelectionCell__radioIndicator').should('not.exist');
  });

  it('radio slot onChange receives selected state, distinct generated names permit independent selections', () => {
    const change = cy.spy().as('change');
    const Radios = () => {
      const [a, setA] = React.useState(false);
      const [b, setB] = React.useState(false);
      return (
        <Fixture
          cells={
            <>
              <TableSelectionCell
                id="a"
                type="radio"
                checked={a}
                radioIndicator={{
                  'aria-label': 'A',
                  onChange: (_event, data) => {
                    change(data.value);
                    setA(true);
                  },
                  value: 'a',
                }}
              />
              <TableSelectionCell
                id="b"
                type="radio"
                checked={b}
                radioIndicator={{ 'aria-label': 'B', onChange: () => setB(true) }}
              />
            </>
          }
        />
      );
    };
    render(<Radios />);
    cy.get('#a input').then($a =>
      cy.get('#b input').should($b => expect($a.attr('name')).to.be.a('string').and.not.equal($b.attr('name'))),
    );
    cy.get('#a input').realClick().should('be.checked');
    cy.get('@change').should('have.been.calledOnceWith', 'a');
    cy.realPress('Tab');
    cy.get('#b input').should('have.focus');
    cy.realPress('Space');
    cy.get('#b input').should('be.checked');
    cy.get('#a input').should('be.checked');
  });

  it('explicit shared radio name supports browser arrow navigation and selection through slot callbacks', () => {
    const Group = () => {
      const [selected, setSelected] = React.useState('a');
      return (
        <Fixture
          cells={['a', 'b'].map(value => (
            <TableSelectionCell
              key={value}
              id={value}
              type="radio"
              checked={selected === value}
              radioIndicator={{
                'aria-label': value,
                input: { name: 'items' },
                value,
                onChange: (_event, data) => setSelected(data.value),
              }}
            />
          ))}
        />
      );
    };
    render(<Group />);
    cy.get('#a input').focus();
    cy.realPress('ArrowRight');
    cy.get('#b input').should('have.focus').and('be.checked');
    cy.get('#a input').should('not.be.checked');
  });

  for (const type of ['checkbox', 'radio'] as const) {
    it(`disabled ${type} slot blocks callbacks and is skipped in keyboard traversal`, () => {
      const change = cy.spy().as('change');
      const indicator = { 'aria-label': 'Disabled item', disabled: true, onChange: change };
      cell({ type, checkboxIndicator: indicator, radioIndicator: indicator });
      cy.get('#selection input').should('be.disabled');
      cy.get('#selection').realClick();
      cy.get('@change').should('not.have.been.called');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get('#after').should('have.focus');
      cy.get('#selection input').should('not.be.checked');
      audit();
    });

    it(`null ${type} indicator removes the control but preserves the cell and ignores root children`, () => {
      cell({ type, checkboxIndicator: null, radioIndicator: null, children: 'Not cell content' });
      cy.get('#selection')
        .should('exist')
        .and('not.contain.text', 'Not cell content')
        .find('input')
        .should('not.exist');
      cy.get('#selection').should($cell => expect($cell[0].getBoundingClientRect().width).to.be.closeTo(44, 0.5));
    });
  }

  it('root and nested slot props, classes, refs and bubbled callbacks target their actual elements', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const rootClick = cy.spy().as('rootClick');
    const rootKey = cy.spy().as('rootKey');
    const slotClick = cy.spy().as('slotClick');
    cell(
      {
        ref: rootRef,
        className: 'consumer-cell',
        title: 'Selection cell',
        'data-owner': 'consumer',
        onClick: (event: React.MouseEvent<HTMLElement>) =>
          rootClick(event.currentTarget.id, event.target === inputRef.current),
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => rootKey(event.key),
        checkboxIndicator: {
          className: 'consumer-indicator',
          id: 'input-id',
          label: 'Select document',
          onClick: slotClick,
          input: { ref: inputRef, 'aria-describedby': 'after' },
        },
      },
      false,
      240,
    );
    cy.get('#selection')
      .should('have.class', 'fui-TableSelectionCell')
      .and('have.class', 'consumer-cell')
      .and('have.attr', 'title', 'Selection cell')
      .and('have.attr', 'data-owner', 'consumer')
      .then($root => expect(rootRef.current).to.equal($root[0]));
    cy.get('#selection .consumer-indicator').should('have.class', 'fui-TableSelectionCell__checkboxIndicator');
    cy.get('#input-id')
      .should('have.attr', 'aria-describedby', 'after')
      .then($input => expect(inputRef.current).to.equal($input[0]));
    cy.contains('label', 'Select document').realClick();
    cy.get('#input-id').should('be.checked');
    cy.get('@rootClick').should('have.been.calledWith', 'selection', true);
    cy.get('@rootClick').should('have.been.calledTwice');
    cy.get('@slotClick').should('have.been.calledOnce');
    cy.get('#input-id').focus();
    cy.realPress('Escape');
    cy.get('@rootKey').should('have.been.calledOnceWith', 'Escape');
    cy.get('#input-id').should('have.focus').and('be.checked');
    audit();
  });

  it('root as=div and focusable gridcell overrides preserve consumer semantics and root ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Table noNativeElements role="grid" aria-label="Selectable grid">
        <TableHeader>
          <TableRow>
            <TableSelectionCell
              id="selection"
              as="div"
              ref={ref}
              role="columnheader"
              tabIndex={0}
              aria-label="Selection"
              checkboxIndicator={{ 'aria-label': 'Select all' }}
            />
            <TableHeaderCell>Item</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableSelectionCell
              id="gridcell"
              role="gridcell"
              tabIndex={0}
              aria-selected={false}
              checkboxIndicator={{ 'aria-label': 'Select item', input: { tabIndex: -1 } }}
            />
            <TableCell role="gridcell">Document</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    cy.get('#selection')
      .should('have.prop', 'tagName', 'DIV')
      .and('have.attr', 'role', 'columnheader')
      .then($root => expect(ref.current).to.equal($root[0]));
    cy.get('#gridcell').should('have.attr', 'role', 'gridcell').and('have.attr', 'aria-selected', 'false').focus();
    cy.realPress(['Shift', 'Tab']);
    cy.get('#selection input').should('have.focus');
  });

  it('changing type rerenders the appropriate indicator, preserves the root ref and honors new checked state', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const Switch = () => {
      const [radio, setRadio] = React.useState(false);
      return (
        <>
          <button id="switch" onClick={() => setRadio(value => !value)}>
            Switch type
          </button>
          <Fixture
            cells={
              <TableSelectionCell
                id="selection"
                ref={rootRef}
                type={radio ? 'radio' : 'checkbox'}
                checked={radio ? true : 'mixed'}
                checkboxIndicator={{ 'aria-label': 'Checkbox selection' }}
                radioIndicator={{ 'aria-label': 'Radio selection' }}
              />
            }
          />
        </>
      );
    };
    render(<Switch />);
    cy.get('#selection').then($root => {
      const original = $root[0];
      cy.get('#selection input').should('have.attr', 'type', 'checkbox').and('have.prop', 'indeterminate', true);
      cy.get('#switch').realClick();
      cy.get('#selection input').should('have.attr', 'type', 'radio').and('be.checked');
      cy.get('#selection').should($next => expect($next[0]).to.equal(original));
      cy.then(() => expect(rootRef.current).to.equal(original));
      cy.get('#switch').realClick();
      cy.get('#selection input').should('have.attr', 'type', 'checkbox').and('have.prop', 'indeterminate', true);
    });
  });

  it('consumer indicator stopPropagation prevents root selection callbacks without preventing input state', () => {
    const rootClick = cy.spy().as('rootClick');
    cell({
      onClick: rootClick,
      checkboxIndicator: {
        'aria-label': 'Select item',
        onClick: event => event.stopPropagation(),
      },
    });
    cy.get('#selection input').realClick().should('be.checked');
    cy.get('@rootClick').should('not.have.been.called');
  });

  for (const noNative of [false, true]) {
    it(`radio slot override, accessible label, refs and classes work in ${noNative ? 'flex' : 'native'} mode`, () => {
      const inputRef = React.createRef<HTMLInputElement>();
      cell(
        {
          type: 'radio',
          checked: false,
          radioIndicator: {
            checked: true,
            className: 'consumer-radio',
            'aria-label': 'Chosen document',
            input: { ref: inputRef, 'aria-describedby': 'after' },
          },
        },
        noNative,
      );
      cy.get('#selection .consumer-radio').should('have.class', 'fui-TableSelectionCell__radioIndicator');
      cy.get('#selection input')
        .should('be.checked')
        .and('have.attr', 'aria-describedby', 'after')
        .then($input => {
          expect(inputRef.current).to.equal($input[0]);
          expect(computeAccessibleName($input[0])).to.equal('Chosen document');
        });
      audit();
    });
  }

  it('explicit as=td in native mode preserves root focus, key events and visible keyboard focus outline', () => {
    const key = cy.spy().as('key');
    cell({
      as: 'td',
      tabIndex: 0,
      onKeyDown: event => key(event.key),
      checkboxIndicator: { 'aria-label': 'Select item', input: { tabIndex: -1 } },
    });
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#selection').should('have.focus').and('have.prop', 'tagName', 'TD');
    cy.realPress('Space');
    cy.get('@key').should('have.been.calledOnceWith', ' ');
    cy.get('#selection input').should('not.be.checked');
    cy.get('#selection').should('have.css', 'outline-style', 'solid').and('have.css', 'outline-width', '2px');
  });
});

describe('TableSelectionCell visibility and direction', () => {
  for (const type of ['checkbox', 'radio'] as const) {
    it(`invisible ${type} preserves layout and hides its cell; radio suppresses its default indicator`, () => {
      cell({ type, invisible: true, radioIndicator: undefined });
      cy.get('#selection')
        .should('have.css', 'opacity', '0')
        .should($cell => expect($cell[0].getBoundingClientRect().width).to.be.closeTo(44, 0.5));
      cy.get(`#selection input[type="${type}"]`).should(type === 'radio' ? 'not.exist' : 'exist');
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.get(type === 'radio' ? '#after' : '#selection input').should('have.focus');
    });
  }

  it('deprecated hidden retains the radio input and table structure rather than removing the cell', () => {
    cell({ type: 'radio', hidden: true, radioIndicator: { 'aria-label': 'Hidden radio' } });
    cy.get('#selection').should('have.css', 'opacity', '0').and('have.css', 'display', 'table-cell');
    cy.get('#selection input').should('exist');
    cy.get('#row').children().should('have.length', 2);
  });

  it('an explicitly supplied radio slot renders even when invisible, without making the cell visible', () => {
    cell({ type: 'radio', invisible: true, radioIndicator: { 'aria-label': 'Explicit radio' } });
    cy.get('#selection').should('have.css', 'opacity', '0');
    cy.get('#selection input').should('have.attr', 'type', 'radio');
  });

  it('subtle checked and mixed cells stay visible; unchecked reveals on sibling keyboard focus and hides after exit', () => {
    render(
      <Fixture
        cells={
          <>
            <TableSelectionCell id="unchecked" subtle checkboxIndicator={{ 'aria-label': 'Unchecked' }} />
            <TableSelectionCell id="checked" subtle checked checkboxIndicator={{ 'aria-label': 'Checked' }} />
            <TableSelectionCell id="mixed" subtle checked="mixed" checkboxIndicator={{ 'aria-label': 'Mixed' }} />
          </>
        }
      />,
    );
    cy.get('#unchecked').should('have.css', 'opacity', '0');
    cy.get('#checked, #mixed').each($cell => cy.wrap($cell).should('have.css', 'opacity', '1'));
    cy.get('#mixed input').focus();
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    cy.get('#unchecked').should('have.css', 'opacity', '1');
    cy.get('#before').focus();
    cy.get('#unchecked').should('have.css', 'opacity', '0');
  });

  it('RTL preserves centered indicators, keyboard order and checkbox activation', () => {
    render(
      <Fixture
        noNativeElements
        cells={<TableSelectionCell id="selection" checkboxIndicator={{ 'aria-label': 'Select item' }} />}
      />,
      'rtl',
    );
    cy.get('#table').should('have.css', 'direction', 'rtl');
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#selection input').should('have.focus');
    cy.realPress('Space');
    cy.get('#selection input').should('be.checked');
    cy.get('#selection').should($cell => {
      const cellRect = $cell[0].getBoundingClientRect();
      const indicator = $cell[0].querySelector<HTMLInputElement>('input');
      assertSelectionInput(indicator, 'RTL selection indicator exists before alignment measurement');
      const inputRect = indicator.getBoundingClientRect();
      expect(inputRect.left + inputRect.width / 2).to.be.closeTo(cellRect.left + cellRect.width / 2, 0.5);
    });
    audit();
  });
});
