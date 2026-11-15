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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.LocalApp
import io.github.dante3750.twominds.Route
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@Composable
fun FriendsScreen() {
    val s = LocalApp.current; val p = pal; val ctx = LocalContext.current; val prof = s.profile ?: return
    var list by remember { mutableStateOf<List<Friend>?>(null) }
    var board by remember { mutableStateOf<List<BoardRow>>(emptyList()) }
    var who by remember { mutableStateOf("") }; var busy by remember { mutableStateOf(false) }
    var tick by remember { mutableIntStateOf(0) }
    LaunchedEffect(tick) {
        while (isActive) {
            try { list = s.game.friends(); board = s.game.weekly("friends"); s.refreshInbox() } catch (e: Exception) { if (list == null) list = emptyList() }
            delay(20000)
        }
    }
    val code = prof.code.uppercase().let { if (it.length == 6) it.substring(0, 3) + " " + it.substring(3) else it }
    val fl = list.orEmpty()
    val incoming = fl.filter { !it.accepted && it.incoming }; val outgoing = fl.filter { !it.accepted && !it.incoming }; val friends = fl.filter { it.accepted }
    fun add() {
        if (who.isBlank()) return; busy = true
        s.launch {
            try {
                val r = s.game.friendRequest(who.trim())
                s.toast(mapOf("sent" to "Request sent", "accepted" to "You are friends now!", "already" to "Already friends", "pending" to "Request already sent", "self" to "That's you!", "not_found" to "No player with that username or code")[r] ?: r)
                if (r == "sent" || r == "accepted") who = ""
                tick++
            } finally { busy = false }
        }
    }
    val online = { f: Friend -> try { Instant.now().toEpochMilli() - Instant.parse(f.lastSeen.replace(" ", "T").let { if (it.endsWith("Z") || it.contains("+")) it else it + "Z" }).toEpochMilli() < 5 * 60_000 } catch (_: Exception) { false } }
    val daysLeft = 8 - LocalDate.now(ZoneOffset.UTC).dayOfWeek.value

    Page(tabs = true) {
        H1("Friends")
        CardBox {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Avatar(prof.card.name, prof.card.color, 60.dp, prof.card.frame)
                Column(Modifier.weight(1f)) {
                    H2(prof.card.name); Small("@${prof.card.username}")
                    Row(Modifier.padding(top = 6.dp).press(label = "Copy friend code") { copy(ctx, prof.code); s.toast("Friend code copied") }.clip(RoundedCornerShape(12.dp)).background(p.bg).border(1.dp, p.line2, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Txt(code, size = 18.sp, color = p.goldText, display = true, spacing = 2.sp); Icon("copy", 16.dp, p.muted)
                    }
                }
            }
            Btn("Invite a friend", Modifier.fillMaxWidth(), kind = "cta", icon = "useradd") {
                share(ctx, "Play Two Minds with me! Add me as a friend: @${prof.card.username} (code $code)\nhttps://github.com/Dante3750/two-minds/releases/tag/android-native")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Field(who, { who = it }, "Username or friend code", Modifier.weight(1f), onDone = { add() }, tag = "add-who")
                Btn("Add", kind = "cta", busy = busy, height = 48.dp) { add() }
            }
        }
        if (incoming.isNotEmpty()) {
            SectionHead("Friend requests")
            incoming.forEach { f ->
                CardBox(pad = 12.dp) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Avatar(f.card.name, f.card.color, 36.dp, f.card.frame)
                        Column(Modifier.weight(1f)) { Txt(f.card.name, weight = FontWeight.Bold, lines = 1); Small("@${f.card.username}") }
                        Btn("Decline", height = 40.dp) { s.launch { s.game.friendRespond(f.card.id, false); tick++ } }
                        Btn("Accept", kind = "cta", color = p.good, height = 40.dp) { s.launch { s.game.friendRespond(f.card.id, true); s.toast("You and ${f.card.name} are friends now"); tick++ } }
                    }
                }
            }
        }
        if (friends.isNotEmpty()) {
            SectionHead("This week · $daysLeft day${if (daysLeft > 1) "s" else ""} left")
            CardBox(pad = 10.dp) {
                if (board.isEmpty()) Small("Play a match against anyone (not a bot) to get on the board.", Modifier.padding(6.dp))
                board.forEachIndexed { i, r -> BoardLine(i, r.card, r.me, "${r.games} game${if (r.games == 1) "" else "s"}", "${r.points}") }
                Small("Points from every match this week. Resets Monday.", Modifier.padding(horizontal = 6.dp))
            }
        }
        SectionHead("Your friends · ${friends.size}")
        when {
            list == null -> Small("Loading…")
            friends.isEmpty() -> Empty("users", "No friends yet", "Tap Invite a friend and send it, or type their username or code above. Once they accept, play live or challenge them from here.")
            else -> friends.forEach { f ->
                CardBox(pad = 12.dp) {
                    Row(Modifier.press(label = f.card.name) { s.go(Route.Player(f.card.id)) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box { Avatar(f.card.name, f.card.color, 40.dp, f.card.frame); if (online(f)) Box(Modifier.align(Alignment.BottomEnd).size(12.dp).clip(CircleShape).background(p.good).border(2.dp, p.s1, CircleShape)) }
                        Column(Modifier.weight(1f)) { Txt(f.card.name, weight = FontWeight.Bold, lines = 1); Small("Lv ${overallLevel(f.card.xp).lv} · ${if (online(f)) "online now" else "@" + f.card.username}", lines = 1) }
                        Icon("chev", 18.dp, p.muted)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Btn("Live", Modifier.weight(1f), icon = "zap", color = p.good.copy(alpha = 0.16f), height = 42.dp) { s.sheet = { TopicPicker("Play live with ${f.card.name} on…") { s.startLive(it, f.card.id) } } }
                        Btn("Challenge", Modifier.weight(1f), kind = "cta", icon = "send", height = 42.dp) { s.sheet = { TopicPicker("Challenge ${f.card.name} on…") { s.startChallenge(it, f.card.id) } } }
                    }
                }
            }
        }
        if (outgoing.isNotEmpty()) {
            SectionHead("Requests you sent")
            outgoing.forEach { f ->
                CardBox(pad = 12.dp) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Avatar(f.card.name, f.card.color, 32.dp, f.card.frame)
                        Column(Modifier.weight(1f)) { Txt(f.card.name, weight = FontWeight.Medium, lines = 1); Small("Waiting for them to accept") }
                        Btn("Cancel", kind = "ghost", height = 38.dp) { s.launch { s.game.friendRemove(f.card.id); tick++ } }
                    }
                }
            }
        }
    }
}
@Suppress("unused") private val keepDow = DayOfWeek.MONDAY
