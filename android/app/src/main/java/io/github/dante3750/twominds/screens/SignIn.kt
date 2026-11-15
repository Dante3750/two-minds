package io.github.dante3750.twominds.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Logo
import io.github.dante3750.twominds.data.ApiException
import io.github.dante3750.twominds.data.COLORS
import io.github.dante3750.twominds.ui.*
import kotlinx.coroutines.launch

@Composable
fun SignInScreen() {
    val s = LocalApp.current; val p = pal; val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf(s.api.email ?: "") }
    var code by remember { mutableStateOf("") }
    var step by remember { mutableStateOf("email") }
    var busy by remember { mutableStateOf(false) }
    var msg by remember { mutableStateOf<String?>(null) }
    val ok = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(email.trim())

    fun send() = scope.launch {
        busy = true; msg = null
        try { s.api.sendCode(email.trim().lowercase()); step = "code" } catch (e: ApiException) { msg = e.message }
        busy = false
    }
    fun verify(c: String) = scope.launch {
        busy = true; msg = null
        try { s.api.verifyCode(email.trim().lowercase(), c); s.onSignedIn() } catch (e: ApiException) { msg = e.message; code = "" }
        busy = false
    }

    Page {
        Spacer(Modifier.height(40.dp))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Canvas(Modifier.size(150.dp, 96.dp)) {
                drawCircle(p.p1, 44.dp.toPx(), Offset(48.dp.toPx(), 48.dp.toPx()))
                drawCircle(p.p2.copy(alpha = 0.85f), 44.dp.toPx(), Offset(102.dp.toPx(), 48.dp.toPx()))
            }
            Logo(big = true)
            Txt("Head-to-head trivia. Same question, ten seconds, the fastest right answer wins.", color = p.ink2, align = TextAlign.Center, lineHeight = 22.sp)
        }
        if (!s.api.configured) CardBox { Small("This build isn't connected to the game server yet.") }
        CardBox {
            if (step == "email") {
                Label("Your email")
                Field(email, { email = it }, "you@example.com", keyboard = KeyboardType.Email, onDone = { if (ok) send() }, tag = "email")
                Small("We'll email you a 6-digit code. No password.")
                Btn("Send my code", Modifier.fillMaxWidth(), kind = "cta", busy = busy, enabled = ok) { send() }
            } else {
                Label("Code sent to ${email.trim()}")
                Field(code, { v -> val d = v.filter { it.isDigit() }.take(6); code = d; if (d.length == 6) verify(d) }, "6-digit code", keyboard = KeyboardType.NumberPassword, big = true, tag = "code")
                Btn("Sign in", Modifier.fillMaxWidth(), kind = "cta", busy = busy, enabled = code.length == 6) { verify(code) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Txt("Change email", Modifier.press(label = "Change email") { step = "email"; code = ""; msg = null }.padding(6.dp), 13.sp, color = p.goldText)
                    Txt("Send a new code", Modifier.press(label = "Send a new code") { send() }.padding(6.dp), 13.sp, color = p.goldText)
                }
            }
            msg?.let { Txt(it, size = 13.sp, color = p.bad) }
        }
        Small("Your account keeps your friends, levels and history on any phone.", Modifier.fillMaxWidth(), align = TextAlign.Center)
    }
}

@Composable
fun SetupScreen() {
    val s = LocalApp.current; val p = pal; val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var user by remember { mutableStateOf("") }
    var touched by remember { mutableStateOf(false) }
    var color by remember { mutableStateOf(COLORS.random()) }
    var busy by remember { mutableStateOf(false) }
    var msg by remember { mutableStateOf<String?>(null) }
    val suggested = java.text.Normalizer.normalize(name.lowercase(), java.text.Normalizer.Form.NFKD).filter { it in 'a'..'z' || it in '0'..'9' || it == '_' }.take(12)
    val username = if (touched) user else suggested
    val valid = name.isNotBlank() && Regex("^[a-z0-9_]{3,16}$").matches(username)

    Page {
        Spacer(Modifier.height(30.dp))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Avatar(name.ifBlank { "?" }, color, 96.dp)
            H1(if (name.isNotBlank()) "Hi, ${name.trim()}!" else "What should we call you?", align = TextAlign.Center)
            Small(s.api.email ?: "")
        }
        CardBox {
            Label("Your name"); Field(name, { name = it.take(24) }, "Your name", tag = "name")
            Label("Username")
            Field("@$username", { v -> touched = true; user = v.removePrefix("@").lowercase().filter { it in 'a'..'z' || it in '0'..'9' || it == '_' }.take(16) }, "@username", tag = "username")
            Small("Friends find you by this. 3 to 16 letters, numbers or _.")
            Label("Your colour")
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                COLORS.forEach { c ->
                    Box(Modifier.size(34.dp).press(label = "Colour $c") { color = c }.clip(CircleShape).background(hex(c)).then(if (c == color) Modifier.border(3.dp, p.ink, CircleShape) else Modifier),
                        contentAlignment = Alignment.Center) { if (c == color) Icon("check", 16.dp, Color(0xFF140D1F), 3f) }
                }
            }
            msg?.let { Txt(it, size = 13.sp, color = p.bad) }
            Btn("Start playing", Modifier.fillMaxWidth(), kind = "cta", busy = busy, enabled = valid) {
                scope.launch {
                    busy = true; msg = null
                    try { s.game.createProfile(username, name.trim(), color); s.refreshProfile(); s.refreshTopics() }
                    catch (e: ApiException) {
                        val m = e.message ?: ""
                        if (m.contains("taken")) { msg = "@$username is taken. Try another."; touched = true; user = username + (10..99).random() } else msg = m
                    }
                    busy = false
                }
            }
        }
    }
}
