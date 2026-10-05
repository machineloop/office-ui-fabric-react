import * as React from 'react';
import {
  TagPicker,
  TagPickerButton,
  TagPickerControl,
  TagPickerGroup,
  TagPickerInput,
  TagPickerList,
  TagPickerOption,
  TagPickerOptionGroup,
  TagPickerContextProvider,
  useTagPickerContext_unstable,
  useTagPickerButton_unstable,
  useTagPickerButtonBase_unstable,
  useTagPickerButtonStyles_unstable,
  renderTagPickerButton_unstable,
} from '../../../index';
import type {
  TagPickerProps,
  TagPickerButtonProps,
  TagPickerControlProps,
  TagPickerContextValue,
} from '../../../index';
import { Tag, type JSXElement } from '@fluentui/react-components';

export interface RecordedEvent {
  kind: string;
  type: string;
  key?: string;
  trusted: boolean;
  identity?: boolean;
  value?: string;
  selectedOptions?: string[];
  open?: boolean;
  version: number;
  prevented: boolean;
}

export interface HarnessProps {
  picker?: Omit<TagPickerProps, 'children'>;
  button?: TagPickerButtonProps;
  control?: TagPickerControlProps;
  options?: Array<{ value: string; text: string }>;
  selection?: 'controlled' | 'refuse' | 'uncontrolled';
  filter?: boolean;
  grouped?: boolean;
  mixInput?: boolean;
  list?: React.ComponentProps<typeof TagPickerList>;
  onRecord?: (event: RecordedEvent) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

export const fruits = [
  { value: 'apple', text: 'Apple' },
  { value: 'apricot', text: 'Apricot' },
  { value: 'banana', text: 'Banana' },
  { value: 'cherry', text: 'Cherry' },
];

const Selection = (): JSXElement => {
  const selected = useTagPickerContext_unstable(ctx => ctx.selectedOptions);
  return (
    <>
      <output data-selected>{JSON.stringify(selected)}</output>
      <TagPickerGroup aria-label="Selected fruit">
        {selected.map(value => (
          <Tag key={value} value={value}>
            {value}
          </Tag>
        ))}
      </TagPickerGroup>
    </>
  );
};

export const Harness = ({
  picker = {},
  button = {},
  control = {},
  options = fruits,
  selection = 'controlled',
  filter = false,
  grouped = false,
  mixInput = false,
  list = {},
  onRecord,
  buttonRef,
}: HarnessProps): JSXElement => {
  const [selected, setSelected] = React.useState(picker.selectedOptions ?? picker.defaultSelectedOptions ?? []);
  const [version, setVersion] = React.useState(0);
  const [mounted, setMounted] = React.useState(true);
  const [generation, setGeneration] = React.useState(0);
  const [externalOpen, setExternalOpen] = React.useState(picker.open);
  const record = (kind: string, event: React.SyntheticEvent | Event, extra: Partial<RecordedEvent> = {}) => {
    onRecord?.({
      kind,
      type: event.type,
      trusted: 'nativeEvent' in event ? event.nativeEvent.isTrusted : event.isTrusted,
      version,
      prevented: event.defaultPrevented,
      ...('key' in event ? { key: String(event.key) } : {}),
      ...extra,
    });
  };
  const visible = options.filter(option => !filter || !selected.includes(option.value));
  const renderedOptions = visible.map(option => (
    <TagPickerOption key={option.value} data-option={option.value} value={option.value} text={option.text}>
      {option.text}
    </TagPickerOption>
  ));
  return (
    <section data-harness>
      <button data-before type="button">
        Before
      </button>
      {mounted && (
        <TagPicker
          key={generation}
          {...picker}
          open={externalOpen}
          selectedOptions={selection === 'uncontrolled' ? undefined : selected}
          onOpenChange={(event, data) => {
            record('open', event, { open: data.open, identity: data.event === event && data.type === event.type });
            picker.onOpenChange?.(event, data);
          }}
          onOptionSelect={(event, data) => {
            record('select', event, {
              value: data.value,
              selectedOptions: [...data.selectedOptions],
              identity: data.event === event && data.type === event.type,
            });
            if (selection === 'controlled') {
              setSelected(data.selectedOptions);
            }
            picker.onOptionSelect?.(event, data);
          }}
        >
          <TagPickerControl data-control {...control}>
            <Selection />
            <TagPickerButton
              aria-label="Choose fruit"
              data-trigger
              {...button}
              ref={buttonRef}
              onClick={event => {
                record('click', event);
                button.onClick?.(event);
              }}
              onKeyDown={event => {
                record('key', event);
                button.onKeyDown?.(event);
              }}
              onFocus={event => {
                record('focus', event);
                button.onFocus?.(event);
              }}
              onBlur={event => {
                record('blur', event);
                button.onBlur?.(event);
              }}
            />
            {mixInput && <TagPickerInput aria-label="Type fruit" data-mixed-input />}
          </TagPickerControl>
          <TagPickerList aria-label="Fruit choices" data-popup {...list}>
            {grouped ? <TagPickerOptionGroup label="Fruit">{renderedOptions}</TagPickerOptionGroup> : renderedOptions}
          </TagPickerList>
        </TagPicker>
      )}
      <div style={{ marginTop: 400 }}>
        <button data-after type="button">
          After
        </button>
        <button data-version type="button" onClick={() => setVersion(v => v + 1)}>
          Replace callbacks
        </button>
        <button data-reset type="button" onClick={() => setSelected([])}>
          Clear selection
        </button>
        <button data-open type="button" onClick={() => setExternalOpen(true)}>
          Force open
        </button>
        <button data-close type="button" onClick={() => setExternalOpen(false)}>
          Force closed
        </button>
        <button data-unmount type="button" onClick={() => setMounted(false)}>
          Unmount picker
        </button>
        <button
          data-remount
          type="button"
          onClick={() => {
            setGeneration(v => v + 1);
            setMounted(true);
          }}
        >
          Remount picker
        </button>
      </div>
    </section>
  );
};

export const HookButton = React.forwardRef<HTMLButtonElement, TagPickerButtonProps>((props, ref) => {
  const full = useTagPickerButton_unstable(props, ref);
  useTagPickerButtonStyles_unstable(full);
  return renderTagPickerButton_unstable(full);
});
export const BaseButton = React.forwardRef<HTMLButtonElement, TagPickerButtonProps>((props, ref) =>
  renderTagPickerButton_unstable(useTagPickerButtonBase_unstable(props, ref)),
);

export const ContextButton = ({
  context = {},
  props = {},
  base = false,
  hook = false,
  forwardedRef,
}: {
  context?: Partial<TagPickerContextValue>;
  props?: TagPickerButtonProps;
  base?: boolean;
  hook?: boolean;
  forwardedRef?: React.Ref<HTMLButtonElement>;
}): JSXElement => {
  const value: TagPickerContextValue = {
    triggerRef: React.createRef<HTMLButtonElement>(),
    popoverRef: React.createRef<HTMLDivElement>(),
    targetRef: React.createRef<HTMLDivElement>(),
    tagPickerGroupRef: React.createRef<HTMLDivElement>(),
    secondaryActionRef: React.createRef<HTMLSpanElement>(),
    open: false,
    clearSelection: () => undefined,
    getOptionById: () => undefined,
    selectedOptions: [],
    selectOption: () => undefined,
    setHasFocus: () => undefined,
    setOpen: () => undefined,
    setValue: () => undefined,
    value: undefined,
    popoverId: 'context-popup',
    size: 'medium',
    appearance: 'outline',
    disabled: false,
    ...context,
  };
  const ButtonComponent = base ? BaseButton : HookButton;
  return (
    <TagPickerContextProvider value={value}>
      <div id="context-popup" role="listbox" aria-label="Context options">
        <div role="option" aria-selected="false">
          Context option
        </div>
      </div>
      {hook ? (
        <ButtonComponent aria-label="Context button" {...props} ref={forwardedRef} />
      ) : (
        <TagPickerButton aria-label="Context button" {...props} ref={forwardedRef} />
      )}
    </TagPickerContextProvider>
  );
};

export const FormFixture = ({
  type,
  disabled = false,
  record,
}: {
  type?: TagPickerButtonProps['type'];
  disabled?: boolean;
  record: (type: string, trusted: boolean, submitter: Element | null) => void;
}): JSXElement => (
  <form
    onSubmit={event => {
      event.preventDefault();
      record('submit', event.nativeEvent.isTrusted, (event.nativeEvent as SubmitEvent).submitter);
    }}
    onReset={event => record('reset', event.nativeEvent.isTrusted, null)}
  >
    <label htmlFor="form-input">Form field</label>
    <input id="form-input" defaultValue="original" />
    <TagPickerButton
      data-form-button
      aria-label="Form button"
      {...(type === undefined ? {} : { type })}
      disabled={disabled}
    >
      Form action
    </TagPickerButton>
  </form>
);
