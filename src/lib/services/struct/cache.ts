import { attemptAsync } from 'ts-utils/check';
import { Table } from '../db/table';

export namespace StructCache {
    const table = new Table('struct_cache', {
        key: 'string',
        value: 'unknown',
        expires: 'date',
    });

    export const get = (
        key: string,
    ) => {
        return attemptAsync(async () => {
            const record = await table.fromProperty('key', key).unwrap();
            const [res] = record.data;
            if (!res) return null;
            if (res.data.expires && res.data.expires < new Date()) {
                // expired
                res.delete();
                return null;
            }
            return res.data.value;
        });
    };


    export const set = (
        key: string,
        value: unknown,
        config: {
            expires: Date;
        }
    ) => {
        return attemptAsync(async () => {
            const record = await table.fromProperty('key', key).unwrap();
            const res = record.data[0];
            if (res) {
                await res.set({
                    ...res.data,
                    value,
                }).unwrap();
                return res.data.value;
            } else {
                await table.new({
                    key,
                    value,
                    expires: config.expires,
                }).unwrap();
                return value;
            }
        });
    };

    export const clear = (
        key: string,
    ) => {
        return attemptAsync(async () => {
            const record = await table.fromProperty('key', key).unwrap();
            const res = record.data[0];
            if (res) {
                await res.delete().unwrap();
            }
        });
    };
}