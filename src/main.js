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
// 120x120 画布，圆角底版 + 动物本体；key 必须与 board.js 的 TYPE_KEYS 一致
const INK = 0x2b1d14;

const CATS = [
  { key: 'orange', kind: 'cat',  body: 0xf6a24b, cream: 0xfdf0dc, earIn: 0xfbd9b4, stripe: null,      bg: 0xfdf1e1, edge: 0xe89a4e },
  { key: 'tabby',  kind: 'cat',  body: 0xb08a64, cream: 0xefe0cc, earIn: 0xe6cdae, stripe: 0x7c5f42, bg: 0xf3eadb, edge: 0x9c7850 },
  { key: 'calico', kind: 'cat',  body: 0xfdfbf6, cream: 0xffffff, earIn: 0xf3b9a6, stripe: null,      bg: 0xfbeee4, edge: 0xd8a37f, patch: [0xef9f45, 0x4e3b2c] },
  { key: 'puppy',  kind: 'dog',  body: 0xe7c27a, cream: 0xfdf6e6, ear: 0xb98a4a,                     bg: 0xfbf2dd, edge: 0xcf9f54 },
  { key: 'bigdog', kind: 'dog',  body: 0x8a6a4e, cream: 0xefe2ce, ear: 0x5e4632,                     bg: 0xf1e8da, edge: 0x6f5439 },
];

function tileBase(g, o) {
  g.fillStyle(o.bg, 1);
  g.fillRoundedRect(2, 2, 116, 116, 24);
  g.lineStyle(3.5, o.edge, 0.7);
  g.strokeRoundedRect(2, 2, 116, 116, 24);
}

function face(g, eyeY = 54) {
  g.fillStyle(INK, 1);
  g.fillCircle(50, eyeY, 5);
  g.fillCircle(70, eyeY, 5);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(51.8, eyeY - 1.8, 1.9);
  g.fillCircle(71.8, eyeY - 1.8, 1.9);
  g.fillStyle(0xf2a0a0, 0.45); // 腮红
  g.fillCircle(40, 64, 5.2);
  g.fillCircle(80, 64, 5.2);
}

function drawCat(g, o) {
  g.fillStyle(o.body, 1);
  g.fillEllipse(60, 96, 58, 32);            // 身体
  g.fillStyle(o.cream, 1);
  g.fillEllipse(60, 99, 30, 18);            // 肚皮
  g.fillStyle(o.body, 1);
  g.fillEllipse(43, 107, 18, 10);           // 前爪
  g.fillEllipse(77, 107, 18, 10);
  g.fillStyle(o.body, 1);                   // 耳朵（压在头下）
  g.fillTriangle(38, 42, 46, 12, 60, 34);
  g.fillTriangle(82, 42, 74, 12, 60, 34);
  g.fillStyle(o.earIn, 1);
  g.fillTriangle(43, 37, 48, 20, 57, 33);
  g.fillTriangle(77, 37, 72, 20, 63, 33);
  g.fillStyle(o.body, 1);
  g.fillCircle(60, 56, 25);                 // 头
  if (o.patch) {                            // 三花斑块（压在头/身上，避开眼鼻）
    g.fillStyle(o.patch[0], 1);
    g.fillCircle(44, 35, 11);
    g.fillEllipse(78, 94, 26, 18);
    g.fillStyle(o.patch[1], 1);
    g.fillEllipse(42, 96, 20, 14);
    g.fillCircle(75, 33, 8);
  }
  if (o.stripe) {                          // 狸花纹
    g.lineStyle(3, o.stripe, 0.85);
    g.lineBetween(52, 33, 54, 44);
    g.lineBetween(60, 31, 60, 44);
    g.lineBetween(68, 33, 66, 44);
  }
  face(g);
  g.fillStyle(0xd96a7f, 1);                 // 鼻
  g.fillTriangle(56, 62, 64, 62, 60, 67);
  g.lineStyle(2, INK, 0.55);                // 嘴
  g.lineBetween(60, 67, 60, 71);
  g.lineBetween(60, 71, 55, 74);
  g.lineBetween(60, 71, 65, 74);
  g.lineStyle(1.6, INK, 0.32);              // 胡须
  g.lineBetween(40, 62, 25, 57);
  g.lineBetween(40, 66, 25, 67);
  g.lineBetween(80, 62, 95, 57);
  g.lineBetween(80, 66, 95, 67);
}

function drawDog(g, o) {
  g.fillStyle(o.ear, 1);                    // 垂耳
  g.fillEllipse(32, 58, 21, 44);
  g.fillEllipse(88, 58, 21, 44);
  g.fillStyle(o.body, 1);
  g.fillEllipse(60, 96, 58, 32);
  g.fillStyle(o.cream, 1);
  g.fillEllipse(60, 99, 30, 18);
  g.fillStyle(o.body, 1);
  g.fillEllipse(43, 107, 18, 10);
  g.fillEllipse(77, 107, 18, 10);
  g.fillStyle(o.body, 1);
  g.fillCircle(60, 56, 25);                 // 头
  g.fillStyle(o.cream, 1);
  g.fillEllipse(60, 69, 27, 19);            // 口鼻
  face(g, 52);
  g.fillStyle(INK, 1);                      // 鼻
  g.fillCircle(60, 63, 4.6);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(61.6, 61.4, 1.5);
  g.lineStyle(2, INK, 0.5);                 // 嘴
  g.lineBetween(60, 68, 60, 72);
  g.fillStyle(0xe87a8b, 1);                 // 舌头
  g.fillEllipse(60, 75, 10, 7);
}

function makeTextures(scene) {
  CATS.forEach((o) => {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    tileBase(g, o);
    // 动物整体内缩到 84%，让棋子有留白、不顶格
    g.save();
    g.translateCanvas(60, 63);
    g.scaleCanvas(0.82, 0.82);
    g.translateCanvas(-60, -60);
    if (o.kind === 'dog') drawDog(g, o); else drawCat(g, o);
    g.restore();
    g.generateTexture('cat-' + o.key, 120, 120);
    g.destroy();
  });
}

function sizeFor(w, h) {
  return { cell: Math.max(36, Math.min(64, Math.floor(Math.min((w - 24) / 8, (h - 160) / 8)))) };
}

// 自适应窗口（上限 480，贴近手机比例）；innerWidth 在部分 webview/无头环境初始为 0，取元素或 320 兜底
function initialSize() {
  const el = document.getElementById('game');
  const w = Math.max(el?.clientWidth || 0, window.innerWidth || 0, 320);
  const h = Math.max(el?.clientHeight || 0, window.innerHeight || 0, 600);
  return { width: Math.min(w, 480), height: h };
}

// 必须用 Scene 子类：Phaser 对「对象字面量 scene」只安装生命周期钩子，
// 自定义方法（refreshUI/levelUp）不会挂到实例上，调用即 TypeError 中断 create()。
class GameScene extends Phaser.Scene {
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
  }

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
  }

  refreshUI() {
    this.ui.setText(`第 ${this.level} 关 · 得分 ${this.score} · 目标 ${this.target}`);
  }

  update() {}
}

const _sz = initialSize();
const cfg = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#faf6ef',
  width: _sz.width,
  height: _sz.height,
  scene: GameScene,
};

const _game = new Phaser.Game(cfg);
// 诊断句柄（页面 DevTools 可查 __cmgame）
if (typeof window !== 'undefined') window.__cmgame = _game;

function showErr(msg) {
  const e = document.getElementById('err');
  if (!e) return;
  if (msg) e.querySelector('p').textContent = `初始化失败：${msg}`;
  e.style.display = 'grid';
}

// 运行期错误直接摊到界面，便于定位（不再静默白屏）
window.addEventListener('error', (ev) => {
  // eslint-disable-next-line no-console
  console.error('[cat-match]', ev.message, ev.filename, ev.lineno);
  showErr(ev.message);
});
window.addEventListener('unhandledrejection', (ev) => {
  console.error('[cat-match] unhandledrejection', ev.reason);
  showErr(String(ev.reason));
});

// 兜底：5s 内 canvas 未出现 → 显示错误层（web-view 网络受限等场景）
setTimeout(() => {
  if (!document.querySelector('#game canvas')) showErr('未创建画布（网络或浏览器限制）');
}, 5000);
