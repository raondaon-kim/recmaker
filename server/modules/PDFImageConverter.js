const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const config = require('./config');

class PDFImageConverter {
    async convertToImages(pdfPath) {
        try {
            const tempImageDir = config.getDirPath('images');
            // 원본 이미지 디렉토리
            const originalImagesDir = config.getDirPath('original_images');
            
            // 필요한 디렉토리 생성
            await fs.mkdir(tempImageDir, { recursive: true });
            await fs.mkdir(originalImagesDir, { recursive: true });

            console.log('PDF를 이미지로 변환 시작...');
            console.log(`입력 파일: ${pdfPath}`);
            console.log(`출력 디렉토리: ${tempImageDir}`);

            // 운영체제 확인
            const platform = os.platform();
            
            if (platform === 'linux') {
                // Linux 환경용 PDF 변환 (pdf2pic 사용)
                return await this.convertWithPdf2pic(pdfPath, tempImageDir, originalImagesDir);
            } else {
                // 기존 pdf-poppler 라이브러리 사용
                try {
                    return await this.convertWithPdfPoppler(pdfPath, tempImageDir, originalImagesDir);
                } catch (error) {
                    console.error('pdf-poppler 변환 실패, pdf2pic로 대체:', error);
                    return await this.convertWithPdf2pic(pdfPath, tempImageDir, originalImagesDir);
                }
            }
        } catch (error) {
            console.error('PDF 이미지 변환 중 오류 발생:', error);
            throw error;
        }
    }

    async convertWithPdf2pic(pdfPath, tempImageDir, originalImagesDir) {
        try {
            const { fromPath } = require('pdf2pic');
            
            console.log('pdf2pic를 사용하여 PDF를 이미지로 변환 중...');
            
            const options = {
                density: 96,
                saveFilename: "slide",
                savePath: tempImageDir,
                format: "png",
                width: 800,  // 바로 원하는 크기로 설정
                height: 600
            };
            
            const storeAsImage = fromPath(pdfPath, options);
            
            // 페이지 수 확인
            const pageCount = await this.getPageCount(pdfPath);
            console.log(`PDF 페이지 수: ${pageCount}`);
            
            const imageResults = [];
            
            // 각 페이지를 이미지로 변환
            for (let i = 1; i <= pageCount; i++) {
                try {
                    const pageResult = await storeAsImage(i);
                    console.log(`페이지 ${i} 변환 완료: ${pageResult.path}`);
                    imageResults.push(pageResult);
                    
                    // 원본 이미지 보존
                    const fileName = path.basename(pageResult.path);
                    const originalPath = path.join(originalImagesDir, fileName);
                    await fs.copyFile(pageResult.path, originalPath);
                    console.log(`원본 이미지 저장: ${originalPath}`);
                } catch (err) {
                    console.error(`페이지 ${i} 변환 중 오류:`, err);
                }
            }
            
            // 이미지 파일 정렬 및 수집
            const files = await fs.readdir(tempImageDir);
            const imageFiles = files
                .filter(file => file.startsWith("slide") && file.endsWith('.png'))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)[0]);
                    const numB = parseInt(b.match(/\d+/)[0]);
                    return numA - numB;
                });
            
            console.log(`변환 완료! ${imageFiles.length}개의 이미지 생성됨`);
            
            return imageFiles.map(file => path.join(tempImageDir, file));
        } catch (error) {
            console.error('pdf2pic 변환 중 오류:', error);
            throw error;
        }
    }
    
    async getPageCount(pdfPath) {
        // PDF 페이지 수를 가져오는 함수
        try {
            // pdf-page-counter 사용
            const pdf = require('pdf-page-counter');
            const dataBuffer = await fs.readFile(pdfPath);
            const data = await pdf(dataBuffer);
            return data.numpages;
        } catch (error) {
            console.error('PDF 페이지 수 확인 중 오류:', error);
            // 페이지 수를 확인할 수 없는 경우 기본값으로 1 반환
            return 1;
        }
    }

    async convertWithPdfPoppler(pdfPath, tempImageDir, originalImagesDir) {
        // 기존 pdf-poppler 코드
        const pdf = require('pdf-poppler');
        
        const options = {
            format: 'png',
            out_dir: tempImageDir,
            out_prefix: 'slide',
            page: null,
            dpi: 96
        };

        console.log('pdf-poppler를 사용하여 PDF를 이미지로 변환 중...');
        await pdf.convert(pdfPath, options);

        const files = await fs.readdir(tempImageDir);
        const imageFiles = files
            .filter(file => file.startsWith(options.out_prefix) && file.endsWith('.png'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)[0]);
                const numB = parseInt(b.match(/\d+/)[0]);
                return numA - numB;
            });

        console.log(`변환 완료! ${imageFiles.length}개의 이미지 생성됨`);
        
        // 원본 이미지 보존
        for (const file of imageFiles) {
            try {
                const filePath = path.join(tempImageDir, file);
                const originalPath = path.join(originalImagesDir, file);
                await fs.copyFile(filePath, originalPath);
                console.log(`원본 이미지 저장: ${originalPath}`);
            } catch (err) {
                console.error(`이미지 복사 중 오류 (${file}):`, err);
            }
        }
        
        return imageFiles.map(file => path.join(tempImageDir, file));
    }
}

module.exports = PDFImageConverter;