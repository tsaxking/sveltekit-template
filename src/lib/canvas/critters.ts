/**
 * @fileoverview Critter animation with glowing particles and trailing paths.
 *
 * The animation runs in normalized coordinates (0–1) and is scaled to the
 * target canvas by the `Canvas` helper. Critters move in cardinal directions
 * and leave fading trails.
 *
 * @example
 * import { render } from '$lib/canvas/critters';
 * const canvas = document.querySelector('canvas');
 * if (canvas) render(canvas);
 */
import { Canvas } from 'canvas/canvas';
import { Drawable } from 'canvas/drawable';
import { Random } from 'ts-utils/math';
import { Color } from 'colors/color';
import { Path } from 'canvas/path';

/**
 * Glowing square particle that expands then fades out.
 *
 * @property {number} growSize - Growth amount applied per tick.
 * @property {number} actualSize - Current rendered size.
 * @property {number} x - Normalized x position (0–1).
 * @property {number} y - Normalized y position (0–1).
 * @property {number} size - Maximum size (canvas pixels in draw step).
 * @property {string} color - Glow color.
 * @property {number} lifetime - Ticks until the square begins to shrink.
 */
class Square extends Drawable {
	/** How much the square grows each tick. */
	growSize = 0.2;
	/** Current rendered size. */
	actualSize = this.growSize;

	/**
	 * Creates a square particle.
	 *
	 * @param {number} x - Normalized x position (0–1).
	 * @param {number} y - Normalized y position (0–1).
	 * @param {number} size - Maximum size in pixels.
	 * @param {string} color - Glow color.
	 * @param {number} lifetime - Ticks to persist before shrinking.
	 */
	constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly size: number,
		public readonly color: string,
		public lifetime: number // ticks
	) {
		super();
	}

	/**
	 * Draws the square and updates its size/lifetime.
	 *
	 * @param {CanvasRenderingContext2D} ctx - Rendering context.
	 */
	draw(ctx: CanvasRenderingContext2D) {
		ctx.save();

		const x = this.x * ctx.canvas.width;
		const y = this.y * ctx.canvas.height;

		const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.actualSize);
		gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
		gradient.addColorStop(0.4, this.color);
		gradient.addColorStop(1, 'transparent');

		// Fill glowing square
		ctx.fillStyle = gradient;
		ctx.fillRect(
			x - this.actualSize / 2,
			y - this.actualSize / 2,
			this.actualSize,
			this.actualSize
		);

		// Add outer glow with shadow
		ctx.shadowColor = this.color;
		ctx.shadowBlur = this.size * 1.2;
		ctx.fillStyle = 'rgba(0,0,0,0)';
		ctx.fillRect(
			x - this.actualSize / 2,
			y - this.actualSize / 2,
			this.actualSize,
			this.actualSize
		);

		this.lifetime--;
		ctx.restore();

		if (this.lifetime > 0) {
			this.actualSize += this.growSize;
			if (this.actualSize > this.size) {
				this.actualSize = this.size;
			}
		} else {
			this.actualSize -= this.growSize;
			if (this.actualSize <= 0) {
				this.actualSize = 0;
				this.canvas?.remove(this);
			}
		}
	}
}

/**
 * Fading trail for a critter.
 *
 * @property {number} _tailAlpha - Base alpha for tail segments.
 * @property {Path} path - Underlying polyline path.
 */
class CritterPath extends Drawable {
	/** Base alpha for the tail segments. */
	_tailAlpha = 0.1;
	/** Underlying path instance. */
	public readonly path = new Path([]);

	/**
	 * Creates a trail starting at the given position.
	 *
	 * @param {[number, number]} start - Normalized start position.
	 */
	constructor(start: [number, number]) {
		super();

		this.path.properties.line.color = Color.fromName('blue').toString('rgb');
		this.path.add(start);
	}

	/**
	 * Updates the latest trail point.
	 *
	 * @param {[number, number]} pos - Normalized position.
	 */
	pos(pos: [number, number]) {
		this.path.points[this.path.points.length - 1] = pos;
	}

	// draw(ctx: CanvasRenderingContext2D) {
	// 	if (this.path.points.length < 2) return;

	// 	ctx.save();

	// 	const color = this.path.properties.line.color;
	// 	ctx.lineWidth = 2;

	// 	// Shadow/glow effect
	// 	ctx.shadowColor = color || 'rgba(0, 0, 255, 0.5)';
	// 	ctx.shadowBlur = 12;

	// 	ctx.strokeStyle = color || 'blue';
	// 	ctx.beginPath();
	// 	ctx.moveTo(
	// 		this.path.points[0][0] * ctx.canvas.width,
	// 		this.path.points[0][1] * ctx.canvas.height
	// 	);
	// 	for (let i = 1; i < this.path.points.length; i++) {
	// 		const [x, y] = this.path.points[i];
	// 		ctx.lineTo(x * ctx.canvas.width, y * ctx.canvas.height);
	// 	}
	// 	ctx.stroke();

	// 	ctx.restore();
	// }
	/**
	 * Draws a fading trail from oldest to newest points.
	 *
	 * @param {CanvasRenderingContext2D} ctx - Rendering context.
	 */
	draw(ctx: CanvasRenderingContext2D) {
		if (this.path.points.length < 2) return;

		ctx.save();
		ctx.lineWidth = 2;

		const len = this.path.points.length - 1;

		for (let i = 1; i < this.path.points.length; i++) {
			const [x1, y1] = this.path.points[i - 1];
			const [x2, y2] = this.path.points[i];

			// Linear fade: 0 (oldest) → 1 (newest)
			const alpha = i / len;

			ctx.globalAlpha = alpha;
			ctx.shadowColor = `rgba(0, 0, 255, ${alpha * 0.5})`;
			ctx.shadowBlur = 12;
			ctx.strokeStyle = `rgba(0, 0, 255, ${alpha})`;

			ctx.beginPath();
			ctx.moveTo(x1 * ctx.canvas.width, y1 * ctx.canvas.height);
			ctx.lineTo(x2 * ctx.canvas.width, y2 * ctx.canvas.height);
			ctx.stroke();
		}

		ctx.restore();
	}

	/**
	 * Adds a new segment anchored at the last position.
	 */
	set() {
		const last = this.path.points[this.path.points.length - 1];
		this.path.points.push(last);

		// if (this.path.points.length > 3) {
		// 	this.path.points.shift();
		// }
	}
}

/**
 * Moving critter with glowing body and trail.
 *
 * @property {CritterPath} path - Trail renderer.
 * @property {object} config - Configuration for position and motion.
 * @property {number} config.x - Normalized x position (0–1).
 * @property {number} config.y - Normalized y position (0–1).
 * @property {number} config.size - Radius in pixels.
 * @property {string} config.color - Glow color.
 * @property {number} config.speed - Movement speed in pixels per tick.
 * @property {'up'|'down'|'left'|'right'} config.direction - Movement direction.
 */
class Critter extends Drawable {
	/** Trail renderer. */
	public readonly path: CritterPath;

	/**
	 * Creates a critter with an initial configuration.
	 *
	 * @param {object} config - Critter configuration.
	 * @param {number} config.x - Normalized x position (0–1).
	 * @param {number} config.y - Normalized y position (0–1).
	 * @param {number} config.size - Radius in pixels.
	 * @param {string} config.color - Glow color.
	 * @param {number} config.speed - Movement speed in pixels per tick.
	 * @param {'up'|'down'|'left'|'right'} config.direction - Movement direction.
	 */
	constructor(
		public readonly config: {
			x: number;
			y: number;
			size: number;
			color: string;
			speed: number;
			direction: 'up' | 'down' | 'left' | 'right';
		}
	) {
		super();
		this.path = new CritterPath([config.x, config.y]);
		this.path.set();
	}

	/**
	 * Draws the critter and updates its trail.
	 *
	 * @param {CanvasRenderingContext2D} ctx - Rendering context.
	 */
	draw(ctx: CanvasRenderingContext2D) {
		ctx.save();

		const x = this.config.x * ctx.canvas.width;
		const y = this.config.y * ctx.canvas.height;
		const r = this.config.size;

		// Create radial gradient: center white, glow out to this.config.color
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
		gradient.addColorStop(0, 'white');
		gradient.addColorStop(0.3, this.config.color);
		gradient.addColorStop(1, 'transparent');

		// Use gradient fill
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();

		// Optional additional glow
		// ctx.shadowColor = this.config.color;
		// ctx.shadowBlur = r * 1.5;

		// Refill to apply glow (with transparent fillStyle to prevent re-coloring)
		ctx.fillStyle = 'rgba(0,0,0,0)';
		ctx.fill();

		// Draw path on top
		this.path.draw(ctx);
		this.path.pos([this.config.x, this.config.y]);

		ctx.restore();
	}

	/**
	 * Randomly switches direction and appends a new trail segment.
	 */
	changeDirection() {
		if (['up', 'down'].includes(this.config.direction)) {
			this.config.direction = Random.choose(['left', 'right']);
		} else {
			this.config.direction = Random.choose(['up', 'down']);
		}
		this.path.set();
	}
}

/**
 * Starts the critter animation loop on the provided canvas.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas element.
 * @returns {unknown} The animation handle returned by `Canvas.animate()`.
 */
export const render = (canvas: HTMLCanvasElement) => {
	const ctx = canvas.getContext('2d', {
		willReadFrequently: false
	});
	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}
	ctx.imageSmoothingEnabled = true;
	const c = new Canvas(ctx);
	const critters = Array.from(
		{ length: 20 },
		(_, _i) =>
			new Critter({
				x: Math.random(),
				y: Math.random(),
				size: Math.random() * 10,
				color: Color.fromName('blue').toString('rgb'),
				speed: Math.random() * 2 + 1,
				direction: Random.choose(['up', 'down', 'left', 'right'])
			})
	);

	const squares: Square[] = [];
	c.add(...critters);

	let tick = 0;

	return c.animate(() => {
		if (tick % 2 === 0) {
			const toChange = Random.choose(critters);
			toChange.changeDirection();
		}

		// if (tick % 10 === 0) {
		// 	const toAdd = Random.choose(critters);
		// 	const newSquare = new Square(
		// 		toAdd.config.x + (Math.random() - 0.5) * 0.1,
		// 		toAdd.config.y + (Math.random() - 0.5) * 0.1,
		// 		Math.random() * 10 + 5,
		// 		Color.fromName('blue').toString('rgb'),
		// 		Random.between(50, 100)
		// 	);
		// 	c.add(newSquare);
		// 	squares.push(newSquare);
		// }

		for (const c of critters) {
			switch (c.config.direction) {
				case 'up':
					c.config.y -= c.config.speed / canvas.height;
					if (c.config.y < 0) {
						c.config.direction = Random.choose(['left', 'right']);
						c.path.set();
					}
					break;
				case 'down':
					c.config.y += c.config.speed / canvas.height;
					if (c.config.y > 1) {
						c.config.direction = Random.choose(['left', 'right']);
						c.path.set();
					}
					break;
				case 'left':
					c.config.x -= c.config.speed / canvas.width;
					if (c.config.x < 0) {
						c.config.direction = Random.choose(['up', 'down']);
						c.path.set();
					}
					break;
				case 'right':
					c.config.x += c.config.speed / canvas.width;
					if (c.config.x > 1) {
						c.config.direction = Random.choose(['up', 'down']);
						c.path.set();
					}
					break;
			}
		}

		if (squares.length > 20) {
			const s = squares.shift();
			if (s) {
				c.remove(s);
			}
		}
		tick++;
	});
};
