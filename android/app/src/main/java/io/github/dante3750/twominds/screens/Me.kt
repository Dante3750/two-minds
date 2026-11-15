package io.github.dante3750.twominds.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.*
import java.time.LocalDate

@Composable
fun MeScreen() {
    val s = LocalApp.current; val p = pal; val prof = s.profile ?: return
    var edit by remember { mutableStateOf(false) }; var name by remember { mutableStateOf(prof.card.name) }; var all by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { s.refreshProfile() }
    val L = overallLevel(prof.card.xp); val tier = tierOf(prof.seasonPts); val next = TIERS.firstOrNull { it.from > prof.seasonPts }
    val acc = if (prof.answered > 0) prof.correct * 100 / prof.answered else 0
    val got = BADGES.filter { it.id in prof.badges }; val todo = BADGES.filter { it.id !in prof.badges }
    val top = prof.topics.entries.sortedByDescending { it.value.xp }.take(4)

    Page(tabs = true) {
        CardBox(pad = 18.dp) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                LevelAvatar(prof.card.name, prof.card.color, prof.card.xp, 88.dp, prof.card.frame)
                H1(prof.card.name, align = TextAlign.Center)
                Small("@${prof.card.username} · ${titleFor(L.lv)} · ${L.need - L.into} XP to level ${L.lv + 1}", align = TextAlign.Center)
                Row(Modifier.fillMaxWidth().padding(top = 10.dp)) {
                    listOf("Played" to "${prof.played}", "Won" to "${prof.won}", "Correct" to "$acc%", "Best streak" to "${prof.streakBest}").forEach { (k, v) ->
                        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) { Txt(v, size = 20.sp, display = true); Small(k) }
                    }
                }
            }
        }
        if (edit) CardBox {
            Label("Name"); Field(name, { name = it.take(24) }, "Your name")
            Label("Colour")
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                COLORS.forEach { c -> Box(Modifier.size(34.dp).press(label = "Colour $c") { s.launch { s.game.updateProfile(color = c); s.refreshProfile() } }.clip(CircleShape).background(hex(c)).then(if (prof.card.color == c) Modifier.border(3.dp, p.ink, CircleShape) else Modifier)) }
            }
            Label("Avatar frame")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (TIERS.filter { prof.seasonPts >= it.from }.map { it.id to it.name } + ("" to "None")).forEach { (id, n) ->
                    Column(Modifier.press(label = "Frame $n") { s.launch { s.game.updateProfile(frame = id); s.refreshProfile() } }.clip(RoundedCornerShape(12.dp))
                        .border(1.dp, if ((prof.card.frame ?: "") == id) p.gold else p.line, RoundedCornerShape(12.dp)).padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Avatar(prof.card.name, prof.card.color, 30.dp, id.ifBlank { null }); Small(n)
                    }
                }
            }
            Btn("Save", Modifier.fillMaxWidth(), kind = "cta") { s.launch { s.game.updateProfile(name = name); s.refreshProfile(); edit = false } }
        } else Btn("Edit name, colour and frame", Modifier.fillMaxWidth(), icon = "pen") { name = prof.card.name; edit = true }

        SectionHead("Season · ${LocalDate.now().month.name.lowercase().replaceFirstChar { it.uppercase() }}")
        CardBox {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                val tc = hex(tier.color)
                Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(tc.copy(alpha = 0.2f)).border(1.dp, tc.copy(alpha = 0.45f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) { Icon("medal", color = tc) }
                Column(Modifier.weight(1f)) { H2(tier.name); Small("${prof.seasonPts} pts" + if (next != null) " · ${next.from - prof.seasonPts} to ${next.name}" else " · top tier!") }
            }
            if (next != null) Bar((prof.seasonPts - tier.from).toFloat() / (next.from - tier.from), hex(tier.color))
            Small("Points from matches against people this month. Each tier unlocks an avatar frame.")
        }
        if (top.isNotEmpty()) {
            SectionHead("Top topics")
            CardBox {
                top.forEach { (id, st) ->
                    val t = s.topic(id); val l = levelOf(st.xp)
                    Row(Modifier.press(label = t.name) { s.go(Route.TopicPage(id)) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        TopicBadge(t, 36.dp, hex(t.color))
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row { Txt(t.name, Modifier.weight(1f), 13.5.sp, FontWeight.Medium, lines = 1); Small("Lv ${l.lv} · ${titleFor(l.lv, TOPIC_TITLES)}") }
                            Bar(l.pct, hex(t.color))
                        }
                    }
                }
            }
        }
        SectionHead("Badges · ${got.size}/${BADGES.size}", if (all) "Less" else "All") { all = !all }
        BadgeGrid(if (all) BADGES else got + todo.take(3), prof.badges)

        SectionHead("Look")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            THEMES.forEach { th ->
                val on = s.theme == th.id; val shape = RoundedCornerShape(16.dp)
                Column(Modifier.weight(1f).press(label = th.name) { s.theme = th.id; s.saveSettings() }.clip(shape).background(p.s1).border(if (on) 2.dp else 1.dp, if (on) p.gold else p.line, shape).padding(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(th.bg).border(1.dp, p.line2, RoundedCornerShape(14.dp))) {
                        Box(Modifier.align(Alignment.BottomStart).padding(6.dp).size(18.dp).clip(CircleShape).background(th.p1))
                        Box(Modifier.align(Alignment.TopEnd).padding(6.dp).size(18.dp).clip(CircleShape).background(th.p2))
                    }
                    Txt(th.name, size = 12.sp, weight = FontWeight.Medium, color = p.ink2)
                }
            }
        }
        SectionHead("Settings")
        CardBox {
            Seg("Answer time", listOf("10 seconds" to !s.relaxed, "15 seconds" to s.relaxed)) { s.relaxed = it == 1; s.saveSettings() }
            Seg("Practice bot", listOf("Easy", "Normal", "Hard").mapIndexed { i, n -> n to (s.bot == i) }) { s.bot = it; s.saveSettings() }
            Seg("Feedback", listOf("Sound ${if (s.sound) "on" else "off"}" to s.sound, "Vibration ${if (s.vibrate) "on" else "off"}" to s.vibrate)) { if (it == 0) s.sound = !s.sound else s.vibrate = !s.vibrate; s.saveSettings() }
        }
        Btn("Match history", Modifier.fillMaxWidth(), icon = "history") { s.go(Route.History) }
        Btn("Suggest a question", Modifier.fillMaxWidth(), sub = "Good ones join the game for everyone", icon = "pen") { s.go(Route.Suggest) }
        if (prof.isAdmin) Btn("Review questions", Modifier.fillMaxWidth(), sub = "Admin", icon = "check") { s.go(Route.Admin) }
        Btn("Sign out", Modifier.fillMaxWidth(), kind = "ghost", icon = "logout") { s.signOut() }
        Small("Questions include ones from Open Trivia DB (CC BY-SA 4.0) and The Trivia API (CC BY-NC 4.0).", Modifier.fillMaxWidth(), align = TextAlign.Center)
    }
}

@Composable
fun BadgeGrid(list: List<Badge>, have: List<String>) {
    val p = pal
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        list.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { b ->
                    val on = b.id in have; val shape = RoundedCornerShape(16.dp)
                    Column(Modifier.weight(1f).clip(shape).background(p.s1).border(1.dp, if (on) p.gold.copy(alpha = 0.4f) else p.line, shape).padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Box(Modifier.size(44.dp).clip(CircleShape).background(if (on) p.gold else p.s2), contentAlignment = Alignment.Center) { Icon(b.icon, 20.dp, if (on) p.goldInk else p.muted) }
                        Txt(b.name, size = 12.5.sp, weight = FontWeight.Medium, color = if (on) p.ink else p.ink2, align = TextAlign.Center, lines = 2)
                        Txt(b.text, size = 11.sp, color = p.muted, align = TextAlign.Center, lines = 3)
                    }
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun Seg(label: String, opts: List<Pair<String, Boolean>>, onPick: (Int) -> Unit) {
    val p = pal
    Small(label)
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(p.bg).border(1.dp, p.line, RoundedCornerShape(14.dp)).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        opts.forEachIndexed { i, (n, on) ->
            Box(Modifier.weight(1f).press(label = n) { onPick(i) }.heightIn(min = 40.dp).clip(RoundedCornerShape(10.dp)).background(if (on) p.s3 else Color.Transparent), contentAlignment = Alignment.Center) {
                Txt(n, size = 13.sp, weight = FontWeight.Medium, color = if (on) p.ink else p.muted, lines = 1)
            }
        }
    }
}

@Composable
fun PlayerScreen(id: String) {
    val s = LocalApp.current; val p = pal
    var o by remember { mutableStateOf<org.json.JSONObject?>(null) }; var h by remember { mutableStateOf<Triple<Int, Int, Int>?>(null) }
    LaunchedEffect(id) { try { o = s.game.profileOf(id); if (id != s.me) h = s.game.h2h(id) } catch (e: Exception) { s.toast(e.message ?: "") } }
    val x = o
    Page {
        TopBar()
        if (x == null) { Small("Loading…"); return@Page }
        val c = card(x); val L = overallLevel(c.xp)
        val badges = x.optJSONArray("badges")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            LevelAvatar(c.name, c.color, c.xp, 88.dp, c.frame); H1(c.name, align = TextAlign.Center)
            Small("@${c.username} · ${titleFor(L.lv)}", align = TextAlign.Center)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Played" to x.optInt("played"), "Won" to x.optInt("won"), "Best" to x.optInt("best_score")).forEach { (k, v) -> CardBox(Modifier.weight(1f), pad = 12.dp) { Label(k); Txt("$v", size = 22.sp, display = true) } }
        }
        h?.let { (w, l, d) ->
            CardBox { Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Label("You vs ${c.name}")
                Row { Txt("$w", size = 28.sp, color = p.good, display = true); Txt(" – ", size = 28.sp, display = true); Txt("$l", size = 28.sp, color = p.bad, display = true); if (d > 0) Txt(" – $d", size = 28.sp, display = true) }
            } }
        }
        if (id != s.me) Btn("Add friend", Modifier.fillMaxWidth(), kind = "cta", icon = "useradd") {
            s.launch { val r = s.game.friendRequest(c.username); s.toast(when (r) { "already" -> "Already friends"; "accepted" -> "You are friends now!"; else -> "Request sent" }) }
        }
        SectionHead("Badges · ${badges.size}")
        BadgeGrid(BADGES.filter { it.id in badges }, badges)
    }
}

@Composable
fun HistoryScreen() {
    val s = LocalApp.current
    var list by remember { mutableStateOf<List<Match>?>(null) }
    LaunchedEffect(Unit) { list = try { s.game.history() } catch (e: Exception) { s.toast(e.message ?: ""); emptyList() } }
    Page {
        TopBar("Match history")
        val l = list
        when {
            l == null -> Small("Loading…")
            l.isEmpty() -> Empty("history", "No matches yet", "Play anything and it shows up here, round by round.")
            else -> { Small("Tap a match to see every question and both answers."); l.forEach { m -> MatchRow(m) { s.go(Route.Detail(m.id)) } } }
        }
    }
}

@Composable
fun DetailScreen(id: String) {
    val s = LocalApp.current; val p = pal
    var d by remember { mutableStateOf<Pair<Match, List<DetailRound>>?>(null) }
    val reported = remember { mutableStateListOf<Int>() }
    LaunchedEffect(id) { try { d = s.game.detail(id) } catch (e: Exception) { s.toast(e.message ?: "") } }
    Page {
        val x = d
        if (x == null) { TopBar("Every round"); Small("Loading…"); return@Page }
        val (m, rounds) = x; val t = s.topic(m.topic)
        val opp = m.players.firstOrNull { it.card.id != s.me && (m.mode != "challenge" || it.card.id == m.host) }
        val oppName = opp?.card?.name ?: m.bot?.name
        TopBar("Every round", "${t.name} · ${m.createdAt.take(10)}")
        rounds.forEach { r ->
            val mine = r.picks[s.me]; val theirs = if (opp != null) r.picks[opp.card.id] else r.bot
            CardBox(pad = 14.dp) {
                Small(if (r.round == ROUNDS - 1) "BONUS ROUND" else "ROUND ${r.round + 1}")
                Txt(r.q, weight = FontWeight.Medium, lineHeight = 21.sp)
                Txt("✓ ${r.a}", weight = FontWeight.Bold, color = p.good)
                PickLine("You", mine)
                if (oppName != null && theirs != null) PickLine(oppName, theirs)
                Txt(if (r.round in reported) "Thanks, reported" else "Report a wrong question", Modifier.press(enabled = r.round !in reported, label = "Report") {
                    s.launch { s.game.report(m.id, r.round, "wrong"); reported.add(r.round); s.toast("Thanks! We'll check it") }
                }.padding(vertical = 4.dp), size = 12.sp, color = p.muted)
            }
        }
    }
}

@Composable
private fun PickLine(who: String, pk: DetailPick?) {
    val p = pal
    val text = when { pk == null || pk.choice == -1 -> "no answer"; pk.choice == 0 -> "right · +${pk.points}"; else -> pk.text ?: "wrong" }
    Row { Small("$who: ", lines = 1); Txt(text, size = 13.sp, weight = FontWeight.Medium, color = when { pk == null || pk.choice == -1 -> p.muted; pk.choice == 0 -> p.good; else -> p.bad }, lines = 2) }
}
