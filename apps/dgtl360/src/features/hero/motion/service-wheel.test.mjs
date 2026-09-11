import assert from 'node:assert/strict';
import { test } from 'vitest';
import { advanceWheel, wheelPose, wheelProgress } from './service-wheel.ts';

function simulate(rate, target = 1) {
  let state = { position: 0, velocity: 0 };
  for (let i = 0; i < rate; i++) state = advanceWheel(state, target, 1 / rate);
  return state;
}

test('wheel accelerates, then decelerates without overshooting a resting target', () => {
  let state = { position: 0, velocity: 0 };
  const speeds = [];
  for (let i = 0; i < 120; i++) {
    const next = advanceWheel(state, 1, 1 / 60);
    assert.ok(next.position >= state.position && next.position <= 1);
    speeds.push(next.velocity);
    state = next;
  }
  assert.ok(speeds[5] > speeds[0]);
  assert.ok(speeds[60] < speeds[5]);
  assert.ok(Math.abs(state.position - 1) < 0.001);
});

test('60Hz and 120Hz produce the same motion after one second', () => {
  assert.ok(Math.abs(simulate(60).position - simulate(120).position) < 1e-10);
});

test('changing direction preserves momentum and eventually settles on the new target', () => {
  let state = advanceWheel({ position: 0, velocity: 0 }, 4, 0.1);
  const reversed = advanceWheel(state, 0, 1 / 120);
  assert.ok(reversed.velocity > 0, 'direction does not snap instantly');
  state = reversed;
  for (let i = 0; i < 240; i++) state = advanceWheel(state, 0, 1 / 60);
  assert.ok(Math.abs(state.position) < 0.001);
});

test('poses retain active/adjacent layout and hide the back of the wheel', () => {
  assert.equal(wheelPose(0, 0, 8).left, 41);
  assert.equal(wheelPose(0, 0, 8).top, 52);
  assert.equal(wheelPose(0, 0, 8).opacity, 1);
  assert.equal(wheelPose(1, 0, 8).top, 80);
  assert.equal(wheelPose(7, 0, 8).top, 20);
  assert.equal(wheelPose(4, 0, 8).visible, false);
  for (let phase = 0; phase <= 7; phase += 0.025) {
    for (let index = 0; index < 8; index++) {
      const pose = wheelPose(index, phase, 8);
      assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
      assert.ok(Number.isFinite(pose.left) && Number.isFinite(pose.top));
    }
  }
});

test('fractional scroll targets move the cards and indicator without snapping', () => {
  const state = simulate(60, 0.25);
  assert.ok(state.position > 0.24 && state.position < 0.26);
  const pose = wheelPose(0, state.position, 8);
  assert.ok(pose.top < 52 && pose.top > 44);
  assert.ok(wheelProgress(state.position, 8) > 1 / 8);
  assert.ok(wheelProgress(state.position, 8) < 2 / 8);
  assert.equal(wheelProgress(0, 8), 0.125);
  assert.equal(wheelProgress(7, 8), 1);
});
