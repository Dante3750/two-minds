package io.github.dante3750.twominds.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

private data class Opp(val name: String, val color: String, val frame: String?, val lv: Int, val id: String?, val kind: String)

/**
 * One match, any mode. The server serves each round (starting its clock), scores every answer and tells us
 * where the right answer and the other side's pick are on screen.
 */
@Composable
fun PlayScreen(match: Match) {
    val s = LocalApp.current; val me = s.me; val t = s.topic(match.topic); val color = hex(t.color); val T = match.timeMs
    val live = match.mode == "live" || match.mode == "quick"
    val oppPlayer = match.players.firstOrNull { it.card.id != me && (match.mode != "challenge" || it.card.id == match.host) }
    val opp = when {
        match.bot != null -> Opp(match.bot.name, "#9aa3d1", null, match.bot.lv, null, "bot")
        oppPlayer != null && (match.mode != "challenge" || match.host != me) -> Opp(oppPlayer.card.name, oppPlayer.card.color, oppPlayer.card.frame, overallLevel(oppPlayer.card.xp).lv, oppPlayer.card.id, if (match.mode == "challenge") "ghost" else "player")
        else -> Opp(if (match.mode == "daily") "Everyone" else "Anyone", "#8b92bf", null, 0, null, "none")
    }
    val myName = s.profile?.card?.name ?: "You"; val myColor = s.profile?.card?.color ?: "#ff6b5a"; val myFrame = s.profile?.card?.frame
    val myLv = overallLevel(s.profile?.card?.xp ?: 0).lv

    var phase by remember { mutableStateOf("intro") }          // intro, question, reveal, finishing
    var round by remember { mutableIntStateOf(0) }
    var q by remember { mutableStateOf<Round?>(null) }
    var pick by remember { mutableStateOf<Int?>(null) }
    var ans by remember { mutableStateOf<Answer?>(null) }
    var myScore by remember { mutableIntStateOf(0) }
    var oppScore by remember { mutableIntStateOf(0) }
    val log = remember { mutableStateListOf<Pair<Int, Int?>>() }
    var left by remember { mutableIntStateOf(T) }
    var started by remember { mutableLongStateOf(0L) }
    var showOptions by remember { mutableStateOf(false) }
    var oppAnswered by remember { mutableStateOf(false) }
    var rec by remember { mutableStateOf("") }
    var quitArm by remember { mutableStateOf(false) }
    var answering by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // leaving: back once warns, twice quits (the server counts unanswered rounds as no answer)
    var lastBack by remember { mutableLongStateOf(0L) }
    fun quit() { s.backGuard = null; s.launch { s.game.leave(match.id) }; s.resetTo(Route.Home) }
    DisposableEffect(Unit) {
        s.backGuard = { if (System.currentTimeMillis() - lastBack < 2500) quit() else { lastBack = System.currentTimeMillis(); s.toast("Press back again to quit") }; true }
        onDispose { s.backGuard = null }
    }
    LaunchedEffect(Unit) { if (opp.id != null) try { val (w, l, d) = s.game.h2h(opp.id); rec = if (w + l + d == 0) "First match" else if (w > l) "You lead $w–$l" else if (l > w) "${opp.name} leads $l–$w" else "Level at $w–$l" } catch (_: Exception) { } }

    suspend fun loadRound(r: Int) {
        pick = null; ans = null; oppAnswered = false; answering = false; showOptions = false; started = 0L
        var data: Round? = null
        repeat(3) { if (data == null) try { data = s.game.round(match.id, r) } catch (e: Exception) { if (it == 2) s.toast(e.message ?: "") else delay(800) } }
        val d = data ?: return
        q = d; round = r; left = T; phase = "question"
        delay(1100)                                    // a moment to read before the options and the clock
        showOptions = true; started = System.currentTimeMillis()
    }

    fun finish() = scope.launch {
        phase = "finishing"
        try { s.game.finish(match.id) } catch (_: Exception) { }
        s.backGuard = null
        s.replace(Route.Results(match.id))
    }

    fun reveal(a: Answer) {
        ans = a; phase = "reveal"
        val right = a.you.option == a.right
        Sfx.play(if (right) "right" else "wrong"); Sfx.buzz(if (right) "success" else "error")
        myScore = a.total; oppScore += a.opp?.points ?: 0
        log.add(a.you.points to a.opp?.points)
        scope.launch { delay(1900); if (round >= ROUNDS - 1) finish() else loadRound(round + 1) }
    }

    fun submit(option: Int) {
        if (answering || started == 0L) return
        answering = true
        val ms = minOf(T.toLong(), System.currentTimeMillis() - started).toInt(); started = 0L
        pick = option; if (option >= 0) Sfx.buzz()
        val r = round
        scope.launch {
            var a: Answer? = null
            repeat(3) { if (a == null) try { a = s.game.answer(match.id, r, option, ms) } catch (e: Exception) { if (it == 2) s.toast(e.message ?: "") else delay(600) } }
            var res = a ?: return@launch
            if (live && res.opp == null) {
                // the other phone hasn't answered yet: they still have the rest of their own clock
                val until = System.currentTimeMillis() + maxOf(2000, T - ms + 6000)
                var o: Pick? = null
                while (o == null && System.currentTimeMillis() < until && isActive) { try { o = s.game.roundResult(match.id, r) } catch (_: Exception) { }; if (o == null) delay(700) }
                res = res.copy(opp = o ?: Pick(-1, T, 0))
            }
            reveal(res)
        }
    }

    // intro, then round 1
    LaunchedEffect(Unit) { Sfx.play("vs"); Sfx.buzz("medium"); delay(2300); loadRound(0) }
    // clock + time-out
    LaunchedEffect(phase, round, started) {
        if (phase != "question" || started == 0L) return@LaunchedEffect
        var lastSec = -1
        while (isActive && started != 0L) {
            val l = maxOf(0, T - (System.currentTimeMillis() - started).toInt()); left = l
            val sec = (l + 999) / 1000
            if (sec != lastSec) { if (sec in 1..3) Sfx.play("tick"); lastSec = sec }
            if (q?.ghostMs != null && T - l >= q!!.ghostMs!!) oppAnswered = true
            if (l <= 0) { submit(-1); break }
            delay(80)
        }
    }
    // live: watch for the other player answering this round (for the "answered" tag)
    LaunchedEffect(round, phase) {
        if (!live || phase != "question") return@LaunchedEffect
        val r = round
        while (isActive && !oppAnswered && phase == "question" && round == r) { delay(1200); try { if (s.game.oppAnswered(match.id, r)) oppAnswered = true } catch (_: Exception) { } }
    }

    if (phase == "intro") { VsIntro(match, opp, rec, t.name, t.icon, color, myName, myColor, myFrame, myLv); return }

    Box(Modifier.fillMaxSize()) {
        GameBackground(color)
        Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars).padding(horizontal = 20.dp, vertical = 8.dp).widthIn(max = 560.dp).align(Alignment.TopCenter)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.press(label = "Quit") { if (quitArm) quit() else { quitArm = true; scope.launch { delay(2500); quitArm = false } } }
                    .clip(RoundedCornerShape(10.dp)).background(if (quitArm) WRONG else Color.Transparent).padding(horizontal = 10.dp, vertical = 8.dp)) {
                    Txt(if (quitArm) "Tap again to quit" else "Quit", size = 12.5.sp, weight = FontWeight.Medium, color = Color.White.copy(alpha = if (quitArm) 1f else 0.75f))
                }
                Spacer(Modifier.weight(1f))
                Row(Modifier.clip(RoundedCornerShape(999.dp)).background(Color.Black.copy(alpha = 0.22f)).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(t.icon, 14.dp, Color.White); Txt(t.name, size = 12.sp, weight = FontWeight.Medium, color = Color.White, lines = 1)
                }
            }
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Side(myName, myColor, myFrame, myLv, myScore, false, myScore > oppScore && opp.kind != "none", "", Modifier.weight(1f))
                TimerRing(left, T, phase == "question" && showOptions)
                Side(opp.name, opp.color, opp.frame, opp.lv, if (opp.kind == "none") null else oppScore, true, oppScore > myScore,
                    when { opp.kind == "none" -> if (match.mode == "daily") "same for all" else "plays your link"; oppAnswered && phase == "question" -> "answered"; else -> "" }, Modifier.weight(1f))
            }
            Column(Modifier.fillMaxWidth().padding(top = 16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Txt(if (round == ROUNDS - 1) "BONUS ROUND · ×2" else "ROUND ${round + 1} OF $ROUNDS", size = 11.5.sp, weight = FontWeight.Bold, color = Color.White.copy(alpha = 0.8f), spacing = 1.6.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    repeat(ROUNDS) { i ->
                        val l = log.getOrNull(i)
                        val c = when {
                            l == null -> if (i == round) Color.White else Color.White.copy(alpha = 0.22f)
                            l.second == null -> if (l.first > 0) Color(0xFF7DFFB0) else Color(0xFFFF8A9C)
                            l.first > l.second!! -> Color(0xFF7DFFB0); l.first < l.second!! -> Color(0xFFFF8A9C); else -> Color.White.copy(alpha = 0.6f)
                        }
                        Box(Modifier.size(8.dp).clip(CircleShape).background(c).then(if (i == ROUNDS - 1) Modifier.border(1.5.dp, Color(0xFFFFC53D), CircleShape) else Modifier))
                    }
                }
            }
            val qa by animateFloatAsState(if (q != null && phase != "intro") 1f else 0f, tween(350), label = "q")
            Column(Modifier.weight(1f).fillMaxWidth().alpha(qa), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                if (q?.isNew == true) Box(Modifier.padding(bottom = 10.dp).clip(RoundedCornerShape(999.dp)).background(Color(0xFFFFC53D)).padding(horizontal = 10.dp, vertical = 4.dp)) {
                    Txt("NEW THIS WEEK", size = 11.sp, weight = FontWeight.Bold, color = TILE_INK)
                }
                val long = (q?.q?.length ?: 0) > 110
                Txt(q?.q ?: "", size = if (long) 20.sp else 24.sp, weight = FontWeight.Bold, color = Color.White, align = TextAlign.Center, lineHeight = if (long) 28.sp else 32.sp)
            }
            val oa by animateFloatAsState(if (showOptions) 1f else 0f, tween(300), label = "o")
            Column(Modifier.fillMaxWidth().alpha(oa).graphicsLayer { translationY = (1 - oa) * 30f }, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                (q?.options ?: emptyList()).forEachIndexed { i, o ->
                    val a = ans; val isRight = a != null && a.right == i; val isMine = pick == i; val wrongMine = a != null && isMine && !isRight
                    val oppHere = a?.opp?.option == i
                    val bg = when { isRight -> RIGHT; wrongMine -> WRONG; isMine -> mix(PAPER, color, 0.3f); else -> PAPER }
                    val fg = if (isRight || wrongMine) Color.White else PAPER_INK
                    val dim = a != null && !isRight && !isMine && !oppHere
                    val shake by animateFloatAsState(if (wrongMine) 1f else 0f, keyframes { durationMillis = 400; 0f at 0; 1f at 80; -1f at 160; 1f at 240; -1f at 320; 0f at 400 }, label = "shake")
                    val pop by animateFloatAsState(if (isRight) 1f else 0f, spring(dampingRatio = 0.35f), label = "pop")
                    Box(Modifier.testTag("opt$i").fillMaxWidth().graphicsLayer { translationX = shake * 10f; scaleX = 1f + pop * 0.03f; scaleY = 1f + pop * 0.03f }.alpha(if (dim) 0.45f else 1f)
                        .press(enabled = phase == "question" && pick == null && showOptions, sound = false, label = o) { submit(i) }
                        .heightIn(min = 60.dp).clip(RoundedCornerShape(16.dp)).background(bg)
                        .then(if (isMine || isRight) Modifier.border(3.dp, Color.White, RoundedCornerShape(16.dp)) else Modifier).padding(horizontal = 44.dp, vertical = 10.dp),
                        contentAlignment = Alignment.Center) {
                        Txt((if (isRight) "✓  " else if (wrongMine) "✗  " else "") + o, size = 16.sp, weight = FontWeight.Medium, color = fg, align = TextAlign.Center)
                        if (isMine) Box(Modifier.align(Alignment.CenterStart).offset(x = (-34).dp)) { Dot(myName, myColor) }
                        if (oppHere) Box(Modifier.align(Alignment.CenterEnd).offset(x = 34.dp)) { Dot(opp.name, opp.color) }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
        if (phase == "finishing") Box(Modifier.fillMaxSize().background(DEEP.copy(alpha = 0.55f)), contentAlignment = Alignment.Center) {
            Txt(if (live) "Waiting for the final score…" else "Adding up…", size = 22.sp, color = Color.White, display = true)
        }
    }
}

@Composable
private fun Side(name: String, color: String, frame: String?, lv: Int, score: Int?, right: Boolean, lead: Boolean, state: String, modifier: Modifier) {
    val pop = remember { Animatable(1f) }
    LaunchedEffect(score) { if (score != null && score > 0) { pop.snapTo(1.25f); pop.animateTo(1f, spring(dampingRatio = 0.4f)) } }
    Row(modifier, horizontalArrangement = if (right) Arrangement.End else Arrangement.Start, verticalAlignment = Alignment.CenterVertically) {
        @Composable fun av() = Box(contentAlignment = Alignment.BottomCenter) {
            Box(Modifier.border(3.dp, if (lead) Color(0xFFFFC53D) else Color.White.copy(alpha = 0.9f), CircleShape).padding(2.dp)) { Avatar(name, color, 46.dp, frame, ring = false) }
            if (lv > 0) Box(Modifier.offset(y = 6.dp).clip(RoundedCornerShape(9.dp)).background(Color.White).padding(horizontal = 5.dp, vertical = 1.dp)) { Txt("$lv", size = 10.sp, color = PAPER_INK, display = true) }
        }
        @Composable fun txt() = Column(Modifier.padding(horizontal = 8.dp), horizontalAlignment = if (right) Alignment.End else Alignment.Start) {
            Txt(name, size = 12.5.sp, weight = FontWeight.Medium, color = Color.White.copy(alpha = 0.85f), lines = 1)
            Txt(score?.toString() ?: "–", Modifier.scale(pop.value), size = 26.sp, color = Color.White, display = true)
            Txt(state, size = 11.sp, weight = FontWeight.Bold, color = Color.White.copy(alpha = 0.75f), lines = 1)
        }
        if (right) { Box(Modifier.weight(1f, false)) { txt() }; av() } else { av(); Box(Modifier.weight(1f, false)) { txt() } }
    }
}

@Composable
private fun TimerRing(left: Int, total: Int, running: Boolean) {
    val pct = if (running) left.toFloat() / total else if (left >= total) 1f else left.toFloat() / total
    val hurry = running && left <= 3000
    Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            val w = 5.dp.toPx(); val inset = w / 2 + 2
            val sz = Size(size.width - inset * 2, size.height - inset * 2)
            drawArc(Color.White.copy(alpha = 0.18f), 0f, 360f, false, Offset(inset, inset), sz, style = Stroke(w))
            drawArc(if (hurry) Color(0xFFFF8A9C) else Color.White, -90f, 360f * pct, false, Offset(inset, inset), sz, style = Stroke(w, cap = StrokeCap.Round))
        }
        Txt("${(left + 999) / 1000}", size = 22.sp, color = Color.White, display = true)
    }
}

@Composable
private fun VsIntro(match: Match, opp: Opp, rec: String, topicName: String, topicIcon: String, color: Color, myName: String, myColor: String, myFrame: String?, myLv: Int) {
    val a = remember { Animatable(0f) }; val b = remember { Animatable(0f) }
    LaunchedEffect(Unit) { launch { a.animateTo(1f, spring(dampingRatio = 0.6f, stiffness = 300f)) }; delay(300); b.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = 300f)) }
    val subOpp = when (opp.kind) {
        "bot" -> "Lv ${opp.lv} · ${listOf("Easy", "Normal", "Hard")[match.bot?.level ?: 1]} bot"
        "none" -> if (match.mode == "daily") "Same 7 questions for all" else "Whoever opens your link"
        "ghost" -> "Lv ${opp.lv} · their score to beat"
        else -> "Lv ${opp.lv} · live now"
    }
    Box(Modifier.fillMaxSize()) {
        GameBackground(color)
        Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars)) {
            @Composable fun side(n: String, c: String, f: String?, sub: String, top: Boolean, m: Modifier) =
                Column(m.fillMaxWidth().graphicsLayer { alpha = a.value; translationY = (1 - a.value) * (if (top) -220f else 220f) }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Avatar(n, c, 92.dp, f); Spacer(Modifier.height(12.dp))
                    Txt(n, size = 26.sp, weight = FontWeight.Bold, color = Color.White, lines = 1); Txt(sub, size = 13.sp, color = Color.White.copy(alpha = 0.7f))
                }
            side(opp.name, opp.color, opp.frame, subOpp, true, Modifier.weight(1f))
            Column(Modifier.fillMaxWidth().scale(b.value), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Txt("VS", size = 56.sp, color = color, display = true)
                Pill(topicName, topicIcon, color, onDark = true)
                if (rec.isNotEmpty()) Txt(rec, size = 13.sp, weight = FontWeight.Medium, color = Color.White.copy(alpha = 0.8f))
            }
            side(myName, myColor, myFrame, "Lv $myLv", false, Modifier.weight(1f))
        }
    }
}
