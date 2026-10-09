document.body.dataset.booted = "1";

const reduce = document.documentElement.classList.contains("instant");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pad(n, size) {
  return String(n).padStart(size, "0");
}

function hex(bytes) {
  let out = "";
  for (let i = 0; i < bytes; i += 1) {
    out += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }
  return out;
}

function bootBios() {
  const lines = [...document.querySelectorAll(".bios li")];
  if (reduce) {
    lines.forEach((li) => li.classList.add("typed"));
    return Promise.resolve();
  }
  return lines.reduce(async (queue, li) => {
    await queue;
    lines.forEach((item) => item.classList.remove("active"));
    li.classList.add("typed", "active");
    await wait(230);
  }, Promise.resolve()).then(() => {
    lines.forEach((item) => item.classList.remove("active"));
  });
}

function startField(canvas) {
  const ctx = canvas.getContext("2d");
  const wordmark = document.querySelector(".wordmark");
  let w = 0;
  let h = 0;
  let horizon = 0;
  let vanish = 0;
  let half = 160;
  let scrollZ = 0;
  let aimed = false;
  const packets = Array.from({ length: 26 }, () => ({
    lane: Math.random(),
    z: Math.random(),
    speed: 0.12 + Math.random() * 0.28,
  }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduce) draw(0);
  }

  function aim() {
    const rect = wordmark.getBoundingClientRect();
    const visible = rect.bottom > 72 && rect.top < h * 0.85;
    if (visible) {
      return {
        y: rect.bottom - 1,
        x: rect.left + rect.width / 2,
        half: Math.max(110, rect.width * 0.58),
      };
    }
    return { y: h * 0.38, x: w * 0.5, half: Math.min(w * 0.26, 260) };
  }

  function project(lane, z) {
    const t = z ** 1.45;
    const y = horizon + t * (h - horizon);
    const x = vanish + (lane - 0.5) * w * 1.45 * t;
    return { x, y, t };
  }

  function draw(dt) {
    const goal = aim();
    if (!aimed) {
      horizon = goal.y;
      vanish = goal.x;
      half = goal.half;
      aimed = true;
    } else {
      const ease = reduce ? 1 : 0.14;
      horizon += (goal.y - horizon) * ease;
      vanish += (goal.x - vanish) * ease;
      half += (goal.half - half) * ease;
    }
    scrollZ = (scrollZ + dt * 0.18) % 1;

    ctx.clearRect(0, 0, w, h);
    if (horizon >= h - 2) return;

    const wash = ctx.createLinearGradient(0, horizon, 0, h);
    wash.addColorStop(0, "rgba(36, 170, 64, 0.16)");
    wash.addColorStop(0.22, "rgba(8, 48, 18, 0.05)");
    wash.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, horizon, w, h - horizon);

    const cols = w < 700 ? 12 : 18;
    for (let i = 0; i <= cols; i += 1) {
      const lane = i / cols;
      const edge = Math.abs(lane - 0.5) * 2;
      const near = project(lane, 1);
      const far = project(lane, 0.05);
      ctx.strokeStyle = `rgba(40, ${150 - edge * 40}, 70, ${0.45 - edge * 0.28})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(far.x, far.y);
      ctx.lineTo(near.x, Math.min(h, near.y));
      ctx.stroke();
    }

    const rows = 16;
    for (let i = 0; i < rows; i += 1) {
      const z = (i / rows + scrollZ) % 1;
      if (z < 0.045) continue;
      const y = horizon + z ** 1.45 * (h - horizon);
      const alpha = 0.12 + z * 0.72;
      ctx.strokeStyle = `rgba(${70 + z * 140}, ${180 + z * 60}, ${110 + z * 40}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(210, 255, 214, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vanish - half, horizon);
    ctx.lineTo(vanish + half, horizon);
    ctx.stroke();

    packets.forEach((packet) => {
      packet.z += packet.speed * dt;
      if (packet.z > 1) {
        packet.z = 0;
        packet.lane = Math.random();
      }
      const head = project(packet.lane, packet.z);
      const tail = project(packet.lane, Math.max(0.05, packet.z - 0.045));
      ctx.strokeStyle = `rgba(214, 255, 216, ${0.2 + packet.z * 0.75})`;
      ctx.lineWidth = 1 + packet.z * 1.6;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
    });

    const fade = ctx.createLinearGradient(0, h * 0.78, 0, h);
    fade.addColorStop(0, "rgba(0, 0, 0, 0)");
    fade.addColorStop(1, "rgba(0, 0, 0, 0.72)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
  }

  resize();
  window.addEventListener("resize", resize);
  if (reduce) {
    document.addEventListener("scroll", () => draw(0), { passive: true });
    draw(0);
    return;
  }

  let running = true;
  let last = performance.now();
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    last = performance.now();
    if (running) requestAnimationFrame(frame);
  });

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function startSlip() {
  const addr = document.getElementById("slip-addr");
  const slip = addr.closest(".slip");
  if (reduce) return;
  window.setInterval(() => {
    addr.textContent = `0x${hex(20)}`;
    slip.classList.add("flash");
    window.setTimeout(() => slip.classList.remove("flash"), 280);
  }, 2600);
}

function startMonitor() {
  const walletsEl = document.getElementById("stat-wallets");
  const settledEl = document.getElementById("stat-settled");
  const log = document.getElementById("log");
  let wallets = 4812;
  let settled = 941;
  const nets = ["NET-01", "NET-02", "NET-03"];
  const kinds = [
    ["GENESIS", () => `wallet 0x${hex(1)}..${hex(1)} chain=${nets[Math.floor(Math.random() * nets.length)]} shown=no`],
    ["SIGN", () => `user ${hex(2)} prompt=suppressed signer=fabric`],
    ["SUBMIT", () => `user ${hex(2)} gas=abstracted surface=broc`],
    ["SETTLE", () => `user ${hex(2)} result=balance hash=internal`],
  ];

  function stamp() {
    const now = new Date();
    return [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => pad(n, 2)).join(":");
  }

  function pushLine() {
    const [kind, detail] = kinds[Math.floor(Math.random() * kinds.length)];
    const row = document.createElement("div");
    row.className = "logline fresh";
    ["span", "span", "span"].forEach((tag, index) => {
      const cell = document.createElement(tag);
      cell.textContent = [stamp(), kind, detail()][index];
      row.append(cell);
    });
    log.append(row);
    while (log.children.length > 8) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
    if (kind === "GENESIS") wallets += 1;
    if (kind === "SETTLE") settled += 1;
    walletsEl.textContent = pad(wallets, 6);
    settledEl.textContent = pad(settled, 6);
  }

  if (reduce) return;
  window.setInterval(pushLine, 1700);
}

function startNav() {
  const links = [...document.querySelectorAll(".dock a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          if (link.getAttribute("href") === `#${entry.target.id}`) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    { rootMargin: "-45% 0px -48% 0px", threshold: 0.01 }
  );
  sections.forEach((section) => observer.observe(section));

  const termLink = document.querySelector('.dock a[href="#terminal"]');
  termLink.addEventListener("click", () => {
    window.setTimeout(() => document.getElementById("cmd").focus(), 280);
  });
}

function startTerminal() {
  const form = document.getElementById("prompt");
  const input = document.getElementById("cmd");
  const session = document.getElementById("session");
  const history = [];
  let cursor = 0;

  const replies = {
    help: [
      "BROX DIRECT INTERFACE",
      "",
      "HELP       list commands",
      "GENESIS    how wallets are born",
      "OBLIVION   how the chain stays unseen",
      "FABRIC     what this layer is",
      "BROC       the product above",
      "STATUS     illustrated counters",
      "SEED       ask for a seed phrase",
      "DIR        list system files",
      "WHOAMI     clearance and role",
      "CLARA      the analyst upstairs",
      "CLIVE      the strategist upstairs",
      "VER        build string",
      "CLS        clear the screen",
    ].join("\n"),
    genesis: [
      "GENESIS",
      "Wallets are created by the layer, per user, when a chain",
      "action needs an account. The user does not install a",
      "wallet, and the seed phrase is not rendered.",
    ].join("\n"),
    oblivion: [
      "OBLIVION",
      "Requests leave Broc as ordinary intentions and return as",
      "ordinary results. Brox translates both ways. The surface",
      "stays Broc.",
    ].join("\n"),
    fabric: [
      "FABRIC",
      "One infrastructure under many networks. Fees, finality,",
      "and addresses are absorbed downstairs so Clara and Clive",
      "can keep a single product.",
    ].join("\n"),
    broc: [
      "Parent system   Broc.fi",
      "Role            AI financial team",
      "Brox duty       wallets, signatures, silent settlement",
      "Surface rule    if a person can see it, it is still Broc",
    ].join("\n"),
    status: () => {
      const wallets = document.getElementById("stat-wallets").textContent;
      const settled = document.getElementById("stat-settled").textContent;
      return [
        "FABRIC STATUS  (illustrated)",
        `Wallets live          ${wallets}`,
        `Settled today         ${settled}`,
        "Seed phrases shown    000000",
        "Wallet popups         000000",
        "Surface               OBLIVIOUS",
      ].join("\n");
    },
    seed: [
      "Access denied.",
      "Seed material is not rendered on this console.",
      "Seed phrases shown: 000000",
    ].join("\n"),
    dir: [
      " Volume in drive C is BROX",
      " Volume Serial Number is B0C5-F100",
      "",
      " Directory of C:\\BROX",
      "",
      "GENESIS.SYS",
      "OBLIVION.DRV",
      "FABRIC.BIN",
      "CLARA.LNK",
      "CLIVE.LNK",
      "        5 File(s)",
    ].join("\n"),
    whoami: "broc\\brox   clearance=top-secret   role=web3-infrastructure",
    clara: "Clara analyses the money.\nBrox hands her settled numbers, not a wallet screen.",
    clive: "Clive proposes the move.\nBrox is how that move meets a chain, when it must.",
    ver: "BROX FABRIC 0.9.4\nParent: BROC.FI\nMode: OBLIVIOUS",
    exit: "This console does not close. The fabric stays up.",
  };

  const aliases = {
    "?": "help",
    clear: "cls",
    ls: "dir",
    stats: "status",
    keys: "seed",
    quit: "exit",
    wallet: "genesis",
    wallets: "genesis",
  };

  function push(text, kind) {
    const pre = document.createElement("pre");
    pre.className = kind;
    pre.textContent = text;
    session.append(pre);
    session.scrollTop = session.scrollHeight;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = input.value;
    const trimmed = raw.trim();
    push(`C:\\BROX> ${raw}`, "echo");
    input.value = "";
    if (!trimmed) return;
    history.push(trimmed);
    cursor = history.length;
    const [name] = trimmed.toLowerCase().split(/\s+/);
    const key = aliases[name] || name;
    if (key === "cls") {
      session.replaceChildren();
      return;
    }
    const reply = replies[key];
    push(reply ? (typeof reply === "function" ? reply() : reply) : "Bad command or file name", "out");
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      form.requestSubmit();
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (!history.length) return;
    if (event.key === "ArrowUp") cursor = Math.max(0, cursor - 1);
    if (event.key === "ArrowDown") cursor = Math.min(history.length, cursor + 1);
    input.value = cursor >= history.length ? "" : history[cursor];
  });
}

bootBios();
startField(document.getElementById("field"));
startSlip();
startMonitor();
startNav();
startTerminal();
