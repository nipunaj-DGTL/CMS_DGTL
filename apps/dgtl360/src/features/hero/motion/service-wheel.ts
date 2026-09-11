export type WheelMotion = { position: number; velocity: number };

// Analytic critically damped spring: velocity survives a changing scroll target.
// Frame-rate independent, with gentle acceleration and a non-bouncy settle.
export function advanceWheel(state: WheelMotion, target: number, dt: number): WheelMotion {
  const frequency = 9;
  const offset = state.position - target;
  const impulse = state.velocity + frequency * offset;
  const decay = Math.exp(-frequency * dt);
  return {
    position: target + (offset + impulse * dt) * decay,
    velocity: (state.velocity - frequency * impulse * dt) * decay,
  };
}

export function wheelPose(index: number, position: number, total: number) {
  const distance = ((index - position + total * 1.5) % total) - total / 2;
  const depth = Math.min(Math.abs(distance), 2);
  const focus = (1 + Math.cos(Math.PI * Math.min(depth, 1))) / 2;
  const fade = Math.min(1, Math.max(0, 2 - depth));
  return {
    top: 52 + distance * (distance < 0 ? 32 : 28),
    left: 84 - 43 * focus + Math.max(0, depth - 1) * 20,
    opacity: (0.42 + 0.58 * focus) * fade,
    transform: `translate3d(-50%, -50%, ${-36 + 84 * focus}px) rotateX(${-distance * 2}deg) rotateY(${distance * 10}deg) rotateZ(${-distance * 3}deg) scale(${0.78 + 0.52 * focus})`,
    visible: depth < 2,
  };
}

// The indicator follows the rendered wheel, never the hovered/rounded card index.
export function wheelProgress(position: number, total: number) {
  return Math.min(1, Math.max(0, (position + 1) / Math.max(total, 1)));
}
