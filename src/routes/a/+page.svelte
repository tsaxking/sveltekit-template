<script lang="ts">
    
	import { $createCounters } from '$lib/utils/macro';

	$createCounters!(document.body, [{
    color: 'red',
    startCount: 0
}, {
    color: 'blue',
    startCount: 10
}])
</script>