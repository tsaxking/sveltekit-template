<script lang="ts">
	import { setTheme, theme } from '$lib/utils/theme';

	function toggleTheme() {
		const newTheme = $theme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
	}
</script>

<button type="button" class="btn" onclick={toggleTheme}>
	<i class="material-icons">
		{#if $theme === 'light'}
			dark_mode
		{:else}
			light_mode
		{/if}
	</i>
</button>
