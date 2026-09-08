<script lang="ts">
	import FileUploader from '$lib/components/forms/FileUploader.svelte';
	import type { Body, Meta } from '@uppy/core';
	import { onMount } from 'svelte';

	const { data } = $props();

	let fileUploader: FileUploader<Meta, Body>;
	let uploadResult = $state('');

	function onUpload(url: string, path: string) {
		console.log('File uploaded:', { url, path });
		uploadResult = `${path}::${url}`;
	}

	onMount(() => {
		fileUploader.on('load', ({ url, path }) => onUpload(url, path));
	});
</script>

<h1>File Uploader Test</h1>

<FileUploader
	bucket="e2e_test"
	bind:this={fileUploader}
	uppyOpts={{
		restrictions: {
			maxFileSize: 1000000, // 1MB
			maxNumberOfFiles: 1,
			allowedFileTypes: ['text/plain'],
			minFileSize: 1,
			maxTotalFileSize: 1000000,
			minNumberOfFiles: 1,
			requiredMetaFields: ['name']
		},
		debug: true
	}}
	btn={{
		text: 'Upload a Text File',
		classes: 'btn btn-primary'
	}}
	supabase={data.supabase}
/>

<p data-testid="upload-result">{uploadResult}</p>
