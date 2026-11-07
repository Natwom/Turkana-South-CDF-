from pydantic import BaseModel, Field, StringConstraints, field_validator
from typing import Annotated, Optional, List
from datetime import date
from decimal import Decimal, InvalidOperation

# Length-limited strings (stops giant payloads and database abuse)
S50 = Annotated[str, StringConstraints(max_length=50)]
S100 = Annotated[str, StringConstraints(max_length=100)]
S200 = Annotated[str, StringConstraints(max_length=200)]
S2000 = Annotated[str, StringConstraints(max_length=2000)]


def _to_decimal(v):
    if v is None or v == "":
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except (InvalidOperation, ValueError):
        return Decimal("0")


class GuardianIn(BaseModel):
    name: Optional[S200] = None
    occupation: Optional[S200] = None
    main_income_source: Optional[S200] = None
    other_income_source: Optional[S200] = None
    employment_status: Optional[S100] = None
    is_retired: bool = False
    telephone: Optional[S50] = None


class SiblingIn(BaseModel):
    name: S200 = ""
    relationship: Optional[S100] = None
    school: Optional[S200] = None
    class_level: Optional[S100] = None
    total_fees: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("100000000"))
    outstanding_balance: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("100000000"))

    @field_validator("total_fees", "outstanding_balance", mode="before")
    @classmethod
    def coerce_decimal(cls, v):
        return _to_decimal(v)


class FundingHistoryIn(BaseModel):
    level: S100 = ""                              # Secondary/College/University
    funding_source: Optional[S200] = None
    other_source: Optional[S200] = None


class ApplicantIn(BaseModel):
    full_name: S200 = ""
    reg_number: S100
    id_number: Optional[S50] = None
    nemis_number: Optional[S50] = None
    telephone: Optional[S50] = None
    gender: Optional[S50] = None
    dob: Optional[date] = None
    place_of_birth: Optional[S200] = None
    constituency: S100 = "Turkana South"
    ward: Optional[S100] = None
    location: Optional[S100] = None
    sub_location: Optional[S100] = None
    village: Optional[S100] = None
    institution: S200
    institution_code: Optional[S50] = None
    school_paybill: Optional[S50] = None
    school_account_number: Optional[S100] = None
    campus: Optional[S200] = None
    level_of_study: Optional[S100] = None
    course: Optional[S200] = None
    mode_of_study: Optional[S100] = None
    class_year: Optional[S50] = None
    expected_completion: Optional[S50] = None

    @field_validator("dob", mode="before")
    @classmethod
    def blank_date_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("reg_number")
    @classmethod
    def reg_number_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Registration/Admission Number is required.")
        return v.strip()

    @field_validator("institution")
    @classmethod
    def institution_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Institution name is required.")
        return v.strip()


class FamilyIn(BaseModel):
    reason_for_bursary: Optional[S2000] = None
    applicant_disability: bool = False
    applicant_disability_desc: Optional[S2000] = None
    chronic_illness: bool = False
    chronic_illness_desc: Optional[S2000] = None
    guardian_disability: bool = False
    guardian_disability_desc: Optional[S2000] = None
    father: Optional[GuardianIn] = None
    mother: Optional[GuardianIn] = None


class ApplicationCreate(BaseModel):
    category: S100 = ""
    funding_period_id: int = Field(default=1, ge=1)
    amount_requested: Optional[Decimal] = Field(default=None, ge=0, le=Decimal("10000000"))
    family_status: Optional[S100] = None
    family_status_other: Optional[S200] = None
    applicant: ApplicantIn
    family: FamilyIn
    siblings: List[SiblingIn] = Field(default_factory=list, max_length=20)
    funding_history: List[FundingHistoryIn] = Field(default_factory=list, max_length=10)

    @field_validator("amount_requested", mode="before")
    @classmethod
    def blank_amount_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class AccessRequest(BaseModel):
    application_number: str = Field(max_length=40)
    access_code: str = Field(max_length=64)


class ApplicationResponse(BaseModel):
    application_number: str
    access_code: str
    status: str
    class Config: from_attributes = True