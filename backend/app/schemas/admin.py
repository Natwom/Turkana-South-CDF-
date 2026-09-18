from pydantic import BaseModel
from typing import Optional

class AdminLogin(BaseModel):
    username: str
    password: str

class StatusUpdate(BaseModel):
    status: str
    remarks: Optional[str] = None
    reason: Optional[str] = None

class CorrectionRequestIn(BaseModel):
    message: str

class VerificationIn(BaseModel):
    checklist: list[str]

class AllocationIn(BaseModel):
    amount: float
    remarks: Optional[str] = None
    allow_overfund: bool = False   # Super Admin override

class DisburseIn(BaseModel):                        # ← NEW
    remarks: Optional[str] = None

class NoteIn(BaseModel):
    note: str
    is_student_visible: bool = False