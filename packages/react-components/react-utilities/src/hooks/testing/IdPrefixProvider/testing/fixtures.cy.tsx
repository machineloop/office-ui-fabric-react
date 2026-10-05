import * as React from 'react';
import { IdPrefixProvider, useId } from '../../../useId';

export type ProbeProps = {
  name: string;
  prefix?: string;
  provided?: string;
  literal?: boolean;
};

export const Probe: React.FC<ProbeProps> = ({ name, prefix, provided, literal = false }) => {
  const id = useId(prefix, provided);
  const description = useId('description-');
  const panel = useId('panel-');
  const [expanded, setExpanded] = React.useState(false);
  const [value, setValue] = React.useState('');
  const ref = React.useRef<HTMLInputElement>(null);
  if (literal) {
    return (
      <p data-probe={name} data-generated={id}>
        Literal ID: {id}
      </p>
    );
  }
  return (
    <section data-probe={name} data-generated={id}>
      <label htmlFor={id}>{name}</label>
      <input
        ref={ref}
        id={id}
        aria-describedby={description}
        value={value}
        onChange={event => setValue(event.target.value)}
      />
      <p id={description}>Help for {name}</p>
      <button type="button" onClick={() => ref.current?.focus()}>
        Focus {name}
      </button>
      <button type="button" aria-controls={panel} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        Toggle {name}
      </button>
      <div id={panel} hidden={!expanded}>
        Details for {name}
      </div>
    </section>
  );
};

export const Lifecycle: React.FC<{ kind: 'prefix' | 'local' | 'provided' | 'key' | 'order' | 'remove' }> = ({
  kind,
}) => {
  const [changed, setChanged] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const content = (
    <>
      <Probe
        key={kind === 'key' && changed ? 'new' : 'old'}
        name="First"
        prefix={kind === 'local' && changed ? 'custom-' : undefined}
        provided={kind === 'provided' && changed ? 'explicit' : undefined}
      />
      {(kind === 'order' ? (changed ? ['C', 'B', 'A'] : ['A', 'B', 'C']) : ['Second']).map(name => (
        <Probe key={name} name={name} />
      ))}
    </>
  );
  return (
    <IdPrefixProvider value="outer-">
      <button type="button" onClick={() => setTick(tick + 1)}>
        Rerender {tick}
      </button>
      <button type="button" onClick={() => setChanged(!changed)}>
        Change
      </button>
      {kind === 'remove' && changed ? (
        content
      ) : (
        <IdPrefixProvider value={kind === 'prefix' && changed ? 'new-' : 'inner-'}>{content}</IdPrefixProvider>
      )}
    </IdPrefixProvider>
  );
};

export const HookOrder: React.FC = () => {
  const [provided, setProvided] = React.useState<string | undefined>('explicit');
  const first = useId('first-', provided);
  const second = useId('second-');
  const [count, setCount] = React.useState(0);
  return (
    <>
      <Probe name="Accessible control" />
      <p data-first={first} data-second={second}>
        Count {count}
      </p>
      <button type="button" onClick={() => setProvided(provided ? undefined : 'explicit')}>
        Switch ID
      </button>
      <button type="button" onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </>
  );
};
