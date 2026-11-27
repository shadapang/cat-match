import Phaser from 'phaser';
import { Board } from './board.js';

// PWA：SW 注册由 vite-plugin-pwa 的 virtual:pwa-register 生成（build 时）
function registerSW() {
  import('virtual:pwa-register').then(({ register }) => {
    register({
      immediate: true,
      onNeedRefresh() { location.reload(); },
    });
  }).catch(() => {});
}
registerSW();

// 5 种「猫咪/狗」程序化纹理（无外部图集依赖，避免资源缺失）
const CATS = [
  { key: 'orange', color: 0xe67e22 },
  { key: 'tabby',  color: 0x8d6e63 },
  { key: 'calico', color: 0xd16ba5 },
  { key: 'puppy',  color: 0x7d5a3c },
  { key: 'bigdog', color: 0xc0392b },
];

function makeTextures(scene) {
  CATS.forEach(({ key, color }) => {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillCircle(50, 64, 27);              // 身体
    g.fillCircle(50, 34, 20);              // 头
    g.fillTriangle(36, 20, 42, 9, 46, 24); // 左耳
    g.fillTriangle(64, 20, 58, 9, 54, 24); // 右耳
    g.fillStyle(0x2b1d14, 1);
    g.fillCircle(44, 33, 3); g.fillCircle(56, 33, 3); // 眼
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(50, 58, 11);              // 肚皮
    g.generateTexture('cat-' + key, 100, 100);
    g.destroy();
  });
}

function sizeFor(w, h) {
  const cell = Math.max(36, Math.min(64, Math.floor(Math.min((w - 24) / 8, (h - 160) / 8))));
  return { cell };
}

// 自适应窗口（上限 480，贴近手机比例）；innerWidth 在部分 webview/无头环境初始为 0，取元素或 390 兜底
function initialSize() {
  const el = document.getElementById('game');
  const w = Math.max(el?.clientWidth || 0, window.innerWidth || 0, 320);
  const h = Math.max(el?.clientHeight || 0, window.innerHeight || 0, 600);
  return { width: Math.min(w, 480), height: h };
}

const _sz = initialSize();
const cfg = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#faf6ef',
  width: _sz.width,
  height: _sz.height,
  scene: {
    create() {
      this.score = 0;
      this.level = 1;
      this.target = 300;
      makeTextures(this);
      const s = sizeFor(this.scale.width, this.scale.height);
      this.board = new Board(this, s.cell, this.scale.width, this.scale.height);
      this.ui = this.add.text(this.scale.width / 2, 30, '', { font: 'bold 15px system-ui', color: '#6b5844' })
        .setOrigin(0.5).setDepth(10);
      this.board.onMatched((points, cleared) => {
        this.score += points;
        this.board.clearedTotal += cleared;
        this.refreshUI();
        if (this.board.clearedTotal >= this.board.winsRequired) this.levelUp();
      });
      this.refreshUI();
      this.scale.on('resize', () => {
        const s2 = sizeFor(this.scale.width, this.scale.height);
        this.board.applyLayout(s2.cell, this.scale.width, this.scale.height);
      });
    },
    levelUp() {
      this.level += 1;
      this.board.clearedTotal = 0;
      this.board.winsRequired += 6;
      this.target += 200 * this.level;
      this.refreshUI();
      const t = this.add.text(this.scale.width / 2, this.scale.height / 2, `第 ${this.level - 1} 关完成！`,
        { font: 'bold 26px system-ui', color: '#c0392b' }).setOrigin(0.5).setDepth(99).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 180 });
      this.tweens.add({ targets: t, alpha: 0, duration: 1400, delay: 900, onComplete: () => t.destroy() });
    },
    refreshUI() {
      this.ui.setText(`第 ${this.level} 关 · 得分 ${this.score} · 目标 ${this.target}`);
    },
    update() {},
  },
};

const _game = new Phaser.Game(cfg);
// 诊断句柄（页面 DevTools 可查 __cmgame）
if (typeof window !== 'undefined') window.__cmgame = _game;

// 兜底：5s 内 canvas 未出现 → 显示错误层（web-view 网络受限等场景）
setTimeout(() => {
  if (!document.querySelector('#game canvas')) {
    const e = document.getElementById('err'); if (e) e.style.display = 'grid';
  }
}, 5000);
