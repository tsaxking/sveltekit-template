<script lang="ts">
	import { FileUploader } from '$lib/utils/files';
	import FileUploaderComponent from '$lib/components/forms/FileUploader.svelte';

	const uploader = new FileUploader('/test/upload', {
		method: 'POST'
	});
</script>

<FileUploaderComponent
	{uploader}
	multiple={false}
	message="Drag and drop your files or click here to browse"
/>
