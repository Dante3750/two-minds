package io.github.dante3750.twominds.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.*
import kotlinx.coroutines.delay

@Composable
fun ResultsScreen(id: String) {
    val s = LocalApp.current; val p = pal; val ctx = LocalContext.current; val me = s.me
    var m by remember { mutableStateOf<Match?>(null) }
    var rounds by remember { mutableStateOf<List<DetailRound>?>(null) }
    var after by remember { mutableStateOf<Profile?>(null) }
    val before = remember { s.profile }
    var levelUp by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(id) {
        var x: Match? = null
        try {
            x = s.game.get(id)
            if (x.player(me)?.state != "done") x = s.game.finish(id)
            var tries = 0
            // live: the result is settled when the other player finishes (or goes quiet)
            while ((x!!.mode == "live" || x.mode == "quick") && x.player(me)?.result == null && tries++ < 120) { m = x; delay(2500); x = s.game.finish(id) }
        } catch (e: Exception) { s.toast(e.message ?: "") }
        val done = x ?: return@LaunchedEffect
        m = done
        val r = done.player(me)?.result
        Sfx.play(when (r) { "w" -> "win"; "l" -> "lose"; else -> "badge" }); Sfx.buzz(if (r == "w") "success" else "light")
        try { rounds = s.game.detail(id).second } catch (_: Exception) { }
        val a = s.refreshProfile(); after = a
        if (a != null && before != null) {
            val l0 = levelOf(before.topics[done.topic]?.xp ?: 0).lv; val l1 = levelOf(a.topics[done.topic]?.xp ?: 0).lv
            if (l1 > l0) { delay(1400); levelUp = l1; Sfx.play("badge"); Sfx.buzz("success") }
        }
    }

    val x = m
    if (x == null) { Page { Spacer(Modifier.height(200.dp)); H2("Adding up…", Modifier.fillMaxWidth(), align = TextAlign.Center) }; return }
    val t = s.topic(x.topic); val tc = hex(t.color)
    val mine = x.player(me) ?: return
    val isHost = x.host == me
    val opp = if (x.mode == "challenge") (if (isHost) null else x.player(x.host)) else x.players.firstOrNull { it.card.id != me }
    val oppScore: Int? = opp?.score ?: if (x.bot != null) rounds?.sumOf { it.bot?.points ?: 0 } else null
    val oppName = opp?.card?.name ?: x.bot?.name ?: if (x.mode == "daily") "Everyone" else "Anyone"
    val oppColor = opp?.card?.color ?: "#9aa3d1"
    val res = mine.result
    val head = when (res) {
        null -> "Waiting for the other score…"
        "p" -> if (x.mode == "daily") (if (x.practice) "Practice done" else "Daily Duel done") else "Challenge ready"
        "w" -> "You win!"; "l" -> "$oppName wins"; else -> "It's a draw!"
    }
    val newBadges = if (after != null && before != null) after!!.badges.filter { it !in before.badges } else emptyList()
    val tl = after?.let { levelOf(it.topics[x.topic]?.xp ?: 0) }
    val modeName = mapOf("bot" to "Practice", "live" to "Live", "quick" to "Quick match", "challenge" to "Challenge", "daily" to if (x.practice) "Daily practice" else "Daily Duel")[x.mode] ?: ""

    Box(Modifier.fillMaxSize()) {
        Page {
            Column(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Pill("${t.name} · $modeName", t.icon, tc)
                Txt(head, size = 34.sp, weight = FontWeight.Bold, align = TextAlign.Center, spacing = (-1).sp)
            }
            CardBox(pad = 18.dp) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ScoreCol(s.profile?.card?.name ?: "You", s.profile?.card?.color ?: "#ff6b5a", s.profile?.card?.frame, mine.score, res == "w", Modifier.weight(1f))
                    Label("VS")
                    ScoreCol(oppName, oppColor, opp?.card?.frame, oppScore, res == "l", Modifier.weight(1f))
                }
                val rs = rounds
                if (rs != null && oppScore != null) Race(rs, me, opp?.card?.id, hex(s.profile?.card?.color ?: "#ff6b5a"), hex(oppColor))
            }
            if (x.practice) CardBox { Small("Practice: no XP. Today's Daily score is already in.") }
            else if (tl != null) CardBox(border = if (levelUp != null) p.gold.copy(alpha = 0.5f) else null) {
                Row { Txt("+${maxOf(0, mine.xpGained)} XP", Modifier.weight(1f), weight = FontWeight.Bold, color = p.goldText); Small("Lv ${tl.lv} · ${titleFor(tl.lv, TOPIC_TITLES)}") }
                Bar(tl.pct, tc)
            }
            newBadges.forEach { bid ->
                val b = BADGES.firstOrNull { it.id == bid } ?: return@forEach
                CardBox(border = p.gold.copy(alpha = 0.45f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(Modifier.size(42.dp).clip(CircleShape).background(p.gold), contentAlignment = Alignment.Center) { Icon(b.icon, color = p.goldInk) }
                        Column { Txt("Badge: ${b.name}", weight = FontWeight.Bold); Small(b.text) }
                    }
                }
            }
            if (isHost && x.mode == "challenge") {
                val others = x.players.filter { it.card.id != me && it.state == "done" }.sortedByDescending { it.score }
                CardBox {
                    H2(if (others.isNotEmpty()) "Who played it" else "Send it to someone")
                    if (others.isEmpty()) Small("Anyone with the link plays the same 7 questions. Their score shows up here.")
                    others.forEach { o ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Avatar(o.card.name, o.card.color, 32.dp, o.card.frame); Txt(o.card.name, Modifier.weight(1f), weight = FontWeight.Medium, lines = 1)
                            Txt("${o.score}", size = 18.sp, display = true, color = if (o.score > mine.score) p.bad else if (o.score < mine.score) p.good else p.goldText)
                        }
                    }
                    Btn("Send the challenge", Modifier.fillMaxWidth(), kind = "green", icon = "chat") {
                        share(ctx, "${s.profile?.card?.name} challenged you on Two Minds: ${t.name}. ${mine.score} points to beat!\n${challengeUrl(x.id)}")
                    }
                }
            }
            if (x.mode != "daily") Btn(when { x.mode == "live" -> "Rematch"; x.mode == "challenge" && !isHost -> "Challenge back"; else -> "Play again" }, Modifier.fillMaxWidth(), kind = "cta", icon = "repeat", color = tc) {
                when {
                    x.mode == "bot" -> s.startBot(x.topic)
                    x.mode == "quick" -> s.startQuick(x.topic)
                    x.mode == "live" && opp != null -> s.startLive(x.topic, opp.card.id)
                    x.mode == "challenge" && !isHost && opp != null -> s.startChallenge(x.topic, opp.card.id)
                    else -> s.startChallenge(x.topic)
                }
            }
            if (oppScore != null && res != "p" && res != null) Btn("Share this result", Modifier.fillMaxWidth(), icon = "share") {
                share(ctx, when (res) { "w" -> "I beat $oppName ${mine.score}–$oppScore at ${t.name} on Two Minds!"; "l" -> "$oppName beat me $oppScore–${mine.score} at ${t.name} on Two Minds. Rematch soon."; else -> "$oppName and I drew ${mine.score}–$oppScore at ${t.name} on Two Minds." })
            }
            Btn("See every round", Modifier.fillMaxWidth(), icon = "eye") { s.go(Route.Detail(x.id)) }
            Btn("Home", Modifier.fillMaxWidth(), kind = "ghost") { s.resetTo(Route.Home) }
        }
        levelUp?.let { LevelUp(it, t.name, tc) { levelUp = null } }
    }
}

@Composable
private fun ScoreCol(name: String, color: String, frame: String?, score: Int?, win: Boolean, modifier: Modifier) {
    val p = pal; val anim = remember { Animatable(0f) }
    LaunchedEffect(score) { if (score != null) anim.animateTo(score.toFloat(), tween(1100, easing = FastOutSlowInEasing)) }
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.height(24.dp)) { if (win) Icon("crown", color = p.goldText) }
        Box(Modifier.then(if (win) Modifier.border(3.dp, p.gold, CircleShape).padding(3.dp) else Modifier)) { Avatar(name, color, 70.dp, frame) }
        Txt(if (score == null) "?" else "${anim.value.toInt()}", size = 42.sp, color = hex(color), display = true)
        Txt(name, size = 13.sp, weight = FontWeight.Medium, color = p.ink2, lines = 1)
    }
}

// both running totals after each round (QuizUp's score race)
@Composable
private fun Race(rounds: List<DetailRound>, me: String?, opp: String?, c0: Color, c1: Color) {
    val p = pal
    val a = mutableListOf(0); val b = mutableListOf(0)
    rounds.forEach { r -> a.add(a.last() + (r.picks[me]?.points ?: 0)); b.add(b.last() + (if (opp != null) r.picks[opp]?.points ?: 0 else r.bot?.points ?: 0)) }
    val showB = opp != null || rounds.any { it.bot != null }
    val grow = remember { Animatable(0f) }
    LaunchedEffect(Unit) { grow.animateTo(1f, tween(1200, 300)) }
    Canvas(Modifier.fillMaxWidth().height(64.dp)) {
        val n = (a.size - 1).coerceAtLeast(1); val max = maxOf(1, a.last(), b.last()).toFloat()
        for (i in 1..n) drawLine(p.line, Offset(size.width * i / n, 2f), Offset(size.width * i / n, size.height - 2f), 1f)
        fun path(v: List<Int>) = Path().apply { v.forEachIndexed { i, x -> val px = size.width * i / n; val py = size.height - 4 - x / max * (size.height - 10); if (i == 0) moveTo(px, py) else lineTo(px, py) } }
        clipRectSafe(size.width * grow.value) {
            if (showB) drawPath(path(b), c1, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
            drawPath(path(a), c0, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
    }
}

private inline fun androidx.compose.ui.graphics.drawscope.DrawScope.clipRectSafe(right: Float, block: androidx.compose.ui.graphics.drawscope.DrawScope.() -> Unit) {
    drawContext.canvas.save(); drawContext.canvas.clipRect(-10f, -10f, right + 10f, size.height + 10f); block(); drawContext.canvas.restore()
}

@Composable
private fun LevelUp(lv: Int, topic: String, color: Color, onClose: () -> Unit) {
    val a = remember { Animatable(0f) }
    LaunchedEffect(Unit) { a.animateTo(1f, spring(dampingRatio = 0.45f)); delay(2000); onClose() }
    Box(Modifier.fillMaxSize().background(color).clickable(remember { MutableInteractionSource() }, null, onClick = onClose), contentAlignment = Alignment.Center) {
        Column(Modifier.scale(a.value), horizontalAlignment = Alignment.CenterHorizontally) {
            Txt("LEVEL UP", size = 13.sp, weight = FontWeight.Bold, color = TILE_INK, spacing = 3.sp)
            Txt("$lv", size = 120.sp, color = TILE_INK, display = true)
            Txt("${titleFor(lv, TOPIC_TITLES)} in $topic", size = 16.sp, weight = FontWeight.Bold, color = TILE_INK)
        }
    }
}
