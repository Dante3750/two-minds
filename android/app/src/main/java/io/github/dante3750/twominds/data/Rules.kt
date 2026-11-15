package io.github.dante3750.twominds.data

// Same rules as the original game, so levels and titles feel familiar.
const val ROUNDS = 7

data class Level(val lv: Int, val into: Int, val need: Int) { val pct get() = into.toFloat() / need }

fun levelOf(xp: Int): Level {
    var lv = 1; var need = 150; var left = maxOf(0, xp)
    while (left >= need) { left -= need; lv++; need = Math.round(need * 1.18).toInt() }
    return Level(lv, left, need)
}
fun overallLevel(xp: Int) = levelOf(xp / 3)

val TITLES = listOf(1 to "Rookie", 3 to "Quizzer", 6 to "Brainiac", 10 to "Mastermind", 15 to "Genius", 22 to "Legend", 30 to "Grandmaster")
val TOPIC_TITLES = listOf(1 to "Novice", 5 to "Apprentice", 10 to "Expert", 15 to "Master", 20 to "Legend")
fun titleFor(lv: Int, table: List<Pair<Int, String>> = TITLES) = table.last { lv >= it.first }.second

data class Tier(val id: String, val name: String, val from: Int, val color: String)
val TIERS = listOf(Tier("bronze", "Bronze", 0, "#d08a5b"), Tier("silver", "Silver", 400, "#9fabc2"), Tier("gold", "Gold", 1200, "#f2b51d"), Tier("plat", "Platinum", 2500, "#4fc9bd"), Tier("diamond", "Diamond", 4500, "#8aa5ff"))
fun tierOf(pts: Int) = TIERS.last { pts >= it.from }

val COLORS = listOf("#ff6b5a", "#38d6ff", "#ffc53d", "#3ddc84", "#c77dff", "#ff8fa3", "#f4a259", "#8f96ff")

data class Badge(val id: String, val name: String, val text: String, val icon: String)
val BADGES = listOf(
    Badge("first_win", "First win", "Win any match", "trophy"), Badge("win10", "On a roll", "Win 10 matches", "zap"),
    Badge("streak3", "Hat-trick", "Win 3 in a row", "crown"), Badge("perfect", "Flawless", "7 of 7 correct", "check"),
    Badge("score140", "Speed demon", "Score 140+ in a match", "rocket"), Badge("draw", "Perfect balance", "Draw a match", "scale"),
    Badge("topics5", "Explorer", "Play 5 topics", "globe"), Badge("topics12", "Globetrotter", "Play 12 topics", "flag"),
    Badge("daily1", "Early bird", "Finish a Daily Duel", "sun"), Badge("streak7", "Week of fire", "Play 7 days in a row", "flame"),
    Badge("streak30", "Unstoppable", "Play 30 days in a row", "flame"), Badge("ldw", "Long-distance win", "Win a challenge link", "send"),
    Badge("live_win", "Face to face", "Win a live match", "users"),
)

fun initial(name: String): String {
    val t = name.trim(); if (t.isEmpty()) return "?"
    val end = t.offsetByCodePoints(0, 1)
    return t.substring(0, end).uppercase()
}
