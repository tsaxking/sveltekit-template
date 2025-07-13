<script lang="ts">
	import { Random } from 'ts-utils/math';
	import { onMount, type Snippet } from 'svelte';
	import { SimpleEventEmitter } from 'ts-utils/event-emitter';

	const id = Random.uuid();

	const em = new SimpleEventEmitter<'hide' | 'show'>();

	interface Props {
		title: string;
		body: Snippet;
		buttons?: Snippet;
		show?: boolean;
		size?: 'sm' | 'md' | 'lg' | 'xl';
	}

	let self: HTMLDivElement;

	const { title, body, buttons, show: doShow, size = 'md' }: Props = $props();

	const getModal = async () => {
		return import('bootstrap').then((bs) => {
			return bs.Modal.getInstance(self) || new bs.Modal(self);
		});
	};

	export const on = em.on.bind(em);
	export const once = em.once.bind(em);

	export const show = async () => {
		em.emit('show');
		const modal = await getModal();
		modal.show();
	};

	export const hide = async () => {
		em.emit('hide');
		const modal = await getModal();
		modal.hide();
	};

	onMount(() => {
		const onshow = () => em.emit('show');
		const onhide = () => em.emit('hide');

		self.addEventListener('hidden.bs.modal', onhide);

		self.addEventListener('shown.bs.modal', onshow);

		if (doShow) {
			show();
		}

		return () => {
			self.removeEventListener('hidden.bs.modal', onhide);
			self.removeEventListener('shown.bs.modal', onshow);
		};
	});
</script>

<div bind:this={self} {id} class="modal fade" aria-modal="true" role="dialog" tabindex="-1">
	<div class="modal-dialog modal-{size}">
		<div class="modal-content layer-1">
			<div class="modal-header">
				<h5 class="modal-title">{title}</h5>
				<button
					class="btn-close close-modal"
					aria-label="Close"
					data-bs-dismiss="modal"
					type="button"
				></button>
			</div>
			<div class="modal-body">
				{@render body()}
			</div>
			{#if buttons}
				<div class="modal-footer">
					{@render buttons()}
				</div>
			{/if}
		</div>
	</div>
</div>
