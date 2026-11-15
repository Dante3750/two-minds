package io.github.dante3750.twominds

import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.screens.*
import io.github.dante3750.twominds.ui.*

val LocalApp = staticCompositionLocalOf<AppState> { error("no app state") }

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun App(s: AppState) {
    LaunchedEffect(Unit) { s.loadAll() }
    LaunchedEffect(s.profile?.card?.id) { val id = s.pendingChallenge; if (s.profile != null && id != null) { s.pendingChallenge = null; s.go(Route.Challenge(id)) } }
    CompositionLocalProvider(LocalApp provides s, LocalPalette provides s.palette) {
        val p = pal
        // Android back: walk back through the app; let Android close it from Home
        val activity = LocalContext.current as? android.app.Activity
        BackHandler(enabled = true) { if (!s.back()) activity?.finish() }
        Box(Modifier.fillMaxSize().background(p.bg).semantics { testTagsAsResourceId = true }) {
            when {
                !s.ready -> Splash()
                !s.signedIn -> SignInScreen()
                s.profile == null -> SetupScreen()
                else -> {
                    val r = s.route
                    AnimatedContent(r, transitionSpec = {
                        (fadeIn(tween(220)) + slideInVertically(tween(260)) { it / 24 }).togetherWith(fadeOut(tween(120)))
                    }, label = "screen", contentKey = { it.toString() }) { route -> Screen(route) }
                    if (r.isTab) TabBar(s)
                    InvitePopup()
                }
            }
            SheetHost(s)
            ToastHost(s)
        }
    }
}

@Composable
private fun Screen(r: Route) = when (r) {
    Route.Home -> HomeScreen()
    Route.Topics -> TopicsScreen()
    Route.Friends -> FriendsScreen()
    Route.Me -> MeScreen()
    Route.History -> HistoryScreen()
    Route.Couple -> CoupleScreen()
    Route.Suggest -> SuggestScreen()
    Route.Admin -> AdminScreen()
    is Route.TopicPage -> TopicScreen(r.id)
    is Route.Play -> PlayScreen(r.match)
    is Route.Results -> ResultsScreen(r.id)
    is Route.Search -> SearchScreen(r.topic)
    is Route.Lobby -> LobbyScreen(r.match)
    is Route.Detail -> DetailScreen(r.id)
    is Route.Player -> PlayerScreen(r.id)
    is Route.Challenge -> ChallengeScreen(r.id)
    is Route.CoupleGame -> CoupleGameScreen(r.kind, r.partner)
}

@Composable
private fun Splash() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Logo(big = true) }
}

@Composable
fun Logo(big: Boolean = false) {
    val p = pal; val sz = if (big) 46.sp else 28.sp
    Row { Txt("Two ", size = sz, color = p.p1, display = true); Txt("Minds", size = sz, color = p.p2, display = true) }
}

@Composable
private fun TabBar(s: AppState) {
    val p = pal
    val items = listOf(Triple(Route.Home, "home", "Play"), Triple(Route.Topics, "grid", "Topics"), Triple(Route.Friends, "users", "Friends"), Triple(Route.Me, "user", "Profile"))
    val note = s.inbox?.let { it.requests > 0 || it.challenges.isNotEmpty() } == true
    Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.navigationBars), contentAlignment = Alignment.BottomCenter) {
        val shape = RoundedCornerShape(24.dp)
        Row(Modifier.padding(12.dp).widthIn(max = 560.dp).fillMaxWidth().clip(shape).background(p.s1).border(1.dp, p.line2, shape).padding(6.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            items.forEach { (route, icon, label) ->
                val on = s.route == route
                Box(Modifier.weight(1f).press(label = label) { s.go(route) }.clip(RoundedCornerShape(18.dp)).background(if (on) p.ink.copy(alpha = 0.08f) else Color.Transparent).heightIn(min = 54.dp),
                    contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(icon, color = if (on) p.ink else p.muted)
                        Txt(label, size = 11.sp, weight = FontWeight.Medium, color = if (on) p.ink else p.muted)
                    }
                    if (route == Route.Friends && note) Box(Modifier.align(Alignment.TopEnd).padding(top = 6.dp, end = 18.dp).size(8.dp).clip(CircleShape).background(p.bad))
                }
            }
        }
    }
}

@Composable
private fun ToastHost(s: AppState) {
    val p = pal; val text = s.toastText; val top = s.signedIn && s.profile != null && !s.route.isTab
    Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars), contentAlignment = if (top) Alignment.TopCenter else Alignment.BottomCenter) {
        AnimatedVisibility(text != null, enter = fadeIn() + slideInVertically { if (top) -it else it }, exit = fadeOut()) {
            Box(Modifier.padding(horizontal = 24.dp, vertical = if (top) 12.dp else 98.dp).clip(RoundedCornerShape(999.dp)).background(p.ink).padding(horizontal = 18.dp, vertical = 12.dp)) {
                Txt(text ?: "", size = 13.5.sp, weight = FontWeight.Medium, color = p.bg, align = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun SheetHost(s: AppState) {
    val p = pal; val content = s.sheet
    AnimatedVisibility(content != null, enter = fadeIn(), exit = fadeOut()) {
        Box(Modifier.fillMaxSize().background(p.scrim).clickable(remember { MutableInteractionSource() }, null) { s.sheet = null })
    }
    AnimatedVisibility(content != null, enter = slideInVertically { it }, exit = slideOutVertically { it }) {
        Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.systemBars.union(WindowInsets.ime)), contentAlignment = Alignment.BottomCenter) {
            val shape = RoundedCornerShape(28.dp)
            Column(Modifier.padding(12.dp).widthIn(max = 560.dp).fillMaxWidth().heightIn(max = 640.dp).clip(shape).background(p.s1).border(1.dp, p.line2, shape)
                .clickable(remember { MutableInteractionSource() }, null) {}.verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(Modifier.align(Alignment.CenterHorizontally).size(40.dp, 4.dp).clip(RoundedCornerShape(2.dp)).background(p.line2))
                (content ?: remember { { } })()
            }
        }
    }
}

@Composable
private fun InvitePopup() {
    val s = LocalApp.current; val p = pal; val inv = s.invite ?: return
    if (s.route is Route.Play || s.route is Route.Lobby || s.route is Route.Search) return
    val host = inv.player(inv.host); val t = s.topic(inv.topic)
    Box(Modifier.fillMaxSize().background(p.scrim).windowInsetsPadding(WindowInsets.systemBars).padding(12.dp), contentAlignment = Alignment.BottomCenter) {
        CardBox(Modifier.widthIn(max = 560.dp), pad = 22.dp) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                if (host != null) Avatar(host.card.name, host.card.color, 72.dp, host.card.frame)
                H2("${host?.card?.name ?: "A friend"} wants to play live", align = TextAlign.Center)
                Pill(t.name, t.icon, hex(t.color))
                Btn("Join now", Modifier.fillMaxWidth(), kind = "cta", icon = "zap") {
                    s.invite = null
                    s.launch { val m = s.game.join(inv.id); Sfx.play("vs"); Sfx.buzz("success"); s.go(Route.Play(m)) }
                }
                Btn("Not now", Modifier.fillMaxWidth()) { s.invite = null; s.launch { s.game.leave(inv.id) } }
            }
        }
    }
}

@Suppress("unused") private val keepDispatcher = LocalOnBackPressedDispatcherOwner
