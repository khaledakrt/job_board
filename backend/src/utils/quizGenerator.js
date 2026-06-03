'use strict';

const { normalizeQuizData } = require('./jobQuiz');

/** Known stacks / tools → technical question templates (correct index = 0). */
const TECH_PROFILES = {
  angular: {
    patterns: /\bangular(\s*\d+)?\b|rxjs|ngrx|typescript/i,
    label: 'Angular',
    questions: [
      {
        text: (ctx) =>
          `Pour le poste « ${ctx.title} », quelle pratique Angular est la plus adaptée pour structurer une application modulaire ?`,
        choices: (ctx) => [
          { text: 'Découper l’app en modules/composants standalone avec services injectables' },
          { text: 'Centraliser toute la logique métier dans un seul fichier global.js' },
          { text: 'Éviter TypeScript et écrire uniquement du HTML statique' },
        ],
      },
      {
        text: (ctx) =>
          `Concernant ${ctx.primary}, quel mécanisme est le plus pertinent pour gérer les appels API asynchrones ?`,
        choices: () => [
          { text: 'HttpClient avec Observables (RxJS) et gestion des erreurs' },
          { text: 'Recharger la page entière après chaque clic utilisateur' },
          { text: 'Stocker les réponses API uniquement dans des variables globales window' },
        ],
      },
    ],
  },
  react: {
    patterns: /\breact(\.js)?\b|next\.?js|redux|hooks?\b/i,
    label: 'React',
    questions: [
      {
        text: (ctx) =>
          `Dans un contexte ${ctx.primary}, quelle approche respecte le mieux le modèle de composants React ?`,
        choices: () => [
          { text: 'État local / hooks + composition de composants réutilisables' },
          { text: 'Manipuler le DOM directement avec document.write partout' },
          { text: 'Interdire tout re-render pour éviter le virtual DOM' },
        ],
      },
      {
        text: (ctx) =>
          `Pour « ${ctx.title} », comment gérer correctement les effets de bord (données, API) ?`,
        choices: () => [
          { text: 'useEffect (ou équivalent) avec dépendances explicites et cleanup' },
          { text: 'Exécuter fetch() dans le render sans dépendances' },
          { text: 'Dupliquer la logique API dans chaque bouton sans couche service' },
        ],
      },
    ],
  },
  node: {
    patterns: /\bnode(\.js)?\b|express|nestjs|fastify|npm\b/i,
    label: 'Node.js',
    questions: [
      {
        text: (ctx) =>
          `Sur une API ${ctx.primary} pour cette offre, quelle pratique backend est la plus solide ?`,
        choices: () => [
          { text: 'Routes modulaires, validation des entrées et middleware d’erreurs' },
          { text: 'Exposer toutes les routes sans authentification ni validation' },
          { text: 'Bloquer le event loop avec des boucles synchrones longues' },
        ],
      },
      {
        text: (ctx) =>
          `Pour sécuriser un service Node lié à « ${ctx.snippet} », que faut-il privilégier ?`,
        choices: () => [
          { text: 'Variables d’environnement, hash des mots de passe, requêtes paramétrées SQL' },
          { text: 'Commit des secrets dans le dépôt Git pour simplifier le déploiement' },
          { text: 'concaténer les entrées utilisateur dans les requêtes SQL' },
        ],
      },
    ],
  },
  java: {
    patterns: /\bjava\b|spring\s*boot|hibernate|maven|gradle/i,
    label: 'Java',
    questions: [
      {
        text: (ctx) =>
          `Pour un poste ${ctx.primary}, quelle architecture Spring Boot est recommandée ?`,
        choices: () => [
          { text: 'Couches Controller / Service / Repository avec injection de dépendances' },
          { text: 'Toute la logique JDBC dans les contrôleurs HTTP' },
          { text: 'Désactiver les transactions pour gagner de la mémoire' },
        ],
      },
      {
        text: (ctx) =>
          `Quelle bonne pratique Java correspond aux exigences « ${ctx.snippet} » ?`,
        choices: () => [
          { text: 'Interfaces, tests unitaires (JUnit) et gestion des exceptions métier' },
          { text: 'catch (Exception e) {} vide partout' },
          { text: 'Utiliser uniquement des champs publics sans encapsulation' },
        ],
      },
    ],
  },
  python: {
    patterns: /\bpython\b|django|flask|fastapi|pandas|numpy/i,
    label: 'Python',
    questions: [
      {
        text: (ctx) =>
          `Pour « ${ctx.title} », quelle pratique Python est la plus professionnelle ?`,
        choices: () => [
          { text: 'Environnement virtuel, typage (optionnel) et modules séparés par domaine' },
          { text: 'Tout le code dans un seul script sans fonctions' },
          { text: 'Ignorer les exceptions pour accélérer l’exécution' },
        ],
      },
      {
        text: (ctx) =>
          `Dans un projet ${ctx.primary}, comment traiter les données de façon fiable ?`,
        choices: () => [
          { text: 'Validation des entrées, tests pytest et gestion explicite des erreurs' },
          { text: 'eval() sur les chaînes envoyées par l’utilisateur' },
          { text: 'Copier-coller SQL depuis des forums sans paramètres' },
        ],
      },
    ],
  },
  sql: {
    patterns: /\bsql\b|mysql|postgresql|postgres|oracle|sql\s*server/i,
    label: 'SQL',
    questions: [
      {
        text: (ctx) =>
          `Pour les missions décrites (${ctx.snippet}), quelle requête SQL est la plus appropriée ?`,
        choices: () => [
          { text: 'JOIN + filtres indexés + agrégations avec GROUP BY si besoin' },
          { text: 'SELECT * sur toutes les tables sans clause WHERE' },
          { text: 'Stocker les mots de passe en clair dans une colonne VARCHAR' },
        ],
      },
      {
        text: (ctx) =>
          `Quelle optimisation SQL est pertinente pour un poste « ${ctx.title} » ?`,
        choices: () => [
          { text: 'Index sur colonnes filtrées/jointes et analyse du plan d’exécution' },
          { text: 'Désactiver les transactions pour toutes les écritures' },
          { text: 'Multiplier les sous-requêtes corrélées non indexées' },
        ],
      },
    ],
  },
  devops: {
    patterns: /\bdevops\b|docker|kubernetes|k8s|ci\/?cd|terraform|ansible|aws|azure|gcp/i,
    label: 'DevOps',
    questions: [
      {
        text: (ctx) =>
          `Pour l’offre « ${ctx.title} », quelle pratique DevOps est la plus adaptée ?`,
        choices: () => [
          { text: 'Pipeline CI/CD, images reproductibles et infra as code' },
          { text: 'Déploiement manuel unique en production sans rollback' },
          { text: 'Partager les clés root SSH par e-mail' },
        ],
      },
      {
        text: (ctx) =>
          `Concernant ${ctx.primary}, comment assurer la disponibilité des services ?`,
        choices: () => [
          { text: 'Health checks, logs centralisés et stratégie de déploiement progressive' },
          { text: 'Redémarrer les serveurs aléatoirement en cas de pic' },
          { text: 'Désactiver les sauvegardes pour réduire les coûts' },
        ],
      },
    ],
  },
  mobile: {
    patterns: /\bflutter\b|react\s*native|swift|kotlin|android|ios\b/i,
    label: 'Mobile',
    questions: [
      {
        text: (ctx) =>
          `Pour un développeur ${ctx.primary} sur ce poste, quelle approche mobile est correcte ?`,
        choices: () => [
          { text: 'UI déclarative, gestion d’état claire et tests sur devices cibles' },
          { text: 'Hardcoder les tailles d’écran pour un seul modèle' },
          { text: 'Stocker les tokens API en clair dans SharedPreferences sans chiffrement' },
        ],
      },
      {
        text: (ctx) =>
          `Quelle bonne pratique correspond aux besoins « ${ctx.snippet} » ?`,
        choices: () => [
          { text: 'Performance (lazy load), offline partiel et respect des guidelines store' },
          { text: 'Bloquer le thread UI avec des calculs lourds' },
          { text: 'Ignorer les permissions runtime Android/iOS' },
        ],
      },
    ],
  },
  data: {
    patterns: /\bdata\s*(scientist|engineer|analyst)|machine\s*learning|ml\b|power\s*bi|etl|spark/i,
    label: 'Data',
    questions: [
      {
        text: (ctx) =>
          `Pour « ${ctx.title} », quelle étape data est indispensable avant la modélisation ?`,
        choices: () => [
          { text: 'Qualité des données, feature engineering et validation train/test' },
          { text: 'Entraîner sur 100 % des données sans métrique' },
          { text: 'Supprimer les valeurs aberrantes sans documenter l’impact' },
        ],
      },
      {
        text: (ctx) =>
          `Dans un pipeline ${ctx.primary}, comment garantir la reproductibilité ?`,
        choices: () => [
          { text: 'Versionner données/code, seeds fixes et monitoring du drift' },
          { text: 'Modifier manuellement les CSV en production' },
          { text: 'Déployer un modèle sans test sur données récentes' },
        ],
      },
    ],
  },
  qa: {
    patterns: /\bqa\b|quality\s*assurance|test(s|ing)?\s*auto|selenium|cypress|jest|playwright/i,
    label: 'QA / Tests',
    questions: [
      {
        text: (ctx) =>
          `Pour le poste « ${ctx.title} », quelle stratégie de tests est la plus pertinente ?`,
        choices: () => [
          { text: 'Pyramide de tests : unitaires, intégration, E2E ciblés' },
          { text: 'Uniquement des tests manuels en fin de projet' },
          { text: 'Tests E2E sur 100 % du code sans tests unitaires' },
        ],
      },
      {
        text: (ctx) =>
          `Concernant ${ctx.primary}, comment automatiser efficacement ?`,
        choices: () => [
          { text: 'CI qui lance la suite, données de test isolées et rapports clairs' },
          { text: 'Lancer les tests uniquement sur la machine du développeur' },
          { text: 'Ignorer les tests flaky pour gagner du temps' },
        ],
      },
    ],
  },
};

const GENERIC_TECH = {
  label: 'métier technique',
  questions: [
    {
      text: (ctx) =>
        `Techniquement, pour « ${ctx.title} », quelle compétence est la plus alignée sur l’offre ?`,
      choices: (ctx) => [
        { text: `Maîtrise de ${ctx.primary} et mise en œuvre sur des cas concrets` },
        { text: 'Aucune expérience sur les outils mentionnés dans l’annonce' },
        { text: 'Connaissance uniquement théorique sans pratique projet' },
      ],
    },
    {
      text: (ctx) =>
        `D’après le besoin « ${ctx.snippet} », quelle réponse technique est correcte ?`,
      choices: (ctx) => [
        { text: `Appliquer ${ctx.secondary} dans le cadre des livrables décrits` },
        { text: 'Contourner les exigences techniques par des solutions non maintenables' },
        { text: 'Reporter toute décision d’architecture à la mise en production' },
      ],
    },
  ],
};

function normalizeText(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract capitalized tech-like tokens from free text. */
function extractTokensFromText(text) {
  if (!text) return [];
  const found = new Set();

  const knownWords = [
    'Angular',
    'React',
    'Vue',
    'Node.js',
    'TypeScript',
    'JavaScript',
    'Python',
    'Java',
    'Spring',
    'Docker',
    'Kubernetes',
    'AWS',
    'Azure',
    'GCP',
    'SQL',
    'MySQL',
    'PostgreSQL',
    'MongoDB',
    'Redis',
    'GraphQL',
    'REST',
    'API',
    'CI/CD',
    'DevOps',
    'Flutter',
    'Kotlin',
    'Swift',
    'Selenium',
    'Cypress',
    'Jest',
  ];

  const lower = text.toLowerCase();
  for (const word of knownWords) {
    if (lower.includes(word.toLowerCase())) {
      found.add(word);
    }
  }

  const acronyms = text.match(/\b[A-Z]{2,6}\b/g) || [];
  for (const a of acronyms) {
    if (!['CDI', 'CDD', 'RH', 'CEO', 'CTO'].includes(a)) found.add(a);
  }

  return [...found];
}

function detectTechProfiles(fullText, tags) {
  const matched = [];
  for (const [key, profile] of Object.entries(TECH_PROFILES)) {
    if (profile.patterns.test(fullText)) {
      matched.push({ key, profile, score: 2 });
    }
  }

  if (Array.isArray(tags)) {
    for (const tag of tags) {
      const t = tag.toLowerCase();
      for (const [key, profile] of Object.entries(TECH_PROFILES)) {
        if (profile.patterns.test(t) && !matched.find((m) => m.key === key)) {
          matched.push({ key, profile, score: 3 });
        }
      }
    }
  }

  matched.sort((a, b) => b.score - a.score);
  return matched;
}

function buildContext({ title, description, requirements, tags, languages }) {
  const fullText = normalizeText(title, description, requirements);
  const snippet = (requirements || description || title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 90);

  const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];
  const textTokens = extractTokensFromText(fullText);
  const skills = [...new Set([...tagList, ...textTokens])];

  const profiles = detectTechProfiles(fullText, tagList);
  const primaryProfile = profiles[0]?.profile || GENERIC_TECH;
  const secondaryProfile = profiles[1]?.profile;

  const primary =
    tagList[0] ||
    profiles[0]?.profile.label ||
    skills[0] ||
    textTokens[0] ||
    'la stack indiquée dans l’offre';

  const secondary =
    tagList[1] ||
    secondaryProfile?.label ||
    skills[1] ||
    textTokens[1] ||
    languages?.[0] ||
    'les outils secondaires du poste';

  return {
    title: title || 'ce poste',
    snippet: snippet || title || 'les missions techniques',
    primary,
    secondary,
    skills,
    langHint:
      Array.isArray(languages) && languages.length
        ? languages.join(', ')
        : null,
    profiles,
    primaryProfile,
    secondaryProfile,
  };
}

function materializeQuestion(template, ctx) {
  return {
    text: typeof template.text === 'function' ? template.text(ctx) : template.text,
    choices: (typeof template.choices === 'function' ? template.choices(ctx) : template.choices).map(
      (c) => ({ text: typeof c.text === 'string' ? c.text : c.text(ctx) })
    ),
    correctChoiceIndex: 0,
  };
}

function pickQuestions(ctx) {
  const picked = [];

  if (ctx.primaryProfile?.questions) {
    picked.push(materializeQuestion(ctx.primaryProfile.questions[0], ctx));
    if (ctx.secondaryProfile?.questions?.[1]) {
      picked.push(materializeQuestion(ctx.secondaryProfile.questions[1], ctx));
    } else if (ctx.primaryProfile.questions[1]) {
      picked.push(materializeQuestion(ctx.primaryProfile.questions[1], ctx));
    }
  }

  while (picked.length < 2) {
    const fallback = GENERIC_TECH.questions[picked.length];
    picked.push(materializeQuestion(fallback, ctx));
  }

  return picked.slice(0, 2);
}

/**
 * Generates 2 technical quiz questions (3 choices each) from job content.
 * Template-based "AI" — no external LLM.
 */
function generateJobQuiz({ title, description, requirements, tags, languages }) {
  const ctx = buildContext({ title, description, requirements, tags, languages });
  const questions = pickQuestions(ctx);
  return normalizeQuizData({ questions });
}

module.exports = { generateJobQuiz, buildContext, detectTechProfiles };
