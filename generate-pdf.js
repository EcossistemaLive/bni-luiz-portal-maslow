/**
 * Script para gerar PDF com labels de tempo estáticos.
 * Cria uma cópia temporária do index.html com os tempos inseridos,
 * serve localmente, exporta com Decktape e limpa.
 */
const fs = require('fs');
const { execSync } = require('child_process');

// Tempos-alvo para cada slide (acumulados)
const times = ['0:30', '1:15', '2:15', '3:15', '4:15', '5:00', '5:45', '6:45', '7:30', '8:00'];

let html = fs.readFileSync('index.html', 'utf8');

// Esconde o timer dinâmico no PDF
html = html.replace('id="timer-badge"', 'id="timer-badge" style="display:none !important;"');

// Adiciona label de tempo estático em cada <section>
let slideIdx = 0;
html = html.replace(/<section([^>]*)>/g, (match, attrs) => {
    if (slideIdx < times.length) {
        const time = times[slideIdx];
        const num = slideIdx + 1;
        slideIdx++;
        const label = `<div style="position:absolute; bottom:10px; left:14px; font-family:'Inter',sans-serif; font-size:0.6rem; color:rgba(255,255,255,0.25); letter-spacing:1px; z-index:99;">${num}/10 · ⏱ ${time}</div>`;
        return match + '\n' + label;
    }
    return match;
});

// Salva versão temporária
fs.writeFileSync('index-pdf.html', html, 'utf8');

console.log('index-pdf.html criado com labels de tempo.');
console.log('Gerando PDF com Decktape...');

try {
    execSync(
        'npx -y decktape reveal "file://' + process.cwd().replace(/\\/g, '/') + '/index-pdf.html" apresentacao-bni-mentoria.pdf --size 1920x1080',
        { stdio: 'inherit' }
    );
    console.log('PDF gerado: apresentacao-bni-mentoria.pdf');

    console.log('Gerando capturas PNG para o PPTX...');
    if (!fs.existsSync('_tmp_slides')) fs.mkdirSync('_tmp_slides');
    execSync(
        'npx -y decktape reveal "file://' + process.cwd().replace(/\\/g, '/') + '/index-pdf.html" dummy.pdf --size 1920x1080 --screenshots --screenshots-directory _tmp_slides --screenshots-format png',
        { stdio: 'inherit' }
    );

    console.log('Montando PPTX...');
    execSync('node assemble-pptx.js', { stdio: 'inherit' });

    // Limpeza
    fs.rmSync('_tmp_slides', { recursive: true, force: true });
    if (fs.existsSync('dummy.pdf')) fs.unlinkSync('dummy.pdf');

} finally {
    // Limpa arquivo temporário HTML
    if (fs.existsSync('index-pdf.html')) fs.unlinkSync('index-pdf.html');
    console.log('Arquivos temporários removidos. Tudo pronto!');
}
