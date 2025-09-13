<script lang="ts">
	import FileUploaderComponent from '$lib/components/forms/FileUploader.svelte';
</script>

<FileUploaderComponent
	multiple={false}
	message="Drag and drop your files or click here to browse"
	endpoint="/test/upload"
	usage="images"
/>
