package io.github.childscreentime.telemetry;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * PocketMoneySyncClient streams live telemetry from the child device
 * to the father's desktop dashboard, and receives remote override commands.
 */
public class PocketMoneySyncClient {
    private static final String TAG = "PocketMoneySyncClient";
    private static PocketMoneySyncClient instance;
    private final Context context;
    private String serverUrl = "http://10.0.2.2:8080"; // Default emulator host or LAN IP

    private PocketMoneySyncClient(Context context) {
        this.context = context.getApplicationContext();
    }

    public static synchronized PocketMoneySyncClient getInstance(Context context) {
        if (instance == null) {
            instance = new PocketMoneySyncClient(context);
        }
        return instance;
    }

    public void setServerUrl(String url) {
        this.serverUrl = url;
    }

    /**
     * Reports anti-cheat idle violation to trigger pocket money penalty.
     */
    public void reportIdleCheatStrike(final String reason, final float deductionAmount) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(serverUrl + "/api/ai/engagement_check");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("idle_seconds", 50);
                    payload.put("reason", reason);
                    payload.put("penalty", deductionAmount);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes("UTF-8"));
                    os.flush();
                    os.close();

                    int responseCode = conn.getResponseCode();
                    Log.d(TAG, "Reported strike to server. Response code: " + responseCode);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to stream strike to parent server: " + e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Sends periodic device heartbeat to sync continuous screen time, entertainment time, and study time.
     */
    public void sendHeartbeat(final String appName, final int deltaSeconds, final boolean isStudying, final boolean isIdle) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(serverUrl + "/api/telemetry/heartbeat");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);

                    JSONObject payload = new JSONObject();
                    payload.put("app_name", appName);
                    payload.put("delta_seconds", deltaSeconds);
                    payload.put("is_studying", isStudying);
                    payload.put("is_idle", isIdle);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes("UTF-8"));
                    os.flush();
                    os.close();

                    int responseCode = conn.getResponseCode();
                    Log.d(TAG, "Heartbeat synced with status: " + responseCode);
                } catch (Exception e) {
                    Log.e(TAG, "Heartbeat sync error: " + e.getMessage());
                }
            }
        }).start();
    }
}
