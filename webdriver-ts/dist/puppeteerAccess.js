import * as puppeteer from "puppeteer-core";
export async function checkElementNotExists(page, selector) {
    let start = Date.now();
    for (let k = 0; k < 10; k++) {
        let sel = await page.$(selector);
        if (!sel) {
            return;
        }
        console.log("checkElementNotExists element found");
        await sel.dispose();
        await page.waitForTimeout(k < 3 ? 10 : 1000);
    }
    console.log("checkElementNotExists waited " + (Date.now() - start) + " but no luck");
    throw `checkElementNotExists failed for ${selector};`;
}
export async function checkElementExists(page, selector) {
    let start = Date.now();
    for (let k = 0; k < 10; k++) {
        let sel = await page.$(selector);
        if (sel) {
            await sel.dispose();
            return sel;
        }
        console.log(`checkElementExists element ${selector} not found`);
        await page.waitForTimeout(k < 3 ? 10 : 1000);
    }
    console.log("checkElementExists waited " + (Date.now() - start) + " but no luck");
    throw `checkElementExists failed for ${selector};`;
}
export async function clickElement(page, selector) {
    let elem = await page.$(selector);
    if (!elem.asElement())
        throw `clickElementByXPath ${selector} failed. Element was not found.`;
    await elem.click();
    await elem.dispose();
}
export async function checkElementContainsText(page, selector, expectedText) {
    let start = Date.now();
    let txt;
    for (let k = 0; k < 10; k++) {
        let elem = await page.$(selector);
        if (elem) {
            txt = await elem.evaluate((e) => e === null || e === void 0 ? void 0 : e.innerText);
            if (txt === undefined)
                console.log("WARNING: checkElementContainsText was undefined");
            if (txt) {
                let result = txt.includes(expectedText);
                await elem.dispose();
                if (result)
                    return;
            }
        }
        await page.waitForTimeout(k < 3 ? 10 : 1000);
    }
    console.log("checkElementExists waited " + (Date.now() - start) + " but no luck");
    throw `checkElementContainsText ${selector} failed. expected ${expectedText}, but was ${txt}`;
}
export async function checkElementHasClass(page, selector, className) {
    let clazzes;
    for (let k = 0; k < 10; k++) {
        let elem = await page.$(selector);
        if (elem) {
            let clazzes = await elem.evaluate((e) => e === null || e === void 0 ? void 0 : e.classList);
            if (clazzes === undefined)
                console.log("WARNING: checkElementHasClass was undefined");
            if (clazzes) {
                let result = Object.values(clazzes).includes(className);
                await elem.dispose();
                if (result)
                    return;
            }
        }
        await page.waitForTimeout(k < 3 ? 10 : 1000);
    }
    throw `checkElementHasClass ${selector} failed. expected ${className}, but was ${clazzes}`;
}
export async function checkCountForSelector(page, selector, expectedCount) {
    let elems = await page.$$(selector);
    if (elems) {
        if (expectedCount !== elems.length) {
            throw `checkCountForSelector ${selector} failed. expected ${expectedCount}, but ${elems.length} were found`;
        }
    }
    else {
        if (expectedCount !== 0) {
            throw `checkCountForSelector ${selector} failed. expected ${expectedCount}, but selector was not found`;
        }
    }
}
function browserPath(benchmarkOptions) {
    if (benchmarkOptions.chromeBinaryPath)
        return benchmarkOptions.chromeBinaryPath;
    if (process.platform == "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    }
    else if (process.platform == "linux") {
        return "google-chrome";
    }
    else if (/^win/i.test(process.platform)) {
        return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    }
    else {
        throw new Error("Path to Google Chrome executable must be specified");
    }
}
export async function startBrowser(benchmarkOptions) {
    const width = 1280;
    const height = 800;
    const window_width = width, window_height = height;
    const args = [`--window-size=${window_width},${window_height}`, "--js-flags=--expose-gc", "--no-default-browser-check"];
    if (benchmarkOptions.headless)
        args.push("--headless=new");
    args.push("--enable-benchmarking");
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: browserPath(benchmarkOptions),
        ignoreDefaultArgs: [
            "--enable-automation", // 92/115
            "--disable-background-networking",
            "--enable-features=NetworkService,NetworkServiceInProcess",
            "--disable-background-timer-throttling",
            "--disable-extensions",
            // "--disable-backgrounding-occluded-windows",
            // "--disable-breakpad",
            // "--disable-client-side-phishing-detection",
            // "--disable-component-extensions-with-background-pages",
            // "--disable-default-apps",
            // "--disable-dev-shm-usage",
            // // "--disable-extensions",
            // // "--disable-features=Translate",
            // "--disable-hang-monitor",
            // "--disable-ipc-flooding-protection",
            // "--disable-popup-blocking",
            // "--disable-prompt-on-repost",
            // "--disable-renderer-backgrounding",
            // // "--disable-sync",
            // "--force-color-profile=srgb",
            // "--metrics-recording-only",
            // // "--no-first-run",
            // // "--password-store=basic",
            // // "--use-mock-keychain",
            // "--enable-blink-features=IdleDetection",
            // // "--export-tagged-pdf"
        ],
        args,
        dumpio: false,
        defaultViewport: {
            width,
            height,
        },
    });
    return browser;
}
//# sourceMappingURL=puppeteerAccess.js.map