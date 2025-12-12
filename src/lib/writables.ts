import type { Subscriber, Unsubscriber, Writable } from "svelte/store";

export class WritableBase<T> implements Writable<T> {
    constructor(public data: T) {}

    subscribers = new Set<Subscriber<T>>();

    subscribe(run: Subscriber<T>): Unsubscriber {
        run(this.data);
        this.subscribers.add(run);
        return () => {
            this.subscribers.delete(run);
            if (this.subscribers.size === 0) {
                for (const callback of this._onAllUnsubscribeCallbacks) {
                    callback();
                }
            }
        };
    }

    inform() {
        for (const subscriber of this.subscribers) {
            subscriber(this.data);
        }
    }

    set(value: T): void {
        this.data = value;
        this.inform();
    }

    update(fn: (value: T) => T): void {
        this.set(fn(this.data));
    }

    private _onAllUnsubscribeCallbacks: Set<() => void> = new Set();

    onAllUnsubscribe(_callback: () => void): void {
        this._onAllUnsubscribeCallbacks.add(_callback);
    }
}

export class WritableArray<T> extends WritableBase<T[]> {
    static from<T>(arr: Iterable<T>): WritableArray<T> {
        return new WritableArray(Array.from(arr));
    }


    push(item: T): void {
        this.update((arr) => {
            arr.push(item);
            return arr;
        });
    }

    pop(): T | undefined {
        let poppedItem: T | undefined;
        this.update((arr) => {
            poppedItem = arr.pop();
            return arr;
        });
        return poppedItem;
    }

    shift(): T | undefined {
        let shiftedItem: T | undefined;
        this.update((arr) => {
            shiftedItem = arr.shift();
            return arr;
        });
        return shiftedItem;
    }

    unshift(item: T): void {
        this.update((arr) => {
            arr.unshift(item);
            return arr;
        });
    }

    splice(start: number, deleteCount: number, ...items: T[]): void {
        this.update((arr) => {
            arr.splice(start, deleteCount, ...items);
            return arr;
        });
    }

    clear(): void {
        this.set([]);
    }

    private _sort = (_a: T, _b: T): number => 0;
    private _filter = (_item: T): boolean => true;

    sort(fn: (a: T, b: T) => number): void {
        this._sort = fn;
        this.inform();
    }

    filter(fn: (item: T) => boolean): void {
        this._filter = fn;
        this.inform();
    }

    inform(): void {
        const sortedAndFiltered = this.data
            .filter(this._filter)
            .sort(this._sort);

        for (const subscriber of this.subscribers) {
            subscriber(sortedAndFiltered);
        }
    }

    map<U>(fn: (item: T) => U) {
        return new WritableArray<U>(this.data.map(fn));
    }

    each(fn: (item: T, index: number, arr: T[]) => void): void {
        for (let i = 0; i < this.data.length; i++) {
            fn(this.data[i], i, this.data);
        }
    }

    remove(item: T): void {
        this.update((arr) => {
            const index = arr.indexOf(item);
            if (index !== -1) {
                arr.splice(index, 1);
            }
            return arr;
        });
    }
}