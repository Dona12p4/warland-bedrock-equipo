"""Reduce numeric linear Bedrock tracks with a bounded interpolation error."""
from bisect import bisect_right


def value_at(points, time):
    times = [p[0] for p in points]
    i = bisect_right(times, time)
    if i == 0:
        return points[0][1]
    if i == len(points):
        return points[-1][1]
    ta, a = points[i - 1]
    tb, b = points[i]
    u = (time - ta) / (tb - ta)
    return [x + (y - x) * u for x, y in zip(a, b)]


def compact_track(keys, tolerance=0.00001):
    points = sorted((float(k), v) for k, v in keys.items())
    if len(points) < 3 or any(not isinstance(v, list) or any(not isinstance(x, (int, float)) for x in v) for _, v in points):
        return keys
    keep = {0, len(points) - 1}
    pending = [(0, len(points) - 1)]
    while pending:
        start, end = pending.pop()
        if end <= start + 1:
            continue
        ta, a = points[start]
        tb, b = points[end]
        worst, index = -1, None
        for i in range(start + 1, end):
            t, v = points[i]
            u = (t - ta) / (tb - ta)
            error = max(abs(x - (y + (z - y) * u)) for x, y, z in zip(v, a, b))
            if error > worst:
                worst, index = error, i
        if worst > tolerance:
            keep.add(index)
            pending.extend([(start, index), (index, end)])
    reduced = [points[i] for i in sorted(keep)]
    # For two piecewise-linear functions the maximum error is attained at a
    # breakpoint. Every original breakpoint is checked before saving output.
    error = max(abs(x - y) for t, v in points for x, y in zip(v, value_at(reduced, t)))
    assert error <= tolerance + 1e-10, error
    return {str(t): v for t, v in reduced}


def compact_clip(clip):
    before = after = 0
    for channels in clip['bones'].values():
        for channel, keys in list(channels.items()):
            if isinstance(keys, dict):
                before += len(keys)
                channels[channel] = compact_track(keys)
                after += len(channels[channel])
    return {'originalKeyframes': before, 'retainedKeyframes': after,
            'maximumLinearError': 0.00001, 'allOriginalBreakpointsVerified': True}
