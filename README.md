# Fretboard Trainer

기타 지판의 위치, 영어 음이름(C, C# 등), 한글 음이름(도, 도# 등)과 소리를 함께 익히는 웹 앱입니다. 표준 튜닝 6현 기타의 22/24프렛을 지원하며, 연습할 줄·프렛·음과 반복 간격을 설정할 수 있습니다.

**배포:** [fretboard-trainer-phi.vercel.app](https://fretboard-trainer-phi.vercel.app)

## 학습 모드

| 모드 | 동작 |
| --- | --- |
| `study` · 학습 | 지판 위치와 음이름을 바로 보여 주고 소리를 재생합니다. |
| `quiz` · 퀴즈 | 음이름을 숨긴 뒤 설정한 시간에 정답을 공개하고, 스스로 맞음·헷갈림·틀림을 기록합니다. |
| `card` · 카드 | 작은 학습 화면에서 위치를 보고 떠올린 뒤 1초 후 음이름을 확인합니다. 같은 음의 다른 위치 표시도 선택할 수 있습니다. |

자동 재생·일시정지·다음 음·다시 듣기를 지원합니다. 설정과 학습 기록은 현재 브라우저의 `localStorage`에 저장됩니다.

## 로컬 실행

Node.js와 npm이 설치된 환경에서 실행합니다(Node.js 24에서 확인).

```sh
git clone https://github.com/Kynel/fretboard-trainer.git
cd fretboard-trainer
npm start
```

[http://localhost:4173](http://localhost:4173)에 접속합니다. `npm run dev`도 같은 서버를 실행하며, 환경 변수 `PORT`로 포트를 바꿀 수 있습니다. npm 의존성과 빌드 단계가 없어 `npm install`은 필요하지 않습니다.

소리를 사용하려면 브라우저에서 시작/자동 재생 버튼을 눌러 오디오를 활성화하세요. 아이콘은 unpkg의 Lucide CDN에서 불러오므로 아이콘 로딩에는 인터넷 연결이 필요합니다.

## 오디오 출처와 라이선스

`vendor/audio/0270_FluidR3_GM_sf2_file.js`는 [surikov/webaudiofontdata](https://github.com/surikov/webaudiofontdata)의 **Electric Guitar (clean)** 프리셋과 바이트 단위로 동일합니다. 해당 배포본의 MIT 고지와 배포처가 안내한 FluidR3 계열 저작자·라이선스 자료를 함께 보존했습니다.

커밋·SHA-256 검증 근거, 라이선스 원문, 확인되지 않은 범위는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 정리되어 있습니다. 이 제3자 고지는 앱 자체 소스 코드의 라이선스를 지정하지 않습니다.
