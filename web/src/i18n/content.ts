export type Locale = 'fr' | 'en';

export const REPO = 'https://github.com/vidjinnangni/psrma';

const fr = {
  lang: 'fr',
  title: 'PSRMA — Revue systématique et méta-analyse PRISMA',
  description:
    "PSRMA réunit les principales étapes d'une revue systématique dans un seul environnement de travail local : recherche OpenAlex, sélection, extraction, méta-analyse. Gratuit et open source.",
  nav: { pipeline: 'Étapes', screens: 'Interface', principles: 'Philosophie', install: 'Installation' },
  switchTo: { label: 'EN', href: '/en/' },
  hero: {
    eyebrow: 'PRISMA 2020 · Open source · Gratuit',
    title: ['De la recherche bibliographique', 'à la méta-analyse.'],
    lead: "PSRMA réunit les principales étapes d'une revue systématique dans un seul environnement de travail. Recherchez, sélectionnez, extrayez et analysez vos données, sans multiplier les outils.",
    cta: 'Installer PSRMA',
    ctaSecondary: 'Explorer le code sur GitHub',
    note: 'Gratuit, open source et conçu pour fonctionner en local.',
  },
  pipeline: {
    title: 'Une revue systématique, étape par étape.',
    lead: "De la première recherche à la synthèse des résultats, chaque étape s'appuie sur les décisions prises précédemment. Vous gardez une trace de votre travail tout au long du processus.",
    steps: [
      ['Recherche bibliographique', 'Interrogez OpenAlex à partir de vos mots-clés. Affinez les résultats par période, type de publication ou disponibilité en accès libre.'],
      ['Dédoublonnage', 'Les publications identifiées dans plusieurs recherches sont automatiquement regroupées à partir de leur identifiant OpenAlex.'],
      ['Sélection des titres et résumés', "Examinez les références une à une. Classez-les comme incluses, exclues ou à examiner, et renseignez les motifs d'exclusion."],
      ['Lecture intégrale', "Passez à l'examen des textes complets pour les publications retenues. Enregistrez vos décisions et les raisons d'exclusion."],
      ['Diagramme PRISMA', 'Visualisez le parcours de sélection des publications. Le diagramme est construit à partir de vos décisions et peut être exporté en PNG ou SVG.'],
      ['Extraction des données', 'Définissez les informations à recueillir pour chaque étude et rassemblez-les dans un tableau que vous pouvez modifier.'],
      ['Méta-analyse', "Calculez les tailles d'effet et combinez les résultats selon un modèle à effets fixes ou aléatoires. Examinez notamment le forest plot et les indicateurs d'hétérogénéité."],
      ['Export des résultats', 'Récupérez vos données au format CSV, un rapport Markdown généré à partir du projet et une grille de travail pour la checklist PRISMA 2020.'],
    ],
  },
  screens: {
    title: 'Un environnement de travail sans superflu.',
    lead: "L'interface va à l'essentiel : les références, les décisions de sélection, les données extraites et les résultats de vos analyses. Pas besoin de passer d'un logiciel à l'autre pour suivre l'avancement de votre revue.",
    items: [
      { src: '/screens/screening-title-abstract.png', alt: 'Écran de sélection des titres et résumés', caption: 'Sélection des études', text: 'Examinez chaque référence et prenez vos décisions au fil de la lecture. Les raccourcis clavier facilitent le travail sur de longues listes.', w: 672, h: 842 },
      { src: '/screens/prisma-flow.png', alt: 'Diagramme de flux PRISMA', caption: 'Diagramme de flux', text: 'Retrouvez automatiquement les chiffres issus de votre processus de sélection dans un diagramme prêt à être exporté.', w: 896, h: 1034 },
      { src: '/screens/meta-analysis.png', alt: 'Écran de méta-analyse avec forest plot', caption: 'Méta-analyse', text: 'Renseignez les données nécessaires, choisissez votre modèle et consultez les résultats statistiques et leur représentation graphique.', w: 896, h: 1696 },
    ],
  },
  principles: {
    title: 'Vos recherches restent sur votre machine.',
    lead: "PSRMA a été pensé pour une utilisation individuelle, depuis votre propre ordinateur. Vous gardez la maîtrise de vos projets et de votre base de données.",
    items: [
      ['Fonctionnement local', 'Les projets et leurs données sont enregistrés dans une base SQLite sur votre machine. Pas besoin de serveur distant pour travailler.'],
      ['Aucun compte à créer', "Pas d'inscription, pas de connexion obligatoire et pas d'abonnement. Vous installez l'outil et commencez à travailler."],
      ['Open source', "Le code est accessible sur GitHub. Vous pouvez examiner son fonctionnement, vérifier les calculs et adapter l'outil à vos besoins."],
      ['Un périmètre clairement défini', "La recherche bibliographique repose sur OpenAlex. Les décisions de sélection et l'interprétation des résultats restent entre vos mains."],
    ],
  },
  install: {
    title: 'Votre espace de travail, en quelques commandes.',
    lead: "Lancez PSRMA avec Docker ou installez séparément le backend Python et l'interface web. Choisissez la méthode qui correspond à votre environnement.",
    code: 'git clone https://github.com/vidjinnangni/psrma.git\ncd psrma\ndocker compose up',
    after: "Ouvrez ensuite l'application dans votre navigateur à l'adresse http://localhost:5173.",
    guide: "Guide d'installation",
    guideHref: `${REPO}#installation`,
    readme: 'Documentation complète',
  },
  footer: {
    tagline: 'Un outil open source pour accompagner les revues systématiques et les méta-analyses.',
    license: 'MIT License',
  },
};

const en: typeof fr = {
  lang: 'en',
  title: 'PSRMA — PRISMA systematic review & meta-analysis',
  description:
    'PSRMA brings the main stages of a systematic review into a single local workspace: OpenAlex search, screening, extraction, meta-analysis. Free and open source.',
  nav: { pipeline: 'Stages', screens: 'Interface', principles: 'Philosophy', install: 'Install' },
  switchTo: { label: 'FR', href: '/' },
  hero: {
    eyebrow: 'PRISMA 2020 · Open source · Free',
    title: ['From literature search', 'to meta-analysis.'],
    lead: 'PSRMA brings the main stages of a systematic review into a single workspace. Search, screen, extract and analyze your data without juggling tools.',
    cta: 'Install PSRMA',
    ctaSecondary: 'Explore the code on GitHub',
    note: 'Free, open source and designed to run locally.',
  },
  pipeline: {
    title: 'A systematic review, step by step.',
    lead: 'From the first search to the synthesis of results, each stage builds on the decisions made before it. You keep a record of your work throughout the process.',
    steps: [
      ['Literature search', 'Query OpenAlex with your keywords. Narrow results by period, publication type or open access availability.'],
      ['Deduplication', 'Publications found in several searches are automatically merged using their OpenAlex identifier.'],
      ['Title and abstract screening', 'Review records one by one. Mark them as included, excluded or to review, and record exclusion reasons.'],
      ['Full-text review', 'Move on to full-text assessment for the retained publications. Record your decisions and exclusion reasons.'],
      ['PRISMA diagram', 'Visualize the selection pathway. The diagram is built from your decisions and can be exported as PNG or SVG.'],
      ['Data extraction', 'Define the information to collect for each study and gather it in an editable table.'],
      ['Meta-analysis', 'Compute effect sizes and pool results with a fixed- or random-effects model. Review the forest plot and heterogeneity indicators.'],
      ['Export', 'Get your data as CSV, a Markdown report generated from the project, and a worksheet for the PRISMA 2020 checklist.'],
    ],
  },
  screens: {
    title: 'A workspace with no clutter.',
    lead: 'The interface sticks to the essentials: records, screening decisions, extracted data and analysis results. No need to switch between programs to follow the progress of your review.',
    items: [
      { src: '/screens/screening-title-abstract.png', alt: 'Title and abstract screening screen', caption: 'Study screening', text: 'Review each record and make decisions as you read. Keyboard shortcuts make long lists easier to work through.', w: 672, h: 842 },
      { src: '/screens/prisma-flow.png', alt: 'PRISMA flow diagram', caption: 'Flow diagram', text: 'Automatically get the numbers from your selection process in a diagram ready to export.', w: 896, h: 1034 },
      { src: '/screens/meta-analysis.png', alt: 'Meta-analysis screen with forest plot', caption: 'Meta-analysis', text: 'Enter the required data, choose your model and view the statistical results and their graphical representation.', w: 896, h: 1696 },
    ],
  },
  principles: {
    title: 'Your research stays on your machine.',
    lead: 'PSRMA is designed for individual use, from your own computer. You stay in control of your projects and your database.',
    items: [
      ['Runs locally', 'Projects and their data are stored in a SQLite database on your machine. No remote server needed.'],
      ['No account to create', 'No sign-up, no mandatory login and no subscription. Install the tool and start working.'],
      ['Open source', 'The code is available on GitHub. You can inspect how it works, check the calculations and adapt the tool to your needs.'],
      ['A clearly defined scope', 'Literature search relies on OpenAlex. Screening decisions and the interpretation of results remain in your hands.'],
    ],
  },
  install: {
    title: 'Your workspace, in a few commands.',
    lead: 'Run PSRMA with Docker, or install the Python backend and the web interface separately. Pick the method that suits your environment.',
    code: 'git clone https://github.com/vidjinnangni/psrma.git\ncd psrma\ndocker compose up',
    after: 'Then open the application in your browser at http://localhost:5173.',
    guide: 'Installation guide',
    guideHref: `${REPO}#installation`,
    readme: 'Full documentation',
  },
  footer: {
    tagline: 'An open source tool to support systematic reviews and meta-analyses.',
    license: 'MIT License',
  },
};

export const content: Record<Locale, typeof fr> = { fr, en };
