import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import { makeStyles } from '@griffel/react';
import { getByRole } from '@testing-library/dom';
import type { TextProps } from './Text.types';
import type { SlotRenderFunction } from '@fluentui/react-utilities';
import {
  Text,
  Body1,
  Body1Strong,
  Body1Stronger,
  Body2,
  Caption1,
  Caption1Strong,
  Caption1Stronger,
  Caption2,
  Caption2Strong,
  Display,
  LargeTitle,
  Subtitle1,
  Subtitle2,
  Subtitle2Stronger,
  Title1,
  Title2,
  Title3,
} from '../../index';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
const text = () => cy.get('[data-testid="text"]');
const longText = 'Complete text remains available even when the visible content is clipped. '.repeat(8);
const sizes = [
  [100, 'fontSizeBase100', 'lineHeightBase100'],
  [200, 'fontSizeBase200', 'lineHeightBase200'],
  [300, 'fontSizeBase300', 'lineHeightBase300'],
  [400, 'fontSizeBase400', 'lineHeightBase400'],
  [500, 'fontSizeBase500', 'lineHeightBase500'],
  [600, 'fontSizeBase600', 'lineHeightBase600'],
  [700, 'fontSizeHero700', 'lineHeightHero700'],
  [800, 'fontSizeHero800', 'lineHeightHero800'],
  [900, 'fontSizeHero900', 'lineHeightHero900'],
  [1000, 'fontSizeHero1000', 'lineHeightHero1000'],
] as const;
const presets = [
  [Body1, 'Body1', 'fontSizeBase300', 'lineHeightBase300', 'fontWeightRegular'],
  [Body1Strong, 'Body1Strong', 'fontSizeBase300', 'lineHeightBase300', 'fontWeightSemibold'],
  [Body1Stronger, 'Body1Stronger', 'fontSizeBase300', 'lineHeightBase300', 'fontWeightBold'],
  [Body2, 'Body2', 'fontSizeBase400', 'lineHeightBase400', 'fontWeightRegular'],
  [Caption1, 'Caption1', 'fontSizeBase200', 'lineHeightBase200', 'fontWeightRegular'],
  [Caption1Strong, 'Caption1Strong', 'fontSizeBase200', 'lineHeightBase200', 'fontWeightSemibold'],
  [Caption1Stronger, 'Caption1Stronger', 'fontSizeBase200', 'lineHeightBase200', 'fontWeightBold'],
  [Caption2, 'Caption2', 'fontSizeBase100', 'lineHeightBase100', 'fontWeightRegular'],
  [Caption2Strong, 'Caption2Strong', 'fontSizeBase100', 'lineHeightBase100', 'fontWeightSemibold'],
  [Subtitle1, 'Subtitle1', 'fontSizeBase500', 'lineHeightBase500', 'fontWeightSemibold'],
  [Subtitle2, 'Subtitle2', 'fontSizeBase400', 'lineHeightBase400', 'fontWeightSemibold'],
  [Subtitle2Stronger, 'Subtitle2Stronger', 'fontSizeBase400', 'lineHeightBase400', 'fontWeightBold'],
  [Title1, 'Title1', 'fontSizeHero800', 'lineHeightHero800', 'fontWeightSemibold'],
  [Title2, 'Title2', 'fontSizeHero700', 'lineHeightHero700', 'fontWeightSemibold'],
  [Title3, 'Title3', 'fontSizeBase600', 'lineHeightBase600', 'fontWeightSemibold'],
  [LargeTitle, 'LargeTitle', 'fontSizeHero900', 'lineHeightHero900', 'fontWeightSemibold'],
  [Display, 'Display', 'fontSizeHero1000', 'lineHeightHero1000', 'fontWeightSemibold'],
] as const;

describe('Text documented contracts', () => {
  it('renders read-only inline content with the default typography', () => {
    mount(<Text data-testid="text">Read-only content</Text>);
    text()
      .should('have.prop', 'tagName', 'SPAN')
      .and('have.text', 'Read-only content')
      .and('have.css', 'display', 'inline')
      .and('have.css', 'white-space', 'normal')
      .and('have.css', 'overflow', 'visible')
      .and('have.css', 'text-overflow', 'clip')
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
      .and('have.css', 'line-height', teamsLightTheme.lineHeightBase300)
      .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular))
      .and('have.css', 'text-align', 'start');
    text().should('not.have.attr', 'tabindex');
    text().should('not.have.attr', 'role');
  });

  describe('Text supported edges and accessibility', () => {
    it('updates content, heading level and accessible-name overrides', () => {
      const Example = () => {
        const [updated, setUpdated] = React.useState(false);
        const [labelled, setLabelled] = React.useState(true);
        return (
          <>
            <button onClick={() => setUpdated(true)}>Update heading</button>
            <button onClick={() => setLabelled(false)}>Remove name override</button>
            <Text
              data-testid="text"
              as={updated ? 'h3' : 'h2'}
              aria-label={labelled ? (updated ? 'Updated name' : 'Initial name') : undefined}
            >
              {updated ? 'Updated content' : 'Initial content'}
            </Text>
          </>
        );
      };
      mount(<Example />);
      cy.get('h2[aria-label="Initial name"]').should('have.text', 'Initial content');
      cy.get('[data-cy-root]').should(root => {
        expect(getByRole(root[0], 'heading', { level: 2, name: 'Initial name' })).to.have.text('Initial content');
      });
      cy.contains('button', 'Update heading').click();
      cy.get('h3[aria-label="Updated name"]').should('have.text', 'Updated content');
      cy.get('h2').should('not.exist');
      cy.get('[data-cy-root]').should(root => {
        expect(getByRole(root[0], 'heading', { level: 3, name: 'Updated name' })).to.have.text('Updated content');
      });
      cy.contains('button', 'Remove name override').click();
      cy.get('[data-cy-root]').should(root => {
        expect(getByRole(root[0], 'heading', { level: 3, name: 'Updated content' })).to.have.text('Updated content');
      });
    });

    it('provides complete truncated text to a description relationship and updates it', () => {
      const Example = () => {
        const [description, setDescription] = React.useState(longText);
        return (
          <>
            <button aria-describedby="text-description" onClick={() => setDescription('Updated complete description')}>
              Read description
            </button>
            <Text
              id="text-description"
              data-testid="text"
              block
              truncate
              wrap={false}
              style={{ width: tokens.spacingHorizontalXXXL }}
            >
              {description}
            </Text>
          </>
        );
      };
      mount(<Example />);
      cy.contains('button', 'Read description').should('have.attr', 'aria-describedby', 'text-description');
      cy.get('#text-description').should('have.text', longText).and('be.visible');
      cy.get('[data-cy-root]').should(root => {
        expect(getByRole(root[0], 'button', { name: 'Read description', description: longText.trim() })).to.have.attr(
          'aria-describedby',
          'text-description',
        );
      });
      text().should(element => {
        expect(element[0].scrollWidth).to.be.greaterThan(element[0].clientWidth);
        expect(element[0].hasAttribute('aria-hidden')).to.equal(false);
      });
      cy.contains('button', 'Read description').click();
      cy.get('#text-description').should('have.text', 'Updated complete description');
      cy.contains('button', 'Read description').should('have.attr', 'aria-describedby', 'text-description');
      cy.get('[data-cy-root]').should(root => {
        expect(
          getByRole(root[0], 'button', { name: 'Read description', description: 'Updated complete description' }),
        ).to.have.attr('aria-describedby', 'text-description');
      });
    });

    it('does not add a tab stop to read-only text', () => {
      mount(
        <>
          <button>Before</button>
          <Text>Read-only</Text>
          <button>After</button>
        </>,
      );
      cy.contains('button', 'Before').focus().realPress('Tab');
      cy.contains('button', 'After').should('be.focused').realPress(['Shift', 'Tab']);
      cy.contains('button', 'Before').should('be.focused');
    });

    it('forwards native focus, keyboard and click events without inventing button activation', () => {
      const onFocus = cy.spy().as('focus');
      const onKeyDown = cy.spy().as('key');
      const onClick = cy.spy().as('click');
      const Example = () => {
        const [focusable, setFocusable] = React.useState(true);
        return (
          <>
            <button>Before</button>
            <Text
              data-testid="text"
              tabIndex={focusable ? 0 : undefined}
              onFocus={onFocus}
              onKeyDown={onKeyDown}
              onClick={onClick}
            >
              Focusable content
            </Text>
            <button>After</button>
            <button onClick={() => setFocusable(false)}>Remove tab stop</button>
          </>
        );
      };
      mount(<Example />);
      cy.contains('button', 'Before').focus().realPress('Tab');
      text().should('be.focused');
      cy.get('@focus').should('have.been.calledOnce');
      text().realPress('Enter');
      cy.get('@key').should('have.been.calledOnce').its('firstCall.args.0.key').should('equal', 'Enter');
      cy.get('@click').should('not.have.been.called');
      text().click();
      cy.get('@click').should('have.been.calledOnce');
      text().realPress('Tab');
      cy.contains('button', 'After').should('be.focused').realPress(['Shift', 'Tab']);
      text().should('be.focused');
      cy.contains('button', 'Remove tab stop').click();
      cy.contains('button', 'Before').focus().realPress('Tab');
      cy.contains('button', 'After').should('be.focused');
    });

    it('forwards explicit ARIA roles and live-region changes without hiding content', () => {
      const Example = () => {
        const [message, setMessage] = React.useState('Waiting');
        return (
          <>
            <button onClick={() => setMessage('Completed')}>Complete</button>
            <Text role="status" aria-live="polite" aria-atomic="true">
              {message}
            </Text>
          </>
        );
      };
      mount(<Example />);
      cy.get('[role="status"]').should('have.text', 'Waiting').and('be.visible');
      cy.contains('button', 'Complete').click();
      cy.get('[role="status"]').should('have.text', 'Completed');
      cy.get('[role="status"]').should('have.attr', 'aria-live', 'polite');
      cy.get('[role="status"]').should('have.attr', 'aria-atomic', 'true');
    });

    it('handles empty and nested children and their updates without losing descendant behavior', () => {
      const onClick = cy.spy().as('childClick');
      const Example = () => {
        const [empty, setEmpty] = React.useState(true);
        return (
          <>
            <button onClick={() => setEmpty(false)}>Populate</button>
            <Text data-testid="text">
              {empty ? null : (
                <>
                  Nested <em>emphasis</em>
                  <button onClick={onClick}>Child</button>
                </>
              )}
            </Text>
          </>
        );
      };
      mount(<Example />);
      text().should('have.text', '');
      cy.contains('button', 'Populate').click();
      text().should('have.text', 'Nested emphasisChild');
      text().find('em').should('have.text', 'emphasis');
      text().contains('button', 'Child').focus().realPress('Enter');
      cy.get('@childClick').should('have.been.calledOnce');
    });

    it('does not force clipping or nowrap when truncate is used alone', () => {
      mount(
        <Text data-testid="text" truncate>
          {longText}
        </Text>,
      );
      text()
        .should('have.css', 'text-overflow', 'ellipsis')
        .and('have.css', 'white-space', 'normal')
        .and('have.css', 'overflow', 'visible')
        .and('have.css', 'display', 'inline')
        .and('have.text', longText);
    });

    it('resolves overridden theme tokens instead of hardcoded typography', () => {
      mountBase(
        <FluentProvider
          theme={{
            ...teamsLightTheme,
            fontSizeBase300: teamsLightTheme.fontSizeBase500,
            lineHeightBase300: teamsLightTheme.lineHeightBase500,
            fontWeightRegular: teamsLightTheme.fontWeightBold,
            fontFamilyBase: teamsLightTheme.fontFamilyMonospace,
          }}
        >
          <Text data-testid="text">Custom theme</Text>
          <span data-testid="reference" style={{ fontFamily: tokens.fontFamilyMonospace }}>
            Reference
          </span>
        </FluentProvider>,
      );
      text()
        .should('have.css', 'font-size', teamsLightTheme.fontSizeBase500)
        .and('have.css', 'line-height', teamsLightTheme.lineHeightBase500)
        .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightBold));
      cy.get('[data-testid="reference"]')
        .invoke('css', 'font-family')
        .then(expected => {
          text().should('have.css', 'font-family', expected);
        });
    });

    (['start', 'end'] as const).forEach(align => {
      it(`keeps ${align} alignment logical under an RTL provider`, () => {
        mountBase(
          <FluentProvider theme={teamsLightTheme} dir="rtl">
            <Text data-testid="text" block align={align}>
              RTL content
            </Text>
          </FluentProvider>,
        );
        text()
          .should('have.css', 'direction', 'rtl')
          .and('have.css', 'text-align', align)
          .and('have.text', 'RTL content');
      });
    });
  });

  sizes.forEach(([size, fontSize, lineHeight]) => {
    it(`resolves size ${size} and its line height from theme tokens`, () => {
      mount(
        <Text data-testid="text" size={size}>
          Typography
        </Text>,
      );
      text()
        .should('have.css', 'font-size', teamsLightTheme[fontSize])
        .and('have.css', 'line-height', teamsLightTheme[lineHeight]);
    });
  });

  (['base', 'numeric', 'monospace'] as const).forEach(font => {
    const fontToken = {
      base: tokens.fontFamilyBase,
      numeric: tokens.fontFamilyNumeric,
      monospace: tokens.fontFamilyMonospace,
    };
    it(`resolves the ${font} font from the provider`, () => {
      mount(
        <>
          <span data-testid="reference" style={{ fontFamily: fontToken[font] }}>
            Reference
          </span>
          <Text data-testid="text" font={font}>
            Typography
          </Text>
        </>,
      );
      cy.get('[data-testid="reference"]')
        .invoke('css', 'font-family')
        .then(expected => {
          text().should('have.css', 'font-family', expected);
        });
    });
  });

  (
    [
      ['regular', 'fontWeightRegular'],
      ['medium', 'fontWeightMedium'],
      ['semibold', 'fontWeightSemibold'],
      ['bold', 'fontWeightBold'],
    ] as const
  ).forEach(([weight, token]) => {
    it(`resolves the ${weight} weight from theme tokens`, () => {
      mount(
        <Text data-testid="text" weight={weight}>
          Typography
        </Text>,
      );
      text().should('have.css', 'font-weight', String(teamsLightTheme[token]));
    });
  });

  (['start', 'center', 'end', 'justify'] as const).forEach(align => {
    it(`supports ${align} alignment in a block container`, () => {
      mount(
        <Text data-testid="text" block align={align}>
          {longText}
        </Text>,
      );
      text().should('have.css', 'text-align', align).and('have.text', longText);
    });
  });

  (
    [
      ['italic', { italic: true }, 'font-style', 'italic'],
      ['underline', { underline: true }, 'text-decoration-line', 'underline'],
      ['strikethrough', { strikethrough: true }, 'text-decoration-line', 'line-through'],
    ] as const
  ).forEach(([name, props, property, expected]) => {
    it(`supports ${name} without changing the content`, () => {
      mount(
        <Text data-testid="text" {...props}>
          Read-only content
        </Text>,
      );
      text().should('have.css', property, expected).and('have.text', 'Read-only content');
    });
  });

  it('wraps long block text and clips it on one line when wrapping is disabled', () => {
    const Example = () => {
      const [wrap, setWrap] = React.useState(true);
      return (
        <>
          <button onClick={() => setWrap(value => !value)}>Toggle wrapping</button>
          <Text data-testid="text" block wrap={wrap} style={{ width: tokens.spacingHorizontalXXXL }}>
            {longText}
          </Text>
        </>
      );
    };
    mount(<Example />);
    text().should('have.css', 'white-space', 'normal').and('have.css', 'overflow', 'visible');
    text().should(element => {
      expect(element[0].getBoundingClientRect().height).to.be.greaterThan(
        parseFloat(teamsLightTheme.lineHeightBase300),
      );
    });
    cy.contains('button', 'Toggle wrapping').click();
    text().should('have.css', 'white-space', 'nowrap').and('have.css', 'overflow', 'hidden');
    text().should(element => {
      expect(element[0].scrollWidth).to.be.greaterThan(element[0].clientWidth);
      expect(element[0].getBoundingClientRect().height).to.equal(parseFloat(teamsLightTheme.lineHeightBase300));
    });
  });

  it('truncates overflowing block text without removing the complete content', () => {
    mount(
      <Text data-testid="text" block truncate wrap={false} style={{ width: tokens.spacingHorizontalXXXL }}>
        {longText}
      </Text>,
    );
    text()
      .should('have.css', 'display', 'block')
      .and('have.css', 'white-space', 'nowrap')
      .and('have.css', 'overflow', 'hidden')
      .and('have.css', 'text-overflow', 'ellipsis')
      .and('have.text', longText)
      .and('not.have.attr', 'aria-hidden');
    text().should(element => {
      expect(element[0].scrollWidth).to.be.greaterThan(element[0].clientWidth);
    });
  });

  presets.forEach(([Preset, name, fontSize, lineHeight, weight]) => {
    it(`renders ${name} with its fixed typography and shared Text props`, () => {
      mount(
        <>
          <Preset data-testid="text" block italic underline align="center">
            {name}
          </Preset>
          <span data-testid="reference" style={{ fontFamily: tokens.fontFamilyBase }}>
            Reference
          </span>
        </>,
      );
      text()
        .should('have.prop', 'tagName', 'SPAN')
        .and('have.text', name)
        .and('have.css', 'font-size', teamsLightTheme[fontSize])
        .and('have.css', 'line-height', teamsLightTheme[lineHeight])
        .and('have.css', 'font-weight', String(teamsLightTheme[weight]))
        .and('have.css', 'font-style', 'italic')
        .and('have.css', 'text-decoration-line', 'underline')
        .and('have.css', 'display', 'block')
        .and('have.css', 'text-align', 'center');
      cy.get('[data-testid="reference"]')
        .invoke('css', 'font-family')
        .then(expected => {
          text().should('have.css', 'font-family', expected);
        });
    });

    it(`resolves customized provider typography tokens for ${name}`, () => {
      const customTheme = {
        ...teamsLightTheme,
        [fontSize]:
          fontSize === 'fontSizeHero1000' ? teamsLightTheme.fontSizeBase400 : teamsLightTheme.fontSizeHero1000,
        [lineHeight]:
          lineHeight === 'lineHeightHero1000' ? teamsLightTheme.lineHeightBase400 : teamsLightTheme.lineHeightHero1000,
        [weight]: weight === 'fontWeightRegular' ? teamsLightTheme.fontWeightBold : teamsLightTheme.fontWeightRegular,
        fontFamilyBase: teamsLightTheme.fontFamilyMonospace,
      };
      mountBase(
        <FluentProvider theme={customTheme}>
          <Preset data-testid="text">{name}</Preset>
          <span data-testid="reference" style={{ fontFamily: tokens.fontFamilyBase }}>
            Reference
          </span>
        </FluentProvider>,
      );
      text()
        .should('have.css', 'font-size', customTheme[fontSize])
        .and('have.css', 'line-height', customTheme[lineHeight])
        .and('have.css', 'font-weight', String(customTheme[weight]));
      cy.get('[data-testid="reference"]')
        .invoke('css', 'font-family')
        .then(expected => {
          text().should('have.css', 'font-family', expected);
        });
    });
  });

  (['span', 'p', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i'] as const).forEach(as => {
    it(`preserves the semantic ${as} element and its content`, () => {
      mount(
        <Text data-testid="text" as={as}>
          Semantic content
        </Text>,
      );
      text().should('have.prop', 'tagName', as.toUpperCase()).and('have.text', 'Semantic content');
    });
  });

  it('supports semantic headings on presets without changing their typography', () => {
    mount(
      <>
        <Subtitle1 as="h1">Page title</Subtitle1>
        <Subtitle2 as="h2">Section title</Subtitle2>
        <Text as="p">Paragraph</Text>
      </>,
    );
    cy.contains('h1', 'Page title').should('have.css', 'font-size', teamsLightTheme.fontSizeBase500);
    cy.contains('h2', 'Section title').should('have.css', 'font-size', teamsLightTheme.fontSizeBase400);
    cy.contains('p', 'Paragraph').should('have.css', 'font-size', teamsLightTheme.fontSizeBase300);
  });
});

describe('Text unit-derived regressions', () => {
  (
    [
      [Text, 'Text', 'fontSizeBase300', 'lineHeightBase300', 'fontWeightRegular'],
      [Display, 'Display', 'fontSizeHero1000', 'lineHeightHero1000', 'fontWeightSemibold'],
    ] as const
  ).forEach(([Component, name, fontSize, lineHeight, weight]) => {
    it(`preserves generated root props and updated content in ${name} render-function children`, () => {
      const onClick = cy.spy().as('renderedClick');
      const Example = () => {
        const [message, setMessage] = React.useState('Initial callback content');
        const render: SlotRenderFunction<React.HTMLAttributes<HTMLElement>> = (Root, props) => (
          <Root {...props}>
            <span>{message}</span>
          </Root>
        );
        return (
          <>
            <button onClick={() => setMessage('Updated callback content')}>Update callback</button>
            <Component
              data-testid="text"
              as="h2"
              aria-label={message}
              title="Native callback title"
              italic
              onClick={onClick}
            >
              {render}
            </Component>
          </>
        );
      };
      mount(<Example />);
      text()
        .should('have.prop', 'tagName', 'H2')
        .and('have.text', 'Initial callback content')
        .and('have.css', 'font-size', teamsLightTheme[fontSize])
        .and('have.css', 'line-height', teamsLightTheme[lineHeight])
        .and('have.css', 'font-weight', String(teamsLightTheme[weight]))
        .and('have.css', 'font-style', 'italic');
      text().should('have.attr', 'title', 'Native callback title');
      text().click();
      cy.get('@renderedClick').should('have.been.calledOnce');
      cy.contains('button', 'Update callback').click();
      text().should('have.text', 'Updated callback content').and('have.css', 'font-size', teamsLightTheme[fontSize]);
      cy.get('[data-cy-root]').should(root => {
        expect(getByRole(root[0], 'heading', { level: 2, name: 'Updated callback content' })).to.have.attr(
          'title',
          'Native callback title',
        );
      });
    });
  });

  it('combines underline and strikethrough and removes stale styles after prop updates', () => {
    const Example = () => {
      const [phase, setPhase] = React.useState(0);
      const styled = phase === 0;
      const props: TextProps =
        phase === 2
          ? {}
          : {
              block: styled,
              italic: styled,
              underline: styled,
              strikethrough: styled,
              truncate: styled,
              wrap: !styled,
              size: styled ? 1000 : 300,
              weight: styled ? 'bold' : 'regular',
              font: styled ? 'monospace' : 'base',
              align: styled ? 'end' : 'start',
            };
      return (
        <>
          <button onClick={() => setPhase(value => value + 1)}>Reset</button>
          <button onClick={() => setPhase(0)}>Restyle</button>
          <button onClick={() => setPhase(2)}>Omit styles</button>
          <Text data-testid="text" {...props}>
            Content
          </Text>
          <span data-testid="reference" style={{ fontFamily: tokens.fontFamilyBase }}>
            Reference
          </span>
        </>
      );
    };
    mount(<Example />);
    text()
      .should('have.css', 'text-decoration-line', 'underline line-through')
      .and('have.css', 'font-style', 'italic')
      .and('have.css', 'display', 'block')
      .and('have.css', 'white-space', 'nowrap')
      .and('have.css', 'overflow', 'hidden')
      .and('have.css', 'text-overflow', 'ellipsis')
      .and('have.css', 'font-size', teamsLightTheme.fontSizeHero1000)
      .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightBold))
      .and('have.css', 'text-align', 'end');
    cy.contains('button', 'Reset').click();
    text()
      .should('have.css', 'text-decoration-line', 'none')
      .and('have.css', 'font-style', 'normal')
      .and('have.css', 'display', 'inline')
      .and('have.css', 'white-space', 'normal')
      .and('have.css', 'overflow', 'visible')
      .and('have.css', 'text-overflow', 'clip')
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
      .and('have.css', 'line-height', teamsLightTheme.lineHeightBase300)
      .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular))
      .and('have.css', 'text-align', 'start')
      .and('have.text', 'Content');
    cy.contains('button', 'Restyle').click();
    text().should('have.css', 'font-size', teamsLightTheme.fontSizeHero1000);
    cy.contains('button', 'Omit styles').click();
    text()
      .should('have.css', 'text-decoration-line', 'none')
      .and('have.css', 'font-style', 'normal')
      .and('have.css', 'display', 'inline')
      .and('have.css', 'white-space', 'normal')
      .and('have.css', 'overflow', 'visible')
      .and('have.css', 'text-overflow', 'clip')
      .and('have.css', 'font-size', teamsLightTheme.fontSizeBase300)
      .and('have.css', 'line-height', teamsLightTheme.lineHeightBase300)
      .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightRegular))
      .and('have.css', 'text-align', 'start');
    cy.get('[data-testid="reference"]')
      .invoke('css', 'font-family')
      .then(expected => {
        text().should('have.css', 'font-family', expected);
      });
  });

  // Test-only override must stay out of the library's extracted production styles.
  // eslint-disable-next-line @griffel/styles-file
  const useOverrideStyles = makeStyles({
    root: {
      fontSize: tokens.fontSizeBase500,
      lineHeight: tokens.lineHeightBase500,
      fontWeight: tokens.fontWeightMedium,
    },
  });
  [[Text, 'Text', 'fontSizeBase300', 'lineHeightBase300', 'fontWeightRegular'] as const, ...presets].forEach(
    ([Component, name, fontSize, lineHeight, weight]) => {
      it(`preserves native props and user class/inline precedence for ${name}`, () => {
        const Example = () => {
          const styles = useOverrideStyles();
          const [inline, setInline] = React.useState(false);
          const [overridden, setOverridden] = React.useState(true);
          return (
            <>
              <button onClick={() => setInline(true)}>Apply inline style</button>
              <button
                onClick={() => {
                  setInline(false);
                  setOverridden(false);
                }}
              >
                Remove overrides
              </button>
              <Component
                data-testid="text"
                className={overridden ? styles.root : undefined}
                id="custom-text"
                lang="fr"
                title="Native title"
                style={inline ? { fontSize: tokens.fontSizeBase600 } : undefined}
              >
                Bonjour
              </Component>
            </>
          );
        };
        mount(<Example />);
        text()
          .should('have.css', 'font-size', teamsLightTheme.fontSizeBase500)
          .and('have.css', 'line-height', teamsLightTheme.lineHeightBase500)
          .and('have.css', 'font-weight', String(teamsLightTheme.fontWeightMedium));
        text().should('have.attr', 'id', 'custom-text');
        text().should('have.attr', 'lang', 'fr');
        text().should('have.attr', 'title', 'Native title');
        cy.contains('button', 'Apply inline style').click();
        text().should('have.css', 'font-size', teamsLightTheme.fontSizeBase600).and('have.text', 'Bonjour');
        cy.contains('button', 'Remove overrides').click();
        text()
          .should('have.css', 'font-size', teamsLightTheme[fontSize])
          .and('have.css', 'line-height', teamsLightTheme[lineHeight])
          .and('have.css', 'font-weight', String(teamsLightTheme[weight]))
          .and('have.text', 'Bonjour');
      });
    },
  );

  // Presets' legacy FunctionComponent annotation omits the ref forwarded by createPreset.
  const DisplayWithRef = Display as typeof Text;
  (
    [
      [Text, 'Text', 'span'],
      [Text, 'Text', 'h2'],
      [Text, 'Text', 'pre'],
      [DisplayWithRef, 'Display', 'h2'],
    ] as const
  ).forEach(([Component, name, as]) => {
    it(`forwards and clears the root ref when ${name} as ${as} unmounts`, () => {
      const ref = cy.spy().as('rootRef');
      const Example = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            <button onClick={() => setVisible(false)}>Unmount</button>
            {visible && (
              <Component data-testid="text" as={as} ref={ref}>
                Referenced text
              </Component>
            )}
          </>
        );
      };
      mount(<Example />);
      text()
        .should('have.prop', 'tagName', as.toUpperCase())
        .then(element => {
          cy.get('@rootRef').should('have.been.calledWith', element[0]);
        });
      cy.contains('button', 'Unmount').click();
      text().should('not.exist');
      cy.get('@rootRef').its('lastCall.args.0').should('be.null');
    });
  });
});
