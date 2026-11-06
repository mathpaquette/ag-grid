import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';

import type { GridApi } from 'ag-grid-community';
import { ClientSideRowModelModule, ColumnAutoSizeModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

describe('column autosize resize queue (React)', () => {
    beforeAll(() => {
        ModuleRegistry.registerModules([ClientSideRowModelModule, ColumnAutoSizeModule]);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    function renderGrid(rowCount: number): Promise<GridApi> {
        const rowData = Array.from({ length: rowCount }, (_, i) => ({ id: String(i), value: i }));
        return new Promise<GridApi>((resolve) => {
            render(
                <AgGridReact
                    columnDefs={[{ field: 'value' }]}
                    rowData={rowData}
                    getRowId={(p) => p.data.id}
                    onGridReady={(e) => resolve(e.api)}
                />
            );
        });
    }

    function countZeroDelayTimersWhile(fn: () => void): number {
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
        act(fn);
        const count = setTimeoutSpy.mock.calls.filter(([, ms]) => !ms).length;
        setTimeoutSpy.mockRestore();
        return count;
    }

    test('many cell value changes in one tick schedule no more timers than a single change', async () => {
        const api = await renderGrid(100);
        const updateRows = (count: number, offset: number) => () => {
            for (let i = 0; i < count; ++i) {
                api.getRowNode(String(i))!.setDataValue('value', offset + i);
            }
        };

        const singleUpdateTimers = countZeroDelayTimersWhile(updateRows(1, 1000));
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
        const manyUpdateTimers = countZeroDelayTimersWhile(updateRows(100, 2000));

        expect(singleUpdateTimers).toBeGreaterThan(0);
        expect(manyUpdateTimers).toBe(singleUpdateTimers);
    });
});
