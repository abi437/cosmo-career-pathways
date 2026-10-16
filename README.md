# PathFinder career pathway

A responsive static website for exploring Brunei ICT careers, saving a shortlist, mapping progression from qualification and experience, and finding linked COSMO courses. Built with plain HTML, CSS and JavaScript; no runtime dependencies or account required.

## Run

Open `http://localhost/career%20pathway/` through WAMP, or run:

```sh
npm start
```

Then open `http://127.0.0.1:8080/`. Use an HTTP server; browser module/data loading is not supported through `file://`.

## Data availability

Source: https://ccctmacademy.edu.bn/showcase_2026/openapi.json

The supplied specification describes 39 roles, six sectors and 38 courses. Its four `/showcase_2026/data/*.json` endpoints returned HTTP 404 on 16 October 2026. This build uses only complete examples embedded in that specification: six roles, all six sector definitions, three full courses and three role-course mappings. The page clearly labels this incomplete dataset, and sectors without examples show an explanatory empty state. Requirements or records have not been invented.

The roadmap engine follows the specification's directed role graph and BDQF/experience rules. Experience is cumulative, not added across steps. Subject, certification and portfolio conditions still apply. Estimated BDQF levels are identified, and unavailable role details are handled explicitly.

When the source datasets become available, run:

```sh
npm run refresh:data
npm test
npm run build
```

The refresh command downloads and validates all four files before replacing the local snapshot. An unsuccessful download retains the existing data. `data/metadata.json` records provenance and snapshot mode.

## Validation and deployment

```sh
npm test
npm run build
```

`dist/` contains the complete static website. Local browser checks can be run with the dev server active using `node scripts/browser-check.mjs` on Windows with Chrome installed at its standard location. This checks actual page interactions and saves desktop/mobile screenshots under `artifacts/`.

Roadmap links use `?goal=ciso&from=hnd&exp=4`. Qualification choices and bookmarks stay in the visitor's browser. Sites deployment identity and static output are configured in `.openai/hosting.json`.

## Motion and interactions

Motion takes inspiration from the supplied COSMO TikTok reference: horizontal headline entrances, diagonal accents, and a curved magenta pathway led by a yellow dot. The dashboard adapts this into scroll reveals, card tilt and spotlights, interactive hero steps, sliding details, bookmark feedback, and a scroll-driven roadmap connector.

The top-bar motion control pauses animations and pointer effects and remembers the choice locally. System reduced-motion settings take precedence. Content stays visible and usable without motion. The moving pathway stops when the hero is offscreen or the browser tab is hidden; touch screens do not receive mouse tilt.

With the local server running, use `node scripts/motion-check.mjs` to check normal motion, pausing, reduced motion, pointer effects, input focus, dialogs, and mobile layout in Chrome.
