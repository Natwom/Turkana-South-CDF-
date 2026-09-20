from sqlalchemy.orm import Session
from ..models.application import Application, ApplicantDetail, FamilyDetail, Guardian, Sibling, EducationFunding
from ..schemas.application import ApplicationCreate

def build_application(db: Session, data: ApplicationCreate, app_no: str, code: str) -> Application:
    app = Application(application_number=app_no, access_code=code,
                      funding_period_id=data.funding_period_id, category=data.category,
                      amount_requested=data.amount_requested, family_status=data.family_status,
                      family_status_other=data.family_status_other)
    db.add(app); db.flush()

    a = data.applicant
    db.add(ApplicantDetail(application_id=app.id, **a.model_dump()))
    f = data.family
    fam = FamilyDetail(application_id=app.id,
                       reason_for_bursary=f.reason_for_bursary,
                       applicant_disability=f.applicant_disability,
                       applicant_disability_desc=f.applicant_disability_desc if f.applicant_disability else None,
                       chronic_illness=f.chronic_illness,
                       chronic_illness_desc=f.chronic_illness_desc if f.chronic_illness else None,
                       guardian_disability=f.guardian_disability,
                       guardian_disability_desc=f.guardian_disability_desc if f.guardian_disability else None)
    db.add(fam); db.flush()
    if f.father: db.add(Guardian(family_id=fam.id, relation="Father", **f.father.model_dump()))
    if f.mother: db.add(Guardian(family_id=fam.id, relation="Mother", **f.mother.model_dump()))
    for s in data.siblings:
        db.add(Sibling(application_id=app.id, **s.model_dump()))
    for h in data.funding_history:
        db.add(EducationFunding(application_id=app.id, **h.model_dump()))
    db.commit(); db.refresh(app)
    return app

def update_application(db: Session, app: Application, data: ApplicationCreate) -> Application:
    """Update an existing draft application's data in place, without changing its
    application_number or access_code. Replaces child records (applicant, family,
    guardians, siblings, funding history) rather than diffing them."""
    app.category = data.category
    app.amount_requested = data.amount_requested
    app.family_status = data.family_status
    app.family_status_other = data.family_status_other

    a = data.applicant
    if app.applicant:
        for k, v in a.model_dump().items():
            setattr(app.applicant, k, v)
    else:
        db.add(ApplicantDetail(application_id=app.id, **a.model_dump()))

    f = data.family
    if app.family:
        app.family.reason_for_bursary = f.reason_for_bursary
        app.family.applicant_disability = f.applicant_disability
        app.family.applicant_disability_desc = f.applicant_disability_desc if f.applicant_disability else None
        app.family.chronic_illness = f.chronic_illness
        app.family.chronic_illness_desc = f.chronic_illness_desc if f.chronic_illness else None
        app.family.guardian_disability = f.guardian_disability
        app.family.guardian_disability_desc = f.guardian_disability_desc if f.guardian_disability else None
        fam = app.family
        # Replace guardians
        for g in list(db.query(Guardian).filter_by(family_id=fam.id)):
            db.delete(g)
        db.flush()
        if f.father: db.add(Guardian(family_id=fam.id, relation="Father", **f.father.model_dump()))
        if f.mother: db.add(Guardian(family_id=fam.id, relation="Mother", **f.mother.model_dump()))
    else:
        fam = FamilyDetail(application_id=app.id,
                           reason_for_bursary=f.reason_for_bursary,
                           applicant_disability=f.applicant_disability,
                           applicant_disability_desc=f.applicant_disability_desc if f.applicant_disability else None,
                           chronic_illness=f.chronic_illness,
                           chronic_illness_desc=f.chronic_illness_desc if f.chronic_illness else None,
                           guardian_disability=f.guardian_disability,
                           guardian_disability_desc=f.guardian_disability_desc if f.guardian_disability else None)
        db.add(fam); db.flush()
        if f.father: db.add(Guardian(family_id=fam.id, relation="Father", **f.father.model_dump()))
        if f.mother: db.add(Guardian(family_id=fam.id, relation="Mother", **f.mother.model_dump()))

    # Replace siblings
    for s in list(db.query(Sibling).filter_by(application_id=app.id)):
        db.delete(s)
    db.flush()
    for s in data.siblings:
        db.add(Sibling(application_id=app.id, **s.model_dump()))

    # Replace funding history
    for h in list(db.query(EducationFunding).filter_by(application_id=app.id)):
        db.delete(h)
    db.flush()
    for h in data.funding_history:
        db.add(EducationFunding(application_id=app.id, **h.model_dump()))

    db.commit(); db.refresh(app)
    return app

def to_public_dict(app: Application) -> dict:
    a, fam = app.applicant, app.family
    return {
        "id": app.id,
        "application_number": app.application_number, "status": app.status,
        "category": app.category, "amount_requested": str(app.amount_requested or ""),
        "family_status": app.family_status, "family_status_other": app.family_status_other,
        "submitted_at": str(app.submitted_at or ""), "signed_form_uploaded_at": str(app.signed_form_uploaded_at or ""),
        "applicant": {k: v for k, v in a.__dict__.items() if not k.startswith("_")} if a else None,
        "family": ({**{k: v for k, v in fam.__dict__.items() if not k.startswith("_")},
                    "father": {k: v for k, v in fam.father.__dict__.items() if not k.startswith("_")} if fam.father else None,
                    "mother": {k: v for k, v in fam.mother.__dict__.items() if not k.startswith("_")} if fam.mother else None} if fam else None),
        "siblings": [{k: v for k, v in s.__dict__.items() if not k.startswith("_")} for s in app.siblings],
        "funding_history": [{k: v for k, v in h.__dict__.items() if not k.startswith("_")} for h in app.funding_history],
        "documents": [{"doc_type": d.doc_type, "original_name": d.original_name,
                       "file_type": d.file_type, "uploaded_at": str(d.uploaded_at),
                       "is_signed_form": d.is_signed_form} for d in app.documents],
        "allocation": ({
            "amount": float(app.allocation.amount),
            "allocated_at": str(app.allocation.created_at),
            "allocated_by": app.allocation.allocated_by,
            "remarks": app.allocation.remarks,
            "is_disbursed": app.allocation.is_disbursed,
            "disbursed_at": str(app.allocation.disbursed_at) if app.allocation.disbursed_at else None,
            "disbursed_by": app.allocation.disbursed_by,
        } if app.allocation else None),
        "corrections": [{"message": c.message, "is_resolved": c.is_resolved,
                         "created_at": str(c.created_at)} for c in app.corrections if not c.is_resolved],
        "status_history": [{"previous_status": h.previous_status, "new_status": h.new_status,
                            "changed_by": h.changed_by, "remarks": h.remarks,
                            "created_at": str(h.created_at)} for h in app.status_history],
    }