const INSTRUMENT_SCRIPT_PATH = "/vendor/audio/0270_FluidR3_GM_sf2_file.js";
const INSTRUMENT_VARIABLE = "_tone_0270_FluidR3_GM_sf2_file";

let audioContext = null;
let instrumentPromise = null;
let activePlayback = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function loadScriptOnce(src, globalName) {
  if (window[globalName]) {
    return Promise.resolve(window[globalName]);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-audio-script="${src}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window[globalName]), { once: true });
      existingScript.addEventListener("error", () => reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`)), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.audioScript = src;
    script.addEventListener("load", () => resolve(window[globalName]), { once: true });
    script.addEventListener("error", () => reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`)), {
      once: true
    });
    document.head.append(script);
  });
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function decodeZone(context, zone) {
  if (zone.buffer || !zone.file) {
    return zone;
  }

  const source = base64ToArrayBuffer(zone.file);
  zone.buffer = await context.decodeAudioData(source.slice(0));
  return zone;
}

async function loadInstrumentPreset(context) {
  if (!instrumentPromise) {
    instrumentPromise = loadScriptOnce(INSTRUMENT_SCRIPT_PATH, INSTRUMENT_VARIABLE).then(
      async (preset) => {
        if (!preset?.zones?.length) {
          throw new Error("기타 샘플 프리셋을 찾을 수 없습니다.");
        }

        await Promise.all(preset.zones.map((zone) => decodeZone(context, zone)));
        return preset;
      }
    );
  }

  return instrumentPromise;
}

function findZone(preset, pitch) {
  let match = null;

  for (let index = preset.zones.length - 1; index >= 0; index -= 1) {
    const zone = preset.zones[index];

    if (zone.keyRangeLow <= pitch && zone.keyRangeHigh + 1 >= pitch) {
      match = zone;
      break;
    }
  }

  return match;
}

function stopActivePlayback(context) {
  if (!activePlayback) {
    return;
  }

  const now = context.currentTime;

  try {
    activePlayback.output.gain.cancelScheduledValues(now);
    activePlayback.output.gain.setTargetAtTime(0.0001, now, 0.015);
  } catch {
    // 이미 종료된 경우는 조용히 무시합니다.
  }

  try {
    activePlayback.source.stop(now + 0.05);
  } catch {
    // 이미 종료된 source는 stop에서 예외가 날 수 있습니다.
  }

  activePlayback = null;
}

function createToneChain(context, now) {
  const output = context.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.connect(context.destination);

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-22, now);
  compressor.knee.setValueAtTime(14, now);
  compressor.ratio.setValueAtTime(3.2, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.18, now);
  compressor.connect(output);

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(4200, now);
  lowpass.Q.setValueAtTime(0.6, now);
  lowpass.connect(compressor);

  const body = context.createBiquadFilter();
  body.type = "peaking";
  body.frequency.setValueAtTime(680, now);
  body.gain.setValueAtTime(1.8, now);
  body.Q.setValueAtTime(0.9, now);
  body.connect(lowpass);

  const presence = context.createBiquadFilter();
  presence.type = "highshelf";
  presence.frequency.setValueAtTime(2600, now);
  presence.gain.setValueAtTime(1.4, now);
  presence.connect(body);

  return { output, input: presence };
}

function scheduleEnvelope(gainNode, now, duration) {
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.46, now + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.22, now + 0.09);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
}

export async function prepareAudio() {
  const context = getAudioContext();

  if (context.state === "suspended") {
    await context.resume();
  }

  await loadInstrumentPreset(context);
  return context;
}

export async function playPositionTone(position) {
  const context = await prepareAudio();
  const preset = await loadInstrumentPreset(context);
  const zone = findZone(preset, position.midi);

  if (!zone?.buffer) {
    throw new Error("해당 음에 맞는 기타 샘플을 찾을 수 없습니다.");
  }

  stopActivePlayback(context);

  const now = context.currentTime;
  const delay = zone.delay || 0;
  const duration = 2.1;
  const releaseTail = 0.45;
  const totalDuration = duration + releaseTail;
  const baseDetune = zone.originalPitch - 100 * (zone.coarseTune || 0) - (zone.fineTune || 0);
  const playbackRate = Math.pow(2, (100 * position.midi - baseDetune) / 1200);
  const { input, output } = createToneChain(context, now);
  const source = context.createBufferSource();

  source.buffer = zone.buffer;
  source.playbackRate.setValueAtTime(playbackRate, now);

  if (zone.loopStart > 0 && zone.loopEnd > zone.loopStart) {
    source.loop = true;
    source.loopStart = zone.loopStart / zone.sampleRate + delay;
    source.loopEnd = zone.loopEnd / zone.sampleRate + delay;
  }

  source.connect(input);
  scheduleEnvelope(output, now, totalDuration);
  source.start(now, delay);
  source.stop(now + totalDuration);

  activePlayback = { output, source };
  source.addEventListener(
    "ended",
    () => {
      if (activePlayback?.source === source) {
        activePlayback = null;
      }
    },
    { once: true }
  );
}
