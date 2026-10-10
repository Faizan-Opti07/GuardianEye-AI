package io.github.childscreentime.engagement;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import io.github.childscreentime.telemetry.PocketMoneySyncClient;

/**
 * AntiIdleEngagementMonitor detects whether the child is actively interacting
 * with the study modules or has merely opened the tab and walked away.
 * 
 * If idle for > 45 seconds during mandatory study, flags a cheating strike
 * and notifies the Father's Desktop Dashboard.
 */
public class AntiIdleEngagementMonitor {
    private static final String TAG = "AntiIdleMonitor";
    private static final long INACTIVITY_THRESHOLD_MS = 45 * 1000L; // 45 seconds idle threshold
    
    private static AntiIdleEngagementMonitor instance;
    private final Context context;
    private long lastInteractionTime = System.currentTimeMillis();
    private boolean isCurrentlyIdle = false;
    private int strikeCount = 0;

    private AntiIdleEngagementMonitor(Context context) {
        this.context = context.getApplicationContext();
    }

    public static synchronized AntiIdleEngagementMonitor getInstance(Context context) {
        if (instance == null) {
            instance = new AntiIdleEngagementMonitor(context);
        }
        return instance;
    }

    /**
     * Called whenever a touch, scroll, or keystroke is detected in the study interface.
     */
    public synchronized void recordUserInteraction() {
        lastInteractionTime = System.currentTimeMillis();
        if (isCurrentlyIdle) {
            isCurrentlyIdle = false;
            Log.i(TAG, "Student resumed active engagement. Resuming study timer.");
        }
    }

    /**
     * Periodic check called by background service.
     */
    public synchronized void evaluateEngagement() {
        long idleDuration = System.currentTimeMillis() - lastInteractionTime;
        
        if (idleDuration >= INACTIVITY_THRESHOLD_MS && !isCurrentlyIdle) {
            isCurrentlyIdle = true;
            strikeCount++;
            Log.w(TAG, "INACTIVITY DETECTED! Child idle for " + (idleDuration / 1000) + "s. Strike #" + strikeCount);
            
            // Dispatch telemetry alert to father's dashboard
            PocketMoneySyncClient.getInstance(context).reportIdleCheatStrike(
                "Student idle for " + (idleDuration / 1000) + "s during study session. Potential cheating attempt.",
                15.0f
            );
        }
    }

    public boolean isEngaged() {
        return !isCurrentlyIdle;
    }

    public int getStrikeCount() {
        return strikeCount;
    }
}
