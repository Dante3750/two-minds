package io.github.dante3750.twominds.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.*

private val CATS = listOf("all" to "All", "know" to "Knowledge", "pop" to "Pop culture", "world" to "World", "play" to "Sports & games")

@Composable
fun TopicsScreen() {
    val s = LocalApp.current
    var cat by remember { mutableStateOf("all") }; var q by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { s.refreshTopics() }
    val shown = s.playable.filter { (cat == "all" || it.category == cat) && it.name.contains(q.trim(), true) }
    val fresh = s.counts.values.sumOf { it.new }
    Page(tabs = true) {
        H1("Topics")
        if (fresh > 0) Small("$fresh new questions this week")
        Field(q, { q = it }, "Search topics")
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CATS.forEach { (id, n) -> Chip(n, active = cat == id) { cat = id } }
        }
        TopicGrid(shown) { s.go(Route.TopicPage(it.id)) }
        if (shown.isEmpty()) Small(if (s.topics.isEmpty()) "Loading topics…" else "No topic matches \"$q\"", Modifier.fillMaxWidth(), align = TextAlign.Center)
    }
}

@Composable
fun TopicScreen(id: String) {
    val s = LocalApp.current; val p = pal; val t = s.topic(id); val color = hex(t.color)
    var scope by remember { mutableStateOf("all") }
    var board by remember { mutableStateOf<List<BoardRow>?>(null) }
    LaunchedEffect(id, scope) { board = null; board = try { s.game.topicBoard(id, scope) } catch (_: Exception) { emptyList() } }
    val st = s.profile?.topics?.get(id); val L = levelOf(st?.xp ?: 0); val c = s.counts[id]

    Page {
        TopBar(sub = "Topic")
        Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(color)) {
            Canvas(Modifier.matchParentSize()) { drawCircle(Color.White.copy(alpha = 0.18f), 80.dp.toPx(), Offset(size.width - 40.dp.toPx(), 40.dp.toPx())) }
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    TopicBadge(t, 60.dp)
                    Column(Modifier.weight(1f)) {
                        Txt(t.name, size = 26.sp, weight = FontWeight.Bold, color = TILE_INK, spacing = (-0.6).sp, lines = 2)
                        Txt(if (c != null) "${c.total} questions · ${c.fresh} you haven't seen${if (c.new > 0) " · ${c.new} new" else ""}" else "7 rounds · last one counts double", size = 13.sp, color = TILE_INK.copy(alpha = 0.7f))
                    }
                }
                Txt("Lv ${L.lv} · ${titleFor(L.lv, TOPIC_TITLES)}", size = 12.5.sp, weight = FontWeight.Bold, color = TILE_INK)
                Bar(L.pct, TILE_INK, track = TILE_INK.copy(alpha = 0.14f))
            }
        }
        Btn("Play", Modifier.fillMaxWidth(), sub = "Quick match with anyone playing now", kind = "cta", icon = "zap", color = color, height = 68.dp) { s.startQuick(id) }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            WayTile("users", "Live", "With a friend", Modifier.weight(1f)) { s.sheet = { FriendPicker("Play live with…") { f -> s.startLive(id, f.id) } } }
            WayTile("send", "Challenge", "They play later", Modifier.weight(1f)) { s.startChallenge(id) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            WayTile("useradd", "Challenge a friend", "Lands in their inbox", Modifier.weight(1f)) { s.sheet = { FriendPicker("Challenge…") { f -> s.startChallenge(id, f.id) } } }
            WayTile("bot", "Practice", "${listOf("Easy", "Normal", "Hard")[s.bot]} bot", Modifier.weight(1f)) { s.startBot(id) }
        }
        if (st != null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Played" to st.played, "Won" to st.won, "Best" to st.best).forEach { (k, v) -> CardBox(Modifier.weight(1f), pad = 12.dp) { Label(k); Txt("$v", size = 22.sp, display = true) } }
        }
        SectionHead("Leaderboard")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Chip("Everyone", active = scope == "all") { scope = "all" }; Chip("Friends", active = scope == "friends") { scope = "friends" } }
        CardBox(pad = 10.dp) {
            val b = board
            when {
                b == null -> Small("Loading…", Modifier.padding(6.dp))
                b.isEmpty() -> Small("Nobody yet. Be the first on the board.", Modifier.padding(6.dp))
                else -> b.take(20).forEachIndexed { i, r -> BoardLine(i, r.card, r.me, "Lv ${levelOf(r.points).lv} · best ${r.best}", "${r.points}") { s.go(Route.Player(r.card.id)) } }
            }
        }
    }
}

@Composable
fun WayTile(icon: String, title: String, sub: String, modifier: Modifier, onClick: () -> Unit) {
    val p = pal; val shape = RoundedCornerShape(16.dp)
    Row(modifier.press(label = title, onClick = onClick).clip(shape).background(p.s1).border(1.dp, p.line, shape).padding(12.dp).heightIn(min = 40.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.size(38.dp).clip(RoundedCornerShape(12.dp)).background(p.s2), contentAlignment = Alignment.Center) { Icon(icon, 20.dp, p.ink2) }
        Column(Modifier.weight(1f)) { Txt(title, size = 14.sp, weight = FontWeight.Bold, lines = 1); Small(sub, lines = 1) }
    }
}

@Composable
fun BoardLine(i: Int, c: Card, me: Boolean, sub: String, value: String, onClick: (() -> Unit)? = null) {
    val p = pal; val shape = RoundedCornerShape(12.dp)
    Row(Modifier.fillMaxWidth().then(if (onClick != null) Modifier.press(label = c.name, onClick = onClick) else Modifier).clip(shape)
        .background(if (me) p.bg else Color.Transparent).then(if (me) Modifier.border(1.5.dp, p.gold, shape) else Modifier).padding(8.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Txt("${i + 1}", Modifier.width(22.dp), 14.sp, color = if (i == 0) p.goldText else p.muted, display = true, align = TextAlign.Center)
        Avatar(c.name, c.color, 32.dp, c.frame)
        Column(Modifier.weight(1f)) { Txt(c.name + if (me) " (you)" else "", weight = FontWeight.Medium, lines = 1); Small(sub, lines = 1) }
        Txt(value, size = 17.sp, display = true)
    }
}
