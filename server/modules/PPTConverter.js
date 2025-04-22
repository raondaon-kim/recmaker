const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class PPTConverter {
    constructor() {
        this.platform = os.platform();
    }

    async convertToPDF(inputPath, outputPath) {
        try {
            // 입력 파일 존재 확인
            await fs.access(inputPath);
        } catch (error) {
            throw new Error(`입력 파일을 찾을 수 없습니다: ${inputPath}`);
        }

        // 출력 디렉토리 생성
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        if (this.platform === 'win32') {
            return await this.convertWithVBS(inputPath, outputPath);
        } else if (this.platform === 'linux') {
            return await this.convertWithLibreOffice(inputPath, outputPath);
        } else {
            throw new Error('현재 Windows 환경만 지원됩니다.');
        }
    }
    async convertWithLibreOffice(inputPath, outputPath) {
        console.log('LibreOffice를 사용한 변환 정보:');
        console.log(`입력 경로: ${inputPath}`);
        console.log(`출력 경로: ${outputPath}`);
        
        return new Promise((resolve, reject) => {
            // LibreOffice 명령 실행
            const libreoffice = spawn('libreoffice', [
                '--headless', 
                '--convert-to', 'pdf', 
                '--outdir', path.dirname(outputPath),
                inputPath
            ]);
            
            let errorOutput = '';
            
            libreoffice.stdout.on('data', (data) => {
                console.log(`LibreOffice 출력: ${data}`);
            });
            
            libreoffice.stderr.on('data', (data) => {
                console.error(`LibreOffice 오류: ${data}`);
                errorOutput += data.toString();
            });
            
            libreoffice.on('close', async (code) => {
                if (code === 0) {
                    // LibreOffice는 원본 파일명을 유지하므로 이름 변경이 필요할 수 있음
                    const originalName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
                    const tempPdfPath = path.join(path.dirname(outputPath), originalName);
                    
                    try {
                        // 파일 이름이 다르면 이동
                        if (tempPdfPath !== outputPath) {
                            await fs.rename(tempPdfPath, outputPath);
                        }
                        
                        console.log('PDF 변환 성공!');
                        resolve(outputPath);
                    } catch (err) {
                        reject(new Error(`PDF 파일 이름 변경 실패: ${err.message}`));
                    }
                } else {
                    reject(new Error(`LibreOffice 변환 실패: ${errorOutput || `종료 코드: ${code}`}`));
                }
            });
        });
    }
    async convertWithVBS(inputPath, outputPath) {
        // 절대 경로로 변환 및 백슬래시 이스케이프
        const absoluteInputPath = path.resolve(inputPath).replace(/\\/g, "\\\\");
        const absoluteOutputPath = path.resolve(outputPath).replace(/\\/g, "\\\\");
        
        console.log('VBS를 사용한 변환 정보:');
        console.log(`입력 경로: ${absoluteInputPath}`);
        console.log(`출력 경로: ${absoluteOutputPath}`);
        
        try {
            // PowerPoint가 설치되어 있는지 확인하는 VBS 스크립트
            const checkPPTScript = `
    On Error Resume Next
    Set powerPoint = CreateObject("PowerPoint.Application")
    If Err.Number <> 0 Then
        WScript.Echo "ERROR: PowerPoint를 찾을 수 없습니다. 오류 코드: " & Err.Number
        WScript.Quit 1
    End If
    powerPoint.Quit
    WScript.Echo "SUCCESS: PowerPoint가 설치되어 있습니다."
    WScript.Quit 0
            `;
            
           // 이 부분도 애플리케이션 temp 디렉토리를 사용하도록 수정
            const appTempDir = path.join(process.cwd(), 'temp');
            await fs.mkdir(appTempDir, { recursive: true });
            const checkScriptPath = path.join(appTempDir, `check_ppt_${Date.now()}.vbs`);
            await fs.writeFile(checkScriptPath, checkPPTScript, 'utf8');
            
            // 확인 스크립트 실행
            const checkResult = await new Promise((resolve, reject) => {
                const proc = spawn('cscript', ['/nologo', checkScriptPath]);
                let output = '';
                
                proc.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                proc.on('close', (code) => {
                    if (code === 0 && output.includes("SUCCESS")) {
                        resolve(true);
                    } else {
                        console.error("PowerPoint 확인 오류:", output);
                        resolve(false);
                    }
                });
            });
            
            // 임시 파일 삭제
            await fs.unlink(checkScriptPath);
            
            if (!checkResult) {
                throw new Error("PowerPoint가 제대로 설치되어 있지 않거나 COM 인터페이스에 접근할 수 없습니다.");
            }
        } catch (error) {
            console.error("PowerPoint 설치 확인 중 오류:", error);
            throw error;
        }
        
        // 출력 디렉토리가 존재하는지 확인하고 필요하면 생성
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        // VBS 스크립트 작성
        const vbsScript = `
On Error Resume Next

' PowerPoint 객체 생성
Set powerPoint = CreateObject("PowerPoint.Application")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: PowerPoint를 시작할 수 없습니다. 오류 코드: " & Err.Number
    WScript.Quit 1
End If

WScript.Echo "STARTPROCESS"

' PowerPoint 프레젠테이션 열기
powerPoint.Visible = True
WScript.Echo "OPENFILE"
Set presentation = powerPoint.Presentations.Open("${absoluteInputPath}")
If Err.Number <> 0 Then
    WScript.Echo "ERROR: 파일을 열 수 없습니다. 오류 코드: " & Err.Number & ", 설명: " & Err.Description
    powerPoint.Quit
    WScript.Quit 1
End If

' PDF로 저장
WScript.Echo "SAVEPDF"
presentation.SaveAs "${absoluteOutputPath}", 32 ' 32 = ppSaveAsPDF
If Err.Number <> 0 Then
    WScript.Echo "ERROR: PDF로 저장할 수 없습니다. 오류 코드: " & Err.Number & ", 설명: " & Err.Description
    presentation.Close
    powerPoint.Quit
    WScript.Quit 1
End If

' 리소스 정리
WScript.Echo "CLEANUP"
presentation.Close
powerPoint.Quit
Set presentation = Nothing
Set powerPoint = Nothing

WScript.Echo "SUCCESS"
WScript.Quit 0
`;

        const appTempDir = path.join(process.cwd(), 'temp');
        await fs.mkdir(appTempDir, { recursive: true });
        const scriptPath = path.join(appTempDir, `convert_ppt_${Date.now()}.vbs`);
        await fs.writeFile(scriptPath, vbsScript, 'utf8');

        return new Promise((resolve, reject) => {
            console.log('VBS 스크립트를 사용한 PowerPoint 변환 시작...');
            console.log(`스크립트 파일: ${scriptPath}`);
            
            // cscript로 VBS 스크립트 실행
            const cscript = spawn('cscript', ['/nologo', scriptPath]);

            let processSteps = {
                STARTPROCESS: false,
                OPENFILE: false,
                SAVEPDF: false,
                CLEANUP: false,
                SUCCESS: false
            };
            
            let errorOutput = '';

            cscript.stdout.on('data', (data) => {
                const message = data.toString().trim();
                console.log(`진행 상황: ${message}`);
                
                // 각 단계 체크
                if (processSteps.hasOwnProperty(message)) {
                    processSteps[message] = true;
                }
                
                // 오류 메시지 캡처
                if (message.startsWith('ERROR:')) {
                    errorOutput += message + '\n';
                }
            });

            cscript.stderr.on('data', (data) => {
                const message = data.toString().trim();
                console.error(`오류: ${message}`);
                errorOutput += message + '\n';
            });

            cscript.on('close', async (code) => {
                try {
                    // 임시 스크립트 파일 삭제
                    await fs.unlink(scriptPath);
                } catch (err) {
                    console.warn('임시 파일 삭제 실패:', err);
                }

                // 파일 존재 여부 확인
                try {
                    await fs.access(outputPath);
                    const stats = await fs.stat(outputPath);
                    
                    if (code === 0 && stats.size > 0 && processSteps.SUCCESS) {
                        console.log('PDF 변환 성공!');
                        resolve(outputPath);
                    } else {
                        const errorMsg = errorOutput || '처리 과정이 완료되지 않았습니다.';
                        reject(new Error(`PDF 변환 실패: ${errorMsg}`));
                    }
                } catch (error) {
                    // 출력 디렉토리가 존재하는지 확인
                    try {
                        await fs.access(path.dirname(outputPath));
                        console.log('출력 디렉토리는 존재합니다.');
                    } catch (dirError) {
                        console.error('출력 디렉토리가 존재하지 않습니다:', path.dirname(outputPath));
                    }
                    
                    reject(new Error(`PDF 파일 생성 실패: ${errorOutput || error.message}`));
                }
            });
        });
    }
}

module.exports = PPTConverter;