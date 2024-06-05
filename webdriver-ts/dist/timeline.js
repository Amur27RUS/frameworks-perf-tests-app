import { readFile } from "node:fs/promises";
import * as fs from "node:fs";
import * as R from "ramda";
import { BenchmarkType } from "./benchmarksCommon.js";
import { config } from "./common.js";
import { writeResults } from "./writeResults.js";
export function extractRelevantEvents(entries) {
    let filteredEvents = [];
    let click_start = 0;
    let click_end = 0;
    entries.forEach((x) => {
        let e = x;
        if (config.LOG_DEBUG)
            console.log(JSON.stringify(e));
        if (e.name === "EventDispatch") {
            if (e.args.data.type === "click") {
                if (config.LOG_DETAILS)
                    console.log("CLICK", +e.ts);
                click_start = +e.ts;
                click_end = +e.ts + e.dur;
                filteredEvents.push({ type: "click", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
            }
            else if (e.args.data.type === "mousedown") {
                if (config.LOG_DETAILS)
                    console.log("MOUSEDOWN", +e.ts);
                filteredEvents.push({ type: "mousedown", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
            }
        }
        else if (e.name === "Layout" && e.ph === "X") {
            if (config.LOG_DETAILS)
                console.log("Layout", +e.ts, +e.ts + e.dur - click_start);
            filteredEvents.push({ type: "layout", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
        }
        else if (e.name === "FunctionCall" && e.ph === "X") {
            if (config.LOG_DETAILS)
                console.log("FunctionCall", +e.ts, +e.ts + e.dur - click_start);
            filteredEvents.push({ type: "functioncall", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
        }
        else if (e.name === "HitTest" && e.ph === "X") {
            if (config.LOG_DETAILS)
                console.log("HitTest", +e.ts, +e.ts + e.dur - click_start);
            filteredEvents.push({ type: "hittest", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
        }
        else if (e.name === "Commit" && e.ph === "X") {
            if (config.LOG_DETAILS)
                console.log("COMMIT PAINT", +e.ts, +e.ts + e.dur - click_start);
            filteredEvents.push({ type: "commit", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
        }
        else if (e.name === "Paint" && e.ph === "X") {
            if (config.LOG_DETAILS)
                console.log("PAINT", +e.ts, +e.ts + e.dur - click_start);
            filteredEvents.push({ type: "paint", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
        }
        else if (e.name === "FireAnimationFrame" && e.ph === "X") {
            if (config.LOG_DETAILS)
                console.log("FireAnimationFrame", +e.ts, +e.ts - click_start);
            filteredEvents.push({ type: "fireAnimationFrame", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, pid: e.pid, evt: JSON.stringify(e) });
        }
        else if (e.name === "TimerFire" && e.ph === "X") {
            if (config.LOG_DETAILS)
                console.log("TimerFire", +e.ts, +e.ts - click_start, +e.ts - click_end);
            filteredEvents.push({ type: "timerFire", ts: +e.ts, dur: 0, end: +e.ts, pid: e.pid, evt: JSON.stringify(e) });
        }
        else if (e.name === "RequestAnimationFrame") {
            if (config.LOG_DETAILS)
                console.log("RequestAnimationFrame", +e.ts, +e.ts - click_start, +e.ts - click_end);
            filteredEvents.push({ type: "requestAnimationFrame", ts: +e.ts, dur: 0, end: +e.ts, pid: e.pid, evt: JSON.stringify(e) });
        }
    });
    return filteredEvents;
}
async function fetchEventsFromPerformanceLog(fileName) {
    let timingResults = [];
    let entries = [];
    do {
        let contents = await readFile(fileName, { encoding: "utf8" });
        let json = JSON.parse(contents);
        let entries = json["traceEvents"];
        const filteredEvents = extractRelevantEvents(entries);
        timingResults = timingResults.concat(filteredEvents);
    } while (entries.length > 0);
    return timingResults;
}
const traceJSEventNames = [
    "EventDispatch",
    "EvaluateScript",
    "v8.evaluateModule",
    "FunctionCall",
    "TimerFire",
    "FireIdleCallback",
    "FireAnimationFrame",
    "RunMicrotasks",
    "V8.Execute",
];
const tracePaintEventNames = [
    "UpdateLayoutTree",
    "Layout",
    "Commit",
    "Paint",
    "Layerize",
    "PrePaint"
    // including "PrePaint" causes longer durations as reported by chrome
];
export function extractRelevantTraceEvents(config, relevantEventNames, entries, includeClick) {
    let filteredEvents = [];
    entries.forEach((x) => {
        let e = x;
        if (config.LOG_DEBUG)
            console.log(JSON.stringify(e));
        if (e.name === "EventDispatch") {
            if (e.args.data.type === "click" && includeClick) {
                if (config.LOG_DETAILS)
                    console.log("CLICK", +e.ts);
                filteredEvents.push({ type: "click", ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur });
            }
        }
        else if (relevantEventNames.includes(e.name) && e.ph === "X") {
            filteredEvents.push({ type: e.name, ts: +e.ts, dur: +e.dur, end: +e.ts + e.dur, orig: JSON.stringify(e) });
        }
    });
    return filteredEvents;
}
async function fetchEventsFromTraceLog(config, fileName, relevantTraceEvents, includeClick) {
    let timingResults = [];
    let entries = [];
    do {
        let contents = await readFile(fileName, { encoding: "utf8" });
        let json = JSON.parse(contents);
        let entries = json["traceEvents"];
        const filteredEvents = extractRelevantTraceEvents(config, relevantTraceEvents, entries, includeClick);
        timingResults = timingResults.concat(filteredEvents);
    } while (entries.length > 0);
    return timingResults;
}
function type_eq(...requiredTypes) {
    return (e) => requiredTypes.includes(e.type);
}
function logEvents(events, click) {
    events.forEach((e) => {
        console.log("event", e.type, `${e.ts - click.ts} - ${e.end - click.ts}`, e.evt);
    });
}
export async function computeResultsCPU(fileName) {
    const perfLogEvents = await fetchEventsFromPerformanceLog(fileName);
    let events = R.sortBy((e) => e.end)(perfLogEvents);
    // Find mousedown event. This is the start of the benchmark
    let mousedowns = R.filter(type_eq("mousedown"))(events);
    // Invariant: There must be exactly one click event
    if (mousedowns.length === 0) {
        console.log("no mousedown event", fileName);
    }
    else if (mousedowns.length == 1) {
        console.log("one mousedown event", fileName);
    }
    else if (mousedowns.length > 1) {
        console.log("more than one mousedown event", fileName, events);
        throw "at most one mousedown event is expected";
    }
    // Find click event. This is the start of the benchmark
    let clicks = R.filter(type_eq("click"))(events);
    // Invariant: There must be exactly one click event
    if (clicks.length !== 1) {
        console.log("exactly one click event is expected", fileName, events);
        throw "exactly one click event is expected";
    }
    let click = clicks[0];
    // check is delay from mousedown to click it unusually long
    if (mousedowns.length > 0) {
        let mousedownToClick = click.ts - mousedowns[0].ts;
        if (mousedownToClick > 0) {
            console.log("mousedownToClick", mousedownToClick, fileName);
        }
        if (mousedownToClick > 10000) {
            console.log("difference between mousedown and click is unusually long", mousedownToClick, fileName);
            // throw "difference between mousedown and click is unusually long";
        }
    }
    // The PID for the click event. We"re dropping all events from other processes.
    let pid = click.pid;
    let eventsDuringBenchmark = R.filter((e) => e.ts > click.end || e.type === "click")(events);
    if (config.LOG_DETAILS)
        logEvents(eventsDuringBenchmark, click);
    let droppedNonMainProcessCommitEvents = false;
    let droppedNonMainProcessOtherEvents = false;
    let eventsOnMainThreadDuringBenchmark = R.filter((e) => e.pid === pid)(eventsDuringBenchmark);
    if (eventsOnMainThreadDuringBenchmark.length !== eventsDuringBenchmark.length) {
        let droppedEvents = R.filter((e) => e.pid !== pid)(events);
        if (R.any((e) => e.type === "commit")(droppedEvents)) {
            console.log("INFO: Dropping commit events from other processes", fileName);
            logEvents(droppedEvents, click);
            droppedNonMainProcessCommitEvents = true;
        }
        if (R.any((e) => e.type !== "commit")(droppedEvents)) {
            console.log("INFO: Dropping non-commit events from other processes", fileName);
            logEvents(droppedEvents, click);
            droppedNonMainProcessOtherEvents = true;
        }
    }
    let startFrom = R.filter(type_eq("click", "fireAnimationFrame", "timerFire", "layout", "functioncall"))(eventsOnMainThreadDuringBenchmark);
    // we're looking for the commit after this event
    let startFromEvent = startFrom.at(-1);
    if (config.LOG_DETAILS)
        console.log("DEBUG: searching for commit event after", startFromEvent, "for", fileName);
    let commit = R.find((e) => e.ts > startFromEvent.end)(R.filter(type_eq("commit"))(eventsOnMainThreadDuringBenchmark));
    let allCommitsAfterClick = R.filter(type_eq("commit"))(eventsOnMainThreadDuringBenchmark);
    let numberCommits = allCommitsAfterClick.length;
    if (!commit) {
        console.log("INFO: No commit event found according to filter", fileName);
        if (allCommitsAfterClick.length === 0) {
            console.log("ERROR: No commit event found for", fileName);
            throw "No commit event found for " + fileName;
        }
        else {
            commit = allCommitsAfterClick.at(-1);
        }
    }
    let maxDeltaBetweenCommits = (allCommitsAfterClick.at(-1).ts - allCommitsAfterClick[0].ts) / 1000.0;
    let duration = (commit.end - clicks[0].ts) / 1000.0;
    if (config.LOG_DEBUG)
        console.log("duration", duration);
    let layouts = R.filter(type_eq("layout"))(eventsOnMainThreadDuringBenchmark);
    // Adjust bogus delay for requestAnimationFrame
    let rafs_withinClick = R.filter((e) => e.ts >= click.ts && e.ts <= click.end)(R.filter(type_eq("requestAnimationFrame"))(events));
    let fafs = R.filter((e) => e.ts >= click.ts && e.ts < commit.ts)(R.filter(type_eq("fireAnimationFrame"))(events));
    let raf_long_delay = 0;
    if (rafs_withinClick.length > 0 && fafs.length > 0) {
        let waitDelay = (fafs[0].ts - click.end) / 1000.0;
        if (rafs_withinClick.length == 1 && fafs.length == 1) {
            if (waitDelay > 16) {
                let ignored = false;
                for (let e of layouts) {
                    if (e.ts < fafs[0].ts) {
                        console.log("IGNORING 1 raf, 1 faf, but layout before raf", waitDelay, fileName);
                        ignored = true;
                        break;
                    }
                }
                if (!ignored) {
                    raf_long_delay = waitDelay - 16;
                    duration = duration - raf_long_delay;
                    console.log("FOUND delay for 1 raf, 1 faf, but layout before raf", waitDelay, fileName);
                }
            }
            else {
                console.log("IGNORING delay < 16 msecs 1 raf, 1 faf", waitDelay, fileName);
            }
        }
        else if (fafs.length == 1) {
            throw ("Unexpected situation. Did not happen in the past. One fire animation frame, but non consistent request animation frames in " +
                fileName);
        }
        else {
            console.log(`IGNORING Bad case ${rafs_withinClick.length} raf, ${fafs.length} faf ${fileName}`);
        }
    }
    // Some checks
    //   if (layouts.length > 1) {
    //     console.log("ERROR: more than one layout event found",fileName);
    //     logEvents(eventsOnMainThreadDuringBenchmark, click);
    //     throw "exactly one layout event is expected";
    //   } else if (layoutEventMustBePresent && layouts.length == 0) {
    //     console.log("ERROR: exactly one layout event is expected, but there was none",fileName);
    //     logEvents(eventsOnMainThreadDuringBenchmark, click);
    //     throw "one layout event is expected";
    //   } else if (!layoutEventMustBePresent && layouts.length == 0) {
    //     // no layout event, so we use the click event as the start of the measurement
    //     onlyUsePaintEventsAfterLayout = click;
    //   } else {
    //     // only one layout event, so use this one
    //     onlyUsePaintEventsAfterLayout = layouts[0];
    // }
    return {
        tsStart: click.ts,
        tsEnd: commit.end,
        duration,
        layouts: layouts.length,
        raf_long_delay,
        droppedNonMainProcessCommitEvents,
        droppedNonMainProcessOtherEvents,
        maxDeltaBetweenCommits,
        numberCommits,
    };
}
function putIfAbsent(map, key, default_value) {
    if (map.get(key) === undefined) {
        map.set(key, default_value);
    }
}
export class PlausibilityCheck {
    constructor() {
        this.maxDeltaBetweenCommits = new Map();
        this.raf_long_delays = new Map();
        this.unnecessaryLayouts = new Set();
    }
    check(result, trace, framework, benchmarkInfo) {
        if (!benchmarkInfo.layoutEventRequired && result.layouts > 0) {
            this.unnecessaryLayouts.add(framework.fullNameWithKeyedAndVersion);
        }
        putIfAbsent(this.maxDeltaBetweenCommits, framework.fullNameWithKeyedAndVersion, 0);
        let val = this.maxDeltaBetweenCommits.get(framework.fullNameWithKeyedAndVersion);
        this.maxDeltaBetweenCommits.set(framework.fullNameWithKeyedAndVersion, Math.max(val, result.maxDeltaBetweenCommits));
        putIfAbsent(this.raf_long_delays, framework.fullNameWithKeyedAndVersion, 0);
        val = this.raf_long_delays.get(framework.fullNameWithKeyedAndVersion);
        this.raf_long_delays.set(framework.fullNameWithKeyedAndVersion, Math.max(val, result.raf_long_delay));
    }
    print() {
        console.log("\n==== Results of PlausibilityCheck:");
        if (this.maxDeltaBetweenCommits.size > 0) {
            console.log("Info: The following implementation had a unnecessary layout event for select row:");
            for (let [impl, maxDelay] of this.maxDeltaBetweenCommits.entries()) {
                if (maxDelay > 0)
                    console.log(` ${impl}: ${maxDelay}`);
            }
            console.log("  Interpretation: Just an information. Could be optimized, but not a bug in the implementation.");
        }
        if (this.raf_long_delays.size > 0) {
            console.log("Info: Some frameworks have a delay between raf and fire animation frame longer than 16 msecs. The correction was:");
            for (let [impl, maxDelay] of this.raf_long_delays.entries()) {
                if (maxDelay > 0)
                    console.log(` ${impl}: ${maxDelay}`);
            }
            console.log("  Interpretation: If the list contains more than just a few entries or large numbers the results should be checked");
        }
        if (this.maxDeltaBetweenCommits.size > 0) {
            console.log("Info: Implemenations with multiple commit events and max delay between both:");
            for (let [impl, maxDelay] of this.maxDeltaBetweenCommits.entries()) {
                if (maxDelay > 0)
                    console.log(` ${impl}: ${maxDelay}`);
            }
            console.log("  Interpretation: Those frameworks make measuring the duration of the benchmark difficult. The results should be checked occasionally for correctness.");
        }
    }
}
function isContained(testIv, otherIv) {
    return testIv.start >= otherIv.start && testIv.end <= otherIv.end;
}
function newContainedInterval(outer, intervals) {
    let outerIv = { start: outer.ts, end: outer.end, timingResult: outer };
    let cleanedUp = [];
    let isContainedRes = intervals.some((iv) => isContained(outerIv, iv));
    if (!isContainedRes) {
        cleanedUp.push(outerIv);
    }
    for (let iv of intervals) {
        if (iv.start < outer.ts || iv.end > outer.end) {
            cleanedUp.push(iv);
        }
    }
    return cleanedUp;
}
export function computeResultsJS(cpuTrace, config, fileName) {
    return computeResultsFromTrace(cpuTrace, config, fileName, traceJSEventNames, true);
}
export function computeResultsPaint(cpuTrace, config, fileName) {
    return computeResultsFromTrace(cpuTrace, config, fileName, tracePaintEventNames, false);
}
export async function computeResultsFromTrace(cpuTrace, config, fileName, relevantTraceEvents, includeClick) {
    const totalDuration = cpuTrace;
    const perfLogEvents = await fetchEventsFromTraceLog(config, fileName, relevantTraceEvents, includeClick);
    const eventsWithin = R.filter((e) => e.ts >= totalDuration.tsStart && e.ts <= totalDuration.tsEnd)(perfLogEvents);
    for (let ev of eventsWithin) {
        ev.ts -= totalDuration.tsStart;
        ev.end -= totalDuration.tsStart;
    }
    let intervals = [];
    for (let ev of eventsWithin) {
        intervals = newContainedInterval(ev, intervals);
    }
    if (config.LOG_DETAILS) {
        if (intervals.length > 1) {
            console.log(`*** More than 1 interval ${intervals.length} for ${fileName}`, intervals);
        }
        else {
            console.log(`1 interval for ${fileName}`, intervals);
        }
    }
    let res = intervals.reduce((p, c) => p + (c.end - c.start), 0) / 1000.0;
    return res;
}
export async function parseCPUTrace(benchmarkOptions, framework, benchmarkInfo, plausibilityCheck) {
    let results = [];
    for (let i = 0; i < benchmarkOptions.numIterationsForCPUBenchmarks + benchmarkInfo.additionalNumberOfRuns; i++) {
        let trace = `${fileNameTrace(framework, benchmarkInfo, i, benchmarkOptions)}`;
        if (fs.existsSync(trace)) {
            console.log("analyzing trace", trace);
            try {
                let result = await computeResultsCPU(trace);
                plausibilityCheck.check(result, trace, framework, benchmarkInfo);
                let resultJS = await computeResultsJS(result, config, trace);
                let resultPaint = await computeResultsPaint(result, config, trace);
                results.push({ total: result.duration, script: resultJS, paint: resultPaint });
                // console.log(result);
            }
            catch (error) {
                console.log(error);
            }
        }
        else {
            throw new Error(`Trace file ${trace} does not exist`);
        }
    }
    // results.sort((a: CPUBenchmarkResult, b: CPUBenchmarkResult) => a.total - b.total);
    // results = results.slice(0, config.NUM_ITERATIONS_FOR_BENCHMARK_CPU);
    await writeResults(benchmarkOptions.resultsDirectory, {
        framework: framework,
        benchmark: benchmarkInfo,
        results: results,
        type: BenchmarkType.CPU,
    });
}
export function fileNameTrace(framework, benchmark, run, benchmarkOptions) {
    return `${benchmarkOptions.tracesDirectory}/${framework.fullNameWithKeyedAndVersion}_${benchmark.id}_${run}.json`;
}
//# sourceMappingURL=timeline.js.map