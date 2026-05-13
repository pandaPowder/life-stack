import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PlanSlicer } from '../domains/parenting/slicer.js';
import { userConfig } from '../config/user.js';

const PLAN_FILE = 'data/parenting/weekly-plan.md';
const DATA_DIR = 'data';
const CHILDREN = userConfig.children;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function write(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
  console.log(`  wrote ${filePath}`);
}

export async function run() {
  const planPath = path.join(process.cwd(), PLAN_FILE);
  let markdown: string;
  try {
    markdown = await fs.readFile(planPath, 'utf8');
  } catch {
    console.error(`Error: ${PLAN_FILE} not found. Run 'npm start' first to generate it.`);
    process.exit(1);
  }

  console.log(`Deriving slices from ${PLAN_FILE}…`);

  const plan = PlanSlicer.parse(markdown);

  // data/this-week.md — verbatim copy of the source
  await write(path.join(DATA_DIR, 'this-week.md'), markdown);

  // data/kids/{child}/this-week.md
  for (const child of CHILDREN) {
    const childLower = child.toLowerCase();
    const sliced = PlanSlicer.sliceByChild(plan, child);
    await write(path.join(DATA_DIR, 'kids', childLower, 'this-week.md'), sliced);
  }

  // data/today.md — top 5 items across all children
  const today = PlanSlicer.pickTopItems(plan, 5);
  await write(path.join(DATA_DIR, 'today.md'), today);

  // data/career/this-week.md — owned by track-job-applications; only seed if missing
  const careerPath = path.join(DATA_DIR, 'career', 'this-week.md');
  try {
    await fs.access(careerPath);
    console.log(`  skipped ${careerPath} (already populated by track-jobs)`);
  } catch {
    const stub = '# CAREER — THIS WEEK\n\n*No career data yet. Run npm run track-jobs to populate this.*';
    await write(careerPath, stub);
  }

  console.log('Done.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run();
