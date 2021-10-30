import path from 'node:path';
import fs from 'node:fs';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import pluginAdblocker from 'puppeteer-extra-plugin-adblocker';

async function start() {
	const currentData = JSON.parse(
		fs.readFileSync(path.resolve('data.json'), {encoding: 'utf8'}),
	);
	const currentTitles = new Set(Object.values(currentData).map(i => i.title));

	const $ = await request('https://animepahe.com/anime');

	const animes = $('a[href^=/anime/]').map((i, element) => {
		if (!currentTitles.has($(element).attr('title').trim())) {
			return $(element).attr('href');
		}
		return undefined;
	}).get();

	for (const anime of animes) {
		console.log(anime);
		const $ = await request('https://animepahe.com' + anime);

		let id;
		const pahe = $('a[href^="//pahe.win/a/"]').attr('href');
		if (pahe) {
			id = pahe.split('/')[4];
		} else {
			continue;
		}

		const title = $('a[href^="//pahe.win/a/"]').attr('title');
		currentData[id] = {title};
	}

	console.log(Object.keys(currentData).length);
	fs.writeFileSync(path.resolve('data.json'), JSON.stringify(currentData), {
		encoding: 'utf8',
	});
}

puppeteer.use(pluginStealth());
puppeteer.use(pluginAdblocker());

let browser;
let browserTimeout;

async function request(url) {
	if (!browser) {
		browser = puppeteer.launch({headless: true});
	}

	browser = await browser;
	clearTimeout(browserTimeout);
	browserTimeout = setTimeout(async () => {
		await browser.close();
		browser = null;
	}, 60 * 1000);
	const page = await browser.newPage();
	try {
		const response = await page.goto(url, {
			waitUntil: 'networkidle2',
		});
		const bodyHTML = await page.evaluate(() => document.documentElement.outerHTML);
		await page.close();
		if (Number.parseInt(response.status()) > 499 && Number.parseInt(response.status()) < 600) {
			throw new Error(response.request.res.responseUrl);
		}
		return cheerio.load(bodyHTML);
	} catch (error) {
		await page.close();
		throw error;
	}
}

start();