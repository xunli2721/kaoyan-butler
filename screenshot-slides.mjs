import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOTAL_SLIDES = 14;

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    const page = await context.newPage();
    const filePath = path.join(__dirname, 'ppt-slides.html');
    const url = `file:///${filePath.replace(/\\/g, '/')}?slide=${i}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const outputFile = path.join(__dirname, 'slides', `slide-${String(i).padStart(2, '0')}.jpg`);
    await page.screenshot({ path: outputFile, type: 'jpeg', quality: 95 });
    console.log(`Captured slide ${i}`);
    await page.close();
  }

  await browser.close();
  console.log('All slides captured!');
}

main().catch(console.error);
