import * as React from 'react';
import * as axe from 'axe-core';
import { computeAccessibleName } from 'dom-accessibility-api';
import { tinycolor } from '@ctrl/tinycolor';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import type { JSXElement, FluentProviderCustomStyleHooks } from '@fluentui/react-components';
import { ColorSlider } from '../ColorSlider';
import type { ColorChannel, ColorSliderProps, ColorSliderState } from '../ColorSlider.types';
import { colorSliderCSSVars } from '../ColorSlider.constants';
import { getCypressElementCoordinates } from 'cypress-real-events/getCypressElementCoordinates';
import { ColorPicker } from '../../ColorPicker/ColorPicker';
import { ColorArea } from '../../ColorArea/ColorArea';
import { AlphaSlider } from '../../AlphaSlider/AlphaSlider';
import { ColorPickerProvider } from '../../../contexts/colorPicker';
import { useColorSlider_unstable, useColorSliderBase_unstable } from '../useColorSlider';
import { useColorSliderStyles_unstable, colorSliderClassNames } from '../useColorSliderStyles.styles';
import { renderColorSlider_unstable } from '../renderColorSlider';
import * as sliderExports from '../index';
import * as publicExports from '../../../ColorSlider';
import { ColorSliderDefault } from '../../../../../stories/src/ColorPicker/ColorSliderDefault.stories';
import { ColorSliderChannels } from '../../../../../stories/src/ColorPicker/ColorSliderChannels.stories';
import { Default } from '../../../../../stories/src/ColorPicker/ColorPickerDefault.stories';
import { ColorPickerShape } from '../../../../../stories/src/ColorPicker/ColorPickerShape.stories';
import { ColorPickerPopup } from '../../../../../stories/src/ColorPicker/ColorPickerPopup.stories';
import { ColorAndSwatchPicker } from '../../../../../stories/src/ColorPicker/ColorAndSwatchPicker.stories';
import { EmptySwatchExample } from '../../../../../../react-swatch-picker/stories/src/SwatchPicker/EmptySwatch.stories';
import type { HsvColor } from '../../../types/color';

const requestedRound: unknown = Cypress.env('coverageRound');
if (requestedRound !== undefined && ![1, 2, 3, 4, '1', '2', '3', '4'].some(value => requestedRound === value)) {
  throw new Error('coverageRound must be 1, 2, 3, or 4');
}
const round = requestedRound === undefined ? 4 : Number(requestedRound);
const evidenceRoot = `src/components/ColorSlider/.temp/audits-${Date.now()}-${Cypress._.random(0, 1000000000)}`;
let evidenceIndex = 0;
const evidence = (report: Record<string, unknown>) =>
  cy.writeFile(
    `${evidenceRoot}/evidence-${++evidenceIndex}.json`,
    { ...report, retries: Cypress.currentRetry },
    { log: false },
  );

describe('row134 ColorSlider browser coverage', { retries: 0, viewportWidth: 1100, viewportHeight: 1100 }, () => {
  const initial = { h: 210, s: 0.5, v: 0.8, a: 0.4 };
  const replacement = { h: 120, s: 0.25, v: 0.6, a: 0.8 };
  const channels = ['hue', 'saturation', 'value'] as const;
  const field = { hue: 'h', saturation: 's', value: 'v' } as const;
  const maximum = (channel: ColorChannel) => (channel === 'hue' ? 360 : 100);
  const changed = (channel: ColorChannel, value: number, color = initial) => ({
    ...color,
    [field[channel]]: channel === 'hue' ? value : value / 100,
  });
  const valueOf = (channel: ColorChannel, color: HsvColor = initial) =>
    color[field[channel]] * (channel === 'hue' ? 1 : 100);
  let registered = 0;
  const registeredTitles: string[] = [];
  const auditedTitles: string[] = [];
  const auditedCheckpoints: string[] = [];
  const paintedTitles: string[] = [];
  const checkpoints = () =>
    registeredTitles.flatMap(title =>
      Array.from({ length: title.startsWith('R3.07 ') ? 1 : title.startsWith('R4.04 ') ? 2 : 0 }, () => title),
    );
  const painted = () =>
    registeredTitles.flatMap(title =>
      Array.from({ length: title.startsWith('R4.04 ') ? 3 : /^R4\.0[12] /.test(title) ? 1 : 0 }, () => title),
    );
  function scenario(level: number, name: string, test: () => void) {
    if (round >= level) {
      registered++;
      registeredTitles.push(name);
      it(name, test);
    }
  }
  const render = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
    mount(
      <FluentProvider dir={dir} theme={dark ? webDarkTheme : webLightTheme}>
        <main id="fixture" style={{ padding: 40, width: 650 }}>
          {element}
        </main>
      </FluentProvider>,
    ).then(() =>
      cy
        .get('#fixture')
        .should($fixture =>
          expect($fixture[0].closest('[aria-hidden="true"]'), 'fixture exposed to axe').to.equal(null),
        ),
    );
  const Slider = ({ frozen = false, ...props }: ColorSliderProps & { frozen?: boolean }) => {
    const [color, setColor] = React.useState(props.color ?? initial);
    const channel = props.channel ?? 'hue';
    return (
      <>
        <button id="before">Before</button>
        <ColorSlider
          id="slider"
          aria-label={channel}
          {...props}
          color={color}
          aria-valuetext={`${valueOf(channel, color)}${channel === 'hue' ? ' degrees' : ' percent'}`}
          onChange={(event, data) => {
            props.onChange?.(event, data);
            if (!frozen) {
              setColor({ ...data.color, a: data.color.a ?? 1 });
            }
          }}
        />
        <output id="selected">{JSON.stringify(color)}</output>
        <div id="preview" style={{ width: 40, height: 40, backgroundColor: tinycolor(color).toRgbString() }} />
        <button id="replace" onClick={() => setColor(replacement)}>
          Replace
        </button>
        <button id="after">After</button>
      </>
    );
  };
  const input = () => cy.get<HTMLInputElement>('#slider');
  type Key = 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'PageUp' | 'PageDown';
  const key = (name: Key) => {
    input().focus();
    cy.realPress(name);
  };
  const selected = (color: typeof initial) =>
    cy.get('#selected').should($output => expect(JSON.parse($output.text())).to.deep.equal(color));
  const callback = (color: typeof initial, count: number, alias = '@change') =>
    cy.get<sinon.SinonStub>(alias).should(stub => {
      expect(stub.callCount).to.equal(count);
      const [event, data] = stub.lastCall.args;
      expect(Object.keys(data).sort()).to.deep.equal(['color', 'event', 'type']);
      expect(data.color).to.deep.equal(color);
      expect(data.type).to.equal('change');
      expect(data.event).to.equal(event);
      expect(event.type).to.equal('change');
      expect(event.target.tagName).to.equal('INPUT');
      expect(event.target.type).to.equal('range');
      expect(event.nativeEvent.isTrusted, 'real browser input').to.equal(true);
    });
  function assertElement(element: HTMLElement | null, message: string): asserts element is HTMLElement {
    expect(element, message).not.to.equal(null);
  }
  const geometry = (value: number, channel: ColorChannel, vertical = false, dir: 'ltr' | 'rtl' = 'ltr') =>
    input().should($input => {
      expect($input, 'required slider input for geometry').to.have.length(1);
      const root = $input[0].parentElement;
      assertElement(root, 'required slider root for geometry');
      const rail = root.querySelector<HTMLElement>('.fui-ColorSlider__rail');
      const thumb = root.querySelector<HTMLElement>('.fui-ColorSlider__thumb');
      assertElement(rail, 'required slider rail for geometry');
      assertElement(thumb, 'required slider thumb for geometry');
      const r = rail.getBoundingClientRect();
      const t = thumb.getBoundingClientRect();
      const percent = value / maximum(channel);
      expect(r.width).to.be.greaterThan(vertical ? 10 : 190);
      expect(r.height).to.be.greaterThan(vertical ? 270 : 10);
      expect(vertical ? t.top + t.height / 2 : t.left + t.width / 2).to.be.closeTo(
        vertical ? r.bottom - r.height * percent : r.left + r.width * (dir === 'rtl' ? 1 - percent : percent),
        0.15,
      );
      expect(root.style.getPropertyValue(colorSliderCSSVars.sliderProgressVar)).to.equal(`${percent * 100}%`);
    });
  type Classification = 'clean' | 'channels' | 'shape' | 'popup' | 'empty-popup' | 'swatch';
  let classification: Classification = 'clean';
  beforeEach(() => {
    classification = 'clean';
  });
  before(() =>
    evidence({
      kind: 'manifest',
      round,
      tests: registered,
      titles: registeredTitles,
      checkpoints: checkpoints(),
      pixels: painted(),
    }),
  );
  after(() => {
    expect([...auditedTitles].sort(), 'every new case audited exactly once').to.deep.equal(
      [...registeredTitles].sort(),
    );
    expect([...auditedCheckpoints].sort(), 'exact checkpoint multiplicities').to.deep.equal(checkpoints().sort());
    expect([...paintedTitles].sort(), 'exact pixel capture multiplicities').to.deep.equal(painted().sort());
  });
  const audit = (kind: 'axe' | 'axe-checkpoint' = 'axe') => {
    cy.get('#fixture').then($fixture =>
      cy
        .then(() =>
          axe.run([$fixture[0], ...Array.from($fixture[0].ownerDocument.querySelectorAll('.fui-PopoverSurface'))], {
            elementRef: true,
          }),
        )
        .then(result => {
          const document = $fixture[0].ownerDocument;
          const modal = classification === 'popup' || classification === 'empty-popup';
          const hasSentinelViolation = result.violations.some(({ id }) => id === 'aria-hidden-focus');
          const expectedRules: Record<Classification, readonly (readonly string[])[]> = {
            clean: [[]],
            channels: [['label']],
            shape: [['label']],
            popup: [['aria-dialog-name'], ['aria-dialog-name', 'aria-hidden-focus']],
            'empty-popup': [
              ['aria-dialog-name', 'label'],
              ['aria-dialog-name', 'aria-hidden-focus', 'label'],
            ],
            swatch: [[], ['aria-hidden-focus']],
          };
          return evidence({
            kind,
            scenario: Cypress.currentTest.title,
            classification,
            incompleteClassification:
              result.incomplete.length && modal ? 'exact-tabster-focusable-modal-open-review' : 'none',
            passes: result.passes.map(({ id }) => id),
            fullResults: JSON.parse(
              JSON.stringify(result, (property, value) => (property === 'element' ? undefined : value)),
            ),
            violations: result.violations.map(({ id, nodes }) => ({
              id,
              nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
            })),
            incomplete: result.incomplete.map(({ id, nodes }) => ({
              id,
              nodes: nodes.map(({ target, html, any: anyChecks, all, none }) => ({
                target,
                html,
                anyChecks,
                all,
                none,
              })),
            })),
          }).then(() => {
            (kind === 'axe' ? auditedTitles : auditedCheckpoints).push(Cypress.currentTest.title);
            expect(result.passes.length).to.be.greaterThan(0);
            if (classification === 'clean') {
              expect(result.passes.map(({ id }) => id)).to.include('label');
            }
            const assertRules = (rules: string[]) =>
              expect(expectedRules[classification], 'exact predeclared axe profiles').to.deep.include(
                [...rules].sort(),
              );
            const ids = result.violations.map(({ id }) => id);
            assertRules(ids);
            expect(() => assertRules([...ids, 'unknown-rule'])).to.throw();
            if (ids.length) {
              expect(() => assertRules([...ids, ids[0]])).to.throw();
            }
            if (classification === 'channels' || classification === 'shape' || classification === 'empty-popup') {
              expect(
                Cypress.currentTest.title.startsWith(
                  classification === 'channels' ? 'R3.02 ' : classification === 'shape' ? 'R3.04 ' : 'R3.07 ',
                ),
              ).to.equal(true);
              const unnamed =
                classification === 'channels'
                  ? $fixture[0].querySelectorAll<HTMLInputElement>('.fui-ColorSlider__input')
                  : classification === 'shape'
                  ? $fixture[0].querySelectorAll('.fui-ColorPicker')[1].querySelectorAll<HTMLInputElement>('input')
                  : document.querySelector('.fui-PopoverSurface')!.querySelectorAll<HTMLInputElement>('input');
              expect(unnamed.length).to.equal(classification === 'channels' ? 3 : 4);
              const labelNodes = result.violations.find(({ id }) => id === 'label')!.nodes;
              expect(labelNodes.length).to.equal(unnamed.length);
              labelNodes.forEach((node, index) => {
                expect(node.element).to.equal(unnamed[index]);
                expect(node.target).to.have.length(1);
                expect(document.querySelector(String(node.target[0]))).to.equal(unnamed[index]);
                expect(unnamed[index].type).to.equal('range');
                expect(computeAccessibleName(unnamed[index])).to.equal('');
                expect(node.failureSummary).to.equal(
                  'Fix any of the following:\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element has no placeholder attribute\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                );
              });
            }
            if (modal) {
              expect(Cypress.currentTest.title.startsWith(classification === 'popup' ? 'R3.05 ' : 'R3.07 ')).to.equal(
                true,
              );
              const surface = document.querySelector('.fui-PopoverSurface')!;
              expect(surface.getAttribute('role')).to.equal('dialog');
              expect(surface.getAttribute('aria-modal')).to.equal('true');
              expect(computeAccessibleName(surface)).to.equal('');
              const nodes = result.violations.find(({ id }) => id === 'aria-dialog-name')!.nodes;
              expect(nodes).to.have.length(1);
              expect(nodes[0].element).to.equal(surface);
              expect(nodes[0].failureSummary).to.equal(
                'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
              );
            }
            if (modal || classification === 'swatch') {
              if (classification === 'swatch') {
                expect(
                  Cypress.currentTest.title.startsWith('R3.06 ') || Cypress.currentTest.title.startsWith('R3.07 '),
                ).to.equal(true);
              }
              const container = document.querySelector(modal ? '.fui-PopoverSurface' : '.fui-SwatchPicker')!;
              const sentinels = container.querySelectorAll('i[data-tabster-dummy]');
              expect(sentinels).to.have.length(2);
              const nodes = result.violations.find(({ id }) => id === 'aria-hidden-focus')?.nodes ?? [];
              expect(nodes).to.have.length(hasSentinelViolation ? 2 : 0);
              sentinels.forEach((sentinel, index) => {
                expect(sentinel.tagName).to.equal('I');
                expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
                expect(sentinel.getAttribute('role')).to.equal('none');
                expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
                  `isFirst=${index === 0}, isOutside=false, (${modal ? 'Modalizer' : 'Mover'}, tabbable=true)`,
                );
              });
              nodes.forEach((node, index) => {
                expect(node.element).to.equal(sentinels[index]);
                expect(node.target).to.have.length(1);
                expect(sentinels[index].getAttribute('tabindex')).to.equal('0');
                expect(node.failureSummary).to.equal(
                  'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM',
                );
              });
            }
            if (modal && result.incomplete.length) {
              const sentinels = document.querySelectorAll(
                classification === 'empty-popup'
                  ? '.fui-SwatchPicker i[data-tabster-dummy], .fui-PopoverSurface i[data-tabster-dummy]'
                  : '.fui-PopoverSurface i[data-tabster-dummy]',
              );
              expect(result.incomplete.map(({ id }) => id)).to.deep.equal(
                classification === 'empty-popup' ? ['aria-hidden-focus', 'color-contrast'] : ['aria-hidden-focus'],
              );
              expect(result.incomplete[0].nodes).to.have.length(classification === 'empty-popup' ? 4 : 2);
              result.incomplete[0].nodes.forEach((node, index) => {
                expect(node.element).to.equal(sentinels[index]);
                expect(node.target).to.have.length(1);
                expect(document.querySelector(String(node.target[0]))).to.equal(sentinels[index]);
                expect(sentinels[index].tagName).to.equal('I');
                expect(sentinels[index].getAttribute('role')).to.equal('none');
                expect(sentinels[index].getAttribute('aria-hidden')).to.equal('true');
                expect(sentinels[index].getAttribute('data-tabster-dummy')).to.equal(
                  `isFirst=${index % 2 === 0}, isOutside=false, (${
                    classification === 'empty-popup' && index < 2 ? 'Mover' : 'Modalizer'
                  }, tabbable=true)`,
                );
                expect(node.any).to.deep.equal([]);
                expect(node.none).to.deep.equal([]);
                expect(node.all).to.have.length(1);
                const check = node.all[0];
                expect(check.id).to.equal('focusable-modal-open');
                expect(check.impact).to.equal('serious');
                expect(check.data).to.equal(null);
                expect(check.message).to.equal('Check that focusable elements are not tabbable in the current state');
                expect(check.relatedNodes).to.have.length(1);
                expect(check.relatedNodes![0].element).to.equal(sentinels[index]);
                expect(check.relatedNodes![0].target).to.deep.equal(node.target);
                expect(sentinels[index].getAttribute('tabindex')).to.equal('0');
                expect(getComputedStyle(sentinels[index]).contentVisibility).to.equal('hidden');
              });
              if (classification === 'empty-popup') {
                const buttons = document.querySelectorAll('#add-new-color, #reset-example');
                const contrast = result.incomplete[1];
                expect(contrast.nodes).to.have.length(2);
                contrast.nodes.forEach((node, index) => {
                  expect(node.element).to.equal(buttons[index]);
                  expect(node.target).to.deep.equal([`#${buttons[index].id}`]);
                  expect(buttons[index].tagName).to.equal('BUTTON');
                  expect(buttons[index].getAttribute('type')).to.equal('button');
                  expect(node.all).to.deep.equal([]);
                  expect(node.none).to.deep.equal([]);
                  expect(node.any).to.have.length(1);
                  const check = node.any[0];
                  expect(check.id).to.equal('color-contrast');
                  expect(check.impact).to.equal('serious');
                  expect(check.relatedNodes).to.deep.equal([]);
                  expect(check.message).to.equal(
                    "Element's background color could not be determined because it is overlapped by another element",
                  );
                  expect(check.data).to.deep.equal({
                    fgColor: undefined,
                    bgColor: undefined,
                    shadowColor: undefined,
                    contrastRatio: 0,
                    fontSize: '10.5pt (14px)',
                    fontWeight: 'normal',
                    messageKey: 'bgOverlap',
                    expectedContrastRatio: '4.5:1',
                  });
                });
              }
            } else {
              expect(result.incomplete, 'no unclassified axe incompletes').to.deep.equal([]);
            }
          });
        }),
    );
  };
  afterEach(() => {
    audit();
    cy.get('#fixture').realMouseUp();
    cy.get('body').then($body => {
      if ($body.find('.fui-PopoverSurface').length) {
        cy.contains('button', 'Cancel').click();
        cy.get('.fui-PopoverSurface').should('not.exist');
        cy.get('#fixture').should($fixture => expect($fixture[0].closest('[aria-hidden="true"]')).to.equal(null));
      }
    });
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [] },
      }),
    );
  });

  scenario(1, 'R1.01 default native range, slots and unit-derived styles', () => {
    render(<ColorSlider id="slider" aria-label="Hue" />);
    input()
      .should('have.attr', 'type', 'range')
      .and('have.attr', 'min', '0')
      .and('have.attr', 'max', '360')
      .and('have.attr', 'tabindex', '0')
      .and('have.attr', 'aria-orientation', 'horizontal')
      .and('have.value', '0');
    input()
      .parent()
      .should('have.attr', 'role', 'group')
      .and('have.class', 'fui-ColorSlider')
      .children()
      .should('have.length', 3);
    cy.get('.fui-ColorSlider__rail').should('have.css', 'border-radius', '4px');
    cy.get('.fui-ColorSlider__thumb').should('have.css', 'background-color', 'rgb(255, 0, 0)');
    geometry(0, 'hue');
  });
  for (const channel of channels) {
    scenario(1, `R1.02 ${channel} explicit color native range and descriptive value`, () => {
      render(<Slider channel={channel} />);
      input()
        .should('have.value', String(valueOf(channel)))
        .and('have.attr', 'max', String(maximum(channel)));
      input().should($input => expect(computeAccessibleName($input[0])).to.equal(channel));
      geometry(valueOf(channel), channel);
    });
    for (const arrow of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'] as const) {
      scenario(1, `R1.03 ${channel} ${arrow} exact controlled change preserving other HSV and alpha`, () => {
        render(<Slider channel={channel} onChange={cy.stub().as('change')} />);
        key(arrow);
        const value = valueOf(channel) + (arrow === 'ArrowRight' || arrow === 'ArrowUp' ? 1 : -1);
        input().should('have.value', String(value));
        selected(changed(channel, value));
        callback(changed(channel, value), 1);
        geometry(value, channel);
      });
    }
  }
  const storyRange = (label: string) => cy.get<HTMLInputElement>(`input[aria-label="${label}"]`);
  scenario(3, 'R3.01 stable ColorSliderDefault synchronizes horizontal vertical label color and Reset baseline', () => {
    render(<ColorSliderDefault />);
    storyRange('Vertical Hue').focus();
    cy.realPress('ArrowUp');
    storyRange('Hue').should('have.value', '110').and('have.attr', 'aria-valuetext', '110°, ');
    storyRange('Vertical Hue').should('have.value', '110');
    cy.contains('button', 'Reset').click();
    storyRange('Hue').should('have.value', '109').and('have.attr', 'aria-valuetext', '110°, ');
    evidence({
      kind: 'functional-baseline',
      scenario: Cypress.currentTest.title,
      classification: 'stable-default-reset-leaves-hue-valuetext-stale',
    });
  });
  scenario(
    3,
    'R3.02 stable Channels zero saturation preserves hue and value and resets, exact missing-label baseline',
    () => {
      render(<ColorSliderChannels />);
      classification = 'channels';
      cy.get('.fui-ColorSlider__input').eq(1).focus();
      cy.realPress('Home');
      cy.get('.fui-ColorSlider__input').eq(1).should('have.value', '0');
      cy.get('.fui-ColorSlider__input').eq(0).should('have.value', '109');
      cy.get('.fui-ColorSlider__input').eq(2).should('have.value', '91');
      cy.contains('button', 'Reset').click();
      cy.get('.fui-ColorSlider__input').eq(1).should('have.value', '100');
    },
  );
  scenario(3, 'R3.03 stable picker Default hue updates HEX RGB alpha descriptive text and preview', () => {
    render(<Default />);
    storyRange('Hue').focus();
    cy.realPress('Home');
    storyRange('Hue').should('have.value', '0').and('have.attr', 'aria-valuetext', '0°, red');
    cy.get('input[id^="hex-input"]').should('have.value', '#e60000');
    cy.get('input[name="r"]').should('have.value', '230');
    cy.get('input[name="g"]').should('have.value', '0');
    cy.get('input[name="b"]').should('have.value', '0');
    storyRange('Alpha').should('have.value', '100');
  });
  scenario(3, 'R3.04 stable Shape shared hue synchronizes rounded and square exact unlabeled baseline', () => {
    render(<ColorPickerShape />);
    classification = 'shape';
    storyRange('Hue').focus();
    cy.realPress('ArrowRight');
    cy.get('.fui-ColorSlider__input[max="360"]')
      .should('have.length', 2)
      .each($input => expect($input.val()).to.equal('110'));
    cy.get('.fui-ColorSlider__input[max="360"]')
      .eq(0)
      .parent()
      .find('.fui-ColorSlider__rail')
      .should('have.css', 'border-radius', '4px');
    cy.get('.fui-ColorSlider__input[max="360"]')
      .eq(1)
      .parent()
      .find('.fui-ColorSlider__rail')
      .should('have.css', 'border-radius', '0px');
  });
  for (const action of ['Ok', 'Cancel'] as const) {
    scenario(3, `R3.05 stable Popup ${action} hue preview commit policy and reopen, exact dialog baseline`, () => {
      render(<ColorPickerPopup />);
      cy.contains('button', 'Choose color').click();
      storyRange('Hue').focus();
      cy.realPress('Home');
      storyRange('Hue').should('have.value', '0');
      cy.contains('button', action).click();
      cy.get('.fui-PopoverSurface').should('not.exist');
      cy.get('#fixture > div')
        .last()
        .should('have.css', 'background-color', action === 'Ok' ? 'rgb(230, 0, 0)' : 'rgb(42, 230, 0)');
      cy.contains('button', 'Choose color').click();
      storyRange('Hue').should('have.value', '0');
      classification = 'popup';
    });
  }
  scenario(3, 'R3.06 stable ColorAndSwatchPicker adds hue-derived swatch and resets', () => {
    render(<ColorAndSwatchPicker />);
    classification = 'swatch';
    storyRange('Hue').focus();
    cy.realPress('Home');
    cy.get('#add-new-color').click();
    cy.get('.fui-ColorSwatch').should('have.length', 1).and('have.attr', 'aria-label', 'rgb(230, 0, 0)');
    cy.get('#reset-example').click();
    cy.get('.fui-ColorSwatch').should('not.exist');
    storyRange('Hue').should('have.value', '109');
  });
  scenario(
    3,
    'R3.07 stable EmptySwatch consumer uses native hue in popup then cancels without selecting new swatch',
    () => {
      render(<EmptySwatchExample />);
      classification = 'swatch';
      cy.get('button[aria-label="Custom color"]').click();
      cy.get('.fui-PopoverSurface .fui-ColorSlider__input[max="360"]').focus();
      cy.realPress('Home');
      cy.get('.fui-PopoverSurface .fui-ColorSlider__input[max="360"]').should('have.value', '0');
      cy.then(() => {
        classification = 'empty-popup';
      });
      audit('axe-checkpoint');
      cy.contains('button', 'Cancel').click();
      cy.get('.fui-PopoverSurface').should('not.exist');
      cy.then(() => {
        classification = 'swatch';
      });
      cy.get('.fui-ColorSwatch[aria-checked="true"]').should('have.attr', 'aria-label', 'green');
    },
  );

  const Picker = ({
    onChange,
    childProps = {},
  }: {
    onChange?: ColorSliderProps['onChange'];
    childProps?: ColorSliderProps;
  }) => {
    const [color, setColor] = React.useState(initial);
    return (
      <>
        <ColorPicker
          color={color}
          onColorChange={(event, data) => {
            onChange?.(event, data);
            setColor({ ...data.color, a: data.color.a ?? 1 });
          }}
        >
          <ColorSlider id="slider" aria-label="Hue" {...childProps} />
          <ColorSlider id="peer-saturation" aria-label="Saturation" channel="saturation" />
          <ColorSlider id="peer-value" aria-label="Brightness" channel="value" />
          <AlphaSlider id="peer-alpha" aria-label="Alpha" />
          <ColorArea inputX={{ 'aria-label': 'Area saturation' }} inputY={{ 'aria-label': 'Area brightness' }} />
        </ColorPicker>
        <output id="selected">{JSON.stringify(color)}</output>
        <button id="replace" onClick={() => setColor(replacement)}>
          Replace
        </button>
      </>
    );
  };
  for (const channel of channels) {
    scenario(
      3,
      `R3.08 ${channel} ColorPicker exact inherited callback synchronizes peers area alpha and external replacement`,
      () => {
        render(<Picker onChange={cy.stub().as('change')} childProps={{ channel }} />);
        key('ArrowRight');
        const color = changed(channel, valueOf(channel) + 1);
        selected(color);
        callback(color, 1);
        cy.get('#peer-saturation').should('have.value', String(color.s * 100));
        cy.get('#peer-value').should('have.value', String(color.v * 100));
        cy.get('#peer-alpha').should('have.value', '40');
        cy.get('.fui-ColorArea__inputX').should('have.value', String(color.s * 100));
        cy.get('.fui-ColorArea__inputY').should('have.value', String(color.v * 100));
        cy.get('#replace').click();
        input().should('have.value', String(valueOf(channel, replacement)));
        cy.get('@change').should('have.been.calledOnce');
      },
    );
  }
  scenario(3, 'R3.09 explicit child color overrides context without broadcasting before interaction', () => {
    render(<Picker onChange={cy.stub().as('change')} childProps={{ color: replacement }} />);
    input().should('have.value', '120');
    cy.get('#peer-saturation').should('have.value', '50');
    key('ArrowRight');
    callback({ ...replacement, h: 121 }, 1);
    selected({ ...replacement, h: 121 });
    input().should('have.value', '120');
    cy.get('#peer-saturation').should('have.value', '25');
  });
  scenario(3, 'R3.10 explicit child onChange replaces context callback, frozen siblings stay unchanged', () => {
    render(<Picker onChange={cy.stub().as('parent')} childProps={{ onChange: cy.stub().as('child') }} />);
    key('ArrowRight');
    callback({ ...initial, h: 211 }, 1, '@child');
    cy.get('@parent').should('not.have.been.called');
    input().should('have.value', '210');
    selected(initial);
  });
  scenario(3, 'R3.11 input slot callback precedes public callback and preventDefault does not cancel state', () => {
    const order: string[] = [];
    const slotChange = cy
      .stub()
      .callsFake((event: React.ChangeEvent<HTMLInputElement>) => {
        order.push('input');
        event.preventDefault();
      })
      .as('slot');
    const change = cy
      .stub()
      .callsFake((event: React.ChangeEvent<HTMLInputElement>) => {
        order.push('public');
        expect(event.defaultPrevented).to.equal(true);
      })
      .as('change');
    render(<Slider input={{ onChange: slotChange }} onChange={change} />);
    key('ArrowRight');
    selected({ ...initial, h: 211 });
    callback({ ...initial, h: 211 }, 1);
    cy.get('@slot').should('have.been.calledOnce');
    cy.then(() => expect(order).to.deep.equal(['input', 'public']));
  });
  scenario(3, 'R3.12 public callback preventDefault does not cancel uncontrolled value mutation', () => {
    const change = cy
      .stub()
      .callsFake((event: React.ChangeEvent<HTMLInputElement>) => event.preventDefault())
      .as('change');
    render(<ColorSlider id="slider" aria-label="Hue" defaultColor={initial} onChange={change} />);
    key('ArrowRight');
    input().should('have.value', '211');
    callback({ h: 211, s: 0, v: 0, a: 1 }, 1);
  });
  scenario(3, 'R3.13 primary input versus root native props and all four slot customizations', () => {
    render(
      <ColorSlider
        id="slider"
        aria-label="Hue"
        title="Hue title"
        name="hue"
        className="outer"
        style={{ width: 400 }}
        root={{ id: 'root', 'aria-label': 'Color editor', className: 'custom-root' }}
        input={{ ...{ 'data-slot': 'input' }, className: 'custom-input' }}
        rail={{ ...{ 'data-slot': 'rail' }, className: 'custom-rail', style: { height: 24 } }}
        thumb={{ ...{ 'data-slot': 'thumb' }, className: 'custom-thumb', style: { width: 24, height: 24 } }}
      />,
    );
    input()
      .should('have.attr', 'name', 'hue')
      .and('have.attr', 'title', 'Hue title')
      .and('have.class', 'custom-input')
      .and('have.attr', 'data-slot', 'input');
    cy.get('#root')
      .should('not.have.class', 'outer')
      .and('have.class', 'custom-root')
      .and('have.css', 'width', '400px');
    cy.get('[data-slot="rail"]').should('have.class', colorSliderClassNames.rail).and('have.css', 'height', '24px');
    cy.get('[data-slot="thumb"]').should('have.class', colorSliderClassNames.thumb).and('have.css', 'width', '24px');
  });
  scenario(3, 'R3.14 input slot native props override top-level except range type and controlled channel value', () => {
    render(
      <ColorSlider
        id="outer-id"
        aria-label="Outer hue"
        min={0}
        max={360}
        step={1}
        color={initial}
        input={{ id: 'slider', 'aria-label': 'Slot hue', min: 20, max: 280, step: 2, type: 'range' }}
      />,
    );
    input()
      .should('have.attr', 'aria-label', 'Slot hue')
      .and('have.attr', 'min', '20')
      .and('have.attr', 'max', '280')
      .and('have.attr', 'step', '2')
      .and('have.value', '210');
    cy.get('#outer-id').should('not.exist');
  });
  scenario(3, 'R3.15 accessible explicit label and description target native input', () => {
    render(
      <>
        <label htmlFor="slider">Hue in degrees</label>
        <p id="help">Choose a hue using arrow keys</p>
        <ColorSlider id="slider" aria-describedby="help" aria-valuetext="210 degrees" color={initial} />
      </>,
    );
    input().should($input => expect(computeAccessibleName($input[0])).to.equal('Hue in degrees'));
    cy.contains('label', 'Hue in degrees').realClick();
    input()
      .should('have.focus')
      .and('have.attr', 'aria-describedby', 'help')
      .and('have.attr', 'aria-valuetext', '210 degrees');
  });
  scenario(3, 'R3.16 aria-labelledby native naming, generated unique ids and named group', () => {
    render(
      <>
        <span id="hue-label">Hue channel</span>
        <ColorSlider aria-labelledby="hue-label" root={{ 'aria-label': 'Color selection' }} />
        <ColorSlider aria-label="Second hue" />
      </>,
    );
    cy.get('.fui-ColorSlider__input').then($inputs => {
      expect($inputs[0].id).to.match(/^slider-/);
      expect($inputs[1].id).not.to.equal($inputs[0].id);
      expect(computeAccessibleName($inputs[0])).to.equal('Hue channel');
    });
  });
  scenario(3, 'R3.17 native form name value participation without invented HSV inputs', () => {
    render(
      <form id="form">
        <ColorSlider id="slider" aria-label="Hue" name="hue" color={initial} />
      </form>,
    );
    cy.get<HTMLFormElement>('#form').then($form => expect(new FormData($form[0]).get('hue')).to.equal('210'));
    input().should('have.attr', 'name', 'hue');
  });
  scenario(3, 'R3.18 native keydown preventDefault blocks browser range update and onChange', () => {
    render(<Slider onKeyDown={event => event.preventDefault()} onChange={cy.stub().as('change')} />);
    key('ArrowRight');
    selected(initial);
    input().should('have.value', '210');
    cy.get('@change').should('not.have.been.called');
  });
  scenario(3, 'R3.19 native focus blur and input callbacks are composed with real keyboard change', () => {
    render(
      <Slider
        onFocus={cy.stub().as('focus')}
        onBlur={cy.stub().as('blur')}
        onInput={cy.stub().as('input')}
        onChange={cy.stub().as('change')}
      />,
    );
    key('ArrowRight');
    cy.get('#after').focus();
    cy.get('@focus').should('have.been.calledOnce');
    cy.get('@blur').should('have.been.calledOnce');
    cy.get('@input').should('have.been.calledOnce');
    callback({ ...initial, h: 211 }, 1);
  });
  const HookSlider = ({ base = false, ...props }: ColorSliderProps & { base?: boolean }) => {
    const ref = React.useRef<HTMLInputElement>(null);
    const fullState = useColorSlider_unstable(props, ref);
    const baseState = useColorSliderBase_unstable(props, ref);
    const state = base ? { ...baseState, shape: undefined } : fullState;
    useColorSliderStyles_unstable(state);
    return renderColorSlider_unstable(state);
  };
  for (const base of [false, true]) {
    scenario(3, `R3.20 public ${base ? 'base' : 'full'} hook styles render composition real input and callback`, () => {
      render(
        <HookSlider
          base={base}
          id="slider"
          aria-label="Hue"
          defaultColor={initial}
          onChange={cy.stub().as('change')}
        />,
      );
      key('ArrowRight');
      input().should('have.value', '211').and('have.class', colorSliderClassNames.input);
      geometry(211, 'hue');
      callback({ h: 211, s: 0, v: 0, a: 1 }, 1);
    });
  }
  for (const [contextShape, ownShape, expected] of [
    [undefined, undefined, '4px'],
    ['square', undefined, '0px'],
    ['square', 'rounded', '4px'],
    ['rounded', 'square', '0px'],
  ] as const) {
    scenario(
      3,
      `R3.21 shape context ${contextShape ?? 'default'} own ${ownShape ?? 'omitted'} unit-derived precedence`,
      () => {
        render(
          <ColorPickerProvider value={{ color: initial, shape: contextShape, requestChange: cy.stub().as('change') }}>
            <ColorSlider id="slider" aria-label="Hue" shape={ownShape} />
          </ColorPickerProvider>,
        );
        cy.get('.fui-ColorSlider__rail').should('have.css', 'border-radius', expected);
        key('ArrowRight');
        callback({ ...initial, h: 211 }, 1);
        input().should('have.value', '210');
      },
    );
  }
  for (const channel of channels) {
    for (const endpoint of ['Home', 'End'] as const) {
      scenario(1, `R1.04 ${channel} ${endpoint} exact limit and repeat does not notify`, () => {
        render(<Slider channel={channel} onChange={cy.stub().as('change')} />);
        key(endpoint);
        const value = endpoint === 'Home' ? 0 : maximum(channel);
        selected(changed(channel, value));
        input().should('have.value', String(value));
        geometry(value, channel);
        cy.realPress(endpoint);
        cy.realPress(endpoint === 'Home' ? 'ArrowLeft' : 'ArrowRight');
        callback(changed(channel, value), 1);
      });
    }
    scenario(1, `R1.05 ${channel} frozen controlled input reports request but retains color`, () => {
      render(<Slider channel={channel} frozen onChange={cy.stub().as('change')} />);
      key('ArrowRight');
      input().should('have.value', String(valueOf(channel)));
      selected(initial);
      callback(changed(channel, valueOf(channel) + 1), 1);
      geometry(valueOf(channel), channel);
    });
  }
  scenario(1, 'R1.06 native Tab and ShiftTab order and visible keyboard focus', () => {
    render(<Slider />);
    cy.get('#before').focus();
    cy.realPress('Tab');
    input().should('have.focus');
    cy.get('.fui-ColorSlider__thumb').should('have.css', 'border-top-width', '2px');
    cy.realPress('Tab');
    cy.get('#replace').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    input().should('have.focus');
  });
  scenario(1, 'R1.07 disabled native range skips Tab rejects keyboard and pointer', () => {
    render(<Slider disabled onChange={cy.stub().as('change')} />);
    input().should('be.disabled');
    cy.get('#before').focus();
    cy.realPress('Tab');
    cy.get('#replace').should('have.focus');
    input().realClick();
    cy.realPress('ArrowRight');
    input().should('have.value', '210').and('not.have.focus');
    cy.get('@change').should('not.have.been.called');
  });
  scenario(1, 'R1.08 forwardRef points to focusable input not group', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<ColorSlider ref={ref} id="slider" aria-label="Hue" />);
    input().then($input => {
      expect(ref.current).to.equal($input[0]);
      assertElement(ref.current, 'required forwarded slider input');
      ref.current.focus();
    });
    input().should('have.focus');
  });

  const pointer = (
    fraction: number,
    vertical = false,
    dir: 'ltr' | 'rtl' = 'ltr',
    action: 'click' | 'down' | 'move' | 'up' = 'click',
  ) =>
    input().then($input => {
      expect($input, 'required slider input for pointer geometry').to.have.length(1);
      const rect = $input[0].getBoundingClientRect();
      const position = vertical ? (dir === 'rtl' ? fraction : 1 - fraction) : dir === 'rtl' ? 1 - fraction : fraction;
      const x = vertical ? rect.width / 2 : 8 + (rect.width - 16) * position;
      const y = vertical ? 8 + (rect.height - 16) * position : rect.height / 2;
      if (action === 'down') {
        return input().realMouseDown({ x, y, scrollBehavior: false });
      }
      if (action === 'move') {
        const coordinates = getCypressElementCoordinates($input, { x, y }, false);
        return Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchMouseEvent',
          params: { type: 'mouseMoved', x: coordinates.x, y: coordinates.y, button: 'left', buttons: 1 },
        });
      }
      if (action === 'up') {
        return input().realMouseUp({ x, y, scrollBehavior: false });
      }
      return input().realClick({ x, y, scrollBehavior: false });
    });
  for (const channel of channels) {
    for (const arrow of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'] as const) {
      scenario(2, `R2.01 ${channel} RTL horizontal ${arrow} physical native direction`, () => {
        render(<Slider channel={channel} onChange={cy.stub().as('change')} />, 'rtl');
        key(arrow);
        const value = valueOf(channel) + (arrow === 'ArrowLeft' || arrow === 'ArrowUp' ? 1 : -1);
        selected(changed(channel, value));
        callback(changed(channel, value), 1);
        geometry(value, channel, false, 'rtl');
      });
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      scenario(2, `R2.02 ${channel} ${dir} vertical all four native arrows and exact Home End limits`, () => {
        render(<Slider channel={channel} vertical onChange={cy.stub().as('change')} />, dir);
        input()
          .should('have.attr', 'aria-orientation', 'vertical')
          .and('have.css', 'writing-mode', 'vertical-lr')
          .and('have.css', 'direction', dir === 'ltr' ? 'rtl' : 'ltr');
        let count = 0;
        let value = valueOf(channel);
        for (const arrow of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const) {
          key(arrow);
          const increment =
            arrow === 'ArrowRight' ||
            (arrow === 'ArrowUp' && dir === 'ltr') ||
            (arrow === 'ArrowDown' && dir === 'rtl');
          value += increment ? 1 : -1;
          const expected = changed(channel, value);
          selected(expected);
          callback(expected, ++count);
          geometry(value, channel, true, dir);
        }
        key('Home');
        callback(changed(channel, 0), ++count);
        geometry(0, channel, true, dir);
        cy.realPress('Home');
        callback(changed(channel, 0), count);
        key('End');
        callback(changed(channel, maximum(channel)), ++count);
        geometry(maximum(channel), channel, true, dir);
        cy.realPress('End');
        callback(changed(channel, maximum(channel)), count);
        if (dir === 'rtl') {
          evidence({
            kind: 'functional-baseline',
            scenario: Cypress.currentTest.title,
            classification: 'griffel-rtl-flips-vertical-native-direction-but-thumb-remains-bottom-based',
          });
        }
      });
    }
    for (const page of ['PageUp', 'PageDown'] as const) {
      scenario(2, `R2.03 ${channel} ${page} native ten-percent large step`, () => {
        render(<Slider channel={channel} onChange={cy.stub().as('change')} />);
        key(page);
        const value = valueOf(channel) + (maximum(channel) / 10) * (page === 'PageUp' ? 1 : -1);
        selected(changed(channel, value));
        callback(changed(channel, value), 1);
        geometry(value, channel);
      });
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const vertical of [false, true]) {
        scenario(
          2,
          `R2.04 ${channel} ${dir} ${vertical ? 'vertical' : 'horizontal'} real quarter click and endpoint drag`,
          () => {
            render(
              <Slider
                channel={channel}
                vertical={vertical}
                style={vertical ? { minHeight: 416 } : { width: 416 }}
                onChange={cy.stub().as('change')}
              />,
              dir,
            );
            pointer(0.25, vertical, dir);
            const quarter = maximum(channel) / 4;
            selected(changed(channel, quarter));
            callback(changed(channel, quarter), 1);
            geometry(quarter, channel, vertical, dir);
            pointer(0.25, vertical, dir, 'down');
            pointer(0.75, vertical, dir, 'move');
            const threeQuarters = maximum(channel) * 0.75;
            selected(changed(channel, threeQuarters));
            callback(changed(channel, threeQuarters), 2);
            pointer(1.1, vertical, dir, 'move');
            selected(changed(channel, maximum(channel)));
            callback(changed(channel, maximum(channel)), 3);
            geometry(maximum(channel), channel, vertical, dir);
            pointer(-0.1, vertical, dir, 'move');
            pointer(-0.1, vertical, dir, 'up');
            selected(changed(channel, 0));
            callback(changed(channel, 0), 4);
            geometry(0, channel, vertical, dir);
          },
        );
      }
    }
    scenario(
      2,
      `R2.05 ${channel} supported native min max step constrain keyboard but progress remains channel based`,
      () => {
        const start = { ...initial, [field[channel]]: channel === 'hue' ? 50 : 0.5 };
        render(
          <Slider channel={channel} color={start} min={20} max={80} step={10} onChange={cy.stub().as('change')} />,
        );
        input().should('have.attr', 'min', '20').and('have.attr', 'max', '80').and('have.attr', 'step', '10');
        key('ArrowRight');
        const first = changed(channel, 60, start);
        selected(first);
        callback(first, 1);
        geometry(60, channel);
        key('Home');
        callback(changed(channel, 20, start), 2);
        key('End');
        callback(changed(channel, 80, start), 3);
        input().should('have.value', '80');
        geometry(80, channel);
        cy.then(() => {
          render(
            <ColorSlider
              id="slider"
              aria-label={channel}
              channel={channel}
              color={{ h: 0, s: 0, v: 0, a: 0 }}
              min={20}
              max={80}
            />,
          );
          input().should('have.value', '20').and('have.attr', 'value', '0');
          geometry(0, channel);
          evidence({
            kind: 'functional-baseline',
            scenario: Cypress.currentTest.title,
            classification: 'native-min-sanitizes-input-but-channel-based-progress-remains-zero',
            nativeValue: 20,
            reactValue: 0,
          });
        });
      },
    );
    scenario(2, `R2.06 ${channel} fractional native step retains exact numeric callback`, () => {
      render(<Slider channel={channel} step={0.5} onChange={cy.stub().as('change')} />);
      key('ArrowRight');
      const value = valueOf(channel) + 0.5;
      selected(changed(channel, value));
      callback(changed(channel, value), 1);
      input().should('have.value', String(value));
      geometry(value, channel);
    });
    scenario(2, `R2.07 ${channel} uncontrolled defaultColor initial value and current callback baseline`, () => {
      render(
        <ColorSlider
          id="slider"
          aria-label={channel}
          channel={channel}
          defaultColor={initial}
          onChange={cy.stub().as('change')}
        />,
      );
      input().should('have.value', String(valueOf(channel)));
      geometry(valueOf(channel), channel);
      key('ArrowRight');
      const value = valueOf(channel) + 1;
      input().should('have.value', String(value));
      callback({ h: 0, s: 0, v: 0, a: 1, [field[channel]]: channel === 'hue' ? value : value / 100 }, 1);
      evidence({
        kind: 'functional-baseline',
        scenario: Cypress.currentTest.title,
        classification: 'uncontrolled-callback-spreads-hsvColor-not-currentColor',
        initial,
        expectedCallback: { h: 0, s: 0, v: 0, a: 1, [field[channel]]: channel === 'hue' ? value : value / 100 },
      });
      geometry(value, channel);
    });
  }

  const gradients = (channel: ColorChannel, dir: 'ltr' | 'rtl', vertical = false) =>
    input()
      .parent()
      .find('.fui-ColorSlider__rail')
      .should($rail => {
        expect($rail, 'required slider rail for gradient styles').to.have.length(1);
        const root = $rail[0].parentElement;
        assertElement(root, 'required slider root for gradient styles');
        const thumb = root.querySelector<HTMLElement>('.fui-ColorSlider__thumb');
        assertElement(thumb, 'required slider thumb for gradient styles');
        const style = getComputedStyle($rail[0]);
        const direction = vertical ? '180deg' : dir === 'ltr' ? '-90deg' : '90deg';
        expect(root.style.getPropertyValue(colorSliderCSSVars.sliderDirectionVar)).to.equal(direction);
        expect(style.backgroundImage).to.equal(
          channel === 'hue'
            ? `linear-gradient(${
                vertical ? '' : `${direction}, `
              }rgb(255, 0, 0), rgb(255, 0, 255), rgb(0, 0, 255), rgb(0, 255, 255), rgb(0, 255, 0), rgb(255, 255, 0), rgb(255, 0, 0))`
            : `linear-gradient(to ${dir === 'ltr' ? 'right' : 'left'}, ${
                channel === 'saturation' ? 'rgb(128, 128, 128)' : 'rgb(0, 0, 0)'
              }, rgb(0, 128, 255))`,
        );
        expect(style.pointerEvents).to.equal('none');
        expect(style.forcedColorAdjust).to.equal('none');
        expect(getComputedStyle(thumb).pointerEvents).to.equal('none');
      })
      .then($rail => {
        if (vertical && channel !== 'hue') {
          expect($rail, 'required slider rail for gradient evidence').to.have.length(1);
          evidence({
            kind: 'functional-baseline',
            scenario: Cypress.currentTest.title,
            classification: 'vertical-saturation-value-rail-gradient-remains-horizontal',
            backgroundImage: getComputedStyle($rail[0]).backgroundImage,
          });
        }
      });
  type PixelSample = { x: number; y: number; expected: number[]; actual: number[] };
  const pixels = (channel: ColorChannel, dir: 'ltr' | 'rtl', vertical: boolean, name: string) =>
    input()
      .parent()
      .find('.fui-ColorSlider__rail')
      .then($rail => {
        expect($rail, 'required slider rail for pixel geometry').to.have.length(1);
        const rail = $rail[0];
        const rect = rail.getBoundingClientRect();
        const coordinates = getCypressElementCoordinates($rail, 'topLeft', false);
        const samples = [0.1, 0.25, 0.9].map(fraction => {
          const verticalHue = vertical && channel === 'hue';
          const localX = verticalHue ? rect.width / 2 : rect.width * fraction;
          const localY = verticalHue ? rect.height * fraction : rect.height * 0.25;
          const x = coordinates.x + localX * coordinates.frameScale;
          const y = coordinates.y + localY * coordinates.frameScale;
          const renderedFraction = verticalHue
            ? (Math.floor(y) + 0.5 - coordinates.y) / (rect.height * coordinates.frameScale)
            : (Math.floor(x) + 0.5 - coordinates.x) / (rect.width * coordinates.frameScale);
          const colorFraction = verticalHue
            ? 1 - renderedFraction
            : dir === 'rtl'
            ? 1 - renderedFraction
            : renderedFraction;
          const rgb = tinycolor({ h: 360 * colorFraction, s: 1, v: 1 }).toRgb();
          const expected =
            channel === 'hue'
              ? [rgb.r, rgb.g, rgb.b]
              : [0, 128, 255].map(end => {
                  const start = channel === 'saturation' ? 128 : 0;
                  return Math.round(start + (end - start) * colorFraction);
                });
          return { x, y, expected };
        });
        return cy
          .then<{ data: string }>(() =>
            Cypress.automation('remote:debugger:protocol', {
              command: 'Page.captureScreenshot',
              params: { format: 'png', fromSurface: true },
            }),
          )
          .then(({ data }) =>
            cy.writeFile(`${evidenceRoot}/${name}.png`, data, 'base64', { log: false }).then(() =>
              cy
                .window()
                .then(
                  win =>
                    new Promise<PixelSample[]>((resolve, reject) => {
                      const image = new Image();
                      image.onerror = () => reject(new Error('CDP screenshot decoding failed'));
                      image.onload = () => {
                        const canvas = win.document.createElement('canvas');
                        canvas.width = image.naturalWidth;
                        canvas.height = image.naturalHeight;
                        const context = canvas.getContext('2d');
                        if (!context) {
                          reject(new Error('Missing screenshot decoding context'));
                          return;
                        }
                        context.drawImage(image, 0, 0);
                        resolve(
                          samples.map(sample => {
                            expect(sample.x).to.be.within(0, canvas.width - 1);
                            expect(sample.y).to.be.within(0, canvas.height - 1);
                            return {
                              ...sample,
                              actual: Array.from(
                                context.getImageData(Math.floor(sample.x), Math.floor(sample.y), 1, 1).data,
                              ),
                            };
                          }),
                        );
                      };
                      image.src = `data:image/png;base64,${data}`;
                    }),
                )
                .then(measured => {
                  paintedTitles.push(Cypress.currentTest.title);
                  evidence({
                    kind: 'pixels',
                    name,
                    scenario: Cypress.currentTest.title,
                    channel,
                    dir,
                    vertical,
                    backgroundImage: getComputedStyle(rail).backgroundImage,
                    rail: { width: rect.width, height: rect.height },
                    tolerancePerRgbChannel: 4,
                    samples: measured,
                  });
                  expect(measured).to.have.length(3);
                  measured.forEach(sample => {
                    expect(sample.actual).to.have.length(4);
                    expect(sample.actual[3], 'opaque painted rail').to.equal(255);
                    sample.expected.forEach((expected, index) =>
                      expect(sample.actual[index], `painted pixel ${index}`).to.be.closeTo(expected, 4),
                    );
                  });
                }),
            ),
          );
      });
  for (const channel of channels) {
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const vertical of [false, true]) {
        scenario(
          4,
          `R4.01 ${channel} ${dir} ${
            vertical ? 'vertical' : 'horizontal'
          } computed gradient painted pixels thumb and live color updates`,
          () => {
            render(
              <Slider channel={channel} vertical={vertical} style={vertical ? { minHeight: 416 } : { width: 416 }} />,
              dir,
            );
            gradients(channel, dir, vertical);
            geometry(valueOf(channel), channel, vertical, dir);
            pixels(channel, dir, vertical, `gradient-${channel}-${dir}-${vertical ? 'vertical' : 'horizontal'}`);
            cy.get('#replace').click();
            input().should('have.value', String(valueOf(channel, replacement)));
            geometry(valueOf(channel, replacement), channel, vertical, dir);
            cy.get('.fui-ColorSlider__thumb').should(
              'have.css',
              'background-color',
              channel === 'hue' ? 'rgb(0, 255, 0)' : 'rgba(115, 153, 115, 0.8)',
            );
            if (channel !== 'hue') {
              input()
                .parent()
                .find('.fui-ColorSlider__rail')
                .should(
                  'have.css',
                  'background-image',
                  `linear-gradient(to ${dir === 'ltr' ? 'right' : 'left'}, ${
                    channel === 'saturation' ? 'rgb(128, 128, 128)' : 'rgb(0, 0, 0)'
                  }, rgb(0, 255, 0))`,
                );
            }
          },
        );
      }
    }
    scenario(4, `R4.02 ${channel} dark theme preserves gradient pixels native focus and exact numeric feedback`, () => {
      render(<Slider channel={channel} style={{ width: 416 }} onChange={cy.stub().as('change')} />, 'ltr', true);
      gradients(channel, 'ltr');
      pixels(channel, 'ltr', false, `dark-${channel}`);
      cy.get('#before').focus();
      cy.realPress('Tab');
      input().should('have.focus');
      cy.get('.fui-ColorSlider__thumb').should('have.css', 'border-top-width', '2px');
      cy.realPress('ArrowRight');
      callback(changed(channel, valueOf(channel) + 1), 1);
    });
    scenario(4, `R4.03 ${channel} external replacement refreshes HSL rail thumb progress without callback`, () => {
      render(<Slider channel={channel} onChange={cy.stub().as('change')} />);
      cy.get('#replace').click();
      input().should('have.value', String(valueOf(channel, replacement)));
      selected(replacement);
      cy.get('@change').should('not.have.been.called');
      input()
        .parent()
        .should($root => {
          expect($root[0].style.getPropertyValue(colorSliderCSSVars.thumbColorVar)).to.equal(
            channel === 'hue' ? 'hsl(120, 100%, 50%)' : 'hsla(120, 15.79%, 52.5%, 0.8)',
          );
          expect($root[0].style.getPropertyValue(colorSliderCSSVars.railColorVar)).to.equal(
            channel === 'hue' ? 'hsl(120, 15.789473684210517%, 52.5%)' : 'hsl(120, 100%, 50%)',
          );
        });
      geometry(valueOf(channel, replacement), channel);
    });
  }
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const vertical of [false, true]) {
      scenario(
        4,
        `R4.04 ${dir} ${
          vertical ? 'vertical' : 'horizontal'
        } real forced-colors preserves all channel pixels and keyboard indicator`,
        () => {
          cy.then(() =>
            Cypress.automation('remote:debugger:protocol', {
              command: 'Emulation.setEmulatedMedia',
              params: { features: [{ name: 'forced-colors', value: 'active' }] },
            }),
          );
          for (const channel of channels) {
            cy.then(() => {
              render(
                <Slider
                  channel={channel}
                  vertical={vertical}
                  style={vertical ? { minHeight: 416 } : { width: 416 }}
                  onChange={cy.stub().as('change')}
                />,
                dir,
              );
              cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
              gradients(channel, dir, vertical);
              pixels(channel, dir, vertical, `forced-${channel}-${dir}-${vertical ? 'vertical' : 'horizontal'}`);
              cy.get('#before').focus();
              cy.realPress('Tab');
              input().should('have.focus');
              cy.get('.fui-ColorSlider__thumb')
                .should('have.css', 'forced-color-adjust', 'none')
                .and('have.css', 'border-top-width', '2px');
              cy.realPress('Home');
              callback(changed(channel, 0), 1);
              geometry(0, channel, vertical, dir);
              if (channel !== 'value') {
                audit('axe-checkpoint');
              }
            });
          }
        },
      );
    }
  }
  for (const channel of ['hue', 'saturation'] as const) {
    scenario(4, `R4.05 ${channel} unit-derived valid HSL syntax and omitted alpha normalizes to one`, () => {
      render(
        <ColorSlider
          id="slider"
          aria-label={channel}
          channel={channel}
          color={{ h: 0, s: 1, v: 1 }}
          onChange={cy.stub().as('change')}
        />,
      );
      input()
        .parent()
        .should($root => {
          expect($root[0].style.getPropertyValue(colorSliderCSSVars.thumbColorVar)).to.equal(
            channel === 'hue' ? 'hsl(0, 100%, 50%)' : 'hsla(0, 100%, 50%, 1)',
          );
          expect($root[0].style.getPropertyValue(colorSliderCSSVars.railColorVar)).to.equal('hsl(0, 100%, 50%)');
        });
      cy.get('.fui-ColorSlider__thumb').should('have.css', 'background-color', 'rgb(255, 0, 0)');
      key(channel === 'hue' ? 'ArrowRight' : 'ArrowLeft');
      callback(channel === 'hue' ? { h: 1, s: 1, v: 1, a: 1 } : { h: 0, s: 0.99, v: 1, a: 1 }, 1);
      cy.then(() => {
        render(
          <ColorSlider
            id="slider"
            aria-label={channel}
            channel={channel}
            color={{ h: 0, s: 1, v: 1, a: 0 }}
            onChange={cy.stub().as('transparent')}
          />,
        );
        key(channel === 'hue' ? 'ArrowRight' : 'ArrowLeft');
        callback(channel === 'hue' ? { h: 1, s: 1, v: 1, a: 0 } : { h: 0, s: 0.99, v: 1, a: 0 }, 1, '@transparent');
        cy.get('.fui-ColorSlider__thumb').should(
          'have.css',
          'background-color',
          channel === 'hue' ? 'rgb(255, 0, 0)' : 'rgba(255, 0, 0, 0)',
        );
      });
    });
  }
  scenario(4, 'R4.06 custom style hook and supported CSS size variables preserve native interaction', () => {
    function isSliderState(value: unknown): value is ColorSliderState {
      return typeof value === 'object' && value !== null && 'root' in value && 'input' in value && 'channel' in value;
    }
    const hooks: FluentProviderCustomStyleHooks = {
      ['useColorSliderStyles_unstable']: state => {
        if (!isSliderState(state)) {
          throw new Error('Expected ColorSlider state');
        }
        state.root.style = { ...state.root.style, border: '3px solid rgb(1, 2, 3)' };
        state.root.title = 'Custom style applied';
      },
    };
    render(
      <FluentProvider theme={webLightTheme} customStyleHooks_unstable={hooks}>
        <Slider
          style={{
            width: 416,
            ...{ [colorSliderCSSVars.thumbSizeVar]: '28px', [colorSliderCSSVars.railSizeVar]: '12px' },
          }}
          onChange={cy.stub().as('change')}
        />
      </FluentProvider>,
    );
    input().parent().should('have.css', 'border-top-width', '3px').and('have.attr', 'title', 'Custom style applied');
    cy.get('.fui-ColorSlider__thumb').should('have.css', 'width', '28px');
    cy.get('.fui-ColorSlider__rail').should('have.css', 'height', '12px');
    key('ArrowRight');
    callback({ ...initial, h: 211 }, 1);
  });
  scenario(4, 'R4.07 disabled to enabled rerender retains color and latest handler and ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    const oldChange = cy.stub().as('old');
    const newChange = cy.stub().as('new');
    const Toggle = () => {
      const [disabled, setDisabled] = React.useState(true);
      return (
        <>
          <ColorSlider
            ref={ref}
            id="slider"
            aria-label="Hue"
            color={initial}
            disabled={disabled}
            onChange={disabled ? oldChange : newChange}
          />
          <button id="enable" onClick={() => setDisabled(false)}>
            Enable
          </button>
        </>
      );
    };
    render(<Toggle />);
    input()
      .should('be.disabled')
      .then($input => expect(ref.current).to.equal($input[0]));
    cy.get('#enable').click();
    input().should('not.be.disabled');
    key('ArrowRight');
    callback({ ...initial, h: 211 }, 1, '@new');
    cy.get('@old').should('not.have.been.called');
  });
  scenario(4, 'R4.08 uncontrolled defaultColor rerender is not reset, channel rerender uses stored HSV', () => {
    const Toggle = () => {
      const [updated, setUpdated] = React.useState(false);
      return (
        <>
          <ColorSlider
            id="slider"
            aria-label="Color channel"
            defaultColor={updated ? replacement : initial}
            channel={updated ? 'saturation' : 'hue'}
            onChange={cy.stub().as('change')}
          />
          <button id="update" onClick={() => setUpdated(true)}>
            Update default and channel
          </button>
        </>
      );
    };
    render(<Toggle />);
    input().should('have.value', '210');
    cy.get('#update').click();
    input().should('have.value', '50').and('have.attr', 'max', '100');
    key('ArrowRight');
    input().should('have.value', '51');
    callback({ h: 0, s: 0.51, v: 0, a: 1 }, 1);
  });
  scenario(4, 'R4.09 native step five floating-point controlled saturation emits exact duplicate baseline', () => {
    render(<Slider channel="saturation" min={20} max={80} step={5} onChange={cy.stub().as('change')} />);
    key('ArrowRight');
    selected({ ...initial, s: 0.55 });
    input().should('have.value', '55');
    callback({ ...initial, s: 0.55 }, 2);
    cy.get<sinon.SinonStub>('@change').should(stub => {
      expect(stub.firstCall.args[1].color).to.deep.equal({ ...initial, s: 0.55 });
      expect(stub.firstCall.args[0].nativeEvent.type).to.equal('input');
      expect(stub.lastCall.args[0].nativeEvent.type).to.equal('change');
    });
    evidence({
      kind: 'functional-baseline',
      scenario: Cypress.currentTest.title,
      classification: 'controlled-percent-floating-point-native-input-plus-change-duplicate',
      callbacks: 2,
      saturation: 0.55,
    });
  });

  for (const channel of channels) {
    for (const start of [
      { h: 0, s: 0, v: 0, a: 0 },
      { h: 360, s: 1, v: 1, a: 1 },
    ]) {
      scenario(
        1,
        `R1.09 ${channel} explicit ${start.h === 0 ? 'zero black transparent' : 'maximum white opaque'} bounds`,
        () => {
          render(<Slider channel={channel} color={start} onChange={cy.stub().as('change')} />);
          const value = valueOf(channel, start);
          input().should('have.value', String(value));
          geometry(value, channel);
          key(start.h === 0 ? 'Home' : 'End');
          cy.get('@change').should('not.have.been.called');
          key(start.h === 0 ? 'ArrowRight' : 'ArrowLeft');
          callback(changed(channel, value + (start.h === 0 ? 1 : -1), start), 1);
          cy.then(() =>
            expect(start).to.deep.equal(start.h === 0 ? { h: 0, s: 0, v: 0, a: 0 } : { h: 360, s: 1, v: 1, a: 1 }),
          );
        },
      );
    }
    scenario(1, `R1.10 ${channel} controlled without callback remains frozen under trusted native input`, () => {
      render(<ColorSlider id="slider" aria-label={channel} channel={channel} color={initial} />);
      key('ArrowRight');
      input().should('have.value', String(valueOf(channel)));
      geometry(valueOf(channel), channel);
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const vertical of [false, true]) {
        if (dir === 'ltr' && !vertical) {
          continue;
        }
        scenario(
          2,
          `R2.08 ${channel} ${dir} ${vertical ? 'vertical' : 'horizontal'} PageUp PageDown and boundary noops`,
          () => {
            render(<Slider channel={channel} vertical={vertical} onChange={cy.stub().as('change')} />, dir);
            key('PageUp');
            callback(changed(channel, valueOf(channel) + maximum(channel) / 10), 1);
            geometry(valueOf(channel) + maximum(channel) / 10, channel, vertical, dir);
            key('PageDown');
            callback(initial, 2);
            key('End');
            callback(changed(channel, maximum(channel)), 3);
            key('PageUp');
            callback(changed(channel, maximum(channel)), 3);
            key('Home');
            callback(changed(channel, 0), 4);
            key('PageDown');
            callback(changed(channel, 0), 4);
          },
        );
      }
    }
    scenario(
      3,
      `R3.22 ${channel} latest callback closures color channel and native DOM identity across rerender`,
      () => {
        const oldChange = cy.stub().as('old');
        const newChange = cy.stub().as('new');
        const Toggle = () => {
          const [updated, update] = React.useState(false);
          const color = updated ? replacement : initial;
          return (
            <>
              <ColorSlider
                id="slider"
                aria-label={channel}
                channel={channel}
                color={color}
                input={{ onChange: event => (updated ? newChange : oldChange)('slot', event) }}
                onChange={(event, data) => (updated ? newChange : oldChange)('public', event, data)}
              />
              <button id="update" onClick={() => update(true)}>
                Update closures
              </button>
            </>
          );
        };
        let node: HTMLInputElement;
        render(<Toggle />);
        input().then($input => {
          node = $input[0];
        });
        cy.get('#update').click();
        input().should($input => expect($input[0]).to.equal(node));
        key('ArrowRight');
        cy.get('@old').should('not.have.been.called');
        cy.get<sinon.SinonStub>('@new').should(stub => {
          expect(stub.callCount).to.equal(2);
          expect(stub.firstCall.args[0]).to.equal('slot');
          expect(stub.lastCall.args[0]).to.equal('public');
          const event = stub.lastCall.args[1];
          const data = stub.lastCall.args[2];
          expect(stub.firstCall.args[1]).to.equal(event);
          expect(data.event).to.equal(event);
          expect(event.target).to.equal(node);
          expect(event.currentTarget).to.equal(null);
          expect(event.nativeEvent.isTrusted).to.equal(true);
          expect(data.color).not.to.equal(replacement);
          expect(data.color).to.deep.equal(changed(channel, valueOf(channel, replacement) + 1, replacement));
          expect(replacement).to.deep.equal({ h: 120, s: 0.25, v: 0.6, a: 0.8 });
        });
        input().should('have.value', String(valueOf(channel, replacement)));
      },
    );
    scenario(
      3,
      `R3.23 ${channel} disabled and external form association use only native successful-control semantics`,
      () => {
        render(
          <>
            <form id="form" />
            <ColorSlider
              id="slider"
              aria-label={channel}
              channel={channel}
              color={initial}
              name="enabled"
              form="form"
            />
            <ColorSlider
              aria-label="Disabled control"
              channel={channel}
              color={initial}
              name="disabled"
              form="form"
              disabled
            />
            <ColorSlider aria-label="Unnamed control" channel={channel} color={initial} form="form" />
          </>,
        );
        cy.get<HTMLFormElement>('#form').then($form => {
          const entries: [string, FormDataEntryValue][] = [];
          new FormData($form[0]).forEach((value, name) => entries.push([name, value]));
          expect(entries).to.deep.equal([['enabled', String(valueOf(channel))]]);
        });
        input().should($input => expect($input[0].form!.id).to.equal('form'));
      },
    );
  }
  scenario(3, 'R3.24 context replacement selects latest inherited closure color and shape without remount', () => {
    const oldChange = cy.stub().as('old');
    const newChange = cy.stub().as('new');
    const Toggle = () => {
      const [updated, update] = React.useState(false);
      return (
        <>
          <ColorPickerProvider
            value={{
              color: updated ? replacement : initial,
              shape: updated ? 'square' : 'rounded',
              requestChange: updated ? newChange : oldChange,
            }}
          >
            <ColorSlider id="slider" aria-label="Hue" />
          </ColorPickerProvider>
          <button id="update" onClick={() => update(true)}>
            Replace context
          </button>
        </>
      );
    };
    render(<Toggle />);
    cy.get('#update').click();
    input().should('have.value', '120');
    cy.get('.fui-ColorSlider__rail').should('have.css', 'border-radius', '0px');
    key('ArrowRight');
    callback({ ...replacement, h: 121 }, 1, '@new');
    cy.get('@old').should('not.have.been.called');
  });
  scenario(3, 'R3.25 native form reset does not request HSV change or mutate controlled owner', () => {
    render(
      <form id="form">
        <Slider onChange={cy.stub().as('change')} />
      </form>,
    );
    key('ArrowRight');
    callback({ ...initial, h: 211 }, 1);
    cy.get<HTMLFormElement>('#form').then($form => $form[0].reset());
    input().should('have.value', '211');
    selected({ ...initial, h: 211 });
    callback({ ...initial, h: 211 }, 1);
  });
  scenario(4, 'R4.10 exported component hooks styles constants and render identities match public subpath', () => {
    render(<ColorSlider id="slider" aria-label="Hue" />);
    expect(ColorSlider.displayName).to.equal('ColorSlider');
    expect(Object.keys(sliderExports).sort()).to.deep.equal(
      [
        'ColorSlider',
        'colorSliderCSSVars',
        'colorSliderClassNames',
        'renderColorSlider_unstable',
        'useColorSliderBase_unstable',
        'useColorSliderStyles_unstable',
        'useColorSlider_unstable',
      ].sort(),
    );
    for (const name of Object.keys(sliderExports) as (keyof typeof sliderExports)[]) {
      expect(publicExports[name], name).to.equal(sliderExports[name]);
    }
    expect(colorSliderClassNames).to.deep.equal({
      root: 'fui-ColorSlider',
      rail: 'fui-ColorSlider__rail',
      thumb: 'fui-ColorSlider__thumb',
      input: 'fui-ColorSlider__input',
    });
    expect(Object.values(colorSliderCSSVars)).to.deep.equal([
      '--fui-Slider--direction',
      '--fui-Slider--progress',
      '--fui-Slider__thumb--color',
      '--fui-Slider__rail--color',
      '--fui-Slider__thumb--size',
      '--fui-Slider__rail--size',
    ]);
  });
  scenario(
    4,
    'R4.11 full hook keeps input handler identity and observes latest props rather than stale closure',
    () => {
      const handlers: React.ChangeEventHandler<HTMLInputElement>[] = [];
      const oldChange = cy.stub().as('old');
      const newChange = cy.stub().as('new');
      const Probe = ({ updated }: { updated: boolean }) => {
        const ref = React.useRef<HTMLInputElement>(null);
        const state = useColorSlider_unstable(
          {
            id: 'slider',
            'aria-label': 'Channel',
            color: updated ? replacement : initial,
            channel: updated ? 'value' : 'hue',
            onChange: updated ? newChange : oldChange,
          },
          ref,
        );
        handlers.push(state.input.onChange!);
        useColorSliderStyles_unstable(state);
        return renderColorSlider_unstable(state);
      };
      const Toggle = () => {
        const [updated, update] = React.useState(false);
        return (
          <>
            <Probe updated={updated} />
            <button id="update" onClick={() => update(true)}>
              Replace hook props
            </button>
          </>
        );
      };
      render(<Toggle />);
      cy.get('#update').click();
      input().should('have.value', '60').and('have.attr', 'max', '100');
      key('ArrowRight');
      callback({ ...replacement, v: 0.61 }, 1, '@new');
      cy.get('@old').should('not.have.been.called');
      cy.then(() => {
        expect(handlers.length).to.be.greaterThan(1);
        expect(new Set(handlers).size).to.equal(1);
      });
    },
  );
  for (const dir of ['ltr', 'rtl'] as const) {
    scenario(4, `R4.12 ${dir} orientation rerender preserves input ref focus and switches native geometry`, () => {
      const ref = React.createRef<HTMLInputElement>();
      const Toggle = () => {
        const [vertical, update] = React.useState(false);
        return (
          <>
            <ColorSlider
              ref={ref}
              id="slider"
              aria-label="Hue"
              color={initial}
              vertical={vertical}
              onChange={cy.stub().as('change')}
            />
            <button id="orient" onClick={() => update(true)}>
              Orient
            </button>
          </>
        );
      };
      render(<Toggle />, dir);
      let node: HTMLInputElement;
      input().then($input => {
        node = $input[0];
      });
      cy.get('#orient').click();
      input()
        .should('have.attr', 'aria-orientation', 'vertical')
        .then($input => {
          expect($input[0]).to.equal(node);
          expect(ref.current).to.equal(node);
        });
      geometry(210, 'hue', true, dir);
      key('ArrowUp');
      callback({ ...initial, h: dir === 'ltr' ? 211 : 209 }, 1);
      input().should('have.focus');
    });
  }
  scenario(4, 'R4.13 slot input ref overrides forwarded ref and root rail thumb refs target exact elements', () => {
    const forwarded = React.createRef<HTMLInputElement>();
    const slotRef = React.createRef<HTMLInputElement>();
    const root = React.createRef<HTMLDivElement>();
    const rail = React.createRef<HTMLDivElement>();
    const thumb = React.createRef<HTMLDivElement>();
    render(
      <ColorSlider
        ref={forwarded}
        id="slider"
        aria-label="Hue"
        input={{ ref: slotRef }}
        root={{ ref: root }}
        rail={{ ref: rail }}
        thumb={{ ref: thumb }}
      />,
    );
    input().then($input => {
      expect(slotRef.current).to.equal($input[0]);
      expect(forwarded.current).to.equal(null);
      expect(root.current).to.equal($input[0].parentElement);
      assertElement(root.current, 'required slider root ref');
      assertElement(rail.current, 'required slider rail ref');
      assertElement(thumb.current, 'required slider thumb ref');
      expect(rail.current).to.equal(root.current.querySelector('.fui-ColorSlider__rail'));
      expect(thumb.current).to.equal(root.current.querySelector('.fui-ColorSlider__thumb'));
    });
  });
  scenario(4, 'R4.14 root CSS overrides progress and direction without overriding native channel value', () => {
    render(
      <Slider
        style={{
          ...{ [colorSliderCSSVars.sliderProgressVar]: '25%', [colorSliderCSSVars.sliderDirectionVar]: '90deg' },
        }}
        onChange={cy.stub().as('change')}
      />,
    );
    input().should('have.value', '210');
    input()
      .parent()
      .should($root => {
        expect($root[0].style.getPropertyValue(colorSliderCSSVars.sliderProgressVar)).to.equal('25%');
        expect($root[0].style.getPropertyValue(colorSliderCSSVars.sliderDirectionVar)).to.equal('90deg');
      });
    cy.get('.fui-ColorSlider__rail').should(
      'have.css',
      'background-image',
      'linear-gradient(90deg, rgb(255, 0, 0), rgb(255, 0, 255), rgb(0, 0, 255), rgb(0, 255, 255), rgb(0, 255, 0), rgb(255, 255, 0), rgb(255, 0, 0))',
    );
    key('ArrowRight');
    callback({ ...initial, h: 211 }, 1);
    input()
      .parent()
      .should($root => expect($root[0].style.getPropertyValue(colorSliderCSSVars.sliderProgressVar)).to.equal('25%'));
  });
  for (const channel of channels) {
    scenario(4, `R4.15 ${channel} invalid numeric owner lower bound is clamped without mutating owner`, () => {
      const invalid = { ...initial, [field[channel]]: -1 };
      render(<ColorSlider id="slider" aria-label={channel} channel={channel} color={invalid} />);
      input().should('have.attr', 'value', '0').and('have.value', '0');
      geometry(0, channel);
      cy.then(() => expect(invalid[field[channel]]).to.equal(-1));
    });
    scenario(2, `R2.09 ${channel} native zero step falls back to one without changing authored attribute`, () => {
      render(<Slider channel={channel} step={0} onChange={cy.stub().as('change')} />);
      input().should('have.attr', 'step', '0');
      key('ArrowRight');
      callback(changed(channel, valueOf(channel) + 1), 1);
      input().should('have.value', String(valueOf(channel) + 1));
    });
    scenario(2, `R2.10 ${channel} native collapsed min max range has no keyboard or pointer requests`, () => {
      const color = changed(channel, 50);
      render(<Slider channel={channel} color={color} min={50} max={50} onChange={cy.stub().as('change')} />);
      input().should('have.value', '50');
      for (const name of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'PageUp', 'PageDown'] as const) {
        key(name);
      }
      input().realClick();
      input().should('have.value', '50');
      cy.get('@change').should('not.have.been.called');
      geometry(50, channel);
    });
    scenario(4, `R4.16 ${channel} numeric upper bound documents native sanitization versus channel progress`, () => {
      const raw = channel === 'hue' ? 400 : 2;
      const color = { ...initial, [field[channel]]: raw };
      const reactValue = channel === 'hue' ? 360 : 200;
      render(<ColorSlider id="slider" aria-label={channel} channel={channel} color={color} />);
      input()
        .should('have.attr', 'value', String(reactValue))
        .and('have.value', String(maximum(channel)));
      geometry(reactValue, channel);
      cy.then(() => expect(color[field[channel]]).to.equal(raw));
      evidence({
        kind: 'functional-baseline',
        scenario: Cypress.currentTest.title,
        classification: 'channel-actions-call-hue-default-clamp-before-native-range-sanitization',
        raw,
        reactValue,
        nativeValue: maximum(channel),
      });
    });
  }
  scenario(3, 'R3.26 input slot disabled overrides top-level native state and excludes successful form control', () => {
    render(
      <form id="form">
        <ColorSlider
          id="slider"
          aria-label="Hue"
          name="hue"
          disabled={false}
          input={{ disabled: true }}
          onChange={cy.stub().as('change')}
        />
      </form>,
    );
    input().should('be.disabled');
    input().realClick();
    cy.get('@change').should('not.have.been.called');
    cy.get<HTMLFormElement>('#form').then($form => expect(new FormData($form[0]).has('hue')).to.equal(false));
  });
  scenario(
    4,
    'R4.17 exported base unstyled render preserves native semantics without applying full style hooks',
    () => {
      const custom = cy.stub().as('custom');
      const Bare = () => {
        const ref = React.useRef<HTMLInputElement>(null);
        const state = useColorSliderBase_unstable(
          { id: 'slider', 'aria-label': 'Hue', color: initial, onChange: cy.stub().as('change') },
          ref,
        );
        expect('shape' in state).to.equal(false);
        // This case deliberately verifies the still-exported base hook compatibility contract.
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        expect(state.components).to.deep.equal({ input: 'input', rail: 'div', root: 'div', thumb: 'div' });
        return renderColorSlider_unstable(state);
      };
      render(
        <FluentProvider
          theme={webLightTheme}
          customStyleHooks_unstable={{
            ['useColorSliderStyles_unstable']: custom,
          }}
        >
          <Bare />
        </FluentProvider>,
      );
      input().should('have.attr', 'type', 'range').and('not.have.class', colorSliderClassNames.input);
      input().parent().should('have.attr', 'role', 'group').and('not.have.class', colorSliderClassNames.root);
      key('ArrowRight');
      callback({ ...initial, h: 211 }, 1);
      cy.get('@custom').should('not.have.been.called');
    },
  );
});
