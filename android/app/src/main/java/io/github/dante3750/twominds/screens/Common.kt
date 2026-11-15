package io.github.dante3750.twominds.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.*
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.*

const val WEB_BASE = "https://dante3750.github.io/two-minds/"
fun challengeUrl(id: String) = "${WEB_BASE}app/?m=$id"

fun share(ctx: Context, text: String) {
    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
    ctx.startActivity(Intent.createChooser(send, "Send with").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}
fun copy(ctx: Context, text: String) {
    (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Two Minds", text))
}

@Composable
fun TopBar(title: String? = null, sub: String? = null, right: @Composable (() -> Unit)? = null) {
    val s = LocalApp.current
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        IconBtn("back", "Back") { s.back() }
        Column(Modifier.weight(1f)) {
            if (title != null) H1(title)
            if (sub != null) Small(sub, lines = 1)
        }
        right?.invoke()
    }
}

@Composable
fun TopicBadge(t: Topic, size: Dp = 36.dp, bg: Color = TILE_INK.copy(alpha = 0.14f)) {
    Box(Modifier.size(size).clip(RoundedCornerShape(size * 0.3f)).background(bg), contentAlignment = Alignment.Center) { Icon(t.icon, size * 0.55f, TILE_INK, 2.1f) }
}

@Composable
fun TopicTile(t: Topic, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val s = LocalApp.current; val st = s.profile?.topics?.get(t.id); val c = s.counts[t.id]
    val sub = when { st != null -> "Level ${levelOf(st.xp).lv}"; c != null && c.new > 0 -> "${c.new} new"; else -> "" }
    val shape = RoundedCornerShape(20.dp)
    Box(modifier.heightIn(min = 116.dp).press(label = t.name, onClick = onClick).clip(shape).background(hex(t.color))) {
        Canvas(Modifier.matchParentSize()) { drawCircle(Color.White.copy(alpha = 0.18f), radius = 45.dp.toPx(), center = Offset(size.width + 15.dp.toPx(), -15.dp.toPx())) }
        Column(Modifier.padding(12.dp).heightIn(min = 92.dp), verticalArrangement = Arrangement.SpaceBetween) {
            TopicBadge(t)
            Column {
                Txt(t.name, size = 13.sp, weight = FontWeight.Bold, color = TILE_INK, lines = 2)
                if (sub.isNotEmpty()) Txt(sub, size = 11.sp, weight = FontWeight.Medium, color = TILE_INK.copy(alpha = 0.62f))
            }
        }
        if (c != null && c.new > 0 && st != null) Box(Modifier.align(Alignment.TopEnd).padding(10.dp).clip(RoundedCornerShape(9.dp)).background(TILE_INK).padding(horizontal = 7.dp, vertical = 2.dp)) {
            Txt("NEW", size = 10.sp, weight = FontWeight.Bold, color = Color.White)
        }
    }
}

/** A grid of tiles, three to a row. */
@Composable
fun TopicGrid(list: List<Topic>, onPick: (Topic) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        list.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { t -> TopicTile(t, Modifier.weight(1f)) { onPick(t) } }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
fun TopicPicker(title: String, mixed: Boolean = true, onPick: (String) -> Unit) {
    val s = LocalApp.current
    H2(title)
    TopicGrid((if (mixed) listOf(MIXED) else emptyList()) + s.playable) { s.sheet = null; onPick(it.id) }
}

@Composable
fun FriendPicker(title: String, onPick: (Card) -> Unit) {
    val s = LocalApp.current; val p = pal
    var list by remember { mutableStateOf<List<Friend>?>(null) }
    LaunchedEffect(Unit) { list = try { s.game.friends() } catch (_: Exception) { emptyList() } }
    H2(title)
    val fr = list?.filter { it.accepted }
    when {
        fr == null -> Small("Loading…")
        fr.isEmpty() -> { Small("Add a friend first: share your code from the Friends tab."); Btn("Go to Friends", Modifier.fillMaxWidth(), icon = "users") { s.sheet = null; s.go(Route.Friends) } }
        else -> fr.forEach { f ->
            Row(Modifier.fillMaxWidth().press(label = f.card.name) { s.sheet = null; onPick(f.card) }.clip(RoundedCornerShape(16.dp)).background(p.bg).border(1.dp, p.line, RoundedCornerShape(16.dp)).padding(12.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Avatar(f.card.name, f.card.color, 36.dp, f.card.frame)
                Column(Modifier.weight(1f)) { Txt(f.card.name, weight = FontWeight.Bold, lines = 1); Small("@${f.card.username}") }
                Icon("chev", 18.dp, p.muted)
            }
        }
    }
}

@Composable
fun MatchRow(m: Match, onClick: () -> Unit) {
    val s = LocalApp.current; val p = pal; val t = s.topic(m.topic)
    val mine = m.player(s.me); val opp = m.players.firstOrNull { it.card.id != s.me && (m.mode != "challenge" || it.card.id == m.host) }
    val r = mine?.result
    val col = when (r) { "w" -> p.good; "l" -> p.bad; "d" -> p.goldText; else -> p.muted }
    val word = when (r) { "w" -> "WON"; "l" -> "LOST"; "d" -> "DRAW"; else -> "PLAYED" }
    val who = opp?.card?.name ?: m.bot?.name ?: if (m.mode == "daily") "everyone" else "anyone"
    val mode = mapOf("bot" to "Practice", "live" to "Live", "quick" to "Quick match", "challenge" to "Challenge", "daily" to "Daily")[m.mode]
    val shape = RoundedCornerShape(16.dp)
    Row(Modifier.fillMaxWidth().press(label = "${t.name} $word", onClick = onClick).clip(shape).background(p.s1).border(1.dp, p.line, shape).padding(12.dp).heightIn(min = 40.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        TopicBadge(t, 36.dp, hex(t.color))
        Column(Modifier.weight(1f)) {
            Txt(t.name, size = 14.sp, weight = FontWeight.Bold, lines = 1)
            Small("$mode${if (m.practice) " practice" else ""} vs $who · ${m.createdAt.take(10)}", lines = 1)
        }
        Column(horizontalAlignment = Alignment.End) {
            Txt("${mine?.score ?: 0}${if (opp != null) "–${opp.score}" else ""}", size = 16.sp, display = true)
            Txt(word, size = 11.sp, weight = FontWeight.Bold, color = col, spacing = 0.5.sp)
        }
    }
}

/** deep topic-coloured background for match screens */
@Composable
fun GameBackground(color: Color) {
    Canvas(Modifier.fillMaxSize()) {
        drawRect(Brush.verticalGradient(listOf(mix(DEEP, color, 0.46f), mix(DEEP, color, 0.18f))))
        drawCircle(Brush.radialGradient(listOf(color.copy(alpha = 0.4f), Color.Transparent), center = Offset(size.width / 2, 0f), radius = size.width * 0.9f), radius = size.width * 0.9f, center = Offset(size.width / 2, 0f))
    }
}

// ---------------------------------------------------------------- starting matches
fun AppState.startBot(topic: String) = launch { val m = game.startMatch("bot", topic, bot = bot, timeMs = timeMs); Sfx.play("vs"); go(Route.Play(m)) }
fun AppState.startChallenge(topic: String, friend: String? = null) = launch { val m = game.startMatch("challenge", topic, opponent = friend, timeMs = timeMs); Sfx.play("vs"); go(Route.Play(m)) }
fun AppState.startDaily() = launch {
    val m = game.startMatch("daily", "daily", timeMs = 10000)
    if (m.practice) toast("Today's score is already in. This one is practice")
    Sfx.play("vs"); go(Route.Play(m))
}
fun AppState.startLive(topic: String, friend: String) = launch { val m = game.startMatch("live", topic, opponent = friend, timeMs = timeMs); go(Route.Lobby(m)) }
fun AppState.startQuick(topic: String) = go(Route.Search(topic))

@Composable
fun Dot(name: String, color: String) {
    Box(Modifier.size(26.dp).clip(CircleShape).background(hex(color)).border(2.5.dp, Color.White, CircleShape), contentAlignment = Alignment.Center) {
        Txt(initial(name), size = 11.sp, color = TILE_INK, display = true)
    }
}

@Composable
fun copyAndToast(text: String, msg: String): () -> Unit { val ctx = LocalContext.current; val s = LocalApp.current; return { copy(ctx, text); s.toast(msg) } }
