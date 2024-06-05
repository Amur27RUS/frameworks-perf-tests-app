import * as fs from "node:fs";
import { BenchmarkType, fileName } from "./benchmarksCommon.js";
import * as benchmarksLighthouse from "./benchmarksLighthouse.js";
import * as benchmarksSize from "./benchmarksSize.js";
import { stats } from "./stats.js";
export function writeResults(resultDir, res) {
    switch (res.type) {
        case BenchmarkType.STARTUP:
            for (let subbench of benchmarksLighthouse.subbenchmarks) {
                let results = res.results.filter((r) => r.benchmark.id == subbench.id).map((r) => r.result);
                createResultFile(resultDir, results, res.framework, subbench);
            }
            break;
        case BenchmarkType.SIZE:
            for (let subbench of benchmarksSize.subbenchmarks) {
                let results = res.results.filter((r) => r.benchmark.id == subbench.id).map((r) => r.result);
                createResultFile(resultDir, results, res.framework, subbench);
            }
            break;
        case BenchmarkType.CPU:
            createResultFile(resultDir, { total: res.results.map((r) => Number(r.total.toFixed(1))),
                script: res.results.map((r) => Number(r.script.toFixed(1))),
                paint: res.results.map((r) => Number(r.paint.toFixed(1))),
            }, res.framework, res.benchmark);
            break;
        case BenchmarkType.MEM:
            createResultFile(resultDir, res.results, res.framework, res.benchmark);
            break;
    }
}
function createResultFile(resultDir, data, framework, benchmark) {
    let type = "";
    switch (benchmark.type) {
        case BenchmarkType.CPU:
            type = "cpu";
            break;
        case BenchmarkType.MEM:
            type = "memory";
            break;
        case BenchmarkType.STARTUP:
            type = "startup";
            break;
        case BenchmarkType.SIZE:
            type = "size";
            break;
    }
    let convertResult = (label, data) => {
        let res = stats(data);
        console.log(`result ${fileName(framework, benchmark)} ${label} ${JSON.stringify(res)}`);
        return res;
    };
    if (Array.isArray(data)) {
        let result = {
            framework: framework.fullNameWithKeyedAndVersion,
            keyed: framework.keyed,
            benchmark: benchmark.id,
            type: type,
            values: { DEFAULT: convertResult("", data) },
        };
        fs.writeFileSync(`${resultDir}/${fileName(framework, benchmark)}`, JSON.stringify(result), {
            encoding: "utf8",
        });
    }
    else {
        let values = {};
        for (let key of Object.keys(data)) {
            values[key] = convertResult(key, data[key]);
        }
        let result = {
            framework: framework.fullNameWithKeyedAndVersion,
            keyed: framework.keyed,
            benchmark: benchmark.id,
            type: type,
            values,
        };
        fs.writeFileSync(`${resultDir}/${fileName(framework, benchmark)}`, JSON.stringify(result), {
            encoding: "utf8",
        });
    }
}
//# sourceMappingURL=writeResults.js.map