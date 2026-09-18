from sqlalchemy import (Column, Integer, String, Text, Numeric, Date, DateTime,
                        ForeignKey, Boolean, func)
from sqlalchemy.orm import relationship
from ..database import Base

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True)
    application_number = Column(String(20), unique=True, index=True, nullable=False)
    access_code = Column(String(12), unique=True, index=True, nullable=False)
    funding_period_id = Column(Integer, ForeignKey("funding_periods.id"), nullable=False)
    category = Column(String(20))                       # Secondary/College/University/Others
    status = Column(String(40), default="Draft", index=True)
    amount_requested = Column(Numeric(12, 2))
    family_status = Column(String(40))
    family_status_other = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    submitted_at = Column(DateTime)
    signed_form_uploaded_at = Column(DateTime)

    applicant = relationship("ApplicantDetail", uselist=False, back_populates="application", cascade="all, delete-orphan")
    family = relationship("FamilyDetail", uselist=False, back_populates="application", cascade="all, delete-orphan")
    siblings = relationship("Sibling", back_populates="application", cascade="all, delete-orphan")
    funding_history = relationship("EducationFunding", back_populates="application", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="application", cascade="all, delete-orphan")
    allocation = relationship("Allocation", uselist=False, back_populates="application")
    corrections = relationship("CorrectionRequest", back_populates="application", cascade="all, delete-orphan")

class ApplicantDetail(Base):
    __tablename__ = "applicant_details"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True)
    full_name = Column(String(120), nullable=False)
    reg_number = Column(String(60), index=True)
    id_number = Column(String(20), index=True)
    nemis_number = Column(String(30))
    telephone = Column(String(20))
    gender = Column(String(10))
    dob = Column(Date)
    place_of_birth = Column(String(120))
    constituency = Column(String(60), default="Turkana South")
    ward = Column(String(60), index=True)
    location = Column(String(60), index=True)
    sub_location = Column(String(60))
    village = Column(String(60))
    institution = Column(String(150), index=True)
    institution_code = Column(String(30))
    school_paybill = Column(String(30))
    school_account_number = Column(String(60))
    campus = Column(String(100))
    level_of_study = Column(String(20))                 # Degree/Diploma/Certificate
    course = Column(String(120), index=True)
    mode_of_study = Column(String(20))                  # Regular/Parallel/Boarding/Day
    class_year = Column(String(30))
    expected_completion = Column(String(20))
    application = relationship("Application", back_populates="applicant")

class FamilyDetail(Base):
    __tablename__ = "family_details"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True)
    reason_for_bursary = Column(Text)
    applicant_disability = Column(Boolean, default=False)
    applicant_disability_desc = Column(Text)
    chronic_illness = Column(Boolean, default=False)
    chronic_illness_desc = Column(Text)
    guardian_disability = Column(Boolean, default=False)
    guardian_disability_desc = Column(Text)
    application = relationship("Application", back_populates="family")
    father = relationship("Guardian", uselist=False, primaryjoin="and_(FamilyDetail.id==Guardian.family_id, Guardian.relation=='Father')", overlaps="mother")
    mother = relationship("Guardian", uselist=False, primaryjoin="and_(FamilyDetail.id==Guardian.family_id, Guardian.relation=='Mother')", overlaps="father")

class Guardian(Base):
    __tablename__ = "guardians"
    id = Column(Integer, primary_key=True)
    family_id = Column(Integer, ForeignKey("family_details.id"))
    relation = Column(String(10))                       # Father / Mother
    name = Column(String(120))
    occupation = Column(String(80))
    main_income_source = Column(String(120))
    other_income_source = Column(String(120))
    employment_status = Column(String(40))
    is_retired = Column(Boolean, default=False)
    telephone = Column(String(20))

class Sibling(Base):
    __tablename__ = "siblings"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    name = Column(String(120))
    relation_type = Column(String(40))
    school = Column(String(150))
    class_level = Column(String(40))
    total_fees = Column(Numeric(12, 2), default=0)
    outstanding_balance = Column(Numeric(12, 2), default=0)
    application = relationship("Application", back_populates="siblings")

class EducationFunding(Base):
    __tablename__ = "education_funding"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    level = Column(String(20))                          # Secondary/College/University
    funding_source = Column(String(120))
    other_source = Column(String(120))
    application = relationship("Application", back_populates="funding_history")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    doc_type = Column(String(60))                       # e.g. id_card, admission_letter, signed_form
    file_path = Column(String(300), nullable=False)
    original_name = Column(String(200))
    file_type = Column(String(10))
    file_size = Column(Integer)
    is_signed_form = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, server_default=func.now())
    application = relationship("Application", back_populates="documents")

class StatusHistory(Base):
    __tablename__ = "application_status_history"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), index=True)
    previous_status = Column(String(40))
    new_status = Column(String(40), nullable=False)
    changed_by = Column(String(80))                     # "Student" / admin username / "System"
    remarks = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    application = relationship("Application", back_populates="status_history")

class CorrectionRequest(Base):
    __tablename__ = "correction_requests"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    requested_by = Column(String(80))
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime)
    application = relationship("Application", back_populates="corrections")

class VerificationRecord(Base):
    __tablename__ = "verification_records"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    checklist = Column(String(500))                     # JSON array of checked items
    verified_by = Column(String(80))
    created_at = Column(DateTime, server_default=func.now())

class AdminNote(Base):
    __tablename__ = "admin_notes"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    note = Column(Text, nullable=False)
    is_student_visible = Column(Boolean, default=False)
    created_by = Column(String(80))
    created_at = Column(DateTime, server_default=func.now())

class Allocation(Base):
    __tablename__ = "allocations"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True)
    amount = Column(Numeric(12, 2), nullable=False)
    allocated_by = Column(String(80))
    remarks = Column(Text)
    # ── Disbursement tracking ──
    is_disbursed = Column(Boolean, default=False)
    disbursed_at = Column(DateTime)
    disbursed_by = Column(String(80))
    # ───────────────────────────
    created_at = Column(DateTime, server_default=func.now())
    application = relationship("Application", back_populates="allocation")

class AllocationHistory(Base):
    __tablename__ = "allocation_history"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), index=True)
    previous_amount = Column(Numeric(12, 2))
    new_amount = Column(Numeric(12, 2), nullable=False)
    changed_by = Column(String(80))
    remarks = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    audience = Column(String(10), default="ADMIN")      # STUDENT / ADMIN
    title = Column(String(120))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user = Column(String(80))
    action = Column(String(120), nullable=False)
    record = Column(String(120))
    detail = Column(Text)
    ip_address = Column(String(45))
    created_at = Column(DateTime, server_default=func.now(), index=True)