import { Canvas } from 'canvas/canvas';
import { Drawable } from 'canvas/drawable';
import { Random } from 'ts-utils/math';
import { Color } from 'colors/color';
import { Circle } from 'canvas/circle';

class Bubble extends Drawable {
	private readonly circle: Circle;

	constructor(
		x: number,
		y: number,
		public size: number,
		public color: string,
		public velocity: [number, number]
	) {
		super();

		this.circle = new Circle([x, y], size);
		this.circle.properties.fill.color = color;
	}

	set x(x: number) {
		this.circle.x = x;
	}

	get x() {
		return this.circle.x;
	}

	set y(y: number) {
		this.circle.y = y;
	}

	get y() {
		return this.circle.y;
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.save();
		this.circle.draw(ctx);
		ctx.restore();
	}
}

export const render = (canvas: HTMLCanvasElement) => {
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}
	const c = new Canvas(ctx);
	const bubbles = Array.from(
		{ length: 20 },
		() =>
			new Bubble(
				Math.random(),
				Math.random(),
				Math.random() * 0.02 + 0.01,
				Color.random().toString(),
				[Math.random() * 0.01 - 0.005, Math.random() * 0.01 - 0.005]
			)
	);

	c.add(...bubbles);
	return c.animate(() => {
		for (const b of bubbles) {
			b.x += b.velocity[0];
			b.y += b.velocity[1];

			// Wall collision
			if (b.x + b.size > 1 || b.x - b.size < 0) b.velocity[0] *= -1;
			if (b.y + b.size > 1 || b.y - b.size < 0) b.velocity[1] *= -1;

			// Bubble collision
			for (const other of bubbles) {
				if (b === other) continue;

				const dx = other.x - b.x;
				const dy = other.y - b.y;
				const distance = Math.sqrt(dx * dx + dy * dy);
				const minDist = b.size + other.size;

				if (distance < minDist) {
					// Masses based on size
					const m1 = b.size;
					const m2 = other.size;

					// Normal vector
					const nx = dx / distance;
					const ny = dy / distance;

					// Tangent vector
					const tx = -ny;
					const ty = nx;

					// Dot product tangent
					const dpTan1 = b.velocity[0] * tx + b.velocity[1] * ty;
					const dpTan2 = other.velocity[0] * tx + other.velocity[1] * ty;

					// Dot product normal
					const dpNorm1 = b.velocity[0] * nx + b.velocity[1] * ny;
					const dpNorm2 = other.velocity[0] * nx + other.velocity[1] * ny;

					// Conservation of momentum in 1D
					const v1n = (dpNorm1 * (m1 - m2) + 2 * m2 * dpNorm2) / (m1 + m2);
					const v2n = (dpNorm2 * (m2 - m1) + 2 * m1 * dpNorm1) / (m1 + m2);

					// Convert scalar normal and tangential velocities into vectors
					b.velocity[0] = tx * dpTan1 + nx * v1n;
					b.velocity[1] = ty * dpTan1 + ny * v1n;
					other.velocity[0] = tx * dpTan2 + nx * v2n;
					other.velocity[1] = ty * dpTan2 + ny * v2n;

					// Slight separation to prevent sticking
					const overlap = 0.5 * (minDist - distance);
					b.x -= nx * overlap;
					b.y -= ny * overlap;
					other.x += nx * overlap;
					other.y += ny * overlap;
				}
			}
		}
	});
};
