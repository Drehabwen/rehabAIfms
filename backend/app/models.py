from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Landmark(BaseModel):
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0


class PoseFrame(BaseModel):
    version: Literal[1]
    sequence: int = Field(ge=0)
    timestampMs: float = Field(ge=0)
    landmarks: list[Landmark]

    @field_validator("landmarks")
    @classmethod
    def require_full_pose(cls, landmarks: list[Landmark]) -> list[Landmark]:
        if len(landmarks) < 33:
            raise ValueError("MediaPipe Pose requires at least 33 landmarks")
        return landmarks


class Quality(BaseModel):
    valid: bool
    score: float
    issue: str | None = None


class FrontalMetrics(BaseModel):
    leftKneeAngle: float
    rightKneeAngle: float
    averageKneeAngle: float
    kneeAngleAsymmetry: float
    kneeDistanceRatio: float
    leftValgusPercent: float
    rightValgusPercent: float
    pelvisTiltDeg: float
    shoulderTiltDeg: float
    trunkLateralLeanDeg: float
    centerShiftPercent: float
    kneeWobblePercent: float


class FrameAnalysis(BaseModel):
    motion: Literal["finding-subject", "standing", "descending", "bottom", "ascending", "holding"]
    depthProgress: float
    symmetryScore: float
    warnings: list[str]


class TimelinePoint(BaseModel):
    second: float
    kneeDistanceRatio: float
    kneeAngleAsymmetry: float
    centerShiftPercent: float
    maxValgusPercent: float
    kneeWobblePercent: float
    pelvisTiltDeg: float
    trunkLateralLeanDeg: float


class RepetitionSummary(BaseModel):
    repId: int
    startedAtMs: float
    bottomAtMs: float
    completedAtMs: float
    durationMs: float
    minKneeAngle: float
    maxDepthPercent: float = 0


class SessionEnd(BaseModel):
    type: Literal["session-end-v1"]
    durationMs: float = Field(ge=0)
    repetitions: int = Field(ge=0)
    partialRepetitions: int = Field(ge=0)
    reps: list[RepetitionSummary]


class SessionReport(BaseModel):
    type: Literal["squat-session-report-v1"] = "squat-session-report-v1"
    durationMs: float
    repetitions: int
    partialRepetitions: int
    validFrameRate: float
    qualityLevel: Literal["good", "caution", "low"]
    qualityMessage: str
    medianKneeDistanceRatio: float | None
    p95KneeAngleAsymmetry: float | None
    p95CenterShiftPercent: float | None
    p95ValgusPercent: float | None
    p95KneeWobblePercent: float | None
    kneeStabilityScore: float | None
    kneeSynchronyScore: float | None
    repetitionConsistencyScore: float | None
    p95PelvisTiltDeg: float | None
    p95TrunkLateralLeanDeg: float | None
    symmetryScore: float | None
    recommendations: list[str]
    warningCounts: dict[str, int]
    timeline: list[TimelinePoint]
    reps: list[RepetitionSummary]


class AnalysisResult(BaseModel):
    type: Literal["squat-analysis-v1"] = "squat-analysis-v1"
    sequence: int
    timestampMs: float
    quality: Quality
    metrics: FrontalMetrics | None
    analysis: FrameAnalysis
    timelinePoint: TimelinePoint | None = None
