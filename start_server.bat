@echo off
REM 배치 파일이 있는 폴더를 기준으로 경로를 설정합니다.
cd /d "%~dp0"

REM portable Node.js와 ffmpeg가 각각 "nodejs"와 "ffmpeg" 폴더에 있다고 가정합니다.
set PATH=%~dp0\nodejs;%~dp0\ffmpeg\bin;%PATH%

REM 버전 확인 (선택 사항)
where node
where ffmpeg
REM 서버를 백그라운드로 실행 (새 콘솔 창에서 실행)
start "Node Server" cmd /c "node server\server.js"

REM 서버 실행 후 약간의 딜레이를 주고 웹 브라우저에서 페이지 열기
timeout /t 2 /nobreak >nul
start http://localhost:8898

REM 배치 파일이 바로 종료되지 않도록 일시 정지 (원한다면)
pause
