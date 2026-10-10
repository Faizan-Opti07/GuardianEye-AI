package io.github.childscreentime.eyecare;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

/**
 * EyeCareManager enforces the 20-20-35 Myopia Prevention Rule:
 * Every 20 minutes of continuous screen usage, triggers a mandatory,
 * unskippable 35-second eye relaxation break requiring the child to look 20 feet away.
 *
 * Enhances childscreentime/cst architecture with ophthalmological wellness safeguards.
 */
public class EyeCareManager {
    private static final String TAG = "EyeCareManager";
    
    // 20 minutes continuous screen time threshold (1,200,000 ms)
    public static final long CONTINUOUS_USAGE_THRESHOLD_MS = 20 * 60 * 1000L;
    
    // 35 seconds unskippable eye break duration (35,000 ms)
    public static final long EYE_BREAK_DURATION_MS = 35 * 1000L;
    
    private static EyeCareManager instance;
    private final Context context;
    private long continuousScreenTimeMs = 0;
    private boolean isEyeBreakActive = false;
    private long lastHeartbeatTimestamp = 0;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private EyeCareManager(Context context) {
        this.context = context.getApplicationContext();
        this.lastHeartbeatTimestamp = System.currentTimeMillis();
    }

    public static synchronized EyeCareManager getInstance(Context context) {
        if (instance == null) {
            instance = new EyeCareManager(context);
        }
        return instance;
    }

    /**
     * Called periodically by ScreenLockService / ScreenTimeWorker when screen is ON.
     */
    public synchronized void onScreenTick(long elapsedDeltaMs) {
        if (isEyeBreakActive) {
            return; // In break mode, continuous screen time does not advance
        }

        continuousScreenTimeMs += elapsedDeltaMs;
        Log.d(TAG, "Continuous screen time: " + (continuousScreenTimeMs / 1000) + "s / 1200s");

        if (continuousScreenTimeMs >= CONTINUOUS_USAGE_THRESHOLD_MS) {
            triggerEyeBreak();
        }
    }

    /**
     * Called when device screen turns OFF (e.g. child locks phone or puts it down).
     * Resets continuous timer if screen has been off for at least 5 minutes.
     */
    public synchronized void onScreenTurnedOff(long screenOffDurationMs) {
        if (screenOffDurationMs >= 5 * 60 * 1000L) {
            Log.d(TAG, "Device rested for >5 mins. Resetting continuous eye-strain timer.");
            continuousScreenTimeMs = 0;
        }
    }

    /**
     * Triggers the full-screen 35-second unskippable Eye Break Activity.
     */
    public synchronized void triggerEyeBreak() {
        if (isEyeBreakActive) return;
        
        Log.w(TAG, "20-minute continuous limit reached! Engaging 35s Eye Care Lock.");
        isEyeBreakActive = true;

        Intent intent = new Intent(context, EyeBreakOverlayActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(intent);
    }

    /**
     * Called by EyeBreakOverlayActivity once 35 seconds have completely elapsed.
     */
    public synchronized void onEyeBreakCompleted() {
        Log.i(TAG, "35-second eye relaxation completed successfully. Resetting continuous timer.");
        continuousScreenTimeMs = 0;
        isEyeBreakActive = false;
    }

    public boolean isEyeBreakActive() {
        return isEyeBreakActive;
    }

    public long getContinuousScreenTimeMs() {
        return continuousScreenTimeMs;
    }
}
