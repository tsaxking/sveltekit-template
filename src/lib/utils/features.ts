import { attemptAsync } from "ts-utils/check"
import fs from 'fs/promises';
import path from 'path';

export const getFeatureList = () => {
    return attemptAsync(async () => {
        return fs.readdir(
            path.resolve(
                process.cwd(),
                'static',
                'features',
            )
        ).then((features) => features.map(f => path.basename(f)));
    });
}

export const getFeature = (feature: string, config: {
    domain: string,
}) => {
    return attemptAsync(async () => {
        if (!feature.endsWith('.md')) feature += '.md';
        let res = await fs.readFile(
            path.resolve(
                process.cwd(),
                'static',
                'features',
                feature
            ),
            'utf-8',
        );

        for (const key in config) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            res = res.replaceAll(`{{ ${key} }}`, String((config as any)[key]));
        }

        return res;
    });
};