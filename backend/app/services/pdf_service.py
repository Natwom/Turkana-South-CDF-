from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()

def _row(label, value):
    return [Paragraph(f"<b>{label}</b>", styles["Normal"]),
            Paragraph(str(value or "—"), styles["Normal"])]

def generate_application_pdf(app) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.6*cm, rightMargin=1.6*cm,
                            topMargin=1.6*cm, bottomMargin=1.6*cm)
    S = []
    a = app.applicant
    S.append(Paragraph("REPUBLIC OF KENYA", styles["Normal"]))
    S.append(Paragraph("NATIONAL GOVERNMENT CONSTITUENCY DEVELOPMENT FUND", styles["Normal"]))
    S.append(Paragraph("TURKANA SOUTH CONSTITUENCY — BURSARY APPLICATION FORM", styles["Title"]))
    S.append(Spacer(1, 12))
    S.append(Paragraph(f"Application Number: <b>{app.application_number}</b>   "
                       f"Status: {app.status}", styles["Normal"]))
    S.append(Spacer(1, 10))

    # PART A
    S.append(Paragraph("PART A: PERSONAL, INSTITUTIONAL AND OTHER DETAILS", styles["Heading3"]))
    rows = [_row("Name of Student", a.full_name), _row("Registration/Admission No.", a.reg_number),
            _row("ID Number", a.id_number), _row("NEMIS Number", a.nemis_number),
            _row("Telephone", a.telephone), _row("Gender", a.gender),
            _row("Date of Birth", a.dob), _row("Place of Birth/Residence", a.place_of_birth),
            _row("Constituency", a.constituency), _row("Ward", a.ward),
            _row("Location", a.location), _row("Sub-Location", a.sub_location),
            _row("Village", a.village),
            _row("Name of School/College/University", a.institution),
            _row("Institution Code (Min. of Education)", a.institution_code),
            _row("School Paybill Number", a.school_paybill),
            _row("School Bank/M-Pesa Account Number", a.school_account_number),
            _row("Campus/Branch", a.campus), _row("Level of Study", a.level_of_study),
            _row("Course of Study", a.course), _row("Mode of Study", a.mode_of_study),
            _row("Class/Year of Study", a.class_year),
            _row("Expected Year & Month of Completion", a.expected_completion)]
    t = Table(rows, colWidths=[6*cm, 10*cm])
    t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                           ("VALIGN", (0,0), (-1,-1), "TOP"),
                           ("BACKGROUND", (0,0), (0,-1), colors.whitesmoke)]))
    S.append(t); S.append(Spacer(1, 12))

    # PART B
    S.append(Paragraph("PART B: FAMILY BACKGROUND", styles["Heading3"]))
    S.append(Paragraph(f"Family Status: <b>{app.family_status or ''}</b> {app.family_status_other or ''}", styles["Normal"]))
    if app.family:
        for rel in ("father", "mother"):
            g = getattr(app.family, rel)
            label = rel.capitalize() + "/Guardian"
            S.append(Spacer(1, 6))
            S.append(Paragraph(label, styles["Heading4"]))
            if g:
                t = Table([_row("Name", g.name), _row("Occupation/Profession", g.occupation),
                           _row("Main Source of Income", g.main_income_source),
                           _row("Other Source of Income", g.other_income_source),
                           _row("Employment Status", g.employment_status),
                           _row("Retired", "Yes" if g.is_retired else "No"),
                           _row("Telephone Contact", g.telephone)],
                          colWidths=[6*cm, 10*cm])
                t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                                       ("BACKGROUND", (0,0), (0,-1), colors.whitesmoke)]))
                S.append(t)
    if app.siblings:
        S.append(Spacer(1, 8))
        S.append(Paragraph("Siblings in School", styles["Heading4"]))
        data = [["Name", "Relationship", "School/Institution", "Class", "Total Fees", "Balance"]]
        total, bal = 0, 0
        for s in app.siblings:
            data.append([s.name, s.relation_type or "", s.school or "", s.class_level or "",
                         f"{s.total_fees:,.2f}", f"{s.outstanding_balance:,.2f}"])
            total += float(s.total_fees or 0); bal += float(s.outstanding_balance or 0)
        data.append(["", "", "", "GRAND TOTAL", f"{total:,.2f}", f"{bal:,.2f}"])
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                               ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
                               ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold")]))
        S.append(t)
    S.append(Spacer(1, 12))

    # PART C
    S.append(Paragraph("PART C: ADDITIONAL INFORMATION", styles["Heading3"]))
    f = app.family
    if f:
        S.append(Paragraph(f"Reason for applying for a bursary: {f.reason_for_bursary or '—'}", styles["Normal"]))
        S.append(Paragraph(f"Physical impairment/disability: {'Yes — ' + (f.applicant_disability_desc or'') if f.applicant_disability else 'No'}", styles["Normal"]))
        S.append(Paragraph(f"Other disability/chronic illness: {'Yes — ' + (f.chronic_illness_desc or '') if f.chronic_illness else 'No'}", styles["Normal"]))
        S.append(Paragraph(f"Parent/Guardian disability: {'Yes — ' + (f.guardian_disability_desc or '') if f.guardian_disability else 'No'}", styles["Normal"]))
    S.append(Spacer(1, 12))

    # PART D
    S.append(Paragraph("PART D: EDUCATION FUNDING HISTORY", styles["Heading3"]))
    for h in app.funding_history:
        S.append(Paragraph(f"{h.level}: Source — {h.funding_source or '—'}; Other — {h.other_source or '—'}", styles["Normal"]))
    S.append(Spacer(1, 8))
    S.append(Paragraph(f"AMOUNT APPLYING FOR: KSh {app.amount_requested or 0:,.2f}", styles["Heading4"]))
    S.append(Spacer(1, 18))

    # DECLARATION
    S.append(Paragraph("DECLARATION (Student/Parent/Guardian)", styles["Heading3"]))
    S.append(Paragraph("I declare that the information given herein is true and correct to the best of my knowledge. "
                       "I understand that any false information will lead to disqualification and/or recovery of the bursary awarded.", styles["Normal"]))
    S.append(Spacer(1, 24))
    t = Table([["Signature: _________________________", "Date: _______________"]], colWidths=[8*cm, 8*cm])
    S.append(t); S.append(Spacer(1, 24))

    # RECOMMENDATIONS
    for title in ("RECOMMENDATION BY RELIGIOUS LEADER", "RECOMMENDATION BY AREA CHIEF / ASSISTANT CHIEF"):
        S.append(Paragraph(title, styles["Heading3"]))
        S.append(Paragraph("Comments on student/family/parent status:", styles["Normal"]))
        S.append(Spacer(1, 30))
        S.append(Paragraph("Assessment:    [  ] Very Needy    [  ] Needy    [  ] Not Needy", styles["Normal"]))
        S.append(Spacer(1, 20))
        t = Table([["Name: ________________________", "Signature: ________________________"],
                   ["Date: _______________", "Official Stamp: _______________"]], colWidths=[8*cm, 8*cm])
        S.append(t); S.append(Spacer(1, 24))

    # OFFICIAL USE
    S.append(Paragraph("FOR OFFICIAL USE ONLY", styles["Heading3"]))
    t = Table([_row("Form duly filled and signed", "[  ] Yes    [  ] No"),
               _row("Supporting documents attached", "[  ] Yes    [  ] No"),
               _row("Recommended for approval", "[  ] Yes    [  ] No"),
               _row("Reason for non-approval", ""),
               _row("Chairman", "Signature/Date: ____________________"),
               _row("Secretary", "Signature/Date: ____________________")],
              colWidths=[6*cm, 10*cm])
    t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                           ("BACKGROUND", (0,0), (0,-1), colors.whitesmoke)]))
    S.append(t)

    doc.build(S)
    buf.seek(0)
    return buf.read()