---
name: frontend-website
description: Rules and screenshot-verification workflow for building or restyling frontend websites and HTML pages (landing pages, portfolio sites, dashboards as HTML). Use whenever writing or changing frontend code, especially when matching a reference image or design. Covers output defaults (single index.html, Tailwind CDN), brand assets, anti-generic design guardrails, and a localhost serve + screenshot + compare loop.
---

# Frontend Website Rules

## Always Do First
- If a `frontend-design` skill is available, invoke it before writing any frontend code.
- Check `brand_assets/` in the project root (see Brand Assets).

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against the reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or the user says so.

## Local Server
- **Always serve on localhost**, never screenshot a `file:///` URL.
- Start the bundled server in the background from the project root:
  `node .claude/skills/frontend-website/scripts/serve.mjs . 3000` → `http://localhost:3000`
  (args: `[root] [port]`, defaults to the current directory and 3000).
- If a server is already running on the port, do not start a second instance.

## Screenshot Workflow
- Run from the project root:
  `node .claude/skills/frontend-website/scripts/screenshot.mjs http://localhost:3000 [label] [width]`
- Uses Playwright if installed (preinstalled in Claude Code cloud sessions), otherwise Puppeteer. Locally, install one first: `npm i -D playwright` (then `npx playwright install chromium`).
- Screenshots save to `./temporary screenshots/screenshot-N[-label].png` (auto-incremented, never overwritten, full page). Default width 1440; pass `390` for a mobile check.
- After screenshotting, read the PNG with the Read tool to see and analyze it.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px".
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing.
- `temporary screenshots/` is scratch output; keep it out of commits.

## Output Defaults
- Single `index.html` file, all styles inline, unless the user says otherwise.
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive.

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values; do not invent brand colors.
- If no brand palette exists and the user wants a themed look, the `theme-factory` skill can supply one.

## Anti-Generic Guardrails
- **Colors:** Never use the default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via an SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens, not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit on the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference.
- Do not "improve" a reference design; match it.
- Do not stop after one screenshot pass.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as the primary color.
