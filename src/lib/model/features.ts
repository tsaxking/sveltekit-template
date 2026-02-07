import { attemptAsync } from 'ts-utils';
import * as remote from '$lib/remotes/features.remote';

export namespace Features {
	export const getFeatureList = () => {
		return attemptAsync(async () => {
			return remote.list();
		});
	};

	// export const renderFeature = (target: HTMLDivElement) => {};
}
