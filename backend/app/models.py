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


class FrameAnalysis(BaseModel):
    motion: Literal["finding-subject", "standing", "descending", "bottom", "ascending", "holding"]
    depthProgress: float
    symmetryScore: float
    warnings: list[str]


class AnalysisResult(BaseModel):
    type: Literal["squat-analysis-v1"] = "squat-analysis-v1"
    sequence: int
    timestampMs: float
    quality: Quality
    metrics: FrontalMetrics | None
    analysis: FrameAnalysis
