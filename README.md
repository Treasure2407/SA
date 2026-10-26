# Ajayi Samuel — showreel site

Black-screen intro (lights, camera, action) → velvet curtain → reel of clips that play with sound on hover,
photography sets, more videos, about with a logo marquee, and a velvet "That's a wrap" footer.
Designed in Figma (page "Showreel (v2)"). No framework, no dependencies.

```
content/site.json        site text, about, logos, contact
content/projects/*.json  one file per video project (reel or "more videos")
content/sets/*.json      one file per photo set
media/                   uploaded images (Pages CMS saves uploads here)
src/render.mjs           page templates
public/                  css/site.css, js/site.js
build.mjs                builds dist/ — Vercel runs `node build.mjs`
dev.mjs                  local preview: `node dev.mjs` → http://localhost:5174
.pages.yml               Pages CMS editor config
_prototype/              the original intro prototype (not deployed)
```

## Videos (Cloudinary)

Upload each full video to Cloudinary and paste its link into the project's **Video link**.
The site cuts the 6-second reel preview and the thumbnail from it automatically
(set **Preview starts at** to choose the moment). YouTube and Vimeo links work for the
full video too, but then add a thumbnail image yourself.

## Editing (for Samuel)

Sign in at https://app.pagescms.org with GitHub, open this repository, then edit
**Video projects**, **Photo sets** or **Site text, about & contact**. Saves go live in about a minute.
