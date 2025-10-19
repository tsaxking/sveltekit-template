import type { Subscriber, Unsubscriber, Updater, Writable } from "svelte/store";
import type { Blank, GlobalCols, PartialStructable, Struct } from "./struct";
// import { Table } from "../db/table";


// const ArrStage = new Table('struct_data_arr_staging_stash', {
//     struct: 'string',
//     data: 'unknown',
// });

export class DataArrStage<T extends Blank> implements Writable<PartialStructable<T & GlobalCols>[]> {
    public base: PartialStructable<T & GlobalCols>[];

    constructor(
        public readonly struct: Struct<T>,
        public data: PartialStructable<T & GlobalCols>[],
    ) {
        this.base = JSON.parse(JSON.stringify(data)) as PartialStructable<T & GlobalCols>[];
    }

    private readonly subscribers = new Set<Subscriber<PartialStructable<T & GlobalCols>[]>>();

    subscribe(fn: Subscriber<PartialStructable<T & GlobalCols>[]>): Unsubscriber {
        this.subscribers.add(fn);
        // TODO: Make this sortable and filterable
        fn(this.data);
        return () => this.subscribers.delete(fn);
    }

    set(value: PartialStructable<T & GlobalCols>[]): void {
        this.apply(value);
    }

    apply(value: PartialStructable<T & GlobalCols>[]): void {
        this.data = value;
        this.inform();
    }

    update(updater: Updater<PartialStructable<T & GlobalCols>[]>): void {
        this.apply(updater(this.data));
    }

    inform() {
        const d = this.data.filter(this._filter).sort(this._sort);
        if (this._reverse) {
            d.reverse();
        }
        
        for (const fn of this.subscribers) {
            fn(d);
        }
    }

    private _filter: (item: PartialStructable<T & GlobalCols>) => boolean = () => true;

    set filter(fn: (item: PartialStructable<T & GlobalCols>) => boolean) {
        this._filter = fn;
        this.inform();
    }

    private _sort: (a: PartialStructable<T & GlobalCols>, b: PartialStructable<T & GlobalCols>) => number = () => 0;

    set sort(fn: (a: PartialStructable<T & GlobalCols>, b: PartialStructable<T & GlobalCols>) => number) {
        this._sort = fn;
        this.inform();
    }

    private _reverse = false;

    reverse() {
        this._reverse = !this._reverse;
        this.inform();
    }

    serialize() {
        // TODO: This will need to handle large datasets in the future, so focus on compression
    }

    merge() {
        // This will create the batch update objects to send to the server
    };
}