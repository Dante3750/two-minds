package io.github.dante3750.twominds.ui

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import io.github.dante3750.twominds.R

// The four looks from the web game. Match screens always use the topic colour on a deep base.
data class Palette(
    val id: String, val name: String, val dark: Boolean,
    val bg: Color, val bg2: Color, val s1: Color, val s2: Color, val s3: Color, val ink: Color, val ink2: Color, val muted: Color,
    val line: Color, val line2: Color, val p1: Color, val p2: Color, val gold: Color, val goldInk: Color, val goldText: Color,
    val good: Color, val bad: Color, val scrim: Color,
)

fun hex(s: String): Color = try { Color(android.graphics.Color.parseColor(s)) } catch (_: Exception) { Color(0xFFFF6B5A) }

private fun dark(id: String, name: String, bg: Long, bg2: Long, s1: Long, s2: Long, s3: Long, ink: Long, ink2: Long, muted: Long, p1: Long, p2: Long, gold: Long, goldInk: Long, goldText: Long) =
    Palette(id, name, true, Color(bg), Color(bg2), Color(s1), Color(s2), Color(s3), Color(ink), Color(ink2), Color(muted),
        Color(ink).copy(alpha = 0.09f), Color(ink).copy(alpha = 0.16f), Color(p1), Color(p2), Color(gold), Color(goldInk), Color(goldText),
        Color(0xFF34D17D), Color(0xFFFF4D6D), Color(0xB8040612))

val THEMES = listOf(
    dark("velvet", "Velvet", 0xFF140D1F, 0xFF1D1230, 0xFF21163A, 0xFF2A1E48, 0xFF3A2A5E, 0xFFFCF5FF, 0xFFDCCBEA, 0xFFA493BD, 0xFFFF7AA2, 0xFF7FC8FF, 0xFFFFB37A, 0xFF3A1700, 0xFFFFC49A),
    dark("midnight", "Midnight", 0xFF0A0E22, 0xFF0F1430, 0xFF151A38, 0xFF1C2247, 0xFF262D5A, 0xFFF3F4FF, 0xFFC6CAE8, 0xFF8B92BF, 0xFFFF6B5A, 0xFF38D6FF, 0xFFFFC53D, 0xFF2A1D00, 0xFFFFC53D),
    dark("ocean", "Lagoon", 0xFF06181D, 0xFF0A2229, 0xFF0E2A32, 0xFF14353F, 0xFF1D4652, 0xFFEFFCFB, 0xFFC1E1DE, 0xFF83A9A6, 0xFFFF8A6B, 0xFF3FE0C5, 0xFFFFD166, 0xFF2A1D00, 0xFFFFD166),
    Palette("blush", "Blush", false, Color(0xFFFFF4F1), Color(0xFFFFE9E4), Color(0xFFFFFFFF), Color(0xFFFFF1ED), Color(0xFFFFE1DA), Color(0xFF2B1630), Color(0xFF55405A), Color(0xFF7A6480),
        Color(0x172B1630), Color(0x292B1630), Color(0xFFF2584A), Color(0xFF6A5CF0), Color(0xFFFF8A65), Color(0xFF3A1200), Color(0xFFB83D17), Color(0xFF138A48), Color(0xFFD42A50), Color(0x522B1630)),
)

val LocalPalette = staticCompositionLocalOf { THEMES[0] }

val TILE_INK = Color(0xFF150C24)
val PAPER = Color(0xFFFDFCFF)
val PAPER_INK = Color(0xFF171029)
val RIGHT = Color(0xFF14A44D)
val WRONG = Color(0xFFE5354F)
val DEEP = Color(0xFF0B0716)

val Lexend = FontFamily(Font(R.font.lexend_regular, FontWeight.Normal), Font(R.font.lexend_medium, FontWeight.Medium), Font(R.font.lexend_bold, FontWeight.Bold))
val Display = FontFamily(Font(R.font.dela_gothic_one, FontWeight.Normal))

fun mix(a: Color, b: Color, t: Float) = lerp(a, b, t)
