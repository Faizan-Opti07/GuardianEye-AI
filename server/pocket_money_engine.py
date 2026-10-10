import json
from datetime import date
from database import get_connection

DEFAULT_BASE_ALLOWANCE = 100.0  # Rs 100 / day base pocket money
PENALTY_ENTERTAINMENT_OVERTIME = 25.0  # Rs 25 deduction for exceeding 90 min entertainment
PENALTY_INCOMPLETE_STUDY = 30.0        # Rs 30 deduction if under 2 hours study
PENALTY_IDLE_CHEAT_STRIKE = 15.0       # Rs 15 deduction per idling / anti-cheat strike

def calculate_pocket_money(target_date=None):
    """
    Computes current and next-day pocket money deductions based on logged violations,
    study progress, and entertainment thresholds.
    """
    if not target_date:
        target_date = date.today().isoformat()
        
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Fetch pocket money config
        cursor.execute("SELECT * FROM pocket_money WHERE record_date = ?", (target_date,))
        pm_row = cursor.fetchone()
        base_amount = pm_row["base_amount"] if pm_row else DEFAULT_BASE_ALLOWANCE
        is_waived = bool(pm_row["is_deduction_waived"]) if pm_row else False
        
        # 2. Fetch session data
        cursor.execute("SELECT * FROM daily_sessions WHERE session_date = ?", (target_date,))
        session_row = cursor.fetchone()
        
        ent_seconds = session_row["entertainment_seconds"] if session_row else 0
        study_seconds = session_row["study_seconds"] if session_row else 0
        
        ent_minutes = ent_seconds // 60
        study_minutes = study_seconds // 60
        
        # 3. Fetch violations
        cursor.execute("""
            SELECT violation_type, COUNT(*) as count, SUM(deduction_amount) as total_penalty
            FROM violations
            WHERE DATE(timestamp) = ?
            GROUP BY violation_type
        """, (target_date,))
        violation_groups = cursor.fetchall()
        
        deductions_breakdown = []
        total_calculated_deductions = 0.0
        
        # Check overtime rule (90 minutes / 1.5 hours)
        if ent_minutes > 90:
            overtime_penalty = PENALTY_ENTERTAINMENT_OVERTIME
            deductions_breakdown.append({
                "rule": "Entertainment Time Overrun (> 1.5 Hours)",
                "details": f"Used {ent_minutes} mins (Limit: 90 mins). Exceeded by {ent_minutes - 90} mins.",
                "amount": overtime_penalty
            })
            total_calculated_deductions += overtime_penalty
            
        # Check idle cheat strikes
        strike_count = 0
        for vg in violation_groups:
            if vg["violation_type"] == "anti_idle_cheat":
                strike_count = vg["count"]
                cheat_penalty = strike_count * PENALTY_IDLE_CHEAT_STRIKE
                deductions_breakdown.append({
                    "rule": "Anti-Cheat / Inactivity Bypass Strikes",
                    "details": f"Caught idling or walking away {strike_count} times while study timer ran.",
                    "amount": cheat_penalty
                })
                total_calculated_deductions += cheat_penalty
                
        # Check 2-hour study goal (120 minutes)
        if study_minutes < 120:
            needed = 120 - study_minutes
            deductions_breakdown.append({
                "rule": "Study Diary Requirement Deficit (< 2 Hours)",
                "details": f"Completed {study_minutes} of 120 mandatory study mins ({needed} mins remaining).",
                "amount": PENALTY_INCOMPLETE_STUDY
            })
            total_calculated_deductions += PENALTY_INCOMPLETE_STUDY
            
        final_allowance = 0.0 if is_waived else max(0.0, base_amount - total_calculated_deductions)
        if is_waived:
            final_allowance = base_amount
            
        # Update record in DB
        cursor.execute("""
            INSERT INTO pocket_money (record_date, base_amount, deductions, final_amount, is_deduction_waived, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(record_date) DO UPDATE SET
                deductions = excluded.deductions,
                final_amount = excluded.final_amount,
                notes = excluded.notes
        """, (
            target_date,
            base_amount,
            0.0 if is_waived else total_calculated_deductions,
            final_allowance,
            1 if is_waived else 0,
            f"Deductions: Rs {total_calculated_deductions} ({len(deductions_breakdown)} issues flagged)"
        ))
        conn.commit()
        
        return {
            "date": target_date,
            "base_allowance": base_amount,
            "total_deductions": total_calculated_deductions,
            "final_allowance": final_allowance,
            "is_waived": is_waived,
            "breakdown": deductions_breakdown,
            "entertainment_minutes": ent_minutes,
            "study_minutes": study_minutes,
            "idle_strikes": strike_count,
            "entertainment_cap_exceeded": ent_minutes > 90,
            "study_goal_met": study_minutes >= 120
        }

def waive_deductions(target_date, waive_state=True):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE pocket_money
            SET is_deduction_waived = ?
            WHERE record_date = ?
        """, (1 if waive_state else 0, target_date))
        conn.commit()
    return calculate_pocket_money(target_date)

if __name__ == "__main__":
    init_res = calculate_pocket_money()
    print("Pocket Money Ledger summary:", json.dumps(init_res, indent=2))
