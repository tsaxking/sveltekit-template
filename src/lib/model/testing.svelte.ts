import { browser } from '$app/environment';
import { sse } from '$lib/services/sse';
import { Struct, StructData } from '$lib/services/struct/index';

export namespace Test {
	export const Test = new Struct({
		name: 'test',
		structure: {
			name: 'string',
			age: 'number'
		},
		socket: sse,
		browser
		// log: true
	});

	export type TestData = StructData<typeof Test.data.structure>;
	export type State = 'not started' | 'in progress' | 'success' | 'failure';

	export type Status = {
		state: State;
		message?: string;

		update(state: State, message?: string): void;
	};

	export const unitTest = () => {
		const init = (): Status => ({
			state: 'not started',

			update(state: State, message?: string) {
				if (this.state === 'success' || this.state === 'failure') return;
				this.state = state;
				if (message) this.message = message;
			}
		});

		const tests = $state({
			connect: init(),
			new: init(),
			update: init(),

			archive: init(),
			restore: init(),
			delete: init(),

			readVersion: init(),
			deleteVersion: init(),
			restoreVersion: init(),

			readAll: init(),
			readArchived: init(),
			readFromProperty: init(),
			readFromIds: init(),
			readFromId: init(),
			readMultiProperty: init(),

			receivedNew: init(),
			receivedUpdate: init(),
			receivedArchive: init(),
			receivedRestore: init(),
			receivedDelete: init(),

			pullData: init(),

			promise: (async () => {
				if (!browser) return;
				await Test.build().unwrap();
				await sse.waitForConnection(10_000);

				const uniqueName = Math.random().toString(36).substring(7);
				console.log('Unique name: ', uniqueName);
				const connect = async () => {
					tests.connect.update('in progress');
					const res = await Test.connect();
					if (res.isErr()) {
						tests.connect.update('failure');
						tests.connect.message = res.error.message;
						return;
					}
					if (res.value.success) {
						tests.connect.update('success');
						tests.connect.message = res.value.message;
					} else {
						tests.connect.update('failure');
						tests.connect.message = res.value.message;
					}
				};

				const testNew = async () => {
					return new Promise<void>((res) => {
						tests.receivedNew.update('in progress');
						tests.new.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.receivedNew.update('failure', error);
							} else {
								tests.receivedNew.update('success');
							}

							Test.off('new', onNew);
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onNew = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						Test.on('new', onNew);

						Test.new({
							name: uniqueName,
							age: 20
						}).then((r) => {
							if (r.isErr()) {
								return tests.new.update('failure', r.error.message);
							}

							if (!r.value.success) {
								return tests.new.update('failure', r.value.message || 'No message');
							}

							tests.new.update('success');
						});
					});
				};

				const testUpdate = async (data: TestData) => {
					return new Promise<void>((res) => {
						tests.receivedUpdate.update('in progress');
						tests.update.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.receivedUpdate.update('failure', error);
							} else {
								tests.receivedUpdate.update('success');
							}
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onUpdate = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						Test.on('update', onUpdate);

						data
							.update((d) => ({
								...d,
								age: 21
							}))
							.then((r) => {
								if (r.isErr()) {
									return tests.update.update('failure', r.error.message);
								}

								if (!r.value.result.success) {
									return tests.update.update('failure', r.value.result.message || 'No message');
								}

								tests.update.update('success');
							});
					});
				};

				let testData: TestData | undefined;

				const testReadAll = async () => {
					return new Promise<void>((res) => {
						tests.readAll.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.readAll.update('failure', error);
							} else {
								tests.readAll.update('success');
							}

							stream.off('data', onData);
							stream.off('error', onError);
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onData = (data: TestData) => {
							if (data.data.name === uniqueName) {
								testData = data;
								finish();
							}
						};

						const onError = (error: Error) => {
							finish(error.message);
						};

						const stream = Test.all({
							type: 'stream'
						});
						stream.on('data', onData);
						stream.on('error', onError);
					});
				};

				const testArchive = async (data: TestData) => {
					return new Promise<void>((res) => {
						tests.receivedArchive.update('in progress');
						tests.archive.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.receivedArchive.update('failure', error);
							} else {
								tests.receivedArchive.update('success');
							}
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onArchive = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						Test.on('archive', onArchive);

						data.setArchive(true).then((r) => {
							if (r.isErr()) {
								return tests.archive.update('failure', r.error.message);
							}

							if (!r.value.success) {
								return tests.archive.update('failure', r.value.message || 'No message');
							}

							tests.archive.update('success');
						});
					});
				};

				const testRestore = async (data: TestData) => {
					return new Promise<void>((res) => {
						tests.receivedRestore.update('in progress');
						tests.restore.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.receivedRestore.update('failure', error);
							} else {
								tests.receivedRestore.update('success');
							}
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onRestore = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						Test.on('restore', onRestore);

						data.setArchive(false).then((r) => {
							if (r.isErr()) {
								return tests.restore.update('failure', r.error.message);
							}

							if (!r.value.success) {
								return tests.restore.update('failure', r.value.message || 'No message');
							}

							tests.restore.update('success');
						});
					});
				};

				const testDelete = async (data: TestData) => {
					return new Promise<void>((res) => {
						tests.receivedDelete.update('in progress');
						tests.delete.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.receivedDelete.update('failure', error);
							} else {
								tests.receivedDelete.update('success');
							}
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onDelete = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						Test.on('delete', onDelete);

						data.delete().then((r) => {
							if (r.isErr()) {
								return tests.delete.update('failure', r.error.message);
							}

							if (!r.value.success) {
								return tests.delete.update('failure', r.value.message || 'No message');
							}

							tests.delete.update('success');
						});
					});
				};

				const testPull = async (data: TestData) => {
					tests.pullData.update('in progress');
					const pulled = data.pull('name', 'age');
					if (!pulled) {
						tests.pullData.update('failure', 'Could not pull data');
						return;
					}

					if (!pulled.data.name) {
						tests.pullData.update('failure', 'Name not pulled');
						return;
					}

					if (!pulled.data.age) {
						tests.pullData.update('failure', 'Age not pulled');
						return;
					}

					tests.pullData.update('success');
				};

				const testVersions = async (data: TestData) => {
					tests.readVersion.update('in progress');
					tests.deleteVersion.update('in progress');
					tests.restoreVersion.update('in progress');

					const versions = await data.getVersions();
					if (versions.isErr()) {
						tests.readVersion.update('failure', versions.error.message);
						return;
					}

					if (versions.value.length === 0) {
						tests.readVersion.update('failure', 'No versions found');
						return;
					}

					const version = versions.value.data[0];
					if (version.data.name !== uniqueName) {
						tests.readVersion.update('failure', 'Name does not match');
						return;
					}

					tests.readVersion.update('success');

					const restoreVersion = await version.restore();
					if (restoreVersion.isErr()) {
						tests.restoreVersion.update('failure', restoreVersion.error.message);
						return;
					}

					if (!restoreVersion.value.success) {
						tests.restoreVersion.update('failure', restoreVersion.value.message || 'No message');
						return;
					}

					tests.restoreVersion.update('success');

					const deleted = await version.delete();
					if (deleted.isErr()) {
						tests.deleteVersion.update('failure', deleted.error.message);
						return;
					}

					if (!deleted.value.success) {
						tests.deleteVersion.update('failure', deleted.value.message || 'No message');
						return;
					}

					tests.deleteVersion.update('success');
				};

				const testReadArchived = async () => {
					return new Promise<void>((res) => {
						tests.readArchived.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.readArchived.update('failure', error);
							} else {
								tests.readArchived.update('success');
							}

							stream.off('data', onData);
							stream.off('error', onError);
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onData = (data: TestData) => {
							console.log('archived', data);
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						const onError = (error: Error) => {
							finish(error.message);
						};

						const stream = Test.archived({
							type: 'stream'
						});
						stream.on('data', onData);
						stream.on('error', onError);
					});
				};
				const testReadProperty = async () => {
					return new Promise<void>((res) => {
						tests.readFromProperty.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.readFromProperty.update('failure', error);
							} else {
								tests.readFromProperty.update('success');
							}

							stream.off('data', onData);
							stream.off('error', onError);
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onData = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						const onError = (error: Error) => {
							finish(error.message);
						};

						const stream = Test.fromProperty('name', uniqueName, {
							type: 'stream'
						});
						stream.on('data', onData);
						stream.on('error', onError);
					});
				};
				const testReadFromIds = async () => {
					return new Promise<void>((res) => {
						tests.readFromIds.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.readFromIds.update('failure', error);
							} else {
								tests.readFromIds.update('success');
							}

							stream.off('data', onData);
							stream.off('error', onError);
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onData = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						const onError = (error: Error) => {
							finish(error.message);
						};

						const stream = Test.fromIds([String(testData?.data.id)], {
							type: 'stream'
						});
						stream.on('data', onData);
						stream.on('error', onError);
					});
				};

				const testReadFromId = async () => {
					return new Promise<void>((res) => {
						tests.readFromId.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.readFromId.update('failure', error);
							} else {
								tests.readFromId.update('success');
							}
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						Test.fromId(String(testData?.data.id), {
							force: true
						}).then((r) => {
							if (r.isErr()) {
								return finish(r.error.message);
							}

							if (r.value.data.name !== uniqueName) {
								return finish('Name does not match');
							}

							finish();
						});
					});
				};

				const readMultiProperty = async () => {
					return new Promise<void>((res) => {
						tests.readMultiProperty.update('in progress');
						let resolved = false;
						const finish = (error?: string) => {
							if (!resolved) res();
							resolved = true;
							if (error) {
								tests.readMultiProperty.update('failure', error);
							} else {
								tests.readMultiProperty.update('success');
							}

							stream.off('data', onData);
							stream.off('error', onError);
						};

						setTimeout(() => {
							finish('Timeout');
						}, 1000);

						const onData = (data: TestData) => {
							if (data.data.name === uniqueName) {
								finish();
							}
						};

						const onError = (error: Error) => {
							finish(error.message);
						};

						const stream = Test.get(
							{
								name: uniqueName,
								age: 20
							},
							{
								type: 'stream'
							}
						);
						stream.on('data', onData);
						stream.on('error', onError);
					});
				};

				await connect();
				await testNew();
				await testReadAll();
				await testReadProperty();
				await testReadFromIds();
				await testReadFromId();
				await readMultiProperty();

				if (testData) {
					await testUpdate(testData);
					await testArchive(testData);
					await testReadArchived();
					await testRestore(testData);
					await testPull(testData);
					await testVersions(testData);
					await testDelete(testData);
				}
			})()
		});
		return tests;
	};

	export const TestPermissions = new Struct({
		name: 'test_permissions',
		structure: {
			name: 'string',
			age: 'number'
		},
		socket: sse,
		browser,
		log: true
	});

	export type TestPermissionsData = typeof TestPermissions.sample;
	export type TestPermissionsArr = ReturnType<typeof TestPermissions.arr>;
}
