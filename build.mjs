// Builds dist/ from content/ + src/render.mjs + public/ + media/. No dependencies.
// Vercel runs `node build.mjs` on every push (including saves from Pages CMS).
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const dist = `${root}dist`;
const slugify = (s) => s.toLowerCase().replace(/\.json$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function collection(dir) {
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const items = await Promise.all(files.map(async (f) => ({ ...JSON.parse(await readFile(`${dir}/${f}`, 'utf8')), slug: slugify(f) })));
  return items.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999) || a.slug.localeCompare(b.slug));
}

async function page(path, html) {
  await mkdir(`${dist}${path}`, { recursive: true });
  await writeFile(`${dist}${path}/index.html`, html);
}

export async function build() {
  const r = await import(`${pathToFileURL(`${root}src/render.mjs`).href}?t=${Date.now()}`);
  const site = JSON.parse(await readFile(`${root}content/site.json`, 'utf8'));
  const projects = await collection(`${root}content/projects`);
  const sets = await collection(`${root}content/sets`);

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(`${root}public`, dist, { recursive: true });
  if (existsSync(`${root}media`)) await cp(`${root}media`, `${dist}/media`, { recursive: true });

  await page('', r.homePage(site, projects, sets));
  await Promise.all(projects.map((p, i) => page(`/work/${p.slug}`, r.projectPage(site, p, i, projects))));
  await Promise.all(sets.map((s, i) => page(`/photos/${s.slug}`, r.setPage(site, s, i, sets))));
  return { projects: projects.length, sets: sets.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const n = await build();
  console.log(`Built dist/ — home, ${n.projects} project pages, ${n.sets} photo sets`);
}
