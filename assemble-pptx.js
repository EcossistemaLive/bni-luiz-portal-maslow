/**
 * Monta PPTX a partir dos PNGs capturados pelo Decktape.
 */
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const SLIDES_DIR = path.resolve(__dirname, '_tmp_slides');
const OUTPUT = path.resolve(__dirname, 'apresentacao-bni-mentoria.pptx');

async function main() {
    const files = fs.readdirSync(SLIDES_DIR)
        .filter(f => f.endsWith('.png'))
        .sort();

    console.log(`Encontrados ${files.length} slides.`);

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';

    for (const file of files) {
        const imgPath = path.join(SLIDES_DIR, file);
        const imgData = fs.readFileSync(imgPath);
        const base64 = imgData.toString('base64');

        const slide = pptx.addSlide();
        slide.addImage({
            data: 'image/png;base64,' + base64,
            x: 0, y: 0,
            w: '100%', h: '100%',
        });
        console.log(`  ✅ ${file}`);
    }

    await pptx.writeFile({ fileName: OUTPUT });
    console.log(`\n🎉 PPTX gerado: ${OUTPUT}`);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
