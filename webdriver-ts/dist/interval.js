export function isContained(testIv, otherIv) {
    return testIv.start >= otherIv.start && testIv.end <= otherIv.end;
}
export function newContainedInterval(outerIv, intervals) {
    let cleanedUp = [];
    let isContainedRes = intervals.some((iv) => isContained(outerIv, iv));
    if (!isContainedRes) {
        cleanedUp.push(outerIv);
    }
    for (let iv of intervals) {
        let isContainedIv = isContained(iv, outerIv);
        if (!isContainedIv) {
            cleanedUp.push(iv);
        }
    }
    return cleanedUp;
}
//# sourceMappingURL=interval.js.map