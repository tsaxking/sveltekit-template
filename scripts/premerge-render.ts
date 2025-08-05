import { repoSlug } from '../src/lib/server/utils/git';
import { select } from '../cli/utils';
import { sleep } from 'ts-utils/sleep';

export default async (...args: string[]) => {
	// if (!args.includes('--force')) {
	//     const answer = await select({
	//         message: 'This script will cause many changes to your repository to prepare for merging into its sub repositories. Are you sure you want to proceed?',
	//         options: [
	//             {
	//                 name: 'No - exit',
	//                 value: 'no',
	//             },
	//             {
	//                 name: 'Yes - proceed',
	//                 value: 'yes',
	//             }
	//         ]
	//     }).unwrap();
	//     if (answer === 'no' || !answer) {
	//         console.log('Exiting script');
	//         return;
	//     }
	// } else {
	//     console.clear();
	//     console.log('Running with --force, I sure hope you know what you are doing! You have a few seconds to cancel this script before it runs.');
	//     await sleep(3000);

	// }
	// const count = [3, 2, 1];
	// for (const i of count) {
	//     console.clear();
	//     console.log('You should only run this script if you REALLY know what you are doing.');
	//     console.log(`Running in ${i} seconds... (You have time to cancel)`);
	//     await sleep(1000);
	// }
	// console.log('You have chosen to run the premerge script, this will make many changes to your repository to prepare it for merging into its sub repositories.');
	// await sleep(1000);

	args = args.filter((arg) => !arg.startsWith('--'));
	const [target] = args;
	if (!target) {
		console.error('No target repository specified. Please provide a target repository.');
		return;
	}
	// target should look like git@github.com:tsaxking/tators-dashboard-kit.git
	// ensure it is a valid git repository URL
	const regex = /^(git@github\.com:|https:\/\/github\.com\/)([\w-]+)\/([\w-]+)(\.git)?$/;
	if (!regex.test(target)) {
		console.error('Invalid target repository URL. Please provide a valid git repository URL.');
		return;
	}

	console.log('Valid target repository:', target);
};
