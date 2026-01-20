<script lang="ts">
    import { haptic } from "$lib/utils/haptic";
</script>

<button type="button" class="btn btn-primary" onclick={() => haptic('success')}>Vibrate</button>