// 8x8 match-3 核心：交换、消除、下落、补新、连锁、卡死重洗
// 与 Phaser 渲染解耦：scene 提供 add.image/add.text/tweens/time/input/scale
const COLS = 8, ROWS = 8, N_TYPES = 5;
export const TEXTURE_KEYS = ['orange', 'tabby', 'calico', 'puppy', 'bigdog'];

export class Board {
  constructor(scene, cell, boardW, boardH) {
    this.scene = scene;
    this.cell = cell;
    this.cols = COLS;
    this.rows = ROWS;
    this.boardX = Math.round((boardW - COLS * cell) / 2);
    this.boardY = 96;
    this.grid = [];
    this.locked = true;
    this.selected = null;
    this.listeners = {};
    this.winsRequired = 12;
    this.combo = 0;
    this.clearedTotal = 0;
    this.init();
  }

  on(evt, fn) { (this.listeners[evt] ??= []).push(fn); }
  onMatched(fn) { this.on('matched', fn); }
  onReshuffled(fn) { this.on('reshuffled', fn); }
  emit(evt, ...a) { (this.listeners[evt] ?? []).forEach(f => f(...a)); }

  init() {
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let t;
        do { t = (Math.random() * N_TYPES) | 0; }
        while (
          (c >= 2 && this.grid[r][c - 1].type === t && this.grid[r][c - 2].type === t) ||
          (r >= 2 && this.grid[r - 1][c].type === t && this.grid[r - 2][c].type === t)
        );
        this.grid[r][c] = { type: t };
      }
    }
    this.buildSprites();
    this.setupInput();
    if (!this.hasMoves()) this.reshuffle();
    else this.locked = false;
  }

  buildSprites() {
    const s = this.scene;
    const { cell, boardX, boardY } = this;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const g = this.grid[r][c];
      g.sprite = s.add.image(boardX + c * cell + cell / 2, boardY + r * cell + cell / 2, 'cat-' + TEXTURE_KEYS[g.type])
        .setDepth(1).setScale(cell / 100);
    }
    this.bg = s.add.graphics().setDepth(0);
    this.drawBg();
  }

  drawBg() {
    const { cell, boardX, boardY, cols, rows } = this;
    const g = this.bg;
    g.clear();
    g.fillStyle(0xffffff, 0.55);
    g.fillRoundedRect(boardX - 4, boardY - 4, cols * cell + 8, rows * cell + 8, 8);
    g.lineStyle(1, 0xe8d9c4, 0.8);
    for (let r = 0; r <= rows; r++) g.lineBetween(boardX - 2, boardY + r * cell, boardX + cols * cell + 2, boardY + r * cell);
    for (let c = 0; c <= cols; c++) g.lineBetween(boardX + c * cell, boardY - 2, boardX + c * cell, boardY + rows * cell + 2);
  }

  applyLayout(cell, w, h) {
    this.cell = cell;
    this.boardX = Math.round((w - this.cols * cell) / 2);
    this.drawBg();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const g = this.grid[r][c];
      if (g.sprite) g.sprite.setPosition(this.boardX + c * cell + cell / 2, this.boardY + r * cell + cell / 2).setScale(cell / 100);
    }
  }

  setupInput() {
    const s = this.scene;
    s.input.on('pointerdown', (p) => {
      if (this.locked) return;
      const cell = this.cell;
      const c = Math.floor((p.x - this.boardX) / cell);
      const r = Math.floor((p.y - this.boardY) / cell);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { this.selected = null; return; }
      if (!this.selected) {
        this.selected = { r, c };
        const g = this.grid[r][c];
        g?.sprite?.setTint(0xfff3d6);
        if (g?.sprite) s.tweens.add({ targets: g.sprite, scale: (cell / 100) * 1.15, duration: 90, yoyo: true,
          onComplete: () => g.sprite?.clearTint() });
        return;
      }
      const A = this.selected;
      this.grid[A.r][A.c]?.sprite?.clearTint();
      this.selected = null;
      if (Math.abs(A.r - r) + Math.abs(A.c - c) === 1) this.trySwap(A, { r, c });
    });
  }

  trySwap(a, b) {
    this.locked = true;
    const s = this.scene;
    const center = (g, rr, cc) => s.tweens.add({
      targets: g.sprite, x: this.boardX + cc * this.cell + this.cell / 2,
      y: this.boardY + rr * this.cell + this.cell / 2, duration: 110, ease: 'Quad.easeOut'
    });
    const A = this.grid[a.r][a.c], B = this.grid[b.r][b.c];
    center(A, b.r, b.c); center(B, a.r, a.c);
    s.time.delayedCall(115, () => {
      this.grid[a.r][a.c] = B; this.grid[b.r][b.c] = A;
      B.r = a.r; B.c = a.c; A.r = b.r; A.c = b.c;
      if (this.findMatches().length) { this.combo = 0; this.resolve(); }
      else {
        this.grid[a.r][a.c] = A; this.grid[b.r][b.c] = B;
        A.r = a.r; A.c = a.c; B.r = b.r; B.c = b.c;
        center(A, a.r, a.c); center(B, b.r, b.c);
        s.time.delayedCall(120, () => { this.locked = false; });
      }
    });
  }

  resolve() {
    const s = this.scene;
    const matches = this.findMatches();
    if (!matches.length) { this.afterCascades(); return; }
    this.combo += 1;
    const groups = this.group(matches);
    const clearedCount = matches.length;
    const doomed = matches.map(({ r, c }) => this.grid[r][c]);
    matches.forEach(({ r, c }) => { this.grid[r][c] = null; });
    const pts = groups.reduce((n, g) => n + g.length * 20 * this.combo, 0);
    this.clearedTotal += clearedCount;
    s.time.delayedCall(120, () => {
      doomed.forEach(g => { if (g?.sprite) g.sprite.destroy(); });
      this.applyGravity();
      this.fillTop();
      s.time.delayedCall(240, () => this.resolve());
    });
    this.emit('matched', pts, clearedCount);
  }

  afterCascades() {
    this.combo = 0;
    this.locked = false;
    if (!this.hasMoves()) {
      const s = this.scene;
      s.time.delayedCall(400, () => this.reshuffle());
    }
  }

  applyGravity() {
    const s = this.scene;
    const cell = this.cell;
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const g = this.grid[r][c];
        if (!g) continue;
        if (write !== r) {
          this.grid[write][c] = g; this.grid[r][c] = null;
          g.r = write;
          s.tweens.add({ targets: g.sprite, x: this.boardX + c * cell + cell / 2,
            y: this.boardY + write * cell + cell / 2, duration: 140, ease: 'Quad.easeIn' });
        }
        write--;
      }
    }
  }

  fillTop() {
    const s = this.scene;
    const cell = this.cell;
    for (let c = 0; c < COLS; c++) {
      let need = 0;
      for (let r = 0; r < ROWS; r++) if (!this.grid[r][c]) need++;
      for (let i = 0; i < need; i++) {
        const r = i;
        const t = (Math.random() * N_TYPES) | 0;
        const g = { type: t, r, c };
        this.grid[r][c] = g;
        g.sprite = s.add.image(this.boardX + c * cell + cell / 2, this.boardY + (r - need) * cell + cell / 2, 'cat-' + TEXTURE_KEYS[t])
          .setDepth(1).setScale(cell / 100).setAlpha(0);
        s.tweens.add({ targets: g.sprite, x: this.boardX + c * cell + cell / 2,
          y: this.boardY + r * cell + cell / 2, alpha: 1, duration: 200, ease: 'Quad.easeOut', delay: i * 20 });
      }
    }
  }

  findMatches() {
    const out = new Set();
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        const t = this.grid[r][c]?.type;
        if (t === undefined) { c++; continue; }
        let end = c + 1;
        while (end < COLS && this.grid[r][end]?.type === t) end++;
        if (end - c >= 3) for (let i = c; i < end; i++) out.add(r + ':' + i);
        c = end;
      }
    }
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < ROWS) {
        const t = this.grid[r][c]?.type;
        if (t === undefined) { r++; continue; }
        let end = r + 1;
        while (end < ROWS && this.grid[end][c]?.type === t) end++;
        if (end - r >= 3) for (let i = r; i < end; i++) out.add(i + ':' + c);
        r = end;
      }
    }
    return [...out].map(key => { const [r, c] = key.split(':').map(Number); return { r, c }; });
  }

  group(matches) {
    const cells = matches;
    cells.sort((a, b) => a.r - b.r || a.c - b.c);
    const groups = [];
    let run = [];
    for (let i = 0; i < cells.length; i++) {
      const g = cells[i];
      if (i > 0 && g.r === cells[i - 1].r && g.c === cells[i - 1].c + 1) { run.push(g); continue; }
      if (run.length) groups.push(run);
      run = [g];
    }
    if (run.length) groups.push(run);
    return groups;
  }

  hasMoves() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS && this.canSwap({ r, c }, r, c + 1)) return true;
      if (r + 1 < ROWS && this.canSwap({ r, c }, r + 1, c)) return true;
    }
    return false;
  }

  canSwap(pos, r2, c2) {
    const A = this.grid[pos.r][pos.c], B = this.grid[r2][c2];
    if (!A || !B) return false;
    this.grid[pos.r][pos.c] = B; this.grid[r2][c2] = A;
    const ok = this.findMatchesAt(r2, c2).length > 0 || this.findMatchesAt(pos.r, pos.c).length > 0;
    this.grid[pos.r][pos.c] = A; this.grid[r2][c2] = B;
    return ok;
  }

  findMatchesAt(r, c) {
    const t = this.grid[r][c]?.type;
    if (t === undefined) return [];
    const out = [];
    let lo = c - 1; while (lo >= 0 && this.grid[r][lo]?.type === t) lo--;
    let hi = c + 1; while (hi < COLS && this.grid[r][hi]?.type === t) hi++;
    if (hi - lo - 1 >= 3) for (let i = lo + 1; i < hi; i++) out.push({ r, c: i });
    lo = r - 1; while (lo >= 0 && this.grid[lo][c]?.type === t) lo--;
    hi = r + 1; while (hi < ROWS && this.grid[hi][c]?.type === t) hi++;
    if (hi - lo - 1 >= 3) for (let i = lo + 1; i < hi; i++) out.push({ r: i, c });
    return out;
  }

  reshuffle() {
    const s = this.scene;
    const flat = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(this.grid[r][c].type);
    do {
      for (let i = flat.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [flat[i], flat[j]] = [flat[j], flat[i]]; }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.grid[r][c].type = flat[r * COLS + c];
    } while (!this.hasMoves() || this.findMatches().length > 0);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
      this.grid[r][c].sprite.setFrame('cat-' + TEXTURE_KEYS[this.grid[r][c].type]);
    this.locked = false;
    this.emit('reshuffled');
  }
}
