import * as React from 'react';
import { VirtualizedList } from '../VirtualizedList';
import { ScrollContainer } from '../../../utilities/scrolling/ScrollContainer';
import { autobind } from 'office-ui-fabric-react/lib/Utilities';

import * as VirtualizedListExampleStylesModule from './VirtualizedList.Example.scss';

interface IItem {
  key: string;
}

const items: IItem[] = [];

const Item = (props: { item: IItem }) => {
  const { item } = props;

  return (
    <div>
      { item.key }
    </div>
  );
};

type ExampleList = new () => VirtualizedList<IItem>;
// tslint:disable-next-line:no-any
const ExampleList: ExampleList = VirtualizedList as any;

export class VirtualizedListBasicExample2 extends React.Component {
  constructor(props: {}) {
    super(props);

    // Populate with items for demos.
    if (items.length === 0) {
      for (let i = 0; i < 2000; i++) {
        items.push({
          key: `Item ${i}`
        });
      }
    }
  }

  public render(): JSX.Element {
    return (
      <div>
        <ScrollContainer scrollDebounceDelay={ 200 } className={ VirtualizedListExampleStylesModule.fixedHeight }>
          <ExampleList
            items={ items }
            itemHeight={ 30 }
            onRenderItem={ this._renderItem }
          />
        </ScrollContainer>
      </div>
    );
  }

  @autobind
  private _renderItem(item: IItem, itemIndex: number): JSX.Element {
    return (
      // tslint:disable-next-line:jsx-ban-props
      <div key={ item.key } style={ { height: 30, border: '1px solid blue' } }>
        <Item item={ item } />
      </div>
    );
  }
}
