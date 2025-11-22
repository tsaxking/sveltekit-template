import { attemptAsync } from "ts-utils/check"
import fs from 'fs';
import path from 'path';


export const getFeatureMetadata = (feature: string) => {
    return attemptAsync(async () => {
        return new Promise<{
            name: string;
            description: string;
            date: number;
        }>((res, rej) => {
            if (!feature.endsWith('.md')) feature += '.md';
            const rs = fs.createReadStream(path.resolve(
                process.cwd(),
                'static',
                'features',
                feature
            ));
            let on = false;
            const obj = {
                name: '',
                description: '',
                date: -1
            }
            rs.on('data', (chunk) => {
                const chunks = chunk.toString().split('\n');
                for (const str of chunks) {
                    if (str === '---') {
                        if (on) rs.close();
                        else on = !on;
                    } else {
                        if (str.startsWith('name')) {
                            obj.name = str.replace('name: ', '');
                        }
                        if (str.startsWith('description')) {
                            obj.description = str.replace('description: ', '');
                        }
                        if (str.startsWith('date')) {
                            obj.date = new Date(str.replace('date: ', '')).getTime();
                        }
                    }
                }
            });
            rs.on('close', () => {
                res(obj);
            });
            rs.on('error', (e) => {
                rej(e);
            });
        });
    })
};

export const getFeatureList = () => {
    return attemptAsync(async () => {
        return fs.promises.readdir(
            path.resolve(
                process.cwd(),
                'static',
                'features',
            )
        ).then((features) => features.map(f => getFeatureMetadata(path.basename(f)).unwrap()));
    });
}

export const getFeature = (feature: string, config: {
    domain: string,
}) => {
    return attemptAsync(async () => {
        if (!feature.endsWith('.md')) feature += '.md';
        let res = await fs.promises.readFile(
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