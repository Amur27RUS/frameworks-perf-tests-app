import { BenchmarkType, slowDownFactor } from "./benchmarksCommon.js";
import { benchmarks, CPUBenchmarkPlaywright, MemBenchmarkPlaywright, } from "./benchmarksPlaywright.js";
import { config as defaultConfig } from "./common.js";
import { startBrowser } from "./playwrightAccess.js";
import { computeResultsCPU, computeResultsJS, computeResultsPaint, fileNameTrace } from "./timeline.js";
let config = defaultConfig;
async function runBenchmark(browser, page, benchmark, framework) {
    await benchmark.run(browser, page, framework);
    if (config.LOG_PROGRESS)
        console.log("after run", benchmark.benchmarkInfo.id, benchmark.type, framework.name);
}
async function initBenchmark(browser, page, benchmark, framework) {
    await benchmark.init(browser, page, framework);
    if (config.LOG_PROGRESS)
        console.log("after initialized", benchmark.benchmarkInfo.id, benchmark.type, framework.name);
    // if (benchmark.type === BenchmarkType.MEM) {
    //   await forceGC(page);
    // }
}
const wait = (delay = 1000) => new Promise((res) => setTimeout(res, delay));
function convertError(error) {
    console.log("ERROR in run Benchmark: |", error, "| type:", typeof error, "instance of Error", error instanceof Error, "Message:", error.message);
    if (typeof error === "string") {
        console.log("Error is string");
        return error;
    }
    else if (error instanceof Error) {
        console.log("Error is instanceof Error");
        return error.message;
    }
    else {
        console.log("Error is unknown type");
        return error.toString();
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function forceGC(page, client) {
    for (let i = 0; i < 7; i++) {
        // await client.send('HeapProfiler.collectGarbage');
        await page.evaluate("window.gc()");
    }
}
async function runCPUBenchmark(framework, benchmark, benchmarkOptions) {
    let error = undefined;
    let warnings = [];
    let results = [];
    console.log("benchmarking", framework, benchmark.benchmarkInfo.id);
    let browser = null;
    try {
        browser = await startBrowser(benchmarkOptions);
        for (let i = 0; i < benchmarkOptions.batchSize; i++) {
            let page = await browser.newPage();
            // if (config.LOG_DETAILS) {
            page.on("console", (msg) => {
                for (let i = 0; i < msg.args().length; ++i)
                    console.log(`BROWSER: ${msg.args()[i]}`);
            });
            // }
            let client = await page.context().newCDPSession(page);
            // await client.send("Performance.enable");
            await page.goto(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`, {
                waitUntil: "networkidle",
            });
            console.log("initBenchmark Playwright");
            await initBenchmark(browser, page, benchmark, framework);
            let categories = ["blink.user_timing", "devtools.timeline", "disabled-by-default-devtools.timeline"];
            await forceGC(page);
            let throttleCPU = slowDownFactor(benchmark.benchmarkInfo.id, benchmarkOptions.allowThrottling);
            if (throttleCPU) {
                console.log("CPU slowdown", throttleCPU);
                await client.send("Emulation.setCPUThrottlingRate", { rate: throttleCPU });
            }
            await browser.startTracing(page, {
                path: fileNameTrace(framework, benchmark.benchmarkInfo, i, benchmarkOptions),
                screenshots: false,
                categories: categories,
            });
            await runBenchmark(browser, page, benchmark, framework);
            await wait(40);
            await browser.stopTracing();
            if (throttleCPU) {
                await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });
            }
            let result = await computeResultsCPU(fileNameTrace(framework, benchmark.benchmarkInfo, i, benchmarkOptions));
            let resultScript = await computeResultsJS(result, config, fileNameTrace(framework, benchmark.benchmarkInfo, i, benchmarkOptions));
            let resultPaint = await computeResultsPaint(result, config, fileNameTrace(framework, benchmark.benchmarkInfo, i, benchmarkOptions));
            let res = { total: result.duration, script: resultScript, paint: resultPaint };
            results.push(res);
            console.log(`duration for ${framework.name} and ${benchmark.benchmarkInfo.id}: ${JSON.stringify(res)}`);
            if (result.duration < 0)
                throw new Error(`duration ${result} < 0`);
            try {
                if (page) {
                    await page.close();
                }
            }
            catch (error) {
                console.log("ERROR closing page", error);
            }
        }
        return { error, warnings, result: results };
    }
    catch (error) {
        console.log("ERROR", error);
        return { error: convertError(error), warnings };
    }
    finally {
        try {
            if (browser) {
                await browser.close();
            }
        }
        catch (error) {
            console.log("ERROR cleaning up driver", error);
        }
    }
}
async function runMemBenchmark(framework, benchmark, benchmarkOptions) {
    let error = undefined;
    let warnings = [];
    let results = [];
    console.log("benchmarking", framework, benchmark.benchmarkInfo.id);
    let browser = null;
    try {
        browser = await startBrowser(benchmarkOptions);
        const page = await browser.newPage();
        for (let i = 0; i < benchmarkOptions.batchSize; i++) {
            if (config.LOG_DETAILS) {
                page.on("console", (msg) => {
                    for (let i = 0; i < msg.args().length; ++i)
                        console.log(`BROWSER: ${msg.args()[i]}`);
                });
            }
            await page.goto(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`, {
                waitUntil: "networkidle",
            });
            // await (driver as any).sendDevToolsCommand('Network.enable');
            // await (driver as any).sendDevToolsCommand('Network.emulateNetworkConditions', {
            //     offline: false,
            //     latency: 200, // ms
            //     downloadThroughput: 780 * 1024 / 8, // 780 kb/s
            //     uploadThroughput: 330 * 1024 / 8, // 330 kb/s
            // });
            console.log("initBenchmark");
            let client = await page.context().newCDPSession(page);
            await client.send("Performance.enable");
            await initBenchmark(browser, page, benchmark, framework);
            console.log("runBenchmark");
            await runBenchmark(browser, page, benchmark, framework);
            await forceGC(page, client);
            await wait(40);
            // let result = (await client.send('Performance.getMetrics')).metrics.filter((m) => m.name==='JSHeapUsedSize')[0].value / 1024 / 1024;
            let result = (await page.evaluate("performance.measureUserAgentSpecificMemory()")).bytes / 1024 / 1024;
            console.log("afterBenchmark ");
            results.push(result);
            console.log(`memory result for ${framework.name} and ${benchmark.benchmarkInfo.id}: ${result}`);
            if (result < 0)
                throw new Error(`memory result ${result} < 0`);
        }
        await page.close();
        await browser.close();
        return { error, warnings, result: results };
    }
    catch (error) {
        console.log("ERROR", error);
        try {
            if (browser) {
                await browser.close();
            }
        }
        catch (error) {
            console.log("ERROR cleaning up driver", error);
        }
        return { error: convertError(error), warnings };
    }
}
export async function executeBenchmark(framework, benchmarkId, benchmarkOptions) {
    let runBenchmarks = benchmarks.filter((b) => benchmarkId === b.benchmarkInfo.id && (b instanceof CPUBenchmarkPlaywright || b instanceof MemBenchmarkPlaywright));
    let benchmark = runBenchmarks[0];
    let errorAndWarnings;
    if (benchmark.type == BenchmarkType.CPU) {
        errorAndWarnings = await runCPUBenchmark(framework, benchmark, benchmarkOptions);
    }
    else {
        errorAndWarnings = await runMemBenchmark(framework, benchmark, benchmarkOptions);
    }
    if (config.LOG_DEBUG)
        console.log("benchmark finished - got errors promise", errorAndWarnings);
    return errorAndWarnings;
}
process.on("message", (msg) => {
    config = msg.config;
    console.log("START PLAYWRIGHT BENCHMARK.");
    let { framework, benchmarkId, benchmarkOptions, } = msg;
    executeBenchmark(framework, benchmarkId, benchmarkOptions)
        .then((result) => {
        console.log("* success", result);
        process.send(result);
        process.exit(0);
    })
        .catch((error) => {
        console.log("CATCH: Error in forkedBenchmarkRunner", error);
        process.send({ error: convertError(error) });
        process.exit(0);
    });
});
//# sourceMappingURL=forkedBenchmarkRunnerPlaywright.js.map