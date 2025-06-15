<script lang="ts">
	import 'filepond/dist/filepond.css';
	import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
	import FilePond, { registerPlugin, type FilePondFile } from 'svelte-filepond';

	import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
	import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
	import FilePondPluginImageCrop from 'filepond-plugin-image-crop';
	import FilePondPluginImageResize from 'filepond-plugin-image-resize';
	import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
	import { EventEmitter } from 'ts-utils/event-emitter';
	import { FileUploader } from '$lib/utils/files';

	interface Props {
		multiple: boolean;
		uploader: FileUploader;
		message: string;
		quality?: number;
	}

	const { multiple, uploader, message, quality = 100 }: Props = $props();

	const emitter = new EventEmitter<{
		init: void;
		addFile: FilePondFile;
		error: Error;
	}>();

	export const on = emitter.on.bind(emitter);

	// Register the plugins
	registerPlugin(
		FilePondPluginImageExifOrientation,
		FilePondPluginImagePreview,
		FilePondPluginImageCrop,
		FilePondPluginImageResize,
		FilePondPluginImageTransform
	);

	// a reference to the component, used to call FilePond methods
	let pond: FilePond;

	// pond.getFiles() will return the active files

	// the name to use for the internal file input
	let name = 'filepond';

	// handle filepond events
	const handleInit = () => {
		emitter.emit('init', undefined);
	};
</script>

<div class="app">
	<FilePond
		bind:this={pond}
		{name}
		allowMultiple={multiple}
		labelIdle={message}
		oninit={handleInit}
		allowImageTransform={true}
		imageTransformOutputQuality={quality}
		imageTransformOutputMimeType="image/jpeg"
		server={{
			process: async (fieldName, file, _, load, error) => {
				const f = new File([file], file.name, { type: file.type });

				const res = await uploader.sendFile(f, fieldName);

				if (res.isOk()) {
					res.value.on('load', load);
					res.value.on('error', error);

					return res.value.abort;
				} else {
					console.error(res.error);
					error('Failed to upload file');
				}

				return () => {};
			},

			load: (source, load, error, progress, abort) => {
				fetch(`/static/uploads/${source}`)
					.then((response) => {
						if (!response.ok) throw new Error('Failed to load file');
						return response.blob();
					})
					.then((blob) => {
						load(blob);
					})
					.catch((err) => {
						console.error(err);
						error('Failed to load file.');
					});
			}
		}}
	/>
</div>
