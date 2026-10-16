import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import {
  OverflowItem,
  OverflowDivider,
  OverflowReorderObserver,
  useOverflowMenu,
  useIsOverflowItemVisible,
  useIsOverflowGroupVisible,
} from '@fluentui/react-overflow';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-menu';
import { Overflow } from './Overflow';
import type { OverflowProps } from './Overflow.types';
import { useOverflow_unstable } from './useOverflow';
import { renderOverflow_unstable } from './renderOverflow';
import { useOverflowContextValues_unstable } from '../../useOverflowContextValues';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const item = (id: number) => cy.get(`#item-${id}`);
const visibleIds = () =>
  cy
    .get('#container [data-overflow-item]')
    .filter(':visible')
    .then($items => [...$items].map(element => element.id));
const MenuEntry = ({ id }: { id: number }) =>
  useIsOverflowItemVisible(String(id)) ? null : <MenuItem id={`menu-item-${id}`}>Item {id}</MenuItem>;
const More = ({ ids }: { ids: number[] }) => {
  const { ref, isOverflowing, overflowCount } = useOverflowMenu<HTMLButtonElement>();
  if (!isOverflowing) {
    return null;
  }
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <button id="more" ref={ref} style={{ width: 40, height: 40, flex: '0 0 40px', padding: 0 }}>
          +{overflowCount}
        </button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {ids.map(id => (
            <MenuEntry key={id} id={id} />
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
const Divider = ({ groupId }: { groupId: string }) => {
  const visibility = useIsOverflowGroupVisible(groupId);
  if (visibility === 'hidden') {
    return null;
  }
  return (
    <OverflowDivider groupId={groupId}>
      <span data-group={groupId} role="separator" style={{ width: 20, height: 40, flex: '0 0 20px' }} />
    </OverflowDivider>
  );
};
const Fixture = ({
  width = 400,
  ids = [0, 1, 2, 3, 4, 5],
  priorities = {},
  pins = [],
  dividers = false,
  observeReorder = false,
  ...props
}: Partial<OverflowProps> & {
  width?: number;
  ids?: number[];
  priorities?: Record<number, number>;
  pins?: number[];
  dividers?: boolean;
  observeReorder?: boolean;
}) => {
  const vertical = props.overflowAxis === 'vertical';
  return (
    <Overflow padding={0} {...props}>
      <div
        id="container"
        style={{
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          overflow: 'hidden',
          width: vertical ? 100 : width,
          height: vertical ? width : 60,
        }}
      >
        {observeReorder && <OverflowReorderObserver />}
        {props.overflowDirection === 'start' && <More ids={ids} />}
        {ids.map((id, index) => (
          <React.Fragment key={id}>
            <OverflowItem
              id={String(id)}
              groupId={dividers ? String(Math.floor(id / 2)) : undefined}
              {...(pins.includes(id) ? { pinned: true } : { priority: priorities[id] })}
            >
              <button id={`item-${id}`} style={{ width: 60, height: 60, flex: '0 0 60px', padding: 0 }}>
                Item {id}
              </button>
            </OverflowItem>
            {dividers && index % 2 === 1 && <Divider groupId={String(Math.floor(id / 2))} />}
          </React.Fragment>
        ))}
        {props.overflowDirection !== 'start' && <More ids={ids} />}
      </div>
    </Overflow>
  );
};

describe('Overflow adversarial improvements (final)', () => {
  it('live priority/pin changes recompute visibility without a container resize', () => {
    const Example = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(true)}>Pin last</button>
          <Fixture width={200} pins={changed ? [5] : []} priorities={changed ? { 4: 100 } : {}} />
        </>
      );
    };
    mount(<Example />);
    visibleIds().should('deep.equal', ['item-0', 'item-1']);
    cy.contains('button', 'Pin last').realClick();
    visibleIds().should('deep.equal', ['item-4', 'item-5']);
    cy.get('#more').should('have.text', '+4');
  });

  it('priority with registered dividers selects the corresponding group and hides other dividers', () => {
    const change = cy.stub().as('change');
    mount(<Fixture width={220} ids={[0, 1, 2, 3]} dividers priorities={{ 2: 100, 3: 50 }} onOverflowChange={change} />);
    visibleIds().should('deep.equal', ['item-2', 'item-3']);
    cy.get('[data-group="0"]').should('not.exist');
    cy.get('[data-group="1"]').should('be.visible');
    cy.get('@change').should(() =>
      expect(change.lastCall.args[1].groupVisibility).to.deep.equal({ '0': 'hidden', '1': 'visible' }),
    );
  });

  it('hasHiddenItems reserves an always-registered overflow trigger and resetting false restores capacity', () => {
    const AlwaysMore = () => {
      const { ref } = useOverflowMenu<HTMLButtonElement>();
      return (
        <button ref={ref} id="always-more" style={{ width: 40, flex: '0 0 40px' }}>
          More
        </button>
      );
    };
    const Example = () => {
      const [hidden, setHidden] = React.useState(true);
      return (
        <>
          <button onClick={() => setHidden(false)}>Reset hidden</button>
          <Overflow padding={0} hasHiddenItems={hidden}>
            <div id="container" style={{ display: 'flex', width: 200 }}>
              {[0, 1, 2].map(id => (
                <OverflowItem key={id} id={String(id)}>
                  <button id={`item-${id}`} style={{ flex: '0 0 60px' }}>
                    Item {id}
                  </button>
                </OverflowItem>
              ))}
              <AlwaysMore />
            </div>
          </Overflow>
        </>
      );
    };
    mount(<Example />);
    visibleIds().should('deep.equal', ['item-0', 'item-1']);
    cy.contains('button', 'Reset hidden').realClick();
    visibleIds().should('deep.equal', ['item-0', 'item-1', 'item-2']);
  });

  it('zero-sized container hides all items and later growth restores every original node', () => {
    let initial: HTMLElement;
    const Example = () => {
      const [width, setWidth] = React.useState(0);
      return (
        <>
          <button onClick={() => setWidth(400)}>Grow</button>
          <Fixture width={width} />
        </>
      );
    };
    mount(<Example />);
    item(0).then($item => {
      initial = $item[0];
    });
    cy.get('#more').should('have.text', '+6');
    cy.get('#container [data-overflowing]').should('have.length', 6);
    cy.contains('button', 'Grow').realClick();
    cy.get('#more').should('not.exist');
    visibleIds().should('have.length', 6);
    item(0).should($item => expect($item[0]).to.equal(initial));
  });

  it('unmount detaches both child/forwarded refs and removes registration attributes from detached item nodes', () => {
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLDivElement>();
    let removed: HTMLElement;
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(false)}>Remove</button>
          {visible && (
            <Overflow padding={0} ref={ref}>
              <div ref={childRef} id="container" style={{ display: 'flex', width: 60 }}>
                {[0, 1].map(id => (
                  <OverflowItem key={id} id={String(id)}>
                    <button id={`item-${id}`} style={{ flex: '0 0 60px' }}>
                      Item {id}
                    </button>
                  </OverflowItem>
                ))}
              </div>
            </Overflow>
          )}
        </>
      );
    };
    mount(<Example />);
    item(1).should('have.attr', 'data-overflowing');
    item(1).then($item => {
      removed = $item[0];
    });
    cy.contains('button', 'Remove').realClick();
    cy.get('#container')
      .should('not.exist')
      .then(() => {
        expect(ref.current).to.equal(null);
        expect(childRef.current).to.equal(null);
        expect(removed.hasAttribute('data-overflow-item')).to.equal(false);
        expect(removed.hasAttribute('data-overflowing')).to.equal(false);
      });
  });
});

describe('Overflow unit-derived contracts (round 3)', () => {
  it('clones rather than wrapping the child, preserving native attrs/style/class and both refs', () => {
    const outerRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLDivElement>();
    mount(
      <Overflow ref={outerRef}>
        <div id="clone" ref={childRef} role="group" title="Tools" className="custom-container" style={{ width: 250 }}>
          Contents
        </div>
      </Overflow>,
    );
    cy.get('#clone')
      .should('have.class', 'fui-Overflow')
      .and('have.class', 'custom-container')
      .and('have.attr', 'role', 'group')
      .and('have.attr', 'title', 'Tools')
      .and('have.css', 'width', '250px')
      .and('have.text', 'Contents')
      .should($child => {
        expect(outerRef.current).to.equal($child[0]);
        expect(childRef.current).to.equal($child[0]);
        expect($child[0].parentElement?.classList.contains('fui-Overflow')).to.equal(false);
      });
  });

  it('custom forwardRef root works inside an extra wrapper without losing container ref/class', () => {
    const Custom = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
      <div {...props} ref={ref} />
    ));
    const ref = React.createRef<HTMLElement>();
    mount(
      <div id="wrapper">
        <Overflow padding={0} ref={ref}>
          <Custom id="container" className="custom" style={{ display: 'flex', width: 130, overflow: 'hidden' }}>
            {[0, 1, 2].map(id => (
              <OverflowItem key={id} id={String(id)}>
                <button id={`item-${id}`} style={{ flex: '0 0 60px', width: 60 }}>
                  Item {id}
                </button>
              </OverflowItem>
            ))}
          </Custom>
        </Overflow>
      </div>,
    );
    cy.get('#container')
      .should('have.class', 'custom')
      .and('have.class', 'fui-Overflow')
      .should($container => expect(ref.current).to.equal($container[0]));
    item(2).should('have.attr', 'data-overflowing');
    visibleIds().should('deep.equal', ['item-0', 'item-1']);
  });

  it('empty child is a valid observer container and no unrelated overflow menu is inserted', () => {
    const change = cy.stub().as('change');
    mount(
      <Overflow onOverflowChange={change}>
        <div id="empty" style={{ width: 100 }} />
      </Overflow>,
    );
    cy.get('#empty').should('have.class', 'fui-Overflow').and('be.empty');
    cy.get('#more').should('not.exist');
    cy.get('@change').should(() => {
      expect(change.lastCall.args).to.deep.equal([
        null,
        { hasOverflow: false, itemVisibility: {}, groupVisibility: {} },
      ]);
    });
  });

  it('partially visible group preserves its registered divider and precise partial visibility snapshot', () => {
    const change = cy.stub().as('change');
    mount(<Fixture width={160} ids={[0, 1, 2, 3]} dividers onOverflowChange={change} />);
    cy.get('#more').should('have.text', '+3');
    cy.get('[data-group="0"]').should('be.visible');
    cy.get('[data-group="1"]').should('not.exist');
    cy.get('@change').should(() =>
      expect(change.lastCall.args[1].groupVisibility).to.deep.equal({ '0': 'overflow', '1': 'hidden' }),
    );
  });

  it('headless use/render hook attaches registration and refs without injecting design hiding classes', () => {
    const Headless = React.forwardRef<HTMLElement, OverflowProps>((props, ref) => {
      const state = useOverflow_unstable(props, ref);
      return renderOverflow_unstable(state, useOverflowContextValues_unstable(state));
    });
    mount(
      <Headless padding={0}>
        <div id="container" className="headless" style={{ display: 'flex', width: 120 }}>
          {[0, 1, 2, 3].map(id => (
            <OverflowItem key={id} id={String(id)}>
              <button id={`item-${id}`} style={{ flex: '0 0 60px', width: 60 }}>
                Item {id}
              </button>
            </OverflowItem>
          ))}
        </div>
      </Headless>,
    );
    cy.get('#container').should('have.class', 'headless').and('not.have.class', 'fui-Overflow');
    item(3).should('have.attr', 'data-overflowing');
    item(3).should('have.css', 'display', 'block');
  });
});

describe('Overflow edges and accessibility (round 2)', () => {
  it('hidden native buttons are excluded from forward and reverse Tab order', () => {
    mount(
      <>
        <button id="before">Before</button>
        <Fixture width={200} />
        <button id="after">After</button>
      </>,
    );
    cy.get('#more').should('have.text', '+4');
    cy.get('#before').focus().realPress('Tab');
    item(0).should('have.focus').realPress('Tab');
    item(1).should('have.focus').realPress('Tab');
    cy.get('#more').should('have.focus').realPress('Tab');
    cy.get('#after').should('have.focus').realPress(['Shift', 'Tab']);
    cy.get('#more').should('have.focus').realPress(['Shift', 'Tab']);
    item(1).should('have.focus');
  });

  it('visible item and menu rectangles do not overlap or exceed the available width', () => {
    mount(<Fixture width={200} />);
    cy.get('#more').should('have.text', '+4');
    cy.get('#container').then($container => {
      const container = $container[0].getBoundingClientRect();
      item(1).then($item => {
        const last = $item[0].getBoundingClientRect();
        cy.get('#more').should($menu => {
          const menu = $menu[0].getBoundingClientRect();
          expect(menu.left).to.be.at.least(last.right);
          expect(menu.right).to.be.at.most(container.right);
          expect(menu.width).to.equal(40);
        });
      });
    });
  });

  it('exact zero-padding fit shows all items; a one-pixel reduction creates overflow with room for the trigger', () => {
    const Example = () => {
      const [width, setWidth] = React.useState(360);
      return (
        <>
          <button onClick={() => setWidth(359)}>Reduce</button>
          <Fixture width={width} />
        </>
      );
    };
    mount(<Example />);
    cy.get('#more').should('not.exist');
    visibleIds().should('have.length', 6);
    cy.contains('button', 'Reduce').realClick();
    cy.get('#more').should('have.text', '+1');
    visibleIds().should('have.length', 5);
  });

  it('resetting minimumVisible to zero without resizing recomputes the actual hidden state', () => {
    const Example = () => {
      const [minimum, setMinimum] = React.useState(3);
      return (
        <>
          <button onClick={() => setMinimum(0)}>Reset minimum</button>
          <Fixture width={100} minimumVisible={minimum} />
        </>
      );
    };
    mount(<Example />);
    cy.get('#more').should('have.text', '+3');
    cy.contains('button', 'Reset minimum').realClick();
    cy.get('#more').should('have.text', '+5');
    visibleIds().should('deep.equal', ['item-0']);
  });

  it('resetting padding to zero without resizing restores items that now fit exactly', () => {
    const Example = () => {
      const [padding, setPadding] = React.useState(10);
      return (
        <>
          <button onClick={() => setPadding(0)}>Reset padding</button>
          <Fixture width={360} padding={padding} />
        </>
      );
    };
    mount(<Example />);
    cy.get('#more').should('have.text', '+1');
    cy.contains('button', 'Reset padding').realClick();
    cy.get('#more').should('not.exist');
    visibleIds().should('have.length', 6);
  });

  it('explicit reorder observer updates DOM-order priority without any container resize', () => {
    const Example = () => {
      const [reverse, setReverse] = React.useState(false);
      return (
        <>
          <button onClick={() => setReverse(value => !value)}>Reverse</button>
          <Fixture width={200} observeReorder ids={reverse ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5]} />
        </>
      );
    };
    mount(<Example />);
    visibleIds().should('deep.equal', ['item-0', 'item-1']);
    cy.contains('button', 'Reverse').realClick();
    visibleIds().should('deep.equal', ['item-5', 'item-4']);
  });
});

describe('Overflow documented contracts (round 1)', () => {
  it('actual ResizeObserver hides only overflowing items and overflow menu exposes exactly the hidden identities', () => {
    const change = cy.stub().as('change');
    const Example = () => {
      const [width, setWidth] = React.useState(400);
      return (
        <>
          <button onClick={() => setWidth(width === 400 ? 200 : 400)}>Resize</button>
          <Fixture width={width} onOverflowChange={change} />
        </>
      );
    };
    mount(<Example />);
    visibleIds().should('deep.equal', ['item-0', 'item-1', 'item-2', 'item-3', 'item-4', 'item-5']);
    cy.get('#more').should('not.exist');
    cy.contains('button', 'Resize').realClick();
    cy.get('#more').should('have.text', '+4');
    visibleIds().should('deep.equal', ['item-0', 'item-1']);
    item(2).should('have.attr', 'data-overflowing');
    item(2).should('have.css', 'display', 'none');
    cy.get('@change').should(() => {
      expect(change.lastCall.args).to.deep.equal([
        null,
        {
          hasOverflow: true,
          itemVisibility: { '0': true, '1': true, '2': false, '3': false, '4': false, '5': false },
          groupVisibility: {},
        },
      ]);
    });
    cy.get('#more').focus().realPress('Enter');
    cy.get('.fui-MenuList').find('[role="menuitem"]').should('have.length', 4);
    cy.get('#menu-item-2').should('be.visible').realPress('Escape');
    cy.contains('button', 'Resize').realClick();
    cy.get('#more').should('not.exist');
    item(5).should('be.visible').and('not.have.attr', 'data-overflowing');
  });

  (['horizontal', 'vertical'] as const).forEach(overflowAxis => {
    (['start', 'end'] as const).forEach(overflowDirection => {
      it(`${overflowAxis}/${overflowDirection}: true dimensions and DOM-direction visibility`, () => {
        mount(<Fixture width={200} overflowAxis={overflowAxis} overflowDirection={overflowDirection} />);
        cy.get('#more').should('have.text', '+4');
        visibleIds().should('deep.equal', overflowDirection === 'end' ? ['item-0', 'item-1'] : ['item-4', 'item-5']);
        const first = overflowDirection === 'end' ? 0 : 4;
        item(first).should($item => {
          const rect = $item[0].getBoundingClientRect();
          expect(rect.width).to.equal(60);
          expect(rect.height).to.equal(60);
        });
      });
    });
  });

  it('higher priorities overflow later than DOM neighbors', () => {
    mount(<Fixture width={200} priorities={{ 4: 100, 5: 50 }} />);
    cy.get('#more').should('have.text', '+4');
    visibleIds().should('deep.equal', ['item-4', 'item-5']);
  });

  it('pinned items never overflow even when their measured sizes exceed the container', () => {
    mount(<Fixture width={70} pins={[0, 5]} />);
    cy.get('#more').should('have.text', '+4');
    item(0).should('have.css', 'display', 'block').and('not.have.attr', 'data-overflowing');
    item(5).should('have.css', 'display', 'block').and('not.have.attr', 'data-overflowing');
  });

  it('minimumVisible stops overflow at the requested count even in a smaller container', () => {
    mount(<Fixture width={100} minimumVisible={3} />);
    cy.get('#more').should('have.text', '+3');
    cy.get('#container [data-overflow-item]:not([data-overflowing])').should('have.length', 3);
  });

  it('large registered divider size participates in group overflow and hidden group loses its divider', () => {
    const change = cy.stub().as('change');
    mount(<Fixture width={220} ids={[0, 1, 2, 3]} dividers onOverflowChange={change} />);
    cy.get('#more').should('have.text', '+2');
    cy.get('[data-group="0"]').should('be.visible');
    cy.get('[data-group="1"]').should('not.exist');
    cy.get('@change').should(() => {
      expect(change.lastCall.args[0]).to.equal(null);
      expect(change.lastCall.args[1].groupVisibility).to.deep.equal({ '0': 'visible', '1': 'hidden' });
    });
  });
});
