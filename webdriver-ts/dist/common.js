/*
  RESULTS_DIRECTORY: "results",
  TRACES_DIRECTORY: "traces",
  BROWSER: "chrome",
  HOST: 'localhost',
*/
export var BenchmarkRunner;
(function (BenchmarkRunner) {
    BenchmarkRunner["PUPPETEER"] = "puppeteer";
    BenchmarkRunner["PLAYWRIGHT"] = "playwright";
    BenchmarkRunner["WEBDRIVER_CDP"] = "webdrivercdp";
    BenchmarkRunner["WEBDRIVER_AFTERFRAME"] = "webdriver-afterframe";
})(BenchmarkRunner || (BenchmarkRunner = {}));
export let config = {
    NUM_ITERATIONS_FOR_BENCHMARK_CPU: 15,
    NUM_ITERATIONS_FOR_BENCHMARK_CPU_DROP_SLOWEST_COUNT: 0, // drop the # of slowest results
    NUM_ITERATIONS_FOR_BENCHMARK_MEM: 1,
    NUM_ITERATIONS_FOR_BENCHMARK_STARTUP: 1,
    NUM_ITERATIONS_FOR_BENCHMARK_SIZE: 1,
    TIMEOUT: 60 * 1000,
    LOG_PROGRESS: true,
    LOG_DETAILS: false,
    LOG_DEBUG: false,
    LOG_TIMELINE: false,
    EXIT_ON_ERROR: null, // set from command line
    STARTUP_DURATION_FROM_EVENTLOG: true,
    STARTUP_SLEEP_DURATION: 1000,
    WRITE_RESULTS: true,
    ALLOW_BATCHING: true,
    BENCHMARK_RUNNER: BenchmarkRunner.PUPPETEER,
};
const matchAll = () => true;
async function fetchFrameworks(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Fetch error: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.log(error);
        throw new Error(error);
    }
}
export async function initializeFrameworks(benchmarkOptions, matchPredicate = matchAll) {
    var _a, _b;
    let lsResult;
    const lsUrl = `http://${benchmarkOptions.host}:${benchmarkOptions.port}/ls`;
    try {
        lsResult = await fetchFrameworks(lsUrl);
    }
    catch (error) {
        throw new Error(error);
    }
    let frameworks = [];
    for (let ls of lsResult) {
        let frameworkVersionInformation = ls;
        let fullName = frameworkVersionInformation.type + "/" + frameworkVersionInformation.directory;
        if (matchPredicate(fullName)) {
            frameworks.push({
                name: frameworkVersionInformation.directory,
                fullNameWithKeyedAndVersion: frameworkVersionInformation.frameworkVersionString,
                uri: "frameworks/" +
                    fullName +
                    (frameworkVersionInformation.customURL ? frameworkVersionInformation.customURL : ""),
                keyed: frameworkVersionInformation.type === "keyed",
                useShadowRoot: !!frameworkVersionInformation.useShadowRoot,
                useRowShadowRoot: !!frameworkVersionInformation.useRowShadowRoot,
                shadowRootName: frameworkVersionInformation.shadowRootName,
                buttonsInShadowRoot: !!frameworkVersionInformation.buttonsInShadowRoot,
                issues: ((_a = frameworkVersionInformation.issues) !== null && _a !== void 0 ? _a : []).map(Number),
                frameworkHomeURL: (_b = frameworkVersionInformation.frameworkHomeURL) !== null && _b !== void 0 ? _b : "",
            });
        }
    }
    if (config.LOG_DETAILS) {
        console.log("All available frameworks: ");
        console.log(frameworks.map((fd) => fd.fullNameWithKeyedAndVersion));
    }
    return frameworks;
}
//# sourceMappingURL=common.js.map