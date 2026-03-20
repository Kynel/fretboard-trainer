const SETTINGS_KEY = "fretboard-trainer.settings";
const STATS_KEY = "fretboard-trainer.stats";

export const DEFAULT_SETTINGS = {
  mode: "study",
  fretCount: 22,
  intervalSeconds: 3.5,
  revealSeconds: 2,
  soundEnabled: true,
  includeOpenStrings: true,
  selectedStrings: [6, 5, 4, 3, 2, 1],
  minFret: 0,
  maxFret: 22,
  selectedNotes: Array.from({ length: 12 }, (_, index) => index)
};

function safeRead(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage가 비활성화된 환경에서는 조용히 무시합니다.
  }
}

function uniqueNumberList(values, fallback) {
  const source = Array.isArray(values) ? values : fallback;
  return [...new Set(source.map((value) => Number(value)).filter(Number.isFinite))];
}

function normalizeSettings(rawSettings = {}) {
  const fretCount = rawSettings.fretCount === 24 ? 24 : 22;
  const selectedStrings = uniqueNumberList(rawSettings.selectedStrings, DEFAULT_SETTINGS.selectedStrings)
    .filter((value) => value >= 1 && value <= 6)
    .sort((left, right) => right - left);
  const selectedNotes = uniqueNumberList(rawSettings.selectedNotes, DEFAULT_SETTINGS.selectedNotes)
    .filter((value) => value >= 0 && value <= 11)
    .sort((left, right) => left - right);

  const minFret = Math.max(0, Math.min(Number(rawSettings.minFret ?? DEFAULT_SETTINGS.minFret), fretCount));
  const maxFret = Math.max(
    minFret,
    Math.min(Number(rawSettings.maxFret ?? fretCount), fretCount)
  );
  const intervalSeconds = Math.min(
    12,
    Math.max(1.5, Number(rawSettings.intervalSeconds ?? DEFAULT_SETTINGS.intervalSeconds))
  );
  const revealSeconds = Math.min(
    Math.max(1, intervalSeconds - 0.5),
    Math.max(1, Number(rawSettings.revealSeconds ?? DEFAULT_SETTINGS.revealSeconds))
  );

  return {
    mode:
      rawSettings.mode === "quiz"
        ? "quiz"
        : rawSettings.mode === "card"
          ? "card"
          : "study",
    fretCount,
    intervalSeconds,
    revealSeconds,
    soundEnabled: rawSettings.soundEnabled !== false,
    includeOpenStrings: rawSettings.includeOpenStrings !== false,
    selectedStrings: selectedStrings.length ? selectedStrings : [...DEFAULT_SETTINGS.selectedStrings],
    minFret,
    maxFret,
    selectedNotes: selectedNotes.length ? selectedNotes : [...DEFAULT_SETTINGS.selectedNotes]
  };
}

function createDayRecord() {
  return {
    rounds: 0,
    uniqueNotes: [],
    uniquePositions: [],
    selfChecks: {
      correct: 0,
      fuzzy: 0,
      wrong: 0
    },
    troubleNotes: {},
    troublePositions: {},
    lastPracticedAt: null
  };
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadStatsState() {
  const parsed = safeRead(STATS_KEY, { days: {} });
  return parsed && typeof parsed === "object" && parsed.days ? parsed : { days: {} };
}

function saveStatsState(stats) {
  safeWrite(STATS_KEY, stats);
}

function ensureDay(stats, dateKey = getDateKey()) {
  if (!stats.days[dateKey]) {
    stats.days[dateKey] = createDayRecord();
  }

  return stats.days[dateKey];
}

function incrementMap(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function topEntries(map, limit = 3) {
  return Object.entries(map)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function computeStreak(stats) {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (stats.days[getDateKey(cursor)]?.rounds > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function summarize(stats) {
  const today = ensureDay(stats);
  const dayRecords = Object.values(stats.days);
  const totalRounds = dayRecords.reduce((sum, day) => sum + day.rounds, 0);
  const totalChecks = dayRecords.reduce((sum, day) => {
    return sum + day.selfChecks.correct + day.selfChecks.fuzzy + day.selfChecks.wrong;
  }, 0);

  const mergedTroubleNotes = {};
  const mergedTroublePositions = {};

  dayRecords.forEach((day) => {
    Object.entries(day.troubleNotes).forEach(([key, count]) => {
      mergedTroubleNotes[key] = (mergedTroubleNotes[key] || 0) + count;
    });
    Object.entries(day.troublePositions).forEach(([key, count]) => {
      mergedTroublePositions[key] = (mergedTroublePositions[key] || 0) + count;
    });
  });

  return {
    today: {
      rounds: today.rounds,
      uniqueNotesCount: today.uniqueNotes.length,
      uniquePositionsCount: today.uniquePositions.length,
      checks: { ...today.selfChecks },
      accuracy:
        today.selfChecks.correct + today.selfChecks.fuzzy + today.selfChecks.wrong > 0
          ? today.selfChecks.correct /
            (today.selfChecks.correct + today.selfChecks.fuzzy + today.selfChecks.wrong)
          : null,
      hardestNotes: topEntries(today.troubleNotes),
      hardestPositions: topEntries(today.troublePositions)
    },
    overall: {
      activeDays: dayRecords.length,
      streak: computeStreak(stats),
      totalRounds,
      totalChecks,
      hardestNotes: topEntries(mergedTroubleNotes),
      hardestPositions: topEntries(mergedTroublePositions)
    }
  };
}

export function loadSettings() {
  return normalizeSettings(safeRead(SETTINGS_KEY, DEFAULT_SETTINGS));
}

export function saveSettings(settings) {
  safeWrite(SETTINGS_KEY, normalizeSettings(settings));
}

export function recordExposure(position) {
  const stats = loadStatsState();
  const today = ensureDay(stats);

  today.rounds += 1;
  today.lastPracticedAt = new Date().toISOString();

  if (!today.uniquePositions.includes(position.id)) {
    today.uniquePositions.push(position.id);
  }

  if (!today.uniqueNotes.includes(position.english)) {
    today.uniqueNotes.push(position.english);
  }

  saveStatsState(stats);
  return summarize(stats);
}

export function recordSelfCheck(position, result) {
  const stats = loadStatsState();
  const today = ensureDay(stats);

  if (!(result in today.selfChecks)) {
    return summarize(stats);
  }

  today.selfChecks[result] += 1;

  if (result === "fuzzy" || result === "wrong") {
    incrementMap(today.troubleNotes, position.english);
    incrementMap(today.troublePositions, position.id);
  }

  saveStatsState(stats);
  return summarize(stats);
}

export function getStatsSummary() {
  return summarize(loadStatsState());
}
