export const ENGLISH_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];

export const KOREAN_NOTES = [
  "도",
  "도#",
  "레",
  "레#",
  "미",
  "파",
  "파#",
  "솔",
  "솔#",
  "라",
  "라#",
  "시"
];

export const STANDARD_TUNING = [
  { string: 6, midi: 40, openEnglish: "E", openKorean: "미" },
  { string: 5, midi: 45, openEnglish: "A", openKorean: "라" },
  { string: 4, midi: 50, openEnglish: "D", openKorean: "레" },
  { string: 3, midi: 55, openEnglish: "G", openKorean: "솔" },
  { string: 2, midi: 59, openEnglish: "B", openKorean: "시" },
  { string: 1, midi: 64, openEnglish: "E", openKorean: "미" }
];

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function noteFromMidi(midi) {
  const index = ((midi % 12) + 12) % 12;

  return {
    index,
    english: ENGLISH_NOTES[index],
    korean: KOREAN_NOTES[index]
  };
}

export function createFretScale(maxFret) {
  const maxDistance = 1 - 1 / Math.pow(2, maxFret / 12);

  return Array.from({ length: maxFret + 1 }, (_, fret) => {
    if (fret === 0) {
      return 0;
    }

    const distance = 1 - 1 / Math.pow(2, fret / 12);
    return distance / maxDistance;
  });
}

export function getInlayFrets(maxFret) {
  return INLAY_FRETS.filter((fret) => fret <= maxFret);
}

export function buildFretboardPositions(maxFret) {
  return STANDARD_TUNING.flatMap((stringInfo) => {
    return Array.from({ length: maxFret + 1 }, (_, fret) => {
      const midi = stringInfo.midi + fret;
      const note = noteFromMidi(midi);

      return {
        id: `${stringInfo.string}-${fret}`,
        string: stringInfo.string,
        fret,
        midi,
        frequency: midiToFrequency(midi),
        noteIndex: note.index,
        english: note.english,
        korean: note.korean,
        openEnglish: stringInfo.openEnglish,
        openKorean: stringInfo.openKorean
      };
    });
  });
}

export function getStringInfo(stringNumber) {
  return STANDARD_TUNING.find((item) => item.string === stringNumber) || null;
}

export function formatPosition(position) {
  if (!position) {
    return "선택된 위치 없음";
  }

  return position.fret === 0
    ? `${position.string}번 줄 · 개방현`
    : `${position.string}번 줄 · ${position.fret}프렛`;
}

export function formatNoteLabel(noteIndex) {
  return `${ENGLISH_NOTES[noteIndex]} / ${KOREAN_NOTES[noteIndex]}`;
}
