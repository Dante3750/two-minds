package io.github.dante3750.twominds.data

import org.json.JSONArray
import org.json.JSONObject

// ---------------------------------------------------------------- models (what the server sends)
data class Card(val id: String, val username: String, val name: String, val color: String, val frame: String?, val xp: Int)
data class Player(val card: Card, val seat: Int, val state: String, val score: Int, val result: String?, val xpGained: Int)
data class BotInfo(val name: String, val level: Int, val lv: Int)
data class Match(
    val id: String, val mode: String, val topic: String, val timeMs: Int, val status: String, val host: String,
    val practice: Boolean, val createdAt: String, val bot: BotInfo?, val players: List<Player>,
) {
    fun player(id: String?) = players.firstOrNull { it.card.id == id }
}
data class Round(val round: Int, val q: String, val options: List<String>, val timeMs: Int, val bonus: Boolean, val topic: String, val isNew: Boolean, val ghostMs: Int?)
data class Pick(val option: Int, val ms: Int, val points: Int, val user: String? = null)
data class Answer(val round: Int, val right: Int, val you: Pick, val total: Int, val opp: Pick?)
data class TopicStat(val xp: Int, val played: Int, val won: Int, val best: Int)
data class Profile(
    val card: Card, val code: String, val played: Int, val won: Int, val lost: Int, val drawn: Int, val correct: Int, val answered: Int,
    val bestScore: Int, val streakCur: Int, val streakBest: Int, val streakDay: String?, val seasonPts: Int, val badges: List<String>,
    val isAdmin: Boolean, val weekPoints: Int, val weekGames: Int, val topics: Map<String, TopicStat>,
)
data class Friend(val card: Card, val accepted: Boolean, val incoming: Boolean, val week: Int, val lastSeen: String)
data class Topic(val id: String, val name: String, val icon: String, val color: String, val category: String)
data class Count(val total: Int, val fresh: Int, val new: Int)
data class ChallengeResult(val match: String, val topic: String, val myScore: Int, val player: Card, val score: Int)
data class Inbox(val requests: Int, val invites: List<Match>, val challenges: List<Match>, val results: List<ChallengeResult>)
data class BoardRow(val card: Card, val points: Int, val games: Int, val best: Int, val me: Boolean)
data class DetailPick(val choice: Int, val text: String?, val points: Int)
data class DetailRound(val round: Int, val q: String, val a: String, val picks: Map<String, DetailPick>, val bot: DetailPick?)
data class Submission(val id: Long, val topic: String, val q: String, val a: String, val w: List<String>, val by: Card)

private fun JSONObject.str(k: String): String? = if (isNull(k)) null else optString(k)
private fun <T> JSONArray?.list(f: (JSONObject) -> T): List<T> = if (this == null) emptyList() else (0 until length()).map { f(getJSONObject(it)) }
private fun JSONArray?.strings(): List<String> = if (this == null) emptyList() else (0 until length()).map { getString(it) }

fun card(o: JSONObject) = Card(o.getString("id"), o.optString("username"), o.optString("name"), o.optString("color", "#ff6b5a"), o.str("frame"), o.optInt("xp"))
fun match(o: JSONObject) = Match(
    o.getString("id"), o.getString("mode"), o.getString("topic"), o.optInt("time_ms", 10000), o.getString("status"), o.getString("host"),
    o.optBoolean("practice"), o.optString("created_at"),
    o.optJSONObject("bot")?.let { BotInfo(it.getString("name"), it.optInt("level"), it.optInt("lv")) },
    o.optJSONArray("players").list { Player(card(it), it.optInt("seat"), it.optString("state"), it.optInt("score"), it.str("result"), it.optInt("xp_gained")) },
)
private fun pick(o: JSONObject?) = o?.let { Pick(it.optInt("option", -1), it.optInt("ms"), it.optInt("points"), it.str("user")) }

/** Typed calls to the game's server functions. */
class Game(val api: Api) {
    private fun args(vararg p: Pair<String, Any?>) = JSONObject().apply { p.forEach { (k, v) -> put(k, v ?: JSONObject.NULL) } }

    suspend fun topics(): List<Topic> = api.select("topics?select=*&order=position").list { Topic(it.getString("id"), it.getString("name"), it.getString("icon"), it.getString("color"), it.getString("category")) }
    suspend fun counts(): Map<String, Count> {
        val o = api.rpc("topic_counts") as? JSONObject ?: return emptyMap()
        return o.keys().asSequence().associateWith { k -> o.getJSONObject(k).let { Count(it.optInt("total"), it.optInt("fresh"), it.optInt("new")) } }
    }
    suspend fun createProfile(username: String, name: String, color: String) { api.rpc("create_profile", args("p_username" to username, "p_name" to name, "p_color" to color)) }
    suspend fun updateProfile(name: String? = null, color: String? = null, frame: String? = null) { api.rpc("update_profile", args("p_name" to name, "p_color" to color, "p_frame" to frame)) }
    suspend fun me(): Profile? {
        val o = api.rpc("my_profile") as? JSONObject ?: return null
        val t = o.optJSONObject("topics") ?: JSONObject()
        return Profile(
            card(o), o.optString("code"), o.optInt("played"), o.optInt("won"), o.optInt("lost"), o.optInt("drawn"), o.optInt("correct"), o.optInt("answered"),
            o.optInt("best_score"), o.optInt("streak_cur"), o.optInt("streak_best"), o.str("streak_day"), o.optInt("season_pts"), o.optJSONArray("badges").strings(),
            o.optBoolean("is_admin"), o.optJSONObject("week")?.optInt("points") ?: 0, o.optJSONObject("week")?.optInt("games") ?: 0,
            t.keys().asSequence().associateWith { k -> t.getJSONObject(k).let { TopicStat(it.optInt("xp"), it.optInt("played"), it.optInt("won"), it.optInt("best")) } },
        )
    }
    suspend fun friends(): List<Friend> = (api.rpc("friends_list") as? JSONArray).list { Friend(card(it), it.optString("status") == "accepted", it.optBoolean("incoming"), it.optInt("week"), it.optString("last_seen")) }
    suspend fun friendRequest(who: String): String = api.rpc("friend_request", args("p_who" to who)) as? String ?: "sent"
    suspend fun friendRespond(id: String, accept: Boolean) { api.rpc("friend_respond", args("p_other" to id, "p_accept" to accept)) }
    suspend fun friendRemove(id: String) { api.rpc("friend_remove", args("p_other" to id)) }

    suspend fun startMatch(mode: String, topic: String, opponent: String? = null, bot: Int = 1, timeMs: Int = 10000) =
        match(api.rpc("start_match", args("p_mode" to mode, "p_topic" to topic, "p_opponent" to opponent, "p_bot_level" to bot, "p_time_ms" to timeMs, "p_rematch" to null)) as JSONObject)
    suspend fun join(id: String) = match(api.rpc("join_match", args("p_match" to id)) as JSONObject)
    suspend fun leave(id: String) { api.rpc("leave_match", args("p_match" to id)) }
    suspend fun get(id: String) = match(api.rpc("get_match", args("p_match" to id)) as JSONObject)
    suspend fun round(id: String, r: Int): Round {
        val o = api.rpc("get_round", args("p_match" to id, "p_round" to r)) as JSONObject
        return Round(o.getInt("round"), o.getString("q"), o.getJSONArray("options").strings(), o.optInt("time_ms", 10000), o.optBoolean("bonus"), o.optString("topic"), o.optBoolean("new"), if (o.isNull("ghost_ms")) null else o.optInt("ghost_ms"))
    }
    suspend fun answer(id: String, r: Int, option: Int, ms: Int): Answer {
        val o = api.rpc("submit_answer", args("p_match" to id, "p_round" to r, "p_option" to option, "p_ms" to ms)) as JSONObject
        val y = o.getJSONObject("you")
        return Answer(o.getInt("round"), o.getInt("right"), Pick(y.optInt("option", -1), y.optInt("ms"), y.optInt("points")), y.optInt("total"), pick(o.optJSONObject("opp")))
    }
    suspend fun roundResult(id: String, r: Int): Pick? = pick(api.rpc("round_result", args("p_match" to id, "p_round" to r)) as? JSONObject)
    suspend fun finish(id: String, quit: Boolean = false) = match(api.rpc("finish_match", args("p_match" to id, "p_quit" to quit)) as JSONObject)
    suspend fun quick(topic: String, timeMs: Int): Match? = (api.rpc("quick_match", args("p_topic" to topic, "p_time_ms" to timeMs)) as? JSONObject)?.let { match(it) }
    suspend fun cancelQuick() { api.rpc("cancel_quick") }
    suspend fun history(): List<Match> = (api.rpc("my_history", args("p_limit" to 40, "p_before" to null)) as? JSONArray).list { match(it) }
    suspend fun h2h(other: String): Triple<Int, Int, Int> { val o = api.rpc("head_to_head", args("p_other" to other)) as JSONObject; return Triple(o.optInt("w"), o.optInt("l"), o.optInt("d")) }
    suspend fun inbox(): Inbox {
        val o = api.rpc("my_inbox") as JSONObject
        return Inbox(o.optInt("requests"), o.optJSONArray("invites").list { match(it) }, o.optJSONArray("challenges").list { match(it) },
            o.optJSONArray("results").list { ChallengeResult(it.getString("match"), it.optString("topic"), it.optInt("my_score"), card(it.getJSONObject("player")), it.optInt("score")) })
    }
    suspend fun weekly(scope: String): List<BoardRow> = (api.rpc("weekly_board", args("p_scope" to scope)) as? JSONArray).list { BoardRow(card(it), it.optInt("points"), it.optInt("games"), 0, it.optBoolean("me")) }
    suspend fun topicBoard(topic: String, scope: String): List<BoardRow> = (api.rpc("topic_board", args("p_topic" to topic, "p_scope" to scope)) as? JSONArray).list { BoardRow(card(it), it.optInt("xp"), it.optInt("played"), it.optInt("best"), it.optBoolean("me")) }
    suspend fun detail(id: String): Pair<Match, List<DetailRound>> {
        val o = api.rpc("match_detail", args("p_match" to id)) as JSONObject
        val rounds = o.optJSONArray("rounds").list { r ->
            val p = r.optJSONObject("picks") ?: JSONObject()
            DetailRound(r.optInt("round"), r.optString("q"), r.optString("a"),
                p.keys().asSequence().associateWith { k -> p.getJSONObject(k).let { DetailPick(it.optInt("choice", -1), it.str("text"), it.optInt("points")) } },
                r.optJSONObject("bot")?.let { DetailPick(it.optInt("choice", -1), it.str("text"), it.optInt("points")) })
        }
        return match(o) to rounds
    }
    suspend fun profileOf(id: String): JSONObject? = api.select("profiles?id=eq.$id&select=id,username,name,color,frame,xp,played,won,lost,drawn,best_score,streak_best,badges,created_at").optJSONObject(0)
    suspend fun suggest(topic: String, q: String, a: String, w: List<String>) { api.rpc("suggest_question", args("p_topic" to topic, "p_q" to q, "p_a" to a, "p_w" to JSONArray(w))) }
    suspend fun reviewQueue(): List<Submission> = (api.rpc("review_queue") as? JSONArray).list { Submission(it.getLong("id"), it.optString("topic_id"), it.optString("q"), it.optString("a"), it.optJSONArray("w").strings(), card(it.getJSONObject("by"))) }
    suspend fun review(id: Long, approve: Boolean) { api.rpc("review_submission", args("p_id" to id, "p_approve" to approve)) }
    suspend fun report(match: String, round: Int, reason: String) { api.rpc("report_question", args("p_match" to match, "p_round" to round, "p_reason" to reason)) }
}
