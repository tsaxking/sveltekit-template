<script lang="ts">
	type Card = {
		title: string;
		subtitle: string;
		color: string;
		textColor: string;
		linkColor: string;
		route: string;
	};

	let cards: Card[] = [
		{
			title: '2024 Dashboard',
			subtitle: 'This is the robot display area',
			color: 'primary',
			textColor: 'white',
			linkColor: 'white',
			route: 'dashboard/2024'
		},
		{
			title: 'Mentor',
			subtitle: 'Mentor setup area',
			color: 'secondary',
			textColor: 'white',
			linkColor: 'white',
			route: 'dashboard/mentor'
		},
		{
			title: 'Home',
			subtitle: 'This would go back to the main home page. Subject to change.',
			color: 'success',
			textColor: 'white',
			linkColor: 'white',
			route: '/'
		}
	];
</script>

<main>
	<h1 class="text-center pt-2">Home</h1>
	<hr />
	<div class="container">
		<div class="row">
			{#each cards as card}
				<div class="col-md-6 col-lg-4 mb-3">
					<div
						class="d-flex position-relative hover hover-fast hover-grow-sm hover-grow shadow rounded p-3 m-2 bg-{card.color} text-{card.textColor} home-card"
					>
						<div>
							<h5 class="mt-0">{card.title}</h5>
							<p>{card.subtitle}</p>
							<a class="stretched-link link-{card.linkColor}" href={card.route}
								>Go to {card.title}</a
							>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</main>
