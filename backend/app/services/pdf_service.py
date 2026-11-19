import logging
import os
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.utils import ImageReader
from ..core.config import settings

logger = logging.getLogger("pdf_service")

styles = getSampleStyleSheet()

LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "ngcdf-logo.png")

letterhead_title = ParagraphStyle("LetterheadTitle", parent=styles["Normal"],
    fontSize=11, leading=14, fontName="Helvetica-Bold", alignment=TA_CENTER)
letterhead_sub = ParagraphStyle("LetterheadSub", parent=styles["Normal"],
    fontSize=9, leading=12, alignment=TA_CENTER)

DOC_TYPE_LABELS = {
    "id_card": "Copy of ID (student/parent)",
    "academic": "Academic certificates / transcript",
    "admission_letter": "Admission letter",
    "fees_structure": "Fees structure",
    "fee_balance": "Fee balance statement",
    "death_certificate": "Death certificate",
    "birth_certificate": "Birth certificate",
    "signed_form": "Signed/stamped application form",
}

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_IMG_WIDTH = 12 * cm
MAX_IMG_HEIGHT = 9 * cm


# ---------- safe helpers ----------
def _esc(value):
    """Escape text for use inside a ReportLab Paragraph (which parses markup)."""
    if value is None or value == "":
        return "—"
    return escape(str(value))


def _num(value):
    """Convert to float safely (None / '' / bad strings become 0)."""
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _row(label, value):
    return [Paragraph(f"<b>{escape(str(label))}</b>", styles["Normal"]),
            Paragraph(_esc(value), styles["Normal"])]


def _letterhead(S):
    logo_cell = ""
    if os.path.exists(LOGO_PATH):
        try:
            logo_cell = Image(LOGO_PATH, width=2.2*cm, height=2.2*cm)
        except Exception:
            logger.exception("Could not load letterhead logo")
            logo_cell = ""
    text_cell = [
        Paragraph("NATIONAL GOVERNMENT CONSTITUENCIES DEVELOPMENT FUND BOARD", letterhead_title),
        Paragraph("TURKANA SOUTH CONSTITUENCY", letterhead_title),
        Spacer(1, 4),
        Paragraph("Turkana South NGCDFC Office, located next to DCC Office, Lokichar<br/>"
                   "Next to KPLC Power Station, Lokichar<br/>"
                   "P.O Box 267 – 30500, Lodwar, Kenya<br/>"
                   "Tel/Cell: 0770 072 945 &nbsp;|&nbsp; Email: ngcdfturkanasouth@ngcdf.go.ke<br/>"
                   "Website: www.ngcdf.go.ke", letterhead_sub),
    ]
    if logo_cell:
        header_table = Table([[logo_cell, text_cell]], colWidths=[2.8*cm, 13.2*cm])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (0, 0), "CENTER"),
        ]))
        S.append(header_table)
    else:
        for p in text_cell:
            S.append(p)
    S.append(Spacer(1, 6))
    line = Table([[""]], colWidths=[16*cm], rowHeights=[1])
    line.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 1.2, colors.HexColor("#1a5c2e"))]))
    S.append(line)
    S.append(Spacer(1, 10))


def _scaled_image(path, max_w, max_h):
    """Return a ReportLab Image scaled to fit within max_w x max_h, preserving aspect ratio."""
    try:
        reader = ImageReader(path)
        iw, ih = reader.getSize()
    except Exception:
        return None
    if iw <= 0 or ih <= 0:
        return None
    scale = min(max_w / iw, max_h / ih, 1.0)
    w, h = iw * scale, ih * scale
    try:
        return Image(path, width=w, height=h)
    except Exception:
        return None


def _build_story(app, include_images=True):
    S = []
    a = app.applicant

    def A(name):
        return getattr(a, name, None) if a is not None else None

    _letterhead(S)

    S.append(Paragraph("BURSARY APPLICATION FORM", styles["Title"]))
    S.append(Spacer(1, 8))
    S.append(Paragraph(f"Application Number: <b>{_esc(app.application_number)}</b>   "
                       f"Status: {_esc(app.status)}", styles["Normal"]))
    S.append(Spacer(1, 10))

    # PART A
    S.append(Paragraph("PART A: PERSONAL, INSTITUTIONAL AND OTHER DETAILS", styles["Heading3"]))
    rows = [_row("Name of Student", A("full_name")), _row("Registration/Admission No.", A("reg_number")),
            _row("ID Number", A("id_number")), _row("NEMIS Number", A("nemis_number")),
            _row("Telephone", A("telephone")), _row("Gender", A("gender")),
            _row("Date of Birth", A("dob")), _row("Place of Birth/Residence", A("place_of_birth")),
            _row("Constituency", A("constituency")), _row("Ward", A("ward")),
            _row("Location", A("location")), _row("Sub-Location", A("sub_location")),
            _row("Village", A("village")),
            _row("Name of School/College/University", A("institution")),
            _row("Institution Code (Min. of Education)", A("institution_code")),
            _row("School Paybill Number", A("school_paybill")),
            _row("School Bank/M-Pesa Account Number", A("school_account_number")),
            _row("Campus/Branch", A("campus")), _row("Level of Study", A("level_of_study")),
            _row("Course of Study", A("course")), _row("Mode of Study", A("mode_of_study")),
            _row("Class/Year of Study", A("class_year")),
            _row("Expected Year & Month of Completion", A("expected_completion"))]
    t = Table(rows, colWidths=[6*cm, 10*cm])
    t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                           ("VALIGN", (0,0), (-1,-1), "TOP"),
                           ("BACKGROUND", (0,0), (0,-1), colors.whitesmoke)]))
    S.append(t); S.append(Spacer(1, 12))

    # PART B
    S.append(Paragraph("PART B: FAMILY BACKGROUND", styles["Heading3"]))
    S.append(Paragraph(f"Family Status: <b>{escape(str(app.family_status or ''))}</b> "
                       f"{escape(str(app.family_status_other or ''))}", styles["Normal"]))
    if app.family:
        for rel in ("father", "mother"):
            g = getattr(app.family, rel, None)
            label = rel.capitalize() + "/Guardian"
            S.append(Spacer(1, 6))
            S.append(Paragraph(label, styles["Heading4"]))
            if g:
                t = Table([_row("Name", getattr(g, "name", None)),
                           _row("Occupation/Profession", getattr(g, "occupation", None)),
                           _row("Main Source of Income", getattr(g, "main_income_source", None)),
                           _row("Other Source of Income", getattr(g, "other_income_source", None)),
                           _row("Employment Status", getattr(g, "employment_status", None)),
                           _row("Retired", "Yes" if getattr(g, "is_retired", False) else "No"),
                           _row("Telephone Contact", getattr(g, "telephone", None))],
                          colWidths=[6*cm, 10*cm])
                t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                                       ("BACKGROUND", (0,0), (0,-1), colors.whitesmoke)]))
                S.append(t)
    if app.siblings:
        S.append(Spacer(1, 8))
        S.append(Paragraph("Siblings in School", styles["Heading4"]))
        data = [["Name", "Relationship", "School/Institution", "Class", "Total Fees", "Balance"]]
        total, bal = 0.0, 0.0
        for s in app.siblings:
            fees, balance = _num(s.total_fees), _num(s.outstanding_balance)
            data.append([str(s.name or ""), str(s.relation_type or ""), str(s.school or ""),
                         str(s.class_level or ""), f"{fees:,.2f}", f"{balance:,.2f}"])
            total += fees; bal += balance
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
        def yes_no(flag, desc):
            return f"Yes — {escape(str(desc or ''))}" if flag else "No"
        S.append(Paragraph(f"Reason for applying for a bursary: {_esc(f.reason_for_bursary)}", styles["Normal"]))
        S.append(Paragraph("Physical impairment/disability: "
                           + yes_no(f.applicant_disability, f.applicant_disability_desc), styles["Normal"]))
        S.append(Paragraph("Other disability/chronic illness: "
                           + yes_no(f.chronic_illness, f.chronic_illness_desc), styles["Normal"]))
        S.append(Paragraph("Parent/Guardian disability: "
                           + yes_no(f.guardian_disability, f.guardian_disability_desc), styles["Normal"]))
    S.append(Spacer(1, 12))

    # PART D
    S.append(Paragraph("PART D: EDUCATION FUNDING HISTORY", styles["Heading3"]))
    for h in app.funding_history:
        S.append(Paragraph(f"{_esc(h.level)}: Source — {_esc(h.funding_source)}; "
                           f"Other — {_esc(h.other_source)}", styles["Normal"]))
    S.append(Spacer(1, 8))
    S.append(Paragraph(f"AMOUNT APPLYING FOR: KSh {_num(app.amount_requested):,.2f}", styles["Heading4"]))
    S.append(Spacer(1, 18))

    # PART E — DOCUMENTS SUBMITTED
    S.append(Paragraph("PART E: DOCUMENTS SUBMITTED", styles["Heading3"]))
    if app.documents:
        data = [["Document Type", "File Name", "Uploaded On"]]
        for d in app.documents:
            label = DOC_TYPE_LABELS.get(d.doc_type, d.doc_type or "")
            if d.is_signed_form:
                label += " (SIGNED)"
            data.append([str(label), str(d.original_name or "—"),
                         str(d.uploaded_at)[:16] if d.uploaded_at else "—"])
        t = Table(data, repeatRows=1, colWidths=[6*cm, 7*cm, 3.5*cm])
        t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                               ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
                               ("FONTSIZE", (0,0), (-1,-1), 8),
                               ("VALIGN", (0,0), (-1,-1), "TOP")]))
        S.append(t)
        S.append(Spacer(1, 14))

        if include_images:
            base = os.path.realpath(settings.STORAGE_DIR)
            for d in app.documents:
                ext = (d.file_type or "").lower().lstrip(".")
                if ext not in IMAGE_EXTENSIONS:
                    continue
                full_path = os.path.realpath(os.path.join(base, d.file_path or ""))
                try:
                    if os.path.commonpath([base, full_path]) != base:
                        continue
                except ValueError:
                    continue
                if not os.path.isfile(full_path):
                    continue
                label = DOC_TYPE_LABELS.get(d.doc_type, d.doc_type or "")
                if d.is_signed_form:
                    label += " (SIGNED)"
                img = _scaled_image(full_path, MAX_IMG_WIDTH, MAX_IMG_HEIGHT)
                if img:
                    S.append(Paragraph(f"<b>{escape(str(label))}</b> — {escape(str(d.original_name or ''))}",
                                       styles["Normal"]))
                    S.append(Spacer(1, 4))
                    S.append(img)
                    S.append(Spacer(1, 14))
    else:
        S.append(Paragraph("No documents have been uploaded yet.", styles["Normal"]))
    S.append(Spacer(1, 8))

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
    return S


def _render(app, include_images):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.6*cm, rightMargin=1.6*cm,
                            topMargin=1.4*cm, bottomMargin=1.6*cm)
    doc.build(_build_story(app, include_images=include_images))
    return buf.getvalue()


def generate_application_pdf(app) -> bytes:
    try:
        return _render(app, include_images=True)
    except Exception:
        # A bad/corrupt uploaded image is the usual culprit — retry without embedded images
        # so the admin can still download the PDF. The traceback is logged for debugging.
        logger.exception("PDF build failed for %s; retrying without embedded images",
                         getattr(app, "application_number", "?"))
        return _render(app, include_images=False)