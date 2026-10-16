import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { SwatchPicker, SwatchPickerRow } from '@fluentui/react-swatch-picker';
import { HeartFilled } from '@fluentui/react-icons';
import { Tooltip } from '@fluentui/react-tooltip';
import { ColorSwatch } from './ColorSwatch';
import { useColorSwatchBase_unstable } from './useColorSwatch';
import { renderColorSwatch_unstable } from './renderColorSwatch';
import type { ColorSwatchProps } from './ColorSwatch.types';
import { SwatchPickerProvider, swatchPickerContextDefaultValue } from '../../contexts/swatchPicker';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const swatch = () => cy.get('#swatch');
const BaseSwatch = React.forwardRef<HTMLButtonElement, ColorSwatchProps>((props, ref) =>
  renderColorSwatch_unstable(useColorSwatchBase_unstable(props, ref)),
);

describe('ColorSwatch adversarial improvements (final)', () => {
  (['extra-small', 'small', 'medium', 'large'] as const).forEach((size, index) => {
    it(`${size}: selected shadow takes the small-size branch and native hover changes it`, () => {
      mount(
        <>
          <button id="outside">Outside</button>
          <SwatchPicker selectedValue="red">
            <ColorSwatch id="swatch" color="#f00" value="red" aria-label="Red" size={size} />
          </SwatchPicker>
        </>,
      );
      cy.get('#outside').realHover();
      swatch()
        .should('have.attr', 'aria-checked', 'true')
        .invoke('css', 'box-shadow')
        .then(shadow => {
          expect(shadow).to.contain(`0px 0px 0px ${index < 2 ? 2 : 3}px`);
          swatch().realHover();
          swatch().invoke('css', 'box-shadow').should('not.equal', shadow).and('not.equal', 'none');
        });
    });
  });

  it('frozen controlled selection requests blue without changing the selected red swatch', () => {
    const select = cy.stub().as('select');
    mount(
      <SwatchPicker selectedValue="red" onSelectionChange={select}>
        <ColorSwatch id="swatch" color="#f00" value="red" aria-label="Red" />
        <ColorSwatch id="blue" color="#00f" value="blue" aria-label="Blue" />
      </SwatchPicker>,
    );
    cy.get('#blue').focus().realPress('Space');
    swatch().should('have.attr', 'aria-checked', 'true');
    cy.get('#blue').should('have.attr', 'aria-checked', 'false');
    cy.get('@select')
      .should('have.been.calledOnce')
      .then(() => expect(select.firstCall.args[1].selectedValue).to.equal('blue'));
  });

  it('changing row to grid updates ARIA without replacing the root; removal detaches forwarded ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    let initial: HTMLButtonElement;
    const Example = () => {
      const [stage, setStage] = React.useState(0);
      return (
        <>
          <button onClick={() => setStage(value => value + 1)}>Next</button>
          <SwatchPicker layout={stage ? 'grid' : 'row'} selectedValue="red">
            <SwatchPickerRow>
              {stage < 2 && <ColorSwatch ref={ref} id="swatch" color="#f00" value="red" aria-label="Red" />}
            </SwatchPickerRow>
          </SwatchPicker>
        </>
      );
    };
    mount(<Example />);
    swatch().then($swatch => {
      initial = $swatch[0] as HTMLButtonElement;
    });
    cy.contains('button', 'Next').realClick();
    swatch()
      .should('have.attr', 'role', 'gridcell')
      .and('have.attr', 'aria-selected', 'true')
      .should($swatch => expect($swatch[0]).to.equal(initial));
    swatch().should('not.have.attr', 'aria-checked');
    cy.contains('button', 'Next').realClick();
    swatch()
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });
});

describe('ColorSwatch unit-derived contracts (round 3)', () => {
  it('standalone matches default snapshot and does not create local selection state', () => {
    mount(<ColorSwatch id="swatch" color="#f09" value="f09" />);
    swatch()
      .should('be.empty')
      .and('have.attr', 'role', 'radio')
      .and('have.attr', 'type', 'button')
      .and('have.attr', 'aria-checked', 'false')
      .and('have.css', 'width', '28px')
      .and('have.css', 'border-radius', '0px');
    swatch().realClick();
    swatch().should('have.attr', 'aria-checked', 'false');
  });

  it('parent size/shape context is inherited unless explicit child props win', () => {
    mount(
      <SwatchPicker size="large" shape="circular">
        <ColorSwatch id="inherited" color="#f00" value="red" aria-label="Red" />
        <ColorSwatch id="swatch" color="#00f" value="blue" aria-label="Blue" size="extra-small" shape="rounded" />
      </SwatchPicker>,
    );
    cy.get('#inherited').should('have.css', 'width', '32px').and('have.css', 'border-radius', '10000px');
    swatch().should('have.css', 'width', '20px').and('have.css', 'border-radius', '4px');
  });

  it('context request callback receives exact native event and only the value/color payload', () => {
    const request = cy.stub().as('request');
    const click = cy.stub();
    mount(
      <SwatchPickerProvider value={{ ...swatchPickerContextDefaultValue, requestSelectionChange: request }}>
        <ColorSwatch id="swatch" color="#f09" value="f09" aria-label="Pink" onClick={click} />
      </SwatchPickerProvider>,
    );
    swatch().realClick();
    cy.get('@request')
      .should('have.been.calledOnce')
      .then(() => {
        expect(request.firstCall.args[0]).to.equal(click.firstCall.args[0]);
        expect(request.firstCall.args[0].nativeEvent.isTrusted).to.equal(true);
        expect(request.firstCall.args[1]).to.deep.equal({ selectedValue: 'f09', selectedSwatch: '#f09' });
      });
  });

  it('explicit native role/ARIA override wins context defaults but does not create selected state', () => {
    mount(
      <SwatchPicker selectedValue="red">
        <ColorSwatch id="swatch" color="#f00" value="red" role="button" aria-checked={false} aria-label="Custom" />
      </SwatchPicker>,
    );
    swatch().should('have.attr', 'role', 'button').and('have.attr', 'aria-checked', 'false');
  });

  it('base hook has no implicit disabled glyph or design classes and retains explicit icon/children', () => {
    mount(
      <BaseSwatch id="swatch" color="#f00" value="red" disabled icon={<span>I</span>}>
        A
      </BaseSwatch>,
    );
    swatch().should('be.disabled').and('contain.text', 'AI').and('not.have.class', 'fui-ColorSwatch');
    swatch().find('svg').should('not.exist');
  });

  it('custom disabled glyph children override the default; enabled state does not render it', () => {
    mount(
      <ColorSwatch id="swatch" color="#f00" value="red" disabled disabledIcon={<span id="custom-glyph">X</span>} />,
    );
    cy.get('#custom-glyph').should('have.text', 'X');
    swatch().find('svg').should('not.exist');
    mount(<ColorSwatch id="swatch" color="#f00" value="red" disabledIcon={<span id="custom-glyph">X</span>} />);
    cy.get('#custom-glyph').should('not.exist');
  });
});

describe('ColorSwatch edges and accessibility (round 2)', () => {
  it('native Tab excludes disabled buttons and arrow traversal does not implicitly select', () => {
    const select = cy.stub().as('select');
    mount(
      <>
        <button id="before">Before</button>
        <SwatchPicker onSelectionChange={select}>
          <ColorSwatch id="swatch" color="#f00" value="red" aria-label="Red" />
          <ColorSwatch id="disabled" color="#0f0" value="green" aria-label="Green" disabled />
          <ColorSwatch id="blue" color="#00f" value="blue" aria-label="Blue" />
        </SwatchPicker>
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus().realPress('Tab');
    swatch().should('have.focus').realPress('ArrowRight');
    cy.get('#blue').should('have.focus').realPress('Tab');
    cy.get('#after').should('have.focus');
    cy.get('@select').should('not.have.been.called');
  });

  it('root native attrs, forwarded ref and caller CSS variable overrides preserve selection payload', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const select = cy.stub().as('select');
    mount(
      <SwatchPicker onSelectionChange={select}>
        <ColorSwatch
          id="swatch"
          ref={ref}
          color="#f00"
          value="red"
          aria-label="Red"
          name="paint"
          title="Swatch"
          className="custom-swatch"
          style={{ '--fui-SwatchPicker--color': '#00f' } as React.CSSProperties}
        />
      </SwatchPicker>,
    );
    swatch()
      .should('have.attr', 'name', 'paint')
      .and('have.attr', 'title', 'Swatch')
      .and('have.class', 'custom-swatch')
      .and('have.css', 'background-color', 'rgb(0, 0, 255)')
      .should($swatch => expect(ref.current).to.equal($swatch[0]));
    swatch().realClick();
    cy.get('@select')
      .should('have.been.calledOnce')
      .then(() => expect(select.firstCall.args[1].selectedSwatch).to.equal('#f00'));
  });

  it('consumer preventDefault is forwarded before selection and does not cancel the requested picker state', () => {
    const child = cy.stub().callsFake((event: React.MouseEvent) => event.preventDefault());
    const select = cy.stub().as('select');
    mount(
      <SwatchPicker onSelectionChange={select}>
        <ColorSwatch id="swatch" color="#f00" value="red" aria-label="Red" onClick={child} />
      </SwatchPicker>,
    );
    swatch().realClick();
    swatch().should('have.attr', 'aria-checked', 'true');
    cy.get('@select')
      .should('have.been.calledOnce')
      .then(() => {
        expect(child).to.have.been.calledOnce;
        expect(select.firstCall.args[0]).to.equal(child.firstCall.args[0]);
        expect(select.firstCall.args[0].defaultPrevented).to.equal(true);
      });
  });

  it('default button type does not submit its surrounding form on native Enter or Space', () => {
    const submit = cy.stub().as('submit');
    mount(
      <form
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <ColorSwatch id="swatch" color="#f00" value="red" aria-label="Red" />
      </form>,
    );
    swatch().focus().realPress('Enter').realPress('Space');
    cy.get('@submit').should('not.have.been.called');
  });

  it('custom icon and disabled-icon slots preserve attrs/class/refs; null removes only the disabled glyph', () => {
    const iconRef = React.createRef<HTMLSpanElement>();
    const disabledRef = React.createRef<HTMLSpanElement>();
    mount(
      <ColorSwatch
        id="swatch"
        color="#f00"
        value="red"
        disabled
        aria-label="Red"
        icon={{ children: 'I', id: 'icon', className: 'custom-icon', ref: iconRef }}
        disabledIcon={{ children: 'D', id: 'disabled-icon', className: 'custom-disabled', ref: disabledRef }}
      />,
    );
    cy.get('#icon')
      .should('have.class', 'custom-icon')
      .and('have.text', 'I')
      .should($icon => expect(iconRef.current).to.equal($icon[0]));
    cy.get('#disabled-icon')
      .should('have.class', 'custom-disabled')
      .and('have.text', 'D')
      .should($icon => expect(disabledRef.current).to.equal($icon[0]));
    mount(<ColorSwatch id="swatch" color="#f00" value="red" disabled aria-label="Red" disabledIcon={null} />);
    swatch().should('be.disabled').find('svg').should('not.exist');
  });

  it('tooltip string label resolves to native aria-label when focused', () => {
    mount(
      <Tooltip content="Red paint" relationship="label">
        <ColorSwatch id="swatch" color="#f00" value="red" />
      </Tooltip>,
    );
    swatch().focus();
    cy.get('[role="tooltip"]').should('have.text', 'Red paint').and('be.visible');
    swatch().should('have.attr', 'aria-label', 'Red paint');
  });

  it('live color/value/disabled updates preserve root identity and remove stale disabled glyph', () => {
    let initial: HTMLElement;
    const Example = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Change</button>
          <SwatchPicker selectedValue="blue">
            <ColorSwatch
              id="swatch"
              color={changed ? '#00f' : '#f00'}
              value={changed ? 'blue' : 'red'}
              disabled={!changed}
              aria-label="Paint"
            />
          </SwatchPicker>
        </>
      );
    };
    mount(<Example />);
    swatch().then($swatch => {
      initial = $swatch[0];
    });
    swatch().should('be.disabled').and('have.attr', 'aria-checked', 'false');
    cy.contains('button', 'Change').realClick();
    swatch()
      .should('not.be.disabled')
      .and('have.attr', 'aria-checked', 'true')
      .and('have.css', 'background-color', 'rgb(0, 0, 255)')
      .should($swatch => expect($swatch[0]).to.equal(initial));
    swatch().find('svg').should('not.exist');
  });
});

describe('ColorSwatch documented contracts (round 1)', () => {
  (['extra-small', 'small', 'medium', 'large'] as const).forEach((size, index) => {
    (['square', 'rounded', 'circular'] as const).forEach(shape => {
      it(`${size}/${shape}: native button target dimensions and corners`, () => {
        mount(<ColorSwatch id="swatch" color="#f00" value="red" aria-label="Red" size={size} shape={shape} />);
        swatch().should($swatch => {
          const rect = $swatch[0].getBoundingClientRect();
          expect(rect.width).to.equal(20 + index * 4);
          expect(rect.height).to.equal(20 + index * 4);
        });
        swatch()
          .should('have.css', 'border-radius', shape === 'circular' ? '10000px' : shape === 'rounded' ? '4px' : '0px')
          .and('have.attr', 'type', 'button')
          .and('have.attr', 'role', 'radio');
      });
    });
  });

  it('color and explicit low-contrast border actually paint the browser swatch', () => {
    mount(<ColorSwatch id="swatch" color="#fff" value="white" borderColor="#123456" aria-label="White" />);
    swatch()
      .should('have.css', 'background-color', 'rgb(255, 255, 255)')
      .and('have.css', 'border-top-color', 'rgb(18, 52, 86)')
      .and('have.css', 'border-top-width', '1px');
  });

  it('gradient paint, custom icon and initials can coexist in root children/slot order', () => {
    mount(
      <ColorSwatch
        id="swatch"
        color="linear-gradient(0deg, #E3008C, #fff232)"
        value="gradient"
        icon={{ children: <HeartFilled />, id: 'heart-icon' }}
        aria-label="Yellow pink gradient"
      >
        A
      </ColorSwatch>,
    );
    swatch()
      .should('have.css', 'background-image', 'linear-gradient(0deg, rgb(227, 0, 140), rgb(255, 242, 50))')
      .and('contain.text', 'A');
    swatch().find('#heart-icon svg').should('have.attr', 'aria-hidden', 'true');
  });

  (['row', 'grid'] as const).forEach(layout => {
    (['click', 'Enter', 'Space'] as const).forEach(key => {
      it(`${layout} native ${key}: exact trusted selection event, value, paint and selected semantics`, () => {
        const select = cy.stub().as('select');
        mount(
          <SwatchPicker layout={layout} onSelectionChange={select}>
            <SwatchPickerRow>
              <ColorSwatch id="swatch" color="#f00" value="custom-red" aria-label="Red" />
              <ColorSwatch id="blue" color="#00f" value="custom-blue" aria-label="Blue" />
            </SwatchPickerRow>
          </SwatchPicker>,
        );
        if (key === 'click') {
          swatch().realClick();
        } else {
          swatch().focus().realPress(key);
        }
        swatch().should('have.attr', layout === 'grid' ? 'aria-selected' : 'aria-checked', 'true');
        cy.get('#blue').should('have.attr', layout === 'grid' ? 'aria-selected' : 'aria-checked', 'false');
        cy.get('@select')
          .should('have.been.calledOnce')
          .then(() => {
            const [event, data] = select.firstCall.args;
            expect(event.type).to.equal('click');
            expect(event.nativeEvent.isTrusted).to.equal(true);
            expect(event.target.id).to.equal('swatch');
            expect(data).to.deep.equal({ event, type: 'click', selectedValue: 'custom-red', selectedSwatch: '#f00' });
          });
      });
    });
  });

  it('disabled swatch has prohibited icon and cannot be selected by native pointer', () => {
    const select = cy.stub().as('select');
    mount(
      <SwatchPicker onSelectionChange={select}>
        <ColorSwatch id="swatch" color="#f00" value="red" aria-label="Red" disabled />
      </SwatchPicker>,
    );
    swatch().should('be.disabled').find('svg').should('have.length', 1).and('have.attr', 'aria-hidden', 'true');
    swatch().realClick();
    cy.get('@select').should('not.have.been.called');
    swatch().should('have.attr', 'aria-checked', 'false');
  });
});
