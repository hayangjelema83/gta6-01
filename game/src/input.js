// Solmar City — keyboard and mouse input. Tracks held keys, pressed-once
// keys (for E / Enter / P), and the mouse position in canvas pixels.

export function createInput(canvas) {
  const input = {
    keys: {},
    pressed: {},
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    mouseClicked: false,
  };

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!input.keys[k]) input.pressed[k] = true;
    input.keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    input.keys = {};
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    canvas.focus();
    if (e.button === 0) {
      input.mouseDown = true;
      input.mouseClicked = true;
      const rect = canvas.getBoundingClientRect();
      input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      input.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    }
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });

  return input;
}

export function isDown(input, ...names) {
  return names.some((n) => input.keys[n]);
}

// True once per physical press, consumed at the end of each frame.
export function wasPressed(input, name) {
  return !!input.pressed[name];
}

export function endFrame(input) {
  input.pressed = {};
  input.mouseClicked = false;
}
