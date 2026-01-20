<script lang="ts">
	import FileUploaderComponent from '$lib/components/forms/FileUploader.svelte';
</script>

<div class="container mt-4">
	<h1>File Upload Test</h1>
	<p>Upload multiple files of different types to test the file upload functionality.</p>

	<FileUploaderComponent
		multiple={true}
		message="Drag and drop your files or click here to browse"
		endpoint="/test/upload"
		allowedFileTypes={['image/*', 'application/pdf', '.docx', '.txt', '.json']}
	/>
</div>
