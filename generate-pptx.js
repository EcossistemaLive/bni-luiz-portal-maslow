/**
 * Gera um arquivo PPTX nativo a partir da apresentação Reveal.js.
 * Usa Puppeteer para capturar cada slide como PNG e pptxgenjs para montar o PPTX.
 */
const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const HTML_FILE = path.resolve(__dirname, 'index-pdf.html');
const OUTPUT = path.resolve(__dirname, 'apresentacao-bni-mentoria.pptx');
const TOTAL_SLIDES = 10;
const TIMES = ['0:30', '1:15', '2:15', '3:15', '4:15', '5:00', '5:45', '6:45', '7:30', '8:00'];
const TEMP_DIR = path.resolve(__dirname, '_tmp_slides');

async function main() {
    // 1. Cria HTML temporário com labels de tempo + esconde timer dinâmico
    let html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
    html = html.replace('id="timer-badge"', 'id="timer-badge" style="display:none !important;"');
    let idx = 0;
    html = html.replace(/<section([^>]*)>/g, (match) => {
        if (idx < TIMES.length) {
            const label = `<div style="position:absolute; bottom:10px; left:14px; font-family:'Inter',sans-serif; font-size:0.6rem; color:rgba(255,255,255,0.25); letter-spacing:1px; z-index:99;">${idx + 1}/10 · ⏱ ${TIMES[idx]}</div>`;
            idx++;
            return match + '\n' + label;
        }
        return match;
    });
    fs.writeFileSync(HTML_FILE, html, 'utf8');

    // 2. Cria pasta temporária para as imagens
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

    // 3. Captura cada slide com Puppeteer
    console.log('Abrindo navegador...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('file://' + HTML_FILE.replace(/\\/g, '/'), { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    for (let i = 0; i < TOTAL_SLIDES; i++) {
        const file = path.join(TEMP_DIR, `slide_${String(i).padStart(2, '0')}.png`);
        await page.screenshot({ path: file, type: 'png' });
        console.log(`📸 Slide ${i + 1}/${TOTAL_SLIDES} capturado`);

        // Avança para o próximo slide
        if (i < TOTAL_SLIDES - 1) {
            // Pressiona seta direita várias vezes para avançar fragmentos
            for (let f = 0; f < 15; f++) {
                await page.keyboard.press('ArrowRight');
                await new Promise(r => setTimeout(r, 100));
            }
            await new Promise(r => setTimeout(r, 500));
        }
    }

    await browser.close();
    console.log('✅ Todas as capturas concluídas.');

    // 4. Monta PPTX
    console.log('Montando PPTX...');
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 }); // 16:9
    pptx.layout = 'WIDE';

    for (let i = 0; i < TOTAL_SLIDES; i++) {
        const imgPath = path.join(TEMP_DIR, `slide_${String(i).padStart(2, '0')}.png`);
        const imgData = fs.readFileSync(imgPath);
        const base64 = imgData.toString('base64');

        const slide = pptx.addSlide();
        slide.addImage({
            data: 'image/png;base64,' + base64,
            x: 0, y: 0,
            w: '100%', h: '100%',
        });
    }

    await pptx.writeFile({ fileName: OUTPUT });
    console.log(`✅ PPTX gerado: ${OUTPUT}`);

    // 5. Limpa
    for (const f of fs.readdirSync(TEMP_DIR)) fs.unlinkSync(path.join(TEMP_DIR, f));
    fs.rmdirSync(TEMP_DIR);
    fs.unlinkSync(HTML_FILE);
    console.log('🧹 Arquivos temporários removidos.');
}

main().catch(err => { console.error('❌ Erro:', err); process.exit(1); });
