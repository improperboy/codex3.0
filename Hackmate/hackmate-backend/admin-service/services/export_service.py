import csv
import io
from sqlalchemy import text
from sqlalchemy.orm import Session


def export_users_csv(db: Session) -> str:
    rows = db.execute(text(
        "SELECT id, name, email, role, tech_stack, floor, room, created_at FROM users ORDER BY id"
    )).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Role", "Tech Stack", "Floor", "Room", "Created At"])
    for row in rows:
        writer.writerow(list(row))
    return output.getvalue()


def export_teams_csv(db: Session) -> str:
    rows = db.execute(text("""
        SELECT t.id, t.name, t.status, u.name as leader_name, u.email as leader_email,
               (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id AND tm.status = 'approved') as member_count,
               (SELECT string_agg(u2.name || ' (' || u2.email || ')', '; ') 
                FROM team_members tm2 
                JOIN users u2 ON tm2.user_id = u2.id 
                WHERE tm2.team_id = t.id AND tm2.status = 'approved') as members,
               th.name as theme, f.floor_number, r.room_number,
               t.tech_skills, t.idea, t.problem_statement,
               sub.github_link, sub.live_link, sub.ppt_link, sub.demo_video, sub.tech_stack as sub_tech_stack,
               sub.submitted_at, t.created_at
        FROM teams t
        LEFT JOIN users u ON t.leader_id = u.id
        LEFT JOIN themes th ON t.theme_id = th.id
        LEFT JOIN floors f ON t.floor_id = f.id
        LEFT JOIN rooms r ON t.room_id = r.id
        LEFT JOIN submissions sub ON t.id = sub.team_id
        ORDER BY t.id
    """)).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Name", "Status", "Leader Name", "Leader Email",
        "Member Count", "Members",
        "Theme", "Floor", "Room",
        "Tech Skills", "Idea", "Problem Statement",
        "GitHub Link", "Live Link", "PPT Link", "Demo Video", "Submission Tech Stack",
        "Submitted At", "Created At"
    ])
    for row in rows:
        writer.writerow(list(row))
    return output.getvalue()


def export_scores_csv(db: Session) -> str:
    rows = db.execute(text("""
        SELECT s.id, t.name as team, u.name as mentor,
               mr.round_name, s.score, s.comment, s.created_at
        FROM scores s
        JOIN teams t ON s.team_id = t.id
        JOIN users u ON s.mentor_id = u.id
        JOIN mentoring_rounds mr ON s.round_id = mr.id
        ORDER BY s.round_id, t.name
    """)).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Team", "Mentor", "Round", "Score", "Comment", "Created At"])
    for row in rows:
        writer.writerow(list(row))
    return output.getvalue()


def export_submissions_csv(db: Session) -> str:
    rows = db.execute(text("""
        SELECT s.id, t.name as team, u.name as leader_name, u.email as leader_email,
               s.github_link, s.live_link, s.ppt_link, s.demo_video,
               s.tech_stack, s.submitted_at
        FROM submissions s
        JOIN teams t ON s.team_id = t.id
        LEFT JOIN users u ON t.leader_id = u.id
        ORDER BY s.submitted_at DESC
    """)).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Team", "Leader Name", "Leader Email",
        "GitHub Link", "Live Link", "PPT Link", "Demo Video",
        "Tech Stack", "Submitted At"
    ])
    for row in rows:
        writer.writerow(list(row))
    return output.getvalue()


def generate_team_pdf(team_row, members, submission, scores) -> bytes:
    """Generate a PDF report for a single team using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=18, spaceAfter=12)
    story.append(Paragraph(f"Team Report: {team_row[0]}", title_style))
    story.append(Spacer(1, 0.5*cm))

    # Team info table
    info_data = [
        ["Status", team_row[4] or "—"],
        ["Theme", team_row[7] or "—"],
        ["Location", f"Floor {team_row[8]}, Room {team_row[9]}" if team_row[8] else "Not assigned"],
        ["Leader", f"{team_row[5]} ({team_row[6]})"],
        ["Tech Skills", team_row[3] or "—"],
    ]
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.5*cm))

    # Idea & problem
    story.append(Paragraph("Project Idea", styles["Heading2"]))
    story.append(Paragraph(team_row[1] or "—", styles["Normal"]))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Problem Statement", styles["Heading2"]))
    story.append(Paragraph(team_row[2] or "—", styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    # Members
    story.append(Paragraph("Team Members", styles["Heading2"]))
    if members:
        member_data = [["Name", "Email", "Tech Stack"]] + [
            [m[0], m[1], m[2] or "—"] for m in members
        ]
        member_table = Table(member_data, colWidths=[5*cm, 6*cm, 5*cm])
        member_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F81BD")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(member_table)
    else:
        story.append(Paragraph("No members found.", styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    # Submission
    story.append(Paragraph("Project Submission", styles["Heading2"]))
    if submission:
        sub_data = [
            ["GitHub", submission[0] or "—"],
            ["Live Demo", submission[1] or "—"],
            ["Tech Stack", submission[2] or "—"],
            ["PPT / Presentation", (submission[3] if len(submission) > 3 and submission[3] else "—")],
            ["Demo Video", (submission[4] if len(submission) > 4 and submission[4] else "—")],
        ]
        sub_table = Table(sub_data, colWidths=[4*cm, 12*cm])
        sub_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(sub_table)
    else:
        story.append(Paragraph("No submission yet.", styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    # Scores
    story.append(Paragraph("Scores by Round", styles["Heading2"]))
    if scores:
        score_data = [["Round", "Average Score"]] + [
            [s[0], f"{float(s[1]):.2f}"] for s in scores
        ]
        score_table = Table(score_data, colWidths=[10*cm, 6*cm])
        score_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F81BD")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(score_table)
    else:
        story.append(Paragraph("No scores recorded yet.", styles["Normal"]))

    doc.build(story)
    return buffer.getvalue()
