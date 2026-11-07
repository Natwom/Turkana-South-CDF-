from pydantic import BaseModel, Field
from typing import Optional, List


class AdminLogin(BaseModel):
    username: str = Field(max_length=128)
    password: str = Field(max_length=128)


class StatusUpdate(BaseModel):
    status: str = Field(max_length=50)
    remarks: Optional[str] = Field(default=None, max_length=1000)
    reason: Optional[str] = Field(default=None, max_length=1000)


class CorrectionRequestIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class VerificationIn(BaseModel):
    checklist: List[str] = Field(max_length=50)


class AllocationIn(BaseModel):
    amount: float = Field(gt=0, le=100_000_000)
    remarks: Optional[str] = Field(default=None, max_length=500)
    allow_overfund: bool = False   # Super Admin override


class DisburseIn(BaseModel):
    remarks: Optional[str] = Field(default=None, max_length=500)


class NoteIn(BaseModel):
    note: str = Field(min_length=1, max_length=2000)
    is_student_visible: bool = False