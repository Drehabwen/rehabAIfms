import math

from .models import AnalysisResult, FrameAnalysis, FrontalMetrics, Landmark, PoseFrame, Quality, SessionEnd, SessionReport, TimelinePoint

LEFT = {"shoulder": 11, "hip": 23, "knee": 25, "ankle": 27}
RIGHT = {"shoulder": 12, "hip": 24, "knee": 26, "ankle": 28}
REQUIRED = tuple(LEFT.values()) + tuple(RIGHT.values())


def _distance(a: Landmark, b: Landmark) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def _angle(a: Landmark, vertex: Landmark, c: Landmark) -> float:
    ab = (a.x - vertex.x, a.y - vertex.y)
    cb = (c.x - vertex.x, c.y - vertex.y)
    denominator = math.hypot(*ab) * math.hypot(*cb)
    if denominator < 1e-9:
        return 180.0
    cosine = max(-1.0, min(1.0, (ab[0] * cb[0] + ab[1] * cb[1]) / denominator))
    return math.degrees(math.acos(cosine))


def _line_angle(a: Landmark, b: Landmark) -> float:
    return math.degrees(math.atan2(b.y - a.y, b.x - a.x))


def _percentile(values: list[float], quantile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * quantile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def _valgus_percent(hip: Landmark, knee: Landmark, ankle: Landmark, center_x: float) -> float:
    dy = ankle.y - hip.y
    interpolation = 0.5 if abs(dy) < 1e-9 else (knee.y - hip.y) / dy
    expected_x = hip.x + interpolation * (ankle.x - hip.x)
    inward_sign = 1.0 if center_x > expected_x else -1.0
    leg_length = _distance(hip, knee) + _distance(knee, ankle)
    return ((knee.x - expected_x) * inward_sign / max(leg_length, 1e-6)) * 100


class FrontalSquatAnalyzer:
    def __init__(self, min_visibility: float = 0.6, smoothing_alpha: float = 0.35) -> None:
        self.min_visibility = min_visibility
        self.smoothing_alpha = smoothing_alpha
        self._knee_angle: float | None = None
        self._started_at: float | None = None
        self._window_started_at: float | None = None
        self._window: list[FrontalMetrics] = []
        self._metrics: list[FrontalMetrics] = []
        self._timeline: list[TimelinePoint] = []
        self._warning_counts: dict[str, int] = {}
        self._total_frames = 0
        self._valid_frames = 0
        self._left_knee_offsets: list[float] = []
        self._right_knee_offsets: list[float] = []

    def _timeline_point(self, timestamp_ms: float, metrics: FrontalMetrics) -> TimelinePoint | None:
        self._started_at = timestamp_ms if self._started_at is None else self._started_at
        self._window_started_at = timestamp_ms if self._window_started_at is None else self._window_started_at
        self._window.append(metrics)
        if timestamp_ms - self._window_started_at < 1000:
            return None
        count = len(self._window)
        point = TimelinePoint(
            second=(timestamp_ms - self._started_at) / 1000,
            kneeDistanceRatio=sum(item.kneeDistanceRatio for item in self._window) / count,
            kneeAngleAsymmetry=sum(item.kneeAngleAsymmetry for item in self._window) / count,
            centerShiftPercent=sum(item.centerShiftPercent for item in self._window) / count,
            maxValgusPercent=max(max(item.leftValgusPercent, item.rightValgusPercent) for item in self._window),
            kneeWobblePercent=sum(item.kneeWobblePercent for item in self._window) / count,
        )
        self._window = []
        self._window_started_at = timestamp_ms
        self._timeline.append(point)
        return point

    def report(self, session: SessionEnd) -> SessionReport:
        metrics = self._metrics
        valid_rate = (self._valid_frames / self._total_frames * 100) if self._total_frames else 0
        quality_level = "good" if valid_rate >= 85 else "caution" if valid_rate >= 70 else "low"
        quality_message = {
            "good": "采集质量良好，报告可用于本组动作复盘。",
            "caution": "部分时段关键点不稳定，请结合趋势谨慎解读。",
            "low": "有效画面不足，本报告仅作参考；建议调整机位后重新采集。",
        }[quality_level]
        median_ratio = _percentile([item.kneeDistanceRatio for item in metrics], 0.5)
        p95_asymmetry = _percentile([item.kneeAngleAsymmetry for item in metrics], 0.95)
        p95_shift = _percentile([abs(item.centerShiftPercent) for item in metrics], 0.95)
        p95_valgus = _percentile([max(item.leftValgusPercent, item.rightValgusPercent) for item in metrics], 0.95)
        p95_wobble = _percentile([item.kneeWobblePercent for item in metrics], 0.95)
        stability = max(0.0, 100 - (p95_wobble / 8) * 100) if p95_wobble is not None and quality_level != "low" else None
        symmetry = max(0.0, 100 - (p95_asymmetry / 30) * 100) if p95_asymmetry is not None and quality_level != "low" else None
        recommendations: list[str] = []
        if quality_level != "good":
            recommendations.append("退后半步并保持全身入镜，避免遮挡髋、膝和脚踝。")
        if p95_shift is not None and p95_shift > 10:
            recommendations.append("下蹲时保持骨盆居中，避免持续向一侧偏移。")
        if p95_wobble is not None and p95_wobble > 2.5:
            recommendations.append("降低动作速度，让双膝沿稳定轨迹下降和站起，减少左右晃动。")
        elif p95_valgus is not None and p95_valgus > 6:
            recommendations.append("膝部轨迹基本稳定，但存在向内偏移；注意膝盖朝向脚尖。")
        if session.partialRepetitions:
            recommendations.append("下一组优先完成稳定的底部位置，再开始站起。")
        if not recommendations:
            recommendations.append("动作整体稳定，可在保持质量的前提下逐步增加次数。")
        return SessionReport(
            durationMs=session.durationMs,
            repetitions=session.repetitions,
            partialRepetitions=session.partialRepetitions,
            validFrameRate=valid_rate,
            qualityLevel=quality_level,
            qualityMessage=quality_message,
            medianKneeDistanceRatio=median_ratio,
            p95KneeAngleAsymmetry=p95_asymmetry,
            p95CenterShiftPercent=p95_shift,
            p95ValgusPercent=p95_valgus,
            p95KneeWobblePercent=p95_wobble,
            kneeStabilityScore=stability,
            symmetryScore=symmetry,
            recommendations=recommendations,
            warningCounts=self._warning_counts,
            timeline=self._timeline,
            reps=session.reps,
        )

    def analyze(self, frame: PoseFrame) -> AnalysisResult:
        self._total_frames += 1
        score = min(frame.landmarks[index].visibility for index in REQUIRED)
        if score < self.min_visibility:
            return AnalysisResult(
                sequence=frame.sequence,
                timestampMs=frame.timestampMs,
                quality=Quality(valid=False, score=score, issue="low-visibility"),
                metrics=None,
                analysis=FrameAnalysis(
                    motion="finding-subject", depthProgress=0, symmetryScore=0,
                    warnings=["full_body_not_visible"],
                ),
            )

        points = frame.landmarks
        self._valid_frames += 1
        left_angle = _angle(points[LEFT["hip"]], points[LEFT["knee"]], points[LEFT["ankle"]])
        right_angle = _angle(points[RIGHT["hip"]], points[RIGHT["knee"]], points[RIGHT["ankle"]])
        raw_average = (left_angle + right_angle) / 2
        previous = self._knee_angle
        average = raw_average if previous is None else self.smoothing_alpha * raw_average + (1 - self.smoothing_alpha) * previous
        self._knee_angle = average

        hip_center_x = (points[LEFT["hip"]].x + points[RIGHT["hip"]].x) / 2
        ankle_center_x = (points[LEFT["ankle"]].x + points[RIGHT["ankle"]].x) / 2
        ankle_width = abs(points[LEFT["ankle"]].x - points[RIGHT["ankle"]].x)
        knee_width = abs(points[LEFT["knee"]].x - points[RIGHT["knee"]].x)
        hip_width = abs(points[LEFT["hip"]].x - points[RIGHT["hip"]].x)
        stance_width = max(ankle_width, hip_width * 0.75, 0.05)
        left_knee_offset = (points[LEFT["knee"]].x - points[LEFT["ankle"]].x) / stance_width * 100
        right_knee_offset = (points[RIGHT["ankle"]].x - points[RIGHT["knee"]].x) / stance_width * 100
        self._left_knee_offsets.append(left_knee_offset)
        self._right_knee_offsets.append(right_knee_offset)
        self._left_knee_offsets = self._left_knee_offsets[-3:]
        self._right_knee_offsets = self._right_knee_offsets[-3:]
        knee_wobble = 0.0
        if len(self._left_knee_offsets) == 3:
            left_acceleration = abs(self._left_knee_offsets[2] - 2 * self._left_knee_offsets[1] + self._left_knee_offsets[0])
            right_acceleration = abs(self._right_knee_offsets[2] - 2 * self._right_knee_offsets[1] + self._right_knee_offsets[0])
            knee_wobble = max(left_acceleration, right_acceleration)
        asymmetry = abs(left_angle - right_angle)
        left_valgus = _valgus_percent(points[LEFT["hip"]], points[LEFT["knee"]], points[LEFT["ankle"]], hip_center_x)
        right_valgus = _valgus_percent(points[RIGHT["hip"]], points[RIGHT["knee"]], points[RIGHT["ankle"]], hip_center_x)

        if average >= 155:
            motion = "standing"
        elif average <= 120:
            motion = "bottom"
        elif previous is None or abs(average - previous) < 0.5:
            motion = "holding"
        elif average < previous:
            motion = "descending"
        else:
            motion = "ascending"

        warnings: list[str] = []
        if max(left_valgus, right_valgus) > 6:
            warnings.append("knee_valgus")
        center_shift = ((hip_center_x - ankle_center_x) / stance_width) * 100
        if abs(center_shift) > 10:
            warnings.append("lateral_weight_shift")
        if asymmetry > 12:
            warnings.append("knee_angle_asymmetry")
        if knee_wobble > 2.5:
            warnings.append("knee_instability")

        metrics = FrontalMetrics(
            leftKneeAngle=left_angle,
            rightKneeAngle=right_angle,
            averageKneeAngle=average,
            kneeAngleAsymmetry=asymmetry,
            kneeDistanceRatio=knee_width / stance_width,
            leftValgusPercent=left_valgus,
            rightValgusPercent=right_valgus,
            pelvisTiltDeg=_line_angle(points[LEFT["hip"]], points[RIGHT["hip"]]),
            shoulderTiltDeg=_line_angle(points[LEFT["shoulder"]], points[RIGHT["shoulder"]]),
            trunkLateralLeanDeg=math.degrees(math.atan2(
                ((points[LEFT["shoulder"]].x + points[RIGHT["shoulder"]].x) / 2) - hip_center_x,
                abs(((points[LEFT["shoulder"]].y + points[RIGHT["shoulder"]].y) / 2) - ((points[LEFT["hip"]].y + points[RIGHT["hip"]].y) / 2)),
            )),
            centerShiftPercent=center_shift,
            kneeWobblePercent=knee_wobble,
        )
        self._metrics.append(metrics)
        for warning in warnings:
            self._warning_counts[warning] = self._warning_counts.get(warning, 0) + 1
        return AnalysisResult(
            sequence=frame.sequence,
            timestampMs=frame.timestampMs,
            quality=Quality(valid=True, score=score),
            metrics=metrics,
            analysis=FrameAnalysis(
                motion=motion,
                depthProgress=max(0, min(1, (170 - average) / 50)),
                symmetryScore=max(0, 100 - (asymmetry / 30) * 100),
                warnings=warnings,
            ),
            timelinePoint=self._timeline_point(frame.timestampMs, metrics),
        )
