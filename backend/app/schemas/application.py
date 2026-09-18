from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date
from decimal import Decimal

class GuardianIn(BaseModel):
    name: Optional[str] = None
    occupation: Optional[str] = None
    main_income_source: Optional[str] = None
    other_income_source: Optional[str] = None
    employment_status: Optional[str] = None
    is_retired: bool = False
    telephone: Optional[str] = None

class SiblingIn(BaseModel):
    name: str
    relationship: Optional[str] = None
    school: Optional[str] = None
    class_level: Optional[str] = None
    total_fees: Decimal = Decimal("0")
    outstanding_balance: Decimal = Decimal("0")

class FundingHistoryIn(BaseModel):
    level: str                                  # Secondary/College/University
    funding_source: Optional[str] = None
    other_source: Optional[str] = None

class ApplicantIn(BaseModel):
    full_name: str
    reg_number: Optional[str] = None
    id_number: Optional[str] = None
    nemis_number: Optional[str] = None
    telephone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    place_of_birth: Optional[str] = None
    constituency: str = "Turkana South"
    ward: Optional[str] = None
    location: Optional[str] = None
    sub_location: Optional[str] = None
    village: Optional[str] = None
    institution: Optional[str] = None
    institution_code: Optional[str] = None
    school_paybill: Optional[str] = None
    school_account_number: Optional[str] = None
    campus: Optional[str] = None
    level_of_study: Optional[str] = None
    course: Optional[str] = None
    mode_of_study: Optional[str] = None
    class_year: Optional[str] = None
    expected_completion: Optional[str] = None

class FamilyIn(BaseModel):
    reason_for_bursary: Optional[str] = None
    applicant_disability: bool = False
    applicant_disability_desc: Optional[str] = None
    chronic_illness: bool = False
    chronic_illness_desc: Optional[str] = None
    guardian_disability: bool = False
    guardian_disability_desc: Optional[str] = None
    father: Optional[GuardianIn] = None
    mother: Optional[GuardianIn] = None

class ApplicationCreate(BaseModel):
    category: str
    funding_period_id: int
    amount_requested: Optional[Decimal] = None
    family_status: Optional[str] = None
    family_status_other: Optional[str] = None
    applicant: ApplicantIn
    family: FamilyIn
    siblings: List[SiblingIn] = []
    funding_history: List[FundingHistoryIn] = []

    @field_validator("amount_requested")
    @classmethod
    def amount_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Amount must be a positive value")
        return v

class AccessRequest(BaseModel):
    application_number: str
    access_code: str

class ApplicationResponse(BaseModel):
    application_number: str
    access_code: str
    status: str
    class Config: from_attributes = True