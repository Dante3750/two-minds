package io.github.dante3750.twominds

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import io.github.dante3750.twominds.data.*
import io.github.dante3750.twominds.ui.Sfx
import io.github.dante3750.twominds.ui.THEMES
import kotlinx.coroutines.*

sealed class Route {
    data object Home : Route(); data object Topics : Route(); data object Friends : Route(); data object Me : Route()
    data object History : Route(); data object Couple : Route(); data object Suggest : Route(); data object Admin : Route()
    data class TopicPage(val id: String) : Route()
    data class Play(val match: Match) : Route()
    data class Results(val id: String) : Route()
    data class Search(val topic: String) : Route()
    data class Lobby(val match: Match) : Route()
    data class Detail(val id: String) : Route()
    data class Player(val id: String) : Route()
    data class Challenge(val id: String) : Route()
    data class CoupleGame(val kind: String, val partner: String) : Route()
    val isTab get() = this is Home || this is Topics || this is Friends || this is Me
}

val MIXED = Topic("mixed", "Mixed Bag", "shuffle", "#9fb4ff", "all")
val DAILY = Topic("daily", "Daily Duel", "sun", "#ffc53d", "all")

/** Everything the screens share. Lives as long as the activity's process. */
class AppState(ctx: Context) {
    val api = Api(ctx.applicationContext)
    val game = Game(api)
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val prefs = ctx.getSharedPreferences("settings", Context.MODE_PRIVATE)

    // settings
    var theme by mutableStateOf(prefs.getString("theme", "velvet") ?: "velvet")
    var relaxed by mutableStateOf(prefs.getBoolean("relaxed", false))
    var bot by mutableStateOf(prefs.getInt("bot", 1))
    var sound by mutableStateOf(prefs.getBoolean("sound", true))
    var vibrate by mutableStateOf(prefs.getBoolean("vibrate", true))
    val palette get() = THEMES.firstOrNull { it.id == theme } ?: THEMES[0]
    val timeMs get() = if (relaxed) 15000 else 10000
    fun saveSettings() {
        prefs.edit().putString("theme", theme).putBoolean("relaxed", relaxed).putInt("bot", bot).putBoolean("sound", sound).putBoolean("vibrate", vibrate).apply()
        Sfx.sound = sound; Sfx.vibrate = vibrate
    }
    init { Sfx.sound = sound; Sfx.vibrate = vibrate }

    // session + data
    var signedIn by mutableStateOf(api.signedIn)
    var ready by mutableStateOf(false)
    var profile by mutableStateOf<Profile?>(null)
    var topics by mutableStateOf<List<Topic>>(emptyList())
    var counts by mutableStateOf<Map<String, Count>>(emptyMap())
    var inbox by mutableStateOf<Inbox?>(null)
    var invite by mutableStateOf<Match?>(null)
    private val seenInvites = HashSet<String>()
    val me get() = api.userId

    fun topic(id: String) = when (id) { "mixed" -> MIXED; "daily" -> DAILY; else -> topics.firstOrNull { it.id == id } ?: MIXED }
    val playable get() = topics.filter { (counts[it.id]?.total ?: 0) >= 7 }

    // navigation: tabs are roots, everything else stacks on top
    val stack = mutableStateListOf<Route>(Route.Home)
    val route get() = stack.last()
    fun go(r: Route) { if (r.isTab) { stack.clear(); stack.add(r) } else stack.add(r) }
    fun replace(r: Route) { stack[stack.size - 1] = r }
    fun resetTo(r: Route) { stack.clear(); stack.add(r) }
    var backGuard: (() -> Boolean)? = null
    var sheet by mutableStateOf<(@Composable () -> Unit)?>(null)
    /** true when handled; false lets Android leave the app */
    fun back(): Boolean {
        if (sheet != null) { sheet = null; return true }
        backGuard?.let { if (it()) return true }
        if (stack.size > 1) { stack.removeAt(stack.size - 1); return true }
        if (route != Route.Home) { resetTo(Route.Home); return true }
        return false
    }

    // toasts
    var toastText by mutableStateOf<String?>(null)
    private var toastJob: Job? = null
    fun toast(msg: String) { toastText = msg; toastJob?.cancel(); toastJob = scope.launch { delay(2600); toastText = null } }

    /** run a server call; failures become a toast */
    fun launch(block: suspend CoroutineScope.() -> Unit) = scope.launch { try { block() } catch (e: CancellationException) { throw e } catch (e: Exception) { toast(e.message ?: "Something went wrong") } }

    suspend fun refreshProfile(): Profile? = try { game.me().also { profile = it } } catch (e: ApiException) { if (!api.signedIn) signedIn = false; null }
    suspend fun refreshTopics() { try { topics = game.topics(); counts = game.counts() } catch (_: Exception) { } }
    suspend fun refreshInbox() {
        try {
            val ib = game.inbox(); inbox = ib
            ib.invites.firstOrNull { it.id !in seenInvites }?.let { seenInvites.add(it.id); invite = it }
        } catch (_: Exception) { }
    }

    fun loadAll() = scope.launch {
        if (!api.signedIn) { signedIn = false; ready = true; return@launch }
        coroutineScope { launch { refreshProfile() }; launch { refreshTopics() }; launch { refreshInbox() } }
        ready = true
    }
    fun onSignedIn() { signedIn = true; ready = false; resetTo(Route.Home); loadAll() }
    fun signOut() { api.signOut(); profile = null; signedIn = false; resetTo(Route.Home) }

    // inbox while the app is open (friend requests, live invites, challenge results)
    private var poller: Job? = null
    fun startPolling() { poller?.cancel(); poller = scope.launch { while (isActive) { delay(15000); if (signedIn && profile != null) refreshInbox() } } }
    fun stopPolling() { poller?.cancel() }

    // a challenge link that arrived before sign-in
    var pendingChallenge: String? = null
    fun openLink(text: String?) {
        val id = text?.let { Regex("[?&#]m=([0-9a-fA-F-]{36})").find(it)?.groupValues?.get(1) } ?: return
        if (profile == null) pendingChallenge = id else go(Route.Challenge(id))
    }
}
