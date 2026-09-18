from sqlalchemy.orm import Session
from ..models.application import Application, StatusHistory, Notification

def transition(db: Session, app: Application, new_status: str, changed_by: str, remarks: str = None):
    old = app.status
    app.status = new_status
    db.add(StatusHistory(application_id=app.id, previous_status=old,
                         new_status=new_status, changed_by=changed_by, remarks=remarks))
    db.add(Notification(application_id=app.id, audience="STUDENT",
                        title=f"Application status: {new_status}",
                        message=remarks or f"Your application is now {new_status}."))
    if new_status == "Signed Form Uploaded":
        db.add(Notification(application_id=app.id, audience="ADMIN",
                            title="Signed form uploaded",
                            message=f"{app.application_number} uploaded signed/stamped form."))