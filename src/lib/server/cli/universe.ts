import { Folder, Action } from './utils';
import { structActions } from './struct';
import { Universes } from '../structs/universe';
import terminal from '../utils/terminal';

export default new Folder('Universe', 'Control the universe', '🌌', [
    new Action('Make Universe', 'Make a new universe', '🌌', async () => {
        (await structActions.new(Universes.Universe)).unwrap();

        return terminal.log('Universe created');
    }),
]);
