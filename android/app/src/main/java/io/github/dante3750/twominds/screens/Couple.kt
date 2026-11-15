package io.github.dante3750.twominds.screens

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.R
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.COLORS
import io.github.dante3750.twominds.ui.*
import org.json.JSONObject

private val PINK = Color(0xFFFF7096)

/** Pass-the-phone games for two people on one phone. Scores stay on this phone. */
@Composable
fun CoupleScreen() {
    val s = LocalApp.current; val p = pal; val ctx = LocalContext.current
    val prefs = remember { ctx.getSharedPreferences("couple", Context.MODE_PRIVATE) }
    var partner by remember { mutableStateOf(prefs.getString("partner", "") ?: "") }
    Page {
        TopBar("Couple corner")
        Small("Pass-the-phone games for the two of you. No timer, just honesty.")
        CardBox {
            Label("Playing with")
            Field(partner, { partner = it.take(20); prefs.edit().putString("partner", partner).apply() }, "Their name")
        }
        val ok = partner.isNotBlank()
        CoupleRow("eye", PINK, "How well do you know me?", "One answers in secret, the other guesses", "${prefs.getInt("bestKnow", 0)}%", ok) { s.go(Route.CoupleGame("know", partner.trim())) }
        CoupleRow("scale", Color(0xFFFFC53D), "Who's more likely to…", "Vote in secret, then see if you agree", "${prefs.getInt("bestLikely", 0)}%", ok) { s.go(Route.CoupleGame("likely", partner.trim())) }
        if (!ok) Small("Type their name above to start.", Modifier.fillMaxWidth(), align = TextAlign.Center)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Best read" to "${prefs.getInt("bestKnow", 0)}%", "Best sync" to "${prefs.getInt("bestLikely", 0)}%", "Played" to "${prefs.getInt("played", 0)}").forEach { (k, v) ->
                CardBox(Modifier.weight(1f), pad = 12.dp) { Label(k); Txt(v, size = 22.sp, display = true) }
            }
        }
    }
}

@Composable
private fun CoupleRow(icon: String, color: Color, title: String, sub: String, best: String, enabled: Boolean, onClick: () -> Unit) {
    val p = pal; val shape = RoundedCornerShape(22.dp)
    Row(Modifier.fillMaxWidth().press(enabled, label = title, onClick = onClick).clip(shape).background(p.s1).border(1.dp, p.line, shape).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        Box(Modifier.size(42.dp).clip(RoundedCornerShape(13.dp)).background(color), contentAlignment = Alignment.Center) { Icon(icon, color = TILE_INK) }
        Column(Modifier.weight(1f)) { Txt(title, size = 15.5.sp, weight = FontWeight.Bold); Small(sub) }
        Txt(best, size = 13.sp, weight = FontWeight.Medium, color = p.muted)
    }
}

@Composable
fun CoupleGameScreen(kind: String, partner: String) {
    val s = LocalApp.current; val ctx = LocalContext.current
    val me = s.profile?.card?.name ?: "You"
    val myColor = s.profile?.card?.color ?: COLORS[0]; val theirColor = COLORS.first { it != myColor }
    val prefs = remember { ctx.getSharedPreferences("couple", Context.MODE_PRIVATE) }
    val data = remember { JSONObject(ctx.resources.openRawResource(R.raw.couple).bufferedReader().readText()) }
    val n = if (kind == "know") 5 else 8
    val items = remember {
        val arr = data.getJSONArray(kind); (0 until arr.length()).shuffled().take(n).map { arr.get(it) }
    }
    // know: the answerer picks in secret, then the guesser; likely: both vote on each prompt
    val answerer = remember { listOf(me, partner).random() }; val guesser = if (answerer == me) partner else me
    var stage by remember { mutableStateOf("cover1") }       // cover1, play1, cover2, play2, done
    var i by remember { mutableIntStateOf(0) }
    val first = remember { mutableStateListOf<Int>() }; val second = remember { mutableStateListOf<Int>() }
    val color = if (kind == "know") PINK else Color(0xFFFFC53D)
    val firstName = if (kind == "know") answerer else me; val secondName = if (kind == "know") guesser else partner

    fun choose(v: Int) {
        Sfx.play("tap")
        if (stage == "play1") { first.add(v); if (first.size == n) { stage = "cover2"; i = 0 } else i++ }
        else { second.add(v); if (second.size == n) {
            stage = "done"
            val pct = (0 until n).count { first[it] == second[it] } * 100 / n
            val key = if (kind == "know") "bestKnow" else "bestLikely"
            prefs.edit().putInt(key, maxOf(prefs.getInt(key, 0), pct)).putInt("played", prefs.getInt("played", 0) + 1).apply()
            Sfx.play(if (pct >= 60) "win" else "badge")
        } else i++ }
    }

    Box(Modifier.fillMaxSize()) {
        GameBackground(color)
        Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars).padding(20.dp).widthIn(max = 560.dp).align(Alignment.TopCenter),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row { Spacer(Modifier.weight(1f)); Txt("Quit", Modifier.press(label = "Quit") { s.back() }.padding(8.dp), 12.5.sp, color = Color.White.copy(alpha = 0.8f)) }
            when (stage) {
                "cover1", "cover2" -> {
                    val who = if (stage == "cover1") firstName else secondName; val other = if (stage == "cover1") secondName else firstName
                    Spacer(Modifier.weight(1f))
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Avatar(who, if (who == me) myColor else theirColor, 90.dp)
                        Txt("$who's turn", size = 30.sp, weight = FontWeight.Bold, color = Color.White, align = TextAlign.Center)
                        Txt(when {
                            kind == "know" && stage == "cover1" -> "Answer about yourself, in secret. $other, look away!"
                            kind == "know" -> "Guess how $answerer answered."
                            else -> "Vote in secret. $other, look away!"
                        }, color = Color.White.copy(alpha = 0.85f), align = TextAlign.Center)
                        Btn("I'm ready", Modifier.fillMaxWidth(), kind = "cta", color = color) { stage = if (stage == "cover1") "play1" else "play2"; i = 0 }
                    }
                    Spacer(Modifier.weight(1f))
                }
                "play1", "play2" -> {
                    val who = if (stage == "play1") firstName else secondName
                    Txt("${who.uppercase()} · ${i + 1} OF $n", size = 11.5.sp, weight = FontWeight.Bold, color = Color.White, spacing = 1.6.sp)
                    if (kind == "know") {
                        val o = items[i] as JSONObject; val opts = o.getJSONArray("o")
                        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                            Txt(if (stage == "play1") "Your ${o.getString("q")}?" else "$answerer's ${o.getString("q")}?", size = 28.sp, weight = FontWeight.Bold, color = Color.White, align = TextAlign.Center)
                        }
                        (0 until opts.length()).forEach { k ->
                            Box(Modifier.fillMaxWidth().press(label = opts.getString(k)) { choose(k) }.heightIn(min = 58.dp).clip(RoundedCornerShape(16.dp)).background(PAPER).padding(12.dp), contentAlignment = Alignment.Center) {
                                Txt(opts.getString(k), size = 16.sp, weight = FontWeight.Medium, color = PAPER_INK, align = TextAlign.Center)
                            }
                        }
                    } else {
                        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                            Txt("Who's more likely to ${items[i] as String}?", size = 28.sp, weight = FontWeight.Bold, color = Color.White, align = TextAlign.Center)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            listOf(me, partner).forEachIndexed { k, nm ->
                                Column(Modifier.weight(1f).press(label = nm) { choose(k) }.clip(RoundedCornerShape(22.dp)).background(Color.White.copy(alpha = 0.12f))
                                    .border(2.dp, Color.White.copy(alpha = 0.3f), RoundedCornerShape(22.dp)).padding(vertical = 22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Avatar(nm, if (k == 0) myColor else theirColor, 70.dp)
                                    Txt(nm, weight = FontWeight.Bold, color = Color.White, lines = 1)
                                }
                            }
                        }
                    }
                }
                "done" -> {
                    val pct = (0 until n).count { first[it] == second[it] } * 100 / n
                    Spacer(Modifier.weight(1f))
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Txt("$pct%", size = 76.sp, color = Color.White, display = true)
                        Txt(if (kind == "know") (if (pct >= 80) "$guesser really knows $answerer!" else if (pct >= 40) "Not bad. Keep learning each other!" else "Time for a long chat…")
                            else (if (pct >= 75) "You two think alike" else "You see things differently"), size = 20.sp, weight = FontWeight.Bold, color = Color.White, align = TextAlign.Center)
                        Btn("Play again", Modifier.fillMaxWidth(), kind = "cta", color = color) { s.replace(Route.CoupleGame(kind, partner)) }
                        Btn("Done", Modifier.fillMaxWidth(), kind = "ghost") { s.back() }
                    }
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun SuggestScreen() {
    val s = LocalApp.current
    var topic by remember { mutableStateOf<String?>(null) }; var q by remember { mutableStateOf("") }; var a by remember { mutableStateOf("") }
    val w = remember { mutableStateListOf("", "", "") }; var busy by remember { mutableStateOf(false) }
    val ok = topic != null && q.trim().length >= 8 && a.isNotBlank() && w.all { it.isNotBlank() }
    Page {
        TopBar("Suggest a question")
        Small("Good questions get approved and join the game for everyone. Write it so there's exactly one right answer.")
        CardBox {
            Label("Topic")
            Btn(topic?.let { s.topic(it).name } ?: "Pick a topic", Modifier.fillMaxWidth(), icon = "grid") { s.sheet = { TopicPicker("Which topic?", mixed = false) { topic = it } } }
            Label("Question"); Field(q, { q = it.take(300) }, "e.g. Which planet has the most moons?")
            Label("Right answer"); Field(a, { a = it.take(120) }, "The right answer")
            Label("Three wrong answers")
            (0..2).forEach { k -> Field(w[k], { w[k] = it.take(120) }, "Wrong answer ${k + 1}") }
            Btn("Send for review", Modifier.fillMaxWidth(), kind = "cta", busy = busy, enabled = ok) {
                busy = true
                s.launch { try { s.game.suggest(topic!!, q.trim(), a.trim(), w.map { it.trim() }); s.toast("Thanks! It's waiting for review"); q = ""; a = ""; (0..2).forEach { w[it] = "" } } finally { busy = false } }
            }
        }
    }
}

@Composable
fun AdminScreen() {
    val s = LocalApp.current; val p = pal
    var queue by remember { mutableStateOf<List<io.github.dante3750.twominds.data.Submission>?>(null) }; var tick by remember { mutableIntStateOf(0) }
    LaunchedEffect(tick) { queue = try { s.game.reviewQueue() } catch (e: Exception) { s.toast(e.message ?: ""); emptyList() } }
    Page {
        TopBar("Review questions")
        val l = queue
        when {
            l == null -> Small("Loading…")
            l.isEmpty() -> Empty("check", "All clear", "No suggested questions waiting.")
            else -> l.forEach { sub ->
                CardBox {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { Avatar(sub.by.name, sub.by.color, 26.dp); Small("${sub.by.name} · ${s.topic(sub.topic).name}") }
                    Txt(sub.q, weight = FontWeight.Medium)
                    Txt("✓ ${sub.a}", weight = FontWeight.Bold, color = p.good)
                    sub.w.forEach { Small("✗ $it") }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Btn("Reject", Modifier.weight(1f), kind = "danger") { s.launch { s.game.review(sub.id, false); tick++ } }
                        Btn("Approve", Modifier.weight(1f), kind = "cta", color = p.good) { s.launch { s.game.review(sub.id, true); s.toast("Added to the game"); tick++ } }
                    }
                }
            }
        }
    }
}
