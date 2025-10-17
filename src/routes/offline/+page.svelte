<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
	let isOnline = true;
	let originalUrl = '';
	
	onMount(() => {
		isOnline = navigator.onLine;
		
		// Get the original URL from query params or referrer
		const urlParams = new URLSearchParams(window.location.search);
		originalUrl = urlParams.get('from') || document.referrer || '/';
		
		const handleOnline = () => {
			isOnline = true;
			// Redirect back to where they were trying to go
			setTimeout(() => {
				window.location.href = originalUrl;
			}, 1000);
		};
		
		const handleOffline = () => {
			isOnline = false;
		};
		
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<svelte:head>
	<title>Offline - App</title>
	<meta name="description" content="You're currently offline. Please check your internet connection." />
</svelte:head>

<div class="offline-container">
	<div class="offline-content">
		<div class="offline-icon">📡</div>
		<h1>You're offline</h1>
		
		{#if isOnline}
			<p class="text-success">✅ Connection restored! Refreshing...</p>
		{:else}
			<p>It looks like you've lost your internet connection. Don't worry, you can still:</p>
			
			<ul class="offline-features">
				<li>Browse cached pages you've visited recently</li>
				<li>View downloaded content</li>
				<li>Use basic app features</li>
			</ul>
			
			<div class="offline-actions">
				<button 
					class="btn btn-primary" 
					onclick={() => window.location.href = originalUrl}
				>
					Try Again
				</button>
				
				<button 
					class="btn btn-secondary" 
					onclick={() => history.back()}
				>
					Go Back
				</button>
			</div>
			
			<div class="offline-tips">
				<h3>Tips while offline:</h3>
				<ul>
					<li>Check your WiFi or mobile data connection</li>
					<li>Move to an area with better signal</li>
					<li>Try refreshing the page in a few moments</li>
				</ul>
			</div>
		{/if}
	</div>
</div>

<style>
	.offline-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
	}
	
	.offline-content {
		max-width: 500px;
		text-align: center;
		background: white;
		padding: 3rem;
		border-radius: 1rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
	}
	
	.offline-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.7;
	}
	
	h1 {
		margin-bottom: 1rem;
		color: #495057;
	}
	
	.offline-features {
		text-align: left;
		margin: 2rem 0;
		padding-left: 1.5rem;
	}
	
	.offline-features li {
		margin: 0.5rem 0;
		color: #6c757d;
	}
	
	.offline-actions {
		margin: 2rem 0;
		display: flex;
		gap: 1rem;
		justify-content: center;
	}
	
	.btn {
		padding: 0.75rem 2rem;
		border: none;
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.btn-primary {
		background: #007bff;
		color: white;
	}
	
	.btn-primary:hover {
		background: #0056b3;
		transform: translateY(-1px);
	}
	
	.btn-secondary {
		background: #6c757d;
		color: white;
	}
	
	.btn-secondary:hover {
		background: #545b62;
		transform: translateY(-1px);
	}
	
	.offline-tips {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid #e9ecef;
		text-align: left;
	}
	
	.offline-tips h3 {
		margin-bottom: 1rem;
		color: #495057;
		font-size: 1.1rem;
	}
	
	.offline-tips ul {
		padding-left: 1.5rem;
	}
	
	.offline-tips li {
		margin: 0.5rem 0;
		color: #6c757d;
		font-size: 0.9rem;
	}
	
	.text-success {
		color: #28a745;
		font-weight: 500;
	}
</style>