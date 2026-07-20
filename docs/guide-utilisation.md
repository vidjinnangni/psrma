# Guide d'utilisation

Manuel pour conduire une revue systématique et une méta-analyse PRISMA avec l'outil, de la création du projet à l'export final.

Ce guide suppose que l'application est déjà installée et lancée (voir le [README](../README.md) pour l'installation). Une fois les deux serveurs démarrés, l'interface est accessible via l'adresse [http://localhost:5173](http://localhost:5173).

## Sommaire

1. [Créer un projet](#1-créer-un-projet)
2. [Rechercher sur OpenAlex](#2-rechercher-sur-openalex)
3. [Tri sur titres et résumés](#3-tri-sur-titres-et-résumés)
4. [Tri en texte intégral](#4-tri-en-texte-intégral)
5. [Lire le diagramme de flux PRISMA](#5-lire-le-diagramme-de-flux-prisma)
6. [Extraire les données](#6-extraire-les-données)
7. [Faire la méta-analyse](#7-faire-la-méta-analyse)
8. [Exporter les résultats](#8-exporter-les-résultats)
9. [Supprimer un projet](#9-supprimer-un-projet)
10. [Problèmes courants](#10-problèmes-courants)

---

## 1. Créer un projet

![Liste des projets](images/home.png)

Sur la page d'accueil, saisir un nom dans le champ **"Nom du nouveau projet de revue"** et clique sur **Créer**. Chaque projet est indépendant :

- ses recherches ;
- ses décisions de tri ;
- son extraction ;
- et ses méta-analyses lui sont propres.

Cliquer sur le nom d'un projet dans la liste pour l'ouvrir.

## 2. Rechercher sur OpenAlex

![Formulaire de recherche OpenAlex et liste des records importés](images/project-search.png)

Depuis la page d'un projet, section **"Nouvelle recherche OpenAlex"** :

- **Nom de la recherche** (optionnel) : pour s'y retrouver dans l'historique. Si vous le laissez vide, les mots-clés servent de nom.
- **Mots-clés** : recherche plein texte transmise telle quelle à OpenAlex. Les mots séparés par un espace doivent apparaître ensemble ; une virgule n'a aucun effet particulier. Syntaxe utile :

  - `OR` pour "l'un ou l'autre" : `sleep OR insomnia`
  - guillemets pour une phrase exacte : `"cognitive decline"`
  - `NOT` pour exclure un terme : `sleep NOT apnea`

- **Depuis / Jusqu'à** : filtre par date de publication.
- **Types de documents** : Article, Revue, Preprint, Chapitre de livre, Thèse, Rapport. Aucune sélection = tous les types.
- **Open access uniquement** : restreint aux documents en libre accès.
- **Max résultats à importer** : plafond de l'import (jusqu'à 10 000).

Avant de lancer l'import, cliquer sur **"Aperçu du nombre de résultats"** pour voir combien de documents OpenAlex trouve avec ces critères, sans rien importer. Vous pouvez affiner votre requête tant que ce nombre vous semble déraisonnable.

Quand la requête est convenable, cliquer sur **"Lancer la recherche et importer"**. L'import se fait **en tâche de fond** : le bouton répond immédiatement et la recherche apparaît dans la liste **"Recherches effectuées"** avec le statut *"import en cours…"*, qui se met à jour automatiquement (toutes les 2 secondes) jusqu'à ce que l'import soit terminé. Vous pouvez continuer à naviguer pendant ce temps.

> Les doublons (même identifiant OpenAlex retrouvé par une recherche précédente) ne sont jamais importés deux fois. Ils sont simplement rattachés à la nouvelle recherche.

Cliquer sur une recherche dans la liste pour filtrer les records affichés en dessous à ceux qu'elle a trouvés.

Cliquer sur **"Tous les records"** pour revenir à la vue complète.

## 3. Tri sur titres et résumés

![Écran de tri sur titre/résumé avec la carte d'un record](images/screening-title-abstract.png)

Cliquer sur **"Tri sur titre/résumé"** depuis la page du projet.

L'écran présente une carte par record (titre, auteurs, revue, année, résumé) avec trois décisions possibles :

| Action | Raccourci clavier | Bouton |
|---|---|---|
| Inclure | → | **Inclure** |
| Exclure | ← (ouvre le choix du motif) | **Exclure** |
| Marquer comme incertain | ↓ ou **M** | **Peut-être** |

Pour une exclusion, un motif est demandé : choisir parmi les chips proposées (Hors sujet, Mauvais design d'étude, Population non pertinente, Langue non prise en charge, Doublon, Autre) ou le préciser librement, puis cliquer sur **"Confirmer l'exclusion"**. **Échap** annule et permet de revenir à la carte.

La barre de progression en haut indique le nombre de records triés sur le total, avec la répartition inclus/exclus/incertains.

**"Voir l'historique des décisions"** liste toutes les décisions prises, avec un bouton **Annuler** par ligne pour revenir sur une décision (le record retourne alors dans la file à trier).

## 4. Tri en texte intégral

![Écran de tri en texte intégral avec le lien vers le DOI](images/screening-full-text.png)

Cliquer sur **"Tri en texte intégral"**. Le fonctionnement est identique au tri sur titre/résumé, à deux différences près :

- Seuls les records **inclus** au stade titre/résumé apparaissent dans cette file.
- Un lien **"Ouvrir le texte intégral ↗"** (vers le DOI) est affiché sur chaque carte pour aller consulter l'article complet avant de décider.

Le badge en haut de page (**1. Titre / résumé** — **2. Texte intégral**) permet de basculer librement entre les deux étapes ; leurs progressions sont indépendantes.

## 5. Lire le diagramme de flux PRISMA

![Diagramme de flux PRISMA généré automatiquement](images/prisma-flow.png)

Cliquer sur **"Diagramme PRISMA"**. Le diagramme se génère automatiquement à partir des décisions de tri, en suivant la structure standard PRISMA 2020 :

> **Identification** → records identifiés sur OpenAlex, doublons retirés → **Tri** → records triés et exclus (avec motifs) au stade titre/résumé, puis au stade texte intégral → **Inclusion** → études incluses dans la revue.

Un encart séparé signale les records encore incertains ou pas encore triés, une catégorie propre à l'outil qui n'existe pas dans le diagramme PRISMA officiel.

Utiliser **"Exporter PNG"** ou **"Exporter SVG"** pour récupérer une image du diagramme, à inclure dans ton manuscrit ou en matériel supplémentaire.

## 6. Extraire les données

![Grille d'extraction de données pour les études incluses](images/extraction.png)

Cliquer sur **"Extraction de données"**. Cette grille ne porte que sur les études **incluses au stade texte intégral**.

Commencer par définir les champs d'extraction dans **"Ajouter un champ"** :

- **Texte :** champ libre (ex. design de l'étude)
- **Nombre :** champ numérique (ex. taille d'échantillon)
- **Oui/Non :** case à cocher
- **Liste :** menu déroulant, avec les options séparées par des virgules (ex. `Faible, Modéré, Élevé`)

Chaque champ apparaît ensuite comme une colonne dans la grille, une ligne par étude incluse. Les valeurs se sauvegardent automatiquement (à la perte de focus pour le texte/nombre, immédiatement pour les cases à cocher et les listes).

Pour renommer un champ, il faut modifier son nom directement dans l'en-tête de colonne. Pour le supprimer, cliquer sur le **✕** à côté du nom ; une confirmation est demandée, car toutes les valeurs saisies pour ce champ seront perdues.

## 7. Faire la méta-analyse

![Page méta-analyse avec forest plot et statistiques d'hétérogénéité](images/meta-analysis.png)

Cliquer sur **"Méta-analyse"**. Cette page a deux parties : la saisie des tailles d'effet, puis le lancement du calcul combiné.

### Saisir une taille d'effet

Choisir l'étude (parmi les études incluses), un libellé, puis la **mesure** :

| Mesure | Champs à saisir |
|---|---|
| Différence de moyennes (MD) | n, moyenne, écart-type pour chaque groupe |
| Différence standardisée / Hedges' g (SMD) | n, moyenne, écart-type pour chaque groupe |
| Odds ratio (OR) | événements et n pour chaque groupe |
| Risque relatif (RR) | événements et n pour chaque groupe |
| Personnalisé | taille d'effet + erreur standard (SE) |

Cliquer sur **"Ajouter"**. La taille d'effet calculée (avec son intervalle de confiance à 95 %) apparaît dans la liste **"Tailles d'effet saisies"**.

### Lancer le pooling

Donner un nom à l'analyse, puis choisir la **mesure** à combiner (uniquement les mesures pour lesquelles des tailles d'effet ont été saisies) et le **modèle** :

- **Effets aléatoires (DerSimonian-Laird) :** recommandé par défaut, adapté quand une hétérogénéité entre études est plausible.
- **Effets fixes :** suppose que toutes les études estiment le même effet vrai.

Cliquer sur **"Lancer"**. Le résultat affiche l'effet combiné avec son intervalle de confiance, le z, la p-value, puis les indicateurs d'hétérogénéité (Q, degrés de liberté, I², τ²), et un **forest plot** : chaque étude en ligne (carré proportionnel au poids dans le pooling), le losange bleu en bas représentant l'effet combiné. Pour les mesures OR/RR, l'axe est en échelle logarithmique avec une ligne de référence à 1 ; pour MD/SMD, la référence est à 0.

L'historique conserve tous les calculs précédents. Cliquer sur un `run` pour le réafficher, ou **Supprimer** pour l'enlever.

## 8. Exporter les résultats

![Page export avec les téléchargements et la checklist PRISMA 2020](images/export.png)

Cliquer sur **"Export"**. Deux blocs :

**Exports de données.** Quatre téléchargements directs :

- **Records (CSV)** : tous les records du projet avec leurs décisions de tri.
- **Extraction (CSV)** : la grille d'extraction des études incluses.
- **Tailles d'effet (CSV)** : toutes les tailles d'effet saisies.
- **Rapport (Markdown)** : document assemblant automatiquement question de recherche, méthode de recherche, chiffres du flux PRISMA, tableau des études incluses et résultats des méta-analyses. Bonne base pour rédiger la section méthodes/résultats d'un manuscrit.

**Checklist PRISMA 2020**. 27 items groupés par section (Titre, Résumé, Introduction, Méthodes, Résultats, Discussion, Autres informations). Pour chaque item, indique un statut (Rapporté / Partiel / Non rapporté / Non applicable) et l'emplacement correspondant dans ton manuscrit (page, section). C'est un aide-mémoire inspiré de la structure de la déclaration PRISMA 2020. A vérifier par rapport [au document officiel](http://www.prisma-statement.org/) avant toute soumission.

## 9. Supprimer un projet

Depuis la liste des projets ou la page d'un projet, cliquer sur **"Supprimer"** / **"Supprimer le projet"**. Une confirmation est demandée :

*la suppression est **définitive** et entraîne celle de toutes les données associées (recherches, records, décisions de tri, extraction, tailles d'effet, méta-analyses, checklist).*

## 10. Problèmes courants

**"Échec de l'import OpenAlex. Vérifie ta requête et réessaie."** Dans la grande majorité des cas, cela signifie que le serveur backend n'est pas démarré. Vérifie que les deux serveurs (backend sur le port 8000, frontend sur le port 5173) tournent bien, puis réessaie.

**Une recherche reste bloquée sur "import en cours…"**. Cas rare où l'import en tâche de fond a échoué de façon inattendue pendant sa propre gestion d'erreur. Relance une nouvelle recherche avec les mêmes critères.

**Le nombre de résultats de l'aperçu me semble énorme**. La recherche est en plein texte, pas une recherche par mots-clés stricts. Affine avec des guillemets pour une phrase exacte, ou resserre avec des filtres de date/type de document.
