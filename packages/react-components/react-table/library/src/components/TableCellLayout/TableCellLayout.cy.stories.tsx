import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme, webDarkTheme } from '@fluentui/react-theme';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '../../index';
import { TableCellLayout } from './TableCellLayout';
import type { TableCellLayoutProps } from './TableCellLayout.types';
import { Avatar } from '@fluentui/react-avatar';
import { DocumentRegular } from '@fluentui/react-icons';
import { Default } from '../../../../stories/src/Table/Default.stories';
import { PrimaryCell } from '../../../../stories/src/Table/PrimaryCell.stories';
import { SizeSmall } from '../../../../stories/src/Table/SizeSmall.stories';
import { SizeExtraSmall } from '../../../../stories/src/Table/SizeExtraSmall.stories';
import { ResizableColumnsUncontrolled } from '../../../../stories/src/Table/ResizableColumnsUncontrolled.stories';
import { computeAccessibleName } from 'dom-accessibility-api';
import * as axe from 'axe-core';
import type { SlotRenderFunction } from '@fluentui/react-utilities';

const render = (children: React.ReactNode, dir: 'ltr' | 'rtl' = 'ltr') =>
  mount(
    <FluentProvider theme={webLightTheme} dir={dir}>
      {children}
    </FluentProvider>,
  );
const layout = (props: TableCellLayoutProps = {}) =>
  render(
    <TableCellLayout id="layout" {...props}>
      Main text
    </TableCellLayout>,
  );
const header = (
  <TableHeader>
    <TableRow>
      <TableHeaderCell>Name</TableHeaderCell>
      <TableHeaderCell>Details</TableHeaderCell>
    </TableRow>
  </TableHeader>
);

describe('TableCellLayout documented presentation contracts', () => {
  it('renders complete default story media/main slots without inventing secondary text', () => {
    render(<Default />);
    cy.get('tbody .fui-TableCellLayout').first().find('.fui-TableCellLayout__media svg').should('be.visible');
    cy.get('tbody .fui-TableCellLayout')
      .first()
      .find('.fui-TableCellLayout__main')
      .should('have.text', 'Meeting notes');
    cy.get('tbody .fui-TableCellLayout').first().find('.fui-TableCellLayout__description').should('not.exist');
  });

  it('uses the documented primary-cell emphasis, description and larger media', () => {
    render(<PrimaryCell />);
    cy.get('tbody tr')
      .first()
      .find('.fui-TableCellLayout')
      .first()
      .within(() => {
        cy.get('.fui-TableCellLayout__main').should('have.css', 'font-weight', '600').and('have.text', 'Meeting notes');
        cy.get('.fui-TableCellLayout__media').should('have.css', 'font-size', '24px');
        cy.get('.fui-TableCellLayout__description')
          .should('have.text', 'My Organization')
          .and('have.css', 'font-size', '12px');
      });
  });

  it('inherits documented compact avatar and media-icon sizing independently', () => {
    render(
      <>
        <SizeSmall />
        <SizeExtraSmall />
      </>,
    );
    cy.get('tbody')
      .eq(0)
      .find('.fui-Avatar')
      .first()
      .should($node => expect($node[0].getBoundingClientRect().height).to.equal(24));
    cy.get('tbody')
      .eq(1)
      .find('.fui-Avatar')
      .first()
      .should($node => expect($node[0].getBoundingClientRect().height).to.equal(20));
    cy.get('tbody').eq(0).find('.fui-TableCellLayout__media').first().should('have.css', 'font-size', '20px');
    cy.get('tbody').eq(1).find('.fui-TableCellLayout__media').first().should('have.css', 'font-size', '16px');
  });

  it('applies actual ellipsis in the documented resizable-column layouts without losing complete DOM text', () => {
    render(<ResizableColumnsUncontrolled />);
    cy.get('tbody .fui-TableCellLayout__main')
      .first()
      .should('have.css', 'text-overflow', 'ellipsis')
      .and('have.css', 'white-space', 'nowrap')
      .and('have.text', 'Meeting notes');
    cy.get('tbody .fui-TableCellLayout').first().should('have.css', 'overflow-x', 'hidden');
  });
});

describe('TableCellLayout content and native boundary contracts', () => {
  it('renders numeric zero children as actual main text instead of treating them as absent', () => {
    render(<TableCellLayout id="layout">{0}</TableCellLayout>);
    cy.get('#layout .fui-TableCellLayout__main').should('have.text', '0');
  });

  it('renders an explicitly supplied main slot when root children are absent', () => {
    render(<TableCellLayout id="layout" main="Main slot" />);
    cy.get('#layout .fui-TableCellLayout__main').should('have.text', 'Main slot');
  });

  it('gives explicit main-slot content precedence over its default root children', () => {
    layout({ main: 'Override' });
    cy.get('.fui-TableCellLayout__main').should('have.text', 'Override');
    cy.get('#layout').should('not.contain.text', 'Main text');
  });

  it('renders description-only content and permits an explicitly disabled content wrapper', () => {
    render(
      <>
        <TableCellLayout id="description" description="Details" />
        <TableCellLayout id="disabled-content" content={null} media={<DocumentRegular />} description="Hidden">
          Hidden main
        </TableCellLayout>
      </>,
    );
    cy.get('#description .fui-TableCellLayout__description').should('have.text', 'Details');
    cy.get('#disabled-content .fui-TableCellLayout__content').should('not.exist');
    cy.get('#disabled-content .fui-TableCellLayout__media').should('be.visible');
    cy.get('#disabled-content').should('not.contain.text', 'Hidden');
  });

  it('measures actual bounded truncation while retaining complete text in the DOM and accessible cell name', () => {
    const text = 'A long cell label that must exceed its constrained available width';
    render(
      <Table aria-label="Items" style={{ tableLayout: 'fixed', width: '220px' }}>
        {header}
        <TableBody>
          <TableRow>
            <TableCell>
              <TableCellLayout id="layout" truncate media={<DocumentRegular />}>
                {text}
              </TableCellLayout>
            </TableCell>
            <TableCell>Other</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    cy.get('.fui-TableCellLayout__main')
      .should('have.css', 'text-overflow', 'ellipsis')
      .should($node => {
        expect($node[0].scrollWidth).to.be.greaterThan($node[0].clientWidth);
        expect($node.text()).to.equal(text);
        const cell = $node[0].closest('td');
        if (!cell) {
          throw new Error('Truncated layout has no native cell');
        }
        expect(computeAccessibleName(cell)).to.equal(text);
        expect($node[0].getBoundingClientRect().right).to.be.at.most(cell.getBoundingClientRect().right);
      });
  });

  it('leaves truncation optional and updates its exact native styles on the same layout', () => {
    const Owner = () => {
      const [truncate, setTruncate] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setTruncate(value => !value)}>
            Update
          </button>
          <TableCellLayout id="layout" truncate={truncate} style={{ width: '100px' }}>
            A long cell label that overflows
          </TableCellLayout>
        </>
      );
    };
    render(<Owner />);
    cy.get('#layout').then($original => {
      cy.get('.fui-TableCellLayout__main').should('not.have.css', 'text-overflow', 'ellipsis');
      cy.get('#update').realClick();
      cy.get('.fui-TableCellLayout__main')
        .should('have.css', 'text-overflow', 'ellipsis')
        .and('have.css', 'white-space', 'nowrap');
      cy.get('#layout').should($current => expect($current[0]).to.equal($original[0]));
      cy.get('#update').realClick();
      cy.get('.fui-TableCellLayout__main').should('not.have.css', 'text-overflow', 'ellipsis');
    });
  });

  it('preserves descendant native tab/click behavior without introducing layout-level keyboard actions', () => {
    const click = cy.spy().as('click');
    const bubble = cy.spy().as('bubble');
    render(
      <>
        <button id="before">Before</button>
        <TableCellLayout id="layout" onClick={bubble}>
          <button id="action" type="button" onClick={click}>
            Action
          </button>
        </TableCellLayout>
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#action').should('have.focus');
    cy.realPress('Enter');
    cy.get('@click').should('have.been.calledOnce');
    cy.get('@bubble').should('have.been.calledOnce');
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
  });

  for (const dir of ['ltr', 'rtl'] as const) {
    it(`lays out media and text in the logical ${dir} order without overlapping their hit boxes`, () => {
      render(
        <TableCellLayout id="layout" media={{ id: 'media', children: <DocumentRegular /> }}>
          Main text
        </TableCellLayout>,
        dir,
      );
      cy.get('#media').then($media =>
        cy.get('.fui-TableCellLayout__content').should($content => {
          const media = $media[0].getBoundingClientRect();
          const content = $content[0].getBoundingClientRect();
          expect(Math.min(media.right, content.right) - Math.max(media.left, content.left)).to.be.at.most(0);
          expect(content.left > media.left).to.equal(dir === 'ltr');
        }),
      );
    });
  }

  it('passes ordinary axe rules when content and media live in a complete named semantic table', () => {
    render(
      <Table id="table" aria-label="Items">
        {header}
        <TableBody>
          <TableRow>
            <TableCell>
              <TableCellLayout media={<DocumentRegular />} description="Details">
                Main text
              </TableCellLayout>
            </TableCell>
            <TableCell>Other</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    cy.get('#table').then($node =>
      axe.run($node[0]).then(result => expect(result.violations, JSON.stringify(result.violations)).to.deep.equal([])),
    );
  });
});

describe('TableCellLayout source and conformance lifecycle contracts', () => {
  it('forwards root and every populated slot class/metadata while keeping the content slot off the root DOM', () => {
    layout({
      className: 'custom-layout',
      title: 'Layout',
      media: { id: 'media', className: 'custom-media', children: <DocumentRegular /> },
      main: { id: 'main', className: 'custom-main', children: 'Override', title: 'Main' },
      description: { id: 'description', className: 'custom-description', children: 'Details' },
      content: { id: 'content', className: 'custom-content', title: 'Content wrapper' },
    });
    cy.get('#layout')
      .should('have.class', 'fui-TableCellLayout')
      .and('have.class', 'custom-layout')
      .and('have.attr', 'title', 'Layout');
    cy.get('#layout').should('not.have.attr', 'content');
    cy.get('#media').should('have.class', 'fui-TableCellLayout__media').and('have.class', 'custom-media');
    cy.get('#main')
      .should('have.class', 'fui-TableCellLayout__main')
      .and('have.class', 'custom-main')
      .and('have.text', 'Override');
    cy.get('#description')
      .should('have.class', 'fui-TableCellLayout__description')
      .and('have.class', 'custom-description');
    cy.get('#content')
      .should('have.class', 'fui-TableCellLayout__content')
      .and('have.class', 'custom-content')
      .and('have.attr', 'title', 'Content wrapper');
  });

  it('forwards independent root and main-slot object refs and clears them after committed removal', () => {
    const rootRef = React.createRef<HTMLDivElement>();
    const mainRef = React.createRef<HTMLSpanElement>();
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          {show && (
            <TableCellLayout id="layout" ref={rootRef} main={{ id: 'main', ref: mainRef }}>
              Main text
            </TableCellLayout>
          )}
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#layout').should($node => expect(rootRef.current).to.equal($node[0]));
    cy.get('#main').should($node => expect(mainRef.current).to.equal($node[0]));
    cy.get('#remove').realClick();
    cy.get('#layout')
      .should('not.exist')
      .then(() => {
        expect(rootRef.current).to.equal(null);
        expect(mainRef.current).to.equal(null);
      });
  });

  it('forwards callback refs to the actual layout and its unmount cleanup', () => {
    const ref = cy.spy().as('ref');
    const Owner = () => {
      const [show, setShow] = React.useState(true);
      return (
        <>
          {show && (
            <TableCellLayout id="layout" ref={ref}>
              Main text
            </TableCellLayout>
          )}
          <button id="remove" onClick={() => setShow(false)}>
            Remove
          </button>
        </>
      );
    };
    render(<Owner />);
    cy.get('#layout').then($node => cy.get('@ref').its('lastCall.args.0').should('equal', $node[0]));
    cy.get('#remove').realClick();
    cy.get('#layout').should('not.exist');
    cy.get('@ref').its('lastCall.args.0').should('be.null');
  });

  it('updates media/description/main slots on the same layout and honors explicit slot removal', () => {
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(value => !value)}>
            Update
          </button>
          <TableCellLayout
            id="layout"
            media={updated ? <DocumentRegular /> : null}
            description={updated ? 'Details' : null}
            main={updated ? 'Override' : undefined}
          >
            Main text
          </TableCellLayout>
        </>
      );
    };
    render(<Owner />);
    cy.get('#layout').then($original => {
      cy.get('.fui-TableCellLayout__media').should('not.exist');
      cy.get('#update').realClick();
      cy.get('#layout').should($node => expect($node[0]).to.equal($original[0]));
      cy.get('.fui-TableCellLayout__main').should('have.text', 'Override');
      cy.get('.fui-TableCellLayout__media').should('be.visible');
      cy.get('.fui-TableCellLayout__description').should('have.text', 'Details');
      cy.get('#update').realClick();
      cy.get('.fui-TableCellLayout__main').should('have.text', 'Main text');
      cy.get('.fui-TableCellLayout__media').should('not.exist');
      cy.get('.fui-TableCellLayout__description').should('not.exist');
    });
  });

  it('updates inherited avatar sizing and primary appearance while preserving the layout node', () => {
    const Owner = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <button id="update" onClick={() => setUpdated(value => !value)}>
            Update
          </button>
          <Table size={updated ? 'extra-small' : 'medium'} aria-label="Items">
            {header}
            <TableBody>
              <TableRow>
                <TableCell>
                  <TableCellLayout
                    id="layout"
                    appearance={updated ? 'primary' : undefined}
                    media={<Avatar name="Person" />}
                  >
                    Person
                  </TableCellLayout>
                </TableCell>
                <TableCell>Other</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      );
    };
    render(<Owner />);
    cy.get('#layout').then($original => {
      cy.get('.fui-Avatar').should($node => expect($node[0].getBoundingClientRect().height).to.equal(32));
      cy.get('#update').realClick();
      cy.get('#layout').should($node => expect($node[0]).to.equal($original[0]));
      cy.get('.fui-Avatar').should($node => expect($node[0].getBoundingClientRect().height).to.equal(20));
      cy.get('.fui-TableCellLayout__main').should('have.css', 'font-weight', '600');
      cy.get('.fui-TableCellLayout__media').should('have.css', 'font-size', '24px');
    });
  });

  it('preserves explicit avatar size over the inherited layout default', () => {
    layout({ media: <Avatar name="Person" size={40} /> });
    cy.get('.fui-Avatar').should($node => expect($node[0].getBoundingClientRect().height).to.equal(40));
  });

  it('lets the caller replace content rendering while retaining actual main/description child slots', () => {
    const renderContent: SlotRenderFunction<React.ComponentProps<'div'>> = (Component, props) => (
      <Component {...props} data-custom="content">
        <span id="before-content">Before</span>
        {props.children}
      </Component>
    );
    layout({
      description: 'Details',
      content: {
        children: renderContent,
      },
    });
    cy.get('[data-custom="content"]').should('have.class', 'fui-TableCellLayout__content');
    cy.get('#before-content').should('have.text', 'Before');
    cy.get('.fui-TableCellLayout__main').should('have.text', 'Main text');
    cy.get('.fui-TableCellLayout__description').should('have.text', 'Details');
  });

  it('reflects exact provider description colors without losing layout identity', () => {
    const color = (value: string) => {
      const probe = document.createElement('span');
      probe.style.color = value;
      return probe.style.color;
    };
    const Owner = () => {
      const [dark, setDark] = React.useState(false);
      return (
        <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
          <button id="update" onClick={() => setDark(true)}>
            Update
          </button>
          <TableCellLayout id="layout" description="Details">
            Main text
          </TableCellLayout>
        </FluentProvider>
      );
    };
    mount(<Owner />);
    cy.get('.fui-TableCellLayout__description').should(
      'have.css',
      'color',
      color(webLightTheme.colorNeutralForeground2),
    );
    cy.get('#layout').then($original => {
      cy.get('#update').realClick();
      cy.get('#layout').should($node => expect($node[0]).to.equal($original[0]));
      cy.get('.fui-TableCellLayout__description').should(
        'have.css',
        'color',
        color(webDarkTheme.colorNeutralForeground2),
      );
    });
  });
});
