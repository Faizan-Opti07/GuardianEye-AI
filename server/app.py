import os
import sys
import json
import time
import mimetypes
import threading
from datetime import datetime, date
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

from database import init_db, get_connection
from ai_engine import generate_diary_schedule, educational_tutor_chat, analyze_engagement_and_anticheat, MODEL_NAME, MODEL_PARAMS
from pocket_money_engine import calculate_pocket_money, waive_deductions

PORT = 8080
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(BASE_DIR, "web")

# In-memory real-time state for instantaneous client sync
live_subscribers = []
subscribers_lock = threading.Lock()

def broadcast_sse(event_name, data):
    with subscribers_lock:
        msg = f"event: {event_name}\ndata: {json.dumps(data)}\n\n"
        dead = []
        for q in live_subscribers:
            try:
                q.put(msg)
            except Exception:
                dead.append(q)
        for d in dead:
            if d in live_subscribers:
                live_subscribers.remove(d)

class GuardianHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/status":
            self.handle_get_status()
        elif path == "/api/stream":
            self.handle_sse_stream()
        elif path == "/api/pocket_money":
            self.handle_get_pocket_money()
        elif path == "/api/violations":
            self.handle_get_violations()
        elif path == "/api/ai/model_info":
            self.handle_get_model_info()
        else:
            self.serve_static(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if path == "/api/telemetry/heartbeat":
            self.handle_heartbeat(data)
        elif path == "/api/diary/submit":
            self.handle_submit_diary(data)
        elif path == "/api/ai/tutor":
            self.handle_ai_tutor(data)
        elif path == "/api/ai/engagement_check":
            self.handle_engagement_check(data)
        elif path == "/api/parent/override":
            self.handle_parent_override(data)
        elif path == "/api/telemetry/app_switch":
            self.handle_app_switch(data)
        else:
            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')

    def serve_static(self, path):
        if path == "/" or path == "":
            path = "/index.html"
            
        file_path = os.path.join(WEB_DIR, path.lstrip("/"))
        if os.path.exists(file_path) and os.path.isfile(file_path):
            ctype, _ = mimetypes.guess_type(file_path)
            if not ctype:
                ctype = "text/plain"
            if file_path.endswith(".js"):
                ctype = "application/javascript"
            elif file_path.endswith(".css"):
                ctype = "text/css"
                
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_cors_headers()
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b"File not found")

    def handle_get_status(self):
        today_str = date.today().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM daily_sessions WHERE session_date = ?", (today_str,))
            session = cursor.fetchone()
            
            cursor.execute("SELECT * FROM diaries WHERE diary_date = ?", (today_str,))
            diary = cursor.fetchone()
            
            cursor.execute("SELECT * FROM devices WHERE device_id = 'child_galaxy_tab'")
            device = cursor.fetchone()

        pm = calculate_pocket_money(today_str)
        
        status_payload = {
            "date": today_str,
            "device": dict(device) if device else {},
            "session": dict(session) if session else {},
            "diary": {
                "id": diary["id"],
                "raw_text": diary["raw_text"],
                "schedule": json.loads(diary["schedule_json"]) if diary else None,
                "required_minutes": diary["required_study_minutes"],
                "completed_minutes": diary["completed_study_minutes"],
                "status": diary["status"]
            } if diary else None,
            "pocket_money": pm
        }
        self.send_json(status_payload)

    def handle_get_model_info(self):
        self.send_json({
            "model_name": MODEL_NAME,
            "parameter_size": MODEL_PARAMS,
            "domain": "Education (Domain 02) & Health (Domain 01)",
            "features": [
                "Automated 2-Hour Study Schedule Generation from Work Diary",
                "Strict Socratic Educational Guardrails (Anti-Gaming & Non-Academic Filter)",
                "Anti-Cheat Inactivity & Fake Keystroke Detection",
                "Automated Financial Consequence Engine (Next-Day Pocket Money Deductions)"
            ],
            "compliance": "Hacktoberfest Islamabad 2026 Open AI Build Challenge"
        })

    def handle_get_pocket_money(self):
        today_str = date.today().isoformat()
        pm = calculate_pocket_money(today_str)
        self.send_json(pm)

    def handle_get_violations(self):
        today_str = date.today().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, timestamp, violation_type, severity, details, deduction_amount
                FROM violations
                WHERE DATE(timestamp) = ?
                ORDER BY timestamp DESC
                LIMIT 50
            """, (today_str,))
            rows = [dict(r) for r in cursor.fetchall()]
        self.send_json({"violations": rows})

    def handle_app_switch(self, data):
        new_app = data.get("app_name", "Home")
        today_str = date.today().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE daily_sessions
                SET current_foreground_app = ?
                WHERE session_date = ?
            """, (new_app, today_str))
            cursor.execute("""
                INSERT INTO telemetry_logs (event_type, app_name, message)
                VALUES ('app_switch', ?, ?)
            """, (new_app, f"Child launched foreground app: {new_app}"))
            conn.commit()
            
        broadcast_sse("app_switched", {"app_name": new_app})
        self.send_json({"success": True, "app_name": new_app})

    def handle_heartbeat(self, data):
        """
        Processes client tick.
        Updates continuous screen time (20 min rule),
        Entertainment time (capped at 90m / 1.5h),
        Study time (min 120m requirement).
        """
        today_str = date.today().isoformat()
        delta_sec = int(data.get("delta_seconds", 1))
        current_app = data.get("app_name", "Home")
        is_studying = data.get("is_studying", False)
        is_idle = data.get("is_idle", False)
        
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM daily_sessions WHERE session_date = ?", (today_str,))
            row = cursor.fetchone()
            if not row:
                cursor.execute("INSERT INTO daily_sessions (session_date) VALUES (?)", (today_str,))
                conn.commit()
                cursor.execute("SELECT * FROM daily_sessions WHERE session_date = ?", (today_str,))
                row = cursor.fetchone()

            ent_sec = row["entertainment_seconds"]
            study_sec = row["study_seconds"]
            continuous_sec = row["continuous_screen_seconds"]
            breaks_taken = row["eye_breaks_taken"]
            is_ent_locked = bool(row["is_entertainment_locked"])
            is_eye_locked = bool(row["is_eye_break_active"])

            # 1. Update continuous screen time tracking
            # Continuous screen time is tracked for analytics, but automatic 35-sec screen lock is DISABLED per user request
            if not is_ent_locked:
                continuous_sec += delta_sec
            
            trigger_eye_break_now = False
            is_eye_locked = False

            # 2. Check study exemption vs entertainment counter
            if is_studying:
                # Educational Exemption: Entertainment timer does NOT tick
                if not is_idle:
                    study_sec += delta_sec
            else:
                # Entertainment / General usage
                if current_app not in ["Home", "Settings", "Educational Hub"]:
                    ent_sec += delta_sec
                    
            # 1.5 hours entertainment cap tracking
            # NOTE: Automatic entertainment screen lockout is DISABLED per user request so child simulator apps remain fully playable
            trigger_ent_lock_now = False
            is_ent_locked = False

            cursor.execute("""
                UPDATE daily_sessions
                SET entertainment_seconds = ?,
                    study_seconds = ?,
                    continuous_screen_seconds = ?,
                    eye_breaks_taken = ?,
                    is_entertainment_locked = ?,
                    is_eye_break_active = ?,
                    current_foreground_app = ?
                WHERE session_date = ?
            """, (
                ent_sec, study_sec, continuous_sec, breaks_taken,
                1 if is_ent_locked else 0,
                1 if is_eye_locked else 0,
                current_app, today_str
            ))
            
            # Update diary completed study minutes
            cursor.execute("""
                UPDATE diaries
                SET completed_study_minutes = ?
                WHERE diary_date = ?
            """, (study_sec // 60, today_str))
            
            conn.commit()

        # Recalculate pocket money
        pm = calculate_pocket_money(today_str)
        
        telemetry_update = {
            "entertainment_seconds": ent_sec,
            "study_seconds": study_sec,
            "continuous_screen_seconds": continuous_sec,
            "eye_breaks_taken": breaks_taken,
            "is_entertainment_locked": is_ent_locked,
            "is_eye_break_active": is_eye_locked,
            "trigger_eye_break": trigger_eye_break_now,
            "trigger_ent_lock": trigger_ent_lock_now,
            "current_app": current_app,
            "pocket_money": pm
        }
        
        broadcast_sse("heartbeat", telemetry_update)
        self.send_json(telemetry_update)

    def handle_submit_diary(self, data):
        raw_text = data.get("diary_text", "").strip()
        if not raw_text:
            self.send_json({"error": "Work diary text cannot be empty"}, 400)
            return

        schedule = generate_diary_schedule(raw_text)
        today_str = date.today().isoformat()
        
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO diaries (diary_date, raw_text, schedule_json, required_study_minutes, completed_study_minutes, status)
                VALUES (?, ?, ?, ?, 0, 'active')
                ON CONFLICT(diary_date) DO UPDATE SET
                    raw_text = excluded.raw_text,
                    schedule_json = excluded.schedule_json,
                    required_study_minutes = excluded.required_study_minutes,
                    status = 'active'
            """, (today_str, raw_text, json.dumps(schedule), schedule.get("total_minutes", 120)))
            
            cursor.execute("""
                INSERT INTO telemetry_logs (event_type, app_name, message)
                VALUES ('diary_uploaded', 'AI Study Hub', 'Child uploaded work diary. AI generated mandatory 2-hour schedule.')
            """)
            conn.commit()

        broadcast_sse("diary_updated", {"schedule": schedule})
        self.send_json({"success": True, "schedule": schedule})

    def handle_ai_tutor(self, data):
        user_msg = data.get("message", "").strip()
        subject = data.get("subject", "General Study")
        if not user_msg:
            self.send_json({"error": "Message is required"}, 400)
            return

        result = educational_tutor_chat(user_msg, subject)
        today_str = date.today().isoformat()

        if not result["allowed"]:
            # Log non-educational attempt
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO telemetry_logs (event_type, app_name, message)
                    VALUES ('ai_guardrail_block', 'AI Study Hub', ?)
                """, (f"Student asked non-academic query during study: '{user_msg[:60]}'",))
                conn.commit()
                
        self.send_json(result)

    def handle_engagement_check(self, data):
        eval_result = analyze_engagement_and_anticheat(data)
        today_str = date.today().isoformat()
        
        if eval_result["is_cheating"]:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO violations (violation_type, severity, details, deduction_amount)
                    VALUES ('anti_idle_cheat', 'warning', ?, ?)
                """, (eval_result["reason"], eval_result["penalty"]))
                
                cursor.execute("""
                    INSERT INTO telemetry_logs (event_type, app_name, message)
                    VALUES ('cheat_strike', 'AI Study Hub', ?)
                """, (f"Anti-Cheat Flag: {eval_result['reason']}",))
                conn.commit()
                
            # Recalculate pocket money with new penalty
            pm = calculate_pocket_money(today_str)
            broadcast_sse("violation_recorded", {
                "violation": eval_result,
                "pocket_money": pm
            })
            eval_result["pocket_money"] = pm

        self.send_json(eval_result)

    def handle_parent_override(self, data):
        action = data.get("action")
        today_str = date.today().isoformat()
        
        with get_connection() as conn:
            cursor = conn.cursor()
            if action == "lock_now":
                cursor.execute("UPDATE daily_sessions SET is_entertainment_locked = 1 WHERE session_date = ?", (today_str,))
                msg = "Father initiated remote emergency device lockout."
            elif action == "unlock":
                cursor.execute("UPDATE daily_sessions SET is_entertainment_locked = 0, entertainment_seconds = 0, is_eye_break_active = 0, continuous_screen_seconds = 0 WHERE session_date = ?", (today_str,))
                msg = "Father remotely unlocked child device."
            elif action == "trigger_eye_break":
                cursor.execute("UPDATE daily_sessions SET is_eye_break_active = 1, continuous_screen_seconds = 1200 WHERE session_date = ?", (today_str,))
                msg = "Father triggered remote 35-second eye break overlay."
            elif action == "end_eye_break":
                cursor.execute("UPDATE daily_sessions SET is_eye_break_active = 0, continuous_screen_seconds = 0 WHERE session_date = ?", (today_str,))
                msg = "Eye break completed. Continuous screen timer reset to 0."
            elif action == "grant_time":
                # Decrement entertainment seconds by 15 mins (900 seconds)
                cursor.execute("""
                    UPDATE daily_sessions
                    SET entertainment_seconds = MAX(0, entertainment_seconds - 900),
                        is_entertainment_locked = 0
                    WHERE session_date = ?
                """, (today_str,))
                msg = "Father granted 15 minutes bonus entertainment allowance."
            elif action == "waive_deduction":
                waive_state = data.get("waive", True)
                pm = waive_deductions(today_str, waive_state)
                msg = "Father waived pocket money deductions." if waive_state else "Father re-applied pocket money deductions."
            elif action == "reset_day":
                cursor.execute("""
                    UPDATE daily_sessions
                    SET entertainment_seconds = 0,
                        study_seconds = 0,
                        continuous_screen_seconds = 0,
                        eye_breaks_taken = 0,
                        is_entertainment_locked = 0,
                        is_eye_break_active = 0,
                        current_foreground_app = 'Home'
                    WHERE session_date = ?
                """, (today_str,))
                cursor.execute("DELETE FROM violations WHERE DATE(timestamp) = ?", (today_str,))
                cursor.execute("DELETE FROM diaries WHERE diary_date = ?", (today_str,))
                cursor.execute("""
                    UPDATE pocket_money
                    SET deductions = 0, final_amount = base_amount, is_deduction_waived = 0, notes = 'Daily reset for testing'
                    WHERE record_date = ?
                """, (today_str,))
                msg = "System timers and pocket money reset for testing."
            else:
                msg = f"Unknown action: {action}"

            cursor.execute("""
                INSERT INTO telemetry_logs (event_type, app_name, message)
                VALUES ('parent_action', 'Parent Dashboard', ?)
            """, (msg,))
            conn.commit()

        pm = calculate_pocket_money(today_str)
        broadcast_sse("parent_command", {"action": action, "message": msg, "pocket_money": pm})
        self.send_json({"success": True, "action": action, "message": msg, "pocket_money": pm})

    def handle_sse_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_cors_headers()
        self.end_headers()

        import queue
        q = queue.Queue()
        with subscribers_lock:
            live_subscribers.append(q)

        # Initial handshake
        self.wfile.write(b"event: connected\ndata: {\"status\": \"GuardianEye Live Telemetry Connected\"}\n\n")
        self.wfile.flush()

        try:
            while True:
                try:
                    msg = q.get(timeout=20)
                    self.wfile.write(msg.encode("utf-8"))
                    self.wfile.flush()
                except queue.Empty:
                    # Keep-alive heartbeat
                    self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            with subscribers_lock:
                if q in live_subscribers:
                    live_subscribers.remove(q)

    def send_json(self, payload, code=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

def run_server():
    init_db()
    server = ThreadedHTTPServer(("0.0.0.0", PORT), GuardianHandler)
    print(f"GuardianEye AI Server running on http://localhost:{PORT}")
    server.serve_forever()

if __name__ == "__main__":
    run_server()
