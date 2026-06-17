import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'output');
mkdirSync(outDir, { recursive: true });

const output = join(outDir, 'tun-job-promo-vertical.mp4');
const width = 1080;
const height = 1920;
const duration = 35;
const font = 'C\\:/Windows/Fonts/arial.ttf';

const scenes = [
  {
    start: 0,
    end: 4,
    bg: '0x071529',
    title: 'Vous cherchez un emploi en Tunisie ?',
    subtitle: 'Tun Job vous rapproche des bonnes opportunités',
    accent: '0x2ea8ff',
  },
  {
    start: 4,
    end: 9,
    bg: '0x0b2a4a',
    title: 'Des offres claires',
    subtitle: 'Entreprises, contrats, localisation et candidatures en un seul espace',
    accent: '0x65d6ff',
  },
  {
    start: 9,
    end: 14,
    bg: '0x0f3d36',
    title: 'Créez votre profil candidat',
    subtitle: 'CV, compétences, expériences et préférences professionnelles',
    accent: '0x39d98a',
  },
  {
    start: 14,
    end: 20,
    bg: '0x12305f',
    title: 'Postulez en quelques clics',
    subtitle: 'Suivez vos candidatures et recevez les notifications importantes',
    accent: '0x8ab4ff',
  },
  {
    start: 20,
    end: 26,
    bg: '0x25154a',
    title: 'Explorez les annuaires',
    subtitle: 'Sociétés, centres de formation et établissements privés',
    accent: '0xc4a7ff',
  },
  {
    start: 26,
    end: 31,
    bg: '0x3b1d13',
    title: 'Recruteurs et candidats',
    subtitle: 'Un espace professionnel pour publier, gérer et trouver les talents',
    accent: '0xffb36b',
  },
  {
    start: 31,
    end: 35,
    bg: '0x071529',
    title: 'Rejoignez Tun Job',
    subtitle: 'Emploi • Recrutement • Formation',
    accent: '0x2ea8ff',
    url: 'tun-job-board.com',
  },
];

function esc(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,');
}

function between(scene) {
  return `between(t,${scene.start},${scene.end})`;
}

function drawText({ text, y, size, color = 'white', scene, weight = 'normal' }) {
  const extra = weight === 'bold' ? ':borderw=0' : '';
  return `drawtext=fontfile='${font}':text='${esc(text)}':fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=${y}:enable='${between(scene)}'${extra}`;
}

function sceneLayer(scene, index) {
  const filters = [];
  filters.push(`drawbox=x=0:y=0:w=${width}:h=${height}:color=${scene.bg}@1:t=fill:enable='${between(scene)}'`);
  filters.push(`drawbox=x=86:y=130:w=908:h=8:color=${scene.accent}@0.95:t=fill:enable='${between(scene)}'`);
  filters.push(`drawbox=x=86:y=1540:w=908:h=220:color=white@0.08:t=fill:enable='${between(scene)}'`);
  filters.push(`drawbox=x=118:y=1582:w=844:h=2:color=white@0.18:t=fill:enable='${between(scene)}'`);
  filters.push(`drawbox=x=${120 + index * 8}:y=${420 + index * 8}:w=840:h=560:color=white@0.06:t=fill:enable='${between(scene)}'`);
  filters.push(`drawbox=x=150:y=460:w=780:h=86:color=${scene.accent}@0.18:t=fill:enable='${between(scene)}'`);
  filters.push(drawText({ text: 'Tun Job', y: 185, size: 68, color: 'white', scene, weight: 'bold' }));
  filters.push(drawText({ text: scene.title, y: 650, size: 72, color: 'white', scene, weight: 'bold' }));
  filters.push(drawText({ text: scene.subtitle, y: 780, size: 36, color: 'white', scene }));
  filters.push(drawText({ text: scene.url || 'https://tun-job-board.com', y: 1645, size: 48, color: 'white', scene, weight: 'bold' }));
  filters.push(drawText({ text: 'Créer mon compte gratuitement', y: 1722, size: 32, color: 'white', scene }));
  return filters;
}

const vf = [
  `scale=${width}:${height}`,
  ...scenes.flatMap(sceneLayer),
  'format=yuv420p',
].join(',');

const args = [
  '-y',
  '-f',
  'lavfi',
  '-i',
  `color=c=0x071529:s=${width}x${height}:d=${duration}:r=30`,
  '-f',
  'lavfi',
  '-i',
  `sine=frequency=220:sample_rate=44100:duration=${duration}`,
  '-vf',
  vf,
  '-af',
  'volume=0.035,afade=t=in:st=0:d=1,afade=t=out:st=33.5:d=1.5',
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

writeFileSync(join(outDir, 'tun-job-promo-script.txt'), scenes.map((scene) => `${scene.start}-${scene.end}s: ${scene.title} — ${scene.subtitle}`).join('\n'));
execFileSync(ffmpegPath, args, { stdio: 'inherit' });
console.log(`Video generated: ${output}`);
