import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export async function inspectKrPage(url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', (error) => {
    console.error('BROWSER PAGE ERROR:', error);
  });

  await page.goto(url, { waitUntil: 'networkidle0' });
  console.log('PAGE TITLE:', await page.title());
  await browser.close();
}

if (process.argv[2]) {
  inspectKrPage(process.argv[2]).catch((err) => {
    console.error('Failed to inspect page:', err);
    process.exit(1);
  });
}
