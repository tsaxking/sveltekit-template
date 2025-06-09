import { type Writable, writable, type Readable, readable } from 'svelte/store';
import { attempt, attemptAsync } from 'ts-utils/check';
// import { Requests } from '../utils/requests';
import { Account } from './account';
import { Struct, StructData, DataArr } from 'drizzle-struct/front-end';
import { type Blank } from 'drizzle-struct/front-end';
import { sse } from '$lib/services/sse';
import type { DataAction, PropertyAction } from 'drizzle-struct/types';
import { browser } from '$app/environment';
import { Requests } from '$lib/utils/requests';
import { z } from 'zod';

export namespace Permissions {

}
