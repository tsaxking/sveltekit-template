import { writable } from "svelte/store";
import type { StructDataStage } from "./data-staging";
import type { Blank, GlobalCols, PartialStructable } from "./struct";
import type { StructData } from "./struct-data";

export type StagingArrConfig<T extends Blank> = Partial<{}>;

export class StagingArr<T extends Blank> 
    implements Writable<PartialStructable<T & GlobalCols>>
{
    public data: StructDataStage<T>[] = [];
    public base: PartialStructable<T & GlobalCols>[];
    public readonly remoteUpdated = writable(false);
    public readonly localUpdated = writable(false);

    constructor(
        public readonly structData: StructData<T & GlobalCols>[],
        public readonly config: StagingArrConfig<T> = {},
    ) {
        this.base = JSON.parse(JSON.stringify(structData.map(d => d.data))) as PartialStructable<T & GlobalCols>[];
    }
};