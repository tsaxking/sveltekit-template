/**
 * Service Worker for offline functionality and performance optimization
 *
 * Features:
 * - Caches static assets for offline access
 * - Implements cache-first strategy for assets, network-first for API calls
 * - Provides offline fallbacks for critical pages
 * - Automatic cache management with version-based invalidation
 * - Background sync for offline form submissions
 */

// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Only necessary if you have an import from `$env/static/public`
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files } from '$service-worker';

// This gives `self` the correct types
const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

const log = (...args: unknown[]) => {
	if (cacheConfig.debug) console.log('[SW]', ...args);
};

const warn = (...args: unknown[]) => {
	if (cacheConfig.debug) console.warn('[SW]', ...args);
};

const error = (...args: unknown[]) => {
	if (cacheConfig.debug) console.error('[SW]', ...args);
};

// Define cache config type
interface CacheConfig {
	enabled: boolean;
	debug: boolean;
	version: number;
	static: {
		enabled: boolean;
		duration: number;
		limit: number;
		assets: string[];
	};
	api: {
		enabled: boolean;
		duration: number;
		limit: number;
		assets: string[];
	};
	pages: {
		enabled: boolean;
		duration: number;
		limit: number;
		assets: string[];
	};
}

// We need to get the config from a different source since __APP_ENV__ isn't available
// For now, let's use reasonable defaults and fetch config when needed
const DEFAULT_CACHE_CONFIG: CacheConfig = {
	enabled: true,
	debug: false,
	version: 1,
	static: {
		enabled: true,
		duration: 1000 * 60 * 60, // 1 hour
		limit: 50,
		assets: ['/*']
	},
	api: {
		enabled: true,
		duration: 1000 * 60 * 15, // 15 minutes
		limit: 100,
		assets: ['/api/*', '/struct/*']
	},
	pages: {
		enabled: true,
		duration: 1000 * 60 * 5, // 5 minutes
		limit: 20,
		assets: ['/*']
	}
};

let cacheConfig: CacheConfig = DEFAULT_CACHE_CONFIG;

// Try to fetch the actual config from the server
async function loadCacheConfig() {
	try {
		const response = await fetch('/api/cache-config');
		if (response.ok) {
			const config = (await response.json()) as CacheConfig;
			cacheConfig = config;
			log('📡 Loaded cache config from server:', config);
		} else {
			warn('⚠️ Using default cache config');
		}
	} catch (e) {
		error('⚠️ Failed to load cache config, using defaults:', e);
	}
}

if (cacheConfig.enabled) {
	// Create cache names for different types of content
	const STATIC_CACHE = `static-${cacheConfig.version}`;
	const API_CACHE = `api-${cacheConfig.version}`;
	const PAGES_CACHE = `pages-${cacheConfig.version}`;
	const IMAGES_CACHE = `images-${cacheConfig.version}`;

	// Use configuration from cacheConfig
	const CACHE_CONFIG = {
		// Static assets configuration
		STATIC_ENABLED: cacheConfig.static.enabled,
		STATIC_DURATION: cacheConfig.static.duration,
		STATIC_LIMIT: cacheConfig.static.limit,
		STATIC_ASSETS: cacheConfig.static.assets,

		// API configuration
		API_ENABLED: cacheConfig.api.enabled,
		API_DURATION: cacheConfig.api.duration,
		API_LIMIT: cacheConfig.api.limit,
		API_ASSETS: cacheConfig.api.assets,

		// Pages configuration
		PAGES_ENABLED: cacheConfig.pages.enabled,
		PAGES_DURATION: cacheConfig.pages.duration,
		PAGES_LIMIT: cacheConfig.pages.limit,
		PAGES_ASSETS: cacheConfig.pages.assets,

		// Image cache time (keeping reasonable default)
		IMAGE_CACHE_TIME: 1000 * 60 * 60 * 24 * 7 // 1 week
	};

	const ASSETS = [
		...build, // the app itself
		...files // everything in `static`
	];

	/**
	 * Convert gitignore-style patterns to regex for matching URLs
	 * Supports:
	 * - /* matches all paths
	 * - /api/* matches all paths starting with /api/
	 * - *.js matches all .js files
	 * - /specific/path matches exact path
	 */
	function patternToRegex(pattern: string): RegExp {
		// Escape special regex characters except * and /
		let regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'); // Convert * to .*

		// If pattern starts with /, anchor to start
		if (regexPattern.startsWith('/')) {
			regexPattern = '^' + regexPattern;
		} else {
			// If no leading /, match anywhere in path
			// No change needed
		}

		// If pattern ends with /*, allow anything after
		if (regexPattern.endsWith('/.*')) {
			// Keep as is - no change needed
		} else if (!regexPattern.includes('.*')) {
			// If no wildcards, match exact path (add $ anchor)
			regexPattern = regexPattern + '$';
		}

		return new RegExp(regexPattern);
	}

	/**
	 * Check if a URL path matches any of the given patterns
	 */
	function matchesPatterns(pathname: string, patterns: string[]): boolean {
		if (patterns.includes('/*')) return true; // Universal match

		return patterns.some((pattern) => {
			const regex = patternToRegex(pattern);
			return regex.test(pathname);
		});
	}

	/**
	 * Helper function to check if a URL should be cached as a static asset
	 */
	function isStaticAsset(url: URL): boolean {
		if (!CACHE_CONFIG.STATIC_ENABLED) return false;

		// First check if it's in the built assets
		if (ASSETS.includes(url.pathname)) return true;

		// Then check against configured patterns
		return matchesPatterns(url.pathname, CACHE_CONFIG.STATIC_ASSETS);
	}

	/**
	 * Helper function to check if a URL is cacheable API endpoint
	 */
	function isCacheableAPI(url: URL): boolean {
		if (!CACHE_CONFIG.API_ENABLED) return false;
		return matchesPatterns(url.pathname, CACHE_CONFIG.API_ASSETS);
	}

	/**
	 * Helper function to check if a URL should be cached as a page
	 */
	function isCacheablePage(url: URL): boolean {
		if (!CACHE_CONFIG.PAGES_ENABLED) return false;
		return matchesPatterns(url.pathname, CACHE_CONFIG.PAGES_ASSETS);
	}

	/**
	 * Helper function to check if a request is for an image
	 */
	function isImageRequest(url: URL): boolean {
		return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
	}

	/**
	 * Helper function to add timestamp to cached responses
	 */
	function addCacheTimestamp(response: Response): Response {
		const clonedResponse = response.clone();
		clonedResponse.headers.set('sw-cache-time', Date.now().toString());
		return clonedResponse;
	}

	/**
	 * Helper function to check if cached response is still fresh
	 */
	function isCacheFresh(response: Response, maxAge: number): boolean {
		const cacheTime = response.headers.get('sw-cache-time');
		if (!cacheTime) return false;
		return Date.now() - parseInt(cacheTime) < maxAge;
	}

	self.addEventListener('install', (event) => {
		// Create caches and add essential files
		async function addFilesToCache() {
			// Load cache config first
			await loadCacheConfig();

			const staticCache = await caches.open(STATIC_CACHE);
			await staticCache.addAll(ASSETS);

			// Pre-cache critical pages based on configuration
			if (CACHE_CONFIG.PAGES_ENABLED) {
				const pagesCache = await caches.open(PAGES_CACHE);
				// Pre-cache pages that match our patterns
				const criticalPages = ['/', '/login', '/offline'];

				for (const page of criticalPages) {
					if (matchesPatterns(page, CACHE_CONFIG.PAGES_ASSETS)) {
						try {
							const response = await fetch(page);
							if (response.ok) {
								await pagesCache.put(page, addCacheTimestamp(response));
							}
						} catch {
							// Ignore errors during pre-caching
						}
					}
				}
			}
		}

		// Skip waiting to activate immediately
		self.skipWaiting();
		event.waitUntil(addFilesToCache());
	});

	self.addEventListener('activate', (event) => {
		// Remove old caches and claim clients
		async function cleanupAndClaim() {
			const currentCaches = [STATIC_CACHE, API_CACHE, PAGES_CACHE, IMAGES_CACHE];
			const allCacheKeys = await caches.keys();
			let deletedCaches = 0;
			let totalCacheSize = 0;

			log(`🔄 Service Worker v${cacheConfig.version} activating...`);
			log(`📦 Current caches:`, currentCaches);

			for (const key of allCacheKeys) {
				if (!currentCaches.includes(key)) {
					log(`🗑️ Deleting old cache: ${key}`);

					// Calculate cache size before deletion (optional)
					try {
						const cache = await caches.open(key);
						const requests = await cache.keys();
						totalCacheSize += requests.length;
					} catch (e) {
						warn(`⚠️ Could not read cache ${key} before deletion:`, e);
					}

					await caches.delete(key);
					deletedCaches++;
				}
			}

			if (deletedCaches > 0) {
				log(`✅ Cleaned up ${deletedCaches} old cache(s) containing ~${totalCacheSize} entries`);
			} else {
				log(`✅ No old caches to clean up`);
			}

			// Take control of all clients immediately
			await self.clients.claim();
			log(`🎯 Service Worker v${cacheConfig.version} now controlling all clients`);
		}

		event.waitUntil(cleanupAndClaim());
	});

	self.addEventListener('fetch', (event) => {
		// Only handle GET requests
		if (event.request.method !== 'GET') return;

		if (event.request.url.includes('sse')) return;

		async function respond() {
			const url = new URL(event.request.url);
			const request = event.request;

			// Strategy 1: Static assets - Cache First
			if (isStaticAsset(url)) {
				const staticCache = await caches.open(STATIC_CACHE);
				const cachedResponse = await staticCache.match(url.pathname);

				if (cachedResponse) {
					return cachedResponse;
				}

				// If not in cache, fetch and cache
				try {
					const response = await fetch(request);
					if (response.ok) {
						await staticCache.put(request, response.clone());
					}
					return response;
				} catch {
					// Return a basic offline response for critical assets
					return new Response('Offline', {
						status: 503,
						statusText: 'Service Unavailable'
					});
				}
			}

			// Strategy 2: API endpoints - Network First with smart caching
			if (isCacheableAPI(url)) {
				const apiCache = await caches.open(API_CACHE);

				try {
					const response = await fetch(request);

					if (response.ok) {
						// Cache successful API responses with timestamp
						const responseToCache = addCacheTimestamp(response.clone());
						await apiCache.put(request, responseToCache);

						// Limit cache size
						const keys = await apiCache.keys();
						if (keys.length > CACHE_CONFIG.API_LIMIT) {
							await apiCache.delete(keys[0]);
						}
					}

					return response;
				} catch {
					// Network failed, try cache
					const cachedResponse = await apiCache.match(request);
					if (cachedResponse && isCacheFresh(cachedResponse, CACHE_CONFIG.API_DURATION)) {
						return cachedResponse;
					}

					// Return offline indicator for API calls
					return new Response(
						JSON.stringify({
							error: 'Offline',
							cached: false
						}),
						{
							status: 503,
							statusText: 'Service Unavailable',
							headers: { 'Content-Type': 'application/json' }
						}
					);
				}
			}

			// Strategy 3: Images - Cache First with long TTL
			if (isImageRequest(url)) {
				const imageCache = await caches.open(IMAGES_CACHE);
				const cachedResponse = await imageCache.match(request);

				if (cachedResponse && isCacheFresh(cachedResponse, CACHE_CONFIG.IMAGE_CACHE_TIME)) {
					return cachedResponse;
				}

				try {
					const response = await fetch(request);
					if (response.ok) {
						await imageCache.put(request, addCacheTimestamp(response.clone()));
					}
					return response;
				} catch {
					// Return cached image even if stale, or placeholder
					if (cachedResponse) {
						return cachedResponse;
					}

					// Return a simple placeholder for missing images
					return new Response('', {
						status: 404,
						statusText: 'Image not found'
					});
				}
			}

			// Strategy 4: Pages - Stale While Revalidate (only if enabled and matches patterns)
			if (isCacheablePage(url)) {
				const pagesCache = await caches.open(PAGES_CACHE);
				const cachedPage = await pagesCache.match(request);

				// If we have a cached version, return it immediately
				if (cachedPage) {
					// Check if it's fresh enough
					if (isCacheFresh(cachedPage, CACHE_CONFIG.PAGES_DURATION)) {
						return cachedPage;
					}

					// Return stale version immediately, update in background
					event.waitUntil(
						(async () => {
							try {
								const freshResponse = await fetch(request);
								if (freshResponse.ok) {
									await pagesCache.put(request, addCacheTimestamp(freshResponse.clone()));
								}
							} catch {
								// Background update failed, keep stale version
							}
						})()
					);

					return cachedPage;
				}

				// No cache, try network
				try {
					const response = await fetch(request);

					if (response.ok) {
						await pagesCache.put(request, addCacheTimestamp(response.clone()));

						// Limit cache size
						const keys = await pagesCache.keys();
						if (keys.length > CACHE_CONFIG.PAGES_LIMIT) {
							await pagesCache.delete(keys[0]);
						}
					}

					return response;
				} catch {
					// Network failed and no cache - redirect to offline page with original URL
					const offlineUrl = `/offline?from=${encodeURIComponent(url.pathname + url.search)}`;

					try {
						// Try to fetch the offline page with the original URL parameter
						const offlineResponse = await fetch(offlineUrl);
						if (offlineResponse.ok) {
							return offlineResponse;
						}
					} catch {
						// If offline page fetch fails, try cached version
						const cachedOfflineResponse = await pagesCache.match('/offline');
						if (cachedOfflineResponse) {
							// Inject the original URL into the cached offline page
							const offlineHtml = await cachedOfflineResponse.text();
							const modifiedHtml = offlineHtml.replace(
								'</script>',
								`\n\t\t// Inject original URL from service worker\n\t\toriginalUrl = '${url.pathname + url.search}';\n\t</script>`
							);

							return new Response(modifiedHtml, {
								status: 200,
								statusText: 'OK',
								headers: { 'Content-Type': 'text/html' }
							});
						}
					}

					// Last resort - basic offline message
					return new Response(
						`
						<!DOCTYPE html>
						<html>
						<head><title>Offline</title></head>
						<body>
							<h1>You're offline</h1>
							<p>Please check your internet connection and try again.</p>
							<button onclick="location.reload()">Retry</button>
						</body>
						</html>
					`,
						{
							status: 503,
							statusText: 'Service Unavailable',
							headers: { 'Content-Type': 'text/html' }
						}
					);
				}
			}

			// For non-cacheable pages, just try network without caching
			try {
				return await fetch(request);
			} catch {
				// Network failed for non-cacheable page
				return new Response('Page not available offline', {
					status: 503,
					statusText: 'Service Unavailable',
					headers: { 'Content-Type': 'text/plain' }
				});
			}
		}

		event.respondWith(respond());
	});

	// Handle background sync for offline form submissions
	self.addEventListener(
		'sync',
		(event: Event & { tag?: string; waitUntil?: (promise: Promise<unknown>) => void }) => {
			if (event.tag === 'background-sync') {
				event.waitUntil?.(handleBackgroundSync());
			}
		}
	);

	/**
	 * Handles background sync for offline operations
	 */
	async function handleBackgroundSync() {
		// Implementation for handling offline form submissions
		// This could sync with your struct system when back online
		log('Background sync triggered');
	}

	// Handle push notifications (optional enhancement)
	self.addEventListener('push', (event) => {
		if (!event.data) return;

		const options = {
			body: event.data.text(),
			icon: '/favicon.png',
			badge: '/favicon.png',
			vibrate: [200, 100, 200],
			actions: [
				{
					action: 'open',
					title: 'Open App'
				}
			]
		};

		event.waitUntil(self.registration.showNotification('App Notification', options));
	});

	// Handle notification clicks
	self.addEventListener('notificationclick', (event) => {
		event.notification.close();

		if (event.action === 'open') {
			event.waitUntil(self.clients.openWindow('/'));
		}
	});
}
