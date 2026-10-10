import sqlite3
import json
import os
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(__file__), "guardian_eye.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Devices table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                pin TEXT DEFAULT '3443',
                status TEXT DEFAULT 'online',
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Daily Screen Time & Sessions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_sessions (
                session_date TEXT PRIMARY KEY,
                entertainment_seconds INTEGER DEFAULT 0,
                study_seconds INTEGER DEFAULT 0,
                continuous_screen_seconds INTEGER DEFAULT 0,
                eye_breaks_taken INTEGER DEFAULT 0,
                is_entertainment_locked BOOLEAN DEFAULT 0,
                is_eye_break_active BOOLEAN DEFAULT 0,
                current_foreground_app TEXT DEFAULT 'Home'
            )
        """)
        
        # School Work Diaries & Schedules
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS diaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                diary_date TEXT UNIQUE,
                raw_text TEXT NOT NULL,
                schedule_json TEXT NOT NULL,
                required_study_minutes INTEGER DEFAULT 120,
                completed_study_minutes INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending'
            )
        """)
        
        # Violations and Cheating / Overtime Logs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                violation_type TEXT NOT NULL,
                severity TEXT DEFAULT 'warning',
                details TEXT NOT NULL,
                deduction_amount REAL DEFAULT 0.0
            )
        """)
        
        # Pocket Money Ledger
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pocket_money (
                record_date TEXT PRIMARY KEY,
                base_amount REAL DEFAULT 100.0,
                deductions REAL DEFAULT 0.0,
                final_amount REAL DEFAULT 100.0,
                is_deduction_waived BOOLEAN DEFAULT 0,
                notes TEXT DEFAULT 'Daily standard allowance'
            )
        """)
        
        # Real-time Activity Telemetry
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT NOT NULL,
                app_name TEXT,
                message TEXT NOT NULL
            )
        """)
        
        # Initialize default child device if not exists
        cursor.execute("SELECT device_id FROM devices WHERE device_id = 'child_galaxy_tab'")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO devices (device_id, name, device_type, pin, status)
                VALUES (?, ?, ?, ?, ?)
            """, ('child_galaxy_tab', "Alyan's Tablet", 'mobile', '3443', 'online'))
            
        # Initialize today's session if not exists
        today_str = date.today().isoformat()
        cursor.execute("SELECT session_date FROM daily_sessions WHERE session_date = ?", (today_str,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO daily_sessions (session_date, entertainment_seconds, study_seconds, continuous_screen_seconds, eye_breaks_taken)
                VALUES (?, 0, 0, 0, 0)
            """, (today_str,))
            
        # Initialize today's pocket money record
        cursor.execute("SELECT record_date FROM pocket_money WHERE record_date = ?", (today_str,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO pocket_money (record_date, base_amount, deductions, final_amount, notes)
                VALUES (?, 100.0, 0.0, 100.0, 'Initial daily allowance: Rs 100')
            """, (today_str,))
            
        conn.commit()

if __name__ == "__main__":
    init_db()
    print("GuardianEye Database initialized successfully at", DB_PATH)
