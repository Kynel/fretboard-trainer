import {
  buildFretboardPositions,
  createFretScale,
  ENGLISH_NOTES,
  formatPosition,
  getInlayFrets,
  KOREAN_NOTES,
  STANDARD_TUNING
} from "./data.js";
import { playPositionTone, prepareAudio } from "./audio.js";
import {
  DEFAULT_SETTINGS,
  getStatsSummary,
  loadSettings,
  recordExposure,
  recordSelfCheck,
  saveSettings
} from "./storage.js";

const refs = {
  cardIntervalValue: document.querySelector("#card-interval-value"),
  cardNextButton: document.querySelector("#card-next-button"),
  cardPauseButton: document.querySelector("#card-pause-button"),
  cardStartButton: document.querySelector("#card-start-button"),
  cardToolbar: document.querySelector("#card-toolbar"),
  candidateSummary: document.querySelector("#candidate-summary"),
  englishNote: document.querySelector("#english-note"),
  fretCountSelect: document.querySelector("#fret-count-select"),
  fretboardSvg: document.querySelector("#fretboard-svg"),
  hardNoteList: document.querySelector("#hard-note-list"),
  hardPositionList: document.querySelector("#hard-position-list"),
  heroCandidateCount: document.querySelector("#hero-candidate-count"),
  heroDailyRounds: document.querySelector("#hero-daily-rounds"),
  heroStreakCount: document.querySelector("#hero-streak-count"),
  intervalSlider: document.querySelector("#interval-slider"),
  intervalValue: document.querySelector("#interval-value"),
  koreanNote: document.querySelector("#korean-note"),
  maxFretInput: document.querySelector("#max-fret-input"),
  minFretInput: document.querySelector("#min-fret-input"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  nextButton: document.querySelector("#next-button"),
  noteFilterList: document.querySelector("#note-filter-list"),
  openStringToggle: document.querySelector("#open-string-toggle"),
  pauseButton: document.querySelector("#pause-button"),
  pageShell: document.querySelector(".page-shell"),
  positionText: document.querySelector("#position-text"),
  quizFeedback: document.querySelector("#quiz-feedback"),
  revealButton: document.querySelector("#reveal-button"),
  revealControl: document.querySelector("#reveal-control"),
  revealSlider: document.querySelector("#reveal-slider"),
  revealValue: document.querySelector("#reveal-value"),
  replayButton: document.querySelector("#replay-button"),
  roundTitle: document.querySelector("#round-title"),
  soundStatus: document.querySelector("#sound-status"),
  soundToggle: document.querySelector("#sound-toggle"),
  startButton: document.querySelector("#start-button"),
  statusText: document.querySelector("#status-text"),
  stringFilterList: document.querySelector("#string-filter-list"),
  todayAccuracy: document.querySelector("#today-accuracy"),
  todayNotes: document.querySelector("#today-notes"),
  todayPositions: document.querySelector("#today-positions"),
  todayRounds: document.querySelector("#today-rounds")
};

window.lucide?.createIcons();
const CARD_REVEAL_SECONDS = 1;

const state = {
  settings: normalizeSettings(loadSettings()),
  stats: getStatsSummary(),
  candidates: [],
  currentPosition: null,
  autoplay: false,
  quizRevealed: false,
  assessmentSubmitted: false,
  currentRoundTracked: false,
  audioReady: false,
  timers: {
    round: null,
    reveal: null
  }
};

function normalizeSettings(settings) {
  const fretCount = settings.fretCount === 24 ? 24 : 22;
  const minFret = clampNumber(settings.minFret, 0, fretCount);
  const maxFret = clampNumber(settings.maxFret, minFret, fretCount);
  const intervalSeconds = clampNumber(settings.intervalSeconds, 1.5, 12);
  const revealSeconds = clampNumber(settings.revealSeconds, 1, Math.max(1, intervalSeconds - 0.5));
  const selectedStrings = [...new Set(settings.selectedStrings || DEFAULT_SETTINGS.selectedStrings)]
    .filter((value) => value >= 1 && value <= 6)
    .sort((left, right) => right - left);
  const selectedNotes = [...new Set(settings.selectedNotes || DEFAULT_SETTINGS.selectedNotes)]
    .filter((value) => value >= 0 && value <= 11)
    .sort((left, right) => left - right);

  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    mode:
      settings.mode === "quiz" ? "quiz" : settings.mode === "card" ? "card" : "study",
    fretCount,
    minFret,
    maxFret,
    intervalSeconds,
    revealSeconds,
    selectedStrings: selectedStrings.length ? selectedStrings : [...DEFAULT_SETTINGS.selectedStrings],
    selectedNotes: selectedNotes.length ? selectedNotes : [...DEFAULT_SETTINGS.selectedNotes]
  };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function clearTimers() {
  clearTimeout(state.timers.round);
  clearTimeout(state.timers.reveal);
  state.timers.round = null;
  state.timers.reveal = null;
}

function persistSettings() {
  state.settings = normalizeSettings(state.settings);
  saveSettings(state.settings);
}

function rebuildCandidates() {
  const allPositions = buildFretboardPositions(state.settings.fretCount);

  state.candidates = allPositions.filter((position) => {
    const withinStrings = state.settings.selectedStrings.includes(position.string);
    const withinFrets =
      position.fret >= state.settings.minFret && position.fret <= state.settings.maxFret;
    const openAllowed = state.settings.includeOpenStrings || position.fret !== 0;
    const noteAllowed = state.settings.selectedNotes.includes(position.noteIndex);
    return withinStrings && withinFrets && openAllowed && noteAllowed;
  });

  if (!state.candidates.some((position) => position.id === state.currentPosition?.id)) {
    state.currentPosition = null;
    state.quizRevealed = false;
    state.assessmentSubmitted = false;
    state.currentRoundTracked = false;
  }

  if (state.candidates.length === 0) {
    state.autoplay = false;
    clearTimers();
  }
}

function pickRandomPosition() {
  if (state.candidates.length === 0) {
    return null;
  }

  let available = state.candidates;

  if (state.currentPosition && state.candidates.length > 1) {
    const withoutCurrent = state.candidates.filter(
      (candidate) => candidate.id !== state.currentPosition.id
    );

    if (withoutCurrent.length > 0) {
      available = withoutCurrent;
    }
  }

  return available[Math.floor(Math.random() * available.length)];
}

function setSoundStatus(message) {
  refs.soundStatus.textContent = message;
}

async function playCurrentSound({ force = false } = {}) {
  if (!state.currentPosition) {
    return;
  }

  if (!force && !state.settings.soundEnabled) {
    setSoundStatus("자동 소리 꺼짐");
    return;
  }

  try {
    await playPositionTone(state.currentPosition);
    state.audioReady = true;
    setSoundStatus("준비됨");
  } catch (error) {
    state.audioReady = false;
    setSoundStatus("시작 버튼으로 오디오 준비");
    console.error(error);
  }
}

function refreshStats() {
  state.stats = getStatsSummary();
  renderStats();
}

function getRevealDelaySeconds() {
  if (state.settings.mode === "quiz") {
    return state.settings.revealSeconds;
  }

  if (state.settings.mode === "card") {
    return CARD_REVEAL_SECONDS;
  }

  return null;
}

function startRound({ track = true, immediateAudio = true } = {}) {
  clearTimers();

  const nextPosition = pickRandomPosition();

  if (!nextPosition) {
    renderAll();
    return;
  }

  state.currentPosition = nextPosition;
  state.quizRevealed = state.settings.mode === "study";
  state.assessmentSubmitted = false;
  state.currentRoundTracked = track;

  if (track) {
    state.stats = recordExposure(nextPosition);
  }

  renderAll();

  if (immediateAudio) {
    void playCurrentSound();
  }

  if (!state.autoplay) {
    const revealDelaySeconds = getRevealDelaySeconds();
    if (revealDelaySeconds !== null) {
      state.timers.reveal = window.setTimeout(() => {
        revealCurrentAnswer();
      }, revealDelaySeconds * 1000);
    }
    return;
  }

  const revealDelaySeconds = getRevealDelaySeconds();
  if (revealDelaySeconds !== null) {
    state.timers.reveal = window.setTimeout(() => {
      revealCurrentAnswer();
    }, revealDelaySeconds * 1000);
  }

  state.timers.round = window.setTimeout(() => {
    startRound();
  }, state.settings.intervalSeconds * 1000);
}

function revealCurrentAnswer() {
  if (!state.currentPosition || state.quizRevealed) {
    return;
  }

  state.quizRevealed = true;
  renderAll();

  if (state.settings.soundEnabled) {
    void playCurrentSound();
  }
}

function startAutoplay() {
  if (state.candidates.length === 0) {
    renderAll();
    return;
  }

  state.autoplay = true;
  void prepareAudio()
    .then(() => {
      state.audioReady = true;
      setSoundStatus(state.settings.soundEnabled ? "준비됨" : "자동 소리 꺼짐");
      startRound({ track: true, immediateAudio: true });
    })
    .catch(() => {
      state.audioReady = false;
      setSoundStatus("시작 버튼으로 오디오 준비");
      startRound({ track: true, immediateAudio: false });
    });

  renderAll();
}

function pauseAutoplay() {
  state.autoplay = false;
  clearTimers();
  renderAll();
}

function formatAccuracy(todayStats) {
  const totalChecks =
    todayStats.checks.correct + todayStats.checks.fuzzy + todayStats.checks.wrong;

  if (totalChecks === 0 || todayStats.accuracy === null) {
    return "아직 없음";
  }

  return `정답 ${Math.round(todayStats.accuracy * 100)}%`;
}

function renderInsights(listElement, items, formatter, emptyMessage) {
  if (!items || items.length === 0) {
    listElement.innerHTML = `<li class="empty-state">${emptyMessage}</li>`;
    return;
  }

  listElement.innerHTML = items
    .map((item) => `<li><strong>${formatter(item.key)}</strong><span>${item.count}회</span></li>`)
    .join("");
}

function renderStats() {
  refs.heroDailyRounds.textContent = `${state.stats.today.rounds}회`;
  refs.heroCandidateCount.textContent = `${state.candidates.length}개`;
  refs.heroStreakCount.textContent = `${state.stats.overall.streak}일`;
  refs.todayRounds.textContent = `${state.stats.today.rounds}회`;
  refs.todayPositions.textContent = `${state.stats.today.uniquePositionsCount}개`;
  refs.todayNotes.textContent = `${state.stats.today.uniqueNotesCount}개`;
  refs.todayAccuracy.textContent = formatAccuracy(state.stats.today);

  renderInsights(
    refs.hardNoteList,
    state.stats.today.hardestNotes.length
      ? state.stats.today.hardestNotes
      : state.stats.overall.hardestNotes,
    (key) => `${key} / ${KOREAN_NOTES[ENGLISH_NOTES.indexOf(key)] || "-"}`,
    "아직 헷갈린 음 기록이 없습니다."
  );

  renderInsights(
    refs.hardPositionList,
    state.stats.today.hardestPositions.length
      ? state.stats.today.hardestPositions
      : state.stats.overall.hardestPositions,
    (key) => {
      const [string, fret] = key.split("-").map(Number);
      return fret === 0 ? `${string}번 줄 · 개방현` : `${string}번 줄 · ${fret}프렛`;
    },
    "아직 헷갈린 위치 기록이 없습니다."
  );
}

function renderModeButtons() {
  refs.modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.settings.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderStringFilters() {
  refs.stringFilterList.innerHTML = STANDARD_TUNING.map((stringInfo) => {
    const active = state.settings.selectedStrings.includes(stringInfo.string);
    return `
      <button
        type="button"
        class="chip ${active ? "is-active" : ""}"
        data-string="${stringInfo.string}"
        aria-pressed="${active}"
      >
        <span>${stringInfo.string}번 줄</span>
        <small>${stringInfo.openEnglish} / ${stringInfo.openKorean}</small>
      </button>
    `;
  }).join("");
}

function renderNoteFilters() {
  refs.noteFilterList.innerHTML = ENGLISH_NOTES.map((english, noteIndex) => {
    const active = state.settings.selectedNotes.includes(noteIndex);
    return `
      <button
        type="button"
        class="chip chip--note ${active ? "is-active" : ""}"
        data-note-index="${noteIndex}"
        aria-pressed="${active}"
      >
        <span>${english}</span>
        <small>${KOREAN_NOTES[noteIndex]}</small>
      </button>
    `;
  }).join("");
}

function updateNoteFields() {
  if (!state.currentPosition) {
    refs.englishNote.textContent = "-";
    refs.koreanNote.textContent = "-";
    refs.englishNote.classList.remove("is-hidden-answer");
    refs.koreanNote.classList.remove("is-hidden-answer");
    return;
  }

  const answerHidden = state.settings.mode !== "study" && !state.quizRevealed;
  const englishText = answerHidden
    ? state.settings.mode === "card"
      ? "?"
      : "생각 중"
    : state.currentPosition.english;
  const koreanText = answerHidden
    ? state.settings.mode === "card"
      ? "?"
      : "정답 대기"
    : state.currentPosition.korean;

  refs.englishNote.textContent = englishText;
  refs.koreanNote.textContent = koreanText;

  refs.englishNote.classList.toggle("is-hidden-answer", answerHidden);
  refs.koreanNote.classList.toggle("is-hidden-answer", answerHidden);
}

function renderRoundState() {
  const hasCandidates = state.candidates.length > 0;
  const hasCurrent = !!state.currentPosition;

  if (!hasCandidates) {
    refs.roundTitle.textContent = "연습 가능한 위치가 없습니다";
    refs.statusText.textContent = "범위를 넓혀 주세요.";
    refs.positionText.textContent = "조건에 맞는 위치 없음";
    updateNoteFields();
    return;
  }

  if (!hasCurrent) {
    refs.roundTitle.textContent = "준비됨";
    refs.statusText.textContent = "다음 또는 자동 재생으로 시작하세요.";
    refs.positionText.textContent = "아직 선택되지 않음";
    updateNoteFields();
    return;
  }

  refs.positionText.textContent = formatPosition(state.currentPosition);
  updateNoteFields();

  if (state.settings.mode === "card") {
    refs.roundTitle.textContent = "카드 학습";
    refs.statusText.textContent = "반복해서 보는 최소 화면입니다.";
    return;
  }

  if (state.settings.mode === "study") {
    refs.roundTitle.textContent = "학습 중";
    refs.statusText.textContent = state.autoplay
      ? "위치와 소리를 반복 재생합니다."
      : "현재 위치와 음을 확인해 보세요.";
    return;
  }

  if (!state.quizRevealed) {
    refs.roundTitle.textContent = "퀴즈 진행 중";
    refs.statusText.textContent = "먼저 어떤 음인지 떠올려 보세요.";
    return;
  }

  refs.roundTitle.textContent = "정답 공개";
  refs.statusText.textContent = "정답을 확인해 보세요.";
}

function renderButtons() {
  refs.pauseButton.disabled = !state.autoplay;
  refs.startButton.disabled = state.candidates.length === 0;
  refs.startButton.classList.toggle("is-active", state.autoplay);
  refs.startButton.setAttribute("aria-pressed", String(state.autoplay));
  refs.startButton.setAttribute("aria-label", state.autoplay ? "재생 중" : "자동 재생");
  refs.startButton.title = state.autoplay ? "재생 중" : "자동 재생";
  refs.cardPauseButton.disabled = !state.autoplay;
  refs.cardStartButton.disabled = state.candidates.length === 0;
  refs.cardStartButton.classList.toggle("is-active", state.autoplay);
  refs.cardStartButton.setAttribute("aria-pressed", String(state.autoplay));
  refs.cardStartButton.setAttribute("aria-label", state.autoplay ? "재생 중" : "자동 재생");
  refs.cardStartButton.title = state.autoplay ? "재생 중" : "자동 재생";
  refs.cardToolbar.hidden = state.settings.mode !== "card";
  refs.cardIntervalValue.textContent = `${state.settings.intervalSeconds.toFixed(1)}초 반복`;

  const revealEnabled =
    state.settings.mode === "quiz" && state.currentPosition && !state.quizRevealed;
  refs.revealButton.hidden = state.settings.mode !== "quiz";
  refs.revealButton.disabled = !revealEnabled;

  refs.quizFeedback.classList.toggle(
    "hidden",
    !(state.settings.mode === "quiz" && state.quizRevealed && state.currentPosition)
  );

  refs.quizFeedback.querySelectorAll("[data-assessment]").forEach((button) => {
    button.disabled = state.assessmentSubmitted;
  });

  refs.replayButton.disabled = !state.currentPosition;
  refs.cardNextButton.disabled = !state.currentPosition && state.candidates.length === 0;
}

function renderControls() {
  refs.intervalSlider.value = String(state.settings.intervalSeconds);
  refs.intervalValue.textContent = `${state.settings.intervalSeconds.toFixed(1)}초`;

  refs.revealSlider.value = String(state.settings.revealSeconds);
  refs.revealValue.textContent = `${state.settings.revealSeconds.toFixed(1)}초`;
  refs.revealControl.classList.toggle("is-hidden", state.settings.mode !== "quiz");

  refs.fretCountSelect.value = String(state.settings.fretCount);
  refs.minFretInput.max = String(state.settings.fretCount);
  refs.maxFretInput.max = String(state.settings.fretCount);
  refs.minFretInput.value = String(state.settings.minFret);
  refs.maxFretInput.value = String(state.settings.maxFret);
  refs.soundToggle.checked = state.settings.soundEnabled;
  refs.openStringToggle.checked = state.settings.includeOpenStrings;

  refs.candidateSummary.textContent = `${state.candidates.length}개 위치`;
}

function renderLayoutMode() {
  refs.pageShell.dataset.layout = state.settings.mode === "card" ? "card" : "full";
}

function markerCenter(fretXs, fret) {
  if (fret === 0) {
    return fretXs[0] - 52;
  }

  return (fretXs[fret - 1] + fretXs[fret]) / 2;
}

function interpolate(start, end, ratio) {
  return start + (end - start) * ratio;
}

function renderFretboard() {
  const isCardLayout = state.settings.mode === "card";
  const svgWidth = isCardLayout ? 1240 : 1360;
  const svgHeight = isCardLayout ? 372 : 500;
  const renderStrings = [...STANDARD_TUNING].reverse();
  const nutX = isCardLayout ? 108 : 160;
  const boardY = isCardLayout ? 56 : 96;
  const boardHeight = isCardLayout ? 242 : 272;
  const boardBottom = boardY + boardHeight;
  const boardEndX = isCardLayout ? 1214 : 1326;
  const boardWidth = boardEndX - nutX;
  const physicalFretScale = createFretScale(state.settings.fretCount);
  const fretScale = physicalFretScale.map((ratio, fret) => {
    if (fret === 0) {
      return 0;
    }

    // 너무 촘촘해 보이지 않도록 실측 대비 약하게 풀어줍니다.
    return interpolate(ratio, fret / state.settings.fretCount, 0.18);
  });
  const fretXs = fretScale.map((ratio) => nutX + ratio * boardWidth);
  const inlays = getInlayFrets(state.settings.fretCount);
  const stringPadding = isCardLayout ? 20 : 22;
  const stringGap = (boardHeight - stringPadding * 2) / (renderStrings.length - 1);
  const stringYs = renderStrings.map((_, index) => boardY + stringPadding + index * stringGap);
  const current = state.currentPosition;
  const currentStringIndex = current
    ? renderStrings.findIndex((stringInfo) => stringInfo.string === current.string)
    : -1;
  const markerX = current ? markerCenter(fretXs, current.fret) : null;
  const markerY = current ? stringYs[currentStringIndex] : null;
  const isQuizHidden = state.settings.mode === "quiz" && !state.quizRevealed;
  const isCardHidden = state.settings.mode === "card" && !state.quizRevealed;
  const markerLabel = isQuizHidden ? "?" : isCardHidden ? "" : current?.english || "";
  const markerFill = isQuizHidden ? "#111827" : "#f8fafc";
  const markerStroke = isQuizHidden ? "rgba(226, 232, 240, 0.9)" : "rgba(15, 23, 42, 0.92)";
  const markerTextFill = isQuizHidden ? "#f8fafc" : "#111827";
  const markerTextStroke = isQuizHidden ? "rgba(15, 23, 42, 0.32)" : "rgba(248, 250, 252, 0.56)";
  const markerFontSize = markerLabel.length >= 2 ? (isCardLayout ? 22 : 20) : isCardLayout ? 26 : 24;
  const markerRadius = isCardLayout ? 29 : 27;
  const markerInnerRadius = isCardLayout ? 11 : 10;
  const inlayRadius = isCardLayout ? 9.5 : 10.5;
  const doubleInlayOffset = isCardLayout ? 30 : 36;
  const openX = nutX - (isCardLayout ? 48 : 56);

  refs.fretboardSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

  refs.fretboardSvg.innerHTML = `
    <defs>
      <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#403b37" />
        <stop offset="100%" stop-color="#272b2f" />
      </linearGradient>
      <linearGradient id="fretWireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#99a1ab" />
        <stop offset="45%" stop-color="#f3f4f6" />
        <stop offset="100%" stop-color="#a7afb8" />
      </linearGradient>
      <linearGradient id="nutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ddd8d0" />
        <stop offset="50%" stop-color="#fbfaf7" />
        <stop offset="100%" stop-color="#cfc8bf" />
      </linearGradient>
    </defs>

    <rect
      x="${nutX}"
      y="${boardY}"
      width="${boardWidth}"
      height="${boardHeight}"
      rx="24"
      fill="url(#boardGradient)"
      stroke="rgba(255, 255, 255, 0.06)"
      stroke-width="1.4"
    />

    <line
      x1="${nutX}"
      y1="${boardY}"
      x2="${boardEndX}"
      y2="${boardY}"
      stroke="rgba(255, 255, 255, 0.14)"
      stroke-width="2"
      stroke-linecap="round"
    />
    <line
      x1="${nutX}"
      y1="${boardBottom}"
      x2="${boardEndX}"
      y2="${boardBottom}"
      stroke="rgba(255, 255, 255, 0.08)"
      stroke-width="2"
      stroke-linecap="round"
    />

    ${inlays
      .map((fret) => {
        const centerX = markerCenter(fretXs, fret);
        const isDouble = fret === 12 || fret === 24;
        const centerY = boardY + boardHeight / 2;
        return isDouble
          ? `
            <circle cx="${centerX}" cy="${centerY - doubleInlayOffset}" r="${inlayRadius}" fill="rgba(226, 232, 240, 0.78)" />
            <circle cx="${centerX}" cy="${centerY + doubleInlayOffset}" r="${inlayRadius}" fill="rgba(226, 232, 240, 0.78)" />
          `
          : `<circle cx="${centerX}" cy="${centerY}" r="${inlayRadius}" fill="rgba(226, 232, 240, 0.78)" />`;
      })
      .join("")}

    ${Array.from({ length: state.settings.fretCount }, (_, index) => {
      const fretNumber = index + 1;
      const x = fretXs[fretNumber];
      const top = boardY - 8;
      const bottom = boardBottom + 8;
      return `
        <rect
          x="${x - 2.7}"
          y="${top}"
          width="5.4"
          height="${bottom - top}"
          rx="2.4"
          fill="url(#fretWireGradient)"
        />
        <line x1="${x + 1.45}" y1="${top + 1}" x2="${x + 1.45}" y2="${bottom - 1}" stroke="rgba(255, 255, 255, 0.78)" stroke-width="1.1" />
      `;
    }).join("")}

    <rect
      x="${nutX - 7}"
      y="${boardY - 12}"
      width="14"
      height="${boardHeight + 24}"
      rx="5"
      fill="url(#nutGradient)"
      stroke="rgba(148, 163, 184, 0.75)"
      stroke-width="1.6"
    />

    ${renderStrings.map((stringInfo, index) => {
      const y = stringYs[index];
      const highlight = current && current.string === stringInfo.string;
      const strokeWidth = interpolate(1.6, 4.8, index / (renderStrings.length - 1));
      return `
        <line
          x1="${openX}"
          y1="${y + 1.1}"
          x2="${boardEndX + 24}"
          y2="${y + 1.1}"
          stroke="rgba(15, 23, 42, 0.22)"
          stroke-width="${strokeWidth + 1.2}"
          stroke-linecap="round"
        />
        <line
          x1="${openX}"
          y1="${y}"
          x2="${nutX + boardWidth}"
          y2="${y}"
          stroke="${highlight ? "#ffffff" : "rgba(226, 232, 240, 0.94)"}"
          stroke-width="${highlight ? strokeWidth + 1.5 : strokeWidth}"
          stroke-linecap="round"
        />
      `;
    }).join("")}

    ${current
      ? `
        <circle
          cx="${markerX}"
          cy="${markerY}"
          r="${markerRadius}"
          fill="${markerFill}"
          stroke="${markerStroke}"
          stroke-width="4"
        />
        <circle cx="${markerX}" cy="${markerY}" r="${markerInnerRadius}" fill="${isQuizHidden ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.06)"}" />
        <text
          x="${markerX}"
          y="${markerY}"
          text-anchor="middle"
          dominant-baseline="middle"
          class="svg-marker-label"
          fill="${markerTextFill}"
          stroke="${markerTextStroke}"
          stroke-width="0.9"
          paint-order="stroke fill"
          style="font-size: ${markerFontSize}px"
        >${markerLabel}</text>
      `
      : `
        <text x="${svgWidth / 2}" y="${svgHeight / 2}" text-anchor="middle" class="svg-empty-state">
          위치를 선택하면 마커가 표시됩니다
        </text>
      `}
  `;
}

function renderAll() {
  renderLayoutMode();
  renderModeButtons();
  renderStringFilters();
  renderNoteFilters();
  renderControls();
  renderRoundState();
  renderButtons();
  renderFretboard();
  renderStats();

  if (!state.settings.soundEnabled) {
    setSoundStatus("자동 소리 꺼짐");
  } else if (!state.audioReady) {
    setSoundStatus("시작 버튼으로 오디오 준비");
  }
}

function toggleString(stringNumber) {
  const selected = new Set(state.settings.selectedStrings);

  if (selected.has(stringNumber)) {
    selected.delete(stringNumber);
  } else {
    selected.add(stringNumber);
  }

  state.settings.selectedStrings = [...selected].sort((left, right) => right - left);

  if (state.settings.selectedStrings.length === 0) {
    state.settings.selectedStrings = [...DEFAULT_SETTINGS.selectedStrings];
  }

  applySettingsChange();
}

function toggleNote(noteIndex) {
  const selected = new Set(state.settings.selectedNotes);

  if (selected.has(noteIndex)) {
    selected.delete(noteIndex);
  } else {
    selected.add(noteIndex);
  }

  state.settings.selectedNotes = [...selected].sort((left, right) => left - right);

  if (state.settings.selectedNotes.length === 0) {
    state.settings.selectedNotes = [...DEFAULT_SETTINGS.selectedNotes];
  }

  applySettingsChange();
}

function applyRangePreset(preset) {
  if (preset === "open") {
    state.settings.minFret = 0;
    state.settings.maxFret = 0;
    state.settings.includeOpenStrings = true;
  }

  if (preset === "first-five") {
    state.settings.minFret = 1;
    state.settings.maxFret = Math.min(5, state.settings.fretCount);
  }

  if (preset === "first-twelve") {
    state.settings.minFret = 1;
    state.settings.maxFret = Math.min(12, state.settings.fretCount);
  }

  if (preset === "full") {
    state.settings.minFret = 0;
    state.settings.maxFret = state.settings.fretCount;
  }

  applySettingsChange();
}

function applyStringPreset(preset) {
  if (preset === "all") {
    state.settings.selectedStrings = [...DEFAULT_SETTINGS.selectedStrings];
  }

  if (preset === "low") {
    state.settings.selectedStrings = [6, 5, 4];
  }

  if (preset === "high") {
    state.settings.selectedStrings = [3, 2, 1];
  }

  applySettingsChange();
}

function applyNotePreset(preset) {
  if (preset === "all") {
    state.settings.selectedNotes = [...DEFAULT_SETTINGS.selectedNotes];
  }

  if (preset === "natural") {
    state.settings.selectedNotes = [0, 2, 4, 5, 7, 9, 11];
  }

  if (preset === "accidental") {
    state.settings.selectedNotes = [1, 3, 6, 8, 10];
  }

  applySettingsChange();
}

function applySettingsChange({ preview = true } = {}) {
  persistSettings();
  rebuildCandidates();

  if (state.candidates.length === 0) {
    renderAll();
    return;
  }

  if (preview) {
    startRound({ track: false, immediateAudio: state.autoplay && state.settings.soundEnabled });
  } else {
    renderAll();
  }
}

function handleSelfCheck(result) {
  if (!state.currentPosition || state.assessmentSubmitted) {
    return;
  }

  if (!state.currentRoundTracked) {
    state.stats = recordExposure(state.currentPosition);
    state.currentRoundTracked = true;
  }

  state.assessmentSubmitted = true;
  state.stats = recordSelfCheck(state.currentPosition, result);
  renderAll();
}

function bindEvents() {
  refs.startButton.addEventListener("click", () => {
    startAutoplay();
  });

  refs.pauseButton.addEventListener("click", () => {
    pauseAutoplay();
  });

  refs.nextButton.addEventListener("click", () => {
    startRound({ track: true, immediateAudio: true });
  });

  refs.cardStartButton.addEventListener("click", () => {
    startAutoplay();
  });

  refs.cardPauseButton.addEventListener("click", () => {
    pauseAutoplay();
  });

  refs.cardNextButton.addEventListener("click", () => {
    startRound({ track: true, immediateAudio: true });
  });

  refs.revealButton.addEventListener("click", () => {
    revealCurrentAnswer();
  });

  refs.replayButton.addEventListener("click", () => {
    void prepareAudio()
      .then(() => {
        state.audioReady = true;
        return playCurrentSound({ force: true });
      })
      .catch(() => {
        state.audioReady = false;
        setSoundStatus("시작 버튼으로 오디오 준비");
      });
  });

  refs.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.mode =
        button.dataset.mode === "quiz"
          ? "quiz"
          : button.dataset.mode === "card"
            ? "card"
            : "study";
      applySettingsChange();
    });
  });

  refs.intervalSlider.addEventListener("input", (event) => {
    state.settings.intervalSeconds = Number(event.target.value);

    if (state.settings.revealSeconds > state.settings.intervalSeconds - 0.5) {
      state.settings.revealSeconds = Math.max(1, state.settings.intervalSeconds - 0.5);
    }

    applySettingsChange();
  });

  refs.revealSlider.addEventListener("input", (event) => {
    state.settings.revealSeconds = Number(event.target.value);
    applySettingsChange();
  });

  refs.soundToggle.addEventListener("change", (event) => {
    state.settings.soundEnabled = event.target.checked;
    persistSettings();
    renderAll();
  });

  refs.fretCountSelect.addEventListener("change", (event) => {
    const previousFretCount = state.settings.fretCount;
    state.settings.fretCount = Number(event.target.value) === 24 ? 24 : 22;

    if (state.settings.maxFret >= previousFretCount) {
      state.settings.maxFret = state.settings.fretCount;
    } else {
      state.settings.maxFret = Math.min(state.settings.maxFret, state.settings.fretCount);
    }

    state.settings.minFret = Math.min(state.settings.minFret, state.settings.fretCount);
    applySettingsChange();
  });

  refs.openStringToggle.addEventListener("change", (event) => {
    state.settings.includeOpenStrings = event.target.checked;
    applySettingsChange();
  });

  refs.minFretInput.addEventListener("change", (event) => {
    state.settings.minFret = Number(event.target.value);
    if (state.settings.minFret > state.settings.maxFret) {
      state.settings.maxFret = state.settings.minFret;
    }
    applySettingsChange();
  });

  refs.maxFretInput.addEventListener("change", (event) => {
    state.settings.maxFret = Number(event.target.value);
    if (state.settings.maxFret < state.settings.minFret) {
      state.settings.minFret = state.settings.maxFret;
    }
    applySettingsChange();
  });

  refs.stringFilterList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-string]");
    if (!button) {
      return;
    }

    toggleString(Number(button.dataset.string));
  });

  refs.noteFilterList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-note-index]");
    if (!button) {
      return;
    }

    toggleNote(Number(button.dataset.noteIndex));
  });

  document.querySelectorAll("[data-range-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      applyRangePreset(button.dataset.rangePreset);
    });
  });

  document.querySelectorAll("[data-string-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      applyStringPreset(button.dataset.stringPreset);
    });
  });

  document.querySelectorAll("[data-note-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      applyNotePreset(button.dataset.notePreset);
    });
  });

  refs.quizFeedback.addEventListener("click", (event) => {
    const button = event.target.closest("[data-assessment]");
    if (!button) {
      return;
    }

    handleSelfCheck(button.dataset.assessment);
  });

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (state.autoplay) {
        pauseAutoplay();
      } else {
        startAutoplay();
      }
    }

    if (event.code === "ArrowRight") {
      event.preventDefault();
      startRound({ track: true, immediateAudio: true });
    }

    if (event.code === "Enter") {
      event.preventDefault();
      revealCurrentAnswer();
    }

    if (event.code === "Escape" && state.settings.mode === "card") {
      event.preventDefault();
      state.settings.mode = "study";
      applySettingsChange({ preview: false });
    }

    if (event.key === "1") {
      handleSelfCheck("correct");
    }

    if (event.key === "2") {
      handleSelfCheck("fuzzy");
    }

    if (event.key === "3") {
      handleSelfCheck("wrong");
    }
  });
}

function initialize() {
  rebuildCandidates();
  bindEvents();
  renderAll();

  if (state.candidates.length > 0) {
    startRound({ track: false, immediateAudio: false });
  }
}

initialize();
