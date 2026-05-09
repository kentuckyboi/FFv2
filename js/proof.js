/* ============================================================
   proof.js — the three proof-of-completion flows
   ------------------------------------------------------------
   Used by task.html. Each function attaches its UI and
   completion handler to a container element on the page.

   - mountSignaturePad(container, task)
   - mountPhotoUploader(container, task)
   - mountQuiz(container, task)
   ============================================================ */

// ---------- 1. Signature pad ----------------------------------------------
// We implement a tiny signature pad ourselves rather than pulling a library.
// Total code is ~50 lines and works on touch + mouse + Apple Pencil.
function mountSignaturePad(container, task) {
  container.innerHTML = `
    <h3>Have your validator sign below</h3>
    <canvas class="sig-pad" width="600" height="220" aria-label="Signature canvas"></canvas>
    <div class="form-field" style="margin-top: 12px;">
      <label for="validator-name">Validator's name</label>
      <input type="text" id="validator-name" placeholder="e.g. Dr. Linda Hayes" autocomplete="off" />
    </div>
    <div class="sig-controls">
      <button class="btn ghost" id="sig-clear">Clear</button>
      <button class="btn primary" id="sig-save" disabled>Submit</button>
    </div>
  `;

  const canvas = container.querySelector(".sig-pad");
  const ctx = canvas.getContext("2d");
  const validatorInput = container.querySelector("#validator-name");
  const clearBtn = container.querySelector("#sig-clear");
  const saveBtn = container.querySelector("#sig-save");

  // Make the canvas crisp on retina screens
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1B365D";
  }
  resize();
  window.addEventListener("resize", resize);

  let drawing = false, hasInk = false, last = null;

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    last = pointFromEvent(e);
  }
  function moveDraw(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    hasInk = true;
    updateButton();
  }
  function endDraw() { drawing = false; }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", moveDraw, { passive: false });
  canvas.addEventListener("touchend", endDraw);

  function updateButton() {
    saveBtn.disabled = !(hasInk && validatorInput.value.trim().length > 1);
  }
  validatorInput.addEventListener("input", updateButton);

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk = false;
    updateButton();
  });

  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    const dataUrl = canvas.toDataURL("image/png");
    await FF.markCompleted(task.id, {
      proofKind: "Signature",
      validator: validatorInput.value.trim(),
      signature: dataUrl,
    });
    toast(`Task complete: +${task.points} points`, "success");
    setTimeout(() => location.href = "dashboard.html", 800);
  });
}

// ---------- 2. Photo uploader ---------------------------------------------
function mountPhotoUploader(container, task) {
  // Use the front camera by default for selfies, back for posters.
  const isSelfie = /selfie/i.test(task.name);
  const captureAttr = isSelfie ? 'capture="user"' : 'capture="environment"';

  container.innerHTML = `
    <h3>Upload your photo</h3>
    <label class="photo-uploader">
      <div class="photo-preview" id="photo-preview">
        <span class="placeholder">Tap to take a ${isSelfie ? "selfie" : "photo"}<br><small>or choose one from your library</small></span>
      </div>
      <input type="file" accept="image/*" ${captureAttr} id="photo-input" hidden />
    </label>
    <button class="btn primary" id="photo-submit" disabled>Submit photo</button>
  `;

  const preview = container.querySelector("#photo-preview");
  const input = container.querySelector("#photo-input");
  const submit = container.querySelector("#photo-submit");
  let pickedDataUrl = null;

  // Tap anywhere on the preview opens the file picker
  preview.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    // Resize client-side to keep upload size sane (max edge 1024px, JPEG 80%)
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        pickedDataUrl = c.toDataURL("image/jpeg", 0.8);
        preview.innerHTML = `<img src="${pickedDataUrl}" alt="" />`;
        submit.disabled = false;
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  submit.addEventListener("click", async () => {
    submit.disabled = true;
    await FF.markCompleted(task.id, {
      proofKind: "Photo",
      photo: pickedDataUrl,
    });
    toast(`Task complete: +${task.points} points`, "success");
    setTimeout(() => location.href = "dashboard.html", 800);
  });
}

// ---------- 3. Knowledge check (quiz) -------------------------------------
function mountQuiz(container, task) {
  container.innerHTML = `
    <h3>Quick knowledge check</h3>
    <p style="font-family:'Playfair Display',serif; font-size:18px; color:var(--esp-blue); margin: 0 0 14px;">
      ${task.quiz.q}
    </p>
    <div class="form-field">
      <input type="text" id="quiz-answer" placeholder="Type your answer" autocomplete="off" />
    </div>
    <p id="quiz-msg" style="font-size:13px; color:var(--muted); margin: 0 0 12px; min-height: 18px;"></p>
    <button class="btn primary" id="quiz-submit" disabled>Check</button>
  `;
  const input = container.querySelector("#quiz-answer");
  const submit = container.querySelector("#quiz-submit");
  const msg = container.querySelector("#quiz-msg");
  let attempts = 0;

  input.addEventListener("input", () => {
    submit.disabled = input.value.trim().length === 0;
  });

  submit.addEventListener("click", async () => {
    const raw = input.value.trim();
    const norm = normalize(raw);
    const accepted = task.quiz.a;

    // Empty array = accept any non-blank answer (used for reflection prompts)
    const ok = accepted.length === 0
      ? raw.length > 0
      : accepted.some(target => fuzzyEquals(norm, normalize(target)));

    if (ok) {
      submit.disabled = true;
      await FF.markCompleted(task.id, {
        proofKind: "Quiz",
        answer: raw,
      });
      toast(`Correct! +${task.points} points`, "success");
      setTimeout(() => location.href = "dashboard.html", 800);
    } else {
      attempts++;
      if (attempts >= 3) {
        msg.textContent = "That's three tries. Take a look at the materials and come back.";
      } else {
        msg.textContent = `Not quite — try again (${3 - attempts} attempt${3 - attempts === 1 ? "" : "s"} left).`;
      }
      input.focus(); input.select();
    }
  });
}

// Normalize and fuzzy-match (Levenshtein distance up to 2 = match)
function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function fuzzyEquals(a, b) {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return levenshtein(a, b) <= 2;
}
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}
