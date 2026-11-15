package io.github.dante3750.twominds.ui

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import io.github.dante3750.twominds.R

/** Short UI sounds and vibrations. Both can be switched off in Profile → Settings. */
object Sfx {
    private var pool: SoundPool? = null
    private val ids = HashMap<String, Int>()
    private var vibrator: Vibrator? = null
    var sound = true
    var vibrate = true

    fun init(ctx: Context) {
        if (pool != null) return
        pool = SoundPool.Builder().setMaxStreams(4)
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build()
        mapOf("tap" to R.raw.sfx_tap, "right" to R.raw.sfx_right, "wrong" to R.raw.sfx_wrong, "tick" to R.raw.sfx_tick, "win" to R.raw.sfx_win,
            "lose" to R.raw.sfx_lose, "vs" to R.raw.sfx_vs, "badge" to R.raw.sfx_badge).forEach { (k, r) -> ids[k] = pool!!.load(ctx, r, 1) }
        vibrator = if (Build.VERSION.SDK_INT >= 31) (ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        else @Suppress("DEPRECATION") (ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
    }

    fun play(name: String) {
        if (!sound) return
        val id = ids[name] ?: return
        pool?.play(id, 1f, 1f, 1, 0, 1f)
    }

    fun buzz(kind: String = "light") {
        if (!vibrate) return
        val v = vibrator ?: return
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                v.vibrate(VibrationEffect.createPredefined(when (kind) { "success" -> VibrationEffect.EFFECT_DOUBLE_CLICK; "error" -> VibrationEffect.EFFECT_HEAVY_CLICK; "medium" -> VibrationEffect.EFFECT_CLICK; else -> VibrationEffect.EFFECT_TICK }))
            } else if (Build.VERSION.SDK_INT >= 26) {
                v.vibrate(VibrationEffect.createOneShot(if (kind == "light") 12 else 35, VibrationEffect.DEFAULT_AMPLITUDE))
            } else @Suppress("DEPRECATION") v.vibrate(if (kind == "light") 12 else 35)
        } catch (_: Exception) { }
    }
}
