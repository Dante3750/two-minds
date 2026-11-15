package io.github.dante3750.twominds.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.Match
import io.github.dante3750.twominds.data.overallLevel
import io.github.dante3750.twominds.ui.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

@Composable
private fun Radar(color: Color, content: @Composable () -> Unit) {
    val inf = rememberInfiniteTransition(label = "radar")
    val v by inf.animateFloat(0f, 1f, infiniteRepeatable(tween(2700, easing = LinearEasing)), label = "r")
    Box(Modifier.size(220.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            for (k in 0..2) { val x = (v + k / 3f) % 1f; drawCircle(color.copy(alpha = 0.9f * (1 - x)), size.minDimension / 2 * (0.3f + 0.7f * x), style = Stroke(2.dp.toPx())) }
        }
        content()
    }
}

/** Quick match: ask the server every 3 seconds until someone else searches the same topic. */
@Composable
fun SearchScreen(topic: String) {
    val s = LocalApp.current; val p = pal; val t = s.topic(topic)
    var secs by remember { mutableIntStateOf(0) }; var err by remember { mutableStateOf<String?>(null) }; var stopped by remember { mutableStateOf(false) }
    var found by remember { mutableStateOf(false) }
    LaunchedEffect(topic) {
        val start = System.currentTimeMillis()
        while (isActive && !found && !stopped) {
            try {
                val m = s.game.quick(topic, s.timeMs); err = null
                if (m != null) {
                    found = true; Sfx.play("vs"); Sfx.buzz("success")
                    s.toast("Matched with ${m.players.firstOrNull { it.card.id != s.me }?.card?.name ?: "someone"}!")
                    s.replace(Route.Play(m)); break
                }
            } catch (e: Exception) { err = e.message }
            repeat(3) { delay(1000); secs = ((System.currentTimeMillis() - start) / 1000).toInt() }
            if (secs >= 180) { stopped = true; err = "Search stopped after 3 minutes"; s.launch { s.game.cancelQuick() } }
        }
    }
    DisposableEffect(Unit) { onDispose { if (!found) s.launch { s.game.cancelQuick() } } }
    Page {
        Spacer(Modifier.height(30.dp))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Pill("${t.name} · Quick match", t.icon, hex(t.color))
            H1("Finding an opponent", align = TextAlign.Center)
            Radar(hex(t.color)) { Avatar(s.profile?.card?.name ?: "?", s.profile?.card?.color ?: "#ff6b5a", 84.dp, s.profile?.card?.frame) }
            Small("Anyone who picks ${t.name} right now gets matched with you.", align = TextAlign.Center)
            CardBox { Txt(err ?: "Searching… ${secs}s", Modifier.fillMaxWidth(), weight = FontWeight.Medium, color = if (err != null) p.bad else p.ink2, align = TextAlign.Center) }
            if (secs >= 25 || stopped) CardBox {
                Txt("No one's playing ${t.name} right now", Modifier.fillMaxWidth(), weight = FontWeight.Bold, align = TextAlign.Center)
                Btn("Play a bot instead", Modifier.fillMaxWidth(), kind = "cta", icon = "bot") { found = true; s.launch { s.game.cancelQuick() }; s.back(); s.startBot(topic) }
                if (stopped) Btn("Search again", Modifier.fillMaxWidth()) { s.replace(Route.Search(topic)) }
            }
            Btn("Cancel", Modifier.fillMaxWidth(), kind = "ghost") { s.back() }
        }
    }
}

/** Live invite sent: wait for the friend to join. */
@Composable
fun LobbyScreen(match: Match) {
    val s = LocalApp.current; val t = s.topic(match.topic)
    val friend = match.players.first { it.card.id != s.me }
    var declined by remember { mutableStateOf(false) }; var started by remember { mutableStateOf(false) }
    LaunchedEffect(match.id) {
        while (isActive && !started && !declined) {
            delay(2000)
            try {
                val m = s.game.get(match.id)
                if (m.status == "playing") { started = true; Sfx.play("vs"); Sfx.buzz("success"); s.replace(Route.Play(m)) }
                else if (m.status == "cancelled") declined = true
            } catch (_: Exception) { }
        }
    }
    DisposableEffect(Unit) { onDispose { if (!started && !declined) s.launch { s.game.leave(match.id) } } }
    Page {
        Spacer(Modifier.height(60.dp))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(20.dp)) {
            H1(if (declined) "${friend.card.name} can't play now" else "Waiting for ${friend.card.name}", align = TextAlign.Center)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) { Avatar(s.profile?.card?.name ?: "You", s.profile?.card?.color ?: "#ff6b5a", 76.dp, s.profile?.card?.frame); Txt("You", weight = FontWeight.Medium) }
                Txt("VS", size = 30.sp, color = hex(t.color), display = true)
                val inf = rememberInfiniteTransition(label = "wait"); val a by inf.animateFloat(0.25f, 0.65f, infiniteRepeatable(tween(1100), RepeatMode.Reverse), label = "a")
                Column(Modifier.alpha(if (declined) 0.3f else a), horizontalAlignment = Alignment.CenterHorizontally) { Avatar(friend.card.name, friend.card.color, 76.dp, friend.card.frame); Txt(friend.card.name, weight = FontWeight.Medium, lines = 1) }
            }
            Small(if (declined) "They said not now. Try later, or send a challenge they can play anytime." else "${friend.card.name} gets an invite in the app. Level ${overallLevel(friend.card.xp).lv} · ${t.name}", align = TextAlign.Center)
            if (declined) Btn("Send a challenge instead", Modifier.fillMaxWidth(), kind = "cta", icon = "send") { s.back(); s.startChallenge(match.topic, friend.card.id) }
            Btn(if (declined) "Back" else "Cancel", Modifier.fillMaxWidth(), kind = "ghost") { s.back() }
        }
    }
}

/** A challenge link was opened: who sent it, the score to beat, then play. */
@Composable
fun ChallengeScreen(id: String) {
    val s = LocalApp.current; val p = pal
    var m by remember { mutableStateOf<Match?>(null) }; var busy by remember { mutableStateOf(false) }
    LaunchedEffect(id) { try { m = s.game.get(id) } catch (e: Exception) { s.toast(e.message ?: ""); s.back() } }
    val x = m
    if (x == null) { Page { Spacer(Modifier.height(200.dp)); H2("Opening the challenge…", Modifier.fillMaxWidth(), align = TextAlign.Center) }; return }
    val host = x.player(x.host) ?: return; val t = s.topic(x.topic); val own = host.card.id == s.me; val mine = x.player(s.me)
    Page {
        Spacer(Modifier.height(40.dp))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Avatar(host.card.name, host.card.color, 90.dp, host.card.frame)
            H1(if (own) "Your challenge" else "${host.card.name} challenged you", align = TextAlign.Center)
            Pill(t.name, t.icon, hex(t.color))
            Txt(if (host.state == "done") "Same 7 questions, ${x.timeMs / 1000} seconds each. Score to beat: ${host.score}" else "They haven't finished playing yet.", color = p.ink2, align = TextAlign.Center, lineHeight = 22.sp)
        }
        if (own || mine?.state == "done") Btn("See the scores", Modifier.fillMaxWidth(), kind = "cta") { s.replace(Route.Results(id)) }
        else Btn("Accept challenge", Modifier.fillMaxWidth(), kind = "cta", icon = "zap", busy = busy) {
            busy = true
            s.launch { try { val j = s.game.join(id); Sfx.play("vs"); s.replace(Route.Play(j)) } finally { busy = false } }
        }
        Btn("Not now", Modifier.fillMaxWidth(), kind = "ghost") { s.back() }
    }
}
