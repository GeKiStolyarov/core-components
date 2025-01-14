/* eslint-disable react-hooks/exhaustive-deps */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import { useVirtual } from 'react-virtual';
import { OptionsListProps, GroupShape, OptionShape } from '../../typings';
import { Optgroup as DefaultOptgroup } from '../optgroup';
import { isGroup, lastIndexOf, usePrevious, useVisibleOptions } from '../../utils';

import styles from './index.module.css';

export type VirtualOptionsList = OptionsListProps & {
    /**
     * Число отрисованных пунктов до\после видимого окна
     */
    overscan?: number;
};

export const VirtualOptionsList = ({
    size = 's',
    flatOptions = [],
    highlightedIndex = -1,
    className,
    Option,
    open,
    options = [],
    overscan = 10,
    Optgroup = DefaultOptgroup,
    dataTestId,
    emptyPlaceholder,
    visibleOptions = 5,
    onScroll,
}: VirtualOptionsList) => {
    const listRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const [visibleOptionsInvalidateKey, setVisibleOptionsInvalidateKey] = useState(0);
    const prevHighlightedIndex = usePrevious(highlightedIndex) || -1;

    const rowVirtualizer = useVirtual({
        size: flatOptions.length,
        parentRef,
        overscan,
    });

    // Сколл к выбранному пункту при открытии меню
    useEffect(() => {
        if (open) {
            rowVirtualizer.scrollToIndex(highlightedIndex, { align: 'end' });
        }
    }, [open]);

    // Скролл к пункту, которого нет на экране
    useEffect(() => {
        if (highlightedIndex === -1) return;

        if (!rowVirtualizer.virtualItems.some(option => option.index === highlightedIndex)) {
            rowVirtualizer.scrollToIndex(highlightedIndex, { align: 'end' });
        }
    }, [highlightedIndex]);

    // Циклическая навигация
    useEffect(() => {
        const notDisabled = (option: OptionShape) => !option.disabled;
        const firstNonDisabled = flatOptions.findIndex(notDisabled);
        const lastNonDisabled = lastIndexOf(flatOptions, notDisabled);

        if (
            prevHighlightedIndex <= firstNonDisabled &&
            highlightedIndex === flatOptions.length - 1
        ) {
            rowVirtualizer.scrollToIndex(lastNonDisabled);
        }

        if (prevHighlightedIndex >= lastNonDisabled && highlightedIndex === 0) {
            rowVirtualizer.scrollToIndex(0);
        }
    }, [prevHighlightedIndex, highlightedIndex]);

    useEffect(() => {
        setVisibleOptionsInvalidateKey(
            /**
             * react-virtual может несколько раз отрендерить список с одним элементом,
             * поэтому нужно еще раз пересчитать высоту, когда список ВИДИМЫХ пунктов будет отрендерен полностью
             * Также, высоту нужно пересчитывать при изменении ОБЩЕГО кол-ва пунктов меню
             */
            rowVirtualizer.virtualItems.length > 1 ? flatOptions.length : 1,
        );
    }, [rowVirtualizer.virtualItems.length, flatOptions.length]);

    useVisibleOptions({
        visibleOptions,
        invalidate: visibleOptionsInvalidateKey,
        listRef,
        styleTargetRef: parentRef,
        open,
    });

    // Т.к. рендерится плоский список, необходимо знать индекс, когда начинается новая группа
    const groupStartIndexes = useMemo(() => {
        let currentIndex = 0;
        return options.reduce((acc: { [key: number]: number }, option, index) => {
            if (isGroup(option)) {
                acc[currentIndex] = index;
                currentIndex += option.options.length;
            } else {
                currentIndex += 1;
            }
            return acc;
        }, {});
    }, [options]);

    return (
        <div
            className={cn(styles.virtualOptionsList, styles[size], className)}
            ref={parentRef}
            data-test-id={dataTestId}
            onScroll={onScroll}
        >
            <div
                className={styles.inner}
                style={{
                    height: `${rowVirtualizer.totalSize}px`,
                }}
                ref={listRef}
            >
                {rowVirtualizer.virtualItems.map(virtualRow => {
                    const option = flatOptions[virtualRow.index];
                    const group = options[groupStartIndexes[virtualRow.index]] as GroupShape;

                    return (
                        <div
                            key={virtualRow.index}
                            ref={virtualRow.measureRef}
                            className={cn(styles.virtualRow, {
                                [styles.highlighted]: highlightedIndex === virtualRow.index,
                            })}
                            style={{
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {group && <Optgroup label={group.label} />}
                            {!isGroup(option) && Option({ option, index: virtualRow.index })}
                        </div>
                    );
                })}
            </div>

            {emptyPlaceholder && options.length === 0 && (
                <div className={styles.emptyPlaceholder}>{emptyPlaceholder}</div>
            )}
        </div>
    );
};
