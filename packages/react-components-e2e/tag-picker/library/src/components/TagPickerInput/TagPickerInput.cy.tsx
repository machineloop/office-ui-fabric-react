import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { Tag } from '@fluentui/react-tags';
import { Field } from '@fluentui/react-field';
import {
  TagPicker,
  TagPickerControl,
  TagPickerGroup,
  TagPickerList,
  TagPickerOption,
} from '@fluentui/react-tag-picker';
import type { TagPickerProps } from '@fluentui/react-tag-picker';
import { TagPickerInput } from './TagPickerInput';
import type { TagPickerInputProps } from './TagPickerInput.types';
import { useTagPickerContext_unstable } from '../../contexts/TagPickerContext';
import { useTagPickerFilter } from '@fluentui/react-tag-picker';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
const input = () => cy.get('#input');
const SelectedTags = () => {
  const values = useTagPickerContext_unstable(context => context.selectedOptions);
  return (
    <TagPickerGroup aria-label="Selected records">
      {values.map(value => (
        <Tag id={`tag-${value}`} key={value} value={value}>
          {value}
        </Tag>
      ))}
    </TagPickerGroup>
  );
};
const Picker = ({
  inputProps,
  ...props
}: Partial<TagPickerProps> & {
  inputProps?: TagPickerInputProps & { ref?: React.Ref<HTMLInputElement> };
}) => (
  <TagPicker {...props}>
    <TagPickerControl>
      <SelectedTags />
      <TagPickerInput id="input" aria-label="Choose records" {...inputProps} />
    </TagPickerControl>
    {!props.noPopover && (
      <TagPickerList>
        <TagPickerOption id="option-Alpha" value="Alpha">
          Alpha
        </TagPickerOption>
        <TagPickerOption id="option-Beta" value="Beta">
          Beta
        </TagPickerOption>
        <TagPickerOption id="option-Gamma" value="Gamma">
          Gamma
        </TagPickerOption>
      </TagPickerList>
    )}
  </TagPicker>
);

describe('TagPickerInput adversarial improvements (final)', () => {
  it('noPopover custom native Enter adds an owner-managed tag and clears the controlled input', () => {
    const Example = () => {
      const [value, setValue] = React.useState('');
      const [selected, setSelected] = React.useState<string[]>([]);
      return (
        <Picker
          noPopover
          selectedOptions={selected}
          inputProps={{
            value,
            onChange: event => setValue(event.currentTarget.value),
            onKeyDown: event => {
              if (event.key === 'Enter' && value) {
                setSelected([...selected, value]);
                setValue('');
              }
            },
          }}
        />
      );
    };
    mount(<Example />);
    input().focus();
    cy.realType('Custom');
    input().realPress('Enter');
    cy.get('#tag-Custom').should('have.text', 'Custom');
    input().should('have.value', '');
    cy.get('.fui-TagPickerList').should('not.exist');
  });

  it('controlled filtering with the real hook highlights/selects a match and handles no-match content', () => {
    const Example = () => {
      const [query, setQuery] = React.useState('');
      const [selected, setSelected] = React.useState<string[]>([]);
      const children = useTagPickerFilter({
        query,
        options: ['Alpha', 'Beta'],
        noOptionsElement: <TagPickerOption value="no-matches">No matches</TagPickerOption>,
        renderOption: value => (
          <TagPickerOption key={value} value={value}>
            {value}
          </TagPickerOption>
        ),
        filter: value => value.toLowerCase().includes(query.toLowerCase()) && !selected.includes(value),
      });
      return (
        <TagPicker
          selectedOptions={selected}
          disableAutoFocus={!query}
          onOptionSelect={(_, data) => {
            if (data.value !== 'no-matches') {
              setSelected(data.selectedOptions);
              setQuery('');
            }
          }}
        >
          <TagPickerControl>
            <SelectedTags />
            <TagPickerInput
              id="input"
              aria-label="Filter records"
              value={query}
              onChange={event => setQuery(event.currentTarget.value)}
            />
          </TagPickerControl>
          <TagPickerList>{children}</TagPickerList>
        </TagPicker>
      );
    };
    mount(<Example />);
    input().focus();
    cy.realType('Bet');
    cy.get('.fui-TagPickerList [role="option"]').should('have.length', 1).and('have.text', 'Beta');
    input().realPress('Enter');
    cy.get('#tag-Beta').should('exist');
    input().should('have.value', '');
    cy.realType('zzz');
    cy.get('.fui-TagPickerList').should('contain.text', 'No matches');
  });

  it('live owner value changes remeasure stretched text after rendering even without native input', () => {
    const Example = () => {
      const [long, setLong] = React.useState(false);
      return (
        <div style={{ width: 220 }}>
          <button onClick={() => setLong(value => !value)}>Toggle text</button>
          <Picker
            noPopover
            defaultSelectedOptions={['Alpha', 'Beta']}
            inputProps={{ value: long ? 'A very long externally assigned record name that must stretch' : '' }}
          />
        </div>
      );
    };
    mount(<Example />);
    cy.contains('button', 'Toggle text').realClick();
    input().should($input =>
      expect($input[0].style.getPropertyValue('--fluent-TagPickerInput__width')).to.equal('100%'),
    );
    cy.contains('button', 'Toggle text').realClick();
    input().should($input => expect($input[0].style.getPropertyValue('--fluent-TagPickerInput__width')).to.equal(''));
  });

  it('stretched native text occupies a new line and stays within actual control width', () => {
    mount(
      <div style={{ width: 220 }}>
        <Picker noPopover defaultSelectedOptions={['Alpha', 'Beta']} />
      </div>,
    );
    input().focus();
    cy.realType('A long name extends beyond remaining space');
    cy.get('.fui-TagPickerControl').then($control => {
      const control = $control[0].getBoundingClientRect();
      cy.get('#tag-Alpha').then($tag => {
        const selected = $tag[0].getBoundingClientRect();
        input().should($input => {
          const rect = $input[0].getBoundingClientRect();
          expect(rect.width).to.be.at.most(control.width);
          expect(rect.top).to.be.greaterThan(selected.bottom);
        });
      });
    });
  });

  it('live disabled/size updates preserve input node and forwarded ref detaches on removal', () => {
    const ref = React.createRef<HTMLInputElement>();
    let initial: HTMLInputElement;
    const Example = () => {
      const [stage, setStage] = React.useState(0);
      return (
        <>
          <button onClick={() => setStage(value => value + 1)}>Next stage</button>
          {stage < 2 && (
            <Picker size={stage === 1 ? 'extra-large' : 'medium'} disabled={stage === 1} inputProps={{ ref }} />
          )}
        </>
      );
    };
    mount(<Example />);
    input().then($input => {
      initial = $input[0] as HTMLInputElement;
    });
    cy.contains('button', 'Next stage').realClick();
    input()
      .should('be.disabled')
      .and('have.css', 'padding-top', '12px')
      .should($input => {
        expect($input[0]).to.equal(initial);
        expect(ref.current).to.equal(initial);
      });
    cy.contains('button', 'Next stage').realClick();
    input()
      .should('not.exist')
      .then(() => expect(ref.current).to.equal(null));
  });
});

describe('TagPickerInput unit-derived contracts (round 3)', () => {
  it('standalone default is a collapsed empty text combobox with no popup controls', () => {
    mount(<TagPickerInput id="input" />);
    input()
      .should('have.value', '')
      .and('have.attr', 'type', 'text')
      .and('have.attr', 'role', 'combobox')
      .and('have.attr', 'aria-expanded', 'false')
      .and('not.have.attr', 'aria-controls');
  });

  it('closed native Enter opens the popup; Escape closes it with focus retained on the input', () => {
    mount(<Picker />);
    input().focus().realPress('Enter');
    input().should('have.attr', 'aria-expanded', 'true').realPress('Escape');
    input().should('have.attr', 'aria-expanded', 'false').and('have.focus').and('not.have.attr', 'aria-controls');
  });

  it('Space while open without typing closes popup; after native typing it inserts text and stays open', () => {
    mount(<Picker disableAutoFocus />);
    input().focus().realPress('ArrowDown');
    input().should('have.attr', 'aria-expanded', 'true').realPress('Space');
    input().should('have.attr', 'aria-expanded', 'false');
    input().realPress('Backspace');
    cy.realType('A');
    input().should('have.attr', 'aria-expanded', 'true').realPress('Space');
    input().should('have.attr', 'aria-expanded', 'true').and('have.value', 'A ');
  });

  it('open popup controls ID resolves to the listbox; noPopover never introduces that relationship', () => {
    mount(<Picker defaultOpen />);
    input()
      .should('have.attr', 'aria-expanded', 'true')
      .invoke('attr', 'aria-controls')
      .then(id => cy.get(`[id="${id}"]`).should('have.attr', 'role', 'listbox'));
    mount(<Picker noPopover defaultOpen />);
    input().should('not.have.attr', 'aria-controls');
  });

  it('props native type/autocomplete and controlled value override context-derived defaults', () => {
    mount(
      <Picker inputProps={{ type: 'search', autoComplete: 'off', value: 'Override', 'aria-label': 'Override name' }} />,
    );
    input()
      .should('have.attr', 'type', 'search')
      .and('have.attr', 'autocomplete', 'off')
      .and('have.value', 'Override')
      .and('have.attr', 'aria-label', 'Override name');
  });

  it('caret at start without a tag group stays in input for ArrowLeft and Backspace', () => {
    mount(<Picker noPopover />);
    input().focus().realPress('ArrowLeft').realPress('Backspace');
    input().should('have.focus');
    cy.get('.fui-TagPickerGroup').should('not.exist');
  });
});

describe('TagPickerInput documented contracts (round 1)', () => {
  it('native typing opens a labelled combobox with real active-descendant selection', () => {
    const select = cy.stub().as('select');
    mount(<Picker onOptionSelect={select} />);
    input()
      .should('have.attr', 'role', 'combobox')
      .and('have.attr', 'type', 'text')
      .and('have.attr', 'aria-expanded', 'false')
      .and('have.value', '');
    input().focus();
    cy.realType('Al');
    input().should('have.value', 'Al').and('have.attr', 'aria-expanded', 'true');
    input()
      .invoke('attr', 'aria-controls')
      .then(id => cy.get(`[id="${id}"]`).should('have.attr', 'role', 'listbox'));
    input().realPress('ArrowDown');
    input()
      .invoke('attr', 'aria-activedescendant')
      .then(id => cy.get(`[id="${id}"]`).should('have.attr', 'role', 'option'));
    input().realPress('Enter');
    cy.get('.fui-TagPickerGroup .fui-Tag').should('have.length', 1);
    cy.get('@select')
      .should('have.been.calledOnce')
      .then(() => {
        const [event, data] = select.firstCall.args;
        expect(event.nativeEvent.isTrusted).to.equal(true);
        expect(data.event).to.equal(event);
        expect(data.selectedOptions).to.deep.equal([data.value]);
      });
  });

  describe('TagPickerInput edges and accessibility (round 2)', () => {
    (['ArrowLeft', 'Backspace'] as const).forEach(key => {
      it(`consumer-cancelled ${key} preserves input focus at the start instead of jumping to tags`, () => {
        mount(
          <Picker defaultSelectedOptions={['Alpha']} inputProps={{ onKeyDown: event => event.preventDefault() }} />,
        );
        input().focus().realPress(key);
        input().should('have.focus');
        cy.get('#tag-Alpha').should('exist');
      });
    });

    it('mid-text cursor movement and selected text do not jump into tag group', () => {
      mount(<Picker defaultSelectedOptions={['Alpha']} inputProps={{ value: 'abcd' }} />);
      input().focus().realPress('End').realPress('ArrowLeft');
      input().should('have.focus').and('have.prop', 'selectionStart', 3);
      input().realPress('Home').realPress(['Shift', 'ArrowRight']);
      input().should('have.prop', 'selectionEnd', 1).realPress('Backspace');
      input().should('have.focus');
    });

    it('Field native required/label and validation/hint relationships resolve to real elements', () => {
      mount(
        <Field
          label={{ children: 'Records', htmlFor: 'input' }}
          required
          validationState="error"
          validationMessage="Select at least one"
          hint="Use Enter"
        >
          <Picker />
        </Field>,
      );
      input().should('have.prop', 'required', true).and('have.attr', 'aria-invalid', 'true');
      input()
        .invoke('attr', 'aria-describedby')
        .then(ids => {
          const elements = ids!.split(' ');
          expect(elements).to.have.length(2);
          cy.get(`[id="${elements[0]}"]`).should('contain.text', 'Select at least one');
          cy.get(`[id="${elements[1]}"]`).should('have.text', 'Use Enter');
        });
      cy.get('.fui-Field__label').realClick();
      input().should('have.focus');
    });

    it('ref, id/native attrs, class/style and readonly are forwarded without mutating text', () => {
      const ref = React.createRef<HTMLInputElement>();
      const change = cy.stub().as('change');
      mount(
        <Picker
          inputProps={{
            ref,
            name: 'records',
            placeholder: 'Choose',
            title: 'Record field',
            className: 'custom-input',
            style: { minWidth: 70 },
            readOnly: true,
            value: 'Fixed',
            onChange: change,
          }}
        />,
      );
      input()
        .should('have.attr', 'name', 'records')
        .and('have.attr', 'placeholder', 'Choose')
        .and('have.attr', 'title', 'Record field')
        .and('have.class', 'custom-input')
        .and('have.css', 'min-width', '70px')
        .should($input => expect(ref.current).to.equal($input[0]));
      input().focus();
      cy.realType('x');
      input().should('have.value', 'Fixed');
      cy.get('@change').should('not.have.been.called');
    });

    it('disabled context excludes input from native Tab while explicit disabled=false overrides it', () => {
      mount(
        <>
          <button id="before">Before</button>
          <Picker disabled />
          <button id="after">After</button>
        </>,
      );
      input().should('be.disabled');
      cy.get('#before').focus().realPress('Tab');
      cy.get('#after').should('have.focus');
      mount(<Picker disabled inputProps={{ disabled: false }} />);
      input().should('not.be.disabled').focus().should('have.focus');
    });

    it('native focus/blur are forwarded with exact targets and close an open popup on outside Tab', () => {
      const focus = cy.stub().as('focus');
      const blur = cy.stub().as('blur');
      mount(
        <>
          <Picker inputProps={{ onFocus: focus, onBlur: blur }} />
          <button id="after">After</button>
        </>,
      );
      input().focus().realPress('ArrowDown');
      input().should('have.attr', 'aria-expanded', 'true').realPress('Tab');
      cy.get('#after').should('have.focus');
      input().should('have.attr', 'aria-expanded', 'false');
      cy.get('@focus').should('have.been.calledOnce');
      cy.get('@blur')
        .should('have.been.calledOnce')
        .then(() => {
          expect(focus.firstCall.args[0].target.id).to.equal('input');
          expect(blur.firstCall.args[0].target.id).to.equal('input');
          expect(blur.firstCall.args[0].relatedTarget.id).to.equal('after');
        });
    });

    it('long text sets input stretch CSS variable and clearing native text removes it', () => {
      mount(
        <div style={{ width: 220 }}>
          <Picker noPopover defaultSelectedOptions={['Alpha', 'Beta']} />
        </div>,
      );
      input().focus();
      cy.realType('Long record name that exceeds the remaining input width');
      input().should($input =>
        expect($input[0].style.getPropertyValue('--fluent-TagPickerInput__width')).to.equal('100%'),
      );
      input().realPress('Escape');
      input().should('have.attr', 'aria-expanded', 'false');
      input().realPress('Home');
      input().should('have.prop', 'selectionStart', 0);
      input().realPress(['Shift', 'End']);
      input().should('have.prop', 'selectionStart', 0);
      input().realPress('Backspace');
      input()
        .should('have.value', '')
        .should($input => expect($input[0].style.getPropertyValue('--fluent-TagPickerInput__width')).to.equal(''));
    });
  });

  (['medium', 'large', 'extra-large'] as const).forEach((size, index) => {
    it(`${size}: picker size, not surrounding Field size, determines input padding`, () => {
      mount(
        <Field label="Records" size="small">
          <Picker size={size} />
        </Field>,
      );
      input()
        .should('have.css', 'padding-top', `${[6, 10, 12][index]}px`)
        .and('have.css', 'padding-bottom', `${[6, 10, 12][index]}px`)
        .and('not.have.attr', 'size');
      input()
        .invoke('attr', 'aria-labelledby')
        .then(id => cy.get(`[id="${id}"]`).should('contain.text', 'Records'));
    });
  });

  (['outline', 'underline', 'filled-darker', 'filled-lighter'] as const).forEach(appearance => {
    it(`${appearance}: native text input remains transparent within contextual control`, () => {
      mount(<Picker appearance={appearance} />);
      input().should('have.css', 'background-color', 'rgba(0, 0, 0, 0)').and('have.css', 'border-top-width', '0px');
      input().focus();
      cy.realType('Beta');
      input().should('have.value', 'Beta');
    });
  });

  (['ArrowLeft', 'Backspace'] as const).forEach(key => {
    it(`${key} at empty input moves to the last tag, then a separate Delete removes it`, () => {
      mount(<Picker defaultSelectedOptions={['Alpha', 'Beta']} />);
      input().focus().realPress(key);
      cy.get('#tag-Beta').should('have.focus');
      cy.get('.fui-TagPickerGroup .fui-Tag').should('have.length', 2);
      cy.get('#tag-Beta').realPress('Delete');
      cy.get('#tag-Beta').should('not.exist');
    });
  });

  it('controlled input value remains frozen despite native change events with exact target/value', () => {
    const changes: Array<{ value: string; trusted: boolean; target: EventTarget }> = [];
    mount(
      <Picker
        inputProps={{
          value: 'Fixed',
          onChange: event =>
            changes.push({
              value: event.currentTarget.value,
              trusted: event.nativeEvent.isTrusted,
              target: event.target,
            }),
        }}
      />,
    );
    input().focus().realPress('End');
    cy.realType('x');
    input()
      .should('have.value', 'Fixed')
      .then($input => {
        expect(changes).to.have.length(1);
        expect(changes[0]).to.deep.equal({ value: 'Fixedx', trusted: true, target: $input[0] });
      });
  });

  it('owner-controlled input accepts native typing and noPopover omits aria-controls', () => {
    const Example = () => {
      const [value, setValue] = React.useState('');
      return <Picker noPopover inputProps={{ value, onChange: event => setValue(event.currentTarget.value) }} />;
    };
    mount(<Example />);
    input().focus();
    cy.realType('Custom record');
    input().should('have.value', 'Custom record').and('not.have.attr', 'aria-controls');
    cy.get('.fui-TagPickerList').should('not.exist');
  });
});
