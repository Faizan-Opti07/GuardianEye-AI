package io.github.childscreentime.education;

import android.content.Context;
import android.util.Log;

/**
 * EducationalExemptionManager implements the Smart Dual-Timer & Exemption logic:
 * While the child is actively using the AI Educational Study Hub,
 * the entertainment overtime countdown is PAUSED.
 * 
 * Study time accumulates towards the mandatory 2-hour daily requirement.
 */
public class EducationalExemptionManager {
    private static final String TAG = "EduExemptionManager";
    public static final long MANDATORY_STUDY_GOAL_MS = 120 * 60 * 1000L; // 2.0 hours
    
    private static EducationalExemptionManager instance;
    private final Context context;
    private boolean isEducationalSessionActive = false;
    private long dailyStudyTimeMs = 0;
    private long dailyEntertainmentTimeMs = 0;

    private EducationalExemptionManager(Context context) {
        this.context = context.getApplicationContext();
    }

    public static synchronized EducationalExemptionManager getInstance(Context context) {
        if (instance == null) {
            instance = new EducationalExemptionManager(context);
        }
        return instance;
    }

    public void setEducationalSessionActive(boolean active) {
        this.isEducationalSessionActive = active;
        Log.d(TAG, "Educational Exemption State: " + (active ? "ACTIVE (Entertainment Timer Paused)" : "INACTIVE"));
    }

    public boolean isEducationalSessionActive() {
        return isEducationalSessionActive;
    }

    /**
     * Updates screen time counters according to active mode.
     */
    public synchronized void recordUsageTick(long deltaMs, boolean isUserEngaged) {
        if (isEducationalSessionActive) {
            if (isUserEngaged) {
                dailyStudyTimeMs += deltaMs;
                Log.d(TAG, "Study time: " + (dailyStudyTimeMs / 60000) + " / 120 mins");
            } else {
                Log.w(TAG, "Child is in study tab but idle! Study progress paused.");
            }
        } else {
            dailyEntertainmentTimeMs += deltaMs;
            Log.d(TAG, "Entertainment time: " + (dailyEntertainmentTimeMs / 60000) + " / 90 mins max");
        }
    }

    public boolean isStudyGoalMet() {
        return dailyStudyTimeMs >= MANDATORY_STUDY_GOAL_MS;
    }

    public boolean isEntertainmentCapExceeded() {
        return dailyEntertainmentTimeMs >= 90 * 60 * 1000L; // 1.5 hours
    }

    public long getDailyStudyTimeMs() {
        return dailyStudyTimeMs;
    }

    public long getDailyEntertainmentTimeMs() {
        return dailyEntertainmentTimeMs;
    }
}
