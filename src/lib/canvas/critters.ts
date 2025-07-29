import { Canvas } from 'canvas/canvas';
import { Drawable } from 'canvas/drawable';
import { Random } from 'ts-utils/math';
import { Color } from 'colors/color';
import { Path } from 'canvas/path';

class Square extends Drawable {
	growSize = 0.2; // How much the square grows each tick
	actualSize = this.growSize;

	constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly size: number,
		public readonly color: string,
		public lifetime: number // ticks
	) {
		super();
	}

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

class CritterPath extends Drawable {
	_tailAlpha = 0.1; // Alpha for the tail segments
	public readonly path = new Path([]);

	constructor(start: [number, number]) {
		super();

		this.path.properties.line.color = Color.fromName('blue').toString('rgb');
		this.path.add(start);
	}

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

	set() {
		const last = this.path.points[this.path.points.length - 1];
		this.path.points.push(last);

		// if (this.path.points.length > 3) {
		// 	this.path.points.shift();
		// }
	}
}

class Critter extends Drawable {
	public readonly path: CritterPath;

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

	changeDirection() {
		if (['up', 'down'].includes(this.config.direction)) {
			this.config.direction = Random.choose(['left', 'right']);
		} else {
			this.config.direction = Random.choose(['up', 'down']);
		}
		this.path.set();
	}
}

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
		(_, i) =>
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
