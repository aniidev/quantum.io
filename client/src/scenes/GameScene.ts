import { io, Socket } from 'socket.io-client';
import { Player } from '../entities/Player';
import { Wall } from '../entities/Wall';

export class GameScene extends Phaser.Scene {
    private socket!: Socket;
    private player: Player | null = null;
    private otherPlayers: Map<string, Player> = new Map();
    private damageTexts: Phaser.GameObjects.Text[] = [];
    private walls: Wall[] = [];

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load assets here
    }

    create() {
        this.socket = io();
        
        // Create walls
        this.createWalls();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('playerJoin');
        });

        this.socket.on('playerUpdate', (players) => {
            this.updatePlayers(players);
        });

        // Listen for attack events
        this.socket.on('playerAttack', (data) => {
            const attackingPlayer = this.otherPlayers.get(data.id);
            if (attackingPlayer) {
                attackingPlayer.showAttackEffect(data.state, data.angle);
            }

            const target = data.targetId === this.socket.id ? 
                this.player : this.otherPlayers.get(data.targetId);
            
            if (target) {
                // Show damage number
                this.showDamageNumber(target.sprite.x, target.sprite.y, data.damage);
                
                // Flash red when hit
                this.tweens.add({
                    targets: target.sprite,
                    alpha: 0.3,
                    yoyo: true,
                    duration: 100,
                    repeat: 1
                });
            }
        });
    }

    private createWalls() {
        // Create some walls in interesting patterns
        const walls = [
            // Center walls
            new Wall(this, 400, 300, 200, 20),  // Horizontal wall
            new Wall(this, 400, 400, 20, 200),  // Vertical wall
            
            // Corner barriers
            new Wall(this, 100, 100, 150, 20),
            new Wall(this, 100, 100, 20, 150),
            
            new Wall(this, 730, 100, 150, 20),
            new Wall(this, 730, 100, 20, 150),
            
            new Wall(this, 100, 530, 150, 20),
            new Wall(this, 100, 400, 20, 150),
            
            new Wall(this, 730, 530, 150, 20),
            new Wall(this, 730, 400, 20, 150),
        ];
        
        this.walls.push(...walls);
    }

    checkWallCollision(x: number, y: number, radius: number, isWaveState: boolean): boolean {
        if (isWaveState) return false; // Wave state can pass through walls
        
        return this.walls.some(wall => wall.checkCollision(x, y, radius));
    }

    private showDamageNumber(x: number, y: number, damage: number) {
        const text = this.add.text(x, y - 20, `-${damage}`, {
            fontSize: '20px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 3
        });
        text.setOrigin(0.5);
        
        this.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    private updatePlayers(players: any[]) {
        // Keep track of active players
        const activePlayers = new Set(players.map(p => p.id));
        
        // Remove disconnected players
        Array.from(this.otherPlayers.keys()).forEach(id => {
            if (!activePlayers.has(id)) {
                this.otherPlayers.get(id)?.sprite.destroy();
                this.otherPlayers.delete(id);
            }
        });

        players.forEach((playerData) => {
            if (playerData.id === this.socket.id) {
                if (!this.player) {
                    this.player = new Player(this, playerData);
                }
                this.player.updateFromServer(playerData);
            } else {
                if (!this.otherPlayers.has(playerData.id)) {
                    this.otherPlayers.set(
                        playerData.id,
                        new Player(this, playerData)
                    );
                }
                this.otherPlayers.get(playerData.id)?.updateFromServer(playerData);
            }
        });
    }

    update() {
        if (this.player) {
            this.player.update();
        }
        
        // Update other players
        this.otherPlayers.forEach(player => {
            player.update();
        });
    }
}
