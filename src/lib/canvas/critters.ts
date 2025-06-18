import { Canvas } from 'canvas/canvas';
import { Drawable } from 'canvas/drawable';
import { Random } from 'ts-utils/math';
import { Color } from 'colors/color';
import { Path } from 'canvas/path';

class Square extends Drawable {
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
		ctx.fillStyle = this.color;
		ctx.fillRect(this.x * ctx.canvas.width, this.y * ctx.canvas.height, this.size, this.size);

		// glow
		ctx.shadowColor = this.color;
		ctx.shadowBlur = 10;

		// decrease lifetime
		this.lifetime--;
		ctx.restore();
	}
}

class CritterPath extends Drawable {
	public readonly path = new Path([]);

	constructor(start: [number, number]) {
		super();

		this.path.properties.line.color = Color.fromName('blue').toString('rgb');
		this.path.add(start);
	}

	pos(pos: [number, number]) {
		this.path.points[this.path.points.length - 1] = pos;
	}

	draw(ctx: CanvasRenderingContext2D) {
		this.path.draw(ctx);
	}

	set() {
		const last = this.path.points[this.path.points.length - 1];
		this.path.points.push(last);

		if (this.path.points.length > 3) {
			this.path.points.shift();
		}
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
		ctx.fillStyle = this.config.color;
		ctx.beginPath();
		ctx.arc(
			this.config.x * ctx.canvas.width,
			this.config.y * ctx.canvas.height,
			this.config.size,
			0,
			Math.PI * 2
		);
		// glow
		ctx.shadowColor = this.config.color;
		ctx.shadowBlur = 10;
		ctx.fill();
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
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}
	const c = new Canvas(ctx);
	const critters = Array.from(
		{ length: 100 },
		(_, i) =>
			new Critter({
				x: Math.random(),
				y: Math.random(),
				size: Math.random() * 2,
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

		if (tick % 10 === 0) {
			const toAdd = Random.choose(critters);
			const newSquare = new Square(
				toAdd.config.x + (Math.random() - 0.5) * 0.1,
				toAdd.config.y + (Math.random() - 0.5) * 0.1,
				Math.random() * 10 + 5,
				Color.fromName('blue').toString('rgb'),
				Random.between(50, 100)
			);
			c.add(newSquare);
			squares.push(newSquare);
		}

		for (const c of critters) {
			switch (c.config.direction) {
				case 'up':
					c.config.y -= c.config.speed / canvas.height;
					if (c.config.y < 0) c.config.direction = 'down';
					break;
				case 'down':
					c.config.y += c.config.speed / canvas.height;
					if (c.config.y > 1) c.config.direction = 'up';
					break;
				case 'left':
					c.config.x -= c.config.speed / canvas.width;
					if (c.config.x < 0) c.config.direction = 'right';
					break;
				case 'right':
					c.config.x += c.config.speed / canvas.width;
					if (c.config.x > 1) c.config.direction = 'left';
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
