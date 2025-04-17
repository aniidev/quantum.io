export class Player {
    private scene: Phaser.Scene;
    public sprite: Phaser.GameObjects.Graphics;
    public id: string;
    private state: 'particle' | 'wave' = 'particle';
    private energy: number = 100;
    private stateKey: Phaser.Input.Keyboard.Key;
    private attackKey: Phaser.Input.Keyboard.Key;
    private targetX: number = 0;
    private targetY: number = 0;
    private lastUpdateTime: number = 0;
    private lastAttackTime: number = 0;
    private attackCooldown: number = 300; // Reduced cooldown for smoother attacks
    private radius: number = 20;
    public isDead: boolean = false;
    private healthText: Phaser.GameObjects.Text | null = null;
    private currentAngle: number = 0;
    private lastMoveX: number = 0;
    private lastMoveY: number = 0;
    private directionIndicator: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, data: any) {
        this.scene = scene;
        this.id = data.id;
        this.sprite = scene.add.graphics();
        this.stateKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.targetX = data.x;
        this.targetY = data.y;
        this.sprite.x = data.x;
        this.sprite.y = data.y;
        this.lastUpdateTime = data.timestamp || Date.now();
        
        // Create direction indicator
        this.directionIndicator = scene.add.graphics();
        
        this.updateFromServer(data);
        this.draw();
    }

    updateFromServer(data: any) {
        if (this.id !== (this.scene as any).socket.id) {
            this.targetX = data.x;
            this.targetY = data.y;
            this.lastUpdateTime = data.timestamp;
            this.state = data.state;
            
            // Show attack effects for other players
            if (data.attacking) {
                this.showAttackEffect(data.state, data.attackAngle);
            }
        } else {
            this.sprite.x = data.x;
            this.sprite.y = data.y;
        }
        
        this.energy = data.energy;
        this.isDead = data.energy <= 0;
        if (this.isDead) {
            this.sprite.alpha = 0.5;
        }
        this.draw(); // Make sure to redraw after every update
    }

    canAttack(): boolean {
        return Date.now() - this.lastAttackTime >= this.attackCooldown && !this.isDead;
    }

    attack(target: Player): void {
        if (!this.canAttack() || target.isDead) return;

        this.lastAttackTime = Date.now();
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            target.sprite.x,
            target.sprite.y
        );

        // Get angle to target for damage calculation
        const pointer = this.scene.input.activePointer;
        const attackAngle = Phaser.Math.Angle.Between(
            this.sprite.x,
            this.sprite.y,
            pointer.worldX,
            pointer.worldY
        );
        
        const angleToTarget = Phaser.Math.Angle.Between(
            this.sprite.x,
            this.sprite.y,
            target.sprite.x,
            target.sprite.y
        );
        
        // Calculate angle difference between attack direction and target
        const angleDiff = Phaser.Math.Angle.Wrap(angleToTarget - attackAngle);
        
        let damage = 0;
        if (this.state === 'particle') {
            // Particle state: Direct hit with quantum tunneling
            const tunnelChance = 0.3;
            const inBeam = Math.abs(angleDiff) < Math.PI/4; // 45-degree beam
            
            if (distance < 200 && inBeam || Math.random() < tunnelChance) {
                damage = 15;
                this.showAttackEffect('particle');
            }
        } else {
            // Wave state: Increased area damage with interference patterns
            const maxRange = 150;
            if (distance < maxRange && Math.abs(angleDiff) < Math.PI/3) { // 60-degree arc
                damage = Math.floor(40 * (1 - distance / maxRange)); // Increased base damage
                this.showAttackEffect('wave');
            }
        }

        if (damage > 0) {
            const socket = (this.scene as any).socket;
            if (socket) {
                socket.emit('playerAttack', {
                    targetId: target.id,
                    damage: damage,
                    attackerState: this.state
                });
            }
        }
    }

    showAttackEffect(type: 'particle' | 'wave', attackAngle?: number): void {
        const effect = this.scene.add.graphics();
        effect.x = this.sprite.x;
        effect.y = this.sprite.y;

        // If attackAngle is not provided (local player), get it from mouse pointer
        if (attackAngle === undefined) {
            const pointer = this.scene.input.activePointer;
            attackAngle = Phaser.Math.Angle.Between(
                this.sprite.x,
                this.sprite.y,
                pointer.worldX,
                pointer.worldY
            );
        }
        
        if (type === 'particle') {
            // Enhanced particle beam attack with longer range
            const beamLength = 400; // Increased from 200
            const beamWidth = 12;
            
            // Core beam
            effect.lineStyle(beamWidth, 0xff0000, 1);
            effect.beginPath();
            effect.moveTo(0, 0);
            effect.lineTo(
                Math.cos(attackAngle) * beamLength,
                Math.sin(attackAngle) * beamLength
            );
            effect.strokePath();
            
            // Inner bright beam
            effect.lineStyle(beamWidth * 0.5, 0xff8888, 1);
            effect.beginPath();
            effect.moveTo(0, 0);
            effect.lineTo(
                Math.cos(attackAngle) * beamLength * 0.95,
                Math.sin(attackAngle) * beamLength * 0.95
            );
            effect.strokePath();
            
            // Outer glow
            for (let i = 1; i <= 3; i++) {
                effect.lineStyle(beamWidth + i * 4, 0xff0000, 0.15);
                effect.beginPath();
                effect.moveTo(0, 0);
                effect.lineTo(
                    Math.cos(attackAngle) * beamLength * (1 - i * 0.1),
                    Math.sin(attackAngle) * beamLength * (1 - i * 0.1)
                );
                effect.strokePath();
            }
            
            // Energy particles along the beam
            for (let i = 0; i < 12; i++) { // Increased from 8 for longer beam
                const distance = (beamLength * i) / 12;
                const spread = Math.sin(i) * 5;
                const x = Math.cos(attackAngle) * distance + Math.cos(attackAngle + Math.PI/2) * spread;
                const y = Math.sin(attackAngle) * distance + Math.sin(attackAngle + Math.PI/2) * spread;
                
                effect.lineStyle(2, 0xff8888, 1);
                effect.beginPath();
                for (let j = 0; j < Math.PI * 2; j += Math.PI/3) {
                    const particleX = x + Math.cos(j) * 3;
                    const particleY = y + Math.sin(j) * 3;
                    if (j === 0) {
                        effect.moveTo(particleX, particleY);
                    } else {
                        effect.lineTo(particleX, particleY);
                    }
                }
                effect.closePath();
                effect.strokePath();
                effect.fillStyle(0xff0000, 0.8);
                effect.fill();
            }
            
            // Impact flash at the start
            effect.lineStyle(2, 0xffff00, 1);
            for (let i = 0; i < 8; i++) {
                const flashAngle = attackAngle + (Math.PI * 2 * i) / 8;
                effect.beginPath();
                effect.moveTo(0, 0);
                effect.lineTo(
                    Math.cos(flashAngle) * 15,
                    Math.sin(flashAngle) * 15
                );
                effect.strokePath();
            }
        } else {
            // Wave attack (existing code)
            const waveWidth = Math.PI / 2;
            const maxRadius = 150;
            
            for (let radius = 20; radius <= maxRadius; radius += 15) {
                const alpha = 1 - radius/maxRadius;
                effect.lineStyle(3, 0x00ffff, alpha);
                effect.beginPath();
                
                for (let angle = -waveWidth/2; angle <= waveWidth/2; angle += 0.1) {
                    const actualAngle = attackAngle + angle;
                    const ripple = Math.sin(radius * 0.1 + angle * 5) * 8;
                    const x = Math.cos(actualAngle) * (radius + ripple);
                    const y = Math.sin(actualAngle) * (radius + ripple);
                    
                    if (angle === -waveWidth/2) {
                        effect.moveTo(x, y);
                    } else {
                        effect.lineTo(x, y);
                    }
                }
                effect.strokePath();
                
                if (radius % 30 === 0) {
                    effect.lineStyle(2, 0x00ffff, alpha * 0.5);
                    for (let i = -waveWidth/2; i <= waveWidth/2; i += Math.PI/8) {
                        const angle = attackAngle + i;
                        effect.beginPath();
                        effect.moveTo(
                            Math.cos(angle) * (radius - 10),
                            Math.sin(angle) * (radius - 10)
                        );
                        effect.lineTo(
                            Math.cos(angle) * (radius + 10),
                            Math.sin(angle) * (radius + 10)
                        );
                        effect.strokePath();
                    }
                }
            }
        }

        // Animate the effect
        if (type === 'particle') {
            this.scene.tweens.add({
                targets: effect,
                alpha: 0,
                duration: 250,
                ease: 'Power2',
                onComplete: () => effect.destroy()
            });
        } else {
            this.scene.tweens.add({
                targets: effect,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => effect.destroy()
            });
        }
    }

    takeDamage(damage: number): void {
        this.energy = Math.max(0, this.energy - damage);
        if (this.energy <= 0) {
            this.isDead = true;
            this.sprite.alpha = 0.5;
        }
    }

    update() {
        // Handle state switching
        if (Phaser.Input.Keyboard.JustDown(this.stateKey)) {
            this.state = this.state === 'particle' ? 'wave' : 'particle';
            this.draw();
            
            const socket = (this.scene as any).socket;
            if (socket) {
                socket.emit('playerStateChange', {
                    state: this.state
                });
            }
        }

        // Local player movement and attack direction
        if (this.id === (this.scene as any).socket.id && !this.isDead) {
            if (this.scene.input.activePointer.isDown) {
                const pointer = this.scene.input.activePointer;
                this.currentAngle = Phaser.Math.Angle.Between(
                    this.sprite.x,
                    this.sprite.y,
                    pointer.worldX,
                    pointer.worldY
                );
                
                // Wave state moves faster and can pass through walls
                const baseSpeed = this.state === 'particle' ? 5 : 8;
                const velocityX = Math.cos(this.currentAngle) * baseSpeed;
                const velocityY = Math.sin(this.currentAngle) * baseSpeed;
                
                this.lastMoveX = velocityX;
                this.lastMoveY = velocityY;
                
                // Calculate new position
                const newX = this.sprite.x + velocityX;
                const newY = this.sprite.y + velocityY;
                
                // Check wall collision (only in particle state)
                const gameScene = this.scene as any;
                const willCollide = gameScene.checkWallCollision(
                    newX, 
                    newY, 
                    this.radius,
                    this.state === 'wave'
                );
                
                if (!willCollide) {
                    this.sprite.x = newX;
                    this.sprite.y = newY;
                    
                    const socket = (this.scene as any).socket;
                    if (socket) {
                        socket.emit('playerMove', {
                            x: this.sprite.x,
                            y: this.sprite.y,
                            state: this.state
                        });
                    }
                }
            }

            // Handle attacks with directional targeting
            if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
                const gameScene = this.scene as any;
                let closestEnemy: Player | null = null;
                let closestDistance = Infinity;

                // Find enemies in attack direction
                gameScene.otherPlayers.forEach((player: Player) => {
                    if (!player.isDead) {
                        const angle = Phaser.Math.Angle.Between(
                            this.sprite.x,
                            this.sprite.y,
                            player.sprite.x,
                            player.sprite.y
                        );
                        
                        const angleDiff = Phaser.Math.Angle.Wrap(angle - this.currentAngle);
                        const distance = Phaser.Math.Distance.Between(
                            this.sprite.x,
                            this.sprite.y,
                            player.sprite.x,
                            player.sprite.y
                        );
                        
                        // Check if there's a wall between player and target (only in particle state)
                        let blocked = false;
                        if (this.state === 'particle') {
                            // Check a few points along the line to the target
                            for (let t = 0; t <= 1; t += 0.1) {
                                const checkX = this.sprite.x + (player.sprite.x - this.sprite.x) * t;
                                const checkY = this.sprite.y + (player.sprite.y - this.sprite.y) * t;
                                if (gameScene.checkWallCollision(checkX, checkY, 5, false)) {
                                    blocked = true;
                                    break;
                                }
                            }
                        }
                        
                        // Only target enemies in front of the player (within 90 degrees) and not blocked by walls
                        if (!blocked && Math.abs(angleDiff) < Math.PI/2 && distance < closestDistance) {
                            closestDistance = distance;
                            closestEnemy = player;
                        }
                    }
                });

                if (closestEnemy) {
                    this.attack(closestEnemy);
                } else {
                    // Show attack effect even if no target
                    this.showAttackEffect(this.state);
                }
            }
        } else {
            // Smooth interpolation for other players
            const t = Math.min(1, (Date.now() - this.lastUpdateTime) / 100);
            this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, t * 0.3);
            this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, t * 0.3);
        }
        
        // Always update health text position
        if (this.healthText) {
            this.healthText.setPosition(this.sprite.x, this.sprite.y - 45);
        }
    }

    draw() {
        this.sprite.clear();
        
        const color = this.isDead ? 0x666666 : (this.state === 'particle' ? 0x00ff00 : 0x00ffff);
        
        if (this.state === 'particle') {
            // Draw particle state
            this.sprite.lineStyle(2, color);
            this.sprite.fillStyle(color, 0.5);
            this.sprite.beginPath();
            this.sprite.arc(0, 0, this.radius, 0, Math.PI * 2);
            this.sprite.closePath();
            this.sprite.fill();
            this.sprite.stroke();
        } else {
            // Draw wave state with more interesting pattern
            this.sprite.lineStyle(2, color);
            
            // Inner wave pattern
            for (let i = 0; i < Math.PI * 2; i += Math.PI / 8) {
                const x = Math.cos(i) * this.radius;
                const y = Math.sin(i) * this.radius;
                const wave = Math.sin(Date.now() * 0.01 + i * 2) * 5;
                if (i === 0) {
                    this.sprite.moveTo(x + wave, y + wave);
                } else {
                    this.sprite.lineTo(x + wave, y + wave);
                }
            }
            this.sprite.closePath();
            this.sprite.stroke();
            
            // Outer glow effect
            this.sprite.lineStyle(1, color, 0.3);
            for (let r = this.radius - 5; r <= this.radius + 5; r += 2) {
                this.sprite.beginPath();
                for (let i = 0; i < Math.PI * 2; i += Math.PI / 16) {
                    const x = Math.cos(i) * r;
                    const y = Math.sin(i) * r;
                    const wave = Math.sin(Date.now() * 0.01 + i * 3) * 3;
                    if (i === 0) {
                        this.sprite.moveTo(x + wave, y + wave);
                    } else {
                        this.sprite.lineTo(x + wave, y + wave);
                    }
                }
                this.sprite.closePath();
                this.sprite.stroke();
            }
        }
        
        // Draw direction indicator
        this.updateDirectionIndicator();
        
        // Draw health bar
        const barWidth = 50;
        const barHeight = 8;
        const yOffset = -35;
        
        // Background with border
        this.sprite.lineStyle(1, 0x000000);
        this.sprite.beginPath();
        this.sprite.fillStyle(0x000000, 0.3);
        this.sprite.fillRect(-barWidth/2, yOffset, barWidth, barHeight);
        this.sprite.strokeRect(-barWidth/2, yOffset, barWidth, barHeight);
        
        // Health fill with color based on percentage
        const healthPercent = this.energy / 100;
        const healthWidth = barWidth * healthPercent;
        let healthColor = 0x00ff00; // Green
        if (healthPercent < 0.6) healthColor = 0xffff00; // Yellow
        if (healthPercent < 0.3) healthColor = 0xff0000; // Red
        
        this.sprite.fillStyle(healthColor, 1);
        this.sprite.fillRect(-barWidth/2, yOffset, healthWidth, barHeight);

        // Update health text position
        if (this.healthText) {
            this.healthText.destroy();
        }
        
        // Create new health text
        this.healthText = this.scene.add.text(
            this.sprite.x,
            this.sprite.y + yOffset - 10,
            `${Math.ceil(this.energy)}`,
            {
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
    }

    updateDirectionIndicator() {
        this.directionIndicator.clear();
        if (this.id === (this.scene as any).socket.id && !this.isDead) {
            const pointer = this.scene.input.activePointer;
            this.currentAngle = Phaser.Math.Angle.Between(
                this.sprite.x,
                this.sprite.y,
                pointer.worldX,
                pointer.worldY
            );
            
            // Draw just a small triangle in the direction
            const color = this.state === 'particle' ? 0xff3333 : 0x00ffff;
            this.directionIndicator.x = this.sprite.x;
            this.directionIndicator.y = this.sprite.y;
            
            // Triangle pointer
            const distance = this.radius + 10;
            const tipX = Math.cos(this.currentAngle) * distance;
            const tipY = Math.sin(this.currentAngle) * distance;
            
            const sideAngle = 0.5; // Width of the triangle point
            const sideLength = 8; // Length of the triangle sides
            
            this.directionIndicator.lineStyle(2, color);
            this.directionIndicator.beginPath();
            this.directionIndicator.moveTo(tipX, tipY);
            this.directionIndicator.lineTo(
                tipX - sideLength * Math.cos(this.currentAngle - sideAngle),
                tipY - sideLength * Math.sin(this.currentAngle - sideAngle)
            );
            this.directionIndicator.lineTo(
                tipX - sideLength * Math.cos(this.currentAngle + sideAngle),
                tipY - sideLength * Math.sin(this.currentAngle + sideAngle)
            );
            this.directionIndicator.closePath();
            this.directionIndicator.fillStyle(color, 0.8);
            this.directionIndicator.fill();
        }
    }

    destroy() {
        if (this.healthText) this.healthText.destroy();
        this.sprite.destroy();
    }
}
