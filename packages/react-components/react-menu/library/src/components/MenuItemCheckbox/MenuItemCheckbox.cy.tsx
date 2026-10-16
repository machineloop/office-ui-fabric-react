import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuGroupHeader,
  MenuItemRadio,
} from '@fluentui/react-menu';
import type { MenuProps, MenuListProps } from '@fluentui/react-menu';
import { CutRegular } from '@fluentui/react-icons';
import { MenuItemCheckbox } from './MenuItemCheckbox';
import type { MenuItemCheckboxProps } from './MenuItemCheckbox.types';
import { MenuListProvider } from '../../contexts/menuListContext';
import { useMenuItemCheckboxBase_unstable } from './useMenuItemCheckbox';
import { renderMenuItemCheckbox_unstable } from './renderMenuItemCheckbox';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const item = () => cy.get('#cut');
const trigger = () => cy.get('#trigger');
const Example = ({
  itemProps,
  listProps,
  ...props
}: Partial<MenuProps> & {
  itemProps?: Partial<MenuItemCheckboxProps> & { ref?: React.Ref<HTMLDivElement> };
  listProps?: MenuListProps;
}) => (
  <Menu {...props}>
    <MenuTrigger disableButtonEnhancement>
      <button id="trigger">Edit menu</button>
    </MenuTrigger>
    <MenuPopover>
      <MenuList {...listProps}>
        <MenuItemCheckbox id="cut" name="edit" value="cut" {...itemProps}>
          Cut
        </MenuItemCheckbox>
        <MenuItemCheckbox id="paste" name="edit" value="paste">
          Paste
        </MenuItemCheckbox>
        <MenuItemCheckbox id="view-cut" name="view" value="cut">
          Show cut
        </MenuItemCheckbox>
      </MenuList>
    </MenuPopover>
  </Menu>
);
const open = () => {
  trigger().focus().realPress('Enter');
  item().should('have.focus');
};
const BaseCheckbox = React.forwardRef<HTMLDivElement, MenuItemCheckboxProps>((props, ref) =>
  renderMenuItemCheckbox_unstable(useMenuItemCheckboxBase_unstable(props, ref)),
);

describe('MenuItemCheckbox adversarial improvements (final)', () => {
  it('live name/value/controlled values update authoritative state on the same item node', () => {
    let initial: HTMLElement;
    const Owner = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Change values</button>
          <MenuList checkedValues={{ edit: ['cut'], view: ['paste'] }}>
            <MenuItemCheckbox id="cut" name={changed ? 'view' : 'edit'} value={changed ? 'paste' : 'cut'}>
              Cut
            </MenuItemCheckbox>
          </MenuList>
        </>
      );
    };
    mount(<Owner />);
    item().then($item => {
      initial = $item[0];
    });
    item().should('have.attr', 'aria-checked', 'true');
    cy.contains('button', 'Change values').realClick();
    item()
      .should('have.attr', 'aria-checked', 'true')
      .should($item => expect($item[0]).to.equal(initial));
  });

  it('explicit MenuList controlled values take precedence over the parent Menu selection record', () => {
    const change = cy.stub().as('change');
    mount(
      <Example
        checkedValues={{ edit: ['cut'] }}
        listProps={{ checkedValues: { edit: [] }, onCheckedValueChange: change }}
      />,
    );
    open();
    item().should('have.attr', 'aria-checked', 'false').realClick();
    item().should('have.attr', 'aria-checked', 'false');
    cy.get('@change').should('have.been.calledOnce');
  });

  it('selection occurs before consumer click cancellation and both callbacks receive the identical event', () => {
    const order: string[] = [];
    const change = cy.stub().callsFake(() => order.push('selection'));
    const click = cy
      .stub()
      .callsFake((event: React.MouseEvent) => {
        order.push('click');
        event.preventDefault();
      })
      .as('click');
    mount(<Example onCheckedValueChange={change} itemProps={{ onClick: click }} />);
    open();
    item().realClick();
    item().should('have.attr', 'aria-checked', 'true');
    cy.get('@click')
      .should('have.been.calledOnce')
      .then(() => {
        expect(order).to.deep.equal(['selection', 'click']);
        expect(change.firstCall.args[0]).to.equal(click.firstCall.args[0]);
        expect(click.firstCall.args[0].defaultPrevented).to.equal(true);
      });
  });

  it('closing popup detaches ref and reopening attaches the actual replacement item with retained checked state', () => {
    const ref = React.createRef<HTMLDivElement>();
    let initial: HTMLDivElement;
    mount(<Example itemProps={{ ref }} />);
    open();
    item().then($item => {
      initial = $item[0] as HTMLDivElement;
    });
    item().realPress('Space').realPress('Escape');
    item()
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
    open();
    item()
      .should('have.attr', 'aria-checked', 'true')
      .should($item => {
        expect(ref.current).to.equal($item[0]);
        expect(ref.current).not.to.equal(initial);
      });
  });
});

describe('MenuItemCheckbox unit-derived contracts (round 3)', () => {
  ([false, true] as const).forEach(checked => {
    it(`${checked}: raw context toggle receives identical event, exact name/value and previous checked state`, () => {
      const toggle = cy.stub().as('toggle');
      const click = cy.stub();
      mount(
        <MenuListProvider value={{ checkedValues: { edit: checked ? ['cut'] : [] }, toggleCheckbox: toggle }}>
          <MenuItemCheckbox id="cut" name="edit" value="cut" onClick={click}>
            Cut
          </MenuItemCheckbox>
        </MenuListProvider>,
      );
      item().realClick();
      cy.get('@toggle')
        .should('have.been.calledOnce')
        .then(() => {
          expect(toggle.firstCall.args).to.deep.equal([click.firstCall.args[0], 'edit', 'cut', checked]);
        });
      item().should('have.attr', 'aria-checked', String(checked));
    });
  });

  it('default checkmark slot remains in DOM with 16px geometry but only checked state makes it visible', () => {
    mount(
      <MenuList>
        <MenuItemCheckbox id="cut" name="edit" value="cut">
          Cut
        </MenuItemCheckbox>
      </MenuList>,
    );
    item()
      .find('.fui-MenuItemCheckbox__checkmark')
      .should('have.css', 'visibility', 'hidden')
      .and('have.css', 'width', '16px')
      .find('svg')
      .should('have.length', 1);
    item().realClick();
    item().find('.fui-MenuItemCheckbox__checkmark').should('have.css', 'visibility', 'visible');
  });

  it('custom checkmark children/attrs win default icon while null removes the optional checkmark', () => {
    mount(
      <MenuList defaultCheckedValues={{ edit: ['cut'] }}>
        <MenuItemCheckbox
          id="cut"
          name="edit"
          value="cut"
          checkmark={{ children: 'X', title: 'Custom check', className: 'custom-check' }}
        >
          Cut
        </MenuItemCheckbox>
      </MenuList>,
    );
    item().find('.custom-check').should('have.text', 'X').and('have.attr', 'title', 'Custom check');
    item().find('svg').should('not.exist');
    mount(
      <MenuList>
        <MenuItemCheckbox id="cut" name="edit" value="cut" checkmark={null}>
          Cut
        </MenuItemCheckbox>
      </MenuList>,
    );
    item().find('.fui-MenuItemCheckbox__checkmark').should('not.exist');
  });

  it('context checked state is authoritative over caller aria-checked overrides', () => {
    mount(
      <MenuList>
        <MenuItemCheckbox id="cut" name="missing" value="cut" aria-checked>
          Cut
        </MenuItemCheckbox>
      </MenuList>,
    );
    item().should('have.attr', 'aria-checked', 'false');
    item().realClick();
    item().should('have.attr', 'aria-checked', 'true');
  });

  it('base hook preserves custom slots but does not inject design checkmark or classes', () => {
    mount(
      <MenuList>
        <BaseCheckbox id="cut" name="edit" value="cut" icon="Icon" subText="Details" secondaryContent="Hint">
          Cut
        </BaseCheckbox>
      </MenuList>,
    );
    item()
      .should('have.attr', 'role', 'menuitemcheckbox')
      .and('contain.text', 'CutDetailsHint')
      .and('not.have.class', 'fui-MenuItemCheckbox');
    item().find('svg').should('not.exist');
    item().should('contain.text', 'Icon');
  });
});

describe('MenuItemCheckbox edges and accessibility (round 2)', () => {
  (['click', 'Enter', 'Space'] as const).forEach(key => {
    it(`disabled focusable menu checkbox blocks native ${key} and does not call callbacks`, () => {
      const change = cy.stub().as('change');
      const click = cy.stub().as('click');
      mount(<Example onCheckedValueChange={change} itemProps={{ disabled: true, onClick: click }} />);
      open();
      item().should('have.attr', 'aria-disabled', 'true').and('have.focus');
      if (key === 'click') {
        item().realClick();
      } else {
        item().realPress(key);
      }
      item().should('have.attr', 'aria-checked', 'false');
      cy.get('@change').should('not.have.been.called');
      cy.get('@click').should('not.have.been.called');
    });
  });

  it('consumer-cancelled native Enter keydown blocks selection', () => {
    const change = cy.stub().as('change');
    mount(<Example onCheckedValueChange={change} itemProps={{ onKeyDown: event => event.preventDefault() }} />);
    open();
    item().realPress('Enter');
    item().should('have.attr', 'aria-checked', 'false');
    cy.get('@change').should('not.have.been.called');
  });

  it('consumer-cancelled native Space keyup blocks selection', () => {
    const change = cy.stub().as('change');
    mount(<Example onCheckedValueChange={change} itemProps={{ onKeyUp: event => event.preventDefault() }} />);
    open();
    item().realPress('Space');
    item().should('have.attr', 'aria-checked', 'false');
    cy.get('@change').should('not.have.been.called');
  });

  it('native keyboard navigation/typeahead leaves checked state unchanged; Escape restores trigger focus', () => {
    const change = cy.stub().as('change');
    mount(<Example onCheckedValueChange={change} />);
    open();
    item().realPress('ArrowDown');
    cy.get('#paste').should('have.focus').realPress('Home');
    item().should('have.focus').realPress('p');
    cy.get('#paste').should('have.focus').realPress('Escape');
    cy.get('.fui-MenuPopover').should('not.exist');
    trigger().should('have.focus');
    cy.get('@change').should('not.have.been.called');
  });

  it('persistOnClick=false opts out of checkbox persistence and native Enter restores trigger focus', () => {
    mount(<Example itemProps={{ persistOnClick: false }} />);
    open();
    item().realPress('Enter');
    cy.get('.fui-MenuPopover').should('not.exist');
    trigger().should('have.focus');
    open();
    item().should('have.attr', 'aria-checked', 'true');
  });

  it('root ref/native attrs/style and custom slot attrs survive a checked-state rerender', () => {
    const ref = React.createRef<HTMLDivElement>();
    mount(
      <Example
        itemProps={{
          ref,
          title: 'Cut action',
          className: 'custom-item',
          style: { minHeight: 48 },
          content: { children: 'Cut contents', title: 'Content', className: 'custom-content' },
          subText: 'Description',
          secondaryContent: 'Ctrl+X',
          icon: <CutRegular />,
        }}
      />,
    );
    open();
    item()
      .should('have.attr', 'title', 'Cut action')
      .and('have.class', 'custom-item')
      .should($item => {
        expect(ref.current).to.equal($item[0]);
        expect($item[0].getBoundingClientRect().height).to.be.at.least(48);
      });
    item()
      .find('.custom-content')
      .should('have.attr', 'title', 'Content')
      .and('contain.text', 'Cut contents')
      .and('contain.text', 'Description');
    item().realClick();
    item()
      .should('have.attr', 'aria-checked', 'true')
      .should($item => expect(ref.current).to.equal($item[0]));
  });
});

describe('MenuItemCheckbox documented contracts (round 1)', () => {
  (['click', 'Enter', 'Space'] as const).forEach(key => {
    ([false, true] as const).forEach(checked => {
      it(`${key}/${
        checked ? 'checked' : 'unchecked'
      }: exact native input, click identity and value payload; menu persists`, () => {
        const change = cy.stub().as('change');
        const click = cy.stub();
        const keydown = cy.stub();
        mount(
          <Example
            defaultCheckedValues={{ edit: checked ? ['cut'] : [] }}
            onCheckedValueChange={change}
            itemProps={{ onClick: click, onKeyDown: keydown }}
          />,
        );
        open();
        item().should('have.attr', 'aria-checked', String(checked));
        if (key === 'click') {
          item().realClick();
        } else {
          item().realPress(key);
        }
        item().should('have.attr', 'aria-checked', String(!checked));
        cy.get('.fui-MenuPopover').should('be.visible');
        cy.get('@change')
          .should('have.been.calledOnce')
          .then(() => {
            const [event, data] = change.firstCall.args;
            expect(event).to.equal(click.firstCall.args[0]);
            expect(event.type).to.equal('click');
            expect(event.nativeEvent.isTrusted).to.equal(key === 'click');
            expect(data.name).to.equal('edit');
            expect(data.checkedItems).to.deep.equal(checked ? [] : ['cut']);
            if (key !== 'click') {
              expect(keydown).to.have.been.calledOnce;
              expect(keydown.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
            }
          });
      });
    });
  });

  it('frozen controlled values emit requested additions without changing checked state', () => {
    const change = cy.stub().as('change');
    mount(<Example checkedValues={{ edit: ['paste'] }} onCheckedValueChange={change} />);
    open();
    item().realClick();
    item().should('have.attr', 'aria-checked', 'false');
    cy.get('#paste').should('have.attr', 'aria-checked', 'true');
    cy.get('@change')
      .should('have.been.calledOnce')
      .then(() => expect(change.firstCall.args[1]).to.deep.equal({ name: 'edit', checkedItems: ['paste', 'cut'] }));
  });

  it('controlled owner accepts toggles while separate names remain independent', () => {
    const Owner = () => {
      const [checkedValues, setCheckedValues] = React.useState<Record<string, string[]>>({
        edit: ['paste'],
        view: ['cut'],
      });
      return (
        <Example
          checkedValues={checkedValues}
          onCheckedValueChange={(_, data) =>
            setCheckedValues(values => ({ ...values, [data.name]: data.checkedItems }))
          }
        />
      );
    };
    mount(<Owner />);
    open();
    item().realClick();
    item().should('have.attr', 'aria-checked', 'true');
    cy.get('#view-cut').should('have.attr', 'aria-checked', 'true');
    cy.get('#paste').realClick();
    cy.get('#paste').should('have.attr', 'aria-checked', 'false');
    item().should('have.attr', 'aria-checked', 'true');
  });

  it('standalone MenuList maintains default checked values without a popup', () => {
    mount(
      <MenuList defaultCheckedValues={{ edit: ['cut'] }}>
        <MenuItemCheckbox id="cut" name="edit" value="cut">
          Cut
        </MenuItemCheckbox>
      </MenuList>,
    );
    item().should('have.attr', 'aria-checked', 'true').realClick();
    item().should('have.attr', 'aria-checked', 'false');
  });

  it('hasIcons/hasCheckmarks aligns checkbox content with ordinary menu items using actual geometry', () => {
    mount(
      <MenuList hasIcons hasCheckmarks>
        <MenuItemCheckbox id="cut" name="edit" value="cut" icon={<CutRegular />}>
          Cut
        </MenuItemCheckbox>
        <MenuItem id="ordinary">Ordinary</MenuItem>
      </MenuList>,
    );
    item()
      .find('.fui-MenuItemCheckbox__content')
      .then($content => {
        const left = $content[0].getBoundingClientRect().left;
        cy.get('#ordinary .fui-MenuItem__content').should($ordinary =>
          expect($ordinary[0].getBoundingClientRect().left).to.equal(left),
        );
      });
  });

  it('grouped checkbox and radio state are independently selectable', () => {
    mount(
      <MenuList>
        <MenuGroup>
          <MenuGroupHeader>Checkboxes</MenuGroupHeader>
          <MenuItemCheckbox id="cut" name="edit" value="cut" secondaryContent="Ctrl+X">
            Cut
          </MenuItemCheckbox>
        </MenuGroup>
        <MenuGroup>
          <MenuGroupHeader>Fonts</MenuGroupHeader>
          <MenuItemRadio id="font" name="font" value="segoe">
            Segoe
          </MenuItemRadio>
        </MenuGroup>
      </MenuList>,
    );
    item().realClick();
    cy.get('#font').realClick();
    item().should('have.attr', 'aria-checked', 'true');
    cy.get('#font').should('have.attr', 'aria-checked', 'true');
    item().find('.fui-MenuItemCheckbox__secondaryContent').should('have.text', 'Ctrl+X');
  });
});
