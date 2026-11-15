package io.github.dante3750.twominds.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Logo
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.*
import java.time.LocalDate
import java.time.ZoneOffset

@Composable
fun HomeScreen() {
    val s = LocalApp.current; val p = pal; val prof = s.profile ?: return
    var recent by remember { mutableStateOf<List<Match>>(emptyList()) }
    LaunchedEffect(prof.played) { try { recent = s.game.history().take(3) } catch (_: Exception) { } }
    LaunchedEffect(Unit) { s.refreshInbox(); s.refreshProfile() }

    val lv = overallLevel(prof.card.xp); val tier = tierOf(prof.seasonPts)
    val today = LocalDate.now(ZoneOffset.UTC).toString(); val yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1).toString()
    val streak = if (prof.streakDay == today || prof.streakDay == yesterday) prof.streakCur else 0
    val mine = prof.topics.entries.sortedByDescending { it.value.xp }.map { s.topic(it.key) }.filter { it.id != "mixed" }
    val row = (mine + s.playable.filter { it.id !in prof.topics }).distinctBy { it.id }.take(10)

    Page(tabs = true) {
        Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) { Logo() }
            IconBtn("history", "Match history") { s.go(Route.History) }
        }

        CardBox(Modifier.press(label = "Your profile") { s.go(Route.Me) }) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                LevelAvatar(prof.card.name, prof.card.color, prof.card.xp, 52.dp, prof.card.frame)
                Column(Modifier.weight(1f)) {
                    H2("Hi, ${prof.card.name}")
                    Small("${titleFor(lv.lv)} · ${lv.need - lv.into} XP to level ${lv.lv + 1}", lines = 1)
                }
            }
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip(if (streak > 0) "$streak-day streak" else "Start a streak", "flame", Color(0xFFFF9F43))
                Chip("${tier.name} · ${prof.seasonPts} pts", "medal", hex(tier.color))
                Chip("${prof.weekPoints} pts this week", "trophy", p.gold)
            }
        }

        s.inbox?.let { ib ->
            ib.challenges.forEach { m ->
                val h = m.player(m.host) ?: return@forEach
                Banner(h.card, null, p.gold, "${h.card.name} challenged you", "${s.topic(m.topic).name} · ${h.score} to beat", "Play") { s.go(Route.Challenge(m.id)) }
            }
            ib.results.take(2).forEach { r ->
                Banner(r.player, null, if (r.myScore > r.score) p.good else if (r.myScore < r.score) p.bad else p.gold, "${r.player.name} played your challenge",
                    "${s.topic(r.topic).name} · you ${r.myScore}–${r.score}", "See") { s.go(Route.Results(r.match)) }
            }
            if (ib.requests > 0) Banner(null, "useradd", p.p2, "${ib.requests} friend request${if (ib.requests > 1) "s" else ""}", "Tap to answer", "Open") { s.go(Route.Friends) }
        }

        Hero(onQuick = { s.sheet = { TopicPicker("Quick match on…") { s.startQuick(it) } } }, onAny = { s.startQuick("mixed") })

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Way("zap", "Live", Color(0xFF3DDC97)) { s.sheet = { FriendPicker("Play live with…") { f -> s.sheet = { TopicPicker("Pick a topic", mixed = true) { s.startLive(it, f.id) } } } } }
            Way("send", "Challenge", Color(0xFF5CC8FF)) { s.sheet = { TopicPicker("Challenge on…") { s.startChallenge(it) } } }
            Way("sun", "Daily", Color(0xFFFFC53D)) { s.startDaily() }
            Way("bot", "Practice", Color(0xFFFF7A6B)) { s.sheet = { TopicPicker("Practice on…") { s.startBot(it) } } }
            Way("heart", "Couple", Color(0xFFFF7096)) { s.go(Route.Couple) }
        }

        SectionHead(if (mine.isNotEmpty()) "Your topics" else "Popular topics", "All ${s.playable.size}") { s.go(Route.Topics) }
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            row.forEach { t -> TopicTile(t, Modifier.width(118.dp)) { s.go(Route.TopicPage(t.id)) } }
        }

        if (recent.isNotEmpty()) {
            SectionHead("Recent matches", "See all") { s.go(Route.History) }
            recent.forEach { m -> MatchRow(m) { s.go(Route.Detail(m.id)) } }
        }
    }
}

@Composable
private fun Banner(who: Card?, icon: String?, color: Color, title: String, sub: String, action: String, onClick: () -> Unit) {
    val p = pal; val shape = RoundedCornerShape(16.dp)
    Row(Modifier.fillMaxWidth().press(label = title, onClick = onClick).clip(shape).background(p.s1).border(1.dp, color.copy(alpha = 0.45f), shape).padding(10.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        if (who != null) Avatar(who.name, who.color, 34.dp, who.frame)
        else Box(Modifier.size(34.dp).clip(CircleShape).background(color.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) { Icon(icon ?: "bell", 18.dp, color) }
        Column(Modifier.weight(1f)) { Txt(title, size = 14.sp, weight = FontWeight.Bold, lines = 1); Small(sub, lines = 1) }
        Box(Modifier.clip(RoundedCornerShape(999.dp)).background(color).padding(horizontal = 14.dp, vertical = 9.dp)) { Txt(action, size = 13.sp, weight = FontWeight.Bold, color = TILE_INK) }
    }
}

@Composable
private fun Way(icon: String, label: String, color: Color, onClick: () -> Unit) {
    val p = pal; val shape = RoundedCornerShape(18.dp)
    Column(Modifier.width(62.dp).press(label = label, onClick = onClick), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(54.dp).clip(shape).background(if (p.dark) mix(p.s1, color, 0.2f) else mix(Color.White, color, 0.22f)).border(1.dp, color.copy(alpha = 0.4f), shape), contentAlignment = Alignment.Center) {
            Icon(icon, color = if (p.dark) color else mix(color, Color.Black, 0.35f))
        }
        Txt(label, size = 11.5.sp, weight = FontWeight.Medium, color = p.ink2, lines = 1)
    }
}

@Composable
private fun Hero(onQuick: () -> Unit, onAny: () -> Unit) {
    val p = pal; val shape = RoundedCornerShape(26.dp)
    val inf = rememberInfiniteTransition(label = "hero")
    val wave by inf.animateFloat(0f, 1f, infiniteRepeatable(tween(3600, easing = LinearEasing)), label = "wave")
    Box(Modifier.fillMaxWidth().clip(shape).background(p.gold)) {
        Canvas(Modifier.matchParentSize()) {
            for (k in 0..2) {
                val v = (wave + k / 3f) % 1f
                drawCircle(TILE_INK.copy(alpha = 0.14f * (1 - v)), radius = 100.dp.toPx() * (0.3f + v * 0.95f), center = Offset(size.width - 30.dp.toPx(), 30.dp.toPx()), style = Stroke(2.dp.toPx()))
            }
        }
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Column(Modifier.press(label = "Quick match", onClick = onQuick), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon("zap", 15.dp, TILE_INK.copy(alpha = 0.75f), 2.2f); Txt("QUICK MATCH", size = 11.5.sp, weight = FontWeight.Bold, color = TILE_INK.copy(alpha = 0.75f), spacing = 1.6.sp)
                }
                Txt("Find an opponent", size = 28.sp, weight = FontWeight.Bold, color = TILE_INK, spacing = (-0.8).sp)
                Txt("Pick a topic. Anyone playing it right now gets matched with you.", size = 13.5.sp, weight = FontWeight.Medium, color = TILE_INK.copy(alpha = 0.8f))
            }
            Row(Modifier.press(label = "Any topic", onClick = onAny).clip(RoundedCornerShape(999.dp)).background(TILE_INK.copy(alpha = 0.14f)).padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon("shuffle", 16.dp, TILE_INK, 2.2f); Txt("Any topic", size = 13.sp, weight = FontWeight.Bold, color = TILE_INK)
            }
        }
    }
}
