import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, 'screenshots');
const outDir = join(__dirname, 'output');
mkdirSync(outDir, { recursive: true });

const width = 1080;
const height = 1920;
const fps = 30;
const font = 'C\\:/Windows/Fonts/arial.ttf';
const output = join(outDir, 'tun-job-promo-site-screenshots.mp4');

const scenes = [
  {
    file: '01-home.png',
    duration: 5,
    accent: '0x2ea8ff',
    title: 'Tun Job',
    subtitle: 'La plateforme emploi pour recruter et trouver les bonnes opportunites en Tunisie',
  },
  {
    file: '02-jobs.png',
    duration: 6,
    accent: '0x65d6ff',
    title: 'Trouvez votre prochaine opportunite',
    subtitle: 'Offres, entreprises, localisation et candidature dans une experience claire',
  },
  {
    file: '03-training.png',
    duration: 6,
    accent: '0x39d98a',
    title: 'Developpez vos competences',
    subtitle: 'Centres de formation, programmes et parcours pour avancer plus vite',
  },
  {
    file: '04-institutions.png',
    duration: 6,
    accent: '0xc4a7ff',
    title: 'Explorez les etablissements',
    subtitle: 'Un annuaire utile pour choisir les bons partenaires de formation',
  },
  {
    file: '05-login.png',
    duration: 5,
    accent: '0xffb36b',
    title: 'Un espace pour chaque profil',
    subtitle: 'Candidats, recruteurs, centres et etablissements gerent leurs actions simplement',
  },
  {
    file: '06-register.png',
    duration: 7,
    accent: '0x2ea8ff',
    title: 'Rejoignez Tun Job maintenant',
    subtitle: 'Creez votre compte gratuitement sur tun-job-board.com',
  },
];

for (const scene of scenes) {
  const filePath = join(screenshotsDir, scene.file);
  if (!existsSync(filePath)) {
    throw new Error(`Missing screenshot: ${filePath}`);
  }
}

function esc(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,');
}

function text({ text, y, size, color = 'white', x = '(w-text_w)/2' }) {
  return `drawtext=fontfile='${font}':text='${esc(text)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}:line_spacing=12`;
}

function sceneFilter(scene, index) {
  const filters = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    `setsar=1`,
    `fps=${fps}`,
    `eq=brightness=-0.03:saturation=1.06`,
    'drawbox=x=0:y=0:w=iw:h=ih:color=black@0.20:t=fill',
    `drawbox=x=56:y=84:w=968:h=300:color=0x061426@0.82:t=fill`,
    `drawbox=x=56:y=84:w=10:h=300:color=${scene.accent}@1:t=fill`,
    text({ text: scene.title, y: 132, size: 64, x: '96' }),
    text({ text: scene.subtitle, y: 230, size: 34, x: '96' }),
    `drawbox=x=86:y=1632:w=908:h=170:color=0x061426@0.82:t=fill`,
    `drawbox=x=118:y=1662:w=844:h=2:color=${scene.accent}@0.95:t=fill`,
    text({ text: 'tun-job-board.com', y: 1700, size: 48 }),
    text({ text: 'Emploi - Recrutement - Formation', y: 1764, size: 30 }),
    'format=yuv420p',
    `setpts=PTS-STARTPTS[v${index}]`,
  ].join(',');

  return `[${index}:v]${filters}`;
}

const filterComplex = [
  ...scenes.map(sceneFilter),
  `${scenes.map((_, index) => `[v${index}]`).join('')}concat=n=${scenes.length}:v=1:a=0[v]`,
].join(';');

const args = [
  '-y',
  ...scenes.flatMap((scene) => ['-loop', '1', '-t', String(scene.duration), '-i', join(screenshotsDir, scene.file)]),
  '-f',
  'lavfi',
  '-i',
  `sine=frequency=220:sample_rate=44100:duration=${scenes.reduce((sum, scene) => sum + scene.duration, 0)}`,
  '-filter_complex',
  filterComplex,
  '-map',
  '[v]',
  '-map',
  `${scenes.length}:a`,
  '-af',
  'volume=0.03,afade=t=in:st=0:d=1,afade=t=out:st=33.5:d=1.5',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '20',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  '-movflags',
  '+faststart',
  output,
];

writeFileSync(
  join(outDir, 'tun-job-promo-site-screenshots-script.txt'),
  scenes.map((scene) => `${scene.file}: ${scene.title} - ${scene.subtitle}`).join('\n')
);

execFileSync(ffmpegPath, args, { stdio: 'inherit' });
console.log(`Video generated: ${output}`);
