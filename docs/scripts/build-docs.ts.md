# build-docs.ts

If you're looking at this through github pages and it looks all nice, thank this script!

This file exclusively sets up the `./docs` directory for deployment using docsify.

## What it does

- Generates a `_navbar.md` and a `_sidebar.md` in every sub directory of `./docs`. These are ignored, it's just what docsify needs.
- Builds the `./docs/search-index.json` to enable quick file content searching.
- Using `node-html-constructor`, renders the `./docs/index.html` file which these sites deploy to. This will ensure that the urls point to the correct place even if it's deployed in a child repository.
