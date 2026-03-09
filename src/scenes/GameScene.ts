import Phaser from 'phaser';
import {
  INITIAL_PIPE_SPAWN_DELAY_MS,
  INITIAL_WORLD_SPEED,
  JUMP_VELOCITY,
  MAX_WORLD_SPEED,
  MIN_PIPE_SPAWN_DELAY_MS,
  PIPE_GAP_SIZE,
  PIPE_MARGIN_BOTTOM,
  PIPE_MARGIN_TOP,
  PIPE_WIDTH,
  PLAYER_GRAVITY,
  PLAYER_X,
  SPAWN_DELAY_DECREMENT_PER_SCORE,
  SPEED_INCREMENT_PER_SCORE
} from '../game/constants';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import type { GameStatus, RankingEntry } from '../game/types';
import { getRanking, saveScore } from '../services/ranking';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private pipes!: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;

  private status: GameStatus = 'menu';
  private score = 0;
  private speed = INITIAL_WORLD_SPEED;

  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private rankingText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.svg('sky', '/assets/sky.svg');
    this.load.svg('cloud', '/assets/cloud.svg');
    this.load.svg('bird', '/assets/bird.svg');
    this.load.svg('pipe', '/assets/pipe.svg');
  }

  create(): void {
    this.createBackground();
    this.createWorldBounds();
    this.createPipes();
    this.createPlayer();
    this.createUi();
    this.setupControls();
    this.showMenu();
  }

  update(): void {
    if (this.status !== 'running') {
      return;
    }

    const velocityY = this.player.body?.velocity.y ?? 0;
    this.player.setAngle(Phaser.Math.Clamp(velocityY * 0.08, -20, 45));

    if (this.player.y >= GAME_HEIGHT - 40 || this.player.y <= 20) {
      this.endRun();
    }

    this.pipes.children.each((obj) => {
      const pipe = obj as Phaser.Physics.Arcade.Image;
      if (pipe.x < -PIPE_WIDTH) {
        pipe.destroy();
        return true;
      }

      const scored = (pipe.getData('scored') as boolean | undefined) ?? false;
      const isTopPipe = (pipe.getData('isTop') as boolean | undefined) ?? false;

      if (!scored && !isTopPipe && pipe.x + PIPE_WIDTH / 2 < this.player.x) {
        pipe.setData('scored', true);
        this.incrementScore();
      }

      return true;
    });
  }

  private createBackground(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'sky').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 4; i += 1) {
      const cloud = this.add
        .image(120 + i * 120, 90 + (i % 2) * 70, 'cloud')
        .setScale(0.45 + i * 0.06)
        .setAlpha(0.85);

      this.tweens.add({
        targets: cloud,
        x: cloud.x - 40,
        yoyo: true,
        repeat: -1,
        duration: 3500 + i * 800,
        ease: 'Sine.inOut'
      });
    }

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH, 40, 0x2d6a4f, 0.9).setDepth(2);
  }

  private createWorldBounds(): void {
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT - 24);
  }

  private createPlayer(): void {
    this.player = this.physics.add
      .sprite(PLAYER_X, GAME_HEIGHT / 2, 'bird')
      .setScale(0.58)
      .setDepth(10)
      .setCollideWorldBounds(true);

    this.player.body?.setCircle(this.player.width * 0.22, this.player.width * 0.25, this.player.height * 0.2);
    (this.player.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false);

    this.tweens.add({
      targets: this.player,
      y: this.player.y + 8,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  private createPipes(): void {
    this.pipes = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.physics.add.collider(this.player, this.pipes, () => this.endRun(), undefined, this);
  }

  private createUi(): void {
    this.scoreText = this.add
      .text(24, 18, 'Score: 0', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '34px',
        fontStyle: '700',
        color: '#ffffff'
      })
      .setDepth(20);

    this.speedText = this.add
      .text(24, 60, 'Velocidade: 170', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '18px',
        color: '#e9ecef'
      })
      .setDepth(20);

    this.titleText = this.add
      .text(GAME_WIDTH / 2, 180, 'SKY HOPPER', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '56px',
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#1d3557',
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.hintText = this.add
      .text(GAME_WIDTH / 2, 260, 'Toque, clique ou ESPAÇO para voar', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '24px',
        color: '#f1faee',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.rankingText = this.add
      .text(GAME_WIDTH / 2, 410, '', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        align: 'left',
        lineSpacing: 6
      })
      .setOrigin(0.5, 0)
      .setDepth(20);
  }

  private setupControls(): void {
    this.input.keyboard?.on('keydown-SPACE', () => this.handleAction());
    this.input.on('pointerdown', () => this.handleAction());
  }

  private handleAction(): void {
    if (this.status === 'menu') {
      this.startRun();
      return;
    }

    if (this.status === 'running') {
      this.flap();
      return;
    }

    this.resetRun();
  }

  private showMenu(): void {
    this.status = 'menu';
    this.scoreText.setText('Score: 0');
    this.speedText.setText(`Velocidade: ${INITIAL_WORLD_SPEED}`);
    this.titleText.setText('SKY HOPPER').setVisible(true);
    this.hintText.setText('Toque, clique ou ESPAÇO para começar').setVisible(true);

    this.renderRanking(getRanking(), '🏆 Ranking Global (Local)');
  }

  private startRun(): void {
    this.status = 'running';
    this.score = 0;
    this.speed = INITIAL_WORLD_SPEED;

    this.scoreText.setText('Score: 0');
    this.speedText.setText(`Velocidade: ${Math.round(this.speed)}`);
    this.titleText.setVisible(false);
    this.hintText.setVisible(false);
    this.rankingText.setVisible(false);

    this.player.setPosition(PLAYER_X, GAME_HEIGHT / 2);
    this.player.setVelocity(0, 0);
    this.player.setAngle(0);
    (this.player.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(true);
    this.player.setGravityY(PLAYER_GRAVITY);

    this.clearPipes();
    this.spawnPipePair();

    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.addEvent({
      delay: this.calculateSpawnDelay(),
      callback: this.spawnPipePair,
      callbackScope: this,
      loop: true
    });

    this.flap();
  }

  private flap(): void {
    this.player.setVelocityY(JUMP_VELOCITY);
  }

  private spawnPipePair(): void {
    const gapCenter = Phaser.Math.Between(
      PIPE_MARGIN_TOP + PIPE_GAP_SIZE / 2,
      GAME_HEIGHT - PIPE_MARGIN_BOTTOM - PIPE_GAP_SIZE / 2
    );

    const topPipeHeight = gapCenter - PIPE_GAP_SIZE / 2;
    const bottomPipeY = gapCenter + PIPE_GAP_SIZE / 2;
    const bottomPipeHeight = GAME_HEIGHT - PIPE_MARGIN_BOTTOM - bottomPipeY;

    this.createPipe(GAME_WIDTH + PIPE_WIDTH / 2, topPipeHeight / 2, topPipeHeight, true);
    this.createPipe(GAME_WIDTH + PIPE_WIDTH / 2, bottomPipeY + bottomPipeHeight / 2, bottomPipeHeight, false);
  }

  private createPipe(x: number, y: number, height: number, isTop: boolean): void {
    const pipe = this.physics.add
      .image(x, y, 'pipe')
      .setDisplaySize(PIPE_WIDTH, height)
      .setVelocityX(-this.speed)
      .setImmovable(true)
      .setDepth(8);

    if (isTop) {
      pipe.setFlipY(true);
    }

    (pipe.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false);
    pipe.setData('isTop', isTop);
    pipe.setData('scored', false);
    this.pipes.add(pipe);
  }

  private incrementScore(): void {
    this.score += 1;
    this.scoreText.setText(`Score: ${this.score}`);
    this.updateDifficulty();
  }

  private updateDifficulty(): void {
    this.speed = Math.min(MAX_WORLD_SPEED, INITIAL_WORLD_SPEED + this.score * SPEED_INCREMENT_PER_SCORE);
    this.speedText.setText(`Velocidade: ${Math.round(this.speed)}`);

    this.pipes.children.each((obj) => {
      const pipe = obj as Phaser.Physics.Arcade.Image;
      pipe.setVelocityX(-this.speed);
      return true;
    });

    if (this.spawnTimer) {
      this.spawnTimer.reset({
        delay: this.calculateSpawnDelay(),
        callback: this.spawnPipePair,
        callbackScope: this,
        loop: true
      });
    }
  }

  private calculateSpawnDelay(): number {
    return Math.max(
      MIN_PIPE_SPAWN_DELAY_MS,
      INITIAL_PIPE_SPAWN_DELAY_MS - this.score * SPAWN_DELAY_DECREMENT_PER_SCORE
    );
  }

  private endRun(): void {
    if (this.status !== 'running') {
      return;
    }

    this.status = 'gameover';
    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;

    (this.player.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false);
    this.player.setVelocity(0, 0);

    this.pipes.children.each((obj) => {
      (obj as Phaser.Physics.Arcade.Image).setVelocityX(0);
      return true;
    });

    const ranking = saveScore(this.score);
    this.titleText.setText('FIM DE JOGO').setVisible(true);
    this.hintText.setText('Clique/toque para voltar ao menu').setVisible(true);
    this.renderRanking(ranking, `🏁 Sua pontuação: ${this.score}`);
  }

  private resetRun(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;
    this.clearPipes();
    (this.player.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false);
    this.player.setVelocity(0, 0);
    this.player.setGravityY(0);
    this.player.setPosition(PLAYER_X, GAME_HEIGHT / 2);
    this.player.setAngle(0);
    this.showMenu();
  }

  private renderRanking(ranking: RankingEntry[], title: string): void {
    if (ranking.length === 0) {
      this.rankingText.setText(`${title}\n\nSem pontuações ainda.\nSeja o primeiro!`).setVisible(true);
      return;
    }

    const items = ranking
      .map((entry, index) => {
        const date = new Date(entry.date).toLocaleDateString('pt-BR');
        return `${index + 1}. ${entry.score.toString().padStart(2, '0')} pts  •  ${date}`;
      })
      .join('\n');

    this.rankingText.setText(`${title}\n\n${items}`).setVisible(true);
  }

  private clearPipes(): void {
    this.pipes.children.each((obj) => {
      obj.destroy();
      return true;
    });
    this.pipes.clear(true, true);
  }
}
