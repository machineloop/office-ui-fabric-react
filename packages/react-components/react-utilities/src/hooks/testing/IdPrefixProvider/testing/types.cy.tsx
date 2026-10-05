import * as React from 'react';
import { IdPrefixProvider } from '../../../../index';

export const valid = [
  <IdPrefixProvider key="string" value="prefix">
    <span>Child</span>
  </IdPrefixProvider>,
  <IdPrefixProvider key="undefined" value={undefined}>
    {null}
  </IdPrefixProvider>,
  <IdPrefixProvider key="empty" value="">
    Text{42}
  </IdPrefixProvider>,
];

// @ts-expect-error ProviderProps requires value.
export const missing = <IdPrefixProvider />;
// @ts-expect-error Numbers are not prefix values.
export const numeric = <IdPrefixProvider value={42} />;
// @ts-expect-error Functions are not prefix values.
export const callable = <IdPrefixProvider value={() => 'prefix'} />;
// @ts-expect-error Objects are not prefix values.
export const object = <IdPrefixProvider value={{ prefix: 'prefix' }} />;
