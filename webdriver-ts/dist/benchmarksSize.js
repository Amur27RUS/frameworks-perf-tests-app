import * as benchmarksCommon from "./benchmarksCommon.js";
import { BenchmarkType } from "./benchmarksCommon.js";
let toKb = (x) => x / 1024;
export const benchUncompressedSize = {
    id: "41_size-uncompressed",
    label: "uncompressed size",
    description: "uncompressed size of all implementation files (excluding /css and http headers)",
    type: BenchmarkType.SIZE,
    fn: (sizeInfo) => Number(toKb(sizeInfo.size_uncompressed).toFixed(1)),
};
export const benchCompressedSize = {
    id: "42_size-compressed",
    label: "compressed size",
    description: "brotli compressed size of all implementation files (excluding /css and http headers)",
    type: BenchmarkType.SIZE,
    fn: (sizeInfo) => Number(toKb(sizeInfo.size_compressed).toFixed(1)),
};
export const benchFP = {
    id: "43_first-paint",
    label: "first paint",
    description: "first paint",
    type: BenchmarkType.SIZE,
    fn: (sizeInfo) => Number(sizeInfo.fp.toFixed(1)),
};
// export const benchFCP: benchmarksCommon.SizeBenchmarkInfo = {
//   id: "44_first-contentful-paint",
//   label: "first contentful paint",
//   description: () =>
//     "first contentful paint",
//   type: BenchmarkType.SIZE,
//   fn: (sizeInfo) => Number(sizeInfo.fcp.toFixed(1)),
// };
export const subbenchmarks = [
    benchUncompressedSize,
    benchCompressedSize,
    benchFP,
    // benchFCP,
];
export class BenchmarkSize {
    constructor() {
        this.type = BenchmarkType.SIZE_MAIN;
        this.benchmarkInfo = benchmarksCommon.sizeBenchmarkInfos[benchmarksCommon.Benchmark._40];
        this.subbenchmarks = subbenchmarks;
    }
}
export const benchSize = new BenchmarkSize();
export const benchmarks = [benchSize];
//# sourceMappingURL=benchmarksSize.js.map