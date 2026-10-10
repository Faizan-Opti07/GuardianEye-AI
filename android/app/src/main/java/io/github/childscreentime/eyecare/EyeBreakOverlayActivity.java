package io.github.childscreentime.eyecare;

import android.app.Activity;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import io.github.childscreentime.R;

/**
 * Fullscreen Unskippable Eye Break Activity.
 * Intercepts key events and enforces the 35-second pause to protect eyesight.
 */
public class EyeBreakOverlayActivity extends Activity {
    private TextView timerTextView;
    private TextView guidanceTextView;
    private CountDownTimer countDownTimer;
    private static final int COUNTDOWN_SECONDS = 35;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Full screen, keep screen on, above lockscreen
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // Hide navigation bars (Immersive Sticky)
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_FULLSCREEN
        );

        setContentView(R.layout.service_eyebreak_overlay);

        timerTextView = findViewById(R.id.tv_eyebreak_countdown);
        guidanceTextView = findViewById(R.id.tv_eyebreak_guidance);

        startCountDown();
    }

    private void startCountDown() {
        countDownTimer = new CountDownTimer(COUNTDOWN_SECONDS * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int secondsRemaining = (int) (millisUntilFinished / 1000);
                if (timerTextView != null) {
                    timerTextView.setText(secondsRemaining + "s");
                }
                
                // Rotate ophthalmological guidance cues
                if (secondsRemaining > 20) {
                    guidanceTextView.setText("Look at an object at least 20 feet away (out of the window or across the room).");
                } else if (secondsRemaining > 10) {
                    guidanceTextView.setText("Gently blink your eyes and relax your facial muscles.");
                } else {
                    guidanceTextView.setText("Almost done! Preparing your screen...");
                }
            }

            @Override
            public void onFinish() {
                EyeCareManager.getInstance(EyeBreakOverlayActivity.this).onEyeBreakCompleted();
                finish();
            }
        }.start();
    }

    // Intercept back button - prevent skipping
    @Override
    public void onBackPressed() {
        // Intentionally no-op to enforce 35-second eye health protection
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_HOME || keyCode == KeyEvent.KEYCODE_APP_SWITCH) {
            return true; // Block switching apps during eye relaxation
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }
    }
}
