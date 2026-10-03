import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import { Breadcrumb } from './Breadcrumb';
import { BreadcrumbItem } from '../BreadcrumbItem';
import { BreadcrumbButton } from '../BreadcrumbButton';
import { BreadcrumbDivider } from '../BreadcrumbDivider';
import { useBreadcrumbContext_unstable } from './BreadcrumbContext';
import { Tooltip } from '@fluentui/react-tooltip';
import { truncateBreadcrumbLongName, partitionBreadcrumbItems } from '../../utils';
import { computeAccessibleName } from 'dom-accessibility-api';
import { useCoverageStyles } from './Breadcrumb.cy.styles';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuItemLink } from '@fluentui/react-menu';
import { Button } from '@fluentui/react-button';
import {
  Overflow,
  OverflowItem,
  OverflowDivider,
  useOverflowMenu,
  useIsOverflowItemVisible,
} from '@fluentui/react-overflow';
import type { OverflowProps } from '@fluentui/react-overflow';
import type { BreadcrumbProps } from '../Breadcrumb';
import type { JSXElement } from '@fluentui/react-utilities';

const overflowItems = ['Home', 'Projects', 'Archive', 'Reports', 'Page'];

const HiddenLink = ({ index, onNavigate }: { index: number; onNavigate: (index: number) => void }) => {
  const visible = useIsOverflowItemVisible(String(index));
  return visible ? null : (
    <MenuItemLink
      href={`#route-${index}`}
      onClick={event => {
        event.preventDefault();
        onNavigate(index);
      }}
    >
      {overflowItems[index]}
    </MenuItemLink>
  );
};

const RecipeMenu = ({
  hidden,
  onNavigate,
  onOpenChange,
}: {
  hidden: readonly number[];
  onNavigate: (index: number) => void;
  onOpenChange: NonNullable<React.ComponentProps<typeof Menu>['onOpenChange']>;
}) => {
  const { ref, isOverflowing, overflowCount } = useOverflowMenu<HTMLButtonElement>();
  if (!isOverflowing && hidden.length === 0) {
    return null;
  }
  return (
    <BreadcrumbItem>
      <Menu onOpenChange={onOpenChange}>
        <MenuTrigger disableButtonEnhancement>
          <Button ref={ref} aria-label={`${hidden.length + overflowCount} more items`} id="recipe-menu">
            More
          </Button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {overflowItems.map((_, index) =>
              hidden.includes(index) ? (
                <MenuItemLink
                  key={index}
                  href={`#route-${index}`}
                  onClick={event => {
                    event.preventDefault();
                    onNavigate(index);
                  }}
                >
                  {overflowItems[index]}
                </MenuItemLink>
              ) : (
                <HiddenLink key={index} index={index} onNavigate={onNavigate} />
              ),
            )}
          </MenuList>
        </MenuPopover>
      </Menu>
    </BreadcrumbItem>
  );
};

const OverflowRecipe = ({
  maxDisplayedItems = 5,
  onNavigate,
  onOpenChange,
  onOverflowChange,
  ...props
}: BreadcrumbProps & {
  maxDisplayedItems?: number;
  onNavigate: (index: number) => void;
  onOpenChange: NonNullable<React.ComponentProps<typeof Menu>['onOpenChange']>;
  onOverflowChange?: OverflowProps['onOverflowChange'];
}): JSXElement => {
  const [width, setWidth] = React.useState(900);
  const partition = partitionBreadcrumbItems({ items: overflowItems.map((_, index) => index), maxDisplayedItems });
  const hidden = partition.overflowItems ?? [];
  const displayed = [...partition.startDisplayedItems, ...(partition.endDisplayedItems ?? [])];
  return (
    <>
      <button id="narrow" onClick={() => setWidth(220)}>
        Narrow container
      </button>
      <button id="wide" onClick={() => setWidth(900)}>
        Widen container
      </button>
      <div id="recipe-container" style={{ width }}>
        <Overflow hasHiddenItems={hidden.length > 0} onOverflowChange={onOverflowChange}>
          <Breadcrumb {...props} aria-label="Overflow hierarchy">
            {displayed.map((index, position) => (
              <React.Fragment key={index}>
                {position === partition.startDisplayedItems.length && hidden.length > 0 && (
                  <RecipeMenu hidden={hidden} onNavigate={onNavigate} onOpenChange={onOpenChange} />
                )}
                <OverflowItem id={String(index)} groupId={String(index)} priority={index === 4 ? 100 : undefined}>
                  <BreadcrumbItem>
                    <BreadcrumbButton
                      href={`#route-${index}`}
                      current={index === 4}
                      onClick={event => {
                        event.preventDefault();
                        onNavigate(index);
                      }}
                    >
                      {overflowItems[index]}
                    </BreadcrumbButton>
                  </BreadcrumbItem>
                </OverflowItem>
                {position < displayed.length - 1 && (
                  <OverflowDivider groupId={String(index)}>
                    <BreadcrumbDivider />
                  </OverflowDivider>
                )}
              </React.Fragment>
            ))}
            {hidden.length === 0 && <RecipeMenu hidden={hidden} onNavigate={onNavigate} onOpenChange={onOpenChange} />}
          </Breadcrumb>
        </Overflow>
      </div>
    </>
  );
};

const mountFluent = (element: JSXElement) => {
  mount(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
};

const BreadcrumbSampleWithButton = (props: BreadcrumbProps) => (
  <>
    <p tabIndex={0} id="before">
      Before
    </p>

    <Breadcrumb {...props} id="breadcrumb">
      <BreadcrumbItem>
        <BreadcrumbButton id="breadcrumb-button-1">Item 1</BreadcrumbButton>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <BreadcrumbButton id="breadcrumb-button-2">Item 2</BreadcrumbButton>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <BreadcrumbButton id="breadcrumb-button-3" disabled>
          Item 3
        </BreadcrumbButton>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <BreadcrumbButton id="breadcrumb-button-4" current>
          Item 4
        </BreadcrumbButton>
      </BreadcrumbItem>
    </Breadcrumb>

    <p tabIndex={0} id="after">
      After
    </p>
  </>
);

describe('Breadcrumb', () => {
  describe('focus behaviors for BreadcrumbButton', () => {
    describe('focusMode="tab"(default)', () => {
      it('should be focusable', () => {
        mountFluent(<BreadcrumbSampleWithButton />);

        cy.get('#before').focus();

        cy.get('#breadcrumb-button-1').should('not.be.focused');

        cy.realPress('Tab');

        cy.get('#breadcrumb-button-1').should('be.focused');
        cy.realPress('Tab');
        cy.get('#breadcrumb-button-2').should('be.focused');
        cy.realPress('Tab');
        cy.get('#breadcrumb-button-3').should('not.be.focused');
        cy.get('#breadcrumb-button-4').should('be.focused');
      });
    });

    describe('focusMode="arrow"', () => {
      it('should be focusable', () => {
        mountFluent(<BreadcrumbSampleWithButton focusMode="arrow" />);

        cy.get('#before').focus();

        cy.get('#breadcrumb-button-1').should('not.be.focused');

        cy.realPress('Tab');

        cy.get('#breadcrumb-button-1').should('be.focused');
        cy.realPress('ArrowRight');
        cy.get('#breadcrumb-button-2').should('be.focused');
        cy.realPress('ArrowRight');
        cy.get('#breadcrumb-button-3').should('not.be.focused');
        cy.get('#breadcrumb-button-4').should('be.focused');
        cy.realPress('ArrowRight');
        cy.get('#breadcrumb-button-1').should('be.focused');
      });
    });
  });
});

const Trail = (props: BreadcrumbProps) => (
  <Breadcrumb {...props}>
    <BreadcrumbItem>
      <BreadcrumbButton href="#home">Home</BreadcrumbButton>
    </BreadcrumbItem>
    <BreadcrumbDivider />
    <BreadcrumbItem>
      <BreadcrumbButton icon={<span aria-hidden="true">+</span>}>Library</BreadcrumbButton>
    </BreadcrumbItem>
    <BreadcrumbDivider />
    <BreadcrumbItem>
      <BreadcrumbButton href="#page" current>
        Page
      </BreadcrumbButton>
    </BreadcrumbItem>
  </Breadcrumb>
);

describe('Breadcrumb unit and source regressions', () => {
  it('preserves root preventDefault on consumer native navigation without suppressing bubbling observers', () => {
    const child = cy.stub().as('native-child');
    const prevented = cy.stub().as('root-prevented');
    mountFluent(
      <Breadcrumb
        onClick={event => {
          event.preventDefault();
          prevented(event.defaultPrevented);
        }}
      >
        <BreadcrumbItem>
          <a href="#root-prevented" onClick={child}>
            Consumer native route
          </a>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.contains('a', 'Consumer native route').focus();
    cy.realPress('Enter');
    cy.get('@native-child').should('have.been.calledOnce');
    cy.get('@root-prevented').should('have.been.calledOnceWithExactly', true);
    cy.location('hash').should('not.eq', '#root-prevented');
  });

  it('keeps a consumer-controlled overflow menu closed when its open request is rejected, then accepts it', () => {
    const requests = cy.stub().as('controlled-open');
    const Fixture = () => {
      const [accept, setAccept] = React.useState(false);
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button id="accept-menu" onClick={() => setAccept(true)}>
            Accept menu requests
          </button>
          <Breadcrumb>
            <BreadcrumbItem>
              <Menu
                open={open}
                onOpenChange={(event, data) => {
                  requests(data.open, data.type);
                  if (accept) {
                    setOpen(data.open);
                  }
                }}
              >
                <MenuTrigger disableButtonEnhancement>
                  <BreadcrumbButton>Controlled overflow</BreadcrumbButton>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem>Hidden folder</MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </BreadcrumbItem>
          </Breadcrumb>
        </>
      );
    };
    mountFluent(<Fixture />);
    cy.contains('button', 'Controlled overflow').focus();
    cy.realPress('ArrowDown');
    cy.get('@controlled-open').should('have.been.calledOnceWithExactly', true, 'menuTriggerKeyDown');
    cy.get('[role="menu"]').should('not.exist');
    cy.get('#accept-menu').realClick();
    cy.contains('button', 'Controlled overflow').focus();
    cy.realPress('ArrowDown');
    cy.get('@controlled-open').should('have.been.calledTwice');
    cy.contains('[role="menuitem"]', 'Hidden folder').should('be.focused');
    cy.realPress('Escape');
    cy.get('[role="menu"]').should('not.exist');
    cy.contains('button', 'Controlled overflow').should('be.focused');
    cy.get('@controlled-open').should('have.been.calledWithExactly', false, 'menuPopoverKeyDown');
  });

  it('restores the default size after the consumer removes a size prop and updates slot refs on remount', () => {
    const ref = React.createRef<HTMLOListElement>();
    const Fixture = () => {
      const [custom, setCustom] = React.useState(true);
      const [list, setList] = React.useState(true);
      return (
        <>
          <button id="default-size" onClick={() => setCustom(false)}>
            Use default size
          </button>
          <button id="toggle-list" onClick={() => setList(!list)}>
            Toggle list
          </button>
          <Breadcrumb size={custom ? 'large' : undefined} list={list ? { ref } : null}>
            <BreadcrumbItem>
              <BreadcrumbButton>Restored</BreadcrumbButton>
            </BreadcrumbItem>
          </Breadcrumb>
        </>
      );
    };
    mountFluent(<Fixture />);
    cy.contains('button', 'Restored').should('have.css', 'height', '40px');
    cy.get('#default-size').realClick();
    cy.contains('button', 'Restored').should('have.css', 'height', '32px');
    cy.get('#toggle-list').realClick();
    cy.get('nav').should('be.empty');
    cy.then(() => expect(ref.current).to.equal(null));
    cy.get('#toggle-list').realClick();
    cy.get('nav > ol').then($list => expect(ref.current).to.equal($list[0]));
    cy.contains('button', 'Restored').should('have.css', 'height', '32px');
  });
  it('forwards root and list object refs to their distinct native elements', () => {
    const rootRef = React.createRef<HTMLElement>();
    const listRef = React.createRef<HTMLOListElement>();
    mountFluent(
      <Breadcrumb ref={rootRef} list={{ ref: listRef }}>
        <BreadcrumbItem>Folder</BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('nav').then($root => expect(rootRef.current).to.equal($root[0]));
    cy.get('ol').then($list => expect(listRef.current).to.equal($list[0]));
  });

  it('clears root and list callback refs when the consumer unmounts the trail', () => {
    const rootRef = cy.stub().as('root-ref');
    const listRef = cy.stub().as('list-ref');
    const Fixture = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button id="unmount" onClick={() => setVisible(false)}>
            Unmount
          </button>
          {visible && (
            <Breadcrumb ref={node => rootRef(node)} list={{ ref: node => listRef(node) }}>
              <BreadcrumbItem>Folder</BreadcrumbItem>
            </Breadcrumb>
          )}
        </>
      );
    };
    mountFluent(<Fixture />);
    cy.get('nav').then($root => expect(rootRef.lastCall.args[0]).to.equal($root[0]));
    cy.get('ol').then($list => expect(listRef.lastCall.args[0]).to.equal($list[0]));
    cy.get('#unmount').realClick();
    cy.get('nav').should('not.exist');
    cy.get('@root-ref').should('have.been.calledWithExactly', null);
    cy.get('@list-ref').should('have.been.calledWithExactly', null);
  });

  it('preserves native root and list attributes while filtering design props from DOM', () => {
    mountFluent(
      <Trail
        id="native-root"
        title="Hierarchy"
        lang="en"
        data-owner="consumer"
        size="large"
        focusMode="arrow"
        list={{
          id: 'native-list',
          title: 'Ancestors',
          start: 3,
          reversed: true,
          'aria-label': 'Ancestors',
          className: 'consumer-list',
        }}
        className="consumer-root"
      />,
    );
    cy.get('#native-root')
      .should('have.class', 'fui-Breadcrumb')
      .and('have.class', 'consumer-root')
      .and('have.attr', 'title', 'Hierarchy')
      .and('have.attr', 'lang', 'en')
      .and('have.attr', 'data-owner', 'consumer');
    cy.get('#native-root').should('not.have.attr', 'size');
    cy.get('#native-root').should('not.have.attr', 'focusMode');
    cy.get('#native-list')
      .should('have.class', 'fui-Breadcrumb__list')
      .and('have.class', 'consumer-list')
      .and('have.attr', 'start', '3');
    cy.get('#native-list').should('have.attr', 'reversed');
    cy.get('#native-list').should('have.attr', 'title', 'Ancestors');
  });

  it('preserves refs, native attributes, classes and children with explicit supported nav and ol as values', () => {
    const rootRef = React.createRef<HTMLElement>();
    const listRef = React.createRef<HTMLOListElement>();
    mountFluent(
      <Breadcrumb
        as="nav"
        ref={rootRef}
        id="explicit-root"
        title="Explicit hierarchy"
        lang="en"
        className="explicit-root-class"
        aria-label="Explicit hierarchy"
        list={{
          as: 'ol',
          ref: listRef,
          id: 'explicit-list',
          title: 'Explicit ancestors',
          start: 3,
          reversed: true,
          className: 'explicit-list-class',
        }}
      >
        <BreadcrumbItem>Explicit child</BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('nav#explicit-root')
      .should('have.class', 'fui-Breadcrumb')
      .and('have.class', 'explicit-root-class')
      .and('have.attr', 'title', 'Explicit hierarchy')
      .and('have.attr', 'lang', 'en')
      .and('have.attr', 'aria-label', 'Explicit hierarchy')
      .then($root => expect(rootRef.current).to.equal($root[0]));
    cy.get('#explicit-root > ol#explicit-list')
      .should('have.class', 'fui-Breadcrumb__list')
      .and('have.class', 'explicit-list-class')
      .and('have.attr', 'title', 'Explicit ancestors')
      .and('have.attr', 'role', 'list')
      .and('have.attr', 'start', '3')
      .then($list => expect(listRef.current).to.equal($list[0]));
    cy.get('#explicit-list').should('have.attr', 'reversed');
    cy.get('#explicit-list > li').should('have.length', 1).and('have.text', 'Explicit child');
    cy.get('#explicit-root, #explicit-list').each($element => expect($element).not.to.have.attr('as'));
  });

  it('preserves supported consumer root and list role overrides', () => {
    mountFluent(<Trail role="navigation" list={{ role: 'list', 'aria-label': 'Explicit list' }} />);
    cy.get('nav').should('have.attr', 'role', 'navigation');
    cy.get('ol').should('have.attr', 'role', 'list').and('have.attr', 'aria-label', 'Explicit list');
  });

  it('characterizes explicit empty aria-label without silently repairing the consumer name', () => {
    mountFluent(<Trail aria-label="" />);
    cy.get('nav')
      .should('have.attr', 'aria-label', '')
      .should($root => expect(computeAccessibleName($root[0])).to.equal(''));
  });

  it('omits both list and children when the optional list slot is null', () => {
    mountFluent(<Trail list={null} />);
    cy.get('nav').should('exist').and('be.empty');
    cy.get('ol, .fui-BreadcrumbItem').should('not.exist');
  });

  it('uses root children rather than list shorthand children', () => {
    mountFluent(
      <Breadcrumb list={{ children: <li>Ignored list child</li> }}>
        <BreadcrumbItem>Root child</BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('ol > li').should('have.length', 1).and('have.text', 'Root child');
    cy.contains('Ignored list child').should('not.exist');
  });

  it('supports list render functions without losing children, ref, classes or semantics', () => {
    const listRef = React.createRef<HTMLOListElement>();
    mountFluent(
      <Breadcrumb
        list={{
          ref: listRef,
          children: (
            Component: React.ElementType<React.ComponentPropsWithRef<'ol'>>,
            props: React.ComponentPropsWithRef<'ol'>,
          ) => (
            <Component {...props} data-rendered="list">
              {props.children}
            </Component>
          ),
        }}
      >
        <BreadcrumbItem>Rendered child</BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('nav > ol')
      .should('have.attr', 'data-rendered', 'list')
      .and('have.attr', 'role', 'list')
      .and('have.class', 'fui-Breadcrumb__list')
      .and('contain.text', 'Rendered child')
      .then($list => expect(listRef.current).to.equal($list[0]));
  });

  it('supports root render functions around the generated list and context provider', () => {
    mountFluent(
      <Breadcrumb
        size="large"
        children={(
          Component: React.ElementType<React.ComponentPropsWithRef<'nav'>>,
          props: React.ComponentPropsWithRef<'nav'>,
        ) => (
          <Component {...props} data-rendered="root">
            {props.children}
            <span id="root-extra">Additional</span>
          </Component>
        )}
        list={{
          children: (
            Component: React.ElementType<React.ComponentPropsWithRef<'ol'>>,
            props: React.ComponentPropsWithRef<'ol'>,
          ) => (
            <Component {...props}>
              <BreadcrumbItem>
                <SizeProbe id="render-size" />
              </BreadcrumbItem>
            </Component>
          ),
        }}
      />,
    );
    cy.get('nav').should('have.attr', 'data-rendered', 'root').and('have.attr', 'aria-label', 'breadcrumb');
    cy.get('nav > ol #render-size').should('have.text', 'large');
    cy.get('nav > #root-extra').should('have.text', 'Additional');
  });

  it('composes child, list and root click callbacks in bubbling order', () => {
    const events: string[] = [];
    mountFluent(
      <Breadcrumb onClick={() => events.push('root')} list={{ onClick: () => events.push('list') }}>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => events.push('child')}>Activate</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.contains('button', 'Activate').realClick();
    cy.then(() => expect(events).to.deep.equal(['child', 'list', 'root']));
  });

  it('honors child stopPropagation without invoking list or root callbacks', () => {
    const root = cy.stub().as('root-click');
    const list = cy.stub().as('list-click');
    const child = cy.stub().as('child-click');
    mountFluent(
      <Breadcrumb onClick={root} list={{ onClick: list }}>
        <BreadcrumbItem>
          <BreadcrumbButton
            onClick={event => {
              event.stopPropagation();
              child();
            }}
          >
            Stop
          </BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.contains('button', 'Stop').realClick();
    cy.get('@child-click').should('have.been.calledOnce');
    cy.get('@list-click').should('not.have.been.called');
    cy.get('@root-click').should('not.have.been.called');
  });

  it('honors prevented descendant Enter activation without masking later successful activation', () => {
    const navigate = cy.stub().as('prevented-navigate');
    const Fixture = () => {
      const [prevent, setPrevent] = React.useState(true);
      return (
        <>
          <button id="allow" onClick={() => setPrevent(false)}>
            Allow
          </button>
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbButton
                href="#prevented"
                onClick={event => {
                  event.preventDefault();
                  navigate();
                }}
                onKeyDown={event => {
                  if (prevent) {
                    event.preventDefault();
                  }
                }}
              >
                Guarded
              </BreadcrumbButton>
            </BreadcrumbItem>
          </Breadcrumb>
        </>
      );
    };
    mountFluent(<Fixture />);
    cy.contains('a', 'Guarded').focus();
    cy.realPress('Enter');
    cy.get('@prevented-navigate').should('not.have.been.called');
    cy.get('#allow').realClick();
    cy.contains('a', 'Guarded').focus();
    cy.realPress('Enter');
    cy.get('@prevented-navigate').should('have.been.calledOnce');
  });

  it('uses latest root, list and child callbacks after a consumer rerender', () => {
    const observe = cy.stub().as('latest');
    const Fixture = () => {
      const [version, setVersion] = React.useState(1);
      return (
        <>
          <button id="update" onClick={() => setVersion(2)}>
            Update
          </button>
          <Breadcrumb onClick={() => observe('root', version)} list={{ onClick: () => observe('list', version) }}>
            <BreadcrumbItem>
              <BreadcrumbButton onClick={() => observe('child', version)}>Observe</BreadcrumbButton>
            </BreadcrumbItem>
          </Breadcrumb>
        </>
      );
    };
    mountFluent(<Fixture />);
    cy.contains('button', 'Observe').realClick();
    cy.get('@latest').should('have.been.calledThrice');
    cy.get('@latest').should('have.been.calledWithExactly', 'root', 1);
    cy.get('#update').realClick();
    cy.contains('button', 'Observe').realClick();
    cy.get('@latest').its('callCount').should('equal', 6);
    cy.then(() =>
      expect(
        observe
          .getCalls()
          .slice(3)
          .map(call => call.args),
      ).to.deep.equal([
        ['child', 2],
        ['list', 2],
        ['root', 2],
      ]),
    );
  });

  it('updates sizes, list styles and labels in place without replacing the root or focused descendant', () => {
    const Fixture = () => {
      const [large, setLarge] = React.useState(false);
      return (
        <Breadcrumb size={large ? 'large' : 'small'} aria-label={large ? 'Updated' : 'Initial'}>
          <BreadcrumbItem>
            <BreadcrumbButton onClick={() => setLarge(!large)}>Resize size</BreadcrumbButton>
          </BreadcrumbItem>
          <BreadcrumbDivider />
        </Breadcrumb>
      );
    };
    mountFluent(<Fixture />);
    cy.get('nav').then($root => {
      const root = $root[0];
      cy.contains('button', 'Resize size').should('have.css', 'height', '24px').focus();
      cy.realPress('Enter');
      cy.contains('button', 'Resize size').should('be.focused').and('have.css', 'height', '40px');
      cy.get('nav')
        .should('have.attr', 'aria-label', 'Updated')
        .then($updated => expect($updated[0]).to.equal(root));
      cy.get('.fui-BreadcrumbDivider').should('have.css', 'font-size', '20px');
    });
  });

  it('switches tab and arrow focus modes without stale navigation attributes', () => {
    const Fixture = () => {
      const [arrow, setArrow] = React.useState(false);
      return (
        <>
          <button id="mode" onClick={() => setArrow(!arrow)}>
            Mode
          </button>
          <BreadcrumbSampleWithButton focusMode={arrow ? 'arrow' : 'tab'} />
        </>
      );
    };
    mountFluent(<Fixture />);
    cy.get('#breadcrumb').should('not.have.attr', 'data-tabster');
    cy.get('#mode').realClick();
    cy.get('#breadcrumb').should('have.attr', 'data-tabster');
    cy.get('#breadcrumb-button-1').focus();
    cy.realPress('ArrowRight');
    cy.get('#breadcrumb-button-2').should('be.focused');
    cy.get('#mode').realClick();
    cy.get('#breadcrumb').should('not.have.attr', 'data-tabster');
    cy.get('#breadcrumb-button-1').focus();
    cy.realPress('ArrowRight');
    cy.get('#breadcrumb-button-1').should('be.focused');
  });

  it('preserves explicit consumer data-tabster in preference to generated arrow attributes', () => {
    mountFluent(<BreadcrumbSampleWithButton focusMode="arrow" data-tabster="{}" />);
    cy.get('#breadcrumb').should('have.attr', 'data-tabster', '{}');
    cy.get('#breadcrumb-button-1').focus();
    cy.realPress('ArrowRight');
    cy.get('#breadcrumb-button-1').should('be.focused');
  });

  it('updates keyed children and current-page semantics without stale removed focus targets', () => {
    const Fixture = () => {
      const [updated, setUpdated] = React.useState(false);
      const names = updated ? ['Home', 'Added', 'Final'] : ['Home', 'Removed', 'Page'];
      return (
        <>
          <button id="children-update" onClick={() => setUpdated(true)}>
            Change children
          </button>
          <Breadcrumb focusMode="arrow">
            {names.map((name, index) => (
              <BreadcrumbItem key={name}>
                <BreadcrumbButton current={index === 2}>{name}</BreadcrumbButton>
              </BreadcrumbItem>
            ))}
          </Breadcrumb>
        </>
      );
    };
    mountFluent(<Fixture />);
    cy.contains('button', 'Removed').focus();
    cy.get('#children-update').realClick();
    cy.contains('button', 'Removed').should('not.exist');
    cy.contains('button', 'Page').should('not.exist');
    cy.contains('button', 'Final').should('have.attr', 'aria-current', 'page');
    cy.get('[aria-current="page"]').should('have.length', 1);
    cy.contains('button', 'Home').focus();
    cy.realPress('ArrowRight');
    cy.contains('button', 'Added').should('be.focused');
  });

  it('keeps disabled and current descendants nonactivating while a normal descendant remains actionable', () => {
    const activate = cy.stub().as('state-activate');
    mountFluent(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton disabled onClick={activate}>
            Disabled
          </BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbButton current onClick={activate}>
            Current
          </BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={activate}>Enabled</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.contains('button', 'Disabled').should('be.disabled').realClick();
    cy.contains('button', 'Current').should('have.attr', 'aria-disabled', 'true').focus();
    cy.realPress('Enter');
    cy.realPress('Space');
    cy.contains('button', 'Current').realClick();
    cy.get('@state-activate').should('not.have.been.called');
    cy.contains('button', 'Enabled').realClick();
    cy.get('@state-activate').should('have.been.calledOnce');
  });

  it('merges consumer list token styles after reset styles and keeps static class names', () => {
    const Fixture = () => {
      const styles = useCoverageStyles();
      return <Trail className="root-custom" list={{ className: styles.list }} />;
    };
    mountFluent(<Fixture />);
    cy.get('nav').should('have.class', 'fui-Breadcrumb').and('have.class', 'root-custom');
    cy.get('ol')
      .should('have.class', 'fui-Breadcrumb__list')
      .and('have.css', 'column-gap', webLightTheme.spacingHorizontalL)
      .and('have.css', 'padding-inline-start', webLightTheme.spacingHorizontalS)
      .and('have.css', 'margin-top', '0px');
  });

  it('honors nested provider themes without contaminating adjacent breadcrumbs', () => {
    mountFluent(
      <>
        <Trail id="light" />
        <FluentProvider theme={webDarkTheme}>
          <Trail id="dark" />
        </FluentProvider>
        <Trail id="light-after" />
      </>,
    );
    cy.get('#light .fui-BreadcrumbButton').first().should('have.css', 'color', 'rgb(66, 66, 66)');
    cy.get('#dark .fui-BreadcrumbButton').first().should('have.css', 'color', 'rgb(214, 214, 214)');
    cy.get('#light-after .fui-BreadcrumbButton').first().should('have.css', 'color', 'rgb(66, 66, 66)');
  });
});

const SizeProbe = ({ id }: { id: string }) => {
  const { size } = useBreadcrumbContext_unstable();
  return <output id={id}>{size}</output>;
};

describe('Breadcrumb edges and accessibility', () => {
  it('computes landmark and link names from labels and visible text, excluding decorative icons', () => {
    mountFluent(<Trail aria-label="Folder hierarchy" />);
    cy.get('nav').should($nav => expect(computeAccessibleName($nav[0])).to.equal('Folder hierarchy'));
    cy.contains('button', 'Library').should($button => expect(computeAccessibleName($button[0])).to.equal('Library'));
    cy.contains('a', 'Home').should($link => expect(computeAccessibleName($link[0])).to.equal('Home'));
  });

  it('uses labelledby in preference to the default landmark label', () => {
    mountFluent(
      <>
        <h2 id="heading">Account hierarchy</h2>
        <Trail aria-labelledby="heading" />
      </>,
    );
    cy.get('nav').should($nav => expect(computeAccessibleName($nav[0])).to.equal('Account hierarchy'));
  });

  it('keeps empty and singleton trails passive with no automatic current-page inference', () => {
    mountFluent(
      <>
        <Breadcrumb id="empty" />
        <Breadcrumb id="single">
          <BreadcrumbItem>Only</BreadcrumbItem>
        </Breadcrumb>
      </>,
    );
    cy.get('#empty > ol').should('be.empty');
    cy.get('#single > ol > li').should('have.length', 1).and('have.text', 'Only');
    cy.get('nav [aria-current], nav [aria-live], nav a, nav button, nav [tabindex], nav [role="button"]').should(
      'not.exist',
    );
    cy.get('#empty, #single').each($root => {
      expect($root).not.to.have.attr('tabindex');
      expect($root).not.to.have.attr('aria-live');
    });
  });

  it('characterizes inherited Space activation on BreadcrumbButton links versus plain native links', () => {
    const navigate = cy.stub().as('link-activate');
    const native = cy.stub().as('native-activate');
    mountFluent(
      <>
        <button id="start">Start</button>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbButton
              href="#link"
              onClick={event => {
                event.preventDefault();
                navigate();
              }}
            >
              Native link
            </BreadcrumbButton>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <a
              href="#plain"
              onClick={event => {
                event.preventDefault();
                native();
              }}
            >
              Plain anchor
            </a>
          </BreadcrumbItem>
        </Breadcrumb>
        <button id="end">End</button>
      </>,
    );
    cy.get('#start').focus();
    cy.realPress('Tab');
    cy.contains('a', 'Native link').should('be.focused');
    cy.realPress('Space');
    cy.get('@link-activate').should('have.been.calledOnce');
    cy.realPress('Enter');
    cy.get('@link-activate').should('have.been.calledTwice');
    cy.realPress('Tab');
    cy.contains('a', 'Plain anchor').should('be.focused');
    cy.realPress('Space');
    cy.get('@native-activate').should('not.have.been.called');
    cy.realPress('Enter');
    cy.get('@native-activate').should('have.been.calledOnce');
    cy.realPress('Tab');
    cy.get('#end').should('be.focused');
  });

  it('retains the focused arrow item when leaving and reentering the group', () => {
    mountFluent(<BreadcrumbSampleWithButton focusMode="arrow" />);
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.realPress('ArrowRight');
    cy.get('#breadcrumb-button-2').should('be.focused');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    cy.get('#breadcrumb-button-2').should('be.focused');
  });

  it('does not add arrow navigation in tab mode', () => {
    mountFluent(<BreadcrumbSampleWithButton />);
    cy.get('#breadcrumb-button-1').focus();
    cy.realPress('ArrowRight');
    cy.get('#breadcrumb-button-1').should('be.focused');
    cy.realPress('Tab');
    cy.get('#breadcrumb-button-2').should('be.focused');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`lays out every unpartitioned item in ${dir} order without automatic overflow`, () => {
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <Trail />
        </FluentProvider>,
      );
      cy.get('nav > ol').should('have.css', 'display', 'flex').and('have.css', 'list-style-type', 'none');
      cy.get('.fui-BreadcrumbItem')
        .should('have.length', 3)
        .each($item => {
          expect($item[0].getBoundingClientRect().width).to.be.greaterThan(0);
        });
      cy.get('.fui-BreadcrumbItem').then($items => {
        const first = $items[0].getBoundingClientRect();
        const last = $items[2].getBoundingClientRect();
        expect(dir === 'rtl' ? first.left > last.left : first.left < last.left).to.equal(true);
      });
      cy.get('#recipe-menu').should('not.exist');
    });

    it(`maps arrow navigation to physical ${dir} direction`, () => {
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <BreadcrumbSampleWithButton focusMode="arrow" />
        </FluentProvider>,
      );
      cy.get('#before').focus();
      cy.realPress('Tab');
      cy.realPress(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('#breadcrumb-button-2').should('be.focused');
      cy.realPress(dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#breadcrumb-button-1').should('be.focused');
    });

    it(`reflows the parent-owned Overflow recipe narrow and wide in ${dir} with exact visibility callbacks`, () => {
      const overflow = cy.stub().as('overflow-change');
      const open = cy.stub().as('responsive-open');
      const navigate = cy.stub().as('responsive-navigate');
      mount(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <OverflowRecipe onNavigate={navigate} onOpenChange={open} onOverflowChange={overflow} />
        </FluentProvider>,
      );
      cy.get('.fui-BreadcrumbButton:visible').should('have.length', 5);
      cy.get('#recipe-menu').should('not.exist');
      cy.get('#narrow').realClick();
      cy.get('#recipe-menu').should('be.visible').and('have.attr', 'aria-label', '3 more items');
      cy.get('.fui-BreadcrumbButton:visible').should('have.length', 2);
      cy.get('@overflow-change').should('have.been.calledWith', null, {
        hasOverflow: true,
        itemVisibility: { '0': true, '1': false, '2': false, '3': false, '4': true },
        groupVisibility: { '0': 'visible', '1': 'hidden', '2': 'hidden', '3': 'hidden', '4': 'visible' },
      });
      cy.get('#recipe-menu').focus();
      cy.realPress('ArrowDown');
      cy.get('@responsive-open').should('have.been.calledOnce');
      cy.get('@responsive-open')
        .its('firstCall.args')
        .should(([event, data]) => {
          expect(data).to.deep.equal({ open: true, keyboard: true, type: 'menuTriggerKeyDown', event });
          expect(data.event).to.equal(event);
          expect(event.type).to.equal('keydown');
          expect(event.key).to.equal('ArrowDown');
        });
      cy.get('[role="menuitem"]')
        .should('have.length', 3)
        .and('contain.text', 'Projects')
        .and('contain.text', 'Archive')
        .and('contain.text', 'Reports');
      cy.contains('[role="menuitem"]', 'Projects').should('be.focused');
      cy.realPress('Escape');
      cy.get('[role="menu"]').should('not.exist');
      cy.get('#recipe-menu').should('be.focused');
      cy.get('@responsive-open').should('have.been.calledTwice');
      cy.get('@responsive-open')
        .its('secondCall.args')
        .should(([event, data]) => {
          expect(data).to.deep.equal({ open: false, keyboard: true, type: 'menuPopoverKeyDown', event });
          expect(data.event).to.equal(event);
          expect(event.type).to.equal('keydown');
          expect(event.key).to.equal('Escape');
        });
      cy.get('@responsive-navigate').should('not.have.been.called');
      cy.get('#wide').realClick();
      cy.get('.fui-BreadcrumbButton:visible').should('have.length', 5);
      cy.get('#recipe-menu').should('not.exist');
      cy.get('@overflow-change').should('have.been.calledWith', null, {
        hasOverflow: false,
        itemVisibility: { '0': true, '1': true, '2': true, '3': true, '4': true },
        groupVisibility: { '0': 'visible', '1': 'visible', '2': 'visible', '3': 'visible', '4': 'visible' },
      });
    });

    for (const key of ['Enter', 'Space', 'ArrowDown'] as const) {
      it(`opens the partitioned story recipe with ${key} in ${dir}, closes with Escape and restores trigger focus`, () => {
        const open = cy.stub().as('menu-open');
        const navigate = cy.stub().as('menu-navigate');
        mount(
          <FluentProvider theme={webLightTheme} dir={dir}>
            <OverflowRecipe maxDisplayedItems={3} onNavigate={navigate} onOpenChange={open} />
          </FluentProvider>,
        );
        cy.get('.fui-BreadcrumbButton:visible').should('have.length', 3);
        cy.get('#recipe-menu').should('have.attr', 'aria-label', '2 more items').focus();
        cy.realPress(key);
        cy.get('@menu-open').should('have.been.calledOnce');
        cy.get('@menu-open')
          .its('firstCall.args')
          .should(([event, data]) => {
            expect(data).to.deep.equal({
              open: true,
              keyboard: key === 'ArrowDown',
              type: key === 'ArrowDown' ? 'menuTriggerKeyDown' : 'menuTriggerClick',
              event,
            });
            expect(data.event).to.equal(event);
            expect(event.type).to.equal(key === 'ArrowDown' ? 'keydown' : 'click');
            expect(event.nativeEvent.type).to.equal(event.type);
            if (key === 'ArrowDown') {
              expect(event.key).to.equal('ArrowDown');
            }
          });
        cy.get('[role="menuitem"]').should('have.length', 2);
        cy.get('#recipe-menu').should('have.attr', 'aria-expanded', 'true').and('have.attr', 'aria-haspopup', 'menu');
        cy.contains('[role="menuitem"]', 'Projects').should('be.focused');
        cy.realPress('Escape');
        cy.get('#recipe-menu').should('be.focused').and('not.have.attr', 'aria-expanded');
        cy.get('[role="menu"]').should('not.exist');
        cy.get('@menu-open').should('have.been.calledTwice');
        cy.get('@menu-open')
          .its('secondCall.args')
          .should(([event, data]) => {
            expect(data).to.deep.equal({ open: false, keyboard: true, type: 'menuPopoverKeyDown', event });
            expect(data.event).to.equal(event);
            expect(event.type).to.equal('keydown');
            expect(event.nativeEvent.key).to.equal('Escape');
            expect(event.key).to.equal('Escape');
          });
        cy.get('@menu-navigate').should('not.have.been.called');
      });
    }

    for (const activation of ['Enter', 'click'] as const) {
      it(`navigates a partitioned overflow link exactly once by ${activation} in ${dir} and closes after selection`, () => {
        const navigate = cy.stub().as('overflow-navigate');
        const open = cy.stub().as('selection-open');
        mount(
          <FluentProvider theme={webLightTheme} dir={dir}>
            <OverflowRecipe maxDisplayedItems={3} onNavigate={navigate} onOpenChange={open} />
          </FluentProvider>,
        );
        cy.get('#recipe-menu').focus();
        cy.realPress('ArrowDown');
        cy.get('@selection-open').should('have.been.calledOnce');
        cy.contains('[role="menuitem"]', 'Projects').should('be.focused');
        cy.realPress('ArrowDown');
        cy.contains('a[role="menuitem"]', 'Archive').should('be.focused').and('have.attr', 'href', '#route-2');
        cy.get('@overflow-navigate').should('not.have.been.called');
        if (activation === 'Enter') {
          cy.realPress('Enter');
        } else {
          cy.contains('a[role="menuitem"]', 'Archive').realClick();
        }
        cy.get('@overflow-navigate').should('have.been.calledOnceWithExactly', 2);
        cy.get('[role="menu"]').should('not.exist');
        cy.get('#recipe-menu').should('be.focused');
        cy.get('@selection-open').should('have.been.calledTwice');
        cy.get('@selection-open')
          .its('secondCall.args')
          .should(([event, data]) => {
            expect(data).to.deep.equal({
              open: false,
              keyboard: activation === 'Enter',
              bubble: true,
              type: 'menuItemClick',
              event,
            });
            expect(data.event).to.equal(event);
            expect(event.type).to.equal('click');
            expect(event.nativeEvent.type).to.equal('click');
          });
        cy.location('hash').should('not.eq', '#route-2');
      });
    }
  }

  it('exposes the full consumer-truncated name through the tooltip label relationship on keyboard focus', () => {
    const longName = 'A very long folder name exceeding thirty characters';
    mountFluent(
      <Breadcrumb>
        <BreadcrumbItem>
          <Tooltip content={longName} relationship="label">
            <BreadcrumbButton>{truncateBreadcrumbLongName(longName)}</BreadcrumbButton>
          </Tooltip>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('.fui-BreadcrumbButton')
      .should('have.text', `${longName.slice(0, 30)}...`)
      .focus();
    cy.get('[role="tooltip"]').should('be.visible').and('have.text', longName);
    cy.get('.fui-BreadcrumbButton').should($button => expect(computeAccessibleName($button[0])).to.equal(longName));
  });
});

describe('Breadcrumb documented contract', () => {
  it('renders the default named navigation landmark, ordered list and hidden separators', () => {
    mountFluent(<Trail />);
    cy.get('nav').should('have.attr', 'aria-label', 'breadcrumb');
    cy.get('nav > ol').should('have.attr', 'role', 'list');
    cy.get('ol > .fui-BreadcrumbItem').should('have.length', 3);
    cy.get('ol > .fui-BreadcrumbDivider')
      .should('have.length', 2)
      .each($divider => {
        expect($divider).to.have.attr('aria-hidden', 'true');
        expect($divider.find('svg')).to.have.attr('aria-hidden', 'true');
      });
    cy.get('nav').should('not.have.attr', 'tabindex');
    cy.get('nav').should('not.have.attr', 'aria-live');
    cy.get('nav').then($root => {
      const elements = [$root[0], ...Array.from($root[0].querySelectorAll('ol, li, a, button'))];
      const attributes = elements.map(element => ({
        tag: element.tagName.toLowerCase(),
        attributes: Object.fromEntries(
          Array.from(element.attributes).map(attribute => [attribute.name, attribute.value]),
        ),
        accessibleName: computeAccessibleName(element),
      }));
      cy.writeFile(`${Cypress.config('downloadsFolder')}\\Breadcrumb-baseline-attrs.json`, attributes);
    });
  });

  it('preserves explicit landmark labels and consumer labelledby relationships', () => {
    mountFluent(
      <>
        <h2 id="trail-title">Project hierarchy</h2>
        <Trail aria-label="Project" aria-labelledby="trail-title" />
      </>,
    );
    cy.get('nav').should('have.attr', 'aria-label', 'Project').and('have.attr', 'aria-labelledby', 'trail-title');
    cy.get('#trail-title').should('have.text', 'Project hierarchy');
  });

  it('distinguishes native links, buttons and the current page without promoting the root to a button', () => {
    mountFluent(<Trail />);
    cy.contains('a', 'Home').should('have.attr', 'href', '#home').and('not.have.attr', 'aria-current');
    cy.contains('button', 'Library').should('not.have.attr', 'aria-current');
    cy.contains('a', 'Page').should('have.attr', 'aria-current', 'page').and('have.attr', 'aria-disabled', 'true');
    cy.get('nav').should('not.have.attr', 'role');
    cy.get('li[aria-current]').should('not.exist');
  });

  for (const size of ['small', 'medium', 'large'] as const) {
    it(`propagates documented ${size} size to items, buttons, icons and dividers`, () => {
      const height = { small: '24px', medium: '32px', large: '40px' }[size];
      const iconSize = { small: '12px', medium: '16px', large: '20px' }[size];
      mountFluent(<Trail size={size} />);
      cy.contains('button', 'Library').should('have.css', 'height', height);
      cy.get('.fui-Button__icon').should('have.css', 'width', iconSize);
      cy.get('.fui-BreadcrumbDivider').first().should('have.css', 'font-size', iconSize);
      cy.get('.fui-BreadcrumbItem').first().should('have.css', 'display', 'flex');
    });
  }

  it('uses medium size and subtle transparent appearance by default', () => {
    mountFluent(<Trail />);
    cy.contains('button', 'Library').should('have.css', 'height', '32px');
    cy.contains('a', 'Home').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
  });

  it('renders a passive text trail with item-level current-page semantics', () => {
    mountFluent(
      <Breadcrumb>
        <BreadcrumbItem>Home</BreadcrumbItem>
        <BreadcrumbDivider />
        <BreadcrumbItem aria-current="page">Read only</BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.get('li[aria-current="page"]').should('have.text', 'Read only');
    cy.get('nav a, nav button, nav [tabindex]').should('not.exist');
  });

  it('tabs forward and backward through enabled descendants and releases focus at both ends', () => {
    mountFluent(<BreadcrumbSampleWithButton />);
    cy.get('#before').focus();
    for (const id of ['#breadcrumb-button-1', '#breadcrumb-button-2', '#breadcrumb-button-4', '#after']) {
      cy.realPress('Tab');
      cy.get(id).should('be.focused');
    }
    for (const id of ['#breadcrumb-button-4', '#breadcrumb-button-2', '#breadcrumb-button-1', '#before']) {
      cy.realPress(['Shift', 'Tab']);
      cy.get(id).should('be.focused');
    }
  });

  it('uses horizontal circular arrows and releases Tab from the arrow group', () => {
    mountFluent(<BreadcrumbSampleWithButton focusMode="arrow" />);
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#breadcrumb-button-1').should('be.focused');
    cy.realPress('ArrowLeft');
    cy.get('#breadcrumb-button-4').should('be.focused');
    cy.realPress('ArrowDown');
    cy.get('#breadcrumb-button-4').should('be.focused');
    cy.realPress('Tab');
    cy.get('#after').should('be.focused');
  });

  it('activates consumer buttons once per Enter, Space and pointer action', () => {
    const navigate = cy.stub().as('navigate');
    mountFluent(
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbButton onClick={navigate}>Open folder</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.contains('button', 'Open folder').focus();
    cy.realPress('Enter');
    cy.get('@navigate').should('have.been.calledOnce');
    cy.realPress('Space');
    cy.get('@navigate').should('have.been.calledTwice');
    cy.contains('button', 'Open folder').realClick();
    cy.get('@navigate').should('have.been.calledThrice');
  });

  it('preserves consumer navigation and prevented native link activation', () => {
    const navigate = cy.stub().as('navigate');
    mountFluent(
      <Breadcrumb onClick={event => navigate(event.defaultPrevented)}>
        <BreadcrumbItem>
          <BreadcrumbButton href="#consumer-route" onClick={event => event.preventDefault()}>
            Route
          </BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    cy.contains('a', 'Route').focus();
    cy.realPress('Enter');
    cy.get('@navigate').should('have.been.calledOnceWith', true);
    cy.contains('a', 'Route').realClick();
    cy.get('@navigate').should('have.been.calledTwice');
    cy.location('hash').should('not.eq', '#consumer-route');
  });

  it('isolates nested, adjacent and outside size contexts', () => {
    mountFluent(
      <>
        <SizeProbe id="outside-size" />
        <Breadcrumb size="small">
          <SizeProbe id="outer-size" />
          <Breadcrumb size="large">
            <SizeProbe id="inner-size" />
          </Breadcrumb>
          <SizeProbe id="restored-size" />
        </Breadcrumb>
        <Breadcrumb>
          <SizeProbe id="adjacent-size" />
        </Breadcrumb>
      </>,
    );
    for (const [id, size] of [
      ['outside-size', 'medium'],
      ['outer-size', 'small'],
      ['inner-size', 'large'],
      ['restored-size', 'small'],
      ['adjacent-size', 'medium'],
    ]) {
      cy.get(`#${id}`).should('have.text', size);
    }
  });
});
