import 'phaser';
import { GameScene } from '../scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    backgroundColor: '#1a1a1a',  // Dark background for better visibility
    scene: GameScene,
    render: {
        pixelArt: false,
        antialias: true
    }
};

window.addEventListener('load', () => {
    new Phaser.Game(config);
});
