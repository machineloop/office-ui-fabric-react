import { FluentProvider } from '@fluentui/react-provider';
import {
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  createTableColumn,
} from '@fluentui/react-table';
import { DataGridCell } from './DataGridCell';
import { TableContextProvider } from '../../contexts/tableContext';
import { DataGridContextProvider } from '../../contexts/dataGridContext';
import { ColumnIdContextProvider } from '../../contexts/columnIdContext';

export const baselineImports = [
  FluentProvider,
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  createTableColumn,
  DataGridCell,
  TableContextProvider,
  DataGridContextProvider,
  ColumnIdContextProvider,
];
