package io.github.dante3750.twominds

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import android.graphics.Color as AColor
import io.github.dante3750.twominds.ui.Sfx

class MainActivity : ComponentActivity() {
    private lateinit var state: AppState

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Sfx.init(this)
        state = (application as? TwoMindsApp)?.state ?: AppState(this)
        setContent {
            val s = remember { state }
            LaunchedEffect(s.theme) {
                val light = !s.palette.dark
                enableEdgeToEdge(
                    if (light) SystemBarStyle.light(AColor.TRANSPARENT, AColor.TRANSPARENT) else SystemBarStyle.dark(AColor.TRANSPARENT),
                    if (light) SystemBarStyle.light(AColor.TRANSPARENT, AColor.TRANSPARENT) else SystemBarStyle.dark(AColor.TRANSPARENT),
                )
            }
            App(s)
        }
        linkFrom(intent)
    }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); linkFrom(intent) }

    private fun linkFrom(i: Intent?) {
        val text = when (i?.action) {
            Intent.ACTION_VIEW -> i.dataString
            Intent.ACTION_SEND -> i.getStringExtra(Intent.EXTRA_TEXT)
            else -> null
        }
        state.openLink(text)
    }

    override fun onResume() { super.onResume(); state.startPolling(); if (state.signedIn) state.launch { state.refreshInbox() } }
    override fun onPause() { super.onPause(); state.stopPolling() }
}

/** Keeps the app state across screen rotations / activity restarts. */
class TwoMindsApp : android.app.Application() {
    val state by lazy { AppState(this) }
}
