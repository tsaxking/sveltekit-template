// place files you want to import through the `$lib` alias in this folder.
import '@total-typescript/ts-reset';
import { fingerprint } from './utils/fingerprint';

import { init } from './services/analytics';

init();
fingerprint();
