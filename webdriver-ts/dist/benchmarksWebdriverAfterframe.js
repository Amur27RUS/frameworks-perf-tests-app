import { BenchmarkType, Benchmark, cpuBenchmarkInfos, } from "./benchmarksCommon.js";
import { config } from "./common.js";
import { clickElementById, clickElementByXPath, findById, findByXPath, testClassContains, testElementLocatedById, testElementLocatedByXpath, testElementNotLocatedByXPath, testTextContains, } from "./webdriverAccess.js";
const SHORT_TIMEOUT = 20 * 1000;
let durations = [];
export function getAfterframeDurations() {
    return durations.map((d) => ({ total: d, script: 0, paint: 0 }));
}
export async function initMeasurement(driver) {
    // From https://github.com/andrewiggins/afterframe, MIT licensed
    const afterFrame = `
  /**
   * Queue of functions to invoke
   * @type {Array<(time: number) => void>}
   */
  let callbacks = [];
  
  let channel = new MessageChannel();
  
  let postMessage = (function() {
    this.postMessage(undefined);
  }).bind(channel.port2);
  
  // Flush the callback queue when a message is posted to the message channel
  channel.port1.onmessage = () => {
    // Reset the callback queue to an empty list in case callbacks call
    // afterFrame. These nested calls to afterFrame should queue up a new
    // callback to be flushed in the following frame and should not impact the
    // current queue being flushed
    let toFlush = callbacks;
    callbacks = [];
    let time = performance.now();
    for (let i = 0; i < toFlush.length; i++) {
      // Call all callbacks with the time the flush began, similar to requestAnimationFrame
      // TODO: Error handling?
      toFlush[i](time);
    }
  };
  
  // If the onmessage handler closes over the MessageChannel, the MessageChannel never gets GC'd:
  channel = null;
  
  /**
   * Invoke the given callback after the browser renders the next frame
   * @param {(time: number) => void} callback The function to call after the browser renders
   * the next frame. The callback function is passed one argument, a DOMHighResTimeStamp
   * similar to the one returned by performance.now(), indicating the point in time when
   * afterFrame() starts to execute callback functions.
   */
  window.afterFrame = function(callback) {
    if (callbacks.push(callback) === 1) {
      requestAnimationFrame(postMessage);
    }
  }
  `;
    await driver.executeScript(afterFrame);
    durations = [];
}
async function measureClickForElement(driver, elem) {
    if (!elem)
        throw `measureClickForElement failed. Element was not found.`;
    let duration = (await driver.executeAsyncScript(`
      let callback = arguments[arguments.length - 1];
      let elem = arguments[0];
      let base = document;
      let t0 = performance.now(); 
      elem.click();
      window.afterFrame(() => 
      {
        let t = performance.now()-t0;
        // @ts-ignore
        window.lastDuration = t;
        callback(t);
      })
    `, elem));
    durations.push(duration);
    console.log("computed duration", duration);
}
async function measureClickElementById(driver, id, isInButtonArea) {
    let elem = await findById(driver, id, isInButtonArea);
    console.log("measureClickElementById:", elem);
    await measureClickForElement(driver, elem);
}
async function measureClickElementByXPath(driver, xpath, isInButtonArea) {
    let elem = await findByXPath(driver, xpath, isInButtonArea);
    if (!elem)
        throw `measureClickElementById ${xpath} failed. Element was not found.`;
    await measureClickForElement(driver, elem);
}
export class CPUBenchmarkWebdriver {
    constructor(benchmarkInfo) {
        this.benchmarkInfo = benchmarkInfo;
        this.type = BenchmarkType.CPU;
    }
}
export const benchRun = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._01]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        for (let i = 0; i < this.benchmarkInfo.warmupCount; i++) {
            await clickElementById(driver, "run", true);
            await testTextContains(driver, "//tbody/tr[1]/td[1]", (i * 1000 + 1).toFixed(), config.TIMEOUT, false);
            await clickElementById(driver, "clear", true);
            await testElementNotLocatedByXPath(driver, "//tbody/tr[1]", config.TIMEOUT, false);
        }
    }
    async run(driver) {
        await measureClickElementById(driver, "run", true);
        await testTextContains(driver, "//tbody/tr[1]/td[1]", (this.benchmarkInfo.warmupCount * 1000 + 1).toFixed(), config.TIMEOUT, false);
    }
})();
export const benchReplaceAll = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._02]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        for (let i = 0; i < this.benchmarkInfo.warmupCount; i++) {
            await clickElementById(driver, "run", true);
            await testTextContains(driver, "//tbody/tr[1]/td[1]", (i * 1000 + 1).toFixed(), config.TIMEOUT, false);
        }
    }
    async run(driver) {
        await measureClickElementById(driver, "run", true);
        await testTextContains(driver, "//tbody/tr[1]/td[1]", `${this.benchmarkInfo.warmupCount * 1000 + 1}`, config.TIMEOUT, false);
    }
})();
export const benchUpdate = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._03]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        await clickElementById(driver, "run", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[1000]/td[2]/a", config.TIMEOUT, false);
        for (let i = 0; i < 3; i++) {
            await clickElementById(driver, "update", true);
            await testTextContains(driver, "//tbody/tr[991]/td[2]/a", " !!!".repeat(i + 1), config.TIMEOUT, false);
        }
    }
    async run(driver) {
        await measureClickElementById(driver, "update", true);
        await testTextContains(driver, "//tbody/tr[991]/td[2]/a", " !!!".repeat(3 + 1), config.TIMEOUT, false);
    }
})();
export const benchSelect = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._04]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        await clickElementById(driver, "run", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[1]/td[2]/a", config.TIMEOUT, false);
    }
    async run(driver) {
        await measureClickElementByXPath(driver, "//tbody/tr[2]/td[2]/a", false);
        await testClassContains(driver, "//tbody/tr[2]", "danger", config.TIMEOUT, false);
    }
})();
export const benchSwapRows = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._05]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        await clickElementById(driver, "run", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[1]/td[1]", config.TIMEOUT, false);
        for (let i = 0; i <= this.benchmarkInfo.warmupCount; i++) {
            let text = i % 2 == 0 ? "2" : "999";
            await clickElementById(driver, "swaprows", true);
            await testTextContains(driver, "//tbody/tr[999]/td[1]", text, config.TIMEOUT, false);
        }
    }
    async run(driver) {
        await clickElementById(driver, "swaprows", true);
        let text999 = this.benchmarkInfo.warmupCount % 2 == 0 ? "999" : "2";
        let text2 = this.benchmarkInfo.warmupCount % 2 == 0 ? "2" : "999";
        await testTextContains(driver, "//tbody/tr[999]/td[1]", text999, config.TIMEOUT, false);
        await testTextContains(driver, "//tbody/tr[2]/td[1]", text2, config.TIMEOUT, false);
    }
})();
export const benchRemove = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._06]);
        this.rowsToSkip = 4;
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        await clickElementById(driver, "run", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[1000]/td[1]", config.TIMEOUT, false);
        for (let i = 0; i < this.benchmarkInfo.warmupCount; i++) {
            const rowToClick = this.benchmarkInfo.warmupCount - i + this.rowsToSkip;
            await testTextContains(driver, `//tbody/tr[${rowToClick}]/td[1]`, rowToClick.toString(), config.TIMEOUT, false);
            await clickElementByXPath(driver, `//tbody/tr[${rowToClick}]/td[3]/a/span[1]`, false);
            await testTextContains(driver, `//tbody/tr[${rowToClick}]/td[1]`, `${this.rowsToSkip + this.benchmarkInfo.warmupCount + 1}`, config.TIMEOUT, false);
        }
        await testTextContains(driver, `//tbody/tr[${this.rowsToSkip + 1}]/td[1]`, `${this.rowsToSkip + this.benchmarkInfo.warmupCount + 1}`, config.TIMEOUT, false);
        await testTextContains(driver, `//tbody/tr[${this.rowsToSkip}]/td[1]`, `${this.rowsToSkip}`, config.TIMEOUT, false);
        // Click on a row the second time
        await testTextContains(driver, `//tbody/tr[${this.rowsToSkip + 2}]/td[1]`, `${this.rowsToSkip + this.benchmarkInfo.warmupCount + 2}`, config.TIMEOUT, false);
        await clickElementByXPath(driver, `//tbody/tr[${this.rowsToSkip + 2}]/td[3]/a/span[1]`, false);
        await testTextContains(driver, `//tbody/tr[${this.rowsToSkip + 2}]/td[1]`, `${this.rowsToSkip + this.benchmarkInfo.warmupCount + 3}`, config.TIMEOUT, false);
    }
    async run(driver) {
        await clickElementByXPath(driver, `//tbody/tr[${this.rowsToSkip}]/td[3]/a/span[1]`, false);
        await testTextContains(driver, `//tbody/tr[${this.rowsToSkip}]/td[1]`, `${this.rowsToSkip + this.benchmarkInfo.warmupCount + 1}`, config.TIMEOUT, false);
    }
})();
export const benchRunBig = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._07]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        for (let i = 0; i < this.benchmarkInfo.warmupCount; i++) {
            await clickElementById(driver, "run", true);
            await testTextContains(driver, "//tbody/tr[1]/td[1]", (i * 1000 + 1).toFixed(), config.TIMEOUT, false);
            await clickElementById(driver, "clear", true);
            await testElementNotLocatedByXPath(driver, "//tbody/tr[1]", config.TIMEOUT, false);
        }
    }
    async run(driver) {
        await measureClickElementById(driver, "runlots", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[10000]/td[2]/a", config.TIMEOUT, false);
    }
})();
export const benchAppendToManyRows = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._08]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        for (let i = 0; i < this.benchmarkInfo.warmupCount; i++) {
            await clickElementById(driver, "run", true);
            await testTextContains(driver, "//tbody/tr[1]/td[1]", (i * 1000 + 1).toFixed(), config.TIMEOUT, false);
            await clickElementById(driver, "clear", true);
            await testElementNotLocatedByXPath(driver, "//tbody/tr[1]", config.TIMEOUT, false);
        }
        await clickElementById(driver, "run", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[1000]/td[2]/a", config.TIMEOUT, false);
    }
    async run(driver) {
        await measureClickElementById(driver, "add", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[2000]/td[2]/a", config.TIMEOUT, false);
    }
})();
export const benchClear = new (class extends CPUBenchmarkWebdriver {
    constructor() {
        super(cpuBenchmarkInfos[Benchmark._09]);
    }
    async init(driver) {
        await testElementLocatedById(driver, "run", SHORT_TIMEOUT, true);
        for (let i = 0; i < this.benchmarkInfo.warmupCount; i++) {
            await clickElementById(driver, "run", true);
            await testElementLocatedByXpath(driver, "//tbody/tr[1000]/td[2]/a", config.TIMEOUT, false);
            await clickElementById(driver, "clear", true);
            await testElementNotLocatedByXPath(driver, "//tbody/tr[1]", config.TIMEOUT, false);
        }
        await clickElementById(driver, "run", true);
        await testElementLocatedByXpath(driver, "//tbody/tr[1000]/td[2]/a", config.TIMEOUT, false);
    }
    async run(driver) {
        await measureClickElementById(driver, "clear", true);
        await testElementNotLocatedByXPath(driver, "//tbody/tr[1]", config.TIMEOUT, false);
    }
})();
export const benchmarks = [
    benchRun,
    benchReplaceAll,
    benchUpdate,
    benchSelect,
    benchSwapRows,
    benchRemove,
    benchRunBig,
    benchAppendToManyRows,
    benchClear,
];
//# sourceMappingURL=benchmarksWebdriverAfterframe.js.map