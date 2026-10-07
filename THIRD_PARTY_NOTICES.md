# Third-party notices — audio

이 문서는 `vendor/audio/0270_FluidR3_GM_sf2_file.js`에 대한 출처와 고지를 기록합니다. 확인일: 2026-10-07. 앱 자체 소스 코드에 대한 라이선스 부여는 포함하지 않습니다.

## 1. 확인된 배포 출처

- 배포 프로젝트: [surikov/webaudiofontdata](https://github.com/surikov/webaudiofontdata), 유지관리자 `surikov`.
- 프리셋: **Electric Guitar (clean)**, 상위 배포처 표기 MIDI 번호 `27`(0부터 시작).
- [프리셋 안내 페이지](https://surikov.github.io/webaudiofontdata/sound/0270_FluidR3_GM_sf2_file.html).
- [검증한 원본 JavaScript](https://github.com/surikov/webaudiofontdata/blob/a88ed5a77adf6901e18326ab06bc51449d2f09e9/sound/0270_FluidR3_GM_sf2_file.js).
- 원본 파일 커밋: [`a88ed5a77adf6901e18326ab06bc51449d2f09e9`](https://github.com/surikov/webaudiofontdata/commit/a88ed5a77adf6901e18326ab06bc51449d2f09e9), 2017-08-22, 메시지 `Fluid`.
- 전역 변수: `_tone_0270_FluidR3_GM_sf2_file`; `zones`에 샘플과 재생 파라미터를 포함합니다.

저장소에는 [최초 커밋 `34b5d87315038363bf89af7de7e0d6587f3d27c8`](https://github.com/Kynel/fretboard-trainer/commit/34b5d87315038363bf89af7de7e0d6587f3d27c8)(2026-03-20, KST)에 오디오 파일과 `vendor/audio/NOTICE.md`가 함께 추가되었습니다. 당시 고지에도 위 WebAudioFont 배포 페이지와 프리셋 페이지가 명시되어 있습니다. `progress.md`의 2026-03-19는 작업 기록 날짜이며 Git 도입 커밋 날짜와 구분합니다.

검증 기준 앱 커밋은 `19823f00e8d6aa32442d55e1e6cb6241a93bcf18`입니다. 이 시점까지 오디오 파일 변경 이력은 없으며, 상위 파일과 `cmp`로 비교한 결과 **바이트 단위로 동일**합니다. 이 문서 추가 작업에서도 오디오 파일은 변경하지 않았습니다.

| 검증 항목 | 로컬 파일과 상위 파일의 공통 값 |
| --- | --- |
| 크기 | 256,816 bytes |
| Git blob SHA-1 | `edfa7d2de75655eac3351602daffa394d58c97be` |
| SHA-256 | `4c3b72c9b51e1720a125adb264905a60e667c4832758cb39162da88f5f452c36` |

## 2. 저작자와 함께 보존한 라이선스

### WebAudioFont 데이터 배포본

상위 저장소의 [동일 커밋 LICENSE](https://github.com/surikov/webaudiofontdata/blob/a88ed5a77adf6901e18326ab06bc51449d2f09e9/LICENSE)는 MIT License이며, 저작권 표기는 **Copyright (c) 2017 Srgy Surkv**입니다.

전체 원문: [vendor/audio/licenses/WebAudioFontData-LICENSE.txt](vendor/audio/licenses/WebAudioFontData-LICENSE.txt).

### FluidR3 계열 SoundFont

상위 배포처의 [README](https://github.com/surikov/webaudiofontdata/blob/23ca907d4370a04fd89ca483a92915e4d6159ab9/README.md)는 FluidR3 라이선스 자료로 MuseScore의 `FluidR3Mono_License.md`를 연결합니다. [확인한 문서의 고정 버전](https://github.com/musescore/MuseScore/blob/25f0d24530ad7e10243b4671519c9168fc83a545/share/sound/FluidR3Mono_License.md)에는 원본 FluidR3의 README/COPYING과 MIT 배포 선언이 포함되어 있습니다.

원본 FluidR3 저작권 표기는 **Copyright (c) 2000-2002, 2008 Frank Wen <getfrank@gmail.com>**입니다. `pianobooster/fluid-soundfont`가 보존한 원본 [COPYING](https://github.com/pianobooster/fluid-soundfont/blob/24c5c8a82e2f2cec2497710c6a72e5ccfeca40cd/COPYING)과 [README](https://github.com/pianobooster/fluid-soundfont/blob/24c5c8a82e2f2cec2497710c6a72e5ccfeca40cd/README)에서도 같은 MIT 허가와 저작자 표기를 확인했습니다.

원문의 저작자·기여자 고지와 허가 조건을 보존하기 위해 다음 문서를 함께 제공합니다.

- [FluidR3-COPYING.txt](vendor/audio/licenses/FluidR3-COPYING.txt): 원본 FluidR3의 저작권·MIT 허가·면책 전문.
- [FluidR3-README.txt](vendor/audio/licenses/FluidR3-README.txt): Frank Wen의 배포 선언과 원문 기여자 목록. 두 문서는 위 `pianobooster/fluid-soundfont` 커밋에서 복사했습니다.
- [FluidR3Mono_License.md](vendor/audio/licenses/FluidR3Mono_License.md): WebAudioFont 배포처가 연결한 MuseScore 고지 전문. 위 고정 버전에서 복사했으며, 해당 문서의 Mono 변환·MS_General 관련 추가 저작자 고지도 그대로 보존했습니다. 원문에서 `©`를 표현하는 단일 바이트 인코딩을 UTF-8로 변환했으며 텍스트 내용은 동일합니다.

마지막 문서의 보존은 이 기타 프리셋이 문서에 등장하는 모든 파생 SoundFont나 기여자의 작업을 포함한다는 단정이 아닙니다. 문서에 나타나는 원본 FluidR3, Mono 변환, MS_General 각 항목의 범위를 구분해서 읽어야 합니다.

## 3. 확인 범위와 남아 있는 한계

- 직접 확인된 배포 출처는 WebAudioFont이며, 파일명만으로 판단한 것이 아닙니다. 기존 도입 고지와 파일 전체의 일치가 근거입니다. 당시 사용한 정확한 다운로드 명령·URL이나 전송 경로는 Git 이력에 남아 있지 않습니다.
- 파일 자체에는 별도 저작자·라이선스 헤더나 원본 SF2 체크섬이 없습니다. 이 문서는 상위 배포처의 MIT LICENSE와 그 배포처가 안내한 SoundFont 고지를 근거로 삼습니다.
- 같은 상위 커밋의 [`sf2/_FluidPitch.bat`](https://github.com/surikov/webaudiofontdata/blob/a88ed5a77adf6901e18326ab06bc51449d2f09e9/sf2/_FluidPitch.bat)는 `FluidR3Mono_GM2-313.SF2`와 OGG 변환을 가리킵니다. 그러나 이 프리셋을 그 명령으로 생성했다는 빌드 기록은 없으므로, 이를 정확한 원본 SF2 버전이나 변환 과정의 증명으로 사용하지 않습니다.
- MuseScore의 연결 문서는 이후 MS_General 관련 내용까지 포함하게 된 문서입니다. 따라서 문서의 현재 제목을 이 프리셋의 원본 이름으로 간주하지 않으며, 특정 Mono/MS_General 파생본과의 샘플 단위 동일성도 주장하지 않습니다.
- [`gleitz/midi-js-soundfonts` README](https://github.com/gleitz/midi-js-soundfonts/blob/044fab8e1456bfafc5776e86dfd6bb8697149aef/README.md)는 해당 프로젝트의 Fluid Soundfont에 CC BY 3.0 링크를 제시합니다. 이 앱의 파일이 그 배포본에서 왔다는 증거는 확인되지 않았으므로, 그 표기를 이 파일에 적용하거나 MIT와의 이중 라이선스로 선언하지 않습니다.
- `pianobooster/fluid-soundfont`는 원본 FluidR3 고지의 보존·대조 출처입니다. 이 JavaScript 파일의 직접 다운로드 출처 또는 생성에 사용된 SF2 배포본으로 확인된 것은 아닙니다.

오디오 파일을 재배포할 때 이 고지와 `vendor/audio/licenses/`의 원문을 함께 보존하세요. 출처가 다른 샘플로 교체하면 해당 배포본의 근거와 고지를 다시 확인해야 합니다.
