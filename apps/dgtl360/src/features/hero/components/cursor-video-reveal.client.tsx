"use client";

import { useEffect, useRef } from "react";
import { useCursorMotion } from "./use-cursor-motion";

export type CursorVideoRevealSettings = {
  enabled: boolean;
  brushWidth: number;
  cohesion: number;
  persistence: number;
  flow: number;
  turbulence: number;
  edgeSoftness: number;
  dissolveSoftness: number;
  revealOpacity: number;
  refraction: number;
  response: number;
  quality: number;
  dprCap: number;
  diffusion: number;
  curl: number;
  lift: number;
  settling: number;
  grainSize: number;
  shadowColor: string;
  bodyColor: string;
  highlightColor: string;
  paletteMix: number;
  exposure: number;
  lookContrast: number;
  textureMix: number;
  fluidDrag: number;
  brownianDrift: number;
  brownianScale: number;
  impactEnabled: boolean;
  impactStrength: number;
  impactRadius: number;
  impactDecayMs: number;
};

// Founder-set portable handoff baseline. Field source: main@5aad17ff; tuned 2026-09-04.
export const acceptedCursorVideoReveal: CursorVideoRevealSettings = {
  enabled: true,
  brushWidth: 48,
  cohesion: 0.4995,
  persistence: 0.6011,
  flow: 0.87,
  turbulence: 0.811,
  edgeSoftness: 0.9359,
  dissolveSoftness: 0.4712,
  revealOpacity: 0.9431,
  refraction: 1.5,
  response: 0.9538,
  quality: 240.464,
  dprCap: 1.0771,
  diffusion: 0.5688,
  curl: 1.0121,
  lift: 0.428,
  settling: 1.9,
  grainSize: 1.25,
  shadowColor: "#e9e1dd",
  bodyColor: "#9e6133",
  highlightColor: "#f1c98c",
  paletteMix: 0.5,
  exposure: 0.99,
  lookContrast: 1.1928,
  textureMix: 0.978,
  fluidDrag: 0.9974,
  brownianDrift: 1,
  brownianScale: 2.8096,
  impactEnabled: true,
  impactStrength: 1.17,
  impactRadius: 246.432,
  impactDecayMs: 550,
};

const vertexShader = `#version 300 es
layout(location=0) in vec2 a_position;
void main(){gl_Position=vec4(a_position,0.,1.);}`;

// R = reveal density, GB = velocity, A = auxiliary mineral density.
const fieldShader = `#version 300 es
precision highp float;
out vec4 outState;
uniform sampler2D u_state;
uniform vec2 u_resolution;
uniform vec2 u_points[8];
uniform int u_pointCount;
uniform vec2 u_pointerVelocity;
uniform float u_radius;
uniform float u_dt;
uniform float u_persistence;
uniform float u_flow;
uniform float u_cohesion;
uniform float u_turbulence;
uniform float u_active;
uniform float u_time;
uniform float u_diffusion;
uniform float u_curl;
uniform float u_lift;
uniform float u_settling;
uniform float u_drag;
uniform float u_brownian;
uniform float u_brownianScale;
uniform vec4 u_impact;

float segmentDistance(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),.000001),0.,1.);return length(pa-ba*h);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 curlNoise(vec2 p){float e=.012;float n1=sin((p.y+e)*9.+sin(p.x*7.+u_time*.19));float n2=sin((p.y-e)*9.+sin(p.x*7.+u_time*.19));float n3=sin((p.x+e)*8.+cos(p.y*6.-u_time*.17));float n4=sin((p.x-e)*8.+cos(p.y*6.-u_time*.17));return normalize(vec2((n1-n2)/(2.*e),-(n3-n4)/(2.*e))+.0001);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 texel=1./u_resolution;
  vec4 previous=texture(u_state,uv);
  vec2 velocity=previous.gb*2.-1.;
  vec2 backUv=clamp(uv-velocity*u_dt*u_flow*.42,vec2(.001),vec2(.999));
  vec4 advected=texture(u_state,backUv);
  velocity=(advected.gb*2.-1.)*pow(clamp(u_drag,.1,1.35),u_dt*45.);
  float density=advected.r;
  float auxiliary=advected.a;
  float neighbours=(texture(u_state,backUv+vec2(texel.x,0)).r+texture(u_state,backUv-vec2(texel.x,0)).r+texture(u_state,backUv+vec2(0,texel.y)).r+texture(u_state,backUv-vec2(0,texel.y)).r)*.25;
  density=mix(density,neighbours,clamp(u_diffusion*u_dt*9.,0.,.58));
  float cohesiveDensity=smoothstep(.06,.78,density);
  density=mix(density,max(density,cohesiveDensity),clamp(u_cohesion*u_dt*5.,0.,.24));
  density*=exp(-u_dt/max(u_persistence,.08));
  float aspect=u_resolution.x/u_resolution.y;
  vec2 p=vec2(uv.x*aspect,uv.y);
  float distanceToPath=10.;
  for(int i=0;i<7;i++){
    if(i>=u_pointCount-1) break;
    vec2 a=vec2(u_points[i].x*aspect,u_points[i].y);
    vec2 b=vec2(u_points[i+1].x*aspect,u_points[i+1].y);
    distanceToPath=min(distanceToPath,segmentDistance(p,a,b));
  }
  float brush=1.-smoothstep(u_radius*.12,u_radius,distanceToPath);
  float splat=pow(max(brush,0.),mix(.62,2.35,u_cohesion))*u_active;
  density=max(density,splat);
  auxiliary=max(auxiliary*.985,splat);
  velocity+=u_pointerVelocity*splat*(.42+u_flow*.52);
  float edge=density*(1.-density);
  vec2 curl=curlNoise(uv*2.4);
  vec2 turbulenceDirection=normalize(vec2(sin(uv.y*31.+u_time*1.7),cos(uv.x*27.-u_time*1.3))+vec2(.0001));
  vec2 brownianCell=floor(uv*u_resolution/max(2.,8./max(u_brownianScale,.25)))+vec2(floor(u_time*13.));
  vec2 brownianDirection=normalize(vec2(hash(brownianCell),hash(brownianCell+vec2(19.7,7.3)))-vec2(.5)+vec2(.0001));
  velocity+=curl*edge*u_curl*.026;
  velocity+=turbulenceDirection*edge*u_turbulence*.038;
  velocity+=brownianDirection*edge*u_brownian*.032;
  velocity.y+=u_lift*density*u_dt*.34;
  velocity.y-=u_settling*auxiliary*u_dt*.34;
  auxiliary*=exp(-u_dt*(.5+u_settling));
  density*=.998;
  float impactDistance=distance(vec2(uv.x*aspect,uv.y),vec2(u_impact.x*aspect,u_impact.y));
  float impact=(1.-smoothstep(u_impact.w*.18,u_impact.w,impactDistance))*u_impact.z;
  vec2 impactDirection=normalize(uv-u_impact.xy+.0001);
  velocity+=impactDirection*impact*.075;
  density=max(density,impact*.72);
  velocity=clamp(velocity,vec2(-.22),vec2(.22));
  outState=vec4(clamp(density,0.,1.),velocity*.5+.5,clamp(auxiliary,0.,1.));
}`;

const compositeShader = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D u_state;
uniform sampler2D u_reveal;
uniform vec2 u_resolution;
uniform float u_revealAspect;
uniform float u_edgeSoftness;
uniform float u_dissolveSoftness;
uniform float u_revealOpacity;
uniform float u_refraction;
uniform vec3 u_shadow;
uniform vec3 u_body;
uniform vec3 u_highlight;
uniform float u_paletteMix;
uniform float u_exposure;
uniform float u_lookContrast;
uniform float u_textureMix;
uniform float u_grainSize;

vec2 coverUv(vec2 uv,float sourceAspect,float targetAspect){if(targetAspect>sourceAspect)uv.y=(uv.y-.5)*(sourceAspect/targetAspect)+.5;else uv.x=(uv.x-.5)*(targetAspect/sourceAspect)+.5;return uv;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 texel=1./u_resolution;
  vec4 state=texture(u_state,uv);
  float dissolveThreshold=mix(.2,.012,u_dissolveSoftness);
  float edgeFeather=.012+u_edgeSoftness*.19;
  float mask=smoothstep(dissolveThreshold,dissolveThreshold+edgeFeather,state.r);
  vec2 velocity=state.gb*2.-1.;
  vec2 gradient=vec2(texture(u_state,uv+vec2(texel.x,0)).r-texture(u_state,uv-vec2(texel.x,0)).r,texture(u_state,uv+vec2(0,texel.y)).r-texture(u_state,uv-vec2(0,texel.y)).r);
  vec2 warp=(velocity*.42+gradient*.8)*u_refraction*.075;
  float screenAspect=u_resolution.x/u_resolution.y;
  vec2 revealUv=coverUv(clamp(uv+warp,vec2(.001),vec2(.999)),u_revealAspect,screenAspect);
  vec3 reveal=texture(u_reveal,clamp(revealUv,vec2(.001),vec2(.999))).rgb;
  vec3 palette=mix(u_shadow,u_body,smoothstep(.08,.72,state.r));
  palette=mix(palette,u_highlight,smoothstep(.62,1.,state.r+length(gradient)*2.));
  float grain=step(.73,fract(sin(dot(floor(uv*u_resolution/max(u_grainSize,.5)),vec2(12.9898,78.233)))*43758.5453));
  palette=mix(palette,u_highlight,grain*state.a*.34);
  reveal=mix(palette,reveal,u_textureMix);
  float palettePosition=clamp(u_paletteMix,0.,2.);
  float paletteAmount=pow(min(palettePosition,1.),2.2);
  vec3 paletteGrade=reveal*(.52+palette*.96);
  reveal=mix(reveal,clamp(paletteGrade,0.,1.),paletteAmount*.82);
  reveal=mix(reveal,palette,smoothstep(1.,2.,palettePosition));
  reveal=(reveal-.5)*u_lookContrast+.5;
  reveal*=u_exposure;
  outColor=vec4(clamp(reveal,0.,1.),mask*u_revealOpacity);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function makeProgram(gl: WebGL2RenderingContext, fragment: string) {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
  const pixel = compile(gl, gl.FRAGMENT_SHADER, fragment);
  const output = gl.createProgram();
  if (!vertex || !pixel || !output) {
    if (vertex) gl.deleteShader(vertex);
    if (pixel) gl.deleteShader(pixel);
    if (output) gl.deleteProgram(output);
    return null;
  }
  gl.attachShader(output, vertex);
  gl.attachShader(output, pixel);
  gl.linkProgram(output);
  if (!gl.getProgramParameter(output, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(output));
    gl.deleteShader(vertex);
    gl.deleteShader(pixel);
    gl.deleteProgram(output);
    return null;
  }
  gl.deleteShader(vertex);
  gl.deleteShader(pixel);
  return output;
}

function rgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const parsed = Number.parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return [((parsed >> 16) & 255) / 255, ((parsed >> 8) & 255) / 255, (parsed & 255) / 255];
}

function createVideoTexture(gl: WebGL2RenderingContext, src: string, onReady: (aspect: number) => void, onFailure: () => void) {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = src;
  const play = () => { void video.play().catch(onFailure); };
  const ready = () => {
    onReady(video.videoWidth / Math.max(video.videoHeight, 1));

  };
  video.addEventListener("loadeddata", ready, { once: true });
  video.addEventListener("error", onFailure);


  let uploadedTime = -1;
  return {
    texture,
    pause: () => video.pause(),
    play,
    update() {
      if (video.readyState < video.HAVE_CURRENT_DATA) return false;
      if (uploadedTime === video.currentTime) return true;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        uploadedTime = video.currentTime;
        return true;
      } catch { onFailure(); return false; }
    },
    cleanup() {
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", onFailure);
      video.pause();
      video.removeAttribute("src");
      video.load();
      gl.deleteTexture(texture);
    },
  };
}

type Props = {
  videoSrc?: string;
  settings?: CursorVideoRevealSettings;
  onStatus?: (status: string) => void;
  rootSelector?: string;
};

export function CursorVideoReveal({
  videoSrc = "/assets/video/mycelial-transport-1.mp4",
  settings = acceptedCursorVideoReveal,
  onStatus,
  rootSelector = "[data-cursor-physics-root]",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionAllowed = useCursorMotion();
  const settingsRef = useRef(settings);
  const statusRef = useRef(onStatus);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { statusRef.current = onStatus; }, [onStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !settings.enabled || !motionAllowed || !videoSrc) return;
    const interactionRoot = document.querySelector<HTMLElement>(rootSelector);
    if (!interactionRoot) return;
    const report = (status: string) => {
      if (canvas.dataset.revealStatus === status) return;
      canvas.dataset.revealStatus = status;
      statusRef.current?.(status);
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || window.matchMedia("(pointer: coarse)").matches
      || window.matchMedia("(max-width: 1000px)").matches;
    if (reduced) { report("Static fallback"); return; }

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) { report("WebGL2 unavailable"); return; }

    const fieldProgram = makeProgram(gl, fieldShader);
    const compositeProgram = makeProgram(gl, compositeShader);
    if (!fieldProgram || !compositeProgram) {
      if (fieldProgram) gl.deleteProgram(fieldProgram);
      if (compositeProgram) gl.deleteProgram(compositeProgram);
      report("Shader fallback"); return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) { gl.deleteProgram(fieldProgram); gl.deleteProgram(compositeProgram); return; }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const locations = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    const uniform = (program: WebGLProgram, name: string) => {
      let cache = locations.get(program);
      if (!cache) { cache = new Map(); locations.set(program, cache); }
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
      return cache.get(name)!;
    };

    let failed = false;
    const fail = () => { failed = true; canvas.style.visibility = "hidden"; report("Static fallback"); };
    canvas.style.visibility = "";
    let revealAspect = 16 / 9;
    const revealMedia = createVideoTexture(gl, videoSrc, (aspect) => { revealAspect = aspect; }, fail);
    if (!revealMedia) { gl.deleteBuffer(buffer); gl.deleteProgram(fieldProgram); gl.deleteProgram(compositeProgram); return; }

    let simWidth = 0;
    let simHeight = 0;
    let readTexture: WebGLTexture | null = null;
    let writeTexture: WebGLTexture | null = null;
    let readFramebuffer: WebGLFramebuffer | null = null;
    let writeFramebuffer: WebGLFramebuffer | null = null;

    const allocateField = () => {
      if (readTexture) gl.deleteTexture(readTexture);
      if (writeTexture) gl.deleteTexture(writeTexture);
      if (readFramebuffer) gl.deleteFramebuffer(readFramebuffer);
      if (writeFramebuffer) gl.deleteFramebuffer(writeFramebuffer);
      simHeight = Math.max(1, Math.round(settings.quality));
      simWidth = Math.max(1, Math.round(simHeight * innerWidth / Math.max(innerHeight, 1)));
      const neutral = new Uint8Array(simWidth * simHeight * 4);
      for (let i = 0; i < neutral.length; i += 4) {
        neutral[i] = 0;
        neutral[i + 1] = 128;
        neutral[i + 2] = 128;
        neutral[i + 3] = 0;
      }
      const create = () => {
        const texture = gl.createTexture();
        const framebuffer = gl.createFramebuffer();
        if (!texture || !framebuffer) {
          if (texture) gl.deleteTexture(texture);
          if (framebuffer) gl.deleteFramebuffer(framebuffer);
          fail();
          return { texture: null, framebuffer: null };
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simWidth, simHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, neutral);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) fail();
        return { texture, framebuffer };
      };
      const a = create();
      const b = create();
      readTexture = a.texture;
      readFramebuffer = a.framebuffer;
      writeTexture = b.texture;
      writeFramebuffer = b.framebuffer;
    };
    allocateField();

    type Point = { x: number; y: number; t: number };
    const samples: Point[] = [];
    let lastInput: Point | null = null;
    let lastRendered: Point | null = null;
    let lastMove = -Infinity;
    let impact = { x: 0.5, y: 0.5, at: -10000 };
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-cursor-ui]")) return;
      const coalesced = event.getCoalescedEvents?.();
      const events = coalesced?.length ? coalesced : [event];
      for (const sample of events) {
        const point = {
          x: sample.clientX / Math.max(innerWidth, 1),
          y: 1 - sample.clientY / Math.max(innerHeight, 1),
          t: sample.timeStamp,
        };
        if (!lastInput) samples.push(point, point);
        else samples.push(point);
        lastInput = point;
      }
      if (samples.length > 24) samples.splice(0, samples.length - 24);
      lastMove = performance.now();
      wake();
    };
    const pointerDown = (event: PointerEvent) => {
      if (!settingsRef.current.impactEnabled || event.button !== 0 || !event.isPrimary) return;
      if (event.target instanceof Element && event.target.closest("a,button,input,select,textarea,label,[role='button'],[contenteditable]:not([contenteditable='false']),[data-cursor-ui],[data-cursor-impact-exempt]")) return;
      impact = {
        x: event.clientX / Math.max(innerWidth, 1),
        y: 1 - event.clientY / Math.max(innerHeight, 1),
        at: performance.now(),
      };
      wake();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      fail();
      report("WebGL context lost");
    };
    interactionRoot.addEventListener("pointermove", pointer, { passive: true });
    interactionRoot.addEventListener("pointerdown", pointerDown, { passive: true });
    canvas.addEventListener("webglcontextlost", contextLost);

    const packed = new Float32Array(16);
    let raf = 0;
    let last = performance.now();
    let intersecting = true;
    let visible = !document.hidden;
    const wake = () => {
      if (raf || !visible || failed) return;
      last = performance.now();
      revealMedia.play();
      raf = requestAnimationFrame(render);
    };
    const visibility = () => {
      visible = !document.hidden && intersecting;
      cancelAnimationFrame(raf);
      raf = 0;
      if (visible && !failed && performance.now() - Math.max(lastMove, impact.at) < 6000) {
        last = performance.now();
        revealMedia.play();
        raf = requestAnimationFrame(render);
      } else {
        revealMedia.pause();
        samples.length = 0;
        lastInput = lastRendered = null;
      }
    };
    document.addEventListener("visibilitychange", visibility);

    const render = (now: number) => {
      raf = 0;
      if (!visible || failed) return;
      // Let the approved fluid trail dissipate, then stop both GPU work and decoding.
      if (now - Math.max(lastMove, impact.at) > 6000) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        revealMedia.pause();
        lastInput = lastRendered = null;
        canvas.dataset.renderState = "idle";
        return;
      }
      // Avoid doubling shader work on 120 Hz displays.
      if (now - last < 1000 / 60 - 1) { raf = requestAnimationFrame(render); return; }
      canvas.dataset.renderState = "active";
      const dt = Math.min((now - last) / 1000, 0.034);
      last = now;
      const c = settingsRef.current;
      const dpr = Math.min(devicePixelRatio || 1, c.dprCap);
      const width = Math.max(1, Math.round(innerWidth * dpr));
      const height = Math.max(1, Math.round(innerHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        allocateField();
        samples.length = 0;
        lastInput = lastRendered = null;
      }

      if (failed) { revealMedia.pause(); return; }
      if (visible && readTexture && writeFramebuffer) {
        let points = samples.splice(0);
        if (lastRendered && points.length) points.unshift(lastRendered);
        if (points.length > 8) {
          points = Array.from({ length: 8 }, (_, i) => points[Math.round(i * (points.length - 1) / 7)]);
        }
        if (points.length === 1) points.push(points[0]);
        if (points.length) lastRendered = points[points.length - 1];


        const fallback = lastRendered ?? { x: 0.5, y: 0.5, t: now };
        for (let i = 0; i < 8; i += 1) {
          const point = points[i] ?? fallback;
          packed[i * 2] = point.x;
          packed[i * 2 + 1] = point.y;
        }
        const first = points[0] ?? fallback;
        const end = points[points.length - 1] ?? fallback;
        const elapsed = Math.max((end.t - first.t) / 1000, 0.008);
        const vx = (end.x - first.x) / elapsed * c.response;
        const vy = (end.y - first.y) / elapsed * c.response;
        const impactStrength = c.impactEnabled
          ? c.impactStrength * Math.exp(-(now - impact.at) / Math.max(c.impactDecayMs, 1))
          : 0;
        const impactRadius = c.impactRadius / Math.max(innerHeight, 1);

        gl.disable(gl.BLEND);
        gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
        gl.viewport(0, 0, simWidth, simHeight);
        gl.useProgram(fieldProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTexture);
        gl.uniform1i(uniform(fieldProgram, "u_state"), 0);
        gl.uniform2f(uniform(fieldProgram, "u_resolution"), simWidth, simHeight);
        gl.uniform2fv(uniform(fieldProgram, "u_points[0]"), packed);
        gl.uniform1i(uniform(fieldProgram, "u_pointCount"), points.length);
        gl.uniform2f(uniform(fieldProgram, "u_pointerVelocity"), vx, vy);
        gl.uniform1f(uniform(fieldProgram, "u_radius"), c.brushWidth / Math.max(innerHeight, 1));
        gl.uniform1f(uniform(fieldProgram, "u_dt"), dt);
        gl.uniform1f(uniform(fieldProgram, "u_persistence"), c.persistence);
        gl.uniform1f(uniform(fieldProgram, "u_flow"), c.flow);
        gl.uniform1f(uniform(fieldProgram, "u_cohesion"), c.cohesion);
        gl.uniform1f(uniform(fieldProgram, "u_turbulence"), c.turbulence);
        gl.uniform1f(uniform(fieldProgram, "u_active"), points.length > 1 && now - lastMove < 120 ? 1 : 0);
        gl.uniform1f(uniform(fieldProgram, "u_time"), now / 1000);
        gl.uniform1f(uniform(fieldProgram, "u_diffusion"), c.diffusion);
        gl.uniform1f(uniform(fieldProgram, "u_curl"), c.curl);
        gl.uniform1f(uniform(fieldProgram, "u_lift"), c.lift);
        gl.uniform1f(uniform(fieldProgram, "u_settling"), c.settling);
        gl.uniform1f(uniform(fieldProgram, "u_drag"), c.fluidDrag);
        gl.uniform1f(uniform(fieldProgram, "u_brownian"), c.brownianDrift);
        gl.uniform1f(uniform(fieldProgram, "u_brownianScale"), c.brownianScale);
        gl.uniform4f(uniform(fieldProgram, "u_impact"), impact.x, impact.y, impactStrength, impactRadius);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        [readTexture, writeTexture] = [writeTexture, readTexture];
        [readFramebuffer, writeFramebuffer] = [writeFramebuffer, readFramebuffer];

        if (!revealMedia.update()) {
          raf = requestAnimationFrame(render);
          return;
        }
        report("WebGL2 field live");
        const shadow = rgb(c.shadowColor);
        const body = rgb(c.bodyColor);
        const highlight = rgb(c.highlightColor);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(compositeProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTexture);
        gl.uniform1i(uniform(compositeProgram, "u_state"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, revealMedia.texture);
        gl.uniform1i(uniform(compositeProgram, "u_reveal"), 1);
        gl.uniform2f(uniform(compositeProgram, "u_resolution"), width, height);
        gl.uniform1f(uniform(compositeProgram, "u_revealAspect"), revealAspect);
        gl.uniform1f(uniform(compositeProgram, "u_edgeSoftness"), c.edgeSoftness);
        gl.uniform1f(uniform(compositeProgram, "u_dissolveSoftness"), c.dissolveSoftness);
        gl.uniform1f(uniform(compositeProgram, "u_revealOpacity"), c.revealOpacity);
        gl.uniform1f(uniform(compositeProgram, "u_refraction"), c.refraction);
        gl.uniform3f(uniform(compositeProgram, "u_shadow"), ...shadow);
        gl.uniform3f(uniform(compositeProgram, "u_body"), ...body);
        gl.uniform3f(uniform(compositeProgram, "u_highlight"), ...highlight);
        gl.uniform1f(uniform(compositeProgram, "u_paletteMix"), c.paletteMix);
        gl.uniform1f(uniform(compositeProgram, "u_exposure"), c.exposure);
        gl.uniform1f(uniform(compositeProgram, "u_lookContrast"), c.lookContrast);
        gl.uniform1f(uniform(compositeProgram, "u_textureMix"), c.textureMix);
        gl.uniform1f(uniform(compositeProgram, "u_grainSize"), c.grainSize);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(render);
    };

    report("Loading video");
    canvas.dataset.renderState = "idle";
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      visibility();
    });
    observer.observe(interactionRoot);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      interactionRoot.removeEventListener("pointermove", pointer);
      interactionRoot.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      report("Static fallback");
      revealMedia.cleanup();
      gl.deleteProgram(fieldProgram);
      gl.deleteProgram(compositeProgram);
      if (buffer) gl.deleteBuffer(buffer);
      if (readTexture) gl.deleteTexture(readTexture);
      if (writeTexture) gl.deleteTexture(writeTexture);
      if (readFramebuffer) gl.deleteFramebuffer(readFramebuffer);
      if (writeFramebuffer) gl.deleteFramebuffer(writeFramebuffer);
    };
  }, [settings.enabled, settings.quality, videoSrc, rootSelector, motionAllowed]);

  if (!settings.enabled) return null;
  return <canvas ref={canvasRef} className="field-v2-canvas" data-cursor-video-reveal aria-hidden="true" />;
}
