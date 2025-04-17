export class Wall {
    public sprite: Phaser.GameObjects.Graphics;
    public bounds: Phaser.Geom.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
        this.sprite = scene.add.graphics();
        this.bounds = new Phaser.Geom.Rectangle(x, y, width, height);
        this.draw();
    }

    draw() {
        this.sprite.clear();
        this.sprite.lineStyle(2, 0x444444);
        this.sprite.fillStyle(0x222222);
        this.sprite.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
        this.sprite.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    }

    checkCollision(x: number, y: number, radius: number): boolean {
        // Expand the rectangle by the radius for circle-rectangle collision
        const expandedBounds = new Phaser.Geom.Rectangle(
            this.bounds.x - radius,
            this.bounds.y - radius,
            this.bounds.width + radius * 2,
            this.bounds.height + radius * 2
        );
        return expandedBounds.contains(x, y);
    }

    destroy() {
        this.sprite.destroy();
    }
}
